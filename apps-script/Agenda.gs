/** §20.1 Daily Agenda — targets, shoutouts, celebrations (the §25.7 enjoyment layer).
 * Composed by Management / Ops Head / Team Lead for an audience (ALL / department / person);
 * staff see today's agenda at the top of their portal with live progress on numeric targets and
 * yesterday's targets marked hit/missed. Progress is computed from the CALLER'S OWN counters only —
 * §25.7 forbids public leaderboards, so nothing here ranks or compares people.
 * §8.0b: a task feeds a target counter only once it is APPROVED, never when merely submitted. */

const AGENDA_COMPOSER_ROLES = ['Management', 'Ops Head', 'Team Lead'];   // §20.1 + §4.4
const AGENDA_DEPTS = ['Hunting', 'Listing', 'Advertising', 'CS', 'Order Processing'];
const AGENDA_MAX_TARGETS = 20;
const AGENDA_MAX_SHOUTOUTS = 200;
const AGENDA_MAX_CELL = 45000;                 // a Sheets cell holds 50k chars; stay under it
const AGENDA_HISTORY_MAX_DAYS = 92;
const AGENDA_HISTORY_MAX_ROWS = 200;

/** Linked metrics a target may auto-track. 'report' = the §5 role-mapped REPORTS_2H counters
 * (count_1..4 mean different things per role — that mapping is what `roles` + `counter` encode).
 * 'task' = approved tasks of a §7 type. Anything not in this whitelist is rejected. */
const AGENDA_METRICS = {
  listings_done:      { label: 'Listings done',      source: 'report', counter: 'count_1', roles: ['Item Lister', 'Listing Manager'] },
  revisions_done:     { label: 'Revisions done',     source: 'report', counter: 'count_2', roles: ['Item Lister', 'Listing Manager'] },
  buyer_replies:      { label: 'Buyer replies',      source: 'report', counter: 'count_1', roles: ['CS'] },
  cases_handled:      { label: 'Cases handled',      source: 'report', counter: 'count_2', roles: ['CS'] },
  orders_processed:   { label: 'Orders processed',   source: 'report', counter: 'count_1', roles: ['Order Processor'] },
  tracking_added:     { label: 'Tracking added',     source: 'report', counter: 'count_2', roles: ['Order Processor'] },
  orders_rechecked:   { label: 'Orders rechecked',   source: 'report', counter: 'count_3', roles: ['Order Processor'] },
  wrong_orders_found: { label: 'Wrong orders found', source: 'report', counter: 'count_4', roles: ['Order Processor'] },
  products_added:     { label: 'Products added',     source: 'report', counter: 'count_1', roles: ['Product Hunter'] },
  campaigns_updated:  { label: 'Campaigns updated',  source: 'report', counter: 'count_1', roles: ['Advertising Manager'] },
  items_reviewed:     { label: 'Items reviewed',     source: 'report', counter: 'count_2', roles: ['Advertising Manager'] },
  tasks_completed:            { label: 'Tasks completed (approved)',         source: 'task', type: '*' },
  tasks_general:              { label: 'general tasks approved',              source: 'task', type: 'general' },
  tasks_listing_new:          { label: 'listing_new tasks approved',          source: 'task', type: 'listing_new' },
  tasks_listing_revision:     { label: 'listing_revision tasks approved',     source: 'task', type: 'listing_revision' },
  tasks_cpc_research:         { label: 'cpc_research tasks approved',         source: 'task', type: 'cpc_research' },
  tasks_campaign_set:         { label: 'campaign_set tasks approved',         source: 'task', type: 'campaign_set' },
  tasks_supplier_add:         { label: 'supplier_add tasks approved',         source: 'task', type: 'supplier_add' },
  tasks_potential_cpc_review: { label: 'potential_cpc_review tasks approved', source: 'task', type: 'potential_cpc_review' },
  tasks_query:                { label: 'query tasks approved',                source: 'task', type: 'query' },
};

