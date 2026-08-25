/** Phase 6 — §27 SIGNALS. Problems come to people, not people to problems: one daily engine
 * computes item-level signals per account and pins them to the top of the right people's home
 * screens, unmissable until acknowledged.
 *
 * REALITY WINS over §27 in four load-bearing places:
 *  · The Sales Analysis daily tabs carry NO item number. 'Item Title' (col A) is the only
 *    identifier on all 24 live tabs, so the eBay number and the image are resolved from the
 *    account's Central Main Sheet by title; when that lookup fails the title itself becomes the
 *    signal's identity, because a signal with no identity re-raises on every single run.
 *  · Ad waste is not itemised per day anywhere in the business. Each daily tab books it as a
 *    hardcoded constant inside its GRAND TOTAL formula ('=SUM(L2:L22)+33.22', documented by a
 *    cell comment) and only the month-end Overall Report lists the listings behind it. §27's
 *    "top Ad Waste contributor" is therefore served by the half of the rule that IS measurable
 *    per item per day: ad fees >= earning.
 *  · Item-level ad spend is the tab's own two 'incl VAT' fee columns added together, unmodified.
 *    The Dashboard tile computes All Ads as Priority + 1.2 x General while the per-row chain
 *    subtracts only 20% of the general fee; both cannot be right and the question is still open
 *    (IMPROVEMENTS §3), so neither correction is applied to a number Hasib's team reads daily.
 *  · Returns & INAD lives in the Order Processing workbook, is keyed by 'Item Title' as well, and
 *    carries the eBay reason vocabulary in 'Reason (eBay)'.
 *
 * §27 names Husnain; the portal knows him by his role (CS, §4.1) because staff are data rows and
 * are never hardcoded. 'Management' here means MGMT_ROLES, so the Ops Head's Alerts Center (§4.4)
 * sees the same cards. RL-4: the two money signals are served only to profit-cleared roles and
 * every record still leaves through stripForRole_ with PROFIT_FIELDS-shaped keys; the returns
 * signal carries no money at all, which is exactly what lets the owning lister receive it.
 *
 * Performance: this module reads more of the business than any other, so a run opens each
 * workbook ONCE per account (Sales Analysis, Central, Order Processing), never re-reads a tab and
 * never calls a sheet inside a row loop. Viewers never recompute — actionMySignals_ serves the
 * cards from DASH_CACHE, which is what the §27 engine fills while it runs with the dashboard
 * trigger. */

// ---------- the launch set (§27, verbatim) ----------
const SIG_TYPE_NEGATIVE = 'WENT NEGATIVE YESTERDAY';
const SIG_TYPE_WORST_CPC = 'WORST CPC PERFORMER YESTERDAY';
const SIG_TYPE_RETURNS = 'RETURNS ABOVE USUAL';
const SIG_LAUNCH_TYPES = [SIG_TYPE_NEGATIVE, SIG_TYPE_WORST_CPC, SIG_TYPE_RETURNS];

/** The only §27 signal that carries no money, and therefore the only one a profit-restricted role
 * may ever receive. Anything else — including a type Management adds later — needs profit clearance. */
const SIG_COUNT_ONLY_TYPES = [SIG_TYPE_RETURNS];

/** targeted_roles is a role list, except for this one token: §27 sends the returns signal to "the
 * owning lister", which is one named person per item, not a department. The owner is the lister
 * who entered the Item ID (their listing_new task), and every other lister sees nothing. */
const SIG_TARGET_OWNING_LISTER = 'owning lister';

const SIG_ROLES_NEGATIVE = 'Management, Ops Head, Team Lead, CS';
const SIG_ROLES_WORST_CPC = 'Management, Ops Head, Advertising Manager';
const SIG_ROLES_RETURNS = 'Management, Ops Head, CS, ' + SIG_TARGET_OWNING_LISTER;

/** The one-tap actions of §27, in the spec's own words. The screen wires them; the server only
 * says which ones belong on which card. */
const SIG_ACTIONS = {};
SIG_ACTIONS[SIG_TYPE_NEGATIVE] = ['open record', 'create revision task', 'flag to advertising'];
SIG_ACTIONS[SIG_TYPE_WORST_CPC] = ['pause', 'day-4 verdict', 'move tier'];
SIG_ACTIONS[SIG_TYPE_RETURNS] = ['open case history'];

const SIG_ROLES_FOR_TYPE = {};
SIG_ROLES_FOR_TYPE[SIG_TYPE_NEGATIVE] = SIG_ROLES_NEGATIVE;
SIG_ROLES_FOR_TYPE[SIG_TYPE_WORST_CPC] = SIG_ROLES_WORST_CPC;
SIG_ROLES_FOR_TYPE[SIG_TYPE_RETURNS] = SIG_ROLES_RETURNS;

// ---------- CONFIG seeds (§27: "thresholds in CONFIG") ----------
/** Seeded into CONFIG so Hasib can retune without a deploy; every read falls back to the value
 * below, so a missing row never silences a signal. */
const SIGNALS_CONFIG_DEFAULTS = {
  signals_negative_below: '0',            // §27: Actual Profit below zero
  signals_returns_multiple: '2',          // §27 default: more than 2x its own 30-day rate
  signals_returns_day_count: '3',         // §27 default: 3 or more in a day
  signals_returns_baseline_days: '30',    // the trailing window §27 names
  // A first-ever return is a data point, not a spike: with a 30-day rate of nothing, twice
  // nothing is still nothing and every single return would page CS, Management and a lister.
  signals_returns_min_day: '2',
  signals_worst_cpc_per_account: '1',     // §27 says "the item(s)"; one per account by default
  signals_refresh_min_minutes: '15',      // the dashboard trigger's own cadence
};

// ---------- the business sheets, spelled as the workbooks spell them ----------
// Sales Analysis daily item tabs (headers row 1, cols A-V on all 24 live tabs).
const SIG_SA_TITLE = 'Item Title';
const SIG_SA_EARNING = 'eBay Order Earning';
const SIG_SA_PRIORITY = 'Total Priority incl VAT';
const SIG_SA_GENERAL = 'General Fees incl VAT';
const SIG_SA_RAW_PROFIT = 'Raw Profit';
const SIG_SA_RETURNS = 'Returns';
const SIG_SA_ACTUAL_PROFIT = 'Actual Profit';
const SIG_SA_COLS = [SIG_SA_TITLE, 'Total Sales/Sold For', SIG_SA_EARNING,
  'Total AliExpress Cost incl VAT', 'Qty Via Promoting', SIG_SA_PRIORITY, 'Qty Sold Via General',
  SIG_SA_GENERAL, 'True Order Earning', SIG_SA_RAW_PROFIT, SIG_SA_RETURNS, SIG_SA_ACTUAL_PROFIT];
