/** R8.gs — Department dashboards · hunting desk · listing desk · link requests · reject-back ·
 * staff reviews · management pending (25 Aug, Hasib's R8 batch — docs/R8-DESIGN.md).
 * One module, registered as ACTIONS_R8 in Router.gs. Uses only proven helpers. */

/* ---------- config-driven reason lists (R8-2a / R8-3b) ---------- */
const R8_REJECT_DEFAULTS = ['Profit too thin after fees', 'Too many competitors', 'Sell-through too low',
  'Branded item — VeRO risk', 'Outside the £8–30 price window', 'Supplier delivery too slow',
  'Already listed / duplicate', 'Evidence links broken or missing', 'Seasonal window already passed'];
const R8_REVISE_DEFAULTS = ['Better images required', 'Need 3 working supplier links', 'Re-check the source price',
  'Selling price — margin too thin', 'Terapeak evidence missing', 'Competitor analysis incomplete',
  'Title needs rework', 'Description too weak', 'Category breadcrumb missing', 'Confirm UK stock & delivery time'];
const R8_LISTER_REJECT_DEFAULTS = ['issues with data', 'no sale worth it', 'no data available'];

function r8List_(key, fallback) {
  try {
    const raw = getConfig(key);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr.map(String); }
  } catch (e) {}
  return fallback.slice();
}

function r8SetConfig_(key, value) {
  const sh = getPortalDb_(false).getSheetByName('CONFIG');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value, 'R8 reason list (managed from the portal)']);
}

function actionHuntReasons_(payload, ctx) {
  return {
    reject: r8List_('hunt_reject_reasons', R8_REJECT_DEFAULTS),
    revise: r8List_('hunt_revise_needs', R8_REVISE_DEFAULTS),
    lister_reject: r8List_('lister_reject_reasons', R8_LISTER_REJECT_DEFAULTS),
    can_edit: isMgmt_(ctx.user.role, ctx.ident.email),
  };
}

function actionHuntReasonAdd_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('only Management adds reasons');
  const kind = String(payload.kind || '');
  const keys = { reject: ['hunt_reject_reasons', R8_REJECT_DEFAULTS], revise: ['hunt_revise_needs', R8_REVISE_DEFAULTS],
    lister_reject: ['lister_reject_reasons', R8_LISTER_REJECT_DEFAULTS] };
  if (!keys[kind]) throw new Error('SAY: kind must be reject, revise or lister_reject');
  const reason = String(payload.reason || '').trim().slice(0, 120);
  if (reason.length < 3) throw new Error('SAY: write the reason');
  const list = r8List_(keys[kind][0], keys[kind][1]);
  if (list.some(function (r) { return r.toLowerCase() === reason.toLowerCase(); })) return { ok: true, list: list, note: 'already on the list' };
  list.push(reason);
  r8SetConfig_(keys[kind][0], JSON.stringify(list));
  try { enginePost_('syncConfig', { rows: [{ key: keys[kind][0], value: JSON.stringify(list) }] }); } catch (e) {}
  logActivity_(ctx.ident.email, 'R8_REASON_ADD', kind, '', reason, '');
  return { ok: true, list: list };
}

/* ---------- department pending boards (R8-1) ---------- */
/* Every task type the portal can create must appear here. 'loss_review' did not, and 32 live
   loss tasks - real work, assigned to the Advertising module holder by Signals.gs - fell through
   to 'General', a bucket with no department page. So the Advertising board read empty while a
   third of the open work in the business sat inside it, which is what "the boards show fake
   numbers" meant. A missing type must never again be silently absorbed: r8DeptOfType_ reports
   what it could not place so the board can say so out loud. */
const R8_DEPT_OF_TYPE = {
  listing_new: 'Listing', listing_revision: 'Listing', end_listing: 'Listing',
  campaign_set: 'Advertising', cpc_research: 'Advertising', potential_cpc_review: 'Advertising',
  loss_review: 'Advertising',
  supplier_add: 'Orders',
  sourcing_link: 'Hunting', hunt_revision: 'Hunting',
  query: 'CS',
  general: 'General',
};
/* TASK_TYPES is the authoritative list in Tasks.gs; anything in it that is missing above is a
   bug, not a 'General' task. Surfaced rather than swallowed. */
function r8UnmappedTypes_() {
  const known = (typeof TASK_TYPES !== 'undefined' && TASK_TYPES) || [];
  return known.filter(function (t) { return !Object.prototype.hasOwnProperty.call(R8_DEPT_OF_TYPE, t); });
}

function r8IsSystemActor_(email) {
  const e = String(email || '').toLowerCase();
  return !e || e.indexOf('@') < 0 || e === 'system' || e === 'engine@worker' || e.indexOf('engine') === 0;
}

function actionDeptPending_(payload, ctx) {
  const nowMs = Date.now();
  const depts = {};
  const history = [];
  readTab_('TASKS').forEach(function (t) {
    const type = String(t.type || 'general');
    const dept = R8_DEPT_OF_TYPE[type] || 'General';
    const status = String(t.status || '');
    const rec = depts[dept] = depts[dept] || { dept: dept, open: 0, overdue: 0, oldest: '', by_assignee: {}, system_made: 0, mgmt_made: 0 };
    if (status === TASK_STATUS_COMPLETED) {
      const dAt = taskPktIso_(t.decided_at);
      if (dAt) history.push({ dept: dept, type: type, title: String(t.title || '').slice(0, 80), assigned_to: String(t.assigned_to || ''),
        origin: r8IsSystemActor_(t.assigned_by) ? 'system' : 'management', decided_at: dAt });
      return;
    }
    if ([TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED, TASK_STATUS_SUBMITTED].indexOf(status) < 0) return;
    rec.open++;
    if (r8IsSystemActor_(t.assigned_by)) rec.system_made++; else rec.mgmt_made++;
    const who = String(t.assigned_to || '(unassigned)');
    rec.by_assignee[who] = (rec.by_assignee[who] || 0) + 1;
    const dl = taskMs_(t.deadline_pkt);
    if (!isNaN(dl) && dl < nowMs && status !== TASK_STATUS_SUBMITTED) rec.overdue++;
    const created = taskPktIso_(t.created_at);
    if (created && (!rec.oldest || created < rec.oldest)) rec.oldest = created;
  });
  history.sort(function (a, b) { return String(b.decided_at).localeCompare(String(a.decided_at)); });
  return { departments: Object.keys(depts).map(function (k) { return depts[k]; })
      .sort(function (a, b) { return b.open - a.open; }),
    history: history.slice(0, 40), as_of: now_(),
    unmapped_types: r8UnmappedTypes_() };
}