// ---------- compose (Management / Ops Head / Team Lead) ----------
function actionSetAgenda_(payload, ctx) {
  if (!agendaCanCompose_(ctx)) throw authErr_('not an agenda composer', ctx.ident.email);

  const today = agendaToday_();
  const date = payload.date ? agendaValidDate_(payload.date) : today;
  if (date < today) throw new Error('cannot set an agenda for a past date');
  const audience = agendaValidAudience_(payload.audience);
  const notes = agendaText_(payload.notes, 2000);

  const lock = LockService.getScriptLock();
  let saved = null;
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('DAILY_AGENDA');
    const idx = agendaHeaderIdx_(sh);
    const rowNum = agendaFindRow_(sh, idx, date, audience);

    let oldTargets = [], oldNotes = '', shoutoutsCell = '[]';
    if (rowNum > 0) {
      const cur = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
      oldTargets = agendaParseTargets_(cur[idx.day_targets - 1]);
      oldNotes = String(cur[idx.notes - 1] || '');
      shoutoutsCell = String(cur[idx.shoutouts - 1] || '[]');
    }
    const targets = agendaBuildTargets_(payload.targets, oldTargets);
    const targetsCell = JSON.stringify(targets);
    if (targetsCell.length > AGENDA_MAX_CELL) throw new Error('targets too large');

    if (rowNum > 0) {
      sh.getRange(rowNum, idx.day_targets).setValue(targetsCell);
      sh.getRange(rowNum, idx.notes).setValue(notes);
      sh.getRange(rowNum, idx.set_by).setValue(ctx.ident.email);
      sh.getRange(rowNum, idx.set_at).setValue(now_());
    } else {
      const row = [];
      DB_TABS.DAILY_AGENDA.forEach(function (col) {
        if (col === 'date') row.push(date);
        else if (col === 'audience') row.push(audience);
        else if (col === 'day_targets') row.push(targetsCell);
        else if (col === 'shoutouts') row.push(shoutoutsCell);
        else if (col === 'notes') row.push(notes);
        else if (col === 'set_by') row.push(ctx.ident.email);
        else if (col === 'set_at') row.push(now_());
        else row.push('');
      });
      sh.appendRow(row);
    }
    saved = { date: date, audience: audience, targets: targets, notes: notes };
    logActivity_(ctx.ident.email, 'SET_AGENDA', 'DAILY_AGENDA:' + date + '|' + audience,
      JSON.stringify(oldTargets) + ' :: ' + oldNotes, targetsCell + ' :: ' + notes, targets.length + ' targets');
  } finally { lock.releaseLock(); }

  return saved;
}

// ---------- every approved user ----------
function actionTodayAgenda_(payload, ctx) {
  const today = agendaToday_();
  const yesterday = agendaAddDays_(today, -1);
  const dept = roleDept_(ctx.user.role);
  const email = ctx.ident.email;
  const role = ctx.user.role;

  const todayRows = [], yRows = [];
  readTab_('DAILY_AGENDA').forEach(function (r) {
    const d = agendaDayKey_(r.date);
    if (d !== today && d !== yesterday) return;
    if (!agendaVisible_(r.audience, dept, email)) return;
    if (d === today) todayRows.push(r); else yRows.push(r);
  });

  const todayTargets = [], yTargets = [], shoutouts = [], notes = [];
  todayRows.forEach(function (r) {
    agendaParseTargets_(r.day_targets).forEach(function (t) { todayTargets.push(t); });
    agendaParseShoutouts_(r.shoutouts).forEach(function (s) { shoutouts.push(s); });
    const n = String(r.notes || '').trim();
    if (n) notes.push(n);
  });
  yRows.forEach(function (r) {
    agendaParseTargets_(r.day_targets).forEach(function (t) { yTargets.push(t); });
  });

  const keys = [];
  todayTargets.concat(yTargets).forEach(function (t) {
    if (t.metric && t.target && keys.indexOf(t.metric) < 0) keys.push(t.metric);
  });
  const counters = agendaCounters_(email, role, [today, yesterday], keys);

  const outToday = todayTargets.map(function (t) { return agendaWithProgress_(t, counters[today], role); });
  const outYesterday = yTargets.map(function (t) {
    const p = agendaWithProgress_(t, counters[yesterday], role);
    p.hit = (p.tracked && p.target) ? (p.value >= p.target) : null;   // §20.1 yesterday: hit / missed
    return p;
  });

  const items = [];
  outToday.forEach(function (t) {
    items.push(t.target ? (t.text + ' — ' + (t.tracked ? t.value : 0) + '/' + t.target) : t.text);
  });
  notes.forEach(function (n) { items.push(n); });
  shoutouts.forEach(function (s) { items.push('🎉 ' + s.text); });

  const res = {
    date: today,
    audience: { dept: dept, email: email },
    items: items,
    targets: stripForRole_(outToday, role, email),
    shoutouts: stripForRole_(shoutouts, role, email),
    notes: notes,
    yesterday: { date: yesterday, targets: stripForRole_(outYesterday, role, email) },
    canCompose: agendaCanCompose_(ctx),
  };
  if (res.canCompose) res.metrics = agendaMetricCatalogue_();
  return res;
}

