/* §20.1 Daily agenda + §20.2 Meetings.
   Views: VIEWS.agenda, VIEWS.meetings.
   Backend: todayAgenda, setAgenda, congratulate, agendaHistory, createMeeting, rsvp, myMeetings, meetingGrid. */
(function () {
'use strict';

/* §26.1 departments and the composer roles of §20.1/§20.2. Hiding a control here is cosmetic —
   the server refuses the same calls from the same roles (RL-1/RL-4). */
var DEPTS = ['Hunting', 'Listing', 'Advertising', 'CS', 'Order Processing'];
var COMPOSER_ROLES = ['Management', 'Ops Head', 'Team Lead'];
var HISTORY_ROLES = ['Management', 'Ops Head'];

/* §20.2 — the two RSVP answers are fixed company copy: button label and stored answer are this text. */
var RSVP_YES = 'Yes sir, I will be there';
var RSVP_NO = "Can't attend (+reason)";

var REFRESH_MS = 60000;
var DEFAULT_DURATION = 30;
var DEFAULT_REMINDERS = '60,10';                 // §20.2 default reminder_offsets

var agenda = null;
var hitSeen = null;        // null until the first payload — so a page load can never celebrate (§25.5)
var composerRows = [];
var historyRows = [];
var people = {};           // email -> name, learned only from payloads this user already holds

var meetings = [];
var gridOpenId = '';
var gridData = null;

VIEW_CSS.push([
  /* .scroll and .minibtn belong to the Royal preview but are not in the shell's stylesheet yet;
     these are the preview's own values, identical in every view module. */
  '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
  '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}',
  '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}',

  '.ag-col{display:grid;gap:16px;align-content:start}',
  '.ag-empty{color:var(--text-3);font-weight:600;font-size:13px;padding:4px 0}',
  '.ag-t{padding:12px 0}',
  '.ag-t+.ag-t{border-top:1px solid var(--gold-line)}',
  '.ag-head{display:flex;align-items:center;gap:9px;flex-wrap:wrap}',
  '.ag-txt{font-weight:700;font-size:13.5px}',
  '.ag-metric{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--blue-2)}',
  '.ag-nums{display:flex;align-items:baseline;gap:6px;margin-top:7px;font-size:13px;font-weight:800;color:var(--text-2)}',
  '.ag-sep{color:var(--text-3);font-weight:700}',
  '.ag-pc{margin-left:auto;font-size:14px;font-weight:800;color:var(--blue-2)}',
  '.ag-bar{position:relative;height:8px;border-radius:99px;background:rgba(120,132,152,.22);margin-top:8px;overflow:hidden}',
  '.ag-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;background:linear-gradient(90deg,var(--blue-deep),var(--blue-2));box-shadow:var(--glow-blue);transition:width .9s cubic-bezier(.2,.8,.2,1)}',
  '.ag-t.hit .ag-fill{background:linear-gradient(90deg,var(--gold-c),var(--gold-a) 52%,var(--gold-b));box-shadow:var(--glow-gold)}',
  '.ag-t.hit .ag-txt{color:var(--gold-a)}',
  '.pill.ag-hit{background:linear-gradient(135deg,rgba(233,169,60,.2),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}',
  '.pill.ag-miss{background:var(--bad-soft);color:var(--bad)}',
  '.ag-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}',
  '.ag-note{padding:9px 0;font-size:13px;font-weight:600;white-space:pre-line}',
  '.ag-note+.ag-note{border-top:1px solid var(--gold-line)}',

  '.medal{display:flex;align-items:flex-start;gap:11px;padding:11px 0}',
  '.medal+.medal{border-top:1px solid var(--gold-line)}',
  '.medal .m-ico{width:28px;height:28px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:14px;background:linear-gradient(135deg,var(--gold-a),var(--gold-c));box-shadow:var(--glow-gold)}',
  '.medal .m-body{flex:1;min-width:0}',
  '.medal .m-text{font-size:13px;font-weight:700}',
  '.medal .m-meta{font-size:11.5px;font-weight:700;color:var(--text-3);margin-top:3px}',

  '.ag-cg{margin-top:10px;padding:12px 13px;border:1px solid var(--gold-line-hi);border-radius:10px;background:rgba(61,155,240,.06)}',
  '.ag-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
  '.ag-lab{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);margin:16px 0 8px}',
  '.ag-hintline{display:block;font-size:11.5px;font-weight:600;color:var(--text-3);margin-top:10px}',
  '.ag-trow{display:grid;grid-template-columns:1fr 92px 200px 34px;gap:8px;align-items:center;margin-bottom:8px}',
  '.ag-trow input,.ag-trow select,.ag-ta{width:100%;padding:9px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}',
  '.ag-trow input:focus,.ag-trow select:focus,.ag-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}',
  '.ag-ta{resize:vertical;min-height:72px}',
  '.ag-hrow{padding:12px 0}',
  '.ag-hrow+.ag-hrow{border-top:1px solid var(--gold-line)}',
  '.ag-hmeta{font-size:11.5px;font-weight:700;color:var(--text-3);margin-top:3px}',
  '.ag-hitem{font-size:12.5px;font-weight:600;color:var(--text-2);padding:3px 0}',

  '.mt-item{padding:14px 0}',
  '.mt-item+.mt-item{border-top:1px solid var(--gold-line)}',
  '.mt-hd{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px}',
  '.mt-title{font-size:14.5px;font-weight:800}',
  '.pill.mt-yes{background:var(--ok-soft);color:var(--ok)}',
  '.pill.mt-no{background:var(--bad-soft);color:var(--bad)}',
  '.pill.mt-wait{background:var(--warn-soft);color:var(--warn)}',
  '.pill.mt-live{background:linear-gradient(135deg,rgba(233,169,60,.2),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}',
  '.mt-soon{animation:mt-pulse 2.4s ease-in-out infinite}',
  '@keyframes mt-pulse{0%,100%{box-shadow:0 0 0 rgba(61,155,240,0)}50%{box-shadow:var(--glow-blue)}}',
  '.mt-rsvp{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}',
  '.mt-reason{margin-top:10px}',
  '.mt-reason input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}',
  '.mt-reason input:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}',
  '.mt-grid{width:100%;border-collapse:collapse;font-size:12.5px;min-width:520px}',
  '.mt-grid th{text-align:left;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);padding:8px 10px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
  '.mt-grid td{padding:9px 10px;border-bottom:1px solid var(--gold-line);font-weight:600}',
  '.mt-counts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}',

  '.ag-confetti{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:60;overflow:hidden}',
  '.ag-cp{position:absolute;top:-16px;width:8px;height:14px;border-radius:2px;background:linear-gradient(180deg,var(--gold-a),var(--gold-c));animation:ag-fall linear forwards}',
  '.ag-cp.b{background:linear-gradient(180deg,var(--blue-2),var(--blue-deep))}',
  '@keyframes ag-fall{to{transform:translateY(106vh) rotate(540deg);opacity:.1}}',

  '@media (max-width:640px){.ag-2col{grid-template-columns:1fr}.ag-trow{grid-template-columns:1fr 1fr 34px}.ag-trow .tr-text{grid-column:1/-1}}'
].join('\n'));

/* ---------- shared helpers ---------- */

/* esc() escapes & < > but leaves quotes, so anything landing in an HTML attribute needs this (RL-3). */
function attr(v) { return esc(v).replace(/"/g, '&quot;'); }
function has(list, v) { return list.indexOf(v) >= 0; }
function myRole() { return (STATE.user && STATE.user.role) || ''; }
function sameEmail(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }
function isMe(email) { return sameEmail(email, STATE.user && STATE.user.email); }
function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function fail(what, e) { toast(what + ' — ' + ((e && e.message) || 'request failed')); }

function dayLabel(ymd) {
  var d = new Date(String(ymd || '') + 'T12:00:00+05:00');
  if (isNaN(d.getTime())) return String(ymd || '');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Karachi' });
}

function countUp(el, to, suffix) {
  if (!el) return;
  to = Number(to) || 0; suffix = suffix || '';
  if (reduceMotion() || !window.requestAnimationFrame) { el.textContent = to + suffix; return; }
  var start = 0;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min(1, (ts - start) / 700);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

/* §25.5 — 110 gold+blue particles, fired ONLY when a target that was not hit becomes hit. */
function celebrate() {
  if (reduceMotion()) return;
  var wrap = document.createElement('div');
  wrap.className = 'ag-confetti';
  for (var i = 0; i < 110; i++) {
    var p = document.createElement('i');
    p.className = 'ag-cp' + (i % 2 ? ' b' : '');
    p.style.left = (Math.random() * 100) + '%';
    p.style.transform = 'rotate(' + Math.round(Math.random() * 360) + 'deg)';
    p.style.animationDelay = (Math.random() * 0.5).toFixed(2) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 1.3).toFixed(2) + 's';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 3400);
}

/* A view has no unmount hook: the timer stops itself once its sentinel leaves the DOM. */
function keepFresh(sentinelId, fn) {
  var t = setInterval(function () {
    if (!document.getElementById(sentinelId)) { clearInterval(t); return; }
    fn();
  }, REFRESH_MS);
}

function learnPerson(email, name) {
  var e = String(email || '').trim();
  if (e.indexOf('@') > 0) people[e] = String(name || '') || e;
}
function paintPeople(listId) {
  var dl = $(listId);
  if (!dl) return;
  var h = '', k;
  for (k in people) {
    if (!people.hasOwnProperty(k)) continue;
    h += '<option value="' + attr(k) + '">' + esc(people[k]) + '</option>';
  }
  dl.innerHTML = h;
}

function audienceSelectHtml(id, withAny, personLabel) {
  var h = '<select id="' + attr(id) + '">';
  if (withAny) h += '<option value="">Any audience</option>';
  h += '<option value="ALL">ALL</option>';
  for (var i = 0; i < DEPTS.length; i++) h += '<option value="' + attr(DEPTS[i]) + '">' + esc(DEPTS[i]) + '</option>';
  h += '<option value="__person">' + esc(personLabel) + '</option></select>';
  return h;
}

/* =====================================================================
   §20.1 — DAILY AGENDA
   ===================================================================== */

VIEWS.agenda = {
  label: 'Daily agenda',
  order: 10,
  roles: '*',
  icon: '<path d="M8 3v3M16 3v3"/><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 11h18"/><path d="M8 15.5l2.2 2.2L16 12"/>',
  render: function () {
    return '<div class="hgroup enter d1"><h1>Daily <span class="goldtext">agenda</span></h1>' +
        '<span class="sub" id="agSub">Loading today’s agenda…</span></div>' +
      '<div class="grid g-2">' +
        '<div class="ag-col enter d2">' +
          '<div class="card"><div class="hd">Today’s targets <span class="hint">live progress</span></div>' +
            '<div class="bd" id="agTargets"><div class="spinner"></div></div></div>' +
          '<div class="card"><div class="hd">Yesterday <span class="hint" id="agYHint"></span></div>' +
            '<div class="bd" id="agYesterday"><div class="ag-empty">Loading…</div></div></div>' +
        '</div>' +
        '<div class="ag-col enter d3">' +
          '<div class="card ideas"><div class="hd">Shoutouts 🎉 <span class="hint">congratulations today</span></div>' +
            '<div class="bd" id="agShoutouts"><div class="ag-empty">Loading…</div></div></div>' +
          '<div class="card"><div class="hd">Notes &amp; announcements</div>' +
            '<div class="bd" id="agNotes"><div class="ag-empty">Loading…</div></div></div>' +
        '</div>' +
      '</div>' +
      '<div id="agComposeWrap"></div><div id="agHistoryWrap"></div>' +
      '<datalist id="agPeopleList"></datalist>';
  },
  init: function () {
    load(false);
    keepFresh('agTargets', function () { load(true); });
  }
};

function load(silent) {
  return api('todayAgenda').then(function (a) {
    agenda = a;
    var s = a.shoutouts || [];
    for (var i = 0; i < s.length; i++) { learnPerson(s[i].from, s[i].from_name); learnPerson(s[i].to, s[i].to_name); }
    paintPeople('agPeopleList');
    paintHeader();
    paintTargets();
    paintYesterday();
    paintShoutouts();
    paintNotes();
    buildComposer();
    checkCelebration();
  }).catch(function (e) {
    if (silent) return;
    var box = $('agTargets');
    if (box) box.innerHTML = '<div class="ag-empty">Could not load the agenda. Nothing was changed.</div>';
    fail('Could not load the agenda', e);
  });
}

/* A hit is only ever announced on a refresh that flips it — never on the first payload (§25.5). */
function checkCelebration() {
  var now = {}, list = (agenda && agenda.targets) || [], i, key, fresh = null;
  for (i = 0; i < list.length; i++) {
    if (!list[i].tracked || !(Number(list[i].progress) >= 100)) continue;
    key = list[i].id || ('#' + i + ':' + list[i].text);
    now[key] = list[i].text;
  }
  if (hitSeen === null) { hitSeen = now; return; }
  for (key in now) { if (now.hasOwnProperty(key) && !hitSeen[key]) fresh = now[key]; }
  hitSeen = now;
  if (fresh) { celebrate(); toast('🎉 Target hit: ' + fresh); }
}

function paintHeader() {
  var sub = $('agSub');
  if (!sub || !agenda) return;
  var dept = (agenda.audience && agenda.audience.dept) || '';
  sub.innerHTML = esc(dayLabel(agenda.date)) + ' · <span class="pill role">' +
    esc(dept === '*' ? 'All departments' : dept) + '</span>';
}

function targetHtml(t, i, isY) {
  var hit = isY ? (t.hit === true) : !!(t.tracked && Number(t.progress) >= 100);
  var missed = isY && t.hit === false;
  var h = '<div class="ag-t' + (hit ? ' hit' : '') + '">' +
    '<div class="ag-head"><span class="ag-txt">' + esc(t.text) + '</span>';
  if (t.metric_label) h += '<span class="ag-metric">' + esc(t.metric_label) + '</span>';
  if (hit) h += '<span class="pill ag-hit">Hit</span>';
  else if (missed) h += '<span class="pill ag-miss">Missed</span>';
  h += '</div>';
  if (t.tracked) {
    h += '<div class="ag-nums"><span class="num ag-val" data-to="' + Number(t.value || 0) + '">0</span>' +
      '<span class="ag-sep">/</span><span class="num">' + Number(t.target || 0) + '</span>' +
      '<span class="ag-pc num' + (hit ? ' goldtext' : '') + '" data-to="' + Number(t.progress || 0) + '">0%</span></div>' +
      '<div class="ag-bar"><span class="ag-fill" data-w="' + Number(t.progress || 0) + '"></span></div>';
  } else if (t.target) {
    h += '<div class="ag-nums"><span class="ag-sep">Target</span><span class="num">' + Number(t.target) + '</span></div>';
  }
  if (hit) {
    h += '<div class="ag-act"><button class="minibtn ag-congrat" data-i="' + i + '" data-y="' + (isY ? 1 : 0) + '">' +
      '🎉 congratulate</button></div>';
  }
  return h + '</div>';
}

function animateBox(box) {
  var i, els = box.querySelectorAll('.ag-fill');
  for (i = 0; i < els.length; i++) {
    (function (el) {
      var w = Number(el.getAttribute('data-w')) || 0;
      setTimeout(function () { el.style.width = w + '%'; }, 40);
    })(els[i]);
  }
  els = box.querySelectorAll('.ag-val');
  for (i = 0; i < els.length; i++) countUp(els[i], els[i].getAttribute('data-to'), '');
  els = box.querySelectorAll('.ag-pc');
  for (i = 0; i < els.length; i++) countUp(els[i], els[i].getAttribute('data-to'), '%');
}

function wireCongrat(box, list) {
  var btns = box.querySelectorAll('.ag-congrat');
  for (var i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        var t = list[Number(btn.getAttribute('data-i'))];
        if (!t) return;
        openCongrat(btn.parentNode.parentNode, t.text, t.id || '');   /* .ag-congrat > .ag-act > .ag-t */
      };
    })(btns[i]);
  }
}

function paintTargets() {
  var box = $('agTargets');
  if (!box) return;
  var list = (agenda && agenda.targets) || [];
  if (!list.length) { box.innerHTML = '<div class="ag-empty">No targets set for today yet.</div>'; return; }
  var h = '';
  for (var i = 0; i < list.length; i++) h += targetHtml(list[i], i, false);
  box.innerHTML = h;
  animateBox(box);
  wireCongrat(box, list);
}

function paintYesterday() {
  var box = $('agYesterday');
  if (!box) return;
  var y = (agenda && agenda.yesterday) || {};
  var hint = $('agYHint');
  if (hint) hint.textContent = y.date ? dayLabel(y.date) : '';
  var list = y.targets || [];
  if (!list.length) { box.innerHTML = '<div class="ag-empty">No targets were set yesterday.</div>'; return; }
  var h = '';
  for (var i = 0; i < list.length; i++) h += targetHtml(list[i], i, true);
  box.innerHTML = h;
  animateBox(box);
  wireCongrat(box, list);
}

function paintShoutouts() {
  var box = $('agShoutouts');
  if (!box) return;
  var list = (agenda && agenda.shoutouts) || [];
  if (!list.length) {
    box.innerHTML = '<div class="ag-empty">No shoutouts yet today — send the first one.</div>';
    return;
  }
  var h = '', i, s;
  for (i = 0; i < list.length; i++) {
    s = list[i];
    h += '<div class="medal"><span class="m-ico">🥇</span><div class="m-body">' +
      '<div class="m-text">' + esc(s.text) + '</div>' +
      '<div class="m-meta">' + esc(s.from_name || s.from) + ' → ' + esc(s.to_name || s.to) +
      (s.at ? ' · ' + esc(fmtPkt(s.at)) : '') + '</div></div>';
    if (s.to && !isMe(s.to)) {
      h += '<button class="minibtn ag-again" data-i="' + i + '">🎉 congratulate</button>';
    }
    h += '</div>';
  }
  box.innerHTML = h;
  var btns = box.querySelectorAll('.ag-again');
  for (i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        var s2 = list[Number(btn.getAttribute('data-i'))];
        if (!s2) return;
        btn.disabled = true;
        sendCongrat(s2.to, '', '', function () { btn.disabled = false; });
      };
    })(btns[i]);
  }
}

