/* view-alerts.js — §13.2 the Management Alerts Centre and the per-account KPI cards ·
 * §13.3 the operations counters.
 * Views: alerts (Alerts centre) · kpis (Account KPIs).
 * Backend: alertsCentre · resolveAlert · accountKpis · opsCounters.
 *
 * REALITY WINS over §13.2 in the places Alerts.gs already settled, and this screen follows it:
 *  · the severity words are the workbook's own — '🔴 CRITICAL', '🟠 WARNING', '⏰ REMINDER',
 *    '🔵 INFO', and 'ALARM' on a §8.7 row. They are printed verbatim and never rewritten into
 *    portal vocabulary; the SERVER's severity_rank decides the dot, so a severity nobody has seen
 *    before still renders as itself instead of being forced into a known one.
 *  · §13.2 lists seven alert columns; _ALERTS has nine, and resolved_at is filled on rows that are
 *    still ACTIVE. So `status` alone decides what appears here, and resolved_at is printed as
 *    information — never read as a state.
 *  · the portal cannot write _ALERTS (SheetBridge refuses tabs starting with '_'). Resolve sets the
 *    human mirror's Status cell and records WHO in SIGNALS. A row the portal has resolved but the
 *    agent has not rebuilt yet comes back marked resolution_pending and stays on screen, marked,
 *    rather than vanishing from under the person who just clicked it.
 *  · §13.2 says "~44 daily metrics"; _LEDGER has 73 columns and "impressions" is two of them.
 *    Every KPI card drawn here is one the server sent — not one metric name is spelled in this file.
 *  · rates arrive as _LEDGER stores them (decimals: tacos 0.1935) and are shown as percentages
 *    here, matching the workbook's own '0.00%' format. Money arrives rounded once, at the end.
 * §13.4: both screens read what the 15-minute refresh already computed. The fleet KPI view is
 * DASH_CACHE and opens no workbook at all; Recompute is offered only to Management because the
 * server ignores `refresh` from every other role.
 * RL-3: every string on these screens is sheet text written by an agent, and message/action are
 * free text. All of it goes through esc(); nothing is assigned as unescaped innerHTML.
 * RL-4: what a role may see is decided server-side by stripForRole_. This file renders the fields
 * that arrive and derives none — a field the server withheld is simply not drawn, never hidden. */