/** §20.1 one-click "🎉 congratulate" from any completed task or hit target. Positive-only (§25.7):
 * there is no negative counterpart to this action and every shoutout carries its sender's name. */
function actionCongratulate_(payload, ctx) {
  const to = normalizeEmail(payload.to || '');
  if (!to) throw new Error('missing recipient');
  if (to === normalizeEmail(ctx.ident.email)) throw new Error('cannot congratulate yourself');

  let recipient = null;
  readTab_('USERS').forEach(function (u) {
    if (normalizeEmail(u.email) === to && String(u.status) === 'approved') recipient = u;
  });
  if (!recipient) throw new Error('unknown recipient');

  const ref = agendaLine_(payload.ref, 40);
  if (ref) agendaCheckRef_(ref, to);
  const text = agendaLine_(payload.text, 240) || ('Great work, ' + String(recipient.name || '').split(' ')[0] + '!');

  const today = agendaToday_();
  const shoutout = {
    id: 'S' + Utilities.getUuid().slice(0, 8),
    text: text,
    from: ctx.ident.email,
    from_name: ctx.user.name || ctx.ident.name,
    to: recipient.email,
    to_name: recipient.name,
    ref: ref,
    at: now_(),
  };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('DAILY_AGENDA');
    const idx = agendaHeaderIdx_(sh);
    const rowNum = agendaFindRow_(sh, idx, today, 'ALL');
    let list = [];
    if (rowNum > 0) list = agendaParseShoutouts_(sh.getRange(rowNum, idx.shoutouts).getValue());
    if (list.length >= AGENDA_MAX_SHOUTOUTS) throw new Error('shoutouts full for today');
    const old = JSON.stringify(list);
    list.push(shoutout);
    const cell = JSON.stringify(list);
    if (cell.length > AGENDA_MAX_CELL) throw new Error('shoutouts full for today');

    if (rowNum > 0) {
      sh.getRange(rowNum, idx.shoutouts).setValue(cell);
    } else {
      const row = [];
      DB_TABS.DAILY_AGENDA.forEach(function (col) {
        if (col === 'date') row.push(today);
        else if (col === 'audience') row.push('ALL');
        else if (col === 'day_targets') row.push('[]');
        else if (col === 'shoutouts') row.push(cell);
        else if (col === 'set_by') row.push(ctx.ident.email);
        else if (col === 'set_at') row.push(now_());
        else row.push('');
      });
      sh.appendRow(row);
    }
    logActivity_(ctx.ident.email, 'CONGRATULATE', 'DAILY_AGENDA:' + today + '|ALL', old, cell,
      'to ' + recipient.email + (ref ? ' ref ' + ref : ''));
  } finally { lock.releaseLock(); }

  notify_(recipient.email, '🎉 Congratulations',
    (shoutout.from_name || 'A teammate') + ' congratulated you: ' + text, 'agenda:' + today);
  return { ok: true, date: today, shoutout: shoutout };
}

