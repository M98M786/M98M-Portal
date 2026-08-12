/** Phase 5 — ORDER RECHECKING (§11.1/§11.2) + WRONG ORDERS (§11.3).
 *
 * Four stage tabs in the live "Order Rechecking " workbook (global kind `order_recheck`) and the
 * daily/monthly tabs of "Wrong Order Sheets" (global kind `wrong_orders`). Every read and every
 * write goes through SheetBridge: header-addressed, whitelisted, locked, shadow-gated.
 *
 * THE DATE-OFFSET DISAGREEMENT (REALITY WINS, and it is stated, never hidden).
 * §11.1 describes the four checkpoints as: CHINA = orders from 4 days before · UK First = 2 days
 * before · UK Second = 1 day before (+ a 3-days-after-delivery follow-up) · UK 3rd = 3 days after
 * delivery. The live 2026 workbook's own arithmetic between its two date columns is different:
 * col A ('Current Date') minus col B is +4 on CHINA, +6 on UK First Check (whose header still
 * reads '2 DAYS BEFORE ORDER WITH COURIERS'), +7 on UK Second Check (header '1 DAYS BEFORE'),
 * +11 on UK Second's col C ('3 Days after Delivery') and +11 on UK 3rd Check. Headers describe
 * the checkpoint's meaning; the numbers in the cells describe what was actually typed.
 * Neither is silently chosen. The portal computes reference dates from four CONFIG keys
 * (`recheck_offset_china`, `recheck_offset_uk1`, `recheck_offset_uk2`, `recheck_offset_uk3`)
 * seeded with the SPEC's business meaning 4 / 2 / 1 / 3 — Management corrects them in CONFIG
 * without a code change — while RECHECK_SHEET_OFFSETS below records the sheet's own 4/6/7/11.
 * Every queue row reports BOTH (`config_offset_days` vs `sheet_offset_days`, plus
 * `offset_disagreement`) so a reader always knows which arithmetic the row in front of them
 * follows. UK Second's col C carries the same "3 days after delivery" checkpoint as UK 3rd, so it
 * reuses `recheck_offset_uk3` rather than inventing a fifth key.
 *
 * OTHER PLACES REALITY WINS OVER THE SPEC:
 * · The stage tabs are prefilled with dates far ahead (CHINA to 2026-10-10, UK1 to 2026-12-31,
 *   UK2/UK3 to 2027-01-07), so generateRecheckRows() almost never creates anything — it verifies
 *   today's row exists and appends one ONLY past the prefill horizon. A day missing from inside
 *   the prefilled range is a merged/skipped day ('Merged 5, 6 July', '28 29 date together'), and
 *   appending it at the bottom would put the date column out of order — that case is reported to
 *   Management instead of written.
 * · UK Second/UK 3rd keep their labels on row 1 and their per-account columns on row 2 (data from
 *   row 3). The account headers are addressed by their EXACT spelling, trailing spaces included,
 *   because UK Second repeats the same eight people in a second block (O2:U2, W2:AC2) with
 *   different casing — only the exact match keeps 'azhar bhai ' and 'Azhar Bhai' apart.
 * · On those two tabs the account block starts in the column headed 'Comments ' on row 1, so the
 *   row-2 account name owns that column and there is no separate free-text comment to write.
 * · UK First Check's per-account texts sit in unheaded columns E–R whose account order ROTATES
 *   daily, so no per-account write is possible there — the stage takes one free-text 'Comments '.
 * · Wrong Orders: the 13 daily tabs carry only 6 columns; 'Processed By ' — the accountability
 *   field §11.3 exists for — is present ONLY on the empty '<Month> Wrong Orders Sheet' template.
 *   There is NO monthly summary tab and no aggregation anywhere in that workbook, so the portal
 *   computes the counters itself (§13.3, §12.1) from its own ACTIVITY_LOG plus the sheet's rows.
 */

// ---------- the two workbooks (§6 CONNECTIONS kinds) ----------
const RECHECK_KIND = 'order_recheck';
const WRONG_ORDER_KIND = 'wrong_orders';
const RECHECK_TZ = 'Asia/Karachi';                 // staff-facing dates are PKT; §11 names no UK clock
const RECHECK_READ_LIMIT = 600;                    // the longest stage tab prefills ~220 rows
const WRONG_ORDER_READ_LIMIT = 200;
const WRONG_ORDER_MAX_TABS = 40;
const RECHECK_MAX_TEXT = 1000;
const RECHECK_NOTIFY_REF = 'recheck-day:';

// The live dropdowns are the closed vocabularies — never widened here.
const RECHECK_CHECKERS = ['Wahab', 'Zeeshan', 'Noman'];        // DV on CHINA C, UK1 C, UK2 D
const RECHECK_ACCOUNT_COLS = ['azhar bhai ', 'abrt ', 'amna baji ', 'sir haseeb',
  'hafiza baji ', 'saif bhai ', 'yasin bhai', 'imtiaz bhai'];  // UK2 F2:M2 and UK3 E2:L2, verbatim
const RECHECK_UK3_VALUES = ['All Delivered', 'No Orders'];     // §11.1 and the only two strings on the tab

// What the sheet's own two date columns really differ by, per tab (see the file header).
const RECHECK_SHEET_OFFSETS = { china: 4, uk1: 6, uk2: 7, uk2_delivery: 11, uk3: 11 };

// §11.1's business meaning, seeded into CONFIG so Management owns it from then on.
const RECHECK_OFFSET_DEFAULTS = {
  recheck_offset_china: '4',
  recheck_offset_uk1: '2',
  recheck_offset_uk2: '1',
  recheck_offset_uk3: '3',
};

