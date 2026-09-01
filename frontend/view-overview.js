/* view-overview.js — THE Management Business overview, rebuilt to Hasib's own pixel reference
 * (docs/reference-v2/m98m-management-overview.html): date engine with presets + custom range,
 * alert strip, collective KPI hero, today/yesterday strips, the live-listings table with
 * search, the profitability split (chart + account ranking + mini tiles), advertising with the
 * ROAS gauge, returns & cases, and the account-health grid. Every number is served by a live
 * feed (Engine reads); the two sections whose feeds are not wired yet (staff, SOPs) say so in
 * the reference's own style instead of showing invented numbers. Management/Ops only. */
(function () {

  VIEW_CSS.push(
    '.ov2 .sec{margin-bottom:26px}' +
    '.ov2 .sec-h{display:flex;align-items:baseline;gap:12px;margin-bottom:12px;flex-wrap:wrap}' +
    '.ov2 .sec-h h2{font-size:15px;font-weight:800;letter-spacing:.02em}' +
    '.ov2 .sec-h .hint{font-size:11.5px;color:var(--text-3);font-weight:600}' +
    '.ov2 .sec-h .tools{margin-left:auto;display:flex;gap:6px}' +
    '.ov2 .o-card{background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--gold-line);border-radius:14px;padding:16px}' +
    '.ov2 .dates{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px;background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:10px 12px}' +
    '.ov2 .seg{display:flex;gap:4px;flex-wrap:wrap}' +
    '.ov2 .seg button{padding:7px 13px;border-radius:9px;font-weight:700;font-size:12px;color:var(--text-2);border:1px solid transparent;transition:all .16s}' +
    '.ov2 .seg button.on{color:var(--gold-a);background:rgba(233,169,60,.12);border-color:var(--gold-line-hi)}' +
    '.ov2 .custom{display:flex;align-items:center;gap:7px;margin-left:auto;flex-wrap:wrap}' +
    '.ov2 .custom label{font-size:11px;font-weight:700;color:var(--text-3);letter-spacing:.06em}' +
    '.ov2 .custom input[type=date]{background:var(--panel-2);border:1px solid var(--gold-line-hi);border-radius:8px;padding:6px 9px;font-size:12.5px;color:var(--text);color-scheme:dark}' +
    '.ov2 .btn-p{padding:7px 14px;border-radius:9px;font-weight:800;font-size:12px;color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 55%,var(--gold-c))}' +
    '.ov2 .range-label{width:100%;font-size:11.5px;color:var(--text-3);font-weight:600;padding:2px 4px 0}' +
    '.ov2 .alerts{border:1px solid rgba(240,96,90,.4);background:var(--bad-soft);border-radius:14px;padding:12px 14px;margin-bottom:20px;font-size:12.5px}' +
    '.ov2 .alerts a{font-weight:800}' +
    /* R7-8 organic vs promoted split bar */
    '.ov2 .ov-splitbar{height:16px;border-radius:8px;overflow:hidden;background:var(--ok,#2fb170);margin-top:8px}' +
    '.ov2 .ov-splitbar i{display:block;height:100%;background:var(--gold-a);border-right:2px solid var(--panel-2)}' +
    '.ov2 .ov-splitlg{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:9px;font-size:12.5px;font-weight:700}' +
    '.ov2 .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px}' +
    '.ov2 .kpi{background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--gold-line);border-radius:14px;padding:14px 15px;position:relative;overflow:hidden}' +
    '.ov2 .kpi::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--tone,var(--gold-b));opacity:.65}' +
    '.ov2 .kpi-l{font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3)}' +
    '.ov2 .kpi-v{font-size:clamp(19px,1.8vw,24px);font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}' +
    '.ov2 .kpi-v.gold{background:linear-gradient(120deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b) 60%,var(--gold-c));-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.ov2 .kpi-d{font-size:11.5px;font-weight:700;margin-top:5px}' +
    '.ov2 .kpi-d.up{color:var(--ok)}.ov2 .kpi-d.dn{color:var(--bad)}.ov2 .kpi-d.mut{color:var(--text-3)}' +
    '.ov2 .kpi-s{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:2px}' +
    '.ov2 .today{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}' +
    '.ov2 .mini-rows{display:flex;flex-direction:column;gap:6px;margin-top:9px}' +
    '.ov2 .mini-row{display:flex;align-items:center;gap:9px;font-size:12.5px}' +
    '.ov2 .mini-row .n{width:96px;font-weight:700;color:var(--text-2);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ov2 .mini-row .b{flex:1;height:6px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden}' +
    '.ov2 .mini-row .b i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold-c),var(--gold-a))}' +
    '.ov2 .mini-row.blue .b i{background:linear-gradient(90deg,#2E5E96,var(--blue))}' +
    '.ov2 .mini-row .v{font-weight:700;min-width:70px;text-align:right;font-variant-numeric:tabular-nums}' +
    '.ov2 .card-t{font-size:11px;letter-spacing:.07em;color:var(--text-3);font-weight:800;text-transform:uppercase}' +
    '.ov2 .ll-tools{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:11px}' +
    '.ov2 .ll-tools input{flex:1;min-width:200px;background:var(--panel);border:1px solid var(--gold-line-hi);border-radius:10px;padding:9px 13px;font-size:12.5px;color:var(--text)}' +
    '.ov2 .acct-chips{display:flex;gap:6px;flex-wrap:wrap}' +
    '.ov2 .acct-chips button{padding:6px 12px;border-radius:99px;font-weight:700;font-size:12px;color:var(--text-2);border:1px solid var(--gold-line-hi);transition:all .15s}' +
    '.ov2 .acct-chips button.on{color:var(--blue-2);border-color:var(--blue);background:var(--blue-soft)}' +
    '.ov2 .ll{width:100%;border-collapse:collapse;font-size:12.5px;min-width:900px}' +
    '.ov2 .ll th{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);text-align:left;padding:9px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ov2 .ll td{padding:10px 11px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.ov2 .ll tbody tr:hover{background:rgba(233,169,60,.05)}' +
    '.ov2 .campchip{padding:3px 10px;border-radius:99px;font-size:10.5px;font-weight:800;background:var(--blue-soft);color:var(--blue-2)}' +
    '.ov2 .primary-tag{font-size:9.5px;letter-spacing:.1em;font-weight:800;color:var(--gold-a);background:rgba(233,169,60,.12);border:1px solid var(--gold-line-hi);padding:3px 10px;border-radius:99px}' +
    '.ov2 .split{display:grid;grid-template-columns:1.6fr 1fr;gap:14px}' +
    '@media(max-width:1000px){.ov2 .split{grid-template-columns:1fr}}' +
    '.ov2 .mode{display:flex;gap:4px;background:var(--panel);border:1px solid var(--gold-line);border-radius:10px;padding:3px}' +
    '.ov2 .mode button{padding:6px 13px;border-radius:8px;font-weight:700;font-size:12px;color:var(--text-2)}' +
    '.ov2 .mode button.on{color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-b))}' +
    '.ov2 .rank{display:flex;flex-direction:column;gap:8px}' +
    '.ov2 .rank-row{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:11px;background:var(--panel-2);border:1px solid var(--gold-line)}' +
    '.ov2 .rank-row.top{background:linear-gradient(135deg,rgba(233,169,60,.12),transparent);border-color:var(--gold-line-hi)}' +
    '.ov2 .rank-n{font-weight:800;font-size:13px;width:22px;color:var(--text-3);text-align:center}' +
    '.ov2 .rank-row.top .rank-n{color:var(--gold-a)}' +
    '.ov2 .rank-name{font-weight:700;font-size:13px;min-width:90px}' +
    '.ov2 .rank-bar{flex:1;height:7px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden;min-width:60px}' +
    '.ov2 .rank-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold-c),var(--gold-a))}' +
    '.ov2 .rank-row:not(.top) .rank-bar i{background:linear-gradient(90deg,#2E5E96,var(--blue))}' +
    '.ov2 .rank-v{font-weight:700;font-size:12.5px;min-width:78px;text-align:right;font-variant-numeric:tabular-nums}' +
    '.ov2 .rank-d{font-size:11px;font-weight:700;min-width:56px;text-align:right}' +
    '.ov2 .up{color:var(--ok)}.ov2 .dn{color:var(--bad)}' +
    '.ov2 .tiles-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:9px;margin-top:12px}' +
    '.ov2 .tile{background:var(--panel-2);border:1px solid var(--gold-line);border-radius:11px;padding:10px 11px}' +
    '.ov2 .tile b{display:block;font-size:9.5px;letter-spacing:.08em;color:var(--text-3);font-weight:800;text-transform:uppercase}' +
    '.ov2 .tile span{display:block;font-weight:800;font-size:15.5px;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.ov2 .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;font-weight:700;color:var(--text-3);margin-top:8px}' +
    '.ov2 .legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}' +
    '.ov2 .gauge-wrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}' +
    '.ov2 .g-side b{display:block;font-size:10px;letter-spacing:.08em;color:var(--text-3);text-transform:uppercase;font-weight:800}' +
    '.ov2 .g-side span{font-weight:800;font-size:18px}' +
    '.ov2 .cases-table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}' +
    '.ov2 .cases-table th{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);text-align:left;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.ov2 .cases-table td{padding:9px 10px;border-bottom:1px solid var(--gold-line)}' +
    '.ov2 .tag{padding:2px 9px;border-radius:99px;font-weight:800;font-size:10.5px}' +
    '.ov2 .tag.inad{background:var(--bad-soft);color:var(--bad)}.ov2 .tag.ret{background:var(--warn-soft);color:var(--warn)}.ov2 .tag.open{background:var(--blue-soft);color:var(--blue-2)}' +
    '.ov2 .health{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}' +
    '.ov2 .h-card{background:var(--panel-2);border:1px solid var(--gold-line);border-radius:12px;padding:13px}' +
    '.ov2 .h-card .hn{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px}' +
    '.ov2 .h-dot{width:9px;height:9px;border-radius:50%}' +
    '.ov2 .h-ok{background:var(--ok);box-shadow:0 0 8px rgba(63,207,142,.5)}' +
    '.ov2 .h-warn{background:var(--warn);box-shadow:0 0 8px rgba(255,159,67,.5)}' +
    '.ov2 .h-bad{background:var(--bad);box-shadow:0 0 8px rgba(240,96,90,.5)}' +
    '.ov2 .h-rows{margin-top:9px;display:flex;flex-direction:column;gap:5px;font-size:11.5px}' +
    '.ov2 .h-rows div{display:flex;justify-content:space-between;color:var(--text-2)}' +
    '.ov2 .h-rows b{color:var(--text);font-weight:700;font-variant-numeric:tabular-nums}' +
    '.ov2 .empty{padding:18px;text-align:center;color:var(--text-3);font-size:12.5px;font-weight:600}' +
    '.ov2 .axis{font-size:9.5px;fill:var(--text-3)}' +
    '.ov2 .gridln{stroke:rgba(255,255,255,.05)}'
  );

  function oS(v) { return String(v == null ? '' : v).trim(); }
  function oN(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function oGBP(v) { return '£' + oN(v).toFixed(2); }
  function oGBP0(v) { var n = oN(v); return '£' + (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(2)); }
  function ukToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date()); }
  function dShift(iso, days) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }

  var O = { days: null, ov: null, listings: null, cs: null, mode: 'd7', from: '', to: '', llQ: '', llAcc: '', pMode: 'all', pAcc: '' };

  function oRange() {
    var t = ukToday();
    if (O.mode === 'today') { return { from: t, to: t, label: 'Today' }; }
    if (O.mode === 'yday') { var y = dShift(t, -1); return { from: y, to: y, label: 'Yesterday' }; }
    if (O.mode === 'd30') { return { from: dShift(t, -29), to: t, label: 'Last 30 days' }; }
    if (O.mode === 'custom' && O.from && O.to) { return { from: O.from, to: O.to, label: O.from + ' → ' + O.to }; }
    return { from: dShift(t, -6), to: t, label: 'Last 7 days' };
  }
  function oRows(from, to) {
    return (O.days || []).filter(function (r) { return r.date >= from && r.date <= to; });
  }
  function oSum(rows) {
    var t = { sold: 0, oe: 0, cost: 0, ads: 0, profit: 0 };
    rows.forEach(function (r) { t.sold += oN(r.sold); t.oe += oN(r.oe); t.cost += oN(r.cost); t.ads += oN(r.ads); t.profit += oN(r.profit); });
    t.net = t.profit - t.ads;               // the min-to-max truth: what is left AFTER advertising
    return t;
  }

  /* One honest failure panel, reused. It names the feed, quotes the server, and offers a retry —
     never a spinner that never stops. */
  function oFeedFailed(boxId, label, err) {
    var b = $(boxId);
    if (!b) { return; }
    var msg = (err && err.message) ? String(err.message) : 'no answer from the server';
    b.innerHTML = '<div class="o-card"><div class="empty">Could not load ' + esc(label) + '.' +
      '<div style="margin-top:6px;color:var(--text-3);font-weight:600;font-size:12px">' + esc(msg) + '</div>' +
      '<button class="minibtn" id="' + boxId + 'Retry" style="margin-top:10px">Try again</button></div></div>';
    var r = $(boxId + 'Retry');
    if (r) { r.onclick = function () { b.innerHTML = '<div class="spinner"></div>'; oFetchAll(); }; }
  }

  // ---------- fetches (each section paints as its feed lands) ----------
  function oFetchAll() {
    /* Every feed here used to end in an empty catch, so a failure left its panel spinning on
       "Loading…" for ever — indistinguishable from a slow network, and the reason this screen
       looked dead rather than broken. A feed that fails now says so, in its own panel, with a
       way back. */
    api('dailyReport', {}).then(function (d) {
      O.days = (d && d.rows) || [];
      /* Night-list fix ("wrong stats"): the nightly book knows nothing of today — merge the
         server's LIVE overlay in: real revenue/cost from orders, INTRADAY ad spend, and order
         earning from fee-landed orders only. Larger value wins so a late rollup never shrinks. */
      var live = (d && d.today_live) || [], today = (d && d.today) || ukToday();
      O.todayLive = live;
      var by = {};
      O.days.forEach(function (r) { if (r.date === today) { by[r.account] = r; } });
      live.forEach(function (l) {
        var b = by[l.account];
        if (!b) { b = { account: l.account, date: today, sold: 0, oe: 0, cost: 0, ads: 0, profit: 0 }; by[l.account] = b; O.days.push(b); }
        b.sold = Math.max(oN(b.sold), oN(l.sold));
        b.cost = Math.max(oN(b.cost), oN(l.cost));
        b.ads = Math.max(oN(b.ads), oN(l.ads));
        if (!oN(b.oe)) { b.oe = oN(l.oe_known); }
        b.profit = oN(b.oe) - oN(b.cost);
      });
      oPaintDated();
    })
      .catch(function (e) { O.days = []; oPaintDated(); oFeedFailed('o2Kpis', 'the daily book', e); });
    api('mgmtOverview', {}).then(function (d) {
      O.ov = d || {};
      /* R8 Wave 3: the delay Hasib saw was invisible, which made it feel broken. Now every
         refresh stamps when these numbers were built, and says what lags and why. */
      try {
        var st = $('o2Stamp');
        if (st && O.ov.as_of) {
          st.textContent = 'live pulse per account · as of ' + (fmtPkt(O.ov.as_of, true) || '') +
            (O.ov.freshness_note ? ' · ' + O.ov.freshness_note : '');
        }
      } catch (e) {}
      oPaintAlerts(); oPaintToday(); oPaintAds(); oPaintHealth();
      oPaintDated();          // the live "today" tile rides on this feed, not on dailyReport
    }).catch(function (e) { oFeedFailed('o2Today', 'today\u2019s live figures', e); });
    api('activeListings', {}).then(function (d) { O.listings = (d && d.rows) || []; oPaintListings(); })
      .catch(function (e) { oFeedFailed('o2LL', 'the live listings', e); });
    api('csDesk', {}).then(function (d) { O.cs = d || {}; oPaintCases(); })
      .catch(function (e) { oFeedFailed('o2Cases', 'returns and cases', e); });
    api('fundsSummary', {}).then(function (d) { O.funds = d || {}; oPaintMoney(); })
      .catch(function () { O.funds = { accounts: [] }; oPaintMoney(); });
    truthPage({ from: pkDayStr(0).slice(0, 8) + '01', to: pkDayStr(0) })
      .then(function (d) { O.truth = d || null; oPaintMoney(); oPaintKpis(oRange()); oPaintRatings(); })
      .catch(function () { O.truth = null; oPaintMoney(); });
    api('teamPerformance', { period: 'week' }).then(oPaintStaff).catch(function () {
      var b = $('o2Staff');
      if (b) { b.innerHTML = '<div class="o-card"><div class="empty">The staff ledger did not answer just now — <a href="#" data-o2-nav="team" style="font-weight:800">Team performance</a> has the full desk.</div></div>'; }
    });
  }

  /* 30 Aug (owner): "show the amount currently in the account — your funds" + "VAT I need to
     pay ... for that specific account". Two cards: eBay's own seller funds per account, and the
     calculator's VAT-to-HMRC line per account, month to date. */
  function oPaintMoney() {
    var box = $('o2Money');
    if (!box) { return; }
    var f = O.funds, v = O.vat;
    if (!f && !v) { return; }
    var h = '';
    var fa = (f && f.accounts) || [];
    var okF = fa.filter(function (a) { return !a.error; });
    var tAvail = 0, tHold = 0, tProc = 0, tTot = 0;
    okF.forEach(function (a) { tAvail += oN(a.available); tHold += oN(a.on_hold); tProc += oN(a.processing); tTot += oN(a.total); });
    h += '<div class="o-card"><div class="card-t">Your funds — live from eBay</div>' +
      (okF.length
        ? '<div style="font-size:24px;font-weight:800;margin-top:8px" class="kpi-v gold">' + oGBP0(tTot) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:2px">available ' + oGBP0(tAvail) + ' · processing ' + oGBP0(tProc) + ' · on hold ' + oGBP0(tHold) + '</div>' +
          '<div class="mini-rows">' + fa.map(function (a) {
            return '<div class="mini-row"><span class="n">' + esc(oS(a.account)) + '</span>' +
              '<span class="b"><i style="width:' + (tTot ? Math.round(oN(a.total) / tTot * 100) : 0) + '%"></i></span>' +
              '<span class="v">' + (a.error ? '<span style="color:var(--text-3)" title="' + esc(oS(a.error)) + '">—</span>' : oGBP0(a.total)) + '</span></div>';
          }).join('') + '</div>'
        : '<div class="empty" style="padding:14px 0">' + (fa.length ? 'eBay\u2019s Finances API refused every account just now — it retries on the next refresh.' : 'Loading…') + '</div>') +
      '</div>';
    /* TRUTH v2 WO-03 (money LIVE): VAT to pay = Σ the day tabs' own 'VAT to HMRC' column,
       month to date, per account — the calculator writes it, the portal reads it. */
    var vm = (O.truth && O.truth.metrics) || null;
    var byA = vm ? (vm.MONEY_BY_ACCOUNT.value || {}) : {};
    var vaNames = Object.keys(byA).sort();
    var vatTotal = vaNames.reduce(function (t2, a) { return t2 + oN(byA[a].vat); }, 0);
    h += '<div class="o-card"><div class="card-t">VAT to pay — Σ VAT to HMRC · month to date</div>' +
      (vaNames.length
        ? '<div style="font-size:24px;font-weight:800;margin-top:8px" class="kpi-v gold">' + oGBP0(vatTotal) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:2px">the money workbook\u2019s own column, row by row ' + (vm ? mChip(vm.VAT_TO_HMRC) : '') + '</div>' +
          '<div class="mini-rows">' + vaNames.map(function (a) {
            var mx = vaNames.reduce(function (m, x) { return Math.max(m, oN(byA[x].vat)); }, 1);
            return '<div class="mini-row blue"><span class="n">' + esc(a) + '</span>' +
              '<span class="b"><i style="width:' + Math.max(2, Math.round(oN(byA[a].vat) / mx * 100)) + '%"></i></span>' +
              '<span class="v">' + oGBP0(byA[a].vat) + '</span></div>';
          }).join('') + '</div>' +
          '<div style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">rows written this month: ' + vaNames.reduce(function (t2, a) { return t2 + oN(byA[a].rows); }, 0) + ' — a missing row is missing VAT, not zero VAT.</div>'
        : '<div class="empty" style="padding:14px 0">The books mirror is filling…</div>') +
      '</div>';
    box.innerHTML = h;
  }

  /* TRUTH v2 WO-03 step 5: the rating strip — RATING per account from eBay's Analytics API. */
  function oPaintRatings() {
    var host = $('o2Ratings');
    if (!host) { return; }
    api('accountHealth', {}).then(function (d) {
      var stds = (d && d.standards) || [];
      if (!stds.length) { host.innerHTML = '<div class="empty">The standards sync has not landed yet.</div>'; return; }
      host.innerHTML = stds.map(function (r) {
        var p = (r.profiles || [])[0] || {};
        var lv = String(p.standardsLevel || '');
        var tone = /TOP_RATED|ABOVE/.test(lv) ? 'ok' : /BELOW/.test(lv) ? 'bad' : 'warn';
        var mets = p.metrics || [];
        var pick = function (re) {
          var m = null;
          mets.some(function (x) { if (re.test(String(x.name || x.metricKey || ''))) { m = x; return true; } return false; });
          if (!m) { return '—'; }
          var v = (m.value && (m.value.value !== undefined ? m.value.value : m.value));
          return String(v == null ? '—' : v);
        };
        return '<div class="tile"><b>' + esc(oS(r.account)) + '</b>' +
          '<span style="display:block;font-weight:800;color:var(--' + tone + ');font-size:12px;margin:3px 0">' + esc(lv.replace(/_/g, ' ') || '—') + '</span>' +
          '<div style="font-size:10.5px;color:var(--text-3);font-weight:700;line-height:1.7">defects ' + esc(pick(/defect/i)) +
          ' · late ' + esc(pick(/late/i)) + ' · cases w/o res. ' + esc(pick(/without seller|resolution/i)) + '</div>' +
          (p.cycle && p.cycle.evaluationDate ? '<div style="font-size:9.5px;color:var(--text-3);margin-top:3px">evaluated ' + esc(String(p.cycle.evaluationDate).slice(0, 10)) + '</div>' : '') +
          '</div>';
      }).join('');
    }).catch(function () { host.innerHTML = '<div class="empty">Standards feed did not answer.</div>'; });
  }

  /* The reference's staff section, fed by the portal's own activity ledger (teamPerformance —
   * the same numbers the Team performance desk shows). Top producer gets the hero band. */
  function oPaintStaff(d) {
    var box = $('o2Staff');
    if (!box) { return; }
    var people = null;
    if (d) {
      ['people', 'staff', 'rows', 'members', 'team'].some(function (k) {
        if (Object.prototype.toString.call(d[k]) === '[object Array]' && d[k].length) { people = d[k]; return true; }
        return false;
      });
      if (!people) {
        Object.keys(d).some(function (k) {
          var v = d[k];
          if (Object.prototype.toString.call(v) === '[object Array]' && v.length && typeof v[0] === 'object' && (v[0].name || v[0].email)) { people = v; return true; }
          return false;
        });
      }
    }
    if (!people || !people.length) {
      box.innerHTML = '<div class="o-card"><div class="empty">No staff activity recorded for this week yet — <a href="#" data-o2-nav="team" style="font-weight:800">Team performance</a> has the full desk.</div></div>';
      return;
    }
    var score = function (p) { return oN(p.tasks_completed) + oN(p.listings) + oN(p.orders_processed) + oN(p.replies_sent) + oN(p.hunts) + oN(p.revisions_done); };
    people = people.slice().sort(function (a, b) { return score(b) - score(a); });
    var top = people[0];
    var initials = oS(top.name || top.email).split(/[\s@.]+/).map(function (w) { return (w[0] || '').toUpperCase(); }).slice(0, 2).join('');
    var h = '<div class="o-card" style="background:linear-gradient(135deg,rgba(233,169,60,.12),transparent 60%);border-color:var(--gold-line-hi);display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
      '<div style="width:52px;height:52px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:800;font-size:16px;color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-c))">' + esc(initials) + '</div>' +
      '<div><h3 style="font-size:16px;font-weight:800">' + esc(oS(top.name || top.email)) + '</h3><div style="font-size:12px;color:var(--text-2);font-weight:600">' + esc(oS(top.role)) + ' · the week\'s highest recorded output</div></div>' +
      '<div style="margin-left:auto;display:flex;gap:18px;flex-wrap:wrap">' +
        '<div><b style="display:block;font-size:9.5px;letter-spacing:.08em;color:var(--gold-a);font-weight:800;text-transform:uppercase">Tasks done</b><span style="font-weight:800;font-size:16px">' + oN(top.tasks_completed) + '</span></div>' +
        '<div><b style="display:block;font-size:9.5px;letter-spacing:.08em;color:var(--gold-a);font-weight:800;text-transform:uppercase">On time</b><span style="font-weight:800;font-size:16px">' + (top.on_time_pct !== undefined && top.on_time_pct !== '' ? oN(top.on_time_pct) + '%' : '—') + '</span></div>' +
      '</div></div>';
    h += '<div class="o-card scroll" style="padding:10px"><table class="cases-table" style="min-width:860px"><thead><tr>' +
      '<th>Person</th><th>Tasks</th><th>On time</th><th>Listings</th><th>Revisions</th><th>Hunts</th><th>Orders</th><th>CS replies</th><th>Wrong orders caused</th></tr></thead><tbody>';
    people.forEach(function (p) {
      h += '<tr><td><b>' + esc(oS(p.name || p.email)) + '</b><div style="font-size:10.5px;color:var(--text-3)">' + esc(oS(p.role)) + '</div></td>' +
        '<td class="num">' + oN(p.tasks_completed) + '</td>' +
        '<td class="num">' + (p.on_time_pct !== undefined && p.on_time_pct !== '' ? oN(p.on_time_pct) + '%' : '—') + '</td>' +
        '<td class="num">' + oN(p.listings) + '</td>' +
        '<td class="num">' + oN(p.revisions_done) + '</td>' +
        '<td class="num">' + oN(p.hunts) + '</td>' +
        '<td class="num">' + oN(p.orders_processed) + '</td>' +
        '<td class="num">' + oN(p.replies_sent) + '</td>' +
        '<td class="num" style="' + (oN(p.wrong_orders_caused) ? 'color:var(--bad);font-weight:800' : '') + '">' + oN(p.wrong_orders_caused) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    box.innerHTML = h;
  }

  // ---------- date-driven block: KPIs + profitability ----------
  function oPaintDated() {
    var r = oRange();
    var lbl = $('o2RangeLbl');
    if (lbl) { lbl.innerHTML = 'Showing <b>' + esc(r.label) + '</b> · ' + esc(r.from) + ' → ' + esc(r.to) + ' · UK business days'; }
    oPaintKpis(r); oPaintProfit(r);
  }

  function oPaintKpis(r) {
    var box = $('o2Kpis');
    if (!box) { return; }
    /* TRUTH v2 WO-03 (money LIVE): the money tiles read the register for the CHOSEN RANGE —
       Σ Raw Profit, Σ VAT to HMRC, Σ True Order Earning, sheet Sold with the eBay sub-line and
       rows coverage. Ads-family tiles keep the old path until the ads module flips (Phase 4). */
    var tKey = 't:' + r.from + '|' + r.to;
    if (O.truthRangeKey !== tKey) {
      O.truthRangeKey = tKey; O.truthRange = null;
      truthPage({ from: r.from, to: r.to }).then(function (d) {
        if (O.truthRangeKey !== tKey) { return; }
        O.truthRange = d;
        oPaintKpis(r);
      }).catch(function () {});
    }
    if (O.truthRange && O.truthRange.metrics) {
      var M = O.truthRange.metrics;
      var cov = M.ROWS_COVERAGE.value || {};
      var sApi = (M.SOLD_API.value || {}).all;
      var mkT = function (label, val, sub, tone) {
        return '<div class="kpi" style="--tone:var(--' + (tone || 'gold-b') + ')"><div class="kpi-l">' + label + '</div>' +
          '<div class="kpi-v' + (tone === 'gold-b' ? ' gold' : '') + '">' + val + '</div>' +
          '<div class="kpi-s">' + sub + '</div></div>';
      };
      box.innerHTML =
        mkT('SOLD (BOOKS)', oGBP0(M.SOLD_SHEET.value), 'eBay: ' + oGBP0(sApi || 0) + ' · rows ' + (cov.rows || 0) + ' of ' + (cov.orders || 0) + ' ' + mChip(M.SOLD_SHEET), 'gold-b') +
        mkT('ACTUAL PROFIT', oGBP0(M.ACTUAL_PROFIT.value), 'Σ Raw Profit — the day tabs\' own column ' + mChip(M.ACTUAL_PROFIT), 'gold-b') +
        mkT('VAT TO HMRC', oGBP0(M.VAT_TO_HMRC.value), 'Σ VAT to HMRC · True Earning − VAT = Raw ' + mChip(M.VAT_TO_HMRC), 'blue') +
        mkT('TRUE ORDER EARNING', oGBP0(M.TRUE_EARNING.value), 'Σ True Order Earning', 'blue') +
        mkT('ALIEXPRESS COST', oGBP0(M.ALI_COST.value), 'Σ Total AliExpress Cost incl VAT', 'warn') +
        mkT('MARGIN', M.MARGIN.value == null ? '—' : M.MARGIN.value + '%', 'actual ÷ sold (books)', 'ok') +
        mkT('OPEN ORDERS', String(M.AWAITING_DISPATCH.value), 'late ' + M.LATE_NOW.value.n + ' · due ' + M.DUE_3D.value + ' · awaiting ' + M.AWAITING_ONLY.value + ' ' + mChip(M.AWAITING_DISPATCH), 'bad');
      /* WO-03 steps 7–8: campaign gaps + the leaks strip, from the same register answer */
      var sp = M.ADS_SPLIT && M.ADS_SPLIT.value;
      if (sp) {
        box.innerHTML += mkT('CAMPAIGN GAPS', String(sp.none), 'no campaign · both-live ' + sp.both + ' · multi ' + sp.multi + ' — Wrong advertising has the rows', sp.none || sp.both || sp.multi ? 'warn' : 'ok');
      }
      var lk = (M.LEAKS_DAILY && M.LEAKS_DAILY.value) || [];
      if (lk.length) {
        var aSum = 0, rSum = 0, mx = 1;
        lk.forEach(function (d2) { aSum += d2.ads; rSum += d2.refunds; mx = Math.max(mx, d2.ads + d2.refunds); });
        var bars = lk.map(function (d2, i) {
          var X = 8 + i * (804 / lk.length), bw2 = Math.max(2, 804 / lk.length - 2);
          var hA = 54 * (d2.ads / mx), hR = 54 * (d2.refunds / mx);
          return '<rect x="' + X.toFixed(1) + '" y="' + (62 - hA).toFixed(1) + '" width="' + bw2.toFixed(1) + '" height="' + hA.toFixed(1) + '" fill="var(--warn)" opacity=".75"><title>' + d2.day + ' — ads £' + d2.ads.toFixed(2) + '</title></rect>' +
            '<rect x="' + X.toFixed(1) + '" y="' + (62 - hA - hR).toFixed(1) + '" width="' + bw2.toFixed(1) + '" height="' + hR.toFixed(1) + '" fill="var(--bad)" opacity=".8"><title>' + d2.day + ' — refunds £' + d2.refunds.toFixed(2) + '</title></rect>';
        }).join('');
        box.innerHTML += '<div class="kpi" style="grid-column:1/-1;--tone:var(--bad)"><div class="kpi-l">LEAKS — ADS SPEND + REFUNDS PER DAY</div>' +
          '<svg viewBox="0 0 820 66" style="width:100%;height:52px;margin-top:6px">' + bars + '</svg>' +
          '<div class="kpi-s">range: ads £' + aSum.toFixed(2) + ' (ads_daily, both families) · refunds £' + rSum.toFixed(2) + ' (shown on the order\u2019s sale day — eBay stores no refund date here)</div></div>';
      }
      return;
    }
    /* old path renders until the register answers */
    var key = r.from + '|' + r.to;
    if (O.pnlKey !== key) {
      O.pnlKey = key; O.pnlCur = null; O.pnlPrev = null;
      box.innerHTML = '<div class="empty">Computing with the P&L brain…</div>';
      var span0 = Math.round((new Date(r.to + 'T12:00:00Z') - new Date(r.from + 'T12:00:00Z')) / 86400000) + 1;
      api('itemPnl', { from: r.from, to: r.to }).then(function (d) {
        if (O.pnlKey !== key) { return; }
        O.pnlCur = (d && d.total) || {};
        oPaintKpis(r);
      }).catch(function (e) { if (O.pnlKey === key) { oFeedFailed('o2Kpis', 'the P&L brain', e); } });
      api('itemPnl', { from: dShift(r.from, -span0), to: dShift(r.from, -1) }).then(function (d) {
        if (O.pnlKey !== key) { return; }
        O.pnlPrev = (d && d.total) || {};
        oPaintKpis(r);
      }).catch(function () {});
      return;
    }
    var cur = O.pnlCur;
    if (!cur) { return; }
    var prev = O.pnlPrev || {};
    var span = Math.round((new Date(r.to + 'T12:00:00Z') - new Date(r.from + 'T12:00:00Z')) / 86400000) + 1;
    function delta(c, p) {
      p = oN(p);
      if (!p) { return '<div class="kpi-d mut">prior: —</div>'; }
      var d = Math.round((oN(c) - p) / Math.abs(p) * 100);
      return '<div class="kpi-d ' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '▲' : '▼') + Math.abs(d) + '% vs prior ' + span + 'd</div>';
    }
    /* ads = both families ex VAT from the books, PLUS today's intraday when the range reaches
       today (the daily report for today only lands overnight) */
    var ads = oN(cur.pri_fees) + oN(cur.gen_ex);
    var adsPrev = oN(prev.pri_fees) + oN(prev.gen_ex);
    if (r.to >= ukToday()) {
      (O.todayLive || []).forEach(function (l) { ads += oN(l.ads); });
    }
    var feesNote = oN(cur.fees_n) < oN(cur.orders_n)
      ? oN(cur.fees_n) + ' of ' + oN(cur.orders_n) + ' orders have real fees so far'
      : 'real eBay fees on every order';
    /* PROFIT INTELLIGENCE — his sheet's exact tiles and vocabulary. All Ads incl VAT = both
       families × 1.2 (the sheet shows ads VAT-inclusive, waste inside); Actual Profit follows
       the central-sheet law: 0.8 × (OE − Ali) − net-of-VAT ads − returns. */
    var adsIncl = ads * 1.2;
    var adsInclPrev = adsPrev * 1.2;
    var margin = oN(cur.revenue) ? (oN(cur.actual_profit) / oN(cur.revenue) * 100) : 0;
    var marginPrev = oN(prev.revenue) ? (oN(prev.actual_profit) / oN(prev.revenue) * 100) : 0;
    var todayLive = O.ov && O.ov.kpis && O.ov.kpis.today;
    /* ROAS (review 3): eBay-attributed ad revenue over ad spend, from the books' ads_rev —
       blended (all revenue ÷ ads) shown beside it so a thin attribution day still reads. */
    var rr = { rev: 0, ads2: 0 };
    var pr = { rev: 0, ads2: 0 };
    var pFrom = dShift(r.from, -span), pTo = dShift(r.from, -1);
    (O.days || []).forEach(function (d0) {
      if (d0.date >= r.from && d0.date <= r.to) { rr.rev += oN(d0.ads_rev); rr.ads2 += oN(d0.ads); }
      if (d0.date >= pFrom && d0.date <= pTo) { pr.rev += oN(d0.ads_rev); pr.ads2 += oN(d0.ads); }
    });
    var roasCur = rr.ads2 > 0.005 ? rr.rev / rr.ads2 : 0;
    var roasPrev = pr.ads2 > 0.005 ? pr.rev / pr.ads2 : 0;
    var blended = rr.ads2 > 0.005 ? oN(cur.revenue) / rr.ads2 : 0;
    box.innerHTML =
      '<div class="kpi" style="--tone:var(--gold-b)"><div class="kpi-l">Sold</div><div class="kpi-v gold">' + oGBP0(cur.revenue) + '</div>' + delta(cur.revenue, prev.revenue) + '<div class="kpi-s">' + oN(cur.orders_n) + ' order(s) in the range</div></div>' +
      '<div class="kpi" style="--tone:var(--ok)"><div class="kpi-l">Actual profit</div><div class="kpi-v' + (oN(cur.actual_profit) < 0 ? '" style="color:var(--bad)' : '') + '">' + oGBP0(cur.actual_profit) + '</div>' + delta(cur.actual_profit, prev.actual_profit) + '<div class="kpi-s">0.8 × (OE − Ali) − ads net − returns — the sheet law</div></div>' +
      '<div class="kpi" style="--tone:var(--blue)"><div class="kpi-l">AliExpress cost</div><div class="kpi-v">' + oGBP0(cur.ali_cost) + '</div>' + delta(cur.ali_cost, prev.ali_cost) + '<div class="kpi-s">the day tabs\u2019 real paid cost</div></div>' +
      '<div class="kpi" style="--tone:var(--warn)"><div class="kpi-l">All ads incl VAT</div><div class="kpi-v">' + oGBP0(adsIncl) + '</div>' + delta(adsIncl, adsInclPrev) + '<div class="kpi-s">waste inside · both families · today intraday included</div></div>' +
      '<div class="kpi" style="--tone:var(--bad)"><div class="kpi-l">Returns</div><div class="kpi-v' + (oN(cur.returns) > 0 ? '" style="color:var(--bad)' : '') + '">' + oGBP0(cur.returns) + '</div>' + delta(cur.returns, prev.returns) + '<div class="kpi-s">real refunds from eBay finances</div></div>' +
      '<div class="kpi" style="--tone:var(--gold-a)"><div class="kpi-l">Margin</div><div class="kpi-v">' + margin.toFixed(2) + '%</div>' + delta(margin, marginPrev) + '<div class="kpi-s">actual profit ÷ sold</div></div>' +
      '<div class="kpi" style="--tone:var(--gold-b)"><div class="kpi-l">ROAS</div><div class="kpi-v' + (roasCur && roasCur < 5 ? '" style="color:var(--warn)' : '') + '">' + (roasCur ? roasCur.toFixed(1) + '×' : '—') + '</div>' + delta(roasCur, roasPrev) + '<div class="kpi-s">eBay-attributed ad £ ÷ ad spend · blended ' + (blended ? blended.toFixed(1) + '×' : '—') + ' · SOP target ≥ 5</div></div>' +
      '<div class="kpi" style="--tone:var(--blue)"><div class="kpi-l">Order earning</div><div class="kpi-v">' + oGBP0(cur.oe) + '</div>' + delta(cur.oe, prev.oe) + '<div class="kpi-s">' + feesNote + '</div></div>' +
      (todayLive ? '<div class="kpi" style="--tone:var(--gold-a)"><div class="kpi-l">Today · live</div><div class="kpi-v gold">' + oGBP0(todayLive.revenue) + '</div><div class="kpi-d mut">' + oN(todayLive.orders) + ' order(s) so far</div><div class="kpi-s">straight from the order feed</div></div>' : '');
  }

  // ---------- alert strip ----------
  function oPaintAlerts() {
    var box = $('o2Alerts');
    if (!box || !O.ov) { return; }
    var dups = O.ov.duplicates || [], losses = O.ov.loss_items || [];
    if (!dups.length && !losses.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
    var h = '';
    losses.slice(0, 2).forEach(function (l) {
      h += '<div>🔻 <b>Selling at a loss:</b> ' + esc(oS(l.title).slice(0, 48) || l.item_id) + ' · ' + esc(oS(l.account)) + ' · <span class="mono">' + esc(oS(l.item_id)) + '</span> · ' + oGBP(l.profit) + ' per unit</div>';
    });
    dups.forEach(function (d) {
      h += '<div>🔴 <b>' + oN(d.n) + ' item(s) in more than one ACTIVE campaign</b> on ' + esc(oS(d.account)) + ' — double ad fees</div>';
    });
    h += '<div style="margin-top:6px"><a href="#" data-o2-nav="campaignWatch">Campaign watch →</a> · <a href="#" data-o2-nav="activeListings">Active listings →</a> · <a href="#" data-o2-nav="signals">Signals →</a></div>';
    box.innerHTML = h; box.style.display = '';
  }

  // ---------- today & yesterday strips ----------
  function oPaintToday() {
    var box = $('o2Today');
    if (!box || !O.ov) { return; }
    function rows(list, val, blue, fmt) {
      var mx = 0;
      list.forEach(function (a) { mx = Math.max(mx, oN(val(a))); });
      if (!list.length) { return '<div class="empty">nothing yet</div>'; }
      var h = '<div class="mini-rows">';
      list.forEach(function (a) {
        var v = oN(val(a));
        h += '<div class="mini-row' + (blue ? ' blue' : '') + '"><span class="n">' + esc(oS(a.account)) + '</span>' +
          '<span class="b"><i style="width:' + (mx ? Math.round(v / mx * 100) : 0) + '%"></i></span>' +
          '<span class="v">' + fmt(v) + '</span></div>';
      });
      return h + '</div>';
    }
    var t = O.ov.today_by_account || [], y = O.ov.yesterday_by_account || [], ad = O.ov.ads_yesterday || [];
    /* Review 3: yesterday's strips speak the BOOKS' brain columns — Actual (T − CPC − returns)
       and ad spend with each account's own ROAS beside it. */
    var yd = dShift(ukToday(), -1);
    var booksY = (O.days || []).filter(function (r0) { return r0.date === yd; });
    if (booksY.length) {
      y = booksY.map(function (r0) { return { account: r0.account, profit: oN(r0.actual) }; })
        .sort(function (a, b) { return b.profit - a.profit; });
      ad = booksY.map(function (r0) { return { account: r0.account, spend: oN(r0.ads), roas: oN(r0.ads) > 0.005 ? oN(r0.ads_rev) / oN(r0.ads) : 0 }; })
        .filter(function (a) { return a.spend > 0; })
        .sort(function (a, b) { return b.spend - a.spend; });
    }
    box.innerHTML =
      '<div class="o-card"><span class="card-t">Today\'s sales — all accounts · live</span>' + rows(t, function (a) { return a.revenue; }, false, oGBP) + '</div>' +
      '<div class="o-card"><span class="card-t">Yesterday\'s ACTUAL profit — per account</span>' + rows(y, function (a) { return a.profit; }, true, oGBP) + '</div>' +
      '<div class="o-card"><span class="card-t">Yesterday\'s ad spend · ROAS — per account</span>' + rows(ad, function (a) { return a.spend; }, true, function (v) {
        var a0 = null;
        ad.forEach(function (x) { if (Math.abs(oN(x.spend) - v) < 0.005 && !a0) { a0 = x; } });
        return oGBP(v) + (a0 && a0.roas ? ' <span style="color:' + (a0.roas < 5 ? 'var(--warn)' : 'var(--ok)') + '">· ' + a0.roas.toFixed(1) + '×</span>' : '');
      }) + '</div>';
  }

  // ---------- live listings ----------
  function oPaintListings() {
    var box = $('o2LL');
    if (!box) { return; }
    if (O.listings === null) { box.innerHTML = '<div class="empty">Loading listings…</div>'; return; }
    var accs = {};
    O.listings.forEach(function (r) { accs[oS(r.account)] = 1; });
    var chips = '<div class="acct-chips" id="o2LLChips"><button class="' + (!O.llAcc ? 'on' : '') + '" data-o2-acc="">All</button>' +
      Object.keys(accs).sort().map(function (a) {
        return '<button class="' + (O.llAcc === a ? 'on' : '') + '" data-o2-acc="' + esc(a).replace(/"/g, '&quot;') + '">' + esc(a) + '</button>';
      }).join('') + '</div>';
    var q = O.llQ.toLowerCase();
    var rows = O.listings.filter(function (r) {
      if (O.llAcc && oS(r.account) !== O.llAcc) { return false; }
      if (q && (oS(r.title) + ' ' + oS(r.item_id)).toLowerCase().indexOf(q) < 0) { return false; }
      return true;
    }).slice(0, 60);
    var h = '<div class="ll-tools"><input id="o2LLQ" placeholder="Search by item ID or title…" value="' + esc(O.llQ).replace(/"/g, '&quot;') + '">' + chips + '</div>' +
      '<div class="o-card scroll" style="padding:0"><table class="ll"><thead><tr><th>Listing</th><th>Account</th><th>Sale price</th><th>AliExpress cost</th><th>Order earning</th><th>Profit</th><th>Ads 14d</th><th>Campaign</th></tr></thead><tbody>';
    if (!rows.length) { h += '<tr><td colspan="8"><div class="empty">No listing matches this filter.</div></td></tr>'; }
    rows.forEach(function (r) {
      h += '<tr><td style="max-width:330px"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(oS(r.title) || '(title syncing)') + '</div><div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(oS(r.item_id)) + '</div></td>' +
        '<td>' + esc(oS(r.account)) + '</td>' +
        '<td class="num">' + oGBP(r.price) + '</td>' +
        '<td class="num">' + (r.ali_cost !== undefined ? oGBP(r.ali_cost) : '—') + '</td>' +
        '<td class="num">' + (r.oe !== undefined && oN(r.oe) ? oGBP(r.oe) : '—') + '</td>' +
        '<td class="num" style="' + (oN(r.profit) < 0 ? 'color:var(--bad);font-weight:800' : 'color:var(--ok);font-weight:700') + '">' + (r.profit !== undefined ? oGBP(r.profit) : '—') + '</td>' +
        '<td class="num">' + (r.ad_spend_14d !== undefined ? oGBP(r.ad_spend_14d) : '—') + '</td>' +
        '<td>' + (oS(r.campaign_type) ? '<span class="campchip">' + esc(oS(r.campaign_type)) + '</span>' : '—') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    box.innerHTML = h;
    var qi = $('o2LLQ');
    if (qi) {
      qi.oninput = function () { O.llQ = this.value; oPaintListings(); var el = $('o2LLQ'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } };
    }
  }

  // ---------- profitability: chart + ranking + tiles ----------
  function oChart(rows, from, to) {
    var days = [];
    for (var d = from; d <= to; d = dShift(d, 1)) { days.push(d); if (days.length > 92) { break; } }
    var byDate = {};
    rows.forEach(function (r) {
      var b = (byDate[r.date] = byDate[r.date] || { sold: 0, profit: 0 });
      b.sold += oN(r.sold);
      /* the green line is ACTUAL (T − ads − returns), the sheet graph's own line — the pre-ads
         profit painted a rosier day than the books ever did. Live today has no actual yet:
         fall back to its running oe − cost. */
      b.profit += (r.actual !== undefined && r.actual !== null && !r._live) ? oN(r.actual) : oN(r.profit);
    });
    var W = 640, H = 190, P = 30;
    var mx = 1;
    days.forEach(function (d) { var b = byDate[d]; if (b) { mx = Math.max(mx, b.sold); } });
    function X(i) { return P + i * (W - P - 8) / Math.max(1, days.length - 1); }
    function Y(v) { return H - 22 - (v / mx) * (H - 40); }
    var pRev = '', pProf = '';
    days.forEach(function (d, i) {
      var b = byDate[d] || { sold: 0, profit: 0 };
      pRev += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(b.sold).toFixed(1) + ' ';
      pProf += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(Math.max(0, b.profit)).toFixed(1) + ' ';
    });
    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var gy = H - 22 - g * (H - 40) / 4;
      grid += '<line class="gridln" x1="' + P + '" y1="' + gy.toFixed(1) + '" x2="' + (W - 8) + '" y2="' + gy.toFixed(1) + '"/>' +
        '<text class="axis" x="2" y="' + (gy + 3).toFixed(1) + '">' + oGBP0(mx * g / 4) + '</text>';
    }
    var ticks = '';
    [0, Math.floor(days.length / 2), days.length - 1].forEach(function (i) {
      if (days[i]) { ticks += '<text class="axis" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + days[i].slice(5) + '</text>'; }
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + grid + ticks +
      '<path d="' + pRev + 'L' + X(days.length - 1).toFixed(1) + ' ' + (H - 22) + ' L' + P + ' ' + (H - 22) + ' Z" fill="rgba(233,169,60,.12)"/>' +
      '<path d="' + pRev + '" fill="none" stroke="var(--gold-a)" stroke-width="2"/>' +
      '<path d="' + pProf + '" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="1 0"/>' +
      '</svg>' +
      '<div class="legend"><span><i style="background:var(--gold-a)"></i>Revenue / day</span><span><i style="background:var(--ok)"></i>Actual profit / day</span></div>';
  }

  function oPaintProfit(r) {
    var box = $('o2Profit');
    if (!box) { return; }
    if (O.days === null) { box.innerHTML = '<div class="empty">Loading…</div>'; return; }
    var rows = oRows(r.from, r.to);
    if (O.pMode === 'acct' && O.pAcc) { rows = rows.filter(function (x) { return oS(x.account) === O.pAcc; }); }
    var span = Math.round((new Date(r.to + 'T12:00:00Z') - new Date(r.from + 'T12:00:00Z')) / 86400000) + 1;
    var prevRows = oRows(dShift(r.from, -span), dShift(r.from, -1));
    var accs = {};
    oRows(r.from, r.to).forEach(function (x) {
      var a = (accs[oS(x.account)] = accs[oS(x.account)] || { cur: 0, prev: 0, profit: 0 });
      a.cur += oN(x.sold); a.profit += oN(x.profit);
    });
    prevRows.forEach(function (x) { var a = accs[oS(x.account)]; if (a) { a.prev += oN(x.sold); } });
    var names = Object.keys(accs).sort(function (a, b) { return accs[b].cur - accs[a].cur; });
    var mx = names.length ? accs[names[0]].cur : 1;
    var chips = '<div class="acct-chips" style="margin-bottom:12px;' + (O.pMode === 'acct' ? '' : 'display:none') + '" id="o2PChips">' +
      names.map(function (a) { return '<button class="' + (O.pAcc === a ? 'on' : '') + '" data-o2-pacc="' + esc(a).replace(/"/g, '&quot;') + '">' + esc(a) + '</button>'; }).join('') + '</div>';
    var rank = '<div class="rank">' + names.map(function (a, i) {
      var d = accs[a], pct = d.prev ? Math.round((d.cur - d.prev) / d.prev * 100) : null;
      return '<div class="rank-row' + (i === 0 ? ' top' : '') + '"><span class="rank-n">' + (i + 1) + '</span>' +
        '<span class="rank-name">' + esc(a) + '</span>' +
        '<span class="rank-bar"><i style="width:' + (mx ? Math.round(d.cur / mx * 100) : 0) + '%"></i></span>' +
        '<span class="rank-v">' + oGBP0(d.cur) + '</span>' +
        '<span class="rank-d ' + (pct === null ? '' : pct >= 0 ? 'up' : 'dn') + '">' + (pct === null ? '—' : (pct >= 0 ? '▲' : '▼') + Math.abs(pct) + '%') + '</span></div>';
    }).join('') + '</div>';
    var t = oSum(rows);
    var tiles = '<div class="tiles-mini">' +
      '<div class="tile"><b>Revenue</b><span>' + oGBP0(t.sold) + '</span></div>' +
      '<div class="tile"><b>Profit est</b><span>' + oGBP0(t.profit) + '</span></div>' +
      '<div class="tile"><b>Ads</b><span>' + oGBP0(t.ads) + '</span></div>' +
      '<div class="tile"><b>Ali cost</b><span>' + oGBP0(t.cost) + '</span></div>' +
      '<div class="tile"><b>Margin est</b><span>' + (t.sold ? (t.profit / t.sold * 100).toFixed(1) + '%' : '—') + '</span></div></div>';
    box.innerHTML = chips + '<div class="split"><div class="o-card"><div class="chart-wrap">' + oChart(rows, r.from, r.to) + '</div></div>' +
      '<div class="o-card">' + rank + '</div></div>' + tiles;
  }

  // ---------- advertising: gauge + rows ----------
  function oGauge(roas) {
    var W = 190, H = 110, cx = 95, cy = 100, R = 78;
    var frac = roas === null ? 0 : Math.max(0, Math.min(1, roas / 10));
    var ang = Math.PI * (1 - frac);
    var nx = cx + R * 0.82 * Math.cos(ang), ny = cy - R * 0.82 * Math.sin(ang);
    function arc(f0, f1, color) {
      var a0 = Math.PI * (1 - f0), a1 = Math.PI * (1 - f1);
      return '<path d="M' + (cx + R * Math.cos(a0)).toFixed(1) + ' ' + (cy - R * Math.sin(a0)).toFixed(1) +
        ' A' + R + ' ' + R + ' 0 0 1 ' + (cx + R * Math.cos(a1)).toFixed(1) + ' ' + (cy - R * Math.sin(a1)).toFixed(1) +
        '" fill="none" stroke="' + color + '" stroke-width="12" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="max-width:210px">' +
      arc(0, 0.3, 'var(--bad)') + arc(0.32, 0.5, 'var(--warn)') + arc(0.52, 1, 'var(--ok)') +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx.toFixed(1) + '" y2="' + ny.toFixed(1) + '" stroke="var(--text)" stroke-width="3"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="var(--text)"/>' +
      '<text class="axis" x="10" y="' + (H - 2) + '">0</text><text class="axis" x="' + (cx - 6) + '" y="14">5</text><text class="axis" x="' + (W - 22) + '" y="' + (H - 2) + '">10+</text></svg>';
  }

  function oPaintAds() {
    var box = $('o2Ads');
    if (!box || !O.ov) { return; }
    var ads = O.ov.ads_yesterday || [];
    var spend = 0, rev = 0;
    ads.forEach(function (a) { spend += oN(a.spend); rev += oN(a.revenue); });
    var roas = spend > 0 ? rev / spend : null;
    var rows = ads.map(function (a) {
      return '<div class="mini-row blue"><span class="n">' + esc(oS(a.account)) + '</span>' +
        '<span class="b"><i style="width:' + (spend ? Math.round(oN(a.spend) / spend * 100) : 0) + '%"></i></span>' +
        '<span class="v">' + oGBP(a.spend) + '</span>' +
        '<span class="rank-d ' + (a.roas === null ? '' : a.roas >= 5 ? 'up' : 'dn') + '" style="min-width:64px">ROAS ' + (a.roas === null ? '—' : oN(a.roas).toFixed(1)) + '</span></div>';
    }).join('');
    /* R7-8 (Hasib): organic vs promoted sales "everywhere" — the 7-day split on the home. */
    var sp = O.ov.split_7d || {}, splitCard = '';
    if (oN(sp.total_rev) > 0) {
      var pPct = Math.max(0, Math.min(100, oN(sp.promoted_pct)));
      /* The card is rollup-only on purpose (promoted revenue needs ads_rev, which today's live
         orders have not got yet). Say the window out loud — an unlabelled "last 7 days" here
         next to a live "last 7 days" tile is what made the two totals look like a bug. */
      var spThrough = sp.through ? ' \u00b7 through ' + esc(String(sp.through)) : '';
      splitCard = '<div class="o-card" style="margin-top:12px"><span class="card-t">Organic vs promoted sales \u00b7 settled days' + spThrough + '</span>' +
        '<div class="ov-splitbar"><i style="width:' + pPct + '%"></i></div>' +
        '<div class="ov-splitlg"><span><b style="color:var(--gold-a)">Promoted</b> ' + oGBP(sp.promoted_rev) + ' · ' + pPct.toFixed(1) + '%</span>' +
        '<span><b style="color:var(--ok,#2fb170)">Organic</b> ' + oGBP(sp.organic_rev) + ' · ' + (100 - pPct).toFixed(1) + '%</span>' +
        '<span style="margin-left:auto;color:var(--text-3);font-weight:800">Total ' + oGBP(sp.total_rev) + '</span></div>' +
        '<div class="kpi-s" style="margin-top:8px">promoted = eBay-attributed ad revenue; organic is the rest' +
          (sp.basis ? ' \u00b7 ' + esc(String(sp.basis)) : '') + '</div></div>';
    }
    box.innerHTML = '<div class="split"><div class="o-card"><span class="card-t">Yesterday per account · real spend</span>' +
      '<div class="mini-rows">' + (rows || '<div class="empty">No spend recorded yesterday — two accounts still need the marketing re-consent.</div>') + '</div></div>' +
      '<div class="o-card"><div class="gauge-wrap">' + oGauge(roas) +
      '<div class="g-side"><b>Blended ROAS yesterday</b><span>' + (roas === null ? '—' : roas.toFixed(1)) + '</span>' +
      '<b style="margin-top:8px">SOP target</b><span>≥ 5</span></div></div>' +
      '<div class="kpi-s" style="margin-top:10px">revenue ÷ real ad spend · per-item attribution lands with the fee feed</div></div></div>' + splitCard;
  }

  // ---------- returns & cases ----------
  function oPaintCases() {
    var box = $('o2Cases');
    if (!box || !O.cs) { return; }
    var open = O.cs.open || [];
    var per = {};
    open.forEach(function (c) {
      var p = (per[oS(c.account)] = per[oS(c.account)] || { n: 0 });
      p.n++;
    });
    var names = Object.keys(per).sort(function (a, b) { return per[b].n - per[a].n; });
    var mx = names.length ? per[names[0]].n : 1;
    var rows = names.map(function (a) {
      return '<div class="mini-row"><span class="n">' + esc(a) + '</span>' +
        '<span class="b"><i style="width:' + Math.round(per[a].n / mx * 100) + '%"></i></span>' +
        '<span class="v">' + per[a].n + ' open</span></div>';
    }).join('');
    var table = '<table class="cases-table"><thead><tr><th>Kind</th><th>Account</th><th>Item / buyer</th><th>What eBay records</th><th>Respond by</th></tr></thead><tbody>' +
      open.slice(0, 8).map(function (c) {
        var kind = oS(c.kind);
        var due = '';
        try { due = oS((JSON.parse(c.payload_json || '{}').respondByDate || {}).value || '').slice(0, 10); } catch (e) {}
        return '<tr><td><span class="tag ' + (kind === 'CASE' ? 'inad' : kind === 'RETURN' ? 'ret' : 'open') + '">' + esc(kind) + '</span></td>' +
          '<td>' + esc(oS(c.account)) + '</td>' +
          '<td><span class="mono">' + esc(oS(c.item_id)) + '</span><div style="font-size:10.5px;color:var(--text-3)">' + esc(oS(c.buyer)) + '</div></td>' +
          '<td style="max-width:300px">' + esc(oS(c.reason).slice(0, 90)) + '</td>' +
          '<td class="num">' + (due || '—') + '</td></tr>';
      }).join('') + '</tbody></table>';
    box.innerHTML = '<div class="split"><div class="o-card"><span class="card-t">Open per account · live from eBay</span><div class="mini-rows">' + (rows || '<div class="empty">Nothing open ✓</div>') + '</div>' +
      '<div style="margin-top:10px"><a href="#" data-o2-nav="csDesk" class="primary-tag">OPEN THE CS DESK →</a></div></div>' +
      '<div class="o-card scroll" style="padding:10px">' + table + '</div></div>';
  }

  // ---------- health ----------
  function oPaintHealth() {
    var box = $('o2Health');
    if (!box || !O.ov) { return; }
    var h = '<div class="health">';
    (O.ov.health || []).forEach(function (a) {
      var quiet = !oN(a.orders_7d);
      var dot = oN(a.loss_items) ? 'h-bad' : quiet ? 'h-warn' : 'h-ok';
      h += '<div class="h-card"><div class="hn"><span class="h-dot ' + dot + '"></span>' + esc(oS(a.account)) + '</div><div class="h-rows">' +
        '<div><span>Active listings</span><b>' + oN(a.listings) + '</b></div>' +
        '<div><span>Orders 7d</span><b>' + oN(a.orders_7d) + '</b></div>' +
        '<div><span>Revenue 7d</span><b>' + oGBP0(a.revenue_7d) + '</b></div>' +
        '<div><span>Campaigns running</span><b>' + oN(a.campaigns_running) + ' / ' + oN(a.campaigns_total) + '</b></div>' +
        (oN(a.loss_items) ? '<div><span style="color:var(--bad)">Loss items</span><b style="color:var(--bad)">' + oN(a.loss_items) + '</b></div>' : '') +
        (quiet ? '<div><span style="color:var(--warn)">No orders this week</span><b style="color:var(--warn)">check it</b></div>' : '') +
        '</div></div>';
    });
    h += '</div>';
    box.innerHTML = h;
  }

  VIEWS.overview = {
    label: 'Business overview',
    order: 2,
    roles: ['Management', 'Ops Head'],
    icon: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
    prefetch: function () { return api('dailyReport', {}).then(function (d) { if (typeof cacheWrite === 'function') { cacheWrite('dailyReport', {}, d); } }); },
    render: function () {
      return '<div class="ov2">' +
        '<div class="hgroup enter d1"><h1>Business <span class="goldtext">overview</span></h1>' +
          '<span class="sub">Management · all accounts · every number has a live feed behind it</span>' +
          '<button class="minibtn" id="o2Refresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="dates enter d1"><div class="seg" id="o2Seg">' +
          /* chips render FROM O.mode — the state survives navigation, so static markup lies */
          [['today', 'Today'], ['yday', 'Yesterday'], ['d7', '7 days'], ['d30', '30 days']].map(function (p) {
            return '<button data-o2-mode="' + p[0] + '"' + (O.mode === p[0] ? ' class="on"' : '') + '>' + p[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="custom"><label>FROM</label><input type="date" id="o2From"><label>TO</label><input type="date" id="o2To">' +
          '<button class="btn-p" id="o2Apply">Apply</button></div>' +
          '<div class="range-label" id="o2RangeLbl"></div></div>' +
        '<div class="alerts enter d1" id="o2Alerts" style="display:none"></div>' +
        '<div class="sec enter d1"><div class="sec-h"><h2>Right now — everything combined</h2><span class="hint">one pulse across every board · click a tile to open its board</span></div><div id="o2Pulse"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d2"><div class="sec-h"><h2>Collective — all accounts</h2><span class="hint">recomputed for the chosen range · deltas vs the prior window</span></div><div class="kpis" id="o2Kpis"></div></div>' +
        '<div class="sec enter d2"><div class="sec-h"><h2>Account ratings</h2><span class="hint">eBay\u2019s own seller standards · defect rate · late shipment · cases without seller resolution</span></div><div class="tiles-mini" id="o2Ratings" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d2"><div class="sec-h"><h2>Money — funds &amp; VAT</h2><span class="hint">your funds live from eBay\u2019s own Finances · VAT by the calculator\u2019s HMRC line, month to date</span></div><div class="today" id="o2Money"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d2"><div class="sec-h"><h2>Today &amp; yesterday</h2><span class="hint" id="o2Stamp">live pulse per account</span></div><div class="today" id="o2Today"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d3"><div class="sec-h"><h2>Live listings — current data</h2><span class="primary-tag">THE PORTAL\'S PRIMARY PURPOSE</span><span class="hint">profit · price · AliExpress cost · per-item ads — role-scoped server-side</span></div><div id="o2LL"></div></div>' +
        '<div class="sec enter d3"><div class="sec-h"><h2>Profitability</h2><span class="hint">computed from the daily books over the chosen range</span>' +
          '<div class="tools"><div class="mode" id="o2Mode"><button data-o2-pmode="all" class="on">All accounts</button><button data-o2-pmode="acct">Account to account</button></div></div></div><div id="o2Profit"></div></div>' +
        '<div class="sec enter d3"><div class="sec-h"><h2>Advertising dashboard</h2><span class="hint">judged against the SOP main target — ROAS ≥ 5</span></div><div id="o2Ads"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d3"><div class="sec-h"><h2>Returns, refunds &amp; cases</h2><span class="hint">live from eBay via the Engine</span></div><div id="o2Cases"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d3"><div class="sec-h"><h2>Account health</h2><span class="hint">live Engine numbers · loss items red · quiet accounts amber</span></div><div id="o2Health"><div class="empty">Loading…</div></div></div>' +
        '<div class="sec enter d3"><div class="sec-h"><h2>Staff performance</h2><span class="hint">this week · from the portal\'s own activity ledger · management excluded</span></div><div id="o2Staff"><div class="empty">Loading…</div></div></div>' +
        '</div>';
    },
    init: function () {
      /* "graphs are not getting updated" (owner, 30 Aug): the screen fetched ONCE and then sat
         still all day. It re-pulls every feed every 5 minutes while this view is on screen and
         the tab is visible; navigation away stops it. */
      clearInterval(O.tick);
      O.tick = setInterval(function () {
        if (!document.querySelector('.ov2') || document.hidden) { return; }
        oFetchAll();
      }, 300000);
      var root = document.querySelector('.ov2');
      if (root) {
        root.onclick = function (ev) {
          var t = ev.target;
          var nav = t && t.closest ? t.closest('[data-o2-nav]') : null;
          if (nav) { ev.preventDefault(); var all = document.querySelectorAll('.nav a'); for (var j = 0; j < all.length; j++) { all[j].classList.toggle('on', all[j].dataset.key === nav.getAttribute('data-o2-nav')); } renderView(nav.getAttribute('data-o2-nav')); return; }
          var seg = t && t.closest ? t.closest('[data-o2-mode]') : null;
          if (seg) {
            O.mode = seg.getAttribute('data-o2-mode');
            var bs = document.querySelectorAll('#o2Seg button');
            for (var i = 0; i < bs.length; i++) { bs[i].classList.toggle('on', bs[i] === seg); }
            oPaintDated(); return;
          }
          var pm = t && t.closest ? t.closest('[data-o2-pmode]') : null;
          if (pm) {
            O.pMode = pm.getAttribute('data-o2-pmode');
            var ms = document.querySelectorAll('#o2Mode button');
            for (var k = 0; k < ms.length; k++) { ms[k].classList.toggle('on', ms[k] === pm); }
            if (O.pMode === 'acct' && !O.pAcc && O.days && O.days.length) { O.pAcc = oS(O.days[0].account); }
            oPaintDated(); return;
          }
          var pa = t && t.closest ? t.closest('[data-o2-pacc]') : null;
          if (pa) { O.pAcc = pa.getAttribute('data-o2-pacc'); oPaintDated(); return; }
          var la = t && t.closest ? t.closest('[data-o2-acc]') : null;
          if (la) { O.llAcc = la.getAttribute('data-o2-acc'); oPaintListings(); return; }
        };
      }
      var ap = $('o2Apply');
      if (ap) {
        ap.onclick = function () {
          var f = $('o2From'), t2 = $('o2To');
          if (f && t2 && f.value && t2.value) {
            O.mode = 'custom'; O.from = f.value; O.to = t2.value;
            var bs = document.querySelectorAll('#o2Seg button');
            for (var i = 0; i < bs.length; i++) { bs[i].classList.remove('on'); }
            oPaintDated();
          } else { toast('Pick both dates first.'); }
        };
      }
      if (O.mode === 'custom') { /* returning to a custom range: show its dates in the pickers */
        var f0 = $('o2From'), t0 = $('o2To');
        if (f0 && O.from) f0.value = O.from;
        if (t0 && O.to) t0.value = O.to;
      }
      var rf = $('o2Refresh');
      if (rf) { rf.onclick = function () { O.days = null; O.ov = null; O.listings = null; O.cs = null; oFetchAll(); oPulse(); }; }
      oFetchAll();
      oPulse();
    }
  };

  /* Hasib's closing line: "management home shows everything combined". One Engine read, every
     headline across every board — each tile deep-links to the board that owns the number. */
  function oPulse() {
    var box = $('o2Pulse');
    if (!box) { return; }
    api('mgmtPulse', {}).then(function (d) {
      d = d || {};
      var gbp = function (v) { return '£' + (Number(v) || 0).toFixed(2); };
      var t = function (view, label, val, sub, bad) {
        return '<a href="#' + view + '" style="text-decoration:none;color:inherit">' +
          '<div class="ac-tile' + (bad ? ' bad' : '') + '"><div class="k">' + label + '</div>' +
          '<div class="v">' + val + '</div>' +
          (sub ? '<div style="font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:3px">' + sub + '</div>' : '') +
          '</div></a>';
      };
      box.innerHTML = '<div class="ac-tiles">' +
        t('ordersBoard', 'Orders today', d.orders_today, gbp(d.revenue_today) + ' revenue') +
        t('ordersBoard', 'Overdue dispatch', d.overdue, d.awaiting + ' open orders', Number(d.overdue) > 0) +
        t('adsCentre', 'Ad spend today', gbp(d.ad_spend_today), d.ad_sold_today + ' sold via ads') +
        t('adsCentre', 'Wasting £3+ today', d.waste_n, 'no order yet', Number(d.waste_n) > 0) +
        t('traffic', 'Impressions · ' + (d.traffic_date ? esc(String(d.traffic_date).slice(5)) : 'latest'), (Number(d.impressions_today) >= 10000 ? (d.impressions_today / 1000).toFixed(1) + 'k' : d.impressions_today), d.views_today + ' listing views · eBay trails a day') +
        t('listingDecisions', 'Zero-sale decisions', d.zero_sale_pending, 'waiting on Management', Number(d.zero_sale_pending) > 0) +
        t('campaignWatch', 'Campaign gaps', (Number(d.uncampaigned) || 0) + ' / ' + (Number(d.duplicates) || 0), 'no campaign / duplicated', Number(d.duplicates) > 0) +
        t('alerts', 'Letters · 48h', d.letters_open,
          Number(d.letters_backlog) > Number(d.letters_open)
            ? Number(d.letters_backlog).toLocaleString('en-GB') + ' unread in total'
            : 'the Engine’s own bells', Number(d.letters_open) > 0) +
        t('activeListings', 'Active listings', d.active_listings, 'all accounts') +
      '</div>';
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">The pulse could not load: ' + esc(e.message) + '</div>';
    });
  }
})();
