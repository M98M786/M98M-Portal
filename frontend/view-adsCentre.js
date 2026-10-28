/* view-adsCentre.js — Hasib items 10/18/22: the advertising command centre. Combined tiles →
 * per-account cards → per-item board in eBay's own vocabulary, fed by the intraday snapshot.
 * The waste rows (£3+ today, zero orders) lead the table, red, exactly per his rule. */
(function () {

  var AC_ROLES = ['Advertising Manager', 'Management', 'Ops Head']; /* review 4: ad revenue = earnings */
  /* sort: {key:'', dir:-1} means "nothing chosen", which is the board's own order — the waste rows
     first, then the biggest spend today. A choice is remembered per browser under AC_SORT_KEY. */
  var AC = { timer: null, days: 14, acct: '', from: '', to: '', items: [], lastDays: 14, sort: { key: '', dir: -1 } };
  var AC_SORT_KEY = 'm98m:adsCentre:sort';

  /* `acc-tbl`, not `ac-tbl`: view-adtool-campaigns.js declares its OWN `.ac-tbl` with a different
   body. VIEW_CSS is one array joined in splice order, and the two portals splice these files in a
   different order, so sharing the name made the same class resolve differently in each portal. That
   is precisely the drift the shared-shell design exists to prevent. Do not rename it back. */
VIEW_CSS.push(
    '.ac-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px}' +
    '.ac-tile{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:var(--panel-2)}' +
    '.ac-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ac-tile .v{font-size:24px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.ac-tile.bad .v{color:var(--bad)}.ac-tile.gold .v{color:var(--gold-a)}' +
    '.ac-accs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}' +
    '.ac-acc{border:1px solid var(--gold-line);border-radius:11px;padding:10px 14px;background:var(--panel);font-size:12px;font-weight:700}' +
    '.ac-acc b{display:block;font-size:15px;font-variant-numeric:tabular-nums}' +
    '.ac-acc .w{color:var(--bad);font-size:10.5px;font-weight:800}' +
    '.acc-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:900px}' +
    '.acc-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.acc-tbl th:first-child{text-align:left}' +
    /* every heading of the per-item board sorts it (owner, 22 Oct) */
    '.acc-tbl th.acc-s{cursor:pointer;user-select:none}' +
    '.acc-tbl th.acc-s:hover{color:var(--gold-a)}' +
    '.acc-tbl th .acc-ar{color:var(--gold-a);margin-left:3px}' +
    '.acc-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.acc-tbl td:first-child{text-align:left;white-space:normal;min-width:240px}' +
    '.ac-waste td{background:var(--bad-soft,rgba(255,80,80,.08))}' +
    '.ac-waste td:first-child{border-left:3px solid var(--bad)}' +
    /* the two links under an item: eBay, and this listing\'s own Product history in a new tab */
    '.ac-eb{color:var(--text-3);font-weight:800;text-decoration:none}' +
    '.ac-eb:hover{color:var(--gold-a)}' +
    /* R7-8 organic vs promoted split */
    '.ac-split{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:var(--panel-2);margin-bottom:16px}' +
    '.ac-split-h{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin-bottom:9px}' +
    '.ac-bar{height:16px;border-radius:8px;overflow:hidden;background:var(--ok,#2fb170);display:flex}' +
    '.ac-bar-p{display:block;height:100%;background:var(--gold-a);border-right:2px solid var(--panel-2)}' +
    '.ac-bar-lg{display:flex;flex-wrap:wrap;gap:14px;margin-top:9px;font-size:12.5px;font-weight:700;align-items:center}' +
    '.ac-bar-lg b{font-weight:800}' +
    '.ac-lg-p b{color:var(--gold-a)}.ac-lg-o b{color:var(--ok,#2fb170)}' +
    '.ac-bar-tot{margin-left:auto;color:var(--text-3);font-weight:800}' +
    '.ac-split-note{font-size:11px;color:var(--text-3);font-weight:600;margin-top:9px;line-height:1.5}'
  );

  function acGBP(v) { var n = Number(v) || 0; return '£' + n.toFixed(2); }
  function acROAS(rev, sp) { return Number(sp) > 0.005 ? (Number(rev) / Number(sp)).toFixed(1) + '\u00d7' : '\u2014'; }
  function acNum(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }

  /* \u2500\u2500 the per-item board, sortable on every column (owner, 22 Oct: "add sort option on data in ad
     commands center"). The rows are already in hand, so a sort never asks the engine again. Each
     column heading says what it sorts by; numbers sort numerically, text alphabetically, and an
     empty cell sinks to the bottom whichever way the column is pointed. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  /* Owner's Change Spec, 28 Oct 2026: "Ads Command Centre (product click opens Product History in a
     new tab)". The title used to be the eBay link, so a click left the portal; it now opens this
     listing's own Product history in a tab of its own, and the eBay link keeps its place beside the
     item number. The hash carries the item, so a second tab shows ITS listing and not this one's. */
  var AC_COLS = [
    { key: 'title', label: 'Item', text: true, sorts: 'the listing title, A to Z',
      val: function (r) { return String(r.title || r.item_id || ''); },
      cell: function (r) {
        var id = String(r.item_id == null ? '' : r.item_id).trim();
        var known = /^\d{9,13}$/.test(id);
        var title = esc(String(r.title || r.item_id || '').slice(0, 80));
        return (known
          ? '<a href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener" style="color:inherit" title="open this listing\u2019s Product history in a new tab">' + title + '</a>'
          : title) +
          '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(id) + ' \u00b7 ' + esc(String(r.account)) +
          (known ? ' \u00b7 <a class="ac-eb" href="https://www.ebay.co.uk/itm/' + esc(id) + '" target="_blank" rel="noopener noreferrer" title="open on eBay">eBay \u2197</a>' +
            ' \u00b7 <a class="ac-eb" href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener" title="open this listing\u2019s Product history in a new tab">History \u2197</a>' : '') +
          (r.waste ? ' \u00b7 <b style="color:var(--bad)">\u00a33+ TODAY, NO ORDER \u2014 PAUSE OR FIX</b>' : '') + '</div>';
      } },
    { key: 'spend_today', label: 'Spend today', sorts: 'what the listing has spent on ads today',
      val: function (r) { return acNum(r.spend_today); }, cell: function (r) { return acGBP(r.spend_today); } },
    { key: 'clicks_today', label: 'Clicks', sorts: 'clicks on the ad today',
      val: function (r) { return acNum(r.clicks_today); }, cell: function (r) { return r.clicks_today || 0; } },
    { key: 'cpc_today', label: 'Avg CPC', sorts: 'the average cost of a click today',
      val: function (r) { return acNum(r.cpc_today); }, cell: function (r) { return r.cpc_today ? acGBP(r.cpc_today) : '\u2014'; } },
    { key: 'sold_today', label: 'Sold via ads', sorts: 'units eBay credits to the ad today',
      val: function (r) { return acNum(r.sold_today); }, cell: function (r) { return r.sold_today || 0; } },
    { key: 'spend_14d', label: function () { return 'Spend ' + AC.lastDays + 'd'; }, sorts: 'ad spend over the window',
      val: function (r) { return acNum(r.spend_14d); }, cell: function (r) { return acGBP(r.spend_14d); } },
    { key: 'clicks_14d', label: function () { return 'Clicks ' + AC.lastDays + 'd'; }, sorts: 'clicks over the window',
      val: function (r) { return acNum(r.clicks_14d); }, cell: function (r) { return r.clicks_14d || 0; } },
    { key: 'sold_14d', label: function () { return 'Sold ' + AC.lastDays + 'd'; }, sorts: 'units from ads over the window',
      val: function (r) { return acNum(r.sold_14d); }, cell: function (r) { return r.sold_14d || 0; } }
  ];

  function acCol(key) {
    for (var i = 0; i < AC_COLS.length; i++) { if (AC_COLS[i].key === key) { return AC_COLS[i]; } }
    return null;
  }
  function acLabel(c) { return typeof c.label === 'function' ? c.label() : c.label; }
  function acSortRestore() {
    try {
      var raw = localStorage.getItem(AC_SORT_KEY);
      if (!raw) { return; }
      var s = JSON.parse(raw);
      if (s && acCol(s.key)) { AC.sort = { key: s.key, dir: Number(s.dir) < 0 ? -1 : 1 }; }
    } catch (e) {}
  }
  function acSortSave() { try { localStorage.setItem(AC_SORT_KEY, JSON.stringify(AC.sort)); } catch (e) {} }
  function acSortRows(rows) {
    var out = rows.slice();
    var col = AC.sort.key ? acCol(AC.sort.key) : null;
    if (!col) {
      /* Nothing chosen: the board's own order, reproduced key for key — waste rows first, then the
         biggest spend today, then the biggest spend over the window. That third key is not decoration:
         every listing on the board for its window spend alone has nought spend today, so without it a
         long tail of rows ties and their order depends on the sort being a stable one. */
      return out.sort(function (a, b) {
        var wa = a.waste ? 1 : 0, wb = b.waste ? 1 : 0;
        if (wa !== wb) { return wb - wa; }
        var sa = acNum(a.spend_today) || 0, sb = acNum(b.spend_today) || 0;
        if (sa !== sb) { return sb - sa; }
        return (acNum(b.spend_14d) || 0) - (acNum(a.spend_14d) || 0);
      });
    }
    var dir = AC.sort.dir;
    return out.sort(function (a, b) {
      var va = col.val(a), vb = col.val(b);
      if (col.text) {
        va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase();
        if (!va && vb) { return 1; }
        if (va && !vb) { return -1; }                          /* an empty name sinks either way */
        return va < vb ? -dir : (va > vb ? dir : 0);
      }
      if (va == null && vb == null) { return 0; }
      if (va == null) { return 1; }
      if (vb == null) { return -1; }                           /* nulls sink whichever way we sort */
      return (va - vb) * dir;
    });
  }
  function acPaintItems() {
    var box = $('acItems');
    if (!box) { return; }
    var rows = AC.items || [];
    if (!rows.length) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">No ad activity recorded yet today \u2014 the first intraday report lands within ~10 minutes of the day starting.</div>';
      return;
    }
    var h = '<div class="scroll"><table class="acc-tbl"><thead><tr>' + AC_COLS.map(function (c) {
      var on = AC.sort.key === c.key;
      return '<th class="acc-s" data-ac-k="' + esc(c.key) + '" title="' + esc('Sort by ' + c.sorts) + '">' +
        esc(acLabel(c)) + (on ? '<span class="acc-ar">' + (AC.sort.dir < 0 ? '\u25bc' : '\u25b2') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>';
    acSortRows(rows).forEach(function (r) {
      h += '<tr' + (r.waste ? ' class="ac-waste"' : '') + '>' +
        AC_COLS.map(function (c) { return '<td>' + c.cell(r) + '</td>'; }).join('') + '</tr>';
    });
    h += '</tbody></table></div>';
    box.innerHTML = h;
    var ths = box.querySelectorAll('th[data-ac-k]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-ac-k'), col = acCol(k);
      if (!col) { return; }
      if (AC.sort.key === k) { AC.sort.dir = -AC.sort.dir; }
      else { AC.sort = { key: k, dir: col.text ? 1 : -1 }; }
      acSortSave();
      acPaintItems();
    };
  }

  function acLoad() {
    var box = $('acBody');
    if (!box) { return; }
    var payload = { days: AC.days };
    if (AC.acct) { payload.account = AC.acct; }
    if (AC.from && AC.to) { payload.from = AC.from; payload.to = AC.to; }
    api('adsBoard', payload).then(function (d) {
      d = d || {};
      var c = d.combined || {};
      var h = '<div class="ac-tiles">' +
        '<div class="ac-tile gold"><div class="k">Spend today · all accounts</div><div class="v">' + acGBP(c.spend_today) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Clicks today</div><div class="v">' + (c.clicks_today || 0) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Sold via ads today</div><div class="v">' + (c.sold_today || 0) + '</div></div>' +
        '<div class="ac-tile' + (c.waste_n ? ' bad' : '') + '"><div class="k">Wasting £3+ · no order</div><div class="v">' + (c.waste_n || 0) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Spend · ' + (d.days || 14) + ' days</div><div class="v">' + acGBP(c.spend_14d) + '</div></div>' +
      '</div>';
      /* R7-8 (Hasib): "organic vs promoted sales stats everywhere". Promoted = eBay-attributed
         ad revenue; organic = the rest. Combined bar + per-account split over the window. */
      var sp = d.split_total || {}, spl = d.split || [];
      if (Number(sp.total_rev)) {
        var promoPct = Number(sp.promoted_pct) || 0, orgPct = Number(sp.organic_pct);
        if (!isFinite(orgPct)) { orgPct = 100 - promoPct; }
        var rangeLabel = (d.from && d.to) ? (String(d.from) + ' → ' + String(d.to)) : ('last ' + (d.days || 14) + ' days');
        h += '<div class="ac-split"><div class="ac-split-h">Organic vs promoted sales · ' + esc(rangeLabel) + '</div>' +
          '<div class="ac-bar"><span class="ac-bar-p" style="width:' + Math.max(0, Math.min(100, promoPct)) + '%"></span></div>' +
          '<div class="ac-bar-lg"><span class="ac-lg-p"><b>Promoted</b> ' + acGBP(sp.promoted_rev) + ' · ' + promoPct.toFixed(1) + '%</span>' +
          '<span class="ac-lg-o"><b>Organic</b> ' + acGBP(sp.organic_rev) + ' · ' + orgPct.toFixed(1) + '%</span>' +
          '<span class="ac-bar-tot">Total ' + acGBP(sp.total_rev) + '</span></div>';
        if (spl.length > 1 && !AC.acct) {
          h += '<div class="scroll" style="max-height:220px;margin-top:8px"><table class="acc-tbl" style="min-width:480px"><thead><tr>' +
            '<th style="text-align:left">Account</th><th>Total</th><th>Promoted</th><th>Organic</th><th>Promoted %</th></tr></thead><tbody>';
          spl.forEach(function (r) {
            h += '<tr><td style="text-align:left;font-weight:800">' + esc(String(r.account)) + '</td>' +
              '<td>' + acGBP(r.total_rev) + '</td><td>' + acGBP(r.promoted_rev) + '</td><td>' + acGBP(r.organic_rev) + '</td>' +
              '<td style="font-weight:800;color:' + (Number(r.promoted_pct) > 60 ? 'var(--warn)' : 'var(--text)') + '">' + (Number(r.promoted_pct) || 0).toFixed(1) + '%</td></tr>';
          });
          h += '</tbody></table></div>';
        }
        h += '<div class="ac-split-note">Promoted is what eBay credits to the ads; organic is the rest of the sale revenue. From the finance feed, over the window above.</div></div>';
      }
      /* the history — every previous day's spend, clicks and ad-attributed sales in the window */
      var ser = d.series || [];
      if (ser.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:4px 0 4px">Day by day · last ' + (d.days || 14) + '</div>' +
          '<div class="scroll" style="max-height:220px;margin-bottom:14px"><table class="acc-tbl" style="min-width:520px"><thead><tr>' +
          '<th>Date</th><th>Spend</th><th>Ad revenue</th><th>ROAS</th><th>Clicks</th><th>Avg CPC</th><th>Sold via ads</th></tr></thead><tbody>';
        ser.forEach(function (r) {
          h += '<tr><td style="text-align:left">' + esc(String(r.date)) + '</td>' +
            '<td>' + acGBP(r.spend) + '</td>' +
            '<td>' + (Number(r.rev) ? acGBP(r.rev) : '\u2014') + '</td>' +
            '<td>' + acROAS(r.rev, r.spend) + '</td>' +
            '<td>' + (r.clicks || 0) + '</td>' +
            '<td>' + (Number(r.clicks) ? acGBP(Number(r.spend) / Number(r.clicks)) : '\u2014') + '</td>' +
            '<td>' + (r.sold || 0) + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      /* account-to-account, day by day (review 3): every account's spend, revenue and ROAS
         per day inside the chosen window */
      var sba = d.series_by_account || [];
      if (sba.length && !AC.acct) {
        var byA = {};
        sba.forEach(function (r) { (byA[r.account] = byA[r.account] || []).push(r); });
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:4px 0 4px">Account to account \u00b7 spend / revenue / ROAS per day</div>' +
          '<div class="scroll" style="max-height:260px;margin-bottom:14px"><table class="acc-tbl" style="min-width:560px"><thead><tr>' +
          '<th style="text-align:left">Account</th><th>Days</th><th>Spend</th><th>Ad revenue</th><th>ROAS</th><th>Worst day</th><th>Best day</th></tr></thead><tbody>';
        Object.keys(byA).forEach(function (a) {
          var list = byA[a];
          var sp = 0, rv = 0, worst = null, best = null;
          list.forEach(function (r) {
            sp += Number(r.spend) || 0; rv += Number(r.rev) || 0;
            var ro = Number(r.spend) > 0.005 ? Number(r.rev) / Number(r.spend) : null;
            if (ro !== null) {
              if (!worst || ro < worst.ro) { worst = { d: r.date, ro: ro }; }
              if (!best || ro > best.ro) { best = { d: r.date, ro: ro }; }
            }
          });
          h += '<tr><td style="text-align:left;font-weight:800">' + esc(a) + '</td><td>' + list.length + '</td>' +
            '<td>' + acGBP(sp) + '</td><td>' + acGBP(rv) + '</td>' +
            '<td style="font-weight:800;color:' + (sp > 0.005 && rv / sp < 5 ? 'var(--warn)' : 'var(--ok)') + '">' + acROAS(rv, sp) + '</td>' +
            '<td>' + (worst ? esc(String(worst.d).slice(5)) + ' \u00b7 ' + worst.ro.toFixed(1) + '\u00d7' : '\u2014') + '</td>' +
            '<td>' + (best ? esc(String(best.d).slice(5)) + ' \u00b7 ' + best.ro.toFixed(1) + '\u00d7' : '\u2014') + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<div class="ac-accs">' + (d.accounts || []).map(function (a) {
        return '<div class="ac-acc">' + esc(String(a.account)) + '<b>' + acGBP(a.spend) + ' today</b>' +
          a.clicks + ' clicks · ' + a.sold + ' sold' + (a.waste_n ? '<div class="w">' + a.waste_n + ' wasting</div>' : '') + '</div>';
      }).join('') + '</div>';
      /* the per-item board is painted on its own so a sort can redraw it without asking the engine again */
      AC.items = (d.items || []).filter(function (r) { return r && typeof r === 'object'; });
      AC.lastDays = Number(d.days) || 14;
      h += '<div id="acItems"></div>';
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Snapshot ' +
        esc(String(d.updated_at || '—')) + ' UTC · ' + esc(String(d.note || '')) + '</p>';
      box.innerHTML = h;
      acPaintItems();
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not load the board.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.adsCentre = {
    label: 'Ads command centre',
    order: 7.5,
    roles: AC_ROLES,
    icon: '<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
    prefetch: function () { return api('adsBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Ads <span class="goldtext">command centre</span></h1>' +
          '<span class="sub">every advertised item, live CPC, the waste alarm, and every previous day — combined, per account, per item</span>' +
          '<span style="margin-left:auto;display:flex;gap:6px">' +
            '<button class="minibtn" data-ac-d="3">3d</button>' +
            '<button class="minibtn" data-ac-d="7">7d</button>' +
            '<button class="minibtn on" data-ac-d="14">14d</button>' +
            '<button class="minibtn" data-ac-d="30">30d</button>' +
            '<button class="minibtn" data-ac-d="60">60d</button>' +
            '<select id="acAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
            '<input type="date" id="acFrom" class="minibtn" style="padding:5px 6px"><input type="date" id="acTo" class="minibtn" style="padding:5px 6px">' +
            '<button class="minibtn" id="acApply">Apply</button>' +
            '<button class="minibtn" id="acRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="acBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      acSortRestore();
      var rf = $('acRefresh');
      if (rf) { rf.onclick = function () { AC.from = ''; AC.to = ''; acLoad(); }; }
      var sel = $('acAcct');
      if (sel) {
        fillAccountSelect(sel, AC.acct || '', function () { AC.acct = sel.value; acLoad(); });
      }
      var ap = $('acApply');
      if (ap) {
        ap.onclick = function () {
          var f = $('acFrom'), t = $('acTo');
          if (f && t && f.value && t.value) { AC.from = f.value; AC.to = t.value; acLoad(); }
          else { toast('Pick both dates first.'); }
        };
      }
      document.querySelectorAll('[data-ac-d]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-ac-d]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          AC.days = Number(this.getAttribute('data-ac-d')) || 14;
          acLoad();
        };
      });
      acLoad();
      if (AC.timer) { clearInterval(AC.timer); }
      AC.timer = setInterval(function () { if ($('acBody') && STATE.idToken) { acLoad(); } else { clearInterval(AC.timer); AC.timer = null; } }, 120000);
    }
  };
})();
