/** Phase 4 — LISTING. The lister's LIMITED workspace (§8.2), the eBay Item ID gate (§8),
 * the binding two-stage timing chain (§8.0), the revision loop (§8.4) — all behind the
 * universal approval gate (§8.0b) with the §14 notifications.
 *
 * REALITY WINS over the spec on every header spelled here: the lister view is the live
 * 'UMAR- Selected Listing' tab (21 cols A–U, 'E-Bey Caluclator + £4', trailing spaces and
 * embedded newlines intact) and the revision sheet is the live 'HAMZA UMAR -  Listing
 * Revision' tab, whose 'Requested by' column is really headed 'Zain Bhai' and whose 'Item ID'
 * column is really '<ACCOUNT> item id'. Both are resolved against the sheet, never assumed.
 *
 * §4.2/RL-4: no profit, ROI or analysis value is computed, read or emitted anywhere in this
 * file — that is why Brain.gs is never called here. The 21-column payload is BUILT from a
 * fixed whitelist, so a profit column cannot arrive and then be filtered out. */

// ---------- §8.0 clocks (UK windows, PKT display, absolute ISO storage) ----------
const LISTING_TZ_UK = 'Europe/London';
const LISTING_TZ_PKT = 'Asia/Karachi';
const LISTING_GO_LIVE_UK_HOUR = 19;                 // §8.0.1 day 0 — new listings go live 7:00 PM UK
const LISTING_REVISION_UK = { start: 13, end: 17 }; // §8.0.2 +72h — real revision, 1:00–5:00 PM UK
const LISTING_CAMPAIGN_UK = { start: 17, end: 22 }; // §8.0.3 campaign testing, 5:00–10:00 PM UK
const LISTING_REVISION_AFTER_HOURS = 72;
const LISTING_REVISION_DAY_OFFSET = 3;              // the +72h revision lands on day 3's UK window
// Lahore's Shift 2 runs to 01:00 UK, so an Item ID logged in the small hours still belongs to
// the previous UK listing day — day 0 only rolls over at 07:00 UK.
const LISTING_DAY0_ROLLOVER_UK_HOUR = 7;
// §8.0 gives no clock for supplier_add; the listing sells from go-live, so the suppliers are
// due by the next go-live boundary (24h after this listing went live).
const LISTING_SUPPLIER_DUE_HOURS = 24;

// §7's TASKS type enum has no 'listing_revision_72h'; §8.0 names the auto-task that. The row
// carries the enum type 'listing_revision' and wears the §8.0 name as its title marker.
const LISTING_KIND_72H = 'listing_revision_72h';
const LISTING_CAMPAIGN_RELEASE_REF = 'campaign-release:';

// ---------- §8.2 the 21 LIMITED columns ----------
// Keys are the live 'UMAR- Selected Listing' headers byte-for-byte; `from` lists the hunting
// (§8.1) headers each one is fed by, so the map is idempotent on an already-limited row.
const LISTING_LIMITED_MAP = [
  { to: 'Listing Update', from: ['Listing Update', 'Listing Status'], def: 'Pending ' },
  { to: 'Selected Date', from: ['Selected Date', 'Date Added'], def: '' },
  { to: 'Seasonal', from: ['Seasonal'], def: '' },
  { to: 'Main Keyword Terapeak link ', from: ['Main Keyword Terapeak link'], def: '' },
  { to: 'Image Link of avg sold price ', from: ['Image Link of avg sold price'], def: '' },
  { to: 'Image Link of Zik analytics', from: ['Image Link of Zik analytics'], def: '' },
  { to: 'Terapeak overview', from: ['Terapeak overview'], def: '' },
  { to: 'Temu Link', from: ['Temu Link'], def: '' },
  { to: 'Product Link 1 Main supplier\n\n\nAdded in supplier sheet', from: ['Product Link 1 Main supplier\n\n\nAdded in supplier sheet', 'Product Link 1 Main supplier'], def: '' },
  { to: 'Product Link 2\n\n', from: ['Product Link 2'], def: '' },
  { to: 'Product Link 3', from: ['Product Link 3'], def: '' },
  { to: 'Ebay Link ', from: ['Ebay Link'], def: '' },
  { to: 'Title', from: ['Title'], def: '' },
  { to: 'Image Link ', from: ['Image Link'], def: '' },
  { to: 'IMAGE ', from: ['IMAGE'], def: '' },
  { to: 'DESCRIPTION', from: ['DESCRIPTION'], def: '' },
  { to: 'Category', from: ['Category'], def: '' },
  { to: 'Source Price', from: ['Source Price'], def: '' },
  { to: 'E-Bey Caluclator + £4', from: ['E-Bey Caluclator + £4'], def: '' },
  { to: 'CPC Selling Chance', from: ['CPC Selling Chance'], def: '' },
  { to: 'CPC Update For Zain', from: ['CPC Update For Zain'], def: '' },
];

// §8.2 "No profit/ROI/analysis" — asserted against the built payload, never used to filter it.
const LISTING_FORBIDDEN_COLS = ['Our Profit', 'ROI', 'Profit', 'Order Earning', 'Sell Through', 'Competitors',
  'TOP THREE SALES', 'Total Competitors on main keyword', "Total Competitors on main keyword's search bar",
  'Price Range ANALYSIS', 'Sold Unit ANALYSIS', 'Selected By', 'Approval Status', 'Comments', 'Comment', 'Account Selected'];

const LISTING_SELECTED_TABS = ['UMAR- Selected Listing', 'Selected Listing'];
// Col O of that tab is the sheet's own =IMAGE(N) formula — it stays out of the write whitelist
// so the portal can never overwrite a formula with text (the Sheet Contract).
const LISTING_SELECTED_FORMULA_COLS = ['IMAGE '];
const LISTING_SHEET_PENDING = 'Pending ';           // live dropdown values, trailing spaces included
const LISTING_SHEET_DONE = 'Listing Done ';

// ---------- §8.4 revision row ----------
const LISTING_REVISION_TABS = ['HAMZA UMAR -  Listing Revision', 'Listing Revision'];
const LISTING_REVISION_COLS = ['Date', 'Requested by', 'Comment', 'Item Link', 'Item ID', 'Issue/Changes in Listing',
  'Updated By', 'Sold before', 'Sold After/72 Hrs', 'Observation', 'Next Step to update', 'Sold'];
const LISTING_REVISION_REQUESTER_CANDIDATES = ['Requested by', 'Zain Bhai'];

const LISTING_WORKSPACE_ROLES = ['Item Lister', 'Listing Manager', 'Team Lead'];   // org §2: Yousaf works half-time in Listing
const LISTING_REVISIT_ROLES = ['Advertising Manager', 'Listing Manager'];
const LISTING_MAX_TEXT = 1000;

// ---------- §8.2 payload builder (EXPORTED — Hunting.gs calls this) ----------
/** The §8.2 subset, keyed by the live lister headers. Profit/ROI/analysis are absent by
 * construction: only LISTING_LIMITED_MAP targets are ever emitted, whatever the input row
 * carries. Accepts a HUNTING_DB record, a raw hunting-sheet row, or an already-limited row. */
