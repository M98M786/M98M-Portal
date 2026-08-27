/** Phase R9 — REPLACEMENT ORDERS (26 Aug, owner). "A dashboard for CS, Team Lead, Management
 * and the Order Processor to create a replacement order, with preset reasons plus a custom
 * option that REQUIRES an explanation; a 'create a replacement for this order' button on
 * today's order rows; and the replacement written into that day's order sheet, clearly headed
 * as a Replacement Order."
 *
 * Where the row lands: TODAY's day tab in the account's live order book, appended through the
 * SheetBridge (header-addressed, whitelisted, lock-protected, formula-refusing, shadow-gated by
 * the same flag as every other business write). The row carries the ORIGINAL eBay order number —
 * so the processor's workspace shows it like any order to purchase — and the Item title cell
 * opens with the words REPLACEMENT ORDER plus the reason, which is the "clear heading". If the
 * day tab does not exist yet, the book's own standing REPLACEMENT tab (§10.4) is used instead;
 * if neither is reachable, the request is still recorded portal-side with the reason, never
 * lost. Every request also lands in the portal's own REPLACEMENTS tab — the desk's archive —
 * and letters Management plus the account's Order Processors. */

const REPL_RAISE_ROLES = ['CS', 'Team Lead', 'Order Processor'];        // + isMgmt_ (Management, Ops Head)
const REPL_VIEW_ROLES = ['CS', 'Team Lead', 'Order Processor', 'Sales Operations'];

/* The preset reasons, in the language CS actually uses. 'custom' demands an explanation —
 * a replacement with no written why is a cost nobody can audit. */
const REPL_REASONS = [
  { key: 'damaged',   label: 'Item arrived damaged / broken' },
  { key: 'wrong',     label: 'Wrong item received' },
  { key: 'lost',      label: 'Item lost in transit / never arrived' },
  { key: 'missing',   label: 'Missing parts or accessories' },
  { key: 'defective', label: 'Item defective / not working' },
  { key: 'variation', label: 'Wrong size, colour or variation sent' },
  { key: 'custom',    label: 'Custom reason (explanation required)' },
];

// The ONLY columns a replacement append may set on an order tab. 'Order number' (lowercase n,
// exact spelling) is eBay's col B — bridgeColumnFor_ resolves exact spelling first, so the
// AliExpress 'Order Number' can never be the target. Delivery Status 'Pending' puts the row
// straight into the processor's normal purchase flow.
const REPL_APPEND_COLS = ['Order number', 'Item title', 'Quantity', 'Variation details',
  'Ali Express Link', 'Delivery Status'];

const REPL_DB_TAB = 'REPLACEMENTS';
const REPL_DB_HEAD = ['repl_id', 'ts', 'account', 'order_number', 'item_title', 'quantity',
  'reason_key', 'reason_text', 'explanation', 'raised_by', 'sheet_tab', 'sheet_row', 'sheet_note'];

/** The desk's archive lives in the portal's OWN database spreadsheet; created on first use so
 * no setup run is needed. Never a business sheet. */
function replEnsureTab_() {
  const ss = getPortalDb_(false);
  let sh = ss.getSheetByName(REPL_DB_TAB);
  if (!sh) {
    sh = ss.insertSheet(REPL_DB_TAB);
    sh.appendRow(REPL_DB_HEAD);
  }
  return sh;
}

function replMayRaise_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || REPL_RAISE_ROLES.indexOf(String(ctx.user.role)) >= 0;
}
function replMayView_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || REPL_VIEW_ROLES.indexOf(String(ctx.user.role)) >= 0;
}

function replReason_(key) {
  for (let i = 0; i < REPL_REASONS.length; i++) { if (REPL_REASONS[i].key === key) return REPL_REASONS[i]; }
  return null;
}