const RECHECK_STAGES = [
  {
    key: 'china',
    tabs: ['CHINA'],
    label: 'CHINA — orders from 4 days before: left China?',
    current: 'Current Date',
    ref: '4 DAYS BEFORE ORDER LEFT CHINA',
    ref2: '',
    checker: 'Rechecked By ',
    status: 'STATUS',
    comment: 'Comments / Focus on LR (Cancel)& AP (Cainiao) ',
    accounts: [],
    accountValues: null,
    // DV list verbatim. The Comments column exists but has never once been filled — §11.1's
    // "focus on LR/Cancel" (and the header's AP/Cainiao, which the spec omits) is still a habit,
    // not a record, so the portal offers the column rather than requiring it.
    statuses: ['PENDING', 'COMPLETED'],
    offsetKey: 'recheck_offset_china',
    sheetOffset: RECHECK_SHEET_OFFSETS.china,
    sheetOffset2: 0,
  },
  {
    key: 'uk1',
    tabs: ['UK First Check'],
    label: 'UK First Check — orders from 2 days before: with courier?',
    current: 'Current Date',
    ref: '2 DAYS BEFORE ORDER WITH COURIERS',
    ref2: '',
    checker: 'All Accounts Rechecked By ',
    status: 'STATUS',
    comment: 'Comments ',
    accounts: [],
    accountValues: null,
    // DV is 'STATUS,5% PENDING,10% PENDING,15% PENDING,20% PENDING,25% PENDING'. 'STATUS' is the
    // dropdown's own placeholder and is never a status. Plain 'PENDING' is NOT on the list yet
    // sits in 7 rows — reality wins, so it is accepted.
    statuses: ['5% PENDING', '10% PENDING', '15% PENDING', '20% PENDING', '25% PENDING', 'PENDING'],
    offsetKey: 'recheck_offset_uk1',
    sheetOffset: RECHECK_SHEET_OFFSETS.uk1,
    sheetOffset2: 0,
  },
  {
    key: 'uk2',
    tabs: ['UK Second Check'],
    label: 'UK Second Check — 1 day before with courier + 3 days after delivery',
    current: 'Current Date',
    ref: '1 DAYS BEFORE ORDER WITH COURIERS',
    ref2: '3 Days after Delivery',
    checker: 'Rechecked By ',
    status: 'STATUS',
    comment: '',                                   // col F's row-1 'Comments ' is the account block
    accounts: RECHECK_ACCOUNT_COLS,
    accountValues: null,                           // free text: '<account> N order', counts + states
    statuses: ['Custom', 'National Courier', 'Local Courier'],
    offsetKey: 'recheck_offset_uk2',
    sheetOffset: RECHECK_SHEET_OFFSETS.uk2,
    sheetOffset2: RECHECK_SHEET_OFFSETS.uk2_delivery,
  },
  {
    key: 'uk3',
    tabs: ['UK 3rd Check'],
    label: 'UK 3rd Check — 3 days after delivery: All Delivered / No Orders',
    current: 'Current Date',
    ref: '3 Days after Delivery',
    ref2: '',
    checker: 'Rechecked By ',
    status: 'STATUS',
    comment: '',
    accounts: RECHECK_ACCOUNT_COLS,
    accountValues: RECHECK_UK3_VALUES,
    statuses: ['Custom', 'National Courier', 'Local Courier'],
    offsetKey: 'recheck_offset_uk3',
    sheetOffset: RECHECK_SHEET_OFFSETS.uk3,
    sheetOffset2: 0,
  },
];

// ---------- §11.3 Wrong Orders ----------
const WRONG_ORDER_COLS = ['Account Name', 'Order id', 'Ali express id', 'Shop Name', 'Date', 'Mistake'];
const WRONG_ORDER_PROCESSED_BY = 'Processed By ';               // monthly template only (trailing space)
const WRONG_ORDER_WRITE_COLS = WRONG_ORDER_COLS.concat([WRONG_ORDER_PROCESSED_BY]);
const WRONG_ORDER_ACCOUNT_DV = ['Sir Hasib', 'Hafiza Sadia ', 'Amna Saif', 'Saif Bhai ', 'ABRT', 'Azhar Bhai '];
// The same six people are spelled differently in the recheck tabs and in the incident rows. Every
// spelling below is verbatim from one of the two workbooks; the row is written with the wrong-order
// dropdown's spelling when one exists. 'yasin bhai' and 'imtiaz bhai' have no dropdown entry at
// all (the DV offers only six accounts) — they are written exactly as the recheck tabs spell them.
const WRONG_ORDER_ACCOUNT_ALIASES = {
  'sir haseeb': 'Sir Hasib', 'sir hasib': 'Sir Hasib',
  'hafiza baji': 'Hafiza Sadia ', 'hafiza baaji': 'Hafiza Sadia ', 'hafiza sadia': 'Hafiza Sadia ',
  'amna baji': 'Amna Saif', 'amna baaji': 'Amna Saif', 'amna saif': 'Amna Saif',
  'saif bhai': 'Saif Bhai ', 'abrt': 'ABRT', 'azhar bhai': 'Azhar Bhai ',
  'yasin bhai': 'yasin bhai', 'imtiaz bhai': 'imtiaz bhai',
};
// Mistake cells are free text with wild spelling ('WRONG VARIATIO', 'wrong address ') and a
// '<type> (<detail>)' convention; these are the types the 29 real rows fall into (§11.3 counters).
const WRONG_ORDER_TYPES = ['wrong variation', 'wrong address', 'wrong order', '1 Quantity Missing', 'EXTRA ITEM', 'other'];
const WRONG_ORDER_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WRONG_ORDER_LOG_ACTION = 'WRONG_ORDER';
const WRONG_ORDER_LOG_TARGET = 'wrong_orders!';

// ---------- naming / dates ----------
function recheckNorm_(s) {
  if (typeof bridgeNormalizeHeader_ === 'function') return bridgeNormalizeHeader_(s);
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function recheckBridgeReady_() {
  return typeof bridgeResolveSheetId_ === 'function' && typeof bridgeOpenTab_ === 'function' &&
    typeof bridgeReadRows_ === 'function' && typeof bridgeAppendRow_ === 'function' &&
    typeof bridgeUpdateRow_ === 'function';
}

function recheckToday_() { return Utilities.formatDate(new Date(), RECHECK_TZ, 'yyyy-MM-dd'); }
function recheckMonthNow_() { return Utilities.formatDate(new Date(), RECHECK_TZ, 'yyyy-MM'); }

/** Day arithmetic anchored at noon UTC so a DST edge in any zone can never move the date. */
function recheckShiftYmd_(ymd, days) {
  const noon = Date.parse(ymd + 'T12:00:00Z');
  if (isNaN(noon)) return '';
  return Utilities.formatDate(new Date(noon + days * 86400000), 'UTC', 'yyyy-MM-dd');
}

function recheckDaysBetween_(fromYmd, toYmd) {
  const a = Date.parse(fromYmd + 'T12:00:00Z'), b = Date.parse(toYmd + 'T12:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}

/** Cells come back from the bridge as 'yyyy-MM-dd' (dates) or raw text (a day typed by hand). */
function recheckYmd_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, RECHECK_TZ, 'yyyy-MM-dd');
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);                 // the tabs' m/d/yyyy display format
  if (m) return m[3] + '-' + recheckPad2_(Number(m[1])) + '-' + recheckPad2_(Number(m[2]));
  return '';
}
function recheckPad2_(n) { return (n < 10 ? '0' : '') + n; }

