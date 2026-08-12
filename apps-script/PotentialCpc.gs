/** §9 POTENTIAL CPC LISTINGS — the Advertising Manager nominates items already live on an
 * account, Management approves. Submitted → Approved | Rejected (+mandatory comment → Zain).
 * On approve the [OPEN-5] DEFAULT routing fires: a cpc_research task (§8.3) for a chosen Item
 * Lister; once that task is APPROVED (§8.0b — approval is the only path to Completed) Zain
 * switches the campaign to CPC, which lands in CAMPAIGN_LOG with cross-notifications both
 * ways (§14). Nothing reaches the live Potential CPC workbook before Management approves. */

const POTCPC_STATUS_SUBMITTED = 'Submitted';
const POTCPC_STATUS_APPROVED = 'Approved';
const POTCPC_STATUS_REJECTED = 'Rejected';
const POTCPC_STATUSES = [POTCPC_STATUS_SUBMITTED, POTCPC_STATUS_APPROVED, POTCPC_STATUS_REJECTED];

// RL-6 column ownership — the only POTENTIAL_CPC columns written after a row is created.
const POTCPC_WRITABLE_COLS = ['status', 'reviewed_by'];
const POTCPC_REF = 'potcpc:';
const POTCPC_QUEUE_LIMIT = 50;
const POTCPC_QUEUE_MAX = 200;
// The Main Sheet grid is padded far past its data (1151 rows on the live ABRT workbook).
const POTCPC_CENTRAL_SCAN = 2000;

/** The ten verbatim headers of the live Potential CPC workbook. REALITY: only the 'Sir Hasib '
 * tab carries all ten — Hafiza Safdia, ABRT, Saif Bhai, Amna Baji and Azhar Bhai stop at
 * 'Comments '. The mirror writes what a tab has and reports the rest as skippedMissing; a
 * column is never added, renamed or reordered (Sheet Contract). */
const POTCPC_SHEET_COLS = [
  'Listing Item id ', 'Item Link ', 'Date Listing Started ', 'Reason for Selection', 'Comments ',
  'Our price', 'Avg Sold Price ', 'Last 30 days sold and avg price graph Link  ',
  'Last 90 days sold and avg price graph Link  ', 'Main Competitor',
];
const POTCPC_FIELD_TO_HEADER = {
  listing_item_id: 'Listing Item id ',
  item_link: 'Item Link ',
  date_listing_started: 'Date Listing Started ',
  reason_for_selection: 'Reason for Selection',
  comments: 'Comments ',
  our_price: 'Our price',
  avg_sold_price: 'Avg Sold Price ',
  last30_link: 'Last 30 days sold and avg price graph Link  ',
  last90_link: 'Last 90 days sold and avg price graph Link  ',
  main_competitor: 'Main Competitor',
};

/** 'Reason for Selection' data validation (D2:D258 on every tab), spelled as the sheet spells
 * it — trailing spaces and 'Previosuly' included. The fifth option exists ONLY on 'Sir Hasib '. */
const POTCPC_REASONS = [
  'Sold More than 25 units ',
  'Potential Listing with good images',
  'Previosuly good Sales History',
  'New Listings But Not Working ',
];
const POTCPC_REASON_HASIB_ONLY = 'Better SEO Can Increase Sales ';
const POTCPC_HASIB_ACCOUNT = 'Sir Hasib ';

/** Registry account names and workbook tab names disagree ('Hafiza Sadia'/'HAFIZA BHAJI' against
 * the tab 'Hafiza Safdia', 'AZHAR ABRT' against 'ABRT'), and containment matching alone cannot
 * bridge a misspelling — these are the tab names as the workbook spells them. */
const POTCPC_TAB_ALIASES = {
  'sir hasib': ['Sir Hasib '],
  'hafiza sadia': ['Hafiza Safdia'],
  'hafiza safdia': ['Hafiza Safdia'],
  'hafiza bhaji': ['Hafiza Safdia'],
  'hafiza baji': ['Hafiza Safdia'],
  'azhar abrt': ['ABRT'],
  'abrt': ['ABRT'],
  'azhar bhai': ['Azhar Bhai '],
  'saif bhai': ['Saif Bhai'],
  'amna baji': ['Amna Baji '],
};

const POTCPC_MAIN_SHEET_TAB = ['Main Sheet'];
// Headers as the live Central workbook spells them ('Aliexpress Cost', 'Profit ' with its
// trailing space) — matching is by header name, never by column letter.
const POTCPC_MAIN_SHEET_COLS = ['eBay Item No', 'Listing Title', 'Sold For', 'Order Earning',
  'Aliexpress Cost', 'Profit ', 'Campaign Selection', 'Current Campaign Selection', 'eBay Category (FVF %)'];
