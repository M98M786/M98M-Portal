/* view-staffOversight.js — the Sales Operations dossier (26 Aug). One staff member, everything
 * about them on one screen: live workflow, every letter that reached them, their behaviour/working
 * reviews (the mindset), and the hard facts. Read-only. Backend: staffDossier (R8). The oversight
 * tier only — Sales Operations plus Management / Ops Head / Team Lead. */
(function () {
  'use strict';

  var SO_ROLES = ['Sales Operations', 'Management', 'Ops Head', 'Team Lead'];

  VIEW_CSS.push(
    '.so-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin:14px 0}' +
    '.so-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.so-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.so-t b{display:block;font-size:23px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.so-t.bad b{color:var(--bad)}.so-t.warn b{color:var(--warn)}.so-t.ok b{color:var(--ok)}.so-t.gold b{color:var(--gold-a)}' +
    '.so-row{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px}' +
    '.so-row .t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}' +
    '.so-row .m{color:var(--text-3);font-size:11px;font-weight:700;white-space:nowrap}' +
    '.so-row .pill{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:8px;background:var(--panel);border:1px solid var(--gold-line)}' +
    '.so-row.over .t{color:var(--bad)}' +
    '.so-stars{letter-spacing:1px;font-weight:800}' +
    '.so-sec{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin:16px 0 4px}'
  );

  function soS(v) { return String(v == null ? '' : v); }
  function soStars(n) { n = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }

  var SO = { who: '' };

  VIEWS.staffOversight = {
    label: 'Staff oversight',
    icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/><path d="M12 12v0"/>',
    roles: SO_ROLES,
    order: 61.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Staff <span class="goldtext">oversight</span></h1>' +
          '<span class="sub">one person, everything — their workflow, their alerts, their reviews, in one place</span>' +
          '<button class="minibtn" id="soRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d1"><div class="bd" id="soPick"><div class="spinner"></div></div></div>' +
        '<div id="soBody" class="enter d2"></div>';
    },
    init: function () {
      $('soRefresh').onclick = function () { soLoad(SO.who); };
      soLoadRoster();
    }
  };

  function soLoadRoster() {
    api('staffDossier', {}).then(function (d) {
      var roster = (d && d.roster) || [];
      if (!soSetIfHost('soPick')) { return; }
      if (!roster.length) { setHTML('soPick', '<div class="hu-hint" style="margin-top:0">No approved staff to show.</div>'); return; }
      if (!SO.who) { SO.who = roster[0].email; }
      setHTML('soPick', '<label style="font-weight:800;font-size:12px">Who<select id="soWho" style="margin-left:10px;min-width:260px;padding:8px 10px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:700">' +
        roster.map(function (r) {
          return '<option value="' + esc(r.email) + '"' + (r.email === SO.who ? ' selected' : '') + '>' +
            esc(r.name) + ' — ' + esc(r.role) + '</option>';
        }).join('') + '</select></label>');
      var sel = $('soWho');
      if (sel) { sel.onchange = function () { SO.who = this.value; soLoad(SO.who); }; }
      soLoad(SO.who);
    }).catch(function (e) {
      if (soSetIfHost('soPick')) { setHTML('soPick', '<div class="hu-hint">Could not load the roster: ' + esc(e.message) + '</div>'); }
    });
  }

  function soSetIfHost(id) { return !!document.getElementById(id); }

  function soLoad(email) {
    if (!email) { return; }
    setHTML('soBody', '<div class="card"><div class="bd"><div class="spinner"></div></div></div>');
    api('staffDossier', { email: email }).then(function (d) {
      if (!soSetIfHost('soBody')) { return; }
      d = d || {};
      var p = d.profile || {}, w = d.workflow || {}, al = d.alerts || {}, rv = d.reviews || {};
      var last = rv.last;

      var tiles = '<div class="so-tiles">' +
        '<div class="so-t gold"><span class="k">Open workflow</span><b>' + ((w.open || []).length) + '</b></div>' +
        '<div class="so-t ' + (w.overdue_now ? 'bad' : 'ok') + '"><span class="k">Overdue now</span><b>' + (w.overdue_now || 0) + '</b></div>' +
        '<div class="so-t"><span class="k">Done · 7 days</span><b>' + (w.done_7d || 0) + '</b></div>' +
        '<div class="so-t ' + (al.unread ? 'warn' : '') + '"><span class="k">Unread alerts</span><b>' + (al.unread || 0) + '</b><span class="k" style="font-weight:700;text-transform:none">of ' + (al.total || 0) + '</span></div>' +
        '<div class="so-t"><span class="k">Avg turnaround</span><b>' + soMins(w.avg_turnaround_min) + '</b></div>' +
      '</div>';

      var mind = last
        ? '<div class="so-sec">Mindset — latest review (' + esc(soS(last.week)) + ')</div>' +
          '<div class="so-row"><span class="t">Behaviour <span class="so-stars" style="color:var(--gold-a)">' + soStars(last.behavior) + '</span> &nbsp; Working <span class="so-stars" style="color:var(--ok)">' + soStars(last.working) + '</span></span>' +
            '<span class="m">' + esc(soS(last.rated_by).split('@')[0]) + '</span></div>' +
          (last.notes ? '<div style="font-size:12px;color:var(--text-2);font-weight:600;padding:6px 0 2px;white-space:pre-wrap">' + esc(soS(last.notes)) + '</div>' : '')
        : '<div class="so-sec">Mindset</div><div class="hu-hint" style="margin-top:0">No review on record yet — rate them on Staff reviews.</div>';

      var open = (w.open || []).length
        ? '<div class="so-sec">Live workflow — open tasks, soonest deadline first</div>' +
          (w.open).map(function (t) {
            return '<div class="so-row' + (t.overdue ? ' over' : '') + '"><span class="pill">' + esc(soS(t.dept)) + '</span>' +
              '<span class="t">' + esc(soS(t.title)) + '</span>' +
              '<span class="m">' + esc(soS(t.status)) + ' · ' + esc(fmtPkt(t.deadline_pkt, true) || 'no deadline') + '</span></div>';
          }).join('')
        : '<div class="so-sec">Live workflow</div><div class="hu-hint" style="margin-top:0">Nothing open — clear.</div>';

      var alerts = (al.items || []).length
        ? '<div class="so-sec">Every alert that reached them · newest first</div>' +
          (al.items).map(function (a) {
            return '<div class="so-row"><span class="pill">' + esc(soS(a.type) || 'letter') + '</span>' +
              '<span class="t" style="font-weight:600' + (a.read ? '' : ';color:var(--text)') + '">' + esc(soS(a.message)) + '</span>' +
              '<span class="m">' + esc(fmtPkt(a.created_at, true) || '') + (a.read ? '' : ' · <b style="color:var(--warn)">unread</b>') + '</span></div>';
          }).join('')
        : '<div class="so-sec">Alerts</div><div class="hu-hint" style="margin-top:0">No letters on record.</div>';

      var done = (w.recent_done || []).length
        ? '<div class="so-sec">Recently finished</div>' +
          (w.recent_done).map(function (t) {
            return '<div class="so-row"><span class="pill">' + esc(soS(t.dept)) + '</span>' +
              '<span class="t" style="font-weight:600">' + esc(soS(t.title)) + '</span>' +
              '<span class="m">' + esc(fmtPkt(t.decided_at, true) || '') + '</span></div>';
          }).join('')
        : '';

      var hist = (rv.history || []).length > 1
        ? '<div class="so-sec">Review history</div>' +
          (rv.history).map(function (r) {
            return '<div class="so-row"><b style="min-width:74px">' + esc(soS(r.week)) + '</b>' +
              '<span class="t" style="font-weight:600">B <span class="so-stars">' + soStars(r.behavior) + '</span> · W <span class="so-stars">' + soStars(r.working) + '</span>' +
              (r.notes ? ' — ' + esc(soS(r.notes)) : '') + '</span>' +
              '<span class="m">' + esc(soS(r.rated_by).split('@')[0]) + '</span></div>';
          }).join('')
        : '';

      setHTML('soBody',
        '<div class="card enter d1"><div class="hd">' + esc(soS(p.name)) + ' · ' + esc(soS(p.role)) +
          '<span class="hint">' + esc(soS(p.shift) || 'no shift') + (p.joined_at ? ' · since ' + esc(fmtPkt(p.joined_at, false) || '') : '') + '</span></div>' +
          '<div class="bd">' + tiles + mind + '</div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="bd">' + open + done + '</div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="bd">' + alerts + '</div></div>' +
        (hist ? '<div class="card enter d3" style="margin-top:14px"><div class="bd">' + hist + '</div></div>' : ''));
    }).catch(function (e) {
      if (soSetIfHost('soBody')) { setHTML('soBody', '<div class="card"><div class="bd"><div class="hu-hint">Could not load: ' + esc(e.message) + '</div></div></div>'); }
    });
  }

  function soMins(m) {
    m = Number(m) || 0;
    if (!m) { return '—'; }
    if (m < 60) { return m + 'm'; }
    var h = Math.floor(m / 60), r = m % 60;
    return h + 'h' + (r ? ' ' + r + 'm' : '');
  }

})();
