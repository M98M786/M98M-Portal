/* view-staffReviews.js — weekly staff working & behaviour reviews. Owner (6 Sept): behaviour gets a
 * multi-select of default flags + its own note; working gets a SEPARATE multi-select + its own note;
 * plus a browsable archive of previous reviews (any person, for Management). The 1–5 behaviour and
 * working scores stay (the backend keys on them); the flags + the two notes travel inside the single
 * `notes` column as a small JSON blob, so nothing changes server-side. Old plain-text notes still
 * render. Backend: staffReviewsPending · staffReviewSave · staffReviewHistory (AS). */
(function () {
  'use strict';

  var SR_MGMT = ['Management', 'Ops Head', 'Sales Operations'];

  /* default flags — the areas a manager taps to say what stood out this week, good or bad. */
  var BEH_FLAGS = ['Punctuality', 'Attendance', 'Communication', 'Attitude', 'Teamwork',
    'Follows instructions', 'Responsive on chat', 'Honesty', 'Initiative', 'Respect / conduct'];
  var WORK_FLAGS = ['Speed', 'Accuracy', 'Meets deadlines', 'Work quality', 'Follows SOP',
    'Attention to detail', 'Consistency', 'Task completion', 'Tool usage', 'Owns mistakes'];

  VIEW_CSS.push(
    '.sr-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel-2)}' +
    '.sr-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.sr-h b{font-size:13.5px;font-weight:800}' +
    '.sr-h .role{font-size:11px;color:var(--text-3);font-weight:700}' +
    '.sr-ctx{margin-left:auto;font-size:11px;color:var(--text-3);font-weight:700}' +
    '.sr-ctx .bad{color:var(--bad)}' +
    '.sr-dim{border-top:1px solid rgba(120,132,152,.14);margin-top:10px;padding-top:11px}' +
    '.sr-dim>.dl{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-a);margin-bottom:8px}' +
    '.sr-f{display:grid;gap:10px;grid-template-columns:120px 1fr;align-items:start}' +
    '.sr-f label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin-bottom:4px}' +
    '.sr-in,.sr-sel{width:100%;padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    /* multi-select drop box */
    '.sr-ms{position:relative}' +
    '.sr-ms-btn{width:100%;text-align:left;padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px}' +
    '.sr-ms-btn .cnt{margin-left:auto;font-size:11px;font-weight:800;color:var(--gold-a)}' +
    '.sr-ms-btn .cnt.zero{color:var(--text-3)}' +
    '.sr-ms-panel{position:absolute;z-index:30;left:0;right:0;margin-top:5px;background:var(--panel);border:1px solid var(--gold-line-hi);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.35);padding:6px;max-height:230px;overflow:auto}' +
    '.sr-ms-panel label{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:7px;font-size:12.5px;font-weight:600;color:var(--text);cursor:pointer;text-transform:none;letter-spacing:0;margin:0}' +
    '.sr-ms-panel label:hover{background:var(--panel-2)}' +
    '.sr-ms-panel input{width:15px;height:15px;accent-color:var(--gold-a)}' +
    '.sr-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}' +
    '.sr-chip{font-size:10.5px;font-weight:700;border:1px solid var(--gold-line);border-radius:99px;padding:2px 9px;color:var(--text-2);background:var(--panel-2)}' +
    '.sr-save-row{margin-top:12px;display:flex;justify-content:flex-end}' +
    /* archive */
    '.sr-arch-pick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}' +
    '.sr-hist{border:1px solid var(--gold-line);border-radius:11px;padding:10px 13px;margin-top:9px;background:var(--panel-2)}' +
    '.sr-hist .hw{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12.5px;font-weight:800}' +
    '.sr-hist .hb{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.sr-star{color:var(--gold-a);letter-spacing:1px}'
  );

  function srS(v) { return String(v == null ? '' : v); }
  function srStars(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    return '<span class="sr-star">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(5 - n) + '</span></span>';
  }
  /* parse the JSON blob we now store in `notes`; falls back to a plain-text note (older reviews). */
  function srParseNotes(notes) {
    var s = srS(notes).trim();
    if (s.charAt(0) === '{') { try { var o = JSON.parse(s); if (o && o.v) { return o; } } catch (e) {} }
    return { v: 0, bn: s, bt: [], wt: [], wn: '' };
  }
  function srRatingSel(dim, e) {
    return '<select class="sr-sel" data-sr-' + dim + '="' + esc(e) + '">' +
      [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' + n + ' ' + '★'.repeat(n) + '</option>'; }).join('') +
      '</select>';
  }
  function srMulti(dim, e, flags) {
    var id = 'ms-' + dim + '-' + e;
    return '<div class="sr-ms" data-ms="' + esc(id) + '">' +
      '<button type="button" class="sr-ms-btn" data-ms-btn="' + esc(id) + '">Tap the areas that apply <span class="cnt zero" data-ms-cnt="' + esc(id) + '">0</span> <span style="color:var(--text-3)">▾</span></button>' +
      '<div class="sr-ms-panel hidden" data-ms-panel="' + esc(id) + '">' +
        flags.map(function (f) { return '<label><input type="checkbox" value="' + esc(f) + '" data-ms-cb="' + esc(id) + '"> ' + esc(f) + '</label>'; }).join('') +
      '</div></div>';
  }

  VIEWS.staffReviews = {
    label: 'Staff reviews',
    icon: '<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z"/>',
    roles: '*',
    order: 26.5,
    render: function () {
      var mgmt = SR_MGMT.indexOf((STATE.user && STATE.user.role) || '') >= 0 || (STATE.user && STATE.user.super);
      return '<div class="hgroup enter d1"><h1>Staff <span class="goldtext">reviews</span></h1>' +
          '<span class="sub">' + (mgmt ? 'behaviour and working — score 1–5, flag the areas that stood out, add a note for each'
            : 'your weekly scores from Management') + '</span>' +
          '<button class="minibtn" id="srRefresh" style="margin-left:auto">Refresh</button></div>' +
        (mgmt ? '<div class="card enter d1"><div class="hd">This week ' +
          '<span class="hint" id="srWeek"></span></div><div class="bd" id="srPending"><div class="spinner"></div></div></div>' : '') +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">' + (mgmt ? 'Reviews archive' : 'Your history') +
          '<span class="hint">newest week first</span></div>' +
          '<div class="bd" id="srHist"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('srRefresh').onclick = srLoad;
      document.addEventListener('click', srCloseMenus);
      srLoad();
    }
  };

  function srCloseMenus(ev) {
    document.querySelectorAll('[data-ms-panel]').forEach(function (p) {
      var wrap = p.closest('.sr-ms');
      if (wrap && !wrap.contains(ev.target)) { p.classList.add('hidden'); }
    });
  }

  function srWireMulti(host) {
    host.querySelectorAll('[data-ms-btn]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.stopPropagation();
        var id = this.getAttribute('data-ms-btn');
        var panel = host.querySelector('[data-ms-panel="' + id + '"]');
        var open = panel && !panel.classList.contains('hidden');
        srCloseMenus({ target: document.body });
        if (panel && !open) { panel.classList.remove('hidden'); }
      };
    });
    host.querySelectorAll('[data-ms-cb]').forEach(function (cb) {
      cb.onchange = function () {
        var id = this.getAttribute('data-ms-cb');
        var n = host.querySelectorAll('[data-ms-cb="' + id + '"]:checked').length;
        var cnt = host.querySelector('[data-ms-cnt="' + id + '"]');
        if (cnt) { cnt.textContent = n; cnt.classList.toggle('zero', !n); }
      };
    });
  }
  function srReadMulti(host, id) {
    return [].slice.call(host.querySelectorAll('[data-ms-cb="' + id + '"]:checked')).map(function (c) { return c.value; });
  }

  function srLoad() {
    var mgmt = SR_MGMT.indexOf((STATE.user && STATE.user.role) || '') >= 0 || (STATE.user && STATE.user.super);
    if (mgmt) {
      api('staffReviewsPending', {}).then(function (d) {
        d = d || {};
        if ($('srWeek')) { $('srWeek').textContent = srS(d.week); }
        var list = d.pending || [];
        var host = $('srPending');
        if (!host) { return; }
        if (!list.length) {
          host.innerHTML = '<div class="hu-hint" style="margin-top:0">Everyone is reviewed for ' + esc(srS(d.week)) + ' ✓</div>';
        } else {
          host.innerHTML = list.map(function (p) {
            var e = srS(p.email);
            return '<div class="sr-row"><div class="sr-h"><b>' + esc(srS(p.name)) + '</b>' +
              '<span class="role">' + esc(srS(p.role)) + '</span>' +
              '<span class="sr-ctx">' + p.tasks_done_7d + ' tasks done · 7d' +
                (p.overdue_now ? ' · <span class="bad">' + p.overdue_now + ' overdue now</span>' : '') + '</span></div>' +
              '<div class="sr-dim"><div class="dl">Behaviour</div><div class="sr-f">' +
                '<div><label>Score</label>' + srRatingSel('b', e) + '</div>' +
                '<div><label>Flags &amp; note</label>' + srMulti('b', e, BEH_FLAGS) +
                  '<input class="sr-in" data-sr-bn="' + esc(e) + '" placeholder="behaviour note (optional)" maxlength="160" style="margin-top:7px"></div>' +
              '</div></div>' +
              '<div class="sr-dim"><div class="dl">Working</div><div class="sr-f">' +
                '<div><label>Score</label>' + srRatingSel('w', e) + '</div>' +
                '<div><label>Flags &amp; note</label>' + srMulti('w', e, WORK_FLAGS) +
                  '<input class="sr-in" data-sr-wn="' + esc(e) + '" placeholder="working note (optional)" maxlength="160" style="margin-top:7px"></div>' +
              '</div></div>' +
              '<div class="sr-save-row"><button class="btn-gold" data-sr-save="' + esc(e) + '">Save review</button></div></div>';
          }).join('');
          srWireMulti(host);
          host.querySelectorAll('[data-sr-save]').forEach(function (b) {
            b.onclick = function () {
              var e = this.getAttribute('data-sr-save');
              var esc2 = e.replace(/"/g, '');
              var q = function (a) { return host.querySelector('[' + a + '="' + esc2 + '"]'); };
              var bt = srReadMulti(host, 'ms-b-' + e), wt = srReadMulti(host, 'ms-w-' + e);
              var bn = (q('data-sr-bn') || {}).value || '', wn = (q('data-sr-wn') || {}).value || '';
              var notes = JSON.stringify({ v: 1, bt: bt, bn: bn.slice(0, 160), wt: wt, wn: wn.slice(0, 160) }).slice(0, 500);
              var btn = this; btn.disabled = true;
              api('staffReviewSave', { email: e, behavior: (q('data-sr-b') || {}).value, working: (q('data-sr-w') || {}).value, notes: notes })
                .then(function () { toast('Review saved for ' + esc2.split('@')[0] + '.'); srLoad(); })
                .catch(function (err) { btn.disabled = false; toast(err.message); });
            };
          });
        }
        srBuildArchivePicker(d.pending || [], mgmt);
      }).catch(function (e) {
        var box = $('srPending');
        if (box) { box.innerHTML = '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>'; }
      });
    } else {
      srHistLoad('');   // a staff member sees their own history only
    }
  }

  /* Management archive: pick anyone and read their whole review history. */
  function srBuildArchivePicker(pending, mgmt) {
    if (!mgmt) { return; }
    var host = $('srHist');
    if (!host) { return; }
    api('assignableStaff', {}).then(function (d) {
      var staff = (d && d.staff) || [];
      if (!staff.length) { staff = (pending || []).map(function (p) { return { email: p.email, name: p.name, role: p.role }; }); }
      var opts = staff.map(function (s) { return '<option value="' + esc(srS(s.email)) + '">' + esc(srS(s.name) || srS(s.email)) + (s.role ? ' · ' + esc(srS(s.role)) : '') + '</option>'; }).join('');
      host.innerHTML = '<div class="sr-arch-pick"><label style="font-size:11px;font-weight:800;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">Whose archive</label>' +
        '<select class="sr-sel" id="srArchWho" style="width:auto;min-width:220px">' + opts + '</select></div><div id="srHistBody"><div class="spinner"></div></div>';
      var sel = $('srArchWho');
      sel.onchange = function () { srHistLoad(this.value); };
      srHistLoad(sel.value || '');
    }).catch(function () { srHistLoad(''); });
  }

  function srHistLoad(email) {
    var target = $('srHistBody') || $('srHist');
    if (!target) { return; }
    target.innerHTML = '<div class="spinner"></div>';
    api('staffReviewHistory', email ? { email: email } : {}).then(function (d) {
      var rows = (d && d.reviews) || [];
      if (!rows.length) { target.innerHTML = '<div class="hu-hint" style="margin-top:0">No reviews recorded yet.</div>'; return; }
      target.innerHTML = rows.map(function (r) {
        var n = srParseNotes(r.notes);
        var chips = function (arr) { return (arr || []).length ? '<div class="sr-chips">' + arr.map(function (t) { return '<span class="sr-chip">' + esc(srS(t)) + '</span>'; }).join('') + '</div>' : ''; };
        var noteLine = function (label, val) { return srS(val) ? '<div class="hb" style="margin-top:4px"><b style="color:var(--text-2)">' + label + ':</b> ' + esc(srS(val)) + '</div>' : ''; };
        return '<div class="sr-hist"><div class="hw"><span style="min-width:80px">' + esc(srS(r.week)) + '</span>' +
          '<span>Behaviour ' + srStars(r.behavior) + '</span><span>Working ' + srStars(r.working) + '</span>' +
          (r.rated_by ? '<span class="hb" style="margin-left:auto">by ' + esc(srS(r.rated_by).split('@')[0]) + '</span>' : '') + '</div>' +
          (n.v ? (chips(n.bt) + noteLine('Behaviour', n.bn) + chips(n.wt) + noteLine('Working', n.wn))
               : (srS(n.bn) ? '<div class="hb" style="margin-top:5px">' + esc(srS(n.bn)) + '</div>' : '')) +
          '</div>';
      }).join('');
    }).catch(function (e) {
      target.innerHTML = '<div class="hu-hint" style="margin-top:0">' + esc(e.message) + '</div>';
    });
  }

})();
