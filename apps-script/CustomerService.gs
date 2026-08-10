/** Phase 5 — CUSTOMER SERVICE (Husnain). The 19-column Returns/Refunds case (§8.6), the
 * Returns & INAD feed (§10.3) read and annotated, and the CS live-data upkeep on the account's
 * Central Main Sheet (§8.7) with the §14 cross-notification. Every touch of a live workbook goes
 * through SheetBridge, header-addressed, inside a per-workflow whitelist.
 *
 * §4.2 / §8.6: this module carries buyer addresses AND order-earning figures, so CS, Management
 * and the Ops Head are the ONLY roles that reach any action in it. Every other role is refused and
 * the attempt lands in ACTIVITY_LOG — the refusal is the audit trail, not a UI detail.
 *
 * REALITY WINS over the spec on nearly every label here:
 *  · §8.6 prints 'CASE ID · Who's Card · eBay Order Number …'. The live tab is
 *    'HUSNIAN - Return  Refunds ' (double space, trailing space) inside the account's CENTRAL
 *    workbook, its headers are ALL-CAPS, and the third one is spelled 'E-BEY ORDER NUMBER'.
 *    'E-BEY ORDER NUMBER' and 'eBay Order Number' do NOT normalize to the same string, so every
 *    field carries both spellings and the tab's own header wins. Output keys are the LIVE
 *    spellings — the CS screen matches on them, and inventing 'eBay Order Number' would blank
 *    half the form.
 *  · That tab is EMPTY (0 rows) on the one workbook that has it, so the portal sets the row
 *    conventions: CASE ID is assigned here, never typed, and the money columns are written as
 *    numbers because the column format is 0.00.
 *  · Its dropdowns repeat the header text as their first option (a Sheets artifact — a prompt,
 *    not a value) and carry the business's own spellings: 'ITEM NOT RECIEVED', 'ACCPETED'. Those
 *    are the vocabulary and are validated, never corrected.
 *  · The 'EMAIL' column is the purchasing account that paid (SIR HASIB / AMNA BABHI), not the
 *    buyer's address — it is validated against the sheet's own two-value list.
 *  · TOTAL COST is stored exactly as CS types it. The cost helper prices both outcomes and says
 *    when the typed total matches neither, but it never overwrites the cell: option 1 (return) and
 *    option 2 (replacement) are alternatives, and which one the business books is a human call.
 *  · Only one of the six accounts has a Central workbook today (the registry's own To-Do lists the
 *    other four as pending), so a case falls back to the global 'returns' connection — Husnain's
 *    own Return/Refunds workbook. That workbook has no account column, so a fallback listing shows
 *    every account's cases; the response says which source answered.
 *  · §10.3's tab is written by the order automation and Orders.gs answers it read-only. §15 also
 *    gives CS annotate rights, so this module annotates ONLY the three cells a person can already
 *    edit in the sheet ('Status' is a live dropdown on I2:I1000, plus 'Notes' and 'Last Updated').
 *    The shipped CS screen still prefers writing the note on the case that owns the return.
 *  · §8.7 gives CS 'AliExpress Cost/status upkeep'. The live Main Sheet has no column called
 *    status: the cost is 'Aliexpress Cost' (lowercase e) and the only status-like cell CS may own
 *    is the 'Campaign Selection' dropdown. 'Profit ' is the sheet's own formula and
 *    'Current Campaign Selection' is sync-owned — neither is ever written.
 *
 * The campaign write is DELEGATED to Advertising.gs actionSetCampaign_ so CAMPAIGN_LOG and the
 * §14 fan-out ('by CS record-update → Zain+Mgmt') exist in exactly one place. */

// ---------- §8.6 the case tab ----------
/** The live tab name first; the rest are what a second workbook might reasonably spell it, and a
 * resolved tab is verified against the 19 headers before a single row is trusted. */
const CS_CASE_TAB_LIVE = 'HUSNIAN - Return  Refunds ';
const CS_CASE_TABS = [CS_CASE_TAB_LIVE, 'HUSNIAN - Return Refunds', 'HUSNAIN - Return  Refunds ',
  'HUSNAIN - Return Refunds', 'Return  Refunds', 'Return / Refunds', 'Returns & Refunds', 'Return Refunds'];

const CS_F_CASE_ID = 'CASE ID';
const CS_F_CARD = 'Who\'s Card';
const CS_F_EBAY = 'E-BEY ORDER NUMBER';
const CS_F_ISSUE = 'ISSUE';
const CS_F_PRODUCT = 'PRODUCT NAME';
const CS_F_EARNING = 'PRODUCT ORDER EARNING';
const CS_F_ALI_ORDER = 'ALI EXPRESS ORDER NUMBER';
const CS_F_ALI_COST = 'ALI EXPRESS COST';
const CS_F_RETURN_COST = 'ALI EXPRESS RETURN COST 1';
const CS_F_REPLACEMENT = 'REPLACEMENT COST OPTION 2';
const CS_F_TOTAL = 'TOTAL COST';
const CS_F_ADDRESS = 'CUSTOMER ADDRESS DETAIL';
const CS_F_TRACKING = 'TRACKING';
const CS_F_EMAIL = 'EMAIL';
const CS_F_QTY = 'QTY';
const CS_F_REFUND_STATUS = 'REFUND STATUS';
const CS_F_APPEAL = 'ALIEXPRESS APPEAL';
const CS_F_RESULT = 'FINAL RESULT';
const CS_F_NOTE = 'NOTE BY TEAM MEMBER';

/** The live data-validation lists, header echo removed. Closed vocabularies in the sheet itself,
 * so a value outside them would break the tab's own dropdown — they are validated, not suggested. */
const CS_ISSUES = ['DAMAGE', 'ITEM NOT RECIEVED', 'PAYMENT DISPUTE', 'WRONG PRODUCT'];
const CS_EMAILS = ['SIR HASIB', 'AMNA BABHI'];
const CS_QTYS = ['1', '2', '3', '4', '5 PLUS'];
const CS_REFUND_STATUSES = ['CUSTOMER REFUND', 'APPEAL ALI EXPRESS'];
const CS_APPEALS = ['NO APPEAL', 'PENDING', 'ACCPETED', 'REJECTED'];
const CS_RESULTS = ['REFUNDED WITH RETURN', 'REFUNDED WITHOUT RETURN'];

/** §8.6 verbatim, in the tab's own column order. `exact` lists the live ALL-CAPS spelling first and
 * the spec's own spelling second, so the same field resolves on either workbook; `key` is the live
 * spelling because that is what the CS screen and the sheet both use. */
