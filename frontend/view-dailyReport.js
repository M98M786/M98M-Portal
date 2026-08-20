/* view-dailyReport.js — V2 Phase C (§9-C "daily report, own dashboard"): sales_daily from the
 * Engine, UK business dates (timezone law T-1). Profit is the books' identity from the central
 * sheet — T = 0.8 × (order earning − cost), VAT netted, ads in their own column and deducted at
 * period level. Management/Ops only, enforced server-side (collective profit, §6/A9). */
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
    /* Today rides the live overlay. The books only materialise at the nightly rollup, so the
       raw rows for today are ads-only zeros — noise dressed as data. Swap them for the Engine's
       live pulse: real orders, real paid cost, intraday ads. Profit stays "—" until the fees
       land — OE is only known for fee-landed orders, and netting a partial OE against a full
       day's cost would print a fake loss. */
    var liveDay = (d && d.today) || '';
    var liveRows = (d && d.today_live) || [];
    if (liveDay && liveRows.length) {
      rows = rows.filter(function (r) { return r.date !== liveDay; });
      liveRows.forEach(function (l) {
        rows.push({ account: l.account, date: liveDay, sold: l.sold, oe: l.oe_known,
          cost: l.cost, ads: l.ads, profit: null, _live: true });
      });
    }
    /* Night review 2 ("daily report is all wrong, with no sense"): a dormant account painted a
       £0.00 row under every single day — noise dressed as data. An account with literally
       nothing across the whole window leaves the table; the day it earns a penny it is back. */
    var alive = {};
    rows.forEach(function (r) {
      if ((Number(r.sold) || 0) || (Number(r.cost) || 0) || (Number(r.ads) || 0)) { alive[r.account] = 1; }
    });
    rows = rows.filter(function (r) { return alive[r.account]; });
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
    order.sort().reverse(); /* live rows append out of order — ISO dates sort lexically */

    /* Weekly/monthly KPIs (§9-C) from the same rows — UK dates, so "this week" is the last 7
     * UK days vs the 7 before, and "month" is month-to-date vs the whole previous month. */
    function sumRange(from, to) {
      var t = { sold: 0, profit: 0, actual: 0, ads: 0, adsRev: 0 };
      rows.forEach(function (r) {
        if (r.date >= from && r.date <= to) {
          t.sold += Number(r.sold) || 0; t.profit += Number(r.profit) || 0;
          t.actual += Number(r.actual) || 0; t.ads += Number(r.ads) || 0; t.adsRev += Number(r.ads_rev) || 0;
        }
      });
      return t;
    }
    function drROAS(rev, ads) { return ads > 0.005 ? (rev / ads).toFixed(1) + '×' : '—'; }
    function dShift(iso, days) {
      var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    var kpiHtml = '';
    if (order.length) {
      /* KPI tiles compare CLOSED books only — anchoring "7 days" on a half-finished today
         would grade a full prior week against six days and a stub */
      var newest = (order[0] === liveDay && order.length > 1) ? order[1] : order[0];
      var w1 = sumRange(dShift(newest, -6), newest);
      var w0 = sumRange(dShift(newest, -13), dShift(newest, -7));
      var mStart = newest.slice(0, 8) + '01';
      var pmEnd = dShift(mStart, -1);
      var pmStart = pmEnd.slice(0, 8) + '01';
      var m1 = sumRange(mStart, newest);
      /* like-for-like: 14 days of this month against the FIRST 14 days of last month — the
         whole prior month made every MTD read as a collapse */
      var daysIn = Math.round((new Date(newest + 'T12:00:00Z') - new Date(mStart + 'T12:00:00Z')) / 86400000) + 1;
      var m0 = sumRange(pmStart, dShift(pmStart, daysIn - 1));
      function tile(label, cur, prev, prevLabel) {
        var d = prev > 0 ? Math.round((cur - prev) / prev * 100) : null;
        return '<div class="dr-kpi"><div class="l">' + esc(label) + '</div><div class="v">' + drGBP(cur) + '</div>' +
          (d === null ? '<div class="d" style="color:var(--text-3)">' + esc(prevLabel) + ': —</div>'
            : '<div class="d ' + (d >= 0 ? 'dr-pos' : 'dr-neg') + '">' + (d >= 0 ? '▲' : '▼') + Math.abs(d) + '% vs ' + esc(prevLabel) + '</div>') +
          '</div>';
      }
      kpiHtml = '<div class="dr-kpis">' +
        tile('Revenue · 7 days', w1.sold, w0.sold, 'prior 7') +
        tile('Actual profit · 7 days', w1.actual, w0.actual, 'prior 7') +
        '<div class="dr-kpi"><div class="l">ROAS · 7 days</div><div class="v">' + drROAS(w1.adsRev, w1.ads) + '</div>' +
          '<div class="d" style="color:var(--text-3)">eBay-attributed £' + Math.round(w1.adsRev) + ' on £' + Math.round(w1.ads) + ' ads · blended ' + drROAS(w1.sold, w1.ads) + '</div></div>' +
        tile('Revenue · month to date', m1.sold, m0.sold, 'same ' + daysIn + 'd last month') +
        tile('Actual · month to date', m1.actual, m0.actual, 'same ' + daysIn + 'd last month') +
        '</div>';
    }

    var h = kpiHtml + '<div class="scroll"><table class="dr-tbl"><thead><tr>' +
      '<th>Day (UK)</th><th style="text-align:right">Revenue</th><th style="text-align:right">Order earning</th><th style="text-align:right">Cost</th>' +
      '<th style="text-align:right">Ads</th><th style="text-align:right">Ad revenue</th><th style="text-align:right">ROAS</th>' +
      '<th style="text-align:right" title="T = 0.8 × (OE − cost) — the sheet law, before ads">T</th>' +
      '<th style="text-align:right" title="Actual = T − CPC ads − returns — the sales-analysis brain, per day">Actual</th></tr></thead><tbody>';
    order.slice(0, 31).forEach(function (dte) {
      var list = byDay[dte];
      var isLive = dte === liveDay && list.some(function (r) { return r._live; });
      var t = { sold: 0, oe: 0, cost: 0, ads: 0, profit: 0, actual: 0, adsRev: 0 };
      list.forEach(function (r) { t.sold += Number(r.sold) || 0; t.oe += Number(r.oe) || 0; t.cost += Number(r.cost) || 0; t.ads += Number(r.ads) || 0; t.profit += Number(r.profit) || 0; t.actual += Number(r.actual) || 0; t.adsRev += Number(r.ads_rev) || 0; });
      var wait = '<span title="closes at the nightly rollup, once every fee has landed" style="color:var(--text-3)">tonight</span>';
      h += '<tr class="dr-day"><td>' + esc(dte) + (isLive ? ' <span style="color:var(--gold);font-size:10px;font-weight:800">LIVE</span>' : '') + '</td>' +
        '<td class="dr-num">' + drGBP(t.sold) + '</td><td class="dr-num">' + drGBP(t.oe) + '</td>' +
        '<td class="dr-num">' + drGBP(t.cost) + '</td>' +
        '<td class="dr-num">' + (t.ads ? drGBP(t.ads) : '—') + '</td>' +
        '<td class="dr-num">' + (t.adsRev ? drGBP(t.adsRev) : '—') + '</td>' +
        '<td class="dr-num">' + drROAS(t.adsRev, t.ads) + '</td>' +
        '<td class="dr-num">' + (isLive ? wait : drGBP(t.profit)) + '</td>' +
        '<td class="dr-num ' + (t.actual < 0 ? 'dr-neg' : 'dr-pos') + '">' + (isLive ? wait : drGBP(t.actual)) + '</td></tr>';
      list.forEach(function (r) {
        h += '<tr class="dr-acct"><td>' + esc(String(r.account || '')) + '</td>' +
          '<td class="dr-num">' + drGBP(r.sold) + '</td><td class="dr-num">' + drGBP(r.oe) + '</td>' +
          '<td class="dr-num">' + drGBP(r.cost) + '</td>' +
          '<td class="dr-num">' + (Number(r.ads) ? drGBP(r.ads) : '—') + '</td>' +
          '<td class="dr-num">' + (Number(r.ads_rev) ? drGBP(r.ads_rev) : '—') + '</td>' +
          '<td class="dr-num">' + drROAS(Number(r.ads_rev) || 0, Number(r.ads) || 0) + '</td>' +
          '<td class="dr-num">' + (r._live ? '<span style="color:var(--text-3)">—</span>' : drGBP(r.profit)) + '</td>' +
          '<td class="dr-num ' + (Number(r.actual) < 0 ? 'dr-neg' : '') + '">' +
            (r._live ? '<span style="color:var(--text-3)">—</span>' : drGBP(r.actual)) + '</td></tr>';
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
          '<span class="sub">UK business days \u00b7 per-account and day totals \u00b7 T = 0.8 \u00d7 (earning \u2212 cost), Actual = T \u2212 CPC ads \u2212 returns \u2014 the sales-analysis brain per day \u00b7 ROAS = eBay-attributed ad revenue \u00f7 ad spend</span></div>' +
        '<div class="card enter d2"><div class="bd"><div id="drBody"><div class="spinner"></div></div></div></div>';
    },
    init: function () { drLoad(); }
  };
})();
