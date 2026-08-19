/** Phase 6 — §13.1 the business dashboard money and §13.4 its 15-minute cache.
 *
 * The primary record is each Sales Analysis workbook's `Monthly Sheet` — one row per trading day,
 * keyed off the daily tabs' GRAND TOTAL rows. The workbook's own `📊 Dashboard` / `<Month> Overall
 * Report` tiles are hardcoded values with no formulas behind them, and on the live Saif Bhai file
 * they DISAGREE with the Monthly Sheet they claim to summarise: 31 July Actual Profit 79.33 on the
 * report against 66.09 on the Monthly Sheet (which is exactly the 1383.12 vs 1369.88 month gap),
 * Ads 181.37 vs 181.36, and a July AliExpress tile of 5531.51 against a Monthly column sum of
 * 5548.07. So every figure here is COMPUTED from the Monthly Sheet rows, the workbook's own tile is
 * read alongside it, and when the two differ by more than £5 or 1% BOTH are returned with a
 * discrepancy note. Management sees that the sheet contradicts itself instead of a number that is
 * wrong either way.
 *
 * Performance (§13.4): the 15-minute trigger runs buildDashboardCache(), which makes ONE pass per
 * account — Monthly Sheet read once, tile block read once per month tab — and writes DASH_CACHE in
 * a single setValues. Every viewer then reads DASH_CACHE only; no viewer ever opens a workbook. */

const DASH_TZ_PKT = 'Asia/Karachi';
/* The workbooks this screen mirrors are kept on UK trading days — the Monthly Sheet's rows, its
 * month tabs, its "yesterday" are all London dates. Computing "today" in Karachi meant that for
 * five hours every night (7pm–midnight UK) the portal asked the sheets about a day they did not
 * have yet, and on the evening of the 31st it asked about a MONTH that did not exist — dashes
 * across the whole screen, on a schedule. PKT stays for staff-facing day tabs; business dates
 * are UK. */
const DASH_TZ_UK = 'Europe/London';

// ---------- who sees this (§4.3 "Business dashboard (all accounts)": Mgmt ✅ TL ✅ Adv ads view
// CS ✅ · Hunter/Lister/OrdProc ❌; Ops Head per §4.4 gets all dashboards incl. profit) ----------
const DASH_VIEW_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'];

// ---------- the workbook's own vocabulary — verbatim, never invented ----------
// Monthly Sheet headers, row 1, cols A–P. The '(B) (H) (I) (N) (T) (U) (V)' parentheticals are
// cross-references to the DAILY tabs' column letters, not to this sheet's own columns.
const DASH_COL_DATE = 'Date';
const DASH_COL_ORDERS = 'Orders';
const DASH_COL_UNITS = 'Units';
const DASH_COL_SOLD = 'Sold (B)';
const DASH_COL_EARNING = 'Earning (H)';
const DASH_COL_ALIEXPRESS = 'AliExpress (I)';
const DASH_COL_PRIORITY = 'All Priority incl VAT (N)';
const DASH_COL_GENERAL = 'General fees';
const DASH_COL_WASTE = 'Ad Waste';
const DASH_COL_RAW = 'Raw Profit (T)';
const DASH_COL_RETURNS = 'Returns (U)';
const DASH_COL_ACTUAL = 'Actual Profit (V)';
const DASH_COL_RATIO = 'Ratio N/T';
const DASH_MONTHLY_HEADERS = [DASH_COL_DATE, DASH_COL_ORDERS, DASH_COL_UNITS, DASH_COL_SOLD,
  DASH_COL_EARNING, DASH_COL_ALIEXPRESS, DASH_COL_PRIORITY, DASH_COL_GENERAL, DASH_COL_WASTE,
  DASH_COL_RAW, DASH_COL_RETURNS, DASH_COL_ACTUAL, DASH_COL_RATIO, 'Trend', 'Month-to-date', 'Profit graph'];

// The six tiles, in the order the workbook lays them out (B/D/F/H/J/L of row 3).
const DASH_TILE_SOLD = 'Sold';
const DASH_TILE_PROFIT = 'ACTUAL PROFIT (after old returns)';
const DASH_TILE_ALIEXPRESS = 'AliExpress Cost';
const DASH_TILE_ADS = 'All Ads incl VAT (waste inside)';
const DASH_TILE_RETURNS = 'RETURNS';
const DASH_TILE_MARGIN = 'Margin';
const DASH_TILES = [DASH_TILE_SOLD, DASH_TILE_PROFIT, DASH_TILE_ALIEXPRESS, DASH_TILE_ADS,
  DASH_TILE_RETURNS, DASH_TILE_MARGIN];
// Margin is a ratio (the tile cell is 0.00%-formatted and holds 0.099, not 9.9); everything else
// is GBP. The £5 arm of the discrepancy test only applies to money.
const DASH_RATIO_METRICS = [DASH_TILE_MARGIN, DASH_COL_RATIO];

// 'old' is the workbook's own word: the RETURNS tile label spells the split out in full
// ('RETURNS — 16.19 July + 213.98 old').
const DASH_METRIC_RETURNS_OLD = 'Returns — old';

// Portal-owned cache rows (DASH_CACHE is the portal's own tab, not a business sheet).
const DASH_METRIC_CONNECTION = 'connection';
const DASH_METRIC_BANNER = 'sheet banner';
const DASH_METRIC_LATEST_DAY = 'latest day';
const DASH_METRIC_SHEET_SOURCE = 'sheet tile source';
const DASH_SHEET_PREFIX = 'sheet tile: ';
const DASH_NOT_CONNECTED = 'not connected yet';       // §6/§13.4 wording, never an error

// Everything the month cards carry, tiles first.
const DASH_MONTH_METRICS = DASH_TILES.concat([DASH_COL_ORDERS, DASH_COL_UNITS, DASH_COL_EARNING,
  DASH_COL_PRIORITY, DASH_COL_GENERAL, DASH_COL_WASTE, DASH_COL_RAW, DASH_COL_RETURNS,
  DASH_METRIC_RETURNS_OLD, DASH_COL_ACTUAL, DASH_COL_RATIO]);
// Metrics that are plain sums when accounts are added together; Margin and Ratio N/T are
// recomputed from the summed components instead (an average of ratios is not a ratio).
const DASH_SUMMABLE = DASH_MONTH_METRICS.filter(function (m) { return DASH_RATIO_METRICS.indexOf(m) < 0; });
// Per-day metrics: yesterday's V is §13.1's "profit yesterday", the other three are its ad picture.
const DASH_DAY_METRICS = [DASH_COL_ACTUAL, DASH_TILE_ADS, DASH_COL_WASTE, DASH_TILE_SOLD];
// §4.3 "ads view": what Advertising gets instead of the full money dashboard.
const DASH_ADS_VIEW_METRICS = [DASH_TILE_SOLD, DASH_TILE_ADS, DASH_COL_PRIORITY, DASH_COL_GENERAL,
  DASH_COL_WASTE, DASH_COL_RAW, DASH_COL_RATIO, DASH_COL_ORDERS, DASH_COL_UNITS];

