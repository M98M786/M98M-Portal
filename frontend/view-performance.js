/* §12 STAFF PERFORMANCE — both layers.
 * 'perf'  §12.1 the caller's own numbers, trend arrows, positive-only badges (§25.7).
 * 'team'  §12.1 the grid of everyone + §12.2 Zaid's monthly rubric, 18 columns.
 * Backend: myPerformance · teamPerformance · evaluations · saveEvaluation · assignableStaff.
 * Every metric name, rubric label and dropdown value is rendered FROM the payload — this file
 * hardcodes no vocabulary, no staff name and no account name (the built page is public). */
(function () {

  var TEAM_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Sales Operations'];   // §12.1 "Mgmt+TL"; §4.4 adds Ops Head; Sales Ops watches
  /* §4.3 grants the manual evaluation to Management and Team Lead, and §4.4 is explicit that the
   * Front Head of Operations does NOT get it — so the rubric card is narrower than the view.
   * This is presentation only: actionSaveEvaluation_ / actionEvaluations_ refuse it server-side. */
  var EVAL_ROLES = ['Management', 'Team Lead'];

  /* §12.1 names four things before the role counters: tasks completed vs deadline, avg time-taken
   * and report compliance %. tasks_completed anchors them — a ratio with no count behind it tells
   * a person nothing. The rest of metric_keys is what the server decided this person's role (or
   * their actual non-zero work) earns, so it is never filtered again here. */
  var HEADLINE = ['tasks_completed', 'on_time_pct', 'avg_time_taken_min', 'report_compliance_pct'];
  var CONTEXT = ['tasks_on_time', 'tasks_late'];

  /* The compare period is the one directly before (the server pairs today↔yesterday and this
   * week↔last week). The payload carries the compare period's KEY, not its label. */
  var COMPARE_LABEL = { day: 'yesterday', week: 'last week' };

  /* Plain English for the server's `notes` — context that explains a low number rather than
   * leaving it mysterious (§8.0b: nothing counts until it is approved). */
  var NOTE_LABEL = {
    tasks_awaiting_approval: 'Submitted, waiting for approval',
    reports_expected: 'Checkpoints due',
    reports_ontime: 'Filed on time',
    reports_late: 'Filed late',
    reports_missed: 'Not filed',
    reports_filed_pct: 'Filed at all',
    hunts_decided: 'Hunts decided',
    hunts_pending: 'Hunts awaiting a decision',
    campaign_lag_measured: 'Campaigns with a measured lag'
  };

  var UP_SVG = '<svg viewBox="0 0 24 24"><path d="M12 19V6"/><path d="m6 12 6-6 6 6"/></svg>';
  var DOWN_SVG = '<svg viewBox="0 0 24 24"><path d="M12 5v13"/><path d="m6 12 6 6 6-6"/></svg>';
  var MEDAL_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="M8.5 9.5 6 2h12l-2.5 7.5"/></svg>';

  /* `.g-4` and `.kpi` are named in the design system but carry no definition in index.html, and
   * VIEW_CSS is one shared stylesheet — defining them globally here would silently redress any
   * other screen that later ships its own version. These are namespaced instead. */
  VIEW_CSS.push(
    '.pf-tiles{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(178px,1fr))}' +
    '.pf-kpi{background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--gold-line);border-radius:var(--radius);padding:14px 16px;transition:border-color .2s,box-shadow .2s}' +
    '.pf-kpi:hover{border-color:var(--gold-line-hi);box-shadow:var(--glow-gold)}' +
    '.pf-kpi .lbl{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);line-height:1.35}' +
    '.pf-kpi .val{font-size:27px;font-weight:800;line-height:1.1;margin-top:7px;letter-spacing:-.01em}' +
    '.pf-kpi .val.empty{font-size:19px;color:var(--text-3);font-weight:700}' +
    '.pf-trend{display:flex;align-items:center;gap:5px;margin-top:8px;font-size:11.5px;font-weight:700;color:var(--text-3);min-height:17px}' +
    '.pf-trend svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.pf-trend.good{color:var(--gold-a)}' +
    '.pf-seg{display:inline-flex;border:1px solid var(--gold-line);border-radius:10px;overflow:hidden}' +
    '.pf-seg button{padding:8px 16px;font-size:12.5px;font-weight:800;color:var(--text-3);transition:all .15s}' +
    '.pf-seg button+button{border-left:1px solid var(--gold-line)}' +
    '.pf-seg button:hover{color:var(--blue-2);background:var(--blue-soft)}' +
    '.pf-seg button.on{color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 55%,var(--gold-c))}' +
    '.pf-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
    '.pf-badges{display:flex;flex-wrap:wrap;gap:9px}' +
    '.pf-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:99px;font-size:12px;font-weight:800;color:var(--gold-a);background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.04));border:1px solid var(--gold-line-hi)}' +
    '.pf-badge svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.pf-note{color:var(--text-3);font-weight:600;font-size:12.5px}' +
    '.pf-err{color:var(--bad);font-weight:700;font-size:12.5px;min-height:17px;margin-top:10px}' +
    '.pf-ok{color:var(--ok);font-weight:700;font-size:12.5px}' +
    '.pf-chips{display:flex;flex-wrap:wrap;gap:8px}' +
    '.pf-chip{padding:5px 12px;border-radius:99px;border:1px solid var(--gold-line);font-size:11.5px;font-weight:800;color:var(--text-3);white-space:nowrap;transition:all .15s}' +
    '.pf-chip:hover{border-color:var(--blue);color:var(--blue-2)}' +
    '.pf-chip.on{color:var(--gold-a);border-color:var(--gold-line-hi);background:linear-gradient(135deg,rgba(233,169,60,.16),rgba(233,169,60,.03))}' +
    '.pf-stat{display:inline-flex;align-items:baseline;gap:7px;border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font-size:11.5px;font-weight:700;color:var(--text-2);white-space:nowrap}' +
    '.pf-stat b{font-weight:800;color:var(--gold-a)}' +
    '.pf-src{font-size:11.5px;font-weight:600;color:var(--text-3);padding:7px 0;border-top:1px solid var(--gold-line)}' +
    '.pf-src b{color:var(--text-2);font-weight:800}' +
    '.pf-src:first-child{border-top:0}' +
    /* the team grid */
    '.pf-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:560px}' +
    '.pf-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:9px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.pf-tbl th.s{cursor:pointer;transition:color .15s}' +
    '.pf-tbl th.s:hover{color:var(--blue-2)}' +
    '.pf-tbl th.on{color:var(--gold-a)}' +
    '.pf-tbl th.n,.pf-tbl td.n{text-align:right}' +
    '.pf-tbl td{padding:10px 11px;border-bottom:1px solid var(--gold-line);vertical-align:middle;white-space:nowrap}' +
    '.pf-tbl tr:last-child td{border-bottom:0}' +
    '.pf-tbl tbody tr{transition:background .12s}' +
    '.pf-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.pf-who{font-weight:700}' +
    '.pf-who span{display:block;font-size:11px;color:var(--text-3);font-weight:600}' +
    '.pf-cell{display:inline-flex;align-items:center;gap:5px;justify-content:flex-end}' +
    '.pf-cell svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;color:var(--text-3);flex:none}' +
    '.pf-cell.good svg{color:var(--gold-a)}' +
    '.pf-dim{color:var(--text-3)}' +
    '.pf-wait{display:inline-block;margin-top:3px;padding:1px 9px;border-radius:99px;font-size:10.5px;font-weight:800;background:var(--blue-soft);color:var(--blue-2)}' +
    /* the rubric */
    '.pf-form{display:grid;gap:13px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}' +
    '.pf-form .field{margin-top:0}' +
    '.pf-form .field.wide{grid-column:1/-1}' +
    '.pf-form textarea{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;resize:vertical;min-height:70px}' +
    '.pf-form textarea:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.pf-hint{font-size:11px;font-weight:600;color:var(--text-3);margin-top:5px;line-height:1.4}' +
    '.pf-rec{border-top:1px solid var(--gold-line);padding:11px 0}' +
    '.pf-rec:first-child{border-top:0}' +
    '.pf-rec-hd{display:flex;align-items:center;gap:9px;flex-wrap:wrap}' +
    '.pf-kv{display:grid;gap:6px 16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:10px}' +
    '.pf-kv div{font-size:12.5px;font-weight:600;color:var(--text-2)}' +
    '.pf-kv b{color:var(--text-3);font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;display:block}' +
    '.pf-box{border:1px solid var(--gold-line-hi);border-radius:10px;padding:12px 14px;font-size:12.5px;font-weight:600;color:var(--text-2);line-height:1.5}' +
    '.pf-box .k{display:block;font-weight:800;color:var(--gold-a);margin-bottom:4px}' +
    '.pf-box.blue{border-color:rgba(61,155,240,.35);background:var(--blue-soft)}' +
    '.pf-box.blue .k{color:var(--blue-2)}'
  );

  /* esc() escapes text nodes but leaves quotes intact, so attribute values need this too (RL-3). */
  function escAttr(v) { return esc(v).replace(/"/g, '&quot;'); }
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  /* The server matches names with exactly this normalisation, so the two layers agree about
   * which sheet row belongs to which staff member. */
  function norm(v) { return str(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^ | $/g, ''); }

  /* Staff-facing dates are PKT whatever timezone the device is set to (§12, §5). */
  function pktToday() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var o = {}, i;
      for (i = 0; i < parts.length; i++) { o[parts[i].type] = parts[i].value; }
      if (o.year && o.month && o.day) { return o.year + '-' + o.month + '-' + o.day; }
    } catch (e) {}
    return new Date().toISOString().slice(0, 10);
  }
  function lastDayOf(ym) {
    var p = str(ym).split('-');
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]), 0));
    return isNaN(d.getTime()) ? '' : ym + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  function monthLabel(ym) {
    var p = str(ym).split('-');
    if (p.length < 2) { return str(ym); }
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, 1));
    if (isNaN(d.getTime())) { return str(ym); }
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function dayLabel(ymd) {
    var p = str(ymd).split('-');
    if (p.length !== 3) { return str(ymd); }
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    if (isNaN(d.getTime())) { return str(ymd); }
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  /* ---------- formatting the numbers ---------- */

  function fmtValue(unit, value) {
    var n = num(value);
    if (n === null || str(value) === '') { return ''; }
    if (unit === 'percent') { return (Math.round(n * 10) / 10).toFixed(1) + '%'; }
    if (unit === 'minutes') {
      var m = Math.round(n);
      if (m < 60) { return m + ' min'; }
      var h = Math.floor(m / 60), r = m % 60;
      return h + 'h' + (r ? ' ' + r + 'm' : '');
    }
    if (unit === 'hours') { return (Math.round(n * 100) / 100).toFixed(2) + ' h'; }
    return String(Math.round(n * 100) / 100);
  }
  /* The size of a move, never its sign — the arrow carries the direction. */
  function fmtDelta(unit, delta) {
    var n = num(delta);
    if (n === null) { return ''; }
    return fmtValue(unit, Math.abs(n));
  }
  function isGood(m) { return !!(m && m.dir && m.dir !== 'flat' && m.dir === m.better); }

  function trendHtml(m, compareLabel) {
    if (!m) { return '<div class="pf-trend"></div>'; }
    var d = num(m.delta);
    if (d === null || d === 0) {
      var same = (num(m.prev) === null) ? 'first look at this one' : 'same as ' + compareLabel;
      return '<div class="pf-trend">' + esc(same) + '</div>';
    }
    var good = isGood(m);
    var arrow = m.dir === 'up' ? UP_SVG : DOWN_SVG;
    /* Never punitive (§25.7): a move the wrong way is stated plainly in the muted colour and is
     * never painted red. Gold is reserved for the move that is genuinely good news. */
    return '<div class="pf-trend' + (good ? ' good' : '') + '">' + arrow +
      '<span>' + esc(fmtDelta(m.unit, d) + ' vs ' + compareLabel) + '</span></div>';
  }

  /* ---------- VIEW: my performance (§12.1, staff see only their own) ---------- */

  var MY = null;          // both periods arrive in one payload, so the toggle costs no round trip
  var MY_KIND = 'day';
  var MY_SRC = false;

  function myTiles(p) {
    var mets = p.metrics || {}, cmp = COMPARE_LABEL[MY_KIND] || 'the period before', h = '', i, m;
    for (i = 0; i < HEADLINE.length; i++) {
      m = mets[HEADLINE[i]];
      if (!m) { continue; }
      var v = fmtValue(m.unit, m.value);
      h += '<div class="pf-kpi" title="' + escAttr(m.label + ' — ' + m.source) + '">' +
        '<div class="lbl">' + esc(m.label) + '</div>' +
        (v ? '<div class="val num goldtext">' + esc(v) + '</div>'
           : '<div class="val empty">nothing yet</div>') +
        trendHtml(m, cmp) + '</div>';
    }
    return h ? '<div class="pf-tiles">' + h + '</div>' : '<div class="pf-note">No headline figures for this period yet.</div>';
  }

  function myCounters(p) {
    var mets = p.metrics || {}, keys = p.metric_keys || [], cmp = COMPARE_LABEL[MY_KIND] || 'the period before';
    var h = '', i, k, m;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (HEADLINE.indexOf(k) >= 0 || CONTEXT.indexOf(k) >= 0) { continue; }
      m = mets[k];
      if (!m) { continue; }
      var v = fmtValue(m.unit, m.value);
      h += '<div class="pf-kpi" title="' + escAttr(m.label + ' — ' + m.source) + '">' +
        '<div class="lbl">' + esc(m.label) + '</div>' +
        (v ? '<div class="val num">' + esc(v) + '</div>' : '<div class="val empty">nothing yet</div>') +
        trendHtml(m, cmp) + '</div>';
    }
    if (!h) {
      return '<div class="pf-note">Your role’s counters appear here as soon as there is something to count.</div>';
    }
    return '<div class="pf-tiles">' + h + '</div>';
  }

  function myContext(p) {
    var mets = p.metrics || {}, notes = p.notes || {}, bits = [], i, m, k, v;
    for (i = 0; i < CONTEXT.length; i++) {
      m = mets[CONTEXT[i]];
      if (!m) { continue; }
      v = fmtValue(m.unit, m.value);
      bits.push('<span class="pf-stat">' + esc(m.label) + ' <b class="num">' + esc(v || '0') + '</b></span>');
    }
    for (k in notes) {
      if (!Object.prototype.hasOwnProperty.call(notes, k)) { continue; }
      if (!NOTE_LABEL[k]) { continue; }
      v = fmtValue(/_pct$/.test(k) ? 'percent' : 'count', notes[k]);
      if (!v) { continue; }
      bits.push('<span class="pf-stat">' + esc(NOTE_LABEL[k]) + ' <b class="num">' + esc(v) + '</b></span>');
    }
    if (!bits.length) { return '<div class="pf-note">Nothing to add yet.</div>'; }
    return '<div class="pf-chips">' + bits.join('') + '</div>' +
      '<div class="pf-hint" style="margin-top:11px">A task counts once it has been approved, so anything still waiting on an approver sits above rather than in the figures.</div>';
  }

  /* §25.7 positive-only badges: awarded, never deducted, and never a comparison with anyone else. */
  function myBadges(p) {
    var mets = p.metrics || {}, notes = p.notes || {}, out = [], i, m;
    var comp = mets.report_compliance_pct, onTime = mets.on_time_pct, done = mets.tasks_completed;
    var expected = num(notes.reports_expected), missed = num(notes.reports_missed);

    if (comp && num(comp.value) === 100 && expected) { out.push('Every report in, on time'); }
    else if (expected && missed === 0) { out.push('Nothing missed'); }
    if (onTime && num(onTime.value) === 100 && done && num(done.value) > 0) {
      out.push('Every task inside its deadline');
    }
    var keys = p.metric_keys || [];
    for (i = 0; i < keys.length && out.length < 5; i++) {
      m = mets[keys[i]];
      if (isGood(m)) { out.push('Moving the right way: ' + m.label); }
    }
    if (!out.length) { return ''; }
    var h = '<div class="pf-badges">';
    for (i = 0; i < out.length && i < 5; i++) {
      h += '<span class="pf-badge">' + MEDAL_SVG + esc(out[i]) + '</span>';
    }
    return h + '</div>';
  }

  function mySources(p) {
    var mets = p.metrics || {}, keys = p.metric_keys || [], h = '', i, m;
    for (i = 0; i < keys.length; i++) {
      m = mets[keys[i]];
      if (!m) { continue; }
      h += '<div class="pf-src"><b>' + esc(m.label) + '</b> — ' + esc(m.source) + '</div>';
    }
    return h || '<div class="pf-note">Nothing counted for this period.</div>';
  }

  function myPaint() {
    var host = $('pfBody');
    if (!host || !MY) { return; }
    var person = MY.person || {};
    var p = (person.periods || {})[MY_KIND] || {};

    var sub = $('pfSub');
    if (sub) {
      sub.innerHTML = esc(person.role || STATE.user.role) + ' · ' +
        esc(p.label || MY_KIND) + (p.from ? ' · ' + esc(dayLabel(p.from)) : '');
    }
    var stamp = $('pfStamp');
    if (stamp) {
      stamp.textContent = MY.computed_at
        ? ('Updated ' + fmtPkt(MY.computed_at, true) + (MY.stale ? ' · refreshing shortly' : ''))
        : 'Not computed yet';
    }
    var segs = document.querySelectorAll('#pfSeg button'), i;
    for (i = 0; i < segs.length; i++) {
      segs[i].classList.toggle('on', segs[i].getAttribute('data-kind') === MY_KIND);
    }

    if (!p.has_data) {
      host.innerHTML = '<div class="card enter d2"><div class="bd">' +
        '<div class="pf-box"><span class="k">Nothing counted for ' + esc(p.label || MY_KIND) + ' yet</span>' +
        'Your figures fill in as tasks are approved, reports are filed and your role’s work is recorded. ' +
        'These numbers are yours alone — nobody else’s appear on this screen.</div></div></div>';
      return;
    }

    var badges = myBadges(p);
    host.innerHTML =
      (badges ? '<div class="card enter d2"><div class="hd">Well done ' +
        '<span class="hint">' + esc(p.label || MY_KIND) + '</span></div><div class="bd">' + badges + '</div></div>' : '') +
      '<div style="margin-top:' + (badges ? '16px' : '0') + '">' + myTiles(p) + '</div>' +
      '<div class="card enter d3" style="margin-top:16px"><div class="hd">Your counters ' +
        '<span class="hint">for your role</span></div><div class="bd">' + myCounters(p) + '</div></div>' +
      '<div class="grid g-2" style="margin-top:16px">' +
        '<div class="card enter d3"><div class="hd">Behind the numbers</div>' +
          '<div class="bd">' + myContext(p) + '</div></div>' +
        '<div class="card enter d3"><div class="hd">How each one is counted ' +
          '<button class="minibtn" id="pfSrcBtn" style="margin-left:auto">' + (MY_SRC ? 'Hide' : 'Show') + '</button></div>' +
          '<div class="bd"' + (MY_SRC ? '' : ' hidden') + ' id="pfSrc">' + mySources(p) + '</div></div>' +
      '</div>';

    var btn = $('pfSrcBtn');
    if (btn) {
      btn.onclick = function () {
        MY_SRC = !MY_SRC;
        var box = $('pfSrc');
        if (box) { box.classList.toggle('hidden', !MY_SRC); }
        btn.textContent = MY_SRC ? 'Hide' : 'Show';
      };
    }
  }

  function myLoad() {
    var mc = cachedCall('myPerformance', {}, function (d) {
      MY = d || {};
      myPaint();
    });
    return mc.done.catch(function (e) {
      if (mc.painted) { return; }
      var host = $('pfBody');
      if (!host) { return; }
      host.innerHTML = '<div class="card enter d2"><div class="bd pf-note">' +
        esc(e.message === 'auth' ? 'Your sign-in expired — please sign in again.'
          : 'Your figures could not be loaded just now. Nothing is wrong with your work — please try again.') +
        '</div></div>';
    });
  }

  VIEWS.perf = {
    label: 'My performance',
    icon: '<path d="M3 20h18"/><path d="M6 20v-6"/><path d="M11 20V8"/><path d="M16 20v-9"/><path d="M21 20V5"/>',
    roles: '*',
    order: 55,
    render: function () {
      return '<div class="hgroup enter d1"><h1>My <span class="goldtext">performance</span></h1>' +
        '<span class="sub" id="pfSub">Your own numbers</span></div>' +
        '<div class="card enter d1"><div class="bd">' +
          '<div class="pf-bar">' +
            '<span class="pf-seg" id="pfSeg">' +
              '<button data-kind="day" class="on">Today</button>' +
              '<button data-kind="week">This week</button>' +
            '</span>' +
            '<span class="pf-note" style="margin-left:auto" id="pfStamp">Loading…</span>' +
          '</div>' +
          '<div class="pf-hint" style="margin-top:10px">Only your own figures appear here — the portal keeps no public leaderboard.</div>' +
        '</div></div>' +
        '<div id="pfBody" style="margin-top:16px"><div class="card"><div class="bd"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
      MY = null; MY_KIND = 'day'; MY_SRC = false;
      var segs = document.querySelectorAll('#pfSeg button'), i;
      for (i = 0; i < segs.length; i++) {
        segs[i].onclick = (function (el) {
          return function () { MY_KIND = el.getAttribute('data-kind'); myPaint(); };
        }(segs[i]));
      }
      myLoad();
    }
  };

  /* ---------- VIEW: team performance (§12.1 grid + §12.2 rubric) ---------- */

  var TEAM = { day: null, week: null };
  var TEAM_KIND = 'day';
  var TEAM_SCOPE = 'all';                 // which column group is on screen; 'all' = the shared ones
  var SORT = { key: 'name', dir: 'asc' };
  var EVAL = null;                        // last `evaluations` payload for the picked month
  var EVAL_STAFF = [];                    // assignableStaff — never a hardcoded roster
  var EVAL_MONTH = '';
  var EVAL_BUSY = false;

  function mayEvaluate() { return EVAL_ROLES.indexOf(str(STATE.user && STATE.user.role)) >= 0; }
  function mayRefresh() { return str(STATE.user && STATE.user.role) === 'Management'; }

  /* Column groups come from each metric's own `scope` (a role department), so this list grows
   * with the catalogue instead of being restated here. */
  function scopeList(columns) {
    var out = [], i, s;
    for (i = 0; i < (columns || []).length; i++) {
      s = str(columns[i].scope);
      if (s && s !== 'all' && out.indexOf(s) < 0) { out.push(s); }
    }
    return out;
  }
  function visibleColumns(columns) {
    var out = [], i;
    for (i = 0; i < (columns || []).length; i++) {
      if (TEAM_SCOPE === 'everything') { out.push(columns[i]); }
      else if (str(columns[i].scope) === TEAM_SCOPE) { out.push(columns[i]); }
    }
    return out;
  }

  /* The server sorts by exactly this rule; mirroring it here means a header click re-orders rows
   * that are already in the browser instead of paying another 2.5-second round trip. */
  function sortRows(rows, columns) {
    var isMetric = false, i;
    for (i = 0; i < (columns || []).length; i++) {
      if (columns[i].key === SORT.key) { isMetric = true; break; }
    }
    var desc = SORT.dir === 'desc';
    rows.sort(function (x, y) {
      var a, b, c;
      if (isMetric) {
        a = x.metrics && x.metrics[SORT.key] ? num(x.metrics[SORT.key].value) : null;
        b = y.metrics && y.metrics[SORT.key] ? num(y.metrics[SORT.key].value) : null;
        if (a === null && b === null) { return cmpText(x.name, y.name); }
        if (a === null) { return 1; }            // "no number" sinks in both directions
        if (b === null) { return -1; }
        if (a !== b) { return desc ? b - a : a - b; }
        return cmpText(x.name, y.name);
      }
      c = cmpText(x[SORT.key], y[SORT.key]);
      return desc ? -c : c;
    });
    return rows;
  }
  function cmpText(a, b) {
    var x = str(a).toLowerCase(), y = str(b).toLowerCase();
    return x < y ? -1 : (x > y ? 1 : 0);
  }

  function gridHtml(d) {
    var rows = (d.rows || []).slice(), cols = visibleColumns(d.columns), i, j;
    if (!rows.length) {
      return '<div class="pf-note">No approved staff to report on yet.</div>';
    }
    sortRows(rows, d.columns);

    var head = '<th class="s' + (SORT.key === 'name' ? ' on' : '') + '" data-sort="name">Person' + arrowFor('name') + '</th>' +
      '<th class="s' + (SORT.key === 'role' ? ' on' : '') + '" data-sort="role">Role' + arrowFor('role') + '</th>';
    for (i = 0; i < cols.length; i++) {
      head += '<th class="s n' + (SORT.key === cols[i].key ? ' on' : '') + '" data-sort="' + escAttr(cols[i].key) + '"' +
        ' title="' + escAttr(cols[i].label + ' — ' + cols[i].source) + '">' +
        esc(cols[i].label) + arrowFor(cols[i].key) + '</th>';
    }

    var body = '';
    for (i = 0; i < rows.length; i++) {
      var r = rows[i], waiting = num((r.notes || {}).tasks_awaiting_approval);
      body += '<tr><td><div class="pf-who">' + esc(r.name || r.email) +
        '<span>' + esc(r.department || '') + '</span>' +
        (waiting ? '<span class="pf-wait">' + esc(waiting + ' awaiting approval') + '</span>' : '') +
        '</div></td><td><span class="pill role">' + esc(r.role || '') + '</span></td>';
      for (j = 0; j < cols.length; j++) {
        body += '<td class="n">' + cellHtml((r.metrics || {})[cols[j].key]) + '</td>';
      }
      body += '</tr>';
    }
    return '<div class="scroll"><table class="pf-tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function arrowFor(key) {
    if (SORT.key !== key) { return ''; }
    return ' ' + (SORT.dir === 'desc' ? '▼' : '▲');
  }

  function cellHtml(m) {
    if (!m) { return '<span class="pf-dim">—</span>'; }
    var v = fmtValue(m.unit, m.value);
    if (!v) { return '<span class="pf-dim">—</span>'; }
    var d = num(m.delta), arrow = '', good = isGood(m);
    if (d !== null && d !== 0) { arrow = (m.dir === 'up' ? UP_SVG : DOWN_SVG); }
    var title = m.label + ': ' + v +
      (d !== null && d !== 0 ? ' · ' + fmtDelta(m.unit, d) + ' vs the period before' : '');
    return '<span class="pf-cell' + (good ? ' good' : '') + '" title="' + escAttr(title) + '">' +
      '<span class="num">' + esc(v) + '</span>' + arrow + '</span>';
  }

  function teamPaint() {
    var d = TEAM[TEAM_KIND];
    var host = $('pfTeamGrid');
    if (!host) { return; }
    if (!d) { host.innerHTML = '<div class="spinner"></div>'; return; }

    var chips = $('pfScopes');
    if (chips) {
      var list = scopeList(d.columns), h = '<button class="pf-chip' + (TEAM_SCOPE === 'all' ? ' on' : '') + '" data-scope="all">Everyone’s</button>', i;
      for (i = 0; i < list.length; i++) {
        h += '<button class="pf-chip' + (TEAM_SCOPE === list[i] ? ' on' : '') + '" data-scope="' + escAttr(list[i]) + '">' + esc(list[i]) + '</button>';
      }
      h += '<button class="pf-chip' + (TEAM_SCOPE === 'everything' ? ' on' : '') + '" data-scope="everything">Everything</button>';
      chips.innerHTML = h;
      chips.onclick = function (ev) {
        var t = ev.target;
        if (!t || !t.getAttribute) { return; }
        var s = t.getAttribute('data-scope');
        if (!s) { return; }
        TEAM_SCOPE = s;
        teamPaint();
      };
    }
    var stamp = $('pfTeamStamp');
    if (stamp) {
      stamp.textContent = d.computed_at
        ? ('Updated ' + fmtPkt(d.computed_at, true) + (d.stale ? ' · refreshing shortly' : ''))
        : 'Not computed yet';
    }
    var segs = document.querySelectorAll('#pfTeamSeg button'), k;
    for (k = 0; k < segs.length; k++) {
      segs[k].classList.toggle('on', segs[k].getAttribute('data-kind') === TEAM_KIND);
    }

    host.innerHTML = gridHtml(d);
    var table = host.querySelector('.pf-tbl');
    if (table) {
      table.onclick = function (ev) {
        var t = ev.target;
        while (t && t !== table && !(t.getAttribute && t.getAttribute('data-sort'))) { t = t.parentNode; }
        if (!t || t === table) { return; }
        var key = t.getAttribute('data-sort');
        if (SORT.key === key) { SORT.dir = SORT.dir === 'desc' ? 'asc' : 'desc'; }
        else {
          SORT.key = key;
          /* A leaderboard opens on its biggest number; a name column opens A→Z. */
          SORT.dir = (key === 'name' || key === 'role') ? 'asc' : 'desc';
        }
        teamPaint();
      };
    }
  }

  /* Both periods in one round trip: the batch runs them back to back on a cache the first call
   * has already made fresh, so the toggle afterwards costs nothing (§13.4). */
  function teamLoad(force) {
    var host = $('pfTeamGrid');
    var tc = cachedCall('teamPerformance', force ? { period: TEAM_KIND, refresh: true } : { period: TEAM_KIND },
      function (d) { TEAM[TEAM_KIND] = d || null; teamPaint(); });
    if (!tc.painted && host) { host.innerHTML = '<div class="spinner"></div>'; }
    var other = TEAM_KIND === 'day' ? 'week' : 'day';
    var b = api('teamPerformance', { period: other });
    tc.done.catch(function (e) {
      if (tc.painted || !$('pfTeamGrid')) { return; }
      setHTML('pfTeamGrid', '<div class="pf-note">' +
        esc(e.message === 'auth' ? 'Your sign-in expired — please sign in again.'
          : 'The grid could not be loaded. Please try again.') + '</div>');
    });
    b.then(function (d) { TEAM[other] = d || null; if (typeof cacheWrite === 'function') { cacheWrite('teamPerformance', { period: other }, d); } }).catch(function () {});
    return tc.done;
  }

  /* ---------- §12.2 the rubric ---------- */

  function evalColumns() { return (EVAL && EVAL.columns) || []; }

  function evalStaffOptions(selected) {
    var h = '<option value="">Choose a staff member…</option>', i, s;
    for (i = 0; i < EVAL_STAFF.length; i++) {
      s = EVAL_STAFF[i];
      h += '<option value="' + escAttr(s.email) + '"' + (str(selected) === str(s.email) ? ' selected' : '') + '>' +
        esc(s.name + ' · ' + s.role) + '</option>';
    }
    return h;
  }

  function pickedStaff() {
    var el = $('pfEvStaff');
    if (!el || !el.value) { return null; }
    var i;
    for (i = 0; i < EVAL_STAFF.length; i++) {
      if (str(EVAL_STAFF[i].email) === str(el.value)) { return EVAL_STAFF[i]; }
    }
    return null;
  }

  /* Only a portal row can be replaced: the month tab carries no key column, so the server refuses
   * to re-find a mirrored row and asks for that one to be corrected by hand. */
  function existingFor(staff) {
    if (!staff || !EVAL) { return null; }
    var rows = EVAL.rows || [], i;
    for (i = 0; i < rows.length; i++) {
      if (str(rows[i].source) !== 'portal') { continue; }
      if (norm(rows[i].staff_name) === norm(staff.name)) { return rows[i]; }
    }
    return null;
  }

  function fieldHtml(c, value) {
    var id = 'pfEv_' + c.key, v = str(value), i, hit = false, h;
    var wide = (c.key === 'comments' || c.key === 'idea_generation' || c.key === 'late_reason');
    h = '<div class="field' + (wide ? ' wide' : '') + '"><label>' + esc(c.label) + '</label>';

    if (c.strict && (c.options || []).length) {
      h += '<select id="' + id + '"><option value="">—</option>';
      for (i = 0; i < c.options.length; i++) {
        hit = str(c.options[i]) === v;
        h += '<option value="' + escAttr(c.options[i]) + '"' + (hit ? ' selected' : '') + '>' + esc(c.options[i]) + '</option>';
      }
      h += '</select>';
    } else if ((c.options || []).length) {
      h += '<input id="' + id + '" list="' + id + '_l" type="text" autocomplete="off" value="' + escAttr(v) + '">' +
        '<datalist id="' + id + '_l">';
      for (i = 0; i < c.options.length; i++) {
        h += '<option value="' + escAttr(c.options[i]) + '"></option>';
      }
      h += '</datalist>';
    } else if (wide) {
      h += '<textarea id="' + id + '">' + esc(v) + '</textarea>';
    } else {
      h += '<input id="' + id + '" type="text" autocomplete="off" value="' + escAttr(v) + '">';
    }
    if (c.note) { h += '<div class="pf-hint">' + esc(c.note) + '</div>'; }
    return h + '</div>';
  }

  function evalFormHtml() {
    var cols = evalColumns();
    if (!cols.length) { return '<div class="spinner"></div>'; }
    var staff = pickedStaff(), prior = existingFor(staff), i, c, h = '';

    for (i = 0; i < cols.length; i++) {
      c = cols[i];
      if (c.key === 'staff_name') {
        h += '<div class="field"><label>' + esc(c.label) + '</label>' +
          '<select id="pfEvStaff">' + evalStaffOptions(staff ? staff.email : '') + '</select>' +
          '<div class="pf-hint">One staff member at a time. The list is the approved roster.</div></div>';
        continue;
      }
      if (c.key === 'date') {
        var dv = prior ? str(prior.date) : defaultEvalDate();
        h += '<div class="field"><label>' + esc(c.label) + '</label>' +
          '<input type="date" id="pfEv_date" value="' + escAttr(dv) + '">' +
          '<div class="pf-hint">The date decides which month tab this row mirrors to.</div></div>';
        continue;
      }
      h += fieldHtml(c, prior ? prior[c.key] : '');
    }

    return '<div class="pf-form">' + h + '</div>' +
      (prior ? '<div class="pf-box blue" style="margin-top:14px"><span class="k">' +
        esc(str(prior.staff_name) + ' already has an evaluation for ' + monthLabel(EVAL_MONTH)) + '</span>' +
        'Saving updates that record in place — nothing is deleted. The row already written into the workbook has no key column, so the server will ask for that copy to be corrected by hand.</div>' : '') +
      '<div class="pf-err" id="pfEvErr"></div>' +
      '<div class="pf-bar" style="margin-top:6px">' +
        '<button class="btn-gold" id="pfEvSave">' + (prior ? 'Update evaluation' : 'Save evaluation') + '</button>' +
        '<span class="pf-note" id="pfEvMirror"></span>' +
      '</div>';
  }

  function defaultEvalDate() {
    var today = pktToday();
    if (EVAL_MONTH && today.slice(0, 7) === EVAL_MONTH) { return today; }
    return EVAL_MONTH ? lastDayOf(EVAL_MONTH) : today;
  }

  function evalPaintForm() {
    var host = $('pfEvForm');
    if (!host) { return; }
    host.innerHTML = evalFormHtml();
    var sel = $('pfEvStaff');
    if (sel) { sel.onchange = function () { evalPaintForm(); }; }
    var btn = $('pfEvSave');
    if (btn) { btn.onclick = function () { evalSave(btn); }; }
  }

  function evalSave(btn) {
    if (EVAL_BUSY) { return; }
    var err = $('pfEvErr'), mirror = $('pfEvMirror');
    if (err) { err.textContent = ''; }
    if (mirror) { mirror.textContent = ''; }

    var staff = pickedStaff();
    if (!staff) { if (err) { err.textContent = 'Choose a staff member first.'; } return; }
    var date = str($('pfEv_date') ? $('pfEv_date').value : '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { if (err) { err.textContent = 'Enter the date this evaluation covers.'; } return; }

    /* The email is sent, never the name: the server refuses a name that matches two people. */
    var payload = { staff: staff.email, date: date };
    var prior = existingFor(staff);
    if (prior) { payload.replace = true; }
    var cols = evalColumns(), i, el;
    for (i = 0; i < cols.length; i++) {
      if (cols[i].key === 'date' || cols[i].key === 'staff_name') { continue; }
      el = $('pfEv_' + cols[i].key);
      if (el) { payload[cols[i].key] = el.value; }
    }

    EVAL_BUSY = true;
    btn.disabled = true;
    var was = btn.textContent;
    btn.textContent = 'Saving…';
    api('saveEvaluation', payload).then(function (res) {
      EVAL_BUSY = false;
      toast((res && res.replaced ? 'Evaluation updated for ' : 'Evaluation saved for ') + str(staff.name));
      var line = mirrorLine(res && res.mirror);
      evalLoad().then(function () {
        var m = $('pfEvMirror');
        if (m && line) { m.textContent = line; }
      });
    }).catch(function (e) {
      EVAL_BUSY = false;
      btn.disabled = false;
      btn.textContent = was;
      if (!err) { return; }
      err.textContent = e.message === 'auth'
        ? 'Your sign-in expired — please sign in again.'
        : (e.message || 'Not saved. Nothing was written — please try again.');
      toast('Evaluation not saved');
    });
  }

  function mirrorLine(m) {
    if (!m) { return ''; }
    var missing = (m.skippedMissing && m.skippedMissing.length ? m.skippedMissing
      : (m.wouldWrite && m.wouldWrite.skippedMissing) || []);
    var tail = missing.length ? ' · this tab does not carry: ' + missing.join(' | ') : '';
    if (m.ok && m.shadow) {
      return 'Rehearsal mode — the workbook copy was logged, not written' + tail;
    }
    if (m.ok) {
      return 'Mirrored to ' + str(m.tab) + tail;
    }
    return 'Not mirrored — ' + str(m.reason) + (m.detail ? ' (' + str(m.detail) + ')' : '');
  }

  function evalHistoryHtml() {
    if (!EVAL) { return '<div class="spinner"></div>'; }
    var rows = EVAL.rows || [], cols = evalColumns(), i, j, h = '';
    var staff = pickedStaff();
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (staff && norm(r.staff_name) !== norm(staff.name)) { continue; }
      var kv = '';
      for (j = 0; j < cols.length; j++) {
        var key = cols[j].key;
        if (key === 'staff_name' || key === 'date') { continue; }
        var v = str(r[key]).replace(/^\s+|\s+$/g, '');
        if (!v) { continue; }
        kv += '<div><b>' + esc(cols[j].label) + '</b>' + esc(v) + '</div>';
      }
      h += '<div class="pf-rec"><div class="pf-rec-hd">' +
        '<b>' + esc(str(r.staff_name) || '—') + '</b>' +
        '<span class="pill role">' + esc(str(r.date) || '—') + '</span>' +
        '<span class="pf-stat">' + esc(str(r.source) === 'portal' ? 'portal' : str(r.tab)) + '</span>' +
        '<span class="pf-stat">' + esc(str(r.shape) + ' columns') + '</span>' +
        (r.filled_by ? '<span class="pf-note" style="margin-left:auto">by ' + esc(r.filled_by) + '</span>' : '') +
        '</div>' + (kv ? '<div class="pf-kv">' + kv + '</div>' : '<div class="pf-note" style="margin-top:6px">Every rubric cell on this row is blank.</div>') +
        '</div>';
    }
    if (!h) {
      h = '<div class="pf-note">No evaluation recorded for ' + esc(monthLabel(EVAL_MONTH)) +
        (staff ? ' for ' + esc(str(staff.name)) : '') + ' yet.</div>';
    }
    var sheet = EVAL.sheet || {};
    var foot = sheet.ok
      ? 'Workbook tabs read: ' + ((sheet.tabs_read || []).join(', ') || 'none')
      : 'Workbook history: ' + str(sheet.reason || 'not read');
    return h + '<div class="pf-src" style="margin-top:12px"><b>' + esc(foot) + '</b></div>' +
      '<div class="pf-hint">' + esc(str(EVAL.schema_note)) + '</div>';
  }

  function evalPaint() {
    var hist = $('pfEvHist');
    if (hist) { hist.innerHTML = evalHistoryHtml(); }
    evalPaintForm();
  }

  function evalLoad() {
    var hist = $('pfEvHist');
    var ec = cachedCall('evaluations', { month: EVAL_MONTH }, function (d) {
      EVAL = d || {};
      evalPaint();
    });
    if (!ec.painted && hist) { hist.innerHTML = '<div class="spinner"></div>'; }
    return ec.done.catch(function (e) {
      EVAL = EVAL || {};
      if (ec.painted || !$('pfEvHist')) { return; }
      setHTML('pfEvHist', '<div class="pf-note">' +
        esc(e.message === 'auth' ? 'Your sign-in expired — please sign in again.'
          : 'The evaluation history could not be loaded. Please try again.') + '</div>');
    });
  }

  VIEWS.team = {
    label: 'Team performance',
    icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 15c3 0 5 1.7 5 5"/>',
    roles: TEAM_ROLES,
    order: 56,
    render: function () {
      /* Staff never reach this screen: it is absent from their nav, renderView refuses it, and
       * actionTeamPerformance_ refuses the request even if it is called directly. */
      return '<div class="hgroup enter d1"><h1>Team <span class="goldtext">performance</span></h1>' +
        '<span class="sub">Everyone · ' + esc(str(STATE.user.role)) + '</span></div>' +
        '<div class="card enter d1"><div class="bd">' +
          '<div class="pf-bar">' +
            '<span class="pf-seg" id="pfTeamSeg">' +
              '<button data-kind="day" class="on">Today</button>' +
              '<button data-kind="week">This week</button>' +
            '</span>' +
            (mayRefresh() ? '<button class="minibtn" id="pfTeamRefresh">Refresh now</button>' : '') +
            '<span class="pf-note" style="margin-left:auto" id="pfTeamStamp">Loading…</span>' +
          '</div>' +
          '<div class="pf-chips" id="pfScopes" style="margin-top:12px"></div>' +
        '</div></div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">The grid ' +
          '<span class="hint">tap a column to sort · arrow = against the period before</span></div>' +
          '<div class="bd" id="pfTeamGrid"><div class="spinner"></div></div></div>' +
        (mayEvaluate()
          ? '<div class="card enter d3" style="margin-top:16px"><div class="hd">Monthly evaluation ' +
              '<span class="hint" id="pfEvMonthLbl"></span></div><div class="bd">' +
              '<div class="pf-bar" style="margin-bottom:14px">' +
                '<div class="field" style="margin-top:0;min-width:170px"><label>Month</label>' +
                  '<input type="month" id="pfEvMonth"></div>' +
              '</div>' +
              '<div id="pfEvForm"><div class="spinner"></div></div>' +
            '</div></div>' +
            '<div class="card enter d3" style="margin-top:16px"><div class="hd">Evaluations on record ' +
              '<span class="hint">portal rows and the workbook’s own history</span></div>' +
              '<div class="bd" id="pfEvHist"><div class="spinner"></div></div></div>'
          : '<div class="card enter d3" style="margin-top:16px"><div class="bd pf-note">' +
              'The monthly evaluation is filled in by Management and the Team Lead.</div></div>');
    },
    init: function () {
      TEAM = { day: null, week: null };
      TEAM_KIND = 'day';
      TEAM_SCOPE = 'all';
      SORT = { key: 'name', dir: 'asc' };
      EVAL = null;
      EVAL_BUSY = false;
      EVAL_MONTH = pktToday().slice(0, 7);

      var segs = document.querySelectorAll('#pfTeamSeg button'), i;
      for (i = 0; i < segs.length; i++) {
        segs[i].onclick = (function (el) {
          return function () {
            TEAM_KIND = el.getAttribute('data-kind');
            if (TEAM[TEAM_KIND]) { teamPaint(); } else { teamLoad(false); }
          };
        }(segs[i]));
      }
      var ref = $('pfTeamRefresh');
      if (ref) {
        ref.onclick = function () {
          ref.disabled = true;
          var was = ref.textContent;
          ref.textContent = 'Recomputing…';
          teamLoad(true).then(function () {
            ref.disabled = false; ref.textContent = was; toast('Figures recomputed');
          }).catch(function () { ref.disabled = false; ref.textContent = was; });
        };
      }
      var lbl = $('pfEvMonthLbl');
      if (lbl) { lbl.textContent = monthLabel(EVAL_MONTH); }
      var mon = $('pfEvMonth');
      if (mon) {
        enhanceDate(mon, { kind: 'month', tz: 'Pakistan' });
        mon.value = EVAL_MONTH;
        mon.onchange = function () {
          if (!/^\d{4}-\d{2}$/.test(mon.value)) { return; }
          EVAL_MONTH = mon.value;
          if (lbl) { lbl.textContent = monthLabel(EVAL_MONTH); }
          evalLoad();
        };
      }

      /* One round trip for the whole screen: both grid periods, the month's evaluations and the
       * roster are fired together so the batcher sends them as a single request. */
      teamLoad(false);
      if (mayEvaluate()) {
        api('assignableStaff').then(function (d) {
          EVAL_STAFF = (d && d.staff) || [];
          evalPaintForm();
        }).catch(function () {});
        evalLoad();
      }
    }
  };

})();
