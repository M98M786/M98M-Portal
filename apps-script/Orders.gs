/** Phase 5 — ORDER PROCESSING (§10). The processor's daily orders workspace (§10.1), the two
 * writes that workspace exists for (purchase + tracking), the dispatch dashboard (§10.2), the
 * Returns & INAD feed (§10.3) and the REPLACEMENT tab (§10.4). Every touch of a live workbook
 * goes through SheetBridge, header-addressed, inside the §10.1 write whitelist.
 *
 * REALITY WINS over the spec more here than anywhere else in the portal:
 *  · §10.1 writes 'Order number (eBay)' and 'Order Number (AliExpress)'. The live tabs carry
 *    'Order number' (col B) and 'Order Number' (col M) — the same letters in a different case,
 *    no qualifiers, and they normalize to the SAME string. They are told apart by exact header
 *    spelling first and by column order second (the earlier one is eBay's); a case-blind match
 *    resolves to both, and the bridge refuses it rather than guess.
 *  · The 7-column Post-to block floats across 14 different positions and is absent from 7 tabs
 *    where 'Full Address' (E) holds literal pasted text — so no column is ever addressed by
 *    letter, and a missing Post-to field is simply absent from the payload.
 *  · REPLACEMENT has no 'New Ali Link' column, so everything from I shifts one left. A
 *    'New Ali Link' write there comes back in skippedMissing — the column is never created.
 *  · Daily tabs keep a TOTALS row at row 2 (P2 literally reads 'Delivery Status'); it carries
 *    no eBay order number and is excluded from every list, count and match.
 *  · Header trailing spaces exist on wide tabs ('Image Link ', 'Cost ') and not on narrow ones,
 *    so canonical output keys use the untrimmed-free spelling and inputs match on both.
 *  · '_OrderItems', '_SyncKeys' and 'INTRUCTION SHEET' (real name, missing S — a raw 80-column
 *    eBay export holding buyer emails and phones) are sync-owned: never written, never read.
 *
 * §4.2/RL-4: 'Order Earning' is a profit field. Processors keep it as they have it today unless
 * CONFIG 'hide_order_earning_from_processors' is 'true' ([OPEN-3]); every other restricted role
 * never receives it. Buyer PII reaches Order Processors, CS and Management only. Both rules are
 * enforced by BUILDING the payload from a gated field list and then asserting the result. */

const ORDERS_TZ_PKT = 'Asia/Karachi';

// Tab names are English month names ('1 July', '8 August'), sometimes two days ('5-6 JULY',
// '12-13 July'). Spelled here rather than formatted, so a script locale can never rename a tab.
const ORDERS_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const ORDERS_REPLACEMENT_TAB = 'REPLACEMENT';
const ORDERS_RETURNS_TAB = 'Returns & INAD';
// Read-blocked as well as write-blocked: the eBay export tab carries buyer emails and phones.
const ORDERS_SYNC_OWNED = ['_OrderItems', '_SyncKeys', 'INTRUCTION SHEET', 'INSTRUCTION SHEET'];

// §10.1 — the ONLY columns the portal may write on an order tab. Trailing-space variants
// normalize to the same names, so one spelling of each covers wide and narrow tabs alike.
// The bridge's whitelist check is case- and punctuation-blind, which cannot separate the eBay
// 'Order number' from the AliExpress 'Order Number'; ordersWriteRow_ therefore also checks every
// key against this list EXACTLY, so the buyer's order number can never be a write target.
const ORDERS_WRITABLE_COLS = ['Cost', 'Order Number', 'Tracking number', 'Email', 'Delivery Status', 'New Ali Link'];

// Header hints for the bridge's header-row finder (row 1 on order tabs, row 1 on Returns).
const ORDERS_EXPECT_DAY = ['Order number', 'Item title', 'Sold for', 'Full Address', 'Order Earning',
  'Ali Express Link', 'Quantity', 'Variation details', 'Cost', 'Order Number', 'Tracking number',
  'Email', 'Delivery Status', 'Supplier Link 1'];
const ORDERS_RETURNS_COLS = ['Date Added', 'Day Tab', 'Order No', 'Item Title', 'Buyer', 'Type',
  'Reason (eBay)', 'Explanation', 'Status', 'Refund Amount', 'Last Updated', 'Notes'];

/** The order-tab fields the portal ever emits, keyed by the sheet's own header names.
 * `exact` lists the live spellings seen across wide and narrow tabs; `ordinal` disambiguates
 * the two 'Order number' columns when exact spelling alone cannot (index within the group of
 * columns sharing that normalized name — 0 = eBay's col B, 1 = AliExpress's col M). */
const ORDERS_ROW_FIELDS = [
  { key: 'Image Link', exact: ['Image Link ', 'Image Link'] },
  { key: 'Order number', exact: ['Order number'], ordinal: 0 },
  { key: 'Item title', exact: ['Item title'] },
  { key: 'Sold for', exact: ['Sold for'] },
  { key: 'Full Address', exact: ['Full Address'], pii: true },
  { key: 'Order Earning', exact: ['Order Earning'], profit: true },
  { key: 'Ali Express Link', exact: ['Ali Express Link ', 'Ali Express Link'] },
  { key: 'New Ali Link', exact: ['New Ali Link'] },
  { key: 'Quantity', exact: ['Quantity'] },
  { key: 'Variation details', exact: ['Variation details'] },
  { key: 'Cost', exact: ['Cost ', 'Cost'] },
  { key: 'Order Number', exact: ['Order Number'], ordinal: 1 },
  { key: 'Tracking number', exact: ['Tracking number'] },
  { key: 'Email', exact: ['Email'], pii: true },
  { key: 'Delivery Status', exact: ['Delivery Status'] },
  { key: 'Supplier Link 1', exact: ['Supplier Link 1'] },
  { key: 'Supplier Link 2', exact: ['Supplier Link 2'] },
  { key: 'Supplier Link 3', exact: ['Supplier Link 3'] },
  { key: 'Post to name', exact: ['Post to name'], pii: true },
  { key: 'Post to address 1', exact: ['Post to address 1'], pii: true },
  { key: 'Post to address 2', exact: ['Post to address 2'], pii: true },
  { key: 'Post to city', exact: ['Post to city'], pii: true },
  { key: 'Post to county', exact: ['Post to county'], pii: true },
  { key: 'Post to postcode', exact: ['Post to postcode'], pii: true },
  { key: 'Post to phone', exact: ['Post to phone'], pii: true },
];
// Col F is the sheet's own =IMAGE(A#) formula and reads back empty, so it is not emitted; the
// unheaded carrier-note column that follows Delivery Status is emitted under the bridge's own
// positional key ('col:Q' on today's tabs) because it genuinely has no name to preserve.