// Every daily tab closes with this row; it is a total, never an item.
const SIG_SA_TOTAL_ROW = 'GRAND TOTAL';

// Central Main Sheet — the only place an eBay item number and a listing image exist together.
const SIG_MAIN_TAB = ['Main Sheet'];
const SIG_MAIN_IMAGE = 'Image Link';
const SIG_MAIN_TITLE = 'Listing Title';
const SIG_MAIN_ITEM = 'eBay Item No';
const SIG_MAIN_COLS = [SIG_MAIN_IMAGE, SIG_MAIN_TITLE, 'Sold For', 'Order Earning',
  'Aliexpress Cost', 'Profit ', 'Campaign Selection', 'Current Campaign Selection', SIG_MAIN_ITEM];

// Returns & INAD (§10.3) — read-only here; CS owns it.
const SIG_RET_TAB = 'Returns & INAD';
const SIG_RET_DATE = 'Date Added';
const SIG_RET_TITLE = 'Item Title';
const SIG_RET_TYPE = 'Type';
const SIG_RET_REASON = 'Reason (eBay)';
const SIG_RET_STATUS = 'Status';
const SIG_RET_COLS = [SIG_RET_DATE, 'Day Tab', 'Order No', SIG_RET_TITLE, 'Buyer', SIG_RET_TYPE,
  SIG_RET_REASON, 'Explanation', SIG_RET_STATUS, 'Refund Amount', 'Last Updated', 'Notes'];
// The live dropdown vocabulary of the Type column, verbatim.
const SIG_RET_TYPES = ['INAD', 'Return'];

// Month names are spelled, never formatted: a script locale must not be able to rename a tab.
const SIG_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// ---------- limits ----------
const SIG_TZ_PKT = 'Asia/Karachi';
const SIG_SA_LIMIT = 400;                  // biggest real daily tab is 94 item rows
const SIG_MAIN_SCAN = 2000;                // the Main Sheet grid is padded to row 1151
const SIG_RET_LIMIT = 500;
const SIG_TITLE_PREFIX = 40;               // product tables truncate titles at ~42 chars
const SIG_MAX_TEXT = 200;
const SIG_MAX_LINK = 500;
const SIG_CARDS_MAX = 60;
const SIG_NOTIFY_MAX = 25;                 // a first scan must not flood thirteen inboxes
const SIG_SWEEP_BUDGET_MS = 240000;        // stop before a time trigger is killed
const SIG_REF = 'signal:';
const SIG_LAST_RUN_KEY = 'signals_last_run';
/** DASH_CACHE holds the card a viewer sees, keyed (metric, account, period) like every other
 * cached tile: §27 cards must not be recomputed per viewer, and SIGNALS itself has exactly eight
 * columns (§7) — no title, no image, no reasons — which no module may extend. */
const SIG_DASH_METRIC = 'SIGNAL';
/** RL-6 column ownership on the portal's own SIGNALS tab: a raise writes the whole row once, and
 * the acknowledgement column is the only cell any action may touch afterwards. */
const SIG_WRITABLE_COLS = ['acknowledged_by'];

// ---------- dates (PKT — §27 is read by the Lahore team on their own day) ----------
function signalsToday_() { return Utilities.formatDate(new Date(), SIG_TZ_PKT, 'yyyy-MM-dd'); }

function signalsAddDays_(ymd, n) {
  const ms = Date.parse(String(ymd) + 'T12:00:00Z') + n * 86400000;   // noon anchor: no DST edge
  return Utilities.formatDate(new Date(ms), 'UTC', 'yyyy-MM-dd');
}

function signalsYesterday_() { return signalsAddDays_(signalsToday_(), -1); }

function signalsSplitYmd_(ymd) {
  const s = String(ymd || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return { y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) };
}

function signalsMonthDays_(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

/** '1st August 2026', '22nd July 2026' — the Sales Analysis tab naming, ordinals and all. */
function signalsOrdinal_(d) {
  const n = Number(d) || 0;
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return n + 'th';
  const ones = n % 10;
  return n + (ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th');
}

/** Tab-name candidates for one date. Combined tabs really exist ('5-6 July 2026', '12-13 July
 * 2026'), so both neighbours follow the single-day name — a combined tab holds two days of items
 * and is accepted as the best available truth for that day. */
function signalsDayTabCandidates_(ymd) {
  const p = signalsSplitYmd_(ymd);
  if (!p) return [];
  const month = SIG_MONTH_NAMES[p.m - 1];
  const out = [signalsOrdinal_(p.d) + ' ' + month + ' ' + p.y];
  if (p.d > 1) out.push((p.d - 1) + '-' + p.d + ' ' + month + ' ' + p.y);
  if (p.d < signalsMonthDays_(p.y, p.m)) out.push(p.d + '-' + (p.d + 1) + ' ' + month + ' ' + p.y);
  return out;
}

/** The bridge accepts a unique containment match when nothing matches exactly, which would let
 * '6th August 2026' land on '16th August 2026'. Every resolved tab is checked back before a
 * single row of it is believed. */
function signalsTabIsCandidate_(tabName, candidates) {
  const got = bridgeNormalizeHeader_(tabName);
  if (!got) return false;
  for (let i = 0; i < candidates.length; i++) {
    if (bridgeNormalizeHeader_(candidates[i]) === got) return true;
  }
  return false;
}

/** SIGNALS.date is written as text, but a hand-edited cell or an older row may come back as a
 * Date; both sides of every comparison pass through here. */
function signalsDateKey_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, SIG_TZ_PKT, 'yyyy-MM-dd');
  const s = String(value === null || value === undefined ? '' : value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, SIG_TZ_PKT, 'yyyy-MM-dd');
}

// ---------- small helpers ----------
function signalsNorm_(v) { return bridgeNormalizeHeader_(v === null || v === undefined ? '' : String(v)); }

function signalsText_(v, max) {
  const s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
  return s.slice(0, max || SIG_MAX_TEXT);
}

function signalsNum_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = Number(String(v === null || v === undefined ? '' : v).replace(/[£,\s]/g, ''));
  return isFinite(n) ? n : 0;
}

/** Money is kept at full precision through every sum and rounded once, at the end (§4.2) — through
 * the fee engine's own routine, which is the one rounding in this project proven half-penny exact.
 * A fifth private copy of "round to 2dp" is how the portal ends up quoting two different figures
 * for the same loss. */
function signalsMoney_(n) {
  const v = brainRound2_(Number(n) || 0);
  return v === null ? 0 : v;
}
function signalsGbp_(n) {
  const v = signalsMoney_(n);
  return (v < 0 ? '-£' : '£') + Math.abs(v).toFixed(2);
}

function signalsDigits_(v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); }

