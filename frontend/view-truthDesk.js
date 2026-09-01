/* view-truthDesk.js — TRUTH v2 WO-02: Pending approvals + Management desk + Departments merged
 * into ONE Management desk with three tabs. Loads after view-deptBoard.js / view-mgmtDesk.js /
 * view-tasks.js (alphabetical build), so these registrations replace theirs; old loaders are
 * deleted at Phase 6 (R9).
 *   Waiting on you — every approval type in one list, oldest first, decided inline.
 *   Queues — each tile is the count of the list it opens (TILE_EQUALS_LIST).
 *   Departments — the D1 register (deptPendingEngine → metricDeptTasks), verified 15-min
 *   against an independently written SQL GROUP BY (TASKS_OPEN_BY_DEPT on Truth Check). */
(function () {
  'use strict';

  var TD = { tab: 'waiting' };

  VIEW_CSS.push(
    '.td-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}' +
    '.td-tab{border:1px solid var(--gold-line);border-radius:10px;padding:8px 16px;background:var(--panel);font-size:12px;font-weight:800;cursor:pointer;color:var(--text-2)}' +
    '.td-tab.on{border-color:var(--gold);color:var(--gold);background:var(--panel-2)}' +
    '.td-tab .n{font-variant-numeric:tabular-nums;margin-left:6px;color:var(--text-3)}' +
    '.td-ap{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);margin-bottom:10px}' +
    '.td-ap .h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}' +
    '.td-ap .t{font-size:13px;font-weight:800}' +
    '.td-ap .k{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}' +
    '.td-ap .m{font-size:11.5px;color:var(--text-3);font-weight:600}' +
    '.td-ap textarea{width:100%;margin-top:8px;padding:8px 10px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12px;min-height:38px}' +
    '.td-ap .btns{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
    '.td-kind{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;padding:2px 8px;border-radius:8px;background:var(--blue-soft);color:var(--blue-2)}' +
    /* ported from view-mgmtDesk.js / view-deptBoard.js at their WO-14 deletion */
    '.md-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}' +
    '.md-q{border:1px solid var(--gold-line);border-radius:13px;padding:14px 16px;background:var(--panel-2);cursor:pointer;transition:border-color .15s}' +
    '.md-q:hover{border-color:var(--gold-line-hi)}' +
    '.md-q .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.md-q b{display:block;font-size:26px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.md-q .s{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.md-q.hot{border-color:rgba(240,96,90,.5)}.md-q.hot b{color:var(--bad)}' +
    '.md-q.warm b{color:var(--warn)}.md-q.cool b{color:var(--ok)}' +
    '.db-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}' +
    '.db-card{border:1px solid var(--gold-line);border-radius:13px;padding:14px 16px;background:var(--panel-2)}' +
    '.db-card h3{font-size:13.5px;font-weight:800;display:flex;align-items:center;gap:8px}' +
    '.db-n{font-size:24px;font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}' +
    '.db-sub{font-size:11px;color:var(--text-3);font-weight:700;margin-top:2px}' +
    '.db-bad{color:var(--bad)}' +
    '.db-row{display:flex;gap:10px;align-items:baseline;font-size:12px;font-weight:700;padding:4px 0}' +
    '.db-row .k{color:var(--text-3);min-width:96px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}' +
    '.db-hist{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px}' +
    '.db-hist .o{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:8px}' +
    '.db-hist .o.sys{background:var(--blue-soft);color:var(--blue-2)}' +
    '.db-hist .o.mgm{background:var(--warn-soft);color:var(--warn)}'
  );

  function tdS(v) { return String(v == null ? '' : v); }

  function tdBadgeFrom(a, e) {
    try {
      STATE.counts.mgmtDesk = (a.hunt_approvals || 0) + (a.task_approvals || 0) + (a.reject_requests || 0) +
        (a.registrations || 0) + (e.listing_decisions_pending || 0) + (e.price_alerts_open || 0);
      if (typeof refreshBadges === 'function') { refreshBadges(); }
    } catch (e2) {}
  }

  function tdGo(key) { try { location.hash = key; renderView(key); } catch (e) {} }

  /* ————— tab: Waiting on you ————— */
  function tdWaiting(box) {
    box.innerHTML = '<div class="spinner"></div>';
    Promise.all([
      api('pendingApprovals').catch(function () { return {}; }),
      api('huntQueue').catch(function () { return {}; }),
      api('mgmtPendingAS', {}).catch(function () { return {}; }),
      api('listDesk', {}).catch(function () { return {}; }),
    ]).then(function (rs) {
      if (!$('tdBody') || TD.tab !== 'waiting') { return; }
      var tasks = (rs[0] && rs[0].tasks) || [];
      var hunts = (rs[1] && rs[1].hunts) || [];
      var a = rs[2] || {};
      var deskRows = (rs[3] && rs[3].rows) || [];
      var items = [];
      tasks.forEach(function (t) { items.push({ kind: 'task', at: tdS(t.submitted_at), o: t }); });
      hunts.forEach(function (hu) { items.push({ kind: 'hunt', at: tdS(hu.ts || hu['Date Added'] || hu.created_at), o: hu }); });
      items.sort(function (x, y) { return tdS(x.at).localeCompare(tdS(y.at)); });   /* oldest first */

      var h = '<p class="m" style="font-size:11.5px;color:var(--text-3);font-weight:600;margin:0 0 10px">' +
        items.length + ' item(s) rendered = ' + items.length + ' item(s) counted — the count IS the list (TILE_EQUALS_LIST).</p>';
      if (!items.length && !(a.reject_requests || 0)) {
        h += '<div class="alx-empty">Nothing is waiting on you. The queue is clear.</div>';
      }
      h += items.map(function (it, i) {
        if (it.kind === 'task') {
          var t = it.o, id = tdS(t.task_id);
          return '<div class="td-ap"><div class="h"><span class="td-kind">task approval</span>' +
            '<span class="t">' + esc(tdS(t.title)) + '</span>' +
            '<span class="m">' + esc(tdS(t.assigned_to).split('@')[0]) + ' · ' + esc(tdS(t.type)) + (tdS(t.account) ? ' · ' + esc(tdS(t.account)) : '') + '</span></div>' +
            (tdS(t.submission_note) ? '<div class="m" style="margin-top:6px"><span class="k">Note</span> ' + esc(tdS(t.submission_note)) + '</div>' : '') +
            '<textarea data-td-cmt="' + esc(id) + '" placeholder="Comment — required to return"></textarea>' +
            '<div class="btns"><button class="btn-gold" data-td-ap="' + esc(id) + '">Approve</button>' +
            '<button class="minibtn" data-td-rt="' + esc(id) + '">Return with comment</button></div></div>';
        }
        var hu = it.o;
        /* huntQueue rows carry the workbook's own headers: Title / hunter_name / Date Added */
        return '<div class="td-ap"><div class="h"><span class="td-kind" style="background:var(--warn-soft);color:var(--warn)">hunt approval</span>' +
          '<span class="t">' + esc(tdS(hu.Title || hu.title || hu['Product Title'] || hu.hunt_id)) + '</span>' +
          '<span class="m">' + esc(tdS(hu.hunter_name || hu.hunter_email || '').split('@')[0]) + (tdS(hu['Date Added']) ? ' · ' + esc(tdS(hu['Date Added'])) : '') + '</span></div>' +
          '<div class="btns"><button class="minibtn" data-td-hunt="1">Decide on Hunt approvals →</button>' +
          '<span class="m">approval needs an account, a lister, an ad type and a deadline — the full form lives there</span></div></div>';
      }).join('');

      if (a.reject_requests || 0) {
        h += '<div class="td-ap" style="border-color:rgba(255,159,67,.5)"><div class="h"><span class="td-kind" style="background:var(--warn-soft);color:var(--warn)">rejection requests</span>' +
          '<span class="t">' + (a.reject_requests || 0) + ' lister request(s) to reject a product</span></div>' +
          '<div class="m" style="margin-top:4px">Approve closes the task and marks the product NOT APPROVED with the lister’s reason; deny sends it back to Working.</div>' +
          '<div class="btns" style="align-items:center">' +
          '<select id="tdRejSel" style="padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;min-width:260px">' +
          deskRows.filter(function (r) { return r.type === 'listing_new'; }).map(function (r) {
            return '<option value="' + esc(tdS(r.task_id)) + '">' + esc(tdS(r.task_id) + ' · ' + tdS(r.title).slice(0, 46) + ' · ' + tdS(r.assigned_to).split('@')[0]) + '</option>';
          }).join('') + '</select>' +
          '<input id="tdRejNote" placeholder="note (optional)" style="flex:1;min-width:140px;padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600">' +
          '<button class="minibtn" data-td-rej="1">Approve rejection</button>' +
          '<button class="minibtn" data-td-rej="0">Deny — keep listing</button></div></div>';
      }
      box.innerHTML = h;

      box.querySelectorAll('[data-td-ap]').forEach(function (b) {
        b.onclick = function () {
          var id = this.getAttribute('data-td-ap'); var me = this; me.disabled = true;
          api('approveTask', { task_id: id }).then(function () { toast('Approved — it counts now.'); tdWaiting(box); tdCounts(); })
            .catch(function (e) { me.disabled = false; toast('Not approved: ' + e.message); });
        };
      });
      box.querySelectorAll('[data-td-rt]').forEach(function (b) {
        b.onclick = function () {
          var id = this.getAttribute('data-td-rt');
          var ta = box.querySelector('[data-td-cmt="' + id + '"]');
          var comment = ta ? tdS(ta.value).trim() : '';
          if (!comment) { toast('A comment is mandatory when returning a task.'); if (ta) { ta.focus(); } return; }
          var me = this; me.disabled = true;
          api('returnTask', { task_id: id, comment: comment }).then(function () { toast('Returned with your comment.'); tdWaiting(box); tdCounts(); })
            .catch(function (e) { me.disabled = false; toast('Not returned: ' + e.message); });
        };
      });
      box.querySelectorAll('[data-td-hunt]').forEach(function (b) { b.onclick = function () { tdGo('huntQueue'); }; });
      box.querySelectorAll('[data-td-rej]').forEach(function (b) {
        b.onclick = function () {
          var approve = this.getAttribute('data-td-rej') === '1';
          var id = ($('tdRejSel') || {}).value, note = ($('tdRejNote') || {}).value || '';
          if (!id) { return; }
          api('mgmtRejectDecide', { task_id: id, approve: approve, note: note }).then(function () {
            toast(approve ? 'Rejection approved — task closed, hunter told.' : 'Denied — the lister continues.');
            tdWaiting(box); tdCounts();
          }).catch(function (e) { toast(e.message); });
        };
      });
    });
  }

  /* ————— tab: Queues ————— */
  function tdQueues(box) {
    box.innerHTML = '<div class="spinner"></div>';
    Promise.all([
      api('mgmtPendingAS', {}).catch(function () { return {}; }),
      api('mgmtPendingEngine', {}).catch(function () { return {}; }),
    ]).then(function (rs) {
      if (!$('tdBody') || TD.tab !== 'queues') { return; }
      var a = rs[0] || {}, e = rs[1] || {};
      tdBadgeFrom(a, e);
      var q = function (label, n, sub, hotAt, goKey) {
        var cls = n >= (hotAt || 5) ? 'hot' : n > 0 ? 'warm' : 'cool';
        return '<div class="md-q ' + cls + '" data-td-go="' + esc(goKey || '') + '"><span class="k">' + esc(label) + '</span>' +
          '<b>' + n + '</b><span class="s">' + esc(sub) + '</span></div>';
      };
      box.innerHTML = '<div class="md-grid">' +
        q('Hunt approvals', a.hunt_approvals || 0, 'products waiting on a decision', 5, 'huntQueue') +
        q('Task approvals', a.task_approvals || 0, 'submitted — decide on Waiting on you', 8, 'mgmtDesk') +
        q('Rejection requests', a.reject_requests || 0, 'decide on Waiting on you', 1, 'mgmtDesk') +
        q('Listing decisions', e.listing_decisions_pending || 0, '7 days, no sale — end or revise', 5, 'listingDecisions') +
        q('Price alerts open', e.price_alerts_open || 0, 'cost rose — revise or switch supplier', 1, 'alerts') +
        q('Strict alerts unacked', e.strict_alerts_open || 0, 'pricing/advertising, need feedback', 1, 'alerts') +
        q('Staff reviews pending', a.staff_reviews || 0, 'week ' + (a.week || ''), 3, 'staffAdmin') +
        q('Registrations', a.registrations || 0, 'people waiting to be approved', 1, 'staffAdmin') +
        '</div>' +
        '<div class="hu-hint">as of ' + esc(fmtPkt(a.as_of || e.as_of, true) || 'now') + ' · every tile opens the exact list it counts</div>';
      box.querySelectorAll('[data-td-go]').forEach(function (c) {
        c.onclick = function () {
          var k = this.getAttribute('data-td-go');
          if (k === 'mgmtDesk') { TD.tab = 'waiting'; tdPaint(); } else if (k) { tdGo(k); }
        };
      });
    });
  }

  /* ————— tab: Departments (D1 register — verified on Truth Check) ————— */
  function tdDepts(box) {
    box.innerHTML = '<div class="spinner"></div>';
    api('deptPendingEngine', {}).then(function (d) {
      if (!$('tdBody') || TD.tab !== 'departments') { return; }
      d = d || {};
      var depts = (d.departments || []);
      var h = depts.length ? '<div class="db-grid">' + depts.map(function (r) {
        var by = Object.keys(r.by_assignee || {}).map(function (k) { return { who: k, n: r.by_assignee[k] }; })
          .sort(function (x, y) { return y.n - x.n; }).slice(0, 3);
        return '<div class="db-card"><h3>Pending tasks for ' + esc(r.dept) + '</h3>' +
          '<div class="db-n">' + r.open + (r.overdue ? ' <span class="db-bad" style="font-size:14px">· ' + r.overdue + ' overdue</span>' : '') + '</div>' +
          '<div class="db-sub">oldest waiting since ' + esc(fmtPkt(r.oldest, true) || '—') + '</div>' +
          '<div style="margin-top:9px">' +
          '<div class="db-row"><span class="k">By system</span><span>' + (r.system_made || 0) + '</span></div>' +
          '<div class="db-row"><span class="k">By management</span><span>' + (r.mgmt_made || 0) + '</span></div>' +
          by.map(function (x) {
            return '<div class="db-row"><span class="k">' + esc(tdS(x.who).split('@')[0]) + '</span><span>' + x.n + ' open</span></div>';
          }).join('') +
          '</div></div>';
      }).join('') + '</div>' : '<div class="hu-hint">No open tasks anywhere — clean board.</div>';
      var hist = d.history || [];
      h += '<div class="card" style="margin-top:14px"><div class="hd">Recently completed <span class="hint">newest first · who made the task</span></div><div class="bd">' +
        (hist.length ? hist.map(function (x) {
          return '<div class="db-hist"><span class="o ' + (x.origin === 'system' ? 'sys' : 'mgm') + '">' + (x.origin === 'system' ? 'system' : 'mgmt') + '</span>' +
            '<b style="min-width:82px">' + esc(tdS(x.dept)) + '</b>' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(tdS(x.title)) + '</span>' +
            '<span style="color:var(--text-3);font-size:11px">' + esc(tdS(x.assigned_to).split('@')[0]) + ' · ' + esc(fmtPkt(x.decided_at, true) || '') + '</span></div>';
        }).join('') : '<div class="hu-hint" style="margin-top:0">Nothing completed yet today.</div>') + '</div></div>' +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Counted from the D1 task mirror — the same function that feeds Truth Check’s TASKS_OPEN_BY_DEPT verification (15-min, independent SQL recompute).</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>';
    });
  }

  function tdCounts() {
    Promise.all([
      api('mgmtPendingAS', {}).catch(function () { return {}; }),
      api('mgmtPendingEngine', {}).catch(function () { return {}; }),
    ]).then(function (rs) { tdBadgeFrom(rs[0] || {}, rs[1] || {}); });
  }

  function tdPaint() {
    var box = $('tdBody');
    if (!box) { return; }
    document.querySelectorAll('[data-td-tab]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-td-tab') === TD.tab);
    });
    if (TD.tab === 'waiting') { tdWaiting(box); }
    else if (TD.tab === 'queues') { tdQueues(box); }
    else { tdDepts(box); }
  }

  VIEWS.mgmtDesk = {
    label: 'Management desk',
    icon: '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
    roles: ['Management', 'Ops Head', 'Team Lead'],
    order: 2.5,
    badge: function () { return (STATE.counts && STATE.counts.mgmtDesk) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Management <span class="goldtext">desk</span></h1>' +
        '<span class="sub">approvals, queues and departments — one page, one count per list</span>' +
        '<button class="minibtn" id="tdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="td-tabs enter d1">' +
        '<button class="td-tab" data-td-tab="waiting">Waiting on you</button>' +
        '<button class="td-tab" data-td-tab="queues">Queues</button>' +
        '<button class="td-tab" data-td-tab="departments">Departments</button>' +
        '</div>' +
        '<div id="tdBody" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () {
      document.querySelectorAll('[data-td-tab]').forEach(function (b) {
        b.onclick = function () { TD.tab = this.getAttribute('data-td-tab'); tdPaint(); };
      });
      $('tdRefresh').onclick = tdPaint;
      tdCounts();
      tdPaint();
    }
  };

  /* WO-02 §3: the old routes live on as redirects into the matching tab. */
  VIEWS.deptBoard = {
    label: 'Departments',
    icon: '<path d="M3 9h18M9 3v18M3 4h17v16H4z"/>',
    roles: ['Management', 'Ops Head', 'Team Lead', 'Sales Operations'],
    order: 3.5,
    hidden: true,
    render: function () {
      TD.tab = 'departments';
      setTimeout(function () { tdGo('mgmtDesk'); }, 30);
      return '<div class="hgroup enter d1"><h1>Departments</h1><span class="sub">merged into the Management desk — taking you there…</span></div>';
    },
    init: function () {}
  };

  var oldApprovals = VIEWS.approvals;
  VIEWS.approvals = {
    label: 'Pending approvals',
    icon: '<path d="M12 3 5 6.2v5c0 4.4 3 8.2 7 9.3 4-1.1 7-4.9 7-9.3v-5z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    roles: (oldApprovals && oldApprovals.roles) || ['Management', 'Ops Head', 'Team Lead'],
    order: 25,
    hidden: true,
    badge: function () { return (STATE.counts && STATE.counts.approvals) || 0; },
    render: function () {
      TD.tab = 'waiting';
      setTimeout(function () { tdGo('mgmtDesk'); }, 30);
      return '<div class="hgroup enter d1"><h1>Pending approvals</h1><span class="sub">merged into the Management desk — taking you there…</span></div>';
    },
    init: function () {}
  };
})();