/* ---------- hunting desk (R8-2) ---------- */
function actionHuntDesk_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email) || ctx.user.role === 'Team Lead';
  const who = mgmt && payload.hunter ? normalizeEmail(payload.hunter) : me;
  const monthKey = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM');
  const per = {};                                    // hunter → tallies (mgmt sees all)
  const reasons = {};                                // reason → count (rejections last 30d)
  const cut30 = Date.now() - 30 * 86400000;
  readTab_('HUNTING_DB').forEach(function (r) {
    const rec = huntRecord_(r);
    const h = normalizeEmail(rec.hunter_email);
    if (!mgmt && h !== me) return;
    const p = per[h] = per[h] || { hunter: h, hunted: 0, hunted_month: 0, approved: 0, approved_month: 0,
      pending: 0, revision: 0, rejected_30d: 0, my: h === who };
    p.hunted++;
    const ts = String(rec.ts || '');
    if (ts.slice(0, 7) === monthKey) p.hunted_month++;
    const st = String(rec.approval_status || '');
    if (st === HUNT_APPROVED) { p.approved++; if (ts.slice(0, 7) === monthKey) p.approved_month++; }
    else if (st === '') p.pending++;
    else if (st === HUNT_REVISION) p.revision++;
    else {
      const tMs = Date.parse(ts) || 0;
      if (tMs >= cut30) {
        p.rejected_30d++;
        String(rec['Comments'] || '').split(/;|·/).map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length > 2 && s.length < 90 && s.indexOf('(revised') < 0; })
          .forEach(function (s) { if (h === who || mgmt) reasons[s] = (reasons[s] || 0) + 1; });
      }
    }
  });
  // open hunter-directed tasks (revisions and link requests) for the person in focus
  const tasks = [];
  readTab_('TASKS').forEach(function (t) {
    if (normalizeEmail(t.assigned_to) !== who) return;
    const type = String(t.type || '');
    if (['listing_revision', 'hunt_revision', 'sourcing_link'].indexOf(type) < 0) return;
    const status = String(t.status || '');
    if ([TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED].indexOf(status) < 0) return;
    tasks.push({ task_id: String(t.task_id), type: type, title: String(t.title || '').slice(0, 90),
      item_id: String(t.item_id || ''), deadline_pkt: taskPktIso_(t.deadline_pkt), status: status,
      details: String(t.details || '').slice(0, 400) });
  });
  const reasonRows = Object.keys(reasons).map(function (k) { return { reason: k, n: reasons[k] }; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 15);
  return { focus: who, mine: per[who] || null,
    hunters: mgmt ? Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.hunted_month - a.hunted_month; }) : [],
    open_tasks: tasks, rejection_reasons: reasonRows, as_of: now_() };
}

/* ---------- order-link requests (R8-2b) + hourly sweep ---------- */
function r8OpenLinkTask_(all, itemId) {
  for (let i = 0; i < all.length; i++) {
    const t = all[i];
    if (String(t.type) === 'sourcing_link' && String(t.item_id) === itemId &&
        [TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED].indexOf(String(t.status)) >= 0) return t;
  }
  return null;
}

function r8MakeLinkTask_(itemId, account, title, hunterEmail, requestedBy, note) {
  const sh = tasksSheet_();
  const stamp = now_();
  const deadline = taskPktIso_(new Date(Date.now() + 86400000));
  const taskId = listingCreateTask_(sh, {
    type: 'sourcing_link', account: account, item_id: itemId,
    title: 'sourcing_link — Item ID ' + itemId,
    details: listingLines_([
      'Item ID: ' + itemId, 'Listing: ' + String(title || ''),
      'Orders are arriving with NO supplier link on file — add the AliExpress link(s) on the Sourcing screen.',
      requestedBy ? 'Requested by: ' + requestedBy : '', note ? 'Note: ' + note : '',
    ]),
    assigned_by: requestedBy || 'system', assigned_to: hunterEmail,
    priority: 'high', deadline_pkt: deadline, stamp: stamp,
  });
  notify_(hunterEmail, 'Task assigned',
    '🟠 Supplier link needed · ' + account + ' · ' + itemId + (title ? ' · ' + String(title).slice(0, 50) : '') +
    ' — orders are waiting and the portal has NO purchase link for this item you hunted. Add it on the Sourcing screen now.',
    'task:' + taskId);
  return taskId;
}

