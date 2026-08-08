/* ===================== INBOX — direct messages + notifications (§24, §14) =====================
 * Owns the ONE shared 45s poll (§24): bell, DM badge, inbox lists and the ⏰ meeting banner all
 * ride on api('poll') so the portal stays inside Apps Script quotas.
 * RL-3: message bodies are plain text — they reach the DOM through createTextNode only, and a URL
 * becomes a link only when safeUrl() accepts it (http/https).
 */

VIEW_CSS.push(
  '.ib-tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}' +
  '.ib-tab{display:flex;align-items:center;gap:8px;padding:8px 15px;border-radius:10px;border:1px solid var(--gold-line);font-weight:800;font-size:13px;color:var(--text-2);transition:all .15s}' +
  '.ib-tab:hover{color:var(--blue-2);border-color:var(--blue)}' +
  '.ib-tab.on{color:var(--gold-a);border-color:var(--gold-line-hi);background:linear-gradient(135deg,rgba(233,169,60,.16),rgba(233,169,60,.03));box-shadow:var(--glow-gold)}' +
  '.ib-tab .n{background:linear-gradient(135deg,var(--blue-2),var(--blue-deep));color:#fff;font-size:11px;font-weight:800;padding:1px 8px;border-radius:99px}' +
  /* min-width:0 everywhere a long URL or name could otherwise stretch the whole shell sideways. */
  '.ib-2{display:grid;gap:16px;grid-template-columns:320px 1fr;align-items:start;min-width:0}' +
  '.ib-2>*,.ib-2 .hd,.ib-2 .bd{min-width:0}' +
  '.ib-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.ib-sm{padding:7px 13px;font-size:12.5px}' +
  '.ib-new{margin-top:12px;border-top:1px solid var(--gold-line);padding-top:10px}' +
  '.ib-hint{font-size:11.5px;color:var(--text-3);font-weight:600;line-height:1.5}' +
  '.ib-pick,.ib-thread{display:block;width:100%;text-align:left;padding:9px 11px;border-radius:10px;border:1px solid transparent;transition:all .15s}' +
  '.ib-pick:hover,.ib-thread:hover{background:var(--blue-soft);border-color:rgba(61,155,240,.35)}' +
  '.ib-thread.on{border-color:var(--gold-line-hi);background:linear-gradient(90deg,rgba(233,169,60,.13),transparent)}' +
  '.ib-thread .r1,.ib-thread .r2{display:flex;align-items:center;gap:8px;min-width:0}' +
  '.ib-thread .r2{margin-top:3px}' +
  '.ib-thread .nm{flex:0 1 auto;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}' +
  '.ib-thread .pill.role{flex:none;white-space:nowrap}' +
  '.ib-thread .tm{flex:none;font-size:11px;color:var(--text-3);font-weight:700;white-space:nowrap}' +
  '.ib-thread .pv{flex:1 1 auto;min-width:0;font-size:12px;color:var(--text-3);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.ib-badge{margin-left:auto;background:linear-gradient(135deg,var(--blue-2),var(--blue-deep));color:#fff;font-size:11px;font-weight:800;padding:1px 8px;border-radius:99px;flex:none}' +
  '.ib-msgs{min-height:240px;max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:2px}' +
  '.ib-b{max-width:78%;min-width:0;align-self:flex-start;padding:9px 12px;border-radius:12px;border:1px solid var(--gold-line);background:var(--panel-2);font-size:13.4px;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}' +
  '.ib-b.me{align-self:flex-end;background:var(--blue-soft);border-color:rgba(61,155,240,.4)}' +
  '.ib-b .t{display:block;margin-top:5px;font-size:11px;color:var(--text-3);font-weight:700}' +
  '.ib-b a{color:var(--blue-2);font-weight:700}' +
  '.ib-comp{display:flex;gap:8px;align-items:flex-end;margin-top:12px;border-top:1px solid var(--gold-line);padding-top:12px}' +
  '.ib-comp textarea{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;resize:vertical;min-height:46px;max-height:150px}' +
  '.ib-comp textarea:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
  '.ib-empty{padding:16px 2px;color:var(--text-3);font-weight:600;font-size:12.5px}' +
  '.ib-privacy{margin-top:12px;padding-top:10px;border-top:1px solid var(--gold-line);font-size:11.5px;color:var(--text-3);font-weight:600;line-height:1.55}' +
  '.ib-notif{display:block;width:100%;text-align:left;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line);border-left:3px solid transparent;margin-bottom:8px;transition:all .15s;opacity:.62}' +
  '.ib-notif.unread{opacity:1;border-left-color:var(--blue);background:var(--blue-soft)}' +
  '.ib-notif:hover{border-color:var(--gold-line-hi)}' +
  '.ib-notif .ty{display:block;font-weight:800;font-size:12.5px;color:var(--gold-a)}' +
  '.ib-notif .ms{display:block;margin-top:3px;font-size:13px;font-weight:600}' +
  '.ib-notif .tm{display:block;margin-top:4px;font-size:11px;color:var(--text-3);font-weight:700}' +
  '.ib-back{display:none}' +
  '.iconbtn .dot{position:absolute;top:2px;right:1px;min-width:17px;padding:0 4px;height:17px;line-height:17px;text-align:center;border-radius:99px;font-size:10.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--blue-2),var(--blue-deep));box-shadow:var(--glow-blue)}' +
  /* The alarm sits in a fixed-height top bar: it must shrink, never widen the shell. */
  '.mchip{position:relative;display:inline-flex;align-items:center;gap:8px;min-width:0;max-width:min(58vw,560px);padding:5px 6px 5px 12px;border-radius:99px;border:1px solid var(--gold-line-hi);background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.04));box-shadow:var(--glow-gold);animation:mchipPulse 2.6s ease-in-out infinite}' +
  '@keyframes mchipPulse{0%,100%{box-shadow:0 0 0 0 rgba(233,169,60,.28)}50%{box-shadow:0 0 0 7px rgba(233,169,60,0)}}' +
  '.mchip-head{display:flex;align-items:center;gap:8px;min-width:0;font-size:12.5px;font-weight:800;color:var(--gold-a);white-space:nowrap}' +
  '.mchip-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px}' +
  '.mchip-acts{flex:none}' +
  '.mchip-head .mchip-in{color:var(--text-2);font-weight:700}' +
  '.mchip-acts{display:flex;align-items:center;gap:6px}' +
  '.mchip-b{padding:6px 12px;border-radius:99px;font-size:12px;font-weight:800;white-space:nowrap;border:1px solid var(--gold-line-hi);color:var(--text-2)}' +
  '.mchip-b:hover{color:var(--blue-2);border-color:var(--blue)}' +
  '.mchip-b.on{color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 55%,var(--gold-c));border-color:transparent}' +
  '.ib-ov{position:fixed;inset:0;z-index:60;background:rgba(8,11,18,.62);display:grid;place-items:center;padding:20px}' +
  '.ib-modal{width:min(420px,94vw)}' +
  '@media(max-width:880px){' +
    '.ib-2{grid-template-columns:1fr}' +
    '.ib-2.conv .ib-list{display:none}' +
    '.ib-2.conv .ib-back{display:inline-flex}' +
    '.ib-b{max-width:88%}' +
    '.mchip .mchip-title,.mchip-head .mchip-in{display:none}' +
    '.mchip-acts{display:none;position:absolute;top:42px;right:0;flex-direction:column;align-items:stretch;gap:8px;padding:10px;min-width:236px;border-radius:12px;border:1px solid var(--gold-line-hi);background:linear-gradient(180deg,var(--panel-2),var(--panel));box-shadow:0 14px 40px rgba(0,0,0,.5);z-index:45}' +
    '.mchip.open .mchip-acts{display:flex}' +
  '}'
);

