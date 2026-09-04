/* view-revisionDesk.js — the Revision desk (28 Aug, owner): "listing revision creation tab
 * connected with automated feature for listings to qualify for sales." One home for revisions:
 * the AUTO-QUEUE (listings the nightly qualifier turned into tasks on its own — live 7+ days,
 * no sales), the counts, and the raise form. The 72-hour archive stays on the rev72 page.
 * Backend: revisionDesk · createTask(listing_revision) · assignableStaff. */
(function () {
  'use strict';

  var RD_ROLES = ['Listing Manager', 'Item Lister', 'Team Lead', 'Ops Head', 'Management',
    'Advertising Manager', 'CS', 'Order Processor', 'Sales Operations'];

  VIEW_CSS.push(
    '.rd-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.rd-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.rd-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rd-t b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.rd-t.bad b{color:var(--bad)}.rd-t.gold b{color:var(--gold-a)}.rd-t.ok b{color:var(--ok)}' +
    '.rd-auto{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:7px;' +
      'background:linear-gradient(135deg,rgba(233,169,60,.2),rgba(233,169,60,.05));border:1px solid var(--gold-line-hi);color:var(--gold-a)}' +
    '.rd-in,.rd-sel,.rd-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.rd-ta{min-height:70px;resize:vertical}' +
    '.rd-lab{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:6px}' +
    '.rd-ok{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--ok-soft);border:1px solid rgba(63,207,142,.4);font-weight:700;font-size:13px;color:var(--ok)}' +
    '.rd-bad{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--warn-soft);border:1px solid rgba(255,159,67,.45);font-weight:700;font-size:13px;color:var(--warn)}'
  );

  function rdS(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function rdAttr(v) { return esc(rdS(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  var RD = { seq: 0, staff: [] };

  VIEWS.revisionDesk = {
    label: 'Revision desk',
    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    roles: RD_ROLES,
    order: 17.6,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Revision <span class="goldtext">desk</span></h1>' +
          '<span class="sub">no-sale listings qualify for a revision AUTOMATICALLY every night — this is the queue, plus the raise form</span>' +
          '<button class="minibtn" id="rdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="rdTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2" id="rdRaiseCard"><div class="hd">Raise a revision' +
          '<span class="hint">explanation required — the lister must know why</span></div>' +
          '<div class="bd" id="rdForm"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">The queue' +
          '<span class="hint">soonest deadline first · AUTO = qualified by the nightly rule (7+ days live, no sales)</span></div>' +
          '<div class="bd" id="rdQueue"><div class="spinner"></div></div></div>' +
        '<div class="card enter d3" style="margin-top:14px"><div class="hd">Recently completed' +
          '<span class="hint">the full 72-hour archive lives on the 72-hour revisions page</span></div>' +
          '<div class="bd" id="rdDone"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('rdRefresh').onclick = function () { rdLoad(); };
      rdLoad();
    }
  };

  function rdLoad() {
    var seq = ++RD.seq;
    api('revisionDesk', {}).then(function (d) {
      if (seq !== RD.seq) { return; }
      d = d || {};
      rdPaintTiles(d.counts || {});
      rdPaintForm(!!d.can_raise);
      rdPaintQueue((d.open || []));
      rdPaintDone((d.done || []));
    }).catch(function (e) {
      if (seq !== RD.seq) { return; }
      setHTML('rdTiles', '<div class="hu-hint" style="margin-top:0">Could not load: ' + esc(e.message) + ' — press Refresh.</div>');
      setHTML('rdForm', ''); setHTML('rdQueue', ''); setHTML('rdDone', '');
    });
  }

  function rdPaintTiles(c) {
    setHTML('rdTiles', '<div class="rd-tiles">' +
      '<div class="rd-t gold"><span class="k">Open revisions</span><b>' + (c.open || 0) + '</b></div>' +
      '<div class="rd-t ' + (c.overdue ? 'bad' : 'ok') + '"><span class="k">Overdue</span><b>' + (c.overdue || 0) + '</b></div>' +
      '<div class="rd-t"><span class="k">Auto-raised · 30d</span><b>' + (c.auto_30d || 0) + '</b></div>' +
      '<div class="rd-t ok"><span class="k">Done · 7 days</span><b>' + (c.done_7d || 0) + '</b></div>' +
    '</div>');
  }

  function rdPaintForm(canRaise) {
    if (!$('rdForm')) { return; }
    if (!canRaise) {
      setHTML('rdForm', '<div class="hu-hint" style="margin-top:0">Your role views this desk; Management, Team Lead, Advertising, CS and Order Processors raise revisions.</div>');
      return;
    }
    setHTML('rdForm',
      '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
        '<div><label class="rd-lab">Account</label><select class="rd-sel" id="rdAcc"><option value="">Loading…</option></select></div>' +
        '<div><label class="rd-lab">Item ID</label><input class="rd-in" id="rdItem" placeholder="eBay item number"></div>' +
        '<div><label class="rd-lab">Assign to</label><select class="rd-sel" id="rdWho"><option value="">Loading…</option></select></div>' +
      '</div>' +
      '<div style="margin-top:12px"><label class="rd-lab">Title / what needs revising</label><input class="rd-in" id="rdTitle" placeholder="the listing, in a line"></div>' +
      '<div style="margin-top:12px"><label class="rd-lab">Things to change (tick all that apply)</label>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:5px">' +
        ['Title', 'Photos', 'Price', 'Description', 'Item specifics'].map(function (c) {
          return '<label style="display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:13px;cursor:pointer"><input type="checkbox" class="rd-thing" value="' + c + '"> ' + c + '</label>';
        }).join('') + '</div></div>' +
      '<div style="margin-top:12px"><label class="rd-lab">Explanation (required)</label><textarea class="rd-ta" id="rdWhy" placeholder="why this listing needs a revision — price, photos, title, keywords…"></textarea></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">' +
        '<button class="btn-gold" id="rdSend">Raise the revision</button>' +
        '<span class="hu-hint" style="margin:0">Creates a listing_revision task with a 72-hour deadline.</span>' +
      '</div><div id="rdOut"></div>');

    api('assignableStaff', { roles: ['Item Lister', 'Listing Manager', 'Team Lead'] }).then(function (d) {
      var sel = $('rdWho');
      if (!sel) { return; }
      RD.staff = (d && d.staff) || [];
      sel.innerHTML = RD.staff.length
        ? RD.staff.map(function (s) { return '<option value="' + rdAttr(s.email) + '">' + esc(s.name || s.email) + '</option>'; }).join('')
        : '<option value="">No listers found</option>';
    }).catch(function () {
      var sel = $('rdWho'); if (sel) { sel.innerHTML = '<option value="">Could not load staff</option>'; }
    });

    api('accountList', {}).then(function (d) {
      var sel = $('rdAcc'); if (!sel) { return; }
      var accs = ((d && d.accounts) || []).map(function (a) { return a.account; }).filter(Boolean);
      sel.innerHTML = '<option value="">Select account…</option>' +
        accs.map(function (a) { return '<option value="' + rdAttr(a) + '">' + esc(a) + '</option>'; }).join('');
    }).catch(function () {
      var sel = $('rdAcc'); if (sel) { sel.innerHTML = '<option value="">Could not load accounts</option>'; }
    });

    $('rdSend').onclick = function () {
      var out = $('rdOut');
      var why = rdS($('rdWhy').value);
      var things = Array.prototype.map.call(document.querySelectorAll('.rd-thing:checked'), function (c) { return c.value; });
      var details = (things.length ? 'Change: ' + things.join(', ') + '\n' : '') + why;
      var payload = {
        type: 'listing_revision', account: rdS($('rdAcc').value), item_id: rdS($('rdItem').value),
        title: 'Revise: ' + (rdS($('rdTitle').value) || rdS($('rdItem').value)),
        details: details, assigned_to: rdS($('rdWho').value), priority: 'High',
      };
      if (!payload.assigned_to) { out.innerHTML = '<div class="rd-bad">Pick who it goes to.</div>'; return; }
      if (!things.length && why.length < 5) { out.innerHTML = '<div class="rd-bad">Tick what to change, or explain why.</div>'; return; }
      var btn = this; btn.disabled = true; btn.textContent = 'Raising…';
      api('createTask', payload).then(function (r) {
        btn.disabled = false; btn.textContent = 'Raise the revision';
        out.innerHTML = '<div class="rd-ok">Raised — ' + esc((r && r.task_id) || 'done') + ', deadline ' + esc(fmtPkt(r && r.deadline_pkt, true) || '72h') + '.</div>';
        var w = $('rdWhy'); if (w) { w.value = ''; }
        var it = $('rdItem'); if (it) { it.value = ''; }
        Array.prototype.forEach.call(document.querySelectorAll('.rd-thing:checked'), function (c) { c.checked = false; });
        rdLoad();
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Raise the revision';
        out.innerHTML = '<div class="rd-bad">' + esc(e.message) + '</div>';
      });
    };
  }

  function rdPaintQueue(open) {
    if (!$('rdQueue')) { return; }
    if (!open.length) {
      setHTML('rdQueue', '<div class="hu-hint" style="margin-top:0">Nothing open — the nightly qualifier raises new ones when listings sit 7+ days with no sale.</div>');
      return;
    }
    setHTML('rdQueue', '<div class="scroll"><table class="ir-tbl" style="min-width:760px"><thead><tr>' +
      '<th style="text-align:left">Source</th><th style="text-align:left">Listing</th><th style="text-align:left">Account</th>' +
      '<th style="text-align:left">Assigned</th><th style="text-align:left">Deadline</th><th style="text-align:left">Status</th></tr></thead><tbody>' +
      open.map(function (t) {
        return '<tr><td style="text-align:left">' + (t.auto ? '<span class="rd-auto">Auto</span>' : '<span class="hu-hint" style="margin:0">manual</span>') + '</td>' +
          '<td style="text-align:left;max-width:280px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + rdAttr(t.title) + '">' + esc(rdS(t.title)) + '</div>' +
            '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(rdS(t.item_id)) + '</span></td>' +
          '<td style="text-align:left">' + esc(rdS(t.account) || '—') + '</td>' +
          '<td style="text-align:left">' + esc(rdS(t.assigned_to).split('@')[0]) + '</td>' +
          '<td style="text-align:left;white-space:nowrap' + (t.overdue ? ';color:var(--bad);font-weight:800' : '') + '">' + esc(fmtPkt(t.deadline_pkt, true) || '—') + '</td>' +
          '<td style="text-align:left">' + esc(rdS(t.status)) + '</td></tr>';
      }).join('') + '</tbody></table></div>');
  }

  function rdPaintDone(done) {
    if (!$('rdDone')) { return; }
    if (!done.length) { setHTML('rdDone', '<div class="hu-hint" style="margin-top:0">None completed yet.</div>'); return; }
    setHTML('rdDone', done.slice(0, 15).map(function (t) {
      return '<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px">' +
        (t.auto ? '<span class="rd-auto">Auto</span>' : '') +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">' + esc(rdS(t.title)) + '</span>' +
        '<span style="color:var(--text-3);font-size:11px;white-space:nowrap">' + esc(rdS(t.assigned_to).split('@')[0]) + ' · ' + esc(fmtPkt(t.decided_at, true) || '') + '</span></div>';
    }).join(''));
  }

})();
