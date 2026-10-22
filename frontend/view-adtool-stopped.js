/* view-adtool-stopped.js — Advertising · Stopped yesterday (owner's batch, 22 Oct 2026: "make a page
 * on portal that tells you the items you stopped yesterday ... keep the archive so that we can see
 * working archive ... add details that can give clear presentation about yesterday").
 *
 * This file carries BOTH day pages. The owner asked for two screens that differ only in the direction
 * they look at, so there is one implementation here and the other registration lives in
 * view-adtool-activated.js, which calls the factory this file hands it on `window.adtChangeDayPage`.
 * One page, one set of words, one set of sums: the two screens can never come to disagree.
 *
 * The day is a UK day, midnight to midnight, and any past day can be opened from the date box, the
 * previous and next buttons, or the 14-day strip, which is the working archive the owner asked for.
 * The reader is told, on the page and not in a footnote, which changes the tool itself made and which
 * were seen on eBay, because the sync cannot see who changed something on eBay and must never guess.
 *
 * Read-only: nothing on this page is ever sent to eBay. No profit above item level, by the Sales
 * Analysis law; these pages deal in stops, starts, spend, units and hours. Galaxy tokens only, gold
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
    '.cdy-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.cdy-line{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px;font-size:13px;color:var(--text);line-height:1.6}',
    '.cdy-line b{color:var(--text)}',
    '.cdy-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.cdy-tile{flex:1 1 140px;border:1px solid var(--gold-line);border-radius:12px;padding:9px 13px;background:var(--panel-2)}',
    '.cdy-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.cdy-tile .v{font-size:21px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.cdy-tile.gold .v{color:var(--gold-a)}.cdy-tile.loss .v{color:' + LOSS + '}',
    '.cdy-tile .d{font-size:11px;color:var(--text-2);margin-top:2px;line-height:1.45}',
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
    '.cdy-reg{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:6px;white-space:nowrap}'
  ].join(''));

  /* ── the two directions, in the owner's words ─────────────────────────────────────────────────── */
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
  function kindWord(direction, k) {
    var list = KINDS[direction] || [], i;
    for (i = 0; i < list.length; i++) { if (list[i][0] === k) return list[i][1]; }
    list = (KINDS.stopped).concat(KINDS.activated);
    for (i = 0; i < list.length; i++) { if (list[i][0] === k) return list[i][1]; }
    return String(k || '').replace(/_/g, ' ') || 'change';
  }

  /* ── formatters. a figure with nothing behind it prints the empty marker, never a zero ────────── */
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
  /* the explainer hook. Only these four labels have a pattern of their own in the register map, so
     only these four are ever used: an unknown label opens the whole register, which is noise. */
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

  /* ── one page, built for a direction ─────────────────────────────────────────────────────────── */
  function makePage(cfg) {
    cfg = cfg || {};
    var DIR = cfg.direction === 'activated' ? 'activated' : 'stopped';
    var ID = String(cfg.id || ('cdy' + DIR));
    var BODY = ID + 'Body', ACCT = ID + 'Acct', FRESH = ID + 'Fresh', DATE = ID + 'Date';
    var WORD = DIR === 'activated' ? 'started' : 'stopped';
    var S = { day: '', account: '', kind: '', data: null };

    function title() { return cfg.title || (DIR === 'activated' ? 'Activated today' : 'Stopped yesterday'); }
    function sub() {
      return cfg.sub || (DIR === 'activated'
        ? 'Every ad and campaign started on a chosen UK day'
        : 'Every ad and campaign stopped on a chosen UK day');
    }

    function render() {
      return '<div class="cdy-wrap">' + adtHgroup(title(), sub(), FRESH) +
        '<div id="' + ID + 'Day" class="cdy-day"></div>' +
        '<div id="' + ID + 'Strip" class="cdy-strip"></div>' +
        '<div id="' + ACCT + '" class="cdy-filters"></div>' +
        '<div id="' + BODY + '"><div class="cdy-empty">Loading…</div></div></div>';
    }

    function init() {
      dayBar();
      load(false).catch(function () {});
      /* today moves while the page is open; adtPoll skips hidden tabs and stops on an 'auth' refusal */
      adtPoll(BODY, 120000, function () { return shownDay() === adtUkDay() ? load(true) : Promise.resolve(); });
    }

    function shownDay() { return dayOk(S.day) || dayOk(S.data && S.data.day); }

    function load(quiet) {
      var p = {};
      if (dayOk(S.day)) p.day = dayOk(S.day);
      if (S.account) p.account = S.account;
      p.direction = DIR;
      return api('adtoolChangeDay', p).then(function (D) {
        S.data = D || {};
        if (dayOk(S.data.day)) S.day = dayOk(S.data.day);
        if (!$(BODY)) return;
        dayBar();
        acctChips();
        draw();
        adtFreshShow(FRESH, S.data.fresh);
      }).catch(function (e) {
        if (!quiet && $(BODY)) {
          $(BODY).innerHTML = '<div class="cdy-panel"><h3>Not available</h3><div class="cdy-sub">' +
            esc((e && e.message) || 'This page could not load.') + '</div></div>';
        }
        throw e;
      });
    }

    /* ── the day picker and the 14-day working archive ─────────────────────────────────────────── */
    function archive() {
      var A = (S.data && S.data.archive) || [];
      return A.filter(function (a) { return a && dayOk(a.day); });
    }
    function archiveCount(a) { return DIR === 'activated' ? num(a.activated) : num(a.stopped); }
    function dayBar() {
      var el = $(ID + 'Day');
      if (el) {
        var d = shownDay(), today = adtUkDay(), atEnd = !d || d >= today;
        el.innerHTML = '<button class="cdy-btn" data-cdystep="-1"' + (d ? '' : ' disabled') + '>Previous day</button>' +
          '<input type="date" id="' + DATE + '" value="' + esc(d) + '" max="' + esc(today) + '">' +
          '<button class="cdy-btn" data-cdystep="1"' + (atEnd ? ' disabled' : '') + '>Next day</button>' +
          (d === today ? '' : '<button class="cdy-btn go" data-cdyday="' + esc(DIR === 'activated' ? today : dayShift(today, -1)) + '">' +
            (DIR === 'activated' ? 'Today' : 'Yesterday') + '</button>') +
          '<span class="cdy-daytxt">' + esc(d ? dayLong(d) + (d === today ? ' (today)' : '') : 'no day chosen yet') + '</span>';
        var inp = $(DATE);
        if (inp) inp.onchange = function () { var v = dayOk(this.value); if (v) go(v); };
        var bs = el.querySelectorAll('[data-cdystep]');
        for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
          var step = Number(this.getAttribute('data-cdystep')) || 0, base = shownDay() || adtUkDay();
          var next = dayShift(base, step);
          if (next && next <= adtUkDay()) go(next);
        };
        var gs = el.querySelectorAll('[data-cdyday]');
        for (var g = 0; g < gs.length; g++) gs[g].onclick = function () { go(this.getAttribute('data-cdyday')); };
      }
      var strip = $(ID + 'Strip');
      if (!strip) return;
      var A = archive();
      if (!A.length) { strip.innerHTML = ''; return; }
      var cur = shownDay();
      strip.innerHTML = '<span class="cdy-daytxt" style="align-self:center;margin-right:4px">Last ' + A.length + ' days</span>' +
        A.map(function (a) {
          var n = archiveCount(a);
          return '<button class="cdy-chip' + (a.day === cur ? ' on' : '') + '" data-cdyday="' + esc(a.day) + '" title="' +
            esc(dayLong(a.day) + ': ' + cnt(n) + ' ' + WORD) + '">' + esc(dayShort(a.day)) +
            '<span class="n">' + cnt(n) + '</span></button>';
        }).join('');
      var cs = strip.querySelectorAll('[data-cdyday]');
      for (var c = 0; c < cs.length; c++) cs[c].onclick = function () { go(this.getAttribute('data-cdyday')); };
    }
    function go(day) {
      day = dayOk(day); if (!day) return;
      S.day = day; S.kind = '';
      dayBar();
      load(false).catch(function () {});
    }

    /* ── account chips ─────────────────────────────────────────────────────────────────────────── */
    function accountRows() {
      var A = (S.data && S.data.accounts) || [];
      return A.filter(function (a) { return a && typeof a === 'object' && a.account; });
    }
    /* EVERY account, not only the ones with a change on this day. The engine sends the whole list on
       all_accounts for exactly this reason: a chip reloads the page for one account, and the answer it
       sends back then names only that account, so a list built from the answer would strand the reader
       on whichever account they picked first. */
    function accountNames() {
      var all = (((S.data && S.data.all_accounts) || [])
        .map(function (a) { return typeof a === 'string' ? a : (a && a.account); })
        .filter(Boolean));
      if (all.length) return all;
      var names = accountRows().map(function (a) { return a.account; });
      if (!names.length) {
        var seen = {};
        rows().forEach(function (r) { if (r.account && !seen[r.account]) { seen[r.account] = 1; names.push(r.account); } });
        names.sort();
      }
      return names;
    }
    function acctChips() {
      var el = $(ACCT); if (!el) return;
      var by = {};
      accountRows().forEach(function (a) { by[a.account] = num(a.ads); });
      el.innerHTML = '<button class="cdy-chip' + (S.account ? '' : ' on') + '" data-cdya="">All accounts</button>' +
        accountNames().map(function (a) {
          return '<button class="cdy-chip' + (S.account === a ? ' on' : '') + '" data-cdya="' + esc(a) + '">' + esc(a) +
            (by[a] == null ? '' : '<span class="n">' + cnt(by[a]) + '</span>') + '</button>';
        }).join('');
      var bs = el.querySelectorAll('[data-cdya]');
      for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
        S.account = this.getAttribute('data-cdya') || '';
        S.kind = '';
        acctChips();
        /* ASK AGAIN rather than filter what is in hand. The counts above come from the engine and
           cover every change on the day, so filtering here would leave one account's rows sitting
           under the whole fleet's totals; and the engine caps its rows, so asking for one account
           is also the only way to see more of them. */
        load(false).catch(function () {});
      };
    }

    function rows() {
      return ((S.data && S.data.rows) || []).filter(function (r) { return r && typeof r === 'object'; });
    }
    function shownRows() {
      return rows().filter(function (r) {
        if (S.account && String(r.account || '') !== S.account) return false;
        if (S.kind && String(r.kind || '') !== S.kind) return false;
        return true;
      });
    }

    /* ── 1 · the day in one line ───────────────────────────────────────────────────────────────── */
    /* the engine sends the summary; when a field is missing the page counts the same thing from the
       rows it has, so a thin answer still reads as a day rather than as a row of dashes */
    function summary() {
      var raw = (S.data && S.data.summary) || {};
      var R = rows(), ads = 0, items = {}, camps = {}, campLvl = 0, tool = 0, ebay = 0, moved = 0;
      R.forEach(function (r) {
        var id = String(r.item_id || '').trim();
        if (id) { ads++; items[id] = 1; } else { campLvl++; }
        var ck = String(r.campaign_id || r.campaign_name || '');
        if (ck) camps[r.account + '|' + ck] = 1;
        if (String(r.who || '') === 'tool') tool++; else ebay++;
        if (/_(removed|added)$/.test(String(r.kind || '')) && id) moved++;
      });
      var pick = function (k, fallback) { var v = num(raw[k]); return v == null ? fallback : v; };
      /* `campaigns` is how many of the changes were AT campaign level; `campaigns_touched` is how many
         campaigns the day's changes landed in at all. A day of ninety paused ads inside six campaigns
         that were never themselves touched has none of the first and six of the second, so one number
         cannot stand for both and the page names each where it prints it. */
      return {
        ads: pick('ads', ads),
        listings: pick('listings', Object.keys(items).length),
        campaigns: pick('campaigns', campLvl),
        campaigns_touched: pick('campaigns_touched', Object.keys(camps).length),
        removed_or_added: pick('removed_or_added', moved),
        spend_day_before: num(raw.spend_day_before),
        units_day_before: num(raw.units_day_before),
        by_tool: pick('by_tool', tool),
        by_ebay: pick('by_ebay', ebay)
      };
    }
    /* `hook` is the explainer tag ALREADY BUILT by the caller, so the label it carries is a literal
       at the call site where a reader of this file can see which note that tile opens. */
    function tile(k, v, d, cls, hook) {
      return '<div class="cdy-tile ' + (cls || '') + '"><div class="k">' + esc(k) + (hook || '') +
        '</div><div class="v">' + v + '</div><div class="d">' + esc(d) + '</div></div>';
    }
    function oneLine(T) {
      var d = shownDay(), today = adtUkDay();
      var when = d ? dayLong(d) + (d === today ? ' (today)' : (d === dayShift(today, -1) ? ' (yesterday)' : '')) : 'this day';
      var h = '<div class="cdy-line"><b>' + esc(when) + '.</b> ' +
        (n0(T.ads) || n0(T.campaigns)
          ? cnt(T.ads) + ' ' + plural(T.ads, 'ad was ', 'ads were ') + WORD + ' on ' + cnt(T.listings) + ' ' +
            plural(T.listings, 'listing', 'listings') + ' across ' + cnt(T.campaigns_touched) + ' ' +
            plural(T.campaigns_touched, 'campaign', 'campaigns') +
            (n0(T.campaigns) ? ', and ' + cnt(T.campaigns) + ' ' + plural(T.campaigns, 'campaign was', 'campaigns were') + ' ' + WORD + ' outright' : '') +
            esc(S.account ? ', on ' + S.account : '') + '. '
          : 'Nothing was ' + WORD + ' on this day' + esc(S.account ? ' on ' + S.account : '') + '. ');
      if (T.spend_day_before != null || T.units_day_before != null) {
        h += 'Over the 7 days before, those listings were spending <b>' + gbp(T.spend_day_before) + ' a day</b> and selling <b>' +
          unitsWord(T.units_day_before) + ' a day</b>. ';
      }
      h += 'The tool made <b>' + cnt(T.by_tool) + '</b> of the changes and <b>' + cnt(T.by_ebay) +
        '</b> ' + plural(T.by_ebay, 'was', 'were') + ' seen on eBay.</div>';
      return h;
    }
    /* the hook label is a LITERAL at every call site: the explainer resolves it through the shell's
       map of label to note, and a label that is assembled somewhere else cannot be checked. */
    function tiles(T) {
      return '<div class="cdy-tiles">' +
        tile(DIR === 'activated' ? 'Ads started' : 'Ads stopped', cnt(T.ads), 'changes at ad level', DIR === 'activated' ? 'gold' : 'loss', reg('changes on this day', 'how')) +
        tile('Listings', cnt(T.listings), 'listings behind those ads', '', reg('changes on this day', 'how')) +
        tile('Campaigns', cnt(T.campaigns_touched),
          'campaigns the changes landed in' + (n0(T.campaigns) ? ', ' + cnt(T.campaigns) + ' ' + plural(T.campaigns, 'change was', 'changes were') + ' to a campaign itself' : ''), '', reg('changes on this day', 'how')) +
        tile(DIR === 'activated' ? 'Added to campaigns' : 'Taken out of campaigns', cnt(T.removed_or_added),
          DIR === 'activated' ? 'ads that joined a campaign' : 'ads that left a campaign', '', reg('changes on this day', 'how')) +
        tile('Was spending a day', gbp(T.spend_day_before), 'those listings, over the 7 days before', 'gold', reg('the 7 days before', 'how')) +
        tile('Was selling a day', unitsNum(T.units_day_before), 'units a day, over the 7 days before', '', reg('the 7 days before', 'how')) +
        '</div>';
    }
    /* the split a manager asks for first, so it is a panel of its own and not a line in a table */
    function whoBlock(T) {
      var t = n0(T.by_tool), e = n0(T.by_ebay), tot = t + e;
      var pct = tot > 0 ? Math.round(t / tot * 100) : 0;
      return '<div class="cdy-panel"><h3>Who made these changes' + reg('who changed it', 'how') + '</h3>' +
        '<div class="cdy-sub">Our own tool against everything else. The portal cannot see who made a change on eBay, so those are never put to a name.</div>' +
        (tot > 0 ? '<div class="cdy-split"><span class="t" style="width:' + pct + '%"></span><span class="e" style="width:' + (100 - pct) + '%"></span></div>' : '') +
        '<div class="cdy-who">' +
        '<div class="cdy-whoc tool"><div class="k">The tool made</div><div class="v">' + cnt(t) + '</div>' +
        '<div class="d">' + (tot > 0 ? pct + '% of the day' : 'nothing yet') + ', written in its own log with the operation and whether it was sent</div></div>' +
        '<div class="cdy-whoc"><div class="k">Seen on eBay</div><div class="v">' + cnt(e) + '</div>' +
        '<div class="d">' + (tot > 0 ? (100 - pct) + '% of the day' : 'nothing yet') + ', found by the sync comparing eBay against the last read, so the portal cannot see who</div></div>' +
        '</div></div>';
    }

    /* ── 2 · by account ────────────────────────────────────────────────────────────────────────── */
    function accountPanel(T) {
      var A = accountRows();
      if (!A.length) return '';
      var sums = { ads: 0, campaigns: 0, touched: 0, listings: 0, spend: 0, haveSpend: false };
      A.forEach(function (a) {
        sums.ads += n0(a.ads); sums.campaigns += n0(a.campaigns); sums.touched += n0(a.campaigns_touched); sums.listings += n0(a.listings);
        var v = num(a.spend_day_before); if (v != null) { sums.spend += v; sums.haveSpend = true; }
      });
      return '<div class="cdy-panel"><h3>By account</h3>' +
        '<div class="cdy-sub">The same day, account by account.</div>' +
        '<div class="cdy-scroll"><table class="cdy-tbl"><thead><tr><th>Account</th>' +
        '<th class="r">' + (DIR === 'activated' ? 'Ads started' : 'Ads stopped') + '</th>' +
        '<th class="r" title="campaigns the day\'s changes landed in, counted once each">Campaigns touched</th>' +
        '<th class="r" title="changes to a campaign itself rather than to one of its ads">Campaign changes</th>' +
        '<th class="r">Listings</th><th class="r">Was spending a day</th></tr></thead><tbody>' +
        A.slice().sort(function (x, y) { return n0(y.ads) - n0(x.ads); }).map(function (a) {
          return '<tr><td><b>' + esc(a.account) + '</b></td><td class="r">' + cnt(a.ads) + '</td>' +
            '<td class="r">' + cnt(a.campaigns_touched) + '</td><td class="r">' + cnt(a.campaigns) + '</td>' +
            '<td class="r">' + cnt(a.listings) + '</td>' +
            '<td class="r">' + gbp(a.spend_day_before) + '</td></tr>';
        }).join('') +
        '<tr class="cdy-tot"><td>All accounts</td><td class="r">' + cnt(num(T.ads) != null ? T.ads : sums.ads) + '</td>' +
        '<td class="r">' + cnt(num(T.campaigns_touched) != null ? T.campaigns_touched : sums.touched) + '</td>' +
        '<td class="r">' + cnt(num(T.campaigns) != null ? T.campaigns : sums.campaigns) + '</td>' +
        '<td class="r">' + cnt(num(T.listings) != null ? T.listings : sums.listings) + '</td>' +
        '<td class="r">' + (num(T.spend_day_before) != null ? gbp(T.spend_day_before) : (sums.haveSpend ? gbp(sums.spend) : '—')) + '</td></tr>' +
        '</tbody></table></div></div>';
    }

    /* ── 3 · the 14 days, the same counts as the strip above ───────────────────────────────────── */
    function archivePanel() {
      var A = archive();
      if (A.length < 2) return '';
      var pts = A.slice().reverse().map(function (a) {
        var n = archiveCount(a);
        return {
          label: dayShort(a.day), value: n0(n), strong: a.day === shownDay(),
          title: dayLong(a.day) + ': ' + cnt(num(a.stopped)) + ' stopped, ' + cnt(num(a.activated)) + ' started'
        };
      });
      return '<div class="cdy-panel"><h3>The last ' + A.length + ' days' + reg('the change archive', 'how') + '</h3>' +
        '<div class="cdy-sub">How many ads and campaigns were ' + WORD + ' each day. Click a day above to open it.</div>' +
        chartBars(pts, { height: 150, fmt: chartNum, everyNth: 1 }) + '</div>';
    }

    /* ── 4 · the list ──────────────────────────────────────────────────────────────────────────── */
    function kindChips() {
      var R = rows().filter(function (r) { return !S.account || String(r.account || '') === S.account; });
      var counts = {}, order = [];
      R.forEach(function (r) {
        var k = String(r.kind || '');
        if (counts[k] == null) { counts[k] = 0; order.push(k); }
        counts[k]++;
      });
      var known = (KINDS[DIR] || []).map(function (x) { return x[0]; });
      var list = known.filter(function (k) { return counts[k]; }).concat(order.filter(function (k) { return known.indexOf(k) < 0; }));
      if (!list.length) return '';
      return '<div class="cdy-filters"><button class="cdy-chip' + (S.kind ? '' : ' on') + '" data-cdyk="">Everything<span class="n">' +
        cnt(R.length) + '</span></button>' + list.map(function (k) {
          return '<button class="cdy-chip' + (S.kind === k ? ' on' : '') + '" data-cdyk="' + esc(k) + '">' +
            esc(kindWord(DIR, k)) + '<span class="n">' + cnt(counts[k]) + '</span></button>';
        }).join('') + '</div>';
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
      var k = String(r.kind || '');
      var cls = DIR === 'activated' ? 'on' : 'off';
      var h = '<span class="cdy-kind ' + cls + '">' + esc(kindWord(DIR, k)) + '</span>';
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
      var wasSelling = n0(r.before && r.before.units_day) > 0;
      var cls = DIR === 'activated' ? 'start' : (wasSelling ? 'sold' : '');
      var live = r.live_now;
      return '<tr class="' + cls + '"><td class="cdy-when">' + esc(ukClock(r)) + '</td>' +
        '<td>' + whatCell(r) + '</td>' +
        '<td>' + subjectCell(r) + '</td>' +
        '<td>' + campaignCell(r) + '</td>' +
        '<td>' + whoCell(r) + '</td>' +
        '<td>' + decisionCell(r) + '</td>' +
        '<td>' + beforeCell(r) + '</td>' +
        '<td>' + (live == null ? '<span class="cdy-sm2">not known</span>'
          : '<span class="cdy-tag ' + (live ? 'live' : 'gone') + '">' + (live ? 'live now' : 'not live') + '</span>') + '</td></tr>';
    }
    function listPanel() {
      var R = shownRows();
      var head = '<thead><tr><th>UK time</th><th>What happened</th><th>Listing or campaign</th>' +
        '<th>Campaign</th><th>Who or what</th><th>That morning</th><th>The 7 days before</th>' +
        '<th>Live now</th></tr></thead>';
      var h = '<div class="cdy-panel"><h3>' + (DIR === 'activated' ? 'Everything started' : 'Everything stopped') + '</h3>' +
        '<div class="cdy-sub">Newest first' + (S.account ? ', on ' + esc(S.account) : ', grouped by account') + '. ' +
        (DIR === 'activated'
          ? 'A gold edge marks a start, so a listing that was losing money and is now running again stands out.'
          : 'A red edge marks a listing that was selling before it was stopped.') + '</div>';
      if (!R.length) {
        return h + '<div class="cdy-empty">' + (rows().length
          ? 'Nothing in this filter on this day.'
          : 'Nothing was ' + WORD + ' on this day.') + '</div></div>';
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
      return h + '<div class="cdy-scroll"><table class="cdy-tbl">' + head + '<tbody>' + body + '</tbody></table></div></div>';
    }

    /* ── 5 · honesty ───────────────────────────────────────────────────────────────────────────── */
    function honesty() {
      var D = S.data || {}, h = '<div class="cdy-honest"><h3>How to read this day</h3>';
      var held = num(D.rows_held_back), total = num(D.rows_total);
      h += '<p><b>The day.</b> This page covers a UK day, midnight to midnight' +
        (shownDay() ? ' on ' + esc(dayLong(shownDay())) : '') + '.' +
        (D.uk_bounds && (D.uk_bounds.from_utc || D.uk_bounds.to_utc)
          ? ' The changes are the ones recorded from ' + esc(utcClock(D.uk_bounds.from_utc)) + ' to ' +
            esc(utcClock(D.uk_bounds.to_utc)) + ' UTC, which is that UK day.'
          : '') + '</p>';
      if (held != null && held > 0) {
        h += '<p><b>' + cnt(held) + ' ' + plural(held, 'change is', 'changes are') + ' not on the page.</b> ' +
          'The newest ' + cnt(total != null ? Math.max(0, total - held) : rows().length) + ' are shown. ' +
          'The counts above cover every change on the day, shown or not. Choose one account to see more of them.</p>';
      }
      h += '<p><b>Who changed something.</b> A change is put to the tool only when the log the tool keeps of its ' +
        'own actions holds it for the same listing or campaign on the same UK day. Everything else was found by comparing eBay against ' +
        'the last read, and the portal cannot see who made it, so no name is ever guessed.</p>';
      var matched = rows().filter(function (r) { return String(r.campaign_id_source || '') === 'matched by name'; }).length;
      if (matched > 0) {
        h += '<p><b>' + cnt(matched) + ' campaign ' + plural(matched, 'link is', 'links are') + ' matched by name.</b> ' +
          'Older campaign changes were recorded with the campaign name and no id, so the link is found by matching ' +
          'that name within the account. Each one is marked on its row.</p>';
      }
      h += '<p>Nothing on this page is ever sent to eBay.' +
        (D.computed_at ? ' Worked out at ' + esc(utcClock(D.computed_at)) + ' UTC.' : '') + '</p>';
      return h + '</div>';
    }

    /* ── draw and wire ─────────────────────────────────────────────────────────────────────────── */
    function draw() {
      var box = $(BODY); if (!box) return;
      var D = S.data || {}, T = summary();
      var h = '<div class="cdy-top"><span><b>' + esc(title()) + '</b></span><span>·</span>' +
        '<span>' + esc(shownDay() ? dayLong(shownDay()) : 'no day chosen yet') + '</span><span>·</span>' +
        '<span>' + esc(S.account || 'all accounts') + '</span><span>·</span>' +
        '<span>' + cnt(num(D.rows_total) != null ? D.rows_total : rows().length) + ' ' +
        plural(num(D.rows_total) != null ? D.rows_total : rows().length, 'change', 'changes') + '</span></div>';
      h += oneLine(T);
      h += tiles(T);
      h += whoBlock(T);
      h += accountPanel(T);
      h += archivePanel();
      h += kindChips();
      h += listPanel();
      h += honesty();
      box.innerHTML = h;
      var ks = box.querySelectorAll('[data-cdyk]');
      for (var i = 0; i < ks.length; i++) ks[i].onclick = function () {
        var k = this.getAttribute('data-cdyk') || '';
        S.kind = S.kind === k ? '' : k;
        draw();
      };
      var ds = box.querySelectorAll('[data-cdyday]');
      for (var j = 0; j < ds.length; j++) ds[j].onclick = function () { go(this.getAttribute('data-cdyday')); };
    }

    return { render: render, init: init, direction: DIR };
  }

  /* view-adtool-activated.js registers the other direction off this factory. Both files are spliced
     into both portals, so the classes above are always present wherever the factory is used. */
  window.adtChangeDayPage = makePage;

  var STOPPED = makePage({
    id: 'cdyS', direction: 'stopped', title: 'Stopped yesterday',
    sub: 'Every ad and campaign stopped on a chosen UK day'
  });

  VIEWS.adtoolStopped = {
    label: 'Stopped yesterday', hidden: true, order: 94, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    render: STOPPED.render,
    init: STOPPED.init
  };
})();
