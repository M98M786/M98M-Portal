/* view-huntDesk.js — R8-2: the Product Hunting dashboard (Irfan and every hunter, plus a
 * fleet view for Management/Team Lead). Backend: huntDesk · huntReasons · huntReasonAdd (AS)
 * + missing-link tasks arrive as normal tasks. Design: docs/R8-DESIGN.md §2. */
(function () {
  'use strict';

  var HD_MGMT_ROLES = ['Management', 'Ops Head', 'Team Lead'];
  var HD_ROLES = ['Product Hunter', 'Management', 'Ops Head', 'Team Lead'];

  VIEW_CSS.push(
    '.hd-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.hd-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.hd-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.hd-tile b{display:block;font-size:23px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.hd-tile .s{font-size:10.5px;color:var(--text-3);font-weight:700}' +
    '.hd-tile.gold b{color:var(--gold-a)}.hd-tile.ok b{color:var(--ok)}.hd-tile.warn b{color:var(--warn)}.hd-tile.bad b{color:var(--bad)}' +
    '.hd-task{border:1px solid var(--gold-line);border-radius:11px;padding:11px 13px;margin-top:9px;background:var(--panel)}' +
    '.hd-task.warn{border-color:rgba(255,159,67,.45);background:var(--warn-soft)}' +
    '.hd-task .t{font-weight:800;font-size:13px}' +
    '.hd-task .m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.hd-task .d{font-size:12px;color:var(--text-2);font-weight:600;margin-top:6px;white-space:pre-wrap;word-break:break-word}' +
    '.hd-rsn{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:12.5px;font-weight:700;border-bottom:1px solid var(--gold-line)}' +
    '.hd-rsn .bar{flex:1;height:9px;border-radius:5px;background:rgba(120,132,152,.15);overflow:hidden}' +
    '.hd-rsn .bar i{display:block;height:100%;background:var(--bad);border-radius:5px}' +
    '.hd-rsn b{min-width:26px;text-align:right}' +
    '.hd-add{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}' +
    '.hd-add input{flex:1;min-width:200px;padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}'
  );

  function hdS(v) { return String(v == null ? '' : v).trim(); }

  VIEWS.huntDesk = {
    label: 'Hunting dashboard',
    icon: '<path d="M4 19V5"/><path d="M4 15l4-4 4 3 5-6 3 3"/><path d="M4 19h16"/>',
    roles: HD_ROLES,
    order: 14.5,
    /* R8: the badge is the Irfan fix made visible — a revision or a link request sent to a
       hunter shows on the nav the moment they sign in, without opening anything. */
    prefetch: function () { return hdCount(); },
    badge: function () { return (STATE.counts && STATE.counts.huntDesk) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Hunting <span class="goldtext">dashboard</span></h1>' +
          '<span class="sub">your hunting at a glance — approvals, revisions, link requests, and why products get rejected</span>' +
          '<button class="minibtn" id="hdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="hdTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2"><div class="hd">Needs your hand now ' +
          '<span class="hint">revisions sent back to you and supplier-link requests — oldest first</span></div>' +
          '<div class="bd" id="hdTasks"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Why products get rejected ' +
          '<span class="hint">last 30 days</span></div>' +
          '<div class="bd" id="hdReasons"><div class="spinner"></div></div></div>' +
        '<div class="card enter d3 hidden" id="hdFleetCard" style="margin-top:14px"><div class="hd">Hunter to hunter ' +
          '<span class="hint">this month first</span></div>' +
          '<div class="bd" id="hdFleet"></div></div>';
    },
    init: function () {
      $('hdRefresh').onclick = hdLoad;
      hdLoad();
    }
  };

  /** Badge feed: what waits on THIS person — revisions sent back plus supplier-link requests. */
  function hdCount() {
    return api('huntDesk', {}).then(function (d) {
      var m = (d && d.mine) || {};
      var n = (Number(m.revision) || 0) + (((d && d.open_tasks) || []).length);
      try { STATE.counts.huntDesk = n; if (typeof refreshBadges === 'function') { refreshBadges(); } } catch (e) {}
      return d;
    });
  }

  function hdLoad() {
    api('huntDesk', {}).then(function (d) {
      try {
        var m0 = d.mine || {};
        STATE.counts.huntDesk = (Number(m0.revision) || 0) + ((d.open_tasks || []).length);
        if (typeof refreshBadges === 'function') { refreshBadges(); }
      } catch (e) {}
      d = d || {};
      var m = d.mine || { hunted: 0, hunted_month: 0, approved: 0, approved_month: 0, pending: 0, revision: 0, rejected_30d: 0 };
      var linkTasks = (d.open_tasks || []).filter(function (t) { return t.type === 'sourcing_link'; });
      var revTasks = (d.open_tasks || []).filter(function (t) { return t.type !== 'sourcing_link'; });
      $('hdTiles').innerHTML = '<div class="hd-tiles">' +
        '<div class="hd-tile gold"><span class="k">Hunted · this month</span><b>' + (m.hunted_month || 0) + '</b><span class="s">' + (m.hunted || 0) + ' all time</span></div>' +
        '<div class="hd-tile ok"><span class="k">Approved · this month</span><b>' + (m.approved_month || 0) + '</b><span class="s">' + (m.approved || 0) + ' all time</span></div>' +
        '<div class="hd-tile"><span class="k">Awaiting approval</span><b>' + (m.pending || 0) + '</b></div>' +
        '<div class="hd-tile warn"><span class="k">Revision required</span><b>' + ((m.revision || 0) + revTasks.length) + '</b><span class="s">sent back by Management</span></div>' +
        '<div class="hd-tile bad"><span class="k">Link requests</span><b>' + linkTasks.length + '</b><span class="s">orders waiting on your links</span></div>' +
        '<div class="hd-tile"><span class="k">Rejected · 30 days</span><b>' + (m.rejected_30d || 0) + '</b></div>' +
      '</div>';

      var tb = $('hdTasks');
      if (!(d.open_tasks || []).length && !(m.revision || 0)) {
        tb.innerHTML = '<div class="hu-hint" style="margin-top:0">Nothing waits on you — clear. New revisions and link requests land here with a bell.</div>';
      } else {
        var h = '';
        if (m.revision) {
          h += '<div class="hd-task warn"><div class="t">🟡 ' + m.revision + ' hunt(s) sent back for revision</div>' +
            '<div class="m">Open <b>Product hunting → My hunts → Revision required</b> — each card carries what is missing and a Revise &amp; resubmit button.</div></div>';
        }
        (d.open_tasks || []).forEach(function (t) {
          h += '<div class="hd-task' + (t.type === 'sourcing_link' ? ' warn' : '') + '">' +
            '<div class="t">' + (t.type === 'sourcing_link' ? '🔗 ' : '🔧 ') + esc(hdS(t.title)) + '</div>' +
            '<div class="m">' + esc(t.type) + (hdS(t.item_id) ? ' · item <span class="mono">' + esc(hdS(t.item_id)) + '</span>' : '') +
              ' · due ' + esc(fmtPkt(t.deadline_pkt, true) || '—') + ' · ' + esc(hdS(t.status)) + '</div>' +
            (hdS(t.details) ? '<div class="d">' + esc(hdS(t.details).slice(0, 260)) + '</div>' : '') +
            '<div class="hu-btns" style="margin-top:8px">' +
              (t.type === 'sourcing_link' ? '<button class="minibtn" data-hd-go="sourcing">Open Sourcing → add the link</button>' : '<button class="minibtn" data-hd-go="tasks">Open My tasks</button>') +
            '</div></div>';
        });
        tb.innerHTML = h;
        tb.querySelectorAll('[data-hd-go]').forEach(function (b) {
          b.onclick = function () {
            var k = this.getAttribute('data-hd-go');
            try { location.hash = k; renderView(k); } catch (e) {}
          };
        });
      }

      var rb = $('hdReasons');
      var rs = d.rejection_reasons || [];
      if (!rs.length) {
        rb.innerHTML = '<div class="hu-hint" style="margin-top:0">No rejections recorded in the last 30 days.</div>';
      } else {
        var mx = rs[0].n || 1;
        rb.innerHTML = rs.map(function (r) {
          return '<div class="hd-rsn"><span style="flex:0 0 min(46%,300px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(hdS(r.reason)) + '">' + esc(hdS(r.reason)) + '</span>' +
            '<span class="bar"><i style="width:' + Math.max(4, Math.round(r.n / mx * 100)) + '%"></i></span><b>' + r.n + '</b></div>';
        }).join('') + '<div class="hu-hint">Read these before the next hunt — they are the fastest way to raise your approval rate.</div>';
      }

      var mgmt = HD_MGMT_ROLES.indexOf((STATE.user && STATE.user.role) || '') >= 0 || (STATE.user && STATE.user.super);
      if (mgmt && (d.hunters || []).length) {
        $('hdFleetCard').classList.remove('hidden');
        $('hdFleet').innerHTML = '<div class="scroll"><table class="ir-tbl" style="min-width:620px"><thead><tr>' +
          '<th style="text-align:left">Hunter</th><th>Hunted · month</th><th>Approved · month</th><th>Pending</th><th>In revision</th><th>Rejected · 30d</th></tr></thead><tbody>' +
          d.hunters.map(function (p) {
            return '<tr' + (p.my ? ' style="background:var(--blue-soft)"' : '') + '><td style="text-align:left;font-weight:800">' + esc(hdS(p.hunter).split('@')[0]) + '</td>' +
              '<td class="num">' + p.hunted_month + '</td><td class="num" style="color:var(--ok)">' + p.approved_month + '</td>' +
              '<td class="num">' + p.pending + '</td><td class="num"' + (p.revision ? ' style="color:var(--warn);font-weight:800"' : '') + '>' + p.revision + '</td>' +
              '<td class="num"' + (p.rejected_30d ? ' style="color:var(--bad)"' : '') + '>' + p.rejected_30d + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
    }).catch(function (e) {
      $('hdTiles').innerHTML = '<div class="hu-hint">The dashboard could not load: ' + esc(e.message) + '</div>';
      $('hdTasks').innerHTML = ''; $('hdReasons').innerHTML = '';
    });
  }

})();
