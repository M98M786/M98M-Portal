/* view-truthHunting.js — TRUTH v2 WO-11: the AliExpress duplicate check at the top of Product
 * hunting. Wraps VIEWS.hunting (this file sorts after view-hunting.js). One textarea, many
 * links; every input is normalised to its ali item id (short links resolved server-side) and
 * answered from BOTH sides: hunt records live from Apps Script + the supplier/listing mirror
 * in D1. Management additionally gets the override-note field the submit block honours. */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.ali-res{border:1px solid var(--gold-line);border-radius:11px;padding:10px 13px;margin-top:8px;background:var(--panel-2)}' +
    '.ali-res .v{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;padding:2px 9px;border-radius:8px}' +
    '.ali-res .v.DUPLICATE{background:var(--bad-soft,rgba(240,96,90,.12));color:var(--bad)}' +
    '.ali-res .v.NEW{background:var(--ok-soft,rgba(63,207,142,.12));color:var(--ok)}' +
    '.ali-res .v.BAD{background:var(--panel);color:var(--text-3)}' +
    '.ali-res .m{font-size:11.5px;color:var(--text-2);font-weight:600;margin-top:5px}'
  );

  function ahS(v) { return String(v == null ? '' : v); }

  function ahRun() {
    var ta = $('ahLinks'), box = $('ahOut');
    if (!ta || !box) { return; }
    var raw = ahS(ta.value).trim();
    if (!raw) { toast('Paste one or more AliExpress links first.'); ta.focus(); return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('huntAliCheck', { links: raw }).then(function (d) {
      var results = (d && d.results) || [];
      var ids = results.filter(function (r) { return r.ok; }).map(function (r) { return r.ali_id; });
      var d1p = ids.length ? api('aliCheck', { ids: ids }).catch(function () { return { results: [] }; }) : Promise.resolve({ results: [] });
      d1p.then(function (d2) {
        if (!$('ahOut')) { return; }
        var mirror = {};
        ((d2 && d2.results) || []).forEach(function (r) { mirror[r.ali_id] = r; });
        box.innerHTML = results.map(function (r) {
          if (!r.ok) {
            return '<div class="ali-res"><span class="v BAD">not an item link</span><div class="m">' + esc(r.input) + ' — ' + esc(r.reason) + '</div></div>';
          }
          var m = mirror[r.ali_id] || { listings: [], golive: [] };
          var dup = r.verdict === 'DUPLICATE' || (m.listings || []).length || (m.golive || []).length;
          var h = '<div class="ali-res"><span class="v ' + (dup ? 'DUPLICATE' : 'NEW') + '">' + (dup ? 'Duplicate' : 'New') + '</span>' +
            ' <span style="font-size:11px;color:var(--text-3);font-weight:700">ali id ' + esc(r.ali_id) + '</span>';
          (r.matches || []).forEach(function (x) {
            h += '<div class="m">hunted by <b>' + esc(x.hunter) + '</b> · ' + esc(x.status_label) + (x.account ? ' · ' + esc(x.account) : '') + ' · ' + esc(x.date) + ' · ' + esc(x.title) + '</div>';
          });
          (m.listings || []).forEach(function (x) {
            h += '<div class="m">in the supplier sheet · listing <b>' + esc(x.item_id) + '</b> (' + esc(x.account) + (x.status ? ', ' + esc(x.status) : '') + ') · ' + esc(x.title) + '</div>';
          });
          (m.golive || []).forEach(function (x) {
            h += '<div class="m">went live ' + esc(ahS(x.live_at).slice(0, 10)) + ' · listing <b>' + esc(x.item_id) + '</b> (' + esc(x.account) + ') · ' + esc(x.title) + '</div>';
          });
          if (!dup) { h += '<div class="m">no hunt record, no supplier row, no listing carries this product.</div>'; }
          return h + '</div>';
        }).join('');
      });
    }).catch(function (e) {
      box.innerHTML = '<div class="ali-res"><span class="v BAD">check failed</span><div class="m">' + esc(e.message) + '</div></div>';
    });
  }

  var huOld = VIEWS.hunting;
  if (huOld) {
    var r0 = huOld.render, i0 = huOld.init;
    huOld.render = function () {
      var isMgmt = ['Management', 'Ops Head'].indexOf((STATE.user && STATE.user.role) || '') >= 0;
      return '<div class="card enter d1" style="margin-bottom:16px"><div class="hd">Check AliExpress link(s) first ' +
        '<span class="hint">one or many — short links are resolved · a duplicate cannot be submitted' + (isMgmt ? ' without your override note' : '') + '</span></div>' +
        '<div class="bd">' +
        '<textarea id="ahLinks" placeholder="https://www.aliexpress.com/item/100500…html&#10;https://a.aliexpress.com/_abc123&#10;1005001234567890" style="width:100%;min-height:64px;padding:9px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12px"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">' +
        '<button class="minibtn" id="ahGo">Check</button>' +
        (isMgmt ? '<input id="huOvNote" placeholder="override note — only Management, only for a deliberate duplicate" style="flex:1;min-width:220px;padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text);font:inherit;font-size:11.5px;font-weight:600">' : '') +
        '</div><div id="ahOut"></div></div></div>' +
        r0.apply(this, arguments);
    };
    huOld.init = function () {
      i0.apply(this, arguments);
      var b = $('ahGo');
      if (b) { b.onclick = ahRun; }
    };
  }
})();
