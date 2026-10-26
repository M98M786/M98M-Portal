/* view-adtool-runtoday.js — Advertising Tool · Decision (owner, 27 Oct 2026: "Running today & Stop today title be
 * merged to develop better view of situation. Title: Decision"). The page starts as Running today did, and nothing in
 * those details changes; Stop today's tiles (Stop, Reduce, Push, Keep, Yesterday's score) join them as a second row, and
 * Reduce and Push sit beside All / Stop / Run / Watch working exactly as they did on Stop today (the cards, the Open
 * listing and Log what was done buttons are view-adtool-stop.js's own, exported, so there is one implementation). The
 * last-four-same-weekdays chart is drawn larger and now says what it shows: the listing's own profit on each day.
 *
 * Was: Running today (owner's brief, 27 Sep 2026: "what should be
 * running today, and what should be stopped, on the basis of the previous history, today's ad wastage and
 * today's performance, showing proper reasoning"). Hidden; flag adtool_page_runtoday. One row per advertised
 * listing from adtoolRunToday: the verdict (run / stop / watch), the sentence that explains it from the last
 * four same weekdays, last week's same day, today so far from the 5-minute grain, the hours to run and to
 * avoid, the best historical week, the morning batch's decision if any, the lever a hand can move and whose
 * hand. The period is today, fixed; the page refreshes every 5 minutes while it is open. Nothing here is
 * sent to eBay. Galaxy tokens only; gold the accent, #e0563f the loss colour. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var RT = { account: '', filter: '', data: null, stop: null, stopAt: 0, stopErr: null, seq: 0 };
  /* the filters that list the morning decisions (Stop today's cards) instead of the verdict rows */
  var DEC = { DSTOP: 'STOP', REDUCE: 'REDUCE', PUSH: 'PUSH' };
  var DOWL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  VIEW_CSS.push(
    '.rt-wrap{max-width:1320px}' +
    '.rt-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}' +
    '.rt-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}' +
    '.rt-c{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;cursor:pointer}' +
    '.rt-c.on{border-color:var(--gold-b);background:rgba(242,176,53,.1)}' +
    '.rt-c .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rt-c .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.rt-c.run .v{color:var(--gold-a)}.rt-c.stop .v{color:' + LOSS + '}.rt-c.watch .v{color:var(--text-2)}' +
    '.rt-c .d{font-size:11.5px;color:var(--text-2);margin-top:2px}' +
    '.rt-c.static{cursor:default}.rt-c.reduce .v{color:var(--text)}.rt-c.score .v{color:var(--text)}' +
    '.rt-dhead{font-size:12px;color:var(--text-2);margin:2px 0 8px;line-height:1.5}.rt-dhead b{color:var(--text)}' +
    '.rt-mcap{font-size:10.5px;font-weight:800;letter-spacing:.04em;color:var(--text-2);margin:0 0 4px;text-transform:uppercase}' +
    '.rt-foot{font-size:12px;color:var(--text-2);margin-top:12px;line-height:1.6}.rt-foot a{color:var(--gold-a);font-weight:800;text-decoration:none}.rt-foot a:hover{text-decoration:underline}' +
    '.rt-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}' +
    '.rt-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}' +
    '.rt-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.rt-tbl td{padding:9px 8px;border-bottom:1px solid var(--gold-line);vertical-align:top;color:var(--text)}' +
    '.rt-tbl tr.stop td:first-child{box-shadow:inset 3px 0 0 ' + LOSS + '}.rt-tbl tr.run td:first-child{box-shadow:inset 3px 0 0 var(--gold-b)}' +
    '.rt-why{max-width:360px;min-width:240px;line-height:1.5}.rt-why .s{color:var(--text)}.rt-why .m{font-size:11px;color:var(--text-2);margin-top:4px}' +
    '.rt-num{white-space:nowrap;line-height:1.55}.rt-num .l{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;font-weight:800}' +
    '.rt-sm{font-size:11px;color:var(--text-2);line-height:1.45}.rt-sm b{color:var(--text)}' +
    '.rt-dec{display:inline-block;padding:1px 7px;border-radius:6px;border:1px solid var(--gold-line);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-2)}' +
    '.rt-dec.STOP{color:#ffb3a6;border-color:rgba(224,86,63,.5)}.rt-dec.PUSH{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.rt-dec.REDUCE{color:var(--text);border-color:rgba(242,176,53,.3)}' +
    '.rt-empty{color:var(--text-3);font-size:13px;padding:10px 0}' +
    '.rt-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}'
  );

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function src(t, shown) { return '<span class="rt-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function wdName(w) { var n = num(w); if (n != null && DOW[n]) return DOW[n]; return w == null ? '' : String(w).slice(0, 3); }
  function wdOfDay(day) { var d = new Date(String(day) + 'T12:00:00Z'); if (isNaN(d.getTime())) return ''; return DOW[(d.getUTCDay() + 6) % 7]; }
  function hhmm(at) { if (!at) return ''; var d = new Date(String(at).replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(String(at)) ? '' : 'Z')); if (isNaN(d.getTime())) return String(at).slice(11, 16); try { return d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }) + ' UK'; } catch (e) { return d.toISOString().slice(11, 16) + ' UTC'; } }
  /* a history row's `unpriced` is a flag; the count is `unpriced_orders` (engine, 27 Sep) — never print the flag as a number */
  function unpricedCount(r) { if (!r) return 0; if (num(r.unpriced_orders) != null) return num(r.unpriced_orders); return typeof r.unpriced === 'boolean' ? null : (num(r.unpriced) || 0); }
  function isUnpriced(r) { return !!(r && (r.unpriced === true || num(r.unpriced_orders) > 0 || (typeof r.unpriced !== 'boolean' && num(r.unpriced) > 0))); }
  function fail(e) { if ($('rtBody')) $('rtBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'This page could not load.') + '</div></div>'; }

  VIEWS.adtoolRunToday = {
    label: 'Decision (ads)', hidden: true, order: 93, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    render: function () {
      return '<div class="rt-wrap">' + adtHgroup('Decision', 'Which listings should run today, which should stop, reduce or push, and why', 'rtFresh') +
        '<div id="rtAcct" class="an-filters"></div><div id="rtBody"><div class="rt-empty">Loading…</div></div></div>';
    },
    init: function () {
      acctChips();
      load(false).catch(function () {});
      /* today moves every 5 minutes; adtPoll waits on hidden tabs and stops on an 'auth' refusal (session-expiry law) */
      adtPoll('rtBody', 300000, function () { return load(true); });
    }
  };

  function accounts() {
    var D = RT.data || {}, names = (D.accounts || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (!names.length) { var seen = {}; (D.rows || []).forEach(function (r) { if (r && r.account && !seen[r.account]) { seen[r.account] = 1; names.push(r.account); } }); names.sort(); }
    return names;
  }
  function acctChips() {
    var el = $('rtAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (RT.account ? '' : 'on') + '" data-a="">All accounts</button>' + accounts().map(function (a) { return '<button class="' + (RT.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { RT.account = this.getAttribute('data-a'); acctChips(); load(false); };
  }
  /* Stop today's answer is the fleet's (adtoolStopToday takes no account; every decision row names its
     own) and its decisions are written twice a day, so it is kept for 15 minutes rather than re-read on
     every 5-minute tick; a Log what was done note forces a fresh read. */
  function loadStop(force) {
    if (!force && RT.stop && Date.now() - RT.stopAt < 900000) return Promise.resolve(RT.stop);
    return api('adtoolStopToday', {}).then(function (S) { RT.stop = S || {}; RT.stopAt = Date.now(); RT.stopErr = null; return RT.stop; })
      .catch(function (e) { RT.stopErr = (e && e.message) || 'it could not load'; if (!RT.stop) throw e; return RT.stop; });
  }
  function load(quiet) {
    var my = ++RT.seq;
    loadStop(false).then(function () { if ($('rtBody') && RT.data && my === RT.seq) draw(); }, function () { if ($('rtBody') && RT.data && my === RT.seq) draw(); });
    return api('adtoolRunToday', RT.account ? { account: RT.account } : {}).then(function (D) {
      if (my !== RT.seq) return;
      RT.data = D || {};
      if (!$('rtBody')) return;
      acctChips();
      draw();
      adtFreshShow('rtFresh', D && D.fresh);
    }).catch(function (e) { if (my !== RT.seq) return; if (!quiet) fail(e); throw e; });
  }

  /* the verdict order is the action order: stop first (money leaking now), then run, then watch;
     inside a verdict the listing spending most today comes first */
  var ORDER = { stop: 0, run: 1, watch: 2 };
  function draw() {
    var D = RT.data, rows = (D.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    var counts = D.counts || {};
    if (counts.run == null && counts.stop == null && counts.watch == null) { counts = { run: 0, stop: 0, watch: 0 }; rows.forEach(function (r) { var v = String(r.verdict || 'watch').toLowerCase(); counts[v] = (counts[v] || 0) + 1; }); }
    var h = '';
    var P = D.period, when = P && (P.label || P.from) ? adtPeriodText(P) : 'today';
    h += '<div class="rt-top"><span>' + esc(when) + '</span><span>·</span><span>' + esc(RT.account || 'all accounts') + '</span><span>·</span><span>' + rows.length + ' advertised listing' + (rows.length === 1 ? '' : 's') + '</span>' +
      (D.computed_at ? '<span>·</span><span>updated ' + esc(hhmm(D.computed_at)) + '</span>' : '') + src('run today verdict') + '</div>';
    h += '<div class="rt-counts">' + [['stop', 'Stop today', 'lost on 3 of the last 4 same weekdays and over the last 7 days'], ['run', 'Run today', 'earned on the last same weekdays, or earning over 7 days above break-even'], ['watch', 'Watch', 'some orders are not costed yet, so we cannot say']].map(function (x) {
      return '<div class="rt-c ' + x[0] + (RT.filter === x[0] ? ' on' : '') + '" data-f="' + x[0] + '"><div class="k">' + esc(x[1]) + '</div><div class="v">' + cnt(counts[x[0]]) + '</div><div class="d">' + esc(x[2]) + '</div></div>';
    }).join('') + '</div>';
    h += decisionsRow();
    h += '<div class="rt-note"><b>How to read a row.</b> <b>Stop</b> means the listing lost money on at least three of the last four same weekdays and over the last 7 days. <b>Run</b> means it made money. <b>Watch</b> means some orders are not costed yet, so we cannot say. Hours are a suggestion only, as eBay cannot schedule ads by the hour. Nothing here is sent to eBay.</div>';
    /* Reduce and Push (owner, 27 Oct): "add this option above data details, these should function as they
       are in Stop today page" — they list the morning decisions as Stop today did */
    h += '<div class="an-filters">' + [['', 'All'], ['stop', 'Stop'], ['run', 'Run'], ['watch', 'Watch'], ['REDUCE', 'Reduce'], ['PUSH', 'Push']].map(function (x) { return '<button class="' + (RT.filter === x[0] ? 'on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var shown = rows.filter(function (r) { return !RT.filter || String(r.verdict || 'watch').toLowerCase() === RT.filter; })
      .sort(function (a, b) { var oa = ORDER[String(a.verdict || 'watch').toLowerCase()], ob = ORDER[String(b.verdict || 'watch').toLowerCase()]; if (oa == null) oa = 3; if (ob == null) ob = 3; if (oa !== ob) return oa - ob; return (num(b.today && b.today.spend) || 0) - (num(a.today && a.today.spend) || 0); });
    if (DEC[RT.filter]) { h += decisionList(); }
    else if (!shown.length) { h += '<div class="rt-empty">' + (rows.length ? 'No listing carries this verdict today.' : 'No ad figures from eBay yet today. They start arriving around 08:00 UK.') + '</div>'; }
    else {
      h += '<div class="an-scroll"><table class="rt-tbl"><thead><tr><th>Listing</th><th>Why' + src('run today verdict') + '</th><th>Last 4 same weekdays · profit</th><th>Today so far' + src('today grain', 'today\'s samples') + '</th><th>Hours today' + src('hour bands', 'hours') + '</th><th>Best week · decision</th><th>What to change · who</th></tr></thead><tbody>' +
        shown.map(rowHtml).join('') + '</tbody></table></div>';
    }
    h += '<div class="rt-sm" style="margin-top:8px">' + esc(D.source || '') + '</div>';
    /* the rest of what Stop today and What to do today carried, one click away rather than on this page */
    h += '<div class="rt-foot">How each decision rule scores, any past day\'s decisions, the team\'s action log and the switches that send changes to eBay are on <a href="#adtoolStop">Decision engine</a>. ' +
      'The longer lists over a period you pick (switch off, on the mend, worth more money, out of budget) are on <a href="#adtoolPlan">Switch off and push</a>.</div>';
    $('rtBody').innerHTML = h;
    var fs = document.querySelectorAll('#rtBody [data-f]'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { var f = this.getAttribute('data-f'); RT.filter = RT.filter === f && this.classList.contains('rt-c') ? '' : f; draw(); };
    if (DEC[RT.filter] && typeof window.adtDecisionWire === 'function') window.adtDecisionWire($('rtBody'), function () { loadStop(true).then(function () { if ($('rtBody') && RT.data) draw(); }).catch(function () {}); });
  }

  /* Stop today's five tiles (owner, 27 Oct: "below detail are merged in above presented running today"). The
     counts are view-adtool-stop.js's own; with one account picked, Stop / Reduce / Push are that account's
     decisions and Keep and the score stay all-accounts figures, because KEEP rows and the score are fleet. */
  function decisionsRow() {
    var S = RT.stop;
    var head = '<div class="rt-dhead"><b>Morning decisions</b> · written before the day starts and scored the next morning against the profit the listing actually made · nothing here is sent to eBay' + src('scored daily') + '</div>';
    if (!S || typeof window.adtDecisionCounts !== 'function') return head + '<div class="rt-sm" style="margin:-2px 0 12px">' + (RT.stopErr ? 'The morning decisions did not load: ' + esc(RT.stopErr) : 'Loading the morning decisions…') + '</div>';
    var c = window.adtDecisionCounts(S, RT.account);
    var all = RT.account ? '<div class="rt-sm" style="margin-top:2px">all accounts</div>' : '';
    var t = function (key, cls, label, v, d) {
      return '<div class="rt-c ' + cls + (key ? (RT.filter === key ? ' on' : '') : ' static') + '"' + (key ? ' data-f="' + key + '"' : '') + '><div class="k">' + esc(label) + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>';
    };
    return head + '<div class="rt-counts">' +
      t('DSTOP', 'stop', 'Stop', cnt(c.STOP), esc(c.conf.STOP)) +
      t('REDUCE', 'reduce', 'Reduce', cnt(c.REDUCE), esc(c.conf.REDUCE)) +
      t('PUSH', 'run', 'Push', cnt(c.PUSH), esc(c.conf.PUSH)) +
      t('', 'watch', 'Keep', cnt(c.KEEP), 'left alone' + all) +
      t('', 'score', "Yesterday's score", c.score, esc(c.scoreSub) + all) + '</div>';
  }
  /* the cards, as Stop today drew them, for the decision the filter names, narrowed to the account picked */
  function decisionList() {
    var S = RT.stop, want = DEC[RT.filter], label = { STOP: 'Stop', REDUCE: 'Reduce', PUSH: 'Push' }[want] || want;
    if (!S || typeof window.adtDecisionCard !== 'function') return '<div class="rt-empty">' + (RT.stopErr ? 'The morning decisions did not load: ' + esc(RT.stopErr) : 'Loading the morning decisions…') + '</div>';
    var rows = (S.decisions || []).filter(function (d) { return d.decision === want && (!RT.account || d.account === RT.account); });
    var h = '<div class="rt-top"><span><b>' + esc(label) + '</b> · the morning decisions for ' + esc(S.day || 'today') + '</span><span>·</span><span>' + esc(RT.account || 'all accounts') + '</span><span>·</span><span>' + rows.length + ' listing' + (rows.length === 1 ? '' : 's') + '</span></div>';
    return h + (rows.length ? rows.map(window.adtDecisionCard).join('') : '<div class="rt-empty">No ' + esc(label.toLowerCase()) + ' decision ' + (RT.account ? 'for ' + esc(RT.account) + ' ' : '') + 'today.</div>');
  }

  function rowHtml(r) {
    var v = String(r.verdict || 'watch').toLowerCase(), T = r.today || {}, WP = r.weekday_profile || null, LW = r.last_week_same_day || null, BW = r.best_week || null, MD = r.morning_decision || null;
    var hist = (r.weekday_history || []).filter(function (x) { return x && x.day; });
    var todayWd = hist.length ? wdOfDay(hist[hist.length - 1].day) : '';
    var sentence = r.sentence ? String(r.sentence) : fallbackSentence(hist, LW, T, todayWd);
    var why = '<div class="rt-why"><div class="s">' + esc(sentence) + '</div>';
    if (WP && num(WP.index) != null) {
      why += '<div class="m">sells <b>' + (Math.round(num(WP.index) * 10) / 10) + '×</b> its average on this weekday ' + (WP.confident ? '(a real pattern)' : '(within normal variation)') + '</div>';
    }
    if (LW && (num(LW.spend) != null || num(LW.actual_profit) != null)) {
      why += '<div class="m">last ' + esc(LW.day ? wdOfDay(LW.day) : 'week, same day') + (LW.day ? ' (' + esc(String(LW.day)) + ')' : '') + ': ' + (LW.has_row === false ? 'no ads or orders' : gbp(LW.spend) + ' spend · ' + cnt(LW.attr_units) + ' units from ads · profit ' + adtProfitCell(LW.actual_profit, 0, 0, unpricedCount(LW)) + (isUnpriced(LW) && !(unpricedCount(LW) > 0) ? ' <span class="adt-pf-p">· not fully costed</span>' : '')) + '</div>';
    }
    why += '</div>';
    var today = '<div class="rt-num"><div><span class="l">spend</span> <b>' + gbp(T.spend) + '</b></div><div><span class="l">clicks</span> ' + cnt(T.clicks) + ' · <span class="l">units from ads</span> ' + cnt(T.attr_units) + '</div>' +
      '<div><span class="l">orders</span> ' + cnt(T.orders) + '</div><div><span class="l">profit</span> ' + adtProfitCell(T.actual_profit, 0, 0, T.unpriced) + '</div>' +
      (T.sampled_at ? '<div class="rt-sm">sampled ' + esc(hhmm(T.sampled_at)) + '</div>' : '<div class="rt-sm">nothing from eBay yet today</div>') + '</div>';
    var best = '<div class="rt-sm">' + (BW && (BW.week || num(BW.spend) != null) ? 'best week <b>' + esc(String(BW.week || '')) + '</b>: ' + gbp(BW.spend) + ' spend → ' + gbp(BW.attr_revenue) + ' sales from ads · profit ' + adtProfitCell(BW.actual_profit, BW.pending_cost_orders, BW.pending_fee_orders) : 'no best week yet') + '</div>';
    /* the chip is the STOP / REDUCE / PUSH label (`decision`); the prose `action` follows it; older answers carried only the prose */
    var decLabel = MD ? String(MD.decision || '').toUpperCase() : '';
    best += MD && (MD.decision || MD.action || MD.why) ? '<div class="rt-sm" style="margin-top:6px"><span class="rt-dec ' + esc(decLabel) + '">' + esc(decLabel || 'decision') + '</span> ' + (MD.action ? '<b>' + esc(String(MD.action)) + '</b> · ' : '') + esc(String(MD.why || '')) + (MD.batch ? ' <span class="adt-pf-p">· ' + esc(String(MD.batch) === 'boundary' ? 'evening' : String(MD.batch)) + ' run, nothing sent to eBay</span>' : '') + '</div>' : '<div class="rt-sm" style="margin-top:6px">no morning decision</div>';
    return '<tr class="' + esc(v) + '"><td>' + adtVerdictPill(v) + '<div style="margin-top:6px">' + adtProductCell(r) + '</div></td>' +
      '<td>' + why + '</td>' +
      '<td>' + miniBars(hist) + '</td>' +
      '<td>' + today + '</td>' +
      '<td>' + adtHourStrip(r.hour_bands) + '</td>' +
      '<td>' + best + '</td>' +
      '<td>' + adtLeverLine(r.lever, r.who) + '</td></tr>';
  }

  /* the engine writes the sentence; when an answer lacks it the page says the same thing from the history it has */
  function fallbackSentence(hist, LW, T, wd) {
    if (!hist.length) return 'No same-weekday history yet.';
    var s = 0, p = 0, priced = 0, unp = 0;
    hist = hist.filter(function (x) { return x.has_row !== false; });
    if (!hist.length) return 'No same-weekday history yet.';
    hist.forEach(function (x) { s += num(x.spend) || 0; if (num(x.actual_profit) != null && !isUnpriced(x)) { p += num(x.actual_profit); priced++; } else { unp++; } });
    var out = 'On the last ' + hist.length + ' ' + (wd ? wd + 's' : 'same weekdays') + ' it spent ' + gbp(s) + ' and made ' + gbp(p) + ' profit' + (unp ? ' (' + unp + ' day' + (unp === 1 ? '' : 's') + ' not fully costed)' : '') + ';';
    if (LW) out += ' last ' + (wd || 'week') + ' ' + gbp(LW.spend) + ' / ' + gbp(LW.actual_profit) + ';';
    return out + ' today so far ' + gbp(T.spend) + ' spend, ' + cnt(T.attr_units) + ' units.';
  }

  /* The listing's own profit on each of the last four same weekdays (owner, 27 Oct: "this should improve,
     details come through small. What is the value of that detail"). The value is PROFIT under the Sales
     Analysis law, so the chart now says so in a caption naming the weekday, prints pounds and pence on every
     bar (a rounded £2 hid the detail), and puts the date and what was spent under each bar. Twice the old
     size, labels at reading size. Gold = made money, #e0563f = lost, a faint stub = no ads or orders that day,
     a lighter bar and * = not every order costed yet. Newest day on the left, as the sentence beside it reads.
     chartBars draws at 980 units wide and would shrink its labels past reading in a table cell, so this keeps
     its own geometry at a cell's size and borrows only the pill. */
  function shortDay(day) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || '')); return m ? Number(m[3]) + ' ' + MON[Number(m[2]) - 1] : String(day || '').slice(5); }
  function miniBars(hist) {
    var rows = hist.slice(-4);
    if (!rows.length) return '<div class="rt-sm">no same-weekday history</div>';
    var W = 284, H = 152, L = 4, R = 4, T = 6, B = 36, room = 16;
    var maxP = 0, maxN = 0;
    rows.forEach(function (r) { var v = r.has_row === false ? null : num(r.actual_profit); if (v == null) return; if (v > 0) maxP = Math.max(maxP, v); if (v < 0) maxN = Math.max(maxN, -v); });
    /* the zero line sits where the gains and losses split the height between them, so a listing that only
       lost uses the whole cell downwards and one that only earned uses it upwards */
    var top = T + room, bot = H - B - room, zero, scale;
    if (maxP > 0 && maxN > 0) { scale = (bot - top) / (maxP + maxN); zero = top + maxP * scale; }
    else if (maxN > 0) { zero = T + 4; scale = (bot - zero) / maxN; }
    else { zero = H - B; scale = maxP > 0 ? (zero - top) / maxP : 0; }
    var slot = (W - L - R) / rows.length, bw = Math.min(40, slot * 0.52);
    /* drawn one unit to one pixel and never shrunk to the cell: a table squeezing its columns is exactly what
       made the old labels unreadable, so the cell holds its width and the table scrolls sideways instead */
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="display:block" role="img" aria-label="profit on each of the last four same weekdays">';
    s += '<line x1="' + L + '" y1="' + zero.toFixed(1) + '" x2="' + (W - R) + '" y2="' + zero.toFixed(1) + '" stroke="rgba(255,255,255,.18)" stroke-width="1"/>';
    var dots = [];
    rows.forEach(function (r, i) {
      var noRow = r.has_row === false, v = noRow ? null : num(r.actual_profit), unp = isUnpriced(r), uc = unpricedCount(r);
      var cx = L + slot * i + slot / 2, x = cx - bw / 2, hgt = v == null ? 2 : Math.max(2, Math.abs(v) * scale);
      var y = v == null || v >= 0 ? zero - hgt : zero;
      var fill = v == null ? 'rgba(255,255,255,.14)' : (v < 0 ? LOSS : 'var(--gold-b)');
      var title = (r.day || '') + ' (' + wdOfDay(r.day) + ') · ' + (noRow ? 'no ads or orders' : 'profit ' + (v == null ? '—' : gbp(v)) + ' · spend ' + gbp(r.spend) + ' · ' + cnt(r.attr_units) + ' units from ads' + (unp ? ' · ' + (uc != null && uc > 0 ? uc + ' order' + (uc === 1 ? '' : 's') + ' not costed' : 'not fully costed') : ''));
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="3" fill="' + fill + '"' + (unp ? ' opacity=".55"' : '') + '><title>' + esc(title) + '</title></rect>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 15) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#9aa4b1">' + esc(wdOfDay(r.day) + ' ' + shortDay(r.day)) + '</text>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 29) + '" text-anchor="middle" font-size="10" fill="#66707c">' + esc(noRow ? 'no ads' : gbp(r.spend) + ' spent') + '</text>';
      if (!noRow) dots.push({ x: cx, y: v == null || v >= 0 ? y - 10 : zero + hgt + 10, label: v == null ? '—' : gbp(v) + (unp ? '*' : ''), title: title });
    });
    s += chartValueDots(dots, { color: 'var(--gold-a)', ink: '#1c1200', fontSize: 10.5, minGap: 0 });
    s += '</svg>';
    var wd = rows.length ? wdOfDay(rows[0].day) : '', wdl = '';
    for (var k = 0; k < DOW.length; k++) { if (DOW[k] === wd) { wdl = DOWL[k]; break; } }
    var anyUnp = rows.some(isUnpriced);
    return '<div style="min-width:' + W + 'px"><div class="rt-mcap">Profit on each of the last ' + rows.length + ' ' + esc(wdl ? wdl + 's' : 'same weekdays') + '</div>' + s +
      '<div class="rt-sm">gold made money · red lost money' + (anyUnp ? ' · * not every order costed yet' : '') + '</div></div>';
  }
})();
