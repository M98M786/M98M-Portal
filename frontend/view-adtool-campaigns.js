/* view-adtool-campaigns.js — Advertising Tool · Campaigns live (spec §7, Phase 2).
 * Hidden from every sidebar (hidden:true); data only while portal_config.adtool_page_campaigns is on.
 * "Where is it?" lookup by item id, the issues the sync finds, and every campaign with its ad counts.
 * Galaxy tokens only; gold is the only accent, #e0563f the only loss colour. Read-only: nothing here writes to eBay. */
(function () {
  var AC = { data: null, acct: '' };
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  VIEW_CSS.push(
    '.ac-wrap{max-width:1240px}' +
    '.ac-search{display:flex;gap:8px;align-items:center;margin:8px 0 14px;flex-wrap:wrap}' +
    '.ac-search input{flex:1 1 320px;min-width:200px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}' +
    '.ac-search input:focus{outline:2px solid var(--gold-b);outline-offset:1px}' +
    '.ac-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:8px 12px;font:inherit;font-weight:800;cursor:pointer}' +
    '.ac-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}' +
    '.ac-panel h3{margin:0 0 4px;font-size:15px;font-weight:800}.ac-panel .ac-sub{font-size:12px;color:var(--text-2);margin:0 0 10px}' +
    '.ac-src{display:inline-block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:8px;vertical-align:middle;font-weight:800}' +
    '.ac-issues{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:12px}' +
    '.ac-issue{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;cursor:pointer}' +
    '.ac-issue.on{border-color:var(--gold-b)}' +
    '.ac-issue .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ac-issue .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}.ac-issue .v.loss{color:#ffb3a6}' +
    '.ac-issue .d{font-size:11.5px;color:var(--text-2);margin-top:2px}' +
    '.ac-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}' +
    '.ac-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);padding:6px 8px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.ac-tbl td{padding:6px 8px;border-bottom:1px solid var(--gold-line);vertical-align:top}.ac-tbl td.r,.ac-tbl th.r{text-align:right}' +
    '.ac-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}' +
    '.ac-tag.live{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.ac-tag.off{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.ac-note{font-size:12.5px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:10px 12px}' +
    '.ac-empty{color:var(--text-3);font-size:13px;padding:6px 0}' +
    '.ac-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.ac-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.ac-filters button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}' +
    '.ac-scroll{overflow-x:auto}'
  );
  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  function src(t) { return '<span class="ac-src">' + esc(t) + '</span>'; }
  function whenS(s) { return s ? esc(String(s).replace('T', ' ').slice(0, 16)) : '—'; }

  VIEWS.adtoolCampaigns = {
    label: 'Campaigns live', hidden: true, order: 96, roles: ROLES,
    icon: '<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/><circle cx="18" cy="16" r="3"/>',
    render: function () {
      return '<div class="ac-wrap">' +
        '<div class="hgroup enter d1"><h1>Campaigns live</h1><span class="sub">Advertising tool · preview · where every ad sits right now, and the issues the sync finds (read-only)</span></div>' +
        '<div class="ac-search"><input id="acQ" type="search" placeholder="Where is it? — item id, press Enter" autocomplete="off"><button class="ac-btn" id="acGo">Look up</button></div>' +
        '<div id="acWhere"></div>' +
        '<div id="acBody"><div class="ac-empty">Loading…</div></div></div>';
    },
    init: function () {
      var q = $('acQ'), go = $('acGo');
      go.onclick = function () { var id = q.value.replace(/\D/g, ''); if (/^\d{9,13}$/.test(id)) whereIs(id); else toast('Give an item id'); };
      q.onkeydown = function (e) { if (e.key === 'Enter') go.onclick(); };
      load();
    }
  };

  function load() {
    api('adtoolCampaigns', {}).then(function (d) { AC.data = d; draw(); }).catch(function (e) { $('acBody').innerHTML = '<div class="ac-panel"><h3>Not available</h3><div class="ac-sub">' + esc(e.message || 'failed') + '</div></div>'; });
  }
  function whereIs(id) {
    $('acWhere').innerHTML = '<div class="ac-empty">Looking up ' + esc(id) + '…</div>';
    api('adtoolWhereIs', { item_id: id }).then(function (d) {
      var it = d.item || {};
      var h = '<div class="ac-panel"><h3>' + esc(it.title || id) + src('campaign map · 15 min') + '</h3><div class="ac-sub">' + esc(it.account || '') + ' · item ' + esc(id) + ' · ' + esc(it.status || '') + (it.price != null ? ' · ' + gbp(it.price) : '') + ' · ' + esc(d.note || '') + '</div>';
      h += d.rows.length ? whereTable(d.rows) : '<div class="ac-empty">Not in any campaign the map knows.</div>';
      h += '<h3 style="margin-top:12px">Status change history</h3>' + (d.history.length ? '<table class="ac-tbl"><thead><tr><th>When</th><th>Campaign</th><th>From</th><th>To</th><th>Seen by</th></tr></thead><tbody>' + d.history.map(function (x) { return '<tr><td>' + whenS(x.seen_at) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.from_status || '—') + '</td><td>' + esc(x.to_status) + '</td><td>' + esc(x.source === 'sync' ? 'changed on eBay (the sync cannot see who)' : x.source) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">No state changes recorded yet — events start with this phase.</div>');
      h += '</div>';
      $('acWhere').innerHTML = h;
    }).catch(function (e) { $('acWhere').innerHTML = '<div class="ac-panel"><h3>Not available</h3><div class="ac-sub">' + esc(e.message || 'failed') + '</div></div>'; });
  }
  function whereTable(rows) {
    return '<div class="ac-scroll"><table class="ac-tbl"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>This ad</th><th class="r">Ad rate</th><th class="r">Budget</th><th class="r">Spend yday</th><th class="r">Sales yday</th><th class="r">7-day spend</th><th class="r">7-day ROAS</th><th>Last change</th></tr></thead><tbody>' +
      rows.map(function (c) { return '<tr><td>' + esc(c.name) + (c.start_date ? '<div class="ac-empty" style="padding:0">' + esc(c.start_date.slice(0, 10)) + (c.end_date ? ' → ' + esc(c.end_date.slice(0, 10)) : '') + '</div>' : '') + '</td><td>' + esc(c.funding === 'COST_PER_CLICK' ? 'CPC (Advanced)' : c.funding === 'COST_PER_SALE' ? 'Cost per sale' : c.funding || '?') + '</td><td>' + esc(c.campaign_status || '?') + '</td><td><span class="ac-tag ' + (c.live ? 'live' : 'off') + '">' + esc(c.ad_state) + (c.live ? ' · live' : '') + '</span></td><td class="r">' + esc(c.ad_bid ? c.ad_bid + '%' : (c.campaign_bid ? c.campaign_bid + '% (campaign)' : '—')) + '</td><td class="r">' + (c.budget != null ? gbp(c.budget, 0) : '—') + '</td><td class="r">' + gbp(c.spend_yesterday) + '</td><td class="r">' + (c.units_yesterday == null ? '—' : c.units_yesterday + ' · ' + gbp(c.revenue_yesterday)) + '</td><td class="r">' + gbp(c.spend_7d) + '</td><td class="r">' + roas(c.roas_7d) + '</td><td>' + whenS(c.last_change) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function draw() {
    var D = AC.data, I = D.issues;
    var cards = [
      ['unresolved', 'Unresolved campaign ids', I.unresolved.ids, I.unresolved.listings + ' listings · ' + gbp(I.unresolved.spend_30d, 0) + ' in 30 d · ' + I.unresolved.resolved_by_archive + ' now named by the archive', I.unresolved.ids > 0],
      ['dual', 'CPC + cost-per-sale at once', (I.dual_funding.paid_both_count || 0) + I.dual_funding.count, (I.dual_funding.paid_both_count || 0) + ' charged both on one day · ' + I.dual_funding.count + ' live in both now', ((I.dual_funding.paid_both_count || 0) + I.dual_funding.count) > 0],
      ['zero', 'Spending, no sale (30 d)', I.zero_sale.count, gbp(I.zero_sale.spend_30d, 0) + ' · A03 (≥ £10 in 14 d): ' + I.zero_sale.a03_count + ' on ' + gbp(I.zero_sale.a03_spend_14d, 0), I.zero_sale.count > 0],
      ['ended', 'Ended listings still spending (7 d)', I.ended_still_spending.count, gbp(I.ended_still_spending.spend_7d, 0), I.ended_still_spending.count > 0],
      ['off', 'Paused/ended campaigns spending (2 d)', I.campaign_off_still_spending.count, I.campaign_off_still_spending.campaign_rows && I.campaign_off_still_spending.campaign_rows.n ? 'from campaign-level rows ' + I.campaign_off_still_spending.campaign_rows.mn + ' → ' + I.campaign_off_still_spending.campaign_rows.mx : 'needs the campaign-level report rows (next daily ingest)', I.campaign_off_still_spending.count > 0],
      ['paused', 'CPC ads paused > 7 days', I.paused_long.count, I.paused_long.paused_total + ' paused in all', I.paused_long.count > 0],
    ];
    var h = '<div class="ac-issues">' + cards.map(function (c) { return '<div class="ac-issue" data-k="' + c[0] + '"><div class="k">' + esc(c[1]) + '</div><div class="v' + (c[4] ? ' loss' : '') + '">' + c[2] + '</div><div class="d">' + esc(c[3]) + '</div></div>'; }).join('') + '</div>';
    h += '<div id="acIssue"></div>';
    var accts = []; D.campaigns.forEach(function (c) { if (accts.indexOf(c.account) < 0) accts.push(c.account); });
    h += '<div class="ac-panel"><h3>All campaigns' + src('adsSync · 5 min') + src('adsItems · 15 min') + '</h3><div class="ac-sub">Ad counts from the campaign map; 7-day spend and ROAS per campaign from the tool\'s campaign-level report rows (blank until they land). ' + D.archive_count + ' archived campaigns keep old ids resolvable; ' + (D.ad_events && D.ad_events.n ? D.ad_events.n + ' ad state events since ' + String(D.ad_events.first).slice(0, 10) : 'no ad state events yet') + '.</div>' +
      '<div class="ac-filters"><button class="' + (AC.acct === '' ? 'on' : '') + '" data-a="">All accounts</button>' + accts.map(function (a) { return '<button class="' + (AC.acct === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div><div id="acCamps"></div></div>';
    h += '<div class="ac-note">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + '</div>';
    $('acBody').innerHTML = h;
    var cs = document.querySelectorAll('.ac-issue'); for (var i = 0; i < cs.length; i++) cs[i].onclick = function () { for (var j = 0; j < cs.length; j++) cs[j].classList.toggle('on', cs[j] === this); showIssue(this.getAttribute('data-k')); };
    var fs = document.querySelectorAll('.ac-filters button'); for (var k = 0; k < fs.length; k++) fs[k].onclick = function () { AC.acct = this.getAttribute('data-a'); for (var j = 0; j < fs.length; j++) fs[j].classList.toggle('on', fs[j] === this); drawCamps(); };
    drawCamps();
  }
  function showIssue(k) {
    var I = AC.data.issues, h = '';
    var link = function (id) { return '<a href="#" class="ac-open" data-id="' + esc(id) + '">' + esc(id) + '</a>'; };
    if (k === 'unresolved') h = '<h3>Unresolved campaign ids</h3><div class="ac-sub">Ids in the ad map with no row in the campaigns table — usually campaigns that ended and were dropped from eBay\'s list before this phase started archiving them. ' + I.unresolved.listings_with_spend_30d + ' of the listings touched spent ' + gbp(I.unresolved.spend_30d) + ' in the last 30 days.</div><table class="ac-tbl"><thead><tr><th>Campaign id</th><th>Account</th><th class="r">Listings</th><th>Now named as</th></tr></thead><tbody>' + I.unresolved.sample.map(function (x) { return '<tr><td>' + esc(x.campaign_id) + '</td><td>' + esc(x.account) + '</td><td class="r">' + x.listings + '</td><td>' + esc(x.archived_name || '—') + '</td></tr>'; }).join('') + '</tbody></table>';
    if (k === 'dual') h = '<h3>In a CPC and a cost-per-sale campaign at once</h3><div class="ac-sub">The A05 rule (spec §6.10): both kinds charge for the same sale. ' + esc(I.dual_funding.note || '') + '.</div>' +
      '<h3 style="margin-top:10px;font-size:13px">Charged both on the same day, last 30 days' + src('eBay billing') + '</h3>' + (I.dual_funding.paid_both && I.dual_funding.paid_both.length ? '<div class="ac-sub">' + I.dual_funding.paid_both_count + ' listings, ' + gbp(I.dual_funding.paid_both_fees) + ' of fees on the days both meters ran.</div><table class="ac-tbl"><thead><tr><th>Item</th><th>Account</th><th>Title</th><th class="r">Days</th><th class="r">Sale fees</th><th class="r">Click fees</th><th>Last</th></tr></thead><tbody>' + I.dual_funding.paid_both.map(function (x) { return '<tr><td>' + link(x.item_id) + '</td><td>' + esc(x.account) + '</td><td>' + esc(String(x.title || '').slice(0, 44)) + '</td><td class="r">' + x.days + '</td><td class="r">' + gbp(x.std_fees) + '</td><td class="r">' + gbp(x.cpc_fees) + '</td><td>' + esc(x.last_day) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">None charged both on one day in the last 30.</div>') +
      '<h3 style="margin-top:12px;font-size:13px">Live in both right now' + src('campaign map') + '</h3>' + (I.dual_funding.sample.length ? '<table class="ac-tbl"><thead><tr><th>Item</th><th>Account</th><th>Title</th><th>Campaigns</th></tr></thead><tbody>' + I.dual_funding.sample.map(function (x) { return '<tr><td>' + link(x.item_id) + '</td><td>' + esc(x.account) + '</td><td>' + esc(x.title || '') + '</td><td>' + esc(x.campaigns) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">None right now — every listing that sits in both kinds of campaign has its click ad archived or paused.</div>');
    if (k === 'zero') h = '<h3>Spending with no attributed sale, last 30 days</h3><div class="ac-sub">Top 20 by spend. A03 fires at £10 in 14 days.</div><table class="ac-tbl"><thead><tr><th>Item</th><th>Account</th><th class="r">Spend 30 d</th><th class="r">Spend 14 d</th><th class="r">Clicks</th></tr></thead><tbody>' + I.zero_sale.sample.map(function (x) { return '<tr><td>' + link(x.item_id) + '</td><td>' + esc(x.account) + '</td><td class="r">' + gbp(x.spend_30d) + '</td><td class="r">' + gbp(x.spend_14d) + '</td><td class="r">' + x.clicks + '</td></tr>'; }).join('') + '</tbody></table>';
    if (k === 'ended') h = '<h3>Ended or sold-out listings that still carried spend, last 7 days</h3><div class="ac-sub">The A04 rule. eBay keeps billing an ad whose listing has gone.</div><table class="ac-tbl"><thead><tr><th>Item</th><th>Account</th><th>Title</th><th>Listing</th><th class="r">Spend 7 d</th><th>Last day</th></tr></thead><tbody>' + I.ended_still_spending.sample.map(function (x) { return '<tr><td>' + link(x.item_id) + '</td><td>' + esc(x.account) + '</td><td>' + esc(x.title || '') + '</td><td>' + esc(x.status) + (x.qty === 0 ? ' · qty 0' : '') + '</td><td class="r">' + gbp(x.spend_7d) + '</td><td>' + esc(x.last_day) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (k === 'off') h = '<h3>Paused or ended campaigns with spend in the last 2 report days</h3><div class="ac-sub">The A06 rule. Needs the campaign-level report rows.</div>' + (I.campaign_off_still_spending.sample.length ? '<table class="ac-tbl"><thead><tr><th>Campaign</th><th>Account</th><th>Status</th><th class="r">Spend 2 d</th><th>Last day</th></tr></thead><tbody>' + I.campaign_off_still_spending.sample.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.account) + '</td><td>' + esc(x.status) + '</td><td class="r">' + gbp(x.spend_2d) + '</td><td>' + esc(x.last_day) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">None found' + (I.campaign_off_still_spending.campaign_rows && I.campaign_off_still_spending.campaign_rows.n ? '.' : ' — no campaign-level rows yet.') + '</div>');
    if (k === 'paused') h = '<h3>CPC ads paused inside a running campaign for more than 7 days</h3><div class="ac-sub">The A13 rule. ' + esc(I.paused_long.note) + '</div><table class="ac-tbl"><thead><tr><th>Item</th><th>Account</th><th>Campaign</th><th>Paused since</th></tr></thead><tbody>' + I.paused_long.sample.map(function (x) { return '<tr><td>' + link(x.item_id) + '</td><td>' + esc(x.account) + '</td><td>' + esc(x.name) + '</td><td>' + whenS(x.paused_since) + '</td></tr>'; }).join('') + '</tbody></table>';
    $('acIssue').innerHTML = '<div class="ac-panel">' + h + '</div>';
    var ls = document.querySelectorAll('.ac-open'); for (var i = 0; i < ls.length; i++) ls[i].onclick = function (e) { e.preventDefault(); $('acQ').value = this.getAttribute('data-id'); whereIs(this.getAttribute('data-id')); window.scrollTo(0, 0); };
  }
  function drawCamps() {
    var rows = AC.data.campaigns.filter(function (c) { return !AC.acct || c.account === AC.acct; });
    $('acCamps').innerHTML = '<div class="ac-scroll"><table class="ac-tbl"><thead><tr><th>Account</th><th>Campaign</th><th>Type</th><th>Status</th><th class="r">Budget</th><th class="r">Bid</th><th>Dates</th><th class="r">Ads</th><th class="r">Active</th><th class="r">Paused</th><th class="r">Archived</th><th class="r">7-day spend</th><th class="r">ROAS</th><th>Last change</th></tr></thead><tbody>' +
      rows.map(function (c) { var running = /RUNNING|ENDING_SOON/.test(String(c.status)); return '<tr><td>' + esc(c.account) + '</td><td>' + esc(c.name) + '</td><td>' + esc(c.funding_model === 'COST_PER_CLICK' ? 'CPC' : c.funding_model === 'COST_PER_SALE' ? 'CPS' : c.funding_model || '?') + '</td><td><span class="ac-tag ' + (running ? 'live' : 'off') + '">' + esc(c.status) + '</span></td><td class="r">' + (c.budget ? gbp(c.budget, 0) : '—') + '</td><td class="r">' + esc(c.bid_pct ? c.bid_pct + '%' : '—') + '</td><td>' + (c.start_date ? esc(String(c.start_date).slice(0, 10)) + (c.end_date ? ' → ' + esc(String(c.end_date).slice(0, 10)) : ' →') : '—') + '</td><td class="r">' + c.ads + '</td><td class="r">' + c.ads_active + (c.ads_unstamped ? ' <span class="ac-src" title="not yet stamped by adsItems">+' + c.ads_unstamped + '</span>' : '') + '</td><td class="r">' + c.ads_paused + '</td><td class="r">' + c.ads_archived + '</td><td class="r">' + gbp(c.spend_7d) + '</td><td class="r">' + roas(c.roas_7d) + '</td><td>' + whenS(c.last_change) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
})();
