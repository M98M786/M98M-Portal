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
    '.alx-suplink:hover{background:var(--gold-soft, var(--blue-soft))}' +
    /* 31 Oct (owner): "advertising history page embedded option in active listings" — the Product
       history, folded open under its own row */
    '.alx-ahbtn{white-space:nowrap}.alx-ahbtn.on{border-color:var(--gold-a);color:var(--gold-a)}' +
    '.alx-tbl tbody tr.alx-ahrow:hover{background:transparent}.alx-ahrow>td{padding:0 12px 14px;vertical-align:top}' +
    /* the listings table scrolls sideways; the panel sticks to the visible width so it reads without scrolling */
    '.alx-ah{border:1px solid var(--gold-line-hi);border-radius:12px;padding:12px 14px;background:var(--panel-2);white-space:normal;position:sticky;left:12px;box-sizing:border-box}' +
    '.alx-ah h4{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin:10px 0 5px;font-weight:800}.alx-ah h4:first-child{margin-top:0}' +
    '.alx-ah-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:4px}.alx-ah-head b{font-size:13px}' +
    '.alx-ah-head a{color:var(--gold-a);font-weight:700;text-decoration:none;font-size:12px}' +
    '.alx-ah-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}' +
    '.alx-ah-tbl{width:100%;border-collapse:collapse;font-size:11.5px}.alx-ah-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);padding:4px 6px;text-align:right;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.alx-ah-tbl td{padding:4px 6px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.alx-ah-tbl th.l,.alx-ah-tbl td.l{text-align:left}.alx-ah-tbl td.w{white-space:normal}' +
    '.alx-ah-tag{display:inline-block;font-size:10px;font-weight:800;border-radius:99px;padding:1px 7px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}' +
    '.alx-ah-tag.on{border-color:rgba(72,199,142,.5);color:var(--ok)}.alx-ah-tag.off{border-color:rgba(255,159,67,.55);color:var(--warn)}.alx-ah-tag.gone{color:var(--text-3)}' +
    '.alx-ah-bar{display:inline-block;height:9px;background:var(--gold-a);border-radius:2px;vertical-align:middle;opacity:.75}' +
    '.alx-ah-ev{font-size:11.5px;font-weight:600;padding:3px 0;border-bottom:1px solid var(--gold-line)}.alx-ah-ev .t{color:var(--text-3);font-weight:700;font-size:10.5px;margin-right:6px}' +
    '.alx-ah-note{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:6px;line-height:1.5}'
  );

  function axStr(v) { return String(v == null ? '' : v).trim(); }
  function axGBP(v) { var n = Number(v); return isFinite(n) && n !== 0 ? '£' + n.toFixed(2) : '—'; }

  var ALX = { account: '', rows: [], q: '', tab: 'all', ah: {}, ahOpen: {} };

  /* The advertising history is the ad tool's own Product history read (adtoolListing) — the same
     roles the tool admits (Management, Ops Head, Advertising Manager, super); the engine refuses
     anyone else, so the button is not drawn for them. */
  var ALX_AH_ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  function alxCanAds() { var u = STATE.user || {}; return ALX_AH_ROLES.indexOf(String(u.role || '')) >= 0 || !!u.super; }
  function axMoney(v, dash) { if (v === null || v === undefined || v === '' || isNaN(Number(v))) { return dash || '—'; } var n = Number(v); return (n < 0 ? '−£' : '£') + Math.abs(n).toFixed(2); }
  function axRoas(v) { return (v === null || v === undefined || v === '' || isNaN(Number(v))) ? '—' : Number(v).toFixed(2) + '×'; }
  function axWhen(s) { s = axStr(s).replace('T', ' '); return s ? s.slice(0, 16) : '—'; }
  function axStateTag(c) {
    var st = axStr(c.ad_state || c.ad_status || '').toUpperCase();
    var cls = c.archived ? 'gone' : (c.live || /^ACTIVE/.test(st)) ? 'on' : /PAUSED|ENDED|ARCHIVED/.test(st) ? 'off' : '';
    return '<span class="alx-ah-tag ' + cls + '">' + esc(st || (c.live ? 'LIVE' : 'unknown')) + '</span>';
  }

  function alxAhToggle(id, btn) {
    var box = $('alxBody');
    if (!box) { return; }
    var row = box.querySelector('tr[data-alx-ahp="' + id + '"]');
    if (!row) { return; }
    var open = !row.classList.contains('hidden');
    if (open) { row.classList.add('hidden'); ALX.ahOpen[id] = false; if (btn) { btn.classList.remove('on'); btn.textContent = 'Ad history'; } return; }
    row.classList.remove('hidden'); ALX.ahOpen[id] = true;
    if (btn) { btn.classList.add('on'); btn.textContent = 'Hide history'; }
    var cell = row.firstChild;
    if (ALX.ah[id]) { cell.innerHTML = alxAhRender(ALX.ah[id]); return; }
    cell.innerHTML = '<div class="alx-ah"' + alxAhWidth() + '><div class="spinner"></div></div>';
    api('adtoolListing', { item_id: id }).then(function (d) {
      ALX.ah[id] = d || {};
      var c2 = box.querySelector('tr[data-alx-ahp="' + id + '"]');
      if (c2) { c2.firstChild.innerHTML = alxAhRender(ALX.ah[id]); }
    }).catch(function (e) {
      var c2 = box.querySelector('tr[data-alx-ahp="' + id + '"]');
      if (c2) { c2.firstChild.innerHTML = '<div class="alx-ah"' + alxAhWidth() + '><b>No advertising history for ' + esc(id) + '</b><div class="alx-ah-note">' + esc(e.message) + '</div></div>'; }
    });
  }

  /* The embedded page: where its ads sit (and what each ad said when last read), the by-period
     spend / units-from-ads / ROAS / profit, every ad status change the tool has seen, the last
     14 days day by day, and the tool's own notes — plus the way to the full Product history. */
  function alxAhWidth() {
    var box = $('alxBody'), sc = box ? box.querySelector('.scroll') : null;
    var w = sc ? sc.clientWidth - 26 : 0;
    return w > 320 ? ' style="max-width:' + w + 'px"' : '';
  }
  function alxAhRender(D) {
    var H = D.header || {}, K = D.kpis || {}, id = axStr(H.item_id || D.item_id);
    var Wr = D.where && D.where.rows ? D.where.rows : null, C = D.campaigns || [];
    var hist = (D.where && D.where.history) || [];
    var h = '<div class="alx-ah"' + alxAhWidth() + '><div class="alx-ah-head"><b>Advertising history</b>' +
      '<span class="alx-sup">' + esc(axStr(H.status) || 'ACTIVE') + '</span>' +
      (H.first_ad_day ? '<span class="alx-sup">first ad day ' + esc(axStr(H.first_ad_day)) + '</span>' : '<span class="alx-sup">never advertised</span>') +
      (H.last_ad_day ? '<span class="alx-sup">last ' + esc(axStr(H.last_ad_day)) + '</span>' : '') +
      (H.margin !== undefined && H.margin !== null ? '<span class="alx-sup">margin before ads ' + axMoney(H.margin) + '</span>' : '') +
      (H.breakeven_roas ? '<span class="alx-sup">break-even ROAS ' + axRoas(H.breakeven_roas) + '</span>' : '') +
      '<span style="margin-left:auto;display:flex;gap:10px">' +
      '<a href="#adtoolProduct/' + esc(id) + '" data-adt-open="' + esc(id) + '">Open the full Product history</a>' +
      '<a href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener" title="in a new tab">↗</a></span></div>';
    h += '<div class="alx-ah-grid">';
    /* where its ads sit */
    var rows = Wr || C;
    h += '<div><h4>Where its ads sit</h4>';
    if (!rows.length) { h += '<div class="alx-ah-note">Not in any campaign.</div>'; }
    else {
      h += '<table class="alx-ah-tbl"><thead><tr><th class="l">Campaign</th><th class="l">Type</th><th class="l">Campaign</th><th class="l">This ad</th><th>Rate</th><th>Spend 7d</th><th>Units 7d</th><th class="l">Last change</th></tr></thead><tbody>';
      rows.forEach(function (c) {
        var fund = axStr(c.funding || c.funding_model);
        h += '<tr><td class="l w" style="max-width:220px">' + (typeof adtCampaignLink === 'function' ? adtCampaignLink(c.campaign_id || c.id, c.name) : esc(axStr(c.name))) + '</td>' +
          '<td class="l">' + esc(fund === 'COST_PER_CLICK' ? 'CPC' : fund === 'COST_PER_SALE' ? 'General' : fund || '?') + '</td>' +
          '<td class="l">' + esc(axStr(c.campaign_status || c.status) || '—') + '</td>' +
          '<td class="l">' + axStateTag(c) + '</td>' +
          '<td>' + (axStr(c.ad_bid || c.bid_pct || c.campaign_bid || c.bid) ? esc(axStr(c.ad_bid || c.bid_pct || c.campaign_bid || c.bid)) + '%' : '—') + '</td>' +
          '<td>' + (c.spend_7d !== undefined ? axMoney(c.spend_7d) : '—') + '</td><td>' + (c.units_7d !== undefined && c.units_7d !== null ? c.units_7d : '—') + '</td>' +
          '<td class="l">' + esc(axWhen(c.last_change)) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    /* status changes — the history itself */
    h += '<h4>Ad status changes' + (hist.length ? ' · ' + hist.length : '') + '</h4>';
    if (!hist.length) { h += '<div class="alx-ah-note">No status change recorded yet (the tool writes one every time eBay\'s answer for this ad differs from the last reading).</div>'; }
    else {
      h += hist.slice(0, 14).map(function (x) {
        return '<div class="alx-ah-ev"><span class="t">' + esc(axWhen(x.seen_at)) + '</span>' + esc(axStr(x.name).slice(0, 40)) + ' · ' +
          '<span class="alx-ah-tag ' + (/ACTIVE/i.test(axStr(x.from_status)) ? 'on' : 'off') + '">' + esc(axStr(x.from_status) || 'new') + '</span> → ' +
          '<span class="alx-ah-tag ' + (/ACTIVE/i.test(axStr(x.to_status)) ? 'on' : /PAUSED|ENDED|ARCHIVED|removed/i.test(axStr(x.to_status)) ? 'off' : '') + '">' + esc(axStr(x.to_status) || 'removed') + '</span>' +
          (axStr(x.source) && axStr(x.source) !== 'sync' ? ' <span class="t">' + esc(axStr(x.source)) + '</span>' : '') + '</div>';
      }).join('');
      if (hist.length > 14) { h += '<div class="alx-ah-note">' + (hist.length - 14) + ' earlier changes on the full page.</div>'; }
    }
    h += '</div>';
    /* by period + the last 14 days */
    var per = [['Today so far', K.today], ['Yesterday', K.yesterday], ['Last 7 days', K.d7], ['Last 30 days', K.d30], ['All time', K.all]].filter(function (x) { return x[1] && typeof x[1] === 'object'; });
    h += '<div><h4>By period</h4><table class="alx-ah-tbl"><thead><tr><th class="l">Period</th><th>Ad spend</th><th>Units from ads</th><th>ROAS</th><th>Units</th><th>Profit</th></tr></thead><tbody>' +
      per.map(function (x) {
        var s = x[1], roasV = s.roas != null ? s.roas : (Number(s.spend) > 0 && s.attr_revenue != null ? Number(s.attr_revenue) / Number(s.spend) : null);
        var prof = s.actual_profit !== undefined ? s.actual_profit : s.actual;
        return '<tr><td class="l">' + esc(x[0]) + (s.provisional || s.includes_today ? ' <span class="t" style="color:var(--text-3)">· still updating</span>' : '') + '</td>' +
          '<td>' + axMoney(s.spend) + '</td><td>' + (s.attr_units || 0) + '</td><td>' + axRoas(roasV) + '</td><td>' + (s.units || 0) + '</td>' +
          '<td>' + (prof === undefined ? '—' : (typeof adtProfitCell === 'function' ? adtProfitCell(prof, s.pending_cost_orders !== undefined ? s.pending_cost_orders : s.pending, s.pending_fee_orders) : axMoney(prof))) + '</td></tr>';
      }).join('') + '</tbody></table>';
    var days = (D.days || []).slice(-14);
    if (K.today && typeof K.today === 'object' && K.today.day) { days = days.concat([Object.assign({ day: K.today.day, today: true }, K.today)]); }
    var maxSpend = days.reduce(function (m, r) { return Math.max(m, Number(r.spend) || 0); }, 0);
    h += '<h4>Last 14 days</h4>';
    if (!days.length) { h += '<div class="alx-ah-note">No day-by-day figures yet for this listing.</div>'; }
    else {
      h += '<table class="alx-ah-tbl"><thead><tr><th class="l">Day</th><th class="l">Spend</th><th>Clicks</th><th>Units from ads</th><th>Units</th><th>Profit</th></tr></thead><tbody>' +
        days.slice().reverse().map(function (r) {
          var sp = Number(r.spend) || 0, w = maxSpend > 0 ? Math.round(sp / maxSpend * 70) : 0;
          var prof = r.actual_profit !== undefined ? r.actual_profit : r.actual;
          return '<tr><td class="l">' + esc(axStr(r.day).slice(5)) + (r.today ? ' <span style="color:var(--text-3)">today</span>' : '') + '</td>' +
            '<td class="l"><span class="alx-ah-bar" style="width:' + w + 'px"></span> ' + (r.spend === null || r.spend === undefined ? '<span style="color:var(--text-3)">not read yet</span>' : axMoney(sp, '£0.00')) + '</td>' +
            '<td>' + (r.clicks === null || r.clicks === undefined ? '—' : Number(r.clicks) || 0) + '</td><td>' + (Number(r.attr_units) || 0) + '</td><td>' + (Number(r.units) || 0) + '</td>' +
            '<td>' + (prof === null || prof === undefined ? '—' : axMoney(prof)) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    h += '</div></div>';
    /* the tool's own notes on this listing */
    var acts = D.actions || [];
    if (acts.length) {
      h += '<h4>Notes & actions · ' + acts.length + '</h4>' + acts.slice(0, 6).map(function (a) {
        return '<div class="alx-ah-ev"><span class="t">' + esc(axWhen(a.at)) + ' · ' + esc(axStr(a.by_email).split('@')[0]) + ' · ' + esc(axStr(a.type)) + '</span>' + esc(axStr(a.note).slice(0, 160)) + '</div>';
      }).join('');
    }
    h += '<div class="alx-ah-note">Profit is the item\'s own under the Sales Analysis law (after eBay fees, product cost, ad spend and returns). Ad status is what eBay said when that campaign\'s ads were last read; a status change is written down each time the answer differs. Charts, week-to-week behaviour and the hour map are on the full Product history.</div>';
    return h + '</div>';
  }

  /* 30 Aug (owner): "in active listings ... 'New listings' (listed in last 7 days), 'No sales
     in 7 days', 'Top items' (sales history of more than 30 units)". One fleet, four lenses. */
  var ALX_TABS = [
    { key: 'all', label: 'All listings' },
    { key: 'new7', label: 'New listings · 7d' },
    { key: 'nosale7', label: 'No sales in 7 days' },
    { key: 'top', label: 'Top items · 30+ sold' },
    { key: 'rate', label: 'Best weekly average' }   // 18 Oct (owner): weekly average across all weeks
  ];
  function alxBornMs(r) { var t = Date.parse(axStr(r.born)); return isFinite(t) ? t : 0; }
  function alxTabFilter(rows, tab) {
    var now = Date.now(), wk = 7 * 86400000;
    if (tab === 'new7') {
      return rows.filter(function (r) { var b = alxBornMs(r); return b && (now - b) <= wk; })
        .sort(function (a, b) { return alxBornMs(b) - alxBornMs(a); });
    }
    if (tab === 'nosale7') {
      /* a listing younger than 7 days belongs to New, not here — it never had 7 days to sell */
      return rows.filter(function (r) { var b = alxBornMs(r); return !(Number(r.sold_7d) > 0) && (!b || (now - b) > wk); });
    }
    if (tab === 'top') {
      return rows.filter(function (r) { return (Number(r.sold_qty) || 0) >= 30; })
        .sort(function (a, b) { return (Number(b.sold_qty) || 0) - (Number(a.sold_qty) || 0); });
    }
    if (tab === 'rate') {
      return rows.filter(function (r) { return Number(r.avg_week) > 0; })
        .sort(function (a, b) { return (Number(b.avg_week) || 0) - (Number(a.avg_week) || 0); });
    }
    return rows;
  }
  function alxDate(r) {
    var t = alxBornMs(r);
    if (!t) { return '—'; }
    var d = new Date(t);
    var days = Math.max(0, Math.floor((Date.now() - t) / 86400000));
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate() +
      '<div style="font-size:10px;color:var(--text-3)">' + (days === 0 ? 'today' : days + 'd live') + '</div>';
  }

  /* 18 Oct (owner): "weekly average sales of all items in active listings — across all weeks".
     The engine does the arithmetic: our own orders for the item over the weeks it has been live
     within the order history (eBay's sold_qty resets on a quantity revision, so it is not the
     base). Under the rate: how many units that is, over how many weeks. */
  function alxAvgWeek(r) {
    if (r.avg_week === undefined) { return '<span style="color:var(--text-3)" title="The engine release carrying this column has not landed yet">—</span>'; }
    var v = Number(r.avg_week), wk = Number(r.weeks_covered) || 0, tot = Number(r.sold_all) || 0;
    var main = (r.avg_week === null || !isFinite(v)) ? '—' : (v >= 10 ? String(Math.round(v)) : v.toFixed(1));
    return '<span' + (v > 0 ? '' : ' class="alx-neg"') + ' title="' + tot + ' unit(s) in our orders since ' + esc(axStr(r.rate_since) || 'the listing went live') + '">' + main + '</span>' +
      '<div style="font-size:10px;color:var(--text-3);font-weight:600;white-space:nowrap">' + tot + ' sold · ' + (wk >= 1.05 ? Math.round(wk) + ' wks' : '1 wk') + '</div>';
  }

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
    var chips = $('alxTabs');
    if (chips) {
      chips.innerHTML = ALX_TABS.map(function (t) {
        var n = alxTabFilter(ALX.rows, t.key).length;
        return '<button class="minibtn' + (ALX.tab === t.key ? ' on' : '') + '" data-alx-tab="' + t.key + '">' +
          esc(t.label) + ' <span style="opacity:.7">' + n + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(chips.querySelectorAll('[data-alx-tab]'), function (b) {
        b.onclick = function () { ALX.tab = this.getAttribute('data-alx-tab'); alxPaint(); };
      });
    }
    var all = alxTabFilter(ALX.rows, ALX.tab);
    var q = axStr(ALX.q).toLowerCase();
    if (q) {
      all = all.filter(function (r) {
        return (axStr(r.item_id) + ' ' + axStr(r.title) + ' ' + axStr(r.campaign_type) + ' ' + axStr(r.campaign_name)).toLowerCase().indexOf(q) >= 0;
      });
    }
    var cnt = $('alxCount');
    if (cnt) { cnt.textContent = all.length + (q || ALX.tab !== 'all' ? ' of ' + ALX.rows.length : '') + ' listing(s)'; }
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
    var canAh = alxCanAds();
    var cols = 13 + (hasOE ? 1 : 0) + (hasProfit ? 1 : 0) + (hasAds ? 1 : 0) + (hasCampaign ? 1 : 0) + (canAh ? 1 : 0);
    var h = '<div class="scroll"><table class="alx-tbl"><thead><tr>' +
      '<th></th><th>Item</th><th>Account</th><th>Listed</th><th>Price</th><th>Qty</th><th>Sold yet</th><th title="Average units per week across every week the listing has been live in our order history">Avg / week</th><th>7d</th><th>14d</th><th>30d</th>' +
      (hasOE ? '<th>Order earning</th>' : '') +
      (hasProfit ? '<th>Profit</th>' : '') +
      (hasAds ? '<th>Ads 14d</th>' : '') +
      (hasCampaign ? '<th>Campaign</th>' : '') +
      '<th>Suppliers</th><th>Source</th>' + (canAh ? '<th></th>' : '') + '</tr></thead><tbody>';
    all.forEach(function (r) {
      var img = axStr(r.image);
      /* The chip answers "where did this ROW come from": a row eBay itself synced is API, even
       * though its sheet facts ride along. Only a row with no API sync at all is SHEET (Sir
       * Hasib's bridge). Reading items_facts.source here made every listing claim SHEET. */
      var src = axStr(r.api_synced_at) ? 'API' : 'SHEET';
      h += '<tr>' +
        '<td>' + (img && safeUrl(img) ? '<img class="alx-img" loading="lazy" src="' + esc(safeUrl(img)) + '" alt="">' : '<div class="alx-img"></div>') + '</td>' +
        '<td><a class="alx-title" style="display:block;color:inherit;text-decoration:none" href="https://www.ebay.co.uk/itm/' + esc(axStr(r.item_id)) + '" target="_blank" rel="noopener noreferrer" title="Open on eBay">' + esc(axStr(r.title) || '(no title)') + '</a><div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(axStr(r.item_id)) + '</div></td>' +
        '<td>' + esc(axStr(r.account)) + '</td>' +
        '<td style="white-space:nowrap;font-size:11.5px;font-weight:700">' + alxDate(r) + '</td>' +
        '<td class="alx-num">' + axGBP(r.price) + '</td>' +
        '<td class="alx-num">' + (Number(r.qty) || 0) + '</td>' +
        '<td class="alx-num" style="font-weight:800">' + (Number(r.sold_qty) || 0) + '</td>' +
        '<td class="alx-num" style="font-weight:800">' + alxAvgWeek(r) + '</td>' +
        '<td class="alx-num' + (Number(r.sold_7d) ? '' : ' alx-neg') + '">' + (Number(r.sold_7d) || 0) + '</td>' +
        '<td class="alx-num">' + (Number(r.sold_14d) || 0) + '</td>' +
        '<td class="alx-num">' + (r.sold_30d_live !== undefined ? Number(r.sold_30d_live) : (Number(r.sold_30d) || 0)) + '</td>' +
        (hasOE ? '<td class="alx-num">' + axGBP(r.oe) + '</td>' : '') +
        (hasProfit ? '<td class="alx-num ' + (Number(r.profit) < 0 ? 'alx-neg' : 'alx-pos') + '">' + axGBP(r.profit) + '</td>' : '') +
        (hasAds ? '<td class="alx-num">' + (r.ad_spend_14d !== undefined ? axGBP(r.ad_spend_14d) + (Number(r.ad_units_14d) ? '<div style="font-size:10px;color:var(--text-3)">' + Number(r.ad_units_14d) + ' sold via ads</div>' : '') : '—') + '</td>' : '') +
        (hasCampaign ? '<td>' + esc(axStr(r.campaign_type) || '—') + (axStr(r.campaign_name) ? '<div style="font-size:10.5px;color:var(--text-3)">' + esc(axStr(r.campaign_name)) + '</div>' : '') + '</td>' : '') +
        '<td>' + alxSuppliers(r) + '</td>' +
        '<td><span class="alx-src ' + (src === 'API' ? 'api' : 'sheet') + '">' + src + '</span></td>' +
        (canAh ? '<td><button class="minibtn alx-ahbtn' + (ALX.ahOpen[axStr(r.item_id)] ? ' on' : '') + '" data-alx-ah="' + esc(axStr(r.item_id)) + '">' + (ALX.ahOpen[axStr(r.item_id)] ? 'Hide history' : 'Ad history') + '</button></td>' : '') +
      '</tr>' +
      (canAh ? '<tr class="alx-ahrow' + (ALX.ahOpen[axStr(r.item_id)] ? '' : ' hidden') + '" data-alx-ahp="' + esc(axStr(r.item_id)) + '"><td colspan="' + cols + '">' +
        (ALX.ahOpen[axStr(r.item_id)] && ALX.ah[axStr(r.item_id)] ? alxAhRender(ALX.ah[axStr(r.item_id)]) : '') + '</td></tr>' : '');
    });
    box.innerHTML = h + '</tbody></table></div>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-alx-ah]'), function (b) {
      b.onclick = function () { alxAhToggle(this.getAttribute('data-alx-ah'), this); };
    });
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
          '<div class="alx-bar" id="alxTabs" style="margin-bottom:8px"></div>' +
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
          var cols = ['item_id', 'account', 'title', 'born', 'price', 'qty', 'sold_qty', 'avg_week', 'weeks_covered', 'sold_all', 'sold_7d', 'sold_14d', 'sold_30d_live', 'oe', 'ali_cost', 'profit', 'ad_spend_14d', 'campaign_type', 'campaign_name', 'current_sup', 'sup1_link', 'sup2_link', 'sup3_link', 'category', 'source'];
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
