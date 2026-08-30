/* view-adsCentre.js — Hasib items 10/18/22: the advertising command centre. Combined tiles →
 * per-account cards → per-item board in eBay's own vocabulary, fed by the intraday snapshot.
 * The waste rows (£3+ today, zero orders) lead the table, red, exactly per his rule. */
(function () {

  var AC_ROLES = ['Advertising Manager', 'Management', 'Ops Head']; /* review 4: ad revenue = earnings */
  var AC = { timer: null, days: 14, acct: '', from: '', to: '' };

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
    '.ac-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:900px}' +
    '.ac-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ac-tbl th:first-child{text-align:left}' +
    '.ac-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.ac-tbl td:first-child{text-align:left;white-space:normal;min-width:240px}' +
    '.ac-waste td{background:var(--bad-soft,rgba(255,80,80,.08))}' +
    '.ac-waste td:first-child{border-left:3px solid var(--bad)}' +
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
          h += '<div class="scroll" style="max-height:220px;margin-top:8px"><table class="ac-tbl" style="min-width:480px"><thead><tr>' +
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
          '<div class="scroll" style="max-height:220px;margin-bottom:14px"><table class="ac-tbl" style="min-width:520px"><thead><tr>' +
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
          '<div class="scroll" style="max-height:260px;margin-bottom:14px"><table class="ac-tbl" style="min-width:560px"><thead><tr>' +
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
      var rows = d.items || [];
      if (!rows.length) {
        h += '<div style="color:var(--text-2);font-weight:700;padding:12px 0">No ad activity recorded yet today — the first intraday report lands within ~10 minutes of the day starting.</div>';
      } else {
        h += '<div class="scroll"><table class="ac-tbl"><thead><tr>' +
          '<th>Item</th><th>Spend today</th><th>Clicks</th><th>Avg CPC</th><th>Sold via ads</th>' +
          '<th>Spend ' + (d.days || 14) + 'd</th><th>Clicks ' + (d.days || 14) + 'd</th><th>Sold ' + (d.days || 14) + 'd</th></tr></thead><tbody>';
        rows.forEach(function (r) {
          h += '<tr' + (r.waste ? ' class="ac-waste"' : '') + '><td>' +
            '<a href="https://www.ebay.co.uk/itm/' + esc(String(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
            esc(String(r.title || r.item_id).slice(0, 80)) + '</a>' +
            '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(String(r.item_id)) + ' · ' + esc(String(r.account)) +
            (r.waste ? ' · <b style="color:var(--bad)">£3+ TODAY, NO ORDER — PAUSE OR FIX</b>' : '') + '</div></td>' +
            '<td>' + acGBP(r.spend_today) + '</td><td>' + (r.clicks_today || 0) + '</td>' +
            '<td>' + (r.cpc_today ? acGBP(r.cpc_today) : '—') + '</td><td>' + (r.sold_today || 0) + '</td>' +
            '<td>' + acGBP(r.spend_14d) + '</td><td>' + (r.clicks_14d || 0) + '</td><td>' + (r.sold_14d || 0) + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Snapshot ' +
        esc(String(d.updated_at || '—')) + ' UTC · ' + esc(String(d.note || '')) + '</p>';
      box.innerHTML = h;
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
