/* view-staffReports.js — owner (6 Sept): "a separate page of staff report submission, 2-hour to
 * 2-hour of each staff, yesterday, with custom date; also show them their archive." Reads the
 * 2-hourly reports (reports_2h) straight from the engine (D1) — always current, never the sheet.
 * Management · Ops Head · Team Lead. Per person: every checkpoint of the day with the actual work
 * summary, counts and on-time flag; click a person for their full submitting archive. */
(function () {
  'use strict';

  var SR_ROLES = ['Management', 'Ops Head', 'Team Lead'];
  var SR = { date: '', data: null, arch: null, archName: '', busy: false };

  VIEW_CSS.push(
    '.sr-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}' +
    '.sr-sum{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:16px}' +
    '.sr-scard{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px}' +
    '.sr-scard .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.sr-scard .v{font-size:24px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.sr-person{border:1px solid var(--gold-line);border-radius:14px;background:var(--panel);margin-bottom:14px;overflow:hidden}' +
    '.sr-phd{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--gold-line);flex-wrap:wrap}' +
    '.sr-name{font-weight:800;font-size:15px}' +
    '.sr-role{font-size:11px;font-weight:700;color:var(--text-3);border:1px solid var(--gold-line);border-radius:99px;padding:2px 9px}' +
    '.sr-prog{margin-left:auto;display:flex;align-items:center;gap:10px}' +
    '.sr-barwrap{width:130px;height:7px;border-radius:99px;background:rgba(120,132,152,.22);overflow:hidden}' +
    '.sr-barfill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--ok),#3fcf8e)}' +
    '.sr-count{font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.sr-arch-btn{border:1px solid var(--gold-line-hi);background:none;color:var(--text-2);border-radius:8px;padding:5px 11px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}' +
    '.sr-arch-btn:hover{color:var(--gold-a);border-color:var(--gold-a)}' +
    '.sr-cps{padding:6px 16px 14px}' +
    '.sr-cp{display:grid;grid-template-columns:92px 96px 1fr;gap:14px;align-items:start;padding:11px 0;border-bottom:1px solid rgba(120,132,152,.12)}' +
    '.sr-cp:last-child{border-bottom:0}' +
    '.sr-cp .t{font-weight:800;font-size:12.5px;font-variant-numeric:tabular-nums}' +
    '.sr-cp .t .fin{display:block;font-size:9.5px;font-weight:800;color:var(--gold-a);letter-spacing:.04em}' +
    '.sr-pill{font-size:10px;font-weight:800;letter-spacing:.03em;border-radius:99px;padding:3px 9px;white-space:nowrap;display:inline-block}' +
    '.sr-ok{background:var(--ok-soft);color:var(--ok)}.sr-late{background:var(--warn-soft);color:var(--warn)}' +
    '.sr-miss{background:var(--bad-soft);color:var(--bad)}.sr-pend{background:rgba(120,132,152,.16);color:var(--text-3)}' +
    '.sr-sum-txt{font-size:12.5px;color:var(--text);font-weight:600;white-space:pre-wrap;line-height:1.5}' +
    '.sr-when{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:3px}' +
    '.sr-counts{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}' +
    '.sr-chip{display:inline-flex;align-items:baseline;gap:6px;border:1px solid var(--gold-line);border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--text-2)}' +
    '.sr-chip b{color:var(--gold-a);font-weight:800}' +
    '.sr-empty{color:var(--text-3);font-weight:600;font-size:13px;padding:16px}' +
    '.sr-arch{border:1px solid rgba(150,110,230,.4);background:rgba(150,110,230,.08);border-radius:14px;padding:14px 16px;margin-bottom:16px}' +
    '.sr-arch .ah{display:flex;align-items:center;gap:10px;margin-bottom:10px}' +
    '.sr-aday{border-top:1px solid rgba(120,132,152,.16);padding:10px 0}' +
    '.sr-aday .d{font-weight:800;font-size:12.5px;margin-bottom:6px}'
  );

  function srS(v) { return String(v == null ? '' : v).trim(); }
  function srHm12(cp) {
    var m = srS(cp).match(/^(\d{1,2}):(\d{2})/); if (!m) { return srS(cp); }
    var h = Number(m[1]) % 12; if (h === 0) { h = 12; }
    return h + ':' + m[2] + ' ' + (Number(m[1]) < 12 ? 'AM' : 'PM');
  }
  function srTodayPkt() { return pkDayStr(0); }

  function srStatePill(row, dateStr) {
    if (row.submitted) {
      if (srS(row.flag) === 'late') { return '<span class="sr-pill sr-late">● Late</span>'; }
      return '<span class="sr-pill sr-ok">● On time</span>';
    }
    if (dateStr < srTodayPkt()) { return '<span class="sr-pill sr-miss">✕ Missed</span>'; }
    return '<span class="sr-pill sr-pend">Not yet</span>';
  }

  function srCountsHtml(counts) {
    var real = (counts || []).filter(function (c) { return srS(c.value) !== ''; });
    if (!real.length) { return ''; }
    return '<div class="sr-counts">' + real.map(function (c) {
      return '<span class="sr-chip">' + esc(srS(c.label)) + ' <b>' + esc(srS(c.value)) + '</b></span>';
    }).join('') + '</div>';
  }

  function srLoad() {
    var box = $('srBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('staffReportsDay', { date: SR.date }).then(function (d) {
      SR.data = d || {};
      if (d && d.date) { SR.date = d.date; var di = $('srDate'); if (di) { di.value = d.date; } }
      srPaint();
    }).catch(function (e) {
      box.innerHTML = '<div class="sr-empty">Could not load the day — ' + esc((e && e.message) || 'try again') + '</div>';
    });
  }

  function srPaint() {
    var box = $('srBody');
    var d = SR.data;
    if (!box || !d) { return; }
    var people = d.people || [];
    var full = people.filter(function (p) { return p.done >= p.total && p.total; }).length;
    var partial = people.filter(function (p) { return p.done > 0 && p.done < p.total; }).length;
    var none = people.filter(function (p) { return !p.done; }).length;

    var h = '<div class="sr-sum">' +
      '<div class="sr-scard"><div class="k">Staff scheduled</div><div class="v">' + people.length + '</div></div>' +
      '<div class="sr-scard"><div class="k">All in</div><div class="v" style="color:var(--ok)">' + full + '</div></div>' +
      '<div class="sr-scard"><div class="k">Part done</div><div class="v" style="color:var(--warn)">' + partial + '</div></div>' +
      '<div class="sr-scard"><div class="k">Nothing yet</div><div class="v" style="color:' + (none ? 'var(--bad)' : 'var(--text-3)') + '">' + none + '</div></div>' +
      '</div>';

    if (SR.arch) { h += srArchiveHtml(); }

    if (!people.length) {
      h += '<div class="sr-empty">Nobody has a checkpoint timetable for ' + esc(srDayLabel(d.date)) + '. Management sets timetables on Staff admin.</div>';
      box.innerHTML = h; srWire(); return;
    }

    people.forEach(function (p) {
      var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
      h += '<div class="sr-person"><div class="sr-phd">' +
        '<span class="sr-name">' + esc(srS(p.name)) + '</span>' +
        '<span class="sr-role">' + esc(srS(p.role)) + '</span>' +
        (p.working === false ? '<span class="sr-pill sr-pend">off today</span>' : '') +
        '<div class="sr-prog"><div class="sr-barwrap"><div class="sr-barfill" style="width:' + pct + '%"></div></div>' +
        '<span class="sr-count" style="color:' + (p.done >= p.total ? 'var(--ok)' : (p.done ? 'var(--warn)' : 'var(--text-3)')) + '">' + p.done + ' / ' + p.total + '</span>' +
        '<button class="sr-arch-btn" data-arch="' + esc(p.email) + '" data-name="' + esc(srS(p.name)) + '">Archive ↗</button></div>' +
        '</div><div class="sr-cps">';
      (p.rows || []).forEach(function (r) {
        h += '<div class="sr-cp"><div class="t">' + esc(srHm12(r.checkpoint)) + (r.is_final ? '<span class="fin">DPR</span>' : '') + '</div>' +
          '<div>' + srStatePill(r, d.date) + (r.submitted && r.submitted_at ? '<div class="sr-when">' + esc(fmtPkt(r.submitted_at) || '') + '</div>' : '') + '</div>' +
          '<div>' + (r.submitted
            ? '<div class="sr-sum-txt">' + esc(srS(r.work_summary) || '—') + '</div>' + srCountsHtml(r.counts)
            : '<span class="sr-empty" style="padding:0">No report for this slot.</span>') + '</div></div>';
      });
      h += '</div></div>';
    });
    box.innerHTML = h;
    srWire();
  }

  function srArchiveHtml() {
    var a = SR.arch;
    var h = '<div class="sr-arch"><div class="ah"><b style="font-size:14px">🟣 ' + esc(srS(a.name) || srS(a.email)) + '</b>' +
      '<span class="sr-role">' + esc(srS(a.role)) + '</span>' +
      '<button class="sr-arch-btn" id="srArchClose" style="margin-left:auto">Close archive ✕</button></div>';
    if (!(a.days || []).length) {
      h += '<div class="sr-empty" style="padding:6px 0">No submitted reports on record yet.</div></div>';
      return h;
    }
    a.days.slice(0, 40).forEach(function (day) {
      h += '<div class="sr-aday"><div class="d">' + esc(srDayLabel(day.date)) + ' <span style="color:var(--text-3);font-weight:600">· ' + (day.reports || []).length + ' report(s)</span></div>';
      (day.reports || []).forEach(function (r) {
        var pill = srS(r.flag) === 'late' ? '<span class="sr-pill sr-late">Late</span>' : '<span class="sr-pill sr-ok">On time</span>';
        h += '<div class="sr-cp" style="grid-template-columns:92px 80px 1fr"><div class="t">' + esc(srHm12(r.checkpoint)) + '</div>' +
          '<div>' + pill + '</div>' +
          '<div><div class="sr-sum-txt">' + esc(srS(r.work_summary) || '—') + '</div>' + srCountsHtml(r.counts) + '</div></div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  function srWire() {
    document.querySelectorAll('[data-arch]').forEach(function (b) {
      b.onclick = function () {
        var email = this.getAttribute('data-arch'), name = this.getAttribute('data-name');
        SR.arch = { email: email, name: name, role: '', days: [], loading: true };
        srPaint();
        api('staffReportsArchive', { email: email }).then(function (d) {
          SR.arch = d || { email: email, name: name, days: [] };
          if (name && !SR.arch.name) { SR.arch.name = name; }
          srPaint();
          var el = document.querySelector('.sr-arch'); if (el) { el.scrollIntoView({ block: 'center' }); }
        }).catch(function (e) { toast('Archive: ' + (e && e.message)); SR.arch = null; srPaint(); });
      };
    });
    var close = $('srArchClose');
    if (close) { close.onclick = function () { SR.arch = null; srPaint(); }; }
  }

  function srDayLabel(ds) {
    var p = srS(ds).split('-'); if (p.length !== 3) { return srS(ds); }
    var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    if (isNaN(dt.getTime())) { return srS(ds); }
    var lbl = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    if (ds === srTodayPkt()) { lbl += ' · today'; }
    else if (ds === pkDayStr(-1)) { lbl += ' · yesterday'; }
    return lbl;
  }

  VIEWS.staffReports = {
    label: 'Staff reports',
    icon: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
    roles: SR_ROLES,
    order: 35.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Staff <span class="goldtext">reports</span></h1>' +
        '<span class="sub">every person’s 2-hourly reports, checkpoint by checkpoint — pick a day, open anyone’s archive</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
        '<div class="sr-bar">' +
          '<div class="field" style="margin-top:0;min-width:168px"><label>Day</label><input type="date" id="srDate"></div>' +
          '<button class="minibtn" id="srYday" style="margin-bottom:1px">Yesterday</button>' +
          '<button class="minibtn" id="srToday" style="margin-bottom:1px">Today</button>' +
          '<button class="minibtn" id="srRefresh" style="margin-bottom:1px">Refresh</button>' +
        '</div>' +
        '<div id="srBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      SR.arch = null;
      SR.date = SR.date || pkDayStr(-1);   // default: yesterday (PKT)
      var di = $('srDate');
      if (di) { di.value = SR.date; if (typeof enhanceDate === 'function') { enhanceDate(di, { kind: 'day', tz: 'Pakistan' }); }
        di.onchange = function () { SR.date = this.value || pkDayStr(-1); SR.arch = null; srLoad(); }; }
      var yb = $('srYday'); if (yb) { yb.onclick = function () { SR.date = pkDayStr(-1); SR.arch = null; if (di) { di.value = SR.date; } srLoad(); }; }
      var tb = $('srToday'); if (tb) { tb.onclick = function () { SR.date = pkDayStr(0); SR.arch = null; if (di) { di.value = SR.date; } srLoad(); }; }
      var rf = $('srRefresh'); if (rf) { rf.onclick = srLoad; }
      srLoad();
    }
  };
})();
