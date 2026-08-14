/* view-recheck.js — §11.1/§11.2 the four-stage order recheck · §11.3 wrong orders.
 * Views: recheck (Order rechecking) · wrongOrders (Wrong orders).
 * Backend: recheckQueue · submitRecheck · logWrongOrder · wrongOrderCounters · accountList · assignableStaff.
 *
 * REALITY WINS, and this screen says so out loud instead of picking a side. §11.1 describes the
 * checkpoints as 4 / 2 / 1 / 3 days; the live 2026 workbook's own two date columns differ by
 * 4 / 6 / 7 / 11 days. Recheck.gs computes reference dates from CONFIG (seeded with the spec's
 * meaning) and sends BOTH numbers on every row — config_offset_days and sheet_offset_days — so the
 * offset band below prints the arithmetic the row in front of the processor actually follows, and
 * flags the disagreement rather than hiding it.
 *
 * Every vocabulary on this screen arrives from the server, never from this file: STATUS dropdowns
 * (status_options), the Rechecked By names (checker_options), and the per-account column headers
 * (account_columns — rendered with their trailing spaces intact, because UK Second Check repeats
 * the same eight accounts in a second block with different casing and only the exact string keeps
 * the two blocks apart). This file is served from a public URL (RL-2/RL-9), so no staff name, no
 * email and no account name is written into it — not in the code and not in these comments. */