const CS_CASE_FIELDS = [
  { key: CS_F_CASE_ID, exact: [CS_F_CASE_ID, 'Case ID'], immutable: true },
  { key: CS_F_CARD, exact: [CS_F_CARD, 'WHO\'S CARD', 'Whos Card'] },
  { key: CS_F_EBAY, exact: [CS_F_EBAY, 'eBay Order Number', 'EBAY ORDER NUMBER'], order: 'ebay' },
  { key: CS_F_ISSUE, exact: [CS_F_ISSUE, 'Issue'], list: 'issue', options: CS_ISSUES },
  { key: CS_F_PRODUCT, exact: [CS_F_PRODUCT, 'Product Name'] },
  { key: CS_F_EARNING, exact: [CS_F_EARNING, 'Product Order Earning'], money: true, profit: true },
  { key: CS_F_ALI_ORDER, exact: [CS_F_ALI_ORDER, 'AliExpress Order Number'], order: 'ali' },
  { key: CS_F_ALI_COST, exact: [CS_F_ALI_COST, 'AliExpress Cost'], money: true },
  { key: CS_F_RETURN_COST, exact: [CS_F_RETURN_COST, 'AliExpress Return Cost 1'], money: true },
  { key: CS_F_REPLACEMENT, exact: [CS_F_REPLACEMENT, 'Replacement Cost Option 2'], money: true },
  { key: CS_F_TOTAL, exact: [CS_F_TOTAL, 'Total Cost'], money: true },
  { key: CS_F_ADDRESS, exact: [CS_F_ADDRESS, 'Customer Address Detail'], pii: true, area: true },
  { key: CS_F_TRACKING, exact: [CS_F_TRACKING, 'Tracking'] },
  { key: CS_F_EMAIL, exact: [CS_F_EMAIL, 'Email'], list: 'email', options: CS_EMAILS, pii: true },
  { key: CS_F_QTY, exact: [CS_F_QTY, 'Qty'], list: 'qty', options: CS_QTYS },
  { key: CS_F_REFUND_STATUS, exact: [CS_F_REFUND_STATUS, 'Refund Status'], list: 'refund_status', options: CS_REFUND_STATUSES },
  { key: CS_F_APPEAL, exact: [CS_F_APPEAL, 'AliExpress Appeal'], list: 'appeal', options: CS_APPEALS },
  { key: CS_F_RESULT, exact: [CS_F_RESULT, 'Final Result'], list: 'result', options: CS_RESULTS },
  { key: CS_F_NOTE, exact: [CS_F_NOTE, 'Note by Team Member'], area: true },
];

const CS_CASE_COLUMNS = CS_CASE_FIELDS.map(function (f) { return f.key; });
/** Enough of the 19 to prove the tab really is the case table before any row is read or written. */
const CS_CASE_MIN_HEADERS = 12;
const CS_CASE_REQUIRED = [CS_F_EBAY, CS_F_ISSUE, CS_F_PRODUCT];
const CS_CASE_ID_PREFIX = 'CS';

// ---------- §10.3 the Returns & INAD tab ----------
const CS_RETURNS_TAB = 'Returns & INAD';
const CS_RETURNS_COLS = ['Date Added', 'Day Tab', 'Order No', 'Item Title', 'Buyer', 'Type',
  'Reason (eBay)', 'Explanation', 'Status', 'Refund Amount', 'Last Updated', 'Notes'];
const CS_RETURNS_TYPES = ['INAD', 'Return'];
const CS_RETURNS_STATUSES = ['Opened', 'Sent by Buyer', 'Waiting for Refund', 'Refunded'];
/** §15 annotate, bounded to the cells a person already edits in that tab: the Status dropdown
 * (I2:I1000), the free-text Notes column, and the Last Updated stamp that goes with them. Every
 * other column belongs to the order automation. */
const CS_RETURNS_WRITABLE = ['Status', 'Notes', 'Last Updated'];
const CS_RETURNS_ORDER_COL = 'Order No';
const CS_RETURNS_NOTES_COL = 'Notes';
const CS_RETURNS_STATUS_COL = 'Status';
const CS_RETURNS_UPDATED_COL = 'Last Updated';
const CS_RETURNS_ADDED_COL = 'Date Added';

// ---------- §8.7 the Central Main Sheet ----------
const CS_MAIN_TAB = ['Main Sheet'];
// Headers as the live Central workbook spells them ('Aliexpress Cost' lowercase e, 'Profit ' with
// its trailing space, 'Ali Express Link 1' as two words).
const CS_MAIN_COLS = ['Image Link', 'Listing Title', 'Sold For', 'Order Earning', 'Aliexpress Cost',
  'Profit ', 'Campaign Selection', 'Current Campaign Selection', 'eBay Item No'];
const CS_MAIN_TITLE = 'Listing Title';
const CS_MAIN_SOLD = 'Sold For';
const CS_MAIN_EARNING = 'Order Earning';
const CS_MAIN_COST = 'Aliexpress Cost';
const CS_MAIN_PROFIT = 'Profit ';
const CS_MAIN_CAMPAIGN = 'Campaign Selection';
const CS_MAIN_CURRENT_CAMPAIGN = 'Current Campaign Selection';
const CS_MAIN_ITEM = 'eBay Item No';
/** RL-6 column ownership for CS on this tab: the AliExpress cost and nothing else. The campaign
 * column is written through Advertising.gs (one owner, one log, one notification), 'Profit ' is the
 * sheet's own =ROUND(0.8*(E−F),2) formula, and 'Current Campaign Selection' mirrors eBay and is
 * maintained by the existing sync. */
const CS_LIVE_WRITABLE = [CS_MAIN_COST];
const CS_CAMPAIGNS = ['Campaign CPC', 'General Dynamic', 'Organic'];
const CS_CAMPAIGN_UNPAID = 'Organic';
// The Main Sheet's own Profit cell: Profit = 0.8 × (Order Earning − Aliexpress Cost). The 0.8
// haircut lives in the cell, not in ⚙ Config, so it is quoted here only to preview what the sheet
// will show after a cost write — the portal never writes that column.
const CS_PROFIT_HAIRCUT = 0.8;

const CS_CASE_LIMIT = 1000;
const CS_RETURNS_LIMIT = 500;
const CS_MAIN_LIMIT = 2000;                          // the live grid is padded to row 1151
const CS_MAX_TEXT = 4000;
const CS_MAX_SHORT = 300;
const CS_MAX_MONEY = 100000;
const CS_LIVE_REF = 'cs-live:';

// ---------- access (§4.2, §8.6 "CS+Mgmt only") ----------
/** The whole module behind one gate. A refusal is logged with the role that tried, because "who
 * went looking for buyer addresses" is exactly what an audit needs to answer (RL-1, RL-5). */
function csAssertCs_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return;
  if (String(ctx.user.role || '') === 'CS') return;
  logActivity_(ctx.ident.email, 'CS_ACCESS_DENIED', 'CustomerService', '', '',
    'role ' + String(ctx.user.role || 'unknown') + ' asked for the customer service module');
  throw new Error('customer service and management only');
}

/** RL-4, provable rather than promised: the module never builds a record for a role that may not
 * see its fields, and this asserts that on the way out. */
function csView_(ctx) {
  const role = String(ctx.user.role || '');
  return {
    role: role,
    profit: canSeeProfit_(role),
    pii: isMgmt_(role, ctx.ident.email) || role === 'CS' || role === 'Order Processor',
  };
}

/** PROFIT_FIELDS and PII_FIELDS are matched on exact keys in stripForRole_, which cannot see that
 * 'CUSTOMER ADDRESS DETAIL' is the same column as 'Customer Address Detail'. The role gate above is
 * the guarantee; this is the proof, folded the way the sheets spell things. */
function csAssertVisibility_(row, view) {
  Object.keys(row || {}).forEach(function (k) {
    const n = csNorm_(k);
    if (!view.profit && PROFIT_FIELDS.some(function (f) { return csNorm_(f) === n; })) {
      throw new Error('§4.2 violation: ' + k + ' can never reach this role');
    }
    if (!view.pii && PII_FIELDS.some(function (f) { return csNorm_(f) === n; })) {
      throw new Error('§4.2 violation: ' + k + ' can never reach this role');
    }
  });
  return row;
}

function csOut_(rows, ctx) {
  const view = csView_(ctx);
  (Array.isArray(rows) ? rows : [rows]).forEach(function (r) { csAssertVisibility_(r, view); });
  return stripForRole_(rows, ctx.user.role, ctx.ident.email);
}

// ---------- accounts (§3, §6 — rows in CONNECTIONS, never a hardcoded list) ----------
function csAccounts_() {
  const seen = {}, out = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.scope || '').trim() !== 'account') return;
    const name = String(c.account_name || '').trim();
    const n = csNorm_(name);
    if (!n || seen[n]) return;
    seen[n] = true;
    out.push(name);
  });
  return out;
}