function actionRequestItemLink_(payload, ctx) {
  const roles = ['Order Processor', 'Ops Head', 'Management', 'Team Lead', 'CS'];
  if (roles.indexOf(ctx.user.role) < 0 && !isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('role may not request links');
  const itemId = taskItemId_(payload.item_id);
  const all = readTab_('TASKS');
  const open = r8OpenLinkTask_(all, itemId);
  if (open) return { task_id: String(open.task_id), existing: true, assigned_to: String(open.assigned_to) };
  let hunter = '', title = '', account = String(payload.account || '');
  try {
    const p = enginePost_('provenanceGet', { item_id: itemId });
    if (p && p.hunter_email) hunter = String(p.hunter_email);
    if (p && p.account && !account) account = String(p.account);
  } catch (e) {}
  if (!hunter) {
    notifyManagement_('Link request — hunter unknown',
      '🟠 ' + (ctx.user.name || ctx.ident.email) + ' needs a supplier link for item ' + itemId + ' (' + (account || '?') +
      ') but the portal has no record of who hunted it. Assign someone on the Sourcing screen.', 'r8:link:' + itemId);
    return { task_id: '', existing: false, assigned_to: '', note: 'no hunter recorded — Management alerted' };
  }
  const taskId = r8MakeLinkTask_(itemId, account, String(payload.title || ''), hunter, ctx.ident.email, String(payload.note || '').slice(0, 200));
  logActivity_(ctx.ident.email, 'R8_LINK_REQUEST', itemId, '', hunter, '');
  return { task_id: taskId, existing: false, assigned_to: hunter };
}

/** Hourly ride: engine names the items with orders but no link; each with a known hunter gets ONE
 * open task; unknowns go to management as a single daily digest. Caps keep the run cheap. */
function orderLinkSweep() {
  let items = [];
  try { items = (enginePost_('missingLinkItems', {}) || {}).items || []; } catch (e) { return 'engine unreachable'; }
  if (!items.length) return 'nothing missing';
  const all = readTab_('TASKS');
  let made = 0; const orphans = [];
  for (let i = 0; i < items.length && made < 5; i++) {
    const it = items[i];
    const id = String(it.item_id || '');
    if (!/^\d{9,15}$/.test(id)) continue;
    if (r8OpenLinkTask_(all, id)) continue;
    const hunter = String(it.hunter_email || '');
    if (!hunter) { orphans.push(id + ' (' + String(it.account || '') + ')'); continue; }
    r8MakeLinkTask_(id, String(it.account || ''), String(it.title || ''), hunter, '', String(it.orders_n || 1) + ' order(s) waiting');
    made++;
  }
  if (orphans.length) {
    const props = PropertiesService.getScriptProperties();
    const key = 'R8_ORPHAN_' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd');
    if (!props.getProperty(key)) {
      props.setProperty(key, '1');
      notifyManagement_('Items with orders but no supplier link',
        '🟠 ' + orphans.length + ' item(s) have orders but NO supplier link and NO recorded hunter: ' +
        orphans.slice(0, 6).join(', ') + ' — assign them on the Sourcing screen.', 'r8:orphans:' + key);
    }
  }
  return 'made ' + made + ' task(s), ' + orphans.length + ' orphan(s)';
}

/* ---------- listing desk (R8-3a / R8-8 CPC split) ---------- */
function r8Family_(details) {
  try {
    const parsed = JSON.parse(String(details || '{}'));
    const lim = (parsed && parsed.limited) || parsed || {};
    const adv = String(lim['CPC Selling Chance'] || '');
    if (!adv) return 'Unassigned';
    return /CPC/i.test(adv) ? 'CPC' : 'General/Dynamic';
  } catch (e) { return 'Unassigned'; }
}

function actionListDesk_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email) || ['Listing Manager', 'Team Lead'].indexOf(ctx.user.role) >= 0;
  const nowMs = Date.now();
  const monthKey = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM');
  const perAssignee = {}, perAccount = {}, fam = { CPC: { listed_month: 0, pending: 0 }, 'General/Dynamic': { listed_month: 0, pending: 0 }, Unassigned: { listed_month: 0, pending: 0 } };
  const rows = [];
  const revisionsDone = [];   // 26 Aug: the revision archive - completed revisions with their item data
  readTab_('TASKS').forEach(function (t) {
    const type = String(t.type || '');
    if (type !== 'listing_new' && type !== 'listing_revision') return;
    const assignee = normalizeEmail(t.assigned_to);
    if (!mgmt && assignee !== me) return;
    const status = String(t.status || '');
    const family = type === 'listing_new' ? r8Family_(t.details) : 'Revision';
    if (status === TASK_STATUS_COMPLETED) {
      if (type === 'listing_new' && taskPktIso_(t.decided_at).slice(0, 7) === monthKey && fam[family]) fam[family].listed_month++;
      if (type === 'listing_revision') {
        revisionsDone.push({ task_id: String(t.task_id), account: String(t.account || ''),
          title: String(t.title || '').slice(0, 90), item_id: String(t.item_id || ''),
          assigned_to: assignee, decided_at: taskPktIso_(t.decided_at),
          reason: String(t.details || '').replace(/\s+/g, ' ').slice(0, 160),
          by: String(t.assigned_by || '') });
      }
      return;
    }
    if ([TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED, TASK_STATUS_SUBMITTED].indexOf(status) < 0) return;
    const a = perAssignee[assignee] = perAssignee[assignee] || { assignee: assignee, open: 0, overdue: 0, due_today: 0, submitted: 0 };
    a.open++;
    const acct = String(t.account || '(none)');
    perAccount[acct] = (perAccount[acct] || 0) + 1;
    if (type === 'listing_new' && fam[family]) fam[family].pending++;
    const dl = taskMs_(t.deadline_pkt);
    if (status === TASK_STATUS_SUBMITTED) a.submitted++;
    else if (!isNaN(dl)) {
      if (dl < nowMs) a.overdue++;
      else if (dl - nowMs < 86400000) a.due_today++;
    }
    rows.push({ task_id: String(t.task_id), type: type, family: family, account: acct,
      title: String(t.title || '').slice(0, 90), assigned_to: assignee, status: status,
      deadline_pkt: taskPktIso_(t.deadline_pkt), overdue: !isNaN(dl) && dl < nowMs && status !== TASK_STATUS_SUBMITTED,
      item_id: String(t.item_id || '') });
  });
  rows.sort(function (a, b) { return String(a.deadline_pkt).localeCompare(String(b.deadline_pkt)); });
  /* R8-8 (Hasib): "a dashboard of current pending cpc listings who are going to get updated" —
     every CPC job in flight: the research, the campaign that follows it, and the potential-CPC
     reviews. These are the listings whose advertising is about to change. */
  const cpc = [];
  const cpcCounts = { cpc_research: 0, campaign_set: 0, potential_cpc_review: 0, overdue: 0 };
  readTab_('TASKS').forEach(function (t) {
    const type = String(t.type || '');
    if (['cpc_research', 'campaign_set', 'potential_cpc_review'].indexOf(type) < 0) return;
    const status = String(t.status || '');
    if ([TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED, TASK_STATUS_SUBMITTED].indexOf(status) < 0) return;
    const assignee = normalizeEmail(t.assigned_to);
    if (!mgmt && assignee !== me && ctx.user.role !== 'Advertising Manager') return;
    const dl = taskMs_(t.deadline_pkt);
    const late = !isNaN(dl) && dl < nowMs && status !== TASK_STATUS_SUBMITTED;
    if (cpcCounts[type] !== undefined) cpcCounts[type]++;
    if (late) cpcCounts.overdue++;
    cpc.push({ task_id: String(t.task_id), type: type, account: String(t.account || ''),
      item_id: String(t.item_id || ''), title: String(t.title || '').slice(0, 90),
      assigned_to: assignee, status: status, deadline_pkt: taskPktIso_(t.deadline_pkt), overdue: late });
  });
  cpc.sort(function (a, b) { return String(a.deadline_pkt).localeCompare(String(b.deadline_pkt)); });
  return { mgmt: mgmt, per_assignee: Object.keys(perAssignee).map(function (k) { return perAssignee[k]; }).sort(function (a, b) { return b.open - a.open; }),
    per_account: perAccount, families: fam, rows: rows.slice(0, 300),
    cpc_pipeline: cpc.slice(0, 200), cpc_counts: cpcCounts,
    revisions_done: revisionsDone.sort(function (a, b) { return String(b.decided_at).localeCompare(String(a.decided_at)); }).slice(0, 100),
    as_of: now_() };
}