function recheckDateInput_(value, field) {
  const s = recheckYmd_(value);
  if (!s) throw new Error(field + ' must be a yyyy-MM-dd date');
  return s;
}

/** A date column keeps its date type only if a Date lands in it. The instant is built in the
 * SOURCE workbook's timezone so it equals the midnight the sheet itself stores — which is also
 * what makes bridgeUpdateRow_'s value match find the day's row. */
function recheckSourceDate_(tz, ymd) {
  try { return Utilities.parseDate(ymd + ' 00:00:00', tz || RECHECK_TZ, 'yyyy-MM-dd HH:mm:ss'); }
  catch (e) { return null; }
}

// ---------- stage plumbing ----------
function recheckStage_(key) {
  const want = String(key || '').trim().toLowerCase();
  for (let i = 0; i < RECHECK_STAGES.length; i++) if (RECHECK_STAGES[i].key === want) return RECHECK_STAGES[i];
  throw new Error('unknown recheck stage');
}

/** UK Second/UK 3rd must resolve to their row-2 account headers, so the account names are the
 * expectation that decides the header row; CHINA/UK1 expect their single row-1 band. */
function recheckExpect_(stage) {
  if (stage.accounts.length) return stage.accounts.slice();
  const out = [stage.current, stage.ref, stage.checker, stage.status];
  if (stage.comment) out.push(stage.comment);
  return out;
}

function recheckSpec_(stage) {
  return { scope: 'global', kind: RECHECK_KIND, tab: stage.tabs.slice(), expect: recheckExpect_(stage), limit: RECHECK_READ_LIMIT };
}

/** The columns a submission may touch — never a date column, never a column the sheet lacks. */
function recheckWriteCols_(stage) {
  const out = [stage.checker, stage.status];
  if (stage.comment) out.push(stage.comment);
  return out.concat(stage.accounts);
}

/** The columns generateRecheckRows() may create a row with: the two (or three) date columns only. */
function recheckDateCols_(stage) {
  const out = [stage.current, stage.ref];
  if (stage.ref2) out.push(stage.ref2);
  return out;
}

function recheckOpen_(stage) {
  if (!recheckBridgeReady_()) return null;
  const id = bridgeResolveSheetId_('global', '', RECHECK_KIND);
  if (!id) return null;
  const open = bridgeOpenTab_(id, stage.tabs, recheckExpect_(stage));
  return open ? { id: id, open: open, tz: open.ss.getSpreadsheetTimeZone() } : null;
}

/** CONFIG owns the offsets (§11.1 business meaning); the constant is only the fallback until the
 * key is seeded. A negative or non-numeric value falls back rather than shifting dates backwards. */
function recheckOffset_(offsetKey) {
  const raw = String(getConfig(offsetKey) || '').trim();
  const n = Number(raw);
  if (raw !== '' && !isNaN(n) && n >= 0 && n <= 60) return Math.round(n);
  return Number(RECHECK_OFFSET_DEFAULTS[offsetKey]);
}

/** Seeds the four offset keys into CONFIG once, so Management can retune the checkpoints without
 * a code change. Only missing keys are added — a value Management has changed is never reset. */
function seedRecheckConfig_(actor) {
  const added = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const cfg = getPortalDb_(false).getSheetByName('CONFIG');
    const have = {};
    cfg.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0]) have[String(r[0])] = true; });
    Object.keys(RECHECK_OFFSET_DEFAULTS).forEach(function (k) {
      if (have[k]) return;
      cfg.appendRow([k, RECHECK_OFFSET_DEFAULTS[k], actor || 'system', now_()]);
      added.push(k);
    });
  } finally { lock.releaseLock(); }
  if (added.length) logActivity_(actor || 'system', 'RECHECK_CONFIG_SEED', 'CONFIG', '', added.join(','), '§11.1 offsets seeded with the spec meaning 4/2/1/3');
  return added;
}

/** Rows of a stage tab, newest scan capped. Returns the day's row plus what the tab as a whole
 * says about its own arithmetic, so nothing about the offsets has to be assumed. */
function recheckReadStage_(stage) {
  if (!recheckBridgeReady_()) return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_(recheckSpec_(stage));
  if (!read || !read.ok) return { ok: false, reason: (read && read.reason) || 'not connected yet' };

  const days = {};
  let lastYmd = '';
  read.rows.forEach(function (r) {
    const cur = recheckYmd_(r[stage.current]);
    if (!cur) return;
    if (days[cur] === undefined) days[cur] = r;                  // first row for a day wins; merged days repeat none
    if (!lastYmd || cur > lastYmd) lastYmd = cur;
  });
  return { ok: true, tab: read.tab, headerRowIndex: read.headerRowIndex, days: days, lastYmd: lastYmd, count: read.count, truncated: read.truncated };
}

/** The one place the two arithmetics are compared. `sheet_offset_days` is what the row in front of
 * the reader actually contains; `config_offset_days` is what §11.1 means. Both travel together. */
function recheckOffsetView_(stage, ymd, rec) {
  const cfg = recheckOffset_(stage.offsetKey);
  const expected = recheckShiftYmd_(ymd, -cfg);
  const onSheet = rec ? recheckYmd_(rec[stage.ref]) : '';
  const observed = onSheet ? recheckDaysBetween_(ymd, onSheet) : null;
  const view = {
    config_offset_key: stage.offsetKey,
    config_offset_days: cfg,
    reference_date_expected: expected,
    reference_date: onSheet,
    sheet_offset_days: observed === null ? '' : observed,
    sheet_offset_documented: stage.sheetOffset,
    offset_disagreement: observed !== null && observed !== cfg,
  };
  if (stage.ref2) {
    const cfg2 = recheckOffset_('recheck_offset_uk3');           // same "3 days after delivery" checkpoint
    const on2 = rec ? recheckYmd_(rec[stage.ref2]) : '';
    const obs2 = on2 ? recheckDaysBetween_(ymd, on2) : null;
    view.delivery_offset_key = 'recheck_offset_uk3';
    view.delivery_offset_days = cfg2;
    view.delivery_date_expected = recheckShiftYmd_(ymd, -cfg2);
    view.delivery_date = on2;
    view.delivery_sheet_offset_days = obs2 === null ? '' : obs2;
    view.delivery_sheet_offset_documented = stage.sheetOffset2;
  }
  return view;
}

