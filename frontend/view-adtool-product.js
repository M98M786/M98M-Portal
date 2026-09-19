/* view-adtool-product.js — Advertising Tool · Product history (spec §7, Phase 1).
 * Hidden from every sidebar (hidden:true) and routable only by hash while its preview flag
 * (portal_config.adtool_page_product) is on; the engine refuses the data otherwise. Galaxy tokens
 * only: gold is the only accent, #e0563f the only loss colour, headings bold. Charts are Apache
 * ECharts bundled at assets/echarts.min.js (loaded once, on first use — CSP allows 'self'). */
(function () {
  var AT = { item: '', data: null, tab: 'week', echarts: null, charts: [] };
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var GOLD = '#f2b035', GOLD2 = '#ffd27a', LOSS = '#e0563f', WHITE55 = 'rgba(255,255,255,.55)', NEUTRAL = 'rgba(255,255,255,.28)', GRID = 'rgba(255,255,255,.08)', ZERO = 'rgba(255,255,255,.35)', BAND = 'rgba(242,176,53,.16)', PAUSED = 'rgba(224,86,63,.16)';
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var SLOTS = ['Night 00–06', 'Morning 06–12', 'Afternoon 12–17', 'Evening 17–24'];

  VIEW_CSS.push(
    '.at-wrap{max-width:1240px}' +
    '.at-search{display:flex;gap:8px;align-items:center;margin:8px 0 14px;flex-wrap:wrap}' +
    '.at-search input{flex:1 1 320px;min-width:200px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}' +
    '.at-search input:focus{outline:2px solid var(--gold-b);outline-offset:1px}' +
    '.at-recent{display:flex;gap:6px;flex-wrap:wrap;margin:-6px 0 12px}' +
    '.at-chip{display:inline-block;padding:3px 9px;border-radius:999px;border:1px solid var(--gold-line);background:var(--panel);font-size:11.5px;color:var(--text-2);cursor:pointer}' +
    '.at-chip:hover{border-color:var(--gold-line-hi);color:var(--text)}' +
    '.at-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}' +
    '.at-panel h3{margin:0 0 4px;font-size:15px;font-weight:800}' +
    '.at-panel .at-sub{font-size:12px;color:var(--text-2);margin:0 0 10px}' +
    '.at-src{display:inline-block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:8px;vertical-align:middle;font-weight:800}' +
    '.at-src.s{color:var(--gold-a);border-color:rgba(242,176,53,.4)}' +
    '.at-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px}' +
    '.at-kpi{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px}' +
    '.at-kpi .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.at-kpi .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.at-kpi .d{font-size:11.5px;color:var(--text-2);margin-top:2px}' +
    '.at-head{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}' +
    '.at-head .t{font-size:18px;font-weight:800;line-height:1.25;flex:1 1 420px}' +
    '.at-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
    '.at-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2)}' +
    '.at-tag.gold{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.at-tag.loss{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.at-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:900px){.at-grid2{grid-template-columns:1fr}}' +
    '.at-chart{width:100%;height:260px}.at-chart.tall{height:320px}.at-chart.short{height:200px}' +
    '.at-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}' +
    '.at-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);padding:6px 8px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.at-tbl td{padding:6px 8px;border-bottom:1px solid var(--gold-line)}.at-tbl td.r,.at-tbl th.r{text-align:right}' +
    '.at-pos{color:var(--gold-a)}.at-neg{color:#ffb3a6}' +
    '.at-tabs{display:flex;gap:6px;margin:0 0 8px}.at-tabs button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.at-tabs button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}' +
    '.at-heat{display:grid;grid-template-columns:44px repeat(24,1fr);gap:2px;font-size:10px}' +
    '.at-heat .c{height:16px;border-radius:3px;background:rgba(255,255,255,.05)}' +
    '.at-heat .lab{color:var(--text-3);line-height:16px}' +
    '.at-note{font-size:12.5px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:10px 12px}' +
    '.at-empty{color:var(--text-3);font-size:13px;padding:6px 0}' +
    '.at-actions textarea{width:100%;min-height:54px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;margin-top:8px}' +
    '.at-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:7px 12px;font:inherit;font-weight:800;cursor:pointer;margin-top:8px}' +
    '.at-btn:disabled{opacity:.5;cursor:default}' +
    '.at-list{list-style:none;padding:0;margin:8px 0 0}.at-list li{padding:6px 0;border-top:1px solid var(--gold-line);font-size:12.5px}.at-list li:first-child{border-top:0}.at-list .m{color:var(--text-3);font-size:11px}'
  );

  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'at-neg' : Number(v) > 0 ? 'at-pos' : ''); }
  function dfmt(d) { if (!d) return ''; var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return Number(d.slice(8, 10)) + ' ' + m[Number(d.slice(5, 7)) - 1]; }
  function src(t, sampled) { return '<span class="at-src' + (sampled ? ' s' : '') + '" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }

  function loadECharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    if (AT.loading) return AT.loading;
    AT.loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = 'assets/echarts.min.js'; s.async = true;
      s.onload = function () { resolve(window.echarts); }; s.onerror = function () { reject(new Error('charts library did not load')); };
      document.head.appendChild(s);
    });
    return AT.loading;
  }
  /* Every other graph in the portal shows its figures on the chart; these showed a shape and hid the
     number in a tooltip. ECharts drops any label that would collide with its neighbour, so a dense
     series thins itself instead of smearing — the same trick chartValueDots plays with minGap. */
  var PILL = { show: true, position: 'top', fontSize: 9, fontWeight: 800, color: '#1c1200',
    backgroundColor: GOLD, borderRadius: 7, padding: [2, 5, 1, 5] };
  var LAYOUT = { hideOverlap: true };
  function pillInt(o) { return o.value == null || o.value === 0 ? '' : Math.round(o.value); }
  function chartBase(extra) {
    return Object.assign({ backgroundColor: 'transparent', textStyle: { color: '#9aa4b1', fontFamily: 'Instrument Sans, system-ui, sans-serif' }, animation: false,
      grid: { left: 44, right: 14, top: 26, bottom: 28 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,6,10,.92)', borderColor: 'rgba(255,255,255,.14)', textStyle: { color: '#fff', fontSize: 12 } },
      xAxis: { type: 'category', axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 } } }, extra || {});
  }
  function mount(id, option) {
    var el = document.getElementById(id); if (!el || !window.echarts) return;
    var c = window.echarts.getInstanceByDom(el) || window.echarts.init(el, null, { renderer: 'canvas' });
    c.setOption(option, true); AT.charts.push(c);
  }

  VIEWS.adtoolProduct = {
    label: 'Product history', hidden: true, order: 95, roles: ROLES,
    icon: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/>',
    render: function () {
      return '<div class="at-wrap">' +
        '<div class="hgroup enter d1"><h1>Product history</h1><span class="sub">Advertising tool · preview · every number from the engine\'s own rollups (eBay ads report · orders · Brain v17)</span></div>' +
        '<div class="at-search"><input id="atQ" type="search" placeholder="Item id or title — press Enter" autocomplete="off"><button class="at-btn" id="atGo" style="margin-top:0">Open</button></div>' +
        '<div class="at-recent" id="atRecent"></div>' +
        '<div id="atBody"><div class="at-empty">Type an item id or part of a title. Recent advertised listings appear above once the rollup has run.</div></div>' +
        '</div>';
    },
    init: function () {
      var q = $('atQ'), go = $('atGo');
      /* hand-off + reload memory: the shell routes on the bare hash, so the item id lives in
         localStorage (the portal's convention for cross-page hand-offs), never in the hash */
      var last = ''; try { last = localStorage.getItem('m98m:adtoolItem') || ''; } catch (e) {}
      if (/^\d{9,13}$/.test(last)) { AT.item = last; q.value = last; }
      go.onclick = function () { AT.item = q.value.trim(); if (/^\d{9,13}$/.test(AT.item)) { load(AT.item); } else { search(AT.item); } };
      q.onkeydown = function (e) { if (e.key === 'Enter') go.onclick(); };
      api('adtoolSearch', { q: '' }).then(function (d) { recent(d.results || []); }).catch(function (e) { $('atRecent').innerHTML = '<span class="at-empty">' + esc(e.message || 'search unavailable') + '</span>'; });
      if (AT.item) load(AT.item);
    }
  };

  function recent(list) {
    $('atRecent').innerHTML = list.map(function (r) { return '<span class="at-chip" data-id="' + esc(r.item_id) + '" title="' + esc(r.title) + '">' + esc(r.item_id) + ' · ' + esc(String(r.title || '').slice(0, 34)) + '</span>'; }).join('');
    var chips = document.querySelectorAll('#atRecent .at-chip');
    for (var i = 0; i < chips.length; i++) chips[i].onclick = function () { $('atQ').value = this.getAttribute('data-id'); load(this.getAttribute('data-id')); };
  }
  function search(q) {
    if (!q) return;
    $('atBody').innerHTML = '<div class="at-empty">Searching…</div>';
    api('adtoolSearch', { q: q }).then(function (d) {
      var rows = d.results || [];
      if (!rows.length) { $('atBody').innerHTML = '<div class="at-empty">No listing matches “' + esc(q) + '”.</div>'; return; }
      $('atBody').innerHTML = '<div class="at-panel"><h3>Matches</h3><table class="at-tbl"><thead><tr><th>Item</th><th>Account</th><th>Title</th><th>Price</th><th>Last ad day</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td><a href="#" class="at-open" data-id="' + esc(r.item_id) + '">' + esc(r.item_id) + '</a></td><td>' + esc(r.account) + '</td><td>' + esc(r.title) + '</td><td class="r">' + gbp(r.price) + '</td><td>' + esc(r.last_ad_day || '—') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      var links = document.querySelectorAll('.at-open');
      for (var i = 0; i < links.length; i++) links[i].onclick = function (e) { e.preventDefault(); $('atQ').value = this.getAttribute('data-id'); load(this.getAttribute('data-id')); };
    }).catch(function (e) { $('atBody').innerHTML = '<div class="at-empty">' + esc(e.message || 'search failed') + '</div>'; });
  }

  function load(id) {
    AT.item = id;
    try { localStorage.setItem('m98m:adtoolItem', id); } catch (e) {}
    $('atBody').innerHTML = '<div class="at-empty">Loading ' + esc(id) + '…</div>';
    var t0 = Date.now();
    Promise.all([api('adtoolListing', { item_id: id }), loadECharts().catch(function () { return null; })]).then(function (res) {
      AT.data = res[0]; AT.ms = Date.now() - t0;
      draw();
    }).catch(function (e) { $('atBody').innerHTML = '<div class="at-panel"><h3>Not available</h3><div class="at-sub">' + esc(e.message || 'failed') + '</div></div>'; });
  }

  function kpi(k, v, d, c) { return '<div class="at-kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (c || '') + '">' + v + '</div><div class="d">' + d + '</div></div>'; }

  function draw() {
    var D = AT.data, H = D.header, K = D.kpis;
    var h = '';
    /* header */
    h += '<div class="at-panel"><div class="at-head"><div><div class="t">' + esc(H.title) + '</div>' +
      '<div class="at-meta"><span class="at-tag gold">' + esc(H.account) + '</span><span class="at-tag">Item ' + esc(H.item_id) + '</span><span class="at-tag">' + esc(H.category || 'Unclassified') + (H.category_source === 'manual' ? ' · manual' : '') + '</span>' +
      (H.is_case ? '<span class="at-tag">' + esc(H.case_type) + '</span>' : '') + '<span class="at-tag">' + esc(H.status || '') + '</span>' +
      (D.profile && D.profile.stage ? '<span class="at-tag ' + (/Decline|Dormant|Dead/.test(D.profile.stage.stage) ? 'loss' : 'gold') + '" title="confidence ' + esc(String(D.profile.stage.confidence)) + ' · 28-day slope ' + esc(String(D.profile.stage.slope28)) + ' %/day · level ' + esc(String(D.profile.stage.level28)) + '/day vs peak ' + esc(String(D.profile.stage.peak_level)) + '">Stage: ' + esc(D.profile.stage.label || D.profile.stage.stage) + ' · ' + Math.round(Number(D.profile.stage.confidence) * 100) + '% · day ' + esc(String(D.profile.stage.days_in_stage)) + '</span>' : '<span class="at-tag">Stage: not computed yet</span>') + '</div></div>' +
      '<div style="flex:0 0 auto;min-width:230px;font-size:12.5px;color:var(--text-2);line-height:1.7">' +
      '<div>Price <b style="color:var(--text)">' + gbp(H.price) + '</b></div>' +
      '<div>Margin before ads <b style="color:var(--text)">' + gbp(H.margin) + '</b> <span class="at-src">' + esc(H.margin_source || '') + '</span></div>' +
      '<div>Break-even ROAS <b style="color:var(--text)">' + roas(H.breakeven_roas) + '</b></div>' +
      '<div>Listed ' + esc(H.start_time ? String(H.start_time).slice(0, 10) : '—') + (H.age_days != null ? ' · ' + H.age_days + ' days' : '') + '</div>' +
      '<div>First ad day ' + esc(H.first_ad_day || '—') + ' · last ' + esc(H.last_ad_day || '—') + '</div></div></div></div>';
    /* KPIs */
    var w = [['Yesterday', K.yesterday], ['Last 7 days', K.d7], ['Last 30 days', K.d30], ['All time (from 13 Aug)', K.all]];
    h += '<div class="at-kpis">' + w.map(function (x) { var s = x[1]; return kpi(x[0], (s.attr_units || 0) + ' ad sales', gbp(s.spend, 0) + ' spend · ROAS ' + roas(s.roas) + ' · <span class="' + cls(s.ad_profit) + '">' + pm(s.ad_profit) + ' est. ad profit</span>'); }).join('') +
      kpi('Orders, all channels · 30d', String(K.d30.orders || 0), Math.max(0, (K.d30.units || 0) - (K.d30.attr_units || 0)) + ' units not from ads · Brain v17 actual <span class="' + cls(K.d30.actual) + '">' + pm(K.d30.actual) + '</span>' + (K.d30.pending ? ' · ' + K.d30.pending + ' orders pending cost' : '')) + '</div>';
    /* where its ads sit — live rows when the campaign-truth phase has them, the refresh's snapshot otherwise */
    var Wr = D.where && D.where.rows ? D.where.rows : null; var C = D.campaigns || [];
    h += '<div class="at-panel"><h3>Where its ads sit right now' + src('campaign map, synced every 15 min') + '</h3><div class="at-sub">Campaign, type, campaign status and this listing\'s ad status inside it. Cost-per-sale ads carry no per-ad status on eBay; "exists" means live unless archived.' + (Wr && D.where.note ? ' ' + esc(D.where.note) + '.' : '') + '</div>' +
      (Wr ? (Wr.length ? '<div style="overflow-x:auto"><table class="at-tbl"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>This ad</th><th class="r">Ad rate</th><th class="r">Daily budget</th><th class="r">Spend yday</th><th class="r">Sales yday</th><th class="r">7-day spend</th><th class="r">7-day ROAS</th><th>Last change</th></tr></thead><tbody>' +
        Wr.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.funding === 'COST_PER_CLICK' ? 'CPC (Advanced)' : c.funding === 'COST_PER_SALE' ? 'Cost per sale' : c.funding || '?') + '</td><td>' + esc(c.campaign_status || '?') + '</td><td><span class="at-tag ' + (c.live ? 'gold' : 'loss') + '">' + esc(c.ad_state) + (c.live ? ' · live' : '') + '</span></td><td class="r">' + esc(c.ad_bid ? c.ad_bid + '%' : (c.campaign_bid ? c.campaign_bid + '% (campaign)' : '—')) + '</td><td class="r">' + (c.budget != null ? gbp(c.budget, 0) : '—') + '</td><td class="r">' + gbp(c.spend_yesterday) + '</td><td class="r">' + (c.units_yesterday == null ? '—' : c.units_yesterday + ' · ' + gbp(c.revenue_yesterday)) + '</td><td class="r">' + gbp(c.spend_7d) + '</td><td class="r">' + roas(c.roas_7d) + '</td><td>' + (c.last_change ? esc(String(c.last_change).replace('T', ' ').slice(0, 16)) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (D.where.history && D.where.history.length ? '<div class="at-sub" style="margin-top:8px">Status changes: ' + D.where.history.slice(0, 6).map(function (x) { return esc(String(x.seen_at).replace('T', ' ').slice(0, 16)) + ' ' + esc(x.name) + ' ' + esc(x.from_status || '—') + ' → ' + esc(x.to_status); }).join(' · ') + '</div>' : '') : '<div class="at-empty">Not in any campaign the map knows.</div>') :
      (C.length ? '<table class="at-tbl"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>Ad status</th><th class="r">Ad rate</th><th class="r">Daily budget</th></tr></thead><tbody>' +
        C.map(function (c) { var st = c.funding === 'COST_PER_SALE' ? (c.ad_status === 'ARCHIVED' ? 'archived' : 'exists (live)') : (c.ad_status || 'unknown'); return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.funding === 'COST_PER_CLICK' ? 'CPC (Advanced)' : c.funding === 'COST_PER_SALE' ? 'Cost per sale' : c.funding || '?') + '</td><td>' + esc(c.status || '?') + '</td><td>' + esc(st) + '</td><td class="r">' + esc(c.bid ? c.bid + '%' : '—') + '</td><td class="r">' + (c.budget != null ? gbp(c.budget, 0) : '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="at-empty">Not in any campaign the map knows.</div>')) + '</div>';
    /* yesterday hour by hour + all-time daily */
    h += '<div class="at-grid2">' +
      '<div class="at-panel"><h3>Yesterday\'s behaviour' + src('orders') + src('sampled', true) + '</h3><div class="at-sub">' + esc(D.hourly_note) + '. The pale line is what this weekday\'s hour profile expected.</div><div id="atHour" class="at-chart"></div></div>' +
      '<div class="at-panel"><h3>Time slots, last 28 days' + src('orders') + '</h3><div class="at-sub">Orders landing in each UK slot; ad spend per hour joins as the sampled history grows.</div><table class="at-tbl"><thead><tr><th>Slot</th><th class="r">Share</th><th class="r">Orders / day</th><th class="r">Revenue / day</th></tr></thead><tbody>' +
      D.slots.map(function (s) { return '<tr><td>' + SLOTS[s.slot] + '</td><td class="r">' + (s.share == null ? '—' : Math.round(s.share * 100) + '%') + '</td><td class="r">' + s.orders_day + '</td><td class="r">' + gbp(s.revenue_day) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    h += '<div class="at-panel"><h3>All-time daily' + src('orders') + src('eBay ads report') + '</h3><div class="at-sub">Units all channels (gold), 7-day average (white), ad-attributed units (dots), ad spend (bars, faint). Paused periods, budget-capped days and the forecast band arrive with Phases 2–4.</div><div id="atDaily" class="at-chart tall"></div></div>';
    /* week / month */
    h += '<div class="at-panel"><div class="at-tabs"><button class="' + (AT.tab === 'week' ? 'on' : '') + '" data-tab="week">Week to week</button><button class="' + (AT.tab === 'month' ? 'on' : '') + '" data-tab="month">Month to month</button></div><div id="atWM" class="at-chart short"></div></div>';
    /* weekday profile + heat map */
    h += '<div class="at-grid2">' +
      '<div class="at-panel"><h3>Weekday profile, last 30 days' + src('eBay ads report') + '</h3><div class="at-sub">' + (D.profile && D.profile.weekday && D.profile.weekday.rates ? 'Shrunk rates (κ 4 days, prior: ' + esc(D.profile.weekday.prior_source || 'account') + ', half-life 14 days) next to the plain 30-day averages. Shuffle test: ' + (D.profile.weekday.spread && D.profile.weekday.spread.p != null ? 'p = ' + D.profile.weekday.spread.p + ' → <b>' + (D.profile.weekday.spread.p < 0.05 ? 'real weekday effect' : 'within noise') + '</b>' : 'not enough dates yet') + '.' : 'Plain averages per weekday; the shrunk profile and the shuffle test arrive with the first profiles run.') + '</div><div id="atWd" class="at-chart short"></div>' +
      '<table class="at-tbl"><thead><tr><th>Day</th><th class="r">Dates</th><th class="r">Units/day</th><th class="r">Ad sales/day</th><th class="r">Spend/day</th><th class="r">Ad profit/day</th></tr></thead><tbody>' +
      D.weekday.map(function (x, i) { var pr = D.profile && D.profile.weekday && D.profile.weekday.rates ? D.profile.weekday.rates[i] : null; return '<tr><td>' + x.day + '</td><td class="r">' + x.dates + '</td><td class="r">' + (x.units_day == null ? '—' : x.units_day) + (pr ? ' <span class="at-src" title="shrunk rate, all history, decayed">' + (Math.round(pr.rate * 100) / 100) + '</span>' : '') + '</td><td class="r">' + (x.attr_units_day == null ? '—' : x.attr_units_day) + '</td><td class="r">' + gbp(x.spend_day) + '</td><td class="r ' + cls(x.ad_profit_day) + '">' + pm(x.ad_profit_day) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="at-panel"><h3>Hour × weekday, last 28 days' + src('orders') + '</h3><div class="at-sub">Units per hour cell, black → gold. Sunday is the last row.</div>' + heat(D.heat) + '</div></div>';
    /* dom + P&L */
    h += '<div class="at-grid2">' +
      '<div class="at-panel"><h3>Best dates of the month' + src('orders') + '</h3><div class="at-sub">Average units per calendar date over the tool\'s history (from 13 Aug 2026).</div><div id="atDom" class="at-chart short"></div></div>' +
      '<div class="at-panel"><h3>Profit &amp; loss' + src('eBay ads report') + src('Brain v17') + '</h3><div class="at-sub">Est. ad profit (attributed × margin − spend) next to the listing\'s Brain v17 actual profit. Never added together.</div><table class="at-tbl"><thead><tr><th>Window</th><th class="r">Ad spend</th><th class="r">Ad sales</th><th class="r">ROAS</th><th class="r">Est. ad profit</th><th class="r">Orders</th><th class="r">Actual profit</th></tr></thead><tbody>' +
      w.map(function (x) { var s = x[1]; return '<tr><td>' + x[0] + '</td><td class="r">' + gbp(s.spend) + '</td><td class="r">' + s.attr_units + '</td><td class="r">' + roas(s.roas) + '</td><td class="r ' + cls(s.ad_profit) + '">' + pm(s.ad_profit) + '</td><td class="r">' + s.orders + '</td><td class="r ' + cls(s.actual) + '">' + pm(s.actual) + (s.pending ? ' <span class="at-src">' + s.pending + ' pending</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    /* notes, decision, actions */
    if (D.profile && D.profile.descriptors) { var ds = D.profile.descriptors; h += '<div class="at-panel"><h3>Behaviour descriptors' + src('profiles · ' + (ds.day || '')) + '</h3><div class="at-sub">Spec §6.4, last 28 days unless stated.</div><div class="at-kpis">' + [['Weekday effect', esc(ds.weekday_best) + ' best · ' + esc(ds.weekday_worst) + ' worst', (ds.weekday_ratio != null ? 'ratio ' + ds.weekday_ratio + ' · ' : '') + esc(ds.weekday_label || '')], ['Slot concentration', SLOTS[ds.top_slot] || '—', 'top share ' + Math.round((ds.top_slot_share || 0) * 100) + '% · HHI ' + ds.slot_hhi], ['Volatility', ds.volatility_cv28 == null ? '—' : 'CV ' + ds.volatility_cv28, 'zero-sale days ' + Math.round((ds.intermittency28 || 0) * 100) + '%'], ['Ad dependence', ds.ad_dependence28 == null ? '—' : Math.round(ds.ad_dependence28 * 100) + '%', 'attributed ÷ all units'], ['Spend elasticity', ds.spend_elasticity == null ? 'not enough levels' : ds.spend_elasticity + ' units/£', ds.elasticity_levels + ' spend level' + (ds.elasticity_levels === 1 ? '' : 's') + ' seen']].map(function (x) { return '<div class="at-kpi"><div class="k">' + x[0] + '</div><div class="v" style="font-size:15px">' + x[1] + '</div><div class="d">' + x[2] + '</div></div>'; }).join('') + '</div>' + (D.profile.regime && D.profile.regime.regime_change ? '<div class="at-note">Pattern changed: ' + esc(D.profile.regime.note) + '</div>' : '') + '</div>'; }
    /* §7: pattern changes — the regime history, what moved and when. The rows come from adtool_regimes, the
       same detections A17 fires on, so the page and the alert can never tell different stories. */
    var rg = D.profile && D.profile.regime, rh = (D.profile && D.profile.regime_history) || [];
    h += '<div class="at-panel"><h3>Pattern changes' + src('regimes · §6.3a') + '</h3>'
      + '<div class="at-sub">' + (rg && rg.regime_change ? 'Today the shape of this listing\'s day has moved against its own prior 28 days.'
          : rg && rg.reason ? 'Nothing detected today — ' + esc(rg.reason) + '.'
          : 'Nothing detected today.') + '</div>'
      + (rh.length
          ? '<table class="at-tbl"><thead><tr><th>Detected</th><th>What</th><th>What moved</th></tr></thead><tbody>'
            + rh.map(function (r) { return '<tr><td>' + esc(r.detected_day) + '</td><td>' + esc(r.kind) + '</td><td>' + esc(r.note || '') + '</td></tr>'; }).join('')
            + '</tbody></table>'
          : '<div class="at-empty">No pattern change has been detected for this listing yet. Detection needs enough orders on both sides of the comparison; the reason above says when it could not run.</div>')
      + '</div>';

    h += '<div class="at-grid2">' +
      '<div class="at-panel"><h3>Behaviour notes' + (D.narrative ? src(D.narrative.model === 'template' ? 'written from the numbers' : 'model, validated') : '') + '</h3><div class="at-note" id="atNarr">' + (D.narrative ? esc(D.narrative.text) + (D.narrative.validated ? '' : ' <b>(a figure in this text is not in its inputs — held back)</b>') : 'No narrative yet. <a href="#" id="atNarrGo">Write one from the numbers</a>.') + '</div>' +
      '<h3 style="margin-top:12px">Today\'s decision</h3><div class="at-note">' + (D.decision ? '<b>' + esc(D.decision.decision) + '</b> · ' + esc(D.decision.confidence) + ' · ' + esc(D.decision.action) + '<div class="at-sub" style="margin:4px 0 0">' + esc(D.decision.why) + '</div><div class="at-sub" style="margin:2px 0 0">' + esc(D.decision.day) + ' ' + esc(D.decision.batch) + ' batch · rules ' + esc((function () { try { return JSON.parse(D.decision.rules_json || '[]').join(', '); } catch (e) { return ''; } })() || '—') + ' · EV ' + pm(D.decision.expected_value) + (D.decision.outcome_score != null ? ' · scored ' + (D.decision.outcome_score ? 'right' : 'wrong') : '') + ' · shadow, nothing sent to eBay</div>' : 'The decision engine has not run for this listing yet.') + '</div></div>' +
      '<div class="at-panel at-actions"><h3>Action log</h3><div class="at-sub">What the team did with this listing, with dates. Notes only; nothing here reaches eBay.</div>' +
      '<ul class="at-list" id="atActs">' + (D.actions.length ? D.actions.map(function (a) { return '<li>' + esc(a.note) + '<div class="m">' + esc(a.type) + ' · ' + esc(a.by_email) + ' · ' + esc(String(a.at).slice(0, 16)) + '</div></li>'; }).join('') : '<li class="at-empty">No actions logged yet.</li>') + '</ul>' +
      '<textarea id="atNote" placeholder="Add a note (what was changed, where, why)"></textarea><button class="at-btn" id="atNoteBtn">Log note</button></div></div>';
    h += '<div class="at-note" style="margin-top:4px">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + ' · ' + D.sample_size + ' listing-days · answered in ' + AT.ms + ' ms</div>';
    $('atBody').innerHTML = h;
    var tabs = document.querySelectorAll('.at-tabs button');
    for (var i = 0; i < tabs.length; i++) tabs[i].onclick = function () { AT.tab = this.getAttribute('data-tab'); for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('on', tabs[j] === this); drawWM(); };
    $('atNoteBtn').onclick = function () {
      var n = $('atNote').value.trim(); if (!n) return;
      this.disabled = true;
      api('adtoolActionLog', { item_id: AT.item, type: 'note', note: n }).then(function () { toast('Logged'); load(AT.item); }).catch(function (e) { toast(e.message || 'failed'); $('atNoteBtn').disabled = false; });
    };
    var ng = $('atNarrGo'); if (ng) ng.onclick = function (e) { e.preventDefault(); $('atNarr').textContent = 'Writing…'; api('adtoolNarrative', { scope: 'listing', scope_id: AT.item }).then(function (r) { $('atNarr').innerHTML = esc(r.text) + (r.validated ? '' : ' <b>(a figure is not in its inputs — held back)</b>'); }).catch(function (x) { $('atNarr').textContent = x.message || 'failed'; }); };
    if (window.echarts) { drawHour(); drawDaily(); drawWM(); drawWd(); drawDom(); } else { var ids = ['atHour', 'atDaily', 'atWM', 'atWd', 'atDom']; ids.forEach(function (id) { var el = $(id); if (el) el.innerHTML = '<div class="at-empty">Charts need assets/echarts.min.js, which did not load.</div>'; }); }
  }

  function heat(grid) {
    var mx = 0; grid.forEach(function (r) { r.forEach(function (v) { mx = Math.max(mx, v); }); });
    var h = '<div class="at-heat"><div class="lab"></div>';
    for (var x = 0; x < 24; x++) h += '<div class="lab" style="text-align:center">' + (x % 3 === 0 ? x : '') + '</div>';
    grid.forEach(function (r, d) {
      h += '<div class="lab">' + DOW[d] + '</div>';
      r.forEach(function (v, x) { var a = mx ? v / mx : 0; h += '<div class="c" title="' + DOW[d] + ' ' + x + ':00 — ' + v + ' units" style="background:' + (v ? 'rgba(242,176,53,' + (0.15 + 0.85 * a).toFixed(2) + ')' : 'rgba(255,255,255,.05)') + '"></div>'; });
    });
    return h + '</div>';
  }
  function drawHour() {
    var D = AT.data; var days = D.days; var yday = days.length ? days[days.length - 1].day : '';
    var hrs = D.hours.filter(function (x) { return x.day === yday; });
    var ord = new Array(24).fill(0), sp = new Array(24).fill(0), anyS = false;
    hrs.forEach(function (x) { ord[x.hour] = x.units; var v = x.spend_r != null ? x.spend_r : x.spend_s; if (v) { sp[x.hour] = v; anyS = true; } });
    var series = [{ name: 'Units', type: 'bar', data: ord, label: Object.assign({}, PILL, { formatter: pillInt }), labelLayout: LAYOUT, itemStyle: { color: GOLD, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 14 }];
    if (D.profile && D.profile.hour_weekday && D.profile.hour_weekday.shares && yday) { var wdi = dowOf(yday); var tot = ord.reduce(function (t, v) { return t + v; }, 0); var rowShares = D.profile.hour_weekday.shares.slice(wdi * 24, wdi * 24 + 24); var rs = rowShares.reduce(function (t, v) { return t + v; }, 0) || 1; series.push({ name: 'Profile (expected share × yesterday\'s total)', type: 'line', data: rowShares.map(function (v) { return Math.round(v / rs * tot * 100) / 100; }), lineStyle: { color: 'rgba(255,255,255,.35)', width: 1.5, type: 'dashed' }, symbol: 'none' }); }
    var y = [{ type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 }, name: 'units', nameTextStyle: { color: '#66707c' } }];
    if (anyS) { y.push({ type: 'value', splitLine: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, formatter: '£{value}' }, name: 'ad spend (sampled)', nameTextStyle: { color: '#66707c' } }); series.push({ name: 'Ad spend (sampled)', type: 'line', yAxisIndex: 1, data: sp.map(function (v) { return Math.round(v * 100) / 100; }), lineStyle: { color: WHITE55, width: 2 }, itemStyle: { color: WHITE55 }, symbolSize: 5, smooth: false }); }
    mount('atHour', chartBase({ xAxis: { type: 'category', data: Array.from({ length: 24 }, function (_, i) { return String(i).padStart(2, '0'); }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, yAxis: y, legend: { show: anyS, top: 0, right: 0, textStyle: { color: '#9aa4b1', fontSize: 11 } }, series: series, title: { text: yday ? DOW[dowOf(yday)] + ' ' + dfmt(yday) : '', left: 0, top: 0, textStyle: { color: '#9aa4b1', fontSize: 11, fontWeight: 'normal' } } }));
  }
  function dowOf(ymd) { var d = new Date(ymd + 'T12:00:00Z'); return (d.getUTCDay() + 6) % 7; }
  function drawDaily() {
    var days = AT.data.days; var x = days.map(function (d) { return d.day.slice(5); });
    var units = days.map(function (d) { return d.units; }); var attr = days.map(function (d) { return d.attr_units; }); var spend = days.map(function (d) { return d.spend; });
    var avg = units.map(function (_, i) { var a = units.slice(Math.max(0, i - 6), i + 1); return Math.round(a.reduce(function (t, v) { return t + v; }, 0) / a.length * 10) / 10; });
    var fc = AT.data.forecast && AT.data.forecast.rows ? AT.data.forecast.rows.slice(0, 14) : [];
    if (fc.length) { x = x.concat(fc.map(function (r) { return r.target_day.slice(5); })); var pad = function (arr) { return arr.concat(fc.map(function () { return null; })); }; units = pad(units); attr = pad(attr); spend = pad(spend); avg = pad(avg); }
    mount('atDaily', chartBase({ xAxis: { type: 'category', data: x, axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } },
      yAxis: [{ type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 }, name: 'units', nameTextStyle: { color: '#66707c' } }, { type: 'value', splitLine: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, formatter: '£{value}' }, name: 'ad spend', nameTextStyle: { color: '#66707c' } }],
      legend: { top: 0, right: 0, textStyle: { color: '#9aa4b1', fontSize: 11 } },
      series: [{ name: 'Ad spend', type: 'bar', yAxisIndex: 1, data: spend, itemStyle: { color: NEUTRAL }, barMaxWidth: 10 }, { name: 'Units (all channels)', type: 'line', data: units, lineStyle: { color: GOLD, width: 2 }, itemStyle: { color: GOLD }, symbolSize: 4, areaStyle: { color: BAND } }, { name: '7-day average', type: 'line', data: avg, lineStyle: { color: WHITE55, width: 2 }, symbol: 'none' }, { name: 'Ad-attributed units', type: 'scatter', data: attr, itemStyle: { color: GOLD2 }, symbolSize: 5 }].concat(fc.length ? [{ name: 'band', type: 'line', data: days.map(function () { return null; }).concat(fc.map(function (r) { return r.units_lo; })), stack: 'fb', lineStyle: { opacity: 0 }, symbol: 'none', silent: true }, { name: '14-day forecast band (' + fc[0].model + ', made ' + AT.data.forecast.made_day + ')', type: 'line', data: days.map(function () { return null; }).concat(fc.map(function (r) { return Math.round((r.units_hi - r.units_lo) * 100) / 100; })), stack: 'fb', lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(255,255,255,.12)' }, symbol: 'none' }, { name: 'Forecast', type: 'line', data: days.map(function () { return null; }).concat(fc.map(function (r) { return r.units_mean; })), lineStyle: { color: WHITE55, width: 2, type: 'dashed' }, symbol: 'none' }] : []) }));
  }
  function drawWM() {
    var rows = AT.tab === 'week' ? AT.data.weeks : AT.data.months; var key = AT.tab === 'week' ? 'iso_week' : 'month';
    mount('atWM', chartBase({ xAxis: { type: 'category', data: rows.map(function (r) { return r[key]; }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, legend: { top: 0, right: 0, textStyle: { color: '#9aa4b1', fontSize: 11 } },
      series: [{ name: 'Units', type: 'bar', data: rows.map(function (r) { return r.units; }), label: Object.assign({}, PILL, { formatter: pillInt }), labelLayout: LAYOUT, itemStyle: { color: GOLD, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 26, label: { show: true, position: 'top', color: '#9aa4b1', fontSize: 10 } }, { name: 'Ad sales', type: 'bar', data: rows.map(function (r) { return r.attr_units; }), itemStyle: { color: WHITE55, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 26 }, { name: 'Est. ad profit £', type: 'line', data: rows.map(function (r) { return r.ad_profit; }), lineStyle: { color: LOSS, width: 2 }, itemStyle: { color: LOSS }, symbolSize: 5 }] }));
  }
  function drawWd() {
    var wd = AT.data.weekday;
    mount('atWd', chartBase({ xAxis: { type: 'category', data: wd.map(function (x) { return x.day; }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, legend: { top: 0, right: 0, textStyle: { color: '#9aa4b1', fontSize: 11 } },
      series: [{ name: 'Ad sales / day', type: 'bar', data: wd.map(function (x) { return x.attr_units_day; }), itemStyle: { color: function (p) { return p.dataIndex === 6 ? GOLD2 : GOLD; }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 }, { name: 'Est. ad profit / day £', type: 'bar', data: wd.map(function (x) { return x.ad_profit_day; }), itemStyle: { color: function (p) { return Number(p.value) < 0 ? LOSS : WHITE55; }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 }] }));
  }
  function drawDom() {
    var dom = AT.data.dom;
    mount('atDom', chartBase({ xAxis: { type: 'category', data: dom.map(function (x) { return x.dom; }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, interval: 4 } },
      series: [{ name: 'Units / day', type: 'bar', data: dom.map(function (x) { return x.units_day; }), itemStyle: { color: function (p) { return p.dataIndex >= 24 ? GOLD2 : GOLD; }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 12 }] }));
  }
})();
