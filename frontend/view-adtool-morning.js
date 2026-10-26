/* view-adtool-morning.js — Advertising Tool · Overview (was Today at a glance, with What to do today's period figures;
 * owner, 27 Oct), Alerts, Past Situation (was Yesterday's report, with the day's advertising signals), ROAS target, Data health
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
    '.mo-hours{display:grid;grid-template-columns:repeat(24,1fr);gap:2px;align-items:end;height:90px}' +
    '.mo-hours .h{background:var(--gold-b);border-radius:2px 2px 0 0;min-height:1px}.mo-hours .h.under{background:#e0563f}.mo-hours .lab{font-size:9px;color:var(--text-3);text-align:center}' +
    /* Phase 4 alerts: five labelled lines + an urgency pill (overdue = loss colour, now = gold, soon = pale gold, watch = muted) */
    '.mo-urg{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap;vertical-align:middle}' +
    '.mo-urg.overdue{color:#fff;background:#e0563f;border-color:#e0563f}.mo-urg.now{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b)}.mo-urg.soon{color:var(--gold-a);border-color:rgba(242,176,53,.45);background:rgba(242,176,53,.1)}.mo-urg.watch{color:var(--text-2)}' +
    '.mo-line{display:grid;grid-template-columns:104px 1fr;gap:8px;font-size:12px;margin-top:5px;align-items:start}' +
    '.mo-line .lb{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;padding-top:1px}.mo-line .vl{color:var(--text-2)}' +
    '.mo-nums{display:flex;gap:5px;flex-wrap:wrap}.mo-nums .n{font-size:10.5px;color:var(--text-2);background:var(--panel-2);border:1px solid var(--gold-line);border-radius:6px;padding:1px 7px}.mo-nums .n b{color:var(--text);font-weight:800}'
  );
  /* ONE money format across the four advertising view files: thousands separated, two decimals
     unless the caller asks for fewer. The same figure must not read £1,234 on one page and
     £1234.00 on the next. This function is byte-identical in view-adtool-analytics.js,
     view-adtool-overview.js and view-adtool-product.js — change one and change all four.
     Pence are for per-item money and for part-day figures; a finished fleet or account total over a
     window is called with 0. */
  function gbp(v, d) {
    if (v == null || v === '' || isNaN(Number(v))) return '—';
    var n = Number(v), p = d == null ? 2 : Number(d);
    return (n < 0 ? '−£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: p, maximumFractionDigits: p });
  }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'an-neg' : Number(v) > 0 ? 'an-pos' : ''); }
  /* `t` is the LOOKUP key the register box matches on and must stay stable when the wording changes;
     `shown` is what the reader sees. Rewording arg 1 silently empties the box, so reword arg 2. */
  function src(t, shown) { return '<span class="an-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function hg(t, s) { return '<div class="hgroup enter d1"><h1>' + esc(t) + '</h1><span class="sub">' + esc(s) + '</span></div>'; }
  function fail(id, e) { $(id).innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'failed') + '</div></div>'; }
  function kpi(k, v, d, c) { return '<div class="an-kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (c || '') + '">' + v + '</div><div class="d">' + d + '</div></div>'; }
  function ago(t) { if (!t) return 'never'; var ms = Date.now() - new Date(String(t).replace(' ', 'T') + (String(t).endsWith('Z') ? '' : 'Z')).getTime(); if (isNaN(ms)) return esc(String(t).slice(0, 16)); var m = Math.round(ms / 60000); return m < 60 ? m + ' min ago' : (m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'); }

  /* ── Phase 4 alert pieces ──────────────────────────────────────────────────────────────────
     Each alert reads as five plain lines — what happened, where, why it matters, what to do, how
     urgent — off the engine's new fields (what / why_matters / do / urgency / hours_open), falling
     back to the old payload shape so an older engine still draws. Numbers come from the payload as
     'label value' pairs, never a raw snake_case key or a JSON blob. */
  var NUM_LABEL = { spend: 'Spend', roas: 'ROAS', cpc: 'CPC', cvr: 'Conversion rate', clicks: 'Clicks', attr_units: 'Units from ads', attr_revenue: 'Sales from ads', revenue: 'Revenue', units: 'Units', orders: 'Orders', actual_profit: 'Profit', profit: 'Profit', d7: '7 d', d30: '30 d', d14: '14 d', spend_7d: '7-day spend', spend_30d: '30-day spend', be: 'Break-even', breakeven: 'Break-even', breakeven_roas: 'Break-even', margin: 'Margin', pending: 'Not costed yet', pending_cost_orders: 'No cost yet', pending_fee_orders: 'No fees yet', days: 'Days', slope28: 'Trend', level28: 'Units/day', share: 'Share', cost: 'Cost', bid: 'Ad rate', budget: 'Budget' };
  function humanKey(k) { return NUM_LABEL[k] || String(k).replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }
  function fmtNum(k, v) { if (v == null || v === '') return '—'; var n = Number(v); if (isNaN(n)) return String(v); if (/roas|(^|_)be$|breakeven/.test(k)) return n.toFixed(2) + '×'; if (/spend|profit|revenue|cpc|margin|attr_revenue|cost|budget/.test(k)) return gbp(n); if (/cvr|share|_pct$|percent/.test(k)) return (Math.round(n * 1000) / 10) + '%'; if (/slope/.test(k)) return (n > 0 ? '+' : '') + n + ' %/day'; return String(v); }
  function payloadPairs(p) {
    var pairs = [], skip = { rule_text: 1, suggested: 1, title: 1, why_matters: 1, what: 1, where: 1, 'do': 1, image: 1, account: 1, item_id: 1 };
    Object.keys(p || {}).forEach(function (k) {
      if (skip[k]) return; var v = p[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) { Object.keys(v).forEach(function (k2) { if (v[k2] == null || v[k2] === '') return; pairs.push([humanKey(k) + ' ' + humanKey(k2).toLowerCase(), fmtNum(k2, v[k2])]); }); }
      else if (!Array.isArray(v) && v != null && v !== '') { pairs.push([humanKey(k), fmtNum(k, v)]); }
    });
    return pairs;
  }
  function alSev(a) { return String(a.sev || a.severity || 'low'); }
  function alUrgency(a) { if (a.urgency) return String(a.urgency).toLowerCase(); var s = alSev(a).toLowerCase(); if (s === 'high' && Number(a.hours_open) > 24) return 'overdue'; return s === 'high' ? 'now' : s === 'medium' ? 'soon' : 'watch'; }
  function urgencyText(u) { return u === 'overdue' ? 'a high alert open more than a day, clear it today' : u === 'now' ? 'act today' : u === 'soon' ? 'act this week' : 'keep an eye on it'; }
  function openText(a) { if (a.hours_open != null && !isNaN(Number(a.hours_open))) { var hh = Number(a.hours_open); return hh < 24 ? Math.round(hh) + ' h' : Math.round(hh / 24) + ' d'; } return a.fired_at ? ago(a.fired_at) : '—'; }
  function moLine(lb, vl) { return '<div class="mo-line"><div class="lb">' + esc(lb) + '</div><div class="vl">' + vl + '</div></div>'; }

  /* ---------------- Overview (owner, 27 Oct) ----------------
     "What to do today" and "Today at a glance" merged under one title, in the order the owner's sheet
     lays it out: the period bar, the account chips and the six period figures that opened What to do
     today; then today so far, yesterday, the last 7 and 30 days, yesterday's rates, today by account
     and today so far by slot, as Today at a glance drew them; then ONE hourly chart where the two
     hour-by-hour charts were (money spent in red beside orders received in green, every UK hour of the
     day); and "How up to date this is" closes the page.
     Taken off on the owner's word, each with a pointer to where it still lives: listings spending today
     (Ads command centre carries every listing for today and the last 3, 7 and 14 days), fleet ad spend
     by date, and What to do today's account-to-account, day-by-day and how-far-it-is-worth-spending
     panels. The period figures are What to do today's own (adtoolPlan, drawn by the function
     view-adtool-plan.js exports), the today figures adtoolCommand's: two answers asked in parallel and
     drawn apart, so the slower one never holds the other back. The account chips steer both;
     adtoolCommand has always taken an account. */
  var CM = { data: null, today: null, plan: null, account: '', accounts: [], period: null, seqCmd: 0, seqHero: 0 };
  /* the hourly chart's two colours: red and green as the owner asked, stepped so a red-green
     colour-blind reader still tells them apart (validated against this panel's own surface), and
     never the only cue — red is always the left bar of the pair and every bar carries its figure */
  var OV_SPEND = '#bd3d2d', OV_ORDERS = '#26ae6c';
  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  /* the engine's contract key is `tiles` (Phase 1B); `windows` / top-level are older engines */
  function cmWin(D, k) { var w = (D.tiles && D.tiles[k]) || (D.windows && D.windows[k]) || D[k] || null; return w && typeof w === 'object' ? w : null; }
  function cmRoas(w) { if (!w) return null; if (w.roas != null) return num(w.roas); var s = num(w.spend), r = num(w.attr_revenue); return s > 0 && r != null ? r / s : null; }
  function cmSum(rows, k) { return rows.reduce(function (t, r) { return t + (num(r[k]) || 0); }, 0); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* the hourly pills: pence under £10, so one account's quiet hour reads £0.42 rather than a "£0" sitting on a bar
     that is visibly not zero; whole pounds above, where pence would only crowd the pill */
  function ovMoney(v) { var n = Number(v) || 0, a = Math.abs(n); return a > 0 && a < 10 ? (n < 0 ? '−£' : '£') + a.toFixed(2) : chartMoney(n); }
  function ukHourNow() { try { return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date())) % 24; } catch (e) { return new Date().getUTCHours(); } }
  VIEWS.adtoolCommand = {
    label: 'Overview (ads)', hidden: true, order: 94, roles: ROLES, icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    render: function () {
      return '<div class="an-wrap">' + adtHgroup('Overview', 'The period you pick, then today across every account, hour by hour', 'moCmdFresh') +
        '<div id="ovBar"></div><div id="ovAcct" class="wr-acct"></div>' +
        '<div id="ovHero"><div class="an-empty">Loading…</div></div>' +
        '<div id="moCmd"><div class="an-empty">Loading…</div></div></div>';
    },
    init: function () {
      /* remembered under What to do today's key, so the window picked there carries straight over */
      CM.period = adtPeriodBar('ovBar', { page: 'adtoolPlan', def: 'd30', onChange: function (v) { CM.period = v; loadHero(false).catch(function () {}); } });
      ovChips();
      loadCmd(false).catch(function () {});
      loadHero(false).catch(function () {});
      /* live while the tab is open: hidden tabs wait, an expired session stops it (session-expiry law).
         The period figures move only while the window reaches into today. */
      adtPoll('moCmd', 300000, function () {
        var p = loadCmd(true);
        /* the period figures failing must never count against the poller, or ten of them would stop today's
           figures refreshing too: only the today read decides whether the page is still live */
        return adtIncludesToday(CM.plan && CM.plan.period, CM.period) ? Promise.all([p, loadHero(true).catch(function () {})]) : p;
      });
    }
  };
  function ovChips() {
    var el = $('ovAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (CM.account ? '' : 'on') + '" data-a="">All accounts</button>' + CM.accounts.map(function (a) { return '<button class="' + (CM.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      var a = this.getAttribute('data-a'); if (a === CM.account) return;
      CM.account = a; ovChips();
      loadHero(false).catch(function () {}); loadCmd(false).catch(function () {});
    };
  }
  function ovAccounts(list) {
    var names = (list || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (names.length) { CM.accounts = names; ovChips(); }
  }
  /* each answer is drawn only if it is still the newest one asked for, so a slow answer for the account
     clicked a moment ago can never paint over the account clicked since */
  function loadHero(quiet) {
    var my = ++CM.seqHero;
    var p = adtPeriodParams(CM.period); if (CM.account) p.account = CM.account;
    return api('adtoolPlan', p).then(function (d) {
      if (my !== CM.seqHero) return;
      CM.plan = d || {};
      ovAccounts(d && d.accounts);
      if (!$('ovHero')) return;
      $('ovHero').innerHTML = typeof window.adtPlanHeroHtml === 'function' ? window.adtPlanHeroHtml(CM.plan) : '';
      adtPeriodEcho('ovBar', d && d.period);
    }).catch(function (e) {
      if (my !== CM.seqHero) return;
      if (!quiet && $('ovHero')) $('ovHero').innerHTML = '<div class="an-panel"><h3>The period figures did not load</h3><div class="an-sub">' + esc(e && e.message || 'They could not load.') + ' Today\'s figures below are not affected.</div></div>';
      throw e;
    });
  }
  function loadCmd(quiet) {
    /* ONE request. adtoolCommand runs the today computation inside the engine and forwards all of it,
       totals_by_account included (engine added 14 Oct), so every today figure on this page comes off
       that single answer. drawCmd still falls back to a second answer if one is ever passed. */
    var my = ++CM.seqCmd;
    var p = CM.account ? { account: CM.account } : {};
    return api('adtoolCommand', p).then(function (d) {
      if (my !== CM.seqCmd) return;
      CM.data = d || {}; CM.today = null;
      if (!CM.accounts.length && CM.data.totals_by_account) ovAccounts(CM.data.totals_by_account.map(function (a) { return a && a.account; }).filter(Boolean).sort());
      if ($('moCmd')) drawCmd();
      /* The page cache can still hold an answer written before the engine began forwarding
         totals_by_account, for as long as that entry lives. Ask for it ONLY when the field is
         actually absent, and redraw. In the normal case this never fires. */
      if (!CM.data.totals_by_account) {
        return api('adtoolToday', p).then(function (t) {
          if (my !== CM.seqCmd) return;
          CM.today = t || null; if ($('moCmd')) drawCmd();
        }).catch(function () { /* the table simply stays empty until the cached answer expires */ });
      }
    }).catch(function (e) { if (my !== CM.seqCmd) return; if (!quiet) fail('moCmd', e); throw e; });
  }
  function drawCmd() {
    var D = CM.data, T = CM.today || null;
    var y = cmWin(D, 'yesterday') || {};
    /* the ONE field that is only on the second answer today; D first so it switches over by itself */
    var byAcct = D.totals_by_account || (T && T.totals_by_account) || null;
    var today = cmWin(D, 'today');
    if (!today && byAcct && byAcct.length) today = { spend: cmSum(byAcct, 'spend'), attr_revenue: cmSum(byAcct, 'attr_revenue'), attr_units: cmSum(byAcct, 'attr_units'), clicks: cmSum(byAcct, 'clicks'), orders: cmSum(byAcct, 'orders'), units: cmSum(byAcct, 'units') };
    var fresh = D.fresh || (T && T.fresh) || null;   /* identical copies of one payload: D is the home */
    var f = D.freshness || {};
    if (!fresh && f.last_sample && f.last_sample.t) fresh = { grain: 'today', sampled_at: f.last_sample.t, cadence: '5 min' };
    adtFreshShow('moCmdFresh', fresh);
    /* the four spend tiles: fleet figures carry no profit (owner, 27 Sep: profit is item-to-item only) */
    var repStatus = y.report_status != null ? String(y.report_status) : (D.report_status != null ? String(D.report_status) : null);
    var tile = function (label, w, sub, note) {
      if (!w) return kpi(label, '—', sub + '<br>not available yet');
      return kpi(label, gbp(w.spend, 0), gbp(w.attr_revenue, 0) + ' sales from ads · ROAS ' + roas(cmRoas(w)) + (w.attr_units != null ? ' · ' + w.attr_units + ' units from ads' : '') + '<br>' + sub + (note ? ' · <span class="an-neg">' + esc(note) + '</span>' : ''));
    };
    var h = '<div class="an-kpis">' +
      tile('Today so far', today, (today && today.ads_sampled === false ? 'no ad figures from eBay yet today, orders only' : 'still updating, read every 5 minutes') + (today && today.sampled_at ? ' · ' + esc(String(today.sampled_at).slice(11, 16)) + ' UTC' : '') + (today && num(today.pending) > 0 ? ' · ' + today.pending + ' order' + (num(today.pending) === 1 ? '' : 's') + ' not costed yet' : '')) +
      tile('Yesterday', y.spend != null || y.attr_revenue != null ? y : null, esc(y.day || y.from || ''), repStatus != null && repStatus !== 'final' ? 'eBay figures still arriving' + (function (m) { var late = Object.keys(m || {}).filter(function (a) { return m[a] !== 'final'; }); return late.length ? ' (' + esc(late.join(', ')) + ')' : ''; })(y.report_status_by_account) : '') +
      tile('Last 7 days', cmWin(D, 'd7'), (function (w) { return w && w.from ? esc(w.from) + ' → ' + esc(w.to || '') : 'to yesterday'; })(cmWin(D, 'd7'))) +
      tile('Last 30 days', cmWin(D, 'd30'), (function (w) { return w && w.from ? esc(w.from) + ' → ' + esc(w.to || '') : 'to yesterday'; })(cmWin(D, 'd30'))) + '</div>';
    /* open alerts are counted across every account whichever chip is on: say so when one account is picked */
    h += '<div class="an-kpis">' + kpi('CPC yesterday', y.clicks > 0 && y.spend != null ? gbp(Number(y.spend) / Number(y.clicks)) : '—', (y.clicks || 0) + ' clicks') + kpi('Conversion rate yesterday', y.clicks > 0 && y.attr_units != null ? (Math.round(Number(y.attr_units) / Number(y.clicks) * 1000) / 10) + '%' : '—', 'units from ads ÷ clicks') + kpi('Orders yesterday, all channels', String(y.orders || 0), (y.units || 0) + ' units') + kpi('Open alerts', String((D.alerts && D.alerts.n) || 0), ((D.alerts && D.alerts.high) || 0) + ' high' + (CM.account ? ' · all accounts' : ''), (D.alerts && D.alerts.high) ? 'an-neg' : '') + kpi('Suggestions waiting', String(D.decisions_waiting || 0), 'suggestion only, nothing sent to eBay') + '</div>';
    /* by account today: spend, attributed, ROAS, CPC, CVR, orders — never a profit figure */
    if (byAcct && byAcct.length) {
      h += '<div class="an-panel"><h3>Today by account' + src('today so far · every 5 min') + '</h3><div class="an-sub">Spend and sales from ads since 00:00 UTC, as far as eBay has reported. Orders are counted by UK day.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Account</th><th class="r">Spend</th><th class="r">Sales from ads</th><th class="r">ROAS</th><th class="r">Clicks</th><th class="r">CPC</th><th class="r">Conversion rate</th><th class="r">Units from ads</th><th class="r">Orders</th><th class="r">Units</th></tr></thead><tbody>' +
        byAcct.map(function (a) { var ck = num(a.clicks) || 0, sp = num(a.spend); return '<tr><td>' + esc(a.account) + '</td><td class="r">' + gbp(sp) + '</td><td class="r">' + gbp(a.attr_revenue) + '</td><td class="r">' + roas(cmRoas(a)) + '</td><td class="r">' + ck + '</td><td class="r">' + (a.cpc != null ? gbp(a.cpc) : (ck > 0 && sp != null ? gbp(sp / ck) : '—')) + '</td><td class="r">' + (a.cvr != null ? (Math.round(Number(a.cvr) * 1000) / 10) + '%' : (ck > 0 && a.attr_units != null ? (Math.round(Number(a.attr_units) / ck * 1000) / 10) + '%' : '—')) + '</td><td class="r">' + (a.attr_units || 0) + '</td><td class="r">' + (a.orders == null ? '—' : a.orders) + '</td><td class="r">' + (a.units == null ? '—' : a.units) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        /* the listings table left this page (owner, 27 Oct: "kept elsewhere"): say where it lives */
        '<div class="an-sub" style="margin:10px 0 0">Each listing\'s spend today, and over the last 3, 7 or 14 days, is on <a href="#adsCentre" style="color:var(--gold-a);font-weight:800">Ads command centre</a>.</div></div>';
    }
    var slotsToday = D.today_slots || [];
    var tot = slotsToday.reduce(function (t, s) { return t + Number(s.units); }, 0);
    h += '<div class="an-panel"><h3>Today so far by slot' + src('orders') + '</h3><div class="an-sub">Against the times of day this fleet usually sells in.</div><table class="an-tbl"><thead><tr><th>Slot</th><th class="r">Units</th><th class="r">Share</th><th class="r">Profile</th></tr></thead><tbody>' + SLOTS.map(function (s, i) { var r = slotsToday.filter(function (x) { return Number(x.slot) === i; })[0]; var u = r ? Number(r.units) : 0; var p = D.slot_profile && D.slot_profile.shares ? D.slot_profile.shares[i] : null; return '<tr><td>' + s + '</td><td class="r">' + u + '</td><td class="r">' + (tot ? Math.round(u / tot * 100) + '%' : '—') + '</td><td class="r">' + (p == null ? '—' : Math.round(p * 100) + '%') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += ovHourlyPanel(D, T);
    h += '<div class="an-panel"><h3>How up to date this is</h3><div>' + [['Orders updated', ago(f.orders && f.orders.t)], ['eBay ad report covers up to', (f.ads_report_day && f.ads_report_day.d) || '—'], ['Last ad reading', ago(f.last_sample && f.last_sample.t)], ['Daily totals', ago(f.rollup && f.rollup.t)], ['Patterns', esc(f.profiles || 'not yet')], ['Forecast', esc(f.forecast || 'not yet')]].map(function (x) { return '<span class="mo-chip">' + esc(x[0]) + ': <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div></div>';
    h += '<div class="an-note">Computed ' + esc(String(D.computed_at || '').slice(11, 19)) + ' UTC · ' + esc(D.source || '') + ' · refreshes every 5 min while this tab is open</div>';
    $('moCmd').innerHTML = h;
  }
  /* "All account hourly spends" (owner, 27 Oct): in place of the two hour-by-hour charts, one chart of
     the UK day with two bars per hour, money spent in red and orders received in green, side by side.
     Spend is the 5-minute ad readings' within-hour deltas (hour_curve); what was spent before the first
     reading of the day cannot be put in any hour and is stated under the title instead, never drawn as
     an hour's own spending. Orders are counted by the UK hour they were placed, every channel
     (today_hours, engine 27 Oct). An hour still to come has no bar; an hour before the first reading
     has no red bar; an hour that has passed with nothing in it gets a hairline and a 0. */
  function ovHourlyPanel(D, T) {
    var hc = D.hour_curve || (T && T.hour_curve) || null;
    var oh = Array.isArray(D.today_hours) ? D.today_hours : null;
    var carry = num(D.carry_spend != null ? D.carry_spend : (T && T.carry_spend));
    var carryHour = num(D.carry_hour_uk != null ? D.carry_hour_uk : (T && T.carry_hour_uk));
    var sampled = !!(D.ads_sampled || (T && T.ads_sampled) || (hc && hc.length));
    var spend = {}, orders = {}, units = {}, firstSpendHour = null, i;
    (hc || []).forEach(function (x) { var hh = num(x.hour_uk != null ? x.hour_uk : x.hour); if (hh == null) return; spend[hh] = (spend[hh] || 0) + (num(x.spend) || 0); if (firstSpendHour == null || hh < firstSpendHour) firstSpendHour = hh; });
    (oh || []).forEach(function (x) { var hh = num(x.hour); if (hh == null) return; orders[hh] = (orders[hh] || 0) + (num(x.orders) || 0); units[hh] = (units[hh] || 0) + (num(x.units) || 0); });
    var from = carryHour != null ? carryHour : firstSpendHour;
    var nowH = ukHourNow(), pts = [], sumSpend = 0, sumOrders = 0, sumUnits = 0;
    /* eBay's ad day is the UTC day. In British Summer Time the first UK hour (00:00 to 01:00) still belongs to
       eBay's previous day, so for that one hour nothing read so far is today's spend: draw orders only, and do
       not call the previous day's "before the first reading" figure today's (review, 27 Oct) */
    var ebayDayPending = nowH === 0 && new Date().getUTCHours() === 23;
    if (ebayDayPending) { sampled = false; carry = null; }
    for (i = 0; i < 24; i++) {
      var past = i <= nowH;
      var a = sampled && past && from != null && i >= from ? Math.round((spend[i] || 0) * 100) / 100 : null;
      var b = oh && past ? (orders[i] || 0) : null;
      if (a != null) sumSpend += a;
      if (b != null) { sumOrders += b; sumUnits += units[i] || 0; }
      var when = pad2(i) + ':00–' + pad2((i + 1) % 24) + ':00 UK';
      pts.push({ label: pad2(i), a: a, b: b,
        titleA: when + ' · ' + (a == null ? (past ? 'spend not split by hour yet' : 'still to come') : gbp(a) + ' spent on ads'),
        titleB: when + ' · ' + (b == null ? (past ? 'orders by hour not available yet' : 'still to come') : b + ' order' + (b === 1 ? '' : 's') + ' received' + (units[i] ? ' · ' + units[i] + ' unit' + (units[i] === 1 ? '' : 's') : '')) });
    }
    var title = CM.account ? 'Hourly spends · ' + CM.account : 'All account hourly spends';
    var sub = 'Money spent on ads in red and orders received in green, in each UK hour of today.';
    if (carry != null && carry > 0) sub += ' <b>' + gbp(carry) + ' had already been spent before the first reading today</b> and is not on the chart.';
    if (!sampled) sub += ebayDayPending ? ' eBay\'s ad day starts at 01:00 UK in summer, so there is no spend for today yet.' : ' No ad figures from eBay yet today. They start arriving around 08:00 UK.';
    if (!oh) sub += ' Orders by the hour appear once the engine update of 27 Oct is live.';
    var any = pts.some(function (p) { return p.a != null || p.b != null; });
    return '<div class="an-panel"><h3>' + esc(title) + src('hourly spends', 'today so far · every 5 min') + '</h3><div class="an-sub">' + sub + '</div>' +
      '<div class="wr-legend"><span><i style="background:' + OV_SPEND + '"></i>money spent</span><span><i style="background:' + OV_ORDERS + '"></i>orders received</span></div>' +
      /* 48 bars do not shrink to a phone and stay readable: below ~860 px the chart keeps its size and scrolls sideways */
      (any ? '<div class="an-scroll"><div style="min-width:860px">' + chartPairBars(pts, { colorA: OV_SPEND, colorB: OV_ORDERS, fmtA: ovMoney, fmtB: chartNum, aria: title + ': money spent and orders received in each UK hour of today' }) + '</div></div>' : '<div class="an-empty">Nothing to draw yet today.</div>') +
      '<div class="an-sub" style="margin:8px 0 0">Each colour is drawn against its own busiest hour, so the two shapes line up; read the figure on each bar. So far today: <b>' + gbp(sumSpend) + '</b> spent in the hours shown' + (carry != null && carry > 0 ? ' plus <b>' + gbp(carry) + '</b> before the first reading' : '') + (oh ? ' · <b>' + sumOrders + '</b> order' + (sumOrders === 1 ? '' : 's') + ' (' + sumUnits + ' unit' + (sumUnits === 1 ? '' : 's') + ')' : '') + '.</div></div>';
  }

  /* ---------------- Alerts ---------------- */
  var AL = { sev: '' };
  VIEWS.adtoolAlerts = {
    label: 'Alerts (ads)', hidden: true, order: 94, roles: ROLES, icon: '<path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    render: function () { return '<div class="an-wrap">' + hg('Alerts', 'Everything open right now, with the numbers behind each one') + '<div id="moAl"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { loadAlerts(); }
  };
  function loadAlerts() {
    api('adtoolAlerts', {}).then(function (D) {
      var counts = { high: 0, medium: 0, low: 0 }; D.open.forEach(function (a) { var s = alSev(a); counts[s] = (counts[s] || 0) + 1; });
      /* a check is named by its own sentence, never by its code */
      var ruleText = {}; (D.rules || []).forEach(function (r) { ruleText[r.rule_id] = r.text || ''; });
      var overdue = D.open.filter(function (a) { return alUrgency(a) === 'overdue'; }).length;
      var h = '<div class="an-filters">' + [['', 'All (' + D.open.length + ')'], ['high', 'High (' + counts.high + ')'], ['medium', 'Medium (' + counts.medium + ')'], ['low', 'Low (' + counts.low + ')']].map(function (x) { return '<button class="' + (AL.sev === x[0] ? 'on' : '') + '" data-s="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      if (overdue) h += '<div class="an-note" style="margin-bottom:10px;border:1px solid rgba(224,86,63,.5);background:rgba(224,86,63,.08);color:#ffb3a6"><b>' + overdue + ' overdue.</b> A high alert has been open more than a day. Clear these first.</div>';
      if (D.fixture_check) h += '<div class="an-note" style="margin-bottom:10px">Checks last tested against known examples ' + esc(String(D.fixture_check.ran_at).slice(0, 16)) + ': <b>' + esc(D.fixture_check.status) + '</b>. ' + esc(D.fixture_check.evidence) + '</div>';
      var rows = D.open.filter(function (a) { return !AL.sev || alSev(a) === AL.sev; });
      h += '<div id="moAlList">' + (rows.length ? rows.map(function (a) {
        var p = a.payload || {}; var sev = alSev(a), urg = alUrgency(a);
        var what = a.what || p.rule_text || ruleText[a.rule || a.rule_id] || ''; var why = a.why_matters || p.why_matters || ''; var doit = a['do'] || p.suggested || '';
        var pairs = payloadPairs(p);   /* the rule's own code is an internal handle, never printed */
        var where = a.item_id ? adtProductCell({ item_id: a.item_id, account: a.account, title: a.title || p.title || '', image: a.image }) : (a.account ? '<b>' + esc(a.account) + '</b>' : '—');
        return '<div class="mo-alert ' + esc(sev) + '">' +
          '<div class="t">' + esc(what || 'A check has fired') + ' <span class="mo-urg ' + esc(urg) + '">' + esc(urg) + '</span></div>' +
          moLine('What happened', esc(what || 'a check fired on this listing')) +
          moLine('Where', where + (a.campaign_id ? '<div class="adt-pf-p">campaign ' + esc(a.campaign_id) + '</div>' : '')) +   /* five plain lines, no codes */
          (why ? moLine('Why it matters', esc(why)) : '') +
          (pairs.length ? moLine('Numbers', '<div class="mo-nums">' + pairs.map(function (x) { return '<span class="n">' + esc(x[0]) + ' <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div>') : '') +
          moLine('What to do', esc(doit || 'review the listing')) +
          moLine('Urgency', '<span class="mo-urg ' + esc(urg) + '">' + esc(urg) + '</span> ' + esc(urgencyText(urg)) + ' · open ' + esc(openText(a)) + (a.acknowledged_by ? ' · acknowledged by ' + esc(a.acknowledged_by) : '') + (a.snoozed_until ? ' · snoozed to ' + esc(String(a.snoozed_until).slice(0, 10)) : '')) +
          '<div class="btns">' + (a.item_id ? '<button data-open="' + esc(a.item_id) + '">Open listing</button>' : '') + '<button data-snooze="' + esc(a.alert_id) + '">Snooze 3 d</button><button data-ack="' + esc(a.alert_id) + '">Acknowledge</button></div></div>';
      }).join('') : '<div class="an-empty">No open alerts in this filter.</div>') + '</div>';
      /* owner, 27 Oct: "Every check — removed". The panel listed every check with Management's on/off switch;
         the checks keep running exactly as set, and the switch is still the adtoolAlerts 'rule' action. */
      h += '<div class="an-panel"><h3>History</h3><table class="an-tbl"><thead><tr><th>Check</th><th>Where</th><th>Fired</th><th>Cleared</th><th>Acknowledged</th></tr></thead><tbody>' + (D.history.length ? D.history.map(function (a) { return '<tr><td>' + esc(a.what || ruleText[a.rule || a.rule_id] || 'a check') + '</td><td>' + esc(a.item_id || a.account || '') + '</td><td>' + esc(String(a.fired_at).slice(0, 16)) + '</td><td>' + esc(String(a.cleared_at || '').slice(0, 16) || '—') + '</td><td>' + esc(a.acknowledged_by || '—') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">nothing yet</td></tr>') + '</tbody></table></div>';
      h += '<div class="an-note">Last run: ' + (D.last_run ? esc(String(D.last_run.finished_at).slice(0, 16)) + ' · ' + esc(D.last_run.note) : 'not run yet') + '</div>';
      $('moAl').innerHTML = h;
      var fs = document.querySelectorAll('#moAl .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { AL.sev = this.getAttribute('data-s'); loadAlerts(); };
      var wire = function (attr, fn) { var ns = document.querySelectorAll('[' + attr + ']'); for (var j = 0; j < ns.length; j++) ns[j].onclick = function () { fn(this.getAttribute(attr), this); }; };
      wire('data-ack', function (id) { api('adtoolAlerts', { op: 'ack', alert_id: id }).then(function () { toast('Acknowledged'); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
      wire('data-snooze', function (id) { api('adtoolAlerts', { op: 'snooze', alert_id: id }).then(function () { toast('Snoozed 3 days'); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
      wire('data-open', function (id) { try { localStorage.setItem('m98m:adtoolItem', id); } catch (e) {} location.hash = 'adtoolProduct'; });
      wire('data-rule', function (rid, el) { api('adtoolAlerts', { op: 'rule', rule_id: rid, enabled: Number(el.getAttribute('data-en')) }).then(function () { toast('Check turned ' + (Number(el.getAttribute('data-en')) ? 'on' : 'off')); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
    }).catch(function (e) { fail('moAl', e); });
  }

  /* ---------------- Past Situation (was Yesterday's report) ----------------
     Owner, 27 Oct: "Advertising signals & Yesterday report to be merged under one title page, Past
     Situation ... all information should be reflective of dates clicks." The report is drawn exactly as
     before and already follows the day picked; the advertising signals about that same day now follow it
     too, as the Advertising signals page draws them (view-signals.js, acknowledge with a comment
     included). Signals leave the feed after a few days, and the panel says so rather than looking quiet. */
  var RP = { day: '', account: '' };
  VIEWS.adtoolReport = {
    label: 'Past Situation (ads)', hidden: true, order: 94, roles: ROLES, icon: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h7M9 17h7"/>',
    render: function () { return '<div class="an-wrap">' + hg('Past Situation', 'Pick a day: its spend and sales, hour by hour, its best and worst listings, and its advertising signals') + '<div id="moRp"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { loadReport(); }
  };
  function loadReport() {
    var params = {}; if (RP.day) params.day = RP.day; if (RP.account) params.account = RP.account;
    api('adtoolReport', params).then(function (D) {
      if (!D.report) { $('moRp').innerHTML = '<div class="an-panel"><h3>No report yet</h3><div class="an-sub">One is written each morning for the day before.</div></div>'; return; }
      var R = D.report, y = R.fleet;
      /* Never show an older day in silence. The owner opened this page, saw Sunday where he expected
         yesterday, and rightly asked what the hell he was looking at — the page knew and did not say. */
      var h = '';
      /* Past Situation (27 Oct): picking a day is what the page is for, so the warning is only for the case it was
         written for, the page falling back to an older day on its own while yesterday's report is not in yet */
      if (!RP.day && D.yesterday && D.day !== D.yesterday) {
        h += '<div class="an-note" style="border:1px solid rgba(224,86,63,.5);background:rgba(224,86,63,.08);color:#ffb3a6;margin-bottom:12px">' +
          '<b>This is not yesterday.</b> You are looking at <b>' + esc(D.day) + '</b>. ' +
          (D.yesterday_missing
            ? 'eBay has not sent its report for ' + esc(D.yesterday) + ' yet. It arrives during the morning, and this page moves to it on its own once it does.'
            : 'Yesterday (' + esc(D.yesterday) + ') is in the day picker below.') +
          '</div>';
      }
      h += '<div class="an-filters">' + D.days.slice(0, 14).map(function (d) { return '<button class="' + (d.day === D.day ? 'on' : '') + '" data-d="' + esc(d.day) + '">' + esc(d.day) + '</button>'; }).join('') + '</div>';
      /* fleet and account rows carry spend / sales / ROAS only; profit lives on the winner and loser rows (item-level, Sales Analysis law) */
      h += '<div class="an-panel"><h3>' + esc(R.day) + ' · ' + esc(R.weekday) + src('generated ' + String(R.generated_at).slice(11, 16) + ' UTC') + '</h3><div class="an-sub">' + esc((R.sources || []).join(' · ')) + '</div><div class="an-kpis">' + kpi('Spend', gbp(y.spend, 0), (y.attr_units || 0) + ' units from ads') + kpi('ROAS', roas(y.roas), gbp(y.attr_revenue, 0) + ' sales from ads') + kpi('CPC', y.clicks > 0 && y.spend != null ? gbp(Number(y.spend) / Number(y.clicks)) : '—', (y.clicks || 0) + ' clicks') + kpi('Conversion rate', y.clicks > 0 && y.attr_units != null ? (Math.round(Number(y.attr_units) / Number(y.clicks) * 1000) / 10) + '%' : '—', 'units from ads ÷ clicks') + kpi('Orders', String(y.orders || 0), (y.units || 0) + ' units · ' + gbp(y.revenue, 0)) + '</div>' +
        '<div class="an-sub">Against the 7-day average per day: spend ' + (R.vs_7day ? gbp(R.vs_7day.spend) : '—') + ' · ROAS ' + (R.vs_7day ? roas(R.vs_7day.roas) : '—') + '. Same weekday last week: spend ' + (R.vs_same_weekday_last_week ? gbp(R.vs_same_weekday_last_week.spend) : '—') + ' · ROAS ' + (R.vs_same_weekday_last_week ? roas(R.vs_same_weekday_last_week.roas) : '—') + '.' + (R.decisions && R.decisions.note ? ' ' + esc(R.decisions.note) + '.' : '') + '</div>' +
        '<button class="an-btn" id="moPdf">Download PDF</button> <button class="an-btn" id="moSend" style="background:transparent;border:1px solid var(--gold-line);color:var(--text-2)">Send to inbox</button></div>';
      /* the ad status changes line KEEPS its number here, because this is the morning read and the
         number belongs in it. Everything behind it — which ad, which campaign, what time, and which
         of them the tool itself sent — lives on one page now, so the bullet points there instead of
         the count being written out a second time further down this same screen. */
      h += '<div class="an-panel"><h3>What changed</h3><ul class="at-list">' + R.what_changed.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') +
        '</ul><div class="an-note" style="margin-top:6px">Every ad and campaign stopped or started on this day, with the time and who sent it, is on <a href="#' + esc(String((R.ad_status_changes && R.ad_status_changes.changes_page) || 'adtoolStopped')) + '" style="color:var(--gold-a);font-weight:800">Stopped yesterday</a> and <a href="#adtoolActivated" style="color:var(--gold-a);font-weight:800">Activated today</a>.</div></div>';
      /* account rows carry spend / units from ads / sales from ads / ROAS only, never a collective profit figure */
      var ba = R.by_account || [];
      h += '<div class="an-panel"><h3>By account</h3><table class="an-tbl"><thead><tr><th>Account</th><th class="r">Spend</th><th class="r">Units from ads</th><th class="r">Sales from ads</th><th class="r">ROAS</th></tr></thead><tbody>' + ba.map(function (a) { return '<tr><td>' + esc(a.account) + '</td><td class="r">' + gbp(a.spend, 0) + '</td><td class="r">' + (a.attr_units || 0) + '</td><td class="r">' + gbp(a.attr_revenue, 0) + '</td><td class="r">' + (a.spend > 0 ? roas(a.attr_revenue / a.spend) : (a.roas != null ? roas(a.roas) : '—')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      /* Hour by hour on the shared bar kit so the figure sits on each bar — the old version hid the
         count in a tooltip and left the axis blank (owner: "R/R graph, left-side numbers not visible"). */
      var hoursSeries = (R.hour_series || R.hours || []).map(function (x) { return { label: (Number(x.hour) < 10 ? '0' : '') + x.hour, value: Number(x.units) || 0, strong: (x.z != null && x.z <= -2), title: x.hour + ':00 · ' + (x.units || 0) + ' units' + (x.expected != null ? ', expected ' + x.expected : '') }; });
      h += '<div class="an-panel"><h3>Hour by hour' + src('orders') + '</h3><div class="an-sub">Units sold in each UK hour, with the count on each bar. Red = an hour well below the share of the day it usually takes.</div>' +
        (hoursSeries.length ? chartBars(hoursSeries, { height: 180, everyNth: 2, minGap: 30, strongColor: '#e0563f', fmt: function (v) { return String(Math.round(v)); } }) : '<div class="an-empty">No hour data for this day.</div>') +
        '<div class="an-sub" style="margin-top:10px"><b>Against normal</b> compares a slot with what it usually takes. Below −2 is unusually low.</div>' +
        '<table class="an-tbl"><thead><tr><th>Slot</th><th class="r">Units</th><th class="r">Expected</th><th class="r">Against normal</th></tr></thead><tbody>' + R.slots.map(function (s) { return '<tr><td>' + SLOTS[s.slot] + '</td><td class="r">' + s.units + '</td><td class="r">' + (s.expected == null ? '—' : s.expected) + '</td><td class="r ' + (s.z != null && s.z < 0 ? 'an-neg' : '') + '">' + (s.z == null ? '—' : (s.z > 0 ? '+' : '') + s.z) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      /* Winners / losers, viewable by account. The engine sends winners/losers per account on
         by_account[]; the chips pick one, and the fleet view is the default. Every row is a product
         cell with its 'why' sentence and item-level profit under the Sales Analysis law. */
      var accWL = null;
      if (RP.account) { for (var ai = 0; ai < ba.length; ai++) { if (ba[ai].account === RP.account) { accWL = ba[ai]; break; } } }
      var winners = accWL ? (accWL.winners || []) : (R.winners || []);
      var losers = accWL ? (accWL.losers || []) : (R.losers || []);
      var acctsWithWL = ba.filter(function (a) { return (a.winners && a.winners.length) || (a.losers && a.losers.length); });
      if (acctsWithWL.length) {
        h += '<div class="an-filters">' + [['', 'All accounts']].concat(acctsWithWL.map(function (a) { return [a.account, a.account]; })).map(function (x) { return '<button class="' + (RP.account === x[0] ? 'on' : '') + '" data-acc="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
      } else if (RP.account) {
        h += '<div class="an-note" style="margin-bottom:8px">Winners and losers for one account are not available yet. Showing all accounts.</div>';
      }
      var tbl = function (rows, title) { return '<div class="an-panel"><h3>' + esc(title) + (RP.account ? ' · ' + esc(RP.account) : '') + '</h3><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Listing</th><th class="r">Spend</th><th class="r">Units from ads</th><th class="r">ROAS</th><th class="r">Profit</th><th>Why</th></tr></thead><tbody>' + (rows.length ? rows.map(function (r) { return '<tr><td>' + adtProductCell(r) + '</td><td class="r">' + gbp(r.spend) + '</td><td class="r">' + (r.attr_units || 0) + '</td><td class="r">' + (r.spend > 0 && r.attr_revenue != null ? roas(r.attr_revenue / r.spend) : (r.roas != null ? roas(r.roas) : '—')) + '</td><td class="r">' + adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders) + '</td><td>' + esc(r.why || '') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="an-empty">none</td></tr>') + '</tbody></table></div></div>'; };
      h += '<div class="an-grid2">' + tbl(winners, 'Winners') + tbl(losers, 'Losers') + '</div>';
      /* the ads-switched-on-or-off count used to be restated here as well as in the bullets above.
         One home per number: the bullet keeps it and points at the page that owns the detail. */
      h += '<div class="an-note">Open alerts ' + ((R.open_alerts && R.open_alerts.n) || 0) + ' (' + ((R.open_alerts && R.open_alerts.high) || 0) + ' high) · ' + (R.capped_listings || 0) + ' listings ran out of budget</div>';
      /* the day's advertising signals (Advertising signals, merged in) — the ids are the ones its acknowledge repaints */
      var sigOk = typeof window.sgAdSignalsForDay === 'function';
      h += '<div class="an-panel" style="margin-top:12px"><h3>Advertising signals · ' + esc(R.day) + '</h3>' +
        '<div class="an-sub">Worst CPC performers, listings that went negative and Wrong Advertising alarms about this day. Acknowledge each with a comment; who said what stays on the card.</div>' +
        (sigOk ? '<div class="sig-dept-sum" id="sigAdSum">Loading…</div><div class="sig-list" id="sigAdAll"><div class="spinner"></div></div>' : '<div class="an-empty">Signals are not part of this build.</div>') + '</div>';
      $('moRp').innerHTML = h;
      if (sigOk) window.sgAdSignalsForDay('sigAdAll', 'sigAdSum', R.day || D.day);
      var fs = document.querySelectorAll('#moRp .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { if (this.hasAttribute('data-d')) { RP.day = this.getAttribute('data-d'); } else if (this.hasAttribute('data-acc')) { RP.account = this.getAttribute('data-acc'); } loadReport(); };
      $('moPdf').onclick = function () { var b = this; b.disabled = true; api('adtoolReport', { day: D.day, pdf: 1 }).then(function (r) { var bin = atob(r.pdf_base64); var arr = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k); var blob = new Blob([arr], { type: 'application/pdf' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = r.filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000); b.disabled = false; }).catch(function (e) { toast(e.message || 'failed'); b.disabled = false; }); };
      $('moSend').onclick = function () { var b = this; b.disabled = true; api('adtoolReport', { day: D.day, send: 1 }).then(function () { toast('Sent to the management inbox'); b.disabled = false; }).catch(function (e) { toast(e.message); b.disabled = false; }); };
    }).catch(function (e) { fail('moRp', e); });
  }

  /* ---------------- ROAS target ---------------- */
  VIEWS.adtoolRoas = {
    label: 'ROAS target (ads)', hidden: true, order: 94, roles: ROLES, icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    /* the subtitle used to hard-code "the gap to 5.0×". The target is set on this very page and read
       from D.target, so that sentence became a lie the moment anyone changed it. The live figure is
       printed in the Target tile below; the subtitle names no number at all. */
    render: function () { return '<div class="an-wrap">' + hg('ROAS target', 'How far the fleet is from its ROAS target, and what would close the gap') + '<div id="moRo"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { loadRoas(); }
  };
  function loadRoas() {
    api('adtoolRoasTarget', {}).then(function (D) {
      /* the ladder is spend and ROAS only: fleet profit is not a figure this portal shows any more
         (owner, 27 Sep), and the estimated ad profit it used to stand on is gone */
      var F = D.fleet || {}, now = F.now || {}, lv = F.levers || [], win = D.window || [];
      var spendOf = function (x) { return x && x.spend != null ? Number(x.spend) : null; };
      /* the ladder's points carry attributed revenue as `revenue` (stored adtool_roas JSON included) */
      var attrOf = function (x) { return x && x.attr_revenue != null ? Number(x.attr_revenue) : (x && x.revenue != null ? Number(x.revenue) : null); };
      var h = '<div class="an-kpis">' + kpi('Fleet ROAS now', roas(now.roas), esc(win[0] || '') + ' → ' + esc(win[1] || '')) + kpi('Target', roas(D.target), 'checkpoint ' + esc(D.checkpoint || '—') + ' · ' + (D.days_to_checkpoint != null ? D.days_to_checkpoint : '—') + ' days') + kpi('Gap', D.gap == null ? '—' : (D.gap > 0 ? '−' : '+') + Math.abs(D.gap).toFixed(2) + '×', D.gap > 0 ? 'below target' : 'at or above target', D.gap > 0 ? 'an-neg' : 'an-pos') + kpi('Spend now', gbp(spendOf(now), 0), (now.listings != null ? now.listings + ' listings' : '') + (attrOf(now) != null ? ' · ' + gbp(attrOf(now), 0) + ' sales from ads' : '')) + (lv.length ? kpi('After every step', roas(lv[lv.length - 1].roas), spendOf(lv[lv.length - 1]) != null ? gbp(spendOf(lv[lv.length - 1]), 0) + ' spend' : 'ROAS once every step is taken') : '') + kpi('Cost per sale', gbp(now.cost_per_sale), lv.length ? 'step 1 → ' + gbp(lv[0].cost_per_sale) : '') + '</div>';
      var all = [{ name: 'Now', roas: now.roas, spend: spendOf(now) }].concat(lv.map(function (l) { return { name: 'Step ' + l.n, roas: l.roas, spend: spendOf(l) }; }));
      /* 14 Oct: these two were the only bar charts in the tool still hand-rolled as div columns.
         chartBars is what every other bar chart here uses, and it brings the value pills, the hover
         titles and the portal's own scaling with it. */
      var ladPts = function (pick, fmtOne, markTarget) {
        return all.filter(function (x) { return pick(x) != null; }).map(function (x) {
          var v = Number(pick(x));
          return { value: v, label: x.name, strong: !!markTarget && D.target != null && v >= Number(D.target),
                   title: x.name + ' · ' + fmtOne(pick(x)) };
        });
      };
      var roasPts = ladPts(function (x) { return x.roas; }, roas, true);
      h += '<div class="an-grid2"><div class="an-panel"><h3>ROAS after each step</h3>' +
        (roasPts.length ? chartBars(roasPts, { height: 170, fmt: roas, pillColor: 'var(--gold-a)' }) : '<div class="an-empty">No steps to show.</div>') +
        '<div class="an-sub">Target ' + roas(D.target) + '. Steps at or above it are light gold.</div></div>';
      var spendPts = ladPts(function (x) { return x.spend; }, function (v) { return gbp(v, 0); }, false);
      h += '<div class="an-panel"><h3>Spend after each step</h3>' +
        (spendPts.length ? chartBars(spendPts, { height: 170, fmt: function (v) { return gbp(v, 0); } }) +
          '<div class="an-sub">What each step leaves running. A higher ROAS on a fraction of the spend is a smaller business, not a better one.</div>'
          : '<div class="an-empty">Spend per step is not available yet.</div>') + '</div></div>';
      h += '<div class="an-panel"><h3>The five things you can change' + src('modelled · assumptions printed', 'worked out, assumptions printed') + '</h3><div class="an-scroll"><table class="an-tbl"><thead><tr><th>#</th><th>What you change</th><th>Where</th><th class="r">ROAS after</th><th class="r">Spend after</th><th>Assumption</th><th>Status</th></tr></thead><tbody>' + lv.map(function (l) { return '<tr><td>' + l.n + '</td><td><b>' + esc(l.name) + '</b></td><td>' + esc(l.scope) + '</td><td class="r">' + roas(l.roas) + '</td><td class="r">' + gbp(spendOf(l), 0) + '</td><td>' + esc(l.assumption) + '</td><td>' + esc(l.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (F.cut_only_ceiling ? '<div class="an-note" style="margin-top:8px"><b>The trap:</b> ' + esc(F.cut_only_ceiling.note || '') + '. ' + (F.cut_only_ceiling.listings != null ? F.cut_only_ceiling.listings + ' listings, ' : '') + roas(F.cut_only_ceiling.roas) + (spendOf(F.cut_only_ceiling) != null ? ' on ' + gbp(spendOf(F.cut_only_ceiling), 0) : '') + '. The tool never proposes cutting past step 1 to reach the target.</div>' : '') + '</div>';
      h += '<div class="an-panel"><h3>Gap by account</h3><table class="an-tbl"><thead><tr><th>Account</th><th class="r">ROAS now</th><th class="r">After its own loss-making listings stop</th><th class="r">Spend</th><th class="r">Sales from ads</th><th class="r">Target</th></tr></thead><tbody>' + Object.keys(D.accounts || {}).map(function (a) { var x = D.accounts[a] || {}; var xn = x.now || {}; var tg = (D.targets || {})['adtool_roas_target_' + a] || D.target; return '<tr><td>' + esc(a) + '</td><td class="r">' + roas(xn.roas) + '</td><td class="r an-pos">' + roas(x.after_lever1 ? x.after_lever1.roas : null) + '</td><td class="r">' + gbp(xn.spend, 0) + '</td><td class="r">' + gbp(attrOf(xn), 0) + '</td><td class="r">' + roas(tg) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (D.weeks && D.weeks.length) h += '<div class="an-panel"><h3>Diminishing returns, week by week' + src('weekly spend and return') + '</h3><table class="an-tbl"><thead><tr><th>Week</th><th class="r">Spend/day</th><th class="r">ROAS</th></tr></thead><tbody>' + D.weeks.slice().reverse().map(function (w) { return '<tr><td>' + (w.weeks_ago === 0 ? 'this week' : w.weeks_ago + ' week' + (w.weeks_ago > 1 ? 's' : '') + ' ago') + '</td><td class="r">' + gbp(w.spend_day, 0) + '</td><td class="r">' + roas(w.roas) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (D.month_bands) h += '<div class="an-panel"><h3>Month position' + src('fleet profile') + '</h3><table class="an-tbl"><thead><tr><th>Band</th><th class="r">Listing-days</th><th class="r">Units/day</th><th class="r">Spend/day</th></tr></thead><tbody>' + D.month_bands.map(function (b) { return '<tr><td>' + esc(b.band) + '</td><td class="r">' + b.listing_days + '</td><td class="r">' + (b.units_day == null ? '—' : b.units_day) + '</td><td class="r">' + gbp(b.spend_day) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (D.review_window && D.review_window.fleet) { var rv = D.review_window.fleet, rvw = D.review_window.window || []; h += '<div class="an-panel"><h3>The review window, recomputed' + src('review window', String(rvw[0] || '') + ' → ' + String(rvw[1] || '')) + '</h3><div class="an-sub">The same sums over the period the review used, so its figures can be checked here.</div><table class="an-tbl"><thead><tr><th>Step</th><th class="r">ROAS</th><th class="r">Spend</th></tr></thead><tbody><tr><td>Now</td><td class="r">' + roas(rv.now && rv.now.roas) + '</td><td class="r">' + gbp(spendOf(rv.now), 0) + '</td></tr>' + (rv.levers || []).map(function (l) { return '<tr><td>Step ' + l.n + ' · ' + esc(l.name) + '</td><td class="r">' + roas(l.roas) + '</td><td class="r">' + gbp(spendOf(l), 0) + '</td></tr>'; }).join('') + (rv.cut_only_ceiling ? '<tr><td>Best reachable by cutting alone</td><td class="r">' + roas(rv.cut_only_ceiling.roas) + '</td><td class="r">' + gbp(spendOf(rv.cut_only_ceiling), 0) + '</td></tr>' : '') + '</tbody></table></div>'; }
      if (STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) h += '<div class="an-panel"><h3>Target' + src('Management') + '</h3><div class="an-form"><input id="moTg" type="number" step="0.1" value="' + D.target + '" style="width:90px"><select id="moTgA"><option value="">Fleet</option>' + Object.keys(D.accounts).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('') + '</select><button class="an-btn" id="moTgGo">Set target</button></div></div>';
      h += '<div class="an-note">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + '</div>';
      $('moRo').innerHTML = h;
      var g = $('moTgGo'); if (g) g.onclick = function () { g.disabled = true; api('adtoolRoasTarget', { set_target: Number($('moTg').value), account: $('moTgA').value }).then(function () { toast('Target set'); loadRoas(); }).catch(function (e) { toast(e.message); g.disabled = false; }); };
    }).catch(function (e) { fail('moRo', e); });
  }

  /* ---------------- Data health ---------------- */
  VIEWS.adtoolHealth = {
    label: 'Data health (ads)', hidden: true, order: 94, roles: ROLES, icon: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Data health', 'What is up to date, what is missing, and which numbers have been checked', 'moHeFresh') + '<div id="moHe"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () {
      api('adtoolHealthPage', {}).then(function (D) {
        if (!$('moHe')) return;
        adtFreshShow('moHeFresh', D.fresh);
        D.truth = D.truth || []; D.jobs = D.jobs || []; D.gaps = D.gaps || {}; D.schedules = D.schedules || {}; D.cursors = D.cursors || {}; D.truth_summary = D.truth_summary || []; D.flags = D.flags || []; D.register = D.register || [];
        var pass = D.truth.filter(function (t) { return t.status === 'PASS'; }).length, failn = D.truth.filter(function (t) { return t.status === 'FAIL'; }).length;
        var h = '<div class="an-kpis">' + kpi('Number checks', failn ? failn + ' FAIL' : pass + ' PASS', failn ? 'a mismatch holds this page back' : 'every checked number adds up', failn ? 'an-neg' : 'an-pos') + kpi('Jobs with errors', String(D.jobs.filter(function (j) { return j.last_status === 'error'; }).length), D.jobs.length + ' jobs watched') + kpi('Campaigns we cannot name', String((D.gaps.unresolved_campaign_ids && D.gaps.unresolved_campaign_ids.n) || 0), 'we have no name for these yet') + kpi('Orders not costed yet (30 days)', String((D.gaps.pending_cost_orders_30d && D.gaps.pending_cost_orders_30d.n) || 0), 'counted, never guessed') + kpi('Categories filled in', ((D.gaps.categories && D.gaps.categories.filled) || 0) + ' / ' + ((D.gaps.categories && D.gaps.categories.total) || 0), 'active listings, still filling') + '</div>';
        h += '<div class="an-panel"><h3>Jobs</h3><table class="an-tbl"><thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th class="r">Rows</th><th>Status</th><th>Note</th></tr></thead><tbody>' + D.jobs.map(function (j) { return '<tr><td>' + esc(j.job) + '</td><td>' + esc(D.schedules[j.job] || '—') + '</td><td>' + esc(String(j.last_end || j.last_start || '').slice(0, 16)) + '</td><td class="r">' + (j.last_rows == null ? '—' : j.last_rows) + '</td><td class="' + (j.last_status === 'error' || j.last_status === 'FAIL' ? 'an-neg' : 'an-pos') + '">' + esc(j.last_status || '') + '</td><td>' + esc(String(j.last_note || '').slice(0, 120)) + '</td></tr>'; }).join('') + '</tbody></table><div class="an-sub" style="margin-top:8px">Worked out up to: daily totals ' + esc(D.cursors.rollup || '—') + ' · patterns ' + esc(D.cursors.profiles || '—') + ' · forecast ' + esc(D.cursors.forecast || '—') + '</div></div>';
        /* Phase 1B: the freshness map (§5 of the plan) — one row per data family, its cadence, last update and age —
           and the ADTOOL_TODAY_FRESHNESS verdict (tick age < 10 min inside the 07:05–23:59 UTC sampling window) */
        var FM = D.freshness_map, fmRows = [];
        if (Array.isArray(FM)) fmRows = FM;
        else if (FM && typeof FM === 'object') fmRows = Object.keys(FM).map(function (k) { var v = FM[k]; return typeof v === 'object' && v ? Object.assign({ family: k }, v) : { family: k, cadence: String(v) }; });
        var todayFresh = D.today_freshness || D.truth.filter(function (t) { return t.metric_id === 'ADTOOL_TODAY_FRESHNESS'; })[0] || null;
        if (fmRows.length || todayFresh) {
          h += '<div class="an-panel"><h3>What can be live</h3><div class="an-sub">Today\'s ad figures are read every 5 minutes once eBay starts its day, around 08:00 UK. Everything else updates on its own clock, shown here.</div>' +
            (fmRows.length ? '<div class="an-scroll"><table class="an-tbl"><thead><tr><th>Data</th><th>How often</th><th>Last update</th><th class="r">Age</th><th>Note</th></tr></thead><tbody>' + fmRows.map(function (r) {
              /* the engine's key is last_at (rebuilt_at for the today grain's own write); the rest are older spellings */
              var last = r.last_at || r.rebuilt_at || r.last_update || r.last || r.updated_at || r.sampled_at || r.rolled_at || r.t || '';
              var ageTxt = r.age != null ? String(r.age) : (r.age_min != null ? r.age_min + ' min' : (last ? ago(last) : '—'));
              var late = r.stale != null ? !!r.stale : (r.truth && r.truth.status === 'FAIL');
              var note = [];
              if (r.truth && r.truth.status) note.push('check ' + r.truth.status + (r.truth.evidence ? ': ' + String(r.truth.evidence).slice(0, 90) : ''));
              if (r.flag != null) note.push('switch ' + r.flag);
              if (r.rebuilt_at && r.last_at) note.push('rebuilt ' + ago(r.rebuilt_at));
              if (r.cursor) note.push('up to ' + r.cursor);
              if (r.hits && r.hits.length) note.push(r.hits.map(function (x) { return x.action + ' ' + x.hits_misses; }).join(' · '));
              if (r.note || r.window) note.push(r.note || r.window);
              return '<tr><td>' + esc(r.family || r.name || '') + '</td><td>' + esc(r.cadence || '—') + '</td><td>' + esc(last ? String(last).replace('T', ' ').slice(0, 16) : '—') + '</td><td class="r ' + (late ? 'an-neg' : '') + '">' + esc(ageTxt) + '</td><td>' + esc(note.join(' · ')) + '</td></tr>';
            }).join('') + '</tbody></table></div>' : '<div class="an-empty">Not available yet.</div>') +
            (todayFresh ? '<div class="an-kpis" style="margin-top:10px">' + kpi('Today\'s figures', esc(todayFresh.status || '—'), esc(todayFresh.evidence || todayFresh.note || 'no check yet') + (todayFresh.ran_at ? ' · checked ' + esc(String(todayFresh.ran_at).slice(0, 16)) : ''), todayFresh.status === 'PASS' ? 'an-pos' : (todayFresh.status === 'FAIL' ? 'an-neg' : '')) + '</div>' : '') + '</div>';
        }
        h += '<div class="an-panel"><h3>Number checks' + src('validation_runs', 'checks') + '</h3><table class="an-tbl"><thead><tr><th>Number</th><th>Where</th><th>Status</th><th>Evidence</th><th>Checked</th></tr></thead><tbody>' + D.truth_summary.map(function (t) { return '<tr><td>' + esc(t.metric_id) + '</td><td>' + t.n + ' scope' + (t.n === 1 ? '' : 's') + '</td><td class="' + (t.status === 'PASS' ? 'an-pos' : 'an-neg') + '">' + esc(t.status) + '</td><td></td><td>' + esc(String(t.last).slice(0, 16)) + '</td></tr>'; }).join('') + D.truth.filter(function (t) { return t.status !== 'PASS' || /LISTING|VERDICT|FLEET|SHUFFLE|MASE|ALERTS/.test(t.metric_id); }).slice(0, 12).map(function (t) { return '<tr><td>' + esc(t.metric_id) + '</td><td>' + esc(t.scope_key) + '</td><td class="' + (t.status === 'PASS' ? 'an-pos' : 'an-neg') + '">' + esc(t.status) + '</td><td>' + esc(t.evidence) + '</td><td>' + esc(String(t.ran_at).slice(0, 16)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
        var SL = D.sheet_law_check;
        /* the GATE the verdict is computed on is the WINDOW total (profit before ads, |Δ| ≤ max(£25, 10 %) of the
           sheet); the per-day count is an informational band (max(£8, 8 %)) — printed as such, so a PASS never sits
           beside a column it visibly fails. The window's money (profit_window) is account profit in disguise — the
           tolerance is 10 % of the account's week before ads — so the engine strips it for non-profit roles: the
           cells then read the within-window verdict, never a figure. */
        function slDelta(a) {
          var w = a.profit_window || {};
          var d = num(w.window_delta); if (d == null) return a.within_window == null ? '—' : (a.within_window ? '<span class="an-pos">within</span>' : '<span class="an-neg">outside</span>');
          var p = num(w.before_ads_delta_pct);
          return gbp(d) + (p != null ? ' (' + (p > 0 ? '+' : '') + (Math.round(p * 10) / 10) + ' %)' : '');
        }
        function slTol(a) { var t = num(a.profit_window && a.profit_window.window_tolerance); return t == null ? '—' : '±' + gbp(t, 0); }
        h += '<div class="an-panel"><h3>Our profit against the Sales Analysis sheet' + src('check') + '</h3><div class="an-sub">' + esc(SL ? SL.rule : '') + '</div>' + (SL ? '<div class="an-kpis">' + kpi('Result', esc(SL.status), 'checked ' + esc(String(SL.ran_at || '').slice(0, 16)), SL.status === 'PASS' ? 'an-pos' : 'an-neg') + '</div><table class="an-tbl"><thead><tr><th>Account</th><th>Status</th><th class="r" title="profit before ads over the period, this tool minus the sheet">Difference before ads</th><th class="r" title="whichever is larger: £25 or 10% of the sheet figure">Allowed difference</th><th class="r" title="a day matches within £8 or 8%, whichever is larger. For information only">Days that match</th></tr></thead><tbody>' + (SL.per_account || []).map(function (a) { return '<tr><td>' + esc(a.account) + '</td><td class="' + (a.status === 'PASS' ? 'an-pos' : 'an-neg') + '">' + esc(a.status) + '</td><td class="r">' + slDelta(a) + '</td><td class="r">' + slTol(a) + '</td><td class="r">' + (a.days_pass == null ? '—' : a.days_pass + ' of ' + a.days) + ' <span class="an-src" style="margin-left:4px">info</span></td></tr>'; }).join('') + '</tbody></table>' : '<div class="an-empty">Not checked yet. The first result appears once the history has been rebuilt up to today.</div>') + '</div>';
        h += '<div class="an-panel"><h3>What is missing</h3><div>' + [['Campaign figures', (D.gaps.campaign_rows && D.gaps.campaign_rows.n) ? D.gaps.campaign_rows.n + ' rows ' + D.gaps.campaign_rows.mn + ' → ' + D.gaps.campaign_rows.mx : 'none yet'], ['Ad readings', (D.gaps.intraday && D.gaps.intraday.samples) ? D.gaps.intraday.samples + ' since ' + String(D.gaps.intraday.first).slice(0, 16) : 'none'], ['Days a listing ran out of budget (7 days)', String((D.gaps.capped_days_7d && D.gaps.capped_days_7d.n) || 0)], ['Report days eBay has not sent', D.gaps.missing_report_days.length ? D.gaps.missing_report_days.map(function (m) { return m.account + ' ' + m.days; }).join(', ') : 'none']].map(function (x) { return '<span class="mo-chip">' + esc(x[0]) + ': <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div></div>';
        h += '<div class="an-panel"><h3>Switches</h3><div>' + D.flags.map(function (f) { return '<span class="mo-chip ' + (f.value === 'on' ? 'ok' : '') + '">' + esc(f.key.replace('adtool_', '')) + ': <b>' + esc(f.value) + '</b></span>'; }).join('') + '</div><div class="an-sub" style="margin-top:8px">Turning a switch off rolls that piece back.</div></div>';
        /* The eight plumbing rows are marked `internal` by the engine so staff never meet them. The
           modal already filters on it; this table must too, or the flag hides them in one place and shows
           them in the other. An older cached payload carries no flag, and then nothing is filtered, which
           is the pre-flag behaviour and correct. */
        var regRows = (D.register || []).filter(function (r) { return !r.internal; });
        h += '<div class="an-panel"><h3>Number register' + src(regRows.length + ' numbers') + '</h3><div class="an-sub">Every number this tool prints, and how it is worked out. "How it is worked out" is the whole answer: the "where from" column names our own tables and is kept for the plumbing rows only.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Number</th><th>Name</th><th>How it is worked out</th><th>Where from</th><th>Updated</th><th>Rechecked</th></tr></thead><tbody>' + regRows.map(function (r) { return '<tr><td>' + esc(r.metric_id) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.formula) + '</td><td>' + (r.internal ? esc(r.source_tables) : '—') + '</td><td>' + esc(r.recompute) + '</td><td>' + esc(r.recheck) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
        h += '<div class="an-note">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · jobs run on a timer, and a job that fails records its error here</div>';
        $('moHe').innerHTML = h;
      }).catch(function (e) { fail('moHe', e); });
    }
  };
})();
