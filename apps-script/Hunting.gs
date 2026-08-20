/** Phase 4 — HUNTING: submission, the hunter's calculator, and the management approval gate
 * (§8.1 · §8 pipeline · §4.2 · §14 · §26.1). A hunter submits the 33-column form; Management
 * or the Ops Head approve it with an account, a lister, an advertising type and a PKT deadline,
 * and that decision creates the listing_new task carrying ONLY the §8.2 limited 21 columns.
 *
 * REALITY WINS over §8.1 on the Approval Status vocabulary. The live dropdown holds SEVEN
 * values, six of them misspelled or trailing-spaced: 'LISITING APPROVED', 'APRROVED',
 * 'NOT APRROVED', 'Selected', 'Not Selected ', 'Already Tested ', 'Already on Account '.
 * The portal READS all seven tolerantly (trimmed, case-folded, whitespace-collapsed) and WRITES
 * only the canonical 'APPROVED' / 'NOT APPROVED' of §8.1. The raw cell text always travels back
 * as approval_status_raw, so a folded value ('Already Tested ') never loses its real meaning.
 *
 * Our Profit and ROI carry NO formula in the live sheet — every value there is typed by hand —
 * so the portal computes both through Brain.gs and writes numbers. The orphan 34th header
 * 'Campaign category' at BE1 belongs to no data row and is neither read nor written. */

// ---------- status vocabulary ----------
const HUNT_APPROVED = 'APPROVED';                 // §8.1 canonical — the only spellings we write
const HUNT_NOT_APPROVED = 'NOT APPROVED';
const HUNT_PENDING = '';                          // undecided: the live sheet leaves the cell blank
const HUNT_DECISIONS = [HUNT_APPROVED, HUNT_NOT_APPROVED];

/** Every value the live column B can hold, folded to the two canonical outcomes. 'Already
 * Tested'/'Already on Account' are dispositions, not approvals — they fold to NOT APPROVED for
 * the pipeline gate while approval_status_raw keeps the reason the sheet actually recorded. */
const HUNT_STATUS_READ_MAP = {
  'APPROVED': HUNT_APPROVED,
  'APRROVED': HUNT_APPROVED,
  'LISITING APPROVED': HUNT_APPROVED,
  'LISTING APPROVED': HUNT_APPROVED,
  'SELECTED': HUNT_APPROVED,
  'NOT APPROVED': HUNT_NOT_APPROVED,
  'NOT APRROVED': HUNT_NOT_APPROVED,
  'NOT SELECTED': HUNT_NOT_APPROVED,
  'ALREADY TESTED': HUNT_NOT_APPROVED,
  'ALREADY ON ACCOUNT': HUNT_NOT_APPROVED,
};

// ---------- the 33 columns, by the names Config.gs uses in HUNTING_COLS ----------
const HC_SELECTED_BY = 'Selected By';
const HC_APPROVAL = 'Approval Status';
const HC_COMMENTS = 'Comments';                   // column C — where the live sheet keeps review notes
const HC_DATE_ADDED = 'Date Added';
const HC_ACCOUNT = 'Account Selected';
const HC_LISTING_STATUS = 'Listing Status';
const HC_KEYWORD = 'Main Keyword Terapeak link';
const HC_SUPPLIER_1 = 'Product Link 1 Main supplier';
const HC_TITLE = 'Title';
const HC_IMAGE = 'IMAGE';                         // column S = =IMAGE(R{n}); never written by the portal
const HC_CATEGORY = 'Category';
const HC_SOURCE_PRICE = 'Source Price';
const HC_CALC_PRICE = 'E-Bey Caluclator + £4';    // the sheet's own misspelling — the intended sell price
const HC_CPC = 'CPC Selling Chance';
const HC_TOP_THREE = 'TOP THREE SALES';
const HC_KEYWORD_COMPETITORS = 'Total Competitors on main keyword';
const HC_PROFIT = 'Our Profit';
const HC_ROI = 'ROI';
const HC_COMMENT = 'Comment';                     // column AG — the hunter's own note

/** Columns the form may never set: the decision belongs to Management, the profit pair belongs
 * to Brain.gs, and Selected By / Date Added / IMAGE are stamped by the portal. */
const HUNT_PORTAL_OWNED = [HC_SELECTED_BY, HC_APPROVAL, HC_COMMENTS, HC_DATE_ADDED, HC_ACCOUNT,
  HC_LISTING_STATUS, HC_IMAGE, HC_PROFIT, HC_ROI];