function paintNotes() {
  var box = $('agNotes');
  if (!box) return;
  var list = (agenda && agenda.notes) || [];
  if (!list.length) { box.innerHTML = '<div class="ag-empty">Nothing announced today.</div>'; return; }
  var h = '';
  for (var i = 0; i < list.length; i++) h += '<div class="ag-note">' + esc(list[i]) + '</div>';
  box.innerHTML = h;
}

/* §20.1 one-click congratulate. The panel only asks who it is for — the backend refuses a
   congratulation to yourself and refuses a reference that is not real credit already earned. */
function openCongrat(row, prefill, ref) {
  if (!row) return;
  var old = row.querySelector ? row.querySelector('.ag-cg') : null;
  if (old) { old.parentNode.removeChild(old); return; }
  var panel = document.createElement('div');
  panel.className = 'ag-cg';
  panel.innerHTML = '<div class="field"><label>Congratulate (email)</label>' +
      '<input type="email" class="cg-to" list="agPeopleList" placeholder="teammate’s email"></div>' +
    '<div class="field"><label>Message</label><input type="text" class="cg-msg" maxlength="240"></div>' +
    '<div class="ag-act"><button class="btn-gold cg-send">🎉 congratulate</button>' +
    '<button class="btn-ghost cg-cancel">Cancel</button></div>';
  row.appendChild(panel);
  var to = panel.querySelector('.cg-to');
  var msg = panel.querySelector('.cg-msg');
  msg.value = prefill ? String(prefill) : '';
  to.focus();
  panel.querySelector('.cg-cancel').onclick = function () { panel.parentNode.removeChild(panel); };
  panel.querySelector('.cg-send').onclick = function () {
    sendCongrat(to.value, msg.value, ref, null);
  };
}

