/* view-feedback.js — review 4: the Feedback dashboard. Every account's Seller Hub card
 * (score + positive %), positive/neutral/negative for today · yesterday · 30 days, and the
 * full detail of every negative — with letters already sent to management + CS on arrival. */
(function () {

  VIEW_CSS.push(
    '.fb-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));margin-bottom:14px}' +
    '.fb-card{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px}' +
    '.fb-card .a{font-weight:800;font-size:13px}' +
    '.fb-card .s{font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.fb-card .p{font-size:11.5px;font-weight:700;margin-top:2px}' +
    '.fb-row{display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;margin-top:6px}' +
    '.fb-neg{border:1px solid var(--bad);border-radius:12px;background:var(--bad-soft);padding:10px 14px;margin-bottom:10px;font-size:12.5px}'
  );

  function fbLoad() {
    var box = $('fbBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('feedbackBoard', {}).then(function (d) {
      var sums = (d && d.summaries) || [];
      var daily = (d && d.daily) || [];
      var today = (d && d.today) || '';
      var yday = (d && d.yesterday) || '';
      function cnt(acct, type, day) {
        var n = 0;
        daily.forEach(function (r) { if (r.account === acct && r.type === type && (!day || r.d === day)) { n += Number(r.n) || 0; } });
        return n;
      }
      var h = '<div class="fb-cards">';
      var fleet = { p: 0, n: 0, g: 0, pt: 0, gt: 0 };
      sums.forEach(function (s) {
        var negT = cnt(s.account, 'Negative', today), negY = cnt(s.account, 'Negative', yday);
        var posT = cnt(s.account, 'Positive', today), posY = cnt(s.account, 'Positive', yday);
        fleet.p += Number(s.pos_30d) || 0; fleet.n += Number(s.neu_30d) || 0; fleet.g += Number(s.neg_30d) || 0;
        fleet.pt += posT; fleet.gt += negT;
        h += '<div class="fb-card"><div class="a">' + esc(String(s.account)) + '</div>' +
          '<div class="s">(' + (Number(s.score) || 0).toLocaleString() + ') <span style="color:var(--' + (Number(s.pos_pct) >= 99 ? 'ok' : 'warn') + ')">' + (Number(s.pos_pct) || 0).toFixed(1) + '%</span></div>' +
          '<div class="p" style="color:var(--text-3)">eBay score · positive %</div>' +
          '<div class="fb-row"><span style="color:var(--ok)">+ ' + (s.pos_30d || 0) + ' positive</span><span>' + (s.neu_30d || 0) + ' neutral</span><span style="color:var(--bad)">− ' + (s.neg_30d || 0) + ' negative</span></div>' +
          '<div class="fb-row" style="color:var(--text-3)"><span>today + ' + posT + (negT ? ' / <b style="color:var(--bad)">− ' + negT + '</b>' : '') + '</span>' +
          '<span>yesterday + ' + posY + (negY ? ' / <b style="color:var(--bad)">− ' + negY + '</b>' : '') + '</span></div></div>';
      });
      h += '</div>';
      h += '<div class="dr-kpis" style="margin-bottom:12px">' +
        '<div class="dr-kpi"><div class="l">Fleet · 30 days</div><div class="v"><span style="color:var(--ok)">+' + fleet.p + '</span> · ' + fleet.n + ' · <span style="color:var(--bad)">−' + fleet.g + '</span></div></div>' +
        '<div class="dr-kpi"><div class="l">Today so far</div><div class="v"><span style="color:var(--ok)">+' + fleet.pt + '</span>' + (fleet.gt ? ' · <span style="color:var(--bad)">−' + fleet.gt + '</span>' : '') + '</div></div>' +
        '</div>';
      var negs = (d && d.negatives) || [];
      if (negs.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--bad);font-weight:800;margin:4px 0 6px">🔴 Negative feedback — every one, newest first (management + CS were lettered on arrival)</div>';
        negs.forEach(function (n) {
          h += '<div class="fb-neg"><b>' + esc(String(n.account)) + '</b> · ' + esc(String(n.at).slice(0, 10)) + ' · buyer <b>' + esc(String(n.buyer)) + '</b>' +
            '<div style="margin-top:3px">“' + esc(String(n.text || '(no comment)')) + '”</div>' +
            '<div style="margin-top:3px;font-size:11px;color:var(--text-3)">' +
            '<a href="https://www.ebay.co.uk/itm/' + esc(String(n.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(String(n.title || n.item_id).slice(0, 70)) + '</a>' +
            (n.order_line ? ' · order line <span class="mono">' + esc(String(n.order_line)) + '</span>' : '') + '</div></div>';
        });
      } else {
        h += '<div class="empty">No negative feedback on record. Keep it that way.</div>';
      }
      var neus = (d && d.neutrals) || [];
      if (neus.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:12px 0 4px">Neutral — newest ' + neus.length + '</div>';
        neus.forEach(function (n) {
          h += '<div style="font-size:12px;padding:6px 0;border-bottom:1px solid var(--gold-line)"><b>' + esc(String(n.account)) + '</b> · ' + esc(String(n.at).slice(0, 10)) +
            ' · “' + esc(String(n.text || '').slice(0, 120)) + '” · <span style="color:var(--text-3)">' + esc(String(n.title || n.item_id).slice(0, 50)) + '</span></div>';
        });
      }
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String((d && d.note) || '')) + '</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">The feedback board did not answer — ' + esc(e.message) + '</div>';
    });
  }

  VIEWS.feedback = {
    label: 'Feedback',
    order: 8.6,
    roles: ['Management', 'Ops Head', 'CS', 'Team Lead'],
    icon: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
    prefetch: function () { return api('feedbackBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1><span class="goldtext">Feedback</span> — all accounts</h1>' +
        '<span class="sub">eBay score + positive % per account · today, yesterday, 30 days · every negative in full, lettered to management + CS on arrival</span>' +
        '<button class="minibtn" id="fbRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd" id="fbBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var rf = $('fbRefresh');
      if (rf) { rf.onclick = fbLoad; }
      fbLoad();
    }
  };
})();
