/* view-listDesk.js — R8-3a/3b/R8-8: the Listing desk. Manager: everyone's load, deadlines,
 * overdue, account-to-account, CPC vs General/Dynamic monthly split. Lister: own work +
 * reject-back with a reason (goes to Management for approval). Backend: listDesk ·
 * listerRejectRequest · huntReasons (AS). */
(function () {
  'use strict';

  var LD_ROLES = ['Item Lister', 'Listing Manager', 'Team Lead', 'Management', 'Ops Head'];

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
    '.ld-rej select{padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}'
  );

  function ldS(v) { return String(v == null ? '' : v); }

  VIEWS.listDesk = {
    label: 'Listing desk',
    icon: '<path d="M4 5h16M4 10h16M4 15h10"/><path d="m15 17 2 2 4-4"/>',
    roles: LD_ROLES,
    order: 17.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Listing <span class="goldtext">desk</span></h1>' +
          '<span class="sub">assignments, deadlines, overdue — account to account, CPC and General split</span>' +
          '<button class="minibtn" id="ldRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="ldTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div id="ldFams" class="enter d1"></div>' +
        '<div class="card enter d2" id="ldPeopleCard"><div class="hd">Lister to lister ' +
          '<span class="hint">open · overdue · due in 24h · awaiting approval</span></div>' +
          '<div class="bd" id="ldPeople"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">CPC pipeline ' +
          '<span class="hint">the listings whose advertising is about to change — research, campaign set-up, potential-CPC reviews</span></div>' +
          '<div class="bd" id="ldCpc"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">The work, deadline first ' +
          '<span class="hint">every open listing task · reject-back needs a reason and Management approval</span></div>' +
          '<div class="bd" id="ldRows"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('ldRefresh').onclick = ldLoad;
      ldLoad();
    }
  };

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

      if (d.mgmt && per.length) {
        setHTML('ldPeople', '<div class="scroll"><table class="ir-tbl" style="min-width:560px"><thead><tr>' +
          '<th style="text-align:left">Lister</th><th>Open</th><th>Overdue</th><th>Due 24h</th><th>Awaiting approval</th></tr></thead><tbody>' +
          per.map(function (p) {
            return '<tr><td style="text-align:left;font-weight:800">' + esc(ldS(p.assignee).split('@')[0]) + '</td>' +
              '<td class="num">' + p.open + '</td>' +
              '<td class="num"' + (p.overdue ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + p.overdue + '</td>' +
              '<td class="num"' + (p.due_today ? ' style="color:var(--warn);font-weight:800"' : '') + '>' + p.due_today + '</td>' +
              '<td class="num">' + p.submitted + '</td></tr>';
          }).join('') + '</tbody></table></div>');
      } else {
        $('ldPeopleCard').style.display = d.mgmt ? '' : 'none';
      }

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

      var rows = d.rows || [];
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
      setHTML('ldPeople', ''); setHTML('ldRows', ''); setHTML('ldCpc', '');
    });
  }

})();
