/* view-marketing.js — review 4: the Marketing dashboard. Every sale event on every account
 * (name, dates, status, discount, member count), coverage of the "sale on every single item"
 * rule, the 14-day-eligible list, and the ending-soon warnings. Management/Ops/Advertising. */
(function () {

  VIEW_CSS.push(
    '.mk-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:780px}' +
    '.mk-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.mk-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line)}' +
    '.mk-end{background:var(--warn-soft)}' +
    '.mk-st{font-size:10px;font-weight:800;letter-spacing:.05em;padding:2px 8px;border-radius:99px}' +
    '.mk-st.run{background:var(--ok-soft);color:var(--ok)}' +
    '.mk-st.sched{background:var(--blue-soft);color:var(--blue-2)}' +
    '.mk-st.end{background:rgba(120,132,152,.16);color:var(--text-3)}'
  );

  function mkLoad() {
    var box = $('mkBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('marketingBoard', {}).then(function (d) {
      var cov = (d && d.coverage) || {};
      var promos = (d && d.promotions) || [];
      var running = promos.filter(function (p) { return /RUNNING/i.test(String(p.status)); });
      var soon = running.filter(function (p) {
        var t = Date.parse(p.end_at); return isFinite(t) && t - Date.now() > 0 && t - Date.now() <= 2 * 86400000;
      });
      var covPct = cov.active_items ? Math.round((cov.covered / cov.active_items) * 100) : 0;
      var h = '<div class="dr-kpis">' +
        '<div class="dr-kpi"><div class="l">Running sale events</div><div class="v">' + running.length + '</div></div>' +
        '<div class="dr-kpi"><div class="l">Coverage · sale on every item</div><div class="v" style="color:var(--' + (covPct >= 95 ? 'ok' : 'warn') + ')">' + covPct + '%</div>' +
          '<div class="d" style="color:var(--text-3)">' + cov.covered + ' of ' + cov.active_items + ' active listings in a running event</div></div>' +
        '<div class="dr-kpi"><div class="l">Eligible NOW · add them</div><div class="v" style="color:var(--' + (cov.eligible_now ? 'warn' : 'ok') + ')">' + (cov.eligible_now || 0) + '</div>' +
          '<div class="d" style="color:var(--text-3)">uncovered + past the 14-day revision rule</div></div>' +
        '<div class="dr-kpi"><div class="l">Blocked by 14-day rule</div><div class="v">' + (cov.blocked_14d || 0) + '</div>' +
          '<div class="d" style="color:var(--text-3)">revised too recently — clock running</div></div>' +
        '<div class="dr-kpi"><div class="l">Ending within 2 days</div><div class="v" style="color:var(--' + (soon.length ? 'bad' : 'ok') + ')">' + soon.length + '</div>' +
          '<div class="d" style="color:var(--text-3)">management is lettered 2 days out</div></div>' +
        '</div>';
      if (soon.length) {
        h += '<div class="ir-alert"><b style="color:var(--warn)">🟠 Ending soon — arrange the replacement events:</b>';
        soon.forEach(function (p) {
          h += '<div style="margin-top:4px"><b>' + esc(String(p.name || p.promo_id)) + '</b> · ' + esc(String(p.account)) +
            ' · ends ' + esc(String(p.end_at).slice(0, 10)) + ' · ' + (p.item_n || 0) + ' item(s)</div>';
        });
        h += '</div>';
      }
      h += '<div class="scroll"><table class="mk-tbl"><thead><tr>' +
        '<th>Account</th><th>Sale event</th><th>Type</th><th>Status</th><th>Discount</th><th>Items</th><th>Started</th><th>Ends</th></tr></thead><tbody>';
      if (!promos.length) {
        h += '<tr><td colspan="8"><div class="empty">No promotions synced yet — the sync runs hourly at half past (or press "Pull now" on Account health → Engine ops → marketingSync).</div></td></tr>';
      }
      promos.forEach(function (p) {
        var run = /RUNNING/i.test(String(p.status));
        var endSoon = run && (function () { var t = Date.parse(p.end_at); return isFinite(t) && t - Date.now() <= 2 * 86400000; })();
        h += '<tr' + (endSoon ? ' class="mk-end"' : '') + '><td style="font-weight:800">' + esc(String(p.account)) + '</td>' +
          '<td>' + esc(String(p.name || p.promo_id).slice(0, 55)) + '</td>' +
          '<td style="font-size:10.5px;color:var(--text-3)">' + esc(String(p.type).replace(/_/g, ' ').toLowerCase()) + '</td>' +
          '<td><span class="mk-st ' + (run ? 'run' : /SCHEDULED/i.test(String(p.status)) ? 'sched' : 'end') + '">' + esc(String(p.status)) + '</span></td>' +
          '<td>' + esc(String(p.discount || '—')) + '</td>' +
          '<td style="font-weight:800">' + (p.item_n || 0) + '</td>' +
          '<td>' + esc(String(p.start_at).slice(0, 10)) + '</td>' +
          '<td' + (endSoon ? ' style="color:var(--warn);font-weight:800"' : '') + '>' + esc(String(p.end_at).slice(0, 10) || '—') + '</td></tr>';
      });
      h += '</tbody></table></div>';
      var el = (d && d.eligible) || [];
      if (el.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--warn);font-weight:800;margin:14px 0 4px">🟠 Eligible now — in no running event, past the 14-day rule (' + ((d.coverage || {}).eligible_now || el.length) + ')</div>' +
          '<div class="scroll" style="max-height:280px"><table class="mk-tbl"><thead><tr><th>Listing</th><th>Account</th><th>Price</th><th>Last revision seen</th></tr></thead><tbody>';
        el.forEach(function (i) {
          h += '<tr><td><a href="https://www.ebay.co.uk/itm/' + esc(String(i.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
            esc(String(i.title || i.item_id).slice(0, 70)) + '</a><div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(String(i.item_id)) + '</div></td>' +
            '<td>' + esc(String(i.account)) + '</td><td>£' + (Number(i.price) || 0).toFixed(2) + '</td>' +
            '<td style="color:var(--text-3)">' + esc(String(i.last_revised || 'none observed')) + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String((d && d.note) || '')) + '</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">The marketing board did not answer — ' + esc(e.message) + '</div>';
    });
  }

  VIEWS.marketing = {
    label: 'Marketing',
    order: 7.4,
    roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M20 12a8 8 0 1 0-16 0"/><path d="M12 12l4-4"/><path d="M8 21h8"/>',
    prefetch: function () { return api('marketingBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1><span class="goldtext">Marketing</span> — sale events</h1>' +
        '<span class="sub">every sale event on every account · the sale-on-every-item rule · the 14-day revision clock · 2-day ending bells</span>' +
        '<button class="minibtn" id="mkRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd" id="mkBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var rf = $('mkRefresh');
      if (rf) { rf.onclick = mkLoad; }
      mkLoad();
    }
  };
})();
