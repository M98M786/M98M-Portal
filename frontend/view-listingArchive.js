/* view-listingArchive.js — 30 Aug (owner): "history of listings they have done with a proper
 * separate page of their archive." 11 Sept (owner): "start showing … all previous listings
 * archive to product listers as well" + "show whole archive of all product listers to every
 * product lister collectively" — the page is now the TEAM archive: every completed listing job
 * and revision by every lister, newest first, with who did it, served to every lister. Feed:
 * engine listingArchive (tasks mirror, §8.2-stripped); falls back to the old own-work
 * myListingWork feed if the engine is unreachable. A Mine chip narrows to your own rows. */
(function () {
  'use strict';

  var LA = { rows: null, q: '', who: 'all', mineOnly: false };

  VIEW_CSS.push(
    '.la-month{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-a);padding:14px 2px 6px}' +
    '.la-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:820px}' +
    '.la-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.la-tbl td{padding:8px 11px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.la-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.la-kind{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:99px;background:var(--panel-2);border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}' +
    '.la-kind.rev{color:var(--blue-2);border-color:var(--blue)}' +
    '.la-who{font-weight:700;white-space:nowrap}' +
    '.la-chip{font-size:11px;font-weight:800;padding:5px 13px;border-radius:99px;border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text-2);cursor:pointer}' +
    '.la-chip.on{background:var(--blue);border-color:var(--blue);color:#fff}' +
    /* 21 Nov (owner): the previous details, for every lister */
    '.la-more{font-size:11px;font-weight:800;padding:3px 9px;border-radius:8px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text-2);cursor:pointer;white-space:nowrap}' +
    '.la-more.on{border-color:var(--gold-a);color:var(--gold-a)}' +
    '.la-det td{padding:0 11px 12px!important;border-bottom:1px solid var(--gold-line)}' +
    '.la-box{display:grid;gap:10px 18px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));padding:12px 14px;border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2)}' +
    '.la-box .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:3px}' +
    '.la-box .v{font-size:12px;font-weight:700;word-break:break-word}' +
    '.la-lnk{display:inline-block;margin:2px 6px 2px 0;padding:3px 9px;border-radius:8px;border:1px solid var(--gold-line-hi);color:var(--blue-2);font-weight:800;font-size:11px;text-decoration:none}' +
    '.la-lnk span{color:var(--text-3);font-weight:700;margin-left:4px}' +
    '.la-img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--gold-line)}'
  );
  var LA_OPEN = {};   // task_id → details panel open

  function laStr(v) { return String(v == null ? '' : v).trim(); }
  function laMe() { return ((STATE.user && STATE.user.email) || '').toLowerCase(); }

  function laFetch() {
    return engineCall('listingArchiveEngine', {}, 30000).then(function (d) {
      LA.mineOnly = false;
      return (d && d.rows) || [];
    }).catch(function () {
      // engine unreachable → the old own-work feed keeps the page alive
      return api('myListingWork', { include_completed: 'true' }).then(function (d) {
        LA.mineOnly = true;
        var all = [].concat((d && d.listings) || [], (d && d.revisions) || []);
        return all.filter(function (j) { return laStr(j.status) === 'Completed'; });
      });
    });
  }

  function laPaint() {
    var box = $('laBody');
    if (!box) { return; }
    var chips = $('laChips');
    if (chips) { chips.style.display = LA.mineOnly ? 'none' : 'flex'; }
    var rows = LA.rows || [];
    if (!LA.mineOnly && LA.who === 'mine') {
      var me = laMe();
      rows = rows.filter(function (r) { return laStr(r.assigned_to).toLowerCase() === me; });
    }
    var q = laStr(LA.q).toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return (laStr(r.title) + ' ' + laStr(r.item_id) + ' ' + laStr(r.account) + ' ' + laStr(r.task_id) + ' ' + laStr(r.assigned_name)).toLowerCase().indexOf(q) >= 0;
      });
    }
    var cnt = $('laCount');
    if (cnt) { cnt.textContent = rows.length + ((q || LA.who === 'mine') ? ' of ' + (LA.rows || []).length : '') + ' completed'; }
    if (!rows.length) {
      box.innerHTML = '<div class="alx-empty">' + (q ? 'Nothing in the archive matches that.' :
        'Nothing completed yet — finished listings and revisions land here on their own.') + '</div>';
      return;
    }
    rows = rows.slice().sort(function (a, b) {
      return String(laStr(b.submitted_at) || laStr(b.created_at)) < String(laStr(a.submitted_at) || laStr(a.created_at)) ? -1 : 1;
    });
    var showWho = !LA.mineOnly;
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
          '<th>Done</th>' + (showWho ? '<th>Lister</th>' : '') + '<th>Type</th><th>Product</th><th>Account</th><th>Item ID</th><th></th></tr></thead><tbody>';
        open = true;
      }
      var isRev = laStr(r.type) === 'listing_revision';
      var id = laStr(r.item_id);
      h += '<tr>' +
        '<td style="white-space:nowrap;font-weight:700;font-size:11.5px">' + esc(fmtPkt(when, true) || when || '—') + '</td>' +
        (showWho ? '<td class="la-who">' + esc(laStr(r.assigned_name) || laStr(r.assigned_to) || '—') + '</td>' : '') +
        '<td><span class="la-kind' + (isRev ? ' rev' : '') + '">' + (isRev ? 'Revision' : 'New listing') + '</span></td>' +
        '<td style="max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(laStr(r.title)) + '">' + esc(laStr(r.title) || laStr(r.task_id)) + '</td>' +
        '<td>' + esc(laStr(r.account) || '—') + '</td>' +
        '<td>' + (id && !/^task:/.test(id) ? '<a href="https://www.ebay.co.uk/itm/' + esc(id) + '" target="_blank" rel="noopener noreferrer" class="mono" style="font-size:11.5px">' + esc(id) + '</a>' : '<span style="color:var(--text-3)">—</span>') + '</td>' +
        '<td><button class="la-more' + (LA_OPEN[laStr(r.task_id)] ? ' on' : '') + '" data-la-more="' + esc(laStr(r.task_id)) + '">' + (LA_OPEN[laStr(r.task_id)] ? 'Hide' : 'Details') + '</button></td>' +
        '</tr>' +
        (LA_OPEN[laStr(r.task_id)] ? '<tr class="la-det"><td colspan="' + (showWho ? 7 : 6) + '">' + laDetails(r) + '</td></tr>' : '');
    });
    if (open) { h += '</tbody></table></div>'; }
    box.innerHTML = h;
    [].slice.call(box.querySelectorAll('[data-la-more]')).forEach(function (b) {
      b.onclick = function () { var k = this.getAttribute('data-la-more'); LA_OPEN[k] = !LA_OPEN[k]; laPaint(); };
    });
  }

  /* 21 Nov (owner): "in the listers' archive the previous details must be there — the item's
     supplier, its link, the eBay link, the previous sourcing suppliers, all of it." Two sources,
     both already lister-safe: `sourcing` (live supplier names + links, no cost — the engine adds
     it) and `listing` (the hunt-form details the lister was given, §8.2-limited). Nothing here is
     an earning; the profit rule for listers is untouched. */
  function laLink(url, label, tag) {
    var u = typeof safeUrl === 'function' ? safeUrl(laStr(url)) : laStr(url);
    if (!u) { return ''; }
    return '<a class="la-lnk" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + (tag ? '<span>' + esc(tag) + '</span>' : '') + '</a>';
  }
  function laDetails(r) {
    var sc = r.sourcing || {}, L = r.listing || {};
    var g = function (k) { var keys = Object.keys(L); for (var i = 0; i < keys.length; i++) { if (keys[i].replace(/\s+/g, ' ').trim().toLowerCase().indexOf(k.toLowerCase()) === 0) { return laStr(L[keys[i]]); } } return ''; };
    var id = laStr(r.item_id);
    var cells = [];
    var supLine = laStr(sc.supplier) || (sc.sup_names && sc.sup_names[0]) || '';
    var links = (sc.links || []).map(function (l, i) { return laLink(l.url, 'Supplier ' + (i + 1) + (l.supplier ? ' · ' + l.supplier : ''), l.src); }).join('');
    if (!links) {   // nothing saved since — fall back to the links the hunt form carried
      links = [['Product Link 1', 'Supplier 1'], ['Product Link 2', 'Supplier 2'], ['Product Link 3', 'Supplier 3']].map(function (p) { return laLink(g(p[0]), p[1], 'hunt'); }).join('');
    }
    cells.push('<div><div class="k">Supplier being worked</div><div class="v">' + (supLine ? esc(supLine) : '<span style="color:var(--text-3)">not recorded</span>') +
      (sc.sup_names && sc.sup_names.length > 1 ? '<div style="font-size:11px;color:var(--text-3);font-weight:700;margin-top:2px">also on file: ' + esc(sc.sup_names.slice(1).join(' · ')) + '</div>' : '') + '</div></div>');
    cells.push('<div><div class="k">Sourcing links</div><div class="v">' + (links || '<span style="color:var(--text-3)">no link anywhere</span>') +
      laLink(sc.temu || g('Temu Link'), 'Temu') + '</div></div>');
    cells.push('<div><div class="k">eBay</div><div class="v">' + (id && !/^task:/.test(id) ? laLink('https://www.ebay.co.uk/itm/' + id, 'Open listing ' + id) : laLink(g('Ebay Link'), 'Ebay link from the hunt')) + '</div></div>');
    var people = [];
    if (sc.hunter) { people.push('Hunted by ' + esc(sc.hunter)); }
    if (laStr(r.assigned_name) || laStr(r.assigned_to)) { people.push('Listed by ' + esc(laStr(r.assigned_name) || laStr(r.assigned_to))); }
    if (people.length) { cells.push('<div><div class="k">People</div><div class="v">' + people.join('<br>') + '</div></div>'); }
    var facts = [['Category', g('Category')], ['Seasonal', g('Seasonal')], ['Selected date', g('Selected Date')], ['CPC selling chance', g('CPC Selling Chance')], ['Source price (hunt)', g('Source Price')], ['Calculator price (hunt)', g('E-Bey')]].filter(function (f) { return f[1]; });
    if (facts.length) { cells.push('<div><div class="k">From the hunt form</div><div class="v">' + facts.map(function (f) { return '<div><span style="color:var(--text-3)">' + esc(f[0]) + ':</span> ' + esc(f[1]) + '</div>'; }).join('') + '</div></div>'); }
    var research = [['Terapeak', g('Main Keyword Terapeak')], ['Terapeak overview', g('Terapeak overview')], ['Avg sold price', g('Image Link of avg sold')], ['Zik', g('Image Link of Zik')]].map(function (f) { return laLink(f[1], f[0]); }).join('');
    if (research) { cells.push('<div><div class="k">Research links</div><div class="v">' + research + '</div></div>'); }
    var img = (typeof safeUrl === 'function' ? safeUrl(g('Image Link') || g('IMAGE')) : '');
    if (img) { cells.push('<div><div class="k">Image</div><img class="la-img" src="' + esc(img) + '" alt=""></div>'); }
    if (g('Title') && laStr(g('Title')) !== laStr(r.title)) { cells.push('<div style="grid-column:1/-1"><div class="k">Title given to the lister</div><div class="v">' + esc(g('Title')) + '</div></div>'); }
    return '<div class="la-box">' + cells.join('') + '</div>';
  }

  VIEWS.listingArchive = {
    label: 'Listings archive',
    icon: '<path d="M4 8h16M4 8l1.5-4h13L20 8M4 8v12h16V8"/><path d="M9 12h6"/>',
    roles: ['Item Lister', 'Listing Manager', 'Team Lead', 'Ops Head', 'Management'],
    order: 17.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Listings <span class="goldtext">archive</span></h1>' +
          '<span class="sub">every listing and revision the team has completed — the whole record, for every lister</span>' +
          '<span class="alx-count" id="laCount" style="margin-left:auto"></span>' +
          '<button class="minibtn" id="laRefresh">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
            '<div id="laChips" style="display:flex;gap:6px">' +
              '<button class="la-chip" data-who="all">All listers</button>' +
              '<button class="la-chip" data-who="mine">Mine</button>' +
            '</div>' +
            '<input class="alx-sel alx-q" id="laQ" type="search" autocomplete="off" placeholder="Search lister, title, item number or account…" style="width:min(380px,100%)">' +
          '</div>' +
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
      var chips = $('laChips');
      if (chips) {
        var sync = function () {
          Array.prototype.forEach.call(chips.querySelectorAll('.la-chip'), function (c) {
            c.classList.toggle('on', c.getAttribute('data-who') === LA.who);
          });
        };
        sync();
        chips.onclick = function (ev) {
          var b = ev.target.closest ? ev.target.closest('.la-chip') : null;
          if (!b) { return; }
          LA.who = b.getAttribute('data-who') || 'all';
          sync();
          laPaint();
        };
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
      box.innerHTML = '<div class="alx-empty">Could not load the archive.<span>' + esc(e.message) + '</span></div>';
    });
  }
})();