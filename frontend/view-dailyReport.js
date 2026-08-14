/* view-dailyReport.js — V2 Phase C (§9-C "daily report, own dashboard"): sales_daily from the
 * Engine, UK business dates (timezone law T-1). Profit is the sheet's own per-item projection ×
 * units — an estimate until the fee and ads feeds land, and the screen says so. Management/Ops
 * only, enforced server-side (collective profit, §6/A9). */
(function () {

  VIEW_CSS.push(
    '.dr-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:700px}' +
    '.dr-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.dr-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line)}' +
    '.dr-day{background:var(--panel-2);font-weight:800}' +
    '.dr-day td{padding:9px 12px}' +
    '.dr-acct td:first-child{padding-left:26px;color:var(--text-2)}' +
    '.dr-num{font-variant-numeric:tabular-nums;font-weight:700;text-align:right}' +
    '.dr-neg{color:var(--bad)}.dr-pos{color:var(--ok)}' +
    '.dr-note{font-size:11.5px;color:var(--text-3);font-weight:600;margin:8px 0 0}' +
    '.dr-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}' +
    '.dr-kpi{flex:1 1 150px;border:1px solid var(--gold-line);border-radius:12px;padding:10px 14px;background:var(--panel-2)}' +
    '.dr-kpi .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.dr-kpi .v{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.dr-kpi .d{font-size:11px;font-weight:800;margin-top:2px}'
  );

  function drGBP(v) { var n = Number(v) || 0; return '£' + n.toFixed(2); }

  function drFetch() {
    return api('dailyReport', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('dailyReport', {}, d); }
      return d;
    });
  }

  function drPaint(d) {
    var box = $('drBody');
    if (!box) { return; }
    var rows = (d && d.rows) || [];
    if (!rows.length) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">No rolled-up days yet.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">The nightly rollup fills this after the first 2 AM run — or the moment an order lands on a new day.</span></div>';
      return;
    }
    var byDay = {};
    var order = [];
    rows.forEach(function (r) {
      if (!byDay[r.date]) { byDay[r.date] = []; order.push(r.date); }
      byDay[r.date].push(r);
    });

    /* Weekly/monthly KPIs (§9-C) from the same rows — UK dates, so "this week" is the last 7
     * UK days vs the 7 before, and "month" is month-to-date vs the whole previous month. */
    function sumRange(from, to) {
      var t = { sold: 0, profit: 0 };
      rows.forEach(function (r) {
        if (r.date >= from && r.date <= to) { t.sold += Number(r.sold) || 0; t.profit += Number(r.profit) || 0; }
      });
      return t;
    }
    function dShift(iso, days) {
      var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    var kpiHtml = '';
    if (order.length) {
      var newest = order[0];
      var w1 = sumRange(dShift(newest, -6), newest);
      var w0 = sumRange(dShift(newest, -13), dShift(newest, -7));
      var mStart = newest.slice(0, 8) + '01';
      var pmEnd = dShift(mStart, -1);
      var pmStart = pmEnd.slice(0, 8) + '01';
      var m1 = sumRange(mStart, newest);
      var m0 = sumRange(pmStart, pmEnd);
      function tile(label, cur, prev, prevLabel) {
        var d = prev > 0 ? Math.round((cur - prev) / prev * 100) : null;
        return '<div class="dr-kpi"><div class="l">' + esc(label) + '</div><div class="v">' + drGBP(cur) + '</div>' +
          (d === null ? '<div class="d" style="color:var(--text-3)">' + esc(prevLabel) + ': —</div>'
            : '<div class="d ' + (d >= 0 ? 'dr-pos' : 'dr-neg') + '">' + (d >= 0 ? '▲' : '▼') + Math.abs(d) + '% vs ' + esc(prevLabel) + '</div>') +
          '</div>';
      }
      kpiHtml = '<div class="dr-kpis">' +
        tile('Revenue · 7 days', w1.sold, w0.sold, 'prior 7') +
        tile('Profit est · 7 days', w1.profit, w0.profit, 'prior 7') +
        tile('Revenue · month to date', m1.sold, m0.sold, 'last month') +
        tile('Profit est · month to date', m1.profit, m0.profit, 'last month') +
        '</div>';
    }

    var h = kpiHtml + '<div class="scroll"><table class="dr-tbl"><thead><tr>' +
      '<th>Day (UK)</th><th style="text-align:right">Revenue</th><th style="text-align:right">Order earning</th><th style="text-align:right">Cost</th><th style="text-align:right">Ads</th><th style="text-align:right">Profit est.</th></tr></thead><tbody>';
    order.slice(0, 31).forEach(function (dte) {
      var list = byDay[dte];
      var t = { sold: 0, oe: 0, cost: 0, ads: 0, profit: 0 };
      list.forEach(function (r) { t.sold += Number(r.sold) || 0; t.oe += Number(r.oe) || 0; t.cost += Number(r.cost) || 0; t.ads += Number(r.ads) || 0; t.profit += Number(r.profit) || 0; });
      h += '<tr class="dr-day"><td>' + esc(dte) + '</td>' +
        '<td class="dr-num">' + drGBP(t.sold) + '</td><td class="dr-num">' + drGBP(t.oe) + '</td>' +
        '<td class="dr-num">' + drGBP(t.cost) + '</td>' +
        '<td class="dr-num">' + (t.ads ? drGBP(t.ads) : '—') + '</td>' +
        '<td class="dr-num ' + (t.profit < 0 ? 'dr-neg' : 'dr-pos') + '">' + drGBP(t.profit) + '</td></tr>';
      list.forEach(function (r) {
        h += '<tr class="dr-acct"><td>' + esc(String(r.account || '')) + '</td>' +
          '<td class="dr-num">' + drGBP(r.sold) + '</td><td class="dr-num">' + drGBP(r.oe) + '</td>' +
          '<td class="dr-num">' + drGBP(r.cost) + '</td>' +
          '<td class="dr-num">' + (Number(r.ads) ? drGBP(r.ads) : '—') + '</td>' +
          '<td class="dr-num ' + (Number(r.profit) < 0 ? 'dr-neg' : '') + '">' + drGBP(r.profit) + '</td></tr>';
      });
    });
    h += '</tbody></table></div>';
    if (d && d.note) { h += '<p class="dr-note">' + esc(String(d.note)) + '</p>'; }
    box.innerHTML = h;
  }

  function drLoad() {
    var box = $('drBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('dailyReport', {}) : null;
    if (had) { try { drPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    drFetch().then(drPaint).catch(function (e) {
      if (had) { toast('Showing the last report — could not refresh just now.'); return; }
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">Could not load the daily report.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.dailyReport = {
    label: 'Daily report',
    order: 9,
    roles: ['Management', 'Ops Head'],
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    prefetch: function () { return drFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Daily <span class="goldtext">report</span></h1>' +
          '<span class="sub">UK business days · per-account and day totals · profit is an estimate until the fee feed lands</span></div>' +
        '<div class="card enter d2"><div class="bd"><div id="drBody"><div class="spinner"></div></div></div></div>';
    },
    init: function () { drLoad(); }
  };
})();
