/* view-zz-notifications.js — 2 Sept (owner): system notifications get their OWN surface, big
 * and clear like the Signals cards; the Inbox stays for people's messages only. The bell opens
 * this page for every role. Data: the same poll feed the whole portal already runs, letters
 * marked read with the existing markNotifRead action. */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.nf-card{border:1px solid var(--gold-line);border-radius:14px;padding:15px 18px;background:var(--panel-2);margin-bottom:12px;display:flex;gap:14px;align-items:flex-start}' +
    '.nf-card.unread{border-color:var(--gold);box-shadow:0 0 22px rgba(233,169,60,.09)}' +
    '.nf-ico{font-size:26px;line-height:1;margin-top:2px}' +
    '.nf-ty{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:var(--text-3)}' +
    '.nf-msg{font-size:14.5px;font-weight:700;line-height:1.5;margin-top:4px}' +
    '.nf-card.unread .nf-msg{font-size:16px;font-weight:800}' +
    '.nf-explain{font-size:12px;color:var(--text-3);font-weight:600;line-height:1.45;margin-top:4px}' +
    '.nf-when{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:5px}' +
    '.nf-acts{margin-left:auto;display:flex;gap:6px;flex-shrink:0}'
  );

  function nfS(v) { return String(v == null ? '' : v); }
  /* 3 Sept (owner): a plain-English line under each notification saying what this KIND means. */
  function nfExplain(type) {
    var t = nfS(type).toLowerCase();
    if (t.indexOf('stock') >= 0 || t.indexOf('out of') >= 0) { return 'A product is low or out of stock — restock or pause it before orders come in you cannot fulfil.'; }
    if (t.indexOf('task') >= 0) { return 'Work was assigned to you or submitted for your approval — open your task board to act on it.'; }
    if (t.indexOf('price') >= 0) { return 'A listing price or the fee calculator moved — check the margin still holds.'; }
    if (t.indexOf('campaign') >= 0 || t.indexOf('cpc') >= 0 || t.indexOf('ad') === 0) { return 'An advertising campaign changed state — a paused or gapped campaign means listings stop being promoted.'; }
    if (t.indexOf('late') >= 0 || t.indexOf('dispatch') >= 0 || t.indexOf('deliver') >= 0) { return 'An order is at risk of late dispatch — ship it today to protect the account’s service metrics.'; }
    if (t.indexOf('metric') >= 0 || t.indexOf('defect') >= 0 || t.indexOf('standard') >= 0) { return 'An eBay service metric moved (defects, late shipment, cases) — account health is changing.'; }
    if (t.indexOf('hunt') >= 0) { return 'A product hunt was submitted, approved, rejected or needs revision — check the hunt queue.'; }
    if (t.indexOf('revis') >= 0) { return 'A listing needs revising — open it, make the change and submit it back.'; }
    if (t.indexOf('approv') >= 0 || t.indexOf('decision') >= 0 || t.indexOf('keyword') >= 0) { return 'Something is waiting on a management decision — approve, reject or send it back.'; }
    if (t.indexOf('meeting') >= 0) { return 'A meeting is starting soon.'; }
    if (t.indexOf('feedback') >= 0 || t.indexOf('return') >= 0 || t.indexOf('case') >= 0) { return 'A buyer left feedback or opened a return/case — customer service should look.'; }
    return 'A system notification from the portal.';
  }
  function nfIcon(type) {
    var t = nfS(type).toLowerCase();
    if (t.indexOf('stock') >= 0) { return '📦'; }
    if (t.indexOf('task') >= 0) { return '📋'; }
    if (t.indexOf('price') >= 0) { return '💷'; }
    if (t.indexOf('campaign') >= 0 || t.indexOf('cpc') >= 0 || t.indexOf('ad') === 0) { return '📣'; }
    if (t.indexOf('late') >= 0 || t.indexOf('dispatch') >= 0 || t.indexOf('deliver') >= 0) { return '🚚'; }
    if (t.indexOf('metric') >= 0 || t.indexOf('defect') >= 0) { return '📉'; }
    if (t.indexOf('message') >= 0) { return '💬'; }
    if (t.indexOf('meeting') >= 0) { return '⏰'; }
    if (t.indexOf('decision') >= 0 || t.indexOf('keyword') >= 0) { return '🗳️'; }
    return '🔔';
  }

  function nfPaint(d) {
    var box = $('nfBody');
    if (!box) { return; }
    var ns = (d && d.notifications) || [];
    try { STATE.counts.notifications = d.unreadNotif || 0; refreshBadges(); } catch (e) {}
    var un = $('nfUnread');
    if (un) { un.textContent = String(d.unreadNotif || 0); }
    if (!ns.length) {
      box.innerHTML = '<div class="alx-empty">No unread system notifications. New alerts land here the moment the portal sends them.</div>';
      return;
    }
    box.innerHTML = ns.map(function (n) {
      var unread = !nfS(n.read_at || n.read).trim();
      return '<div class="nf-card' + (unread ? ' unread' : '') + '" data-nf="' + esc(nfS(n.notif_id || n.id)) + '">' +
        '<div class="nf-ico">' + nfIcon(n.type) + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="nf-ty">' + esc(nfS(n.type || 'notification').replace(/_/g, ' ')) + '</div>' +
        '<div class="nf-msg">' + esc(nfS(n.message || n.body)) + '</div>' +
        '<div class="nf-explain">' + esc(nfExplain(n.type)) + '</div>' +
        '<div class="nf-when">' + esc(fmtPkt(n.created_at || n.ts, true) || nfS(n.created_at || n.ts)) + '</div>' +
        '</div>' +
        (unread ? '<div class="nf-acts"><button class="minibtn" data-nf-read="' + esc(nfS(n.notif_id || n.id)) + '">Mark read</button></div>' : '') +
        '</div>';
    }).join('');
    box.querySelectorAll('[data-nf-read]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-nf-read');
        var card = box.querySelector('[data-nf="' + id + '"]');
        var me = this; me.disabled = true;
        api('notifMarkRead', { id: id }).then(function () {
          if (card) { card.classList.remove('unread'); }
          me.remove();
          try { STATE.counts.notifications = Math.max(0, (STATE.counts.notifications || 1) - 1); refreshBadges(); } catch (e) {}
          var un2 = $('nfUnread');
          if (un2) { un2.textContent = String(STATE.counts.notifications || 0); }
        }).catch(function () { me.disabled = false; });
      };
    });
  }

  function nfLoad(fresh) {
    var box = $('nfBody');
    if (!box) { return; }
    box.innerHTML = fresh ? '<div class="spinner"></div>' : box.innerHTML || '<div class="spinner"></div>';
    /* 2 Sept: letters come from the ENGINE now — Google is out of this loop entirely */
    api('pollEngine').then(function (d) {
      try { window.__lastPoll = { at: Date.now(), d: d }; } catch (e) {}
      nfPaint(d);
    }).catch(function (e) {
      if ($('nfBody')) { box.innerHTML = '<div class="alx-empty">The letters could not be read just now — ' + esc(e.message) + '</div>'; }
    });
  }

  VIEWS.notifications = {
    label: 'Notifications',
    icon: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    roles: '*',
    order: 98,
    hidden: true,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Notifications</h1>' +
        '<span class="sub">everything the SYSTEM sends you — people’s messages stay in the Inbox</span>' +
        '<span class="pill role" style="margin-left:auto">unread <b id="nfUnread" style="margin-left:4px">…</b></span>' +
        '<button class="minibtn" id="nfAll">Mark all read</button>' +
        '<button class="minibtn" id="nfRefresh">Refresh</button></div>' +
        '<div id="nfBody" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () {
      var all = $('nfAll');
      if (all) {
        all.onclick = function () {
          all.disabled = true;
          api('notifMarkRead', { all: true }).then(function () {
            try { STATE.counts.notifications = 0; refreshBadges(); } catch (e) {}
            all.disabled = false;
            nfLoad(true);
          }).catch(function () { all.disabled = false; });
        };
      }
      var rf = $('nfRefresh');
      if (rf) { rf.onclick = function () { nfLoad(true); }; }
      nfLoad(false);
    }
  };

  /* the bell opens THIS page (system notifications); the triangle opens Alerts — two separate
     icons, both kept away from the Inbox (which stays people's messages only). 3 Sept (owner). */
  (function () {
    var bell = $('bellBtn');
    if (bell) { bell.onclick = function () { try { location.hash = 'notifications'; renderView('notifications'); } catch (e) {} }; }
    var al = $('alertBtn');
    if (al) { al.onclick = function () { try { location.hash = 'alerts'; renderView('alerts'); } catch (e) {} }; }
  })();
})();