/** RL-3: a cell holds arbitrary text, so a link renders only when it is genuinely http/https. */
function signalsUrl_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim().slice(0, SIG_MAX_LINK);
  return /^https?:\/\//i.test(s) ? s : '';
}

/** Records come back keyed by the RAW header, and the live workbooks spell headers with trailing
 * spaces and stray newlines. One canonical -> raw map per read, built once. Exact spelling wins,
 * then a UNIQUE normalized match; two different spellings that normalize alike resolve to nothing
 * rather than to the wrong column. A header repeated identically resolves to the first of them,
 * which is the column the bridge actually put under that key. */
function signalsKeys_(headers, wanted) {
  const map = {};
  const exact = {}, norm = {};
  (headers || []).forEach(function (h) {
    const raw = String(h === null || h === undefined ? '' : h);
    const n = bridgeNormalizeHeader_(raw);
    if (!n) return;
    if (exact[raw] === undefined) exact[raw] = raw;
    if (norm[n] === undefined) norm[n] = raw;
    else if (norm[n] !== raw) norm[n] = null;                 // ambiguous: refuse rather than guess
  });
  wanted.forEach(function (w) {
    if (exact[w] !== undefined) { map[w] = exact[w]; return; }
    const hit = norm[bridgeNormalizeHeader_(w)];
    map[w] = hit || '';
  });
  return map;
}

function signalsCell_(rec, keys, canonical) {
  const k = keys[canonical];
  return k && Object.prototype.hasOwnProperty.call(rec, k) ? rec[k] : '';
}

/** One identity per signal, shared by the raise, the card cache and the acknowledgement. */
function signalsKey_(account, type, date, itemKey) {
  return signalsNorm_(account) + '|' + signalsNorm_(type) + '|' + signalsDateKey_(date) + '|' + signalsNorm_(itemKey);
}
function signalsPeriod_(type, date, itemKey) {
  return signalsNorm_(type) + '|' + signalsDateKey_(date) + '|' + signalsNorm_(itemKey);
}

/** accounts_access is a comma list when Management has scoped the person; the seed placeholders
 * ('per-role', 'ALL', empty) mean "not scoped yet" and do not restrict. */
function signalsAccountsAllow_(accountsField, account) {
  const raw = String(accountsField || '').trim();
  if (!raw || raw === 'ALL' || raw === 'per-role') return true;
  const want = signalsNorm_(account);
  if (!want) return false;
  return raw.split(',').some(function (a) {
    const have = signalsNorm_(a);
    return have !== '' && (have === want || have.indexOf(want) >= 0 || want.indexOf(have) >= 0);
  });
}

function signalsThreshold_(key) {
  const raw = String(getConfig(key) || '').trim();
  const n = Number(raw === '' ? SIGNALS_CONFIG_DEFAULTS[key] : raw);
  return isFinite(n) ? n : Number(SIGNALS_CONFIG_DEFAULTS[key]);
}

function signalsThresholds_() {
  return {
    negativeBelow: signalsThreshold_('signals_negative_below'),
    returnsMultiple: signalsThreshold_('signals_returns_multiple'),
    returnsDayCount: signalsThreshold_('signals_returns_day_count'),
    baselineDays: Math.max(1, Math.round(signalsThreshold_('signals_returns_baseline_days'))),
    returnsMinDay: Math.max(1, Math.round(signalsThreshold_('signals_returns_min_day'))),
    worstPerAccount: Math.max(1, Math.round(signalsThreshold_('signals_worst_cpc_per_account'))),
  };
}

/** Appends only the threshold rows CONFIG does not already carry, so Hasib can see and edit them
 * on the tab. Reads never depend on it — signalsThreshold_ falls back to the same defaults. */
function signalsSeedConfig_() {
  const sh = getPortalDb_(false).getSheetByName('CONFIG');
  if (!sh) return [];
  const have = {};
  readTab_('CONFIG').forEach(function (r) { have[String(r.key)] = true; });
  const add = [];
  Object.keys(SIGNALS_CONFIG_DEFAULTS).forEach(function (k) {
    if (!have[k]) add.push([k, SIGNALS_CONFIG_DEFAULTS[k], 'signals', now_()]);
  });
  if (!add.length) return [];
  sh.getRange(sh.getLastRow() + 1, 1, add.length, 4).setValues(add);
  execForgetTab_('CONFIG');
  logActivity_('system', 'SIGNALS_CONFIG_SEED', 'CONFIG', '', add.map(function (r) { return r[0]; }).join(','), 'thresholds §27');
  return add;
}

// ---------- the engine (runs with the dashboard trigger, and on refresh) ----------
/** Plain function, no ctx: this is the trigger target. Idempotent — a signal's identity carries
 * its date, so re-running every 15 minutes never raises the same problem twice. */
function computeSignals() {
  const started = Date.now();
  signalsSeedConfig_();

  const day = signalsYesterday_();
  const th = signalsThresholds_();
  const owners = signalsListingOwners_();
  const accounts = signalsAccounts_();

  const found = [], scanned = [], notConnected = [];
  let skipped = 0;
  for (let i = 0; i < accounts.length; i++) {
    if (Date.now() - started > SIG_SWEEP_BUDGET_MS) { skipped = accounts.length - i; break; }
    try {
      signalsScanAccount_(accounts[i], day, th, owners, found, scanned, notConnected);
    } catch (e) {
      logActivity_('system', 'SIGNALS_SCAN_FAIL', accounts[i], '', '', String(e && e.message || e));
    }
  }

  const fresh = signalsRaise_(found, 'system');
  CacheService.getScriptCache().put(SIG_LAST_RUN_KEY, String(Date.now()), 21600);
  return 'signals ' + day + ': ' + scanned.length + ' account(s) scanned, ' + found.length
    + ' standing, ' + fresh.length + ' newly raised'
    + (notConnected.length ? ', ' + notConnected.length + ' not connected yet' : '')
    + (skipped ? ', ' + skipped + ' left for the next run (time budget)' : '');
}

/** Accounts whose Sales Analysis or Order Processing workbook is linked (§6) — never a list in
 * code, so adding an account to the registry is enough for it to be watched. */
function signalsAccounts_() {
  const out = [];
  connectionHealth().perAccount.forEach(function (a) {
    const linked = (a.items || []).some(function (i) {
      return (i.kind === 'sales_analysis' || i.kind === 'order_processing') && i.status === 'linked';
    });
    if (linked) out.push(String(a.account));
  });
  return out;
}

/** item_id -> the lister who entered it. The portal's own record of who owns a listing is the
 * listing_new task that carried the Item ID (§8); the business sheets do not record it anywhere. */
