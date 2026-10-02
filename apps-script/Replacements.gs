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
  'reason_key', 'reason_text', 'explanation', 'raised_by', 'sheet_tab', 'sheet_row', 'sheet_note',
  /* 1 Oct (owner): "send the case to management, if the management approves, only then he can add
     the item for replacement, and send that replacement as a task to Wahab … Wahab will add the
     AliExpress cost, order id, everything … and the tracking on eBay … keep archive of everything." */
  'status', 'decided_by', 'decided_at', 'decision_note', 'task_id', 'variation', 'ali_link',
  'ali_cost', 'ali_order', 'tracking', 'fulfilled_by', 'fulfilled_at', 'fulfil_note'];
const REPL_ST = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED', ordered: 'ORDERED', tracked: 'TRACKED' };
const REPL_FULFIL_ROLES = ['Order Processor', 'Team Lead'];   // + isMgmt_

/** The desk's archive lives in the portal's OWN database spreadsheet; created on first use so
 * no setup run is needed. Columns added later are appended to the header row — never reordered,
 * so every reader addresses cells by header name. */
function replEnsureTab_() {
  const ss = getPortalDb_(false);
  let sh = ss.getSheetByName(REPL_DB_TAB);
  if (!sh) {
    try { sh = ss.insertSheet(REPL_DB_TAB); sh.appendRow(REPL_DB_HEAD); }
    catch (e) { sh = ss.getSheetByName(REPL_DB_TAB); if (!sh) throw e; }
  }
  const lastCol = sh.getLastColumn();
  const have = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  const missing = REPL_DB_HEAD.filter(function (h) { return have.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
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
function replMayDecide_(ctx) { return isMgmt_(ctx.user.role, ctx.ident.email); }
function replMayFulfil_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || REPL_FULFIL_ROLES.indexOf(String(ctx.user.role)) >= 0;
}

function replReason_(key) {
  for (let i = 0; i < REPL_REASONS.length; i++) { if (REPL_REASONS[i].key === key) return REPL_REASONS[i]; }
  return null;
}

/** Every row of the archive as header-keyed objects (dates to PKT ISO). */
function replRows_() {
  const sh = replEnsureTab_();
  const last = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (last < 2) return { sh: sh, head: [], rows: [] };
  const head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const data = sh.getRange(2, 1, last - 1, lastCol).getValues();
  const rows = data.map(function (r, i) {
    const o = { _row: i + 2 };
    head.forEach(function (h, k) {
      const v = r[k];
      o[h] = v instanceof Date ? Utilities.formatDate(v, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'") : String(v === null || v === undefined ? '' : v);
    });
    return o;
  });
  return { sh: sh, head: head, rows: rows };
}
function replFind_(replId) {
  const all = replRows_();
  for (let i = 0; i < all.rows.length; i++) if (String(all.rows[i].repl_id) === String(replId)) return { sh: all.sh, head: all.head, rec: all.rows[i] };
  return null;
}
/** Header-addressed patch of one archive row. */
function replPatch_(found, patch) {
  Object.keys(patch).forEach(function (h) {
    const c = found.head.indexOf(h);
    if (c < 0) return;
    found.sh.getRange(found.rec._row, c + 1).setValue(replCell_(patch[h]));
  });
}

/** Who gets the task: CONFIG names the handler (Wahab); an approved match wins, else the
 * account's own Order Processors, else any approved Order Processor. Shared with Refunds.gs. */
function replHandler_(cfgKey, account) {
  const want = normalizeEmail(getConfig(cfgKey) || CONFIG_DEFAULTS[cfgKey] || '');
  let hit = null;
  const procs = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status || '') !== 'approved') return;
    if (want && normalizeEmail(u.email) === want) hit = { email: String(u.email), name: String(u.name || u.email) };
    if (String(u.role || '') === 'Order Processor') procs.push({ email: String(u.email), name: String(u.name || u.email) });
  });
  if (hit) return hit;
  let scoped = [];
  try { scoped = typeof ordersProcessorsFor_ === 'function' ? ordersProcessorsFor_(account) : []; } catch (e) { scoped = []; }
  return scoped[0] || procs[0] || null;
}

/** Close the handler's task when the work is recorded on the desk — best-effort. */
function replCompleteTask_(taskId, note) {
  if (!taskId) return;
  try {
    const sh = tasksSheet_();
    const found = taskFind_(sh, taskId);
    if (!found || !found.rec || String(found.rec.status || '') === TASK_STATUS_COMPLETED) return;
    const stamp = now_();
    taskWrite_(sh, found, { status: TASK_STATUS_COMPLETED, submitted_at: stamp, decided_at: stamp, updated_at: stamp,
      submission_note: String(note || 'Recorded on the desk').slice(0, 300) });
    try { engineTaskPush_(taskId); } catch (e) {}
  } catch (e) { logActivity_('system', 'REPL_TASK_CLOSE_FAIL', String(taskId), '', '', String(e && e.message || e).slice(0, 120)); }
}

