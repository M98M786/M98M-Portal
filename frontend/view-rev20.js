/* view-rev20.js — the 20-DAYS REVISION desk (owner, 10 Sept): sales-triggered revisions.
 * Day 10: fewer than 5 sales since go-live → here. Day 20: fewer than 5 more in the second
 * window → here AGAIN and simultaneously on Management's Listing-decisions desk for the final
 * call. Same decision machinery as the 72-hours page (keywords, comment, tiers) — the shared
 * UI helpers live in view-rev72.js (window.LADDER_UI, resolved at runtime). */
(function () {
  var L20_ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'Team Lead', 'Listing Manager'];

  function load() {
    var box = $('r20Body');
    if (!box) { return; }
    var U = window.LADDER_UI;
    engineCall('ladderQueue', { page: 'r20' }, 30000).then(function (d) {
      var can = d.canDecide, h = '';
      function section(rows, label, stage, badge) {
        h += '<div class="lr-sec">' + label + ' · ' + rows.length + '</div>';
        if (!rows.length) { h += '<div style="color:var(--text-3);font-weight:600;font-size:12.5px">Nothing here right now.</div>'; }
        rows.forEach(function (r) {
          var extra = '<span class="lr-badge">' + esc(String(r.sales || 0)) + ' sale(s) in window</span>' + (badge || '');
          h += '<div class="lr-row">' + U.lrHead(r, extra) +
            '<div class="lr-btns">' +
            '<button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research</button>' +
            (can ? '<button class="minibtn" data-lact="noRev" data-stage="' + stage + '" data-id="' + esc(r.item_id) + '">No revision required</button>' +
                   '<button class="btn-gold" data-lact="openRev" data-id="' + esc(r.item_id) + '">Revision required…</button>' : '') +
            '</div></div>' +
            '<div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div>' +
            (can ? U.lrDecisionForm(r, stage) : '') + '</div>';
        });
      }
      section(d.day10 || [], 'Day-10 — under 5 sales since go-live', 'R10', '');
      section(d.day20 || [], 'Day-20 — under 5 sales in the second window', 'R20',
        '<span class="lr-badge" style="color:var(--gold-a)">also with Management for the final call</span>');
      var rec = d.recent || [];
      if (rec.length) {
        h += '<div class="lr-sec">Recently decided</div>';
        rec.forEach(function (x) {
          h += '<div class="lr-meta" style="margin-bottom:6px"><span class="mono">' + esc(x.item_id) + '</span><span>' + esc((x.title || '').slice(0, 50)) + '</span>' +
            '<span><b>' + esc(x.stage) + ' · ' + esc(x.decision) + (x.tier ? ' · Tier ' + esc(x.tier.replace('T', '')) : '') + '</b></span><span>' + esc(x.decided_at) + '</span></div>';
        });
      }
      box.innerHTML = h;
      /* the same wiring the 72-hours page uses — one delegated handler per page */
      box.onclick = function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-lact]') : null;
        if (!b) { return; }
        var act = b.getAttribute('data-lact'), id = b.getAttribute('data-id');
        if (act === 'research') { U.lrResearchToggle(box, id); return; }
        if (act === 'openRev') { var f = box.querySelector('[data-form="' + id + '"]'); if (f) { f.classList.toggle('hidden'); } return; }
        if (act === 'noRev' || act === 'submitRev') {
          var payload = { item_id: id, stage: b.getAttribute('data-stage'), decision: act === 'noRev' ? 'NO_REVISION' : 'REVISION' };
          if (act === 'submitRev') {
            var tkw = box.querySelector('[data-tkw="' + id + '"]'), dkw = box.querySelector('[data-dkw="' + id + '"]');
            var cmt = box.querySelector('[data-cmt="' + id + '"]'), tierEl = box.querySelector('input[name="tier-' + id + '"]:checked');
            if (!tkw || !tkw.value.trim()) { toast('Title keywords are mandatory for a revision.'); if (tkw) { tkw.focus(); } return; }
            payload.tier = tierEl ? tierEl.value : 'T1'; payload.title_keywords = tkw.value;
            payload.desc_keywords = dkw ? dkw.value : ''; payload.comment = cmt ? cmt.value : '';
          }
          b.disabled = true;
          engineCall('ladderDecide', payload, 25000)
            .then(function (r) { toast(act === 'noRev' ? 'Marked: no revision required.' : 'Revision sent — ' + (r.task || 'task raised') + '.'); load(); })
            .catch(function (e) { b.disabled = false; toast(e.message); });
        }
      };
      box.oninput = function (ev) {
        var t = ev.target;
        if (t && t.hasAttribute && t.hasAttribute('data-tkw')) { var c = box.querySelector('[data-tkc="' + t.getAttribute('data-tkw') + '"]'); if (c) { c.textContent = U.lrKwCount(t.value) + ' keywords'; } }
        if (t && t.hasAttribute && t.hasAttribute('data-dkw')) { var c2 = box.querySelector('[data-dkc="' + t.getAttribute('data-dkw') + '"]'); if (c2) { c2.textContent = U.lrKwCount(t.value) + ' keywords'; } }
      };
    }).catch(function (e) { box.innerHTML = '<div style="color:var(--text-2);font-weight:700">' + esc(e.message) + '</div>'; });
  }

  VIEWS.rev20 = {
    label: '20-days revision',
    order: 17.66,
    roles: L20_ROLES,
    icon: '<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M9 16l2 2 4-4"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>20-days <span class="goldtext">revision</span></h1>' +
        '<span class="sub">the sales ladder: day-10 under 5 sales, day-20 under 5 more — the system sends them, the Advertising Manager decides</span>' +
        '<button class="minibtn" id="r20Refresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="r20Body" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () { $('r20Refresh').onclick = load; load(); },
  };
})();