/** Reality: STATUS is barely used (UK2/UK3 never), so "this day was rechecked" cannot mean a
 * status value. A row counts as checked when a checker signed it AND left something behind —
 * a status, a comment, or any per-account cell. This is the §13.3 "orders rechecked" signal. */
function recheckRowChecked_(stage, rec) {
  if (!rec) return false;
  if (!String(rec[stage.checker] || '').trim()) return false;
  if (String(rec[stage.status] || '').trim()) return true;
  if (stage.comment && String(rec[stage.comment] || '').trim()) return true;
  for (let i = 0; i < stage.accounts.length; i++) if (String(rec[stage.accounts[i]] || '').trim()) return true;
  return false;
}

function recheckAccountsOf_(stage, rec) {
  const out = {};
  stage.accounts.forEach(function (a) { out[a] = rec ? (rec[a] === undefined ? '' : rec[a]) : ''; });
  return out;
}

// ---------- people ----------
/** Only the order-processing side rechecks; Team Lead and Management oversee. */
function recheckMayCheck_(ctx) {
  const role = String(ctx.user.role || '');
  return role === 'Order Processor' || role === 'Team Lead' || isMgmt_(role, ctx.ident.email);
}
function recheckOversees_(ctx) {
  return String(ctx.user.role || '') === 'Team Lead' || isMgmt_(ctx.user.role, ctx.ident.email);
}

/** Portal user → the name the sheet's dropdown knows them by (Wahab · Zeeshan · Noman). The
 * staff list spells them 'Zeeshan ', 'Wahab', 'Rana Noman ', so the match is by containment and
 * an ambiguous one resolves to nobody rather than to the wrong checker. */
function recheckCheckerName_(user) {
  const name = recheckNorm_(user && user.name);
  if (!name) return '';
  const hits = RECHECK_CHECKERS.filter(function (c) {
    const n = recheckNorm_(c);
    return n === name || name.indexOf(n) >= 0;
  });
  return hits.length === 1 ? hits[0] : '';
}

function recheckCheckerInput_(value) {
  const want = recheckNorm_(value);
  if (!want) return '';
  for (let i = 0; i < RECHECK_CHECKERS.length; i++) if (recheckNorm_(RECHECK_CHECKERS[i]) === want) return RECHECK_CHECKERS[i];
  throw new Error('rechecked_by is not one of the sheet\'s checkers');
}

// ---------- §11.1 the queue ----------
/** Today's row on each of the four stage tabs, for the processor it belongs to. A row already
 * signed by another checker is hidden from a processor (it is not theirs to file) and always
 * visible to Team Lead / Management. */
function actionRecheckQueue_(payload, ctx) {
  if (!recheckMayCheck_(ctx)) throw new Error('role may not recheck orders');
  const ymd = payload.date ? recheckDateInput_(payload.date, 'date') : recheckToday_();
  const only = payload.stage ? recheckStage_(payload.stage).key : '';
  const me = recheckCheckerName_(ctx.user);
  const oversee = recheckOversees_(ctx);

  const stages = [];
  RECHECK_STAGES.forEach(function (stage) {
    if (only && stage.key !== only) return;
    const read = recheckReadStage_(stage);
    const base = {
      stage: stage.key, label: stage.label, tab: stage.tabs[0], date: ymd,
      status_options: stage.statuses.slice(),
      checker_options: RECHECK_CHECKERS.slice(),
      account_columns: stage.accounts.slice(),
      account_value_options: stage.accountValues ? stage.accountValues.slice() : null,
      has_comment: !!stage.comment,
    };
    if (!read.ok) {
      stages.push(Object.assign(base, { connected: false, reason: read.reason, row: 0 }));
      return;
    }
    const rec = read.days[ymd] || null;
    const claimed = rec ? String(rec[stage.checker] || '').trim() : '';
    const mine = !claimed || (me && recheckNorm_(claimed) === recheckNorm_(me));
    if (!oversee && !mine) {
      stages.push(Object.assign(base, { connected: true, row: rec._row, present: true, mine: false, claimed_by: claimed, hidden: 'assigned to another checker' }));
      return;
    }
    stages.push(Object.assign(base, recheckOffsetView_(stage, ymd, rec), {
      connected: true,
      present: !!rec,
      row: rec ? rec._row : 0,
      prefilled_through: read.lastYmd,
      beyond_prefill: !rec && read.lastYmd !== '' && ymd > read.lastYmd,
      rechecked_by: rec ? rec[stage.checker] : '',
      status: rec ? rec[stage.status] : '',
      comment: rec && stage.comment ? rec[stage.comment] : '',
      accounts: recheckAccountsOf_(stage, rec),
      checked: recheckRowChecked_(stage, rec),
      mine: mine,
      claimed_by: claimed,
    }));
  });

  return {
    date: ymd, timezone: RECHECK_TZ, me: me,
    // Stated on every payload so no screen can quietly imply one arithmetic (§11.1 vs the workbook).
    offset_note: 'reference dates are computed from CONFIG (spec meaning ' +
      RECHECK_OFFSET_DEFAULTS.recheck_offset_china + '/' + RECHECK_OFFSET_DEFAULTS.recheck_offset_uk1 + '/' +
      RECHECK_OFFSET_DEFAULTS.recheck_offset_uk2 + '/' + RECHECK_OFFSET_DEFAULTS.recheck_offset_uk3 +
      ' days); the live workbook\'s own columns differ by ' + RECHECK_SHEET_OFFSETS.china + '/' +
      RECHECK_SHEET_OFFSETS.uk1 + '/' + RECHECK_SHEET_OFFSETS.uk2 + '/' + RECHECK_SHEET_OFFSETS.uk3 + ' days',
    stages: stripForRole_(stages, ctx.user.role, ctx.ident.email),
  };
}

// ---------- §11.2 write-back ----------
/** STATUS + comments (per account where the tab has account columns) written back to the Order
 * Rechecking workbook through SheetBridge — whitelisted, locked, shadow-gated, logged. */