/** accounts_access is a comma list when Management has scoped the person; the seed placeholders
 * ('per-role', 'ALL', empty) mean "not scoped yet" and do not restrict. */
function csAccountsAllow_(accountsField, account) {
  const raw = String(accountsField || '').trim();
  if (!raw || raw === 'ALL' || raw === 'per-role') return true;
  const want = csNorm_(account);
  if (!want) return false;
  return raw.split(',').some(function (a) {
    const have = csNorm_(a);
    return have !== '' && (have === want || have.indexOf(want) >= 0 || want.indexOf(have) >= 0);
  });
}

function csRequireAccount_(payload, ctx) {
  const raw = String(payload.account || '').trim();
  if (!raw || raw.length > 120) throw new Error('account required');
  const known = csAccounts_();
  let account = raw;
  if (known.length) {
    const want = csNorm_(raw);
    let hit = '';
    for (let i = 0; i < known.length && !hit; i++) if (csNorm_(known[i]) === want) hit = known[i];
    if (!hit) throw new Error('unknown account');
    account = hit;
  }
  if (!isMgmt_(ctx.user.role, ctx.ident.email) && !csAccountsAllow_(ctx.user.accounts, account)) {
    throw new Error('account not in your access');
  }
  return account;
}

function csAdvertisingEmails_(skipEmail) {
  const skip = normalizeEmail(skipEmail || '');
  const seen = {}, out = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.role || '') !== 'Advertising Manager') return;
    if (String(u.status) !== 'approved') return;
    const n = normalizeEmail(u.email);
    if (!n || n === skip || seen[n]) return;
    seen[n] = true;
    out.push(String(u.email));
  });
  return out;
}

// ---------- header resolution ----------
/** The record keys bridgeReadRows_ builds, column by column: the raw header when it normalizes to
 * something, otherwise (and on a repeat of an identical raw header) a positional 'col:X'. */
function csRecordKeys_(headers) {
  const seen = { _row: true };
  const keys = [];
  headers.forEach(function (h, i) {
    const raw = h === null || h === undefined ? '' : String(h);
    let key = csNorm_(raw) ? raw : 'col:' + csColLetter_(i + 1);
    // hasOwnProperty, not truthiness: a header spelled 'constructor' would otherwise inherit one.
    if (Object.prototype.hasOwnProperty.call(seen, key)) key = 'col:' + csColLetter_(i + 1);
    seen[key] = true;
    keys.push(key);
  });
  return keys;
}