const HUNT_REQUIRED = [HC_TITLE, HC_KEYWORD, HC_SUPPLIER_1, HC_SOURCE_PRICE, HC_CALC_PRICE];
// RL-6 column ownership: the only HUNTING_DB columns written after a submission lands.
const HUNT_DECISION_COLS = [HC_APPROVAL, HC_COMMENTS, HC_ACCOUNT, HC_LISTING_STATUS, HC_CPC];

/** The 33 headers as the live workbook spells them, index-aligned with HUNTING_COLS. The Portal
 * DB uses the cleaned names; the business sheet gets its own trailing spaces, embedded newlines
 * and typos back, because SheetBridge addresses columns by header and never creates one. */
/* Hunting sheet v3 (20 Aug): 'Ebay Link ' became 'Prime Ebay Link ', the price column dropped
 * its famous misspelling for 'Selling Price ', and five columns arrived (Comments given by,
 * High Price Link, both competitor prices, Campaign category). The Portal DB keeps its old
 * column names — this list is index-aligned with HUNTING_COLS, so only the SHEET spellings and
 * the appended pairs change. */
const HUNT_SHEET_HEADERS = ['Selected By ', 'Approval Status', 'Comments', 'Date Added ',
  'Account Selected', 'Listing Status', 'Seasonal', 'Main Keyword Terapeak link ',
  'Image Link of avg sold price ', 'Image Link of Zik analytics', 'Terapeak overview', 'Temu Link',
  'Product Link 1 Main supplier\n\n\nAdded in supplier sheet', 'Product Link 2\n\n', 'Product Link 3',
  'Prime Ebay Link ', 'Title', 'Image Link ', 'IMAGE ', 'DESCRIPTION', 'Category', 'Source Price',
  'Selling Price ', 'CPC Selling Chance', 'Sell Through', 'Competitors', 'TOP THREE SALES ',
  "Total Competitors on main keyword's search bar", 'Price Range ANALYSIS', 'Sold Unit  ANALYSIS   ',
  'Our Profit', 'ROI', 'Comment',
  'Comments given by ', 'High Price Link', 'Prime Competitor Selling Price',
  'Competitor High  Selling Price', 'Campaign category'];
const HUNT_SHEET_TABS = ['Main Sheet'];
// 'IMAGE ' is the workbook's only formula column — writing it would delete =IMAGE(R{n}).
const HUNT_MIRROR_WHITELIST = HUNT_SHEET_HEADERS.filter(function (h) { return h !== 'IMAGE '; });

/** §8.2 — the lister's 21 columns, keyed by the live 'UMAR- Selected Listing' header spellings,
 * paired with the hunting column each one is filled from. No profit, no ROI, no analysis. */
const HUNT_LIMITED_MAP = [
  ['Listing Update', null], ['Selected Date', HC_DATE_ADDED], ['Seasonal', 'Seasonal'],
  ['Main Keyword Terapeak link ', HC_KEYWORD], ['Image Link of avg sold price ', 'Image Link of avg sold price'],
  ['Image Link of Zik analytics', 'Image Link of Zik analytics'], ['Terapeak overview', 'Terapeak overview'],
  ['Temu Link', 'Temu Link'], ['Product Link 1 Main supplier\n\n\nAdded in supplier sheet', HC_SUPPLIER_1],
  ['Product Link 2\n\n', 'Product Link 2'], ['Product Link 3', 'Product Link 3'], ['Ebay Link ', 'Ebay Link'],
  ['Title', HC_TITLE], ['Image Link ', 'Image Link'], ['IMAGE ', null], ['DESCRIPTION', 'DESCRIPTION'],
  ['Category', HC_CATEGORY], ['Source Price', HC_SOURCE_PRICE], ['E-Bey Caluclator + £4', HC_CALC_PRICE],
  ['CPC Selling Chance', HC_CPC], ['CPC Update For Zain', null],
];
const HUNT_CENTRAL_TABS = ['UMAR- Selected Listing', 'Selected Listing'];
const HUNT_LISTER_WHITELIST = HUNT_LIMITED_MAP.map(function (p) { return p[0]; })
  .filter(function (h) { return h !== 'IMAGE '; });      // col O = =IMAGE(N{n})

// Dropdown values verbatim from the live sheet, header-echo placeholders excluded — those are
// pseudo-placeholders the sheet uses as a prompt, not decisions (they appear as data 48 times).
const HUNT_ADVERTISING_TYPES = ['General Dynamic', '75% Low DYN', '80% Medium DYN', '85% Medium DYN',
  '90% High CPC LOW', '95% High  CPC PRO', '100 % Strong ', 'General 10%', 'General 5%'];
