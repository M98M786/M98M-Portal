/** §5 — 2-hourly reporting. Checkpoints come from the assigned schedule (Schedules.gs);
 * a report >late_threshold_min past its checkpoint is `late`; a checkpoint with no report by
 * the time the NEXT checkpoint arrives is `missed` (§5, notified per §14). The final checkpoint
 * of a shift is the Daily Productivity Report and requires "Value addition today" (§28.2). */

// §5 report form — the role count fields, in order, exactly as §5 names them. count_1..count_4
// in REPORTS_2H hold these positionally, so the order of each array is the column mapping.
// "Lister" in §5 covers both Listing-department roles (roleDept_ groups them as 'Listing').
const ROLE_COUNT_FIELDS = {
  'Item Lister': ['listings done', 'revisions done'],
  'Listing Manager': ['listings done', 'revisions done'],
  'CS': ['buyer replies', 'cases handled'],
  'Order Processor': ['orders processed', 'tracking added', 'orders rechecked', 'wrong orders found'],
  'Product Hunter': ['products added'],
  'Advertising Manager': ['campaigns updated', 'items reviewed'],
  'Management': [],
  'Ops Head': [],
  'Team Lead': [],
  'Pricing': [],
};

const REPORT_FLAGS = ['ontime', 'late', 'missed'];
const REPORT_GRID_ROLES = ['Management', 'Ops Head', 'Team Lead'];
const REPORT_CELL_COLOR = { ontime: 'green', late: 'amber', missed: 'red' };
// §28.2 — no extra REPORTS_2H column is allowed, so this label prefixes the value inside work_summary.
const VALUE_ADDITION_LABEL = 'Value addition today';
const VALUE_ADDITION_PROMPT = 'Value addition today: what value did I add to my department?';
const DEFAULT_CHECKPOINT_GAP_MIN = 120;
const REP_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ---------- actions ----------

function actionMyCheckpoints_(payload, ctx) {
  const email = ctx.user.email;
  const role = ctx.user.role;
  const labels = repCountFields_(role);
  const cps = repCheckpointsFor_(email, ctx.user.shift);
  const base = {
    role: role,
    shift: ctx.user.shift,
    countFields: labels,
    lateThresholdMin: repLateThreshold_(),
    valueAdditionLabel: VALUE_ADDITION_LABEL,
    valueAdditionPrompt: VALUE_ADDITION_PROMPT,
  };
  if (!cps.length) { base.date = repToday_(); base.checkpoints = []; return base; }

  const date = repShiftDate_(cps);
  const t = repTiming_(cps, date);
  const idx = repIndexRows_(readTab_('REPORTS_2H'));
  const key = normalizeEmail(email) + '|' + date + '|';
  base.date = date;
  base.checkpoints = cps.map(function (cp, i) {
    const r = idx[key + cp];
    let state;
    if (r) state = String(r.flag) === 'missed' ? 'missed' : 'submitted';
    else if (t.nowAbs >= t.deadlines[i]) state = 'missed';
    else if (t.nowAbs >= t.abs[i]) state = 'due now';
    else state = 'upcoming';
    return {
      checkpoint: cp,
      state: state,
      flag: r ? String(r.flag || '') : '',
      submitted_at: r ? String(r.submitted_at || '') : '',
      minutes_until: t.abs[i] - t.nowAbs,
      is_final: i === cps.length - 1,
    };
  });
  return base;
}

