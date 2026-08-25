/* view-rev72.js — R8-3f: the 72-hour revision dashboard. Every listing_revision in flight,
 * bucketed by its window: overdue · due today · ahead · done this week. Manager sees everyone,
 * a lister sees their own. Backend: listDesk (rows carry type/deadline/assignee). */
(function () {
  'use strict';

  var RV_ROLES = ['Item Lister', 'Listing Manager', 'Team Lead', 'Management', 'Ops Head', 'Advertising Manager'];

  VIEW_CSS.push(
    '.rv-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.rv-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.rv-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rv-t b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.rv-t.bad b{color:var(--bad)}.rv-t.warn b{color:var(--warn)}.rv-t.ok b{color:var(--ok)}' +
    '.rv-sec{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin:14px 0 6px}'
  );

  function rvS(v) { return String(v == null ? '' : v); }

  VIEWS.rev72 = {
    label: '72-hour revisions',
    icon: '<path d="M12 8v5l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v4h4"/>',
    roles: RV_ROLES,
    order: 17.7,
    render: function () {
      return '<div class="hgroup enter d1"><h1>72-hour <span class="goldtext">revisions</span></h1>' +
          '<span class="sub">the day-3 revision on every listing — window 1:00–5:00 PM UK</span>' +
          '<button class="minibtn" id="rvRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="rvTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2"><div class="bd" id="rvBody"><div class="spinner"></div></div></div>';
    },
    init: function () { $('rvRefresh').onclick = rvLoad; rvLoad(); }
  };

  function rvLoad() {
    cachedCall('listDesk', {}, function (d) {
      var rows = ((d && d.rows) || []).filter(function (r) { return r.type === 'listing_revision'; });
      var now = Date.now(), day = 86400000;
      var late = [], today = [], ahead = [];
      rows.forEach(function (r) {
        var t = Date.parse(rvS(r.deadline_pkt)) || 0;
        if (!t) { ahead.push(r); return; }
        if (t < now) { late.push(r); } else if (t - now < day) { today.push(r); } else { ahead.push(r); }
      });
      $('rvTiles').innerHTML = '<div class="rv-tiles">' +
        '<div class="rv-t bad"><span class="k">Overdue</span><b>' + late.length + '</b></div>' +
        '<div class="rv-t warn"><span class="k">Due today</span><b>' + today.length + '</b></div>' +
        '<div class="rv-t"><span class="k">Ahead</span><b>' + ahead.length + '</b></div>' +
        '<div class="rv-t ok"><span class="k">In flight total</span><b>' + rows.length + '</b></div>' +
      '</div>';
      var sec = function (title, list) {
        if (!list.length) { return ''; }
        return '<div class="rv-sec">' + esc(title) + ' · ' + list.length + '</div>' +
          '<div class="scroll"><table class="ir-tbl" style="min-width:620px"><thead><tr>' +
          '<th style="text-align:left">Item</th><th style="text-align:left">Account</th><th style="text-align:left">Assigned</th>' +
          '<th style="text-align:left">Window ends</th><th style="text-align:left">Status</th></tr></thead><tbody>' +
          list.map(function (r) {
            return '<tr><td style="text-align:left;max-width:260px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(rvS(r.title)) + '</div>' +
              '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(rvS(r.item_id) || rvS(r.task_id)) + '</span></td>' +
              '<td style="text-align:left">' + esc(rvS(r.account)) + '</td>' +
              '<td style="text-align:left">' + esc(rvS(r.assigned_to).split('@')[0]) + '</td>' +
              '<td style="text-align:left;white-space:nowrap' + (r.overdue ? ';color:var(--bad);font-weight:800' : '') + '">' + esc(fmtPkt(r.deadline_pkt, true) || '—') + '</td>' +
              '<td style="text-align:left">' + esc(rvS(r.status)) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      };
      var html = sec('Overdue — fix first', late) + sec('Due today', today) + sec('Ahead', ahead);
      $('rvBody').innerHTML = html || '<div class="hu-hint" style="margin-top:0">No revisions in flight. New ones appear 72 hours after each listing goes live.</div>';
    }).done.catch(function (e) {
      $('rvTiles').innerHTML = '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>';
      $('rvBody').innerHTML = '';
    });
  }

})();