const HUNT_CPC_PLACEHOLDER = 'CPC Selling Chance';
const HUNT_ACCOUNT_PLACEHOLDER = 'SELECTED ACCOUNTS';
const HUNT_LISTING_PENDING = 'Pending ';                 // column F dropdown, trailing space included

/** Reality over §4.1: the live 'Selected By' dropdown is Wahab · Noman · Fasieh · Irfan — two
 * Order Processors and the Ops Head hunt alongside the Product Hunter, and Yousaf (Team Lead)
 * hunts half-time per §4.1. All of them submit; nobody else does. */
const HUNT_SUBMIT_ROLES = ['Product Hunter', 'Team Lead', 'Ops Head', 'Management', 'Order Processor'];
const HUNT_QUEUE_ROLES = ['Management', 'Ops Head', 'Team Lead'];   // §4.3 — Team Lead views, never decides
const HUNT_LISTER_ROLES = ['Item Lister', 'Listing Manager', 'Team Lead'];

// §26.1 hunting criteria, thresholds and rule text verbatim from the Do's & Don'ts workbook.
const HUNT_CRITERIA = {
  general: {
    label: 'General campaign',
    competitorsMax: 20000,
    competitorsRule: 'Low competition with high sales — No more than 20,000 competitors on ebay of primary keyword',
    minPrice: 5,
    priceRule: 'Price should be min 5 pounds for general campaign',
    topThreeMin: 100,
    topThreeRule: 'Top 3 sellers on terapeak have sold more than 100 units in last 30 days',
  },
  priority: {
    label: 'Priority campaign',
    competitorsMax: 100000,
    competitorsRule: 'Item should be high selling on ebay and should give us consistent sales to all the competitors present on ebay — No More than 100,000 competitors on eBay',
    minPrice: 8,
    priceRule: 'Item price should be minimum 8 pounds',
    topThreeMin: 200,
    topThreeRule: 'Top 3 sellers on terapeak sold more than 200 units in last 30 days',
  },
};

const HUNT_MAX_CELL = 5000;
const HUNT_MAX_COMMENT = 2000;

// ---------- submission ----------
function actionSubmitHunt_(payload, ctx) {
  if (HUNT_SUBMIT_ROLES.indexOf(ctx.user.role) < 0 && !isMgmt_(ctx.user.role, ctx.ident.email)) {
    throw new Error('this role does not submit hunts');
  }

  const cols = huntColumnsFromPayload_(payload);
  HUNT_REQUIRED.forEach(function (c) {
    if (String(cols[c] || '').trim() === '') throw new Error('required field missing: ' + c);
  });
  // Both price fields are typed as free text in the live sheet ('3.02 - 3.30'), but a value with
  // no digit at all is not a price and would silently cost the calculator its only inputs.
  if (huntFirstNumber_(cols[HC_CALC_PRICE]) === null) throw new Error('a numeric price is required: ' + HC_CALC_PRICE);
  if (huntFirstNumber_(cols[HC_SOURCE_PRICE]) === null) throw new Error('a numeric price is required: ' + HC_SOURCE_PRICE);

  const advertising = huntAdvertisingType_(cols[HC_CPC], false);
  cols[HC_CPC] = advertising;
  cols[HC_SELECTED_BY] = String(ctx.user.name || ctx.ident.email).slice(0, 200);
  cols[HC_DATE_ADDED] = huntPktDate_();
  cols[HC_APPROVAL] = HUNT_PENDING;
  cols[HC_COMMENTS] = '';
  cols[HC_ACCOUNT] = '';                 // §8: the account is chosen by Management at approval
  cols[HC_LISTING_STATUS] = '';
  cols[HC_IMAGE] = '';

  // No account is picked yet, so the fee map falls back to DEFAULT — the projection is a
  // hunting-stage estimate, recomputed against the real account's ⚙ Config once one is chosen.
  const calc = huntCalculate_(cols, payload.shipping);
  cols[HC_PROFIT] = calc.profit === null ? '' : calc.profit;
  cols[HC_ROI] = calc.roi === null ? '' : calc.roi;

  const huntId = 'H' + Utilities.getUuid().slice(0, 8);
  const stamp = now_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = huntSheet_();
    const head = huntHeaders_(sh);
    const row = head.map(function (h) {
      if (h === 'hunt_id') return huntId;
      if (h === 'hunter_email') return ctx.ident.email;
      if (h === 'ts') return stamp;
      return Object.prototype.hasOwnProperty.call(cols, h) ? cols[h] : '';
    });
    sh.appendRow(row);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'SUBMIT_HUNT', huntId, '', String(cols[HC_TITLE]).slice(0, 200),
    'source ' + cols[HC_SOURCE_PRICE] + ' · price ' + cols[HC_CALC_PRICE] + ' · profit ' + cols[HC_PROFIT]);

  const flags = huntCriteriaFlags_(cols);
  notifyManagement_('Hunt submitted',
    ctx.user.name + ' submitted "' + String(cols[HC_TITLE]).slice(0, 120) + '" for review' +
    (flags.length ? ' — ' + flags.length + ' criteria flag(s)' : ''), 'hunt:' + huntId);

  const mirror = huntMirrorAppend_(cols, ctx.ident.email);
  return {
    hunt_id: huntId,
    approval_status: HUNT_PENDING,
    submitted_at: stamp,
    calculator: calc.detail,          // §4.2 exception: the hunter's own projected profit
    criteria_flags: flags,
    mirror: mirror,
  };
}

