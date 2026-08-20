/* view-vatBreakdown.js — review 3: "no vat page mentioned here, i need proper breakdown of
 * calculations". The whole profit law as a visible waterfall, every line a live number from
 * the P&L brain (itemPnl) for any range, collective or one account. Management/Ops only. */
(function () {

  var VB = { mode: 'd7', from: '', to: '', acct: '' };

  VIEW_CSS.push(
    '.vb-wf{max-width:760px}' +
    '.vb-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 14px;border-bottom:1px solid var(--gold-line)}' +
    '.vb-row .l{font-weight:700}' +
    '.vb-row .l em{font-style:normal;display:block;font-size:11px;color:var(--text-3);font-weight:600}' +
    '.vb-row .v{font-variant-numeric:tabular-nums;font-weight:800;white-space:nowrap}' +
    '.vb-row.head{background:var(--panel-2);border-radius:10px 10px 0 0}' +
    '.vb-row.total{background:var(--panel-2);border-radius:0 0 10px 10px;font-size:15px}' +
    '.vb-neg .v{color:var(--bad)}.vb-pos .v{color:var(--ok)}.vb-info .v{color:var(--text-3)}'
  );

  function vbGBP(v) { var n = Number(v) || 0; return (n < 0 ? '−£' : '£') + Math.abs(n).toFixed(2); }

  function vbRange() {
    var t = ukToday();
    function shift(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
    if (VB.mode === 'today') { return { from: t, to: t, label: 'Today' }; }
    if (VB.mode === 'yday') { var y = shift(t, -1); return { from: y, to: y, label: 'Yesterday' }; }
    if (VB.mode === 'd30') { return { from: shift(t, -29), to: t, label: 'Last 30 days' }; }
    if (VB.mode === 'custom' && VB.from && VB.to) { return { from: VB.from, to: VB.to, label: VB.from + ' → ' + VB.to }; }
    return { from: shift(t, -6), to: t, label: 'Last 7 days' };
  }

  function vbLoad() {
    var box = $('vbBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    var r = vbRange();
    var payload = { from: r.from, to: r.to };
    if (VB.acct) { payload.account = VB.acct; }
    api('itemPnl', payload).then(function (d) {
      var t = (d && d.total) || {};
      function n(k) { return Number(t[k]) || 0; }
      function row(cls, label, hint, val, sign) {
        return '<div class="vb-row ' + cls + '"><span class="l">' + esc(label) + (hint ? '<em>' + esc(hint) + '</em>' : '') + '</span>' +
          '<span class="v">' + (sign || '') + vbGBP(val) + '</span></div>';
      }
      var h = '<div class="vb-wf">' +
        row('head', 'Revenue (sold)', n('orders_n') + ' orders · ' + n('qty') + ' units — the buyers\' money in', n('revenue')) +
        row('vb-info', 'VAT inside the selling price', '20% owed to HMRC on every sale — £' + (n('vat_out')).toFixed(2) + ' of the revenue is not yours', n('vat_out'), '') +
        row('vb-neg', 'eBay fees (real, from Finances)', 'final value + fixed + regulatory + GENERAL campaign fees — VAT on fees £' + n('fees_vat').toFixed(2) + ' included', -(n('fees') + n('fees_vat')), '') +
        row('', 'Order earning (OE)', 'revenue − real eBay fees — the money eBay actually pays out', n('oe')) +
        row('vb-neg', 'AliExpress cost', 'the day tabs\' real paid cost · £' + n('ali_vat').toFixed(2) + ' input VAT reclaimable', -n('ali_cost'), '') +
        row('', '× 0.8 — the VAT law', '0.8 × (OE − Ali): deduct the 20% selling-price VAT, reclaim the 20% cost-price VAT · VAT to HMRC ≈ £' + n('vat_hmrc').toFixed(2), 0.8 * (n('oe') - n('ali_cost'))) +
        row('vb-neg', 'CPC ad fees (ex VAT)', 'the per-click family — the GENERAL family is already inside the eBay fees above (never counted twice) · incl VAT £' + n('pri_incl').toFixed(2), -n('pri_fees'), '') +
        row('', 'Raw profit', '0.8 × (OE − Ali) − CPC ads — the sheet\'s Raw', n('raw_profit')) +
        row('vb-neg', 'Returns', 'real refunds from eBay Finances', -n('returns'), '') +
        row('total ' + (n('actual_profit') < 0 ? 'vb-neg' : 'vb-pos'), 'ACTUAL PROFIT', 'what is truly yours for ' + r.label, n('actual_profit')) +
        '</div>' +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:10px">' +
        (VB.acct ? esc(VB.acct) : 'All accounts') + ' · ' + esc(r.from) + ' → ' + esc(r.to) +
        ' · margin ' + (n('revenue') ? (n('actual_profit') / n('revenue') * 100).toFixed(2) : '0') + '%' +
        ' · all ads incl VAT £' + ((n('pri_fees') + n('gen_ex')) * 1.2).toFixed(2) +
        ' · ' + (Number(t.fees_n) < Number(t.orders_n) ? (t.fees_n + ' of ' + t.orders_n + ' orders have real fees so far — the rest ride the honest fallback') : 'real eBay fees on every order') + '</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not compute the breakdown.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.vatBreakdown = {
    label: 'VAT breakdown',
    order: 9.5,
    roles: ['Management', 'Ops Head'],
    icon: '<path d="M9 14l6-6M9.5 8.5h.01M14.5 13.5h.01"/><rect x="3" y="4" width="18" height="16" rx="2"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>VAT <span class="goldtext">breakdown</span></h1>' +
        '<span class="sub">every step of the profit calculation, live — the central sheet\'s law with real numbers in each line</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
        [['today', 'Today'], ['yday', 'Yesterday'], ['d7', '7 days'], ['d30', '30 days']].map(function (p) {
          return '<button class="minibtn' + (VB.mode === p[0] ? ' on' : '') + '" data-vb-m="' + p[0] + '">' + p[1] + '</button>';
        }).join('') +
        '<select id="vbAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
        '<input type="date" id="vbFrom" class="minibtn" style="padding:5px 6px"><input type="date" id="vbTo" class="minibtn" style="padding:5px 6px">' +
        '<button class="minibtn" id="vbApply">Apply</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="vbBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      document.querySelectorAll('[data-vb-m]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-vb-m]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          VB.mode = this.getAttribute('data-vb-m'); VB.from = ''; VB.to = '';
          vbLoad();
        };
      });
      var sel = $('vbAcct');
      if (sel) {
        ['AZHAR ABRT', 'Amna Baji', 'Azhar Bhai', 'HAFIZA BHAJI', 'Saif Bhai'].forEach(function (a) {
          var o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o);
        });
        sel.value = VB.acct || '';
        sel.onchange = function () { VB.acct = sel.value; vbLoad(); };
      }
      var ap = $('vbApply');
      if (ap) {
        ap.onclick = function () {
          var f = $('vbFrom'), t = $('vbTo');
          if (f && t && f.value && t.value) { VB.mode = 'custom'; VB.from = f.value; VB.to = t.value; vbLoad(); }
          else { toast('Pick both dates first.'); }
        };
      }
      vbLoad();
    }
  };
})();
