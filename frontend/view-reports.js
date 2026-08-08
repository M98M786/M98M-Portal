/* §5 2-hourly reporting · §28.2 Daily Productivity Report · §25.4 the golden shift line.
 * Backend actions: myCheckpoints, submitReport, reportsGrid. All labels (count fields, the
 * value-addition prompt, the grid legend) come from the backend payload — never hardcoded here. */
(function () {

  var GRID_ROLES = ['Management', 'Ops Head', 'Team Lead'];
  var FLAG_LABEL = { ontime: 'On time', late: 'Late', missed: 'Missed' };
  var FLAG_PILL = { ontime: 'rp-ok', late: 'rp-warn', missed: 'rp-bad' };
  var CELL_FLAG = { green: 'ontime', amber: 'late', red: 'missed' };
  var CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7"/></svg>';
  var CROSS_SVG = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var RAIL_PAD = 8;
  var TICK_MS = 60000;

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.field textarea{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;resize:vertical;min-height:84px}' +
    '.field textarea:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.field.rp-sentence label{text-transform:none;letter-spacing:0;font-size:13px;color:var(--gold-a)}' +
    '.tl-row.rp-row{flex-wrap:wrap}' +
    '.pill.rp-final{white-space:nowrap}' +
    '.pill.rp-ok{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.rp-warn{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.rp-bad{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.rp-blue{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.rp-dim{background:rgba(120,132,152,.14);color:var(--text-3)}' +
    /* the golden shift line (§25.4) */
    '.rp-rail{position:relative;height:66px;margin:4px 2px 0;min-width:240px}' +
    '.rp-bar{position:absolute;top:22px;left:0;right:0;height:5px;border-radius:99px;background:rgba(120,132,152,.22)}' +
    '.rp-fill{position:absolute;top:22px;left:0;height:5px;border-radius:99px;background:linear-gradient(90deg,var(--blue-deep),var(--blue-2));box-shadow:var(--glow-blue);transition:width .7s cubic-bezier(.2,.8,.2,1)}' +
    '.rp-now{position:absolute;top:10px;width:2px;height:29px;background:var(--blue-2);box-shadow:var(--glow-blue);border-radius:2px}' +
    '.rp-node{position:absolute;top:24.5px;transform:translate(-50%,-50%);width:21px;height:21px;border-radius:50%;background:var(--panel);border:2px solid rgba(120,132,152,.4);display:grid;place-items:center;z-index:2;transition:all .3s ease}' +
    '.rp-node svg{width:11px;height:11px;stroke:var(--gold-ink);stroke-width:3.2;fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:0;transform:scale(.4);transition:all .25s ease}' +
    '.rp-node.done{background:linear-gradient(135deg,var(--gold-a),var(--gold-c));border-color:var(--gold-b);box-shadow:0 0 12px rgba(233,169,60,.5)}' +
    '.rp-node.done svg{opacity:1;transform:scale(1)}' +
    '.rp-node.done.late{border-color:var(--warn)}' +
    '.rp-node.due{border-color:var(--gold-b);animation:rpring 1.8s ease-out infinite}' +
    '@keyframes rpring{0%{box-shadow:0 0 0 0 rgba(233,169,60,.5)}100%{box-shadow:0 0 0 11px rgba(233,169,60,0)}}' +
    '.rp-node.miss{background:var(--bad-soft);border-color:var(--bad)}' +
    '.rp-node.miss svg{opacity:1;transform:scale(1);stroke:var(--bad)}' +
    '.rp-node .t{position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:10.5px;font-weight:800;color:var(--text-3);white-space:nowrap}' +
    '.rp-node.done .t,.rp-node.due .t{color:var(--text-2)}' +
    '.rp-node.miss .t{color:var(--bad)}' +
    '.rp-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;font-weight:700;color:var(--text-3);margin-top:16px}' +
    '.rp-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:middle}' +
    '.rp-err{color:var(--bad);font-weight:700;font-size:12.5px;margin-top:10px;min-height:17px}' +
    '.rp-note{color:var(--text-3);font-weight:600;font-size:12.5px}' +
    '.rp-fields{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(148px,1fr))}' +
    '.rp-counts{display:flex;flex-wrap:wrap;gap:8px}' +
    '.rp-count{display:inline-flex;align-items:baseline;gap:7px;border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font-size:12px;font-weight:700;color:var(--text-2);white-space:nowrap}' +
    '.rp-count b{font-weight:800;color:var(--gold-a)}' +
    '.rp-dpr{white-space:pre-wrap;font-size:12.5px;font-weight:600;color:var(--text-2);padding:2px 0 12px}' +
    /* the management grid */
    '.rp-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:520px}' +
    '.rp-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.rp-tbl td{padding:10px 12px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.rp-tbl tr:last-child td{border-bottom:0}' +
    '.rp-tbl tbody tr{transition:background .12s}' +
    '.rp-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.rp-tbl th.rp-cp,.rp-tbl td.rp-cpc{text-align:center;width:62px}' +
    '.rp-cell{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:8px;border:1px solid transparent}' +
    '.rp-cell svg{width:13px;height:13px;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
    '.rp-cell.green{background:var(--ok-soft);border-color:rgba(63,207,142,.4)}.rp-cell.green svg{stroke:var(--ok)}' +
    '.rp-cell.amber{background:var(--warn-soft);border-color:rgba(255,159,67,.42)}.rp-cell.amber svg{stroke:var(--warn)}' +
    '.rp-cell.red{background:var(--bad-soft);border-color:rgba(240,96,90,.45)}.rp-cell.red svg{stroke:var(--bad)}' +
    '.rp-cell.empty{background:rgba(120,132,152,.10);border-color:rgba(120,132,152,.25)}' +
    '.rp-cell.empty em{display:block;width:5px;height:5px;border-radius:50%;background:var(--text-3)}' +
    '.rp-who{font-weight:700;white-space:nowrap}' +
    '.rp-who span{display:block;font-size:11px;color:var(--text-3);font-weight:600}'
  );

  /* esc() escapes text nodes but leaves quotes intact, so attribute values need this too (RL-3). */
  function escAttr(v) { return esc(v).replace(/"/g, '&quot;'); }

  /* ---------- time helpers (checkpoints are 'HH:mm' PKT strings from the backend) ---------- */

  function parseHm(cp) {
    var m = String(cp == null ? '' : cp).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return { h: Number(m[1]), m: Number(m[2]) };
  }
  function toMin(cp) { var p = parseHm(cp); return p ? p.h * 60 + p.m : 0; }
  function hm12(cp) {
    var p = parseHm(cp);
    if (!p) return String(cp == null ? '' : cp);
    var h = p.h % 12; if (h === 0) { h = 12; }
    return h + ':' + (p.m < 10 ? '0' : '') + p.m;
  }
  function hmFull(cp) {
    var p = parseHm(cp);
    if (!p) return String(cp == null ? '' : cp);
    return hm12(cp) + ' ' + (p.h < 12 ? 'AM' : 'PM');
  }
  /* Same wrap rule as the backend: a checkpoint at or before the previous one is the next day. */
  function absList(cps) {
    var out = [], day = 0, i;
    for (i = 0; i < cps.length; i++) {
      if (i > 0 && toMin(cps[i]) <= toMin(cps[i - 1])) { day++; }
      out.push(day * 1440 + toMin(cps[i]));
    }
    return out;
  }
  function fmtDay(d) {
    var p = String(d == null ? '' : d).split('-');
    if (p.length !== 3) { return String(d == null ? '' : d); }
    var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    if (isNaN(dt.getTime())) { return String(d); }
    return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
  function fmtIn(mins) {
    var n = Math.round(Number(mins));
    if (!isFinite(n) || n <= 0) { return ''; }
    if (n < 60) { return 'in ' + n + 'm'; }
    var h = Math.floor(n / 60), m = n % 60;
    return 'in ' + h + 'h' + (m ? ' ' + m + 'm' : '');
  }
  function pct(n) { return (isFinite(n) ? n : 0).toFixed(2); }
  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  /* ---------- VIEW: my 2-hourly reports ---------- */

  var busy = false;
  var ticker = null;

  function railHtml(d) {
    var cps = d.checkpoints || [];
    if (!cps.length) {
      return '<div class="rp-note">No checkpoints yet — your timetable is set by Management.</div>';
    }
    var times = [], i;
    for (i = 0; i < cps.length; i++) { times.push(cps[i].checkpoint); }
    var abs = absList(times);
    var span = abs[abs.length - 1] - abs[0];
    var usable = 100 - (RAIL_PAD * 2);
    var at = function (a) {
      if (!(span > 0)) { return RAIL_PAD + usable / 2; }
      return RAIL_PAD + ((a - abs[0]) / span) * usable;
    };
    var nowAbs = null;
    for (i = 0; i < cps.length; i++) {
      if (isFinite(Number(cps[i].minutes_until))) { nowAbs = abs[i] - Number(cps[i].minutes_until); break; }
    }

    var h = '<div class="rp-rail"><div class="rp-bar"></div>';
    var fill = 0;
    if (nowAbs !== null && nowAbs > abs[0]) { fill = clamp(at(nowAbs), 0, 100); }
    h += '<div class="rp-fill" style="width:' + pct(fill) + '%"></div>';
    if (nowAbs !== null && nowAbs >= abs[0] && nowAbs <= abs[abs.length - 1]) {
      h += '<div class="rp-now" style="left:' + pct(clamp(at(nowAbs), 0, 100)) + '%"></div>';
    }
    for (i = 0; i < cps.length; i++) {
      var c = cps[i], cls = 'rp-node', icon = CHECK_SVG;
      if (c.state === 'submitted') { cls += ' done'; if (c.flag === 'late') { cls += ' late'; } }
      else if (c.state === 'due now') { cls += ' due'; }
      else if (c.state === 'missed') { cls += ' miss'; icon = CROSS_SVG; }
      var left = (span > 0) ? at(abs[i]) : (cps.length > 1 ? RAIL_PAD + (i / (cps.length - 1)) * usable : 50);
      h += '<div class="' + cls + '" style="left:' + pct(left) + '%" title="' +
           escAttr(hmFull(c.checkpoint) + ' · ' + stateLabel(c)) + '">' + icon +
           '<span class="t">' + esc(hm12(c.checkpoint)) + '</span></div>';
    }
    h += '</div>';
    h += '<div class="rp-legend">' +
      '<span><i style="background:linear-gradient(135deg,var(--gold-a),var(--gold-c))"></i>Submitted</span>' +
      '<span><i style="background:transparent;border:2px solid var(--gold-b)"></i>Due now</span>' +
      '<span><i style="background:transparent;border:2px solid rgba(120,132,152,.5)"></i>Upcoming</span>' +
      '<span><i style="background:var(--bad)"></i>Missed</span>' +
      '</div>';
    return h;
  }

  function stateLabel(c) {
    if (c.state === 'submitted') { return FLAG_LABEL[c.flag] || 'Submitted'; }
    if (c.state === 'due now') { return 'Due now'; }
    if (c.state === 'missed') { return FLAG_LABEL.missed; }
    return 'Upcoming';
  }

  function listHtml(d) {
    var cps = d.checkpoints || [];
    if (!cps.length) { return '<div class="rp-note">Management sets your timetable.</div>'; }
    var h = '', i;
    for (i = 0; i < cps.length; i++) {
      var c = cps[i], pill = 'rp-dim', right = '';
      if (c.state === 'submitted') {
        pill = FLAG_PILL[c.flag] || 'rp-ok';
        right = c.submitted_at ? ('submitted ' + fmtPkt(c.submitted_at)) : '';
      } else if (c.state === 'due now') { pill = 'rp-blue'; }
      else if (c.state === 'missed') { pill = 'rp-bad'; }
      else { right = fmtIn(c.minutes_until); }
      h += '<div class="tl-row rp-row"><span class="k">' + esc(hmFull(c.checkpoint)) + '</span>' +
           '<span class="pill ' + pill + '">' + esc(stateLabel(c)) + '</span>' +
           (c.is_final ? '<span class="pill role rp-final">Daily Productivity Report</span>' : '') +
           '<span style="margin-left:auto;color:var(--text-3);font-weight:600;font-size:12px;white-space:nowrap">' + esc(right) + '</span></div>';
    }
    return h;
  }

  function pickTarget(d) {
    var cps = d.checkpoints || [], i;
    for (i = 0; i < cps.length; i++) { if (cps[i].state === 'due now') { return cps[i]; } }
    for (i = 0; i < cps.length; i++) { if (cps[i].state === 'upcoming') { return cps[i]; } }
    return null;
  }

  function formHtml(d, target) {
    var cps = d.checkpoints || [], i, done = 0;
    for (i = 0; i < cps.length; i++) { if (cps[i].state === 'submitted') { done++; } }
    if (!cps.length) { return '<div class="rp-note">Nothing to submit until Management sets your timetable.</div>'; }
    if (!target) {
      if (done === cps.length) {
        return '<div class="ideas" style="border-radius:10px;padding:14px 16px">' +
          '<b>Every checkpoint is in for ' + esc(fmtDay(d.date)) + '.</b>' +
          '<div class="rp-note" style="margin-top:4px">Nothing left to submit today.</div></div>';
      }
      return '<div class="rp-note">No checkpoint is open right now.</div>';
    }

    var labels = d.countFields || [];
    var h = '<div class="field" style="margin-top:0"><label>Work summary</label>' +
      '<textarea id="rpSummary" placeholder="What did you work on since the last checkpoint?"></textarea></div>';
    if (labels.length) {
      h += '<div class="rp-fields" style="margin-top:14px">';
      for (i = 0; i < labels.length; i++) {
        h += '<div class="field" style="margin-top:0"><label>' + esc(labels[i]) + '</label>' +
             '<input type="number" min="0" step="1" inputmode="numeric" class="num" id="rpCount' + i + '" placeholder="0"></div>';
      }
      h += '</div>';
    }
    if (target.is_final) {
      h += '<div class="field rp-sentence"><label>' +
        esc(d.valueAdditionPrompt || d.valueAdditionLabel || 'Required for the Daily Productivity Report') +
        ' <span style="color:var(--text-3)">· required</span></label>' +
        '<textarea id="rpValue" placeholder="The one thing that made a difference today"></textarea></div>';
    }
    h += '<div class="rp-err" id="rpErr"></div>' +
      '<button class="btn-gold" id="rpSubmit">' + (target.is_final ? 'Submit Daily Productivity Report' : 'Submit report') + '</button>';
    return h;
  }

  function touched(d, target) {
    if (!target) { return false; }
    var s = $('rpSummary'), v = $('rpValue'), i;
    if (s && s.value.trim()) { return true; }
    if (v && v.value.trim()) { return true; }
    var labels = d.countFields || [];
    for (i = 0; i < labels.length; i++) {
      var el = $('rpCount' + i);
      if (el && el.value.trim()) { return true; }
    }
    return false;
  }

  function paint(d) {
    var target = pickTarget(d);
    var hint = $('rpHint'), sub = $('rpSub'), rail = $('rpRail'), list = $('rpList'),
        form = $('rpForm'), hd = $('rpFormHd');
    if (!rail) { return; }
    rail.innerHTML = railHtml(d);
    if (list) { list.innerHTML = listHtml(d); }
    if (sub) {
      sub.innerHTML = esc(fmtDay(d.date)) + ' · <span class="pill role">' + esc(d.role || STATE.user.role) + '</span>';
    }
    if (hint) {
      var bits = [];
      if (d.shift) { bits.push(d.shift); }
      if (isFinite(Number(d.lateThresholdMin))) { bits.push('late after ' + Number(d.lateThresholdMin) + ' min'); }
      hint.textContent = bits.join(' · ');
    }
    if (hd) {
      hd.innerHTML = (target && target.is_final ? 'Daily Productivity Report' : 'Checkpoint report') +
        (target ? ' <span class="hint">' + esc(hmFull(target.checkpoint) +
          (target.state === 'due now' ? ' · due now' : ' · ' + (fmtIn(target.minutes_until) || 'next'))) + '</span>' : '');
    }
    if (form) {
      form.innerHTML = formHtml(d, target);
      var btn = $('rpSubmit');
      if (btn) { btn.onclick = function () { submit(d, target, btn); }; }
    }

    var due = 0, i, cps = d.checkpoints || [];
    for (i = 0; i < cps.length; i++) { if (cps[i].state === 'due now') { due++; } }
    STATE.counts.reports = due;
    if (typeof refreshBadges === 'function') { try { refreshBadges(); } catch (e) {} }
  }

  function fail(msg) {
    var el = $('rpErr');
    if (el) { el.textContent = msg; }
  }

  function submit(d, target, btn) {
    if (busy) { return; }
    fail('');
    var summary = ($('rpSummary') ? $('rpSummary').value : '').trim();
    if (!summary) { fail('Work summary is required.'); return; }

    var labels = d.countFields || [], counts = [], i;
    for (i = 0; i < labels.length; i++) {
      var raw = ($('rpCount' + i) ? $('rpCount' + i).value : '').trim();
      if (raw === '') { fail('Enter ' + labels[i] + '.'); return; }
      if (!/^\d+$/.test(raw)) { fail(labels[i] + ' must be a whole number, 0 or more.'); return; }
      counts.push(Number(raw));
    }

    var payload = { checkpoint: target.checkpoint, work_summary: summary, counts: counts };
    if (target.is_final) {
      var va = ($('rpValue') ? $('rpValue').value : '').trim();
      if (!va) {
        fail((d.valueAdditionLabel ? d.valueAdditionLabel + ' is' : 'This field is') + ' required on the Daily Productivity Report.');
        return;
      }
      payload.value_addition = va;
    }

    busy = true;
    btn.disabled = true;
    var was = btn.textContent;
    btn.textContent = 'Submitting…';
    api('submitReport', payload).then(function (res) {
      busy = false;
      if (res && res.daily_productivity_report) { toast('Daily Productivity Report submitted — thank you.'); }
      else if (res && res.flag === 'late') { toast('Checkpoint ' + hm12(target.checkpoint) + ' submitted — marked late.'); }
      else { toast('Checkpoint ' + hm12(target.checkpoint) + ' submitted on time.'); }
      load();
    }).catch(function (e) {
      busy = false;
      btn.disabled = false;
      btn.textContent = was;
      fail(e.message === 'auth' ? 'Your sign-in expired — please sign in again.' : 'That did not go through. Nothing was saved — please try again.');
      toast('Report not submitted');
    });
  }

  function load() {
    return api('myCheckpoints').then(function (d) {
      paint(d || {});
      return d;
    }).catch(function (e) {
      var rail = $('rpRail');
      if (rail) { rail.innerHTML = '<div class="rp-note">Your checkpoints could not be loaded. Please try again.</div>'; }
      var form = $('rpForm');
      if (form) { form.innerHTML = '<div class="rp-note">' + esc(e.message === 'auth' ? 'Your sign-in expired — please sign in again.' : 'Not available right now.') + '</div>'; }
      var list = $('rpList');
      if (list) { list.innerHTML = ''; }
    });
  }

  /* Keeps an idle screen honest as a checkpoint falls due; never refreshes over typed input. */
  function startTicker() {
    if (ticker) { clearInterval(ticker); }
    ticker = setInterval(function () {
      if (!$('rpRail')) { clearInterval(ticker); ticker = null; return; }
      if (busy) { return; }
      api('myCheckpoints').then(function (d) {
        if (!$('rpRail') || busy) { return; }
        if (touched(d || {}, pickTarget(d || {}))) { return; }
        paint(d || {});
      }).catch(function () {});
    }, TICK_MS);
  }

  VIEWS.reports = {
    label: 'My reports',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    roles: '*',
    order: 30,
    render: function () {
      return '<div class="hgroup enter d1"><h1>My <span class="goldtext">checkpoints</span></h1>' +
        '<span class="sub" id="rpSub">2-hourly reporting</span></div>' +
        '<div class="card enter d2"><div class="hd">Today’s shift line <span class="hint" id="rpHint">Loading…</span></div>' +
        '<div class="bd scroll" id="rpRail"><div class="spinner"></div></div></div>' +
        '<div class="grid g-2" style="margin-top:16px">' +
          '<div class="card enter d3"><div class="hd" id="rpFormHd">Checkpoint report</div>' +
          '<div class="bd" id="rpForm"><div class="spinner"></div></div></div>' +
          '<div class="card enter d3"><div class="hd">Checkpoints <span class="hint">PKT</span></div>' +
          '<div class="bd" id="rpList"><div class="spinner"></div></div></div>' +
        '</div>';
    },
    init: function () {
      busy = false;
      load();
      startTicker();
    }
  };

  /* ---------- VIEW: the management grid ---------- */

  function cellHtml(cell) {
    var state = (cell && cell.state) || 'empty';
    if (['green', 'amber', 'red', 'empty'].indexOf(state) < 0) { state = 'empty'; }
    var flag = CELL_FLAG[state];
    var label = hmFull(cell && cell.checkpoint) + ' · ' + (flag ? FLAG_LABEL[flag] : 'Not yet due');
    var inner = state === 'empty' ? '<em></em>' : (state === 'red' ? CROSS_SVG : CHECK_SVG);
    return '<span class="rp-cell ' + state + '" title="' + escAttr(label) + '">' + inner + '</span>';
  }

  function countsHtml(counts) {
    if (!counts || !counts.length) { return '<span class="rp-note">—</span>'; }
    var h = '<div class="rp-counts">', i;
    for (i = 0; i < counts.length; i++) {
      h += '<span class="rp-count">' + esc(counts[i].label) + ' <b class="num">' + esc(counts[i].value) + '</b></span>';
    }
    return h + '</div>';
  }

  function gridHtml(d) {
    var rows = (d && d.rows) || [];
    if (!rows.length) {
      return '<div class="card enter d3" style="margin-top:16px"><div class="bd rp-note">Nobody is scheduled on ' + esc(fmtDay(d.date)) + '.</div></div>';
    }
    var groups = [], byKey = {}, i, j;
    for (i = 0; i < rows.length; i++) {
      var cps = rows[i].checkpoints || [];
      var key = cps.join('|');
      if (!byKey[key]) { byKey[key] = { checkpoints: cps, shifts: [], rows: [] }; groups.push(byKey[key]); }
      byKey[key].rows.push(rows[i]);
      var sh = rows[i].shift || '';
      if (sh && byKey[key].shifts.indexOf(sh) < 0) { byKey[key].shifts.push(sh); }
    }

    var h = '';
    for (i = 0; i < groups.length; i++) {
      var g = groups[i];
      h += '<div class="card enter d3" style="margin-top:16px"><div class="hd">' +
        esc(g.shifts.length ? g.shifts.join(' · ') : 'Checkpoints') +
        '<span class="hint">' + esc(g.rows.length) + (g.rows.length === 1 ? ' person' : ' people') + '</span></div>' +
        '<div class="bd scroll"><table class="rp-tbl"><thead><tr><th>Person</th>';
      for (j = 0; j < g.checkpoints.length; j++) {
        h += '<th class="rp-cp">' + esc(hm12(g.checkpoints[j])) + '</th>';
      }
      h += '<th>Counts</th></tr></thead><tbody>';
      for (j = 0; j < g.rows.length; j++) {
        var r = g.rows[j], k;
        h += '<tr><td><div class="rp-who">' + esc(r.name || r.email) + '<span>' + esc(r.role || '') + '</span></div></td>';
        var cells = r.cells || [];
        for (k = 0; k < g.checkpoints.length; k++) {
          h += '<td class="rp-cpc">' + cellHtml(cells[k] || { checkpoint: g.checkpoints[k], state: 'empty' }) + '</td>';
        }
        h += '<td>' + countsHtml(r.counts) + '</td></tr>';
      }
      h += '</tbody></table></div></div>';
    }
    return h;
  }

  function totalsHtml(d) {
    var totals = (d && d.totalsByRole) || {};
    var roles = [], k;
    for (k in totals) { if (Object.prototype.hasOwnProperty.call(totals, k)) { roles.push(k); } }
    var h = '<div class="card enter d3" style="margin-top:16px"><div class="hd">Role counters ' +
      '<span class="hint">auto-summed · ' + esc(fmtDay(d.date)) + '</span></div><div class="bd">';
    if (!roles.length) {
      h += '<div class="rp-note">No counts submitted for this day yet.</div>';
    } else {
      for (var i = 0; i < roles.length; i++) {
        var items = totals[roles[i]] || [], parts = '<div class="rp-counts">';
        for (var j = 0; j < items.length; j++) {
          parts += '<span class="rp-count">' + esc(items[j].label) + ' <b class="num">' + esc(items[j].total) + '</b></span>';
        }
        parts += '</div>';
        h += '<div class="tl-row"><span class="k"><span class="pill role">' + esc(roles[i]) + '</span></span>' + parts + '</div>';
      }
    }
    return h + '</div></div>';
  }

  function dprHtml(d) {
    var rows = (d && d.rows) || [], has = false, h =
      '<div class="card enter d3" style="margin-top:16px"><div class="hd">Daily Productivity Report ' +
      '<span class="hint">final checkpoint of the shift</span></div><div class="bd" id="rgDpr">';
    for (var i = 0; i < rows.length; i++) {
      var text = rows[i].daily_productivity_report;
      if (!text) { continue; }
      has = true;
      h += '<div class="tl-row"><span class="k">' + esc(rows[i].name || rows[i].email) + '</span>' +
        '<span class="pill role">' + esc(rows[i].role || '') + '</span>' +
        '<button class="minibtn" style="margin-left:auto" data-dpr="' + i + '">Show</button></div>' +
        '<div class="rp-dpr hidden" id="rgDpr' + i + '">' + esc(text) + '</div>';
    }
    if (!has) { h += '<div class="rp-note">No Daily Productivity Report submitted for this day yet.</div>'; }
    return h + '</div></div>';
  }

  function paintGrid(d) {
    var body = $('rgBody');
    if (!body) { return; }
    var input = $('rgDate');
    if (input && d.date) { input.value = d.date; }
    var legend = $('rgLegend');
    if (legend && d.legend) {
      legend.innerHTML =
        '<span><i style="background:var(--ok)"></i>' + esc(FLAG_LABEL[d.legend.green] || d.legend.green) + '</span>' +
        '<span><i style="background:var(--warn)"></i>' + esc(FLAG_LABEL[d.legend.amber] || d.legend.amber) + '</span>' +
        '<span><i style="background:var(--bad)"></i>' + esc(FLAG_LABEL[d.legend.red] || d.legend.red) + '</span>' +
        '<span><i style="background:rgba(120,132,152,.45)"></i>Not yet due</span>';
    }
    body.innerHTML = gridHtml(d) + totalsHtml(d) + dprHtml(d);
    var box = $('rgDpr');
    if (box) {
      box.onclick = function (ev) {
        var t = ev.target;
        if (!t || !t.getAttribute) { return; }
        var idx = t.getAttribute('data-dpr');
        if (idx === null) { return; }
        var panel = $('rgDpr' + idx);
        if (!panel) { return; }
        var hidden = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !hidden);
        t.textContent = hidden ? 'Hide' : 'Show';
      };
    }
  }

  function loadGrid(date) {
    var body = $('rgBody');
    if (body) { body.innerHTML = '<div class="card enter d3" style="margin-top:16px"><div class="bd"><div class="spinner"></div></div></div>'; }
    api('reportsGrid', date ? { date: date } : {}).then(function (d) {
      paintGrid(d || {});
    }).catch(function (e) {
      if (!$('rgBody')) { return; }
      $('rgBody').innerHTML = '<div class="card enter d3" style="margin-top:16px"><div class="bd rp-note">' +
        esc(e.message === 'auth' ? 'Your sign-in expired — please sign in again.' : 'The grid could not be loaded. Please try again.') +
        '</div></div>';
    });
  }

  VIEWS.reportsGrid = {
    label: 'Reports grid',
    icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    roles: GRID_ROLES,
    order: 35,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Reports <span class="goldtext">grid</span></h1>' +
        '<span class="sub">Per person · per checkpoint</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">' +
            '<div class="field" style="margin-top:0;min-width:168px"><label>Day</label><input type="date" id="rgDate"></div>' +
            '<button class="minibtn" id="rgToday" style="margin-bottom:1px">Today</button>' +
          '</div>' +
          '<div class="rp-legend" id="rgLegend"></div>' +
        '</div></div>' +
        '<div id="rgBody"><div class="card enter d3" style="margin-top:16px"><div class="bd"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
      var input = $('rgDate');
      if (input) { input.onchange = function () { loadGrid(input.value); }; }
      var today = $('rgToday');
      if (today) { today.onclick = function () { if (input) { input.value = ''; } loadGrid(''); }; }
      loadGrid('');
    }
  };

})();