// ---------- management ----------
function actionAgendaHistory_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const to = payload.to ? agendaValidDate_(payload.to) : agendaToday_();
  const from = payload.from ? agendaValidDate_(payload.from) : agendaAddDays_(to, -13);
  if (from > to) throw new Error('from is after to');
  if (agendaDaysBetween_(from, to) > AGENDA_HISTORY_MAX_DAYS) throw new Error('range too wide');
  const audience = payload.audience ? agendaValidAudience_(payload.audience) : '';

  const rows = [];
  readTab_('DAILY_AGENDA').forEach(function (r) {
    const d = agendaDayKey_(r.date);
    if (!d || d < from || d > to) return;
    if (audience && !agendaSameAudience_(r.audience, audience)) return;
    rows.push({
      date: d,
      audience: String(r.audience || 'ALL'),
      targets: agendaParseTargets_(r.day_targets),
      shoutouts: agendaParseShoutouts_(r.shoutouts),
      notes: String(r.notes || ''),
      set_by: String(r.set_by || ''),
      set_at: String(r.set_at || ''),
    });
  });
  rows.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  return { from: from, to: to, audience: audience || 'any', agendas: rows.slice(0, AGENDA_HISTORY_MAX_ROWS) };
}

// ---------- progress ----------
/** Counters for ONE person across the given days. Task counts obey §8.0b: a task counts only when
 * it is Completed AND carries an approver — submitted-but-undecided work never moves a target.
 * Credit lands on the day the work was submitted (falling back to the decision day), so yesterday's
 * targets settle correctly once a late approval arrives. */
function agendaCounters_(email, role, days, keys) {
  const out = {};
  days.forEach(function (d) { out[d] = {}; });
  if (!keys.length) return out;
  const n = normalizeEmail(email);
  const taskKeys = keys.filter(function (k) { return AGENDA_METRICS[k].source === 'task'; });
  const reportKeys = keys.filter(function (k) {
    return AGENDA_METRICS[k].source === 'report' && AGENDA_METRICS[k].roles.indexOf(role) >= 0;
  });

  if (taskKeys.length) {
    readTab_('TASKS').forEach(function (t) {
      if (normalizeEmail(t.assigned_to) !== n) return;
      if (String(t.status) !== 'Completed') return;
      if (!String(t.approved_by || '').trim()) return;
      const d = agendaDayKey_(t.submitted_at) || agendaDayKey_(t.decided_at) || agendaDayKey_(t.updated_at);
      if (!out[d]) return;
      const type = String(t.type || '');
      taskKeys.forEach(function (k) {
        const m = AGENDA_METRICS[k];
        if (m.type === '*' || m.type === type) out[d][k] = (out[d][k] || 0) + 1;
      });
    });
  }
  if (reportKeys.length) {
    readTab_('REPORTS_2H').forEach(function (r) {
      if (normalizeEmail(r.email) !== n) return;
      const d = agendaDayKey_(r.date) || agendaDayKey_(r.submitted_at);
      if (!out[d]) return;
      reportKeys.forEach(function (k) {
        const v = Number(r[AGENDA_METRICS[k].counter]);
        if (isFinite(v) && v > 0) out[d][k] = (out[d][k] || 0) + v;
      });
    });
  }
  return out;
}

function agendaWithProgress_(t, dayCounts, role) {
  const m = t.metric ? AGENDA_METRICS[t.metric] : null;
  const tracked = !!(m && t.target && (m.source === 'task' || m.roles.indexOf(role) >= 0));
  const value = tracked ? Number(dayCounts[t.metric] || 0) : 0;
  return {
    id: t.id,
    text: t.text,
    target: t.target,
    metric: t.metric,
    metric_label: m ? m.label : '',
    tracked: tracked,
    value: tracked ? value : null,
    progress: tracked ? Math.max(0, Math.min(100, Math.round(value / t.target * 100))) : null,
  };
}

function agendaMetricCatalogue_() {
  return Object.keys(AGENDA_METRICS).map(function (k) {
    const m = AGENDA_METRICS[k];
    return { key: k, label: m.label, roles: m.roles || ROLES };
  });
}

