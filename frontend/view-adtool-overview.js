/* view-adtool-overview.js — Advertising Tool · Overview (the owner's Change Spec, 28 Oct 2026).
 * The portal's landing page, and the merge of the two screens it replaces: "What to do today"
 * (adtoolPlan) gives block 1, "Today at a glance" (adtoolCommand) gives blocks 2 to 5.
 *   1  period bar, account chips and six tiles for the window the reader picks   · adtoolPlan
 *   2  the status line, nine tiles, and today by account                         · adtoolCommand
 *   3  today so far by slot                                                      · adtoolCommand
 *   4  ONE hourly chart: money spent beside orders received, per UK hour         · adtoolCommand
 *   5  how up to date this is                                                    · adtoolCommand
 * Everything else the two old pages carried is gone from this portal, so each figure the merge
 * kept has exactly one home. Account to account, Day by day, the spending limit, What to run and
 * stop today, Switch off, Improving, Worth more money, Budget, Weekdays, Listings spending today,
 * Fleet ad spend by date, the two old hour charts and Every check are all off this page; the
 * listings table now has its own page. No profit figure appears here at all: profit is a listing's
 * own and lives on the pages that show listings. Galaxy tokens; gold the accent, #e0563f the spend
 * bar and the only loss colour, var(--ok) the orders bar. Nothing here is sent to eBay.
 *
 * 31 Oct (owner's brief, section 2): every block above is a function on window.adtOverviewBlocks,
 * and THIS PAGE RENDERS THROUGH THOSE SAME FUNCTIONS. The Peak-time overview at the top of the Peak
 * time listings page draws the same blocks from the same engine answers asked for one cohort, so
 * there is one code path, one set of tiles and one set of graphs. A tile cannot read one way here
 * and another way there, because there is only one of it.
 * The .ov- rules below are this file's own and travel with it: both builds splice every
 * view-adtool-*.js file, and in both of them this file is spliced before view-adtool-peak.js
 * (sorted order), so the blocks and their styling land together on either front door. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var ORDERS_C = 'var(--ok)';
  var ORDERS_INK = '#06281b';
  var SLOTS = ['Night 00–06', 'Morning 06–12', 'Afternoon 12–17', 'Evening 17–24'];
  var OV = { account: '', period: null, accounts: [], plan: null, cmd: null };

  /* this file's own prefix. The declarations are the portal's usual tile / panel / table rules,
     written here rather than borrowed from another spliced file, so the page cannot change shape
     because somebody edited a class of theirs. */
  VIEW_CSS.push([
    '.ov-wrap{max-width:1240px}',
    '.ov-acct{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.ov-acct button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}',
    '.ov-acct button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.ov-win{font-size:12px;color:var(--text-2);margin:0 0 12px;font-weight:600}',
    '.ov-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}',
    '.ov-tile{flex:1 1 150px;border:1px solid var(--gold-line);border-radius:12px;padding:10px 14px;background:var(--panel-2)}',
    '.ov-tile .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.ov-tile .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.ov-tile.gold .v{color:var(--gold-a)}.ov-tile.loss .v{color:' + LOSS + '}',
    '.ov-tile .d{font-size:11.5px;color:var(--text-2);margin-top:2px;line-height:1.4}',
    '.ov-status{margin:0 0 12px}',
    '.ov-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px}',
    '.ov-kpi{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px}',
    '.ov-kpi .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.ov-kpi .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}',
    '.ov-kpi .d{font-size:11.5px;color:var(--text-2);margin-top:2px;line-height:1.45}',
    '.ov-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.ov-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.ov-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.5}',
    '.ov-carry{font-size:12px;color:var(--text-2);margin:-4px 0 8px;line-height:1.5}',
    '.ov-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.ov-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);padding:6px 8px;border-bottom:1px solid var(--gold-line);font-weight:800}',
    '.ov-tbl td{padding:6px 8px;border-bottom:1px solid var(--gold-line);vertical-align:top;color:var(--text)}',
    '.ov-tbl td.r,.ov-tbl th.r{text-align:right}',
    '.ov-scroll{overflow-x:auto}',
    '.ov-neg{color:#ffb3a6}',
    '.ov-empty{color:var(--text-3);font-size:13px;padding:6px 0}',
    '.ov-src{display:inline-block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:8px;vertical-align:middle;font-weight:800;cursor:pointer}',
    '.ov-chip{display:inline-block;padding:3px 9px;border-radius:999px;border:1px solid var(--gold-line);background:var(--panel);font-size:11.5px;color:var(--text-2);margin:0 6px 6px 0}',
    '.ov-legend{display:flex;gap:14px;font-size:11px;font-weight:800;color:var(--text-3);margin:0 0 4px;flex-wrap:wrap}',
    '.ov-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
    '.ov-foot{font-size:12px;color:var(--text-2);margin-top:8px;line-height:1.5}'
  ].join(''));

  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  /* ONE money format across the advertising view files: thousands separated, two decimals unless
     the caller asks for fewer. The same figure must not read £1,234 on one page and £1234.00 on
     the next. Pence are for per-day and part-day money; a finished window total is called with 0. */
  function gbp(v, d) {
    if (v == null || v === '' || isNaN(Number(v))) return '—';
    var n = Number(v), p = d == null ? 2 : Number(d);
    return (n < 0 ? '−£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: p, maximumFractionDigits: p });
  }
  function gbp0(v) { return gbp(v, 0); }
  function roas(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function pct(v) { v = num(v); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* `t` is the LOOKUP key the register box matches on and must stay stable when the wording
     changes; `shown` is what the reader sees. Reword arg 2, never arg 1. */
  function src(t, shown) { return '<span class="ov-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function kpi(k, v, d, c) { return '<div class="ov-kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (c || '') + '">' + v + '</div><div class="d">' + d + '</div></div>'; }
  function tile(k, v, d, c) { return '<div class="ov-tile ' + (c || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="d">' + d + '</div></div>'; }
  function ago(t) {
    if (!t) return 'never';
    var ms = Date.now() - new Date(String(t).replace(' ', 'T') + (String(t).endsWith('Z') ? '' : 'Z')).getTime();
    if (isNaN(ms)) return esc(String(t).slice(0, 16));
    var m = Math.round(ms / 60000);
    return m < 60 ? m + ' min ago' : (m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago');
  }

  VIEWS.adtoolOverview = {
    label: 'Overview', hidden: true, order: 62, roles: ROLES,
    icon: '<path d="M3 3v18h18"/><path d="m6 15 4-4 3 3 5-7"/>',
    render: function () {
      return '<div class="ov-wrap">' + adtHgroup('Overview', 'Where the ad money went, and how today is going') +
        /* the sub-page is not a sidebar line (the owner fixed the ten pages on 28 Oct), so this is
           the way in to it. Hidden views stay reachable by hash. */
        '<div class="ov-win" style="margin:-4px 0 12px">These same figures over the listings that carry a product video: ' +
        '<a class="vid-link" href="#adtoolVideos">Videos</a></div>' +
        '<div id="ovBar"></div><div id="ovAcct" class="ov-acct"></div>' +
        '<div id="ovHero"><div class="ov-empty">Loading…</div></div>' +
        '<div id="ovToday"><div class="ov-empty">Loading…</div></div></div>';
    },
    init: function () {
      OV.period = adtPeriodBar('ovBar', { page: 'adtoolOverview', def: 'd30', onChange: function (v) { OV.period = v; loadPlan(false); } });
      acctChips();
      loadPlan(false)['catch'](function () {});
      loadCmd(false)['catch'](function () {});
      /* today moves every 5 minutes. adtPoll skips hidden tabs and stops for good on an 'auth'
         refusal (the session-expiry law). */
      adtPoll('ovToday', 300000, function () { return loadCmd(true); });
    }
  };

  /* ── block 1 · the window the reader picks (adtoolPlan) ──────────────────────────────────── */

  function acctChips() {
    var el = $('ovAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (OV.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      OV.accounts.map(function (a) { return '<button class="' + (OV.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    /* ONE chip for the whole page. It used to move block 1 only, so the reader picked an account
       and the nine tiles, the account table, the slots and the hourly chart under it went on
       answering for the whole fleet with nothing saying so. Both halves are re-asked. */
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { OV.account = this.getAttribute('data-a'); acctChips(); loadPlan(false)['catch'](function () {}); loadCmd(false)['catch'](function () {}); };
  }
  function loadPlan(quiet) {
    var p = adtPeriodParams(OV.period); if (OV.account) p.account = OV.account;
    return api('adtoolPlan', p).then(function (d) {
      OV.plan = d || {};
      var names = (d && d.accounts) || [];
      if (names.length) { OV.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean); acctChips(); }
      if (!$('ovHero')) return;
      $('ovHero').innerHTML = window.adtOverviewBlocks.hero(OV.plan);
      adtPeriodEcho('ovBar', d && d.period);
      /* a window that reaches into today moves every 5 minutes; a finished window does not */
      if (adtIncludesToday(d && d.period, OV.period)) { adtPoll('ovHero', 300000, function () { return loadPlan(true); }); } else { adtPollStop('ovHero'); }
    })['catch'](function (e) {
      if (!quiet && $('ovHero')) $('ovHero').innerHTML = '<div class="ov-panel"><h3>Not available</h3><div class="ov-sub">' + esc(e && e.message ? e.message : 'This block could not load.') + '</div></div>';
      throw e;
    });
  }
  /* the window the block stands on: the engine names it (`period`); the page never assumes 30 */
  function windowText(D) {
    var P = D.period;
    if (P && (P.label || P.from)) return adtPeriodText(P).replace(/^./, function (c) { return c.toLowerCase(); });
    var w = D.window || {}, days = num(w.days);
    return 'last ' + (days != null ? days : 30) + ' days to yesterday' + (w.from && w.to ? ' (' + w.from + ' → ' + w.to + ')' : '');
  }
  function windowDays(D) {
    var d = num(D.hero && D.hero.days);
    if (d == null) d = num(D.period && D.period.days);
    if (d == null) d = num(D.window && D.window.days);
    return d && d > 0 ? d : 30;
  }
  function heroBlock(D) {
    if (!D || typeof D !== 'object') return '<div class="ov-empty">No figures for this period.</div>';
    var H = D.hero || D.summary || null, days = windowDays(D);
    if (!H) return '<div class="ov-empty">No figures for this period.</div>';
    var ro = num(H.roas);
    if (ro == null && num(H.spend) > 0 && num(H.attr_revenue) != null) ro = num(H.attr_revenue) / num(H.spend);
    var spendDay = num(H.spend_day), salesDay = num(H.attr_revenue_day != null ? H.attr_revenue_day : H.revenue_day);
    if (spendDay == null && num(H.spend) != null) spendDay = num(H.spend) / days;
    if (salesDay == null && num(H.attr_revenue) != null) salesDay = num(H.attr_revenue) / days;
    var acct = D.account && D.account !== 'all' ? D.account : 'all accounts';
    var h = '<div class="ov-win"><b>' + esc(acct) + '</b> · ' + esc(windowText(D)) +
      (num(H.listings) != null ? ' · ' + cnt(H.listings) + ' listings with spend' : '') +
      (D.period && D.period.includes_today ? ' · today is still updating' : '') + src('eBay ads report') + '</div>';
    h += '<div class="ov-tiles">' +
      tile('Spend', gbp0(H.spend), esc(gbp(spendDay)) + ' a day over ' + days + ' day' + (days === 1 ? '' : 's'), 'gold') +
      tile('Sales from ads', gbp0(H.attr_revenue), esc(gbp(salesDay)) + ' a day · the sales eBay credits to the ads') +
      tile('ROAS', roas(ro), 'sales from ads ÷ spend', ro != null && ro < 1 ? 'loss' : 'gold') +
      tile('CPC', gbp(H.cpc), esc(cnt(H.clicks)) + ' clicks') +
      tile('Conversion rate', pct(H.cvr), esc(cnt(H.attr_units)) + ' units from ads ÷ clicks') +
      tile('Orders', cnt(H.orders), esc(cnt(H.units)) + ' units, all channels') +
      '</div>';
    return h;
  }

  /* ── blocks 2 to 5 · today (adtoolCommand) ───────────────────────────────────────────────── */

  /* the engine's contract key is `tiles`; `windows` / top-level are older engines */
  function cmWin(D, k) { var w = (D.tiles && D.tiles[k]) || (D.windows && D.windows[k]) || D[k] || null; return w && typeof w === 'object' ? w : null; }
  function cmRoas(w) { if (!w) return null; if (w.roas != null) return num(w.roas); var s = num(w.spend), r = num(w.attr_revenue); return s > 0 && r != null ? r / s : null; }
  function cmSum(rows, k) { return rows.reduce(function (t, r) { return t + (num(r[k]) || 0); }, 0); }

  function loadCmd(quiet) {
    /* ONE request: adtoolCommand runs the today computation inside the engine and forwards all of
       it, totals_by_account included, so every today figure on this page comes off that answer. */
    return api('adtoolCommand', OV.account ? { account: OV.account } : {}).then(function (d) {
      OV.cmd = d || {};
      if ($('ovToday')) drawToday();
    })['catch'](function (e) {
      if (!quiet && $('ovToday')) $('ovToday').innerHTML = '<div class="ov-panel"><h3>Not available</h3><div class="ov-sub">' + esc(e && e.message ? e.message : 'Today could not load.') + '</div></div>';
      throw e;
    });
  }

  function drawToday() {
    var D = OV.cmd || {};
    /* THROUGH THE SHARED BLOCKS, not past them. The Peak-time overview draws the same five in the
       same order from a cohort answer, so neither screen can quietly grow a tile the other has not. */
    var B = window.adtOverviewBlocks;
    $('ovToday').innerHTML = B.today(D) + B.byAccount(D) + B.slots(D) + B.hourly(D) + B.foot(D);
  }

  /* block 2 — the status line and the tiles, as one block: they answer the same question and a
     reader has never wanted one without the other. */
  function todayBlock(D) { return statusBlock(D) + tilesBlock(D); }

  /* block 5 — how up to date this is, and the line that says where the figures came from.
     An answer with no `source` used to print a bare " · " in front of the rest of the footer. */
  function footBlock(D) {
    var foot = [];
    if (D.source) foot.push(esc(String(D.source)));
    if (D.computed_at) foot.push('computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC');
    foot.push('refreshes every 5 min while this tab is open');
    return freshBlock(D) + '<div class="ov-foot">' + foot.join(' · ') + '</div>';
  }

  /* THE ONE SET OF BLOCKS. Each takes an engine answer and returns HTML: the Overview hands it the
     whole fleet's, the Peak-time overview hands it the same answer asked for the peak-list cohort.
     Named on window because the two pages are two separate spliced files and this is how every
     shared piece in this portal travels. */
  window.adtOverviewBlocks = {
    hero: heroBlock, today: todayBlock, hourly: hourBlock,
    byAccount: accountBlock, slots: slotBlock, foot: footBlock,
  };

  /* block 2a — the status line: when today was last read, how often, and what is still missing */
  function statusBlock(D) {
    var fresh = D.fresh || null, f = D.freshness || {};
    if (!fresh && f.last_sample && f.last_sample.t) fresh = { grain: 'today', sampled_at: f.last_sample.t, cadence: '5 min' };
    var tag = fresh ? adtFreshTag(fresh) : '';
    return '<div class="ov-status">' + (tag || '<span class="ov-chip">Today has not been read yet</span>') + '</div>';
  }

  /* block 2b — the nine tiles */
  function tilesBlock(D) {
    var y = cmWin(D, 'yesterday') || {};
    var byAcct = D.totals_by_account || null;
    var today = cmWin(D, 'today');
    if (!today && byAcct && byAcct.length) {
      today = { spend: cmSum(byAcct, 'spend'), attr_revenue: cmSum(byAcct, 'attr_revenue'), attr_units: cmSum(byAcct, 'attr_units'), clicks: cmSum(byAcct, 'clicks'), orders: cmSum(byAcct, 'orders'), units: cmSum(byAcct, 'units') };
    }
    var repStatus = y.report_status != null ? String(y.report_status) : (D.report_status != null ? String(D.report_status) : null);
    var win = function (label, w, sub, note) {
      if (!w) return kpi(label, '—', sub + '<br>not available yet');
      return kpi(label, gbp0(w.spend), gbp0(w.attr_revenue) + ' sales from ads · ROAS ' + roas(cmRoas(w)) +
        (w.attr_units != null ? ' · ' + w.attr_units + ' units from ads' : '') + '<br>' + sub +
        (note ? ' · <span class="ov-neg">' + note + '</span>' : ''));
    };
    var lateAccounts = function (m) { var late = Object.keys(m || {}).filter(function (a) { return m[a] !== 'final'; }); return late.length ? ' (' + esc(late.join(', ')) + ')' : ''; };
    var h = '<div class="ov-kpis">' +
      win('Today so far', today,
        (today && today.ads_sampled === false ? 'no ad figures from eBay yet today, orders only' : 'still updating, read every 5 minutes') +
        (today && today.sampled_at ? ' · ' + esc(String(today.sampled_at).slice(11, 16)) + ' UTC' : '') +
        (today && num(today.pending) > 0 ? ' · ' + today.pending + ' order' + (num(today.pending) === 1 ? '' : 's') + ' not costed yet' : '')) +
      win('Yesterday', (y.spend != null || y.attr_revenue != null) ? y : null, esc(y.day || y.from || ''),
        repStatus != null && repStatus !== 'final' ? 'eBay figures still arriving' + lateAccounts(y.report_status_by_account) : '') +
      win('Last 7 days', cmWin(D, 'd7'), (function (w) { return w && w.from ? esc(w.from) + ' → ' + esc(w.to || '') : 'to yesterday'; })(cmWin(D, 'd7'))) +
      win('Last 30 days', cmWin(D, 'd30'), (function (w) { return w && w.from ? esc(w.from) + ' → ' + esc(w.to || '') : 'to yesterday'; })(cmWin(D, 'd30'))) +
      '</div>';
    /* `decisions_waiting` stood at a hard nought from the day it was written. The tile reads the
       Decision page's own count instead, and says in its own label that this one figure does not
       follow the account chip: it is counted across every account, the way that page counts it. */
    var decisions = num(D.decisions_today);
    var scope = String(D.decisions_scope || 'all accounts');
    var fleetOnly = OV.account ? ' · all accounts' : '';
    h += '<div class="ov-kpis">' +
      kpi('CPC yesterday', num(y.clicks) > 0 && y.spend != null ? gbp(Number(y.spend) / Number(y.clicks)) : '—', (y.clicks || 0) + ' clicks') +
      kpi('Conversion rate yesterday', num(y.clicks) > 0 && y.attr_units != null ? pct(Number(y.attr_units) / Number(y.clicks)) : '—', 'units from ads ÷ clicks') +
      kpi('Orders yesterday, all channels', y.orders != null ? cnt(y.orders) : '—', y.units != null ? y.units + ' units' : 'not available yet') +
      kpi('Open alerts' + fleetOnly, D.alerts && D.alerts.n != null ? String(D.alerts.n) : '—', D.alerts && D.alerts.n != null ? ((D.alerts.high || 0) + ' high') : 'not available yet', (D.alerts && D.alerts.high) ? 'ov-neg' : '') +
      kpi('Decisions today · ' + scope, decisions == null ? '—' : String(decisions),
        (decisions == null ? 'not available yet' : 'what the Decision page lists today') + src('decisions today')) +
      '</div>';
    return h;
  }

  /* block 2c — today by account: spend, sales from ads, ROAS, CPC, conversion rate, orders. No
     profit: a profit figure added up across listings is not a figure this portal shows. */
  function accountBlock(D) {
    var rows = D.totals_by_account || null;
    if (!rows || !rows.length) return '';
    return '<div class="ov-panel"><h3>Today by account' + src('today so far · every 5 min') + '</h3>' +
      '<div class="ov-sub">Spend and sales from ads since 00:00 UTC, as far as eBay has reported. Orders are counted by UK day.</div>' +
      '<div class="ov-scroll"><table class="ov-tbl"><thead><tr><th>Account</th><th class="r">Spend</th><th class="r">Sales from ads</th><th class="r">ROAS</th><th class="r">Clicks</th><th class="r">CPC</th><th class="r">Conversion rate</th><th class="r">Units from ads</th><th class="r">Orders</th><th class="r">Units</th></tr></thead><tbody>' +
      rows.map(function (a) {
        var ck = num(a.clicks) || 0, sp = num(a.spend);
        return '<tr><td>' + esc(a.account) + '</td><td class="r">' + gbp(sp) + '</td><td class="r">' + gbp(a.attr_revenue) + '</td>' +
          '<td class="r">' + roas(cmRoas(a)) + '</td><td class="r">' + ck + '</td>' +
          '<td class="r">' + (a.cpc != null ? gbp(a.cpc) : (ck > 0 && sp != null ? gbp(sp / ck) : '—')) + '</td>' +
          '<td class="r">' + (a.cvr != null ? pct(a.cvr) : (ck > 0 && a.attr_units != null ? pct(Number(a.attr_units) / ck) : '—')) + '</td>' +
          '<td class="r">' + (a.attr_units == null ? '—' : a.attr_units) + '</td><td class="r">' + (a.orders == null ? '—' : a.orders) + '</td>' +
          '<td class="r">' + (a.units == null ? '—' : a.units) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* block 3 — today so far by slot, against the times of day this fleet usually sells in */
  function slotBlock(D) {
    var head = '<div class="ov-panel"><h3>Today so far by slot' + src('orders') + '</h3>' +
      '<div class="ov-sub">Against the times of day this fleet usually sells in.</div>';
    /* no list at all is "not counted yet"; an empty list is a real "nothing yet today" */
    if (!Array.isArray(D.today_slots)) return head + '<div class="ov-empty">Today\'s orders have not been counted yet.</div></div>';
    var rows = D.today_slots;
    var tot = rows.reduce(function (t, s) { return t + (num(s.units) || 0); }, 0);
    return head +
      '<table class="ov-tbl"><thead><tr><th>Slot</th><th class="r">Units</th><th class="r">Share</th><th class="r">Profile</th></tr></thead><tbody>' +
      SLOTS.map(function (s, i) {
        var r = rows.filter(function (x) { return Number(x.slot) === i; })[0];
        var u = r ? Number(r.units) : 0;
        var p = D.slot_profile && D.slot_profile.shares ? D.slot_profile.shares[i] : null;
        return '<tr><td>' + esc(s) + '</td><td class="r">' + u + '</td><td class="r">' + (tot ? Math.round(u / tot * 100) + '%' : '—') + '</td><td class="r">' + (p == null ? '—' : Math.round(p * 100) + '%') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* the value pills the chart kit draws are sized by their own text, so the page can work out
     where each one will land and move the ones that would sit on top of each other. These two
     numbers are chartValueDots' own, and must be passed to it unchanged. */
  var PILL_FS = 8.5, PILL_H = PILL_FS + 6;
  function pillW(label) { var t = String(label); return Math.max(PILL_FS + 9, t.length * PILL_FS * 0.60 + 9); }
  function declash(pills) {
    var placed = [], i, j, p, q, lift, pass;
    pills = pills.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    for (i = 0; i < pills.length; i++) {
      p = pills[i];
      for (pass = 0; pass < 8; pass++) {
        lift = null;
        for (j = 0; j < placed.length; j++) {
          q = placed[j];
          if (Math.abs(p.x - q.x) >= (pillW(p.label) + pillW(q.label)) / 2) continue;
          if (Math.abs(p.y - q.y) >= PILL_H) continue;
          if (lift == null || q.y < lift) lift = q.y;
        }
        if (lift == null) break;
        if (lift - PILL_H < 10) break;       /* no room left above: leave it where it is */
        p.y = lift - PILL_H;
      }
      placed.push(p);
    }
  }

  /* block 4 — ONE hourly chart. Per UK hour of today a red bar of money beside a green bar of
     orders: the spend comes from the 5-minute ad readings (hour_curve) and the orders from the
     order sync (today_hours), on the same hour key, so the two bars of an hour line up. Drawn
     with the portal's own value-pill kit and no library. The two series count different things,
     so each is drawn against its own busiest hour and every bar carries its figure. */
  function hourBlock(D) {
    var head = '<h3>Today hour by hour' + src('today hour by hour', 'today so far · every 5 min') + '</h3>' +
      '<div class="ov-sub">Money spent and orders received in each UK hour.</div>';
    var curve = (Array.isArray(D.hour_curve) && D.hour_curve.length) ? D.hour_curve : null;
    var ords = (Array.isArray(D.today_hours) && D.today_hours.length) ? D.today_hours : null;
    var missing = [];
    if (!curve) missing.push('Spend by hour is not available yet.');
    if (!ords) missing.push(D.today_hours ? 'No orders yet today.' : 'Orders by hour are not available yet.');
    if (!curve && !ords) {
      return '<div class="ov-panel">' + head + '<div class="ov-empty">' + esc(missing.join(' ')) + '</div></div>';
    }
    var sp = {}, od = {}, un = {}, i;
    (curve || []).forEach(function (x) { var hh = num(x.hour_uk != null ? x.hour_uk : x.hour); if (hh != null && hh >= 0 && hh < 24) sp[hh] = num(x.spend) || 0; });
    (ords || []).forEach(function (x) { var hh = num(x.hour_uk != null ? x.hour_uk : x.hour); if (hh != null && hh >= 0 && hh < 24) { od[hh] = num(x.orders) || 0; un[hh] = num(x.units) || 0; } });
    var W = 980, H = 280, L = 46, R = 12, T = 46, B = 30;
    var zero = H - B, plot = zero - T, slot = (W - L - R) / 24;
    var maxS = 0, maxO = 0;
    for (i = 0; i < 24; i++) { maxS = Math.max(maxS, sp[i] || 0); maxO = Math.max(maxO, od[i] || 0); }
    /* THE DAY IS NOT OVER. Both halves leave out an hour nothing happened in, so the chart has to
       draw all 24 or the hours would not line up with the clock. But an hour that has not arrived
       yet is not a nought: the LAST hour either half has anything for is as far as the day has got,
       and past that the bar is drawn as an empty slot with no figure on it and a tooltip that says
       so. Printing a row of "£0" pills across the afternoon at ten in the morning is the clearest
       way there is to make a reader think the money stopped. */
    var lastKnown = -1;
    for (i = 0; i < 24; i++) { if (sp[i] != null || od[i] != null) lastKnown = i; }
    var scS = maxS > 0 ? plot / maxS : 0, scO = maxO > 0 ? plot / maxO : 0;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">';
    s += '<line x1="' + L + '" y1="' + zero + '" x2="' + (W - R) + '" y2="' + zero + '" stroke="rgba(255,255,255,.12)" stroke-width="1"/>';
    var redDots = [], grnDots = [], all = [];
    for (i = 0; i < 24; i++) {
      var hx = L + i * slot, v = sp[i], o = od[i], u = un[i];
      var ahead = i > lastKnown;
      var tip = ahead ? pad2(i) + ':00 UK · this hour has not happened yet'
        : pad2(i) + ':00 UK · ' + (curve ? gbp(v == null ? 0 : v) + ' spent' : 'spend not available yet') + ' · ' +
        (ords ? (o == null ? 0 : o) + ' order' + ((o || 0) === 1 ? '' : 's') + ', ' + (u == null ? 0 : u) + ' unit' + ((u || 0) === 1 ? '' : 's') : 'orders not available yet');
      var rd = null, gd = null;
      if (ahead) {
        /* the slot is kept, so the hours still line up with the clock, and nothing is claimed in it */
        s += '<rect x="' + (hx + slot * 0.10).toFixed(1) + '" y="' + (zero - 1.5).toFixed(1) + '" width="' + (slot * 0.78).toFixed(1) + '" height="1.5" rx="0.75" fill="rgba(255,255,255,.10)"><title>' + esc(tip) + '</title></rect>';
      }
      if (curve && !ahead) {
        var hs = Math.max(1.5, (v || 0) * scS), xs = hx + slot * 0.10, ws = slot * 0.36, ys = zero - hs;
        s += '<rect x="' + xs.toFixed(1) + '" y="' + ys.toFixed(1) + '" width="' + ws.toFixed(1) + '" height="' + hs.toFixed(1) + '" rx="2.5" fill="' + LOSS + '"><title>' + esc(tip) + '</title></rect>';
        rd = { x: xs + ws / 2, y: ys - 9, label: chartMoney(v || 0), title: tip };
      }
      if (ords && !ahead) {
        var ho = Math.max(1.5, (o || 0) * scO), xo = hx + slot * 0.52, wo = slot * 0.36, yo = zero - ho;
        s += '<rect x="' + xo.toFixed(1) + '" y="' + yo.toFixed(1) + '" width="' + wo.toFixed(1) + '" height="' + ho.toFixed(1) + '" rx="2.5" fill="' + ORDERS_C + '"><title>' + esc(tip) + '</title></rect>';
        gd = { x: xo + wo / 2, y: yo - 9, label: chartNum(o || 0), title: tip };
      }
      /* the two pills of an hour are only 16 units apart across, so when the two bars finish at a
         similar height the higher pill is lifted clear rather than printed over the other one */
      if (rd && gd && Math.abs(rd.y - gd.y) < PILL_H) { if (rd.y <= gd.y) rd.y = gd.y - PILL_H; else gd.y = rd.y - PILL_H; }
      if (rd) { rd.y = Math.max(10, rd.y); rd.red = true; all.push(rd); }
      if (gd) { gd.y = Math.max(10, gd.y); all.push(gd); }
      if (i % 3 === 0 || i === 23) {
        s += '<text x="' + (hx + slot * 0.5).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="9.5" fill="#66707c">' + pad2(i) + '</text>';
      }
    }
    /* …and the pill of one hour can still reach into the next hour's, because a wide figure is
       wider than the gap between two bars. Left to right, any pill that would print over one
       already placed is lifted clear above it. A figure you cannot read is not a figure. */
    declash(all);
    all.forEach(function (p) { (p.red ? redDots : grnDots).push(p); });
    s += chartValueDots(redDots, { color: LOSS, ink: '#fff', fontSize: PILL_FS, minGap: 0 });
    s += chartValueDots(grnDots, { color: ORDERS_C, ink: ORDERS_INK, fontSize: PILL_FS, minGap: 0 });
    s += '</svg>';
    var carry = num(D.carry_spend);
    var notes = [];
    if (carry != null && carry > 0) notes.push('<b>' + esc(gbp(carry)) + ' had already been spent before the first reading today</b> and is not on the chart.');
    if (lastKnown >= 0 && lastKnown < 23) notes.push('The day has reached <b>' + pad2(lastKnown) + ':00</b>. The hours after it are left empty rather than drawn as nothing spent.');
    if (lastKnown < 0) notes.push('Nothing has been read for any hour of today yet.');
    missing.forEach(function (m) { notes.push(esc(m)); });
    var legend = '<div class="ov-legend"><span><i style="background:' + LOSS + '"></i>money spent' + (maxS > 0 ? ', busiest hour ' + esc(gbp0(maxS)) : '') + '</span>' +
      '<span><i style="background:' + ORDERS_C + '"></i>orders received' + (maxO > 0 ? ', busiest hour ' + esc(cnt(maxO)) : '') + '</span></div>';
    return '<div class="ov-panel">' + head + (notes.length ? '<div class="ov-carry">' + notes.join(' ') + '</div>' : '') + legend + s + '</div>';
  }


  /* ══ VIDEOS, the sub-page under this one (owner's brief, 31 Oct, §4) ════════════════════════
     "All the videos we have on our listings, how they are performing, all the data, the way it
     comes in the Overview." So: the Overview's OWN blocks above, drawn through the same functions
     this page draws them with, from the same two actions asked for the video cohort.
     THE PER-LISTING RECORD IS NOT HERE. The owner put it on the Decision page, as a department of
     video revisions, and one figure has one home: this page carries the cohort, the blocks and the
     with-video against without-video comparison, and links to that department for the rest.
     It is registered here, in the Overview's own file, because it is the Overview over one cohort
     and the two must never drift apart. The shell keeps it off the sidebar and reaches it by hash. */
  var VD = { account: '', period: null, data: null, open: '' };

  VIEW_CSS.push([
    '.vid-truth{font-size:12px;color:var(--text-2);line-height:1.55;background:var(--panel-2);border:1px solid var(--gold-line);border-radius:12px;padding:10px 13px;margin:0 0 12px}',
    '.vid-badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:8px;color:var(--text-3)}',
    '.vid-badge.amber{color:#e8b54b;border-color:#e8b54b}.vid-badge.red{color:#e0563f;border-color:#e0563f}',
    '.vid-link{color:var(--gold-a);font-weight:800;text-decoration:none}',
    '.vid-diff{font-size:12px;color:var(--text-2);margin-top:8px;line-height:1.6}',
    '.vid-diff ul{margin:6px 0 0;padding-left:18px}',
    '.vid-diff li{margin:2px 0}',
    '.vid-more{background:none;border:0;color:var(--gold-a);font:inherit;font-size:12px;font-weight:800;cursor:pointer;padding:0}'
  ].join(''));

  VIEWS.adtoolVideos = {
    label: 'Videos', hidden: false, order: 63, roles: ROLES,
    icon: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4z"/>',
    render: function () {
      return '<div class="ov-wrap">' + adtHgroup('Videos', 'How the listings that carry a product video are performing') +
        '<div class="vid-truth" id="vidTruth">Loading…</div>' +
        '<div id="vidBar"></div><div id="vidAcct" class="ov-acct"></div>' +
        '<div id="vidCohort"><div class="ov-empty">Loading…</div></div>' +
        '<div id="vidHero"></div><div id="vidToday"></div><div id="vidVs"></div></div>';
    },
    init: function () {
      VD.data = null; VD.open = '';
      VD.period = adtPeriodBar('vidBar', { page: 'adtoolVideos', def: 'd30', onChange: function (v) { VD.period = v; loadVideos(false); } });
      vidAcctChips();
      loadVideos(false)['catch'](function () {});
      /* the cohort moves with the hourly sweep and the blocks move with today, so a tab left open
         is re-asked every five minutes. adtPoll waits on hidden tabs and stops for good on an
         'auth' refusal (the session-expiry law). */
      adtPoll('vidCohort', 300000, function () { return loadVideos(true); });
    }
  };

  function vidAcctChips() {
    var el = $('vidAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (VD.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      ((VD.data && VD.data.accounts) || OV.accounts || []).map(function (a) {
        return '<button class="' + (VD.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>';
      }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { VD.account = this.getAttribute('data-a'); vidAcctChips(); loadVideos(false)['catch'](function () {}); };
  }
  function loadVideos(quiet) {
    var p = adtPeriodParams(VD.period); if (VD.account) p.account = VD.account;
    return api('adtoolVideoBoard', p).then(function (d) {
      VD.data = d || {};
      if (!$('vidCohort')) return;
      vidAcctChips();
      vidDraw();
      adtPeriodEcho('vidBar', d && d.period);
    })['catch'](function (e) {
      if (!quiet && $('vidCohort')) $('vidCohort').innerHTML = '<div class="ov-panel"><h3>Not available</h3><div class="ov-sub">' + esc((e && e.message) || 'This page could not load.') + '</div></div>';
      throw e;
    });
  }
  /* the freshness badge. Both thresholds are read off the answer, so nothing here goes stale when
     somebody changes them, and a stamp nobody could read says so rather than reading as fresh. */
  function vidFresh(at, rules) {
    if (!at) return '<span class="vid-badge">not read yet</span>';
    var d = new Date(String(at).replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(String(at)) ? '' : 'Z'));
    if (isNaN(d.getTime())) return '<span class="vid-badge">reading time not understood</span>';
    var mins = Math.round((Date.now() - d.getTime()) / 60000);
    var amber = num(rules && rules.amber_min), red = num(rules && rules.red_min);
    if (red != null && mins > red) return '<span class="vid-badge red">' + cnt(mins) + ' min old</span>';
    if (amber != null && mins > amber) return '<span class="vid-badge amber">' + cnt(mins) + ' min old</span>';
    return '';
  }
  function vidDraw() {
    var D = VD.data || {};
    if ($('vidTruth')) $('vidTruth').innerHTML = esc(String(D.api_truth || '')) + (D.cohort_rule ? '<br><br>' + esc(String(D.cohort_rule)) : '');
    $('vidCohort').innerHTML = vidCohortPanel(D);
    var B = window.adtOverviewBlocks;
    var O = D.overview || {};
    if ($('vidHero')) {
      $('vidHero').innerHTML = (B && O.plan)
        ? B.hero(O.plan)
        : '<div class="ov-panel"><h3>The Overview\'s own figures over these listings</h3><div class="ov-sub">' +
          esc(O.note || 'These blocks are not available for this answer.') + '</div></div>';
    }
    if ($('vidToday')) {
      $('vidToday').innerHTML = (B && O.command)
        ? (B.today(O.command) + B.byAccount(O.command) + B.slots(O.command) + B.hourly(O.command) + B.foot(O.command))
        : '';
    }
    if ($('vidVs')) $('vidVs').innerHTML = vidVsPanel(D);
    vidWire();
  }
  function vidWire() {
    var bs = document.querySelectorAll('[data-vidopen]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].onclick = function () {
        var k = this.getAttribute('data-vidopen');
        VD.open = VD.open === k ? '' : k;
        $('vidCohort').innerHTML = vidCohortPanel(VD.data || {});
        vidWire();
      };
    }
  }
  function vidList(rows, label) {
    var L = Array.isArray(rows) ? rows : [];
    if (!L.length) return '<div class="vid-diff">' + esc(label) + ': none.</div>';
    var shown = L.slice(0, 40);
    return '<div class="vid-diff"><b>' + esc(label) + ':</b> ' + cnt(L.length) + '<ul>' +
      shown.map(function (r) {
        var id = String((r && r.item_id) || '');
        return '<li>' + (/^\d{9,13}$/.test(id)
          ? '<a class="vid-link" href="#adtoolProduct/' + esc(id) + '">' + esc(id) + '</a>'
          : esc(id)) + (r && r.account ? ' · ' + esc(String(r.account)) : '') +
          (r && r.video_added_on ? ' · video ' + esc(String(r.video_added_on)) : '') +
          (r && r.recorded_at ? ' · recorded ' + esc(String(r.recorded_at).slice(0, 10)) : '') + '</li>';
      }).join('') + '</ul>' + (L.length > shown.length ? '<div>and ' + cnt(L.length - shown.length) + ' more</div>' : '') + '</div>';
  }
  function vidCohortPanel(D) {
    var C = D.cohort || {}, RU = D.freshness_rules || null;
    var cov = C.coverage || {};
    var h = '<div class="ov-panel"><h3>The videos on our listings' + src('which listings carry a video', 'how') + '</h3>' +
      '<div class="ov-sub">' + esc(String(C.note || '')) + '</div>' +
      '<div class="ov-kpis">' +
      kpi('Carrying a video on eBay', cnt(C.on_ebay),
        'eBay\'s own answer, listing by listing' + (cov.last_checked_at ? '<br>last asked ' + esc(ago(cov.last_checked_at)) + vidFresh(cov.last_checked_at, RU) : '<br>the sweep has not run yet')) +
      kpi('Recorded by a lister', cnt(C.recorded), 'the portal\'s own record of the video stage') +
      kpi('On both', cnt(C.both), 'eBay shows a video and a lister recorded one') +
      kpi('Listings asked about', cnt(cov.listings_asked_about),
        (cov.active_listings == null ? 'out of a number of active listings we do not have' : 'out of ' + cnt(cov.active_listings) + ' active') +
        (num(cov.still_to_ask_about) > 0 ? '<br>' + cnt(cov.still_to_ask_about) + ' still to ask about' : '') +
        (num(cov.without_a_date) > 0 ? '<br>' + cnt(cov.without_a_date) + ' with no date eBay would give us' : '') +
        (num(cov.video_taken_off) > 0 ? '<br>' + cnt(cov.video_taken_off) + ' had a video and no longer do' : '')) +
      '</div>';
    h += '<div class="vid-diff">' + esc(String(cov.note || '')) + '</div>';
    /* the two differences, each behind its own button: these are the lists somebody acts on, and
       neither is reconciled away into a single number. */
    h += '<div style="margin-top:8px">' +
      '<button type="button" class="vid-more" data-vidopen="ebay">' + (VD.open === 'ebay' ? 'Hide' : 'Show') + ' the ' + cnt((C.ebay_only || []).length) + ' on eBay that no lister recorded</button>' +
      (VD.open === 'ebay' ? vidList(C.ebay_only, 'On eBay, not recorded') : '') + '</div>';
    h += '<div style="margin-top:6px">' +
      '<button type="button" class="vid-more" data-vidopen="rec">' + (VD.open === 'rec' ? 'Hide' : 'Show') + ' the ' + cnt((C.recorded_only || []).length) + ' recorded with no video on eBay</button>' +
      (VD.open === 'rec' ? vidList(C.recorded_only, 'Recorded, no video on eBay') : '') + '</div>';
    if (Array.isArray(C.by_date_source) && C.by_date_source.length) {
      h += '<div class="vid-diff"><b>Where each video date came from:</b> ' +
        C.by_date_source.map(function (r) { return esc(String(r.date_source)) + ' ' + cnt(r.n); }).join(' · ') + '</div>';
    }
    var J = cov.last_sweep;
    if (J) h += '<div class="vid-diff"><b>Last sweep:</b> ' + esc(ago(J.started_at)) + (J.status ? ' · ' + esc(String(J.status)) : '') + (J.note ? ' · ' + esc(String(J.note)) : '') + '</div>';
    /* the per-listing record and the before-and-after have one home, and it is not this page */
    h += '<div class="vid-diff">Every listing with a video, its video date and what its sales did either side of it are on the ' +
      '<a class="vid-link" href="#adtoolRunToday">Decision page</a>, under <b>Video revisions</b>.</div>';
    return h + '</div>';
  }
  function vidVsPanel(D) {
    var V = D.video_vs_no_video || {};
    var head = '<div class="ov-panel"><h3>With a video against without one' + src('with a video against without one', 'how') + '</h3>' +
      '<div class="ov-sub">' + esc(String(V.basis || '')) + '</div>';
    var tbl = function (label, rows) {
      var L = Array.isArray(rows) ? rows.filter(function (r) { return r && r.with; }) : [];
      if (!L.length) return '<div class="ov-empty">No ' + esc(label) + ' has a listing with a video in this period.</div>';
      return '<div class="ov-sub" style="margin-top:10px"><b>' + esc(label) + '</b></div>' +
        '<div class="ov-scroll"><table class="ov-tbl"><thead><tr><th>' + esc(label) + '</th>' +
        '<th class="r">Listings with · without</th><th class="r">Views each</th><th class="r">Click-through</th>' +
        '<th class="r">Conversion</th><th class="r">ROAS</th><th class="r">Units each</th><th class="r">Takings each</th></tr></thead><tbody>' +
        L.map(function (r) {
          var w = r.with, n = r.without;
          var pair = function (a, b, f) { return f(a) + ' <span class="ov-src" style="border:0;padding:0;margin:0">vs</span> ' + (b ? f(b) : '—'); };
          return '<tr><td>' + esc(String(r.key)) + (r.note ? '<div class="ov-sub" style="margin:0">' + esc(String(r.note)) + '</div>' : '') + '</td>' +
            '<td class="r">' + cnt(w.listings) + ' · ' + (n ? cnt(n.listings) : '—') + '</td>' +
            '<td class="r">' + pair(w.views_listing, n && n.views_listing, cnt) + vidLift(r.lift && r.lift.views) +
            /* the denominator, because it is not the number of listings: eBay publishes views for the
               top three hundred listings of an account, so a side's views are divided by the listings
               that carry a reading and the reader is told how many those were. */
            '<div class="ov-sub" style="margin:0">' + cnt(w.listings_with_traffic) + ' · ' + (n ? cnt(n.listings_with_traffic) : '—') + ' with a reading</div></td>' +
            '<td class="r">' + pair(w.ctr, n && n.ctr, pct) + vidLift(r.lift && r.lift.ctr) + '</td>' +
            '<td class="r">' + pair(w.conversion, n && n.conversion, pct) + vidLift(r.lift && r.lift.conversion) + '</td>' +
            '<td class="r">' + pair(w.roas, n && n.roas, roas) + vidLift(r.lift && r.lift.roas) + '</td>' +
            '<td class="r">' + pair(w.units_listing, n && n.units_listing, function (v) { var x = num(v); return x == null ? '—' : x.toFixed(1); }) + '</td>' +
            '<td class="r">' + pair(w.revenue_listing, n && n.revenue_listing, gbp0) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    };
    return head + tbl('Account', V.by_account) + tbl('Case type', V.by_case_type) + '</div>';
  }
  /* the difference between the two sides, as a share of the side without a video. Null stays blank:
     a lift against nought is not a lift, and the engine sends null for exactly that reason. */
  function vidLift(v) {
    var n = num(v);
    if (n == null) return '';
    return '<div class="ov-sub" style="margin:0;color:' + (n < 0 ? LOSS : 'var(--ok)') + '">' + (n > 0 ? '+' : '') + Math.round(n * 100) + '%</div>';
  }

  /* block 5 — how up to date this is. The forecast chip is gone with the forecast. */
  function freshBlock(D) {
    var f = D.freshness || {};
    var chips = [
      ['Orders updated', ago(f.orders && f.orders.t)],
      ['eBay ad report covers up to', (f.ads_report_day && f.ads_report_day.d) || '—'],
      ['Last ad reading', ago(f.last_sample && f.last_sample.t)],
      ['Daily totals', ago(f.rollup && f.rollup.t)],
      ['Patterns', String(f.profiles || 'not yet')]
    ];
    return '<div class="ov-panel"><h3>How up to date this is</h3><div>' +
      chips.map(function (x) { return '<span class="ov-chip">' + esc(x[0]) + ': <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div></div>';
  }
})();