// ---------- the hunter's own list (§4.2) ----------
/** Own submissions only. The record keeps Our Profit / ROI because they are this hunter's OWN
 * calculator output — the one profit figure §4.2 grants a hunter — so it is deliberately not
 * passed through stripForRole_, which would delete exactly that. No other hunter's row, and no
 * live account profit, is ever reachable from here. */
function actionMyHunts_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const want = huntStatusFilter_(payload.status);
  const rows = [];
  readTab_('HUNTING_DB').forEach(function (r) {
    if (normalizeEmail(r.hunter_email) !== me) return;
    const rec = huntRecord_(r);
    if (want !== null && rec.approval_status !== want) return;
    rows.push(rec);
  });
  rows.sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); });
  return { hunts: rows, count: rows.length };
}

// ---------- the review queue (§8) ----------
function actionHuntQueue_(payload, ctx) {
  if (HUNT_QUEUE_ROLES.indexOf(ctx.user.role) < 0 && !isMgmt_(ctx.user.role, ctx.ident.email)) {
    throw authErr_('not a hunt reviewer', ctx.ident.email);
  }
  const want = payload.status === undefined ? HUNT_PENDING : huntStatusFilter_(payload.status);
  const names = {};
  readTab_('USERS').forEach(function (u) { names[normalizeEmail(u.email)] = String(u.name || u.email); });

  const rows = [];
  readTab_('HUNTING_DB').forEach(function (r) {
    const rec = huntRecord_(r);
    if (want !== null && rec.approval_status !== want) return;
    rec.hunter_name = names[normalizeEmail(rec.hunter_email)] || String(rec.hunter_email || '');
    rows.push(rec);
  });
  rows.sort(function (a, b) { return String(a.ts).localeCompare(String(b.ts)); });   // oldest waits longest

  return {
    hunts: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    count: rows.length,
    can_decide: isMgmt_(ctx.user.role, ctx.ident.email),
    advertising_types: HUNT_ADVERTISING_TYPES,
  };
}

// ---------- the decision (§8 · §14) ----------
/** §4.3: approving hunted products and assigning them is Management (and the Ops Head, §4.4).
 * Team Lead sees the queue and decides nothing. APPROVE needs an account, a lister, an
 * advertising type and a PKT deadline; REJECT needs a comment. */