function csColLetter_(col) {
  let n = Number(col) || 0, out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** canonical key → { rec, col, header } for one read. The tab's exact spelling wins; a normalized
 * match is accepted only when it resolves to one column, so a workbook that repeats a header is
 * refused rather than guessed at. */
function csResolveFields_(headers, fields) {
  const keys = csRecordKeys_(headers);
  const byExact = {}, byNorm = {};
  const at = function (bag, k) { return Object.prototype.hasOwnProperty.call(bag, k) ? bag[k] : null; };
  headers.forEach(function (h, i) {
    const raw = h === null || h === undefined ? '' : String(h);
    if (!at(byExact, raw)) byExact[raw] = [];
    byExact[raw].push(i);
    const n = csNorm_(raw);
    if (!n) return;
    if (!at(byNorm, n)) byNorm[n] = [];
    byNorm[n].push(i);
  });

  const map = {};
  fields.forEach(function (f) {
    const spellings = f.exact || [f.key];
    let col = -1;
    for (let i = 0; i < spellings.length && col < 0; i++) {
      const hit = at(byExact, spellings[i]);
      if (hit && hit.length === 1) col = hit[0];
    }
    for (let i = 0; i < spellings.length && col < 0; i++) {
      const hit = at(byNorm, csNorm_(spellings[i]));
      if (hit && hit.length === 1) col = hit[0];
    }
    if (col >= 0) map[f.key] = { rec: keys[col], col: col, header: String(headers[col]) };
  });
  return map;
}

function csCell_(rec, map, key) {
  const f = map[key];
  if (!f) return '';
  const v = rec[f.rec];
  return v === null || v === undefined ? '' : v;
}

// ---------- opening the case tab ----------
/** The account's Central workbook first — that is where the live tab sits — then Husnain's own
 * Return/Refunds workbook (global kind 'returns') for the five accounts whose Central sheet does
 * not exist yet. A resolved tab is verified against the 19 headers: SheetBridge accepts a unique
 * containment match on tab names, and an unverified match would write a buyer's address into some
 * other tab's column. */
function csOpenCases_(account) {
  const sources = [
    { source: 'account central', spec: { scope: 'account', account: account, kind: 'central', tab: CS_CASE_TABS, expect: CS_CASE_COLUMNS, limit: CS_CASE_LIMIT } },
    { source: 'CS returns workbook', spec: { scope: 'global', account: '', kind: 'returns', tab: CS_CASE_TABS, expect: CS_CASE_COLUMNS, limit: CS_CASE_LIMIT } },
  ];
  let reason = 'not connected yet';
  for (let i = 0; i < sources.length; i++) {
    const read = bridgeReadRows_(sources[i].spec);
    if (!read.ok) { reason = String(read.reason || reason); continue; }
    const fields = csResolveFields_(read.headers, CS_CASE_FIELDS);
    const found = Object.keys(fields).length;
    if (!fields[CS_F_CASE_ID] || !fields[CS_F_EBAY] || found < CS_CASE_MIN_HEADERS) {
      reason = 'the tab found on this workbook is not the ' + CS_CASE_TAB_LIVE.trim() + ' case table';
      continue;
    }
    return {
      ok: true, source: sources[i].source, spec: sources[i].spec, read: read, fields: fields,
      tab: read.tab, columns: csPresentColumns_(fields),
      // The fallback workbook has no account column, so its rows are every account's cases.
      account_scoped: sources[i].spec.scope === 'account',
    };
  }
  return { ok: false, reason: reason };
}

function csPresentColumns_(fields) {
  return CS_CASE_COLUMNS.filter(function (k) { return !!fields[k]; });
}

/** One case row, keyed by the LIVE header spellings the CS screen matches on, with the cost maths
 * attached so the same numbers are never computed twice in two places. */
function csCaseRow_(rec, fields) {
  const out = { _row: rec._row };
  CS_CASE_COLUMNS.forEach(function (k) {
    if (!fields[k]) return;
    out[k] = csCell_(rec, fields, k);
  });
  out.cost_summary = csCostSummary_(out);
  return out;
}

function csIsCaseRow_(rec, fields) {
  return String(csCell_(rec, fields, CS_F_CASE_ID)).trim() !== ''
    || String(csCell_(rec, fields, CS_F_EBAY)).trim() !== ''
    || String(csCell_(rec, fields, CS_F_PRODUCT)).trim() !== '';
}

// ---------- the cost helper ----------
/** What a case is costing, both ways round (§8.6 names the columns 'RETURN COST 1' and
 * 'REPLACEMENT COST OPTION 2' — they are alternatives, not a running total). `total_cost` is the
 * three columns added as the sheet's column order reads them; `total_cost_on_sheet` is what CS
 * actually typed, and the two are reported side by side rather than reconciled: the sheet stores
 * what the person types and nothing here overwrites it. */
function csCostSummary_(row) {
  const earning = csNumberOrNull_(row[CS_F_EARNING]);
  const ali = csNumberOrNull_(row[CS_F_ALI_COST]);
  const ret = csNumberOrNull_(row[CS_F_RETURN_COST]);
  const rep = csNumberOrNull_(row[CS_F_REPLACEMENT]);
  const typed = csNumberOrNull_(row[CS_F_TOTAL]);

  const anyCost = ali !== null || ret !== null || rep !== null;
  const total = anyCost ? csRound2_((ali || 0) + (ret || 0) + (rep || 0)) : null;
  const option1 = (ali === null && ret === null) ? null : csRound2_((ali || 0) + (ret || 0));
  const option2 = (ali === null && rep === null) ? null : csRound2_((ali || 0) + (rep || 0));
  const net = function (cost) { return (earning === null || cost === null) ? null : csRound2_(earning - cost); };

  return {
    order_earning: earning,
    aliexpress_cost: ali,
    return_cost: ret,
    replacement_cost: rep,
    total_cost: total,
    total_cost_on_sheet: typed,
    total_matches: (typed === null || total === null) ? null : typed === total,
    option_1_return: option1,
    option_2_replacement: option2,
    cheaper_option: (option1 !== null && option2 !== null && option1 !== option2) ? (option1 < option2 ? 1 : 2) : 0,
    net_against_earning: net(typed !== null ? typed : total),
    net_option_1: net(option1),
    net_option_2: net(option2),
    loses_money: (function () {
      const n = net(typed !== null ? typed : total);
      return n === null ? null : n < 0;
    })(),
  };
}

// ---------- §8.6 list / filter ----------
function actionCsCases_(payload, ctx) {
  csAssertCs_(ctx);
  const account = csRequireAccount_(payload, ctx);
  const src = csOpenCases_(account);
  if (!src.ok) {
    return {
      ok: false, account: account, reason: src.reason, tab: CS_CASE_TAB_LIVE,
      columns: CS_CASE_COLUMNS, dropdowns: csDropdowns_(),
    };
  }

  const want = {
    issue: csFilterValue_(payload.issue, CS_ISSUES, 'issue'),
    refund_status: csFilterValue_(payload.refund_status || payload.status, CS_REFUND_STATUSES, 'refund status'),
    appeal: csFilterValue_(payload.appeal, CS_APPEALS, 'appeal'),
    result: csFilterValue_(payload.result, CS_RESULTS, 'final result'),
    open: payload.open === true || String(payload.open || '') === 'true',
    q: csNorm_(payload.q || ''),
    order: csOrderKey_(payload.order_no || ''),
  };

  const rows = [];
  src.read.rows.forEach(function (r) {
    if (!csIsCaseRow_(r, src.fields)) return;
    const row = csCaseRow_(r, src.fields);
    if (want.issue && String(row[CS_F_ISSUE] || '').trim() !== want.issue) return;
    if (want.refund_status && String(row[CS_F_REFUND_STATUS] || '').trim() !== want.refund_status) return;
    if (want.appeal && String(row[CS_F_APPEAL] || '').trim() !== want.appeal) return;
    if (want.result && String(row[CS_F_RESULT] || '').trim() !== want.result) return;
    if (want.open && String(row[CS_F_RESULT] || '').trim() !== '') return;
    if (want.order && csOrderKey_(row[CS_F_EBAY]) !== want.order) return;
    if (want.q && csHaystack_(row).indexOf(want.q) < 0) return;
    rows.push(row);
  });

  // The tab has no date column at all, so append order is the only chronology there is: the newest
  // case is the last row written, and the screen asks for newest first.
  rows.sort(function (a, b) { return (Number(b._row) || 0) - (Number(a._row) || 0); });

  return {
    ok: true, account: account, source: src.source, account_scoped: src.account_scoped,
    tab: src.tab, columns: src.columns, all_columns: CS_CASE_COLUMNS,
    cases: csOut_(rows, ctx), count: rows.length,
    // SheetBridge reads from the header row down, so a truncated read is the OLDEST rows, not the
    // newest — said plainly rather than sorted into looking right.
    truncated: !!src.read.truncated, truncated_from_top: !!src.read.truncated,
    dropdowns: csDropdowns_(), required: CS_CASE_REQUIRED,
    totals: csCaseTotals_(rows),
  };
}

function csCaseTotals_(rows) {
  let open = 0, appeals = 0, cost = 0;
  rows.forEach(function (r) {
    if (String(r[CS_F_RESULT] || '').trim() === '') open++;
    if (String(r[CS_F_APPEAL] || '').trim().toUpperCase() === 'PENDING') appeals++;
    const typed = csNumberOrNull_(r[CS_F_TOTAL]);
    if (typed !== null) cost += typed;
  });
  return { cases: rows.length, open: open, appeals_pending: appeals, total_cost: csRound2_(cost) };
}

function csDropdowns_() {
  return {
    issue: CS_ISSUES.slice(), email: CS_EMAILS.slice(), qty: CS_QTYS.slice(),
    refund_status: CS_REFUND_STATUSES.slice(), appeal: CS_APPEALS.slice(), result: CS_RESULTS.slice(),
  };
}

function csHaystack_(row) {
  return csNorm_([row[CS_F_CASE_ID], row[CS_F_EBAY], row[CS_F_ALI_ORDER], row[CS_F_PRODUCT],
    row[CS_F_TRACKING], row[CS_F_NOTE]].join(' '));
}

function csFilterValue_(value, options, label) {
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return '';
  return csEnum_(raw, options, label);
}

// ---------- §8.6 create ----------
function actionCreateCase_(payload, ctx) {
  csAssertCs_(ctx);
  const account = csRequireAccount_(payload, ctx);
  const src = csOpenCases_(account);
  if (!src.ok) return { ok: false, account: account, reason: src.reason };

  const values = csValidateColumns_(payload.columns);
  CS_CASE_REQUIRED.forEach(function (k) {
    if (!src.fields[k]) return;                        // a workbook missing the column cannot demand it
    if (String(values[k] === undefined ? '' : values[k]).trim() === '') {
      throw new Error(k + ' is needed before a case can be opened');
    }
  });

  // RL-6 idempotency: a retried submit must not open the same case twice. Same order number, same
  // issue and same product is the only signature this tab offers — it has no timestamp column.
  const twin = csFindTwin_(src, values);
  if (twin) {
    logActivity_(ctx.ident.email, 'CS_CASE_CREATE_DUPLICATE', account + '!' + twin.case_id, '', '',
      'retry of an existing case on order ' + String(values[CS_F_EBAY] || ''));
    return {
      ok: true, idempotent: true, account: account, source: src.source, tab: src.tab,
      case_id: twin.case_id, row: twin.row, case: csOut_(twin.row_data, ctx),
      cost_summary: twin.row_data.cost_summary,
    };
  }

  const caseId = csNewCaseId_(src);
  values[CS_F_CASE_ID] = caseId;

  const plan = csSheetValues_(values, src.fields);
  let res = null;
  try {
    // SheetBridge takes the script lock around its own read-modify-write; a second lock from this
    // execution is exactly how a write deadlocks itself, so nothing here holds one.
    res = bridgeAppendRow_(csWriteSpec_(src), plan.values, plan.whitelist, ctx.ident.email);
  } catch (e) {
    logActivity_(ctx.ident.email, 'CS_CASE_CREATE_REFUSED', account + '!' + src.tab, '', '', String((e && e.message) || e));
    return { ok: false, account: account, reason: 'the sheet refused this write' };
  }
  if (!res.ok) return { ok: false, account: account, reason: String(res.reason || 'not connected yet') };

  const row = csMergedRow_(null, values);
  const skipped = (res.skippedMissing || []).concat(plan.missing);
  logActivity_(ctx.ident.email, 'CS_CASE_CREATE', account + '!' + src.tab + '!' + caseId, '',
    csChangeText_(row, values), 'order ' + String(values[CS_F_EBAY] || '') + ' · ' + (res.shadow ? 'shadow' : 'written')
    + (skipped.length ? ' · not on this tab: ' + skipped.join(' | ') : ''));

  return {
    ok: true, shadow: !!res.shadow, account: account, source: src.source, tab: src.tab,
    case_id: caseId, row: res.row || 0, case: csOut_(row, ctx), cost_summary: row.cost_summary,
    written: res.written || [], skipped: skipped,
  };
}

/** Same order number + same issue + same product = the same case. Nothing else on this tab can
 * tell two genuine cases on one multi-item order apart, so anything less would refuse real work. */
function csFindTwin_(src, values) {
  const order = csOrderKey_(values[CS_F_EBAY]);
  if (!order) return null;
  const issue = csNorm_(values[CS_F_ISSUE]);
  const product = csNorm_(values[CS_F_PRODUCT]);
  let hit = null;
  src.read.rows.forEach(function (r) {
    if (hit) return;
    if (!csIsCaseRow_(r, src.fields)) return;
    if (csOrderKey_(csCell_(r, src.fields, CS_F_EBAY)) !== order) return;
    if (csNorm_(csCell_(r, src.fields, CS_F_ISSUE)) !== issue) return;
    if (csNorm_(csCell_(r, src.fields, CS_F_PRODUCT)) !== product) return;
    const row = csCaseRow_(r, src.fields);
    hit = { case_id: String(row[CS_F_CASE_ID] || ''), row: r._row, row_data: row };
  });
  return hit;
}

/** CASE ID is assigned here, never typed: the live tab is empty, so the portal is what makes the
 * column unique in the first place. */
function csNewCaseId_(src) {
  const taken = {};
  src.read.rows.forEach(function (r) {
    const id = csNorm_(csCell_(r, src.fields, CS_F_CASE_ID));
    if (id) taken[id] = true;
  });
  for (let i = 0; i < 5; i++) {
    const id = CS_CASE_ID_PREFIX + Utilities.getUuid().slice(0, 8);
    if (!taken[csNorm_(id)]) return id;
  }
  throw new Error('could not assign a case id');
}

// ---------- §8.6 update ----------
function actionUpdateCase_(payload, ctx) {
  csAssertCs_(ctx);
  const account = csRequireAccount_(payload, ctx);
  const caseId = csText_(payload.case_id, 60);
  if (!caseId) throw new Error('case_id required');

  const src = csOpenCases_(account);
  if (!src.ok) return { ok: false, account: account, reason: src.reason };

  const found = csFindCase_(src, caseId, payload.row);
  if (!found.ok) return { ok: false, account: account, reason: found.reason, rows: found.rows || undefined };

  const values = csValidateColumns_(payload.columns);
  if (!Object.keys(values).length) throw new Error('nothing to update');

  const before = found.row_data;
  const plan = csSheetValues_(values, src.fields);
  let res = null;
  try {
    res = bridgeUpdateRow_(csWriteSpec_(src, found.row), src.fields[CS_F_CASE_ID].header, caseId,
      plan.values, plan.whitelist, ctx.ident.email);
  } catch (e) {
    logActivity_(ctx.ident.email, 'CS_CASE_UPDATE_REFUSED', account + '!' + src.tab + '!' + caseId, '', '',
      String((e && e.message) || e));
    return { ok: false, account: account, reason: 'the sheet refused this write' };
  }
  if (!res.ok) return { ok: false, account: account, reason: String(res.reason || 'not connected yet'), rows: res.rows || undefined };

  const after = csMergedRow_(before, values);
  after._row = found.row;
  const skipped = (res.skippedMissing || []).concat(plan.missing);
  logActivity_(ctx.ident.email, 'CS_CASE_UPDATE', account + '!' + src.tab + '!' + caseId,
    csChangeText_(before, values), csChangeText_(after, values),
    Object.keys(values).join(' | ') + ' · ' + (res.shadow ? 'shadow' : 'written')
    + (skipped.length ? ' · not on this tab: ' + skipped.join(' | ') : ''));

  return {
    ok: true, shadow: !!res.shadow, account: account, source: src.source, tab: src.tab,
    case_id: caseId, row: found.row, case: csOut_(after, ctx), cost_summary: after.cost_summary,
    written: res.written || [], unchanged: res.unchanged || [], skipped: skipped,
  };
}

function csFindCase_(src, caseId, forcedRow) {
  const want = csNorm_(caseId);
  const hits = [];
  src.read.rows.forEach(function (r) {
    if (csNorm_(csCell_(r, src.fields, CS_F_CASE_ID)) === want) hits.push(r);
  });
  if (!hits.length) {
    return { ok: false, reason: src.read.truncated ? 'this tab is longer than the portal reads' : 'case not found' };
  }
  const forced = Number(forcedRow) || 0;
  let rec = hits[0];
  if (hits.length > 1) {
    if (!forced) {
      return {
        ok: false, reason: 'this case id repeats on this tab — choose a row',
        rows: hits.map(function (r) { return { _row: r._row, product: String(csCell_(r, src.fields, CS_F_PRODUCT)) }; }),
      };
    }
    rec = null;
    hits.forEach(function (r) { if (r._row === forced) rec = r; });
    if (!rec) return { ok: false, reason: 'that row does not carry this case id' };
  } else if (forced && forced !== rec._row) {
    return { ok: false, reason: 'that row does not carry this case id' };
  }
  return { ok: true, row: rec._row, row_data: csCaseRow_(rec, src.fields) };
}

function csWriteSpec_(src, row) {
  const spec = {
    scope: src.spec.scope, account: src.spec.account, kind: src.spec.kind,
    tab: [src.tab], expect: CS_CASE_COLUMNS,
  };
  if (row) spec.row = row;
  return spec;
}

/** Canonical values → the tab's OWN header names, with the whitelist built from the same resolved
 * headers. A key outside the 19 never reaches SheetBridge, and a whitelisted column this workbook
 * does not carry comes back in skippedMissing — never created (the Sheet Contract). */
function csSheetValues_(values, fields) {
  const out = {}, whitelist = [], written = [], missing = [];
  Object.keys(values).forEach(function (k) {
    if (CS_CASE_COLUMNS.indexOf(k) < 0) throw new Error('write outside the §8.6 whitelist: ' + k);
    const f = fields[k];
    // A column this workbook does not head is reported back, never created — the whole point of
    // the Sheet Contract. The rest of the row still lands.
    if (!f) { missing.push(k); return; }
    out[f.header] = values[k];
    whitelist.push(f.header);
    written.push(k);
  });
  if (!Object.keys(out).length) throw new Error('none of those columns exist on this tab');
  return { values: out, whitelist: whitelist, written: written, missing: missing };
}

function csMergedRow_(before, values) {
  const row = {};
  CS_CASE_COLUMNS.forEach(function (k) {
    if (before && before[k] !== undefined) row[k] = before[k];
    if (values[k] !== undefined) row[k] = values[k];
    if (row[k] === undefined) row[k] = '';
  });
  if (before && before._row !== undefined) row._row = before._row;
  row.cost_summary = csCostSummary_(row);
  return row;
}

/** ACTIVITY_LOG wants old→new on every write (RL-6), and only for the columns that moved. */
function csChangeText_(row, values) {
  return Object.keys(values).map(function (k) {
    const v = row && row[k] !== undefined ? row[k] : '';
    return k + '=' + String(v === null || v === undefined ? '' : v).slice(0, 60);
  }).join(' | ').slice(0, 1000);
}

// ---------- validation of the 19 columns ----------
/** The screen sends the tab's own header spellings; every key is folded back to its canonical field
 * and anything that is not one of the 19 is refused by name. CASE ID is never writable — it is the
 * row's identity, and rewriting it would orphan every log line that mentions it. */
function csValidateColumns_(columns) {
  if (!columns || typeof columns !== 'object' || Array.isArray(columns)) throw new Error('columns required');
  const out = {};
  Object.keys(columns).forEach(function (raw) {
    const field = csFieldFor_(raw);
    if (!field) throw new Error('unknown column: ' + String(raw).slice(0, 60));
    if (field.immutable) throw new Error(field.key + ' is assigned by the portal and is not writable');
    // Two spellings of one column ('EMAIL' and 'Email') would race each other into the same cell.
    if (out[field.key] !== undefined) throw new Error('the same column was sent twice: ' + field.key);
    out[field.key] = csFieldValue_(field, columns[raw]);
  });
  if (!Object.keys(out).length) throw new Error('columns required');
  return out;
}

function csFieldFor_(header) {
  const want = csNorm_(header);
  if (!want) return null;
  for (let i = 0; i < CS_CASE_FIELDS.length; i++) {
    const f = CS_CASE_FIELDS[i];
    const spellings = f.exact || [f.key];
    for (let j = 0; j < spellings.length; j++) if (csNorm_(spellings[j]) === want) return f;
  }
  return null;
}

function csFieldValue_(field, value) {
  const raw = value === null || value === undefined ? '' : value;
  if (String(raw).trim() === '') return '';            // clearing a cell is a legitimate correction
  if (field.options) return csEnum_(raw, field.options, field.key);
  if (field.money) return csMoneyValue_(raw, field.key);
  if (field.order === 'ebay') return csEbayOrderNumber_(raw);
  if (field.order === 'ali') return csAliOrderNumber_(raw);
  if (field.area) return csText_(raw, CS_MAX_TEXT, true);
  return csText_(raw, CS_MAX_SHORT);
}

// ---------- §10.3 the Returns & INAD feed (read, and §15 annotate) ----------
function actionReturnsFeed_(payload, ctx) {
  csAssertCs_(ctx);
  const account = csRequireAccount_(payload, ctx);
  // 'status' means two different things on this action: a filter on the way in, the annotation on
  // the way out. An order number is what tells them apart — one row is being written, not listed.
  const annotating = payload.order_no !== undefined && String(payload.order_no).trim() !== '';
  if (payload.note !== undefined && !annotating) throw new Error('order_no required to annotate a return');
  if (annotating) return csAnnotateReturn_(payload, ctx, account);

  const wantType = csFilterValue_(payload.type, CS_RETURNS_TYPES, 'return type');
  const wantStatus = csFilterValue_(payload.status, CS_RETURNS_STATUSES, 'return status');
  const read = csReadReturns_(account);
  if (!read.ok) {
    return {
      ok: false, account: account, reason: String(read.reason || 'not connected yet'),
      tab: CS_RETURNS_TAB, columns: CS_RETURNS_COLS, types: CS_RETURNS_TYPES, statuses: CS_RETURNS_STATUSES,
    };
  }

  const rows = [];
  read.rows.forEach(function (r) {
    const rec = csReturnRow_(r, read.fields);
    if (String(rec['Order No']).trim() === '' && String(rec['Item Title']).trim() === '') return;
    if (wantType && String(rec['Type']).trim() !== wantType) return;
    if (wantStatus && String(rec['Status']).trim() !== wantStatus) return;
    rows.push(rec);
  });

  // 'Date Added' comes back as 'yyyy-MM-dd HH:mm:ss', which sorts as text; a row without one keeps
  // its sheet position rather than jumping to the top.
  rows.sort(function (a, b) {
    const x = String(a[CS_RETURNS_ADDED_COL] || ''), y = String(b[CS_RETURNS_ADDED_COL] || '');
    if (x === y) return (Number(b._row) || 0) - (Number(a._row) || 0);
    return x < y ? 1 : -1;
  });

  return {
    ok: true, account: account, tab: read.tab, columns: CS_RETURNS_COLS,
    rows: csOut_(rows, ctx), count: rows.length, truncated: !!read.truncated,
    types: CS_RETURNS_TYPES, statuses: CS_RETURNS_STATUSES,
    // §10.3 says the automation writes this tab; §15 lets CS annotate it. Both are true, and these
    // three columns are the whole of what a person may touch here.
    annotatable: CS_RETURNS_WRITABLE,
  };
}

function csReadReturns_(account) {
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'order_processing', tab: [CS_RETURNS_TAB],
    expect: CS_RETURNS_COLS, limit: CS_RETURNS_LIMIT,
  });
  if (!read.ok) return read;
  if (csNorm_(read.tab) !== csNorm_(CS_RETURNS_TAB)) return { ok: false, reason: 'no such tab' };
  const fields = csResolveFields_(read.headers, CS_RETURNS_COLS.map(function (h) { return { key: h, exact: [h] }; }));
  if (!fields[CS_RETURNS_ORDER_COL]) return { ok: false, reason: 'no such tab' };
  read.fields = fields;
  return read;
}

