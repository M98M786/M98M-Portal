/* view-kpis2.js — TRUTH v2 WO-05: Account report + Account KPIs merged into ONE page on the
 * register. Loads after view-alerts.js (build order is alphabetical), so these registrations
 * replace the old ones; the old code paths go entirely at Phase 6 cleanup. Every number here is
 * a register metric for the chosen account × range: SOLD_SHEET (with SOLD_API sub-line),
 * ACTUAL_PROFIT (Σ Raw Profit), VAT_TO_HMRC, MARGIN, ALI_COST, ROWS_COVERAGE, LATE_NOW — plus
 * the RATING block from eBay's standards. Chart: daily Sold bars + Actual line, Pakistan days;
 * ads stays on its own old panel until the ads module flips. */
(function () {
  'use strict';

  var K2 = { acct: '', days: 30 };

  VIEW_CSS.push(
    '.k2-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:14px}' +
    '.k2-tile{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2)}' +
    '.k2-tile .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.k2-tile .v{font-size:20px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.k2-tile .s{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:3px}' +
    '.k2-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:640px}' +
    '.k2-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.k2-tbl th:first-child{text-align:left}' +
    '.k2-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums}' +
    '.k2-tbl td:first-child{text-align:left;font-weight:700}'
  );

  function k2GBP(v) { var n = Number(v) || 0; return (n < 0 ? '−£' + Math.abs(n).toFixed(2) : '£' + n.toFixed(2)); }

  function k2Chart(days) {
    if (!days || days.length < 2) { return '<div class="alx-empty">Not enough mirrored days yet for a chart.</div>'; }
    var W = 860, H = 260, L = 56, R = 16, T = 18, B = 40;
    var maxSold = 1;
    days.forEach(function (d) { maxSold = Math.max(maxSold, Number(d.sold) || 0); });
    var n = days.length;
    var bw = Math.max(3, Math.floor((W - L - R) / n) - 3);
    var X = function (i) { return L + i * (W - L - R) / n; };
    var Y = function (v) { return T + (1 - v / maxSold) * (H - T - B); };
    var bars = days.map(function (d, i) {
      var h2 = (H - T - B) * ((Number(d.sold) || 0) / maxSold);
      return '<rect x="' + X(i).toFixed(1) + '" y="' + (H - B - h2).toFixed(1) + '" width="' + bw + '" height="' + h2.toFixed(1) + '" fill="var(--blue)" opacity="0.55"><title>' + d.day + ' — sold ' + k2GBP(d.sold) + ' · actual ' + k2GBP(d.actual) + ' · VAT ' + k2GBP(d.vat) + ' · ' + d.rows + ' rows</title></rect>';
    }).join('');
    var line = days.map(function (d, i) {
      return (i ? 'L' : 'M') + (X(i) + bw / 2).toFixed(1) + ',' + Y(Math.max(0, Number(d.actual) || 0)).toFixed(1);
    }).join(' ');
    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var gy = T + (1 - g / 4) * (H - T - B);
      grid += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + gy.toFixed(1) + '" stroke="var(--gold-line)" stroke-dasharray="3 5"/>' +
        '<text x="' + (L - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--text-3)">£' + Math.round(maxSold * g / 4) + '</text>';
    }
    var labels = '';
    var step = Math.max(1, Math.floor(n / 8));
    for (var i = 0; i < n; i += step) {
      labels += '<text x="' + (X(i) + bw / 2).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="9.5" fill="var(--text-3)">' + days[i].day.slice(5) + '</text>';
    }
    return '<div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:620px;width:100%;height:auto">' + grid + labels + bars +
      '<path d="' + line + '" fill="none" stroke="var(--ok)" stroke-width="2.2"/>' +
      '<text x="' + L + '" y="12" font-size="10.5" font-weight="800" fill="var(--blue)">▮ Sold / day (books)</text>' +
      '<text x="' + (L + 140) + '" y="12" font-size="10.5" font-weight="800" fill="var(--ok)">▬ Actual profit / day</text>' +
      '</svg></div>';
  }

  function k2Load() {
    var body = $('k2Body');
    if (!body) { return; }
    body.innerHTML = '<div class="spinner"></div>';
    var from = pkDayStr(-(K2.days - 1));
    var to = pkDayStr(0);
    var scope = { from: from, to: to };
    if (K2.acct) { scope.account = K2.acct; }
    truthPage(scope).then(function (d) {
      if (!$('k2Body')) { return; }
      var M = d.metrics;
      var byA = M.MONEY_BY_ACCOUNT.value || {};
      var mine = K2.acct ? byA[K2.acct] : null;
      var sold = mine ? mine.sold : M.SOLD_SHEET.value;
      var act = mine ? (mine.actual_after_returns !== undefined ? mine.actual_after_returns : mine.actual) : (M.ACTUAL_AFTER_RETURNS || M.ACTUAL_PROFIT).value;
      var vat = mine ? mine.vat : M.VAT_TO_HMRC.value;
      var ali = mine ? mine.ali : M.ALI_COST.value;
      var margin = mine ? mine.margin : M.MARGIN.value;
      var rowsN = mine ? mine.rows : (M.ROWS_COVERAGE.value || {}).rows;
      var apiBy = (M.SOLD_API.value || {}).by || {};
      var sApi = K2.acct ? (apiBy[K2.acct] || {}).sold : (M.SOLD_API.value || {}).all;
      var oApi = K2.acct ? (apiBy[K2.acct] || {}).orders : (M.SOLD_API.value || {}).orders;
      var tile = function (l, v, s2) {
        return '<div class="k2-tile"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + s2 + '</div></div>';
      };
      var h = '<div class="k2-tiles">' +
        tile('Sold (books)', k2GBP(sold), 'eBay: ' + k2GBP(sApi || 0) + ' · ' + (oApi || 0) + ' orders ' + mChip(M.SOLD_SHEET)) +
        tile('Actual profit', k2GBP(act), "Σ 'Actual Profit' (raw − returns) " + mChip(M.ACTUAL_PROFIT)) +
        tile('VAT to HMRC', k2GBP(vat), 'Σ VAT to HMRC ' + mChip(M.VAT_TO_HMRC)) +
        tile('AliExpress', k2GBP(ali), 'incl VAT, from the rows') +
        tile('Margin', margin == null ? '—' : margin + '%', 'actual ÷ sold') +
        tile('Rows written', String(rowsN || 0), 'of ' + (oApi || 0) + ' orders in range') +
        tile('Late now', String(M.LATE_NOW.value.n), 'from eBay’s open set ' + mChip(M.LATE_NOW)) +
        '</div>';

      /* daily chart + table: one account = its series; all accounts = summed across accounts */
      var daysMap = {};
      Object.keys(byA).forEach(function (a) {
        if (K2.acct && a !== K2.acct) { return; }
        (byA[a].days || []).forEach(function (r) {
          var b = (daysMap[r.day] = daysMap[r.day] || { day: r.day, sold: 0, actual: 0, vat: 0, rows: 0 });
          b.sold += Number(r.sold) || 0; b.actual += Number(r.actual) || 0; b.vat += Number(r.vat) || 0; b.rows += Number(r.rows) || 0;
        });
      });
      var series = Object.keys(daysMap).sort().map(function (k) { return daysMap[k]; });
      h += '<div class="card"><div class="hd">Sold vs Actual — Pakistan days</div><div class="bd">' + k2Chart(series) + '</div></div>';

      h += '<div class="card" style="margin-top:14px"><div class="hd">Day by day</div><div class="bd"><div class="scroll"><table class="k2-tbl"><thead><tr>' +
        '<th>Day</th><th>Sold</th><th>Actual</th><th>VAT</th><th>Rows</th></tr></thead><tbody>' +
        series.slice().reverse().map(function (r) {
          return '<tr><td>' + esc(r.day) + '</td><td>' + k2GBP(r.sold) + '</td><td style="color:var(--' + (r.actual < 0 ? 'bad' : 'ok') + ');font-weight:700">' + k2GBP(r.actual) + '</td><td>' + k2GBP(r.vat) + '</td><td>' + r.rows + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">A missing day is a gap — rows not written yet, never an invented number. Figures as at ' + esc(String(d.asOf).slice(11, 16)) + ' UTC.</p></div></div>';
      body.innerHTML = h;
    }).catch(function (e) {
      body.innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>';
    });
  }

  VIEWS.kpis = {
    label: 'Account KPIs',
    icon: '<path d="M4 19V5M4 19h16"/><rect x="7" y="11" width="3" height="5"/><rect x="12" y="8" width="3" height="8"/><rect x="17" y="13" width="3" height="3"/>',
    roles: ['Management', 'Ops Head'],
    order: 8,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">KPIs</span></h1>' +
        '<span class="sub">one page, one register — every account, every number with its verification chip</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
        '<select class="alx-sel" id="k2Acct"><option value="">All accounts</option></select>' +
        [[7, '7 days'], [30, '30 days'], [90, '90 days']].map(function (p) {
          return '<button class="minibtn' + (K2.days === p[0] ? ' on' : '') + '" data-k2-d="' + p[0] + '">' + p[1] + '</button>';
        }).join('') + '</span></div>' +
        '<div id="k2Body"><div class="spinner"></div></div>';
    },
    init: function () {
      fillAccountSelect($('k2Acct'), K2.acct, function () { K2.acct = $('k2Acct').value; k2Load(); });
      document.querySelectorAll('[data-k2-d]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-k2-d]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          K2.days = Number(this.getAttribute('data-k2-d')) || 30;
          k2Load();
        };
      });
      k2Load();
    }
  };

  /* WO-05: the old Account report route redirects into the merged page. */
  VIEWS.accountReport = {
    label: 'Account report',
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    roles: ['Management', 'Ops Head'],
    order: 9.5,
    hidden: true,
    render: function () {
      setTimeout(function () { location.hash = 'kpis'; }, 30);
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">report</span></h1>' +
        '<span class="sub">merged into Account KPIs — taking you there…</span></div>';
    },
    init: function () {}
  };
})();