function sendCongrat(to, text, ref, done) {
  to = String(to || '').trim();
  if (to.indexOf('@') < 1) { toast('Type the email address of the person you are congratulating.'); if (done) done(); return; }
  api('congratulate', { to: to, text: String(text || '').trim(), ref: ref || '' }).then(function () {
    toast('🎉 Congratulations sent.');
    load(true);
  }).catch(function (e) {
    fail('Could not send the congratulation', e);
  }).then(function () { if (done) done(); });
}

/* ---------- composer (Management / Ops Head / Team Lead) ---------- */

function buildComposer() {
  var wrap = $('agComposeWrap');
  if (!wrap) return;
  if (!agenda || !agenda.canCompose) { wrap.innerHTML = ''; return; }
  if (wrap.getAttribute('data-built') === '1') return;
  wrap.setAttribute('data-built', '1');
  if (!composerRows.length) composerRows = [{ id: '', text: '', target: '', metric: '' }];

  wrap.innerHTML = '<div class="grid g-2" style="margin-top:16px">' +
      '<div class="card enter d2"><div class="hd">Compose the agenda ' +
        '<span class="hint">Management · Ops Head · Team Lead</span></div><div class="bd">' +
        '<div class="ag-2col">' +
          '<div class="field"><label>Date</label><input type="date" id="agcDate"></div>' +
          '<div class="field"><label>Audience</label>' + audienceSelectHtml('agcAud', false, 'Person…') + '</div>' +
        '</div>' +
        '<div class="field hidden" id="agcPersonWrap"><label>Person (email)</label>' +
          '<input type="email" id="agcPerson" list="agPeopleList" placeholder="teammate’s email"></div>' +
        '<div class="ag-lab">Day targets</div><div id="agcRows"></div>' +
        '<button class="minibtn" id="agcAdd">+ Add target</button>' +
        '<div class="field"><label>Notes / announcements</label><textarea class="ag-ta" id="agcNotes"></textarea></div>' +
        '<button class="btn-gold" id="agcSave" style="margin-top:14px">Post agenda</button>' +
        '<span class="ag-hintline">Posting replaces the targets and notes for that date and audience. ' +
        'A linked metric fills its bar from your own approved work only.</span>' +
      '</div></div>' +
      '<div class="card ideas enter d3"><div class="hd">Shoutout 🎉 <span class="hint">lands on today’s agenda</span></div><div class="bd">' +
        '<div class="field"><label>To (email)</label><input type="email" id="agcTo" list="agPeopleList" placeholder="teammate’s email"></div>' +
        '<div class="field"><label>Message</label><input type="text" id="agcMsg" maxlength="240"></div>' +
        '<button class="btn-gold" id="agcSend" style="margin-top:14px">🎉 congratulate</button>' +
        '<span class="ag-hintline">Everyone sees it, and the person is notified.</span>' +
      '</div></div>' +
    '</div>';

  $('agcDate').value = agenda.date || '';
  $('agcAud').onchange = function () {
    $('agcPersonWrap').classList.toggle('hidden', this.value !== '__person');
  };
  $('agcAdd').onclick = function () {
    readComposerRows();
    composerRows.push({ id: '', text: '', target: '', metric: '' });
    paintComposerRows();
  };
  $('agcSave').onclick = saveAgenda;
  $('agcSend').onclick = function () {
    var to = $('agcTo'), msg = $('agcMsg');
    sendCongrat(to.value, msg.value, '', function () { to.value = ''; msg.value = ''; });
  };
  paintComposerRows();
  buildHistory();
}

