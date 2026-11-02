/* view-traffic.js — Hasib item 11: the account traffic dashboard, from eBay's own Traffic
 * Report. Per-account per-day series, 7/30-day totals, listing drilldown — his Seller Hub
 * traffic screen, inside the portal. */
(function () {

  var TR_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];
  var TR = { account: '', range: 7, mode: '', days: 0, from: '', to: '' };

  VIEW_CSS.push(
    '.tr-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px}' +
    '.tr-tile{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:var(--panel-2)}' +
    '.tr-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.tr-tile .v{font-size:24px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.tr-bars{display:flex;align-items:flex-end;gap:3px;height:120px;padding:8px 0 4px;box-sizing:border-box}' +
    '.tr-bar{flex:1;background:linear-gradient(180deg,var(--blue,#4f7cd9),var(--blue-2,#33549c));border-radius:3px 3px 0 0;min-width:6px;position:relative}' +
    '.tr-bar:hover{opacity:.85}' +
    '.tr-bar span{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:9px;color:var(--text-3);font-weight:700;white-space:nowrap;display:none}' +
    '.tr-bar.tr-part{background:repeating-linear-gradient(135deg,rgba(233,169,60,.42),rgba(233,169,60,.42) 5px,transparent 5px,transparent 10px);border:1px dashed rgba(233,169,60,.6)}' +
    '.tr-warn{margin:0 0 12px;padding:10px 13px;border-radius:10px;border:1px solid rgba(255,159,67,.45);background:var(--warn-soft);font-size:12.5px;font-weight:600;color:var(--text-2);line-height:1.55}' +
    '.tr-warn b{color:var(--warn)}' +
    '.tr-sofar{display:flex;gap:9px;flex-wrap:wrap;align-items:baseline;margin:-6px 0 14px;font-size:12px;font-weight:700;color:var(--text-3)}' +
    '.tr-sofar b{color:var(--text-2)}' +
    '.tr-bar:hover span{display:block}' +
    '.tr-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}' +
    '.tr-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.tr-tbl th:first-child{text-align:left}' +
    '.tr-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums}' +
    '.tr-tbl td:first-child{text-align:left;min-width:240px;white-space:normal}' +
    '.tr-vs{font-size:10px;font-weight:800;margin-top:4px;color:var(--text-3);white-space:nowrap}' +
    '.tr-vs.up{color:var(--ok)}.tr-vs.dn{color:var(--bad)}' +
    /* the month-ago level, drawn INSIDE the same bar — the owner asked for the comparison merged with the data, not beside it */
    '.tr-cmp{position:absolute;left:-2px;right:-2px;border-top:2px dashed rgba(255,255,255,.6);pointer-events:none}' +
    '.tr-cmp.tr-under{border-top-color:rgba(240,96,90,.85)}' +
    '.tr-hbars{display:flex;align-items:flex-end;gap:2px;height:104px;padding:8px 0 4px;box-sizing:border-box}' +
    '.tr-hb{flex:1;background:linear-gradient(180deg,var(--gold-a,#d4af37),rgba(212,175,55,.45));border-radius:3px 3px 0 0;min-width:4px;position:relative}' +
    '.tr-hb.now{outline:1px solid var(--gold-a)}' +
    '.tr-hb span{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:9px;color:var(--text-3);font-weight:700;white-space:nowrap;display:none;z-index:2}' +
    '.tr-hb:hover span{display:block}' +
    '.tr-hx{display:flex;gap:2px;font-size:8.5px;color:var(--text-3);font-weight:700}.tr-hx span{flex:1;text-align:center}'
  );

  function trN(v) { var n = Number(v) || 0; return n >= 1000000 ? (n / 1000000).toFixed(2) + 'M' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  /* 2 Nov (owner): "previous exact date last month same day comparison". One CALENDAR month back —
     2 Nov against 2 Oct — and the 31st steps back to the last day of a shorter month, never forward
     into the month after. The engine's monthBack uses the same rule, so the two always agree. */
  function trMonthBack(ymd) {
    var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) { return ''; }
    var y = Number(m[1]), mo = Number(m[2]) - 1, dd = Number(m[3]);
    if (mo < 1) { mo = 12; y--; }
    var last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(Math.min(dd, last)).padStart(2, '0');
  }
  /* the comparison, said in words under the figure it belongs to */
  function trVs(now, then, isPct) {
    if (then === null || then === undefined) { return '<div class="tr-vs">nothing stored a month back</div>'; }
    var a = Number(now) || 0, b = Number(then) || 0;
    if (!b) { return '<div class="tr-vs">a month back: 0</div>'; }
    var pct = (a - b) / b * 100, up = pct >= 0;
    return '<div class="tr-vs ' + (up ? 'up' : 'dn') + '">' + (up ? '\u25b2' : '\u25bc') + ' ' +
      Math.abs(pct).toFixed(1) + '% \u00b7 ' + (isPct ? b.toFixed(2) + '%' : trN(b)) + ' a month back</div>';
  }
  function trShift(ymd, n) {
    var t = Date.parse(String(ymd) + 'T12:00:00Z');
    return isFinite(t) ? new Date(t + n * 86400000).toISOString().slice(0, 10) : String(ymd);
  }

  /* 23 Sept (owner: "traffic page not working, it's stale"). Nothing was stale — trafficSync had
     run fourteen minutes earlier and all six accounts were current. eBay reports the CURRENT day
     many hours behind, and this screen presented that half-filled day as a finished one: 59.6k
     impressions against a normal Wednesday's ~325k, which reads as a collapse in traffic rather
     than as a day eBay has not finished counting. A day still filling is now named, kept out of
     the totals it would drag down, drawn hatched, and put beside the last full day for scale. */

  /* 2 Nov (owner): this page refreshes itself every 2 minutes. A quiet refresh keeps what is on
     screen while it fetches — no spinner, no flicker — so a figure only ever changes when a newer
     one has actually arrived. The stamp beside Refresh says when that last happened. */
  function trLoad(quiet) {
    var box = $('trBody');
    if (!box) { return; }
    if (!quiet) { box.innerHTML = '<div class="spinner"></div>'; }
    var payload = { range: TR.range };
    if (TR.account) { payload.account = TR.account; }
    if (TR.mode === 'today') { payload.from = trShift(ukToday(), -6); payload.to = ukToday(); }
    else if (TR.mode === 'yesterday') { payload.from = trShift(ukToday(), -7); payload.to = ukToday(); }
    else if ((TR.mode === 'custom' || TR.mode === 'days') && TR.from && TR.to) { payload.from = TR.from; payload.to = TR.to; }
    /* the 24-hour clock follows whichever single day is in focus */
    payload.hour_date = TR.mode === 'yesterday' ? trShift(ukToday(), -1) : ukToday();
    return api('trafficBoard', payload).then(function (d) {
      d = d || {};
      var stamp = $('trStamp');
      if (stamp) { stamp.textContent = 'updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · every 2 min'; }
      // fold per-account day rows into one series when "all accounts"
      var byDay = {};
      (d.days || []).forEach(function (r) {
        var k = r.date;
        var o = (byDay[k] = byDay[k] || { date: k, impressions: 0, views: 0, transactions: 0 });
        o.impressions += Number(r.impressions) || 0;
        o.views += Number(r.views) || 0;
        o.transactions += Number(r.transactions) || 0;
      });
      var series = Object.values(byDay).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var today = String(d.today || ukToday());
      var yday = trShift(today, -1);
      /* the same dates one month back, folded the same way, keyed by THEIR own date */
      var prevBy = {};
      (d.prev_days || []).forEach(function (r) {
        var o = (prevBy[r.date] = prevBy[r.date] || { date: r.date, impressions: 0, views: 0, transactions: 0 });
        o.impressions += Number(r.impressions) || 0;
        o.views += Number(r.views) || 0;
        o.transactions += Number(r.transactions) || 0;
      });
      var cmpOf = function (date) { return prevBy[trMonthBack(date)] || null; };
      var win;
      if (TR.mode === 'today') { win = series.filter(function (r) { return r.date === today; }); }
      else if (TR.mode === 'yesterday') { win = series.filter(function (r) { return r.date === yday; }); }
      else if (TR.mode === 'custom' || TR.mode === 'days') { win = series; }
      else { win = series.slice(-TR.range); }

      /* eBay finishes a day overnight, so only TODAY is ever unfinished. */
      var partial = null, settled = [];
      win.forEach(function (r) { if (r.date === today) { partial = r; } else { settled.push(r); } });
      var lastFull = null;
      series.forEach(function (r) { if (r.date !== today) { lastFull = r; } });

      // the tiles describe finished days; today gets its own line so it cannot drag them down
      var showing = (TR.mode === 'today') ? (partial ? [partial] : []) : settled;
      var winLbl = TR.mode === 'today' ? 'so far today'
        : TR.mode === 'yesterday' ? 'yesterday'
        : TR.mode === 'days' ? 'last ' + TR.days + ' days'
        : TR.mode === 'custom' ? (TR.from + ' \u2192 ' + TR.to)
        : (settled.length ? settled.length + ' full day' + (settled.length === 1 ? '' : 's') + ' to ' + settled[settled.length - 1].date.slice(5) : TR.range + 'd');
      var tot = { impressions: 0, views: 0, transactions: 0 };
      showing.forEach(function (r) { tot.impressions += r.impressions; tot.views += r.views; tot.transactions += r.transactions; });
      var ctr = tot.impressions ? (tot.views / tot.impressions * 100) : 0;
      var cvr = tot.views ? (tot.transactions / tot.views * 100) : 0;
      /* the same days one calendar month back, over exactly the dates being shown — so a 29-day
         window is compared with ITS own 29 days, never with "about a month" */
      var pTot = { impressions: 0, views: 0, transactions: 0 }, pDays = 0;
      showing.forEach(function (r) {
        var c = cmpOf(r.date);
        if (!c) { return; }
        pDays++; pTot.impressions += c.impressions; pTot.views += c.views; pTot.transactions += c.transactions;
      });
      var pCtr = pTot.impressions ? (pTot.views / pTot.impressions * 100) : 0;
      var pCvr = pTot.views ? (pTot.transactions / pTot.views * 100) : 0;
      /* TODAY IS HALF A DAY. Holding it against a finished day a month back would print a
         collapse every morning and a recovery every night — the very misreading the 23 Sept fix
         above exists to prevent. On a part-day the month-back figure is shown plainly, with no
         percentage, and says what it is. */
      var partialWindow = (TR.mode === 'today');
      var vs = function (now, then, isPct) {
        if (!pDays) { return '<div class="tr-vs">nothing stored a month back</div>'; }
        if (partialWindow) {
          return '<div class="tr-vs">that date a month back: ' + (isPct ? (Number(then) || 0).toFixed(2) + '%' : trN(then)) +
            ' <span style="color:var(--text-3)">(a whole day \u2014 today is still counting)</span></div>';
        }
        return trVs(now, then, isPct);
      };
      var cmpLbl = pDays ? (showing.length === 1 && showing[0] ? trMonthBack(showing[0].date) : (d.prev_from || '') + ' \u2192 ' + (d.prev_to || '')) : '';

      var h = '';
      if (TR.mode === 'today') {
        h += '<div class="tr-warn"><b>eBay has not finished reporting today.</b> These figures keep rising through the evening, so this is not a finished day and does not compare with the days below.' +
          (lastFull ? ' The last full day, ' + esc(lastFull.date.slice(5)) + ', finished on <b>' + trN(lastFull.impressions) + '</b> impressions, ' + trN(lastFull.views) + ' views and ' + lastFull.transactions + ' sold.' : '') + '</div>';
      } else if (partial) {
        h += '<div class="tr-warn">Today is still being counted by eBay, so it is left out of the totals below and drawn hatched in the chart.</div>';
      }
      h += '<div class="tr-tiles">' +
        '<div class="tr-tile"><div class="k">Impressions · ' + esc(winLbl) + '</div><div class="v">' + trN(tot.impressions) + '</div>' + vs(tot.impressions, pTot.impressions) + '</div>' +
        '<div class="tr-tile"><div class="k">Listing views</div><div class="v">' + trN(tot.views) + '</div>' + vs(tot.views, pTot.views) + '</div>' +
        '<div class="tr-tile"><div class="k">Transactions</div><div class="v">' + trN(tot.transactions) + '</div>' + vs(tot.transactions, pTot.transactions) + '</div>' +
        '<div class="tr-tile"><div class="k">CTR</div><div class="v">' + ctr.toFixed(2) + '%</div>' + vs(ctr, pCtr, true) + '</div>' +
        '<div class="tr-tile"><div class="k">Conversion</div><div class="v">' + cvr.toFixed(2) + '%</div>' + vs(cvr, pCvr, true) + '</div>' +
      '</div>' +
      (cmpLbl ? '<div class="tr-sofar" style="margin-top:-8px"><span>compared with the same date(s) a month back:</span><b>' + esc(cmpLbl) + '</b></div>' : '');

      if (partial && TR.mode !== 'today') {
        h += '<div class="tr-sofar"><span>So far today (' + esc(today.slice(5)) + ', still counting):</span>' +
          '<b>' + trN(partial.impressions) + '</b> impressions <b>' + trN(partial.views) + '</b> views <b>' + partial.transactions + '</b> sold</div>';
      }

      /* One lone bar tells a person nothing, so the Today view keeps the week behind it for
         scale and simply hatches the day eBay is still counting. */
      var chartDays = (TR.mode === 'today') ? series.slice(-7) : (TR.mode === 'yesterday' ? series.slice(-8) : win);
      /* the scale has to cover BOTH lines or the month-ago marker would sit off the top of its bar */
      var max = Math.max.apply(null, chartDays.map(function (r) {
        var c = cmpOf(r.date);
        return Math.max(r.impressions, c ? c.impressions : 0);
      }).concat([1]));
      h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin-bottom:2px">Impressions by day' +
        (TR.mode === 'today' ? ' · the week behind today' : '') +
        ' · <span style="color:var(--text-2)">dashed line = the same date a month back</span></div>' +
        '<div class="tr-bars">' + chartDays.map(function (r) {
          var isPart = r.date === today;
          var c = cmpOf(r.date);
          var hPct = Math.max(4, Math.round(r.impressions / max * 100));
          /* the marker belongs at (last month / max) of the CHART, but it lives inside a bar that
             is hPct of that chart — so its offset within the bar is the ratio of the two. Doing it
             as last/now would overshoot the chart whenever the 4% minimum height kicked in. */
          var mark = '';
          if (c) {
            var within = Math.round(c.impressions / max * 100 / hPct * 100);
            mark = '<i class="tr-cmp' + (c.impressions > r.impressions ? ' tr-under' : '') + '" style="bottom:' + Math.max(0, Math.min(10000, within)) + '%"></i>';
          }
          /* same rule in the tooltip: no percentage against a day that is still filling */
          var pct = (c && c.impressions && !isPart) ? ((r.impressions - c.impressions) / c.impressions * 100) : null;
          return '<div class="tr-bar' + (isPart ? ' tr-part' : '') + '" style="height:' + hPct + '%">' + mark +
            '<span>' + esc(r.date.slice(5)) + ' · ' + trN(r.impressions) + ' imp · ' + trN(r.views) + ' views · ' + r.transactions + ' sold' +
            (c ? ' — ' + esc(trMonthBack(r.date).slice(5)) + ': ' + trN(c.impressions) + ' imp' +
                 (pct === null ? '' : ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)') : '') +
            (isPart ? ' · still counting' : '') + '</span></div>';
        }).join('') + '</div>';

      /* THE 24-HOUR CLOCK (owner, 2 Nov). eBay has no hourly dimension, so this is the portal's own
         reading of the running daily total every five minutes; each rise is credited to the hour it
         was seen in. The dashed marker is the same hour a month back. */
      var hrs = d.hours || [], hrsPrev = d.hours_prev || [];
      var hByH = {}, pByH = {};
      hrs.forEach(function (r) { hByH[Number(r.hour)] = r; });
      hrsPrev.forEach(function (r) { pByH[Number(r.hour)] = r; });
      var hAny = hrs.some(function (r) { return Number(r.impressions) > 0; });
      var hMax = 1;
      for (var hh = 0; hh < 24; hh++) {
        hMax = Math.max(hMax, Number((hByH[hh] || {}).impressions) || 0, Number((pByH[hh] || {}).impressions) || 0);
      }
      var nowHour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' })) % 24;
      var hTot = hrs.reduce(function (a, r) { return a + (Number(r.impressions) || 0); }, 0);
      h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:14px 0 2px">' +
        'By hour · ' + esc(String(d.hour_date || today)) + ' · <span style="color:var(--text-2)">' + trN(hTot) + ' impressions counted so far</span>' +
        (d.hour_prev_date ? ' · <span style="color:var(--text-2)">dashed = ' + esc(String(d.hour_prev_date)) + '</span>' : '') + '</div>';
      if (!hAny) {
        h += '<div class="tr-warn">The hour-by-hour clock starts filling from now. eBay publishes traffic by day and by listing only — never by hour — so the portal builds this itself by reading the running daily total every five minutes. Come back in an hour and the first hours will be here.</div>';
      } else {
        var cells = [];
        for (var q = 0; q < 24; q++) {
          var cur = hByH[q] || { impressions: 0, views: 0, transactions: 0 };
          var prv = pByH[q] || null;
          var ch = Math.max(2, Math.round((Number(cur.impressions) || 0) / hMax * 100));
          var hmark = '';
          if (prv) {
            var w2 = Math.round((Number(prv.impressions) || 0) / hMax * 100 / ch * 100);
            hmark = '<i class="tr-cmp' + ((Number(prv.impressions) || 0) > (Number(cur.impressions) || 0) ? ' tr-under' : '') + '" style="bottom:' + Math.max(0, Math.min(10000, w2)) + '%"></i>';
          }
          cells.push('<div class="tr-hb' + (q === nowHour && String(d.hour_date) === today ? ' now' : '') + '" style="height:' + ch + '%">' + hmark +
            '<span>' + String(q).padStart(2, '0') + ':00 · ' + trN(cur.impressions) + ' imp · ' + trN(cur.views) + ' views · ' + (Number(cur.transactions) || 0) + ' sold' +
            (prv ? ' — a month back ' + trN(prv.impressions) + ' imp' : '') + '</span></div>');
        }
        h += '<div class="tr-hbars">' + cells.join('') + '</div><div class="tr-hx">' +
          [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].map(function (q) {
            return '<span>' + (q % 3 === 0 ? String(q).padStart(2, '0') : '') + '</span>';
          }).join('') + '</div>' +
          '<div style="font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:4px;line-height:1.5">' + esc(String(d.hours_note || '')) + '</div>';
      }

      /* review 3: account-to-account, day by day */
      if (!TR.account) {
        var byAcct = {}, showDates = {};
        showing.forEach(function (w) { showDates[w.date] = 1; });
        (d.days || []).forEach(function (r) {
          if (showDates[r.date]) { (byAcct[r.account] = byAcct[r.account] || []).push(r); }
        });
        var accts = Object.keys(byAcct);
        if (accts.length > 1) {
          h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:12px 0 4px">Account to account \u00b7 the window\u2019s totals per day</div>' +
            '<div class="scroll" style="max-height:240px"><table class="tr-tbl" style="min-width:640px"><thead><tr>' +
            '<th>Account</th><th>Days</th><th>Impressions</th><th>Views</th><th>Sold</th><th>CTR</th><th>Conversion</th><th>Best day</th></tr></thead><tbody>';
          accts.forEach(function (a) {
            var t2 = { imp: 0, vw: 0, tx: 0 }; var best = null;
            byAcct[a].forEach(function (r) {
              t2.imp += Number(r.impressions) || 0; t2.vw += Number(r.views) || 0; t2.tx += Number(r.transactions) || 0;
              if (!best || Number(r.transactions) > Number(best.transactions)) { best = r; }
            });
            h += '<tr><td style="font-weight:800">' + esc(a) + '</td><td>' + byAcct[a].length + '</td>' +
              '<td>' + trN(t2.imp) + '</td><td>' + trN(t2.vw) + '</td><td>' + t2.tx + '</td>' +
              '<td>' + (t2.imp ? (t2.vw / t2.imp * 100).toFixed(2) : '0.00') + '%</td>' +
              '<td>' + (t2.vw ? (t2.tx / t2.vw * 100).toFixed(2) : '0.00') + '%</td>' +
              '<td>' + (best ? esc(String(best.date).slice(5)) + ' \u00b7 ' + best.transactions + ' sold' : '\u2014') + '</td></tr>';
          });
          h += '</tbody></table></div>';
        }
      }
      /* review 3: the money leak by name — real reach, nothing landing */
      var lows = d.low_conversion || [];
      if (lows.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--bad);font-weight:800;margin:14px 0 4px">\ud83d\udd3b Low conversion \u00b7 ' + lows.length + ' listing(s) with real views converting under 1% (' + d.range + 'd)</div>' +
          '<div class="scroll" style="max-height:260px"><table class="tr-tbl"><thead><tr>' +
          '<th>Listing</th><th>Views</th><th>Sold</th><th>Conversion</th></tr></thead><tbody>';
        lows.forEach(function (r) {
          /* owner, 31 Oct: the portal's standard listing cell (image, Product history, item number, account, eBay, History) */
          h += '<tr><td>' + adtProductCell(r) + '</td>' +
            '<td>' + trN(r.views) + '</td><td>' + (r.transactions || 0) + '</td>' +
            '<td style="color:var(--bad);font-weight:800">' + (Number(r.cvr_l) || 0).toFixed(2) + '%</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      var rows = d.listings || [];
      if (rows.length) {
        h += '<div class="hu-hint" style="margin-top:14px">Per listing, over ' + (d.range || 7) + ' days.' +
          ((TR.mode === 'd3' || TR.mode === 'today' || TR.mode === 'custom')
            ? ' eBay only publishes a 7 or 30 day figure per listing, so this table keeps its own window while the figures above follow the one you picked.'
            : '') + '</div>';
        h += '<div class="scroll"><table class="tr-tbl"><thead><tr>' +
          '<th>Listing</th><th>Impressions</th><th>Views</th><th>Sold</th><th>CTR</th><th>Conversion</th></tr></thead><tbody>';
        rows.forEach(function (r) {
          var lctr = r.impressions ? (r.views / r.impressions * 100).toFixed(2) : '0.00';
          var lcvr = r.views ? (r.transactions / r.views * 100).toFixed(2) : '0.00';
          h += '<tr><td>' + adtProductCell(r) + '</td>' +
            '<td>' + trN(r.impressions) + '</td><td>' + trN(r.views) + '</td><td>' + (r.transactions || 0) + '</td>' +
            '<td>' + lctr + '%</td><td>' + lcvr + '%</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String(d.note || '')) + '</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not load traffic.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.traffic = {
    label: 'Traffic',
    order: 7.6,
    roles: TR_ROLES,
    icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    prefetch: function () { return api('trafficBoard', { range: 7 }); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">traffic</span></h1>' +
          '<span class="sub">impressions, views, CTR and conversion, per account, per day, per listing · eBay’s own Traffic Report</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' +
            '<button class="minibtn' + (TR.mode === 'today' ? ' on' : '') + '" id="trToday">Today</button>' +
            '<button class="minibtn' + (TR.mode === 'yesterday' ? ' on' : '') + '" id="trYday">Yesterday</button>' +
            [3, 7, 29, 30, 31].map(function (n) {
              return '<button class="minibtn' + (TR.mode === 'days' && TR.days === n ? ' on' : '') + '" data-tr-days="' + n + '">' + n + ' days</button>';
            }).join('') +
            '<input type="date" id="trFrom" class="minibtn" style="padding:5px 6px"><input type="date" id="trTo" class="minibtn" style="padding:5px 6px">' +
            '<button class="minibtn" id="trApply">Apply</button>' +
            '<select class="alx-sel" id="trAcc"><option value="">All accounts</option></select>' +
            '<span id="trStamp" style="margin-left:auto;font-size:10.5px;color:var(--text-3);font-weight:700;white-space:nowrap"></span>' +
            '<button class="minibtn" id="trRefresh">Refresh</button></div>' +
          '<div id="trBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      function trChips(el) {
        document.querySelectorAll('[data-tr-days], #trToday, #trYday').forEach(function (x) { x.classList.remove('on'); });
        if (el) { el.classList.add('on'); }
      }
      /* owner, 18 Oct: 3 days everywhere; 2 Nov: yesterday, 29 and 31 as well. eBay publishes
         traffic per DAY, so any day count is honest for the account figures and the chart. It does
         NOT publish a per-listing figure for an arbitrary window — only 7 and 30 day buckets — so
         the per-listing table below stays on the nearer of the two and says so. */
      document.querySelectorAll('[data-tr-days]').forEach(function (b) {
        b.onclick = function () {
          var n = Number(this.getAttribute('data-tr-days')) || 7;
          trChips(this);
          TR.mode = 'days'; TR.days = n; TR.range = n <= 7 ? 7 : 30;
          TR.from = trShift(ukToday(), -(n - 1)); TR.to = ukToday();
          trLoad();
        };
      });
      var td = $('trToday');
      if (td) { td.onclick = function () { trChips(this); TR.mode = 'today'; TR.from = ''; TR.to = ''; trLoad(); }; }
      var ty = $('trYday');
      if (ty) { ty.onclick = function () { trChips(this); TR.mode = 'yesterday'; TR.from = ''; TR.to = ''; trLoad(); }; }
      var ap = $('trApply');
      if (ap) {
        ap.onclick = function () {
          var f = $('trFrom'), t = $('trTo');
          if (f && t && f.value && t.value) { trChips(null); TR.mode = 'custom'; TR.from = f.value; TR.to = t.value; trLoad(); }
          else { toast('Pick both dates first.'); }
        };
      }
      cachedCall('accountList', {}, function (d) {
        var sel = $('trAcc');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">All accounts</option>' + (((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
        /* repaints (cached then fresh) must not clobber a selection the user already made */
        if (TR.account) { sel.value = TR.account; }
        sel.onchange = function () { TR.account = String(this.value || ''); trLoad(); };
      });
      var rf = $('trRefresh');
      /* onclick hands the handler a MouseEvent — passing trLoad straight in would make every
         manual Refresh a QUIET one and drop the spinner the person just asked for */
      if (rf) { rf.onclick = function () { trLoad(); }; }
      trLoad();
      /* the shell's poller: it stops by itself when this page leaves the screen, skips a tick
         while the tab is in the background, and gives up after repeated failures */
      if (typeof adtPoll === 'function') { adtPoll('trBody', 120000, function () { return trLoad(true); }); }
    }
  };
})();