const DASH_MONTHLY_TAB = ['Monthly Sheet'];
const DASH_TILE_TAB = ['📊 Dashboard', 'Dashboard'];
const DASH_OVERALL_SUFFIX = ' Overall Report';
const DASH_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const DASH_VAT_RATE = 0.2;                            // flat 20% everywhere in these workbooks
const DASH_MONTHLY_LIMIT = 800;                       // the live Monthly Sheet is 37 rows
const DASH_TILE_ROWS = 4;                             // banner r1, labels r3, values r4
const DASH_TILE_COLS = 16;
const DASH_WEEK_DAYS = 7;
const DASH_DAY_KEEP = 14;                             // day/range cache rows older than this are dropped
const DASH_SWEEP_BUDGET_MS = 240000;                  // stop before a time trigger is killed
const DASH_STALE_MINUTES = 45;                        // three missed 15-minute runs
const DASH_DIFF_ABS = 5;                              // £5  ·  either arm flags a discrepancy
const DASH_DIFF_PCT = 0.01;                           // 1%
const DASH_REFRESH_KEY = 'dash_refresh';
const DASH_REFRESH_COOLDOWN_S = 60;
const DASH_MAX_NOTES = 60;

// ---------- access ----------
function dashAssertViewer_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return;
  if (DASH_VIEW_ROLES.indexOf(String(ctx.user.role || '')) < 0) throw new Error('role has no business dashboard');
}

function dashViewFor_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return 'full';
  return String(ctx.user.role || '') === 'Advertising Manager' ? 'ads' : 'full';
}

/** accounts_access is a comma list once Management has scoped someone; the seed placeholders
 * ('per-role', 'ALL', empty) mean "not scoped yet" and do not restrict (§4.1b). */
function dashAccountAllowed_(ctx, account) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return true;
  const raw = String(ctx.user.accounts || '').trim();
  if (!raw || raw === 'ALL' || raw === 'per-role') return true;
  const want = bridgeNormalizeHeader_(account);
  if (!want) return false;
  return raw.split(',').some(function (a) {
    const have = bridgeNormalizeHeader_(a);
    return have !== '' && (have === want || have.indexOf(want) >= 0 || want.indexOf(have) >= 0);
  });
}

/** RL-4 — every outgoing money map goes through the stripper. The five roles that can reach this
 * action are exactly PROFIT_ROLES, so nothing is actually removed today; the door stays in place
 * so a later role change cannot quietly hand profit to someone who may not see it. */
function dashStrip_(record, ctx) {
  return stripForRole_(record, ctx.user.role, ctx.ident.email);
}

// ---------- dates (PKT — the portal's one clock for staff-facing days) ----------
function dashToday_() { return Utilities.formatDate(new Date(), DASH_TZ_UK, 'yyyy-MM-dd'); }
function dashPad2_(n) { return (n < 10 ? '0' : '') + n; }
function dashYmd_(y, m, d) { return y + '-' + dashPad2_(m) + '-' + dashPad2_(d); }
function dashMonthDays_(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

/** Noon anchors — day arithmetic never crosses a DST edge and never needs a timezone. */
function dashAddDays_(ymd, n) {
  return Utilities.formatDate(new Date(Date.parse(ymd + 'T12:00:00Z') + n * 86400000), 'UTC', 'yyyy-MM-dd');
}
function dashPrevMonth_(monthKey) {
  const y = Number(monthKey.slice(0, 4)), m = Number(monthKey.slice(5, 7));
  return m === 1 ? (y - 1) + '-12' : y + '-' + dashPad2_(m - 1);
}
function dashMonthLabel_(monthKey) {
  const m = Number(monthKey.slice(5, 7));
  return (DASH_MONTH_NAMES[m - 1] || monthKey) + ' ' + monthKey.slice(0, 4);
}
function dashMonthNumber_(name) {
  const n = String(name || '').trim().toLowerCase();
  for (let i = 0; i < DASH_MONTH_NAMES.length; i++) {
    const full = DASH_MONTH_NAMES[i].toLowerCase();
    if (n === full || n === full.slice(0, 3)) return i + 1;
  }
  return 0;
}
function dashMonthInText_(text) {
  const s = String(text || '').toLowerCase();
  for (let i = 0; i < DASH_MONTH_NAMES.length; i++) {
    if (s.indexOf(DASH_MONTH_NAMES[i].toLowerCase()) >= 0) return i + 1;
  }
  return 0;
}

// ---------- numbers ----------
/** Money is accumulated at full precision and rounded ONCE, on the way out — the cache stores
 * unrounded values on purpose so summing six accounts cannot drift by a penny per account. */
function dashRound2_(n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  if (typeof brainRound2_ === 'function') return brainRound2_(n);   // the audited fee-engine rounding
  const scaled = Math.abs(n) * 100;
  const r = Math.round(scaled + (scaled * 1e-12 + 1e-9)) / 100;
  return n < 0 ? -r : r;
}
function dashRound4_(n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  const scaled = Math.abs(n) * 10000;
  const r = Math.round(scaled + (scaled * 1e-12 + 1e-9)) / 10000;
  return n < 0 ? -r : r;
}
function dashRoundMetric_(metric, value) {
  if (value === null || value === undefined) return null;
  return DASH_RATIO_METRICS.indexOf(metric) >= 0 ? dashRound4_(Number(value)) : dashRound2_(Number(value));
}

/** Cells arrive as numbers on the live sheets, but an em dash, '#N/A' or a typed '£1,234.56'
 * all appear in these workbooks. Unreadable returns null, which sums treat as absent — never 0. */
function dashNum_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v === null || v === undefined || v instanceof Date) return null;
  let s = String(v).replace(/[£$,\s]/g, '');          // \s already covers the non-breaking spaces these sheets carry
  if (!s || s === '—' || s === '–' || s === '-') return null;
  let pct = false;
  if (s.charAt(s.length - 1) === '%') { pct = true; s = s.slice(0, -1); }
  if (/^\(.+\)$/.test(s)) s = '-' + s.slice(1, -1);
  const n = Number(s);
  if (!isFinite(n)) return null;
  return pct ? n / 100 : n;
}
function dashAdd_(bucket, key, value) {
  if (value === null || value === undefined) return;
  bucket[key] = (bucket[key] || 0) + value;
}

// ---------- Monthly Sheet parsing ----------
/** The record keys bridgeReadRows_ builds: the raw header when it normalizes to something,
 * otherwise (and on a repeated raw header) a positional 'col:X'. */