/* ---------- lister reject-back with management approval (R8-3b) ---------- */
function actionListerRejectRequest_(payload, ctx) {
  const reason = String(payload.reason || '').trim();
  const allowed = r8List_('lister_reject_reasons', R8_LISTER_REJECT_DEFAULTS);
  if (!allowed.some(function (r) { return r.toLowerCase() === reason.toLowerCase(); })) {
    throw new Error('SAY: pick a reason from the list: ' + allowed.join(' · '));
  }
  const sh = tasksSheet_();
  let rec = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (String(rec.type) !== 'listing_new') throw new Error('only listing tasks can be sent back');
    if (normalizeEmail(rec.assigned_to) !== normalizeEmail(ctx.ident.email) && !isMgmt_(ctx.user.role, ctx.ident.email)) {
      throw new Error(SAFE_ERROR_PREFIX + 'not your task');
    }
    const status = String(rec.status || '');
    if ([TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED].indexOf(status) < 0) {
      throw new Error(SAFE_ERROR_PREFIX + 'this task is not open');
    }
    taskWrite_(sh, found, {
      comments: listingMergeFlag_(rec.comments, listingFlagObj_('rejreq', ctx.ident.email, { reason: reason })),
      updated_at: now_(),
    });
  } finally { lock.releaseLock(); }
  logActivity_(ctx.ident.email, 'R8_REJECT_REQUEST', String(rec.task_id), '', reason, '');
  notifyManagement_('Listing rejection requested',
    '🟠 ' + (ctx.user.name || ctx.ident.email) + ' wants to reject "' + String(rec.title || '').slice(0, 60) +
    '" · ' + String(rec.account || '') + ' — reason: ' + reason + '. Approve or deny on the Management desk.',
    'task:' + String(rec.task_id));
  return { task_id: String(rec.task_id), flag: 'rejreq', reason: reason };
}

function actionMgmtRejectDecide_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('Management decides rejections');
  const approve = String(payload.approve) === 'true' || payload.approve === true;
  const note = String(payload.note || '').trim().slice(0, 300);
  const sh = tasksSheet_();
  let rec = null, flag = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    const lines = String(rec.comments || '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(LISTING_FLAG_TAG) === 0) { try { flag = JSON.parse(lines[i].slice(LISTING_FLAG_TAG.length)); } catch (e) {} }
    }
    if (!flag || flag.flag !== 'rejreq') throw new Error('SAY: no rejection request on this task — refresh');
    if (approve) {
      taskWrite_(sh, found, {
        status: TASK_STATUS_COMPLETED, decided_at: now_(), approved_by: ctx.ident.email, updated_at: now_(),
        comments: listingMergeFlag_(rec.comments, null) + '\n[' + now_() + '] REJECTED (lister request approved): ' + String(flag.reason || '') + (note ? ' — ' + note : ''),
      });
    } else {
      taskWrite_(sh, found, {
        status: TASK_STATUS_WORKING, updated_at: now_(),
        comments: listingMergeFlag_(rec.comments, null) + '\n[' + now_() + '] ' + (ctx.user.name || 'Management') + ' returned: rejection DENIED' + (note ? ' — ' + note : '') + '. Continue the listing.',
      });
    }
  } finally { lock.releaseLock(); }
  // the hunt record follows the decision (approve = the product is off the list, with the reason)
  if (approve) {
    try {
      const parsed = JSON.parse(String(rec.details || '{}'));
      const huntId = String((parsed && parsed.hunt_id) || '');
      if (huntId) {
        const hsh = huntSheet_();
        const hfound = huntFind_(hsh, huntId);
        const patch = {};
        patch[HC_APPROVAL] = HUNT_NOT_APPROVED;
        patch[HC_COMMENTS] = (String(hfound.rec[HC_COMMENTS] || '').slice(0, 1200) + ' · rejected at listing: ' + String(flag.reason || '')).slice(0, 1500);
        huntWrite_(hsh, hfound, patch);
        const hrec = huntRecord_(hfound.rec);
        notify_(hrec.hunter_email, 'Product rejected at listing',
          '🟠 "' + String(rec.title || '').slice(0, 60) + '" was rejected by the lister (' + String(flag.reason || '') + ') and Management approved it. It counts as not approved.', 'hunt:' + huntId);
      }
    } catch (e) {}
  }
  notify_(String(flag.by || rec.assigned_to), approve ? 'Rejection approved' : 'Rejection denied',
    (approve ? '✅ Your rejection of "' : '🔵 Your rejection of "') + String(rec.title || '').slice(0, 60) + '" was ' +
    (approve ? 'approved — the task is closed.' : 'denied' + (note ? ': ' + note : '') + ' — continue the listing.'),
    'task:' + String(rec.task_id));
  logActivity_(ctx.ident.email, 'R8_REJECT_DECIDE', String(rec.task_id), '', approve ? 'approved' : 'denied', note);
  return { task_id: String(rec.task_id), approved: approve };
}

/* ---------- 7-day decision → tasks (R8-3c, task half; the record half is engine zeroSaleDecide) ---------- */
function actionDecisionAct_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('Management decides listings');
  const itemId = taskItemId_(payload.item_id);
  const kind = String(payload.kind || '');
  const note = String(payload.note || '').trim().slice(0, 300);
  const account = String(payload.account || '');
  const title = String(payload.title || '');
  const all = readTab_('TASKS');
  const sh = tasksSheet_();
  const stamp = now_();
  if (kind === 'end') {
    const tl = listingPickForRole_('Team Lead', String(payload.assignee_email || ''), all, 'end_listing') ||
      listingPickForRole_('Listing Manager', '', all, 'end_listing');
    if (!tl) throw new Error('SAY: no Team Lead or Listing Manager to send the end command to');
    const taskId = listingCreateTask_(sh, {
      type: 'end_listing', account: account, item_id: itemId,
      title: 'end_listing — Item ID ' + itemId,
      details: listingLines_(['Item ID: ' + itemId, 'Listing: ' + title,
        'Management decision: END this listing (7 days, no sale).', note ? 'Note: ' + note : '']),
      assigned_by: ctx.ident.email, assigned_to: tl.email,
      priority: 'high', deadline_pkt: taskPktIso_(new Date(Date.now() + 86400000)), stamp: stamp,
    });
    notify_(tl.email, 'Task assigned', '🔴 End listing ' + itemId + ' · ' + account +
      (title ? ' · ' + title.slice(0, 50) : '') + ' — Management decided: end it on eBay, then submit the task.' +
      (note ? ' Note: ' + note : ''), 'task:' + taskId);
    logActivity_(ctx.ident.email, 'R8_DECISION_END', itemId, '', tl.email, note);
    return { task_id: taskId, kind: 'end', assigned_to: tl.email };
  }
  if (kind === 'revise') {
    let lister = String(payload.assignee_email || '');
    if (!lister) {
      try { const p = enginePost_('provenanceGet', { item_id: itemId }); if (p && p.lister_email) lister = String(p.lister_email); } catch (e) {}
    }
    const who = lister ? { email: lister, name: lister } :
      listingPickForRole_('Item Lister', '', all, 'listing_revision') || listingPickForRole_('Listing Manager', '', all, 'listing_revision');
    if (!who) throw new Error('SAY: nobody to send the revision to');
    const taskId = listingCreateTask_(sh, {
      type: 'listing_revision', account: account, item_id: itemId,
      title: 'listing_revision — Item ID ' + itemId,
      details: listingLines_(['Item ID: ' + itemId, 'Listing: ' + title,
        'Management decision: REVISE (7 days, no sale) — title, image, price or campaign.', note ? 'Changes required: ' + note : '']),
      assigned_by: ctx.ident.email, assigned_to: who.email,
      priority: 'high', deadline_pkt: taskPktIso_(new Date(Date.now() + 2 * 86400000)), stamp: stamp,
    });
    notify_(who.email, 'Task assigned', '🟠 Revision · ' + itemId + ' · ' + account +
      (title ? ' · ' + title.slice(0, 50) : '') + ' — 7 days without a sale. ' + (note || 'Revise title, image, price or campaign.'), 'task:' + taskId);
    logActivity_(ctx.ident.email, 'R8_DECISION_REVISE', itemId, '', who.email, note);
    return { task_id: taskId, kind: 'revise', assigned_to: who.email };
  }
  throw new Error('SAY: kind must be end or revise');
}