function listingBuildLimitedPayload_(huntRow) {
  const index = listingIndexRow_(huntRow);
  const out = {};
  LISTING_LIMITED_MAP.forEach(function (col) {
    let value = '';
    for (let i = 0; i < col.from.length; i++) {
      const hit = index[listingNormHeader_(col.from[i])];
      if (hit !== undefined && hit !== null && String(hit) !== '') { value = hit; break; }
    }
    out[col.to] = value === '' ? col.def : value;
  });
  listingAssertNoProfit_(out);
  return out;
}

function listingAssertNoProfit_(payload) {
  const denied = {};
  LISTING_FORBIDDEN_COLS.forEach(function (h) { denied[listingNormHeader_(h)] = true; });
  if (typeof PROFIT_FIELDS !== 'undefined') PROFIT_FIELDS.forEach(function (h) { denied[listingNormHeader_(h)] = true; });
  if (typeof PII_FIELDS !== 'undefined') PII_FIELDS.forEach(function (h) { denied[listingNormHeader_(h)] = true; });
  Object.keys(payload || {}).forEach(function (k) {
    if (denied[listingNormHeader_(k)]) throw new Error('§8.2 violation: ' + k + ' can never reach a lister payload');
  });
  return payload;
}

function listingNormHeader_(s) {
  if (typeof bridgeNormalizeHeader_ === 'function') return bridgeNormalizeHeader_(s);
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function listingIndexRow_(row) {
  const index = {};
  if (!row || typeof row !== 'object') return index;
  Object.keys(row).forEach(function (k) {
    const n = listingNormHeader_(k);
    if (!n || index[n] !== undefined) return;
    index[n] = row[k];
  });
  return index;
}

// ---------- §8.0 timing ----------
function listingPad2_(n) { return (n < 10 ? '0' : '') + n; }

function listingUkOffsetMs_(dateObj) {
  const z = Utilities.formatDate(dateObj, LISTING_TZ_UK, 'Z');       // '+0100' in BST, '+0000' in GMT
  const sign = z.charAt(0) === '-' ? -1 : 1;
  return sign * ((Number(z.substr(1, 2)) * 60 + Number(z.substr(3, 2))) * 60000);
}

/** The absolute instant of a UK wall-clock time. The offset is read from the zone at that
 * instant, so BST and GMT are both correct and no offset is ever hardcoded. */
function listingUkInstant_(ukYmd, hour, minute) {
  const asUtc = Date.parse(ukYmd + 'T' + listingPad2_(hour) + ':' + listingPad2_(minute) + ':00Z');
  if (isNaN(asUtc)) throw new Error('bad UK date');
  let d = new Date(asUtc);
  for (let i = 0; i < 3; i++) {
    const next = new Date(asUtc - listingUkOffsetMs_(d));
    if (next.getTime() === d.getTime()) break;
    d = next;
  }
  return d;
}

function listingUkYmd_(dateObj) { return Utilities.formatDate(dateObj, LISTING_TZ_UK, 'yyyy-MM-dd'); }

function listingShiftUkDays_(ukYmd, days) {
  const noon = Date.parse(ukYmd + 'T12:00:00Z') + days * 86400000;   // noon anchor — never crosses a DST edge
  return Utilities.formatDate(new Date(noon), 'UTC', 'yyyy-MM-dd');
}

function listingClock_(dateObj, tz) { return Utilities.formatDate(dateObj, tz, 'h:mm a'); }

/** A §8.0 window as absolute PKT ISO plus the two labels staff read: UK (the business clock)
 * and PKT (their own). */
function listingWindow_(ukYmd, win) {
  const start = listingUkInstant_(ukYmd, win.start, 0);
  const end = listingUkInstant_(ukYmd, win.end, 0);
  return {
    uk_date: ukYmd,
    start_pkt: taskPktIso_(start), end_pkt: taskPktIso_(end),
    uk: listingClock_(start, LISTING_TZ_UK) + ' – ' + listingClock_(end, LISTING_TZ_UK) + ' UK',
    pkt: listingClock_(start, LISTING_TZ_PKT) + ' – ' + listingClock_(end, LISTING_TZ_PKT) + ' PKT',
  };
}

function listingGoLiveDay_(at) {
  let ymd = listingUkYmd_(at);
  if (Number(Utilities.formatDate(at, LISTING_TZ_UK, 'H')) < LISTING_DAY0_ROLLOVER_UK_HOUR) ymd = listingShiftUkDays_(ymd, -1);
  return { ymd: ymd, goLive: listingUkInstant_(ymd, LISTING_GO_LIVE_UK_HOUR, 0) };
}

/** The whole §8.0 chain from one moment: day 0 go-live → +72h revision window → same-day
 * campaign testing window. */
function listingChain_(at) {
  const day0 = listingGoLiveDay_(at);
  const revYmd = listingShiftUkDays_(day0.ymd, LISTING_REVISION_DAY_OFFSET);
  return {
    day0_uk_date: day0.ymd,
    go_live_pkt: taskPktIso_(day0.goLive),
    go_live_uk: listingClock_(day0.goLive, LISTING_TZ_UK) + ' UK',
    plus_72h_pkt: taskPktIso_(new Date(day0.goLive.getTime() + LISTING_REVISION_AFTER_HOURS * 3600000)),
    supplier_due_pkt: taskPktIso_(new Date(day0.goLive.getTime() + LISTING_SUPPLIER_DUE_HOURS * 3600000)),
    revision: listingWindow_(revYmd, LISTING_REVISION_UK),
    campaign: listingWindow_(revYmd, LISTING_CAMPAIGN_UK),
  };
}

/** Ad-hoc revisions (§8.4) run in the same daily 1:00–5:00 PM UK window as the 72-hour one. */
function listingNextRevisionWindow_(at) {
  let ymd = listingUkYmd_(at);
  if (listingUkInstant_(ymd, LISTING_REVISION_UK.end, 0).getTime() <= at.getTime()) ymd = listingShiftUkDays_(ymd, 1);
  return listingWindow_(ymd, LISTING_REVISION_UK);
}

// ---------- the lister's workspace (§8.2) ----------
function actionMyListingWork_(payload, ctx) {
  const role = ctx.user.role;
  if (LISTING_WORKSPACE_ROLES.indexOf(role) < 0 && !isMgmt_(role, ctx.ident.email)) throw new Error('role has no listing workspace');
  const me = normalizeEmail(ctx.ident.email);
  const withCompleted = String(payload.include_completed || '') === 'true';

  const listings = [], revisions = [];
  readTab_('TASKS').forEach(function (t) {
    if (normalizeEmail(t.assigned_to) !== me) return;
    const type = String(t.type || '');
    if (type !== 'listing_new' && type !== 'listing_revision') return;
    const status = String(t.status || '');
    if (!withCompleted && status === TASK_STATUS_COMPLETED) return;

    const rec = {
      task_id: String(t.task_id || ''), type: type, account: String(t.account || ''),
      item_id: String(t.item_id || ''), title: String(t.title || ''), status: status,
      priority: String(t.priority || ''), deadline_pkt: taskPktIso_(t.deadline_pkt),
      comments: String(t.comments || ''), submission_note: String(t.submission_note || ''),
      submitted_at: taskPktIso_(t.submitted_at), created_at: taskPktIso_(t.created_at),
      details_text: String(t.details || ''), sort: taskMs_(t.deadline_pkt),
    };
    if (type === 'listing_new') {
      const limited = listingBuildLimitedPayload_(listingParseDetails_(t.details));
      listingAssertNoProfit_(limited);
      rec.listing = stripForRole_(limited, role, ctx.ident.email);
      if (listingIsJson_(t.details)) rec.details_text = '';
      listings.push(rec);
    } else {
      rec.is_72h = listingIs72h_(t);
      revisions.push(rec);
    }
  });

  const bySoonest = function (a, b) { return (isNaN(a.sort) ? Infinity : a.sort) - (isNaN(b.sort) ? Infinity : b.sort); };
  listings.sort(bySoonest);
  revisions.sort(bySoonest);
  [listings, revisions].forEach(function (set) { set.forEach(function (r) { delete r.sort; }); });

  const chain = listingChain_(new Date());
  return {
    listings: stripForRole_(listings, role, ctx.ident.email),
    revisions: stripForRole_(revisions, role, ctx.ident.email),
    columns: LISTING_LIMITED_MAP.map(function (c) { return c.to; }),
    timing: { go_live_uk: chain.go_live_uk, revision_window_uk: chain.revision.uk, revision_window_pkt: chain.revision.pkt, campaign_window_uk: chain.campaign.uk },
  };
}

function listingIsJson_(details) {
  const s = String(details || '').trim();
  return s.charAt(0) === '{';
}

/** Hunting.gs stores listingBuildLimitedPayload_() as JSON in TASKS.details; anything else is
 * treated as free text and yields an empty (still valid) 21-column payload. */
function listingParseDetails_(details) {
  if (!listingIsJson_(details)) return {};
  let parsed = null;
  try { parsed = JSON.parse(String(details)); } catch (e) { return {}; }
  if (!parsed || typeof parsed !== 'object') return {};
  if (parsed.listing && typeof parsed.listing === 'object') return parsed.listing;
  return parsed;
}

// ---------- §8 the Item ID gate ----------
/** One atomic call: the listing task goes to `Submitted — awaiting approval` (§8.0b — it never
 * self-completes), and the three downstream jobs of §8 are created. Re-entering the same Item
 * ID re-submits nothing and duplicates nothing (RL-6): each downstream task's existence is
 * keyed on (type, item_id) in TASKS, so a retry after a timeout only fills in what a
 * half-finished first attempt left missing. */
function actionEnterItemId_(payload, ctx) {
  const itemId = taskItemId_(payload.item_id);
  if (!itemId) throw new Error('item_id required');
  const note = String(payload.note || '').trim().slice(0, LISTING_MAX_TEXT) || ('Item ID ' + itemId + ' entered — the listing is live.');

  const sh = tasksSheet_();
  const chain = listingChain_(new Date());
  const stamp = now_();
  let rec = null, approver = '', idempotent = false;
  const made = { campaign_set: null, supplier_add: null, revision: null };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (String(rec.type || '') !== 'listing_new') throw new Error('not a listing task');
    if (normalizeEmail(rec.assigned_to) !== normalizeEmail(ctx.ident.email)) throw new Error(SAFE_ERROR_PREFIX + 'not your task');

    const status = String(rec.status || '');
    const carried = String(rec.item_id || '').trim();
    idempotent = carried === itemId && (status === TASK_STATUS_SUBMITTED || status === TASK_STATUS_COMPLETED);
    if (!idempotent) {
      if (carried && carried !== itemId) throw new Error('this task already carries a different Item ID');
      if (status !== TASK_STATUS_WORKING && status !== TASK_STATUS_UPDATED) throw new Error(SAFE_ERROR_PREFIX + 'listing task is not in progress');
    }

    const all = readTab_('TASKS');
    const account = String(rec.account || '');
    const limited = listingBuildLimitedPayload_(listingParseDetails_(rec.details));
    const product = String(limited['Title'] || rec.title || '');

    // ① campaign_set → Advertising Manager. Created now (§8, §14) and worked in the §8.0.3
    // testing window that opens when the 72-hour revision is approved.
    const adv = listingPickForRole_('Advertising Manager', payload.campaign_assignee, all, 'campaign_set');
    const haveCampaign = listingFindTask_(all, 'campaign_set', itemId);
    if (haveCampaign) made.campaign_set = { task_id: String(haveCampaign.task_id), existing: true, assigned_to: String(haveCampaign.assigned_to) };
    else if (adv) {
      made.campaign_set = {
        task_id: listingCreateTask_(sh, {
          type: 'campaign_set', account: account, item_id: itemId,
          title: 'campaign_set — Item ID ' + itemId,
          details: listingLines_([
            'Item ID: ' + itemId,
            'Listing: ' + product,
            'CPC Selling Chance: ' + String(limited['CPC Selling Chance'] || ''),
            'Testing window: ' + chain.campaign.uk + ' (' + chain.campaign.pkt + ') on ' + chain.campaign.uk_date,
            'Fires when the 72-hour revision is approved (§8.0).',
          ]),
          assigned_by: String(rec.assigned_by || ''), assigned_to: adv.email,
          priority: String(rec.priority || ''), deadline_pkt: chain.campaign.end_pkt, stamp: stamp,
        }), existing: false, assigned_to: adv.email,
      };
    }

    // ② supplier_add → Order Processor. The Central Main Sheet row itself is created by the
    // eBay listing sync; the processor fills only the supplier columns (§8.7 whitelist).
    const proc = listingPickForRole_('Order Processor', payload.supplier_assignee, all, 'supplier_add');
    const haveSupplier = listingFindTask_(all, 'supplier_add', itemId);
    if (haveSupplier) made.supplier_add = { task_id: String(haveSupplier.task_id), existing: true, assigned_to: String(haveSupplier.assigned_to) };
    else if (proc) {
      made.supplier_add = {
        task_id: listingCreateTask_(sh, {
          type: 'supplier_add', account: account, item_id: itemId,
          title: 'supplier_add — Item ID ' + itemId,
          details: listingLines_([
            'Item ID: ' + itemId,
            'Listing: ' + product,
            'Fill on the Central Main Sheet: Current Supplier Working · Ali Express Link 1 · Suuplier 2 · Supplier 3',
            'Product Link 1: ' + String(limited['Product Link 1 Main supplier\n\n\nAdded in supplier sheet'] || ''),
            'Product Link 2: ' + String(limited['Product Link 2\n\n'] || ''),
            'Product Link 3: ' + String(limited['Product Link 3'] || ''),
          ]),
          assigned_by: String(rec.assigned_by || ''), assigned_to: proc.email,
          priority: String(rec.priority || ''), deadline_pkt: chain.supplier_due_pkt, stamp: stamp,
        }), existing: false, assigned_to: proc.email,
      };
    }

    // ③ +72h real revision → the same lister; listing quality is approved by Hamza (§8.0b).
    const manager = listingPickForRole_('Listing Manager', '', all, 'listing_revision');
    const have72 = listingFind72h_(all, itemId);
    if (have72) made.revision = { task_id: String(have72.task_id), existing: true, assigned_to: String(have72.assigned_to) };
    else {
      made.revision = {
        task_id: listingCreateTask_(sh, {
          type: 'listing_revision', account: account, item_id: itemId,
          title: LISTING_KIND_72H + ' — Item ID ' + itemId,
          details: listingLines_([
            'Item ID: ' + itemId,
            'Listing: ' + product,
            'Window: ' + chain.revision.uk + ' (' + chain.revision.pkt + ') on ' + chain.revision.uk_date,
            'Live since ' + chain.go_live_uk + ' on ' + chain.day0_uk_date + ' — 72 hours later this dummy becomes the real competitor-based listing.',
          ]),
          assigned_by: manager ? manager.email : String(rec.assigned_by || ''), assigned_to: String(rec.assigned_to || ''),
          priority: String(rec.priority || ''), deadline_pkt: chain.revision.end_pkt, stamp: stamp,
        }), existing: false, assigned_to: String(rec.assigned_to || ''),
      };
    }

    if (!idempotent) {
      const total = (Number(rec.time_taken_min) || 0) + taskElapsedMin_(rec.updated_at, taskMs_(stamp));
      taskWrite_(sh, found, {
        item_id: itemId, status: TASK_STATUS_SUBMITTED, submitted_at: stamp,
        submission_note: note, updated_at: stamp, time_taken_min: total,
        comments: listingMergeFlag_(rec.comments, null),   // R7-4: the flag is resolved at go-live; return-note history stays
      });
      approver = String(rec.assigned_by || '').trim();
    }
  } finally { lock.releaseLock(); }

  // A repeat entry re-reports the same tasks, but a downstream task that was never created
  // (a half-finished first attempt) is still created, notified and logged here.
  if (!idempotent) logActivity_(ctx.ident.email, 'ENTER_ITEM_ID', String(rec.task_id), '', itemId, 'go-live ' + chain.go_live_uk + ' ' + chain.day0_uk_date + ' · revision ' + chain.revision.uk_date);
  ['campaign_set', 'supplier_add', 'revision'].forEach(function (k) {
    if (made[k] && !made[k].existing) logActivity_(ctx.ident.email, 'CREATE_TASK', made[k].task_id, '', TASK_STATUS_PENDING, k + ' → ' + made[k].assigned_to + ' (item ' + itemId + ')');
  });

  if (!idempotent) {
    const msg = ctx.user.name + ' submitted "' + String(rec.title || '') + '" for approval — ' + note.slice(0, 200);
    if (approver) notify_(approver, 'Task submitted', msg, 'task:' + String(rec.task_id));
    else notifyManagement_('Task submitted', msg, 'task:' + String(rec.task_id));
  }

  if (made.campaign_set && !made.campaign_set.existing) {
    notify_(made.campaign_set.assigned_to, 'Task assigned',
      '🔵 Campaign task queued · ' + String(rec.account || '') + ' · ' + itemId +
      (rec.title ? ' · ' + String(rec.title).slice(0, 55) : '') + ' — set the campaign in the UK testing window ' +
      chain.campaign.uk + ' (' + chain.campaign.pkt + ' Pakistan) on ' + chain.campaign.uk_date +
      ', once the 72-hour revision is approved. It will unlock by itself.',
      'task:' + made.campaign_set.task_id);
  } else if (!made.campaign_set) {
    notifyManagement_('Task assigned',
      '🔴 Nobody to set the campaign · ' + String(rec.account || '') + ' · ' + itemId +
      ' — there is no approved Advertising Manager to route the campaign_set task to. The item will list but never advertise → approve or assign an Advertising Manager.',
      'task:' + String(rec.task_id));
  }
  if (made.supplier_add && !made.supplier_add.existing) {
    notify_(made.supplier_add.assigned_to, 'Task assigned',
      '🔵 Supplier details needed · ' + String(rec.account || '') + ' · ' + itemId +
      (rec.title ? ' · ' + String(rec.title).slice(0, 55) : '') +
      ' — fill Current Supplier Working and Supplier 1/2/3 on the Central Main Sheet so the first order does not stall.',
      'task:' + made.supplier_add.task_id);
  } else if (!made.supplier_add) {
    notifyManagement_('Task assigned',
      '🔴 Nobody to add suppliers · ' + String(rec.account || '') + ' · ' + itemId +
      ' — no approved Order Processor to route the supplier task to. The first order on this item will have no supplier link → approve or assign an Order Processor.',
      'task:' + String(rec.task_id));
  }
  if (made.revision && !made.revision.existing) {
    notify_(made.revision.assigned_to, 'Task assigned',
      '🔵 72-hour revision due · ' + String(rec.account || '') + ' · ' + itemId +
      (rec.title ? ' · ' + String(rec.title).slice(0, 55) : '') + ' — selected for revision by the automated system. UK window ' +
      chain.revision.uk + ' (' + chain.revision.pkt + ' Pakistan) on ' + chain.revision.uk_date + ' → open My tasks.',
      'task:' + made.revision.task_id);
  }

  const mirrorPayload = listingBuildLimitedPayload_(listingParseDetails_(rec.details));
  const mirror = listingMirrorListingDone_(String(rec.account || ''), String(mirrorPayload['Title'] || ''), ctx.ident.email);
  return {
    task_id: String(rec.task_id), item_id: itemId,
    status: idempotent ? String(rec.status || '') : TASK_STATUS_SUBMITTED,
    submitted_at: idempotent ? taskPktIso_(rec.submitted_at) : stamp,
    idempotent: idempotent, timing: chain, tasks: made, mirror: mirror,
  };
}

