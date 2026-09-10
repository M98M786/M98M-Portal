/* view-videoRev.js — VIDEO PRODUCT REVISION (owner, 10 Sept): the Tier-2 second step. The
 * Advertising Manager sends an item here; the lister adds a product video on the eBay listing
 * itself and records the link — "to get that product running". Every recorded video is kept. */
(function () {
  var VR_ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'Team Lead', 'Listing Manager', 'Item Lister'];

  function load() {
    var box = $('vrBody');
    if (!box) { return; }
    var U = window.LADDER_UI;
    engineCall('ladderQueue', { page: 'r72' }, 25000).then(function (d) {
      /* the video queue rides the ladder rows: video_status QUEUED = waiting for the lister */
      return engineCall('ladderVideoList', {}, 20000).catch(function () { return null; }).then(function (vl) {
        var wait = (vl && vl.queue) || [];
        var done = (vl && vl.done) || [];
        var h = '<div class="lr-sec">Waiting for a video · ' + wait.length + '</div>';
        if (!wait.length) { h += '<div style="color:var(--text-3);font-weight:600;font-size:12.5px">No items are waiting for a video right now.</div>'; }
        wait.forEach(function (r) {
          h += '<div class="lr-row">' + U.lrHead(r) +
            '<div class="lr-form" style="display:grid;grid-template-columns:1fr auto;gap:9px;border-top:0;padding-top:0;margin-top:10px">' +
            '<input class="lr-note" data-vlink="' + esc(r.item_id) + '" placeholder="Paste the product video link (https)">' +
            '<button class="btn-gold" data-vact="done" data-id="' + esc(r.item_id) + '">Video added ✓</button></div></div>';
        });
        h += '<div class="lr-sec">Videos on record · ' + done.length + '</div>';
        done.forEach(function (r) {
          h += '<div class="lr-meta" style="margin-bottom:6px"><span class="mono">' + esc(r.item_id) + '</span>' +
            '<span>' + esc((r.title || '').slice(0, 50)) + '</span>' +
            (safeUrl(r.video_link) ? '<a class="minibtn" href="' + safeUrl(r.video_link).replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer">Open video</a>' : '') + '</div>';
        });
        box.innerHTML = h;
        box.onclick = function (ev) {
          var b = ev.target && ev.target.closest ? ev.target.closest('[data-vact]') : null;
          if (!b) { return; }
          var id = b.getAttribute('data-id');
          var inp = box.querySelector('[data-vlink="' + id + '"]');
          if (!inp || !/^https?:\/\//i.test(inp.value.trim())) { toast('Paste the video link first (https…).'); if (inp) { inp.focus(); } return; }
          b.disabled = true;
          engineCall('ladderVideo', { item_id: id, op: 'done', link: inp.value.trim() }, 20000)
            .then(function () { toast('Video recorded — the Advertising Manager has been told.'); load(); })
            .catch(function (e) { b.disabled = false; toast(e.message); });
        };
      });
    }).catch(function (e) { box.innerHTML = '<div style="color:var(--text-2);font-weight:700">' + esc(e.message) + '</div>'; });
  }

  VIEWS.videoRev = {
    label: 'Video revisions',
    order: 17.67,
    roles: VR_ROLES,
    icon: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="M16 10l6-3v10l-6-3z"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Video <span class="goldtext">revisions</span></h1>' +
        '<span class="sub">Tier-2 step two — add the product video on the eBay listing, then record the link here</span>' +
        '<button class="minibtn" id="vrRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="vrBody" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () { $('vrRefresh').onclick = load; load(); },
  };
})();
