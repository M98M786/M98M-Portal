/* view-truthAds.js — TRUTH v2 WO-08: the three advertising pages rebuilt on ONE definition of
 * "live" (the adsTruth action / metricAds in the engine). Loads after view-advertising.js,
 * view-campaignWatch.js and view-liveSplit.js (alphabetical build), so these registrations
 * replace theirs; the old code paths go at Phase 6 cleanup.
 *   · Live listings — four tiles that partition ACTIVE exactly (CPC only / General only /
 *     Both / No campaign) + the invariant printed on the page.
 *   · Campaign watch — per-listing membership chips wearing eBay's own state (LIVE, AD PAUSED,
 *     CAMPAIGN PAUSED, ARCHIVED, LISTING ENDED) and a ✕ pause for CPC memberships.
 *   · Wrong advertising — MULTI_RUNNING and NO_CAMPAIGN from the register, not a sheet tab. */
(function () {
  'use strict';

  var TA = { acct: '', data: null, at: 0, tab: 'multi' };

  VIEW_CSS.push(
    '.ta-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:14px}' +
    '.ta-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2);cursor:pointer;transition:border-color .15s}' +
    '.ta-tile.on{border-color:var(--gold)}' +
    '.ta-tile .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ta-tile b{display:block;font-size:24px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.ta-tile .s{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:3px}' +
    '.ta-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--gold-line);border-radius:99px;padding:3px 10px;font-size:10.5px;font-weight:800;margin:2px 4px 2px 0;background:var(--panel)}' +
    '.ta-chip.LIVE{color:var(--ok);border-color:var(--ok)}' +
    '.ta-chip.PAUSED{color:var(--warn)}' +
    '.ta-chip.ENDED{color:var(--text-3)}' +
    '.ta-chip .x{cursor:pointer;color:var(--bad);font-weight:900;padding:0 2px}' +
    '.ta-row{border-bottom:1px solid var(--gold-line);padding:9px 2px}' +
    '.ta-row .t{font-size:12.5px;font-weight:700}' +
    '.ta-row .m{font-size:11px;color:var(--text-3);font-weight:600}' +
    '.ta-ok{color:var(--ok);font-weight:700;font-size:11.5px}' +
    '.ta-bad{color:var(--bad);font-weight:700;font-size:11.5px}'
  );

  function taLoad(force) {
    if (!force && TA.data && Date.now() - TA.at < 45000 && TA.data._acct === TA.acct) {
      return Promise.resolve(TA.data);
    }
    return api('adsTruth', TA.acct ? { account: TA.acct } : {}).then(function (d) {
      d._acct = TA.acct; TA.data = d; TA.at = Date.now();
      return d;
    });
  }

  function taChipClass(chip) {
    if (chip === 'LIVE') { return 'LIVE'; }
    if (chip.indexOf('PAUSED') >= 0) { return 'PAUSED'; }
    return 'ENDED';
  }

  function taMemberChips(r, canPause) {
    return (r.memberships || []).map(function (m) {
      var x = '';
      if (canPause && m.live && m.funding === 'COST_PER_CLICK') {
        x = '<span class="x" title="Pause this ad on eBay" data-ta-pause="' + esc(r.account) + '|' + esc(m.campaign_id) + '|' + esc(r.listing_id) + '">✕</span>';
      }
      return '<span class="ta-chip ' + taChipClass(m.chip) + '" title="' + esc(m.name || m.campaign_id) + ' · ' + esc(m.funding || '') + (m.bid ? ' · bid ' + esc(m.bid) + '%' : '') + '">' +
        esc((m.funding === 'COST_PER_CLICK' ? 'CPC' : 'GEN') + ' · ' + m.chip) + x + '</span>';
    }).join('');
  }

  function taWirePause(box, after) {
    box.querySelectorAll('[data-ta-pause]').forEach(function (el) {
      el.onclick = function () {
        var p = this.getAttribute('data-ta-pause').split('|');
        var me = this;
        if (!confirm('Pause this Promoted Listings Advanced ad on eBay?\n\nListing ' + p[2] + ' in campaign ' + p[1] + ' (' + p[0] + '). eBay will stop charging clicks for it. This acts on eBay itself.')) { return; }
        me.textContent = '…';
        api('adsPauseListing', { account: p[0], campaign_id: p[1], listing_id: p[2] }).then(function (r) {
          toast(r.confirmed_from_ebay ? 'Paused — eBay confirms the ad is now ' + r.ad_status : 'Pause sent to eBay');
          TA.at = 0;
          if (after) { after(); }
        }).catch(function (e) { me.textContent = '✕'; toast('eBay refused — ' + e.message); });
      };
    });
  }

  /* ————— Live listings: the four-way split ————— */
  VIEWS.liveSplit = {
    label: 'Live listings',
    icon: '<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
    roles: ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'Listing Manager', 'Item Lister'],
    order: 18.4,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Live <span class="goldtext">listings</span></h1>' +
        '<span class="sub">every ACTIVE listing in exactly one bucket — counted from eBay campaign state in D1, not a sheet</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px">' +
        '<select class="alx-sel" id="taSpAcct"><option value="">All accounts</option></select>' +
        '<button class="minibtn" id="taSpRefresh">Refresh</button></span></div>' +
        '<div id="taSpBody"><div class="spinner"></div></div>';
    },
    init: function () {
      var paint = function () {
        var b = $('taSpBody');
        if (!b) { return; }
        b.innerHTML = '<div class="spinner"></div>';
        taLoad().then(function (d) {
          if (!$('taSpBody')) { return; }
          var s = d.split;
          var tile = function (l, v, s2) {
            return '<div class="ta-tile"><span class="l">' + l + '</span><b>' + v + '</b><span class="s">' + s2 + '</span></div>';
          };
          var h = '<div class="ta-tiles">' +
            tile('CPC only', s.cpc_only, 'Advanced campaigns') +
            tile('General only', s.general_only, 'cost-per-sale') +
            tile('Both live', s.both, 'paying twice — check Wrong advertising') +
            tile('No campaign', s.none, 'unadvertised stock') +
            '</div>';
          h += '<div class="card"><div class="bd" style="padding:12px 16px">' +
            (d.invariant_split_ok
              ? '<span class="ta-ok">✓ ' + (s.cpc_only + s.general_only + s.both + s.none) + ' = ' + s.active + ' ACTIVE listings — the four buckets partition exactly (verified again every 15 min on Truth Check).</span>'
              : '<span class="ta-bad">✕ buckets sum to ' + (s.cpc_only + s.general_only + s.both + s.none) + ' but eBay shows ' + s.active + ' ACTIVE — the register flags this FAIL on Truth Check.</span>') +
            '</div></div>';
          if ((d.none || []).length) {
            h += '<div class="card" style="margin-top:14px"><div class="hd">No campaign — first ' + d.none.length + '</div><div class="bd">' +
              d.none.map(function (r) {
                return '<div class="ta-row"><div class="t">' + esc(r.title || r.listing_id) + '</div><div class="m">' + esc(r.account) + ' · ' + esc(r.listing_id) + '</div></div>';
              }).join('') + '</div></div>';
          }
          b.innerHTML = h;
        }).catch(function (e) { b.innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>'; });
      };
      fillAccountSelect($('taSpAcct'), TA.acct, function () { TA.acct = $('taSpAcct').value; TA.at = 0; paint(); });
      var rf = $('taSpRefresh');
      if (rf) { rf.onclick = function () { TA.at = 0; paint(); }; }
      paint();
    }
  };

  /* ————— Wrong advertising: MULTI_RUNNING + NO_CAMPAIGN from the register ————— */
  VIEWS.wrongAds = {
    label: 'Wrong advertising',
    icon: '<path d="M12 3 2.6 20h18.8L12 3z"/><path d="M12 9.5v5"/><path d="M12 17.6h.01"/>',
    roles: ['Advertising Manager', 'Management', 'Ops Head', 'Team Lead'],
    order: 24,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Wrong <span class="goldtext">advertising</span></h1>' +
        '<span class="sub">listings paying twice, and stock paying nothing — live from eBay campaign state, chips per membership</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px">' +
        '<select class="alx-sel" id="taWaAcct"><option value="">All accounts</option></select>' +
        '<button class="minibtn" id="taWaRefresh">Refresh</button></span></div>' +
        '<div id="taWaBody"><div class="spinner"></div></div>';
    },
    init: function () {
      var paint = function () {
        var b = $('taWaBody');
        if (!b) { return; }
        b.innerHTML = '<div class="spinner"></div>';
        taLoad().then(function (d) {
          if (!$('taWaBody')) { return; }
          var s = d.split;
          var tile = function (key, l, v, s2) {
            return '<div class="ta-tile' + (TA.tab === key ? ' on' : '') + '" data-ta-tab="' + key + '"><span class="l">' + l + '</span><b>' + v + '</b><span class="s">' + s2 + '</span></div>';
          };
          var h = '<div class="ta-tiles" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
            tile('multi', 'Multi running', s.multi, 'live in 2+ campaigns at once') +
            tile('both', 'CPC + General both live', s.both, 'double-charged listings') +
            tile('none', 'No campaign', s.none, 'unadvertised ACTIVE stock') +
            '</div>';
          var rows = TA.tab === 'none' ? (d.none || []) : (d.multi || []);
          if (TA.tab === 'both') { rows = (d.multi || []).filter(function (r) { var c = 0, g = 0; (r.memberships || []).forEach(function (m) { if (m.live) { if (m.funding === 'COST_PER_CLICK') { c = 1; } else { g = 1; } } }); return c && g; }); }
          h += '<div class="card"><div class="hd">' + (TA.tab === 'none' ? 'Unadvertised — first ' + rows.length : 'Rows — every membership shown as eBay shows it') +
            '<span class="hint">✕ pauses a CPC ad on eBay (Advanced only — General ads are removed on eBay itself)</span></div><div class="bd">' +
            (rows.length ? rows.map(function (r) {
              return '<div class="ta-row"><div class="t">' + esc(r.title || r.listing_id) + '</div>' +
                '<div class="m">' + esc(r.account) + ' · ' + esc(r.listing_id) + '</div>' +
                (r.memberships ? '<div style="margin-top:4px">' + taMemberChips(r, true) + '</div>' : '') + '</div>';
            }).join('') : '<div class="alx-empty">Nothing in this bucket — clean.</div>') +
            '</div></div>';
          h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Counted from the latest campaign sync in D1 (R8 — never Google/eBay live on page load) · as of ' + esc(String(d.as_of).slice(11, 16)) + ' UTC.</p>';
          b.innerHTML = h;
          b.querySelectorAll('[data-ta-tab]').forEach(function (el) {
            el.onclick = function () { TA.tab = this.getAttribute('data-ta-tab'); paint(); };
          });
          taWirePause(b, paint);
        }).catch(function (e) { b.innerHTML = '<div class="alx-empty">The register did not answer — ' + esc(e.message) + '</div>'; });
      };
      fillAccountSelect($('taWaAcct'), TA.acct, function () { TA.acct = $('taWaAcct').value; TA.at = 0; paint(); });
      var rf = $('taWaRefresh');
      if (rf) { rf.onclick = function () { TA.at = 0; paint(); }; }
      paint();
    }
  };

  /* ————— Campaign watch: wrap, don't replace — the events/CSV machinery stays; the duplicate
     story on top now comes from the register with per-membership chips and the CPC ✕. ————— */
  var cwOld = VIEWS.campaignWatch;
  if (cwOld) {
    var cwOldInit = cwOld.init;
    cwOld.render = (function (r0) {
      return function () {
        return r0.apply(this, arguments).replace('<div id="cwBody">', '<div id="taCwTruth"></div><div id="cwBody">');
      };
    })(cwOld.render);
    cwOld.init = function () {
      cwOldInit.apply(this, arguments);
      var paintT = function () {
        var box = $('taCwTruth');
        if (!box) { return; }
        taLoad().then(function (d) {
          if (!$('taCwTruth')) { return; }
          var rows = d.multi || [];
          var h;
          if (!rows.length) {
            h = '<div class="cw-dupbox" style="border-color:var(--ok);background:var(--ok-soft)"><h3 style="color:var(--ok)">✓ Register check: no listing is LIVE in more than one campaign (paused ads and paused campaigns excluded — verified on Truth Check).</h3></div>';
          } else {
            h = '<div class="cw-dupbox"><h3>🔴 ' + rows.length + ' listing(s) LIVE in 2+ campaigns — from eBay ad state, paused ads already excluded</h3>' +
              rows.slice(0, 40).map(function (r) {
                return '<div class="ta-row"><div class="t">' + esc(r.title || r.listing_id) + '</div>' +
                  '<div class="m">' + esc(r.account) + ' · ' + esc(r.listing_id) + '</div>' +
                  '<div style="margin-top:4px">' + taMemberChips(r, true) + '</div></div>';
              }).join('') +
              (rows.length > 40 ? '<div class="m" style="margin-top:6px">…and ' + (rows.length - 40) + ' more — the full list is on Wrong advertising.</div>' : '') +
              '</div>';
          }
          box.innerHTML = h;
          taWirePause(box, paintT);
        }).catch(function () { /* the old page still stands on its own */ });
      };
      paintT();
    };
  }
})();