// ---------- §8.4 the revision loop ----------
/** Creation form = {Employee name, Item ID, Changes required, Comments}. Creator rights are
 * §4.3's, shared with Tasks.gs so there is one gate: Management (Zaid included), Ops Head,
 * Team Lead and the Advertising Manager (Zain). */
function actionCreateRevision_(payload, ctx) {
  if (!taskCanCreate_(ctx.user.role, ctx.ident.email, 'listing_revision')) throw new Error('role may not create a revision');
  const itemId = taskItemId_(payload.item_id);
  if (!itemId) throw new Error('item_id required');
  const changes = String(payload.changes_required || '').trim().slice(0, LISTING_MAX_TEXT);
  if (!changes) throw new Error('changes required');
  const comments = String(payload.comments || '').trim().slice(0, LISTING_MAX_TEXT);
  const itemLink = listingUrl_(payload.item_link);

  const employee = listingResolveUser_(payload.employee_email, payload.employee_name);
  if (!employee) throw new Error('employee is not an approved portal user');

  const win = listingNextRevisionWindow_(new Date());
  const stamp = now_();
  let taskId = '', account = String(payload.account || '').trim();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!account) {
      readTab_('TASKS').forEach(function (t) {
        if (account) return;
        if (String(t.item_id || '').trim() === itemId && String(t.account || '').trim()) account = String(t.account).trim();
      });
    }
    taskId = listingCreateTask_(tasksSheet_(), {
      type: 'listing_revision', account: account, item_id: itemId,
      title: 'listing_revision — Item ID ' + itemId,
      details: listingLines_([
        'Item ID: ' + itemId,
        'Item Link: ' + itemLink,
        'Issue/Changes in Listing: ' + changes,
        'Comment: ' + comments,
        'Requested by: ' + ctx.user.name,
        'Window: ' + win.uk + ' (' + win.pkt + ') on ' + win.uk_date,
      ]),
      assigned_by: ctx.ident.email, assigned_to: employee.email,
      priority: String(payload.priority || '').slice(0, 40), deadline_pkt: win.end_pkt, stamp: stamp,
    });
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'CREATE_REVISION', taskId, '', itemId, 'to ' + employee.email + ' · ' + changes.slice(0, 120));
  notify_(employee.email, 'Task assigned',
    '🔵 Revision requested by ' + ctx.user.name + ' · ' + itemId + ' — change this: ' + changes.slice(0, 200) +
    '. UK window ' + win.uk + ' (' + win.pkt + ' Pakistan) on ' + win.uk_date + ' → open My tasks.',
    'task:' + taskId);

  const mirror = listingMirrorRevision_(account, {
    'Date': new Date(), 'Comment': comments, 'Item Link': itemLink, 'Item ID': itemId,
    'Issue/Changes in Listing': changes, 'Updated By': employee.name, 'Requested by': ctx.user.name,
  }, itemId, ctx.ident.email);

  return { task_id: taskId, item_id: itemId, account: account, assigned_to: employee.email, deadline_pkt: win.end_pkt, window: win, mirror: mirror };
}