function actionDecideHunt_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not a hunt approver', ctx.ident.email);

  const decision = huntCanonStatus_(payload.decision);      // tolerant on input, canonical on write
  if (HUNT_DECISIONS.indexOf(decision) < 0) throw new Error('decision must be APPROVED or NOT APPROVED');
  const comment = String(payload.comment || '').trim().slice(0, HUNT_MAX_COMMENT);
  const approving = decision === HUNT_APPROVED;
  if (!approving && !comment) throw new Error('a comment is mandatory when a hunt is not approved');

  let account = '', advertising = '', deadline = '', lister = null, taskId = '';
  if (approving) {
    account = huntAccount_(payload.account);
    advertising = huntAdvertisingType_(payload.advertising_type, true);
    deadline = taskPktIso_(payload.deadline_pkt);
    if (!deadline) throw new Error('deadline_pkt required to approve');
    lister = huntResolveLister_(payload.lister_email);      // resolved BEFORE the row is marked
    taskId = 'T' + Utilities.getUuid().slice(0, 8);
  }

  const stamp = now_();
  let rec = null, limited = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = huntSheet_();
    const found = huntFind_(sh, payload.hunt_id);
    rec = huntRecord_(found.rec);
    if (rec.approval_status !== HUNT_PENDING) throw new Error('hunt already decided');

    const patch = {};
    patch[HC_APPROVAL] = decision;
    if (comment) patch[HC_COMMENTS] = comment;
    if (approving) {
      patch[HC_ACCOUNT] = account;
      patch[HC_CPC] = advertising;
      patch[HC_LISTING_STATUS] = HUNT_LISTING_PENDING;
    }
    huntWrite_(sh, found, patch);

    if (approving) {
      rec[HC_ACCOUNT] = account;
      rec[HC_CPC] = advertising;
      limited = huntLimitedPayload_(rec);
      // The listing task is written inside this same lock: an approved hunt with no task would
      // strand the item, and TASKS carries no structured payload column, so the §8.2 subset
      // rides in `details` as JSON for the lister screen to render.
      huntAppendTask_({
        task_id: taskId, type: 'listing_new', account: account, item_id: '',
        title: String(rec[HC_TITLE] || '').slice(0, 400),
        details: JSON.stringify({ hunt_id: rec.hunt_id, limited: limited }),
        assigned_by: ctx.ident.email, assigned_to: lister.email,
        deadline_pkt: deadline, status: TASK_STATUS_PENDING, created_at: stamp, updated_at: stamp,
      });
    }
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'DECIDE_HUNT', rec.hunt_id, HUNT_PENDING, decision,
    approving ? account + ' · ' + lister.email + ' · ' + advertising + ' · due ' + deadline + ' · task ' + taskId
      : comment.slice(0, 200));

  const title = String(rec[HC_TITLE] || rec.hunt_id).slice(0, 120);
  const mirror = huntMirrorDecision_(rec, decision, comment, approving ? account : '', advertising, ctx.ident.email);
  let central = { ok: false, reason: 'not applicable' };

  if (approving) {
    central = huntCopyToCentral_(account, limited, ctx.ident.email);
    notify_(rec.hunter_email, 'Hunt approved',
      '🔵 Your hunt "' + title + '" · ' + account + ' — approved as ' + advertising + '. ' + lister.name +
      ' lists it next; you will see it move through the pipeline.', 'hunt:' + rec.hunt_id);
    notify_(lister.email, 'Task assigned',
      '🔵 New listing task · ' + account + ' — "' + title + '" (' + advertising + '), due ' + deadline +
      ' (Pakistan time). The full product pack is inside the task → open My tasks.', 'task:' + taskId);
  } else {
    notify_(rec.hunter_email, 'Hunt not approved',
      '🟠 Your hunt "' + title + '" — not approved. Reason: ' + comment +
      '. Read the reason before hunting the next one; it counts toward your approval rate.', 'hunt:' + rec.hunt_id);
  }

  return {
    hunt_id: rec.hunt_id, approval_status: decision, decided_at: stamp,
    task_id: taskId, assigned_to: approving ? lister.email : '', account: account,
    advertising_type: advertising, deadline_pkt: deadline,
    mirror: mirror, central_copy: central,
  };
}

// ---------- Portal DB access ----------
function huntSheet_() { return getPortalDb_(false).getSheetByName('HUNTING_DB'); }

function huntHeaders_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h); });
}

function huntFind_(sh, huntId) {
  const id = String(huntId || '').trim();
  if (!id) throw new Error('hunt_id required');
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(function (h) { return String(h); });
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== id) continue;
    const rec = {};
    head.forEach(function (h, c) { rec[h] = vals[i][c]; });
    return { row: i + 1, head: head, rec: rec };
  }
  throw new Error('hunt not found');
}

/** RL-6: a write to any HUNTING_DB column outside the decision whitelist throws. */
function huntWrite_(sh, found, patch) {
  Object.keys(patch).forEach(function (k) {
    if (HUNT_DECISION_COLS.indexOf(k) < 0) throw new Error('write outside the HUNTING_DB whitelist: ' + k);
    const c = found.head.indexOf(k);
    if (c < 0) throw new Error('unknown HUNTING_DB column: ' + k);
    sh.getRange(found.row, c + 1).setValue(patch[k]);
  });
}

/** Header-addressed TASKS append so a column added to DB_TABS.TASKS later never lands a value
 * in the wrong place. Called with the hunt lock held — it takes no lock of its own. */
function huntAppendTask_(fields) {
  const sh = getPortalDb_(false).getSheetByName('TASKS');
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h); });
  sh.appendRow(head.map(function (h) {
    return Object.prototype.hasOwnProperty.call(fields, h) ? fields[h] : '';
  }));
}

// ---------- records ----------
function huntRecord_(r) {
  const rec = {
    hunt_id: String(r.hunt_id || ''),
    hunter_email: String(r.hunter_email || ''),
    ts: huntCellOut_(r.ts),
  };
  HUNTING_COLS.forEach(function (c) { rec[c] = huntCellOut_(r[c]); });
  rec.approval_status_raw = rec[HC_APPROVAL];
  rec.approval_status = huntCanonStatus_(rec[HC_APPROVAL]);
  rec.criteria_flags = huntCriteriaFlags_(rec);
  return rec;
}