/** REALITY: the Main Sheet campaign dropdown (H2:I152) is exactly 'Campaign CPC, General
 * Dynamic, Organic' — the spec's wider campaign list is not on this sheet, so CPC is written as
 * 'Campaign CPC'. 'Current Campaign Selection' mirrors what eBay actually runs and is written by
 * the existing sync, never by the portal. */
const POTCPC_CAMPAIGN_CPC = 'Campaign CPC';
const POTCPC_CAMPAIGN_COL = 'Campaign Selection';

// ---------- submit (§9, Advertising) ----------
function actionSubmitPotentialCpc_(payload, ctx) {
  if (!potcpcMaySubmit_(ctx)) throw new Error('only the Advertising Manager nominates Potential-CPC listings');

  const account = potcpcAccount_(payload.account);
  const itemId = potcpcItemId_(payload.listing_item_id);
  const reason = potcpcReason_(payload.reason_for_selection, account);
  const rec = {
    row_id: 'P' + Utilities.getUuid().slice(0, 8),
    account: account,
    status: POTCPC_STATUS_SUBMITTED,
    submitted_by: ctx.ident.email,
    reviewed_by: '',
    ts: now_(),
    listing_item_id: itemId,
    item_link: potcpcItemLink_(payload.item_link, itemId),
    date_listing_started: potcpcDate_(payload.date_listing_started),
    reason_for_selection: reason,
    comments: String(payload.comments || '').trim().slice(0, 2000),
    our_price: potcpcPrice_(payload.our_price, 'our_price'),
    avg_sold_price: potcpcPrice_(payload.avg_sold_price, 'avg_sold_price'),
    last30_link: potcpcLink_(payload.last30_link, false),
    last90_link: potcpcLink_(payload.last90_link, false),
    main_competitor: potcpcCompetitors_(payload.main_competitor),
  };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    readTab_('POTENTIAL_CPC').forEach(function (r) {
      if (potcpcDigits_(r.listing_item_id) !== itemId) return;
      if (potcpcNorm_(r.account) !== potcpcNorm_(account)) return;
      const st = String(r.status || '');
      if (st === POTCPC_STATUS_SUBMITTED || st === POTCPC_STATUS_APPROVED) throw new Error('this item is already nominated on ' + account);
    });
    potcpcAppend_(potcpcSheet_(), rec);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'SUBMIT_POTENTIAL_CPC', rec.row_id, '', POTCPC_STATUS_SUBMITTED,
    account + ' · item ' + itemId + ' · ' + reason.trim());
  notifyManagement_('Potential-CPC submitted',
    ctx.user.name + ' nominated item ' + itemId + ' on ' + account + ' for CPC — ' + reason.trim(),
    POTCPC_REF + rec.row_id);
  return { row_id: rec.row_id, status: rec.status, account: account, listing_item_id: itemId };
}

// ---------- management review queue (§9) ----------
function actionPotentialCpcQueue_(payload, ctx) {
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email);
  // §4.3: Management (and Ops Head, §4.4) decide; Team Lead views only.
  if (!mgmt && ctx.user.role !== 'Team Lead') throw new Error('management only');

  let want = String(payload.status || POTCPC_STATUS_SUBMITTED).trim();
  if (want === 'ALL') want = '';
  if (want && POTCPC_STATUSES.indexOf(want) < 0) throw new Error('unknown status filter');
  const accountFilter = String(payload.account || '').trim();
  let limit = Number(payload.limit) || POTCPC_QUEUE_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > POTCPC_QUEUE_MAX) limit = POTCPC_QUEUE_MAX;

  const rows = [];
  readTab_('POTENTIAL_CPC').forEach(function (r) {
    if (want && String(r.status || '') !== want) return;
    if (accountFilter && potcpcNorm_(r.account) !== potcpcNorm_(accountFilter)) return;
    rows.push(r);
  });
  rows.sort(function (a, b) {
    const x = taskMs_(a.ts), y = taskMs_(b.ts);
    return (isNaN(x) ? Infinity : x) - (isNaN(y) ? Infinity : y);
  });

  const research = potcpcResearchTasks_();
  const switched = potcpcSwitchedItems_();
  const central = {};
  const nowMs = taskMs_(now_());
  const out = [];
  for (let i = 0; i < rows.length && out.length < limit; i++) {
    const rec = potcpcRecord_(rows[i]);
    const key = potcpcKey_(rec.account, rec.listing_item_id);
    const waited = taskMs_(rec.ts);
    rec.waiting_min = isNaN(waited) ? '' : Math.max(0, Math.round((nowMs - waited) / 60000));
    rec.research_task = research[key] || null;
    rec.campaign_switched_at = switched[key] || '';
    // stripForRole_ scrubs top-level keys only, so the live profit context is a FLAT record and
    // is stripped in its own right (RL-4); it is attached for Management alone.
    if (mgmt) rec.central = stripForRole_(potcpcCentralContext_(rec.account, rec.listing_item_id, central), ctx.user.role, ctx.ident.email);
    out.push(rec);
  }

  return {
    queue: stripForRole_(out, ctx.user.role, ctx.ident.email),
    count: out.length, statuses: POTCPC_STATUSES, may_decide: mgmt,
  };
}