/** The 72-hour revisit capture (§8.4): Sold before · Sold After/72 Hrs · Observation · Next
 * Step to update. The row moves to `Updated` for its own lister — never to Completed (§8.0b). */
function actionRevisionRevisit_(payload, ctx) {
  const soldBefore = listingUnits_(payload.sold_before, 'Sold before');
  const soldAfter = listingUnits_(payload.sold_after_72hrs, 'Sold After/72 Hrs');
  const observation = String(payload.observation || '').trim().slice(0, LISTING_MAX_TEXT);
  const nextStep = String(payload.next_step || '').trim().slice(0, LISTING_MAX_TEXT);
  const sold = String(payload.sold || '').trim().slice(0, 200);
  if (soldBefore === '' && soldAfter === '' && !observation && !nextStep && !sold) throw new Error('nothing to record');

  const sh = tasksSheet_();
  const stamp = now_();
  let rec = null, itemId = '', account = '', newStatus = '';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (String(rec.type || '') !== 'listing_revision') throw new Error('not a revision task');
    const me = normalizeEmail(ctx.ident.email);
    const mine = normalizeEmail(rec.assigned_to) === me;
    const requester = normalizeEmail(rec.assigned_by) === me;
    if (!mine && !requester && !isMgmt_(ctx.user.role, ctx.ident.email) && LISTING_REVISIT_ROLES.indexOf(ctx.user.role) < 0) throw new Error('not your revision');

    itemId = String(rec.item_id || '').trim();
    account = String(rec.account || '').trim();
    const status = String(rec.status || '');
    const line = '[' + stamp + '] ' + ctx.user.name + ' 72-hour revisit — ' + listingLines_([
      'Sold before: ' + soldBefore, 'Sold After/72 Hrs: ' + soldAfter,
      'Observation: ' + observation, 'Next Step to update: ' + nextStep, 'Sold: ' + sold,
    ]).replace(/\n/g, ' · ');
    const prior = String(rec.comments || '');
    const patch = { comments: (prior ? prior + '\n' : '') + line, updated_at: stamp };
    if (mine && (status === TASK_STATUS_WORKING || status === TASK_STATUS_UPDATED)) {
      patch.status = TASK_STATUS_UPDATED;
      newStatus = TASK_STATUS_UPDATED;
    } else {
      newStatus = status;
    }
    taskWrite_(sh, found, patch);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'REVISION_REVISIT', String(rec.task_id), '', newStatus, 'item ' + itemId);
  const mirror = listingMirrorRevisit_(account, itemId, {
    'Sold before': soldBefore, 'Sold After/72 Hrs': soldAfter, 'Observation': observation,
    'Next Step to update': nextStep, 'Sold': sold, 'Updated By': ctx.user.name,
  }, payload.sheet_row, ctx.ident.email);

  return { task_id: String(rec.task_id), item_id: itemId, status: newStatus, mirror: mirror };
}

