/* view-dispatch2.js — TRUTH v2 WO-07: the Dispatch page on the order truth model. Loads after
 * view-orders.js, so this registration replaces the old dispatch page (old code deleted in
 * Phase 6). Every tab IS a register metric's rows; every tile IS its count — they cannot
 * disagree. The workbook day-tab counters are gone: eBay's own order objects decide the state,
 * and refunded-never-sent orders sit in their own tab instead of haunting "late". */
(function () {
  'use strict';

  var D2 = { tab: 'LATE_NOW', data: null };

  var D2_TABS = [
    { id: 'LATE_NOW', label: 'Late now', money: true, tone: 'bad' },
    { id: 'DUE_3D', label: 'Due within 3 days' },
    { id: 'AWAITING_ONLY', label: 'Awaiting' },
    { id: 'SHIPPED_7D', label: 'Shipped · 7d', countOnly: true },
    { id: 'REFUNDED_NEVER_SENT', label: 'Refunded — never sent', money: true },
    { id: 'CANCELLED_30D', label: 'Cancelled · 30d', countOnly: true },
    { id: 'PENDING_PAYMENT', label: 'Pending payment' }
  ];

  VIEW_CSS.push(
    '.d2-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
    '.d2-tab{padding:9px 14px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text-2);font-weight:800;font-size:12px;cursor:pointer}' +
    '.d2-tab.on{background:var(--gold-a);color:#1a1204;border-color:var(--gold-a)}' +
    '.d2-tab .n{font-variant-numeric:tabular-nums;margin-left:7px;font-size:11px;padding:1px 7px;border-radius:99px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2)}' +
    '.d2-tab.on .n{background:rgba(0,0,0,.16);border-color:transparent;color:#1a1204}' +
    '.d2-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px}' +
    '.d2-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.d2-tbl td{padding:8px 11px;border-bottom:1px solid var(--gold-line);font-variant-numeric:tabular-nums}' +
    '.d2-hero{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:14px}' +
    '.d2-h{border:1px solid var(--gold-line);border-radius:12px;padding:12px 15px;background:var(--panel-2)}' +
    '.d2-h .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.d2-h b{display:block;font-size:23px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}'
  );

  function d2S(v) { return String(v == null ? '' : v); }
  function d2GBP(v) { return '£' + (Number(v) || 0).toFixed(2); }

  function d2Reason(o, tab) {
    var sb = d2S(o.ship_by).slice(0, 10);
    if (tab === 'LATE_NOW') {
      var days = Math.floor((Date.now() - Date.parse(d2S(o.ship_by))) / 86400000);
      return 'no dispatch; ship-by ' + sb + ' passed ' + (isFinite(days) ? days : '?') + ' day(s) ago';
    }
    if (tab === 'DUE_3D') { return 'paid, unshipped; ship-by ' + sb; }
    if (tab === 'AWAITING_ONLY') { return sb ? 'paid, unshipped; ship-by ' + sb : 'paid, unshipped; no ship-by from eBay'; }
    if (tab === 'REFUNDED_NEVER_SENT') { return 'FULLY_REFUNDED, no dispatch ever'; }
    if (tab === 'PENDING_PAYMENT') { return 'payment ' + d2S(o.payment_status); }
    return '';
  }

  function d2Paint() {
    var box = $('d2Body');
    if (!box || !D2.data) { return; }
    var M = D2.data.metrics;
    var tabs = '<div class="d2-tabs">' + D2_TABS.map(function (t) {
      var m = M[t.id];
      var n = t.countOnly ? m.value : (m.value && m.value.n !== undefined ? m.value.n : m.value);
      return '<button class="d2-tab' + (D2.tab === t.id ? ' on' : '') + '" data-d2="' + t.id + '">' + esc(t.label) +
        '<span class="n">' + n + (t.money && m.value && m.value.gbp ? ' · ' + d2GBP(m.value.gbp) : '') + '</span></button>';
    }).join('') + '</div>';

    var hero = '<div class="d2-hero">' +
      '<div class="d2-h"><span class="k">Open orders</span><b>' + M.AWAITING_DISPATCH.value + '</b><span style="font-size:10.5px;color:var(--text-3);font-weight:700">late + due + awaiting ' + mChip(M.AWAITING_DISPATCH) + '</span></div>' +
      '<div class="d2-h"><span class="k">Late right now</span><b style="color:var(--' + (M.LATE_NOW.value.n ? 'bad' : 'ok') + ')">' + M.LATE_NOW.value.n + '</b><span style="font-size:10.5px;color:var(--text-3);font-weight:700">' + d2GBP(M.LATE_NOW.value.gbp) + ' of orders ' + mChip(M.LATE_NOW) + '</span></div>' +
      '<div class="d2-h"><span class="k">Refunded — never sent</span><b>' + M.REFUNDED_NEVER_SENT.value.n + '</b><span style="font-size:10.5px;color:var(--text-3);font-weight:700">' + d2GBP(M.REFUNDED_NEVER_SENT.value.gbp) + ' · 120-day window</span></div>' +
      '</div>';

    var t = D2_TABS.filter(function (x) { return x.id === D2.tab; })[0];
    var m = M[D2.tab];
    var rows = (m.value && m.value.rows) || [];
    var body;
    if (t.countOnly) {
      body = '<div class="alx-empty">' + m.value + ' order(s) in this state. Counts come from the 120-day order history; the open tabs carry the row lists.</div>';
    } else if (!rows.length) {
      body = '<div class="alx-empty" style="color:var(--ok);font-weight:700">Nothing in this state — from eBay’s own open-order set, checked ' + esc(d2S((m.verify || {}).checkedAt).slice(11, 16)) + ' UTC.</div>';
    } else {
      body = '<div class="scroll"><table class="d2-tbl"><thead><tr><th>Account</th><th>Order</th><th>Value</th><th>Ship by</th><th>State reason</th></tr></thead><tbody>' +
        rows.map(function (o) {
          return '<tr><td style="font-weight:700">' + esc(d2S(o.account)) + '</td>' +
            '<td class="mono" style="font-size:11.5px">' + esc(d2S(o.order_id)) + '</td>' +
            '<td>' + d2GBP(o.sold) + '</td>' +
            '<td>' + esc(d2S(o.ship_by).slice(0, 10) || '—') + '</td>' +
            '<td style="font-size:11.5px;color:var(--text-2)">' + esc(d2Reason(o, D2.tab)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    box.innerHTML = tabs + hero + '<div class="card"><div class="hd">' + esc(t.label) + ' <span class="hint">the tile IS this list — same metric, same rows (TILE_EQUALS_LIST)</span></div><div class="bd">' + body + '</div></div>' +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Source: eBay Fulfillment API — the order object alone decides the state (WO-07). The open buckets read each account’s latest complete open pull, refreshed every 5 minutes; no workbook is consulted. As of ' + esc(d2S(D2.data.asOf).slice(11, 16)) + ' UTC.</p>';

    Array.prototype.forEach.call(box.querySelectorAll('[data-d2]'), function (b) {
      b.onclick = function () { D2.tab = this.getAttribute('data-d2'); d2Paint(); };
    });
  }

  function d2Load() {
    var box = $('d2Body');
    if (!box) { return; }
    /* re-entry: show what we already know THIS second, then refresh behind — an empty screen
       while a refetch runs read as broken (found in the 1 Sept click-through) */
    if (D2.data) { d2Paint(); } else { box.innerHTML = '<div class="spinner"></div>'; }
    truthPage({}).then(function (d) {
      D2.data = d;
      d2Paint();
    }).catch(function (e) {
      if ($('d2Body')) { $('d2Body').innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>'; }
    });
  }

  VIEWS.dispatch = {
    label: 'Dispatch',
    icon: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
    roles: ['Management', 'Ops Head', 'Order Processor', 'CS', 'Team Lead'],
    order: 3.6,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Dispatch</h1>' +
        '<span class="sub">every order in exactly one state, decided by eBay’s own order object — late means late</span>' +
        '<button class="minibtn" id="d2Refresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="d2Body"><div class="spinner"></div></div>';
    },
    init: function () {
      var rf = $('d2Refresh');
      if (rf) {
        rf.onclick = function () {
          rf.disabled = true; rf.textContent = 'Re-pulling from eBay…';
          api('runJobNow', { job: 'openSync' }).catch(function () {}).then(function () {
            TRUTH_CACHE = {};
            D2.data = null;
            d2Load();
            rf.disabled = false; rf.textContent = 'Refresh';
          });
        };
      }
      d2Load();
    }
  };
})();