/* ---------- go-live desk: send a draft back to the lister (R8-3e) ---------- */
function actionGoLiveReturn_(payload, ctx) {
  const roles = ['Team Lead', 'Listing Manager', 'Management', 'Ops Head', 'CS'];
  if (roles.indexOf(ctx.user.role) < 0 && !isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('role may not return drafts');
  const note = String(payload.note || '').trim().slice(0, 500);
  if (!note) throw new Error('SAY: say what the lister must fix');
  const sh = tasksSheet_();
  let rec = null, back = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (String(rec.type) !== 'listing_new') throw new Error('not a listing task');
    /* The draft flag remembers who handed it over — that is who gets it back. */
    let flag = null;
    String(rec.comments || '').split('\n').forEach(function (l) {
      if (l.indexOf(LISTING_FLAG_TAG) === 0) { try { flag = JSON.parse(l.slice(LISTING_FLAG_TAG.length)); } catch (e) {} }
    });
    back = normalizeEmail((flag && (flag.from || flag.by)) || '');
    if (!back) throw new Error('SAY: this task has no record of the lister who left it — reassign it from My tasks');
    taskWrite_(sh, found, {
      assigned_to: back, status: TASK_STATUS_WORKING, updated_at: now_(),
      comments: listingMergeFlag_(rec.comments, null) + '\n[' + now_() + '] ' + (ctx.user.name || ctx.ident.email) + ' returned: ' + note,
    });
  } finally { lock.releaseLock(); }
  logActivity_(ctx.ident.email, 'R8_GOLIVE_RETURN', String(rec.task_id), '', back, note.slice(0, 120));
  notify_(back, 'Draft sent back',
    '🟠 "' + String(rec.title || '').slice(0, 60) + '" · ' + String(rec.account || '') +
    ' — ' + (ctx.user.name || 'Go-live') + ' sent your draft back: ' + note.slice(0, 300), 'task:' + String(rec.task_id));
  return { task_id: String(rec.task_id), assigned_to: back };
}

/* ---------- staff reviews (R8-5) ---------- */
const R8_REVIEW_HEADERS = ['review_id', 'email', 'week', 'rated_by', 'behavior', 'working', 'notes', 'created_at'];

function r8ReviewsSheet_() {
  const db = getPortalDb_(false);
  let sh = db.getSheetByName('STAFF_REVIEWS');
  if (!sh) { sh = db.insertSheet('STAFF_REVIEWS'); sh.appendRow(R8_REVIEW_HEADERS); }
  return sh;
}

function r8WeekKey_(d) {
  const dt = d || new Date();
  const pk = new Date(dt.getTime() + 5 * 3600000);
  const y = pk.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil((((pk - start) / 86400000) + start.getUTCDay() + 1) / 7);
  return y + '-W' + (week < 10 ? '0' : '') + week;
}

function r8ReviewRows_() {
  const sh = r8ReviewsSheet_();
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    R8_REVIEW_HEADERS.forEach(function (h, n) { row[h] = values[i][n]; });
    out.push(row);
  }
  return out;
}

function actionStaffReviewsPending_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('Management reviews staff');
  const week = r8WeekKey_();
  const done = {};
  r8ReviewRows_().forEach(function (r) { if (String(r.week) === week) done[normalizeEmail(r.email)] = true; });
  const monthAgo = Date.now() - 7 * 86400000;
  const stats = {};
  readTab_('TASKS').forEach(function (t) {
    const who = normalizeEmail(t.assigned_to);
    const s = stats[who] = stats[who] || { done_week: 0, overdue_now: 0 };
    if (String(t.status) === TASK_STATUS_COMPLETED && taskMs_(t.decided_at) >= monthAgo) s.done_week++;
    else if ([TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED].indexOf(String(t.status)) >= 0) {
      const dl = taskMs_(t.deadline_pkt);
      if (!isNaN(dl) && dl < Date.now()) s.overdue_now++;
    }
  });
  const pending = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const e = normalizeEmail(u.email);
    if (done[e]) return;
    pending.push({ email: String(u.email), name: String(u.name || u.email), role: String(u.role || ''),
      tasks_done_7d: (stats[e] || {}).done_week || 0, overdue_now: (stats[e] || {}).overdue_now || 0 });
  });
  return { week: week, pending: pending, as_of: now_() };
}

function actionStaffReviewSave_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('Management reviews staff');
  const email = normalizeEmail(payload.email);
  if (!email || email.indexOf('@') < 0) throw new Error('SAY: whose review is this?');
  const behavior = Math.max(1, Math.min(5, Number(payload.behavior) || 0));
  const working = Math.max(1, Math.min(5, Number(payload.working) || 0));
  if (!behavior || !working) throw new Error('SAY: behavior and working scores are both 1-5');
  const notes = String(payload.notes || '').trim().slice(0, 500);
  const week = r8WeekKey_();
  const sh = r8ReviewsSheet_();
  sh.appendRow(['SR' + Utilities.getUuid().slice(0, 8), email, week, ctx.ident.email, behavior, working, notes, now_()]);
  logActivity_(ctx.ident.email, 'R8_STAFF_REVIEW', email, '', week, 'b' + behavior + ' w' + working);
  /* 26 Aug (owner): staff matters notify the staff member too. Neutral wording — it points them
     to their own reviews rather than firing raw scores at them in a bell. */
  try { notify_(email, 'Weekly review', '⭐ Your weekly review for ' + week + ' has been recorded — open Staff reviews to see it.', 'review:' + week + ':' + email); } catch (e) {}
  return { ok: true, week: week };
}

function actionStaffReviewHistory_(payload, ctx) {
  const target = normalizeEmail(payload.email || ctx.ident.email);
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email);
  if (!mgmt && target !== normalizeEmail(ctx.ident.email)) throw new Error('you may only read your own reviews');
  const rows = r8ReviewRows_().filter(function (r) { return normalizeEmail(r.email) === target; })
    .sort(function (a, b) { return String(b.week).localeCompare(String(a.week)); }).slice(0, 26)
    .map(function (r) {
      return mgmt ? { week: r.week, behavior: Number(r.behavior), working: Number(r.working), notes: String(r.notes || ''), rated_by: String(r.rated_by || '') }
        : { week: r.week, behavior: Number(r.behavior), working: Number(r.working) };
    });
  return { email: target, reviews: rows };
}

