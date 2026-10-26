/* view-adtool-listsets.js — Advertising Tool · Dynamic listings and Listings without CPC (owner, 27 Oct 2026:
 * "Dynamic Listing — with all account details & individual account by account information. Listing without CPC —
 * with all account details & individual account by account information.")
 *
 * Two pages, one implementation, the CPC listings page's look (its cpc-* classes, which every build that carries
 * this file also carries). Both read adtoolCpcListings in a mode of their own, so a row means exactly what it means
 * on CPC listings: the same window, the same figures, profit per listing under the Sales Analysis law and never
 * added up.
 *   · Dynamic listings — every listing live in a running campaign whose NAME says dynamic ("General Dynamic",
 *     "... DYN"), his naming convention and the one the dynamic-campaign price rules already read.
 *   · Listings without CPC — every ACTIVE listing with no live cost-per-click ad: general-only and unadvertised.
 * "All account details & account by account": the period bar and the account chips at the top; with All accounts
 * an account-by-account table (listings, how many sold, spend, sales, orders, units) whose rows pick the account;
 * one account narrows the whole page to it. The listing table sorts on every column over the rows in hand.
 * An engine that predates these modes answers with the CPC page's own mode; the page then says the engine update
 * is needed and shows nothing, rather than CPC listings under the wrong name. Nothing here is sent to eBay. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var SETS = {
    dynamic: { key: 'adtoolDynamic', label: 'Dynamic listings (ads)', title: 'Dynamic listings',
      sub: 'Every listing live in a dynamic campaign, all accounts together and account by account',
      rule: '<b>Which listings.</b> Every listing live in a running campaign whose name says Dynamic or DYN, the way the campaigns are named here. A listing in two dynamic campaigns is counted once.',
      none: 'No listing is live in a dynamic campaign', sort: { key: 'spend', dir: -1 } },
    nocpc: { key: 'adtoolNoCpc', label: 'Listings without CPC (ads)', title: 'Listings without CPC',
      sub: 'Every active listing with no live cost-per-click ad, all accounts together and account by account',
      rule: '<b>Which listings.</b> Every active listing with no live cost-per-click ad: listings in general campaigns only, and listings in no campaign at all. Sorted by units sold, so the ones selling without CPC come first.',
      none: 'Every active listing has a live cost-per-click ad', sort: { key: 'units', dir: -1 } }
  };
  var ST = {};
  Object.keys(SETS).forEach(function (m) { ST[m] = { account: '', period: null, accounts: [], data: null, sort: { key: SETS[m].sort.key, dir: SETS[m].sort.dir }, seq: 0 }; });

  VIEW_CSS.push([
    '.ls-acc{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.ls-acc th{text-align:right;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.ls-acc th:first-child,.ls-acc td:first-child{text-align:left}',
    '.ls-acc td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;white-space:nowrap}',
    '.ls-acc tr.pick{cursor:pointer}.ls-acc tr.pick:hover td{background:rgba(255,255,255,.03)}',
    '.ls-acc tr.tot td{font-weight:800;border-top:1px solid var(--gold-line)}',
    '.ls-camp{font-size:12px;line-height:1.45;min-width:120px}.ls-camp .s{font-size:10.5px;color:var(--text-3);white-space:nowrap}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function ratio(t, b) { t = num(t); b = num(b); return b == null || b === 0 || t == null ? null : t / b; }
  function src(t, shown) { return '<span class="cpc-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function dayTxt(d) { d = String(d || '').slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? d : '—'; }

  /* registered by name, not in a loop, so the build's tripwire (which reads `VIEWS.<key> =`) can see both */
  VIEWS.adtoolDynamic = listSetView('dynamic');
  VIEWS.adtoolNoCpc = listSetView('nocpc');
  function listSetView(mode) {
    var S = SETS[mode];
    return {
      label: S.label, hidden: true, order: 40, roles: ROLES,
      icon: mode === 'dynamic' ? '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>' : '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10l8 8M16 10l-8 8"/>',
      render: function () {
        return '<div class="cpc-wrap">' + adtHgroup(S.title, S.sub, 'lsFresh_' + mode) +
          '<div id="lsBar_' + mode + '"></div><div id="lsAcct_' + mode + '" class="an-filters"></div>' +
          '<div id="lsBody_' + mode + '"><div class="cpc-empty">Loading…</div></div></div>';
      },
      init: function () {
        var X = ST[mode];
        X.period = adtPeriodBar('lsBar_' + mode, { page: S.key, def: 'd30', onChange: function (v) { X.period = v; load(mode, false).catch(function () {}); } });
        chips(mode);
        load(mode, false).catch(function () {});
      }
    };
  }

  function chips(mode) {
    var X = ST[mode], el = $('lsAcct_' + mode); if (!el) return;
    el.innerHTML = '<button class="' + (X.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      X.accounts.map(function (a) { return '<button class="' + (X.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { pick(mode, this.getAttribute('data-a')); };
  }
  function pick(mode, account) {
    var X = ST[mode]; if (account === X.account) return;
    X.account = account; chips(mode); load(mode, false).catch(function () {});
  }
  function load(mode, quiet) {
    var X = ST[mode], my = ++X.seq, body = 'lsBody_' + mode;
    var p = adtPeriodParams(X.period); p.mode = mode; if (X.account) p.account = X.account;
    return api('adtoolCpcListings', p).then(function (d) {
      if (my !== X.seq) return;
      X.data = d || {};
      var names = (d && d.accounts) || [];
      if (names.length) { X.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean); chips(mode); }
      if (!$(body)) return;
      draw(mode);
      adtPeriodEcho('lsBar_' + mode, d && d.period); adtFreshShow('lsFresh_' + mode, d && String(d.mode || '') === mode ? d.fresh : null);
      /* a window into today moves every 5 minutes; a finished window does not (session-expiry law in adtPoll) */
      if (adtIncludesToday(d && d.period, X.period)) { adtPoll(body, 300000, function () { return load(mode, true); }); } else { adtPollStop(body); }
    }).catch(function (e) {
      if (my !== X.seq) return;
      if (!quiet && $(body)) $(body).innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'This page could not load.') + '</div></div>';
      throw e;
    });
  }

  /* the columns: the CPC page's, minus the cost-per-click ratios that mean little off a CPC campaign, plus the
     campaign the listing is in and its sales across every channel */
  var COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'campaign', label: 'Campaign', title: 'the campaign the listing is live in, and its ad rate', cell: campCell, sortVal: function (r) { return String((r.lever && r.lever.campaign) || ''); } },
    { key: 'spend', label: 'Ad spend', cls: 'r', title: 'what the ads cost in the period', cell: function (r) { return gbp(r.spend); } },
    { key: 'attr_revenue', label: 'Sales from ads', cls: 'r', title: 'the sales eBay credits to the ads, with the units under it', cell: function (r) { return gbp(r.attr_revenue) + '<div class="cpc-sub">' + cnt(r.attr_units) + ' units</div>'; } },
    { key: 'roas', label: 'ROAS', cls: 'r', title: 'sales from ads ÷ ad spend', cell: function (r) { var v = roasOf(r); return '<span class="' + (v != null ? (v < 1 ? 'cpc-neg' : 'cpc-pos') : '') + '">' + roasTxt(v) + '</span>'; }, sortVal: roasOf },
    { key: 'orders', label: 'Orders', cls: 'r', title: 'orders on every channel in the period', cell: function (r) { return cnt(r.orders); } },
    { key: 'units', label: 'Units', cls: 'r', title: 'units sold on every channel in the period', cell: function (r) { return cnt(r.units); } },
    { key: 'revenue', label: 'Sales', cls: 'r', title: 'sales on every channel in the period', cell: function (r) { return gbp(r.revenue); } },
    { key: 'actual_profit', label: 'Profit', cls: 'r', src: 'orders', title: 'this listing on its own, worked out the same way as the Sales Analysis sheet', cell: function (r) { return adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders); }, sortVal: function (r) { return num(r.actual_profit); } },
    /* the slower-moving context sits to the right, so a narrow screen scrolls past it last */
    { key: 'units_30d', label: 'Sold 7·14·30 d', cls: 'r', title: 'units sold everywhere, 7 / 14 / 30 days to the end of the period', cell: function (r) { return cnt(r.units_7d) + ' · ' + cnt(r.units_14d) + ' · ' + cnt(r.units_30d); } },
    { key: 'product_cost', label: 'Product cost', cls: 'r', cell: costCell, sortVal: function (r) { return num(r.product_cost && r.product_cost.value); } },
    { key: 'listing_date', label: 'Listed', cls: 'r', cell: function (r) { return '<span class="cpc-sub" style="white-space:nowrap">' + dayTxt(r.listing_date) + '</span>'; }, sortVal: function (r) { return dayTxt(r.listing_date); } }
  ];
  function roasOf(r) { var v = num(r.roas); return v != null ? v : ratio(r.attr_revenue, r.spend); }
  function costCell(r) {
    var c = r.product_cost || {}, v = num(c.value);
    return '<div class="cpc-cost">' + (v == null ? '—' : gbp(v)) + '<span class="s">' + esc(c.source || (v == null ? 'not costed yet' : '')) + '</span></div>';
  }
  /* the lever names the campaign the listing is in: an ad rate for cost-per-sale (dynamic and general), a daily
     budget for cost-per-click (never on these pages, by construction), nothing when no running campaign has it */
  function campCell(r) {
    var L = r.lever || null;
    if (!L || L.kind === 'none' || !(L.campaign || L.campaign_id)) return '<div class="ls-camp"><span class="cpc-sub">no campaign</span></div>';
    var rate = L.kind === 'ad_rate' ? (num(L.bid_pct) != null ? 'ad rate ' + Math.round(num(L.bid_pct) * 100) / 100 + ' %' : 'ad rate not set') : (L.kind === 'budget' ? 'daily budget' + (num(L.budget) != null ? ' ' + gbp(L.budget) : '') : '');
    return '<div class="ls-camp">' + adtCampaignLink(L.campaign_id, L.campaign || L.campaign_id) + (rate ? '<div class="s">' + esc(rate) + '</div>' : '') + '</div>';
  }
  function sorter(X) {
    var key = X.sort.key, dir = X.sort.dir, col = null;
    for (var i = 0; i < COLS.length; i++) if (COLS[i].key === key) { col = COLS[i]; break; }
    var val = col && col.sortVal ? col.sortVal : function (r) { return num(r[key]); };
    return function (a, b) {
      var va = val(a), vb = val(b);
      if (typeof va === 'string' || typeof vb === 'string') { va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase(); return va < vb ? -dir : (va > vb ? dir : 0); }
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;   /* nulls sink */
      return (va - vb) * dir;
    };
  }

  function draw(mode) {
    var X = ST[mode], S = SETS[mode], D = X.data || {}, body = $('lsBody_' + mode);
    if (!body) return;
    /* an engine from before 27 Oct does not know this mode and answers the CPC page instead: show nothing */
    if (String(D.mode || '') !== mode) {
      body.innerHTML = '<div class="an-panel"><h3>Waiting for the engine update</h3><div class="an-sub">This page needs the engine update of 27 October. ' +
        'The engine answering now does not know this list yet, so nothing is shown here rather than the CPC listings under the wrong name.</div></div>';
      return;
    }
    var rows = (D.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    var total = num(D.rows_total) != null ? num(D.rows_total) : rows.length;
    var P = D.period, when = P && (P.label || P.from) ? adtPeriodText(P) : 'this period';
    var h = '<div class="cpc-top"><span><b>' + esc(S.title) + '</b></span><span>·</span><span>' + esc(when) + '</span><span>·</span><span>' + esc(X.account || 'all accounts') + '</span><span>·</span><span>' + cnt(total) + ' listing' + (total === 1 ? '' : 's') + '</span>' + src('listing set') + '</div>';
    h += tiles(D, total);
    h += accountPanel(mode, D);
    h += '<div class="cpc-note">' + S.rule + ' Profit is each listing\'s own, never a total. Nothing on this page is sent to eBay.</div>';
    if (!rows.length) {
      h += '<div class="cpc-empty">' + esc(S.none) + (X.account ? ' on ' + esc(X.account) : '') + '.</div>';
    } else {
      var shown = rows.slice().sort(sorter(X));
      if (total > rows.length) h += '<div class="cpc-sub" style="margin:0 0 6px">Showing the first ' + rows.length + ' of ' + cnt(total) + (mode === 'nocpc' ? ', most units sold first' : ', most ad spend first') + '. The tiles and the account table count all ' + cnt(total) + '.</div>';
      h += '<div class="an-scroll"><table class="cpc-tbl"><thead><tr>' + COLS.map(function (c) {
        var on = X.sort.key === c.key;
        return '<th class="' + (c.cls || '') + '" data-k="' + esc(c.key) + '" title="' + esc(c.title || c.label) + '">' + esc(c.label) + (on ? '<span class="ar">' + (X.sort.dir < 0 ? '▼' : '▲') + '</span>' : '') + (c.src ? src(c.src) : '') + '</th>';
      }).join('') + '</tr></thead><tbody>' +
        shown.map(function (r) { return '<tr>' + COLS.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    }
    h += '<div class="cpc-sub" style="margin-top:8px">' + esc(D.note || '') + (D.computed_at ? ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC' : '') + '</div>';
    body.innerHTML = h;
    var ths = body.querySelectorAll('th[data-k]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-k');
      if (X.sort.key === k) { X.sort.dir = -X.sort.dir; } else { X.sort.key = k; X.sort.dir = k === 'listing' || k === 'listing_date' || k === 'campaign' ? 1 : -1; }
      draw(mode);
    };
    var trs = body.querySelectorAll('tr.pick[data-a]');
    for (var j = 0; j < trs.length; j++) trs[j].onclick = function () { pick(mode, this.getAttribute('data-a')); };
  }

  /* collective tiles: counts, spend, sales, orders and units — never a profit total */
  function tiles(D, total) {
    var T = D.totals || {}, B = D.by_account || [];
    var sold = B.reduce(function (t, a) { return t + (num(a.with_sales) || 0); }, 0), rev = B.reduce(function (t, a) { return t + (num(a.revenue) || 0); }, 0);
    var roas = num(T.roas); if (roas == null) roas = ratio(T.attr_revenue, T.spend);
    function tile(k, v, d, cls) { return '<div class="cpc-tile ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="d">' + esc(d) + '</div></div>'; }
    return '<div class="cpc-tiles">' +
      tile('Listings', cnt(total), cnt(sold) + ' sold in the period', 'gold') +
      tile('Ad spend', gbp0(T.spend), 'what the ads cost', '') +
      tile('Sales from ads', gbp0(T.attr_revenue), 'ROAS ' + roasTxt(roas), roas != null && roas < 1 ? 'loss' : '') +
      tile('Sales', gbp0(rev), 'every channel', 'gold') +
      tile('Orders', cnt(T.orders), 'every channel', '') +
      tile('Units', cnt(T.units), cnt(T.attr_units) + ' of them from ads', '') +
      '</div>';
  }
  /* account by account (owner: "all account details & individual account by account information"): one row per
     account, a row picks that account; with one account picked the chips say so and the table is not needed */
  function accountPanel(mode, D) {
    var X = ST[mode], B = (D.by_account || []).filter(function (a) { return a && a.account; });
    if (X.account || B.length < 2) return '';
    var sum = function (k) { return B.reduce(function (t, a) { return t + (num(a[k]) || 0); }, 0); };
    var row = function (a, cls, attr) {
      var ro = num(a.roas); if (ro == null) ro = ratio(a.attr_revenue, a.spend);
      return '<tr class="' + cls + '"' + attr + '><td>' + (cls === 'tot' ? 'All accounts' : '<b>' + esc(a.account) + '</b>') + '</td><td>' + cnt(a.listings) + '</td><td>' + cnt(a.with_sales) + '</td><td>' + gbp0(a.spend) + '</td><td>' + gbp0(a.attr_revenue) + '</td>' +
        '<td class="' + (ro != null ? (ro < 1 ? 'cpc-neg' : 'cpc-pos') : '') + '">' + roasTxt(ro) + '</td><td>' + cnt(a.orders) + '</td><td>' + cnt(a.units) + '</td><td>' + gbp0(a.revenue) + '</td></tr>';
    };
    var all = { listings: sum('listings'), with_sales: sum('with_sales'), spend: sum('spend'), attr_revenue: sum('attr_revenue'), orders: sum('orders'), units: sum('units'), revenue: sum('revenue') };
    all.roas = ratio(all.attr_revenue, all.spend);
    return '<div class="an-panel"><h3>Account by account' + src('listing set') + '</h3><div class="an-sub">Every account over the same period. Click an account to see its listings alone.</div>' +
      '<div class="an-scroll"><table class="ls-acc"><thead><tr><th>Account</th><th>Listings</th><th>Sold in period</th><th>Ad spend</th><th>Sales from ads</th><th>ROAS</th><th>Orders</th><th>Units</th><th>Sales</th></tr></thead><tbody>' +
      B.map(function (a) { return row(a, 'pick', ' data-a="' + esc(a.account) + '"'); }).join('') + row(all, 'tot', '') +
      '</tbody></table></div></div>';
  }
})();
