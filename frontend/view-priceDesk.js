/* view-priceDesk.js — Price revision (31 Oct, Zaid's brief: "every single product running in the
 * system — calculate its profit the way the calculator does, identify what needs revising, give me
 * revise / don't revise / end per item, item-ID search with the AliExpress cost and the order link,
 * and tier the supplier's price moves 10p / 20p / 30p / 50p / £1 with a formal assessment").
 * One engine read (priceRevisionBoard) judges every ACTIVE listing by Sir Hasib's calculator at the
 * price buyers actually paid; priceItemDetail is the item-ID search; a verdict goes to Apps Script's
 * decisionAct (the listing task, exactly as Listing decisions raises it) and is recorded by
 * priceDecide, which also settles the item's open supplier alert. Roles: Management, Ops Head,
 * Pricing — per-unit profit sits on every row, so Team Lead stays out (the profit gate). */
(function () {
  'use strict';

  var PR_ROLES = ['Management', 'Ops Head', 'Pricing'];
  var PR = { data: null, acct: '', tab: 'revise', q: '', seg: 'all', sort: 'gap', showKept: false, detail: null, busy: false };
  var PR_SEG = {
    raise: ['Raise price', 'bad'], ads_high: ['Ads too high', 'warn'], reduce: ['Room to reduce', 'gold'], on_target: ['On target', 'ok'],
    dormant: ['No sales · 30d', 'mute'], spending_no_sales: ['Spending, no sales', 'bad'], cost_missing: ['Cost missing', 'warn']
  };
  var PR_TIER = { critical: ['Critical alert', 'bad'], red: ['Red alert', 'bad'], serious: ['Serious risk', 'warn'], moderate: ['Moderate risk', 'gold'], low: ['Low risk', 'mute'], '': ['Under 10p', 'mute'] };
  var PR_VERDICT = { downgrade: ['Downgrade — change supplier', 'bad'], watch: ['Watch', 'warn'], continue: ['Continue', 'ok'] };

  VIEW_CSS.push(
    '.pr-tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));margin-bottom:14px}' +
    '.pr-t{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2)}' +
    '.pr-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.pr-t b{display:block;font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.pr-t .s{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.pr-t.bad b{color:var(--bad)}.pr-t.ok b{color:var(--ok)}.pr-t.gold b{color:var(--gold-a)}.pr-t.warn b{color:var(--warn)}' +
    '.pr-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}' +
    '.pr-chip{border:1px solid var(--gold-line);background:var(--panel);color:var(--text-2);border-radius:99px;padding:5px 12px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer}' +
    '.pr-chip.on{border-color:var(--gold-a);color:var(--gold-a)}.pr-chip b{font-variant-numeric:tabular-nums}' +
    '.pr-in{padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;min-width:200px}' +
    '.pr-tag{display:inline-block;font-size:10px;font-weight:800;border-radius:99px;padding:1px 8px;margin:2px 3px 0 0;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}' +
    '.pr-tag.bad{border-color:rgba(240,96,90,.55);color:var(--bad)}.pr-tag.warn{border-color:rgba(255,159,67,.55);color:var(--warn)}' +
    '.pr-tag.ok{border-color:rgba(72,199,142,.5);color:var(--ok)}.pr-tag.gold{border-color:var(--gold-a);color:var(--gold-a)}.pr-tag.mute{color:var(--text-3)}' +
    '.pr-tag.sale{border-color:rgba(155,106,230,.5);color:#9B6AE6}' +
    '.pr-tbl{width:100%;border-collapse:collapse;font-size:12px}.pr-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;padding:7px 8px;text-align:right;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.pr-tbl td{padding:8px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums;vertical-align:top;white-space:nowrap}' +
    '.pr-tbl th.l,.pr-tbl td.l{text-align:left}.pr-tbl td.w{white-space:normal}.pr-tbl tr.hot td{background:var(--bad-soft)}' +
    '.pr-scroll{overflow:auto;max-height:680px}' +
    '.pr-item{display:flex;gap:9px;align-items:flex-start;min-width:260px;max-width:360px;white-space:normal}' +
    '.pr-item img{width:40px;height:40px;border-radius:8px;object-fit:cover;flex:none;background:var(--panel-2)}' +
    '.pr-item .t{font-weight:800;font-size:12.5px;line-height:1.3}.pr-item .t a{color:inherit}' +
    '.pr-item .m{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:2px;line-height:1.5}' +
    '.pr-item .m a{color:var(--gold-a);cursor:pointer;text-decoration:none}' +
    '.pr-neg{color:var(--bad);font-weight:800}.pr-pos{color:var(--ok);font-weight:800}.pr-sub{font-size:10px;color:var(--text-3);font-weight:700}' +
    '.pr-acts{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}' +
    '.pr-acts .minibtn{padding:4px 9px;font-size:11px}' +
    '.pr-box{border:1px solid var(--gold-line-hi);border-radius:10px;padding:10px 12px;margin:6px 0 2px;background:var(--panel-2);text-align:left;white-space:normal}' +
    '.pr-box .f{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:8px}' +
    '.pr-box label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;margin-bottom:3px}' +
    '.pr-box input,.pr-box textarea{width:100%;box-sizing:border-box;padding:7px 9px;border-radius:8px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.pr-box textarea{min-height:58px;resize:vertical}' +
    '.pr-alert{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel)}' +
    '.pr-alert.open{background:var(--bad-soft);border-color:rgba(240,96,90,.4)}.pr-alert.open.low,.pr-alert.open.moderate{background:var(--panel);border-color:var(--gold-line-hi)}' +
    '.pr-alert .h{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pr-alert .h .t{font-weight:800;font-size:13px}.pr-alert .h .t a{color:inherit}' +
    '.pr-alert .nums{display:flex;gap:14px;flex-wrap:wrap;margin-top:7px;font-size:12px;font-weight:700}' +
    '.pr-alert .sug{margin-top:7px;font-size:12px;font-weight:700;color:var(--text-2)}.pr-alert .sug b{color:var(--gold-a)}' +
    '.pr-det{border:1px solid var(--gold-a);border-radius:14px;padding:14px 16px;margin-bottom:14px;background:var(--panel)}' +
    '.pr-det h2{font-size:15px;margin:0 0 4px}.pr-det h2 a{color:inherit}' +
    '.pr-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));margin-top:10px}' +
    '.pr-blk{border:1px solid var(--gold-line);border-radius:10px;padding:10px 12px;background:var(--panel-2)}' +
    '.pr-blk h3{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin:0 0 6px;font-weight:800}' +
    '.pr-blk .r{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:12px;font-weight:600}.pr-blk .r b{font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.pr-blk .r.tot{border-top:1px solid var(--gold-line);padding-top:5px;margin-top:3px;font-weight:800}.pr-blk .r.big b{color:var(--gold-a)}' +
    '.pr-blk .r em{font-style:normal;color:var(--text-3);font-size:10.5px;display:block}' +
    '.pr-blk a{color:var(--gold-a);word-break:break-all}' +
    '.pr-note{font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px;line-height:1.55}'
  );

  function prS(v) { return String(v == null ? '' : v); }
  function prN(v) { return Number(v) || 0; }
  function prM(v) {
    if (v === null || v === undefined || v === '') { return '—'; }
    var n = Number(v) || 0;
    return (n < 0 ? '-£' : '£') + Math.abs(n).toFixed(2);
  }
  function prTone(v) { if (v === null || v === undefined || v === '') { return ''; } return Number(v) < 0 ? 'pr-neg' : Number(v) > 0 ? 'pr-pos' : ''; }
  function prP(v) { var p = Math.round(prN(v) * 100); return (p > 0 ? '+' : '') + p + 'p'; }
  function prTag(def, key) { var d = def[key] || [key, 'mute']; return '<span class="pr-tag ' + d[1] + '">' + esc(d[0]) + '</span>'; }
  function prWhen(iso) { return esc(fmtPkt(iso, true) || prS(iso).slice(0, 16) || '—'); }
  function prMe() { return STATE.user ? prS(STATE.user.email) : ''; }
  function prCan() { return !!(PR.data && PR.data.can_act); }

  VIEWS.priceDesk = {
    label: 'Price revision',
    icon: '<path d="M12 3v18"/><path d="M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/>',
    roles: PR_ROLES,
    order: 12.5,
    prefetch: function () { return api('priceRevisionBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Price <span class="goldtext">revision</span></h1>' +
          '<span class="sub">every live listing judged by the Order earning calculator — what a unit really makes, what it must sell at, which supplier costs are moving, and what was decided</span>' +
          '<span style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
          '<input class="pr-in" id="prQ" placeholder="Item ID → full card · or search titles" value="' + esc(PR.q) + '">' +
          '<button class="minibtn" id="prLookup">Look up</button>' +
          '<select id="prAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
          '<button class="minibtn" id="prRefresh">Refresh</button></span></div>' +
        '<div id="prDetail"></div>' +
        '<div id="prTiles" class="enter d1"></div>' +
        '<div class="card enter d2"><div class="bd" id="prBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var sa = $('prAcct');
      if (sa) { fillAccountSelect(sa, PR.acct, function () { PR.acct = sa.value; PR.data = null; prLoad(); }); }
      $('prRefresh').onclick = function () { PR.data = null; prLoad(); };
      var q = $('prQ');
      var go = function () {
        var v = prS(q.value).trim();
        if (/^\d{9,14}$/.test(v)) { prLookup(v); return; }
        PR.q = v; PR.tab = PR.tab === 'revise' || PR.tab === 'all' ? PR.tab : 'all'; prPaint();
      };
      q.oninput = function () { var v = prS(this.value).trim(); if (!/^\d{9,14}$/.test(v)) { PR.q = v; prPaint(); } };
      q.onkeydown = function (ev) { if (ev.key === 'Enter') { go(); } };
      $('prLookup').onclick = go;
      prLoad();
    }
  };

  function prLoad(quiet) {
    var box = $('prBody');
    if (!box) { return; }
    if (!PR.data && !quiet) { box.innerHTML = '<div class="spinner"></div>'; }
    api('priceRevisionBoard', PR.acct ? { account: PR.acct } : {}).then(function (d) { PR.data = d || {}; prPaint(); })
      .catch(function (e) { if (!quiet) { box.innerHTML = '<div class="empty">The desk did not answer — ' + esc(e.message) + '</div>'; } });
  }

  /* ---------- tiles ---------- */
  function prTiles() {
    var d = PR.data, c = d.counts || {}, bt = c.alerts_by_tier || {};
    var tierLine = ['critical', 'red', 'serious', 'moderate', 'low'].filter(function (k) { return bt[k]; })
      .map(function (k) { return bt[k] + ' ' + PR_TIER[k][0].toLowerCase(); }).join(' · ');
    setHTML('prTiles', '<div class="pr-tiles">' +
      '<div class="pr-t"><span class="k">Live listings</span><b>' + prN(c.items) + '</b><span class="s">' + prN(c.selling_30d) + ' sold in 30 days</span></div>' +
      '<div class="pr-t bad"><span class="k">Raise price</span><b>' + prN(c.raise) + '</b><span class="s">under target, ads not the cause</span></div>' +
      '<div class="pr-t warn"><span class="k">Ads too high</span><b>' + prN(c.ads_high) + '</b><span class="s">CPC £2+ a unit, under target</span></div>' +
      '<div class="pr-t bad"><span class="k">Losing money</span><b>' + prN(c.loss) + '</b><span class="s">actual profit below zero</span></div>' +
      '<div class="pr-t' + (prN(c.alerts_open) ? ' bad' : '') + '"><span class="k">Supplier cost alerts</span><b>' + prN(c.alerts_open) + '</b><span class="s">' + esc(tierLine || 'nothing open') + '</span></div>' +
      '<div class="pr-t' + (prN(c.suppliers_downgrade) ? ' bad' : prN(c.suppliers_watch) ? ' warn' : '') + '"><span class="k">Suppliers</span><b>' + prN(c.suppliers_downgrade) + ' <span style="font-size:13px">downgrade</span></b><span class="s">' + prN(c.suppliers_watch) + ' to watch · ' + prN(c.suppliers) + ' assessed</span></div>' +
      '<div class="pr-t warn"><span class="k">Cost missing</span><b>' + prN(c.cost_missing) + '</b><span class="s">no Ali cost anywhere — cannot judge</span></div>' +
      '<div class="pr-t ok"><span class="k">On target</span><b>' + prN(c.on_target) + '</b><span class="s">' + prN(c.reduce) + ' with room to reduce</span></div>' +
      '<div class="pr-t gold"><span class="k">Short of target · month</span><b>' + prM(c.gap_month) + '</b><span class="s">on the flagged listings at today\'s volume</span></div>' +
    '</div>');
  }

  /* ---------- the shared listing cell + verdict ---------- */
  function prItemCell(r) {
    var cmp = r.campaign;
    return '<div class="pr-item">' + (r.image ? '<img src="' + esc(prS(r.image)).replace(/"/g, '&quot;') + '" alt="" loading="lazy">' : '') +
      '<div><div class="t"><a href="https://www.ebay.co.uk/itm/' + esc(prS(r.item_id)) + '" target="_blank" rel="noopener noreferrer">' + esc(prS(r.title).slice(0, 80) || prS(r.item_id)) + '</a></div>' +
      '<div class="m"><a data-pr-open="' + esc(prS(r.item_id)) + '" class="mono" title="open the full card">' + esc(prS(r.item_id)) + '</a> · ' + esc(prS(r.account)) +
      (r.supplier ? ' · ' + esc(prS(r.supplier).slice(0, 28)) : '') +
      (r.band ? ' · ' + esc(prS(r.band).replace(/\s*\(.*\)$/, '').slice(0, 30)) + ' ' + prN(r.band_rate) + '%' + (r.band_source === 'unmatched' || r.band_source === 'none' ? ' (assumed)' : '') : '') +
      (cmp ? ' · ' + esc(prS(cmp.name).slice(0, 26)) + (cmp.is_cpc ? ' · CPC' : ' · general') : ' · no campaign') + '</div>' +
      '<div>' + (r.loss ? '<span class="pr-tag bad">LOSING MONEY</span>' : '') +
      (r.sale ? '<span class="pr-tag sale" title="' + esc(prS(r.sale.name)) + '">sale ' + esc(prS(r.sale.discount) || prS(r.sale.type)) + '</span>' : '') +
      (r.cost_changes_30d ? '<span class="pr-tag ' + (r.cost_drift_30d > 0 ? 'warn' : 'mute') + '">cost moved ' + r.cost_changes_30d + '× in 30d' + (r.cost_changed_yesterday ? ' · yesterday too' : '') + '</span>' : '') +
      (r.ali_source === 'orders' ? '<span class="pr-tag mute" title="the Main Sheet has no cost for this item — the orders\' own paid cost is used">cost from orders</span>' : '') +
      (r.decision ? '<span class="pr-tag ' + (r.decision.verdict === 'end' ? 'bad' : r.decision.verdict === 'revise' ? 'gold' : 'mute') + '">' + esc(prS(r.decision.verdict)) + ' · ' + esc(prS(r.decision.by).split('@')[0]) + ' · ' + esc(prS(r.decision.at).slice(0, 10)) + '</span>' : '') +
      '</div></div></div>';
  }
  function prVerdictCell(r) {
    var h = prTag(PR_SEG, r.segment);
    if (r.segment === 'raise' && r.new_list_price) { h += '<div class="pr-sub">list at ' + prM(r.new_list_price) + (Math.abs(prN(r.new_list_price) - prN(r.required_price)) > 0.01 ? ' (buyers must pay ' + prM(r.required_price) + ')' : '') + '</div>'; }
    else if (r.segment === 'ads_high') { h += '<div class="pr-sub">CPC may be at most ' + prM(r.cpc_max) + ' a unit at this price' + (r.new_list_price ? ' · or list at ' + prM(r.new_list_price) : '') + '</div>'; }
    else if (r.segment === 'reduce') { h += '<div class="pr-sub">' + prM(r.gap) + ' above target</div>'; }
    else if (r.segment === 'spending_no_sales') { h += '<div class="pr-sub">' + prM(prN(r.cpc_30d) + prN(r.gen_30d)) + ' ads · 30d · ' + prN(r.clicks_30d) + ' clicks</div>'; }
    else if (r.segment === 'cost_missing') { h += '<div class="pr-sub">add the cost on the Main Sheet</div>'; }
    return h;
  }
  function prActions(r, kind) {
    if (!PR.data) { return ''; }
    var id = esc(prS(r.item_id));
    if (!prCan()) { return '<div class="pr-acts"><button class="minibtn" data-pr-act="flag" data-id="' + id + '" data-k="' + kind + '">Flag for management</button></div>'; }
    return '<div class="pr-acts">' +
      '<button class="minibtn" data-pr-act="revise" data-id="' + id + '" data-k="' + kind + '" style="border-color:var(--gold-a);color:var(--gold-a)">Revise price</button>' +
      '<button class="minibtn" data-pr-act="keep" data-id="' + id + '" data-k="' + kind + '">' + (kind === 'alert' ? 'Absorb it' : 'Keep') + '</button>' +
      '<button class="minibtn" data-pr-act="end" data-id="' + id + '" data-k="' + kind + '" style="border-color:var(--bad);color:var(--bad)">End listing</button></div>';
  }

  /* ---------- paint ---------- */
  function prRow(r) { var d = PR.data; return (d.rows || []).filter(function (x) { return String(x.item_id) === String(r); })[0] || null; }
  function prFiltered(rows) {
    var out = rows.slice();
    if (PR.q) { var q = PR.q.toLowerCase(); out = out.filter(function (r) { return prS(r.title).toLowerCase().indexOf(q) >= 0 || prS(r.item_id).indexOf(q) >= 0 || prS(r.supplier).toLowerCase().indexOf(q) >= 0; }); }
    return out;
  }
  function prSorted(rows) {
    var s = PR.sort, out = rows.slice();
    var g = function (r) { return r.gap === null || r.gap === undefined ? 99 : prN(r.gap); };
    if (s === 'gap') { out.sort(function (a, b) { return g(a) - g(b); }); }
    else if (s === 'actual') { out.sort(function (a, b) { return (a.actual === null ? 99 : prN(a.actual)) - (b.actual === null ? 99 : prN(b.actual)); }); }
    else if (s === 'units') { out.sort(function (a, b) { return prN(b.units_30d) - prN(a.units_30d); }); }
    else if (s === 'cpc') { out.sort(function (a, b) { return prN(b.cpc_per_unit) - prN(a.cpc_per_unit); }); }
    else if (s === 'short') { out.sort(function (a, b) { return (Math.max(0, -g(b)) * prN(b.units_30d)) - (Math.max(0, -g(a)) * prN(a.units_30d)); }); }
    return out;
  }
  function prTable(rows, withActions, kind) {
    var h = '<div class="pr-scroll"><table class="pr-tbl"><thead><tr><th class="l">Listing</th><th>Buyers pay</th><th>Ali cost</th><th>Actual / unit</th><th>Target</th><th>Gap</th>' +
      '<th>Units 30d</th><th>Units 7d</th><th>CPC / unit</th><th>Ads 30d</th><th class="l">Verdict</th>' + (withActions ? '<th></th>' : '') + '</tr></thead><tbody>';
    if (!rows.length) { h += '<tr><td colspan="12" class="l"><div class="empty">Nothing here.</div></td></tr>'; }
    rows.slice(0, 700).forEach(function (r) {
      h += '<tr' + (r.loss ? ' class="hot"' : '') + ' data-pr-row="' + esc(prS(r.item_id)) + '"><td class="l w">' + prItemCell(r) + '</td>' +
        '<td>' + prM(r.paid) + (Math.abs(prN(r.paid) - prN(r.price)) > 0.01 ? '<div class="pr-sub">list ' + prM(r.price) + '</div>' : '') + '</td>' +
        '<td>' + (r.ali ? prM(r.ali) : '<span class="pr-sub">—</span>') + '</td>' +
        '<td class="' + prTone(r.actual) + '">' + prM(r.actual) + '</td>' +
        '<td>' + prM(r.target) + (r.target !== null ? '<div class="pr-sub">tier ' + prM(r.target_tier) + ' · 15% ' + prM(r.target_pct) + '</div>' : '') + '</td>' +
        '<td class="' + prTone(r.gap) + '">' + prM(r.gap) + '</td>' +
        '<td>' + (r.units_30d || '—') + '</td><td>' + (r.units_7d || '—') + '</td>' +
        '<td' + (prN(r.cpc_per_unit) >= 2 ? ' class="pr-neg"' : '') + '>' + (r.units_30d ? prM(r.cpc_per_unit) : '—') + '</td>' +
        '<td>' + ((prN(r.cpc_30d) + prN(r.gen_30d)) ? prM(prN(r.cpc_30d) + prN(r.gen_30d)) : '—') + '</td>' +
        '<td class="l w" style="max-width:220px">' + prVerdictCell(r) + '</td>' +
        (withActions ? '<td>' + prActions(r, kind) + '</td>' : '') + '</tr>' +
        '<tr class="pr-boxrow hidden" data-pr-box="' + esc(prS(r.item_id)) + '"><td colspan="12" class="l"></td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function prPaint() {
    var d = PR.data, box = $('prBody');
    if (!d || !box) { return; }
    prTiles();
    var c = d.counts || {};
    var chip = function (k, l, cur, attr, n) { return '<button class="pr-chip' + (cur === k ? ' on' : '') + '" data-' + attr + '="' + k + '">' + l + (n !== undefined ? ' <b>' + n + '</b>' : '') + '</button>'; };
    var h = '<div class="pr-tools">' +
      chip('revise', 'Revise', PR.tab, 'pr-tab', prN(c.raise) + prN(c.ads_high) + prN(c.spending_no_sales)) +
      chip('alerts', 'Supplier risk', PR.tab, 'pr-tab', prN(c.alerts_open)) +
      chip('suppliers', 'Suppliers', PR.tab, 'pr-tab', prN(c.suppliers)) +
      chip('all', 'All listings', PR.tab, 'pr-tab', prN(c.items)) +
      chip('decisions', 'Decisions', PR.tab, 'pr-tab', (d.decisions || []).length) +
      '<span class="pr-sub" style="margin-left:auto">as of ' + prWhen(d.as_of) + '</span></div>';
    if (PR.tab === 'revise') { h += prTabRevise(); }
    else if (PR.tab === 'alerts') { h += prTabAlerts(); }
    else if (PR.tab === 'suppliers') { h += prTabSuppliers(); }
    else if (PR.tab === 'all') { h += prTabAll(); }
    else { h += prTabDecisions(); }
    h += '<p class="pr-note">' + esc(prS(d.note)) + ' Supplier cost moves: +10p low · +20p moderate · +30p serious · +50p red alert · +£1 critical alert; every move, up or down, is kept so a supplier is judged on its pattern. A verdict here raises the listing task (revise → the item\'s lister, end → the Team Lead) and settles the item\'s open cost alert.</p>';
    box.innerHTML = h;
    box.querySelectorAll('[data-pr-tab]').forEach(function (x) { x.onclick = function () { PR.tab = this.getAttribute('data-pr-tab'); prPaint(); }; });
    box.querySelectorAll('[data-pr-seg]').forEach(function (x) { x.onclick = function () { PR.seg = this.getAttribute('data-pr-seg'); prPaint(); }; });
    box.querySelectorAll('[data-pr-sort]').forEach(function (x) { x.onclick = function () { PR.sort = this.getAttribute('data-pr-sort'); prPaint(); }; });
    var kept = $('prKept');
    if (kept) { kept.onclick = function () { PR.showKept = !PR.showKept; prPaint(); }; }
    prWire(box);
  }

  function prTabRevise() {
    var d = PR.data;
    var rows = (d.rows || []).filter(function (r) { return r.segment === 'raise' || r.segment === 'ads_high' || r.segment === 'spending_no_sales' || r.loss; });
    var hidden = rows.filter(function (r) { return r.held; }).length;
    if (!PR.showKept) { rows = rows.filter(function (r) { return !r.held; }); }
    rows = prSorted(prFiltered(rows));
    var chip = function (k, l) { return '<button class="pr-chip' + (PR.sort === k ? ' on' : '') + '" data-pr-sort="' + k + '">' + l + '</button>'; };
    return '<div class="pr-tools"><span class="pr-sub">sort</span>' + chip('gap', 'Furthest from target') + chip('short', 'Most money short') + chip('actual', 'Lowest profit') + chip('units', 'Most sold') + chip('cpc', 'Highest CPC') +
      (hidden ? '<button class="pr-chip' + (PR.showKept ? ' on' : '') + '" id="prKept">' + (PR.showKept ? 'hide' : 'show') + ' ' + hidden + ' kept in the last 14 days</button>' : '') +
      '<span class="pr-sub" style="margin-left:auto">' + rows.length + ' listings</span></div>' +
      prTable(rows, true, 'row');
  }

  function prTabAll() {
    var d = PR.data;
    var rows = d.rows || [];
    var counts = {};
    rows.forEach(function (r) { counts[r.segment] = (counts[r.segment] || 0) + 1; });
    if (PR.seg !== 'all') { rows = rows.filter(function (r) { return PR.seg === 'loss' ? r.loss : r.segment === PR.seg; }); }
    rows = prSorted(prFiltered(rows));
    var chip = function (k, l, n) { return '<button class="pr-chip' + (PR.seg === k ? ' on' : '') + '" data-pr-seg="' + k + '">' + l + (n !== undefined ? ' <b>' + n + '</b>' : '') + '</button>'; };
    var schip = function (k, l) { return '<button class="pr-chip' + (PR.sort === k ? ' on' : '') + '" data-pr-sort="' + k + '">' + l + '</button>'; };
    return '<div class="pr-tools">' + chip('all', 'All', (d.rows || []).length) +
      ['raise', 'ads_high', 'reduce', 'on_target', 'spending_no_sales', 'dormant', 'cost_missing'].map(function (k) { return chip(k, PR_SEG[k][0], counts[k] || 0); }).join('') +
      chip('loss', 'Losing money', (d.counts || {}).loss || 0) +
      '<span class="pr-sub" style="margin-left:8px">sort</span>' + schip('gap', 'Gap') + schip('actual', 'Profit') + schip('units', 'Sold') + schip('cpc', 'CPC') +
      '<span class="pr-sub" style="margin-left:auto">' + rows.length + ' of ' + (d.rows || []).length + '</span></div>' +
      prTable(rows, true, 'row');
  }

  function prTabAlerts() {
    var d = PR.data, alerts = d.alerts || [];
    var open = alerts.filter(function (a) { return a.open; }), done = alerts.filter(function (a) { return !a.open; });
    var card = function (a) {
      var r = prRow(a.item_id);
      var sug = a.suggestion || null;
      return '<div class="pr-alert' + (a.open ? ' open ' + esc(prS(a.tier)) : '') + '" data-pr-row="' + esc(prS(a.item_id)) + '">' +
        '<div class="h">' + prTag(PR_TIER, a.tier) + '<span class="t"><a href="https://www.ebay.co.uk/itm/' + esc(prS(a.item_id)) + '" target="_blank" rel="noopener noreferrer">' + esc(prS(a.title).slice(0, 80) || prS(a.item_id)) + '</a></span>' +
          '<span class="pr-sub"><a data-pr-open="' + esc(prS(a.item_id)) + '" class="mono" style="color:var(--gold-a);cursor:pointer">' + esc(prS(a.item_id)) + '</a> · ' + esc(prS(a.account)) + (a.supplier ? ' · ' + esc(prS(a.supplier).slice(0, 28)) : '') + ' · seen ' + prWhen(a.alerted_at) + '</span>' +
          (a.changed_yesterday || a.changes_30d > 1 ? '<span class="pr-tag warn">moved ' + a.changes_30d + '× in 30 days' + (a.changed_yesterday ? ' · yesterday too' : '') + (a.changed_today ? ' · and today' : '') + '</span>' : '') +
          (r && r.segment ? prTag(PR_SEG, r.segment) : '') + '</div>' +
        '<div class="nums"><span>cost <span class="pr-neg">' + prM(a.old_cost) + ' → ' + prM(a.new_cost) + '</span> (' + prP(a.delta) + ')</span>' +
          (a.paid !== null ? '<span>buyers pay ' + prM(a.paid) + '</span>' : '') +
          (a.before !== null ? '<span>profit a unit ' + prM(a.before) + ' → <span class="' + prTone(a.after) + '">' + prM(a.after) + '</span>' + (a.target !== null ? ' (target ' + prM(a.target) + ')' : '') + '</span>' : '') +
          (a.units_30d !== null ? '<span>' + a.units_30d + ' sold · 30d</span>' : '') + '</div>' +
        (sug ? '<div class="sug">' + (sug.kind === 'absorb' ? '✅ <b>Can absorb</b> — ' : sug.kind === 'revise' ? '✏️ <b>Revise</b> — ' : sug.kind === 'end' ? '⛔ <b>Consider ending</b> — ' : '') + esc(prS(sug.text)) + '</div>' : '') +
        (a.open ? (r ? prActions(r, 'alert') : '<div class="pr-acts"><button class="minibtn" data-pr-ack="' + esc(prS(a.item_id)) + '|' + esc(prS(a.alerted_at)) + '">Handled — with a note</button></div>')
          : '<div class="pr-sub" style="margin-top:6px">handled by ' + esc(prS(a.acked_by).split('@')[0]) + ' · ' + prWhen(a.acked_at) + (a.note ? ' — ' + esc(prS(a.note)) : '') + '</div>') +
        '<div class="pr-boxrow hidden" data-pr-box="' + esc(prS(a.item_id)) + '"></div></div>';
    };
    var h = '<div class="pr-sub" style="margin-bottom:4px">' + open.length + ' open · the Main Sheet\'s AliExpress cost is read every hour; a rise of 10p or more on a live listing lands here with its tier, and a cost that keeps climbing escalates the same alert instead of ringing twice.</div>';
    if (!open.length) { h += '<div class="hu-hint">No open supplier cost alerts.</div>'; }
    h += open.map(card).join('');
    if (done.length) { h += '<div class="pr-sub" style="margin-top:16px">Handled in the last 30 days</div>' + done.slice(0, 40).map(card).join(''); }
    return h;
  }

  function prTabSuppliers() {
    var d = PR.data, sups = d.suppliers || [];
    if (!sups.length) { return '<div class="hu-hint">No supplier cost moves recorded yet. From today every change the Main Sheet shows is kept, and suppliers are assessed on their last 30 days here.</div>'; }
    var h = '<div class="pr-sub" style="margin-bottom:6px">Assessed on the last 30 days of cost moves (90 days kept): <b>downgrade</b> = a red or critical rise, four rises, or moves on three days running · <b>watch</b> = two rises, a moderate-or-worse rise, or 20p+ drift per item · otherwise <b>continue</b>.</div>' +
      '<div class="pr-scroll"><table class="pr-tbl"><thead><tr><th class="l">Supplier</th><th class="l">Verdict</th><th>Items</th><th>Moves 30d</th><th>Rises / drops</th><th>Drift / item</th><th class="l">Worst</th><th>Days moved</th><th>Streak</th><th class="l">Last move</th><th class="l">Listings</th></tr></thead><tbody>';
    sups.forEach(function (s) {
      h += '<tr' + (s.verdict === 'downgrade' ? ' class="hot"' : '') + '><td class="l w" style="max-width:220px"><b>' + esc(prS(s.supplier).slice(0, 60)) + '</b><div class="pr-sub">' + esc((s.accounts || []).join(', ')) + '</div></td>' +
        '<td class="l w" style="max-width:240px">' + prTag(PR_VERDICT, s.verdict) + '<div class="pr-sub">' + esc(prS(s.why)) + '</div></td>' +
        '<td>' + s.items + '</td><td>' + s.changes_30d + '<div class="pr-sub">' + s.changes_90d + ' in 90d</div></td><td>' + s.rises_30d + ' / ' + s.drops_30d + '</td>' +
        '<td class="' + prTone(s.drift_30d) + '">' + (s.drift_30d ? prM(s.drift_30d) : '—') + '</td>' +
        '<td class="l">' + (s.worst_tier ? prTag(PR_TIER, s.worst_tier) : '<span class="pr-sub">—</span>') + '</td>' +
        '<td>' + s.days_changed_30d + (s.changed_yesterday ? '<div class="pr-sub">yesterday' + (s.changed_today ? ' + today' : '') + '</div>' : s.changed_today ? '<div class="pr-sub">today</div>' : '') + '</td>' +
        '<td>' + (s.streak > 1 ? s.streak + ' days' : '—') + '</td><td class="l">' + prWhen(s.last_change) + '</td>' +
        '<td class="l w" style="max-width:220px">' + (s.item_ids || []).map(function (id) { return '<a data-pr-open="' + esc(prS(id)) + '" class="mono" style="color:var(--gold-a);cursor:pointer;margin-right:6px">' + esc(prS(id)) + '</a>'; }).join('') + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function prTabDecisions() {
    var d = PR.data, decs = d.decisions || [];
    if (!decs.length) { return '<div class="hu-hint">No decisions recorded yet.</div>'; }
    var h = '<div class="pr-scroll"><table class="pr-tbl"><thead><tr><th class="l">When</th><th class="l">Listing</th><th class="l">Verdict</th><th>Price then</th><th>Aimed at</th><th class="l">Note</th><th class="l">By</th><th class="l">Task</th></tr></thead><tbody>';
    decs.forEach(function (x) {
      var r = prRow(x.item_id);
      h += '<tr><td class="l">' + prWhen(x.at) + '</td><td class="l w" style="max-width:300px"><a data-pr-open="' + esc(prS(x.item_id)) + '" class="mono" style="color:var(--gold-a);cursor:pointer">' + esc(prS(x.item_id)) + '</a> · ' + esc(prS(x.account)) + (r ? '<div class="pr-sub">' + esc(prS(r.title).slice(0, 70)) + '</div>' : '') + '</td>' +
        '<td class="l"><span class="pr-tag ' + (x.verdict === 'end' ? 'bad' : x.verdict === 'revise' ? 'gold' : x.verdict === 'flag' ? 'warn' : 'mute') + '">' + esc(prS(x.verdict)) + '</span>' + (x.segment ? '<div class="pr-sub">' + esc((PR_SEG[x.segment] || [x.segment])[0]) + '</div>' : '') + '</td>' +
        '<td>' + prM(x.price_now) + '</td><td>' + prM(x.price_target) + '</td><td class="l w" style="max-width:320px">' + esc(prS(x.note)) + '</td><td class="l">' + esc(prS(x.by_email).split('@')[0]) + '</td><td class="l mono">' + esc(prS(x.task_id)) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---------- actions: revise / keep / end / flag ---------- */
  function prWire(root) {
    root.querySelectorAll('[data-pr-open]').forEach(function (a) { a.onclick = function () { prLookup(this.getAttribute('data-pr-open')); }; });
    root.querySelectorAll('[data-pr-act]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-id'), act = this.getAttribute('data-pr-act'), kind = this.getAttribute('data-k');
        var r = prRow(id) || (PR.detail && String(PR.detail.item.item_id) === String(id) ? prDetailRow() : null);
        if (!r) { toast('Refresh the desk — the listing is not loaded.'); return; }
        prOpenBox(root, r, act, kind);
      };
    });
    root.querySelectorAll('[data-pr-ack]').forEach(function (b) {
      b.onclick = function () {
        var parts = this.getAttribute('data-pr-ack').split('|'), note = prompt('What was done about it? (goes on the record)') || '';
        if (note.trim().length < 3) { toast('Write what you did — a cost alert needs real feedback.'); return; }
        var btn = this; btn.disabled = true;
        api('priceAck', { item_id: parts[0], alerted_at: parts[1], note: note.trim() }).then(function () { toast('Handled.'); PR.data = null; prLoad(); })
          .catch(function (e) { btn.disabled = false; toast(e.message); });
      };
    });
  }
  function prDetailRow() {
    var d = PR.detail; if (!d) { return null; }
    return Object.assign({ item_id: d.item.item_id, account: d.item.account, title: d.item.title, image: d.item.image, supplier: d.item.supplier }, d.judge || {});
  }
  function prBoxHtml(r, act) {
    var ps = function (v) { return v === null || v === undefined ? '' : Number(v).toFixed(2); };
    var noteDefault = '';
    if (act === 'revise') {
      noteDefault = 'Price revision: set the list price to £' + ps(r.new_list_price || r.price) + '. Calculator at £' + ps(r.paid) + ' paid: £' + ps(r.actual) + ' actual a unit against a £' + ps(r.target) + ' target (Ali £' + ps(r.ali) + (r.cpc_per_unit ? ', CPC £' + ps(r.cpc_per_unit) + ' a unit' : '') + ').';
    } else if (act === 'end') {
      noteDefault = r.loss ? 'Losing £' + ps(Math.abs(prN(r.actual))) + ' a unit at £' + ps(r.paid) + ' — not viable at this cost.' : '';
    }
    var h = '<div class="pr-box"><div class="f">';
    if (act === 'revise') {
      h += '<div><label>New list price £</label><input data-pr-f="price" type="number" step="0.01" min="0.5" value="' + esc(ps(r.new_list_price || r.price)) + '"></div>' +
        '<div><label>Lister\'s deadline (days)</label><input data-pr-f="days" type="number" min="1" max="14" value="2"></div>';
    }
    h += '<div style="grid-column:1/-1"><label>' + (act === 'revise' ? 'Instruction to the lister' : act === 'end' ? 'Why end it (goes to the Team Lead)' : act === 'flag' ? 'Note for management' : 'Note (optional)') + '</label>' +
      '<textarea data-pr-f="note">' + esc(noteDefault) + '</textarea></div></div>' +
      '<div class="pr-acts" style="justify-content:flex-start"><button class="minibtn" data-pr-go="' + act + '" style="border-color:var(--gold-a);color:var(--gold-a)">' +
      (act === 'revise' ? 'Send the revision to the lister' : act === 'end' ? 'Send the end command' : act === 'flag' ? 'Flag it' : 'Keep the price — record it') + '</button>' +
      '<button class="minibtn" data-pr-cancel="1">Cancel</button></div></div>';
    return h;
  }
  function prOpenBox(root, r, act, kind) {
    var slots = root.querySelectorAll('[data-pr-box="' + prS(r.item_id).replace(/"/g, '') + '"]');
    var slot = slots[0];
    if (!slot) { return; }
    root.querySelectorAll('.pr-boxrow').forEach(function (x) { if (x !== slot) { x.classList.add('hidden'); } });
    var cell = slot.tagName === 'TR' ? slot.firstChild : slot;
    cell.innerHTML = prBoxHtml(r, act);
    slot.classList.remove('hidden');
    var ta = cell.querySelector('[data-pr-f="note"]');
    if (ta) { ta.focus(); }
    cell.querySelector('[data-pr-cancel]').onclick = function () { slot.classList.add('hidden'); cell.innerHTML = ''; };
    cell.querySelector('[data-pr-go]').onclick = function () {
      var btn = this;
      var note = prS((cell.querySelector('[data-pr-f="note"]') || {}).value).trim();
      var price = Number((cell.querySelector('[data-pr-f="price"]') || {}).value) || 0;
      var days = Math.max(1, Math.min(14, Number((cell.querySelector('[data-pr-f="days"]') || {}).value) || 2));
      if (act === 'revise' && !(price > 0)) { toast('Type the new list price.'); return; }
      if (act !== 'keep' && note.length < 3) { toast('A short note is needed — it goes on the record.'); return; }
      if (act === 'revise' && note.indexOf('£' + price.toFixed(2)) < 0) { note = 'Set the list price to £' + price.toFixed(2) + '. ' + note; }
      btn.disabled = true;
      prDecide(r, act, { note: note, price: price, days: days }).then(function (res) {
        toast(act === 'revise' ? 'Revision sent to ' + (prS(res && res.assigned_to).split('@')[0] || 'the lister') + ' — recorded.'
          : act === 'end' ? 'End command sent to ' + (prS(res && res.assigned_to).split('@')[0] || 'the Team Lead') + ' — recorded.'
          : act === 'flag' ? 'Flagged for management.' : 'Kept — recorded.');
        var stamp = new Date().toISOString();
        (PR.data.rows || []).forEach(function (x) {
          if (String(x.item_id) !== String(r.item_id)) { return; }
          x.decision = { verdict: act, note: note, by: prMe(), at: stamp, task_id: res && res.task_id || '', price_target: act === 'revise' ? price : null };
          x.held = act === 'keep';
        });
        (PR.data.alerts || []).forEach(function (a) { if (String(a.item_id) === String(r.item_id) && a.open) { a.open = false; a.acked_by = prMe(); a.acked_at = stamp; a.note = act + (note ? ': ' + note : ''); } });
        (PR.data.decisions = PR.data.decisions || []).unshift({ id: 0, item_id: r.item_id, account: r.account, verdict: act, note: note, price_now: r.paid, price_target: act === 'revise' ? price : null, segment: r.segment, by_email: prMe(), at: stamp, task_id: res && res.task_id || '' });
        prPaint();
        if (PR.detail && String(PR.detail.item.item_id) === String(r.item_id)) { prLookup(r.item_id); }
        prLoad(true);
      }).catch(function (e) { btn.disabled = false; toast(e.message); });
    };
  }
  /* The task first (Apps Script — the lister's or Team Lead's board), then the desk's record. A failed
     task raises nothing and records nothing; a failed record after a sent task says so plainly. */
  function prDecide(r, act, o) {
    var rec = function (taskId) {
      return api('priceDecide', { item_id: r.item_id, account: r.account, verdict: act, note: o.note, price_now: r.paid, price_target: act === 'revise' ? o.price : null, segment: r.segment, task_id: taskId || '' });
    };
    if (act === 'keep' || act === 'flag') { return rec('').then(function () { return {}; }); }
    var reason = act === 'revise' ? 'price revision' : 'price revision — not viable';
    return api('decisionAct', { item_id: r.item_id, kind: act === 'end' ? 'end' : 'revise', account: r.account, title: r.title, deadline_days: o.days, reason: reason, note: o.note })
      .then(function (t) {
        return rec(t && t.task_id).then(function () { return t; }, function (e) { throw new Error('task sent (' + prS(t && t.task_id) + ') but the desk record failed: ' + e.message + ' — press Refresh'); });
      });
  }

  /* ---------- item-ID search: the full card ---------- */
  function prLookup(id) {
    var box = $('prDetail');
    if (!box) { return; }
    box.innerHTML = '<div class="pr-det"><div class="spinner"></div></div>';
    api('priceItemDetail', { item_id: id }).then(function (d) { PR.detail = d; prPaintDetail(); window.scrollTo({ top: 0, behavior: 'smooth' }); })
      .catch(function (e) { box.innerHTML = '<div class="pr-det"><b>' + esc(e.message) + '</b> <button class="minibtn" id="prDetClose" style="margin-left:8px">Close</button></div>'; var c = $('prDetClose'); if (c) { c.onclick = function () { box.innerHTML = ''; }; } });
  }
  function prPaintDetail() {
    var d = PR.detail, box = $('prDetail');
    if (!d || !box) { return; }
    var it = d.item, j = d.judge || {}, ch = d.chain, cost = d.cost || {}, fl = d.fluctuation || {}, b = d.band || {};
    var row = function (l, v, cls, hint) { return '<div class="r ' + (cls || '') + '"><span>' + esc(l) + (hint ? '<em>' + esc(hint) + '</em>' : '') + '</span><b>' + v + '</b></div>'; };
    var r = prDetailRow();
    var h = '<div class="pr-det"><div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
      (it.image ? '<img src="' + esc(prS(it.image)).replace(/"/g, '&quot;') + '" alt="" style="width:72px;height:72px;border-radius:10px;object-fit:cover">' : '') +
      '<div style="flex:1;min-width:240px"><h2><a href="https://www.ebay.co.uk/itm/' + esc(prS(it.item_id)) + '" target="_blank" rel="noopener noreferrer">' + esc(prS(it.title) || prS(it.item_id)) + '</a></h2>' +
      '<div class="pr-sub"><span class="mono">' + esc(prS(it.item_id)) + '</span> · ' + esc(prS(it.account)) + ' · ' + esc(prS(it.status)) + (it.supplier ? ' · supplier <b>' + esc(prS(it.supplier)) + '</b>' : ' · no supplier named on the Main Sheet') +
      ' · ' + esc(prS(b.name)) + ' ' + prN(b.rate) + '%' + (b.source === 'unmatched' || b.source === 'none' ? ' (assumed — no category known)' : b.source === 'sheet' ? ' (Main Sheet)' : '') +
      (it.hunter ? ' · hunted by ' + esc(prS(it.hunter).split('@')[0]) : '') + (it.lister ? ' · listed by ' + esc(prS(it.lister).split('@')[0]) : '') + (it.live_at ? ' · live ' + esc(prS(it.live_at).slice(0, 10)) : '') + '</div>' +
      '<div style="margin-top:6px">' + prTag(PR_SEG, j.segment) + (j.loss ? '<span class="pr-tag bad">LOSING MONEY</span>' : '') + (d.sale ? '<span class="pr-tag sale">sale ' + esc(prS(d.sale.discount)) + '</span>' : '') +
      (fl.changes_30d ? '<span class="pr-tag warn">cost moved ' + fl.changes_30d + '× in 30 days' + (fl.changed_yesterday ? ' · yesterday too' : '') + (fl.changed_today ? ' · today' : '') + '</span>' : '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' + (r ? prActions(r, 'detail') : '') + '<button class="minibtn" id="prDetClose">Close</button></div></div>' +
      '<div class="pr-boxrow hidden" data-pr-box="' + esc(prS(it.item_id)) + '"></div>' +
      '<div class="pr-grid">';
    // cost + links
    h += '<div class="pr-blk"><h3>AliExpress cost · from the system</h3>' +
      row('Main Sheet cost', cost.sheet ? prM(cost.sheet) : '<span class="pr-sub">none</span>', cost.source === 'sheet' ? 'big' : '', it.facts_at ? 'read ' + (fmtPkt(it.facts_at, true) || it.facts_at) : '') +
      row('Paid on orders · 30d avg', cost.paid_avg_30d ? prM(cost.paid_avg_30d) : '<span class="pr-sub">none typed</span>', cost.source === 'orders' ? 'big' : '') +
      ((cost.paid_costs_seen || []).length ? row('Costs actually paid', (cost.paid_costs_seen || []).map(function (x) { return prM(x.cost) + '×' + x.orders; }).join(', '), '', 'per unit, last 60 days of orders') : '') +
      (cost.hunt_source_price ? row('Hunter\'s source price', esc(prS(cost.hunt_source_price)), '', 'from the hunt form') : '') +
      row('Used for the verdict', cost.used ? prM(cost.used) : '—', 'tot') + '</div>';
    h += '<div class="pr-blk"><h3>Order (sourcing) links</h3>' +
      ((d.links || []).length ? (d.links || []).map(function (l, i) { return '<div class="r"><span>Supplier ' + (i + 1) + '<em>' + esc(prS(l.src)) + '</em></span><b><a href="' + esc(prS(l.url)) + '" target="_blank" rel="noopener noreferrer">open link</a></b></div>'; }).join('') : '<div class="pr-sub">no link anywhere — not on the Main Sheet, the go-live record or the hunt</div>') +
      (d.hunt && d.hunt.temu ? '<div class="r"><span>Temu</span><b><a href="' + esc(prS(d.hunt.temu)) + '" target="_blank" rel="noopener noreferrer">open link</a></b></div>' : '') +
      (d.sourcing_saved_by ? '<div class="pr-sub" style="margin-top:4px">portal links saved by ' + esc(prS(d.sourcing_saved_by).split('@')[0]) + ' · ' + prWhen(d.sourcing_saved_at) + '</div>' : '') +
      (it.sheet_campaign || it.sheet_campaign_type ? '<div class="pr-sub" style="margin-top:4px">Main Sheet campaign: ' + esc(prS(it.sheet_campaign_type)) + (it.sheet_campaign ? ' · ' + esc(prS(it.sheet_campaign)) : '') + '</div>' : '') + '</div>';
    // calculator
    if (ch) {
      h += '<div class="pr-blk"><h3>Calculator · one unit at what buyers pay</h3>' +
        row('Buyers pay', prM(ch.price), 'tot', Math.abs(prN(it.price) - prN(ch.price)) > 0.01 ? 'list price ' + prM(it.price) + ' — 30-day average paid' : 'the list price') +
        row('Final value fee', '−' + prM(ch.fvf), '', prN(b.rate) + '% banded') + row('Per-order fee', '−' + prM(ch.per_order)) + row('Regulatory 0.35%', '−' + prM(ch.reg)) +
        (ch.ad_fee ? row('Promoted General ' + prN(j.ad_rate_pct) + '%', '−' + prM(ch.ad_fee)) : '') + row('VAT on eBay fees 20%', '−' + prM(ch.fee_vat)) +
        row('eBay order earning', prM(ch.earn), 'tot big') + row('AliExpress cost', '−' + prM(j.ali)) + (ch.cpc_incl ? row('CPC a unit + 20% VAT', '−' + prM(ch.cpc_incl), '', prM(j.cpc_per_unit) + ' ex VAT, 30-day average') : '') +
        row('Net profit', prM(ch.net), 'tot') + row('VAT to HMRC', '−' + prM(ch.vat_hmrc)) + row('Actual profit a unit', '<span class="' + prTone(ch.actual) + '">' + prM(ch.actual) + '</span>', 'tot big') +
        (j.fee_share_observed !== null && j.fee_share_observed !== undefined ? '<div class="pr-sub" style="margin-top:4px">eBay actually took ' + j.fee_share_observed + '% of the sale on the orders in 30 days (incl VAT)</div>' : '') + '</div>';
      h += '<div class="pr-blk"><h3>Against the targets</h3>' +
        row('Target a unit', prM(j.target), 'big', 'tier ' + prM(j.target_tier) + ' (Ali ' + prM(j.ali) + ') · 15% = ' + prM(j.target_pct)) +
        row('Gap', '<span class="' + prTone(j.gap) + '">' + prM(j.gap) + '</span>', 'tot') +
        (j.required_price ? row('Buyers must pay', prM(j.required_price), '', 'to clear both targets at this cost and CPC') + row('New list price', prM(j.new_list_price), 'big', 'the list price scaled by the same ratio — variations and sales follow') : '') +
        (j.cpc_max !== null && j.cpc_max !== undefined ? row('CPC the price can carry', prM(j.cpc_max), '', 'per unit at today\'s price — the ads desk\'s ceiling') : '') +
        row('Sold 30 days', (j.units_30d || 0) + ' units · ' + prM(j.revenue_30d)) + row('Sold 7 days', (j.units_7d || 0) + ' units') +
        row('Ads 30 days', prM(prN(j.cpc_30d) + prN(j.gen_30d)), '', 'CPC ' + prM(j.cpc_30d) + ' · general ' + prM(j.gen_30d) + ' · ' + prN(j.clicks_30d) + ' clicks') +
        (d.campaign ? row('Campaign', esc(prS(d.campaign.name).slice(0, 30)) + '<em>' + esc(prS(d.campaign.status)) + (d.campaign.is_cpc ? ' · CPC' : ' · general') + (d.campaign.bid_pct ? ' · ' + esc(prS(d.campaign.bid_pct)) + '%' : '') + '</em>') : row('Campaign', '<span class="pr-sub">none</span>')) + '</div>';
    } else {
      h += '<div class="pr-blk"><h3>Calculator</h3><div class="pr-sub">No price on the listing — nothing to judge.</div></div>';
    }
    // history
    h += '<div class="pr-blk"><h3>Supplier cost history</h3>' +
      '<div class="pr-sub" style="margin-bottom:5px">30 days: ' + prN(fl.changes_30d) + ' moves (' + prN(fl.rises_30d) + ' up, ' + prN(fl.drops_30d) + ' down), drift ' + prM(fl.drift_30d) + (fl.worst_tier_30d ? ', worst ' + esc((PR_TIER[fl.worst_tier_30d] || [''])[0].toLowerCase()) : '') + '</div>' +
      ((d.history || []).length ? (d.history || []).slice(0, 15).map(function (x) {
        return '<div class="r"><span>' + esc(prS(x.seen_day) || prS(x.seen_at).slice(0, 10)) + (x.supplier ? '<em>' + esc(prS(x.supplier).slice(0, 30)) + '</em>' : '') + '</span><b>' + prM(x.old_cost) + ' → ' + prM(x.new_cost) + ' <span class="' + (prN(x.delta_p) > 0 ? 'pr-neg' : 'pr-pos') + '">' + prP(prN(x.delta_p) / 100) + '</span>' + (x.tier ? ' ' + prTag(PR_TIER, x.tier) : '') + '</b></div>';
      }).join('') : '<div class="pr-sub">no cost move recorded yet — the Main Sheet cost is compared every hour from today</div>') + '</div>';
    // alerts + decisions
    h += '<div class="pr-blk"><h3>Alerts & decisions</h3>' +
      ((d.alerts || []).slice(0, 6).map(function (a) { return '<div class="r"><span>' + prTag(PR_TIER, a.tier || '') + '<em>' + prWhen(a.alerted_at) + (a.acked_at ? ' · handled by ' + esc(prS(a.acked_by).split('@')[0]) + (a.note ? ' — ' + esc(prS(a.note).slice(0, 80)) : '') : ' · OPEN') + '</em></span><b>' + prM(a.old_cost) + ' → ' + prM(a.new_cost) + '</b></div>'; }).join('')) +
      ((d.decisions || []).slice(0, 6).map(function (x) { return '<div class="r"><span><span class="pr-tag ' + (x.verdict === 'end' ? 'bad' : x.verdict === 'revise' ? 'gold' : 'mute') + '">' + esc(prS(x.verdict)) + '</span><em>' + prWhen(x.at) + ' · ' + esc(prS(x.by_email).split('@')[0]) + (x.note ? ' — ' + esc(prS(x.note).slice(0, 100)) : '') + '</em></span><b>' + (x.price_target ? '→ ' + prM(x.price_target) : '') + '</b></div>'; }).join('')) +
      (!(d.alerts || []).length && !(d.decisions || []).length ? '<div class="pr-sub">nothing yet</div>' : '') + '</div>';
    // recent orders
    if ((d.recent_orders || []).length) {
      h += '<div class="pr-blk"><h3>Recent orders</h3>' + (d.recent_orders || []).slice(0, 10).map(function (o) { return '<div class="r"><span>' + esc(prS(o.date)) + ' · ' + o.qty + '×</span><b>' + prM(o.sold) + ' · cost ' + (o.cost ? prM(o.cost) : '—') + ' · fees ' + (o.fees ? prM(o.fees) : '—') + (o.refunded ? ' · refund ' + prM(o.refunded) : '') + '</b></div>'; }).join('') + '</div>';
    }
    h += '</div></div>';
    box.innerHTML = h;
    $('prDetClose').onclick = function () { PR.detail = null; box.innerHTML = ''; };
    prWire(box);
  }

})();