// The live data-validation list on the Delivery Status column, verbatim. The first token of the
// sheet's dropdown ('Delivery Status') is the row-2 pseudo-header and is never writable.
const ORDERS_DELIVERY_STATUS = ['Pending', 'Complete', 'Tracking', 'Custom Stuck', 'Delivered',
  'Left China', 'IN UK', 'Contact Customer/ Late'];
// The REPLACEMENT tab's dropdown appends this one extra token.
const ORDERS_DELIVERY_STATUS_REPLACEMENT = 'REPLACEMENT';
// Wahab's tracking upload is what moves a row off 'Pending'; 'Tracking' is the dropdown token
// that records it.
const ORDERS_STATUS_TRACKING = 'Tracking';
// Dispatch is evidenced by a tracking number or by any status past 'Pending'.
const ORDERS_DISPATCHED_STATUS = ['Tracking', 'Left China', 'IN UK', 'Custom Stuck', 'Delivered',
  'Complete', 'Contact Customer/ Late'];

const ORDERS_RETURNS_TYPES = ['INAD', 'Return'];
const ORDERS_RETURNS_STATUS = ['Opened', 'Sent by Buyer', 'Waiting for Refund', 'Refunded'];

// §10.2 tile and table labels, verbatim from the live Dashboard tab.
const ORDERS_TILE_MONTH = 'Orders This Month';
const ORDERS_TILE_AWAITING = 'Awaiting Dispatch';
const ORDERS_TILE_DUE = 'Due in Next 3 Days';
const ORDERS_TILE_OVERDUE = 'OVERDUE NOW';
const ORDERS_ROW_DISPATCHED = 'Dispatched';
const ORDERS_ROW_SAFE = 'Awaiting (safe)';
const ORDERS_ROW_DUE = 'Due ≤3 days';
const ORDERS_ROW_OVERDUE = 'Overdue';
const ORDERS_DUE_WINDOW_DAYS = 3;                    // the tile is named for it — not configurable

// Optional CONFIG keys (absent = these documented defaults).
// 'orders_dispatch_sla_days': days from the order's day tab to its ship-by deadline. 5 is the
// value that reproduces the live dashboard checkpoint of 8 Aug 2026 (22 awaiting, 0 due ≤3 days,
// 0 overdue, with the awaiting rows sitting on the 7 and 8 August tabs). The daily tabs carry no
// date column at all, so the tab itself is the order date.
const ORDERS_SLA_DAYS_DEFAULT = 5;
// 'orders_tracking_uploader': the email of whoever uploads tracking to eBay (Wahab today).
// Empty = any Order Processor may mark a row uploaded. Staff are data rows, never hardcoded.
const ORDERS_UPLOADER_KEY = 'orders_tracking_uploader';
const ORDERS_SLA_KEY = 'orders_dispatch_sla_days';

const ORDERS_READ_ROLES = ['Order Processor', 'CS', 'Team Lead'];
const ORDERS_WRITE_ROLES = ['Order Processor'];
const ORDERS_DAY_LIMIT = 400;                        // biggest real day tab is 94 rows
const ORDERS_RETURNS_LIMIT = 500;
const ORDERS_DUE_ROWS_MAX = 60;
const ORDERS_MAX_ACCOUNTS = 8;
const ORDERS_DASH_CACHE_SECONDS = 300;
const ORDERS_SWEEP_BUDGET_MS = 240000;               // stop before a time trigger is killed
const ORDERS_MAX_TEXT = 200;
const ORDERS_MAX_LINK = 500;
const ORDERS_MAX_COST = 100000;
const ORDERS_OVERDUE_REF = 'dispatch-overdue:';

// ---------- dates (PKT — §10 names no UK clock, and the processors work the Pakistan day) ----------
function ordersToday_() { return Utilities.formatDate(new Date(), ORDERS_TZ_PKT, 'yyyy-MM-dd'); }

function ordersYmd_(value) {
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const p = ordersSplitYmd_(s);
  return p && p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= ordersMonthDays_(p.y, p.m) ? s : '';
}

function ordersSplitYmd_(ymd) {
  const s = String(ymd || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return { y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) };
}