/* §20.2 — these two labels are the RSVP contract with the backend: they are sent as the answer. */
var IB_RSVP_YES = 'Yes sir, I will be there';
var IB_RSVP_NO = "Can't attend (+reason)";
var IB_POLL_MS = 45000;
var IB_POLL_MIN_GAP = 3000;
var IB_NOTIF_KEEP = 40;

var IB = {
  threads: [], byId: {}, pick: [],
  open: '', other: '', otherName: '', otherRole: '',
  msgs: [], notifs: [], readIds: {}, tab: 'dm',
  loaded: false, sending: false,
  busy: false, again: false, lastAt: 0, timer: null, started: false,
  meeting: null, mchipOpen: false
};

VIEWS.inbox = {
  label: 'Inbox',
  icon: '<path d="M3 6.5h18v11H3z"/><path d="m3.7 7.2 8.3 6 8.3-6"/>',
  roles: '*',
  order: 40,
  render: function () {
    return '<div class="hgroup enter d1"><h1>Inbox</h1>' +
        '<span class="sub">Direct messages and your notifications · all times PKT</span></div>' +
      '<div class="ib-tabs enter d1">' +
        '<button class="ib-tab on" id="ibTabDm">Messages <span class="n hidden" id="ibTabDmN"></span></button>' +
        '<button class="ib-tab" id="ibTabNt">Notifications <span class="n hidden" id="ibTabNtN"></span></button>' +
      '</div>' +
      '<div id="ibDmPane">' +
        '<div class="ib-2" id="ibWrap">' +
          '<div class="card ib-list enter d2"><div class="hd">Conversations <span class="hint" id="ibListHint">loading…</span></div>' +
            '<div class="bd">' +
              '<button class="btn-ghost ib-sm" id="ibNewBtn">New message</button>' +
              '<div class="ib-new hidden" id="ibNew">' +
                '<div class="ib-hint">Management can message anyone, and any team member can message any other team member. Pick a recent conversation or type a colleague’s company email — the portal only delivers to approved staff.</div>' +
                '<div class="field"><label>Send to</label><input id="ibNewTo" placeholder="Name or company email" autocomplete="off"></div>' +
                '<div id="ibPick"></div>' +
              '</div>' +
              '<div id="ibThreads" style="margin-top:10px"><div class="spinner"></div></div>' +
              '<div class="ib-privacy" id="ibPrivacy"></div>' +
            '</div>' +
          '</div>' +
          '<div class="card ib-conv enter d3">' +
            '<div class="hd"><button class="btn-ghost ib-sm ib-back" id="ibBack">Back</button>' +
              '<span id="ibConvName">Conversation</span><span class="hint ib-meta" id="ibConvMeta">pick a conversation</span></div>' +
            '<div class="bd">' +
              '<div class="ib-msgs" id="ibMsgs"><div class="ib-empty">Open a conversation on the left, or start a new one.</div></div>' +
              '<div class="ib-comp hidden" id="ibComp">' +
                '<textarea id="ibInput" placeholder="Write a message — Enter sends, Shift+Enter makes a new line" maxlength="4000"></textarea>' +
                '<button class="btn-gold" id="ibSendBtn">Send</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="ibNtPane" class="hidden">' +
        '<div class="card enter d2"><div class="hd">Notifications <span class="hint">newest first</span>' +
          '<button class="btn-ghost ib-sm" id="ibMarkAll" style="margin-left:12px">Mark all as read</button></div>' +
          '<div class="bd" id="ibNotifList"><div class="spinner"></div></div></div>' +
      '</div>';
  },
  init: function () {
    /* §24, honest privacy note — the portal rule and its real technical limit, both stated. */
    $('ibPrivacy').textContent = 'Private: a DM is visible only to its two participants — no role, ' +
      'including Management, gets a portal screen for reading someone else’s thread. Honest limit: the ' +
      'MESSAGES tab lives in the Portal DB spreadsheet owned by Hasib’s Google account, so that file’s ' +
      'owner could always open the raw sheet. Nothing is ever deleted — history is kept permanently.';

    $('ibTabDm').onclick = function () { ibTab('dm'); };
    $('ibTabNt').onclick = function () { ibTab('nt'); };
    $('ibNewBtn').onclick = function () {
      var box = $('ibNew'), openNow = box.classList.contains('hidden');
      box.classList.toggle('hidden');
      if (openNow) { ibDrawPicker(); $('ibNewTo').focus(); }
    };
    $('ibNewTo').oninput = ibDrawPicker;
    $('ibBack').onclick = function () { $('ibWrap').classList.remove('conv'); };
    $('ibSendBtn').onclick = ibSend;
    $('ibInput').onkeydown = function (e) {
      if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey) { e.preventDefault(); ibSend(); }
    };
    $('ibMarkAll').onclick = ibMarkAllRead;

    $('ibThreads').onclick = function (e) {
      var b = ibClosest(e.target, 'ib-thread'); if (!b) return;
      var t = IB.threads[Number(b.getAttribute('data-i'))]; if (!t) return;
      ibOpen(t.thread_id, t.other);
    };
    $('ibPick').onclick = function (e) {
      var b = ibClosest(e.target, 'ib-pick'); if (!b) return;
      var email = IB.pick[Number(b.getAttribute('data-p'))]; if (!email) return;
      $('ibNew').classList.add('hidden'); $('ibNewTo').value = '';
      ibOpen('', email);
    };
    $('ibNotifList').onclick = function (e) {
      var b = ibClosest(e.target, 'ib-notif'); if (!b) return;
      ibNotifTap(Number(b.getAttribute('data-n')));
    };

    ibDrawThreads(); ibDrawNotifs(); ibDrawTabCounts();
    if (IB.open) { ibDrawHead(); ibDrawMsgs(); }

    api('listThreads').then(function (d) {
      IB.loaded = true;
      ibMergeThreads(d.threads || [], true);
      ibDrawThreads();
    })['catch'](function () {
      if ($('ibThreads')) $('ibThreads').innerHTML = '<div class="ib-empty">Conversations could not be loaded. They will appear on the next refresh.</div>';
    });
    ibPollNow();
  }
};

