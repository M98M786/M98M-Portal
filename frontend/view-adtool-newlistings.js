/* view-adtool-newlistings.js — Advertising · New listings (owner's Change Spec, 28 Oct 2026:
 * "New Listings (NEW: listings of the last 14 days, by account, with a Product History link)").
 *
 * The listings that went live recently, account by account, newest first. It is the SAME list the
 * Listing departments page already builds — adtoolDepts.new_window.items, the engine's one home for
 * "which listings are new" — read here as a page of its own. Nothing is counted a second way, so
 * the two screens can never come to disagree about which listing is new.
 *
 * A new listing is held back from heavy advertising while it settles, so every row carries what it
 * has spent and what it has sold, and the rows that have already gone over a cap are marked. The
 * caps themselves are the engine's own figures, printed from the answer, never typed in here.
 *
 * No collective profit anywhere, by the Sales Analysis law: this page deals in listings, spend and
 * units. Read-only: nothing here is ever sent to eBay. Galaxy tokens only, gold the accent,
 * #e0563f the loss colour. Engine action: adtoolDepts. Own class prefix: .nwl-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var NW = { account: '', data: null, sort: { key: 'age_days', dir: 1 }, busy: false };

  VIEW_CSS.push([
    '.nwl-wrap{max-width:1420px}',
    '.nwl-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.nwl-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.nwl-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font:inherit;font-size:11.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.nwl-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.nwl-chip .n{opacity:.75;margin-left:6px;font-variant-numeric:tabular-nums}',
    '.nwl-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.nwl-tile{flex:1 1 150px;border:1px solid var(--gold-line);border-radius:12px;padding:9px 13px;background:var(--panel-2)}',
    '.nwl-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.nwl-tile .v{font-size:21px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.nwl-tile.gold .v{color:var(--gold-a)}.nwl-tile.loss .v{color:' + LOSS + '}',
    '.nwl-tile .d{font-size:11px;color:var(--text-2);margin-top:2px;line-height:1.45}',
    '.nwl-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.nwl-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.nwl-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.nwl-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.nwl-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.nwl-tbl th.s{cursor:pointer;user-select:none}.nwl-tbl th.s:hover{color:var(--gold-a)}',
    '.nwl-tbl th.r{text-align:right}.nwl-tbl th .ar{color:var(--gold-a);margin-left:3px}',
    '.nwl-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.nwl-tbl td.r{text-align:right;white-space:nowrap}',
    '.nwl-tbl tr:hover td{background:rgba(255,255,255,.03)}',
    '.nwl-tbl tr.nwl-grp td{background:rgba(255,255,255,.04);font-weight:800;font-size:11.5px;letter-spacing:.04em;color:var(--text)}',
    '.nwl-tbl tr.nwl-tot td{border-top:1px solid var(--gold-line);border-bottom:0;font-weight:800;background:rgba(242,176,53,.06)}',
    '.nwl-scroll{overflow-x:auto}',
    '.nwl-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.nwl-tag.live{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.nwl-tag.off{color:var(--text-3);border-style:dashed}',
    '.nwl-mark{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:' + LOSS + ';white-space:nowrap}',
    '.nwl-sm{font-size:11px;color:var(--text-2);line-height:1.5}.nwl-sm b{color:var(--text)}',
    '.nwl-sm2{font-size:10.5px;color:var(--text-3);line-height:1.45}',
    '.nwl-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.55}',
    '.nwl-note b{color:var(--text)}',
    '.nwl-empty{color:var(--text-3);font-size:13px;padding:10px 0}'
  ].join(''));

  /* a figure with nothing behind it prints the empty marker, never a zero that means "missing" */
  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function n0(n) { var v = num(n); return v == null ? 0 : v; }
  function plural(n, one, many) { return Math.round(n0(n)) === 1 ? one : many; }
  function dayOk(d) { d = String(d == null ? '' : d).slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? d : ''; }
  function dayShort(d) {
    d = dayOk(d); if (!d) return '—';
    var t = new Date(d + 'T12:00:00Z'); if (isNaN(t.getTime())) return d;
    try { return t.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }); } catch (e) { return d.slice(5); }
  }
  function ageTxt(r) {
    var a = num(r && r.age_days);
    if (a == null) return 'age not known';
    var d = Math.round(a);
    return d === 0 ? 'today' : d === 1 ? '1 day old' : d + ' days old';
  }

  VIEWS.adtoolNewListings = {
    label: 'New listings', hidden: true, order: 97, roles: ROLES,
    icon: '<path d="M12 4v16"/><path d="M4 12h16"/><circle cx="12" cy="12" r="9"/>',
    render: function () {
      return '<div class="nwl-wrap">' +
        adtHgroup('New listings', 'Every listing that has just gone live, newest first, by account', 'nwlFresh') +
        '<div id="nwlAcct" class="nwl-chips"></div>' +
        '<div id="nwlBody"><div class="nwl-empty">Loading…</div></div></div>';
    },
    init: function () {
      acctChips();
      load(false).catch(function () {});
      /* nothing on this page moves until the next daily roll-up, so the re-read is hourly; adtPoll
         skips hidden tabs and stops for good on an 'auth' refusal (the session-expiry law) */
      adtPoll('nwlBody', 3600000, function () { return load(true); });
    }
  };

  function load(quiet) {
    if (NW.busy) return Promise.resolve();
    NW.busy = true;
    return api('adtoolDepts', NW.account ? { account: NW.account } : {}).then(function (D) {
      NW.busy = false;
      NW.data = D || {};
      if (!$('nwlBody')) return;
      acctChips();
      draw();
      adtFreshShow('nwlFresh', NW.data.fresh);
    }).catch(function (e) {
      NW.busy = false;
      if (!quiet && $('nwlBody')) {
        $('nwlBody').innerHTML = '<div class="nwl-panel"><h3>Not available</h3><div class="nwl-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }

  /* the window the engine built: items, how many it held back, and its own sentence about the caps */
  function win() {
    var w = (NW.data && NW.data.new_window) || null;
    return w && typeof w === 'object' ? w : null;
  }
  function items() {
    var w = win();
    return ((w && w.items) || []).filter(function (r) { return r && typeof r === 'object'; });
  }
  function accountNames() {
    var A = ((NW.data && NW.data.accounts) || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (!A.length) {
      var seen = {};
      items().forEach(function (r) { if (r.account && !seen[r.account]) { seen[r.account] = 1; A.push(r.account); } });
      A.sort();
    }
    return A;
  }
  function acctChips() {
    var el = $('nwlAcct'); if (!el) return;
    var by = {};
    items().forEach(function (r) { var a = String(r.account || ''); if (a) by[a] = (by[a] || 0) + 1; });
    el.innerHTML = '<button class="nwl-chip' + (NW.account ? '' : ' on') + '" data-nwa="">All accounts</button>' +
      accountNames().map(function (a) {
        return '<button class="nwl-chip' + (NW.account === a ? ' on' : '') + '" data-nwa="' + esc(a) + '">' + esc(a) +
          (by[a] == null ? '' : '<span class="n">' + cnt(by[a]) + '</span>') + '</button>';
      }).join('');
    var bs = el.querySelectorAll('[data-nwa]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      NW.account = this.getAttribute('data-nwa') || '';
      acctChips();
      /* ASK AGAIN rather than filter what is in hand: the engine caps this list, so choosing one
         account is also the only way to reach more of its rows */
      load(false).catch(function () {});
    };
  }

  /* ── 1 · the window in tiles ──────────────────────────────────────────────────────────────── */
  function tile(k, v, d, cls) {
    return '<div class="nwl-tile ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div><div class="d">' + esc(d) + '</div></div>';
  }
  function tiles() {
    var w = win(), R = items();
    var days = num(NW.data && NW.data.rules && NW.data.rules.new_days);
    var advertised = R.filter(function (r) { return r.advertised; }).length;
    var spend7 = R.reduce(function (t, r) { return t + n0(r.spend_7d); }, 0);
    var never = R.filter(function (r) { return n0(r.sold_life) === 0 && n0(r.units_30d) === 0; }).length;
    var total = w && num(w.first_14_days) != null ? num(w.first_14_days) : R.length;
    return '<div class="nwl-tiles">' +
      tile('New listings', cnt(total), days == null ? 'live for a short while' : 'live for ' + cnt(days) + ' ' + plural(days, 'day', 'days') + ' or less', 'gold') +
      /* THIS TILE IS NOT COUNTED OVER THIS PAGE. The engine counts it over EVERY active listing,
         not only the new department, so "the freshest of them" claimed it was a slice of the tile
         beside it. Its caption is the engine's own sentence (`last_7_days_note`), which used to be
         appended mid-paragraph to the note at the foot of the page as a loose fragment. */
      tile('Went live in the last 7 days', cnt(w && w.last_7_days),
        num(w && w.last_7_days) == null ? 'not available yet'
          : 'of all active listings' + (w && w.last_7_days_note ? '. ' + String(w.last_7_days_note) : ''), '') +
      tile('Being advertised', cnt(advertised), total ? cnt(total - advertised) + ' ' + plural(total - advertised, 'is', 'are') + ' not' : 'none yet', '') +
      tile('Spent over 7 days', gbp(spend7), 'these listings together, no profit at this level', 'gold') +
      tile('No sale yet', cnt(never), 'nothing sold since they went up', never > 0 ? 'loss' : '') +
      '</div>';
  }

  /* ── 2 · account by account ───────────────────────────────────────────────────────────────── */
  function accountPanel() {
    var R = items();
    if (!R.length) return '';
    var by = {}, order = [];
    R.forEach(function (r) {
      var a = String(r.account || 'no account');
      if (!by[a]) { by[a] = { account: a, listings: 0, advertised: 0, week: 0, spend_7d: 0, units_30d: 0, never: 0 }; order.push(a); }
      var g = by[a];
      g.listings++; if (r.advertised) g.advertised++;
      if (num(r.age_days) != null && num(r.age_days) <= 7) g.week++;
      g.spend_7d += n0(r.spend_7d); g.units_30d += n0(r.units_30d);
      if (n0(r.sold_life) === 0 && n0(r.units_30d) === 0) g.never++;
    });
    var rows = order.map(function (a) { return by[a]; }).sort(function (x, y) { return y.listings - x.listings; });
    var sum = rows.reduce(function (t, g) { t.listings += g.listings; t.advertised += g.advertised; t.week += g.week; t.spend_7d += g.spend_7d; t.units_30d += g.units_30d; t.never += g.never; return t; },
      { listings: 0, advertised: 0, week: 0, spend_7d: 0, units_30d: 0, never: 0 });
    return '<div class="nwl-panel"><h3>Account by account</h3>' +
      '<div class="nwl-sub">How many new listings each account is carrying, and what they have spent.</div>' +
      '<div class="nwl-scroll"><table class="nwl-tbl"><thead><tr><th>Account</th>' +
      '<th class="r">New listings</th><th class="r">Live in the last 7 days</th><th class="r">Being advertised</th>' +
      '<th class="r">Spent over 7 days</th><th class="r">Units over 30 days</th><th class="r">No sale yet</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (g) {
        return '<tr><td><b>' + esc(g.account) + '</b></td><td class="r">' + cnt(g.listings) + '</td>' +
          '<td class="r">' + cnt(g.week) + '</td><td class="r">' + cnt(g.advertised) + '</td>' +
          '<td class="r">' + gbp(g.spend_7d) + '</td><td class="r">' + cnt(g.units_30d) + '</td>' +
          '<td class="r">' + cnt(g.never) + '</td></tr>';
      }).join('') +
      '<tr class="nwl-tot"><td>' + (NW.account ? esc(NW.account) : 'All accounts') + '</td><td class="r">' + cnt(sum.listings) + '</td>' +
      '<td class="r">' + cnt(sum.week) + '</td><td class="r">' + cnt(sum.advertised) + '</td>' +
      '<td class="r">' + gbp(sum.spend_7d) + '</td><td class="r">' + cnt(sum.units_30d) + '</td>' +
      '<td class="r">' + cnt(sum.never) + '</td></tr></tbody></table></div></div>';
  }

  /* ── 3 · the listings ─────────────────────────────────────────────────────────────────────── */
  var COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'age_days', label: 'Went live', cls: 'r', cell: function (r) {
        return '<div class="nwl-sm"><b>' + esc(dayShort(r.born)) + '</b></div><div class="nwl-sm2">' + esc(ageTxt(r)) +
          (r.clock ? ' · ' + esc(String(r.clock)) : '') + '</div>';
      }, sortVal: function (r) { return num(r.age_days); } },
    { key: 'advertised', label: 'Advertised', cell: function (r) {
        if (!r.advertised) return '<span class="nwl-tag off">not advertised</span>';
        return '<span class="nwl-tag live">advertised</span>' +
          (r.campaign ? '<div class="nwl-sm2">' + esc(String(r.campaign)) + '</div>' : '');
      }, sortVal: function (r) { return r.advertised ? 1 : 0; } },
    { key: 'spend_7d', label: 'Spent over 7 days', cls: 'r', cell: function (r) {
        return gbp(r.spend_7d) + (r.over_week ? '<span class="nwl-mark" title="over what a new listing is allowed for the week">over the week</span>' : '');
      }, sortVal: function (r) { return num(r.spend_7d); } },
    { key: 'spend_yesterday', label: 'Spent yesterday', cls: 'r', cell: function (r) { return gbp(r.spend_yesterday); }, sortVal: function (r) { return num(r.spend_yesterday); } },
    { key: 'worst_day', label: 'Worst day', cls: 'r', cell: function (r) {
        var v = num(r.worst_day);
        if (v == null || v === 0) return '<span class="nwl-sm2">nothing spent yet</span>';
        return gbp(v) + (r.over_day ? '<span class="nwl-mark" title="over what one listing is allowed in a day">over the day</span>' : '') +
          (r.worst_day_date ? '<div class="nwl-sm2">' + esc(dayShort(r.worst_day_date)) + '</div>' : '');
      }, sortVal: function (r) { return num(r.worst_day); } },
    { key: 'sold_life', label: 'Sold since listed', cls: 'r', cell: function (r) { return cnt(r.sold_life); }, sortVal: function (r) { return num(r.sold_life); } },
    { key: 'units_30d', label: 'Units over 30 days', cls: 'r', cell: function (r) { return cnt(r.units_30d); }, sortVal: function (r) { return num(r.units_30d); } }
  ];

  function colOf(k) { for (var i = 0; i < COLS.length; i++) if (COLS[i].key === k) return COLS[i]; return null; }
  function sorter() {
    var col = colOf(NW.sort.key), dir = NW.sort.dir;
    var val = (col && col.sortVal) ? col.sortVal : function (r) { return num(r[NW.sort.key]); };
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
  function rowHtml(r) {
    return '<tr>' + COLS.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>';
  }
  function listPanel() {
    var R = items().slice().sort(sorter());
    var h = '<div class="nwl-panel"><h3>The listings</h3>' +
      '<div class="nwl-sub">Newest first' + (NW.account ? ', on ' + esc(NW.account) : ', grouped by account') +
      '. Sort on any column by clicking its heading. Every row opens its own Product history.</div>';
    if (!R.length) {
      return h + '<div class="nwl-empty">No listing has gone live recently' + (NW.account ? ' on ' + esc(NW.account) : '') + '.</div></div>';
    }
    var head = '<thead><tr>' + COLS.map(function (c) {
      var on = NW.sort.key === c.key;
      return '<th class="s ' + (c.cls || '') + '" data-nwk="' + esc(c.key) + '">' + esc(c.label) +
        (on ? '<span class="ar">' + (NW.sort.dir < 0 ? '▼' : '▲') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead>';
    var body;
    if (!NW.account && NW.sort.key === 'age_days') {
      /* grouped by account only while the list is in its own natural order; a chosen sort is a
         question about the whole list, and grouping it would answer a different one */
      var by = {}, order = [];
      R.forEach(function (r) { var a = String(r.account || 'no account'); if (!by[a]) { by[a] = []; order.push(a); } by[a].push(r); });
      order.sort(function (x, y) { return by[y].length - by[x].length; });
      body = order.map(function (a) {
        return '<tr class="nwl-grp"><td colspan="' + COLS.length + '">' + esc(a) + ' · ' + cnt(by[a].length) + ' ' +
          plural(by[a].length, 'listing', 'listings') + '</td></tr>' + by[a].map(rowHtml).join('');
      }).join('');
    } else {
      body = R.map(rowHtml).join('');
    }
    return h + '<div class="nwl-scroll"><table class="nwl-tbl">' + head + '<tbody>' + body + '</tbody></table></div></div>';
  }

  /* ── 4 · what is on the page and what is not ──────────────────────────────────────────────── */
  function note() {
    var w = win(), R = items();
    var held = w ? num(w.items_held_back) : null;
    var total = w && num(w.first_14_days) != null ? num(w.first_14_days) : R.length;
    var h = '<div class="nwl-note">Showing <b>' + cnt(R.length) + '</b> ' + plural(R.length, 'listing', 'listings') +
      (total != null && total !== R.length ? ' of ' + cnt(total) : '') +
      (NW.account ? ' on ' + esc(NW.account) : ' across all accounts') + '. ';
    h += (held != null && held > 0)
      ? '<b>' + cnt(held) + ' more ' + plural(held, 'listing is', 'listings are') + ' not on this page.</b> ' +
        'The newest are shown; choose one account to reach more of them. The tiles and the account table cover every one of them.'
      : 'Every new listing is on this page.';
    if (w && w.note) h += ' ' + esc(String(w.note));
    /* last_7_days_note is a caption for the tile it describes, and it is printed there */
    h += ' Nothing on this page is ever sent to eBay.';
    if (NW.data && NW.data.computed_at) h += ' Worked out at ' + esc(String(NW.data.computed_at).slice(11, 16)) + ' UTC.';
    return h + '</div>';
  }

  /* ── draw and wire ────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('nwlBody'); if (!box) return;
    var R = items();
    var h = '<div class="nwl-top"><span><b>New listings</b></span><span>·</span>' +
      '<span>' + esc(NW.account || 'all accounts') + '</span><span>·</span>' +
      '<span>' + cnt(R.length) + ' ' + plural(R.length, 'listing', 'listings') + '</span></div>';
    if (!win()) {
      box.innerHTML = h + '<div class="nwl-panel"><h3>Not available yet</h3><div class="nwl-sub">' +
        'The answer does not carry the new-listing window, so this page has nothing to show. It is not that no listing is new.</div></div>';
      return;
    }
    h += note();
    h += tiles();
    h += accountPanel();
    h += listPanel();
    box.innerHTML = h;
    var ths = box.querySelectorAll('[data-nwk]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-nwk');
      if (NW.sort.key === k) { NW.sort.dir = -NW.sort.dir; }
      else { NW.sort = { key: k, dir: (k === 'listing' || k === 'age_days') ? 1 : -1 }; }
      draw();
    };
  }
})();