function huntCellOut_(v) {
  if (v instanceof Date) return taskPktIso_(v);
  return v === null || v === undefined ? '' : v;
}

/** Folds the seven live spellings (and our own two) to a canonical outcome; anything else, and
 * the header-echo placeholder, reads as undecided rather than as a decision. */
function huntCanonStatus_(raw) {
  const key = String(raw === null || raw === undefined ? '' : raw)
    .replace(/\s+/g, ' ').trim().toUpperCase();
  if (!key) return HUNT_PENDING;
  return HUNT_STATUS_READ_MAP[key] || HUNT_PENDING;
}

function huntStatusFilter_(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const s = String(value).trim();
  if (s.toLowerCase() === 'all') return null;
  if (s.toLowerCase() === 'pending') return HUNT_PENDING;
  const canon = huntCanonStatus_(s);
  if (HUNT_DECISIONS.indexOf(canon) < 0) throw new Error('unknown status filter');
  return canon;
}

// ---------- form intake ----------
let huntColIndex_ = null;
function huntColFor_(key) {
  if (!huntColIndex_) {
    huntColIndex_ = {};
    HUNTING_COLS.forEach(function (c) { huntColIndex_[huntNormKey_(c)] = c; });
  }
  return huntColIndex_[huntNormKey_(key)] || '';
}
function huntNormKey_(s) {
  return String(s === null || s === undefined ? '' : s).toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Accepts payload.columns (or the payload itself) keyed by any spelling of the 33 column names.
 * A portal-owned column arriving with a value is refused rather than ignored — a form that tries
 * to set its own Approval Status or Our Profit is a bug or an attack, not a preference. */
function huntColumnsFromPayload_(payload) {
  const src = (payload && typeof payload.columns === 'object' && payload.columns) ? payload.columns : (payload || {});
  const out = {};
  HUNTING_COLS.forEach(function (c) { out[c] = ''; });
  Object.keys(src).forEach(function (k) {
    const col = huntColFor_(k);
    if (!col) return;
    const raw = src[k];
    if (raw === null || raw === undefined) return;
    if (typeof raw === 'object' && !(raw instanceof Date)) throw new Error('unsupported value for ' + col);
    const v = raw instanceof Date ? raw : String(raw).trim().slice(0, HUNT_MAX_CELL);
    if (v === '') return;
    if (HUNT_PORTAL_OWNED.indexOf(col) >= 0) throw new Error('column is set by the portal, not by the form: ' + col);
    out[col] = v;
  });
  return out;
}

function huntAdvertisingType_(value, required) {
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s || huntNormKey_(s) === huntNormKey_(HUNT_CPC_PLACEHOLDER)) {
    if (required) throw new Error(SAFE_ERROR_PREFIX + 'advertising type required to approve');
    return '';
  }
  for (let i = 0; i < HUNT_ADVERTISING_TYPES.length; i++) {
    if (huntNormKey_(HUNT_ADVERTISING_TYPES[i]) === huntNormKey_(s)) return HUNT_ADVERTISING_TYPES[i];
  }
  throw new Error(SAFE_ERROR_PREFIX + 'unknown advertising type');
}

/** Accounts are data rows, never hardcoded (§3): the value is checked against CONNECTIONS when
 * any account rows exist, and accepted as typed while the registry is still empty (§6 graceful
 * degradation). The live dropdown offers combined selections ('SAIF/ AMNA'), so each '/' part is
 * checked separately — a combined choice simply has no single Central workbook to copy into. */
function huntAccount_(value) {
  const s = String(value || '').trim().slice(0, 200);
  if (!s) throw new Error('account required to approve');
  if (huntNormKey_(s) === huntNormKey_(HUNT_ACCOUNT_PLACEHOLDER)) throw new Error('account required to approve');
  const known = [];
  readTab_('CONNECTIONS').forEach(function (r) {
    if (String(r.scope || '').trim() !== 'account') return;
    const n = huntNormKey_(r.account_name);
    if (n && known.indexOf(n) < 0) known.push(n);
  });
  if (!known.length) return s;
  const parts = s.split('/');
  for (let i = 0; i < parts.length; i++) {
    const want = huntNormKey_(parts[i]);
    if (!want) continue;
    const hit = known.some(function (k) { return k === want || k.indexOf(want) >= 0 || want.indexOf(k) >= 0; });
    if (!hit) throw new Error('unknown account');
  }
  return s;
}