/* ---------- polling: ONE call for bell + inbox + meeting banner (§24) ---------- */

function startPolling() {
  if (IB.started) return;
  IB.started = true;
  if (!STATE.counts) STATE.counts = {};
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { ibClearTimer(); return; }
    ibPollNow();
  });
  var bell = $('bellBtn');
  if (bell) bell.onclick = function () { ibGoInbox('nt'); };
  ibPollNow();
}

function ibClearTimer() { if (IB.timer) { clearTimeout(IB.timer); IB.timer = null; } }

function ibSchedule() {
  ibClearTimer();
  if (document.hidden) return;
  IB.timer = setTimeout(ibPollNow, IB.again ? IB_POLL_MIN_GAP : IB_POLL_MS);
}

/** Overlapping polls are the quota risk here: one in flight at a time, the next scheduled only
 *  after the previous settles, nothing scheduled while the tab is hidden, and the refreshes that
 *  actions ask for are coalesced so a burst of clicks cannot become a burst of calls. */
function ibPollNow() {
  if (IB.busy) { IB.again = true; return; }
  if (document.hidden || !STATE.idToken) return;
  var wait = IB_POLL_MIN_GAP - (ibNowMs() - IB.lastAt);
  if (wait > 0) { ibClearTimer(); IB.timer = setTimeout(ibPollNow, wait); return; }
  IB.busy = true; IB.again = false;
  ibClearTimer();
  api('poll').then(function (d) {
    ibSettle();
    try { ibApplyPoll(d || {}); } catch (e) {}
    ibSchedule();
  })['catch'](function () {
    ibSettle();
    ibSchedule();
  });
}

