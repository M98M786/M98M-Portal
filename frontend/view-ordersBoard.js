/* view-ordersBoard.js — Hasib's item 2 (19 Aug review): eBay's own order-status dropdown as a
 * screen. Every bucket counted across ALL dates from the statusRefresh-converged Engine truth —
 * not day tabs. 'Archived' holds the old orders eBay has no dispatch record for: dispatched and
 * delivered in the real world, but never tracked on eBay — history, never LATE NOW.
 * R5 (21 Aug): the 'Needs processing' bucket — orders with no AliExpress order placed yet (the
 * hourly sheet sweep + the portal's own add box feed the truth) — and the one-tap copy button
 * for the AliExpress order number, which is what tracking gets pulled with. */
(function () {

  var OB_ROLES = ['Order Processor', 'Management', 'Ops Head', 'Team Lead', 'CS'];
  var OB = { bucket: 'awaiting', account: '' };

  var OB_LABELS = [
    ['all', 'All orders'],
    ['needs_processing', 'Needs processing'],
    ['awaiting', 'Awaiting dispatch'],
    ['overdue', 'Overdue'],
    ['due24', 'Send in next 24h'],
    ['due2d', 'Due in 2 days'],
    ['due3d', 'Due in 3 days'],
    ['dispatched', 'Dispatched'],
    ['cancelled', 'Cancelled'],
    ['archived', 'Archived · no eBay record'],
  ];

  VIEW_CSS.push(
    '.ob-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
    '.ob-chip{border:1px solid var(--gold-line);background:var(--panel);color:var(--text);border-radius:99px;padding:7px 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}' +
    '.ob-chip.on{background:var(--gold-soft,rgba(246,208,107,.15));border-color:var(--gold-line-hi);color:var(--gold-a)}' +
    '.ob-chip b{font-variant-numeric:tabular-nums;margin-left:5px}' +
    '.ob-chip.bad{border-color:var(--bad)}.ob-chip.bad b{color:var(--bad)}' +
    '.ob-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:900px}' +
    '.ob-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:9px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ob-tbl td{padding:8px 11px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.ob-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.ob-late{font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--bad-soft,rgba(255,80,80,.12));color:var(--bad)}' +
    '.ob-due{font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--warn-soft,rgba(246,208,107,.12));color:var(--warn,#d9a021)}' +
    '.ob-ok{font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--ok-soft,rgba(60,200,120,.12));color:var(--ok)}' +
    '.ob-copy{border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text);border-radius:8px;padding:4px 9px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}' +
    '.ob-copy:hover{border-color:var(--gold-line-hi)}.ob-copy.done{color:var(--ok);border-color:var(--ok)}'
  );

  function obStr(v) { return String(v == null ? '' : v).trim(); }
  function obGBP(v) { var n = Number(v); return isFinite(n) && n ? '£' + n.toFixed(2) : '—'; }

  /* The number tracking gets pulled with: the sheet's own 'Order Number' when the sweep brought
   * it, else the longest digit run inside the Ali link (aliexpress order URLs carry ?orderId=). */
  function obAliNum(r) {
    var n = obStr(r.ali_order).replace(/\D/g, '');
    if (n.length >= 8) { return n; }
    var m = obStr(r.ali_link).match(/(\d{10,20})/);
    return m ? m[1] : '';
  }

  function obCopy(btn, text) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '✓ copied'; btn.classList.add('done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1400);
    };
    var manual = function () { window.prompt('Copy the AliExpress order number:', text); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, manual);
    } else { manual(); }
  }

  /* UK business days since the order was created — the 1-business-day rule made visible. */
  function obBizDays(createdIso) {
    var t = Date.parse(createdIso);
    if (!isFinite(t)) { return 0; }
    var n = 0, d = new Date(t);
    while (d.getTime() < Date.now() - 86400000) {
      d = new Date(d.getTime() + 86400000);
      var wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6) { n++; }
    }
    return n;
  }

  function obWhen(r) {
    var sb = obStr(r.ship_by);
    if (!sb) { return '<span style="color:var(--text-3)">no deadline yet</span>'; }
    var ms = Date.parse(sb) - Date.now();
    if (r.status === 'CANCELLED') { return '<span class="ob-bad" style="color:var(--text-3)">cancelled</span>'; }
    if (r.status === 'FULFILLED') { return '<span class="ob-ok">dispatched</span>'; }
    if (ms < 0) {
      var d = Math.floor(-ms / 86400000);
      return '<span class="ob-late">' + (d >= 1 ? d + 'd late' : Math.max(1, Math.round(-ms / 3600000)) + 'h late') + '</span>';
    }
    var h = Math.round(ms / 3600000);
    return '<span class="' + (h <= 24 ? 'ob-due' : 'ob-ok') + '">' + (h < 48 ? h + 'h left' : Math.round(h / 24) + 'd left') + '</span>';
  }

  function obLoad() {
    var box = $('obBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    var payload = { bucket: OB.bucket };
    if (OB.account) { payload.account = OB.account; }
    api('ordersBoard', payload).then(function (d) {
      d = d || {};
      var chips = OB_LABELS.map(function (pair) {
        var n = (d.counts || {})[pair[0]];
        var red = (pair[0] === 'overdue' || pair[0] === 'needs_processing') && n;
        return '<button class="ob-chip' + (d.bucket === pair[0] ? ' on' : '') + (red ? ' bad' : '') +
          '" data-ob="' + pair[0] + '">' + esc(pair[1]) + '<b>' + (n == null ? '—' : n) + '</b></button>';
      }).join('');
      var hasBuyer = (d.rows || []).some(function (r) { return r.buyer !== undefined; });
      var isNP = d.bucket === 'needs_processing';
      var h = '<div class="ob-chips">' + chips + '</div>';
      if (isNP) {
        h += '<p style="font-size:12px;color:var(--text-3);font-weight:600;margin:0 0 10px">No AliExpress order has been placed on these yet — oldest first. Past 1 BUSINESS day they ring the Order Processors and Ops. The moment the Ali order number lands in the day tab (or here via Add Ali), the order leaves this list within the hour.</p>';
      } else if (d.note) {
        h += '<p style="font-size:12px;color:var(--text-3);font-weight:600;margin:0 0 10px">' + esc(d.note) + '</p>';
      }
      if (!(d.rows || []).length) {
        h += '<div style="color:var(--text-2);font-weight:700;padding:14px 0">Nothing in this bucket' + (OB.account ? ' for ' + esc(OB.account) : '') + '.</div>';
      } else {
        h += '<div class="scroll"><table class="ob-tbl"><thead><tr>' +
          '<th>Order</th><th>Account</th><th>Item</th>' + (hasBuyer ? '<th>Buyer</th>' : '') +
          '<th>Value</th><th>Ordered</th><th>Ali order</th><th>Ship by</th><th>State</th></tr></thead><tbody>';
        (d.rows || []).forEach(function (r) {
          var ali = obAliNum(r);
          var aliCell;
          if (ali) {
            aliCell = '<button class="ob-copy" data-ali="' + esc(ali) + '" title="Copy the AliExpress order number — paste it into AliExpress or the tracking site">📋 ' + esc(ali.length > 12 ? ali.slice(0, 5) + '…' + ali.slice(-4) : ali) + '</button>' +
              (obStr(r.ali_link) ? ' <a href="' + esc(obStr(r.ali_link)) + '" target="_blank" rel="noopener noreferrer" style="color:var(--text-3);font-size:11px">open</a>' : '');
          } else if (obStr(r.ali_link)) {
            aliCell = '<a href="' + esc(obStr(r.ali_link)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;font-size:11.5px">Ali link</a>';
          } else if (r.status === 'NOT_STARTED') {
            aliCell = '<span class="ob-late" title="No AliExpress order recorded — sheet or portal">not processed</span>';
          } else {
            aliCell = '<span style="color:var(--text-3)">—</span>';
          }
          var ordered = esc(obStr(r.created_at).slice(0, 10));
          if (isNP) {
            var bd = obBizDays(r.created_at);
            ordered += ' <span class="' + (bd >= 1 ? 'ob-late' : 'ob-ok') + '">' + bd + ' biz day' + (bd === 1 ? '' : 's') + '</span>';
          }
          h += '<tr><td class="mono">' + '<a href="https://www.ebay.co.uk/sh/ord/details?orderid=' + encodeURIComponent(obStr(r.order_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline dotted">' + esc(obStr(r.order_id)) + '</a>' + '</td>' +
            '<td>' + esc(obStr(r.account)) + '</td>' +
            '<td><a href="https://www.ebay.co.uk/itm/' + esc(obStr(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit"><div style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(obStr(r.title) || obStr(r.item_id)) + '</div></a></td>' +
            (hasBuyer ? '<td>' + esc(obStr(r.buyer)) + '</td>' : '') +
            '<td class="mono">' + obGBP(r.sold) + '</td>' +
            '<td>' + ordered + '</td>' +
            '<td>' + aliCell + '</td>' +
            '<td>' + esc(obStr(r.ship_by).slice(0, 10) || '—') + '</td>' +
            '<td>' + obWhen(r) + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      box.innerHTML = h;
      box.querySelectorAll('[data-ob]').forEach(function (b) {
        b.onclick = function () { OB.bucket = this.getAttribute('data-ob'); obLoad(); };
      });
      box.querySelectorAll('[data-ali]').forEach(function (b) {
        b.onclick = function () { obCopy(this, this.getAttribute('data-ali')); };
      });
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:14px 0">Could not load the board.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.ordersBoard = {
    label: 'All orders',
    order: 3.5,
    roles: OB_ROLES,
    icon: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>',
    prefetch: function () { return api('ordersBoard', { bucket: 'awaiting' }); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>All <span class="goldtext">orders</span></h1>' +
          '<span class="sub">every date, straight from eBay’s own statuses · refreshed every 15 minutes · Ali order numbers ride in from the day tabs hourly</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">' +
            '<select class="alx-sel" id="obAcc"><option value="">All accounts</option></select>' +
            '<button class="minibtn" id="obRefresh">Refresh</button></div>' +
          '<div id="obBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      cachedCall('accountList', {}, function (d) {
        var sel = $('obAcc');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">All accounts</option>' + (((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
        sel.onchange = function () { OB.account = String(this.value || ''); obLoad(); };
      });
      var rf = $('obRefresh');
      if (rf) { rf.onclick = obLoad; }
      obLoad();
    }
  };
})();