function huntResolveLister_(email) {
  const want = normalizeEmail(email || '');
  if (!want) throw new Error(SAFE_ERROR_PREFIX + 'lister_email required to approve');
  let found = null;
  readTab_('USERS').forEach(function (u) {
    if (found) return;
    if (normalizeEmail(u.email) !== want) return;
    if (String(u.status) !== 'approved') throw new Error(SAFE_ERROR_PREFIX + 'lister is not an approved portal user');
    if (HUNT_LISTER_ROLES.indexOf(String(u.role)) < 0) throw new Error(SAFE_ERROR_PREFIX + 'that user does not list');
    found = { email: String(u.email), name: String(u.name || u.email) };
  });
  if (!found) throw new Error(SAFE_ERROR_PREFIX + 'lister is not an approved portal user');
  return found;
}

// ---------- the calculator (§4.2 · Brain v17) ----------
function huntCalculate_(cols, shipping) {
  if (typeof brainProjectedProfit_ !== 'function') {
    return { profit: null, roi: null, detail: { ok: false, reason: 'calculator not deployed' } };
  }
  let res = null;
  try {
    res = brainProjectedProfit_({
      soldFor: cols[HC_CALC_PRICE],
      sourcePrice: cols[HC_SOURCE_PRICE],
      shipping: shipping,
      account: '',
      category: cols[HC_CATEGORY],
    });
  } catch (e) {
    // A hunt is never lost to an unreadable number: it stores with the profit pair blank, exactly
    // as the live sheet already holds rows whose Our Profit was never filled in.
    return { profit: null, roi: null, detail: { ok: false, reason: 'could not be calculated', note: String(e && e.message || e) } };
  }
  // The live ROI column is number-formatted '0%', so a fraction is what that cell means: 0.39
  // displays as 39%. Writing 39 there would read as 3900% on Hasib's sheet.
  const roi = (res.roiPct === null || res.roiPct === undefined) ? null : Math.round(res.roiPct) / 100;
  res.roiFraction = roi;
  return { profit: res.profit, roi: roi, detail: res };
}

// ---------- §26.1 criteria (advisory, never blocking) ----------
/** The live sheet stores competitor counts as 'N results for <keyword>' and top-three sales as
 * '330 / 229 / 212' or '£53.08 - 47.54 - 10 .68', so every check reports what it could read and
 * says so when it could read nothing. Management still decides — these are flags, not a gate. */
function huntCriteriaFlags_(cols) {
  const cpc = String(cols[HC_CPC] || '').trim();
  const general = !cpc || /^general/i.test(cpc);
  const c = general ? HUNT_CRITERIA.general : HUNT_CRITERIA.priority;
  const flags = [];
  if (!cpc) flags.push({ rule: 'No CPC Selling Chance chosen — General campaign criteria applied', value: '', criteria: c.label });

  const price = huntFirstNumber_(cols[HC_CALC_PRICE]);
  if (price !== null && price < c.minPrice) flags.push({ rule: c.priceRule, value: price, criteria: c.label });

  const comp = huntFirstNumber_(cols[HC_KEYWORD_COMPETITORS]);
  if (comp !== null && comp > c.competitorsMax) flags.push({ rule: c.competitorsRule, value: comp, criteria: c.label });

  const top = huntAllNumbers_(cols[HC_TOP_THREE]).slice(0, 3);
  if (top.length) {
    const weakest = Math.min.apply(null, top);
    if (weakest < c.topThreeMin) flags.push({ rule: c.topThreeRule, value: weakest, criteria: c.label });
  } else if (String(cols[HC_TOP_THREE] || '').trim() !== '') {
    flags.push({ rule: c.topThreeRule, value: 'could not be read automatically', criteria: c.label });
  }
  return flags;
}

