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
  var AL_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Sales Operations', 'Advertising Manager', 'CS'];
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
    /* R7-7 acknowledgement + SLA */
    '.al-ack{margin-top:12px;padding:11px 12px;border-radius:10px;border:1px solid var(--gold-line);background:rgba(120,132,152,.06)}' +
    '.al-ack-strict{border-color:rgba(240,96,90,.5);background:var(--bad-soft)}' +
    '.al-acklab{display:block;font-size:11.5px;font-weight:800;color:var(--text-2);margin-bottom:6px}' +
    '.al-ack-strict .al-acklab{color:var(--bad)}' +
    '.pill.al-breach{background:var(--bad-soft);color:var(--bad);border:1px solid rgba(240,96,90,.5);font-size:10px}' +
    '.pill.al-late{background:var(--warn-soft);color:var(--warn);font-size:10px}' +
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
    '.al-seen{color:var(--gold-a);font-weight:700}' +
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
    rows: [], data: null, junk: 0, staff: null,
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

  VIEW_CSS.push(
    '.al-depts{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:12px 0 4px}' +
    '.al-dept{border:1px solid var(--gold-line);border-radius:12px;padding:11px 14px;background:var(--panel-2);cursor:pointer;transition:border-color .15s}' +
    '.al-dept:hover{border-color:var(--gold-line-hi)}' +
    '.al-dept.on{border-color:var(--gold)}' +
    '.al-dept.hot{border-color:rgba(240,96,90,.55)}' +
    '.al-dept .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.al-dept b{display:block;font-size:24px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}' +
    '.al-dept.hot b{color:var(--bad)}' +
    '.al-dept .s{font-size:10px;color:var(--text-3);font-weight:700}' +
    '.al-card.al-big{border-width:2px;border-color:rgba(240,96,90,.6);box-shadow:0 0 24px rgba(240,96,90,.10)}' +
    '.al-card.al-big .al-msg{font-size:16.5px;font-weight:800;line-height:1.45}' +
    '.al-task{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.al-task select,.al-task input{padding:8px 10px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:11.5px;font-weight:600}' +
    '.al-rolechips{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}' +
    '.al-rolechip{font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;border:1px solid var(--gold-line);background:var(--panel);cursor:pointer;color:var(--text-2)}' +
    '.al-rolechip.on{border-color:var(--gold);color:var(--gold)}'
  );

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
        '<div id="alDepts" class="enter d2"></div>' +
        '<div class="card enter d1" style="margin-top:16px"><div class="hd">The Engine&#39;s letters ' +
          '<span class="hint">every alarm the portal itself raised — waste, CPC rule, violations, zero-sale, digests — kept until handled</span></div>' +
          '<div class="bd" id="alMailBox"><div class="spinner"></div></div>' +
        '</div>' +
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
      alLoadMail();
    }
  };

  /* Hasib item 7: the Engine's own bells, shown like mail — subject, body, when, to whom —
     each opening into its detail with a Mark handled that records who. */
  function alLoadMail() {
    var box = $('alMailBox');
    if (!box) { return; }
    api('alertMail', {}).then(function (d) {
      d = d || {};
      var rows = d.rows || [];
      if (!rows.length) {
        box.innerHTML = '<div class="al-calm">The Engine has raised nothing yet.' +
          '<span>Waste alarms, CPC-rule bells, violations and digests all file here the moment they ring.</span></div>';
        return;
      }
      /* Grouped by type: one loud day of the CPC rule filed 84 same-type letters and buried
         everything else. A type with more than 3 open letters folds to one line with its count
         and a mark-all button; small types stay expanded. */
      var groups = {}, order = [];
      rows.forEach(function (r) {
        var t = alStr(r.type) || '(untyped)';
        if (!groups[t]) { groups[t] = { open: [], done: [] }; order.push(t); }
        groups[t][alStr(r.resolved_at) ? 'done' : 'open'].push(r);
      });
      /* Review 4b: the inbox pattern — compact subject rows, click one and it OPENS like an
         email: sender, recipient, time, the full letter with item/order ids auto-linked, and
         the Mark-handled action inside the reading pane. */
      var byId = {};
      rows.forEach(function (r) { byId[String(r.id)] = r; });
      /* R7-7: money alerts (price/CPC/campaign/ad waste) are STRICT — 2-hour SLA, feedback
         mandatory, never bulk-cleared. Mirror of the engine's alertStrict(). */
      function alStrict(type) { return /price|pricing|cpc|campaign|advertis|waste|roas|ad ?spend|ad ?fee/i.test(String(type || '')); }
      function alAgeH(created) {
        var ms = Date.parse(String(created || '').replace(' ', 'T') + 'Z');
        return isFinite(ms) ? (Date.now() - ms) / 3600000 : 0;
      }
      function alOverdue(r) {
        if (alStr(r.resolved_at)) { return ''; }
        var h = alAgeH(r.created_at), strict = alStrict(r.type);
        if (strict && h >= 2) { return 'breach'; }
        if (!strict && h >= 6) { return 'late'; }
        return '';
      }
      function letterCard(r) {
        var openR = !alStr(r.resolved_at), od = alOverdue(r);
        return '<article class="al-card" data-al-open="' + alAttr(String(r.id)) + '" style="cursor:pointer;padding:8px 12px;margin:4px 0;' + (openR ? '' : 'opacity:.55') + '">' +
          '<div class="al-hd" style="margin:0"><span class="al-dot ' + (openR ? (od === 'breach' ? 'sev-high' : 'sev-high') : 'ok') + '"></span>' +
            '<span class="al-acct" style="font-size:12px">' + esc(alStr(r.type)) + '</span>' +
            (od === 'breach' ? '<span class="pill al-breach">⛔ SLA 2h</span>' : (od === 'late' ? '<span class="pill al-late">⏰ overdue</span>' : '')) +
            '<span style="font-weight:' + (openR ? '800' : '600') + ';font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">' + esc(alStr(r.message).slice(0, 110)) + '</span>' +
            '<span class="al-when">' + esc(alStr(r.created_at).slice(5, 16)) + '</span></div>' +
          '</article>';
      }
      function alLink(text) {
        /* item ids and order ids become links inside the opened letter */
        var e0 = esc(text);
        e0 = e0.replace(/\b(\d{12})\b/g, '<a href="https://www.ebay.co.uk/itm/$1" target="_blank" rel="noopener noreferrer" style="color:var(--gold-a)">$1</a>');
        e0 = e0.replace(/\b(\d{2}-\d{5}-\d{5})\b/g, '<a href="https://www.ebay.co.uk/sh/ord/details?orderid=$1" target="_blank" rel="noopener noreferrer" style="color:var(--gold-a)">$1</a>');
        return e0;
      }
      function alOpenLetter(id) {
        var r = byId[String(id)];
        var pane = $('alReader');
        if (!r || !pane) { return; }
        var openR = !alStr(r.resolved_at), strict = alStrict(r.type), od = alOverdue(r);
        pane.innerHTML = '<article class="al-card al-money" style="margin-bottom:12px">' +
          '<div class="al-hd"><span class="al-dot ' + (openR ? 'sev-high' : 'ok') + '"></span>' +
            '<span class="al-acct" style="font-size:14px">' + esc(alStr(r.type)) + '</span>' +
            '<span class="al-when">' + esc(alStr(r.created_at).slice(0, 16)) + ' UTC</span>' +
            '<button class="minibtn" id="alReaderClose" style="margin-left:auto">Close</button></div>' +
          '<div class="al-bd">' +
            '<div class="al-from" style="margin-bottom:8px">From <b>M98M Engine</b> — the automated watch · to <b>' + esc(alStr(r.to_addr).split('@')[0]) + '</b></div>' +
            '<div class="al-msg" style="font-size:13.5px;line-height:1.65;white-space:pre-wrap">' + alLink(alStr(r.message)) + '</div>' +
            '<div class="al-from" style="margin-top:10px">ref <span class="mono">' + esc(alStr(r.ref)) + '</span>' +
              (openR ? '' : esc(' · handled by ' + alStr(r.resolved_by).split('@')[0] + ' · ' + alStr(r.resolved_at).slice(0, 16)) +
                (alStr(r.note) ? '<div style="margin-top:4px">' + esc('note: ' + alStr(r.note)) + '</div>' : '')) + '</div>' +
            /* R7-7: acknowledgement now demands written feedback, strictly for money alerts. */
            (openR ? '<div class="al-ack' + (strict ? ' al-ack-strict' : '') + '">' +
              '<label class="al-acklab">' + (strict
                ? '⛔ Pricing/advertising alert — written feedback required: what did you change and why?'
                : 'What did you do about it? A short note is required to acknowledge.') + '</label>' +
              '<textarea class="al-in al-wide" id="alAckNote" rows="2" maxlength="400" placeholder="' +
                (strict ? 'e.g. cut CPC to 8% on 3 items, held price — ROAS was under target' : 'the action you took') + '"></textarea>' +
              '<div class="al-acts"><button class="btn-gold" data-al-mail="' + alAttr(String(r.id)) + '">Acknowledge with feedback</button>' +
                '<span class="al-note" style="margin-top:0">' + (od === 'breach' ? '⛔ Past its 2-hour SLA — Management has been alerted.' : (od === 'late' ? '⏰ Overdue.' : '')) + '</span></div>' +
              '</div>' : '') +
          '</div></article>';
        try { pane.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {}
        var cb = $('alReaderClose');
        if (cb) { cb.onclick = function () { pane.innerHTML = ''; }; }
        pane.querySelectorAll('[data-al-mail]').forEach(function (mb) {
          mb.onclick = function () {
            var noteEl = $('alAckNote'), note = noteEl ? String(noteEl.value || '').trim() : '';
            var min = strict ? 8 : 3;
            if (note.length < min) {
              toast(strict ? 'This pricing/advertising alert needs real feedback — say what you changed and why.'
                : 'Write a short note on what you did — it is required to acknowledge.');
              if (noteEl) { noteEl.focus(); }
              return;
            }
            this.disabled = true;
            api('alertMailResolve', { id: Number(this.getAttribute('data-al-mail')), note: note })
              .then(function () { toast('Acknowledged with feedback.'); pane.innerHTML = ''; alLoadMail(); })
              .catch(function (e2) { toast(e2.message); alLoadMail(); });
          };
        });
      }
      var h2 = '<div id="alReader"></div><div style="max-height:460px;overflow-y:auto">';
      order.forEach(function (t) {
        var g = groups[t];
        var big = g.open.length > 3;
        h2 += '<div class="al-hd" style="margin:10px 0 6px;gap:8px">' +
          '<span class="al-acct">' + esc(t) + '</span>' +
          '<span class="pill ' + (g.open.length ? 'al-p-sev' : 'al-p-cat') + '">' + g.open.length + ' open</span>' +
          (g.done.length ? '<span class="al-when">' + g.done.length + ' handled</span>' : '') +
          (big ? '<button class="minibtn" data-al-expand="' + alAttr(t) + '">Show all</button>' +
                 /* R7-7: money alerts can be batch-cleared only WITH a written note for the batch. */
                 '<button class="minibtn' + (alStrict(t) ? ' hu-revbtn' : '') + '" data-al-bulk="' + alAttr(t) + '">Mark all ' + g.open.length + ' handled' + (alStrict(t) ? ' (note required)' : '') + '</button>' : '') +
          '</div>';
        var show = big ? g.open.slice(0, 2) : g.open.concat(g.done.slice(0, 3));
        h2 += '<div data-al-group="' + alAttr(t) + '">' + show.map(letterCard).join('') + '</div>';
      });
      box.innerHTML = h2 + '</div>';
      box.querySelectorAll('[data-al-open]').forEach(function (row) {
        row.onclick = function () { alOpenLetter(this.getAttribute('data-al-open')); };
      });
      box.querySelectorAll('[data-al-mail]').forEach(function (b) {
        b.onclick = function () {
          this.disabled = true;
          api('alertMailResolve', { id: Number(this.getAttribute('data-al-mail')) })
            .then(function () { toast('Handled.'); alLoadMail(); })
            .catch(function (e) { toast(e.message); alLoadMail(); });
        };
      });
      box.querySelectorAll('[data-al-expand]').forEach(function (b) {
        b.onclick = function () {
          var t = this.getAttribute('data-al-expand');
          var cont = box.querySelector('[data-al-group="' + t.replace(/"/g, '\\"') + '"]');
          if (!cont) { return; }
          var g = groups[t];
          cont.innerHTML = g.open.concat(g.done).map(letterCard).join('');
          cont.querySelectorAll('[data-al-open]').forEach(function (row) {
            row.onclick = function () { alOpenLetter(this.getAttribute('data-al-open')); };
          });
          this.remove();
          cont.parentElement.querySelectorAll('[data-al-mail]').forEach(function (mb) {
            mb.onclick = function () {
              this.disabled = true;
              api('alertMailResolve', { id: Number(this.getAttribute('data-al-mail')) })
                .then(function () { toast('Handled.'); alLoadMail(); })
                .catch(function (e) { toast(e.message); alLoadMail(); });
            };
          });
        };
      });
      box.querySelectorAll('[data-al-bulk]').forEach(function (b) {
        b.onclick = function () {
          var t = this.getAttribute('data-al-bulk');
          var payload = { type: t };
          if (alStrict(t)) {
            var note = window.prompt('These are pricing/advertising alerts. Write one note for the whole batch — what did you do about them?');
            if (note === null) { return; }
            if (String(note).trim().length < 8) { toast('A real note is required to clear pricing/advertising alerts in bulk.'); return; }
            payload.note = String(note).trim();
          }
          this.disabled = true; this.textContent = 'Handling…';
          api('alertMailResolveAll', payload)
            .then(function (res) { toast((res && res.handled || 0) + ' letters handled.'); alLoadMail(); })
            .catch(function (e) { toast(e.message); alLoadMail(); });
        };
      });
    }).catch(function (e) {
      box.innerHTML = '<div class="al-note">Could not read the Engine letters: ' + esc(e.message) + '</div>';
    });
  }

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
      var raw = (d && d.alerts) || [];
      /* 2 Sept (owner): _ALERTS carries structural rows with no message — they are not alerts
         and rendered as "carries no message" noise. They are skipped and counted honestly. */
      AL.rows = raw.filter(function (r) { return alStr(r.message).trim() !== ''; });
      AL.junk = raw.length - AL.rows.length;
      alRememberVocab(d);
      alRenderHeads(d);
      alRenderDepts();
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

  /* 2 Sept (owner): open alerts BY DEPARTMENT — a tile per category; clicking one takes you
     to exactly those alerts (it drives the same category filter the select uses). */
  function alRenderDepts() {
    var box = $('alDepts');
    if (!box) { return; }
    var by = {};
    AL.rows.forEach(function (r) {
      var c = alStr(r.category) || 'Uncategorised';
      var b = (by[c] = by[c] || { n: 0, money: 0, high: 0 });
      b.n++;
      if (alIsMoney(r)) { b.money++; }
      if (/high|critical/i.test(alStr(r.severity))) { b.high++; }
    });
    var cats = Object.keys(by).sort(function (a, b) { return by[b].n - by[a].n; });
    if (!cats.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="al-depts">' + cats.map(function (c) {
      var b = by[c];
      return '<div class="al-dept' + (AL.category === c ? ' on' : '') + (b.high ? ' hot' : '') + '" data-al-dept="' + alAttr(c) + '">' +
        '<span class="k">' + esc(c) + '</span><b>' + b.n + '</b>' +
        '<span class="s">' + (b.high ? b.high + ' high · ' : '') + (b.money ? b.money + ' losing money' : 'open') + '</span></div>';
    }).join('') +
      (AL.category ? '<div class="al-dept" data-al-dept=""><span class="k">Clear filter</span><b>×</b><span class="s">show every department</span></div>' : '') +
      '</div>' +
      (AL.junk ? '<div class="al-note" style="margin-top:6px">' + esc(alInt(AL.junk) + ' structural row(s) without a message skipped — they are not alerts.') + '</div>' : '');
    alBind(box, 'data-al-dept', function (c) {
      AL.category = c;
      var sel = $('alCategory');
      if (sel) { sel.value = c; }
      alLoadCentre(false);
      var list = $('alList');
      if (list && c) { try { list.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
    });
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
    alBind(list, 'data-al-mktask', function (key) { alTaskPanel(key, true); });
    alBind(list, 'data-al-taskcancel', function (key) { alTaskPanel(key, false); });
    alBind(list, 'data-al-taskgo', function (key, el) { alTaskCreate(key, el); });
  }

  /* 2 Sept (owner): turn any alert into a TASK for a department’s person or an individual —
     the same createTask the tasks screen uses, prefilled from the alert. */
  var AL_DEPT_ROLES = { Advertising: ['Advertising Manager'], Listing: ['Listing Manager', 'Item Lister', 'Team Lead'],
    Orders: ['Order Processor'], CS: ['CS'], Hunting: ['Product Hunter'], All: [] };
  function alStaffLoad(cb) {
    if (AL.staff) { cb(AL.staff); return; }
    api('assignableStaff', {}).then(function (d) { AL.staff = (d && d.staff) || []; cb(AL.staff); })
      .catch(function () { AL.staff = []; cb(AL.staff); });
  }
  function alTaskPanel(key, show) {
    var list = $('alList');
    if (!list) { return; }
    var panel = null, els = list.querySelectorAll('[data-al-taskpanel]'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute('data-al-taskpanel') === key) { panel = els[i]; } else if (show) { els[i].classList.add('hidden'); } }
    if (!panel) { return; }
    panel.classList.toggle('hidden', !show);
    if (!show) { return; }
    var dl = panel.querySelector('[data-al-deadline]');
    if (dl && !dl.value) {
      var t = new Date(Date.now() + 24 * 3600000);
      dl.value = t.toISOString().slice(0, 10) + 'T18:00';
    }
    alStaffLoad(function (staff) {
      var sel = panel.querySelector('[data-al-assignee]');
      var chips = panel.querySelector('[data-al-rolechips]');
      var paint = function (roleFilter) {
        var roles = AL_DEPT_ROLES[roleFilter] || [];
        sel.innerHTML = '<option value="">Assign to…</option>' + staff
          .filter(function (u) { return !roles.length || roles.indexOf(u.role) >= 0; })
          .map(function (u) { return '<option value="' + alAttr(u.email) + '">' + esc(u.name + ' — ' + u.role) + '</option>'; }).join('');
      };
      if (chips && !chips.childNodes.length) {
        chips.innerHTML = Object.keys(AL_DEPT_ROLES).map(function (dpt) {
          return '<span class="al-rolechip' + (dpt === 'All' ? ' on' : '') + '" data-al-rc="' + alAttr(dpt) + '">' + esc(dpt) + '</span>';
        }).join('');
        chips.querySelectorAll('[data-al-rc]').forEach(function (c) {
          c.onclick = function () {
            chips.querySelectorAll('[data-al-rc]').forEach(function (x) { x.classList.remove('on'); });
            this.classList.add('on');
            paint(this.getAttribute('data-al-rc'));
          };
        });
      }
      paint('All');
    });
  }
  function alTaskCreate(key, btn) {
    var r = alRowAt(key);
    var list = $('alList');
    if (!r || !list) { return; }
    var panel = null, els = list.querySelectorAll('[data-al-taskpanel]'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute('data-al-taskpanel') === key) { panel = els[i]; } }
    if (!panel) { return; }
    var who = (panel.querySelector('[data-al-assignee]') || {}).value || '';
    var dl = (panel.querySelector('[data-al-deadline]') || {}).value || '';
    if (!who) { toast('Pick who the task is for.'); return; }
    if (!dl) { toast('Set the deadline.'); return; }
    var msg = alStr(r.message);
    var payload = {
      type: 'general',
      assigned_to: who,
      title: ('[Alert] ' + alStr(r.account) + ' — ' + msg).slice(0, 140),
      deadline_pkt: dl.replace('T', ' '),
      account: alStr(r.account),
      priority: /high|critical/i.test(alStr(r.severity)) ? 'High' : 'Normal',
      details: 'From the Alerts centre (' + alStr(r.category) + ' · ' + alStr(r.severity) + ').\n\n' + msg +
        (alStr(r.action) ? '\n\nDo this: ' + alStr(r.action) : '') +
        (alStr(r.listing_title) ? '\n\nListing: ' + alStr(r.listing_title) : '') +
        (alStr(r.item_id) ? '\nItem: ' + alStr(r.item_id) : '') +
        '\n\nSource: ' + (alStr(r.source) || 'account report') + (r.row ? ' row ' + alInt(r.row) : ''),
    };
    btn.disabled = true;
    api('createTask', payload).then(function (res) {
      btn.disabled = false;
      alTaskPanel(key, false);
      toast('Task ' + ((res && res.task_id) || '') + ' created — it is on their board now.');
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not created — ' + e.message);
    });
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

    var big = /high|critical/i.test(sev);
    return '<article class="al-card' + (money ? ' al-money' : '') + (big ? ' al-big' : '') + '">' +
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
          (alStr(r.seen_by) ? '<span class="al-seen"> · seen by ' + esc(alStr(r.seen_by).split(' @ ')[0]) + '</span>' : '') +
        '</div>' +
        (pending ?
          '<div class="al-note" style="margin-top:10px">Marked resolved in the portal — it stays here until the report agent’s next run rebuilds the sheet.</div>' : '') +
        '<div class="al-acts">' +
          '<button class="btn-gold" data-al-open="' + alAttr(key) + '">' + (pending ? 'Resolve again' : 'Resolve') + '</button>' +
          '<button class="minibtn" data-al-mktask="' + alAttr(key) + '">Create task…</button>' +
        '</div>' +
        '<div class="al-res hidden" data-al-taskpanel="' + alAttr(key) + '">' +
          '<div class="al-rolechips" data-al-rolechips="' + alAttr(key) + '"></div>' +
          '<div class="al-task">' +
            '<select data-al-assignee="' + alAttr(key) + '" style="min-width:220px"><option value="">Assign to…</option></select>' +
            '<input type="datetime-local" data-al-deadline="' + alAttr(key) + '">' +
            '<button class="btn-gold" data-al-taskgo="' + alAttr(key) + '">Create the task</button>' +
            '<button class="minibtn" data-al-taskcancel="' + alAttr(key) + '">Cancel</button>' +
          '</div>' +
          '<div class="al-note" style="margin-top:6px">The task carries this alert’s message, its “do this” line and its source; pick a department chip to narrow the people list.</div>' +
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

  /* TRUTH v2 WO-14: the old Account KPIs section (~470 lines) was deleted — the register version
     in its own view file replaced it at the module flip (R9). */
})();