function csReturnRow_(rec, fields) {
  const out = { _row: rec._row };
  // 'Day Tab' is genuinely mixed-type in the workbook — a real date on single-day tabs, the literal
  // tab name ('5-6 JULY') on the combined ones. It is passed through exactly as the sheet holds it.
  CS_RETURNS_COLS.forEach(function (h) { out[h] = csCell_(rec, fields, h); });
  return out;
}

/** §15 annotate. Only Status, Notes and Last Updated; the row is located by 'Order No' and an order
 * that appears twice (a return AND an INAD) needs the row said explicitly. */
function csAnnotateReturn_(payload, ctx, account) {
  const order = csText_(payload.order_no, 60);
  if (!order) throw new Error('order_no required');

  const values = {};
  if (payload.status !== undefined && String(payload.status).trim() !== '') {
    values[CS_RETURNS_STATUS_COL] = csEnum_(payload.status, CS_RETURNS_STATUSES, 'return status');
  }
  if (payload.note !== undefined) values[CS_RETURNS_NOTES_COL] = csText_(payload.note, CS_MAX_TEXT, true);
  if (!Object.keys(values).length) throw new Error('nothing to annotate');

  const read = csReadReturns_(account);
  if (!read.ok) return { ok: false, account: account, reason: String(read.reason || 'not connected yet') };

  const want = csOrderKey_(order);
  const hits = [];
  read.rows.forEach(function (r) {
    if (csOrderKey_(csCell_(r, read.fields, CS_RETURNS_ORDER_COL)) === want) hits.push(r);
  });
  if (!hits.length) return { ok: false, account: account, reason: 'that order is not in this feed' };

  const forced = Number(payload.row) || 0;
  let rec = hits[0];
  if (hits.length > 1) {
    if (!forced) {
      return {
        ok: false, account: account, reason: 'this order has more than one row in the feed — choose a row',
        rows: hits.map(function (r) {
          return { _row: r._row, 'Type': String(csCell_(r, read.fields, 'Type')), 'Status': String(csCell_(r, read.fields, CS_RETURNS_STATUS_COL)) };
        }),
      };
    }
    rec = null;
    hits.forEach(function (r) { if (r._row === forced) rec = r; });
    if (!rec) return { ok: false, account: account, reason: 'that row does not carry this order number' };
  } else if (forced && forced !== rec._row) {
    return { ok: false, account: account, reason: 'that row does not carry this order number' };
  }

  const before = csReturnRow_(rec, read.fields);
  // The automation stamps this column with a datetime; a portal annotation stamps it with the
  // portal's own PKT clock (now_()), so the two are never confused for one another.
  if (read.fields[CS_RETURNS_UPDATED_COL]) values[CS_RETURNS_UPDATED_COL] = now_();

  let res = null;
  try {
    res = bridgeUpdateRow_(
      { scope: 'account', account: account, kind: 'order_processing', tab: [read.tab], expect: CS_RETURNS_COLS, row: rec._row },
      read.fields[CS_RETURNS_ORDER_COL].header, csCell_(rec, read.fields, CS_RETURNS_ORDER_COL),
      values, CS_RETURNS_WRITABLE, ctx.ident.email);
  } catch (e) {
    logActivity_(ctx.ident.email, 'CS_RETURN_ANNOTATE_REFUSED', account + '!' + read.tab + '!' + rec._row, '', '',
      String((e && e.message) || e));
    return { ok: false, account: account, reason: 'the sheet refused this write' };
  }
  if (!res.ok) return { ok: false, account: account, reason: String(res.reason || 'not connected yet') };

  logActivity_(ctx.ident.email, 'CS_RETURN_ANNOTATE', account + '!' + read.tab + '!' + rec._row,
    String(before[CS_RETURNS_STATUS_COL] || '') + ' | ' + String(before[CS_RETURNS_NOTES_COL] || '').slice(0, 120),
    String(values[CS_RETURNS_STATUS_COL] === undefined ? before[CS_RETURNS_STATUS_COL] : values[CS_RETURNS_STATUS_COL]) + ' | '
    + String(values[CS_RETURNS_NOTES_COL] === undefined ? before[CS_RETURNS_NOTES_COL] : values[CS_RETURNS_NOTES_COL]).slice(0, 120),
    'order ' + order + ' · ' + (res.shadow ? 'shadow' : 'written'));

  const after = {};
  CS_RETURNS_COLS.forEach(function (h) { after[h] = values[h] !== undefined ? values[h] : before[h]; });
  after._row = rec._row;
  return {
    ok: true, annotated: true, shadow: !!res.shadow, account: account, tab: read.tab,
    order_no: order, row: rec._row, values: values, item: csOut_(after, ctx),
    written: res.written || [], unchanged: res.unchanged || [], skipped: res.skippedMissing || [],
  };
}

