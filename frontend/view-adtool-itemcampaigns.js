/* view-adtool-itemcampaigns.js — Advertising · Where each listing advertises (owner's batch, 18 Oct 2026).
 *
 * The owner's words: "I need a proper seperate page which tells me in which campaign this item is
 * right now." So this page is the item-to-campaign lookup for the whole shop at once: every active
 * listing, the campaign or campaigns it is in right now, and the ones in no campaign at all.
 *
 * A listing live in more than one campaign is the thing that costs money twice, so that state is
 * marked in the loss colour and gets its own chip. Each listing's last 3 and 7 days of spend sit on
 * the same row, so "which campaign is this in" and "what is it costing" are answered together.
 *
 * Read-only: nothing on this page is ever sent to eBay. No collective profit anywhere, by the
 * Sales Analysis law. Galaxy tokens only, gold the accent, #e0563f the loss colour.
 * Engine action: adtoolItemCampaigns. Own class prefix: .wla-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var WL = { account: '', q: '', state: '', accounts: [], data: null, busy: false };

  VIEW_CSS.push([
    '.wla-wrap{max-width:1420px}',
    '.wla-search{display:flex;gap:8px;align-items:center;margin:8px 0 12px;flex-wrap:wrap}',
    '.wla-search input{flex:1 1 320px;min-width:200px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}',
    '.wla-search input:focus{outline:2px solid var(--gold-b);outline-offset:1px}',
    '.wla-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:9px 14px;font:inherit;font-weight:800;font-size:12.5px;cursor:pointer}',
    '.wla-btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--gold-line)}',
    '.wla-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}',
    '.wla-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}',
    '.wla-filters button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.wla-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    '.wla-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:5px 14px;font:inherit;font-size:12px;color:var(--text-2);font-weight:700;cursor:pointer}',
    '.wla-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.wla-chip.multi{border-color:rgba(224,86,63,.55);color:' + LOSS + '}',
    '.wla-chip.multi.on{background:' + LOSS + ';border-color:' + LOSS + ';color:#fff}',
    '.wla-chip .n{opacity:.75;margin-left:6px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.wla-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.wla-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.wla-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.wla-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.wla-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.wla-tbl th.r{text-align:right}',
    '.wla-tbl td{padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.wla-tbl td.r{text-align:right;white-space:nowrap}',
    '.wla-tbl tr:hover td{background:rgba(255,255,255,.03)}',
    '.wla-tbl tr.multi td:first-child{box-shadow:inset 3px 0 0 ' + LOSS + '}',
    '.wla-scroll{overflow-x:auto}',
    '.wla-cmp{display:flex;flex-direction:column;gap:6px;min-width:300px}',
    '.wla-c{border:1px solid var(--gold-line);border-radius:10px;padding:7px 10px;background:rgba(255,255,255,.02)}',
    '.wla-c.live{border-color:rgba(242,176,53,.5);background:rgba(242,176,53,.08)}',
    '.wla-c .n{font-size:12px;font-weight:800;color:var(--text)}',
    '.wla-c .m{font-size:10.5px;color:var(--text-3);margin-top:3px;line-height:1.5}',
    '.wla-c .m b{color:var(--text-2);font-weight:700}',
    '.wla-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.wla-pill.live{background:var(--gold-b);border-color:var(--gold-b);color:var(--gold-ink)}',
    '.wla-pill.off{border-color:rgba(224,86,63,.5);color:' + LOSS + '}',
    '.wla-mark{display:inline-block;padding:2px 9px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:' + LOSS + ';color:#fff;white-space:nowrap}',
    '.wla-none{display:inline-block;padding:2px 9px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px dashed var(--gold-line);color:var(--text-3);white-space:nowrap}',
    '.wla-sub2{font-size:10.5px;color:var(--text-3)}',
    '.wla-warn{background:rgba(224,86,63,.1);border:1px solid rgba(224,86,63,.45);border-radius:12px;padding:11px 14px;margin-bottom:12px;color:' + LOSS + ';font-size:12.5px;line-height:1.55;font-weight:700}',
    '.wla-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}',
    '.wla-empty{color:var(--text-3);font-size:13px;padding:10px 0}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function rateTxt(n) { var v = num(n); return v == null ? '—' : (Math.round(v * 100) / 100) + '%'; }
  function typeTxt(f) {
    f = String(f || '');
    return f === 'COST_PER_CLICK' ? 'CPC' : f === 'COST_PER_SALE' ? 'Cost per sale' : (f || '—');
  }

  VIEWS.adtoolItemCampaigns = {
    label: 'Where each listing advertises', hidden: true, order: 96, roles: ROLES,
    icon: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/>',
    render: function () {
      return '<div class="wla-wrap">' +
        adtHgroup('Where each listing advertises', 'Every active listing and the campaigns it is in right now', 'wlaFresh') +
        '<div class="wla-search">' +
          '<input id="wlaQ" type="search" placeholder="Search an item number or a title" autocomplete="off">' +
          '<button class="wla-btn" id="wlaGo">Search</button>' +
          '<button class="wla-btn ghost" id="wlaClear">Clear</button>' +
        '</div>' +
        '<div id="wlaAcct" class="wla-filters"></div>' +
        '<div id="wlaChips"></div>' +
        '<div id="wlaBody"><div class="wla-empty">Loading…</div></div></div>';
    },
    init: function () {
      var q = $('wlaQ'), go = $('wlaGo'), clear = $('wlaClear');
      go.onclick = function () { WL.q = q.value.trim(); load(); };
      clear.onclick = function () { q.value = ''; WL.q = ''; load(); };
      q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go.onclick(); } };
      acctChips();
      load();
    }
  };

  function acctChips() {
    var el = $('wlaAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (WL.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      WL.accounts.map(function (a) { return '<button class="' + (WL.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { WL.account = this.getAttribute('data-a'); acctChips(); load(); };
  }

  /* All, In one campaign, In more than one, In no campaign — the engine's own four counts */
  var STATE_CHIPS = [
    ['', 'All', 'active'],
    ['in', 'In one campaign', 'in_one'],
    ['multi', 'In more than one', 'in_many'],
    ['none', 'In no campaign', 'in_none']
  ];
  function stateChips() {
    var el = $('wlaChips'); if (!el) return;
    var C = (WL.data && WL.data.counts) || {};
    el.innerHTML = '<div class="wla-chips">' + STATE_CHIPS.map(function (c) {
      var n = num(C[c[2]]);
      return '<button class="wla-chip' + (c[0] === 'multi' ? ' multi' : '') + (WL.state === c[0] ? ' on' : '') + '" data-s="' + c[0] + '">' +
        esc(c[1]) + (n == null ? '' : '<span class="n">' + cnt(n) + '</span>') + '</button>';
    }).join('') + '</div>';
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { WL.state = this.getAttribute('data-s'); stateChips(); load(); };
  }

  function load() {
    if (WL.busy) return;
    WL.busy = true;
    var p = {};
    if (WL.account) p.account = WL.account;
    if (WL.q) p.q = WL.q;
    if (WL.state) p.state = WL.state;
    return api('adtoolItemCampaigns', p).then(function (d) {
      WL.busy = false;
      WL.data = d || {};
      var names = (d && d.accounts) || [];
      if (names.length) {
        WL.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
        acctChips();
      }
      if (!$('wlaBody')) return;
      stateChips();
      draw();
      adtFreshShow('wlaFresh', d && d.fresh);
    }).catch(function (e) {
      WL.busy = false;
      if ($('wlaBody')) {
        $('wlaBody').innerHTML = '<div class="wla-panel"><h3>Not available</h3><div class="wla-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
    });
  }

  /* the campaign or campaigns one listing is in right now. "live" is the state that spends money,
     so it is the one made obvious; a membership that is not live is printed plainly beside it. */
  function campaignsCell(it) {
    var cs = it.campaigns || [];
    if (!cs.length) return '<span class="wla-none">in no campaign</span>';
    return '<div class="wla-cmp">' + cs.map(function (c) {
      var live = !!c.live;
      return '<div class="wla-c' + (live ? ' live' : '') + '">' +
        '<div class="n">' + adtCampaignLink(c.campaign_id, c.name || c.campaign_id || 'Campaign') +
          ' <span class="wla-pill ' + (live ? 'live' : 'off') + '">' + (live ? 'live' : 'not live') + '</span></div>' +
        '<div class="m">' + esc(c.status || '—') + ' · ' + esc(typeTxt(c.funding_model)) +
          /* the budget belongs to the CAMPAIGN and is shared by every listing in it, so it must not
             read on a listing's own card as this listing's daily allowance */
          ' · campaign budget <b>' + gbp(c.budget_day) + '</b> a day, shared' +
          ' · ad rate <b>' + rateTxt(c.bid_pct) + '</b>' +
          ' · this ad <b>' + esc(c.ad_status || '—') + '</b></div></div>';
    }).join('') + '</div>';
  }

  function stateCell(it) {
    var n = num(it.live_count);
    if (n != null && n > 1) {
      return '<span class="wla-mark" title="this listing is live in ' + n + ' campaigns at once, so its spend is charged by each of them">in ' + n + ' campaigns</span>';
    }
    if (n === 1) return '<span class="wla-pill live">in one campaign</span>';
    return '<span class="wla-none">in no campaign</span>';
  }

  function row(it) {
    var n = num(it.live_count), multi = n != null && n > 1;
    return '<tr class="' + (multi ? 'multi' : '') + '">' +
      '<td>' + adtProductCell(it) + '</td>' +
      '<td>' + stateCell(it) + '</td>' +
      '<td class="r">' + gbp(it.price) + '</td>' +
      '<td class="r">' + cnt(it.sold_30d) + '</td>' +
      '<td class="r">' + gbp(it.spend_3d) + '</td>' +
      '<td class="r">' + gbp(it.spend_7d) + '</td>' +
      '<td>' + campaignsCell(it) + '</td></tr>';
  }

  function draw() {
    var D = WL.data || {}, items = (D.items || []).filter(function (i) { return i && typeof i === 'object'; });
    var C = D.counts || {}, h = '';

    /* the state that costs money twice, said first */
    var many = num(C.in_many);
    if (many != null && many > 0) {
      h += '<div class="wla-warn">' + cnt(many) + ' active listing' + (many === 1 ? ' is' : 's are') +
        ' live in more than one campaign right now, so each of those campaigns charges for the same listing.' +
        ' Use the <b>In more than one</b> chip to see them.</div>';
    }

    var held = num(D.items_held_back);
    var total = num(D.items_total);
    h += '<div class="wla-note">' +
      'Showing <b>' + cnt(items.length) + '</b> listing' + (items.length === 1 ? '' : 's') +
      (total != null ? ' of ' + cnt(total) + ' that match' : '') +
      (WL.q ? ' for "' + esc(WL.q) + '"' : '') +
      (WL.account ? ' on ' + esc(WL.account) : ' across all accounts') + '. ' +
      (held != null && held > 0
        ? '<b>' + cnt(held) + ' more ' + (held === 1 ? 'listing is' : 'listings are') + ' not on this page.</b> ' +
          'Narrow it with the search box, an account or a chip to reach them.'
        : 'Every listing that matches is on this page.') +
      ' Active listings only. Nothing on this page is ever sent to eBay.' +
      /* the three chips must add up to the active listing count, and the engine counts that again
         straight from the listing table. If the two ever disagree the page says so rather than
         quietly showing a short list as though it were the whole shop. */
      (function () {
        var a = num(C.active), real = num(D.active_counted);
        if (WL.q || a == null || real == null || a === real) return '';
        return ' <b>The chips cover ' + cnt(a) + ' listings and there are ' + cnt(real) +
          ' active, so ' + cnt(real - a) + ' did not come back in this read.</b>';
      })() +
      (D.computed_at ? ' Worked out at ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC.' : '') +
      '</div>';

    h += '<div class="wla-panel"><h3>Active listings and their campaigns</h3>' +
      '<div class="wla-sub">Where each listing is advertising right now, and what it has spent over the last 3 and 7 days.</div>';
    if (!items.length) {
      h += '<div class="wla-empty">' + (WL.q || WL.state || WL.account
        ? 'No active listing matches. Try a different search, chip or account.'
        : 'No active listing came back.') + '</div></div>';
      $('wlaBody').innerHTML = h;
      return;
    }
    h += '<div class="wla-scroll"><table class="wla-tbl"><thead><tr>' +
      '<th>Listing</th><th>Right now</th><th class="r">Price</th><th class="r">Sold 30 d</th>' +
      '<th class="r">Spend 3 d</th><th class="r">Spend 7 d</th><th>Campaigns it is in</th>' +
      '</tr></thead><tbody>' + items.map(row).join('') + '</tbody></table></div></div>';

    $('wlaBody').innerHTML = h;
  }
})();
