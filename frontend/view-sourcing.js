/* view-sourcing.js — R5 (21 Aug), Hasib: "make a separate dashboard page in sourcing links of
 * the products … supplier 1, supplier 2, supplier 3 … order processors will receive pending
 * tasks if there is not even a single link working for any item."
 * Three supplier slots per ACTIVE listing. Links from the Main Sheet's supplier columns arrive
 * via the Engine; links typed here live in the portal's own overrides table (a sheet push can
 * never erase them) and win the merge. The Missing tab, sorted by 30-day sales, IS the Order
 * Processors' task queue — the 09:00 UK letter points them at it every day it is not empty. */
(function () {

  var SRC_VIEW_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS', 'Order Processor'];
  var SRC_EDIT_ROLES = ['Order Processor', 'Management', 'Ops Head', 'Team Lead'];
  var SRC = { tab: 'missing', acct: '', q: '', rows: [], sums: null };

  VIEW_CSS.push(
    '.src-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:14px}' +
    '.src-card{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px}' +
    '.src-card .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}' +
    '.src-card .v{font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.src-slot{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}' +
    '.src-slot a{color:var(--gold-a);font-weight:700;font-size:11.5px}' +
    '.src-add{border:1px dashed var(--gold-line);background:none;color:var(--text-3);border-radius:8px;padding:3px 8px;font:inherit;font-size:11px;font-weight:700;cursor:pointer}' +
    '.src-add:hover{color:var(--gold-a);border-color:var(--gold-line-hi)}' +
    '.src-edit{border:none;background:none;color:var(--text-3);cursor:pointer;font-size:11px;padding:2px}' +
    '.src-input{width:230px;background:var(--panel);border:1px solid var(--gold-line-hi);border-radius:8px;color:var(--text);font:inherit;font-size:11.5px;padding:5px 8px}' +
    '.src-miss{font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--bad-soft,rgba(255,80,80,.12));color:var(--bad)}'
  );

  function srcStr(v) { return String(v == null ? '' : v).trim(); }
  function srcCanEdit() { return STATE.user && (SRC_EDIT_ROLES.indexOf(STATE.user.role) >= 0 || STATE.user.super); }

  function srcHost(u) {
    var m = srcStr(u).match(/^https:\/\/([^/]+)/i);
    return m ? m[1].replace(/^www\./, '').split('.').slice(0, -1).join('.') || m[1] : 'link';
  }

  function srcSlotCell(r, slot) {
    var eff = srcStr(r['e' + slot]);
    var fromPortal = !!srcStr(r['s' + slot]);
    var h = '<span class="src-slot" data-item="' + esc(srcStr(r.item_id)) + '" data-slot="' + slot + '">';
    if (eff) {
      h += '<a href="' + esc(eff) + '" target="_blank" rel="noopener noreferrer" title="' + esc(eff) + (fromPortal ? ' (saved in the portal)' : ' (from the Main Sheet)') + '">' + esc(srcHost(eff)) + '</a>';
      if (srcCanEdit()) { h += '<button class="src-edit" data-act="edit" title="Replace this link">✎</button>'; }
    } else if (srcCanEdit()) {
      h += '<button class="src-add" data-act="edit">+ add</button>';
    } else {
      h += '<span style="color:var(--text-3)">—</span>';
    }
    return h + '</span>';
  }

  function srcRender() {
    var box = $('srcBody');
    if (!box) { return; }
    var rows = SRC.rows;
    if (SRC.tab === 'missing') { rows = rows.filter(function (r) { return !r.links_n; }); }
    if (SRC.acct) { rows = rows.filter(function (r) { return srcStr(r.account) === SRC.acct; }); }
    if (SRC.q) {
      var q = SRC.q.toLowerCase();
      rows = rows.filter(function (r) { return srcStr(r.title).toLowerCase().indexOf(q) >= 0 || srcStr(r.item_id).indexOf(q) >= 0; });
    }
    var s = SRC.sums || {};
    var h = '<div class="src-cards">' +
      '<div class="src-card"><div class="l">Active listings</div><div class="v">' + (s.total || 0) + '</div></div>' +
      '<div class="src-card"><div class="l">With supplier links</div><div class="v" style="color:var(--ok)">' + (s.with_links || 0) + '</div></div>' +
      '<div class="src-card"><div class="l">Missing — the task queue</div><div class="v" style="color:' + (s.missing_n ? 'var(--bad)' : 'var(--ok)') + '">' + (s.missing_n || 0) + '</div></div>' +
      '<div class="src-card"><div class="l">Missing AND selling / has open orders</div><div class="v" style="color:' + (s.missing_hot ? 'var(--bad)' : 'var(--ok)') + '">' + (s.missing_hot || 0) + '</div></div></div>';
    if (SRC.tab === 'missing') {
      h += '<p style="font-size:12px;color:var(--text-3);font-weight:600;margin:0 0 10px">Not a single working link on these — top sellers first. Add supplier 1 at least; the 9 AM letter keeps ringing the Order Processors until this list is empty.</p>';
    }
    if (!rows.length) {
      h += '<div class="empty">' + (SRC.tab === 'missing' ? 'Nothing missing — every listing has at least one supplier link. Keep it that way.' : 'No rows match.') + '</div>';
    } else {
      h += '<div class="scroll" style="max-height:560px"><table class="ir-tbl src-tbl" style="min-width:980px"><thead><tr>' +
        '<th style="text-align:left">Item</th><th style="text-align:left">Account</th><th>Price</th><th>Sold 30d</th><th>Open orders</th>' +
        '<th style="text-align:left">Supplier 1</th><th style="text-align:left">Supplier 2</th><th style="text-align:left">Supplier 3</th><th style="text-align:left">Updated</th></tr></thead><tbody>';
      rows.slice(0, 400).forEach(function (r) {
        h += '<tr' + (!r.links_n ? ' style="background:var(--bad-soft,rgba(255,80,80,.05))"' : '') + '>' +
          '<td style="text-align:left"><a href="https://www.ebay.co.uk/itm/' + esc(srcStr(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit"><div style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(srcStr(r.title) || srcStr(r.item_id)) + '</div></a></td>' +
          '<td style="text-align:left">' + esc(srcStr(r.account)) + '</td>' +
          '<td class="num">£' + (Number(r.price) || 0).toFixed(2) + '</td>' +
          '<td class="num">' + (Number(r.sold_30d) || 0) + '</td>' +
          '<td class="num">' + (Number(r.open_orders) ? '<b style="color:var(--warn,#d9a021)">' + r.open_orders + '</b>' : '0') + '</td>' +
          '<td style="text-align:left">' + srcSlotCell(r, 1) + '</td>' +
          '<td style="text-align:left">' + srcSlotCell(r, 2) + '</td>' +
          '<td style="text-align:left">' + srcSlotCell(r, 3) + '</td>' +
          '<td style="text-align:left;font-size:11px;color:var(--text-3)">' + (srcStr(r.upd_by) ? esc(srcStr(r.upd_by).split('@')[0]) + ' · ' + esc(srcStr(r.upd_at).slice(0, 10)) : '—') + '</td></tr>';
      });
      h += '</tbody></table></div>';
      if (rows.length > 400) { h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">Showing the first 400 of ' + rows.length + ' — narrow with search or the account filter.</p>'; }
    }
    box.innerHTML = h;

    box.querySelectorAll('[data-act="edit"]').forEach(function (b) {
      b.onclick = function () {
        var holder = this.closest('.src-slot');
        var itemId = holder.getAttribute('data-item'), slot = holder.getAttribute('data-slot');
        var row = SRC.rows.filter(function (r) { return srcStr(r.item_id) === itemId; })[0] || {};
        var current = srcStr(row['e' + slot]);
        holder.innerHTML = '<input class="src-input" type="url" placeholder="https://…" value="' + esc(current) + '">' +
          '<button class="minibtn" data-save="1">Save</button>' +
          (current ? '<button class="minibtn" data-clear="1" title="Remove this link">✕</button>' : '') +
          '<button class="minibtn" data-cancel="1">↩</button>';
        var inp = holder.querySelector('input');
        inp.focus();
        var save = function (url) {
          holder.innerHTML = '<span style="color:var(--text-3);font-size:11px">saving…</span>';
          api('sourcingSave', { item_id: itemId, slot: Number(slot), url: url }).then(function () {
            row['s' + slot] = url; row['e' + slot] = url || srcStr(row['f' + slot]);
            row.links_n = ['e1', 'e2', 'e3'].filter(function (k) { return srcStr(row[k]); }).length;
            srcRecount(); srcRender();
          }).catch(function (e) {
            alert(e.message);
            srcRender();
          });
        };
        holder.querySelector('[data-save="1"]').onclick = function () { save(inp.value.trim()); };
        var cl = holder.querySelector('[data-clear="1"]');
        if (cl) { cl.onclick = function () { if (confirm('Remove this supplier link from the portal?')) { save(''); } }; }
        holder.querySelector('[data-cancel="1"]').onclick = srcRender;
        inp.onkeydown = function (ev) { if (ev.key === 'Enter') { save(inp.value.trim()); } if (ev.key === 'Escape') { srcRender(); } };
      };
    });
  }

  function srcRecount() {
    var miss = SRC.rows.filter(function (r) { return !r.links_n; });
    SRC.sums = { total: SRC.rows.length, with_links: SRC.rows.length - miss.length, missing_n: miss.length,
      missing_hot: miss.filter(function (r) { return Number(r.open_orders) > 0 || Number(r.sold_30d) > 0; }).length };
    var mt = $('srcTabMiss');
    if (mt) { mt.innerHTML = 'Missing — task queue <b>' + miss.length + '</b>'; }
  }

  function srcLoad() {
    var box = $('srcBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('sourcingBoard', {}).then(function (d) {
      SRC.rows = (d && d.rows) || [];
      SRC.sums = { total: d.total, with_links: d.with_links, missing_n: d.missing_n, missing_hot: d.missing_hot };
      if (!d.missing_n && SRC.tab === 'missing') { SRC.tab = 'all'; }
      var mt = $('srcTabMiss');
      if (mt) { mt.innerHTML = 'Missing — task queue <b>' + (d.missing_n || 0) + '</b>'; }
      srcRender();
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">The sourcing board did not answer — ' + esc(e.message) + '</div>';
    });
  }

  VIEWS.sourcing = {
    label: 'Sourcing links',
    order: 3.7,
    roles: SRC_VIEW_ROLES,
    icon: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    prefetch: function () { return api('sourcingBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1><span class="goldtext">Sourcing</span> links</h1>' +
        '<span class="sub">supplier 1 · 2 · 3 for every ACTIVE listing — the sheet’s links plus everything saved here · the Missing tab is the Order Processors’ task queue</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
        '<button class="ob-chip" id="srcTabMiss" data-tab="missing">Missing — task queue <b>…</b></button>' +
        '<button class="ob-chip" id="srcTabAll" data-tab="all">All listings</button>' +
        '<select class="alx-sel" id="srcAcct"><option value="">All accounts</option></select>' +
        '<input class="src-input" id="srcQ" placeholder="Search title or item id…" style="flex:1;min-width:180px">' +
        '<button class="minibtn" id="srcRefresh">Refresh</button></div>' +
        '<div id="srcBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      var setTab = function (t) {
        SRC.tab = t;
        var m = $('srcTabMiss'), a = $('srcTabAll');
        if (m) { m.classList.toggle('on', t === 'missing'); }
        if (a) { a.classList.toggle('on', t === 'all'); }
        srcRender();
      };
      var m = $('srcTabMiss'), a = $('srcTabAll');
      if (m) { m.onclick = function () { setTab('missing'); }; m.classList.add('on'); }
      if (a) { a.onclick = function () { setTab('all'); }; }
      cachedCall('accountList', {}, function (d) {
        var sel = $('srcAcct');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">All accounts</option>' + (((d && d.accounts) || []).map(function (x) {
          var n = String(x.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
        sel.onchange = function () { SRC.acct = String(this.value || ''); srcRender(); };
      });
      var q = $('srcQ');
      if (q) { q.oninput = function () { SRC.q = this.value.trim(); srcRender(); }; }
      var rf = $('srcRefresh');
      if (rf) { rf.onclick = srcLoad; }
      srcLoad();
    }
  };
})();
