/* view-productSourcing.js — "Product sourcing & profit" (owner, 2 Nov 2026: "make a page in portal
 * that is entirely based on product sourcing & profitability — a page which takes item id and shows
 * all this data").
 *
 * One listing, one screen, two questions: WHERE DO WE BUY IT and WHAT DOES IT EARN. Everything here
 * is already known to the engine — it is answered by the single priceItemDetail read the Price
 * revision card uses — but there it is a panel inside a decision queue. This is the page you open
 * when somebody says an item number out loud.
 *
 * The item travels in the hash (#productSourcing/<item id>), the way Product history does, so a tab
 * keeps its own listing and a link can be pasted to a colleague. Roles match the data: profit per
 * unit is on this page, so it is Management / Ops Head / Pricing, the same gate priceItemDetail
 * enforces server-side — the page cannot show more than the engine will hand over. */
(function () {
  'use strict';

  var SP_ROLES = ['Management', 'Ops Head', 'Pricing'];
  var SP = { id: '', data: null, busy: false };

  VIEW_CSS.push(
    '.sp-find{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}' +
    '.sp-find input{flex:1 1 280px;min-width:200px;padding:11px 13px;border-radius:11px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:15px;font-weight:700;letter-spacing:.02em}' +
    '.sp-find input:focus{outline:2px solid var(--gold-a);outline-offset:1px}' +
    '.sp-head{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;border:1px solid var(--gold-a);border-radius:14px;padding:14px 16px;background:var(--panel);margin-bottom:14px}' +
    '.sp-head img{width:84px;height:84px;border-radius:12px;object-fit:cover;background:var(--panel-2);flex:none}' +
    '.sp-head h2{margin:0 0 4px;font-size:16px;line-height:1.3}.sp-head h2 a{color:inherit}' +
    '.sp-meta{font-size:11px;color:var(--text-3);font-weight:700;line-height:1.7}' +
    '.sp-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(310px,1fr))}' +
    '.sp-card{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px}' +
    '.sp-card.wide{grid-column:1/-1}' +
    '.sp-card h3{margin:0 0 8px;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.sp-r{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:12.5px;font-weight:600;border-bottom:1px solid var(--gold-line)}' +
    '.sp-r:last-child{border-bottom:0}.sp-r b{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}' +
    '.sp-r em{font-style:normal;display:block;font-size:10.5px;color:var(--text-3);font-weight:600}' +
    '.sp-r.big b{font-size:15px;color:var(--gold-a)}.sp-r.tot{border-top:1px solid var(--gold-line-hi);margin-top:4px;padding-top:6px;font-weight:800}' +
    '.sp-pos{color:var(--ok)}.sp-neg{color:var(--bad)}' +
    '.sp-tag{display:inline-block;font-size:10px;font-weight:800;border-radius:99px;padding:1px 8px;margin:0 4px 3px 0;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}' +
    '.sp-tag.ok{border-color:rgba(72,199,142,.5);color:var(--ok)}.sp-tag.bad{border-color:rgba(240,96,90,.55);color:var(--bad)}' +
    '.sp-tag.warn{border-color:rgba(255,159,67,.55);color:var(--warn)}.sp-tag.gold{border-color:var(--gold-a);color:var(--gold-a)}' +
    '.sp-sup{border:1px solid var(--gold-line);border-radius:10px;padding:9px 11px;margin-bottom:8px;background:var(--panel)}' +
    '.sp-sup.cur{border-color:var(--gold-a)}' +
    '.sp-sup .t{font-weight:800;font-size:12.5px;margin-bottom:2px}' +
    '.sp-sup a{color:var(--gold-a);word-break:break-all;font-size:11.5px;font-weight:600}' +
    '.sp-sub{font-size:10.5px;color:var(--text-3);font-weight:600;line-height:1.5}' +
    '.sp-empty{color:var(--text-3);font-weight:600;padding:10px 0;font-size:12.5px}' +
    '.sp-two{display:grid;gap:10px;grid-template-columns:1fr 1fr}' +
    '@media (max-width:620px){.sp-two{grid-template-columns:1fr}}'
  );

  function spS(v) { return String(v == null ? '' : v); }
  function spN(v) { return Number(v) || 0; }
  function spM(v) {
    if (v === null || v === undefined || v === '' || isNaN(Number(v))) { return '—'; }
    var n = Number(v);
    return (n < 0 ? '−£' : '£') + Math.abs(n).toFixed(2);
  }
  function spTone(v) { return (v === null || v === undefined || v === '') ? '' : (Number(v) < 0 ? 'sp-neg' : Number(v) > 0 ? 'sp-pos' : ''); }
  function spWhen(s) { s = spS(s).replace('T', ' '); return s ? s.slice(0, 16) : '—'; }
  function spRow(label, value, cls, hint) {
    return '<div class="sp-r ' + (cls || '') + '"><span>' + esc(label) + (hint ? '<em>' + esc(hint) + '</em>' : '') + '</span><b>' + value + '</b></div>';
  }
  function spLink(u, label) {
    var safe = (typeof safeUrl === 'function') ? safeUrl(u) : spS(u);
    if (!safe) { return esc(spS(u).slice(0, 60)); }
    return '<a href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + esc(label || spS(u).slice(0, 70)) + '</a>';
  }

  VIEWS.productSourcing = {
    label: 'Product sourcing & profit',
    order: 12.6,
    roles: SP_ROLES,
    icon: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Product <span class="goldtext">sourcing &amp; profit</span></h1>' +
          '<span class="sub">one item number — where we buy it, what it costs us, and what it actually earns</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div class="sp-find">' +
            '<input id="spQ" type="search" data-nodraft inputmode="numeric" autocomplete="off" placeholder="Paste or type the eBay item number, then press Enter" value="' + esc(SP.id) + '">' +
            '<button class="minibtn" id="spGo">Open</button>' +
          '</div>' +
          '<div id="spBody"><div class="sp-empty">Type an item number above. Everything on this page comes from the portal’s own records — the Central Main Sheet’s cost and supplier links, the hunt that found it, the orders we have actually paid for, and eBay’s fees worked out by the Order earning calculator.</div></div>' +
        '</div></div>';
    },
    init: function () {
      var q = $('spQ'), go = $('spGo');
      /* the item comes from the ROUTE, so a reload or a pasted link lands on the same listing */
      var want = spS((window.adtRoute ? adtRoute().param : '') || '').replace(/\D/g, '');
      SP.id = /^\d{9,14}$/.test(want) ? want : '';
      if (q) { q.value = SP.id; }
      var open = function () {
        var v = spS(q.value).replace(/\D/g, '');
        if (!/^\d{9,14}$/.test(v)) { toast('An eBay item number is 9 to 14 digits.'); return; }
        if (location.hash === '#productSourcing/' + v) { spLoad(v); } else { location.hash = 'productSourcing/' + v; }
      };
      if (go) { go.onclick = open; }
      if (q) { q.onkeydown = function (e) { if (e.key === 'Enter') { open(); } }; }
      if (SP.id) { spLoad(SP.id); }
    }
  };

  function spLoad(id) {
    var box = $('spBody');
    if (!box) { return; }
    SP.id = id;
    box.innerHTML = '<div class="spinner"></div>';
    api('priceItemDetail', { item_id: id }).then(function (d) {
      SP.data = d || {};
      if ($('spBody')) { spPaint(); }
    }).catch(function (e) {
      /* 'SAY:' is the engine's marker for "this message is meant for a person" — the marker itself
         is not, so it is taken off before the sentence is shown */
      if ($('spBody')) { $('spBody').innerHTML = '<div class="sp-empty"><b>' + esc(spS(e.message).replace(/^SAY:\s*/, '')) + '</b></div>'; }
    });
  }

  function spPaint() {
    var d = SP.data, box = $('spBody');
    if (!d || !box) { return; }
    var it = d.item || {}, cost = d.cost || {}, j = d.judge || {}, fl = d.fluctuation || {}, band = d.band || {};
    var h = '';

    /* ---- who and what ---- */
    h += '<div class="sp-head">' +
      (it.image && safeUrl(it.image) ? '<img src="' + esc(safeUrl(it.image)) + '" alt="" loading="lazy">' : '<div class="sp-head-none" style="width:84px;height:84px;border-radius:12px;background:var(--panel-2);flex:none"></div>') +
      '<div style="flex:1;min-width:240px">' +
        '<h2><a href="https://www.ebay.co.uk/itm/' + esc(spS(it.item_id)) + '" target="_blank" rel="noopener noreferrer">' + esc(spS(it.title) || spS(it.item_id)) + '</a></h2>' +
        '<div class="sp-meta"><span class="mono">' + esc(spS(it.item_id)) + '</span> · ' + esc(spS(it.account)) + ' · ' + esc(spS(it.status)) +
          ' · listed at ' + spM(it.price) +
          (it.live_at ? ' · live since ' + esc(spS(it.live_at).slice(0, 10)) : '') +
          (it.hunter ? ' · hunted by ' + esc(spS(it.hunter).split('@')[0]) : '') +
          (it.lister ? ' · listed by ' + esc(spS(it.lister).split('@')[0]) : '') + '</div>' +
        '<div style="margin-top:6px">' +
          (spN(it.open_orders) ? '<span class="sp-tag bad">' + spN(it.open_orders) + ' order' + (spN(it.open_orders) === 1 ? '' : 's') + ' waiting to be bought</span>' : '') +
          (d.sale ? '<span class="sp-tag gold">in a sale event · ' + esc(spS(d.sale.discount) || spS(d.sale.type)) + '</span>' : '') +
          (d.campaign ? '<span class="sp-tag">' + esc(spS(d.campaign.name).slice(0, 34)) + ' · ' + (d.campaign.is_cpc ? 'CPC' : 'general') + '</span>' : '<span class="sp-tag">not advertised</span>') +
          (fl.changes_30d ? '<span class="sp-tag warn">cost moved ' + spN(fl.changes_30d) + '× in 30 days</span>' : '') +
        '</div>' +
      '</div>' +
      '<div style="min-width:170px"><a class="minibtn" style="display:inline-block;text-decoration:none" href="#adtoolProduct/' + esc(spS(it.item_id)) + '" data-adt-open="' + esc(spS(it.item_id)) + '">Product history ↗</a></div>' +
    '</div>';

    h += '<div class="sp-grid">';

    /* ---- 1. where we buy it ---- */
    var links = d.links || [], names = it.sup_names || [];
    h += '<div class="sp-card"><h3>Where we buy it</h3>';
    h += spRow('Supplier we are working', it.supplier ? esc(spS(it.supplier).slice(0, 48)) : '<span class="sp-sub">none named on the Main Sheet</span>', 'big');
    if (!links.length) {
      h += '<div class="sp-empty">No buying link anywhere — not on the Main Sheet, not on the go-live record, not on the hunt. ' +
        (spN(it.open_orders) ? '<b>Orders are waiting.</b>' : 'Nothing is waiting yet, but the first order will have nowhere to go.') + '</div>';
    } else {
      links.forEach(function (l, i) {
        h += '<div class="sp-sup' + (i === 0 ? ' cur' : '') + '"><div class="t">Supplier ' + (i + 1) +
          (names[i] ? ' · ' + esc(spS(names[i]).slice(0, 36)) : '') +
          (l.price ? ' <span class="sp-tag ok">' + spM(l.price) + ' in the link</span>' : '') + '</div>' +
          spLink(l.url, spS(l.url).replace(/^https?:\/\//, '').slice(0, 56) + '…') +
          '<div class="sp-sub">from the ' + esc(spS(l.src)) + '</div></div>';
      });
    }
    if (d.hunt && d.hunt.temu) { h += '<div class="sp-sup"><div class="t">Temu</div>' + spLink(d.hunt.temu, 'open') + '</div>'; }
    h += '<div class="sp-sub">' +
      (d.sourcing_saved_by ? 'Portal links saved by ' + esc(spS(d.sourcing_saved_by).split('@')[0]) + ' · ' + esc(spWhen(d.sourcing_saved_at)) + '. ' : '') +
      'Order of trust: a link saved in the portal, then the Central Main Sheet, then the go-live record, then the hunt.</div>';
    h += '</div>';

    /* ---- 2. what it costs us ---- */
    h += '<div class="sp-card"><h3>What it costs us</h3>' +
      spRow('Used for every figure here', cost.used ? spM(cost.used) : '—', 'big', cost.source ? 'taken from: ' + cost.source : 'no cost known anywhere') +
      spRow('Central Main Sheet', cost.sheet ? spM(cost.sheet) : '<span class="sp-sub">blank</span>', '', it.facts_at ? 'read ' + spWhen(it.facts_at) : '') +
      spRow('Average actually paid · 30 days', cost.paid_avg_30d ? spM(cost.paid_avg_30d) : '<span class="sp-sub">no costed order</span>') +
      (cost.paid_avg_180d ? spRow('Average actually paid · 180 days', spM(cost.paid_avg_180d)) : '') +
      ((cost.paid_costs_seen || []).length ? spRow('Prices we have really paid',
        (cost.paid_costs_seen || []).map(function (x) { return spM(x.cost) + ' ×' + x.orders; }).join(', '), '', 'per unit, from the order book') : '') +
      (cost.hunt_source_price ? spRow('The hunter’s source price', esc(spS(cost.hunt_source_price)), '', 'typed when the product was found') : '') +
      (cost.link_price ? spRow('Price inside the buying link', spM(cost.link_price), '', 'AliExpress carries it in the link itself') : '') +
      '</div>';

    /* ---- 3. what it earns ---- */
    var chainN = d.chain_neutral, chainA = d.chain_ads;
    h += '<div class="sp-card wide"><h3>What it earns · the Order earning calculator, on this listing</h3>';
    if (!spN(j.ali)) {
      /* the engine still returns a chain when no cost is known, and it would read as pure profit —
         a listing that looks like it earns £9 a unit because nobody has typed what we pay for it.
         The fee side is real and is shown; the profit side is refused until a cost exists. */
      h += '<div class="sp-empty"><b>No AliExpress cost is known for this listing.</b> eBay\u2019s side can still be worked out' +
        (chainN ? ' \u2014 on ' + spM(chainN.price) + ' the fees come to ' + spM(chainN.deduct) + ', leaving ' + spM(chainN.earn) + ' of order earning' : '') +
        ' \u2014 but profit cannot, and showing it would read as if the product were free. Put the cost on the Central Main Sheet, or let one order be costed in the order book, and this fills in by itself.</div>';
    } else if (!chainN) {
      h += '<div class="sp-empty">No price on the listing, so there is nothing to work out.</div>';
    } else {
      var col = function (title, ch, pfx, note) {
        var gap = j[pfx + 'gap'], req = j[pfx + 'required'], nl = j[pfx + 'new_list'];
        return '<div><div class="sp-sub" style="font-weight:800;color:var(--text-2);margin-bottom:4px">' + esc(title) + '</div>' +
          spRow('Buyers pay', spM(ch.price), '', note) +
          spRow('eBay takes', '−' + spM(ch.deduct), '', 'fees ' + spN(band.rate) + '% banded, the per-order fee, 0.35% regulatory' + (ch.ad_fee ? ', the General rate' : '') + ', +20% VAT') +
          spRow('AliExpress', '−' + spM(j.ali)) +
          (ch.cpc_incl ? spRow('CPC ads a unit', '−' + spM(ch.cpc_incl), '', spM(j.cpc_per_unit_14d) + ' ex VAT over 14 days') : '') +
          spRow('VAT to HMRC', '−' + spM(ch.vat_hmrc)) +
          spRow('Actual profit a unit', '<span class="' + spTone(ch.actual) + '">' + spM(ch.actual) + '</span>', 'tot big') +
          spRow('Target a unit', spM(j.target), '', 'tier ' + spM(j.target_tier) + ' on an Ali cost of ' + spM(j.ali) + ' · 15% of the price = ' + spM(j.target_pct)) +
          spRow('Gap', '<span class="' + spTone(gap) + '">' + spM(gap) + '</span>', 'tot') +
          (req ? spRow('Buyers would have to pay', spM(req), '', 'to clear both targets') : '') +
          (nl ? spRow('So list it at', spM(nl), 'big', 'the list price scaled by the same ratio') : '') +
          '</div>';
      };
      h += '<div class="sp-two">' +
        col('Neutral — no advertising at all', chainN, 'n_', 'the price buyers actually paid over 30 days') +
        (chainA ? col('After the last 14 days of ads', chainA, 'a_', (j.units_14d || 0) + ' sold in those 14 days') : '<div class="sp-empty">No ad figures for the last 14 days.</div>') +
      '</div>';
      h += '<div class="sp-sub" style="margin-top:8px">Category ' + esc(spS(band.name)) + ' at ' + spN(band.rate) + '%' +
        (band.source === 'unmatched' || band.source === 'none' ? ' (assumed — eBay has not told us this listing’s category)' : band.source === 'sheet' ? ' (from the Main Sheet)' : '') +
        (j.fee_share_observed !== null && j.fee_share_observed !== undefined ? ' · eBay actually took ' + j.fee_share_observed + '% of the sale on the real orders' : '') + '</div>';
    }
    h += '</div>';

    /* ---- 4. what it sells ---- */
    h += '<div class="sp-card"><h3>What it sells</h3>' +
      spRow('Last 7 days', (j.units_7d || 0) + ' sold') +
      spRow('Last 14 days', (j.units_14d || 0) + ' sold', '', 'the window the ad figures use') +
      spRow('Last 30 days', (j.units_30d || 0) + ' sold · ' + spM(j.revenue_30d)) +
      (j.last_sold ? spRow('Last sale', esc(spS(j.last_sold))) : '') +
      spRow('Ads · last 14 days', spM(j.spend_14d), '', 'CPC ' + spM(j.cpc_14d) + ' · general ' + spM(j.gen_14d) + ' · ' + spN(j.clicks_14d) + ' clicks') +
      (j.cpc_max !== null && j.cpc_max !== undefined ? spRow('Most CPC this price can carry', spM(j.cpc_max), '', 'per unit, at today’s price') : '') +
      '</div>';

    /* ---- 5. the cost trail ---- */
    h += '<div class="sp-card"><h3>Cost history</h3>';
    if (!(d.history || []).length) {
      h += '<div class="sp-empty">No cost change recorded. The Main Sheet’s cost is compared every hour; a move of 10p or more is kept with its tier.</div>';
    } else {
      h += '<div class="sp-sub" style="margin-bottom:6px">30 days: ' + spN(fl.changes_30d) + ' move' + (spN(fl.changes_30d) === 1 ? '' : 's') +
        ' (' + spN(fl.rises_30d) + ' up, ' + spN(fl.drops_30d) + ' down), drift ' + spM(fl.drift_30d) + '</div>';
      h += (d.history || []).slice(0, 10).map(function (x) {
        var p = spN(x.delta_p);
        return '<div class="sp-r"><span>' + esc(spS(x.seen_day) || spS(x.seen_at).slice(0, 10)) +
          (x.supplier ? '<em>' + esc(spS(x.supplier).slice(0, 34)) + '</em>' : '') + '</span>' +
          '<b>' + spM(x.old_cost) + ' → ' + spM(x.new_cost) + ' <span class="' + (p > 0 ? 'sp-neg' : 'sp-pos') + '">' + (p > 0 ? '+' : '') + p + 'p</span></b></div>';
      }).join('');
    }
    h += '</div>';

    /* ---- 6. what was decided ---- */
    h += '<div class="sp-card"><h3>Alerts &amp; decisions</h3>';
    var any = (d.alerts || []).length || (d.decisions || []).length;
    if (!any) { h += '<div class="sp-empty">Nothing raised and nothing decided on this listing.</div>'; }
    h += (d.alerts || []).slice(0, 5).map(function (a) {
      return '<div class="sp-r"><span>' + esc(spS(a.tier) || 'cost rise') + '<em>' + esc(spWhen(a.alerted_at)) +
        (a.acked_at ? ' · handled by ' + esc(spS(a.acked_by).split('@')[0]) : ' · still open') + '</em></span>' +
        '<b>' + spM(a.old_cost) + ' → ' + spM(a.new_cost) + '</b></div>';
    }).join('');
    h += (d.decisions || []).slice(0, 5).map(function (x) {
      return '<div class="sp-r"><span>' + esc(spS(x.verdict)) + '<em>' + esc(spWhen(x.at)) + ' · ' + esc(spS(x.by_email).split('@')[0]) +
        (x.note ? ' — ' + esc(spS(x.note).slice(0, 70)) : '') + '</em></span><b>' + (x.price_target ? '→ ' + spM(x.price_target) : '') + '</b></div>';
    }).join('');
    h += '</div>';

    /* ---- 7. the orders behind the averages ---- */
    if ((d.recent_orders || []).length) {
      h += '<div class="sp-card wide"><h3>The orders these averages came from</h3>' +
        (d.recent_orders || []).slice(0, 12).map(function (o) {
          return '<div class="sp-r"><span>' + esc(spS(o.date)) + ' · ' + spN(o.qty) + ' unit' + (spN(o.qty) === 1 ? '' : 's') +
            '<em>' + esc(spS(o.order_id)) + '</em></span><b>sold ' + spM(o.sold) + ' · cost ' + (o.cost ? spM(o.cost) : '<span class="sp-sub">not typed</span>') +
            ' · eBay ' + (o.fees ? spM(o.fees) : '<span class="sp-sub">pending</span>') + (o.refunded ? ' · refunded ' + spM(o.refunded) : '') + '</b></div>';
        }).join('') + '</div>';
    }

    h += '</div>';
    box.innerHTML = h;
  }

  /* a hash change to another item while the page is open re-reads it */
  window.addEventListener('hashchange', function () {
    if (!$('spBody')) { return; }
    var r = window.adtRoute ? adtRoute() : { key: '', param: '' };
    if (r.key !== 'productSourcing') { return; }
    var id = spS(r.param).replace(/\D/g, '');
    if (/^\d{9,14}$/.test(id) && id !== SP.id) {
      var q = $('spQ');
      if (q) { q.value = id; }
      spLoad(id);
    }
  });
})();