function actionSubmitRecheck_(payload, ctx) {
  if (!recheckMayCheck_(ctx)) throw new Error('role may not recheck orders');
  const stage = recheckStage_(payload.stage);
  const ymd = payload.date ? recheckDateInput_(payload.date, 'date') : recheckToday_();

  let checker = recheckCheckerName_(ctx.user);
  if (payload.rechecked_by !== undefined && payload.rechecked_by !== '') {
    if (!recheckOversees_(ctx)) throw new Error('only Team Lead or Management file a recheck for someone else');
    checker = recheckCheckerInput_(payload.rechecked_by);
  }
  if (!checker) throw new Error('no sheet checker name for this user — pass rechecked_by');

  const values = {};
  values[stage.checker] = checker;

  const status = String(payload.status === undefined || payload.status === null ? '' : payload.status).trim();
  if (status) {
    if (stage.statuses.indexOf(status) < 0) throw new Error('status is not on this stage\'s dropdown');
    values[stage.status] = status;
  }

  const comment = String(payload.comment === undefined || payload.comment === null ? '' : payload.comment).trim();
  if (comment) {
    if (!stage.comment) throw new Error('this stage keeps its comments in the per-account columns');
    values[stage.comment] = comment.slice(0, RECHECK_MAX_TEXT);
  }

  const accounts = payload.accounts && typeof payload.accounts === 'object' ? payload.accounts : {};
  const accountIndex = {};
  stage.accounts.forEach(function (a) { accountIndex[recheckNorm_(a)] = a; });
  Object.keys(accounts).forEach(function (k) {
    const col = accountIndex[recheckNorm_(k)];
    if (!col) throw new Error('unknown account column for this stage: ' + k);
    const v = String(accounts[k] === undefined || accounts[k] === null ? '' : accounts[k]).trim();
    if (!v) return;
    if (stage.accountValues && stage.accountValues.indexOf(v) < 0) throw new Error('this stage records only: ' + stage.accountValues.join(' / '));
    values[col] = v.slice(0, RECHECK_MAX_TEXT);
  });

  const read = recheckReadStage_(stage);
  if (!read.ok) return { ok: false, reason: read.reason, stage: stage.key, date: ymd };
  const rec = read.days[ymd];
  if (!rec) return { ok: false, reason: 'no row for this date on ' + stage.tabs[0], stage: stage.key, date: ymd, prefilled_through: read.lastYmd };
  const claimed = String(rec[stage.checker] || '').trim();
  if (claimed && recheckNorm_(claimed) !== recheckNorm_(checker) && !recheckOversees_(ctx)) {
    throw new Error('this row is already signed by another checker');
  }

  const write = recheckWriteStageRow_(stage, ymd, rec._row, values, ctx.ident.email);
  logActivity_(ctx.ident.email, 'SUBMIT_RECHECK', stage.tabs[0] + '!' + ymd, claimed, checker,
    'status ' + (status || '-') + ' · fields ' + Object.keys(values).join(' | ') +
    (write && write.shadow ? ' · SHADOW' : '') + (write && write.ok ? '' : ' · ' + ((write && write.reason) || 'write failed')));

  return {
    ok: !!(write && write.ok), stage: stage.key, tab: stage.tabs[0], date: ymd, row: rec._row,
    rechecked_by: checker, status: status,
    shadow: !!(write && write.shadow), reason: write && write.ok ? '' : ((write && write.reason) || 'write failed'),
    written: (write && write.written) || [], skippedMissing: (write && write.skippedMissing) || [],
    offsets: recheckOffsetView_(stage, ymd, rec),
  };
}

/** The day's row is matched on 'Current Date'. The cell holds a real Date, so the match value is
 * built in the source workbook's own timezone; a tab where the day was typed as text falls back to
 * the plain string. A failed match writes nothing, so trying both is safe. */
function recheckWriteStageRow_(stage, ymd, row, values, actor) {
  const ctxOpen = recheckOpen_(stage);
  if (!ctxOpen) return { ok: false, reason: 'not connected yet' };
  const whitelist = recheckWriteCols_(stage);
  const candidates = [];
  const asDate = recheckSourceDate_(ctxOpen.tz, ymd);
  if (asDate) candidates.push(asDate);
  candidates.push(ymd);

  let last = { ok: false, reason: 'row not found' };
  for (let i = 0; i < candidates.length; i++) {
    const spec = recheckSpec_(stage);
    if (row) spec.row = row;
    const res = bridgeUpdateRow_(spec, stage.current, candidates[i], values, whitelist, actor);
    if (res && res.ok) return res;
    last = res || last;
    if (res && res.reason && res.reason !== 'row not found') return res;   // ambiguous/missing column: stop
  }
  return last;
}

// ---------- §11.1 daily generation (time trigger) ----------
/** Daily trigger. The stage tabs are prefilled years ahead, so on almost every day this only
 * VERIFIES today's row and reports which arithmetic it carries. A row is appended ONLY when today
 * is past the tab's prefilled horizon; a day missing from inside the prefilled range is a merged
 * or skipped day and is escalated to Management rather than appended out of date order. */