/** §8.0.3 — the campaign fires the moment the 72-hour revision completes. Approval lands in
 * Tasks.gs, so this time trigger carries the release; the NOTIFICATIONS ref makes it once-only,
 * the same pattern escalateStaleSubmissions uses. */
function releaseCampaignAfterRevision() {
  const rows = readTab_('TASKS');
  const done = {};
  readTab_('NOTIFICATIONS').forEach(function (n) {
    const ref = String(n.ref || '');
    if (ref.indexOf(LISTING_CAMPAIGN_RELEASE_REF) === 0) done[ref.slice(LISTING_CAMPAIGN_RELEASE_REF.length)] = true;
  });

  const revised = {};
  rows.forEach(function (t) {
    if (String(t.type || '') !== 'listing_revision' || String(t.status || '') !== TASK_STATUS_COMPLETED) return;
    if (!listingIs72h_(t)) return;
    const id = String(t.item_id || '').trim();
    if (id) revised[id] = true;
  });

  const win = listingWindow_(listingUkYmd_(new Date()), LISTING_CAMPAIGN_UK);
  let count = 0;
  rows.forEach(function (t) {
    if (String(t.type || '') !== 'campaign_set' || String(t.status || '') === TASK_STATUS_COMPLETED) return;
    const id = String(t.item_id || '').trim();
    if (!id || !revised[id] || done[id]) return;
    notify_(String(t.assigned_to || ''), 'Task assigned',
      '🟠 Campaign window OPEN · ' + String(t.account || '') + ' · ' + id +
      ' — the 72-hour revision is approved. Set the campaign inside the UK testing window ' + win.uk +
      ' (' + win.pkt + ' Pakistan) or the slot is missed → open My tasks.',
      LISTING_CAMPAIGN_RELEASE_REF + id);
    logActivity_('system', 'CAMPAIGN_WINDOW_OPEN', String(t.task_id || ''), '', 'released', 'item ' + id + ' · ' + win.uk);
    count++;
  });
  return 'released ' + count + ' campaign_set task(s)';
}

// ---------- TASKS helpers ----------
/** Appends a TASKS row in DB_TABS order. The caller holds the script lock; the type is checked
 * against the §7 enum, and every auto-task starts Pending like any assigned task. */