function ordersPad2_(n) { return (n < 10 ? '0' : '') + n; }
function ordersMonthDays_(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function ordersMakeYmd_(y, m, d) { return y + '-' + ordersPad2_(m) + '-' + ordersPad2_(d); }

/** Noon anchors — day arithmetic never crosses a DST edge and never needs a timezone. */
function ordersAddDays_(ymd, n) {
  const ms = Date.parse(ymd + 'T12:00:00Z') + n * 86400000;
  return Utilities.formatDate(new Date(ms), 'UTC', 'yyyy-MM-dd');
}
function ordersDaysBetween_(fromYmd, toYmd) {
  return Math.round((Date.parse(toYmd + 'T12:00:00Z') - Date.parse(fromYmd + 'T12:00:00Z')) / 86400000);
}

/** Tab-name candidates for one date. Combined tabs really exist ('5-6 JULY', '12-13 July'), so
 * both neighbours are offered — the single-day name first, because it is the common case. */
function ordersDayTabCandidates_(ymd) {
  const p = ordersSplitYmd_(ymd);
  if (!p) return [];
  const month = ORDERS_MONTH_NAMES[p.m - 1];
  const out = [p.d + ' ' + month];
  if (p.d > 1) out.push((p.d - 1) + '-' + p.d + ' ' + month);
  if (p.d < ordersMonthDays_(p.y, p.m)) out.push(p.d + '-' + (p.d + 1) + ' ' + month);
  return out;
}

/** The bridge accepts a UNIQUE containment match when no tab matches exactly, which would let
 * '8 August' land on '18 August' in a month whose 8th has no tab yet. Every resolved tab name is
 * therefore checked back against the candidates before a single row is used. */
function ordersTabIsCandidate_(tabName, candidates) {
  const got = bridgeNormalizeHeader_(tabName);
  if (!got) return false;
  for (let i = 0; i < candidates.length; i++) {
    if (bridgeNormalizeHeader_(candidates[i]) === got) return true;
  }
  return false;
}

function ordersIsSyncOwned_(tabName) {
  const name = String(tabName || '');
  if (name.charAt(0) === '_') return true;
  const n = bridgeNormalizeHeader_(name);
  for (let i = 0; i < ORDERS_SYNC_OWNED.length; i++) {
    if (bridgeNormalizeHeader_(ORDERS_SYNC_OWNED[i]) === n) return true;
  }
  return false;
}

// ---------- header resolution ----------
/** The record keys bridgeReadRows_ builds, column by column: the raw header when it normalizes
 * to something, otherwise (and on a repeat of an identical raw header) a positional 'col:X'. */
function ordersRecordKeys_(headers) {
  const seen = { _row: true };
  const keys = [];
  headers.forEach(function (h, i) {
    const raw = h === null || h === undefined ? '' : String(h);
    let key = bridgeNormalizeHeader_(raw) ? raw : 'col:' + ordersColLetter_(i + 1);
    // hasOwnProperty, not truthiness: a header spelled 'constructor' would otherwise inherit one.
    if (Object.prototype.hasOwnProperty.call(seen, key)) key = 'col:' + ordersColLetter_(i + 1);
    seen[key] = true;
    keys.push(key);
  });
  return keys;
}

function ordersColLetter_(col) {
  let n = Number(col) || 0, out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** canonical key → { rec, col, header } for one read. Exact spelling wins; a normalized match is
 * accepted only when it is unique, except for the deliberate 'Order number' pair, where the
 * position inside the group decides (col B before col M) and a lone column is claimed by neither. */
function ordersResolveFields_(headers) {
  const keys = ordersRecordKeys_(headers);
  const byExact = {}, byNorm = {};
  const at = function (bag, k) { return Object.prototype.hasOwnProperty.call(bag, k) ? bag[k] : null; };
  headers.forEach(function (h, i) {
    const raw = h === null || h === undefined ? '' : String(h);
    if (!at(byExact, raw)) byExact[raw] = [];
    byExact[raw].push(i);
    const n = bridgeNormalizeHeader_(raw);
    if (!n) return;
    if (!at(byNorm, n)) byNorm[n] = [];
    byNorm[n].push(i);
  });

  const map = {};
  ORDERS_ROW_FIELDS.forEach(function (f) {
    let col = -1;
    for (let i = 0; i < f.exact.length && col < 0; i++) {
      const hit = at(byExact, f.exact[i]);
      if (hit && hit.length === 1) col = hit[0];
    }
    if (col < 0) {
      const hit = at(byNorm, bridgeNormalizeHeader_(f.exact[0])) || [];
      if (f.ordinal === undefined) { if (hit.length === 1) col = hit[0]; }
      else if (hit.length > 1 && hit.length > f.ordinal) col = hit[f.ordinal];
    }
    if (col >= 0) map[f.key] = { rec: keys[col], col: col, header: String(headers[col]) };
  });

  // The unheaded carrier-status column sits immediately after Delivery Status on every day tab.
  const ds = map['Delivery Status'];
  if (ds && ds.col + 1 < headers.length && !bridgeNormalizeHeader_(headers[ds.col + 1])) {
    map._carrier = keys[ds.col + 1];
  }
  return map;
}

function ordersCell_(rec, map, key) {
  const f = map[key];
  if (!f) return '';
  const v = rec[f.rec];
  return v === null || v === undefined ? '' : v;
}

// ---------- role view (§4.2 / RL-4) ----------
function ordersView_(ctx) {
  const role = String(ctx.user.role || '');
  const mgmt = isMgmt_(role, ctx.ident.email);
  let earning = canSeeProfit_(role);
  // [OPEN-3]: default 'false' — processors keep Order Earning exactly as the sheet shows it today.
  if (!earning && role === 'Order Processor') earning = !ordersHideEarning_();
  return { role: role, mgmt: mgmt, earning: earning, pii: mgmt || role === 'CS' || role === 'Order Processor' };
}

function ordersHideEarning_() {
  const fallback = (typeof CONFIG_DEFAULTS !== 'undefined' && CONFIG_DEFAULTS.hide_order_earning_from_processors) || 'false';
  return String(getConfig('hide_order_earning_from_processors') || fallback) === 'true';
}

function ordersSlaDays_() {
  const n = Number(getConfig(ORDERS_SLA_KEY));
  return n > 0 && n < 60 ? Math.floor(n) : ORDERS_SLA_DAYS_DEFAULT;
}

/** RL-4 is provable here: gated fields are never put into the record, and this asserts it. */
function ordersAssertVisibility_(row, view) {
  Object.keys(row || {}).forEach(function (k) {
    const n = bridgeNormalizeHeader_(k);
    if (!view.earning && PROFIT_FIELDS.some(function (f) { return bridgeNormalizeHeader_(f) === n; })) {
      throw new Error('§4.2 violation: ' + k + ' can never reach this role');
    }
    if (!view.pii && PII_FIELDS.some(function (f) { return bridgeNormalizeHeader_(f) === n; })) {
      throw new Error('§4.2 violation: ' + k + ' can never reach this role');
    }
  });
  return row;
}

function ordersRowOut_(rec, map, view) {
  const out = { _row: rec._row };
  ORDERS_ROW_FIELDS.forEach(function (f) {
    if (!map[f.key]) return;
    if (f.pii && !view.pii) return;
    if (f.profit && !view.earning) return;
    out[f.key] = ordersCell_(rec, map, f.key);
  });
  if (map._carrier) out[map._carrier] = rec[map._carrier] === undefined ? '' : rec[map._carrier];
  return ordersAssertVisibility_(out, view);
}

// ---------- access ----------
function ordersAssertReader_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return;
  if (ORDERS_READ_ROLES.indexOf(String(ctx.user.role)) < 0) throw new Error('role has no order workspace');
}

function ordersAssertWriter_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return;
  if (ORDERS_WRITE_ROLES.indexOf(String(ctx.user.role)) < 0) throw new Error('role may not write order rows');
}

/** accounts_access is a comma list when Management has scoped the person; the seed placeholders
 * ('per-role', 'ALL', empty) mean "not scoped yet" and do not restrict. */
