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
      var heads = r.headers || [];
      var h = '<div class="scroll"><table class="ar-tbl"><thead><tr>' +
        heads.map(function (x) { return '<th>' + esc(String(x)) + '</th>'; }).join('') + '</tr></thead><tbody>';
      (r.rows || []).forEach(function (row) {
        h += '<tr>' + heads.map(function (x) { return '<td>' + esc(String(row[x] == null ? '' : row[x])) + '</td>'; }).join('') + '</tr>';
      });
      host.innerHTML = h + '</tbody></table></div>' +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">Newest first · read straight from "' + esc(String(r.tab || '')) + '" · resolving alarms stays on the Alerts centre.</p>';
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
            '<button class="minibtn" id="arGo">Open the report</button></div>' +
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
      var sel = $('arAcc');
      if (sel) { sel.onchange = arLoad; }
    }
  };
})();