function ibSettle() { IB.busy = false; IB.lastAt = ibNowMs(); }

function ibApplyPoll(d) {
  if (!STATE.counts) STATE.counts = {};
  STATE.counts.notifications = d.unreadNotif || 0;
  STATE.counts.inbox = d.unreadDm || 0;
  if (typeof refreshBadges === 'function') refreshBadges();
  ibBell(d.unreadNotif || 0);
  ibDmChip(d.unreadDm || 0);
  ibMergeThreads(d.threads || [], false);
  ibMergeNotifs(d.notifications || []);
  ibMeetingChip(d.meetings || null);
  if (ibMounted()) { ibDrawThreads(); ibDrawNotifs(); ibDrawTabCounts(); ibReloadOpenIfNew(); }
}

function ibBell(n) {
  var el = $('bellDot'); if (!el) return;
  el.textContent = n > 99 ? '99+' : String(n);
  el.classList.toggle('hidden', !n);
}

/** §24: the unread DM count sits in the top bar beside the ⏰/bell. The shell has no slot for it,
 *  so this module creates the chip once and keeps it updated. */
function ibDmChip(n) {
  var chip = $('dmChip');
  if (!chip) {
    var bell = $('bellBtn'); if (!bell || !bell.parentNode) return;
    chip = document.createElement('button');
    chip.className = 'iconbtn'; chip.id = 'dmChip'; chip.title = 'Messages';
    chip.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6.5h18v11H3z"/><path d="m3.7 7.2 8.3 6 8.3-6"/></svg>' +
      '<span class="dot hidden" id="dmDot">0</span>';
    chip.onclick = function () { ibGoInbox('dm'); };
    bell.parentNode.insertBefore(chip, bell);
  }
  var dot = $('dmDot'); if (!dot) return;
  dot.textContent = n > 99 ? '99+' : String(n);
  dot.classList.toggle('hidden', !n);
}

