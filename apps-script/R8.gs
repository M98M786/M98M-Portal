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
  logActivity_(ctx.ident.email, 'R8_REASON_ADD', kind, '', reason, '');
  return { ok: true, list: list };
}

/* ---------- department pending boards (R8-1) ---------- */
const R8_DEPT_OF_TYPE = {
  listing_new: 'Listing', listing_revision: 'Listing', campaign_set: 'Advertising',
  cpc_research: 'Advertising', potential_cpc_review: 'Advertising',
  supplier_add: 'Orders', sourcing_link: 'Hunting', hunt_revision: 'Hunting',
  end_listing: 'Listing', query: 'CS', general: 'General',
};

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
    history: history.slice(0, 40), as_of: now_() };
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
  readTab_('TASKS').forEach(function (t) {
    const type = String(t.type || '');
    if (type !== 'listing_new' && type !== 'listing_revision') return;
    const assignee = normalizeEmail(t.assigned_to);
    if (!mgmt && assignee !== me) return;
    const status = String(t.status || '');
    const family = type === 'listing_new' ? r8Family_(t.details) : 'Revision';
    if (status === TASK_STATUS_COMPLETED) {
      if (type === 'listing_new' && taskPktIso_(t.decided_at).slice(0, 7) === monthKey && fam[family]) fam[family].listed_month++;
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
  return { mgmt: mgmt, per_assignee: Object.keys(perAssignee).map(function (k) { return perAssignee[k]; }).sort(function (a, b) { return b.open - a.open; }),
    per_account: perAccount, families: fam, rows: rows.slice(0, 300), as_of: now_() };
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
  staffReviewsPending: [actionStaffReviewsPending_, 'any'],
  staffReviewSave:    [actionStaffReviewSave_, 'any'],
  staffReviewHistory: [actionStaffReviewHistory_, 'any'],
  mgmtPendingAS:      [actionMgmtPendingAS_, 'any'],
};