function listingCreateTask_(sh, spec) {
  if (TASK_TYPES.indexOf(spec.type) < 0) throw new Error('unknown task type');
  if (!spec.assigned_to) throw new Error('assigned_to required');
  if (!spec.deadline_pkt) throw new Error('deadline_pkt required');
  const id = 'T' + Utilities.getUuid().slice(0, 8);
  const row = {
    task_id: id, type: spec.type, account: spec.account || '', item_id: spec.item_id || '',
    title: spec.title || '', details: spec.details || '', comments: '',
    assigned_by: spec.assigned_by || '', assigned_to: spec.assigned_to, priority: spec.priority || '',
    deadline_pkt: spec.deadline_pkt, status: TASK_STATUS_PENDING,
    created_at: spec.stamp, updated_at: spec.stamp, submitted_at: '', submission_note: '',
    approved_by: '', decided_at: '', time_taken_min: '',
  };
  sh.appendRow(DB_TABS.TASKS.map(function (col) { return row[col] === undefined ? '' : row[col]; }));
  return id;
}

function listingFindTask_(rows, type, itemId) {
  let hit = null;
  rows.forEach(function (t) {
    if (hit) return;
    if (String(t.type || '') === type && String(t.item_id || '').trim() === itemId) hit = t;
  });
  return hit;
}

function listingFind72h_(rows, itemId) {
  let hit = null;
  rows.forEach(function (t) {
    if (hit) return;
    if (String(t.type || '') !== 'listing_revision' || String(t.item_id || '').trim() !== itemId) return;
    if (listingIs72h_(t)) hit = t;
  });
  return hit;
}

function listingIs72h_(t) { return String(t.title || '').indexOf(LISTING_KIND_72H) === 0; }

/** Approved holders of a role; the named one wins, otherwise the lightest open queue does. */
function listingPickForRole_(role, preferredEmail, tasks, type) {
  const wanted = normalizeEmail(preferredEmail || '');
  const users = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.role || '') !== role || String(u.status || '') !== 'approved') return;
    users.push({ email: String(u.email), name: String(u.name || u.email) });
  });
  if (!users.length) return null;
  if (wanted) {
    for (let i = 0; i < users.length; i++) if (normalizeEmail(users[i].email) === wanted) return users[i];
  }
  const load = {};
  users.forEach(function (u) { load[normalizeEmail(u.email)] = 0; });
  tasks.forEach(function (t) {
    if (String(t.type || '') !== type || String(t.status || '') === TASK_STATUS_COMPLETED) return;
    const k = normalizeEmail(t.assigned_to);
    if (load[k] !== undefined) load[k]++;
  });
  let best = users[0];
  users.forEach(function (u) { if (load[normalizeEmail(u.email)] < load[normalizeEmail(best.email)]) best = u; });
  return best;
}

/** §8.4's form names an Employee, not an address: an email wins, otherwise a UNIQUE approved
 * name match — two people sharing a name resolve to nobody rather than to the wrong lister. */
function listingResolveUser_(email, name) {
  const wantEmail = normalizeEmail(email || '');
  const wantName = listingNormHeader_(name || '');
  const users = readTab_('USERS').filter(function (u) { return String(u.status || '') === 'approved'; });
  for (let i = 0; i < users.length; i++) {
    if (wantEmail && normalizeEmail(users[i].email) === wantEmail) return { email: String(users[i].email), name: String(users[i].name || users[i].email) };
  }
  if (!wantName) return null;
  const hits = users.filter(function (u) { return listingNormHeader_(u.name) === wantName; });
  return hits.length === 1 ? { email: String(hits[0].email), name: String(hits[0].name || hits[0].email) } : null;
}

function listingLines_(lines) {
  return lines.filter(function (l) {
    const parts = String(l).split(': ');
    return parts.length < 2 || String(parts.slice(1).join(': ')).trim() !== '';
  }).join('\n');
}

function listingUnits_(value, field) {
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return '';
  if (!/^\d{1,6}$/.test(s)) throw new Error(field + ' must be a whole number of units');
  return Number(s);
}

function listingUrl_(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (!/^https?:\/\/[^\s]+$/i.test(s) || s.length > 2000) throw new Error('item link must be an http(s) URL');
  return s;
}

// ---------- mirrors (Sheet Contract · RL-6 · §16.10 shadow mode) ----------
function listingBridgeReady_() {
  return typeof bridgeResolveSheetId_ === 'function' && typeof bridgeOpenTab_ === 'function' &&
    typeof bridgeAppendRow_ === 'function' && typeof bridgeUpdateRow_ === 'function' && typeof bridgeColumnFor_ === 'function';
}

function listingSelectedSpec_(account) {
  return { scope: 'account', account: account, kind: 'central', tab: LISTING_SELECTED_TABS, expect: LISTING_LIMITED_MAP.map(function (c) { return c.to; }) };
}

/** The §8.2 write whitelist: the 21 lister columns minus the sheet's own =IMAGE() column. */
function listingSelectedWhitelist_() {
  return LISTING_LIMITED_MAP.map(function (c) { return c.to; }).filter(function (h) { return LISTING_SELECTED_FORMULA_COLS.indexOf(h) < 0; });
}

/** EXPORTED for Hunting.gs — §8.2: on approval the limited subset is copied into the account's
 * Central 'UMAR- Selected Listing' tab. */
function listingMirrorSelectedListing_(account, limitedPayload, actor) {
  if (!account) return { ok: false, reason: 'account unknown' };
  if (!listingBridgeReady_()) return { ok: false, reason: 'not connected yet' };
  const limited = listingBuildLimitedPayload_(limitedPayload);
  listingAssertNoProfit_(limited);
  const values = {};
  listingSelectedWhitelist_().forEach(function (h) { values[h] = limited[h] === undefined ? '' : limited[h]; });
  return bridgeAppendRow_(listingSelectedSpec_(account), values, listingSelectedWhitelist_(), actor);
}

/** The tab carries no Item ID column (21 cols, A–U), so the row is matched on Title; an
 * ambiguous or missing title is reported back, never guessed at. */
function listingMirrorListingDone_(account, title, actor) {
  if (!account) return { ok: false, reason: 'account unknown' };
  if (!String(title || '').trim()) return { ok: false, reason: 'no listing title on the task' };
  if (!listingBridgeReady_()) return { ok: false, reason: 'not connected yet' };
  return bridgeUpdateRow_(listingSelectedSpec_(account), 'Title', String(title).trim(), { 'Listing Update': LISTING_SHEET_DONE }, ['Listing Update'], actor);
}

function listingRevisionSpec_(account) {
  return { scope: 'account', account: account, kind: 'central', tab: LISTING_REVISION_TABS, expect: LISTING_REVISION_COLS };
}

function listingRevisionOpen_(account) {
  if (!account) return null;
  if (!listingBridgeReady_()) return null;
  const id = bridgeResolveSheetId_('account', account, 'central');
  if (!id) return null;
  return bridgeOpenTab_(id, LISTING_REVISION_TABS, LISTING_REVISION_COLS);
}