function ibGoInbox(tab) {
  IB.tab = tab || 'dm';
  var a = document.querySelector('.nav a[data-key="inbox"]');
  if (a) { a.click(); ibTab(IB.tab); }
}

/* ---------- ⏰ meeting alarm chip (§20.2) ---------- */

function ibMeetingChip(m) {
  var slot = $('meetingChip'); if (!slot) return;
  IB.meeting = m;
  if (!m || !m.meeting_id) { slot.innerHTML = ''; IB.mchipOpen = false; return; }
  var mins = Number(m.minutesUntil || 0);
  var when = mins <= 0 ? 'now' : 'in ' + mins + ' min';
  var yesOn = m.myRsvp === IB_RSVP_YES ? ' on' : '';
  var noOn = m.myRsvp === IB_RSVP_NO ? ' on' : '';
  slot.innerHTML = '<span class="mchip' + (IB.mchipOpen ? ' open' : '') + '" id="mchip">' +
      '<button class="mchip-head" id="mchipHead">⏰ <b class="mchip-title">' + esc(m.title) + '</b>' +
        '<span class="mchip-in num">' + esc(when) + '</span></button>' +
      '<span class="mchip-acts">' +
        '<button class="mchip-b' + yesOn + '" id="mchipYes">' + esc(IB_RSVP_YES) + '</button>' +
        '<button class="mchip-b' + noOn + '" id="mchipNo">' + esc(IB_RSVP_NO) + '</button>' +
      '</span></span>';
  $('mchipHead').onclick = function () {
    IB.mchipOpen = !IB.mchipOpen;
    $('mchip').classList.toggle('open', IB.mchipOpen);
  };
  $('mchipYes').onclick = function () { ibRsvp(m.meeting_id, IB_RSVP_YES, ''); };
  $('mchipNo').onclick = function () { ibRsvpAskReason(m.meeting_id, m.title); };
}

function ibRsvp(meetingId, answer, reason) {
  api('rsvp', { meeting_id: meetingId, answer: answer, reason: reason || '' }).then(function () {
    IB.mchipOpen = false;
    toast('Sent to the meeting organiser: ' + answer);
    ibPollNow();
  })['catch'](function (e) { toast('RSVP not sent: ' + e.message); });
}

function ibRsvpAskReason(meetingId, title) {
  var ov = document.createElement('div');
  ov.className = 'ib-ov';
  ov.innerHTML = '<div class="card ib-modal"><div class="hd">' + esc(IB_RSVP_NO) + '</div><div class="bd">' +
    '<div class="ib-hint">' + esc(title) + '</div>' +
    '<div class="field"><label>Reason</label><input id="ibRsvpWhy" maxlength="500" placeholder="Why you can’t attend"></div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
      '<button class="btn-gold" id="ibRsvpSend">Send</button>' +
      '<button class="btn-ghost" id="ibRsvpCancel">Cancel</button></div>' +
    '</div></div>';
  document.body.appendChild(ov);
  var close = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
  ov.onclick = function (e) { if (e.target === ov) close(); };
  $('ibRsvpCancel').onclick = close;
  $('ibRsvpSend').onclick = function () {
    var why = ibTrim($('ibRsvpWhy').value);
    if (!why) { toast('A reason is required to decline.'); return; }
    close();
    ibRsvp(meetingId, IB_RSVP_NO, why);
  };
  $('ibRsvpWhy').focus();
}

/* ---------- threads ---------- */