// ---------- decide (§9, Management) ----------
function actionDecidePotentialCpc_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('management only');
  const decision = String(payload.decision || '').trim().toLowerCase();
  if (decision !== 'approve' && decision !== 'reject') throw new Error('decision must be approve or reject');
  const comment = String(payload.comment || '').trim();
  if (decision === 'reject' && !comment) throw new Error('a comment is mandatory when rejecting');

  let lister = null, deadline = '';
  if (decision === 'approve') {
    lister = potcpcLister_(payload.lister_email);
    deadline = taskPktIso_(payload.deadline_pkt);
    if (!deadline) throw new Error('deadline_pkt required for the cpc_research task');
  }

  const sh = potcpcSheet_();
  let rec = null, stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = potcpcFind_(sh, payload.row_id);
    rec = potcpcRecord_(found.rec);
    if (String(rec.status) !== POTCPC_STATUS_SUBMITTED) throw new Error('this nomination is not awaiting a decision');
    stamp = now_();
    potcpcWrite_(sh, found, {
      status: decision === 'approve' ? POTCPC_STATUS_APPROVED : POTCPC_STATUS_REJECTED,
      reviewed_by: ctx.ident.email,
    });
  } finally { lock.releaseLock(); }
  // The script lock is released before actionCreateTask_ runs — it takes the same lock itself.

  if (decision === 'reject') {
    logActivity_(ctx.ident.email, 'REJECT_POTENTIAL_CPC', rec.row_id, POTCPC_STATUS_SUBMITTED, POTCPC_STATUS_REJECTED, comment.slice(0, 200));
    notify_(rec.submitted_by, 'Potential-CPC rejected',
      'Item ' + rec.listing_item_id + ' on ' + rec.account + ' was not approved for CPC: ' + comment.slice(0, 500),
      POTCPC_REF + rec.row_id);
    return { row_id: rec.row_id, status: POTCPC_STATUS_REJECTED, decided_at: stamp };
  }

  logActivity_(ctx.ident.email, 'APPROVE_POTENTIAL_CPC', rec.row_id, POTCPC_STATUS_SUBMITTED, POTCPC_STATUS_APPROVED,
    'cpc_research → ' + lister.email + (comment ? ' · ' + comment.slice(0, 160) : ''));

  /** [OPEN-5] DEFAULT routing: approval auto-creates the cpc_research task. actionCreateTask_
   * stamps the approving manager as assigned_by, so Management is the task's approver — §8.0b
   * allows "Zain or Management" for the keyword/working approval, and Zain is notified below. */
  let task = null, taskError = '';
  try {
    task = actionCreateTask_({
      type: 'cpc_research',
      account: rec.account,
      item_id: rec.listing_item_id,
      title: 'CPC research — item ' + rec.listing_item_id + ' (' + rec.account + ')',
      details: potcpcResearchBrief_(rec, comment),
      priority: String(payload.priority || '').trim(),
      deadline_pkt: deadline,
      assigned_to: lister.email,
    }, ctx);
  } catch (e) {
    taskError = 'the cpc_research task was not created';
    logActivity_(ctx.ident.email, 'POTENTIAL_CPC_TASK_FAILED', rec.row_id, '', '', String((e && e.message) || e));
    notifyManagement_('Potential-CPC needs its research task',
      'Item ' + rec.listing_item_id + ' on ' + rec.account + ' is approved but its cpc_research task was not created.',
      POTCPC_REF + rec.row_id);
  }

  const mirror = potcpcMirror_(rec, ctx.ident.email);

  notify_(rec.submitted_by, 'Potential-CPC approved',
    'Item ' + rec.listing_item_id + ' on ' + rec.account + ' is approved for CPC. '
      + (task ? 'Research assigned to ' + lister.name + ' — switch the campaign once it is approved.' : 'Assign the research task manually.')
      + (comment ? ' — ' + comment.slice(0, 300) : ''),
    POTCPC_REF + rec.row_id);

  return {
    row_id: rec.row_id, status: POTCPC_STATUS_APPROVED, decided_at: stamp,
    task: task, task_error: taskError, mirror: mirror,
  };
}