// ---------- §8.7 the CS live-data upkeep ----------
/** No item id (or nothing to change) reads the account's live listings — the figures a case is
 * costed against. An item id with a cost or a campaign writes: the cost through this module's
 * one-column whitelist, the campaign through Advertising.gs so §14 and CAMPAIGN_LOG stay in one
 * place. */
function actionCsLiveData_(payload, ctx) {
  csAssertCs_(ctx);
  const account = csRequireAccount_(payload, ctx);
  const hasCost = payload.aliexpress_cost !== undefined && String(payload.aliexpress_cost).trim() !== '';
  const hasCampaign = payload.campaign !== undefined && String(payload.campaign).trim() !== '';
  const itemId = payload.item_id === undefined || String(payload.item_id).trim() === '' ? '' : csItemId_(payload.item_id);
  if (!itemId || (!hasCost && !hasCampaign)) return csLiveRead_(account, ctx, itemId);
  return csLiveWrite_(payload, ctx, account, itemId, hasCost, hasCampaign);
}

function csLiveRead_(account, ctx, itemId) {
  const read = csReadMain_(account);
  if (!read.ok) {
    return {
      ok: false, account: account, reason: String(read.reason || 'not connected yet'),
      columns: CS_MAIN_COLS, campaigns: CS_CAMPAIGNS,
    };
  }
  const rows = [];
  read.rows.forEach(function (r) {
    const row = csMainRow_(r, read.fields);
    if (!String(row[CS_MAIN_TITLE] || '').trim() && !String(row[CS_MAIN_ITEM] || '').trim()) return;
    if (itemId && csItemKey_(row[CS_MAIN_ITEM]) !== itemId) return;
    rows.push(row);
  });
  return {
    ok: true, account: account, tab: read.tab, columns: CS_MAIN_COLS,
    rows: csOut_(rows, ctx), count: rows.length, truncated: !!read.truncated,
    campaigns: CS_CAMPAIGNS, writable: CS_LIVE_WRITABLE,
    // The manager's campaign column is writable through the advertising module, not this one.
    campaign_column: CS_MAIN_CAMPAIGN,
    profit_formula: 'the sheet\'s own cell: ROUND(0.8 × (' + CS_MAIN_EARNING + ' − ' + CS_MAIN_COST + '), 2)',
  };
}