function ibMounted() { return !!$('ibThreads'); }

function ibMergeThreads(list, authoritative) {
  if (authoritative) { IB.threads = []; IB.byId = {}; }
  list.forEach(function (t) {
    var id = String(t.thread_id || ''); if (!id) return;
    var cur = IB.byId[id];
    if (cur) {
      cur.name = t.name; cur.role = t.role; cur.other = t.other;
      cur.unread = t.unread; cur.last_at = t.last_at; cur.last_from = t.last_from; cur.preview = t.preview;
    } else {
      IB.byId[id] = t; IB.threads.push(t);
    }
  });
  IB.threads.sort(function (a, b) { return ibMs(b.last_at) - ibMs(a.last_at); });
}

function ibDrawThreads() {
  var box = $('ibThreads'); if (!box) return;
  var hint = $('ibListHint');
  if (hint) hint.textContent = IB.threads.length ? (IB.threads.length + (IB.threads.length === 1 ? ' conversation' : ' conversations')) : (IB.loaded ? 'none yet' : 'loading…');
  if (!IB.threads.length) {
    box.innerHTML = '<div class="ib-empty">' + (IB.loaded ? 'No conversations yet — “New message” starts one.' : 'Loading…') + '</div>';
    return;
  }
  var h = '';
  IB.threads.forEach(function (t, i) {
    h += '<button class="ib-thread' + (t.thread_id === IB.open ? ' on' : '') + '" data-i="' + i + '">' +
        '<span class="r1"><span class="nm">' + esc(t.name || t.other) + '</span>' +
          (t.role ? '<span class="pill role">' + esc(t.role) + '</span>' : '') +
          (t.unread ? '<span class="ib-badge">' + esc(String(t.unread)) + '</span>' : '') + '</span>' +
        '<span class="r2"><span class="pv">' + (t.last_from && t.last_from === ibMe() ? 'You: ' : '') + esc(t.preview || '') + '</span>' +
          '<span class="tm num">' + esc(fmtPkt(t.last_at, true)) + '</span></span>' +
      '</button>';
  });
  box.innerHTML = h;
}

function ibDrawPicker() {
  var input = $('ibNewTo'); if (!input) return;
  var q = ibTrim(input.value).toLowerCase();
  var rows = [], h = '';
  IB.pick = [];
  IB.threads.forEach(function (t) {
    var hay = ((t.name || '') + ' ' + (t.other || '')).toLowerCase();
    if (!q || hay.indexOf(q) >= 0) rows.push(t);
  });
  rows.forEach(function (t) {
    IB.pick.push(t.other);
    h += '<button class="ib-pick" data-p="' + (IB.pick.length - 1) + '">' +
        '<span class="nm" style="font-weight:800;font-size:13px">' + esc(t.name || t.other) + '</span>' +
        (t.role ? ' <span class="pill role">' + esc(t.role) + '</span>' : '') +
      '</button>';
  });
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(q) && ibKnown(q) < 0) {
    IB.pick.push(q);
    h += '<button class="ib-pick" data-p="' + (IB.pick.length - 1) + '">' +
        '<span style="font-weight:800;font-size:13px">Start a conversation with ' + esc(q) + '</span></button>';
  }
  $('ibPick').innerHTML = h || '<div class="ib-empty">No match yet — type the full company email to start a new conversation.</div>';
}

function ibKnown(email) {
  for (var i = 0; i < IB.threads.length; i++) {
    if (String(IB.threads[i].other || '').toLowerCase() === email) return i;
  }
  return -1;
}

/* ---------- conversation ---------- */