// ---------- parsing & validation ----------
/** day_targets / shoutouts hold JSON lists in a single cell (the Sheet Contract forbids extra
 * columns). A human typing plain prose straight into the cell stays valid: it reads back as items. */
function agendaParseTargets_(cell) {
  const raw = String(cell || '').trim();
  if (!raw) return [];
  let list = null;
  try { list = JSON.parse(raw); } catch (e) { list = null; }
  if (!Array.isArray(list)) {
    return agendaSplitLines_(raw).map(function (s) {
      return { id: '', text: s.slice(0, 200), target: null, metric: '' };
    });
  }
  return list.filter(function (t) { return t && t.text; }).map(function (t) {
    const target = Number(t.target);
    return {
      id: String(t.id || ''),
      text: String(t.text).slice(0, 200),
      target: (isFinite(target) && target > 0) ? target : null,
      metric: AGENDA_METRICS[String(t.metric || '')] ? String(t.metric) : '',
    };
  });
}

function agendaParseShoutouts_(cell) {
  const raw = String(cell || '').trim();
  if (!raw) return [];
  let list = null;
  try { list = JSON.parse(raw); } catch (e) { list = null; }
  if (!Array.isArray(list)) {
    return agendaSplitLines_(raw).map(function (s) {
      return { id: '', text: s.slice(0, 240), from: '', from_name: '', to: '', to_name: '', ref: '', at: '' };
    });
  }
  return list.filter(function (s) { return s && s.text; }).map(function (s) {
    return {
      id: String(s.id || ''),
      text: String(s.text).slice(0, 240),
      from: String(s.from || ''),
      from_name: String(s.from_name || ''),
      to: String(s.to || ''),
      to_name: String(s.to_name || ''),
      ref: String(s.ref || ''),
      at: String(s.at || ''),
    };
  });
}

function agendaBuildTargets_(list, existing) {
  if (typeof list === 'undefined' || list === null) list = [];
  if (!Array.isArray(list)) throw new Error('targets must be a list');
  if (list.length > AGENDA_MAX_TARGETS) throw new Error('too many targets');
  const known = {};
  (existing || []).forEach(function (t) { if (t.id) known[t.id] = true; });
  return list.map(function (t) {
    const text = agendaLine_(t && t.text, 200);
    if (!text) throw new Error('every target needs text');
    let target = null;
    if (t.target !== '' && t.target !== null && typeof t.target !== 'undefined') {
      target = Number(t.target);
      if (!isFinite(target) || target <= 0 || target > 1000000) throw new Error('invalid numeric target');
    }
    const metric = String((t && t.metric) || '').trim();
    if (metric && !AGENDA_METRICS[metric]) throw new Error('unknown metric');
    if (metric && target === null) throw new Error('a linked metric needs a numeric target');
    const id = (t.id && known[String(t.id)]) ? String(t.id) : 'G' + Utilities.getUuid().slice(0, 8);
    return { id: id, text: text, target: target, metric: metric };
  });
}

/** A ref must point at credit already earned: an APPROVED task of the recipient (§8.0b) or a
 * target that exists on an agenda. Anything else is refused, so no shoutout invents an achievement. */
function agendaCheckRef_(ref, toEmail) {
  let ok = false;
  readTab_('TASKS').forEach(function (t) {
    if (String(t.task_id) !== ref) return;
    if (normalizeEmail(t.assigned_to) !== toEmail) return;
    if (String(t.status) === 'Completed' && String(t.approved_by || '').trim()) ok = true;
  });
  if (ok) return;
  readTab_('DAILY_AGENDA').forEach(function (r) {
    agendaParseTargets_(r.day_targets).forEach(function (t) { if (t.id && t.id === ref) ok = true; });
  });
  if (!ok) throw new Error('unknown reference');
}

function agendaCanCompose_(ctx) {
  return isSuperAdmin(ctx.ident.email) || AGENDA_COMPOSER_ROLES.indexOf(ctx.user.role) >= 0;
}