function huntFirstNumber_(v) {
  const m = String(v === null || v === undefined ? '' : v).replace(/[£$,]/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function huntAllNumbers_(v) {
  const m = String(v === null || v === undefined ? '' : v).replace(/[£$,]/g, '').match(/\d+(?:\.\d+)?/g);
  return m ? m.map(Number) : [];
}
function huntPktDate_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd'); }

// ---------- the external mirror (SheetBridge, shadow-safe) ----------
/** Values keyed by the sheet's own header spellings; blanks are dropped so an append never
 * overwrites anything with emptiness, and 'IMAGE ' never travels at all. */
function huntSheetHeader_(portalCol) {
  const i = HUNTING_COLS.indexOf(portalCol);
  if (i < 0) throw new Error('not a hunting column: ' + portalCol);
  return HUNT_SHEET_HEADERS[i];
}

function huntMirrorValues_(cols) {
  const out = {};
  HUNTING_COLS.forEach(function (c, i) {
    const header = HUNT_SHEET_HEADERS[i];
    if (header === 'IMAGE ') return;
    const v = cols[c];
    if (v === '' || v === null || v === undefined) return;
    out[header] = v;
  });
  return out;
}

function huntMirrorAppend_(cols, actor) {
  if (typeof bridgeAppendRow_ !== 'function') return { ok: false, reason: 'bridge not deployed' };
  try {
    return bridgeAppendRow_(
      { scope: 'global', kind: 'hunting', tab: HUNT_SHEET_TABS, expect: HUNT_SHEET_HEADERS },
      huntMirrorValues_(cols), HUNT_MIRROR_WHITELIST, actor);
  } catch (e) {
    logActivity_(actor, 'HUNT_MIRROR_FAIL', 'hunting sheet', '', '', String(e && e.message || e));
    return { ok: false, reason: 'mirror failed' };   // the submission is stored either way
  }
}

/** The business sheet has no hunt_id column and the contract forbids adding one, so the decision
 * is matched back by Title. An ambiguous or missing match refuses to write and says so rather
 * than guessing a row — the Portal DB stays the source of truth. */
function huntMirrorDecision_(rec, decision, comment, account, advertising, actor) {
  if (typeof bridgeUpdateRow_ !== 'function') return { ok: false, reason: 'bridge not deployed' };
  const values = {};
  values[huntSheetHeader_(HC_APPROVAL)] = decision;
  if (comment) values[huntSheetHeader_(HC_COMMENTS)] = comment;
  if (account) {
    values[huntSheetHeader_(HC_ACCOUNT)] = account;
    values[huntSheetHeader_(HC_LISTING_STATUS)] = HUNT_LISTING_PENDING;
    if (advertising) values[huntSheetHeader_(HC_CPC)] = advertising;
  }
  try {
    return bridgeUpdateRow_(
      { scope: 'global', kind: 'hunting', tab: HUNT_SHEET_TABS, expect: HUNT_SHEET_HEADERS },
      huntSheetHeader_(HC_TITLE), rec[HC_TITLE],
      values, HUNT_MIRROR_WHITELIST, actor);
  } catch (e) {
    logActivity_(actor, 'HUNT_MIRROR_FAIL', 'hunting sheet ' + rec.hunt_id, '', '', String(e && e.message || e));
    return { ok: false, reason: 'mirror failed' };
  }
}

// ---------- §8.2 the limited 21 columns ----------
/** Listing.gs owns this shape; its helper wins when it is deployed, and this fallback builds the
 * same 21 columns from §8.2 so an approval never waits on another module. */
function huntLimitedPayload_(rec) {
  if (typeof listingBuildLimitedPayload_ === 'function') return listingBuildLimitedPayload_(rec);
  const out = {};
  HUNT_LIMITED_MAP.forEach(function (pair) {
    const header = pair[0], from = pair[1];
    if (header === 'Listing Update') { out[header] = HUNT_LISTING_PENDING; return; }
    out[header] = from ? (rec[from] === undefined || rec[from] === null ? '' : rec[from]) : '';
  });
  return out;
}

/** §8.2 — the same subset lands in the account's Central 'UMAR- Selected Listing' tab. Blanks are
 * dropped, so the formula column O and Zain's own 'CPC Update For Zain' are never touched. */
function huntCopyToCentral_(account, limited, actor) {
  if (typeof listingCopyToCentral_ === 'function') return listingCopyToCentral_(account, limited, actor);
  if (typeof bridgeAppendRow_ !== 'function') return { ok: false, reason: 'bridge not deployed' };
  const values = {};
  Object.keys(limited || {}).forEach(function (k) {
    const v = limited[k];
    if (v === '' || v === null || v === undefined) return;
    values[k] = v;
  });
  try {
    return bridgeAppendRow_(
      { scope: 'account', account: account, kind: 'central', tab: HUNT_CENTRAL_TABS, expect: HUNT_LISTER_WHITELIST },
      values, HUNT_LISTER_WHITELIST, actor);
  } catch (e) {
    logActivity_(actor, 'HUNT_CENTRAL_FAIL', account, '', '', String(e && e.message || e));
    return { ok: false, reason: 'copy failed' };
  }
}

const ACTIONS_HUNTING = {
  submitHunt: [actionSubmitHunt_, 'any'],
  myHunts:    [actionMyHunts_, 'any'],
  huntQueue:  [actionHuntQueue_, 'any'],   // reviewers gated inside
  decideHunt: [actionDecideHunt_, 'any'],  // Management / Ops Head gated inside
};
