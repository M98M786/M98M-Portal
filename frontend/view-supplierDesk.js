/* view-supplierDesk.js — Supplier sourcing (27 Nov, owner): "a supplier sourcing page … every single
 * eBay item's supplier data … search the item ID … show all three suppliers, how each is working, the
 * main supplier and the cost of its previous orders … never compare the 120cm light's cost with the
 * 80cm". One item number → its three suppliers with today's cost, every past order with the cost paid
 * and which supplier it was bought from, the cost moves, and each VARIATION's own cost and verdict.
 * The auto-reprice is shown in SHADOW: the price each variation would be set to, sent nowhere. A
 * listing inside a running sale event is marked locked — eBay refuses the revision until a person
 * takes it out of the event in Seller Hub. Without an item number the page is the board: live
 * listings with no supplier anywhere, today's 30p+ cost moves, accounts whose order book feeds no
 * costs. Every figure comes from the same engine read as the Price revision item card. */
(function () {

  var SD_ROLES = ['Management', 'Ops Head', 'Pricing'];
  var SD = { id: '', data: null, board: null, tab: 'missing', acct: '', open: null };
  var SD_TIER = { '': 'under 10p', low: 'low 10p', moderate: 'moderate 20p', serious: 'serious 30p', red: 'red 50p', critical: 'critical £1' };
  var SD_SEG = { raise: 'raise price', ads_high: 'ads too high', reduce: 'room to reduce', on_target: 'on target', cost_missing: 'cost missing', dormant: 'dormant', spending_no_sales: 'spending, no sales' };

  VIEW_CSS.push(
    '.sd-find{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}' +
    '.sd-find input{flex:1;min-width:240px;background:var(--panel);border:1px solid var(--gold-line-hi);border-radius:10px;color:var(--text);font:inherit;font-size:14px;padding:9px 12px;font-family:ui-monospace,Menlo,monospace}' +
    '.sd-head{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px}' +
    '.sd-head img{width:72px;height:72px;border-radius:10px;object-fit:cover;border:1px solid var(--gold-line)}' +
    '.sd-head h2{margin:0 0 4px;font-size:16px;line-height:1.3}.sd-head h2 a{color:var(--text)}' +
    '.sd-sub{font-size:12px;color:var(--text-3)}.sd-sub .mono{font-family:ui-monospace,Menlo,monospace;color:var(--text-2)}' +
    '.sd-kpis{display:flex;gap:18px;margin-left:auto;text-align:right}.sd-kpis .l{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}.sd-kpis .v{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums}' +
    '.sd-pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;letter-spacing:.04em;padding:2px 8px;border-radius:99px;margin-right:4px;border:1px solid var(--gold-line);color:var(--text-2)}' +
    '.sd-pill.ok{color:var(--ok);border-color:var(--ok)}.sd-pill.bad{color:var(--bad);border-color:var(--bad)}.sd-pill.warn{color:var(--warn);border-color:var(--warn)}.sd-pill.gold{color:var(--gold-a);border-color:var(--gold-line-hi)}' +
    '.sd-sups{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-bottom:12px}' +
    '.sd-sup{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px;display:grid;gap:6px}' +
    '.sd-sup.main{border-color:var(--gold-line-hi)}.sd-sup .t{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;display:flex;justify-content:space-between}' +
    '.sd-sup .cost{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}.sd-sup .cost small{font-size:11px;color:var(--text-3);font-weight:600;margin-left:6px}' +
    '.sd-sup a{color:var(--gold-a);font-weight:700;font-size:12px;word-break:break-all}' +
    '.sd-sup .f{font-size:11.5px;color:var(--text-3)}.sd-sup .f b{color:var(--text-2);font-weight:700}' +
    '.sd-red{border:1px solid var(--bad);background:var(--bad-soft,rgba(255,80,80,.10));border-radius:12px;padding:12px 14px;margin-bottom:12px}' +
    '.sd-red h3{margin:0 0 4px;color:var(--bad);font-size:14px}.sd-red p{margin:2px 0;font-size:12.5px}' +
    '.sd-shadow{border:1px dashed var(--gold-line-hi);border-radius:12px;padding:10px 14px;margin-bottom:12px;background:var(--panel-2)}' +
    '.sd-shadow h3{margin:0 0 6px;font-size:13px;display:flex;align-items:center;gap:8px}' +
    '.sd-tbl{width:100%;border-collapse:collapse;font-size:12.5px}.sd-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.sd-tbl td{padding:6px 8px;border-bottom:1px solid var(--gold-line);vertical-align:top}.sd-tbl td.r,.sd-tbl th.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.sd-tbl tr.sel td{background:rgba(233,169,60,.10)}.sd-tbl tr.v td{cursor:pointer}.sd-tbl tr.v:hover td{background:rgba(61,155,240,.06)}' +
    '.sd-wrap{overflow-x:auto}.sd-blk{margin-bottom:14px}.sd-blk h3{font-size:13px;margin:0 0 6px;display:flex;align-items:center;gap:8px}.sd-blk h3 .n{font-size:11px;color:var(--text-3);font-weight:600}' +
    '.sd-chain{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:8px 8px 10px}' +
    '.sd-ch{background:var(--panel);border:1px solid var(--gold-line);border-radius:10px;padding:8px 10px;font-size:12px}.sd-ch .h{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;margin-bottom:4px}' +
    '.sd-ch .r{display:flex;justify-content:space-between;gap:10px;padding:1px 0}.sd-ch .r.tot{border-top:1px solid var(--gold-line);margin-top:3px;padding-top:3px;font-weight:800}' +
    '.sd-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:12px}.sd-tile{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px;cursor:pointer}.sd-tile.on{border-color:var(--gold-line-hi)}' +
    '.sd-tile .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}.sd-tile .v{font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.sd-up{color:var(--bad);font-weight:800}.sd-down{color:var(--ok);font-weight:800}.sd-mute{color:var(--text-3)}' +
    '.sd-empty{padding:18px;color:var(--text-3);font-size:13px}'
  );

  function sdS(v) { return String(v == null ? '' : v); }
  function sdN(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function sdM(v) { if (v === null || v === undefined || v === '') { return '—'; } var x = sdN(v); return (x < 0 ? '−' : '') + '£' + Math.abs(x).toFixed(2); }
  function sdHost(u) { var m = sdS(u).match(/^https?:\/\/([^/]+)/i); return m ? m[1].replace(/^www\./, '') : 'link'; }
  function sdLink(u, label) { var safe = (typeof safeUrl === 'function') ? safeUrl(u) : sdS(u); if (!safe) { return esc(sdS(label || u).slice(0, 60)); } return '<a href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + esc(label || sdHost(u)) + '</a>'; }
  function sdTone(v) { return v === null || v === undefined ? 'sd-mute' : (sdN(v) < 0 ? 'sd-up' : 'sd-down'); }
  function sdItemLink(id, text) { return '<a href="#supplierDesk/' + esc(sdS(id)) + '" data-sd-open="' + esc(sdS(id)) + '">' + esc(text || sdS(id)) + '</a>'; }
  function sdTier(t) { var cls = t === 'serious' || t === 'red' || t === 'critical' ? 'bad' : (t === 'moderate' ? 'warn' : ''); return '<span class="sd-pill ' + cls + '">' + esc(SD_TIER[t] || t || 'under 10p') + '</span>'; }

  VIEWS.supplierDesk = {
    label: 'Supplier sourcing',
    order: 12.55,
    roles: SD_ROLES,
    icon: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Supplier <span class="goldtext">sourcing</span></h1>' +
          '<span class="sub">one item number — its three suppliers, what each costs today, which one every past order was bought from, and each variation\'s own cost</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div class="sd-find">' +
            '<input id="sdQ" type="search" data-nodraft inputmode="numeric" autocomplete="off" placeholder="eBay item number → the supplier card · leave empty for the board" value="' + esc(SD.id) + '">' +
            '<button class="minibtn" id="sdGo">Open</button>' +
            '<button class="minibtn" id="sdBoard">Board</button>' +
            '<button class="minibtn" id="sdRefresh">Refresh</button>' +
          '</div>' +
          '<div id="sdBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      var q = $('sdQ');
      var want = sdS((window.adtRoute ? adtRoute().param : '') || '').replace(/\D/g, '');
      SD.id = /^\d{9,14}$/.test(want) ? want : '';
      if (q) { q.value = SD.id; }
      var open = function () {
        var v = sdS(q.value).replace(/\D/g, '');
        if (!v) { location.hash = 'supplierDesk'; sdLoadBoard(); return; }
        if (!/^\d{9,14}$/.test(v)) { toast('An eBay item number is 9 to 14 digits.'); return; }
        if (location.hash === '#supplierDesk/' + v) { sdLoad(v); } else { location.hash = 'supplierDesk/' + v; }
      };
      $('sdGo').onclick = open;
      $('sdBoard').onclick = function () { SD.id = ''; if (q) { q.value = ''; } location.hash = 'supplierDesk'; sdLoadBoard(); };
      $('sdRefresh').onclick = function () { if (SD.id) { sdLoad(SD.id); } else { SD.board = null; sdLoadBoard(); } };
      if (q) { q.onkeydown = function (e) { if (e.key === 'Enter') { open(); } }; }
      if (SD.id) { sdLoad(SD.id); } else { sdLoadBoard(); }
    }
  };

  function sdFail(e) { var b = $('sdBody'); if (b) { b.innerHTML = '<div class="sd-empty"><b>' + esc(sdS(e && e.message).replace(/^SAY:\s*/, '')) + '</b></div>'; } }

  /* ---------- the item card ---------- */
  function sdLoad(id) {
    var box = $('sdBody'); if (!box) { return; }
    SD.id = id; SD.open = null;
    box.innerHTML = '<div class="spinner"></div>';
    api('supplierDesk', { item_id: id }).then(function (d) { SD.data = d || {}; if ($('sdBody')) { sdPaint(); } }).catch(sdFail);
  }

  function sdChainBox(title, ch, j, pfx) {
    if (!ch) { return ''; }
    var r = function (l, v, cls) { return '<div class="r ' + (cls || '') + '"><span>' + esc(l) + '</span><b>' + v + '</b></div>'; };
    return '<div class="sd-ch"><div class="h">' + esc(title) + '</div>' +
      r('Buyers pay', sdM(ch.price)) + r('eBay fees + VAT', '−' + sdM(ch.deduct)) + r('AliExpress cost · this variation', '−' + sdM(j.ali)) +
      (ch.cpc_incl ? r('CPC a unit + VAT', '−' + sdM(ch.cpc_incl)) : '') + r('VAT to HMRC', '−' + sdM(ch.vat_hmrc)) +
      r('Actual profit a unit', '<span class="' + sdTone(ch.actual) + '">' + sdM(ch.actual) + '</span>', 'tot') +
      r('Target (tier ' + sdM(j.target_tier) + ' · 15% ' + sdM(j.target_pct) + ')', sdM(j.target)) +
      r('Gap', '<span class="' + sdTone(j[pfx + 'gap']) + '">' + sdM(j[pfx + 'gap']) + '</span>') +
      (j[pfx + 'required'] ? r('Must sell at', sdM(j[pfx + 'required']), 'tot') : '') + '</div>';
  }

  function sdPaint() {
    var d = SD.data, box = $('sdBody'); if (!d || !box) { return; }
    var it = d.item || {}, fl = d.flags || {}, v = d.variations || {}, sh = d.shadow || {}, cost = d.cost || {};
    var spend = !!d.spend_only;
    var h = '<div class="sd-head">' +
      (it.image ? '<img src="' + esc(sdS(it.image)).replace(/"/g, '&quot;') + '" alt="">' : '') +
      '<div style="flex:1;min-width:260px"><h2><a href="https://www.ebay.co.uk/itm/' + esc(sdS(it.item_id)) + '" target="_blank" rel="noopener noreferrer">' + esc(sdS(it.title) || sdS(it.item_id)) + '</a></h2>' +
      '<div class="sd-sub"><span class="mono">' + esc(sdS(it.item_id)) + '</span> · ' + esc(sdS(it.account)) + ' · ' + esc(sdS(it.status)) +
        (it.hunter ? ' · hunted by ' + esc(sdS(it.hunter).split('@')[0]) : '') + (it.live_at ? ' · live ' + esc(sdS(it.live_at).slice(0, 10)) : '') + '</div>' +
      '<div style="margin-top:6px">' +
        (fl.no_supplier ? '<span class="sd-pill bad">no supplier on file</span>' : '<span class="sd-pill ok">' + (d.suppliers || []).length + ' supplier' + ((d.suppliers || []).length === 1 ? '' : 's') + ' on file</span>') +
        (fl.locked_in_sale ? '<span class="sd-pill bad">locked in a sale event</span>' : '') +
        (v.multi ? '<span class="sd-pill gold">' + v.variations_n + ' variations sold · cost ' + sdM(v.cost_low) + '–' + sdM(v.cost_high) + '</span>' : '') +
        (fl.bought_elsewhere ? '<span class="sd-pill warn">' + fl.bought_elsewhere + ' order' + (fl.bought_elsewhere === 1 ? '' : 's') + ' bought from an unlisted supplier</span>' : '') +
        ((d.fluctuation || {}).changes_30d ? '<span class="sd-pill warn">cost moved ' + d.fluctuation.changes_30d + '× in 30 days</span>' : '') +
      '</div></div>' +
      '<div class="sd-kpis"><div><div class="l">List price</div><div class="v">' + sdM(it.price) + '</div></div>' +
        '<div><div class="l">Sold 30d</div><div class="v">' + sdN(it.sold_30d) + '</div></div>' +
        '<div><div class="l">Main cost</div><div class="v">' + (cost.used ? sdM(cost.used) : '—') + '</div></div></div></div>';

    if (fl.locked_in_sale) {
      h += '<div class="sd-red"><h3>Locked by a sale event</h3><p>' + esc(sdS(d.locked_reason)) + (d.sale ? ' · ' + esc(sdS(d.sale.name)) + (d.sale.end_at ? ' · ends ' + esc(sdS(d.sale.end_at).slice(0, 10)) : '') : '') + '</p>' +
        '<p>What this page does: holds the would-be price below and sends nothing. What a person does: remove the item from the event in ' + sdLink(d.seller_hub_url, 'Seller Hub') + ', then revise.</p></div>';
    }

    /* the three suppliers */
    var sups = d.suppliers || [], w = d.working_supplier;
    h += '<div class="sd-blk"><h3>Suppliers <span class="n">the one the orders were actually bought from, then the three on file</span></h3><div class="sd-sups">';
    if (w) {
      h += '<div class="sd-sup main"><div class="t"><span>Working supplier · from the orders</span><span>' + (w.on_file ? 'on file as supplier ' + w.on_file : '<span class="sd-pill warn" style="margin:0">not in the three on file</span>') + '</span></div>' +
        '<div>' + sdLink(w.url, sdHost(w.url) + (w.ali_item ? ' · ' + w.ali_item : '')) + '</div>' +
        '<div class="cost">' + (w.paid ? sdM(w.paid) : '—') + '<small>paid a unit, average</small></div>' +
        '<div class="f">Bought on <b>' + w.orders + '</b> of the last ' + (d.orders || []).length + ' orders' + (w.last_used ? ' · last ' + esc(w.last_used) : '') + '</div></div>';
    }
    for (var i = 0; i < 3; i++) {
      var s = sups[i];
      h += '<div class="sd-sup"><div class="t"><span>' + (i === 0 ? 'Supplier 1 · on file' : 'Supplier ' + (i + 1) + ' · on file') + '</span>' + (s ? '<span>' + esc(sdS(s.src)) + '</span>' : '') + '</div>';
      if (!s) { h += '<div class="sd-mute" style="font-size:12.5px">none on file</div></div>'; continue; }
      h += '<div>' + sdLink(s.url, sdHost(s.url) + (s.ali_item ? ' · ' + s.ali_item : '')) + '</div>' +
        '<div class="cost">' + (s.cost_now ? sdM(s.cost_now) : '—') + (s.cost_now_source ? '<small>' + esc(s.cost_now_source) + '</small>' : '') + '</div>' +
        '<div class="f">Used on <b>' + s.orders_via + '</b> of the last ' + (d.orders || []).length + ' orders' + (s.paid_via ? ' · paid <b>' + sdM(s.paid_via) + '</b> a unit' : '') + (s.last_used ? ' · last ' + esc(s.last_used) : '') + '</div>' +
        (s.link_price ? '<div class="f">price carried in the link <b>' + sdM(s.link_price) + '</b></div>' : '') + '</div>';
    }
    h += '</div>';
    if ((d.untracked || []).length) {
      h += '<div class="sd-sub" style="margin-top:-6px">Also bought from: ' + d.untracked.slice(0, 4).map(function (u) { return sdLink(u.url, u.ali_item) + ' (' + u.orders + ' order' + (u.orders === 1 ? '' : 's') + (u.paid ? ', ' + sdM(u.paid) : '') + ')'; }).join(' · ') + ' — not one of the three on file</div>';
    }
    h += '</div>';

    /* cost by variation + shadow reprice */
    var rows = v.rows || [];
    if (rows.length) {
      h += '<div class="sd-blk"><h3>Cost by variation <span class="n">each variation judged on the cost paid for THAT variation · click a row for its calculator chain</span></h3><div class="sd-wrap"><table class="sd-tbl"><thead><tr>' +
        '<th>Variation</th><th class="r">Sold 30d</th><th class="r">Buyers pay</th><th class="r">Ali cost</th><th>Cost source</th>' +
        (spend ? '' : '<th class="r">Actual / unit</th><th class="r">Target</th><th class="r">Gap</th><th>Verdict</th><th class="r">Would set <span class="sd-pill gold" style="margin:0">shadow</span></th>') + '</tr></thead><tbody>';
      rows.forEach(function (r, i) {
        var j = r.judge || {}, sel = SD.open === i;
        var srow = (sh.rows || []).filter(function (x) { return x.variation === r.variation; })[0] || null;
        var dir = srow ? srow.direction : '', would = srow ? srow.would_set : null;
        h += '<tr class="v' + (sel ? ' sel' : '') + '" data-sd-var="' + i + '"><td>' + esc(sdS(r.label).slice(0, 70)) + '</td><td class="r">' + r.units_30d + '</td><td class="r">' + (r.paid ? sdM(r.paid) : '—') + '</td>' +
          '<td class="r">' + (j.ali ? sdM(j.ali) : '—') + '</td><td class="sd-sub">' + esc(sdS(j.ali_source) || 'none') + (r.last_cost_at ? ' · last paid ' + esc(r.last_cost_at) : '') + '</td>';
        if (!spend) {
          h += '<td class="r ' + sdTone(j.n_actual) + '">' + (j.n_actual === null || j.n_actual === undefined ? '—' : sdM(j.n_actual)) + '</td><td class="r">' + (j.target ? sdM(j.target) : '—') + '</td>' +
            '<td class="r ' + sdTone(j.n_gap) + '">' + (j.n_gap === null || j.n_gap === undefined ? '—' : sdM(j.n_gap)) + '</td><td><span class="sd-pill ' + (j.n_segment === 'raise' ? 'bad' : j.n_segment === 'on_target' ? 'ok' : j.n_segment === 'reduce' ? 'gold' : '') + '">' + esc(SD_SEG[j.n_segment] || sdS(j.n_segment)) + '</span>' + (j.n_loss ? ' <span class="sd-pill bad">losing</span>' : '') + '</td>' +
            '<td class="r">' + (dir === 'raise' ? '<span class="sd-up">↑ ' + sdM(would) + '</span>' : dir === 'lower' ? '<span class="sd-down">↓ ' + sdM(would) + '</span>' : (srow ? '<span class="sd-mute">hold</span>' : '—')) + (dir && dir !== 'hold' && fl.locked_in_sale ? ' <span class="sd-pill bad" style="margin:0">locked</span>' : '') + '</td>';
        }
        h += '</tr>';
        if (sel && !spend) { h += '<tr><td colspan="10"><div class="sd-chain">' + sdChainBox('Neutral · no ads', r.chain_neutral, j, 'n_') + sdChainBox('With ads · last 14 days', r.chain_ads, j, 'a_') + '</div></td></tr>'; }
      });
      h += '</tbody></table></div>' +
        '<div class="sd-sub" style="margin-top:6px">' + esc(sdS(v.note)) + (sh.rows && sh.rows.length ? ' · <b>shadow</b>: ' + sh.rows.filter(function (x) { return x.direction === 'raise'; }).length + ' would raise · ' + sh.rows.filter(function (x) { return x.direction === 'lower'; }).length + ' would lower · ' + sh.rows.filter(function (x) { return x.direction === 'hold'; }).length + ' hold — ' + esc(sdS(sh.note)) : '') + '</div></div>';
    }

    /* previous orders */
    var ords = d.orders || [];
    if (ords.length) {
      h += '<div class="sd-blk"><h3>Previous orders <span class="n">' + ords.length + ' in 180 days · cost actually paid · which supplier it came from</span></h3><div class="sd-wrap"><table class="sd-tbl"><thead><tr><th>Date</th><th>Variation</th><th class="r">Qty</th><th class="r">Sold</th><th class="r">Ali cost</th><th>Supplier</th></tr></thead><tbody>';
      ords.slice(0, 60).forEach(function (o) {
        var via = o.via === 'other' ? '<span class="sd-pill warn">other · ' + esc(sdS(o.ali_item)) + '</span>' : (o.via ? '<span class="sd-pill ' + (o.via === 1 ? 'gold' : '') + '">' + (o.via === 1 ? 'main' : 'supplier ' + o.via) + '</span>' : (o.has_link ? '<span class="sd-pill">link, no item id</span>' : '<span class="sd-pill bad">no link typed</span>'));
        h += '<tr><td class="sd-sub">' + esc(o.date) + '</td><td>' + esc(sdS(o.variation) || '—') + '</td><td class="r">' + o.qty + '</td><td class="r">' + sdM(o.sold) + '</td><td class="r">' + (o.cost ? sdM(o.unit_cost || o.cost) : '<span class="sd-mute">—</span>') + '</td><td>' + via + '</td></tr>';
      });
      h += '</tbody></table></div>' + (ords.length > 60 ? '<div class="sd-sub">first 60 shown</div>' : '') + '</div>';
    }

    /* cost moves */
    var mv = d.moves || [];
    h += '<div class="sd-blk"><h3>Cost moves <span class="n">from the Main Sheet, compared every hour · 30p+ in a day is serious</span></h3>';
    h += mv.length ? '<div class="sd-wrap"><table class="sd-tbl"><thead><tr><th>Day</th><th class="r">From</th><th class="r">To</th><th class="r">Move</th><th>Tier</th><th>Supplier</th></tr></thead><tbody>' +
      mv.slice(0, 20).map(function (m) { return '<tr' + (m.flip ? ' style="opacity:.6"' : '') + '><td class="sd-sub">' + esc(m.day) + '</td><td class="r">' + sdM(m.old_cost) + '</td><td class="r">' + sdM(m.new_cost) + '</td><td class="r ' + (m.delta > 0 ? 'sd-up' : 'sd-down') + '">' + (m.delta > 0 ? '+' : '') + sdM(m.delta) + '</td><td>' + (m.flip ? '<span class="sd-pill" title="the Main Sheet\'s one cost cell moved from one variation\'s cost to another\'s — not a supplier change">variation flip</span>' : sdTier(m.tier)) + '</td><td>' + (m.supplier ? sdLink(m.supplier, sdHost(m.supplier)) : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<div class="sd-sub">no cost move recorded for this item yet</div>';
    h += '</div>';

    box.innerHTML = h;
    sdWire(box);
  }

  function sdWire(box) {
    var vs = box.querySelectorAll('tr[data-sd-var]');
    for (var i = 0; i < vs.length; i++) {
      vs[i].onclick = function () { var k = Number(this.getAttribute('data-sd-var')); SD.open = SD.open === k ? null : k; sdPaint(); };
    }
    var os = box.querySelectorAll('a[data-sd-open]');
    for (var k = 0; k < os.length; k++) {
      os[k].onclick = function (ev) { ev.preventDefault(); var id = this.getAttribute('data-sd-open'); var q = $('sdQ'); if (q) { q.value = id; } location.hash = 'supplierDesk/' + id; };
    }
    var tiles = box.querySelectorAll('[data-sd-tab]');
    for (var t = 0; t < tiles.length; t++) {
      tiles[t].onclick = function () { SD.tab = this.getAttribute('data-sd-tab'); sdPaintBoard(); };
    }
    var sa = $('sdAcct');
    if (sa) { sa.onchange = function () { SD.acct = sa.value; sdPaintBoard(); }; }
  }

  /* ---------- the board ---------- */
  function sdLoadBoard() {
    var box = $('sdBody'); if (!box) { return; }
    SD.id = '';
    if (SD.board) { sdPaintBoard(); return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('supplierDesk', {}).then(function (d) { SD.board = d || {}; if ($('sdBody') && !SD.id) { sdPaintBoard(); } }).catch(sdFail);
  }

  function sdPaintBoard() {
    var d = SD.board, box = $('sdBody'); if (!d || !box) { return; }
    var c = d.counts || {};
    var tile = function (key, l, v, cls) { return '<div class="sd-tile' + (SD.tab === key ? ' on' : '') + '" data-sd-tab="' + key + '"><div class="l">' + esc(l) + '</div><div class="v ' + (cls || '') + '">' + v + '</div></div>'; };
    var h = '<div class="sd-tiles">' +
      tile('missing', 'Live listings · no supplier anywhere', sdN(c.no_supplier), c.no_supplier ? 'sd-up' : '') +
      tile('selling', 'Of those, sold in 30 days', sdN(c.no_supplier_selling), c.no_supplier_selling ? 'sd-up' : 'sd-down') +
      tile('moves', 'Real cost moves 30p+ · since yesterday', sdN(c.moves_serious) + (c.moves_flips ? '<small style="font-size:11px;color:var(--text-3);font-weight:600"> + ' + sdN(c.moves_flips) + ' variation flips</small>' : ''), c.moves_serious ? 'sd-up' : 'sd-down') +
      tile('feeds', 'Accounts with no cost feed', sdN(c.accounts_no_book), c.accounts_no_book ? 'sd-up' : 'sd-down') + '</div>';

    if (SD.tab === 'missing' || SD.tab === 'selling') {
      var rows = (d.no_supplier || []).filter(function (r) { return SD.tab === 'missing' || r.sold_30d > 0; });
      var accts = Object.keys(d.no_supplier_by_account || {}).sort();
      h += '<div class="sd-blk"><h3>' + (SD.tab === 'selling' ? 'Selling with no supplier on file' : 'No supplier on file') + ' <span class="n">no link in the Main Sheet, the portal, the go-live record, past orders or the hunt</span>' +
        '<select id="sdAcct" class="minibtn" style="margin-left:auto;padding:4px 8px"><option value="">All accounts</option>' + accts.map(function (a) { return '<option value="' + esc(a) + '"' + (SD.acct === a ? ' selected' : '') + '>' + esc(a) + ' · ' + d.no_supplier_by_account[a] + '</option>'; }).join('') + '</select></h3>';
      if (SD.acct) { rows = rows.filter(function (r) { return r.account === SD.acct; }); }
      h += rows.length ? '<div class="sd-wrap"><table class="sd-tbl"><thead><tr><th>Item</th><th>Account</th><th class="r">Price</th><th class="r">Sold 30d</th><th class="r">Orders 14d</th><th>Hunt record</th><th>Past orders with a link</th></tr></thead><tbody>' +
        rows.slice(0, 300).map(function (r) {
          return '<tr><td>' + sdItemLink(r.item_id, r.item_id) + ' · ' + esc(sdS(r.title).slice(0, 60)) + '</td><td>' + esc(r.account) + '</td><td class="r">' + sdM(r.price) + '</td><td class="r">' + r.sold_30d + '</td><td class="r">' + r.orders_14d + '</td>' +
            '<td>' + (r.hunt_id ? '<span class="sd-pill ok">' + esc(r.hunt_id) + (r.hunter ? ' · ' + esc(sdS(r.hunter).split('@')[0]) : '') + '</span>' : '<span class="sd-pill">none</span>') + '</td>' +
            '<td>' + (r.orders_with_link ? '<span class="sd-pill gold">' + r.orders_with_link + ' order' + (r.orders_with_link === 1 ? '' : 's') + ' · open card to adopt</span>' : '<span class="sd-pill">0</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' + (rows.length > 300 ? '<div class="sd-sub">first 300 shown</div>' : '') : '<div class="sd-empty">nothing missing' + (SD.acct ? ' on ' + esc(SD.acct) : '') + '</div>';
      h += '</div>';
    }
    if (SD.tab === 'moves') {
      var mv = d.moves || [];
      h += '<div class="sd-blk"><h3>Cost moves since yesterday <span class="n">from every Main Sheet · the engine compares costs hourly</span></h3>' +
        (mv.length ? '<div class="sd-wrap"><table class="sd-tbl"><thead><tr><th>Item</th><th>Account</th><th class="r">From</th><th class="r">To</th><th class="r">Move</th><th>Tier</th><th>When</th></tr></thead><tbody>' +
          mv.slice().sort(function (a, b) { return (a.flip ? 1 : 0) - (b.flip ? 1 : 0); }).map(function (m) { return '<tr' + (m.flip ? ' style="opacity:.6"' : '') + '><td>' + sdItemLink(m.item_id, m.item_id) + ' · ' + esc(sdS(m.title).slice(0, 56)) + '</td><td>' + esc(m.account) + '</td><td class="r">' + sdM(m.old_cost) + '</td><td class="r">' + sdM(m.new_cost) + '</td><td class="r ' + (m.delta > 0 ? 'sd-up' : 'sd-down') + '">' + (m.delta > 0 ? '+' : '') + sdM(m.delta) + '</td><td>' + (m.flip ? '<span class="sd-pill">variation flip</span>' : sdTier(m.tier)) + '</td><td class="sd-sub">' + esc((typeof fmtPkt === 'function' ? fmtPkt(m.at, true) : '') || sdS(m.at).slice(0, 16)) + '</td></tr>'; }).join('') +
          '</tbody></table></div>' : '<div class="sd-empty">no cost moved since yesterday</div>') + '</div>';
    }
    if (SD.tab === 'feeds') {
      h += '<div class="sd-blk"><h3>What each account\'s order book feeds <span class="n">orders in 14 days · how many carry a typed cost and a buying link</span></h3><div class="sd-wrap"><table class="sd-tbl"><thead><tr><th>Account</th><th class="r">Orders 14d</th><th class="r">With cost</th><th class="r">With link</th><th>State</th></tr></thead><tbody>' +
        (d.feeds || []).map(function (f) { return '<tr><td>' + esc(f.account) + '</td><td class="r">' + f.orders_14d + '</td><td class="r">' + f.with_cost + '</td><td class="r">' + f.with_link + '</td><td>' + (f.no_book ? '<span class="sd-pill bad">no order book connected — costs and links never arrive</span>' : (f.with_cost < f.orders_14d * 0.6 ? '<span class="sd-pill warn">costs behind</span>' : '<span class="sd-pill ok">feeding</span>')) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    }
    box.innerHTML = h;
    sdWire(box);
  }

})();