function dashRecordKeys_(headers) {
  const seen = { _row: true };
  const keys = [];
  headers.forEach(function (h, i) {
    const raw = h === null || h === undefined ? '' : String(h);
    let key = bridgeNormalizeHeader_(raw) ? raw : 'col:' + dashColLetter_(i + 1);
    if (Object.prototype.hasOwnProperty.call(seen, key)) key = 'col:' + dashColLetter_(i + 1);
    seen[key] = true;
    keys.push(key);
  });
  return keys;
}
function dashColLetter_(col) {
  let n = Number(col) || 0, out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
function dashHeaderMap_(headers) {
  const keys = dashRecordKeys_(headers);
  const map = {};
  DASH_MONTHLY_HEADERS.forEach(function (want) {
    const n = bridgeNormalizeHeader_(want);
    for (let i = 0; i < headers.length; i++) {
      if (bridgeNormalizeHeader_(headers[i]) === n) { map[want] = keys[i]; return; }
    }
  });
  return map;
}
function dashCell_(rec, map, header) {
  const key = map[header];
  return key !== undefined && rec[key] !== undefined ? rec[key] : '';
}

/** Dates on this sheet are TEXT ('1st July 2026'), sometimes a two-day row ('5-6 July 2026'), and
 * one row is not a day at all ('Pre-July orders — returns'). A day row returns its span; anything
 * else comes back as an adjustment row so its money is attributed deliberately, never dropped. */
function dashParseDate_(value) {
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = Number(iso[1]), m = Number(iso[2]), d = Number(iso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= dashMonthDays_(y, m)) {
      return { day: true, month: y + '-' + dashPad2_(m), start: dashYmd_(y, m, d), end: dashYmd_(y, m, d), text: raw };
    }
  }
  const m2 = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]\s*(\d{1,2})(?:st|nd|rd|th)?)?\s+([A-Za-z]+)\s+(\d{4})\b/);
  if (m2) {
    const mon = dashMonthNumber_(m2[3]);
    const y = Number(m2[4]);
    const d1 = Number(m2[1]);
    const d2 = m2[2] ? Number(m2[2]) : d1;
    if (mon && d1 >= 1 && d2 >= d1 && d2 <= dashMonthDays_(y, mon)) {
      return { day: true, month: y + '-' + dashPad2_(mon), start: dashYmd_(y, mon, d1), end: dashYmd_(y, mon, d2), text: raw };
    }
  }
  return { day: false, monthName: dashMonthInText_(raw), text: raw };
}

/** One pass over the Monthly Sheet: day rows aggregated per month, non-day rows held aside.
 * 'Pre-July orders — returns' is attributed to July because that is the month its own label names
 * — and the workbook's July tile ('RETURNS — 16.19 July + 213.98 old', ACTUAL PROFIT *after old
 * returns*) books it there too, while the August tile shows '0.00 old'. A non-day row that names
 * no month the sheet has day rows for is left out of every tile and reported instead. */
function dashAggregateMonthly_(read) {
  const map = dashHeaderMap_(read.headers);
  const months = {};
  const adjustments = [];
  const days = [];
  const monthYears = {};

  read.rows.forEach(function (rec) {
    const when = dashParseDate_(dashCell_(rec, map, DASH_COL_DATE));
    if (!when) return;
    const figures = {
      orders: dashNum_(dashCell_(rec, map, DASH_COL_ORDERS)),
      units: dashNum_(dashCell_(rec, map, DASH_COL_UNITS)),
      sold: dashNum_(dashCell_(rec, map, DASH_COL_SOLD)),
      earning: dashNum_(dashCell_(rec, map, DASH_COL_EARNING)),
      aliexpress: dashNum_(dashCell_(rec, map, DASH_COL_ALIEXPRESS)),
      priority: dashNum_(dashCell_(rec, map, DASH_COL_PRIORITY)),
      general: dashNum_(dashCell_(rec, map, DASH_COL_GENERAL)),
      waste: dashNum_(dashCell_(rec, map, DASH_COL_WASTE)),
      raw: dashNum_(dashCell_(rec, map, DASH_COL_RAW)),
      returns: dashNum_(dashCell_(rec, map, DASH_COL_RETURNS)),
      actual: dashNum_(dashCell_(rec, map, DASH_COL_ACTUAL)),
    };
    if (!when.day) { adjustments.push({ when: when, figures: figures }); return; }
    if (!monthYears[when.month]) monthYears[when.month] = true;
    const b = months[when.month] || (months[when.month] = { latest: '', old_returns: 0, old_actual: 0 });
    dashAdd_(b, 'orders', figures.orders);
    dashAdd_(b, 'units', figures.units);
    dashAdd_(b, 'sold', figures.sold);
    dashAdd_(b, 'earning', figures.earning);
    dashAdd_(b, 'aliexpress', figures.aliexpress);
    dashAdd_(b, 'priority', figures.priority);
    dashAdd_(b, 'general', figures.general);
    dashAdd_(b, 'waste', figures.waste);
    dashAdd_(b, 'raw', figures.raw);
    dashAdd_(b, 'returns', figures.returns);
    dashAdd_(b, 'actual', figures.actual);
    if (when.end > b.latest) b.latest = when.end;
    days.push({ start: when.start, end: when.end, month: when.month, text: when.text, figures: figures });
  });

  const orphans = [];
  adjustments.forEach(function (a) {
    let target = '';
    if (a.when.monthName) {
      const suffix = '-' + dashPad2_(a.when.monthName);
      Object.keys(monthYears).forEach(function (k) {
        if (k.slice(4) === suffix && (!target || k < target)) target = k;
      });
    }
    if (!target) { orphans.push(a); return; }
    const b = months[target];
    dashAdd_(b, 'old_returns', a.figures.returns);
    dashAdd_(b, 'old_actual', a.figures.actual);
  });

  return { months: months, days: days, orphans: orphans };
}

/** The six tiles plus the columns behind them, for one month. REALITY OVERRIDES §13.1 HERE: the
 * spec says ad spend = Σ(N + Ad Waste + General fees), but Ad Waste is already inside N — each
 * daily tab books it into the GRAND TOTAL of 'Priority Fees Dashboard' ("=SUM(L2:Ln)+33.22",
 * comment: AMENDMENT A9 books ALL ad money paid), which flows through to N, which is why the tile
 * is labelled "waste inside". Adding it again double-counts. The tile the workbook itself computes
 * is Σ N + 1.2 × Σ General fees (verified: Aug 802.59 + 1.2×47.88 = 860.05; Jul 3559.53 +
 * 1.2×404.92 = 4045.43 against a printed 4045.44), so that is what the portal computes, and
 * Ad Waste and General fees are returned beside it so nothing is hidden. */
