/** Phase 6 — §13.2 the Management Alerts Centre and the per-account KPI feed, §13.3 the
 * operations counters. Everything here reads each account's Daily Account Report workbook
 * through SheetBridge, by header name, one pass per tab per request.
 *
 * REALITY WINS over §13.2 in five places, and the code follows reality:
 *  · `_LEDGER` is a HIDDEN tab with 73 columns, not the ~44 the spec claims. Every metric §13.2
 *    names is there (orders, sale_amount, ad_spend, ad_per_order, tacos, aov, ctr, cvr,
 *    refund_rate, listings_active/new/deleted, listing_violation, promo_share) — but "impressions"
 *    is TWO columns, impressions_30d and impressions_day, so both are carried and neither is
 *    guessed at. Columns are addressed by header name; the count is never assumed.
 *  · The alerts tab is `_ALERTS` with NINE columns — §13.2's seven plus last_seen and resolved_at.
 *    resolved_at is populated on some rows that are still ACTIVE (ads:tacos is one), so `status`
 *    is the only thing that decides whether an alert is open.
 *  · Both `_ALERTS` and its human mirror `🔔 Notifications` exist (mirror headers on ROW 5, and
 *    repeated again at row 56 above the RESOLVED section — SheetBridge finds the header row, and
 *    the repeat and the section banners are filtered out here).
 *  · SheetBridge refuses to write any tab whose name starts with '_' (sync-owned), so the portal
 *    CANNOT write `_ALERTS` — and should not: the agent rebuilds it every run. The mirror's own
 *    row 2 says "Rebuilt automatically every run … agent respects manual resolutions", so the
 *    mirror's Status cell is the documented manual-resolution channel and that is what
 *    resolveAlert writes. The portal's own record of WHO resolved it lives in SIGNALS, exactly as
 *    the Wrong Advertising alarms do (§27), so resolve tracking survives shadow mode and survives
 *    the agent rebuilding the sheet.
 *  · Thresholds and targets are NOT hardcoded: `_CONFIG` carries z_threshold 2.0,
 *    drop_threshold -0.15, delta_threshold -0.1, dashboard_days 30 and the target_* set the
 *    workbook grades itself against (£2.00/order, 10% TACoS, 3% CTR, 3% CVR). They are read from
 *    each account's own sheet, per §4.2's rule for the fee config; the constants below are only
 *    the fallback for an account whose _CONFIG cannot be read.
 *
 * Footnote on the file itself: stock openpyxl 3.1.5 cannot even OPEN the Hafiza workbook — a
 * chart layout with x>1 raises ValueError until MinMax validation is monkeypatched. The portal
 * reads these workbooks through Sheets, never openpyxl, so it does not affect us; it is recorded
 * because a file that only opens with a patch is a file worth touching carefully.
 *
 * §4.2 / RL-4: this is business-dashboard data. The reader gate is §4.3's dashboard row
 * (Management, Ops Head, Team Lead, CS) plus the Advertising Manager's "ads view", and every
 * outgoing record still passes through stripForRole_.
 * §13.4: viewers are served from DASH_CACHE and the request cache; only the refresh trigger and a
 * Management refresh-now recompute. Missing connections read "not connected yet", never an error.
 */

const ALERTS_KIND = 'account_report';
const ALERTS_TZ_PKT = 'Asia/Karachi';                  // staff-facing stamps; sheet dates stay in the sheet's own tz

// Tab names verbatim. The emoji folds away in SheetBridge's header matching, so the plain
// spelling is offered as a second candidate for a workbook whose tab was renamed by hand.
const ALERTS_TAB_ALERTS = ['_ALERTS'];
const ALERTS_TAB_MIRROR = ['🔔 Notifications', 'Notifications'];
const ALERTS_TAB_LEDGER = ['_LEDGER'];
const ALERTS_TAB_CONFIG = ['_CONFIG'];

// _ALERTS headers, all nine.
const ALERTS_H_FINGERPRINT = 'fingerprint';
const ALERTS_H_RAISED = 'raised_at';
const ALERTS_H_LAST_SEEN = 'last_seen';
const ALERTS_H_SEVERITY = 'severity';
const ALERTS_H_CATEGORY = 'category';
const ALERTS_H_MESSAGE = 'message';
const ALERTS_H_ACTION = 'action';
const ALERTS_H_STATUS = 'status';
const ALERTS_H_RESOLVED_AT = 'resolved_at';
const ALERTS_EXPECT = [ALERTS_H_FINGERPRINT, ALERTS_H_RAISED, ALERTS_H_LAST_SEEN, ALERTS_H_SEVERITY,
  ALERTS_H_CATEGORY, ALERTS_H_MESSAGE, ALERTS_H_ACTION, ALERTS_H_STATUS, ALERTS_H_RESOLVED_AT];

// 🔔 Notifications headers (row 5) — the mirror's own words for the same six fields.
const ALERTS_M_RAISED = 'Raised';
const ALERTS_M_SEVERITY = 'Severity';
const ALERTS_M_CATEGORY = 'Category';
const ALERTS_M_MESSAGE = 'What happened';
const ALERTS_M_ACTION = 'Do this';
const ALERTS_M_STATUS = 'Status';
const ALERTS_MIRROR_EXPECT = [ALERTS_M_RAISED, ALERTS_M_SEVERITY, ALERTS_M_CATEGORY,
  ALERTS_M_MESSAGE, ALERTS_M_ACTION, ALERTS_M_STATUS];
const ALERTS_MIRROR_WHITELIST = [ALERTS_M_STATUS];     // RL-6: the only cell the portal may touch

const ALERTS_STATUS_ACTIVE = 'ACTIVE';
const ALERTS_STATUS_RESOLVED = 'RESOLVED';
const ALERTS_STATUSES = [ALERTS_STATUS_ACTIVE, ALERTS_STATUS_RESOLVED];

// Fingerprints are 'prefix:key' ('ads:tacos', 'late-del:2026-07-24', 'routine:dispatch:…').
const ALERTS_ADS_PREFIX = 'ads:';
// Mirrors Advertising.gs ADV_ALARM_REF. Declared here rather than referenced so this file does
// not depend on which order Apps Script loaded the two in.
const ALERTS_ADV_PREFIX = 'wrong-advertising:';
const ALERTS_SIGNAL_TYPE = 'Account Report Alert';     // §27 SIGNALS registry entry for this feed
const ALERTS_SIGNAL_ROLES = 'Management';
const ALERTS_SIGNAL_WRITABLE_COLS = ['acknowledged_by'];
const ALERTS_NOTIFY_REF = 'account-alert:';

const ALERTS_READ_LIMIT = 600;                         // 124 rows on the live workbook
const ALERTS_MIRROR_LIMIT = 400;                       // 126 rows, two sections
// One ledger row per day: ~4 years of headroom. A read that hits this ceiling returns the OLDEST
// rows, which would silently move the KPI window, so `truncated` is reported rather than ignored.
const ALERTS_LEDGER_LIMIT = 1500;
const ALERTS_CONFIG_LIMIT = 100;
const ALERTS_CENTRE_LIMIT = 200;
const ALERTS_CENTRE_MAX = 1000;
const ALERTS_NOTIFY_MAX = 25;                          // 48 ACTIVE on one account — a first run must not flood
const ALERTS_CACHE_SECONDS = 300;
const ALERTS_SWEEP_BUDGET_MS = 240000;                 // stop before a time trigger is killed
const ALERTS_MAX_TEXT = 1000;
// How far back up the append-only ACTIVITY_LOG a day's counter looks. 13 staff cannot generate
// this many logged actions in a day, and the counter reports when the window truncated.
const ALERTS_LOG_SCAN_ROWS = 20000;

// §4.3 business dashboard: Mgmt ✅ · TL ✅ · CS ✅ · Adv "ads view" · Hunter/Lister/OrdProc ❌.
const ALERTS_READ_ROLES = ['Team Lead', 'CS'];
const ALERTS_ADS_ROLE = 'Advertising Manager';

/** _CONFIG keys, and the values the live workbook holds — used ONLY when an account's own
 * _CONFIG cannot be read, and reported as source 'default' when they are. */
const ALERTS_CFG_KEYS = ['z_threshold', 'drop_threshold', 'delta_threshold', 'dashboard_days',
  'target_ad_per_order', 'target_tacos', 'target_ctr', 'target_cvr',
  'target_late_pct', 'target_inad_pct', 'target_str'];
const ALERTS_CFG_FALLBACK = { z_threshold: 2, drop_threshold: -0.15, delta_threshold: -0.1, dashboard_days: 30 };

