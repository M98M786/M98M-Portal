/* view-adtool-cpc.js — Advertising Tool · CPC listings (owner's brief, 27 Sep 2026: two NEW pages —
 * "CPC Active Listings" and "CPC Post Listings"). One view, a mode toggle: Active shows every listing
 * with a live cost-per-click ad; Post shows listings whose CPC ad is paused, archived or ended and how
 * they did after it stopped. Both carry the product cell (image, name, id, eBay link, account), the
 * period bar, account chips, a sortable table with every column the brief lists, and a period-comparison
 * graph (this window vs the previous comparable one, per metric). Profit appears per listing only, under
 * the Sales Analysis law — no collective profit. avg CPC / CVR / ROAS / ACoS print "—" when their
 * denominator is zero. "Sold since listed" is labelled exactly so (eBay Quantity − QuantityAvailable,
 * resets on a quantity revision — never "total sold"). Hidden; flag adtool_page_cpc. The page refreshes
 * every 5 minutes only while the window reaches into today. Nothing here is sent to eBay.
 * Galaxy tokens only, gold the accent, #e0563f the loss colour. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var CP = { mode: 'active', account: '', period: null, accounts: [], data: null, sort: { key: 'spend', dir: -1 } };

  VIEW_CSS.push([
    '.cpc-wrap{max-width:1360px}',
    '.cpc-mode{display:flex;gap:0;border:1px solid var(--gold-line);border-radius:10px;overflow:hidden;margin:0 0 12px;width:max-content}',
    '.cpc-mode button{background:var(--panel);border:0;border-right:1px solid var(--gold-line);color:var(--text-2);padding:7px 16px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}',
    '.cpc-mode button:last-child{border-right:0}',
    '.cpc-mode button.on{color:var(--gold-ink);background:var(--gold-b);font-weight:800}',
    '.cpc-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.cpc-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.cpc-tile{flex:1 1 130px;border:1px solid var(--gold-line);border-radius:12px;padding:9px 13px;background:var(--panel-2)}',
    '.cpc-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.cpc-tile .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.cpc-tile.gold .v{color:var(--gold-a)}.cpc-tile.loss .v{color:' + LOSS + '}',
    '.cpc-tile .d{font-size:11px;color:var(--text-2);margin-top:2px}',
    '.cpc-cmp{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}@media(max-width:900px){.cpc-cmp{grid-template-columns:1fr}}',
    '.cpc-cmp-card{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel)}',
    '.cpc-cmp-card h4{margin:0 0 2px;font-size:12px;font-weight:800;color:var(--text)}',
    '.cpc-cmp-card .sub{font-size:11px;color:var(--text-2);margin-bottom:4px}',
    '.cpc-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}',
    '.cpc-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.cpc-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap;cursor:pointer;user-select:none}',
    '.cpc-tbl th.r{text-align:right}.cpc-tbl th .ar{color:var(--gold-a);margin-left:3px}',
    '.cpc-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.cpc-tbl td.r{text-align:right;white-space:nowrap}',
    '.cpc-tbl tr:hover td{background:rgba(255,255,255,.03)}',
    '.cpc-cost .s{font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);font-weight:700;display:block}',
    '.cpc-sub{font-size:10.5px;color:var(--text-3)}',
    '.cpc-neg{color:' + LOSS + ';font-weight:700}.cpc-pos{color:var(--gold-a);font-weight:700}',
    '.cpc-held{display:inline-block;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2)}',
    '.cpc-held.up{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.cpc-held.down{color:#ffb3a6;border-color:rgba(224,86,63,.5)}',
    '.cpc-held.early{color:var(--text-3);border-style:dashed;text-transform:none;letter-spacing:0}',
    '.cpc-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    '.cpc-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function pct(v) { v = num(v); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
  function src(t) { return '<span class="cpc-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }
  function dayTxt(d) { d = String(d || '').slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? d : '—'; }

  /* a metric printed "—" the moment its denominator is zero — never a divide-by-nothing figure.
     the engine sends the computed value; the page falls back to the safe ratio and still prints "—". */
  function ratio(topv, botv) { var t = num(topv), b = num(botv); if (b == null || b === 0) return null; if (t == null) return null; return t / b; }
  function acosOf(r) { var v = num(r.acos); if (v != null) return v; return ratio(r.spend, r.attr_revenue); }
  function avgCpcOf(r) { var v = num(r.avg_cpc); if (v != null) return v; return ratio(r.spend, r.clicks); }
  function cvrOf(r) { var v = num(r.cvr); if (v != null) return v; return ratio(r.attr_units, r.clicks); }
  function roasOf(r) { var v = num(r.roas); if (v != null) return v; return ratio(r.attr_revenue, r.spend); }

  VIEWS.adtoolCpc = {
    label: 'CPC listings (ads)', hidden: true, order: 40, roles: ROLES,
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14h5"/>',
    render: function () {
      return '<div class="cpc-wrap">' + adtHgroup('CPC listings', 'every cost-per-click listing and exactly how it did — active now, or after the ad stopped', 'cpcFresh') +
        '<div class="cpc-mode" id="cpcMode">' +
          '<button data-m="active"' + (CP.mode === 'active' ? ' class="on"' : '') + '>CPC active</button>' +
          '<button data-m="post"' + (CP.mode === 'post' ? ' class="on"' : '') + '>CPC post</button>' +
        '</div>' +
        '<div id="cpcBar"></div><div id="cpcAcct" class="an-filters"></div>' +
        '<div id="cpcBody"><div class="cpc-empty">Reading the window…</div></div></div>';
    },
    init: function () {
      try { var m = localStorage.getItem('m98m:adtCpcMode'); if (m === 'active' || m === 'post') CP.mode = m; } catch (e) {}
      modeButtons();
      CP.period = adtPeriodBar('cpcBar', { page: 'adtoolCpc', def: 'd30', onChange: function (v) { CP.period = v; load(false); } });
      acctChips();
      load(false).catch(function () {});
    }
  };

  function modeButtons() {
    var el = $('cpcMode'); if (!el) return;
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-m') === CP.mode);
      bs[i].onclick = function () {
        var m = this.getAttribute('data-m'); if (m === CP.mode) return;
        CP.mode = m; try { localStorage.setItem('m98m:adtCpcMode', m); } catch (e) {}
        CP.sort = m === 'post' ? { key: 'last_active_day', dir: -1 } : { key: 'spend', dir: -1 };
        modeButtons(); load(false);
      };
    }
  }
  function acctChips() {
    var el = $('cpcAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (CP.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      CP.accounts.map(function (a) { return '<button class="' + (CP.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { CP.account = this.getAttribute('data-a'); acctChips(); load(false); };
  }
  function load(quiet) {
    var p = adtPeriodParams(CP.period); p.mode = CP.mode; if (CP.account) p.account = CP.account;
    return api('adtoolCpcListings', p).then(function (d) {
      CP.data = d || {};
      var names = (d && d.accounts) || [];
      if (names.length) { CP.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean); acctChips(); }
      if (!$('cpcBody')) return;
      draw();
      adtPeriodEcho('cpcBar', d && d.period); adtFreshShow('cpcFresh', d && d.fresh);
      /* a window into today moves every 5 minutes; a finished window does not. adtPoll skips hidden
         tabs and stops on an 'auth' refusal (the session-expiry law). */
      if (adtIncludesToday(d && d.period, CP.period)) { adtPoll('cpcBody', 300000, function () { return load(true); }); } else { adtPollStop('cpcBody'); }
    }).catch(function (e) {
      if (!quiet && $('cpcBody')) $('cpcBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'the CPC listings could not be read') + '</div></div>';
      throw e;
    });
  }

  function draw() {
    var D = CP.data, rows = (D.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    var post = CP.mode === 'post';
    var h = '';
    var P = D.period, when = P && (P.label || P.from) ? adtPeriodText(P) : 'the window';
    h += '<div class="cpc-top"><span><b>' + (post ? 'CPC post' : 'CPC active') + '</b></span><span>·</span><span>' + esc(when) + '</span><span>·</span><span>' + esc(CP.account || 'all accounts') + '</span><span>·</span><span>' + rows.length + ' listing' + (rows.length === 1 ? '' : 's') + '</span>' + src('cpc listings') + '</div>';
    h += totalsTiles(D);
    h += comparePanel(D);
    h += '<div class="cpc-note">' + (post
      ? '<b>CPC post.</b> Listings whose cost-per-click ad is now paused, archived or ended — and how the listing did around the day the ad stopped. <b>Before</b> is the ad\'s own last window; <b>after</b> is all-channel sales since. A listing whose sales held after the ad stopped was carrying ad spend it may not have needed; one whose sales fell relied on the ad. <b>Sales</b> compares units <i>per day</i> — since the stop against while advertised — and reads "held" at 60 % of the advertised rate or better; under 7 days since the stop it is too early to tell. "Last active" is the ad\'s last status event; before 18 Sep there is no event, so it reads "date unknown". Listings currently CPC-active are excluded — they are on the Active tab.'
      : '<b>CPC active.</b> Every listing with an ACTIVE ad in a RUNNING cost-per-click campaign. Ads are counted by eBay\'s report day (UTC); all-channel orders and units by the UK day. Impressions exist only from 18 Sep, so an earlier window shows "—". Profit is the listing\'s own figure under the Sales Analysis law; there is no collective profit. avg CPC, CVR, ROAS and ACoS read "—" when their denominator is zero.') +
      ' The lever a hand can move is the campaign\'s daily budget (eBay exposes no per-click bid). Nothing on this page is sent to eBay.</div>';

    var cols = post ? POST_COLS : ACTIVE_COLS;
    var shown = rows.slice().sort(sorter(cols));
    if (!shown.length) {
      h += '<div class="cpc-empty">' + (post ? 'No listing has left a CPC ad in this window.' : 'No listing has a live cost-per-click ad right now.') + '</div>';
    } else {
      h += '<div class="an-scroll"><table class="cpc-tbl"><thead><tr>' + cols.map(function (c) {
        var on = CP.sort.key === c.key;
        return '<th class="' + (c.cls || '') + '" data-k="' + esc(c.key) + '" title="' + esc(c.title || c.label) + '">' + esc(c.label) + (on ? '<span class="ar">' + (CP.sort.dir < 0 ? '▼' : '▲') + '</span>' : '') + (c.src ? src(c.src) : '') + '</th>';
      }).join('') + '</tr></thead><tbody>' +
        shown.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    }
    h += '<div class="cpc-sub" style="margin-top:8px">' + esc(D.source || '') + (D.computed_at ? ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC' : '') + '</div>';
    $('cpcBody').innerHTML = h;
    var ths = document.querySelectorAll('#cpcBody th[data-k]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-k');
      if (CP.sort.key === k) { CP.sort.dir = -CP.sort.dir; } else { CP.sort.key = k; CP.sort.dir = k === 'listing' || k === 'listing_date' ? 1 : -1; }
      draw();
    };
  }

  /* the collective tiles the brief asks for — spend, attributed sales, ROAS, clicks, avg CPC, CVR;
     NO profit at this collective level (profit lives on each item row only). */
  function totalsTiles(D) {
    var T = D.totals || null;
    if (!T) {
      var rows = D.rows || [], s = 0, v = 0, c = 0, au = 0; rows.forEach(function (r) { s += num(r.spend) || 0; v += num(r.attr_revenue) || 0; c += num(r.clicks) || 0; au += num(r.attr_units) || 0; });
      T = s > 0 || c > 0 ? { spend: s, attr_revenue: v, clicks: c, attr_units: au, roas: ratio(v, s), avg_cpc: ratio(s, c), cvr: ratio(au, c) } : null;
    }
    if (!T) return '';
    var roas = num(T.roas); if (roas == null) roas = ratio(T.attr_revenue, T.spend);
    var acpc = num(T.avg_cpc); if (acpc == null) acpc = ratio(T.spend, T.clicks);
    var cvr = num(T.cvr); if (cvr == null) cvr = ratio(T.attr_units, T.clicks);
    function tile(k, v, d, cls) { return '<div class="cpc-tile ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="d">' + esc(d) + '</div></div>'; }
    return '<div class="cpc-tiles">' +
      tile('Spend', gbp0(T.spend), (num(T.orders) != null ? cnt(T.orders) + ' orders' : 'ad spend'), 'gold') +
      tile('Attributed sales', gbp0(T.attr_revenue), cnt(T.attr_units) + ' ad units', '') +
      tile('ROAS', roasTxt(roas), 'attributed ÷ spend', roas != null && roas < 1 ? 'loss' : 'gold') +
      tile('Clicks', cnt(T.clicks), 'cost-per-click', '') +
      tile('Avg CPC', gbp(acpc), acpc == null ? 'no clicks' : 'spend ÷ clicks', '') +
      tile('CVR', pct(cvr), cvr == null ? 'no clicks' : 'ad units ÷ clicks', '') +
      '</div>';
  }

  /* period-comparison graph: this window vs the previous comparable one, per metric. Money and a ratio
     do not share a scale, so each metric is its own two-bar chart (now vs prev) with its own formatter. */
  function comparePanel(D) {
    var T = D.totals, prev = D.prev;
    if (!T || !prev) return '';
    var Pn = D.period, plabel = Pn && Pn.label ? String(Pn.label).replace(/ \(.*\)$/, '') : 'this window';
    var metrics = [
      { key: 'spend', title: 'Spend', fmt: function (v) { return chartMoney(v); } },
      { key: 'attr_revenue', title: 'Attributed sales', fmt: function (v) { return chartMoney(v); } },
      { key: 'roas', title: 'ROAS', fmt: function (v) { return (Math.round(v * 100) / 100) + '×'; }, ratio: ['attr_revenue', 'spend'] }
    ];
    var cards = metrics.map(function (m) {
      var now = m.ratio ? ratio(T[m.ratio[0]], T[m.ratio[1]]) : num(T[m.key]);
      var was = m.ratio ? ratio(prev[m.ratio[0]], prev[m.ratio[1]]) : num(prev[m.key]);
      var pts = [
        { label: plabel, value: now || 0, strong: true, title: m.title + ' ' + plabel + ': ' + m.fmt(now || 0) },
        { label: 'previous', value: was || 0, title: m.title + ' previous: ' + m.fmt(was || 0) }
      ];
      var d = (now != null && was != null && was !== 0) ? (now - was) / Math.abs(was) : null;
      var good = m.key === 'spend' ? 0 : 1; /* spend up is neither win nor loss on its own */
      var arrow = d == null ? '' : (d > 0.0005 ? '▲' : (d < -0.0005 ? '▼' : '■'));
      var red = d != null && ((good > 0 && d < 0));
      var sub = d == null ? 'no previous window to compare' : m.fmt(now || 0) + ' vs ' + m.fmt(was || 0) + ' · <span class="' + (red ? 'cpc-neg' : (d > 0 && good > 0 ? 'cpc-pos' : '')) + '">' + arrow + ' ' + pct(Math.abs(d)) + '</span>';
      return '<div class="cpc-cmp-card"><h4>' + esc(m.title) + '</h4><div class="sub">' + sub + '</div>' +
        chartBars(pts, { height: 120, fmt: m.fmt, minGap: 0 }) + '</div>';
    }).join('');
    return '<div class="cpc-cmp">' + cards + '</div>';
  }

  function sorter(cols) {
    var key = CP.sort.key, dir = CP.sort.dir;
    var col = null; for (var i = 0; i < cols.length; i++) if (cols[i].key === key) { col = cols[i]; break; }
    var val = col && col.sortVal ? col.sortVal : function (r) { return num(r[key]); };
    return function (a, b) {
      var va = val(a), vb = val(b);
      if (typeof va === 'string' || typeof vb === 'string') { va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase(); return va < vb ? -dir : (va > vb ? dir : 0); }
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; /* nulls sink */
      return (va - vb) * dir;
    };
  }

  function costCell(r) {
    var c = r.product_cost || {}; var v = num(c.value);
    return '<div class="cpc-cost">' + (v == null ? '—' : gbp(v)) + '<span class="s">' + esc(c.source || (v == null ? 'not costed' : '')) + '</span></div>';
  }
  function profitCell(r) { return adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders); }
  function impCell(r) { var v = num(r.impressions); return v == null ? '<span class="cpc-sub">—</span>' : cnt(v); }
  function unitsWindow(r) {
    return '<span title="all-channel units — 7 / 14 / 30 days to the window end">' + cnt(r.units_7d) + ' · ' + cnt(r.units_14d) + ' · ' + cnt(r.units_30d) + '</span>';
  }
  /* Sale-event fields (Phase 5): observed membership + when eligible again. Null → "—". */
  function inSaleCell(r) {
    if (r.in_sale == null) return '<span class="cpc-sub">—</span>';
    return r.in_sale ? '<span class="cpc-pos">YES</span>' : '<span class="cpc-sub">NO</span>';
  }
  function eligibleCell(r) {
    return r.eligible_on ? '<span class="cpc-sub">' + dayTxt(r.eligible_on) + '</span>' : '<span class="cpc-sub">—</span>';
  }

  var ACTIVE_COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'listing_date', label: 'Listed', cell: function (r) { return '<span class="cpc-sub">' + dayTxt(r.listing_date) + '</span>'; }, sortVal: function (r) { return dayTxt(r.listing_date); } },
    { key: 'sold_since_listed', label: 'Sold since listed', cls: 'r', src: 'items sync', title: 'eBay Quantity − QuantityAvailable; resets on a quantity revision — not a lifetime total', cell: function (r) { return cnt(r.sold_since_listed); } },
    { key: 'units_30d', label: 'Sold 7·14·30 d', cls: 'r', title: 'all-channel units — 7 / 14 / 30 days to the window end', cell: unitsWindow },
    { key: 'product_cost', label: 'Product cost', cls: 'r', src: 'items sync', cell: costCell, sortVal: function (r) { return num(r.product_cost && r.product_cost.value); } },
    { key: 'spend', label: 'Spend', cls: 'r', cell: function (r) { return gbp(r.spend); } },
    { key: 'clicks', label: 'Clicks', cls: 'r', cell: function (r) { return cnt(r.clicks); } },
    { key: 'attr_units', label: 'Ad sales', cls: 'r', title: 'attributed units · attributed revenue', cell: function (r) { return cnt(r.attr_units) + '<div class="cpc-sub">' + gbp(r.attr_revenue) + '</div>'; } },
    { key: 'impressions', label: 'Impr.', cls: 'r', title: 'impressions (from 18 Sep only)', cell: impCell },
    { key: 'acos', label: 'ACoS', cls: 'r', title: 'spend ÷ attributed revenue', cell: function (r) { return pct(acosOf(r)); }, sortVal: acosOf },
    { key: 'avg_cpc', label: 'Avg CPC', cls: 'r', title: 'spend ÷ clicks', cell: function (r) { return gbp(avgCpcOf(r)); }, sortVal: avgCpcOf },
    { key: 'cvr', label: 'CVR', cls: 'r', title: 'attributed units ÷ clicks', cell: function (r) { return pct(cvrOf(r)); }, sortVal: cvrOf },
    { key: 'roas', label: 'ROAS', cls: 'r', title: 'attributed revenue ÷ spend', cell: function (r) { var v = roasOf(r); return '<span class="' + (v != null ? (v < 1 ? 'cpc-neg' : 'cpc-pos') : '') + '">' + roasTxt(v) + '</span>'; }, sortVal: roasOf },
    { key: 'actual_profit', label: 'Profit (law)', cls: 'r', src: 'orders', title: 'this listing under the Sales Analysis law', cell: profitCell, sortVal: function (r) { return num(r.actual_profit); } },
    { key: 'in_sale', label: 'In sale event', cls: 'r', src: 'sale events', title: 'Currently in a running Sale Event — observed at one-day granularity; whole-shop events auto-enrol', cell: inSaleCell, sortVal: function (r) { return r.in_sale ? 1 : 0; } },
    { key: 'eligible_on', label: 'Eligible on', cls: 'r', src: 'sale events', title: 'Eligible for a Sale Event again on this date (after the 14-day restriction)', cell: eligibleCell, sortVal: function (r) { return r.eligible_on || ''; } },
    { key: 'lever', label: 'Lever', cell: function (r) { return adtLeverLine(r.lever, r.who); }, sortVal: function (r) { return String(r.lever && r.lever.kind || ''); } }
  ];

  /* CPC post: before the ad stopped vs after, and whether sales held — judged on per-day units RATES, never on
     the raw totals: the before window is 30 days and the after window is only what has elapsed since the stop
     (0..30 days), so totals would stamp every recent stop "fell". Under 7 days after the stop there is not enough
     to judge: "too early". The engine's verdict (adtCpcHeld: held / fell / too early / no sales either side, with
     before.units_per_day and after.units_per_day) wins when it sends one; the ratio of the two rates is the sort key. */
  function daysIn(w, fallback) {
    if (!w || typeof w !== 'object') return fallback == null ? null : fallback;
    var d = num(w.days); if (d != null) return Math.max(0, d);
    var a = String(w.from || '').slice(0, 10), b = String(w.to || '').slice(0, 10);
    if (!/^\d{4}-\d\d-\d\d$/.test(a) || !/^\d{4}-\d\d-\d\d$/.test(b)) return fallback == null ? null : fallback;
    var n = Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000) + 1;
    return n < 0 ? 0 : n;                                    /* from > to = the stop was yesterday: 0 days after */
  }
  function heldJudge(r) {
    var before = r.before || {}, after = r.after || {};
    var sent = String(r.held || '').toLowerCase();
    if (sent) {
      var v = /early/.test(sent) ? 'early' : (/held|up/.test(sent) ? 'held' : (/fell|down/.test(sent) ? 'fell' : (/n\/a|none|no sales/.test(sent) ? 'na' : null)));
      var brS = num(before.units_per_day), arS = num(after.units_per_day);
      return v ? { v: v, ratio: (brS != null && brS > 0 && arS != null) ? arS / brS : null, days: daysIn(after, null), rule: r.held_rule || '', br: brS, ar: arS } : null;
    }
    var bu = num(before.units != null ? before.units : before.attr_units), au = num(after.units != null ? after.units : after.attr_units);
    if (bu == null || au == null) return null;
    var bd = daysIn(before, 30), ad = daysIn(after, null);
    if (ad == null) return null;
    if (ad < 7) return { v: 'early', days: ad };
    if (!bd || bu === 0) return { v: 'na' };
    var br = bu / bd, ar = au / ad;
    return { v: ar >= br * 0.6 ? 'held' : 'fell', ratio: ar / br, days: ad, br: br, ar: ar };
  }
  function rate(v) { return v == null ? '—' : (Math.round(v * 100) / 100) + '/day'; }
  function heldCell(r) {
    var j = heldJudge(r);
    if (!j) return '<span class="cpc-held">—</span>';
    if (j.v === 'na') return '<span class="cpc-held" title="no units while advertised or since — nothing to hold">n/a</span>';
    if (j.v === 'early') return '<span class="cpc-held early" title="under 7 days since the ad stopped — not enough to judge">too early' + (j.days != null ? ' (' + Math.round(j.days) + ' d)' : '') + '</span>';
    var t = j.rule || (j.br != null ? 'since the stop ' + rate(j.ar) + ' vs ' + rate(j.br) + ' while advertised (units per day over ' + Math.round(j.days) + ' d after)' : '');
    return '<span class="cpc-held ' + (j.v === 'held' ? 'up' : 'down') + '"' + (t ? ' title="' + esc(t) + '"' : '') + '>' + (j.v === 'held' ? 'held' : 'fell') + '</span>';
  }
  function beforeCell(r) { var b = r.before || {}; return '<div class="cpc-sub">spend ' + gbp(b.spend) + '</div>' + cnt(b.attr_units) + ' units · ' + gbp0(b.attr_revenue) + '<div>' + adtProfitCell(b.actual_profit, b.pending_cost_orders, b.pending_fee_orders) + '</div>'; }
  function afterCell(r) { var a = r.after || {}; var u = a.units != null ? a.units : a.attr_units; return cnt(u) + ' units · ' + gbp0(a.revenue != null ? a.revenue : a.attr_revenue) + '<div>' + adtProfitCell(a.actual_profit, a.pending_cost_orders, a.pending_fee_orders) + '</div>'; }

  var POST_COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'last_active_day', label: 'Last active', cls: 'r', title: 'the ad\'s last status event; "—" before 18 Sep', cell: function (r) { return r.last_active_day ? '<span class="cpc-sub">' + dayTxt(r.last_active_day) + '</span>' : '<span class="cpc-sub" title="before event tracking">date unknown</span>'; }, sortVal: function (r) { return dayTxt(r.last_active_day); } },
    { key: 'sold_since_listed', label: 'Sold since listed', cls: 'r', src: 'items sync', title: 'eBay Quantity − QuantityAvailable; resets on a quantity revision — not a lifetime total', cell: function (r) { return cnt(r.sold_since_listed); } },
    { key: 'units_30d', label: 'Sold 7·14·30 d', cls: 'r', title: 'all-channel units — 7 / 14 / 30 days to the window end', cell: unitsWindow },
    { key: 'product_cost', label: 'Product cost', cls: 'r', src: 'items sync', cell: costCell, sortVal: function (r) { return num(r.product_cost && r.product_cost.value); } },
    { key: 'before', label: 'While advertised', cls: 'r', title: 'the ad\'s own last window', cell: beforeCell, sortVal: function (r) { return num(r.before && r.before.spend); } },
    { key: 'after', label: 'Since it stopped', cls: 'r', title: 'all-channel sales after the ad stopped', cell: afterCell, sortVal: function (r) { return num(r.after && (r.after.units != null ? r.after.units : r.after.attr_units)); } },
    { key: 'held', label: 'Sales', cls: 'r', title: 'did all-channel sales hold after the ad stopped? per-day units rate since the stop vs while advertised; too early under 7 days', cell: heldCell, sortVal: function (r) { var j = heldJudge(r); return j && j.ratio != null ? j.ratio : null; } },
    { key: 'actual_profit', label: 'Profit now (law)', cls: 'r', src: 'orders', title: 'the listing now, under the Sales Analysis law', cell: profitCell, sortVal: function (r) { return num(r.actual_profit); } }
  ];
})();
