/* view-replacements.js — the Replacement orders desk (26 Aug, owner; lifecycle 1 Oct). CS, Team
 * Lead, Management and Order Processors RAISE a replacement for any order with a preset reason
 * (custom demands an explanation). Since 1 Oct the request goes to MANAGEMENT first: on approval
 * the confirmed item lands on today's tab of that account's live order book, headed REPLACEMENT
 * ORDER, and a task goes to the handling Order Processor, who records the AliExpress cost, the
 * AliExpress order id and — once it ships — the tracking (added on eBay against the original
 * order); the tracking completes the task. Everything stays on the archive. Rows arrive pre-filled
 * from the button on Today's orders. Backend: replacementCreate · replacementDecide ·
 * replacementFulfil · replacementList. This file is public: no staff name or email lives in it. */
(function () {
  'use strict';

  var RP_ROLES = ['CS', 'Team Lead', 'Management', 'Ops Head', 'Order Processor', 'Sales Operations'];

  VIEW_CSS.push(
    '.rp-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}' +
    '.rp-in,.rp-sel,.rp-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.rp-ta{min-height:74px;resize:vertical}' +
    '.rp-lab{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:6px}' +
    '.rp-req::after{content:" *";color:var(--bad)}' +
    '.rp-note{font-size:12px;font-weight:600;color:var(--text-3);margin-top:8px}' +
    '.rp-ok{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--ok-soft);border:1px solid rgba(63,207,142,.4);font-weight:700;font-size:13px;color:var(--ok)}' +
    '.rp-bad{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--warn-soft);border:1px solid rgba(255,159,67,.45);font-weight:700;font-size:13px;color:var(--warn)}' +
    '.rp-pill{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:7px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}' +
    '.rp-pill.PENDING{color:var(--warn);border-color:rgba(255,159,67,.5)}.rp-pill.APPROVED{color:var(--blue-2,#6fa8ff)}.rp-pill.ORDERED{color:#9B6AE6}' +
    '.rp-pill.TRACKED{color:var(--ok);border-color:rgba(63,207,142,.4)}.rp-pill.REJECTED{color:var(--bad)}' +
    '.rp-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:14px}' +
    '.rp-t{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2)}' +
    '.rp-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rp-t b{display:block;font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.rp-t.warn b{color:var(--warn)}.rp-t.ok b{color:var(--ok)}' +
    '.rp-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel)}' +
    '.rp-row .t{font-weight:800;font-size:13.5px}.rp-row .m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.rp-row .c{font-size:12.5px;color:var(--text-2);font-weight:600;margin-top:6px;white-space:pre-wrap}' +
    '.rp-act{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-top:10px;align-items:center}' +
    '.rp-act input{padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;width:100%}' +
    '.rp-act .rp-btns{display:flex;gap:8px;flex-wrap:wrap;grid-column:1/-1}'
  );

  function rpS(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function rpAttr(v) { return esc(rpS(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function rpWho(e) { return esc(rpS(e).split('@')[0]); }
  /* Rows raised before 1 Oct carry no status — they went straight to the order book. */
  function rpSt(r) { return rpS(r.status) || 'LEGACY'; }
  function rpM(v) { var s = rpS(v); if (s === '') { return ''; } var n = Number(s); return isFinite(n) ? '£' + n.toFixed(2) : esc(s); }

  var RP = { reasons: [], canRaise: false, canDecide: false, canFulfil: false, handler: null, rows: [], seq: 0 };
  var RP_PREFILL_KEY = 'm98m:repl:prefill';

  VIEWS.replacements = {
    label: 'Replacement orders',
    icon: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    roles: RP_ROLES,
    order: 3.6,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Replacement <span class="goldtext">orders</span></h1>' +
          '<span class="sub">raise → Management approves and confirms the item → the handler buys it, records cost and AliExpress order id, adds the tracking on eBay · archive of everything</span>' +
          '<button class="minibtn" id="rpRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="rpTiles" class="enter d1"></div>' +
        '<div class="card enter d1" id="rpFormCard"><div class="hd">Raise a replacement' +
          '<span class="hint">it goes to Management first — nothing reaches the order book until it is approved</span></div>' +
          '<div class="bd" id="rpForm"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Awaiting Management' +
          '<span class="hint">approve — confirming the item — or reject with a reason</span></div>' +
          '<div class="bd" id="rpPending"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Approved — to order and track' +
          '<span class="hint">AliExpress cost · AliExpress order id · tracking (added on eBay against the original order) — the tracking completes the task</span></div>' +
          '<div class="bd" id="rpOpen"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Every replacement raised' +
          '<span class="hint">newest first · the full trail of each one</span></div>' +
          '<div class="bd" id="rpList"><div class="spinner"></div></div></div>';
    },
    init: function () {
      /* NOT `onclick = rpLoad` — the click EVENT would arrive as rpLoad's listOnly parameter,
         truthy, and Refresh would silently never repaint the form. */
      $('rpRefresh').onclick = function () { rpLoad(); };
      rpLoad();
    }
  };

  function rpPrefill() {
    try {
      var raw = localStorage.getItem(RP_PREFILL_KEY);
      if (!raw) { return null; }
      localStorage.removeItem(RP_PREFILL_KEY);
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function rpLoad(listOnly) {
    var seq = ++RP.seq;
    api('replacementList', {}).then(function (d) {
      if (seq !== RP.seq) { return; }
      d = d || {};
      RP.reasons = d.reasons || [];
      RP.canRaise = !!d.can_raise; RP.canDecide = !!d.can_decide; RP.canFulfil = !!d.can_fulfil;
      RP.handler = d.handler || null;
      RP.rows = d.rows || [];
      /* After a raise only the lists refresh — repainting the form would destroy the
         confirmation the raiser is reading and reset their selections. */
      if (!listOnly) { rpPaintForm(); }
      rpPaintTiles(); rpPaintPending(); rpPaintOpen(); rpPaintList();
    }).catch(function (e) {
      if (seq !== RP.seq) { return; }
      if (!listOnly) { setHTML('rpForm', '<div class="rp-bad">Could not load: ' + esc(e.message) + ' — press Refresh.</div>'); }
      setHTML('rpList', '<div class="rp-note" style="margin-top:0">The list could not refresh — press Refresh.</div>');
    });
  }

  function rpPaintTiles() {
    var host = $('rpTiles');
    if (!host) { return; }
    var n = {};
    RP.rows.forEach(function (r) { var s = rpSt(r); n[s] = (n[s] || 0) + 1; });
    host.innerHTML = '<div class="rp-tiles">' +
      '<div class="rp-t warn"><span class="k">Awaiting Management</span><b>' + (n.PENDING || 0) + '</b></div>' +
      '<div class="rp-t"><span class="k">Approved · to order</span><b>' + (n.APPROVED || 0) + '</b></div>' +
      '<div class="rp-t"><span class="k">Ordered · awaiting tracking</span><b>' + (n.ORDERED || 0) + '</b></div>' +
      '<div class="rp-t ok"><span class="k">Tracked</span><b>' + (n.TRACKED || 0) + '</b></div>' +
      '<div class="rp-t"><span class="k">Rejected</span><b>' + (n.REJECTED || 0) + '</b></div>' +
      '<div class="rp-t"><span class="k">Handler</span><b style="font-size:13px">' + (RP.handler ? esc(rpS(RP.handler.name)) : '—') + '</b></div></div>';
  }

  function rpPaintForm() {
    if (!$('rpForm')) { return; }
    if (!RP.canRaise) {
      setHTML('rpForm', '<div class="rp-note" style="margin-top:0">Your role can view this desk but not raise replacements — CS, Team Lead, Order Processor and Management raise them.</div>');
      return;
    }
    var pre = rpPrefill() || {};
    setHTML('rpForm',
      '<div class="rp-grid">' +
        '<div><label class="rp-lab rp-req">Account</label><select class="rp-sel" id="rpAcc"><option value="">Loading…</option></select></div>' +
        '<div><label class="rp-lab rp-req">Original eBay order number</label><input class="rp-in" id="rpOrder" placeholder="e.g. 18-15052-74974" value="' + rpAttr(pre.order_number || '') + '"></div>' +
        '<div><label class="rp-lab">Item title</label><input class="rp-in" id="rpTitle" placeholder="what the buyer ordered" value="' + rpAttr(pre.item_title || '') + '"></div>' +
        '<div><label class="rp-lab">Quantity</label><input class="rp-in" id="rpQty" value="' + rpAttr(pre.quantity || '1') + '"></div>' +
        '<div><label class="rp-lab">Variation</label><input class="rp-in" id="rpVar" placeholder="size / colour, if any" value="' + rpAttr(pre.variation || '') + '"></div>' +
        '<div><label class="rp-lab">AliExpress link</label><input class="rp-in" id="rpAli" placeholder="https://… (helps the processor)" value="' + rpAttr(pre.ali_link || '') + '"></div>' +
        '<div><label class="rp-lab rp-req">Reason</label><select class="rp-sel" id="rpReason">' +
          RP.reasons.map(function (r) { return '<option value="' + rpAttr(r.key) + '">' + esc(r.label) + '</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div style="margin-top:12px"><label class="rp-lab" id="rpExpLab">Explanation <span style="text-transform:none;letter-spacing:0">(required for a custom reason)</span></label>' +
        '<textarea class="rp-ta" id="rpExp" placeholder="what happened, in a sentence or two — this is what Management reads"></textarea></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">' +
        '<button class="btn-gold" id="rpSend">Send to Management</button>' +
        '<span class="rp-note" style="margin-top:0">Management confirms the item, then the order-book row and the handler’s task are created by themselves.</span>' +
      '</div>' +
      '<div id="rpOut"></div>');

    cachedCall('accountList', {}, function (d) {
      var sel = $('rpAcc');
      if (!sel) { return; }
      var accs = ((d && d.accounts) || []).map(function (a) { return rpS(a.account); }).filter(Boolean);
      sel.innerHTML = accs.length
        ? accs.map(function (a) { return '<option value="' + rpAttr(a) + '"' + (a === rpS(pre.account) ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('')
        : '<option value="">No account connected yet</option>';
    }).done.catch(function () {
      var sel = $('rpAcc');
      if (sel && /Loading/.test(sel.innerHTML)) { sel.innerHTML = '<option value="">Could not load accounts — press Refresh</option>'; }
    });

    var reasonSel = $('rpReason');
    var syncReq = function () {
      var lab = $('rpExpLab');
      if (lab) { lab.className = 'rp-lab' + (reasonSel.value === 'custom' ? ' rp-req' : ''); }
    };
    reasonSel.onchange = syncReq; syncReq();

    $('rpSend').onclick = function () {
      var out = $('rpOut');
      var payload = {
        account: rpS($('rpAcc').value), order_number: rpS($('rpOrder').value),
        item_title: rpS($('rpTitle').value), quantity: rpS($('rpQty').value) || '1',
        variation: rpS($('rpVar').value), ali_link: rpS($('rpAli').value),
        reason_key: rpS(reasonSel.value), explanation: rpS($('rpExp').value),
      };
      if (!payload.account) { out.innerHTML = '<div class="rp-bad">Choose the account.</div>'; return; }
      if (!payload.order_number) { out.innerHTML = '<div class="rp-bad">The original eBay order number is required.</div>'; return; }
      if (payload.reason_key === 'custom' && payload.explanation.length < 10) {
        out.innerHTML = '<div class="rp-bad">A custom reason needs an explanation — at least 10 characters.</div>'; return;
      }
      var btn = this; btn.disabled = true; btn.textContent = 'Sending…';
      out.innerHTML = '';
      api('replacementCreate', payload).then(function (r) {
        btn.disabled = false; btn.textContent = 'Send to Management';
        out.innerHTML = '<div class="rp-ok">Sent — ' + esc(rpS(r && r.repl_id)) + ' · Pending with Management. They confirm the item; the order-book row and the handler’s task follow by themselves.</div>';
        var oi = $('rpOrder'); if (oi) { oi.value = ''; }
        var ti = $('rpTitle'); if (ti) { ti.value = ''; }
        var xi = $('rpExp'); if (xi) { xi.value = ''; }
        rpLoad(true);
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Send to Management';
        out.innerHTML = '<div class="rp-bad">' + esc(e.message) + '</div>';
      });
    };
  }

  function rpRowHead(r) {
    var st = rpSt(r);
    return '<div class="t">order <span class="mono">' + esc(rpS(r.order_number)) + '</span> · ' + esc(rpS(r.account)) + ' <span class="rp-pill ' + esc(st) + '">' + esc(st) + '</span></div>' +
      '<div class="m">' + esc(rpS(r.reason_text)) + (rpS(r.item_title) ? ' · ' + esc(rpS(r.item_title).slice(0, 70)) : '') +
        (rpS(r.variation) ? ' · ' + esc(rpS(r.variation)) : '') + ' · qty ' + esc(rpS(r.quantity) || '1') +
        ' · raised by ' + rpWho(r.raised_by) + ' · ' + esc(fmtPkt(r.ts, true) || rpS(r.ts)) + '</div>' +
      (rpS(r.explanation) ? '<div class="c">“' + esc(rpS(r.explanation)) + '”</div>' : '') +
      (rpS(r.ali_link) ? '<div class="m"><a href="' + esc(safeUrl(rpS(r.ali_link)) || '#') + '" target="_blank" rel="noopener noreferrer">AliExpress link ↗</a></div>' : '') +
      (rpS(r.decided_by) ? '<div class="m">Management: ' + (esc(rpS(r.decision_note)) || st.toLowerCase()) + ' — ' + rpWho(r.decided_by) + ' · ' + esc(fmtPkt(r.decided_at, true) || '') + '</div>' : '');
  }

  /* STEP 2 — Management confirms the item and approves, or rejects. */
  function rpPaintPending() {
    var box = $('rpPending');
    if (!box) { return; }
    var rows = RP.rows.filter(function (r) { return rpSt(r) === 'PENDING'; });
    if (!rows.length) { box.innerHTML = '<div class="rp-note" style="margin-top:0">Nothing is waiting for Management.</div>'; return; }
    box.innerHTML = rows.map(function (r) {
      var h = '<div class="rp-row" data-rp="' + rpAttr(r.repl_id) + '">' + rpRowHead(r);
      if (RP.canDecide) {
        h += '<div class="rp-act">' +
          '<input data-rp-title value="' + rpAttr(r.item_title) + '" placeholder="item title (as it should be ordered)">' +
          '<input data-rp-qty value="' + rpAttr(r.quantity || '1') + '" placeholder="quantity" style="max-width:90px">' +
          '<input data-rp-var value="' + rpAttr(r.variation) + '" placeholder="variation">' +
          '<input data-rp-ali value="' + rpAttr(r.ali_link) + '" placeholder="AliExpress link (https://…)">' +
          '<input data-rp-note placeholder="note for the handler — or why it is rejected" style="grid-column:1/-1">' +
          '<div class="rp-btns"><button class="btn-gold" data-rp-dec="APPROVE">Approve → order book + task to the handler</button>' +
          '<button class="minibtn" data-rp-dec="REJECT">Reject</button></div></div>';
      } else {
        h += '<div class="m">Waiting on Management.</div>';
      }
      return h + '</div>';
    }).join('');
    box.querySelectorAll('[data-rp-dec]').forEach(function (b) {
      b.onclick = function () {
        var row = this.closest('[data-rp]'), id = row.getAttribute('data-rp'), dec = this.getAttribute('data-rp-dec');
        var note = rpS(row.querySelector('[data-rp-note]').value);
        if (dec === 'REJECT' && note.length < 3) { toast('Say why it is rejected — the note goes back to the raiser.'); return; }
        var payload = { repl_id: id, decision: dec, note: note };
        if (dec === 'APPROVE') {
          payload.item_title = rpS(row.querySelector('[data-rp-title]').value);
          payload.quantity = rpS(row.querySelector('[data-rp-qty]').value) || '1';
          payload.variation = rpS(row.querySelector('[data-rp-var]').value);
          payload.ali_link = rpS(row.querySelector('[data-rp-ali]').value);
        }
        row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        api('replacementDecide', payload).then(function (r) {
          if (dec === 'REJECT') { toast('Rejected.'); }
          else {
            toast('Approved — ' + (r && r.sheet_tab ? 'on the ' + r.sheet_tab + ' tab' : 'recorded') + (r && r.assigned_to ? ' · task to ' + rpWho(r.assigned_to) : '') + '.');
          }
          rpLoad(true);
        }).catch(function (e) { row.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); toast(e.message); });
      };
    });
  }

  /* STEP 3 — the handler records the purchase and the tracking. */
  function rpPaintOpen() {
    var box = $('rpOpen');
    if (!box) { return; }
    var rows = RP.rows.filter(function (r) { return rpSt(r) === 'APPROVED' || rpSt(r) === 'ORDERED'; });
    if (!rows.length) { box.innerHTML = '<div class="rp-note" style="margin-top:0">Nothing approved is waiting to be ordered or tracked.</div>'; return; }
    box.innerHTML = rows.map(function (r) {
      var h = '<div class="rp-row" data-rp="' + rpAttr(r.repl_id) + '">' + rpRowHead(r) +
        '<div class="m">' + (rpS(r.sheet_tab) ? 'order book: ' + esc(rpS(r.sheet_tab)) + (rpS(r.sheet_row) && rpS(r.sheet_row) !== 'shadow' ? ' row ' + esc(rpS(r.sheet_row)) : '') : 'order book: ' + esc(rpS(r.sheet_note) || 'not written')) +
          (rpS(r.task_id) ? ' · task ' + esc(rpS(r.task_id)) : '') +
          (rpM(r.ali_cost) ? ' · cost ' + rpM(r.ali_cost) : '') + (rpS(r.ali_order) ? ' · AliExpress order ' + esc(rpS(r.ali_order)) : '') +
          (rpS(r.fulfilled_by) ? ' · last by ' + rpWho(r.fulfilled_by) + ' ' + esc(fmtPkt(r.fulfilled_at, true) || '') : '') + '</div>';
      if (RP.canFulfil) {
        h += '<div class="rp-act">' +
          '<input data-rp-cost value="' + rpAttr(r.ali_cost) + '" placeholder="AliExpress cost £" inputmode="decimal">' +
          '<input data-rp-order value="' + rpAttr(r.ali_order) + '" placeholder="AliExpress order id">' +
          '<input data-rp-trk value="' + rpAttr(r.tracking) + '" placeholder="tracking number (once it ships)">' +
          '<input data-rp-fnote placeholder="note (optional)">' +
          '<div class="rp-btns"><button class="btn-gold" data-rp-ful>Record</button>' +
          '<span class="rp-note" style="margin-top:0">Add the tracking on eBay against the original order too — recording it here completes the task.</span></div></div>';
      } else {
        h += '<div class="m">Waiting on the handler.</div>';
      }
      return h + '</div>';
    }).join('');
    box.querySelectorAll('[data-rp-ful]').forEach(function (b) {
      b.onclick = function () {
        var row = this.closest('[data-rp]'), id = row.getAttribute('data-rp');
        var payload = { repl_id: id, ali_cost: rpS(row.querySelector('[data-rp-cost]').value), ali_order: rpS(row.querySelector('[data-rp-order]').value),
          tracking: rpS(row.querySelector('[data-rp-trk]').value), note: rpS(row.querySelector('[data-rp-fnote]').value) };
        if (payload.ali_cost === '' && !payload.ali_order && !payload.tracking && !payload.note) { toast('Record the cost, the AliExpress order id, the tracking — or a note.'); return; }
        var btn = this; btn.disabled = true;
        api('replacementFulfil', payload).then(function (r) {
          toast(r && r.status === 'TRACKED' ? 'Tracked — the task is complete.' : 'Recorded.');
          rpLoad(true);
        }).catch(function (e) { btn.disabled = false; toast(e.message); });
      };
    });
  }

  function rpPaintList() {
    if (!$('rpList')) { return; }
    var rows = RP.rows;
    if (!rows.length) {
      setHTML('rpList', '<div class="rp-note" style="margin-top:0">No replacement has been raised yet.</div>');
      return;
    }
    setHTML('rpList', '<div class="scroll"><table class="ir-tbl" style="min-width:1180px"><thead><tr>' +
      '<th style="text-align:left">When</th><th style="text-align:left">Account</th>' +
      '<th style="text-align:left">Order</th><th style="text-align:left">Item</th>' +
      '<th style="text-align:left">Reason</th><th style="text-align:left">Raised by</th>' +
      '<th style="text-align:left">Status</th><th style="text-align:left">Decision</th>' +
      '<th>Ali cost</th><th style="text-align:left">Ali order</th><th style="text-align:left">Tracking</th>' +
      '<th style="text-align:left">Landed</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var st = rpSt(r);
        var landed = rpS(r.sheet_row) === 'shadow'
          ? '<span class="rp-pill" style="color:var(--warn);border-color:rgba(255,159,67,.5)">shadow — NOT on the sheet</span>'
          : rpS(r.sheet_tab)
          ? '<span class="rp-pill">' + esc(rpS(r.sheet_tab)) + (rpS(r.sheet_row) ? ' · row ' + esc(rpS(r.sheet_row)) : '') + '</span>'
          : (st === 'PENDING' || st === 'REJECTED') ? '<span class="rp-pill">not yet</span>'
          : '<span class="rp-pill" style="color:var(--warn)">' + esc(rpS(r.sheet_note) || 'portal only') + '</span>';
        return '<tr><td style="text-align:left;white-space:nowrap;font-size:11.5px;color:var(--text-3)">' + esc(fmtPkt(r.ts, true) || rpS(r.ts)) + '</td>' +
          '<td style="text-align:left">' + esc(rpS(r.account)) + '</td>' +
          '<td style="text-align:left" class="mono">' + esc(rpS(r.order_number)) + '</td>' +
          '<td style="text-align:left;max-width:200px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + rpAttr(r.item_title) + '">' + esc(rpS(r.item_title) || '—') + '</div></td>' +
          '<td style="text-align:left;max-width:200px;font-size:12px" title="' + rpAttr(r.explanation || r.reason_text) + '">' + esc(rpS(r.reason_text).slice(0, 60) || '—') + '</td>' +
          '<td style="text-align:left">' + rpWho(r.raised_by) + '</td>' +
          '<td style="text-align:left"><span class="rp-pill ' + esc(st) + '">' + esc(st) + '</span></td>' +
          '<td style="text-align:left;font-size:11.5px">' + (rpS(r.decided_by) ? rpWho(r.decided_by) + ' · ' + esc(fmtPkt(r.decided_at, true) || '') + (rpS(r.decision_note) ? ' — ' + esc(rpS(r.decision_note).slice(0, 50)) : '') : '—') + '</td>' +
          '<td>' + (rpM(r.ali_cost) || '—') + '</td>' +
          '<td style="text-align:left" class="mono">' + (esc(rpS(r.ali_order)) || '—') + '</td>' +
          '<td style="text-align:left" class="mono">' + (esc(rpS(r.tracking)) || '—') + (rpS(r.fulfilled_by) ? '<div style="font-size:10.5px;color:var(--text-3)">' + rpWho(r.fulfilled_by) + ' · ' + esc(fmtPkt(r.fulfilled_at, true) || '') + '</div>' : '') + '</td>' +
          '<td style="text-align:left">' + landed + '</td></tr>';
      }).join('') + '</tbody></table></div>');
  }

})();