/** The KPI cards. `metric` is the _LEDGER header, always. `label` is the workbook's own KPI-strip
 * wording for the eight tiles it publishes (Orders/day, Revenue/day, AOV, CTR, CVR, Ad £/order,
 * TACoS, Net £/day) and the ledger's own column name for the rest of §13.2's named metrics —
 * nothing is renamed into portal vocabulary. `good` records which direction the workbook itself
 * treats as better: it says "over the £2.00 ceiling" of ad £/order and "below the 3.0% floor" of
 * CVR, so ceilings are good:'low' and floors are good:'high'. `agg` matches the sheet: its KPI
 * strip is AVERAGEIFS over the window, a stock level is its last reading, a flow is its total. */
const ALERTS_KPI = [
  { metric: 'orders', label: 'Orders/day', unit: 'count', agg: 'avg', good: 'high' },
  { metric: 'sale_amount', label: 'Revenue/day', unit: 'gbp', agg: 'avg', good: 'high' },
  { metric: 'aov', label: 'AOV', unit: 'gbp', agg: 'avg', good: 'high' },
  { metric: 'ctr', label: 'CTR', unit: 'rate', agg: 'avg', good: 'high', target: 'target_ctr' },
  { metric: 'cvr', label: 'CVR', unit: 'rate', agg: 'avg', good: 'high', target: 'target_cvr' },
  { metric: 'ad_per_order', label: 'Ad £/order', unit: 'gbp', agg: 'avg', good: 'low', target: 'target_ad_per_order' },
  { metric: 'tacos', label: 'TACoS', unit: 'rate', agg: 'avg', good: 'low', target: 'target_tacos' },
  { metric: 'net_sales', label: 'Net £/day', unit: 'gbp', agg: 'avg', good: 'high' },
  { metric: 'ad_spend', label: 'ad_spend', unit: 'gbp', agg: 'avg', good: 'low' },
  { metric: 'impressions_day', label: 'impressions_day', unit: 'count', agg: 'avg', good: 'high' },
  { metric: 'impressions_30d', label: 'impressions_30d', unit: 'count', agg: 'last', good: 'high' },
  { metric: 'views', label: 'views', unit: 'count', agg: 'avg', good: 'high' },
  { metric: 'refund_rate', label: 'refund_rate', unit: 'rate', agg: 'avg', good: 'low' },
  { metric: 'str_pct', label: 'str_pct', unit: 'rate', agg: 'avg', good: 'high', target: 'target_str' },
  { metric: 'promo_share', label: 'promo_share', unit: 'rate', agg: 'avg', good: 'high' },
  { metric: 'listings_active', label: 'listings_active', unit: 'count', agg: 'last', good: 'high' },
  { metric: 'listings_new', label: 'listings_new', unit: 'count', agg: 'sum', good: 'high' },
  { metric: 'listings_deleted', label: 'listings_deleted', unit: 'count', agg: 'sum', good: 'low' },
  { metric: 'listing_violation', label: 'listing_violation', unit: 'count', agg: 'last', good: 'low' },
  { metric: 'late_delivery', label: 'late_delivery', unit: 'rate', agg: 'avg', good: 'low', target: 'target_late_pct' },
  { metric: 'inad_rate', label: 'inad_rate', unit: 'rate', agg: 'avg', good: 'low', target: 'target_inad_pct' },
];
// The ledger's own per-day verdict columns, carried alongside the sparkline so the portal shows
// the workbook's diagnosis ('🎯 APPEAL — CTR -44%…') rather than writing its own. z stays a
// number so it can be compared against the account's z_threshold without re-parsing.
const ALERTS_SERIES_NUMS = ['z', 'forecast'];
const ALERTS_SERIES_NOTES = ['weekday', 'why'];
const ALERTS_LEDGER_EXPECT = ['date', 'weekday'].concat(ALERTS_KPI.map(function (k) { return k.metric; }));

// §13.3 counter names, exactly as §13.3 names them.
const ALERTS_OPS_ORDERS_CAME = 'all orders came';
const ALERTS_OPS_RECHECKED = 'orders rechecked';
const ALERTS_OPS_WRONG = 'wrong orders found';
const ALERTS_OPS_CS = 'CS replies';
const ALERTS_OPS_OVERDUE = 'dispatch overdue';
// §13.2 names no metric for the alert count, so the cache key is spelled like §13.3's counters.
const ALERTS_CACHE_ACTIVE = 'active alerts';
// A KPI is cached under the account's OWN window ('30d' from its _CONFIG dashboard_days), never
// under a fixed label, so an account configured to a different window is never read as if it
// were thirty days.
const ALERTS_KPI_PERIOD_RE = /^\d{1,3}d$/;
// §5's own wording for the CS count field; the position inside ROLE_COUNT_FIELDS is the column.
const ALERTS_CS_REPLY_FIELD = 'buyer replies';

// ---------- text, numbers, dates ----------
function alertsNorm_(s) {
  if (s === null || s === undefined) return '';
  const raw = s instanceof Date ? alertsStamp_(s) : String(s);
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function alertsStamp_(d) { return Utilities.formatDate(d, ALERTS_TZ_PKT, 'yyyy-MM-dd HH:mm:ss'); }

const ALERTS_CTRL_RE = new RegExp('[\\u0000-\\u0009\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

function alertsText_(v, max) {
  if (v === null || v === undefined) return '';
  const raw = v instanceof Date ? alertsStamp_(v) : String(v);
  return raw.replace(ALERTS_CTRL_RE, '').trim().slice(0, max || ALERTS_MAX_TEXT);
}

/** A blank ledger cell is MISSING, not zero: the early rows of _LEDGER carry only sales, ads and
 * orders, and averaging a blank as zero would report a funnel collapse that never happened. */
function alertsNum_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  // '%' is deliberately NOT stripped: _LEDGER stores rates as decimals (tacos 0.1935) while
  // _CHARTDATA stores the same rate as 19.4, so a cell that arrives carrying a percent sign is
  // treated as missing rather than read a hundred times too large.
  const s = String(v === null || v === undefined ? '' : v).replace(/[£,\s]/g, '');
  if (!s) return NaN;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}

/** Records come back keyed by the RAW header the sheet spells, and these workbooks are written by
 * an agent but read by people who rename things: 'message ' with a trailing space would make a
 * direct lookup return nothing at all. The key is resolved once per read, not once per row. */
function alertsKeyMap_(headers, wanted) {
  const byNorm = {};
  (headers || []).forEach(function (h) {
    const raw = String(h === null || h === undefined ? '' : h);
    const n = alertsNorm_(raw);
    if (!n || byNorm[n] !== undefined) return;
    byNorm[n] = raw;
  });
  const map = {};
  wanted.forEach(function (w) { map[w] = byNorm[alertsNorm_(w)] || w; });
  return map;
}

/** Sortable key from anything these workbooks put in a date cell. SheetBridge hands dates back as
 * 'yyyy-MM-dd' (or with a time) in the SOURCE workbook's timezone; text cells come back as typed. */
function alertsDateKey_(value) {
  const s = alertsText_(value, 60);
  if (!s) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (iso) return iso[1] + iso[2] + iso[3] + (iso[4] ? iso[4] + iso[5] + (iso[6] || '00') : '000000');
  const d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, ALERTS_TZ_PKT, 'yyyyMMddHHmmss');
  return alertsNorm_(s);
}

function alertsYmd_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, ALERTS_TZ_PKT, 'yyyy-MM-dd');
  const s = alertsText_(value, 40);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function alertsToday_() { return Utilities.formatDate(new Date(), ALERTS_TZ_PKT, 'yyyy-MM-dd'); }

function alertsDateInput_(value) {
  const s = alertsText_(value, 40);
  if (!s) return alertsToday_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(SAFE_ERROR_PREFIX + 'date must look like 2026-08-10');
  return s;
}

/** Money is rounded here and nowhere earlier — every average, total and delta above is computed
 * at full precision (§ money GBP, two decimals, rounded only at the end). A rate stays a decimal
 * exactly as _LEDGER stores it (tacos 0.1935), so the screen decides how to show a percentage. */
function alertsRound_(value, unit) {
  if (value === null || value === undefined || !isFinite(value)) return '';
  if (unit === 'rate') return Math.round(value * 1000000) / 1000000;
  return Math.round(value * 100) / 100;
}

// ---------- access ----------
function alertsMayRead_(ctx) {
  const role = String(ctx.user.role || '');
  return isMgmt_(role, ctx.ident.email) || ALERTS_READ_ROLES.indexOf(role) >= 0 || role === ALERTS_ADS_ROLE;
}

/** The Advertising Manager gets §4.3's "ads view": the account KPI cards (TACoS and ad £/order are
 * his job) but only the ads-prefixed alerts plus the §8.7 alarms that are already addressed to him
 * (§14). 'ads:' is the workbook's own fingerprint prefix, not a category invented here. */
