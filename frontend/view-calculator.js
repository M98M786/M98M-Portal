/* view-calculator.js — V2 req 20: the Order-Earning calculator, in the portal, role-versioned.
 * One authority: the backend Brain v17 (calcProjectedProfit) with each account's own ⚙ Config —
 * the same engine that gates hunts, so a hunter's calculator can never disagree with the
 * approval screen. Full roles additionally see the fee breakdown; employee editions see the
 * order earning and their own profit figure only (the v15.4 Employee precedent). */
(function () {

  var OC_FULL = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];
  var OC_ROLES = OC_FULL.concat(['Product Hunter', 'Item Lister', 'Listing Manager', 'Order Processor', 'Pricing']);

  VIEW_CSS.push(
    '.oc-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}' +
    '.oc-out{margin-top:18px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}' +
    '.oc-tile{padding:16px;border:1px solid var(--gold-line);border-radius:12px;text-align:center}' +
    '.oc-tile .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800}' +
    '.oc-tile .v{font-size:24px;font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}' +
    '.oc-tile.gold .v{color:var(--gold-a)}' +
    '.oc-tile.good .v{color:var(--ok)}' +
    '.oc-tile.bad .v{color:var(--bad)}' +
    '.oc-fees{margin-top:14px;border:1px solid var(--gold-line);border-radius:12px;overflow:hidden}' +
    '.oc-fees .r{display:flex;justify-content:space-between;padding:9px 14px;font-size:12.5px}' +
    '.oc-fees .r:nth-child(even){background:rgba(120,132,152,.07)}' +
    '.oc-fees .r b{font-variant-numeric:tabular-nums}' +
    '.oc-note{margin-top:12px;font-size:12px;color:var(--text-3);font-weight:600;line-height:1.6}'
  );

  function ocN(id) { var v = parseFloat(($(id) || {}).value); return isFinite(v) ? v : 0; }
  function ocGBP(v) { return '£' + (Math.round(v * 100) / 100).toFixed(2); }

  function ocFull() { return OC_FULL.indexOf((STATE.user && STATE.user.role) || '') >= 0 || (STATE.user && STATE.user.isSuper); }

  function ocCalc() {
    var btn = $('ocGo'), out = $('ocOut');
    if (!out) { return; }
    var soldFor = ocN('ocPrice');
    if (!soldFor) { toast('Enter the selling price first'); return; }
    btn.disabled = true; btn.textContent = 'Calculating…';
    api('calcProjectedProfit', {
      soldFor: soldFor,
      sourcePrice: ocN('ocSource'),
      shipping: ocN('ocShip'),
      account: ($('ocAcc') || {}).value || '',
      category: ($('ocCat') || {}).value || '',
    }).then(function (d) {
      var full = ocFull();
      var h = '<div class="oc-out">' +
        '<div class="oc-tile gold"><div class="k">Order earning</div><div class="v">' + ocGBP(d.orderEarning) + '</div></div>' +
        '<div class="oc-tile ' + (d.profit >= 0 ? 'good' : 'bad') + '"><div class="k">Profit on this order</div><div class="v">' + ocGBP(d.profit) + '</div></div>' +
        (full && d.roiPct != null ? '<div class="oc-tile"><div class="k">ROI</div><div class="v">' + (Math.round(d.roiPct * 10) / 10) + '%</div></div>' : '') +
        '</div>';
      if (full && d.breakdown) {
        h += '<div class="oc-fees">' +
          '<div class="r"><span>Final value fee (' + (Math.round(d.fvf * 1000) / 10) + '%)</span><b>' + ocGBP(d.breakdown.fvfFee) + '</b></div>' +
          '<div class="r"><span>Per-order fee</span><b>' + ocGBP(d.breakdown.perOrderFee) + '</b></div>' +
          '<div class="r"><span>Regulatory fee</span><b>' + ocGBP(d.breakdown.regulatoryFee) + '</b></div>' +
          '<div class="r"><span>VAT on fees</span><b>' + ocGBP(d.breakdown.vat) + '</b></div>' +
          '<div class="r"><span><b>Total taken by eBay</b></span><b>' + ocGBP(d.fees) + '</b></div>' +
          '</div>';
      }
      if (d.configMissing) {
        h += '<div class="oc-note">⚠ This account’s ⚙ Config tab is not connected — the calculation used the default rates. The figure is close but not account-exact.</div>';
      }
      h += '<div class="oc-note">Calculated by the same Brain v17 engine that approves hunts, using ' +
        (($('ocAcc') || {}).value ? 'the account’s own fee configuration' : 'the default fee configuration') +
        '. Advertising cost is not included — ads come out of this profit.</div>';
      out.innerHTML = h;
    }).catch(function (e) {
      out.innerHTML = '<div class="oc-note">Could not calculate: ' + esc(e.message) + '</div>';
    }).then(function () { btn.disabled = false; btn.textContent = 'Calculate'; });
  }

  VIEWS.calculator = {
    label: 'Order earning calculator',
    order: 21,
    roles: OC_ROLES,
    icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Order <span class="goldtext">earning</span></h1>' +
          '<span class="sub">What one sale actually leaves after eBay — per account, per category</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div class="oc-grid">' +
            '<div class="field"><label>Selling price £</label><input class="tk-in" id="ocPrice" type="number" step="0.01" min="0" placeholder="19.99"></div>' +
            '<div class="field"><label>Source price £</label><input class="tk-in" id="ocSource" type="number" step="0.01" min="0" placeholder="3.20"></div>' +
            '<div class="field"><label>Shipping £</label><input class="tk-in" id="ocShip" type="number" step="0.01" min="0" placeholder="0"></div>' +
            '<div class="field"><label>Account</label><select class="tk-in" id="ocAcc"><option value="">Default rates</option></select></div>' +
            '<div class="field"><label>Category (optional)</label><input class="tk-in" id="ocCat" placeholder="as in ⚙ Config"></div>' +
          '</div>' +
          '<div style="margin-top:14px"><button class="btn-gold" id="ocGo">Calculate</button></div>' +
          '<div id="ocOut"></div>' +
        '</div></div>';
    },
    init: function () {
      var go = $('ocGo');
      if (go) { go.onclick = ocCalc; }
      var price = $('ocPrice');
      if (price) { price.onkeydown = function (e) { if (e.key === 'Enter') { ocCalc(); } }; }
      cachedCall('accountList', {}, function (d) {
        var sel = $('ocAcc');
        if (!sel) { return; }
        var keep = sel.value;
        sel.innerHTML = '<option value="">Default rates</option>' + ((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '');
          return n ? '<option' + (n === keep ? ' selected' : '') + '>' + esc(n) + '</option>' : '';
        }).join('');
      });
    }
  };
})();