/** The live revision tab heads its ID column '<ACCOUNT> item id' and its requester column with
 * a person's name ('Zain Bhai'), so both are resolved against the sheet's own headers; the
 * resolved header joins the whitelist only because the sheet itself supplied it. */
function listingRevisionItemHeader_(open) {
  if (!open) return '';
  let exact = '', suffix = '', many = false;
  open.headers.forEach(function (h) {
    const n = listingNormHeader_(h);
    if (!n) return;
    if (n === 'item id' && !exact) exact = String(h);
    if (n.length > 8 && n.slice(-8) === ' item id') {
      if (suffix) many = true; else suffix = String(h);
    }
  });
  if (suffix && !many) return suffix;
  return exact;
}

function listingRevisionRequesterHeader_(open) {
  if (!open) return '';
  for (let i = 0; i < LISTING_REVISION_REQUESTER_CANDIDATES.length; i++) {
    const col = bridgeColumnFor_(open, LISTING_REVISION_REQUESTER_CANDIDATES[i]);
    if (col > 0) return LISTING_REVISION_REQUESTER_CANDIDATES[i];
  }
  return '';
}

function listingMirrorRevision_(account, fields, itemId, actor) {
  if (!account) return { ok: false, reason: 'account unknown' };
  const open = listingRevisionOpen_(account);
  if (!open) return { ok: false, reason: 'not connected yet' };
  const itemHeader = listingRevisionItemHeader_(open);
  const requesterHeader = listingRevisionRequesterHeader_(open);

  const values = {}, whitelist = LISTING_REVISION_COLS.slice();
  Object.keys(fields).forEach(function (k) {
    if (k === 'Item ID' || k === 'Requested by') return;
    values[k] = fields[k];
  });
  if (itemHeader) {
    values[itemHeader] = itemId;
    if (whitelist.indexOf(itemHeader) < 0) whitelist.push(itemHeader);
  }
  if (requesterHeader && fields['Requested by'] !== undefined) {
    values[requesterHeader] = fields['Requested by'];
    if (whitelist.indexOf(requesterHeader) < 0) whitelist.push(requesterHeader);
  }
  return bridgeAppendRow_(listingRevisionSpec_(account), values, whitelist, actor);
}

function listingMirrorRevisit_(account, itemId, fields, sheetRow, actor) {
  if (!itemId) return { ok: false, reason: 'no item id on the task' };
  if (!account) return { ok: false, reason: 'account unknown' };
  const open = listingRevisionOpen_(account);
  if (!open) return { ok: false, reason: 'not connected yet' };
  const itemHeader = listingRevisionItemHeader_(open);
  if (!itemHeader) return { ok: false, reason: 'item id column not on this sheet' };

  const values = {};
  Object.keys(fields).forEach(function (k) { if (fields[k] !== '' && fields[k] !== undefined) values[k] = fields[k]; });
  if (!Object.keys(values).length) return { ok: false, reason: 'nothing to write' };

  const spec = listingRevisionSpec_(account);
  const row = Number(sheetRow) || 0;
  if (row) spec.row = row;                        // repeat revisions share an item id — the caller picks the row
  return bridgeUpdateRow_(spec, itemHeader, itemId, values, LISTING_REVISION_COLS, actor);
}

// ---------- R7-4: the lister's in-progress states + the draft hand-off ----------
/* Hasib (R7): the lister can flag a listing as "need more time" or "more information required
 * from the hunter (send an alert to the hunter)", and — separately — "if the lister leaves the
 * item in the draft, he can add the draft link and it alerts Husnain to make it live and add the
 * item id". None of these touch the Pending→Working→Submitted machine that the rest of §8 relies
 * on: a compact flag rides TASKS.comments as JSON, and the draft hand-off REASSIGNS the task to
 * the go-live approver, who then enters the Item ID as its owner (the normal §8 chain follows). */

/* The flag shares TASKS.comments with the return-note history (returnTask appends
 * "[stamp] X returned: …" lines there). To never clobber that, the flag rides ONE tagged line
 * and is merged in/out; every other line is preserved. */
const LISTING_FLAG_TAG = '@LFLAG@';

function listingFlagObj_(flag, by, extra) {
  const o = { flag: flag, at: now_(), by: by };
  Object.keys(extra || {}).forEach(function (k) { if (extra[k] !== '' && extra[k] != null) o[k] = extra[k]; });
  return JSON.stringify(o).slice(0, 900);
}

/** Replace (or remove, when json is null) the single tagged flag line, keeping all other lines. */
function listingMergeFlag_(prior, json) {
  const kept = String(prior || '').split('\n').filter(function (l) { return l.indexOf(LISTING_FLAG_TAG) !== 0; });
  if (json) kept.push(LISTING_FLAG_TAG + json);
  return kept.join('\n').slice(0, 1900);
}

/** Find the caller's own open listing_new task (Management may act on anyone's). */
function listingListerTask_(sh, payload, ctx, wantOpen) {
  const found = taskFind_(sh, payload.task_id);
  const rec = found.rec;
  if (String(rec.type || '') !== 'listing_new') throw new Error('not a listing task');
  if (normalizeEmail(rec.assigned_to) !== normalizeEmail(ctx.ident.email) && !isMgmt_(ctx.user.role, ctx.ident.email)) {
    throw new Error(SAFE_ERROR_PREFIX + 'not your task');
  }
  const status = String(rec.status || '');
  if (wantOpen && status !== TASK_STATUS_PENDING && status !== TASK_STATUS_WORKING && status !== TASK_STATUS_UPDATED) {
    throw new Error(SAFE_ERROR_PREFIX + 'this listing is not open — it is ' + (status || 'unknown'));
  }
  return found;
}

/** The hunt_id rides the listing_new task's details JSON; HUNTING_DB carries the hunter's email. */
function listingHunterFor_(rec) {
  try {
    const parsed = JSON.parse(String(rec.details || '{}'));
    const huntId = String((parsed && parsed.hunt_id) || '').trim();
    if (!huntId) return null;
    let hit = null;
    readTab_('HUNTING_DB').forEach(function (r) { if (String(r.hunt_id || '') === huntId) hit = r; });
    if (!hit) return null;
    const email = String(hit.hunter_email || '').trim();
    return email ? { email: email, hunt_id: huntId, title: String(hit.Title || rec.title || '') } : null;
  } catch (e) { return null; }
}

