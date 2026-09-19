/* War room — the page that says what to do today.
 * (spec §7 in spirit, owner 19 Sep: "i need exactly what strategy required for what time, what
 * actions needs to be taken on which listing ... you are just presenting data and doing no data
 * analysis".) Every other page reports. This one decides, and shows the arithmetic it decided on.
 * Galaxy tokens, gold the only accent, #e0563f for a loss. Charts use the portal's own value-dot
 * kit so they read like every other graph in the building. */
(function () {
  var GOLD = '#f2b035', GOLD_A = '#ffd27a', LOSS = '#e0563f', INK = '#1c1200';

  VIEW_CSS.push([
    '.wr-hero{background:linear-gradient(180deg,rgba(242,176,53,.16),rgba(242,176,53,.04));border:1px solid var(--gold-line);border-radius:14px;padding:18px 20px;margin-bottom:14px}',
    '.wr-hero h2{margin:0 0 6px;font-size:20px;font-weight:800;color:var(--gold-a)}',
    '.wr-hero .wr-sub{color:var(--text-2);font-size:13px;line-height:1.55}',
    '.wr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:10px;margin:14px 0}',
    '.wr-k{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px}',
    '.wr-k.on{border-color:var(--gold-b);box-shadow:0 0 0 1px rgba(242,176,53,.35)}',
    '.wr-k .l{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);font-weight:700}',
    '.wr-k .v{font-size:23px;font-weight:800;margin-top:3px;color:var(--text)}',
    '.wr-k .v.pos{color:var(--gold-a)} .wr-k .v.neg{color:' + LOSS + '}',
    '.wr-k .s{font-size:11px;color:var(--text-2);margin-top:2px}',
    '.wr-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
    '.wr-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.wr-panel .wr-note{color:var(--text-2);font-size:12px;margin-bottom:10px;line-height:1.5}',
    '.wr-tbl{width:100%;border-collapse:collapse;font-size:12px}',
    '.wr-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;padding:6px 8px;border-bottom:1px solid var(--gold-line)}',
    '.wr-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text)}',
    '.wr-tbl td.r,.wr-tbl th.r{text-align:right}',
    '.wr-tbl tr.pick td{background:rgba(242,176,53,.1)}',
    '.wr-tbl tr.pick td:first-child{box-shadow:inset 3px 0 0 var(--gold-b)}',
    '.wr-neg{color:' + LOSS + ';font-weight:700} .wr-pos{color:var(--gold-a);font-weight:700}',
    '.wr-tag{display:inline-block;font-size:9px;letter-spacing:.07em;text-transform:uppercase;font-weight:800;padding:2px 7px;border-radius:99px;margin-left:6px}',
    '.wr-tag.cut{background:rgba(224,86,63,.18);color:#ffb3a6}',
    '.wr-tag.push{background:rgba(242,176,53,.2);color:var(--gold-a)}',
    '.wr-chart{width:100%;height:auto;display:block;margin-top:6px}',
    '.wr-empty{color:var(--text-3);font-size:12px;padding:10px 0}',
    '.wr-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}'
  ].join(''));

  var WR = { data: null, account: '' };

  function gbp(n) { var v = Number(n) || 0; return (v < 0 ? '-£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = Number(n) || 0; return (v < 0 ? '-£' : '£') + Math.round(Math.abs(v)); }
  var DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  VIEWS.adtoolPlan = {
    label: 'War room (ads)', hidden: true, order: 93, roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M3 3v18h18"/><path d="m7 14 4-5 4 3 5-8"/><circle cx="11" cy="9" r="1.6"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>War room</h1>' +
        '<span class="sub">what to change today, and the arithmetic it is based on</span></div>' +
        '<div id="wrBody"><div class="wr-empty">Reading the last 30 report days…</div></div>';
    },
    init: function () {
      api('adtoolPlan', WR.account ? { account: WR.account } : {}).then(function (d) {
        WR.data = d; draw();
      }).catch(function (e) {
        $('wrBody').innerHTML = '<div class="wr-panel"><div class="wr-note">' +
          esc(e && e.message ? e.message : 'the war room could not be read') + '</div></div>';
      });
    }
  };

  function draw() {
    var D = WR.data, h = '';
    if (!D || !D.now) { $('wrBody').innerHTML = '<div class="wr-empty">No listing has ad spend in the last 30 days.</div>'; return; }
    var now = D.now, peak = D.peak, v = D.verdict || {};
    var six = (D.targets || []).filter(function (t) { return t.target === 6; })[0];
    var gain = Number(v.gain) || 0;

    /* ---- the order of the day, in words, before any chart ---- */
    h += '<div class="wr-hero"><h2>' + esc(String(v.move || '').replace(/^./, function (c) { return c.toUpperCase(); })) + '</h2>' +
      '<div class="wr-sub">' + esc(v.detail || '') +
      (gain > 0 ? ' <b style="color:var(--gold-a)">That is ' + gbp(gain) + ' a day, about ' + gbp0(gain * 30) + ' a month.</b>' : '') +
      '<div class="wr-sub" style="margin-top:8px;font-size:12px">Cutting a listing does not take its sales to zero — some would have come without the ad. ' +
      'So this is the floor on what switching them off is worth, not the ceiling.</div>' +
      '</div></div>';

    /* ---- where you are, where the money peaks, and what the 6x target really costs ---- */
    h += '<div class="wr-kpis">' +
      kpi('Running now', gbp0(now.profit_day) + '/day', now.keep + ' listings · ' + gbp0(now.spend_day) + ' spend · ' + now.roas + '×', 'pos') +
      kpi('Best it can be', gbp0(peak.profit_day) + '/day', peak.keep + ' listings · ' + gbp0(peak.spend_day) + ' spend · ' + peak.roas + '×', 'pos', true) +
      (six ? kpi('At 6× return', gbp0(six.profit_day) + '/day', six.keep + ' listings · ' + gbp0(six.spend_day) + ' spend · ' + gbp0(six.revenue_day) + ' sales',
        (Number(six.profit_day) < Number(peak.profit_day) ? 'neg' : 'pos')) : '') +
      kpi('Difference', (Number(peak.profit_day) - Number(now.profit_day) >= 0 ? '+' : '') + gbp0(peak.profit_day - now.profit_day) + '/day',
        'moving from where you are to the peak', 'pos') +
      '</div>';

    /* ---- THE graph: spend against profit, with the turn marked ---- */
    h += '<div class="wr-panel"><h3>How far it is worth spending' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Every listing ranked by its own return, then added one at a time. The line climbs while each ' +
      'new listing still earns, and turns down once it costs more than it brings. <b>The gold dot is the top of the hill.</b></div>' +
      curveChart(D) + '</div>';

    /* ---- the same thing as a table, because a number is easier to argue with ---- */
    h += '<div class="wr-panel"><h3>What each target costs you</h3>' +
      '<div class="wr-note">The furthest you can spend and still hold each return. Profit is what you keep, not what you sell.</div>' +
      '<table class="wr-tbl"><thead><tr><th>Target</th><th class="r">Listings</th><th class="r">Spend / day</th>' +
      '<th class="r">Sales / day</th><th class="r">Profit / day</th><th class="r">vs the peak</th></tr></thead><tbody>' +
      [{ target: 'Everything on', p: now, mark: '' }]
        .concat((D.targets || []).map(function (t) { return { target: t.target + '× or better', p: t, mark: '' }; }))
        .map(function (row) {
          var p = row.p, d = Number(p.profit_day) - Number(peak.profit_day);
          var isPeak = p.keep === peak.keep;
          return '<tr class="' + (isPeak ? 'pick' : '') + '"><td>' + esc(row.target) + (isPeak ? '<span class="wr-tag push">best</span>' : '') + '</td>' +
            '<td class="r">' + p.keep + '</td><td class="r">' + gbp0(p.spend_day) + '</td><td class="r">' + gbp0(p.revenue_day) + '</td>' +
            '<td class="r ' + (Number(p.profit_day) >= 0 ? 'wr-pos' : 'wr-neg') + '">' + gbp0(p.profit_day) + '</td>' +
            '<td class="r ' + (d < 0 ? 'wr-neg' : '') + '">' + (d >= 0 ? '—' : gbp0(d)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

    /* ---- the week, and whether any day is genuinely worth changing ---- */
    h += weekPanel(D);

    /* ---- the actual list of things to switch off ---- */
    h += cutPanel(D);

    /* ---- and the ones worth more money ---- */
    h += pushPanel(D);

    h += '<div class="wr-note" style="margin-top:6px">' + esc(D.source) + ' · ' + esc(D.window.from) + ' to ' + esc(D.window.to) +
      ' (' + D.window.days + ' days) · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC</div>';

    $('wrBody').innerHTML = h;
  }

  function kpi(label, value, sub, cls, on) {
    return '<div class="wr-k' + (on ? ' on' : '') + '"><div class="l">' + esc(label) + '</div>' +
      '<div class="v ' + (cls || '') + '">' + esc(value) + '</div><div class="s">' + esc(sub) + '</div></div>';
  }
  function src(t) { return '<span class="wr-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }

  /* The curve: x is cumulative spend a day, y is cumulative profit a day. Drawn with the portal's
     own value-dot kit, so it reads like the graphs on Business overview rather than a new dialect. */
  function curveChart(D) {
    var pts = (D.curve_points || []).slice();
    if (!pts.length) {
      /* rebuild a readable sample from the targets + the two anchors we always have */
      var anchors = [];
      (D.targets || []).forEach(function (t) { anchors.push({ keep: t.keep, x: Number(t.spend_day), y: Number(t.profit_day), tag: t.target + '×' }); });
      anchors.push({ keep: D.peak.keep, x: Number(D.peak.spend_day), y: Number(D.peak.profit_day), tag: 'peak' });
      anchors.push({ keep: D.now.keep, x: Number(D.now.spend_day), y: Number(D.now.profit_day), tag: 'now' });
      pts = anchors.sort(function (a, b) { return a.x - b.x; });
    }
    if (pts.length < 2) return '<div class="wr-empty">Not enough points to draw the curve yet.</div>';
    var W = 980, H = 300, L = 54, R = 18, T = 18, B = 34;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = 0, x1 = Math.max.apply(null, xs) * 1.04;
    var y0 = Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys) * 1.14;
    var px = function (x) { return L + (x - x0) / (x1 - x0 || 1) * (W - L - R); };
    var py = function (y) { return H - B - (y - y0) / (y1 - y0 || 1) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="wr-chart" preserveAspectRatio="none" role="img">';
    /* gridlines + y labels in money */
    for (var g = 0; g <= 4; g++) {
      var yv = y0 + (y1 - y0) * g / 4, yy = py(yv);
      s += '<line x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + yy.toFixed(1) +
        '" stroke="rgba(255,255,255,.07)" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="#66707c">' + chartMoney(yv) + '</text>';
    }
    /* x labels: spend a day */
    for (var k = 0; k <= 4; k++) {
      var xv = x0 + (x1 - x0) * k / 4;
      s += '<text x="' + px(xv).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10" fill="#66707c">' + chartMoney(xv) + '</text>';
    }
    s += '<text x="' + (L - 8) + '" y="' + (T + 2) + '" text-anchor="end" font-size="9" fill="#66707c">profit/day</text>' +
      '<text x="' + (W - R) + '" y="' + (H - 12) + '" text-anchor="end" font-size="9" fill="#66707c">ad spend/day →</text>';
    /* the line itself, with a money pill on the marked points only */
    var line = pts.map(function (p) {
      return { x: px(p.x), y: py(p.y), label: p.tag ? chartMoney(p.y) : '', title: p.tag ? (p.tag + ' · ' + p.keep + ' listings · ' + gbp0(p.x) + ' spend → ' + gbp0(p.y) + ' profit') : '' };
    });
    s += chartLineSeries(line, { color: GOLD, ink: INK, minGap: 64, fontSize: 10, width: 2.6 });
    /* the peak, unmissable */
    var pk = { x: px(Number(D.peak.spend_day)), y: py(Number(D.peak.profit_day)) };
    s += '<circle cx="' + pk.x.toFixed(1) + '" cy="' + pk.y.toFixed(1) + '" r="6.5" fill="' + GOLD_A + '" stroke="' + INK + '" stroke-width="1.5"/>';
    s += '<line x1="' + pk.x.toFixed(1) + '" y1="' + (T) + '" x2="' + pk.x.toFixed(1) + '" y2="' + (H - B) +
      '" stroke="rgba(242,176,53,.45)" stroke-dasharray="4 4" stroke-width="1"/>';
    /* where you actually are today */
    var nx = px(Number(D.now.spend_day)), ny = py(Number(D.now.profit_day));
    s += '<circle cx="' + nx.toFixed(1) + '" cy="' + ny.toFixed(1) + '" r="5" fill="none" stroke="' + LOSS + '" stroke-width="2"/>' +
      '<text x="' + nx.toFixed(1) + '" y="' + (ny - 12).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="800" fill="#ffb3a6">you are here</text>';
    s += '</svg>';
    return s;
  }

  function weekPanel(D) {
    var wd = D.weekday || [], wv = D.weekday_verdict;
    if (!wd.length) return '';
    var head = wv && wv.weak_day
      ? '<b style="color:#ffb3a6">' + esc(DOW[wv.worst.weekday]) + ' is costing you ' + gbp(wv.shortfall) + ' against an average day.</b> ' +
        'Same spend as the rest of the week, ' + wv.worst.roas + '× against the others. Cut its budget, or move that money to ' + esc(DOW[wv.best.weekday]) + '.'
      : 'No day is far enough from the others to be worth changing on its own.';
    var W = 980, H = 190, L = 54, R = 18, T = 16, B = 30;
    var ys = wd.map(function (r) { return Number(r.profit) || 0; });
    var y0 = Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys) * 1.2 || 1;
    var bw = (W - L - R) / wd.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="wr-chart" preserveAspectRatio="none" role="img">';
    var py = function (y) { return H - B - (y - y0) / (y1 - y0 || 1) * (H - T - B); };
    for (var g = 0; g <= 3; g++) {
      var yv = y0 + (y1 - y0) * g / 3, yy = py(yv);
      s += '<line x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + yy.toFixed(1) + '" stroke="rgba(255,255,255,.07)"/>' +
        '<text x="' + (L - 8) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="#66707c">' + chartMoney(yv) + '</text>';
    }
    wd.forEach(function (r, i) {
      var isWeak = wv && wv.weak_day && r.weekday === wv.worst.weekday;
      var p = Number(r.profit) || 0, x = L + i * bw + bw * 0.18, w = bw * 0.64;
      var yTop = py(Math.max(p, 0)), yBase = py(0);
      s += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(yTop, yBase).toFixed(1) + '" width="' + w.toFixed(1) +
        '" height="' + Math.max(2, Math.abs(yBase - yTop)).toFixed(1) + '" rx="3" fill="' + (isWeak ? LOSS : GOLD) + '"/>' +
        '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="' +
          (isWeak ? '#ffb3a6' : '#9aa4b1') + '" font-weight="' + (isWeak ? '800' : '600') + '">' + esc(DOW[r.weekday].slice(0, 3)) + '</text>';
      s += chartValueDots([{ x: x + w / 2, y: Math.min(yTop, yBase) - 11, label: chartMoney(p), title: DOW[r.weekday] + ' · ' + gbp(p) + ' profit on ' + gbp(r.spend) + ' at ' + r.roas + '×' }],
        { color: isWeak ? LOSS : GOLD, ink: isWeak ? '#fff' : INK, fontSize: 10, minGap: 0 });
    });
    s += '</svg>';
    return '<div class="wr-panel"><h3>Which day to change' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">' + head + '</div>' + s + '</div>';
  }

  function cutPanel(D) {
    var cut = D.cut || [];
    if (!cut.length) return '<div class="wr-panel"><h3>Switch off</h3><div class="wr-note">Nothing is losing enough to be worth switching off.</div></div>';
    return '<div class="wr-panel"><h3>Switch off — ' + D.cut_total + ' listings' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Worst first. Together they spend <b>' + gbp(D.cut_frees) + '</b> over 30 days and return <b class="' +
      (Number(D.cut_costs_now) < 0 ? 'wr-neg' : '') + '">' + gbp(D.cut_costs_now) + '</b>. ' +
      'Turning them off is the whole of the gain above. Showing the ' + Math.min(60, cut.length) + ' worst.</div>' +
      '<table class="wr-tbl"><thead><tr><th>Item</th><th>Account</th><th class="r">Spend 30 d</th><th class="r">Sales</th>' +
      '<th class="r">ROAS</th><th class="r">Break-even</th><th class="r">Profit</th></tr></thead><tbody>' +
      cut.map(function (r) {
        return '<tr><td><a href="#adtoolProduct" data-item="' + esc(r.item_id) + '">' + esc(r.item_id) + '</a> ' +
          esc(String(r.title || '').slice(0, 40)) + '</td><td>' + esc(r.account) + '</td>' +
          '<td class="r">' + gbp(r.spend) + '</td><td class="r">' + gbp(r.rev) + '</td>' +
          '<td class="r">' + (r.roas == null ? '—' : r.roas + '×') + '</td>' +
          '<td class="r">' + (r.breakeven ? r.breakeven + '×' : '—') + '</td>' +
          '<td class="r ' + (Number(r.profit) < 0 ? 'wr-neg' : '') + '">' + gbp(r.profit) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function pushPanel(D) {
    var push = D.push || [];
    if (!push.length) return '';
    return '<div class="wr-panel"><h3>Worth more money — ' + push.length + ' listings' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Already earning and running at least half again above their own break-even, so more spend on these is the ' +
      'least speculative bet on the board. Raise the budget on their campaign before you raise a bid anywhere else.</div>' +
      '<table class="wr-tbl"><thead><tr><th>Item</th><th>Account</th><th class="r">Spend 30 d</th><th class="r">ROAS</th>' +
      '<th class="r">Break-even</th><th class="r">Profit</th></tr></thead><tbody>' +
      push.map(function (r) {
        var roas = Number(r.spend) > 0 ? Math.round(Number(r.rev) / Number(r.spend) * 100) / 100 : null;
        return '<tr><td><a href="#adtoolProduct" data-item="' + esc(r.item_id) + '">' + esc(r.item_id) + '</a> ' +
          esc(String(r.title || '').slice(0, 40)) + '</td><td>' + esc(r.account) + '</td>' +
          '<td class="r">' + gbp(r.spend) + '</td><td class="r wr-pos">' + (roas == null ? '—' : roas + '×') + '</td>' +
          '<td class="r">' + (r.breakeven ? r.breakeven + '×' : '—') + '</td>' +
          '<td class="r wr-pos">' + gbp(r.profit) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
})();