function alertsAdsViewOnly_(ctx) {
  return String(ctx.user.role || '') === ALERTS_ADS_ROLE && !isMgmt_(ctx.user.role, ctx.ident.email);
}

function alertsMayRefresh_(ctx) { return isMgmt_(ctx.user.role, ctx.ident.email); }

/** Accounts whose Daily Account Report is linked (§6) — from CONNECTIONS, never a list in code. */
function alertsAccounts_() {
  const seen = {}, out = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.scope || '').trim() !== 'account') return;
    if (String(c.sheet_kind || '').trim() !== ALERTS_KIND) return;
    if (!String(c.spreadsheet_id || '').trim()) return;
    const name = String(c.account_name || '').trim();
    const n = alertsNorm_(name);
    if (!n || seen[n]) return;
    seen[n] = true;
    out.push(name);
  });
  return out;
}

function alertsAccount_(value) {
  const raw = alertsText_(value, 120);
  if (!raw) throw new Error(SAFE_ERROR_PREFIX + 'pick an account');
  const known = alertsAccounts_();
  const want = alertsNorm_(raw);
  for (let i = 0; i < known.length; i++) if (alertsNorm_(known[i]) === want) return known[i];
  throw new Error(SAFE_ERROR_PREFIX + 'that account has no Daily Account Report connected yet');
}

function alertsBridgeReady_() { return typeof bridgeReadRows_ === 'function'; }

// ---------- reads (one pass per tab) ----------
function alertsReadAlerts_(account) {
  if (!alertsBridgeReady_()) return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: ALERTS_KIND, tab: ALERTS_TAB_ALERTS,
    expect: ALERTS_EXPECT, limit: ALERTS_READ_LIMIT,
  });
  if (!read.ok) return read;
  const at = alertsKeyMap_(read.headers, ALERTS_EXPECT);
  const rows = [];
  read.rows.forEach(function (r) {
    const rec = alertsFromAlertsRow_(account, r, read.tab, at);
    if (rec) rows.push(rec);
  });
  return { ok: true, tab: read.tab, rows: rows, truncated: !!read.truncated };
}

function alertsFromAlertsRow_(account, r, tabName, at) {
  const fingerprint = alertsText_(r[at[ALERTS_H_FINGERPRINT]], 200);
  const status = alertsText_(r[at[ALERTS_H_STATUS]], 40);
  const message = alertsText_(r[at[ALERTS_H_MESSAGE]], ALERTS_MAX_TEXT);
  if (!fingerprint && !message) return null;
  // A row repeating the header (the mirror does this at row 56; _ALERTS does not) is structure.
  if (alertsNorm_(fingerprint) === alertsNorm_(ALERTS_H_FINGERPRINT)) return null;
  return {
    account: account, source: tabName, row: r._row,
    fingerprint: fingerprint,
    raised_at: alertsText_(r[at[ALERTS_H_RAISED]], 60),
    last_seen: alertsText_(r[at[ALERTS_H_LAST_SEEN]], 60),
    severity: alertsText_(r[at[ALERTS_H_SEVERITY]], 40),
    category: alertsText_(r[at[ALERTS_H_CATEGORY]], 80),
    message: message,
    action: alertsText_(r[at[ALERTS_H_ACTION]], ALERTS_MAX_TEXT),
    status: status,
    // REALITY: resolved_at is filled on some rows that are still ACTIVE, so it is reported and
    // never used to decide whether an alert is open.
    resolved_at: alertsText_(r[at[ALERTS_H_RESOLVED_AT]], 60),
  };
}

/** The human mirror. Rows 4 and 55 are section banners ('ACTIVE — 48 open'), row 56 repeats the
 * header: a row without a Severity AND without a Status is layout, not an alert. */
function alertsReadMirror_(account) {
  if (!alertsBridgeReady_()) return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: ALERTS_KIND, tab: ALERTS_TAB_MIRROR,
    expect: ALERTS_MIRROR_EXPECT, limit: ALERTS_MIRROR_LIMIT,
  });
  if (!read.ok) return read;
  const at = alertsKeyMap_(read.headers, ALERTS_MIRROR_EXPECT);
  const rows = [];
  read.rows.forEach(function (r) {
    const severity = alertsText_(r[at[ALERTS_M_SEVERITY]], 40);
    const status = alertsText_(r[at[ALERTS_M_STATUS]], 40);
    if (!severity && !status) return;
    if (alertsNorm_(status) === alertsNorm_(ALERTS_M_STATUS)) return;
    rows.push({
      account: account, source: read.tab, row: r._row, fingerprint: '',
      raised_at: alertsText_(r[at[ALERTS_M_RAISED]], 60), last_seen: '',
      severity: severity,
      category: alertsText_(r[at[ALERTS_M_CATEGORY]], 80),
      message: alertsText_(r[at[ALERTS_M_MESSAGE]], ALERTS_MAX_TEXT),
      action: alertsText_(r[at[ALERTS_M_ACTION]], ALERTS_MAX_TEXT),
      status: status, resolved_at: '',
    });
  });
  return { ok: true, tab: read.tab, rows: rows, truncated: !!read.truncated };
}

/** Thresholds and targets from the account's own _CONFIG (§4.2's rule: read config from the sheet,
 * never hardcode). An account whose _CONFIG will not open falls back and says so. */
function alertsConfig_(account) {
  const out = { values: {}, source: 'default' };
  ALERTS_CFG_KEYS.forEach(function (k) {
    if (ALERTS_CFG_FALLBACK[k] !== undefined) out.values[k] = ALERTS_CFG_FALLBACK[k];
  });
  if (!alertsBridgeReady_()) return out;
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: ALERTS_KIND, tab: ALERTS_TAB_CONFIG,
    expect: ['key', 'value', 'description'], limit: ALERTS_CONFIG_LIMIT,
  });
  if (!read.ok) return out;
  const at = alertsKeyMap_(read.headers, ['key', 'value']);
  read.rows.forEach(function (r) {
    const key = alertsText_(r[at.key], 60);
    if (ALERTS_CFG_KEYS.indexOf(key) < 0) return;
    const n = alertsNum_(r[at.value]);
    if (isFinite(n)) out.values[key] = n;
  });
  out.source = read.tab;
  return out;
}

/** _LEDGER read ONCE, transposed into one array per metric in the same loop. 73 columns are read
 * because that is what the tab has; only the metrics §13.2 names are kept. */
function alertsLedger_(account) {
  if (!alertsBridgeReady_()) return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: ALERTS_KIND, tab: ALERTS_TAB_LEDGER,
    expect: ALERTS_LEDGER_EXPECT, limit: ALERTS_LEDGER_LIMIT,
  });
  if (!read.ok) return read;
  const at = alertsKeyMap_(read.headers, ['date'].concat(ALERTS_SERIES_NUMS, ALERTS_SERIES_NOTES,
    ALERTS_KPI.map(function (k) { return k.metric; })));

  const ordered = read.rows.slice().sort(function (a, b) {
    const x = alertsDateKey_(a[at.date]), y = alertsDateKey_(b[at.date]);
    return x < y ? -1 : x > y ? 1 : 0;
  });

  const dates = [], series = {}, extra = {};
  ALERTS_KPI.forEach(function (k) { series[k.metric] = []; });
  ALERTS_SERIES_NUMS.concat(ALERTS_SERIES_NOTES).forEach(function (k) { extra[k] = []; });
  ordered.forEach(function (r) {
    dates.push(alertsYmd_(r[at.date]) || alertsText_(r[at.date], 40));
    ALERTS_KPI.forEach(function (k) { series[k.metric].push(alertsNum_(r[at[k.metric]])); });
    ALERTS_SERIES_NUMS.forEach(function (k) {
      const n = alertsNum_(r[at[k]]);
      extra[k].push(isFinite(n) ? n : '');
    });
    ALERTS_SERIES_NOTES.forEach(function (k) { extra[k].push(alertsText_(r[at[k]], 300)); });
  });

  return {
    ok: true, tab: read.tab, dates: dates, series: series, extra: extra,
    row_count: dates.length, truncated: !!read.truncated,
    headers_seen: read.headers.length,
  };
}

// ---------- §13.2 the KPI cards ----------
/** The workbook's KPI strip covers the 30 days ENDING THE DAY BEFORE its run stamp (09 Jul–07 Aug
 * against an 08 Aug run) because the newest ledger day is still 🟡 PROVISIONAL — 53% complete at
 * the last run. The newest row is therefore excluded from the card windows and kept in the
 * sparkline, so the portal tile and the Dashboard tab the manager also opens show one number. */
function alertsWindows_(count, days) {
  const end = count > 1 ? count - 1 : count;
  const curFrom = Math.max(0, end - days);
  const prevFrom = Math.max(0, curFrom - days);
  return { curFrom: curFrom, curTo: end, prevFrom: prevFrom, prevTo: curFrom };
}