function ibOpen(threadId, other) {
  if (!threadId && other && other.toLowerCase() === ibMe()) { toast('You can’t message yourself.'); return; }
  IB.open = threadId || ''; IB.other = other || '';
  IB.otherName = ''; IB.otherRole = ''; IB.msgs = [];
  var t = threadId ? IB.byId[threadId] : null;
  if (t) { IB.otherName = t.name; IB.otherRole = t.role; }
  var wrap = $('ibWrap'); if (wrap) wrap.classList.add('conv');
  ibDrawHead();
  if ($('ibMsgs')) $('ibMsgs').innerHTML = '<div class="spinner"></div>';
  ibDrawThreads();

  var payload = threadId ? { threadId: threadId } : { 'with': other };
  api('threadMessages', payload).then(function (d) {
    IB.open = d.thread_id;
    IB.other = (d.other && d.other.email) || IB.other;
    IB.otherName = (d.other && d.other.name) || IB.other;
    IB.otherRole = (d.other && d.other.role) || '';
    IB.msgs = d.messages || [];
    ibDrawHead(); ibDrawMsgs();
    var cur = IB.byId[IB.open];
    if (cur) { cur.unread = 0; ibDrawThreads(); }
    return api('markThreadRead', { threadId: IB.open });
  }).then(function () { ibPollNow(); })['catch'](function (e) {
    if ($('ibMsgs')) $('ibMsgs').innerHTML = '<div class="ib-empty">' + esc('This conversation could not be opened: ' + e.message) + '</div>';
  });
}

function ibDrawHead() {
  var n = $('ibConvName'), m = $('ibConvMeta'), c = $('ibComp');
  if (!n || !m) return;
  if (!IB.other) {
    n.textContent = 'Conversation'; m.textContent = 'pick a conversation';
    if (c) c.classList.add('hidden');
    return;
  }
  n.innerHTML = esc(IB.otherName || IB.other) + (IB.otherRole ? ' <span class="pill role">' + esc(IB.otherRole) + '</span>' : '');
  m.innerHTML = '<span class="mono">' + esc(IB.other) + '</span> · PKT';
  if (c) c.classList.remove('hidden');
}