function agendaValidAudience_(v) {
  const raw = String(v || 'ALL').trim();
  if (!raw || raw.toUpperCase() === 'ALL') return 'ALL';
  if (AGENDA_DEPTS.indexOf(raw) >= 0) return raw;
  if (raw.indexOf('@') > 0) {
    const em = normalizeEmail(raw);
    let found = false;
    readTab_('USERS').forEach(function (u) {
      if (normalizeEmail(u.email) === em && String(u.status) === 'approved') found = true;
    });
    if (!found) throw new Error('unknown audience');
    return em;
  }
  throw new Error('invalid audience');
}

function agendaSameAudience_(cellVal, wanted) {
  const a = String(cellVal || '').trim();
  if (wanted === 'ALL') return !a || a.toUpperCase() === 'ALL';
  if (wanted.indexOf('@') > 0) return normalizeEmail(a) === wanted;
  return a === wanted;
}

function agendaVisible_(cellVal, dept, email) {
  const a = String(cellVal || '').trim();
  if (!a || a.toUpperCase() === 'ALL') return true;
  if (dept === '*') return true;
  if (a === dept) return true;
  return normalizeEmail(a) === normalizeEmail(email);
}

function agendaHeaderIdx_(sh) {
  const head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const idx = {};
  head.forEach(function (h, i) { if (String(h)) idx[String(h)] = i + 1; });
  DB_TABS.DAILY_AGENDA.forEach(function (c) { if (!idx[c]) throw new Error('DAILY_AGENDA is missing column ' + c); });
  return idx;
}

function agendaFindRow_(sh, idx, date, audience) {
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (agendaDayKey_(vals[i][idx.date - 1]) !== date) continue;
    if (agendaSameAudience_(vals[i][idx.audience - 1], audience)) return i + 1;
  }
  return -1;
}

// ---------- dates (PKT) ----------
function agendaToday_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd'); }

/** Sheets coerces a "yyyy-MM-dd" write into a real date cell, so reads must handle both a Date
 * (read back in the spreadsheet's own timezone, which is how the cell was stored) and a string. */
function agendaDayKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, agendaTz_(), 'yyyy-MM-dd');
  const m = String(v || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}
let AGENDA_TZ_ = '';
function agendaTz_() {
  if (!AGENDA_TZ_) AGENDA_TZ_ = getPortalDb_(false).getSpreadsheetTimeZone() || 'Asia/Karachi';
  return AGENDA_TZ_;
}

function agendaValidDate_(v) {
  const s = String(v || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('invalid date');
  return s;
}
function agendaAddDays_(ymd, delta) {
  const p = String(ymd).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  d.setUTCDate(d.getUTCDate() + delta);
  const mm = String(d.getUTCMonth() + 1), dd = String(d.getUTCDate());
  return d.getUTCFullYear() + '-' + (mm.length < 2 ? '0' + mm : mm) + '-' + (dd.length < 2 ? '0' + dd : dd);
}
function agendaDaysBetween_(from, to) {
  const a = from.split('-'), b = to.split('-');
  const ms = Date.UTC(Number(b[0]), Number(b[1]) - 1, Number(b[2])) - Date.UTC(Number(a[0]), Number(a[1]) - 1, Number(a[2]));
  return Math.round(ms / 86400000);
}

// ---------- text ----------
// Control characters are stripped before storage; newlines survive so notes keep their shape.
const AGENDA_CTRL_RE = new RegExp('[\\u0000-\\u0009\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

function agendaText_(v, max) {
  const s = String(typeof v === 'undefined' || v === null ? '' : v);
  return s.replace(AGENDA_CTRL_RE, ' ').trim().slice(0, max);
}
function agendaLine_(v, max) {
  return agendaText_(v, max).replace(/\s*\n\s*/g, ' ').trim();
}
function agendaSplitLines_(raw) {
  return String(raw).split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
}

const ACTIONS_AGENDA = {
  setAgenda:     [actionSetAgenda_, 'any'],
  todayAgenda:   [actionTodayAgenda_, 'any'],
  congratulate:  [actionCongratulate_, 'any'],
  agendaHistory: [actionAgendaHistory_, 'any'],
};
