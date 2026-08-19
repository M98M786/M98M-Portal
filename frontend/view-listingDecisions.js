/* view-listingDecisions.js — Hasib item 12: the 7-day zero-sale decision board. Management
 * decides END (job → Team Lead), REVISE (job → chosen listing manager) or KEEP. A listing
 * manager opening this screen sees only their own revise jobs. */
(function () {

  var LD_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Listing Manager', 'Item Lister'];
  var LD = { listers: [] };

  VIEW_CSS.push(
    '.ld-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);margin-bottom:10px}' +
    '.ld-row.pend{border-left:3px solid var(--gold-a)}' +
    '.ld-top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}' +
    '.ld-top a{color:inherit;font-weight:800;font-size:13px}' +
    '.ld-meta{font-size:10.5px;color:var(--text-3);font-weight:700}' +
    '.ld-acts{display:flex;gap:8px;align-items:center;margin-top:9px;flex-wrap:wrap}' +
    '.ld-done{font-size:11px;font-weight:800}' +
    '.ld-done.END{color:var(--bad)}.ld-done.REVISE{color:var(--gold-a)}.ld-done.KEEP{color:var(--ok,#5fbf7a)}'
  );

  function ldLoad() {
    var box = $('ldBody');
    if (!box) { return; }
    api('zeroSaleList', {}).then(function (d) {
      d = d || {};
      LD.listers = d.listers || [];
      var rows = d.rows || [];
      if (!rows.length) {
        box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:10px 0">Nothing waiting — no active listing has passed 7 days without a sale.' +
          '<span style="display:block;color:var(--text-3);font-weight:600;font-size:11.5px;margin-top:4px">' + esc(String(d.note || '')) + '</span></div>';
        return;
      }
      var selOpts = '<option value="">to which listing manager…</option>' + LD.listers.map(function (u) {
        return '<option value="' + esc(String(u.email)) + '">' + esc(String(u.name || u.email)) + '</option>';
      }).join('');
      box.innerHTML = rows.map(function (r) {
        var pend = r.status === 'PENDING';
        var h = '<div class="ld-row' + (pend ? ' pend' : '') + '" data-ld="' + esc(String(r.item_id)) + '">' +
          '<div class="ld-top"><a href="https://www.ebay.co.uk/itm/' + esc(String(r.item_id)) + '" target="_blank" rel="noopener noreferrer">' +
            esc(String(r.title || r.item_id).slice(0, 90)) + '</a>' +
            '<span class="ld-meta">£' + (Number(r.price) || 0).toFixed(2) + ' · ' + esc(String(r.account)) + ' · ' + esc(String(r.item_id)) +
            ' · listed ' + esc(String(r.born).slice(0, 10)) + ' (' + esc(String(r.clock)) + ') · 0 sold</span></div>';
        if (pend && d.mgmt) {
          h += '<div class="ld-acts">' +
            '<button class="minibtn" data-ld-v="END">End it → Team Lead</button>' +
            '<button class="minibtn" data-ld-v="REVISE">Revise →</button>' +
            '<select class="alx-sel" data-ld-a>' + selOpts + '</select>' +
            '<button class="minibtn" data-ld-v="KEEP">Keep as is</button></div>';
        } else if (!pend) {
          h += '<div class="ld-acts"><span class="ld-done ' + esc(String(r.status)) + '">' + esc(String(r.status)) + '</span>' +
            '<span class="ld-meta">by ' + esc(String(r.decided_by)) + ' · ' + esc(String(r.decided_at).slice(0, 16)) +
            (r.assignee ? ' · assigned ' + esc(String(r.assignee)) : '') + (r.note ? ' · ' + esc(String(r.note)) : '') + '</span></div>';
        } else {
          h += '<div class="ld-acts"><span class="ld-meta">Waiting on Management</span></div>';
        }
        return h + '</div>';
      }).join('') + '<p style="font-size:11px;color:var(--text-3);font-weight:600">' + esc(String(d.note || '')) + '</p>';

      box.querySelectorAll('[data-ld-v]').forEach(function (b) {
        b.onclick = function () {
          var card = this.closest('[data-ld]');
          var verdict = this.getAttribute('data-ld-v');
          var sel = card.querySelector('[data-ld-a]');
          var assignee = sel ? String(sel.value || '') : '';
          if (verdict === 'REVISE' && !assignee) { toast('Pick which listing manager gets the revise job'); return; }
          this.disabled = true;
          api('zeroSaleDecide', { item_id: card.getAttribute('data-ld'), verdict: verdict, assignee: assignee }).then(function () {
            toast(verdict === 'KEEP' ? 'Kept.' : verdict === 'END' ? 'End job sent to the Team Lead.' : 'Revise job sent.');
            ldLoad();
          }).catch(function (e) { toast(e.message); ldLoad(); });
        };
      });
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:10px 0">Could not load the board.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.listingDecisions = {
    label: 'Listing decisions',
    order: 6.6,
    roles: LD_ROLES,
    icon: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h11"/>',
    prefetch: function () { return api('zeroSaleList', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Listing <span class="goldtext">decisions</span></h1>' +
          '<span class="sub">every new listing that passed 7 days with no sale — end it, revise it, or keep it</span>' +
          '<button class="minibtn" id="ldRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd" id="ldBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var rf = $('ldRefresh');
      if (rf) { rf.onclick = ldLoad; }
      ldLoad();
    }
  };
})();
