/* view-adtool-morning.js — Advertising Tool · Alerts, Past situation, Data health. Three hidden views.
 * The owner's Change Spec, 28 Oct 2026, took two more off this file: "Today at a glance" is now blocks 2
 * to 5 of the Overview, and "ROAS target" is gone from the portal with the rest of the forecasting.
 * Yesterday's report became PAST SITUATION: the same report for ANY day in the archive, with the 14-day
 * strip, a date box, and that day's advertising signals under it. Galaxy tokens; gold the only accent,
 * #e0563f the only loss colour. Read-only except acknowledge / snooze / rule toggles. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var SLOTS = ['Night 00–06', 'Morning 06–12', 'Afternoon 12–17', 'Evening 17–24'];
  VIEW_CSS.push(
    '.mo-alert{background:var(--panel);border:1px solid var(--gold-line);border-left:3px solid var(--gold-b);border-radius:12px;padding:10px 12px;margin-bottom:8px}' +
    '.mo-alert.high{border-left-color:#e0563f}.mo-alert.medium{border-left-color:var(--gold-b)}.mo-alert.low{border-left-color:rgba(255,255,255,.3)}' +
    '.mo-alert .t{font-weight:800;font-size:13px}.mo-alert .m{font-size:12px;color:var(--text-2);margin-top:3px}' +
    '.mo-alert .btns{margin-top:6px;display:flex;gap:6px}.mo-alert button{background:transparent;border:1px solid var(--gold-line);color:var(--text-2);border-radius:7px;padding:4px 9px;font:inherit;font-size:11.5px;cursor:pointer}.mo-alert button:hover{border-color:var(--gold-b);color:var(--text)}' +
    '.mo-chip{display:inline-block;padding:3px 9px;border-radius:999px;border:1px solid var(--gold-line);background:var(--panel);font-size:11.5px;color:var(--text-2);margin:0 6px 6px 0}.mo-chip.ok{color:var(--gold-a);border-color:rgba(242,176,53,.4)}.mo-chip.bad{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.mo-pick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}' +
    '.mo-pick input{background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:8px;padding:5px 9px;font:inherit;font-size:12px}' +
    /* Phase 4 alerts: five labelled lines + an urgency pill (overdue = loss colour, now = gold, soon = pale gold, watch = muted) */
    '.mo-urg{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap;vertical-align:middle}' +
    '.mo-urg.overdue{color:#fff;background:#e0563f;border-color:#e0563f}.mo-urg.now{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b)}.mo-urg.soon{color:var(--gold-a);border-color:rgba(242,176,53,.45);background:rgba(242,176,53,.1)}.mo-urg.watch{color:var(--text-2)}' +
    '.mo-line{display:grid;grid-template-columns:104px 1fr;gap:8px;font-size:12px;margin-top:5px;align-items:start}' +
    '.mo-line .lb{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;padding-top:1px}.mo-line .vl{color:var(--text-2)}' +
    '.mo-nums{display:flex;gap:5px;flex-wrap:wrap}.mo-nums .n{font-size:10.5px;color:var(--text-2);background:var(--panel-2);border:1px solid var(--gold-line);border-radius:6px;padding:1px 7px}.mo-nums .n b{color:var(--text);font-weight:800}' +
    /* §5 of the 31 Oct brief: the "as of" stamp under a tile and the badge that ages it. THIS FILE'S
       OWN PREFIX. The peak page draws the same badge under its own prefix: a class borrowed across two
       spliced files resolves differently in the two portals, which is the fault the shared-view law
       was written for. */
    '.mo-asof{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:5px;letter-spacing:.02em}' +
    '.mo-fresh{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;border:1px solid var(--gold-line);font-size:10px;font-weight:800;color:var(--text-2);white-space:nowrap}' +
    '.mo-fresh.amber{color:var(--gold-a);border-color:rgba(242,176,53,.5);background:rgba(242,176,53,.1)}' +
    '.mo-fresh.red{color:#fff;background:#e0563f;border-color:#e0563f}' +
    '.mo-srun{font-variant-numeric:tabular-nums}.mo-srun .gap{font-weight:800}.mo-srun .gap.amber{color:var(--gold-a)}.mo-srun .gap.red{color:#ffb3a6}'
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
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  /* a number or nothing: '' and a non-number are nothing, never 0 (Data health reads differences
     that may legitimately be absent, and 0 would read as "they agree") */
  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  /* `t` is the LOOKUP key the register box matches on and must stay stable when the wording changes;
     `shown` is what the reader sees. Rewording arg 1 silently empties the box, so reword arg 2. */
  function src(t, shown) { return '<span class="an-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function hg(t, s) { return '<div class="hgroup enter d1"><h1>' + esc(t) + '</h1><span class="sub">' + esc(s) + '</span></div>'; }
  function fail(id, e) { $(id).innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'failed') + '</div></div>'; }
  function kpi(k, v, d, c) { return '<div class="an-kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (c || '') + '">' + v + '</div><div class="d">' + d + '</div></div>'; }
  function ago(t) { if (!t) return 'never'; var ms = Date.now() - new Date(String(t).replace(' ', 'T') + (String(t).endsWith('Z') ? '' : 'Z')).getTime(); if (isNaN(ms)) return esc(String(t).slice(0, 16)); var m = Math.round(ms / 60000); return m < 60 ? m + ' min ago' : (m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'); }
  /* ── §5 of the 31 Oct brief: "as of HH:MM" under every tile ────────────────────────────────
     THE TWO THRESHOLDS ARE READ OFF THE ANSWER, NEVER TYPED HERE. The engine sends them beside the
     stamps as `freshness_rules`, from the one place they are stored, so the day somebody changes
     either figure in Management every badge on this page follows and nothing has to be edited. A
     page that typed 15 and 60 would go on drawing amber and red at 15 and 60 for ever. */
  function moMins(at) {
    if (!at) return null;
    var s = String(at);
    var d = new Date(s.replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
    return isNaN(d.getTime()) ? null : Math.round((Date.now() - d.getTime()) / 60000);
  }
  function moFreshBadge(at, rules) {
    if (!at) return '';
    var mins = moMins(at);
    if (mins == null) return '<span class="mo-fresh">reading time not understood</span>';
    var amber = num(rules && rules.amber_min), red = num(rules && rules.red_min);
    if (red != null && mins > red) return '<span class="mo-fresh red">' + mins + ' min old</span>';
    if (amber != null && mins > amber) return '<span class="mo-fresh amber">' + mins + ' min old</span>';
    return '';
  }
  /* `st` is the engine's own {as_of, as_of_at} pair. NO STAMP IS NOT MIDNIGHT: a tile with nothing
     behind it says it has no reading rather than printing a time nobody could stand on. */
  function moStamp(st, rules) {
    var S = st || {};
    if (!S.as_of) return '<div class="mo-asof">no reading yet</div>';
    return '<div class="mo-asof">as of ' + esc(String(S.as_of)) + ' UK' + moFreshBadge(S.as_of_at, rules) + '</div>';
  }

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
      h += '<div class="an-panel"><h3>Every check</h3><div class="an-sub">' + ((STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) ? 'Management can turn a check off. It stops firing and its open alerts clear on the next run.' : 'Management can turn checks on and off.') + '</div><table class="an-tbl"><thead><tr><th>Fires when</th><th>Why it matters</th><th>Severity</th><th class="r">Waits before firing again</th><th>What to do</th><th>State</th></tr></thead><tbody>' + D.rules.map(function (r) { return '<tr><td>' + esc(r.text) + '</td><td>' + esc(r.why_matters || r.why || '—') + '</td><td>' + esc(r.sev) + '</td><td class="r">' + r.cool + ' d</td><td>' + esc(r.action) + '</td><td>' + ((STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) ? '<button class="an-btn" style="padding:3px 8px;font-size:11px" data-rule="' + esc(r.rule_id) + '" data-en="' + (r.enabled ? 0 : 1) + '">' + (r.enabled ? 'on' : 'off') + '</button>' : (r.enabled ? 'on' : 'off')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      h += '<div class="an-panel"><h3>History</h3><table class="an-tbl"><thead><tr><th>Check</th><th>Where</th><th>Fired</th><th>Cleared</th><th>Acknowledged</th></tr></thead><tbody>' + (D.history.length ? D.history.map(function (a) { return '<tr><td>' + esc(a.what || ruleText[a.rule || a.rule_id] || 'a check') + '</td><td>' + esc(a.item_id || a.account || '') + '</td><td>' + esc(String(a.fired_at).slice(0, 16)) + '</td><td>' + esc(String(a.cleared_at || '').slice(0, 16) || '—') + '</td><td>' + esc(a.acknowledged_by || '—') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">nothing yet</td></tr>') + '</tbody></table></div>';
      h += '<div class="an-note">Last run: ' + (D.last_run ? esc(String(D.last_run.finished_at).slice(0, 16)) + ' · ' + esc(D.last_run.note) : 'not run yet') + '</div>';
      $('moAl').innerHTML = h;
      var fs = document.querySelectorAll('#moAl .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { AL.sev = this.getAttribute('data-s'); loadAlerts(); };
      var wire = function (attr, fn) { var ns = document.querySelectorAll('[' + attr + ']'); for (var j = 0; j < ns.length; j++) ns[j].onclick = function () { fn(this.getAttribute(attr), this); }; };
      wire('data-ack', function (id) { api('adtoolAlerts', { op: 'ack', alert_id: id }).then(function () { toast('Acknowledged'); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
      wire('data-snooze', function (id) { api('adtoolAlerts', { op: 'snooze', alert_id: id }).then(function () { toast('Snoozed 3 days'); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
      /* 28 Oct, rule 3 of the spec: the item travels in the HASH and nowhere else. This was the last
         place in the portal that stashed it in localStorage, which is what made a second tab open on
         whichever listing the first tab had opened last. */
      wire('data-open', function (id) { location.hash = 'adtoolProduct/' + String(id || '').replace(/\D/g, ''); });
      wire('data-rule', function (rid, el) { api('adtoolAlerts', { op: 'rule', rule_id: rid, enabled: Number(el.getAttribute('data-en')) }).then(function () { toast('Check turned ' + (Number(el.getAttribute('data-en')) ? 'on' : 'off')); loadAlerts(); }).catch(function (e) { toast(e.message); }); });
    }).catch(function (e) { fail('moAl', e); });
  }

  /* ---------------- Past situation ---------------- */
  /* The owner's Change Spec, 28 Oct: the morning report and the advertising signals of the SAME day,
     on one page, laid out as the report. The 14-day strip and the date box move both halves together.
     The report is adtoolReport {day}; the signals come from the staff signal feed, filtered to the
     three advertising types and to the day on screen. That feed holds a window rather than an
     archive, so when it does not reach back to the chosen day the page says so in those words
     instead of printing an empty list that would read as "nothing happened". */
  var SG_ADS_TYPES = ['WORST CPC PERFORMER YESTERDAY', 'WENT NEGATIVE YESTERDAY', 'Wrong Advertising'];
  var RP = { day: '', account: '', sigs: null, sigAt: 0, sigErr: '' };
  VIEWS.adtoolReport = {
    label: 'Past situation', hidden: true, order: 94, roles: ROLES, icon: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h7M9 17h7"/>',
    render: function () { return '<div class="an-wrap">' + hg('Past situation', 'Any day\'s spend, sales, hours, winners, losers and signals') + '<div id="moRp"><div class="an-empty">Loading…</div></div></div>'; },
    /* the page always opens on the newest day it has: a day somebody picked last visit must not
       come back silently a week later */
    init: function () { RP.day = ''; RP.account = ''; RP.sigs = null; RP.sigWindow = null; RP.sigAt = 0; RP.sigErr = ''; loadReport(); }
  };
  /* the feed is the same answer whichever day is on screen, so it is read once a minute and
     filtered here; a refusal is remembered and printed, never swallowed into an empty list */
  function loadSignals() {
    if (RP.sigs && Date.now() - RP.sigAt < 60000) { return Promise.resolve(RP.sigs); }
    return api('mySignals', { include_acked: true }).then(function (d) {
      RP.sigs = (d && d.signals) || []; RP.sigWindow = (d && d.window_from) ? { days: Number(d.window_days) || null, from: String(d.window_from) } : null; RP.sigAt = Date.now(); RP.sigErr = ''; return RP.sigs;
    })['catch'](function (e) { RP.sigs = null; RP.sigErr = (e && e.message) || 'could not be read'; return null; });
  }
  function signalsPanel(day) {
    var head = '<div class="an-panel"><h3>Advertising signals on this day</h3>';
    if (RP.sigErr) { return head + '<div class="an-empty">The signals feed ' + esc(RP.sigErr) + ', so this day\'s signals are not on screen.</div></div>'; }
    var all = RP.sigs || [], i;
    var mine = all.filter(function (s) { return s && SG_ADS_TYPES.indexOf(String(s.type || '')) >= 0; });
    var onDay = mine.filter(function (s) { return String(s.date || '') === String(day || ''); });
    if (onDay.length) {
      /* the Advertising signals page is a company-portal screen: it is spliced into one build and
         not the other, so the link is offered only where the page it points at actually exists */
      var ackHome = (typeof VIEWS === 'object' && VIEWS.adSignals) ? ' They are acknowledged on <a href="#adSignals" style="color:var(--gold-a);font-weight:800">Advertising signals</a>.' : '';
      return head + '<div class="an-sub">' + onDay.length + ' advertising signal' + (onDay.length === 1 ? '' : 's') + ' raised on ' + esc(day) + '.' + ackHome + '</div>' +
        '<div class="an-scroll"><table class="an-tbl"><thead><tr><th>Signal</th><th>Listing</th><th>Account</th><th>Acknowledged by</th></tr></thead><tbody>' +
        onDay.map(function (s) {
          var hist = s.ack_history || [], who = [];
          for (i = 0; i < hist.length; i++) { who.push(String(hist[i].who || '').split('@')[0]); }
          if (!who.length && s.acked_by_me) { who.push('you'); }
          return '<tr><td><b>' + esc(String(s.type || '')) + '</b></td><td>' + adtProductCell(s) + '</td><td>' + esc(String(s.account || '')) + '</td><td>' + (who.length ? esc(who.join(', ')) : '<span class="an-empty" style="padding:0;display:inline">not yet</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    var dates = all.map(function (s) { return String((s && s.date) || ''); }).filter(Boolean).sort();
    if (!dates.length) { return head + '<div class="an-empty">The signals feed is empty just now, so it cannot say what was raised on ' + esc(day) + '.</div></div>'; }
    /* DO NOT CLAIM A WINDOW YOU CANNOT SEE. The dates here are the dates of the signals that happen
       to be open, not the window the feed keeps: a quiet fortnight leaves the oldest signal weeks
       inside a window that reaches much further back, and "it holds A to B" printed that guess as a
       fact. All this page can honestly say is that it holds nothing for the chosen day, and, when
       the chosen day is older than anything it holds, that the feed is a recent window rather than
       an archive. When the engine sends the window it keeps (window_days / window_from on the
       signals answer) that is used instead, and only then is a number printed. */
    var oldest = dates[0];
    var W = RP.sigWindow;
    if (W && W.from && String(day) < W.from) {
      return head + '<div class="an-empty">The signals feed keeps ' + (W.days ? 'the last ' + W.days + ' days' : 'only recent days') +
        ' (from ' + esc(W.from) + '), so it cannot say what was raised on ' + esc(day) + '.</div></div>';
    }
    return head + '<div class="an-empty">No advertising signal is on record for ' + esc(day) + '.' +
      (String(day) < oldest ? ' The feed keeps only recent days.' : '') + '</div></div>';
  }
  function loadReport() {
    var params = {}; if (RP.day) params.day = RP.day; if (RP.account) params.account = RP.account;
    Promise.all([api('adtoolReport', params), loadSignals()]).then(function (res) {
      var D = res[0] || {};
      if (!$('moRp')) { return; }
      if (!D.report) { $('moRp').innerHTML = '<div class="an-panel"><h3>No report yet</h3><div class="an-sub">One is written each morning for the day before.</div></div>'; return; }
      var R = D.report, y = R.fleet;
      /* Never show an older day in silence. The owner opened this page, saw Sunday where he expected
         yesterday, and rightly asked what the hell he was looking at — the page knew and did not say.
         It only applies when NOBODY picked a day: on this page choosing an older day is the point. */
      var h = '';
      if (!RP.day && D.yesterday && D.day !== D.yesterday) {
        h += '<div class="an-note" style="border:1px solid rgba(224,86,63,.5);background:rgba(224,86,63,.08);color:#ffb3a6;margin-bottom:12px">' +
          '<b>This is not yesterday.</b> You are looking at <b>' + esc(D.day) + '</b>. ' +
          (D.yesterday_missing
            ? 'eBay has not sent its report for ' + esc(D.yesterday) + ' yet. It arrives during the morning, and this page moves to it on its own once it does.'
            : 'Yesterday (' + esc(D.yesterday) + ') is in the day picker below.') +
          '</div>';
      }
      /* the last 14 days as a strip, and a date box for anything older. Both move the report AND the
         signals, because this page is one day's whole picture or it is two pages pretending. */
      h += '<div class="an-filters">' + (D.days || []).slice(0, 14).map(function (d) { return '<button class="' + (d.day === D.day ? 'on' : '') + '" data-d="' + esc(d.day) + '">' + esc(d.day) + '</button>'; }).join('') + '</div>';
      h += '<div class="mo-pick"><label for="moRpDate">Another day</label><input type="date" id="moRpDate" value="' + esc(D.day || '') + '"' + (D.yesterday ? ' max="' + esc(D.yesterday) + '"' : '') + '><button class="an-btn" id="moRpGo">Show this day</button>' +
        (RP.day ? '<button class="an-btn" id="moRpBack" style="background:transparent;border:1px solid var(--gold-line);color:var(--text-2)">Back to the latest day</button>' : '') + '</div>';
      /* fleet and account rows carry spend / sales / ROAS only; profit lives on the winner and loser rows (item-level, Sales Analysis law) */
      h += '<div class="an-panel"><h3>' + esc(R.day) + ' · ' + esc(R.weekday) + src('generated ' + String(R.generated_at).slice(11, 16) + ' UTC') + '</h3><div class="an-sub">' + esc((R.sources || []).join(' · ')) + '</div><div class="an-kpis">' + kpi('Spend', gbp(y.spend, 0), (y.attr_units || 0) + ' units from ads') + kpi('ROAS', roas(y.roas), gbp(y.attr_revenue, 0) + ' sales from ads') + kpi('CPC', y.clicks > 0 && y.spend != null ? gbp(Number(y.spend) / Number(y.clicks)) : '—', (y.clicks || 0) + ' clicks') + kpi('Conversion rate', y.clicks > 0 && y.attr_units != null ? (Math.round(Number(y.attr_units) / Number(y.clicks) * 1000) / 10) + '%' : '—', 'units from ads ÷ clicks') + kpi('Orders', String(y.orders || 0), (y.units || 0) + ' units · ' + gbp(y.revenue, 0)) + '</div>' +
        '<div class="an-sub">Against the 7-day average per day: spend ' + (R.vs_7day ? gbp(R.vs_7day.spend) : '—') + ' · ROAS ' + (R.vs_7day ? roas(R.vs_7day.roas) : '—') + '. Same weekday last week: spend ' + (R.vs_same_weekday_last_week ? gbp(R.vs_same_weekday_last_week.spend) : '—') + ' · ROAS ' + (R.vs_same_weekday_last_week ? roas(R.vs_same_weekday_last_week.roas) : '—') + '.' + (R.decisions && R.decisions.note ? ' ' + esc(R.decisions.note) + '.' : '') + '</div>' +
        '<button class="an-btn" id="moPdf">Download PDF</button> <button class="an-btn" id="moSend" style="background:transparent;border:1px solid var(--gold-line);color:var(--text-2)">Send to inbox</button></div>';
      /* the ad status changes line KEEPS its number here, because this is the morning read and the
         number belongs in it. Everything behind it — which ad, which campaign, what time, and which
         of them the tool itself sent — lives on ONE page now, so the bullet points there instead of
         the count being written out a second time further down this same screen. */
      h += '<div class="an-panel"><h3>What changed</h3><ul class="at-list">' + R.what_changed.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') +
        '</ul><div class="an-note" style="margin-top:6px">Every ad and campaign stopped or started on this day, with the time and who sent it, is on <a href="#' + esc(String((R.ad_status_changes && R.ad_status_changes.changes_page) || 'adtoolStopped')) + '" style="color:var(--gold-a);font-weight:800">Activated &amp; Stopped</a>.</div></div>';
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
      h += signalsPanel(D.day);
      /* the ads-switched-on-or-off count used to be restated here as well as in the bullets above.
         One home per number: the bullet keeps it and points at the page that owns the detail. */
      h += '<div class="an-note">Open alerts ' + ((R.open_alerts && R.open_alerts.n) || 0) + ' (' + ((R.open_alerts && R.open_alerts.high) || 0) + ' high) · ' + (R.capped_listings || 0) + ' listings ran out of budget</div>';
      $('moRp').innerHTML = h;
      var fs = document.querySelectorAll('#moRp .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { if (this.hasAttribute('data-d')) { RP.day = this.getAttribute('data-d'); } else if (this.hasAttribute('data-acc')) { RP.account = this.getAttribute('data-acc'); } loadReport(); };
      var go = $('moRpGo'); if (go) go.onclick = function () { var v = ($('moRpDate') || {}).value; if (!v) { toast('Pick a day first.'); return; } RP.day = v; loadReport(); };
      var back = $('moRpBack'); if (back) back.onclick = function () { RP.day = ''; loadReport(); };
      $('moPdf').onclick = function () { var b = this; b.disabled = true; api('adtoolReport', { day: D.day, pdf: 1 }).then(function (r) { var bin = atob(r.pdf_base64); var arr = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k); var blob = new Blob([arr], { type: 'application/pdf' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = r.filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000); b.disabled = false; })['catch'](function (e) { toast(e.message || 'failed'); b.disabled = false; }); };
      $('moSend').onclick = function () { var b = this; b.disabled = true; api('adtoolReport', { day: D.day, send: 1 }).then(function () { toast('Sent to the management inbox'); b.disabled = false; })['catch'](function (e) { toast(e.message); b.disabled = false; }); };
    })['catch'](function (e) { fail('moRp', e); });
  }


  /* ══ SAMPLER RUNS (owner's brief, 31 Oct, §5) ══════════════════════════════════════════════
     eBay publishes no hourly ad figures, so the portal reads its running total for today every few
     minutes, and every figure on this tool that says "today" stands on that reading. The sampler
     keeps no run record of its own: what it leaves behind is one row per account per family for each
     sample that LANDED, and the engine groups the runs back out of those rows. A run that landed
     nothing wrote nothing, so it shows here as a longer gap, which is the honest answer and the
     whole point: the question is not whether the timer fired, it is whether anything arrived.
     NOTHING IS TYPED. The cadence, the window and both thresholds come off the answer. ══ */
  function samplerPanel(SM, RU) {
    var S = SM || {}, runs = S.runs || [];
    var every = num(S.every_min);
    var h = '<div class="an-panel"><h3>Sampler runs' + src('SAMPLER_RUNS', 'how') + '</h3><div class="an-sub">' +
      'The portal reads eBay\'s running total for today' + (every != null ? ' every ' + every + ' minutes' : ' every few minutes') +
      ', and that reading is what every figure here about today stands on. ' +
      '<b>Each run below should start' + (every != null ? ' ' + every + ' minutes' : '') + ' after the one before it.</b> ' +
      'A longer gap is a run that landed nothing, so a stall reads as one long gap rather than as something anybody has to work out. ' +
      'Nothing can land through the small hours, because eBay dates a same-day report on its own Pacific clock and refuses one filed before midnight there' +
      (S.sampling_window ? ', so ' + esc(String(S.sampling_window)) + ' is the only part of the day a gap means anything in' : '') + '.' +
      (S.source ? ' Read from ' + esc(String(S.source)) + ', which is the same record the badges above and the stale alert are judged on, so this panel and that alert cannot disagree.' : '') +
      '</div>';
    if (!runs.length) {
      return h + '<div class="an-empty">No reading has landed yet, so there is no run to show.</div></div>';
    }
    h += '<div class="an-scroll"><table class="an-tbl mo-srun"><thead><tr><th>Started (UK)</th><th class="r">Gap before it</th>' +
      '<th class="r">Samples</th><th class="r">Accounts</th><th class="r">Rows</th><th class="r">Changed</th><th class="r">Spread over</th><th>What landed</th></tr></thead><tbody>';
    h += runs.map(function (r) {
      var gap = num(r.gap_min);
      /* NO GAP IS NOT NOUGHT: the oldest run shown has nothing before it in what was read, and
         printing nought there would read as two runs at the very same minute. */
      var gapCell = gap == null
        ? '<span class="an-sub">none on record</span>'
        : '<span class="gap ' + esc(String(r.gap_verdict === 'red' ? 'red' : (r.gap_verdict === 'amber' ? 'amber' : ''))) + '">' + gap + ' min</span>';
      var dur = num(r.duration_s);
      var corrected = num(r.rows_corrected);
      return '<tr><td>' + esc(String(r.at_uk || '—')) + (r.report_days && r.report_days.length ? '<div class="an-sub" style="margin:2px 0 0">for ' + esc(r.report_days.join(', ')) + '</div>' : '') + '</td>' +
        '<td class="r">' + gapCell + '</td>' +
        '<td class="r">' + (num(r.samples) == null ? '—' : r.samples) + '</td>' +
        '<td class="r">' + (num(r.accounts) == null ? '—' : r.accounts) + '</td>' +
        '<td class="r">' + (num(r.rows) == null ? '—' : r.rows) + '</td>' +
        '<td class="r">' + (num(r.rows_changed) == null ? '—' : r.rows_changed) +
          (corrected ? '<div class="an-sub" style="margin:2px 0 0">' + corrected + ' put right by eBay</div>' : '') + '</td>' +
        '<td class="r">' + (dur == null ? '—' : dur + ' s') + '</td>' +
        '<td' + (r.status === 'empty' ? ' class="an-neg"' : '') + '>' +
          esc(r.status === 'empty' ? 'the report carried no listing' : 'samples landed') + '</td></tr>';
    }).join('');
    h += '</tbody></table></div>';
    h += '<div class="an-sub" style="margin-top:8px">' +
      'The spread is from a run\'s first landed sample to its last, which is as near its length as the record goes: ' +
      'each sample is stamped as it arrives and nothing marks a run\'s end. ' +
      (num(S.ticks_read) != null ? 'Grouped from the last ' + S.ticks_read + ' samples on record. ' : '') +
      '<b>Nothing on this panel reaches eBay.</b></div>';
    return h + '</div>';
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
        /* §5: the two thresholds and the per-tile stamps, both off this answer. An older cached
           payload carries neither, and then every tile reads "no reading yet", which is the honest
           answer for a payload that does not say when it was read. */
        var RU = D.freshness_rules || null, TS = D.tile_stamps || {}, SM = D.sampler || {};
        /* OUTSIDE THE SAMPLING WINDOW NOTHING IS LATE. eBay dates a same-day report task on its own
           Pacific clock and refuses one filed before midnight there, so no reading can land through
           the small hours and a red badge then would be this page crying wolf every night. */
        var smVerdict = SM.in_sampling_window === false ? 'window' : String(SM.verdict || '');
        var h = '<div class="an-kpis">' + kpi('Number checks', failn ? failn + ' FAIL' : pass + ' PASS', (failn ? 'a mismatch holds this page back' : 'every checked number adds up') + moStamp(TS.number_checks, RU), failn ? 'an-neg' : 'an-pos') + kpi('Jobs with errors', String(D.jobs.filter(function (j) { return j.last_status === 'error'; }).length), D.jobs.length + ' jobs watched' + moStamp(TS.jobs, RU)) + kpi('Campaigns we cannot name', String((D.gaps.unresolved_campaign_ids && D.gaps.unresolved_campaign_ids.n) || 0), 'we have no name for these yet' + moStamp(TS.campaigns_unnamed, RU)) + kpi('Orders not costed yet (30 days)', String((D.gaps.pending_cost_orders_30d && D.gaps.pending_cost_orders_30d.n) || 0), 'counted, never guessed' + moStamp(TS.orders_not_costed, RU)) + kpi('Categories filled in', ((D.gaps.categories && D.gaps.categories.filled) || 0) + ' / ' + ((D.gaps.categories && D.gaps.categories.total) || 0), 'active listings, still filling' + moStamp(TS.categories, RU)) +
          /* the sampler's own tile, beside the five it makes the rest of this page possible for */
          kpi('Today\'s readings', SM.age_min == null ? 'none yet' : SM.age_min + ' min ago',
            (smVerdict === 'window'
              ? 'the part of the day eBay will give us a reading in has not started yet'
              : (smVerdict === 'red'
                ? 'past the limit set for it, and the alert ' + esc(String(SM.alert_rule || 'A23')) + ' has been raised'
                : (smVerdict === 'amber' ? 'older than the first limit set for it' : 'landing on time'))) +
            moStamp(SM, RU),
            smVerdict === 'red' ? 'an-neg' : (smVerdict === 'amber' || smVerdict === 'window' ? '' : 'an-pos')) + '</div>';
        h += samplerPanel(SM, RU);
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
