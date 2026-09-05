/* view-campaignWatch.js — V2 Phase C (req 21/22): Zain's live campaign watch, served by the
 * Engine. Three truths on one screen: every campaign as eBay has it right now, every item
 * sitting in MORE than one RUNNING campaign (double-charged ads), and the recent change feed
 * with the honesty rule intact — external changes never carry a name. Role gate is server-side
 * (Advertising Manager + Management); this file renders what arrives. */
(function () {

  VIEW_CSS.push(
    '.cw-dupbox{border:1px solid var(--bad);border-radius:12px;padding:12px 14px;margin-bottom:14px;background:var(--bad-soft, rgba(220,60,60,.07))}' +
    '.cw-dupbox h3{margin:0 0 8px;font-size:13px;color:var(--bad)}' +
    '.cw-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}' +
    '.cw-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.cw-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.cw-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.cw-pill{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 8px;border-radius:99px}' +
    '.cw-pill.run{background:var(--ok-soft);color:var(--ok)}' +
    '.cw-pill.paused{background:var(--warn-soft);color:var(--warn)}' +
    '.cw-pill.ended{background:var(--panel-2);color:var(--text-3)}' +
    '.cw-num{font-variant-numeric:tabular-nums;font-weight:700}' +
    '.cw-feed{font-size:12.5px}' +
    '.cw-feed li{padding:7px 0;border-bottom:1px solid var(--gold-line);list-style:none}' +
    '.cw-when{color:var(--text-3);font-size:11px;white-space:nowrap;margin-right:8px}' +
    '.cw-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}' +
    '.cw-count{margin-left:auto;font-size:11.5px;color:var(--text-3);font-weight:700}'
  );

  function cwStr(v) { return String(v == null ? '' : v).trim(); }
  /* Attribute context needs more than esc(): esc() leaves quotes alone, and a campaign named
   * on eBay with a double-quote would walk straight out of a data-attribute (RL-3). */
  function cwAttr(v) { return esc(cwStr(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function cwPKT(sqlUtc) {
    if (!sqlUtc) { return ''; }
    var d = new Date(cwStr(sqlUtc).replace(' ', 'T') + 'Z');
    if (isNaN(d)) { return cwStr(sqlUtc); }
    return d.toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' PKT';
  }
  function cwPill(status) {
    var s = cwStr(status).toUpperCase();
    var cls = /RUNNING/.test(s) ? 'run' : /PAUSED|PENDING/.test(s) ? 'paused' : 'ended';
    return '<span class="cw-pill ' + cls + '">' + esc(s || '—') + '</span>';
  }

  var CW = { account: '', data: null };

  /* Zain's pull: everything this screen knows, as a CSV he can open in Sheets. The data has
   * already been role-stripped server-side — the export can never carry more than the screen. */
  function cwCsv(rows, cols, name) {
    var esc1 = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var out = cols.join(',') + '\n';
    rows.forEach(function (r) { out += cols.map(function (c) { return esc1(r[c]); }).join(',') + '\n'; });
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(out);
    a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast(rows.length + ' row(s) exported.');
  }

  function cwFetch() {
    return api('campaignWatch', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('campaignWatch', {}, d); }
      return d;
    });
  }

  function cwPaint(d) {
    var box = $('cwBody');
    if (!box) { return; }
    CW.data = d || {};
    var acc = CW.account;
    var camps = (d.campaigns || []).filter(function (c) { return !acc || c.account === acc; });
    var dupRows = (d.duplicates || []).filter(function (c) { return !acc || c.account === acc; });
    var events = (d.events || []).filter(function (e) { return !acc || e.account === acc; });

    // one server row per (item, campaign) — group per item so each campaign gets its own ✕
    var groups = {}, gOrder = [];
    dupRows.forEach(function (r) {
      var k = r.account + '|' + r.listing_id;
      if (!groups[k]) { groups[k] = []; gOrder.push(k); }
      groups[k].push(r);
    });
    var cnt = $('cwCount');
    if (cnt) { cnt.textContent = camps.length + ' campaign(s) · ' + gOrder.length + ' duplicate item(s)'; }

    var h = '';
    (d.sync || []).forEach(function (s) {
      if (cwStr(s.job) !== 'adsEnrolment') { return; }
      if (acc && cwStr(s.account) !== acc) { return; }
      h += '<div class="cw-dupbox" style="border-color:var(--warn);background:var(--warn-soft)">' +
        '<h3 style="color:var(--warn)">' + esc(cwStr(s.account)) + ' — ' + esc(cwStr(s.last_error)) + '</h3>' +
        '<p style="margin:0;font-size:11.5px;color:var(--text-3);font-weight:600">Nothing is broken: that shop\'s orders, listings and CS keep syncing. Enrol it in Promoted Listings on eBay and its campaigns appear here on the next 5-minute tick.</p></div>';
    });
    /* review 4b: the dynamic-campaign price rules, red and named */
    var dA = (d.dyn_over15 || []).filter(function (r) { return !acc || cwStr(r.account) === acc; });
    var dB = (d.dyn_high_rate || []).filter(function (r) { return !acc || cwStr(r.account) === acc; });
    if (dA.length || dB.length) {
      h += '<div class="cw-dupbox"><h3>\ud83d\udfe0 ' + (dA.length + dB.length) + ' dynamic-campaign price rule violation(s) \u2014 management has been lettered</h3>';
      dA.slice(0, 8).forEach(function (r) {
        h += '<div style="margin-top:4px">\u00a3' + Number(r.price).toFixed(2) + ' item in DYNAMIC \u2014 <b>' + esc(cwStr(r.title) || cwStr(r.item_id)).slice(0, 60) + '</b> \u00b7 ' + esc(cwStr(r.account)) + ' \u00b7 \u201c' + esc(cwStr(r.cname)).slice(0, 35) + '\u201d \u00b7 over-\u00a315 items do not belong in dynamic</div>';
      });
      dB.slice(0, 8).forEach(function (r) {
        h += '<div style="margin-top:4px">' + Number(r.bid_pct).toFixed(1) + '% rate on \u00a3' + Number(r.price).toFixed(2) + ' item \u2014 <b>' + esc(cwStr(r.title) || cwStr(r.item_id)).slice(0, 60) + '</b> \u00b7 ' + esc(cwStr(r.account)) + ' \u00b7 \u201c' + esc(cwStr(r.cname)).slice(0, 35) + '\u201d \u00b7 over-\u00a310 items stay at 15% or below in dynamic general</div>';
      });
      h += '</div>';
    }
    if (gOrder.length) {
      /* Review 3: every chip carries the campaign's REAL status — running (red-hot, double fees,
         removable) vs paused/ended (grey, informational). The urgent count is only the listings
         truly RUNNING in more than one place. */
      var urgentN = 0;
      gOrder.forEach(function (k) {
        if (groups[k].filter(function (r) { return r.live; }).length > 1) { urgentN++; }
      });
      h += '<div class="cw-dupbox"><h3>🔴 URGENT: ' + urgentN + ' item(s) LIVE in more than one RUNNING campaign — eBay can charge each of them in every running campaign they sit in</h3>' +
        '<p style="margin:0 0 8px;font-size:11.5px;color:var(--text-3);font-weight:600">Each campaign the listing sits in shows its TRUE state — only <b style="color:var(--bad)">LIVE</b> memberships (running campaign · active ad · active listing) cost money and carry ✕ to remove. <b>Paused ads, paused campaigns and ended listings are grey and harmless.</b> A fresh move can echo here for ~90 minutes while the old campaign refreshes.</p>' +
        '<div class="scroll"><table class="cw-tbl"><thead><tr><th>Account</th><th>Item</th><th>Sits in — live status per campaign · ✕ removes from that one</th></tr></thead><tbody>';
      gOrder.forEach(function (k) {
        var list = groups[k];
        var r0 = list[0];
        var liveN = list.filter(function (r) { return r.live; }).length;
        var chips = list.map(function (r) {
          var live = !!r.live;
          var chip = cwStr(r.chip) || (/RUNNING/i.test(cwStr(r.status)) ? 'LIVE' : cwStr(r.status));
          var paused = /PAUSED/i.test(chip);
          var tone = live ? 'background:var(--bad-soft);border:1px solid rgba(240,96,90,.5);color:var(--bad)'
            : paused ? 'background:rgba(120,132,152,.12);border:1px solid rgba(120,132,152,.35);color:var(--text-3)'
            : 'background:rgba(120,132,152,.08);border:1px solid rgba(120,132,152,.25);color:var(--text-3);opacity:.7';
          return '<span class="cw-pill" style="margin:2px 6px 2px 0;display:inline-block;' + tone + '">' +
            esc(cwStr(r.name) || cwStr(r.campaign_id)) +
            ' <b style="font-size:9px;letter-spacing:.05em">' + esc(chip) + '</b>' +
            (live ? ' <a href="#" data-cw-rm="1" data-acc="' + cwAttr(r.account) + '" data-cid="' + cwAttr(r.campaign_id) + '" data-lid="' + cwAttr(r.listing_id) + '" data-nm="' + cwAttr(r.name) + '" style="color:var(--bad);font-weight:900;text-decoration:none">✕</a>' : '') +
            '</span>';
        }).join('');
        h += '<tr' + (liveN > 1 ? ' style="background:var(--bad-soft)"' : '') + '><td>' + esc(cwStr(r0.account)) + '</td>' +
          '<td><div style="font-weight:700;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(cwStr(r0.title) || '(title not synced yet)') + '</div>' +
          '<div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(cwStr(r0.listing_id)) + (liveN > 1 ? ' · <b style="color:var(--bad)">' + liveN + ' LIVE at once</b>' : '') + '</div></td>' +
          '<td style="max-width:460px">' + chips + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
    } else {
      h += '<div class="cw-dupbox" style="border-color:var(--ok);background:var(--ok-soft)"><h3 style="color:var(--ok)">✓ No item sits in more than one running campaign' + (acc ? ' on ' + esc(acc) : '') + '</h3></div>';
    }

    /* Hasib item 9, the other half: ACTIVE listings sitting in NO campaign at all. */
    var unc = (d.uncampaigned || []).filter(function (r) { return !acc || r.account === acc; });
    if (unc.length) {
      h += '<div class="cw-dupbox" style="border-color:var(--warn)"><h3 style="color:var(--warn)">🟡 ' + unc.length + ' active listing(s) in NO campaign — unadvertised reach</h3>' +
        '<div class="scroll" style="max-height:280px"><table class="cw-tbl"><thead><tr><th>Account</th><th>Item</th><th>Price</th><th>Sold 30d</th></tr></thead><tbody>';
      unc.forEach(function (r) {
        h += '<tr><td>' + esc(cwStr(r.account)) + '</td>' +
          '<td><div style="font-weight:700;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          '<a href="https://www.ebay.co.uk/itm/' + esc(cwStr(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(cwStr(r.title) || cwStr(r.item_id)) + '</a></div>' +
          '<div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(cwStr(r.item_id)) + '</div></td>' +
          '<td class="cw-num">£' + (Number(r.price) || 0).toFixed(2) + '</td>' +
          '<td class="cw-num">' + (Number(r.sold_30d) || 0) + '</td></tr>';
      });
      h += '</tbody></table></div><p style="margin:8px 0 0;font-size:11px;color:var(--text-3);font-weight:600">The Advertising Manager gets one digest bell a day while this list is not empty.</p></div>';
    } else {
      h += '<div class="cw-dupbox" style="border-color:var(--ok);background:var(--ok-soft)"><h3 style="color:var(--ok)">✓ Every active listing sits in at least one campaign' + (acc ? ' on ' + esc(acc) : '') + '</h3></div>';
    }

    h += '<div class="scroll"><table class="cw-tbl"><thead><tr><th>Account</th><th>Campaign</th><th>Status</th><th>Budget/day</th><th>Items</th><th>Synced</th></tr></thead><tbody>';
    if (!camps.length) {
      h += '<tr><td colspan="6" style="color:var(--text-2);font-weight:700">No campaigns synced yet for this filter.</td></tr>';
    }
    camps.forEach(function (c) {
      h += '<tr><td>' + esc(cwStr(c.account)) + '</td>' +
        '<td style="font-weight:700">' + esc(cwStr(c.name) || cwStr(c.campaign_id)) + '</td>' +
        '<td>' + cwPill(c.status) + '</td>' +
        '<td class="cw-num">' + (Number(c.budget) ? '£' + Number(c.budget).toFixed(2) : '—') + '</td>' +
        '<td class="cw-num">' + (Number(c.items) || 0) + '</td>' +
        '<td class="cw-when">' + esc(cwPKT(c.synced_at)) + '</td></tr>';
    });
    h += '</tbody></table></div>';

    var cpq = (d.cpq || []).filter(function (r) { return !acc || r.account === acc; });
    if (cpq.length) {
      h += '<h3 style="margin:16px 0 6px;font-size:13px">CPQ — ad cost per unit sold, last 14 days <span style="color:var(--text-3);font-weight:600">(burners first: spend with zero sales)</span></h3>' +
        '<div class="scroll"><table class="cw-tbl"><thead><tr><th>Item</th><th>Account</th><th>Spend 14d</th><th>Clicks</th><th>Units</th><th>CPQ</th></tr></thead><tbody>';
      cpq.forEach(function (r) {
        var burner = !Number(r.units);
        h += '<tr><td><div style="font-weight:700;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(cwStr(r.title) || '(title not synced)') + '</div>' +
          '<div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(cwStr(r.item_id)) + '</div></td>' +
          '<td>' + esc(cwStr(r.account)) + '</td>' +
          '<td class="cw-num' + (burner ? '" style="color:var(--bad);font-weight:800' : '') + '">£' + (Number(r.spend) || 0).toFixed(2) + '</td>' +
          '<td class="cw-num">' + (Number(r.clicks) || 0) + '</td>' +
          '<td class="cw-num' + (burner ? '" style="color:var(--bad);font-weight:800' : '') + '">' + (Number(r.units) || 0) + '</td>' +
          '<td class="cw-num">' + (burner ? '<span style="color:var(--bad);font-weight:800">burning</span>' : '£' + (Number(r.cpq) || 0).toFixed(2)) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }

    h += '<h3 style="margin:16px 0 6px;font-size:13px">Recent changes <span style="color:var(--text-3);font-weight:600">(external edits say so — the portal cannot see who acts on eBay)</span></h3><ul class="cw-feed" style="margin:0;padding:0">';
    if (!events.length) { h += '<li style="color:var(--text-2)">Nothing yet — changes appear within 5 minutes of happening on eBay.</li>'; }
    events.slice(0, 30).forEach(function (e) {
      var what = cwStr(e.change_type);
      /* RL-3: campaign names are free text typed on eBay — EVERY interpolation goes through esc(). */
      var line = what === 'duplicate_active'
        ? '🔴 duplicate-ACTIVE: item ' + esc(cwStr(e.item_id)) + ' in ' + esc(cwStr(e.new)) + ' running campaigns (' + esc(cwStr(e.campaign)) + ')'
        : esc(cwStr(e.campaign)) + ' — ' + esc(what) + (cwStr(e.old) || cwStr(e.new) ? ': ' + esc(cwStr(e.old)) + ' → ' + esc(cwStr(e.new)) : '');
      h += '<li><span class="cw-when">' + esc(cwPKT(e.at)) + '</span>' + esc(cwStr(e.account)) + ' · ' + line + (cwStr(e.actor) ? ' · by ' + esc(cwStr(e.actor)) : '') + '</li>';
    });
    h += '</ul>';
    box.innerHTML = h;
  }

  function cwLoad() {
    var box = $('cwBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('campaignWatch', {}) : null;
    if (had) { try { cwPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    cwFetch().then(cwPaint).catch(function (e) {
      if (had) { toast('Showing the last snapshot — could not refresh just now.'); return; }
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">Could not load the campaign watch.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.campaignWatch = {
    label: 'Campaign watch',
    order: 7,
    roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    prefetch: function () { return cwFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Campaign <span class="goldtext">watch</span></h1>' +
          '<span class="sub">Live from eBay every 5 minutes · duplicate-ACTIVE items caught automatically · external changes carry no name</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div class="cw-bar"><select class="alx-sel" id="cwAcc"><option value="">All accounts</option></select>' +
          '<button class="minibtn" id="cwRefresh">Refresh</button>' +
          '<button class="minibtn" id="cwExpCamps">⬇ Campaigns CSV</button>' +
          '<button class="minibtn" id="cwExpDups">⬇ Duplicates CSV</button>' +
          '<button class="minibtn" id="cwExpCpq">⬇ CPQ CSV</button>' +
          '<span class="cw-count" id="cwCount"></span></div>' +
          '<div id="cwBody"><div class="spinner"></div></div>' +
        '</div></div>';
    },
    init: function () {
      cachedCall('accountList', {}, function (d) {
        var sel = $('cwAcc');
        if (!sel) { return; }
        var keep = sel.value;
        sel.innerHTML = '<option value="">All accounts</option>' + ((d && d.accounts) || []).map(function (a) {
          var n = cwStr(a.account);
          return n ? '<option' + (n === keep ? ' selected' : '') + '>' + esc(n) + '</option>' : '';
        }).join('');
      });
      var sel = $('cwAcc');
      if (sel) { sel.onchange = function () { CW.account = cwStr(this.value); if (CW.data) { cwPaint(CW.data); } }; }
      var rf = $('cwRefresh');
      if (rf) { rf.onclick = cwLoad; }
      var f = function (list) { return (list || []).filter(function (r) { return !CW.account || r.account === CW.account; }); };
      var e1 = $('cwExpCamps');
      if (e1) { e1.onclick = function () { cwCsv(f(CW.data && CW.data.campaigns), ['account', 'campaign_id', 'name', 'status', 'budget', 'items', 'synced_at'], 'campaigns'); }; }
      var e2 = $('cwExpDups');
      if (e2) { e2.onclick = function () { cwCsv(f(CW.data && CW.data.duplicates), ['account', 'listing_id', 'campaign_id', 'name', 'title'], 'duplicate-active'); }; }
      var e3 = $('cwExpCpq');
      if (e3) { e3.onclick = function () { cwCsv(f(CW.data && CW.data.cpq), ['account', 'item_id', 'title', 'spend', 'clicks', 'units', 'cpq'], 'cpq-14d'); }; }
      var body = $('cwBody');
      if (body) {
        body.onclick = function (ev) {
          var a = ev.target && ev.target.closest ? ev.target.closest('[data-cw-rm]') : null;
          if (!a) { return; }
          ev.preventDefault();
          var nm = a.getAttribute('data-nm') || a.getAttribute('data-cid');
          if (!window.confirm('Remove item ' + a.getAttribute('data-lid') + ' from "' + nm + '"?')) { return; }
          a.textContent = '…';
          api('campaignRemoveItem', {
            account: a.getAttribute('data-acc'),
            campaign_id: a.getAttribute('data-cid'),
            listing_id: a.getAttribute('data-lid'),
          }).then(function (res) {
            toast(res && res.shadow ? 'Shadow mode — recorded, nothing sent: ' + (res.would_do || '') : 'Removed from "' + ((res && res.campaign) || nm) + '".');
            cwLoad();
          }).catch(function (e) {
            a.textContent = '✕';
            toast(e.message || 'Could not remove it.');
          });
        };
      }
      cwLoad();
    }
  };
})();