function signalsListingOwners_() {
  const names = {};
  readTab_('USERS').forEach(function (u) { names[normalizeEmail(u.email)] = String(u.name || u.email); });
  const map = {};
  readTab_('TASKS').forEach(function (t) {
    if (String(t.type || '') !== 'listing_new') return;
    const id = signalsDigits_(t.item_id);
    const email = String(t.assigned_to || '').trim();
    if (!id || !email) return;
    map[id] = { email: email, name: names[normalizeEmail(email)] || email };
  });
  return map;
}

/** ONE pass per account: the Central Main Sheet once (for numbers and images), the Sales Analysis
 * day tab once (signals 1 and 2), Returns & INAD once (signal 3). */
function signalsScanAccount_(account, day, th, owners, found, scanned, notConnected) {
  const index = signalsMainIndex_(account);
  let touched = false;

  const sales = signalsReadDayTab_(account, day);
  if (sales.ok) {
    touched = true;
    signalsSalesSignals_(account, day, th, sales, index, owners, found);
  } else {
    notConnected.push({ account: account, kind: 'sales_analysis', reason: sales.reason });
  }

  const returns = signalsReadReturns_(account);
  if (returns.ok) {
    touched = true;
    signalsReturnsSignals_(account, day, th, returns, index, owners, found);
  } else {
    notConnected.push({ account: account, kind: 'order_processing', reason: returns.reason });
  }

  if (touched) scanned.push(account);
}

/** Title -> {item_id, image}, exact and by leading characters. A '↳' row is the highest-priced
 * variation of the row above and repeats its number, so the listing's own row is the main one. */
function signalsMainIndex_(account) {
  const idx = { byTitle: {}, byPrefix: {} };
  if (typeof bridgeReadRows_ !== 'function') return idx;
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'central', tab: SIG_MAIN_TAB,
    expect: SIG_MAIN_COLS, limit: SIG_MAIN_SCAN,
  });
  if (!read || !read.ok) return idx;

  const keys = signalsKeys_(read.headers, [SIG_MAIN_IMAGE, SIG_MAIN_TITLE, SIG_MAIN_ITEM]);
  read.rows.forEach(function (r) {
    const title = signalsText_(signalsCell_(r, keys, SIG_MAIN_TITLE), SIG_MAX_TEXT);
    if (!title || title.charAt(0) === '↳') return;
    const rec = {
      item_id: signalsDigits_(signalsCell_(r, keys, SIG_MAIN_ITEM)),
      title: title,
      image: signalsUrl_(signalsCell_(r, keys, SIG_MAIN_IMAGE)),
    };
    const n = signalsNorm_(title);
    if (n && idx.byTitle[n] === undefined) idx.byTitle[n] = rec;
    const p = n.slice(0, SIG_TITLE_PREFIX);
    if (p) idx.byPrefix[p] = idx.byPrefix[p] === undefined ? rec : null;   // null = ambiguous
  });
  return idx;
}

/** The Sales Analysis tabs know a product only by its title, so the number and the image are
 * matched on the title, exactly first and then on the leading 40 characters when that is unique.
 * No match is not a reason to stay silent: the signal fires with the title as its identity. */
function signalsIdentify_(index, title) {
  const n = signalsNorm_(title);
  let hit = n ? index.byTitle[n] : null;
  if (!hit && n) {
    const p = index.byPrefix[n.slice(0, SIG_TITLE_PREFIX)];
    if (p) hit = p;
  }
  return {
    item_id: hit ? hit.item_id : '',
    image: hit ? hit.image : '',
    key: hit && hit.item_id ? hit.item_id : signalsText_(title, SIG_MAX_TEXT),
  };
}

function signalsReadDayTab_(account, day) {
  if (typeof bridgeReadRows_ !== 'function') return { ok: false, reason: 'not connected yet' };
  const candidates = signalsDayTabCandidates_(day);
  if (!candidates.length) return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'sales_analysis', tab: candidates,
    expect: SIG_SA_COLS, limit: SIG_SA_LIMIT,
  });
  if (!read || !read.ok) return { ok: false, reason: (read && read.reason) || 'not connected yet' };
  if (!signalsTabIsCandidate_(read.tab, candidates)) return { ok: false, reason: 'no tab for ' + day + ' yet' };
  return read;
}

/** Signals 1 and 2 out of one read of one tab. */
function signalsSalesSignals_(account, day, th, read, index, owners, found) {
  const keys = signalsKeys_(read.headers, [SIG_SA_TITLE, SIG_SA_EARNING, SIG_SA_PRIORITY,
    SIG_SA_GENERAL, SIG_SA_RAW_PROFIT, SIG_SA_ACTUAL_PROFIT]);
  const worst = [];

  read.rows.forEach(function (r) {
    const title = signalsText_(signalsCell_(r, keys, SIG_SA_TITLE), SIG_MAX_TEXT);
    if (!title || signalsNorm_(title) === signalsNorm_(SIG_SA_TOTAL_ROW)) return;

    const who = signalsIdentify_(index, title);
    const owner = owners[who.item_id] || null;
    const profit = signalsMoney_(signalsNum_(signalsCell_(r, keys, SIG_SA_ACTUAL_PROFIT)));
    const earning = signalsMoney_(signalsNum_(signalsCell_(r, keys, SIG_SA_EARNING)));
    // The tab's own two ad-fee columns, added and not adjusted (see the header note).
    const adFees = signalsMoney_(signalsNum_(signalsCell_(r, keys, SIG_SA_PRIORITY))
      + signalsNum_(signalsCell_(r, keys, SIG_SA_GENERAL)));

    if (profit < th.negativeBelow) {
      found.push(signalsCandidate_(account, SIG_TYPE_NEGATIVE, day, who, title, owner, profit, th.negativeBelow, {
        'Actual Profit': profit,
        'Raw Profit': signalsMoney_(signalsNum_(signalsCell_(r, keys, SIG_SA_RAW_PROFIT))),
        'Order Earning': earning,
        ad_fees: adFees,
        sheet_row: r._row,
        tab: read.tab,
      }));
    }

    if (adFees > 0 && adFees >= earning) {
      worst.push({
        who: who, title: title, owner: owner, adFees: adFees, earning: earning, profit: profit,
        excess: signalsMoney_(adFees - earning), row: r._row,
      });
    }
  });

  worst.sort(function (a, b) { return b.excess - a.excess || b.adFees - a.adFees; });
  worst.slice(0, th.worstPerAccount).forEach(function (w) {
    found.push(signalsCandidate_(account, SIG_TYPE_WORST_CPC, day, w.who, w.title, w.owner, w.adFees, w.earning, {
      ad_fees: w.adFees,
      'Order Earning': w.earning,
      'Actual Profit': w.profit,
      ad_spend_over_earning: w.excess,
      sheet_row: w.row,
      tab: read.tab,
    }));
  });
}

