/* view-accountReport.js — the Daily Account Report workbook as its own READING desk
 * (Hasib's walkthrough ask: "where is account daily report?"). The Alerts centre keeps the
 * alarm workflow; this screen shows the report rows themselves, headers verbatim, newest
 * first. Feed: v19's accountReportRows (bridge read, §4.3 dashboard roles). */
(function () {

  VIEW_CSS.push(
    '.ar-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:860px}' +
    '.ar-tbl th{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);text-align:left;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ar-tbl td{padding:8px 10px;border-bottom:1px solid var(--gold-line);vertical-align:top;max-width:340px;word-break:break-word}' +
    '.ar-tbl tbody tr:hover{background:var(--blue-soft)}'
  );

  /* The workbook reads metrics-down-the-side; a row-per-entry table is the same data turned
     ninety degrees, and to anyone who lives in that sheet it looks 'transposed'. Both
     orientations are kept and one Flip button swaps them — the reader chooses the one that
     matches the paper in their head. */
  var AR = { data: null, flipped: true };

  function arRender() {
    var host = $('arBody');
    var r = AR.data;
    if (!host || !r) { return; }
    var heads = r.headers || [];
    var rows = r.rows || [];
    var h;
    if (AR.flipped) {
      // metrics down the side (the workbook's own orientation), newest entries as columns
      var take = rows.slice(0, 10);
      h = '<div class="scroll"><table class="ar-tbl"><thead><tr><th></th>' +
        take.map(function (row, i) { return '<th>' + esc(String(row[heads[0]] == null ? 'entry ' + (i + 1) : row[heads[0]])) + '</th>'; }).join('') +
        '</tr></thead><tbody>';
      heads.slice(1).forEach(function (x) {
        h += '<tr><td style="font-weight:800;white-space:nowrap">' + esc(String(x)) + '</td>' +
          take.map(function (row) { return '<td>' + esc(String(row[x] == null ? '' : row[x])) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody></table></div>';
      if (rows.length > 10) { h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:4px">Showing the newest 10 of ' + rows.length + ' — flip to the list to see them all.</p>'; }
    } else {
      h = '<div class="scroll"><table class="ar-tbl"><thead><tr>' +
        heads.map(function (x) { return '<th>' + esc(String(x)) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (row) {
        h += '<tr>' + heads.map(function (x) { return '<td>' + esc(String(row[x] == null ? '' : row[x])) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody></table></div>';
    }
    host.innerHTML = h +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">Newest first · read straight from "' + esc(String(r.tab || '')) + '" · resolving alarms stays on the Alerts centre.</p>';
    var flipBtn = $('arFlip');
    if (flipBtn) { flipBtn.style.display = ''; flipBtn.textContent = AR.flipped ? 'Show as a list' : 'Show like the workbook'; }
  }

  function arLoad() {
    var acc = $('arAcc') ? $('arAcc').value : '';
    var host = $('arBody');
    if (!host) { return; }
    if (!acc) { host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Choose an account to open its report.</div>'; return; }
    host.innerHTML = '<div class="spinner"></div>';
    api('accountReportRows', { account: acc }).then(function (r) {
      if (!r || r.ok === false) {
        host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' + esc(String((r && r.reason) || 'Could not read it.')) +
          '<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">"not connected yet" means this account\'s Daily Account Report workbook is missing from CONNECTIONS.</span></div>';
        return;
      }
      AR.data = r;
      arRender();
    }).catch(function (e) {
      host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' + esc(e.message) + '</div>';
    });
  }

  VIEWS.accountReport = {
    label: 'Account report',
    order: 9.5,
    roles: ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'],
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><circle cx="17" cy="16" r="0.5"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">report</span></h1>' +
          '<span class="sub">each account\'s Daily Account Report workbook, as written · alarms resolve on the Alerts centre</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
            '<select class="alx-sel" id="arAcc"><option value="">Choose an account…</option></select>' +
            '<button class="minibtn" id="arGo">Open the report</button>' +
            '<button class="minibtn" id="arFlip" style="display:none">Show as a list</button></div>' +
          '<div id="arBody"><div style="color:var(--text-2);font-weight:700;padding:12px 0">Choose an account to open its report.</div></div>' +
        '</div></div>';
    },
    init: function () {
      cachedCall('accountList', {}, function (d) {
        var sel = $('arAcc');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">Choose an account…</option>' + (((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
      });
      var go = $('arGo');
      if (go) { go.onclick = arLoad; }
      var fl = $('arFlip');
      if (fl) { fl.onclick = function () { AR.flipped = !AR.flipped; arRender(); }; }
      var sel = $('arAcc');
      if (sel) { sel.onchange = arLoad; }
    }
  };
})();
