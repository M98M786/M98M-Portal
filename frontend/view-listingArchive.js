/* view-listingArchive.js — 30 Aug (owner): "history of listings they have done with a proper
 * separate page of their archive." Every completed listing job and revision of the signed-in
 * lister, newest first, searchable, grouped by month. Managers see their own archive the same
 * way (the dept boards remain the place to read other people's work). Data: myListingWork
 * include_completed — the same §8 payload the Assigned listings desk uses, nothing new to leak. */
(function () {
  'use strict';

  var LA = { rows: null, q: '' };

  VIEW_CSS.push(
    '.la-month{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-a);padding:14px 2px 6px}' +
    '.la-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}' +
    '.la-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.la-tbl td{padding:8px 11px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.la-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.la-kind{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:99px;background:var(--panel-2);border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}' +
    '.la-kind.rev{color:var(--blue-2);border-color:var(--blue)}'
  );

  function laStr(v) { return String(v == null ? '' : v).trim(); }

  function laFetch() {
    return api('myListingWork', { include_completed: 'true' }).then(function (d) {
      var all = [].concat((d && d.listings) || [], (d && d.revisions) || []);
      return all.filter(function (j) { return laStr(j.status) === 'Completed'; });
    });
  }

  function laPaint() {
    var box = $('laBody');
    if (!box) { return; }
    var rows = LA.rows || [];
    var q = laStr(LA.q).toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return (laStr(r.title) + ' ' + laStr(r.item_id) + ' ' + laStr(r.account) + ' ' + laStr(r.task_id)).toLowerCase().indexOf(q) >= 0;
      });
    }
    var cnt = $('laCount');
    if (cnt) { cnt.textContent = rows.length + (q ? ' of ' + (LA.rows || []).length : '') + ' completed'; }
    if (!rows.length) {
      box.innerHTML = '<div class="alx-empty">' + (q ? 'Nothing in your archive matches that.' :
        'Nothing completed yet — finished listings and revisions land here on their own.') + '</div>';
      return;
    }
    rows = rows.slice().sort(function (a, b) {
      return String(laStr(b.submitted_at) || laStr(b.created_at)) < String(laStr(a.submitted_at) || laStr(a.created_at)) ? -1 : 1;
    });
    var h = '', month = '';
    var open = false;
    rows.forEach(function (r) {
      var when = laStr(r.submitted_at) || laStr(r.created_at);
      var m = when.slice(0, 7);
      if (m !== month) {
        if (open) { h += '</tbody></table></div>'; }
        month = m;
        var t = Date.parse(m + '-01T00:00:00');
        var label = isFinite(t)
          ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date(t).getMonth()] + ' ' + m.slice(0, 4)
          : (m || 'Undated');
        h += '<div class="la-month">' + esc(label) + '</div>' +
          '<div class="scroll"><table class="la-tbl"><thead><tr>' +
          '<th>Done</th><th>Type</th><th>Product</th><th>Account</th><th>Item ID</th></tr></thead><tbody>';
        open = true;
      }
      var isRev = laStr(r.type) === 'listing_revision';
      var id = laStr(r.item_id);
      h += '<tr>' +
        '<td style="white-space:nowrap;font-weight:700;font-size:11.5px">' + esc(fmtPkt(when, true) || when || '—') + '</td>' +
        '<td><span class="la-kind' + (isRev ? ' rev' : '') + '">' + (isRev ? 'Revision' : 'New listing') + '</span></td>' +
        '<td style="max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(laStr(r.title)) + '">' + esc(laStr(r.title) || laStr(r.task_id)) + '</td>' +
        '<td>' + esc(laStr(r.account) || '—') + '</td>' +
        '<td>' + (id ? '<a href="https://www.ebay.co.uk/itm/' + esc(id) + '" target="_blank" rel="noopener noreferrer" class="mono" style="font-size:11.5px">' + esc(id) + '</a>' : '<span style="color:var(--text-3)">—</span>') + '</td>' +
        '</tr>';
    });
    if (open) { h += '</tbody></table></div>'; }
    box.innerHTML = h;
  }

  VIEWS.listingArchive = {
    label: 'My archive',
    icon: '<path d="M4 8h16M4 8l1.5-4h13L20 8M4 8v12h16V8"/><path d="M9 12h6"/>',
    roles: ['Item Lister', 'Listing Manager', 'Management'],
    order: 17.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>My <span class="goldtext">archive</span></h1>' +
          '<span class="sub">every listing and revision you have completed — the record stays yours</span>' +
          '<span class="alx-count" id="laCount" style="margin-left:auto"></span>' +
          '<button class="minibtn" id="laRefresh">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<input class="alx-sel alx-q" id="laQ" type="search" autocomplete="off" placeholder="Search title, item number or account…" style="margin-bottom:12px;width:min(380px,100%)">' +
          '<div id="laBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      var rf = $('laRefresh');
      if (rf) { rf.onclick = function () { LA.rows = null; laLoad(); }; }
      var qb = $('laQ');
      if (qb) {
        qb.value = LA.q;
        qb.oninput = function () { LA.q = this.value; laPaint(); };
      }
      laLoad();
    }
  };

  function laLoad() {
    var box = $('laBody');
    if (!box) { return; }
    if (LA.rows) { laPaint(); return; }
    box.innerHTML = '<div class="spinner"></div>';
    laFetch().then(function (rows) {
      LA.rows = rows;
      laPaint();
    }).catch(function (e) {
      box.innerHTML = '<div class="alx-empty">Could not load your archive.<span>' + esc(e.message) + '</span></div>';
    });
  }
})();
