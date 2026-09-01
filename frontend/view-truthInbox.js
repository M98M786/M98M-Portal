/* view-truthInbox.js — TRUTH v2 WO-12: the staff inbox rebuilt on D1 (engine inboxThreads /
 * inboxThread / inboxSend / inboxPoll). Registers ONLY when TRUTH_FLAGS.inbox === 'live';
 * until the flip the old sheet inbox keeps the page. Loads after view-inbox.js so the live
 * registration replaces it. Optimistic send, 30-message pages, 30-second delta polling —
 * no full reloads, ever. A thread is readable only by its two participants (server-enforced). */
(function () {
  'use strict';

  if (typeof TRUTH_FLAGS === 'undefined' || TRUTH_FLAGS.inbox !== 'live') { return; }

  var IX = { peer: '', threads: [], cursor: '', lastSeen: '', pollT: null, names: {}, pane: 'dm' };

  VIEW_CSS.push(
    '.ix-wrap{display:grid;grid-template-columns:280px 1fr;gap:14px;min-height:60vh}' +
    '@media (max-width:900px){.ix-wrap{grid-template-columns:1fr}}' +
    '.ix-list{border:1px solid var(--gold-line);border-radius:13px;background:var(--panel-2);overflow:auto;max-height:72vh}' +
    '.ix-th{padding:11px 13px;border-bottom:1px solid var(--gold-line);cursor:pointer}' +
    '.ix-th:hover{background:var(--panel)}' +
    '.ix-th.on{background:var(--panel);border-left:3px solid var(--gold)}' +
    '.ix-th .w{font-size:12.5px;font-weight:800;display:flex;gap:8px;align-items:center}' +
    '.ix-th .p{font-size:11px;color:var(--text-3);font-weight:600;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ix-un{min-width:18px;height:18px;border-radius:9px;background:var(--gold);color:#1a1206;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;margin-left:auto}' +
    '.ix-pane{border:1px solid var(--gold-line);border-radius:13px;background:var(--panel-2);display:flex;flex-direction:column;max-height:72vh}' +
    '.ix-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px}' +
    '.ix-m{max-width:76%;padding:8px 12px;border-radius:12px;font-size:12.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}' +
    '.ix-m.me{align-self:flex-end;background:var(--gold-soft,rgba(233,169,60,.14));border:1px solid var(--gold-line-hi)}' +
    '.ix-m.them{align-self:flex-start;background:var(--panel);border:1px solid var(--gold-line)}' +
    '.ix-m .t{font-size:9.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.ix-m.ghost{opacity:.55}' +
    '.ix-send{display:flex;gap:8px;padding:10px;border-top:1px solid var(--gold-line)}' +
    '.ix-send textarea{flex:1;min-height:40px;max-height:120px;padding:9px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12.5px;resize:vertical}' +
    '.ix-skel{height:14px;border-radius:7px;background:var(--panel);margin:10px 13px;animation:ixp 1.2s ease-in-out infinite alternate}' +
    '.ix-tabs{display:flex;gap:6px;margin-bottom:10px}' +
    '.ix-tab{flex:1;border:1px solid var(--gold-line);border-radius:10px;padding:7px 10px;background:var(--panel);font-size:11.5px;font-weight:800;cursor:pointer;color:var(--text-2);text-align:center}' +
    '.ix-tab.on{border-color:var(--gold);color:var(--gold);background:var(--panel-2)}' +
    '.ix-nt{padding:10px 13px;border-bottom:1px solid var(--gold-line);cursor:pointer}' +
    '.ix-nt.unread{border-left:3px solid var(--gold)}' +
    '.ix-nt .ty{font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:var(--text-3)}' +
    '.ix-nt .bd2{font-size:11.5px;font-weight:600;margin-top:3px;color:var(--text-2)}' +
    '@keyframes ixp{from{opacity:.35}to{opacity:.85}}'
  );

  function ixS(v) { return String(v == null ? '' : v); }
  function ixWhen(iso) { var s = ixS(iso); return s ? (fmtPkt(s, true) || s.slice(5, 16).replace('T', ' ')) : ''; }
  function ixMe() { return ixS(STATE.user && STATE.user.email).toLowerCase(); }
  function ixName(email) {
    var e = ixS(email).toLowerCase();
    return (IX.names && IX.names[e]) || e.split('@')[0];
  }

  function ixBadge(n) {
    try {
      STATE.counts.inbox = n;
      if (typeof refreshBadges === 'function') { refreshBadges(); }
    } catch (e) {}
  }

  function ixPaintThreads() {
    var box = $('ixThreads');
    if (!box || IX.pane === 'nt') { return; }
    if (!IX.threads.length) {
      box.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--text-3);font-weight:600">No conversations yet — pick a person below and say hello.</div>';
      return;
    }
    box.innerHTML = IX.threads.map(function (t) {
      return '<div class="ix-th' + (t.with === IX.peer ? ' on' : '') + '" data-ix-peer="' + esc(t.with) + '">' +
        '<div class="w">' + esc(ixName(t.with)) + (t.unread ? '<span class="ix-un">' + t.unread + '</span>' : '') + '</div>' +
        '<div class="p">' + (t.last_from === ixMe() ? 'you: ' : '') + esc(ixS(t.last_preview)) + '</div>' +
        '<div class="p" style="font-size:9.5px">' + esc(ixWhen(t.last_at)) + '</div></div>';
    }).join('');
    box.querySelectorAll('[data-ix-peer]').forEach(function (el) {
      el.onclick = function () { ixOpen(this.getAttribute('data-ix-peer')); };
    });
  }

  function ixMsgHtml(m, ghost) {
    var mine = ixS(m.from_email).toLowerCase() === ixMe();
    return '<div class="ix-m ' + (mine ? 'me' : 'them') + (ghost ? ' ghost' : '') + '" data-ix-mid="' + esc(ixS(m.msg_id)) + '">' +
      esc(ixS(m.body)) + '<div class="t">' + (ghost ? 'sending…' : esc(ixWhen(m.sent_at))) + '</div></div>';
  }

  function ixOpen(peer, keepScroll) {
    IX.peer = ixS(peer).toLowerCase();
    ixPaintThreads();
    var pane = $('ixMsgs'), head = $('ixWith');
    if (head) { head.textContent = ixName(IX.peer); }
    if (!pane) { return; }
    if (!keepScroll) { pane.innerHTML = '<div class="ix-skel"></div><div class="ix-skel" style="width:60%"></div><div class="ix-skel" style="width:75%"></div>'; }
    api('inboxThread', { with: IX.peer }).then(function (d) {
      if (!$('ixMsgs') || IX.peer !== ixS(peer).toLowerCase()) { return; }
      IX.cursor = d.cursor || '';
      var more = d.more ? '<button class="minibtn" id="ixMore" style="align-self:center">Earlier messages</button>' : '';
      pane.innerHTML = more + (d.messages || []).map(function (m) { return ixMsgHtml(m); }).join('');
      pane.scrollTop = pane.scrollHeight;
      (d.messages || []).forEach(function (m) { if (ixS(m.sent_at) > IX.lastSeen) { IX.lastSeen = ixS(m.sent_at); } });
      var mb = $('ixMore');
      if (mb) { mb.onclick = ixEarlier; }
      /* opening marks the thread read server-side — refresh the counts without a reload */
      ixThreadsRefresh();
    }).catch(function (e) {
      pane.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--bad);font-weight:600">' + esc(e.message) + '</div>';
    });
  }

  function ixEarlier() {
    var pane = $('ixMsgs');
    if (!pane || !IX.cursor) { return; }
    var stick = pane.scrollHeight - pane.scrollTop;
    api('inboxThread', { with: IX.peer, before: IX.cursor }).then(function (d) {
      if (!$('ixMsgs')) { return; }
      IX.cursor = d.cursor || '';
      var mb = $('ixMore');
      if (mb) { mb.remove(); }
      var html = (d.more ? '<button class="minibtn" id="ixMore" style="align-self:center">Earlier messages</button>' : '') +
        (d.messages || []).map(function (m) { return ixMsgHtml(m); }).join('');
      pane.insertAdjacentHTML('afterbegin', html);
      pane.scrollTop = pane.scrollHeight - stick;
      var mb2 = $('ixMore');
      if (mb2) { mb2.onclick = ixEarlier; }
    });
  }

  function ixSend() {
    var ta = $('ixBody'), pane = $('ixMsgs');
    if (!ta || !pane || !IX.peer) { return; }
    var body = ixS(ta.value).trim();
    if (!body) { return; }
    ta.value = '';
    var ghostId = 'g' + Date.now();
    pane.insertAdjacentHTML('beforeend', ixMsgHtml({ msg_id: ghostId, from_email: ixMe(), body: body, sent_at: '' }, true));
    pane.scrollTop = pane.scrollHeight;
    api('inboxSend', { to: IX.peer, body: body }).then(function (r) {
      var g = pane.querySelector('[data-ix-mid="' + ghostId + '"]');
      if (g) {
        g.classList.remove('ghost');
        g.setAttribute('data-ix-mid', ixS(r.msg_id));
        var t = g.querySelector('.t');
        if (t) { t.textContent = ixWhen(r.sent_at); }
      }
      if (ixS(r.sent_at) > IX.lastSeen) { IX.lastSeen = ixS(r.sent_at); }
      ixThreadsRefresh();
    }).catch(function (e) {
      var g = pane.querySelector('[data-ix-mid="' + ghostId + '"]');
      if (g) { g.remove(); }
      ta.value = body;
      toast('NOT sent — ' + e.message + ' · your message is back in the box.');
    });
  }

  /* WO-12 follow-up (1 Sept click-through): the bell's LETTERS lost their reading surface when
     the sheet inbox was replaced — they live here now, same page, second tab. Data: the same
     poll the whole portal already uses; read = the existing markNotifRead action. */
  function ixLetters() {
    var box = $('ixThreads');
    if (!box || IX.pane !== 'nt') { return; }
    box.innerHTML = '<div class="ix-skel"></div><div class="ix-skel" style="width:65%"></div>';
    api('poll').then(function (d) {
      if (!$('ixThreads') || IX.pane !== 'nt') { return; }
      var ns = (d && d.notifications) || [];
      try { STATE.counts.notifications = d.unreadNotif || 0; refreshBadges(); } catch (e) {}
      if (!ns.length) { box.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--text-3);font-weight:600">No unread letters. New alerts land here the moment they are sent.</div>'; return; }
      box.innerHTML = '<div style="padding:8px 13px;border-bottom:1px solid var(--gold-line)"><button class="minibtn" id="ixNtAll">Mark all read</button></div>' +
        ns.map(function (n) {
          var unread = !ixS(n.read_at || n.read).trim();
          return '<div class="ix-nt' + (unread ? ' unread' : '') + '" data-ix-nt="' + esc(ixS(n.notif_id || n.id)) + '">' +
            '<div class="ty">' + esc(ixS(n.type || 'letter').replace(/_/g, ' ')) + ' · ' + esc(ixWhen(n.created_at || n.ts)) + '</div>' +
            '<div class="bd2">' + esc(ixS(n.message || n.body).slice(0, 160)) + '</div></div>';
        }).join('');
      box.querySelectorAll('[data-ix-nt]').forEach(function (el) {
        el.onclick = function () {
          var me = this;
          api('markNotifRead', { notifId: this.getAttribute('data-ix-nt') }).then(function () {
            me.classList.remove('unread');
            try { STATE.counts.notifications = Math.max(0, (STATE.counts.notifications || 1) - 1); refreshBadges(); } catch (e) {}
          }).catch(function () {});
        };
      });
      var all = $('ixNtAll');
      if (all) {
        all.onclick = function () {
          all.disabled = true;
          api('markNotifRead', { all: true }).then(function () {
            try { STATE.counts.notifications = 0; refreshBadges(); } catch (e) {}
            ixLetters();
          }).catch(function () { all.disabled = false; });
        };
      }
    }).catch(function (e) {
      if ($('ixThreads') && IX.pane === 'nt') { box.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--bad);font-weight:600">' + esc(e.message) + '</div>'; }
    });
  }

  function ixPane(p) {
    IX.pane = p;
    document.querySelectorAll('.ix-tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-ix-pane') === p); });
    if (p === 'nt') { ixLetters(); } else { ixPaintThreads(); }
  }
  window.ixShowLetters = function () { try { ixPane('nt'); } catch (e) {} };

  function ixThreadsRefresh() {
    return api('inboxThreads', {}).then(function (d) {
      IX.threads = (d && d.threads) || [];
      ixBadge((d && d.unread_total) || 0);
      ixPaintThreads();
      return d;
    });
  }

  function ixPoll() {
    if (!$('ixThreads')) { return; }   /* left the page — the timer dies with it */
    api('inboxPoll', IX.lastSeen ? { since: IX.lastSeen } : {}).then(function (d) {
      ixBadge((d && d.unread_total) || 0);
      var fresh = (d && d.fresh) || [];
      if (!fresh.length) { return; }
      fresh.forEach(function (m) { if (ixS(m.sent_at) > IX.lastSeen) { IX.lastSeen = ixS(m.sent_at); } });
      var pane = $('ixMsgs');
      var mine = fresh.filter(function (m) { return ixS(m.thread_id).indexOf(ixMe()) >= 0 && ixS(m.from_email).toLowerCase() === IX.peer; });
      if (pane && mine.length) {
        mine.forEach(function (m) {
          if (!pane.querySelector('[data-ix-mid="' + ixS(m.msg_id) + '"]')) {
            pane.insertAdjacentHTML('beforeend', ixMsgHtml(m));
          }
        });
        pane.scrollTop = pane.scrollHeight;
      }
      ixThreadsRefresh();
    }).catch(function () {});
  }

  VIEWS.inbox = {
    label: 'Inbox',
    icon: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
    roles: '*',
    order: 1.6,
    badge: function () { return (STATE.counts && STATE.counts.inbox) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Inbox</h1>' +
        '<span class="sub">private between the two of you — nobody else, Management included, can read a thread</span></div>' +
        '<div class="ix-wrap enter d2">' +
        '<div><div class="ix-tabs"><button class="ix-tab on" data-ix-pane="dm">Conversations</button><button class="ix-tab" data-ix-pane="nt">Letters</button></div><div class="ix-list" id="ixThreads"><div class="ix-skel"></div><div class="ix-skel" style="width:70%"></div><div class="ix-skel" style="width:55%"></div></div>' +
        '<select class="alx-sel" id="ixNew" style="width:100%;margin-top:10px"><option value="">New message to…</option></select></div>' +
        '<div class="ix-pane"><div style="padding:11px 14px;border-bottom:1px solid var(--gold-line);font-size:13px;font-weight:800" id="ixWith">Pick a conversation</div>' +
        '<div class="ix-msgs" id="ixMsgs"><div style="padding:16px;font-size:12px;color:var(--text-3);font-weight:600">Messages load when you open a thread — 30 at a time, older on demand.</div></div>' +
        '<div class="ix-send"><textarea id="ixBody" placeholder="Write a message… (Enter sends, Shift+Enter = new line)"></textarea>' +
        '<button class="btn-gold" id="ixSendBtn" style="align-self:flex-end">Send</button></div></div></div>';
    },
    init: function () {
      var t0 = Date.now();
      ixThreadsRefresh().then(function () {
        try { console.log('[inbox] first render ' + (Date.now() - t0) + 'ms, ' + IX.threads.length + ' threads'); } catch (e) {}
        if (IX.peer) { ixOpen(IX.peer, true); }
      });
      /* the people picker: every approved teammate, from the engine's users mirror */
      var sel = $('ixNew');
      if (sel) {
        api('inboxPeople', {}).then(function (d) {
          if (!$('ixNew')) { return; }
          IX.names = {};
          sel.innerHTML = '<option value="">New message to…</option>' + ((d && d.people) || [])
            .filter(function (u) { return u.email !== ixMe(); })
            .map(function (u) { IX.names[u.email] = u.name; return '<option value="' + esc(u.email) + '">' + esc(ixS(u.name)) + '</option>'; }).join('');
          ixPaintThreads();
        }).catch(function () {});
        sel.onchange = function () { if (this.value) { ixOpen(this.value); this.value = ''; } };
      }
      document.querySelectorAll('.ix-tab').forEach(function (b) {
        b.onclick = function () { ixPane(this.getAttribute('data-ix-pane')); };
      });
      if (window.__ixWantLetters) { window.__ixWantLetters = 0; ixPane('nt'); }
      var sb = $('ixSendBtn');
      if (sb) { sb.onclick = ixSend; }
      var ta = $('ixBody');
      if (ta) {
        ta.onkeydown = function (ev) {
          if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ixSend(); }
        };
      }
      if (IX.pollT) { clearInterval(IX.pollT); }
      IX.pollT = setInterval(ixPoll, 30000);
    }
  };
})();