function csReadMain_(account) {
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'central', tab: CS_MAIN_TAB,
    expect: CS_MAIN_COLS, limit: CS_MAIN_LIMIT,
  });
  if (!read.ok) return read;
  const fields = csResolveFields_(read.headers, CS_MAIN_COLS.map(function (h) { return { key: h, exact: [h] }; }));
  if (!fields[CS_MAIN_ITEM] || !fields[CS_MAIN_TITLE]) return { ok: false, reason: 'no such tab' };
  read.fields = fields;
  return read;
}

function csMainRow_(rec, fields) {
  const out = { _row: rec._row };
  CS_MAIN_COLS.forEach(function (h) { if (fields[h]) out[h] = csCell_(rec, fields, h); });
  // '↳' rows are the highest-priced variation of the row above and repeat its item number; they are
  // kept (a case may be about the variation that sold) and flagged so nothing mistakes them for a
  // second listing.
  out.variation = String(out[CS_MAIN_TITLE] || '').charAt(0) === '↳';
  return out;
}

function csFindMainRow_(read, itemId) {
  let hit = null;
  read.rows.forEach(function (r) {
    if (hit) return;
    if (csItemKey_(csCell_(r, read.fields, CS_MAIN_ITEM)) !== itemId) return;
    if (String(csCell_(r, read.fields, CS_MAIN_TITLE)).charAt(0) === '↳') return;
    hit = r;
  });
  return hit ? csMainRow_(hit, read.fields) : null;
}

function csLiveWrite_(payload, ctx, account, itemId, hasCost, hasCampaign) {
  const read = csReadMain_(account);
  if (!read.ok) return { ok: false, account: account, reason: String(read.reason || 'not connected yet') };
  const before = csFindMainRow_(read, itemId);
  if (!before) return { ok: false, account: account, item_id: itemId, reason: 'item not on the Main Sheet' };

  const note = csText_(payload.note, 500);
  const out = {
    ok: true, account: account, item_id: itemId, row: before._row,
    listing_title: String(before[CS_MAIN_TITLE] || ''), changed: false, notified_to: [],
  };

  if (hasCost) {
    const cost = csMoneyValue_(payload.aliexpress_cost, CS_MAIN_COST);
    const oldCost = csNumberOrNull_(before[CS_MAIN_COST]);
    if (oldCost !== null && csRound2_(oldCost) === cost) {
      out.cost = { changed: false, already_set: true, aliexpress_cost: cost };
    } else {
      const values = {};
      values[CS_MAIN_COST] = cost;
      let res = null;
      try {
        // '↳' variation sub-rows repeat the parent's item number, so the main row found above is
        // targeted explicitly — an unqualified match would be ambiguous and refuse to write.
        res = bridgeUpdateRow_(
          { scope: 'account', account: account, kind: 'central', tab: [read.tab], expect: CS_MAIN_COLS, row: before._row },
          read.fields[CS_MAIN_ITEM].header, itemId, values, CS_LIVE_WRITABLE, ctx.ident.email);
      } catch (e) {
        logActivity_(ctx.ident.email, 'CS_LIVE_COST_REFUSED', account + '!' + itemId, '', '', String((e && e.message) || e));
        return { ok: false, account: account, item_id: itemId, reason: 'the sheet refused this write' };
      }
      if (!res.ok) return { ok: false, account: account, item_id: itemId, reason: String(res.reason || 'not connected yet') };

      out.changed = true;
      out.cost = {
        changed: true, shadow: !!res.shadow, aliexpress_cost: cost,
        previous_cost: oldCost, profit_before: csSheetProfit_(before[CS_MAIN_EARNING], oldCost),
        profit_after: csSheetProfit_(before[CS_MAIN_EARNING], cost),
      };
      logActivity_(ctx.ident.email, 'CS_LIVE_COST', account + '!' + itemId,
        oldCost === null ? '' : String(oldCost), String(cost),
        (note ? note + ' · ' : '') + (res.shadow ? 'shadow' : 'written'));
      out.notified_to = csNotifyCostChange_(ctx, account, itemId, before, out.cost, note);
    }
  }

  if (hasCampaign) {
    const campaign = csEnum_(payload.campaign, CS_CAMPAIGNS, 'campaign');
    if (typeof actionSetCampaign_ !== 'function') {
      out.campaign = { ok: false, reason: 'the advertising module is not deployed' };
    } else {
      // §14 'by CS record-update → Zain+Mgmt' lives inside actionSetCampaign_ together with
      // CAMPAIGN_LOG; calling it is what keeps one campaign change from being logged twice.
      const res = actionSetCampaign_({ account: account, item_id: itemId, campaign: campaign, comment: note }, ctx);
      out.campaign = res;
      if (res && res.changed) {
        out.changed = true;
        (res.notified_to || []).forEach(function (t) { if (out.notified_to.indexOf(t) < 0) out.notified_to.push(t); });
      }
    }
  }

  return out;
}