function signalsReadReturns_(account) {
  if (typeof bridgeReadRows_ !== 'function') return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'order_processing', tab: [SIG_RET_TAB],
    expect: SIG_RET_COLS, limit: SIG_RET_LIMIT,
  });
  if (!read || !read.ok) return { ok: false, reason: (read && read.reason) || 'not connected yet' };
  if (signalsNorm_(read.tab) !== signalsNorm_(SIG_RET_TAB)) return { ok: false, reason: 'not connected yet' };
  return read;
}

/** Signal 3. The baseline is the item's OWN trailing rate over the window that ENDS the day before
 * the day being judged — a day inside its own baseline would raise the bar it has to clear. */
function signalsReturnsSignals_(account, day, th, read, index, owners, found) {
  const keys = signalsKeys_(read.headers, [SIG_RET_DATE, SIG_RET_TITLE, SIG_RET_TYPE, SIG_RET_REASON]);
  const windowStart = signalsAddDays_(day, -th.baselineDays);
  const items = {};

  read.rows.forEach(function (r) {
    const title = signalsText_(signalsCell_(r, keys, SIG_RET_TITLE), SIG_MAX_TEXT);
    if (!title) return;
    const when = signalsDateKey_(signalsCell_(r, keys, SIG_RET_DATE));
    if (!when) return;
    const inDay = when === day;
    const inBase = when >= windowStart && when < day;
    if (!inDay && !inBase) return;

    const n = signalsNorm_(title);
    if (!items[n]) items[n] = { title: title, day: 0, base: 0, reasons: {}, types: {} };
    const it = items[n];
    if (inBase) { it.base++; return; }
    it.day++;
    const reason = signalsText_(signalsCell_(r, keys, SIG_RET_REASON), 80);
    if (reason) it.reasons[reason] = (it.reasons[reason] || 0) + 1;
    let type = signalsText_(signalsCell_(r, keys, SIG_RET_TYPE), 40);
    if (SIG_RET_TYPES.indexOf(type) < 0) type = '';
    if (type) it.types[type] = (it.types[type] || 0) + 1;
  });

  Object.keys(items).forEach(function (n) {
    const it = items[n];
    if (!it.day) return;
    const rate = it.base / th.baselineDays;
    const spike = it.day >= th.returnsDayCount
      || (it.day >= th.returnsMinDay && it.day > th.returnsMultiple * rate);
    if (!spike) return;

    const who = signalsIdentify_(index, it.title);
    const owner = owners[who.item_id] || null;
    found.push(signalsCandidate_(account, SIG_TYPE_RETURNS, day, who, it.title, owner,
      it.day, Math.round(rate * 100) / 100, {
        // Counts and reasons only — §27 sends this card to the owning lister, who never sees money.
        returns_today: it.day,
        baseline_count: it.base,
        baseline_days: th.baselineDays,
        baseline_per_day: Math.round(rate * 100) / 100,
        reasons: signalsCounts_(it.reasons),
        types: signalsCounts_(it.types),
      }));
  });
}

function signalsCounts_(bag) {
  return Object.keys(bag).map(function (k) { return { label: k, count: bag[k] }; })
    .sort(function (a, b) { return b.count - a.count; });
}

/** One candidate signal: the eight SIGNALS columns plus the card the screen draws, which lives in
 * DASH_CACHE because §7 fixes SIGNALS at eight columns and no module may widen it. */
function signalsCandidate_(account, type, day, who, title, owner, value, baseline, extra) {
  const card = {
    date: day, account: account, type: type,
    item_id: who.item_id, title: title, image: who.image,
    value: value, baseline: baseline,
    targeted_roles: SIG_ROLES_FOR_TYPE[type] || '',
    actions: SIG_ACTIONS[type] || [],
    owner_email: owner ? owner.email : '',
    owner_name: owner ? owner.name : '',
  };
  Object.keys(extra || {}).forEach(function (k) { card[k] = extra[k]; });
  return {
    key: signalsKey_(account, type, day, who.key),
    period: signalsPeriod_(type, day, who.key),
    account: account, type: type, date: day, item_key: who.key,
    value: value, baseline: baseline, targeted_roles: card.targeted_roles,
    owner_email: card.owner_email, title: title, item_id: who.item_id, card: card,
  };
}

// ---------- raising (write once, notify once, log once) ----------
/** The SIGNALS index is rebuilt INSIDE the lock so two runs cannot both raise the same problem,
 * and every fresh row goes down in a single setValues — the missed-checkpoint sweep's habit of
 * writing row by row inside a portal-wide lock is exactly what not to copy here. */
function signalsRaise_(found, actor) {
  if (!found.length) return [];
  const db = getPortalDb_(false);
  const sh = db.getSheetByName('SIGNALS');
  if (!sh) throw new Error('SIGNALS tab missing — run setupDatabase()');
  const cols = DB_TABS.SIGNALS;
  const dateCol = cols.indexOf('date') + 1;
  const itemCol = cols.indexOf('item_id') + 1;
  const stamp = now_();
  const fresh = [];

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const vals = sh.getDataRange().getValues();
    const head = vals[0].map(function (h) { return String(h); });
    const seen = {};
    for (let i = 1; i < vals.length; i++) {
      const rec = {};
      head.forEach(function (h, c) { rec[h] = vals[i][c]; });
      seen[signalsKey_(rec.account, rec.type, rec.date, rec.item_id)] = true;
    }

    const rows = [];
    found.forEach(function (f) {
      if (seen[f.key]) return;
      seen[f.key] = true;
      // item_id carries the eBay number when the Main Sheet knows it and the item's own title
      // when it does not — the daily P&L tabs have no number to carry (see the header note).
      rows.push(cols.map(function (c) {
        if (c === 'date') return f.date;
        if (c === 'account') return f.account;
        if (c === 'item_id') return f.item_id || f.item_key;
        if (c === 'type') return f.type;
        if (c === 'value') return f.value;
        if (c === 'baseline') return f.baseline;
        if (c === 'targeted_roles') return f.targeted_roles;
        return '';
      }));
      fresh.push(f);
    });

    if (rows.length) {
      const first = Math.max(sh.getLastRow(), 1) + 1;
      // Format before value: a listing title beginning with '=' must land as text, not as a
      // formula in the portal's own database.
      sh.getRange(first, dateCol, rows.length, 1).setNumberFormat('@');
      sh.getRange(first, itemCol, rows.length, 1).setNumberFormat('@');
      sh.getRange(first, 1, rows.length, cols.length).setValues(rows);
    }
    signalsCacheCards_(db, found, stamp);
  } finally { lock.releaseLock(); }

  // logActivity_ and notify_ both write, so nothing below runs while the lock is held.
  signalsNotify_(fresh, actor);
  return fresh;
}

