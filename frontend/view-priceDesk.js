/* view-priceDesk.js — R8-7: the price revision desk. Every cost rise the engine has seen, with
 * the margin it leaves and whether anyone has acted. Acknowledging demands written feedback —
 * the letter fades, this desk remembers. Backend: priceBoard · priceAck (engine). */
(function () {
  'use strict';

  var PD_ROLES = ['Management', 'Ops Head', 'Pricing', 'Team Lead'];

  VIEW_CSS.push(
    '.pd-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:14px}' +
    '.pd-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.pd-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.pd-t b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.pd-t.bad b{color:var(--bad)}.pd-t.ok b{color:var(--ok)}' +
    '.pd-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel)}' +
    '.pd-row.open{border-color:rgba(240,96,90,.45);background:var(--bad-soft)}' +
    '.pd-row .t{font-weight:800;font-size:13px}' +
    '.pd-row .m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.pd-nums{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;font-weight:700}' +
    '.pd-nums .bad{color:var(--bad)}.pd-nums .ok{color:var(--ok)}' +
    '.pd-ack{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}' +
    '.pd-ack input{flex:1;min-width:200px;padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}'
  );

  function pdS(v) { return String(v == null ? '' : v); }
  function pdM(v) { var n = Number(v) || 0; return '£' + n.toFixed(2); }

  VIEWS.priceDesk = {
    label: 'Price revisions',
    icon: '<path d="M12 3v18"/><path d="M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/>',
    roles: PD_ROLES,
    order: 12.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Price <span class="goldtext">revisions</span></h1>' +
          '<span class="sub">supplier costs that climbed — what it does to the margin, and what was done about it</span>' +
          '<button class="minibtn" id="pdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="pdTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2"><div class="bd" id="pdBody"><div class="spinner"></div></div></div>';
    },
    init: function () { $('pdRefresh').onclick = pdLoad; pdLoad(); }
  };

  function pdLoad() {
    api('priceBoard', {}).then(function (d) {
      d = d || {};
      var rows = d.rows || [];
      var open = rows.filter(function (r) { return !pdS(r.acked_at); });
      var thin = open.filter(function (r) { return Number(r.margin_after) < 2; });
      $('pdTiles').innerHTML = '<div class="pd-tiles">' +
        '<div class="pd-t bad"><span class="k">Open alerts</span><b>' + open.length + '</b></div>' +
        '<div class="pd-t bad"><span class="k">Margin under £2</span><b>' + thin.length + '</b></div>' +
        '<div class="pd-t ok"><span class="k">Handled · 30 days</span><b>' + (rows.length - open.length) + '</b></div>' +
        '<div class="pd-t"><span class="k">As of</span><b style="font-size:13px">' + esc(fmtPkt(d.as_of, true) || '—') + '</b></div>' +
      '</div>';
      var box = $('pdBody');
      if (!rows.length) {
        box.innerHTML = '<div class="hu-hint" style="margin-top:0">No cost rises recorded in the last 30 days. When a supplier cost climbs more than 30p, it lands here.</div>';
        return;
      }
      box.innerHTML = rows.map(function (r) {
        var isOpen = !pdS(r.acked_at);
        var rise = (Number(r.new_cost) - Number(r.old_cost)) || 0;
        var key = pdS(r.item_id) + '|' + pdS(r.alerted_at);
        return '<div class="pd-row' + (isOpen ? ' open' : '') + '">' +
          '<div class="t">' + (isOpen ? '🔴 ' : '✅ ') +
            '<a href="https://www.ebay.co.uk/itm/' + esc(pdS(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
            esc(pdS(r.title) || pdS(r.item_id)) + '</a></div>' +
          '<div class="m"><span class="mono">' + esc(pdS(r.item_id)) + '</span> · ' + esc(pdS(r.account)) +
            ' · seen ' + esc(fmtPkt(r.alerted_at, true) || '') + ' · listing ' + esc(pdS(r.listing_status) || '?') + '</div>' +
          '<div class="pd-nums">' +
            '<span>cost <span class="bad">' + pdM(r.old_cost) + ' → ' + pdM(r.new_cost) + '</span> (+' + Math.round(rise * 100) + 'p)</span>' +
            '<span>sells at ' + pdM(r.price_now || r.sell_price) + '</span>' +
            '<span>margin after <span class="' + (Number(r.margin_after) < 2 ? 'bad' : 'ok') + '">' + pdM(r.margin_after) + '</span></span>' +
          '</div>' +
          (isOpen ? '<div class="pd-ack">' +
              '<input data-pd-note="' + esc(key) + '" placeholder="what did you do? (raise price, switch supplier, accept…)">' +
              '<button class="minibtn" data-pd-ack="' + esc(key) + '">Acknowledge with feedback</button></div>'
            : '<div class="m">handled by ' + esc(pdS(r.acked_by).split('@')[0]) + ' · ' + esc(fmtPkt(r.acked_at, true) || '') +
              (pdS(r.note) ? ' — ' + esc(pdS(r.note)) : '') + '</div>') +
        '</div>';
      }).join('');
      box.querySelectorAll('[data-pd-ack]').forEach(function (b) {
        b.onclick = function () {
          var key = this.getAttribute('data-pd-ack');
          var inp = box.querySelector('[data-pd-note="' + key.replace(/"/g, '') + '"]');
          var note = inp ? pdS(inp.value).trim() : '';
          if (note.length < 3) { toast('Write what you did — a price alert needs real feedback.'); if (inp) { inp.focus(); } return; }
          var parts = key.split('|'), btn = this;
          btn.disabled = true;
          api('priceAck', { item_id: parts[0], alerted_at: parts[1], note: note })
            .then(function () { toast('Acknowledged.'); pdLoad(); })
            .catch(function (e) { btn.disabled = false; toast(e.message); });
        };
      });
    }).catch(function (e) {
      $('pdTiles').innerHTML = '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>';
      $('pdBody').innerHTML = '';
    });
  }

})();
