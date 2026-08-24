/* view-liveSplit.js — R8-3d: active listings split as they really run — CPC live vs General &
 * Dynamic live, by REAL campaign membership (eBay's funding model), plus the ones in no campaign
 * at all. Backend: activeSplit (engine). */
(function () {
  'use strict';

  var SP_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'Listing Manager', 'Item Lister'];

  VIEW_CSS.push(
    '.sp-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:14px}' +
    '.sp-t{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2);cursor:pointer}' +
    '.sp-t.on{border-color:var(--gold-line-hi);box-shadow:var(--glow-gold)}' +
    '.sp-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.sp-t b{display:block;font-size:23px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.sp-t.cpc b{color:var(--gold-a)}.sp-t.gen b{color:var(--ok)}.sp-t.non b{color:var(--warn)}' +
    '.sp-acc{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}' +
    '.sp-a{border:1px solid var(--gold-line);border-radius:10px;padding:8px 12px;background:var(--panel);font-size:11.5px;font-weight:700}'
  );

  function spS(v) { return String(v == null ? '' : v); }
  var SP_TAB = 'cpc';

  VIEWS.liveSplit = {
    label: 'Live listings split',
    icon: '<path d="M3 12h7v8H3z"/><path d="M14 4h7v16h-7z"/>',
    roles: SP_ROLES,
    order: 18.4,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Live listings <span class="goldtext">split</span></h1>' +
          '<span class="sub">CPC vs General &amp; Dynamic — by the campaign each item actually runs in</span>' +
          '<button class="minibtn" id="spRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="spTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div id="spAcc" class="enter d1"></div>' +
        '<div class="card enter d2"><div class="hd" id="spHead">Listings</div>' +
          '<div class="bd" id="spBody"><div class="spinner"></div></div></div>';
    },
    init: function () { $('spRefresh').onclick = spLoad; spLoad(); }
  };

  var SP_DATA = null;

  function spPaint() {
    var d = SP_DATA; if (!d) { return; }
    var c = d.counts || {};
    $('spTiles').innerHTML = '<div class="sp-tiles">' +
      '<div class="sp-t cpc' + (SP_TAB === 'cpc' ? ' on' : '') + '" data-sp="cpc"><span class="k">CPC live</span><b>' + (c.cpc || 0) + '</b></div>' +
      '<div class="sp-t gen' + (SP_TAB === 'general' ? ' on' : '') + '" data-sp="general"><span class="k">General &amp; Dynamic live</span><b>' + (c.general || 0) + '</b></div>' +
      '<div class="sp-t non' + (SP_TAB === 'uncampaigned' ? ' on' : '') + '" data-sp="uncampaigned"><span class="k">In no campaign</span><b>' + (c.uncampaigned || 0) + '</b></div>' +
      '<div class="sp-t"><span class="k">As of</span><b style="font-size:13px">' + esc(fmtPkt(d.as_of, true) || '—') + '</b></div>' +
    '</div>';
    $('spTiles').querySelectorAll('[data-sp]').forEach(function (t) {
      t.onclick = function () { SP_TAB = this.getAttribute('data-sp'); spPaint(); };
    });
    var by = (d.by_account || {})[SP_TAB] || {};
    $('spAcc').innerHTML = '<div class="sp-acc">' + Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })
      .map(function (a) { return '<div class="sp-a">' + esc(a) + ' <b>' + by[a] + '</b></div>'; }).join('') + '</div>';
    var list = d[SP_TAB] || [];
    $('spHead').innerHTML = (SP_TAB === 'cpc' ? 'CPC live listings' : SP_TAB === 'general' ? 'General &amp; Dynamic live listings' : 'Live but in no campaign') +
      ' <span class="hint">' + list.length + ' item(s)</span>';
    $('spBody').innerHTML = list.length ? '<div class="scroll"><table class="ir-tbl" style="min-width:680px"><thead><tr>' +
      '<th style="text-align:left">Item</th><th style="text-align:left">Account</th><th style="text-align:left">Campaign</th><th>Price</th><th>Sold</th></tr></thead><tbody>' +
      list.slice(0, 400).map(function (r) {
        return '<tr><td style="text-align:left;max-width:290px"><a href="https://www.ebay.co.uk/itm/' + esc(spS(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
          '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(spS(r.title) || spS(r.item_id)) + '</div></a>' +
          '<span class="mono" style="font-size:10px;color:var(--text-3)">' + esc(spS(r.item_id)) + '</span></td>' +
          '<td style="text-align:left">' + esc(spS(r.account)) + '</td>' +
          '<td style="text-align:left;max-width:180px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(spS(r.campaign) || '—') + '</div></td>' +
          '<td class="num">' + (Number(r.price) ? '£' + Number(r.price).toFixed(2) : '—') + '</td>' +
          '<td class="num">' + (Number(r.sold_qty) || 0) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (list.length > 400 ? '<div class="hu-hint">Showing the first 400 of ' + list.length + '.</div>' : '')
      : '<div class="hu-hint" style="margin-top:0">Nothing in this group.</div>';
  }

  function spLoad() {
    api('activeSplit', {}).then(function (d) { SP_DATA = d || {}; spPaint(); })
      .catch(function (e) {
        $('spTiles').innerHTML = '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>';
        $('spBody').innerHTML = '';
      });
  }

})();
