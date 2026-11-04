/* view-traffic.js — Hasib item 11: the account traffic dashboard, from eBay's own Traffic
 * Report. Per-account per-day series, 7/30-day totals, listing drilldown — his Seller Hub
 * traffic screen, inside the portal. */
(function () {

  var TR_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];
  /* hour_pick: which single day (or the window's average) the hour bars are about, the owner's
     picker above them. hour_series: which of the three series is drawn; '' means let the page
     choose, which is how the block opens on Sold while the traffic clock is still empty. */
  var TR = { account: '', range: 7, mode: '', days: 0, from: '', to: '',
    hour_pick: 'today', hour_series: '', data: null };

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
    /* 4 Nov (owner): the dashed month-back marker inside each bar is gone — "makes no sense". The
       same dates a month back are now their OWN block below, drawn exactly like the one above. */
    '.tr-sec{margin:22px 0 12px;padding-top:16px;border-top:1px solid var(--gold-line);font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--gold-a)}' +
    '.tr-sec span{color:var(--text-3);font-weight:700;text-transform:none;letter-spacing:0;margin-left:8px}' +
    '.tr-hbars{display:flex;align-items:flex-end;gap:2px;height:104px;padding:8px 0 4px;box-sizing:border-box}' +
    '.tr-hb{flex:1;background:linear-gradient(180deg,var(--gold-a,#d4af37),rgba(212,175,55,.45));border-radius:3px 3px 0 0;min-width:4px;position:relative}' +
    '.tr-hb.now{outline:1px solid var(--gold-a)}' +
    '.tr-hb span{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:9px;color:var(--text-3);font-weight:700;white-space:nowrap;display:none;z-index:2}' +
    '.tr-hb:hover span{display:block}' +
    '.tr-hx{display:flex;gap:2px;font-size:8.5px;color:var(--text-3);font-weight:700}.tr-hx span{flex:1;text-align:center}' +
    /* 2 Nov (owner): the hour picker and the series switch. Chips of this page's own, in this
       page's own prefix, because this file is spliced into both portals and a class borrowed
       from another file resolves differently in each. */
    '.tr-pick{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:14px 0 4px}' +
    '.tr-pick .tr-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-right:2px}' +
    '.tr-chip{font-size:10.5px;font-weight:800;padding:4px 10px;border-radius:999px;border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text-3);cursor:pointer;letter-spacing:.02em}' +
    '.tr-chip:hover{color:var(--text-2)}' +
    '.tr-chip.on{background:var(--gold-a,#d4af37);border-color:var(--gold-a,#d4af37);color:#1a1405}' +
    '.tr-chip[disabled]{opacity:.42;cursor:default}' +
    /* an hour with NO reading behind it, which is not the same picture as an hour that was
       read and held nothing: hatched, never a bar of nought. */
    '.tr-hb.tr-none{background:repeating-linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.14) 4px,transparent 4px,transparent 8px)}' +
    '.tr-src{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:6px;line-height:1.6}' +
    '.tr-src b{color:var(--text-2)}'
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

  /* TRAFFIC-PURE-BEGIN — the arithmetic behind the bars, sliced out and CALLED by
     scripts/adtool-test.js. Nothing in here touches the document or any other file: a bar that is
     the wrong height, or a month-back marker sitting off the top of its own bar, is a wrong figure
     shown to a manager, and it is the one thing on this page a regex over the source cannot catch. */

  /* THE SCALE. It has to cover BOTH the day and the same date a month back, or the dashed marker
     would be drawn above the top of the chart. One function for every row, so Impressions and Views
     cannot end up on different rules — each row still takes its OWN maximum, because views are a
     small fraction of impressions and a shared scale would press the views row flat. */
  function trBarMax(rows, key, cmp) {
    var max = 1;
    (rows || []).forEach(function (r) {
      max = Math.max(max, Number(r && r[key]) || 0);
      var c = cmp ? cmp(r) : null;
      if (c) { max = Math.max(max, Number(c[key]) || 0); }
    });
    return max;
  }

  /* a bar as a percentage of the chart, with a floor so a thin day is still something to point at */
  function trBarH(v, max, floor) {
    var f = (floor === 0 || floor) ? Number(floor) : 4;
    var m = Number(max) || 1;
    return Math.max(f, Math.min(100, Math.round((Number(v) || 0) / m * 100)));
  }

  /* THE MARKER OFFSET. The month-back level belongs at (then / max) of the CHART, but it is drawn
     inside a bar that is only trBarH of that chart, so its offset within the bar is the ratio of the
     two. Done as then/now it would overshoot the chart every time the floor above kicked in. */
  function trMarkAt(then, max, hPct) {
    var h = Number(hPct) || 0;
    if (!h) { return 0; }
    var at = Math.round((Number(then) || 0) / (Number(max) || 1) * 100 / h * 100);
    return Math.max(0, Math.min(10000, at));
  }

  /* THE THREE HOUR SERIES, MERGED INTO 24 SLOTS. Two sources sit behind them: the portal's own
     five-minute clock (impressions and views, which only holds the days since it was switched on)
     and the order book (sold, which is exact for every day it covers). A source that holds NOTHING
     for the day leaves its series missing in all twenty-four slots, and an hour that has not
     happened yet is missing too. Missing is null and stays null: a nought is a reading, and "we
     have none" is not one, so the two must never be drawn as the same bar.
     Within a source that DOES hold the day, an hour with no row is a real nought: both sources
     record every unit of their series against an hour, so silence in them is an empty hour.
     A row the source HAS is always shown, whatever the clock says. The viewer's clock is only used
     to decide that an hour has not come round yet, and an order stamped 20:00 is an order at 20:00
     even on a machine that thinks it is noon. */
  function trHourMerge(traffic, sold, opt) {
    var o = opt || {};
    var upto = (o.upto === 0 || o.upto) ? Number(o.upto) : 23;
    var tBy = {}, sBy = {}, tAny = false, sAny = false;
    (traffic || []).forEach(function (r) {
      var h = Number(r && r.hour);
      if (h >= 0 && h <= 23) { tBy[h] = r; tAny = true; }
    });
    (sold || []).forEach(function (r) {
      var h = Number(r && r.hour);
      if (h >= 0 && h <= 23) { sBy[h] = r; sAny = true; }
    });
    var slots = [], tot = { impressions: 0, views: 0, sold: 0, orders: 0, samples: 0 };
    for (var h = 0; h < 24; h++) {
      var t = tBy[h], s = sBy[h], live = h <= upto;
      var clock = tAny && (live || !!t), book = sAny && (live || !!s);
      var row = {
        hour: h,
        impressions: clock ? (Number(t && t.impressions) || 0) : null,
        views: clock ? (Number(t && t.views) || 0) : null,
        sold: book ? (Number(s && s.units) || 0) : null,
        orders: book ? (Number(s && s.orders) || 0) : null,
        samples: clock ? (Number(t && t.samples) || 0) : null
      };
      ['impressions', 'views', 'sold', 'orders', 'samples'].forEach(function (k) {
        if (row[k] !== null) { tot[k] += row[k]; }
      });
      slots.push(row);
    }
    var round1 = function (v) { return Math.round(v * 10) / 10; };
    return {
      slots: slots,
      has: { impressions: tAny, views: tAny, sold: sAny },
      totals: {
        impressions: tAny ? round1(tot.impressions) : null, views: tAny ? round1(tot.views) : null,
        sold: sAny ? round1(tot.sold) : null, orders: sAny ? round1(tot.orders) : null,
        samples: tAny ? round1(tot.samples) : null
      }
    };
  }
  /* TRAFFIC-PURE-END */

  /* ONE BAR ROW. Label, the field this row is about, the word the tooltip calls it, the days, the
     month-back lookup and the day eBay has not finished counting. Every rule the single impressions
     row used to carry lives here once: the floor, the marker offset converted into the bar's own
     frame, the hatched part-day, and NO percentage against a day that is still filling — holding
     half a day against a whole one a month back prints a collapse every morning and a recovery
     every night, which is the misreading this page already exists to prevent. */
  /* 4 Nov (owner): "red dotted line makes no sense, remove that — I want the same presentation
     duplicated with last month's same-date stats". No marker inside the bar any more. The row
     takes a SHARED scale (`opt.max`, the larger of this block and the month-back block) so the
     two blocks read against each other by eye; `opt.vsOf(date)` names the matching day in the
     other block for the tooltip only. */
  function trBarRow(label, key, word, rows, opt) {
    opt = opt || {};
    var max = opt.max || trBarMax(rows, key, null);
    var today = opt.today || '';
    return '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:12px 0 2px">' +
      esc(label) + (opt.note ? ' \u00b7 <span style="color:var(--text-2)">' + esc(opt.note) + '</span>' : '') + '</div>' +
      '<div class="tr-bars">' + rows.map(function (r) {
        var isPart = r.date === today;
        var hPct = trBarH(r[key], max);
        var v = opt.vsOf ? opt.vsOf(r.date) : null;     // { date, value, part } of the matching day in the other block
        var pct = (v && v.value && !isPart && !v.part) ? ((r[key] - v.value) / v.value * 100) : null;
        return '<div class="tr-bar' + (isPart ? ' tr-part' : '') + '" style="height:' + hPct + '%">' +
          '<span>' + esc(r.date.slice(5)) + ' \u00b7 ' + trN(r.impressions) + ' imp \u00b7 ' + trN(r.views) + ' views \u00b7 ' + r.transactions + ' sold' +
          (v ? ' \u00b7 vs ' + esc(String(v.date).slice(5)) + ': ' + trN(v.value) + ' ' + word +
               (pct === null ? '' : ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)') + (v.part ? ' (still counting)' : '') : '') +
          (isPart ? ' \u00b7 still counting' : '') + '</span></div>';
      }).join('') + '</div>';
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
    /* the hour bars follow the owner's own picker above them, not the window chips: with two
       controls over one chart the reader can never tell which of them moved it. Today by
       default, and the Average view needs no day at all — it reads the averages the engine
       already sends for this window. */
    payload.hour_date = TR.hour_pick === 'yesterday' ? trShift(ukToday(), -1) : ukToday();
    return api('trafficBoard', payload).then(function (d) {
      TR.data = d || {};
      var stamp = $('trStamp');
      if (stamp) { stamp.textContent = 'updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · every 2 min'; }
      trPaint();
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not load traffic.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  /* THE PAINT IS ITS OWN STEP (2 Nov). The hour picker's Average view and the series switch
     redraw from the payload already in hand rather than asking the engine again for figures
     it has just sent, so a reader flicking between Impressions, Views and Sold costs nothing
     and never watches the whole page blink. Only a change of DAY is a fresh read. */
  function trPaint() {
    var box = $('trBody');
    if (!box) { return; }
    var d = TR.data || {};
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
    /* TWO ROWS NOW (owner, 2 Nov: "make the comparison bars of views and traffics, after the main
       blocks of numbers"). One row drawn twice off one helper, so impressions and views can never
       drift apart on the scale, the marker or the words in the tooltip. Each row keeps its OWN
       maximum: views are a small fraction of impressions and a shared scale would press the views
       row flat against the floor, which is a true chart that tells a reader nothing. */
    /* the same dates a month back, as their own rows, keyed both ways for the tooltips */
    var prevDays = [], prevToCur = {};
    chartDays.forEach(function (r) { var c = cmpOf(r.date); if (c) { prevDays.push(c); prevToCur[c.date] = r; } });
    var maxImp = Math.max(trBarMax(chartDays, 'impressions', null), trBarMax(prevDays, 'impressions', null));
    var maxViews = Math.max(trBarMax(chartDays, 'views', null), trBarMax(prevDays, 'views', null));
    var backOf = function (key) { return function (dt) { var c = cmpOf(dt); return c ? { date: c.date, value: c[key] } : null; }; };
    var nowOf = function (key) { return function (dt) { var r = prevToCur[dt]; return r ? { date: r.date, value: r[key], part: r.date === today } : null; }; };
    var weekNote = TR.mode === 'today' ? 'the week behind today' : '';
    h += trBarRow('Impressions by day', 'impressions', 'imp', chartDays, { today: today, max: maxImp, vsOf: backOf('impressions'), note: weekNote }) +
      trBarRow('Views by day', 'views', 'views', chartDays, { today: today, max: maxViews, vsOf: backOf('views'), note: weekNote });

    /* 4 Nov (owner): THE SAME PRESENTATION AGAIN, FOR THE SAME DATES A MONTH BACK — the tiles over
       exactly the dates the tiles above cover, then the two day rows on the same scale as the
       rows above. Where nothing is stored a month back the block says so instead of drawing air. */
    var backWin = pDays ? cmpLbl : '';
    var backLbl = showing.length && showing[0] && showing.length === 1 ? 'same date a month back' : 'same dates a month back';
    h += '<div class="tr-sec">' + esc(backLbl) + (backWin ? '<span>' + esc(backWin) + ' \u00b7 the presentation above, one calendar month earlier</span>' : '') + '</div>';
    if (!pDays && !prevDays.length) {
      h += '<div class="tr-sofar"><span>Nothing is stored for these dates a month back yet \u2014 eBay\u2019s traffic report is kept from the day the portal started reading it.</span></div>';
    } else {
      var nowLine = function (val, isPct) { return '<div class="tr-vs">the window above: ' + (isPct ? (Number(val) || 0).toFixed(2) + '%' : trN(val)) + '</div>'; };
      h += '<div class="tr-tiles">' +
        '<div class="tr-tile"><div class="k">Impressions · a month back</div><div class="v">' + trN(pTot.impressions) + '</div>' + nowLine(tot.impressions) + '</div>' +
        '<div class="tr-tile"><div class="k">Listing views</div><div class="v">' + trN(pTot.views) + '</div>' + nowLine(tot.views) + '</div>' +
        '<div class="tr-tile"><div class="k">Transactions</div><div class="v">' + trN(pTot.transactions) + '</div>' + nowLine(tot.transactions) + '</div>' +
        '<div class="tr-tile"><div class="k">CTR</div><div class="v">' + pCtr.toFixed(2) + '%</div>' + nowLine(ctr, true) + '</div>' +
        '<div class="tr-tile"><div class="k">Conversion</div><div class="v">' + pCvr.toFixed(2) + '%</div>' + nowLine(cvr, true) + '</div>' +
      '</div>' +
      trBarRow('Impressions by day · a month back', 'impressions', 'imp', prevDays, { max: maxImp, vsOf: nowOf('impressions'), note: 'same scale as the row above' }) +
      trBarRow('Views by day · a month back', 'views', 'views', prevDays, { max: maxViews, vsOf: nowOf('views'), note: 'same scale as the row above' });
    }

    /* THE HOUR BLOCK (owner, 2 Nov: "where is the breakdown of hours? i need hour to hour bars in
       this page too"). THREE series over one day, from TWO sources:
         Impressions and Views  the portal's own clock. eBay's traffic report has a day dimension and
                                a listing dimension and no hourly one, so there is nothing to ask for:
                                the running daily total is read every five minutes and each rise is
                                credited to the hour it was seen in. That clock was created on 2 Nov,
                                so it holds nothing earlier, and today's row stays empty until eBay's
                                daily total first moves — which is why the owner saw no hours at all.
         Sold                   the UK hour on each order's own timestamp. Exact, for every day the
                                order book covers, which is all of them.
       So the block opens on Sold whenever the clock has nothing for the day and on Impressions
       whenever it has something, and it is therefore never an empty box. */
    var isAvg = TR.hour_pick === 'avg';
    var hourDate = String(d.hour_date || today);
    var nowHour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' })) % 24;
    /* an hour that has not happened yet holds no reading, and a bar of nought would say it did */
    var CUR = isAvg
      ? trHourMerge(d.hours_avg, d.hours_sold_avg, { upto: 23 })
      : trHourMerge(d.hours, d.hours_sold, { upto: hourDate === today ? nowHour : 23 });
    /* no month-back marker on an average: there is no single date for it to be the same date as */
    var PRV = isAvg ? null : trHourMerge(d.hours_prev, d.hours_sold_prev, { upto: 23 });
    var SER = [['impressions', 'Impressions', 'imp'], ['views', 'Views', 'views'], ['sold', 'Sold', 'sold']];
    var ser = TR.hour_series || (CUR.totals.impressions ? 'impressions' : 'sold');
    if (!CUR.has[ser]) { ser = CUR.has.impressions ? 'impressions' : 'sold'; }
    var serWord = 'sold';
    SER.forEach(function (s) { if (s[0] === ser) { serWord = s[2]; } });
    var avgDays = isAvg ? (ser === 'sold' ? d.hours_sold_avg_days : d.hours_avg_days) : null;
    var picks = [['today', 'Today'], ['yesterday', 'Yesterday'], ['avg', 'Average over the window']];
    h += '<div class="tr-pick"><span class="tr-lbl">By hour</span>' +
      picks.map(function (x) {
        return '<button class="tr-chip' + (TR.hour_pick === x[0] ? ' on' : '') + '" data-tr-hp="' + x[0] + '">' + esc(x[1]) + '</button>';
      }).join('') +
      '<span class="tr-lbl" style="margin-left:10px">Series</span>' +
      SER.map(function (x) {
        /* a series the block holds nothing for is offered greyed rather than hidden: a reader who
           cannot see the button cannot tell whether it is missing or whether it was never there. */
        return '<button class="tr-chip' + (ser === x[0] ? ' on' : '') + '" data-tr-hs="' + x[0] + '"' +
          (CUR.has[x[0]] ? '' : ' disabled') + '>' + esc(x[1]) + '</button>';
      }).join('') + '</div>';
    h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:0 0 2px">' +
      esc(SER.reduce(function (a, s) { return s[0] === ser ? s[1] : a; }, 'Sold')) + ' by hour \u00b7 ' +
      (isAvg
        ? '<span style="color:var(--text-2)">average of ' + (avgDays == null ? 'not recorded' : avgDays + ' settled day' + (Number(avgDays) === 1 ? '' : 's')) + '</span>'
        : esc(hourDate) + (CUR.totals[ser] == null ? ' \u00b7 <span style="color:var(--text-2)">not recorded</span>'
            : ' \u00b7 <span style="color:var(--text-2)">' + trN(CUR.totals[ser]) + ' ' + serWord + ' across the day</span>')) +
      '</div>';
    if (!isAvg && d.hour_clock_empty_today) {
      h += '<div class="tr-warn">eBay has not moved today\'s running total yet, so the impressions and views clock has nothing for today. The <b>Sold</b> bars below are the real order times and are exact. Pick <b>Yesterday</b> or <b>Average over the window</b> for the clock\'s own hours.</div>';
    }
    if (!CUR.has[ser]) {
      h += '<div class="tr-warn">Nothing is recorded for ' + esc(isAvg ? 'this window' : hourDate) + ' on any of the three series yet.</div>';
    } else {
      /* 4 Nov (owner): no dashed month-back marker inside the hour bars either — the same date a
         month back is drawn as ITS OWN row of hours underneath, on the same scale as this one. */
      var hasPrv = !!(PRV && PRV.totals[ser] != null && !isAvg);
      var prvAt = hasPrv ? function (s) { return PRV.slots[s.hour] || null; } : null;
      var hMax = trBarMax(CUR.slots, ser, prvAt);
      var fig = function (x, w) { return x === null || x === undefined ? 'not recorded' : trN(x) + ' ' + w; };
      var hourAxis = '<div class="tr-hx">' +
        [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].map(function (q) {
          return '<span>' + (q % 3 === 0 ? String(q).padStart(2, '0') : '') + '</span>';
        }).join('') + '</div>';
      var hourCells = function (slots, other, otherLbl, markNow) {
        return slots.map(function (s) {
          var v = s[ser], miss = (v === null);
          var ch = trBarH(miss ? 0 : v, hMax, 2);
          var o = other ? (other.slots[s.hour] || null) : null;
          var ov = o ? o[ser] : null;
          return '<div class="tr-hb' + (miss ? ' tr-none' : '') +
            ((markNow && s.hour === nowHour && hourDate === today) ? ' now' : '') +
            '" style="height:' + ch + '%">' +
            '<span>' + String(s.hour).padStart(2, '0') + ':00 \u00b7 ' + fig(s.impressions, 'imp') + ' \u00b7 ' + fig(s.views, 'views') + ' \u00b7 ' + fig(s.sold, 'sold') +
            (s.orders === null || s.orders === undefined ? '' : ' (' + s.orders + ' order' + (s.orders === 1 ? '' : 's') + ')') +
            (ov === null || ov === undefined ? '' : ' \u00b7 vs ' + otherLbl + ' ' + trN(ov) + ' ' + serWord) + '</span></div>';
        }).join('');
      };
      h += '<div class="tr-hbars">' + hourCells(CUR.slots, hasPrv ? PRV : null, 'a month back', true) + '</div>' + hourAxis;
      if (hasPrv) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:10px 0 2px">' +
          esc(SER.reduce(function (a, s) { return s[0] === ser ? s[1] : a; }, 'Sold')) + ' by hour \u00b7 a month back \u00b7 ' + esc(String(d.hour_prev_date || '')) +
          ' \u00b7 <span style="color:var(--text-2)">' + trN(PRV.totals[ser]) + ' ' + serWord + ' across that day \u00b7 same scale as the row above</span></div>' +
          '<div class="tr-hbars">' + hourCells(PRV.slots, CUR, esc(hourDate), false) + '</div>' + hourAxis;
      }
    }
    /* ONE PLAIN LINE under the bars: what each series is and where it comes from. The sentence
       about the mechanism is the engine's own, printed rather than written again here, so the page
       and the key-authed probe cannot come to describe this clock differently. The figures beside
       it are this day's: when the clock starts, and how many five-minute readings stand behind the
       day. A figure the answer does not carry says so and never stands as a nought. */
    h += '<div class="tr-src">' + esc(String(d.hours_note || '')) +
      ' Clock starts: <b>' + esc(d.hour_clock_from ? String(d.hour_clock_from) : 'not recorded') + '</b>.' +
      ' Days it holds: <b>' + (d.hour_clock_days ? String(d.hour_clock_days) : 'not recorded') + '</b>.' +
      (isAvg ? '' : ' Five-minute readings behind this day: <b>' + (d.hour_samples == null ? 'not recorded' : String(d.hour_samples)) + '</b>.') +
      ' An hour with nothing recorded behind it is drawn hatched and says so, never as a bar of nought.</div>';

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
    trWire(box);
  }

  /* The hour picker and the series switch live INSIDE the body the paint has just replaced, so their
     handlers are attached after every paint rather than once in init. A different DAY is a fresh
     read; the Average view and a change of series are a repaint off the payload already in hand, so
     the engine is asked only for figures it has not already sent. */
  function trWire(box) {
    box.querySelectorAll('[data-tr-hp]').forEach(function (b) {
      b.onclick = function () {
        var v = String(this.getAttribute('data-tr-hp') || 'today');
        if (v === TR.hour_pick) { return; }
        TR.hour_pick = v;
        TR.hour_series = '';                                 // a different day may hold a different set of series
        var want = (v === 'yesterday') ? trShift(ukToday(), -1) : ukToday();
        if (want === String((TR.data || {}).hour_date || '')) { trPaint(); } else { trLoad(); }
      };
    });
    box.querySelectorAll('[data-tr-hs]').forEach(function (b) {
      b.onclick = function () {
        if (this.disabled) { return; }
        TR.hour_series = String(this.getAttribute('data-tr-hs') || '');
        trPaint();
      };
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
