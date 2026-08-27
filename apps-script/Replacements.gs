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
    try {
      sh = ss.insertSheet(REPL_DB_TAB);
      sh.appendRow(REPL_DB_HEAD);
    } catch (e) {
      sh = ss.getSheetByName(REPL_DB_TAB);        // a concurrent first request created it — use theirs
      if (!sh) throw e;
    }
  }
  return sh;
}

/** A leading '=' (or '+') in a pasted value would land as a live formula via appendRow; stored
 * with a leading apostrophe it stays the text the person actually typed. */
function replCell_(v) {
  const s = String(v === null || v === undefined ? '' : v);
  return /^[=+]/.test(s) ? "'" + s : s;
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

  let account;
  try { account = ordersRequireAccount_(payload, ctx); }
  catch (e) { throw new Error(SAFE_ERROR_PREFIX + String(e && e.message || e)); }
  const orderNo = String(payload.order_number || '').trim().slice(0, 40);
  if (!orderNo) throw new Error(SAFE_ERROR_PREFIX + 'the original eBay order number is required');

  const reason = replReason_(String(payload.reason_key || '').trim());
  if (!reason) throw new Error(SAFE_ERROR_PREFIX + 'choose a reason from the list');
  const explanation = String(payload.explanation || '').trim().slice(0, 400);
  if (reason.key === 'custom' && explanation.length < 10) {
    throw new Error(SAFE_ERROR_PREFIX + 'a custom reason requires an explanation (at least 10 characters)');
  }
  const reasonText = reason.key === 'custom' ? explanation : reason.label;

  const title = String(payload.item_title || '').trim().slice(0, 160);
  const qtyN = Math.round(Number(String(payload.quantity || '1').trim()));
  const qty = String(qtyN >= 1 && qtyN <= 999 ? qtyN : 1);      // a count, not free text
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
   * tab when today's tab does not exist yet. The tab is resolved and CHECKED AGAINST THE
   * CANDIDATES before anything is appended — bridgeOpenTab_'s unique-containment matching must
   * never let '27 August' land a row on some archival '27 August OLD' tab — and only the
   * verified exact name is handed to bridgeAppendRow_, which re-opens it, verifies the
   * whitelist, takes the script lock, appends past the last row, and logs every cell. */
  let res = null, tabNote = '';
  const bookId = bridgeResolveSheetId_('account', account, 'order_processing');
  if (!bookId) {
    res = { ok: false, reason: 'order book not connected' };
  } else {
    let open = null, isFallback = false;
    try { open = bridgeOpenTab_(bookId, dayCandidates, ORDERS_EXPECT_DAY); } catch (e) { open = null; }
    if (open && !ordersTabIsCandidate_(open.sheet.getName(), dayCandidates)) {
      tabNote = 'day candidates matched "' + open.sheet.getName() + '" — refused; ';
      open = null;
    }
    if (!open) {
      try { open = bridgeOpenTab_(bookId, [ORDERS_REPLACEMENT_TAB], ORDERS_EXPECT_DAY); } catch (e) { open = null; }
      if (open) { isFallback = true; tabNote += 'no day tab for ' + today + ' → REPLACEMENT tab'; }
    }
    if (!open) {
      res = { ok: false, reason: (tabNote || '') + 'no day tab for ' + today + ' and no REPLACEMENT tab' };
    } else {
      try {
        res = bridgeAppendRow_({ scope: 'account', account: account, kind: 'order_processing',
          tab: [open.sheet.getName()], expect: ORDERS_EXPECT_DAY }, values, REPL_APPEND_COLS, ctx.ident.email);
        if (!isFallback) tabNote = '';
      } catch (e) {
        res = { ok: false, reason: (tabNote ? tabNote + ' · ' : '') + String(e && e.message || e).slice(0, 140) };
      }
    }
  }

  const wrote = !!(res && res.ok !== false && res.shadow !== true);
  const sheetTab = wrote || (res && res.shadow) ? String(res.tab || (res.wouldWrite && res.wouldWrite.tab) || '') : '';
  const sheetRow = wrote ? String(res.row || '') : (res && res.shadow ? 'shadow' : '');
  const sheetNote = res && res.ok === false ? String(res.reason || 'failed') : tabNote;

  // The desk's own record — written even when the sheet refused, so nothing raised is ever lost.
  // replCell_ keeps a pasted '=…' as text, never as a live formula in the portal DB.
  const replId = 'RP' + Utilities.getUuid().slice(0, 8);
  replEnsureTab_().appendRow([replId, now_(), account, orderNo, title, qty, reason.key, reasonText,
    explanation, ctx.ident.email, sheetTab, sheetRow, sheetNote].map(replCell_));

  logActivity_(ctx.ident.email, 'REPLACEMENT_RAISED', account + '!' + orderNo, '', reasonText,
    sheetTab ? (sheetTab + (sheetRow ? ' row ' + sheetRow : '')) : sheetNote);

  const shadowed = !!(res && res.shadow);
  const msg = '🔁 Replacement order raised — ' + account + ' · order ' + orderNo +
    ' · ' + reasonText + (
      shadowed ? '. Recorded (write shadow mode) — it will be written when sheet writes go live.'
      : sheetTab ? '. It is on the ' + sheetTab + ' tab, Pending — purchase it like any order.'
      : '. The sheet write did not land (' + sheetNote + ') — see the Replacement orders desk.');
  /* The sheet row is already appended; a letters hiccup (missing tab, quota) must not turn a
   * successful raise into a thrown request. Logged, never rethrown. */
  try {
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
  } catch (eN) {
    logActivity_('system', 'REPL_NOTIFY_FAIL', account + '!' + orderNo, '', '', String(eN && eN.message || eN).slice(0, 140));
  }

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
      REPL_DB_HEAD.forEach(function (h, i) {
        o[h] = r[i] instanceof Date
          ? Utilities.formatDate(r[i], 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'")
          : String(r[i] === null || r[i] === undefined ? '' : r[i]);
      });
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