function actionListerNeedTime_(payload, ctx) {
  const reason = String(payload.reason || '').trim().slice(0, LISTING_MAX_TEXT);
  if (!reason) throw new Error('say why you need more time');
  const eta = String(payload.eta_pkt || '').trim();
  const sh = tasksSheet_();
  let rec = null, pushed = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = listingListerTask_(sh, payload, ctx, true);
    rec = found.rec;
    const patch = { comments: listingMergeFlag_(rec.comments, listingFlagObj_('needtime', ctx.ident.email, { reason: reason, eta: eta })), updated_at: now_() };
    if (eta) {                                             // only ever push the deadline OUT, never in
      const newMs = taskMs_(eta), oldMs = taskMs_(rec.deadline_pkt);
      if (!isNaN(newMs) && (isNaN(oldMs) || newMs > oldMs)) { patch.deadline_pkt = taskPktIso_(eta); pushed = patch.deadline_pkt; }
    }
    taskWrite_(sh, found, patch);
  } finally { lock.releaseLock(); }
  logActivity_(ctx.ident.email, 'LISTER_NEEDTIME', String(rec.task_id), '', pushed || '', reason.slice(0, 200));
  const who = ctx.user.name || ctx.ident.email;
  const msg = '🟡 ' + who + ' needs more time on "' + String(rec.title || rec.task_id).slice(0, 60) + '" · ' +
    String(rec.account || '') + ' — ' + reason.slice(0, 300) + (pushed ? ' · new ETA ' + pushed : '');
  const approver = String(rec.assigned_by || '').trim();
  if (approver) notify_(approver, 'Listing needs more time', msg, 'task:' + String(rec.task_id));
  else notifyManagement_('Listing needs more time', msg, 'task:' + String(rec.task_id));
  return { task_id: String(rec.task_id), flag: 'needtime', deadline_pkt: pushed || taskPktIso_(rec.deadline_pkt) };
}

function actionListerNeedInfo_(payload, ctx) {
  const note = String(payload.note || '').trim().slice(0, LISTING_MAX_TEXT);
  if (!note) throw new Error('say what information you need from the hunter');
  const sh = tasksSheet_();
  let rec = null, hunter = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = listingListerTask_(sh, payload, ctx, true);
    rec = found.rec;
    hunter = listingHunterFor_(rec);
    taskWrite_(sh, found, {
      comments: listingMergeFlag_(rec.comments, listingFlagObj_('needinfo', ctx.ident.email, { note: note, hunter: hunter ? hunter.email : '' })),
      updated_at: now_(),
    });
  } finally { lock.releaseLock(); }
  logActivity_(ctx.ident.email, 'LISTER_NEEDINFO', String(rec.task_id), '', hunter ? hunter.email : '(no hunter)', note.slice(0, 200));
  const who = ctx.user.name || ctx.ident.email;
  const title = String(rec.title || rec.task_id).slice(0, 60);
  if (hunter) {
    notify_(hunter.email, 'More info needed on your hunt',
      '🟠 ' + who + ' is listing "' + title + '" and needs more from you: ' + note.slice(0, 400) +
      ' — add what is missing (or revise the hunt) so the listing can go live.', 'hunt:' + hunter.hunt_id);
  }
  notifyManagement_('Listing waiting on hunter',
    '🟠 "' + title + '" · ' + String(rec.account || '') + ' — ' + who + ' needs more info' +
    (hunter ? ' from ' + hunter.email : ' (hunter not found — please assign someone)') + ': ' + note.slice(0, 300),
    'task:' + String(rec.task_id));
  return { task_id: String(rec.task_id), flag: 'needinfo', hunter: hunter ? hunter.email : '' };
}

/** Hasib named Husnain for go-live; the portal routes by data, so a config key points at him and
 * can be moved without code. Falls back to Listing Manager, then Team Lead. */
function listingGoLivePerson_(all) {
  const configured = normalizeEmail(getConfig('go_live_approver') || 'm98mtwo@gmail.com');
  const approved = readTab_('USERS').filter(function (u) { return String(u.status || '') === 'approved'; });
  for (let i = 0; i < approved.length; i++) {
    if (normalizeEmail(approved[i].email) === configured) return { email: String(approved[i].email), name: String(approved[i].name || approved[i].email) };
  }
  return listingPickForRole_('Listing Manager', '', all, 'listing_new') ||
    listingPickForRole_('Team Lead', '', all, 'listing_new') || null;
}

function actionListerDraft_(payload, ctx) {
  const link = listingUrl_(payload.draft_link);
  if (!link) throw new Error('add the eBay draft link (an http/https URL)');
  const note = String(payload.note || '').trim().slice(0, LISTING_MAX_TEXT);
  const sh = tasksSheet_();
  let rec = null, go = null, from = '', handed = false;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = listingListerTask_(sh, payload, ctx, true);
    rec = found.rec;
    from = String(rec.assigned_to || '');
    go = listingGoLivePerson_(readTab_('TASKS'));
    if (!go) throw new Error('no go-live approver is set up — tell Management');
    handed = normalizeEmail(go.email) !== normalizeEmail(rec.assigned_to);
    const patch = {
      comments: listingMergeFlag_(rec.comments, listingFlagObj_('draft', ctx.ident.email, { link: link, note: note, from: handed ? from : '' })),
      status: TASK_STATUS_WORKING, updated_at: now_(),
    };
    if (handed) patch.assigned_to = go.email;              // owner moves so the approver can enter the Item ID
    taskWrite_(sh, found, patch);
  } finally { lock.releaseLock(); }
  logActivity_(ctx.ident.email, 'LISTER_DRAFT', String(rec.task_id), from, go.email, link.slice(0, 200));
  const who = ctx.user.name || ctx.ident.email;
  const title = String(rec.title || rec.task_id).slice(0, 60);
  notify_(go.email, 'Draft listing to publish',
    '🟣 ' + who + ' left "' + title + '" in draft · ' + String(rec.account || '') + '. Publish it on eBay, then open the task and enter the Item ID — that starts the campaign, supplier and 72-hour tasks.' +
    (note ? ' Note: ' + note.slice(0, 300) : '') + ' Draft: ' + link, 'task:' + String(rec.task_id));
  notifyManagement_('Draft handed to go-live',
    '🟣 "' + title + '" · ' + String(rec.account || '') + ' — ' + who + ' left it in draft; ' + go.name + ' will publish and add the Item ID.',
    'task:' + String(rec.task_id));
  return { task_id: String(rec.task_id), flag: 'draft', assigned_to: go.email, assigned_to_name: go.name, handed_off: handed, draft_link: link };
}

/** Take a need-time / need-info / draft flag back off a task once it is resolved. */
function actionListerClearFlag_(payload, ctx) {
  const sh = tasksSheet_();
  let rec = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = listingListerTask_(sh, payload, ctx, false);
    rec = found.rec;
    taskWrite_(sh, found, { comments: listingMergeFlag_(rec.comments, null), updated_at: now_() });
  } finally { lock.releaseLock(); }
  logActivity_(ctx.ident.email, 'LISTER_CLEARFLAG', String(rec.task_id), '', '', '');
  return { task_id: String(rec.task_id), flag: '' };
}

const ACTIONS_LISTING = {
  myListingWork:    [actionMyListingWork_, 'any'],
  enterItemId:      [actionEnterItemId_, 'any'],
  createRevision:   [actionCreateRevision_, 'any'],
  revisionRevisit:  [actionRevisionRevisit_, 'any'],
  listerNeedTime:   [actionListerNeedTime_, 'any'],   // lister-own or management, gated inside
  listerNeedInfo:   [actionListerNeedInfo_, 'any'],   // alerts the hunter
  listerDraft:      [actionListerDraft_, 'any'],      // hands the draft to the go-live approver
  listerClearFlag:  [actionListerClearFlag_, 'any'],
};
