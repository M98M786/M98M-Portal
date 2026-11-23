/* view-listDesk.js — R8-3a/3b/R8-8 + 23 Nov: the Listing desk. 23 Nov (owner): the desk is now
 * lister-first — every lister's name across the top, click a name and EVERY task sitting with
 * them opens with its status, click a task and the listing itself opens (the job card, the
 * comment trail, the hunt it came from) with Take back (returns the item to Send to listers)
 * and Delete task. That is how a listing stuck in someone's tasks is found, read and freed.
 * Lister: own work + reject-back with a reason (unchanged). Backend: listDesk · listingLoad ·
 * listingTaskCard (engine) · huntTakeBack · goLiveDelete · listerRejectRequest (AS). */
(function () {
  'use strict';

  var LD_ROLES = ['Item Lister', 'Listing Manager', 'Team Lead', 'Management', 'Ops Head'];
  var LD_BOARD_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Listing Manager'];

  VIEW_CSS.push(
    '.ld-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));margin-bottom:14px}' +
    '.ld-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.ld-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ld-tile b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.ld-tile .s{font-size:10.5px;color:var(--text-3);font-weight:700}' +
    '.ld-tile.gold b{color:var(--gold-a)}.ld-tile.bad b{color:var(--bad)}.ld-tile.blue b{color:var(--blue-2)}' +
    '.ld-fam{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}' +
    '.ld-f{border:1px solid var(--gold-line);border-radius:11px;padding:10px 14px;background:var(--panel);font-size:12px;font-weight:700}' +
    '.ld-f b{font-size:16px}' +
    '.ld-rej{margin-top:8px;padding:10px 12px;border-radius:10px;border:1px dashed var(--gold-line-hi);background:rgba(120,132,152,.06)}' +
    '.ld-rej select{padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    /* 23 Nov — the lister board */
    '.ld-board{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}' +
    '.ld-p{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);cursor:pointer;text-align:left;font:inherit;color:var(--text)}' +
    '.ld-p:hover{border-color:var(--gold-line-hi)}' +
    '.ld-p.on{border-color:var(--gold-a);box-shadow:0 0 0 1px var(--gold-a) inset}' +
    '.ld-p .nm{font-weight:800;font-size:13px;display:flex;align-items:center;gap:7px}' +
    '.ld-p .rl{font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em}' +
    '.ld-p .big{font-size:24px;font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}' +
    '.ld-p .big span{font-size:11px;color:var(--text-3);font-weight:700}' +
    '.ld-p .ln{font-size:11px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.ld-p .ln b{color:var(--text)}' +
    '.ld-p .ln .bad2{color:var(--bad);font-weight:800}' +
    '.ld-drawer{margin-top:14px}' +
    '.ld-sec{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin:14px 0 8px}' +
    '.ld-det{padding:12px;border-radius:11px;border:1px solid var(--gold-line);background:var(--panel);text-align:left}' +
    '.ld-det-grid{display:grid;gap:14px;grid-template-columns:1.4fr 1fr}' +
    '@media(max-width:900px){.ld-det-grid{grid-template-columns:1fr}}' +
    '.ld-trail{font-size:12px;line-height:1.75}' +
    '.ld-trail .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;display:block;margin-bottom:4px}' +
    '.ld-cmts{margin-top:10px;padding:10px 12px;border-radius:9px;border:1px dashed var(--gold-line-hi);background:rgba(120,132,152,.06);' +
      'font-size:11.5px;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto}' +
    '.ld-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--gold-line)}' +
    '.ld-acts input{flex:1;min-width:160px;padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel-2);color:var(--text);font:inherit;font-size:12px}' +
    '.ld-del{border-color:rgba(240,96,90,.5)!important;color:var(--bad)!important}'
  );

  function ldS(v) { return String(v == null ? '' : v); }
  function ldAttr(v) { return esc(ldS(v)).replace(/"/g, '&quot;'); }

  /* The same forgive-the-lagging-mirror memory the Go-live desk uses (23 Nov): a task the owner
     just took back / deleted stays OFF the board even if the engine answer or a slow Apps Script
     reply has not caught up yet; the memory is dropped the moment a fresh answer no longer
     carries the task as open, or after 45 minutes. */
  var LD_GONE_KEY = 'm98m:ldGone', LD_GONE_TTL = 45 * 60000;
  var LD_GONE = {};
  try {
    LD_GONE = JSON.parse(localStorage.getItem(LD_GONE_KEY) || '{}') || {};
    var cut = Date.now() - LD_GONE_TTL;
    Object.keys(LD_GONE).forEach(function (k) { if (!LD_GONE[k] || LD_GONE[k].at < cut) delete LD_GONE[k]; });
  } catch (e) { LD_GONE = {}; }
  function ldGoneSave() { try { localStorage.setItem(LD_GONE_KEY, JSON.stringify(LD_GONE)); } catch (e) {} }
  function ldGone(id) { LD_GONE[id] = { at: Date.now() }; ldGoneSave(); }
  function ldGoneClear(id) { delete LD_GONE[id]; ldGoneSave(); }
  var LD_SLOW_RE = /overloaded|timeout|timed out|did not answer|taking long|aborted|failed to fetch|network/i;

  var LD = { load: null, staff: [], open: '', det: {}, show: {}, seq: 0 };

  VIEWS.listDesk = {
    label: 'Listing desk',
    icon: '<path d="M4 5h16M4 10h16M4 15h10"/><path d="m15 17 2 2 4-4"/>',
    roles: LD_ROLES,
    order: 17.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Listing <span class="goldtext">desk</span></h1>' +
          '<span class="sub">every lister, every task they are holding, and the listing inside each one</span>' +
          '<button class="minibtn" id="ldRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="ldTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div id="ldFams" class="enter d1"></div>' +
        '<div class="card enter d2" id="ldBoardCard"><div class="hd">The listers ' +
          '<span class="hint">click a name — every task with them opens; click a task for the listing itself, take it back or delete it</span></div>' +
          '<div class="bd" id="ldBoard"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">CPC pipeline ' +
          '<span class="hint">the listings whose advertising is about to change — research, campaign set-up, potential-CPC reviews</span></div>' +
          '<div class="bd" id="ldCpc"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">The work, deadline first ' +
          '<span class="hint">every open listing task · reject-back needs a reason and Management approval</span></div>' +
          '<div class="bd" id="ldRows"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('ldRefresh').onclick = function () { ldLoad(); ldBoardLoad(true); };
      var role = ldS(STATE.user && STATE.user.role);
      var canBoard = LD_BOARD_ROLES.indexOf(role) >= 0 || !!(STATE.user && STATE.user.super);
      if (canBoard) { ldBoardLoad(false); }
      else { var c = $('ldBoardCard'); if (c) { c.style.display = 'none'; } }
      ldLoad();
    }
  };

  /* ---------------- 23 Nov: the lister board ---------------- */

  function ldBoardLoad(force) {
    var seq = ++LD.seq;
    var box = $('ldBoard');
    if (!box) { return; }
    if (!LD.load || force) { box.innerHTML = '<div class="spinner"></div>'; }
    Promise.all([
      engineCall('listingLoad', {}, 20000),
      api('assignableStaff', { roles: ['Item Lister', 'Listing Manager'] }).catch(function () { return { staff: [] }; })
    ]).then(function (res) {
      if (seq !== LD.seq || !$('ldBoard')) { return; }
      LD.load = res[0] || {};
      LD.staff = (res[1] && res[1].staff) || [];
      /* forget a taken-back/deleted task the moment the mirror no longer lists it as open */
      var openNow = {};
      (LD.load.tasks || []).forEach(function (t) { if (t.open) { openNow[ldS(t.task_id)] = 1; } });
      (LD.load.revisions || []).forEach(function (t) { if (t.open) { openNow[ldS(t.task_id)] = 1; } });
      Object.keys(LD_GONE).forEach(function (id) { if (!openNow[id]) { ldGoneClear(id); } });
      ldBoardPaint();
    }).catch(function (e) {
      if (seq !== LD.seq || !$('ldBoard')) { return; }
      $('ldBoard').innerHTML = '<div class="hu-hint" style="margin-top:0">Could not load the lister board: ' + esc(ldS(e && e.message)) + '</div>';
    });
  }

  function ldOpenNew(email) {
    return ((LD.load && LD.load.tasks) || []).filter(function (t) {
      return t.open && !LD_GONE[ldS(t.task_id)] && ldS(t.assigned_to).toLowerCase() === email;
    });
  }
  function ldOpenRev(email) {
    return ((LD.load && LD.load.revisions) || []).filter(function (t) {
      return t.open && !LD_GONE[ldS(t.task_id)] && ldS(t.assigned_to).toLowerCase() === email;
    });
  }
  function ldDone60(email) {
    var out = [];
    (((LD.load && LD.load.tasks) || [])).forEach(function (t) {
      if (!t.open && ldS(t.assigned_to).toLowerCase() === email) { out.push({ kind: 'New listing', title: t.title, task_id: t.task_id, when: ldS(t.done_at).slice(0, 10), account: t.account }); }
    });
    (((LD.load && LD.load.revisions) || [])).forEach(function (t) {
      if (!t.open && ldS(t.assigned_to).toLowerCase() === email) { out.push({ kind: 'Revision', title: t.title, task_id: t.task_id, when: ldS(t.created_at).slice(0, 10), account: '' }); }
    });
    out.sort(function (a, b) { return ldS(b.when).localeCompare(ldS(a.when)); });
    return out;
  }

  function ldPeople() {
    /* the listers the Send form can choose, in that same order, then anyone else actually
       holding open listing work (the go-live desk included) so nothing can hide off-board */
    var seen = {}, people = [];
    var nameOf = {};
    ((LD.load && LD.load.tasks) || []).concat((LD.load && LD.load.revisions) || []).forEach(function (t) {
      var e = ldS(t.assigned_to).toLowerCase();
      if (t.lister && !nameOf[e]) { nameOf[e] = ldS(t.lister); }
    });
    (LD.staff || []).forEach(function (s) {
      var e = ldS(s.email).toLowerCase();
      if (!e || seen[e]) { return; }
      seen[e] = 1;
      people.push({ email: e, name: ldS(s.name) || nameOf[e] || e.split('@')[0], role: ldS(s.role) });
    });
    var extra = {};
    ((LD.load && LD.load.tasks) || []).forEach(function (t) { if (t.open && !LD_GONE[ldS(t.task_id)]) { extra[ldS(t.assigned_to).toLowerCase()] = 1; } });
    ((LD.load && LD.load.revisions) || []).forEach(function (t) { if (t.open && !LD_GONE[ldS(t.task_id)]) { extra[ldS(t.assigned_to).toLowerCase()] = 1; } });
    Object.keys(extra).forEach(function (e) {
      if (!e || seen[e]) { return; }
      seen[e] = 1;
      people.push({ email: e, name: nameOf[e] || e.split('@')[0], role: 'holding listing work' });
    });
    return people;
  }

  function ldBoardPaint() {
    var box = $('ldBoard');
    if (!box || !LD.load) { return; }
    var SUBMITTED = 'Submitted — awaiting approval';
    var people = ldPeople();
    if (!people.length) {
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">No listers found and no open listing work.</div>';
      return;
    }
    var boxes = people.map(function (p) {
      var nw = ldOpenNew(p.email), rv = ldOpenRev(p.email);
      var notStarted = 0, being = 0, submitted = 0, overdue = 0, oldest = '';
      nw.forEach(function (t) {
        var st = ldS(t.status);
        if (st === SUBMITTED) { submitted++; }
        else if (st === 'Working' || st === 'Updated') { being++; }
        else { notStarted++; }
        if (t.overdue) { overdue++; }
        if (!oldest || ldS(t.assigned_at) < oldest) { oldest = ldS(t.assigned_at); }
      });
      var age = '';
      if (oldest) {
        var d = Math.floor((Date.now() + 5 * 3600000 - Date.parse(oldest.slice(0, 19) + 'Z')) / 86400000);
        if (isFinite(d) && d >= 0) { age = d + 'd'; }
      }
      var total = nw.length + rv.length;
      return '<button type="button" class="ld-p' + (LD.open === p.email ? ' on' : '') + '" data-ld-person="' + ldAttr(p.email) + '">' +
        '<span class="nm">' + esc(p.name) + '</span><span class="rl">' + esc(p.role) + '</span>' +
        '<span class="big">' + total + ' <span>task' + (total === 1 ? '' : 's') + (total ? '' : ' · free') + '</span></span>' +
        '<span class="ln">' + notStarted + ' not started · ' + being + ' being listed · ' + submitted + ' submitted' +
          (rv.length ? ' · <b>' + rv.length + ' revision' + (rv.length === 1 ? '' : 's') + '</b>' : '') + '</span>' +
        '<span class="ln">' + (overdue ? '<span class="bad2">' + overdue + ' overdue</span>' : 'nothing overdue') +
          (age ? ' · oldest ' + esc(age) : '') + '</span>' +
        '</button>';
    }).join('');
    var asOf = ldS(LD.load.as_of).slice(11, 16);
    box.innerHTML = '<div class="ld-board">' + boxes + '</div>' +
      '<div class="ld-drawer" id="ldDrawer">' + (LD.open ? '' : '<div class="hu-hint" style="margin-top:10px">Click a name to open every task sitting with them.</div>') + '</div>' +
      (asOf ? '<div class="hu-hint" style="margin-top:10px">live from the task mirror · as of ' + esc(asOf) + ' UTC</div>' : '');
    box.querySelectorAll('[data-ld-person]').forEach(function (b) {
      b.onclick = function () {
        var e = this.getAttribute('data-ld-person');
        LD.open = LD.open === e ? '' : e;
        LD.show = {};
        ldBoardPaint();
      };
    });
    if (LD.open) { ldDrawerPaint(); }
  }

  function ldStatusCell(t) {
    var st = ldS(t.status);
    var x = esc(st || '—');
    if (t.overdue) { x += ' · <span style="color:var(--bad);font-weight:800">overdue</span>'; }
    return x;
  }

  function ldDrawerPaint() {
    var host = $('ldDrawer');
    if (!host) { return; }
    var email = LD.open;
    var people = ldPeople();
    var who = null;
    people.forEach(function (p) { if (p.email === email) { who = p; } });
    var name = who ? who.name : email.split('@')[0];
    var nw = ldOpenNew(email), rv = ldOpenRev(email), done = ldDone60(email);
    var h = '<div class="ld-sec">Tasks with ' + esc(name) + ' — ' + (nw.length + rv.length) + ' open</div>';
    if (!nw.length && !rv.length) {
      h += '<div class="hu-hint" style="margin-top:0">Nothing open with ' + esc(name) + ' right now.</div>';
    }
    if (nw.length) {
      h += '<div class="scroll"><table class="ir-tbl" style="min-width:720px"><thead><tr>' +
        '<th style="text-align:left">New listing</th><th style="text-align:left">Account</th>' +
        '<th style="text-align:left">Sent on</th><th style="text-align:left">Due</th><th style="text-align:left">Status</th><th></th></tr></thead><tbody>' +
        nw.map(function (t) { return ldTaskRow(t, 'new'); }).join('') + '</tbody></table></div>';
    }
    if (rv.length) {
      h += '<div class="ld-sec">Revisions with ' + esc(name) + ' (' + rv.length + ')</div>' +
        '<div class="scroll"><table class="ir-tbl" style="min-width:720px"><thead><tr>' +
        '<th style="text-align:left">Revision</th><th style="text-align:left">From</th>' +
        '<th style="text-align:left">Raised</th><th style="text-align:left">Status</th><th></th></tr></thead><tbody>' +
        rv.map(function (t) { return ldTaskRow(t, 'rev'); }).join('') + '</tbody></table></div>';
    }
    if (done.length) {
      h += '<div class="ld-sec"><button class="minibtn" id="ldDoneTgl">' + (LD.show.__done ? 'Hide' : 'Show') + ' finished · last ' + esc(ldS(LD.load.history_days || 60)) + ' days (' + done.length + ')</button></div>';
      if (LD.show.__done) {
        h += '<div class="scroll"><table class="ir-tbl" style="min-width:600px"><thead><tr>' +
          '<th style="text-align:left">Task</th><th style="text-align:left">Kind</th><th style="text-align:left">Account</th><th style="text-align:left">Finished</th><th></th></tr></thead><tbody>' +
          done.map(function (t) {
            return '<tr><td style="text-align:left;max-width:300px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + ldAttr(t.title) + '">' + esc(ldS(t.title)) + '</div>' +
              '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(ldS(t.task_id)) + '</span></td>' +
              '<td style="text-align:left">' + esc(t.kind) + '</td><td style="text-align:left">' + esc(ldS(t.account) || '—') + '</td>' +
              '<td style="text-align:left">' + esc(ldS(t.when) || '—') + '</td>' +
              '<td><button class="minibtn" data-ld-open="' + ldAttr(t.task_id) + '">Details</button></td></tr>' +
              (LD.show[ldS(t.task_id)] ? '<tr class="tk-x"><td colspan="5">' + ldDetHtml(ldS(t.task_id)) + '</td></tr>' : '');
          }).join('') + '</tbody></table></div>';
      }
    }
    host.innerHTML = h;
    var tg = host.querySelector('#ldDoneTgl');
    if (tg) { tg.onclick = function () { LD.show.__done = !LD.show.__done; ldDrawerPaint(); }; }
    host.querySelectorAll('[data-ld-open]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-ld-open');
        LD.show[id] = !LD.show[id];
        if (LD.show[id] && !LD.det[id]) { ldDetFetch(id); }
        ldDrawerPaint();
      };
    });
    ldWireDetail(host);
  }

  function ldTaskRow(t, kind) {
    var id = ldS(t.task_id);
    var open = !!LD.show[id];
    var cells;
    if (kind === 'new') {
      cells = '<td style="text-align:left;max-width:300px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + ldAttr(t.title) + '">' + esc(ldS(t.title)) + '</div>' +
          '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(id) + (t.hunt_id ? ' · ' + esc(ldS(t.hunt_id)) : '') + '</span></td>' +
        '<td style="text-align:left">' + esc(ldS(t.account) || '—') + '</td>' +
        '<td style="text-align:left;white-space:nowrap">' + esc(ldS(t.assigned_day) || '—') + '</td>' +
        '<td style="text-align:left;white-space:nowrap' + (t.overdue ? ';color:var(--bad);font-weight:800' : '') + '">' + esc(ldS(t.due_day) || '—') + '</td>' +
        '<td style="text-align:left">' + ldStatusCell(t) + '</td>';
    } else {
      cells = '<td style="text-align:left;max-width:300px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + ldAttr(t.title) + '">' + esc(ldS(t.title)) + '</div>' +
          '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(id) + '</span></td>' +
        '<td style="text-align:left">' + esc(ldS(t.assigned_by).split('@')[0] || '—') + '</td>' +
        '<td style="text-align:left;white-space:nowrap">' + esc(ldS(t.created_at).slice(0, 10) || '—') + '</td>' +
        '<td style="text-align:left">' + ldStatusCell(t) + '</td>';
    }
    var cols = kind === 'new' ? 6 : 5;
    return '<tr' + (t.overdue ? ' style="background:var(--bad-soft)"' : '') + '>' + cells +
      '<td><button class="minibtn" data-ld-open="' + ldAttr(id) + '">' + (open ? 'Hide' : 'Details') + '</button></td></tr>' +
      (open ? '<tr class="tk-x"><td colspan="' + cols + '">' + ldDetHtml(id) + '</td></tr>' : '');
  }

  /* ---------------- the task detail: the listing itself ---------------- */

  function ldDetFetch(id) {
    LD.det[id] = { loading: true };
    engineCall('listingTaskCard', { task_id: id }, 15000).then(function (d) {
      LD.det[id] = { data: d || {} };
      ldDrawerPaint();
    }).catch(function (e) {
      LD.det[id] = { error: ldS(e && e.message) || 'no answer' };
      ldDrawerPaint();
    });
  }

  function ldDetHtml(id) {
    var st = LD.det[id];
    if (!st || st.loading) { return '<div class="ld-det"><div class="spinner"></div></div>'; }
    if (st.error) { return '<div class="ld-det"><div class="hu-hint" style="margin-top:0">Could not open it: ' + esc(st.error) + '</div></div>'; }
    var d = st.data || {}, t = d.task || {};
    var card = '';
    if (typeof window.M98M_taskDetailsHtml === 'function' && d.listing) {
      card = window.M98M_taskDetailsHtml(JSON.stringify({ limited: d.listing, hunt_id: ldS(d.hunt_id) }));
    } else if (d.details_text) {
      card = '<div style="white-space:pre-wrap;word-break:break-word;font-size:12px">' + esc(ldS(d.details_text)) + '</div>';
    } else {
      card = '<div class="hu-hint" style="margin-top:0">No product pack on this task.</div>';
    }
    var line = function (k, v) { return v ? '<b>' + esc(k) + ':</b> ' + v + '<br>' : ''; };
    var trail = '<div class="ld-trail"><span class="k">The trail</span>' +
      line('Status', esc(ldS(t.status))) +
      line('With', esc(ldS(t.assigned_to_name)) + ' <span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(ldS(t.assigned_to)) + '</span>') +
      line('Sent by', esc(ldS(t.assigned_by_name))) +
      line('Sent on', esc(ldS(t.created_at).slice(0, 16).replace('T', ' '))) +
      line('Due', esc(ldS(t.deadline_pkt).slice(0, 16).replace('T', ' ')) + ' PKT') +
      line('Last moved', esc(ldS(t.updated_at).slice(0, 16).replace('T', ' '))) +
      line('Submitted', esc(ldS(t.submitted_at).slice(0, 16).replace('T', ' '))) +
      line('Item ID', t.item_id ? '<span class="mono">' + esc(ldS(t.item_id)) + '</span> — live on eBay' : '') +
      line('Account', esc(ldS(t.account))) +
      (d.hunt ? line('From hunt', esc(ldS(d.hunt.hunter)) + ' · <span class="mono" style="font-size:10px">' + esc(ldS(d.hunt.hunt_id)) + '</span>') : '') +
      '</div>' +
      (t.comments ? '<div class="ld-cmts">' + esc(ldS(t.comments)) + '</div>' : '<div class="hu-hint" style="margin-top:8px">No comments on the task yet.</div>') +
      (t.submission_note ? '<div class="ld-cmts"><b>Submission note:</b> ' + esc(ldS(t.submission_note)) + '</div>' : '');
    var acts = '';
    if (d.can_act) {
      acts = '<div class="ld-acts">' +
        '<button class="minibtn" data-ld-take="' + ldAttr(id) + '">Take back → Send to listers</button>' +
        '<button class="minibtn ld-del" data-ld-delbtn="' + ldAttr(id) + '">Delete task</button>' +
        '<input type="text" maxlength="200" placeholder="reason (optional — the holder is told)" data-ld-note="' + ldAttr(id) + '">' +
        '</div>';
    } else if (ldS(t.item_id)) {
      acts = '<div class="ld-acts"><span class="hu-hint" style="margin:0">Already live on eBay — nothing to take back or delete here.</span></div>';
    }
    return '<div class="ld-det"><div class="ld-det-grid"><div>' + card + '</div><div>' + trail + '</div></div>' + acts + '</div>';
  }

  function ldAfterAction(id, msg) {
    ldGone(id);
    LD.show[id] = false;
    toast(msg);
    ldBoardPaint();
    ldLoad();                 // tiles + the deadline table follow
    ldBoardLoad(false);       // and a fresh mirror read reconciles the memory
  }

  function ldWireDetail(host) {
    host.querySelectorAll('[data-ld-take]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-ld-take');
        if (!window.confirm('Take this listing task back? It leaves the holder and returns to the Send to listers tray for re-assignment.')) { return; }
        var btn = this;
        btn.disabled = true;
        toast('Taking it back…');
        api('huntTakeBack', { task_id: id }).then(function (r) {
          ldAfterAction(id, r && r.requeued ? 'Taken back — it is in Send to listers again.' : 'Task removed. Its hunt was not re-queued (not approved, or marked deleted).');
        }).catch(function (e) {
          var m = ldS(e && e.message);
          if (LD_SLOW_RE.test(m)) { ldAfterAction(id, 'Google is slow right now — the take-back is finishing on the server; the task stays off the board.'); return; }
          btn.disabled = false;
          toast('NOT taken back — ' + m);
          ldBoardLoad(true);
        });
      };
    });
    host.querySelectorAll('[data-ld-delbtn]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-ld-delbtn');
        var note = host.querySelector('[data-ld-note="' + id.replace(/"/g, '') + '"]');
        var reason = note ? ldS(note.value).trim() : '';
        if (!window.confirm('Delete this listing task? The item will NOT go live and will NOT be re-sent — its hunt is stamped deleted. This cannot be undone.' + (reason ? '\n\nReason: ' + reason : '\n\n(Tip: type a reason first — the holder is told.)'))) { return; }
        var btn = this;
        btn.disabled = true;
        toast('Deleting the task…');
        api('goLiveDelete', { task_id: id, note: reason }).then(function () {
          ldAfterAction(id, 'Task deleted — it will not go live and will not be re-sent.');
        }).catch(function (e) {
          var m = ldS(e && e.message);
          if (LD_SLOW_RE.test(m)) { ldAfterAction(id, 'Google is slow right now — the delete is finishing on the server; the task stays off the board.'); return; }
          btn.disabled = false;
          toast('NOT deleted — ' + m);
          ldBoardLoad(true);
        });
      };
    });
  }

  /* ---------------- the original desk (tiles · CPC pipeline · deadline table) ---------------- */

  var LD_REASONS = ['issues with data', 'no sale worth it', 'no data available'];

  function ldLoad() {
    api('huntReasons', {}).then(function (r) {
      if (r && r.lister_reject && r.lister_reject.length) { LD_REASONS = r.lister_reject; }
    }).catch(function () {});
    cachedCall('listDesk', {}, function (d) {
      d = d || {};
      var per = d.per_assignee || [];
      var totals = per.reduce(function (t, p) {
        return { open: t.open + p.open, overdue: t.overdue + p.overdue, due: t.due + p.due_today, sub: t.sub + p.submitted };
      }, { open: 0, overdue: 0, due: 0, sub: 0 });
      setHTML('ldTiles', '<div class="ld-tiles">' +
        '<div class="ld-tile gold"><span class="k">Open listing tasks</span><b>' + totals.open + '</b></div>' +
        '<div class="ld-tile bad"><span class="k">Overdue</span><b>' + totals.overdue + '</b></div>' +
        '<div class="ld-tile"><span class="k">Due in 24h</span><b>' + totals.due + '</b></div>' +
        '<div class="ld-tile blue"><span class="k">Awaiting approval</span><b>' + totals.sub + '</b></div>' +
      '</div>');

      var f = d.families || {};
      var famRow = ['CPC', 'General/Dynamic', 'Unassigned'].map(function (k) {
        var v = f[k] || { listed_month: 0, pending: 0 };
        return '<div class="ld-f">' + esc(k) + ' · listed this month <b>' + v.listed_month + '</b> · pending <b>' + v.pending + '</b></div>';
      }).join('');
      var acc = d.per_account || {};
      var accRow = Object.keys(acc).sort(function (a, b) { return acc[b] - acc[a]; }).map(function (k) {
        return '<div class="ld-f">' + esc(k) + ' <b>' + acc[k] + '</b> pending</div>';
      }).join('');
      setHTML('ldFams', '<div class="ld-fam">' + famRow + '</div>' + (accRow ? '<div class="ld-fam">' + accRow + '</div>' : ''));

      /* R8-8: the CPC pipeline — what advertising work is in flight, soonest deadline first. */
      var cpc = d.cpc_pipeline || [], cc = d.cpc_counts || {};
      var cpcNames = { cpc_research: 'CPC research', campaign_set: 'Campaign set-up', potential_cpc_review: 'Potential-CPC review' };
      setHTML('ldCpc', !cpc.length
        ? '<div class="hu-hint" style="margin-top:0">No CPC work in flight right now.</div>'
        : '<div class="ld-fam">' +
            ['cpc_research', 'campaign_set', 'potential_cpc_review'].map(function (k) {
              return '<div class="ld-f">' + esc(cpcNames[k]) + ' <b>' + (cc[k] || 0) + '</b></div>';
            }).join('') +
            (cc.overdue ? '<div class="ld-f" style="border-color:rgba(240,96,90,.45);color:var(--bad)">Overdue <b>' + cc.overdue + '</b></div>' : '') +
          '</div>' +
          '<div class="scroll"><table class="ir-tbl" style="min-width:700px"><thead><tr>' +
          '<th style="text-align:left">Job</th><th style="text-align:left">Item</th><th style="text-align:left">Account</th>' +
          '<th style="text-align:left">With</th><th style="text-align:left">Deadline</th><th style="text-align:left">Status</th></tr></thead><tbody>' +
          cpc.map(function (r) {
            return '<tr' + (r.overdue ? ' style="background:var(--bad-soft)"' : '') + '>' +
              '<td style="text-align:left;font-weight:800">' + esc(cpcNames[r.type] || r.type) + '</td>' +
              '<td style="text-align:left;max-width:250px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(ldS(r.title)) + '</div>' +
                (ldS(r.item_id) ? '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(ldS(r.item_id)) + '</span>' : '') + '</td>' +
              '<td style="text-align:left">' + esc(ldS(r.account)) + '</td>' +
              '<td style="text-align:left">' + esc(ldS(r.assigned_to).split('@')[0]) + '</td>' +
              '<td style="text-align:left;white-space:nowrap' + (r.overdue ? ';color:var(--bad);font-weight:800' : '') + '">' + esc(fmtPkt(r.deadline_pkt, true) || '—') + '</td>' +
              '<td style="text-align:left">' + esc(ldS(r.status)) + '</td></tr>';
          }).join('') + '</tbody></table></div>');

      var rows = (d.rows || []).filter(function (r) { return !LD_GONE[ldS(r.task_id)]; });
      var me = ((STATE.user && STATE.user.email) || '').toLowerCase();
      if (!rows.length) {
        setHTML('ldRows', '<div class="hu-hint" style="margin-top:0">No open listing work.</div>');
        return;
      }
      setHTML('ldRows', '<div class="scroll"><table class="ir-tbl" style="min-width:760px"><thead><tr>' +
        '<th style="text-align:left">Task</th><th style="text-align:left">Family</th><th style="text-align:left">Account</th>' +
        '<th style="text-align:left">Assigned</th><th style="text-align:left">Deadline</th><th style="text-align:left">Status</th><th></th></tr></thead><tbody>' +
        rows.map(function (r) {
          var mine = ldS(r.assigned_to).toLowerCase() === me;
          var can = mine && r.type === 'listing_new' && ['Pending', 'Working', 'Updated'].indexOf(r.status) >= 0;
          return '<tr' + (r.overdue ? ' style="background:var(--bad-soft)"' : '') + '>' +
            '<td style="text-align:left;max-width:260px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(ldS(r.title)) + '">' + esc(ldS(r.title)) + '</div>' +
              '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(ldS(r.task_id)) + (ldS(r.item_id) ? ' · ' + esc(ldS(r.item_id)) : '') + '</span></td>' +
            '<td style="text-align:left">' + esc(ldS(r.family)) + '</td>' +
            '<td style="text-align:left">' + esc(ldS(r.account)) + '</td>' +
            '<td style="text-align:left">' + esc(ldS(r.assigned_to).split('@')[0]) + '</td>' +
            '<td style="text-align:left;white-space:nowrap' + (r.overdue ? ';color:var(--bad);font-weight:800' : '') + '">' + esc(fmtPkt(r.deadline_pkt, true) || '—') + (r.overdue ? ' · overdue' : '') + '</td>' +
            '<td style="text-align:left">' + esc(ldS(r.status)) + '</td>' +
            '<td>' + (can ? '<button class="minibtn" data-ld-rej="' + esc(ldS(r.task_id)) + '">Can’t list this</button>' : '') + '</td></tr>' +
            (can ? '<tr class="tk-x"><td colspan="7"><div class="ld-rej hidden" data-ld-form="' + esc(ldS(r.task_id)) + '">' +
              '<b style="font-size:12px">Send back for rejection — Management approves it before it counts.</b>' +
              '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
                '<select data-ld-reason="' + esc(ldS(r.task_id)) + '">' + LD_REASONS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
                '<button class="minibtn" data-ld-send="' + esc(ldS(r.task_id)) + '">Send to Management</button>' +
                '<button class="minibtn" data-ld-cancel="' + esc(ldS(r.task_id)) + '">Cancel</button>' +
              '</div></div></td></tr>' : '');
        }).join('') + '</tbody></table></div>');

      var box = $('ldRows');
      box.querySelectorAll('[data-ld-rej]').forEach(function (b) {
        b.onclick = function () {
          var f2 = box.querySelector('[data-ld-form="' + this.getAttribute('data-ld-rej').replace(/"/g, '') + '"]');
          if (f2) { f2.classList.toggle('hidden'); }
        };
      });
      box.querySelectorAll('[data-ld-cancel]').forEach(function (b) {
        b.onclick = function () {
          var f2 = box.querySelector('[data-ld-form="' + this.getAttribute('data-ld-cancel').replace(/"/g, '') + '"]');
          if (f2) { f2.classList.add('hidden'); }
        };
      });
      box.querySelectorAll('[data-ld-send]').forEach(function (b) {
        b.onclick = function () {
          var id = this.getAttribute('data-ld-send');
          var sel = box.querySelector('[data-ld-reason="' + id.replace(/"/g, '') + '"]');
          var btn = this;
          btn.disabled = true;
          api('listerRejectRequest', { task_id: id, reason: sel ? sel.value : '' }).then(function () {
            toast('Sent to Management for rejection approval.');
            ldLoad();
          }).catch(function (e) { btn.disabled = false; toast(e.message); });
        };
      });
    }).done.catch(function (e) {
      setHTML('ldTiles', '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>');
      setHTML('ldRows', ''); setHTML('ldCpc', '');
    });
  }

})();
