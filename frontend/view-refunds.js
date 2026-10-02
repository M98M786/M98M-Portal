/* view-refunds.js — the Refunds desk (1 Oct, owner). Two things on one page:
 *  · the request trail — a CS agent APPLIES (order, amount, reason, comment) → Management APPROVES
 *    or rejects → approval becomes the handler's task by itself → the handler RECORDS the eBay
 *    refund, which completes the task. Backend: refundRequestCreate · refundRequestDecide ·
 *    refundRequestProcess · refundRequestList (sheet).
 *  · the money — every refund eBay actually paid back, date to date, account to account, this
 *    month against last, with the history of each one. Backend: refundsBoard (engine, Finances
 *    feed). This file is served from a public URL: no staff name, email or account name lives in it. */
(function () {
  'use strict';

  var RF_ROLES = ['CS', 'Team Lead', 'Management', 'Ops Head', 'Order Processor', 'Sales Operations'];
  var RF = { tab: 'apply', data: null, seq: 0, board: null, from: '', to: '', acct: '' };

  VIEW_CSS.push(
    '.rf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}' +
    '.rf-tab{border:1px solid var(--gold-line);background:var(--panel);color:var(--text-2);border-radius:99px;padding:6px 13px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}' +
    '.rf-tab.on{border-color:var(--gold-a);color:var(--gold-a)}' +
    '.rf-tab b{font-variant-numeric:tabular-nums;margin-left:4px}' +
    '.rf-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}' +
    '.rf-in,.rf-sel,.rf-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.rf-ta{min-height:74px;resize:vertical}' +
    '.rf-lab{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:6px}' +
    '.rf-req::after{content:" *";color:var(--bad)}' +
    '.rf-note{font-size:12px;font-weight:600;color:var(--text-3);margin-top:8px}' +
    '.rf-ok{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--ok-soft);border:1px solid rgba(63,207,142,.4);font-weight:700;font-size:13px;color:var(--ok)}' +
    '.rf-bad{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--warn-soft);border:1px solid rgba(255,159,67,.45);font-weight:700;font-size:13px;color:var(--warn)}' +
    '.rf-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel)}' +
    '.rf-row .t{font-weight:800;font-size:13.5px}.rf-row .m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.rf-row .c{font-size:12.5px;color:var(--text-2);font-weight:600;margin-top:6px;white-space:pre-wrap}' +
    '.rf-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}' +
    '.rf-act input{padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.rf-pill{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:7px;border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}' +
    '.rf-pill.PENDING{color:var(--warn);border-color:rgba(255,159,67,.5)}.rf-pill.APPROVED{color:var(--blue-2,#6fa8ff)}.rf-pill.PROCESSED{color:var(--ok);border-color:rgba(63,207,142,.4)}.rf-pill.REJECTED{color:var(--bad)}' +
    '.rf-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:14px}' +
    '.rf-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.rf-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rf-t b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.rf-t .s{font-size:11px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.rf-t.bad b{color:var(--bad)}.rf-t.ok b{color:var(--ok)}' +
    '.rf-days{display:flex;gap:3px;align-items:flex-end;height:96px;margin:6px 0 14px;overflow-x:auto}' +
    '.rf-day{flex:1 0 14px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:14px}' +
    '.rf-day i{display:block;width:100%;background:var(--bad);opacity:.75;border-radius:3px 3px 0 0;min-height:1px}' +
    '.rf-day span{font-size:8.5px;color:var(--text-3);font-weight:700;margin-top:3px;white-space:nowrap}' +
    '.rf-approx{color:var(--text-3);font-weight:800;cursor:help}'
  );

  function rfS(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function rfAttr(v) { return esc(rfS(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function rfM(v) { var n = Number(v) || 0; return (n < 0 ? '-£' : '£') + Math.abs(n).toFixed(2); }
  function rfWho(e) { return esc(rfS(e).split('@')[0]); }
  function rfYmd(d) { return d.toISOString().slice(0, 10); }
  function rfRole() { return (STATE.user && STATE.user.role) || ''; }
  function rfMoneyOk() { return RF_ROLES.indexOf(rfRole()) >= 0 || !!(STATE.user && STATE.user.super); }

  VIEWS.refunds = {
    label: 'Refunds',
    icon: '<path d="M3 10h18"/><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h3"/>',
    roles: RF_ROLES,
    order: 3.65,
    render: function () {
      return '<div class="hgroup enter d1"><h1><span class="goldtext">Refunds</span></h1>' +
          '<span class="sub">apply → Management approves → the handler gets the task and records the eBay refund · and the money: every refund paid back, date to date, account to account</span>' +
          '<button class="minibtn" id="rfRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="rf-tabs enter d1" id="rfTabs"></div>' +
        '<div id="rfBody" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () {
      $('rfRefresh').onclick = function () { RF.board = null; rfLoad(); };
      rfLoad();
    }
  };

  function rfTabs() {
    var host = $('rfTabs'), d = RF.data || {}, rows = d.rows || [];
    if (!host) { return; }
    var n = function (st) { return rows.filter(function (r) { return rfS(r.status) === st; }).length; };
    var tabs = [['apply', 'Apply', 0], ['approve', 'Awaiting approval', n('PENDING')], ['process', 'To process', n('APPROVED')],
      ['money', 'Amounts & history', 0], ['all', 'Every request', rows.length]];
    host.innerHTML = tabs.map(function (t) {
      return '<button class="rf-tab' + (RF.tab === t[0] ? ' on' : '') + '" data-rf-tab="' + t[0] + '">' + t[1] + (t[2] ? '<b>' + t[2] + '</b>' : '') + '</button>';
    }).join('');
    host.querySelectorAll('[data-rf-tab]').forEach(function (b) {
      b.onclick = function () { RF.tab = this.getAttribute('data-rf-tab'); rfTabs(); rfPaint(); };
    });
  }

  function rfLoad() {
    var seq = ++RF.seq;
    api('refundRequestList', {}).then(function (d) {
      if (seq !== RF.seq) { return; }
      RF.data = d || {};
      if (RF.tab === 'apply' && !RF.data.can_raise) { RF.tab = RF.data.can_decide ? 'approve' : (RF.data.can_process ? 'process' : 'money'); }
      rfTabs(); rfPaint();
    }).catch(function (e) {
      if (seq !== RF.seq) { return; }
      setHTML('rfBody', '<div class="rf-bad">Could not load: ' + esc(e.message) + ' — press Refresh.</div>');
    });
  }

  function rfPaint() {
    var box = $('rfBody');
    if (!box) { return; }
    if (RF.tab === 'apply') { rfPaintApply(box); }
    else if (RF.tab === 'approve') { rfPaintQueue(box, 'PENDING'); }
    else if (RF.tab === 'process') { rfPaintQueue(box, 'APPROVED'); }
    else if (RF.tab === 'money') { rfPaintMoney(box); }
    else { rfPaintAll(box); }
  }

  /* ---------- 1 · apply ---------- */
  function rfPaintApply(box) {
    var d = RF.data || {};
    if (!d.can_raise) {
      box.innerHTML = '<div class="card"><div class="bd"><div class="rf-note" style="margin-top:0">Your role views this desk; CS, the Team Lead, Order Processors and Management apply for refunds.</div></div></div>';
      return;
    }
    box.innerHTML = '<div class="card"><div class="hd">Apply for a refund<span class="hint">goes to Management · approval becomes the handler’s task by itself' +
        (d.handler ? ' (' + esc(rfS(d.handler.name)) + ')' : '') + '</span></div><div class="bd">' +
      '<div class="rf-grid">' +
        '<div><label class="rf-lab rf-req">Account</label><select class="rf-sel" id="rfAcc"><option value="">Loading…</option></select></div>' +
        '<div><label class="rf-lab rf-req">eBay order number</label><input class="rf-in" id="rfOrder" placeholder="e.g. 18-15052-74974"></div>' +
        '<div><label class="rf-lab rf-req">Amount to refund (£)</label><input class="rf-in" id="rfAmt" inputmode="decimal" placeholder="e.g. 12.99"></div>' +
        '<div><label class="rf-lab">Buyer</label><input class="rf-in" id="rfBuyer" placeholder="eBay username"></div>' +
        '<div><label class="rf-lab">Item title</label><input class="rf-in" id="rfTitle" placeholder="what the buyer ordered"></div>' +
        '<div><label class="rf-lab rf-req">Reason</label><select class="rf-sel" id="rfReason">' +
          (d.reasons || []).map(function (r) { return '<option value="' + rfAttr(r.key) + '">' + esc(r.label) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div style="margin-top:12px"><label class="rf-lab rf-req">Comment — what happened and why the refund</label>' +
        '<textarea class="rf-ta" id="rfComment" placeholder="in a sentence or two; this is what Management reads"></textarea></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap"><button class="btn-gold" id="rfSend">Send to Management</button>' +
        '<span class="rf-note" style="margin-top:0">Nothing is refunded here — the eBay refund is done by the handler after approval.</span></div>' +
      '<div id="rfOut"></div></div></div>';
    cachedCall('accountList', {}, function (a) {
      var sel = $('rfAcc');
      if (!sel) { return; }
      var accs = ((a && a.accounts) || []).map(function (x) { return rfS(x.account); }).filter(Boolean);
      sel.innerHTML = accs.length ? accs.map(function (x) { return '<option value="' + rfAttr(x) + '">' + esc(x) + '</option>'; }).join('')
        : '<option value="">No account connected yet</option>';
    }).done.catch(function () {
      var sel = $('rfAcc');
      if (sel && /Loading/.test(sel.innerHTML)) { sel.innerHTML = '<option value="">Could not load accounts — press Refresh</option>'; }
    });
    $('rfSend').onclick = function () {
      var out = $('rfOut');
      var payload = { account: rfS($('rfAcc').value), order_number: rfS($('rfOrder').value), amount: rfS($('rfAmt').value), buyer: rfS($('rfBuyer').value),
        item_title: rfS($('rfTitle').value), reason_key: rfS($('rfReason').value), comment: rfS($('rfComment').value) };
      if (!payload.account) { out.innerHTML = '<div class="rf-bad">Choose the account.</div>'; return; }
      if (!payload.order_number) { out.innerHTML = '<div class="rf-bad">The eBay order number is required.</div>'; return; }
      if (!(Number(payload.amount.replace(/[£,]/g, '')) > 0)) { out.innerHTML = '<div class="rf-bad">The amount to refund is required.</div>'; return; }
      if (payload.comment.length < 3) { out.innerHTML = '<div class="rf-bad">Write the comment — what happened and why.</div>'; return; }
      if (payload.reason_key === 'custom' && payload.comment.length < 10) { out.innerHTML = '<div class="rf-bad">A custom reason needs at least 10 characters of explanation.</div>'; return; }
      var btn = this; btn.disabled = true; btn.textContent = 'Sending…'; out.innerHTML = '';
      api('refundRequestCreate', payload).then(function (r) {
        btn.disabled = false; btn.textContent = 'Send to Management';
        out.innerHTML = '<div class="rf-ok">Sent — ' + esc(rfS(r && r.refund_id)) + ' · ' + rfM(r && r.amount) + ' · Pending with Management.</div>';
        ['rfOrder', 'rfAmt', 'rfBuyer', 'rfTitle', 'rfComment'].forEach(function (id) { var el = $(id); if (el) { el.value = ''; } });
        api('refundRequestList', {}).then(function (d2) { RF.data = d2 || RF.data; rfTabs(); }).catch(function () {});
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Send to Management';
        out.innerHTML = '<div class="rf-bad">' + esc(e.message) + '</div>';
      });
    };
  }

  /* ---------- 2 · approve  ·  3 · process ---------- */
  function rfRowHead(r) {
    var st = rfS(r.status) || 'PENDING';
    return '<div class="t">' + rfM(r.amount) + ' · order <span class="mono">' + esc(rfS(r.order_number)) + '</span> · ' + esc(rfS(r.account)) +
        ' <span class="rf-pill ' + esc(st) + '">' + esc(st) + '</span></div>' +
      '<div class="m">' + esc(rfS(r.reason_text)) + (rfS(r.item_title) ? ' · ' + esc(rfS(r.item_title).slice(0, 70)) : '') + (rfS(r.buyer) ? ' · buyer ' + esc(rfS(r.buyer)) : '') +
        ' · applied by ' + rfWho(r.raised_by) + ' · ' + esc(fmtPkt(r.ts, true) || rfS(r.ts)) + '</div>' +
      (rfS(r.comment) ? '<div class="c">“' + esc(rfS(r.comment)) + '”</div>' : '') +
      (rfS(r.decided_by) ? '<div class="m">Management: ' + (esc(rfS(r.decision_note)) || st.toLowerCase()) + ' — ' + rfWho(r.decided_by) + ' · ' + esc(fmtPkt(r.decided_at, true) || '') + '</div>' : '');
  }

  function rfPaintQueue(box, st) {
    var d = RF.data || {}, rows = (d.rows || []).filter(function (r) { return rfS(r.status) === st; });
    var can = st === 'PENDING' ? d.can_decide : d.can_process;
    var h = '<div class="card"><div class="hd">' + (st === 'PENDING' ? 'Awaiting Management' : 'Approved — to process on eBay') +
      '<span class="hint">' + (st === 'PENDING' ? 'approve (the amount can be corrected) or reject with a reason' : 'record the eBay refund reference and the final amount — that completes the task') + '</span></div><div class="bd">';
    if (!rows.length) { h += '<div class="rf-note" style="margin-top:0">' + (st === 'PENDING' ? 'Nothing is waiting for a decision.' : 'Nothing approved is waiting to be processed.') + '</div>'; }
    rows.forEach(function (r) {
      h += '<div class="rf-row" data-rf="' + rfAttr(r.refund_id) + '">' + rfRowHead(r);
      if (can && st === 'PENDING') {
        h += '<div class="rf-act"><input data-rf-amt style="width:110px" value="' + rfAttr(r.amount) + '" title="approved amount £">' +
          '<input data-rf-note style="flex:1;min-width:200px" placeholder="note (required to reject)">' +
          '<button class="btn-gold" data-rf-dec="APPROVE">Approve → task to the handler</button><button class="minibtn" data-rf-dec="REJECT">Reject</button></div>';
      } else if (can && st === 'APPROVED') {
        h += '<div class="rf-act"><input data-rf-ref style="width:220px" placeholder="eBay refund reference / id">' +
          '<input data-rf-final style="width:110px" value="' + rfAttr(r.amount) + '" title="final refunded amount £">' +
          '<input data-rf-pnote style="flex:1;min-width:160px" placeholder="note (optional)">' +
          '<button class="btn-gold" data-rf-proc>Refunded on eBay — record it</button></div>' +
          (rfS(r.task_id) ? '<div class="m">task ' + esc(rfS(r.task_id)) + '</div>' : '');
      } else {
        h += '<div class="m">' + (st === 'PENDING' ? 'Waiting on Management.' : 'Waiting on the handler.') + '</div>';
      }
      h += '</div>';
    });
    box.innerHTML = h + '</div></div>';
    box.querySelectorAll('[data-rf-dec]').forEach(function (b) {
      b.onclick = function () {
        var row = this.closest('[data-rf]'), id = row.getAttribute('data-rf'), dec = this.getAttribute('data-rf-dec');
        var note = rfS(row.querySelector('[data-rf-note]').value), amt = rfS(row.querySelector('[data-rf-amt]').value);
        if (dec === 'REJECT' && note.length < 3) { toast('Say why it is rejected — the note goes back to CS.'); return; }
        row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        api('refundRequestDecide', { refund_id: id, decision: dec, note: note, amount: amt }).then(function (r) {
          toast(dec === 'REJECT' ? 'Rejected.' : 'Approved — task sent to ' + (rfWho(r && r.assigned_to) || 'the handler') + '.');
          rfLoad();
        }).catch(function (e) { row.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); toast(e.message); });
      };
    });
    box.querySelectorAll('[data-rf-proc]').forEach(function (b) {
      b.onclick = function () {
        var row = this.closest('[data-rf]'), id = row.getAttribute('data-rf');
        var ref = rfS(row.querySelector('[data-rf-ref]').value), fin = rfS(row.querySelector('[data-rf-final]').value), note = rfS(row.querySelector('[data-rf-pnote]').value);
        if (!(Number(fin.replace(/[£,]/g, '')) >= 0)) { toast('The final refunded amount must be a number.'); return; }
        var btn = this; btn.disabled = true;
        api('refundRequestProcess', { refund_id: id, ebay_ref: ref, amount_final: fin, note: note }).then(function () {
          toast('Recorded — the task is complete.'); RF.board = null; rfLoad();
        }).catch(function (e) { btn.disabled = false; toast(e.message); });
      };
    });
  }

  /* ---------- 5 · every request ---------- */
  function rfPaintAll(box) {
    var rows = (RF.data && RF.data.rows) || [];
    if (!rows.length) { box.innerHTML = '<div class="card"><div class="bd"><div class="rf-note" style="margin-top:0">No refund has been applied for yet.</div></div></div>'; return; }
    box.innerHTML = '<div class="card"><div class="hd">Every request<span class="hint">newest first · the full trail of each one</span></div><div class="bd">' +
      '<div class="scroll"><table class="ir-tbl" style="min-width:980px"><thead><tr>' +
      '<th style="text-align:left">Applied</th><th style="text-align:left">Account</th><th style="text-align:left">Order</th><th>Asked £</th><th style="text-align:left">Reason</th>' +
      '<th style="text-align:left">By</th><th style="text-align:left">Status</th><th style="text-align:left">Decision</th><th>Final £</th><th style="text-align:left">Processed</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var st = rfS(r.status) || 'PENDING';
        return '<tr><td style="text-align:left;white-space:nowrap;font-size:11.5px;color:var(--text-3)">' + esc(fmtPkt(r.ts, true) || rfS(r.ts)) + '</td>' +
          '<td style="text-align:left">' + esc(rfS(r.account)) + '</td><td style="text-align:left" class="mono">' + esc(rfS(r.order_number)) + '</td>' +
          '<td>' + rfM(r.amount) + '</td><td style="text-align:left;max-width:220px;font-size:12px" title="' + rfAttr(r.comment) + '">' + esc(rfS(r.reason_text).slice(0, 60)) + '</td>' +
          '<td style="text-align:left">' + rfWho(r.raised_by) + '</td><td style="text-align:left"><span class="rf-pill ' + esc(st) + '">' + esc(st) + '</span></td>' +
          '<td style="text-align:left;font-size:11.5px">' + (rfS(r.decided_by) ? rfWho(r.decided_by) + ' · ' + esc(fmtPkt(r.decided_at, true) || '') + (rfS(r.decision_note) ? ' — ' + esc(rfS(r.decision_note).slice(0, 60)) : '') : '—') + '</td>' +
          '<td>' + (rfS(r.amount_final) !== '' ? rfM(r.amount_final) : '—') + '</td>' +
          '<td style="text-align:left;font-size:11.5px">' + (rfS(r.processed_by) ? rfWho(r.processed_by) + ' · ' + esc(fmtPkt(r.processed_at, true) || '') + (rfS(r.ebay_ref) ? ' · ' + esc(rfS(r.ebay_ref)) : '') : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';
  }

  /* ---------- 4 · the money ---------- */
  function rfPaintMoney(box) {
    if (!rfMoneyOk()) { box.innerHTML = '<div class="card"><div class="bd"><div class="rf-note" style="margin-top:0">Your role does not see the refund amounts.</div></div></div>'; return; }
    if (!RF.to) { var now = new Date(); RF.to = rfYmd(now); RF.from = rfYmd(new Date(now.getTime() - 29 * 86400000)); }
    box.innerHTML = '<div class="card"><div class="hd">Refunded amounts<span class="hint">eBay’s own Finances feed — what was actually paid back</span></div><div class="bd">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
        '<input class="rf-in" id="rfFrom" type="date" style="width:auto" value="' + rfAttr(RF.from) + '"><span class="rf-note" style="margin:0">to</span>' +
        '<input class="rf-in" id="rfTo" type="date" style="width:auto" value="' + rfAttr(RF.to) + '">' +
        '<select class="rf-sel" id="rfBAcct" style="width:auto"><option value="">All accounts</option></select>' +
        '<button class="minibtn" id="rfBGo">Show</button></div>' +
      '<div id="rfBoard"><div class="spinner"></div></div></div></div>';
    var sa = $('rfBAcct');
    if (sa) { fillAccountSelect(sa, RF.acct, function () { RF.acct = sa.value; RF.board = null; rfBoardLoad(); }); }
    $('rfBGo').onclick = function () { RF.from = rfS($('rfFrom').value); RF.to = rfS($('rfTo').value); RF.board = null; rfBoardLoad(); };
    rfBoardLoad();
  }

  function rfBoardLoad() {
    var host = $('rfBoard');
    if (!host) { return; }
    if (RF.board) { rfBoardPaint(host, RF.board); return; }
    host.innerHTML = '<div class="spinner"></div>';
    var p = { from: RF.from, to: RF.to };
    if (RF.acct) { p.account = RF.acct; }
    api('refundsBoard', p).then(function (d) { RF.board = d || {}; rfBoardPaint(host, RF.board); })
      .catch(function (e) { host.innerHTML = '<div class="rf-bad">The money board did not answer: ' + esc(e.message) + '</div>'; });
  }

  function rfBoardPaint(host, d) {
    var tm = d.this_month || {}, pm = d.prev_month || {};
    var delta = pm.amount ? Math.round((tm.amount - pm.amount) / pm.amount * 100) : null;
    var days = Object.keys(d.by_day || {}).sort();
    var max = 0;
    days.forEach(function (k) { if (d.by_day[k] > max) { max = d.by_day[k]; } });
    var h = '<div class="rf-tiles">' +
      '<div class="rf-t bad"><span class="k">Refunded · ' + esc(rfS(d.from)) + ' → ' + esc(rfS(d.to)) + '</span><b>' + rfM(d.total) + '</b><span class="s">' + (d.count || 0) + ' refund' + (d.count === 1 ? '' : 's') + '</span></div>' +
      '<div class="rf-t"><span class="k">This month · ' + esc(rfS(tm.ym)) + '</span><b>' + rfM(tm.amount) + '</b><span class="s">' + (tm.n || 0) + ' refunds</span></div>' +
      '<div class="rf-t"><span class="k">Last month · ' + esc(rfS(pm.ym)) + '</span><b>' + rfM(pm.amount) + '</b><span class="s">' + (pm.n || 0) + ' refunds</span></div>' +
      '<div class="rf-t ' + (delta === null ? '' : delta > 0 ? 'bad' : 'ok') + '"><span class="k">Month on month</span><b>' + (delta === null ? '—' : (delta > 0 ? '+' : '') + delta + '%') + '</b>' +
        '<span class="s">' + (delta === null ? 'no refunds last month' : (delta > 0 ? 'more' : 'less') + ' refunded so far this month') + '</span></div>' +
      '<div class="rf-t"><span class="k">Exact dates</span><b>' + (d.count ? Math.round((d.exact_dates || 0) / d.count * 100) : 0) + '%</b><span class="s">the rest carry the order date (≈)</span></div></div>';
    if (days.length) {
      h += '<div class="rf-days">' + days.map(function (k) {
        var v = d.by_day[k];
        return '<div class="rf-day" title="' + esc(k) + ' · ' + rfM(v) + '"><i style="height:' + (max ? Math.max(2, Math.round(v / max * 72)) : 2) + 'px"></i><span>' + esc(k.slice(5)) + '</span></div>';
      }).join('') + '</div>';
    }
    var accts = d.by_account || [];
    if (accts.length) {
      h += '<div class="scroll"><table class="ir-tbl" style="min-width:520px;margin-bottom:14px"><thead><tr><th style="text-align:left">Account</th><th>Refunds</th><th>Refunded £</th><th>Of those orders’ sales</th></tr></thead><tbody>' +
        accts.map(function (a) {
          return '<tr><td style="text-align:left">' + esc(rfS(a.account)) + '</td><td>' + a.refunds + '</td><td style="color:var(--bad);font-weight:800">' + rfM(a.amount) + '</td>' +
            '<td>' + (a.sold ? Math.round(a.amount / a.sold * 100) + '% of ' + rfM(a.sold) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    var hist = d.history || [];
    var showBuyer = hist.some(function (x) { return rfS(x.buyer); });
    h += '<div class="rf-lab" style="margin-top:4px">History · every refund in the range</div>';
    if (!hist.length) { h += '<div class="rf-note" style="margin-top:0">No refund in this range.</div>'; }
    else {
      h += '<div class="scroll" style="max-height:520px"><table class="ir-tbl" style="min-width:860px"><thead><tr><th style="text-align:left">Refunded</th><th style="text-align:left">Account</th>' +
        '<th style="text-align:left">Order</th><th style="text-align:left">Item</th>' + (showBuyer ? '<th style="text-align:left">Buyer</th>' : '') +
        '<th>Sold £</th><th>Refunded £</th><th style="text-align:left">Ordered</th></tr></thead><tbody>' +
        hist.map(function (r) {
          return '<tr><td style="text-align:left;white-space:nowrap">' + esc(rfS(r.date)) +
              (r.exact_date ? '' : ' <span class="rf-approx" title="eBay’s refund date not seen yet — this is the order date">≈</span>') + '</td>' +
            '<td style="text-align:left">' + esc(rfS(r.account)) + '</td>' +
            '<td style="text-align:left" class="mono"><a href="https://www.ebay.co.uk/sh/ord/details?orderid=' + encodeURIComponent(rfS(r.order_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(rfS(r.order_id)) + '</a></td>' +
            '<td style="text-align:left;max-width:260px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + rfAttr(r.title) + '">' + esc(rfS(r.title) || rfS(r.item_id)) + '</div></td>' +
            (showBuyer ? '<td style="text-align:left">' + esc(rfS(r.buyer)) + '</td>' : '') +
            '<td>' + rfM(r.sold) + '</td><td style="color:var(--bad);font-weight:800">' + rfM(r.refunded) + '</td><td style="text-align:left">' + esc(rfS(r.ordered)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    host.innerHTML = h + '<p class="rf-note">' + esc(rfS(d.note)) + '</p>';
  }

})();