function alertsAgg_(values, from, to, agg) {
  let sum = 0, count = 0, max = NaN, min = NaN, last = NaN;
  for (let i = from; i < to; i++) {
    const v = values[i];
    if (!isFinite(v)) continue;                      // blanks skipped, exactly as AVERAGEIFS skips them
    sum += v;
    count++;
    if (!isFinite(max) || v > max) max = v;
    if (!isFinite(min) || v < min) min = v;
    last = v;
  }
  if (!count) return null;
  const value = agg === 'sum' ? sum : agg === 'last' ? last : sum / count;
  return { value: value, total: sum, max: max, min: min, days: count };
}

function alertsCard_(def, values, win, cfg) {
  const cur = alertsAgg_(values, win.curFrom, win.curTo, def.agg);
  const prev = alertsAgg_(values, win.prevFrom, win.prevTo, def.agg);
  const target = def.target !== undefined ? cfg.values[def.target] : undefined;
  const card = {
    metric: def.metric, label: def.label, unit: def.unit, agg: def.agg, good: def.good,
    value: cur ? alertsRound_(cur.value, def.unit) : '',
    prev: prev ? alertsRound_(prev.value, def.unit) : '',
    total: cur ? alertsRound_(cur.total, def.unit) : '',
    max: cur ? alertsRound_(cur.max, def.unit) : '',
    min: cur ? alertsRound_(cur.min, def.unit) : '',
    days: cur ? cur.days : 0,
    delta: '', flag: '', target: '', target_met: '',
  };
  if (cur && prev && prev.value) {
    const delta = cur.value / prev.value - 1;
    card.delta = Math.round(delta * 10000) / 10000;
    // The flag names the _CONFIG threshold that fired — the workbook's own key, not a new word —
    // and only where falling is the bad direction.
    if (def.good === 'high') {
      if (delta <= cfg.values.drop_threshold) card.flag = 'drop_threshold';
      else if (delta <= cfg.values.delta_threshold) card.flag = 'delta_threshold';
    }
  }
  if (target !== undefined && isFinite(target)) {
    card.target = alertsRound_(target, def.unit);
    if (cur) card.target_met = def.good === 'low' ? cur.value <= target : cur.value >= target;
  }
  return card;
}

function alertsComputeKpis_(account) {
  const ledger = alertsLedger_(account);
  if (!ledger.ok) return { ok: false, account: account, reason: ledger.reason || 'not connected yet' };

  const cfg = alertsConfig_(account);
  let days = Number(cfg.values.dashboard_days);
  if (!(days > 0 && days <= 400)) days = ALERTS_CFG_FALLBACK.dashboard_days;
  const win = alertsWindows_(ledger.dates.length, days);

  const cards = ALERTS_KPI.map(function (def) {
    return alertsCard_(def, ledger.series[def.metric], win, cfg);
  });

  const seriesFrom = Math.max(0, ledger.dates.length - days);
  const values = {};
  ALERTS_KPI.forEach(function (k) {
    values[k.metric] = ledger.series[k.metric].slice(seriesFrom).map(function (v) {
      return alertsRound_(v, k.unit);
    });
  });
  const extra = {};
  Object.keys(ledger.extra).forEach(function (k) { extra[k] = ledger.extra[k].slice(seriesFrom); });

  return {
    ok: true, account: account, tab: ledger.tab, window_days: days,
    from: ledger.dates[win.curFrom] || '', to: ledger.dates[win.curTo - 1] || '',
    prev_from: ledger.dates[win.prevFrom] || '', prev_to: ledger.dates[win.prevTo - 1] || '',
    latest_ledger_date: ledger.dates[ledger.dates.length - 1] || '',
    // Named rather than hidden: this is the newest ledger day, in the sparkline but left out of
    // the cards because the workbook's own KPI strip leaves it out while it is 🟡 PROVISIONAL.
    newest_excluded: win.curTo < ledger.dates.length ? ledger.dates[ledger.dates.length - 1] : '',
    cards: cards,
    series: { dates: ledger.dates.slice(seriesFrom), values: values, extra: extra },
    thresholds: {
      z_threshold: cfg.values.z_threshold, drop_threshold: cfg.values.drop_threshold,
      delta_threshold: cfg.values.delta_threshold, source: cfg.source,
    },
    ledger_rows: ledger.row_count, ledger_columns: ledger.headers_seen,
    truncated: ledger.truncated, computed_at: now_(),
  };
}

/** One account's cards and sparklines. Repeat viewers inside five minutes are served from the
 * request cache; the fleet view (no account) is served from DASH_CACHE and never recomputes per
 * viewer (§13.4). */
function actionAccountKpis_(payload, ctx) {
  if (!alertsMayRead_(ctx)) throw new Error('dashboard roles only');

  if (!payload.account) return alertsFleetKpis_(ctx);

  const account = alertsAccount_(payload.account);
  const refresh = !!payload.refresh && alertsMayRefresh_(ctx);
  const cache = CacheService.getScriptCache();
  const key = alertsKpiKey_(account);
  if (!refresh) {
    const hit = cache.get(key);
    if (hit) {
      try {
        const parsed = JSON.parse(hit);
        parsed.cached = true;
        return alertsKpiOut_(parsed, ctx);
      } catch (e) { /* corrupt entry → recompute */ }
    }
  }

  const out = alertsComputeKpis_(account);
  if (out.ok) {
    try { cache.put(key, JSON.stringify(out), ALERTS_CACHE_SECONDS); } catch (e) { /* oversized → serve uncached */ }
    alertsCacheCards_(account, out.cards, out.window_days);
  }
  out.cached = false;
  return alertsKpiOut_(out, ctx);
}

function alertsKpiOut_(out, ctx) {
  if (out.cards) out.cards = stripForRole_(out.cards, ctx.user.role, ctx.ident.email);
  return out;
}

/** Every connected account's cards straight from DASH_CACHE — no workbook is opened. An account
 * the refresh has not reached yet says so rather than making a viewer wait for six workbooks. */
function alertsFleetKpis_(ctx) {
  const accounts = alertsAccounts_();
  const groups = {}, activeAlerts = {}, byAccount = {};
  readTab_('DASH_CACHE').forEach(function (r) {
    const account = String(r.account || ''), metric = String(r.metric || ''), period = String(r.period || '');
    if (metric === ALERTS_CACHE_ACTIVE) { activeAlerts[account] = r.value; return; }
    if (!ALERTS_KPI_PERIOD_RE.test(period)) return;
    const key = account + '|' + period;
    if (!groups[key]) groups[key] = { account: account, period: period, stamp: '', at: {} };
    groups[key].at[metric] = r.value;
    const stamp = alertsText_(r.computed_at, 40);
    if (stamp > groups[key].stamp) groups[key].stamp = stamp;
  });
  // A window changed in an account's _CONFIG leaves its old period's rows behind, so the freshest
  // window wins outright rather than two windows being mixed into one set of cards.
  Object.keys(groups).forEach(function (k) {
    const g = groups[k];
    if (!byAccount[g.account] || g.stamp > byAccount[g.account].stamp) byAccount[g.account] = g;
  });

  const out = accounts.map(function (account) {
    const held = byAccount[account];
    if (!held) return { ok: false, account: account, reason: 'not computed yet — the refresh has not reached this account' };
    const cards = [];
    ALERTS_KPI.forEach(function (def) {
      if (held.at[def.metric] === undefined) return;
      cards.push({ metric: def.metric, label: def.label, unit: def.unit, good: def.good, value: held.at[def.metric] });
    });
    return {
      ok: true, account: account,
      cards: stripForRole_(cards, ctx.user.role, ctx.ident.email),
      window_days: Number(held.period.slice(0, -1)) || '',
      active_alerts: activeAlerts[account] === undefined ? '' : activeAlerts[account],
      computed_at: held.stamp,
    };
  });
  return { accounts: out, from_cache: true, computed_at: now_() };
}

// ---------- §13.2 the Alerts Centre ----------
/** _ALERTS severity strings are not enumerated anywhere in REALITY-MAP — it documents
 * _VALIDATION's WARN/INFO vocabulary, which is a different tab — so nothing here treats severity
 * as a closed list. The raw string is always returned verbatim; only its SORT rank is read from
 * keywords, and an unrecognised severity ranks last rather than being rewritten into a known one. */
function alertsSeverityRank_(severity) {
  const n = alertsNorm_(severity);
  if (!n) return 0;
  if (n.indexOf('crit') >= 0 || n.indexOf('urgent') >= 0 || n.indexOf('act today') >= 0) return 4;
  if (n.indexOf('high') >= 0 || n.indexOf('alarm') >= 0 || n.indexOf('err') >= 0) return 3;
  if (n.indexOf('warn') >= 0 || n.indexOf('med') >= 0) return 2;
  if (n.indexOf('info') >= 0 || n.indexOf('low') >= 0 || n.indexOf('notice') >= 0) return 1;
  return 0;
}

