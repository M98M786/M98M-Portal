/* view-profitability.js — Product profitability (1 Oct, owner): "the profit of every item working
 * in the system — current profit, is it in a sale event, profit after the sale event, which prices
 * need revising … along with the margin show the avg CPC cost per order of the last 7 days, the
 * advertising status and the campaign." The price-revision rules stay the benchmark (profit under
 * £1 a unit or CPC over £2.10 a unit → revise; a loss after ads → stop; ads at 70% of the margin
 * → cut the bid). The cost-rise desk (Price revisions) keeps its own page; its open alerts are
 * flagged here too. Backend: profitBoard (engine). */
(function () {
  'use strict';

  var PF_ROLES = ['Management', 'Ops Head', 'Pricing', 'Advertising Manager'];
  var PF = { data: null, acct: '', q: '', only: 'all', sort: 'flags' };

  VIEW_CSS.push(
    '.pf-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.pf-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.pf-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.pf-t b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.pf-t.bad b{color:var(--bad)}.pf-t.ok b{color:var(--ok)}.pf-t.gold b{color:var(--gold-a)}' +
    '.pf-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}' +
    '.pf-chip{border:1px solid var(--gold-line);background:var(--panel);color:var(--text-2);border-radius:99px;padding:5px 12px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer}' +
    '.pf-chip.on{border-color:var(--gold-a);color:var(--gold-a)}' +
    '.pf-flag{display:inline-block;font-size:10px;font-weight:800;border-radius:99px;padding:1px 8px;margin:2px 3px 0 0;border:1px solid rgba(240,96,90,.5);color:var(--bad);white-space:nowrap}' +
    '.pf-flag.warn{border-color:rgba(255,159,67,.5);color:var(--warn)}' +
    '.pf-sale{font-size:10px;font-weight:800;border-radius:99px;padding:1px 8px;border:1px solid rgba(155,106,230,.5);color:#9B6AE6;white-space:nowrap}' +
    '.pf-camp{font-size:10.5px;font-weight:700;color:var(--text-2)}.pf-camp .s{color:var(--text-3)}' +
    '.pf-neg{color:var(--bad);font-weight:800}.pf-pos{color:var(--ok);font-weight:800}' +
    '.pf-sub{font-size:10px;color:var(--text-3);font-weight:700}'
  );

  function pfS(v) { return String(v == null ? '' : v); }
  function pfN(v) { return Number(v) || 0; }
  function pfM(v) {
    if (v === null || v === undefined || v === '') { return '—'; }
    var n = Number(v) || 0;
    return (n < 0 ? '-£' : '£') + Math.abs(n).toFixed(2);
  }
  function pfTone(v) {
    if (v === null || v === undefined || v === '') { return ''; }
    return Number(v) < 0 ? 'pf-neg' : Number(v) > 0 ? 'pf-pos' : '';
  }

  VIEWS.profitability = {
    label: 'Product profitability',
    icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    roles: PF_ROLES,
    order: 12.4,
    prefetch: function () { return api('profitBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Product <span class="goldtext">profitability</span></h1>' +
          '<span class="sub">every active item: margin now, the sale event and the margin after it, profit after ads over 7 and 30 days, CPC per unit, the campaign — and which prices need revising</span>' +
          '<span style="margin-left:auto;display:flex;gap:6px;align-items:center">' +
          '<select id="pfAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
          '<button class="minibtn" id="pfRefresh">Refresh</button></span></div>' +
        '<div id="pfTiles" class="enter d1"></div>' +
        '<div class="card enter d2"><div class="bd" id="pfBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var sa = $('pfAcct');
      if (sa) { fillAccountSelect(sa, PF.acct, function () { PF.acct = sa.value; PF.data = null; pfLoad(); }); }
      $('pfRefresh').onclick = function () { PF.data = null; pfLoad(); };
      pfLoad();
    }
  };

  function pfLoad() {
    var box = $('pfBody');
    if (!box) { return; }
    if (!PF.data) { box.innerHTML = '<div class="spinner"></div>'; }
    api('profitBoard', PF.acct ? { account: PF.acct } : {}).then(function (d) { PF.data = d || {}; pfPaint(); })
      .catch(function (e) { box.innerHTML = '<div class="empty">The board did not answer — ' + esc(e.message) + '</div>'; });
  }

  function pfPaint() {
    var d = PF.data, box = $('pfBody');
    if (!d || !box) { return; }
    var c = d.counts || {}, b = d.benchmarks || {};
    setHTML('pfTiles', '<div class="pf-tiles">' +
      '<div class="pf-t"><span class="k">Active items</span><b>' + (c.items || 0) + '</b></div>' +
      '<div class="pf-t bad"><span class="k">Need a price revision</span><b>' + (c.revise || 0) + '</b></div>' +
      '<div class="pf-t bad"><span class="k">Loss after ads · 7 days</span><b>' + (c.loss_7d || 0) + '</b></div>' +
      '<div class="pf-t gold"><span class="k">In a sale event</span><b>' + (c.in_sale || 0) + '</b></div>' +
      '<div class="pf-t"><span class="k">On CPC campaigns</span><b>' + (c.cpc_items || 0) + '</b></div>' +
      '<div class="pf-t ok"><span class="k">Selling · 7 days</span><b>' + (c.selling_7d || 0) + '</b></div>' +
      '<div class="pf-t' + (c.cost_rises ? ' bad' : '') + '"><span class="k">Open cost rises</span><b>' + (c.cost_rises || 0) + '</b></div></div>');

    var rows = (d.rows || []).slice();
    if (PF.only === 'revise') { rows = rows.filter(function (r) { return r.revise; }); }
    else if (PF.only === 'sale') { rows = rows.filter(function (r) { return r.sale; }); }
    else if (PF.only === 'cpc') { rows = rows.filter(function (r) { return r.campaign && r.campaign.is_cpc; }); }
    else if (PF.only === 'selling') { rows = rows.filter(function (r) { return r.units_7d > 0; }); }
    if (PF.q) {
      var q = PF.q.toLowerCase();
      rows = rows.filter(function (r) { return pfS(r.title).toLowerCase().indexOf(q) >= 0 || pfS(r.item_id).indexOf(q) >= 0; });
    }
    if (PF.sort === 'profit7') { rows.sort(function (a, b2) { return pfN(a.profit_7d) - pfN(b2.profit_7d); }); }
    else if (PF.sort === 'units') { rows.sort(function (a, b2) { return pfN(b2.units_7d) - pfN(a.units_7d); }); }
    else if (PF.sort === 'margin') { rows.sort(function (a, b2) { return (a.margin_now === null ? 99 : pfN(a.margin_now)) - (b2.margin_now === null ? 99 : pfN(b2.margin_now)); }); }
    else if (PF.sort === 'cpc') { rows.sort(function (a, b2) { return pfN(b2.cpc_per_unit_7d) - pfN(a.cpc_per_unit_7d); }); }

    var chip = function (k, l, cur, attr) { return '<button class="pf-chip' + (cur === k ? ' on' : '') + '" data-' + attr + '="' + k + '">' + l + '</button>'; };
    var h = '<div class="pf-tools">' +
      chip('all', 'All', PF.only, 'pf-only') + chip('revise', 'Needs revision', PF.only, 'pf-only') + chip('selling', 'Selling · 7d', PF.only, 'pf-only') +
      chip('sale', 'In a sale event', PF.only, 'pf-only') + chip('cpc', 'On CPC', PF.only, 'pf-only') +
      '<span class="pf-sub" style="margin-left:8px">sort</span>' +
      chip('flags', 'Worst first', PF.sort, 'pf-sort') + chip('profit7', 'Profit 7d', PF.sort, 'pf-sort') + chip('margin', 'Margin', PF.sort, 'pf-sort') +
      chip('cpc', 'CPC/unit', PF.sort, 'pf-sort') + chip('units', 'Units 7d', PF.sort, 'pf-sort') +
      '<input class="src-input" id="pfQ" placeholder="Search title or item id…" value="' + esc(PF.q) + '" style="margin-left:auto">' +
      '<span class="pf-sub">' + rows.length + ' of ' + (d.rows || []).length + '</span></div>';

    h += '<div class="scroll" style="max-height:640px"><table class="ir-tbl" style="min-width:1240px"><thead><tr>' +
      '<th style="text-align:left">Item</th><th>Price</th><th>Ali cost</th><th>Margin now</th><th style="text-align:left">Sale event</th><th>After sale</th>' +
      '<th>Units 7d</th><th>Profit 7d</th><th>Per unit 7d</th><th>Units 30d</th><th>Per unit 30d</th>' +
      '<th>Ads 7d</th><th>CPC / unit 7d</th><th style="text-align:left">Campaign</th><th style="text-align:left">Verdict</th></tr></thead><tbody>';
    if (!rows.length) { h += '<tr><td colspan="15" style="text-align:left"><div class="empty">Nothing matches.</div></td></tr>'; }
    rows.slice(0, 600).forEach(function (r) {
      var cmp = r.campaign, sale = r.sale;
      h += '<tr' + (r.revise ? ' class="ir-hot"' : '') + '>' +
        '<td style="text-align:left;max-width:300px"><a href="https://www.ebay.co.uk/itm/' + esc(pfS(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;font-weight:700">' + esc(pfS(r.title).slice(0, 70) || pfS(r.item_id)) + '</a>' +
          '<div class="pf-sub"><span class="mono">' + esc(pfS(r.item_id)) + '</span> · ' + esc(pfS(r.account)) +
          (r.cost_pending_7d ? ' · ' + r.cost_pending_7d + ' order' + (r.cost_pending_7d === 1 ? '' : 's') + ' awaiting cost' : '') + '</div></td>' +
        '<td>' + pfM(r.price) + '</td><td>' + (r.ali_cost ? pfM(r.ali_cost) : '—') + '</td>' +
        '<td class="' + pfTone(r.margin_now) + '">' + pfM(r.margin_now) + '</td>' +
        '<td style="text-align:left">' + (sale ? '<span class="pf-sale" title="' + esc(pfS(sale.name)) + '">' + esc(pfS(sale.discount) || pfS(sale.type)) + '</span>' +
          (sale.end_at ? '<div class="pf-sub">ends ' + esc(pfS(sale.end_at).slice(0, 10)) + '</div>' : '') : '<span class="pf-sub">—</span>') + '</td>' +
        '<td class="' + pfTone(r.margin_after_sale) + '">' + (sale ? pfM(r.margin_after_sale) : '<span class="pf-sub">same</span>') + '</td>' +
        '<td>' + (r.units_7d || '—') + '</td><td class="' + pfTone(r.profit_7d) + '">' + (r.units_7d ? pfM(r.profit_7d) : '—') + '</td>' +
        '<td class="' + pfTone(r.profit_per_unit_7d) + '">' + pfM(r.profit_per_unit_7d) + '</td>' +
        '<td>' + (r.units_30d || '—') + '</td><td class="' + pfTone(r.profit_per_unit_30d) + '">' + pfM(r.profit_per_unit_30d) + '</td>' +
        '<td>' + (r.ads_7d ? pfM(r.ads_7d) : '—') + '</td>' +
        '<td' + (r.cpc_per_unit_7d !== null && r.cpc_per_unit_7d !== undefined && r.cpc_per_unit_7d > (b.max_cpc_per_unit || 2.1) ? ' class="pf-neg"' : '') + '>' + pfM(r.cpc_per_unit_7d) + '</td>' +
        '<td style="text-align:left">' + (cmp ? '<div class="pf-camp">' + esc(pfS(cmp.name).slice(0, 36)) + '<div class="s">' + esc(pfS(cmp.status)) + (cmp.is_cpc ? ' · CPC' : ' · general') +
          (cmp.bid_pct ? ' · ' + esc(pfS(cmp.bid_pct)) + '%' : '') + (pfS(cmp.ad_status) ? ' · ad ' + esc(pfS(cmp.ad_status)) : '') + '</div></div>' : '<span class="pf-sub">no campaign</span>') + '</td>' +
        '<td style="text-align:left;max-width:260px;white-space:normal">' + ((r.flags || []).length
          ? r.flags.map(function (f) { return '<span class="pf-flag' + (/cost rose|ads take/.test(f) ? ' warn' : '') + '">' + esc(f) + '</span>'; }).join('')
          : '<span class="pf-sub">fine</span>') + '</td></tr>';
    });
    h += '</tbody></table></div>' +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Benchmarks — revise when profit is under ' + pfM(b.min_profit_per_unit || 1) + ' a unit or CPC over ' +
      pfM(b.max_cpc_per_unit || 2.1) + ' a unit (7 days); a loss after ads → stop the ads; ads at ' + Math.round((b.ads_share_cut || 0.7) * 100) + '% of the margin → cut the bid. ' +
      esc(pfS(d.note)) + ' Supplier cost rises are acknowledged on the Price revisions desk.</p>';
    box.innerHTML = h;
    box.querySelectorAll('[data-pf-only]').forEach(function (x) { x.onclick = function () { PF.only = this.getAttribute('data-pf-only'); pfPaint(); }; });
    box.querySelectorAll('[data-pf-sort]').forEach(function (x) { x.onclick = function () { PF.sort = this.getAttribute('data-pf-sort'); pfPaint(); }; });
    var qi = $('pfQ');
    if (qi) {
      qi.oninput = function () {
        PF.q = String(this.value || '').trim(); pfPaint();
        var q2 = $('pfQ');
        if (q2) { q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); }
      };
    }
  }

})();
