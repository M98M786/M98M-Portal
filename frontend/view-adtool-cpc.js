/* view-adtool-cpc.js — Advertising · Entire live listings (owner's Change Spec, 28 Oct 2026:
 * "Entire Live Listings — MERGE: CPC listings + Live listings + Current live listings").
 *
 * One page where three used to be. Every ACTIVE listing sits in exactly one of three tabs:
 *   · On CPC now        — it has a live cost-per-click ad
 *   · Dynamic listing   — no live CPC ad, but it is live in a campaign whose ad rate is dynamic
 *   · Listing without CPC — neither
 * and a fourth tab, Archive, holds the listings whose cost-per-click ad has stopped and how they
 * sold afterwards. The three add up to the active count, and the page prints that sum rather than
 * asking the reader to take it on trust: a listing in two buckets or in none is a fault, and a
 * page that cannot be checked hides it.
 *
 * Each of the three carries all accounts together and then account by account. "On CPC now" also
 * carries the money table this page has always had, over a period you choose, because what a live
 * CPC listing costs is the question that follows "which ones are live".
 *
 * Profit is each listing's own, never a total, under the Sales Analysis law. avg CPC / CVR / ROAS /
 * ACoS print "—" the moment their denominator is zero. "Sold since listed" is labelled exactly so
 * (eBay's own count, which resets on a quantity revision). Read-only: nothing on this page is ever
 * sent to eBay. Galaxy tokens only, gold the accent, #e0563f the loss colour.
 * Engine actions: adtoolLiveSplit (the three tabs), adtoolCpcListings (the money and the archive).
 * Own class prefix: .cpc-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var CP = {
    tab: 'on_cpc', account: '', period: null, accounts: [],
    split: null, splitErr: '', money: null, moneyErr: '', archive: null, archiveErr: '',
    sort: { key: 'spend', dir: -1 }, splitSort: { key: 'spend_7d', dir: -1 }, busy: {}
  };

  /* the three buckets, in the owner's words, and the archive beside them */
  var TABS = [
    { key: 'on_cpc', label: 'On CPC now', why: 'a live cost-per-click ad' },
    { key: 'dynamic', label: 'Dynamic listing', why: 'no live cost-per-click ad, but live in a campaign whose ad rate is dynamic' },
    { key: 'no_cpc', label: 'Listing without CPC', why: 'neither a live cost-per-click ad nor a dynamic campaign' },
    { key: 'archive', label: 'Archive', why: 'the cost-per-click ad has stopped' }
  ];

  VIEW_CSS.push([
    '.cpc-wrap{max-width:1460px}',
    '.cpc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    '.cpc-tab{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:6px 16px;font:inherit;font-size:12.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.cpc-tab.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.cpc-tab .n{opacity:.75;margin-left:7px;font-variant-numeric:tabular-nums}',
    '.cpc-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.cpc-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font:inherit;font-size:11.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.cpc-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.cpc-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.cpc-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.cpc-tile{flex:1 1 130px;border:1px solid var(--gold-line);border-radius:12px;padding:9px 13px;background:var(--panel-2)}',
    '.cpc-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.cpc-tile .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.cpc-tile.gold .v{color:var(--gold-a)}.cpc-tile.loss .v{color:' + LOSS + '}',
    '.cpc-tile .d{font-size:11px;color:var(--text-2);margin-top:2px}',
    '.cpc-cmp{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}@media(max-width:900px){.cpc-cmp{grid-template-columns:1fr}}',
    '.cpc-cmp-card{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel)}',
    '.cpc-cmp-card h4{margin:0 0 2px;font-size:12px;font-weight:800;color:var(--text)}',
    '.cpc-cmp-card .sub{font-size:11px;color:var(--text-2);margin-bottom:4px}',
    '.cpc-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.cpc-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.cpc-psub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.cpc-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}',
    '.cpc-inv{border:1px solid var(--gold-line);border-radius:12px;padding:10px 13px;margin-bottom:12px;background:rgba(242,176,53,.07);font-size:12.5px;color:var(--text);line-height:1.6;font-weight:600}',
    '.cpc-inv b{font-weight:800}',
    '.cpc-inv.bad{background:rgba(224,86,63,.1);border-color:rgba(224,86,63,.5);color:' + LOSS + '}',
    '.cpc-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.cpc-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap;cursor:pointer;user-select:none}',
    '.cpc-tbl th.plain{cursor:default}',
    '.cpc-tbl th.r{text-align:right}.cpc-tbl th .ar{color:var(--gold-a);margin-left:3px}',
    '.cpc-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.cpc-tbl td.r{text-align:right;white-space:nowrap}',
    '.cpc-tbl tr:hover td{background:rgba(255,255,255,.03)}',
    '.cpc-tbl tr.cpc-tot td{border-top:1px solid var(--gold-line);border-bottom:0;font-weight:800;background:rgba(242,176,53,.06)}',
    '.cpc-scroll{overflow-x:auto}',
    '.cpc-cost .s{font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);font-weight:700;display:block}',
    '.cpc-sub{font-size:10.5px;color:var(--text-3)}',
    '.cpc-neg{color:' + LOSS + ';font-weight:700}.cpc-pos{color:var(--gold-a);font-weight:700}',
    '.cpc-held{display:inline-block;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2)}',
    '.cpc-held.up{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.cpc-held.down{color:#ffb3a6;border-color:rgba(224,86,63,.5)}',
    '.cpc-held.early{color:var(--text-3);border-style:dashed;text-transform:none;letter-spacing:0}',
    '.cpc-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.cpc-tag.live{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.cpc-tag.off{color:var(--text-3);border-style:dashed}',
    '.cpc-age{display:block;font-size:10px;color:var(--text-3);font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}',
    '.cpc-age.old{color:var(--text-2)}',
    '.cpc-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    '.cpc-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}'
  ].join(''));

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function cnt(v) { v = num(v); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function n0(v) { v = num(v); return v == null ? 0 : v; }
  function plural(n, one, many) { return Math.round(n0(n)) === 1 ? one : many; }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function pct(v) { v = num(v); return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
  function rateTxt(v) { v = num(v); return v == null ? '—' : (Math.round(v * 100) / 100) + '%'; }
  function src(t, shown) { return '<span class="cpc-src" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }
  function dayTxt(d) { d = String(d || '').slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? d : '—'; }
  function typeTxt(f) { f = String(f || ''); return f === 'COST_PER_CLICK' ? 'CPC' : f === 'COST_PER_SALE' ? 'Cost per sale' : (f || '—'); }

  /* a metric printed "—" the moment its denominator is zero — never a divide-by-nothing figure.
     the engine sends the computed value; the page falls back to the safe ratio and still prints "—". */
  function ratio(topv, botv) { var t = num(topv), b = num(botv); if (b == null || b === 0) return null; if (t == null) return null; return t / b; }
  function acosOf(r) { var v = num(r.acos); if (v != null) return v; return ratio(r.spend, r.attr_revenue); }
  function avgCpcOf(r) { var v = num(r.avg_cpc); if (v != null) return v; return ratio(r.spend, r.clicks); }
  function cvrOf(r) { var v = num(r.cvr); if (v != null) return v; return ratio(r.attr_units, r.clicks); }
  function roasOf(r) { var v = num(r.roas); if (v != null) return v; return ratio(r.attr_revenue, r.spend); }

  /* ── AN AD STATUS IS A READING, NOT A LIVE FACT ───────────────────────────────────────────────
     The portal re-reads a campaign's ads on a rotation, a couple of campaigns per account per tick,
     and a campaign that is not running is not re-read at all. So an ad status on this page can be
     hours or weeks old; every status carries the date of its own reading, and a reading a day or
     more old is written in the past tense. This block is deliberately the same in the advertising
     views that show an ad status: change one and change all of them. */
  var AD_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function adReadAt(o) {
    if (!o || typeof o !== 'object') return '';
    /* adtoolLiveSplit names the stamp `ad_reading_at` — the older advertising actions call the same
       thing ads_synced_at / ad_synced_at / synced_at. All four are read here, because a stamp this
       block cannot find is reported as "we do not hold when this was read", and saying that about
       every row of a page whose every row carries a date is worse than saying nothing. */
    var v = o.ad_reading_at != null && o.ad_reading_at !== '' ? o.ad_reading_at
      : (o.ads_synced_at != null && o.ads_synced_at !== '' ? o.ads_synced_at
        : (o.ad_synced_at != null && o.ad_synced_at !== '' ? o.ad_synced_at : o.synced_at));
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
  function adAgeLine(f, quietUnknown) {
    if (!f.words || (quietUnknown && f.band === 'unknown')) return '';
    return '<span class="cpc-age' + (f.band === 'days' ? ' old' : '') + '">' + esc(f.words) + '</span>';
  }

  VIEWS.adtoolCpc = {
    label: 'Entire live listings', hidden: true, order: 40, roles: ROLES,
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14h5"/>',
    render: function () {
      return '<div class="cpc-wrap">' +
        adtHgroup('Entire live listings', 'Every live listing in one of three states, and the archive', 'cpcFresh') +
        '<div id="cpcTabs"></div>' +
        '<div id="cpcBarWrap"><div id="cpcBar"></div></div>' +
        '<div id="cpcAcct" class="cpc-chips"></div>' +
        '<div id="cpcBody"><div class="cpc-empty">Loading…</div></div></div>';
    },
    init: function () {
      /* every answer this page holds is dropped on entry: the closure outlives a visit, so a page
         re-opened an hour later would otherwise paint an hour-old split before asking for a new one */
      CP.split = null; CP.money = null; CP.archive = null;
      CP.splitErr = ''; CP.moneyErr = ''; CP.archiveErr = '';
      try { var t = localStorage.getItem('m98m:adtCpcTab'); if (t && tabOf(t)) CP.tab = t; } catch (e) {}
      CP.period = adtPeriodBar('cpcBar', { page: 'adtoolCpc', def: 'd30', onChange: function (v) { CP.period = v; CP.money = null; CP.archive = null; loadTab(false); } });
      tabButtons();
      acctChips();
      loadTab(false).catch(function () {});
    }
  };

  function tabOf(k) { for (var i = 0; i < TABS.length; i++) if (TABS[i].key === k) return TABS[i]; return null; }
  function isSplitTab() { return CP.tab === 'on_cpc' || CP.tab === 'dynamic' || CP.tab === 'no_cpc'; }

  /* ── the split payload, read defensively: the engine half may land after this page ─────────── */
  function splitList(key) {
    var D = CP.split; if (!D) return null;
    if (Array.isArray(D[key])) return D[key];
    if (D.lists && Array.isArray(D.lists[key])) return D.lists[key];
    return null;
  }
  /* the engine nests the fleet's four counts under counts.fleet and the per-account rows beside them
     under counts.by_account. Read the nest first and the flat spelling after it: the list length is
     the LAST resort and never the answer, because the engine caps each list, so a capped list's
     length would print as the count of listings in that state and be short. */
  function splitCount(key) {
    var C = (CP.split && CP.split.counts) || {};
    var F = (C.fleet && typeof C.fleet === 'object') ? C.fleet : C;
    var v = num(F[key]);
    if (v == null) v = num(C[key]);
    if (v != null) return v;
    var t = num(CP.split && CP.split.totals && CP.split.totals[key]);
    if (t != null) return t;
    var list = splitList(key);
    return list ? list.length : null;
  }
  function splitAccounts() {
    var D = CP.split; if (!D) return [];
    var C = D.counts || {};
    var a = C.by_account || D.by_account || D.counts_by_account || null;
    return Array.isArray(a) ? a.filter(function (x) { return x && typeof x === 'object' && x.account; }) : [];
  }
  /* the engine sends held_back and totals as objects keyed by the three states; the flat
     <key>_held_back / <key>_total spelling is read after them */
  function splitHeld(key) {
    var D = CP.split; if (!D) return null;
    var h = num(D.held_back && D.held_back[key]);
    if (h == null) h = num(D[key + '_held_back']);
    if (h != null) return h;
    var tot = num(D.totals && D.totals[key]);
    if (tot == null) tot = num(D[key + '_total']);
    var list = splitList(key);
    return (tot != null && list) ? Math.max(0, tot - list.length) : null;
  }

  /* THE TWO HALVES OF "WITHOUT CPC". A listing with no cost-per-click ad is either live in a
     cost-per-sale campaign whose ad rate is not dynamic, or in no live campaign at all. They are
     not the same problem and they do not get the same answer, and one number for both hid which it
     was. The engine counts them as `no_cpc_general` and `no_cpc_unadvertised` on the fleet and on
     every account row, and stamps each row of the list with `split_detail`. A count the answer does
     not carry reads "no data": a nought here would say every one of them is the other kind. */
  function noCpcSplitText(g, u) {
    if (g == null && u == null) return '';
    return 'of which ' + (g == null ? 'no data' : cnt(g)) + ' on cost-per-sale only, ' +
      (u == null ? 'no data' : cnt(u)) + ' not advertised';
  }
  function noCpcSub(g, u) {
    var t = noCpcSplitText(g, u);
    return t ? '<div class="cpc-sub">' + esc(t) + '</div>' : '';
  }
  var SPLIT_DETAIL = {
    general: ['on cost-per-sale only', 'live in a cost-per-sale campaign, and that campaign\'s ad rate is not dynamic'],
    unadvertised: ['not advertised', 'in no live campaign at all']
  };
  function splitDetailCell(r) {
    var k = String((r && r.split_detail) || '').toLowerCase();
    var w = SPLIT_DETAIL[k];
    if (!w) return '<span class="cpc-sub">no data</span>';
    return '<span class="cpc-tag' + (k === 'unadvertised' ? ' off' : '') + '" title="' + esc(w[1]) + '">' + esc(w[0]) + '</span>';
  }

  function tabButtons() {
    var el = $('cpcTabs'); if (!el) return;
    el.innerHTML = '<div class="cpc-tabs">' + TABS.map(function (t) {
      var n = t.key === 'archive' ? null : splitCount(t.key);
      return '<button class="cpc-tab' + (CP.tab === t.key ? ' on' : '') + '" data-cpt="' + t.key + '" title="' + esc(t.why) + '">' +
        esc(t.label) + (n == null ? '' : '<span class="n">' + cnt(n) + '</span>') + '</button>';
    }).join('') + '</div>';
    var bs = el.querySelectorAll('[data-cpt]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      var k = this.getAttribute('data-cpt'); if (k === CP.tab) return;
      CP.tab = k; try { localStorage.setItem('m98m:adtCpcTab', k); } catch (e) {}
      CP.sort = k === 'archive' ? { key: 'last_active_day', dir: -1 } : { key: 'spend', dir: -1 };
      tabButtons(); loadTab(false).catch(function () {});
    };
    var wrap = $('cpcBarWrap');
    /* the period bar belongs to the money and the archive; the three states are a reading of now
       and a window would say nothing about them */
    if (wrap) wrap.style.display = (CP.tab === 'on_cpc' || CP.tab === 'archive') ? '' : 'none';
  }
  function acctChips() {
    var el = $('cpcAcct'); if (!el) return;
    el.innerHTML = '<button class="cpc-chip' + (CP.account ? '' : ' on') + '" data-cpa="">All accounts</button>' +
      CP.accounts.map(function (a) { return '<button class="cpc-chip' + (CP.account === a ? ' on' : '') + '" data-cpa="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('[data-cpa]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      CP.account = this.getAttribute('data-cpa') || '';
      CP.split = null; CP.money = null; CP.archive = null;
      acctChips(); loadTab(false).catch(function () {});
    };
  }
  function learnAccounts(d) {
    var names = (d && d.accounts) || [];
    names = names.map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (names.length) { CP.accounts = names; acctChips(); }
  }

  /* ── loading: each tab asks for exactly what it shows, and keeps it ───────────────────────── */
  function loadSplit(quiet) {
    if (CP.split) return Promise.resolve();
    return api('adtoolLiveSplit', CP.account ? { account: CP.account } : {}).then(function (d) {
      CP.split = d || {}; CP.splitErr = '';
      learnAccounts(d);
      tabButtons();
    }).catch(function (e) {
      CP.split = null;
      CP.splitErr = (e && e.message) || 'The three states could not load.';
      if (!quiet) throw e;
    });
  }
  function loadMoney(mode) {
    var slot = mode === 'post' ? 'archive' : 'money';
    if (CP[slot]) return Promise.resolve();
    var p = adtPeriodParams(CP.period); p.mode = mode; if (CP.account) p.account = CP.account;
    return api('adtoolCpcListings', p).then(function (d) {
      CP[slot] = d || {}; CP[slot + 'Err'] = '';
      learnAccounts(d);
      adtPeriodEcho('cpcBar', d && d.period);
      adtFreshShow('cpcFresh', d && d.fresh);
    }).catch(function (e) {
      CP[slot] = null;
      CP[slot + 'Err'] = (e && e.message) || 'The figures could not load.';
    });
  }
  function loadTab(quiet) {
    var jobs = [];
    if (isSplitTab()) jobs.push(loadSplit(true));
    if (CP.tab === 'on_cpc') jobs.push(loadMoney('active'));
    if (CP.tab === 'archive') jobs.push(loadMoney('post'));
    if (!$('cpcBody')) return Promise.resolve();
    return Promise.all(jobs).then(function () {
      if (!$('cpcBody')) return;
      if (CP.split && CP.split.fresh && !CP.money && !CP.archive) adtFreshShow('cpcFresh', CP.split.fresh);
      draw();
      var D = CP.tab === 'archive' ? CP.archive : CP.money;
      if (D && adtIncludesToday(D.period, CP.period)) { adtPoll('cpcBody', 300000, function () { CP.money = null; CP.archive = null; CP.split = null; return loadTab(true); }); }
      else { adtPollStop('cpcBody'); }
    }).catch(function (e) {
      if (!quiet && $('cpcBody')) {
        $('cpcBody').innerHTML = '<div class="cpc-panel"><h3>Not available</h3><div class="cpc-psub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }

  /* ── 1 · the three states, all accounts then account by account, and the sum ───────────────── */
  function countsPanel() {
    if (!CP.split) return '';
    var on = splitCount('on_cpc'), dy = splitCount('dynamic'), no = splitCount('no_cpc'), act = splitCount('active');
    var rows = splitAccounts();
    var h = '<div class="cpc-panel"><h3>Every live listing, in one state each</h3>' +
      '<div class="cpc-psub">All accounts together, then account by account. A listing is in exactly one of the three.</div>' +
      '<div class="cpc-scroll"><table class="cpc-tbl"><thead><tr><th class="plain">Account</th>' +
      '<th class="plain r">Active listings</th><th class="plain r">On CPC now</th><th class="plain r">Dynamic listing</th>' +
      '<th class="plain r">Listing without CPC</th></tr></thead><tbody>';
    h += '<tr class="cpc-tot"><td>All accounts</td><td class="r">' + cnt(act) + '</td><td class="r">' + cnt(on) +
      '</td><td class="r">' + cnt(dy) + '</td><td class="r">' + cnt(no) +
      noCpcSub(splitCount('no_cpc_general'), splitCount('no_cpc_unadvertised')) + '</td></tr>';
    if (rows.length) {
      h += rows.slice().sort(function (x, y) { return n0(y.on_cpc) - n0(x.on_cpc) || String(x.account).localeCompare(String(y.account)); })
        .map(function (a) {
          return '<tr><td><b>' + esc(a.account) + '</b></td><td class="r">' + cnt(a.active) + '</td>' +
            '<td class="r">' + cnt(a.on_cpc) + '</td><td class="r">' + cnt(a.dynamic) + '</td>' +
            '<td class="r">' + cnt(a.no_cpc) + noCpcSub(num(a.no_cpc_general), num(a.no_cpc_unadvertised)) + '</td></tr>';
        }).join('');
    } else {
      h += '<tr><td colspan="5"><span class="cpc-sub">The answer does not carry the account-by-account counts yet, so only the fleet line is shown.</span></td></tr>';
    }
    return h + '</tbody></table></div></div>';
  }
  /* THE CHECK THE PAGE IS FOR. Three buckets that do not add up to the active count mean a listing
     is in two of them or in none, and a page that cannot be checked hides that. */
  /* the engine writes the check out in words as `text`; `note` was the older spelling. It is added
     ONLY where the three do not add up: there it names the cause, which the page cannot know (a read
     ceiling reached). Where they do add up it says what the page's own sentence already says, and
     one number does not get written out twice on the same line. */
  function invNote(I) {
    if (!I || typeof I !== 'object') return '';
    var v = I.text != null && I.text !== '' ? I.text : I.note;
    return v == null ? '' : String(v);
  }
  function invariantLine() {
    if (!CP.split) return '';
    var I = CP.split.invariant;
    var on = splitCount('on_cpc'), dy = splitCount('dynamic'), no = splitCount('no_cpc'), act = splitCount('active');
    /* the engine's own names: `classified` is the three added up, `active_counted` is the INDEPENDENT
       count of active listings the check is against, and `read` is how many this page classified. The
       independent count is the one to print as the active total, because the whole point of the line
       is that it was counted a second way. `sum` / `active` are the older spelling. */
    var sum = (I && num(I.classified) != null) ? num(I.classified)
      : ((I && num(I.sum) != null) ? num(I.sum) : ((on == null || dy == null || no == null) ? null : on + dy + no));
    var active = (I && num(I.active_counted) != null) ? num(I.active_counted)
      : ((I && num(I.active) != null) ? num(I.active) : act);
    if (sum == null || active == null) {
      return '<div class="cpc-inv">The answer does not carry enough counts to check that the three states add up, so this page cannot prove it here.</div>';
    }
    var ok = (I && I.ok != null) ? !!I.ok : sum === active;
    var line = cnt(on) + ' on CPC now + ' + cnt(dy) + ' dynamic + ' + cnt(no) + ' without CPC = <b>' + cnt(sum) + '</b>';
    if (ok) {
      return '<div class="cpc-inv">' + line + ', and there are <b>' + cnt(active) + '</b> active listings. They add up, so no listing is in two states or in none.' +
        '</div>';
    }
    return '<div class="cpc-inv bad">' + line + ' but there are <b>' + cnt(active) + '</b> active listings, a difference of ' +
      cnt(Math.abs(sum - active)) + '. ' + (sum > active ? 'Some listing is being counted in two states.' : 'Some listing is in none of the three.') +
      ' Believe the active count, not the split, until this is fixed.' + (invNote(I) ? ' ' + esc(invNote(I)) : '') + '</div>';
  }

  /* ── 2 · the three lists. one row per listing: where its ad lives and what it has spent ─────── */
  /* every campaign on a split row is a LIVE membership by construction: the engine builds these rows
     from the one membership rule the whole tool shares, so there is no `live` flag to read and none
     is wanted. The pill carries eBay's own ad status instead, and a cost-per-sale ad that eBay has
     paused (which that rule still counts as a membership) is the one case it reads as not live.
     `campaign_name` is the engine's name for the campaign; `name` was the older spelling. */
  function campaignsCell(r) {
    var cs = (r && r.campaigns) || [];
    if (!cs.length) return '<span class="cpc-tag off">in no campaign</span>' + adAgeLine(adFresh(r), true);
    return cs.map(function (c) {
      var live = c.live != null ? !!c.live : String(c.ad_status || '').toUpperCase() !== 'PAUSED';
      var nm = c.campaign_name || c.name || c.campaign_id || 'Campaign';
      return '<div><span class="cpc-tag ' + (live ? 'live' : 'off') + '">' + esc(c.ad_status || (live ? 'live' : 'not live')) + '</span> ' +
        adtCampaignLink(c.campaign_id, nm) +
        '<div class="cpc-sub">' + esc(typeTxt(c.funding_model)) + (c.bid_pct != null ? ' · ad rate ' + rateTxt(c.bid_pct) : '') +
        (c.dynamic ? ' · dynamic ad rate' + (c.dynamic_source === 'ebay' ? ' (eBay says so)' : (c.dynamic_source === 'name' ? ' (by its name)' : '')) : '') +
        '</div></div>';
    }).join('') + adAgeLine(adFresh(r), true);
  }
  /* Units over 7 days was a fourth column here and is gone: the split answer does not carry units,
     and the money table below already prints units over 7, 14 and 30 days to the end of the chosen
     period. A second units figure on a different window, in a column of dashes, would have read as
     "sold nothing". How many campaigns a listing sits in takes its place, which the answer does
     carry and which nothing else on this page prints as a number. */
  var SPLIT_COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'campaigns', label: 'Where its ad sits', cell: campaignsCell, sortVal: function (r) { var c = (r.campaigns || [])[0] || {}; return c.campaign_name || c.name || ''; } },
    { key: 'spend_7d', label: 'Spent over 7 days', cls: 'r', title: 'ad spend over the last 7 finished days', cell: function (r) { return gbp(r.spend_7d); }, sortVal: function (r) { return num(r.spend_7d); } },
    { key: 'campaigns_count', label: 'Campaigns', cls: 'r', title: 'how many campaigns this listing is live in. More than one means each of them charges for the same listing.', cell: function (r) { var n = num(r.campaigns_count); if (n == null) n = (r.campaigns || []).length; return n > 1 ? '<span class="cpc-neg">' + cnt(n) + '</span>' : cnt(n); }, sortVal: function (r) { return num(r.campaigns_count) == null ? (r.campaigns || []).length : num(r.campaigns_count); } }
  ];
  /* only the "without CPC" list carries `split_detail`, so only that tab gets the column: a column
     of "no data" on the two tabs where the field does not belong would read as a fault */
  var NO_CPC_COL = { key: 'split_detail', label: 'Which kind', title: 'a listing with no cost-per-click ad is either live in a cost-per-sale campaign that is not on a dynamic ad rate, or not advertised at all', cell: splitDetailCell, sortVal: function (r) { return String(r.split_detail || ''); } };
  function splitColsFor(key) { return key === 'no_cpc' ? SPLIT_COLS.slice(0, 2).concat([NO_CPC_COL], SPLIT_COLS.slice(2)) : SPLIT_COLS; }
  function splitSorter(cols) {
    var key = CP.splitSort.key, dir = CP.splitSort.dir, col = null;
    for (var i = 0; i < cols.length; i++) if (cols[i].key === key) { col = cols[i]; break; }
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
  function splitPanel(key) {
    var T = tabOf(key), list = splitList(key);
    var h = '<div class="cpc-panel"><h3>' + esc(T.label) + '</h3>' +
      '<div class="cpc-psub">' + esc(T.label) + ' means ' + esc(T.why) + '.' +
      /* the two halves of this state are counted once, under the No CPC column of the table above,
         and told row by row in the "Which kind" column below. Not a third time here. */
      (key === 'no_cpc' ? ' The Which kind column says which of the two each listing is.' : '') +
      (list && list.length ? ' ' + esc(adPanelNote(list)) : '') + '</div>';
    if (!list) {
      return h + '<div class="cpc-empty">This list is not in the answer yet, so there is nothing to show here. It is not that no listing is in this state.</div></div>';
    }
    if (!list.length) {
      return h + '<div class="cpc-empty">No listing is in this state' + (CP.account ? ' on ' + esc(CP.account) : '') + '.</div></div>';
    }
    var held = splitHeld(key);
    var cols = splitColsFor(key);
    var rows = list.slice().sort(splitSorter(cols));
    h += '<div class="cpc-scroll"><table class="cpc-tbl"><thead><tr>' + cols.map(function (c) {
      var on = CP.splitSort.key === c.key;
      return '<th class="' + (c.cls || '') + '" data-cps="' + esc(c.key) + '" title="' + esc(c.title || ('Sort by ' + c.label)) + '">' + esc(c.label) +
        (on ? '<span class="ar">' + (CP.splitSort.dir < 0 ? '▼' : '▲') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + cols.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    if (held != null && held > 0) {
      h += '<div class="cpc-sub" style="margin-top:8px">' + cnt(held) + ' more ' + plural(held, 'listing is', 'listings are') +
        ' in this state and not on the page. The counts above cover every one of them; choose one account to reach more.</div>';
    }
    return h + '</div>';
  }

  /* ── 3 · the money, over the period, for the listings on CPC now ───────────────────────────── */
  function tile(k, v, d, cls) { return '<div class="cpc-tile ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="d">' + esc(d) + '</div></div>'; }
  /* the collective tiles — spend, attributed sales, ROAS, clicks, avg CPC, CVR; NO profit at this
     collective level (profit lives on each item row only). */
  function totalsTiles(D) {
    var T = D.totals || null;
    if (!T) {
      var rs = D.rows || [], s = 0, v = 0, c = 0, au = 0;
      rs.forEach(function (r) { s += n0(r.spend); v += n0(r.attr_revenue); c += n0(r.clicks); au += n0(r.attr_units); });
      T = s > 0 || c > 0 ? { spend: s, attr_revenue: v, clicks: c, attr_units: au, roas: ratio(v, s), avg_cpc: ratio(s, c), cvr: ratio(au, c) } : null;
    }
    if (!T) return '';
    var roas = num(T.roas); if (roas == null) roas = ratio(T.attr_revenue, T.spend);
    var acpc = num(T.avg_cpc); if (acpc == null) acpc = ratio(T.spend, T.clicks);
    var cvr = num(T.cvr); if (cvr == null) cvr = ratio(T.attr_units, T.clicks);
    return '<div class="cpc-tiles">' +
      tile('Spend', gbp0(T.spend), (num(T.orders) != null ? cnt(T.orders) + ' orders' : 'ad spend'), 'gold') +
      tile('Sales from ads', gbp0(T.attr_revenue), cnt(T.attr_units) + ' units from ads', '') +
      tile('ROAS', roasTxt(roas), 'sales from ads ÷ spend', roas != null && roas < 1 ? 'loss' : 'gold') +
      tile('Clicks', cnt(T.clicks), 'paid clicks', '') +
      tile('Avg CPC', gbp(acpc), acpc == null ? 'no clicks' : 'spend ÷ clicks', '') +
      tile('Conversion rate', pct(cvr), cvr == null ? 'no clicks' : 'units from ads ÷ clicks', '') +
      '</div>';
  }
  /* period comparison: money and a ratio do not share a scale, so each metric is its own two-bar
     chart (now vs prev) with its own formatter */
  function comparePanel(D) {
    var T = D.totals, prev = D.prev;
    if (!T || !prev) return '';
    var Pn = D.period, plabel = Pn && Pn.label ? String(Pn.label).replace(/ \(.*\)$/, '') : 'this window';
    var metrics = [
      { key: 'spend', title: 'Spend', fmt: function (v) { return chartMoney(v); } },
      { key: 'attr_revenue', title: 'Sales from ads', fmt: function (v) { return chartMoney(v); } },
      { key: 'roas', title: 'ROAS', fmt: function (v) { return (Math.round(v * 100) / 100) + '×'; }, ratio: ['attr_revenue', 'spend'] }
    ];
    var cards = metrics.map(function (m) {
      var now = m.ratio ? ratio(T[m.ratio[0]], T[m.ratio[1]]) : num(T[m.key]);
      var was = m.ratio ? ratio(prev[m.ratio[0]], prev[m.ratio[1]]) : num(prev[m.key]);
      var pts = [
        { label: plabel, value: now || 0, strong: true, title: m.title + ' ' + plabel + ': ' + m.fmt(now || 0) },
        { label: 'previous', value: was || 0, title: m.title + ' previous: ' + m.fmt(was || 0) }
      ];
      var d = (now != null && was != null && was !== 0) ? (now - was) / Math.abs(was) : null;
      var good = m.key === 'spend' ? 0 : 1;                      /* spend up is neither win nor loss on its own */
      var arrow = d == null ? '' : (d > 0.0005 ? '▲' : (d < -0.0005 ? '▼' : '■'));
      var red = d != null && (good > 0 && d < 0);
      var sub = d == null ? 'no earlier period to compare' : m.fmt(now || 0) + ' vs ' + m.fmt(was || 0) + ' · <span class="' + (red ? 'cpc-neg' : (d > 0 && good > 0 ? 'cpc-pos' : '')) + '">' + arrow + ' ' + pct(Math.abs(d)) + '</span>';
      return '<div class="cpc-cmp-card"><h4>' + esc(m.title) + '</h4><div class="sub">' + sub + '</div>' +
        chartBars(pts, { height: 120, fmt: m.fmt, minGap: 0 }) + '</div>';
    }).join('');
    return '<div class="cpc-cmp">' + cards + '</div>';
  }

  function sorter(cols) {
    var key = CP.sort.key, dir = CP.sort.dir;
    var col = null; for (var i = 0; i < cols.length; i++) if (cols[i].key === key) { col = cols[i]; break; }
    var val = col && col.sortVal ? col.sortVal : function (r) { return num(r[key]); };
    return function (a, b) {
      var va = val(a), vb = val(b);
      if (typeof va === 'string' || typeof vb === 'string') { va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase(); return va < vb ? -dir : (va > vb ? dir : 0); }
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;   /* nulls sink */
      return (va - vb) * dir;
    };
  }
  function costCell(r) {
    var c = r.product_cost || {}; var v = num(c.value);
    return '<div class="cpc-cost">' + (v == null ? '—' : gbp(v)) + '<span class="s">' + esc(c.source || (v == null ? 'not costed yet' : '')) + '</span></div>';
  }
  function profitCell(r) { return adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders); }
  function impCell(r) { var v = num(r.impressions); return v == null ? '<span class="cpc-sub">—</span>' : cnt(v); }
  function unitsWindow(r) {
    return '<span title="units sold everywhere, 7 / 14 / 30 days to the end of the period">' + cnt(r.units_7d) + ' · ' + cnt(r.units_14d) + ' · ' + cnt(r.units_30d) + '</span>';
  }
  /* Sale-event fields: observed membership + when eligible again. Null → "—". */
  function inSaleCell(r) {
    if (r.in_sale == null) return '<span class="cpc-sub">—</span>';
    return r.in_sale ? '<span class="cpc-pos">YES</span>' : '<span class="cpc-sub">NO</span>';
  }
  function eligibleCell(r) {
    return r.eligible_on ? '<span class="cpc-sub">' + dayTxt(r.eligible_on) + '</span>' : '<span class="cpc-sub">—</span>';
  }

  var ACTIVE_COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'listing_date', label: 'Listed', cell: function (r) { return '<span class="cpc-sub">' + dayTxt(r.listing_date) + '</span>'; }, sortVal: function (r) { return dayTxt(r.listing_date); } },
    { key: 'sold_since_listed', label: 'Sold since listed', cls: 'r', src: 'items sync', srcLabel: 'eBay listing data', title: 'eBay\'s own count since the listing went up. It resets if the quantity is changed, so it is not a lifetime total.', cell: function (r) { return cnt(r.sold_since_listed); } },
    { key: 'units_30d', label: 'Sold 7·14·30 d', cls: 'r', title: 'units sold everywhere, 7 / 14 / 30 days to the end of the period', cell: unitsWindow },
    { key: 'product_cost', label: 'Product cost', cls: 'r', src: 'items sync', srcLabel: 'eBay listing data', cell: costCell, sortVal: function (r) { return num(r.product_cost && r.product_cost.value); } },
    { key: 'spend', label: 'Spend', cls: 'r', cell: function (r) { return gbp(r.spend); } },
    { key: 'clicks', label: 'Clicks', cls: 'r', cell: function (r) { return cnt(r.clicks); } },
    { key: 'attr_units', label: 'Units from ads', cls: 'r', title: 'units from ads, with the sales from ads underneath', cell: function (r) { return cnt(r.attr_units) + '<div class="cpc-sub">' + gbp(r.attr_revenue) + '</div>'; } },
    { key: 'impressions', label: 'Times shown', cls: 'r', title: function (D) { return 'how often the ad was shown' + (D && D.impressions_from ? '. We only have this from ' + dayTxt(D.impressions_from) : '. We do not have this for the whole period') + '.'; }, cell: impCell },
    { key: 'acos', label: 'ACoS', cls: 'r', title: 'spend ÷ sales from ads', cell: function (r) { return pct(acosOf(r)); }, sortVal: acosOf },
    { key: 'avg_cpc', label: 'Avg CPC', cls: 'r', title: 'spend ÷ clicks', cell: function (r) { return gbp(avgCpcOf(r)); }, sortVal: avgCpcOf },
    { key: 'cvr', label: 'Conv. rate', cls: 'r', title: 'units from ads ÷ clicks', cell: function (r) { return pct(cvrOf(r)); }, sortVal: cvrOf },
    { key: 'roas', label: 'ROAS', cls: 'r', title: 'sales from ads ÷ spend', cell: function (r) { var v = roasOf(r); return '<span class="' + (v != null ? (v < 1 ? 'cpc-neg' : 'cpc-pos') : '') + '">' + roasTxt(v) + '</span>'; }, sortVal: roasOf },
    { key: 'actual_profit', label: 'Profit', cls: 'r', src: 'orders', title: 'this listing on its own, worked out the same way as the Sales Analysis sheet', cell: profitCell, sortVal: function (r) { return num(r.actual_profit); } },
    { key: 'in_sale', label: 'In sale event', cls: 'r', src: 'sale events', title: 'In a running sale event now. We check once a day, and a whole-shop event takes in every listing.', cell: inSaleCell, sortVal: function (r) { return r.in_sale ? 1 : 0; } },
    { key: 'eligible_on', label: 'Eligible on', cls: 'r', src: 'sale events', title: 'In a sale event again from this date, after the 14-day wait.', cell: eligibleCell, sortVal: function (r) { return r.eligible_on || ''; } },
    { key: 'lever', label: 'What to change', cell: function (r) { return adtLeverLine(r.lever, r.who); }, sortVal: function (r) { return String(r.lever && r.lever.kind || ''); } }
  ];

  /* Archive: before the ad stopped vs after, and whether sales held — judged on per-day units RATES,
     never on the raw totals: the before window is 30 days and the after window is only what has
     elapsed since the stop, so totals would stamp every recent stop "fell". Under 7 days after the
     stop there is not enough to judge: "too early". The engine's verdict wins when it sends one. */
  function daysIn(w, fallback) {
    if (!w || typeof w !== 'object') return fallback == null ? null : fallback;
    var d = num(w.days); if (d != null) return Math.max(0, d);
    var a = String(w.from || '').slice(0, 10), b = String(w.to || '').slice(0, 10);
    if (!/^\d{4}-\d\d-\d\d$/.test(a) || !/^\d{4}-\d\d-\d\d$/.test(b)) return fallback == null ? null : fallback;
    var n = Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000) + 1;
    return n < 0 ? 0 : n;                                    /* from > to = the stop was yesterday: 0 days after */
  }
  function heldJudge(r) {
    var before = r.before || {}, after = r.after || {};
    var sent = String(r.held || '').toLowerCase();
    if (sent) {
      var v = /early/.test(sent) ? 'early' : (/held|up/.test(sent) ? 'held' : (/fell|down/.test(sent) ? 'fell' : (/n\/a|none|no sales/.test(sent) ? 'na' : null)));
      var brS = num(before.units_per_day), arS = num(after.units_per_day);
      return v ? { v: v, ratio: (brS != null && brS > 0 && arS != null) ? arS / brS : null, days: daysIn(after, null), rule: r.held_rule || '', br: brS, ar: arS } : null;
    }
    var bu = num(before.units != null ? before.units : before.attr_units), au = num(after.units != null ? after.units : after.attr_units);
    if (bu == null || au == null) return null;
    var bd = daysIn(before, 30), ad = daysIn(after, null);
    if (ad == null) return null;
    if (ad < 7) return { v: 'early', days: ad };
    if (!bd || bu === 0) return { v: 'na' };
    var br = bu / bd, ar = au / ad;
    return { v: ar >= br * 0.6 ? 'held' : 'fell', ratio: ar / br, days: ad, br: br, ar: ar };
  }
  function rate(v) { return v == null ? '—' : (Math.round(v * 100) / 100) + '/day'; }
  function heldCell(r) {
    var j = heldJudge(r);
    if (!j) return '<span class="cpc-held">—</span>';
    if (j.v === 'na') return '<span class="cpc-held" title="no sales while advertised or since, so there is nothing to compare">n/a</span>';
    if (j.v === 'early') return '<span class="cpc-held early" title="under 7 days since the ad stopped, too early to tell">too early' + (j.days != null ? ' (' + Math.round(j.days) + ' d)' : '') + '</span>';
    var t = j.rule || (j.br != null ? 'since the stop ' + rate(j.ar) + ' against ' + rate(j.br) + ' while advertised, over ' + Math.round(j.days) + ' days' : '');
    return '<span class="cpc-held ' + (j.v === 'held' ? 'up' : 'down') + '"' + (t ? ' title="' + esc(t) + '"' : '') + '>' + (j.v === 'held' ? 'held' : 'fell') + '</span>';
  }
  function beforeCell(r) { var b = r.before || {}; return '<div class="cpc-sub">spend ' + gbp(b.spend) + '</div>' + cnt(b.attr_units) + ' units · ' + gbp0(b.attr_revenue) + '<div>' + adtProfitCell(b.actual_profit, b.pending_cost_orders, b.pending_fee_orders) + '</div>'; }
  function afterCell(r) { var a = r.after || {}; var u = a.units != null ? a.units : a.attr_units; return cnt(u) + ' units · ' + gbp0(a.revenue != null ? a.revenue : a.attr_revenue) + '<div>' + adtProfitCell(a.actual_profit, a.pending_cost_orders, a.pending_fee_orders) + '</div>'; }

  var POST_COLS = [
    { key: 'listing', label: 'Listing', cell: function (r) { return adtProductCell(r); }, sortVal: function (r) { return String(r.title || r.item_id || ''); } },
    { key: 'last_active_day', label: 'Last active', cls: 'r', title: function (D) { return 'the last day the ad was seen running' + (D && D.events_from ? '. Blank before ' + dayTxt(D.events_from) + ', when we started recording ad switches' : ', where we have a record of it') + '.'; }, cell: function (r) { return r.last_active_day ? '<span class="cpc-sub">' + dayTxt(r.last_active_day) + '</span>' : '<span class="cpc-sub" title="we have no record this far back">date unknown</span>'; }, sortVal: function (r) { return dayTxt(r.last_active_day); } },
    { key: 'sold_since_listed', label: 'Sold since listed', cls: 'r', src: 'items sync', srcLabel: 'eBay listing data', title: 'eBay\'s own count since the listing went up. It resets if the quantity is changed, so it is not a lifetime total.', cell: function (r) { return cnt(r.sold_since_listed); } },
    { key: 'units_30d', label: 'Sold 7·14·30 d', cls: 'r', title: 'units sold everywhere, 7 / 14 / 30 days to the end of the period', cell: unitsWindow },
    { key: 'product_cost', label: 'Product cost', cls: 'r', src: 'items sync', srcLabel: 'eBay listing data', cell: costCell, sortVal: function (r) { return num(r.product_cost && r.product_cost.value); } },
    { key: 'before', label: 'While advertised', cls: 'r', title: 'the last period the ad ran', cell: beforeCell, sortVal: function (r) { return num(r.before && r.before.spend); } },
    { key: 'after', label: 'Since it stopped', cls: 'r', title: 'sales everywhere after the ad stopped', cell: afterCell, sortVal: function (r) { return num(r.after && (r.after.units != null ? r.after.units : r.after.attr_units)); } },
    { key: 'held', label: 'Sales', cls: 'r', title: 'did sales hold after the ad stopped? units a day since, against units a day while advertised', cell: heldCell, sortVal: function (r) { var j = heldJudge(r); return j && j.ratio != null ? j.ratio : null; } },
    { key: 'actual_profit', label: 'Profit now', cls: 'r', src: 'orders', title: 'this listing now, worked out the same way as the Sales Analysis sheet', cell: profitCell, sortVal: function (r) { return num(r.actual_profit); } }
  ];

  function moneyPanel(D, post) {
    var rows = (D.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    var cols = post ? POST_COLS : ACTIVE_COLS;
    var P = D.period, when = P && (P.label || P.from) ? adtPeriodText(P) : 'this period';
    var h = '<div class="cpc-panel"><h3>' + (post ? 'What happened after the ad stopped' : 'What these listings cost and earned') + src('cpc listings') + '</h3>' +
      '<div class="cpc-psub">' + esc(when) + ' · ' + esc(CP.account || 'all accounts') + ' · ' + cnt(rows.length) + ' ' + plural(rows.length, 'listing', 'listings') + '. ' +
      (post
        ? '<b>Sales</b> reads "held" when the listing still sells at least 60% of the units a day it sold while advertised; under 7 days since the stop it is too early to tell.'
        : 'Profit is each listing\'s own, never a total, and avg CPC, conversion rate, ROAS and ACoS show "—" when there is nothing to divide by.') +
      ' Sort on any column by clicking its heading.</div>';
    if (!rows.length) {
      return h + '<div class="cpc-empty">' + (post ? 'No listing has stopped a cost-per-click ad in this period.' : 'No listing has a live cost-per-click ad right now.') + '</div></div>';
    }
    var shown = rows.slice().sort(sorter(cols));
    h += '<div class="cpc-scroll"><table class="cpc-tbl"><thead><tr>' + cols.map(function (c) {
      var on = CP.sort.key === c.key;
      /* a title may be a function of the payload: two of them name the first day we hold the
         figure, and that day is sent by the action, never typed here */
      var ttl = typeof c.title === 'function' ? c.title(D) : c.title;
      return '<th class="' + (c.cls || '') + '" data-cpk="' + esc(c.key) + '" title="' + esc(ttl || c.label) + '">' + esc(c.label) +
        (on ? '<span class="ar">' + (CP.sort.dir < 0 ? '▼' : '▲') + '</span>' : '') + (c.src ? src(c.src, c.srcLabel) : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' +
      shown.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
    h += '<div class="cpc-sub" style="margin-top:8px">' + esc(D.source || '') + (D.computed_at ? ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC' : '') + '</div>';
    return h + '</div>';
  }

  /* ── draw and wire ────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('cpcBody'); if (!box) return;
    var T = tabOf(CP.tab) || TABS[0];
    var h = '<div class="cpc-top"><span><b>' + esc(T.label) + '</b></span><span>·</span>' +
      '<span>' + esc(CP.account || 'all accounts') + '</span>' +
      (CP.tab === 'archive' ? '' : '<span>·</span><span>as things stand now</span>') + '</div>';

    if (isSplitTab()) {
      if (!CP.split) {
        h += '<div class="cpc-note"><b>The three states are not available.</b> ' +
          esc(CP.splitErr || 'The answer that splits every live listing into three has not come back.') +
          ' The money below is unaffected.</div>';
      } else {
        h += countsPanel();
        h += invariantLine();
        h += splitPanel(CP.tab);
      }
    }
    if (CP.tab === 'on_cpc') {
      if (CP.money) { h += totalsTiles(CP.money) + comparePanel(CP.money) + moneyPanel(CP.money, false); }
      else { h += '<div class="cpc-note"><b>The money is not available.</b> ' + esc(CP.moneyErr || 'These listings\' spend and sales did not come back.') + '</div>'; }
    }
    if (CP.tab === 'archive') {
      if (CP.archive) { h += totalsTiles(CP.archive) + comparePanel(CP.archive) + moneyPanel(CP.archive, true); }
      else { h += '<div class="cpc-note"><b>The archive is not available.</b> ' + esc(CP.archiveErr || 'The stopped listings did not come back.') + '</div>'; }
    }
    h += '<div class="cpc-note">What you can change is the campaign\'s daily budget, as eBay gives no per-click bid. ' +
      'Nothing on this page is ever sent to eBay.</div>';
    box.innerHTML = h;

    var ths = box.querySelectorAll('[data-cpk]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-cpk');
      if (CP.sort.key === k) { CP.sort.dir = -CP.sort.dir; }
      else { CP.sort = { key: k, dir: (k === 'listing' || k === 'listing_date') ? 1 : -1 }; }
      draw();
    };
    var ss = box.querySelectorAll('[data-cps]');
    for (var j = 0; j < ss.length; j++) ss[j].onclick = function () {
      var k = this.getAttribute('data-cps');
      if (CP.splitSort.key === k) { CP.splitSort.dir = -CP.splitSort.dir; }
      else { CP.splitSort = { key: k, dir: (k === 'listing' || k === 'campaigns' || k === 'split_detail') ? 1 : -1 }; }
      draw();
    };
  }
})();