function actionSubmitReport_(payload, ctx) {
  const email = ctx.user.email;
  const role = ctx.user.role;
  const cps = repCheckpointsFor_(email, ctx.user.shift);
  if (!cps.length) throw new Error('no checkpoints on this schedule');

  const cp = repCpKey_(payload.checkpoint);
  const i = cps.indexOf(cp);
  if (i < 0) throw new Error('checkpoint not on this schedule');

  const date = repShiftDate_(cps);
  const t = repTiming_(cps, date);
  // §5: once the next checkpoint has arrived this one is MISSED, whether or not the trigger ran yet.
  if (t.nowAbs >= t.deadlines[i]) throw new Error(SAFE_ERROR_PREFIX + 'checkpoint window closed');

  const summary = String(payload.work_summary || '').trim();
  if (!summary) throw new Error('work summary required');

  const labels = repCountFields_(role);
  const raw = payload.counts;
  if (labels.length && !Array.isArray(raw)) throw new Error('counts required');
  if (Array.isArray(raw) && raw.length > labels.length) throw new Error('unexpected count field');
  const counts = labels.map(function (label, n) {
    const v = Array.isArray(raw) ? raw[n] : '';
    if (v === '' || v === null || v === undefined) throw new Error('missing count: ' + label);
    const num = Number(v);
    if (!isFinite(num) || num < 0 || Math.floor(num) !== num) throw new Error('invalid count: ' + label);
    return num;
  });

  const isFinal = (i === cps.length - 1);
  let stored = summary;
  if (isFinal) {
    const va = String(payload.value_addition || '').trim();
    if (!va) throw new Error(VALUE_ADDITION_PROMPT + ' — required on the Daily Productivity Report');
    stored = summary + '\n\n' + VALUE_ADDITION_LABEL + ': ' + va;
  }

  const flag = (t.nowAbs <= t.abs[i] + repLateThreshold_()) ? 'ontime' : 'late';
  if (REPORT_FLAGS.indexOf(flag) < 0) throw new Error('invalid flag');
  const reportId = 'R' + Utilities.getUuid().slice(0, 8);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('REPORTS_2H');
    if (repIndexRows_(readTab_('REPORTS_2H'))[normalizeEmail(email) + '|' + date + '|' + cp]) {
      throw new Error('report already exists for this date and checkpoint');
    }
    repAppendReport_(sh, {
      report_id: reportId, email: email, role: role, shift: ctx.user.shift, date: date, checkpoint: cp,
      work_summary: stored,
      count_1: counts.length > 0 ? counts[0] : '',
      count_2: counts.length > 1 ? counts[1] : '',
      count_3: counts.length > 2 ? counts[2] : '',
      count_4: counts.length > 3 ? counts[3] : '',
      submitted_at: now_(), flag: flag,
    });
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'SUBMIT_REPORT_2H', 'REPORTS_2H:' + date + ' ' + cp, '',
    flag + '|' + counts.join(','), isFinal ? 'Daily Productivity Report' : '');
  return { ok: true, report_id: reportId, date: date, checkpoint: cp, flag: flag, daily_productivity_report: isFinal };
}

function actionReportsGrid_(payload, ctx) {
  if (!isSuperAdmin(ctx.ident.email) && REPORT_GRID_ROLES.indexOf(ctx.user.role) < 0) {
    throw authErr_('not management', ctx.ident.email);
  }
  const date = repDateKey_(payload.date) || repToday_();
  const users = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; });
  const idx = repIndexRows_(readTab_('REPORTS_2H'));
  const totalsByRole = {};
  const rows = [];

  users.forEach(function (u) {
    const cps = repCheckpointsFor_(u.email, u.shift);
    if (!cps.length) return;
    const sched = repScheduleFor_(u.email);
    if (sched && !repIsWorkingDay_(sched.working_days, date)) return;

    const t = repTiming_(cps, date);
    const labels = repCountFields_(u.role);
    const sums = labels.map(function () { return 0; });
    const key = normalizeEmail(u.email) + '|' + date + '|';

    const cells = cps.map(function (cp, i) {
      const r = idx[key + cp];
      if (!r) return { checkpoint: cp, state: t.nowAbs >= t.deadlines[i] ? 'red' : 'empty', flag: '' };
      const flag = String(r.flag || '');
      labels.forEach(function (label, n) {
        const v = Number(r['count_' + (n + 1)]);
        if (isFinite(v)) sums[n] += v;
      });
      return { checkpoint: cp, state: REPORT_CELL_COLOR[flag] || 'empty', flag: flag };
    });

    if (labels.length) {
      if (!totalsByRole[u.role]) {
        totalsByRole[u.role] = labels.map(function (label) { return { label: label, total: 0 }; });
      }
      labels.forEach(function (label, n) { totalsByRole[u.role][n].total += sums[n]; });
    }

    const finalRow = idx[key + cps[cps.length - 1]];
    rows.push({
      email: u.email, name: u.name, role: u.role, shift: u.shift,
      checkpoints: cps, cells: cells,
      counts: labels.map(function (label, n) { return { label: label, value: sums[n] }; }),
      daily_productivity_report: finalRow ? String(finalRow.work_summary || '') : '',
    });
  });

  return {
    date: date,
    legend: { green: 'ontime', amber: 'late', red: 'missed' },
    roleCountFields: ROLE_COUNT_FIELDS,
    rows: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    totalsByRole: totalsByRole,
  };
}

function actionFlagMissedCheckpoints_(payload, ctx) {
  return { flagged: flagMissedCheckpoints() };
}

// ---------- trigger ----------

