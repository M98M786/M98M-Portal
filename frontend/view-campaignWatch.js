/* view-campaignWatch.js — V2 Phase C (req 21/22): Zain's live campaign watch, served by the
 * Engine. Three truths on one screen: every campaign as eBay had it at the last read, every item
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
    '.cw-count{margin-left:auto;font-size:11.5px;color:var(--text-3);font-weight:700}' +
    /* an ad status is a READING: its date rides under it, and a reading a day or more old is
       written brighter so it cannot be skimmed as a present-tense fact. #e0563f is the only
       loss colour, and it is used here for money at risk, never for age alone. */
    '.cw-age{display:block;font-size:9.5px;color:var(--text-3);font-weight:600;line-height:1.5;margin-top:2px;white-space:normal;letter-spacing:0;text-transform:none}' +
    '.cw-age.old{color:var(--text-2)}' +
    '.cw-clash{display:inline-block;margin-top:3px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:#e0563f;white-space:nowrap}' +
    '.cw-clash-why{display:block;font-size:10px;color:#e0563f;font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}'
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
  function cwGbp(v) {
    var n = Number(v);
    if (v == null || v === '' || isNaN(n)) { return '—'; }
    return (n < 0 ? '−£' : '£') + Math.abs(n).toFixed(2);
  }
  function cwPill(status) {
    var s = cwStr(status).toUpperCase();
    var cls = /RUNNING/.test(s) ? 'run' : /PAUSED|PENDING/.test(s) ? 'paused' : 'ended';
    return '<span class="cw-pill ' + cls + '">' + esc(s || '—') + '</span>';
  }

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
    return '<span class="cw-age' + (f.band === 'days' ? ' old' : '') + '">' +
      (prefix ? esc(prefix) + ' ' : '') + esc(f.words) + '</span>';
  }
  function adDupLine(o) {
    var n = adRecords(o);
    if (n == null || n < 2) return '';
    return '<span class="cw-age old">eBay returned ' + n + ' ad records for this listing in this campaign.</span>';
  }
  /* THE CONTRADICTION, said plainly. An archived ad cannot be charged, so a row reading ARCHIVED on
     a listing the same campaign billed has one of the two wrong, and the money is the half to
     believe. `money` is a figure already in this payload, never a fresh request. */
  function adClash(status, money, when) {
    var v = Number(money);
    if (!adArchived(status) || money == null || money === '' || isNaN(v) || v <= 0) return '';
    return '<span class="cw-clash" title="an archived ad cannot be charged, so one of the two is wrong">archived but spending</span>' +
      '<span class="cw-clash-why">Charged ' + cwGbp(v) + ' in this campaign ' + esc(String(when || '')) + '. An archived ad cannot spend, so believe the money, not this status.</span>';
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
      h += '<div class="cw-dupbox"><h3>🔴 URGENT: ' + urgentN + ' item(s) LIVE in more than one RUNNING campaign at the last reading of each. eBay can charge each of them in every running campaign they sit in</h3>' +
        '<p style="margin:0 0 8px;font-size:11.5px;color:var(--text-3);font-weight:600">Each campaign the listing sits in shows the state of its last reading. Only <b style="color:var(--bad)">LIVE</b> memberships (running campaign · active ad · active listing) cost money and carry ✕ to remove. <b>Paused ads, paused campaigns and ended listings are grey and harmless.</b> A fresh move echoes here until that campaign\'s ads are read again, which is hours rather than minutes, and a campaign that is not running may not be read again at all. Each chip carries the date of its own reading. ' + esc(adPanelNote(dupRows)) + '</p>' +
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
            adtCampaignLink(r.campaign_id, cwStr(r.name)) +
            ' <b style="font-size:9px;letter-spacing:.05em">' + esc(chip) + '</b>' +
            /* the chip is a reading: its date rides inside it, quietly where we do not hold one */
            adAgeLine(adFresh(r), true) + adDupLine(r) +
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
      h += '<div class="cw-dupbox" style="border-color:var(--ok);background:var(--ok-soft)"><h3 style="color:var(--ok)">✓ No item was in more than one running campaign at the last reading of each' + (acc ? ' on ' + esc(acc) : '') + '</h3></div>';
    }

    /* Hasib item 9, the other half: ACTIVE listings sitting in NO campaign at all.
       Owner, 18 Oct, "one home per number": in the ADVERTISING portal this list now lives on
       "Where each listing advertises", which holds every active listing, the campaigns each one is
       in, and the in-no-campaign group as a chip with the same count from the same membership rule.
       So that portal keeps the COUNT and points at the page for the rows, and this page stays whole
       on the company portal, where those pages do not exist and the rows have nowhere else to go. */
    var unc = (d.uncampaigned || []).filter(function (r) { return !acc || r.account === acc; });
    if (window.M98M_ADS_ONLY) {
      h += '<div class="cw-dupbox"' + (unc.length ? ' style="border-color:var(--warn)"' : ' style="border-color:var(--ok);background:var(--ok-soft)"') + '>' +
        '<h3' + (unc.length ? ' style="color:var(--warn)"' : ' style="color:var(--ok)"') + '>' +
        (unc.length ? '🟡 ' + unc.length + ' active listing(s) in NO campaign' + (acc ? ' on ' + esc(acc) : '')
                    : '✓ Every active listing sits in at least one campaign' + (acc ? ' on ' + esc(acc) : '')) + '</h3>' +
        '<p style="margin:4px 0 0;font-size:11.5px;color:var(--text-3);font-weight:600">' +
        (unc.length ? 'The listings themselves, with their price, what they have sold and the campaigns every other listing is in, are on the <a href="#adtoolItemCampaigns" style="color:var(--gold-a);font-weight:800">Where each listing advertises</a> page under its <b>In no campaign</b> chip. The Advertising Manager gets one digest bell a day while that list is not empty.'
                    : 'Where each listing advertises carries the same check listing by listing.') +
        '</p></div>';
    } else if (unc.length) {
      h += '<div class="cw-dupbox" style="border-color:var(--warn)"><h3 style="color:var(--warn)">🟡 ' + unc.length + ' active listing(s) in NO campaign — unadvertised reach</h3>' +
        '<div class="scroll" style="max-height:280px"><table class="cw-tbl"><thead><tr><th>Account</th><th>Item</th><th>Price</th><th>Sold 30d</th></tr></thead><tbody>';
      unc.forEach(function (r) {
        h += '<tr><td>' + esc(cwStr(r.account)) + '</td>' +
          '<td><div style="font-weight:700;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          '<a href="https://www.ebay.co.uk/itm/' + esc(cwStr(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(cwStr(r.title) || cwStr(r.item_id)) + '</a></div>' +
          '<div class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(cwStr(r.item_id)) +
          /* rule 2 of the spec: every listing row carries a History link to Product history, in BOTH
             portals. This table is the company portal's only home for the in-no-campaign rows (the
             advertising portal sends them to Where each listing advertises), so without this they
             were the one set of listing rows in that build with no way through to their own
             history: an eBay link and nothing else. */
          (/^\d{9,13}$/.test(cwStr(r.item_id)) ? ' <a href="#adtoolProduct/' + esc(cwStr(r.item_id)) + '" target="_blank" rel="noopener" title="open this listing\'s Product history in a new tab" style="color:var(--gold-a);font-weight:700">History &#8599;</a>' : '') +
          '</div></td>' +
          '<td class="cw-num">£' + (Number(r.price) || 0).toFixed(2) + '</td>' +
          '<td class="cw-num">' + (Number(r.sold_30d) || 0) + '</td></tr>';
      });
      h += '</tbody></table></div><p style="margin:8px 0 0;font-size:11px;color:var(--text-3);font-weight:600">The Advertising Manager gets one digest bell a day while this list is not empty.</p></div>';
    } else {
      h += '<div class="cw-dupbox" style="border-color:var(--ok);background:var(--ok-soft)"><h3 style="color:var(--ok)">✓ Every active listing sits in at least one campaign' + (acc ? ' on ' + esc(acc) : '') + '</h3></div>';
    }

    /* Owner, 18 Oct, "one home per number": in the ADVERTISING portal the campaign LIST is the
       Campaigns page, which carries these same rows with real spend, clicks, sales and return over
       any period, the listings inside each campaign, and an account-to-account roll-up. This page is
       the campaign FAULTS, so it keeps the count and points at the list. The company portal has no
       such page, so there it keeps the table. */
    if (window.M98M_ADS_ONLY) {
      h += '<div class="cw-dupbox"><h3>' + camps.length + ' campaign(s)' + (acc ? ' on ' + esc(acc) : ' across the fleet') + '</h3>' +
        '<p style="margin:4px 0 0;font-size:11.5px;color:var(--text-3);font-weight:600">Every campaign with its status, daily budget, listings, spend, clicks, sales from ads and return on ad spend over any period, and account by account, is on the <a href="#adtoolCampaignBoard" style="color:var(--gold-a);font-weight:800">Campaigns</a> page.</p></div>';
    } else {
    h += '<div class="scroll"><table class="cw-tbl"><thead><tr><th>Account</th><th>Campaign</th><th>Status</th><th>Budget/day</th><th>Items</th><th>Campaign read</th></tr></thead><tbody>';
    if (!camps.length) {
      h += '<tr><td colspan="6" style="color:var(--text-2);font-weight:700">No campaigns synced yet for this filter.</td></tr>';
    }
    camps.forEach(function (c) {
      h += '<tr><td>' + esc(cwStr(c.account)) + '</td>' +
        '<td style="font-weight:700">' + adtCampaignLink(c.campaign_id, cwStr(c.name)) + '</td>' +
        '<td>' + cwPill(c.status) + '</td>' +
        '<td class="cw-num">' + (Number(c.budget) ? '£' + Number(c.budget).toFixed(2) : '—') + '</td>' +
        '<td class="cw-num">' + (Number(c.items) || 0) + '</td>' +
        /* the campaign itself is read every 5 minutes; its ADS are a separate, much slower
           rotation, so the two dates are printed as two different things and the ads one only
           where the payload carries it */
        '<td class="cw-when">' + esc(cwPKT(c.synced_at)) +
          adAgeLine(adFreshCamp(c), true, 'its ads') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    }

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
    if (!events.length) { h += '<li style="color:var(--text-2)">Nothing yet. A change to a campaign appears within 5 minutes; a change to one ad appears when that campaign\'s ads are next read, which is hours rather than minutes.</li>'; }
    events.slice(0, 30).forEach(function (e) {
      var what = cwStr(e.change_type);
      /* RL-3: campaign names are free text typed on eBay — EVERY interpolation goes through esc(). */
      var line = what === 'duplicate_active'
        ? '🔴 duplicate-ACTIVE: item ' + esc(cwStr(e.item_id)) + ' in ' + esc(cwStr(e.new)) + ' running campaigns (' + esc(cwStr(e.campaign)) + ')'
        : esc(cwStr(e.campaign)) + ' — ' + esc(what) + (cwStr(e.old) || cwStr(e.new) ? ': ' + esc(cwStr(e.old)) + ' → ' + esc(cwStr(e.new)) : '');
      h += '<li><span class="cw-when">' + esc(cwPKT(e.at)) + '</span>' + esc(cwStr(e.account)) + ' · ' + line + (cwStr(e.actor) ? ' · by ' + esc(cwStr(e.actor)) : '') + '</li>';
    });
    /* this feed is the LAST THIRTY changes of every kind, live. Whole days of them, read as stops and
       starts with the listing behind each one, are on the change page, which keeps a fortnight. The
       two change pages became one on 28 Oct, so this points at the one that remains. */
    h += '</ul><p style="margin:6px 0 0;font-size:11.5px;color:var(--text-3);font-weight:600">One whole day at a time, both directions, with the listings behind each change and a fortnight of archive, is on <a href="#adtoolStopped" style="color:var(--gold-a);font-weight:800">Activated and stopped</a>.</p>';
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
          '<span class="sub">Campaigns read from eBay every 5 minutes · an ad status is a reading, dated where we hold the date · external changes carry no name</span></div>' +
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