// ---------- the CPC switch (§9 → CAMPAIGN_LOG, §14) ----------
function actionSwitchPotentialCpcCampaign_(payload, ctx) {
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email);
  const role = String(ctx.user.role || '');
  // §4.3 "Change campaign type": Management, Team Lead and the Advertising Manager.
  if (!mgmt && role !== 'Advertising Manager' && role !== 'Team Lead') throw new Error('not allowed to change a campaign');

  const found = potcpcFind_(potcpcSheet_(), payload.row_id);
  const rec = potcpcRecord_(found.rec);
  if (String(rec.status) !== POTCPC_STATUS_APPROVED) throw new Error('this nomination is not approved');

  const key = potcpcKey_(rec.account, rec.listing_item_id);
  const task = potcpcResearchTasks_()[key];
  // §8.0b: only an approval reaches Completed, so this is the "research approved" gate.
  if (!task || task.status !== TASK_STATUS_COMPLETED) throw new Error('the cpc_research task is not approved yet');
  if (potcpcSwitchedItems_()[key]) return { row_id: rec.row_id, already_switched: true, campaign: POTCPC_CAMPAIGN_CPC };

  const before = potcpcCentralContext_(rec.account, rec.listing_item_id, {});
  if (!before.ok) return { row_id: rec.row_id, switched: false, sheet: before };
  const old = String(before[POTCPC_CAMPAIGN_COL] || '');

  let write = { ok: false, reason: 'not connected yet' };
  if (typeof bridgeUpdateRow_ === 'function') {
    const values = {};
    values[POTCPC_CAMPAIGN_COL] = POTCPC_CAMPAIGN_CPC;
    // '↳' variation sub-rows repeat the parent's eBay Item No, so the main row found above is
    // targeted explicitly — an unqualified match would be ambiguous and refuse to write.
    write = bridgeUpdateRow_(
      { scope: 'account', account: rec.account, kind: 'central', tab: POTCPC_MAIN_SHEET_TAB, expect: POTCPC_MAIN_SHEET_COLS, row: before.row },
      'eBay Item No', rec.listing_item_id, values, [POTCPC_CAMPAIGN_COL], ctx.ident.email);
  }
  if (!write || !write.ok) {
    logActivity_(ctx.ident.email, 'CAMPAIGN_SWITCH_FAILED', rec.account + '!' + rec.listing_item_id, old, POTCPC_CAMPAIGN_CPC,
      String((write && write.reason) || 'not connected yet'));
    return { row_id: rec.row_id, switched: false, sheet: write };
  }

  const advertising = potcpcAdvertisingEmails_(ctx.ident.email, rec.submitted_by);
  const notified = advertising.slice();
  if (!mgmt) notified.push('Management');
  const stamp = now_();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (potcpcSwitchedItems_()[key]) return { row_id: rec.row_id, already_switched: true, campaign: POTCPC_CAMPAIGN_CPC };
    getPortalDb_(false).getSheetByName('CAMPAIGN_LOG').appendRow([
      stamp, rec.account, rec.listing_item_id, old, POTCPC_CAMPAIGN_CPC, ctx.ident.email, notified.join(', '),
    ]);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'CAMPAIGN_SWITCH', rec.account + '!' + rec.listing_item_id, old, POTCPC_CAMPAIGN_CPC,
    'potential-cpc ' + rec.row_id + (write.shadow ? ' · pilot gate: live sheet not written' : ''));

  const msg = '🟠 Campaign switched by ' + ctx.user.name + ' · ' + rec.account + ' · ' + rec.listing_item_id
    + ' — ' + (old || 'no campaign') + ' → ' + POTCPC_CAMPAIGN_CPC
    + '. This was the approved Potential-CPC promotion; CPC fees now apply on every sale.'
    + (write.shadow ? ' (Recorded in the portal — the live sheet write is held by the pilot gate.)' : '');
  // §14 cross-notification, both directions: changed by Zain → Management, by Management → Zain.
  advertising.forEach(function (e) { notify_(e, 'Campaign changed', msg, POTCPC_REF + rec.row_id); });
  if (!mgmt) notifyManagement_('Campaign changed', msg, POTCPC_REF + rec.row_id);

  return {
    row_id: rec.row_id, switched: true, campaign: POTCPC_CAMPAIGN_CPC, previous_campaign: old,
    shadow: !!write.shadow, sheet: write, notified_to: notified,
  };
}

