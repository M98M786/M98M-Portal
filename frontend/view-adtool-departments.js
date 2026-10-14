/* view-adtool-departments.js — Advertising · Listing departments (owner's brief, 14 Oct 2026:
 * "New Listing / Average Listing / Scaling Listing / Top Listings / Declining Listings", with a
 * daily budget of three pounds an item and a weekly allowance of ten pounds for a new item).
 *
 * Every ACTIVE listing sits in exactly ONE of five departments, so the page prints the five counts
 * adding up to the active total: a split a reader cannot add up is a split nobody trusts.
 *
 * The page states the rule it has just applied. All eight numbers behind the ladder and the two
 * budget limits are owner-editable settings, echoed back by the action under `rules`, and every
 * sentence on this page is built from those live values. Nothing is typed here.
 *
 * No period bar: the action takes an account and nothing else. The windows are fixed by the rules
 * themselves (the last 30 days, the 30 before, the last 7 days of spend) and they end at yesterday,
 * because an ad figure for today has not arrived from eBay yet. The read repeats hourly so the page
 * catches the next daily roll-up without being reopened.
 *
 * No profit on this page: the departments are about units and budget. Per-item profit lives on
 * Product history. Nothing here is sent to eBay.
 * Galaxy tokens only, gold the accent, #e0563f the only loss colour.
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var DP = { account: '', dept: '', data: null };

  /* The ladder in the order the owner names it: New, Average, Scaling, Top, Declining. Each rule
     sentence is written as a person would say it out loud and is filled from the LIVE settings the
     action echoes back, so it can never drift from the rule the engine applied. When a setting is
     missing the action's own sentence is used instead; no number is ever typed in here. */
  var LADDER = [
    { key: 'new', name: 'New listing', short: 'New',
      rule: function (R) { return R.new_days == null ? '' : 'Live ' + cnt(R.new_days) + ' days or less.'; } },
    { key: 'average', name: 'Average listing', short: 'Average',
      /* the DEFAULT, and it has to be worded as one: it also takes a listing that has never sold, one
         that is growing but has not sold more than the scaling figure, and one whose start date we
         cannot establish. "Not moving enough to count as growing or falling" names only the band. */
      rule: function (R) { return R.new_days == null ? '' : 'Past its first ' + cnt(R.new_days) + ' days and none of the above. This is where a steady listing sits.'; } },
    { key: 'scaling', name: 'Scaling listing', short: 'Scaling',
      rule: function (R) { return R.scale_sold == null ? '' : 'More than ' + cnt(R.scale_sold) + ' sold since listed, and the last 30 days are up on the 30 before.'; } },
    { key: 'top', name: 'Top listing', short: 'Top',
      rule: function (R) { return R.top_30d == null ? '' : 'More than ' + cnt(R.top_30d) + ' sold in the last 30 days.'; } },
    { key: 'declining', name: 'Declining listing', short: 'Declining',
      rule: function () { return 'It has sold before, and the last 30 days are down on the 30 before.'; } }
  ];

  VIEW_CSS.push([
    '.dp-wrap{max-width:1360px}',
    '.dp-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:14px}',
    '.dp-panel h3{margin:0 0 3px;font-size:15px;font-weight:800;color:var(--text)}',
    '.dp-panel .dp-sub{font-size:12px;color:var(--text-2);margin:0 0 10px}',
    '.dp-panel h4{margin:0 0 6px;font-size:12.5px;font-weight:800;color:var(--text)}',
    '.dp-law{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 12px}@media(max-width:860px){.dp-law{grid-template-columns:1fr}}',
    '.dp-law .r{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel-2)}',
    '.dp-law .r .k{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}',
    '.dp-law .r .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--gold-a);margin-top:2px}',
    '.dp-law .r .d{font-size:12px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.dp-head{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:860px){.dp-head{grid-template-columns:1fr}}',
    '.dp-big{border:1px solid var(--gold-line);border-radius:12px;padding:11px 13px;background:var(--panel-2)}',
    '.dp-big .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.dp-big .v{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:2px;color:var(--text)}',
    '.dp-big.bad .v{color:' + LOSS + '}',
    '.dp-big .d{font-size:11.5px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.dp-depts{display:grid;grid-template-columns:repeat(auto-fit,minmax(248px,1fr));gap:10px}',
    '.dp-d{border:1px solid var(--gold-line);border-radius:12px;padding:11px 13px;background:var(--panel)}',
    '.dp-d .n{font-size:13.5px;font-weight:800;color:var(--text)}',
    '.dp-d .c{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--gold-a)}',
    '.dp-d .c .s{font-size:12px;font-weight:700;color:var(--text-3);margin-left:6px}',
    '.dp-d .q{font-size:11.5px;color:var(--text-2);margin:5px 0 8px;line-height:1.5;min-height:34px}',
    '.dp-figs{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;border-top:1px solid var(--gold-line);padding-top:8px}',
    '.dp-figs > div{display:flex;justify-content:space-between;gap:8px;font-size:11.5px}',
    '.dp-figs .k{color:var(--text-3);font-weight:700}',
    '.dp-figs .v{font-weight:800;font-variant-numeric:tabular-nums;color:var(--text)}',
    '.dp-figs .v.bad{color:' + LOSS + '}',
    '.dp-recon{margin-top:10px;font-size:12px;color:var(--text-2);background:var(--panel-2);border:1px solid var(--gold-line);border-radius:10px;padding:9px 12px;line-height:1.55;font-variant-numeric:tabular-nums}',
    '.dp-recon b{color:var(--text)}.dp-recon .off{color:' + LOSS + ';font-weight:800}',
    '.dp-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:980px){.dp-charts{grid-template-columns:1fr}}',
    '.dp-chart{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel)}',
    '.dp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:980px){.dp-grid2{grid-template-columns:1fr}}',
    '.dp-list{list-style:none;margin:0;padding:0}',
    '.dp-list li{padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
    '.dp-list li:last-child{border-bottom:0}',
    '.dp-list .m{font-size:11px;color:var(--text-2);margin-top:3px;font-variant-numeric:tabular-nums}',
    '.dp-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.dp-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.dp-tbl th.r{text-align:right}',
    '.dp-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.dp-tbl td.r{text-align:right;white-space:nowrap}',
    '.dp-tbl tfoot td{font-weight:800;border-top:1px solid var(--gold-line);border-bottom:0}',
    '.dp-scroll{overflow-x:auto}',
    '.dp-tag{display:inline-block;padding:1px 7px;border-radius:999px;border:1px solid var(--gold-line);font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--text-2);white-space:nowrap}',
    '.dp-tag.gold{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.dp-tag.bad{color:#ffb3a6;border-color:rgba(224,86,63,.5)}',
    '.dp-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}',
    '.dp-filters button{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}',
    '.dp-filters button.on{color:var(--gold-a);background:rgba(242,176,53,.12);border-color:var(--gold-b);font-weight:800}',
    '.dp-flab{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;align-self:center;margin-right:2px}',
    '.dp-neg{color:' + LOSS + ';font-weight:800}',
    '.dp-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;line-height:1.55}',
    '.dp-note b{color:var(--text)}',
    '.dp-honest{margin:0;padding:0;list-style:none;font-size:12.5px;color:var(--text-2);line-height:1.6}',
    '.dp-honest li{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
    '.dp-honest li:last-child{border-bottom:0}',
    '.dp-honest b{color:var(--text)}',
    '.dp-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    /* the action's own one-line reason for THIS listing's department, shown where it explains it */
    '.dp-why{display:block;font-size:11px;color:var(--text-3);margin-top:3px;max-width:290px;line-height:1.45;font-weight:600}'
  ].join(''));

  /* ── formatting ──────────────────────────────────────────────────────────────────────── */
  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function cntBig(v) { v = num(v); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function gbp(n) { var v = num(n); return v == null ? '—' : (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { var v = num(n); return v == null ? '—' : (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)).toLocaleString('en-GB'); }
  function pctTxt(v) { v = num(v); return v == null ? '—' : (Math.round(v * 10) / 10) + '%'; }
  function plural(n, one, many) { return Math.round(num(n) || 0) === 1 ? one : many; }
  /* a date as a person reads it: 11 Oct. Returns plain text, escaped at the point of use. */
  function dayTxt(d) {
    d = String(d == null ? '' : d).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { return d; }
    var dt = new Date(d + 'T12:00:00Z');
    if (isNaN(dt.getTime())) { return d; }
    try { return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return d; }
  }
  function rules() { var R = (DP.data && DP.data.rules) || {}; return typeof R === 'object' && R ? R : {}; }
  function totals() { var T = (DP.data && DP.data.totals) || {}; return typeof T === 'object' && T ? T : {}; }
  function coverage() { var C = (DP.data && DP.data.coverage) || {}; return typeof C === 'object' && C ? C : {}; }
  function deptRows() { var r = (DP.data && DP.data.depts) || []; return r.filter(function (d) { return d && typeof d === 'object'; }); }
  function itemRows() { var r = (DP.data && DP.data.items) || []; return r.filter(function (d) { return d && typeof d === 'object'; }); }
  function breaches(k) { var b = (DP.data && DP.data.breaches) || {}; var r = b && b[k]; return (r || []).filter(function (x) { return x && typeof x === 'object'; }); }

  /* the department's own name as the action gives it, so a renamed department follows */
  function deptName(key) {
    var rows = deptRows();
    for (var i = 0; i < rows.length; i++) { if (String(rows[i].key) === String(key) && rows[i].name) { return String(rows[i].name); } }
    for (var j = 0; j < LADDER.length; j++) { if (LADDER[j].key === key) { return LADDER[j].name; } }
    return key ? String(key) : '—';
  }
  function deptShort(key) {
    for (var j = 0; j < LADDER.length; j++) { if (LADDER[j].key === key) { return LADDER[j].short; } }
    return deptName(key);
  }
  /* The ACTION's own sentence first: it is the rule the engine actually applied, built from the same
     live settings. The page's sentence is the fallback for an older action that sends none, so the
     page can never state a rule the engine did not use. */
  function ruleText(row, step) {
    var theirs = row && row.rule_sentence ? String(row.rule_sentence) : '';
    if (theirs) { return theirs; }
    var mine = step && step.rule ? step.rule(rules()) : '';
    return mine || 'Rule not available.';
  }
  /* The order the ladder is actually tested in, taken from the order the action sends its departments
     in, so the sentence cannot drift from the code. The cards stay in the order the owner names them. */
  function testOrder() {
    var rows = deptRows(), names = [];
    rows.forEach(function (r) { if (r && r.key) { names.push(deptShort(r.key).toLowerCase()); } });
    return names;
  }
  /* the five rows in the owner's order, each paired with its ladder step */
  function ladderRows() {
    var rows = deptRows(), out = [], seen = {};
    LADDER.forEach(function (step) {
      var hit = null;
      for (var i = 0; i < rows.length; i++) { if (String(rows[i].key) === step.key) { hit = rows[i]; break; } }
      if (hit) { seen[step.key] = 1; }
      out.push({ step: step, row: hit || { key: step.key, name: step.name } });
    });
    /* a department the action adds later still appears, after the five the owner named */
    rows.forEach(function (r) { if (!seen[String(r.key)]) { out.push({ step: null, row: r }); } });
    return out;
  }
  /* share: the action's figure when it has one, else the count against the active total. Percent or
     fraction is decided by what the five of them add up to, so either shape prints correctly. */
  function shares() {
    var rows = ladderRows(), sum = 0, any = false, out = {};
    rows.forEach(function (x) { var v = num(x.row.share_pct); if (v != null) { any = true; sum += v; } });
    var asFraction = any && sum > 0 && sum <= 1.5;
    var active = num(totals().active);
    rows.forEach(function (x) {
      var v = num(x.row.share_pct);
      if (v != null) { out[x.row.key] = asFraction ? v * 100 : v; }
      else if (active) { out[x.row.key] = (num(x.row.listings) || 0) / active * 100; }
      else { out[x.row.key] = null; }
    });
    return out;
  }
  /* how many listings the action held back from `items` */
  function heldBack() {
    var D = DP.data || {}, shown = itemRows().length;
    var named = ['items_held_back', 'held_back', 'items_omitted', 'items_truncated', 'omitted'];
    for (var i = 0; i < named.length; i++) { var v = num(D[named[i]]); if (v != null) { return Math.max(0, Math.round(v)); } }
    var tot = num(D.items_total);
    if (tot == null) { tot = num(totals().active); }
    if (tot == null) { return null; }
    return Math.max(0, Math.round(tot) - shown);
  }
  /* a per-item breach flag: a count when the action sends one, a plain mark when it sends a flag */
  function overMark(v, label) {
    var n = num(v);
    if (n != null) { return n > 0 ? '<span class="dp-tag bad">' + esc(label) + (n > 1 ? ' ' + Math.round(n) : '') + '</span>' : ''; }
    return v ? '<span class="dp-tag bad">' + esc(label) + '</span>' : '';
  }
  /* an age the portal counted from when it first saw the listing, not from eBay's own start time */
  function clockMark(c) {
    if (!c || !/first\s*seen/i.test(String(c))) { return ''; }
    return ' <span class="dp-tag" title="eBay gave no start time for this listing, so its age counts from the day we first saw it">first seen</span>';
  }

  VIEWS.adtoolDepts = {
    label: 'Listing departments', hidden: true, order: 92, roles: ROLES,
    icon: '<path d="M3 20h4v-7H3z"/><path d="M10 20h4V4h-4z"/><path d="M17 20h4v-11h-4z"/>',
    render: function () {
      return '<div class="dp-wrap">' +
        adtHgroup('Listing departments', 'Which department each active listing sits in, and its ad spend over 7 days', 'dpFresh') +
        '<div id="dpAcct" class="dp-filters"></div>' +
        '<div id="dpBody"><div class="dp-empty">Loading…</div></div></div>';
    },
    init: function () {
      acctChips();
      load(false).catch(function () {});
      /* nothing moves until the next daily roll-up, so the re-read is hourly. adtPoll carries the
         hidden-tab guard and stops for good on an expired session. */
      adtPoll('dpBody', 3600000, function () { return load(true); });
    }
  };

  function accounts() {
    var D = DP.data || {};
    var names = (D.accounts || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (!names.length) {
      var seen = {};
      itemRows().forEach(function (r) { if (r.account && !seen[r.account]) { seen[r.account] = 1; names.push(String(r.account)); } });
      names.sort();
    }
    return names;
  }
  function acctChips() {
    var el = $('dpAcct'); if (!el) { return; }
    el.innerHTML = '<span class="dp-flab">Account</span>' +
      '<button class="' + (DP.account ? '' : 'on') + '" data-a="">All accounts</button>' +
      accounts().map(function (a) { return '<button class="' + (DP.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      bs[i].onclick = function () { DP.account = this.getAttribute('data-a'); acctChips(); load(false).catch(function () {}); };
    }
  }
  function load(quiet) {
    return api('adtoolDepts', DP.account ? { account: DP.account } : {}).then(function (D) {
      DP.data = D || {};
      if (!$('dpBody')) { return; }
      acctChips();
      draw();
      adtFreshShow('dpFresh', (DP.data && DP.data.fresh) || { at: DP.data && DP.data.computed_at });
    }).catch(function (e) {
      if (!quiet && $('dpBody')) {
        $('dpBody').innerHTML = '<div class="dp-panel"><h3>Not available</h3><div class="dp-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }

  function draw() {
    var D = DP.data;
    if (!D || typeof D !== 'object' || !deptRows().length) {
      $('dpBody').innerHTML = '<div class="dp-panel"><h3>Listing departments</h3><div class="dp-sub">No data for this period.</div></div>';
      return;
    }
    var h = lawPanel() + deptPanel() + chartPanel() + newPanel() + breachPanel() + tablePanel() + honestPanel();
    $('dpBody').innerHTML = h;
    wireFilters();
  }

  /* 1 ── the two limits, said plainly, then the two breach counts, because a breach is the thing
     somebody has to act on today. */
  function lawPanel() {
    var R = rules(), T = totals();
    var dayCap = num(R.day_cap), weekCap = num(R.new_week_cap), newDays = num(R.new_days);
    var daySent = dayCap == null ? 'The daily limit has not come through.' : 'Every item may spend up to ' + gbp(dayCap) + ' a day.';
    var weekSent = weekCap == null ? 'The weekly allowance has not come through.'
      : 'A listing in its first ' + (newDays == null ? 'days' : cnt(newDays) + ' days') + ' may spend up to ' + gbp(weekCap) + ' a week.';
    var overDay = num(T.over_day), overWeek = num(T.over_week);
    return '<div class="dp-panel"><h3>Budget limits</h3><div class="dp-sub">The two limits in force today.</div>' +
      '<div class="dp-law">' +
        '<div class="r"><div class="k">Every item, each day</div><div class="v">' + esc(dayCap == null ? '—' : gbp(dayCap)) + '</div><div class="d">' + esc(daySent) + '</div></div>' +
        '<div class="r"><div class="k">A new item, each week</div><div class="v">' + esc(weekCap == null ? '—' : gbp(weekCap)) + '</div><div class="d">' + esc(weekSent) + '</div></div>' +
      '</div>' +
      '<div class="dp-head">' +
        '<div class="dp-big' + (overDay > 0 ? ' bad' : '') + '"><div class="k">Over the daily limit</div><div class="v">' + cntBig(overDay) + '</div>' +
          '<div class="d">' + esc(overDay > 0 ? 'Items that spent more than the daily limit on at least one day.' : 'No item went over the daily limit.') + '</div></div>' +
        '<div class="dp-big' + (overWeek > 0 ? ' bad' : '') + '"><div class="k">Over the weekly allowance</div><div class="v">' + cntBig(overWeek) + '</div>' +
          '<div class="d">' + esc(overWeek > 0 ? 'New listings that spent more than the weekly allowance over the last 7 days.' : 'No new listing went over the weekly allowance.') + '</div></div>' +
      '</div></div>';
  }

  /* 2 ── the five departments, one block each, and the line that proves the split adds up. */
  function deptPanel() {
    var R = rules(), T = totals(), sh = shares(), rows = ladderRows();
    var cards = rows.map(function (x) {
      var r = x.row, over = num(r.over_day), overW = num(r.over_week);
      var figs = [
        ['Advertised', cnt(r.advertised), false],
        ['Ad spend, 7 days', gbp0(r.spend_7d), false],
        ['Sold, last 30 days', cnt(r.units_30d), false],
        ['Sold, 30 before', cnt(r.units_prev30), false],
        ['Over the daily limit', cnt(over), over > 0],
        ['Over the weekly allowance', cnt(overW), overW > 0],
        ['Never sold', cnt(r.never_sold), false]
      ];
      return '<div class="dp-d"><div class="n">' + esc(deptName(r.key)) + '</div>' +
        '<div class="c">' + cntBig(r.listings) + '<span class="s">' + esc(pctTxt(sh[r.key])) + ' of active</span></div>' +
        '<div class="q">' + esc(ruleText(r, x.step)) + '</div>' +
        '<div class="dp-figs">' + figs.map(function (f) {
          return '<div><span class="k">' + esc(f[0]) + '</span><span class="v' + (f[2] ? ' bad' : '') + '">' + f[1] + '</span></div>';
        }).join('') + '</div></div>';
    }).join('');

    /* The check is against the action's SEPARATE count of active listings (`active_counted`), not
       against the row count it derived the department figures from. Compared with that, the sum can
       only ever match, and "so every listing is counted once" would be claiming a check nobody ran. */
    var sum = 0, haveAll = true;
    rows.forEach(function (x) { var v = num(x.row.listings); if (v == null) { haveAll = false; } else { sum += v; } });
    var counted = num(T.active_counted), classified = num(T.active);
    var against = counted != null ? counted : null;
    var parts = rows.map(function (x) { return esc(deptShort(x.row.key)) + ' <b>' + cntBig(x.row.listings) + '</b>'; }).join(' + ');
    var recon = '<div class="dp-recon">' + parts + ' = <b>' + cntBig(sum) + '</b>';
    if (!haveAll) { recon += ' · <span class="off">one department has no count yet, so this does not add up</span>'; }
    else if (against == null) { recon += ' · ' + cntBig(classified) + ' ' + plural(classified, 'listing was', 'listings were') + ' sorted. We cannot check that against a count of the active listings here'; }
    else if (Math.round(sum) === Math.round(against)) { recon += ' · counted on its own there are <b>' + cntBig(against) + '</b> active ' + plural(against, 'listing', 'listings') + ', the same number, so every listing is counted once'; }
    else { recon += ' · <span class="off">counted on its own there are ' + cntBig(against) + ' active ' + plural(against, 'listing', 'listings') + ', a gap of ' + cntBig(Math.abs(against - sum)) + '</span>'; }
    recon += '</div>';

    var order = testOrder();
    var grow = num(R.grow_pct), fall = num(R.fall_pct), move = num(R.min_move);
    var band = (grow != null && move != null)
      ? 'Up means the last 30 days beat the 30 before by at least ' + cnt(grow) + '% and ' + cnt(move) + ' ' + plural(move, 'unit', 'units') + (fall != null ? '; down is the same the other way, by ' + cnt(fall) + '%' : '') + '. Without that test almost no listing would ever be average.'
      : 'Growing and falling are judged against the 30 days before. Without that test almost no listing would ever be average.';

    return '<div class="dp-panel"><h3>The five departments</h3>' +
      '<div class="dp-sub">How the active listings split, and what each department spends.</div>' +
      '<div class="dp-depts">' + cards + '</div>' + recon +
      '<div class="dp-note" style="margin-top:10px"><b>Reading the ladder.</b> Every listing lands in one department only.' +
        (order.length ? ' The cards are in the order the departments are named; the test runs in a different order, ' + esc(order.join(', then ')) + '.' : '') +
        ' ' + esc(band) + '</div></div>';
  }

  /* 3 ── two charts, and two only: how many listings, and what they spend. */
  function chartPanel() {
    var rows = ladderRows();
    var counts = rows.map(function (x) {
      return { label: deptShort(x.row.key), value: num(x.row.listings) || 0,
        title: deptName(x.row.key) + ': ' + cnt(x.row.listings) + ' ' + plural(x.row.listings, 'listing', 'listings') };
    });
    var spend = rows.map(function (x) {
      return { label: deptShort(x.row.key), value: num(x.row.spend_7d) || 0,
        title: deptName(x.row.key) + ': ' + gbp(x.row.spend_7d) + ' on ads over the last 7 days' };
    });
    return '<div class="dp-panel"><h3>Departments side by side</h3>' +
      '<div class="dp-sub">Listings in each department, and ad spend over the last 7 days.</div>' +
      '<div class="dp-charts">' +
        '<div class="dp-chart"><h4>Listings</h4>' +
          chartBars(counts, { height: 170, fmt: function (v) { return String(Math.round(v)); }, minGap: 0 }) + '</div>' +
        '<div class="dp-chart"><h4>Ad spend, last 7 days</h4>' +
          chartBars(spend, { height: 170, minGap: 0 }) + '</div>' +
      '</div></div>';
  }

  /* 4 ── the new-listing blocks: the week just gone, and the whole new window. */
  function newPanel() {
    var R = rules(), NW = (DP.data && DP.data.new_window) || {};
    var newDays = num(R.new_days);
    var pool = (NW.items || []).filter(function (r) { return r && typeof r === 'object'; });
    if (!pool.length) { pool = itemRows().filter(function (r) { return String(r.dept) === 'new'; }); }

    function block(field, maxDays, title) {
      var v = NW[field], list, count;
      if (Object.prototype.toString.call(v) === '[object Array]') {
        list = v.filter(function (r) { return r && typeof r === 'object'; });
        count = list.length;
      } else {
        count = num(v);
        list = maxDays == null ? pool.slice() : pool.filter(function (r) { var a = num(r.age_days); return a != null && a <= maxDays; });
        if (count == null) { count = list.length; }
      }
      list = list.slice().sort(function (a, b) { return (num(a.age_days) || 0) - (num(b.age_days) || 0); });
      var body = list.length
        ? '<ul class="dp-list">' + list.slice(0, 40).map(function (r) {
            return '<li>' + adtProductCell(r) +
              '<div class="m">' + esc(cnt(r.age_days)) + ' ' + plural(r.age_days, 'day', 'days') + ' live' + clockMark(r.clock) +
              ' · ' + esc(gbp(r.spend_7d)) + ' on ads over 7 days' +
              ' · ' + esc(cnt(r.sold_life)) + ' sold since listed' +
              (r.over_week ? ' ' + overMark(r.over_week, 'over the weekly allowance') : '') +
              (r.why ? '<span class="dp-why">' + esc(r.why) + '</span>' : '') + '</div></li>';
          }).join('') + '</ul>'
        : '<div class="dp-empty">None in this window.</div>';
      var shownNote = (count != null && list.length && count > list.slice(0, 40).length)
        ? '<div class="dp-sub" style="margin:6px 0 0">Showing ' + cntBig(Math.min(40, list.length)) + ' of ' + cntBig(count) + '.</div>' : '';
      return '<div class="dp-chart"><h4>' + esc(title) + ' <span class="dp-tag gold">' + cntBig(count) + '</span></h4>' + body + shownNote + '</div>';
    }

    return '<div class="dp-panel"><h3>New listings</h3>' +
      '<div class="dp-sub">Listings just gone live, and all of them still in the new window.</div>' +
      '<div class="dp-grid2">' +
        block('last_7_days', 7, 'New in the last 7 days') +
        block('first_14_days', newDays, newDays == null ? 'Inside the new window' : 'In its first ' + cnt(newDays) + ' days') +
      '</div></div>';
  }

  /* 5 ── the breach lists. What an item SPENT, and what its campaign budget is SET to: the owner's
     rule is a budget rule, so a budget set above the limit counts even before the money goes. */
  function breachPanel() {
    var R = rules(), T = totals();
    var dayCap = num(R.day_cap), weekCap = num(R.new_week_cap);
    var day = breaches('day'), week = breaches('week'), set = breaches('budget_set');

    /* `shown` and `total` must be the SAME grain. The day table holds one row per item per DAY and
       the action caps it; `totals.over_day` counts ITEMS. Comparing the two made "showing N of M"
       never print, and hundreds of breach days vanished with no trace. */
    function more(shown, total, unit) {
      var t = num(total);
      return (t != null && t > shown) ? '<div class="dp-sub" style="margin:6px 0 0">Showing the ' + cntBig(shown) + ' biggest of ' + cntBig(t) + ' ' + esc(unit) + '.</div>' : '';
    }
    function tag(k) { return k ? '<span class="dp-tag">' + esc(deptShort(k)) + '</span>' : ''; }

    var h = '<div class="dp-panel"><h3>Over the limits</h3>' +
      '<div class="dp-sub">Every item above a limit, with the day and the figure.</div>';

    var dayRows = num(DP.data && DP.data.breaches && DP.data.breaches.day_total);
    var overDayItems = num(T.over_day);
    h += '<h4 style="margin-top:4px">Days over the daily limit' + (dayCap == null ? '' : ' of ' + esc(gbp(dayCap))) + '</h4>';
    h += '<div class="dp-sub" style="margin:0 0 8px">One row is one listing on one day, so a listing over the limit on several days appears once for each.' +
      (overDayItems != null ? ' ' + cntBig(overDayItems) + ' ' + plural(overDayItems, 'listing is', 'listings are') + ' over on at least one day' + (dayRows != null ? ', on ' + cntBig(dayRows) + ' ' + plural(dayRows, 'day', 'days') + ' between them' : '') + '.' : '') + '</div>';
    h += day.length
      ? '<div class="dp-scroll"><table class="dp-tbl"><thead><tr><th>Listing</th><th>Department</th><th>Day</th><th class="r">Spent that day</th><th class="r">Limit</th><th class="r">Over by</th></tr></thead><tbody>' +
          day.map(function (r) {
            var c = num(r.cap) != null ? num(r.cap) : dayCap, s = num(r.spend);
            return '<tr><td>' + adtProductCell(r) + '</td><td>' + tag(r.dept) + '</td><td>' + esc(dayTxt(r.day)) + '</td>' +
              '<td class="r dp-neg">' + esc(gbp(s)) + '</td><td class="r">' + esc(gbp(c)) + '</td>' +
              '<td class="r dp-neg">' + esc(s != null && c != null ? gbp(s - c) : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>' + more(day.length, dayRows, 'days over the limit')
      : '<div class="dp-empty">No item went over the daily limit.</div>';

    h += '<h4 style="margin-top:14px">Over the weekly allowance' + (weekCap == null ? '' : ' of ' + esc(gbp(weekCap))) + '</h4>';
    h += week.length
      ? '<div class="dp-scroll"><table class="dp-tbl"><thead><tr><th>Listing</th><th>Department</th><th class="r">Spent, 7 days</th><th class="r">Allowance</th><th class="r">Over by</th></tr></thead><tbody>' +
          week.map(function (r) {
            var c = num(r.cap) != null ? num(r.cap) : weekCap, s = num(r.spend_7d);
            return '<tr><td>' + adtProductCell(r) + '</td><td>' + tag(r.dept) + '</td>' +
              '<td class="r dp-neg">' + esc(gbp(s)) + '</td><td class="r">' + esc(gbp(c)) + '</td>' +
              '<td class="r dp-neg">' + esc(s != null && c != null ? gbp(s - c) : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>' + more(week.length, num(DP.data && DP.data.breaches && DP.data.breaches.week_total) != null ? DP.data.breaches.week_total : T.over_week, 'new listings over the allowance')
      : '<div class="dp-empty">No new listing went over the weekly allowance.</div>';

    h += '<h4 style="margin-top:14px">Campaign daily budget above the limit</h4>';
    h += '<div class="dp-sub" style="margin:0 0 8px">A campaign budget is <b>one budget shared by every listing in that campaign</b>, not a figure per item. So the share column, not the budget, is the one to read against the limit.</div>';
    h += set.length
      ? '<div class="dp-scroll"><table class="dp-tbl"><thead><tr><th>Listing</th><th>Department</th><th>Campaign</th><th class="r">Listings sharing it</th><th class="r">Budget for the campaign</th><th class="r">Share per listing</th><th class="r">Limit per item</th></tr></thead><tbody>' +
          set.map(function (r) {
            var c = num(r.cap) != null ? num(r.cap) : dayCap;
            var n = num(r.campaign_listings), b = num(r.budget_set);
            var share = (b != null && n != null && n > 0) ? b / n : null;
            var overShare = share != null && c != null && share > c;
            return '<tr><td>' + adtProductCell(r) + '</td><td>' + tag(r.dept) + '</td><td>' + esc(r.campaign || '—') + '</td>' +
              '<td class="r">' + esc(cnt(n)) + '</td>' +
              '<td class="r">' + esc(gbp(b)) + '</td>' +
              '<td class="r' + (overShare ? ' dp-neg' : '') + '">' + esc(share == null ? '—' : gbp(share)) +
                (share != null && c != null && !overShare ? ' <span class="dp-tag">within</span>' : '') + '</td>' +
              '<td class="r">' + esc(gbp(c)) + '</td></tr>';
          }).join('') + '</tbody></table></div>' + more(set.length, num(DP.data && DP.data.breaches && DP.data.breaches.budget_set_total) != null ? DP.data.breaches.budget_set_total : T.over_budget_set, 'listings in a campaign over the limit')
      : '<div class="dp-empty">No campaign has a daily budget above the limit.</div>';

    h += '<div class="dp-note" style="margin-top:12px"><b>Two ways to break a limit.</b> An item can spend over it, and a campaign can be set to allow more than it. Both are listed. A campaign budget well above the limit is still worth seeing, even where the share per listing is inside it, because nothing stops one listing in that campaign taking the lot. Nothing on this page is sent to eBay.</div>';
    return h + '</div>';
  }

  /* 6 ── one row per listing. The department chips filter the table; the account chips at the top of
     the page re-read the whole page for that account, because the action holds some listings back
     and a single account then gets more of its own rows. */
  function tablePanel() {
    var rows = itemRows();
    var shown = rows.filter(function (r) { return !DP.dept || String(r.dept) === DP.dept; });
    var ladder = ladderRows();
    var chips = '<div class="dp-filters"><span class="dp-flab">Department</span>' +
      '<button class="' + (DP.dept ? '' : 'on') + '" data-d="">All</button>' +
      ladder.map(function (x) {
        return '<button class="' + (DP.dept === x.row.key ? 'on' : '') + '" data-d="' + esc(x.row.key) + '">' + esc(deptShort(x.row.key)) + '</button>';
      }).join('') + '</div>';

    var body;
    if (!shown.length) {
      body = '<div class="dp-empty">' + (rows.length ? 'No listing in this department.' : 'No listings to show for this account.') + '</div>';
    } else {
      var sumSpend = 0, sumAds = 0;
      shown.forEach(function (r) { sumSpend += num(r.spend_7d) || 0; if (r.advertised) { sumAds += 1; } });
      body = '<div class="dp-scroll"><table class="dp-tbl"><thead><tr>' +
        '<th>Listing</th><th>Department</th><th class="r">Days live</th><th class="r">Sold since listed</th>' +
        '<th class="r">Sold, last 30 days</th><th class="r">Sold, 30 before</th><th class="r">Ad spend, 7 days</th>' +
        '<th class="r">Yesterday</th><th class="r">Biggest day</th><th class="r">Budget set</th><th>Ads</th><th>Over the limit</th>' +
        '</tr></thead><tbody>' +
        shown.map(function (r) {
          var worst = num(r.worst_day);
          return '<tr><td>' + adtProductCell(r) + '</td>' +
            '<td><span class="dp-tag">' + esc(deptShort(r.dept)) + '</span>' + (r.why ? '<span class="dp-why">' + esc(r.why) + '</span>' : '') + '</td>' +
            '<td class="r">' + esc(cnt(r.age_days)) + clockMark(r.clock) + '</td>' +
            '<td class="r">' + esc(cnt(r.sold_life)) + '</td>' +
            '<td class="r">' + esc(cnt(r.units_30d)) + '</td>' +
            '<td class="r">' + esc(cnt(r.units_prev30)) + '</td>' +
            '<td class="r">' + esc(gbp(r.spend_7d)) + '</td>' +
            '<td class="r">' + esc(gbp(r.spend_yesterday)) + '</td>' +
            '<td class="r">' + (worst == null ? '—' : esc(gbp(worst)) + (r.worst_day_date ? ' <span class="dp-tag">' + esc(dayTxt(r.worst_day_date)) + '</span>' : '')) + '</td>' +
            '<td class="r">' + esc(gbp(r.budget_set)) + '</td>' +
            '<td>' + (r.advertised ? '<span class="dp-tag gold">on</span>' : '<span class="dp-tag">off</span>') + '</td>' +
            '<td>' + (overMark(r.over_day, 'day') + ' ' + overMark(r.over_week, 'week')).trim() + '</td></tr>';
        }).join('') + '</tbody>' +
        '<tfoot><tr><td>' + cntBig(shown.length) + ' ' + plural(shown.length, 'listing', 'listings') + ' in this table</td><td></td><td class="r"></td><td class="r"></td>' +
        '<td class="r"></td><td class="r"></td><td class="r">' + esc(gbp0(sumSpend)) + '</td><td class="r"></td><td class="r"></td><td class="r"></td>' +
        '<td>' + cntBig(sumAds) + ' on</td><td></td></tr></tfoot></table></div>';
    }

    var card = null;
    if (DP.dept) { ladder.forEach(function (x) { if (String(x.row.key) === DP.dept) { card = x.row; } }); }
    var held = card ? num(card.listings) : null;
    var deptNote = (held != null && Math.round(held) > shown.length)
      ? '<div class="dp-sub" style="margin:6px 0 0">The last row adds up the ' + cntBig(shown.length) + ' ' + plural(shown.length, 'row', 'rows') + ' above, not the whole department: ' +
        esc(deptName(DP.dept)) + ' holds ' + cntBig(held) + ' ' + plural(held, 'listing', 'listings') + '. Pick one account to see more of its own rows.</div>'
      : '';
    return '<div class="dp-panel"><h3>Listings by department</h3>' +
      '<div class="dp-sub">One row per listing, with its units, its ad spend and why it sits where it does.</div>' + chips + body + deptNote +
      '<div class="dp-note" style="margin-top:10px"><b>Sold since listed</b> is eBay\'s own count, or our order count where that is higher. ' +
      'Profit is not shown here. It lives on Product history, item by item.</div></div>';
  }

  /* 7 ── the honesty lines: where a figure came from somewhere else, and what is not on the page. */
  function honestPanel() {
    var C = coverage(), T = totals(), lines = [];

    var src = String(C.prev_window_source || '').toLowerCase();
    var win = (C.prev_window_from && C.prev_window_to) ? dayTxt(C.prev_window_from) + ' to ' + dayTxt(C.prev_window_to) : '';
    /* The action distinguishes four states (daily figures, order records, order records that do not
       reach back over the whole window, and nothing at all) and writes the sentence for the one it
       used. Testing the source name here cannot tell the last three apart, so the note is printed as
       it was written and only the window dates and the day-figure start are added around it. */
    var note = C.prev_window_note ? String(C.prev_window_note) : '';
    if (note) {
      lines.push('<b>The earlier 30 days</b>' + (win ? ' (' + esc(win) + ')' : '') + '. ' + esc(note) +
        (/order/.test(src) && C.day_grain_starts ? ' Our daily figures start on ' + esc(dayTxt(C.day_grain_starts)) + '.' : ''));
    } else if (src) {
      lines.push('<b>The earlier 30 days</b>' + (win ? ' (' + esc(win) + ')' : '') + ' come from ' + esc(src) + '.');
    }

    var AC = C.age_clock || {}, eb = num(AC.ebay), fs = num(AC.first_seen);
    if (fs != null && fs > 0) {
      lines.push('<b>Age</b> comes from eBay\'s start time' + (eb != null ? ' for ' + cntBig(eb) + ' ' + plural(eb, 'listing', 'listings') : '') +
        '. For ' + cntBig(fs) + ' eBay gave none, so the age counts from the day we first saw the listing. Those rows carry a <span class="dp-tag">first seen</span> mark.');
    } else if (eb != null) {
      lines.push('<b>Age</b> comes from eBay\'s own start time for every listing here.');
    }

    var held = heldBack(), shownRows = itemRows().length;
    if (held != null && held > 0) {
      lines.push('<b>The listing table holds ' + cntBig(shownRows) + ' ' + plural(shownRows, 'listing', 'listings') + '.</b> ' +
        cntBig(held) + ' more ' + plural(held, 'is', 'are') + ' counted in the departments above but not listed row by row. ' +
        'Pick one account to see more of its own rows.');
    }

    var yest = num(T.spend_yesterday);
    if (yest != null) {
      lines.push('<b>Ad spend</b> is counted up to yesterday' + (DP.data && DP.data.today ? ', ' + esc(dayTxt(DP.data.today)) + ' being today' : '') +
        '. Yesterday came to ' + esc(gbp0(yest)) + '. Today\'s figures arrive from eBay tomorrow.');
    }

    if (!lines.length) { return ''; }
    return '<div class="dp-panel"><h3>Gaps in the figures</h3>' +
      '<div class="dp-sub">Where a number came from somewhere else, and what is not shown.</div>' +
      '<ul class="dp-honest"><li>' + lines.join('</li><li>') + '</li></ul></div>';
  }

  function wireFilters() {
    var bs = document.querySelectorAll('#dpBody [data-d]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].onclick = function () { DP.dept = this.getAttribute('data-d'); draw(); };
    }
  }
})();