function ordersAccountsAllow_(accountsField, account) {
  const raw = String(accountsField || '').trim();
  if (!raw || raw === 'ALL' || raw === 'per-role') return true;
  const want = bridgeNormalizeHeader_(account);
  if (!want) return false;
  return raw.split(',').some(function (a) {
    const have = bridgeNormalizeHeader_(a);
    return have !== '' && (have === want || have.indexOf(want) >= 0 || want.indexOf(have) >= 0);
  });
}

function ordersAccountAllowed_(ctx, account) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return true;
  return ordersAccountsAllow_(ctx.user.accounts, account);
}

function ordersRequireAccount_(payload, ctx) {
  const account = String(payload.account || '').trim().slice(0, ORDERS_MAX_TEXT);
  if (!account) throw new Error('account required');
  if (!ordersAccountAllowed_(ctx, account)) throw new Error('account not in your access');
  return account;
}

/** Accounts whose Order Processing workbook is linked (§6) — never a hardcoded list. */
function ordersConnectedAccounts_() {
  const out = [];
  connectionHealth().perAccount.forEach(function (a) {
    const linked = (a.items || []).some(function (i) { return i.kind === 'order_processing' && i.status === 'linked'; });
    if (linked) out.push(String(a.account));
  });
  return out;
}

/** USERS spells the column 'accounts_access' (§7); a ctx.user carries the same value as
 * `accounts`. Both spellings are read so neither source silently scopes a processor to nothing. */
function ordersProcessorsFor_(account) {
  const out = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved' || String(u.role) !== 'Order Processor') return;
    const scope = u.accounts_access !== undefined ? u.accounts_access : u.accounts;
    if (!ordersAccountsAllow_(scope, account)) return;
    out.push({ email: String(u.email), name: String(u.name || u.email) });
  });
  return out;
}

// ---------- reads through the bridge ----------
function ordersReadTab_(account, candidates, limit, expect) {
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'order_processing',
    tab: candidates, expect: expect, limit: limit,
  });
  if (!read.ok) return read;
  if (!ordersTabIsCandidate_(read.tab, candidates)) return { ok: false, reason: 'no such tab' };
  if (ordersIsSyncOwned_(read.tab)) {
    // Unreachable with day-tab and REPLACEMENT candidates, but a sync tab reached by any route
    // is a contract breach worth a log line rather than a silent row of buyer emails.
    logActivity_('system', 'ORDERS_SYNC_TAB_BLOCKED', account + '!' + read.tab, '', '', 'read refused');
    return { ok: false, reason: 'no such tab' };
  }
  return read;
}

/** {candidates, replacement} for what the caller asked for. Only a date or the REPLACEMENT tab
 * is reachable — an arbitrary tab name would open the eBay-export and July history tabs. */
function ordersTarget_(payload) {
  const wanted = String(payload.tab || '').trim();
  if (wanted && bridgeNormalizeHeader_(wanted) === bridgeNormalizeHeader_(ORDERS_REPLACEMENT_TAB)) {
    return { candidates: [ORDERS_REPLACEMENT_TAB], replacement: true, date: '' };
  }
  if (wanted) throw new Error('only a date or the REPLACEMENT tab can be opened');
  const date = ordersYmd_(payload.date) || ordersToday_();
  return { candidates: ordersDayTabCandidates_(date), replacement: false, date: date };
}

/** An order row is a row carrying an eBay order number. That single rule also excludes the
 * daily tabs' row-2 totals line (G/L sums, J 'TOTAL ORDERS n', P the literal 'Delivery Status'). */
function ordersIsOrderRow_(rec, map) {
  return String(ordersCell_(rec, map, 'Order number')).trim() !== '';
}

function ordersTotalsRow_(read, map, view) {
  const first = read.headerRowIndex + 1;
  let row = null;
  read.rows.forEach(function (r) { if (r._row === first && !ordersIsOrderRow_(r, map)) row = r; });
  if (!row) return null;                              // REPLACEMENT has no totals row at all
  const out = { 'Quantity': ordersCell_(row, map, 'Quantity'), 'Cost': ordersCell_(row, map, 'Cost') };
  if (view.earning) out['Order Earning'] = ordersCell_(row, map, 'Order Earning');
  return ordersAssertVisibility_(out, view);
}

// ---------- §10.1 the processor's daily workspace ----------
function actionTodayOrders_(payload, ctx) {
  ordersAssertReader_(ctx);
  const account = ordersRequireAccount_(payload, ctx);
  const target = ordersTarget_(payload);
  const view = ordersView_(ctx);

  const read = ordersReadTab_(account, target.candidates, ORDERS_DAY_LIMIT, ORDERS_EXPECT_DAY);
  if (!read.ok) {
    return {
      ok: false, reason: String(read.reason || 'not connected yet'), account: account,
      date: target.date, replacement: target.replacement, today_pkt: ordersToday_(),
    };
  }

  const map = ordersResolveFields_(read.headers);
  const orders = [];
  read.rows.forEach(function (r) {
    if (!ordersIsOrderRow_(r, map)) return;
    orders.push(ordersRowOut_(r, map, view));
  });

  return {
    ok: true, account: account, tab: read.tab, date: target.date, replacement: target.replacement,
    today_pkt: ordersToday_(), orders: orders, count: orders.length, truncated: !!read.truncated,
    totals: ordersTotalsRow_(read, map, view),
    columns: ORDERS_ROW_FIELDS.filter(function (f) {
      if (!map[f.key]) return false;
      if (f.pii && !view.pii) return false;
      if (f.profit && !view.earning) return false;
      return true;
    }).map(function (f) { return f.key; }),
    writable: ORDERS_WRITABLE_COLS.filter(function (c) {
      return !(target.replacement && c === 'New Ali Link');       // REPLACEMENT has no such column
    }),
    delivery_status_options: ordersStatusOptions_(target.replacement),
    can_write: ordersMayWrite_(ctx),
    shows_order_earning: view.earning,
  };
}

function ordersStatusOptions_(isReplacement) {
  const out = ORDERS_DELIVERY_STATUS.slice();
  if (isReplacement) out.push(ORDERS_DELIVERY_STATUS_REPLACEMENT);
  return out;
}

function ordersMayWrite_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || ORDERS_WRITE_ROLES.indexOf(String(ctx.user.role)) >= 0;
}