// ---------- the nominator's own list (§15 Advertising: status of each nomination) ----------
function actionMyPotentialCpc_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  let want = String(payload.status || '').trim();
  if (want === 'ALL') want = '';
  if (want && POTCPC_STATUSES.indexOf(want) < 0) throw new Error('unknown status filter');
  const accountFilter = String(payload.account || '').trim();

  const research = potcpcResearchTasks_();
  const switched = potcpcSwitchedItems_();
  const notes = potcpcDecisionNotes_(me);

  const out = [];
  readTab_('POTENTIAL_CPC').forEach(function (r) {
    if (normalizeEmail(r.submitted_by) !== me) return;
    if (want && String(r.status || '') !== want) return;
    if (accountFilter && potcpcNorm_(r.account) !== potcpcNorm_(accountFilter)) return;
    const rec = potcpcRecord_(r);
    const key = potcpcKey_(rec.account, rec.listing_item_id);
    rec.research_task = research[key] || null;
    rec.campaign_switched_at = switched[key] || '';
    rec.may_switch = !!(String(rec.status) === POTCPC_STATUS_APPROVED && !switched[key]
      && research[key] && research[key].status === TASK_STATUS_COMPLETED);
    rec.last_decision_note = notes[rec.row_id] || '';
    out.push(rec);
  });
  out.sort(function (a, b) {
    const x = taskMs_(a.ts), y = taskMs_(b.ts);
    return (isNaN(y) ? 0 : y) - (isNaN(x) ? 0 : x);
  });

  return {
    nominations: stripForRole_(out, ctx.user.role, ctx.ident.email),
    count: out.length, statuses: POTCPC_STATUSES,
    reasons: potcpcReasonsFor_(accountFilter), accounts: potcpcAccounts_(),
  };
}

// ---------- portal DB access ----------
function potcpcSheet_() {
  const sh = getPortalDb_(false).getSheetByName('POTENTIAL_CPC');
  if (!sh) throw new Error('POTENTIAL_CPC tab missing — run setupDatabase()');
  return sh;
}

/** Values are placed by HEADER NAME, so a column order change in the Portal DB cannot silently
 * shift a nomination's fields into the wrong columns. */
function potcpcAppend_(sh, rec) {
  const width = Math.max(1, sh.getLastColumn());
  const head = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h); });
  sh.appendRow(head.map(function (h) {
    return Object.prototype.hasOwnProperty.call(rec, h) ? rec[h] : '';
  }));
}

function potcpcFind_(sh, rowId) {
  const id = String(rowId || '').trim();
  if (!id) throw new Error('row_id required');
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(function (h) { return String(h); });
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== id) continue;
    const rec = {};
    head.forEach(function (h, c) { rec[h] = vals[i][c]; });
    return { row: i + 1, head: head, rec: rec };
  }
  throw new Error('nomination not found');
}

/** RL-6: a write to any column outside POTCPC_WRITABLE_COLS throws. The ten business columns are
 * written once at submission and never edited afterwards — the sheet keeps what Zain nominated. */
function potcpcWrite_(sh, found, patch) {
  Object.keys(patch).forEach(function (k) {
    if (POTCPC_WRITABLE_COLS.indexOf(k) < 0) throw new Error('write outside the POTENTIAL_CPC whitelist: ' + k);
    const c = found.head.indexOf(k);
    if (c < 0) throw new Error('unknown POTENTIAL_CPC column: ' + k);
    sh.getRange(found.row, c + 1).setValue(patch[k]);
  });
}

function potcpcRecord_(r) {
  const rec = {};
  DB_TABS.POTENTIAL_CPC.forEach(function (c) {
    const v = r[c];
    if (v instanceof Date) rec[c] = c === 'ts' ? taskPktIso_(v) : potcpcDate_(v);
    else rec[c] = v === null || v === undefined ? '' : v;
  });
  return rec;
}

// ---------- derived pipeline state ----------
function potcpcKey_(account, itemId) { return potcpcNorm_(account) + '|' + potcpcDigits_(itemId); }

function potcpcResearchTasks_() {
  const map = {}, when = {};
  readTab_('TASKS').forEach(function (t) {
    if (String(t.type || '') !== 'cpc_research') return;
    const key = potcpcKey_(t.account, t.item_id);
    const ms = taskMs_(t.created_at);
    if (map[key] !== undefined && !(ms >= when[key])) return;
    map[key] = {
      task_id: String(t.task_id || ''), status: String(t.status || ''),
      assigned_to: String(t.assigned_to || ''), deadline_pkt: taskPktIso_(t.deadline_pkt),
    };
    when[key] = ms;
  });
  return map;
}

