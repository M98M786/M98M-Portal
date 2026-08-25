/* view-staffReviews.js — R8-5: weekly staff working & behavior reviews. Management rates each
 * person 1–5 on behavior and on working, with a short note; the objective side (tasks done,
 * overdue) is shown beside the form so the score is informed, not guessed. Everyone can read
 * their own trend. Backend: staffReviewsPending · staffReviewSave · staffReviewHistory (AS). */
(function () {
  'use strict';

  var SR_MGMT = ['Management', 'Ops Head'];

  VIEW_CSS.push(
    '.sr-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel-2)}' +
    '.sr-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.sr-h b{font-size:13.5px;font-weight:800}' +
    '.sr-h .role{font-size:11px;color:var(--text-3);font-weight:700}' +
    '.sr-ctx{margin-left:auto;font-size:11px;color:var(--text-3);font-weight:700}' +
    '.sr-ctx .bad{color:var(--bad)}' +
    '.sr-f{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:10px;align-items:end}' +
    '.sr-f label{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:4px}' +
    '.sr-in,.sr-sel{width:100%;padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.sr-hist{display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px;font-weight:700}' +
    '.sr-star{color:var(--gold-a);letter-spacing:1px}'
  );

  function srS(v) { return String(v == null ? '' : v); }
  function srStars(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    return '<span class="sr-star">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(5 - n) + '</span></span>';
  }

  VIEWS.staffReviews = {
    label: 'Staff reviews',
    icon: '<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z"/>',
    roles: '*',
    order: 26.5,
    render: function () {
      var mgmt = SR_MGMT.indexOf((STATE.user && STATE.user.role) || '') >= 0 || (STATE.user && STATE.user.super);
      return '<div class="hgroup enter d1"><h1>Staff <span class="goldtext">reviews</span></h1>' +
          '<span class="sub">' + (mgmt ? 'behavior and working, 1–5, once a week — the numbers beside each name are this week’s facts'
            : 'your weekly scores from Management') + '</span>' +
          '<button class="minibtn" id="srRefresh" style="margin-left:auto">Refresh</button></div>' +
        (mgmt ? '<div class="card enter d1"><div class="hd">This week ' +
          '<span class="hint" id="srWeek"></span></div><div class="bd" id="srPending"><div class="spinner"></div></div></div>' : '') +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">' + (mgmt ? 'A person’s history' : 'Your history') +
          '<span class="hint">newest week first</span></div>' +
          '<div class="bd" id="srHist"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('srRefresh').onclick = srLoad;
      srLoad();
    }
  };

  function srLoad() {
    var mgmt = SR_MGMT.indexOf((STATE.user && STATE.user.role) || '') >= 0 || (STATE.user && STATE.user.super);
    if (mgmt) {
      api('staffReviewsPending', {}).then(function (d) {
        d = d || {};
        if ($('srWeek')) { $('srWeek').textContent = srS(d.week); }
        var list = d.pending || [];
        var host = $('srPending');
        /* These calls take about four seconds. Click away inside that window and renderView has
           already replaced the DOM, so the host is gone and painting into it throws an uncaught
           TypeError — which then swallows any real error behind it. $('srWeek') just above was
           already guarded; these were not. */
        if (!host) { return; }
        if (!list.length) {
          host.innerHTML = '<div class="hu-hint" style="margin-top:0">Everyone is reviewed for ' + esc(srS(d.week)) + ' ✓</div>';
          return;
        }
        host.innerHTML = list.map(function (p) {
          var e = srS(p.email);
          return '<div class="sr-row"><div class="sr-h"><b>' + esc(srS(p.name)) + '</b>' +
            '<span class="role">' + esc(srS(p.role)) + '</span>' +
            '<span class="sr-ctx">' + p.tasks_done_7d + ' tasks done · 7d' +
              (p.overdue_now ? ' · <span class="bad">' + p.overdue_now + ' overdue now</span>' : '') + '</span></div>' +
            '<div class="sr-f">' +
              '<div><label>Behavior</label><select class="sr-sel" data-sr-b="' + esc(e) + '">' +
                [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' + n + ' ' + '★'.repeat(n) + '</option>'; }).join('') + '</select></div>' +
              '<div><label>Working</label><select class="sr-sel" data-sr-w="' + esc(e) + '">' +
                [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' + n + ' ' + '★'.repeat(n) + '</option>'; }).join('') + '</select></div>' +
              '<div style="grid-column:span 2"><label>Note</label><input class="sr-in" data-sr-n="' + esc(e) + '" placeholder="what stood out this week"></div>' +
              '<div><button class="btn-gold" data-sr-save="' + esc(e) + '" style="width:100%">Save review</button></div>' +
            '</div></div>';
        }).join('');
        host.querySelectorAll('[data-sr-save]').forEach(function (b) {
          b.onclick = function () {
            var e = this.getAttribute('data-sr-save'), q = function (a) { return host.querySelector('[' + a + '="' + e.replace(/"/g, '') + '"]'); };
            var btn = this; btn.disabled = true;
            api('staffReviewSave', { email: e, behavior: (q('data-sr-b') || {}).value, working: (q('data-sr-w') || {}).value, notes: (q('data-sr-n') || {}).value || '' })
              .then(function () { toast('Review saved.'); srLoad(); })
              .catch(function (err) { btn.disabled = false; toast(err.message); });
          };
        });
      }).catch(function (e) {
        var box = $('srPending');
        if (box) { box.innerHTML = '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>'; }
      });
    }
    api('staffReviewHistory', {}).then(function (d) {
      var rows = (d && d.reviews) || [];
      if (!$('srHist')) { return; }
      $('srHist').innerHTML = rows.length ? rows.map(function (r) {
        return '<div class="sr-hist"><b style="min-width:78px">' + esc(srS(r.week)) + '</b>' +
          '<span>behavior ' + srStars(r.behavior) + '</span><span>working ' + srStars(r.working) + '</span>' +
          (r.notes ? '<span style="flex:1;color:var(--text-3);font-weight:600;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(srS(r.notes)) + '</span>' : '') + '</div>';
      }).join('') : '<div class="hu-hint" style="margin-top:0">No reviews recorded yet.</div>';
    }).catch(function (e) {
      var hb = $('srHist');
      if (hb) { hb.innerHTML = '<div class="hu-hint" style="margin-top:0">' + esc(e.message) + '</div>'; }
    });
  }

})();