function ibDrawMsgs() {
  var box = $('ibMsgs'); if (!box) return;
  box.innerHTML = '';
  if (!IB.msgs.length) {
    var e = document.createElement('div');
    e.className = 'ib-empty';
    e.textContent = 'No messages in this conversation yet.';
    box.appendChild(e);
    return;
  }
  IB.msgs.forEach(function (msg) {
    var b = document.createElement('div');
    b.className = 'ib-b' + (msg.mine ? ' me' : '');
    var body = document.createElement('span');
    ibLinkify(body, msg.body == null ? '' : String(msg.body));
    var t = document.createElement('span');
    t.className = 't';
    t.textContent = fmtPkt(msg.sent_at, true) + (msg.mine && msg.read_at ? ' · Read' : '');
    b.appendChild(body); b.appendChild(t);
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}

/** RL-3: the body never touches innerHTML. Text goes in as text nodes; only a run that safeUrl()
 *  accepts (http/https) becomes an anchor. */
function ibLinkify(el, text) {
  var re = /(https?:\/\/[^\s<>"']+)/gi, last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
    var raw = m[1].replace(/[.,;:!?)\]]+$/, '');
    var href = safeUrl(raw);
    if (href) {
      var a = document.createElement('a');
      a.href = href; a.textContent = raw;
      a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
      el.appendChild(a);
    } else {
      el.appendChild(document.createTextNode(raw));
    }
    last = m.index + raw.length;
    re.lastIndex = last;
  }
  if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
}

function ibSend() {
  var ta = $('ibInput'); if (!ta || IB.sending) return;
  var v = ibTrim(ta.value);
  if (!v) return;
  if (!IB.other) { toast('Pick who this goes to first.'); return; }
  IB.sending = true;
  var btn = $('ibSendBtn'); if (btn) btn.disabled = true;
  api('sendMessage', { to: IB.other, body: v }).then(function (res) {
    IB.sending = false; if (btn) btn.disabled = false;
    ta.value = '';
    IB.open = res.thread_id || IB.open;
    IB.msgs.push({ msg_id: res.msg_id, from: ibMe(), to: IB.other, body: v, sent_at: res.sent_at, read_at: '', mine: true });
    ibDrawMsgs();
    ibPollNow();
  })['catch'](function (e) {
    IB.sending = false; if (btn) btn.disabled = false;
    toast('Not sent: ' + e.message);
  });
}

function ibReloadOpenIfNew() {
  if (!IB.open) return;
  var t = IB.byId[IB.open];
  if (!t || !t.unread) return;
  api('threadMessages', { threadId: IB.open }).then(function (d) {
    IB.msgs = d.messages || [];
    ibDrawMsgs();
    t.unread = 0; ibDrawThreads();
    return api('markThreadRead', { threadId: IB.open });
  })['catch'](function () {});
}

/* ---------- notifications (§14) ---------- */

/** A poll already in flight when the user taps "read" would otherwise hand back a stale unread
 *  list: what this session has marked read stays read. */
function ibMergeNotifs(fresh) {
  var seen = {}, out = [];
  fresh.forEach(function (n) {
    var id = String(n.notif_id || ''); if (!id || seen[id]) return;
    seen[id] = 1; n._read = !!IB.readIds[id]; out.push(n);
  });
  IB.notifs.forEach(function (n) {
    var id = String(n.notif_id || '');
    if (!id || seen[id] || !n._read) return;
    seen[id] = 1; out.push(n);
  });
  out.sort(function (a, b) { return ibMs(b.created_at) - ibMs(a.created_at); });
  IB.notifs = out.slice(0, IB_NOTIF_KEEP);
}

function ibDrawNotifs() {
  var box = $('ibNotifList'); if (!box) return;
  if (!IB.notifs.length) { box.innerHTML = '<div class="ib-empty">No new notifications.</div>'; return; }
  var h = '';
  IB.notifs.forEach(function (n, i) {
    h += '<button class="ib-notif' + (n._read ? '' : ' unread') + '" data-n="' + i + '">' +
        '<span class="ty">' + esc(n.type) + '</span>' +
        '<span class="ms">' + esc(n.message) + '</span>' +
        '<span class="tm num">' + esc(fmtPkt(n.created_at, true)) + '</span>' +
      '</button>';
  });
  box.innerHTML = h;
}

function ibNotifTap(i) {
  var n = IB.notifs[i]; if (!n) return;
  var ref = String(n.ref || '');
  if (!n._read) {
    n._read = true; IB.readIds[n.notif_id] = 1;
    ibDrawNotifs(); ibDrawTabCounts();
    api('markNotifRead', { notifId: n.notif_id }).then(function () { ibPollNow(); })['catch'](function (e) {
      n._read = false; delete IB.readIds[n.notif_id];
      ibDrawNotifs(); ibDrawTabCounts(); toast('Could not mark read: ' + e.message);
    });
  }
  if (ref.indexOf('dm:') === 0) { ibTab('dm'); ibOpen(ref.slice(3), ''); }
}

function ibMarkAllRead() {
  api('markNotifRead', { all: true }).then(function () {
    IB.notifs.forEach(function (n) { n._read = true; IB.readIds[n.notif_id] = 1; });
    ibDrawNotifs(); ibDrawTabCounts();
    ibPollNow();
  })['catch'](function (e) { toast('Could not mark all read: ' + e.message); });
}

/* ---------- small helpers ---------- */

function ibTab(which) {
  IB.tab = which === 'nt' ? 'nt' : 'dm';
  if (!ibMounted()) return;
  $('ibDmPane').classList.toggle('hidden', IB.tab !== 'dm');
  $('ibNtPane').classList.toggle('hidden', IB.tab !== 'nt');
  $('ibTabDm').classList.toggle('on', IB.tab === 'dm');
  $('ibTabNt').classList.toggle('on', IB.tab === 'nt');
}

function ibDrawTabCounts() {
  var dm = $('ibTabDmN'), nt = $('ibTabNtN');
  if (dm) {
    var d = (STATE.counts && STATE.counts.inbox) || 0;
    dm.textContent = String(d); dm.classList.toggle('hidden', !d);
  }
  if (nt) {
    var u = 0;
    IB.notifs.forEach(function (n) { if (!n._read) u++; });
    nt.textContent = String(u); nt.classList.toggle('hidden', !u);
  }
}

function ibClosest(el, cls) {
  while (el && el !== document.body) {
    if (el.classList && el.classList.contains(cls)) return el;
    el = el.parentNode;
  }
  return null;
}

function ibMe() { return String((STATE.user && STATE.user.email) || '').toLowerCase(); }
function ibNowMs() { return (new Date()).getTime(); }
function ibTrim(s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); }
function ibMs(v) { var t = Date.parse(String(v || '')); return isNaN(t) ? 0 : t; }