/** The order-book row — appended at APPROVAL time now (owner: only then the item is added).
 * Today's day tab first, the standing REPLACEMENT tab when today's tab does not exist yet. */
function replAppendToBook_(account, values, actor) {
  const today = ordersToday_();
  const dayCandidates = ordersDayTabCandidates_(today);
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
          tab: [open.sheet.getName()], expect: ORDERS_EXPECT_DAY }, values, REPL_APPEND_COLS, actor);
        if (!isFallback) tabNote = '';
      } catch (e) {
        res = { ok: false, reason: (tabNote ? tabNote + ' · ' : '') + String(e && e.message || e).slice(0, 140) };
      }
    }
  }
  const wrote = !!(res && res.ok !== false && res.shadow !== true);
  return {
    wrote: wrote, shadowed: !!(res && res.shadow),
    sheetTab: wrote || (res && res.shadow) ? String(res.tab || (res.wouldWrite && res.wouldWrite.tab) || '') : '',
    sheetRow: wrote ? String(res.row || '') : (res && res.shadow ? 'shadow' : ''),
    sheetNote: res && res.ok === false ? String(res.reason || 'failed') : tabNote,
  };
}

/** STEP 1 — a CS person raises it. Nothing touches an order book yet: the request waits for
 * Management on this desk. */
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
  const qty = String(qtyN >= 1 && qtyN <= 999 ? qtyN : 1);
  const variation = String(payload.variation || '').trim().slice(0, 120);
  let ali = String(payload.ali_link || '').trim().slice(0, 500);
  if (ali && !/^https:\/\//i.test(ali)) ali = '';

  const replId = 'RP' + Utilities.getUuid().slice(0, 8);
  const sh = replEnsureTab_();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const rec = { repl_id: replId, ts: now_(), account: account, order_number: orderNo, item_title: title, quantity: qty,
    reason_key: reason.key, reason_text: reasonText, explanation: explanation, raised_by: ctx.ident.email,
    status: REPL_ST.pending, variation: variation, ali_link: ali };
  sh.appendRow(head.map(function (h) { return replCell_(rec[h] === undefined ? '' : rec[h]); }));
  logActivity_(ctx.ident.email, 'REPLACEMENT_RAISED', account + '!' + orderNo, '', reasonText, 'awaiting management');
  try {
    notifyManagement_('Replacement needs approval',
      '🔁 Replacement requested — ' + account + ' · order ' + orderNo + ' · ' + reasonText +
      (title ? ' · ' + title.slice(0, 50) : '') + ' — by ' + (ctx.user.name || ctx.ident.email) + '. Approve or reject it on the Replacement orders desk.',
      'repl:' + replId);
  } catch (eN) { logActivity_('system', 'REPL_NOTIFY_FAIL', account + '!' + orderNo, '', '', String(eN && eN.message || eN).slice(0, 140)); }
  return { ok: true, repl_id: replId, account: account, order_number: orderNo, reason: reasonText, status: REPL_ST.pending };
}

/** STEP 2 — Management decides. APPROVE = the item is confirmed (title/variation/link/qty may be
 * corrected here), the row lands on the order book, and the task goes to Wahab. */