function metricOptions(selected) {
  var list = (agenda && agenda.metrics) || [];
  var h = '<option value="">No linked metric</option>';
  for (var i = 0; i < list.length; i++) {
    h += '<option value="' + attr(list[i].key) + '"' + (list[i].key === selected ? ' selected' : '') + '>' +
      esc(list[i].label) + '</option>';
  }
  return h;
}

function paintComposerRows() {
  var box = $('agcRows');
  if (!box) return;
  var h = '', i, r;
  for (i = 0; i < composerRows.length; i++) {
    r = composerRows[i];
    h += '<div class="ag-trow" data-r="' + i + '">' +
      '<input type="text" class="tr-text" maxlength="200" placeholder="e.g. 20 listings today" value="' + attr(r.text) + '">' +
      '<input type="number" class="tr-num" min="1" step="1" placeholder="No." value="' + attr(r.target) + '">' +
      '<select class="tr-metric">' + metricOptions(r.metric) + '</select>' +
      '<button class="minibtn tr-del" title="Remove">✕</button>' +
      '</div>';
  }
  box.innerHTML = h;
  var dels = box.querySelectorAll('.tr-del');
  for (i = 0; i < dels.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        readComposerRows();
        composerRows.splice(Number(btn.parentNode.getAttribute('data-r')), 1);
        if (!composerRows.length) composerRows = [{ id: '', text: '', target: '', metric: '' }];
        paintComposerRows();
      };
    })(dels[i]);
  }
}

