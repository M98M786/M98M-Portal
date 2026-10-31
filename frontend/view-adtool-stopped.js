/* view-adtool-stopped.js — Advertising · Activated and stopped (owner's Change Spec, 28 Oct 2026:
 * "Activated & Stopped — MERGE: adtoolActivated + adtoolStopped, today + yesterday + archive").
 *
 * One page where two used to be. It opens on today and the day before, each showing what was STARTED
 * and what was STOPPED on that UK day, side by side; the 14-day strip and the date box open any
 * other day, and the day before it comes with it. The two directions are two reads of the same
 * action, so the same sums answer both halves and the page cannot come to disagree with itself.
 *
 * The reader is told, on the page and not in a footnote, which changes the tool itself made and which
 * were seen on eBay, because the sync cannot see who changed something on eBay and must never guess.
 *
 * Read-only: nothing on this page is ever sent to eBay. No profit above item level, by the Sales
 * Analysis law; this page deals in stops, starts, spend, units and hours. Galaxy tokens only, gold
 * the accent, #e0563f the loss colour. Engine action: adtoolChangeDay. Own class prefix: .cdy-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';

  VIEW_CSS.push([
    '.cdy-wrap{max-width:1420px}',
    '.cdy-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.cdy-day{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}',
    '.cdy-day input[type=date]{background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:5px 8px}',
    '.cdy-btn{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer}',
    '.cdy-btn:hover{color:var(--gold-a)}',
    '.cdy-btn[disabled]{opacity:.45;cursor:default}',
    '.cdy-btn.go{background:var(--gold-b);border-color:var(--gold-b);color:var(--gold-ink);font-weight:800}',
    '.cdy-daytxt{font-size:12px;color:var(--text-2);font-weight:700}',
    '.cdy-strip{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.cdy-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font:inherit;font-size:11.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.cdy-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.cdy-chip .n{opacity:.75;margin-left:6px;font-variant-numeric:tabular-nums}',
    '.cdy-chip .up{color:var(--gold-a);font-weight:800}.cdy-chip .dn{color:' + LOSS + ';font-weight:800}',
    '.cdy-chip.on .up,.cdy-chip.on .dn{color:var(--gold-ink)}',
    '.cdy-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.cdy-dayhd{display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;margin:18px 0 8px}',
    '.cdy-dayhd h2{margin:0;font-size:17px;font-weight:800;color:var(--text)}',
    '.cdy-dayhd .w{font-size:12px;color:var(--text-3);font-weight:700}',
    '.cdy-line{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px;font-size:13px;color:var(--text);line-height:1.6}',
    '.cdy-line b{color:var(--text)}',
    '.cdy-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}@media(max-width:900px){.cdy-pair{grid-template-columns:1fr}}',
    '.cdy-half{border:1px solid var(--gold-line);border-radius:14px;padding:12px 14px;background:var(--panel)}',
    '.cdy-half.start{border-color:rgba(242,176,53,.45)}',
    '.cdy-half.stop{border-color:rgba(224,86,63,.45)}',
    '.cdy-half h4{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--text)}',
    '.cdy-half.start h4{color:var(--gold-a)}.cdy-half.stop h4{color:' + LOSS + '}',
    '.cdy-tiles{display:flex;gap:8px;flex-wrap:wrap}',
    '.cdy-tile{flex:1 1 110px;border:1px solid var(--gold-line);border-radius:12px;padding:8px 11px;background:var(--panel-2)}',
    '.cdy-tile .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}',
    '.cdy-tile .v{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.cdy-tile.gold .v{color:var(--gold-a)}.cdy-tile.loss .v{color:' + LOSS + '}',
    '.cdy-tile .d{font-size:10.5px;color:var(--text-2);margin-top:2px;line-height:1.45}',
    '.cdy-who{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}',
    '.cdy-whoc{flex:1 1 240px;border:1px solid var(--gold-line);border-radius:14px;padding:12px 15px;background:var(--panel)}',
    '.cdy-whoc.tool{border-color:var(--gold-b);background:rgba(242,176,53,.08)}',
    '.cdy-whoc .k{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}',
    '.cdy-whoc .v{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:3px}',
    '.cdy-whoc.tool .v{color:var(--gold-a)}',
    '.cdy-whoc .d{font-size:11.5px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.cdy-split{height:14px;border-radius:7px;overflow:hidden;background:rgba(255,255,255,.07);display:flex;margin:0 0 6px}',
    '.cdy-split span{display:block;height:100%}',
    '.cdy-split .t{background:var(--gold-b)}.cdy-split .e{background:rgba(255,255,255,.22)}',
    '.cdy-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.cdy-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.cdy-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.cdy-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.cdy-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.cdy-tbl th.r{text-align:right}',
    '.cdy-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.cdy-tbl td.r{text-align:right;white-space:nowrap}',
    '.cdy-tbl tr.cdy-tot td{border-top:1px solid var(--gold-line);border-bottom:0;font-weight:800;background:rgba(242,176,53,.06)}',
    '.cdy-tbl tr.cdy-grp td{background:rgba(255,255,255,.04);font-weight:800;font-size:11.5px;letter-spacing:.04em;color:var(--text)}',
    '.cdy-tbl tr.sold td:first-child{box-shadow:inset 3px 0 0 ' + LOSS + '}',
    '.cdy-tbl tr.start td:first-child{box-shadow:inset 3px 0 0 var(--gold-b)}',
    '.cdy-scroll{overflow-x:auto}',
    '.cdy-when{white-space:nowrap;font-weight:700}',
    '.cdy-dir{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;border:1px solid var(--gold-line);color:var(--text-2)}',
    '.cdy-dir.on{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.cdy-dir.off{color:#ffb3a6;border-color:rgba(224,86,63,.5)}',
    '.cdy-kind{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;border:1px solid var(--gold-line);color:var(--text-2)}',
    '.cdy-kind.off{color:#ffb3a6;border-color:rgba(224,86,63,.5)}',
    '.cdy-kind.on{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.cdy-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.cdy-tag.live{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.cdy-tag.gone{color:' + LOSS + ';border-color:rgba(224,86,63,.5)}',
    '.cdy-mark{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}',
    '.cdy-sm{font-size:11px;color:var(--text-2);line-height:1.5}.cdy-sm b{color:var(--text)}',
    '.cdy-sm2{font-size:10.5px;color:var(--text-3);line-height:1.45}',
    '.cdy-camp{font-weight:700}',
    '.cdy-neg{color:' + LOSS + ';font-weight:700}.cdy-pos{color:var(--gold-a);font-weight:700}',
    '.cdy-honest{border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px;background:var(--panel-2);color:var(--text-2);font-size:12.5px;line-height:1.6}',
    '.cdy-honest h3{margin:0 0 8px;font-size:14px;font-weight:800;color:var(--text)}',
    '.cdy-honest p{margin:0 0 8px}.cdy-honest p:last-child{margin-bottom:0}',
    '.cdy-honest b{color:var(--text)}',
    '.cdy-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    '.cdy-reg{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:6px;white-space:nowrap}',
    /* ── automatic or by hand (owner's brief, 31 Oct, §3). This file's own prefix. ── */
    '.cdy-by{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;border:1px solid var(--gold-line);color:var(--text-2)}',
    '.cdy-by.auto{color:var(--gold-a);border-color:rgba(242,176,53,.45);background:rgba(242,176,53,.08)}',
    '.cdy-by.hand{color:var(--text-2);border-style:dashed}'
  ].join(''));

  /* ── the two directions, in the owner's words ─────────────────────────────────────────────── */
  var KINDS = {
    stopped: [
      ['ad_paused', 'ad paused'],
      ['ad_archived', 'ad archived'],
      ['ad_removed', 'taken out of campaign'],
      ['campaign_paused', 'campaign paused'],
      ['campaign_ended', 'campaign ended'],
      ['campaign_removed', 'campaign gone']
    ],
    activated: [
      ['ad_resumed', 'ad resumed'],
      ['ad_added', 'added to campaign'],
      ['campaign_started', 'campaign started'],
      ['campaign_created', 'new campaign']
    ]
  };
  function kindWord(k) {
    var list = KINDS.stopped.concat(KINDS.activated), i;
    for (i = 0; i < list.length; i++) { if (list[i][0] === k) return list[i][1]; }
    return String(k || '').replace(/_/g, ' ') || 'change';
  }
  function dirWord(dir, cap) {
    var w = dir === 'activated' ? 'started' : 'stopped';
    return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }

  /* ── formatters. a figure with nothing behind it prints the empty marker, never a zero ─────── */
  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function n0(n) { var v = num(n); return v == null ? 0 : Math.round(v); }
  function roasTxt(n) { var v = num(n); return v == null ? '—' : v.toFixed(2) + '×'; }
  /* units A DAY is an average and is routinely under one. Rounded to a whole number, 0.6 units a day
     prints as "0", and a reader takes that for a listing that was selling nothing — on the one page
     whose job is to say what a listing was doing before somebody stopped it. One decimal under ten. */
  function unitsNum(n) {
    var v = num(n); if (v == null) return '—';
    return (Math.abs(v) < 10 && v !== Math.round(v)) ? v.toFixed(1) : Math.round(v).toLocaleString('en-GB');
  }
  function unitsWord(n) { var v = num(n); return unitsNum(n) + ' unit' + (v === 1 ? '' : 's'); }
  /* the explainer hook. Only these labels have a pattern of their own in the register map, so only
     these are ever used: an unknown label opens the whole register, which is noise. */
  function reg(label, shown) {
    return '<span class="cdy-reg" data-adtreg="' + esc(label) + '" title="how is this worked out">' + esc(shown || label) + '</span>';
  }
  function plural(n, one, many) { return n0(n) === 1 ? one : many; }
  function dayOk(d) { d = String(d == null ? '' : d).slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? d : ''; }
  function dayShift(d, by) {
    d = dayOk(d); if (!d) return '';
    var t = new Date(d + 'T12:00:00Z'); if (isNaN(t.getTime())) return '';
    t.setUTCDate(t.getUTCDate() + by);
    return t.toISOString().slice(0, 10);
  }
  function dayLong(d) {
    d = dayOk(d); if (!d) return '';
    var t = new Date(d + 'T12:00:00Z'); if (isNaN(t.getTime())) return d;
    try { return t.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return d; }
  }
  function dayShort(d) {
    d = dayOk(d); if (!d) return '—';
    var t = new Date(d + 'T12:00:00Z'); if (isNaN(t.getTime())) return d;
    try { return t.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }); } catch (e) { return d.slice(5); }
  }
  function dayWord(d) {
    var today = adtUkDay();
    return d === today ? 'today' : (d === dayShift(today, -1) ? 'yesterday' : '');
  }
  /* the engine sends the UK clock time on at_uk; at_utc is the fallback and is converted here */
  function ukClock(r) {
    var a = String((r && r.at_uk) || '');
    var m = a.match(/(\d\d):(\d\d)/);
    if (m) return m[1] + ':' + m[2];
    var u = String((r && r.at_utc) || '');
    if (!u) return '—';
    var d = new Date(u.replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(u) ? '' : 'Z'));
    if (isNaN(d.getTime())) return u.slice(11, 16) || '—';
    try { return d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return d.toISOString().slice(11, 16); }
  }
  function utcClock(s) {
    s = String(s == null ? '' : s);
    var m = s.match(/(\d{4}-\d\d-\d\d)[T ](\d\d):(\d\d)/);
    return m ? m[1] + ' ' + m[2] + ':' + m[3] : (s || '');
  }
  function isCampaignRow(r) { return !String((r && r.item_id) || '').trim(); }

  /* ── the page's own state. `day` is the day at the top; the block under it is the day before ── */
  var S = { day: '', account: '', dir: '', kind: '', got: {}, err: {}, busy: false };

  function slot(day, dir) { return day + '|' + dir; }
  function got(day, dir) { return S.got[slot(day, dir)] || null; }
  function rowsOf(day, dir) {
    var D = got(day, dir);
    return D ? ((D.rows || []).filter(function (r) { return r && typeof r === 'object'; })
      .map(function (r) { return r.direction ? r : Object.assign({}, r, { direction: dir }); })) : [];
  }
  function dayRows(day) {
    return rowsOf(day, 'activated').concat(rowsOf(day, 'stopped')).filter(function (r) {
      if (S.account && String(r.account || '') !== S.account) return false;
      if (S.dir && String(r.direction || '') !== S.dir) return false;
      if (S.kind && String(r.kind || '') !== S.kind) return false;
      return true;
    }).sort(function (a, b) { return String(b.at_utc || b.at_uk || '').localeCompare(String(a.at_utc || a.at_uk || '')); });
  }
  function shownDay() { return dayOk(S.day) || adtUkDay(); }
  function prevDay() { return dayShift(shownDay(), -1); }

  VIEWS.adtoolStopped = {
    label: 'Activated and stopped',
    /* NOT hidden. Every other advertising-tool page is hidden here and lives only in the /ads/
       portal, but the owner asked for this one "on portal" as well, so it is carried by both builds
       and appears in both sidebars. */
    hidden: false, order: 94, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    render: function () {
      return '<div class="cdy-wrap">' +
        adtHgroup('Activated and stopped', 'What was started and what was stopped, today and the day before', 'cdyFresh') +
        '<div id="cdyDay" class="cdy-day"></div>' +
        '<div id="cdyStrip" class="cdy-strip"></div>' +
        '<div id="cdyAcct" class="cdy-filters"></div>' +
        '<div id="cdyBody"><div class="cdy-empty">Loading…</div></div></div>';
    },
    init: function () {
      /* the closure outlives a visit: drop every answer on entry so a page re-opened later asks
         again instead of painting an old day */
      S.got = {}; S.err = {}; S.day = ''; S.dir = ''; S.kind = '';
      dayBar();
      load(false).catch(function () {});
      /* today moves while the page is open; adtPoll skips hidden tabs and stops for good on an
         'auth' refusal (the session-expiry law) */
      adtPoll('cdyBody', 120000, function () {
        if (shownDay() !== adtUkDay()) return Promise.resolve();
        S.got = {};
        return load(true);
      });
    }
  };

  /* ── loading: two days, two directions, four reads of ONE action ──────────────────────────── */
  function ask(day, dir) {
    var k = slot(day, dir);
    if (S.got[k]) return Promise.resolve();
    var p = { direction: dir };
    if (dayOk(day)) p.day = dayOk(day);
    if (S.account) p.account = S.account;
    return api('adtoolChangeDay', p).then(function (D) {
      S.got[k] = D || {}; delete S.err[k];
    }).catch(function (e) {
      S.got[k] = null;
      S.err[k] = (e && e.message) || 'This day could not load.';
    });
  }
  function load(quiet) {
    if (S.busy) return Promise.resolve();
    S.busy = true;
    var top = shownDay(), prev = dayShift(top, -1);
    /* the chosen day first, so the page paints as soon as there is anything to read; the day before
       follows and fills its own block */
    return Promise.all([ask(top, 'activated'), ask(top, 'stopped')]).then(function () {
      if (!$('cdyBody')) return;
      dayBar(); acctChips(); draw();
      adtFreshShow('cdyFresh', (got(top, 'stopped') || got(top, 'activated') || {}).fresh);
      return Promise.all([ask(prev, 'activated'), ask(prev, 'stopped')]);
    }).then(function () {
      S.busy = false;
      if (!$('cdyBody')) return;
      dayBar(); acctChips(); draw();
    }).catch(function (e) {
      S.busy = false;
      if (!quiet && $('cdyBody')) {
        $('cdyBody').innerHTML = '<div class="cdy-panel"><h3>Not available</h3><div class="cdy-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }
  function go(day) {
    day = dayOk(day); if (!day) return;
    S.day = day; S.kind = '';
    dayBar();
    load(false).catch(function () {});
  }

  /* ── the day picker and the 14-day working archive ────────────────────────────────────────── */
  function archive() {
    var D = got(shownDay(), 'stopped') || got(shownDay(), 'activated') || null;
    var A = (D && D.archive) || [];
    return A.filter(function (a) { return a && dayOk(a.day); });
  }
  function dayBar() {
    var el = $('cdyDay');
    if (el) {
      var d = shownDay(), today = adtUkDay(), atEnd = d >= today;
      el.innerHTML = '<button class="cdy-btn" data-cdystep="-1">Previous day</button>' +
        '<input type="date" id="cdyDate" value="' + esc(d) + '" max="' + esc(today) + '">' +
        '<button class="cdy-btn" data-cdystep="1"' + (atEnd ? ' disabled' : '') + '>Next day</button>' +
        (d === today ? '' : '<button class="cdy-btn go" data-cdyday="' + esc(today) + '">Back to today</button>') +
        '<span class="cdy-daytxt">' + esc(dayLong(d)) + (dayWord(d) ? ' (' + dayWord(d) + ')' : '') +
        ', with ' + esc(dayLong(dayShift(d, -1))) + ' under it</span>';
      var inp = $('cdyDate');
      if (inp) inp.onchange = function () { var v = dayOk(this.value); if (v) go(v); };
      var bs = el.querySelectorAll('[data-cdystep]');
      for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
        var step = Number(this.getAttribute('data-cdystep')) || 0;
        var next = dayShift(shownDay(), step);
        if (next && next <= adtUkDay()) go(next);
      };
      var gs = el.querySelectorAll('[data-cdyday]');
      for (var g = 0; g < gs.length; g++) gs[g].onclick = function () { go(this.getAttribute('data-cdyday')); };
    }
    var strip = $('cdyStrip');
    if (!strip) return;
    var A = archive();
    if (!A.length) { strip.innerHTML = ''; return; }
    var cur = shownDay();
    strip.innerHTML = '<span class="cdy-daytxt" style="align-self:center;margin-right:4px">Last ' + A.length + ' days</span>' +
      A.map(function (a) {
        var st = num(a.stopped), ac = num(a.activated);
        return '<button class="cdy-chip' + (a.day === cur ? ' on' : '') + '" data-cdyday="' + esc(a.day) + '" title="' +
          esc(dayLong(a.day) + ': ' + cnt(ac) + ' started, ' + cnt(st) + ' stopped') + '">' + esc(dayShort(a.day)) +
          '<span class="n"><span class="up">' + cnt(ac) + '</span> / <span class="dn">' + cnt(st) + '</span></span></button>';
      }).join('');
    var cs = strip.querySelectorAll('[data-cdyday]');
    for (var c = 0; c < cs.length; c++) cs[c].onclick = function () { go(this.getAttribute('data-cdyday')); };
  }

  /* ── account chips ────────────────────────────────────────────────────────────────────────── */
  function anyPayload() {
    var keys = Object.keys(S.got);
    for (var i = 0; i < keys.length; i++) if (S.got[keys[i]]) return S.got[keys[i]];
    return null;
  }
  function accountRows(day, dir) {
    var D = got(day, dir);
    return D ? ((D.accounts || []).filter(function (a) { return a && typeof a === 'object' && a.account; })) : [];
  }
  /* EVERY account, not only the ones with a change on this day. The engine sends the whole list on
     all_accounts for exactly this reason: a chip reloads the page for one account, and the answer it
     sends back then names only that account, so a list built from the answer would strand the reader
     on whichever account they picked first. */
  function accountNames() {
    var D = anyPayload();
    var all = (((D && D.all_accounts) || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean));
    if (all.length) return all;
    var names = [], seen = {};
    [shownDay(), prevDay()].forEach(function (d) {
      ['activated', 'stopped'].forEach(function (dir) {
        accountRows(d, dir).forEach(function (a) { if (!seen[a.account]) { seen[a.account] = 1; names.push(a.account); } });
        rowsOf(d, dir).forEach(function (r) { if (r.account && !seen[r.account]) { seen[r.account] = 1; names.push(r.account); } });
      });
    });
    names.sort();
    return names;
  }
  function acctChips() {
    var el = $('cdyAcct'); if (!el) return;
    el.innerHTML = '<button class="cdy-chip' + (S.account ? '' : ' on') + '" data-cdya="">All accounts</button>' +
      accountNames().map(function (a) {
        return '<button class="cdy-chip' + (S.account === a ? ' on' : '') + '" data-cdya="' + esc(a) + '">' + esc(a) + '</button>';
      }).join('');
    var bs = el.querySelectorAll('[data-cdya]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      S.account = this.getAttribute('data-cdya') || '';
      S.kind = '';
      /* ASK AGAIN rather than filter what is in hand. The counts come from the engine and cover
         every change on the day, so filtering here would leave one account's rows sitting under the
         whole fleet's totals; and the engine caps its rows, so asking for one account is also the
         only way to see more of them. */
      S.got = {};
      acctChips();
      load(false).catch(function () {});
    };
  }

  /* ── one day, one direction: the summary the engine sends, counted again from the rows where a
     field is missing, so a thin answer still reads as a day rather than a row of dashes ───────── */
  function summary(day, dir) {
    var D = got(day, dir);
    var raw = (D && D.summary) || {};
    var R = rowsOf(day, dir), ads = 0, items = {}, camps = {}, campLvl = 0, tool = 0, ebay = 0, moved = 0;
    var autoN = 0, handN = 0, peakN = 0, byKnown = 0;
    R.forEach(function (r) {
      var id = String(r.item_id || '').trim();
      if (id) { ads++; items[id] = 1; } else { campLvl++; }
      var ck = String(r.campaign_id || r.campaign_name || '');
      if (ck) camps[r.account + '|' + ck] = 1;
      if (String(r.who || '') === 'tool') tool++; else ebay++;
      /* AUTOMATIC OR BY HAND, counted from the rows. The engine's by_tool / by_ebay are the SAME
         rule over every change on the day, rows held back included, so they are the figures the
         day summary prints; these two are the fallback for an answer that carries neither. */
      var by = String(r.by == null ? '' : r.by).toLowerCase();
      if (by === 'automatic') { autoN++; byKnown++; } else if (by === 'manual') { handN++; byKnown++; }
      if (String(r.by_sender || '') === 'peak switching') peakN++;
      if (/_(removed|added)$/.test(String(r.kind || '')) && id) moved++;
    });
    var pick = function (k, fallback) { var v = num(raw[k]); return v == null ? fallback : v; };
    /* `campaigns` is how many of the changes were AT campaign level; `campaigns_touched` is how many
       campaigns the day's changes landed in at all. A day of ninety paused ads inside six campaigns
       that were never themselves touched has none of the first and six of the second, so one number
       cannot stand for both and the page names each where it prints it. */
    return {
      have: !!D,
      ads: pick('ads', ads),
      listings: pick('listings', Object.keys(items).length),
      campaigns: pick('campaigns', campLvl),
      campaigns_touched: pick('campaigns_touched', Object.keys(camps).length),
      removed_or_added: pick('removed_or_added', moved),
      spend_day_before: num(raw.spend_day_before),
      units_day_before: num(raw.units_day_before),
      by_tool: pick('by_tool', tool),
      by_ebay: pick('by_ebay', ebay),
      /* the owner's two words over the same split. by_tool and by_ebay cover the WHOLE day; the two
         counted off the rows cover only the rows on the page, so they stand in and nothing else. */
      by_automatic: pick('by_tool', autoN),
      by_manual: pick('by_ebay', handN),
      by_counted_rows: byKnown,
      by_peak_rows: peakN,
      rows_total: num(D && D.rows_total),
      rows_held_back: num(D && D.rows_held_back)
    };
  }
  /* `hook` is the explainer tag ALREADY BUILT by the caller, so the label it carries is a literal
     at the call site where a reader of this file can see which note that tile opens. */
  function tile(k, v, d, cls, hook) {
    return '<div class="cdy-tile ' + (cls || '') + '"><div class="k">' + esc(k) + (hook || '') +
      '</div><div class="v">' + v + '</div><div class="d">' + esc(d) + '</div></div>';
  }
  function half(day, dir) {
    var T = summary(day, dir), k = slot(day, dir);
    var cls = dir === 'activated' ? 'start' : 'stop';
    var h = '<div class="cdy-half ' + cls + '"><h4>' + dirWord(dir, true) + '</h4>';
    if (S.err[k]) return h + '<div class="cdy-empty">' + esc(S.err[k]) + '</div></div>';
    if (!T.have) return h + '<div class="cdy-empty">Loading…</div></div>';
    h += '<div class="cdy-tiles">' +
      tile('Ads ' + dirWord(dir), cnt(T.ads), 'changes at ad level', dir === 'activated' ? 'gold' : 'loss', reg('changes on this day', 'how')) +
      tile('Listings', cnt(T.listings), 'listings behind those ads', '', reg('changes on this day', 'how')) +
      tile('Campaigns', cnt(T.campaigns_touched),
        'campaigns the changes landed in' + (n0(T.campaigns) ? ', ' + cnt(T.campaigns) + ' ' + plural(T.campaigns, 'change was', 'changes were') + ' to a campaign itself' : ''), '', reg('changes on this day', 'how')) +
      tile(dir === 'activated' ? 'Added to campaigns' : 'Taken out of campaigns', cnt(T.removed_or_added),
        dir === 'activated' ? 'ads that joined a campaign' : 'ads that left a campaign', '', reg('changes on this day', 'how')) +
      tile('Was spending a day', gbp(T.spend_day_before), 'those listings, over the 7 days before', 'gold', reg('the 7 days before', 'how')) +
      tile('Was selling a day', unitsNum(T.units_day_before), 'units a day, over the 7 days before', '', reg('the 7 days before', 'how')) +
      '</div>';
    return h + '</div>';
  }
  function oneLine(day) {
    var A = summary(day, 'activated'), P = summary(day, 'stopped');
    var word = dayWord(day);
    var h = '<div class="cdy-line"><b>' + esc(dayLong(day)) + (word ? ' (' + word + ')' : '') + '.</b> ';
    if (!A.have && !P.have) return h + 'This day has not come back yet.</div>';
    if (!n0(A.ads) && !n0(P.ads) && !n0(A.campaigns) && !n0(P.campaigns)) {
      return h + 'Nothing was started or stopped' + esc(S.account ? ' on ' + S.account : '') + ' on this day.</div>';
    }
    h += '<b>' + cnt(A.ads) + '</b> ' + plural(A.ads, 'ad was', 'ads were') + ' started and <b>' + cnt(P.ads) + '</b> ' +
      plural(P.ads, 'ad was', 'ads were') + ' stopped, on ' + cnt(n0(A.listings) + n0(P.listings)) + ' ' +
      plural(n0(A.listings) + n0(P.listings), 'listing', 'listings') +
      esc(S.account ? ', on ' + S.account : '') + '. ';
    if (P.spend_day_before != null || P.units_day_before != null) {
      h += 'Over the 7 days before, the listings that were stopped had been spending <b>' + gbp(P.spend_day_before) +
        ' a day</b> and selling <b>' + unitsWord(P.units_day_before) + ' a day</b>. ';
    }
    h += 'The tool made <b>' + cnt(n0(A.by_tool) + n0(P.by_tool)) + '</b> of the changes and <b>' +
      cnt(n0(A.by_ebay) + n0(P.by_ebay)) + '</b> ' + plural(n0(A.by_ebay) + n0(P.by_ebay), 'was', 'were') + ' seen on eBay.</div>';
    return h;
  }
  /* the split a manager asks for first, so it is a panel of its own and not a line in a table */
  function whoBlock(day) {
    var A = summary(day, 'activated'), P = summary(day, 'stopped');
    var t = n0(A.by_tool) + n0(P.by_tool), e = n0(A.by_ebay) + n0(P.by_ebay), tot = t + e;
    var pct = tot > 0 ? Math.round(t / tot * 100) : 0;
    return '<div class="cdy-panel"><h3>Who made these changes' + reg('who changed it', 'how') + '</h3>' +
      '<div class="cdy-sub">Our own tool against everything else, both directions together. The portal cannot see who made a change on eBay, so those are never put to a name.</div>' +
      (tot > 0 ? '<div class="cdy-split"><span class="t" style="width:' + pct + '%"></span><span class="e" style="width:' + (100 - pct) + '%"></span></div>' : '') +
      '<div class="cdy-who">' +
      '<div class="cdy-whoc tool"><div class="k">The tool made</div><div class="v">' + cnt(t) + '</div>' +
      '<div class="d">' + (tot > 0 ? pct + '% of the day' : 'nothing yet') + ', written in its own log with the operation and whether it was sent</div></div>' +
      '<div class="cdy-whoc"><div class="k">Seen on eBay</div><div class="v">' + cnt(e) + '</div>' +
      '<div class="d">' + (tot > 0 ? (100 - pct) + '% of the day' : 'nothing yet') + ', found by the sync comparing eBay against the last read, so the portal cannot see who</div></div>' +
      '</div>' + byLine(day, A, P) + '</div>';
  }
  /* THE DAY COUNTED BOTH WAYS (owner's brief, 31 Oct, §3): the same split again, in the owner's own
     two words, so the chip on each row has a total standing behind it. The two figures are the
     engine's own counts over every change on the day, held back rows included, by the same rule the
     chips are. The peak switching's own share is counted off the rows on the page and says so,
     because the engine sends no tally of its own for it. */
  function byLine(day, A, P) {
    var a = num(A.by_automatic), m = num(A.by_manual), a2 = num(P.by_automatic), m2 = num(P.by_manual);
    if (a == null && a2 == null && m == null && m2 == null) {
      return '<div class="cdy-sub">Whether these changes were automatic or by hand is not in this answer.</div>';
    }
    var auto = n0(a) + n0(a2), hand = n0(m) + n0(m2);
    var pk = n0(A.by_peak_rows) + n0(P.by_peak_rows), seen = n0(A.by_counted_rows) + n0(P.by_counted_rows);
    return '<div class="cdy-sub">In the owner\'s own words: <b>' + cnt(auto) + '</b> ' +
      plural(auto, 'change was', 'changes were') + ' <span class="cdy-by auto">automatic</span> and <b>' + cnt(hand) + '</b> ' +
      plural(hand, 'was', 'were') + ' <span class="cdy-by hand">manual</span>, which is the same rule as the two cards above. ' +
      (seen > 0
        ? (pk > 0
          ? 'Of the ' + cnt(seen) + ' ' + plural(seen, 'change', 'changes') + ' listed on this page, <b>' + cnt(pk) + '</b> ' +
            plural(pk, 'was', 'were') + ' sent by the peak switching, which is the one sender that goes at an hour of its own.'
          : 'None of the changes listed on this page was sent by the peak switching.')
        : '') + '</div>';
  }

  /* ── by account, both directions side by side ─────────────────────────────────────────────── */
  function accountPanel(day) {
    var by = {}, order = [];
    ['activated', 'stopped'].forEach(function (dir) {
      accountRows(day, dir).forEach(function (a) {
        var k = String(a.account);
        if (!by[k]) { by[k] = { account: k, activated: 0, stopped: 0, listings: 0, touched: 0, spend: null }; order.push(k); }
        by[k][dir] += n0(a.ads);
        by[k].listings += n0(a.listings);
        by[k].touched += n0(a.campaigns_touched);
        var v = num(a.spend_day_before);
        if (v != null) by[k].spend = n0(by[k].spend) + v;
      });
    });
    if (!order.length) return '';
    var rows = order.map(function (k) { return by[k]; }).sort(function (x, y) { return (y.activated + y.stopped) - (x.activated + x.stopped); });
    var sum = rows.reduce(function (t, g) { t.activated += g.activated; t.stopped += g.stopped; t.listings += g.listings; t.touched += g.touched; if (g.spend != null) t.spend = n0(t.spend) + g.spend; return t; },
      { activated: 0, stopped: 0, listings: 0, touched: 0, spend: null });
    return '<div class="cdy-panel"><h3>By account</h3>' +
      '<div class="cdy-sub">The same day, account by account, both directions.</div>' +
      '<div class="cdy-scroll"><table class="cdy-tbl"><thead><tr><th>Account</th>' +
      '<th class="r">Ads started</th><th class="r">Ads stopped</th>' +
      '<th class="r" title="campaigns the day\'s changes landed in, counted once each">Campaigns touched</th>' +
      '<th class="r">Listings</th><th class="r">Was spending a day</th></tr></thead><tbody>' +
      rows.map(function (g) {
        return '<tr><td><b>' + esc(g.account) + '</b></td>' +
          '<td class="r cdy-pos">' + cnt(g.activated) + '</td><td class="r cdy-neg">' + cnt(g.stopped) + '</td>' +
          '<td class="r">' + cnt(g.touched) + '</td><td class="r">' + cnt(g.listings) + '</td>' +
          '<td class="r">' + gbp(g.spend) + '</td></tr>';
      }).join('') +
      '<tr class="cdy-tot"><td>' + (S.account ? esc(S.account) : 'All accounts') + '</td>' +
      '<td class="r">' + cnt(sum.activated) + '</td><td class="r">' + cnt(sum.stopped) + '</td>' +
      '<td class="r">' + cnt(sum.touched) + '</td><td class="r">' + cnt(sum.listings) + '</td>' +
      '<td class="r">' + gbp(sum.spend) + '</td></tr></tbody></table></div></div>';
  }

  /* ── the list, both directions in one table ───────────────────────────────────────────────── */
  /* AUTOMATIC OR BY HAND (owner's brief, 31 Oct, §3), in the owner's own two words. It is the SAME
     rule as the "Who or what" lines under it, read once in the engine and printed twice here: a
     change is automatic only where the portal's own record of what it sent matches it. `by_sender`
     names which of the portal's senders it was, and the peak switching is the one that sends at an
     hour of its own. `by_minutes_before` is how long before the change that send went out, which is
     the difference between the same event and only the same day, and it is null and never nought
     where a stamp could not be read. */
  function byChip(r) {
    var by = String(r.by == null ? '' : r.by).toLowerCase().trim();
    if (by !== 'automatic' && by !== 'manual') {
      return '<div class="cdy-sm2">Whether this was automatic or by hand is not in this answer.</div>';
    }
    var auto = by === 'automatic';
    var sender = String(r.by_sender || '').trim();
    var mins = num(r.by_minutes_before);
    var bits = [];
    if (auto && sender) bits.push(sender);
    if (auto && mins != null) {
      bits.push(mins <= 0 ? 'in the same minute' : cnt(mins) + ' ' + plural(mins, 'minute', 'minutes') + ' before eBay reported it');
    }
    if (auto && r.by_close === false) bits.push('the same day rather than the same moment');
    return '<div><span class="cdy-by ' + (auto ? 'auto' : 'hand') + '" title="' + esc(String(r.by_note || '')) + '">' +
      esc(by) + '</span></div>' + (bits.length ? '<div class="cdy-sm2">' + esc(bits.join(' · ')) + '</div>' : '');
  }
  function whoCell(r) {
    if (String(r.who || '') === 'tool') {
      var t = r.tool || {};
      /* the log's own mode words are not reader words: only 'live' means it reached eBay, and
         everything else was written and held back, however the log spells it */
      var mode = String(t.mode || '');
      return '<div class="cdy-sm"><b>The tool</b>' + (t.op ? ' · ' + esc(String(t.op)) : '') + '</div>' +
        '<div class="cdy-sm2">' + esc(mode === 'live' ? 'sent to eBay' : (mode ? 'written, not sent to eBay' : 'from the log of its own actions')) +
        (t.decision_id ? ' · ' + esc(String(t.decision_id)) : '') + '</div>';
    }
    return '<div class="cdy-sm">Changed on eBay</div><div class="cdy-sm2">the portal cannot see who</div>';
  }
  function decisionCell(r) {
    var d = r.decision;
    if (!d || typeof d !== 'object' || !(d.decision || d.why)) return '<div class="cdy-sm2">no morning decision</div>';
    var label = String(d.decision || '').toUpperCase();
    return '<div class="cdy-sm"><b>' + esc(label || 'decision') + '</b>' +
      (d.batch ? ' <span class="cdy-sm2">· ' + esc(String(d.batch) === 'boundary' ? 'evening run' : String(d.batch) + ' run') + '</span>' : '') + '</div>' +
      (d.why ? '<div class="cdy-sm2">' + esc(String(d.why)) + '</div>' : '');
  }
  function beforeCell(r) {
    var b = r.before;
    if (!b || typeof b !== 'object') return '<div class="cdy-sm2">no figures for the 7 days before</div>';
    var sp = num(b.spend_day), un = num(b.units_day), ro = num(b.roas), dys = num(b.days);
    if (sp == null && un == null && ro == null) return '<div class="cdy-sm2">no figures for the 7 days before</div>';
    return '<div class="cdy-sm"><b>' + gbp(sp) + '</b> a day · ' + unitsWord(un) + ' a day</div>' +
      '<div class="cdy-sm2">ROAS <span class="' + (ro == null ? '' : (ro < 1 ? 'cdy-neg' : 'cdy-pos')) + '">' + roasTxt(ro) + '</span>' +
      (dys == null ? '' : ' · over ' + cnt(dys) + ' ' + plural(dys, 'day', 'days')) + '</div>';
  }
  function campaignCell(r) {
    var name = String(r.campaign_name || r.campaign_id || '');
    if (!name) return '<span class="cdy-sm2">no campaign on this change</span>';
    var h = '<span class="cdy-camp">' + adtCampaignLink(r.campaign_id, name) + '</span>';
    if (String(r.campaign_id_source || '') === 'matched by name') {
      h += '<span class="cdy-mark" title="this row was recorded before the campaign id was kept, so the link is matched by the campaign name within the account">matched by name</span>';
    } else if (String(r.campaign_id_source || '') === 'unknown') {
      h += '<span class="cdy-mark" title="no campaign id was recorded and the name does not match a campaign on this account, so there is no link">no link</span>';
    }
    if (r.campaign_status_now) h += '<div class="cdy-sm2">now ' + esc(String(r.campaign_status_now)) + '</div>';
    return h;
  }
  function whatCell(r) {
    var dir = String(r.direction || 'stopped');
    var h = '<span class="cdy-dir ' + (dir === 'activated' ? 'on' : 'off') + '">' + esc(dirWord(dir)) + '</span> ' +
      '<span class="cdy-kind ' + (dir === 'activated' ? 'on' : 'off') + '">' + esc(kindWord(String(r.kind || ''))) + '</span>';
    if (r.from || r.to) {
      h += '<div class="cdy-sm2">' + esc(String(r.from || 'not in a campaign')) + ' → ' + esc(String(r.to || 'gone')) + '</div>';
    }
    return h;
  }
  function subjectCell(r) {
    if (!isCampaignRow(r)) return adtProductCell(r);
    var held = num(r.listings);
    return '<div class="cdy-sm"><b>' + esc(String(r.campaign_name || r.campaign_id || 'a campaign')) + '</b></div>' +
      '<div class="cdy-sm2">' + (held == null ? 'a whole campaign, no listing count recorded' : 'a whole campaign, holding ' + cnt(held) + ' ' + plural(held, 'ad', 'ads')) +
      (r.account ? ' · ' + esc(String(r.account)) : '') + '</div>';
  }
  function rowHtml(r) {
    var dir = String(r.direction || 'stopped');
    var wasSelling = n0(r.before && r.before.units_day) > 0;
    var cls = dir === 'activated' ? 'start' : (wasSelling ? 'sold' : '');
    var live = r.live_now;
    return '<tr class="' + cls + '"><td class="cdy-when">' + esc(ukClock(r)) + '</td>' +
      '<td>' + whatCell(r) + '</td>' +
      '<td>' + subjectCell(r) + '</td>' +
      '<td>' + campaignCell(r) + '</td>' +
      '<td>' + byChip(r) + whoCell(r) + '</td>' +
      '<td>' + decisionCell(r) + '</td>' +
      '<td>' + beforeCell(r) + '</td>' +
      '<td>' + (live == null ? '<span class="cdy-sm2">not known</span>'
        : '<span class="cdy-tag ' + (live ? 'live' : 'gone') + '">' + (live ? 'live now' : 'not live') + '</span>') + '</td></tr>';
  }
  function listPanel(day) {
    var R = dayRows(day);
    var head = '<thead><tr><th>UK time</th><th>What happened</th><th>Listing or campaign</th>' +
      '<th>Campaign</th><th>Who or what</th><th>That morning</th><th>The 7 days before</th>' +
      '<th>Live now</th></tr></thead>';
    var h = '<div class="cdy-panel"><h3>Everything that changed</h3>' +
      '<div class="cdy-sub">Newest first' + (S.account ? ', on ' + esc(S.account) : ', grouped by account') + '. ' +
      'A gold edge marks a start; a red edge marks a listing that was selling before it was stopped.</div>';
    var everything = rowsOf(day, 'activated').concat(rowsOf(day, 'stopped'));
    if (!R.length) {
      return h + '<div class="cdy-empty">' + (everything.length
        ? 'Nothing in this filter on this day.'
        : 'Nothing was started or stopped on this day.') + '</div></div>';
    }
    var body = '';
    if (!S.account) {
      var order = [], byAcct = {};
      R.forEach(function (r) {
        var a = String(r.account || 'no account');
        if (!byAcct[a]) { byAcct[a] = []; order.push(a); }
        byAcct[a].push(r);
      });
      body = order.map(function (a) {
        return '<tr class="cdy-grp"><td colspan="8">' + esc(a) + ' · ' + cnt(byAcct[a].length) + ' ' +
          plural(byAcct[a].length, 'change', 'changes') + '</td></tr>' + byAcct[a].map(rowHtml).join('');
      }).join('');
    } else {
      body = R.map(rowHtml).join('');
    }
    var h2 = '';
    ['activated', 'stopped'].forEach(function (dir) {
      var T = summary(day, dir);
      if (T.rows_held_back != null && T.rows_held_back > 0) {
        h2 += '<div class="cdy-sm2" style="margin-top:6px">' + cnt(T.rows_held_back) + ' ' +
          plural(T.rows_held_back, 'change that was ', 'changes that were ') + dirWord(dir) +
          ' on this day ' + plural(T.rows_held_back, 'is', 'are') + ' not on the page, of ' + cnt(T.rows_total) +
          ' in all. The counts above cover every one of them; choose one account to see more.</div>';
      }
    });
    return h + '<div class="cdy-scroll"><table class="cdy-tbl">' + head + '<tbody>' + body + '</tbody></table></div>' + h2 + '</div>';
  }

  /* ── the filter bar: both directions, then the kinds in whichever direction is in force ───── */
  function filterBar(day) {
    var all = rowsOf(day, 'activated').concat(rowsOf(day, 'stopped')).filter(function (r) { return !S.account || String(r.account || '') === S.account; });
    if (!all.length) return '';
    var counts = {}, order = [];
    all.forEach(function (r) {
      if (S.dir && String(r.direction || '') !== S.dir) return;
      var k = String(r.kind || '');
      if (counts[k] == null) { counts[k] = 0; order.push(k); }
      counts[k]++;
    });
    var known = KINDS.stopped.concat(KINDS.activated).map(function (x) { return x[0]; });
    var list = known.filter(function (k) { return counts[k]; }).concat(order.filter(function (k) { return known.indexOf(k) < 0; }));
    var nA = all.filter(function (r) { return r.direction === 'activated'; }).length;
    var nS = all.length - nA;
    var h = '<div class="cdy-filters">' +
      '<button class="cdy-chip' + (S.dir ? '' : ' on') + '" data-cdyd="">Both<span class="n">' + cnt(all.length) + '</span></button>' +
      '<button class="cdy-chip' + (S.dir === 'activated' ? ' on' : '') + '" data-cdyd="activated">Started<span class="n">' + cnt(nA) + '</span></button>' +
      '<button class="cdy-chip' + (S.dir === 'stopped' ? ' on' : '') + '" data-cdyd="stopped">Stopped<span class="n">' + cnt(nS) + '</span></button>' +
      '</div>';
    if (list.length) {
      h += '<div class="cdy-filters"><button class="cdy-chip' + (S.kind ? '' : ' on') + '" data-cdyk="">Everything</button>' +
        list.map(function (k) {
          return '<button class="cdy-chip' + (S.kind === k ? ' on' : '') + '" data-cdyk="' + esc(k) + '">' +
            esc(kindWord(k)) + '<span class="n">' + cnt(counts[k]) + '</span></button>';
        }).join('') + '</div>';
    }
    return h;
  }

  /* ── the 14 days, the same counts as the strip above ──────────────────────────────────────── */
  function archivePanel() {
    var A = archive();
    if (A.length < 2) return '';
    var pts = [];
    A.slice().reverse().forEach(function (a) {
      pts.push({ label: dayShort(a.day), value: n0(a.activated), strong: a.day === shownDay(),
        title: dayLong(a.day) + ': ' + cnt(num(a.activated)) + ' started' });
      pts.push({ label: '', value: -n0(a.stopped), muted: false,
        title: dayLong(a.day) + ': ' + cnt(num(a.stopped)) + ' stopped' });
    });
    return '<div class="cdy-panel"><h3>The last ' + A.length + ' days' + reg('the change archive', 'how') + '</h3>' +
      '<div class="cdy-sub">Each day as a pair: what was started above the line, what was stopped below it. Click a day in the strip above to open it.</div>' +
      chartBars(pts, { height: 170, fmt: function (v) { return String(Math.abs(Math.round(v))); }, everyNth: 2, minGap: 26 }) + '</div>';
  }

  /* ── honesty ──────────────────────────────────────────────────────────────────────────────── */
  function honesty() {
    var D = anyPayload() || {}, h = '<div class="cdy-honest"><h3>How to read these days</h3>';
    h += '<p><b>The days.</b> Each block covers a UK day, midnight to midnight. The day at the top is the one ' +
      'you chose; the block under it is the day before it, so a change and what followed it are read together.' +
      (D.uk_bounds && (D.uk_bounds.from_utc || D.uk_bounds.to_utc)
        ? ' For the chosen day the changes are the ones recorded from ' + esc(utcClock(D.uk_bounds.from_utc)) + ' to ' +
          esc(utcClock(D.uk_bounds.to_utc)) + ' UTC, which is that UK day.'
        : '') + '</p>';
    h += '<p><b>Who changed something.</b> A change is put to the tool only when the log the tool keeps of its ' +
      'own actions holds it for the same listing or campaign on the same UK day. Everything else was found by comparing eBay against ' +
      'the last read, and the portal cannot see who made it, so no name is ever guessed.</p>';
    /* the rule behind the automatic / manual chip, in the engine's own words rather than typed here:
       the number of minutes inside which a send and a change read as one event is a setting, and a
       sentence typed in this file would go on printing the old figure after somebody moved it. */
    if (D.by_note) {
      h += '<p><b>Automatic or by hand.</b> ' + esc(String(D.by_note)) + '.</p>';
    }
    var matched = 0;
    [shownDay(), prevDay()].forEach(function (d) {
      ['activated', 'stopped'].forEach(function (dir) {
        matched += rowsOf(d, dir).filter(function (r) { return String(r.campaign_id_source || '') === 'matched by name'; }).length;
      });
    });
    if (matched > 0) {
      h += '<p><b>' + cnt(matched) + ' campaign ' + plural(matched, 'link is', 'links are') + ' matched by name.</b> ' +
        'Older campaign changes were recorded with the campaign name and no id, so the link is found by matching ' +
        'that name within the account. Each one is marked on its row.</p>';
    }
    h += '<p>Nothing on this page is ever sent to eBay.' +
      (D.computed_at ? ' Worked out at ' + esc(utcClock(D.computed_at)) + ' UTC.' : '') + '</p>';
    return h + '</div>';
  }

  /* ── one day block ────────────────────────────────────────────────────────────────────────── */
  function dayBlock(day, lead) {
    var word = dayWord(day);
    return '<div class="cdy-dayhd"><h2>' + esc(dayLong(day)) + '</h2>' +
      '<span class="w">' + esc(word ? word : (lead ? 'the day you chose' : 'the day before')) + '</span></div>' +
      oneLine(day) +
      '<div class="cdy-pair">' + half(day, 'activated') + half(day, 'stopped') + '</div>' +
      whoBlock(day) +
      accountPanel(day) +
      filterBar(day) +
      listPanel(day);
  }

  /* ── draw and wire ────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('cdyBody'); if (!box) return;
    var top = shownDay(), prev = prevDay();
    var A = summary(top, 'activated'), P = summary(top, 'stopped');
    var h = '<div class="cdy-top"><span><b>Activated and stopped</b></span><span>·</span>' +
      '<span>' + esc(dayLong(top)) + '</span><span>·</span>' +
      '<span>' + esc(S.account || 'all accounts') + '</span><span>·</span>' +
      '<span>' + cnt(n0(A.ads) + n0(P.ads)) + ' ' + plural(n0(A.ads) + n0(P.ads), 'change', 'changes') + '</span></div>';
    h += dayBlock(top, true);
    h += dayBlock(prev, false);
    h += archivePanel();
    h += honesty();
    box.innerHTML = h;

    var ds = box.querySelectorAll('[data-cdyd]');
    for (var i = 0; i < ds.length; i++) ds[i].onclick = function () {
      var d = this.getAttribute('data-cdyd') || '';
      S.dir = S.dir === d ? '' : d;
      S.kind = '';
      draw();
    };
    var ks = box.querySelectorAll('[data-cdyk]');
    for (var j = 0; j < ks.length; j++) ks[j].onclick = function () {
      var k = this.getAttribute('data-cdyk') || '';
      S.kind = S.kind === k ? '' : k;
      draw();
    };
    var gs = box.querySelectorAll('[data-cdyday]');
    for (var g = 0; g < gs.length; g++) gs[g].onclick = function () { go(this.getAttribute('data-cdyday')); };
  }
})();
