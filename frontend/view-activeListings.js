/* view-activeListings.js — V2 second-module req 2/3: the live Active Listings database,
 * served by the ENGINE (D1, ~150ms) with the /exec fallback built into api(). Columns are
 * whatever the server sent AFTER its role stripping — profit and campaign fields simply do not
 * arrive for roles outside the §6 matrix, so this file renders what exists and derives nothing.
 * Source chip per row: API (eBay, refreshed on the 15-minute cron) or SHEET (Sir Hasib / facts
 * from the workbooks). Read-only in this version; Zain's inline campaign edit is Phase C. */
(function () {

  var ALX_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS', 'Order Processor', 'Listing Manager'];

  VIEW_CSS.push(
    '.alx-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}' +
    '.alx-q{min-width:270px;font-weight:600}' +
    '.alx-sel{padding:9px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:700;font-size:12.5px}' +
    '.alx-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px}' +
    '.alx-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.alx-tbl td{padding:9px 12px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.alx-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.alx-img{width:38px;height:38px;border-radius:8px;object-fit:cover;background:var(--panel-2);border:1px solid var(--gold-line)}' +
    '.alx-title{font-weight:700;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.alx-src{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 8px;border-radius:99px}' +
    '.alx-src.api{background:var(--ok-soft);color:var(--ok)}' +
    '.alx-src.sheet{background:var(--warn-soft);color:var(--warn)}' +
    '.alx-num{font-variant-numeric:tabular-nums;font-weight:700}' +
    '.alx-neg{color:var(--bad)}.alx-pos{color:var(--ok)}' +
    '.alx-empty{color:var(--text-2);font-weight:700;padding:18px 0}' +
    '.alx-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px}' +
    '.alx-count{margin-left:auto;font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.alx-supcur{font-weight:700;font-size:12px;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.alx-suprow{display:flex;gap:4px;margin-top:3px}' +
    '.alx-sup{font-size:10px;font-weight:800;padding:1px 7px;border-radius:99px;background:var(--panel-2);color:var(--text-3);border:1px solid var(--gold-line)}' +
    '.alx-suplink{color:var(--gold-a);border-color:var(--gold-line-hi);text-decoration:none}' +
    '.alx-suplink:hover{background:var(--gold-soft, var(--blue-soft))}'
  );

  function axStr(v) { return String(v == null ? '' : v).trim(); }
  function axGBP(v) { var n = Number(v); return isFinite(n) && n !== 0 ? '£' + n.toFixed(2) : '—'; }

  var ALX = { account: '', rows: [], q: '' };

  function alxFetch() {
    var payload = {};
    if (ALX.account) { payload.account = ALX.account; }
    if (axStr(ALX.q)) { payload.q = axStr(ALX.q); }   // searched in D1 — the fleet is bigger than one page
    return api('activeListings', payload).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('activeListings', payload, d); }
      return d;
    });
  }

  /* The Main Sheet carries a working supplier plus up to three AliExpress links (its own headers
     are 'Current Supplier Working', 'Ali Express Link 1', 'Suuplier 2' and 'Supplier 3'). All of
     them are shown: a buyer's item goes out of stock at one supplier and the next is what the
     processor needs, and until now this column showed a single blank. */
  function alxSupLink(url, label) {
    var u = axStr(url);
    if (!u) { return ''; }
    var safe = typeof safeUrl === 'function' ? safeUrl(u) : '';
    if (!safe) { return '<span class="alx-sup">' + esc(label) + '</span>'; }
    return '<a class="alx-sup alx-suplink" href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
  }

  function alxSuppliers(r) {
    var cur = axStr(r.current_sup);
    var links = [alxSupLink(r.sup1_link, '1'), alxSupLink(r.sup2_link, '2'), alxSupLink(r.sup3_link, '3')].filter(Boolean);
    if (!cur && !links.length) { return '<span style="color:var(--text-3)">—</span>'; }
    var head = cur ? '<div class="alx-supcur">' + esc(cur) + '</div>' : '';
    return head + (links.length ? '<div class="alx-suprow">' + links.join('') + '</div>' : '');
  }

  function alxPaint(d) {
    var box = $('alxBody');
    if (!box) { return; }
    if (d) { ALX.rows = d.rows || []; }
    var all = ALX.rows;
    var q = axStr(ALX.q).toLowerCase();
    if (q) {
      all = all.filter(function (r) {
        return (axStr(r.item_id) + ' ' + axStr(r.title) + ' ' + axStr(r.campaign_type) + ' ' + axStr(r.campaign_name)).toLowerCase().indexOf(q) >= 0;
      });
    }
    var cnt = $('alxCount');
    if (cnt) { cnt.textContent = all.length + (q ? ' of ' + ALX.rows.length : '') + ' listing(s)' + (ALX.rows.length >= 500 ? ' · newest 500 synced' : ''); }
    if (!all.length) {
      box.innerHTML = q
        ? '<div class="alx-empty">No listing matches “' + esc(ALX.q) + '”.<span>Item numbers, titles and campaign names are all searched, across every account you can see.</span></div>'
        : '<div class="alx-empty">Nothing here yet for this filter.' +
          '<span>The Engine refreshes listings on a rolling 15-minute cycle — a freshly connected account fills up over the first hour.</span></div>';
      return;
    }
    // Optional columns exist only when the server sent them for this role (§6).
    var hasProfit = ALX.rows.some(function (r) { return r.profit !== undefined; });
    var hasCampaign = ALX.rows.some(function (r) { return r.campaign_type !== undefined; });
    var hasOE = ALX.rows.some(function (r) { return r.oe !== undefined && Number(r.oe) !== 0; });
    var hasAds = ALX.rows.some(function (r) { return r.ad_spend_14d !== undefined; });
    var h = '<div class="scroll"><table class="alx-tbl"><thead><tr>' +
      '<th></th><th>Item</th><th>Account</th><th>Price</th><th>Qty</th>' +
      (hasOE ? '<th>Order earning</th>' : '') +
      (hasProfit ? '<th>Profit</th>' : '') +
      (hasAds ? '<th>Ads 14d</th>' : '') +
      (hasCampaign ? '<th>Campaign</th>' : '') +
      '<th>Suppliers</th><th>Source</th></tr></thead><tbody>';
    ALX.rows.forEach(function (r) {
      var img = axStr(r.image);
      /* The chip answers "where did this ROW come from": a row eBay itself synced is API, even
       * though its sheet facts ride along. Only a row with no API sync at all is SHEET (Sir
       * Hasib's bridge). Reading items_facts.source here made every listing claim SHEET. */
      var src = axStr(r.api_synced_at) ? 'API' : 'SHEET';
      h += '<tr>' +
        '<td>' + (img && safeUrl(img) ? '<img class="alx-img" loading="lazy" src="' + esc(safeUrl(img)) + '" alt="">' : '<div class="alx-img"></div>') + '</td>' +
        '<td><div class="alx-title">' + esc(axStr(r.title) || '(no title)') + '</div><div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(axStr(r.item_id)) + '</div></td>' +
        '<td>' + esc(axStr(r.account)) + '</td>' +
        '<td class="alx-num">' + axGBP(r.price) + '</td>' +
        '<td class="alx-num">' + (Number(r.qty) || 0) + '</td>' +
        (hasOE ? '<td class="alx-num">' + axGBP(r.oe) + '</td>' : '') +
        (hasProfit ? '<td class="alx-num ' + (Number(r.profit) < 0 ? 'alx-neg' : 'alx-pos') + '">' + axGBP(r.profit) + '</td>' : '') +
        (hasAds ? '<td class="alx-num">' + (r.ad_spend_14d !== undefined ? axGBP(r.ad_spend_14d) + (Number(r.ad_units_14d) ? '<div style="font-size:10px;color:var(--text-3)">' + Number(r.ad_units_14d) + ' sold via ads</div>' : '') : '—') + '</td>' : '') +
        (hasCampaign ? '<td>' + esc(axStr(r.campaign_type) || '—') + (axStr(r.campaign_name) ? '<div style="font-size:10.5px;color:var(--text-3)">' + esc(axStr(r.campaign_name)) + '</div>' : '') + '</td>' : '') +
        '<td>' + alxSuppliers(r) + '</td>' +
        '<td><span class="alx-src ' + (src === 'API' ? 'api' : 'sheet') + '">' + src + '</span></td>' +
      '</tr>';
    });
    box.innerHTML = h + '</tbody></table></div>';
  }

  function alxLoad() {
    var box = $('alxBody');
    if (!box) { return; }
    var payload = {};
    if (ALX.account) { payload.account = ALX.account; }
    if (axStr(ALX.q)) { payload.q = axStr(ALX.q); }
    var had = (typeof cacheRead === 'function') ? cacheRead('activeListings', payload) : null;
    if (had) { try { alxPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    alxFetch().then(alxPaint).catch(function (e) {
      if (had) { toast('Showing the last listings — could not refresh just now.'); return; }
      box.innerHTML = '<div class="alx-empty">Could not load the listings.<span>' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.activeListings = {
    label: 'Active listings',
    order: 6,
    roles: ALX_ROLES,
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 13h4M8 16h7"/>',
    prefetch: function () { return alxFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Active <span class="goldtext">listings</span></h1>' +
          '<span class="sub">Live from eBay every 15 minutes · joined with the sheet facts · what you may see is decided server-side</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div class="alx-bar"><select class="alx-sel" id="alxAcc"><option value="">All accounts</option></select>' +
          '<input class="alx-sel alx-q" id="alxQ" type="search" autocomplete="off" placeholder="Search item number, title or campaign…">' +
          '<button class="minibtn" id="alxRefresh">Refresh</button>' +
          '<button class="minibtn" id="alxExport">⬇ Export CSV</button>' +
          '<span class="alx-count" id="alxCount"></span></div>' +
          '<div id="alxBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      cachedCall('accountList', {}, function (d) {
        var sel = $('alxAcc');
        if (!sel) { return; }
        var keep = sel.value;
        sel.innerHTML = '<option value="">All accounts</option>' + ((d && d.accounts) || []).map(function (a) {
          var n = axStr(a.account);
          return n ? '<option' + (n === keep ? ' selected' : '') + '>' + esc(n) + '</option>' : '';
        }).join('');
      });
      var sel = $('alxAcc');
      if (sel) { sel.onchange = function () { ALX.account = axStr(this.value); alxLoad(); }; }
      /* The search reaches the server, so an item number finds its listing wherever it sits in the
         fleet rather than only within the rows already on screen. Typing is debounced so a full
         item number is one query, not twelve. */
      var qbox = $('alxQ');
      if (qbox) {
        var qTimer = null;
        qbox.value = ALX.q || '';
        qbox.oninput = function () {
          var v = this.value;
          if (qTimer) { clearTimeout(qTimer); }
          qTimer = setTimeout(function () { ALX.q = axStr(v); alxLoad(); }, 300);
        };
        qbox.onkeydown = function (e) {
          if (e.key === 'Enter') { if (qTimer) { clearTimeout(qTimer); } ALX.q = axStr(this.value); alxLoad(); }
        };
      }
      var rf = $('alxRefresh');
      if (rf) { rf.onclick = alxLoad; }
      var ex = $('alxExport');
      if (ex) {
        ex.onclick = function () {
          // export exactly what the server sent this role — the strip law rides along
          var rows = ALX.rows || [];
          if (!rows.length) { toast('Nothing to export for this filter.'); return; }
          var cols = ['item_id', 'account', 'title', 'price', 'qty', 'oe', 'ali_cost', 'profit', 'ad_spend_14d', 'campaign_type', 'campaign_name', 'current_sup', 'sup1_link', 'sup2_link', 'sup3_link', 'category', 'source'];
          cols = cols.filter(function (c) { return rows.some(function (r) { return r[c] !== undefined; }); });
          var esc1 = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
          var out = cols.join(',') + '\n';
          rows.forEach(function (r) { out += cols.map(function (c) { return esc1(r[c]); }).join(',') + '\n'; });
          var a = document.createElement('a');
          a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(out);
          a.download = 'active-listings-' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a); a.click(); a.remove();
          toast(rows.length + ' listing(s) exported.');
        };
      }
      alxLoad();
    }
  };
})();