function dashMonthMetrics_(b) {
  if (!b) return null;
  const sold = b.sold || 0;
  const actual = (b.actual || 0) + (b.old_actual || 0);
  const raw = b.raw || 0;
  const priority = b.priority || 0;
  const general = b.general || 0;
  const out = {};
  out[DASH_TILE_SOLD] = sold;
  out[DASH_TILE_PROFIT] = actual;
  out[DASH_TILE_ALIEXPRESS] = b.aliexpress || 0;
  out[DASH_TILE_ADS] = priority + (1 + DASH_VAT_RATE) * general;
  out[DASH_TILE_RETURNS] = (b.returns || 0) + (b.old_returns || 0);
  out[DASH_TILE_MARGIN] = sold ? actual / sold : null;
  out[DASH_COL_ORDERS] = b.orders || 0;
  out[DASH_COL_UNITS] = b.units || 0;
  out[DASH_COL_EARNING] = b.earning || 0;
  out[DASH_COL_PRIORITY] = priority;
  out[DASH_COL_GENERAL] = general;
  out[DASH_COL_WASTE] = b.waste || 0;
  out[DASH_COL_RAW] = raw;
  out[DASH_COL_RETURNS] = b.returns || 0;
  out[DASH_METRIC_RETURNS_OLD] = b.old_returns || 0;
  out[DASH_COL_ACTUAL] = b.actual || 0;
  // The sheet totals no month-level Ratio N/T; this is its own per-row definition (ads ÷ raw
  // profit) applied to the month, and it is left absent rather than shown against a loss.
  out[DASH_COL_RATIO] = raw > 0 ? priority / raw : null;
  return out;
}

function dashDayMetrics_(figures) {
  const out = {};
  out[DASH_COL_ACTUAL] = figures.actual;
  out[DASH_TILE_ADS] = (figures.priority || 0) + (1 + DASH_VAT_RATE) * (figures.general || 0);
  out[DASH_COL_WASTE] = figures.waste;
  out[DASH_TILE_SOLD] = figures.sold;
  return out;
}

// ---------- the workbook's own tiles (read only to be checked against) ----------
function dashTabIsCandidate_(tabName, candidates) {
  const got = bridgeNormalizeHeader_(tabName);
  if (!got) return false;
  for (let i = 0; i < candidates.length; i++) {
    if (bridgeNormalizeHeader_(candidates[i]) === got) return true;
  }
  return false;
}

function dashTileFor_(label) {
  const n = bridgeNormalizeHeader_(label);
  if (!n) return '';
  if (n.indexOf('actual profit') >= 0) return DASH_TILE_PROFIT;
  if (n.indexOf('aliexpress') >= 0) return DASH_TILE_ALIEXPRESS;
  if (n.indexOf('all ads') >= 0) return DASH_TILE_ADS;
  if (n.indexOf('returns') === 0) return DASH_TILE_RETURNS;
  if (n === 'sold') return DASH_TILE_SOLD;
  if (n === 'margin') return DASH_TILE_MARGIN;
  return '';
}

/** The Dashboard and '<Month> Overall Report' tabs are LAYOUT sheets, not tables: a merged banner
 * in A1, tile labels merged two-wide across row 3 and their values in row 4. A table reader would
 * lock onto the daily sub-table at row 7, so the tile block is read as a fixed 4-row corner
 * through the bridge's own opener — still the one door to a business workbook, still read-only. */
function dashReadTiles_(account, tabCandidates) {
  if (typeof bridgeOpenTab_ !== 'function') return null;
  const id = bridgeResolveSheetId_('account', account, 'sales_analysis');
  if (!id) return null;
  const open = bridgeOpenTab_(id, tabCandidates);
  if (!open || !dashTabIsCandidate_(open.sheet.getName(), tabCandidates)) return null;

  const lastRow = open.sheet.getLastRow(), lastCol = open.sheet.getLastColumn();
  if (lastRow < DASH_TILE_ROWS || lastCol < 2) return null;
  const block = open.sheet.getRange(1, 1, DASH_TILE_ROWS, Math.min(lastCol, DASH_TILE_COLS)).getValues();
  const labels = block[2], values = block[3];

  const tiles = {};
  let oldReturns = null;
  labels.forEach(function (label, c) {
    const metric = dashTileFor_(label);
    if (!metric || Object.prototype.hasOwnProperty.call(tiles, metric)) return;
    let v = dashNum_(values[c]);
    if (v === null && c + 1 < values.length) v = dashNum_(values[c + 1]);   // merged pair, value in the right cell
    if (v === null) return;
    tiles[metric] = v;
    if (metric === DASH_TILE_RETURNS) {
      // The RETURNS tile spells its own split out in the label: '<month> + <old> old'.
      const split = String(label).match(/([\d.,]+)\s*[A-Za-z]+\s*\+\s*([\d.,]+)\s*old/i);
      if (split) oldReturns = dashNum_(split[2]);
    }
  });
  return { tab: open.sheet.getName(), banner: String(block[0][0] || '').trim(), tiles: tiles, old_returns: oldReturns };
}

// ---------- one pass per account ----------
function dashAccounts_() {
  const out = [];
  connectionHealth().perAccount.forEach(function (a) {
    const linked = (a.items || []).some(function (i) { return i.kind === 'sales_analysis' && i.status === 'linked'; });
    out.push({ account: String(a.account), linked: linked });
  });
  return out;
}

function dashPush_(rows, metric, account, period, value) {
  if (value === null || value === undefined || value === '') return;
  rows.push({ metric: metric, account: account, period: period, value: value });
}

