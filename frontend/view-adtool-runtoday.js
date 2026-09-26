/* view-adtool-runtoday.js — Advertising Tool · Running today (owner's brief, 27 Sep 2026: "what should be
 * running today, and what should be stopped, on the basis of the previous history, today's ad wastage and
 * today's performance, showing proper reasoning"). Hidden; flag adtool_page_runtoday. One row per advertised
 * listing from adtoolRunToday: the verdict (run / stop / watch), the sentence that explains it from the last
 * four same weekdays, last week's same day, today so far from the 5-minute grain, the hours to run and to
 * avoid, the best historical week, the morning batch's decision if any, the lever a hand can move and whose
 * hand. The period is today, fixed; the page refreshes every 5 minutes while it is open. Nothing here is
 * sent to eBay. Galaxy tokens only; gold the accent, #e0563f the loss colour. */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var RT = { account: '', filter: '', data: null };

  VIEW_CSS.push(
    '.rt-wrap{max-width:1320px}' +
    '.rt-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}' +
    '.rt-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}' +
    '.rt-c{background:var(--panel);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;cursor:pointer}' +
    '.rt-c.on{border-color:var(--gold-b);background:rgba(242,176,53,.1)}' +
    '.rt-c .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.rt-c .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.rt-c.run .v{color:var(--gold-a)}.rt-c.stop .v{color:' + LOSS + '}.rt-c.watch .v{color:var(--text-2)}' +
    '.rt-c .d{font-size:11.5px;color:var(--text-2);margin-top:2px}' +
    '.rt-note{font-size:12px;color:var(--text-2);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-bottom:12px;line-height:1.5}' +
    '.rt-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}' +
    '.rt-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.rt-tbl td{padding:9px 8px;border-bottom:1px solid var(--gold-line);vertical-align:top;color:var(--text)}' +
    '.rt-tbl tr.stop td:first-child{box-shadow:inset 3px 0 0 ' + LOSS + '}.rt-tbl tr.run td:first-child{box-shadow:inset 3px 0 0 var(--gold-b)}' +
    '.rt-why{max-width:360px;min-width:240px;line-height:1.5}.rt-why .s{color:var(--text)}.rt-why .m{font-size:11px;color:var(--text-2);margin-top:4px}' +
    '.rt-num{white-space:nowrap;line-height:1.55}.rt-num .l{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;font-weight:800}' +
    '.rt-sm{font-size:11px;color:var(--text-2);line-height:1.45}.rt-sm b{color:var(--text)}' +
    '.rt-dec{display:inline-block;padding:1px 7px;border-radius:6px;border:1px solid var(--gold-line);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-2)}' +
    '.rt-dec.STOP{color:#ffb3a6;border-color:rgba(224,86,63,.5)}.rt-dec.PUSH{color:var(--gold-a);border-color:rgba(242,176,53,.45)}.rt-dec.REDUCE{color:var(--text);border-color:rgba(242,176,53,.3)}' +
    '.rt-empty{color:var(--text-3);font-size:13px;padding:10px 0}' +
    '.rt-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}'
  );

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(v) { v = num(v); return v == null ? '—' : String(Math.round(v)); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }
  function src(t) { return '<span class="rt-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }
  function wdName(w) { var n = num(w); if (n != null && DOW[n]) return DOW[n]; return w == null ? '' : String(w).slice(0, 3); }
  function wdOfDay(day) { var d = new Date(String(day) + 'T12:00:00Z'); if (isNaN(d.getTime())) return ''; return DOW[(d.getUTCDay() + 6) % 7]; }
  function hhmm(at) { if (!at) return ''; var d = new Date(String(at).replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(String(at)) ? '' : 'Z')); if (isNaN(d.getTime())) return String(at).slice(11, 16); try { return d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }) + ' UK'; } catch (e) { return d.toISOString().slice(11, 16) + ' UTC'; } }
  /* a history row's `unpriced` is a flag; the count is `unpriced_orders` (engine, 27 Sep) — never print the flag as a number */
  function unpricedCount(r) { if (!r) return 0; if (num(r.unpriced_orders) != null) return num(r.unpriced_orders); return typeof r.unpriced === 'boolean' ? null : (num(r.unpriced) || 0); }
  function isUnpriced(r) { return !!(r && (r.unpriced === true || num(r.unpriced_orders) > 0 || (typeof r.unpriced !== 'boolean' && num(r.unpriced) > 0))); }
  function fail(e) { if ($('rtBody')) $('rtBody').innerHTML = '<div class="an-panel"><h3>Not available</h3><div class="an-sub">' + esc(e && e.message || 'failed') + '</div></div>'; }

  VIEWS.adtoolRunToday = {
    label: 'Running today (ads)', hidden: true, order: 93, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    render: function () {
      return '<div class="rt-wrap">' + adtHgroup('Running today', 'which listings should run today, which should stop, and why — the last four same weekdays, today so far, the hours', 'rtFresh') +
        '<div id="rtAcct" class="an-filters"></div><div id="rtBody"><div class="rt-empty">Reading today…</div></div></div>';
    },
    init: function () {
      acctChips();
      load(false).catch(function () {});
      /* today moves every 5 minutes; adtPoll waits on hidden tabs and stops on an 'auth' refusal (session-expiry law) */
      adtPoll('rtBody', 300000, function () { return load(true); });
    }
  };

  function accounts() {
    var D = RT.data || {}, names = (D.accounts || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (!names.length) { var seen = {}; (D.rows || []).forEach(function (r) { if (r && r.account && !seen[r.account]) { seen[r.account] = 1; names.push(r.account); } }); names.sort(); }
    return names;
  }
  function acctChips() {
    var el = $('rtAcct'); if (!el) return;
    el.innerHTML = '<button class="' + (RT.account ? '' : 'on') + '" data-a="">All accounts</button>' + accounts().map(function (a) { return '<button class="' + (RT.account === a ? 'on' : '') + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
    var bs = el.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { RT.account = this.getAttribute('data-a'); acctChips(); load(false); };
  }
  function load(quiet) {
    return api('adtoolRunToday', RT.account ? { account: RT.account } : {}).then(function (D) {
      RT.data = D || {};
      if (!$('rtBody')) return;
      acctChips();
      draw();
      adtFreshShow('rtFresh', D && D.fresh);
    }).catch(function (e) { if (!quiet) fail(e); throw e; });
  }

  /* the verdict order is the action order: stop first (money leaking now), then run, then watch;
     inside a verdict the listing spending most today comes first */
  var ORDER = { stop: 0, run: 1, watch: 2 };
  function draw() {
    var D = RT.data, rows = (D.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    var counts = D.counts || {};
    if (counts.run == null && counts.stop == null && counts.watch == null) { counts = { run: 0, stop: 0, watch: 0 }; rows.forEach(function (r) { var v = String(r.verdict || 'watch').toLowerCase(); counts[v] = (counts[v] || 0) + 1; }); }
    var h = '';
    var P = D.period, when = P && (P.label || P.from) ? adtPeriodText(P) : 'today';
    h += '<div class="rt-top"><span>' + esc(when) + '</span><span>·</span><span>' + esc(RT.account || 'all accounts') + '</span><span>·</span><span>' + rows.length + ' advertised listing' + (rows.length === 1 ? '' : 's') + '</span>' +
      (D.computed_at ? '<span>·</span><span>computed ' + esc(hhmm(D.computed_at)) + '</span>' : '') + src('run today verdict') + '</div>';
    h += '<div class="rt-counts">' + [['stop', 'Stop today', 'lost on 3 of the last 4 same weekdays and over the last 7 days'], ['run', 'Run today', 'earned on the last same weekdays, or earning over 7 days above break-even'], ['watch', 'Watch', 'not enough priced history to call either way']].map(function (x) {
      return '<div class="rt-c ' + x[0] + (RT.filter === x[0] ? ' on' : '') + '" data-f="' + x[0] + '"><div class="k">' + esc(x[1]) + '</div><div class="v">' + cnt(counts[x[0]]) + '</div><div class="d">' + esc(x[2]) + '</div></div>';
    }).join('') + '</div>';
    var basis = null, note = null;
    rows.forEach(function (r) { var hb = r.hour_bands; if (hb && !basis && hb.basis) basis = String(hb.basis); if (hb && !note && hb.excluded_note) note = String(hb.excluded_note); });
    h += '<div class="rt-note"><b>How to read a row.</b> The verdict stands on the listing\'s own profit under the Sales Analysis law: <b>stop</b> when it lost on at least three of the last four same weekdays (spend ≥ £2 each) and over the last 7 days with every order in them priced — a negative 7 days that still holds an unpriced order is an unpriced sale, not a loss, so it waits as <b>watch</b>; <b>run</b> when it earned on three of four with a confident weekday effect, or is earning over 7 days at or above its own break-even; <b>watch</b> otherwise, including when fewer than two of those weekdays are priced yet (a weekday with no row does not count). Advertised = spend in the last 7 days, spend today, or a live cost-per-click ad on an active listing. ' +
      'Ads are counted by eBay\'s report day (UTC), orders by the UK day. Hours are advisory — eBay cannot schedule an ad by the hour' + (basis ? '; bands stand on ' + esc(basis) : '') + (note ? ' (' + esc(note) + ')' : '') + '. Nothing on this page is sent to eBay.</div>';
    h += '<div class="an-filters">' + [['', 'All'], ['stop', 'Stop'], ['run', 'Run'], ['watch', 'Watch']].map(function (x) { return '<button class="' + (RT.filter === x[0] ? 'on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var shown = rows.filter(function (r) { return !RT.filter || String(r.verdict || 'watch').toLowerCase() === RT.filter; })
      .sort(function (a, b) { var oa = ORDER[String(a.verdict || 'watch').toLowerCase()], ob = ORDER[String(b.verdict || 'watch').toLowerCase()]; if (oa == null) oa = 3; if (ob == null) ob = 3; if (oa !== ob) return oa - ob; return (num(b.today && b.today.spend) || 0) - (num(a.today && a.today.spend) || 0); });
    if (!shown.length) { h += '<div class="rt-empty">' + (rows.length ? 'No listing carries this verdict today.' : 'No advertised listing has a row yet — the first same-day ad sample lands about 07:05 UTC.') + '</div>'; }
    else {
      h += '<div class="an-scroll"><table class="rt-tbl"><thead><tr><th>Listing</th><th>Why' + src('run today verdict') + '</th><th>Last 4 same weekdays</th><th>Today so far' + src('today grain') + '</th><th>Hours today' + src('hour bands') + '</th><th>Best week · morning batch</th><th>Lever · who</th></tr></thead><tbody>' +
        shown.map(rowHtml).join('') + '</tbody></table></div>';
    }
    h += '<div class="rt-sm" style="margin-top:8px">' + esc(D.source || '') + '</div>';
    $('rtBody').innerHTML = h;
    var fs = document.querySelectorAll('#rtBody [data-f]'); for (var i = 0; i < fs.length; i++) fs[i].onclick = function () { var f = this.getAttribute('data-f'); RT.filter = RT.filter === f && this.classList.contains('rt-c') ? '' : f; draw(); };
  }

  function rowHtml(r) {
    var v = String(r.verdict || 'watch').toLowerCase(), T = r.today || {}, WP = r.weekday_profile || null, LW = r.last_week_same_day || null, BW = r.best_week || null, MD = r.morning_decision || null;
    var hist = (r.weekday_history || []).filter(function (x) { return x && x.day; });
    var todayWd = hist.length ? wdOfDay(hist[hist.length - 1].day) : '';
    var sentence = r.sentence ? String(r.sentence) : fallbackSentence(hist, LW, T, todayWd);
    var why = '<div class="rt-why"><div class="s">' + esc(sentence) + '</div>';
    if (WP && (num(WP.index) != null || num(WP.p) != null)) {
      why += '<div class="m">weekday effect ' + (num(WP.index) != null ? '<b>' + num(WP.index).toFixed(2) + '×</b> the listing\'s average day' : '—') + (num(WP.p) != null ? ' · p ' + num(WP.p).toFixed(3) : '') + ' · ' + (WP.confident ? '<b>confident</b>' : 'within noise') + '</div>';
    }
    if (LW && (num(LW.spend) != null || num(LW.actual_profit) != null)) {
      why += '<div class="m">last ' + esc(LW.day ? wdOfDay(LW.day) : 'week, same day') + (LW.day ? ' (' + esc(String(LW.day)) + ')' : '') + ': ' + (LW.has_row === false ? 'no ad or order row' : gbp(LW.spend) + ' spend · ' + cnt(LW.attr_units) + ' attributed units · profit ' + adtProfitCell(LW.actual_profit, 0, 0, unpricedCount(LW)) + (isUnpriced(LW) && !(unpricedCount(LW) > 0) ? ' <span class="adt-pf-p">· not fully priced</span>' : '')) + '</div>';
    }
    why += '</div>';
    var today = '<div class="rt-num"><div><span class="l">spend</span> <b>' + gbp(T.spend) + '</b></div><div><span class="l">clicks</span> ' + cnt(T.clicks) + ' · <span class="l">attr units</span> ' + cnt(T.attr_units) + '</div>' +
      '<div><span class="l">orders</span> ' + cnt(T.orders) + '</div><div><span class="l">profit</span> ' + adtProfitCell(T.actual_profit, 0, 0, T.unpriced) + '</div>' +
      (T.sampled_at ? '<div class="rt-sm">sampled ' + esc(hhmm(T.sampled_at)) + '</div>' : '<div class="rt-sm">no same-day sample yet</div>') + '</div>';
    var best = '<div class="rt-sm">' + (BW && (BW.week || num(BW.spend) != null) ? 'best week <b>' + esc(String(BW.week || '')) + '</b>: ' + gbp(BW.spend) + ' spend → ' + gbp(BW.attr_revenue) + ' attributed · profit ' + adtProfitCell(BW.actual_profit, BW.pending_cost_orders, BW.pending_fee_orders) : 'no best week yet') + '</div>';
    /* the chip is the STOP / REDUCE / PUSH label (`decision`); the prose `action` follows it; older answers carried only the prose */
    var decLabel = MD ? String(MD.decision || '').toUpperCase() : '';
    best += MD && (MD.decision || MD.action || MD.why) ? '<div class="rt-sm" style="margin-top:6px"><span class="rt-dec ' + esc(decLabel) + '">' + esc(decLabel || 'decision') + '</span> ' + (MD.action ? '<b>' + esc(String(MD.action)) + '</b> — ' : '') + esc(String(MD.why || '')) + (MD.batch ? ' <span class="adt-pf-p">· ' + esc(String(MD.batch)) + ' batch, shadow</span>' : '') + '</div>' : '<div class="rt-sm" style="margin-top:6px">no morning decision</div>';
    return '<tr class="' + esc(v) + '"><td>' + adtVerdictPill(v) + '<div style="margin-top:6px">' + adtProductCell(r) + '</div></td>' +
      '<td>' + why + '</td>' +
      '<td>' + miniBars(hist) + '</td>' +
      '<td>' + today + '</td>' +
      '<td>' + adtHourStrip(r.hour_bands) + '</td>' +
      '<td>' + best + '</td>' +
      '<td>' + adtLeverLine(r.lever, r.who) + '</td></tr>';
  }

  /* the engine writes the sentence; when an answer lacks it the page says the same thing from the history it has */
  function fallbackSentence(hist, LW, T, wd) {
    if (!hist.length) return 'No same-weekday history yet.';
    var s = 0, p = 0, priced = 0, unp = 0;
    hist = hist.filter(function (x) { return x.has_row !== false; });
    if (!hist.length) return 'No same-weekday history yet.';
    hist.forEach(function (x) { s += num(x.spend) || 0; if (num(x.actual_profit) != null && !isUnpriced(x)) { p += num(x.actual_profit); priced++; } else { unp++; } });
    var out = 'On the last ' + hist.length + ' ' + (wd ? wd + 's' : 'same weekdays') + ' it spent ' + gbp(s) + ' and made ' + gbp(p) + ' real profit' + (unp ? ' (' + unp + ' day' + (unp === 1 ? '' : 's') + ' not fully priced)' : '') + ';';
    if (LW) out += ' last ' + (wd || 'week') + ' ' + gbp(LW.spend) + ' / ' + gbp(LW.actual_profit) + ';';
    return out + ' today so far ' + gbp(T.spend) + ' spend, ' + cnt(T.attr_units) + ' units.';
  }

  /* four small bars of the listing's own profit on the last four same weekdays, value pills from the
     chart kit. chartBars draws at 980 units wide and would shrink its labels past reading in a table cell,
     so this is the same idea at a cell's size. Gold = earned, #e0563f = lost, faint = not fully priced. */
  function miniBars(hist) {
    var rows = hist.slice(-4);
    if (!rows.length) return '<div class="rt-sm">no same-weekday history</div>';
    var W = 230, H = 84, L = 6, R = 6, T = 18, B = 16, mx = 1;
    rows.forEach(function (r) { mx = Math.max(mx, Math.abs(num(r.actual_profit) || 0)); });
    var anyNeg = rows.some(function (r) { return (num(r.actual_profit) || 0) < 0; });
    var zero = anyNeg ? T + (H - T - B) / 2 : H - B, scale = (zero - T) / mx, bw = (W - L - R) / rows.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:230px;max-width:100%;height:auto;display:block" role="img">';
    s += '<line x1="' + L + '" y1="' + zero.toFixed(1) + '" x2="' + (W - R) + '" y2="' + zero.toFixed(1) + '" stroke="rgba(255,255,255,.14)" stroke-width="1"/>';
    var dots = [];
    rows.forEach(function (r, i) {
      var v = num(r.actual_profit), unp = isUnpriced(r), uc = unpricedCount(r), noRow = r.has_row === false, hgt = Math.max(1.5, Math.abs(v || 0) * scale);
      if (noRow) v = null;
      var x = L + i * bw + bw * 0.18, w = Math.max(2, bw * 0.64), y = (v || 0) >= 0 ? zero - hgt : zero;
      var fill = v == null ? 'rgba(255,255,255,.12)' : (v < 0 ? LOSS : 'var(--gold-b)');
      var title = (r.day || '') + ' (' + wdOfDay(r.day) + ') — ' + (noRow ? 'no ad or order row' : 'spend ' + gbp(r.spend) + ' · ' + cnt(r.attr_units) + ' attributed units · profit ' + (v == null ? '—' : gbp(v)) + (unp ? ' · ' + (uc != null && uc > 0 ? uc + ' order' + (uc === 1 ? '' : 's') + ' unpriced' : 'not fully priced') : ''));
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="2" fill="' + fill + '"' + (unp ? ' opacity=".55"' : '') + '><title>' + esc(title) + '</title></rect>';
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="8.5" fill="#66707c">' + esc(String(r.day || '').slice(5)) + '</text>';
      dots.push({ x: x + w / 2, y: ((v || 0) >= 0 ? y : zero + hgt) + ((v || 0) >= 0 ? -9 : 10), label: v == null ? '—' : chartMoney(v) + (unp ? '*' : ''), title: title });
    });
    s += chartValueDots(dots, { color: 'var(--gold-a)', ink: '#1c1200', fontSize: 8.5, minGap: 0 });
    s += '</svg>';
    var anyUnp = rows.some(isUnpriced);
    return s + (anyUnp ? '<div class="rt-sm">* not every order priced yet</div>' : '');
  }
})();
