/* view-overview.js — V2 Phase C6: the Management business overview (Royal v2 anatomy, the
 * sections with REAL feeds behind them tonight). One Engine read paints: collective KPIs,
 * today's live pulse per account, yesterday's profit and ad spend, advertising vs the SOP
 * ROAS-5 target, the live health grid, confirmed duplicate counts and the worst loss items.
 * Returns/cases and staff stay on their own screens until their feeds land (Phase D) — this
 * screen never shows a number nothing stands behind. Management/Ops only, enforced server-side. */
(function () {

  VIEW_CSS.push(
    '.ov-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}' +
    '.ov-kpi{flex:1 1 140px;border:1px solid var(--gold-line);border-radius:12px;padding:10px 14px;background:var(--panel-2)}' +
    '.ov-kpi .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ov-kpi .v{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.ov-kpi .s{font-size:11px;color:var(--text-3);font-weight:700;margin-top:2px}' +
    '.ov-alert{border:1px solid var(--bad);border-radius:12px;background:var(--bad-soft, rgba(220,60,60,.07));padding:10px 14px;margin-bottom:14px;font-size:12.5px}' +
    '.ov-alert b{color:var(--bad)}' +
    '.ov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:14px}' +
    '.ov-mini{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:10px 14px}' +
    '.ov-mini .t{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:6px}' +
    '.ov-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px}' +
    '.ov-row:last-child{border-bottom:0}' +
    '.ov-row .n{font-variant-numeric:tabular-nums;font-weight:700}' +
    '.ov-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:640px}' +
    '.ov-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ov-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line);font-variant-numeric:tabular-nums}' +
    '.ov-good{color:var(--ok);font-weight:800}.ov-bad{color:var(--bad);font-weight:800}.ov-mid{color:var(--warn);font-weight:800}' +
    '.ov-link{font-size:11.5px;font-weight:700}'
  );

  function ovGBP(v) { var n = Number(v) || 0; return '£' + n.toFixed(2); }
  function ovStr(v) { return String(v == null ? '' : v).trim(); }

  function ovFetch() {
    return api('mgmtOverview', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('mgmtOverview', {}, d); }
      return d;
    });
  }

  function ovGo(view) { return 'data-ov-nav="' + view + '"'; }
  function ovNavTo(key) {
    var all = document.querySelectorAll('.nav a');
    for (var j = 0; j < all.length; j++) { all[j].classList.toggle('on', all[j].dataset.key === key); }
    renderView(key);
  }

  function ovPaint(d) {
    var box = $('ovBody');
    if (!box) { return; }
    var k = (d && d.kpis) || {};
    var h = '';

    // alert strip: named loss items + confirmed duplicates — the two red lights that need a person
    var dups = (d && d.duplicates) || [];
    var losses = (d && d.loss_items) || [];
    if (dups.length || losses.length) {
      var bits = [];
      if (losses.length) {
        bits.push('<b>' + losses.length + ' active item(s) selling at a loss</b> — worst: ' + losses.slice(0, 2).map(function (l) {
          return esc(ovStr(l.title).slice(0, 40) || l.item_id) + ' (' + esc(ovStr(l.account)) + ', ' + ovGBP(l.profit) + ')';
        }).join(' · '));
      }
      dups.forEach(function (r) {
        bits.push('<b>' + r.n + ' confirmed duplicate-campaign item(s)</b> on ' + esc(ovStr(r.account)));
      });
      h += '<div class="ov-alert">🔻 ' + bits.join('<br>🔴 ') +
        '<div style="margin-top:6px"><a href="#" class="ov-link" ' + ovGo('campaignWatch') + '>Campaign watch →</a> · <a href="#" class="ov-link" ' + ovGo('activeListings') + '>Active listings →</a></div></div>';
    }

    var t = k.today || {}, y = k.yesterday || {}, w = k.week || {};
    h += '<div class="ov-kpis">' +
      '<div class="ov-kpi"><div class="l">Today · revenue</div><div class="v">' + ovGBP(t.revenue) + '</div><div class="s">' + (Number(t.orders) || 0) + ' order(s) so far</div></div>' +
      '<div class="ov-kpi"><div class="l">Yesterday · revenue</div><div class="v">' + ovGBP(y.revenue) + '</div><div class="s">profit est ' + ovGBP(y.profit_est) + '</div></div>' +
      '<div class="ov-kpi"><div class="l">Yesterday · ad spend</div><div class="v">' + ovGBP(y.ads) + '</div><div class="s">across watched accounts</div></div>' +
      '<div class="ov-kpi"><div class="l">Last 7 days · revenue</div><div class="v">' + ovGBP(w.revenue) + '</div><div class="s">profit est ' + ovGBP(w.profit_est) + ' · ads ' + ovGBP(w.ads) + '</div></div>' +
      '</div>';

    function miniRows(list, fmt) {
      if (!list || !list.length) { return '<div class="ov-row"><span style="color:var(--text-3)">nothing yet</span></div>'; }
      return list.map(fmt).join('');
    }
    h += '<div class="ov-grid">' +
      '<div class="ov-mini"><div class="t">Today’s sales — live</div>' +
        miniRows((d && d.today_by_account) || [], function (a) {
          return '<div class="ov-row"><span>' + esc(ovStr(a.account)) + '</span><span class="n">' + ovGBP(a.revenue) + ' · ' + (Number(a.orders) || 0) + '</span></div>';
        }) + '</div>' +
      '<div class="ov-mini"><div class="t">Yesterday’s profit est — per account</div>' +
        miniRows((d && d.yesterday_by_account) || [], function (a) {
          var p = Number(a.profit) || 0;
          return '<div class="ov-row"><span>' + esc(ovStr(a.account)) + '</span><span class="n ' + (p < 0 ? 'ov-bad' : '') + '">' + ovGBP(p) + '</span></div>';
        }) + '</div>' +
      '<div class="ov-mini"><div class="t">Yesterday’s ad spend — per account</div>' +
        miniRows((d && d.ads_yesterday) || [], function (a) {
          return '<div class="ov-row"><span>' + esc(ovStr(a.account)) + '</span><span class="n">' + ovGBP(a.spend) + '</span></div>';
        }) + '</div>' +
      '</div>';

    var adsRows = (d && d.ads_yesterday) || [];
    h += '<h3 style="margin:4px 0 6px;font-size:13px">Advertising — yesterday vs the SOP target (ROAS ≥ 5)</h3>' +
      '<div class="scroll"><table class="ov-tbl"><thead><tr><th>Account</th><th>Spend</th><th>Clicks</th><th>Units sold</th><th>CPQ</th><th>Day revenue</th><th>ROAS</th></tr></thead><tbody>';
    if (!adsRows.length) { h += '<tr><td colspan="7" style="color:var(--text-3);font-weight:700">No spend data for yesterday yet — the report lands on the hourly poll.</td></tr>'; }
    adsRows.forEach(function (a) {
      var roas = a.roas;
      var cls = roas === null ? '' : roas >= 5 ? 'ov-good' : roas >= 3 ? 'ov-mid' : 'ov-bad';
      h += '<tr><td>' + esc(ovStr(a.account)) + '</td><td>' + ovGBP(a.spend) + '</td><td>' + (Number(a.clicks) || 0) + '</td>' +
        '<td>' + (Number(a.units) || 0) + '</td><td>' + (a.cpq === null ? '—' : ovGBP(a.cpq)) + '</td>' +
        '<td>' + ovGBP(a.revenue) + '</td><td class="' + cls + '">' + (roas === null ? '—' : roas.toFixed(1)) + '</td></tr>';
    });
    h += '</tbody></table></div>';

    var health = (d && d.health) || [];
    h += '<h3 style="margin:14px 0 6px;font-size:13px">Account health — live</h3><div class="ov-grid">';
    health.forEach(function (r) {
      h += '<div class="ov-mini"><div class="t">' + esc(ovStr(r.account)) + '</div>' +
        '<div class="ov-row"><span>Active listings</span><span class="n">' + (Number(r.listings) || 0) + '</span></div>' +
        '<div class="ov-row"><span>Orders 7d</span><span class="n">' + (Number(r.orders_7d) || 0) + '</span></div>' +
        '<div class="ov-row"><span>Revenue 7d</span><span class="n">' + ovGBP(r.revenue_7d) + '</span></div>' +
        '<div class="ov-row"><span>Campaigns running</span><span class="n">' + (Number(r.campaigns_running) || 0) + ' / ' + (Number(r.campaigns_total) || 0) + '</span></div>' +
        (Number(r.loss_items) ? '<div class="ov-row"><span class="ov-bad">Loss items</span><span class="n ov-bad">' + r.loss_items + '</span></div>' : '') +
        '</div>';
    });
    h += '</div>';

    h += '<p style="font-size:11.5px;color:var(--text-3);font-weight:600;margin:8px 0 0">' + esc(ovStr(d && d.note)) +
      ' · Returns &amp; cases and staff performance live on their own screens until their live feeds land.</p>';
    box.innerHTML = h;
  }

  function ovLoad() {
    var box = $('ovBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('mgmtOverview', {}) : null;
    if (had) { try { ovPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    ovFetch().then(ovPaint).catch(function (e) {
      if (had) { toast('Showing the last overview — could not refresh just now.'); return; }
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">Could not load the overview.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.overview = {
    label: 'Business overview',
    order: 2,
    roles: ['Management', 'Ops Head'],
    icon: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
    prefetch: function () { return ovFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Business <span class="goldtext">overview</span></h1>' +
          '<span class="sub">All accounts · UK business days · every number has a live feed behind it</span>' +
          '<button class="minibtn" id="ovRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd"><div id="ovBody"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
      var rf = $('ovRefresh');
      if (rf) { rf.onclick = ovLoad; }
      var body = $('ovBody');
      if (body) {
        body.onclick = function (ev) {
          var a = ev.target && ev.target.closest ? ev.target.closest('[data-ov-nav]') : null;
          if (!a) { return; }
          ev.preventDefault();
          ovNavTo(a.getAttribute('data-ov-nav'));
        };
      }
      ovLoad();
    }
  };
})();