/** Weekly nudge: from Wednesday (PKT) a single letter per week while reviews are missing. */
function reviewWatch() {
  const week = r8WeekKey_();
  const props = PropertiesService.getScriptProperties();
  const key = 'R8_REVIEW_NUDGE_' + week;
  if (props.getProperty(key)) return 'already nudged';
  const dow = Number(Utilities.formatDate(new Date(), 'Asia/Karachi', 'u'));   // 1=Mon
  if (dow < 3) return 'before Wednesday';
  const done = {};
  r8ReviewRows_().forEach(function (r) { if (String(r.week) === week) done[normalizeEmail(r.email)] = true; });
  let missing = 0;
  readTab_('USERS').forEach(function (u) { if (String(u.status) === 'approved' && !done[normalizeEmail(u.email)]) missing++; });
  if (!missing) return 'all reviewed';
  props.setProperty(key, '1');
  notifyManagement_('Weekly staff reviews pending',
    '📋 ' + missing + ' staff member(s) have no behavior/working review for ' + week +
    ' — open the Staff reviews screen and rate them (1-5 each, short note).', 'r8:reviews:' + week);
  return 'nudged for ' + missing;
}

/* ---------- management pending desk, AS half (R8-6) ---------- */
function actionMgmtPendingAS_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email) && ctx.user.role !== 'Team Lead') throw new Error('management only');
  let huntsPending = 0;
  readTab_('HUNTING_DB').forEach(function (r) { if (String(huntRecord_(r).approval_status || '') === '') huntsPending++; });
  let submitted = 0, rejreq = 0;
  readTab_('TASKS').forEach(function (t) {
    if (String(t.status) === TASK_STATUS_SUBMITTED) submitted++;
    if (String(t.comments || '').indexOf('"flag":"rejreq"') >= 0 &&
        [TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED].indexOf(String(t.status)) >= 0) rejreq++;
  });
  let registrations = 0;
  readTab_('USERS').forEach(function (u) { if (String(u.status) === 'pending') registrations++; });
  let reviewsPending = 0;
  try { reviewsPending = actionStaffReviewsPending_({}, ctx).pending.length; } catch (e) {}
  return { hunt_approvals: huntsPending, task_approvals: submitted, reject_requests: rejreq,
    registrations: registrations, staff_reviews: reviewsPending, week: r8WeekKey_(), as_of: now_() };
}

/* ---------- the idea box (R8-11, Hasib 25 Aug): ANY staff member can send a product idea ----
 * Hunters are not the only people who see products. The bar is open to everyone, every idea is
 * kept with its author, and Management/hunters can turn a good one into a real hunt. */
const R8_IDEA_HEADERS = ['idea_id', 'by_email', 'by_name', 'role', 'idea', 'link', 'why', 'status',
  'decided_by', 'decided_at', 'comment', 'created_at'];
const R8_IDEA_STATES = ['NEW', 'PICKED UP', 'HUNTED', 'NOT NOW'];

function r8IdeaSheet_() {
  const db = getPortalDb_(false);
  let sh = db.getSheetByName('PRODUCT_IDEAS');
  if (!sh) { sh = db.insertSheet('PRODUCT_IDEAS'); sh.appendRow(R8_IDEA_HEADERS); }
  return sh;
}

function r8IdeaRows_() {
  const values = r8IdeaSheet_().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    R8_IDEA_HEADERS.forEach(function (h, n) { row[h] = values[i][n]; });
    row._row = i + 1;
    out.push(row);
  }
  return out;
}

function actionIdeaSubmit_(payload, ctx) {
  const idea = String(payload.idea || '').trim().slice(0, 300);
  if (idea.length < 4) throw new Error('SAY: write the product idea');
  const link = String(payload.link || '').trim().slice(0, 500);
  if (link && !/^https?:\/\//i.test(link)) throw new Error('SAY: the link must start with http:// or https://');
  const why = String(payload.why || '').trim().slice(0, 500);
  const id = 'IDEA' + Utilities.getUuid().slice(0, 6).toUpperCase();
  r8IdeaSheet_().appendRow([id, normalizeEmail(ctx.ident.email), String(ctx.user.name || ctx.ident.email),
    String(ctx.user.role || ''), idea, link, why, 'NEW', '', '', '', now_()]);
  logActivity_(ctx.ident.email, 'R8_IDEA', id, '', idea.slice(0, 80), '');
  /* Hunters and Management both hear it — an idea nobody sees is an idea wasted. */
  const seen = {};
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const role = String(u.role || '');
    if (role !== 'Product Hunter' && MGMT_ROLES.indexOf(role) < 0 && role !== 'Team Lead') return;
    const e = normalizeEmail(u.email);
    if (seen[e]) return;
    seen[e] = true;
    notify_(u.email, 'New product idea',
      '💡 ' + String(ctx.user.name || ctx.ident.email) + ' (' + String(ctx.user.role || '') + ') suggests: ' +
      idea.slice(0, 160) + (why ? ' — ' + why.slice(0, 120) : '') + ' → open the Idea box.', 'idea:' + id);
  });
  return { idea_id: id, status: 'NEW' };
}

function actionIdeaList_(payload, ctx) {
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email) || ['Team Lead', 'Product Hunter'].indexOf(ctx.user.role) >= 0;
  const me = normalizeEmail(ctx.ident.email);
  const rows = r8IdeaRows_().filter(function (r) { return mgmt || normalizeEmail(r.by_email) === me; })
    .map(function (r) {
      return { idea_id: String(r.idea_id), by_name: String(r.by_name || ''), by_email: String(r.by_email || ''),
        role: String(r.role || ''), idea: String(r.idea || ''), link: String(r.link || ''), why: String(r.why || ''),
        status: String(r.status || 'NEW'), decided_by: String(r.decided_by || ''), decided_at: String(r.decided_at || ''),
        comment: String(r.comment || ''), created_at: String(r.created_at || '') };
    })
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  const counts = { NEW: 0, 'PICKED UP': 0, HUNTED: 0, 'NOT NOW': 0, mine: 0 };
  rows.forEach(function (r) {
    if (counts[r.status] !== undefined) counts[r.status]++;
    if (normalizeEmail(r.by_email) === me) counts.mine++;
  });
  const per = {};
  rows.forEach(function (r) {
    const k = r.by_name || r.by_email;
    per[k] = per[k] || { who: k, total: 0, hunted: 0 };
    per[k].total++;
    if (r.status === 'HUNTED') per[k].hunted++;
  });
  return { ideas: rows.slice(0, 200), counts: counts, can_decide: mgmt,
    leaderboard: Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 10),
    states: R8_IDEA_STATES, as_of: now_() };
}

