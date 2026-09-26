/* view-adtool-morning.js — Advertising Tool · Command centre, Alerts, Yesterday's report, ROAS target, Data health
 * (spec §7, Phase 5). Five hidden views, each behind its own preview flag. Galaxy tokens; gold the only accent,
 * #e0563f the only loss colour. Read-only except acknowledge / snooze / rule toggles and the ROAS target. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var SLOTS = ['Night 00–06', 'Morning 06–12', 'Afternoon 12–17', 'Evening 17–24'];
  VIEW_CSS.push(
    '.mo-alert{background:var(--panel);border:1px solid var(--gold-line);border-left:3px solid var(--gold-b);border-radius:12px;padding:10px 12px;margin-bottom:8px}' +
    '.mo-alert.high{border-left-color:#e0563f}.mo-alert.medium{border-left-color:var(--gold-b)}.mo-alert.low{border-left-color:rgba(255,255,255,.3)}' +
    '.mo-alert .t{font-weight:800;font-size:13px}.mo-alert .m{font-size:12px;color:var(--text-2);margin-top:3px}' +
    '.mo-alert .btns{margin-top:6px;display:flex;gap:6px}.mo-alert button{background:transparent;border:1px solid var(--gold-line);color:var(--text-2);border-radius:7px;padding:4px 9px;font:inherit;font-size:11.5px;cursor:pointer}.mo-alert button:hover{border-color:var(--gold-b);color:var(--text)}' +
    '.mo-chip{display:inline-block;padding:3px 9px;border-radius:999px;border:1px solid var(--gold-line);background:var(--panel);font-size:11.5px;color:var(--text-2);margin:0 6px 6px 0}.mo-chip.ok{color:var(--gold-a);border-color:rgba(242,176,53,.4)}.mo-chip.bad{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.mo-ladder{display:flex;align-items:flex-end;gap:10px;height:170px;margin:10px 0}' +
    '.mo-ladder .b{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}' +
    '.mo-ladder .bar{width:100%;background:var(--gold-b);border-radius:4px 4px 0 0}.mo-ladder .bar.t{background:var(--gold-a)}' +
    '.mo-ladder .lab{font-size:10.5px;color:var(--text-3);text-align:center;margin-top:5px;line-height:1.3}' +
    '.mo-ladder .val{font-size:12px;font-weight:800;margin-bottom:3px}' +
    '.mo-hours{display:grid;grid-template-columns:repeat(24,1fr);gap:2px;align-items:end;height:90px}' +
    '.mo-hours .h{background:var(--gold-b);border-radius:2px 2px 0 0;min-height:1px}.mo-hours .h.under{background:#e0563f}.mo-hours .lab{font-size:9px;color:var(--text-3);text-align:center}'
  );
  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'an-neg' : Number(v) > 0 ? 'an-pos' : ''); }
  function src(t) { return '<span class="an-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }
  function hg(t, s) { return '<div class="hgroup enter d1"><h1>' + esc(t) + '</h1><span class="sub">' + esc(s) + '</span></div>'; }
  function fail(id, e) { $(id).innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'failed') + '</div></div>'; }
  function kpi(k, v, d, c) { return '<div class="an-kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (c || '') + '">' + v + '</div><div class="d">' + d + '</div></div>'; }
  function ago(t) { if (!t) return 'never'; var ms = Date.now() - new Date(String(t).replace(' ', 'T') + (String(t).endsWith('Z') ? '' : 'Z')).getTime(); if (isNaN(ms)) return esc(String(t).slice(0, 16)); var m = Math.round(ms / 60000); return m < 60 ? m + ' min ago' : (m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'); }

  /* ---------------- Command centre ---------------- */
  /* Phase 1B: today so far comes from the 5-minute grain (adtoolToday: per-listing rows, hour curve,
     per-account totals) and the four spend tiles from adtoolCommand's windows. Every field that the
     older engine does not send is guarded, so the page draws what it has and says what is missing. */
  var CM = { data: null, today: null };
  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  /* the engine's contract key is `tiles` (Phase 1B); `windows` / top-level are older engines */
  function cmWin(D, k) { var w = (D.tiles && D.tiles[k]) || (D.windows && D.windows[k]) || D[k] || null; return w && typeof w === 'object' ? w : null; }
  function cmRoas(w) { if (!w) return null; if (w.roas != null) return num(w.roas); var s = num(w.spend), r = num(w.attr_revenue); return s > 0 && r != null ? r / s : null; }
  function cmSum(rows, k) { return rows.reduce(function (t, r) { return t + (num(r[k]) || 0); }, 0); }
  VIEWS.adtoolCommand = {
    label: 'Command centre (ads)', hidden: true, order: 94, roles: ROLES, icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Command centre', 'Advertising tool · the whole fleet in one screen, today so far and the windows behind it', 'moCmdFresh') + '<div id="moCmd"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () {
      loadCmd(false).catch(function () {});
      /* live while the tab is open: hidden tabs wait, an expired session stops it (session-expiry law) */
      adtPoll('moCmd', 300000, function () { return loadCmd(true); });
    }
  };
  function loadCmd(quiet) {
    /* the today grain is its own action; an engine without it still draws the rest of the page */
    return Promise.all([api('adtoolCommand', {}), api('adtoolToday', {}).catch(function () { return null; })]).then(function (res) {
      CM.data = res[0] || {}; CM.today = res[1]; if ($('moCmd')) drawCmd();
    }).catch(function (e) { if (!quiet) fail('moCmd', e); throw e; });
  }
  function drawCmd() {
    var D = CM.data, T = CM.today || null;
    var y = cmWin(D, 'yesterday') || {};
    var byAcct = (T && T.totals_by_account) || D.totals_by_account || null;
    var today = cmWin(D, 'today');
    if (!today && byAcct && byAcct.length) today = { spend: cmSum(byAcct, 'spend'), attr_revenue: cmSum(byAcct, 'attr_revenue'), attr_units: cmSum(byAcct, 'attr_units'), clicks: cmSum(byAcct, 'clicks'), orders: cmSum(byAcct, 'orders'), units: cmSum(byAcct, 'units') };
    var fresh = (T && T.fresh) || D.fresh || null;
    var f = D.freshness || {};
    if (!fresh && f.last_sample && f.last_sample.t) fresh = { grain: 'today', sampled_at: f.last_sample.t, cadence: '5 min' };
    adtFreshShow('moCmdFresh', fresh);
    /* the four spend tiles: fleet figures carry no profit (owner, 27 Sep: profit is item-to-item only) */
    var repStatus = y.report_status != null ? String(y.report_status) : (D.report_status != null ? String(D.report_status) : null);
    var tile = function (label, w, sub, note) {
      if (!w) return kpi(label, '—', sub + '<br>arrives with the next engine update');
      return kpi(label, gbp(w.spend, 0), gbp(w.attr_revenue, 0) + ' attributed · ROAS ' + roas(cmRoas(w)) + (w.attr_units != null ? ' · ' + w.attr_units + ' ad sales' : '') + '<br>' + sub + (note ? ' · <span class="an-neg">' + esc(note) + '</span>' : ''));
    };
    var h = '<div class="an-kpis">' +
      tile('Today so far', today, (today && today.ads_sampled === false ? 'no same-day ad sample yet — orders only' : 'sampled every 5 min, provisional') + (today && today.sampled_at ? ' · ' + esc(String(today.sampled_at).slice(11, 16)) + ' UTC' : '') + (today && num(today.pending) > 0 ? ' · ' + today.pending + ' orders unpriced' : '')) +
      tile('Yesterday', y.spend != null || y.attr_revenue != null ? y : null, esc(y.day || y.from || ''), repStatus != null && repStatus !== 'final' ? 'ads report landing' + (function (m) { var late = Object.keys(m || {}).filter(function (a) { return m[a] !== 'final'; }); return late.length ? ' (' + esc(late.join(', ')) + ')' : ''; })(y.report_status_by_account) : '') +
      tile('Last 7 days', cmWin(D, 'd7'), (function (w) { return w && w.from ? esc(w.from) + ' → ' + esc(w.to || '') : 'to yesterday'; })(cmWin(D, 'd7'))) +
      tile('Last 30 days', cmWin(D, 'd30'), (function (w) { return w && w.from ? esc(w.from) + ' → ' + esc(w.to || '') : 'to yesterday'; })(cmWin(D, 'd30'))) + '</div>';
    h += '<div class="an-kpis">' + kpi('CPC yesterday', y.clicks > 0 && y.spend != null ? gbp(Number(y.spend) / Number(y.clicks)) : '—', (y.clicks || 0) + ' clicks') + kpi('CVR yesterday', y.clicks > 0 && y.attr_units != null ? (Math.round(Number(y.attr_units) / Number(y.clicks) * 1000) / 10) + '%' : '—', 'attributed units ÷ clicks') + kpi('Orders yesterday, all channels', String(y.orders || 0), (y.units || 0) + ' units') + kpi('Open alerts', String((D.alerts && D.alerts.n) || 0), ((D.alerts && D.alerts.high) || 0) + ' high', (D.alerts && D.alerts.high) ? 'an-neg' : '') + kpi('Decisions waiting', String(D.decisions_waiting || 0), 'shadow mode') + '</div>';
    /* by account today: spend, attributed, ROAS, CPC, CVR, orders — never a profit figure */
    if (byAcct && byAcct.length) {
      h += '<div class="an-panel"><h3>Today by account' + src('today grain · 5 min') + '</h3><div class="an-sub">Spend and attributed sales since 00:00 UTC as eBay has reported them so far; orders by UK day.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Account</th><th class="r">Spend</th><th class="r">Attributed</th><th class="r">ROAS</th><th class="r">Clicks</th><th class="r">CPC</th><th class="r">CVR</th><th class="r">Ad sales</th><th class="r">Orders</th><th class="r">Units</th></tr></thead><tbody>' +
        byAcct.map(function (a) { var ck = num(a.clicks) || 0, sp = num(a.spend); return '<tr><td>' + esc(a.account) + '</td><td class="r">' + gbp(sp) + '</td><td class="r">' + gbp(a.attr_revenue) + '</td><td class="r">' + roas(cmRoas(a)) + '</td><td class="r">' + ck + '</td><td class="r">' + (a.cpc != null ? gbp(a.cpc) : (ck > 0 && sp != null ? gbp(sp / ck) : '—')) + '</td><td class="r">' + (a.cvr != null ? (Math.round(Number(a.cvr) * 1000) / 10) + '%' : (ck > 0 && a.attr_units != null ? (Math.round(Number(a.attr_units) / ck * 1000) / 10) + '%' : '—')) + '</td><td class="r">' + (a.attr_units || 0) + '</td><td class="r">' + (a.orders == null ? '—' : a.orders) + '</td><td class="r">' + (a.units == null ? '—' : a.units) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    /* listings spending today against their own 28-day average per active day */
    var items = D.items_today || (T && T.items) || [];
    if (items.length) {
      /* the engine's spend_today is the whole day's sum; the returned rows are the top 150 */
      var total = num(D.spend_today) != null ? num(D.spend_today) : cmSum(items, 'spend');
      var rows = items.slice().sort(function (a, b) { return (num(b.spend) || 0) - (num(a.spend) || 0); });
      var sampled = rows.filter(function (r) { return r.spend != null; }).length, orderOnly = rows.length - sampled;
      h += '<div class="an-panel"><h3>Listings spending today' + src('today grain · 5 min') + '</h3><div class="an-sub">' + sampled + ' listing' + (sampled === 1 ? '' : 's') + ' with an ad sample today' + (orderOnly ? ' and ' + orderOnly + ' that only sold' : '') + ', biggest spend first' + (rows.length > 80 ? ', showing 80' : '') + '. ' + esc(D.today_note || (T && T.note) || 'Ad figures are sampled and provisional') + '; profit is the listing\'s own under the Sales Analysis law over the orders already priced.</div>' +
        '<div class="an-scroll"><table class="an-tbl"><thead><tr><th>Listing</th><th class="r">Spend today</th><th class="r">vs 28-day avg</th><th class="r">Clicks</th><th class="r">Ad sales</th><th class="r">Orders</th><th class="r">Profit (Sales Analysis law)</th><th class="r">Share of today</th></tr></thead><tbody>' +
        rows.slice(0, 80).map(function (r) {
          var sp = num(r.spend), av = num(r.avg_spend_active_day_28 != null ? r.avg_spend_active_day_28 : (r.spend_avg28 != null ? r.spend_avg28 : (r.avg28 != null ? r.avg28 : r.spend_28d_avg)));
          var vs = '—';
          if (av != null && sp != null) { if (av > 0) { var d = (sp - av) / av; vs = '<span class="' + (d > 0.15 ? 'an-neg' : d < -0.15 ? 'an-pos' : '') + '">' + (d >= 0 ? '▲ +' : '▼ −') + Math.round(Math.abs(d) * 100) + '%</span> <span class="an-empty" style="padding:0;display:inline">' + gbp(av) + '/active day</span>'; } else vs = sp > 0 ? '<span class="an-neg">▲ new</span>' : '—'; }
          else if (sp != null && sp > 0 && r.avg_spend_active_day_28 === null) vs = '<span class="an-neg">▲ new</span>';
          var share = r.spend_share != null ? num(r.spend_share) : (r.share_spend != null ? num(r.share_spend) : (total > 0 && sp != null ? sp / total : null));
          return '<tr><td>' + adtProductCell(r) + '</td><td class="r">' + gbp(sp) + '</td><td class="r">' + vs + '</td><td class="r">' + (r.clicks == null ? '—' : r.clicks) + '</td><td class="r">' + (r.attr_units == null ? '—' : r.attr_units) + '</td><td class="r">' + (r.orders == null ? '—' : r.orders) + '</td><td class="r">' + adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders, r.unpriced_orders) + '</td><td class="r">' + (share == null ? '—' : Math.round(share * 1000) / 10 + '%') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    } else if (T || D.items_today) {
      h += '<div class="an-panel"><h3>Listings spending today' + src('today grain · 5 min') + '</h3><div class="an-empty">' + esc(D.today_note || (T && T.note) || 'No listing has a sample yet today — eBay dates its report tasks in Pacific time, so the first same-day sample lands after Pacific midnight.') + '</div></div>';
    }
    /* hour by hour today from the 5-minute deltas; the carry hour (everything before the first sample) is stated, not plotted */
    var hc = (T && T.hour_curve) || D.hour_curve || null;
    if (hc) {
      var carry = num(T && T.carry_spend != null ? T.carry_spend : D.carry_spend);
      var byH = {}; hc.forEach(function (x) { var hh = num(x.hour_uk != null ? x.hour_uk : x.hour); if (hh != null) byH[hh] = x; });
      var hrs = []; for (var i = 0; i < 24; i++) { var x = byH[i] || {}; hrs.push({ label: (i < 10 ? '0' : '') + i, value: num(x.spend) || 0, title: i + ':00 UK — ' + gbp(num(x.spend) || 0) + ' spend' + (x.attr_units != null ? ' · ' + x.attr_units + ' attributed units' : '') }); }
      var any = hrs.some(function (x) { return x.value > 0; });
      h += '<div class="an-panel"><h3>Today hour by hour' + src('today grain · 5 min') + '</h3><div class="an-sub">Spend per UK hour from the change between samples' + (carry != null && carry > 0 ? ' · <b>' + gbp(carry) + ' accrued before the first sample</b> (the carry hour is not on the chart)' : '') + '.</div>' +
        (any ? chartBars(hrs, { height: 170, everyNth: 3, minGap: 32 }) : '<div class="an-empty">No sampled hour yet today.</div>') + '</div>';
    }
    /* Bars you can read the value off, using the portal's own pill kit — the old version was heights
       and a tooltip, which is a shape rather than a number. */
    if (D.report_hours) { h += '<div class="an-panel"><h3>Yesterday hour by hour' + src('orders') + src('fleet profile') + '</h3>' +
      '<div class="an-sub">Gold = units sold. Red = an hour that came in more than 2 sigma under the share of the day it usually takes.</div>' +
      chartBars(D.report_hours.map(function (x) {
        return { label: (x.hour < 10 ? '0' : '') + x.hour, value: Number(x.units) || 0, strong: (x.z != null && x.z <= -2),
          title: x.hour + ':00 — ' + x.units + ' units' + (x.expected != null ? ', expected ' + x.expected : '') + (x.z != null ? ' (z ' + x.z + ')' : '') };
      }), { height: 170, everyNth: 3, minGap: 32, strongColor: '#e0563f', fmt: function (v) { return String(Math.round(v)); } }) + '</div>'; }
    var slotsToday = D.today_slots || [];
    var tot = slotsToday.reduce(function (t, s) { return t + Number(s.units); }, 0);
    h += '<div class="an-panel"><h3>Today so far by slot' + src('orders') + '</h3><div class="an-sub">Against the fleet\'s shrunk slot profile.</div><table class="an-tbl"><thead><tr><th>Slot</th><th class="r">Units</th><th class="r">Share</th><th class="r">Profile</th></tr></thead><tbody>' + SLOTS.map(function (s, i) { var r = slotsToday.filter(function (x) { return Number(x.slot) === i; })[0]; var u = r ? Number(r.units) : 0; var p = D.slot_profile && D.slot_profile.shares ? D.slot_profile.shares[i] : null; return '<tr><td>' + s + '</td><td class="r">' + u + '</td><td class="r">' + (tot ? Math.round(u / tot * 100) + '%' : '—') + '</td><td class="r">' + (p == null ? '—' : Math.round(p * 100) + '%') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (D.by_date && D.by_date.length) h += '<div class="an-panel"><h3>Fleet ad spend by date' + src('eBay ads report') + '</h3>' +
      '<div class="an-sub">Sundays in light gold. Hover a bar for the day\'s attributed sales and ROAS.</div>' +
      chartBars(D.by_date.map(function (d) {
        var sp = Number(d.spend) || 0, rv = d.attr_revenue != null ? Number(d.attr_revenue) : null;
        return { label: String(d.day).slice(8), value: sp, strong: Number(d.weekday) === 6,
          title: d.day + ' — ' + gbp(sp) + ' spend' + (rv != null ? ' · ' + gbp(rv) + ' attributed · ROAS ' + (sp > 0 ? roas(rv / sp) : '—') : '') };
      }), { height: 180, everyNth: 3, minGap: 46 }) + '</div>';
    h += '<div class="an-panel"><h3>Data freshness</h3><div>' + [['Orders synced', ago(f.orders && f.orders.t)], ['Ads report ingested to', (f.ads_report_day && f.ads_report_day.d) || '—'], ['Last intraday sample', ago(f.last_sample && f.last_sample.t)], ['Rollups', ago(f.rollup && f.rollup.t)], ['Profiles', esc(f.profiles || 'not run')], ['Forecast', esc(f.forecast || 'not run')]].map(function (x) { return '<span class="mo-chip">' + esc(x[0]) + ': <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div></div>';
    h += '<div class="an-note">Computed ' + esc(String(D.computed_at || '').slice(11, 19)) + ' UTC · ' + esc(D.source || '') + ' · refreshes every 5 min while this tab is open</div>';
    $('moCmd').innerHTML = h;
  }

  /* ---------------- Alerts ---------------- */
  var AL = { sev: '' };
  VIEWS.adtoolAlerts = {
    label: 'Alerts (ads)', hidden: true, order: 94, roles: ROLES, icon: '<path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    render: function () { return '<div class="an-wrap">' + hg('Alerts', 'Advertising tool · preview · A01–A19, each with the numbers that fired it') + '<div id="moAl"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { loadAlerts(); }
  };
  function loadAlerts() {
    api('adtoolAlerts', {}).then(function (D) {
      var counts = { high: 0, medium: 0, low: 0 }; D.open.forEach(function (a) { counts[a.severity] = (counts[a.severity] || 0) + 1; });
      var h = '<div class="an-filters">' + [['', 'All (' + D.open.length + ')'], ['high', 'High (' + counts.high + ')'], ['medium', 'Medium (' + counts.medium + ')'], ['low', 'Low (' + counts.low + ')']].map(function (x) { return '<button class="' + (AL.sev === x[0] ? 'on' : '') + '" data-s="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      if (D.fixture_check) h += '<div class="an-note" style="margin-bottom:10px">Fixture check (' + esc(String(D.fixture_check.ran_at).slice(0, 16)) + '): <b>' + esc(D.fixture_check.status) + '</b> — ' + esc(D.fixture_check.evidence) + '</div>';
      var rows = D.open.filter(function (a) { return !AL.sev || a.severity === AL.sev; });
      h += '<div id="moAlList">' + (rows.length ? rows.map(function (a) {
        var p = a.payload || {}; var nums = Object.keys(p).filter(function (k) { return k !== 'rule_text' && k !== 'suggested' && k !== 'title'; }).map(function (k) { return k + ' ' + (typeof p[k] === 'object' ? JSON.stringify(p[k]) : p[k]); }).join(' · ');
        return '<div class="mo-alert ' + esc(a.severity) + '"><div class="t">' + esc(a.rule_id) + ' · ' + esc(p.rule_text || '') + '</div>' + (a.item_id ? '<div style="margin:6px 0 4px">' + adtProductCell({ item_id: a.item_id, account: a.account, title: a.title || p.title || '', image: a.image }) + '</div>' : '') + '<div class="m">' + (!a.item_id && a.account ? esc(a.account) + ' · ' : '') + (a.campaign_id ? 'campaign ' + esc(a.campaign_id) + ' · ' : '') + esc(nums) + '</div><div class="m">Since ' + esc(String(a.fired_at).slice(0, 16)) + ' · suggested: <b>' + esc(p.suggested || '') + '</b>' + (a.acknowledged_by ? ' · acknowledged by ' + esc(a.acknowledged_by) : '') + (a.snoozed_until ? ' · snoozed to ' + esc(String(a.snoozed_until).slice(0, 10)) : '') + '</div><div class="btns">' + (a.item_id ? '<button data-open="' + esc(a.item_id) + '">Open listing</button>' : '') + '<button data-snooze="' + esc(a.alert_id) + '">Snooze 3 d</button><button data-ack="' + esc(a.alert_id) + '">Acknowledge</button></div></div>';
      }).join('') : '<div class="an-empty">No open alerts in this filter.</div>') + '</div>';
      h += '<div class="an-panel"><h3>Rule catalogue</h3><div class="an-sub">' + ((STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) ? 'Management can turn a rule off; it stops firing and its open alerts clear on the next run.' : 'Management can turn rules on and off.') + '</div><table class="an-tbl"><thead><tr><th>Rule</th><th>Fires when</th><th>Severity</th><th class="r">Cool-down</th><th>Suggested</th><th>State</th></tr></thead><tbody>' + D.rules.map(function (r) { return '<tr><td>' + esc(r.rule_id) + '</td><td>' + esc(r.text) + '</td><td>' + esc(r.sev) + '</td><td class="r">' + r.cool + ' d</td><td>' + esc(r.action) + '</td><td>' + ((STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) ? '<button class="an-btn" style="padding:3px 8px;font-size:11px" data-rule="' + esc(r.rule_id) + '" data-en="' + (r.enabled ? 0 : 1) + '">' + (r.enabled ? 'on' : 'off') + '</button>' : (r.enabled ? 'on' : 'off')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      h += '<div class="an-panel"><h3>History</h3><table class="an-tbl"><thead><tr><th>Rule</th><th>Scope</th><th>Fired</th><th>Cleared</th><th>Acknowledged</th></tr></thead><tbody>' + (D.history.length ? D.history.map(function (a) { return '<tr><td>' + esc(a.rule_id) + '</td><td>' + esc(a.item_id || a.account || '') + '</td><td>' + esc(String(a.fired_at).slice(0, 16)) + '</td><td>' + esc(String(a.cleared_at || '').slice(0, 16) || '—') + '</td><td>' + esc(a.acknowledged_by || '—') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">nothing yet</td></tr>') + '</tbody></table></div>';
      h += '<div class="an-note">Last run: ' + (D.last_run ? esc(String(D.last_run.finished_at).slice(0, 16)) + ' · ' + esc(D.last_run.note) : 'not run yet') + '</div>';
      $('moAl').innerHTML = h;
      var fs = document.querySelectorAll('#moAl .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { AL.sev = this.getAttribute('data-s'); loadAlerts(); };
      var wire = function (attr, fn) { var ns = document.querySelectorAll('[' + attr + ']'); for (var j = 0; j < ns.length; j++) ns[j].onclick = function () { fn(this.getAttribute(attr), this); }; };
      wire('data-ack', function (id) { api('adtoolAlerts', { op: 'ack', alert_id: id }).then(function () { toast('Acknowledged'); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
      wire('data-snooze', function (id) { api('adtoolAlerts', { op: 'snooze', alert_id: id }).then(function () { toast('Snoozed 3 days'); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
      wire('data-open', function (id) { try { localStorage.setItem('m98m:adtoolItem', id); } catch (e) {} location.hash = 'adtoolProduct'; });
      wire('data-rule', function (rid, el) { api('adtoolAlerts', { op: 'rule', rule_id: rid, enabled: Number(el.getAttribute('data-en')) }).then(function () { toast('Rule ' + rid + ' ' + (Number(el.getAttribute('data-en')) ? 'on' : 'off')); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
    }).catch(function (e) { fail('moAl', e); });
  }

  /* ---------------- Yesterday's report ---------------- */
  var RP = { day: '' };
  VIEWS.adtoolReport = {
    label: "Yesterday's report (ads)", hidden: true, order: 94, roles: ROLES, icon: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h7M9 17h7"/>',
    render: function () { return '<div class="an-wrap">' + hg("Yesterday's report", 'Advertising tool · preview · one page the morning can be run from') + '<div id="moRp"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { loadReport(); }
  };
  function loadReport() {
    api('adtoolReport', RP.day ? { day: RP.day } : {}).then(function (D) {
      if (!D.report) { $('moRp').innerHTML = '<div class="an-panel"><h3>No report yet</h3><div class="an-sub">The report job runs in the morning chain and catches up hourly. The first one covers yesterday.</div></div>'; return; }
      var R = D.report, y = R.fleet;
      /* Never show an older day in silence. The owner opened this page, saw Sunday where he expected
         yesterday, and rightly asked what the hell he was looking at — the page knew and did not say. */
      var h = '';
      if (D.yesterday && D.day !== D.yesterday) {
        h += '<div class="an-note" style="border:1px solid rgba(224,86,63,.5);background:rgba(224,86,63,.08);color:#ffb3a6;margin-bottom:12px">' +
          '<b>This is not yesterday.</b> You are looking at <b>' + esc(D.day) + '</b>. ' +
          (D.yesterday_missing
            ? 'eBay has not delivered its report for ' + esc(D.yesterday) + ' yet — it arrives during the morning (kick 02:10 UTC), and this page moves to it on its own when it lands.'
            : 'Yesterday (' + esc(D.yesterday) + ') is in the day picker below.') +
          '</div>';
      }
      h += '<div class="an-filters">' + D.days.slice(0, 14).map(function (d) { return '<button class="' + (d.day === D.day ? 'on' : '') + '" data-d="' + esc(d.day) + '">' + esc(d.day) + '</button>'; }).join('') + '</div>';
      /* fleet and account rows carry spend / sales / ROAS only; profit lives on the winner and loser rows (item-level, Sales Analysis law) */
      h += '<div class="an-panel"><h3>' + esc(R.day) + ' · ' + esc(R.weekday) + src('generated ' + String(R.generated_at).slice(11, 16) + ' UTC') + '</h3><div class="an-sub">' + esc((R.sources || []).join(' · ')) + '</div><div class="an-kpis">' + kpi('Spend', gbp(y.spend), (y.attr_units || 0) + ' ad sales') + kpi('ROAS', roas(y.roas), gbp(y.attr_revenue, 0) + ' attributed') + kpi('CPC', y.clicks > 0 && y.spend != null ? gbp(Number(y.spend) / Number(y.clicks)) : '—', (y.clicks || 0) + ' clicks') + kpi('CVR', y.clicks > 0 && y.attr_units != null ? (Math.round(Number(y.attr_units) / Number(y.clicks) * 1000) / 10) + '%' : '—', 'attributed units ÷ clicks') + kpi('Orders', String(y.orders || 0), (y.units || 0) + ' units · ' + gbp(y.revenue, 0)) + '</div>' +
        '<div class="an-sub">Against the 7-day average per day: spend ' + (R.vs_7day ? gbp(R.vs_7day.spend) : '—') + ' · ROAS ' + (R.vs_7day ? roas(R.vs_7day.roas) : '—') + '. Same weekday last week: spend ' + (R.vs_same_weekday_last_week ? gbp(R.vs_same_weekday_last_week.spend) : '—') + ' · ROAS ' + (R.vs_same_weekday_last_week ? roas(R.vs_same_weekday_last_week.roas) : '—') + '. ' + esc(R.decisions && R.decisions.note || '') + '.</div>' +
        '<button class="an-btn" id="moPdf">Download PDF</button> <button class="an-btn" id="moSend" style="background:transparent;border:1px solid var(--gold-line);color:var(--text-2)">Send to inbox</button></div>';
      h += '<div class="an-panel"><h3>What changed</h3><ul class="at-list">' + R.what_changed.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>';
      h += '<div class="an-panel"><h3>By account</h3><table class="an-tbl"><thead><tr><th>Account</th><th class="r">Spend</th><th class="r">Ad sales</th><th class="r">Attributed</th><th class="r">ROAS</th></tr></thead><tbody>' + (R.by_account || []).map(function (a) { return '<tr><td>' + esc(a.account) + '</td><td class="r">' + gbp(a.spend) + '</td><td class="r">' + (a.attr_units || 0) + '</td><td class="r">' + gbp(a.attr_revenue) + '</td><td class="r">' + (a.spend > 0 ? roas(a.attr_revenue / a.spend) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      var mx = Math.max.apply(null, R.hours.map(function (x) { return Math.max(x.units, x.expected || 0); })) || 1;
      h += '<div class="an-panel"><h3>Hour by hour' + src('orders') + '</h3><div class="an-sub">Against the fleet hour × weekday profile for that weekday; red = 2σ or more under.</div><div class="mo-hours">' + R.hours.map(function (x) { return '<div class="h' + (x.z != null && x.z <= -2 ? ' under' : '') + '" style="height:' + Math.max(1, Math.round(x.units / mx * 88)) + 'px" title="' + x.hour + ':00 — ' + x.units + ' units' + (x.expected != null ? ', expected ' + x.expected + (x.z != null ? ' (z ' + x.z + ')' : '') : '') + '"></div>'; }).join('') + '</div><div class="mo-hours">' + R.hours.map(function (x) { return '<div class="lab">' + (x.hour % 3 === 0 ? x.hour : '') + '</div>'; }).join('') + '</div><table class="an-tbl" style="margin-top:10px"><thead><tr><th>Slot</th><th class="r">Units</th><th class="r">Expected</th><th class="r">z</th></tr></thead><tbody>' + R.slots.map(function (s) { return '<tr><td>' + SLOTS[s.slot] + '</td><td class="r">' + s.units + '</td><td class="r">' + (s.expected == null ? '—' : s.expected) + '</td><td class="r ' + (s.z != null && s.z < 0 ? 'an-neg' : '') + '">' + (s.z == null ? '—' : (s.z > 0 ? '+' : '') + s.z) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      var tbl = function (rows, title) { return '<div class="an-panel"><h3>' + title + '</h3><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Listing</th><th class="r">Spend</th><th class="r">Ad sales</th><th class="r">ROAS</th><th class="r">Profit (Sales Analysis law)</th><th>Why</th></tr></thead><tbody>' + (rows.length ? rows.map(function (r) { return '<tr><td>' + adtProductCell(r) + '</td><td class="r">' + gbp(r.spend) + '</td><td class="r">' + (r.attr_units || 0) + '</td><td class="r">' + (r.spend > 0 && r.attr_revenue != null ? roas(r.attr_revenue / r.spend) : '—') + '</td><td class="r">' + adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders) + '</td><td>' + esc(r.why || '') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="an-empty">none</td></tr>') + '</tbody></table></div></div>'; };
      h += '<div class="an-grid2">' + tbl(R.winners || [], 'Winners') + tbl(R.losers || [], 'Losers') + '</div>';
      h += '<div class="an-note">Open alerts ' + ((R.open_alerts && R.open_alerts.n) || 0) + ' (' + ((R.open_alerts && R.open_alerts.high) || 0) + ' high) · ' + (R.capped_listings || 0) + ' listings hit their budget cap · ' + ((R.ad_status_changes && R.ad_status_changes.n) || 0) + ' ad status changes seen</div>';
      $('moRp').innerHTML = h;
      var fs = document.querySelectorAll('#moRp .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { RP.day = this.getAttribute('data-d'); loadReport(); };
      $('moPdf').onclick = function () { var b = this; b.disabled = true; api('adtoolReport', { day: D.day, pdf: 1 }).then(function (r) { var bin = atob(r.pdf_base64); var arr = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k); var blob = new Blob([arr], { type: 'application/pdf' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = r.filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000); b.disabled = false; }).catch(function (e) { toast(e.message || 'failed'); b.disabled = false; }); };
      $('moSend').onclick = function () { var b = this; b.disabled = true; api('adtoolReport', { day: D.day, send: 1 }).then(function () { toast('Sent to the management inbox'); b.disabled = false; }).catch(function (e) { toast(e.message); b.disabled = false; }); };
    }).catch(function (e) { fail('moRp', e); });
  }

  /* ---------------- ROAS target ---------------- */
  VIEWS.adtoolRoas = {
    label: 'ROAS target (ads)', hidden: true, order: 94, roles: ROLES, icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    render: function () { return '<div class="an-wrap">' + hg('ROAS target', 'Advertising tool · preview · the gap to 5.0× and what each lever is modelled to do') + '<div id="moRo"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { loadRoas(); }
  };
  function loadRoas() {
    api('adtoolRoasTarget', {}).then(function (D) {
      /* the ladder is spend and ROAS only: fleet profit is not a figure this portal shows any more
         (owner, 27 Sep) and est. ad profit — which it stood on — is gone */
      var F = D.fleet || {}, now = F.now || {}, lv = F.levers || [], win = D.window || [];
      var spendOf = function (x) { return x && x.spend != null ? Number(x.spend) : null; };
      /* the ladder's points carry attributed revenue as `revenue` (stored adtool_roas JSON included) */
      var attrOf = function (x) { return x && x.attr_revenue != null ? Number(x.attr_revenue) : (x && x.revenue != null ? Number(x.revenue) : null); };
      var h = '<div class="an-kpis">' + kpi('Fleet ROAS now', roas(now.roas), esc(win[0] || '') + ' → ' + esc(win[1] || '')) + kpi('Target', roas(D.target), 'checkpoint ' + esc(D.checkpoint || '—') + ' · ' + (D.days_to_checkpoint != null ? D.days_to_checkpoint : '—') + ' days') + kpi('Gap', D.gap == null ? '—' : (D.gap > 0 ? '−' : '+') + Math.abs(D.gap).toFixed(2) + '×', D.gap > 0 ? 'below target' : 'at or above target', D.gap > 0 ? 'an-neg' : 'an-pos') + kpi('Spend now', gbp(spendOf(now), 0), (now.listings != null ? now.listings + ' listings' : '') + (attrOf(now) != null ? ' · ' + gbp(attrOf(now), 0) + ' attributed' : '')) + (lv.length ? kpi('At the full ladder', roas(lv[lv.length - 1].roas), spendOf(lv[lv.length - 1]) != null ? gbp(spendOf(lv[lv.length - 1]), 0) + ' spend' : 'ROAS after every lever') : '') + kpi('Cost per sale', gbp(now.cost_per_sale), lv.length ? 'lever 1 → ' + gbp(lv[0].cost_per_sale) : '') + '</div>';
      var all = [{ name: 'Now', roas: now.roas, spend: spendOf(now) }].concat(lv.map(function (l) { return { name: 'Lever ' + l.n, roas: l.roas, spend: spendOf(l) }; }));
      var mxr = Math.max.apply(null, all.map(function (x) { return x.roas || 0; })) || 1, mxs = Math.max.apply(null, all.map(function (x) { return x.spend || 0; })) || 1;
      var anySpend = all.some(function (x) { return x.spend != null; });
      h += '<div class="an-grid2"><div class="an-panel"><h3>ROAS ladder</h3><div class="mo-ladder">' + all.map(function (x, i) { return '<div class="b"><div class="val">' + roas(x.roas) + '</div><div class="bar' + (x.roas >= D.target ? ' t' : '') + '" style="height:' + Math.round((x.roas || 0) / mxr * 120) + 'px"></div><div class="lab">' + esc(x.name) + '</div></div>'; }).join('') + '</div><div class="an-sub">Target line ' + roas(D.target) + '; bars at or above it are light gold.</div></div>';
      h += '<div class="an-panel"><h3>Spend ladder</h3>' + (anySpend ? '<div class="mo-ladder">' + all.map(function (x) { return '<div class="b"><div class="val">' + gbp(x.spend, 0) + '</div><div class="bar" style="height:' + Math.round((x.spend || 0) / mxs * 120) + 'px"></div><div class="lab">' + esc(x.name) + '</div></div>'; }).join('') + '</div><div class="an-sub">What each step leaves running. A higher ROAS on a fraction of the spend is a smaller business, not a better one.</div>' : '<div class="an-empty">Spend per step arrives with the next engine update.</div>') + '</div></div>';
      h += '<div class="an-panel"><h3>The five levers' + src('modelled · assumptions printed') + '</h3><div class="an-scroll"><table class="an-tbl"><thead><tr><th>#</th><th>Lever</th><th>Scope</th><th class="r">ROAS after</th><th class="r">Spend after</th><th>Assumption</th><th>Status</th></tr></thead><tbody>' + lv.map(function (l) { return '<tr><td>' + l.n + '</td><td><b>' + esc(l.name) + '</b></td><td>' + esc(l.scope) + '</td><td class="r">' + roas(l.roas) + '</td><td class="r">' + gbp(spendOf(l), 0) + '</td><td>' + esc(l.assumption) + '</td><td>' + esc(l.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (F.cut_only_ceiling ? '<div class="an-note" style="margin-top:8px"><b>The trap:</b> ' + esc(F.cut_only_ceiling.note || '') + ' — ' + (F.cut_only_ceiling.listings != null ? F.cut_only_ceiling.listings + ' listings, ' : '') + roas(F.cut_only_ceiling.roas) + (spendOf(F.cut_only_ceiling) != null ? ' on ' + gbp(spendOf(F.cut_only_ceiling), 0) : '') + '. The engine never proposes cutting past lever 1 to reach the target.</div>' : '') + '</div>';
      h += '<div class="an-panel"><h3>Gap by account</h3><table class="an-tbl"><thead><tr><th>Account</th><th class="r">ROAS now</th><th class="r">After its own net-loss listings stop</th><th class="r">Spend</th><th class="r">Attributed</th><th class="r">Target</th></tr></thead><tbody>' + Object.keys(D.accounts || {}).map(function (a) { var x = D.accounts[a] || {}; var xn = x.now || {}; var tg = (D.targets || {})['adtool_roas_target_' + a] || D.target; return '<tr><td>' + esc(a) + '</td><td class="r">' + roas(xn.roas) + '</td><td class="r an-pos">' + roas(x.after_lever1 ? x.after_lever1.roas : null) + '</td><td class="r">' + gbp(xn.spend, 0) + '</td><td class="r">' + gbp(attrOf(xn), 0) + '</td><td class="r">' + roas(tg) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (D.weeks && D.weeks.length) h += '<div class="an-panel"><h3>Diminishing returns, week by week' + src('A18') + '</h3><table class="an-tbl"><thead><tr><th>Week</th><th class="r">Spend/day</th><th class="r">ROAS</th></tr></thead><tbody>' + D.weeks.slice().reverse().map(function (w) { return '<tr><td>' + (w.weeks_ago === 0 ? 'this week' : w.weeks_ago + ' week' + (w.weeks_ago > 1 ? 's' : '') + ' ago') + '</td><td class="r">' + gbp(w.spend_day, 0) + '</td><td class="r">' + roas(w.roas) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (D.month_bands) h += '<div class="an-panel"><h3>Month position' + src('fleet profile') + '</h3><table class="an-tbl"><thead><tr><th>Band</th><th class="r">Listing-days</th><th class="r">Units/day</th><th class="r">Spend/day</th></tr></thead><tbody>' + D.month_bands.map(function (b) { return '<tr><td>' + esc(b.band) + '</td><td class="r">' + b.listing_days + '</td><td class="r">' + (b.units_day == null ? '—' : b.units_day) + '</td><td class="r">' + gbp(b.spend_day) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (D.review_window && D.review_window.fleet) { var rv = D.review_window.fleet, rvw = D.review_window.window || []; h += '<div class="an-panel"><h3>The review window, recomputed' + src(esc(rvw[0] || '') + ' → ' + esc(rvw[1] || '')) + '</h3><div class="an-sub">The same arithmetic on the window the review used, so the deck\'s numbers can be checked against the tool.</div><table class="an-tbl"><thead><tr><th>Step</th><th class="r">ROAS</th><th class="r">Spend</th></tr></thead><tbody><tr><td>Now</td><td class="r">' + roas(rv.now && rv.now.roas) + '</td><td class="r">' + gbp(spendOf(rv.now), 0) + '</td></tr>' + (rv.levers || []).map(function (l) { return '<tr><td>' + l.n + ' · ' + esc(l.name) + '</td><td class="r">' + roas(l.roas) + '</td><td class="r">' + gbp(spendOf(l), 0) + '</td></tr>'; }).join('') + (rv.cut_only_ceiling ? '<tr><td>Cut-only ceiling</td><td class="r">' + roas(rv.cut_only_ceiling.roas) + '</td><td class="r">' + gbp(spendOf(rv.cut_only_ceiling), 0) + '</td></tr>' : '') + '</tbody></table></div>'; }
      if (STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) h += '<div class="an-panel"><h3>Target' + src('Management') + '</h3><div class="an-form"><input id="moTg" type="number" step="0.1" value="' + D.target + '" style="width:90px"><select id="moTgA"><option value="">Fleet</option>' + Object.keys(D.accounts).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('') + '</select><button class="an-btn" id="moTgGo">Set target</button></div></div>';
      h += '<div class="an-note">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + '</div>';
      $('moRo').innerHTML = h;
      var g = $('moTgGo'); if (g) g.onclick = function () { g.disabled = true; api('adtoolRoasTarget', { set_target: Number($('moTg').value), account: $('moTgA').value }).then(function () { toast('Target set'); loadRoas(); }).catch(function (e) { toast(e.message); g.disabled = false; }); };
    }).catch(function (e) { fail('moRo', e); });
  }

  /* ---------------- Data health ---------------- */
  VIEWS.adtoolHealth = {
    label: 'Data health (ads)', hidden: true, order: 94, roles: ROLES, icon: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Data health', 'Advertising tool · every job, every known gap, every checked number', 'moHeFresh') + '<div id="moHe"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () {
      api('adtoolHealthPage', {}).then(function (D) {
        if (!$('moHe')) return;
        adtFreshShow('moHeFresh', D.fresh);
        D.truth = D.truth || []; D.jobs = D.jobs || []; D.gaps = D.gaps || {}; D.schedules = D.schedules || {}; D.cursors = D.cursors || {}; D.truth_summary = D.truth_summary || []; D.flags = D.flags || []; D.register = D.register || [];
        var pass = D.truth.filter(function (t) { return t.status === 'PASS'; }).length, failn = D.truth.filter(function (t) { return t.status === 'FAIL'; }).length;
        var h = '<div class="an-kpis">' + kpi('Truth Check', failn ? failn + ' FAIL' : pass + ' PASS', failn ? 'a mismatch blocks the page from leaving preview' : 'every checked number reproduces', failn ? 'an-neg' : 'an-pos') + kpi('Jobs with errors', String(D.jobs.filter(function (j) { return j.last_status === 'error'; }).length), D.jobs.length + ' jobs tracked') + kpi('Unresolved campaign ids', String((D.gaps.unresolved_campaign_ids && D.gaps.unresolved_campaign_ids.n) || 0), 'not named by the campaigns table or the archive') + kpi('Orders pending cost (30 d)', String((D.gaps.pending_cost_orders_30d && D.gaps.pending_cost_orders_30d.n) || 0), 'the Sales Analysis law counts them, never guesses them') + kpi('Categories filled', ((D.gaps.categories && D.gaps.categories.filled) || 0) + ' / ' + ((D.gaps.categories && D.gaps.categories.total) || 0), 'active listings, filling 40/account/hour') + '</div>';
        h += '<div class="an-panel"><h3>Jobs</h3><table class="an-tbl"><thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th class="r">Rows</th><th>Status</th><th>Note</th></tr></thead><tbody>' + D.jobs.map(function (j) { return '<tr><td>' + esc(j.job) + '</td><td>' + esc(D.schedules[j.job] || '—') + '</td><td>' + esc(String(j.last_end || j.last_start || '').slice(0, 16)) + '</td><td class="r">' + (j.last_rows == null ? '—' : j.last_rows) + '</td><td class="' + (j.last_status === 'error' || j.last_status === 'FAIL' ? 'an-neg' : 'an-pos') + '">' + esc(j.last_status || '') + '</td><td>' + esc(String(j.last_note || '').slice(0, 120)) + '</td></tr>'; }).join('') + '</tbody></table><div class="an-sub" style="margin-top:8px">Cursors — rollups: ' + esc(D.cursors.rollup || '—') + ' · profiles: ' + esc(D.cursors.profiles || '—') + ' · forecast: ' + esc(D.cursors.forecast || '—') + '</div></div>';
        /* Phase 1B: the freshness map (§5 of the plan) — one row per data family, its cadence, last update and age —
           and the ADTOOL_TODAY_FRESHNESS verdict (tick age < 10 min inside the 07:05–23:59 UTC sampling window) */
        var FM = D.freshness_map, fmRows = [];
        if (Array.isArray(FM)) fmRows = FM;
        else if (FM && typeof FM === 'object') fmRows = Object.keys(FM).map(function (k) { var v = FM[k]; return typeof v === 'object' && v ? Object.assign({ family: k }, v) : { family: k, cadence: String(v) }; });
        var todayFresh = D.today_freshness || D.truth.filter(function (t) { return t.metric_id === 'ADTOOL_TODAY_FRESHNESS'; })[0] || null;
        if (fmRows.length || todayFresh) {
          h += '<div class="an-panel"><h3>Freshness map' + src('today grain · 5 min') + '</h3><div class="an-sub">What can and cannot be live: the today grain samples every 5 minutes from Pacific midnight (about 07:05 UTC in summer, 08:05 in winter — eBay dates its report tasks in Pacific time) to 23:59 UTC; everything else moves on its own clock, printed here.</div>' +
            (fmRows.length ? '<div class="an-scroll"><table class="an-tbl"><thead><tr><th>Family</th><th>Cadence</th><th>Last update</th><th class="r">Age</th><th>Note</th></tr></thead><tbody>' + fmRows.map(function (r) {
              /* the engine's key is last_at (rebuilt_at for the today grain's own write); the rest are older spellings */
              var last = r.last_at || r.rebuilt_at || r.last_update || r.last || r.updated_at || r.sampled_at || r.rolled_at || r.t || '';
              var ageTxt = r.age != null ? String(r.age) : (r.age_min != null ? r.age_min + ' min' : (last ? ago(last) : '—'));
              var late = r.stale != null ? !!r.stale : (r.truth && r.truth.status === 'FAIL');
              var note = [];
              if (r.truth && r.truth.status) note.push('truth ' + r.truth.status + (r.truth.evidence ? ' — ' + String(r.truth.evidence).slice(0, 90) : ''));
              if (r.flag != null) note.push('flag ' + r.flag);
              if (r.rebuilt_at && r.last_at) note.push('grain rebuilt ' + ago(r.rebuilt_at));
              if (r.cursor) note.push('cursor ' + r.cursor);
              if (r.hits && r.hits.length) note.push(r.hits.map(function (x) { return x.action + ' ' + x.hits_misses; }).join(' · '));
              if (r.note || r.window) note.push(r.note || r.window);
              return '<tr><td>' + esc(r.family || r.name || '') + '</td><td>' + esc(r.cadence || '—') + '</td><td>' + esc(last ? String(last).replace('T', ' ').slice(0, 16) : '—') + '</td><td class="r ' + (late ? 'an-neg' : '') + '">' + esc(ageTxt) + '</td><td>' + esc(note.join(' · ')) + '</td></tr>';
            }).join('') + '</tbody></table></div>' : '<div class="an-empty">The freshness map arrives with the next engine update.</div>') +
            (todayFresh ? '<div class="an-kpis" style="margin-top:10px">' + kpi('Today grain freshness', esc(todayFresh.status || '—'), esc(todayFresh.evidence || todayFresh.note || 'ADTOOL_TODAY_FRESHNESS') + (todayFresh.ran_at ? ' · ran ' + esc(String(todayFresh.ran_at).slice(0, 16)) : ''), todayFresh.status === 'PASS' ? 'an-pos' : (todayFresh.status === 'FAIL' ? 'an-neg' : '')) + '</div>' : '') + '</div>';
        }
        h += '<div class="an-panel"><h3>Truth Check' + src('validation_runs') + '</h3><table class="an-tbl"><thead><tr><th>Metric</th><th>Scope</th><th>Status</th><th>Evidence</th><th>Ran</th></tr></thead><tbody>' + D.truth_summary.map(function (t) { return '<tr><td>' + esc(t.metric_id) + '</td><td>' + t.n + ' scope' + (t.n === 1 ? '' : 's') + '</td><td class="' + (t.status === 'PASS' ? 'an-pos' : 'an-neg') + '">' + esc(t.status) + '</td><td></td><td>' + esc(String(t.last).slice(0, 16)) + '</td></tr>'; }).join('') + D.truth.filter(function (t) { return t.status !== 'PASS' || /LISTING|VERDICT|FLEET|SHUFFLE|MASE|ALERTS/.test(t.metric_id); }).slice(0, 12).map(function (t) { return '<tr><td>' + esc(t.metric_id) + '</td><td>' + esc(t.scope_key) + '</td><td class="' + (t.status === 'PASS' ? 'an-pos' : 'an-neg') + '">' + esc(t.status) + '</td><td>' + esc(t.evidence) + '</td><td>' + esc(String(t.ran_at).slice(0, 16)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
        var SL = D.sheet_law_check;
        h += '<div class="an-panel"><h3>Profit law vs the Sales Analysis sheet' + src('ADTOOL_PROFIT_VS_SHEET') + '</h3><div class="an-sub">' + esc(SL ? SL.rule : '') + '</div>' + (SL ? '<div class="an-kpis">' + kpi('Verdict', esc(SL.status), 'ran ' + esc(String(SL.ran_at || '').slice(0, 16)), SL.status === 'PASS' ? 'an-pos' : 'an-neg') + '</div><table class="an-tbl"><thead><tr><th>Account</th><th>Status</th><th class="r">Days within tolerance</th></tr></thead><tbody>' + (SL.per_account || []).map(function (a) { return '<tr><td>' + esc(a.account) + '</td><td class="' + (a.status === 'PASS' ? 'an-pos' : 'an-neg') + '">' + esc(a.status) + '</td><td class="r">' + (a.days_pass == null ? '—' : a.days_pass + ' of ' + a.days) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="an-empty">not reconciled yet — the truth job writes the first verdict once the history rebuild has reached today</div>') + '</div>';
        h += '<div class="an-panel"><h3>Known gaps</h3><div>' + [['Campaign-level rows', (D.gaps.campaign_rows && D.gaps.campaign_rows.n) ? D.gaps.campaign_rows.n + ' rows ' + D.gaps.campaign_rows.mn + ' → ' + D.gaps.campaign_rows.mx : 'none yet (first daily ingest)'], ['Intraday samples', (D.gaps.intraday && D.gaps.intraday.samples) ? D.gaps.intraday.samples + ' since ' + String(D.gaps.intraday.first).slice(0, 16) : 'none'], ['Budget-capped days (7 d)', String((D.gaps.capped_days_7d && D.gaps.capped_days_7d.n) || 0)], ['Missing report days', D.gaps.missing_report_days.length ? D.gaps.missing_report_days.map(function (m) { return m.account + ' ' + m.days; }).join(', ') : 'none']].map(function (x) { return '<span class="mo-chip">' + esc(x[0]) + ': <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div></div>';
        h += '<div class="an-panel"><h3>Flags</h3><div>' + D.flags.map(function (f) { return '<span class="mo-chip ' + (f.value === 'on' ? 'ok' : '') + '">' + esc(f.key.replace('adtool_', '')) + ': <b>' + esc(f.value) + '</b></span>'; }).join('') + '</div><div class="an-sub" style="margin-top:8px">Each flag is one row in portal_config; setting it to off is the roll-back for that piece.</div></div>';
        h += '<div class="an-panel"><h3>Number Register' + src(D.register.length + ' numbers') + '</h3><div class="an-scroll"><table class="an-tbl"><thead><tr><th class="r">Phase</th><th>Id</th><th>Name</th><th>Formula</th><th>Sources</th><th>Recompute</th><th>Recheck</th></tr></thead><tbody>' + D.register.map(function (r) { return '<tr><td class="r">' + r.phase + '</td><td>' + esc(r.metric_id) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.formula) + '</td><td>' + esc(r.source_tables) + '</td><td>' + esc(r.recompute) + '</td><td>' + esc(r.recheck) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
        h += '<div class="an-note">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · jobs run on Cloudflare cron; a job that fails writes its error here and to sync_state</div>';
        $('moHe').innerHTML = h;
      }).catch(function (e) { fail('moHe', e); });
    }
  };
})();