function alertsIsActive_(status) { return alertsNorm_(status) === alertsNorm_(ALERTS_STATUS_ACTIVE); }

/** One account's ACTIVE alerts: _ALERTS if it is there (it carries the fingerprint §13.2 asks
 * for), otherwise the human mirror, which has everything except the fingerprint. */
function alertsActiveFor_(account) {
  let read = alertsReadAlerts_(account);
  if (!read.ok) read = alertsReadMirror_(account);
  if (!read.ok) return { ok: false, account: account, reason: read.reason || 'not connected yet' };
  const active = read.rows.filter(function (r) { return alertsIsActive_(r.status); });
  return { ok: true, account: account, tab: read.tab, active: active, total: read.rows.length, truncated: !!read.truncated };
}

/** One account's whole feed — its report alerts and its §8.7 alarms — held for the refresh
 * interval. Without this an eight-account Alerts Centre opens up to 24 workbooks per viewer: the
 * report, the Central Main Sheet and the Wrong Advertising tab, once for every person who looks. */
function alertsFeedKey_(account) { return 'alerts_feed_' + alertsNorm_(account).replace(/\s/g, '_'); }
function alertsKpiKey_(account) { return 'alerts_kpi_' + alertsNorm_(account).replace(/\s/g, '_'); }

function alertsAccountFeed_(account, refresh) {
  const key = alertsFeedKey_(account);
  const cache = CacheService.getScriptCache();
  if (!refresh) {
    const hit = cache.get(key);
    if (hit) {
      try {
        const parsed = JSON.parse(hit);
        parsed.cached = true;
        return parsed;
      } catch (e) { /* corrupt entry → re-read */ }
    }
  }
  const got = alertsActiveFor_(account);
  const out = {
    ok: !!got.ok, account: account, reason: got.reason || '', tab: got.tab || '',
    active: got.ok ? got.active : [], total: got.ok ? got.total : 0,
    truncated: !!got.truncated, alarms: alertsWrongAdvertising_([account]), cached: false,
  };
  try { cache.put(key, JSON.stringify(out), ALERTS_CACHE_SECONDS); } catch (e) { /* oversized → serve uncached */ }
  return out;
}

/** §8.7's Wrong Advertising alarms join the feed (§13.2). They are not rows of _ALERTS — they live
 * on the Central workbook and are resolved through Advertising's SIGNALS acknowledgement — so they
 * are mapped into the same shape and carry the fields that resolve them. */
function alertsWrongAdvertising_(accounts) {
  if (typeof advScanAlarms_ !== 'function') return [];
  let scan;
  try {
    scan = advScanAlarms_(accounts, ALERTS_CENTRE_LIMIT);
  } catch (e) {
    logActivity_('system', 'ALERTS_ALARM_SCAN_FAIL', accounts.join('|'), '', '', String(e && e.message || e));
    return [];
  }
  const acknowledged = typeof advSignalIndex_ === 'function' ? advSignalIndex_() : {};
  const out = [];
  (scan.alarms || []).forEach(function (a) {
    if (a.resolved_on_sheet) return;
    if (a.sides_agree) return;                 // corrected since it was written — not an alarm
    /* An acknowledgement is one person saying "seen" — it must not erase the alarm for everyone
       else (this feed is cached and SHARED). The ack rides along; whether to hide it is decided
       per caller in actionAlertsCentre_. */
    const sig = acknowledged[a.signal_key];
    out.push({
      acknowledged_by: sig ? String(sig.acknowledged_by || '') : '',
      account: a.account, source: 'Wrong Advertising', row: a.row,
      fingerprint: ALERTS_ADV_PREFIX + a.signal_key,
      raised_at: a.date, last_seen: '',
      // The sheet's own Type cell is the severity word here — 'ALARM'.
      severity: a.type, category: 'Wrong Advertising',
      message: 'item ' + a.item_id + ' — live on eBay: ' + (a.live_on_ebay || 'unknown')
        + (a.manager_wants ? ' · manager wants: ' + a.manager_wants : ''),
      action: '', status: ALERTS_STATUS_ACTIVE, resolved_at: '',
      item_id: a.item_id, listing_title: a.listing_title,
    });
  });
  return out;
}

function alertsSort_(rows) {
  rows.sort(function (a, b) {
    const ra = alertsSeverityRank_(a.severity), rb = alertsSeverityRank_(b.severity);
    if (ra !== rb) return rb - ra;
    const ka = alertsDateKey_(a.raised_at), kb = alertsDateKey_(b.raised_at);
    if (ka !== kb) return ka < kb ? 1 : -1;
    return alertsNorm_(a.account) < alertsNorm_(b.account) ? -1 : 1;
  });
  return rows;
}

/** §13.2 — ACTIVE alerts across every connected account, most severe first and newest within that,
 * each carrying its account and everything resolveAlert needs for one click. */
function actionAlertsCentre_(payload, ctx) {
  if (!alertsMayRead_(ctx)) throw new Error('dashboard roles only');
  const adsOnly = alertsAdsViewOnly_(ctx);
  const accounts = payload.account ? [alertsAccount_(payload.account)] : alertsAccounts_();
  const wantSeverity = alertsNorm_(payload.severity);
  const wantCategory = alertsNorm_(payload.category);
  let limit = Number(payload.limit) || ALERTS_CENTRE_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > ALERTS_CENTRE_MAX) limit = ALERTS_CENTRE_MAX;
  const refresh = !!payload.refresh && alertsMayRefresh_(ctx);

  const perAccount = [], notConnected = [];
  let rows = [], cachedAll = true;
  accounts.forEach(function (account) {
    const got = alertsAccountFeed_(account, refresh);
    if (!got.cached) cachedAll = false;
    rows = rows.concat(got.alarms || []);
    if (!got.ok) {
      notConnected.push({ account: account, reason: got.reason });
      perAccount.push({ account: account, ok: false, reason: got.reason, alarms: (got.alarms || []).length });
      return;
    }
    perAccount.push({
      account: account, ok: true, active: got.active.length, of: got.total,
      alarms: (got.alarms || []).length, tab: got.tab,
    });
    rows = rows.concat(got.active);
  });

  const resolvedBy = alertsResolutionIndex_();
  const filtered = [];
  const advAllowed = advMaySeeAlarms_(ctx);
  const meNorm = normalizeEmail(ctx.ident.email);
  alertsSort_(rows).forEach(function (r) {
    if (adsOnly && r.fingerprint.indexOf(ALERTS_ADS_PREFIX) !== 0 && r.fingerprint.indexOf(ALERTS_ADV_PREFIX) !== 0) return;
    if (r.fingerprint.indexOf(ALERTS_ADV_PREFIX) === 0) {
      // §8.7 — Wrong Advertising alarms are for the advertising chain; the feed itself is shared
      // and unscoped, so the per-caller gate lives here.
      if (!advAllowed) return;
      /* Hidden only for the person who acknowledged it. The trail is parsed, never substring-
         matched: the trail stores the email VERBATIM while the caller's is normalized (googlemail
         folds to gmail, dots drop), so indexOf would fail for exactly Sir Hasib's own address —
         and a free-text note quoting someone's email would hide the alarm for the wrong person. */
      var ack = String(r.acknowledged_by || '');
      var mine = ack.split('|').some(function (part) {
        return normalizeEmail(part.split(' @ ')[0]) === meNorm;
      });
      if (mine) return;
      r.seen_by = ack;
    }
    if (wantSeverity && alertsNorm_(r.severity) !== wantSeverity) return;
    if (wantCategory && alertsNorm_(r.category) !== wantCategory) return;
    const trail = resolvedBy[alertsKey_(r.account, r.fingerprint, r.raised_at)];
    r.severity_rank = alertsSeverityRank_(r.severity);
    r.resolved_by = trail ? trail.acknowledged_by : '';
    // A row the portal has already resolved but the agent has not rebuilt yet still shows, marked,
    // rather than vanishing from a screen someone is looking at.
    r.resolution_pending = !!r.resolved_by;
    filtered.push(r);
  });

  return {
    alerts: stripForRole_(filtered.slice(0, limit), ctx.user.role, ctx.ident.email),
    count: Math.min(filtered.length, limit), active_total: filtered.length,
    per_account: perAccount, not_connected: notConnected,
    accounts: accounts, statuses: ALERTS_STATUSES, ads_view_only: adsOnly,
    from_cache: cachedAll && accounts.length > 0, computed_at: now_(),
  };
}

