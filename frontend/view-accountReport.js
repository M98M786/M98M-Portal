/* view-accountReport.js — the Daily Account Report workbook as its own READING desk
 * (Hasib's walkthrough ask: "where is account daily report?"). The Alerts centre keeps the
 * alarm workflow; this screen shows the report rows themselves, headers verbatim, newest
 * first. Feed: v19's accountReportRows (bridge read, §4.3 dashboard roles). */
(function () {

  VIEW_CSS.push(
    '.ar-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:860px}' +
    '.ar-tbl th{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);text-align:left;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ar-tbl td{padding:8px 10px;border-bottom:1px solid var(--gold-line);vertical-align:top;max-width:340px;word-break:break-word}' +
    '.ar-tbl tbody tr:hover{background:var(--blue-soft)}'
  );

  /* The workbook reads metrics-down-the-side; a row-per-entry table is the same data turned
     ninety degrees, and to anyone who lives in that sheet it looks 'transposed'. Both
     orientations are kept and one Flip button swaps them — the reader chooses the one that
     matches the paper in their head. */
  var AR = { data: null, mode: 'daily', modeSet: false, acc: '' };
  function arMgmt() { var r = (STATE.user && STATE.user.role) || ''; return r === 'Management' || r === 'Ops Head' || (STATE.user && STATE.user.super); }   // daily → workbook → list, one button cycles

  /* The bridge keys each cell by its header ONLY when the header is non-blank and not already
     claimed; duplicates and blank headers land under 'col:<letter>' (SheetBridge's own rule,
     mirrored here byte for byte). Raw-header lookup made duplicate-named columns repeat the
     first column's value and blank-header columns render empty. */
  function arColLetter(n) {
    var out = '';
    while (n > 0) { var r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
    return out;
  }
  function arKeys(heads) {
    var norm = function (h) { return String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    var seen = {}, keys = [];
    heads.forEach(function (h, c) {
      var key = norm(h) ? String(h) : 'col:' + arColLetter(c + 1);
      if (seen[key]) { key = 'col:' + arColLetter(c + 1); }
      seen[key] = true;
      keys.push(key);
    });
    return keys;
  }

  /* Night review 2, verbatim: "account report required data of each day with proper
     calculation, and this is probably the worst representation ever." The default is now a
     DAY-KEYED dashboard: the date column is detected from the data, every numeric metric is
     formatted, and a 7-day-vs-prior-7 summary leads. The workbook orientation and the raw
     list survive behind the same button. */
  function arDaily(r, heads, keys, rows, cell) {
    // 1) find the date column: the key whose values look like dates most often
    var best = 0, bestHits = -1;
    keys.forEach(function (k, i) {
      var hits = 0;
      rows.forEach(function (row) {
        if (/^\d{4}-\d{2}-\d{2}/.test(String(row[k] == null ? '' : row[k]).trim())) { hits++; }
      });
      if (hits > bestHits) { bestHits = hits; best = i; }
    });
    if (bestHits < 2) { return null; }                       // no date column → fall back
    var dateKey = keys[best];
    // 2) day rows only, newest first
    var days = rows.filter(function (row) { return /^\d{4}-\d{2}-\d{2}/.test(String(row[dateKey] || '').trim()); });
    days.sort(function (x, y) { return String(y[dateKey]) < String(x[dateKey]) ? -1 : 1; });
    if (!days.length) { return null; }
    // 3) numeric metric columns (most non-empty values parse as numbers)
    var metrics = [];
    keys.forEach(function (k, i) {
      if (i === best) { return; }
      var num = 0, filled = 0;
      days.forEach(function (row) {
        var v = String(row[k] == null ? '' : row[k]).trim();
        if (v !== '') { filled++; if (isFinite(parseFloat(v.replace(/[£,%]/g, '')))) { num++; } }
      });
      if (filled >= 3 && num / filled >= 0.7) { metrics.push({ k: k, label: String(heads[i] || k), filled: filled }); }
    });
    metrics = metrics.slice(0, 14);
    if (!metrics.length) { return null; }
    var numOf = function (row, k) { var v = parseFloat(String(row[k] == null ? '' : row[k]).replace(/[£,%]/g, '')); return isFinite(v) ? v : null; };
    var fmt = function (v) {
      if (v == null) { return '—'; }
      if (Math.abs(v) > 0 && Math.abs(v) < 1) { return (Math.round(v * 1000) / 10) + '%'; }   // 0-1 ratios read as percent
      return String(Math.round(v * 100) / 100);
    };
    // 4) 7-day averages vs the prior 7
    var avg = function (list, k) {
      var vals = list.map(function (row) { return numOf(row, k); }).filter(function (v) { return v != null; });
      if (!vals.length) { return null; }
      return vals.reduce(function (a2, b2) { return a2 + b2; }, 0) / vals.length;
    };
    var w1 = days.slice(0, 7), w0 = days.slice(7, 14);
    var strip = '<div class="al-mini" style="margin-bottom:14px">' + metrics.slice(0, 8).map(function (m) {
      var c = avg(w1, m.k), p = avg(w0, m.k);
      var d = (c != null && p) ? Math.round((c - p) / Math.abs(p) * 100) : null;
      return '<div class="al-m-k">' + esc(m.label.slice(0, 26)) + ' · 7d avg</div>' +
        '<div class="al-m-v num">' + esc(fmt(c)) +
        (d == null ? '' : ' <span style="font-size:10px;color:var(--' + (d >= 0 ? 'ok' : 'bad') + ')">' + (d >= 0 ? '▲' : '▼') + Math.abs(d) + '%</span>') + '</div>';
    }).join('') + '</div>';
    // 5) the day table, newest 14
    var h2 = strip + '<div class="scroll"><table class="ar-tbl"><thead><tr><th>Day</th>' +
      metrics.map(function (m) { return '<th>' + esc(m.label.slice(0, 24)) + '</th>'; }).join('') + '</tr></thead><tbody>';
    days.slice(0, 14).forEach(function (row) {
      h2 += '<tr><td style="font-weight:800;white-space:nowrap">' + esc(String(row[dateKey]).slice(0, 10)) + '</td>' +
        metrics.map(function (m) { return '<td style="text-align:right;font-variant-numeric:tabular-nums">' + esc(fmt(numOf(row, m.k))) + '</td>'; }).join('') + '</tr>';
    });
    h2 += '</tbody></table></div>';
    if (days.length > 14) { h2 += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:4px">Newest 14 of ' + days.length + ' days — the other views show everything.</p>'; }
    return h2;
  }

  function arRender() {
    var host = $('arBody');
    var r = AR.data;
    if (!host || !r) { return; }
    var heads = r.headers || [];
    var keys = arKeys(heads);
    var rows = r.rows || [];
    var cell = function (row, i) { var v = row[keys[i]]; return v == null ? '' : String(v); };
    var h;
    if (AR.mode === 'engine') {
      /* 30 Aug (owner): "no concept of its update, no presentation of data and graph — use the
         brain of the account report sheet and develop your own brain." The ENGINE REPORT tab's
         own shape, served live from D1 (accountReport2): 30-day summary tiles, the sheet-style
         day-by-day graph, the leak bars, the top products, then the day table. Auto-refreshes
         with a visible stamp. */
      h = '<div id="arEngine"><div class="spinner"></div></div>';
      setTimeout(function () { arEngine2(); }, 0);
    }
    if (AR.mode === 'daily') {
      h = arDaily(r, heads, keys, rows, cell);
      if (h == null) { AR.mode = 'workbook'; }               // no date column — show the workbook view
    }
    if (AR.mode === 'workbook') {
      // metrics down the side (the workbook's own orientation), newest entries as columns
      var take = rows.slice(0, 10);
      h = '<div class="scroll"><table class="ar-tbl"><thead><tr><th></th>' +
        take.map(function (row, i) { return '<th>' + esc(cell(row, 0) || 'entry ' + (i + 1)) + '</th>'; }).join('') +
        '</tr></thead><tbody>';
      heads.slice(1).forEach(function (x, j) {
        h += '<tr><td style="font-weight:800;white-space:nowrap">' + esc(String(x)) + '</td>' +
          take.map(function (row) { return '<td>' + esc(cell(row, j + 1)) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody></table></div>';
      if (rows.length > 10) { h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:4px">Showing the newest 10 of ' + rows.length + ' — flip to the list to see them all.</p>'; }
    }
    if (AR.mode === 'list') {
      h = '<div class="scroll"><table class="ar-tbl"><thead><tr>' +
        heads.map(function (x) { return '<th>' + esc(String(x)) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (row) {
        h += '<tr>' + heads.map(function (x, i) { return '<td>' + esc(cell(row, i)) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody></table></div>';
    }
    host.innerHTML = h +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">Newest first · read straight from "' + esc(String(r.tab || '')) + '" · resolving alarms stays on the Alerts centre.</p>';
    var flipBtn = $('arFlip');
    if (flipBtn) {
      flipBtn.style.display = '';
      flipBtn.textContent = AR.mode === 'engine' ? 'Show the workbook daily view' : AR.mode === 'daily' ? 'Show like the workbook' : AR.mode === 'workbook' ? 'Show as a list' : (arMgmt() ? 'Show the ENGINE books' : 'Show the daily dashboard');
    }
  }

  function arLoad() {
    var acc = $('arAcc') ? $('arAcc').value : '';
    AR.acc = acc;   // hold it: the engine table must not depend on the live DOM value, which can be blank by the time its async filter runs
    if (!AR.modeSet && arMgmt()) { AR.mode = 'engine'; AR.modeSet = true; }
    var host = $('arBody');
    if (!host) { return; }
    /* Switching accounts clears the held data FIRST: without this, the Flip button repainted the
       previous account's whole table over the new account's error message — or over its spinner —
       while the selector named someone else. */
    AR.data = null;
    var flipBtn = $('arFlip');
    if (flipBtn) { flipBtn.style.display = 'none'; }
    if (!acc) { host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Choose an account to open its report.</div>'; return; }
    host.innerHTML = '<div class="spinner"></div>';
    /* Engine mode reads the D1 books (dailyReport), which exist for EVERY account - so it must not
       be gated on the sheet-based accountReportRows. That gate is why Sir Hasib, whose Daily Account
       Report workbook does not exist, saw "not connected yet" even though the engine has all his
       figures. In engine mode render straight from D1; the workbook is only needed for list mode. */
    if (AR.mode === 'engine' && arMgmt()) {
      AR.data = { headers: [], rows: [] };   // engine mode paints from dailyReport, not from this
      arRender();
      return;
    }
    api('accountReportRows', { account: acc }).then(function (r) {
      if (!r || r.ok === false) {
        host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' + esc(String((r && r.reason) || 'Could not read it.')) +
          '<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">"not connected yet" means this account\'s Daily Account Report workbook is missing from CONNECTIONS.</span></div>';
        return;
      }
      AR.data = r;
      arRender();
    }).catch(function (e) {
      host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' + esc(e.message) + '</div>';
    });
  }

  function arG(v) { return '\u00a3' + (Number(v) || 0).toFixed(2); }

  /* Tiny dependency-free SVG line chart: sold (blue) vs actual (green), the sheet's own
     "Sales vs Actual Profit \u2014 day by day". */
  function arLineChart(days) {
    var list = days.slice().reverse();                       // oldest first
    if (list.length < 2) { return ''; }
    var W = 720, H = 190, P = 34;
    var max = 0;
    list.forEach(function (r) { max = Math.max(max, Number(r.sold) || 0); });
    if (!(max > 0)) { return ''; }
    var x = function (i) { return P + (W - P - 8) * (i / (list.length - 1)); };
    var y = function (v) { return H - 22 - (H - 40) * (v / max); };
    var path = function (key) {
      return list.map(function (r, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(Math.max(0, Number(r[key]) || 0)).toFixed(1); }).join(' ');
    };
    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var gy = H - 22 - (H - 40) * (g / 4);
      grid += '<line x1="' + P + '" y1="' + gy + '" x2="' + (W - 8) + '" y2="' + gy + '" stroke="var(--gold-line)" stroke-dasharray="3 5"/>' +
        '<text x="' + (P - 4) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="var(--text-3)">' + Math.round(max * g / 4) + '</text>';
    }
    return '<div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:560px;width:100%;height:auto">' + grid +
      '<path d="' + path('sold') + '" fill="none" stroke="var(--blue)" stroke-width="2"/>' +
      '<path d="' + path('actual') + '" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
      '<text x="' + P + '" y="12" font-size="10" fill="var(--blue)" font-weight="800">\u25ac Sold</text>' +
      '<text x="' + (P + 60) + '" y="12" font-size="10" fill="var(--ok)" font-weight="800">\u25ac Actual profit</text>' +
      '</svg></div>';
  }

  /* "Where the money leaks" \u2014 per-day stacked bars: ads N (amber) + returns (red). */
  function arLeakChart(days) {
    var list = days.slice().reverse();
    if (list.length < 2) { return ''; }
    var W = 720, H = 150, P = 34;
    var max = 0;
    list.forEach(function (r) { max = Math.max(max, (Number(r.pri) || 0) * 1.2 + (Number(r.returns) || 0)); });
    if (!(max > 0)) { return ''; }
    var bw = Math.max(3, Math.floor((W - P - 10) / list.length) - 2);
    var bars = list.map(function (r, i) {
      var n = (Number(r.pri) || 0) * 1.2, ret = Number(r.returns) || 0;
      var hN = (H - 34) * (n / max), hR = (H - 34) * (ret / max);
      var bx = P + i * (bw + 2);
      return '<rect x="' + bx + '" y="' + (H - 18 - hN) + '" width="' + bw + '" height="' + hN.toFixed(1) + '" fill="var(--gold-b)" opacity="0.85"' + (Number(r.pri_est) ? ' stroke="var(--text-3)" stroke-dasharray="2 2"' : '') + '/>' +
             '<rect x="' + bx + '" y="' + (H - 18 - hN - hR) + '" width="' + bw + '" height="' + hR.toFixed(1) + '" fill="var(--bad)"/>';
    }).join('');
    return '<div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:560px;width:100%;height:auto">' + bars +
      '<text x="' + P + '" y="12" font-size="10" fill="var(--gold-b)" font-weight="800">\u25a0 Ads (N) incl VAT</text>' +
      '<text x="' + (P + 110) + '" y="12" font-size="10" fill="var(--bad)" font-weight="800">\u25a0 Returns</text>' +
      '<text x="' + (W - 10) + '" y="12" font-size="9" fill="var(--text-3)" text-anchor="end">dashed = estimate day</text>' +
      '</svg></div>';
  }

  function arEngine2() {
    var slot = $('arEngine');
    if (!slot) { return; }
    var want = AR.acc || ($('arAcc') && $('arAcc').value) || '';
    if (!want) { slot.innerHTML = '<div class="empty">Choose an account.</div>'; return; }
    api('accountReport2', { account: want }).then(function (d) {
      if (!$('arEngine')) { return; }
      var days = (d && d.days) || [];
      var sm = (d && d.summary) || {};
      var tiles = [
        ['Orders \u00b7 30d', String(Number(sm.n) || 0)],
        ['Units \u00b7 30d', String(Number(sm.units) || 0)],
        ['Revenue \u00b7 30d', arG(sm.revenue)],
        ['eBay fees \u00b7 30d', arG(sm.ebay_fees)],
        ['AliExpress \u00b7 30d', arG(sm.ali)],
        ['Refunded \u00b7 30d', arG(sm.refunded)]
      ].map(function (t2) {
        return '<div class="dr-kpi"><div class="l">' + esc(t2[0]) + '</div><div class="v">' + esc(t2[1]) + '</div></div>';
      }).join('');
      var top = (d && d.top) || [];
      var topH = top.length ? '<div class="hd" style="margin-top:14px">Top products \u00b7 30 days</div><div class="scroll"><table class="ar-tbl" style="min-width:560px"><thead><tr><th>Product</th><th style="text-align:right">Orders</th><th style="text-align:right">Units</th><th style="text-align:right">Revenue</th></tr></thead><tbody>' +
        top.map(function (t3) {
          return '<tr><td style="max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(String(t3.title || '')) + '">' + esc(String(t3.title || t3.item_id)) + '</td>' +
            '<td style="text-align:right">' + Number(t3.orders_n || 0) + '</td><td style="text-align:right">' + Number(t3.units || 0) + '</td>' +
            '<td style="text-align:right;font-weight:800">' + arG(t3.revenue) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '';
      var hh = '<div class="dr-kpis">' + tiles + '</div>' +
        '<div class="hd">Sales vs Actual profit \u2014 day by day</div>' + arLineChart(days) +
        '<div class="hd" style="margin-top:14px">Where the money leaks \u2014 ads and returns</div>' + arLeakChart(days) +
        topH +
        '<div class="hd" style="margin-top:14px">The day rows</div>' +
        '<div class="scroll"><table class="ar-tbl"><thead><tr>' +
        ['Day (UK)', 'Revenue', 'Order earning', 'Cost', 'Ads (N) incl VAT', 'Ad revenue', 'ROAS', 'T \u00b7 0.8 law', 'Returns', 'ACTUAL'].map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
      days.slice(0, 21).forEach(function (r0) {
        var n = (Number(r0.pri) || 0) * 1.2;
        var roas = n > 0.005 && Number(r0.ads_rev) ? (Number(r0.ads_rev) / n).toFixed(1) + '\u00d7' : '\u2014';
        hh += '<tr><td style="font-weight:800">' + esc(String(r0.date)) + (Number(r0.pri_est) ? ' \u23f3' : '') + '</td>' +
          '<td>' + arG(r0.sold) + '</td><td>' + arG(r0.oe) + '</td><td>' + arG(r0.cost) + '</td>' +
          '<td>' + (n ? arG(n) : '\u2014') + '</td><td>' + (Number(r0.ads_rev) ? arG(r0.ads_rev) : '\u2014') + '</td>' +
          '<td>' + roas + '</td><td>' + arG((Number(r0.actual) || 0) + (Number(r0.returns) || 0)) + '</td>' +
          '<td' + (Number(r0.returns) > 0 ? ' style="color:var(--bad)"' : '') + '>' + arG(r0.returns) + '</td>' +
          '<td style="font-weight:800;color:var(--' + (Number(r0.actual) < 0 ? 'bad' : 'ok') + ')">' + arG(r0.actual) + '</td></tr>';
      });
      hh += '</tbody></table></div>' +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">Live from the engine \u00b7 figures as at ' + esc(new Date().toLocaleTimeString()) + ' \u00b7 refreshes itself every 5 minutes \u00b7 \u23f3 = the CPC bill has not landed, an estimate stands in \u00b7 T = Actual + returns \u00b7 N = CPC \u00d7 1.2, the sheet\u2019s own column</p>';
      slot.innerHTML = hh;
      clearTimeout(AR.timer);
      AR.timer = setTimeout(function () { if ($('arEngine') && AR.mode === 'engine') { arEngine2(); } }, 300000);
    }).catch(function (e) {
      if ($('arEngine')) { $('arEngine').innerHTML = '<div class="empty">Engine books did not answer \u2014 ' + esc(e.message) + '</div>'; }
    });
  }

  VIEWS.accountReport = {
    label: 'Account report',
    order: 9.5,
    roles: ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'],
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><circle cx="17" cy="16" r="0.5"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">report</span></h1>' +
          '<span class="sub">each account\'s Daily Account Report workbook, as written · alarms resolve on the Alerts centre</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
            '<select class="alx-sel" id="arAcc"><option value="">Choose an account…</option></select>' +
            '<button class="minibtn" id="arGo">Open the report</button>' +
            '<button class="minibtn" id="arFlip" style="display:none">Show as a list</button></div>' +
          '<div id="arBody"><div style="color:var(--text-2);font-weight:700;padding:12px 0">Choose an account to open its report.</div></div>' +
        '</div></div>';
    },
    init: function () {
      cachedCall('accountList', {}, function (d) {
        var sel = $('arAcc');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">Choose an account…</option>' + (((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
        /* open on the first account at once — "choose an account" as a landing state read as
           "page not loading" (owner, 29 Aug) */
        if (!sel.value && sel.options.length > 1) { sel.selectedIndex = 1; arLoad(); }
      });
      var go = $('arGo');
      if (go) { go.onclick = arLoad; }
      var fl = $('arFlip');
      if (fl) { fl.onclick = function () { AR.mode = AR.mode === 'engine' ? 'daily' : AR.mode === 'daily' ? 'workbook' : AR.mode === 'workbook' ? 'list' : (arMgmt() ? 'engine' : 'daily'); arRender(); }; }
      var sel = $('arAcc');
      if (sel) { sel.onchange = arLoad; }
    }
  };
})();