function potcpcSwitchedItems_() {
  const map = {};
  readTab_('CAMPAIGN_LOG').forEach(function (c) {
    if (potcpcNorm_(c['new']) !== potcpcNorm_(POTCPC_CAMPAIGN_CPC)) return;
    map[potcpcKey_(c.account, c.item_id)] = String(c.ts || '');
  });
  return map;
}

/** The rejection/approval comment reaches Zain as a notification (§14); reading it back from
 * NOTIFICATIONS keeps the decision trail off the ten business columns, which mirror to the
 * live workbook exactly as he nominated them. */
function potcpcDecisionNotes_(email) {
  const me = normalizeEmail(email), map = {}, when = {};
  readTab_('NOTIFICATIONS').forEach(function (n) {
    const ref = String(n.ref || '');
    if (ref.indexOf(POTCPC_REF) !== 0) return;
    if (normalizeEmail(n.to) !== me) return;
    const id = ref.slice(POTCPC_REF.length);
    const ms = taskMs_(n.created_at);
    if (map[id] !== undefined && !(ms >= when[id])) return;
    map[id] = String(n.message || '');
    when[id] = ms;
  });
  return map;
}

// ---------- live profit context (Central Main Sheet, §8.7) ----------
/** Management-only decision context. Flat by design: stripForRole_ scrubs top-level keys, so a
 * nested shape would carry profit fields past RL-4. */
function potcpcCentralContext_(account, itemId, cache) {
  const key = potcpcNorm_(account);
  if (cache[key] === undefined) {
    cache[key] = typeof bridgeReadRows_ === 'function'
      ? bridgeReadRows_({ scope: 'account', account: account, kind: 'central', tab: POTCPC_MAIN_SHEET_TAB, expect: POTCPC_MAIN_SHEET_COLS, limit: POTCPC_CENTRAL_SCAN })
      : { ok: false, reason: 'not connected yet' };
  }
  const read = cache[key];
  if (!read || !read.ok) return { ok: false, reason: (read && read.reason) || 'not connected yet' };

  const want = potcpcDigits_(itemId);
  let hit = null;
  read.rows.forEach(function (r) {
    if (hit) return;
    if (potcpcDigits_(potcpcCell_(r, 'eBay Item No')) !== want) return;
    // '↳' rows are the highest-priced variation of the row above and repeat its item number;
    // the listing's own figures live on the main row.
    if (String(potcpcCell_(r, 'Listing Title')).charAt(0) === '↳') return;
    hit = r;
  });
  if (!hit) return { ok: false, reason: 'item not on the Main Sheet' };

  const campaign = String(potcpcCell_(hit, POTCPC_CAMPAIGN_COL) || '');
  const soldFor = potcpcCell_(hit, 'Sold For');
  const orderEarning = potcpcCell_(hit, 'Order Earning');
  const out = {
    ok: true,
    row: hit._row,
    'Listing Title': potcpcCell_(hit, 'Listing Title'),
    'Sold For': soldFor,
    'Order Earning': orderEarning,
    'AliExpress Cost': potcpcCell_(hit, 'Aliexpress Cost'),
    // Main Sheet Profit is =ROUND(0.8*(OrderEarning − AliexpressCost),2) — that 0.8 haircut lives
    // in the cell, not in ⚙ Config, so the sheet's own figure is reported and never recomputed.
    'Profit': potcpcCell_(hit, 'Profit '),
    'Campaign Selection': campaign,
    'Current Campaign Selection': potcpcCell_(hit, 'Current Campaign Selection'),
    already_cpc: potcpcNorm_(campaign) === potcpcNorm_(POTCPC_CAMPAIGN_CPC),
  };

  if (String(orderEarning) === '' && String(soldFor) !== ''
    && typeof brainOrderEarning_ === 'function' && typeof brainFvfFor_ === 'function') {
    try {
      const fvf = brainFvfFor_(account, potcpcCell_(hit, 'eBay Category (FVF %)'));
      out.order_earning = brainOrderEarning_(soldFor, fvf.fvf, { account: account }).orderEarning;
      out.order_earning_source = 'projected by the fee brain — the Main Sheet cell is empty';
    } catch (e) { /* a projection is a convenience; the sheet's own blank stands */ }
  }
  return out;
}