function readComposerRows() {
  var box = $('agcRows');
  if (!box) return;
  var rows = box.querySelectorAll('.ag-trow');
  for (var i = 0; i < rows.length; i++) {
    var idx = Number(rows[i].getAttribute('data-r'));
    if (!composerRows[idx]) continue;
    composerRows[idx].text = rows[i].querySelector('.tr-text').value;
    composerRows[idx].target = rows[i].querySelector('.tr-num').value;
    composerRows[idx].metric = rows[i].querySelector('.tr-metric').value;
  }
}

function saveAgenda() {
  readComposerRows();
  var date = String($('agcDate').value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Pick a date for this agenda.'); return; }
  if (agenda && agenda.date && date < agenda.date) { toast('That date has passed — pick today or a later date.'); return; }

  var aud = $('agcAud').value;
  if (aud === '__person') {
    aud = String($('agcPerson').value || '').trim();
    if (aud.indexOf('@') < 1) { toast('Type the email address of the person this agenda is for.'); return; }
  }

  var targets = [], i, r;
  for (i = 0; i < composerRows.length; i++) {
    r = composerRows[i];
    var text = String(r.text || '').trim();
    var num = String(r.target || '').trim();
    if (!text && !num && !r.metric) continue;
    if (!text) { toast('Every target needs its text.'); return; }
    if (r.metric && !num) { toast('A linked metric needs a number to count towards.'); return; }
    if (num && !(Number(num) > 0)) { toast('A target number must be greater than zero.'); return; }
    targets.push({ id: r.id || '', text: text, target: num === '' ? '' : Number(num), metric: r.metric || '' });
  }

  var btn = $('agcSave');
  btn.disabled = true;
  api('setAgenda', { date: date, audience: aud, targets: targets, notes: String($('agcNotes').value || '') })
    .then(function () {
      toast('Agenda posted for ' + dayLabel(date) + '.');
      composerRows = [{ id: '', text: '', target: '', metric: '' }];
      paintComposerRows();
      $('agcNotes').value = '';
      load(true);
    })
    .catch(function (e) { fail('Could not post the agenda', e); })
    .then(function () { btn.disabled = false; });
}

/* ---------- history browser (agendaHistory is Management-side on the server too) ---------- */

function buildHistory() {
  var wrap = $('agHistoryWrap');
  if (!wrap) return;
  if (!has(HISTORY_ROLES, myRole())) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<div class="card enter d3" style="margin-top:16px">' +
    '<div class="hd">Agenda history <span class="hint">browse by date</span></div><div class="bd">' +
      '<div class="ag-2col">' +
        '<div class="field"><label>From</label><input type="date" id="aghFrom"></div>' +
        '<div class="field"><label>To</label><input type="date" id="aghTo"></div>' +
      '</div>' +
      '<div class="field"><label>Audience</label>' + audienceSelectHtml('aghAud', true, 'Person…') + '</div>' +
      '<div class="field hidden" id="aghPersonWrap"><label>Person (email)</label>' +
        '<input type="email" id="aghPerson" list="agPeopleList" placeholder="teammate’s email"></div>' +
      '<button class="btn-ghost" id="aghGo" style="margin-top:14px">Browse</button>' +
      '<div id="aghOut" style="margin-top:6px"></div>' +
    '</div></div>';
  // Pre-fill BOTH ends. Filling only "To" made the obvious next click send a range with no start,
  // which the server rejected — and the person only saw "request failed".
  $('aghTo').value = agenda.date || '';
  $('aghFrom').value = agDaysBefore(agenda.date, 13);
  $('aghAud').onchange = function () { $('aghPersonWrap').classList.toggle('hidden', this.value !== '__person'); };
  $('aghGo').onclick = browseHistory;
}

function agDaysBefore(ymd, days) {
  var s = String(ymd || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var p = s.split('-');
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  d.setUTCDate(d.getUTCDate() - days);
  var mm = String(d.getUTCMonth() + 1), dd = String(d.getUTCDate());
  return d.getUTCFullYear() + '-' + (mm.length < 2 ? '0' + mm : mm) + '-' + (dd.length < 2 ? '0' + dd : dd);
}

function browseHistory() {
  var payload = {};
  var from = String($('aghFrom').value || '').trim();
  var to = String($('aghTo').value || '').trim();
  // Someone picking the two dates the wrong way round means "show me these two weeks", not an
  // error. Swap them rather than refusing.
  if (from && to && from > to) { var swap = from; from = to; to = swap; $('aghFrom').value = from; $('aghTo').value = to; }
  if (from) payload.from = from;
  if (to) payload.to = to;
  var aud = $('aghAud').value;
  if (aud === '__person') {
    aud = String($('aghPerson').value || '').trim();
    if (aud.indexOf('@') < 1) { toast('Type the email address to filter by.'); return; }
  }
  if (aud) payload.audience = aud;

  var out = $('aghOut');
  out.innerHTML = '<div class="spinner"></div>';
  api('agendaHistory', payload).then(function (res) {
    historyRows = res.agendas || [];
    paintHistory(res);
  }).catch(function (e) {
    out.innerHTML = '<div class="ag-empty">Could not load the history.</div>';
    fail('Could not load the history', e);
  });
}

function paintHistory(res) {
  var out = $('aghOut');
  if (!out) return;
  if (!historyRows.length) {
    out.innerHTML = '<div class="ag-empty">No agendas in ' + esc(res.from) + ' → ' + esc(res.to) + '.</div>';
    return;
  }
  var h = '', i, j, row, t;
  for (i = 0; i < historyRows.length; i++) {
    row = historyRows[i];
    h += '<div class="ag-hrow"><div class="ag-head"><span class="ag-txt">' + esc(dayLabel(row.date)) + '</span>' +
      '<span class="pill role">' + esc(row.audience) + '</span>' +
      '<button class="minibtn agh-load" data-i="' + i + '" style="margin-left:auto">Load into composer</button></div>';
    for (j = 0; j < (row.targets || []).length; j++) {
      t = row.targets[j];
      h += '<div class="ag-hitem">• ' + esc(t.text) + (t.target ? ' — <span class="num">' + Number(t.target) + '</span>' : '') +
        (t.metric ? ' · ' + esc(t.metric) : '') + '</div>';
    }
    if (row.notes) h += '<div class="ag-note">' + esc(row.notes) + '</div>';
    h += '<div class="ag-hmeta">' + (row.shoutouts || []).length + ' shoutout' + ((row.shoutouts || []).length === 1 ? '' : 's') +
      ' · set by ' + esc(row.set_by) + (row.set_at ? ' · ' + esc(fmtPkt(row.set_at, true)) : '') + '</div></div>';
  }
  out.innerHTML = h;
  var btns = out.querySelectorAll('.agh-load');
  for (i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.onclick = function () { loadIntoComposer(historyRows[Number(btn.getAttribute('data-i'))]); };
    })(btns[i]);
  }
}

