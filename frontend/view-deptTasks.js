/* view-deptTasks.js — Hasib (25 Aug): "I need separate task dashboard of each department as the
 * first page in menu of that specific department, which is getting updated timely."
 *
 * One page per department, each the FIRST entry in its own nav group, each showing that
 * department's live task load — and each REFRESHING ITSELF every 45 seconds with a visible
 * "updated HH:MM" stamp, so nobody has to wonder whether the number in front of them is stale.
 * Backend: deptPending (AS) — the same feed the combined Departments board uses. */
(function () {
  'use strict';

  /* dept name (as R8_DEPT_OF_TYPE names it) → view key, label, icon, roles that live there */
  var DT_DEPTS = [
    { dept: 'Listing', key: 'tasksListing', label: 'Listing tasks',
      icon: '<path d="M4 5h16M4 10h16M4 15h10"/><path d="m15 17 2 2 4-4"/>',
      roles: ['Item Lister', 'Listing Manager', 'Team Lead', 'Management', 'Ops Head', 'Sales Operations'] },
    { dept: 'Hunting', key: 'tasksHunting', label: 'Hunting tasks',
      icon: '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/><path d="M16 16l4.5 4.5"/>',
      roles: ['Product Hunter', 'Team Lead', 'Management', 'Ops Head', 'Sales Operations'] },
    { dept: 'Orders', key: 'tasksOrders', label: 'Order tasks',
      icon: '<path d="M3 6h18l-2 12H5z"/><path d="M9 10h6"/>',
      roles: ['Order Processor', 'Team Lead', 'Management', 'Ops Head', 'Sales Operations'] },
    { dept: 'Advertising', key: 'tasksAds', label: 'Advertising tasks',
      icon: '<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
      roles: ['Advertising Manager', 'Team Lead', 'Management', 'Ops Head', 'Sales Operations'] },
    { dept: 'CS', key: 'tasksCS', label: 'CS tasks',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      roles: ['CS', 'Team Lead', 'Management', 'Ops Head', 'Sales Operations'] },
  ];

  VIEW_CSS.push(
    '.dt-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}' +
    '.dt-live{font-size:11px;font-weight:800;color:var(--ok);display:flex;align-items:center;gap:6px}' +
    '.dt-live i{width:7px;height:7px;border-radius:50%;background:var(--ok);display:inline-block;animation:dtPulse 2s infinite}' +
    '@keyframes dtPulse{0%,100%{opacity:1}50%{opacity:.25}}' +
    '.dt-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));margin-bottom:16px}' +
    '.dt-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.dt-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.dt-t b{display:block;font-size:25px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.dt-t .s{font-size:10.5px;color:var(--text-3);font-weight:700}' +
    '.dt-t.gold b{color:var(--gold-a)}.dt-t.bad b{color:var(--bad)}.dt-t.warn b{color:var(--warn)}.dt-t.ok b{color:var(--ok)}' +
    '.dt-who{display:flex;flex-direction:column;gap:7px}' +
    '.dt-row{display:flex;align-items:center;gap:11px;font-size:12.5px;font-weight:700}' +
    '.dt-row .n{min-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.dt-row .bar{flex:1;height:10px;border-radius:5px;background:rgba(120,132,152,.15);overflow:hidden}' +
    '.dt-row .bar i{display:block;height:100%;background:var(--gold-a);border-radius:5px}' +
    '.dt-row b{min-width:30px;text-align:right;font-variant-numeric:tabular-nums}' +
    '.dt-src{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}' +
    '.dt-chip{font-size:11px;font-weight:800;padding:5px 11px;border-radius:9px;border:1px solid var(--gold-line);background:var(--panel)}' +
    '.dt-hist{display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--gold-line);font-size:12px}' +
    '.dt-hist .o{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:7px}' +
    '.dt-hist .o.sys{background:var(--blue-soft);color:var(--blue-2)}' +
    '.dt-hist .o.mgm{background:var(--warn-soft);color:var(--warn)}'
  );

  function dtS(v) { return String(v == null ? '' : v); }
  function dtClock() { return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }

  /* One live timer for whichever department page is open. renderView() replaces the DOM, so the
     timer must die with it — otherwise five pages' timers pile up and hammer the backend. */
  var DT_TIMER = null;
  /* 20 seconds, not 45: a processor finishing a task wants the board to agree with them while
     they are still looking at it. The read is cheap and the page paints from the last answer
     first, so a tick costs a background request, not a spinner. */
  var DT_REFRESH_MS = 20000;
  function dtStopTimer() { if (DT_TIMER) { clearInterval(DT_TIMER); DT_TIMER = null; } }

  /* 27 Aug ("everything is stuck"): with no guard, a 30-150s backend answer let the 20s timer
     STACK requests — every open board multiplied the very load that made the backend slow.
     One fetch in flight PER DEPARTMENT (a shared flag left the next board stuck on its spinner
     when Management switched pages mid-fetch), and a hidden tab does not poll at all.
     DT_SHOWING names the department whose page is actually open, so a late answer for the page
     someone already left can never paint itself onto the wrong board. */
  var DT_BUSY = {};
  var DT_SHOWING = '';
  function dtPaint(deptName) {
    var host = $('dtBody');
    if (!host) { dtStopTimer(); return; }                 // the user navigated away
    if (DT_BUSY[deptName]) { return; }
    DT_BUSY[deptName] = true;
    var hc = cachedCall('deptPending', {}, function (d, cached) {
      if (!$('dtBody')) { dtStopTimer(); return; }
      if (DT_SHOWING !== deptName) { return; }            // the user switched boards mid-fetch
      /* The page may have re-rendered while the fetch was out — the `host` captured at call
         time would then be a DETACHED node: the stamp updates (looked up fresh) while the
         board paints into thin air and the visible spinner never clears. Paint into the
         element that is on screen NOW. */
      host = $('dtBody');
      if (cached) { var st0 = $('dtStamp'); if (st0) { st0.textContent = 'last answer · refreshing…'; } }
      var all = (d && d.departments) || [];
      var mine = null;
      all.forEach(function (x) { if (x.dept === deptName) { mine = x; } });
      var stamp = $('dtStamp');
      if (stamp) { stamp.textContent = 'updated ' + dtClock(); }

      if (!mine) {
        host.innerHTML = '<div class="hu-hint" style="margin-top:0">No open tasks for ' + esc(deptName) + ' right now — this page checks again every 45 seconds.</div>';
        return;
      }
      var by = Object.keys(mine.by_assignee || {}).map(function (k) { return { who: k, n: mine.by_assignee[k] }; })
        .sort(function (a, b) { return b.n - a.n; });
      var mx = by.length ? by[0].n : 1;
      var hist = ((d && d.history) || []).filter(function (h) { return h.dept === deptName; }).slice(0, 12);

      host.innerHTML =
        '<div class="dt-tiles">' +
          '<div class="dt-t gold"><span class="k">Open now</span><b>' + mine.open + '</b><span class="s">waiting to be done</span></div>' +
          '<div class="dt-t ' + (mine.overdue ? 'bad' : 'ok') + '"><span class="k">Overdue</span><b>' + mine.overdue + '</b>' +
            '<span class="s">' + (mine.overdue ? 'past their deadline' : 'nothing late') + '</span></div>' +
          '<div class="dt-t"><span class="k">Oldest waiting</span><b style="font-size:15px">' +
            esc(fmtPkt(mine.oldest, true) || '—') + '</b></div>' +
          '<div class="dt-t"><span class="k">People on it</span><b>' + by.length + '</b></div>' +
        '</div>' +
        '<div class="dt-src">' +
          '<span class="dt-chip">Created by the system: <b>' + (mine.system_made || 0) + '</b></span>' +
          '<span class="dt-chip">Created by Management: <b>' + (mine.mgmt_made || 0) + '</b></span>' +
        '</div>' +
        (by.length ? '<div class="hd" style="margin:18px 0 8px;padding:0;border:0;background:none">Who is carrying it</div>' +
          '<div class="dt-who">' + by.map(function (p) {
            return '<div class="dt-row"><span class="n">' + esc(dtS(p.who).split('@')[0]) + '</span>' +
              '<span class="bar"><i style="width:' + Math.max(5, Math.round(p.n / mx * 100)) + '%"></i></span>' +
              '<b>' + p.n + '</b></div>';
          }).join('') + '</div>' : '') +
        (hist.length ? '<div class="hd" style="margin:18px 0 8px;padding:0;border:0;background:none">Recently finished</div>' +
          hist.map(function (h) {
            return '<div class="dt-hist"><span class="o ' + (h.origin === 'system' ? 'sys' : 'mgm') + '">' +
              (h.origin === 'system' ? 'system' : 'mgmt') + '</span>' +
              '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(dtS(h.title)) + '</span>' +
              '<span style="color:var(--text-3);font-size:11px;white-space:nowrap">' + esc(dtS(h.assigned_to).split('@')[0]) +
              ' · ' + esc(fmtPkt(h.decided_at, true) || '') + '</span></div>';
          }).join('') : '');
    });
    /* cachedCall answers {painted, done} — the promise lives on .done, and a refresh failure on
       an already-painted screen is a toast, not a wipe of good data. */
    if (!hc.painted && host) { host.innerHTML = '<div class="spinner"></div>'; }
    hc.done.then(function () { DT_BUSY[deptName] = false; }, function () { DT_BUSY[deptName] = false; });
    hc.done.catch(function (e) {
      if (hc.painted) { return; }
      if ($('dtBody')) { $('dtBody').innerHTML = '<div class="hu-hint" style="margin-top:0">Could not load: ' + esc(e.message) + '</div>'; }
    });
  }

  DT_DEPTS.forEach(function (D) {
    VIEWS[D.key] = {
      label: D.label,
      icon: D.icon,
      roles: D.roles,
      order: 0.1,                                        // first inside its own nav group
      render: function () {
        return '<div class="hgroup enter d1"><h1>' + esc(D.dept) + ' <span class="goldtext">tasks</span></h1>' +
            '<span class="sub">everything this department owes right now — this page refreshes itself</span>' +
            '<span class="dt-live" style="margin-left:auto"><i></i><span id="dtStamp">loading…</span></span>' +
            '<button class="minibtn" id="dtRefresh">Refresh now</button>' +
          '</div>' +
          '<div id="dtBody"><div class="spinner"></div></div>';
      },
      init: function () {
        dtStopTimer();
        DT_SHOWING = D.dept;
        var go = function () { dtPaint(D.dept); };
        $('dtRefresh').onclick = go;
        go();
        /* "getting updated timely" — the number in front of you is never more than 45s old */
        /* The hidden-tab guard lives on the TICKS only — 28 Aug it sat inside dtPaint and
           blocked even the FIRST paint of a background-opened tab, which then showed a spinner
           until the next visible tick. First paint always runs; returning to the tab repaints. */
        DT_TIMER = setInterval(function () {
          if (!$('dtBody')) { dtStopTimer(); return; }
          if (document.hidden) { return; }
          go();
        }, DT_REFRESH_MS);
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden && $('dtBody')) { go(); }
        });
      }
    };
  });

})();