function potcpcCell_(rec, header) {
  if (Object.prototype.hasOwnProperty.call(rec, header)) return rec[header];
  const want = potcpcNorm_(header);
  const keys = Object.keys(rec);
  for (let i = 0; i < keys.length; i++) if (potcpcNorm_(keys[i]) === want) return rec[keys[i]];
  return '';
}

// ---------- the mirror to the live workbook ----------
/** §9 "writes mirror to the existing Potential CPC sheet per account" — on approval only, into
 * the columns that account's tab actually carries. bridgeAppendRow_ reports the rest as
 * skippedMissing; nothing is ever added to the tab. */
function potcpcMirror_(rec, actor) {
  if (typeof bridgeAppendRow_ !== 'function') return { ok: false, reason: 'not connected yet' };
  const values = {};
  Object.keys(POTCPC_FIELD_TO_HEADER).forEach(function (f) {
    const v = rec[f];
    if (v === '' || v === null || v === undefined) return;
    values[POTCPC_FIELD_TO_HEADER[f]] = v;
  });
  try {
    return bridgeAppendRow_(
      { scope: 'global', kind: 'potential_cpc', tab: potcpcTabCandidates_(rec.account), expect: POTCPC_SHEET_COLS },
      values, POTCPC_SHEET_COLS, actor);
  } catch (e) {
    logActivity_(actor, 'POTENTIAL_CPC_MIRROR_FAILED', rec.row_id, '', '', String((e && e.message) || e));
    return { ok: false, reason: 'mirror failed' };
  }
}

function potcpcTabCandidates_(account) {
  const raw = String(account || '').trim();
  const out = raw ? [raw] : [];
  (POTCPC_TAB_ALIASES[potcpcNorm_(raw)] || []).forEach(function (a) { if (out.indexOf(a) < 0) out.push(a); });
  return out;
}

// ---------- people ----------
function potcpcMaySubmit_(ctx) {
  return String(ctx.user.role || '') === 'Advertising Manager' || isMgmt_(ctx.user.role, ctx.ident.email);
}

/** §8.0: Hamza (Listing Manager) dispatches listing work to Umar (Item Lister), so either role
 * may carry the research task; anyone else is refused. */
function potcpcLister_(email) {
  const want = normalizeEmail(email || '');
  if (!want) throw new Error('lister_email required to approve');
  let hit = null;
  readTab_('USERS').forEach(function (u) {
    if (hit) return;
    if (normalizeEmail(u.email) !== want) return;
    if (String(u.status) !== 'approved') return;
    const role = String(u.role || '');
    if (role !== 'Item Lister' && role !== 'Listing Manager') return;
    hit = { email: String(u.email), name: String(u.name || u.email), role: role };
  });
  if (!hit) throw new Error('choose an approved Item Lister');
  return hit;
}

function potcpcAdvertisingEmails_(actorEmail, submittedBy) {
  const skip = normalizeEmail(actorEmail || '');
  const seen = {}, out = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.role || '') !== 'Advertising Manager') return;
    if (String(u.status) !== 'approved') return;
    const n = normalizeEmail(u.email);
    if (!n || n === skip || seen[n]) return;
    seen[n] = true;
    out.push(String(u.email));
  });
  const nom = normalizeEmail(submittedBy || '');
  if (nom && nom !== skip && !seen[nom]) out.push(String(submittedBy));
  return out;
}

/** §3: accounts are data rows in CONNECTIONS, never hardcoded. The registry's own spelling is
 * returned so tab and sheet resolution downstream sees the name the business uses. */
function potcpcAccounts_() {
  const seen = {}, out = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.scope || '').trim() !== 'account') return;
    const name = String(c.account_name || '').trim();
    const n = potcpcNorm_(name);
    if (!n || seen[n]) return;
    seen[n] = true;
    out.push(name);
  });
  return out;
}

function potcpcAccount_(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 120) throw new Error('account required');
  const known = potcpcAccounts_();
  if (!known.length) return raw;                       // §6: a portal without a registry yet still works
  const want = potcpcNorm_(raw);
  for (let i = 0; i < known.length; i++) if (potcpcNorm_(known[i]) === want) return known[i];
  throw new Error('unknown account');
}

// ---------- field validation ----------
function potcpcReasonsFor_(account) {
  const list = POTCPC_REASONS.slice();
  if (potcpcNorm_(account) === potcpcNorm_(POTCPC_HASIB_ACCOUNT)) list.push(POTCPC_REASON_HASIB_ONLY);
  return list;
}