function generateRecheckRows() {
  seedRecheckConfig_('system');
  const ymd = recheckToday_();
  const out = [], notifyFor = [];
  let created = 0, present = 0, gaps = 0, offline = 0;

  RECHECK_STAGES.forEach(function (stage) {
    const read = recheckReadStage_(stage);
    if (!read.ok) {
      offline++;
      out.push({ stage: stage.key, tab: stage.tabs[0], ok: false, reason: read.reason });
      return;
    }
    const rec = read.days[ymd];
    if (rec) {
      present++;
      const view = recheckOffsetView_(stage, ymd, rec);
      if (view.offset_disagreement) {
        logActivity_('system', 'RECHECK_OFFSET_DISAGREE', stage.tabs[0] + '!' + ymd, String(view.sheet_offset_days), String(view.config_offset_days),
          'the row on the sheet is ' + view.sheet_offset_days + ' days back; CONFIG ' + stage.offsetKey + ' says ' + view.config_offset_days);
      }
      out.push(Object.assign({ stage: stage.key, tab: stage.tabs[0], ok: true, action: 'already prefilled', row: rec._row }, view));
      notifyFor.push(stage.label);
      return;
    }
    if (read.lastYmd && ymd <= read.lastYmd) {
      gaps++;
      out.push({ stage: stage.key, tab: stage.tabs[0], ok: false, action: 'gap inside the prefilled range', prefilled_through: read.lastYmd,
        reason: 'the day is missing between prefilled rows (a merged or skipped day) — appending it would break the date order' });
      notifyManagement_('Recheck day missing', stage.tabs[0] + ' has no row for ' + ymd + ' although it is prefilled to ' + read.lastYmd + '. Add the row in the sheet.', RECHECK_NOTIFY_REF + ymd + ':' + stage.key);
      logActivity_('system', 'RECHECK_ROW_GAP', stage.tabs[0] + '!' + ymd, '', '', 'prefilled through ' + read.lastYmd);
      return;
    }

    const ctxOpen = recheckOpen_(stage);
    if (!ctxOpen) {
      offline++;
      out.push({ stage: stage.key, tab: stage.tabs[0], ok: false, reason: 'not connected yet' });
      return;
    }
    const cfg = recheckOffset_(stage.offsetKey);
    const values = {};
    values[stage.current] = recheckSourceDate_(ctxOpen.tz, ymd) || ymd;
    values[stage.ref] = recheckSourceDate_(ctxOpen.tz, recheckShiftYmd_(ymd, -cfg)) || recheckShiftYmd_(ymd, -cfg);
    if (stage.ref2) {
      const cfg2 = recheckOffset_('recheck_offset_uk3');
      values[stage.ref2] = recheckSourceDate_(ctxOpen.tz, recheckShiftYmd_(ymd, -cfg2)) || recheckShiftYmd_(ymd, -cfg2);
    }
    const res = bridgeAppendRow_(recheckSpec_(stage), values, recheckDateCols_(stage), 'system');
    if (res && res.ok) created++;
    out.push(Object.assign({ stage: stage.key, tab: stage.tabs[0], ok: !!(res && res.ok), action: 'row created past the prefill horizon',
      shadow: !!(res && res.shadow), reason: res && res.ok ? '' : ((res && res.reason) || 'append failed') }, recheckOffsetView_(stage, ymd, null)));
    logActivity_('system', 'RECHECK_ROW_CREATE', stage.tabs[0] + '!' + ymd, '', ymd,
      'offset ' + cfg + ' from CONFIG ' + stage.offsetKey + ' (the sheet\'s own rows differ by ' + stage.sheetOffset + ')');
    if (res && res.ok) notifyFor.push(stage.label);
  });

  if (notifyFor.length) recheckNotifyCheckers_(ymd, notifyFor);
  const summary = ymd + ': ' + present + ' prefilled · ' + created + ' created · ' + gaps + ' gap(s) · ' + offline + ' not connected';
  logActivity_('system', 'GENERATE_RECHECK_ROWS', 'order_recheck', '', ymd, summary);
  return { date: ymd, summary: summary, stages: out };
}

/** One nudge per checker per day (§14) — the ref makes a re-run idempotent. */
function recheckNotifyCheckers_(ymd, stageLabels) {
  const ref = RECHECK_NOTIFY_REF + ymd;
  let already = false;
  readTab_('NOTIFICATIONS').forEach(function (n) { if (String(n.ref || '') === ref) already = true; });
  if (already) return;
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    if (String(u.role) !== 'Order Processor') return;
    if (!recheckCheckerName_({ name: u.name })) return;
    notify_(u.email, 'Order rechecking due',
      '🔵 Rechecking ready for ' + ymd + ' — ' + stageLabels.length + ' stage(s) waiting on you: ' + stageLabels.join(' · ') +
      '. Orders in these stages are not confirmed delivered until checked → open Order rechecking.', ref);
  });
}

/** §13.3 "orders rechecked" for a day — exported for the management dashboard. */
function recheckCompletedOn_(ymd) {
  const day = recheckYmd_(ymd) || recheckToday_();
  let checked = 0, connected = 0;
  RECHECK_STAGES.forEach(function (stage) {
    const read = recheckReadStage_(stage);
    if (!read.ok) return;
    connected++;
    if (recheckRowChecked_(stage, read.days[day])) checked++;
  });
  return { date: day, checked: checked, of: connected, stages: RECHECK_STAGES.length };
}

// ---------- §11.3 wrong orders ----------
function wrongOrderAccount_(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Account Name required');
  const n = recheckNorm_(raw);
  for (let i = 0; i < WRONG_ORDER_ACCOUNT_DV.length; i++) if (recheckNorm_(WRONG_ORDER_ACCOUNT_DV[i]) === n) return WRONG_ORDER_ACCOUNT_DV[i];
  if (WRONG_ORDER_ACCOUNT_ALIASES[n]) return WRONG_ORDER_ACCOUNT_ALIASES[n];
  throw new Error('Account Name is not one of the workbook\'s accounts');
}

/** eBay order numbers are NN-NNNNN-NNNNN; one live row carries a trailing newline, so the value is
 * trimmed before it is checked and before it is written. */
function wrongOrderId_(value) {
  const s = String(value || '').replace(/\s+/g, '');
  if (!/^\d{2}-\d{5}-\d{5}$/.test(s)) throw new Error('Order id must look like 15-14796-52804');
  return s;
}

function wrongOrderAliId_(value) {
  const s = String(value || '').replace(/\s+/g, '');
  if (!s) return '';
  if (!/^\d{10,20}$/.test(s)) throw new Error('Ali express id must be digits');   // the live rows are 16
  return s;
}

/** The mistake types the 29 real rows fall into. Spelling in the sheet varies wildly, so the type
 * is derived, never demanded — the operator's own words still go into the cell verbatim. */
function wrongOrderType_(mistake) {
  const n = recheckNorm_(mistake);
  if (!n) return 'other';
  if (n.indexOf('variatio') >= 0) return 'wrong variation';
  if (n.indexOf('address') >= 0) return 'wrong address';
  if (n.indexOf('quantity') >= 0 || n.indexOf('missing') >= 0) return '1 Quantity Missing';
  if (n.indexOf('extra item') >= 0) return 'EXTRA ITEM';
  if (n.indexOf('wrong order') >= 0) return 'wrong order';
  return 'other';
}

/** Tab candidates for one incident. The daily tabs are named by DISCOVERY day with inconsistent
 * casing ('20 june', '17 July'); the monthly '<Month> Wrong Orders Sheet' is the only tab that
 * carries 'Processed By ', which is the whole point of §11.3, so it is preferred when the month
 * has one. Whichever tab takes the row, no tab is ever created. */
