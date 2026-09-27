/* view-adtool-forecast.js — Advertising Tool · Forecast & behaviour lab (spec §7, Phase 4). Hidden; flag adtool_page_forecast.
 * Accuracy is shown, never claimed: the scorecard and the realised-vs-forecast panel sit next to every forecast. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var GOLD = '#f2b035', GOLD2 = '#ffd27a', WHITE55 = 'rgba(255,255,255,.55)', BAND = 'rgba(242,176,53,.16)', GRID = 'rgba(255,255,255,.08)', ZERO = 'rgba(255,255,255,.35)', LOSS = '#e0563f';
  VIEW_CSS.push('.fl-chart{width:100%;height:300px}.fl-spark{display:inline-block;vertical-align:middle;margin-left:6px}' +
    /* Phase 4: objective banner, forecast-vs-actual metric grid, action scenarios, stage explainer */
    '.fl-obj{font-size:13px;color:var(--text);background:var(--panel-2);border:1px solid var(--gold-line);border-left:3px solid var(--gold-b);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-weight:600;line-height:1.5}' +
    '.fl-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}' +
    '.fl-mh{font-weight:800;font-size:12px;margin-bottom:2px}' +
    '.fl-mape{display:inline-block;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:800;border:1px solid var(--gold-line);color:var(--gold-a);margin-left:6px}' +
    '.fl-mape.hi{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.fl-lc{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid rgba(224,86,63,.5);color:#ffb3a6;margin-left:6px}' +
    '.fl-sc{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px}@media(max-width:760px){.fl-sc{grid-template-columns:1fr}}' +
    '.fl-scc{background:var(--panel-2);border:1px solid var(--gold-line);border-radius:10px;padding:9px 11px}' +
    '.fl-scc.A{border-left:3px solid rgba(255,255,255,.35)}.fl-scc.B{border-left:3px solid var(--gold-b)}.fl-scc.C{border-left:3px solid #e0563f}' +
    '.fl-scc .h{font-weight:800;font-size:12px;margin-bottom:4px}' +
    '.fl-scc .fig{font-size:11.5px;color:var(--text-2);line-height:1.6}.fl-scc .fig b{color:var(--text)}' +
    '.fl-scc .lim{font-size:11px;color:#ffb3a6;margin-top:5px}.fl-scc .mc{font-size:11px;color:var(--gold-a);margin-top:3px}' +
    '.fl-stagebtn{background:transparent;border:0;color:var(--gold-a);font:inherit;font-weight:800;font-variant-numeric:tabular-nums;cursor:pointer;text-decoration:underline;padding:0}' +
    '.fl-stageitems{margin-top:10px}.fl-stageitems .row{padding:6px 0;border-top:1px solid var(--gold-line)}');
  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'an-neg' : Number(v) > 0 ? 'an-pos' : ''); }
  function src(t) { return '<span class="an-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }
  function spark(pts) { if (!pts || !pts.length) return ''; var w = 70, h = 18, mx = Math.max.apply(null, pts.map(function (p) { return p[1]; })) || 1; var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (i / (pts.length - 1) * w).toFixed(1) + ',' + (h - p[1] / mx * h).toFixed(1); }).join(' '); return '<svg class="fl-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><path d="' + d + '" fill="none" stroke="' + GOLD + '" stroke-width="1.5"/></svg>'; }
  function loadECharts() { if (window.echarts) return Promise.resolve(window.echarts); return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'assets/echarts.min.js'; s.onload = function () { res(window.echarts); }; s.onerror = rej; document.head.appendChild(s); }); }
  VIEWS.adtoolForecast = {
    label: 'Forecast lab (ads)', hidden: true, order: 98, roles: ROLES, icon: '<path d="M3 17l5-6 4 3 5-8 4 5"/><path d="M3 21h18"/>',
    render: function () { return '<div class="an-wrap"><div class="hgroup enter d1"><h1>Forecast &amp; behaviour lab</h1><span class="sub">Advertising tool · preview · every forecast next to how the last one did</span></div><div id="flBody"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () {
      Promise.all([api('adtoolForecastLab', {}), loadECharts().catch(function () { return null; })]).then(function (r) { draw(r[0]); }).catch(function (e) { $('flBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e.message || 'failed') + '</div></div>'; });
    }
  };
  function draw(D) {
    var h = '';
    /* the objective in one line, so no one reads ROAS as the goal (owner: "increase profitable sales
       while scaling — improve ROAS, increase sales, maintain profitability, scale profitable products,
       reduce unproductive spend"). ad_profit is never shown anywhere on this page. */
    h += '<div class="fl-obj">' + esc(D.objective || 'The objective is to scale profitable sales, not ROAS alone: grow the products that make money, hold their profit, and cut spend that does not pay. Every forecast below is judged against what actually happened, and the system learns from the gap.') + '</div>';
    h += '<div class="an-panel"><h3>Fleet units: last 30 days and the next 30' + src('actual: orders') + src('forecast made ' + (D.made_day || '—')) + '</h3><div class="an-sub">Sum of the listing forecasts; the band adds the listing bands assuming independence (approximate).</div><div id="flFleet" class="fl-chart"></div></div>';
    /* stage counts link to the listings behind them when the engine sends the item rows on each stage
       (fleet stages, and a per-account matrix when stage_by_account is present); the reveal below the
       table fills in on click without another read. */
    var stageMap = {}; /* key -> item rows */
    /* the engine sends stages_by_account FLAT ([{account,stage,n,items}]); group it per account here so the
       matrix and its per-account drill-downs read one nested row per account (older builds sent it nested). */
    var stageByAccount = D.stage_by_account || null;
    if (!stageByAccount && D.stages_by_account && D.stages_by_account.length) {
      var accMap = {}, accOrder = [];
      D.stages_by_account.forEach(function (r) { if (!accMap[r.account]) { accMap[r.account] = { account: r.account, stages: [] }; accOrder.push(r.account); } accMap[r.account].stages.push({ stage: r.stage, n: r.n, items: r.items }); });
      stageByAccount = accOrder.map(function (a) { return accMap[a]; });
    }
    (D.stages || []).forEach(function (s) { if (s.items && s.items.length) stageMap['fleet|' + s.stage] = s.items; });
    (stageByAccount || []).forEach(function (a) { (a.stages || []).forEach(function (s) { if (s.items && s.items.length) stageMap[a.account + '|' + s.stage] = s.items; }); });
    var stageCount = function (key, n) { return stageMap[key] ? '<button class="fl-stagebtn" data-stagekey="' + esc(key) + '">' + n + '</button>' : String(n); };
    h += '<div class="an-grid2"><div class="an-panel"><h3>Stage distribution' + src('stages') + '</h3><table class="an-tbl"><thead><tr><th>Stage</th><th class="r">Listings</th></tr></thead><tbody>' + (D.stages && D.stages.length ? D.stages.map(function (s) { return '<tr><td>' + esc(s.label || s.stage) + '</td><td class="r">' + stageCount('fleet|' + s.stage, s.n) + '</td></tr>'; }).join('') : '<tr><td colspan="2" class="an-empty">stages arrive with the first profiles run</td></tr>') + '</tbody></table><div class="fl-stageitems" id="flStageItems"></div></div>';
    h += '<div class="an-panel"><h3>Model scorecard' + src('backtest · ' + (D.scorecard.length ? (Math.round(D.scorecard.reduce(function (t, r) { return t + (Number(r.folds) || 0) * r.n; }, 0) / Math.max(1, D.scorecard.reduce(function (t, r) { return t + r.n; }, 0)) * 10) / 10) + ' of 8 origins' : '8 origins') + ' · horizon 14') + '</h3><div class="an-sub">MASE vs the seasonal naive (1.0 = no better). An origin needs 21 days of training behind it, so the eight the spec asks for need 77 days of history; until then fewer run and the share below is a noisy read. ' + (D.acceptance ? 'Acceptance: <b>' + esc(D.acceptance.status) + '</b> — ' + esc(D.acceptance.evidence) : 'Acceptance row not written yet.') + '</div><table class="an-tbl"><thead><tr><th>Chosen model</th><th class="r">Listings</th><th class="r">Mean MASE</th><th class="r">Beat naive</th></tr></thead><tbody>' + (D.scorecard.length ? D.scorecard.map(function (s) { return '<tr><td>' + esc(s.model) + '</td><td class="r">' + s.n + '</td><td class="r">' + (s.mase == null ? '—' : s.mase) + '</td><td class="r">' + s.beats_naive + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="an-empty">no forecasts yet</td></tr>') + '</tbody></table></div></div>';
    /* what every stage means, how it is decided and what to do about it (owner: "The 22–40 type
       categorization is unclear. Explain each stage: what it means, how calculated, what action"). */
    var guide = D.stage_explainer || D.stage_guide || D.stages_guide || null;
    if (guide && guide.length) {
      h += '<div class="an-panel"><h3>What each stage means' + src('stage explainer') + '</h3><div class="an-sub">The six stages a listing moves through, how the engine decides each from its 28-day trend and level, and the recommended action.</div><table class="an-tbl"><thead><tr><th>Stage</th><th>What it means</th><th>How it is calculated</th><th>Recommended action</th></tr></thead><tbody>' +
        guide.map(function (g) { return '<tr><td><span class="at-tag ' + (/Decline|Dormant|Dead/i.test(g.stage) ? 'loss' : 'gold') + '" style="border:1px solid var(--gold-line);border-radius:999px;padding:2px 8px">' + esc(g.label || g.stage) + '</span></td><td>' + esc(g.meaning || '') + '</td><td>' + esc(g.how_calculated || g.how || '') + '</td><td>' + esc(g.action || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    /* stage counts per account, each linking to its listings when the engine sends them */
    if (stageByAccount && stageByAccount.length) {
      var stageOrder = (D.stages || []).map(function (s) { return s.stage; });
      if (!stageOrder.length) { var seen = {}; stageByAccount.forEach(function (a) { (a.stages || []).forEach(function (s) { if (!seen[s.stage]) { seen[s.stage] = 1; stageOrder.push(s.stage); } }); }); }
      var stageLabelOf = {}; (D.stages || []).forEach(function (s) { stageLabelOf[s.stage] = s.label || s.stage; });
      (guide || []).forEach(function (g) { if (!stageLabelOf[g.stage]) stageLabelOf[g.stage] = g.label || g.stage; });
      h += '<div class="an-panel"><h3>Stages by account' + src('stages') + '</h3><div class="an-sub">Click a count to list the listings behind it.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Account</th>' + stageOrder.map(function (st) { return '<th class="r">' + esc(stageLabelOf[st] || st) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        stageByAccount.map(function (a) { var by = {}; (a.stages || []).forEach(function (s) { by[s.stage] = s.n; }); return '<tr><td>' + esc(a.account) + '</td>' + stageOrder.map(function (st) { var n = by[st] || 0; return '<td class="r">' + (n ? stageCount(a.account + '|' + st, n) : '0') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
    }
    var mover = function (r) { return '<tr><td>' + adtProductCell(r) + '</td><td>' + spark((D.spark || {})[r.item_id]) + '</td><td>' + esc(r.stage) + '</td><td class="r ' + cls(r.slope28) + '">' + (r.slope28 > 0 ? '+' : '') + r.slope28 + ' %/day</td><td class="r">' + r.level28 + '</td></tr>'; };
    var head = '<thead><tr><th>Listing</th><th>Last 14 days</th><th>Stage</th><th class="r">28-day slope</th><th class="r">Units/day</th></tr></thead>';
    h += '<div class="an-grid2"><div class="an-panel"><h3>Top risers</h3><table class="an-tbl">' + head + '<tbody>' + (D.risers.length ? D.risers.map(mover).join('') : '<tr><td colspan="5" class="an-empty">—</td></tr>') + '</tbody></table></div><div class="an-panel"><h3>Top decliners</h3><table class="an-tbl">' + head + '<tbody>' + (D.decliners.length ? D.decliners.map(mover).join('') : '<tr><td colspan="5" class="an-empty">—</td></tr>') + '</tbody></table></div></div>';
    /* per-metric forecast-vs-reality: the engine sends the MAPE in forecast_vs_actual.metrics and the day rows in
       the flat realised[] (each row carries the units/revenue/spend forecast and actual); assemble the {mape,
       vintage, rows} shape the metric grid draws from. Older builds may send realised_metrics ready-made. */
    var RM = D.realised_metrics || null;
    if (!RM && D.forecast_vs_actual && D.forecast_vs_actual.metrics && D.realised && D.realised.length) {
      var fva = D.forecast_vs_actual, fm = fva.metrics || {};
      var mkRows = function (fk, ak) { return D.realised.map(function (r) { return { day: r.day, forecast: r[fk], actual: r[ak] }; }); };
      var mapeOf = function (m) { return fm[m] && fm[m].mape != null ? fm[m].mape : null; };
      RM = {
        units: { mape: mapeOf('units'), vintage: fva.vintage, rows: mkRows('forecast', 'actual') },
        revenue: { mape: mapeOf('revenue'), vintage: fva.vintage, rows: mkRows('revenue_forecast', 'revenue_actual') },
        spend: { mape: mapeOf('spend'), vintage: fva.vintage, rows: mkRows('spend_forecast', 'spend_actual') }
      };
    }
    if (RM) {
      var metrics = [['units', 'Units'], ['revenue', 'Revenue'], ['spend', 'Spend']];
      h += '<div class="an-panel"><h3>Forecast vs reality' + src('realised vs forecast') + '</h3><div class="an-sub">The oldest stored forecast against what actually happened, per metric — units, revenue and spend. MAPE is the mean absolute percentage error over the compared days; lower is better, and over 50% is flagged. The system learns from this gap.</div><div class="fl-metrics">' +
        metrics.map(function (m) { var r = RM[m[0]]; var mape = r && r.mape != null ? Number(r.mape) : null; return '<div><div class="fl-mh">' + esc(m[1]) + (mape != null ? '<span class="fl-mape' + (mape > 50 ? ' hi' : '') + '">MAPE ' + Math.round(mape) + '%</span>' : '') + (r && r.vintage ? ' <span class="an-src">vintage ' + esc(r.vintage) + '</span>' : '') + '</div><div id="flReal_' + m[0] + '" class="fl-chart" style="height:180px"></div></div>'; }).join('') + '</div></div>';
    } else {
      h += '<div class="an-panel"><h3>Realised vs forecast' + src('vintage ' + (D.realised_vintage || '—')) + '</h3><div class="an-sub">' + ((D.realised && D.realised.length) ? 'Fleet units the oldest stored vintage predicted for the days that have since happened.' : 'Fills in as forecast days pass: the first comparison is available the morning after the first forecast; 14 days of it from 14 days after the first run.') + '</div><div id="flReal" class="fl-chart" style="height:220px"></div></div>';
    }
    /* units only: the forecast's profit column stood on est. ad profit and is not shown (owner, 27 Sep) */
    h += '<div class="an-panel"><h3>Per-listing forecast' + src('next 30 days') + '</h3><div class="an-sub">Chosen model, its backtest MASE, the next 7 and 30 days with the 10–90 % band. <a href="#" id="flCsv">Export CSV</a></div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Listing</th><th>Model</th><th class="r">MASE</th><th class="r">Next 7</th><th class="r">Next 30</th><th class="r">Band 30</th></tr></thead><tbody>' + (D.table.length ? D.table.map(function (r) { return '<tr><td>' + adtProductCell(r) + '</td><td>' + esc(r.model) + '</td><td class="r">' + (r.mase == null ? '—' : r.mase) + '</td><td class="r">' + r.next7 + '</td><td class="r">' + r.next30 + '</td><td class="r">' + r.lo30 + '–' + r.hi30 + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="an-empty">no forecasts yet — the job runs in the morning chain and catches up hourly</td></tr>') + '</tbody></table></div></div>';
    /* per-listing action scenarios: A keep spend, B +30% budget, C reduce/stop — modelled units,
       revenue, spend, profit, the binding limit and what must change. Modelled from spend elasticity,
       ad dependence, stage and budget-capped days (adtScenarios); a promise nowhere, a model always. */
    /* the engine attaches the A/B/C scenarios per row on table[].scenarios (with per-row low_confidence /
       confidence_note); an older/newer engine may also send a ready-made top-level scenarios[] — take whichever. */
    var scenRows = (D.scenarios && D.scenarios.length) ? D.scenarios : (D.table || []).filter(function (r) { return r.scenarios && r.scenarios.length; });
    if (scenRows.length) {
      h += '<div class="an-panel"><h3>Action scenarios' + src('scenarios') + '</h3>' +
        '<div class="an-sub">For each listing: <b>A</b> keep spend, <b>B</b> +30% budget, <b>C</b> reduce/stop — the modelled outcome, the binding limit that caps it, and what must change to go further. If the oldest-vintage error is over 50% the listing is marked low confidence; the scenarios are still shown, as models.</div>' +
        scenRows.map(function (L) {
          return '<div style="border-top:1px solid var(--gold-line);padding:10px 0">' +
            '<div>' + adtProductCell({ item_id: L.item_id, account: L.account, title: L.title, image: L.image }) + (L.low_confidence ? '<span class="fl-lc" title="oldest-vintage MAPE over 50%">modelled, low confidence</span>' : '') + '</div>' +
            '<div class="fl-sc">' + (L.scenarios || []).map(function (s) {
              var fig = [s.modelled_units != null ? 'Units <b>' + esc(s.modelled_units) + '</b>' : '', s.modelled_revenue != null ? 'Revenue <b>' + gbp(s.modelled_revenue, 0) + '</b>' : '', s.modelled_spend != null ? 'Spend <b>' + gbp(s.modelled_spend, 0) + '</b>' : '', s.modelled_profit != null ? 'Profit <b>' + gbp(s.modelled_profit, 0) + '</b>' : ''].filter(Boolean).join(' · ');
              return '<div class="fl-scc ' + esc(String(s.id || '')) + '"><div class="h">' + esc(s.id || '') + ' · ' + esc(s.label || '') + '</div><div class="fig">' + (fig || '—') + '</div>' + (s.limit ? '<div class="lim">Limit: ' + esc(s.limit) + '</div>' : '') + (s.what_must_change ? '<div class="mc">To go further: ' + esc(s.what_must_change) + '</div>' : '') + '</div>';
            }).join('') + '</div></div>';
        }).join('') + '</div>';
    }
    h += '<div class="an-note">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + '</div>';
    $('flBody').innerHTML = h;
    /* stage-count reveal: fill the panel under the stage tables with the item rows behind a count */
    var stageBtns = document.querySelectorAll('[data-stagekey]');
    for (var sbi = 0; sbi < stageBtns.length; sbi++) stageBtns[sbi].onclick = function () {
      var key = this.getAttribute('data-stagekey'), items = stageMap[key] || [], box = document.getElementById('flStageItems');
      if (!box) return;
      var parts = key.split('|');
      box.innerHTML = '<div class="fl-mh">' + esc(parts[1]) + (parts[0] !== 'fleet' ? ' · ' + esc(parts[0]) : '') + ' — ' + items.length + ' listing' + (items.length === 1 ? '' : 's') + '</div>' + (items.length ? items.map(function (r) { return '<div class="row">' + adtProductCell(r) + '</div>'; }).join('') : '<div class="an-empty">no listings</div>');
    };
    var csv = $('flCsv'); if (csv) csv.onclick = function (e) { e.preventDefault(); var lines = [['item_id', 'account', 'title', 'model', 'mase', 'next7', 'next30', 'lo30', 'hi30']].concat(D.table.map(function (r) { return [r.item_id, r.account, String(r.title || '').replace(/"/g, "'"), r.model, r.mase, r.next7, r.next30, r.lo30, r.hi30]; })).map(function (row) { return row.map(function (v) { return '"' + String(v == null ? '' : v) + '"'; }).join(','); }).join('\n'); var w = window.open('', '_blank'); if (w) { w.document.write('<pre>' + esc(lines) + '</pre>'); w.document.title = 'adtool-forecast-' + (D.made_day || '') + '.csv'; } else { toast('Pop-up blocked — allow pop-ups to export'); } };
    if (!window.echarts) return;
    /* Numbers ON the chart, the way every other graph in the portal shows them. ECharts hides a label
       that would collide with its neighbour, so a dense series thins itself out instead of turning into
       a smear — the same effect chartValueDots gets with minGap. */
    var PILL = { show: true, position: 'top', fontSize: 9, fontWeight: 800, color: '#1c1200',
      backgroundColor: GOLD, borderRadius: 7, padding: [2, 5, 1, 5] };
    var pill = function (fmt) { return Object.assign({}, PILL, { formatter: fmt }); };
    var LAYOUT = { hideOverlap: true };
    var base = { backgroundColor: 'transparent', textStyle: { color: '#9aa4b1', fontFamily: 'Instrument Sans, system-ui, sans-serif' }, animation: false, grid: { left: 44, right: 14, top: 26, bottom: 28 }, tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,6,10,.92)', borderColor: 'rgba(255,255,255,.14)', textStyle: { color: '#fff', fontSize: 12 } }, legend: { top: 0, right: 0, textStyle: { color: '#9aa4b1', fontSize: 11 } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 } } };
    D.actual = D.actual || []; D.next = D.next || [];
    var days = D.actual.map(function (r) { return r.day.slice(5); }).concat(D.next.map(function (r) { return r.target_day.slice(5); }));
    var act = D.actual.map(function (r) { return r.units; }).concat(D.next.map(function () { return null; }));
    var fc = D.actual.map(function () { return null; }).concat(D.next.map(function (r) { return r.units; }));
    var lo = D.actual.map(function () { return null; }).concat(D.next.map(function (r) { return r.lo; })), hi = D.actual.map(function () { return null; }).concat(D.next.map(function (r) { return r.hi - r.lo; }));
    var c1 = window.echarts.init($('flFleet')); c1.setOption(Object.assign({}, base, { xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, series: [{ name: 'band low', type: 'line', data: lo, stack: 'b', lineStyle: { opacity: 0 }, symbol: 'none', silent: true }, { name: '10–90 % band', type: 'line', data: hi, stack: 'b', lineStyle: { opacity: 0 }, areaStyle: { color: BAND }, symbol: 'none' }, { name: 'Units (actual)', type: 'line', data: act, lineStyle: { color: GOLD, width: 2 }, itemStyle: { color: GOLD }, symbolSize: 3, label: pill(function (o) { return o.value == null ? '' : Math.round(o.value); }), labelLayout: LAYOUT }, { name: 'Forecast', type: 'line', data: fc, lineStyle: { color: WHITE55, width: 2, type: 'dashed' }, itemStyle: { color: WHITE55 }, symbolSize: 3, label: Object.assign({}, PILL, { backgroundColor: 'rgba(255,255,255,.55)', formatter: function (o) { return o.value == null ? '' : Math.round(o.value); } }), labelLayout: LAYOUT }] }));
    /* forecast-vs-actual: three metric charts (units, revenue, spend) when the engine sends
       realised_metrics; otherwise the single units chart the older engine sent on D.realised */
    if (RM) {
      [['units', function (v) { return v == null ? '' : Math.round(v); }], ['revenue', null], ['spend', null]].forEach(function (m) {
        var mk = m[0], r = RM[mk], el = document.getElementById('flReal_' + mk); if (!el) return;
        var rows = r && r.rows ? r.rows : null;
        if (!rows || !rows.length) { el.innerHTML = '<div class="an-empty">nothing to compare yet</div>'; return; }
        var fmt = m[1] || function (v) { return v == null ? '' : '£' + Math.round(v); };
        window.echarts.init(el).setOption(Object.assign({}, base, { xAxis: { type: 'category', data: rows.map(function (x) { return String(x.day).slice(5); }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, series: [{ name: 'Forecast', type: 'line', data: rows.map(function (x) { return x.forecast; }), lineStyle: { color: WHITE55, width: 2, type: 'dashed' }, symbolSize: 3, itemStyle: { color: WHITE55 } }, { name: 'Actual', type: 'line', data: rows.map(function (x) { return x.actual; }), lineStyle: { color: GOLD, width: 2 }, symbolSize: 3, itemStyle: { color: GOLD }, label: pill(fmt), labelLayout: LAYOUT }, { name: 'Miss', type: 'bar', data: rows.map(function (x) { return x.actual == null || x.forecast == null ? null : Math.round((x.actual - x.forecast) * 10) / 10; }), itemStyle: { color: function (p) { return p.value < 0 ? LOSS : GOLD2; } }, barMaxWidth: 10 }] }));
      });
    } else if (D.realised && D.realised.length) { var c2 = window.echarts.init($('flReal')); c2.setOption(Object.assign({}, base, { xAxis: { type: 'category', data: D.realised.map(function (r) { return r.day.slice(5); }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, series: [{ name: 'Forecast', type: 'line', data: D.realised.map(function (r) { return r.forecast; }), lineStyle: { color: WHITE55, width: 2, type: 'dashed' }, symbolSize: 3, itemStyle: { color: WHITE55 } }, { name: 'Actual', type: 'line', data: D.realised.map(function (r) { return r.actual; }), lineStyle: { color: GOLD, width: 2 }, symbolSize: 3, itemStyle: { color: GOLD }, label: pill(function (o) { return o.value == null ? '' : Math.round(o.value); }), labelLayout: LAYOUT }, { name: 'Miss', type: 'bar', data: D.realised.map(function (r) { return r.actual == null ? null : Math.round((r.actual - r.forecast) * 10) / 10; }), itemStyle: { color: function (p) { return p.value < 0 ? LOSS : GOLD2; } }, barMaxWidth: 10 }] })); } else { var fr = $('flReal'); if (fr) fr.innerHTML = '<div class="an-empty">Nothing to compare yet.</div>'; }
  }
})();