(function () {

  /* §4.3's business-dashboard row plus the Advertising Manager's ads view. The server gates every
     one of these actions again; this list only decides whether the nav item exists. */
  var AL_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'];
  var AL_MGMT = ['Management', 'Ops Head'];          // mirrors MGMT_ROLES — the only roles the server lets recompute

  var AL_TZ_PKT = 'Asia/Karachi';
  var AL_LIMIT_DEFAULT = 200;                        // ALERTS_CENTRE_LIMIT
  var AL_LIMIT_MAX = 1000;                           // ALERTS_CENTRE_MAX

  /* The categories where an open alert is money going out of the door. ADS, SALES and FULFILMENT
     are the live _ALERTS category vocabulary; 'Wrong Advertising' is the category Alerts.gs stamps
     on a §8.7 alarm. DATA and ROUTINE are the agent talking about its own run, so they are not red
     however many of them there are. */
  var AL_MONEY_CATEGORIES = ['ADS', 'SALES', 'FULFILMENT', 'Wrong Advertising'];

  /* §13.3 counter names, exactly as §13.3 and Alerts.gs spell them. Nothing is renamed for display. */
  var AL_OPS_ORDERS_CAME = 'all orders came';
  var AL_OPS_RECHECKED = 'orders rechecked';
  var AL_OPS_WRONG = 'wrong orders found';
  var AL_OPS_CS = 'CS replies';
  var AL_OPS_OVERDUE = 'dispatch overdue';

  var AL_ALL = '';                                   // the "no filter" value of every picker here

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{color:var(--blue-2);border-color:var(--blue)}' +
    '.al-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}' +
    '.al-sel,.al-in{padding:9px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:700;font-size:12.5px;max-width:100%}' +
    '.al-sel:focus,.al-in:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.al-in.al-wide{flex:1 1 220px;min-width:0}' +
    '.al-toggle{padding:8px 13px;border:1px solid var(--gold-line);border-radius:9px;font-size:12px;font-weight:800;color:var(--text-2);transition:all .15s;white-space:nowrap}' +
    '.al-toggle:hover{border-color:var(--blue);color:var(--blue-2)}' +
    '.al-toggle.on{border-color:rgba(240,96,90,.62);color:var(--bad);background:var(--bad-soft)}' +
    '.al-note{font-size:11.5px;color:var(--text-3);font-weight:700;line-height:1.55}' +
    '.al-note b{color:var(--text-2)}' +
    '.al-chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}' +
    '.al-chip{font-size:11.5px;font-weight:700;color:var(--text);border:1px solid var(--gold-line);border-radius:8px;padding:5px 11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.al-chip .k{color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:800;margin-right:6px}' +
    '.al-chip.al-c-bad{border-color:rgba(240,96,90,.45);color:var(--bad)}' +
    '.al-chip.al-c-warn{border-color:rgba(255,159,67,.45);color:var(--warn)}' +
    '.al-chip.al-c-off{color:var(--text-3)}' +
    /* the headline: how much is open and how much of it costs money */
    '.al-heads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}' +
    '.al-head{border:1px solid var(--gold-line);border-radius:12px;padding:14px 15px;background:rgba(120,132,152,.06);min-width:0}' +
    '.al-head .k{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);line-height:1.4}' +
    '.al-head b{display:block;font-size:30px;font-weight:800;margin-top:7px;line-height:1.05}' +
    '.al-head span.al-sub{display:block;font-size:11px;font-weight:700;color:var(--text-3);margin-top:5px;line-height:1.5}' +
    '.al-head.al-h-money{grid-column:span 1;border-color:var(--gold-line-hi)}' +
    '.al-head.al-h-money.al-hot{border-color:rgba(240,96,90,.62);background:linear-gradient(135deg,rgba(240,96,90,.16),rgba(240,96,90,.03));box-shadow:0 6px 26px rgba(240,96,90,.20)}' +
    '.al-head.al-h-money.al-hot .k,.al-head.al-h-money.al-hot b{color:var(--bad)}' +
    '.al-head.al-h-money.al-cool b{color:var(--ok)}' +
    '.al-head.al-h-gold b{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '.al-head.al-h-live b{color:var(--blue-2)}' +
    /* one alert */
    '.al-card{margin-top:13px;border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);overflow:hidden}' +
    '.al-card.al-money{border-color:rgba(240,96,90,.55);background:linear-gradient(135deg,rgba(240,96,90,.09),rgba(240,96,90,.01));box-shadow:0 6px 24px rgba(240,96,90,.14)}' +
    '.al-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 15px;border-bottom:1px solid var(--gold-line)}' +
    '.al-dot{width:10px;height:10px;border-radius:50%;flex:none;background:var(--text-3)}' +
    '.al-dot.al-d4{background:var(--bad);box-shadow:0 0 0 4px rgba(240,96,90,.18)}' +
    '.al-dot.al-d3{background:var(--bad)}' +
    '.al-dot.al-d2{background:var(--warn)}' +
    '.al-dot.al-d1{background:var(--blue)}' +
    '.al-acct{font-weight:800;font-size:13.5px;word-break:break-word;min-width:0}' +
    '.al-hd .al-when{margin-left:auto;font-size:11px;font-weight:700;color:var(--text-3);white-space:nowrap}' +
    '.al-bd{padding:13px 15px}' +
    '.al-msg{font-size:13.5px;font-weight:700;line-height:1.55;word-break:break-word}' +
    '.al-do{margin-top:11px;border:1px solid var(--gold-line-hi);border-radius:10px;padding:10px 12px;background:rgba(233,169,60,.06);font-size:12.5px;font-weight:700;line-height:1.55;word-break:break-word}' +
    '.al-do .k{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--gold-a);margin-bottom:4px}' +
    '.al-from{margin-top:11px;font-size:11px;font-weight:700;color:var(--text-3);line-height:1.6;word-break:break-word}' +
    '.al-from .mono{color:var(--text-2)}' +
    '.al-acts{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}' +
    '.al-res{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:11px;padding-top:11px;border-top:1px solid var(--gold-line)}' +
    '.pill.al-p-sev{background:rgba(120,132,152,.14);color:var(--text-2)}' +
    '.pill.al-p-cat{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.al-p-money{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.al-p-wait{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.al-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.al-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.al-calm{border:1px solid rgba(63,207,142,.35);border-radius:12px;padding:14px 16px;background:var(--ok-soft);font-weight:800;font-size:13.5px;color:var(--ok)}' +
    '.al-calm span{display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px}' +
    /* §13.2 KPI cards */
    '.al-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(226px,1fr));gap:12px}' +
    '.al-kpi{border:1px solid var(--gold-line);border-radius:12px;padding:13px 14px 11px;background:rgba(120,132,152,.06);min-width:0}' +
    '.al-kpi:hover{border-color:var(--gold-line-hi)}' +
    '.al-kpi .k{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);line-height:1.4;word-break:break-word}' +
    '.al-kpi b{display:block;font-size:25px;font-weight:800;margin-top:6px;line-height:1.1;word-break:break-word}' +
    '.al-kpi b.al-gold{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '.al-kpi .al-sub{display:block;font-size:11px;font-weight:700;color:var(--text-3);margin-top:6px;line-height:1.55}' +
    '.al-kpi .al-delta{display:inline-block;font-size:11.5px;font-weight:800;margin-top:5px}' +
    '.al-kpi .al-delta.al-up{color:var(--ok)}.al-kpi .al-delta.al-down{color:var(--bad)}.al-kpi .al-delta.al-flat{color:var(--text-3)}' +
    '.al-kpi.al-miss{border-color:rgba(240,96,90,.45)}' +
    '.al-kpi.al-hitt{border-color:rgba(63,207,142,.35)}' +
    '.al-flag{display:inline-block;margin-top:6px;font-size:10.5px;font-weight:800;color:var(--warn);border:1px solid rgba(255,159,67,.45);border-radius:7px;padding:3px 8px}' +
    '.al-flag.al-flag-hard{color:var(--bad);border-color:rgba(240,96,90,.5)}' +
    /* the sparkline — inline SVG, no library */
    '.al-spark{display:block;width:100%;height:42px;margin-top:9px;overflow:visible}' +
    '.al-sp-line{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}' +
    '.al-sp-fill{fill:currentColor;opacity:.11;stroke:none}' +
    '.al-sp-pt{fill:currentColor}' +
    '.al-sp-t{stroke:var(--text-3);stroke-width:1;stroke-dasharray:3 3;opacity:.75}' +
    '.al-t-gold{color:var(--gold-a)}.al-t-blue{color:var(--blue-2)}.al-t-bad{color:var(--bad)}' +
    '.al-none{height:auto;font-size:11px;font-weight:700;color:var(--text-3);padding:12px 0 2px}' +
    '.al-verdict{margin-top:14px;border:1px solid var(--gold-line);border-radius:11px;padding:12px 14px;background:rgba(120,132,152,.06)}' +
    '.al-verdict .k{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.al-verdict p{font-size:13px;font-weight:700;line-height:1.6;word-break:break-word}' +
    /* §13.3 counters */
    '.al-ops{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}' +
    '.al-op{border:1px solid var(--gold-line);border-radius:12px;padding:13px 14px;background:rgba(120,132,152,.06);min-width:0}' +
    '.al-op .k{display:block;font-size:11.5px;font-weight:800;color:var(--text-2);line-height:1.4;word-break:break-word}' +
    '.al-op b{display:block;font-size:28px;font-weight:800;margin-top:7px;line-height:1.05}' +
    '.al-op .al-sub{display:block;font-size:10.5px;font-weight:700;color:var(--text-3);margin-top:6px;line-height:1.55}' +
    '.al-op.al-o-gold b{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '.al-op.al-o-live b{color:var(--blue-2)}' +
    '.al-op.al-o-warn{border-color:rgba(255,159,67,.42)}.al-op.al-o-warn b{color:var(--warn)}' +
    '.al-op.al-o-hot{border-color:rgba(240,96,90,.62);background:linear-gradient(135deg,rgba(240,96,90,.16),rgba(240,96,90,.03));box-shadow:0 6px 26px rgba(240,96,90,.20)}' +
    '.al-op.al-o-hot .k,.al-op.al-o-hot b{color:var(--bad)}' +
    '.al-op.al-o-none b{font-size:15px;color:var(--text-3);font-weight:800}' +
    '.al-fleet{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}' +
    '.al-mini{display:grid;grid-template-columns:1fr auto;gap:4px 12px;margin-top:4px}' +
    '.al-mini .al-m-k{font-size:11.5px;font-weight:700;color:var(--text-2);padding:5px 0;border-bottom:1px solid var(--gold-line);min-width:0;word-break:break-word}' +
    '.al-mini .al-m-v{font-size:12.5px;font-weight:800;text-align:right;padding:5px 0;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.al-mini .al-m-v.al-gold{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '@media (max-width:880px){' +
      '.al-heads{grid-template-columns:1fr 1fr}' +
      '.al-ops{grid-template-columns:1fr 1fr}' +
      '.al-kpis{grid-template-columns:1fr 1fr}' +
      '.al-fleet{grid-template-columns:1fr}' +
    '}' +
    '@media (max-width:430px){' +
      '.al-heads{grid-template-columns:1fr}' +
      '.al-ops{grid-template-columns:1fr}' +
      '.al-kpis{grid-template-columns:1fr}' +
      '.al-head b{font-size:26px}.al-op b{font-size:24px}' +
      '.al-bar .al-sel,.al-bar .al-in{flex:1 1 100%}' +
    '}'
  );

  // ---------- text and numbers (RL-3) ----------
  /** esc() leaves quotes intact, so an attribute value needs the stricter form. */
  function alAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function alStr(v) { return String(v === null || v === undefined ? '' : v).trim(); }
  function alRole() { return (STATE.user && STATE.user.role) || ''; }
  function alMayRefresh() { return AL_MGMT.indexOf(alRole()) >= 0; }
  function alNorm(v) { return alStr(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function alHas(list, v) {
    var want = alNorm(v), i;
    for (i = 0; i < list.length; i++) { if (alNorm(list[i]) === want) { return true; } }
    return false;
  }

  function alTodayPkt() {
    try {
      return new Date().toLocaleDateString('en-CA', { timeZone: AL_TZ_PKT, year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) { return ''; }
  }

  /* Two kinds of stamp land on these screens and they must not be treated alike. The portal's own
     (computed_at, resolved_at from a resolve) are ISO carrying the +05:00 offset and are shown in
     PKT. Anything that came off an account workbook (raised_at, last_seen, _ALERTS resolved_at) is
     the SHEET's stamp in the SHEET's own timezone — the live workbook writes '08 Aug 2026 16:05
     UK' — so it is printed exactly as written and never re-timed into PKT. */
  function alPortalStamp(v) {
    var s = alStr(v);
    if (!s) { return ''; }
    return /^\d{4}-\d{2}-\d{2}T/.test(s) ? fmtPkt(s, true) + ' PKT' : s;
  }
  function alSheetStamp(v) { return alStr(v); }

  function alInt(v) {
    var n = Number(v);
    if (v === '' || v === null || v === undefined || !isFinite(n)) { return alStr(v); }
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /** Money GBP two decimals; a rate is a _LEDGER decimal shown as the workbook's own '0.00%'; a
   *  count that is an average of days is not an integer and is not pretended to be one. */
  function alValue(v, unit) {
    var n = Number(v);
    if (v === '' || v === null || v === undefined || !isFinite(n)) { return '—'; }
    if (unit === 'gbp') { return '£' + n.toFixed(2); }
    if (unit === 'rate') { return (n * 100).toFixed(2) + '%'; }
    if (n % 1 === 0) { return alInt(n); }
    return Math.abs(n) >= 100 ? alInt(n) : n.toFixed(2);
  }

  function alRetry(msg, err, id) {
    return '<div class="al-empty">' + esc(msg) + '<span>' + esc(err) + '</span>' +
      '<button class="minibtn" id="' + id + '" style="margin-top:10px">Try again</button></div>';
  }
  function alBadge(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }
  /** Handlers are attached by attribute rather than by id, so a list of 200 cards needs no ids. */
  function alBind(root, attr, fn) {
    if (!root) { return; }
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) {
      (function (el) { el.onclick = function () { fn(el.getAttribute(attr), el); }; })(els[i]);
    }
  }
  function alOptions(values, selected, allLabel) {
    var opts = allLabel === null ? '' :
      '<option value="">' + esc(allLabel) + '</option>';
    return opts + values.map(function (v) {
      return '<option value="' + alAttr(v) + '"' + (alStr(v) === alStr(selected) ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  // ============================================================================================
  //                     §13.2 — THE ALERTS CENTRE (where you look when something is wrong)
  // ============================================================================================

  var AL = {
    account: AL_ALL, severity: AL_ALL, category: AL_ALL,
    limit: AL_LIMIT_DEFAULT, moneyOnly: false,
    rows: [], data: null,
    /* Account, severity and category pickers are built from what the payload carries — the account
       names come from CONNECTIONS through the server, never from a list in this public file, and
       the vocabularies are whatever the workbooks actually wrote. Filtering is done server-side, so
       a filtered answer carries fewer words than the full one: the sets are accumulated across
       loads and never shrink inside a session, otherwise choosing a severity would empty its own
       picker. */
    accounts: [], severities: [], categories: []
  };

  /** An alert costing money: a money category, or anything the server ranked CRITICAL. The rank
   *  comes from the server (severity_rank) — this file never re-reads the severity words. */
  function alIsMoney(r) {
    return alHas(AL_MONEY_CATEGORIES, r.category) || Number(r.severity_rank) >= 4;
  }
  function alDotClass(r) {
    var rank = Number(r.severity_rank);
    if (rank >= 4) { return 'al-d4'; }
    if (rank === 3) { return 'al-d3'; }
    if (rank === 2) { return 'al-d2'; }
    if (rank === 1) { return 'al-d1'; }
    return '';
  }

  VIEWS.alerts = {
    label: 'Alerts centre',
    icon: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    roles: AL_ROLES,
    order: 6,
    badge: function () { return (STATE.counts && STATE.counts.alerts) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Alerts centre</h1>' +
          '<span class="sub">Every ACTIVE alert on every connected account — the most severe first, the newest within that</span>' +
          '<button class="minibtn" id="alRefresh" style="margin-left:auto">' +
            (alMayRefresh() ? 'Recompute' : 'Reload') + '</button>' +
        '</div>' +
        '<div id="alHeads"></div>' +
        '<div class="card enter d1" style="margin-top:16px"><div class="hd">Filter ' +
          '<span class="hint" id="alWhen">reading the accounts…</span></div>' +
          '<div class="bd">' +
            '<div class="al-bar">' +
              '<select class="al-sel" id="alAccount"><option value="">All accounts</option></select>' +
              '<select class="al-sel" id="alSeverity"><option value="">Any severity</option></select>' +
              '<select class="al-sel" id="alCategory"><option value="">Any category</option></select>' +
              '<button class="al-toggle" id="alMoney">Losing money only</button>' +
            '</div>' +
            '<div class="al-chips" id="alPerAccount"></div>' +
          '</div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Open alerts ' +
          '<span class="hint">Resolving marks the report’s own Status cell and records who did it in the portal</span></div>' +
          '<div class="bd" id="alList"><div class="spinner"></div></div>' +
        '</div>' +
        '<div id="alNotConnected"></div>';
    },
    init: function () {
      $('alRefresh').onclick = function () { alLoadCentre(true); };
      $('alAccount').onchange = function () { AL.account = alStr(this.value); alLoadCentre(false); };
      $('alSeverity').onchange = function () { AL.severity = alStr(this.value); alLoadCentre(false); };
      $('alCategory').onchange = function () { AL.category = alStr(this.value); alLoadCentre(false); };
      $('alMoney').onclick = function () {
        AL.moneyOnly = !AL.moneyOnly;
        this.classList.toggle('on', AL.moneyOnly);
        alRenderList();
      };
      alLoadCentre(false);
    }
  };

  function alLoadCentre(refresh) {
    var list = $('alList');
    if (!list) { return; }

    var payload = { limit: AL.limit };
    if (AL.account) { payload.account = AL.account; }
    if (AL.severity) { payload.severity = AL.severity; }
    if (AL.category) { payload.category = AL.category; }
    if (refresh && alMayRefresh()) { payload.refresh = true; }

    var ac = cachedCall('alertsCentre', payload, function (d) {
      AL.data = d || null;
      AL.rows = (d && d.alerts) || [];
      alRememberVocab(d);
      alRenderHeads(d);
      alRenderPerAccount(d);
      alRenderNotConnected(d);
      alRenderList();
      alBadge('alertsCentre', Number(d && d.active_total) || 0);
      var when = $('alWhen');
      if (when) {
        when.textContent = ((d && d.accounts && d.accounts.length) || 0) + ' account(s) · ' +
          (d && d.from_cache ? 'from the 5-minute cache' : 'read just now') +
          ' · ' + alPortalStamp(d && d.computed_at);
      }
    });
    if (!ac.painted) { list.innerHTML = '<div class="spinner"></div>'; }
    ac.done.catch(function (e) {
      AL.data = null;
      AL.rows = [];
      list.innerHTML = alRetry('The alerts could not be read just now.', e.message, 'alRetryBtn');
      var r = $('alRetryBtn');
      if (r) { r.onclick = function () { alLoadCentre(false); }; }
    });
  }

  function alRememberVocab(d) {
    var i, r;
    ((d && d.accounts) || []).forEach(function (a) {
      if (alStr(a) && !alHas(AL.accounts, a)) { AL.accounts.push(alStr(a)); }
    });
    for (i = 0; i < AL.rows.length; i++) {
      r = AL.rows[i];
      if (alStr(r.severity) && !alHas(AL.severities, r.severity)) { AL.severities.push(alStr(r.severity)); }
      if (alStr(r.category) && !alHas(AL.categories, r.category)) { AL.categories.push(alStr(r.category)); }
    }
    var acc = $('alAccount'), sev = $('alSeverity'), cat = $('alCategory');
    if (acc) { acc.innerHTML = alOptions(AL.accounts, AL.account, 'All accounts'); }
    if (sev) { sev.innerHTML = alOptions(AL.severities, AL.severity, 'Any severity'); }
    if (cat) { cat.innerHTML = alOptions(AL.categories, AL.category, 'Any category'); }
  }

  /** The three numbers a manager opens this screen for: what is open, what of it costs money, and
   *  whether the feed is the whole fleet or has been narrowed for this role. */
  function alRenderHeads(d) {
    var box = $('alHeads');
    if (!box) { return; }
    var total = Number(d && d.active_total) || 0;
    var money = 0, i;
    for (i = 0; i < AL.rows.length; i++) { if (alIsMoney(AL.rows[i])) { money++; } }
    var accounts = (d && d.accounts && d.accounts.length) || 0;
    var shown = Number(d && d.count) || 0;

    box.innerHTML = '<div class="al-heads enter d1" style="margin-top:16px">' +
      '<div class="al-head al-h-gold"><span class="k">ACTIVE alerts</span>' +
        '<b class="num">' + esc(alInt(total)) + '</b>' +
        '<span class="al-sub">' + esc(shown < total ? 'showing the ' + alInt(shown) + ' most severe' : 'across ' + alInt(accounts) + ' account(s)') + '</span></div>' +
      '<div class="al-head al-h-money ' + (money ? 'al-hot' : 'al-cool') + '"><span class="k">Losing money</span>' +
        '<b class="num">' + esc(alInt(money)) + '</b>' +
        '<span class="al-sub">' + esc(money ? 'ads, sales, fulfilment and wrong-advertising alarms' : 'nothing open in the money categories') + '</span></div>' +
      '<div class="al-head al-h-live"><span class="k">Accounts read</span>' +
        '<b class="num">' + esc(alInt(accounts)) + '</b>' +
        '<span class="al-sub">' + esc(d && d.ads_view_only ?
          'your version shows the advertising alerts and the wrong-advertising alarms' :
          'every account with a Daily Account Report connected') + '</span></div>' +
    '</div>';
  }

  function alRenderPerAccount(d) {
    var box = $('alPerAccount');
    if (!box) { return; }
    var rows = (d && d.per_account) || [];
    if (!rows.length) { box.innerHTML = ''; return; }
    box.innerHTML = rows.map(function (a) {
      if (!a.ok) {
        return '<span class="al-chip al-c-off"><span class="k">' + esc(alStr(a.account)) + '</span>' +
          esc(alStr(a.reason) || 'not connected yet') + '</span>';
      }
      var active = Number(a.active) || 0;
      var cls = active ? ' al-c-warn' : '';
      return '<span class="al-chip' + cls + '"><span class="k">' + esc(alStr(a.account)) + '</span>' +
        esc(alInt(active) + ' active of ' + alInt(a.of)) +
        (Number(a.alarms) ? esc(' · ' + alInt(a.alarms) + ' alarm(s)') : '') + '</span>';
    }).join('');
  }

  function alRenderNotConnected(d) {
    var box = $('alNotConnected');
    if (!box) { return; }
    var rows = (d && d.not_connected) || [];
    if (!rows.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="card enter d3" style="margin-top:16px"><div class="hd">Not connected yet ' +
        '<span class="hint">Management links the Daily Account Report in the registry</span></div>' +
        '<div class="bd"><div class="al-chips">' +
        rows.map(function (a) {
          return '<span class="al-chip al-c-off"><span class="k">' + esc(alStr(a.account)) + '</span>' +
            esc(alStr(a.reason) || 'not connected yet') + '</span>';
        }).join('') +
      '</div></div></div>';
  }

  function alRenderList() {
    var list = $('alList');
    if (!list) { return; }
    var d = AL.data;
    var rows = AL.rows.filter(function (r) { return !AL.moneyOnly || alIsMoney(r); });
    var hidden = AL.rows.length - rows.length;

    if (!AL.rows.length) {
      list.innerHTML = (d && (d.accounts || []).length) ?
        '<div class="al-calm">Nothing is ACTIVE on any connected account right now.' +
          '<span>The report agent rebuilds this feed on every run; the portal re-reads it every 15 minutes.</span></div>' :
        '<div class="al-empty">No account has a Daily Account Report connected yet.' +
          '<span>Management links each account’s report in the registry, and its alerts appear here.</span></div>';
      return;
    }
    if (!rows.length) {
      list.innerHTML = '<div class="al-calm">Nothing open is costing money.' +
        '<span>' + esc(alInt(hidden) + ' other alert(s) are open — switch off “Losing money only” to see them.') + '</span></div>';
      return;
    }

    /* The server has already sorted by severity and then recency; the order it sent is the order
       drawn. Nothing here re-sorts, so the screen and §13.2 agree. */
    var html = rows.map(alCard).join('');
    if (hidden) {
      html += '<div class="al-note" style="margin-top:12px">' +
        esc(alInt(hidden) + ' alert(s) hidden by “Losing money only”.') + '</div>';
    }
    if (d && Number(d.active_total) > Number(d.count) && AL.limit < AL_LIMIT_MAX) {
      html += '<div style="margin-top:14px"><button class="minibtn" id="alMore">' +
        esc('Show the rest (' + alInt(Number(d.active_total) - Number(d.count)) + ' more)') + '</button></div>';
    }
    list.innerHTML = html;

    var more = $('alMore');
    if (more) { more.onclick = function () { AL.limit = AL_LIMIT_MAX; alLoadCentre(false); }; }
    alBind(list, 'data-al-open', function (key) { alTogglePanel(key, true); });
    alBind(list, 'data-al-cancel', function (key) { alTogglePanel(key, false); });
    alBind(list, 'data-al-go', function (key, el) { alResolve(key, el); });
  }

  function alRowKey(r, i) { return String(i); }
  function alRowAt(key) {
    var rows = AL.rows.filter(function (r) { return !AL.moneyOnly || alIsMoney(r); });
    return rows[Number(key)] || null;
  }

  function alCard(r, i) {
    var money = alIsMoney(r);
    var key = alRowKey(r, i);
    var sev = alStr(r.severity);
    var cat = alStr(r.category);
    var pending = !!r.resolution_pending;
    var raised = alSheetStamp(r.raised_at);
    var seen = alSheetStamp(r.last_seen);
    var resolvedAt = alSheetStamp(r.resolved_at);

    var from = 'from ' + (alStr(r.source) || 'the account report') +
      (r.row ? ' · row ' + alInt(r.row) : '');

    return '<article class="al-card' + (money ? ' al-money' : '') + '">' +
      '<div class="al-hd">' +
        '<span class="al-dot ' + alDotClass(r) + '"></span>' +
        '<span class="al-acct">' + esc(alStr(r.account)) + '</span>' +
        (sev ? '<span class="pill al-p-sev">' + esc(sev) + '</span>' : '') +
        (cat ? '<span class="pill ' + (money ? 'al-p-money' : 'al-p-cat') + '">' + esc(cat) + '</span>' : '') +
        (pending ? '<span class="pill al-p-wait">resolved in the portal</span>' : '') +
        (raised ? '<span class="al-when">' + esc(raised) + '</span>' : '') +
      '</div>' +
      '<div class="al-bd">' +
        '<div class="al-msg">' + esc(alStr(r.message) || 'This alert carries no message.') + '</div>' +
        (alStr(r.action) ? '<div class="al-do"><span class="k">Do this</span>' + esc(alStr(r.action)) + '</div>' : '') +
        (alStr(r.listing_title) || alStr(r.item_id) ?
          '<div class="al-from">' +
            (alStr(r.listing_title) ? esc(alStr(r.listing_title)) + ' · ' : '') +
            (alStr(r.item_id) ? 'item <span class="mono">' + esc(alStr(r.item_id)) + '</span>' : '') +
          '</div>' : '') +
        '<div class="al-from">' + esc(from) +
          (alStr(r.fingerprint) ? ' · <span class="mono">' + esc(alStr(r.fingerprint)) + '</span>' : '') +
          (seen ? esc(' · last seen ' + seen) : '') +
          /* REALITY: _ALERTS fills resolved_at on rows that are still ACTIVE, so it is shown as a
             fact off the sheet and never used to decide whether this alert is open. */
          (resolvedAt ? esc(' · the report also carries resolved_at ' + resolvedAt) : '') +
          (pending && alStr(r.resolved_by) ? esc(' · portal record: ' + alStr(r.resolved_by)) : '') +
        '</div>' +
        (pending ?
          '<div class="al-note" style="margin-top:10px">Marked resolved in the portal — it stays here until the report agent’s next run rebuilds the sheet.</div>' : '') +
        '<div class="al-acts">' +
          '<button class="btn-gold" data-al-open="' + alAttr(key) + '">' + (pending ? 'Resolve again' : 'Resolve') + '</button>' +
        '</div>' +
        '<div class="al-res hidden" data-al-panel="' + alAttr(key) + '">' +
          '<input class="al-in al-wide" data-al-note="' + alAttr(key) + '" maxlength="500" placeholder="Note (optional) — kept in the portal’s own record">' +
          '<button class="btn-gold" data-al-go="' + alAttr(key) + '">Mark resolved</button>' +
          '<button class="minibtn" data-al-cancel="' + alAttr(key) + '">Cancel</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function alPanel(key) {
    var list = $('alList');
    if (!list) { return null; }
    var els = list.querySelectorAll('[data-al-panel]'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute('data-al-panel') === key) { return els[i]; } }
    return null;
  }
  function alNoteBox(key) {
    var list = $('alList');
    if (!list) { return null; }
    var els = list.querySelectorAll('[data-al-note]'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute('data-al-note') === key) { return els[i]; } }
    return null;
  }
  function alTogglePanel(key, open) {
    var panel = alPanel(key);
    if (!panel) { return; }
    panel.classList.toggle('hidden', !open);
    if (open) {
      var note = alNoteBox(key);
      if (note) { note.focus(); }
    }
  }

  /** One click, three consequences on the server: the mirror's Status cell, the portal's own SIGNALS
   *  record of WHO, and Management notified when somebody else did it. Everything this sends is a
   *  field that came from the same payload — nothing about the alert is composed here. */
  function alResolve(key, btn) {
    var r = alRowAt(key);
    if (!r) { return; }
    var note = alNoteBox(key);
    var payload = {
      account: alStr(r.account),
      fingerprint: alStr(r.fingerprint),
      raised_at: alStr(r.raised_at),
      category: alStr(r.category),
      message: alStr(r.message),
      note: note ? alStr(note.value) : ''
    };
    /* A §8.7 alarm is acknowledged through Advertising, which identifies the row by item and date
       rather than by a fingerprint the Wrong Advertising tab does not carry. */
    if (alStr(r.item_id)) { payload.item_id = alStr(r.item_id); }
    if (alStr(r.raised_at)) { payload.date = alStr(r.raised_at); }

    btn.disabled = true;
    btn.textContent = 'Resolving…';
    api('resolveAlert', payload).then(function (res) {
      var sheet = (res && res.sheet) || {};
      if (res && res.shadow) {
        toast('Shadow mode: recorded in the portal, the report is unchanged.');
      } else if (sheet.ok === false) {
        toast('Recorded in the portal. The report itself was not changed: ' + alStr(sheet.reason));
      } else {
        toast('Resolved on ' + alStr(res && res.account) + '.');
      }
      alLoadCentre(false);
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = 'Mark resolved';
      toast('Not resolved: ' + e.message);
    });
  }

  // ============================================================================================
  //                §13.2 — ACCOUNT KPIs + 30-day sparklines · §13.3 — operations counters
  // ============================================================================================

  var ALK = { account: AL_ALL, date: '', accounts: [], kpi: null, ops: null };

  VIEWS.kpis = {
    label: 'Account KPIs',
    icon: '<path d="M3 3v18h18"/><path d="M8 17v-5"/><path d="M13 17V7"/><path d="M18 17v-9"/>',
    roles: AL_ROLES,
    order: 7,
    render: function () {
      ALK.date = ALK.date || alTodayPkt();
      return '<div class="hgroup enter d1"><h1>Account KPIs</h1>' +
          '<span class="sub">Each account’s own daily ledger — the cards its Dashboard tab publishes, and the 30 days behind each one</span>' +
          '<button class="minibtn" id="alkRefresh" style="margin-left:auto">' +
            (alMayRefresh() ? 'Recompute' : 'Reload') + '</button>' +
        '</div>' +
        '<div class="card enter d1" style="margin-top:16px"><div class="hd">Account and day ' +
          '<span class="hint" id="alkWhen">reading the cache…</span></div>' +
          '<div class="bd"><div class="al-bar">' +
            '<select class="al-sel" id="alkAccount"><option value="">All accounts</option></select>' +
            '<input class="al-in" id="alkDate" type="date" value="' + alAttr(ALK.date) + '">' +
            '<button class="btn-gold" id="alkShow">Show</button>' +
            '<span class="al-note" id="alkHint">All accounts reads the dashboard cache and opens no workbook · one account reads its ledger</span>' +
          '</div></div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Operations counters ' +
          '<span class="hint">§13.3 · Pakistan time</span></div>' +
          '<div class="bd" id="alkOps"><div class="spinner"></div></div>' +
        '</div>' +
        '<div id="alkBody" style="margin-top:16px"><div class="card enter d3"><div class="bd"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
      $('alkRefresh').onclick = function () { alkLoad(true); };
      $('alkShow').onclick = function () {
        ALK.account = alStr($('alkAccount').value);
        ALK.date = alStr($('alkDate').value) || ALK.date;
        alkLoad(false);
      };
      $('alkAccount').onchange = function () { ALK.account = alStr(this.value); alkLoad(false); };
      if ($('alkDate')) {
        $('alkDate').addEventListener('change', function () { ALK.date = alStr(this.value) || ALK.date; alkLoad(false); });
        enhanceDate($('alkDate'), { kind: 'day' });
      }
      alkLoad(false);
    }
  };

  /** Both requests are fired in the same tick so the client batches them into ONE round trip —
   *  Google's ~2.5s backend load is paid per request, not per action. */
  function alkLoad(refresh) {
    var body = $('alkBody'), ops = $('alkOps');
    var force = refresh && alMayRefresh();

    var kpiPayload = {};
    if (ALK.account) { kpiPayload.account = ALK.account; }
    if (force) { kpiPayload.refresh = true; }
    var opsPayload = { date: ALK.date || alTodayPkt() };
    if (force) { opsPayload.refresh = true; }

    var kc = cachedCall('accountKpis', kpiPayload, function (d) {
      ALK.kpi = d || null;
      alkFillAccounts(d);
      if (ALK.account) { alkRenderAccount(d); } else { alkRenderFleet(d); }
    });
    if (!kc.painted && body) { body.innerHTML = '<div class="card"><div class="bd"><div class="spinner"></div></div></div>'; }
    kc.done.catch(function (e) {
      ALK.kpi = null;
      if (body) {
        body.innerHTML = '<div class="card"><div class="bd">' +
          alRetry('The KPI cards could not be read just now.', e.message, 'alkRetry') + '</div></div>';
        var r = $('alkRetry');
        if (r) { r.onclick = function () { alkLoad(false); }; }
      }
    });

    var oc = cachedCall('opsCounters', opsPayload, function (d) {
      ALK.ops = d || null;
      alkRenderOps(d);
    });
    if (!oc.painted && ops) { ops.innerHTML = '<div class="spinner"></div>'; }
    oc.done.catch(function (e) {
      ALK.ops = null;
      if (ops) {
        ops.innerHTML = alRetry('The operations counters could not be computed just now.', e.message, 'alkOpsRetry');
        var r = $('alkOpsRetry');
        if (r) { r.onclick = function () { alkLoad(false); }; }
      }
    });
  }

  /* The picker is built from the fleet answer, which lists every account with a Daily Account
     Report in CONNECTIONS. No account name is written in this file — the built page is public. */
  function alkFillAccounts(d) {
    ((d && d.accounts) || []).forEach(function (a) {
      var name = alStr(a && a.account);
      if (name && !alHas(ALK.accounts, name)) { ALK.accounts.push(name); }
    });
    var sel = $('alkAccount');
    if (sel && ALK.accounts.length) { sel.innerHTML = alOptions(ALK.accounts, ALK.account, 'All accounts'); }
  }

  // ---------- the fleet view (DASH_CACHE only) ----------
  function alkRenderFleet(d) {
    var body = $('alkBody'), when = $('alkWhen');
    if (!body) { return; }
    var rows = (d && d.accounts) || [];
    if (when) {
      when.textContent = 'from the dashboard cache · ' + alPortalStamp(d && d.computed_at);
    }
    if (!rows.length) {
      body.innerHTML = '<div class="card"><div class="bd"><div class="al-empty">No account has a Daily Account Report connected yet.' +
        '<span>Management links each account’s report in the registry; its KPI cards appear here at the next refresh.</span></div></div></div>';
      return;
    }
    body.innerHTML = '<div class="al-fleet">' + rows.map(alkFleetCard).join('') + '</div>';
    alBind(body, 'data-alk-open', function (name) {
      ALK.account = name;
      var sel = $('alkAccount');
      if (sel) { sel.value = name; }
      alkLoad(false);
    });
  }

  function alkFleetCard(a) {
    var name = alStr(a && a.account);
    if (!a || !a.ok) {
      return '<div class="card"><div class="hd">' + esc(name) + '</div><div class="bd">' +
        '<div class="al-empty">' + esc(alStr(a && a.reason) || 'not connected yet') +
        '<span>The 15-minute refresh writes each account’s cards into the dashboard cache.</span></div></div></div>';
    }
    var open = Number(a.active_alerts);
    var cards = (a.cards || []).map(function (c) {
      return '<div class="al-m-k">' + esc(alStr(c.label)) + '</div>' +
        '<div class="al-m-v num' + (c.unit === 'gbp' ? ' al-gold' : '') + '">' + esc(alValue(c.value, c.unit)) + '</div>';
    }).join('');
    return '<div class="card"><div class="hd">' + esc(name) +
        (isFinite(open) && open > 0 ? '<span class="pill al-p-money">' + esc(alInt(open)) + ' active</span>' : '') +
        '<span class="hint">' + esc(a.window_days ? alInt(a.window_days) + '-day window' : 'window not recorded') + '</span>' +
      '</div><div class="bd">' +
        (cards ? '<div class="al-mini">' + cards + '</div>' :
          '<div class="al-empty">No cached figure for this account yet.<span>The next refresh will fill it.</span></div>') +
        '<div class="al-note" style="margin-top:12px">' + esc('cached ' + (alPortalStamp(a.computed_at) || 'not yet')) +
          ' · sparklines need the account’s own ledger</div>' +
        '<div class="al-acts"><button class="minibtn" data-alk-open="' + alAttr(name) + '">Open ' + esc(name) + '</button></div>' +
      '</div></div>';
  }

  // ---------- one account: cards + 30-day sparklines ----------
  function alkRenderAccount(d) {
    var body = $('alkBody'), when = $('alkWhen');
    if (!body) { return; }
    if (!d || !d.ok) {
      body.innerHTML = '<div class="card"><div class="bd"><div class="al-empty">' +
        esc(alStr(d && d.reason) || 'not connected yet') +
        '<span>This account’s Daily Account Report is not linked in the registry yet.</span></div></div></div>';
      if (when) { when.textContent = 'not connected yet'; }
      return;
    }
    var series = d.series || { dates: [], values: {}, extra: {} };
    var cards = d.cards || [];
    var thresholds = d.thresholds || {};

    if (when) {
      when.textContent = alInt(d.window_days) + ' days · ' + alStr(d.from) + ' to ' + alStr(d.to) +
        ' · ' + (d.cached ? 'from the 5-minute cache' : 'read just now');
    }

    var meta = [];
    meta.push('<span class="al-chip"><span class="k">Window</span>' +
      esc(alStr(d.from) + ' → ' + alStr(d.to) + ' (' + alInt(d.window_days) + ' days)') + '</span>');
    if (alStr(d.prev_from)) {
      meta.push('<span class="al-chip"><span class="k">Compared with</span>' +
        esc(alStr(d.prev_from) + ' → ' + alStr(d.prev_to)) + '</span>');
    }
    meta.push('<span class="al-chip"><span class="k">Ledger</span>' +
      esc(alInt(d.ledger_rows) + ' days · ' + alInt(d.ledger_columns) + ' columns · ' + alStr(d.tab)) + '</span>');
    meta.push('<span class="al-chip"><span class="k">Thresholds</span>' +
      esc('from ' + (alStr(thresholds.source) || 'default')) + '</span>');
    if (alStr(d.newest_excluded)) {
      /* The workbook's own KPI strip leaves the newest day out while it is 🟡 PROVISIONAL, so the
         cards do too — it is still drawn in every sparkline. Said out loud rather than hidden. */
      meta.push('<span class="al-chip al-c-warn"><span class="k">Newest day</span>' +
        esc(alStr(d.newest_excluded) + ' is in the sparklines but not the cards — still provisional') + '</span>');
    }
    if (d.truncated) {
      /* A truncated read returns the OLDEST rows, which would move the window silently. */
      meta.push('<span class="al-chip al-c-bad"><span class="k">Truncated</span>' +
        esc('the ledger read hit its ceiling and returned the OLDEST rows — this window may be wrong') + '</span>');
    }

    body.innerHTML = '<div class="card enter d2"><div class="hd">' + esc(alStr(d.account)) +
        '<span class="hint">' + esc('every figure is this account’s own ledger, averaged the way its Dashboard tab averages it') + '</span>' +
      '</div><div class="bd">' +
        '<div class="al-chips" style="margin-top:0">' + meta.join('') + '</div>' +
        alkVerdict(d, series) +
        '<div class="al-kpis" style="margin-top:16px">' +
          cards.map(function (c) { return alkCard(c, series, thresholds); }).join('') +
        '</div>' +
      '</div></div>';
  }

  /** The ledger writes its own verdict for each day ('🎯 APPEAL — CTR -44%…'). Management reads the
   *  sheet's sentence, not one this portal invented. */
  function alkVerdict(d, series) {
    var extra = series.extra || {}, dates = series.dates || [];
    var why = extra.why || [], weekday = extra.weekday || [], z = extra.z || [];
    var i = why.length - 1;
    while (i >= 0 && !alStr(why[i])) { i--; }
    if (i < 0) { return ''; }
    var zn = Number(z[i]);
    var zt = Number(d.thresholds && d.thresholds.z_threshold);
    var tail = '';
    if (isFinite(zn)) {
      tail = ' · z ' + zn.toFixed(2) + (isFinite(zt) ? ' against the account’s z_threshold ' + zt : '');
    }
    return '<div class="al-verdict"><span class="k">' +
      esc('What the ledger says about ' + alStr(dates[i]) + (alStr(weekday[i]) ? ' (' + alStr(weekday[i]) + ')' : '')) +
      '</span><p>' + esc(alStr(why[i])) + esc(tail) + '</p></div>';
  }

  function alkCard(c, series, thresholds) {
    var unit = alStr(c.unit);
    var values = (series.values || {})[alStr(c.metric)] || [];
    var dates = series.dates || [];
    var miss = c.target_met === false, hit = c.target_met === true;
    var tone = miss || alStr(c.flag) === 'drop_threshold' ? 'al-t-bad' : (unit === 'gbp' ? 'al-t-gold' : 'al-t-blue');

    var sub = [];
    if (Number(c.days)) { sub.push(alInt(c.days) + ' day(s) with a reading'); }
    if (alStr(c.agg) === 'sum' && c.total !== '') { sub.push('total ' + alValue(c.total, unit)); }
    if (c.max !== '' && c.min !== '') { sub.push('high ' + alValue(c.max, unit) + ' · low ' + alValue(c.min, unit)); }
    if (c.target !== '' && c.target !== undefined) {
      sub.push('target ' + alValue(c.target, unit) + (hit ? ' · met' : miss ? ' · missed' : ''));
    }

    return '<div class="al-kpi' + (miss ? ' al-miss' : hit ? ' al-hitt' : '') + '">' +
      '<span class="k">' + esc(alStr(c.label)) + '</span>' +
      '<b class="num' + (unit === 'gbp' ? ' al-gold' : '') + '">' + esc(alValue(c.value, unit)) + '</b>' +
      alkDelta(c) +
      alkFlag(c, thresholds) +
      alSpark(values, dates, unit, tone, c.target, alStr(c.label)) +
      (sub.length ? '<span class="al-sub">' + esc(sub.join(' · ')) + '</span>' : '') +
    '</div>';
  }

  /** Direction is read from the card's own `good`, which records which way the WORKBOOK treats as
   *  better — it calls £2.25/order "over the £2.00 ceiling", so a rising ad £/order is red. */
  function alkDelta(c) {
    var d = Number(c.delta);
    if (c.delta === '' || c.delta === undefined || !isFinite(d)) { return ''; }
    if (Math.abs(d) < 0.0005) {
      return '<span class="al-delta al-flat">— level against the previous window</span>';
    }
    var up = d > 0;
    var good = alStr(c.good) === 'low' ? !up : up;
    return '<span class="al-delta ' + (good ? 'al-up' : 'al-down') + '">' +
      (up ? '▲ +' : '▼ ') + esc((d * 100).toFixed(1)) + '% vs the previous window</span>';
  }

  /** The flag names the _CONFIG key that fired — the workbook's own word, printed with the number
   *  that account holds, never a threshold invented here. */
  function alkFlag(c, thresholds) {
    var key = alStr(c.flag);
    if (!key) { return ''; }
    var v = Number(thresholds[key]);
    return '<span class="al-flag' + (key === 'drop_threshold' ? ' al-flag-hard' : '') + '">' +
      esc(key + (isFinite(v) ? ' ' + (v * 100).toFixed(0) + '%' : '')) + '</span>';
  }

  // ---------- the sparkline: inline SVG, no library ----------
  var AL_SPARK_W = 240, AL_SPARK_H = 44, AL_SPARK_PAD = 5;

  /** One polyline per unbroken run of days. A blank ledger cell is a MISSING day, not a zero
   *  (Alerts.gs treats it the same way), so the line breaks across it rather than drawing a
   *  collapse that never happened. preserveAspectRatio='none' lets the picture fill the card at any
   *  width; vector-effect keeps the stroke one pixel while it stretches. */
  function alSpark(values, dates, unit, tone, target, label) {
    var vals = values || [], pts = [], lo = Infinity, hi = -Infinity, i, n;
    for (i = 0; i < vals.length; i++) {
      n = Number(vals[i]);
      if (vals[i] === '' || vals[i] === null || vals[i] === undefined || !isFinite(n)) { pts.push(null); continue; }
      pts.push(n);
      if (n < lo) { lo = n; }
      if (n > hi) { hi = n; }
    }
    if (!isFinite(lo)) {
      return '<div class="al-spark al-none">no day in this window carries this metric</div>';
    }
    var tv = Number(target);
    /* The target is folded into the scale so the line the workbook grades itself against is always
       on the picture, never off the top of it. */
    var hasT = target !== '' && target !== null && target !== undefined && isFinite(tv);
    if (hasT) { if (tv < lo) { lo = tv; } if (tv > hi) { hi = tv; } }
    var span = hi - lo;
    if (!(span > 0)) { span = Math.abs(hi) || 1; lo = hi - span / 2; }

    var w = AL_SPARK_W, h = AL_SPARK_H, p = AL_SPARK_PAD;
    var step = pts.length > 1 ? (w - p * 2) / (pts.length - 1) : 0;
    var round = function (v) { return Math.round(v * 100) / 100; };
    var X = function (k) { return round(p + k * step); };
    var Y = function (v) { return round(h - p - ((v - lo) / span) * (h - p * 2)); };

    var body = '', seg = [], lastPt = null;
    var flush = function () {
      if (!seg.length) { return; }
      if (seg.length === 1) {
        body += '<rect class="al-sp-pt" x="' + (seg[0].x - 1.4) + '" y="' + (seg[0].y - 1.4) + '" width="2.8" height="2.8" rx="1.2"/>';
      } else {
        var line = seg.map(function (q) { return q.x + ',' + q.y; }).join(' ');
        body += '<polygon class="al-sp-fill" points="' + seg[0].x + ',' + (h - p) + ' ' + line + ' ' +
          seg[seg.length - 1].x + ',' + (h - p) + '"/>' +
          '<polyline class="al-sp-line" points="' + line + '" vector-effect="non-scaling-stroke"/>';
      }
      seg = [];
    };
    for (i = 0; i < pts.length; i++) {
      if (pts[i] === null) { flush(); continue; }
      lastPt = { x: X(i), y: Y(pts[i]), v: pts[i], i: i };
      seg.push({ x: lastPt.x, y: lastPt.y });
    }
    flush();
    if (hasT) {
      body = '<line class="al-sp-t" x1="' + p + '" x2="' + (w - p) + '" y1="' + Y(tv) + '" y2="' + Y(tv) +
        '" vector-effect="non-scaling-stroke"/>' + body;
    }
    if (lastPt) {
      body += '<rect class="al-sp-pt" x="' + (lastPt.x - 2) + '" y="' + (lastPt.y - 2) + '" width="4" height="4" rx="1.6"/>';
    }

    var caption = alStr(label) + ' · ' + pts.length + ' day(s)' +
      (alStr(dates[0]) ? ' from ' + alStr(dates[0]) : '') +
      (alStr(dates[dates.length - 1]) ? ' to ' + alStr(dates[dates.length - 1]) : '') +
      ' · high ' + alValue(hi, unit) + ' · low ' + alValue(lo, unit) +
      (hasT ? ' · the dashed line is the target ' + alValue(tv, unit) : '');

    return '<svg class="al-spark ' + tone + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" ' +
      'role="img" aria-label="' + alAttr(caption) + '"><title>' + esc(caption) + '</title>' + body + '</svg>';
  }

  // ---------- §13.3 the operations counters ----------
  function alkRenderOps(d) {
    var box = $('alkOps');
    if (!box) { return; }
    var counters = (d && d.counters) || [];
    if (!counters.length) {
      box.innerHTML = '<div class="al-empty">No counter could be computed for this day.</div>';
      return;
    }
    /* Drawn in the order §13.3 lists them, which is the order the server sends. */
    box.innerHTML = '<div class="al-ops">' + counters.map(alkOpTile).join('') + '</div>' +
      '<div class="al-note" style="margin-top:12px">' +
        esc('Day ' + alStr(d.date) + ' (Pakistan time) · ' + alPortalStamp(d.computed_at) +
          (d.refreshed ? ' · recomputed now' : '')) +
      '</div>';
  }

  function alkOpTile(c) {
    var metric = alStr(c.metric);
    var value = c.value;
    var missing = value === '' || value === null || value === undefined;
    var n = Number(value);
    var cls = 'al-o-live';
    if (metric === AL_OPS_ORDERS_CAME) { cls = 'al-o-gold'; }
    if (metric === AL_OPS_WRONG && isFinite(n) && n > 0) { cls = 'al-o-warn'; }
    if (metric === AL_OPS_OVERDUE) { cls = isFinite(n) && n > 0 ? 'al-o-hot' : 'al-o-live'; }
    if (missing) { cls = 'al-o-none'; }

    var sub = [];
    if (missing && alStr(c.reason)) { sub.push(alStr(c.reason)); }
    if (metric === AL_OPS_RECHECKED && c.of !== undefined) {
      sub.push('of ' + alInt(c.of) + ' due' + (c.stages !== undefined ? ' · ' + alInt(c.stages) + ' stage(s)' : ''));
    }
    if (metric === AL_OPS_WRONG && c.month_to_date !== undefined) {
      sub.push(alInt(c.month_to_date) + ' this month');
      if (c.scan_capped) { sub.push('the log scan hit its window — the month figure may be short'); }
    }
    if (metric === AL_OPS_CS && c.reports !== undefined) {
      sub.push('from ' + alInt(c.reports) + ' report(s) · “' + alStr(c.field) + '”');
    }
    if (metric === AL_OPS_ORDERS_CAME && c.per_account) {
      sub.push(alInt(c.per_account.length) + ' workbook(s) read');
      if ((c.not_connected || []).length) { sub.push(alInt(c.not_connected.length) + ' not connected yet'); }
    }
    if (metric === AL_OPS_OVERDUE && !missing) {
      sub.push(isFinite(n) && n > 0 ? 'past the ship-by date right now' : 'nothing past its ship-by date');
    }
    if (alStr(c.source)) { sub.push(alStr(c.source)); }
    if (c.from_cache) { sub.push('from the dashboard cache'); }
    if (alStr(c.period)) { sub.push('period ' + alStr(c.period)); }

    return '<div class="al-op ' + cls + '">' +
      '<span class="k">' + esc(metric) + '</span>' +
      '<b class="num">' + esc(missing ? 'not available' : alInt(value)) + '</b>' +
      (sub.length ? '<span class="al-sub">' + esc(sub.join(' · ')) + '</span>' : '') +
    '</div>';
  }

})();