/** DASH_CACHE upserted on (metric, account, period) and only when the card actually changed — a
 * 15-minute trigger must not rewrite the same tile forever. Recomputed cache figures are not
 * audited changes, so these rows are deliberately not logged. */
function signalsCacheCards_(db, found, stamp) {
  const sh = db.getSheetByName('DASH_CACHE');
  if (!sh) return;
  const vals = sh.getDataRange().getValues();
  const at = {}, was = {};
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== SIG_DASH_METRIC) continue;
    const k = vals[i][1] + '|' + vals[i][2];
    at[k] = i + 1;
    was[k] = String(vals[i][3]);
  }
  const add = [];
  found.forEach(function (f) {
    const json = JSON.stringify(f.card);
    const k = f.account + '|' + f.period;
    if (at[k]) {
      if (was[k] === json) return;
      sh.getRange(at[k], 1, 1, 5).setValues([[SIG_DASH_METRIC, f.account, f.period, json, stamp]]);
      was[k] = json;
      return;
    }
    at[k] = -1;
    was[k] = json;
    add.push([SIG_DASH_METRIC, f.account, f.period, json, stamp]);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 5).setValues(add);
}

/** §14: a raised signal reaches its targeted roles, and stays pinned until acknowledged. Account
 * scoping applies — a lister scoped to one account is not paged about another. */
function signalsNotify_(fresh, actor) {
  if (!fresh.length) return;
  const users = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; });

  fresh.slice(0, SIG_NOTIFY_MAX).forEach(function (f) {
    const msg = signalsMessage_(f);
    const ref = SIG_REF + f.key;
    const tokens = String(f.targeted_roles || '').split(',').map(function (t) { return t.trim(); });
    let toManagement = false;
    const sent = {};
    tokens.forEach(function (token) {
      if (!token) return;
      if (MGMT_ROLES.indexOf(token) >= 0) { toManagement = true; return; }
      if (token === SIG_TARGET_OWNING_LISTER) {
        if (!f.owner_email || sent[normalizeEmail(f.owner_email)]) return;
        sent[normalizeEmail(f.owner_email)] = true;
        notify_(f.owner_email, f.type, msg, ref);
        return;
      }
      users.forEach(function (u) {
        if (String(u.role) !== token) return;
        const scope = u.accounts_access !== undefined ? u.accounts_access : u.accounts;
        if (!signalsAccountsAllow_(scope, f.account)) return;
        const e = normalizeEmail(u.email);
        if (sent[e]) return;
        sent[e] = true;
        notify_(u.email, f.type, msg, ref);
      });
    });
    if (toManagement) notifyManagement_(f.type, msg, ref);
    logActivity_(actor || 'system', 'SIGNAL_RAISED', f.account + '!' + (f.item_id || f.item_key),
      '', f.type + ' ' + f.value, f.date);
  });

  if (fresh.length > SIG_NOTIFY_MAX) {
    const extra = fresh.length - SIG_NOTIFY_MAX;
    notifyManagement_('Signals', extra + ' further signals were raised — open your pinned signal cards to work through them.', SIG_REF + 'batch');
    logActivity_(actor || 'system', 'SIGNAL_RAISED_BATCH', 'SIGNALS', '', String(fresh.length),
      'notified ' + SIG_NOTIFY_MAX + ' individually');
  }
}

/* V2 §4 notification law: what happened · account · item (ID + short title) · figures ·
 * why it matters · what to do. The old "value 1.03 baseline 3.03" format is banned. */
function signalsMessage_(f) {
  const title = signalsText_(f.title, 55);
  const item = (f.item_id ? f.item_id : '') + (title ? (f.item_id ? ' · ' : '') + title : '');
  const head = f.account + (item ? ' · ' + item : '');
  if (f.type === SIG_TYPE_NEGATIVE) {
    return '🔴 Loss item on ' + head + ' — made ' + signalsGbp_(f.value) + ' on ' + f.date +
      '. Every sale at this price loses money. Change the price or the advertising, or Management decides to keep it.';
  }
  if (f.type === SIG_TYPE_WORST_CPC) {
    return '🟠 Ads ate the margin on ' + head + ' — ' + signalsGbp_(f.value) + ' ad fees against ' +
      signalsGbp_(f.baseline) + ' earned on ' + f.date + '. The campaign is costing more than the item brings in — review the bid or the campaign type.';
  }
  if (f.type === SIG_TYPE_RETURNS) {
    return '🟠 Returns spike on ' + head + ' — ' + f.value + ' return(s) on ' + f.date +
      ' against its own ' + f.card.baseline_days + '-day rate of ' + f.baseline + ' a day. Check the listing photos/description and the supplier batch before it costs more.';
  }
  return '🔵 ' + f.type + ' · ' + head + ' on ' + f.date + '.';
}

// ---------- what one person sees ----------
/** The pinned cards for the caller, already stripped for their role. Two reads and no business
 * sheet: SIGNALS for the ledger and DASH_CACHE for the cards the engine already computed. */
function actionMySignals_(payload, ctx) {
  if (payload && payload.refresh) signalsRefresh_(ctx);

  const viewer = signalsViewer_(ctx);
  const role = viewer.role;
  const email = viewer.email;
  const cards = signalsCardIndex_();
  const out = [];
  let acknowledged = 0;

  readTab_('SIGNALS').forEach(function (s) {
    const account = String(s.account || '');
    const type = String(s.type || '');
    const date = signalsDateKey_(s.date);
    const itemKey = String(s.item_id === null || s.item_id === undefined ? '' : s.item_id);
    if (!type) return;
    /* SIGNALS doubles as a resolution LEDGER: alertsRecordResolution_ appends 'Account Report
       Alert' rows whose value is a category name and whose baseline is a message — bookkeeping,
       not a signal. Rendering those as cards put "Yesterday: Payment disputes / Its normal line:
       <a sentence>" on every manager's home screen. Only registered card types become cards. */
    if (SIG_LAUNCH_TYPES.indexOf(type) < 0 && type !== ADV_SIGNAL_TYPE) return;
    const card = cards[account + '|' + signalsPeriod_(type, date, itemKey)] || null;
    if (!signalsVisible_(type, account, String(s.targeted_roles || ''), card, viewer)) return;

    const acks = signalsParseAcks_(s.acknowledged_by);
    if (acks.mine[viewer.normalized]) { acknowledged++; return; }       // pinned until THIS person clears it

    const rec = {
      date: date, account: account, type: type, item_id: itemKey,
      value: s.value, baseline: s.baseline, targeted_roles: String(s.targeted_roles || ''),
      actions: SIG_ACTIONS[type] || [], pinned: true,
      acknowledged_by_others: acks.list,
      title: '', image: '',
    };
    if (card) {
      Object.keys(card).forEach(function (k) {
        if (k === 'targeted_roles' || k === 'actions') return;
        rec[k] = card[k];
      });
      rec.item_id = String(card.item_id || itemKey);
    }
    out.push(rec);
  });

  out.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const ta = SIG_LAUNCH_TYPES.indexOf(a.type), tb = SIG_LAUNCH_TYPES.indexOf(b.type);
    if (ta !== tb) return (ta < 0 ? 99 : ta) - (tb < 0 ? 99 : tb);
    return Math.abs(Number(b.value) || 0) - Math.abs(Number(a.value) || 0);
  });

  const shown = out.slice(0, SIG_CARDS_MAX);
  return {
    signals: stripForRole_(shown, role, email),
    count: shown.length, total: out.length, acknowledged: acknowledged,
    date: signalsYesterday_(), types: SIG_LAUNCH_TYPES,
    truncated: out.length > shown.length,
  };
}