function dashComputeAccount_(account, curMonth, prevMonth, today) {
  const rows = [];
  const periods = [curMonth, prevMonth];

  if (typeof bridgeReadRows_ !== 'function') {
    periods.forEach(function (p) { dashPush_(rows, DASH_METRIC_CONNECTION, account, p, DASH_NOT_CONNECTED); });
    return { ok: false, rows: rows };
  }
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'sales_analysis',
    tab: DASH_MONTHLY_TAB, expect: DASH_MONTHLY_HEADERS, limit: DASH_MONTHLY_LIMIT,
  });
  // The bridge accepts a unique containment match on tab names, so the tab it opened is checked
  // back against the name we asked for before a single figure is trusted.
  if (!read.ok || !dashTabIsCandidate_(read.tab, DASH_MONTHLY_TAB)) {
    periods.forEach(function (p) { dashPush_(rows, DASH_METRIC_CONNECTION, account, p, DASH_NOT_CONNECTED); });
    return { ok: false, rows: rows, reason: (read && read.reason) || DASH_NOT_CONNECTED };
  }

  const agg = dashAggregateMonthly_(read);
  const sheetTiles = {};
  sheetTiles[curMonth] = dashReadTiles_(account, DASH_TILE_TAB);
  sheetTiles[prevMonth] = dashReadTiles_(account,
    [DASH_MONTH_NAMES[Number(prevMonth.slice(5, 7)) - 1] + DASH_OVERALL_SUFFIX]);

  periods.forEach(function (period) {
    dashPush_(rows, DASH_METRIC_CONNECTION, account, period, 'linked');
    const metrics = dashMonthMetrics_(agg.months[period]);
    if (metrics) {
      DASH_MONTH_METRICS.forEach(function (m) { dashPush_(rows, m, account, period, metrics[m]); });
      dashPush_(rows, DASH_METRIC_LATEST_DAY, account, period, agg.months[period].latest);
    }
    const seen = sheetTiles[period];
    if (seen) {
      dashPush_(rows, DASH_METRIC_SHEET_SOURCE, account, period, seen.tab);
      dashPush_(rows, DASH_METRIC_BANNER, account, period, seen.banner);
      DASH_TILES.forEach(function (m) { dashPush_(rows, DASH_SHEET_PREFIX + m, account, period, seen.tiles[m]); });
      dashPush_(rows, DASH_SHEET_PREFIX + DASH_METRIC_RETURNS_OLD, account, period, seen.old_returns);
    }
  });

  // §13.1 "profit yesterday = yesterday's V". The row is cached under the date it actually covers,
  // never under yesterday's date: on the live workbooks the newest daily tab is regularly a day or
  // two behind (there was no 8 August tab on 8 August), and a missing day must read as missing.
  const yesterday = dashAddDays_(today, -1);
  const covers = dashFindDay_(agg.days, yesterday);
  const dayRow = covers || dashLatestDay_(agg.days);
  if (dayRow) {
    // A combined row ('5-6 July 2026') covers two dates; when yesterday is one of them the figures
    // are cached under yesterday, so the screen does not report them as some other day's.
    const dayKey = covers ? yesterday : dayRow.end;
    const dayMetrics = dashDayMetrics_(dayRow.figures);
    DASH_DAY_METRICS.forEach(function (m) { dashPush_(rows, m, account, dayKey, dayMetrics[m]); });
  }

  const latest = dashLatestDay_(agg.days);
  if (latest) {
    const span = { start: dashAddDays_(latest.end, -(DASH_WEEK_DAYS - 1)), end: latest.end };
    const bucket = {};
    agg.days.forEach(function (d) {
      if (d.end < span.start || d.start > span.end) return;
      dashAdd_(bucket, 'actual', d.figures.actual);
      dashAdd_(bucket, 'priority', d.figures.priority);
      dashAdd_(bucket, 'general', d.figures.general);
      dashAdd_(bucket, 'waste', d.figures.waste);
      dashAdd_(bucket, 'sold', d.figures.sold);
    });
    const period = span.start + '..' + span.end;
    dashPush_(rows, DASH_COL_ACTUAL, account, period, bucket.actual);
    dashPush_(rows, DASH_TILE_ADS, account, period, (bucket.priority || 0) + (1 + DASH_VAT_RATE) * (bucket.general || 0));
    dashPush_(rows, DASH_COL_WASTE, account, period, bucket.waste);
    dashPush_(rows, DASH_TILE_SOLD, account, period, bucket.sold);
  }

  return { ok: true, rows: rows, orphans: agg.orphans };
}

function dashFindDay_(days, ymd) {
  for (let i = 0; i < days.length; i++) {
    if (days[i].start <= ymd && ymd <= days[i].end) return days[i];
  }
  return null;
}
function dashLatestDay_(days) {
  let best = null;
  days.forEach(function (d) { if (!best || d.end > best.end) best = d; });
  return best;
}

// ---------- DASH_CACHE (§13.4) ----------
/** Rows are keyed by (metric, account, period) and upserted, so a 15-minute trigger cannot grow
 * the tab without bound. Day and week rows carry a date in the period, so they would otherwise
 * accumulate for ever; anything older than a fortnight is dropped. DASH_CACHE is a derived cache —
 * every figure in it is recomputable from the workbooks in one run — so dropping a stale row is
 * cache maintenance, not the record deletion §16 forbids. A recomputed figure is also not an
 * audited change: the rows themselves are not written to ACTIVITY_LOG (at ~40 metrics × every
 * account × every 15 minutes the log would carry nothing but its own noise); the run is logged once. */
function dashCacheWrite_(rows, stamp, today) {
  const sh = getPortalDb_(false).getSheetByName('DASH_CACHE');
  if (!sh) return 0;
  const width = DB_TABS.DASH_CACHE.length;
  const cutoff = dashAddDays_(today, -DASH_DAY_KEEP);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const vals = sh.getDataRange().getValues();
    const keep = [];
    const at = {};
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      const metric = dashCacheText_(r[0]);
      const account = dashCacheText_(r[1]);
      const period = dashCacheText_(r[2]);
      if (metric === '' && account === '' && period === '') continue;
      if (dashPeriodExpired_(period, cutoff)) continue;
      at[metric + '|' + account + '|' + period] = keep.length;
      keep.push([metric, account, period, r[3] === undefined ? '' : r[3], dashCacheText_(r[4])]);
    }
    rows.forEach(function (row) {
      const key = row.metric + '|' + row.account + '|' + row.period;
      const rec = [row.metric, row.account, row.period, dashCacheValue_(row.value), stamp];
      if (at[key] !== undefined) keep[at[key]] = rec;
      else { at[key] = keep.length; keep.push(rec); }
    });
    // Sheets reads '2026-08' and '2026-08-10' back as DATES unless the cell is plain text, and a
    // key that comes back as a Date never matches the key that was written — the cache would grow
    // a duplicate set of every row on every run. metric/account/period/computed_at are pinned to
    // text; only the value column is left free so numbers stay numbers. Rows written before this
    // ran heal on the first pass, because the whole block is rewritten.
    const rowsToFormat = Math.max(keep.length + 1, 2);
    sh.getRange(1, 1, rowsToFormat, 3).setNumberFormat('@');
    sh.getRange(1, 5, rowsToFormat, 1).setNumberFormat('@');
    if (keep.length) sh.getRange(2, 1, keep.length, width).setValues(keep);
    const lastRow = sh.getLastRow();
    if (lastRow > keep.length + 1) sh.getRange(keep.length + 2, 1, lastRow - keep.length - 1, width).clearContent();
    SpreadsheetApp.flush();
    return keep.length;
  } finally { lock.releaseLock(); }
}

/** A key cell that Sheets already coerced to a Date comes back as one; it is rendered in the
 * portal's own clock so the row still carries a readable key rather than a locale string. */
function dashCacheText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, DASH_TZ_UK, 'yyyy-MM-dd');   // a sheet Date cell is a UK business day
  return String(v === null || v === undefined ? '' : v);
}

/** Banner text comes from a business sheet, and Google Sheets turns a leading '=' into a formula —
 * a cell a human typed must never become part of the Portal DB's calculation layer. */
function dashCacheValue_(v) {
  if (typeof v === 'number') return v;
  const s = String(v === null || v === undefined ? '' : v);
  return s.charAt(0) === '=' ? "'" + s : s;
}

function dashPeriodExpired_(period, cutoff) {
  const day = period.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (day) return day[1] < cutoff;
  const range = period.match(/^\d{4}-\d{2}-\d{2}\.\.(\d{4}-\d{2}-\d{2})$/);
  if (range) return range[1] < cutoff;
  return false;                                       // month periods (ours and §13.3's) are kept
}

