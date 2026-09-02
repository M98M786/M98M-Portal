/* view-zz-sheetTruth.js — 2 Sept, the owner's law: EVERY money number follows the Sales
 * Analysis sheets' own columns. This file re-registers three pages on that law (it sorts last,
 * so these replace the older registrations):
 *   · Sales analysis  — full range control (today/yesterday/7/30/60/90, this/last week,
 *     this/last month, custom), the four profit strips, the sheet's charts, a per-account
 *     ledger, item-by-item P&L grouped from the day rows themselves.
 *   · VAT breakdown   — the sheet's five VAT columns per account, S = C − G − J − M − Q.
 *   · Daily report    — any single day, per account, the day tabs' own columns.
 * Sources: pageMetrics.MONEY_BY_ACCOUNT + sheetItems (both read the D1 mirror of the books). */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.sx-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px;background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:9px 11px}' +
    '.sx-bar .minibtn.on{border-color:var(--gold);color:var(--gold)}' +
    '.sx-bar input[type=date]{padding:6px 9px;border-radius:8px;border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text);font:inherit;font-size:11.5px}' +
    '.sx-strip{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:14px}' +
    '.sx-mini{border:1px solid var(--gold-line);border-radius:11px;padding:10px 13px;background:var(--panel-2)}' +
    '.sx-mini .l{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.sx-mini b{display:block;font-size:18px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}' +
    '.sx-mini .s{font-size:10px;color:var(--text-3);font-weight:600;margin-top:2px}' +
    '.sx-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));margin-bottom:14px}' +
    '.sx-tile{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2)}' +
    '.sx-tile .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.sx-tile .v{font-size:20px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.sx-tile .s{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:3px}' +
    '.sx-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}' +
    '.sx-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.sx-tbl th:first-child{text-align:left}' +
    '.sx-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums}' +
    '.sx-tbl td:first-child{text-align:left;font-weight:700}' +
    '.sx-tbl tr.tot td{font-weight:800;border-top:2px solid var(--gold-line-hi)}' +
    '.sx-note{font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px}'
  );

  function sxGBP(v) { var n = Number(v) || 0; return (n < 0 ? '−£' + Math.abs(n).toFixed(2) : '£' + n.toFixed(2)); }
  function sxK(v) { var n = Number(v) || 0; var a = Math.abs(n); var s = a >= 10000 ? '£' + (a / 1000).toFixed(1) + 'k' : '£' + a.toFixed(2); return n < 0 ? '−' + s : s; }

  /* ————— PKT range presets ————— */
  function sxD(off) { return pkDayStr(off); }
  function sxShift(pk, days) {
    var t = new Date(pk + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + days);
    return t.toISOString().slice(0, 10);
  }
  function sxRanges() {
    var today = sxD(0);
    var dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7;   // Mon=0
    var thisMon = sxShift(today, -dow);
    var monthStart = today.slice(0, 8) + '01';
    var lastMonthEnd = sxShift(monthStart, -1);
    var lastMonthStart = lastMonthEnd.slice(0, 8) + '01';
    return {
      today: { label: 'Today', from: today, to: today },
      yday: { label: 'Yesterday', from: sxD(-1), to: sxD(-1) },
      d7: { label: '7 days', from: sxD(-6), to: today },
      d30: { label: '30 days', from: sxD(-29), to: today },
      d60: { label: '60 days', from: sxD(-59), to: today },
      d90: { label: '90 days', from: sxD(-89), to: today },
      tw: { label: 'This week', from: thisMon, to: today },
      lw: { label: 'Last week', from: sxShift(thisMon, -7), to: sxShift(thisMon, -1) },
      tm: { label: 'This month', from: monthStart, to: today },
      lm: { label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
    };
  }
  function sxBarHtml(idp, cur) {
    var R = sxRanges();
    return '<div class="sx-bar">' + Object.keys(R).map(function (k) {
      return '<button class="minibtn' + (cur === k ? ' on' : '') + '" data-' + idp + '-r="' + k + '">' + R[k].label + '</button>';
    }).join('') +
      '<span style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
      '<input type="date" id="' + idp + 'From"><span style="color:var(--text-3);font-size:11px;font-weight:700">to</span><input type="date" id="' + idp + 'To">' +
      '<button class="minibtn" id="' + idp + 'Apply">Apply</button></span></div>';
  }
  function sxWireBar(idp, onRange) {
    document.querySelectorAll('[data-' + idp + '-r]').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-' + idp + '-r]').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on');
        var R = sxRanges()[this.getAttribute('data-' + idp + '-r')];
        onRange(R.from, R.to, this.getAttribute('data-' + idp + '-r'));
      };
    });
    var ap = $(idp + 'Apply');
    if (ap) {
      ap.onclick = function () {
        var f = ($(idp + 'From') || {}).value, t = ($(idp + 'To') || {}).value;
        if (!f || !t) { toast('Pick both dates first.'); return; }
        if (f > t) { var x = f; f = t; t = x; }
        document.querySelectorAll('[data-' + idp + '-r]').forEach(function (b2) { b2.classList.remove('on'); });
        onRange(f, t, 'custom');
      };
    }
  }

  function sxMergeDays(byA, acct) {
    var m = {};
    Object.keys(byA || {}).forEach(function (a) {
      if (acct && a !== acct) { return; }
      (byA[a].days || []).forEach(function (r) {
        var b = (m[r.day] = m[r.day] || { day: r.day, sold: 0, actual: 0, ap: 0, vat: 0, ads: 0, ret: 0, ali: 0, rows: 0 });
        b.sold += r.sold; b.actual += r.actual; b.ap += (r.actual_after_returns || 0); b.vat += r.vat;
        b.ads += (r.ads || 0); b.ret += (r.returns || 0); b.ali += (r.ali || 0); b.rows += r.rows;
      });
    });
    return Object.keys(m).sort().map(function (k) { return m[k]; });
  }

  /* 3 Sept (owner: "graphs of sales analysis all fucked up") — the charts used to draw only
     BOOK-WRITTEN days, so the newest days collapsed to nothing while the tiles showed live
     figures. This merges the register's blended per-day series instead: filled days are the
     books; unfilled days carry the eBay-API figure through the books' own ratios and are drawn
     hatched, labeled live. */
  function sxMergeDaysUp(metrics, acct) {
    var series = metrics && metrics.DAYS_UPTODATE && metrics.DAYS_UPTODATE.value;
    if (!series || !series.length) { return sxMergeDays((metrics.MONEY_BY_ACCOUNT || {}).value || {}, acct); }
    var m = {};
    series.forEach(function (r) {
      if (acct && r.account !== acct) { return; }
      var b = (m[r.day] = m[r.day] || { day: r.day, sold: 0, ap: 0, actual: 0, vat: 0, ads: 0, ret: 0, ali: 0, rows: 0, live: false });
      b.sold += (r.sold || 0); b.ap += (r.actual || 0); b.actual += (r.actual || 0); b.vat += (r.vat || 0);
      b.ads += (r.ads || 0); b.ret += (r.returns || 0); b.ali += (r.ali || 0); b.rows += (r.rows || 0);
      if (r.src === 'live') { b.live = true; }
    });
    return Object.keys(m).sort().map(function (k) { return m[k]; });
  }

  /* two small SVG charts, the report sheet's own pair */
  function sxChartSoldActual(days) {
    if (!days || !days.length) { return '<div class="alx-empty">No days with any data in this range yet.</div>'; }
    var W = 860, H = 240, L = 54, R = 14, T = 16, B = 36;
    var mx = 1;
    days.forEach(function (d) { mx = Math.max(mx, d.sold); });
    var n = days.length, bw = Math.max(3, Math.floor((W - L - R) / n) - 3);
    var X = function (i) { return L + i * (W - L - R) / n; };
    var Y = function (v) { return T + (1 - v / mx) * (H - T - B); };
    var bars = days.map(function (d, i) {
      var h2 = (H - T - B) * (d.sold / mx);
      var live = !!d.live;
      return '<rect x="' + X(i).toFixed(1) + '" y="' + (H - B - h2).toFixed(1) + '" width="' + bw + '" height="' + Math.max(0, h2).toFixed(1) + '"' +
        (live ? ' fill="var(--blue)" opacity=".28" stroke="var(--blue)" stroke-width="1.4" stroke-dasharray="4 3"' : ' fill="var(--blue)" opacity=".55"') +
        '><title>' + d.day + ' — sold ' + sxGBP(d.sold) + ' · actual ' + sxGBP(d.ap || d.actual) + (live ? ' (LIVE · book not written yet)' : '') + '</title></rect>';
    }).join('');
    var gridLines = [0.5, 1].map(function (f) {
      var y = (T + (1 - f) * (H - T - B)).toFixed(1);
      return '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="rgba(120,132,152,.18)" stroke-width="1"/>' +
        '<text x="' + (L - 6) + '" y="' + (Number(y) + 3.5) + '" text-anchor="end" font-size="9" fill="var(--text-3)">' + sxGBP(mx * f) + '</text>';
    }).join('');
    var line = days.map(function (d, i) { return (i ? 'L' : 'M') + (X(i) + bw / 2).toFixed(1) + ',' + Y(Math.max(0, d.ap || d.actual)).toFixed(1); }).join(' ');
    var labels = '';
    var step = Math.max(1, Math.floor(n / 9));
    for (var i = 0; i < n; i += step) { labels += '<text x="' + (X(i) + bw / 2).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="9.5" fill="var(--text-3)">' + days[i].day.slice(5) + '</text>'; }
    var liveAny = days.some(function (d) { return d.live; });
    return '<div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:620px;width:100%;height:auto">' + gridLines + bars + labels +
      '<path d="' + line + '" fill="none" stroke="var(--ok)" stroke-width="2.2"/>' +
      '<text x="' + L + '" y="12" font-size="10.5" font-weight="800" fill="var(--blue)">▮ Sold / day</text>' +
      '<text x="' + (L + 110) + '" y="12" font-size="10.5" font-weight="800" fill="var(--ok)">▬ Actual profit / day</text>' +
      (liveAny ? '<text x="' + (W - R) + '" y="12" text-anchor="end" font-size="10" font-weight="800" fill="var(--blue)" opacity=".7">▯ dashed = live from eBay API (book not written yet)</text>' : '') +
      '</svg></div>';
  }
  function sxChartLeaks(days) {
    if (!days || !days.length) { return '<div class="alx-empty">No days with any data in this range yet.</div>'; }
    var W = 860, H = 190, L = 54, R = 14, T = 14, B = 34;
    var mx = 1;
    days.forEach(function (d) { mx = Math.max(mx, d.ads + d.ret); });
    var n = days.length, bw = Math.max(3, Math.floor((W - L - R) / n) - 3);
    var X = function (i) { return L + i * (W - L - R) / n; };
    var bars = days.map(function (d, i) {
      var hA = (H - T - B) * (d.ads / mx), hR = (H - T - B) * (d.ret / mx);
      var lv = d.live ? ' stroke-dasharray="4 3" stroke-width="1.2"' : '';
      return '<rect x="' + X(i).toFixed(1) + '" y="' + (H - B - hA).toFixed(1) + '" width="' + bw + '" height="' + Math.max(0, hA).toFixed(1) + '" fill="var(--warn)" opacity="' + (d.live ? '.4' : '.8') + '" stroke="var(--warn)"' + lv + '><title>' + d.day + ' — ads incl VAT ' + sxGBP(d.ads) + (d.live ? ' (live)' : '') + '</title></rect>' +
        '<rect x="' + X(i).toFixed(1) + '" y="' + (H - B - hA - hR).toFixed(1) + '" width="' + bw + '" height="' + Math.max(0, hR).toFixed(1) + '" fill="var(--bad)" opacity="' + (d.live ? '.45' : '.85') + '" stroke="var(--bad)"' + lv + '><title>' + d.day + ' — returns ' + sxGBP(d.ret) + (d.live ? ' (live)' : '') + '</title></rect>';
    }).join('');
    var labels = '';
    var step = Math.max(1, Math.floor(n / 9));
    for (var i = 0; i < n; i += step) { labels += '<text x="' + (X(i) + bw / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="9.5" fill="var(--text-3)">' + days[i].day.slice(5) + '</text>'; }
    return '<div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:620px;width:100%;height:auto">' + bars + labels +
      '<text x="' + L + '" y="11" font-size="10.5" font-weight="800" fill="var(--warn)">▮ Ads incl VAT</text>' +
      '<text x="' + (L + 100) + '" y="11" font-size="10.5" font-weight="800" fill="var(--bad)">▮ Returns</text></svg></div>';
  }

  function sxCoverageNote(d, from, to) {
    var cov = (d.metrics.ROWS_COVERAGE.value || {});
    var days = sxMergeDaysUp(d.metrics, SX.acct);
    var span = Math.round((new Date(to + 'T12:00:00Z') - new Date(from + 'T12:00:00Z')) / 86400000) + 1;
    return '<p class="sx-note">' + days.length + ' of ' + span + ' day(s) in this range have book rows (' + (cov.rows || 0) + ' rows · ' + (cov.orders || 0) + ' eBay orders in the same window). ' +
      'A missing day means its tab has no rows yet — staff write the day tabs during shifts; nothing is invented. ' + mChip(d.metrics.SOLD_SHEET) + '</p>';
  }

  /* ————————————— SALES ANALYSIS ————————————— */
  var SX = { key: 'd7', from: sxD(-6), to: sxD(0), acct: '' };

  function sxStrip() {
    var R = sxRanges();
    var picks = [['tw', 'This week'], ['lw', 'Last week'], ['tm', 'This month'], ['lm', 'Last month']];
    var host = $('sxStrip');
    if (!host) { return; }
    host.innerHTML = picks.map(function (p) {
      return '<div class="sx-mini"><span class="l">' + p[1] + ' — actual profit</span><b id="sxStrip_' + p[0] + '">…</b><span class="s" id="sxStripS_' + p[0] + '"></span></div>';
    }).join('');
    picks.forEach(function (p) {
      truthPage({ from: R[p[0]].from, to: R[p[0]].to }).then(function (d) {
        var el = $('sxStrip_' + p[0]);
        if (!el) { return; }
        var M = d.metrics;
        var ap = (M.ACTUAL_AFTER_RETURNS || M.ACTUAL_PROFIT).value;
        el.textContent = sxK(ap);
        var s = $('sxStripS_' + p[0]);
        if (s) { s.textContent = 'sold ' + sxK(M.SOLD_SHEET.value) + ' · VAT ' + sxK(M.VAT_TO_HMRC.value); }
      }).catch(function () { var el = $('sxStrip_' + p[0]); if (el) { el.textContent = '—'; } });
    });
  }

  function sxLoad() {
    var body = $('sxBody');
    if (!body) { return; }
    body.innerHTML = '<div class="spinner"></div>';
    var scope = { from: SX.from, to: SX.to };
    if (SX.acct) { scope.account = SX.acct; }
    truthPage(scope).then(function (d) {
      if (!$('sxBody')) { return; }
      var M = d.metrics;
      var byA = M.MONEY_BY_ACCOUNT.value || {};
      var mine = SX.acct ? (byA[SX.acct] || {}) : null;
      var v = function (all, mineKey) { return mine ? (mine[mineKey] || 0) : all; };
      var sold = v(M.SOLD_SHEET.value, 'sold');
      var ap = mine ? (mine.actual_after_returns || 0) : (M.ACTUAL_AFTER_RETURNS || M.ACTUAL_PROFIT).value;
      var raw = v(M.ACTUAL_PROFIT.value, 'actual');
      var vat = v(M.VAT_TO_HMRC.value, 'vat');
      var ali = v(M.ALI_COST.value, 'ali');
      var ads = mine ? (mine.ads_incl_vat || 0) : (M.ADS_INCL_VAT_BOOKS ? M.ADS_INCL_VAT_BOOKS.value : 0);
      var ret = mine ? (mine.returns || 0) : (M.RETURNS_BOOKS ? M.RETURNS_BOOKS.value : 0);
      var margin = sold > 0 ? Math.round(ap / sold * 1000) / 10 : null;
      var tile = function (l, val, s2) { return '<div class="sx-tile"><span class="l">' + l + '</span><div class="v">' + val + '</div><span class="s">' + s2 + '</span></div>'; };

      /* the owner's law (2 Sept): headline UP TO DATE — books for filled days, the API through
         the books' own ratios for days staff have not written yet. Account filter honoured via
         the per-day blended series. */
      var upDays = sxMergeDaysUp(M, SX.acct);
      var liveDays = upDays.filter(function (x) { return x.live; }).length;
      if (liveDays > 0) {
        var uS = 0, uA = 0, uV = 0, uL = 0, uAds = 0, uR = 0;
        upDays.forEach(function (x) { uS += x.sold; uA += x.ap; uV += x.vat; uL += x.ali; uAds += x.ads; uR += x.ret; });
        var upPill = ' <span class="pill" style="background:rgba(80,160,255,.14);color:var(--blue-2);font-weight:800">LIVE · ' + liveDays + ' day' + (liveDays === 1 ? '' : 's') + ' filling</span>';
        var h = '<div class="sx-tiles">' +
          tile('Sold — up to date', sxGBP(uS), 'books ' + sxGBP(sold) + ' + eBay API for unwritten days' + upPill) +
          tile('Actual profit — up to date', sxGBP(uA), 'books ' + sxGBP(ap) + " · unwritten days via the books' own ratios") +
          tile('VAT to HMRC — up to date', sxGBP(uV), 'books ' + sxGBP(vat) + mChip(M.VAT_TO_HMRC)) +
          tile('AliExpress', sxGBP(uL), 'books ' + sxGBP(ali)) +
          tile('Ads incl VAT', sxGBP(uAds), 'books ' + sxGBP(ads) + ' · live days from the ads feed') +
          tile('Returns', sxGBP(uR), 'books ' + sxGBP(ret) + ' · live days = API refunds') +
          tile('Margin', uS > 0 ? (Math.round(uA / uS * 1000) / 10) + '%' : '—', 'actual ÷ sold, up to date') +
          '</div>';
      } else {
        var h = '<div class="sx-tiles">' +
        tile('Sold', sxGBP(sold), "'Total Sales/Sold For' " + mChip(M.SOLD_SHEET)) +
        tile('Actual profit', sxGBP(ap), "'Actual Profit' — raw " + sxGBP(raw) + ' − returns ' + sxGBP(ret)) +
        tile('VAT to HMRC', sxGBP(vat), "'VAT to HMRC' " + mChip(M.VAT_TO_HMRC)) +
        tile('AliExpress', sxGBP(ali), "'Total AliExpress Cost incl VAT'") +
        tile('Ads incl VAT', sxGBP(ads), "'Total Priority' + 'General Fees' incl VAT") +
        tile('Returns', sxGBP(ret), "'Returns'") +
        tile('Margin', margin == null ? '—' : margin + '%', 'actual ÷ sold') +
        '</div>';
      }
      h += sxCoverageNote(d, SX.from, SX.to);

      var days = upDays;
      h += '<div class="card" style="margin-top:12px"><div class="hd">Sales vs Actual Profit — day by day <span class="hint">the report sheet’s own chart, from the day tabs</span></div><div class="bd">' + sxChartSoldActual(days) + '</div></div>';
      h += '<div class="card" style="margin-top:14px"><div class="hd">Where the money leaks — ads &amp; returns <span class="hint">‘Total Priority incl VAT’ + ‘General Fees incl VAT’ · ‘Returns’</span></div><div class="bd">' + sxChartLeaks(days) + '</div></div>';

      /* per-account ledger for the range */
      var accts = Object.keys(byA).sort();
      h += '<div class="card" style="margin-top:14px"><div class="hd">The ledger — per account <span class="hint">' + esc(SX.from) + ' → ' + esc(SX.to) + ' · every column is the sheet’s own</span></div><div class="bd"><div class="scroll"><table class="sx-tbl"><thead><tr>' +
        '<th>Account</th><th>Rows</th><th>Sold</th><th>AliExpress</th><th>Ads incl VAT</th><th>Returns</th><th>VAT to HMRC</th><th>Raw profit</th><th>Actual profit</th><th>Margin</th></tr></thead><tbody>';
      var T2 = { rows: 0, sold: 0, ali: 0, ads: 0, ret: 0, vat: 0, raw: 0, ap: 0 };
      accts.forEach(function (a) {
        if (SX.acct && a !== SX.acct) { return; }
        var b = byA[a];
        T2.rows += b.rows; T2.sold += b.sold; T2.ali += b.ali; T2.ads += (b.ads_incl_vat || 0); T2.ret += (b.returns || 0); T2.vat += b.vat; T2.raw += b.actual; T2.ap += (b.actual_after_returns || 0);
        h += '<tr><td>' + esc(a) + '</td><td>' + b.rows + '</td><td>' + sxGBP(b.sold) + '</td><td>' + sxGBP(b.ali) + '</td><td>' + sxGBP(b.ads_incl_vat) + '</td><td>' + sxGBP(b.returns) + '</td><td>' + sxGBP(b.vat) + '</td><td>' + sxGBP(b.actual) + '</td><td style="font-weight:800;color:var(--' + ((b.actual_after_returns || 0) < 0 ? 'bad' : 'ok') + ')">' + sxGBP(b.actual_after_returns) + '</td><td>' + (b.sold > 0 ? Math.round((b.actual_after_returns || 0) / b.sold * 1000) / 10 + '%' : '—') + '</td></tr>';
      });
      h += '<tr class="tot"><td>ALL</td><td>' + T2.rows + '</td><td>' + sxGBP(T2.sold) + '</td><td>' + sxGBP(T2.ali) + '</td><td>' + sxGBP(T2.ads) + '</td><td>' + sxGBP(T2.ret) + '</td><td>' + sxGBP(T2.vat) + '</td><td>' + sxGBP(T2.raw) + '</td><td style="font-weight:800">' + sxGBP(T2.ap) + '</td><td>' + (T2.sold > 0 ? Math.round(T2.ap / T2.sold * 1000) / 10 + '%' : '—') + '</td></tr>' +
        '</tbody></table></div></div></div>';

      h += '<div class="card" style="margin-top:14px"><div class="hd">Item-by-item P&amp;L <span class="hint">the day rows grouped by Item Title — losses first</span>' +
        '<button class="minibtn" id="sxItemsBest" style="margin-left:auto">Best first</button><button class="minibtn" id="sxItemsLoss">Losses first</button></div>' +
        '<div class="bd" id="sxItems"><div class="spinner"></div></div></div>';
      body.innerHTML = h;
      var loadItems = function (order) {
        var box = $('sxItems');
        if (!box) { return; }
        box.innerHTML = '<div class="spinner"></div>';
        api('sheetItems', { from: SX.from, to: SX.to, account: SX.acct || '', order: order }).then(function (r) {
          if (!$('sxItems')) { return; }
          if (!(r.items || []).length) { box.innerHTML = '<div class="alx-empty">No book rows in this range yet.</div>'; return; }
          box.innerHTML = '<div class="scroll"><table class="sx-tbl"><thead><tr><th>Item</th><th>Qty</th><th>Sold</th><th>Ali</th><th>Ads</th><th>Returns</th><th>Actual</th></tr></thead><tbody>' +
            r.items.slice(0, 60).map(function (it) {
              return '<tr><td style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(it.title) + ' · ' + esc(it.accounts) + '">' + esc(it.title) + '</td>' +
                '<td>' + it.qty + '</td><td>' + sxGBP(it.sold) + '</td><td>' + sxGBP(it.ali) + '</td><td>' + sxGBP(it.ads) + '</td><td>' + sxGBP(it.returns) + '</td>' +
                '<td style="font-weight:800;color:var(--' + (it.actual < 0 ? 'bad' : 'ok') + ')">' + sxGBP(it.actual) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<p class="sx-note">' + r.n + ' distinct item(s) in the range · showing 60.</p>';
        }).catch(function (e) { if ($('sxItems')) { box.innerHTML = '<div class="alx-empty">' + esc(e.message) + '</div>'; } });
      };
      loadItems('losses');
      var bb = $('sxItemsBest'), bl = $('sxItemsLoss');
      if (bb) { bb.onclick = function () { loadItems('best'); }; }
      if (bl) { bl.onclick = function () { loadItems('losses'); }; }
    }).catch(function (e) {
      body.innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>';
    });
  }

  VIEWS.dashboard = {
    label: 'Sales analysis',
    icon: '<path d="M3 3v18h18"/><path d="M7 14l4-5 4 3 5-7"/>',
    roles: ['Management', 'Ops Head'],
    order: 2.8,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Sales <span class="goldtext">analysis</span></h1>' +
        '<span class="sub">every number is the Sales Analysis sheets’ own column — nothing else</span>' +
        '<select class="alx-sel" id="sxAcct" style="margin-left:auto"><option value="">All accounts</option></select>' +
        '<button class="minibtn" id="sxRefresh">Refresh</button></div>' +
        sxBarHtml('sx', SX.key) +
        '<div class="sx-strip" id="sxStrip"></div>' +
        '<div id="sxBody"><div class="spinner"></div></div>';
    },
    init: function () {
      fillAccountSelect($('sxAcct'), SX.acct, function () { SX.acct = $('sxAcct').value; sxLoad(); });
      sxWireBar('sx', function (f, t, k) { SX.from = f; SX.to = t; SX.key = k; sxLoad(); });
      var rf = $('sxRefresh');
      if (rf) { rf.onclick = function () { TRUTH_CACHE = {}; sxStrip(); sxLoad(); }; }
      sxStrip();
      sxLoad();
    }
  };

  /* ————————————— VAT BREAKDOWN ————————————— */
  var VX = { key: 'tm', from: sxD(0).slice(0, 8) + '01', to: sxD(0), acct: '' };

  function vxLoad() {
    var body = $('vxBody');
    if (!body) { return; }
    body.innerHTML = '<div class="spinner"></div>';
    truthPage({ from: VX.from, to: VX.to }).then(function (d) {
      if (!$('vxBody')) { return; }
      var byA = d.metrics.MONEY_BY_ACCOUNT.value || {};
      var accts = Object.keys(byA).sort();
      var T2 = { sold: 0, sale: 0, fvf: 0, ali: 0, pri: 0, gen: 0, vat: 0 };
      var rows = '';
      accts.forEach(function (a) {
        if (VX.acct && a !== VX.acct) { return; }
        var b = byA[a], p = b.vat_parts || {};
        T2.sold += b.sold; T2.sale += (p.sale || 0); T2.fvf += (p.fvf || 0); T2.ali += (p.ali || 0); T2.pri += (p.pri20 || 0); T2.gen += (p.gen20 || 0); T2.vat += b.vat;
        rows += '<tr><td>' + esc(a) + '</td><td>' + sxGBP(b.sold) + '</td><td>' + sxGBP(p.sale) + '</td><td>' + sxGBP(p.fvf) + '</td><td>' + sxGBP(p.ali) + '</td><td>' + sxGBP(p.pri20) + '</td><td>' + sxGBP(p.gen20) + '</td><td style="font-weight:800;color:var(--gold)">' + sxGBP(b.vat) + '</td></tr>';
      });
      var h = '<div class="card"><div class="hd">VAT to pay — ' + esc(VX.from) + ' → ' + esc(VX.to) +
        '<span class="hint">‘VAT to HMRC’ = Sale HMRC VAT − FVF&amp;Reg VAT − AliExpress VAT − Priority 20% − General −20% — the sheet’s own columns, checked per row every 15 min</span></div>' +
        '<div class="bd"><div class="scroll"><table class="sx-tbl"><thead><tr>' +
        '<th>Account</th><th>Sold</th><th>Sale HMRC VAT</th><th>FVF &amp; Reg VAT paid</th><th>AliExpress VAT paid</th><th>Priority +20%</th><th>General −20%</th><th>VAT to pay</th></tr></thead><tbody>' +
        rows +
        '<tr class="tot"><td>ALL ACCOUNTS</td><td>' + sxGBP(T2.sold) + '</td><td>' + sxGBP(T2.sale) + '</td><td>' + sxGBP(T2.fvf) + '</td><td>' + sxGBP(T2.ali) + '</td><td>' + sxGBP(T2.pri) + '</td><td>' + sxGBP(T2.gen) + '</td><td style="color:var(--gold)">' + sxGBP(T2.vat) + '</td></tr>' +
        '</tbody></table></div>' +
        '<p class="sx-note">Check: ' + sxGBP(T2.sale) + ' − ' + sxGBP(T2.fvf) + ' − ' + sxGBP(T2.ali) + ' − ' + sxGBP(T2.pri) + ' − ' + sxGBP(T2.gen) + ' = ' + sxGBP(T2.sale - T2.fvf - T2.ali - T2.pri - T2.gen) + ' (column sum ' + sxGBP(T2.vat) + ') ' + mChip(d.metrics.VAT_TO_HMRC) + '</p>' +
        '</div></div>';
      h += sxCoverageNote(d, VX.from, VX.to);

      /* per-day VAT table for the range */
      var days = sxMergeDays(byA, VX.acct);
      if (days.length) {
        h += '<div class="card" style="margin-top:14px"><div class="hd">VAT per day</div><div class="bd"><div class="scroll"><table class="sx-tbl" style="min-width:420px"><thead><tr><th>Day</th><th>Sold</th><th>VAT to HMRC</th><th>Rows</th></tr></thead><tbody>' +
          days.slice().reverse().map(function (r) { return '<tr><td>' + esc(r.day) + '</td><td>' + sxGBP(r.sold) + '</td><td>' + sxGBP(r.vat) + '</td><td>' + r.rows + '</td></tr>'; }).join('') +
          '</tbody></table></div></div></div>';
      }
      body.innerHTML = h;
    }).catch(function (e) { body.innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>'; });
  }

  VIEWS.vatBreakdown = {
    label: 'VAT breakdown',
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h4"/>',
    roles: ['Management', 'Ops Head'],
    order: 9.8,
    render: function () {
      return '<div class="hgroup enter d1"><h1>VAT <span class="goldtext">breakdown</span></h1>' +
        '<span class="sub">the Sales Analysis sheets’ own VAT columns — no portal formula anywhere</span>' +
        '<select class="alx-sel" id="vxAcct" style="margin-left:auto"><option value="">All accounts</option></select></div>' +
        sxBarHtml('vx', VX.key) +
        '<div id="vxBody"><div class="spinner"></div></div>';
    },
    init: function () {
      fillAccountSelect($('vxAcct'), VX.acct, function () { VX.acct = $('vxAcct').value; vxLoad(); });
      sxWireBar('vx', function (f, t, k) { VX.from = f; VX.to = t; VX.key = k; vxLoad(); });
      vxLoad();
    }
  };

  /* ————————————— DAILY REPORT ————————————— */
  var DX = { day: sxD(-1) };

  function dxLoad() {
    var body = $('dxBody');
    if (!body) { return; }
    body.innerHTML = '<div class="spinner"></div>';
    var lbl = $('dxDayLbl');
    if (lbl) { lbl.textContent = DX.day; }
    truthPage({ from: DX.day, to: DX.day }).then(function (d) {
      if (!$('dxBody')) { return; }
      var byA = d.metrics.MONEY_BY_ACCOUNT.value || {};
      var accts = Object.keys(byA).sort();
      var T2 = { rows: 0, sold: 0, ali: 0, ads: 0, ret: 0, vat: 0, raw: 0, ap: 0 };
      var rows = '';
      accts.forEach(function (a) {
        var b = byA[a];
        T2.rows += b.rows; T2.sold += b.sold; T2.ali += b.ali; T2.ads += (b.ads_incl_vat || 0); T2.ret += (b.returns || 0); T2.vat += b.vat; T2.raw += b.actual; T2.ap += (b.actual_after_returns || 0);
        rows += '<tr><td>' + esc(a) + '</td><td>' + b.rows + '</td><td>' + sxGBP(b.sold) + '</td><td>' + sxGBP(b.ali) + '</td><td>' + sxGBP(b.ads_incl_vat) + '</td><td>' + sxGBP(b.returns) + '</td><td>' + sxGBP(b.vat) + '</td><td>' + sxGBP(b.actual) + '</td><td style="font-weight:800;color:var(--' + ((b.actual_after_returns || 0) < 0 ? 'bad' : 'ok') + ')">' + sxGBP(b.actual_after_returns) + '</td></tr>';
      });
      var h;
      if (!accts.length) {
        h = '<div class="alx-empty">No book rows for ' + esc(DX.day) + ' — that day’s tab has not been written yet. Nothing is invented in its place.</div>';
      } else {
        h = '<div class="card"><div class="hd">' + esc(DX.day) + ' — every account, the day tab’s own columns</div><div class="bd"><div class="scroll"><table class="sx-tbl"><thead><tr>' +
          '<th>Account</th><th>Rows</th><th>Sold</th><th>AliExpress</th><th>Ads incl VAT</th><th>Returns</th><th>VAT to HMRC</th><th>Raw profit</th><th>Actual profit</th></tr></thead><tbody>' + rows +
          '<tr class="tot"><td>ALL</td><td>' + T2.rows + '</td><td>' + sxGBP(T2.sold) + '</td><td>' + sxGBP(T2.ali) + '</td><td>' + sxGBP(T2.ads) + '</td><td>' + sxGBP(T2.ret) + '</td><td>' + sxGBP(T2.vat) + '</td><td>' + sxGBP(T2.raw) + '</td><td>' + sxGBP(T2.ap) + '</td></tr>' +
          '</tbody></table></div>' +
          '<p class="sx-note">Raw Profit = True Order Earning − VAT to HMRC · Actual Profit = Raw − Returns — both are the sheet’s own columns, verified per row ' + mChip(d.metrics.ACTUAL_PROFIT) + '</p></div></div>';
      }
      /* 14-day actual-profit trend ending on the chosen day */
      truthPage({ from: sxShift(DX.day, -13), to: DX.day }).then(function (d2) {
        if (!$('dxBody')) { return; }
        var days = sxMergeDaysUp(d2.metrics, '');
        var trend = '<div class="card" style="margin-top:14px"><div class="hd">Actual profit — 14 days to ' + esc(DX.day) + '</div><div class="bd">' + sxChartSoldActual(days) + '</div></div>';
        body.innerHTML = h + trend;
      }).catch(function () { body.innerHTML = h; });
    }).catch(function (e) { body.innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>'; });
  }

  VIEWS.dailyReport = {
    label: 'Daily report',
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    roles: ['Management', 'Ops Head'],
    order: 9,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Daily <span class="goldtext">report</span></h1>' +
        '<span class="sub">one day, every account — straight from that day’s tabs</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px;align-items:center">' +
        '<button class="minibtn" id="dxPrev">←</button>' +
        '<b id="dxDayLbl" style="font-size:12.5px;font-variant-numeric:tabular-nums">' + esc(DX.day) + '</b>' +
        '<button class="minibtn" id="dxNext">→</button>' +
        '<input type="date" id="dxPick" value="' + esc(DX.day) + '">' +
        '</span></div>' +
        '<div id="dxBody"><div class="spinner"></div></div>';
    },
    init: function () {
      var pv = $('dxPrev'), nx = $('dxNext'), pk = $('dxPick');
      if (pv) { pv.onclick = function () { DX.day = sxShift(DX.day, -1); if (pk) { pk.value = DX.day; } dxLoad(); }; }
      if (nx) { nx.onclick = function () { DX.day = sxShift(DX.day, 1); if (pk) { pk.value = DX.day; } dxLoad(); }; }
      if (pk) { pk.onchange = function () { if (this.value) { DX.day = this.value; dxLoad(); } }; }
      dxLoad();
    }
  };
})();