// ---------- §10.1 the two writes ----------
/** Purchase step: Cost + the AliExpress order number + the purchasing account, and the
 * replacement supplier link when the first supplier failed. Nothing else on the row is touched. */
function actionRecordPurchase_(payload, ctx) {
  ordersAssertWriter_(ctx);
  const account = ordersRequireAccount_(payload, ctx);
  const target = ordersTarget_(payload);

  const values = {};
  if (payload.cost !== undefined && payload.cost !== '') values['Cost'] = ordersCost_(payload.cost);
  if (payload.ali_order_number !== undefined && payload.ali_order_number !== '') {
    values['Order Number'] = ordersAliOrderNumber_(payload.ali_order_number);
  }
  if (payload.email !== undefined && payload.email !== '') values['Email'] = ordersPurchasingAccount_(payload.email);
  if (payload.new_ali_link !== undefined && payload.new_ali_link !== '') {
    if (target.replacement) throw new Error('the REPLACEMENT tab has no New Ali Link column');
    values['New Ali Link'] = ordersLink_(payload.new_ali_link);
  }
  if (!Object.keys(values).length) throw new Error('nothing to record');

  return ordersWriteRow_(ctx, account, target, payload, values, 'RECORD_PURCHASE', null);
}

/** Tracking step: the tracking number, then the tracking upload to eBay. `uploaded:true` is the
 * moment the spec gives Wahab — it stamps the Delivery Status dropdown token that records it. */
function actionRecordTracking_(payload, ctx) {
  ordersAssertWriter_(ctx);
  const account = ordersRequireAccount_(payload, ctx);
  const target = ordersTarget_(payload);

  const values = {};
  if (payload.tracking_number !== undefined && payload.tracking_number !== '') {
    values['Tracking number'] = ordersTracking_(payload.tracking_number);
  }
  const uploaded = payload.uploaded === true || String(payload.uploaded || '') === 'true';
  if (payload.delivery_status !== undefined && payload.delivery_status !== '') {
    values['Delivery Status'] = ordersDeliveryStatus_(payload.delivery_status, target.replacement);
  } else if (uploaded) {
    values['Delivery Status'] = ORDERS_STATUS_TRACKING;
  }
  if (uploaded) ordersAssertUploader_(ctx);
  if (!Object.keys(values).length) throw new Error('nothing to record');

  const found = ordersFindRow_(account, target, payload);
  if (!found.ok) return { ok: false, reason: found.reason, rows: found.rows || undefined };
  // Marking a row uploaded with no tracking number anywhere on it would tell the dispatch
  // dashboard a parcel is moving that nobody can trace.
  if (uploaded && !values['Tracking number'] && !String(ordersCell_(found.row, found.map, 'Tracking number')).trim()) {
    throw new Error('no tracking number on this row yet');
  }

  const res = ordersWriteRow_(ctx, account, target, payload, values, 'RECORD_TRACKING', found);
  /* V2 req 3 (SHADOW until the Engine's TRACKING_LIVE flips): the moment a tracking number
   * lands on the row, the Engine records exactly what it WOULD push to eBay for this order —
   * courier auto-picked from the number's own format. Fire-and-log: the sheet write already
   * happened, and the Engine being down must never take the dispatch flow down with it. */
  if (res && res.ok !== false && values['Tracking number']) {
    try {
      enginePost_('ebayPushTracking', {
        account: account,
        order_id: String(payload.order_number || ''),
        tracking: String(values['Tracking number']),
      });
    } catch (e) {
      logActivity_('system', 'ENGINE_TRACK_FAIL', account, '', '', String(e && e.message || e).slice(0, 120));
    }
  }
  return res;
}

/** CONFIG 'orders_tracking_uploader' names whoever uploads tracking to eBay (Wahab today).
 * Unset = any Order Processor, which is how the team works when he is off. */
function ordersAssertUploader_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return;
  const who = String(getConfig(ORDERS_UPLOADER_KEY) || '').trim();
  if (!who) return;
  const allowed = who.split(',').some(function (e) { return normalizeEmail(e) === normalizeEmail(ctx.ident.email); });
  if (!allowed) throw new Error('only the tracking uploader may mark a row uploaded');
}

/** Resolve one order row: verify the tab, then find the eBay order number on it. Multi-variant
 * orders repeat the same number on consecutive rows, so more than one hit needs an explicit row. */
function ordersFindRow_(account, target, payload) {
  const read = ordersReadTab_(account, target.candidates, ORDERS_DAY_LIMIT, ORDERS_EXPECT_DAY);
  if (!read.ok) return { ok: false, reason: String(read.reason || 'not connected yet') };

  const map = ordersResolveFields_(read.headers);
  const ebay = map['Order number'];
  if (!ebay || String(ebay.rec).indexOf('col:') === 0) return { ok: false, reason: 'the eBay order number column is not addressable on this tab' };
  // A tab that spells both order-number columns identically cannot be written safely — the
  // bridge would refuse anyway, but the caller gets a real reason instead of a thrown request.
  const twins = read.headers.filter(function (h) { return String(h) === ebay.header; }).length;
  if (twins !== 1) return { ok: false, reason: 'the eBay order number column is ambiguous on this tab' };

  const wanted = String(payload.order_number || '').trim();
  if (!wanted) return { ok: false, reason: 'order_number required' };
  const key = bridgeMatchKey_(wanted);
  const hits = [];
  read.rows.forEach(function (r) {
    if (!ordersIsOrderRow_(r, map)) return;
    if (bridgeMatchKey_(ordersCell_(r, map, 'Order number')) === key) hits.push(r);
  });
  if (!hits.length) {
    return { ok: false, tab: read.tab, reason: read.truncated ? 'this tab is longer than the portal reads' : 'order not found on this tab' };
  }

  const forced = Number(payload.row) || 0;
  let row = hits[0];
  if (hits.length > 1) {
    if (!forced) {
      return {
        ok: false, reason: 'this order number repeats on this tab — choose a row', tab: read.tab,
        rows: hits.map(function (r) { return { _row: r._row, 'Variation details': ordersCell_(r, map, 'Variation details') }; }),
      };
    }
    row = null;
    hits.forEach(function (r) { if (r._row === forced) row = r; });
    if (!row) return { ok: false, reason: 'that row does not carry this order number', tab: read.tab };
  } else if (forced && forced !== row._row) {
    return { ok: false, reason: 'that row does not carry this order number', tab: read.tab };
  }

  return { ok: true, tab: read.tab, matchHeader: ebay.header, row: row, map: map };
}