/** §13.4 — the 15-minute time trigger's entry point. Plain function, no ctx: it is not a router
 * action and can never be called from a browser. One pass per account; the sweep stops before
 * Apps Script would kill it and picks the rest up on the next run. */
function buildDashboardCache() {
  const started = Date.now();
  const stamp = now_();
  const today = dashToday_();
  const curMonth = today.slice(0, 7);
  const prevMonth = dashPrevMonth_(curMonth);

  const accounts = dashAccounts_();
  const rows = [];
  let computed = 0, missing = 0, failed = 0, skipped = 0;

  /* ROUND-ROBIN (19 Aug). This loop used to start at accounts[0] every run, so when the time
   * budget ran out mid-sweep it was ALWAYS the same tail accounts that got dropped — they read
   * "not computed yet" on the KPI and Sales-analysis screens for ever, no matter how often the
   * sweep ran. Each run now begins where the last one stopped, so every account is refreshed
   * within a couple of sweeps. */
  const props = PropertiesService.getScriptProperties();
  let startAt = Number(props.getProperty('DASH_SWEEP_CURSOR') || 0);
  if (!(startAt >= 0) || startAt >= accounts.length) startAt = 0;
  let stoppedAt = startAt;

  for (let n = 0; n < accounts.length; n++) {
    const i = (startAt + n) % accounts.length;
    stoppedAt = i;
    if (Date.now() - started > DASH_SWEEP_BUDGET_MS) { skipped = accounts.length - n; break; }
    const account = accounts[i].account;
    if (!accounts[i].linked) {
      [curMonth, prevMonth].forEach(function (p) { dashPush_(rows, DASH_METRIC_CONNECTION, account, p, DASH_NOT_CONNECTED); });
      missing++;
      continue;
    }
    let one = null;
    try {
      one = dashComputeAccount_(account, curMonth, prevMonth, today);
    } catch (e) {
      logActivity_('system', 'DASH_BUILD_FAIL', account, '', '', String(e && e.message || e));
      [curMonth, prevMonth].forEach(function (p) { dashPush_(rows, DASH_METRIC_CONNECTION, account, p, DASH_NOT_CONNECTED); });
      failed++;
      continue;
    }
    one.rows.forEach(function (r) { rows.push(r); });
    if (one.ok) computed++; else missing++;
    if (one.orphans && one.orphans.length) {
      one.orphans.forEach(function (o) {
        logActivity_('system', 'DASH_UNATTRIBUTED_ROW', account, '', String(o.when.text),
          'Monthly Sheet row belongs to no month the sheet carries — left out of every tile');
      });
    }
  }

  // Next sweep starts at the account after the last one this run touched, so a time-budget cut
  // rotates through the fleet instead of starving the same tail every time.
  props.setProperty('DASH_SWEEP_CURSOR', String((stoppedAt + 1) % Math.max(1, accounts.length)));

  const written = dashCacheWrite_(rows, stamp, today);
  const summary = 'dashboard cache: ' + computed + ' account(s) computed, ' + missing + ' ' + DASH_NOT_CONNECTED
    + (failed ? ', ' + failed + ' failed' : '')
    + (skipped ? ', ' + skipped + ' left for the next run (time budget)' : '')
    + ' · ' + rows.length + ' figure(s) into ' + written + ' cache row(s)';
  logActivity_('system', 'DASH_CACHE_BUILD', 'DASH_CACHE', '', String(written), summary);
  return summary;
}

// ---------- reading the cache (§13.4 — the portal reads the cache, never the workbooks) ----------
function dashReadCache_() {
  const byAccount = {};
  readTab_('DASH_CACHE').forEach(function (r) {
    const metric = dashCacheText_(r.metric);
    const account = dashCacheText_(r.account);
    const period = dashCacheText_(r.period);
    if (!metric || !account) return;
    const bucket = byAccount[account] || (byAccount[account] = { months: {}, days: {}, ranges: [], computed_at: '' });
    const stamp = dashCacheText_(r.computed_at);
    if (stamp > bucket.computed_at) bucket.computed_at = stamp;

    if (/^\d{4}-\d{2}$/.test(period)) {
      const month = bucket.months[period] || (bucket.months[period] = {});
      month[metric] = r.value;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const day = bucket.days[period] || (bucket.days[period] = {});
      day[metric] = r.value;
    } else if (/^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(period)) {
      let range = null;
      bucket.ranges.forEach(function (x) { if (x.period === period) range = x; });
      if (!range) { range = { period: period, from: period.slice(0, 10), to: period.slice(12), values: {} }; bucket.ranges.push(range); }
      range.values[metric] = r.value;
    }
  });
  return { byAccount: byAccount };
}

function dashPickMetrics_(source, wanted) {
  const out = {};
  wanted.forEach(function (m) {
    if (!source || !Object.prototype.hasOwnProperty.call(source, m)) return;
    const v = dashRoundMetric_(m, Number(source[m]));
    if (v !== null) out[m] = v;
  });
  return out;
}

function dashMonthCard_(bucket, period, wanted, ctx) {
  const raw = (bucket && bucket.months[period]) || null;
  const card = {
    period: period, label: dashMonthLabel_(period),
    connection: raw ? String(raw[DASH_METRIC_CONNECTION] || '') : DASH_NOT_CONNECTED,
    tiles: dashStrip_(dashPickMetrics_(raw, wanted), ctx),
    sheet_tiles: {}, sheet_source: '', banner: '', latest_day: '',
  };
  if (!raw) return card;
  const sheet = {};
  DASH_TILES.concat([DASH_METRIC_RETURNS_OLD]).forEach(function (m) {
    // The old-returns figure the tile LABEL spells out rides on the RETURNS tile's permission.
    const gate = m === DASH_METRIC_RETURNS_OLD ? DASH_TILE_RETURNS : m;
    if (wanted.indexOf(gate) < 0) return;
    const key = DASH_SHEET_PREFIX + m;
    if (!Object.prototype.hasOwnProperty.call(raw, key)) return;
    const v = dashRoundMetric_(m, Number(raw[key]));
    if (v !== null) sheet[m] = v;
  });
  card.sheet_tiles = dashStrip_(sheet, ctx);
  card.sheet_source = String(raw[DASH_METRIC_SHEET_SOURCE] || '');
  card.banner = String(raw[DASH_METRIC_BANNER] || '');
  card.latest_day = String(raw[DASH_METRIC_LATEST_DAY] || '');
  return card;
}

/** Both numbers, always, when they differ by more than £5 or 1% — the portal shows the Monthly
 * Sheet figure because that is the primary record, and says plainly that the workbook's own tile
 * disagrees rather than picking a winner. */
