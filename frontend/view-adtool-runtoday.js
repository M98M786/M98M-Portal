/* view-adtool-runtoday.js — Advertising Tool · Decision (owner's Change Spec, 28 Oct 2026: the merge of
 * "Running today" and "Stop today"). One row per advertised listing from adtoolRunToday: the verdict
 * (run / stop / watch), the sentence that explains it from the last four same weekdays, last week's same
 * day, today so far from the 5-minute grain, the hours to run and to avoid, the best historical week, the
 * morning batch's own decision, the lever a hand can move and whose hand.
 * Running today as it was, plus exactly the three changes the spec names:
 *   (a) the last-four-same-weekdays chart enlarged, with every bar's own profit on it;
 *   (b) Stop today's tiles beside Running today's three — BOTH Stop tiles, each saying which check
 *       it counts, from adtoolStopToday;
 *   (c) Reduce and Push filter buttons beside All / Stop / Run / Watch, filtering on the morning
 *       decision rather than on the weekday verdict.
 * The live-apply panel and the apply log are not here: they live on Live apply, which is the only place
 * anything can reach eBay. The period is today, fixed; the page refreshes every 5 minutes while open.
 * Galaxy tokens only; gold the accent, #e0563f the loss colour. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DECISIONS = { REDUCE: 1, PUSH: 1 };
  /* `peakOpen` is the small list behind the Stop today tile's second line; `peakBusy` is the one
     listing a hold is being written for, so two clicks cannot send two holds at once. */
  var RT = { account: '', filter: '', data: null, stop: null, peakOpen: false, peakBusy: '' };

  VIEW_CSS.push(
    '.rt-wrap{max-width:1320px}' +
    '.rt-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}' +
    '.rt-cap{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin:2px 0 6px}' +
    '.rt-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}' +
    '.rt-c{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px}' +
    '.rt-c[data-f]{cursor:pointer}' +
    '.rt-c.on{border-color:var(--gold-b);background:rgba(242,176,53,.1)}' +
    '.rt-c .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rt-c .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.rt-c.run .v{color:var(--gold-a)}.rt-c.stop .v{color:' + LOSS + '}.rt-c.watch .v{color:var(--text-2)}' +
    '.rt-c.d-stop .v{color:' + LOSS + '}.rt-c.d-push .v{color:var(--gold-a)}.rt-c.d-reduce .v{color:var(--text)}.rt-c.d-keep .v{color:var(--text-2)}.rt-c.d-score .v{color:var(--text)}' +
    '.rt-c .d{font-size:11.5px;color:var(--text-2);margin-top:2px;line-height:1.45}' +
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
    '.rt-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}' +
    /* the same small grey as .rt-src and nothing else: no dotted underline, no pointer. A note that
       is not a register link must not wear the look of one. */
    '.rt-dim{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700}' +
    /* ── the pattern engine's own OFF windows for today (owner's brief, 31 Oct, §3). This file's
       own prefix: nothing here borrows a class from another spliced file. ── */
    '.rt-c .pk{display:block;margin-top:5px;font-size:11px;line-height:1.45;color:var(--text-2);background:transparent;border:0;padding:0;font:inherit;text-align:left;cursor:pointer;text-decoration:underline;text-underline-offset:2px}' +
    '.rt-c .pk b{color:var(--gold-a)}' +
    '.rt-c .pk.flat{cursor:default;text-decoration:none}' +
    '.rt-pkp{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin:0 0 12px}' +
    '.rt-pkp h4{margin:0 0 4px;font-size:13px;font-weight:800;color:var(--text)}' +
    '.rt-pkp .s{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}' +
    '.rt-pkr{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}' +
    '.rt-pkr .w{flex:1 1 220px;min-width:180px;font-size:11.5px;color:var(--text-2);line-height:1.5}' +
    '.rt-pkr .w b{color:var(--text)}' +
    '.rt-pkb{background:transparent;border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:4px 11px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;align-self:center}' +
    '.rt-pkb:hover{color:var(--gold-a);border-color:var(--gold-line-hi)}' +
    '.rt-pkb[disabled]{opacity:.5;cursor:default}'
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
    label: 'Decision', hidden: true, order: 93, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    render: function () {
      return '<div class="rt-wrap">' + adtHgroup('Decision', 'Which listings should run today, which should stop, and why', 'rtFresh') +
        '<div id="rtAcct" class="an-filters"></div><div id="rtBody"><div class="rt-empty">Loading…</div></div></div>';
    },
    init: function () {
      /* a closure outlives a visit: drop yesterday's score so a page re-opened the next morning
         does not paint the previous day's figure before asking for a new one */
      RT.data = null; RT.stop = null; RT.filter = ''; RT.peakOpen = false; RT.peakBusy = '';
      acctChips();
      load(false)['catch'](function () {});
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
  function load(quiet) {
    /* the rows, the weekday verdict and this morning's decision all come off adtoolRunToday, one
       row per listing. adtoolStopToday is read for ONE figure, yesterday's score, which is a
       finished day and does not move: it is asked for once when the page opens and not again on
       the 5-minute poll. It is fleet-wide and may be off or empty, so it can never hold the page
       back — its own tile says so instead. */
    var a = api('adtoolRunToday', RT.account ? { account: RT.account } : {}).then(function (D) { RT.data = D || {}; });
    var b = RT.stop ? Promise.resolve()
      : api('adtoolStopToday', {}).then(function (D) { RT.stop = D || {}; })['catch'](function (e) { RT.stop = { error: (e && e.message) || 'could not load' }; });
    return Promise.all([a, b]).then(function () {
      if (!$('rtBody')) return;
      acctChips();
      draw();
      adtFreshShow('rtFresh', RT.data && RT.data.fresh);
    })['catch'](function (e) { if (!quiet) fail(e); throw e; });
  }

  /* the verdict order is the action order: stop first (money leaking now), then run, then watch;
     inside a verdict the listing spending most today comes first */
  var ORDER = { stop: 0, run: 1, watch: 2 };
  function decisionOf(r) { return String((r && r.morning_decision && r.morning_decision.decision) || '').toUpperCase(); }
  function rowPasses(r) {
    var f = RT.filter;
    if (!f) return true;
    if (DECISIONS[f]) return decisionOf(r) === f;
    return String(r.verdict || 'watch').toLowerCase() === f;
  }
  function draw() {
    var D = RT.data, rows = (D.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    var counts = D.counts || {};
    if (counts.run == null && counts.stop == null && counts.watch == null) { counts = { run: 0, stop: 0, watch: 0 }; rows.forEach(function (r) { var v = String(r.verdict || 'watch').toLowerCase(); counts[v] = (counts[v] || 0) + 1; }); }
    var h = '';
    var P = D.period, when = P && (P.label || P.from) ? adtPeriodText(P) : 'today';
    h += '<div class="rt-top"><span>' + esc(when) + '</span><span>·</span><span>' + esc(RT.account || 'all accounts') + '</span><span>·</span><span>' + rows.length + ' advertised listing' + (rows.length === 1 ? '' : 's') + '</span>' +
      (D.computed_at ? '<span>·</span><span>updated ' + esc(hhmm(D.computed_at)) + '</span>' : '') + src('run today verdict') + '</div>';
    h += '<div class="rt-cap">On the last four same weekdays</div>';
    h += '<div class="rt-counts">' + [['stop', 'Stop today', 'lost on 3 of the last 4 same weekdays and over the last 7 days'], ['run', 'Run today', 'earned on the last same weekdays, or earning over 7 days above break-even'], ['watch', 'Watch', 'some orders are not costed yet, so we cannot say']].map(function (x) {
      return '<div class="rt-c ' + x[0] + (RT.filter === x[0] ? ' on' : '') + '" data-f="' + x[0] + '"><div class="k">' + esc(x[1]) + '</div><div class="v">' + cnt(counts[x[0]]) + '</div><div class="d">' + esc(x[2]) + '</div>' +
        (x[0] === 'stop' ? peakOffLine() : '') + '</div>';
    }).join('') + '</div>';
    h += peakOffPanel();
    h += decisionTiles();
    h += '<div class="rt-note"><b>How to read a row.</b> <b>Stop</b> means the listing lost money on at least three of the last four same weekdays and over the last 7 days. <b>Run</b> means it made money. <b>Watch</b> means some orders are not costed yet, so we cannot say. The <b>Stop, Reduce, Push and Keep</b> tiles are this morning\'s own call on each listing, scored the next day against the profit it actually made. The hours on a row are a suggestion: eBay cannot schedule ads by the hour, and the only place the portal switches an ad at an hour of its own is <a href="#adtoolPeak" style="color:var(--gold-a);font-weight:800">Peak time listings</a>, for the listings Management puts on that list.</div>';
    h += '<div class="an-filters">' + [['', 'All'], ['stop', 'Stop'], ['run', 'Run'], ['watch', 'Watch'], ['REDUCE', 'Reduce'], ['PUSH', 'Push']].map(function (x) { return '<button class="' + (RT.filter === x[0] ? 'on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var shown = rows.filter(rowPasses)
      .sort(function (a, b) { var oa = ORDER[String(a.verdict || 'watch').toLowerCase()], ob = ORDER[String(b.verdict || 'watch').toLowerCase()]; if (oa == null) oa = 3; if (ob == null) ob = 3; if (oa !== ob) return oa - ob; return (num(b.today && b.today.spend) || 0) - (num(a.today && a.today.spend) || 0); });
    if (!shown.length) {
      h += '<div class="rt-empty">' + (!rows.length ? 'No ad figures from eBay yet today. They start arriving around 08:00 UK.'
        : (DECISIONS[RT.filter] ? 'No listing here carries that decision this morning.' : 'No listing carries this verdict today.')) + '</div>';
    } else {
      h += '<div class="an-scroll"><table class="rt-tbl"><thead><tr><th>Listing</th><th>Why' + src('run today verdict') + '</th><th>Last 4 same weekdays</th><th>Today so far' + src('today grain', 'today\'s samples') + '</th><th>Hours today' + src('hour bands', 'hours') + '</th><th>Best week · decision</th><th>What to change · who</th></tr></thead><tbody>' +
        shown.map(rowHtml).join('') + '</tbody></table></div>';
    }
    h += '<div class="rt-sm" style="margin-top:8px">' + esc(D.source || '') + '</div>';
    $('rtBody').innerHTML = h;
    var fs = document.querySelectorAll('#rtBody [data-f]'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { var f = this.getAttribute('data-f'); RT.filter = RT.filter === f && this.classList.contains('rt-c') ? '' : f; draw(); };
    /* the second line lives INSIDE the Stop today tile, which is itself a filter button, so its own
       click has to stop there: without this, opening the list also filtered the table to stops */
    var ps = document.querySelectorAll('#rtBody [data-rtpeak]');
    for (var j = 0; j < ps.length; j++) ps[j].onclick = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      RT.peakOpen = !RT.peakOpen;
      draw();
    };
    var pc = document.querySelectorAll('#rtBody [data-rtpeakclose]');
    for (var k = 0; k < pc.length; k++) pc[k].onclick = function () { RT.peakOpen = false; draw(); };
    var hb = document.querySelectorAll('#rtBody [data-rthold]');
    for (var m = 0; m < hb.length; m++) hb[m].onclick = function () {
      var id = this.getAttribute('data-rthold');
      if (!id) { toast('That row has no item number.'); return; }
      holdOn(id, this);
    };
  }

  /* ══ THE PATTERN ENGINE'S OWN STOPS FOR TODAY (owner's brief, 31 Oct, §3) ═══════════════════
     The Stop today tile counts listings a reader has to decide about. This second line counts the
     ones the system has ALREADY stopped, for stretches of today, inside the hours somebody typed for
     them, because they have never sold in those hours. It is not a verdict and it is not a decision
     for anybody to act on, which is why it sits beside the tile rather than in the table: it is there
     so somebody can see what was stopped, and overrule it from here if they disagree. ══ */
  function peakOff() {
    var L = RT.data && RT.data.peak_off_windows_today;
    return Array.isArray(L) ? L.filter(function (r) { return r && typeof r === 'object'; }) : null;
  }
  /* the end of a stretch is the hour the ad stops, so it may be 24: printed as midnight rather than
     clamped to 23:00, which would read as a window ending an hour early */
  function hourTxt(n) { var v = Math.round(Number(n) || 0); return v >= 24 ? 'midnight' : (v < 10 ? '0' : '') + v + ':00'; }
  function windowsTxt(ws) {
    var L = (ws || []).filter(function (w) { return w && w.from != null && w.to != null; });
    if (!L.length) return 'no stretch recorded';
    return L.map(function (w) { return hourTxt(w.from) + ' to ' + hourTxt(w.to); }).join(', ');
  }
  function peakOffLine() {
    var L = peakOff();
    if (L == null) return '<span class="pk flat">Whether the pattern engine is holding any listing off today is not in this answer.</span>';
    if (!L.length) return '<span class="pk flat">' + esc(String((RT.data && RT.data.peak_off_note) || 'No listing on the peak hours list is being held off inside its own hours today.')) + '</span>';
    return '<button type="button" class="pk" data-rtpeak="1" title="show the listings and the stretches"><b>' + L.length + '</b> ' +
      (L.length === 1 ? 'listing has off windows' : 'listings have off windows') + ' planned today by the pattern engine' +
      (RT.peakOpen ? ' (hide)' : '') + '</button>';
  }
  function peakOffPanel() {
    if (!RT.peakOpen) return '';
    var L = peakOff();
    if (!L || !L.length) return '';
    return '<div class="rt-pkp"><h4>Held off today by the pattern engine' + src('the 24-hour pattern', 'how') + '</h4>' +
      '<div class="s">' + esc(String((RT.data && RT.data.peak_off_note) || '')) + ' The hours somebody typed are the most these listings can run; ' +
      'these stretches sit inside those hours. <b>Hold on</b> keeps a listing running all day instead, whatever its hours and its ' +
      'pattern say, and is undone from <a href="#adtoolPeak?tab=manual" style="color:var(--gold-a);font-weight:800">Peak time listings</a>.</div>' +
      L.map(function (r) {
        var id = String(r.item_id || '');
        var held = String(r.hold || '') === 'on';
        return '<div class="rt-pkr"><div style="flex:1 1 280px;min-width:230px">' + adtProductCell(r) + '</div>' +
          '<div class="w"><b>Off</b> ' + esc(windowsTxt(r.windows)) + ' UK' +
          (r.hours ? '<br>its own hours: ' + esc(String(r.hours)) : '') +
          '<br>' + esc(r.source ? 'from ' + (String(r.source) === 'pattern' ? 'its pattern' : String(r.source) === 'hold' ? 'a hold somebody set' : String(r.source)) : 'source not recorded') +
          (r.reason ? '<br>' + esc(String(r.reason)) : '') + '</div>' +
          '<button type="button" class="rt-pkb" data-rthold="' + esc(id) + '"' +
          (held || RT.peakBusy === id ? ' disabled' : '') + '>' + (held ? 'already held on' : 'Hold on') + '</button></div>';
      }).join('') +
      '<div style="margin-top:10px"><button type="button" class="rt-pkb" data-rtpeakclose="1">Close</button></div></div>';
  }
  /* the same write the Peak time listings page makes, with the same confirm. It sends nothing itself:
     a hold is a wanted state in a column, and only the quarter-hourly switch reaches eBay, on an
     account whose own live-apply switch is on. */
  function holdOn(id, el) {
    if (RT.peakBusy) return;
    if (!confirm('Keep listing ' + id + ' running all day?\n\nIts hours and its pattern stop deciding anything for it until somebody puts it back ' +
      'on the schedule from Peak time listings. Nothing is sent to eBay by this on its own: the next quarter-hourly tick puts the ad right, ' +
      'and only on an account whose live-apply switch is on.')) return;
    RT.peakBusy = String(id);
    if (el) el.disabled = true;
    api('adtoolPeakHold', { item_id: id, hold: 'on' }).then(function (R) {
      RT.peakBusy = '';
      toast((R && R.note_to_reader) ? String(R.note_to_reader) : 'Held on');
      if (R && R.takes_effect === false && R.takes_effect_note) toast(String(R.takes_effect_note));
      return load(false);
    })['catch'](function (e) {
      RT.peakBusy = '';
      if (el) el.disabled = false;
      toast((e && e.message) || 'That hold could not be set.');
    });
  }

  /* (b) the four decision tiles beside the weekday verdict, plus yesterday's score. Both Stop tiles
     stand: the one above counts the weekday-history verdict, this one counts the stop calls the
     morning run made. They answer different questions and can disagree, which is the point.
     THE TILES COUNT THE ROWS UNDER THEM. They used to add up adtoolStopToday's own tally, which
     groups by batch as well as by decision, so a listing decided in the evening run and again in
     the morning run was counted twice and every tile stood above a shorter list; it was also
     fleet-wide while the list below it followed the account chip. Both are gone by construction:
     the decision comes off the same `rows` the Reduce and Push buttons filter, one per listing,
     already narrowed to the chosen account. adtoolStopToday is left with yesterday's score alone. */
  function decisionTiles() {
    var S = RT.stop;
    var rows = ((RT.data && RT.data.rows) || []).filter(function (r) { return r && typeof r === 'object'; });
    var plain = function (k, v, d, cls) { return '<div class="rt-c ' + cls + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>'; };
    var counts = {}, none = 0;
    rows.forEach(function (r) {
      var d = decisionOf(r);
      if (!d) { none++; return; }
      var c = String((r.morning_decision && r.morning_decision.confidence) || '').toLowerCase();
      counts[d] = (counts[d] || 0) + 1;
      if (c) counts[d + '|' + c] = (counts[d + '|' + c] || 0) + 1;
    });
    var cap = '<div class="rt-cap">This morning\'s own call on each listing · ' + esc(RT.account || 'all accounts') +
      (none ? ' · ' + none + ' of them have no decision this morning' : '') + '</div>';
    var conf = function (k) {
      var c = counts[k + '|confident'] || 0, w = counts[k + '|watch'] || 0;
      if (!c && !w) return 'no confidence recorded';
      return c + ' confident' + (w ? ' · ' + w + ' watch' : '');
    };
    /* the tile is the FINAL scores only; a score still waiting on costs / fees / the ads report is named
       beside it, never counted — the engine re-scores it on later runs (outcome_provisional) */
    var ySc = (S && S.yesterday_score) || {};
    var yProv = Number(ySc.provisional) || 0, yN = Number(ySc.n) || 0;
    var yTile, ySub;
    if (!S) { yTile = '—'; ySub = 'not available yet'; }
    else if (S.error) { yTile = '—'; ySub = 'could not be read: ' + esc(String(S.error)); }
    else {
      yTile = yN ? Number(ySc.r) + ' of ' + yN + (yProv ? ' <span class="rt-dim">· ' + yProv + ' still updating</span>' : '') : (yProv ? '<span class="rt-dim">' + yProv + ' still updating</span>' : '—');
      ySub = yN ? Math.round(Number(ySc.r) / yN * 100) + ' % right' + (yProv ? ' (we check the rest again as costs and eBay figures land)' : '') : (yProv ? 'no final score yet, we check again as costs and eBay figures land' : 'nothing scored yet');
    }
    return cap + '<div class="rt-counts">' +
      plain('Stop', String(counts.STOP || 0), esc(conf('STOP')) + ' · this morning\'s call, scored tomorrow', 'd-stop') +
      plain('Reduce', String(counts.REDUCE || 0), esc(conf('REDUCE')), 'd-reduce') +
      plain('Push', String(counts.PUSH || 0), esc(conf('PUSH')), 'd-push') +
      plain('Keep', String(counts.KEEP || 0), 'left alone', 'd-keep') +
      plain('Yesterday\'s score · all accounts', yTile, ySub, 'd-score') +
      '</div>';
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
    best += MD && (MD.decision || MD.action || MD.why) ? '<div class="rt-sm" style="margin-top:6px"><span class="rt-dec ' + esc(decLabel) + '">' + esc(decLabel || 'decision') + '</span> ' + (MD.action ? '<b>' + esc(String(MD.action)) + '</b> · ' : '') + esc(String(MD.why || '')) + (MD.batch ? ' <span class="adt-pf-p">· ' + esc(String(MD.batch) === 'boundary' ? 'evening' : String(MD.batch)) + ' run</span>' : '') + '</div>' : '<div class="rt-sm" style="margin-top:6px">no morning decision</div>';
    return '<tr class="' + esc(v) + '"><td>' + adtVerdictPill(v) + '<div style="margin-top:6px">' + adtProductCell(r) + '</div></td>' +
      '<td>' + why + '</td>' +
      '<td>' + weekdayBars(hist) + '</td>' +
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

  /* (a) the last four same weekdays, at a size that can be read. Each bar is the listing's OWN profit
     on that weekday — gold earned, #e0563f lost, faint when not every order is costed — and every bar
     carries its figure, so the four add up to the profit the Why column states. chartBars draws at
     980 units wide and would shrink its labels past reading inside a table cell, so this is the same
     idea, with the same value pills, at a cell's size. */
  function weekdayBars(hist) {
    var rows = hist.slice(-4);
    if (!rows.length) return '<div class="rt-sm">no same-weekday history</div>';
    var W = 300, H = 200, L = 8, R = 8, T = 14, B = 34, mx = 1;
    rows.forEach(function (r) { mx = Math.max(mx, Math.abs(num(r.actual_profit) || 0)); });
    var anyNeg = rows.some(function (r) { return (num(r.actual_profit) || 0) < 0; });
    var base = H - B, zero = anyNeg ? (T + base) / 2 : base;
    /* every bar is labelled, so a bar may only climb as far as leaves its own pill room */
    var scale = Math.max(10, (zero - T) - 18) / mx, bw = (W - L - R) / rows.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:300px;max-width:100%;height:auto;display:block" role="img">';
    s += '<line x1="' + L + '" y1="' + zero.toFixed(1) + '" x2="' + (W - R) + '" y2="' + zero.toFixed(1) + '" stroke="rgba(255,255,255,.14)" stroke-width="1"/>';
    var dots = [];
    rows.forEach(function (r, i) {
      var v = num(r.actual_profit), unp = isUnpriced(r), uc = unpricedCount(r), noRow = r.has_row === false, hgt = Math.max(2, Math.abs(v || 0) * scale);
      if (noRow) v = null;
      var x = L + i * bw + bw * 0.18, w = Math.max(3, bw * 0.64), y = (v || 0) >= 0 ? zero - hgt : zero;
      var fill = v == null ? 'rgba(255,255,255,.12)' : (v < 0 ? LOSS : 'var(--gold-b)');
      var title = (r.day || '') + ' (' + wdOfDay(r.day) + ') · ' + (noRow ? 'no ads or orders' : 'spend ' + gbp(r.spend) + ' · ' + cnt(r.attr_units) + ' units from ads · profit ' + (v == null ? '—' : gbp(v)) + (unp ? ' · ' + (uc != null && uc > 0 ? uc + ' order' + (uc === 1 ? '' : 's') + ' not costed' : 'not fully costed') : ''));
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="3" fill="' + fill + '"' + (unp ? ' opacity=".55"' : '') + '><title>' + esc(title) + '</title></rect>';
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="#66707c">' + esc(String(r.day || '').slice(5)) + '</text>';
      dots.push({ x: x + w / 2, y: ((v || 0) >= 0 ? y : zero + hgt) + ((v || 0) >= 0 ? -11 : 12), label: v == null ? '—' : chartMoney(v) + (unp ? '*' : ''), title: title });
    });
    s += chartValueDots(dots, { color: 'var(--gold-a)', ink: '#1c1200', fontSize: 10, minGap: 0 });
    s += '</svg>';
    var anyUnp = rows.some(isUnpriced);
    return s + (anyUnp ? '<div class="rt-sm">* not every order costed yet</div>' : '');
  }
})();