/** One write path for both steps: resolve the row, hand the values to the bridge with the §10.1
 * whitelist, and report what the bridge did — including shadow mode and any whitelisted column
 * this tab does not have (REPLACEMENT's missing 'New Ali Link'), which is skipped, never added. */
function ordersWriteRow_(ctx, account, target, payload, values, action, prefound) {
  Object.keys(values).forEach(function (k) {
    if (ORDERS_WRITABLE_COLS.indexOf(k) < 0) throw new Error('write outside the §10.1 whitelist: ' + k);
  });
  const found = prefound || ordersFindRow_(account, target, payload);
  if (!found.ok) return { ok: false, reason: found.reason, rows: found.rows || undefined };

  const spec = {
    scope: 'account', account: account, kind: 'order_processing',
    tab: [found.tab], expect: ORDERS_EXPECT_DAY, row: found.row._row,
  };
  let res = null;
  try {
    // The bridge takes the script lock around its own read-modify-write, so nothing here holds
    // one: a second lock from the same execution is exactly how a write deadlocks itself.
    res = bridgeUpdateRow_(spec, found.matchHeader, payload.order_number, values, ORDERS_WRITABLE_COLS, ctx.ident.email);
  } catch (e) {
    // RL-9: the reason the sheet refused (a header name, an ambiguity) stays in the log.
    logActivity_(ctx.ident.email, action + '_REFUSED', account + '!' + found.tab + '!' + found.row._row, '', '', String(e && e.message || e));
    return { ok: false, reason: 'the sheet refused this write' };
  }
  if (!res.ok) return res;

  logActivity_(ctx.ident.email, action, account + '!' + found.tab + '!' + found.row._row, '',
    Object.keys(values).join(' | '),
    'order ' + String(payload.order_number || '') + ' · ' + (res.shadow ? 'shadow' : 'written')
    + ((res.skippedMissing || []).length ? ' · not on this tab: ' + res.skippedMissing.join(' | ') : ''));

  return {
    ok: true, shadow: !!res.shadow, account: account, tab: found.tab, row: found.row._row,
    order_number: String(payload.order_number || ''), values: values,
    written: res.written || [], unchanged: res.unchanged || [], skipped: res.skippedMissing || [],
  };
}

// ---------- value validation ----------
function ordersCost_(value) {
  const n = Number(String(value).replace(/[£,\s]/g, ''));
  if (!isFinite(n) || n < 0 || n > ORDERS_MAX_COST) throw new Error('invalid cost');
  return Math.round(n * 100) / 100;                    // col L is a float in every live tab
}

/** 16 digits of text in the live sheets. Written as a String so the column's plain-text format
 * keeps it whole — a number that long loses its tail to scientific notation. */
function ordersAliOrderNumber_(value) {
  const s = String(value).trim().replace(/\s/g, '');
  if (!/^\d{8,24}$/.test(s)) throw new Error('invalid AliExpress order number');
  return s;
}

/** Col O is the purchasing ACCOUNT, not an email address: 'mrhasibullah', 'child zee',
 * 'shop child 2 w', in whatever case the processor typed. Free text by reality, so it is length-
 * and formula-checked, never forced into a vocabulary the team does not use. */
function ordersPurchasingAccount_(value) {
  const s = String(value).trim().replace(/[\r\n]+/g, ' ').slice(0, 60);
  if (!s) throw new Error('purchasing account required');
  if (s.charAt(0) === '=') throw new Error('invalid purchasing account');
  return s;
}

function ordersTracking_(value) {
  const s = String(value).trim().replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z0-9-]{6,40}$/.test(s)) throw new Error('invalid tracking number');
  return s;
}