function loadIntoComposer(row) {
  if (!row || !$('agcRows')) return;
  composerRows = [];
  for (var i = 0; i < (row.targets || []).length; i++) {
    composerRows.push({
      id: row.targets[i].id || '',
      text: row.targets[i].text || '',
      target: row.targets[i].target || '',
      metric: row.targets[i].metric || ''
    });
  }
  if (!composerRows.length) composerRows = [{ id: '', text: '', target: '', metric: '' }];
  paintComposerRows();
  $('agcNotes').value = row.notes || '';
  var aud = String(row.audience || 'ALL');
  var sel = $('agcAud'), known = false;
  for (var j = 0; j < sel.options.length; j++) { if (sel.options[j].value === aud) known = true; }
  if (known) { sel.value = aud; $('agcPersonWrap').classList.add('hidden'); }
  else { sel.value = '__person'; $('agcPersonWrap').classList.remove('hidden'); $('agcPerson').value = aud; }
  $('agcDate').value = (agenda && agenda.date) || '';
  toast('Loaded into the composer — check the date before posting.');
  $('agcDate').scrollIntoView({ block: 'center' });
}

/* =====================================================================
   §20.2 — MEETINGS
   ===================================================================== */

VIEWS.meetings = {
  label: 'Meetings',
  order: 45,
  roles: '*',
  icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M5 3 2.5 5.5M19 3l2.5 2.5"/>',
  render: function () {
    return '<div class="hgroup enter d1"><h1>Meetings</h1>' +
        '<span class="sub">Every time here is Pakistan time (PKT).</span></div>' +
      '<div class="card enter d2"><div class="hd">My upcoming meetings <span class="hint" id="mtHint">…</span></div>' +
        '<div class="bd" id="mtList"><div class="spinner"></div></div></div>' +
      '<div id="mtGridWrap"></div><div id="mtCreateWrap"></div>' +
      '<datalist id="mtPeopleList"></datalist>';
  },
  init: function () {
    loadMeetings(false);
    buildMeetingComposer();
    keepFresh('mtList', function () { loadMeetings(true); });
  }
};

function loadMeetings(silent) {
  return api('myMeetings').then(function (res) {
    meetings = res.meetings || [];
    for (var i = 0; i < meetings.length; i++) learnPerson(meetings[i].created_by, meetings[i].created_by);
    paintPeople('mtPeopleList');
    paintMeetings();
    var pending = 0;
    for (i = 0; i < meetings.length; i++) { if (!meetings[i].myRsvp || !meetings[i].myRsvp.answer) pending++; }
    STATE.counts.meetings = pending;
    if (typeof refreshBadges === 'function') refreshBadges();
    if (gridOpenId) loadGrid(gridOpenId, true);
  }).catch(function (e) {
    if (silent) return;
    var box = $('mtList');
    if (box) box.innerHTML = '<div class="ag-empty">Could not load your meetings.</div>';
    fail('Could not load your meetings', e);
  });
}

function startsIn(min) {
  min = Number(min) || 0;
  if (min < 1) return 'starts now';
  if (min < 60) return 'starts in ' + min + ' min';
  if (min < 1440) return 'starts in ' + Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
  return 'starts in ' + Math.round(min / 1440) + ' day' + (Math.round(min / 1440) === 1 ? '' : 's');
}

