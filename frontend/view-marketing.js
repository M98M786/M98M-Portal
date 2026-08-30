/* view-marketing.js — review 4: the Marketing dashboard. Every sale event on every account
 * (name, dates, status, discount, member count), coverage of the "sale on every single item"
 * rule, the 14-day-eligible list, and the ending-soon warnings. Management/Ops/Advertising. */
(function () {

  var MK = { acct: '', status: 'RUNNING', type: '' };

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
    var payload = {};
    if (MK.acct) { payload.account = MK.acct; }
    if (MK.status) { payload.status = MK.status; }
    if (MK.type) { payload.type = MK.type; }
    api('marketingBoard', payload).then(function (d) {
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
      var lows = (d && d.low_profit_in_sale) || [];
      if (lows.length) {
        h += '<div class="ir-alert"><b style="color:var(--bad)">\ud83d\udd34 ' + lows.length + ' item(s) whose SALE pushes profit under \u00a31</b>' +
          '<div style="margin-top:4px;font-size:11px;color:var(--text-3);font-weight:600">listed profit \u2212 the discount\u2019s real cost at the law\u2019s marginal rate (a \u00a31 cut \u2248 \u00a30.67 of Actual)</div>';
        lows.slice(0, 12).forEach(function (x) {
          h += '<div style="margin-top:4px"><a href="https://www.ebay.co.uk/itm/' + esc(String(x.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit"><b>' + esc(String(x.title || x.item_id).slice(0, 55)) + '</b></a>' +
            ' \u00b7 ' + esc(String(x.account)) + ' \u00b7 \u00a3' + Number(x.price).toFixed(2) + ' at ' + x.pct + '% off in \u201c' + esc(String(x.event)) + '\u201d' +
            ' \u2014 listed \u00a3' + Number(x.profit_listed).toFixed(2) + ' \u2192 <b style="color:var(--bad)">\u00a3' + Number(x.profit_in_sale).toFixed(2) + '</b> in sale</div>';
        });
        if (lows.length > 12) { h += '<div style="margin-top:4px;font-size:11px;color:var(--text-3)">+' + (lows.length - 12) + ' more</div>'; }
        h += '</div>';
      }
      h += '<div class="scroll"><table class="mk-tbl"><thead><tr>' +
        '<th>Account</th><th>Sale event \u00b7 click for its listings + history</th><th>Type</th><th>Status</th><th>Discount</th><th>Items</th><th>Started</th><th>Ends</th></tr></thead><tbody>';
      if (!promos.length) {
        h += '<tr><td colspan="8"><div class="empty">No promotions synced yet — the sync runs hourly at half past (or press "Pull now" on Account health → Engine ops → marketingSync).</div></td></tr>';
      }
      promos.forEach(function (p) {
        var run = /RUNNING/i.test(String(p.status));
        var endSoon = run && (function () { var t = Date.parse(p.end_at); return isFinite(t) && t - Date.now() <= 2 * 86400000; })();
        h += '<tr' + (endSoon ? ' class="mk-end"' : '') + '><td style="font-weight:800">' + esc(String(p.account)) + '</td>' +
          '<td><a href="#" data-mk-ev="' + esc(String(p.promo_id)) + '" data-mk-acc="' + esc(String(p.account)) + '" style="color:inherit">' + esc(String(p.name || p.promo_id).slice(0, 55)) + '</a></td>' +
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
      h += '<div id="mkMembers"></div>';
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String((d && d.note) || '')) + '</p>';
      box.innerHTML = h;
      box.querySelectorAll('[data-mk-ev]').forEach(function (a) {
        a.onclick = function (ev) {
          ev.preventDefault();
          var host = $('mkMembers');
          host.innerHTML = '<div class="spinner"></div>';
          try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {}
          api('promoMembers', { account: this.getAttribute('data-mk-acc'), promo_id: this.getAttribute('data-mk-ev') }).then(function (m) {
            var rows2 = (m && m.members) || [];
            var hh = '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:14px 0 4px">Listings in this event \u00b7 ' + rows2.length + ' \u00b7 when each was added</div>' +
              '<div class="scroll" style="max-height:300px"><table class="mk-tbl"><thead><tr><th>Listing</th><th>Price</th><th>Added to event</th><th>Last seen in it</th><th>Status</th></tr></thead><tbody>';
            rows2.forEach(function (r2) {
              hh += '<tr><td><a href="https://www.ebay.co.uk/itm/' + esc(String(r2.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(String(r2.title || r2.item_id).slice(0, 65)) + '</a>' +
                '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(String(r2.item_id)) + '</div></td>' +
                '<td>\u00a3' + (Number(r2.price) || 0).toFixed(2) + '</td>' +
                '<td>' + esc(String(r2.added_at || '').slice(0, 16)) + '</td>' +
                '<td>' + esc(String(r2.last_seen || '').slice(0, 16)) + '</td>' +
                '<td>' + esc(String(r2.listing_status || '')) + '</td></tr>';
            });
            hh += '</tbody></table></div><p style="font-size:10.5px;color:var(--text-3);font-weight:600">' + esc(String(m.note || '')) + '</p>';
            host.innerHTML = hh;
          }).catch(function (e2) { host.innerHTML = '<div class="empty">Members did not answer \u2014 ' + esc(e2.message) + '</div>'; });
        };
      });
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
        '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
        '<select id="mkAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
        '<select id="mkStatus" class="minibtn" style="padding:6px 8px"><option value="RUNNING">Live now</option><option value="">Every status</option><option value="SCHEDULED">Scheduled</option><option value="ENDED">Ended</option><option value="PAUSED">Paused</option></select>' +
        '<select id="mkType" class="minibtn" style="padding:6px 8px"><option value="">All types</option><option value="MARKDOWN">Sale events (markdown)</option><option value="VOLUME">Multi-buy (volume)</option><option value="ORDER">Order discounts</option></select>' +
        '<button class="minibtn" id="mkRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="mkBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var rf = $('mkRefresh');
      if (rf) { rf.onclick = mkLoad; }
      var sa = $('mkAcct');
      if (sa) {
        fillAccountSelect(sa, MK.acct, function () { MK.acct = sa.value; mkLoad(); });
      }
      var ss = $('mkStatus');
      if (ss) { ss.value = MK.status; ss.onchange = function () { MK.status = this.value; mkLoad(); }; }
      var st = $('mkType');
      if (st) { st.value = MK.type; st.onchange = function () { MK.type = this.value; mkLoad(); }; }
      mkLoad();
    }
  };
})();
