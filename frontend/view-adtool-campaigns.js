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
    /* an ad status is a READING: its date rides under it, and a reading a day or more old is
       written brighter so it cannot be skimmed as a present-tense fact */
    '.ac-age{display:block;font-size:10px;color:var(--text-3);font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}' +
    '.ac-age.old{color:var(--text-2)}' +
    '.ac-clash{display:inline-block;margin-top:3px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:#e0563f;white-space:nowrap}' +
    '.ac-clash-why{display:block;font-size:10px;color:#e0563f;font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}' +
    '.ac-note{font-size:12.5px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:10px 12px}' +
    '.ac-empty{color:var(--text-3);font-size:13px;padding:6px 0}' +
    '.ac-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.ac-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.ac-filters button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}' +
    '.ac-scroll{overflow-x:auto}'
  );
  function gbp(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  /* `t` is the LOOKUP key the register box matches on, so it stays stable when the wording
     changes; `shown` is what the reader sees. The key used to read 'campaign map · 15 min',
     which matched the register's 5-minute intraday row and claimed a cadence ad status has
     never had. */
  function src(t, shown) { return '<span class="ac-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function whenS(s) { return s ? esc(String(s).replace('T', ' ').slice(0, 16)) : '—'; }

  /* ── AN AD STATUS IS A READING, NOT A LIVE FACT ───────────────────────────────────────────────
     The portal re-reads a campaign's ads on a rotation, a couple of campaigns per account per tick,
     and a campaign that is not running is not re-read at all. So an ad status on this page can be
     hours or weeks old. It used to be printed as current, under a tag claiming every 15 minutes.
     Every status now carries the date of the reading behind it, and a reading a day or more old is
     written in the past tense. None of this changes what a status IS.
     The engine sends ads_synced_at, when that campaign's ads were last read, and ad_records, how
     many ad records eBay returned for that listing in that campaign. Both are read defensively,
     falling back to the per-ad synced_at the payload already carries, so the page is honest whether
     or not the engine half has landed. This block is deliberately the same in the five advertising
     views that show an ad status: change one and change all five. */
  var AD_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function adReadAt(o) {
    if (!o || typeof o !== 'object') return '';
    var v = o.ads_synced_at != null && o.ads_synced_at !== '' ? o.ads_synced_at
      : (o.ad_synced_at != null && o.ad_synced_at !== '' ? o.ad_synced_at : o.synced_at);
    return v == null ? '' : String(v).trim();
  }
  function adReadMs(at) {
    if (!at) return null;
    var s = String(at).trim().replace(' ', 'T');
    if (!/(?:Z|[+-]\d\d:?\d\d)$/.test(s)) s += 'Z';
    var t = new Date(s).getTime();
    return isNaN(t) ? null : t;
  }
  function adReadDay(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + ' ' + AD_MONTHS[d.getUTCMonth()] +
      (d.getUTCFullYear() === new Date().getUTCFullYear() ? '' : ' ' + d.getUTCFullYear());
  }
  /* band: 'now' under an hour, with nothing to say · 'hours' · 'days' · 'unknown' no usable date */
  function adFresh(o) {
    var at = adReadAt(o), ms = adReadMs(at);
    if (ms == null) return { band: 'unknown', at: '', mins: null, words: 'we do not hold when this was read' };
    var mins = (Date.now() - ms) / 60000;
    if (mins < 0) mins = 0;
    if (mins < 60) return { band: 'now', at: at, mins: mins, words: '' };
    if (mins < 1440) {
      var hrs = Math.max(1, Math.round(mins / 60));
      return { band: 'hours', at: at, mins: mins, words: 'read ' + hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago' };
    }
    var dys = Math.max(1, Math.floor(mins / 1440));
    return { band: 'days', at: at, mins: mins, words: 'last read on ' + adReadDay(ms) + ', ' + dys + ' day' + (dys === 1 ? '' : 's') + ' ago' };
  }
  function adArchived(s) { return /archiv/i.test(String(s == null ? '' : s)); }
  /* A CAMPAIGN row's own synced_at is when the CAMPAIGN was read, which is a far faster job than
     reading all of its ads, so it must never stand in for an ad reading. Ask a campaign object
     for ads_synced_at and nothing else. An ad row's own synced_at IS when that ad was read, so
     adFresh keeps it as the fallback there. */
  function adFreshCamp(o) {
    return adFresh({ ads_synced_at: o && (o.ads_synced_at != null && o.ads_synced_at !== '' ? o.ads_synced_at : o.ad_synced_at) });
  }
  function adRecords(o) {
    if (!o || typeof o !== 'object') return null;
    var n = Number(o.ad_records != null ? o.ad_records : o.ad_record_count);
    return isNaN(n) || n < 1 ? null : Math.round(n);
  }
  /* the oldest reading in a set of rows, so a panel can say how old its worst status is instead of
     claiming one cadence for all of them. An entry that is already an adFresh() answer is taken as
     it stands, which is how a caller passes readings it has already worked out per row. */
  function adOldest(rows) {
    var worst = null, unknown = 0;
    (rows || []).forEach(function (r) {
      var f = (r && typeof r.band === 'string') ? r : adFresh(r);
      if (f.band === 'unknown') { unknown++; return; }
      if (!worst || f.mins > worst.mins) worst = f;
    });
    return { worst: worst, unknown: unknown };
  }
  function adPanelNote(rows) {
    var o = adOldest(rows), bits = [];
    if (o.worst && o.worst.band !== 'now') bits.push('The oldest reading here was taken ' + (o.worst.band === 'days' ? 'on ' + adReadDay(adReadMs(o.worst.at)) : Math.max(1, Math.round(o.worst.mins / 60)) + ' hours ago') + '.');
    else if (o.worst) bits.push('Every reading here was taken within the last hour.');
    if (o.unknown) bits.push(o.unknown + (o.unknown === 1 ? ' reading does' : ' readings do') + ' not carry a date, so ' + (o.unknown === 1 ? 'it' : 'they') + ' could be hours or weeks old.');
    return bits.join(' ');
  }
  /* `quietUnknown` is for dense tables that say once, at panel level, that they do not hold
     the read times, rather than repeating it on every row. `prefix` names what was read
     when the line sits beside a different date, as in "its ads read 4 hours ago". */
  function adAgeLine(f, quietUnknown, prefix) {
    if (!f.words || (quietUnknown && f.band === 'unknown')) return '';
    return '<span class="ac-age' + (f.band === 'days' ? ' old' : '') + '">' +
      (prefix ? esc(prefix) + ' ' : '') + esc(f.words) + '</span>';
  }
  function adDupLine(o) {
    var n = adRecords(o);
    if (n == null || n < 2) return '';
    return '<span class="ac-age old">eBay returned ' + n + ' ad records for this listing in this campaign.</span>';
  }
  /* THE CONTRADICTION, said plainly. An archived ad cannot be charged, so a row reading ARCHIVED on
     a listing the same campaign billed has one of the two wrong, and the money is the half to
     believe. `money` is a figure already in this payload, never a fresh request. */
  function adClash(status, money, when) {
    var v = Number(money);
    if (!adArchived(status) || money == null || money === '' || isNaN(v) || v <= 0) return '';
    return '<span class="ac-clash" title="an archived ad cannot be charged, so one of the two is wrong">archived but spending</span>' +
      '<span class="ac-clash-why">Charged ' + gbp(v) + ' in this campaign ' + esc(String(when || '')) + '. An archived ad cannot spend, so believe the money, not this status.</span>';
  }

  VIEWS.adtoolCampaigns = {
    /* 18 Oct: renamed. This page is the six campaign FAULTS, and it sat in the sidebar next to the
       new Campaigns page reading as a second copy of it. The name now says what it carries. */
    label: 'Campaign problems', hidden: true, order: 96, roles: ROLES,
    icon: '<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/><circle cx="18" cy="16" r="3"/>',
    render: function () {
      return '<div class="ac-wrap">' +
        '<div class="hgroup enter d1"><h1>Campaign problems</h1><span class="sub">What every ad said when it was last read, and the problems we found</span></div>' +
        '<div class="ac-search"><input id="acQ" type="search" placeholder="Where is it? Type an item id and press Enter" autocomplete="off"><button class="ac-btn" id="acGo">Look up</button></div>' +
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
    api('adtoolCampaigns', {}).then(function (d) { AC.data = d; draw(); }).catch(function (e) { $('acBody').innerHTML = '<div class="ac-panel"><h3>Not available</h3><div class="ac-sub">' + esc(e.message || 'This page could not load.') + '</div></div>'; });
  }
  function whereIs(id) {
    $('acWhere').innerHTML = '<div class="ac-empty">Looking up ' + esc(id) + '…</div>';
    api('adtoolWhereIs', { item_id: id }).then(function (d) {
      var it = d.item || {};
      var h = '<div class="ac-panel"><h3>Where is it' + src('campaign map', 'ad status, read per campaign') + '</h3><div style="margin:6px 0 8px">' + adtProductCell({ item_id: id, account: it.account, title: it.title, image: it.image }) + '</div><div class="ac-sub">' + esc(it.status || '') + (it.price != null ? ' · ' + gbp(it.price) : '') + ' · ' + esc(d.note || '') + '</div>';
      h += d.rows.length ? whereTable(d.rows) : '<div class="ac-empty">Not in any campaign we can see.</div>';
      h += '<h3 style="margin-top:12px">Status change history</h3>' + (d.history.length ? '<table class="ac-tbl"><thead><tr><th>When</th><th>Campaign</th><th>From</th><th>To</th><th>Seen by</th></tr></thead><tbody>' + d.history.map(function (x) { return '<tr><td>' + whenS(x.seen_at) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.from_status || '—') + '</td><td>' + esc(x.to_status) + '</td><td>' + esc(x.source === 'sync' ? 'changed on eBay (we cannot see who)' : x.source) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">No status changes recorded yet.</div>');
      h += '</div>';
      $('acWhere').innerHTML = h;
    }).catch(function (e) { $('acWhere').innerHTML = '<div class="ac-panel"><h3>Not available</h3><div class="ac-sub">' + esc(e.message || 'This page could not load.') + '</div></div>'; });
  }
  /* this page's status cell: the reading, the date it was taken, how many ad records eBay
     returned for it, and the contradiction when an archived ad was charged in that campaign */
  function adStateCell(c) {
    var f = adFresh(c), txt = String(c.ad_state == null || c.ad_state === '' ? 'unknown' : c.ad_state);
    var money = null, when = '';
    if (Number(c.spend_yesterday) > 0) { money = c.spend_yesterday; when = 'yesterday'; }
    else if (Number(c.spend_7d) > 0) { money = c.spend_7d; when = 'over the last 7 days'; }
    return '<span class="ac-tag ' + (c.live ? 'live' : 'off') + '">' + esc(txt) + (c.live ? ' · live' : '') + '</span>' +
      adAgeLine(f) + adDupLine(c) + adClash(txt, money, when);
  }
  function whereTable(rows) {
    var note = adPanelNote(rows);
    return (note ? '<div class="ac-sub">Each ad status below is a reading taken when that campaign\'s ads were last read, not a live check. ' + esc(note) + '</div>' : '') + '<div class="ac-scroll"><table class="ac-tbl"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>This ad, when last read</th><th class="r">Ad rate</th><th class="r">Budget</th><th class="r">Spend yesterday</th><th class="r">Sales yesterday</th><th class="r">7-day spend</th><th class="r">7-day ROAS</th><th>Last change</th></tr></thead><tbody>' +
      rows.map(function (c) { return '<tr><td>' + adtCampaignLink(c.campaign_id, c.name) + (c.start_date ? '<div class="ac-empty" style="padding:0">' + esc(c.start_date.slice(0, 10)) + (c.end_date ? ' → ' + esc(c.end_date.slice(0, 10)) : '') + '</div>' : '') + '</td><td>' + esc(c.funding === 'COST_PER_CLICK' ? 'CPC (Advanced)' : c.funding === 'COST_PER_SALE' ? 'Cost per sale' : c.funding || '?') + '</td><td>' + esc(c.campaign_status || '?') + '</td><td>' + adStateCell(c) + '</td><td class="r">' + esc(c.ad_bid ? c.ad_bid + '%' : (c.campaign_bid ? c.campaign_bid + '% (campaign)' : '—')) + '</td><td class="r">' + (c.budget != null ? gbp(c.budget, 0) : '—') + '</td><td class="r">' + gbp(c.spend_yesterday) + '</td><td class="r">' + (c.units_yesterday == null ? '—' : c.units_yesterday + ' · ' + gbp(c.revenue_yesterday)) + '</td><td class="r">' + gbp(c.spend_7d) + '</td><td class="r">' + roas(c.roas_7d) + '</td><td>' + whenS(c.last_change) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function draw() {
    var D = AC.data, I = D.issues;
    var cards = [
      ['unresolved', 'Campaigns we cannot name', I.unresolved.ids, I.unresolved.listings + ' listings · ' + gbp(I.unresolved.spend_30d, 0) + ' in 30 d · ' + I.unresolved.resolved_by_archive + ' now named from our own copy', I.unresolved.ids > 0],
      ['dual', 'CPC + cost-per-sale at once', (I.dual_funding.paid_both_count || 0) + I.dual_funding.count, (I.dual_funding.paid_both_count || 0) + ' charged both on one day · ' + I.dual_funding.count + ' live in both now', ((I.dual_funding.paid_both_count || 0) + I.dual_funding.count) > 0],
      ['zero', 'Spending, no sale (30 d)', I.zero_sale.count, gbp(I.zero_sale.spend_30d, 0) + ' · ' + I.zero_sale.a03_count + ' of them over £10 in 14 days, on ' + gbp(I.zero_sale.a03_spend_14d, 0), I.zero_sale.count > 0],
      ['ended', 'Ended listings still spending (7 d)', I.ended_still_spending.count, gbp(I.ended_still_spending.spend_7d, 0), I.ended_still_spending.count > 0],
      ['off', 'Paused/ended campaigns spending (2 d)', I.campaign_off_still_spending.count, I.campaign_off_still_spending.campaign_rows && I.campaign_off_still_spending.campaign_rows.n ? 'from eBay\'s campaign report, ' + I.campaign_off_still_spending.campaign_rows.mn + ' to ' + I.campaign_off_still_spending.campaign_rows.mx : 'waiting on eBay\'s campaign report', I.campaign_off_still_spending.count > 0],
      ['paused', 'CPC ads paused > 7 days', I.paused_long.count, I.paused_long.paused_total + ' paused in all', I.paused_long.count > 0],
    ];
    var h = '<div class="ac-issues">' + cards.map(function (c) { return '<div class="ac-issue" data-k="' + c[0] + '"><div class="k">' + esc(c[1]) + '</div><div class="v' + (c[4] ? ' loss' : '') + '">' + c[2] + '</div><div class="d">' + esc(c[3]) + '</div></div>'; }).join('') + '</div>';
    h += '<div id="acIssue"></div>';
    /* 18 Oct: the campaign LIST moved to the Campaigns page, which carries the same rows with real
       spend, clicks, sales and ROAS over any period, the listings inside each campaign, and an
       account-to-account roll-up. Its spend and ROAS columns were blank here. Per the owner's
       "show data only for once", this page keeps the faults and points at the other for the list. */
    h += '<div class="ac-panel"><h3>The campaign list</h3><div class="ac-sub">Every campaign with its'
      + ' spend, clicks, sales and return, the listings inside it, and account by account, is on the'
      + ' <a href="#adtoolCampaignBoard" style="color:var(--gold-a);font-weight:800">Campaigns</a> page.'
      + ' We keep our own copy of ' + (D.archive_count || 0) + ' closed campaigns so old campaign'
      + ' numbers can still be named.</div></div>';
    h += '<div class="ac-note">Updated ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + ' · nothing on this page is sent to eBay.</div>';
    $('acBody').innerHTML = h;
    var cs = document.querySelectorAll('.ac-issue'); for (var i = 0; i < cs.length; i++) cs[i].onclick = function () { for (var j = 0; j < cs.length; j++) cs[j].classList.toggle('on', cs[j] === this); showIssue(this.getAttribute('data-k')); };
  }
  function showIssue(k) {
    var I = AC.data.issues, h = '';
    /* the product cell hands off to Product history; "where?" keeps this page's own lookup */
    var cell = function (x) { return adtProductCell(x) + '<a href="#" class="ac-open" data-id="' + esc(x.item_id) + '" style="font-size:11px;color:var(--gold-a)">where is it?</a>'; };
    if (k === 'unresolved') h = '<h3>Campaigns we cannot name</h3><div class="ac-sub">Campaign ids we see on ads but cannot name, usually campaigns that ended before we started keeping our own copy of the list. ' + I.unresolved.listings_with_spend_30d + ' of the listings touched spent ' + gbp(I.unresolved.spend_30d) + ' in the last 30 days.</div><table class="ac-tbl"><thead><tr><th>Campaign id</th><th>Account</th><th class="r">Listings</th><th>Now named as</th></tr></thead><tbody>' + I.unresolved.sample.map(function (x) { return '<tr><td>' + esc(x.campaign_id) + '</td><td>' + esc(x.account) + '</td><td class="r">' + x.listings + '</td><td>' + esc(x.archived_name || '—') + '</td></tr>'; }).join('') + '</tbody></table>';
    if (k === 'dual') h = '<h3>In a CPC and a cost-per-sale campaign at once</h3><div class="ac-sub">Both kinds of campaign charge for the same sale. ' + esc(I.dual_funding.note || '') + '.</div>' +
      '<h3 style="margin-top:10px;font-size:13px">Charged both on the same day, last 30 days' + src('eBay billing') + '</h3>' + (I.dual_funding.paid_both && I.dual_funding.paid_both.length ? '<div class="ac-sub">' + I.dual_funding.paid_both_count + ' listings, ' + gbp(I.dual_funding.paid_both_fees) + ' of fees on the days both meters ran.</div><table class="ac-tbl"><thead><tr><th>Listing</th><th class="r">Days</th><th class="r">Sale fees</th><th class="r">Click fees</th><th>Last</th></tr></thead><tbody>' + I.dual_funding.paid_both.map(function (x) { return '<tr><td>' + cell(x) + '</td><td class="r">' + x.days + '</td><td class="r">' + gbp(x.std_fees) + '</td><td class="r">' + gbp(x.cpc_fees) + '</td><td>' + esc(x.last_day) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">None charged both on one day in the last 30.</div>') +
      '<h3 style="margin-top:12px;font-size:13px">Live in both at the last reading' + src('campaign map', 'ad status, read per campaign') + '</h3><div class="ac-sub">An ad status is a reading taken when that campaign\'s ads were last read, which can be hours or weeks ago, so a listing can have left one of these campaigns since.</div>' + (I.dual_funding.sample.length ? '<table class="ac-tbl"><thead><tr><th>Listing</th><th>Campaigns</th></tr></thead><tbody>' + I.dual_funding.sample.map(function (x) { return '<tr><td>' + cell(x) + '</td><td>' + esc(x.campaigns) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">None at the last reading of each. Every listing in both kinds of campaign has its click ad archived or paused.</div>');
    if (k === 'zero') h = '<h3>Spending with no sale from the ad, last 30 days</h3><div class="ac-sub">The biggest spenders first.</div><table class="ac-tbl"><thead><tr><th>Listing</th><th class="r">Spend 30 d</th><th class="r">Spend 14 d</th><th class="r">Clicks</th></tr></thead><tbody>' + I.zero_sale.sample.map(function (x) { return '<tr><td>' + cell(x) + '</td><td class="r">' + gbp(x.spend_30d) + '</td><td class="r">' + gbp(x.spend_14d) + '</td><td class="r">' + x.clicks + '</td></tr>'; }).join('') + '</tbody></table>';
    if (k === 'ended') h = '<h3>Ended or sold-out listings that still carried spend, last 7 days</h3><div class="ac-sub">eBay keeps billing an ad whose listing has gone.</div><table class="ac-tbl"><thead><tr><th>Listing</th><th>State</th><th class="r">Spend 7 d</th><th>Last day</th></tr></thead><tbody>' + I.ended_still_spending.sample.map(function (x) { return '<tr><td>' + cell(x) + '</td><td>' + esc(x.status) + (x.qty === 0 ? ' · qty 0' : '') + '</td><td class="r">' + gbp(x.spend_7d) + '</td><td>' + esc(x.last_day) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (k === 'off') h = '<h3>Paused or ended campaigns with spend in the last 2 report days</h3><div class="ac-sub">This needs eBay\'s campaign report, so it fills in when that lands.</div>' + (I.campaign_off_still_spending.sample.length ? '<table class="ac-tbl"><thead><tr><th>Campaign</th><th>Account</th><th>Status</th><th class="r">Spend 2 d</th><th>Last day</th></tr></thead><tbody>' + I.campaign_off_still_spending.sample.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.account) + '</td><td>' + esc(x.status) + '</td><td class="r">' + gbp(x.spend_2d) + '</td><td>' + esc(x.last_day) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">None found' + (I.campaign_off_still_spending.campaign_rows && I.campaign_off_still_spending.campaign_rows.n ? '.' : ', because eBay\'s campaign report has not landed yet.') + '</div>');
    /* fix 6 here too: "paused for more than 7 days" is worked out from a reading, so each row says
       when that reading was taken and how many ad records eBay held for the listing. A row whose ad
       status is weeks old is not evidence that the ad is still paused. */
    if (k === 'paused') h = '<h3>CPC ads paused inside a running campaign for more than 7 days</h3><div class="ac-sub">' + esc(I.paused_long.note) + '. Each ad status is a reading taken when that campaign\'s ads were last read, not a live check. ' + esc(adPanelNote(I.paused_long.sample)) + '</div><table class="ac-tbl"><thead><tr><th>Listing</th><th>Campaign</th><th>Paused since, as last read</th></tr></thead><tbody>' + I.paused_long.sample.map(function (x) { return '<tr><td>' + cell(x) + '</td><td>' + esc(x.name) + '</td><td>' + whenS(x.paused_since) + adAgeLine(adFresh(x), true) + adDupLine(x) + '</td></tr>'; }).join('') + '</tbody></table>';
    $('acIssue').innerHTML = '<div class="ac-panel">' + h + '</div>';
    var ls = document.querySelectorAll('.ac-open'); for (var i = 0; i < ls.length; i++) ls[i].onclick = function (e) { e.preventDefault(); $('acQ').value = this.getAttribute('data-id'); whereIs(this.getAttribute('data-id')); window.scrollTo(0, 0); };
  }
})();
