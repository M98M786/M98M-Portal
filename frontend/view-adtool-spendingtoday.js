/* view-adtool-spendingtoday.js — Advertising · Listings spending today (owner's Change Spec,
 * 28 Oct 2026: "Listings Spending Today (leaves Overview; adds last 3/7/14-day spend beside today)").
 *
 * The table that used to sit at the foot of the overview, given a page of its own. Overview no
 * longer carries it, so this is its one home: every listing with an ad reading today, biggest spend
 * first, what it has spent over the last 3, 7 and 14 finished days beside it, and what it has done
 * for that money. Sort on any heading.
 *
 * Profit is each listing's own, never a total, under the Sales Analysis law, and the orders that
 * cannot be costed yet are counted beside it rather than quietly left out of the figure. Today's ad
 * figures are still arriving while the page is open, so the page says so and re-reads every five
 * minutes. Read-only: nothing here is ever sent to eBay. Galaxy tokens only, gold the accent,
 * #e0563f the loss colour. Engine action: adtoolCommand. Own class prefix: .stn-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var ST = { account: '', data: null, sort: { key: 'spend', dir: -1 }, accounts: [], busy: false };

  VIEW_CSS.push([
    '.stn-wrap{max-width:1480px}',
    '.stn-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.stn-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font:inherit;font-size:11.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.stn-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.stn-chip .n{opacity:.75;margin-left:6px;font-variant-numeric:tabular-nums}',
    '.stn-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.stn-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.stn-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.stn-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.stn-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.stn-tbl th.s{cursor:pointer;user-select:none}.stn-tbl th.s:hover{color:var(--gold-a)}',
    '.stn-tbl th.r{text-align:right}.stn-tbl th .ar{color:var(--gold-a);margin-left:3px}',
    '.stn-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.stn-tbl td.r{text-align:right;white-space:nowrap}',
    '.stn-tbl tr:hover td{background:rgba(255,255,255,.03)}',
    '.stn-scroll{overflow-x:auto}',
    '.stn-up{color:' + LOSS + ';font-weight:800}.stn-down{color:var(--gold-a);font-weight:800}',
    '.stn-sm{font-size:11px;color:var(--text-2);line-height:1.5}.stn-sm b{color:var(--text)}',
    '.stn-sm2{font-size:10.5px;color:var(--text-3);line-height:1.45}',
    '.stn-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.55}',
    '.stn-note b{color:var(--text)}',
    '.stn-empty{color:var(--text-3);font-size:13px;padding:10px 0}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function n0(n) { var v = num(n); return v == null ? 0 : v; }
  function plural(n, one, many) { return Math.round(n0(n)) === 1 ? one : many; }
  function pctTxt(v) { v = num(v); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }

  /* the averages carry more than one name across the payloads this page has seen; one reader for
     all of them, so a renamed field never turns into a silent blank */
  function avgOf(r) {
    if (r.avg_spend_active_day_28 !== undefined) return num(r.avg_spend_active_day_28);
    if (r.spend_avg28 !== undefined) return num(r.spend_avg28);
    if (r.avg28 !== undefined) return num(r.avg28);
    return num(r.spend_28d_avg);
  }

  VIEWS.adtoolSpendingToday = {
    label: 'Listings spending today', hidden: true, order: 98, roles: ROLES,
    icon: '<path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="11" width="3" height="6"/><rect x="13" y="7" width="3" height="10"/>',
    render: function () {
      return '<div class="stn-wrap">' +
        adtHgroup('Listings spending today', 'Every listing with an ad reading today, biggest spend first', 'stnFresh') +
        '<div id="stnAcct" class="stn-chips"></div>' +
        '<div id="stnBody"><div class="stn-empty">Loading…</div></div></div>';
    },
    init: function () {
      acctChips();
      load(false).catch(function () {});
      /* today moves while the page is open; adtPoll skips hidden tabs and stops for good on an
         'auth' refusal (the session-expiry law) */
      adtPoll('stnBody', 300000, function () { return load(true); });
    }
  };

  function load(quiet) {
    if (ST.busy) return Promise.resolve();
    ST.busy = true;
    return api('adtoolCommand', ST.account ? { account: ST.account } : {}).then(function (D) {
      ST.busy = false;
      ST.data = D || {};
      var names = ((ST.data.totals_by_account) || []).map(function (a) { return a && a.account; }).filter(function (a) { return a && a !== 'all'; });
      if (names.length) { ST.accounts = names; }
      if (!$('stnBody')) return;
      acctChips();
      draw();
      adtFreshShow('stnFresh', ST.data.fresh);
    }).catch(function (e) {
      ST.busy = false;
      if (!quiet && $('stnBody')) {
        $('stnBody').innerHTML = '<div class="stn-panel"><h3>Not available</h3><div class="stn-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }

  function rows() {
    return ((ST.data && ST.data.items_today) || []).filter(function (r) { return r && typeof r === 'object'; });
  }
  function acctChips() {
    var el = $('stnAcct'); if (!el) return;
    /* EVERY account, not only the one chosen: a chip re-asks the engine, and the answer it sends
       back then names only that account, so a list built from the answer alone would strand the
       reader on whichever account they picked first */
    el.innerHTML = '<button class="stn-chip' + (ST.account ? '' : ' on') + '" data-sta="">All accounts</button>' +
      ST.accounts.map(function (a) {
        return '<button class="stn-chip' + (ST.account === a ? ' on' : '') + '" data-sta="' + esc(a) + '">' + esc(a) + '</button>';
      }).join('');
    var bs = el.querySelectorAll('[data-sta]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      ST.account = this.getAttribute('data-sta') || '';
      acctChips();
      load(false).catch(function () {});
    };
  }

  /* the three windows the spec adds beside today. They are FINISHED days, so they never move while
     the page is open, and they are only on the page when the answer actually carries them: three
     columns of dashes read as "spent nothing", which is the one thing they must not say. */
  function haveWindows(R) {
    return R.some(function (r) { return num(r.spend_3d) != null || num(r.spend_7d) != null || num(r.spend_14d) != null; });
  }

  var BASE_COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'spend', label: 'Spend today', cls: 'r', cell: function (r) { return gbp(r.spend); }, sortVal: function (r) { return num(r.spend); } }
  ];
  /* THE THREE WINDOWS ARE NULLABLE PER ROW. A listing the back-window read did not reach carries
     null, and £0.00 in a money column is a figure: it says this listing spent nothing over the last
     three days, which is the opposite claim. "no data" is the only honest cell. */
  function winCell(v) {
    return num(v) == null ? '<span class="stn-sm2">no data</span>' : gbp(v);
  }
  var WINDOW_COLS = [
    { key: 'spend_3d', label: 'Spend 3 d', cls: 'r', title: 'ad spend over the last 3 finished days', cell: function (r) { return winCell(r.spend_3d); }, sortVal: function (r) { return num(r.spend_3d); } },
    { key: 'spend_7d', label: 'Spend 7 d', cls: 'r', title: 'ad spend over the last 7 finished days', cell: function (r) { return winCell(r.spend_7d); }, sortVal: function (r) { return num(r.spend_7d); } },
    { key: 'spend_14d', label: 'Spend 14 d', cls: 'r', title: 'ad spend over the last 14 finished days', cell: function (r) { return winCell(r.spend_14d); }, sortVal: function (r) { return num(r.spend_14d); } }
  ];
  var REST_COLS = [
    { key: 'spend_vs_avg', label: 'vs 28-day avg', cls: 'r', title: 'today against what this listing usually spends on a day it runs', cell: vsCell, sortVal: function (r) {
        var sp = num(r.spend), av = avgOf(r), sent = num(r.spend_vs_avg);
        if (sent != null) return sent;
        return (av != null && av > 0 && sp != null) ? sp / av : null;
      } },
    { key: 'clicks', label: 'Clicks', cls: 'r', cell: function (r) { return cnt(r.clicks); }, sortVal: function (r) { return num(r.clicks); } },
    { key: 'attr_units', label: 'Units from ads', cls: 'r', cell: function (r) { return cnt(r.attr_units); }, sortVal: function (r) { return num(r.attr_units); } },
    { key: 'orders', label: 'Orders', cls: 'r', title: 'orders on this listing today, from every channel', cell: function (r) { return cnt(r.orders); }, sortVal: function (r) { return num(r.orders); } },
    { key: 'actual_profit', label: 'Profit', cls: 'r', title: 'this listing on its own, over the orders we can already cost', cell: function (r) {
        return adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders, r.unpriced_orders);
      }, sortVal: function (r) { return num(r.actual_profit); } },
    { key: 'spend_share', label: 'Share of today', cls: 'r', title: 'this listing\'s share of all the money spent today', cell: shareCell, sortVal: shareOf }
  ];

  function vsCell(r) {
    var sp = num(r.spend), av = avgOf(r);
    if (av == null && sp != null && sp > 0) return '<span class="stn-up">▲ new</span><div class="stn-sm2">no day like it in the last 28</div>';
    if (av == null || sp == null) return '<span class="stn-sm2">—</span>';
    if (av <= 0) return sp > 0 ? '<span class="stn-up">▲ new</span>' : '<span class="stn-sm2">—</span>';
    var d = (sp - av) / av;
    var cls = d > 0.15 ? 'stn-up' : (d < -0.15 ? 'stn-down' : '');
    return '<span class="' + cls + '">' + (d >= 0 ? '▲ +' : '▼ −') + Math.round(Math.abs(d) * 100) + '%</span>' +
      '<div class="stn-sm2">' + gbp(av) + ' a day it runs</div>';
  }
  function shareOf(r) {
    if (num(r.spend_share) != null) return num(r.spend_share);
    if (num(r.share_spend) != null) return num(r.share_spend);
    var tot = num(ST.data && ST.data.spend_today), sp = num(r.spend);
    return (tot != null && tot > 0 && sp != null) ? sp / tot : null;
  }
  function shareCell(r) { return pctTxt(shareOf(r)); }

  function columns(R) {
    return BASE_COLS.concat(haveWindows(R) ? WINDOW_COLS : []).concat(REST_COLS);
  }
  function colOf(cols, k) { for (var i = 0; i < cols.length; i++) if (cols[i].key === k) return cols[i]; return null; }
  function sorter(cols) {
    var col = colOf(cols, ST.sort.key), dir = ST.sort.dir;
    var val = (col && col.sortVal) ? col.sortVal : function (r) { return num(r[ST.sort.key]); };
    return function (a, b) {
      var va = val(a), vb = val(b);
      if (typeof va === 'string' || typeof vb === 'string') {
        va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase();
        return va < vb ? -dir : (va > vb ? dir : 0);
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1; if (vb == null) return -1;      /* nulls sink whichever way we sort */
      return (va - vb) * dir;
    };
  }

  /* ── 1 · ONE subtitle line, then the table. The owner's layout (p10-01) is a title, a single
     line under it and the rows: the five tiles that used to sit here are gone with it. Their
     "Spent today" was the Overview's "Today so far" spend under a second name on a second page,
     and the other four were sums of the columns underneath them. */
  function note(R) {
    var D = ST.data || {};
    var total = num(D.items_today_total);
    var held = (total != null) ? Math.max(0, total - R.length) : null;
    var sampled = R.filter(function (r) { return num(r.spend) != null; }).length;
    var orderOnly = R.length - sampled;
    var h = '<div class="stn-note"><b>' + cnt(sampled) + '</b> ' + plural(sampled, 'listing has', 'listings have') +
      ' an ad reading today' + (orderOnly ? ' and <b>' + cnt(orderOnly) + '</b> more only sold' : '') +
      (ST.account ? ' on ' + esc(ST.account) : ' across all accounts') +
      (held != null && held > 0 ? ', showing the <b>' + cnt(R.length) + '</b> biggest spenders' : '') + '. ';
    h += D.ads_sampled === false
      ? 'No ad figures have come from eBay yet today, so these rows are orders only. '
      : 'Ad figures are still updating through the day. ';
    if (!haveWindows(R)) {
      h += 'Spend over the last 3, 7 and 14 days is not in this answer yet, so those columns are off the page rather than reading as nothing spent. ';
    }
    h += 'Profit is each listing\'s own, over the orders we can already cost.';
    return h + '</div>';
  }

  /* ── 3 · the table ────────────────────────────────────────────────────────────────────────── */
  function tablePanel(R) {
    var cols = columns(R);
    var h = '<div class="stn-panel"><h3>The listings</h3>' +
      '<div class="stn-sub">Biggest spend first. Sort on any column by clicking its heading. Each row opens its own Product history.</div>';
    if (!R.length) {
      return h + '<div class="stn-empty">No ad figures from eBay yet today' + (ST.account ? ' on ' + esc(ST.account) : '') +
        '. They start arriving in the morning, UK time.</div></div>';
    }
    var shown = R.slice().sort(sorter(cols));
    h += '<div class="stn-scroll"><table class="stn-tbl"><thead><tr>' + cols.map(function (c) {
      var on = ST.sort.key === c.key;
      return '<th class="s ' + (c.cls || '') + '" data-stk="' + esc(c.key) + '" title="' + esc(c.title || ('Sort by ' + c.label)) + '">' +
        esc(c.label) + (on ? '<span class="ar">' + (ST.sort.dir < 0 ? '▼' : '▲') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' +
      shown.map(function (r) {
        return '<tr>' + cols.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
    return h;
  }

  /* ── draw and wire ────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('stnBody'); if (!box) return;
    var D = ST.data || {}, R = rows();
    if (!D.items_today) {
      box.innerHTML = '<div class="stn-panel"><h3>Not available yet</h3><div class="stn-sub">' +
        'The answer does not carry today\'s listings, so this page has nothing to show. It is not that nothing spent today.</div></div>';
      return;
    }
    /* the page title, the account and the count all have one home each: the heading above, the
       chips above, and the one line below. The strip that repeated all three is gone. */
    var h = note(R);
    h += tablePanel(R);
    box.innerHTML = h;
    var ths = box.querySelectorAll('[data-stk]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-stk');
      if (ST.sort.key === k) { ST.sort.dir = -ST.sort.dir; }
      else { ST.sort = { key: k, dir: k === 'listing' ? 1 : -1 }; }
      draw();
    };
  }
})();
