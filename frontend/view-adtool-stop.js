/* view-adtool-stop.js — Advertising Tool · Live apply (owner's Change Spec, 28 Oct 2026). Management only.
 * This is the ONLY place anything in the tool can reach eBay, and every account's switch is off until
 * Management turns it on after a read-only preflight. The page carries the per-account switches, the
 * preflight stamp, the caps, the apply log and its undo, the clock the two runs keep, how each decision
 * rule has scored, whether each rule repeats, the days scored, and the team's own action log.
 * What used to sit above all this — the decision tiles and the decision cards — is on Decision now, where
 * the listings are: one home per number. Galaxy tokens; gold the accent, #e0563f the loss colour. */
(function () {
  var ROLES = ['Management', 'Ops Head'];
  /* `flags` is the portal_config rows as adtoolFlags sends them, which is what is STORED; `plan` is
     the peak page's own answer, which carries the figures the engine is actually deciding on. Both,
     because a key nobody has set still has an effective figure and only the engine knows it. */
  var ST = { apply: null, scores: null, flags: null, flagsErr: '', plan: null, planErr: '', busy: '' };
  VIEW_CSS.push(
    '.st-live{border:1px solid rgba(224,86,63,.45);border-radius:14px;padding:14px 16px;background:rgba(224,86,63,.05);margin-bottom:12px}' +
    '.st-live h3{margin:0 0 4px;font-size:15px;font-weight:800}' +
    '.st-sw{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid var(--gold-line);font-size:12px;margin:0 8px 8px 0}.st-sw.on{border-color:#e0563f;color:#ffb3a6}' +
    /* ── the pattern engine's settings (owner's brief, 31 Oct, §3). This file's own prefix. ── */
    '.st-cfg{width:100%;border-collapse:collapse;font-size:12px}' +
    '.st-cfg th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.st-cfg td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}' +
    '.st-cfg td.v{font-variant-numeric:tabular-nums;font-weight:800;white-space:nowrap}' +
    '.st-cfg code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--text-3)}' +
    '.st-cfg .w{font-size:11.5px;color:var(--text-2);line-height:1.5;max-width:420px}' +
    '.st-unset{font-size:10.5px;color:var(--text-3);font-weight:700}'
  );
  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }

  /* live, would-send and blocked are THREE different things and the "Sent?" column used to print
     two of them as the same two words. A would-send row was never sent because that account's
     switch is off. A blocked row is on an account that IS live and a cap held it: nothing was sent
     and the change is still owed. Reading "not sent" for both hides which of the two it was. */
  var MODE_WORDS = {
    'live': ['live', 'sent to eBay'],
    'would-send': ['would-send', 'written down and not sent: this account\'s live switch is off'],
    'blocked': ['blocked', 'held back by a cap, so nothing was sent and the change is still owed']
  };
  function modeCell(mode) {
    var m = String(mode == null ? '' : mode).toLowerCase().trim();
    var w = MODE_WORDS[m];
    if (!w) return '<span class="an-sub">' + esc(m || 'not recorded') + '</span>';
    return '<span title="' + esc(w[1]) + '">' + esc(w[0]) + '</span>';
  }
  /* one table for both senders: the morning and evening runs above, the peak switch below. Same row
     shape, same undo, so the two can never drift apart in how they read. */
  function logTable(rows, empty) {
    var list = Array.isArray(rows) ? rows : [];
    return '<table class="an-tbl" style="margin-top:8px"><thead><tr><th>When</th><th>Account</th><th>Item</th><th>Action</th><th>Change</th><th>Sent?</th><th>Result</th><th></th></tr></thead><tbody>' +
      (list.length ? list.slice(0, 40).map(function (r) {
        var p = r.payload || {};
        /* every sender writes op 'status'; decision_id is what tells a peak switch from a morning
           apply, so it is printed under the operation rather than left in the payload */
        var who = String(r.decision_id == null ? '' : r.decision_id).trim();
        return '<tr><td>' + esc(String(r.at).slice(0, 16)) + '</td><td>' + esc(r.account) + '</td><td>' + adtProductCell(r) + '</td>' +
          '<td>' + esc(r.op) + (who ? '<div class="an-sub" style="margin:2px 0 0">' + esc(who === 'peak' ? 'peak hours' : who.slice(0, 28)) + '</div>' : '') + '</td>' +
          '<td>' + esc((p.from != null ? p.from + ' → ' : '') + (p.to != null ? p.to : '')) + '</td>' +
          '<td>' + modeCell(r.mode) + '</td>' +
          '<td>' + (r.mode === 'live' ? esc(String(r.http_status)) : esc(String(r.response || '').slice(0, 40))) + '</td>' +
          '<td>' + (r.mode === 'live' && !r.undone_at && isManager() ? '<button class="an-btn" style="padding:2px 7px;font-size:11px" data-undo="' + r.id + '">Undo</button>' : (r.undone_at ? 'undone' : '')) + '</td></tr>';
      }).join('') : '<tr><td colspan="8" class="an-empty">' + esc(empty) + '</td></tr>') + '</tbody></table>';
  }
  /* the peak switch's own three counts for today. A count the answer does not carry says so: a
     nought here would read as "the peak switch did nothing", which is a different thing entirely. */
  function peakCounts(C) {
    if (!C || typeof C !== 'object') return 'How many it has switched today is not in this answer yet.';
    var word = function (v) { return num(v) == null ? 'no data' : String(Math.round(num(v))); };
    return 'Today: <b>' + word(C.live) + '</b> sent to eBay, <b>' + word(C.would_send) +
      '</b> written down and not sent, <b>' + word(C.blocked) + '</b> held back by a cap.';
  }
  function peakBlock(D) {
    var h = '<div class="an-sub" style="margin:16px 0 0;font-weight:800;color:var(--text)">Peak switching</div>';
    if (!Array.isArray(D.peak_log)) {
      return h + '<div class="an-sub">The peak switch\'s own rows are not in this answer yet, so there is nothing to show here. It is not that nothing has been switched.</div>';
    }
    h += '<div class="an-sub">' + peakCounts(D.peak_counts_today) +
      ' One row is one listing put back on or paused at the hours Management set for it on ' +
      '<a href="#adtoolPeak" style="color:var(--gold-a);font-weight:800">Peak time listings</a>.</div>';
    return h + logTable(D.peak_log, 'nothing switched or rehearsed yet');
  }
  function src(t, shown) { return '<span class="an-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function isManager() { return !!(STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)); }

  /* WHEN THE UK CLOCK NEXT MOVES, worked out from the calendar and never typed in. The UK goes on to
     BST at 01:00 UTC on the last Sunday of March and back to GMT at 01:00 UTC on the last Sunday of
     October. A date written into this file was right for three weeks and then quietly told every
     reader that a change still to come had already happened. */
  function lastSundayUtc(year, month) {
    var d = new Date(Date.UTC(year, month + 1, 0, 1, 0, 0));     /* the last day of that month, 01:00 UTC */
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());                 /* back to the Sunday on or before it */
    return d;
  }
  function ukNextChange(now) {
    var y = now.getUTCFullYear();
    var mar = lastSundayUtc(y, 2), oct = lastSundayUtc(y, 9);
    if (now < mar) return { at: mar, to: 'BST' };
    if (now < oct) return { at: oct, to: 'GMT' };
    return { at: lastSundayUtc(y + 1, 2), to: 'BST' };
  }
  function ukDateWords(d, short) {
    try {
      return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: short ? 'short' : 'long' })
        .format(d) + (short ? '' : ' ' + d.getUTCFullYear());
    } catch (e) { return d.toISOString().slice(0, 10); }
  }

  /* the clock panel. The two batches are fixed in UTC by their crons, so what moves is the local time they
     land at — and when the UK clock changes it shifts both against the working day and can pull the
     boundary batch back onto the previous UK date. Printed from the real cron times rather than typed in,
     so it cannot drift away from what the worker actually does. It belongs on this page because these are
     the two runs that send on a schedule, on any account whose switch below is on. */
  function clockPanel() {
    var BATCHES = [
      { name: 'Evening run', utc: [23, 30], what: 'writes tomorrow\'s decisions before the day starts. It never stops a listing, it holds those for the morning.' },
      { name: 'Morning run', utc: [5, 55], what: 'scores yesterday, then decides today once eBay\'s report has landed' }
    ];
    var fmt = function (hm, tz, when) {
      var d = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate(), hm[0], hm[1]));
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d);
      var get = function (t) { return (p.filter(function (x) { return x.type === t; })[0] || {}).value || ''; };
      return { time: get('hour') + ':' + get('minute'), day: get('weekday') };
    };
    var now = new Date();
    var nc = ukNextChange(now);
    var after = new Date(nc.at.getTime() + 7 * 86400000);  /* a week past the change, so the column shows the new time */
    var onBst = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' }).format(now).indexOf('BST') >= 0;
    var rows = BATCHES.map(function (b) {
      var ukNow = fmt(b.utc, 'Europe/London', now), pkNow = fmt(b.utc, 'Asia/Karachi', now);
      var ukLater = fmt(b.utc, 'Europe/London', after);
      var moves = ukLater.time !== ukNow.time;
      return '<tr><td><b>' + b.name + '</b><div class="an-sub" style="margin:2px 0 0">' + b.what + '</div></td>'
        + '<td class="r">' + esc(String(b.utc[0]).padStart(2, '0') + ':' + String(b.utc[1]).padStart(2, '0')) + '</td>'
        + '<td class="r">' + esc(ukNow.time) + (ukNow.day !== fmt([12, 0], 'Europe/London', now).day ? ' <span class="an-sub">(' + esc(ukNow.day) + ')</span>' : '') + '</td>'
        + '<td class="r">' + esc(pkNow.time) + '</td>'
        + '<td class="r">' + (moves ? esc(ukLater.time) : '<span class="an-sub">no change</span>') + '</td></tr>';
    }).join('');
    return '<div class="an-panel"><h3>When the tool runs</h3>'
      + '<div class="an-sub">These times are fixed in UTC, so the local time is what moves. The UK is on <b>'
      + (onBst ? 'BST' : 'GMT') + '</b> today and ' + (nc.to === 'GMT' ? 'goes back to GMT' : 'moves to BST')
      + ' on <b>' + esc(ukDateWords(nc.at, false)) + '</b>.</div>'
      + '<table class="an-tbl"><thead><tr><th>Run</th><th class="r">UTC</th><th class="r">UK now</th><th class="r">PKT now</th><th class="r">UK after ' + esc(ukDateWords(nc.at, true)) + '</th></tr></thead><tbody>'
      + rows + '</tbody></table></div>';
  }

  /* ══ THE PATTERN ENGINE'S SETTINGS (owner's brief, 31 Oct, §3) ══════════════════════════════
     The six figures behind the 24-hour pattern, with what each one means in plain words.
     NOTHING HERE IS TYPED. The effective figure is read off the peak page's own answer
     (`plan_rules`), which is what the engine is really deciding on, and whether a key has been set
     at all is read off the config store itself. A figure printed in this file would go on being
     printed after somebody changed it, which is the one fault a settings page cannot have.
     The write is the portal's existing one: adtoolFlags takes any adtool_ key from Management and
     writes it to portal_config with an audit row, which is the same path the page flags use. ══ */
  var PEAK_KEYS = [
    ['adtool_peak_lookback_days', 'lookback_days', 'How far back the pattern is read',
      'The number of days of hourly figures each listing\'s 24-hour shape is read over. A longer window is steadier and slower to notice a change; a shorter one follows the listing but can be swayed by one odd week.', 'days'],
    ['adtool_peak_min_days', 'min_days', 'Days needed before it acts',
      'How many days of hours a listing must have before the pattern is allowed to switch its ad off at all. Short of this the dead hours it finds are put forward as a suggestion and the listing runs on the hours somebody typed.', 'days'],
    ['adtool_peak_dead_min_clicks', 'dead_min_clicks', 'Clicks before an hour counts as dead',
      'An hour only counts as dead once it has spent money or drawn at least this many clicks and sold nothing on every day watched. It stops a quiet hour nobody ever advertised in from reading as an hour that fails.', 'clicks'],
    ['adtool_peak_proven_share', 'proven_share', 'The share that is never switched off',
      'The part of the day holding at least this share of a listing\'s sales is never switched off, whatever its hours look like. It is the floor under the whole thing: the pattern can trim the edges of a listing\'s day and never its middle.', '%'],
    ['adtool_peak_min_block_h', 'min_block_h', 'The shortest stretch worth switching',
      'Nothing is switched for a stretch shorter than this. An ad put back on for one hour and off again is churn on eBay for no gain, and every switch counts against the account\'s daily ceiling.', 'hours'],
    ['adtool_peak_plan_time', 'plan_time', 'When the day ahead is worked out',
      'The UK time the planner writes the next day\'s schedule at. It also runs again at each cut between two parts of the day, for any listing whose shape has moved that day.', '']
  ];
  function flagRow(key) {
    var L = (ST.flags && ST.flags.flags) || [];
    for (var i = 0; i < L.length; i++) { if (L[i] && String(L[i].key) === key) return L[i]; }
    return null;
  }
  function planRules() { return (ST.plan && ST.plan.plan_rules) || null; }
  /* A SETTING THIS PAGE DOES NOT NAME. The planner's own rules are sent as one object, and the six
     above are the ones with words written for them. If the engine ever grows a seventh, a page that
     only knew about six would hide it, and a setting nobody can see is a setting nobody can check.
     So anything else in `plan_rules` is listed too, with its figure and no description, rather than
     left out. The two worked-out fields are skipped: they are not settings, they are the share as a
     fraction and the window the weighting calls recent. */
  var PLAN_DERIVED = { proven_share_of_one: 1, recent_days: 1 };
  function extraRules() {
    var R = planRules(); if (!R) return [];
    var named = {};
    PEAK_KEYS.forEach(function (k) { named[k[1]] = 1; });
    return Object.keys(R).filter(function (f) { return !named[f] && !PLAN_DERIVED[f]; });
  }
  function cfgBlock() {
    var h = '<div class="an-panel"><h3>Pattern engine settings' + src('dead hours', 'how') + '</h3>';
    var R = planRules();
    h += '<div class="an-sub">The six figures behind the 24-hour pattern on ' +
      '<a href="#adtoolPeak?tab=manual" style="color:var(--gold-a);font-weight:800">Peak time listings</a>. ' +
      'They decide when a listing\'s ad is kept paused inside the hours somebody typed for it. The hours stay the ' +
      'envelope whatever these say: the pattern can only switch a listing off inside them, never on outside them.' +
      (ST.plan && ST.plan.plan_rules_text ? ' In the engine\'s own words: ' + esc(String(ST.plan.plan_rules_text)) + '.' : '') +
      '</div>';
    if (!R) {
      h += '<div class="an-note">The figures the engine is deciding on could not be read' +
        (ST.planErr ? ': ' + esc(ST.planErr) : '') + ', so none is shown here. What is stored is still listed below.</div>';
    }
    if (ST.flagsErr) {
      h += '<div class="an-note">The settings store could not be read: ' + esc(ST.flagsErr) + '</div>';
    }
    h += '<table class="st-cfg"><thead><tr><th>Setting</th><th>In force</th><th>Stored</th><th>What it means</th>' +
      (mayEditCfg() ? '<th></th>' : '') + '</tr></thead><tbody>';
    h += PEAK_KEYS.map(function (k) {
      var row = flagRow(k[0]);
      /* IN FORCE comes from the engine; STORED is the config store itself. A key nobody has set is
         not nought: the engine stands on its own figure and the row says so. */
      var live = R && R[k[1]] != null && R[k[1]] !== '' ? String(R[k[1]]) : '';
      return '<tr><td><b>' + esc(k[2]) + '</b><div><code>' + esc(k[0]) + '</code></div></td>' +
        '<td class="v">' + (live ? esc(live) + (k[4] ? ' ' + esc(k[4]) : '') : '<span class="st-unset">not available yet</span>') + '</td>' +
        '<td class="v">' + (row && row.value !== '' && row.value != null
          ? esc(String(row.value)) + (row.updated_at ? '<div class="an-sub" style="margin:2px 0 0;font-weight:400">set ' + esc(String(row.updated_at).slice(0, 16)) + '</div>' : '')
          : '<span class="st-unset">not set, so the engine stands on its own figure</span>') + '</td>' +
        '<td class="w">' + esc(k[3]) + '</td>' +
        (mayEditCfg() ? '<td><button class="an-btn" style="padding:3px 9px;font-size:11px" data-stcfg="' + esc(k[0]) + '"' +
          (ST.busy === k[0] ? ' disabled' : '') + '>Change</button></td>' : '') + '</tr>';
    }).join('');
    h += extraRules().map(function (f) {
      var key = 'adtool_peak_' + f, row = flagRow(key);
      return '<tr><td><b>' + esc(f.replace(/_/g, ' ')) + '</b><div><code>' + esc(key) + '</code></div></td>' +
        '<td class="v">' + esc(String(R[f])) + '</td>' +
        '<td class="v">' + (row && row.value !== '' && row.value != null
          ? esc(String(row.value)) + (row.updated_at ? '<div class="an-sub" style="margin:2px 0 0;font-weight:400">set ' + esc(String(row.updated_at).slice(0, 16)) + '</div>' : '')
          : '<span class="st-unset">not set, so the engine stands on its own figure</span>') + '</td>' +
        '<td class="w"><span class="st-unset">This setting is newer than this page, so there are no words for it here yet. The sentence above, which the engine writes itself, says what it does.</span></td>' +
        (mayEditCfg() ? '<td><button class="an-btn" style="padding:3px 9px;font-size:11px" data-stcfgx="' + esc(key) + '"' +
          (ST.busy === key ? ' disabled' : '') + '>Change</button></td>' : '') + '</tr>';
    }).join('');
    h += '</tbody></table>';
    h += '<div class="an-sub" style="margin-top:8px">' +
      (mayEditCfg()
        ? 'A change is written to the portal\'s own settings with who made it, and the planner picks it up on its next run. <b>Nothing is sent to eBay by changing one of these.</b> They decide what the system wants; the only thing that reaches eBay is the quarter-hourly switch, on an account switched on above.'
        : 'These are read-only for your role. Changing one is for Management and the Ops Head.') +
      (ST.plan && ST.plan.plan_note ? '<br>' + esc(String(ST.plan.plan_note)) + '.' : '') + '</div>';
    return h + '</div>';
  }
  function mayEditCfg() { return isManager(); }
  function cfgAsk(key, label, unit, current) {
    var now = current === '' || current == null ? 'nothing stored' : String(current);
    var typed = prompt(label + '\n\nStored now: ' + now +
      (key === 'adtool_peak_plan_time' ? '\n\nType a UK time as HH:MM, for example 23:30.' : '\n\nType a whole number' + (unit ? ' of ' + unit : '') + '.'), '');
    if (typed == null) return null;
    var v = String(typed).trim();
    if (!v) { toast('Nothing typed, so nothing was changed.'); return null; }
    if (key === 'adtool_peak_plan_time') {
      if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v)) { toast('That is not a UK time as HH:MM.'); return null; }
    } else if (!/^\d{1,4}$/.test(v)) {
      toast('That is not a whole number.'); return null;
    }
    return v;
  }
  function setCfg(key, el) {
    if (ST.busy) return;
    var spec = null;
    for (var i = 0; i < PEAK_KEYS.length; i++) { if (PEAK_KEYS[i][0] === key) spec = PEAK_KEYS[i]; }
    /* a setting the engine has grown since this page was written: it is changed the same way, with
       the key itself standing in for the words nobody has written for it yet */
    if (!spec && /^adtool_peak_[a-z0-9_]+$/.test(String(key))) {
      var f = String(key).replace(/^adtool_peak_/, '').replace(/_/g, ' ');
      spec = [key, '', f, 'This setting is newer than this page, so there are no words for it here. Change it only if you know what it does.', ''];
    }
    if (!spec) { toast('That is not a setting this page can change.'); return; }
    var row = flagRow(key);
    var v = cfgAsk(key, spec[2], spec[4], row ? row.value : '');
    if (v == null) return;
    if (!confirm('Change "' + spec[2] + '" to ' + v + (spec[4] ? ' ' + spec[4] : '') + '?\n\n' + spec[3] +
      '\n\nThe planner picks this up on its next run and every sentence beside it on the pages follows. Nothing is sent to eBay by this.')) return;
    ST.busy = key;
    if (el) el.disabled = true;
    api('adtoolFlags', { set: { key: key, value: v } }).then(function () {
      ST.busy = '';
      toast('Saved: ' + spec[2] + ' is now ' + v);
      /* both reads again: what is stored has changed, and so has what the engine decides on */
      ST.flags = null; ST.plan = null;
      loadCfg();
    })['catch'](function (e) {
      ST.busy = '';
      if (el) el.disabled = false;
      toast((e && e.message) || 'That could not be saved.');
    });
  }
  /* ══ HOW OLD A FIGURE MAY BE BEFORE THE PAGE SAYS SO (owner's brief, 31 Oct, §5) ════════════
     Two figures, and they are the only two: the first turns the badge beside an "as of" time amber,
     the second turns it red and raises the stale alert. They are settings and so they live here,
     beside the pattern engine's own, on the one page where Management changes what this tool does.
     NEITHER IS TYPED. "In force" is what the engine says it is judging on, and "Stored" is the
     settings store itself, so a key nobody has set reads as the engine's own figure rather than as
     nought. A page that printed the figures would go on printing the old ones. ══ */
  var FRESH_KEYS = [
    ['amber_min', 'When a tile says its figure is getting old',
      'The number of minutes after which the badge beside an "as of" time turns amber, on every page that carries one. It is a note to somebody who is already looking: no alert is raised and nobody is told. Set it to the age at which a figure stops being worth deciding on.', 'minutes'],
    ['red_min', 'When somebody is told the figures have stopped arriving',
      'The number of minutes after which the badge turns red AND the stale alert is raised, because the reading everything about today stands on has stopped landing. This is the figure that decides when a person hears about it rather than having to notice, so it is the one that matters. The amber figure is never allowed past this one: a tile cannot be amber and red at once.', 'minutes']
  ];
  function freshRules() { return (ST.flags && ST.flags.freshness_rules) || null; }
  function freshKey(f) { var K = (ST.flags && ST.flags.freshness_keys) || null; return (K && K[f]) || ('adtool_fresh_' + f); }
  function freshBlock() {
    var R = freshRules(), every = num(ST.flags && ST.flags.freshness_every_min);
    var h = '<div class="an-panel"><h3>How old a figure may be before the page says so' + src('FRESHNESS', 'how') + '</h3>' +
      '<div class="an-sub">Every tile on this tool that carries an "as of" time ages it against these two. ' +
      'They move every badge on every page together, because each page reads them off the answer it is drawing rather than carrying them. ' +
      'The red one also decides when the stale alert is raised: the reading of eBay\'s running total for today' +
      (every != null ? ', which the portal asks for every ' + every + ' minutes' : '') +
      ', has stopped landing, and every figure here about today stands on it. ' +
      '<b>Changing either sends nothing to eBay.</b> They decide when this portal says a figure is old.</div>';
    if (!R) {
      h += '<div class="an-note">The figures the engine is judging on could not be read' +
        (ST.flagsErr ? ': ' + esc(ST.flagsErr) : '') + ', so none is shown. What is stored is still listed below.</div>';
    }
    h += '<table class="st-cfg"><thead><tr><th>Setting</th><th>In force</th><th>Stored</th><th>What it means</th>' +
      (mayEditCfg() ? '<th></th>' : '') + '</tr></thead><tbody>';
    h += FRESH_KEYS.map(function (k) {
      var key = freshKey(k[0]), row = flagRow(key);
      var live = R && R[k[0]] != null && R[k[0]] !== '' ? String(R[k[0]]) : '';
      return '<tr><td><b>' + esc(k[1]) + '</b><div><code>' + esc(key) + '</code></div></td>' +
        '<td class="v">' + (live ? esc(live) + ' ' + esc(k[3]) : '<span class="st-unset">not available yet</span>') + '</td>' +
        '<td class="v">' + (row && row.value !== '' && row.value != null
          ? esc(String(row.value)) + (row.updated_at ? '<div class="an-sub" style="margin:2px 0 0;font-weight:400">set ' + esc(String(row.updated_at).slice(0, 16)) + '</div>' : '')
          : '<span class="st-unset">not set, so the engine stands on its own figure</span>') + '</td>' +
        '<td class="w">' + esc(k[2]) + '</td>' +
        (mayEditCfg() ? '<td><button class="an-btn" style="padding:3px 9px;font-size:11px" data-stfresh="' + esc(k[0]) + '"' +
          (ST.busy === key ? ' disabled' : '') + '>Change</button></td>' : '') + '</tr>';
    }).join('');
    h += '</tbody></table><div class="an-sub" style="margin-top:8px">' +
      (mayEditCfg()
        ? 'A change is written to the portal\'s own settings with who made it, and every page picks it up on its next read. Where the amber figure is set past the red one the engine holds it at the red one, so a tile is never both.'
        : 'These are read-only for your role. Changing one is for Management and the Ops Head.') +
      ' The run-by-run record of the reading itself is on <a href="#adtoolHealth" style="color:var(--gold-a);font-weight:800">Data health</a>, under <b>Sampler runs</b>.</div>';
    return h + '</div>';
  }
  function setFresh(f, el) {
    if (ST.busy) return;
    var spec = null;
    for (var i = 0; i < FRESH_KEYS.length; i++) { if (FRESH_KEYS[i][0] === f) spec = FRESH_KEYS[i]; }
    if (!spec) { toast('That is not a setting this page can change.'); return; }
    var key = freshKey(f), row = flagRow(key);
    var now = (row && row.value !== '' && row.value != null) ? String(row.value) : 'nothing stored';
    var typed = prompt(spec[1] + '\n\nStored now: ' + now + '\n\nType a whole number of minutes.', '');
    if (typed == null) return;
    var v = String(typed).trim();
    if (!v) { toast('Nothing typed, so nothing was changed.'); return; }
    if (!/^\d{1,4}$/.test(v) || Number(v) < 1) { toast('That is not a whole number of minutes.'); return; }
    if (!confirm('Change "' + spec[1] + '" to ' + v + ' minutes?\n\n' + spec[2] +
      '\n\nEvery badge on every page follows on its next read. Nothing is sent to eBay by this.')) return;
    ST.busy = key;
    if (el) el.disabled = true;
    api('adtoolFlags', { set: { key: key, value: v } }).then(function () {
      ST.busy = '';
      toast('Saved: ' + spec[1] + ' is now ' + v + ' minutes');
      ST.flags = null; ST.plan = null;
      loadCfg();
    })['catch'](function (e) {
      ST.busy = '';
      if (el) el.disabled = false;
      toast((e && e.message) || 'That could not be saved.');
    });
  }
  function paintCfg() {
    var el = $('stCfg'); if (!el) return;
    el.innerHTML = cfgBlock() + freshBlock();
    var bs = el.querySelectorAll('[data-stcfg]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { setCfg(this.getAttribute('data-stcfg'), this); };
    var xs = el.querySelectorAll('[data-stcfgx]');
    for (var j = 0; j < xs.length; j++) xs[j].onclick = function () { setCfg(this.getAttribute('data-stcfgx'), this); };
    var fs = el.querySelectorAll('[data-stfresh]');
    for (var k = 0; k < fs.length; k++) fs[k].onclick = function () { setFresh(this.getAttribute('data-stfresh'), this); };
  }
  function loadCfg() {
    if (!$('stCfg')) return;
    $('stCfg').innerHTML = '<div class="an-panel"><h3>Pattern engine settings</h3><div class="an-empty">Loading…</div></div>' +
      '<div class="an-panel"><h3>How old a figure may be before the page says so</h3><div class="an-empty">Loading…</div></div>';
    var a = api('adtoolFlags', {}).then(function (D) { ST.flags = D || {}; ST.flagsErr = ''; })
      ['catch'](function (e) { ST.flags = null; ST.flagsErr = (e && e.message) || 'the settings could not be read'; });
    /* the peak page's own answer, for the figures the engine is really deciding on. It can refuse
       (that page has a flag of its own), and the block still shows what is stored. */
    var b = api('adtoolPeak', {}).then(function (D) { ST.plan = D || {}; ST.planErr = ''; })
      ['catch'](function (e) { ST.plan = null; ST.planErr = (e && e.message) || 'the peak page could not be read'; });
    return Promise.all([a, b]).then(function () { paintCfg(); });
  }

  VIEWS.adtoolStop = {
    label: 'Live apply', hidden: true, order: 93, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6"/>',
    render: function () {
      return '<div class="an-wrap"><div class="hgroup enter d1"><h1>Live apply</h1><span class="sub">The only place this tool can change anything on eBay</span></div>' +
        '<div id="stLive"><div class="an-empty">Loading…</div></div><div id="stCfg"></div><div id="stBody"></div></div>';
    },
    init: function () {
      /* a closure outlives a visit: drop both answers on entry so a page re-opened later asks again
         instead of painting a setting somebody has since changed */
      ST.flags = null; ST.plan = null; ST.flagsErr = ''; ST.planErr = ''; ST.busy = '';
      loadLive(); loadCfg(); loadScores();
    }
  };

  /* ── the switches, the caps, the apply log and its undo ──────────────────────────────────── */
  function loadLive() {
    api('adtoolApplyPage', {}).then(function (D) {
      if (!$('stLive')) return;
      var on = {}; (D.switches || []).forEach(function (s) { on[s.key.replace('adtool_apply_live_', '')] = s.value === 'on'; });
      var pre = {}; (D.preflight || []).forEach(function (p) { pre[p.account] = p; });
      var caps = D.caps || {};
      var anyOn = Object.keys(on).filter(function (a) { return on[a]; });
      var h = '<div class="st-live"><h3>Sending changes to eBay' + src('Phase 8', 'live apply') + '</h3><div class="an-sub">' +
        (anyOn.length ? '<b>Live for ' + esc(anyOn.join(', ')) + '.</b> Everything else is written as would-send and not sent.' : '<b>Every account is off, so nothing is being sent to eBay.</b>') +
        /* TWO SENDERS, TWO SEPARATE CEILINGS. The morning and evening runs are held to
           per_account_per_day; the peak switch is held to peak_switches_per_account_per_day of its
           own. They are not one pot shared between them, and a reader who takes them for one will
           expect the peak switch to stop when the morning run has used the day up. */
        ' <b>The morning and evening runs</b> are held to ' + (caps.per_account_per_day != null ? esc(String(caps.per_account_per_day)) : 'a ceiling not in this answer') + ' actions per account per day, ' +
        (caps.bid_changes_per_listing_per_week != null ? esc(String(caps.bid_changes_per_listing_per_week)) : '—') + ' bid changes per listing per week, and send nothing between ' + esc(caps.quiet_hours || '—') +
        '. Every live action can be undone here for 7 days.' +
        /* 28 Oct: the morning and evening runs are no longer the only things that can send. The peak
           switch sends at the hours Management set on its own list, which is exactly why the quiet
           hours do not apply to it, and its rows have their own table below. Saying "nothing
           between 22:00 and 06:00" without this reads as a promise this page can no longer keep. */
        ' <b><a href="#adtoolPeak" style="color:var(--gold-a);font-weight:800">Peak time listings</a> also sends</b>, on an account switched on below: it puts an ad back on at the start of the hours Management set and pauses it at the end, so the quiet hours do not apply to it' +
        (caps.peak_switches_per_account_per_day != null ? ', and it has a <b>separate</b> ceiling of ' + esc(String(caps.peak_switches_per_account_per_day)) + ' switches per account per day' : ', and it keeps a separate ceiling of its own') +
        '. The two ceilings are counted apart, so one running out does not stop the other. Its rows are in <b>Peak switching</b> below.</div>';
      h += '<div style="margin:8px 0">' + (D.accounts || []).map(function (a) {
        return '<span class="st-sw' + (on[a] ? ' on' : '') + '">' + esc(a) + ': <b>' + (on[a] ? 'LIVE' : 'off') + '</b>' +
          (pre[a] ? ' · checked ' + esc(String(pre[a].last_ok).slice(0, 16)) : ' · not checked yet') +
          (isManager() ? ' <button class="an-btn" style="padding:2px 7px;font-size:11px;margin-left:6px" data-sw="' + esc(a) + '" data-on="' + (on[a] ? 0 : 1) + '">' + (on[a] ? 'switch off' : 'switch on') + '</button>' : '') + '</span>';
      }).join('') + '</div>';
      h += '<div class="an-sub">' + esc(D.note || '') + ' A switch cannot be turned on until a read-only check has confirmed that account works.</div>';
      h += '<div class="an-sub" style="margin:14px 0 0;font-weight:800;color:var(--text)">Morning and evening runs</div>';
      h += logTable(D.log, 'nothing sent or rehearsed yet');
      h += peakBlock(D);
      h += '</div>';
      $('stLive').innerHTML = h;
      var sw = document.querySelectorAll('#stLive [data-sw]');
      for (var i = 0; i < sw.length; i++) sw[i].onclick = function () {
        var a = this.getAttribute('data-sw'), o = Number(this.getAttribute('data-on'));
        if (o && !confirm('Switch LIVE apply on for ' + a + '?\n\nFrom the next morning run the tool will pause ads, change bids and change budgets on this account on eBay, within its caps. Every action is logged and can be undone for 7 days.')) return;
        api('adtoolApplyPage', { op: 'switch', account: a, on: o }).then(function () { toast(a + ' ' + (o ? 'LIVE' : 'off')); loadLive(); })['catch'](function (e) { toast(e.message); });
      };
      var un = document.querySelectorAll('#stLive [data-undo]');
      for (var j = 0; j < un.length; j++) un[j].onclick = function () {
        var id = this.getAttribute('data-undo');
        if (!confirm('Undo this action on eBay?')) return;
        /* undoing a peak row does more than put the ad back: the engine turns that listing's own
           switching off (`peak_disarmed`) so the next quarter-hour tick does not simply send the
           same change again. The reader has to be told, or the listing looks as if it stopped on
           its own and nobody knows where to turn it back on. */
        api('adtoolApplyPage', { op: 'undo', id: Number(id) }).then(function (r) {
          toast(r && r.peak_disarmed
            ? 'Undone. This listing\'s own switching has been turned off: turn it back on from Peak time listings.'
            : 'Undone');
          loadLive();
        })['catch'](function (e) { toast(e.message); });
      };
    })['catch'](function (e) { if ($('stLive')) $('stLive').innerHTML = '<div class="an-note">This panel could not load: ' + esc(e && e.message || '') + '</div>'; });
  }

  /* ── the clock, the three scoring panels and the action log ──────────────────────────────── */
  function loadScores() {
    api('adtoolStopToday', {}).then(function (D) {
      if (!$('stBody')) return;
      var rules = D.rule_scores || [], carry = D.carry || [], days = D.days || [], log = D.action_log || [];
      var h = clockPanel();
      h += '<div class="an-grid2"><div class="an-panel"><h3>How each rule has scored, last 30 days' + src('scored daily') + '</h3><div class="an-sub">A rule that falls under the base rate is shown but never applied.</div><table class="an-tbl"><thead><tr><th>Rule</th><th class="r">Decisions</th><th class="r">Right</th><th class="r">Score</th><th>Trusted</th></tr></thead><tbody>' +
        (rules.length ? rules.map(function (r) { return '<tr><td>' + esc(r.rule_id) + '</td><td class="r">' + r.decisions + '</td><td class="r">' + r.right_n + '</td><td class="r">' + (r.score == null ? '—' : Math.round(r.score * 100) + '%') + '</td><td class="' + (r.trusted ? 'an-pos' : 'an-neg') + '">' + (r.trusted ? 'yes' : 'no') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">the first scores land the morning after the first decisions</td></tr>') +
        '</tbody></table></div>';
      h += '<div class="an-panel"><h3>Does each rule repeat?' + src('Mondays', 'checked weekly') + '</h3><div class="an-sub">Each rule is tried on an earlier fortnight and scored on the latest one, against how every spending listing did. A rule that does not repeat is not trusted.</div><table class="an-tbl"><thead><tr><th>Rule</th><th class="r">Selected</th><th class="r">Repeated</th><th class="r">Base rate</th><th class="r">Spend</th><th>Trusted</th></tr></thead><tbody>' +
        (carry.length ? carry.map(function (c) { return '<tr><td>' + esc(c.rule_id) + '</td><td class="r">' + c.selected + '</td><td class="r">' + (c.rate == null ? '—' : c.rate + '%') + '</td><td class="r">' + (c.base_rate == null ? '—' : c.base_rate + '%') + '</td><td class="r">' + gbp(c.spend, 0) + '</td><td class="' + (c.trusted ? 'an-pos' : 'an-neg') + '">' + (c.trusted ? 'yes' : 'not trusted') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="an-empty">checked every Monday</td></tr>') +
        '</tbody></table></div></div>';
      h += '<div class="an-panel"><h3>Days scored</h3><div class="an-sub">Only final scores are counted. A day still waiting on costs or eBay figures is checked again later.</div><table class="an-tbl"><thead><tr><th>Day</th><th class="r">Decisions</th><th class="r">Scored</th><th class="r">Right</th><th class="r">Still updating</th></tr></thead><tbody>' +
        (days.length ? days.map(function (d) { return '<tr><td>' + esc(d.day) + '</td><td class="r">' + d.n + '</td><td class="r">' + d.scored + '</td><td class="r">' + (d.right_n == null || !d.scored ? '—' : d.right_n + ' (' + Math.round(Number(d.right_n) / Number(d.scored) * 100) + '%)') + '</td><td class="r">' + (Number(d.provisional) ? d.provisional : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">—</td></tr>') +
        '</tbody></table></div>';
      h += '<div class="an-panel"><h3>Action log</h3><div class="an-sub">What the team did, in their own words. Notes only.</div>' +
        '<table class="an-tbl"><thead><tr><th>When</th><th>Listing</th><th>Note</th><th>By</th></tr></thead><tbody>' +
        (log.length ? log.map(function (a) { return '<tr><td>' + esc(String(a.at).slice(0, 16)) + '</td><td>' + adtProductCell(a, { compact: true }) + '</td><td>' + esc(a.note) + '</td><td>' + esc(a.by_email) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="an-empty">nothing logged yet</td></tr>') +
        '</tbody></table><div style="margin-top:8px"><button class="an-btn" id="stNote">Log what was done</button></div></div>';
      $('stBody').innerHTML = h;
      var nb = $('stNote');
      if (nb) nb.onclick = function () {
        var id = prompt('Which listing? (item number)');
        if (!id) return;
        id = String(id).replace(/\D/g, '');
        if (!id) { toast('That is not an item number.'); return; }
        var note = prompt('What was done with ' + id + '?');
        if (!note) return;
        api('adtoolStopToday', { op: 'note', item_id: id, note: note, type: 'decision' }).then(function () { toast('Logged'); loadScores(); })['catch'](function (e) { toast(e.message); });
      };
    })['catch'](function (e) { if ($('stBody')) $('stBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'These panels could not load.') + '</div></div>'; });
  }
})();