function wrongOrderTabs_(discoveryYmd) {
  const d = Date.parse(discoveryYmd + 'T12:00:00Z');
  const month = WRONG_ORDER_MONTHS[new Date(d).getUTCMonth()];
  const day = new Date(d).getUTCDate();
  return [month + ' Wrong Orders Sheet', day + ' ' + month, day + ' ' + month.toLowerCase()];
}

function wrongOrderSpec_(tabs) {
  return { scope: 'global', kind: WRONG_ORDER_KIND, tab: tabs, expect: WRONG_ORDER_COLS, limit: WRONG_ORDER_READ_LIMIT };
}

/** §11.3 — the seven fields, entered by whoever found the mistake while rechecking.
 * `Processed By` is the accountability field: WHO MADE the error, not who found it. The finder is
 * the authenticated actor (RL-1) and is recorded in ACTIVITY_LOG, which is where the counters are
 * computed from — the daily tabs physically cannot hold either name. */
function actionLogWrongOrder_(payload, ctx) {
  if (!recheckMayCheck_(ctx)) throw new Error('role may not log wrong orders');

  const account = wrongOrderAccount_(payload.account_name);
  const orderId = wrongOrderId_(payload.order_id);
  const aliId = wrongOrderAliId_(payload.ali_express_id);
  const shop = String(payload.shop_name || '').trim().slice(0, 120);
  // Reality: col E 'Date' is the ORIGINAL ORDER date (weeks earlier at times), not the day the
  // mistake was found — the tab name records the discovery day.
  const orderYmd = recheckDateInput_(payload.date, 'date (the original order date)');
  const mistake = String(payload.mistake || '').trim();
  if (!mistake) throw new Error('Mistake required');
  const processedBy = recheckCheckerInput_(payload.processed_by);
  if (!processedBy) throw new Error('Processed By required — the wrong order belongs to someone');
  const type = wrongOrderType_(mistake);
  const discovery = payload.found_on ? recheckDateInput_(payload.found_on, 'found_on') : recheckToday_();

  const values = {};
  values['Account Name'] = account;
  values['Order id'] = orderId;
  if (aliId) values['Ali express id'] = aliId;
  if (shop) values['Shop Name'] = shop;
  values['Mistake'] = mistake.slice(0, RECHECK_MAX_TEXT);
  values[WRONG_ORDER_PROCESSED_BY] = processedBy;

  const tabs = wrongOrderTabs_(discovery);
  let write = { ok: false, reason: 'not connected yet' };
  if (recheckBridgeReady_()) {
    const id = bridgeResolveSheetId_('global', '', WRONG_ORDER_KIND);
    const open = id ? bridgeOpenTab_(id, tabs, WRONG_ORDER_COLS) : null;
    if (open) {
      const asDate = recheckSourceDate_(open.ss.getSpreadsheetTimeZone(), orderYmd);
      values['Date'] = asDate || orderYmd;
      write = bridgeAppendRow_(wrongOrderSpec_([open.sheet.getName()]), values, WRONG_ORDER_WRITE_COLS, ctx.ident.email);
    }
  }

  // The Mistake text is deliberately NOT copied into the log: live cells embed buyer names,
  // phone numbers and full addresses. The classified type is enough for every counter (RL-4).
  logActivity_(ctx.ident.email, WRONG_ORDER_LOG_ACTION, WRONG_ORDER_LOG_TARGET + orderId, processedBy, type,
    'account ' + account + ' · ali ' + (aliId || '-') + ' · shop ' + (shop || '-') + ' · order date ' + orderYmd +
    ' · found ' + discovery + ' · tab ' + ((write && write.tab) || 'none') + (write && write.shadow ? ' · SHADOW' : ''));

  notifyManagement_('Wrong order logged', ctx.user.name + ' logged a ' + type + ' on ' + account +
    ' (order ' + orderId + ') — processed by ' + processedBy + '.', WRONG_ORDER_LOG_TARGET + orderId);

  const missedAccountability = ((write && write.skippedMissing) || []).indexOf(WRONG_ORDER_PROCESSED_BY) >= 0;
  return {
    ok: !!(write && write.ok), tab: (write && write.tab) || '', row: (write && write.row) || 0,
    shadow: !!(write && write.shadow), reason: write && write.ok ? '' : ((write && write.reason) || 'write failed'),
    order_id: orderId, account_name: account, processed_by: processedBy, mistake_type: type,
    date: orderYmd, found_on: discovery,
    skippedMissing: (write && write.skippedMissing) || [],
    // True on the 6-column daily tabs, which have no Processed By column at all: the sheet keeps
    // the incident, the portal keeps the accountability.
    accountability_only_in_portal: missedAccountability || !(write && write.ok),
  };
}

/** Month a wrong-order tab belongs to. Tab names carry a month but no year ('20 june'), so the
 * year comes from the row's own date when it has one and from today otherwise. */
function wrongOrderTabMonth_(tabName, fallbackYear) {
  const n = recheckNorm_(tabName);
  for (let i = 0; i < WRONG_ORDER_MONTHS.length; i++) {
    if (n.indexOf(recheckNorm_(WRONG_ORDER_MONTHS[i])) >= 0) return { month: i + 1, key: fallbackYear + '-' + recheckPad2_(i + 1) };
  }
  return null;
}

function wrongOrderBump_(map, key, field) {
  if (!key) return;
  if (!map[key]) map[key] = { caused: 0, found: 0 };
  map[key][field]++;
}

/** 'Processed By' is a sheet name (Wahab · Zeeshan · Noman) while the finder is an authenticated
 * email — both are folded onto the sheet's name so one person is one row in the counter. */
function wrongOrderPeopleIndex_() {
  const byEmail = {};
  readTab_('USERS').forEach(function (u) {
    const em = normalizeEmail(u.email);
    if (!em) return;
    byEmail[em] = recheckCheckerName_({ name: u.name }) || String(u.name || u.email);
  });
  return byEmail;
}

function wrongOrderPerson_(value, byEmail) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.indexOf('@') < 0) return raw;
  return byEmail[normalizeEmail(raw)] || raw;
}