// ---------- §13.2 resolve tracking ----------
/** The portal's own key for one alert. The raised stamp is part of it, exactly as it is for a
 * Wrong Advertising alarm: fingerprints repeat ('ads:tacos' is one row the agent re-raises), and
 * without the stamp a fingerprint cleared last week would still read as cleared today. A workbook
 * with only the human mirror has no fingerprint, so there the stamp carries the identity alone.
 * Sheets re-parses an appended timestamp back into a Date, so both sides fold through the same
 * date key rather than being compared as text. */
function alertsKey_(account, fingerprint, raised) {
  return alertsNorm_(account) + '|' + alertsNorm_(fingerprint) + '|' + alertsDateKey_(raised);
}

function alertsResolutionIndex_() {
  const map = {};
  readTab_('SIGNALS').forEach(function (s) {
    if (alertsNorm_(s.type) !== alertsNorm_(ALERTS_SIGNAL_TYPE)) return;
    map[alertsKey_(s.account, s.item_id, s.date)] = { acknowledged_by: String(s.acknowledged_by || '') };
  });
  return map;
}

/** §13.2 one-click resolve. Three things happen, in this order:
 *  1. the alert is found on the account's own report and must still be ACTIVE there;
 *  2. the mirror's Status cell is set to RESOLVED through SheetBridge — which means shadow mode is
 *     honoured for free: with pipeline_write_external off the intent is logged as SHADOW_WRITE and
 *     returned as wouldWrite, and nothing reaches the live workbook;
 *  3. WHO resolved it is recorded in the portal's SIGNALS tab either way, because the alerts agent
 *     rebuilds that sheet on every run and the sheet has no column for a portal user.
 * The write matches on Status=ACTIVE *and* an explicit row, so a rebuild that moved or already
 * closed that row makes the write refuse instead of landing on somebody else's alert. */
function actionResolveAlert_(payload, ctx) {
  if (!alertsMayRead_(ctx)) throw new Error('dashboard roles only');
  const account = alertsAccount_(payload.account);
  const fingerprint = alertsText_(payload.fingerprint, 200);
  const note = alertsText_(payload.note, 500);

  if (fingerprint.indexOf(ALERTS_ADV_PREFIX) === 0) {
    if (typeof advAcknowledgeAlarm_ !== 'function') throw new Error(SAFE_ERROR_PREFIX + 'the advertising module is not deployed');
    if (typeof advMaySeeAlarms_ !== 'function' || !advMaySeeAlarms_(ctx)) throw new Error('management and advertising only');
    const done = advAcknowledgeAlarm_({ account: account, item_id: payload.item_id, date: payload.date, note: note }, ctx);
    CacheService.getScriptCache().remove(alertsFeedKey_(account));
    return {
      ok: true, account: account, fingerprint: fingerprint, status: ALERTS_STATUS_RESOLVED,
      // §8.7 surfaces that tab read-only, so its Status and Resolved cells stay the business's own.
      sheet: { ok: true, reason: 'recorded in SIGNALS — the Wrong Advertising tab is read-only' },
      shadow: false, resolved_by: done.acknowledged_by, resolved_at: now_(),
    };
  }

  let want = {
    raised_at: alertsText_(payload.raised_at, 60),
    category: alertsText_(payload.category, 80),
    message: alertsText_(payload.message, ALERTS_MAX_TEXT),
  };
  const onSheet = alertsReadAlerts_(account);
  if (onSheet.ok && fingerprint) {
    let hit = null;
    onSheet.rows.forEach(function (r) { if (alertsNorm_(r.fingerprint) === alertsNorm_(fingerprint)) hit = r; });
    if (!hit) throw new Error(SAFE_ERROR_PREFIX + 'that alert is no longer on ' + account + '\'s report');
    if (!alertsIsActive_(hit.status)) throw new Error(SAFE_ERROR_PREFIX + 'that alert is already ' + hit.status);
    want = { raised_at: hit.raised_at, category: hit.category, message: hit.message };
  }
  if (!want.raised_at && !want.message) throw new Error(SAFE_ERROR_PREFIX + 'nothing identifies that alert');

  const mirror = alertsReadMirror_(account);
  let row = 0, hits = 0;
  if (mirror.ok) {
    mirror.rows.forEach(function (r) {
      if (!alertsIsActive_(r.status)) return;
      if (want.raised_at && alertsDateKey_(r.raised_at) !== alertsDateKey_(want.raised_at)) return;
      if (want.category && alertsNorm_(r.category) !== alertsNorm_(want.category)) return;
      if (want.message && alertsNorm_(r.message) !== alertsNorm_(want.message)) return;
      hits++;
      row = r.row;
    });
  }
  if (hits > 1) throw new Error(SAFE_ERROR_PREFIX + 'more than one alert on that report matches — resolve it in the sheet');

  let write = { ok: false, reason: 'no matching row on ' + ALERTS_TAB_MIRROR[0] };
  if (hits === 1) {
    write = bridgeUpdateRow_(
      { scope: 'account', account: account, kind: ALERTS_KIND, tab: ALERTS_TAB_MIRROR, expect: ALERTS_MIRROR_EXPECT, row: row },
      ALERTS_M_STATUS, ALERTS_STATUS_ACTIVE, alertsStatusValues_(),
      ALERTS_MIRROR_WHITELIST, ctx.ident.email
    );
  }

  const trail = alertsRecordResolution_(account, fingerprint, want, note, ctx);
  // The centre reads its rows from a five-minute cache; dropping this account's entry means the
  // person who just resolved an alert sees it gone rather than sitting there for another refresh.
  CacheService.getScriptCache().remove(alertsFeedKey_(account));
  logActivity_(ctx.ident.email, 'ACCOUNT_ALERT_RESOLVED', account + '!' + (fingerprint || want.raised_at),
    ALERTS_STATUS_ACTIVE, ALERTS_STATUS_RESOLVED, (write.shadow ? 'shadow · ' : '') + want.message.slice(0, 200));

  const msg = ctx.user.name + ' resolved an alert on ' + account + ' — ' + (want.message || fingerprint)
    + (note ? ' — ' + note : '') + '.';
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) {
    notifyManagement_('Account alert resolved', msg, ALERTS_NOTIFY_REF + alertsKey_(account, fingerprint, want.raised_at));
  }

  return {
    ok: true, account: account, fingerprint: fingerprint, status: ALERTS_STATUS_RESOLVED,
    sheet: write, shadow: !!write.shadow, resolved_by: trail, resolved_at: now_(),
  };
}

function alertsStatusValues_() {
  const values = {};
  values[ALERTS_M_STATUS] = ALERTS_STATUS_RESOLVED;
  return values;
}

/** SIGNALS is the portal's own alarm ledger (§27) and the only place a portal user's name is
 * attached to one of these alerts. RL-6: the acknowledgement column is the only cell an action may
 * touch after the row is raised, and the trail is appended to, never overwritten. */
function alertsRecordResolution_(account, fingerprint, want, note, ctx) {
  const key = alertsKey_(account, fingerprint, want.raised_at);
  const stamp = (ctx.ident.email + ' @ ' + now_() + (note ? ' — ' + note : ''));
  const lock = LockService.getScriptLock();
  let next = stamp;
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('SIGNALS');
    const vals = sh.getDataRange().getValues();
    const head = vals[0].map(function (h) { return String(h); });
    const col = alertsSignalCol_(head, 'acknowledged_by');
    let row = 0;
    for (let i = 1; i < vals.length && !row; i++) {
      const rec = {};
      head.forEach(function (h, c) { rec[h] = vals[i][c]; });
      if (alertsNorm_(rec.type) !== alertsNorm_(ALERTS_SIGNAL_TYPE)) continue;
      if (alertsKey_(rec.account, rec.item_id, rec.date) !== key) continue;
      row = i + 1;
      const old = String(rec.acknowledged_by || '');
      next = old ? old + ' | ' + stamp : stamp;
      sh.getRange(row, col).setValue(next);
    }
    if (!row) {
      const rec = {
        date: want.raised_at, account: account, item_id: fingerprint, type: ALERTS_SIGNAL_TYPE,
        value: want.category, baseline: want.message.slice(0, 400),
        targeted_roles: ALERTS_SIGNAL_ROLES, acknowledged_by: next,
      };
      sh.appendRow(DB_TABS.SIGNALS.map(function (c) { return rec[c] === undefined ? '' : rec[c]; }));
    }
  } finally { lock.releaseLock(); }
  return next;
}

function alertsSignalCol_(head, name) {
  if (ALERTS_SIGNAL_WRITABLE_COLS.indexOf(name) < 0) throw new Error('write outside the SIGNALS whitelist: ' + name);
  const c = head.indexOf(name);
  if (c < 0) throw new Error('SIGNALS is missing column ' + name);
  return c + 1;
}

