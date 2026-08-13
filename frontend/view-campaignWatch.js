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
    var dups = (d.duplicates || []).filter(function (c) { return !acc || c.account === acc; });
    var events = (d.events || []).filter(function (e) { return !acc || e.account === acc; });
    var cnt = $('cwCount');
    if (cnt) { cnt.textContent = camps.length + ' campaign(s) · ' + dups.length + ' duplicate item(s)'; }

    var h = '';
    if (dups.length) {
      h += '<div class="cw-dupbox"><h3>🔴 ' + dups.length + ' item(s) in more than one RUNNING campaign — eBay can charge each of them in every campaign they sit in</h3>' +
        '<p style="margin:0 0 8px;font-size:11.5px;color:var(--text-3);font-weight:600">An item you just moved between campaigns can show here for up to ~90 minutes while the old campaign refreshes — bells only ring once a duplicate is confirmed past that.</p>' +
        '<div class="scroll"><table class="cw-tbl"><thead><tr><th>Account</th><th>Item</th><th>Campaigns</th><th>Sits in</th></tr></thead><tbody>';
      dups.forEach(function (r) {
        h += '<tr><td>' + esc(cwStr(r.account)) + '</td>' +
          '<td><div style="font-weight:700;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(cwStr(r.title) || '(title not synced yet)') + '</div>' +
          '<div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(cwStr(r.listing_id)) + '</div></td>' +
          '<td class="cw-num">' + (Number(r.n) || 0) + '</td>' +
          '<td style="max-width:340px">' + esc(cwStr(r.names)) + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
    } else {
      h += '<div class="cw-dupbox" style="border-color:var(--ok);background:var(--ok-soft)"><h3 style="color:var(--ok)">✓ No item sits in more than one running campaign' + (acc ? ' on ' + esc(acc) : '') + '</h3></div>';
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
          '<button class="minibtn" id="cwRefresh">Refresh</button><span class="cw-count" id="cwCount"></span></div>' +
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
      cwLoad();
    }
  };
})();
