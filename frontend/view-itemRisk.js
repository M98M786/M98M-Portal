/* view-itemRisk.js — review 3: "a proper return dashboard, item to item … same with item not
 * received … same with late orders". Three boards on one screen, every product folded across
 * accounts by title (a duplicated listing carries a different id per shop), windows
 * today · yesterday · 7d · 30d · all time, reasons inline, and the management decision alerts
 * (>5 returns, >5 INR, >10 late-tracking orders) pinned red at the top. */
(function () {

  var IR = { tab: 'returns', data: null, acct: '' };

  VIEW_CSS.push(
    '.ir-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:820px}' +
    '.ir-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:right;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ir-tbl th:first-child{text-align:left}' +
    '.ir-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums}' +
    '.ir-tbl td:first-child{text-align:left}' +
    '.ir-alert{border:1px solid var(--bad);border-radius:12px;background:var(--bad-soft);padding:12px 14px;margin-bottom:14px;font-size:12.5px}' +
    '.ir-hot{background:var(--bad-soft)}' +
    '.ir-dup{font-size:9.5px;font-weight:800;letter-spacing:.05em;color:var(--warn);border:1px solid rgba(255,159,67,.5);border-radius:99px;padding:1px 7px;margin-left:6px}' +
    '.ir-speed-tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:14px}' +
    '.ir-st{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel-2)}' +
    '.ir-st .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ir-st b{display:block;font-size:20px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}' +
    '.ir-st .p{font-size:11px;color:var(--text-3);font-weight:700}.ir-st.bad b{color:var(--bad)}.ir-st.ok b{color:var(--ok)}'
  );

  /* 1 Oct (owner): "update late tracking with different time frames — 2, 3, 4, 5 days — in which
     time tracking is being uploaded for that item, and how much time orders are really waiting."
     Every order of the last 30 days by the days from the order to its FIRST tracking number;
     "still waiting" = no tracking yet, with how long those orders have waited so far. */
  function irSpeedTable(d) {
    var rows = d.track_speed || [], tot = { all: 0, within2: 0, d3: 0, d4: 0, d5: 0, over5: 0, untracked: 0 };
    rows.forEach(function (r) { Object.keys(tot).forEach(function (k) { tot[k] += Number(r[k]) || 0; }); });
    var pc = function (n) { return tot.all ? Math.round(n / tot.all * 100) + '%' : ''; };
    var h = '<div class="ir-speed-tiles">' + [
      ['Orders · 30 days', tot.all, '', ''], ['Tracked within 2 days', tot.within2, pc(tot.within2), 'ok'], ['Day 3', tot.d3, pc(tot.d3), ''], ['Day 4', tot.d4, pc(tot.d4), ''],
      ['Day 5', tot.d5, pc(tot.d5), ''], ['After 5 days', tot.over5, pc(tot.over5), tot.over5 ? 'bad' : ''], ['Still waiting', tot.untracked, pc(tot.untracked), tot.untracked ? 'bad' : '']
    ].map(function (t) { return '<div class="ir-st ' + t[3] + '"><span class="k">' + t[0] + '</span><b>' + t[1] + '</b>' + (t[2] ? '<span class="p">' + t[2] + ' of orders</span>' : '') + '</div>'; }).join('') + '</div>';
    h += '<div class="scroll"><table class="ir-tbl"><thead><tr><th>#</th><th style="text-align:left">Product · folded across accounts</th><th>Orders 30d</th>' +
      '<th>≤2 days</th><th>3 days</th><th>4 days</th><th>5 days</th><th>&gt;5 days</th><th>Still waiting</th><th>Avg days to tracking</th><th>Waiting now · avg days</th><th>Late share</th></tr></thead><tbody>';
    if (!rows.length) { h += '<tr><td colspan="12" style="text-align:left"><div class="empty">No orders in the last 30 days for this view.</div></td></tr>'; }
    rows.forEach(function (r, i) {
      var hot = r.late_share >= 50 && r.all >= 3;
      h += '<tr' + (hot ? ' class="ir-hot"' : '') + '><td>' + (i + 1) + '</td><td><b>' + esc(String(r.title || r.key).slice(0, 70)) + '</b>' +
        '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + (r.item_ids || []).slice(0, 4).map(function (id) {
          return '<a href="https://www.ebay.co.uk/itm/' + esc(String(id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(String(id)) + '</a>';
        }).join(' · ') + ((r.item_ids || []).length > 4 ? ' +' + (r.item_ids.length - 4) : '') + '</div></td>' +
        '<td style="font-weight:800">' + r.all + '</td><td style="color:var(--ok)">' + (r.within2 || '—') + '</td><td>' + (r.d3 || '—') + '</td><td>' + (r.d4 || '—') + '</td><td>' + (r.d5 || '—') + '</td>' +
        '<td' + (r.over5 ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + (r.over5 || '—') + '</td><td' + (r.untracked ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + (r.untracked || '—') + '</td>' +
        '<td>' + (r.avg_days === null || r.avg_days === undefined ? '—' : r.avg_days + 'd') + '</td><td>' + (r.waiting_avg_days === null || r.waiting_avg_days === undefined ? '—' : r.waiting_avg_days + 'd') + '</td>' +
        '<td' + (hot ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + (r.late_share || 0) + '%</td></tr>';
    });
    return h + '</tbody></table></div><p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Days = from the order to its FIRST tracking number in the tracking ledger. ' +
      '“Still waiting” = no tracking yet; its average is how long those orders have waited so far. Late share = orders not tracked within 2 days. The 2-day marks tab is the permanent ledger of orders that crossed 2 business days untracked.</p>';
  }

  function irLoad() {
    var box = $('irBody');
    if (!box) { return; }
    if (!IR.data) { box.innerHTML = '<div class="spinner"></div>'; }
    api('itemRisk', IR.acct ? { account: IR.acct } : {}).then(function (d) {
      IR.data = d || {};
      irPaint();
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">The board did not answer — ' + esc(e.message) + '</div>';
    });
  }

  function irPaint() {
    var box = $('irBody');
    var d = IR.data;
    if (!box || !d) { return; }
    var a = d.alerts || {};
    var h = '';
    var alerts = [].concat(
      (a.returns5 || []).map(function (x) { return { x: x, w: 'returns' }; }),
      (a.inr5 || []).map(function (x) { return { x: x, w: 'not-received cases' }; }),
      (a.late10 || []).map(function (x) { return { x: x, w: 'late-tracking orders' }; })
    );
    if (alerts.length) {
      h += '<div class="ir-alert"><b style="color:var(--bad)">🔴 ' + alerts.length + ' item(s) need a MANAGEMENT DECISION</b>';
      alerts.slice(0, 10).forEach(function (al) {
        h += '<div style="margin-top:5px"><b>' + esc(String(al.x.title || al.x.key).slice(0, 80)) + '</b>' +
          (al.x.duplicated ? '<span class="ir-dup">DUPLICATED · ' + al.x.item_ids.length + ' listings</span>' : '') +
          ' — <b>' + al.x.all + '</b> ' + al.w + ' across ' + Object.keys(al.x.accounts || {}).length + ' account(s)' +
          (al.x.reasons ? ' · ' + esc(String(al.x.reasons)) : '') + '</div>';
      });
      h += '<div style="margin-top:6px;font-size:11px;color:var(--text-3);font-weight:600">The same alerts land as letters in the Alerts centre, one per tier (5, 10, 15…), so nothing rings twice.</div></div>';
    }

    if (IR.tab === 'speed') { box.innerHTML = h + irSpeedTable(d); return; }
    var list = IR.tab === 'returns' ? (d.returns || []) : IR.tab === 'inr' ? (d.inr || []) : (d.late || []);
    var threshold = IR.tab === 'late' ? 10 : 5;
    var showReasons = IR.tab !== 'late';
    /* his Returns Summary workbook's shape: rank · product · per-account qty columns ·
       reasons "(qty per reason)" · refund £ · % of total */
    var acctSet = {};
    list.forEach(function (r) { Object.keys(r.accounts || {}).forEach(function (a) { acctSet[a] = 1; }); });
    var acctCols = Object.keys(acctSet).sort();
    /* 2 Oct (owner): the per-account headers used only the first word, so "AZHAR ABRT" and
       "Azhar Bhai" both read "Azhar" — two different shops, indistinguishable. Use the first
       word ONLY when it is unique (case-insensitively) across the shown accounts; otherwise the
       full account name. Full name is always on hover. */
    var irFwCount = {};
    acctCols.forEach(function (a) { var fw = String(a).trim().split(/\s+/)[0].toLowerCase(); irFwCount[fw] = (irFwCount[fw] || 0) + 1; });
    function irAcctLabel(a) {
      var parts = String(a).trim().split(/\s+/);
      return irFwCount[parts[0].toLowerCase()] > 1 ? String(a).trim() : parts[0];
    }
    h += '<div class="scroll"><table class="ir-tbl"><thead><tr>' +
      '<th>#</th><th style="text-align:left">Product · folded across accounts</th>' +
      '<th>Today</th><th>Yesterday</th><th>7 days</th><th>30 days</th><th>All time</th>' +
      acctCols.map(function (a) { return '<th title="' + esc(a) + '">' + esc(irAcctLabel(a)) + '</th>'; }).join('') +
      (showReasons ? '<th>Refund £</th><th style="text-align:left">Reasons (qty per reason)</th>' : '') +
      '<th>% of total</th></tr></thead><tbody>';
    if (!list.length) {
      h += '<tr><td colspan="14" style="text-align:left"><div class="empty">' +
        (IR.tab === 'late' ? 'No late-tracking marks yet — counting started 21 Aug; every order that crosses 2 business days untracked lands here permanently.' : 'Nothing recorded.') + '</div></td></tr>';
    }
    list.forEach(function (r, rank) {
      var hot = r.all > threshold;
      h += '<tr' + (hot ? ' class="ir-hot"' : '') + '><td>' + (rank + 1) + '</td>' +
        '<td><b>' + esc(String(r.title || r.key).slice(0, 70)) + '</b>' +
        (r.duplicated ? '<span class="ir-dup">DUPLICATED</span>' : '') +
        (hot ? ' <b style="color:var(--bad)">· DECISION</b>' : '') +
        '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + r.item_ids.slice(0, 4).map(function (id) {
          return '<a href="https://www.ebay.co.uk/itm/' + esc(String(id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(String(id)) + '</a>';
        }).join(' · ') + (r.item_ids.length > 4 ? ' +' + (r.item_ids.length - 4) : '') + '</div></td>' +
        '<td>' + (r.today || '—') + '</td><td>' + (r.yesterday || '—') + '</td>' +
        '<td>' + (r.d7 || '—') + '</td><td>' + (r.d30 || '—') + '</td><td style="font-weight:800">' + r.all + '</td>' +
        acctCols.map(function (a) { var n = (r.accounts || {})[a] || 0; return '<td' + (n ? '' : ' style="color:var(--text-3)"') + '>' + (n || '—') + '</td>'; }).join('') +
        (showReasons
          ? '<td>' + (Number(r.refund) ? '£' + Number(r.refund).toFixed(2) : '—') + '</td>' +
            '<td style="text-align:left;font-size:11px;color:var(--text-2);max-width:260px;white-space:normal">' + esc(String(r.reasons || '')) + '</td>'
          : '') +
        '<td>' + (r.pct || 0) + '%</td></tr>';
    });
    h += '</tbody></table></div>' +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String(d.note || '')) + '</p>';
    box.innerHTML = h;
  }

  VIEWS.itemRisk = {
    label: 'Item risk',
    order: 8.5,
    roles: ['Management', 'Ops Head', 'CS', 'Team Lead', 'Product Hunter', 'Order Processor'],
    icon: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    prefetch: function () { return api('itemRisk', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Item <span class="goldtext">risk</span></h1>' +
        '<span class="sub">returns · item not received · late tracking by 2 / 3 / 4 / 5 days — item by item, across all accounts, with the decision alerts</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px">' +
        [['returns', 'Returns'], ['inr', 'Not received'], ['speed', 'Late tracking'], ['late', '2-day marks']].map(function (t) {
          return '<button class="minibtn' + (IR.tab === t[0] ? ' on' : '') + '" data-ir-t="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
        '<select id="irAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
        '<button class="minibtn" id="irRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="irBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      document.querySelectorAll('[data-ir-t]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-ir-t]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          IR.tab = this.getAttribute('data-ir-t');
          irPaint();
        };
      });
      var sa = $('irAcct');
      if (sa) {
        fillAccountSelect(sa, IR.acct, function () { IR.acct = sa.value; IR.data = null; irLoad(); });
      }
      var rf = $('irRefresh');
      if (rf) { rf.onclick = irLoad; }
      irLoad();
    }
  };
})();
