/* view-adtool-itemcampaigns.js — Advertising · Where each listing advertises (owner's Change Spec,
 * 28 Oct 2026: "Where Each Listing Advertises — MERGE: adtoolItemCampaigns + Wrong advertising +
 * Campaign watch").
 *
 * One page, three sections, in the order a manager asks the questions:
 *   1 Duplication     — the listings live in two or more campaigns at once, which is the state that
 *                       costs money twice. The two controls that fix it sit on the row: pause the ad
 *                       in one campaign, or take the listing out of that campaign. Both ask first.
 *   2 Where each item stands — every active listing and the campaign or campaigns it was in when
 *                       those campaigns were last read.
 *   3 Gaps            — the active listings in no campaign at all.
 *
 * The three sections are three reads of the same action, one per state, so each carries its own
 * complete count and its own "not on the page" line rather than being carved out of one capped list.
 *
 * EVERYTHING HERE IS A READING, except the two controls in Duplication: those two act on eBay, they
 * are the portal's existing user actions, and each one confirms before it goes. No collective profit
 * anywhere, by the Sales Analysis law. Galaxy tokens only, gold the accent, #e0563f the loss colour.
 * Engine actions: adtoolItemCampaigns (read), adsPauseListing and campaignRemoveItem (the controls).
 * Own class prefix: .wla-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var ACT_ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var WL = { account: '', q: '', accounts: [], main: null, dup: null, gap: null, err: {}, busy: false, acting: false };

  VIEW_CSS.push([
    '.wla-wrap{max-width:1420px}',
    '.wla-search{display:flex;gap:8px;align-items:center;margin:8px 0 12px;flex-wrap:wrap}',
    '.wla-search input{flex:1 1 320px;min-width:200px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}',
    '.wla-search input:focus{outline:2px solid var(--gold-b);outline-offset:1px}',
    '.wla-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:9px 14px;font:inherit;font-weight:800;font-size:12.5px;cursor:pointer}',
    '.wla-btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--gold-line)}',
    '.wla-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}',
    '.wla-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}',
    '.wla-filters button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.wla-jump{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    '.wla-jump a{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:5px 14px;font-size:12px;color:var(--text-2);font-weight:700;text-decoration:none;white-space:nowrap}',
    '.wla-jump a:hover{color:var(--gold-a);border-color:var(--gold-line-hi)}',
    '.wla-jump a .n{opacity:.75;margin-left:6px;font-variant-numeric:tabular-nums}',
    '.wla-jump a.dup{border-color:rgba(224,86,63,.55);color:' + LOSS + '}',
    '.wla-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.wla-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.wla-panel.dup{border-color:rgba(224,86,63,.45)}',
    '.wla-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.wla-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.wla-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.wla-tbl th.r{text-align:right}',
    '.wla-tbl td{padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.wla-tbl td.r{text-align:right;white-space:nowrap}',
    '.wla-tbl tr:hover td{background:rgba(255,255,255,.03)}',
    '.wla-tbl tr.multi td:first-child{box-shadow:inset 3px 0 0 ' + LOSS + '}',
    '.wla-scroll{overflow-x:auto}',
    '.wla-cmp{display:flex;flex-direction:column;gap:6px;min-width:300px}',
    '.wla-c{border:1px solid var(--gold-line);border-radius:10px;padding:7px 10px;background:rgba(255,255,255,.02)}',
    '.wla-c.live{border-color:rgba(242,176,53,.5);background:rgba(242,176,53,.08)}',
    '.wla-c .n{font-size:12px;font-weight:800;color:var(--text)}',
    '.wla-c .m{font-size:10.5px;color:var(--text-3);margin-top:3px;line-height:1.5}',
    '.wla-c .m b{color:var(--text-2);font-weight:700}',
    '.wla-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}',
    '.wla-act{background:transparent;border:1px solid rgba(224,86,63,.5);color:' + LOSS + ';border-radius:7px;padding:3px 9px;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer;white-space:nowrap}',
    '.wla-act:hover{background:rgba(224,86,63,.12)}',
    '.wla-act[disabled]{opacity:.45;cursor:default}',
    '.wla-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.wla-pill.live{background:var(--gold-b);border-color:var(--gold-b);color:var(--gold-ink)}',
    '.wla-pill.off{border-color:rgba(224,86,63,.5);color:' + LOSS + '}',
    '.wla-mark{display:inline-block;padding:2px 9px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:' + LOSS + ';color:#fff;white-space:nowrap}',
    '.wla-none{display:inline-block;padding:2px 9px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px dashed var(--gold-line);color:var(--text-3);white-space:nowrap}',
    '.wla-sub2{font-size:10.5px;color:var(--text-3)}',
    '.wla-hist{font-size:11px;color:var(--text-2);line-height:1.5}.wla-hist b{color:var(--text)}',
    '.wla-warn{background:rgba(224,86,63,.1);border:1px solid rgba(224,86,63,.45);border-radius:12px;padding:11px 14px;margin-bottom:12px;color:' + LOSS + ';font-size:12.5px;line-height:1.55;font-weight:700}',
    '.wla-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}',
    '.wla-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    /* an ad status is a READING: its date rides under it, and a reading a day or more old is
       written brighter so it cannot be skimmed as a present-tense fact */
    '.wla-age{display:block;font-size:10px;color:var(--text-3);font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}',
    '.wla-age.old{color:var(--text-2)}',
    '.wla-clash{display:inline-block;margin-top:3px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:' + LOSS + ';white-space:nowrap}',
    '.wla-clash-why{display:block;font-size:10px;color:' + LOSS + ';font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function n0(n) { var v = num(n); return v == null ? 0 : v; }
  function plural(n, one, many) { return Math.round(n0(n)) === 1 ? one : many; }
  function rateTxt(n) { var v = num(n); return v == null ? '—' : (Math.round(v * 100) / 100) + '%'; }
  function typeTxt(f) {
    f = String(f || '');
    return f === 'COST_PER_CLICK' ? 'CPC' : f === 'COST_PER_SALE' ? 'Cost per sale' : (f || '—');
  }
  function role() { return (STATE.user && STATE.user.role) || ''; }
  function mayAct() { return ACT_ROLES.indexOf(role()) >= 0 || !!(STATE.user && STATE.user.super); }

  /* ── AN AD STATUS IS A READING, NOT A LIVE FACT ───────────────────────────────────────────────
     The portal re-reads a campaign's ads on a rotation, a couple of campaigns per account per tick,
     and a campaign that is not running is not re-read at all. So an ad status on this page can be
     hours or weeks old. Every status carries the date of the reading behind it, and a reading a day
     or more old is written in the past tense. None of this changes what a status IS.
     This block is deliberately the same in the advertising views that show an ad status: change one
     and change all of them. */
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
  function adRecords(o) {
    if (!o || typeof o !== 'object') return null;
    var n = Number(o.ad_records != null ? o.ad_records : o.ad_record_count);
    return isNaN(n) || n < 1 ? null : Math.round(n);
  }
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
  function adDupLine(o) {
    var n = adRecords(o);
    if (n == null || n < 2) return '';
    return '<span class="wla-age old">eBay returned ' + n + ' ad records for this listing in this campaign.</span>';
  }
  function adAgeSpan(c) {
    var f = adFresh(c);
    if (!f.words) return '';
    return f.band === 'days' ? ', <b>' + esc(f.words) + '</b>' : ', ' + esc(f.words);
  }

  VIEWS.adtoolItemCampaigns = {
    label: 'Where each listing advertises', hidden: true, order: 96, roles: ROLES,
    icon: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/>',
    render: function () {
      return '<div class="wla-wrap">' +
        adtHgroup('Where each listing advertises', 'Duplication first, then every listing, then the ones advertising nowhere', 'wlaFresh') +
        '<div class="wla-search">' +
          '<input id="wlaQ" type="search" placeholder="Search an item number or a title" autocomplete="off">' +
          '<button class="wla-btn" id="wlaGo">Search</button>' +
          '<button class="wla-btn ghost" id="wlaClear">Clear</button>' +
        '</div>' +
        '<div id="wlaAcct" class="wla-filters"></div>' +
        '<div id="wlaBody"><div class="wla-empty">Loading…</div></div></div>';
    },
    init: function () {
      /* the closure outlives a visit: drop every answer on entry so a page re-opened later asks
         again instead of painting an old reading */
      WL.main = null; WL.dup = null; WL.gap = null; WL.err = {};
      var q = $('wlaQ'), go = $('wlaGo'), clear = $('wlaClear');
      go.onclick = function () { WL.q = q.value.trim(); loadAll(); };
      clear.onclick = function () { q.value = ''; WL.q = ''; loadAll(); };
      q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go.onclick(); } };
      acctChips();
      loadAll();
    }
  };

  function acctChips() {
    var el = $('wlaAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (WL.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      WL.accounts.map(function (a) { return '<button class="' + (WL.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { WL.account = this.getAttribute('data-a'); acctChips(); loadAll(); };
  }

  /* ── loading. ONE action, asked once per section, so each section's "not on the page" line is
     about its own list rather than about a single capped list carved three ways ──────────────── */
  function params(state) {
    var p = {};
    if (WL.account) p.account = WL.account;
    if (WL.q) p.q = WL.q;
    if (state) p.state = state;
    return p;
  }
  function ask(state, slot) {
    return api('adtoolItemCampaigns', params(state)).then(function (d) {
      WL[slot] = d || {}; delete WL.err[slot];
      var names = (d && d.accounts) || [];
      if (names.length) {
        WL.accounts = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
        acctChips();
      }
    }).catch(function (e) {
      WL[slot] = null;
      WL.err[slot] = (e && e.message) || 'This list could not load.';
    });
  }
  function loadAll() {
    if (WL.busy) return Promise.resolve();
    WL.busy = true;
    WL.main = null; WL.dup = null; WL.gap = null; WL.err = {};
    if ($('wlaBody')) $('wlaBody').innerHTML = '<div class="wla-empty">Loading…</div>';
    /* the whole list first, so the page paints as soon as there is anything to read; the two
       narrow lists follow and fill their own sections */
    return ask('', 'main').then(function () {
      if ($('wlaBody')) { draw(); adtFreshShow('wlaFresh', WL.main && WL.main.fresh); }
      return Promise.all([ask('multi', 'dup'), ask('none', 'gap')]);
    }).then(function () {
      WL.busy = false;
      if ($('wlaBody')) draw();
    }).catch(function () { WL.busy = false; });
  }

  function itemsOf(slot) {
    var D = WL[slot];
    return D ? ((D.items || []).filter(function (i) { return i && typeof i === 'object'; })) : [];
  }
  function counts() { return (WL.main && WL.main.counts) || {}; }

  /* ── the controls. Both act on eBay, both confirm first, both are the portal's own actions ─── */
  function controls(it, c) {
    if (!mayAct() || !c.live) return '';
    var acc = String(it.account || ''), cid = String(c.campaign_id || ''), lid = String(it.item_id || '');
    if (!acc || !cid || !lid) return '';
    var nm = String(c.name || cid);
    var h = '<div class="wla-acts">';
    /* eBay exposes a per-listing pause on cost-per-click ads only; a general campaign's listing has
       to be taken out of the campaign instead, which is the second control */
    if (String(c.funding_model || '') === 'COST_PER_CLICK') {
      h += '<button class="wla-act" data-wlapause="' + esc(acc + '|' + cid + '|' + lid) + '" data-nm="' + esc(nm) + '" ' +
        'title="pause this ad on eBay, so this campaign stops charging clicks for this listing">✕ Pause this ad</button>';
    }
    h += '<button class="wla-act" data-wlarm="' + esc(acc + '|' + cid + '|' + lid) + '" data-nm="' + esc(nm) + '" ' +
      'title="take this listing out of this campaign on eBay">Remove from this campaign</button></div>';
    return h;
  }

  /* the campaign or campaigns one listing was in when each of those campaigns' ads were last read.
     "live" is the state that spends money, so it is the one made obvious; a membership that is not
     live is printed plainly beside it, and every card carries the date of its own reading. */
  function campaignsCell(it, withControls) {
    var cs = it.campaigns || [];
    if (!cs.length) return '<span class="wla-none">in no campaign</span>';
    return '<div class="wla-cmp">' + cs.map(function (c) {
      var live = !!c.live;
      return '<div class="wla-c' + (live ? ' live' : '') + '">' +
        '<div class="n">' + adtCampaignLink(c.campaign_id, c.name || c.campaign_id || 'Campaign') +
          ' <span class="wla-pill ' + (live ? 'live' : 'off') + '">' + (live ? 'live' : 'not live') + '</span></div>' +
        '<div class="m">' + esc(c.status || '—') + ' · ' + esc(typeTxt(c.funding_model)) +
          /* the budget belongs to the CAMPAIGN and is shared by every listing in it, so it must not
             read on a listing's own card as this listing's daily allowance */
          ' · campaign budget <b>' + gbp(c.budget_day) + '</b> a day, shared' +
          ' · ad rate <b>' + rateTxt(c.bid_pct) + '</b>' +
          ' · this ad <b>' + esc(c.ad_status || '—') + '</b>' + adAgeSpan(c) + '</div>' + adDupLine(c) +
        (withControls ? controls(it, c) : '') + '</div>';
    }).join('') + '</div>';
  }

  /* THE CONTRADICTION THIS PAGE CAN SEE. A listing eBay billed in the last 3 days with no live ad on
     record is the shape of the fault that was reported: an archived ad is left out of this page
     altogether, so one wrong ARCHIVED reading shows a listing as advertising nowhere while eBay
     keeps charging it. An ad that is not live cannot be charged, so the money is the half to
     believe. Both figures are already in this payload. */
  function billedButIdle(it) {
    var sp = num(it.spend_3d), live = num(it.live_count);
    if (sp == null || sp <= 0 || (live != null && live > 0)) return '';
    return '<span class="wla-clash" title="an ad that is not live cannot be charged, so one of the two is wrong">charged with no live ad</span>' +
      '<span class="wla-clash-why">Charged ' + gbp(sp) + ' over the last 3 days while no ad we hold is live. Either the ad went in the meantime, or an ad reading we hold is wrong, and the money is the half to believe.</span>';
  }
  function stateCell(it) {
    var n = num(it.live_count), h;
    if (n != null && n > 1) {
      h = '<span class="wla-mark" title="this listing was live in ' + n + ' campaigns at the last reading of each, so its spend is charged by each of them">in ' + n + ' campaigns</span>';
    } else if (n === 1) { h = '<span class="wla-pill live">in one campaign</span>'; }
    else { h = '<span class="wla-none">in no campaign</span>'; }
    return h + billedButIdle(it);
  }
  /* what this listing has been doing lately, from the two windows the payload already carries */
  function historyCell(it) {
    var w = (WL.main && WL.main.windows) || {};
    var d3 = w.spend_3d || {}, d7 = w.spend_7d || {}, s30 = w.sold_30d || {};
    return '<div class="wla-hist"><b>' + gbp(it.spend_3d) + '</b> over 3 days' +
      (d3.from ? '<div class="wla-sub2">' + esc(String(d3.from)) + ' → ' + esc(String(d3.to || '')) + '</div>' : '') +
      '<div><b>' + gbp(it.spend_7d) + '</b> over 7 days' + (d7.from ? ' <span class="wla-sub2">from ' + esc(String(d7.from)) + '</span>' : '') + '</div>' +
      '<div><b>' + cnt(it.sold_30d) + '</b> ' + plural(it.sold_30d, 'unit', 'units') + ' over 30 days' +
      (s30.from ? ' <span class="wla-sub2">from ' + esc(String(s30.from)) + '</span>' : '') + '</div></div>';
  }

  /* ── section 1 · Duplication ──────────────────────────────────────────────────────────────── */
  function dupSection() {
    var C = counts(), many = num(C.in_many);
    var h = '<div class="wla-panel dup" id="wlaDup"><h3>Duplication</h3>' +
      '<div class="wla-sub">Listings live in two or more campaigns at the last reading of each, so every one of ' +
      'those campaigns charges for the same listing. Pause the ad in the campaign you do not want, or take the ' +
      'listing out of it. Both act on eBay and ask first.</div>';
    if (WL.err.dup) return h + '<div class="wla-empty">' + esc(WL.err.dup) + '</div></div>';
    if (!WL.dup) return h + '<div class="wla-empty">Loading the duplicated listings…</div></div>';
    var rows = itemsOf('dup');
    if (!rows.length) {
      return h + '<div class="wla-empty">No listing is live in more than one campaign' +
        (WL.account ? ' on ' + esc(WL.account) : '') + (WL.q ? ' for "' + esc(WL.q) + '"' : '') + '.</div></div>';
    }
    var held = num(WL.dup.items_held_back), total = num(WL.dup.items_total);
    if (many != null && many > 0) {
      h = h.replace('<div class="wla-sub">', '<div class="wla-warn">' + cnt(many) + ' active ' + plural(many, 'listing is', 'listings are') +
        ' being charged by more than one campaign at once.</div><div class="wla-sub">');
    }
    h += '<div class="wla-scroll"><table class="wla-tbl"><thead><tr>' +
      '<th>Listing</th><th>How many</th><th>What it has been doing</th><th>The campaigns, and what to do</th>' +
      '</tr></thead><tbody>' + rows.map(function (it) {
        return '<tr class="multi"><td>' + adtProductCell(it) + '</td>' +
          '<td>' + stateCell(it) + '</td>' +
          '<td>' + historyCell(it) + '</td>' +
          '<td>' + campaignsCell(it, true) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    if (held != null && held > 0) {
      h += '<div class="wla-sub2" style="margin-top:8px">' + cnt(held) + ' more ' + plural(held, 'listing is', 'listings are') +
        ' duplicated and not on the page, of ' + cnt(total) + ' in all. Choose one account to reach more of them.</div>';
    }
    if (!mayAct()) {
      h += '<div class="wla-sub2" style="margin-top:8px">The two controls are for Management, the Ops Head and the Advertising Manager, so they are not on your rows.</div>';
    }
    return h + '</div>';
  }

  /* ── section 2 · Where each item stands ───────────────────────────────────────────────────── */
  function standsSection() {
    var h = '<div class="wla-panel" id="wlaStands"><h3>Where each item stands</h3>' +
      '<div class="wla-sub">Every active listing and the campaigns it was in when those campaigns were last read, ' +
      'with what it has spent over the last 3 and 7 days and what it has sold over 30.</div>';
    if (WL.err.main) return h + '<div class="wla-empty">' + esc(WL.err.main) + '</div></div>';
    if (!WL.main) return h + '<div class="wla-empty">Loading…</div></div>';
    var rows = itemsOf('main');
    if (!rows.length) {
      return h + '<div class="wla-empty">' + (WL.q || WL.account
        ? 'No active listing matches. Try a different search or account.'
        : 'No active listing came back.') + '</div></div>';
    }
    h += '<div class="wla-scroll"><table class="wla-tbl"><thead><tr>' +
      '<th>Listing</th><th>At the last reading</th><th class="r">Price</th><th class="r">Sold 30 d</th>' +
      '<th class="r">Spend 3 d</th><th class="r">Spend 7 d</th><th>Campaigns it was in</th>' +
      '</tr></thead><tbody>' + rows.map(function (it) {
        var n = num(it.live_count), multi = n != null && n > 1;
        return '<tr class="' + (multi ? 'multi' : '') + '">' +
          '<td>' + adtProductCell(it) + '</td>' +
          '<td>' + stateCell(it) + '</td>' +
          '<td class="r">' + gbp(it.price) + '</td>' +
          '<td class="r">' + cnt(it.sold_30d) + '</td>' +
          '<td class="r">' + gbp(it.spend_3d) + '</td>' +
          '<td class="r">' + gbp(it.spend_7d) + '</td>' +
          '<td>' + campaignsCell(it, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var held = num(WL.main.items_held_back), total = num(WL.main.items_total);
    if (held != null && held > 0) {
      h += '<div class="wla-sub2" style="margin-top:8px">' + cnt(held) + ' more ' + plural(held, 'listing is', 'listings are') +
        ' not on the page, of ' + cnt(total) + ' that match. Narrow it with the search box or an account to reach them.</div>';
    }
    return h + '</div>';
  }

  /* ── section 3 · Gaps ─────────────────────────────────────────────────────────────────────── */
  function gapSection() {
    var h = '<div class="wla-panel" id="wlaGaps"><h3>Gaps</h3>' +
      '<div class="wla-sub">Active listings in no campaign at all, so nothing is advertising them. ' +
      'The ones that have sold recently are the ones worth putting somewhere.</div>';
    if (WL.err.gap) return h + '<div class="wla-empty">' + esc(WL.err.gap) + '</div></div>';
    if (!WL.gap) return h + '<div class="wla-empty">Loading the listings in no campaign…</div></div>';
    var rows = itemsOf('gap').slice().sort(function (a, b) { return n0(b.sold_30d) - n0(a.sold_30d) || n0(b.price) - n0(a.price); });
    if (!rows.length) {
      return h + '<div class="wla-empty">Every active listing is in at least one campaign' +
        (WL.account ? ' on ' + esc(WL.account) : '') + '.</div></div>';
    }
    h += '<div class="wla-scroll"><table class="wla-tbl"><thead><tr>' +
      '<th>Listing</th><th class="r">Price</th><th class="r">Sold 30 d</th><th class="r">Spend 3 d</th>' +
      '<th class="r">Spend 7 d</th><th>Anything on record</th>' +
      '</tr></thead><tbody>' + rows.map(function (it) {
        return '<tr><td>' + adtProductCell(it) + '</td>' +
          '<td class="r">' + gbp(it.price) + '</td>' +
          '<td class="r">' + cnt(it.sold_30d) + '</td>' +
          '<td class="r">' + gbp(it.spend_3d) + '</td>' +
          '<td class="r">' + gbp(it.spend_7d) + '</td>' +
          '<td>' + (num(it.campaign_count) > 0
            ? campaignsCell(it, false)
            : '<span class="wla-none">no campaign at all</span>') + billedButIdle(it) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var held = num(WL.gap.items_held_back), total = num(WL.gap.items_total);
    if (held != null && held > 0) {
      h += '<div class="wla-sub2" style="margin-top:8px">' + cnt(held) + ' more ' + plural(held, 'listing is', 'listings are') +
        ' in no campaign and not on the page, of ' + cnt(total) + ' in all. Choose one account to reach more of them.</div>';
    }
    return h + '</div>';
  }

  /* ── the jump bar and the standing note ───────────────────────────────────────────────────── */
  function jumpBar() {
    var C = counts();
    var bits = [
      ['wlaDup', 'Duplication', num(C.in_many), 'dup'],
      ['wlaStands', 'Where each item stands', num(C.active), ''],
      ['wlaGaps', 'Gaps', num(C.in_none), '']
    ];
    return '<div class="wla-jump">' + bits.map(function (b) {
      return '<a href="#' + b[0] + '" data-wlajump="' + b[0] + '" class="' + b[3] + '">' + esc(b[1]) +
        (b[2] == null ? '' : '<span class="n">' + cnt(b[2]) + '</span>') + '</a>';
    }).join('') + '</div>';
  }
  function note() {
    var D = WL.main || {}, C = counts();
    var all = [];
    itemsOf('main').forEach(function (i) { (i.campaigns || []).forEach(function (c) { all.push(c); }); });
    var readNote = adPanelNote(all);
    var h = '<div class="wla-note">' +
      'Active listings only' + (WL.q ? ', matching "' + esc(WL.q) + '"' : '') +
      (WL.account ? ', on ' + esc(WL.account) : ', across all accounts') + '. ' +
      'A campaign membership and its ad status are readings taken when that campaign\'s ads were last read, ' +
      'which can be hours or weeks ago, so each card carries the date of its own reading.' +
      (readNote ? ' ' + esc(readNote) : '');
    /* the three states must add up to the active listing count, and the engine counts that again
       straight from the listing table. If the two ever disagree the page says so rather than
       quietly showing a short list as though it were the whole shop. */
    var a = num(C.active), real = num(D.active_counted);
    if (!WL.q && a != null && real != null && a !== real) {
      h += ' <b>The counts cover ' + cnt(a) + ' listings and there are ' + cnt(real) + ' active, so ' +
        cnt(Math.abs(real - a)) + ' did not come back in this read.</b>';
    }
    h += ' <b>Everything on this page is a reading, except the two controls in Duplication: those act on eBay, ' +
      'and each one asks before it goes.</b>';
    if (D.computed_at) h += ' Worked out at ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC.';
    return h + '</div>';
  }

  /* ── draw and wire ────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('wlaBody'); if (!box) return;
    box.innerHTML = jumpBar() + note() + dupSection() + standsSection() + gapSection();
    wire(box);
  }

  function wire(box) {
    var ps = box.querySelectorAll('[data-wlapause]');
    for (var i = 0; i < ps.length; i++) ps[i].onclick = function () { pause(this); };
    var rs = box.querySelectorAll('[data-wlarm]');
    for (var j = 0; j < rs.length; j++) rs[j].onclick = function () { remove(this); };
  }

  function parts(el, attr) { return String(el.getAttribute(attr) || '').split('|'); }

  /* the pause control from Wrong advertising, with its own words: eBay stops charging clicks for
     this listing in this campaign, and the listing stays in the campaign */
  function pause(el) {
    if (WL.acting) return;
    var p = parts(el, 'data-wlapause'), nm = el.getAttribute('data-nm') || p[1];
    if (p.length < 3 || !p[0] || !p[1] || !p[2]) { toast('That row does not carry enough to act on.'); return; }
    if (!confirm('Pause this ad on eBay?\n\nListing ' + p[2] + ' in "' + nm + '" (' + p[0] + '). eBay stops charging clicks for it in that campaign. The listing stays in the campaign. This acts on eBay itself.')) return;
    WL.acting = true; el.disabled = true; el.textContent = '…';
    api('adsPauseListing', { account: p[0], campaign_id: p[1], listing_id: p[2] }).then(function (r) {
      WL.acting = false;
      toast(r && r.confirmed_from_ebay ? 'Paused: eBay confirms the ad is now ' + String(r.ad_status || 'paused') : 'Pause sent to eBay');
      loadAll();
    }).catch(function (e) {
      WL.acting = false; el.disabled = false; el.textContent = '✕ Pause this ad';
      toast('eBay refused: ' + ((e && e.message) || 'the pause did not go through'));
    });
  }
  /* the remove control from Campaign watch: the listing leaves the campaign altogether */
  function remove(el) {
    if (WL.acting) return;
    var p = parts(el, 'data-wlarm'), nm = el.getAttribute('data-nm') || p[1];
    if (p.length < 3 || !p[0] || !p[1] || !p[2]) { toast('That row does not carry enough to act on.'); return; }
    if (!confirm('Remove item ' + p[2] + ' from "' + nm + '"?\n\nThe listing leaves that campaign on eBay. This acts on eBay itself.')) return;
    WL.acting = true; el.disabled = true; el.textContent = '…';
    api('campaignRemoveItem', { account: p[0], campaign_id: p[1], listing_id: p[2] }).then(function (res) {
      WL.acting = false;
      toast(res && res.shadow
        ? 'Recorded, nothing sent: ' + String(res.would_do || 'the live write is held')
        : 'Removed from "' + String((res && res.campaign) || nm) + '".');
      loadAll();
    }).catch(function (e) {
      WL.acting = false; el.disabled = false; el.textContent = 'Remove from this campaign';
      toast((e && e.message) || 'Could not remove it.');
    });
  }
})();