function dashDiscrepancies_(account, card, wanted) {
  const out = [];
  DASH_TILES.forEach(function (metric) {
    if (wanted.indexOf(metric) < 0) return;
    if (!Object.prototype.hasOwnProperty.call(card.tiles, metric)) return;
    if (!Object.prototype.hasOwnProperty.call(card.sheet_tiles, metric)) return;
    const mine = Number(card.tiles[metric]), theirs = Number(card.sheet_tiles[metric]);
    if (!isFinite(mine) || !isFinite(theirs)) return;
    const diff = mine - theirs;
    const ref = Math.abs(theirs) || Math.abs(mine);
    const pct = ref ? Math.abs(diff) / ref : 0;
    const money = DASH_RATIO_METRICS.indexOf(metric) < 0;
    if (!((money && Math.abs(diff) > DASH_DIFF_ABS) || pct > DASH_DIFF_PCT)) return;
    const ours = money ? '£' + dashRound2_(mine).toFixed(2) : dashRound2_(mine * 100).toFixed(2) + '%';
    const theirsText = money ? '£' + dashRound2_(theirs).toFixed(2) : dashRound2_(theirs * 100).toFixed(2) + '%';
    const gap = money ? '£' + dashRound2_(Math.abs(diff)).toFixed(2) + ' apart'
      : dashRound2_(pct * 100).toFixed(2) + '% apart';
    out.push({
      account: account, period: card.period, period_label: card.label, metric: metric,
      monthly_sheet: dashRoundMetric_(metric, mine), sheet_tile: dashRoundMetric_(metric, theirs),
      difference: dashRoundMetric_(metric, diff), percent: dashRound2_(pct * 100),
      source: card.sheet_source,
      note: account + ' · ' + card.label + ' · ' + metric + ': the Monthly Sheet rows add up to '
        + ours + ', but the workbook\'s own ' + (card.sheet_source || 'tile') + ' tile says '
        + theirsText + ' — ' + gap + '. The portal shows the Monthly Sheet figure; this workbook '
        + 'disagrees with itself.',
    });
  });
  const banner = dashBannerNote_(account, card);
  if (banner) out.push(banner);
  return out;
}

/** The live Dashboard banner reads '... AUGUST 2026 (to 5th August) ...' while its tiles already
 * include 6 and 7 August. Management is told, rather than left to assume the banner is the truth. */
function dashBannerNote_(account, card) {
  if (!card.banner || !card.latest_day) return null;
  const m = card.banner.match(/to\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i);
  if (!m) return null;
  const mon = dashMonthNumber_(m[2]);
  if (!mon) return null;
  const said = dashYmd_(Number(card.latest_day.slice(0, 4)), mon, Number(m[1]));
  if (said === card.latest_day) return null;
  return {
    account: account, period: card.period, period_label: card.label, metric: DASH_METRIC_BANNER,
    monthly_sheet: card.latest_day, sheet_tile: said, difference: null, percent: null,
    source: card.sheet_source,
    note: account + ' · ' + card.label + ': the workbook\'s banner says data to ' + m[1] + ' ' + m[2]
      + ', but its Monthly Sheet carries days up to ' + card.latest_day + '. The tiles include them.',
  };
}

function dashCollective_(cards, key, wanted) {
  const totals = {};
  let included = 0;
  cards.forEach(function (c) {
    const tiles = c[key] && c[key].tiles;
    if (!tiles || !Object.keys(tiles).length) return;
    included++;
    DASH_SUMMABLE.forEach(function (m) {
      if (wanted.indexOf(m) < 0) return;
      if (!Object.prototype.hasOwnProperty.call(tiles, m)) return;
      totals[m] = (totals[m] || 0) + Number(tiles[m]);
    });
  });
  // Ratios are recomputed from the summed components — six accounts' margins do not average.
  if (wanted.indexOf(DASH_TILE_MARGIN) >= 0 && totals[DASH_TILE_SOLD]) {
    totals[DASH_TILE_MARGIN] = Number(totals[DASH_TILE_PROFIT] || 0) / Number(totals[DASH_TILE_SOLD]);
  }
  if (wanted.indexOf(DASH_COL_RATIO) >= 0 && Number(totals[DASH_COL_RAW]) > 0) {
    totals[DASH_COL_RATIO] = Number(totals[DASH_COL_PRIORITY] || 0) / Number(totals[DASH_COL_RAW]);
  }
  const out = {};
  wanted.forEach(function (m) {
    if (!Object.prototype.hasOwnProperty.call(totals, m)) return;
    const v = dashRoundMetric_(m, Number(totals[m]));
    if (v !== null) out[m] = v;
  });
  return { tiles: out, accounts_included: included };
}

function dashDayEntry_(bucket, ymd, wanted, ctx) {
  const raw = bucket && bucket.days[ymd];
  if (!raw) return null;
  return { period: ymd, values: dashStrip_(dashPickMetrics_(raw, wanted), ctx) };
}

function dashLatestRange_(bucket, wanted, ctx) {
  if (!bucket || !bucket.ranges.length) return null;
  let best = null;
  bucket.ranges.forEach(function (r) { if (!best || r.to > best.to) best = r; });
  return { period: best.period, from: best.from, to: best.to, values: dashStrip_(dashPickMetrics_(best.values, wanted), ctx) };
}

function dashStale_(lastUpdated) {
  if (!lastUpdated) return true;
  const t = Date.parse(lastUpdated);
  if (!isFinite(t)) return true;
  return (Date.now() - t) > DASH_STALE_MINUTES * 60000;
}

/** §13.1 + §13.4 — per-account cards, collective tiles, "last updated", discrepancy notes.
 * Reads DASH_CACHE and the connection list; never a business workbook, so a viewer pays no sheet
 * round trips at all. An account with no cached figures renders "not connected yet". */