/** Time-driven trigger target (§5, §14). Idempotent: a MISSED row is written only when no row
 * exists for that person+date+checkpoint, so re-runs never duplicate rows or notifications.
 * Scans the current shift date and the one before it — a shift's final checkpoint falls due
 * after its own shift date has rolled over. */
function flagMissedCheckpoints() {
  const users = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; });
  const written = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('REPORTS_2H');
    const idx = repIndexRows_(readTab_('REPORTS_2H'));
    users.forEach(function (u) {
      const cps = repCheckpointsFor_(u.email, u.shift);
      if (!cps.length) return;
      const sched = repScheduleFor_(u.email);
      const base = repShiftDate_(cps);
      [base, repAddDays_(base, -1)].forEach(function (date) {
        if (sched && !repIsWorkingDay_(sched.working_days, date)) return;
        const t = repTiming_(cps, date);
        cps.forEach(function (cp, i) {
          if (t.nowAbs < t.deadlines[i]) return;
          const key = normalizeEmail(u.email) + '|' + date + '|' + cp;
          if (idx[key]) return;
          const row = {
            report_id: 'R' + Utilities.getUuid().slice(0, 8),
            email: u.email, role: u.role, shift: u.shift, date: date, checkpoint: cp,
            work_summary: '', count_1: '', count_2: '', count_3: '', count_4: '',
            submitted_at: '', flag: 'missed',
          };
          repAppendReport_(sh, row);
          idx[key] = row;
          written.push({ email: u.email, name: u.name, date: date, checkpoint: cp });
        });
      });
    });
  } finally { lock.releaseLock(); }

  written.forEach(function (w) {
    const ref = 'report:' + normalizeEmail(w.email) + ':' + w.date + ':' + w.checkpoint;
    notify_(w.email, 'Checkpoint missed', 'You missed the ' + w.checkpoint + ' checkpoint on ' + w.date + '.', ref);
    notifyManagement_('Checkpoint missed', w.name + ' missed the ' + w.checkpoint + ' checkpoint on ' + w.date + '.', ref);
    logActivity_('trigger', 'CHECKPOINT_MISSED', w.email, '', 'missed', w.date + ' ' + w.checkpoint);
  });
  return written.length;
}

// ---------- helpers ----------

function repCountFields_(role) { return ROLE_COUNT_FIELDS[role] || []; }

function repLateThreshold_() {
  const v = Number(getConfig('late_threshold_min'));
  return (isFinite(v) && v >= 0) ? v : Number(CONFIG_DEFAULTS.late_threshold_min);
}

/** Schedules.gs owns checkpoints. Only when that module is absent do we fall back to the
 * per-shift CONFIG times — an empty result from it means "no schedule assigned", not "use defaults". */
function repCheckpointsFor_(email, shift) {
  let raw;
  if (typeof getCheckpointsForUser_ === 'function') {
    try { raw = getCheckpointsForUser_(email); } catch (e) { raw = []; }
  } else {
    raw = repCheckpointsFromConfig_(shift);
  }
  const out = [];
  (raw || []).forEach(function (c) {
    let v = c;
    if (c && typeof c === 'object' && !(c instanceof Date)) v = c.time || c.checkpoint || c.at || '';
    const t = repCpKey_(v);
    if (t && out.indexOf(t) < 0) out.push(t);
  });
  return out;
}

function repCheckpointsFromConfig_(shift) {
  const key = String(shift) === 'Shift 2' ? 'checkpoints_shift2' : 'checkpoints_shift1';
  return String(getConfig(key) || CONFIG_DEFAULTS[key]).split(',');
}

function repScheduleFor_(email) {
  if (typeof getScheduleForUser_ === 'function') {
    try { return getScheduleForUser_(email) || null; } catch (e) { return null; }
  }
  return null;
}

/** Checkpoints that wrap past midnight (Shift 2) still belong to the date the shift started. */
function repShiftDate_(cps) {
  if (!cps.length) return repToday_();
  const first = repHhmmToMin_(cps[0]);
  const last = repHhmmToMin_(cps[cps.length - 1]);
  if (last <= first && repNowMin_() < first) return repAddDays_(repToday_(), -1);
  return repToday_();
}

/** Minutes from midnight of shiftDate for each checkpoint, its MISSED deadline (§5: the next
 * checkpoint; for the final one, one more cadence gap), and where "now" sits on the same axis. */