function whereHtml(v) {
  var raw = String(v || '');
  if (!raw) return '<span style="color:var(--text-3)">—</span>';
  var url = safeUrl(raw);                       /* RL-3: only http/https ever becomes a link */
  if (!url) return esc(raw);
  return '<a href="' + attr(url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--blue-2);font-weight:700">' + esc(raw) + '</a>';
}

function paintMeetings() {
  var box = $('mtList');
  if (!box) return;
  var hint = $('mtHint');
  if (hint) hint.textContent = meetings.length + (meetings.length === 1 ? ' meeting' : ' meetings');
  if (!meetings.length) {
    box.innerHTML = '<div class="ag-empty">No meetings scheduled for you right now.</div>';
    return;
  }
  var h = '', i, m, ans, state;
  for (i = 0; i < meetings.length; i++) {
    m = meetings[i];
    ans = (m.myRsvp && m.myRsvp.answer) ? String(m.myRsvp.answer) : '';
    state = ans === RSVP_YES ? 'yes' : (ans ? 'no' : 'pending');
    h += '<div class="mt-item" data-i="' + i + '"><div class="mt-hd">' +
      '<span class="mt-title">' + esc(m.title) + '</span>' +
      (state === 'yes' ? '<span class="pill mt-yes">Yes</span>' : '') +
      (state === 'no' ? '<span class="pill mt-no">No</span>' : '') +
      (state === 'pending' ? '<span class="pill mt-wait">Pending</span>' : '') +
      (m.inProgress ? '<span class="pill mt-live">In progress</span>' :
        '<span class="pill mt-wait' + (Number(m.minutesUntil) <= 60 ? ' mt-soon' : '') + '">' + esc(startsIn(m.minutesUntil)) + '</span>') +
      '</div>' +
      '<div class="tl-row"><span class="k">When</span><b>' + esc(fmtPkt(m.datetime_pkt, true)) + ' PKT</b>' +
        '<span style="color:var(--text-3);font-weight:700">· ' + Number(m.duration) + ' min</span></div>' +
      '<div class="tl-row"><span class="k">Where</span>' + whereHtml(m.location_link) + '</div>' +
      '<div class="tl-row"><span class="k">Invited by</span><b>' + esc(m.created_by) + '</b></div>';
    if (ans) {
      h += '<div class="tl-row"><span class="k">My reply</span><b>' + esc(ans) + '</b>' +
        (m.myRsvp.reason ? '<span style="color:var(--text-3);font-weight:700">· ' + esc(m.myRsvp.reason) + '</span>' : '') + '</div>';
    }
    h += '<div class="mt-rsvp">' +
      '<button class="btn-gold mt-yes-btn" data-i="' + i + '">' + esc(RSVP_YES) + '</button>' +
      '<button class="btn-ghost mt-no-btn" data-i="' + i + '">' + esc(RSVP_NO) + '</button>';
    if (m.isCreator || has(HISTORY_ROLES, myRole())) {
      h += '<button class="minibtn mt-grid-btn" data-id="' + attr(m.meeting_id) + '">Attendance grid</button>';
    }
    h += '</div><div class="mt-reason hidden"><input type="text" maxlength="500" placeholder="Reason for not attending"></div></div>';
  }
  box.innerHTML = h;
  wireMeetings(box);
}

function wireMeetings(box) {
  var i, btns = box.querySelectorAll('.mt-yes-btn');
  for (i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        var m = meetings[Number(btn.getAttribute('data-i'))];
        if (!m) return;
        btn.disabled = true;
        sendRsvp(m.meeting_id, RSVP_YES, '', function () { btn.disabled = false; });
      };
    })(btns[i]);
  }
  btns = box.querySelectorAll('.mt-no-btn');
  for (i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        var item = btn.parentNode.parentNode;
        var pane = item.querySelector('.mt-reason');
        var input = pane.querySelector('input');
        var m = meetings[Number(btn.getAttribute('data-i'))];
        if (!m) return;
        if (pane.className.indexOf('hidden') >= 0) {
          pane.classList.remove('hidden');
          input.focus();
          return;
        }
        var reason = String(input.value || '').trim();
        if (!reason) { toast('Add the reason you cannot attend.'); input.focus(); return; }
        btn.disabled = true;
        sendRsvp(m.meeting_id, RSVP_NO, reason, function () { btn.disabled = false; });
      };
    })(btns[i]);
  }
  btns = box.querySelectorAll('.mt-grid-btn');
  for (i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-id');
        if (gridOpenId === id) { gridOpenId = ''; gridData = null; paintGrid(); return; }
        gridOpenId = id;
        loadGrid(id, false);
      };
    })(btns[i]);
  }
}

function sendRsvp(meetingId, answer, reason, done) {
  api('rsvp', { meeting_id: meetingId, answer: answer, reason: reason }).then(function () {
    toast(answer === RSVP_YES ? 'Reply sent: ' + RSVP_YES : 'Reply sent — the organiser has your reason.');
    loadMeetings(true);
  }).catch(function (e) {
    fail('Could not send your reply', e);
  }).then(function () { if (done) done(); });
}

/* ---------- creator's live attendance grid (§20.2: pending / yes / no+reason) ---------- */

function loadGrid(meetingId, silent) {
  var wrap = $('mtGridWrap');
  if (!wrap) return;
  if (!silent) wrap.innerHTML = '<div class="card enter d2" style="margin-top:16px"><div class="bd"><div class="spinner"></div></div></div>';
  api('meetingGrid', { meeting_id: meetingId }).then(function (res) {
    if (gridOpenId !== meetingId) return;
    gridData = res;
    for (var i = 0; i < (res.grid || []).length; i++) learnPerson(res.grid[i].email, res.grid[i].name);
    paintPeople('mtPeopleList');
    paintGrid();
  }).catch(function (e) {
    gridOpenId = ''; gridData = null;
    wrap.innerHTML = '';
    fail('Could not load the attendance grid', e);
  });
}

