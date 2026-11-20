/* view-adtool-product.js — Advertising Tool · Product history (spec §7, Phase 1).
 * Hidden from every sidebar (hidden:true) and routable only by hash while its preview flag
 * (portal_config.adtool_page_product) is on; the engine refuses the data otherwise. Galaxy tokens
 * only: gold is the only accent, #e0563f the only loss colour, headings bold. Charts are Apache
 * ECharts bundled at assets/echarts.min.js (loaded once, on first use — CSP allows 'self').
 *
 * THE ITEM TRAVELS IN THE HASH, AND NOWHERE ELSE (owner's Change Spec, 28 Oct 2026: "many tabs at
 * once, each with its own data, the cache never brings back the same item"). #adtoolProduct/<item
 * id> opens THAT listing; the bare #adtoolProduct opens empty, with the search box and the recently
 * advertised chips and nothing restored. This page used to keep the last item in localStorage, so a
 * second tab showed the first tab's listing and the bare page kept resurrecting whatever was last
 * opened. There is no storage read or write left in this file: delete one and the other comes back.
 *
 * No forecast anywhere: the spec removes sales forecasting from the whole portal, this page's
 * forecast band included. */
(function () {
  /* `pattern` is THE WINDOW THE READER CHOSE for the four pattern blocks (owner, 9 Nov: "I need time
     slots of all time; weekly profile of all time; hour x weekday of all time; need best dates of the
     month with proper dates, and date selection option of month and week"). All time is the default
     because that is what he asked for. It travels to the engine on every open and the engine's memo
     key carries it, so switching window is a normal request and not a page of its own. The window is
     deliberately NOT stashed anywhere: this page keeps nothing between tabs (see the note above). */
  var AT = { item: '', data: null, tab: 'week', dmode: 'day', pattern: { kind: 'all' }, echarts: null, charts: [] };
  /* 10 Nov (owner): pinned into Husnain's portal. A Team Lead may read one listing's history —
     spend, clicks, orders, units, the campaign events — with every earning stripped by the engine
     (it sets spend_only, and keys its own cache bucket so an Advertising Manager's answer, which
     may carry per-item profit, is never handed to him). The written narrative stays closed to the
     role: it is PROSE, and a figure inside a sentence is beyond the reach of a key-name strip. */
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'Team Lead'];
  function atSpendOnly() { return !!(AT && AT.data && AT.data.spend_only); }
  var GOLD = '#f2b035', GOLD2 = '#ffd27a', LOSS = '#e0563f', WHITE55 = 'rgba(255,255,255,.55)', NEUTRAL = 'rgba(255,255,255,.28)', GRID = 'rgba(255,255,255,.08)', ZERO = 'rgba(255,255,255,.35)', BAND = 'rgba(242,176,53,.16)', PAUSED = 'rgba(224,86,63,.16)';
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var SLOTS = ['Night 00–06', 'Morning 06–12', 'Afternoon 12–17', 'Evening 17–24'];

  VIEW_CSS.push(
    '.at-wrap{max-width:1240px}' +
    '.at-search{display:flex;gap:8px;align-items:center;margin:8px 0 14px;flex-wrap:wrap}' +
    '.at-search input{flex:1 1 320px;min-width:200px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}' +
    '.at-search input:focus{outline:2px solid var(--gold-b);outline-offset:1px}' +
    '.at-recent{display:flex;gap:6px;flex-wrap:wrap;margin:-6px 0 12px}' +
    '.at-chip{display:inline-flex;align-items:center;gap:7px;padding:3px 9px;border-radius:999px;border:1px solid var(--gold-line);background:var(--panel);font-size:11.5px;color:var(--text-2)}' +
    '.at-chip:hover{border-color:var(--gold-line-hi);color:var(--text)}' +
    '.at-chip a{color:inherit;text-decoration:none}.at-chip a:hover{color:var(--gold-a)}' +
    '.at-chip a[target]{color:var(--text-3);font-weight:800}' +
    '.at-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}' +
    '.at-panel h3{margin:0 0 4px;font-size:15px;font-weight:800}' +
    '.at-panel .at-sub{font-size:12px;color:var(--text-2);margin:0 0 10px}' +
    '.at-src{display:inline-block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:8px;vertical-align:middle;font-weight:800}' +
    '.at-src.s{color:var(--gold-a);border-color:rgba(242,176,53,.4)}' +
    /* an ad status is a READING: its date rides under it, and a reading a day or more old is
       written brighter so it cannot be skimmed as a present-tense fact */
    '.at-age{display:block;font-size:10px;color:var(--text-3);font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}' +
    '.at-age.old{color:var(--text-2)}' +
    '.at-clash{display:inline-block;margin-top:3px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(224,86,63,.55);color:' + LOSS + ';white-space:nowrap}' +
    '.at-clash-why{display:block;font-size:10px;color:' + LOSS + ';font-weight:600;line-height:1.5;margin-top:2px;white-space:normal}' +
    /* HOW MANY CAMPAIGNS ARE CHARGING FOR THIS LISTING (owner, 16 Nov). Gold for one, red for more
       than one, dashed for none, because more than one is the state that costs money twice. */
    '.at-dup{display:inline-block;margin-left:8px;padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap;vertical-align:middle}' +
    '.at-dup.ok{color:var(--gold-a);border-color:rgba(242,176,53,.5);background:rgba(242,176,53,.08)}' +
    '.at-dup.bad{background:' + LOSS + ';border-color:' + LOSS + ';color:#fff}' +
    '.at-dup.none{border-style:dashed;color:var(--text-3)}' +
    /* the campaigns this listing was in that are no longer on eBay: ONE dim line under the table,
       never rows beside the campaigns that are real */
    '.at-gone{font-size:11px;color:var(--text-3);line-height:1.6;margin-top:8px}.at-gone b{color:var(--text-2);font-weight:700}' +
    '.at-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px}' +
    '.at-kpi{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px}' +
    '.at-kpi .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.at-kpi .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.at-kpi .d{font-size:11.5px;color:var(--text-2);margin-top:2px}' +
    '.at-head{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}' +
    '.at-head .t{font-size:18px;font-weight:800;line-height:1.25;flex:1 1 420px}' +
    '.at-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
    '.at-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2)}' +
    '.at-tag.gold{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.at-tag.loss{color:#ffb3a6;border-color:rgba(224,86,63,.5)}' +
    '.at-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:900px){.at-grid2{grid-template-columns:1fr}}' +
    '.at-chart{width:100%;height:260px}.at-chart.tall{height:320px}.at-chart.short{height:200px}' +
    '.at-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}' +
    '.at-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);padding:6px 8px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.at-tbl td{padding:6px 8px;border-bottom:1px solid var(--gold-line)}.at-tbl td.r,.at-tbl th.r{text-align:right}' +
    '.at-pos{color:var(--gold-a)}.at-neg{color:#ffb3a6}' +
    '.at-tabs{display:flex;gap:6px;margin:0 0 8px}.at-tabs button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.at-tabs button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}' +
    '.at-heat{display:grid;grid-template-columns:70px repeat(24,1fr);gap:2px;font-size:10px}' +
    '.at-heat .c{height:16px;border-radius:3px;background:rgba(255,255,255,.05)}' +
    '.at-heat .lab{color:var(--text-3);line-height:16px}' +
    /* the window selector above the four pattern blocks. The chosen window is gold, exactly as the
       week/month tabs are, because it is the same kind of control. */
    '.at-wsel{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:2px 0 0}' +
    '.at-wsel button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}' +
    '.at-wsel button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}' +
    '.at-wsel label{font-size:11.5px;color:var(--text-2);display:inline-flex;align-items:center;gap:5px}' +
    '.at-wsel input{background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:8px;padding:4px 7px;font:inherit;font-size:12px}' +
    '.at-wsel .msg{font-size:11.5px;color:var(--text-3)}' +
    /* NOT KNOWN IS NOT NOUGHT. A figure the answer does not hold is written in words, so no reader can
       skim a blank window as a window in which nothing happened. */
    '.at-nk{color:var(--text-3);font-size:11px}' +
    '.at-dt-none{color:var(--text-3)}' +
    '.at-note{font-size:12.5px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:10px 12px}' +
    '.at-empty{color:var(--text-3);font-size:13px;padding:6px 0}' +
    '.at-actions textarea{width:100%;min-height:54px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;margin-top:8px}' +
    '.at-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:7px 12px;font:inherit;font-weight:800;cursor:pointer;margin-top:8px}' +
    '.at-btn:disabled{opacity:.5;cursor:default}' +
    '.at-list{list-style:none;padding:0;margin:8px 0 0}.at-list li{padding:6px 0;border-top:1px solid var(--gold-line);font-size:12.5px}.at-list li:first-child{border-top:0}.at-list .m{color:var(--text-3);font-size:11px}'
  );

  /* ONE money format across the four advertising view files: thousands separated, two decimals
     unless the caller asks for fewer. The same figure must not read £1,234 on one page and
     £1234.00 on the next. This function is byte-identical in view-adtool-morning.js,
     view-adtool-analytics.js and view-adtool-overview.js — change one and change all four.
     This page is per listing, so pence matter nearly everywhere here. */
  function gbp(v, d) {
    if (v == null || v === '' || isNaN(Number(v))) return '—';
    var n = Number(v), p = d == null ? 2 : Number(d);
    return (n < 0 ? '−£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: p, maximumFractionDigits: p });
  }
  function pm(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); var s = '£' + Math.abs(n).toFixed(d == null ? 2 : d); return n < 0 ? '−' + s : '+' + s; }
  function roas(v) { return v == null ? '—' : Number(v).toFixed(2) + '×'; }
  function cls(v) { return v == null ? '' : (Number(v) < 0 ? 'at-neg' : Number(v) > 0 ? 'at-pos' : ''); }
  function dfmt(d) { if (!d) return ''; var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return Number(d.slice(8, 10)) + ' ' + m[Number(d.slice(5, 7)) - 1]; }
  /* `t` is the LOOKUP key the register box matches on and must stay stable when the wording changes;
     `shown` is what the reader sees. Rewording arg 1 silently empties the box, so reword arg 2. */
  function src(t, shown, sampled) { return '<span class="at-src' + (sampled ? ' s' : '') + '" data-adtreg="' + esc(t) + '" title="how is this worked out">' + esc(shown || t) + '</span>'; }

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
    return '<span class="at-age' + (f.band === 'days' ? ' old' : '') + '">' +
      (prefix ? esc(prefix) + ' ' : '') + esc(f.words) + '</span>';
  }
  function adDupLine(o) {
    var n = adRecords(o);
    if (n == null || n < 2) return '';
    return '<span class="at-age old">eBay returned ' + n + ' ad records for this listing in this campaign.</span>';
  }
  /* THE CONTRADICTION, said plainly. An archived ad cannot be charged, so a row reading ARCHIVED on
     a listing the same campaign billed has one of the two wrong, and the money is the half to
     believe. `money` is a figure already in this payload, never a fresh request. */
  function adClash(status, money, when) {
    var v = Number(money);
    if (!adArchived(status) || money == null || money === '' || isNaN(v) || v <= 0) return '';
    return '<span class="at-clash" title="an archived ad cannot be charged, so one of the two is wrong">archived but spending</span>' +
      '<span class="at-clash-why">Charged ' + gbp(v) + ' in this campaign ' + esc(String(when || '')) + '. An archived ad cannot spend, so believe the money, not this status.</span>';
  }
  /* this page's status cell: the reading, the date it was taken, how many ad records eBay returned
     for it, and the contradiction when an archived ad was charged in the same campaign. `live` is
     left null on the snapshot table, which carries no live flag, so no row is coloured on a guess. */
  /* ── WHEN EBAY WAS ASKED ABOUT THIS LISTING (owner, 16 Nov 2026) ──────────────────────────────
     The engine asks eBay which campaigns hold this listing, and reads those campaigns' ad lists,
     BEFORE it composes the panel below. It sends a stamp when it asked and its own reason when it
     did not, so the panel says which of the two the table is and never implies the one it is not.
     Not a word of the reason is written here: it is the engine's, which is why a bound or a cap that
     changes changes this sentence with it. */
  function ebayReadSentence(D) {
    var E = D && D.ebay_read;
    if (!E || typeof E !== 'object') return '';
    if (E.asked) {
      var at = String(E.at || '').slice(11, 19);
      return ' <b>Read from eBay ' + (at ? esc(at) : 'just now') + '.</b>' + (E.note ? ' ' + esc(String(E.note)) : '');
    }
    return ' <b>Stored reading, eBay not asked: ' + esc(String(E.reason || 'no reason came back')) + '</b>';
  }
  /* ── HOW MANY CAMPAIGNS ARE CHARGING FOR THIS LISTING ─────────────────────────────────────────
     The verdict is the engine's one shared rule (adDupVerdict), the same one the Where page's
     Duplication section and the Peak rows take theirs from, so this chip and that section cannot
     disagree about one listing. A verdict the answer does not carry is said in words, never as a
     nought: nought campaigns and "we could not work it out" are not the same thing. */
  function dupChip(W) {
    var Dp = W && W.dup;
    if (!Dp || typeof Dp !== 'object' || Dp.n == null || isNaN(Number(Dp.n))) {
      return '<span class="at-dup none" title="this answer carries no campaign verdict for this listing">how many campaigns is not known</span>';
    }
    var n = Math.round(Number(Dp.n));
    return '<span class="at-dup ' + (Dp.duplicated ? 'bad' : n === 1 ? 'ok' : 'none') + '" title="' + esc(String(Dp.rule || '')) + '">' +
      (n === 0 ? 'in no campaign' : n === 1 ? 'in one campaign' : 'in ' + n + ' campaigns') + '</span>';
  }
  /* the campaigns this listing was in that have left eBay: one dim line under the table. They were
     printed as rows reading "exists (live)", which is how a campaign deleted in August came to be
     read as an ad that was running. The date is the day the portal established the campaign had
     gone, and where nothing recorded it the line says so rather than leaving a gap. */
  function goneLine(W) {
    var G = (W && W.gone) || [];
    if (!G.length) return '';
    return '<div class="at-gone">Was in: ' + G.map(function (g) {
      var at = String((g && g.gone_at) || '');
      return '<b>' + esc(String((g && g.name) || '')) + '</b> (no longer on eBay, ' +
        (at ? 'found gone ' + esc(dfmt(at)) : 'the date is not on record') + ')';
    }).join(' · ') + '. ' + (G.length === 1 ? 'That campaign is' : 'Those campaigns are') +
      ' not counted anywhere, because a campaign that is not on eBay cannot be charging for anything.</div>';
  }
  function adStateCell(c, state, live) {
    var f = adFresh(c), txt = String(state == null || state === '' ? 'unknown' : state);
    var money = null, when = '';
    if (Number(c.spend_yesterday) > 0) { money = c.spend_yesterday; when = 'yesterday'; }
    else if (Number(c.spend_7d) > 0) { money = c.spend_7d; when = 'over the last 7 days'; }
    return '<span class="at-tag ' + (live === true ? 'gold' : live === false ? 'loss' : '') + '">' + esc(txt) + (live === true ? ' · live' : '') + '</span>' +
      adAgeLine(f) + adDupLine(c) + adClash(txt, money, when);
  }

  /* Phase 4: week-to-week behaviour. The engine sends weeks_behaviour[] = {iso_week, label,
     descriptors, changed:[{descriptor, from, to, direction}], sentence}; the descriptor names are the
     ones from adtool_descriptors. A plain-English label per descriptor and a value formatter so the
     'what changed' cell reads as prose, not raw keys. */
  var DESC_LABEL = { weekday_ratio: 'Best day against worst', slot_hhi: 'Time-of-day concentration', concentration: 'Time-of-day concentration', slot_concentration: 'Time-of-day concentration', volatility: 'Day-to-day swing', cv28: 'Day-to-day swing', volatility_cv28: 'Day-to-day swing', ad_dependence28: 'Ad dependence', ad_dependence: 'Ad dependence', spend_elasticity: 'Extra units per £1', intermittency28: 'Days with no sale', level28: 'Units/day', slope28: 'Trend' };
  function descLabel(k) { return DESC_LABEL[k] || String(k).replace(/_?\d+$/, '').replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }
  function descVal(k, v) { if (v == null || v === '') return '—'; var n = Number(v); if (isNaN(n)) return String(v); if (/dependence|intermittency|share|_pct$/.test(k)) return Math.round(n * 100) + '%'; if (/elasticity/.test(k)) return n + ' per £1'; if (/slope/.test(k)) return (n > 0 ? '+' : '') + n + ' %/day'; if (/level/.test(k)) return n + '/day'; return String(Math.round(n * 100) / 100); }
  function trendTag(label) { var l = String(label || '').toLowerCase(); if (/improv|recover|rising|up/.test(l)) return '<span class="at-tag gold">' + esc(label || 'improving') + '</span>'; if (/declin|worse|falling|down|slowing/.test(l)) return '<span class="at-tag loss">' + esc(label || 'declining') + '</span>'; return '<span class="at-tag">' + esc(label || 'steady') + '</span>'; }

  function loadECharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    if (AT.loading) return AT.loading;
    AT.loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = 'assets/echarts.min.js'; s.async = true;
      s.onload = function () { resolve(window.echarts); }; s.onerror = function () { reject(new Error('The chart library did not load.')); };
      document.head.appendChild(s);
    });
    return AT.loading;
  }
  /* Every other graph in the portal shows its figures on the chart; these showed a shape and hid the
     number in a tooltip. ECharts drops any label that would collide with its neighbour, so a dense
     series thins itself instead of smearing — the same trick chartValueDots plays with minGap. */
  var PILL = { show: true, position: 'top', fontSize: 9, fontWeight: 800, color: '#1c1200',
    backgroundColor: GOLD, borderRadius: 7, padding: [2, 5, 1, 5] };
  var LAYOUT = { hideOverlap: true };
  function pillInt(o) { return o.value == null || o.value === 0 ? '' : Math.round(o.value); }
  function chartBase(extra) {
    return Object.assign({ backgroundColor: 'transparent', textStyle: { color: '#9aa4b1', fontFamily: 'Instrument Sans, system-ui, sans-serif' }, animation: false,
      grid: { left: 44, right: 14, top: 26, bottom: 28 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,6,10,.92)', borderColor: 'rgba(255,255,255,.14)', textStyle: { color: '#fff', fontSize: 12 } },
      xAxis: { type: 'category', axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 } } }, extra || {});
  }
  function mount(id, option) {
    var el = document.getElementById(id); if (!el || !window.echarts) return;
    var c = window.echarts.getInstanceByDom(el) || window.echarts.init(el, null, { renderer: 'canvas' });
    c.setOption(option, true); AT.charts.push(c);
  }

  VIEWS.adtoolProduct = {
    label: 'Product history', hidden: true, order: 95, roles: ROLES,
    icon: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/>',
    render: function () {
      return '<div class="at-wrap">' +
        adtHgroup('Product history', 'One listing\'s spend, sales and profit, day by day since our figures begin', 'atFresh') +
        /* data-nodraft: the shell's draft keeper holds unsaved typing and puts it back when a page
           re-opens. A search box is not unsaved work — without this, opening a bare #adtoolProduct
           refilled it with the last item number typed in any other tab and toasted "Restored 1
           unsaved field", which is exactly the carry-over between tabs this page was rewritten to
           end. */
        '<div class="at-search"><input id="atQ" type="search" data-nodraft placeholder="Item id or title, then press Enter" autocomplete="off"><button class="at-btn" id="atGo" style="margin-top:0">Open</button></div>' +
        '<div class="at-recent" id="atRecent"></div>' +
        '<div id="atBody"><div class="at-empty">Type an item id or part of a title. Recently advertised listings appear above.</div></div>' +
        '</div>';
    },
    init: function () {
      var q = $('atQ'), go = $('atGo');
      /* the item comes from the ROUTE and from nothing else. A bare #adtoolProduct starts empty,
         however many listings were opened before it, which is the owner's complaint fixed at the
         source: there is nothing left for the page to restore. */
      AT.item = ''; AT.data = null; AT.charts = [];
      var want = String((window.adtRoute ? adtRoute().param : '') || '').trim();
      if (/^\d{9,13}$/.test(want)) { AT.item = want; q.value = want; }
      go.onclick = function () {
        var v = q.value.trim();
        /* an item id is a navigation, so it goes through the hash: this tab keeps its own item and
           a reload or a copied link lands back on the same listing */
        if (/^\d{9,13}$/.test(v)) { open(v); } else { search(v); }
      };
      q.onkeydown = function (e) { if (e.key === 'Enter') go.onclick(); };
      api('adtoolSearch', { q: '' }).then(function (d) { recent(d.results || []); }).catch(function (e) { $('atRecent').innerHTML = '<span class="at-empty">' + esc(e.message || 'Search is not available.') + '</span>'; });
      if (AT.item) load(AT.item);
    }
  };

  /* open a listing IN THIS TAB by moving the hash; the shell's router renders the page again and
     init reads the new item off the route. Re-rendering by hand covers the case where the hash is
     already the one asked for. */
  function open(id) {
    id = String(id || '').trim();
    if (!/^\d{9,13}$/.test(id)) { toast('An item number is 9 to 13 digits.'); return; }
    var want = 'adtoolProduct/' + id;
    if (location.hash === '#' + want) { AT.item = id; load(id); } else { location.hash = want; }
  }

  /* the recently advertised chips: real links, so the title opens in this tab and the ↗ beside it
     opens a tab of its own — the same pair every listing row in the portal now carries */
  function recent(list) {
    $('atRecent').innerHTML = (list || []).map(function (r) {
      var id = String(r.item_id == null ? '' : r.item_id);
      if (!/^\d{9,13}$/.test(id)) return '';
      return '<span class="at-chip"><a href="#adtoolProduct/' + esc(id) + '" data-adt-open="' + esc(id) + '" title="' + esc(r.title || id) + '">' +
        esc(id) + ' · ' + esc(String(r.title || '').slice(0, 34)) + '</a>' +
        '<a href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener" title="open this listing\'s Product history in a new tab">↗</a></span>';
    }).join('');
  }
  function search(q) {
    if (!q) return;
    $('atBody').innerHTML = '<div class="at-empty">Searching…</div>';
    api('adtoolSearch', { q: q }).then(function (d) {
      var rows = d.results || [];
      if (!rows.length) { $('atBody').innerHTML = '<div class="at-empty">No listing matches “' + esc(q) + '”.</div>'; return; }
      $('atBody').innerHTML = '<div class="at-panel"><h3>Matches</h3><table class="at-tbl"><thead><tr><th>Listing</th><th class="r">Price</th><th>Last ad day</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + adtProductCell(r) + '</td><td class="r">' + gbp(r.price) + '</td><td>' + esc(r.last_ad_day || '—') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }).catch(function (e) { $('atBody').innerHTML = '<div class="at-empty">' + esc(e.message || 'The search could not run.') + '</div>'; });
  }

  /* 10 Nov (owner: every advertising figure up to date every five minutes). A quiet reload re-reads the
     same listing and redraws without blanking the page; the poller below asks for one every five
     minutes while the tab is visible, through the shell's adtPoll (hidden tabs skipped, stops on an
     expired sign-in). The engine's today grain is rebuilt every five minutes, so the Today so far row
     moves on that clock; finished days still move once an hour and the header says so. */
  function load(id, quiet) {
    AT.item = id;
    /* nothing is stored: the hash is the only record of which listing this tab is showing */
    if (!quiet) $('atBody').innerHTML = '<div class="at-empty">Loading ' + esc(id) + '…</div>';
    var t0 = Date.now();
    return Promise.all([api('adtoolListing', { item_id: id, pattern: AT.pattern }), loadECharts().catch(function () { return null; })]).then(function (res) {
      if (quiet && AT.item !== id) return;                  /* the reader moved to another listing meanwhile */
      AT.data = res[0]; AT.ms = Date.now() - t0;
      draw();
      if (!quiet) adtPoll('atBody', 300000, function () { return load(AT.item, true); });
    }).catch(function (e) { if (!quiet) $('atBody').innerHTML = '<div class="at-panel"><h3>Not available</h3><div class="at-sub">' + esc(e.message || 'This listing could not load.') + '</div></div>'; if (quiet) throw e; });
  }

  /* HOW LONG THE ANSWER TOOK TO WORK OUT, beside how long it took to arrive (2 Nov). The engine
     holds a listing's answer for a short while now, so these two numbers together say which kind of
     open this was: close together is a fresh working out, and an arrival far quicker than the
     working out is a stored answer handed straight back. Printed only where the engine sends it, so
     an engine that has not caught up simply leaves it out rather than showing a nought. */
  function workedOut(D) {
    var t = D && D.timings, ms = t ? Number(t.total_ms) : NaN;
    if (t == null || t.total_ms == null || isNaN(ms)) return '';
    return ' · worked out in ' + Math.round(ms) + ' ms';
  }

  function kpi(k, v, d, c) { return '<div class="at-kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (c || '') + '">' + v + '</div><div class="d">' + d + '</div></div>'; }
  /* the stage badge's hover, in words. It used to read "confidence 0.82 · 28-day slope 3.1 %/day ·
     level 1.4/day vs peak 2.1", which is notation, not a sentence a seller can act on. */
  /* THE PEAK-TIME LINE. On the list: its hours, who switches it (the system, or left to a person), whether
     the account's live-apply switch is on (otherwise the hours are written down only), and the next change
     under its schedule. Off the list: says so, with the day it was taken off if it ever was. Null = the
     peak tables could not be read, which is "not known", never "no". Links to the Peak page. */
  function peakLines(P) {
    var link = ' <a href="#adtoolPeak" style="color:var(--gold-a);font-weight:700">Peak time listings</a>';
    if (P == null) return '<div>Peak time: <b style="color:var(--text)">not known</b></div>';
    if (!P.on_list) {
      return '<div>Peak time: <b style="color:var(--text)">not on the list</b>' +
        (P.removed_at ? ' <span class="at-src">taken off ' + esc(String(P.removed_at).slice(0, 10)) + '</span>' : '') + link + '</div>';
    }
    var who = P.hold === 'on' ? 'held on by hand' : P.hold === 'off' ? 'held off by hand'
      : (Number(P.auto) ? 'the system switches it' : 'left to a person');
    var live = P.live_switch_on == null ? '' : (P.live_switch_on ? ' · live apply on' : ' · live apply off, written down only');
    var nx = P.next_switch;
    var next = nx && nx.at ? '<div class="at-src">next: ' + esc(nx.to === 'ON' ? 'on' : 'off') + ' at ' + esc(String(nx.at).slice(11, 16)) +
      (nx.day ? ' on ' + esc(String(nx.day).slice(5)) : '') + (nx.source ? ' · ' + esc(nx.source) : '') + '</div>' : '';
    return '<div>Peak time: <b style="color:var(--text)">on the list' + (P.hours ? ' · ' + esc(P.hours) + ' UK' : '') + '</b>' +
      ' <span class="at-src">' + esc(who) + esc(live) + '</span>' + link + next + '</div>';
  }
  function stageWhy(st) {
    var c = Number(st && st.confidence);
    var word = isNaN(c) ? 'we cannot say how sure we are' : (c >= 0.8 ? 'we are confident' : c >= 0.5 ? 'we are fairly confident' : 'we are not very confident');
    var lv = st && st.level28 != null ? Number(st.level28) : null, pk = st && st.peak_level != null ? Number(st.peak_level) : null;
    if (lv == null) return word + '.';
    return word + '. Selling ' + lv + ' a day' + (pk == null ? '' : ', against a best of ' + pk) + '.';
  }
  /* the weekday panel's note. It used to read "Shrunk rates (κ 4 days, prior: account, half-life 14
     days) next to the plain 30-day averages. Shuffle test: p = 0.03 → real weekday effect" — the
     conclusion is what a seller needs, and it has to stay true when the test says the opposite.
     9 Nov: the averages are now this window's own, so the sentence says that, and the smoothed
     all-history rate is only mentioned where the window is too thin to stand on its own. */
  function weekdayNote(D, WD) {
    var wk = D.profile && D.profile.weekday;
    var thin = !!(WD && WD.thin);
    var head = thin
      ? 'Each weekday\'s average over this window. Some weekdays have fewer than three dates in it, so the smoothed figure from all of this listing\'s history is shown beside each average.'
      : 'Each weekday\'s average over this window.';
    if (!wk || !wk.rates) return head;
    var p = wk.spread && wk.spread.p != null ? Number(wk.spread.p) : null;
    var verdict = p == null ? 'There are not enough days yet to say whether the weekday pattern is real.'
      : (p < 0.05 ? 'The weekday pattern here is real.' : 'There is no real weekday pattern here.');
    return head + ' ' + verdict;
  }

  /* ── THE WINDOW BEHIND THE FOUR PATTERN BLOCKS ────────────────────────────────────────────────
     The engine sends `patterns` = {window, slots, weekday, hour_weekday, dates}, every block summed
     over the window the reader chose and the window named in `window.label`. The engine and this file
     deploy separately, so an answer from an engine older than 9 Nov carries no `patterns` at all: the
     page then draws the FIXED windows that answer does carry and labels each block with the window it
     really is, rather than printing a chosen window it never computed. The selector is hidden in that
     case, because moving it would change nothing. */
  var PAT_LEGACY = { slots: 'last 28 days', weekday: 'last 30 days', hour_weekday: 'last 28 days', dates: 'every day we hold' };
  function patOf(D) {
    if (!D) return null;
    if (D.patterns && D.patterns.window) return D.patterns;
    return { legacy: true, window: { label: '', name: '', mode: 'average', days: 0, complete: true },
      slots: D.slots ? { rows: D.slots.map(function (s) { return { slot: s.slot, share: s.share, units: s.units, orders: s.orders, revenue: s.revenue, units_day: null, orders_day: s.orders_day, revenue_day: s.revenue_day, spend_day: null, sampled_days: 0 }; }), days: 28 } : null,
      weekday: { rows: D.weekday || [], thin: false, dates_min: 0, days: 30 },
      hour_weekday: D.heat ? { units: D.heat, orders: null, dates: null, days: 28 } : null,
      dates: { mode: 'average', rows: D.dom || [] } };
  }
  /* EVERY ONE OF THE FOUR HEADINGS PRINTS THIS, and none of them prints a typed window. */
  function patLabel(P, block) {
    if (!P) return 'not known';
    if (P.legacy) return PAT_LEGACY[block] || 'not known';
    return P.window && P.window.label ? P.window.label : 'not known';
  }
  var PAT_PRESETS = [['all', 'All time'], ['d28', 'Last 28 days'], ['this_month', 'This month'], ['last_month', 'Last month'], ['this_week', 'This week'], ['last_week', 'Last week']];
  function patBar(P) {
    var W = (P && P.window) || {};
    if (P && P.legacy) {
      return '<div class="at-panel"><h3>Patterns</h3><div class="at-sub">The four blocks below are each over the window named in its own heading. Choosing a window needs the newer engine, so the selector is not shown.</div></div>';
    }
    var k = String((AT.pattern && AT.pattern.kind) || 'all');
    var notes = [];
    if (!W.days) notes.push('There is no finished day in this window yet, so these blocks are empty rather than nought.');
    else if (!W.complete) notes.push('This window is still running, so it is worked out up to yesterday.');
    if (W.before_history) notes.push('Our own figures for this listing begin on ' + esc(dfmt(W.history_from)) + ', so a window that ends before then holds nothing.');
    if (W.first_day && String(W.kind) === 'all') notes.push('All time starts on ' + esc(dfmt(W.first_day)) + ', the first day we hold for this listing.');
    return '<div class="at-panel"><h3>Patterns · ' + esc(W.label || 'not known') + '</h3>' +
      '<div class="at-sub">Pick the window and all four blocks below follow it: the time slots, the weekday profile, the hour by weekday grid and the dates. Each heading says the window it covers. Weeks run Monday to Sunday, and the week picker takes any date and uses that date\'s week.</div>' +
      '<div class="at-wsel">' +
      PAT_PRESETS.map(function (x) { return '<button data-pat="' + x[0] + '" class="' + (k === x[0] ? 'on' : '') + '">' + esc(x[1]) + '</button>'; }).join('') +
      '<label>Month <input id="atPatM" type="month" placeholder="YYYY-MM" value="' + esc(W.month || '') + '" title="any month, from the first to the last of it"></label>' +
      '<label>Week <input id="atPatW" type="date" value="' + esc(W.week_start || '') + '" title="any date; the week it falls in is used, Monday to Sunday"></label>' +
      '<span class="msg" id="atPatMsg"></span></div>' +
      (notes.length ? '<div class="at-note" style="margin-top:8px">' + notes.join(' ') + '</div>' : '') + '</div>';
  }
  /* changing the window RE-ASKS THE ENGINE, because every one of the four blocks is summed there. The
     page it is already showing stays on screen while that happens: a window change is not a reason to
     wipe a page a reader is in the middle of. */
  function setPattern(pat) {
    if (!AT.item) return;
    AT.pattern = pat;
    var btns = document.querySelectorAll('.at-wsel button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-pat') === String(pat.kind));
    var msg = $('atPatMsg'); if (msg) msg.textContent = 'Working that window out…';
    var t0 = Date.now();
    api('adtoolListing', { item_id: AT.item, pattern: pat }).then(function (d) {
      AT.data = d; AT.ms = Date.now() - t0; draw();
    }).catch(function (e) {
      var m2 = $('atPatMsg'); if (m2) m2.textContent = e.message || 'That window could not be worked out.';
    });
  }
  /* a figure the answer does not hold is said in words, never drawn as a nought */
  /* a unit count: whole units, and eBay's attribution, so one order can be credited by more than one campaign */
  function cnt(v) { return String(Math.round(Number(v) || 0)); }
  function nk(v, f) { return (v == null || v === '' || (typeof v === 'number' && isNaN(v))) ? '<span class="at-nk">not known</span>' : f(v); }
  /* print a figure as it stands: `nk` needs a formatter, and a count or a rate is its own best form */
  function plain(v) { return String(v); }

  /* ---- the four blocks themselves. Each one prints the window it covers in its own heading. ---- */
  function slotsPanel(P) {
    var S = P && P.slots;
    var h = '<div class="at-panel"><h3>Time slots · ' + esc(patLabel(P, 'slots')) + src('orders') + src('sampled', 'our own readings', true) + '</h3>' +
      '<div class="at-sub">Each UK time slot\'s share of the units, and what it does on an average day in this window. Ad spend by slot is our own hourly readings, so it is divided by the days that hold one rather than by every day in the window.</div>';
    var money = !atSpendOnly();
    if (!S || !S.rows) return h + '<div class="at-empty">Not known: the hourly figures for this window could not be read.</div></div>';
    return h + '<table class="at-tbl"><thead><tr><th>Slot</th><th class="r">Share of units</th><th class="r">Units / day</th><th class="r">Orders / day</th>' + (money ? '<th class="r">Revenue / day</th>' : '') + '<th class="r">Ad spend / day</th></tr></thead><tbody>' +
      S.rows.map(function (s) {
        return '<tr><td>' + SLOTS[s.slot] + '</td>' +
          '<td class="r">' + nk(s.share, function (v) { return Math.round(v * 100) + '%'; }) + '</td>' +
          '<td class="r">' + nk(s.units_day, plain) + '</td>' +
          '<td class="r">' + nk(s.orders_day, plain) + '</td>' +
          (money ? '<td class="r">' + nk(s.revenue_day, gbp) + '</td>' : '') +
          '<td class="r">' + nk(s.spend_day, gbp) +
          (s.sampled_days ? '<div class="at-src" title="days in this window with an hourly reading in this slot">' + s.sampled_days + (s.sampled_days === 1 ? ' day read' : ' days read') + '</div>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function weekdayPanel(D, P) {
    var WD = P && P.weekday, rows = (WD && WD.rows) || [];
    var h = '<div class="at-panel"><h3>Weekday profile · ' + esc(patLabel(P, 'weekday')) + src('orders') + src('eBay ads report') + '</h3>' +
      '<div class="at-sub">' + weekdayNote(D, WD) + '</div><div id="atWd" class="at-chart short"></div>';
    if (!rows.length) return h + '<div class="at-empty">No finished day in this window yet.</div></div>';
    return h + '<table class="at-tbl"><thead><tr><th>Day</th><th class="r">Dates</th><th class="r">Units/day</th><th class="r">Units from ads/day</th><th class="r">Spend/day</th>' + (atSpendOnly() ? '' : '<th class="r">Profit/day</th>') + '</tr></thead><tbody>' +
      rows.map(function (x, i) {
        /* the smoothed all-history rate rides beside the average ONLY where this window is too thin
           to stand on its own: it is not this window's figure and must not read as if it were */
        var pr = (WD && WD.thin && D.profile && D.profile.weekday && D.profile.weekday.rates) ? D.profile.weekday.rates[i] : null;
        return '<tr><td>' + esc(x.day) + '</td><td class="r">' + (x.dates || 0) + '</td><td class="r">' + nk(x.units_day, plain) +
          (pr ? ' <span class="at-src" title="the smoothed average over all of this listing\'s history">' + (Math.round(pr.rate * 100) / 100) + '</span>' : '') + '</td>' +
          '<td class="r">' + nk(x.attr_units_day, plain) + '</td><td class="r">' + nk(x.spend_day, gbp) + '</td>' +
          (atSpendOnly() ? '' : '<td class="r">' + adtProfitCell(x.profit_day, x.pending_cost_orders, x.pending_fee_orders) + '</td>') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function heatPanel(P) {
    var HW = P && P.hour_weekday;
    var h = '<div class="at-panel"><h3>Hour × weekday · ' + esc(patLabel(P, 'hour_weekday')) + src('orders') + '</h3>' +
      '<div class="at-sub">Units per hour cell, black to gold. Sunday is the last row. The figure beside each day is how many of that weekday this window holds, so a bright cell on a single date cannot be read as a habit.</div>';
    if (!HW || !HW.units) return h + '<div class="at-empty">Not known: the hourly figures for this window could not be read.</div></div>';
    return h + heat(HW.units, HW.dates, HW.orders) + '</div>';
  }
  function datesPanel(P) {
    var DT = P && P.dates, rows = (DT && DT.rows) || [], cal = !!(DT && DT.mode === 'calendar');
    var h = '<div class="at-panel"><h3>' + (cal ? 'Every date in this window' : 'Best dates of the month') + ' · ' + esc(patLabel(P, 'dates')) + src('orders') + '</h3>' +
      '<div class="at-sub">' + (cal
        ? 'Every date of the month or week in order, with what that date did. A date we hold no day for is written as no day held, never as a nought.'
        : 'Average units per calendar date over this window, with the number of dates behind each average.') + '</div>' +
      '<div id="atDom" class="at-chart short"></div>';
    if (!cal) return h + '</div>';
    if (!rows.length) return h + '<div class="at-empty">No dates in this window.</div></div>';
    return h + '<div style="overflow-x:auto;max-height:430px;overflow-y:auto"><table class="at-tbl"><thead><tr><th>Date</th><th>Day</th><th class="r">Units</th><th class="r">Orders</th>' + (atSpendOnly() ? '' : '<th class="r">Revenue</th>') + '<th class="r">Ad spend</th>' + (atSpendOnly() ? '' : '<th class="r">Profit</th>') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        if (!r.held) return '<tr><td>' + esc(r.label || r.day) + '</td><td>' + esc(DOW[r.weekday] || '') + '</td><td colspan="' + (atSpendOnly() ? 3 : 5) + '" class="at-dt-none">' + (r.future ? 'not reached yet' : 'no day held') + '</td></tr>';
        return '<tr><td>' + esc(r.label || r.day) + '</td><td>' + esc(DOW[r.weekday] || '') + '</td><td class="r">' + (r.units || 0) + '</td><td class="r">' + (r.orders || 0) + '</td>' +
          (atSpendOnly() ? '' : '<td class="r">' + gbp(r.revenue) + '</td>') + '<td class="r">' + gbp(r.spend) + '</td>' +
          (atSpendOnly() ? '' : '<td class="r">' + adtProfitCell(r.actual_profit, r.pending_cost_orders, r.pending_fee_orders) + '</td>') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function draw() {
    var D = AT.data, H = D.header, K = D.kpis || {};
    /* two clocks on one page: today's orders and spend every five minutes, finished days every hour */
    var fs = $('atFresh');
    if (fs) fs.innerHTML = (D.fresh_today ? adtFreshTag(D.fresh_today) : '') + (D.fresh ? ' <span class="at-src" style="margin-left:6px">finished days: </span>' + adtFreshTag(D.fresh) : '');
    var h = '';
    /* header */
    h += '<div class="at-panel"><div class="at-head"><div style="flex:1 1 420px"><div style="font-size:15px">' + adtProductCell({ item_id: H.item_id, account: H.account, title: H.title, image: H.image }, { open: false }) + '</div>' +
      '<div class="at-meta"><span class="at-tag">' + esc(H.category || 'Unclassified') + (H.category_source === 'manual' ? ' · manual' : '') + '</span>' +
      (H.is_case ? '<span class="at-tag">' + esc(H.case_type) + '</span>' : '') + '<span class="at-tag">' + esc(H.status || '') + '</span>' +
      (D.profile && D.profile.stage ? '<span class="at-tag ' + (/Decline|Dormant|Dead/.test(D.profile.stage.stage) ? 'loss' : 'gold') + '" title="' + esc(stageWhy(D.profile.stage)) + '">Stage: ' + esc(D.profile.stage.label || D.profile.stage.stage) + ' · ' + Math.round(Number(D.profile.stage.confidence) * 100) + '% · day ' + esc(String(D.profile.stage.days_in_stage)) + '</span>' : '<span class="at-tag">Stage: not worked out yet</span>') + '</div></div>' +
      '<div style="flex:0 0 auto;min-width:230px;font-size:12.5px;color:var(--text-2);line-height:1.7">' +
      '<div>Price <b style="color:var(--text)">' + gbp(H.price) + '</b></div>' +
      (atSpendOnly() ? '' : '<div>Margin before ads <b style="color:var(--text)">' + gbp(H.margin) + '</b> <span class="at-src">' + esc(H.margin_source || '') + '</span></div>' +
      '<div>Break-even ROAS <b style="color:var(--text)">' + roas(H.breakeven_roas) + '</b></div>') +
      '<div>Listed ' + esc(H.start_time ? String(H.start_time).slice(0, 10) : '—') + (H.age_days != null ? ' · ' + H.age_days + ' days' : '') + '</div>' +
      '<div>First ad day ' + esc(H.first_ad_day || '—') + ' · last ' + esc(H.last_ad_day || '—') + '</div>' +
      /* Phase 5 sale-event fields — observed at one-day granularity; null → not known yet */
      '<div>Currently in Sale Event: <b style="color:var(--text)">' + (H.in_sale == null ? '—' : (H.in_sale ? 'YES' : 'NO')) + '</b></div>' +
      '<div>Eligible for Sale Event On <b style="color:var(--text)">' + esc(H.eligible_on ? String(H.eligible_on).slice(0, 10) : '—') + '</b></div>' +
      /* 9 Nov (owner): is this listing on the peak-time list, and what does that mean for it right now */
      peakLines(H.peak) + '</div></div></div>';
    /* The five periods print ONCE. This page used to show them as a tile strip and then AGAIN, lower
       down, as a "Profit & loss" table carrying the same measures over the same five periods. The table
       is the home: it holds orders, units and units-not-from-ads as well, so nothing was lost when the
       tiles went, and the old "Orders, all channels · 30d" tile is now the last-30-days row.
       `actual` is the engine's item-level profit key; `pending` / `pending_fee` count the orders it
       could not cost. */
    /* "All time" splices today's own figures in, so when there is a today row it carries the same
       part-day ad spend as "Today so far" while every other row stops at yesterday. Both rows are
       therefore tagged, or the all-time figure reads as settled when it is not. The start is the
       first day we actually hold for this listing, never a typed date. */
    var firstDay = (D.days && D.days.length && D.days[0] && D.days[0].day) ? dfmt(String(D.days[0].day)) : '';
    var w = [['Yesterday', K.yesterday || {}], ['Last 7 days', K.d7 || {}], ['Last 30 days', K.d30 || {}], ['All time' + (firstDay ? ' (from ' + firstDay + ')' : ''), K.all || {}]];
    if (K.today && typeof K.today === 'object') w.unshift(['Today so far', K.today]);
    var pcOf = function (s) { return Number(s.pending_cost_orders !== undefined ? s.pending_cost_orders : s.pending) || 0; };
    var pfOf = function (s) { return Number(s.pending_fee_orders !== undefined ? s.pending_fee_orders : s.pending_fee) || 0; };
    h += '<div class="at-panel"><h3>By period' + src('eBay ads report') + src('orders') + '</h3>' +
      '<div class="at-sub">' + (atSpendOnly() ? 'Today so far, yesterday, the last 7 and 30 days, and all time: what this listing spent on ads and what it sold. What it earned is not shown on this portal.' : 'Today so far, yesterday, the last 7 and 30 days, and all time. Profit after eBay fees, product cost, ad spend and returns, the same way the Sales Analysis sheet works it out. Orders we cannot cost yet are left out and counted separately.') + '</div>' +
      '<div style="overflow-x:auto"><table class="at-tbl"><thead><tr><th>Period</th><th class="r">Ad spend</th><th class="r">Units from ads</th>' + (atSpendOnly() ? '' : '<th class="r">ROAS</th>') + '<th class="r">Orders</th><th class="r">Units</th><th class="r">Units not from ads</th>' + (atSpendOnly() ? '' : '<th class="r">Profit</th>') + '</tr></thead><tbody>' +
      w.map(function (x) {
        var s = x[1], pc = pcOf(s), pf = pfOf(s);
        var notAds = Math.max(0, (Number(s.units) || 0) - (Number(s.attr_units) || 0));
        var moving = x[0] === 'Today so far' || !!s.includes_today;
        /* A WINDOW HOLDING A DAY EBAY'S REPORT HAS NOT LANDED FOR (owner, 11 Nov: the whole portal
           read yesterday as 0.00). There is no ad spend to print, no units from ads, no return on
           the spend and no profit, because the profit is worked out after the click fee and the
           click fee is the half that has not arrived. The engine says so in its own words, across
           the three ad columns and again in the profit column, and the orders and the units of that
           day are the order book's own and are printed exactly as ever. */
        if (s.ads_landing) {
          var lnote = String(s.landing_note || '');
          return '<tr><td>' + esc(x[0]) + (moving ? ' <span class="at-src s">still updating</span>' : '') + '</td>' +
            '<td class="r" colspan="' + (atSpendOnly() ? 2 : 3) + '"><span class="at-src">' + esc(lnote) + '</span></td>' +
            '<td class="r">' + (s.orders || 0) + '</td><td class="r">' + (s.units || 0) + '</td>' +
            '<td class="r"><span class="at-src">not known</span></td>' +
            (atSpendOnly() ? '' : '<td class="r"><span class="at-src">' + esc(lnote) + '</span></td>') + '</tr>';
        }
        return '<tr><td>' + esc(x[0]) + (moving ? ' <span class="at-src s">still updating</span>' : '') + '</td>' +
          '<td class="r">' + gbp(s.spend) + '</td><td class="r">' + (s.attr_units || 0) + '</td>' +
          (atSpendOnly() ? '' : '<td class="r">' + roas(s.roas != null ? s.roas : (Number(s.spend) > 0 && s.attr_revenue != null ? Number(s.attr_revenue) / Number(s.spend) : null)) + '</td>') +
          '<td class="r">' + (s.orders || 0) + '</td><td class="r">' + (s.units || 0) + '</td><td class="r">' + notAds + '</td>' +
          (atSpendOnly() ? '' : '<td class="r">' + adtProfitCell(s.actual_profit !== undefined ? s.actual_profit : s.actual, 0, 0) +
          (pc + pf > 0 ? '<div class="at-src" style="margin:2px 0 0" title="' + pc + ' without a cost, ' + pf + ' without fees">' + (pc + pf) + ' order' + (pc + pf === 1 ? '' : 's') + ' not costed yet</div>' : '') + '</td>') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
    /* where its ads sit — live rows when the campaign-truth phase has them, the refresh's snapshot otherwise */
    var Wr = D.where && D.where.rows ? D.where.rows : null; var C = D.campaigns || [];
    /* THE PANEL THAT STARTED ALL THIS. It was headed "right now" and tagged every 15 min while a
       status in it could be weeks old, so a listing read as ARCHIVED in three running campaigns
       while eBay was billing it. The title no longer says now, the tag no longer claims a cadence,
       and every row carries the date of its own reading. */
    var readNote = adPanelNote(Wr || C);
    /* 16 Nov: the gone rows are OUT OF THE TABLE and in one dim line under it, the panel header
       carries the campaign verdict and the eBay stamp, and the sub-line says in the engine's own
       words how many campaigns are charging and why. The table itself is the campaigns that exist. */
    var WrLive = Wr ? Wr.filter(function (c) { return !(c && c.gone); }) : null;
    h += '<div class="at-panel"><h3>Where its ads sit' + src('campaign map', 'ad status, read per campaign') + dupChip(D.where) + '</h3><div class="at-sub">Which campaigns this listing is in, and what its own ad said when that campaign\'s ads were last read. Each status is a reading, not a live check, so the date of the reading is on every row. Cost-per-sale ads have no per-ad status on eBay, so "exists" means running unless archived.' + ((D.where && D.where.dup && D.where.dup.why) ? ' <b>' + esc(String(D.where.dup.why)) + '</b>' : '') + ebayReadSentence(D) + (readNote ? ' ' + esc(readNote) : '') + (Wr && D.where.note ? ' ' + esc(D.where.note) + '.' : '') + '</div>' +
      /* 9 Nov (owner: "I need all time and 30 days campaign data too"). The four columns after the
         7-day pair are the same money over thirty days and over everything this listing has in that
         campaign, each with its window written in the header rather than left to be guessed. A
         campaign with no row in a window says so in words: £0.00 there would read as a month of free
         advertising instead of a month that campaign is not answerable for. */
      (WrLive ? (WrLive.length ? '<div style="overflow-x:auto"><table class="at-tbl"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>This ad, when last read</th><th class="r">Ad rate</th><th class="r">Daily budget</th><th class="r">Spend yesterday</th>' + (atSpendOnly() ? '' : '<th class="r">Sales yesterday</th>') + '<th class="r">Spend, last 7 days</th>' + (atSpendOnly() ? '' : '<th class="r">ROAS, last 7 days</th>') + '<th class="r">Units sold, last 7 days</th><th class="r">Spend, last 30 days</th>' + (atSpendOnly() ? '' : '<th class="r">ROAS, last 30 days</th>') + '<th class="r">Units sold, last 30 days</th><th class="r">Spend, all time</th>' + (atSpendOnly() ? '' : '<th class="r">ROAS, all time</th>') + '<th class="r">Units sold, all time</th><th>Last change</th></tr></thead><tbody>' +
        WrLive.map(function (c) { return '<tr><td>' + adtCampaignLink(c.campaign_id, c.name) + '</td><td>' + esc(c.funding === 'COST_PER_CLICK' ? 'CPC (Advanced)' : c.funding === 'COST_PER_SALE' ? 'Cost per sale' : c.funding || '?') + '</td><td>' + esc(c.campaign_status || '?') + '</td><td>' + adStateCell(c, c.ad_state, c.live) + '</td><td class="r">' + esc(c.ad_bid ? c.ad_bid + '%' : (c.campaign_bid ? c.campaign_bid + '% (campaign)' : '—')) + '</td><td class="r">' + (c.budget != null ? gbp(c.budget, 0) : '—') + '</td><td class="r">' + gbp(c.spend_yesterday) + '</td>' + (atSpendOnly() ? '' : '<td class="r">' + (c.units_yesterday == null ? '—' : c.units_yesterday + ' · ' + gbp(c.revenue_yesterday)) + '</td>') + '<td class="r">' + gbp(c.spend_7d) + '</td>' + (atSpendOnly() ? '' : '<td class="r">' + roas(c.roas_7d) + '</td>') + '<td class="r">' + nk(c.units_7d, cnt) + '</td><td class="r">' + nk(c.spend_30d, gbp) + '</td>' + (atSpendOnly() ? '' : '<td class="r">' + nk(c.roas_30d, roas) + '</td>') + '<td class="r">' + nk(c.units_30d, cnt) + '</td><td class="r">' + nk(c.spend_all, gbp) + (c.all_from ? '<div class="at-src" title="the first day this listing has a row in this campaign">from ' + esc(dfmt(String(c.all_from))) + '</div>' : '') + '</td>' + (atSpendOnly() ? '' : '<td class="r">' + nk(c.roas_all, roas) + '</td>') + '<td class="r">' + nk(c.units_all, cnt) + '</td><td>' + (c.last_change ? esc(String(c.last_change).replace('T', ' ').slice(0, 16)) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (D.where.history && D.where.history.length ? '<div class="at-sub" style="margin-top:8px">Status changes: ' + D.where.history.slice(0, 6).map(function (x) { return esc(String(x.seen_at).replace('T', ' ').slice(0, 16)) + ' ' + esc(x.name) + ' ' + esc(x.from_status || '—') + ' → ' + esc(x.to_status); }).join(' · ') + '</div>' : '') + goneLine(D.where) : '<div class="at-empty">Not in any campaign that is still on eBay.</div>' + goneLine(D.where)) :
      (C.length ? '<table class="at-tbl"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>Ad status, when last read</th><th class="r">Ad rate</th><th class="r">Daily budget</th></tr></thead><tbody>' +
        /* the snapshot rows come out of adtool_listings.campaigns_json, where the campaign id is
           stored as `id`. Reading campaign_id here handed adtCampaignLink undefined and every
           campaign name on this fallback table was an unclickable blank. It is only reached when
           the live read above fails, which is exactly when a reader most needs the names. */
        C.map(function (c) { var st = c.funding === 'COST_PER_SALE' ? (c.ad_status === 'ARCHIVED' ? 'archived' : 'exists (live)') : (c.ad_status || 'unknown'); return '<tr><td>' + adtCampaignLink(c.campaign_id || c.id, c.name) + '</td><td>' + esc(c.funding === 'COST_PER_CLICK' ? 'CPC (Advanced)' : c.funding === 'COST_PER_SALE' ? 'Cost per sale' : c.funding || '?') + '</td><td>' + esc(c.status || '?') + '</td><td>' + adStateCell(c, st, null) + '</td><td class="r">' + esc(c.bid ? c.bid + '%' : '—') + '</td><td class="r">' + (c.budget != null ? gbp(c.budget, 0) : '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="at-empty">Not in any campaign we know about.</div>')) + '</div>';
    /* yesterday hour by hour + all-time daily. "Yesterday's behaviour" had the 28-day time slots
       beside it; the slots are one of the four pattern blocks and have gone down to the window
       selector with the other three, so the 24-hour chart has the width to itself. */
    /* 20 Nov (owner: "totally rebuild these graphs"): three bars an hour and three bars a day — units
       sold green, the ad spend of that hour or day red, the average ad spend white. */
    h += '<div class="at-panel"><h3>Yesterday\'s behaviour' + src('orders') + src('sampled', 'our own readings', true) + '</h3><div class="at-sub">' + esc(D.hourly_note) + '. Units sold in each hour (green), the ad spend in that hour (red) and what that hour usually costs this listing (white' + (D.hour_avg_spend && D.hour_avg_spend.note ? ': ' + esc(D.hour_avg_spend.note) : '') + ').</div><div id="atHour" class="at-chart"></div></div>';
    /* 20 Nov (owner): "two options so the graph can be studied week-wise and month by month too" —
       the same three bars summed per ISO week or per month, the white bar then being the average
       ad spend per day held in that week or month */
    h += '<div class="at-panel"><h3>All-time daily' + src('orders') + src('eBay ads report') + '</h3><div class="at-sub">' + esc(window.ADT_DAILY ? window.ADT_DAILY.sub : '') + '</div>' +
      dailyTabsHtml(AT.dmode) +
      '<div id="atDaily" class="at-chart tall"></div></div>';
    /* week / month */
    h += '<div class="at-panel"><div class="at-tabs"><button class="' + (AT.tab === 'week' ? 'on' : '') + '" data-tab="week">Week to week</button><button class="' + (AT.tab === 'month' ? 'on' : '') + '" data-tab="month">Month to month</button></div><div id="atWM" class="at-chart short"></div></div>';
    /* ── THE FOUR PATTERN BLOCKS, OVER THE WINDOW THE READER CHOSE (owner, 9 Nov) ────────────────
       They used to be scattered down the page under three different fixed windows written into their
       headings: the slots and the grid over 28 days, the weekday profile over 30, the dates over
       everything held. They are one section now, under one selector, and each heading prints the
       window the engine actually summed it over. The "Profit & loss" panel that used to sit beside
       the dates block went long ago: the By period table at the top of the page is their one home. */
    var P = patOf(D);
    h += patBar(P);
    h += '<div class="at-grid2">' + slotsPanel(P) + weekdayPanel(D, P) + '</div>';
    h += heatPanel(P);
    h += datesPanel(P);
    /* notes, decision, actions */
    if (D.profile && D.profile.descriptors) { var ds = D.profile.descriptors; h += '<div class="at-panel"><h3>How this listing behaves' + src('profiles · ' + (ds.day || ''), 'listing patterns · ' + (ds.day || '')) + '</h3><div class="at-sub">Last 28 days unless stated.</div><div class="at-kpis">' + [['Weekday effect', esc(ds.weekday_best) + ' best · ' + esc(ds.weekday_worst) + ' worst', (ds.weekday_ratio != null ? 'best day is ' + ds.weekday_ratio + '× the worst · ' : '') + esc(ds.weekday_label || '')], ['Busiest time of day', SLOTS[ds.top_slot] || '—', Math.round((ds.top_slot_share || 0) * 100) + '% of its sales land there'], ['Day-to-day swing', ds.volatility_cv28 == null ? '—' : String(ds.volatility_cv28), 'no sale on ' + Math.round((ds.intermittency28 || 0) * 100) + '% of days. 0 is flat, above 1 is very uneven'], ['Ad dependence', ds.ad_dependence28 == null ? '—' : Math.round(ds.ad_dependence28 * 100) + '%', 'units from ads ÷ all units'], ['Extra units per £1 of spend', ds.spend_elasticity == null ? 'not enough spend levels' : String(ds.spend_elasticity), ds.elasticity_levels + ' spend level' + (ds.elasticity_levels === 1 ? '' : 's') + ' seen']].map(function (x) { return '<div class="at-kpi"><div class="k">' + x[0] + '</div><div class="v" style="font-size:15px">' + x[1] + '</div><div class="d">' + x[2] + '</div></div>'; }).join('') + '</div>' + (D.profile.regime && D.profile.regime.regime_change ? '<div class="at-note">Pattern changed: ' + esc(D.profile.regime.note) + '</div>' : '') + '</div>'; }
    /* Phase 4: week-to-week behaviour — the descriptors that moved week over week, with the reading
       and the recommended action (owner: "Make Behaviour Descriptors much larger and week-to-week:
       what changed, why, what to fix, what action, improving or declining"). */
    if (D.weeks_behaviour && D.weeks_behaviour.length) {
      h += '<div class="at-panel"><h3>Week-to-week behaviour' + src('week behaviour') + '</h3>' +
        '<div class="at-sub">Each week against the one before: what moved, the likely reason, and what to do. Improving weeks are gold, declining weeks are red.</div>' +
        '<table class="at-tbl"><thead><tr><th>Week</th><th>Trend</th><th>What changed</th><th>Reading &amp; action</th></tr></thead><tbody>' +
        D.weeks_behaviour.slice().reverse().map(function (wb) {
          var ch = (wb.changed || []).map(function (c) {
            var arrow = /up|\+|rise|increase/i.test(String(c.direction)) ? '▲' : /down|-|fall|decrease/i.test(String(c.direction)) ? '▼' : '→';
            return '<div>' + esc(descLabel(c.descriptor)) + ' <span class="at-src">' + descVal(c.descriptor, c.from) + ' ' + arrow + ' ' + descVal(c.descriptor, c.to) + '</span></div>';
          }).join('');
          return '<tr><td>' + esc(wb.iso_week || '') + '</td><td>' + trendTag(wb.label) + '</td><td>' + (ch || '<span class="at-empty">no real change</span>') + '</td><td>' + esc(wb.sentence || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    /* §7: pattern changes — the regime history, what moved and when. The rows come from adtool_regimes, the
       same detections A17 fires on, so the page and the alert can never tell different stories. */
    var rg = D.profile && D.profile.regime, rh = (D.profile && D.profile.regime_history) || [];
    h += '<div class="at-panel"><h3>Pattern changes' + src('regimes', 'pattern changes') + '</h3>'
      + '<div class="at-sub">' + (rg && rg.regime_change ? 'Today this listing\'s pattern has moved away from its own recent weeks.'
          : rg && rg.reason ? 'Nothing found today. ' + esc(rg.reason) + '.'
          : 'Nothing found today.') + '</div>'
      + (rh.length
          ? '<table class="at-tbl"><thead><tr><th>Detected</th><th>What</th><th>What moved</th></tr></thead><tbody>'
            + rh.map(function (r) { return '<tr><td>' + esc(r.detected_day) + '</td><td>' + esc(r.kind) + '</td><td>' + esc(r.note || '') + '</td></tr>'; }).join('')
            + '</tbody></table>'
          : '<div class="at-empty">No pattern change for this listing yet. We need enough orders on both sides of the comparison before we can tell.</div>')
      + '</div>';

    h += '<div class="at-grid2">' +
      '<div class="at-panel"><h3>Behaviour notes' + (D.narrative ? src('narrative', D.narrative.model === 'template' ? 'written from the numbers' : 'model, validated') : '') + '</h3><div class="at-note" id="atNarr">' + (D.narrative ? esc(D.narrative.text) + (D.narrative.validated ? '' : ' <b>(a figure in this text is not in the numbers behind it, so it is held back)</b>') : (atSpendOnly() ? 'Behaviour notes are written from this listing\u2019s earnings, so they are not shown on this portal.' : 'No notes yet. <a href="#" id="atNarrGo">Write some from the numbers</a>.')) + '</div>' +
      '<h3 style="margin-top:12px">Today\'s decision</h3><div class="at-note">' + (D.decision ? '<b>' + esc(D.decision.decision) + '</b> · ' + esc(D.decision.confidence) + ' · ' + esc(D.decision.action) + '<div class="at-sub" style="margin:4px 0 0">' + esc(D.decision.why) + '</div><div class="at-sub" style="margin:2px 0 0">' + esc(D.decision.day) + ' ' + esc(D.decision.batch) + ' batch · expected gain ' + pm(D.decision.expected_value) + (D.decision.outcome_score != null ? ' · scored ' + (D.decision.outcome_score ? 'right' : 'wrong') + (Number(D.decision.outcome_provisional) === 1 ? ' (not final: some orders are not costed yet, so it will be scored again)' : '') : '') + ' · a suggestion only, nothing sent to eBay</div>' : 'No suggestion for this listing yet.') + '</div></div>' +
      '<div class="at-panel at-actions"><h3>Action log</h3><div class="at-sub">What the team did with this listing, with dates. Notes only. Nothing here reaches eBay.</div>' +
      '<ul class="at-list" id="atActs">' + (D.actions.length ? D.actions.map(function (a) { return '<li>' + esc(a.note) + '<div class="m">' + esc(a.type) + ' · ' + esc(a.by_email) + ' · ' + esc(String(a.at).slice(0, 16)) + '</div></li>'; }).join('') : '<li class="at-empty">No actions logged yet.</li>') + '</ul>' +
      '<textarea id="atNote" placeholder="Add a note (what was changed, where, why)"></textarea><button class="at-btn" id="atNoteBtn">Log note</button></div></div>';
    h += '<div class="at-note" style="margin-top:4px">Computed ' + esc(String(D.computed_at).slice(11, 19)) + ' UTC · ' + esc(D.source) + ' · ' + D.sample_size + ' listing-days of data · answered in ' + AT.ms + ' ms' + workedOut(D) + '</div>';
    $('atBody').innerHTML = h;
    var dtabs = document.querySelectorAll('.at-dtabs button');
    for (var di = 0; di < dtabs.length; di++) dtabs[di].onclick = function () { AT.dmode = this.getAttribute('data-dmode') || 'day'; for (var dj = 0; dj < dtabs.length; dj++) dtabs[dj].classList.toggle('on', dtabs[dj] === this); drawDaily(); };
    var tabs = document.querySelectorAll('.at-tabs:not(.at-dtabs) button');
    for (var i = 0; i < tabs.length; i++) tabs[i].onclick = function () { AT.tab = this.getAttribute('data-tab'); for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('on', tabs[j] === this); drawWM(); };
    /* the window selector. The pickers fire on change, and a half-typed month or date is ignored
       rather than sent: the engine would refuse it and the refusal would land as an error toast on
       somebody who had not finished typing. */
    var wsel = document.querySelectorAll('.at-wsel button');
    for (var wi = 0; wi < wsel.length; wi++) wsel[wi].onclick = function () { setPattern({ kind: this.getAttribute('data-pat') }); };
    var patM = $('atPatM');
    if (patM) patM.onchange = function () { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(this.value)) setPattern({ kind: 'month', month: this.value }); };
    var pw = $('atPatW');
    if (pw) pw.onchange = function () { if (/^\d{4}-\d{2}-\d{2}$/.test(this.value)) setPattern({ kind: 'week', week_start: this.value }); };
    $('atNoteBtn').onclick = function () {
      var n = $('atNote').value.trim(); if (!n) return;
      this.disabled = true;
      /* the window travels with the note: the engine holds this page's answer per window now, so the
         entry THIS reader's own reload will read is the windowed one and it is the one to drop */
      api('adtoolActionLog', { item_id: AT.item, type: 'note', note: n, pattern: AT.pattern }).then(function () { toast('Logged'); load(AT.item); }).catch(function (e) { toast(e.message || 'failed'); $('atNoteBtn').disabled = false; });
    };
    var ng = $('atNarrGo'); if (ng) ng.onclick = function (e) { e.preventDefault(); $('atNarr').textContent = 'Writing…'; api('adtoolNarrative', { scope: 'listing', scope_id: AT.item }).then(function (r) { $('atNarr').innerHTML = esc(r.text) + (r.validated ? '' : ' <b>(a figure is not in the numbers behind it, so it is held back)</b>'); }).catch(function (x) { $('atNarr').textContent = x.message || 'failed'; }); };
    if (window.echarts) { drawHour(); drawDaily(); drawWM(); drawWd(); drawDom(); } else { var ids = ['atHour', 'atDaily', 'atWM', 'atWd', 'atDom']; ids.forEach(function (id) { var el = $(id); if (el) el.innerHTML = '<div class="at-empty">The chart library did not load, so this chart is missing.</div>'; }); }
  }

  /* The heat-map cell shade. BYTE-IDENTICAL with the copy in view-adtool-analytics.js: each view file is
     its own closure, so neither can see the other's, and the shared shell is not ours to add to.
     Change one and change the other. The grid wrappers differ on purpose — this one is 24 hours by
     7 weekdays, the one there is any rows by any columns. */
  function heatShade(v, mx) {
    var a = mx ? (Number(v) || 0) / mx : 0;
    return (Number(v) ? 'rgba(242,176,53,' + (0.15 + 0.85 * a).toFixed(2) + ')' : 'rgba(255,255,255,.05)');
  }
  /* `dates` is how many of each weekday the window holds and `orders` the orders grid beside the
     units one: both arrived with the chosen window (9 Nov) and both are optional, so a grid handed
     over on its own still draws exactly as it did. */
  function heat(grid, dates, orders) {
    var mx = 0; grid.forEach(function (r) { r.forEach(function (v) { mx = Math.max(mx, v); }); });
    var h = '<div class="at-heat"><div class="lab"></div>';
    for (var x = 0; x < 24; x++) h += '<div class="lab" style="text-align:center">' + (x % 3 === 0 ? x : '') + '</div>';
    grid.forEach(function (r, d) {
      var n = (dates && dates[d] != null && !isNaN(Number(dates[d]))) ? Number(dates[d]) : null;
      h += '<div class="lab">' + DOW[d] + (n == null ? '' : ' <span class="at-nk">' + n + '</span>') + '</div>';
      r.forEach(function (v, x) {
        var o = (orders && orders[d] && orders[d][x] != null) ? orders[d][x] : null;
        h += '<div class="c" title="' + DOW[d] + ' ' + x + ':00, ' + v + ' units' + (o == null ? '' : ', ' + o + ' orders') +
          (n == null ? '' : ', over ' + n + (n === 1 ? ' such date' : ' such dates')) + '" style="background:' + heatShade(v, mx) + '"></div>';
      });
    });
    return h + '</div>';
  }
  /* 20 Nov (owner): three bars an hour. Units sold on the left scale in green; the hour's own ad spend
     in red and what that hour usually costs (the engine's 28-day average) in white, both on the right
     £ scale. Every bar carries its figure. The pale "usual units" line and the cumulative spend line
     are gone. Owner, later the same day: "bar length covering words — evenly space them so details
     don't get hidden, and show the average number on the white box": both scales now stop well above
     the tallest bar so a pill never reaches the legend, the legend sits in its own strip above the
     plot, pills that would collide are shifted apart instead of hidden, and the white bars are
     labelled like the others. */
  var GREEN = '#2fb170', WHITEBAR = 'rgba(255,255,255,.72)';
  var BAR_LAYOUT = { moveOverlap: 'shiftY', hideOverlap: false };
  /* the two money pills stand UPRIGHT (rotated 90°): a "£10.92" pill is wider than the whole three-bar
     group, so flat pills could only overlap or hide; upright they are a dozen pixels wide and all
     three fit the group with room, each over its own bar, reading bottom to top */
  function moneyPill(bg, ink) { return Object.assign({}, PILL, { backgroundColor: bg, color: ink, fontSize: 8.5, padding: [1, 4, 1, 4], rotate: 90, align: 'left', verticalAlign: 'middle', distance: 5, formatter: function (o) { return o.value == null || !(Number(o.value) > 0) ? '' : '\u00a3' + Number(o.value).toFixed(2); } }); }
  var MONEY_PILL = moneyPill(LOSS, '#fff');
  var AVG_PILL = moneyPill('rgba(255,255,255,.88)', '#14110a');
  var UNIT_PILL = Object.assign({}, PILL, { backgroundColor: GREEN, color: '#fff', fontSize: 8.5, padding: [1, 4, 1, 4], formatter: pillInt });
  /* headroom: the scale runs to 1.45× the tallest bar (and to a whole unit on the units side), so three
     stacked pills fit above the tallest group without touching the legend strip */
  function unitsMax(arr) { var m = Math.max.apply(null, [0].concat(arr)); return Math.max(2, Math.ceil(m * 1.6)); }
  function moneyMax(arr) { var m = Math.max.apply(null, [0].concat(arr)); if (!(m > 0)) return 1; var t = m * 1.6, step = Math.pow(10, Math.floor(Math.log(t) / Math.LN10)); return Math.ceil(t / (step / 2)) * (step / 2); }
  var BAR_GRID = { left: 46, right: 54, top: 54, bottom: 28 };
  var BAR_LEGEND = { top: 0, right: 0, itemWidth: 14, itemHeight: 9, itemGap: 14, textStyle: { color: '#9aa4b1', fontSize: 11 } };
  function drawHour() {
    var D = AT.data; var days = D.days; var yday = days.length ? days[days.length - 1].day : '';
    var hrs = D.hours.filter(function (x) { return x.day === yday; });
    var ord = new Array(24).fill(0), sp = new Array(24).fill(0);
    hrs.forEach(function (x) { ord[x.hour] = x.units; var v = x.spend_r != null ? x.spend_r : x.spend_s; sp[x.hour] = v == null ? 0 : Math.round(Number(v) * 100) / 100; });
    var avg = (D.hour_avg_spend && D.hour_avg_spend.hours) ? D.hour_avg_spend.hours.map(function (v) { return v == null ? 0 : Math.round(Number(v) * 100) / 100; }) : new Array(24).fill(0);
    var series = [
      { name: 'Units sold', type: 'bar', data: ord, label: UNIT_PILL, labelLayout: BAR_LAYOUT, itemStyle: { color: GREEN, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 11, barGap: '20%', barCategoryGap: '40%' },
      { name: 'Ad spend in that hour', type: 'bar', yAxisIndex: 1, data: sp, label: MONEY_PILL, labelLayout: BAR_LAYOUT, itemStyle: { color: LOSS, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 11 },
      { name: 'Average ad spend for the hour', type: 'bar', yAxisIndex: 1, data: avg, label: AVG_PILL, labelLayout: BAR_LAYOUT, itemStyle: { color: WHITEBAR, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 11 }
    ];
    var y = [{ type: 'value', max: unitsMax(ord), splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 }, name: 'units', nameTextStyle: { color: '#66707c' }, minInterval: 1 },
      { type: 'value', max: moneyMax(sp.concat(avg)), splitLine: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, formatter: '\u00a3{value}' }, name: 'ad spend', nameTextStyle: { color: '#66707c' } }];
    mount('atHour', chartBase({ grid: BAR_GRID, xAxis: { type: 'category', data: Array.from({ length: 24 }, function (_, i) { return String(i).padStart(2, '0'); }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, yAxis: y, legend: BAR_LEGEND, series: series, title: { text: yday ? DOW[dowOf(yday)] + ' ' + dfmt(yday) : '', left: 0, top: 0, textStyle: { color: '#9aa4b1', fontSize: 11, fontWeight: 'normal' } } }));
  }
  function dowOf(ymd) { var d = new Date(ymd + 'T12:00:00Z'); return (d.getUTCDay() + 6) % 7; }
  /* 20 Nov (owner): three bars a day — units sold green (left scale), that day's ad spend red and the
     7-day average ad spend white (right £ scale). Owner, on an 80-day listing: "all numbers are
     overlapping one another — use the space above: average straight across for all first, then ad
     spend above that, and lastly units sold". So the figures leave the bars and sit in THREE ROWS
     across the top of the plot, one column per day, each row a straight line: the 7-day average
     nearest the bars (white), the day's spend above it (red), units sold on top (green). Each row is
     a category axis drawn at the top whose labels are the figures, so a column can never drift from
     its bars; money figures stand upright when the days are too narrow for them to lie flat. */
  /* Owner, 20 Nov: "ad spend should be shown the same way as the average number, upwards". Every
     upright row is anchored the same way: the figure starts on its row line and reads upward from
     there, same size and weight, so the red row and the white row are the one shape in two colours. */
  function rowAxis(x, vals, color, rotate, offset) {
    var lab = { interval: 0, rotate: rotate, color: color, fontSize: 9, fontWeight: 700, margin: 4, formatter: function (v, i) { return vals[i] == null ? '' : vals[i]; } };
    if (rotate) { lab.align = 'left'; lab.verticalAlign = 'middle'; }
    return { type: 'category', data: x, position: 'top', offset: offset, axisLine: { show: false }, axisTick: { show: false }, axisPointer: { show: false }, axisLabel: lab };
  }
  /* a round ceiling for a money axis: 1, 2, 2.5 or 5 × a power of ten, just above the value */
  function niceMoney(m) { if (!(m > 0)) return 1; var step = Math.pow(10, Math.floor(Math.log(m) / Math.LN10)); var c = [1, 2, 2.5, 5, 10]; for (var i = 0; i < c.length; i++) { if (c[i] * step >= m) return c[i] * step; } return 10 * step; }
  function rowName(text, color, top) { return { type: 'text', left: 4, top: top, style: { text: text, fill: color, fontSize: 9, fontWeight: 800, fontFamily: 'Instrument Sans, system-ui, sans-serif' } }; }
  function isoWeekKey(ymd) {
    var d = new Date(ymd + 'T12:00:00Z'); var dow = (d.getUTCDay() + 6) % 7;
    var th = new Date(d.getTime()); th.setUTCDate(d.getUTCDate() - dow + 3);
    var w1 = new Date(Date.UTC(th.getUTCFullYear(), 0, 4)); var w = 1 + Math.round(((th - w1) / 86400000 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7);
    var mon = new Date(d.getTime()); mon.setUTCDate(d.getUTCDate() - dow);
    return { key: th.getUTCFullYear() + '-W' + String(w).padStart(2, '0'), label: 'W' + String(w).padStart(2, '0') + ' \u00b7 ' + dfmt(mon.toISOString().slice(0, 10)) };
  }
  function monthKey(ymd) { var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return { key: ymd.slice(0, 7), label: m[Number(ymd.slice(5, 7)) - 1] + ' ' + ymd.slice(0, 4) }; }
  /* the rows the chart draws for the mode chosen: a day each, or every day held summed into its ISO
     week or its month; `held` is how many days the sum covers, which the average per day divides by */
  function addDays(ymd, n) { var d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dailyRows(days, mode) {
    if (mode !== 'week' && mode !== 'month') {
      var spendD = days.map(function (d) { return Math.round((Number(d.spend) || 0) * 100) / 100; });
      var dayRows = days.map(function (d, i) { var a = spendD.slice(Math.max(0, i - 6), i + 1); return { label: d.day.slice(5), tip: d.day, day: d.day, units: Number(d.units) || 0, spend: spendD[i], avg: Math.round(a.reduce(function (t, v) { return t + v; }, 0) / a.length * 100) / 100, held: 1 }; });
      if (mode !== 'lastweek' && mode !== 'week7') return dayRows;
      /* 20 Nov (owner): "add a last week option, and one week". LAST WEEK is the previous Monday-to-
         Sunday week; ONE WEEK is the last seven days up to the newest day held. Both are the day rows
         above cut to that window, so the 7-day average still looks back across the cut, and a date
         inside the window with no day held is drawn as a gap and says so, never as a nought. */
      var last = days.length ? days[days.length - 1].day : null; if (!last) return [];
      var from, to;
      if (mode === 'week7') { to = last; from = addDays(last, -6); }
      else { var ref = new Date(last + 'T12:00:00Z'); var dow = (ref.getUTCDay() + 6) % 7; var thisMon = addDays(last, -dow); from = addDays(thisMon, -7); to = addDays(thisMon, -1); }
      var by = {}; dayRows.forEach(function (r) { by[r.day] = r; });
      var out = [], DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (var d = from; d <= to; d = addDays(d, 1)) {
        var wd = DOWS[(new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7], lab = wd + ' ' + dfmt(d);
        var r = by[d];
        out.push(r ? { label: lab, tip: d, day: d, units: r.units, spend: r.spend, avg: r.avg, held: 1 } : { label: lab, tip: d + ' \u00b7 no day held', day: d, units: 0, spend: 0, avg: 0, held: 0 });
      }
      return out;
    }
    var out = [], by = {};
    days.forEach(function (d) {
      var k = mode === 'week' ? isoWeekKey(d.day) : monthKey(d.day);
      var g = by[k.key]; if (!g) { g = by[k.key] = { label: k.label, tip: k.key, units: 0, spend: 0, avg: 0, held: 0, first: d.day, last: d.day }; out.push(g); }
      g.units += Number(d.units) || 0; g.spend += Number(d.spend) || 0; g.held++; g.last = d.day;
    });
    out.forEach(function (g) { g.spend = Math.round(g.spend * 100) / 100; g.avg = g.held ? Math.round(g.spend / g.held * 100) / 100 : 0; g.tip = g.tip + ' \u00b7 ' + g.held + ' day' + (g.held === 1 ? '' : 's') + ' held (' + dfmt(g.first) + ' to ' + dfmt(g.last) + ')'; });
    return out;
  }
  /* THE ONE DRAWING (owner, 20 Nov: "this graph should be shown in the Ads command centre exactly how
     it is reflected in the Product history page, for this and all products"). drawDailyInto draws the
     chart into ANY element from a listing's day rows; this page calls it for its own panel and the
     command centre calls it for every red row's box, through window.ADT_DAILY. One function, so the
     two can never drift apart. */
  var DAILY_LIVE = [];   /* every chart drawn, so a window resize lays its rows again */
  function drawDailyInto(el, days, mode) {
    if (!el || !window.echarts) return;
    mode = mode || 'day';
    var rows = dailyRows(days || [], mode);
    var x = rows.map(function (r) { return r.label; });
    var units = rows.map(function (r) { return r.units; }), spend = rows.map(function (r) { return r.spend; }), avg = rows.map(function (r) { return r.avg; });
    var n = rows.length, upright = n > 22;
    var money = function (v) { return v > 0 ? '\u00a3' + v.toFixed(2) : ''; };
    /* an upright money figure is as tall as it is long: "£10.92" needs ~36px, "£134.35" ~44px */
    var longest = Math.max.apply(null, [0].concat(spend.concat(avg).map(function (v) { return money(v).length; })));
    var rowH = upright ? (longest >= 7 ? 46 : 36) : 16;
    var unitsRowH = 16, legendH = 26;
    var top = legendH + rowH * 2 + unitsRowH + 10;        /* legend strip + the three rows */
    el.style.height = (top + 230) + 'px';
    var byDay = mode !== 'week' && mode !== 'month';
    var spendName = mode === 'week' ? 'Ad spend that week' : mode === 'month' ? 'Ad spend that month' : 'Ad spend that day';
    var avgName = byDay ? '7-day average ad spend' : 'Average ad spend per day';
    var avgRow = byDay ? '7-day avg' : 'avg per day';
    var FONT = '700 9px Instrument Sans, system-ui, sans-serif';
    var inst = window.echarts.getInstanceByDom(el) || window.echarts.init(el, null, { renderer: 'canvas' });
    inst.setOption(chartBase({ grid: { left: 70, right: 54, top: top, bottom: 28 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,6,10,.92)', borderColor: 'rgba(255,255,255,.14)', textStyle: { color: '#fff', fontSize: 12 }, formatter: function (ps) { var i = ps && ps.length ? ps[0].dataIndex : 0, r = rows[i]; if (!r) return ''; if (!r.held) return r.tip; return r.tip + '<br>' + r.units + ' unit' + (r.units === 1 ? '' : 's') + ' sold<br>' + spendName.toLowerCase() + ' \u00a3' + r.spend.toFixed(2) + '<br>' + avgName.toLowerCase() + ' \u00a3' + r.avg.toFixed(2); } },
      xAxis: { type: 'category', data: x, axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, interval: n > 40 ? 'auto' : 0 } },
      /* round ceilings on both scales, so the top tick never prints on top of the one below it; no axis
         names on this chart, the three named rows sit exactly where the names would print */
      yAxis: [{ type: 'value', max: Math.max(2, Math.ceil(niceMoney(Math.max.apply(null, [0].concat(units)) * 1.08))), splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 }, minInterval: 1 }, { type: 'value', max: niceMoney(Math.max.apply(null, [0].concat(spend, avg)) * 1.08), splitLine: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, formatter: '\u00a3{value}' } }],
      legend: BAR_LEGEND,
      series: [
        { name: 'Units sold', type: 'bar', data: units, itemStyle: { color: GREEN, borderRadius: [3, 3, 0, 0] }, barMaxWidth: mode === 'day' ? 13 : 26, barGap: '20%', barCategoryGap: '40%' },
        { name: spendName, type: 'bar', yAxisIndex: 1, data: spend, itemStyle: { color: LOSS, borderRadius: [3, 3, 0, 0] }, barMaxWidth: mode === 'day' ? 13 : 26 },
        { name: avgName, type: 'bar', yAxisIndex: 1, data: avg, itemStyle: { color: WHITEBAR, borderRadius: [3, 3, 0, 0] }, barMaxWidth: mode === 'day' ? 13 : 26 }
      ] }), true);
    inst.resize();
    /* THE THREE ROWS, drawn by hand so the red row and the white row are built the one way: every
       figure starts on its row line, centred on its column, and reads upward from there when upright;
       the units row lies flat on top. The columns are asked from the chart itself, so they sit over
       the bars at any width. */
    var g = [rowName('units sold', GREEN, top - rowH * 2 - 4 - unitsRowH + 2), rowName('ad spend', LOSS, top - rowH - 4 - (upright ? rowH - 10 : rowH) + 2), rowName(avgRow, 'rgba(255,255,255,.85)', top - 4 - (upright ? rowH - 10 : rowH) + 2)];
    var yAvg = top - 4, ySpend = top - rowH - 4, yUnits = top - rowH * 2 - 4 - unitsRowH / 2 - 2;
    var fig = function (xp, y, text, fill) {
      if (!text) return;
      if (upright) g.push({ type: 'text', x: xp, y: y, rotation: Math.PI / 2, style: { text: text, fill: fill, font: FONT, align: 'left', verticalAlign: 'middle' }, silent: true });
      else g.push({ type: 'text', x: xp, y: y, style: { text: text, fill: fill, font: FONT, align: 'center', verticalAlign: 'bottom' }, silent: true });
    };
    for (var i = 0; i < n; i++) {
      var xp = inst.convertToPixel({ xAxisIndex: 0 }, i); if (xp == null || isNaN(xp)) continue;
      fig(xp, yAvg, money(avg[i]), 'rgba(255,255,255,.85)');
      fig(xp, ySpend, money(spend[i]), LOSS);
      if (units[i] > 0) g.push({ type: 'text', x: xp, y: yUnits, style: { text: String(units[i]), fill: GREEN, font: FONT, align: 'center', verticalAlign: 'middle' }, silent: true });
    }
    inst.setOption({ graphic: { elements: g } }, { replaceMerge: ['graphic'] });
    /* remembered for the resize pass; a chart whose element has gone is dropped then */
    DAILY_LIVE = DAILY_LIVE.filter(function (d) { return d.el !== el && document.body.contains(d.el); });
    DAILY_LIVE.push({ el: el, days: days, mode: mode });
    return inst;
  }
  (function () {
    var tmr = null;
    window.addEventListener('resize', function () {
      clearTimeout(tmr);
      tmr = setTimeout(function () { DAILY_LIVE.slice().forEach(function (d) { if (document.body.contains(d.el)) drawDailyInto(d.el, d.days, d.mode); }); }, 150);
    });
  })();
  /* the tab strip the chart is driven by, the same markup on both pages */
  function dailyTabsHtml(mode, extraClass) {
    return '<div class="at-tabs at-dtabs' + (extraClass ? ' ' + extraClass : '') + '">' + [['day', 'Day by day'], ['week7', 'One week'], ['lastweek', 'Last week'], ['week', 'Week by week'], ['month', 'Month by month']].map(function (t) { return '<button data-dmode="' + t[0] + '" class="' + ((mode || 'day') === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  }
  window.ADT_DAILY = { draw: drawDailyInto, tabs: dailyTabsHtml, rows: dailyRows, ensure: loadECharts,
    sub: 'Units sold (green), ad spend (red) and the average ad spend (white): day by day with a 7-day average \u2014 all days, the last seven (One week) or the previous Monday-to-Sunday week (Last week) \u2014 or summed by week or by month with the average per day.' };
  function drawDaily() { drawDailyInto(document.getElementById('atDaily'), AT.data.days, AT.dmode || 'day'); }
  /* 20 Nov (owner: "rather than a line showing profit, show it as a bar graph in green"): profit is the
     third bar of each week or month, green, on its own £ scale on the right, with the figure on the
     bar. A week that lost money is a bar below the line, drawn red so a loss never reads as a gain;
     a week with no costed profit yet draws no bar at all. */
  /* Owner, on seeing it: "what the hell is that half-built bar". A signed axis put £0 in the middle of the
     plot, so every profit bar hung from mid-height and a small profit was a sliver in the air. The bar
     now stands on the floor like the other two: its height is the SIZE of the profit, its colour says
     the sign (green made money, red lost it), and the pill carries the signed figure. */
  var PROFIT_PILL = Object.assign({}, PILL, { backgroundColor: 'rgba(47,177,112,.95)', color: '#fff', fontSize: 8.5, padding: [1, 4, 1, 4], formatter: function (o) { var v = Number(o.data && o.data.signed != null ? o.data.signed : o.value); if (isNaN(v)) return ''; return (v < 0 ? '\u2212\u00a3' : '\u00a3') + Math.abs(v).toFixed(2); } });
  var LOSS_PILL = Object.assign({}, PROFIT_PILL, { backgroundColor: LOSS });
  function drawWM() {
    var rows = AT.tab === 'week' ? AT.data.weeks : AT.data.months; var key = AT.tab === 'week' ? 'iso_week' : 'month';
    var units = rows.map(function (r) { return Number(r.units) || 0; }), ads = rows.map(function (r) { return Number(r.attr_units) || 0; });
    var profit = rows.map(function (r) { return r.actual_profit == null ? null : Math.round(Number(r.actual_profit) * 100) / 100; });
    var pAbs = profit.map(function (v) { return v == null ? 0 : Math.abs(v); }), pMax = moneyMax(pAbs);
    var pData = profit.map(function (v) { return v == null ? null : { value: Math.abs(v), signed: v, itemStyle: { color: v < 0 ? LOSS : GREEN, borderRadius: [3, 3, 0, 0] }, label: v < 0 ? LOSS_PILL : PROFIT_PILL }; });
    mount('atWM', chartBase({ grid: BAR_GRID, xAxis: { type: 'category', data: rows.map(function (r) { return r[key]; }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, legend: BAR_LEGEND,
      yAxis: [{ type: 'value', max: unitsMax(units), splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: '#66707c', fontSize: 10 }, name: 'units', nameTextStyle: { color: '#66707c' }, minInterval: 1 },
        { type: 'value', max: pMax, min: 0, splitLine: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, formatter: '\u00a3{value}' }, name: 'profit or loss', nameTextStyle: { color: '#66707c' } }],
      series: [
        { name: 'Units', type: 'bar', data: units, label: UNIT_PILL, labelLayout: BAR_LAYOUT, itemStyle: { color: GOLD, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 26, barGap: '20%', barCategoryGap: '40%' },
        { name: 'Units from ads', type: 'bar', data: ads, label: Object.assign({}, UNIT_PILL, { backgroundColor: 'rgba(255,255,255,.88)', color: '#14110a' }), labelLayout: BAR_LAYOUT, itemStyle: { color: WHITE55, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 26 },
        /* `color` on the series is what the legend swatch takes; with only a per-bar colour function the
           swatch fell back to the palette's blue */
        { name: 'Profit \u00a3 (red = loss)', type: 'bar', yAxisIndex: 1, data: pData, color: GREEN, label: PROFIT_PILL, labelLayout: BAR_LAYOUT, itemStyle: { color: GREEN, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 26 }
      ] }));
  }
  function drawWd() {
    var P = patOf(AT.data), wd = (P && P.weekday && P.weekday.rows) || [];
    if (!wd.length) return;
    mount('atWd', chartBase({ xAxis: { type: 'category', data: wd.map(function (x) { return x.day; }), axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10 } }, legend: { top: 0, right: 0, textStyle: { color: '#9aa4b1', fontSize: 11 } },
      series: [{ name: 'Units / day', type: 'bar', data: wd.map(function (x) { return x.units_day; }), itemStyle: { color: function (p) { return p.dataIndex === 6 ? GOLD2 : GOLD; }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 }, { name: 'Units from ads / day', type: 'bar', data: wd.map(function (x) { return x.attr_units_day; }), itemStyle: { color: GOLD2, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 }, { name: 'Ad spend / day £', type: 'bar', data: wd.map(function (x) { return x.spend_day == null ? null : Math.round(Number(x.spend_day) * 100) / 100; }), itemStyle: { color: WHITE55, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 }] }));
  }
  /* THE DATES BLOCK DRAWS WHAT THE WINDOW IS. A month or a week draws its REAL dates in order, with a
     gap where no day is held (never a nought bar, which would read as a day that sold nothing); all
     time and the last 28 days draw the average per calendar date, with the number of dates behind
     each bar in its hover. */
  function drawDom() {
    var P = patOf(AT.data), DT = P && P.dates, rows = (DT && DT.rows) || [];
    if (!rows.length) return;
    var cal = DT.mode === 'calendar';
    var xs = rows.map(function (r) { return cal ? String(r.label || r.day || '') : String(r.dom); });
    var data = rows.map(function (r) { return cal ? (r.held ? r.units : null) : r.units_day; });
    var tip = function (ps) {
      var a = (ps && ps.length) ? ps[0] : null; if (!a) return '';
      var r = rows[a.dataIndex] || {};
      if (cal) return esc(xs[a.dataIndex]) + '<br>' + (r.held ? ((r.units || 0) + ' units, ' + (r.orders || 0) + ' orders') : (r.future ? 'not reached yet' : 'no day held'));
      return 'Date ' + r.dom + '<br>' + (r.units_day == null ? 'no dates behind it' : r.units_day + ' units a day, from ' + r.dates + (r.dates === 1 ? ' date' : ' dates'));
    };
    mount('atDom', chartBase({ tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,6,10,.92)', borderColor: 'rgba(255,255,255,.14)', textStyle: { color: '#fff', fontSize: 12 }, formatter: tip },
      xAxis: { type: 'category', data: xs, axisLine: { lineStyle: { color: ZERO } }, axisTick: { show: false }, axisLabel: { color: '#66707c', fontSize: 10, interval: cal ? (xs.length > 16 ? 1 : 0) : 4, rotate: cal ? 45 : 0 } },
      series: [{ name: cal ? 'Units' : 'Units / day', type: 'bar', data: data, itemStyle: { color: function (p) { return (!cal && p.dataIndex >= 24) ? GOLD2 : GOLD; }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 14 }] }));
  }
})();