function repTiming_(cps, shiftDate) {
  const abs = [];
  let day = 0;
  for (let i = 0; i < cps.length; i++) {
    if (i > 0 && repHhmmToMin_(cps[i]) <= repHhmmToMin_(cps[i - 1])) day++;
    abs.push(day * 1440 + repHhmmToMin_(cps[i]));
  }
  let gap = abs.length >= 2 ? (abs[abs.length - 1] - abs[abs.length - 2]) : DEFAULT_CHECKPOINT_GAP_MIN;
  if (!(gap > 0)) gap = DEFAULT_CHECKPOINT_GAP_MIN;
  const deadlines = abs.map(function (a, i) { return i < abs.length - 1 ? abs[i + 1] : a + gap; });
  return { abs: abs, deadlines: deadlines, nowAbs: repDayDiff_(repToday_(), shiftDate) * 1440 + repNowMin_() };
}

function repIndexRows_(rows) {
  const map = {};
  rows.forEach(function (r) {
    const k = normalizeEmail(r.email) + '|' + repDateKey_(r.date) + '|' + repCpKey_(r.checkpoint);
    if (!map[k]) map[k] = r;
  });
  return map;
}

/** Writes exactly the REPORTS_2H columns in DB_TABS order; date and checkpoint are forced to
 * text so Sheets cannot coerce them into date/time values that break key matching. */
function repAppendReport_(sh, o) {
  sh.appendRow(DB_TABS.REPORTS_2H.map(function (c) { return o[c] === undefined ? '' : o[c]; }));
  const r = sh.getLastRow();
  ['date', 'checkpoint'].forEach(function (c) {
    sh.getRange(r, DB_TABS.REPORTS_2H.indexOf(c) + 1).setNumberFormat('@').setValue(String(o[c]));
  });
}

function repCpKey_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, repTz_(), 'HH:mm');
  const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return '';
  return (h < 10 ? '0' : '') + h + ':' + m[2];
}

function repDateKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, repTz_(), 'yyyy-MM-dd');
  const m = String(v || '').trim().match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

let REP_TZ = '';
function repTz_() {
  if (!REP_TZ) REP_TZ = getPortalDb_(false).getSpreadsheetTimeZone() || 'Asia/Karachi';
  return REP_TZ;
}

function repHhmmToMin_(s) {
  const k = repCpKey_(s);
  return k ? Number(k.slice(0, 2)) * 60 + Number(k.slice(3, 5)) : 0;
}
function repToday_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd'); }
function repNowMin_() {
  const s = Utilities.formatDate(new Date(), 'Asia/Karachi', 'HH:mm');
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}
function repAddDays_(dateStr, n) {
  const p = String(dateStr).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  d.setUTCDate(d.getUTCDate() + n);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}
function repDayDiff_(a, b) {
  const pa = String(a).split('-'), pb = String(b).split('-');
  const ta = Date.UTC(Number(pa[0]), Number(pa[1]) - 1, Number(pa[2]));
  const tb = Date.UTC(Number(pb[0]), Number(pb[1]) - 1, Number(pb[2]));
  return Math.round((ta - tb) / 86400000);
}

/** Tolerant of both "Mon,Tue,Wed" and "Mon-Sat"; an unrecognised pattern counts as a working
 * day, so a bad SCHEDULES cell can never silently suppress missed-checkpoint flagging. */
function repIsWorkingDay_(pattern, dateStr) {
  const p = String(pattern || '').trim().toUpperCase();
  if (!p) return true;
  const parts = String(dateStr).split('-');
  const want = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))).getUTCDay();
  let matched = false, understood = false;
  p.split(/[,;/|]+/).forEach(function (tok) {
    tok = tok.trim();
    if (!tok) return;
    const range = tok.split('-');
    if (range.length === 2) {
      const a = REP_DAY_NAMES.indexOf(range[0].trim().slice(0, 3));
      const b = REP_DAY_NAMES.indexOf(range[1].trim().slice(0, 3));
      if (a < 0 || b < 0) return;
      understood = true;
      for (let k = a; ; k = (k + 1) % 7) {
        if (k === want) matched = true;
        if (k === b) break;
      }
      return;
    }
    const one = REP_DAY_NAMES.indexOf(tok.slice(0, 3));
    if (one < 0) return;
    understood = true;
    if (one === want) matched = true;
  });
  return understood ? matched : true;
}

const ACTIONS_REPORTS = {
  myCheckpoints: [actionMyCheckpoints_, 'any'],
  submitReport: [actionSubmitReport_, 'any'],
  reportsGrid: [actionReportsGrid_, 'any'],
  flagMissedNow: [actionFlagMissedCheckpoints_, 'super'],
};