/** §11.3 / §13.3 / §12.1 — per person, per mistake type, per month. The workbook has no summary
 * tab and no formulas anywhere, so every number here is computed: incidents come from the daily
 * tabs (the business record), and 'Processed By' / 'found by' come from the portal's ACTIVITY_LOG,
 * matched on order id. Rows the portal never logged are reported as unattributed rather than
 * guessed at. Counts only — no Mistake text ever leaves this action, because those cells embed
 * buyer addresses and phone numbers (RL-4). */
function actionWrongOrderCounters_(payload, ctx) {
  if (!recheckMayCheck_(ctx)) throw new Error('role may not see wrong-order counters');
  const oversee = recheckOversees_(ctx);
  const wantMonth = String(payload.month || '').trim();
  if (wantMonth && !/^\d{4}-\d{2}$/.test(wantMonth)) throw new Error('month must be yyyy-MM');
  const thisYear = Number(recheckMonthNow_().slice(0, 4));

  // 1) the portal's own record — the only place Processed By and the finder exist.
  const logged = {};
  readTab_('ACTIVITY_LOG').forEach(function (a) {
    if (String(a.action || '') !== WRONG_ORDER_LOG_ACTION) return;
    const target = String(a.target || '');
    if (target.indexOf(WRONG_ORDER_LOG_TARGET) !== 0) return;
    const orderId = target.slice(WRONG_ORDER_LOG_TARGET.length);
    const ts = String(a.ts || '');
    logged[recheckNorm_(orderId)] = {
      order_id: orderId,
      caused_by: String(a.old_value || '').trim(),
      found_by: String(a.actor || '').trim(),
      type: String(a.new_value || '').trim() || 'other',
      month: ts.slice(0, 7),
      seen: false,
    };
  });

  // 2) the business record — one row per incident, one tab per discovery day.
  const byPerson = {}, byType = {}, byMonth = {};
  const peopleIndex = wrongOrderPeopleIndex_();
  let incidents = 0, unattributed = 0;
  const tabsRead = [];
  let connected = false;

  if (recheckBridgeReady_()) {
    const id = bridgeResolveSheetId_('global', '', WRONG_ORDER_KIND);
    const probe = id ? bridgeOpenTab_(id, null, WRONG_ORDER_COLS) : null;
    if (probe) {
      connected = true;
      const names = probe.ss.getSheets().filter(function (s) { return !s.isSheetHidden(); })
        .map(function (s) { return s.getName(); }).slice(0, WRONG_ORDER_MAX_TABS);
      names.forEach(function (name) {
        const monthInfo = wrongOrderTabMonth_(name, thisYear);
        if (!monthInfo) return;
        if (wantMonth && monthInfo.key !== wantMonth) return;
        const read = bridgeReadRows_(wrongOrderSpec_([name]));
        if (!read || !read.ok) return;
        tabsRead.push(name);
        read.rows.forEach(function (r) {
          const orderId = String(r['Order id'] || '').replace(/\s+/g, '');
          if (!orderId) return;
          const rowYmd = recheckYmd_(r['Date']);
          const monthKey = rowYmd ? (wrongOrderTabMonth_(name, Number(rowYmd.slice(0, 4))) || monthInfo).key : monthInfo.key;
          if (wantMonth && monthKey !== wantMonth) return;
          const hit = logged[recheckNorm_(orderId)];
          if (hit) hit.seen = true;
          const type = hit ? hit.type : wrongOrderType_(r['Mistake']);
          incidents++;
          byType[type] = (byType[type] || 0) + 1;
          byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
          if (hit && hit.caused_by) wrongOrderBump_(byPerson, hit.caused_by, 'caused');
          else unattributed++;
          if (hit && hit.found_by) wrongOrderBump_(byPerson, wrongOrderPerson_(hit.found_by, peopleIndex), 'found');
        });
      });
    }
  }

  // 3) incidents the portal logged that never reached the sheet (shadow mode, or not connected).
  let portalOnly = 0;
  Object.keys(logged).forEach(function (k) {
    const rec = logged[k];
    if (rec.seen) return;
    if (wantMonth && rec.month !== wantMonth) return;
    portalOnly++;
    incidents++;
    byType[rec.type] = (byType[rec.type] || 0) + 1;
    byMonth[rec.month] = (byMonth[rec.month] || 0) + 1;
    if (rec.caused_by) wrongOrderBump_(byPerson, rec.caused_by, 'caused'); else unattributed++;
    if (rec.found_by) wrongOrderBump_(byPerson, wrongOrderPerson_(rec.found_by, peopleIndex), 'found');
  });

  // §12.1 — staff see only their own numbers.
  const meChecker = recheckCheckerName_(ctx.user);
  const meEmail = normalizeEmail(ctx.ident.email);
  const people = Object.keys(byPerson).filter(function (p) {
    if (oversee) return true;
    return recheckNorm_(p) === recheckNorm_(meChecker) || normalizeEmail(p) === meEmail;
  }).map(function (p) {
    return { person: p, caused: byPerson[p].caused, found: byPerson[p].found };
  }).sort(function (a, b) { return b.caused - a.caused; });

  const types = WRONG_ORDER_TYPES.filter(function (t) { return byType[t]; })
    .map(function (t) { return { type: t, count: byType[t] }; });
  const months = Object.keys(byMonth).sort().map(function (m) { return { month: m, count: byMonth[m] }; });

  return {
    month: wantMonth || 'all',
    connected: connected,
    total_incidents: oversee ? incidents : '',
    by_person: people,
    by_type: oversee ? types : [],
    by_month: oversee ? months : [],
    unattributed: oversee ? unattributed : '',
    portal_only: oversee ? portalOnly : '',
    tabs_read: oversee ? tabsRead : [],
    // Stated so no dashboard implies the workbook counted anything: it does not.
    source_note: 'computed by the portal — the Wrong Order workbook has no summary tab and no ' +
      'formulas; the daily tabs carry 6 columns and no Processed By, so accountability comes from ' +
      'the portal\'s own log matched on Order id',
  };
}

const ACTIONS_RECHECK = {
  recheckQueue:       [actionRecheckQueue_, 'any'],        // Order Processor / TL / Mgmt gated inside
  submitRecheck:      [actionSubmitRecheck_, 'any'],
  logWrongOrder:      [actionLogWrongOrder_, 'any'],
  wrongOrderCounters: [actionWrongOrderCounters_, 'any'],  // §12.1 own-numbers-only gated inside
};
