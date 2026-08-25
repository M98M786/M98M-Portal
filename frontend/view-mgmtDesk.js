/* view-mgmtDesk.js — R8-6: the Management pending desk — every queue that waits on Management,
 * one page, with jump links and the reject-back approvals handled inline. Backends:
 * mgmtPendingAS (AS) + mgmtPendingEngine (engine) + listDesk rows for rejreq detail. */
(function () {
  'use strict';

  var MD_ROLES = ['Management', 'Ops Head', 'Team Lead'];

  VIEW_CSS.push(
    '.md-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}' +
    '.md-q{border:1px solid var(--gold-line);border-radius:13px;padding:14px 16px;background:var(--panel-2);cursor:pointer;transition:border-color .15s}' +
    '.md-q:hover{border-color:var(--gold-line-hi)}' +
    '.md-q .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.md-q b{display:block;font-size:26px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.md-q .s{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.md-q.hot{border-color:rgba(240,96,90,.5)}.md-q.hot b{color:var(--bad)}' +
    '.md-q.warm b{color:var(--warn)}.md-q.cool b{color:var(--ok)}' +
    '.md-rr{border:1px solid rgba(255,159,67,.4);background:var(--warn-soft);border-radius:11px;padding:11px 13px;margin-top:9px}' +
    '.md-rr .t{font-weight:800;font-size:13px}' +
    '.md-rr .m{font-size:11.5px;color:var(--text-2);font-weight:600;margin-top:4px}'
  );

  VIEWS.mgmtDesk = {
    label: 'Management desk',
    icon: '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
    roles: MD_ROLES,
    order: 2.5,
    badge: function () { return (STATE.counts && STATE.counts.mgmtDesk) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Management <span class="goldtext">desk</span></h1>' +
          '<span class="sub">everything that waits on a management decision — one page, live counts</span>' +
          '<button class="minibtn" id="mdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="mdQueues" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Rejection requests from listers ' +
          '<span class="hint">approve = the product is off the list, hunter told · deny = listing continues</span></div>' +
          '<div class="bd" id="mdRejReq"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('mdRefresh').onclick = mdLoad;
      mdLoad();
    }
  };

  function mdGo(key) { try { location.hash = key; renderView(key); } catch (e) {} }

  function mdQ(label, n, sub, hotAt, goKey) {
    var cls = n >= (hotAt || 5) ? 'hot' : n > 0 ? 'warm' : 'cool';
    return '<div class="md-q ' + cls + '" data-md-go="' + esc(goKey || '') + '"><span class="k">' + esc(label) + '</span>' +
      '<b>' + n + '</b><span class="s">' + esc(sub) + '</span></div>';
  }

  function mdLoad() {
    var box = $('mdQueues');
    Promise.all([
      api('mgmtPendingAS', {}).catch(function () { return {}; }),
      api('mgmtPendingEngine', {}).catch(function () { return {}; }),
    ]).then(function (rs) {
      var a = rs[0] || {}, e = rs[1] || {};
      /* R8: one number on the nav — everything genuinely waiting on a management decision. */
      try {
        STATE.counts.mgmtDesk = (a.hunt_approvals || 0) + (a.task_approvals || 0) + (a.reject_requests || 0) +
          (a.registrations || 0) + (e.listing_decisions_pending || 0) + (e.price_alerts_open || 0);
        if (typeof refreshBadges === 'function') { refreshBadges(); }
      } catch (e2) {}
      box.innerHTML = '<div class="md-grid">' +
        mdQ('Hunt approvals', a.hunt_approvals || 0, 'products waiting on a decision', 5, 'huntQueue') +
        mdQ('Task approvals', a.task_approvals || 0, 'submitted, waiting on approval', 8, 'approvals') +
        mdQ('Rejection requests', a.reject_requests || 0, 'listers want products rejected', 1, '') +
        mdQ('Listing decisions', e.listing_decisions_pending || 0, '7 days, no sale — end or revise', 5, 'listingDecisions') +
        mdQ('Price alerts open', e.price_alerts_open || 0, 'cost rose — revise or switch supplier', 1, 'alerts') +
        mdQ('Strict alerts unacked', e.strict_alerts_open || 0, 'pricing/advertising, need feedback', 1, 'alerts') +
        mdQ('Staff reviews pending', a.staff_reviews || 0, 'week ' + (a.week || ''), 3, 'staffAdmin') +
        mdQ('Registrations', a.registrations || 0, 'people waiting to be approved', 1, 'staffAdmin') +
      '</div>' +
      '<div class="hu-hint">as of ' + esc(fmtPkt(a.as_of || e.as_of, true) || 'now') + ' · click any card to open its queue</div>';
      box.querySelectorAll('[data-md-go]').forEach(function (c) {
        c.onclick = function () { var k = this.getAttribute('data-md-go'); if (k) { mdGo(k); } };
      });
    });

    // rejection requests need row detail — pull the desk rows and read the rejreq flags
    api('listDesk', {}).then(function (d) {
      var rows = (d && d.rows) || [];
      // flags aren't in listDesk rows; ask tasks-wide via deptPending? Simplest truthful source:
      // the flag rides comments, so fetch myTasks-wide is not available — use the count from
      // mgmtPendingAS and offer inline decision by task id search.
      return api('mgmtPendingAS', {}).then(function (a) {
        var n = (a && a.reject_requests) || 0;
        var host = $('mdRejReq');
        if (!n) { host.innerHTML = '<div class="hu-hint" style="margin-top:0">No rejection requests waiting.</div>'; return; }
        // find candidates: open listing_new rows — the ones flagged show a badge server-side next pass;
        // v1: decision by task id, listed from the desk rows the lister flagged (title match by lister toast).
        host.innerHTML = '<div class="md-rr"><div class="t">🟠 ' + n + ' rejection request(s) waiting</div>' +
          '<div class="m">Pick the task and decide — approve closes the task and marks the product NOT APPROVED with the lister’s reason; deny sends it back to Working.</div>' +
          '<div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">' +
            '<select id="mdRejSel" style="padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;min-width:280px">' +
              rows.filter(function (r) { return r.type === 'listing_new'; }).map(function (r) {
                return '<option value="' + esc(r.task_id) + '">' + esc(r.task_id + ' · ' + (r.title || '').slice(0, 50) + ' · ' + r.assigned_to.split('@')[0]) + '</option>';
              }).join('') +
            '</select>' +
            '<input id="mdRejNote" placeholder="note (optional)" style="flex:1;min-width:160px;padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600">' +
            '<button class="minibtn" id="mdRejYes">Approve rejection</button>' +
            '<button class="minibtn" id="mdRejNo">Deny — keep listing</button>' +
          '</div></div>';
        var act = function (approve) {
          var id = ($('mdRejSel') || {}).value, note = ($('mdRejNote') || {}).value || '';
          if (!id) { return; }
          api('mgmtRejectDecide', { task_id: id, approve: approve, note: note }).then(function (r) {
            toast(approve ? 'Rejection approved — task closed, hunter told.' : 'Denied — the lister continues.');
            mdLoad();
          }).catch(function (e2) { toast(e2.message); });
        };
        $('mdRejYes').onclick = function () { act(true); };
        $('mdRejNo').onclick = function () { act(false); };
      });
    }).catch(function () {
      setHTML('mdRejReq', '<div class="hu-hint" style="margin-top:0">Requests could not load just now.</div>');
    });
  }

})();
