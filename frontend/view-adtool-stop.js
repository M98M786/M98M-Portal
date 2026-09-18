/* view-adtool-stop.js — Advertising Tool · Stop today (spec §7, Phases 6 and 8). Hidden; flag adtool_page_stop.
 * Every decision is SHADOW: it is written, scored the next day against what actually happened, and shown with
 * its score. The live-apply panel at the foot is the only place anything can reach eBay, and every account's
 * switch is off until Management turns it on after a read-only preflight. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var ST = { day: '', filter: '' };
  VIEW_CSS.push(
    '.st-d{background:var(--panel);border:1px solid var(--gold-line);border-left:3px solid var(--gold-b);border-radius:12px;padding:10px 12px;margin-bottom:8px}' +
    '.st-d.STOP{border-left-color:#e0563f}.st-d.REDUCE{border-left-color:var(--gold-b)}.st-d.PUSH{border-left-color:var(--gold-a)}' +
    '.st-d .t{font-weight:800;font-size:13px}.st-d .m{font-size:12px;color:var(--text-2);margin-top:3px}' +
    '.st-d .r{font-size:11px;color:var(--text-3);margin-top:3px}' +
    '.st-live{border:1px solid rgba(224,86,63,.45);border-radius:14px;padding:14px 16px;background:rgba(224,86,63,.05)}' +
    '.st-sw{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid var(--gold-line);font-size:12px;margin:0 8px 8px 0}.st-sw.on{border-color:#e0563f;color:#ffb3a6}'
  );
  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'an-neg' : Number(v) > 0 ? 'an-pos' : ''); }
  function src(t) { return '<span class="an-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }

  /* §7: the clock panel. The two batches are fixed in UTC by their crons, so what moves is the local time they
     land at — and on 25 October the UK leaves BST, which shifts both against the working day and pulls the
     boundary batch back onto the previous UK date. Printed from the real cron times rather than typed in, so it
     cannot drift away from what the worker actually does. */
  function clockPanel() {
    var BATCHES = [
      { name: 'Boundary batch', utc: [23, 30], what: 'writes tomorrow\'s decisions before the day starts; it never stops a listing, it holds those for the morning' },
      { name: 'Morning batch', utc: [5, 55], what: 'scores yesterday, then decides today once eBay\'s report has landed' }
    ];
    var fmt = function (hm, tz, when) {
      var d = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate(), hm[0], hm[1]));
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d);
      var get = function (t) { return (p.filter(function (x) { return x.type === t; })[0] || {}).value || ''; };
      return { time: get('hour') + ':' + get('minute'), day: get('weekday') };
    };
    var now = new Date();
    var after = new Date(Date.UTC(2026, 10, 1));          /* any date once the UK is back on GMT */
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
    return '<div class="an-panel" style="margin-bottom:12px"><h3>When the batches run</h3>'
      + '<div class="an-sub">The crons are fixed in UTC, so the local time is what moves. The UK is on <b>'
      + (onBst ? 'BST' : 'GMT') + '</b> today; it returns to GMT on <b>25 October 2026</b>.</div>'
      + '<table class="an-tbl"><thead><tr><th>Batch</th><th class="r">UTC</th><th class="r">UK now</th><th class="r">PKT now</th><th class="r">UK after 25 Oct</th></tr></thead><tbody>'
      + rows + '</tbody></table></div>';
  }

  VIEWS.adtoolStop = {
    label: 'Stop today (ads)', hidden: true, order: 93, roles: ROLES, icon: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6"/>',
    render: function () { return '<div class="an-wrap"><div class="hgroup enter d1"><h1>Stop today</h1><span class="sub">Advertising tool · preview · every decision in shadow, scored the next day against what happened</span></div><div id="stBody"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { load(); }
  };
  function load() {
    api('adtoolStopToday', ST.day ? { day: ST.day } : {}).then(function (D) {
      var counts = {}; D.counts.forEach(function (c) { counts[c.decision] = (counts[c.decision] || 0) + Number(c.n); counts[c.decision + '|' + c.confidence] = Number(c.n); });
      var ySc = D.yesterday_score || {};
      var h = '<div class="an-note" style="margin-bottom:12px"><b>Shadow mode.</b> Nothing on this page has been sent to eBay. Each decision is written, then scored the next morning against the day the listing actually had.' + (D.acceptance ? ' Acceptance: <b>' + esc(D.acceptance.status) + '</b> — ' + esc(D.acceptance.evidence) : '') + '</div>';
      h += '<div class="an-kpis">' + [['Stop', counts.STOP || 0, (counts['STOP|confident'] || 0) + ' confident'], ['Reduce', counts.REDUCE || 0, (counts['REDUCE|confident'] || 0) + ' confident'], ['Push', counts.PUSH || 0, (counts['PUSH|confident'] || 0) + ' confident'], ['Keep', counts.KEEP || 0, 'left alone'], ["Yesterday's score", (ySc.r == null ? '—' : ySc.r + ' of ' + ySc.n), ySc.n ? Math.round(Number(ySc.r) / Number(ySc.n) * 100) + ' % right' : 'nothing scored yet']].map(function (x) { return '<div class="an-kpi"><div class="k">' + esc(x[0]) + '</div><div class="v">' + x[1] + '</div><div class="d">' + esc(x[2]) + '</div></div>'; }).join('') + '</div>';
      h += clockPanel();
      h += '<div class="an-filters">' + [['', 'All'], ['STOP', 'Stop'], ['REDUCE', 'Reduce'], ['PUSH', 'Push']].map(function (x) { return '<button class="' + (ST.filter === x[0] ? 'on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      var rows = D.decisions.filter(function (d) { return !ST.filter || d.decision === ST.filter; });
      h += rows.length ? rows.map(function (d) {
        var i = d.inputs || {};
        return '<div class="st-d ' + esc(d.decision) + '"><div class="t">' + esc(d.decision) + ' · ' + esc(d.item_id) + ' · ' + esc(String(d.title || i.title || '').slice(0, 56)) + ' <span class="an-src">' + esc(d.confidence) + '</span> <span class="an-src">' + esc(d.batch) + '</span></div>' +
          '<div class="m">' + esc(d.action) + ' — ' + esc(d.why) + '</div>' +
          '<div class="r">' + esc(d.account) + ' · rules ' + esc(d.rules.join(', ') || '—') + ' · EV ' + pm(d.expected_value) + ' · 30-day ' + pm(i.d30 ? i.d30.ad_profit : null) + ' on ' + gbp(i.d30 ? i.d30.spend : null, 0) + ' · break-even ' + (i.be ? Number(i.be).toFixed(1) + '×' : '—') + ' · ' + (i.campaigns || 0) + ' live campaign' + ((i.campaigns || 0) === 1 ? '' : 's') + (i.blocked ? ' · <b>blocked:</b> ' + esc(i.blocked) : '') + (d.outcome_score != null ? ' · scored <b>' + (d.outcome_score ? 'right' : 'wrong') + '</b> (' + pm(d.outcome_ad_profit) + ' on the day)' : '') + '</div>' +
          '<div class="mo-alert" style="border:0;padding:6px 0 0;margin:0;background:transparent"><div class="btns"><button data-open="' + esc(d.item_id) + '">Open listing</button><button data-note="' + esc(d.item_id) + '">Log what was done</button></div></div></div>';
      }).join('') : '<div class="an-empty">No decisions for ' + esc(D.day) + ' in this filter.</div>';
      h += '<div class="an-grid2"><div class="an-panel"><h3>Rule scores, trailing 30 days' + src('scored daily') + '</h3><div class="an-sub">A rule that falls under the base rate is shown but never applied.</div><table class="an-tbl"><thead><tr><th>Rule</th><th class="r">Decisions</th><th class="r">Right</th><th class="r">Score</th><th>Trusted</th></tr></thead><tbody>' + (D.rule_scores.length ? D.rule_scores.map(function (r) { return '<tr><td>' + esc(r.rule_id) + '</td><td class="r">' + r.decisions + '</td><td class="r">' + r.right_n + '</td><td class="r">' + (r.score == null ? '—' : Math.round(r.score * 100) + '%') + '</td><td class="' + (r.trusted ? 'an-pos' : 'an-neg') + '">' + (r.trusted ? 'yes' : 'no') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">the first scores land the morning after the first decisions</td></tr>') + '</tbody></table></div>';
      h += '<div class="an-panel"><h3>Carry-forward validation' + src('Mondays · §6.12') + '</h3><div class="an-sub">Each rule applied to days −28…−15 and scored on −14…−1, against the base rate of every spending listing. The review found the Tue/Thu pause rule does not repeat and loses-across-the-week and Sunday winners do.</div><table class="an-tbl"><thead><tr><th>Rule</th><th class="r">Selected</th><th class="r">Repeated</th><th class="r">Base rate</th><th class="r">Spend</th><th>Trusted</th></tr></thead><tbody>' + (D.carry.length ? D.carry.map(function (c) { return '<tr><td>' + esc(c.rule_id) + '</td><td class="r">' + c.selected + '</td><td class="r">' + (c.rate == null ? '—' : c.rate + '%') + '</td><td class="r">' + (c.base_rate == null ? '—' : c.base_rate + '%') + '</td><td class="r">' + gbp(c.spend, 0) + '</td><td class="' + (c.trusted ? 'an-pos' : 'an-neg') + '">' + (c.trusted ? 'yes' : 'not trusted') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="an-empty">runs on Mondays</td></tr>') + '</tbody></table></div></div>';
      h += '<div class="an-panel"><h3>Days scored</h3><table class="an-tbl"><thead><tr><th>Day</th><th class="r">Decisions</th><th class="r">Scored</th><th class="r">Right</th></tr></thead><tbody>' + (D.days.length ? D.days.map(function (d) { return '<tr><td><a href="#" class="st-day" data-d="' + esc(d.day) + '">' + esc(d.day) + '</a></td><td class="r">' + d.n + '</td><td class="r">' + d.scored + '</td><td class="r">' + (d.right_n == null ? '—' : d.right_n + (d.scored ? ' (' + Math.round(Number(d.right_n) / Number(d.scored) * 100) + '%)' : '')) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="an-empty">—</td></tr>') + '</tbody></table></div>';
      h += '<div class="an-panel"><h3>Action log</h3><div class="an-sub">What the team did, in their own words. Notes only.</div><table class="an-tbl"><thead><tr><th>When</th><th>Item</th><th>Note</th><th>By</th></tr></thead><tbody>' + (D.action_log.length ? D.action_log.map(function (a) { return '<tr><td>' + esc(String(a.at).slice(0, 16)) + '</td><td>' + esc(a.item_id) + '</td><td>' + esc(a.note) + '</td><td>' + esc(a.by_email) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="an-empty">nothing logged yet</td></tr>') + '</tbody></table></div>';
      h += '<div id="stLive"></div>';
      $('stBody').innerHTML = h;
      var fs = document.querySelectorAll('#stBody .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { ST.filter = this.getAttribute('data-f'); load(); };
      var ds = document.querySelectorAll('.st-day'); for (var j = 0; j < ds.length; j++) ds[j].onclick = function (e) { e.preventDefault(); ST.day = this.getAttribute('data-d'); load(); };
      var os = document.querySelectorAll('[data-open]'); for (var k = 0; k < os.length; k++) os[k].onclick = function () { try { localStorage.setItem('m98m:adtoolItem', this.getAttribute('data-open')); } catch (e) {} location.hash = 'adtoolProduct'; };
      var ns = document.querySelectorAll('[data-note]'); for (var m = 0; m < ns.length; m++) ns[m].onclick = function () { var id = this.getAttribute('data-note'); var note = prompt('What was done with ' + id + '?'); if (!note) return; api('adtoolStopToday', { op: 'note', item_id: id, note: note, type: 'decision' }).then(function () { toast('Logged'); load(); }).catch(function (e) { toast(e.message); }); };
      loadLive();
    }).catch(function (e) { $('stBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e.message || 'failed') + '</div></div>'; });
  }
  function loadLive() {
    api('adtoolApplyPage', {}).then(function (D) {
      var on = {}; D.switches.forEach(function (s) { on[s.key.replace('adtool_apply_live_', '')] = s.value === 'on'; });
      var pre = {}; D.preflight.forEach(function (p) { pre[p.account] = p; });
      var anyOn = Object.keys(on).filter(function (a) { return on[a]; });
      var h = '<div class="st-live"><h3 style="margin:0 0 4px;font-size:15px;font-weight:800">Live apply' + src('Phase 8') + '</h3><div class="an-sub">' + (anyOn.length ? '<b>Live for ' + esc(anyOn.join(', ')) + '.</b> Everything else is written as would-send and not sent.' : '<b>Every account is off. Nothing on this page has been sent to eBay.</b>') + ' Caps: ' + D.caps.per_account_per_day + ' actions per account per day, ' + D.caps.bid_changes_per_listing_per_week + ' bid changes per listing per week, nothing between ' + esc(D.caps.quiet_hours) + '. Every live action can be undone here for 7 days.</div>';
      h += '<div style="margin:8px 0">' + D.accounts.map(function (a) { return '<span class="st-sw' + (on[a] ? ' on' : '') + '">' + esc(a) + ': <b>' + (on[a] ? 'LIVE' : 'off') + '</b>' + (pre[a] ? ' · preflight ' + esc(String(pre[a].last_ok).slice(0, 16)) : ' · no preflight') + ((STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) ? ' <button class="an-btn" style="padding:2px 7px;font-size:11px;margin-left:6px" data-sw="' + esc(a) + '" data-on="' + (on[a] ? 0 : 1) + '">' + (on[a] ? 'switch off' : 'switch on') + '</button>' : '') + '</span>'; }).join('') + '</div>';
      h += '<div class="an-sub">' + esc(D.note) + ' A switch cannot be turned on until the read-only preflight has confirmed the endpoints for that account against the live API.</div>';
      h += '<table class="an-tbl" style="margin-top:8px"><thead><tr><th>When</th><th>Account</th><th>Item</th><th>Op</th><th>Change</th><th>Mode</th><th>Result</th><th></th></tr></thead><tbody>' + (D.log.length ? D.log.slice(0, 40).map(function (r) { var p = r.payload || {}; return '<tr><td>' + esc(String(r.at).slice(0, 16)) + '</td><td>' + esc(r.account) + '</td><td>' + esc(r.item_id) + '</td><td>' + esc(r.op) + '</td><td>' + esc((p.from != null ? p.from + ' → ' : '') + (p.to != null ? p.to : '')) + '</td><td>' + esc(r.mode) + '</td><td>' + (r.mode === 'live' ? esc(String(r.http_status)) : esc(String(r.response || '').slice(0, 40))) + '</td><td>' + (r.mode === 'live' && !r.undone_at && STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0) ? '<button class="an-btn" style="padding:2px 7px;font-size:11px" data-undo="' + r.id + '">Undo</button>' : (r.undone_at ? 'undone' : '')) + '</td></tr>'; }).join('') : '<tr><td colspan="8" class="an-empty">nothing applied or rehearsed yet</td></tr>') + '</tbody></table></div>';
      $('stLive').innerHTML = h;
      var sw = document.querySelectorAll('[data-sw]'); for (var i = 0; i < sw.length; i++) sw[i].onclick = function () { var a = this.getAttribute('data-sw'), o = Number(this.getAttribute('data-on')); if (o && !confirm('Switch LIVE apply on for ' + a + '?\n\nFrom the next morning batch the tool will pause ads, change bids and change budgets on this account on eBay, within its caps. Every action is logged and can be undone for 7 days.')) return; api('adtoolApplyPage', { op: 'switch', account: a, on: o }).then(function () { toast(a + ' ' + (o ? 'LIVE' : 'off')); loadLive(); }).catch(function (e) { toast(e.message); }); };
      var un = document.querySelectorAll('[data-undo]'); for (var j = 0; j < un.length; j++) un[j].onclick = function () { var id = this.getAttribute('data-undo'); if (!confirm('Undo this action on eBay?')) return; api('adtoolApplyPage', { op: 'undo', id: Number(id) }).then(function () { toast('Undone'); loadLive(); }).catch(function (e) { toast(e.message); }); };
    }).catch(function (e) { $('stLive').innerHTML = '<div class="an-note">Live apply panel unavailable: ' + esc(e.message || '') + '</div>'; });
  }
})();
