/* view-adtool-campaignboard.js — Advertising · Campaigns (owner's batch, 18 Oct 2026).
 *
 * The owner asked for four things that are really one page: an active campaigns page, a page showing
 * all active and paused campaigns with the listings inside them, campaign-to-campaign data, and
 * account-to-account "eBay style" with custom dates. So this page reads as a report: the period's
 * totals, then one row per account, then one row per campaign, and a campaign row opens to show the
 * listings inside it.
 *
 * The honesty block at the foot is the point of the page, not a footnote. Per-campaign money has to
 * be added up from the listings in each campaign until eBay's own campaign report lands, and some
 * listings are live in two campaigns at once, so their spend shows on both rows. The page prints
 * which source it used, how much spend is counted twice, and marks every campaign row affected.
 * A campaign's daily budget is shared by its listings, so the budget is judged per listing, never
 * as the whole budget against a per-listing cap.
 *
 * Read-only: nothing on this page is ever sent to eBay. No collective profit anywhere, by the
 * Sales Analysis law. Galaxy tokens only, gold the accent, #e0563f the loss colour.
 * Engine actions: adtoolCampaignBoard, adtoolCampaignListings. Own class prefix: .cbd-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var CB = {
    period: null, account: '', status: 'active', accounts: [], data: null,
    sort: { key: 'spend', dir: -1 },
    open: {},          /* account||campaign_id → true while its listings panel is open */
    inside: {},        /* account||campaign_id → the adtoolCampaignListings payload, cached per load */
    want: '',          /* the campaign id from #adtoolCampaignBoard/<campaign id>, opened once */
    wantDone: false
  };

  VIEW_CSS.push([
    '.cbd-wrap{max-width:1420px}',
    '.cbd-filterbar{border:1px solid var(--gold-line);border-radius:14px;padding:10px 14px 4px;margin:0 0 12px;background:var(--panel-2)}',
    '.cbd-fl{display:flex;gap:10px;align-items:flex-start;margin-bottom:6px}',
    '.cbd-fl>div{flex:1 1 auto;min-width:0}',
    '.cbd-fk{flex:0 0 58px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;padding-top:7px}',
    '.cbd-opened{border:1px solid var(--gold-b);border-radius:12px;padding:9px 13px;margin-bottom:12px;background:rgba(242,176,53,.08);font-size:12.5px;color:var(--text);line-height:1.55}',
    '.cbd-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}',
    '.cbd-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}',
    '.cbd-filters button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.cbd-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    '.cbd-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:5px 14px;font:inherit;font-size:12px;color:var(--text-2);font-weight:700;cursor:pointer}',
    '.cbd-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.cbd-chip .n{opacity:.7;margin-left:6px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.cbd-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.cbd-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.cbd-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.cbd-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.cbd-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.cbd-tile{flex:1 1 130px;border:1px solid var(--gold-line);border-radius:12px;padding:9px 13px;background:var(--panel-2)}',
    '.cbd-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.cbd-tile .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.cbd-tile.gold .v{color:var(--gold-a)}.cbd-tile.loss .v{color:' + LOSS + '}',
    '.cbd-tile .d{font-size:11px;color:var(--text-2);margin-top:2px}',
    '.cbd-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.cbd-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.cbd-tbl th.s{cursor:pointer;user-select:none}.cbd-tbl th.r{text-align:right}.cbd-tbl th .ar{color:var(--gold-a);margin-left:3px}',
    '.cbd-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.cbd-tbl td.r{text-align:right;white-space:nowrap}',
    '.cbd-tbl tr.cbd-row{cursor:pointer}.cbd-tbl tr.cbd-row:hover td{background:rgba(255,255,255,.03)}',
    '.cbd-tbl tr.cbd-tot td{border-top:1px solid var(--gold-line);border-bottom:0;font-weight:800;background:rgba(242,176,53,.06)}',
    '.cbd-scroll{overflow-x:auto}',
    '.cbd-cap{width:18px;color:var(--gold-a);font-weight:800;display:inline-block}',
    '.cbd-name{font-weight:700;color:var(--text)}',
    '.cbd-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.cbd-tag.live{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.cbd-tag.off{color:' + LOSS + ';border-color:rgba(224,86,63,.5)}',
    '.cbd-mark{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:' + LOSS + ';white-space:nowrap}',
    '.cbd-mark.cap{border-color:var(--gold-line-hi);color:var(--gold-a)}',
    '.cbd-sub2{font-size:10.5px;color:var(--text-3)}',
    '.cbd-neg{color:' + LOSS + ';font-weight:700}.cbd-pos{color:var(--gold-a);font-weight:700}',
    '.cbd-inside{background:rgba(255,255,255,.02)}',
    '.cbd-inside td{padding:10px 12px}',
    '.cbd-honest{border:1px solid rgba(224,86,63,.45);border-radius:14px;padding:14px 16px;margin-bottom:12px;background:rgba(224,86,63,.07);color:var(--text-2);font-size:12.5px;line-height:1.6}',
    '.cbd-honest h3{margin:0 0 8px;font-size:14px;font-weight:800;color:var(--text)}',
    '.cbd-honest p{margin:0 0 8px}.cbd-honest p:last-child{margin-bottom:0}',
    '.cbd-honest b{color:var(--text)}.cbd-honest .big{color:' + LOSS + ';font-weight:800}',
    '.cbd-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}',
    '.cbd-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    '.cbd-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:help}',
    /* an ad status is a READING: its date rides under it, and a reading a day or more old is
       written brighter so it cannot be skimmed as a present-tense fact */
    '.cbd-age{display:block;font-size:10px;color:var(--text-3);font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}',
    '.cbd-age.old{color:var(--text-2)}',
    '.cbd-clash{display:inline-block;margin-top:3px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:' + LOSS + ';white-space:nowrap}',
    '.cbd-clash-why{display:block;font-size:10px;color:' + LOSS + ';font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}'
  ].join(''));

  /* ── small formatters. a figure with nothing to divide by prints the empty marker, never a zero ── */
  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function roasTxt(n) { var v = num(n); return v == null ? '—' : v.toFixed(2) + '×'; }
  function ratio(a, b) { var t = num(a), d = num(b); if (d == null || d === 0 || t == null) return null; return t / d; }
  function dayTxt(d) { d = String(d == null ? '' : d).slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? d : '—'; }
  function pctTxt(n) { var v = num(n); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
  function rateTxt(n) { var v = num(n); return v == null ? '—' : (Math.round(v * 100) / 100) + '%'; }
  /* the owner's words for the number, and one unit reads 'unit' */
  function unitsTxt(n) { var v = num(n); return cnt(n) + ' unit' + (v === 1 ? '' : 's') + ' from ads'; }
  function src(t) { return '<span class="cbd-src" title="' + esc(t) + '">' + esc(t) + '</span>'; }
  function keyOf(c) { return String(c.account || '') + '||' + String(c.campaign_id || ''); }
  function typeTxt(f) {
    f = String(f || '');
    return f === 'COST_PER_CLICK' ? 'CPC' : f === 'COST_PER_SALE' ? 'Cost per sale' : (f || '—');
  }
  function isRunning(s) { return /RUNNING|ENDING_SOON/i.test(String(s || '')); }
  /* the engine sends roas and cpc; the safe ratio is the fallback so a row never prints a stale blank */
  function roasOf(r) { var v = num(r.roas); return v == null ? ratio(r.sales_money, r.spend) : v; }
  function cpcOf(r) { var v = num(r.cpc); return v == null ? ratio(r.spend, r.clicks) : v; }

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
    return '<span class="cbd-age' + (f.band === 'days' ? ' old' : '') + '">' +
      (prefix ? esc(prefix) + ' ' : '') + esc(f.words) + '</span>';
  }
  function adDupLine(o) {
    var n = adRecords(o);
    if (n == null || n < 2) return '';
    return '<span class="cbd-age old">eBay returned ' + n + ' ad records for this listing in this campaign.</span>';
  }
  /* THE CONTRADICTION, said plainly. An archived ad cannot be charged, so a row reading ARCHIVED on
     a listing the same campaign billed has one of the two wrong, and the money is the half to
     believe. `money` is a figure already in this payload, never a fresh request. */
  function adClash(status, money, when) {
    var v = Number(money);
    if (!adArchived(status) || money == null || money === '' || isNaN(v) || v <= 0) return '';
    return '<span class="cbd-clash" title="an archived ad cannot be charged, so one of the two is wrong">archived but spending</span>' +
      '<span class="cbd-clash-why">Charged ' + gbp(v) + ' in this campaign ' + esc(String(when || '')) + '. An archived ad cannot spend, so believe the money, not this status.</span>';
  }

  VIEWS.adtoolCampaignBoard = {
    label: 'Campaigns', hidden: true, order: 96, roles: ROLES,
    icon: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="11" height="6" rx="1.5"/><path d="M17 17h4"/>',
    render: function () {
      /* the two filters sit at the TOP, above everything they change, and each is labelled: the
         spec asks for an Account filter and a Date filter on this page and a reader has to be able
         to see which control is which before reading a single figure */
      return '<div class="cbd-wrap">' +
        adtHgroup('Campaigns', 'Every campaign, the listings inside it, and what each spends', 'cbdFresh') +
        '<div class="cbd-filterbar">' +
          '<div class="cbd-fl"><span class="cbd-fk">Date</span><div id="cbdBar"></div></div>' +
          '<div class="cbd-fl"><span class="cbd-fk">Account</span><div id="cbdAcct" class="cbd-filters"></div></div>' +
        '</div>' +
        '<div id="cbdBody"><div class="cbd-empty">Loading…</div></div></div>';
    },
    init: function () {
      /* #adtoolCampaignBoard/<campaign id> opens with THAT campaign expanded. The hash is the only
         hand-off: a second tab opened on another campaign shows its own, never the first tab's. */
      CB.want = String((window.adtRoute ? adtRoute().param : '') || '').trim();
      CB.wantDone = false;
      CB.open = {}; CB.inside = {}; CB.data = null;
      CB.period = adtPeriodBar('cbdBar', {
        page: 'adtoolCampaignBoard', def: 'd7', allowCustom: true,
        onChange: function (v) { CB.period = v; CB.inside = {}; load(false); }
      });
      acctChips();
      load(false).catch(function () {});
    }
  };

  /* the campaign named in the hash, found once the payload is in hand: the row carries the account,
     which the hash cannot, and the open key is the two together */
  function applyWanted() {
    if (!CB.want || CB.wantDone || !CB.data) return;
    var rows = (CB.data.campaigns || []).filter(function (c) { return c && typeof c === 'object'; });
    var hit = null;
    for (var i = 0; i < rows.length; i++) { if (String(rows[i].campaign_id || '') === CB.want) { hit = rows[i]; break; } }
    CB.wantDone = true;
    if (!hit) return;
    /* a chip filter that hides the campaign asked for would answer a different question */
    if (CB.status && statusOf(hit) !== CB.status) CB.status = '';
    CB.open[keyOf(hit)] = true;
  }

  function acctChips() {
    var el = $('cbdAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (CB.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      CB.accounts.map(function (a) { return '<button class="' + (CB.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      CB.account = this.getAttribute('data-a'); CB.inside = {}; CB.open = {}; acctChips(); load(false);
    };
  }

  /* The page asks for EVERY status in one read and filters the campaign table in the browser, so the
     status chips carry exact counts from the payload's own rows and switching between them is instant.
     The account table and the period totals are deliberately over every campaign, not the chosen chip. */
  function params() {
    var p = adtPeriodParams(CB.period);
    if (CB.account) p.account = CB.account;
    p.status = '';
    return p;
  }

  function load(quiet) {
    return api('adtoolCampaignBoard', params()).then(function (d) {
      CB.data = d || {};
      /* accounts_list is every account that has a campaign, whatever is filtered; `accounts` is the
         table of per-account rows, which holds ONE row once an account is chosen. Building the chips
         from that one row left the reader with no way back to the others. */
      var names = (d && d.accounts_list) || [];
      if (!names.length && !CB.account) { names = ((d && d.accounts) || []).map(function (a) { return a && a.account; }); }
      names = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
      if (names.length) { CB.accounts = names; acctChips(); }
      applyWanted();
      if (!$('cbdBody')) return;
      draw();
      adtPeriodEcho('cbdBar', d && d.period);
      adtFreshShow('cbdFresh', d && d.fresh);
      if (adtIncludesToday(d && d.period, CB.period)) { adtPoll('cbdBody', 300000, function () { return load(true); }); }
      else { adtPollStop('cbdBody'); }
    }).catch(function (e) {
      if (!quiet && $('cbdBody')) {
        $('cbdBody').innerHTML = '<div class="cbd-panel"><h3>Not available</h3><div class="cbd-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }

  /* ── 1 · the period's totals, then account to account ───────────────────────────────────────── */
  function tile(k, v, d, cls) {
    return '<div class="cbd-tile ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div><div class="d">' + esc(d) + '</div></div>';
  }
  function totalsTiles(D) {
    var T = D.totals || {};
    var roas = num(T.roas); if (roas == null) roas = ratio(T.sales_money, T.spend);
    var cpc = num(T.cpc); if (cpc == null) cpc = ratio(T.spend, T.clicks);
    return '<div class="cbd-tiles">' +
      tile('Campaigns', cnt(T.campaigns), cnt(T.running) + ' running · ' + cnt(T.paused) + ' paused · ' + cnt(T.ended) + ' ended', 'gold') +
      tile('Listings', cnt(T.listings), 'inside those campaigns', '') +
      tile('Spend', gbp0(T.spend), cnt(T.clicks) + ' clicks', 'gold') +
      tile('Sales from ads', gbp0(T.sales_money), unitsTxt(T.sales_units), '') +
      tile('ROAS', roasTxt(roas), 'sales from ads ÷ spend', roas != null && roas < 1 ? 'loss' : 'gold') +
      tile('Cost per click', gbp(cpc), cpc == null ? 'no clicks' : 'spend ÷ clicks', '') +
      '</div>';
  }

  var ACCT_COLS = [
    { k: 'account', l: 'Account', cell: function (a) { return '<span class="cbd-name">' + esc(a.account || '—') + '</span>'; } },
    { k: 'campaigns', l: 'Campaigns', r: 1, cell: function (a) { return cnt(a.campaigns); } },
    { k: 'running', l: 'Running', r: 1, cell: function (a) { return '<span class="cbd-pos">' + cnt(a.running) + '</span>'; } },
    { k: 'paused', l: 'Paused', r: 1, cell: function (a) { return cnt(a.paused); } },
    { k: 'ended', l: 'Ended', r: 1, cell: function (a) { return cnt(a.ended); } },
    { k: 'listings', l: 'Listings', r: 1, cell: function (a) { return cnt(a.listings); } },
    { k: 'budget_day', l: 'Daily budget', r: 1, cell: function (a) { return gbp0(a.budget_day); } },
    { k: 'spend', l: 'Spend', r: 1, cell: function (a) { return gbp(a.spend); } },
    { k: 'clicks', l: 'Clicks', r: 1, cell: function (a) { return cnt(a.clicks); } },
    { k: 'sales_money', l: 'Sales from ads', r: 1, cell: function (a) { return gbp(a.sales_money); } },
    { k: 'sales_units', l: 'Units from ads', r: 1, cell: function (a) { return cnt(a.sales_units); } },
    { k: 'roas', l: 'ROAS', r: 1, cell: function (a) { var v = roasOf(a); return '<span class="' + (v == null ? '' : (v < 1 ? 'cbd-neg' : 'cbd-pos')) + '">' + roasTxt(v) + '</span>'; } },
    { k: 'cpc', l: 'Cost per click', r: 1, cell: function (a) { return gbp(cpcOf(a)); } }
  ];

  function accountPanel(D) {
    var rows = (D.accounts || []).filter(function (a) { return a && typeof a === 'object' && a.account; });
    if (!rows.length) return '';
    var T = D.totals || {};
    var budgetSum = 0, haveBudget = false;
    rows.forEach(function (a) { var v = num(a.budget_day); if (v != null) { budgetSum += v; haveBudget = true; } });
    var totRoas = num(T.roas); if (totRoas == null) totRoas = ratio(T.sales_money, T.spend);
    var totCpc = num(T.cpc); if (totCpc == null) totCpc = ratio(T.spend, T.clicks);

    var h = '<div class="cbd-panel"><h3>Account to account</h3>' +
      '<div class="cbd-sub">Every account side by side over the period, with every campaign counted whatever its status.</div>' +
      '<div class="cbd-scroll"><table class="cbd-tbl"><thead><tr>' +
      ACCT_COLS.map(function (c) { return '<th class="' + (c.r ? 'r' : '') + '">' + esc(c.l) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.slice().sort(function (x, y) { return (num(y.spend) || 0) - (num(x.spend) || 0); })
        .map(function (a) { return '<tr>' + ACCT_COLS.map(function (c) { return '<td class="' + (c.r ? 'r' : '') + '">' + c.cell(a) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="cbd-tot"><td>All accounts</td><td class="r">' + cnt(T.campaigns) + '</td><td class="r">' + cnt(T.running) + '</td>' +
      '<td class="r">' + cnt(T.paused) + '</td><td class="r">' + cnt(T.ended) + '</td><td class="r">' + cnt(T.listings) + '</td>' +
      '<td class="r" title="added up from the account rows above">' + (haveBudget ? gbp0(budgetSum) : '—') + '</td>' +
      '<td class="r">' + gbp(T.spend) + '</td><td class="r">' + cnt(T.clicks) + '</td><td class="r">' + gbp(T.sales_money) + '</td>' +
      '<td class="r">' + cnt(T.sales_units) + '</td><td class="r">' + roasTxt(totRoas) + '</td><td class="r">' + gbp(totCpc) + '</td></tr>' +
      '</tbody></table></div>';

    /* spend by account, the same figure as the Spend column, drawn so the shape of the fleet reads at a glance */
    var bars = rows.filter(function (a) { return (num(a.spend) || 0) > 0; })
      .sort(function (x, y) { return (num(y.spend) || 0) - (num(x.spend) || 0); }).slice(0, 10)
      .map(function (a) {
        return { label: String(a.account || ''), value: num(a.spend) || 0, strong: CB.account === a.account,
          title: a.account + ': ' + gbp(a.spend) + ' spend, ' + gbp(a.sales_money) + ' sales from ads' };
      });
    if (bars.length > 1) {
      h += '<div style="margin-top:10px">' + chartBars(bars, { height: 150, fmt: chartMoney, everyNth: 1 }) + '</div>';
    }
    return h + '</div>';
  }

  /* ── 2 · status chips, counted from the payload's own campaign rows ─────────────────────────── */
  var STATUS_CHIPS = [['', 'All'], ['active', 'Active'], ['paused', 'Paused'], ['ended', 'Ended']];
  function statusOf(c) {
    var s = String(c.status || '').toUpperCase();
    if (isRunning(s)) return 'active';
    if (/PAUSE/.test(s)) return 'paused';
    if (/END/.test(s)) return 'ended';
    return '';
  }
  function statusChips(D) {
    var rows = D.campaigns || [], counts = { '': rows.length, active: 0, paused: 0, ended: 0 };
    rows.forEach(function (c) { var b = statusOf(c); if (b) counts[b]++; });
    return '<div class="cbd-chips">' + STATUS_CHIPS.map(function (c) {
      return '<button class="cbd-chip' + (CB.status === c[0] ? ' on' : '') + '" data-s="' + c[0] + '">' +
        esc(c[1]) + '<span class="n">' + cnt(counts[c[0]]) + '</span></button>';
    }).join('') + '</div>';
  }

  /* ── 3 · campaign to campaign, sortable on every column, spend first ────────────────────────── */
  function marks(c) {
    var m = '';
    var shared = num(c.shares_listings);
    if (shared != null && shared > 0) {
      m += '<span class="cbd-mark" title="' + esc(shared + ' of this campaign\'s listings are also live in another campaign, so their spend shows on both rows') + '">shares ' + shared + '</span>';
    }
    if (c.over_day_cap_per_listing || c.over_day_cap) {
      var pl = perListing(c), cap = num(c.day_cap);
      m += '<span class="cbd-mark cap" title="' + esc('the budget shared across this campaign\'s listings leaves each one ' +
        (pl == null ? 'more' : gbp(pl)) + ' a day' + (cap == null ? '' : ', which is over the ' + gbp(cap) + ' a listing is allowed')) +
        '">over the cap</span>';
    }
    return m;
  }
  /* The share the engine compared, never a second division of our own: the engine divides the budget
     by the listings SHARING it, which is the advertised ones where a campaign has any, and dividing
     by the whole listing count here instead printed a figure below the cap on a row marked over it. */
  function perListing(c) {
    var v = num(c.budget_per_listing_day);
    if (v != null) return v;
    var b = num(c.budget_day), n = num(c.listings_advertised);
    if (n == null || n === 0) n = num(c.listings);
    if (b == null || n == null || n <= 0) return null;
    return b / n;
  }

  var CAMP_COLS = [
    { key: 'name', label: 'Campaign', cell: function (c) {
        return '<span class="cbd-cap">' + (CB.open[keyOf(c)] ? '▾' : '▸') + '</span><span class="cbd-name">' + adtCampaignLink(c.campaign_id, c.name || c.campaign_id || '—') + '</span>' + marks(c) +
          '<div class="cbd-sub2">' + esc(c.account || '') + '</div>';
      }, sortVal: function (c) { return String(c.name || ''); } },
    { key: 'account', label: 'Account', cell: function (c) { return esc(c.account || '—'); }, sortVal: function (c) { return String(c.account || ''); } },
    { key: 'funding_model', label: 'Type', cell: function (c) { return esc(typeTxt(c.funding_model)); }, sortVal: function (c) { return typeTxt(c.funding_model); } },
    { key: 'status', label: 'Status', cell: function (c) {
        return '<span class="cbd-tag ' + (isRunning(c.status) ? 'live' : 'off') + '">' + esc(c.status || '—') + '</span>';
      }, sortVal: function (c) { return String(c.status || ''); } },
    { key: 'budget_day', label: 'Daily budget', cls: 'r', cell: function (c) {
        var pl = perListing(c);
        return gbp0(c.budget_day) + (pl == null ? '' : '<div class="cbd-sub2" title="the daily budget shared across this campaign\'s listings">' + gbp(pl) + ' a listing</div>');
      }, sortVal: function (c) { return num(c.budget_day); } },
    { key: 'bid_pct', label: 'Ad rate', cls: 'r', cell: function (c) { return rateTxt(c.bid_pct); }, sortVal: function (c) { return num(c.bid_pct); } },
    { key: 'listings', label: 'Listings', cls: 'r', cell: function (c) { return cnt(c.listings); }, sortVal: function (c) { return num(c.listings); } },
    /* the advertised count is worked out from ad statuses, so it is only as current as the reading
       that produced them: the date of that reading belongs under the number */
    { key: 'listings_advertised', label: 'Advertised', cls: 'r', cell: function (c) { return cnt(c.listings_advertised) + adAgeLine(adFreshCamp(c), true); }, sortVal: function (c) { return num(c.listings_advertised); } },
    { key: 'spend', label: 'Spend', cls: 'r', cell: function (c) { return gbp(c.spend); }, sortVal: function (c) { return num(c.spend); } },
    { key: 'clicks', label: 'Clicks', cls: 'r', cell: function (c) { return cnt(c.clicks); }, sortVal: function (c) { return num(c.clicks); } },
    { key: 'sales_money', label: 'Sales from ads', cls: 'r', cell: function (c) {
        return gbp(c.sales_money) + '<div class="cbd-sub2">' + unitsTxt(c.sales_units) + '</div>';
      }, sortVal: function (c) { return num(c.sales_money); } },
    { key: 'roas', label: 'ROAS', cls: 'r', cell: function (c) {
        var v = roasOf(c); return '<span class="' + (v == null ? '' : (v < 1 ? 'cbd-neg' : 'cbd-pos')) + '">' + roasTxt(v) + '</span>';
      }, sortVal: roasOf },
    { key: 'cpc', label: 'Cost per click', cls: 'r', cell: function (c) { return gbp(cpcOf(c)); }, sortVal: cpcOf },
    { key: 'start_date', label: 'Started', cls: 'r', cell: function (c) { return '<span class="cbd-sub2">' + dayTxt(c.start_date) + '</span>'; }, sortVal: function (c) { return dayTxt(c.start_date); } },
    { key: 'end_date', label: 'Ends', cls: 'r', cell: function (c) { return '<span class="cbd-sub2">' + dayTxt(c.end_date) + '</span>'; }, sortVal: function (c) { return dayTxt(c.end_date); } }
  ];

  function sorter() {
    var key = CB.sort.key, dir = CB.sort.dir, col = null;
    for (var i = 0; i < CAMP_COLS.length; i++) if (CAMP_COLS[i].key === key) { col = CAMP_COLS[i]; break; }
    var val = (col && col.sortVal) ? col.sortVal : function (r) { return num(r[key]); };
    return function (a, b) {
      var va = val(a), vb = val(b);
      if (typeof va === 'string' || typeof vb === 'string') {
        va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase();
        return va < vb ? -dir : (va > vb ? dir : 0);
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1; if (vb == null) return -1;      /* nulls sink whichever way we sort */
      return (va - vb) * dir;
    };
  }

  function campaignPanel(D) {
    var all = (D.campaigns || []).filter(function (c) { return c && typeof c === 'object'; });
    var rows = CB.status ? all.filter(function (c) { return statusOf(c) === CB.status; }) : all;
    rows = rows.slice().sort(sorter());
    var h = '<div class="cbd-panel"><h3>Campaign to campaign' + src(moneyTag(D)) + '</h3>' +
      '<div class="cbd-sub">One row per campaign over the period. Open a row to see the listings inside it. ' +
      'Sort on any column by clicking its heading.</div>';
    if (!rows.length) {
      h += '<div class="cbd-empty">No campaign in this group for the period.</div></div>';
      return h;
    }
    h += '<div class="cbd-scroll"><table class="cbd-tbl"><thead><tr>' + CAMP_COLS.map(function (c) {
      var on = CB.sort.key === c.key;
      return '<th class="s ' + (c.cls || '') + '" data-k="' + esc(c.key) + '">' + esc(c.label) +
        (on ? '<span class="ar">' + (CB.sort.dir < 0 ? '▼' : '▲') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (c) {
      var k = keyOf(c);
      return '<tr class="cbd-row" data-c="' + esc(k) + '">' +
        CAMP_COLS.map(function (col) { return '<td class="' + (col.cls || '') + '">' + col.cell(c) + '</td>'; }).join('') + '</tr>' +
        '<tr class="cbd-inside" data-inside="' + esc(k) + '"' + (CB.open[k] ? '' : ' hidden') + '><td colspan="' + CAMP_COLS.length + '">' +
        insideHtml(k) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
    return h;
  }

  /* ── 4 · the listings inside one campaign, from adtoolCampaignListings ──────────────────────── */
  function insideHtml(k) {
    var got = CB.inside[k];
    if (!got) return '<div class="cbd-empty">Loading the listings in this campaign…</div>';
    if (got.error) return '<div class="cbd-empty">' + esc(got.error) + '</div>';
    var rows = got.rows || [], T = got.totals || {};
    if (!rows.length) return '<div class="cbd-empty">No listing in this campaign over the period.</div>';
    var held = num(got.held_back);
    /* the listings add back up to the campaign row above them, and this line is where a reader can
       see that they do rather than take it on trust */
    var note = adPanelNote(rows.map(function (r) { return adFreshSrc(r, got.campaign); }));
    return (note ? '<div class="cbd-sub2" style="margin-bottom:6px">Each ad status below is a reading taken when this campaign\'s ads were last read, not a live check. ' + esc(note) + '</div>' : '') +
      '<div class="cbd-scroll"><table class="cbd-tbl"><thead><tr>' +
      '<th>Listing</th><th>This ad, when last read</th><th class="r">Ad rate</th><th class="r">Spend</th><th class="r">Clicks</th>' +
      '<th class="r">Sales from ads</th><th class="r">ROAS</th><th class="r">Cost per click</th><th>Also in</th>' +
      '</tr></thead><tbody>' + rows.map(function (r) { return insideRow(r, got.campaign); }).join('') +
      '<tr class="cbd-tot"><td>' + cnt(T.listings != null ? T.listings : rows.length) + ' listings in this campaign</td><td></td><td></td>' +
      '<td class="r">' + gbp(T.spend) + '</td><td class="r">' + cnt(T.clicks) + '</td>' +
      '<td class="r">' + gbp(T.sales_money) + '</td><td class="r">' + roasTxt(roasOf(T)) + '</td>' +
      '<td class="r">' + gbp(cpcOf(T)) + '</td>' +
      '<td>' + (num(T.shared_with_another_campaign) ? cnt(T.shared_with_another_campaign) + ' shared' : '') + '</td></tr>' +
      '</tbody></table></div>' +
      (held != null && held > 0 ? '<div class="cbd-sub2" style="margin-top:6px">' + cnt(held) + ' more listing' + (held === 1 ? '' : 's') + ' in this campaign are not shown, though the row above counts them all.</div>' : '');
  }
  /* a listing row carries its own read time once the engine sends one; until then the campaign's
     own ads_synced_at is the date behind every ad status in this campaign */
  function adFreshSrc(r, camp) {
    var f = adFresh(r);
    return f.band === 'unknown' && camp ? adFreshCamp(camp) : f;
  }
  function insideRow(r, camp) {
    var live = r.live != null ? !!r.live : /ACTIVE|ELIGIBLE/i.test(String(r.ad_status || ''));
    /* the engine names these other_campaigns and ad_rate. Reading shared_with and bid_pct printed an
       empty cell in both columns, which a reader takes for "none" and "no ad rate". */
    var shared = num(r.other_campaigns);
    if (shared == null) shared = r.shared_with_another_campaign ? 1 : 0;
    var roas = roasOf(r), cpc = cpcOf(r);
    return '<tr><td>' + adtProductCell(r) + '</td>' +
      '<td><span class="cbd-tag ' + (live ? 'live' : 'off') + '">' + esc(r.ad_status || '—') + (live ? ' · live' : '') + '</span>' +
        /* NO archived-but-spending flag on this table, and that is deliberate rather than an
           oversight: the engine leaves ARCHIVED ads out of a campaign's listings altogether, so
           their money is not added to the campaign either, and a row reading archived can never
           reach this table for the flag to fire on. Calling the check here would have looked like
           cover it does not give. The contradiction is caught where an archived row IS shown: the
           per-listing map on Product history and the Campaigns-live lookup. */
        adAgeLine(adFreshSrc(r, camp), true) + adDupLine(r) + '</td>' +
      '<td class="r">' + rateTxt(r.ad_rate != null ? r.ad_rate : r.bid_pct) + '</td>' +
      '<td class="r">' + gbp(r.spend) + '</td>' +
      '<td class="r">' + cnt(r.clicks) + '</td>' +
      '<td class="r">' + gbp(r.sales_money) + '<div class="cbd-sub2">' + unitsTxt(r.sales_units) + '</div></td>' +
      '<td class="r"><span class="' + (roas == null ? '' : (roas < 1 ? 'cbd-neg' : 'cbd-pos')) + '">' + roasTxt(roas) + '</span></td>' +
      '<td class="r">' + gbp(cpc) + '</td>' +
      '<td>' + (shared > 0
        ? '<span class="cbd-mark" title="this listing is also live in another campaign, so its spend shows on that campaign too">' + shared + ' more campaign' + (shared === 1 ? '' : 's') + '</span>'
        : '<span class="cbd-sub2">this campaign only</span>') + '</td></tr>';
  }
  /* found by walking the rows, not by an attribute selector: an account name is free text and a
     quote in it would make a selector string either miss or throw */
  function insideEl(k) {
    var all = document.querySelectorAll('#cbdBody tr[data-inside]');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-inside') === k) return all[i];
    return null;
  }
  function paint(k) {
    var t = insideEl(k);
    if (t && t.cells[0] && CB.open[k]) t.cells[0].innerHTML = insideHtml(k);
  }
  /* the fetch and the paint are separate: a row opened from the hash is asked for whether or not
     its row element is on screen yet, and paint() fills it in when it is */
  function openInside(k) {
    var tr = insideEl(k);
    if (tr) {
      tr.hidden = false;
      if (tr.cells[0]) tr.cells[0].innerHTML = insideHtml(k);
    }
    if (CB.inside[k]) return;
    var parts = k.split('||'), p = adtPeriodParams(CB.period);
    p.account = parts[0]; p.campaign_id = parts[1];
    api('adtoolCampaignListings', p).then(function (d) {
      CB.inside[k] = {
        rows: ((d && (d.listings || d.rows)) || []),
        totals: (d && d.totals) || null,
        held_back: d ? d.listings_held_back : null,
        /* the campaign carries when its ads were last read, which is the date behind every ad
           status in the table below it */
        campaign: (d && d.campaign) || null
      };
      paint(k);
    }).catch(function (e) {
      CB.inside[k] = { error: (e && e.message) || 'The listings in this campaign could not load.' };
      paint(k);
    });
  }

  /* ── 5 · the honesty block. where the campaign money comes from, and what is counted twice ──── */
  function addedUp(D) { return !/ebay/i.test(String((D && D.money_source) || '')); }
  function moneyTag(D) { return addedUp(D) ? 'added up from the listings' : 'eBay campaign report'; }
  /* The per-listing daily cap is the owner's own figure, read from config by the engine and sent on
     rules.day_cap (and again on every campaign row). Print the live value or nothing; never a
     number typed in here. */
  function dayCap(D) {
    var c = num(D.rules && D.rules.day_cap);
    if (c == null) { ((D.campaigns || [])).some(function (r) { var v = num(r && r.day_cap); if (v != null) { c = v; return true; } return false; }); }
    return c;
  }
  function honesty(D) {
    var h = '<div class="cbd-honest"><h3>How to read the campaign figures</h3>';

    var R = D.campaign_report_rows || {};
    if (addedUp(D)) {
      h += '<p><b>Where the campaign money comes from.</b> The spend, clicks and sales on every campaign row are ' +
        'added up from the listings in that campaign. That is our own addition, not a figure eBay reported for the ' +
        'campaign. Each listing figure is eBay\'s own.' +
        /* the case the owner must never mistake for a collapse in spend: eBay's own per-campaign rows
           have started landing but do not yet reach across the whole window, so they are not used */
        (num(R.rows_in_window) ? ' eBay\'s own campaign report has started landing but does not yet cover' +
          (num(R.accounts_short) ? ' every account over' : '') + ' this period' +
          (R.from && R.to ? ' (it holds ' + dayTxt(R.from) + ' to ' + dayTxt(R.to) + ')' : '') +
          ', so it is left alone rather than shown as a part of the period standing for the whole of it. ' +
          'Pick a shorter period inside those dates and the rows become eBay\'s own.' : '') + '</p>';
    } else {
      h += '<p><b>Where the campaign money comes from.</b> eBay\'s own campaign report, per campaign and per day, ' +
        'so each campaign row is the figure eBay reported for that campaign. A campaign the report does not mention ' +
        'spent nothing over the period.</p>';
    }

    /* THE RECONCILIATION. The difference between the campaign column and the company total is
       measured from the figures on screen, so subtracting it always lands on the total exactly. */
    var C = D.column || {}, colSpend = num(C.spend), twice = num(C.spend_counted_twice);
    var T2 = D.totals || {}, tot = num(T2.spend);
    var O = D.overlap || {};
    var many = num(O.listings_in_two_or_more), of = num(O.of_live_advertised), dbl = num(C.listings_counted_more_than_once);
    if (twice != null && twice > 0) {
      h += '<p><b>Some listings are counted twice.</b> The campaign rows add up to <span class="big">' + gbp(colSpend) +
        '</span>. Take off the <span class="big">' + gbp(twice) + '</span> that is the same spend landing on more than one ' +
        'campaign and you have <b>' + gbp(tot) + '</b>, the figure in the totals row and on the account lines. ' +
        (dbl != null && dbl > 0 ? cnt(dbl) + ' listing' + (dbl === 1 ? ' sits' : 's sit') + ' in more than one of these campaigns' : '') +
        (many != null && many > 0 ? (dbl != null && dbl > 0 ? ', and ' : '') + cnt(many) + ' of the ' + cnt(of) +
          ' listings with a live ad are being advertised in two or more campaigns at once' +
          ((of != null && of > 0) ? ', which is ' + pctTxt(many / of) + ' of them' : '') : '') + '. ' +
        'Every campaign row holding one of them is marked <span class="cbd-mark">shares</span> above. ' +
        'The totals and the account rows count each listing once.</p>';
    } else {
      h += '<p><b>Nothing is counted twice.</b> The campaign rows add up to <b>' + gbp(colSpend) + '</b>, which is the ' +
        'figure in the totals row: no listing\'s spend lands on two campaign rows over this period.</p>';
    }
    var heldC = num(D.campaigns_held_back);
    if (heldC != null && heldC > 0) {
      h += '<p><b>' + cnt(heldC) + ' campaigns are not on the page.</b> The biggest spenders are shown. The totals row, ' +
        'the account lines and the two figures above cover every campaign, shown or not. Choose one account to see more of them.</p>';
    }

    var cap = dayCap(D);
    h += '<p><b>Budget against the cap.</b> A campaign\'s daily budget is shared by every listing inside it, so the ' +
      'figure to judge is the budget divided by the listings sharing it, printed under each budget. ' +
      (cap != null
        ? 'A listing is allowed ' + gbp(cap) + ' a day, so a row is marked <span class="cbd-mark cap">over the cap</span> when that per-listing share is above it.'
        : 'A row is marked <span class="cbd-mark cap">over the cap</span> when that per-listing share is above the daily cap a listing is allowed.') +
      ' The whole budget is never judged against a per-listing cap.</p>';

    /* fix 6: the page used to print ad statuses, and the advertised count worked out from them, as
       the state of things now. They are readings on a rotation, and a campaign that is not running
       may not have been read for weeks. */
    var readNote = adPanelNote((D.campaigns || []).map(function (c) { return adFreshCamp(c); }));
    h += '<p><b>An ad status is a reading.</b> The advertised count, and every ad status inside an' +
      ' opened campaign, is what eBay said when that campaign\'s ads were last read. It is not a live' +
      ' check, and a campaign that is not running may not have been read for a long time. Each one' +
      ' carries the date of its own reading.' + (readNote ? ' ' + esc(readNote) : '') +
      ' A listing marked <span class="cbd-clash">archived but spending</span> was charged inside a' +
      ' campaign whose ad for it reads archived: an archived ad cannot spend, so the money is the half' +
      ' to believe and the status is the one to re-read.</p>';

    h += '<p>Nothing on this page is ever sent to eBay.' +
      (D.computed_at ? ' Worked out at ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC.' : '') + '</p>';
    return h + '</div>';
  }

  /* ── draw and wire ─────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var D = CB.data || {};
    var P = D.period, when = (P && (P.label || P.from)) ? adtPeriodText(P) : 'this period';
    var h = '<div class="cbd-top"><span><b>Campaigns</b></span><span>·</span><span>' + esc(when) + '</span>' +
      '<span>·</span><span>' + esc(CB.account || 'all accounts') + '</span>' +
      '<span>·</span><span>' + cnt(num(D.campaigns_total) != null ? D.campaigns_total : (D.campaigns || []).length) + ' campaigns</span>' +
      src(moneyTag(D)) + '</div>';
    if (CB.want) {
      var opened = null;
      (D.campaigns || []).forEach(function (c) { if (c && String(c.campaign_id || '') === CB.want) opened = c; });
      h += '<div class="cbd-opened">' + (opened
        ? 'Opened from a link on <b>' + esc(String(opened.name || CB.want)) + '</b>, below with its listings showing.'
        : 'This page was opened on campaign <b>' + esc(CB.want) + '</b>, and no campaign with that number came back for this period and account. Widen the date or choose all accounts.') +
        '</div>';
    }
    h += totalsTiles(D);
    h += accountPanel(D);
    h += statusChips(D);
    h += campaignPanel(D);
    h += honesty(D);
    $('cbdBody').innerHTML = h;
    wire();
    /* a row left open before a sort or a refresh comes back open, with its listings from the cache */
    Object.keys(CB.open).forEach(function (k) { if (CB.open[k]) openInside(k); });
  }

  function wire() {
    var chips = document.querySelectorAll('#cbdBody .cbd-chip');
    for (var i = 0; i < chips.length; i++) chips[i].onclick = function () { CB.status = this.getAttribute('data-s'); draw(); };

    var ths = document.querySelectorAll('#cbdBody th[data-k]');
    for (var t = 0; t < ths.length; t++) ths[t].onclick = function () {
      var k = this.getAttribute('data-k');
      if (CB.sort.key === k) { CB.sort.dir = -CB.sort.dir; }
      else { CB.sort.key = k; CB.sort.dir = (k === 'name' || k === 'account' || k === 'status' || k === 'funding_model') ? 1 : -1; }
      draw();
    };

    var rows = document.querySelectorAll('#cbdBody tr.cbd-row');
    for (var r = 0; r < rows.length; r++) rows[r].onclick = function (ev) {
      /* the row opens the listings inside it, but the campaign name is now a link to eBay and the
         expanded block carries listing links. A click that started on a link is the link's. */
      var t = ev && (ev.target || ev.srcElement);
      while (t && t !== this) { if (t.tagName === 'A') { return; } t = t.parentNode; }
      var k = this.getAttribute('data-c');
      if (CB.open[k]) {
        CB.open[k] = false;
        var tr = insideEl(k); if (tr) tr.hidden = true;
      } else {
        CB.open[k] = true;
        openInside(k);
      }
      /* the caret in the name cell flips without redrawing the whole table */
      var cap = this.querySelector('.cbd-cap'); if (cap) cap.textContent = CB.open[k] ? '▾' : '▸';
    };
  }
})();