// ---------- §13.3 operations counters ----------
/** "all orders came" — counted from the order workbooks' own day tabs, one read per account. This
 * is the expensive counter, which is why the refresh trigger computes it into DASH_CACHE. */
function alertsOrdersCame_(ymd) {
  if (typeof ordersConnectedAccounts_ !== 'function') return { value: '', reason: 'the order module is not deployed' };
  const accounts = ordersConnectedAccounts_();
  const per = [], missing = [];
  let total = 0;
  accounts.forEach(function (account) {
    let day = null;
    try {
      day = ordersReadTab_(account, ordersDayTabCandidates_(ymd), ORDERS_DAY_LIMIT, ORDERS_EXPECT_DAY);
    } catch (e) {
      missing.push({ account: account, reason: 'not connected yet' });
      return;
    }
    if (!day || !day.ok) {
      missing.push({ account: account, reason: (day && day.reason) || 'not connected yet' });
      return;
    }
    const map = ordersResolveFields_(day.headers);
    let n = 0;
    day.rows.forEach(function (r) { if (ordersIsOrderRow_(r, map)) n++; });
    total += n;
    per.push({ account: account, tab: day.tab, orders: n });
  });
  return { value: total, per_account: per, not_connected: missing };
}

/** "orders rechecked" — §11.1 counts a day's COMPLETED stage checks; Recheck.gs owns the rule. A
 * workbook that will not open degrades to "not connected yet" instead of taking the whole
 * counters screen down with it (§13.4). */
function alertsRechecked_(ymd) {
  if (typeof recheckCompletedOn_ !== 'function') return { value: '', reason: 'the recheck module is not deployed' };
  let got;
  try {
    got = recheckCompletedOn_(ymd);
  } catch (e) {
    logActivity_('system', 'ALERTS_OPS_FAIL', ALERTS_OPS_RECHECKED, '', '', String(e && e.message || e));
    return { value: '', reason: 'not connected yet' };
  }
  return { value: got.checked, of: got.of, stages: got.stages };
}

/** "wrong orders found" — §11.3's daily tabs carry six columns and no finder, so the portal's own
 * ACTIVITY_LOG is the only record of who found one. The month-long reconciliation against the
 * workbook lives in wrongOrderCounters; this is the day figure the dashboard asks for.
 * The log is append-only and is the portal's highest-volume tab, so this reads its TAIL and only
 * the two columns it needs — pulling every row and every column of it onto a dashboard would make
 * this counter the slowest thing on the screen within a year. */
function alertsWrongFound_(ymd) {
  const action = typeof WRONG_ORDER_LOG_ACTION !== 'undefined' ? WRONG_ORDER_LOG_ACTION : 'WRONG_ORDER';
  const sh = getPortalDb_(false).getSheetByName('ACTIVITY_LOG');
  const lastRow = sh ? sh.getLastRow() : 0;
  if (lastRow < 2) return { value: 0, month_to_date: 0 };
  const tsCol = DB_TABS.ACTIVITY_LOG.indexOf('ts') + 1;
  const actionCol = DB_TABS.ACTIVITY_LOG.indexOf('action') + 1;
  const width = Math.max(tsCol, actionCol);
  const first = Math.max(2, lastRow - ALERTS_LOG_SCAN_ROWS + 1);
  const vals = sh.getRange(first, 1, lastRow - first + 1, width).getValues();

  const monthKey = ymd.slice(0, 7);
  let day = 0, month = 0;
  vals.forEach(function (r) {
    if (String(r[actionCol - 1] || '') !== action) return;
    const ts = alertsYmd_(r[tsCol - 1]);
    if (!ts) return;
    if (ts === ymd) day++;
    if (ts.slice(0, 7) === monthKey) month++;
  });
  return { value: day, month_to_date: month, scanned_rows: vals.length, scan_capped: first > 2 };
}

/** "CS replies" — §13.3's 2-hourly counts. The column is found by §5's own field name inside
 * ROLE_COUNT_FIELDS, never by assuming which of count_1..4 it landed in. Phase 2 replaces this
 * with the Defense Agent log. */
function alertsCsReplies_(ymd) {
  const fields = (typeof ROLE_COUNT_FIELDS !== 'undefined' && ROLE_COUNT_FIELDS.CS) || [];
  const at = fields.indexOf(ALERTS_CS_REPLY_FIELD);
  if (at < 0) return { value: '', reason: 'the CS report form does not carry "' + ALERTS_CS_REPLY_FIELD + '"' };
  const col = 'count_' + (at + 1);
  let total = 0, reports = 0;
  readTab_('REPORTS_2H').forEach(function (r) {
    if (alertsYmd_(r.date) !== ymd) return;
    if (String(r.role || '') !== 'CS') return;
    reports++;
    const n = alertsNum_(r[col]);
    if (isFinite(n)) total += n;
  });
  return { value: total, reports: reports, field: ALERTS_CS_REPLY_FIELD };
}

/** "dispatch overdue" — §10.2's OVERDUE NOW tiles, already in DASH_CACHE from the dispatch sweep.
 * This is a NOW figure: only the current month's rows are summed, and older periods are ignored
 * rather than added to it. */
function alertsDispatchOverdue_(cacheRows, ymd) {
  const metric = typeof ORDERS_TILE_OVERDUE !== 'undefined' ? ORDERS_TILE_OVERDUE : 'OVERDUE NOW';
  const monthKey = ymd.slice(0, 7);
  const per = [];
  let total = 0, stamp = '';
  cacheRows.forEach(function (r) {
    if (String(r.metric || '') !== metric) return;
    if (String(r.period || '') !== monthKey) return;
    const n = alertsNum_(r.value);
    if (!isFinite(n)) return;
    total += n;
    per.push({ account: String(r.account || ''), value: n });
    const at = alertsText_(r.computed_at, 40);
    if (at > stamp) stamp = at;
  });
  if (!per.length) return { value: '', reason: 'the dispatch sweep has not run this month yet', period: monthKey };
  return { value: total, per_account: per, period: monthKey, computed_at: stamp };
}

function alertsCounter_(metric, source, got, period, cached) {
  const out = {
    metric: metric, source: source, period: period,
    value: got.value === undefined ? '' : got.value,
    computed_at: got.computed_at || '', from_cache: !!cached,
  };
  ['per_account', 'not_connected', 'of', 'stages', 'month_to_date', 'reports', 'field',
   'scanned_rows', 'scan_capped', 'reason'].forEach(function (k) {
    if (got[k] !== undefined) out[k] = got[k];
  });
  return out;
}

/** §13.3 — the five counters. The two that open workbooks (all orders came, orders rechecked) are
 * served from DASH_CACHE where the refresh trigger has already put them; the three the portal
 * computes from its own tabs are always live, because they cost one memoised read each. */
function actionOpsCounters_(payload, ctx) {
  if (!alertsMayRead_(ctx)) throw new Error('dashboard roles only');
  const ymd = alertsDateInput_(payload.date);
  const refresh = !!payload.refresh && alertsMayRefresh_(ctx);
  const cacheRows = readTab_('DASH_CACHE');
  const index = alertsCacheIndex_(cacheRows);

  const counters = [];
  const puts = [];

  [[ALERTS_OPS_ORDERS_CAME, 'the account order workbooks, one day tab each (§10.1)', alertsOrdersCame_],
   [ALERTS_OPS_RECHECKED, 'the Order Rechecking workbook, stages completed (§11.1)', alertsRechecked_]
  ].forEach(function (spec) {
    const hit = index[spec[0] + '||' + ymd];
    if (hit && !refresh) {
      counters.push(alertsCounter_(spec[0], spec[1], { value: hit.value, computed_at: hit.computed_at }, ymd, true));
      return;
    }
    const got = spec[2](ymd);
    counters.push(alertsCounter_(spec[0], spec[1], got, ymd, false));
    if (got.value !== '' && got.value !== undefined) puts.push({ metric: spec[0], account: '', period: ymd, value: got.value });
  });

  counters.push(alertsCounter_(ALERTS_OPS_WRONG, 'the portal ACTIVITY_LOG — the daily tabs carry no finder (§11.3)', alertsWrongFound_(ymd), ymd, false));
  counters.push(alertsCounter_(ALERTS_OPS_CS, 'the portal 2-hourly reports (§5) — Phase 2 moves this to the Defense Agent log', alertsCsReplies_(ymd), ymd, false));
  counters.push(alertsCounter_(ALERTS_OPS_OVERDUE, 'DASH_CACHE, from the dispatch sweep (§10.2)', alertsDispatchOverdue_(cacheRows, ymd), ymd.slice(0, 7), true));

  if (puts.length) alertsCachePut_(puts);

  return { date: ymd, counters: counters, computed_at: now_(), refreshed: refresh };
}

