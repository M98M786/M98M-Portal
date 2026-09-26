/* War room — what is happening, why, which account, which listing, and what to do today.
 * Phase 2 of the 27 Sep brief. The look is the Operating System's advertising page (tiles, bars,
 * value pills); the numbers are the engine's adtoolPlan answer for the window and account the reader
 * picks. Profit appears per listing only, under the Sales Analysis law; account, fleet, day and
 * weekday rows carry spend, attributed sales, ROAS, CPC, CVR and orders — never a profit sum. The
 * frontier replaces the old curve: listings ranked by their own return, cumulative spend against
 * cumulative attributed revenue per day, with the 6/5/4/3.5× marks and the break-even mark on it.
 * Every field is guarded: an engine answer without a panel's data prints why, never a blank.
 * Galaxy tokens, gold the only accent, #e0563f for a loss. */
(function () {
  var LOSS = '#e0563f';
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  VIEW_CSS.push([
    '.wr-wrap{max-width:1240px}',
    '.wr-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
    '.wr-tile{flex:1 1 150px;border:1px solid var(--gold-line);border-radius:12px;padding:10px 14px;background:var(--panel-2)}',
    '.wr-tile .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.wr-tile .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.wr-tile.gold .v{color:var(--gold-a)}.wr-tile.loss .v{color:' + LOSS + '}',
    '.wr-tile .d{font-size:11.5px;color:var(--text-2);margin-top:2px;line-height:1.4}',
    '.wr-win{font-size:12px;color:var(--text-2);margin:0 0 14px;font-weight:600}',
    '.wr-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
    '.wr-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.wr-panel .wr-note{color:var(--text-2);font-size:12px;margin-bottom:10px;line-height:1.5}',
    '.wr-verdict{border-color:rgba(242,176,53,.55);background:linear-gradient(180deg,rgba(242,176,53,.14),rgba(242,176,53,.03))}',
    '.wr-verdict h2{margin:0 0 6px;font-size:19px;font-weight:800;color:var(--gold-a)}',
    '.wr-verdict .wr-vd{color:var(--text);font-size:13px;line-height:1.55}',
    '.wr-vk{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}',
    '.wr-vk span{border:1px solid var(--gold-line);border-radius:999px;padding:4px 11px;font-size:11.5px;color:var(--text-2);font-weight:700}',
    '.wr-vk span b{color:var(--text)}.wr-vk span.loss b{color:' + LOSS + '}',
    '.wr-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.wr-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line)}',
    '.wr-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.wr-tbl td.r,.wr-tbl th.r{text-align:right}',
    '.wr-tbl tr.pick td{background:rgba(242,176,53,.1)}',
    '.wr-tbl tr.pick td:first-child{box-shadow:inset 3px 0 0 var(--gold-b)}',
    '.wr-tbl tr.acct{cursor:pointer}.wr-tbl tr.acct:hover td{background:rgba(255,255,255,.03)}',
    '.wr-neg{color:' + LOSS + ';font-weight:700} .wr-pos{color:var(--gold-a);font-weight:700}',
    '.wr-share{display:inline-block;height:7px;border-radius:4px;background:var(--gold-b);vertical-align:middle;margin-right:6px}',
    '.wr-scroll{overflow-x:auto}',
    '.wr-empty{color:var(--text-3);font-size:12px;padding:10px 0}',
    '.wr-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}',
    '.wr-acct{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.wr-acct button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}',
    '.wr-acct button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.wr-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:980px){.wr-grid2{grid-template-columns:1fr}}',
    '.wr-card{border:1px solid var(--gold-line);border-left:3px solid var(--gold-b);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:var(--panel)}',
    '.wr-card.stop{border-left-color:' + LOSS + '}.wr-card.watch{border-left-color:rgba(255,255,255,.3)}',
    '.wr-card .s{font-size:12px;color:var(--text);margin-top:6px;line-height:1.5}',
    '.wr-card .t{font-size:11.5px;color:var(--text-2);margin-top:4px;line-height:1.45}',
    '.wr-more{display:inline-block;margin-top:6px;font-size:12px;font-weight:700;color:var(--gold-a);text-decoration:none}.wr-more:hover{text-decoration:underline}',
    '.wr-legend{display:flex;gap:14px;font-size:11px;font-weight:800;color:var(--text-3);margin:6px 0 2px;flex-wrap:wrap}',
    '.wr-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
    '.wr-rule{font-size:12px;color:var(--text-2);margin-top:8px;line-height:1.5}',
    '.wr-rule b.be{color:' + LOSS + '}'
  ].join(''));

  var WR = { data: null, account: '', period: null, accounts: [] };

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function pct(v) { v = num(v); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function src(t) { return '<span class="wr-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }
  function wdName(w) { var n = num(w); if (n != null && DOW[n]) return DOW[n]; return w == null ? '' : String(w).slice(0, 3); }
  function hhmm(at) { if (!at) return ''; var d = new Date(String(at).replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(String(at)) ? '' : 'Z')); if (isNaN(d.getTime())) return String(at).slice(11, 16); try { return d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }) + ' UK'; } catch (e) { return d.toISOString().slice(11, 16) + ' UTC'; } }

  VIEWS.adtoolPlan = {
    label: 'War room (ads)', hidden: true, order: 93, roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M3 3v18h18"/><path d="m7 14 4-5 4 3 5-8"/><circle cx="11" cy="9" r="1.6"/>',
    render: function () {
      return '<div class="wr-wrap">' + adtHgroup('War room', 'what is happening, why, on which account and listing — and what to do today', 'wrFresh') +
        '<div id="wrBar"></div><div id="wrAcct" class="wr-acct"></div>' +
        '<div id="wrBody"><div class="wr-empty">Reading the window…</div></div></div>';
    },
    init: function () {
      WR.period = adtPeriodBar('wrBar', { page: 'adtoolPlan', def: 'd30', onChange: function (v) { WR.period = v; load(false); } });
      acctChips();
      load(false).catch(function () {});
    }
  };
  function acctChips() {
    var el = $('wrAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (WR.account ? '' : 'on') + '" data-a="">All accounts</button>' + WR.accounts.map(function (a) { return '<button class="' + (WR.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { WR.account = this.getAttribute('data-a'); acctChips(); load(false); };
  }
  function load(quiet) {
    var p = adtPeriodParams(WR.period); if (WR.account) p.account = WR.account;
    return api('adtoolPlan', p).then(function (d) {
      WR.data = d || {};
      var names = (d && d.accounts) || [];
      if (names.length) { WR.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean); acctChips(); }
      if (!$('wrBody')) return;
      draw();
      adtPeriodEcho('wrBar', d && d.period); adtFreshShow('wrFresh', d && d.fresh);
      /* a window that reaches into today moves every 5 minutes; a finished window does not.
         adtPoll skips hidden tabs and stops on an 'auth' refusal (session-expiry law) */
      if (adtIncludesToday(d && d.period, WR.period)) { adtPoll('wrBody', 300000, function () { return load(true); }); } else { adtPollStop('wrBody'); }
    }).catch(function (e) {
      if (!quiet && $('wrBody')) $('wrBody').innerHTML = '<div class="wr-panel"><div class="wr-note">' +
        esc(e && e.message ? e.message : 'the war room could not be read') + '</div></div>';
      throw e;
    });
  }

  /* the window the whole page stands on: the engine names it (`period`); the page never assumes 30 */
  function windowText(D) {
    var P = D.period;
    if (P && (P.label || P.from)) return adtPeriodText(P).replace(/^./, function (c) { return c.toLowerCase(); });
    var w = D.window || {}, days = num(w.days);
    return 'last ' + (days != null ? days : 30) + ' days to yesterday' + (w.from && w.to ? ' (' + w.from + ' → ' + w.to + ')' : '');
  }
  function winShort(D) { var P = D.period; if (P && P.label) return String(P.label).replace(/ \(.*\)$/, ''); var w = D.window || {}; return 'last ' + (num(w.days) != null ? w.days : 30) + ' days'; }
  function windowDays(D) { var d = num(D.hero && D.hero.days); if (d == null) d = num(D.period && D.period.days); if (d == null) d = num(D.window && D.window.days); return d && d > 0 ? d : 30; }
  function includesToday(D) { return !!(D.period && D.period.includes_today); }

  /* item rows: the contract keys first, the Phase 1 keys as fallback; never an estimated-profit key */
  function lawWin(r) { return r.actual_profit !== undefined ? num(r.actual_profit) : num(r.actual_profit_d30); }
  function lawD7(r) { return r.actual_profit_d7 !== undefined ? num(r.actual_profit_d7) : null; }
  function hasD7(rows) { return rows.some(function (r) { return r && r.actual_profit_d7 !== undefined; }); }
  function hasStage(rows) { return rows.some(function (r) { return r && r.stage; }); }
  function hasLever(rows) { return rows.some(function (r) { return r && (r.lever || r.who); }); }
  function perDay(r, key, days) { if (r[key + '_day'] !== undefined) return num(r[key + '_day']); var v = num(r[key]); return v == null ? null : Math.round(v / days * 100) / 100; }
  function revOf(r) { return r.attr_revenue != null ? num(r.attr_revenue) : num(r.rev); }
  function ownRoas(r) { if (r.roas != null && r.roas !== '') return num(r.roas); var s = num(r.spend), v = revOf(r); return s && s > 0 && v != null ? Math.round(v / s * 100) / 100 : null; }
  function breakeven(r) { return r.breakeven_roas != null ? num(r.breakeven_roas) : num(r.breakeven); }
  function pending(r) { return [num(r.pending_cost_orders) || 0, num(r.pending_fee_orders) || 0]; }
  function isImproving(r) {
    if (r.improving != null) return !!r.improving;
    var w = lawWin(r), d7 = lawD7(r);
    /* 30-day bad but 7-day good is a listing on the mend, not one to switch off (owner, 27 Sep); £5 of 7-day spend so a quiet week cannot pass as a good one */
    return w != null && w < 0 && d7 != null && d7 >= 0 && (num(r.spend_d7) == null || num(r.spend_d7) >= 5);
  }

  function draw() {
    var D = WR.data, h = '';
    if (!D || typeof D !== 'object') { $('wrBody').innerHTML = '<div class="wr-empty">No answer for this window.</div>'; return; }
    h += heroTiles(D);
    h += accountPanel(D);
    h += byDayPanel(D);
    h += frontierPanel(D);
    h += verdictPanel(D);
    h += todayPanels(D);
    h += cutPanel(D);
    h += improvingPanel(D);
    h += pushPanel(D);
    h += budgetPanel(D);
    h += weekdayPanel(D);
    var W = D.period && D.period.from ? D.period : (D.window || null);
    h += '<div class="wr-note" style="margin-top:6px">' + esc(D.source || '') + (W ? ' · ' + esc(W.from || '') + ' to ' + esc(W.to || '') +
      ' (' + (num(W.days) != null ? W.days : '?') + ' days' + (W.includes_today ? ', includes today — sampled, provisional, refreshed every 5 min' : '') + ')' : '') +
      (D.computed_at ? ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC' : '') + '</div>';
    $('wrBody').innerHTML = h;
    var rs = document.querySelectorAll('#wrBody tr.acct[data-a]');
    for (var i = 0; i < rs.length; i++) rs[i].onclick = function () { var a = this.getAttribute('data-a'); WR.account = WR.account === a ? '' : a; acctChips(); load(false); };
  }

  /* ── hero: the six figures the owner asked for, per-day figures under each, the window named once ── */
  function tile(k, v, d, cls) { return '<div class="wr-tile ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="d">' + d + '</div></div>'; }
  function heroTiles(D) {
    var H = D.hero || D.summary || null, days = windowDays(D);
    if (!H) {
      /* no hero in the answer: add up the item rows it has (spend and sales only — never profit) */
      var rows = (D.cut || []).concat(D.push || []), s = 0, v = 0;
      rows.forEach(function (r) { s += num(r.spend) || 0; v += revOf(r) || 0; });
      H = s > 0 ? { spend: s, attr_revenue: v, roas: v / s, spend_day: s / days, attr_revenue_day: v / days, listings: rows.length } : {};
    }
    var roas = num(H.roas); if (roas == null && num(H.spend) > 0 && num(H.attr_revenue) != null) roas = num(H.attr_revenue) / num(H.spend);
    var spendDay = num(H.spend_day), salesDay = num(H.attr_revenue_day != null ? H.attr_revenue_day : H.revenue_day);
    if (spendDay == null && num(H.spend) != null) spendDay = num(H.spend) / days;
    if (salesDay == null && num(H.attr_revenue) != null) salesDay = num(H.attr_revenue) / days;
    var acct = D.account && D.account !== 'all' ? D.account : 'all accounts';
    var h = '<div class="wr-win"><b>' + esc(acct) + '</b> · ' + esc(windowText(D)) + (num(H.listings) != null ? ' · ' + cnt(H.listings) + ' listings with spend' : '') +
      (includesToday(D) ? ' · today is sampled and provisional' : '') + src('eBay ads report') + '</div>';
    h += '<div class="wr-tiles">' +
      tile('Spend', gbp0(H.spend), gbp(spendDay) + ' a day over ' + days + ' day' + (days === 1 ? '' : 's'), 'gold') +
      tile('Attributed sales', gbp0(H.attr_revenue), gbp(salesDay) + ' a day · revenue eBay credits to the ads') +
      tile('ROAS', roasTxt(roas), 'attributed revenue ÷ spend', roas != null && roas < 1 ? 'loss' : 'gold') +
      tile('CPC', gbp(H.cpc), cnt(H.clicks) + ' clicks') +
      tile('CVR', pct(H.cvr), cnt(H.attr_units) + ' attributed units ÷ clicks') +
      tile('Orders', cnt(H.orders), cnt(H.units) + ' units, all channels') +
      '</div>';
    return h;
  }

  /* ── account to account: spend, sales, ROAS, CPC, CVR, orders, share of spend — no profit ── */
  function accountPanel(D) {
    var rows = D.by_account || [];
    if (!rows.length) return '';
    var days = windowDays(D), maxShare = 0;
    rows.forEach(function (r) { maxShare = Math.max(maxShare, num(r.share) || 0); });
    return '<div class="wr-panel"><h3>Account to account' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Every account over the same window. Click a row to look at that account alone; profit is not summed per account — it lives on each listing below.</div>' +
      '<div class="wr-scroll"><table class="wr-tbl"><thead><tr><th>Account</th><th class="r">Spend</th><th class="r">/ day</th><th class="r">Attributed sales</th><th class="r">ROAS</th><th class="r">CPC</th><th class="r">CVR</th><th class="r">Orders</th><th>Share of spend</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var ro = ownRoas(r), sh = num(r.share), pick = WR.account && r.account === WR.account;
        return '<tr class="acct' + (pick ? ' pick' : '') + '" data-a="' + esc(r.account || '') + '"><td><b>' + esc(r.account || '—') + '</b></td>' +
          '<td class="r">' + gbp0(r.spend) + '</td><td class="r">' + gbp(perDay(r, 'spend', days)) + '</td>' +
          '<td class="r">' + gbp0(revOf(r)) + '</td>' +
          '<td class="r ' + (ro != null ? (ro < 1 ? 'wr-neg' : 'wr-pos') : '') + '">' + roasTxt(ro) + '</td>' +
          '<td class="r">' + gbp(r.cpc) + '</td><td class="r">' + pct(r.cvr) + '</td><td class="r">' + cnt(r.orders) + '</td>' +
          '<td>' + (sh != null ? '<span class="wr-share" style="width:' + Math.round(Math.max(2, sh / (maxShare || 1) * 120)) + 'px"></span>' + pct(sh) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ── day by day: spend bars, sales / ROAS / orders in the hover, today marked provisional ── */
  function byDayPanel(D) {
    var rows = D.by_day || [];
    if (!rows.length) return '';
    var n = rows.length, every = n > 16 ? Math.ceil(n / 16) : 0, anyProv = false;
    var pts = rows.map(function (r) {
      var prov = !!(r.provisional || r.today); if (prov) anyProv = true;
      var ro = ownRoas(r);
      return { label: String(r.day || '').slice(5) + (r.weekday != null ? ' ' + wdName(r.weekday) : ''), value: num(r.spend) || 0, strong: prov,
        title: (r.day || '') + (r.weekday != null ? ' (' + wdName(r.weekday) + ')' : '') + ' — spend ' + gbp(r.spend) + ' · attributed sales ' + gbp(revOf(r)) + ' · ROAS ' + roasTxt(ro) + ' · ' + cnt(r.attr_units) + ' attributed units · ' + cnt(r.orders) + ' orders' + (prov ? ' · today so far, provisional' : '') };
    });
    return '<div class="wr-panel"><h3>Day by day' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Spend per report day; hover a bar for that day\'s attributed sales, ROAS and orders.' + (anyProv ? ' The pale bar is <b>today so far</b> — sampled every 5 minutes, provisional until eBay\'s report lands.' : '') + '</div>' +
      chartBars(pts, { height: 180, everyNth: every, minGap: every ? 60 : 44 }) + '</div>';
  }

  /* ── the frontier: listings ranked by their own return; where the next listing stops paying ── */
  function frontierPanel(D) {
    var F = D.frontier;
    if (!F || typeof F !== 'object' || !(F.points && F.points.length)) {
      return '<div class="wr-panel"><h3>How far it is worth spending' + src('frontier') + '</h3><div class="wr-empty">' +
        (F && F.note ? esc(String(F.note)) : 'No frontier in this answer — it needs listings with spend in the window.') + '</div></div>';
    }
    var pts = F.points.filter(function (p) { return p && num(p.cum_spend_day) != null && num(p.cum_revenue_day) != null; });
    var marks = (F.marks || []).filter(function (m) { return m && num(m.cum_spend_day) != null && num(m.cum_revenue_day) != null; });
    var be = F.breakeven && num(F.breakeven.cum_spend_day) != null && num(F.breakeven.cum_revenue_day) != null ? F.breakeven : null;
    var W = 980, H = 320, L = 64, R = 30, T = 30, B = 44;
    var maxX = 0, maxY = 0;
    pts.forEach(function (p) { maxX = Math.max(maxX, num(p.cum_spend_day)); maxY = Math.max(maxY, num(p.cum_revenue_day)); });
    maxX = maxX || 1; maxY = maxY || 1;
    var x = function (v) { return L + (v / maxX) * (W - L - R); }, y = function (v) { return H - B - (v / maxY) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      s += '<line x1="' + L + '" y1="' + y(maxY * f).toFixed(1) + '" x2="' + (W - R) + '" y2="' + y(maxY * f).toFixed(1) + '" stroke="rgba(255,255,255,.08)" stroke-width="1"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(maxY * f) + 3).toFixed(1) + '" text-anchor="end" font-size="9.5" fill="#66707c">' + esc(chartMoney(maxY * f)) + '</text>';
      s += '<line x1="' + x(maxX * f).toFixed(1) + '" y1="' + T + '" x2="' + x(maxX * f).toFixed(1) + '" y2="' + (H - B) + '" stroke="rgba(255,255,255,.05)" stroke-width="1"/>' +
        '<text x="' + x(maxX * f).toFixed(1) + '" y="' + (H - B + 14) + '" text-anchor="middle" font-size="9.5" fill="#66707c">' + esc(chartMoney(maxX * f)) + '</text>';
    });
    /* the 1× line: below it the fleet as a whole spends more than eBay credits back */
    var one = Math.min(maxX, maxY);
    s += '<line x1="' + x(0).toFixed(1) + '" y1="' + y(0).toFixed(1) + '" x2="' + x(one).toFixed(1) + '" y2="' + y(one).toFixed(1) + '" stroke="rgba(224,86,63,.45)" stroke-width="1" stroke-dasharray="5 4"/>' +
      '<text x="' + (x(one) + 4).toFixed(1) + '" y="' + (y(one) + 3).toFixed(1) + '" font-size="9" fill="rgba(224,86,63,.8)">1×</text>';
    s += '<text x="' + ((L + W - R) / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" font-weight="800" fill="#66707c">cumulative spend per day, listings ranked by their own ROAS →</text>';
    s += '<text x="12" y="' + ((T + H - B) / 2).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="800" fill="#66707c" transform="rotate(-90 12 ' + ((T + H - B) / 2).toFixed(1) + ')">cumulative attributed revenue per day ↑</text>';
    var line = pts.map(function (p) { return { x: x(num(p.cum_spend_day)), y: y(num(p.cum_revenue_day)), label: null }; });
    line.unshift({ x: x(0), y: y(0), label: null });
    s += chartLineSeries(line, { color: 'var(--gold-b)', width: 2.4 });
    pts.forEach(function (p) {
      s += '<circle cx="' + x(num(p.cum_spend_day)).toFixed(1) + '" cy="' + y(num(p.cum_revenue_day)).toFixed(1) + '" r="2.2" fill="var(--gold-a)" opacity=".7"><title>' +
        esc('#' + (p.n != null ? p.n : '') + ' ' + (p.title || p.item_id || '') + (p.account ? ' · ' + p.account : '') + ' — own ROAS ' + roasTxt(p.own_roas) + ' · cumulative ' + gbp(p.cum_spend_day) + ' → ' + gbp(p.cum_revenue_day) + ' a day (' + roasTxt(p.cum_roas) + ')') + '</title></circle>';
    });
    var markPts = marks.map(function (m) { return { x: x(num(m.cum_spend_day)), y: y(num(m.cum_revenue_day)), label: num(m.roas) + '× · ' + chartMoney(m.cum_spend_day) + '/d', title: 'cumulative ROAS ' + roasTxt(m.roas) + ' at ' + cnt(m.n) + ' listings: ' + gbp(m.cum_spend_day) + ' spend → ' + gbp(m.cum_revenue_day) + ' attributed a day' }; });
    s += chartValueDots(markPts, { color: 'var(--gold-b)', ink: '#1c1200', fontSize: 9.5, minGap: 0, nudge: -16 });
    if (be) {
      var bx = x(num(be.cum_spend_day)), by = y(num(be.cum_revenue_day));
      s += '<line x1="' + bx.toFixed(1) + '" y1="' + T + '" x2="' + bx.toFixed(1) + '" y2="' + (H - B) + '" stroke="' + LOSS + '" stroke-width="1.2" stroke-dasharray="4 3"/>';
      s += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="5" fill="' + LOSS + '" stroke="#fff" stroke-width="1.2"/>';
      s += chartValueDots([{ x: bx, y: by, label: 'break-even · #' + cnt(be.n) + ' is the first loser', title: be.rule || '' }], { color: LOSS, ink: '#fff', fontSize: 9.5, minGap: 0, nudge: 18 });
    }
    s += '</svg>';
    /* the engine's mark sits ON the first losing listing (its own spend inside cum_spend_day); the listings still
       worth keeping are the n − 1 before it, whose cumulative figures are the previous point (or £0 when n = 1) */
    var beN = be && num(be.n) != null ? num(be.n) : null, beyond = beN != null ? pts.length - beN : null;
    var kept = beN != null ? (beN > 1 ? pts.filter(function (p) { return num(p.n) === beN - 1; })[0] || null : { n: 0, cum_spend_day: 0, cum_revenue_day: 0, cum_roas: null }) : null;
    var tbl = '<div class="wr-scroll"><table class="wr-tbl" style="margin-top:8px"><thead><tr><th>Mark</th><th class="r">Listings kept</th><th class="r">Spend / day</th><th class="r">Attributed sales / day</th><th class="r">Cumulative ROAS</th></tr></thead><tbody>' +
      marks.map(function (m) { var ro = num(m.cum_spend_day) > 0 ? num(m.cum_revenue_day) / num(m.cum_spend_day) : null; return '<tr><td><b>' + esc(num(m.roas) + '×') + '</b></td><td class="r">' + cnt(m.n) + '</td><td class="r">' + gbp(m.cum_spend_day) + '</td><td class="r">' + gbp(m.cum_revenue_day) + '</td><td class="r">' + roasTxt(ro) + '</td></tr>'; }).join('') +
      (be && kept ? '<tr class="pick"><td><b class="wr-neg">break-even</b><div class="adt-pf-p">the listings before #' + cnt(beN) + ', the first loser</div></td><td class="r">' + cnt(kept.n != null ? kept.n : beN - 1) + '</td><td class="r">' + gbp(kept.cum_spend_day) + '</td><td class="r">' + gbp(kept.cum_revenue_day) + '</td><td class="r">' + roasTxt(num(kept.cum_spend_day) > 0 ? num(kept.cum_revenue_day) / num(kept.cum_spend_day) : null) + '</td></tr>' : '') +
      (be ? '<tr><td><span class="wr-neg">#' + cnt(beN) + ' included</span><div class="adt-pf-p">' + esc(String(be.title || be.item_id || '')) + (be.account ? ' · ' + esc(String(be.account)) : '') + ' — own ROAS ' + esc(roasTxt(be.own_roas)) + (num(be.threshold) != null ? ' vs ' + esc(roasTxt(be.threshold)) + ' (' + esc(String(be.threshold_source || 'break-even')) + ')' : '') + '</div></td><td class="r">' + cnt(beN) + '</td><td class="r">' + gbp(be.cum_spend_day) + '</td><td class="r">' + gbp(be.cum_revenue_day) + '</td><td class="r">' + roasTxt(num(be.cum_spend_day) > 0 ? num(be.cum_revenue_day) / num(be.cum_spend_day) : null) + '</td></tr>' : '') +
      '<tr><td>everything</td><td class="r">' + pts.length + '</td><td class="r">' + gbp(pts[pts.length - 1].cum_spend_day) + '</td><td class="r">' + gbp(pts[pts.length - 1].cum_revenue_day) + '</td><td class="r">' + roasTxt(pts[pts.length - 1].cum_roas != null ? pts[pts.length - 1].cum_roas : (num(pts[pts.length - 1].cum_spend_day) > 0 ? num(pts[pts.length - 1].cum_revenue_day) / num(pts[pts.length - 1].cum_spend_day) : null)) + '</td></tr>' +
      '</tbody></table></div>';
    return '<div class="wr-panel"><h3>How far it is worth spending' + src('frontier') + '</h3>' +
      '<div class="wr-note">Each dot is one listing, added in order of its own ROAS over ' + esc(windowText(D)) + '; the line is what the fleet spends and gets back per day once that listing is included. Gold pills mark where the cumulative return passes 6×, 5×, 4× and 3.5×.</div>' +
      '<div class="wr-legend"><span><i style="background:var(--gold-b)"></i>cumulative spend → attributed revenue, per day</span><span><i style="background:' + LOSS + '"></i>break-even mark</span><span><i style="background:rgba(224,86,63,.45)"></i>1× line</span></div>' +
      s +
      '<div class="wr-rule">Listings ranked by their own return; ' +
      (be ? '<b class="be">the red mark is listing #' + cnt(beN) + ', the first that loses money on its own numbers</b> — the ' + cnt(beN - 1) + ' before it are the ones still worth keeping' + (beyond != null ? ', and ' + beyond + ' more listing' + (beyond === 1 ? '' : 's') + ' sit after it at a lower return' : '') : '<b class="be">no listing in this window loses money on its own numbers</b>') + '.' +
      (be && be.rule ? ' <span class="adt-pf-p">' + esc(String(be.rule)) + '</span>' : '') + '</div>' + tbl + '</div>';
  }

  /* ── the verdict in plain words, naming the window ── */
  function verdictPanel(D) {
    var V = D.verdict || {}, cut = D.cut || [], days = windowDays(D);
    var headline = V.headline || V.move || (cut.length ? 'switch off ' + cut.length + ' listing' + (cut.length === 1 ? '' : 's') : 'keep everything running');
    var detail = V.detail || '';
    var freed = num(V.spend_freed_day); if (freed == null && num(D.cut_frees) != null) freed = num(D.cut_frees) / days;
    var cutN = num(V.cut_n); if (cutN == null) cutN = num(D.cut_total) != null ? num(D.cut_total) : cut.length;
    var impN = num(V.improving_n); if (impN == null) impN = cut.filter(isImproving).length;
    var withheld = num(V.withheld_unpriced); if (withheld == null) withheld = num(D.cut_withheld_unpriced) || 0;
    return '<div class="wr-panel wr-verdict"><h2>' + esc(headline.replace(/^./, function (c) { return c.toUpperCase(); })) + '</h2>' +
      '<div class="wr-vd">' + esc(detail) + (detail && !/\d{4}-\d\d-\d\d|window|days?\b/i.test(detail) ? ' (' + esc(windowText(D)) + ')' : '') + '</div>' +
      '<div class="wr-vk">' + (freed != null ? '<span class="loss">spend freed <b>' + esc(gbp(freed)) + ' a day</b></span>' : '') +
      '<span>switch off <b>' + esc(cnt(cutN)) + '</b></span>' +
      '<span>improving, keep <b>' + esc(cnt(impN)) + '</b></span>' +
      (withheld ? '<span>withheld, unpriced <b>' + esc(cnt(withheld)) + '</b></span>' : '') +
      '</div></div>';
  }

  /* ── what to run / stop today: the first rows of the Running today page, with its sentence ── */
  function todayCard(r) {
    var v = String(r.verdict || '').toLowerCase(), T = r.today || {};
    var todayTxt = 'today so far: ' + gbp(T.spend) + ' spend · ' + cnt(T.clicks) + ' clicks · ' + cnt(T.attr_units) + ' attributed units · ' + cnt(T.orders) + ' orders · profit ' + adtProfitCell(T.actual_profit, 0, 0, T.unpriced) + (T.sampled_at ? ' · sampled ' + esc(hhmm(T.sampled_at)) : '');
    return '<div class="wr-card ' + esc(v) + '">' + adtVerdictPill(v) + '<div style="margin-top:6px">' + adtProductCell(r) + '</div>' +
      (r.sentence ? '<div class="s">' + esc(String(r.sentence)) + '</div>' : '') +
      '<div class="t">' + todayTxt + '</div>' +
      '<div class="t">' + adtLeverLine(r.lever, r.who) + '</div></div>';
  }
  function todayPanels(D) {
    var run = D.run_today_top || [], stop = D.stop_today_top || [];
    var more = '<a class="wr-more" href="#adtoolRunToday">All of today\'s verdicts on Running today →</a>';
    /* an off flag returns empty lists with run_today.enabled = false — that is "not computed", never "nothing to do" */
    var off = !!(D.run_today && D.run_today.enabled === false);
    var missing = off ? '<div class="wr-empty">Running today is switched off in Flags (adtool_page_runtoday) — nothing was judged.</div>' : (!D.run_today_top && !D.stop_today_top ? '<div class="wr-empty">Not in this answer.</div>' : '');
    return '<div class="wr-grid2">' +
      '<div class="wr-panel"><h3>What to run today' + src('run today verdict') + '</h3><div class="wr-note">Listings that earned on the last same weekdays, or are earning over the last 7 days above their own break-even.</div>' +
      (missing || (run.length ? run.map(todayCard).join('') + more : '<div class="wr-empty">Nothing stands out to push today.</div>')) + '</div>' +
      '<div class="wr-panel"><h3>What to stop today' + src('run today verdict') + '</h3><div class="wr-note">Listings that lost on at least three of the last four same weekdays and over the last 7 days, with every order in those 7 days priced.</div>' +
      (missing || (stop.length ? stop.map(todayCard).join('') + more : '<div class="wr-empty">Nothing needs stopping on today\'s weekday history.</div>')) + '</div>' +
      '</div>';
  }

  /* ── item lists: the window's own profit, the last 7 days inside it, stage, lever, who ── */
  function listHead(rows, first, D) {
    return '<thead><tr><th>' + first + '</th><th class="r">Spend / day</th><th class="r">Attributed sales / day</th>' +
      '<th class="r">Own ROAS</th><th class="r">Break-even</th><th class="r">Profit (Sales Analysis law) · ' + esc(winShort(D)) + '</th>' +
      (hasD7(rows) ? '<th class="r">· last 7 d</th>' : '') + (hasStage(rows) ? '<th>Stage</th>' : '') + (hasLever(rows) ? '<th>Lever · who</th>' : '') + '</tr></thead>';
  }
  function listRow(rows, r, days, tag) {
    var p = pending(r), w = lawWin(r), d7 = lawD7(r), be = breakeven(r), ro = ownRoas(r);
    var improving = tag === 'improving' || (tag === 'cut' && isImproving(r));
    return '<tr><td>' + adtProductCell(r) + (improving ? '<div style="margin-top:4px"><span class="adt-vp improving">improving — keep</span></div>' : '') + '</td>' +
      '<td class="r">' + gbp(perDay(r, 'spend', days)) + '</td>' +
      '<td class="r">' + gbp(r.attr_revenue_day !== undefined ? r.attr_revenue_day : perDay(r, r.attr_revenue != null ? 'attr_revenue' : 'rev', days)) + '</td>' +
      '<td class="r ' + (ro != null && be != null ? (ro < be ? 'wr-neg' : 'wr-pos') : '') + '">' + roasTxt(ro) + '</td>' +
      '<td class="r">' + (be ? be.toFixed(2) + '×' : '—') + (r.margin_source ? '<div class="adt-pf-p">' + esc(String(r.margin_source)) + '</div>' : '') + '</td>' +
      '<td class="r">' + adtProfitCell(w, p[0], p[1]) + '</td>' +
      (hasD7(rows) ? '<td class="r">' + adtProfitCell(d7, num(r.pending_cost_orders_d7) || 0, num(r.pending_fee_orders_d7) || 0) + (num(r.spend_d7) != null ? '<div class="adt-pf-p">on ' + esc(gbp(r.spend_d7)) + '</div>' : '') + '</td>' : '') +
      (hasStage(rows) ? '<td>' + esc(r.stage || '—') + '</td>' : '') +
      (hasLever(rows) ? '<td>' + adtLeverLine(r.lever, r.who) + '</td>' : '') + '</tr>';
  }
  function cutPanel(D) {
    var cut = D.cut || [], days = windowDays(D), withheld = num(D.cut_withheld_unpriced); if (withheld == null) withheld = num(D.verdict && D.verdict.withheld_unpriced) || 0;
    var withheldTxt = withheld ? ' ' + withheld + ' losing row' + (withheld === 1 ? ' is' : 's are') + ' withheld: an order in the window is not priced yet (today\'s never are), so the loss is not ' + (withheld === 1 ? 'its' : 'theirs') + ' to carry.' : '';
    if (!cut.length) return '<div class="wr-panel"><h3>Switch off — ' + esc(windowText(D)) + '</h3><div class="wr-note">Nothing is losing enough on priced numbers to be worth switching off.' + esc(withheldTxt) + '</div></div>';
    var total = num(D.cut_total) != null ? D.cut_total : cut.length, imp = (D.improving || []).length;
    return '<div class="wr-panel"><h3>Switch off — ' + esc(String(total)) + ' listings, ' + esc(windowText(D)) + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Worst first, on the listing\'s own profit under the Sales Analysis law over the window in the heading' +
      (num(D.cut_frees) != null ? '. Together they spent <b>' + gbp(D.cut_frees) + '</b> in the window' : '') + '. ' +
      (imp ? '<b>' + imp + '</b> more lost over the window but earned over the last 7 days — they are listed under <b>Improving</b> below, not here. ' : '') +
      'Cutting a listing does not take its sales to zero — some would have come without the ad — so this is the floor on what switching off is worth, not the ceiling. ' +
      (cut.length < total ? 'Showing the ' + cut.length + ' worst.' : '') + esc(withheldTxt) + '</div>' +
      '<div class="wr-scroll"><table class="wr-tbl">' + listHead(cut, 'Listing', D) + '<tbody>' +
      cut.map(function (r) { return listRow(cut, r, days, 'cut'); }).join('') + '</tbody></table></div></div>';
  }
  /* ── improving: lost over the window, earned over the last 7 days on ≥ £5 of spend — the owner's
     "30-day bad but 7-day good = improving" (27 Sep); the engine lists these apart from the cut list ── */
  function improvingPanel(D) {
    var rows = Array.isArray(D.improving) ? D.improving : [], days = windowDays(D);
    if (!rows.length) return '';
    return '<div class="wr-panel"><h3>Improving — keep running: ' + rows.length + ' listing' + (rows.length === 1 ? '' : 's') + ', ' + esc(windowText(D)) + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Each lost money over the whole window but earned over the last 7 days on at least £5 of spend, so the recent week is the better guide. Leave them running and look again next week; best last-7-day profit first.</div>' +
      '<div class="wr-scroll"><table class="wr-tbl">' + listHead(rows, 'Listing', D) + '<tbody>' +
      rows.map(function (r) { return listRow(rows, r, days, 'improving'); }).join('') + '</tbody></table></div></div>';
  }
  function pushPanel(D) {
    var push = D.push || [], days = windowDays(D);
    if (!push.length) return '';
    return '<div class="wr-panel"><h3>Worth more money — ' + push.length + ' listings, ' + esc(windowText(D)) + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Already earning under the Sales Analysis law with every order priced, and running at least half again above their own break-even, so more spend on these is the least speculative bet on the board. Move the lever named on the row before you touch anything else.</div>' +
      '<div class="wr-scroll"><table class="wr-tbl">' + listHead(push, 'Listing', D) + '<tbody>' +
      push.map(function (r) { return listRow(push, r, days, 'push'); }).join('') + '</tbody></table></div></div>';
  }

  /* Cost-per-click campaigns — most of the fleet — are steered by daily budget, not by a bid; eBay
     exposes no bid percentage for them at all. So "who actually ran out of money" is the question. */
  function budgetPanel(D) {
    /* Phase 2 contract: `budget` is an ARRAY of item rows (each flagged deserves_more) and the verdict lives in
       `budget_note`; a Phase 1 answer carried one object {deserve_more, losing_sample, capped, verdict, days_observed} */
    var raw = D.budget, N = D.budget_note || null, earn, lose;
    if (raw == null && !N) return '';
    if (Array.isArray(raw)) {
      earn = raw.filter(function (r) { return r && r.deserves_more; }); lose = raw.filter(function (r) { return r && !r.deserves_more; });
      N = N || { capped: raw.length, days_observed: null, verdict: '' };
    } else if (raw && typeof raw === 'object') {
      earn = raw.deserve_more || []; lose = raw.losing_sample || []; N = N || raw;
    } else { earn = []; lose = []; N = N || {}; }
    var capped = num(N.capped); if (capped == null) capped = earn.length + lose.length;
    var seen = num(N.days_observed);
    var out = '<div class="wr-panel"><h3>Budget — who actually ran out of money' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note"><b>' + esc(N.verdict || (capped ? capped + ' listings ran out of money in the window.' : '')) + '</b></div>';
    if (!capped) return out + '<div class="wr-empty">Nothing hit its cap in the window.</div></div>';
    out += '<div class="wr-note">' + (seen != null ? 'Seen over ' + seen + ' day' + (seen === 1 ? '' : 's') + ' of cap data, so read the lists as a direction rather than a verdict. ' : '') +
      (num(N.earning_n) != null ? cnt(N.earning_n) + ' were earning when they ran out, ' + cnt(N.losing_n) + ' were losing' + (lose.length < num(N.losing_n) ? ' (the ' + lose.length + ' worst shown)' : '') + '. ' : '') +
      'Profit is the listing\'s own, under the Sales Analysis law.</div>';
    var row = function (r, pick) {
      var p = pending(r), bud = r.budget_capped != null ? r.budget_capped : r.budget;
      return '<tr' + (pick ? ' class="pick"' : '') + '><td>' + adtProductCell(r) + '</td>' +
        '<td class="r">' + (num(bud) != null ? gbp(bud) : '—') + '</td>' +
        '<td class="r">' + (num(r.earliest_hour) === 0 ? 'straight away' : (num(r.earliest_hour) != null ? String(r.earliest_hour) + ':00' : '—')) + '</td>' +
        '<td class="r">' + (r.capped_days != null ? esc(String(r.capped_days)) : '—') + '</td>' +
        '<td class="r">' + gbp(r.spend) + '</td>' +
        '<td class="r">' + adtProfitCell(lawWin(r), p[0], p[1]) + '</td>' +
        (d7 ? '<td class="r">' + adtProfitCell(lawD7(r), num(r.pending_cost_orders_d7) || 0, num(r.pending_fee_orders_d7) || 0) + (num(r.spend_d7) != null ? '<div class="adt-pf-p">on ' + esc(gbp(r.spend_d7)) + '</div>' : '') + '</td>' : '') +
        (lev ? '<td>' + adtLeverLine(r.lever, r.who) + '</td>' : '') + '</tr>';
    };
    var all = earn.concat(lose), d7 = hasD7(all), lev = hasLever(all);
    var head = function (first) { return '<thead><tr><th>' + first + '</th><th class="r">Budget</th><th class="r">Ran out at</th><th class="r">Days</th><th class="r">Spend (capped days)</th><th class="r">Profit (Sales Analysis law) · capped days</th>' + (d7 ? '<th class="r">· last 7 d</th>' : '') + (lev ? '<th>Lever · who</th>' : '') + '</tr></thead>'; };
    if (earn.length) out += '<div class="wr-scroll"><table class="wr-tbl">' + head('Raise these') + '<tbody>' + earn.map(function (r) { return row(r, true); }).join('') + '</tbody></table></div>';
    if (lose.length) {
      out += '<div class="wr-note" style="margin-top:12px">These also ran out, and were losing money when they did. Leave them capped — most are on the switch-off list above.</div>' +
        '<div class="wr-scroll"><table class="wr-tbl">' + head('Leave capped') + '<tbody>' + lose.map(function (r) { return row(r, false); }).join('') + '</tbody></table></div>';
    }
    return out + '</div>';
  }

  /* ── weekdays in the window: spend and ROAS only (the weekday-profit verdict went with the old curve) ── */
  function weekdayPanel(D) {
    var rows = (D.weekday || []).filter(function (r) { return r && num(r.spend) != null; });
    if (!rows.length) return '';
    rows = rows.slice().sort(function (a, b) { return (num(a.weekday) || 0) - (num(b.weekday) || 0); });
    var pts = rows.map(function (r) {
      var ro = ownRoas(r), d = num(r.days) || 1;
      return { label: wdName(r.weekday), value: ro || 0, title: wdName(r.weekday) + ' — ROAS ' + roasTxt(ro) + ' · spend ' + gbp(num(r.spend) / d) + ' a day over ' + d + ' day' + (d === 1 ? '' : 's') + ' · attributed sales ' + gbp(revOf(r)) + ' · ' + cnt(r.orders) + ' orders' };
    });
    return '<div class="wr-panel"><h3>Weekdays in the window' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">ROAS per weekday for ' + esc(D.account && D.account !== 'all' ? D.account : 'all accounts') + ' over ' + esc(windowText(D)) + '; hover for spend a day and orders. Which listing should run on which day is decided per listing on <a class="wr-more" href="#adtoolRunToday" style="margin:0">Running today</a>, not from this fleet average.</div>' +
      chartBars(pts, { height: 150, fmt: function (v) { return (Math.round(v * 10) / 10) + '×'; } }) + '</div>';
  }
})();