function ordersLink_(value) {
  const s = String(value).trim().slice(0, ORDERS_MAX_LINK);
  if (!/^https?:\/\//i.test(s)) throw new Error('a supplier link must be http or https');
  return s;
}

function ordersDeliveryStatus_(value, isReplacement) {
  const s = String(value).trim();
  const options = ordersStatusOptions_(isReplacement);
  for (let i = 0; i < options.length; i++) if (options[i] === s) return options[i];
  throw new Error('unknown delivery status');
}

// ---------- §10.2 the dispatch dashboard ----------
/** Tiles computed from the real order rows of the month, not read off the workbook's Dashboard
 * tab (whose values are static and stamped by the sync script — 'updated 8 Aug 15:49').
 * One honest difference from that tab: it counts 'Dispatched' across the whole workbook (1624
 * rows, July included); this counts the month being scanned, like every other tile. */
function ordersDashboardAccount_(account, monthKey, useCache) {
  const today = ordersToday_();
  const cacheKey = 'ord_dash_' + bridgeNormalizeHeader_(account) + '_' + monthKey + '_' + today;
  const cache = CacheService.getScriptCache();
  if (useCache) {
    const hit = cache.get(cacheKey);
    if (hit) {
      try { return JSON.parse(hit); } catch (e) { /* corrupt entry → recompute */ }
    }
  }

  const out = ordersComputeDashboard_(account, monthKey, today);
  try { cache.put(cacheKey, JSON.stringify(out), ORDERS_DASH_CACHE_SECONDS); } catch (e) { /* oversized payload — serve it uncached */ }
  return out;
}

function ordersComputeDashboard_(account, monthKey, today) {
  if (!bridgeResolveSheetId_('account', account, 'order_processing')) {
    return { ok: false, account: account, month: monthKey, reason: 'not connected yet' };
  }
  const y = Number(monthKey.slice(0, 4)), m = Number(monthKey.slice(5, 7));
  const sla = ordersSlaDays_();
  const lastDay = ordersMonthDays_(y, m);
  const thisMonth = today.slice(0, 7);
  let cap = lastDay;
  if (monthKey > thisMonth) cap = 0;
  else if (monthKey === thisMonth) cap = Number(today.slice(8, 10));

  const counts = { dispatched: 0, safe: 0, due: 0, overdue: 0 };
  const days = [], due = [];
  const seenTabs = {};
  let total = 0, tabsRead = 0;

  for (let d = 1; d <= cap; d++) {
    const ymd = ordersMakeYmd_(y, m, d);
    const candidates = ordersDayTabCandidates_(ymd);
    const read = ordersReadTab_(account, candidates, ORDERS_DAY_LIMIT, ORDERS_EXPECT_DAY);
    if (!read.ok) continue;
    if (seenTabs[read.tab]) continue;                  // a combined tab ('5-6 JULY') answers twice
    seenTabs[read.tab] = true;
    tabsRead++;

    const map = ordersResolveFields_(read.headers);
    let dayCount = 0;
    read.rows.forEach(function (r) {
      if (!ordersIsOrderRow_(r, map)) return;
      dayCount++;
      total++;
      const status = String(ordersCell_(r, map, 'Delivery Status')).trim();
      const tracking = String(ordersCell_(r, map, 'Tracking number')).trim();
      if (ordersIsDispatched_(status, tracking)) { counts.dispatched++; return; }

      // A two-day tab is dated by its FIRST day: the earlier deadline is the safe one to show.
      const shipBy = ordersAddDays_(ymd, sla);
      const daysLeft = ordersDaysBetween_(today, shipBy);
      if (daysLeft < 0) counts.overdue++;
      else if (daysLeft <= ORDERS_DUE_WINDOW_DAYS) counts.due++;
      else { counts.safe++; return; }

      if (due.length < ORDERS_DUE_ROWS_MAX) {
        due.push({
          'Day Tab': read.tab,
          'Order No': String(ordersCell_(r, map, 'Order number')),
          'Item': String(ordersCell_(r, map, 'Item title')).slice(0, ORDERS_MAX_TEXT),
          'Order Date': ymd, 'Ship By': shipBy, 'Days Left': daysLeft,
          'Status': status,
        });
      }
    });
    // The workbook's own Day/Orders table numbers the days; tab names are used instead because
    // two of them cover two dates each and a number would have to lie about one of them.
    days.push({ 'Day': read.tab, 'Orders': dayCount });
  }

  due.sort(function (a, b) { return a['Days Left'] - b['Days Left']; });
  const tiles = {};
  tiles[ORDERS_TILE_MONTH] = total;
  tiles[ORDERS_TILE_AWAITING] = counts.safe + counts.due + counts.overdue;
  tiles[ORDERS_TILE_DUE] = counts.due;
  tiles[ORDERS_TILE_OVERDUE] = counts.overdue;

  const table = [];
  table.push({ 'Dispatch status': ORDERS_ROW_DISPATCHED, 'Orders': counts.dispatched });
  table.push({ 'Dispatch status': ORDERS_ROW_SAFE, 'Orders': counts.safe });
  table.push({ 'Dispatch status': ORDERS_ROW_DUE, 'Orders': counts.due });
  table.push({ 'Dispatch status': ORDERS_ROW_OVERDUE, 'Orders': counts.overdue });

  return {
    ok: true, account: account, month: monthKey, today_pkt: today, sla_days: sla,
    tiles: tiles, dispatch_status: table, days: days, due: due,
    tabs_read: tabsRead, computed_at: now_(),
  };
}

function ordersIsDispatched_(status, tracking) {
  if (tracking) return true;
  for (let i = 0; i < ORDERS_DISPATCHED_STATUS.length; i++) {
    if (ORDERS_DISPATCHED_STATUS[i] === status) return true;
  }
  return false;
}

function actionDispatchDashboard_(payload, ctx) {
  ordersAssertReader_(ctx);
  const monthKey = ordersMonthKey_(payload.month);
  const refresh = payload.refresh === true || String(payload.refresh || '') === 'true';

  let accounts;
  if (payload.account) accounts = [ordersRequireAccount_(payload, ctx)];
  else accounts = ordersConnectedAccounts_().filter(function (a) { return ordersAccountAllowed_(ctx, a); });
  if (accounts.length > ORDERS_MAX_ACCOUNTS) accounts = accounts.slice(0, ORDERS_MAX_ACCOUNTS);

  const cards = accounts.map(function (a) { return ordersDashboardAccount_(a, monthKey, !refresh); });
  const aggregate = {};
  [ORDERS_TILE_MONTH, ORDERS_TILE_AWAITING, ORDERS_TILE_DUE, ORDERS_TILE_OVERDUE].forEach(function (t) { aggregate[t] = 0; });
  const rollup = { dispatched: 0, safe: 0, due: 0, overdue: 0 };
  cards.forEach(function (c) {
    if (!c.ok) return;
    Object.keys(aggregate).forEach(function (t) { aggregate[t] += Number(c.tiles[t]) || 0; });
    c.dispatch_status.forEach(function (r) {
      if (r['Dispatch status'] === ORDERS_ROW_DISPATCHED) rollup.dispatched += Number(r['Orders']) || 0;
      if (r['Dispatch status'] === ORDERS_ROW_SAFE) rollup.safe += Number(r['Orders']) || 0;
      if (r['Dispatch status'] === ORDERS_ROW_DUE) rollup.due += Number(r['Orders']) || 0;
      if (r['Dispatch status'] === ORDERS_ROW_OVERDUE) rollup.overdue += Number(r['Orders']) || 0;
    });
  });

  return {
    month: monthKey, today_pkt: ordersToday_(), sla_days: ordersSlaDays_(),
    accounts: cards, aggregate: aggregate,
    dispatch_status: [
      { 'Dispatch status': ORDERS_ROW_DISPATCHED, 'Orders': rollup.dispatched },
      { 'Dispatch status': ORDERS_ROW_SAFE, 'Orders': rollup.safe },
      { 'Dispatch status': ORDERS_ROW_DUE, 'Orders': rollup.due },
      { 'Dispatch status': ORDERS_ROW_OVERDUE, 'Orders': rollup.overdue },
    ],
  };
}

function ordersMonthKey_(value) {
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(s)) {
    const m = Number(s.slice(5, 7));
    if (m >= 1 && m <= 12) return s;
  }
  return ordersToday_().slice(0, 7);
}