/** §27 "and on refresh". Best-effort and throttled to the dashboard cadence: one Management click
 * must not start a full multi-workbook scan that a second click then starts again, and a refresh
 * asked for by anyone else is ignored rather than refused — it is a compute trigger, not a gate,
 * and every other role still gets the cards the last run left behind. */
function signalsRefresh_(ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) return false;
  const gapMs = signalsThreshold_('signals_refresh_min_minutes') * 60000;
  const cache = CacheService.getScriptCache();
  const last = Number(cache.get(SIG_LAST_RUN_KEY) || 0);
  if (last && Date.now() - last < gapMs) return false;
  cache.put(SIG_LAST_RUN_KEY, String(Date.now()), 21600);
  try {
    computeSignals();
  } catch (e) {
    // A refresh that fails must still show the cards the last run left behind.
    logActivity_(ctx.ident.email, 'SIGNALS_REFRESH_FAIL', 'SIGNALS', '', '', String(e && e.message || e));
    return false;
  }
  return true;
}

function signalsCardIndex_() {
  const map = {};
  readTab_('DASH_CACHE').forEach(function (r) {
    if (String(r.metric) !== SIG_DASH_METRIC) return;
    let card = null;
    try { card = JSON.parse(String(r.value || '')); } catch (e) { card = null; }
    if (card && typeof card === 'object') map[String(r.account) + '|' + String(r.period)] = card;
  });
  return map;
}

/** The caller as the gates need him. Identity, role and account scope all come from ctx — never
 * from the payload (RL-1). */
function signalsViewer_(ctx) {
  return {
    role: String(ctx.user.role),
    email: ctx.ident.email,
    normalized: normalizeEmail(ctx.ident.email),
    accounts: String(ctx.user.accounts === undefined ? '' : ctx.user.accounts),
    mgmt: isMgmt_(ctx.user.role, ctx.ident.email),
    profit: canSeeProfit_(ctx.user.role),
  };
}

/** Three gates, all server-side (RL-4): the account must be in the caller's access, the caller
 * must be one of the people the signal was raised for, and any signal carrying money needs profit
 * clearance — including a type Management registers later, which defaults to profit-restricted. */
function signalsVisible_(type, account, targetedRoles, card, viewer) {
  if (!viewer.mgmt && !signalsAccountsAllow_(viewer.accounts, account)) return false;
  if (SIG_COUNT_ONLY_TYPES.indexOf(type) < 0 && !viewer.profit) return false;

  const tokens = String(targetedRoles || '').split(',').map(function (t) { return t.trim(); });
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token === SIG_TARGET_OWNING_LISTER) {
      // No card means no owner on record, and an unowned signal is never shown to a lister.
      if (card && card.owner_email && normalizeEmail(card.owner_email) === viewer.normalized) return true;
      continue;
    }
    if (token === viewer.role) return true;
    if (MGMT_ROLES.indexOf(token) >= 0 && viewer.mgmt) return true;
  }
  return false;
}

/** acknowledged_by is append-only free text, written in the format the Wrong Advertising alarms
 * already use ('email @ timestamp — note', joined by ' | ') so one ledger reads the same however
 * a signal was cleared. */
function signalsParseAcks_(raw) {
  const list = [], mine = {};
  String(raw === null || raw === undefined ? '' : raw).split('|').forEach(function (part) {
    const s = part.trim();
    if (!s) return;
    const at = s.indexOf(' @ ');
    const who = at > 0 ? s.slice(0, at).trim() : s;
    list.push(s);
    if (who.indexOf('@') > 0) mine[normalizeEmail(who)] = true;
  });
  return { list: list, mine: mine };
}

// ---------- acknowledging (logged, never a delete) ----------
/** §27: a signal stays pinned until acknowledged, and acknowledgements are logged. Per person, not
 * per signal — Management clearing a card must not blind Zain or the CS desk to the same problem.
 * Nothing is ever removed: the row stays and the trail grows. */
function actionAcknowledgeSignal_(payload, ctx) {
  const account = signalsText_(payload.account, SIG_MAX_TEXT);
  const type = signalsText_(payload.type, SIG_MAX_TEXT);
  const date = signalsDateKey_(payload.date);
  const itemKey = signalsText_(payload.item_id, SIG_MAX_TEXT);
  const note = signalsText_(payload.note, 500);
  if (!account || !type || !date) throw new Error(SAFE_ERROR_PREFIX + 'account, type and date are needed to clear a signal');

  const key = signalsKey_(account, type, date, itemKey);
  const viewer = signalsViewer_(ctx);
  const cards = signalsCardIndex_();
  const sh = getPortalDb_(false).getSheetByName('SIGNALS');
  if (!sh) throw new Error('SIGNALS tab missing — run setupDatabase()');

  let row = 0, old = '', next = '', already = false;
  const stamp = now_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const vals = sh.getDataRange().getValues();
    const head = vals[0].map(function (h) { return String(h); });
    const col = signalsCol_(head, 'acknowledged_by');
    for (let i = 1; i < vals.length && !row; i++) {
      const rec = {};
      head.forEach(function (h, c) { rec[h] = vals[i][c]; });
      if (signalsKey_(rec.account, rec.type, rec.date, rec.item_id) !== key) continue;
      const period = signalsPeriod_(String(rec.type || ''), rec.date, String(rec.item_id || ''));
      const card = cards[String(rec.account || '') + '|' + period] || null;
      if (!signalsVisible_(String(rec.type || ''), String(rec.account || ''), String(rec.targeted_roles || ''), card, viewer)) {
        throw new Error('signal not addressed to this role');
      }
      row = i + 1;
      old = String(rec.acknowledged_by || '');
      const acks = signalsParseAcks_(old);
      if (acks.mine[viewer.normalized]) { already = true; next = old; break; }
      next = (old ? old + ' | ' : '') + ctx.ident.email + ' @ ' + stamp + (note ? ' — ' + note : '');
      sh.getRange(row, col).setValue(next);
    }
  } finally { lock.releaseLock(); }

  if (!row) throw new Error(SAFE_ERROR_PREFIX + 'that signal is no longer on the board');
  if (!already) {
    logActivity_(ctx.ident.email, 'ACK_SIGNAL', account + '!' + (itemKey || '-'), old, next, type + ' ' + date);
  }
  return {
    account: account, type: type, date: date, item_id: itemKey,
    acknowledged: true, acknowledged_at: stamp, alreadyAcknowledged: already, pinned: false,
  };
}

