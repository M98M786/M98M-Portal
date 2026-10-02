/** REFUNDS (1 Oct, owner). "Make a refund apply page where Customer Service agents add order
 * details, the comments and the reason to refund; it goes to management, and if management
 * approves the refund, the portal automatically sends that task to Wahab to process the refund."
 * Same shape as the Replacement orders desk: the request lives in the portal's own REFUNDS tab
 * (the archive), Management approves or rejects, approval raises a refund_process task for the
 * handler named in CONFIG (refund_handler_email), and the handler records the eBay refund here —
 * which completes the task. Amounts that eBay actually paid back are read separately from the
 * engine's Finances feed (refundsBoard); this desk is the request-and-approval trail. */

const REFUND_RAISE_ROLES = ['CS', 'Team Lead', 'Order Processor'];       // + isMgmt_
const REFUND_VIEW_ROLES = ['CS', 'Team Lead', 'Order Processor', 'Sales Operations'];
const REFUND_PROCESS_ROLES = ['Order Processor', 'Team Lead'];           // + isMgmt_
const REFUND_REASONS = [
  { key: 'not_received',     label: 'Item not received' },
  { key: 'damaged',          label: 'Arrived damaged' },
  { key: 'defective',        label: 'Item defective / not working' },
  { key: 'not_as_described', label: "Doesn't match description or photos" },
  { key: 'wrong_item',       label: 'Wrong item sent' },
  { key: 'late',             label: 'Delivered too late — buyer no longer wants it' },
  { key: 'cancelled',        label: 'Buyer cancelled before dispatch' },
  { key: 'partial',          label: 'Partial refund / goodwill' },
  { key: 'custom',           label: 'Custom reason (explanation required)' },
];
const REFUND_DB_TAB = 'REFUNDS';
const REFUND_DB_HEAD = ['refund_id', 'ts', 'account', 'order_number', 'buyer', 'item_title', 'amount',
  'reason_key', 'reason_text', 'comment', 'raised_by', 'status', 'decided_by', 'decided_at', 'decision_note',
  'task_id', 'processed_by', 'processed_at', 'processed_note', 'ebay_ref', 'amount_final'];
const REFUND_ST = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED', processed: 'PROCESSED' };