function actionDashboard_(payload, ctx) {
  dashAssertViewer_(ctx);
  const view = dashViewFor_(ctx);
  const wanted = view === 'ads' ? DASH_ADS_VIEW_METRICS : DASH_MONTH_METRICS;
  // The ads view's day figures are the ad ones; §13.1's "profit yesterday" belongs to the full view.
  const dayWanted = DASH_DAY_METRICS.filter(function (m) { return wanted.indexOf(m) >= 0; });

  const today = dashToday_();
  const curMonth = today.slice(0, 7);
  const prevMonth = dashPrevMonth_(curMonth);
  const yesterday = dashAddDays_(today, -1);

  const cache = dashReadCache_();
  const all = dashAccounts_();
  const cards = [];
  const notes = [];
  let scoped = false;
  let lastUpdated = '';

  all.forEach(function (a) {
    if (!dashAccountAllowed_(ctx, a.account)) { scoped = true; return; }
    const bucket = cache.byAccount[a.account] || null;
    const month = dashMonthCard_(bucket, curMonth, wanted, ctx);
    const last = dashMonthCard_(bucket, prevMonth, wanted, ctx);
    const has = Object.keys(month.tiles).length || Object.keys(last.tiles).length;
    if (bucket && bucket.computed_at > lastUpdated) lastUpdated = bucket.computed_at;
    // Three different silences, told apart rather than flattened into one — and none of them an
    // error (§13.4): no connection · connected but the trigger has not run · connected and read
    // but the Monthly Sheet carries no row for these months yet.
    let reason = '';
    if (!has) {
      if (!a.linked) reason = DASH_NOT_CONNECTED;
      else if (!bucket) reason = 'not computed yet';
      else if (month.connection === 'linked' || last.connection === 'linked') reason = 'no rows on the Monthly Sheet for these months yet';
      else reason = DASH_NOT_CONNECTED;
    }

    const dayEntry = dashDayEntry_(bucket, yesterday, dayWanted, ctx);
    let fallback = null;
    if (!dayEntry && bucket) {
      const dates = Object.keys(bucket.days).sort();
      if (dates.length) fallback = dashDayEntry_(bucket, dates[dates.length - 1], dayWanted, ctx);
    }
    const yesterdayEntry = dayEntry || fallback;
    const week = dashLatestRange_(bucket, dayWanted, ctx);

    const card = {
      account: a.account,
      ok: !!has,
      reason: reason,
      computed_at: bucket ? bucket.computed_at : '',
      month: month,
      last_month: last,
      // "Profit yesterday" is yesterday's Actual Profit (V). When the workbook has not been
      // written up yet the latest day it does hold is returned, flagged, with its own date —
      // never yesterday's date against another day's money.
      profit_yesterday: (yesterdayEntry && dayWanted.indexOf(DASH_COL_ACTUAL) >= 0)
        ? { period: yesterdayEntry.period, latest_available: !dayEntry, values: yesterdayEntry.values }
        : null,
      ad_spend: {
        yesterday: yesterdayEntry ? { period: yesterdayEntry.period, latest_available: !dayEntry, values: yesterdayEntry.values } : null,
        last_7_days: week,
        this_month: { period: curMonth, values: dashStrip_(dashPickMetrics_(month.tiles, [DASH_TILE_ADS, DASH_COL_PRIORITY, DASH_COL_GENERAL, DASH_COL_WASTE]), ctx) },
        last_month: { period: prevMonth, values: dashStrip_(dashPickMetrics_(last.tiles, [DASH_TILE_ADS, DASH_COL_PRIORITY, DASH_COL_GENERAL, DASH_COL_WASTE]), ctx) },
      },
      discrepancies: [],
    };
    if (has) {
      card.discrepancies = dashDiscrepancies_(a.account, month, wanted)
        .concat(dashDiscrepancies_(a.account, last, wanted));
      card.discrepancies.forEach(function (d) { if (notes.length < DASH_MAX_NOTES) notes.push(d); });
    }
    cards.push(card);
  });

  return {
    ok: true,
    view: view,
    // "Last updated" describes the accounts on this screen, not the whole cache.
    last_updated: lastUpdated,
    stale: dashStale_(lastUpdated),
    may_refresh: isMgmt_(ctx.user.role, ctx.ident.email),
    scoped: scoped,
    period: {
      current: curMonth, current_label: dashMonthLabel_(curMonth),
      last: prevMonth, last_label: dashMonthLabel_(prevMonth),
      yesterday: yesterday,
    },
    collective: {
      month: dashCollective_(cards, 'month', wanted),
      last_month: dashCollective_(cards, 'last_month', wanted),
      of: cards.length,
    },
    accounts: cards,
    discrepancies: notes,
    // The workbook's own vocabulary, so the screen never invents a label or an order of its own.
    metrics: { tiles: DASH_TILES.filter(function (m) { return wanted.indexOf(m) >= 0; }), all: wanted, ratios: DASH_RATIO_METRICS, day: dayWanted },
  };
}

/** §13.4 Refresh-now — Management (and the Ops Head tier, §4.4) only. A recompute opens every
 * connected workbook, so it is held to one run a minute: the cache is at most 15 minutes old and
 * a second click inside that window would spend the account's outbound quota for nothing. */
function actionRefreshDashboard_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('management only');
  const cache = CacheService.getScriptCache();
  if (cache.get(DASH_REFRESH_KEY)) {
    throw new Error(SAFE_ERROR_PREFIX + 'the dashboard was refreshed less than a minute ago — what is on screen is already the latest');
  }
  cache.put(DASH_REFRESH_KEY, '1', DASH_REFRESH_COOLDOWN_S);
  const summary = buildDashboardCache();
  logActivity_(ctx.ident.email, 'DASH_REFRESH', 'DASH_CACHE', '', '', summary);
  const fresh = actionDashboard_(payload, ctx);
  fresh.refreshed = summary;
  return fresh;
}

/** Router.gs merges feature modules by name: ACTIONS_DASHBOARD must be added to its groups list,
 * and buildDashboardCache registered as a 15-minute time trigger, or §13 stays dark. */
/** The Monthly Sheet itself, day rows on screen (Hasib's walkthrough ask): the Sales analysis
 * screen shows the P&L table the workbook actually holds — headers verbatim, portal computes
 * nothing here, discrepancy against the tiles stays the dashboard's job. Management gate. */
function actionSalesAnalysisRows_(payload, ctx) {
  dashAssertViewer_(ctx);
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('the day-row P&L is Management only');
  const account = String(payload.account || '');
  if (!account) throw new Error('SAY: which account?');
  const read = bridgeReadRows_({ scope: 'account', account: account, kind: 'sales_analysis',
    tab: DASH_MONTHLY_TAB, limit: DASH_MONTHLY_LIMIT });
  if (!read || read.ok === false) return { ok: false, reason: String((read && read.reason) || 'not connected yet') };
  return { ok: true, account: account, tab: read.tab, headers: read.headers, rows: read.rows.slice(-120) };
}

/** The Daily Account Report workbook as its own screen feed — raw rows, headers verbatim,
 * newest first. The Alerts centre keeps the alarm workflow; this is the READING desk. */
function actionAccountReportRows_(payload, ctx) {
  dashAssertViewer_(ctx);
  const account = String(payload.account || '');
  if (!account) throw new Error('SAY: which account?');
  const read = bridgeReadRows_({ scope: 'account', account: account, kind: 'account_report', limit: 400 });
  if (!read || read.ok === false) return { ok: false, reason: String((read && read.reason) || 'not connected yet') };
  return { ok: true, account: account, tab: read.tab, headers: read.headers, rows: read.rows.slice(-200).reverse() };
}

const ACTIONS_DASHBOARD = {
  dashboard:          [actionDashboard_, 'any'],          // gated to the §4.3 roles inside
  refreshDashboard:   [actionRefreshDashboard_, 'any'],   // gated to Management inside
  salesAnalysisRows:  [actionSalesAnalysisRows_, 'any'],  // Management gated inside
  accountReportRows:  [actionAccountReportRows_, 'any'],  // §4.3 dashboard roles inside
};