function potcpcReason_(value, account) {
  const want = potcpcNorm_(value);
  if (!want) throw new Error('reason_for_selection required');
  for (let i = 0; i < POTCPC_REASONS.length; i++) {
    if (potcpcNorm_(POTCPC_REASONS[i]) === want) return POTCPC_REASONS[i];
  }
  if (potcpcNorm_(POTCPC_REASON_HASIB_ONLY) === want) {
    // The fifth dropdown option is on the 'Sir Hasib ' tab only; on any other tab it would be a
    // value that tab's own validation does not offer.
    if (potcpcNorm_(account) !== potcpcNorm_(POTCPC_HASIB_ACCOUNT)) throw new Error('that reason exists only on the Sir Hasib tab');
    return POTCPC_REASON_HASIB_ONLY;
  }
  throw new Error('unknown reason_for_selection');
}

function potcpcItemId_(value) {
  const s = potcpcDigits_(value);
  if (!/^\d{9,15}$/.test(s)) throw new Error('invalid listing_item_id');
  return s;
}

/** Item numbers sit in these sheets as text in some rows and as floats in others. */
function potcpcDigits_(value) {
  if (typeof value === 'number') return isFinite(value) ? String(Math.round(value)) : '';
  return String(value === null || value === undefined ? '' : value).trim().replace(/\s/g, '').replace(/\.0+$/, '');
}

function potcpcItemLink_(value, itemId) {
  const raw = String(value || '').trim();
  if (!raw) return 'https://www.ebay.co.uk/itm/' + itemId;    // the tab's own Item Link pattern
  return potcpcLink_(raw, false);
}

/** RL-3: only http/https ever leaves here as a link. 'Main Competitor' additionally holds free
 * text on a live row ('we are the main seller'), so plain prose is allowed there and nowhere else. */
function potcpcLink_(value, allowText) {
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 2000);
  if (allowText && raw.indexOf('://') < 0) return raw.slice(0, 500);
  throw new Error('links must be http or https');
}

/** The live tab spills a second competitor link into the UNHEADERED column K; the portal will not
 * write an unheadered column, so extra links are newline-joined inside 'Main Competitor' itself. */
function potcpcCompetitors_(value) {
  const list = Array.isArray(value)
    ? value
    : String(value === null || value === undefined ? '' : value).split(/[\r\n]+/);
  const out = [];
  list.forEach(function (v) {
    const one = potcpcLink_(v, true);
    if (one) out.push(one);
  });
  return out.join('\n').slice(0, 2000);
}

/** 'Our price' really does hold '8.87-12.97' on a live row, so a range or any other text is kept
 * as the text it is; a clean number is stored as a number for the column's 0.00 format. */
function potcpcPrice_(value, field) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!isFinite(value) || value < 0) throw new Error('invalid ' + field);
    return Math.round(value * 100) / 100;
  }
  const raw = String(value).trim().replace(/^£/, '').trim();
  if (!raw) return '';
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw) * 100) / 100;
  if (raw.length > 60) throw new Error('invalid ' + field);
  return raw;
}

/** A live cell reads '12 Mar 0202' — unparseable text is kept verbatim rather than corrected. */
function potcpcDate_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Karachi', 'yyyy-MM-dd');
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return '';
  if (raw.length > 60) throw new Error('invalid date_listing_started');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return Utilities.formatDate(d, 'Asia/Karachi', 'yyyy-MM-dd');
}

function potcpcNorm_(s) {
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function potcpcResearchBrief_(rec, comment) {
  const lines = [
    'Potential-CPC approved (§9). Reason for selection: ' + String(rec.reason_for_selection).trim(),
    'Item: ' + rec.item_link,
    'Our price: ' + rec.our_price + ' · Avg sold price: ' + rec.avg_sold_price,
    'Last 30 days sold and avg price: ' + rec.last30_link,
    'Last 90 days sold and avg price: ' + rec.last90_link,
    'Main competitor: ' + rec.main_competitor,
  ];
  if (String(rec.comments).trim()) lines.push('Advertising comments: ' + String(rec.comments).trim());
  if (comment) lines.push('Management comment: ' + comment.slice(0, 500));
  return lines.join('\n').slice(0, 4000);
}

const ACTIONS_POTENTIALCPC = {
  submitPotentialCpc:         [actionSubmitPotentialCpc_, 'any'],
  potentialCpcQueue:          [actionPotentialCpcQueue_, 'any'],
  decidePotentialCpc:         [actionDecidePotentialCpc_, 'any'],
  switchPotentialCpcCampaign: [actionSwitchPotentialCpcCampaign_, 'any'],
  myPotentialCpc:             [actionMyPotentialCpc_, 'any'],
};
