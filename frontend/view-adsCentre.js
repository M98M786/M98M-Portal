/* view-adsCentre.js — Hasib items 10/18/22: the advertising command centre. Combined tiles →
 * per-account cards → per-item board in eBay's own vocabulary, fed by the intraday snapshot.
 * The waste rows (£3+ today, zero orders) lead the table, red, exactly per his rule. */
(function () {

  var AC_ROLES = ['Advertising Manager', 'Team Lead', 'Management', 'Ops Head'];
  var AC = { timer: null, days: 14 };

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
    '.ac-waste td:first-child{border-left:3px solid var(--bad)}'
  );

  function acGBP(v) { var n = Number(v) || 0; return '£' + n.toFixed(2); }

  function acLoad() {
    var box = $('acBody');
    if (!box) { return; }
    api('adsBoard', { days: AC.days }).then(function (d) {
      d = d || {};
      var c = d.combined || {};
      var h = '<div class="ac-tiles">' +
        '<div class="ac-tile gold"><div class="k">Spend today · all accounts</div><div class="v">' + acGBP(c.spend_today) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Clicks today</div><div class="v">' + (c.clicks_today || 0) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Sold via ads today</div><div class="v">' + (c.sold_today || 0) + '</div></div>' +
        '<div class="ac-tile' + (c.waste_n ? ' bad' : '') + '"><div class="k">Wasting £3+ · no order</div><div class="v">' + (c.waste_n || 0) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Spend · ' + (d.days || 14) + ' days</div><div class="v">' + acGBP(c.spend_14d) + '</div></div>' +
      '</div>';
      /* the history — every previous day's spend, clicks and ad-attributed sales in the window */
      var ser = d.series || [];
      if (ser.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:4px 0 4px">Day by day · last ' + (d.days || 14) + '</div>' +
          '<div class="scroll" style="max-height:220px;margin-bottom:14px"><table class="ac-tbl" style="min-width:520px"><thead><tr>' +
          '<th>Date</th><th>Spend</th><th>Clicks</th><th>Avg CPC</th><th>Sold via ads</th></tr></thead><tbody>';
        ser.forEach(function (r) {
          h += '<tr><td style="text-align:left">' + esc(String(r.date)) + '</td>' +
            '<td>' + acGBP(r.spend) + '</td><td>' + (r.clicks || 0) + '</td>' +
            '<td>' + (Number(r.clicks) ? acGBP(Number(r.spend) / Number(r.clicks)) : '—') + '</td>' +
            '<td>' + (r.sold || 0) + '</td></tr>';
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
            '<button class="minibtn" id="acRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="acBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var rf = $('acRefresh');
      if (rf) { rf.onclick = acLoad; }
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
