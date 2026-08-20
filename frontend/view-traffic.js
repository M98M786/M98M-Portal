/* view-traffic.js — Hasib item 11: the account traffic dashboard, from eBay's own Traffic
 * Report. Per-account per-day series, 7/30-day totals, listing drilldown — his Seller Hub
 * traffic screen, inside the portal. */
(function () {

  var TR_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];
  var TR = { account: '', range: 7, mode: '', from: '', to: '' };

  VIEW_CSS.push(
    '.tr-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px}' +
    '.tr-tile{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:var(--panel-2)}' +
    '.tr-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.tr-tile .v{font-size:24px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.tr-bars{display:flex;align-items:flex-end;gap:3px;height:120px;padding:8px 0 4px}' +
    '.tr-bar{flex:1;background:linear-gradient(180deg,var(--blue,#4f7cd9),var(--blue-2,#33549c));border-radius:3px 3px 0 0;min-width:6px;position:relative}' +
    '.tr-bar:hover{opacity:.85}' +
    '.tr-bar span{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:9px;color:var(--text-3);font-weight:700;white-space:nowrap;display:none}' +
    '.tr-bar:hover span{display:block}' +
    '.tr-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}' +
    '.tr-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.tr-tbl th:first-child{text-align:left}' +
    '.tr-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums}' +
    '.tr-tbl td:first-child{text-align:left;min-width:240px;white-space:normal}'
  );

  function trN(v) { var n = Number(v) || 0; return n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

  function trLoad() {
    var box = $('trBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    var payload = { range: TR.range };
    if (TR.account) { payload.account = TR.account; }
    if (TR.mode === 'today') { payload.from = ukToday(); payload.to = ukToday(); }
    else if (TR.mode === 'custom' && TR.from && TR.to) { payload.from = TR.from; payload.to = TR.to; }
    api('trafficBoard', payload).then(function (d) {
      d = d || {};
      // fold per-account day rows into one series when "all accounts"
      var byDay = {};
      (d.days || []).forEach(function (r) {
        var k = r.date;
        var o = (byDay[k] = byDay[k] || { date: k, impressions: 0, views: 0, transactions: 0 });
        o.impressions += Number(r.impressions) || 0;
        o.views += Number(r.views) || 0;
        o.transactions += Number(r.transactions) || 0;
      });
      var series = Object.values(byDay).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var bounded = TR.mode === 'today' || TR.mode === 'custom';
      var win = bounded ? series : series.slice(-TR.range);
      var winLbl = TR.mode === 'today' ? 'today' : TR.mode === 'custom' ? (TR.from + ' \u2192 ' + TR.to) : TR.range + 'd';
      var tot = { impressions: 0, views: 0, transactions: 0 };
      win.forEach(function (r) { tot.impressions += r.impressions; tot.views += r.views; tot.transactions += r.transactions; });
      var ctr = tot.impressions ? (tot.views / tot.impressions * 100) : 0;
      var cvr = tot.views ? (tot.transactions / tot.views * 100) : 0;

      var h = '<div class="tr-tiles">' +
        '<div class="tr-tile"><div class="k">Impressions · ' + esc(winLbl) + '</div><div class="v">' + trN(tot.impressions) + '</div></div>' +
        '<div class="tr-tile"><div class="k">Listing views</div><div class="v">' + trN(tot.views) + '</div></div>' +
        '<div class="tr-tile"><div class="k">Transactions</div><div class="v">' + trN(tot.transactions) + '</div></div>' +
        '<div class="tr-tile"><div class="k">CTR</div><div class="v">' + ctr.toFixed(2) + '%</div></div>' +
        '<div class="tr-tile"><div class="k">Conversion</div><div class="v">' + cvr.toFixed(2) + '%</div></div>' +
      '</div>';

      var max = Math.max.apply(null, win.map(function (r) { return r.impressions; }).concat([1]));
      h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin-bottom:2px">Impressions by day</div>' +
        '<div class="tr-bars">' + win.map(function (r) {
          return '<div class="tr-bar" style="height:' + Math.max(4, Math.round(r.impressions / max * 100)) + '%">' +
            '<span>' + esc(r.date.slice(5)) + ' · ' + trN(r.impressions) + ' imp · ' + trN(r.views) + ' views · ' + r.transactions + ' sold</span></div>';
        }).join('') + '</div>';

      /* review 3: account-to-account, day by day */
      if (!TR.account) {
        var byAcct = {};
        (d.days || []).forEach(function (r) {
          if (bounded || win.some(function (w) { return w.date === r.date; })) {
            (byAcct[r.account] = byAcct[r.account] || []).push(r);
          }
        });
        var accts = Object.keys(byAcct);
        if (accts.length > 1) {
          h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:12px 0 4px">Account to account \u00b7 the window\u2019s totals per day</div>' +
            '<div class="scroll" style="max-height:240px"><table class="tr-tbl" style="min-width:640px"><thead><tr>' +
            '<th>Account</th><th>Days</th><th>Impressions</th><th>Views</th><th>Sold</th><th>CTR</th><th>Conversion</th><th>Best day</th></tr></thead><tbody>';
          accts.forEach(function (a) {
            var t2 = { imp: 0, vw: 0, tx: 0 }; var best = null;
            byAcct[a].forEach(function (r) {
              t2.imp += Number(r.impressions) || 0; t2.vw += Number(r.views) || 0; t2.tx += Number(r.transactions) || 0;
              if (!best || Number(r.transactions) > Number(best.transactions)) { best = r; }
            });
            h += '<tr><td style="font-weight:800">' + esc(a) + '</td><td>' + byAcct[a].length + '</td>' +
              '<td>' + trN(t2.imp) + '</td><td>' + trN(t2.vw) + '</td><td>' + t2.tx + '</td>' +
              '<td>' + (t2.imp ? (t2.vw / t2.imp * 100).toFixed(2) : '0.00') + '%</td>' +
              '<td>' + (t2.vw ? (t2.tx / t2.vw * 100).toFixed(2) : '0.00') + '%</td>' +
              '<td>' + (best ? esc(String(best.date).slice(5)) + ' \u00b7 ' + best.transactions + ' sold' : '\u2014') + '</td></tr>';
          });
          h += '</tbody></table></div>';
        }
      }
      /* review 3: the money leak by name — real reach, nothing landing */
      var lows = d.low_conversion || [];
      if (lows.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--bad);font-weight:800;margin:14px 0 4px">\ud83d\udd3b Low conversion \u00b7 ' + lows.length + ' listing(s) with real views converting under 1% (' + d.range + 'd)</div>' +
          '<div class="scroll" style="max-height:260px"><table class="tr-tbl"><thead><tr>' +
          '<th>Listing</th><th>Views</th><th>Sold</th><th>Conversion</th></tr></thead><tbody>';
        lows.forEach(function (r) {
          h += '<tr><td><a href="https://www.ebay.co.uk/itm/' + esc(String(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
            esc(String(r.title || r.item_id).slice(0, 70)) + '</a>' +
            '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(String(r.item_id)) + ' \u00b7 ' + esc(String(r.account)) + '</div></td>' +
            '<td>' + trN(r.views) + '</td><td>' + (r.transactions || 0) + '</td>' +
            '<td style="color:var(--bad);font-weight:800">' + (Number(r.cvr_l) || 0).toFixed(2) + '%</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      var rows = d.listings || [];
      if (rows.length) {
        h += '<div class="scroll" style="margin-top:14px"><table class="tr-tbl"><thead><tr>' +
          '<th>Listing</th><th>Impressions</th><th>Views</th><th>Sold</th><th>CTR</th><th>Conversion</th></tr></thead><tbody>';
        rows.forEach(function (r) {
          var lctr = r.impressions ? (r.views / r.impressions * 100).toFixed(2) : '0.00';
          var lcvr = r.views ? (r.transactions / r.views * 100).toFixed(2) : '0.00';
          h += '<tr><td><a href="https://www.ebay.co.uk/itm/' + esc(String(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
            esc(String(r.title || r.item_id).slice(0, 80)) + '</a>' +
            '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(String(r.item_id)) + ' · ' + esc(String(r.account)) + '</div></td>' +
            '<td>' + trN(r.impressions) + '</td><td>' + trN(r.views) + '</td><td>' + (r.transactions || 0) + '</td>' +
            '<td>' + lctr + '%</td><td>' + lcvr + '%</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String(d.note || '')) + '</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not load traffic.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.traffic = {
    label: 'Traffic',
    order: 7.6,
    roles: TR_ROLES,
    icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    prefetch: function () { return api('trafficBoard', { range: 7 }); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">traffic</span></h1>' +
          '<span class="sub">impressions, views, CTR and conversion — per account, per day, per listing · eBay’s own Traffic Report</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' +
            '<button class="minibtn' + (TR.mode === 'today' ? ' on' : '') + '" id="trToday">Today</button>' +
            '<button class="minibtn' + (TR.range === 7 && !TR.mode ? ' on' : '') + '" data-tr-r="7">7 days</button>' +
            '<button class="minibtn' + (TR.range === 30 && !TR.mode ? ' on' : '') + '" data-tr-r="30">30 days</button>' +
            '<input type="date" id="trFrom" class="minibtn" style="padding:5px 6px"><input type="date" id="trTo" class="minibtn" style="padding:5px 6px">' +
            '<button class="minibtn" id="trApply">Apply</button>' +
            '<select class="alx-sel" id="trAcc"><option value="">All accounts</option></select>' +
            '<button class="minibtn" id="trRefresh" style="margin-left:auto">Refresh</button></div>' +
          '<div id="trBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      function trChips(el) {
        document.querySelectorAll('[data-tr-r], #trToday').forEach(function (x) { x.classList.remove('on'); });
        if (el) { el.classList.add('on'); }
      }
      document.querySelectorAll('[data-tr-r]').forEach(function (b) {
        b.onclick = function () {
          trChips(this); TR.mode = ''; TR.from = ''; TR.to = '';
          TR.range = Number(this.getAttribute('data-tr-r')) || 7;
          trLoad();
        };
      });
      var td = $('trToday');
      if (td) { td.onclick = function () { trChips(this); TR.mode = 'today'; trLoad(); }; }
      var ap = $('trApply');
      if (ap) {
        ap.onclick = function () {
          var f = $('trFrom'), t = $('trTo');
          if (f && t && f.value && t.value) { trChips(null); TR.mode = 'custom'; TR.from = f.value; TR.to = t.value; trLoad(); }
          else { toast('Pick both dates first.'); }
        };
      }
      cachedCall('accountList', {}, function (d) {
        var sel = $('trAcc');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">All accounts</option>' + (((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
        /* repaints (cached then fresh) must not clobber a selection the user already made */
        if (TR.account) { sel.value = TR.account; }
        sel.onchange = function () { TR.account = String(this.value || ''); trLoad(); };
      });
      var rf = $('trRefresh');
      if (rf) { rf.onclick = trLoad; }
      trLoad();
    }
  };
})();
