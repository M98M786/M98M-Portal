/* view-csDesk.js — V2 Phase D1: the CS LIVE desk, straight from eBay (Post-Order + Trading +
 * Analytics via the Engine). The sheet-driven CS screen keeps the human workflow; this one
 * answers "what does eBay say RIGHT NOW": every open case / return / item-not-received with
 * its respond-by clock, unanswered buyer messages, eBay's own seller-standards verdict, and
 * any listing violations verbatim. CS + Management/Ops, enforced server-side. */
(function () {

  VIEW_CSS.push(
    '.cd-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}' +
    '.cd-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.cd-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top}' +
    '.cd-kind{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 8px;border-radius:99px;white-space:nowrap}' +
    '.cd-kind.CASE{background:var(--bad-soft);color:var(--bad)}' +
    '.cd-kind.RETURN{background:var(--warn-soft);color:var(--warn)}' +
    '.cd-kind.INR{background:var(--blue-soft);color:var(--blue-2)}' +
    '.cd-due{font-weight:800;white-space:nowrap}' +
    '.cd-due.today{color:var(--bad)}' +
    '.cd-due.soon{color:var(--warn)}' +
    '.cd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:14px 0}' +
    '.cd-mini{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:10px 14px}' +
    '.cd-mini .t{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:6px}' +
    '.cd-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px}' +
    '.cd-row:last-child{border-bottom:0}' +
    '.cd-std{font-weight:800}' +
    '.cd-std.top{color:var(--ok)}.cd-std.above{color:var(--blue-2)}.cd-std.below{color:var(--bad)}' +
    '.cd-violbox{border:1px solid var(--bad);border-radius:12px;background:var(--bad-soft);padding:10px 14px;margin-bottom:14px;font-size:12.5px}'
  );

  function cdStr(v) { return String(v == null ? '' : v).trim(); }

  function cdDue(payload) {
    try {
      var p = JSON.parse(payload || '{}');
      return cdStr((p.respondByDate || {}).value || '').slice(0, 10);
    } catch (e) { return ''; }
  }
  function cdDueCls(d) {
    if (!d) { return ''; }
    var today = new Date().toISOString().slice(0, 10);
    var soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    return d <= today ? 'today' : d <= soon ? 'soon' : '';
  }

  function cdFetch() {
    return api('csDesk', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('csDesk', {}, d); }
      return d;
    });
  }

  function cdPaint(d) {
    var box = $('cdBody');
    if (!box) { return; }
    var h = '';

    var viols = (d && d.violations) || [];
    if (viols.length) {
      h += '<div class="cd-violbox"><b style="color:var(--bad)">🔴 ' + viols.length + ' listing violation(s) — eBay\'s own words:</b>';
      viols.slice(0, 6).forEach(function (v) {
        h += '<div style="margin-top:5px">' + esc(cdStr(v.account)) + ' · <span class="mono">' + esc(cdStr(v.item_id)) + '</span> · ' + esc(cdStr(v.type)) +
          ' — “' + esc(cdStr(v.text).slice(0, 180)) + '”</div>';
      });
      h += '</div>';
    }

    var open = (d && d.open) || [];
    open.sort(function (a, b) {
      var da = cdDue(a.payload_json) || '9999', db = cdDue(b.payload_json) || '9999';
      return da < db ? -1 : da > db ? 1 : 0;
    });
    h += '<h3 style="margin:0 0 6px;font-size:13px">Open on eBay right now — ' + open.length + ' · sorted by respond-by</h3>' +
      '<div class="scroll"><table class="cd-tbl"><thead><tr><th>Kind</th><th>Account</th><th>Item / buyer</th><th>What eBay records</th><th>Status</th><th>Respond by</th></tr></thead><tbody>';
    if (!open.length) { h += '<tr><td colspan="6" style="color:var(--ok);font-weight:800">✓ Nothing open — every case, return and inquiry is closed.</td></tr>'; }
    open.forEach(function (r) {
      var due = cdDue(r.payload_json);
      h += '<tr><td><span class="cd-kind ' + esc(cdStr(r.kind)) + '">' + esc(cdStr(r.kind)) + '</span></td>' +
        '<td>' + esc(cdStr(r.account)) + '</td>' +
        '<td><span class="mono">' + esc(cdStr(r.item_id)) + '</span><div style="font-size:11px;color:var(--text-3)">' + esc(cdStr(r.buyer)) + '</div></td>' +
        '<td style="max-width:360px">' + esc(cdStr(r.reason)) + '</td>' +
        '<td>' + esc(cdStr(r.status)) + '</td>' +
        '<td class="cd-due ' + cdDueCls(due) + '">' + (due ? esc(due) : '—') + '</td></tr>';
    });
    h += '</tbody></table></div>';

    var msgs = (d && d.messages) || [];
    h += '<h3 style="margin:16px 0 6px;font-size:13px">Buyer messages waiting for an answer — ' + msgs.length + '</h3>';
    if (msgs.length) {
      h += '<div class="scroll"><table class="cd-tbl"><thead><tr><th>Account</th><th>Buyer</th><th>Subject</th><th>Received</th></tr></thead><tbody>';
      msgs.slice(0, 50).forEach(function (m) {
        h += '<tr><td>' + esc(cdStr(m.account)) + '</td><td>' + esc(cdStr(m.buyer)) + '</td>' +
          '<td style="max-width:420px">' + esc(cdStr(m.text)) + '</td>' +
          '<td style="white-space:nowrap">' + esc(cdStr(m.received_at).slice(0, 10)) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    } else {
      h += '<p style="color:var(--ok);font-weight:800;font-size:12.5px">✓ Inbox answered.</p>';
    }

    var stds = (d && d.standards) || [];
    h += '<div class="cd-grid">';
    stds.forEach(function (s) {
      var lvl = '', defect = '', prog = [];
      try { prog = JSON.parse(s.json || '[]'); } catch (e) { prog = []; }
      var p0 = prog[0] || {};
      lvl = cdStr(p0.standardsLevel);
      (p0.metrics || []).forEach(function (m) {
        if (cdStr(m.metricKey) === 'DEFECTIVE_TRANSACTION_RATE' && m.value) { defect = cdStr(m.value.value) + '%'; }
      });
      var cls = /TOP/i.test(lvl) ? 'top' : /ABOVE/i.test(lvl) ? 'above' : 'below';
      h += '<div class="cd-mini"><div class="t">' + esc(cdStr(s.account)) + '</div>' +
        '<div class="cd-row"><span>eBay verdict</span><span class="cd-std ' + cls + '">' + esc(lvl || '—') + '</span></div>' +
        (defect ? '<div class="cd-row"><span>Defect rate</span><span class="cd-std">' + esc(defect) + '</span></div>' : '') +
        '<div class="cd-row"><span>Checked</span><span style="color:var(--text-3)">' + esc(cdStr(s.synced_at).slice(0, 16)) + '</span></div></div>';
    });
    h += '</div>';

    box.innerHTML = h;
  }

  function cdLoad() {
    var box = $('cdBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('csDesk', {}) : null;
    if (had) { try { cdPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    cdFetch().then(cdPaint).catch(function (e) {
      if (had) { toast('Showing the last picture — could not refresh just now.'); return; }
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">Could not load the live desk.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.csDesk = {
    label: 'CS live desk',
    order: 12,
    roles: ['Management', 'Ops Head', 'CS'],
    icon: '<path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3l-9 9"/><path d="M15 3h6v6"/>',
    prefetch: function () { return cdFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>CS <span class="goldtext">live desk</span></h1>' +
          '<span class="sub">Straight from eBay every hour · violations checked every 5 minutes · respond-by clocks first</span>' +
          '<button class="minibtn" id="cdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd"><div id="cdBody"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
      var rf = $('cdRefresh');
      if (rf) { rf.onclick = cdLoad; }
      cdLoad();
    }
  };
})();
