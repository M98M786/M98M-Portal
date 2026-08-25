/* view-deptBoard.js — R8-1: "Pending tasks for <Department>" — management sees every
 * department's live load; a department member sees their own first. System-made vs
 * management-made split + decided-task history. Backend: deptPending (AS). */
(function () {
  'use strict';

  var DB_ROLE_DEPT = {
    'Product Hunter': 'Hunting', 'Item Lister': 'Listing', 'Listing Manager': 'Listing',
    'Advertising Manager': 'Advertising', 'Order Processor': 'Orders', 'CS': 'CS',
    'Pricing': 'Listing', 'Team Lead': 'Listing',
  };

  VIEW_CSS.push(
    '.db-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}' +
    '.db-card{border:1px solid var(--gold-line);border-radius:13px;padding:14px 16px;background:var(--panel-2)}' +
    '.db-card.mine{border-color:var(--gold-line-hi);box-shadow:var(--glow-gold)}' +
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

  VIEWS.deptBoard = {
    label: 'Departments',
    icon: '<path d="M3 9h18M9 3v18M3 4h17v16H4z"/>',
    roles: '*',
    order: 3.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Pending tasks <span class="goldtext">by department</span></h1>' +
          '<span class="sub">who is doing what right now — open work, overdue, and where every task came from</span>' +
          '<button class="minibtn" id="dbRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="dbBody" class="enter d2"><div class="spinner"></div></div>' +
        '<div class="card enter d3" style="margin-top:14px"><div class="hd">Recently completed ' +
          '<span class="hint">newest first · who made the task</span></div>' +
          '<div class="bd" id="dbHist"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('dbRefresh').onclick = dbLoad;
      dbLoad();
    }
  };

  function dbS(v) { return String(v == null ? '' : v); }

  function dbLoad() {
    cachedCall('deptPending', {}, function (d) {
      d = d || {};
      var mineDept = DB_ROLE_DEPT[(STATE.user && STATE.user.role) || ''] || '';
      var depts = (d.departments || []).slice();
      depts.sort(function (a, b) { return (b.dept === mineDept) - (a.dept === mineDept) || b.open - a.open; });
      if (!depts.length) {
        setHTML('dbBody', '<div class="hu-hint">No open tasks anywhere — clean board.</div>');
      } else {
        setHTML('dbBody', '<div class="db-grid">' + depts.map(function (r) {
          var by = Object.keys(r.by_assignee || {}).map(function (k) { return { who: k, n: r.by_assignee[k] }; })
            .sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
          return '<div class="db-card' + (r.dept === mineDept ? ' mine' : '') + '">' +
            '<h3>Pending tasks for ' + esc(r.dept) + (r.dept === mineDept ? ' <span class="pill hu-wait" style="font-size:9.5px">your dept</span>' : '') + '</h3>' +
            '<div class="db-n">' + r.open + (r.overdue ? ' <span class="db-bad" style="font-size:14px">· ' + r.overdue + ' overdue</span>' : '') + '</div>' +
            '<div class="db-sub">oldest waiting since ' + esc(fmtPkt(r.oldest, true) || '—') + '</div>' +
            '<div style="margin-top:9px">' +
              '<div class="db-row"><span class="k">By system</span><span>' + (r.system_made || 0) + '</span></div>' +
              '<div class="db-row"><span class="k">By management</span><span>' + (r.mgmt_made || 0) + '</span></div>' +
              by.map(function (x) {
                return '<div class="db-row"><span class="k">' + esc(dbS(x.who).split('@')[0]) + '</span><span>' + x.n + ' open</span></div>';
              }).join('') +
            '</div></div>';
        }).join('') + '</div>');
      }
      var hist = d.history || [];
      setHTML('dbHist', hist.length ? hist.map(function (h) {
        return '<div class="db-hist"><span class="o ' + (h.origin === 'system' ? 'sys' : 'mgm') + '">' + (h.origin === 'system' ? 'system' : 'mgmt') + '</span>' +
          '<b style="min-width:82px">' + esc(dbS(h.dept)) + '</b>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(dbS(h.title)) + '</span>' +
          '<span style="color:var(--text-3);font-size:11px">' + esc(dbS(h.assigned_to).split('@')[0]) + ' · ' + esc(fmtPkt(h.decided_at, true) || '') + '</span></div>';
      }).join('') : '<div class="hu-hint" style="margin-top:0">Nothing completed yet today.</div>');
    }).done.catch(function (e) {
      setHTML('dbBody', '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>');
      setHTML('dbHist', '');
    });
  }

})();