function actionReplacementCreate_(payload, ctx) {
  if (!replMayRaise_(ctx)) throw authErr_('not permitted to raise a replacement order', ctx.ident.email);

  const account = ordersRequireAccount_(payload, ctx);
  const orderNo = String(payload.order_number || '').trim().slice(0, 40);
  if (!orderNo) throw new Error('the original eBay order number is required');

  const reason = replReason_(String(payload.reason_key || '').trim());
  if (!reason) throw new Error('choose a reason from the list');
  const explanation = String(payload.explanation || '').trim().slice(0, 400);
  if (reason.key === 'custom' && explanation.length < 10) {
    throw new Error('a custom reason requires an explanation (at least 10 characters)');
  }
  const reasonText = reason.key === 'custom' ? explanation : reason.label;

  const title = String(payload.item_title || '').trim().slice(0, 160);
  const qty = String(payload.quantity || '1').trim().slice(0, 10);
  const variation = String(payload.variation || '').trim().slice(0, 120);
  let ali = String(payload.ali_link || '').trim().slice(0, 500);
  if (ali && !/^https:\/\//i.test(ali)) ali = '';               // a link or nothing — never free text

  /* The row, exactly as it lands on the sheet. The heading the owner asked for is the first
   * thing in the title cell, with the reason beside it, so nobody can mistake the row. */
  const values = {
    'Order number': orderNo,
    'Item title': 'REPLACEMENT ORDER — ' + (title || 'see original order ' + orderNo) +
      ' — Reason: ' + reasonText,
    'Quantity': qty || '1',
    'Delivery Status': 'Pending',
  };
  if (variation) values['Variation details'] = variation;
  if (ali) values['Ali Express Link'] = ali;

  const today = ordersToday_();
  const dayCandidates = ordersDayTabCandidates_(today);

  /* dry_run: everything short of the physical write — resolves the book, opens the tab, plans
   * the exact cells — used to verify the path without leaving a row a processor might buy. */
  if (payload.dry_run === true || String(payload.dry_run || '') === 'true') {
    const id = bridgeResolveSheetId_('account', account, 'order_processing');
    if (!id) return { ok: false, dry_run: true, reason: 'order book not connected' };
    let open = bridgeOpenTab_(id, dayCandidates, ORDERS_EXPECT_DAY);
    let tabKind = 'day';
    if (open && !ordersTabIsCandidate_(open.sheet.getName(), dayCandidates)) open = null;
    if (!open) { open = bridgeOpenTab_(id, [ORDERS_REPLACEMENT_TAB], ORDERS_EXPECT_DAY); tabKind = 'replacement'; }
    if (!open) return { ok: false, dry_run: true, reason: 'no day tab for ' + today + ' and no REPLACEMENT tab' };
    const plan = bridgePlanCells_(open, values);
    return {
      ok: true, dry_run: true, account: account, tab: open.sheet.getName(), tab_kind: tabKind,
      would_write: plan.written, skipped_missing: plan.skippedMissing, values: values,
    };
  }

  /* The real write: today's day tab first — the owner's words — then the standing REPLACEMENT
   * tab when today's tab does not exist yet. bridgeAppendRow_ verifies the whitelist, takes the
   * script lock, appends past the last row, and logs every cell it wrote. */
  let res = null, tabNote = '';
  try {
    res = bridgeAppendRow_({ scope: 'account', account: account, kind: 'order_processing',
      tab: dayCandidates, expect: ORDERS_EXPECT_DAY }, values, REPL_APPEND_COLS, ctx.ident.email);
    if (res && res.ok && !ordersTabIsCandidate_(res.tab, dayCandidates)) {
      // containment-match landed on the wrong tab is impossible for an append that already
      // happened — but ordersTabIsCandidate_ runs BEFORE any real book would allow it via
      // bridgeOpenTab_'s unique-containment rule; belt and braces: report exactly where it went.
      tabNote = 'landed on ' + res.tab;
    }
  } catch (e) {
    res = { ok: false, reason: String(e && e.message || e).slice(0, 160) };
  }
  if (!res || res.ok === false) {
    const dayReason = String((res && res.reason) || 'day tab not reachable');
    try {
      res = bridgeAppendRow_({ scope: 'account', account: account, kind: 'order_processing',
        tab: [ORDERS_REPLACEMENT_TAB], expect: ORDERS_EXPECT_DAY }, values, REPL_APPEND_COLS, ctx.ident.email);
      tabNote = 'day tab: ' + dayReason + ' → wrote to REPLACEMENT tab';
    } catch (e2) {
      res = { ok: false, reason: dayReason + ' · REPLACEMENT: ' + String(e2 && e2.message || e2).slice(0, 120) };
    }
  }

  const wrote = !!(res && res.ok !== false && res.shadow !== true);
  const sheetTab = wrote || (res && res.shadow) ? String(res.tab || (res.wouldWrite && res.wouldWrite.tab) || '') : '';
  const sheetRow = wrote ? String(res.row || '') : (res && res.shadow ? 'shadow' : '');
  const sheetNote = res && res.ok === false ? String(res.reason || 'failed') : tabNote;

  // The desk's own record — written even when the sheet refused, so nothing raised is ever lost.
  const replId = 'RP' + Utilities.getUuid().slice(0, 8);
  replEnsureTab_().appendRow([replId, now_(), account, orderNo, title, qty, reason.key, reasonText,
    explanation, ctx.ident.email, sheetTab, sheetRow, sheetNote]);

  logActivity_(ctx.ident.email, 'REPLACEMENT_RAISED', account + '!' + orderNo, '', reasonText,
    sheetTab ? (sheetTab + (sheetRow ? ' row ' + sheetRow : '')) : sheetNote);

  const msg = '🔁 Replacement order raised — ' + account + ' · order ' + orderNo +
    ' · ' + reasonText + (sheetTab ? '. It is on the ' + sheetTab + ' tab, Pending — purchase it like any order.'
      : '. The sheet write did not land (' + sheetNote + ') — see the Replacement orders desk.');
  notifyManagement_('Replacement order', msg, 'repl:' + replId);
  const seen = {};
  readTab_('USERS').forEach(function (u) {
    if (MGMT_ROLES.indexOf(String(u.role)) >= 0) seen[normalizeEmail(u.email)] = 1;   // already lettered above
  });
  ordersProcessorsFor_(account).forEach(function (p) {
    if (seen[normalizeEmail(p.email)]) return;
    seen[normalizeEmail(p.email)] = 1;
    notify_(p.email, 'Replacement order', msg, 'repl:' + replId);
  });

  return {
    ok: res && res.ok !== false, repl_id: replId, account: account, order_number: orderNo,
    reason: reasonText, sheet_tab: sheetTab, sheet_row: sheetRow, shadow: !!(res && res.shadow),
    sheet_note: sheetNote,
  };
}

function actionReplacementList_(payload, ctx) {
  if (!replMayView_(ctx)) throw authErr_('not permitted to view replacement orders', ctx.ident.email);
  const sh = replEnsureTab_();
  const last = sh.getLastRow();
  const rows = [];
  if (last > 1) {
    const data = sh.getRange(2, 1, last - 1, REPL_DB_HEAD.length).getValues();
    data.forEach(function (r) {
      const o = {};
      REPL_DB_HEAD.forEach(function (h, i) { o[h] = r[i] instanceof Date ? now_() : String(r[i] === null || r[i] === undefined ? '' : r[i]); });
      rows.push(o);
    });
  }
  rows.sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); });
  return { rows: rows.slice(0, 300), total: rows.length, reasons: REPL_REASONS,
    can_raise: replMayRaise_(ctx) };
}

const ACTIONS_REPLACEMENTS = {
  replacementCreate: [actionReplacementCreate_, 'any'],
  replacementList:   [actionReplacementList_, 'any'],
};