function refundEnsureTab_() {
  const ss = getPortalDb_(false);
  let sh = ss.getSheetByName(REFUND_DB_TAB);
  if (!sh) {
    try { sh = ss.insertSheet(REFUND_DB_TAB); sh.appendRow(REFUND_DB_HEAD); }
    catch (e) { sh = ss.getSheetByName(REFUND_DB_TAB); if (!sh) throw e; }
  }
  const lastCol = sh.getLastColumn();
  const have = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  const missing = REFUND_DB_HEAD.filter(function (h) { return have.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
  return sh;
}
function refundMayRaise_(ctx) { return isMgmt_(ctx.user.role, ctx.ident.email) || REFUND_RAISE_ROLES.indexOf(String(ctx.user.role)) >= 0; }
function refundMayView_(ctx) { return isMgmt_(ctx.user.role, ctx.ident.email) || REFUND_VIEW_ROLES.indexOf(String(ctx.user.role)) >= 0; }
function refundMayDecide_(ctx) { return isMgmt_(ctx.user.role, ctx.ident.email); }
function refundMayProcess_(ctx) { return isMgmt_(ctx.user.role, ctx.ident.email) || REFUND_PROCESS_ROLES.indexOf(String(ctx.user.role)) >= 0; }
function refundReason_(key) {
  for (let i = 0; i < REFUND_REASONS.length; i++) { if (REFUND_REASONS[i].key === key) return REFUND_REASONS[i]; }
  return null;
}
function refundRows_() {
  const sh = refundEnsureTab_();
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
function refundFind_(id) {
  const all = refundRows_();
  for (let i = 0; i < all.rows.length; i++) if (String(all.rows[i].refund_id) === String(id)) return { sh: all.sh, head: all.head, rec: all.rows[i] };
  return null;
}
function refundPatch_(found, patch) {
  Object.keys(patch).forEach(function (h) {
    const c = found.head.indexOf(h);
    if (c < 0) return;
    found.sh.getRange(found.rec._row, c + 1).setValue(replCell_(patch[h]));
  });
}
function refundMoney_(v) {
  const s = String(v === null || v === undefined ? '' : v).replace(/[£$,]/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return (isFinite(n) && n >= 0) ? Math.round(n * 100) / 100 : null;
}

/** STEP 1 — CS applies. */
function actionRefundRequestCreate_(payload, ctx) {
  if (!refundMayRaise_(ctx)) throw authErr_('not permitted to apply for a refund', ctx.ident.email);
  let account;
  try { account = ordersRequireAccount_(payload, ctx); }
  catch (e) { throw new Error(SAFE_ERROR_PREFIX + String(e && e.message || e)); }
  const orderNo = String(payload.order_number || '').trim().slice(0, 40);
  if (!orderNo) throw new Error(SAFE_ERROR_PREFIX + 'the eBay order number is required');
  const amount = refundMoney_(payload.amount);
  if (amount === null || amount <= 0) throw new Error(SAFE_ERROR_PREFIX + 'the refund amount (£) is required');
  const reason = refundReason_(String(payload.reason_key || '').trim());
  if (!reason) throw new Error(SAFE_ERROR_PREFIX + 'choose a reason from the list');
  const comment = String(payload.comment || '').trim().slice(0, 500);
  if (reason.key === 'custom' && comment.length < 10) throw new Error(SAFE_ERROR_PREFIX + 'a custom reason needs an explanation (at least 10 characters)');
  if (comment.length < 3) throw new Error(SAFE_ERROR_PREFIX + 'write the comment — what happened and why the refund');
  const reasonText = reason.key === 'custom' ? comment.slice(0, 120) : reason.label;
  const buyer = String(payload.buyer || '').trim().slice(0, 80);
  const title = String(payload.item_title || '').trim().slice(0, 160);
  const id = 'RF' + Utilities.getUuid().slice(0, 8);
  const sh = refundEnsureTab_();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const rec = { refund_id: id, ts: now_(), account: account, order_number: orderNo, buyer: buyer, item_title: title, amount: amount,
    reason_key: reason.key, reason_text: reasonText, comment: comment, raised_by: ctx.ident.email, status: REFUND_ST.pending };
  sh.appendRow(head.map(function (h) { return replCell_(rec[h] === undefined ? '' : rec[h]); }));
  logActivity_(ctx.ident.email, 'REFUND_REQUESTED', account + '!' + orderNo, '', '£' + amount.toFixed(2), reasonText);
  try {
    notifyManagement_('Refund needs approval',
      '💷 Refund requested — ' + account + ' · order ' + orderNo + ' · £' + amount.toFixed(2) + ' · ' + reasonText +
      (title ? ' · ' + title.slice(0, 50) : '') + ' — by ' + (ctx.user.name || ctx.ident.email) + ': "' + comment.slice(0, 120) + '". Approve or reject it on the Refunds desk.',
      'refund:' + id);
  } catch (e) { logActivity_('system', 'REFUND_NOTIFY_FAIL', account + '!' + orderNo, '', '', String(e && e.message || e).slice(0, 140)); }
  return { ok: true, refund_id: id, account: account, order_number: orderNo, amount: amount, status: REFUND_ST.pending };
}

/** STEP 2 — Management decides; approval becomes Wahab's task automatically. */
function actionRefundRequestDecide_(payload, ctx) {
  if (!refundMayDecide_(ctx)) throw new Error(SAFE_ERROR_PREFIX + 'Management approves refunds');
  const found = refundFind_(String(payload.refund_id || ''));
  if (!found) throw new Error(SAFE_ERROR_PREFIX + 'that request is not on the desk — refresh');
  const rec = found.rec;
  if (String(rec.status || '') !== REFUND_ST.pending) throw new Error(SAFE_ERROR_PREFIX + 'already decided (' + rec.status + ') — refresh');
  const decision = String(payload.decision || '').toUpperCase();
  const note = String(payload.note || '').trim().slice(0, 300);
  const stamp = now_();
  if (decision === 'REJECT') {
    if (note.length < 3) throw new Error(SAFE_ERROR_PREFIX + 'say why it is rejected');
    refundPatch_(found, { status: REFUND_ST.rejected, decided_by: ctx.ident.email, decided_at: stamp, decision_note: note });
    logActivity_(ctx.ident.email, 'REFUND_REJECTED', rec.account + '!' + rec.order_number, '', note, '');
    try { notify_(rec.raised_by, 'Refund rejected', '⛔ Refund for order ' + rec.order_number + ' (' + rec.account + ', £' + rec.amount + ') was NOT approved: ' + note, 'refund:' + rec.refund_id); } catch (e) {}
    return { ok: true, refund_id: rec.refund_id, status: REFUND_ST.rejected };
  }
  if (decision !== 'APPROVE') throw new Error(SAFE_ERROR_PREFIX + 'decision is APPROVE or REJECT');
  const approvedAmount = refundMoney_(payload.amount !== undefined && payload.amount !== '' ? payload.amount : rec.amount);
  if (approvedAmount === null || approvedAmount <= 0) throw new Error(SAFE_ERROR_PREFIX + 'the approved amount must be a number above 0');
  const handler = replHandler_('refund_handler_email', rec.account);
  let taskId = '';
  if (handler) {
    try {
      taskId = listingCreateTask_(tasksSheet_(), {
        type: 'refund_process', account: rec.account, item_id: '',
        title: 'Refund — ' + rec.order_number + ' · £' + approvedAmount.toFixed(2),
        details: listingLines_([
          'eBay order: ' + rec.order_number, 'Account: ' + rec.account, rec.buyer ? 'Buyer: ' + rec.buyer : '',
          rec.item_title ? 'Item: ' + rec.item_title : '', 'Amount to refund: £' + approvedAmount.toFixed(2),
          'Reason: ' + rec.reason_text, 'CS comment: ' + rec.comment, note ? 'Management note: ' + note : '',
          'Process the refund on eBay for this order, then record it on the Refunds desk (eBay refund reference + final amount) — that completes this task.',
          '[REFUND:' + rec.refund_id + ']',
        ].filter(String)),
        assigned_by: ctx.ident.email, assigned_to: handler.email, priority: 'high',
        deadline_pkt: taskPktIso_(new Date(Date.now() + 86400000)), stamp: stamp,
      });
      try { engineTaskPush_(taskId); } catch (e) {}
    } catch (eT) { logActivity_('system', 'REFUND_TASK_FAIL', rec.refund_id, '', '', String(eT && eT.message || eT).slice(0, 140)); }
  }
  refundPatch_(found, { status: REFUND_ST.approved, decided_by: ctx.ident.email, decided_at: stamp, decision_note: note, task_id: taskId, amount: approvedAmount });
  logActivity_(ctx.ident.email, 'REFUND_APPROVED', rec.account + '!' + rec.order_number, String(rec.amount), '£' + approvedAmount.toFixed(2), handler ? handler.email + (taskId ? ' · task ' + taskId : '') : 'no handler');
  const msg = '✅ Refund APPROVED — ' + rec.account + ' · order ' + rec.order_number + ' · £' + approvedAmount.toFixed(2) + ' · ' + rec.reason_text +
    (handler ? ' — task sent to ' + handler.name : ' — NO Order Processor to task');
  try {
    if (handler && taskId) notify_(handler.email, 'Task assigned', '💷 ' + msg + '. Open My tasks.', 'task:' + taskId);
    notify_(rec.raised_by, 'Refund approved', msg, 'refund:' + rec.refund_id);
    if (!handler) notifyManagement_('Refund has no handler', msg, 'refund:' + rec.refund_id);
  } catch (e) {}
  return { ok: true, refund_id: rec.refund_id, status: REFUND_ST.approved, task_id: taskId, assigned_to: handler ? handler.email : '', amount: approvedAmount };
}

/** STEP 3 — the handler records the eBay refund; the task completes. */
function actionRefundRequestProcess_(payload, ctx) {
  if (!refundMayProcess_(ctx)) throw new Error(SAFE_ERROR_PREFIX + 'Order Processors, the Team Lead and Management record refunds');
  const found = refundFind_(String(payload.refund_id || ''));
  if (!found) throw new Error(SAFE_ERROR_PREFIX + 'that request is not on the desk — refresh');
  const rec = found.rec;
  if (String(rec.status || '') !== REFUND_ST.approved) throw new Error(SAFE_ERROR_PREFIX + 'this request is ' + (rec.status || 'not approved') + ' — only approved refunds are processed');
  const ebayRef = String(payload.ebay_ref || '').trim().slice(0, 80);
  const finalAmount = refundMoney_(payload.amount_final !== undefined && payload.amount_final !== '' ? payload.amount_final : rec.amount);
  const note = String(payload.note || '').trim().slice(0, 300);
  if (finalAmount === null) throw new Error(SAFE_ERROR_PREFIX + 'the final refunded amount must be a number');
  const stamp = now_();
  refundPatch_(found, { status: REFUND_ST.processed, processed_by: ctx.ident.email, processed_at: stamp, processed_note: note, ebay_ref: ebayRef, amount_final: finalAmount });
  replCompleteTask_(rec.task_id, 'Refund processed £' + finalAmount.toFixed(2) + (ebayRef ? ' · ' + ebayRef : ''));
  logActivity_(ctx.ident.email, 'REFUND_PROCESSED', rec.account + '!' + rec.order_number, String(rec.amount), '£' + finalAmount.toFixed(2), ebayRef);
  const msg = '💷 Refund PROCESSED — ' + rec.account + ' · order ' + rec.order_number + ' · £' + finalAmount.toFixed(2) + (ebayRef ? ' · ' + ebayRef : '') + ' — by ' + (ctx.user.name || ctx.ident.email);
  try { notifyManagement_('Refund processed', msg, 'refund:' + rec.refund_id); notify_(rec.raised_by, 'Refund processed', msg, 'refund:' + rec.refund_id); } catch (e) {}
  return { ok: true, refund_id: rec.refund_id, status: REFUND_ST.processed, amount_final: finalAmount };
}

function actionRefundRequestList_(payload, ctx) {
  if (!refundMayView_(ctx)) throw authErr_('not permitted to view refunds', ctx.ident.email);
  const all = refundRows_();
  const rows = all.rows.map(function (o) { const c = {}; Object.keys(o).forEach(function (k) { if (k !== '_row') c[k] = o[k]; }); return c; });
  rows.sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); });
  const handler = replHandler_('refund_handler_email', '');
  return { rows: rows.slice(0, 500), total: rows.length, reasons: REFUND_REASONS,
    can_raise: refundMayRaise_(ctx), can_decide: refundMayDecide_(ctx), can_process: refundMayProcess_(ctx),
    handler: handler ? { email: handler.email, name: handler.name } : null, statuses: REFUND_ST };
}

const ACTIONS_REFUNDS = {
  refundRequestCreate:  [actionRefundRequestCreate_, 'any'],
  refundRequestDecide:  [actionRefundRequestDecide_, 'any'],
  refundRequestProcess: [actionRefundRequestProcess_, 'any'],
  refundRequestList:    [actionRefundRequestList_, 'any'],
};