function actionIdeaDecide_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email) && ['Team Lead', 'Product Hunter'].indexOf(ctx.user.role) < 0) {
    throw new Error('only hunters and management move ideas');
  }
  const status = String(payload.status || '').toUpperCase();
  if (R8_IDEA_STATES.indexOf(status) < 0) throw new Error('SAY: status must be one of ' + R8_IDEA_STATES.join(' · '));
  const comment = String(payload.comment || '').trim().slice(0, 300);
  const sh = r8IdeaSheet_();
  const rows = r8IdeaRows_();
  let hit = null;
  rows.forEach(function (r) { if (String(r.idea_id) === String(payload.idea_id)) hit = r; });
  if (!hit) throw new Error('SAY: that idea is not on the list');
  sh.getRange(hit._row, 8, 1, 4).setValues([[status, ctx.ident.email, now_(), comment]]);
  logActivity_(ctx.ident.email, 'R8_IDEA_DECIDE', String(hit.idea_id), String(hit.status || ''), status, comment.slice(0, 120));
  if (normalizeEmail(hit.by_email)) {
    notify_(hit.by_email, 'Your product idea',
      '💡 "' + String(hit.idea || '').slice(0, 80) + '" → ' + status +
      (comment ? ' — ' + comment.slice(0, 160) : '') + '. Thank you for sending it.', 'idea:' + hit.idea_id);
  }
  return { idea_id: String(hit.idea_id), status: status };
}

/* ---------- R8-10: the human follow-ups, as real tasks ----------
 * Hasib: "for all these things create tasks for Husnain or management". Each seed is keyed by a
 * marker in the title, so running this twice never duplicates a task. */
const R8_SEEDS = [
  { key: 'R8-SEED-1', role: 'CS', title: 'Connect Sir Hasib’s order-processing sheet',
    details: ['Sir Hasib now syncs from eBay (151 listings, 278 orders).',
      'What is missing: his order book is not connected, so his orders have no day-tab workspace.',
      'Do this: open the Portal DB → CONNECTIONS tab → the order_processing row with the empty spreadsheet_id.',
      'Paste his Orders sheet id there (or create the sheet first, in the same shape as the other accounts).',
      'Then tell Claude/Management so the Ali sweep can be verified against it.'] },
  { key: 'R8-SEED-5', role: 'CS', title: 'Connect Azhar Bhai’s order-processing sheet (orders have no workspace)',
    details: ['CONFIRMED 25 Aug by the day-tab diagnostic: Azhar Bhai’s CONNECTIONS row has an EMPTY spreadsheet_id — status literally reads "not connected yet".',
      'Effect: his orders appear in the portal Orders board, but there is NO day-tab workspace for them.',
      'So: processors cannot work his orders in the sheet, and the Ali sweep can never pick up links for that account.',
      'Every other account is fine — AZHAR ABRT, Saif Bhai, Amna Baji and HAFIZA BHAJI all read their 25 August tab cleanly.',
      'Do this: open the Portal DB → CONNECTIONS → the order_processing row for Azhar Bhai.',
      'Paste his Orders spreadsheet id (create the sheet in the same shape as the others if it does not exist yet).',
      'Processors can work his orders from the portal Orders board in the meantime — nothing is lost.'] },
  { key: 'R8-SEED-2', role: 'Management', title: 'Review the hunting rejection + revision reason lists',
    details: ['The reason chips hunters and reviewers see are now data, not code.',
      'Open Hunt approvals — the chips under the comment box are the live lists.',
      'Add anything missing with "Add a reason"; they appear for everyone immediately.',
      'Lists live in CONFIG: hunt_reject_reasons, hunt_revise_needs, lister_reject_reasons.'] },
  { key: 'R8-SEED-3', role: 'Management', title: 'Do this week’s staff behavior + working reviews',
    details: ['Open Staff reviews. Every approved person needs a behavior score and a working score, 1-5, plus a short note.',
      'The facts beside each name (tasks done in 7 days, overdue now) come from the portal — the scores are your judgement.',
      'A reminder goes out every Wednesday while any review is missing.'] },
  { key: 'R8-SEED-4', role: 'Management', title: 'Walk the new department + hunting dashboards with the team',
    details: ['New screens are live: Departments, Hunting dashboard, Listing desk, Go-live desk, 72-hour revisions, Management desk, Price revisions, Live listings split, Idea box.',
      'Two that need announcing to everyone: the Idea box (anyone can send a product idea) and the Hunting dashboard (Irfan sees his revisions there).',
      'Listers: the "Can’t list this" button now sends a rejection request to Management instead of stalling.'] },
];

function r8SeedTasks() {
  const all = readTab_('TASKS');
  const users = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; });
  const sh = tasksSheet_();
  const stamp = now_();
  let made = 0, skipped = 0;
  R8_SEEDS.forEach(function (s) {
    const exists = all.some(function (t) { return String(t.details || '').indexOf(s.key) >= 0; });
    if (exists) { skipped++; return; }
    let who = null;
    users.forEach(function (u) { if (!who && String(u.role || '') === s.role) who = { email: String(u.email), name: String(u.name || u.email) }; });
    if (!who) users.forEach(function (u) { if (!who && MGMT_ROLES.indexOf(String(u.role || '')) >= 0) who = { email: String(u.email), name: String(u.name || u.email) }; });
    if (!who) { skipped++; return; }
    const taskId = listingCreateTask_(sh, {
      type: 'general', account: '', item_id: '',
      title: s.title,
      details: listingLines_(s.details.concat(['', 'marker: ' + s.key])),
      assigned_by: 'system', assigned_to: who.email,
      priority: 'normal', deadline_pkt: taskPktIso_(new Date(Date.now() + 2 * 86400000)), stamp: stamp,
    });
    notify_(who.email, 'Task assigned', '📋 ' + s.title + ' — see the task for the steps.', 'task:' + taskId);
    made++;
  });
  return 'seeds: ' + made + ' created, ' + skipped + ' already there';
}

/* ---------- provenance backfill (one-shot, ENGINE_RUNNABLE) ---------- */
function r8ProvenanceBackfill() {
  let sent = 0, skipped = 0;
  const tasks = readTab_('TASKS');
  for (let i = 0; i < tasks.length && sent < 250; i++) {
    const t = tasks[i];
    if (String(t.type) !== 'listing_new') continue;
    const itemId = String(t.item_id || '').trim();
    if (!/^\d{9,15}$/.test(itemId)) { skipped++; continue; }
    let hunter = '', huntId = '';
    try {
      const h = listingHunterFor_(t);
      if (h) { hunter = String(h.email); huntId = String(h.hunt_id); }
      else { const p = listingParseDetails_(t.details); huntId = String((p && p.hunt_id) || ''); }
    } catch (e) {}
    try {
      enginePost_('provenanceSet', { item_id: itemId, account: String(t.account || ''),
        lister_email: String(t.assigned_to || ''), hunter_email: hunter, hunt_id: huntId,
        listed_at: taskPktIso_(t.submitted_at || t.decided_at || t.created_at) });
      sent++;
    } catch (e) { skipped++; }
  }
  return 'provenance backfill: ' + sent + ' sent, ' + skipped + ' skipped';
}

