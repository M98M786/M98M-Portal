/* view-adtool-analytics.js — Advertising Tool · Accounts, Categories, Phone cases, Time slots (spec §7, Phase 3).
 * Four hidden views (hidden:true), each behind its own preview flag (adtool_page_accounts / _categories / _cases / _slots).
 * Galaxy tokens only; gold is the only accent, #e0563f the only loss colour; headings bold. Read-only except the
 * Management-only classifier override on the Phone cases page (a taxonomy label, never anything on eBay). */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var SLOTS = ['Night 00–06', 'Morning 06–12', 'Afternoon 12–17', 'Evening 17–24'];
  VIEW_CSS.push(
    '.an-wrap{max-width:1240px}.an-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}' +
    '.an-panel h3{margin:0 0 4px;font-size:15px;font-weight:800}.an-sub{font-size:12px;color:var(--text-2);margin:0 0 10px}' +
    '.an-src{display:inline-block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:8px;vertical-align:middle;font-weight:800}.an-src.s{color:var(--gold-a);border-color:rgba(242,176,53,.4)}' +
    '.an-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px}.an-kpi{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px}' +
    '.an-kpi .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}.an-kpi .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}.an-kpi .d{font-size:11.5px;color:var(--text-2);margin-top:2px}' +
    '.an-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}.an-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);padding:6px 8px;border-bottom:1px solid var(--gold-line);font-weight:800}.an-tbl td{padding:6px 8px;border-bottom:1px solid var(--gold-line);vertical-align:top}.an-tbl td.r,.an-tbl th.r{text-align:right}' +
    '.an-pos{color:var(--gold-a)}.an-neg{color:#ffb3a6}.an-scroll{overflow-x:auto}' +
    '.an-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:900px){.an-grid2{grid-template-columns:1fr}}' +
    '.an-heat{display:grid;gap:2px;font-size:10px}.an-heat .c{height:18px;border-radius:3px;background:rgba(255,255,255,.05)}.an-heat .lab{color:var(--text-3);line-height:18px;white-space:nowrap}' +
    '.an-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.an-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.an-filters button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}' +
    '.an-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}.an-tag.gold{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.an-tag.loss{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.an-note{font-size:12.5px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:10px 12px}.an-empty{color:var(--text-3);font-size:13px;padding:6px 0}' +
    '.an-bar{height:8px;border-radius:4px;background:var(--gold-b);display:inline-block;vertical-align:middle}' +
    '.an-form{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.an-form input,.an-form select{background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:8px;padding:7px 10px;font:inherit;font-size:13px}.an-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:7px 12px;font:inherit;font-weight:800;cursor:pointer}'
  );
  /* ONE money format across the four advertising view files: thousands separated, two decimals
     unless the caller asks for fewer. The same figure must not read £1,234 on one page and
     £1234.00 on the next. This function is byte-identical in view-adtool-morning.js,
     view-adtool-overview.js and view-adtool-product.js — change one and change all four.
     Pence are for per-item money (a cost, a cap, a cost per click); a fleet or account total
     is called with 0. */
  function gbp(v, d) {
    if (v == null || v === '' || isNaN(Number(v))) return '—';
    var n = Number(v), p = d == null ? 2 : Number(d);
    return (n < 0 ? '−£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: p, maximumFractionDigits: p });
  }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'an-neg' : Number(v) > 0 ? 'an-pos' : ''); }
  /* `t` is the LOOKUP key the register box matches on and must stay stable when the wording changes;
     `shown` is what the reader sees. Rewording arg 1 silently empties the box, so reword arg 2. */
  function src(t, shown, sampled) { return '<span class="an-src' + (sampled ? ' s' : '') + '" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function pct(v) { return v == null ? '—' : Math.round(Number(v) * 100) + '%'; }
  /* The heat-map cell shade. BYTE-IDENTICAL with the copy in view-adtool-product.js: each view file is
     its own closure, so neither can see the other's, and the shared shell is not ours to add to.
     Change one and change the other. */
  function heatShade(v, mx) {
    var a = mx ? (Number(v) || 0) / mx : 0;
    return (Number(v) ? 'rgba(242,176,53,' + (0.15 + 0.85 * a).toFixed(2) + ')' : 'rgba(255,255,255,.05)');
  }
  function heat(rows, cols, get, rowLab, colLab) {
    var mx = 0; rows.forEach(function (r) { cols.forEach(function (c) { mx = Math.max(mx, get(r, c) || 0); }); });
    var h = '<div class="an-heat" style="grid-template-columns:110px repeat(' + cols.length + ',1fr)"><div class="lab"></div>' + cols.map(function (c) { return '<div class="lab" style="text-align:center">' + esc(colLab(c)) + '</div>'; }).join('');
    rows.forEach(function (r) { h += '<div class="lab">' + esc(rowLab(r)) + '</div>' + cols.map(function (c) { var v = get(r, c) || 0; return '<div class="c" title="' + esc(rowLab(r) + ' · ' + colLab(c) + ': ' + v) + '" style="background:' + heatShade(v, mx) + '"></div>'; }).join(''); });
    return h + '</div>';
  }
  function fail(id, e) { $(id).innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'This page could not load.') + '</div></div>'; }
  /* Phase 1B: every page takes the shared period bar and prints the engine's echo of the window it
     used (`period`, or the older `window`) and its freshness tag */
  function winShort(D) { var P = D.period; return P && P.label ? String(P.label).toLowerCase() : 'last 30 days'; }
  function footer(D) { var W = D.period && D.period.from ? D.period : (D.window || {}); return '<div class="an-note">Period ' + esc(W.from || '—') + ' → ' + esc(W.to || '—') + (W.includes_today ? ' · includes today, still updating' : '') + ' · computed ' + esc(String(D.computed_at || '').slice(11, 19)) + ' UTC · ' + esc(D.source || '') + '</div>'; }
  function after(barId, slotId, D) { adtPeriodEcho(barId, D.period); adtFreshShow(slotId, D.fresh); }

  /* ---------------- Accounts ---------------- */
  var AA = { acct: '', period: null };
  VIEWS.adtoolAccounts = {
    label: 'Accounts (ads)', hidden: true, order: 97, roles: ROLES, icon: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2-5 5-5h8c3 0 5 2 5 5"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Accounts', 'Every account side by side over the period you pick', 'anAccFresh') + '<div id="anAccBar"></div><div id="anAcc"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { AA.period = adtPeriodBar('anAccBar', { page: 'adtoolAccounts', def: 'd30', onChange: function (v) { AA.period = v; loadAcc(); } }); loadAcc(); }
  };
  function loadAcc() {
    api('adtoolAccounts', Object.assign({ account: AA.acct }, adtPeriodParams(AA.period))).then(function (D) {
      if (!$('anAcc')) return; after('anAccBar', 'anAccFresh', D);
      var K = D.kpi || {}; var accts = D.by_account.map(function (a) { return a.account; });
      var h = '<div class="an-filters"><button class="' + (AA.acct === '' ? 'on' : '') + '" data-a="">All accounts</button>' + accts.map(function (a) { return '<button class="' + (AA.acct === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>';
      /* account and fleet figures carry spend / sales / ROAS / CPC / CVR / orders only — profit is item-to-item, on the Product history page (owner, 27 Sep) */
      h += '<div class="an-kpis">' + [['Ad spend', gbp(K.spend, 0), (K.listings || 0) + ' listings with ad figures'], ['Units from ads', String(K.attr_units || 0), gbp(K.attr_revenue, 0) + ' sales from ads'], ['ROAS', K.spend > 0 ? roas(K.attr_revenue / K.spend) : '—', 'sales from ads ÷ spend'], ['CPC', K.clicks > 0 ? gbp(K.spend / K.clicks) : '—', (K.clicks || 0) + ' clicks'], ['Conversion rate', K.clicks > 0 ? (Math.round((K.attr_units || 0) / K.clicks * 1000) / 10) + '%' : '—', 'units from ads ÷ clicks'], ['Orders, all channels', String(K.orders || 0), (K.units || 0) + ' units · ' + gbp(K.revenue, 0)]].map(function (x) { return '<div class="an-kpi"><div class="k">' + x[0] + '</div><div class="v">' + x[1] + '</div><div class="d">' + x[2] + '</div></div>'; }).join('') + '</div>';
      var wdIdx = {}; (D.by_account_weekday || []).forEach(function (r) { wdIdx[r.account + '|' + r.weekday] = r; });
      h += '<div class="an-panel"><h3>ROAS by account × weekday' + src('eBay ads report · ' + winShort(D)) + '</h3><div class="an-sub">Sales from ads ÷ spend for each weekday, with spend per day in small print. Gold is the row\'s best day.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Account</th>' + DOW.map(function (d) { return '<th class="r">' + d + '</th>'; }).join('') + '<th>Weekday effect</th></tr></thead><tbody>' +
        D.by_account.map(function (a) { var cells = DOW.map(function (d, i) { var r = wdIdx[a.account + '|' + i]; if (!r || !Number(r.dates)) return null; var sp = Number(r.spend) || 0; return { roas: sp > 0 ? Number(r.attr_revenue) / sp : null, spend_day: sp / Number(r.dates) }; }); var best = cells.reduce(function (b, c, i) { return (c && c.roas != null && (b < 0 || c.roas > cells[b].roas)) ? i : b; }, -1); var prof = D.weekday_profiles && D.weekday_profiles.rows ? D.weekday_profiles.rows[a.account] : null; var rs = prof && prof.review_shuffle; var sig = rs ? DOW.filter(function (d) { return rs[d] && rs[d].p != null && rs[d].p < 0.05; }) : [];   /* the conclusion is printed, never the notation */ return '<tr><td>' + esc(a.account) + '</td>' + cells.map(function (c, i) { return '<td class="r' + (i === best ? ' an-pos' : '') + '" style="' + (i === best ? 'font-weight:800' : '') + '">' + (c ? roas(c.roas) + '<div class="an-empty" style="padding:0">' + gbp(c.spend_day, 0) + '/day</div>' : '—') + '</td>'; }).join('') + '<td>' + (rs ? (sig.length ? sig.join(', ') + ' genuinely better' : 'no real weekday pattern') : '—') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      h += '<div class="an-grid2"><div class="an-panel"><h3>Slot share by account' + src('orders · 28 d') + '</h3><div class="an-sub">Smoothed toward the all-account average so a thin account does not swing it. Worked out ' + esc(D.slot_profiles.day || '—') + '.</div><table class="an-tbl"><thead><tr><th>Account</th>' + SLOTS.map(function (s) { return '<th class="r">' + s.split(' ')[0] + '</th>'; }).join('') + '<th class="r">Orders</th></tr></thead><tbody>' +
        accts.map(function (a) { var p = D.slot_profiles.rows[a]; return '<tr><td>' + esc(a) + '</td>' + (p ? p.shares.map(function (s) { return '<td class="r">' + pct(s) + ' <span class="an-bar" style="width:' + Math.round(s * 60) + 'px"></span></td>'; }).join('') + '<td class="r">' + p.n + '</td>' : '<td colspan="5" class="an-empty">not enough orders yet</td>') + '</tr>'; }).join('') + '</tbody></table></div>';
      var stages = ['Launch', 'Growth', 'Plateau', 'Decline', 'Dormant', 'Dead'];
      h += '<div class="an-panel"><h3>Stage mix by account' + src('stages · ' + (D.stage_day || 'not worked out yet')) + '</h3><div class="an-sub">Where each listing sits in its life, counted on the latest day worked out.</div><table class="an-tbl"><thead><tr><th>Account</th>' + stages.map(function (s) { return '<th class="r">' + s + '</th>'; }).join('') + '</tr></thead><tbody>' +
        accts.map(function (a) { var m = D.stage_mix[a] || {}; return '<tr><td>' + esc(a) + '</td>' + stages.map(function (s) { return '<td class="r">' + (m[s] || 0) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
      h += '<div class="an-panel"><h3>Accounts, side by side' + src('eBay ads report') + '</h3><div class="an-sub">Spend, sales and return per account. Profit is never added up by account. Open a listing on <b>Product history</b> to see its own profit.</div><table class="an-tbl"><thead><tr><th>Account</th><th class="r">Listings</th><th class="r">Spend</th><th class="r">Units from ads</th><th class="r">Sales from ads</th><th class="r">ROAS</th><th class="r">CPC</th><th class="r">Conversion rate</th><th class="r">Orders</th><th class="r">Units all channels</th></tr></thead><tbody>' +
        D.by_account.map(function (a) { var ck = Number(a.clicks) || 0; return '<tr><td>' + esc(a.account) + '</td><td class="r">' + a.listings + '</td><td class="r">' + gbp(a.spend, 0) + '</td><td class="r">' + a.attr_units + '</td><td class="r">' + gbp(a.attr_revenue, 0) + '</td><td class="r">' + (a.spend > 0 ? roas(a.attr_revenue / a.spend) : '—') + '</td><td class="r">' + (ck > 0 ? gbp(a.spend / ck) : '—') + '</td><td class="r">' + (ck > 0 ? (Math.round((a.attr_units || 0) / ck * 1000) / 10) + '%' : '—') + '</td><td class="r">' + (a.orders == null ? '—' : a.orders) + '</td><td class="r">' + (a.units == null ? '—' : a.units) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      h += '<div class="an-panel"><h3>Account one-liners</h3><div class="an-note">Written from the numbers. Empty until they are written, rather than guessed.</div>' + (D.regimes.length ? '<h3 style="margin-top:12px">Pattern changes</h3><ul class="at-list">' + D.regimes.map(function (r) { return '<li>' + esc(r.detected_day) + ' · ' + esc(r.scope_id) + ' — ' + esc(r.note) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      h += footer(D);
      $('anAcc').innerHTML = h;
      var fs = document.querySelectorAll('#anAcc .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { AA.acct = this.getAttribute('data-a'); loadAcc(); };
    }).catch(function (e) { fail('anAcc', e); });
  }

  /* ---------------- Categories ---------------- */
  var CT = { period: null };
  VIEWS.adtoolCategories = {
    label: 'Categories (ads)', hidden: true, order: 97, roles: ROLES, icon: '<path d="M4 5h6v6H4z"/><path d="M14 5h6v6h-6z"/><path d="M4 15h6v6H4z"/><path d="M14 15h6v6h-6z"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Categories', 'Spend and sales by category over the period you pick, with eBay\'s own categories underneath', 'anCatFresh') + '<div id="anCatBar"></div><div id="anCat"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { CT.period = adtPeriodBar('anCatBar', { page: 'adtoolCategories', def: 'd30', onChange: function (v) { CT.period = v; loadCats(); } }); loadCats(); }
  };
  function loadCats() {
    api('adtoolCategories', adtPeriodParams(CT.period)).then(function (D) {
      if (!$('anCat')) return; after('anCatBar', 'anCatFresh', D);
      /* category rows carry no profit (owner, 27 Sep): spend, share, sales, ROAS, best day by ROAS */
      var h = '<div class="an-panel"><h3>Category table, ' + esc(winShort(D)) + src('eBay ads report') + '</h3><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Category</th><th class="r">Listings</th><th class="r">Spend</th><th class="r">Share</th><th class="r">Units from ads</th><th class="r">Sales from ads</th><th class="r">ROAS</th><th>Best day</th><th>Best slot</th></tr></thead><tbody>' +
        D.categories.map(function (c) { return '<tr><td>' + esc(c.category) + '</td><td class="r">' + c.listings + '</td><td class="r">' + gbp(c.spend, 0) + '</td><td class="r">' + pct(c.spend_share) + '</td><td class="r">' + c.attr_units + '</td><td class="r">' + gbp(c.attr_revenue, 0) + '</td><td class="r">' + roas(c.roas) + '</td><td>' + (c.best_day ? esc(c.best_day.day) + (c.best_day.roas != null ? ' (' + roas(c.best_day.roas) + ')' : '') : '—') + '</td><td>' + (c.best_slot ? SLOTS[c.best_slot.slot] : '—') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      var cats = D.categories.map(function (c) { return c.category; }); var idx = {}; (D.weekday || []).forEach(function (r) { idx[r.category + '|' + r.weekday] = r; });
      h += '<div class="an-grid2"><div class="an-panel"><h3>Weekday ROAS by category' + src('eBay ads report · ' + winShort(D)) + '</h3><div class="an-sub">Sales from ads ÷ spend for each weekday. Gold marks the category\'s best.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Category</th>' + DOW.map(function (d) { return '<th class="r">' + d + '</th>'; }).join('') + '</tr></thead><tbody>' +
        cats.slice(0, 20).map(function (c) { var rs = DOW.map(function (d, i) { var r = idx[c + '|' + i]; var sp = r ? Number(r.spend) || 0 : 0; return r && sp > 0 && r.attr_revenue != null ? Number(r.attr_revenue) / sp : null; }); var best = rs.reduce(function (b, v, i) { return (v != null && (b < 0 || v > rs[b])) ? i : b; }, -1); return '<tr><td>' + esc(c) + '</td>' + rs.map(function (v, i) { return '<td class="r' + (i === best ? ' an-pos' : '') + '">' + roas(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
      var sidx = {}; D.slot.forEach(function (r) { sidx[r.category + '|' + r.slot] = Number(r.units); });
      h += '<div class="an-panel"><h3>Slot by category' + src('orders · 28 d') + '</h3><div class="an-sub">Units sold per UK slot.</div>' + heat(cats.slice(0, 20), [0, 1, 2, 3], function (c, s) { return sidx[c + '|' + s] || 0; }, function (c) { return c; }, function (s) { return SLOTS[s].split(' ')[0]; }) + '</div></div>';
      h += '<div class="an-panel"><h3>eBay category → our category' + src('items sync', 'from eBay') + '</h3><div class="an-sub">eBay\'s own category is still being filled in. Rows without it show first.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>eBay category path</th><th>Our category</th><th class="r">Listings</th></tr></thead><tbody>' + D.tree.slice(0, 60).map(function (t) { return '<tr><td>' + esc(t.ebay_path) + '</td><td>' + esc(t.category) + '</td><td class="r">' + t.listings + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      h += footer(D);
      $('anCat').innerHTML = h;
    }).catch(function (e) { fail('anCat', e); });
  }

  /* ---------------- Phone cases ---------------- */
  var CS = { period: null };
  VIEWS.adtoolCases = {
    label: 'Phone cases (ads)', hidden: true, order: 97, roles: ROLES, icon: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Phone cases', 'Spend and sales for phone cases by account and type, over the period you pick', 'anCaseFresh') + '<div id="anCaseBar"></div><div id="anCase"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { CS.period = adtPeriodBar('anCaseBar', { page: 'adtoolCases', def: 'd30', onChange: function (v) { CS.period = v; loadCases(); } }); loadCases(); }
  };
  function loadCases() {
    api('adtoolCases', adtPeriodParams(CS.period)).then(function (D) {
      if (!$('anCase')) return; after('anCaseBar', 'anCaseFresh', D);
      var C = D.cases || {};
      /* the case business by account and type is spend / sales / ROAS; profit is per listing only (winners and losers below) */
      var FL = D.fleet || {}, ZS = D.zero_sale || {};
      var h = '<div class="an-kpis">' + [['Case listings with spend', String(C.listings || 0), 'of the fleet\'s advertised listings'], ['Share of fleet spend', pct(D.share_spend), gbp(C.spend, 0) + ' of ' + gbp(FL.spend, 0)], ['Case units from ads', String(C.attr_units || 0), gbp(C.attr_revenue, 0) + ' sales from ads'], ['Case ROAS', C.spend > 0 ? roas(C.attr_revenue / C.spend) : '—', FL.spend > 0 && FL.attr_revenue != null ? 'fleet ' + roas(FL.attr_revenue / FL.spend) : 'sales from ads ÷ spend'], ['Zero-sale case spend', gbp(ZS.spend, 0), (ZS.listings || 0) + ' listings spent with no sale']].map(function (x) { return '<div class="an-kpi"><div class="k">' + x[0] + '</div><div class="v">' + x[1] + '</div><div class="d">' + x[2] + '</div></div>'; }).join('') + '</div>';
      var accts = []; var types = []; (D.matrix || []).forEach(function (m) { if (accts.indexOf(m.account) < 0) accts.push(m.account); if (types.indexOf(m.case_type) < 0) types.push(m.case_type); }); var mi = {}; (D.matrix || []).forEach(function (m) { mi[m.account + '|' + m.case_type] = m; });
      h += '<div class="an-panel"><h3>Account × case type' + src('eBay ads report · ' + winShort(D)) + '</h3><div class="an-sub">ROAS, with spend and listing count in small print.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Account</th>' + types.map(function (t) { return '<th class="r">' + esc(t) + '</th>'; }).join('') + '</tr></thead><tbody>' + accts.map(function (a) { return '<tr><td>' + esc(a) + '</td>' + types.map(function (t) { var m = mi[a + '|' + t]; var sp = m ? Number(m.spend) || 0 : 0; return '<td class="r">' + (m ? roas(sp > 0 && m.attr_revenue != null ? Number(m.attr_revenue) / sp : null) + '<div class="an-empty" style="padding:0">' + gbp(m.spend, 0) + ' · ' + m.listings + '</div>' : '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
      var mxs = Math.max.apply(null, (D.types || []).map(function (x) { return Number(x.spend) || 0; })) || 1;
      h += '<div class="an-panel"><h3>Case type totals</h3><table class="an-tbl"><thead><tr><th>Type</th><th class="r">Listings</th><th class="r">Spend</th><th class="r">Units from ads</th><th class="r">Sales from ads</th><th class="r">ROAS</th><th></th></tr></thead><tbody>' + (D.types || []).map(function (t) { return '<tr><td>' + esc(t.case_type) + '</td><td class="r">' + t.listings + '</td><td class="r">' + gbp(t.spend, 0) + '</td><td class="r">' + t.attr_units + '</td><td class="r">' + gbp(t.attr_revenue, 0) + '</td><td class="r">' + roas(t.roas) + '</td><td><span class="an-bar" style="width:' + Math.round((Number(t.spend) || 0) / mxs * 120) + 'px"></span></td></tr>'; }).join('') + '</tbody></table></div>';
      var row = function (r) { return '<tr><td>' + adtProductCell(r) + '</td><td>' + esc(r.case_type || '') + '</td><td class="r">' + gbp(r.spend) + '</td><td class="r">' + (r.attr_units || 0) + '</td><td class="r">' + roas(r.roas) + '</td><td class="r">' + adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders) + '</td></tr>'; };
      var head = '<thead><tr><th>Listing</th><th>Type</th><th class="r">Spend</th><th class="r">Units from ads</th><th class="r">ROAS</th><th class="r">Profit</th></tr></thead>';
      h += '<div class="an-grid2"><div class="an-panel"><h3>Biggest case losers</h3><div class="an-sub">The listings that lost the most money, ' + esc(winShort(D)) + '.</div><div class="an-scroll"><table class="an-tbl">' + head + '<tbody>' + ((D.losers || []).length ? D.losers.map(row).join('') : '<tr><td colspan="6" class="an-empty">none</td></tr>') + '</tbody></table></div></div>';
      h += '<div class="an-panel"><h3>Case winners to feed</h3><div class="an-sub">Making money at twice break-even ROAS or better, on £5 of spend or more.</div><div class="an-scroll"><table class="an-tbl">' + head + '<tbody>' + ((D.winners || []).length ? D.winners.map(row).join('') : '<tr><td colspan="6" class="an-empty">none yet</td></tr>') + '</tbody></table></div></div></div>';
      h += '<div class="an-panel"><h3>Fix a category' + src('Management') + '</h3><div class="an-sub">Change the category or case type we file a listing under. A label in this tool only. Nothing on eBay changes.</div>' + ((STATE.user && (STATE.user.super || ['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0)) ? '<div class="an-form"><input id="anOvId" placeholder="item id"><input id="anOvCat" placeholder="our category (blank = keep)"><select id="anOvType"><option value="">case type (blank = keep)</option>' + D.case_types.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select><button class="an-btn" id="anOvGo">Save override</button></div>' : '<div class="an-empty">Management only.</div>') + (D.overrides.length ? '<table class="an-tbl" style="margin-top:8px"><thead><tr><th>Listing</th><th>Category</th><th>Case type</th><th>By</th><th>When</th></tr></thead><tbody>' + D.overrides.map(function (o) { return '<tr><td>' + adtProductCell(o) + '</td><td>' + esc(o.m98m_category || '—') + '</td><td>' + esc(o.case_type || '—') + '</td><td>' + esc(o.set_by) + '</td><td>' + esc(String(o.set_at).slice(0, 16)) + '</td></tr>'; }).join('') + '</tbody></table>' : '') + '</div>';
      h += footer(D);
      $('anCase').innerHTML = h;
      var go = $('anOvGo'); if (go) go.onclick = function () { var id = $('anOvId').value.replace(/\D/g, ''); if (!/^\d{9,13}$/.test(id)) { toast('Give an item id'); return; } go.disabled = true; api('adtoolCases', { set: { item_id: id, m98m_category: $('anOvCat').value.trim(), case_type: $('anOvType').value } }).then(function () { toast('Saved'); loadCases(); }).catch(function (e) { toast(e.message || 'failed'); go.disabled = false; }); };
    }).catch(function (e) { fail('anCase', e); });
  }

  /* ---------------- Time slots ---------------- */
  /* the chip row's account names are DERIVED, never typed: six literal names used to sit here and a
     renamed or new account silently broke the filter. adtoolSlots narrows its rows to the chosen
     account, so the row remembers every name it has seen and never shrinks. */
  var AS = { acct: '', cat: '', period: null, accounts: [] };
  function slotAccountsFrom(D) {
    var out = [];
    var push = function (a) { a = (a == null ? '' : String(a)).trim(); if (a && out.indexOf(a) < 0) out.push(a); };
    ((D && D.accounts) || []).forEach(function (a) { push(typeof a === 'string' ? a : (a && a.account)); });
    ((D && D.products_by_concentration) || []).forEach(function (r) { push(r && r.account); });
    ((D && D.cap_hours_yesterday) || []).forEach(function (r) { push(r && r.account); });
    return out;
  }
  VIEWS.adtoolSlots = {
    label: 'Time slots (ads)', hidden: true, order: 97, roles: ROLES, icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    render: function () { return '<div class="an-wrap">' + adtHgroup('Time slots', 'When we sell and when the ads spend, by UK time of day', 'anSlotFresh') + '<div id="anSlotBar"></div><div id="anSlot"><div class="an-empty">Loading…</div></div></div>'; },
    init: function () { AS.period = adtPeriodBar('anSlotBar', { page: 'adtoolSlots', def: 'd28', onChange: function (v) { AS.period = v; loadSlots(); } }); loadSlots(); }   /* d28 = the engine's own default for this page; panels label from the echo */
  };
  function loadSlots() {
    api('adtoolSlots', Object.assign({ account: AS.acct, category: AS.cat }, adtPeriodParams(AS.period))).then(function (D) {
      if (!$('anSlot')) return; after('anSlotBar', 'anSlotFresh', D);
      var bySlot = [0, 0, 0, 0], byRev = [0, 0, 0, 0], grid = {}; D.sales_by_slot_weekday.forEach(function (r) { bySlot[r.slot] += Number(r.units); byRev[r.slot] += Number(r.revenue); grid[r.slot + '|' + r.weekday] = Number(r.units); });
      var tot = bySlot.reduce(function (t, v) { return t + v; }, 0) || 1;
      var spendSlot = [0, 0, 0, 0]; D.sampled_by_hour.forEach(function (r) { var s = r.hour < 6 ? 0 : r.hour < 12 ? 1 : r.hour < 17 ? 2 : 3; spendSlot[s] += Number(r.spend); }); var stot = spendSlot.reduce(function (t, v) { return t + v; }, 0);
      var winLbl = 'orders · ' + (D.period && D.period.days != null ? D.period.days + ' d' : '28 d');
      var h = '<div class="an-note" style="margin-bottom:12px">' + esc(D.note) + '.</div>';
      slotAccountsFrom(D).forEach(function (a) { if (AS.accounts.indexOf(a) < 0) AS.accounts.push(a); });
      AS.accounts.sort();
      h += '<div class="an-filters"><button class="' + (AS.acct === '' ? 'on' : '') + '" data-a="">All accounts</button>' + AS.accounts.map(function (a) { return '<button class="' + (AS.acct === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>';
      h += '<div class="an-grid2"><div class="an-panel"><h3>Fleet sales by slot' + src(winLbl) + '</h3><table class="an-tbl"><thead><tr><th>Slot</th><th class="r">Units</th><th class="r">Share</th><th class="r">Revenue</th><th class="r">Smoothed share</th></tr></thead><tbody>' + SLOTS.map(function (s, i) { var p = D.slot_profile && D.slot_profile.rows && (D.slot_profile.rows[AS.acct || 'all']); return '<tr><td>' + s + '</td><td class="r">' + bySlot[i] + '</td><td class="r">' + pct(bySlot[i] / tot) + ' <span class="an-bar" style="width:' + Math.round(bySlot[i] / tot * 80) + 'px"></span></td><td class="r">' + gbp(byRev[i], 0) + '</td><td class="r">' + (p ? pct(p.shares[i]) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      /* These bars are our own readings of eBay's running total, so they do NOT add up to the day.
         Whatever had already built up before the first reading arrived sits in no slot at all, and
         the action says so in `carry_note`. Printing the shares without that note reads as "we spend
         nothing overnight" when it means "we cannot see overnight spend". */
      h += '<div class="an-panel"><h3>Ad spend by time of day' + src('sampled', 'our own readings', true) + '</h3><div class="an-sub">From our own readings, from ' + esc(D.sampled_from) + '. These are not the whole day: the shares below are shares of what we could read.</div>' + (stot ? '<table class="an-tbl"><thead><tr><th>Slot</th><th class="r">Spend</th><th class="r">Share</th></tr></thead><tbody>' + SLOTS.map(function (s, i) { return '<tr><td>' + s + '</td><td class="r">' + gbp(spendSlot[i], 0) + '</td><td class="r">' + pct(spendSlot[i] / stot) + ' <span class="an-bar" style="width:' + Math.round(spendSlot[i] / stot * 80) + 'px"></span></td></tr>'; }).join('') + '</tbody></table><div class="an-note" style="margin-top:8px">' + esc(D.carry_note || 'Spend that had already built up before the first reading of the day is not in these bars.') + ' Read ' + esc(gbp(stot, 0)) + ' as the spend we could place in a slot, not the day\'s total.</div>' : '<div class="an-empty">No ad readings for this selection yet.</div>') + '</div></div>';
      h += '<div class="an-panel"><h3>Slot × weekday' + src(winLbl) + '</h3>' + heat([0, 1, 2, 3], [0, 1, 2, 3, 4, 5, 6], function (s, d) { return grid[s + '|' + d] || 0; }, function (s) { return SLOTS[s]; }, function (d) { return DOW[d]; }) + '</div>';
      h += '<div class="an-grid2"><div class="an-panel"><h3>Listings by time of day' + src('descriptors', 'listing patterns') + '</h3><div class="an-sub">The slot each listing sells most in. <b>Share</b> is how much of its selling happens there, and it replaces the old concentration index. <b>Budget hour</b> is when yesterday\'s spend reached the daily budget.</div><div class="an-scroll"><table class="an-tbl"><thead><tr><th>Listing</th><th>Top slot</th><th class="r">Share</th><th>Stage</th><th class="r">Budget hour</th></tr></thead><tbody>' + (D.products_by_concentration.length ? D.products_by_concentration.map(function (r) { var cap = D.cap_hours_yesterday.filter(function (c) { return c.item_id === r.item_id; })[0]; return '<tr><td>' + adtProductCell(r) + '</td><td>' + SLOTS[r.top_slot] + '</td><td class="r">' + pct(r.top_slot_share) + '</td><td>' + esc(r.stage || '—') + '</td><td class="r">' + (cap ? cap.cap_hour + ':00' : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="an-empty">Not available yet.</td></tr>') + '</tbody></table></div></div>';
      h += '<div class="an-panel"><h3>Pattern changes</h3><div class="an-sub">Listings whose hour-by-hour pattern has moved away from their own recent weeks.</div>' + (D.regimes.length ? '<ul class="at-list">' + D.regimes.map(function (r) { return '<li>' + esc(r.detected_day) + ' · ' + esc(r.scope) + ' ' + esc(r.scope_id) + ' — ' + esc(r.note) + '</li>'; }).join('') + '</ul>' : '<div class="an-empty">No pattern changes detected yet.</div>') + (D.cap_hours_yesterday.length ? '<h3 style="margin-top:12px">Ran out of budget yesterday (' + esc(D.cap_day) + ')</h3><div class="an-sub">' + D.cap_hours_yesterday.length + ' listings spent nearly all of their daily budget. The earliest got there by ' + Math.min.apply(null, D.cap_hours_yesterday.map(function (c) { return c.cap_hour; })) + ':00 UK.</div>' : '') + '</div></div>';
      h += footer(D);
      $('anSlot').innerHTML = h;
      var fs = document.querySelectorAll('#anSlot .an-filters button'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { AS.acct = this.getAttribute('data-a'); loadSlots(); };
    }).catch(function (e) { fail('anSlot', e); });
  }
})();