// ---------- §10.3 Returns & INAD (read for CS + Management; the automation writes it) ----------
function actionReturnsInad_(payload, ctx) {
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email);
  if (!mgmt && String(ctx.user.role) !== 'CS') throw new Error('the returns feed is CS and management only');
  const account = ordersRequireAccount_(payload, ctx);

  const read = ordersReadTab_(account, [ORDERS_RETURNS_TAB], ORDERS_RETURNS_LIMIT, ORDERS_RETURNS_COLS);
  if (!read.ok) {
    return { ok: false, account: account, reason: String(read.reason || 'not connected yet') };
  }

  const wantType = String(payload.type || '').trim();
  if (wantType && ORDERS_RETURNS_TYPES.indexOf(wantType) < 0) throw new Error('unknown return type');
  const wantStatus = String(payload.status || '').trim();
  if (wantStatus && ORDERS_RETURNS_STATUS.indexOf(wantStatus) < 0) throw new Error('unknown return status');

  // 'Day Tab' comes back as a real date on single-day tabs and as the literal tab name
  // ('5-6 JULY') on the combined ones — the column is genuinely mixed-type in the workbook.
  const keys = ordersRecordKeys_(read.headers);
  const keyFor = {};
  ORDERS_RETURNS_COLS.forEach(function (h) {
    const n = bridgeNormalizeHeader_(h);
    for (let i = 0; i < read.headers.length; i++) {
      if (bridgeNormalizeHeader_(read.headers[i]) === n) { keyFor[h] = keys[i]; return; }
    }
  });

  const rows = [];
  read.rows.forEach(function (r) {
    const rec = { _row: r._row };
    ORDERS_RETURNS_COLS.forEach(function (h) {
      const k = keyFor[h];
      rec[h] = k !== undefined && r[k] !== undefined ? r[k] : '';
    });
    if (String(rec['Order No']).trim() === '' && String(rec['Item Title']).trim() === '') return;
    if (wantType && String(rec['Type']).trim() !== wantType) return;
    if (wantStatus && String(rec['Status']).trim() !== wantStatus) return;
    rows.push(rec);
  });

  return {
    ok: true, account: account, tab: read.tab, count: rows.length, truncated: !!read.truncated,
    rows: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    columns: ORDERS_RETURNS_COLS, types: ORDERS_RETURNS_TYPES, statuses: ORDERS_RETURNS_STATUS,
    read_only: true,                                   // §10.3: this tab is written by automation
  };
}

// ---------- §10.2 / §14 the overdue sweep (time trigger — no ctx) ----------
/** OVERDUE > 0 notifies Management and the account's Order Processors, once per account per PKT
 * day, and leaves the month's tiles in DASH_CACHE for the §13.3 operations counters. */
function dispatchOverdueSweep() {
  const today = ordersToday_();
  const monthKey = today.slice(0, 7);
  const started = Date.now();

  const sent = {};
  readTab_('NOTIFICATIONS').forEach(function (n) {
    const ref = String(n.ref || '');
    if (ref.indexOf(ORDERS_OVERDUE_REF) === 0) sent[ref] = true;
  });

  let scanned = 0, notified = 0, skipped = 0;
  const accounts = ordersConnectedAccounts_();
  for (let i = 0; i < accounts.length; i++) {
    if (Date.now() - started > ORDERS_SWEEP_BUDGET_MS) { skipped = accounts.length - i; break; }
    const account = accounts[i];
    let dash = null;
    try {
      dash = ordersDashboardAccount_(account, monthKey, false);
    } catch (e) {
      logActivity_('system', 'DISPATCH_SWEEP_FAIL', account, '', '', String(e && e.message || e));
      continue;
    }
    if (!dash.ok) continue;
    scanned++;
    ordersCacheTiles_(account, monthKey, dash);

    const overdue = Number(dash.tiles[ORDERS_TILE_OVERDUE]) || 0;
    if (!overdue) continue;
    const ref = ORDERS_OVERDUE_REF + account + ':' + today;
    if (sent[ref]) continue;

    const msg = '🔴 Dispatch overdue · ' + account + ' — ' + overdue + ' order(s) past their ship-by date, '
      + (Number(dash.tiles[ORDERS_TILE_DUE]) || 0) + ' more due within ' + ORDERS_DUE_WINDOW_DAYS + ' days, '
      + (Number(dash.tiles[ORDERS_TILE_AWAITING]) || 0) + ' awaiting dispatch. Late dispatch damages the account\'s seller rating → open Dispatch and clear the overdue list first.';
    notifyManagement_('Dispatch OVERDUE', msg, ref);
    ordersProcessorsFor_(account).forEach(function (p) { notify_(p.email, 'Dispatch OVERDUE', msg, ref); });
    logActivity_('system', 'DISPATCH_OVERDUE', account, '', String(overdue), msg);
    notified++;
  }

  return 'dispatch sweep: ' + scanned + ' account(s) scanned, ' + notified + ' notified'
    + (skipped ? ', ' + skipped + ' left for the next run (time budget)' : '');
}

/** DASH_CACHE keyed by (metric, account, period) — upserted, never appended, so a 15-minute
 * trigger cannot grow the tab without bound. §13.3's "dispatch overdue" counter reads the
 * 'OVERDUE NOW' rows. A recomputed cache figure is not an audited change, so rows here are
 * deliberately not written to ACTIVITY_LOG: at four metrics × every account × every 15 minutes
 * the log would carry nothing but its own noise. */
function ordersCacheTiles_(account, monthKey, dash) {
  const sh = getPortalDb_(false).getSheetByName('DASH_CACHE');
  if (!sh) return;
  const stamp = now_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const vals = sh.getDataRange().getValues();
    const at = {};
    for (let i = 1; i < vals.length; i++) at[vals[i][0] + '|' + vals[i][1] + '|' + vals[i][2]] = i + 1;
    Object.keys(dash.tiles).forEach(function (metric) {
      const key = metric + '|' + account + '|' + monthKey;
      const row = [metric, account, monthKey, dash.tiles[metric], stamp];
      if (at[key]) sh.getRange(at[key], 1, 1, 5).setValues([row]);
      else { sh.appendRow(row); at[key] = sh.getLastRow(); }
    });
  } finally { lock.releaseLock(); }
}

const ACTIONS_ORDERS = {
  todayOrders:       [actionTodayOrders_, 'any'],
  recordPurchase:    [actionRecordPurchase_, 'any'],
  recordTracking:    [actionRecordTracking_, 'any'],
  dispatchDashboard: [actionDispatchDashboard_, 'any'],
  returnsInad:       [actionReturnsInad_, 'any'],
};