// ---------- DASH_CACHE (§13.4) ----------
function alertsCacheIndex_(rows) {
  const map = {};
  (rows || readTab_('DASH_CACHE')).forEach(function (r) {
    map[String(r.metric || '') + '|' + String(r.account || '') + '|' + String(r.period || '')] = {
      value: r.value, computed_at: alertsText_(r.computed_at, 40),
    };
  });
  return map;
}

/** Upsert keyed by (metric, account, period) so a 15-minute trigger cannot grow the tab without
 * bound. New rows are appended in ONE block rather than one call each inside the lock. Like the
 * dispatch tiles, a recomputed cache figure is not an audited change and is deliberately not
 * written to ACTIVITY_LOG — at this cadence the log would carry nothing but its own noise. */
function alertsCachePut_(entries) {
  const sh = getPortalDb_(false).getSheetByName('DASH_CACHE');
  if (!sh || !entries.length) return;
  const stamp = now_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const vals = sh.getDataRange().getValues();
    const at = {};
    for (let i = 1; i < vals.length; i++) at[vals[i][0] + '|' + vals[i][1] + '|' + vals[i][2]] = i + 1;
    const fresh = [];
    entries.forEach(function (e) {
      const row = [e.metric, e.account, e.period, e.value, stamp];
      const key = e.metric + '|' + e.account + '|' + e.period;
      if (at[key]) sh.getRange(at[key], 1, 1, 5).setValues([row]);
      else { fresh.push(row); at[key] = -1; }
    });
    if (fresh.length) sh.getRange(sh.getLastRow() + 1, 1, fresh.length, 5).setValues(fresh);
  } finally { lock.releaseLock(); }
}

function alertsCacheCards_(account, cards, days) {
  const period = String(days) + 'd';
  const puts = cards.filter(function (c) { return c.value !== ''; }).map(function (c) {
    return { metric: c.metric, account: account, period: period, value: c.value };
  });
  if (puts.length) alertsCachePut_(puts);
}

// ---------- the refresh trigger (§13.4, §14) ----------
/** One 15-minute pass: per account it opens the Daily Account Report ONCE (SheetBridge holds the
 * spreadsheet for the request, so _ALERTS, _LEDGER and _CONFIG cost one open between them), warms
 * the KPI cache, counts the ACTIVE alerts, and sends §14's "Account-report ACTIVE alert (new) →
 * Mgmt" for fingerprints Management has not been told about. Accounts left over when the time
 * budget runs out are picked up by the next run rather than killing this one. */
function alertsRefresh() {
  const started = Date.now();
  const accounts = alertsAccounts_();
  const sent = {};
  readTab_('NOTIFICATIONS').forEach(function (n) {
    const ref = String(n.ref || '');
    if (ref.indexOf(ALERTS_NOTIFY_REF) === 0) sent[ref] = true;
  });

  const puts = [], fresh = [];
  let scanned = 0, skipped = 0;
  /* Same starvation the dashboard sweep had: this loop restarted at accounts[0] every run, so the
   * accounts that happened to sit past the time budget were skipped on EVERY run and their KPI
   * cards never appeared at all. The comment claimed the leftovers were "picked up by the next
   * run" — nothing made that true. Each run now resumes where the last one stopped. */
  const alertProps = PropertiesService.getScriptProperties();
  let alertStart = Number(alertProps.getProperty('ALERTS_SWEEP_CURSOR') || 0);
  if (!(alertStart >= 0) || alertStart >= accounts.length) alertStart = 0;
  let alertStopped = alertStart;

  for (let n = 0; n < accounts.length; n++) {
    const i = (alertStart + n) % accounts.length;
    alertStopped = i;
    if (Date.now() - started > ALERTS_SWEEP_BUDGET_MS) { skipped = accounts.length - n; break; }
    const account = accounts[i];
    let got = null, kpis = null;
    try {
      got = alertsAccountFeed_(account, true);
      kpis = alertsComputeKpis_(account);
    } catch (e) {
      logActivity_('system', 'ALERTS_REFRESH_FAIL', account, '', '', String(e && e.message || e));
      continue;
    }
    if (kpis && kpis.ok) {
      const period = String(kpis.window_days) + 'd';
      kpis.cards.forEach(function (c) {
        if (c.value === '') return;
        puts.push({ metric: c.metric, account: account, period: period, value: c.value });
      });
      try {
        CacheService.getScriptCache().put(alertsKpiKey_(account), JSON.stringify(kpis), ALERTS_CACHE_SECONDS);
      } catch (e) { /* oversized payload — the next viewer recomputes */ }
    }
    if (!got.ok) continue;
    scanned++;
    puts.push({ metric: ALERTS_CACHE_ACTIVE, account: account, period: 'now', value: got.active.length });
    got.active.forEach(function (a) {
      const ref = ALERTS_NOTIFY_REF + alertsKey_(account, a.fingerprint, a.raised_at);
      if (sent[ref]) return;
      sent[ref] = true;
      fresh.push({ ref: ref, account: account, alert: a });
    });
  }

  alertProps.setProperty('ALERTS_SWEEP_CURSOR', String((alertStopped + 1) % Math.max(1, accounts.length)));

  if (puts.length) alertsCachePut_(puts);
  alertsNotifyFresh_(fresh);
  alertsRefreshOps_();

  return 'alerts refresh: ' + scanned + ' account(s) scanned, ' + fresh.length + ' new ACTIVE alert(s)'
    + (skipped ? ', ' + skipped + ' left for the next run (time budget)' : '');
}

/** One bell entry per new alert up to the cap, then a single summary line: a first run over an
 * account sitting at 48 ACTIVE must not bury every other notification Management has. */
function alertsNotifyFresh_(fresh) {
  if (!fresh.length) return;
  fresh.sort(function (a, b) {
    const ra = alertsSeverityRank_(a.alert.severity), rb = alertsSeverityRank_(b.alert.severity);
    if (ra !== rb) return rb - ra;
    const ka = alertsDateKey_(a.alert.raised_at), kb = alertsDateKey_(b.alert.raised_at);
    return ka === kb ? 0 : (ka < kb ? 1 : -1);
  });
  fresh.slice(0, ALERTS_NOTIFY_MAX).forEach(function (f) {
    const a = f.alert;
    const sev = String(a.severity || '').toLowerCase();
    const dot = sev === 'high' || sev === 'critical' ? '🔴 ' : sev === 'medium' ? '🟠 ' : '🔵 ';
    const msg = dot + (a.category ? a.category + ' alert' : 'Account alert') + ' · ' + a.account + ' — '
      + a.message + (a.action ? ' → ' + a.action : '');
    notifyManagement_('Account report ACTIVE alert', msg, f.ref);
    logActivity_('system', 'ACCOUNT_ALERT_RAISED', a.account + '!' + (a.fingerprint || a.raised_at), '', a.severity, a.message.slice(0, 200));
  });
  if (fresh.length > ALERTS_NOTIFY_MAX) {
    const extra = fresh.length - ALERTS_NOTIFY_MAX;
    notifyManagement_('Account report ACTIVE alert',
      '🟠 ' + extra + ' more account alerts are open beyond the ones just sent → open the Alerts Centre and work through them by account.',
      ALERTS_NOTIFY_REF + 'batch:' + alertsToday_());
  }
}

/** The two §13.3 counters that open workbooks, computed once per run into DASH_CACHE so no viewer
 * ever pays for them. */
function alertsRefreshOps_() {
  const ymd = alertsToday_();
  const puts = [];
  try {
    const came = alertsOrdersCame_(ymd);
    if (came.value !== '' && came.value !== undefined) puts.push({ metric: ALERTS_OPS_ORDERS_CAME, account: '', period: ymd, value: came.value });
  } catch (e) {
    logActivity_('system', 'ALERTS_OPS_FAIL', ALERTS_OPS_ORDERS_CAME, '', '', String(e && e.message || e));
  }
  try {
    const rechecked = alertsRechecked_(ymd);
    if (rechecked.value !== '' && rechecked.value !== undefined) puts.push({ metric: ALERTS_OPS_RECHECKED, account: '', period: ymd, value: rechecked.value });
  } catch (e) {
    logActivity_('system', 'ALERTS_OPS_FAIL', ALERTS_OPS_RECHECKED, '', '', String(e && e.message || e));
  }
  if (puts.length) alertsCachePut_(puts);
}

const ACTIONS_ALERTS = {
  alertsCentre: [actionAlertsCentre_, 'any'],   // dashboard roles gated inside, ads view narrowed
  resolveAlert: [actionResolveAlert_, 'any'],
  accountKpis:  [actionAccountKpis_, 'any'],
  opsCounters:  [actionOpsCounters_, 'any'],
};