function signalsCol_(head, name) {
  if (SIG_WRITABLE_COLS.indexOf(name) < 0) throw new Error('write outside the SIGNALS whitelist: ' + name);
  const c = head.indexOf(name);
  if (c < 0) throw new Error('SIGNALS is missing column ' + name);
  return c + 1;
}

const ACTIONS_SIGNALS = {
  mySignals:         [actionMySignals_, 'any'],
  acknowledgeSignal: [actionAcknowledgeSignal_, 'any'],
};


/* ================= V2 §4 loss-item escalation (req 7) =================
 * Every 5 minutes inside shift hours: yesterday's loss items each hold ONE open loss_review
 * task on the advertising module holder, and the holder plus both team leads are re-pinged
 * until somebody closes it with one of exactly three decisions. The resolution feed is the
 * completed tasks themselves — visible to Management on the approvals/tasks screens. */
const LOSS_PING_START = 14;                       // 2 PM PKT (Q6 default until Hasib answers)
const LOSS_PING_END = 23;                         // 11 PM PKT

function runLossEscalationSweep() {
  /* R5: one-time night-watch bootstrap rides the fastest trigger in the project (this one,
   * every 5 minutes) so the FIRST backup + Ali sweep never wait for the hourly clock. A pure
   * property-check no-op forever after; sits above the ping-hours gate on purpose. */
  if (typeof nightWatchBootstrapOnce_ === 'function') {
    try { nightWatchBootstrapOnce_(); }
    catch (e) { logActivity_('trigger', 'ERROR:nwBootstrap', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  }
  /* R8 speed: today's Ali numbers reach the portal in ~5 minutes, not up to an hour. Today's
   * tab only — the hourly full sweep still catches late edits on older tabs. */
  if (typeof aliSweepFast === 'function') {
    try { aliSweepFast(); }
    catch (e) { logActivity_('trigger', 'ERROR:aliSweepFast', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  }
  /* 26 Aug: the hunting backup workbook reconciles here rather than on the hourly clock, because
   * "as soon as Irfan enters the product" is the whole point of it. Cheap by design — it reads
   * HUNTING_DB, and unless the fingerprint moved it never opens the workbook at all. */
  if (typeof huntBackupSync === 'function') {
    try { huntBackupSync(); }
    catch (e) { logActivity_('trigger', 'ERROR:huntBackupSync', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  }
  /* And its dated Drive copy. Day-gated by property, so 287 of the day's 288 sweeps cost one
   * property read — and the copy no longer depends on any single trigger surviving. */
  if (typeof huntBackupDailyCopy_ === 'function') {
    try { huntBackupDailyCopy_(); }
    catch (e) { logActivity_('trigger', 'ERROR:huntBackupCopy', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  }
  const hour = Number(Utilities.formatDate(new Date(), 'Asia/Karachi', 'H'));
  if (hour < LOSS_PING_START || hour >= LOSS_PING_END) return 'outside ping hours';

  const yesterday = Utilities.formatDate(new Date(Date.now() - 86400000), 'Asia/Karachi', 'yyyy-MM-dd');
  const losses = [];
  readTab_('SIGNALS').forEach(function (r) {
    if (String(r.type) !== SIG_TYPE_NEGATIVE) return;
    if (String(r.date) !== yesterday) return;
    const id = String(r.item_id || '').trim();
    if (id) losses.push({ item_id: id, account: String(r.account || ''), value: r.value });
  });
  if (!losses.length) return 'no loss items for ' + yesterday;

  const advHolders = usersWithModule_('advertising', ['Advertising Manager']);
  const tlHolders = usersWithModule_('team-lead', ['Team Lead']);
  if (!advHolders.length) {
    notifyManagement_('Loss item', '🔴 Loss items are waiting but nobody holds the advertising module — grant it on the Access desk.', 'loss:noholder');
    return 'no advertising holder';
  }

  const open = {}, resolvedToday = {};
  readTab_('TASKS').forEach(function (t) {
    if (String(t.type) !== 'loss_review') return;
    const id = String(t.item_id || '').trim();
    if (!id) return;
    if (String(t.status) === TASK_STATUS_COMPLETED) {
      if (String(t.decided_at || '').slice(0, 10) >= yesterday) resolvedToday[id] = true;
    } else { open[id] = t; }
  });

  const bucket = Utilities.formatDate(new Date(), 'Asia/Karachi', 'HHmm');
  let made = 0, pinged = 0;
  losses.forEach(function (l) {
    if (resolvedToday[l.item_id]) return;
    const gbp = signalsGbp_(l.value);
    if (!open[l.item_id]) {
      const taskId = 'T' + Utilities.getUuid().slice(0, 8);
      const stamp = now_();
      const due = Utilities.formatDate(new Date(Date.now() + 6 * 3600000), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ssXXX");
      tasksSheet_().appendRow([
        taskId, 'loss_review', l.account, l.item_id,
        'LOSS ITEM — made ' + gbp + ' yesterday (' + l.item_id + ')',
        'This item lost money yesterday. Close this task by submitting with exactly one of: ' + LOSS_RESOLUTIONS.join(' · '),
        '', 'system:loss', advHolders[0], 'High', due, TASK_STATUS_PENDING, stamp, stamp, '', '', '', '', '',
      ]);
      open[l.item_id] = { task_id: taskId, assigned_to: advHolders[0] };
      made++;
    }
    const t = open[l.item_id];
    const msg = '🔴 Loss item · ' + l.account + ' · ' + l.item_id + ' — made ' + gbp + ' yesterday and is still unresolved. ' +
      'Close it with one of: ' + LOSS_RESOLUTIONS.join(' · ') + ' → open My tasks (' + String(t.task_id) + '). This alert repeats every 5 minutes until it is closed.';
    notify_(String(t.assigned_to || advHolders[0]), 'Loss item', msg, 'loss:' + l.item_id + ':' + bucket);
    tlHolders.forEach(function (e) { notify_(e, 'Loss item', msg, 'loss:' + l.item_id + ':' + bucket); });
    pinged++;
  });
  logActivity_('system', 'LOSS_SWEEP', yesterday, '', made + ' new / ' + pinged + ' pinged', '');
  return made + ' task(s) created, ' + pinged + ' item(s) pinged';
}