/* ---------- registry ---------- */
/* ---------- staff oversight dossier (Sales Operations, 26 Aug) ----------
   "give me access to each and every single mindset, each and every single alert, workflow, of
   each staff." One person, everything about them on one screen: their live workflow (tasks),
   every letter that reached them (alerts), their behaviour/working reviews (the mindset), and
   the hard facts (done in 7 days, overdue now). Read-only. Gated to the oversight tier — the
   Sales Operations role plus Management/Ops Head/Team Lead — never to peers. */
function r8IsOversight_(role, email) {
  return isMgmt_(role, email) || role === 'Team Lead' || role === 'Sales Operations';
}

function actionStaffDossier_(payload, ctx) {
  if (!r8IsOversight_(ctx.user.role, ctx.ident.email)) throw new Error('oversight only');
  const target = normalizeEmail(payload.email || '');
  if (!target) {
    /* no email → the roster to choose from */
    const roster = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; })
      .map(function (u) { return { email: normalizeEmail(u.email), name: String(u.name || u.email), role: String(u.role || '') }; })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return { roster: roster };
  }

  const user = readTab_('USERS').filter(function (u) { return normalizeEmail(u.email) === target; })[0] || null;
  const profile = user ? {
    email: target, name: String(user.name || target), role: String(user.role || ''),
    status: String(user.status || ''), shift: String(user.shift || ''),
    joined_at: taskPktIso_(user.joined_at), accounts: String(user.accounts_access || ''),
  } : { email: target, name: target, role: '', status: 'not found' };

  const nowMs = Date.now();
  const OPEN = [TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED, TASK_STATUS_SUBMITTED];
  const workflow = { open: [], recent_done: [], done_7d: 0, overdue_now: 0, avg_turnaround_min: 0 };
  let turnSum = 0, turnN = 0;
  const cut7 = nowMs - 7 * 86400000;
  readTab_('TASKS').forEach(function (t) {
    if (normalizeEmail(t.assigned_to) !== target) return;
    const status = String(t.status || '');
    const dept = R8_DEPT_OF_TYPE[String(t.type || 'general')] || 'General';
    if (status === TASK_STATUS_COMPLETED) {
      const dMs = taskMs_(t.decided_at);
      if (!isNaN(dMs) && dMs >= cut7) workflow.done_7d++;
      const mins = taskElapsedMin_(t.created_at, dMs);
      if (mins > 0) { turnSum += mins; turnN++; }
      if (!isNaN(dMs)) workflow.recent_done.push({ type: String(t.type || ''), dept: dept,
        title: String(t.title || '').slice(0, 80), decided_at: taskPktIso_(t.decided_at) });
      return;
    }
    if (OPEN.indexOf(status) < 0) return;
    const dl = taskMs_(t.deadline_pkt);
    const overdue = !isNaN(dl) && dl < nowMs && status !== TASK_STATUS_SUBMITTED;
    if (overdue) workflow.overdue_now++;
    workflow.open.push({ task_id: String(t.task_id || ''), type: String(t.type || ''), dept: dept,
      title: String(t.title || '').slice(0, 80), status: status, account: String(t.account || ''),
      deadline_pkt: taskPktIso_(t.deadline_pkt), overdue: overdue, created_at: taskPktIso_(t.created_at) });
  });
  workflow.open.sort(function (a, b) { return String(a.deadline_pkt).localeCompare(String(b.deadline_pkt)); });
  workflow.recent_done.sort(function (a, b) { return String(b.decided_at).localeCompare(String(a.decided_at)); });
  workflow.recent_done = workflow.recent_done.slice(0, 20);
  workflow.avg_turnaround_min = turnN ? Math.round(turnSum / turnN) : 0;

  const alerts = [];
  readTab_('NOTIFICATIONS').forEach(function (n) {
    if (normalizeEmail(n.to) !== target) return;
    alerts.push({ type: String(n.type || ''), message: String(n.message || '').slice(0, 200),
      from: String(n.from || ''), created_at: taskPktIso_(n.created_at), read: String(n.read_at || '') !== '' });
  });
  alerts.sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  const unread = alerts.filter(function (a) { return !a.read; }).length;

  const reviews = r8ReviewRows_().filter(function (r) { return normalizeEmail(r.email) === target; })
    .sort(function (a, b) { return String(b.week).localeCompare(String(a.week)); }).slice(0, 26)
    .map(function (r) { return { week: String(r.week), behavior: Number(r.behavior) || 0,
      working: Number(r.working) || 0, notes: String(r.notes || ''), rated_by: String(r.rated_by || '') }; });
  const lastReview = reviews[0] || null;

  return {
    profile: profile,
    workflow: workflow,
    alerts: { unread: unread, total: alerts.length, items: alerts.slice(0, 40) },
    reviews: { last: lastReview, history: reviews },
    as_of: now_(),
  };
}

const ACTIONS_R8 = {
  huntReasons:        [actionHuntReasons_, 'any'],
  huntReasonAdd:      [actionHuntReasonAdd_, 'any'],     // mgmt gated inside
  deptPending:        [actionDeptPending_, 'any'],
  huntDesk:           [actionHuntDesk_, 'any'],
  requestItemLink:    [actionRequestItemLink_, 'any'],   // order roles gated inside
  listDesk:           [actionListDesk_, 'any'],
  listerRejectRequest: [actionListerRejectRequest_, 'any'],
  mgmtRejectDecide:   [actionMgmtRejectDecide_, 'any'],  // mgmt gated inside
  decisionAct:        [actionDecisionAct_, 'any'],       // mgmt gated inside
  goLiveReturn:       [actionGoLiveReturn_, 'any'],      // TL/mgmt gated inside
  staffReviewsPending: [actionStaffReviewsPending_, 'any'],
  staffReviewSave:    [actionStaffReviewSave_, 'any'],
  staffReviewHistory: [actionStaffReviewHistory_, 'any'],
  staffDossier:       [actionStaffDossier_, 'any'],
  mgmtPendingAS:      [actionMgmtPendingAS_, 'any'],
  ideaSubmit:         [actionIdeaSubmit_, 'any'],        // EVERY approved user may send an idea
  ideaList:           [actionIdeaList_, 'any'],
  ideaDecide:         [actionIdeaDecide_, 'any'],        // hunters/mgmt gated inside
};
