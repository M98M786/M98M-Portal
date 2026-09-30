/* view-adtool-overview.js — Advertising Tool · Advertising overview (owner's brief, 27 Sep 2026: a NEW
 * "behaviour patterns" page — "compare last 7 days, last 10 days, previous comparable periods; up/down
 * of ROAS, spend, sales, profit, CPC, CVR; the purpose is the trend, not single numbers"). One line per
 * metric over the window (value pills), an up/down summary strip (last 7 vs previous 7, last 10 vs
 * previous 10) with ▲/▼ and the delta, and — because the portal never shows a collective profit figure —
 * the profit trend is drawn as counts of profitable vs losing listings per week plus a top-movers list of
 * individual items, not a fleet profit line. Hidden; flag adtool_page_overview. The daily series ends
 * yesterday (adtool_scope_day has no today row), so the page re-reads hourly — after each :20 rollup —
 * and only while the window reaches into today. Nothing here is sent to eBay.
 * Galaxy tokens only, gold the accent, #e0563f the loss / decline colour. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var OV = { account: '', period: null, accounts: [], data: null };

  VIEW_CSS.push([
    '.ov-wrap{max-width:1240px}',
    '.ov-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 8px}',
    '.ov-chip{border:1px solid var(--gold-line);border-radius:12px;padding:9px 12px;background:var(--panel-2)}',
    '.ov-chip .k{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}',
    '.ov-chip .v{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.ov-chip .d{font-size:11.5px;margin-top:2px;font-weight:700}',
    '.ov-chip .d.up{color:var(--gold-a)}.ov-chip .d.down{color:' + LOSS + '}.ov-chip .d.flat{color:var(--text-3)}',
    '.ov-chip .d .was{color:var(--text-3);font-weight:600}',
    '.ov-winlbl{font-size:12px;font-weight:800;color:var(--text-2);margin:12px 0 4px;text-transform:uppercase;letter-spacing:.06em}',
    '.ov-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:14px}',
    '.ov-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.ov-panel .note{color:var(--text-2);font-size:12px;margin-bottom:10px;line-height:1.5}',
    '.ov-metrics{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:980px){.ov-metrics{grid-template-columns:1fr}}',
    '.ov-mcard{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel)}',
    '.ov-mcard h4{margin:0 0 2px;font-size:12.5px;font-weight:800;color:var(--text)}',
    '.ov-mcard .sub{font-size:11px;color:var(--text-2);margin-bottom:2px}',
    '.ov-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:900px){.ov-grid2{grid-template-columns:1fr}}',
    '.ov-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.ov-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line)}',
    '.ov-tbl th.r{text-align:right}',
    '.ov-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.ov-tbl td.r{text-align:right;white-space:nowrap}',
    '.ov-neg{color:' + LOSS + ';font-weight:700}.ov-pos{color:var(--gold-a);font-weight:700}',
    '.ov-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    '.ov-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}',
    '.ov-legend{display:flex;gap:14px;font-size:11px;font-weight:800;color:var(--text-3);margin:0 0 6px;flex-wrap:wrap}',
    '.ov-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
    '.ov-legend i.ov-hatch{background:repeating-linear-gradient(45deg,var(--gold-b) 0 2px,transparent 2px 5px);border:1px dashed var(--gold-b);box-sizing:border-box}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function pct(v) { v = num(v); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
  function pctSign(v) { v = num(v); if (v == null) return '—'; return (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(Math.round(v * 1000) / 10) + '%'; }
  function src(t) { return '<span class="ov-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }
  function ratio(t, b) { t = num(t); b = num(b); if (b == null || b === 0 || t == null) return null; return t / b; }

  /* how each metric is drawn and judged. good: +1 higher is better, −1 lower is better (CPC), 0 neutral (spend). */
  var METRICS = [
    { key: 'spend', label: 'Spend', money: true, good: 0, fmt: function (v) { return chartMoney(v); } },
    { key: 'attr_revenue', label: 'Attributed sales', money: true, good: 1, fmt: function (v) { return chartMoney(v); } },
    { key: 'roas', label: 'ROAS', good: 1, ref: 1, fmt: function (v) { return (Math.round(v * 100) / 100) + '×'; }, ratio: ['attr_revenue', 'spend'] },
    { key: 'cpc', label: 'CPC', money: true, good: -1, fmt: function (v) { return chartMoney(v); }, ratio: ['spend', 'clicks'] },
    { key: 'cvr', label: 'CVR', good: 1, fmt: function (v) { return (Math.round(v * 1000) / 10) + '%'; }, pctScale: true, ratio: ['attr_units', 'clicks'] }
  ];
  var STRIP_METRICS = [
    { key: 'spend', label: 'Spend', good: 0, fmt: gbp0 },
    { key: 'attr_revenue', label: 'Attributed sales', good: 1, fmt: gbp0 },
    { key: 'roas', label: 'ROAS', good: 1, fmt: roasTxt, ratio: ['attr_revenue', 'spend'] },
    { key: 'cpc', label: 'CPC', good: -1, fmt: gbp, ratio: ['spend', 'clicks'] },
    { key: 'cvr', label: 'CVR', good: 1, fmt: pct, ratio: ['attr_units', 'clicks'] },
    { key: 'orders', label: 'Orders', good: 1, fmt: cnt },
    { key: 'units', label: 'Units', good: 1, fmt: cnt }
  ];

  VIEWS.adtoolOverview = {
    label: 'Advertising overview (ads)', hidden: true, order: 62, roles: ROLES,
    icon: '<path d="M3 3v18h18"/><path d="m6 15 4-4 3 3 5-7"/>',
    render: function () {
      return '<div class="ov-wrap">' + adtHgroup('Advertising overview', 'the trend, not single numbers — where spend, sales, ROAS, CPC and CVR are heading', 'ovFresh') +
        '<div id="ovBar"></div><div id="ovAcct" class="an-filters"></div>' +
        '<div id="ovBody"><div class="ov-empty">Reading the trend…</div></div></div>';
    },
    init: function () {
      OV.period = adtPeriodBar('ovBar', { page: 'adtoolOverview', def: 'd30', onChange: function (v) { OV.period = v; load(false); } });
      acctChips();
      load(false).catch(function () {});
    }
  };

  function acctChips() {
    var el = $('ovAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (OV.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      OV.accounts.map(function (a) { return '<button class="' + (OV.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { OV.account = this.getAttribute('data-a'); acctChips(); load(false); };
  }
  function load(quiet) {
    var p = adtPeriodParams(OV.period); if (OV.account) p.account = OV.account;
    return api('adtoolOverview', p).then(function (d) {
      OV.data = d || {};
      var names = (d && d.accounts) || [];
      if (names.length) { OV.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean); acctChips(); }
      if (!$('ovBody')) return;
      draw();
      adtPeriodEcho('ovBar', d && d.period); adtFreshShow('ovFresh', d && d.fresh);
      /* nothing on this page moves before the next :20 rollup (the series has no today row), so the live
         re-read is hourly, not every 5 minutes; adtPoll keeps the hidden-tab and 'auth' guards */
      if (adtIncludesToday(d && d.period, OV.period)) { adtPoll('ovBody', 3600000, function () { return load(true); }); } else { adtPollStop('ovBody'); }
    }).catch(function (e) {
      if (!quiet && $('ovBody')) $('ovBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'the overview could not be read') + '</div></div>';
      throw e;
    });
  }

  function draw() {
    var D = OV.data, h = '';
    if (!D || typeof D !== 'object') { $('ovBody').innerHTML = '<div class="ov-empty">No answer for this window.</div>'; return; }
    h += windowStrip(D, 'last7', 'prev7', 'Last 7 days vs the previous 7');
    h += windowStrip(D, 'last10', 'prev10', 'Last 10 days vs the previous 10');
    h += trendPanel(D);
    h += profitPanel(D);
    h += moversPanel(D);
    h += '<div class="an-sub" style="margin-top:8px">' + esc(D.source || '') + (D.computed_at ? ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC' : '') + '</div>';
    $('ovBody').innerHTML = h;
  }

  function totalOf(w, m) {
    if (!w) return null;
    var cell = w[m.key];
    if (cell && typeof cell === 'object' && ('value' in cell)) return num(cell.value);
    if (m.ratio) return ratio(w[m.ratio[0]], w[m.ratio[1]]);
    return num(cell);
  }
  function dirOf(w, m) { var cell = w && w[m.key]; if (cell && typeof cell === 'object' && cell.dir) return String(cell.dir); return null; }

  /* the up/down strip: each metric's value now, the arrow, and the % move from the previous comparable
     window. A decline in a "higher is better" metric (or a rise in CPC) is #e0563f; a favourable move is gold. */
  function windowStrip(D, lastKey, prevKey, label) {
    var W = D.windows || {}, last = W[lastKey], prev = W[prevKey];
    if (!last && !prev) return '';
    var chips = STRIP_METRICS.map(function (m) {
      var now = totalOf(last, m), was = totalOf(prev, m);
      var d = (now != null && was != null && was !== 0) ? (now - was) / Math.abs(was) : null;
      var explicit = dirOf(last, m);
      var moveUp = explicit ? explicit === 'up' : (d != null && d > 0.0005);
      var moveDown = explicit ? explicit === 'down' : (d != null && d < -0.0005);
      var flat = !moveUp && !moveDown;
      var favourable = m.good === 0 ? null : ((m.good > 0 && moveUp) || (m.good < 0 && moveDown));
      var cls = flat ? 'flat' : (m.good === 0 ? 'flat' : (favourable ? 'up' : 'down'));
      var arrow = moveUp ? '▲' : (moveDown ? '▼' : '■');
      return '<div class="ov-chip"><div class="k">' + esc(m.label) + '</div><div class="v">' + esc(m.fmt(now)) + '</div>' +
        '<div class="d ' + cls + '">' + arrow + ' ' + (d == null ? '—' : pctSign(d)) + ' <span class="was">from ' + esc(m.fmt(was)) + '</span></div></div>';
    }).join('');
    return '<div class="ov-winlbl">' + esc(label) + src('overview') + '</div><div class="ov-strip">' + chips + '</div>';
  }

  /* one line per metric over the window, value pills, a 1× reference on ROAS. The series is the fleet's
     (or the account's) daily figures from adtool_scope_day. */
  function trendPanel(D) {
    var series = (D.series || []).filter(function (r) { return r && r.day; });
    if (!series.length) return '<div class="ov-panel"><h3>Trend</h3><div class="note">No daily series for this window yet.</div></div>';
    var cards = METRICS.map(function (m) {
      return '<div class="ov-mcard"><h4>' + esc(m.label) + '</h4><div class="sub">' + esc(dayRange(series)) + '</div>' + lineChart(series, m) + '</div>';
    }).join('');
    /* the series can never hold today: the daily grain has no today row. Say where it ends, never "today". */
    var endsOn = String(D.series_to || series[series.length - 1].day || '').slice(0, 10);
    return '<div class="ov-panel"><h3>Where each metric is heading' + src('overview') + '</h3>' +
      '<div class="note">Each line is the daily figure over the window; the pill on a point is its value. ROAS carries a 1× line — below it the ads cost more than the revenue eBay credits to them. The series ends yesterday' + (endsOn ? ' (' + esc(endsOn) + ')' : '') + ' — the daily grain has no today row; today lives on the War room and the Command centre.</div>' +
      '<div class="ov-metrics">' + cards + '</div></div>';
  }
  function dayRange(series) { var a = series[0].day, b = series[series.length - 1].day; return String(a).slice(5) + ' → ' + String(b).slice(5); }

  function lineChart(series, m) {
    var vals = series.map(function (r) {
      /* the engine's own figure first (cpc / cvr / roas arrive computed, null when the denominator is zero);
         the ratio from the raw columns only when the row lacks it */
      var v = num(r[m.key]);
      if (v == null && m.ratio) v = ratio(r[m.ratio[0]], r[m.ratio[1]]);
      return v;
    });
    var W = 460, H = 150, L = 44, R = 14, T = 18, B = 22;
    var present = vals.filter(function (v) { return v != null; });
    if (!present.length) return '<div class="ov-empty">no data</div>';
    var mx = Math.max.apply(null, present), mn = Math.min.apply(null, present);
    if (m.ref != null) mx = Math.max(mx, m.ref);
    if (mn > 0) mn = 0;   /* baseline at zero so the line's height reads as its true size, not a zoomed slice */
    var span = (mx - mn) || 1;
    var n = series.length;
    var xAt = function (i) { return L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R)); };
    var yAt = function (v) { return H - B - ((v - mn) / span) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">';
    [0, 0.5, 1].forEach(function (f) {
      var gv = mn + span * f, gy = yAt(gv);
      s += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(255,255,255,.07)" stroke-width="1"/>' +
        '<text x="' + (L - 5) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#66707c">' + esc(m.fmt(gv)) + '</text>';
    });
    if (m.ref != null && m.ref >= mn && m.ref <= mx) {
      var ry = yAt(m.ref);
      s += '<line x1="' + L + '" y1="' + ry.toFixed(1) + '" x2="' + (W - R) + '" y2="' + ry.toFixed(1) + '" stroke="rgba(224,86,63,.45)" stroke-width="1" stroke-dasharray="4 3"/>' +
        '<text x="' + (W - R) + '" y="' + (ry - 3).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="rgba(224,86,63,.8)">' + esc(m.fmt(m.ref)) + '</text>';
    }
    var pts = [];
    for (var i = 0; i < n; i++) {
      if (vals[i] == null) continue;
      pts.push({ x: xAt(i), y: yAt(vals[i]), label: null, _v: vals[i], _day: series[i].day });
    }
    var every = n > 8 ? Math.ceil(n / 6) : 1;
    var pill = pts.map(function (p, idx) {
      var showLabel = (idx % every === 0) || idx === pts.length - 1;
      return { x: p.x, y: p.y, label: showLabel ? m.fmt(p._v) : null, title: String(p._day) + ' — ' + m.fmt(p._v) };
    });
    s += chartLineSeries(pill, { color: 'var(--gold-b)', width: 2.2, minGap: 40 });
    /* x labels: first, middle, last */
    [0, Math.floor(n / 2), n - 1].forEach(function (i) {
      if (i < 0 || i >= n) return;
      s += '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="8.5" fill="#66707c">' + esc(String(series[i].day).slice(5)) + '</text>';
    });
    s += '</svg>';
    return s;
  }

  /* profit trend WITHOUT a collective figure: counts of profitable vs losing listings per week. */
  function profitPanel(D) {
    var pv = D.profit_view || null;
    var weeks = pv && (pv.weeks || pv.by_week) ? (pv.weeks || pv.by_week) : null;
    if (!weeks && pv && Array.isArray(pv.profitable_listings)) {
      /* per-week arrays keyed the same length */
      weeks = pv.profitable_listings.map(function (p, i) { var l = (pv.losing_listings || [])[i] || {}; return { week: p.week || l.week, profitable: p.count != null ? p.count : p.value, losing: l.count != null ? l.count : l.value }; });
    }
    if (!weeks || !weeks.length) return '';
    var curWk = pv && pv.current_week ? String(pv.current_week) : '';
    var norm = weeks.map(function (w) {
      var key = String(w.week || w.iso_week || ''), days = num(w.days);
      /* the current ISO week runs Monday → yesterday (the daily grain has no today row), so its counts are
         still filling: the engine marks it `partial`; without that field, fewer than 7 rolled days or the
         current-week key says the same */
      var partial = w.partial != null ? !!w.partial : (days != null ? days < 7 : (!!curWk && key === curWk));
      return { week: key, days: days, partial: partial, profitable: num(w.profitable != null ? w.profitable : w.profitable_listings), losing: num(w.losing != null ? w.losing : w.losing_listings) };
    });
    var anyPartial = norm.some(function (w) { return w.partial; });
    function bars(pick, color) {
      return chartBars(norm.map(function (w) {
        var lbl = (w.week || '').replace(/^\d{4}-?/, 'W');
        if (w.partial) lbl += w.days != null ? ' · ' + Math.round(w.days) + ' d' : ' · so far';
        return { label: lbl, value: num(w[pick]) || 0, muted: w.partial, title: (w.week || '') + ' — ' + cnt(w[pick]) + ' ' + pick + ' listings' + (w.partial ? ' (week in progress' + (w.days != null ? ', ' + Math.round(w.days) + ' of 7 days rolled' : ', Monday to yesterday') + ')' : '') };
      }), { height: 140, color: color, pillColor: color, fmt: function (v) { return String(Math.round(v)); }, minGap: 0 });
    }
    return '<div class="ov-panel"><h3>Profit trend, as listing counts' + src('overview') + '</h3>' +
      '<div class="note">The portal never sums profit across listings, so the profit trend is shown as how many listings <b>earned</b> and how many <b>lost</b> each ISO week, under the Sales Analysis law — plus the item movers below. A rising gold bar and a falling red bar week over week is the shape you want.' +
      (anyPartial ? ' The hatched bar is the <b>week in progress</b> (Monday to yesterday) — it fills as the week goes on, so read it against the finished weeks only once it is complete.' : '') + '</div>' +
      '<div class="ov-legend"><span><i style="background:var(--gold-b)"></i>Profitable listings</span><span><i style="background:' + LOSS + '"></i>Losing listings</span>' +
      (anyPartial ? '<span><i class="ov-hatch"></i>Week in progress</span>' : '') + '</div>' +
      '<div class="ov-grid2"><div class="ov-mcard"><h4>Profitable listings / week</h4>' + bars('profitable', 'var(--gold-b)') + '</div>' +
      '<div class="ov-mcard"><h4>Losing listings / week</h4>' + bars('losing', LOSS) + '</div></div></div>';
  }

  /* top movers: individual items, previous vs current profit and % change (owner: "Top Risers / Top
     Decliners — image, name, item ID, account, previous, current, % change"). Item rows only. */
  function moversPanel(D) {
    var pv = D.profit_view || {}, movers = (pv.top_movers || D.top_movers || []).filter(function (r) { return r && typeof r === 'object'; });
    if (!movers.length) return '';
    movers.forEach(function (r) { if (r.pct == null) { var a = num(r.cur_profit), b = num(r.prev_profit); r._pct = (a != null && b != null && b !== 0) ? (a - b) / Math.abs(b) : null; } else r._pct = num(r.pct); });
    var risers = movers.filter(function (r) { return num(r.cur_profit) != null && num(r.prev_profit) != null && num(r.cur_profit) > num(r.prev_profit); }).sort(function (a, b) { return (b._pct || 0) - (a._pct || 0); }).slice(0, 8);
    var decliners = movers.filter(function (r) { return num(r.cur_profit) != null && num(r.prev_profit) != null && num(r.cur_profit) < num(r.prev_profit); }).sort(function (a, b) { return (a._pct || 0) - (b._pct || 0); }).slice(0, 8);
    function tbl(rows, riser) {
      if (!rows.length) return '<div class="ov-empty">none in this window</div>';
      return '<div class="an-scroll"><table class="ov-tbl"><thead><tr><th>Listing</th><th class="r">Was</th><th class="r">Now</th><th class="r">Change</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var p = r._pct;
          return '<tr><td>' + adtProductCell(r) + '</td>' +
            '<td class="r">' + adtProfitCell(r.prev_profit) + '</td>' +
            '<td class="r">' + adtProfitCell(r.cur_profit) + '</td>' +
            '<td class="r ' + (riser ? 'ov-pos' : 'ov-neg') + '">' + (p == null ? '—' : pctSign(p)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return '<div class="ov-panel"><h3>Top movers, item by item' + src('overview') + '</h3>' +
      '<div class="note">The listings whose own profit moved most between the previous comparable window and this one. Profit is per item, under the Sales Analysis law.</div>' +
      '<div class="ov-grid2"><div class="ov-mcard"><h4>Top risers</h4>' + tbl(risers, true) + '</div>' +
      '<div class="ov-mcard"><h4>Top decliners</h4>' + tbl(decliners, false) + '</div></div></div>';
  }
})();