function actionReplacementDecide_(payload, ctx) {
  if (!replMayDecide_(ctx)) throw new Error(SAFE_ERROR_PREFIX + 'Management approves replacements');
  const found = replFind_(String(payload.repl_id || ''));
  if (!found) throw new Error(SAFE_ERROR_PREFIX + 'that request is not on the desk — refresh');
  const rec = found.rec;
  const st = String(rec.status || '');
  if (st && st !== REPL_ST.pending) throw new Error(SAFE_ERROR_PREFIX + 'already decided (' + st + ') — refresh');
  const decision = String(payload.decision || '').toUpperCase();
  const note = String(payload.note || '').trim().slice(0, 300);
  const stamp = now_();
  if (decision === 'REJECT') {
    if (note.length < 3) throw new Error(SAFE_ERROR_PREFIX + 'say why it is rejected');
    replPatch_(found, { status: REPL_ST.rejected, decided_by: ctx.ident.email, decided_at: stamp, decision_note: note });
    logActivity_(ctx.ident.email, 'REPLACEMENT_REJECTED', rec.account + '!' + rec.order_number, '', note, '');
    try { notify_(rec.raised_by, 'Replacement rejected', '⛔ Replacement for order ' + rec.order_number + ' (' + rec.account + ') was NOT approved: ' + note, 'repl:' + rec.repl_id); } catch (e) {}
    return { ok: true, repl_id: rec.repl_id, status: REPL_ST.rejected };
  }
  if (decision !== 'APPROVE') throw new Error(SAFE_ERROR_PREFIX + 'decision is APPROVE or REJECT');

  /* the item, as confirmed by management (edits override what CS typed) */
  const title = String(payload.item_title !== undefined ? payload.item_title : rec.item_title).trim().slice(0, 160);
  const variation = String(payload.variation !== undefined ? payload.variation : rec.variation).trim().slice(0, 120);
  const qtyN = Math.round(Number(String(payload.quantity !== undefined ? payload.quantity : rec.quantity || '1').trim()));
  const qty = String(qtyN >= 1 && qtyN <= 999 ? qtyN : 1);
  let ali = String(payload.ali_link !== undefined ? payload.ali_link : rec.ali_link).trim().slice(0, 500);
  if (ali && !/^https:\/\//i.test(ali)) ali = '';

  const values = {
    'Order number': rec.order_number,
    'Item title': 'REPLACEMENT ORDER — ' + (title || 'see original order ' + rec.order_number) + ' — Reason: ' + rec.reason_text,
    'Quantity': qty, 'Delivery Status': 'Pending',
  };
  if (variation) values['Variation details'] = variation;
  if (ali) values['Ali Express Link'] = ali;
  const book = replAppendToBook_(rec.account, values, ctx.ident.email);

  const handler = replHandler_('replacement_handler_email', rec.account);
  let taskId = '';
  if (handler) {
    try {
      taskId = listingCreateTask_(tasksSheet_(), {
        type: 'replacement_order', account: rec.account, item_id: '',
        title: 'Replacement order — ' + rec.order_number + (title ? ' · ' + title.slice(0, 60) : ''),
        details: listingLines_([
          'Original eBay order: ' + rec.order_number, 'Account: ' + rec.account,
          'Item: ' + (title || '—'), variation ? 'Variation: ' + variation : '', 'Quantity: ' + qty,
          ali ? 'AliExpress link: ' + ali : '', 'Reason: ' + rec.reason_text, rec.explanation ? 'CS note: ' + rec.explanation : '',
          note ? 'Management note: ' + note : '',
          book.sheetTab ? 'Order-book row: ' + book.sheetTab + (book.sheetRow && book.sheetRow !== 'shadow' ? ' row ' + book.sheetRow : '') : 'Order-book row: ' + (book.sheetNote || 'not written — add it by hand'),
          'Buy the replacement on AliExpress, then on the Replacement orders desk record the AliExpress cost, the AliExpress order id and, once it ships, the tracking number — and add that tracking on eBay against the original order. Submitting there completes this task.',
          '[REPL:' + rec.repl_id + ']',
        ].filter(String)),
        assigned_by: ctx.ident.email, assigned_to: handler.email, priority: 'high',
        deadline_pkt: taskPktIso_(new Date(Date.now() + 86400000)), stamp: stamp,
      });
      try { engineTaskPush_(taskId); } catch (e) {}
    } catch (eT) { logActivity_('system', 'REPL_TASK_FAIL', rec.repl_id, '', '', String(eT && eT.message || eT).slice(0, 140)); }
  }
  replPatch_(found, { status: REPL_ST.approved, decided_by: ctx.ident.email, decided_at: stamp, decision_note: note,
    task_id: taskId, item_title: title, variation: variation, quantity: qty, ali_link: ali,
    sheet_tab: book.sheetTab, sheet_row: book.sheetRow, sheet_note: book.sheetNote });
  logActivity_(ctx.ident.email, 'REPLACEMENT_APPROVED', rec.account + '!' + rec.order_number, '', handler ? handler.email : 'no handler',
    (book.sheetTab ? book.sheetTab + (book.sheetRow ? ' row ' + book.sheetRow : '') : book.sheetNote) + (taskId ? ' · task ' + taskId : ''));
  const msg = '✅ Replacement APPROVED — ' + rec.account + ' · order ' + rec.order_number + (title ? ' · ' + title.slice(0, 50) : '') +
    (handler ? ' — task sent to ' + handler.name : ' — NO Order Processor to task') +
    (book.shadowed ? ' (sheet in shadow mode: no row written)' : book.sheetTab ? ' · on the ' + book.sheetTab + ' tab' : ' · the sheet row did not land: ' + book.sheetNote);
  try {
    if (handler && taskId) notify_(handler.email, 'Task assigned', '🔁 ' + msg + '. Open My tasks.', 'task:' + taskId);
    notify_(rec.raised_by, 'Replacement approved', msg, 'repl:' + rec.repl_id);
    if (!handler) notifyManagement_('Replacement has no handler', msg, 'repl:' + rec.repl_id);
  } catch (e) {}
  return { ok: true, repl_id: rec.repl_id, status: REPL_ST.approved, task_id: taskId, assigned_to: handler ? handler.email : '',
    sheet_tab: book.sheetTab, sheet_row: book.sheetRow, shadow: book.shadowed, sheet_note: book.sheetNote };
}

/** STEP 3 — Wahab records the purchase (cost · AliExpress order id) and later the tracking;
 * tracking closes the task. Every field stays on the archive row for ever. */
function actionReplacementFulfil_(payload, ctx) {
  if (!replMayFulfil_(ctx)) throw new Error(SAFE_ERROR_PREFIX + 'Order Processors, the Team Lead and Management record replacements');
  const found = replFind_(String(payload.repl_id || ''));
  if (!found) throw new Error(SAFE_ERROR_PREFIX + 'that request is not on the desk — refresh');
  const rec = found.rec;
  const st = String(rec.status || '');
  if ([REPL_ST.approved, REPL_ST.ordered, REPL_ST.tracked].indexOf(st) < 0) throw new Error(SAFE_ERROR_PREFIX + 'this request is ' + (st || 'not approved yet') + ' — only approved ones are fulfilled');
  const costRaw = String(payload.ali_cost === undefined ? '' : payload.ali_cost).replace(/[£$,]/g, '').trim();
  const cost = costRaw === '' ? '' : Number(costRaw);
  if (cost !== '' && !(cost >= 0 && isFinite(cost))) throw new Error(SAFE_ERROR_PREFIX + 'the AliExpress cost must be a number');
  const aliOrder = String(payload.ali_order || '').trim().slice(0, 60);
  const tracking = String(payload.tracking || '').trim().slice(0, 80);
  const note = String(payload.note || '').trim().slice(0, 300);
  if (cost === '' && !aliOrder && !tracking && !note) throw new Error(SAFE_ERROR_PREFIX + 'record the cost, the AliExpress order id, the tracking — or a note');
  const stamp = now_();
  const patch = { fulfilled_by: ctx.ident.email, fulfilled_at: stamp };
  if (cost !== '') patch.ali_cost = cost;
  if (aliOrder) patch.ali_order = aliOrder;
  if (tracking) patch.tracking = tracking;
  if (note) patch.fulfil_note = note;
  const nextSt = tracking || rec.tracking ? REPL_ST.tracked : (aliOrder || rec.ali_order ? REPL_ST.ordered : st);
  patch.status = nextSt;
  replPatch_(found, patch);
  if (nextSt === REPL_ST.tracked) replCompleteTask_(rec.task_id, 'Replacement tracked: ' + (tracking || rec.tracking));
  logActivity_(ctx.ident.email, 'REPLACEMENT_FULFIL', rec.account + '!' + rec.order_number, st, nextSt,
    [cost !== '' ? 'cost £' + cost : '', aliOrder ? 'ali ' + aliOrder : '', tracking ? 'trk ' + tracking : ''].filter(String).join(' · '));
  const msg = '🔁 Replacement ' + (nextSt === REPL_ST.tracked ? 'SHIPPED — tracking ' + (tracking || rec.tracking) : 'ordered on AliExpress' + (aliOrder ? ' (' + aliOrder + ')' : '')) +
    ' — ' + rec.account + ' · order ' + rec.order_number + (cost !== '' ? ' · cost £' + cost : '') + ' — by ' + (ctx.user.name || ctx.ident.email);
  try { notifyManagement_('Replacement update', msg, 'repl:' + rec.repl_id); notify_(rec.raised_by, 'Replacement update', msg, 'repl:' + rec.repl_id); } catch (e) {}
  return { ok: true, repl_id: rec.repl_id, status: nextSt };
}

function actionReplacementList_(payload, ctx) {
  if (!replMayView_(ctx)) throw authErr_('not permitted to view replacement orders', ctx.ident.email);
  const all = replRows_();
  const rows = all.rows.map(function (o) { const c = {}; Object.keys(o).forEach(function (k) { if (k !== '_row') c[k] = o[k]; }); return c; });
  rows.sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); });
  const handler = replHandler_('replacement_handler_email', '');
  return { rows: rows.slice(0, 400), total: rows.length, reasons: REPL_REASONS,
    can_raise: replMayRaise_(ctx), can_decide: replMayDecide_(ctx), can_fulfil: replMayFulfil_(ctx),
    handler: handler ? { email: handler.email, name: handler.name } : null, statuses: REPL_ST };
}

const ACTIONS_REPLACEMENTS = {
  replacementCreate: [actionReplacementCreate_, 'any'],
  replacementDecide: [actionReplacementDecide_, 'any'],
  replacementFulfil: [actionReplacementFulfil_, 'any'],
  replacementList:   [actionReplacementList_, 'any'],
};