(function () {
  'use strict';

  /* Nav gating only — Recheck.gs is the sole authority and re-checks every call (RL-1/RL-4).
     recheckMayCheck_ = Order Processor · Team Lead · Management/Ops Head (+ super admins). */
  var RC_ROLES = ['Order Processor', 'Management', 'Ops Head', 'Team Lead'];
  /* recheckOversees_ — who may file for someone else and who sees everyone's counters (§12.1). */
  var RC_OVERSEE = ['Management', 'Ops Head', 'Team Lead'];

  var RC_TZ = 'Asia/Karachi';                     // RECHECK_TZ — staff-facing dates are PKT (§2)
  var RC_ORDER_RE = /^\d{2}-\d{5}-\d{5}$/;        // wrongOrderId_ — eBay order numbers
  var RC_ALI_RE = /^\d{10,20}$/;                  // wrongOrderAliId_ — the live rows are 16 digits

  /* What each stage is FOR, in the processor's words. The four keys are Recheck.gs's own stage
     keys; the section heading is the tab name the server sends, so a tab renamed in the workbook
     renames the section here too. The wording follows §11.1 and the columns' own headers. */
  var RC_WHAT = {
    china: {
      n: 'Stage 1 · China',
      check: 'Did the order leave China?',
      focus: 'The comment column is headed “Focus on LR (Cancel) & AP (Cainiao)” — LR cancellations and Cainiao movements are what it was made for. It has never once been filled on the live sheet, so it is offered here, not demanded.',
      dates: 'Orders placed the configured number of days before today — the ones that should be moving by now.'
    },
    uk1: {
      n: 'Stage 2 · UK first check',
      check: 'Is the order with a courier yet?',
      focus: 'One comment for all accounts. On the live tab the per-account texts sit in unheaded columns whose account order rotates from day to day, so there is no column this screen could safely write an account into — the sheet keeps its single “All Accounts Rechecked By” signature and one free-text line.',
      dates: 'Orders that should have reached a courier by today.'
    },
    uk2: {
      n: 'Stage 3 · UK second check',
      check: 'With a courier — plus the three-days-after-delivery follow-up.',
      focus: 'One box per account, in the sheet\'s own column order and spelling. The live cells read like “13 order · 2 in custom · local delivery” — counts and states in free text, so write them the way the tab already reads.',
      dates: 'Two reference dates on one row: the courier check and the delivery follow-up.'
    },
    uk3: {
      n: 'Stage 4 · UK 3rd check',
      check: 'Three days after delivery — did everything land?',
      focus: 'This tab records two words per account and nothing else. The dropdown below carries exactly the values the sheet uses.',
      dates: 'Orders delivered the configured number of days ago.'
    }
  };

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.rc-in,.rc-sel,.rc-ta{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.rc-ta{resize:vertical;min-height:62px}' +
    '.rc-in:focus,.rc-sel:focus,.rc-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.rc-in.rc-mono{font-family:var(--mono);letter-spacing:.05em}' +
    '.rc-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}' +
    '.rc-sub{font-size:11.5px;color:var(--text-3);font-weight:700;line-height:1.5}' +
    '.rc-stage{margin-top:16px}' +
    '.rc-n{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--text-3)}' +
    '.rc-tab{font-weight:800;font-size:14px;word-break:break-word}' +
    '.rc-what{font-size:12.5px;font-weight:700;color:var(--text-2);margin-top:3px}' +
    '.rc-off{margin-top:2px;border:1px solid var(--gold-line);border-radius:10px;background:rgba(120,132,152,.07);padding:12px 13px}' +
    '[data-theme="ivory"] .rc-off{background:rgba(255,255,255,.55)}' +
    '.rc-flow{display:flex;flex-wrap:wrap;align-items:center;gap:10px}' +
    '.rc-fd{border:1px solid var(--gold-line);border-radius:10px;padding:7px 11px;background:var(--panel);min-width:0}' +
    '.rc-fd .k{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.rc-fd b{display:block;font-size:13.5px;font-weight:800;margin-top:2px;word-break:break-word}' +
    '.rc-ar{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--blue-2);border:1px solid rgba(61,155,240,.35);background:var(--blue-soft);border-radius:99px;padding:5px 12px;white-space:nowrap}' +
    '.rc-key{font-family:var(--mono);font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:9px;word-break:break-all}' +
    '.rc-dis{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,159,67,.42);background:var(--warn-soft);font-size:12px;font-weight:700;color:var(--text-2);line-height:1.55}' +
    '.rc-dis b{color:var(--warn)}' +
    '.rc-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:12px}' +
    '.rc-acc{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:10px}' +
    '.rc-acc .field{margin-top:0}' +
    '.rc-acc label{white-space:pre-wrap}' +
    '.rc-box{margin-top:12px;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line);background:rgba(120,132,152,.08);font-size:12.5px;font-weight:600;color:var(--text-2);line-height:1.6}' +
    '.rc-box .k{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.rc-box.rc-blue{background:var(--blue-soft);border-color:rgba(61,155,240,.30)}' +
    '.rc-box.rc-blue .k{color:var(--blue-2)}' +
    '.rc-box.rc-gold{background:linear-gradient(135deg,rgba(233,169,60,.14),rgba(233,169,60,.03));border-color:var(--gold-line-hi)}' +
    '.rc-box.rc-gold .k{color:var(--gold-a)}' +
    '.rc-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.rc-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.rc-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}' +
    '.rc-tile{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px}' +
    '.rc-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.rc-tile b{display:block;font-size:22px;font-weight:800;margin-top:5px;letter-spacing:-.01em}' +
    '.rc-tile.rc-gold{background:linear-gradient(135deg,rgba(233,169,60,.13),rgba(233,169,60,.02));border-color:var(--gold-line-hi)}' +
    '.rc-tile.rc-gold b{color:var(--gold-a)}' +
    '.rc-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:520px}' +
    '.rc-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.rc-tbl td{padding:9px 12px;border-bottom:1px solid var(--gold-line);vertical-align:middle;word-break:break-word}' +
    '.rc-tbl td.rc-c1{font-weight:800;width:34%}' +
    '.rc-meter{position:relative;height:7px;border-radius:99px;background:rgba(120,132,152,.22);overflow:hidden;min-width:70px}' +
    '.rc-meter i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,rgba(120,132,152,.55),rgba(120,132,152,.85))}' +
    '.rc-meter.rc-g i{background:linear-gradient(90deg,var(--gold-c),var(--gold-a));box-shadow:0 0 10px rgba(233,169,60,.45)}' +
    '.pill.rc-p-done{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.rc-p-open{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.rc-p-off{background:rgba(120,132,152,.16);color:var(--text-3)}' +
    '.pill.rc-p-warn{background:var(--warn-soft);color:var(--warn)}' +
    '@media (max-width:880px){.rc-grid,.rc-acc{grid-template-columns:1fr}.rc-flow{gap:8px}.rc-fd{width:100%}}'
  );

  // ---------- safety (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function rcAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function rcStr(v) { return String(v == null ? '' : v).trim(); }
  function rcRaw(v) { return String(v == null ? '' : v); }
  function rcNorm(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function rcNum(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function rcHas(arr, v) { return arr.indexOf(v) >= 0; }
  function rcRole() { return (STATE.user && STATE.user.role) || ''; }
  function rcOversees() { return rcHas(RC_OVERSEE, rcRole()); }

  function rcPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) { return els[i]; } }
    return null;
  }

  /** Today in Pakistan time, whatever timezone the device is in. Only a first paint value — the
   *  date the queue answers with is the server's own and replaces it the moment it lands. */
  function rcToday() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: RC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch (e) { return ''; }
  }
  /** A yyyy-MM-dd printed the way the team reads a date, with the day name that makes an offset
   *  obvious at a glance ("Thu 6 Aug"). Never a locale guess about which number is the month. */
  function rcNice(ymd) {
    var s = rcStr(ymd), t;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) { return s; }
    t = Date.parse(s + 'T12:00:00Z');
    if (isNaN(t)) { return s; }
    try { return new Date(t).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }); }
    catch (e) { return s; }
  }
  function rcMonthNice(key) {
    var s = rcStr(key), t;
    if (!/^\d{4}-\d{2}$/.test(s)) { return s; }
    t = Date.parse(s + '-15T12:00:00Z');
    if (isNaN(t)) { return s; }
    try { return new Date(t).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }); }
    catch (e) { return s; }
  }
  function rcDays(n) {
    var v = rcNum(n);
    return v === 1 ? '1 day' : v + ' days';
  }
  function rcOptions(list, chosen, blank) {
    var out = blank ? '<option value="">' + esc(blank) + '</option>' : '', i, v;
    for (i = 0; i < (list || []).length; i++) {
      v = rcRaw(list[i]);
      out += '<option value="' + rcAttr(v) + '"' + (rcStr(v) === rcStr(chosen) ? ' selected' : '') + '>' + esc(v) + '</option>';
    }
    return out;
  }

  // ---------- module state ----------
  var RC_DATE = '';           // the day the queue is showing, PKT
  var RC_STAGES = [];         // last recheckQueue payload, stage by stage
  var RC_NOTE = '';           // the server's own sentence about the two arithmetics
  var RC_ME = '';             // the sheet-checker name the server matched this user to
  var RC_CHECKERS = [];       // Rechecked By / Processed By vocabulary — always from the server
  var RC_ACCOUNTS = [];       // eBay accounts from CONNECTIONS (accountList)
  var RC_STAFF = [];          // approved portal people (assignableStaff), for the accountability line
  var WO_MONTH = '';          // yyyy-MM filter on the counters, '' = every month the workbook holds

  function rcCount(n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts.recheck = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  // ============================== §11.1 ORDER RECHECKING ==============================
  VIEWS.recheck = {
    label: 'Order rechecking',
    icon: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/><path d="m9 12 2 2 4-4"/>',
    roles: RC_ROLES,
    order: 28,
    prefetch: function () {
      return api('recheckQueue', {}).then(function (d) { if (typeof cacheWrite === 'function') { cacheWrite('recheckQueue', {}, d); } });
    },
    badge: function () { return (STATE.counts && STATE.counts.recheck) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Order rechecking</h1>' +
          '<span class="sub">Four stages, one row a day — Pakistan time</span>' +
          '<input class="rc-in rc-date" id="rcDate" type="date" style="width:auto;margin-left:auto" value="' + rcAttr(rcToday()) + '">' +
          '<button class="minibtn" id="rcRefresh">Refresh</button>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">Why today’s list holds these orders ' +
          '<span class="hint">§11.1 — the day offset, stage by stage</span></div>' +
          '<div class="bd" id="rcWhy"><div class="spinner"></div></div>' +
        '</div>' +
        '<div id="rcEngine"></div>' +
        '<div id="rcStages"><div class="card enter d2" style="margin-top:16px"><div class="bd"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
      $('rcRefresh').onclick = function () { rcLoad(); };
      $('rcDate').onchange = function () { rcLoad(); };
      enhanceDate($('rcDate'), { kind: 'day' });
      rcLoad();
    }
  };

  function rcLoad() {
    var box = $('rcStages'), why = $('rcWhy'), want = rcStr($('rcDate') ? $('rcDate').value : '');
    if (!box) { return; }
    var rq = cachedCall('recheckQueue', want ? { date: want } : {}, function (d) {
      RC_DATE = rcStr(d && d.date);
      RC_NOTE = rcStr(d && d.offset_note);
      RC_ME = rcStr(d && d.me);
      RC_STAGES = (d && d.stages) || [];
      if ($('rcDate') && RC_DATE) { $('rcDate').value = RC_DATE; }
      if (why) { why.innerHTML = rcWhyPanel(); }
      box.innerHTML = RC_STAGES.length ? RC_STAGES.map(rcStageCard).join('') :
        '<div class="card enter d2" style="margin-top:16px"><div class="bd"><div class="rc-empty">No stage answered for this day.' +
        '<span>The Order Rechecking workbook is registered in CONNECTIONS — until it is, every stage reads “not connected yet”.</span></div></div></div>';
      rcWire(box);
      rcCount(rcOpenCount());
      rcEngineFeed();
    });
    if (!rq.painted) { box.innerHTML = '<div class="card enter d2" style="margin-top:16px"><div class="bd"><div class="spinner"></div></div></div>'; }
    rq.done.catch(function (e) {
      if (why) { why.innerHTML = '<div class="rc-empty">Offsets not loaded.<span>' + esc(e.message) + '</span></div>'; }
      box.innerHTML = '<div class="card enter d2" style="margin-top:16px"><div class="bd"><div class="rc-empty">The recheck queue could not be loaded just now.' +
        '<span>' + esc(e.message) + '</span><button class="minibtn" id="rcRetry" style="margin-top:10px">Try again</button></div></div></div>';
      var r = $('rcRetry');
      if (r) { r.onclick = function () { rcLoad(); }; }
    });
  }

  /** Engine eyes (§3 recheckFeed): the concrete orders behind each checkpoint, live from eBay —
   * which orders sit on each reference date and which STILL lack tracking. Best-effort: the
   * sheet flow above never waits on this, and an Engine outage just leaves the card out. */
  function rcEngineFeed() {
    var host = $('rcEngine');
    if (!host) { return; }
    var offs = {};
    RC_STAGES.forEach(function (s) {
      if (s.config_offset_days !== undefined) { offs[rcStr(s.stage)] = rcNum(s.config_offset_days); }
    });
    var payload = { date: RC_DATE || rcStr($('rcDate') && $('rcDate').value) };
    ['china', 'uk1', 'uk2', 'uk3'].forEach(function (k) { if (offs[k] !== undefined) { payload[k] = offs[k]; } });
    api('recheckFeed', payload).then(function (d) {
      var stages = (d && d.stages) || [];
      var names = { china: 'CHINA', uk1: 'UK First Check', uk2: 'UK Second Check', uk3: 'UK 3rd Check' };
      var rows = '';
      stages.forEach(function (s) {
        var accs = s.accounts || [];
        var total = 0, bad = 0, focus = [];
        accs.forEach(function (a) {
          total += rcNum(a.orders); bad += rcNum(a.no_tracking);
          (a.focus || []).forEach(function (f) { focus.push({ acc: a.account, f: f }); });
        });
        var chips = accs.map(function (a) {
          return '<span class="pill ' + (rcNum(a.no_tracking) ? 'rc-p-warn' : 'rc-p-ok') + '">' + esc(rcStr(a.account)) + ' ' + rcNum(a.orders) +
            (rcNum(a.no_tracking) ? ' · ' + rcNum(a.no_tracking) + ' no tracking' : '') + '</span>';
        }).join(' ');
        var det = '';
        if (focus.length) {
          det = '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--bad)">' +
            focus.length + ' order(s) still without tracking on eBay — the focus list</summary><div style="margin-top:6px">';
          focus.slice(0, 40).forEach(function (x) {
            det += '<div style="padding:4px 0;border-bottom:1px solid var(--gold-line);font-size:12px">' +
              '<span class="mono">' + esc(rcStr(x.f.order_id)) + '</span> · ' + esc(rcStr(x.acc)) + ' · ' +
              esc(rcStr(x.f.title) || rcStr(x.f.item_id)) + ' · <b>' + esc(rcStr(x.f.status) || 'no status') + '</b></div>';
          });
          det += '</div></details>';
        }
        var second = '';
        if (s.reference_date2) {
          var t2 = 0;
          (s.accounts2 || []).forEach(function (a) { t2 += rcNum(a.orders); });
          second = '<div style="font-size:12px;color:var(--text-3);margin-top:3px">+ the 3-days-after-delivery column: <b class="num">' + t2 + '</b> order(s) expected delivered by ' + esc(rcNice(s.reference_date2)) + '</div>';
        }
        rows += '<div class="tl-row" style="display:block;padding:8px 0">' +
          '<div><span class="k">' + esc(names[s.stage] || s.stage) + '</span> orders from <b class="num">' + esc(rcNice(s.reference_date)) + '</b>' +
          ' — ' + total + ' order(s)' + (bad ? ', <b style="color:var(--bad)">' + bad + ' without tracking</b>' : total ? ', all carry tracking' : '') + '</div>' +
          second + (chips ? '<div style="margin-top:5px">' + chips + '</div>' : '') + det + '</div>';
      });
      host.innerHTML = '<div class="card enter d2" style="margin-top:16px"><div class="hd">Engine eyes — the real orders behind each checkpoint ' +
        '<span class="hint">live from eBay · refreshed with each sync</span></div><div class="bd">' + rows +
        '<div class="rc-sub" style="margin-top:6px;font-size:11px">' + esc(rcStr(d && d.note)) + '</div></div></div>';
    }).catch(function () { host.innerHTML = ''; });
  }

  /** A stage still waiting on this user: connected, today's row exists, it is theirs, nothing filed. */
  function rcOpenCount() {
    var n = 0, i, s;
    for (i = 0; i < RC_STAGES.length; i++) {
      s = RC_STAGES[i];
      if (s.connected && s.present && s.mine !== false && !s.checked) { n++; }
    }
    return n;
  }

  // ---------- the offset panel (§11.1 vs the live workbook) ----------
  function rcWhyPanel() {
    var rows = [], i, s, cfg, ref;
    for (i = 0; i < RC_STAGES.length; i++) {
      s = RC_STAGES[i];
      cfg = s.config_offset_days;
      ref = rcStr(s.reference_date_expected) || rcStr(s.reference_date);
      rows.push('<div class="tl-row"><span class="k">' + esc(rcStr(s.tab)) + '</span>' +
        '<span>' + (cfg === undefined ? '<span class="rc-sub">not connected yet</span>' :
          'orders from <b class="num">' + esc(rcNice(ref)) + '</b> — <b>' + esc(rcDays(cfg)) + '</b> back' +
          (s.offset_disagreement ? ' <span class="pill rc-p-warn">the sheet says ' + esc(rcDays(s.sheet_offset_days)) + '</span>' : '')) +
        '</span></div>');
    }
    return '<div class="rc-box rc-blue"><span class="k">Checked on ' + esc(rcNice(RC_DATE)) + ' · ' + esc(RC_DATE) + '</span>' +
        esc(RC_NOTE || 'Reference dates come from CONFIG; the workbook’s own columns may differ.') +
      '</div>' +
      (rows.length ? '<div style="margin-top:6px">' + rows.join('') + '</div>' : '') +
      '<div class="rc-box"><span class="k">Where the two numbers come from</span>' +
        'The spec sets the checkpoints at 4 / 2 / 1 / 3 days. The live 2026 workbook’s own two date columns sit 4 / 6 / 7 / 11 days apart — its headers describe what the check means, the cells describe what was typed. ' +
        'The portal computes from CONFIG so Management can retune a checkpoint without a code change, and prints the sheet’s own number beside it wherever the two disagree. Neither is quietly chosen for you.' +
      '</div>';
  }

  // ---------- one stage ----------
  function rcStageCard(s) {
    var key = rcStr(s.stage);
    var what = RC_WHAT[key] || { n: 'Stage', check: rcStr(s.label), focus: '', dates: '' };
    var delay = key === 'china' ? ' d1' : (key === 'uk1' ? ' d2' : ' d3');
    return '<div class="card rc-stage enter' + delay + '"><div class="hd">' +
        '<span><span class="rc-n">' + esc(what.n) + '</span>' +
          '<span class="rc-tab">' + esc(rcStr(s.tab) || 'Stage') + '</span></span>' +
        rcStagePill(s) +
      '</div><div class="bd">' +
        '<div class="rc-what">' + esc(what.check) + '</div>' +
        '<div class="rc-what rc-sub" style="margin-bottom:11px">' + esc(rcStr(s.label)) + '</div>' +
        rcOffsetBand(s, what) +
        rcStageBody(s, key) +
      '</div></div>';
  }

  function rcStagePill(s) {
    if (!s.connected) { return '<span class="pill rc-p-off">not connected yet</span>'; }
    if (s.mine === false) { return '<span class="pill rc-p-off">' + esc(rcStr(s.claimed_by) || 'another checker') + '</span>'; }
    if (!s.present) { return '<span class="pill rc-p-warn">no row for this day</span>'; }
    if (s.checked) { return '<span class="pill rc-p-done">Rechecked</span>'; }
    return '<span class="pill rc-p-open">Open</span>';
  }

  /** The whole point of this screen: which orders today's row is about, and by which arithmetic. */
  function rcOffsetBand(s, what) {
    var cfg, out;
    if (!s.connected || s.config_offset_days === undefined) {
      return '<div class="rc-off"><div class="rc-sub">' + esc(what.dates || '') + '</div></div>';
    }
    cfg = s.config_offset_days;
    out = '<div class="rc-off">' +
      '<div class="rc-flow">' +
        '<span class="rc-fd"><span class="k">Checked on</span><b class="num">' + esc(rcNice(RC_DATE)) + '</b></span>' +
        '<span class="rc-ar">− ' + esc(rcDays(cfg)) + '</span>' +
        '<span class="rc-fd"><span class="k">Orders from</span>' +
          '<b class="num">' + esc(rcNice(rcStr(s.reference_date_expected))) + '</b></span>' +
      '</div>' +
      '<div class="rc-key">CONFIG ' + esc(rcStr(s.config_offset_key)) + ' = ' + esc(String(cfg)) + ' — Management retunes it in CONFIG, no code change</div>';

    if (s.delivery_offset_days !== undefined) {
      out += '<div class="rc-flow" style="margin-top:10px">' +
          '<span class="rc-fd"><span class="k">Checked on</span><b class="num">' + esc(rcNice(RC_DATE)) + '</b></span>' +
          '<span class="rc-ar">− ' + esc(rcDays(s.delivery_offset_days)) + '</span>' +
          '<span class="rc-fd"><span class="k">Delivery follow-up</span><b class="num">' + esc(rcNice(rcStr(s.delivery_date_expected))) + '</b></span>' +
        '</div>' +
        '<div class="rc-key">CONFIG ' + esc(rcStr(s.delivery_offset_key)) + ' — this row carries the same “3 days after delivery” checkpoint as the 3rd check</div>';
    }
    if (s.offset_disagreement) {
      out += '<div class="rc-dis"><b>The row on the sheet points somewhere else.</b> ' +
        'Its reference cell reads <b class="num">' + esc(rcNice(rcStr(s.reference_date))) + '</b> — ' +
        esc(rcDays(s.sheet_offset_days)) + ' back, where CONFIG says ' + esc(rcDays(s.config_offset_days)) + '. ' +
        'This tab’s prefilled rows are typed ' + esc(rcDays(s.sheet_offset_documented)) + ' apart. ' +
        'Check the orders the row itself names, and tell Management which number is the real checkpoint.</div>';
    } else if (rcStr(s.reference_date)) {
      out += '<div class="rc-sub" style="margin-top:9px">The row’s own reference cell agrees: ' +
        '<span class="num">' + esc(rcNice(rcStr(s.reference_date))) + '</span>.</div>';
    }
    out += '<div class="rc-sub" style="margin-top:9px">' + esc(what.dates || '') + '</div>';
    return out + '</div>';
  }

  function rcStageBody(s, key) {
    var what = RC_WHAT[key] || {};
    if (!s.connected) {
      return '<div class="rc-box"><span class="k">Not connected yet</span>' +
        esc(rcStr(s.reason) || 'The Order Rechecking workbook is not linked in CONNECTIONS yet.') +
        ' Nothing is lost — the tab keeps its own rows and this stage fills in the moment the registry links it.</div>';
    }
    if (s.mine === false) {
      return '<div class="rc-box"><span class="k">Signed by someone else</span>' +
        '<b>' + esc(rcStr(s.claimed_by)) + '</b> has this day’s row on ' + esc(rcStr(s.tab)) + '. ' +
        'It is theirs to file — a Team Lead or Management can still open it.</div>';
    }
    if (!s.present) {
      return '<div class="rc-box"><span class="k">No row for ' + esc(RC_DATE) + '</span>' +
        (s.beyond_prefill
          ? 'This tab is prefilled through <b class="num">' + esc(rcNice(rcStr(s.prefilled_through))) + '</b>. The daily generator adds the next row past that horizon.'
          : 'The tab is prefilled through <b class="num">' + esc(rcNice(rcStr(s.prefilled_through))) + '</b>, so this day is a gap inside the prefilled range — usually two days merged into one row (“28 29 date together”). Management has been told; the row is added in the sheet, never appended out of date order.') +
        '</div>';
    }
    return rcForm(s, key, what);
  }

  // ---------- §11.2 the write-back form ----------
  function rcForm(s, key, what) {
    var accs = s.account_columns || [], i, opts = s.account_value_options, cur;
    var out = '<div class="rc-grid">' +
      '<div class="field" style="margin-top:0"><label>STATUS</label>' +
        '<select class="rc-sel" data-rcstatus="' + rcAttr(key) + '">' + rcOptions(s.status_options, rcStr(s.status), '— leave as it is —') + '</select>' +
        '<div class="rc-sub" style="margin-top:6px">The tab’s own dropdown, nothing added to it.</div></div>' +
      rcCheckerField(s, key) +
    '</div>';

    if (s.has_comment) {
      out += '<div class="field" style="margin-top:12px"><label>' + esc(rcStr(s.tab)) + ' comment</label>' +
        '<textarea class="rc-ta" data-rccomment="' + rcAttr(key) + '" placeholder="What you saw">' + esc(rcRaw(s.comment)) + '</textarea>' +
        '<div class="rc-sub" style="margin-top:6px">' + esc(what.focus || '') + '</div></div>';
    }

    if (accs.length) {
      out += '<div class="rc-sub" style="margin-top:14px">Per account — the tab’s own columns, in its own order and spelling</div>' +
        '<div class="rc-acc">';
      for (i = 0; i < accs.length; i++) {
        cur = s.accounts ? rcRaw(s.accounts[accs[i]]) : '';
        out += '<div class="field"><label>' + esc(rcRaw(accs[i])) + '</label>' +
          (opts && opts.length
            ? '<select class="rc-sel" data-rcacc="' + rcAttr(key) + '" data-i="' + i + '">' + rcOptions(opts, cur, '— blank —') + '</select>'
            : '<input class="rc-in" type="text" autocomplete="off" data-rcacc="' + rcAttr(key) + '" data-i="' + i + '" ' +
              'placeholder="13 order · 2 in custom · local delivery" value="' + rcAttr(cur) + '">') +
          /* A cell already holding something outside this tab's two values is shown, never
             silently replaced — the dropdown cannot carry it and the server would refuse it. */
          (opts && opts.length && rcStr(cur) && !rcHas(opts.map(rcStr), rcStr(cur))
            ? '<div class="rc-sub" style="margin-top:6px">The cell already reads “' + esc(rcRaw(cur)) + '” — leave the box blank to keep it.</div>' : '') +
        '</div>';
      }
      out += '</div><div class="rc-sub" style="margin-top:8px">' + esc(what.focus || '') + '</div>';
    }

    out += '<div class="rc-bar">' +
        '<button class="btn-gold" data-rcgo="' + rcAttr(key) + '">' + (s.checked ? 'Update this day' : 'File this check') + '</button>' +
        '<span class="rc-sub">Writes only STATUS, Rechecked By and the comment columns — the dates and every other column stay exactly as the sheet holds them.</span>' +
      '</div>' +
      '<div data-rcres="' + rcAttr(key) + '"></div>';
    return out;
  }

  /** Rechecked By is a closed dropdown on the sheet. The portal matches the signed-in person to it;
   *  Team Lead and Management may file for someone else, and the server enforces that, not this. */
  function rcCheckerField(s, key) {
    if (rcOversees()) {
      return '<div class="field" style="margin-top:0"><label>Rechecked By</label>' +
        '<select class="rc-sel" data-rcchecker="' + rcAttr(key) + '">' +
          /* Always a blank first option: an overseer whose own name is not on the tab's dropdown
             must choose one deliberately, never inherit whichever name happened to sort first. */
          rcOptions(s.checker_options, rcStr(s.rechecked_by) || RC_ME, '— choose the checker —') + '</select>' +
        '<div class="rc-sub" style="margin-top:6px">You may file on a checker’s behalf; the sheet keeps their name, the portal log keeps yours.</div></div>';
    }
    if (RC_ME) {
      return '<div class="field" style="margin-top:0"><label>Rechecked By</label>' +
        '<input class="rc-in" type="text" value="' + rcAttr(RC_ME) + '" readonly>' +
        '<div class="rc-sub" style="margin-top:6px">The name the tab’s dropdown knows you by.</div></div>';
    }
    return '<div class="field" style="margin-top:0"><label>Rechecked By</label>' +
      '<input class="rc-in" type="text" value="" placeholder="not on this tab’s dropdown" readonly>' +
      '<div class="rc-sub" style="margin-top:6px">The tab’s Rechecked By list does not carry your name, so a Team Lead or Management files this row for you. Your work still counts — the portal logs who pressed the button.</div></div>';
  }

  // ---------- wiring ----------
  function rcWire(box) {
    var btns = box.querySelectorAll('button[data-rcgo]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) { b.onclick = function () { rcSubmit(box, b.getAttribute('data-rcgo'), b); }; })(btns[i]);
    }
  }

  function rcStageByKey(key) {
    var i;
    for (i = 0; i < RC_STAGES.length; i++) { if (rcStr(RC_STAGES[i].stage) === key) { return RC_STAGES[i]; } }
    return null;
  }

  function rcSubmit(box, key, btn) {
    var s = rcStageByKey(key), el, i, v, accs, payload, filled = false;
    if (!s) { return; }
    payload = { stage: key, date: RC_DATE, accounts: {} };

    el = rcPick(box, 'data-rcstatus', key);
    payload.status = el ? rcStr(el.value) : '';
    el = rcPick(box, 'data-rccomment', key);
    payload.comment = el ? rcStr(el.value) : '';

    accs = s.account_columns || [];
    for (i = 0; i < accs.length; i++) {
      el = box.querySelector('[data-rcacc="' + key.replace(/"/g, '') + '"][data-i="' + i + '"]');
      v = el ? rcStr(el.value) : '';
      if (v) { payload.accounts[rcRaw(accs[i])] = v; filled = true; }
    }
    if (payload.status || payload.comment) { filled = true; }

    if (rcOversees()) {
      el = rcPick(box, 'data-rcchecker', key);
      v = el ? rcStr(el.value) : '';
      if (!v) { toast('Choose which checker this row is filed as.'); if (el) { el.focus(); } return; }
      payload.rechecked_by = v;
    } else if (!RC_ME) {
      toast('This tab’s Rechecked By list does not carry your name — a Team Lead or Management files it.');
      return;
    }
    if (!filled) { toast('Nothing to file yet — a status, a comment or one account box.'); return; }

    btn.disabled = true;
    api('submitRecheck', payload).then(function (res) {
      btn.disabled = false;
      rcReceipt(box, key, res);
      if (res && res.ok) { toast(res.shadow ? 'Logged — shadow mode, the sheet was not touched.' : 'Filed on ' + rcStr(res.tab) + '.'); }
      else { toast('Not written: ' + (rcStr(res && res.reason) || 'the sheet refused it')); }
      rcLoad();
    }).catch(function (e) { btn.disabled = false; toast('Not filed: ' + e.message); });
  }

  /** What the sheet actually took — never a silent success. Shadow mode and a skipped column are
   *  both stated, because a processor who believes a cell was written stops checking it. */
  function rcReceipt(box, key, res) {
    var host = rcPick(box, 'data-rcres', key), lines;
    if (!host || !res) { return; }
    lines = '<div class="tl-row"><span class="k">Row</span><span><span class="mono">' + esc(rcStr(res.tab)) + '</span> · row ' +
        esc(String(res.row || '—')) + ' · ' + esc(rcStr(res.date)) + '</span></div>' +
      '<div class="tl-row"><span class="k">Filed as</span><span><b>' + esc(rcStr(res.rechecked_by) || '—') + '</b>' +
        (rcStr(res.status) ? ' · ' + esc(rcStr(res.status)) : '') + '</span></div>' +
      '<div class="tl-row"><span class="k">Columns</span><span>' +
        ((res.written || []).length ? esc((res.written || []).join(' · ')) : '<span class="rc-sub">none</span>') + '</span></div>' +
      ((res.skippedMissing || []).length
        ? '<div class="tl-row"><span class="k">Not on the tab</span><span class="rc-sub">' + esc((res.skippedMissing || []).join(' · ')) +
          ' — the column does not exist and is never created</span></div>' : '');
    host.innerHTML = '<div class="rc-box ' + (res.ok ? 'rc-gold' : '') + '" style="margin-top:12px">' +
      '<span class="k">' + (res.shadow ? 'Shadow mode — logged, not written' : (res.ok ? 'Written to the sheet' : 'Not written')) + '</span>' +
      (res.ok ? '' : esc(rcStr(res.reason) || 'the sheet refused the write')) + lines + '</div>';
  }

  // ============================== §11.3 WRONG ORDERS ==============================
  VIEWS.wrongOrders = {
    label: 'Wrong orders',
    icon: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    roles: RC_ROLES,
    order: 29,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Wrong orders</h1>' +
          '<span class="sub">One row per incident — logged by whoever finds it</span>' +
          '<button class="minibtn" id="woRefresh" style="margin-left:auto">Refresh counters</button>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">Log a wrong order ' +
          '<span class="hint">§11.3 — Account · Order id · Ali express id · Shop Name · Date · Mistake · Processed By</span></div>' +
          '<div class="bd" id="woForm"><div class="spinner"></div></div>' +
        '</div>' +
        '<div id="woReceipt"></div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">The counters ' +
          '<span class="hint">Per person and per mistake type</span>' +
          '</div><div class="bd" id="woCounters"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      $('woRefresh').onclick = function () { woLoadCounters(); };
      woLoadPickers();
      woLoadCounters();
    }
  };

  /** Accounts, staff and the Processed By vocabulary are business data: they come from the
   *  signed-in backend on every load, never from this file (RL-2/RL-9). The Processed By list is
   *  the sheet's own closed dropdown, which recheckQueue carries as checker_options — a name
   *  outside it cannot be written into the workbook, so it is not offered. */
  function woLoadPickers() {
    var host = $('woForm');
    if (!host) { return; }
    api('accountList').then(function (d) {
      RC_ACCOUNTS = ((d && d.accounts) || []).map(function (a) { return rcStr(a.account); }).filter(function (a) { return !!a; });
      woPaintForm();
    }).catch(function () { woPaintForm(); });
    api('assignableStaff', { roles: ['Order Processor', 'Team Lead'] }).then(function (d) {
      RC_STAFF = (d && d.staff) || [];
      woPaintForm();
    }).catch(function () {});
    api('recheckQueue', { stage: 'china' }).then(function (d) {
      var st = ((d && d.stages) || [])[0] || {};
      RC_CHECKERS = st.checker_options || [];
      RC_ME = rcStr(d && d.me) || RC_ME;
      woPaintForm();
    }).catch(function () { woPaintForm(); });
  }

  /** The portal person behind a sheet checker name, matched the way the server matches it (the
   *  staff list spells them differently from the tab's dropdown). Ambiguity resolves to nobody. */
  function woStaffFor(checker) {
    var want = rcNorm(checker), hits = [], i, n;
    for (i = 0; i < RC_STAFF.length; i++) {
      n = rcNorm(RC_STAFF[i].name);
      if (n && (n === want || n.indexOf(want) >= 0)) { hits.push(RC_STAFF[i]); }
    }
    return hits.length === 1 ? hits[0] : null;
  }

  var WO_FIELDS = ['woAccount', 'woOrder', 'woAli', 'woShop', 'woDate', 'woFound', 'woMistake', 'woBy'];

  /** Three pickers answer at three different moments, so the form is redrawn more than once.
   *  Anything already typed survives the redraw — a half-filled incident report is not disposable. */
  function woKeep() {
    var kept = {}, i, el;
    for (i = 0; i < WO_FIELDS.length; i++) {
      el = $(WO_FIELDS[i]);
      if (el) { kept[WO_FIELDS[i]] = el.value; }
    }
    return kept;
  }
  function woRestore(kept) {
    var i, el;
    for (i = 0; i < WO_FIELDS.length; i++) {
      el = $(WO_FIELDS[i]);
      if (el && kept[WO_FIELDS[i]] !== undefined && kept[WO_FIELDS[i]] !== '') { el.value = kept[WO_FIELDS[i]]; }
    }
  }

  function woPaintForm() {
    var host = $('woForm'), accs = woAccountOptions(), kept = woKeep(), i, who, label;
    if (!host) { return; }

    var checkers = '';
    for (i = 0; i < RC_CHECKERS.length; i++) {
      who = woStaffFor(RC_CHECKERS[i]);
      label = rcRaw(RC_CHECKERS[i]) + (who ? ' — ' + rcStr(who.name) + ' · ' + rcStr(who.role) : '');
      checkers += '<option value="' + rcAttr(rcRaw(RC_CHECKERS[i])) + '">' + esc(label) + '</option>';
    }

    host.innerHTML =
      '<div class="rc-box rc-blue"><span class="k">Processed By is the accountability field</span>' +
        'It names the person whose processing produced the mistake — <b>not</b> the person who found it. You are the finder: the portal records that from your sign-in, on its own. ' +
        'These rows become counts in the performance figures, alongside everything else that person did. A count is a fact about the process, not a verdict about the person — write it plainly and move on.' +
      '</div>' +
      '<div class="rc-grid">' +
        '<div class="field" style="margin-top:0"><label>Account Name</label>' +
          '<input class="rc-in" id="woAccount" list="woAccList" type="text" autocomplete="off" placeholder="the eBay account the order sits on">' +
          '<datalist id="woAccList">' + accs + '</datalist>' +
          '<div class="rc-sub" style="margin-top:6px">The workbook’s own account dropdown carries six of the accounts; the portal maps the recheck tabs’ spellings onto it and writes whichever spelling that workbook uses.</div></div>' +
        '<div class="field" style="margin-top:0"><label>Order id</label>' +
          '<input class="rc-in rc-mono" id="woOrder" type="text" autocomplete="off" inputmode="numeric" placeholder="15-14796-52804">' +
          '<div class="rc-sub" style="margin-top:6px">The eBay order number, two–five–five digits.</div></div>' +
        '<div class="field" style="margin-top:0"><label>Ali express id</label>' +
          '<input class="rc-in rc-mono" id="woAli" type="text" autocomplete="off" inputmode="numeric" placeholder="16 digits">' +
          '<div class="rc-sub" style="margin-top:6px">Optional — leave it blank if the order never reached AliExpress.</div></div>' +
        '<div class="field" style="margin-top:0"><label>Shop Name</label>' +
          '<input class="rc-in" id="woShop" type="text" autocomplete="off" placeholder="the purchasing shop">' +
          '<div class="rc-sub" style="margin-top:6px">The AliExpress shop the order was placed from.</div></div>' +
        '<div class="field" style="margin-top:0"><label>Date</label>' +
          '<input class="rc-in" id="woDate" type="date" value="' + rcAttr(rcToday()) + '">' +
          '<div class="rc-sub" style="margin-top:6px">The <b>order’s own date</b> — on the live tabs this is often weeks before the mistake surfaced.</div></div>' +
        '<div class="field" style="margin-top:0"><label>Found on</label>' +
          '<input class="rc-in" id="woFound" type="date" value="' + rcAttr(rcToday()) + '">' +
          '<div class="rc-sub" style="margin-top:6px">The day it was noticed — it decides which daily tab takes the row.</div></div>' +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label>Mistake</label>' +
        '<textarea class="rc-ta" id="woMistake" placeholder="wrong variation (blue instead of black)"></textarea>' +
        '<div class="rc-sub" style="margin-top:6px">Your own words go into the cell exactly as typed. Keep it to the mistake — buyer names, phone numbers and addresses are not needed here, and the portal’s log deliberately keeps only the classified type, never this text.</div></div>' +
      '<div class="field" style="margin-top:12px"><label>Processed By</label>' +
        '<select class="rc-sel" id="woBy">' +
          (checkers ? '<option value="">— choose the person the order was processed by —</option>' + checkers
                    : '<option value="">the sheet’s list is not loaded yet</option>') +
        '</select>' +
        '<div class="rc-sub" style="margin-top:6px">A closed list: the workbook’s Processed By dropdown accepts these names and no others. The portal name beside each one comes from the staff list, so you can see who is meant.</div></div>' +
      '<div class="rc-bar">' +
        '<button class="btn-gold" id="woSend">Log the wrong order</button>' +
        '<span class="rc-sub">Management is notified, and the row lands on the day’s tab in the Wrong Order workbook.</span>' +
      '</div>';

    woRestore(kept);
    $('woSend').onclick = woSubmit;
  }

  function woAccountOptions() {
    var seen = {}, out = '', list = RC_ACCOUNTS.slice(), i, s, cols, j, v;
    /* If the registry has not answered, the recheck tabs' own account columns are the next best
       list — also the server's, never this file's. */
    for (i = 0; i < RC_STAGES.length; i++) {
      cols = RC_STAGES[i].account_columns || [];
      for (j = 0; j < cols.length; j++) { list.push(rcStr(cols[j])); }
    }
    for (i = 0; i < list.length; i++) {
      s = rcStr(list[i]);
      if (!s || seen[rcNorm(s)]) { continue; }
      seen[rcNorm(s)] = true;
      v = rcRaw(s);
      out += '<option value="' + rcAttr(v) + '"></option>';
    }
    return out;
  }

  function woSubmit() {
    var btn = $('woSend');
    var payload = {
      account_name: rcStr($('woAccount').value),
      order_id: rcStr($('woOrder').value).replace(/\s+/g, ''),
      ali_express_id: rcStr($('woAli').value).replace(/\s+/g, ''),
      shop_name: rcStr($('woShop').value),
      date: rcStr($('woDate').value),
      found_on: rcStr($('woFound').value),
      mistake: rcStr($('woMistake').value),
      processed_by: rcStr($('woBy').value)
    };
    if (!payload.account_name) { toast('Name the account this order sits on.'); $('woAccount').focus(); return; }
    if (!RC_ORDER_RE.test(payload.order_id)) { toast('An order id looks like 15-14796-52804.'); $('woOrder').focus(); return; }
    if (payload.ali_express_id && !RC_ALI_RE.test(payload.ali_express_id)) { toast('The AliExpress id is digits only — leave it blank if there is none.'); $('woAli').focus(); return; }
    if (!payload.date) { toast('Give the order’s own date.'); $('woDate').focus(); return; }
    if (!payload.mistake) { toast('Say what the mistake was.'); $('woMistake').focus(); return; }
    if (!payload.processed_by) { toast('Choose who the order was processed by — the row belongs to someone.'); $('woBy').focus(); return; }

    btn.disabled = true;
    api('logWrongOrder', payload).then(function (res) {
      btn.disabled = false;
      $('woOrder').value = ''; $('woAli').value = ''; $('woShop').value = ''; $('woMistake').value = '';
      woReceipt(res);
      toast(res && res.ok
        ? (res.shadow ? 'Logged — shadow mode, the workbook was not touched.' : 'Logged on ' + rcStr(res.tab) + '.')
        : 'Kept in the portal: ' + (rcStr(res && res.reason) || 'the workbook did not take it'));
      woLoadCounters();
    }).catch(function (e) { btn.disabled = false; toast('Not logged: ' + e.message); });
  }

  function woReceipt(res) {
    var host = $('woReceipt');
    if (!host || !res) { return; }
    host.innerHTML = '<div class="card enter d1" style="margin-top:16px"><div class="hd">Logged ' +
        '<span class="hint">' + esc(rcStr(res.mistake_type)) + '</span></div><div class="bd">' +
        '<div class="tl-row"><span class="k">Order</span><span class="mono">' + esc(rcStr(res.order_id)) + '</span></div>' +
        '<div class="tl-row"><span class="k">Account</span><span>' + esc(rcStr(res.account_name)) + '</span></div>' +
        '<div class="tl-row"><span class="k">Processed by</span><span><b>' + esc(rcStr(res.processed_by)) + '</b></span></div>' +
        '<div class="tl-row"><span class="k">Order date</span><span class="num">' + esc(rcNice(rcStr(res.date))) + '</span></div>' +
        '<div class="tl-row"><span class="k">Tab</span><span>' + (rcStr(res.tab) ? esc(rcStr(res.tab)) + (res.row ? ' · row ' + esc(String(res.row)) : '')
          : '<span class="rc-sub">' + esc(rcStr(res.reason) || 'no tab took the row') + '</span>') + '</span></div>' +
        (res.shadow ? '<div class="rc-box"><span class="k">Shadow mode</span>The row was logged and not written — CONFIG pipeline_write_external is off.</div>' : '') +
        (res.accountability_only_in_portal
          ? '<div class="rc-box"><span class="k">Where the accountability lives</span>' +
            'The daily tabs carry six columns and no Processed By — only the month’s entry sheet has one. So the workbook keeps the incident and the portal keeps who it belongs to; the counters below read both and match them on the order id.</div>'
          : '') +
        '<div class="rc-bar"><button class="minibtn" id="woRcClose">Close</button></div>' +
      '</div></div>';
    var c = $('woRcClose');
    if (c) { c.onclick = function () { host.innerHTML = ''; }; }
  }

  // ---------- the counters (§11.3 / §12.1 / §13.3) ----------
  function woLoadCounters() {
    var host = $('woCounters');
    if (!host) { return; }
    host.innerHTML = '<div class="spinner"></div>';
    api('wrongOrderCounters', WO_MONTH ? { month: WO_MONTH } : {}).then(function (d) {
      host.innerHTML = woCounters(d || {});
      woWireCounters();
    }).catch(function (e) {
      host.innerHTML = '<div class="rc-empty">The counters could not be computed just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="woCRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('woCRetry');
      if (r) { r.onclick = function () { woLoadCounters(); }; }
    });
  }

  function woCounters(d) {
    var oversee = rcOversees();
    var people = d.by_person || [], types = d.by_type || [], months = d.by_month || [];
    var maxP = 0, maxT = 0, i;
    for (i = 0; i < people.length; i++) { maxP = Math.max(maxP, rcNum(people[i].caused), rcNum(people[i].found)); }
    for (i = 0; i < types.length; i++) { maxT = Math.max(maxT, rcNum(types[i].count)); }

    var out = '<div class="rc-bar" style="margin-top:0">' +
      '<div class="field" style="margin-top:0;min-width:190px"><label>Month</label>' +
        '<select class="rc-sel" id="woMonth"><option value="">Every month on record</option>' +
        woMonthOptions(months) + '</select></div>' +
      '<span class="rc-sub">' + (d.connected ? 'Read from the Wrong Order workbook’s day tabs' : 'The Wrong Order workbook is not connected yet — only portal-logged incidents count here') + '</span>' +
    '</div>';

    if (!oversee) {
      out += '<div class="rc-box rc-blue" style="margin-top:14px"><span class="k">Your own numbers</span>' +
        'Staff see their own figures only (§12.1). Management and the Team Lead see the whole board.</div>';
    } else {
      out += '<div class="rc-tiles" style="margin-top:14px">' +
        woTile('Incidents', d.total_incidents, false) +
        woTile('People named', people.length, false) +
        woTile('Mistake types', types.length, false) +
        woTile('Not attributed', d.unattributed, false) +
        woTile('Portal only', d.portal_only, true) +
      '</div>' +
      '<div class="rc-sub" style="margin-top:8px">“Not attributed” = a row on the sheet the portal never logged, so no Processed By exists for it. “Portal only” = logged here but not (yet) on the sheet — shadow mode or a tab that refused the row.</div>';
    }

    out += '<div class="rc-box" style="margin-top:14px"><span class="k">Per person</span>' +
      'Two columns, and they are different things: <b>on their processing</b> counts orders where the mistake was made, <b>found by them</b> counts the mistakes they caught while rechecking. The second is the one the recheck stages exist to produce.</div>' +
      '<div class="scroll" style="margin-top:10px">' + woPeopleTable(people, maxP) + '</div>';

    if (oversee) {
      out += '<div class="rc-box" style="margin-top:16px"><span class="k">Per mistake type</span>' +
        'Derived from the Mistake text, never from a dropdown — the live cells spell the same mistake several ways.</div>' +
        '<div class="scroll" style="margin-top:10px">' + woTypeTable(types, maxT) + '</div>';
      if (months.length) {
        out += '<div class="rc-sub" style="margin-top:16px">By month</div><div>' + months.map(function (m) {
          return '<div class="tl-row"><span class="k">' + esc(rcMonthNice(rcStr(m.month))) + '</span><b class="num">' + esc(String(rcNum(m.count))) + '</b></div>';
        }).join('') + '</div>';
      }
      if ((d.tabs_read || []).length) {
        out += '<div class="rc-sub" style="margin-top:14px">Tabs read: ' + esc((d.tabs_read || []).join(' · ')) + '</div>';
      }
    }

    out += '<div class="rc-box" style="margin-top:16px"><span class="k">How these numbers are made</span>' +
      esc(rcStr(d.source_note) || 'Computed by the portal from the workbook’s rows and the portal’s own log.') + '</div>';
    return out;
  }

  function woMonthOptions(months) {
    var out = '', i, k;
    for (i = 0; i < months.length; i++) {
      k = rcStr(months[i].month);
      if (!k) { continue; }
      out += '<option value="' + rcAttr(k) + '"' + (k === WO_MONTH ? ' selected' : '') + '>' + esc(rcMonthNice(k)) + '</option>';
    }
    if (WO_MONTH && out.indexOf('value="' + WO_MONTH + '"') < 0) {
      out += '<option value="' + rcAttr(WO_MONTH) + '" selected>' + esc(rcMonthNice(WO_MONTH)) + '</option>';
    }
    return out;
  }

  function woTile(k, v, gold) {
    var s = (v === '' || v === undefined || v === null) ? '—' : String(v);
    return '<div class="rc-tile' + (gold ? ' rc-gold' : '') + '"><span class="k">' + esc(k) + '</span><b class="num">' + esc(s) + '</b></div>';
  }

  function woBar(n, max, gold) {
    var pct = max > 0 ? Math.max(4, Math.round((rcNum(n) / max) * 100)) : 0;
    return '<div class="rc-meter' + (gold ? ' rc-g' : '') + '"><i style="width:' + pct + '%"></i></div>';
  }

  function woPeopleTable(people, max) {
    var rows = '', i, p;
    if (!people.length) {
      return '<div class="rc-empty">No wrong order counted yet for this period.<span>An empty column here is the good outcome, not missing data.</span></div>';
    }
    for (i = 0; i < people.length; i++) {
      p = people[i];
      rows += '<tr><td class="rc-c1">' + esc(rcStr(p.person)) + '</td>' +
        '<td><span class="num">' + esc(String(rcNum(p.caused))) + '</span>' + woBar(p.caused, max, false) + '</td>' +
        '<td><span class="num">' + esc(String(rcNum(p.found))) + '</span>' + woBar(p.found, max, true) + '</td></tr>';
    }
    return '<table class="rc-tbl"><thead><tr><th>Person</th><th>On their processing</th><th>Found by them</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function woTypeTable(types, max) {
    var rows = '', i;
    if (!types.length) { return '<div class="rc-empty">No mistake type counted for this period.</div>'; }
    for (i = 0; i < types.length; i++) {
      rows += '<tr><td class="rc-c1">' + esc(rcStr(types[i].type)) + '</td>' +
        '<td><span class="num">' + esc(String(rcNum(types[i].count))) + '</span>' + woBar(types[i].count, max, false) + '</td></tr>';
    }
    return '<table class="rc-tbl" style="min-width:360px"><thead><tr><th>Mistake type</th><th>Count</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function woWireCounters() {
    var sel = $('woMonth');
    if (sel) { sel.onchange = function () { WO_MONTH = rcStr(sel.value); woLoadCounters(); }; }
  }

})();