/** §14: a CS record-update that changes what an advertised listing costs is campaign-relevant —
 * the margin the campaign is running on just moved — so Advertising and Management are both told.
 * An Organic listing has no campaign to inform, so it stays a log line. */
function csNotifyCostChange_(ctx, account, itemId, before, cost, note) {
  const campaign = String(before[CS_MAIN_CAMPAIGN] || '').trim() || String(before[CS_MAIN_CURRENT_CAMPAIGN] || '').trim();
  if (!campaign || csNorm_(campaign) === csNorm_(CS_CAMPAIGN_UNPAID)) return [];

  const who = String(ctx.user.name || ctx.ident.name || ctx.ident.email);
  const message = who + ' (' + String(ctx.user.role || 'CS') + ') updated the AliExpress cost of item ' + itemId + ' on ' + account
    + ' from ' + (cost.previous_cost === null ? 'blank' : csGbp_(cost.previous_cost)) + ' to ' + csGbp_(cost.aliexpress_cost)
    + ' — it is on ' + campaign + '. The sheet now shows a profit of '
    + (cost.profit_after === null ? 'no figure yet' : csGbp_(cost.profit_after)) + '.'
    + (note ? ' — ' + note : '')
    + (cost.shadow ? ' (recorded in the portal — the live sheet write is held by the pilot gate.)' : '');

  const labels = [];
  const advertising = csAdvertisingEmails_(ctx.ident.email);
  advertising.forEach(function (e) { notify_(e, 'Live data changed by CS', message, CS_LIVE_REF + itemId); });
  if (advertising.length) labels.push('Advertising');
  notifyManagement_('Live data changed by CS', message, CS_LIVE_REF + itemId);
  labels.push('Management');
  logActivity_(ctx.ident.email, 'CS_LIVE_NOTIFY', account + '!' + itemId, '', labels.join(', '), campaign);
  return labels;
}

/** What the Main Sheet's own Profit cell will show after a cost change — a preview, never a write:
 * that column is a formula and belongs to the sheet. */
function csSheetProfit_(orderEarning, aliCost) {
  const oe = csNumberOrNull_(orderEarning);
  const cost = csNumberOrNull_(aliCost);
  if (oe === null || cost === null) return null;
  return csRound2_(CS_PROFIT_HAIRCUT * (oe - cost));
}

// ---------- values ----------
function csNorm_(s) {
  if (s === null || s === undefined) return '';
  const raw = s instanceof Date ? csCellText_(s) : String(s);
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function csCellText_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Karachi', 'yyyy-MM-dd HH:mm:ss');
  return String(v);
}

const CS_CTRL_RE = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

/** Control characters out, newlines kept only where the column is a paragraph (an address, a note).
 * A leading '=' is refused here so the person gets a sentence instead of the bridge's throw. */
function csText_(v, max, keepNewlines) {
  let s = csCellText_(v).replace(CS_CTRL_RE, '');
  s = keepNewlines ? s.replace(/\r\n?/g, '\n') : s.replace(/[\r\n\t]+/g, ' ');
  s = s.replace(/^\s+|\s+$/g, '').slice(0, max || CS_MAX_SHORT);
  if (s.charAt(0) === '=') throw new Error('a cell cannot start with = — the sheet would read it as a formula');
  return s;
}

function csEnum_(value, options, label) {
  const want = csNorm_(value);
  if (!want) throw new Error(label + ' required');
  for (let i = 0; i < options.length; i++) if (csNorm_(options[i]) === want) return options[i];
  throw new Error(label + ' must be one of: ' + options.join(', '));
}

/** Money columns are numeric (format 0.00) in every live workbook, so a typed '£4.20' is written as
 * 4.2 — a text cell there would break the sheet's own sums. */
function csMoneyValue_(value, label) {
  const n = Number(String(csCellText_(value)).replace(/[£,\s]/g, ''));
  if (!isFinite(n) || n < -CS_MAX_MONEY || n > CS_MAX_MONEY) throw new Error(label + ' needs a number');
  return csRound2_(n);
}

function csNumberOrNull_(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isFinite(value) ? csRound2_(value) : null;
  const m = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? csRound2_(Number(m[0])) : null;
}

function csRound2_(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

function csGbp_(n) {
  const v = csRound2_(n);
  return (v < 0 ? '-£' : '£') + Math.abs(v).toFixed(2);
}

/** eBay order numbers are NN-NNNNN-NNNNN text in every live sheet, but they are typed by hand on
 * this tab and pasted by the sync on the order tabs, so the shape is checked and the separators are
 * left exactly as the person wrote them. */
function csEbayOrderNumber_(value) {
  const s = csText_(value, 40).replace(/\s/g, '');
  if (!/^[0-9][0-9-]{6,29}$/.test(s)) throw new Error('an eBay order number looks like 24-14928-97018');
  return s;
}

function csAliOrderNumber_(value) {
  const s = csText_(value, 40).replace(/\s/g, '');
  if (!/^\d{8,24}$/.test(s)) throw new Error('an AliExpress order number is 8 to 24 digits');
  return s;
}

/** Order numbers are matched on their digits: one sheet holds '24-14928-97018' and another the same
 * order as '2414928 97018'. */
function csOrderKey_(v) {
  return String(v === null || v === undefined ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Item numbers sit in these sheets as text in some rows and as floats in others. */
function csItemKey_(value) {
  if (typeof value === 'number') return isFinite(value) ? String(Math.round(value)) : '';
  return String(value === null || value === undefined ? '' : value).trim().replace(/\s/g, '').replace(/\.0+$/, '');
}

function csItemId_(value) {
  const s = csItemKey_(value);
  if (!/^\d{9,15}$/.test(s)) throw new Error('invalid item_id');
  return s;
}

const ACTIONS_CS = {
  csCases:     [actionCsCases_, 'any'],       // gated to CS + Management inside, and refusals logged
  createCase:  [actionCreateCase_, 'any'],
  updateCase:  [actionUpdateCase_, 'any'],
  returnsFeed: [actionReturnsFeed_, 'any'],
  csLiveData:  [actionCsLiveData_, 'any'],
};