function paintGrid() {
  var wrap = $('mtGridWrap');
  if (!wrap) return;
  if (!gridOpenId || !gridData) { wrap.innerHTML = ''; return; }
  var g = gridData, c = g.counts || {}, rows = g.grid || [];
  var h = '<div class="card enter d2" style="margin-top:16px">' +
    '<div class="hd">Attendance · ' + esc(g.title) + ' <span class="hint">' + esc(fmtPkt(g.datetime_pkt, true)) + ' PKT</span></div>' +
    '<div class="bd"><div class="mt-counts">' +
      '<span class="pill mt-wait">Pending ' + Number(c.pending || 0) + '</span>' +
      '<span class="pill mt-yes">Yes ' + Number(c.yes || 0) + '</span>' +
      '<span class="pill mt-no">No ' + Number(c.no || 0) + '</span>' +
    '</div>' +
    '<div class="scroll"><table class="mt-grid"><thead><tr><th>Person</th><th>Role</th><th>RSVP</th><th>Reason</th><th>Replied</th></tr></thead><tbody>';
  if (!rows.length) h += '<tr><td colspan="5">No invitees.</td></tr>';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var pill = r.status === 'yes' ? '<span class="pill mt-yes">Yes</span>' :
      (r.status === 'no' ? '<span class="pill mt-no">No</span>' : '<span class="pill mt-wait">Pending</span>');
    h += '<tr><td><b>' + esc(r.name) + '</b></td><td>' + esc(r.role) + '</td><td>' + pill + '</td>' +
      '<td>' + esc(r.reason || '') + '</td><td>' + esc(r.responded_at ? fmtPkt(r.responded_at, true) : '') + '</td></tr>';
  }
  h += '</tbody></table></div>';
  if (g.pending_flagged_at) {
    h += '<div class="ag-hintline">Pending replies were flagged to you at ' + esc(fmtPkt(g.pending_flagged_at, true)) + ' PKT.</div>';
  }
  h += '</div></div>';
  wrap.innerHTML = h;
}

/* ---------- schedule a meeting (Management / Ops Head / Team Lead) ---------- */

function buildMeetingComposer() {
  var wrap = $('mtCreateWrap');
  if (!wrap) return;
  if (!has(COMPOSER_ROLES, myRole())) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<div class="card enter d3" style="margin-top:16px">' +
    '<div class="hd">Schedule meeting <span class="hint">Management · Ops Head · Team Lead</span></div><div class="bd">' +
      '<div class="field"><label>Title</label><input type="text" id="mtTitle" maxlength="200" placeholder="What is this meeting about?"></div>' +
      '<div class="ag-2col" style="margin-top:12px">' +
        '<div class="field"><label>Date &amp; time (PKT)</label><input type="datetime-local" id="mtWhen"></div>' +
        '<div class="field"><label>Duration (minutes)</label><input type="number" id="mtDur" min="5" max="480" step="5" value="' + DEFAULT_DURATION + '"></div>' +
      '</div>' +
      '<div class="ag-2col" style="margin-top:12px">' +
        '<div class="field"><label>Audience</label>' + audienceSelectHtml('mtAud', false, 'Chosen people…') + '</div>' +
        '<div class="field"><label>Reminders (minutes before)</label><input type="text" id="mtRem" value="' + DEFAULT_REMINDERS + '"></div>' +
      '</div>' +
      '<div class="field hidden" id="mtPeopleWrap"><label>People (emails, comma separated)</label>' +
        '<input type="text" id="mtPeople" list="mtPeopleList" placeholder="one@gmail.com, two@gmail.com"></div>' +
      '<div class="field" style="margin-top:12px"><label>Where (place or https link)</label>' +
        '<input type="text" id="mtLoc" maxlength="300" placeholder="Office / https://meet…"></div>' +
      '<button class="btn-gold" id="mtCreate" style="margin-top:16px">Schedule meeting</button>' +
      '<span class="ag-hintline">The time you type is Pakistan time. Everyone invited is notified, ' +
      'and the ⏰ banner opens at the first reminder.</span>' +
    '</div></div>';
  $('mtAud').onchange = function () { $('mtPeopleWrap').classList.toggle('hidden', this.value !== '__person'); };
  $('mtCreate').onclick = createMeeting;
}

function createMeeting() {
  var title = String($('mtTitle').value || '').trim();
  if (!title) { toast('Give the meeting a title.'); return; }
  /* datetime-local yields YYYY-MM-DDTHH:MM and the server reads it as PKT (§20.2) — never a device clock. */
  var when = String($('mtWhen').value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) { toast('Pick the date and time (PKT).'); return; }
  var dur = Number($('mtDur').value || DEFAULT_DURATION);
  if (!(dur >= 5 && dur <= 480)) { toast('Duration must be between 5 and 480 minutes.'); return; }
  var aud = $('mtAud').value;
  if (aud === '__person') {
    aud = String($('mtPeople').value || '').trim();
    if (aud.indexOf('@') < 1) { toast('Type the email addresses of the people to invite.'); return; }
  }

  var btn = $('mtCreate');
  btn.disabled = true;
  api('createMeeting', {
    title: title, datetime_pkt: when, duration: dur, audience: aud,
    location_link: String($('mtLoc').value || '').trim(),
    reminder_offsets: String($('mtRem').value || DEFAULT_REMINDERS).trim()
  }).then(function (res) {
    toast('Meeting scheduled — ' + Number(res.invited) + ' invited and notified.');
    $('mtTitle').value = ''; $('mtWhen').value = ''; $('mtLoc').value = '';
    loadMeetings(true);
  }).catch(function (e) {
    fail('Could not schedule the meeting', e);
  }).then(function () { btn.disabled = false; });
}

})();
