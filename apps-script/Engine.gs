/** Phase B — the Apps Script side of the Engine (contract §1).
 * The Engine's users/accounts truth is pushed FROM here (the Portal DB stays the master), so the
 * edge is at most one push behind. The shared secret lives in Script Properties (ENGINE_SYNC_KEY)
 * and the Engine URL in CONFIG engine_url — nothing secret ever reaches the public frontend. */

function enginePost_(action, payload) {
  const url = getConfig('engine_url');
  if (!url) throw new Error('SAY: CONFIG engine_url is not set yet — the Engine is not deployed');
  const key = PropertiesService.getScriptProperties().getProperty('ENGINE_SYNC_KEY');
  if (!key) throw new Error('SAY: ENGINE_SYNC_KEY is missing from Script Properties');
  const resp = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ action: action, key: key, payload: payload || {} }),
    muteHttpExceptions: true,
  });
  const body = JSON.parse(resp.getContentText() || '{}');
  if (!body.ok) throw new Error('engine ' + action + ': ' + String(body.error || resp.getResponseCode()));
  return body.data;
}

/** Trigger candidate (hourly) and also safe to run by hand after staff changes. */
/* ---------- service-metric watch (26 Aug, owner) ----------
   "Detect transaction defect, new late-shipment case, any change in any service-metrics number,
   positive-feedback rating change — send it to Customer Service and Management." The engine syncs
   seller standards, the two customer-service metrics and the feedback summary into D1 but never
   watched them for CHANGE. This reads those tables through the engine (the worker is reachable even
   while the Cloudflare dashboard API is blocked), diffs against yesterday's snapshot in Script
   Properties, and letters CS + Management on every movement. Once per UK day, so a metric that
   flickers cannot spam the desk. */
function metricsNotifyCsMgmt_(type, message, ref) {
  const seen = {};
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const role = String(u.role || '');
    if (MGMT_ROLES.indexOf(role) < 0 && role !== 'CS') return;
    const e = normalizeEmail(u.email);
    if (seen[e]) return; seen[e] = 1;
    notify_(u.email, type, message, ref);
  });
  (typeof SUPER_ADMINS !== 'undefined' ? SUPER_ADMINS : []).forEach(function (e) {
    if (!seen[normalizeEmail(e)]) { seen[normalizeEmail(e)] = 1; notify_(e, type, message, ref); }
  });
}

/** One account's watched numbers, folded to a compact comparable object. */
function metricsSignature_(standardsRows, csMetricRows, feedbackRows, account) {
  const sig = { level: '', metrics: {}, inad: '', inr: '', fb_score: '', fb_pos: '', fb_neg: '' };
  const sRow = standardsRows.filter(function (r) { return String(r.account) === account; })[0];
  if (sRow) {
    try {
      const arr = JSON.parse(sRow.json || '[]');
      const prof = (arr && arr.length) ? arr[0] : null;
      if (prof) {
        sig.level = String(prof.standardsLevel || '');
        (prof.metrics || []).forEach(function (m) {
          if (m && m.metricKey) sig.metrics[String(m.metricKey)] = String(m.value);
        });
      }
    } catch (e) {}
  }
  csMetricRows.filter(function (r) { return String(r.account) === account; }).forEach(function (r) {
    try {
      const j = JSON.parse(r.json || '{}');
      const rate = j && j.customerServiceMetric ? '' : (j && j.value !== undefined ? String(j.value) : '');
      const v = (j && j.metricValue) || (j && j.value) || (j && j.customerServiceMetric) || rate || '';
      if (String(r.metric_type) === 'ITEM_NOT_AS_DESCRIBED') sig.inad = JSON.stringify(v).slice(0, 60);
      if (String(r.metric_type) === 'ITEM_NOT_RECEIVED') sig.inr = JSON.stringify(v).slice(0, 60);
    } catch (e) {}
  });
  const fRow = feedbackRows.filter(function (r) { return String(r.account) === account; })[0];
  if (fRow) { sig.fb_score = String(fRow.score); sig.fb_pos = String(fRow.pos_pct); sig.fb_neg = String(fRow.neg_30d); }
  return sig;
}

function metricsRowsFrom_(dump) {
  const h = dump.header || [];
  return (dump.rows || []).map(function (row) { const o = {}; h.forEach(function (c, i) { o[c] = row[i]; }); return o; });
}

function metricsWatch() {
  const props = PropertiesService.getScriptProperties();
  const ukDay = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
  if (props.getProperty('METRICS_WATCH_DAY') === ukDay) return 'already ran today';

  let standards, csm, fb;
  try {
    standards = metricsRowsFrom_(enginePost_('backupDump', { table: 'cs_standards' }));
    csm = metricsRowsFrom_(enginePost_('backupDump', { table: 'cs_metrics' }));
    fb = metricsRowsFrom_(enginePost_('backupDump', { table: 'feedback_summary' }));
  } catch (e) { return 'engine read failed: ' + String(e && e.message || e).slice(0, 120); }

  const accounts = {};
  [standards, fb, csm].forEach(function (rows) { rows.forEach(function (r) { if (r.account) accounts[String(r.account)] = 1; }); });

  const prev = (function () { try { return JSON.parse(props.getProperty('METRICS_SNAPSHOT') || '{}'); } catch (e) { return {}; } })();
  const next = {};
  let changed = 0;
  const NICE = { TRANSACTION_DEFECT_RATE: 'transaction defect rate', SHIPPING_MISS_RATE: 'late shipment rate',
    LATE_SHIPMENT_RATE: 'late shipment rate', CASES_CLOSED_WITHOUT_SELLER_RESOLUTION: 'cases not resolved' };

  Object.keys(accounts).forEach(function (acct) {
    const sig = metricsSignature_(standards, csm, fb, acct);
    next[acct] = sig;
    const was = prev[acct];
    if (!was) return;                          // first time we see an account is not a "change"
    const notes = [];
    if (sig.level && was.level && sig.level !== was.level) notes.push('seller level ' + was.level + ' → ' + sig.level);
    Object.keys(sig.metrics).forEach(function (k) {
      if (was.metrics && was.metrics[k] !== undefined && was.metrics[k] !== sig.metrics[k]) {
        notes.push((NICE[k] || k.replace(/_/g, ' ').toLowerCase()) + ' ' + was.metrics[k] + ' → ' + sig.metrics[k]);
      }
    });
    if (was.inad && sig.inad && was.inad !== sig.inad) notes.push('“item not as described” metric moved');
    if (was.inr && sig.inr && was.inr !== sig.inr) notes.push('“item not received” metric moved');
    if (was.fb_score && sig.fb_score && was.fb_score !== sig.fb_score) notes.push('feedback score ' + was.fb_score + ' → ' + sig.fb_score);
    if (was.fb_pos && sig.fb_pos && was.fb_pos !== sig.fb_pos) notes.push('positive-feedback % ' + was.fb_pos + ' → ' + sig.fb_pos);
    if (was.fb_neg !== undefined && sig.fb_neg !== undefined && was.fb_neg !== sig.fb_neg) notes.push('negatives (30d) ' + was.fb_neg + ' → ' + sig.fb_neg);
    if (notes.length) {
      changed++;
      metricsNotifyCsMgmt_('Service metric changed',
        '📉 ' + acct + ' — ' + notes.join(' · ') + '. eBay account health moved; check the Customer service desk / Feedback board.',
        'metricswatch:' + acct + ':' + ukDay);
    }
  });

  props.setProperty('METRICS_SNAPSHOT', JSON.stringify(next).slice(0, 9000));
  props.setProperty('METRICS_WATCH_DAY', ukDay);
  logActivity_('system', 'METRICS_WATCH', 'all', '', String(changed) + ' account(s) changed', Object.keys(accounts).length + ' watched');
  return 'metricsWatch: ' + changed + ' change(s) across ' + Object.keys(accounts).length + ' account(s)';
}

function pushEngineSync() {
  const users = readTab_('USERS').map(function (u) {
    return { email: String(u.email || ''), name: String(u.name || ''), role: String(u.role || ''),
      status: String(u.status || ''), modules: String(u.modules || ''), tools: String(u.tools || ''),
      super: isSuperAdmin(u.email) };
  });
  const su = enginePost_('syncUsers', { users: users });

  /* Which accounts have API is NOT a hardcoded fact any more (25 Aug). The old list named five
   * and explicitly excluded 'hasib', so the hour after Sir Hasib was connected this push turned
   * him back off — his 151 listings and 278 orders vanished from every screen for a day. The
   * Engine now keeps any account that holds a real refresh token switched on regardless of what
   * this list says; this list is only the starting hint for accounts with no token yet. */
  const apiNorm = ['hafiza', 'abrt', 'saif', 'azhar bhai', 'amna', 'hasib'];
  const accounts = (connectionHealth().perAccount || []).map(function (a) {
    const n = String(a.account || '').toLowerCase();
    const enabled = apiNorm.some(function (k) { return n.indexOf(k) >= 0; });
    return { name: String(a.account || ''), api_enabled: enabled };
  });
  const sa = enginePost_('syncAccounts', { accounts: accounts });

  let facts = 0;
  try { facts = enrichEngineFacts_(); } catch (e) { logActivity_('system', 'ENGINE_FACTS_FAIL', 'all', '', '', String(e && e.message || e).slice(0, 160)); }

  /* Order costs ride the same hourly push. They are the difference between a profit figure and a
   * revenue figure, so they are not an optional extra — but both passes are cursor-driven and
   * budgeted, so neither can starve the other or run the trigger out of time. */
  let costs = '';
  try { costs = pushEngineCosts(); }
  catch (e) { logActivity_('system', 'ENGINE_COST_FAIL', 'all', '', '', String(e && e.message || e).slice(0, 160)); }

  /* SPEED Phase 2 (25 Aug). Every department's landing page used to re-read the TASKS tab on
   * each open — 4.2 seconds, on the first screen a person sees each morning. The tab stays the
   * master record; this mirrors it into D1 so the boards can answer in ~50ms. Dates go through
   * taskPktIso_ here, not at the far end, so the Worker compares the same strings Apps Script
   * does and the fast board can never disagree with the slow one. */
  let mirrored = '';
  try { mirrored = pushEngineTasks(); }
  catch (e) { logActivity_('system', 'ENGINE_TASKS_FAIL', 'all', '', '', String(e && e.message || e).slice(0, 160)); }

  try { metricsWatch(); } catch (e) { logActivity_('system', 'METRICS_WATCH_FAIL', 'all', '', '', String(e && e.message || e).slice(0, 140)); }
  try { revisionQualify(); } catch (e) { logActivity_('system', 'REVQ_FAIL', 'all', '', '', String(e && e.message || e).slice(0, 140)); }
  /* TRUTH v2 WO-09: keyword-doc tasks now come from the engine's CPC_LIVE_EVENT flow
     (72h after a listing goes live in a CPC campaign). The AS sweep is retired — running
     both would hand Zain the same work twice. Deleted fully at Phase 6. */
  try {
    const psDay = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('PORTAL_STATS_DAY') !== psDay) {
      updateSirHasibAnalysis();
      try { notifPrune(); } catch (e2) { logActivity_('system', 'NOTIF_PRUNE_FAIL', '', '', '', String(e2 && e2.message || e2).slice(0, 120)); }
      /* TRUTH v2 DECISIONS #11 (money module LIVE): the 30-Aug truth machinery retires — the
         engine's Truth Check (tier 1 + nightly tier 3 penny audit) supersedes the letters,
         the monthly filler and the drift corrector. All three stay callable by hand via
         ENGINE_RUNNABLE for a deliberate one-off; none runs on its own any more. */
      try { pushSheetRowsCold(); } catch (e6) { logActivity_('system', 'SHEETMIRROR_COLD_FAIL', '', '', '', String(e6 && e6.message || e6).slice(0, 120)); }
      props.setProperty('PORTAL_STATS_DAY', psDay);
    }
  } catch (e) { logActivity_('system', 'PORTAL_STATS_FAIL', '', '', '', String(e && e.message || e).slice(0, 140)); }

  logActivity_('system', 'ENGINE_SYNC', 'users+accounts+facts+costs', '', users.length + 'u/' + accounts.length + 'a/' + facts + 'f', costs);
  return 'engine sync: ' + su.synced + ' users, ' + sa.synced + ' accounts, ' + facts + ' item facts · ' + costs + ' · ' + mirrored;
}


/** Engine → bell bridge. The Worker raises edge events (campaign changes today, more later)
 * through the same notification pipeline as everything else. Key-gated; 'management' and
 * 'advertising' fan out by module so the Access desk controls who hears what. */
function actionEngineNotify_(payload) {
  const key = PropertiesService.getScriptProperties().getProperty('ENGINE_SYNC_KEY');
  if (!key || String(payload.key_check || payload.key || '') !== key) throw new Error('auth');
  const to = String(payload.to || ''), type = String(payload.type || 'Engine'), msg = String(payload.message || '').slice(0, 900);
  const ref = String(payload.ref || 'engine');
  if (!msg) throw new Error('SAY: empty message');
  if (to === 'management') notifyManagement_(type, msg, ref);
  else if (to === 'advertising') usersWithModule_('advertising', ['Advertising Manager']).forEach(function (e) { notify_(e, type, msg, ref); });
  else if (to.indexOf('@') > 0) notify_(normalizeEmail(to), type, msg, ref);
  else throw new Error('SAY: unknown recipient');
  return { delivered: true };
}

/** Engine → sheets, under the SAME law as every human write (§0.4): header-addressed, column
 * whitelisted per workflow, shadow-gated by pipeline_write_external, old→new logged. The Worker
 * never touches a workbook directly — it asks this action, and this action asks SheetBridge.
 * Key-gated like engineNotify; the whitelist TAG picks the exact columns a caller may touch,
 * so a compromised key still cannot write outside the named workflow's columns. */
const ENGINE_SHEET_WHITELISTS = {
  // the day-tab columns the orders workspace may write — identical to ORDERS_WRITABLE_COLS
  orders_day: { scope: 'account', kind: 'order_processing', cols: ['Cost', 'Order Number', 'Tracking number', 'Email', 'Delivery Status', 'New Ali Link'] },
};

function actionEngineSheetWrite_(payload) {
  const key = PropertiesService.getScriptProperties().getProperty('ENGINE_SYNC_KEY');
  if (!key || String(payload.key || '') !== key) throw new Error('auth');
  const spec = ENGINE_SHEET_WHITELISTS[String(payload.whitelist || '')];
  if (!spec) throw new Error('SAY: unknown whitelist tag');
  const account = String(payload.account || ''), tab = payload.tab, matchValue = String(payload.match_value || '');
  const values = payload.values || {};
  const bad = Object.keys(values).filter(function (c) { return spec.cols.indexOf(c) < 0; });
  if (bad.length) throw new Error('SAY: column not writable for this workflow: ' + bad.join(', '));
  if (!account || !matchValue || !Object.keys(values).length) throw new Error('SAY: account, match_value and values are all needed');
  const wbSpec = { scope: spec.scope, account: account, kind: spec.kind, tab: tab || undefined };
  const res = bridgeUpdateRow_(wbSpec, String(payload.match_header || 'Order number'), matchValue, values, spec.cols, 'engine@worker');
  logActivity_('system', 'ENGINE_SHEET_WRITE', spec.kind + '!' + account, '', JSON.stringify(values).slice(0, 180), res.shadow ? 'shadow' : 'written');
  return { ok: res.ok !== false, shadow: !!res.shadow, reason: res.reason || '' };
}

/* Run one background job on demand, key-gated (19 Aug). Apps Script's Run button and its trigger
 * dialog cannot be driven reliably from an automated pane — the function picker silently reverts
 * and neither clicks nor arrow keys reach its listbox — so a newly written maintenance job could
 * only ever be observed on its own hourly schedule. That made every fix to a background job a
 * one-hour feedback loop. The list is a closed whitelist of read-and-sync jobs: no job here
 * writes to a business sheet, and the shared Engine key is required. */
const ENGINE_RUNNABLE = {
  pushEngineSync: function () { return pushEngineSync(); },
  pushEngineCosts: function () { return pushEngineCosts(); },
  pushEngineTasks: function () { return typeof pushEngineTasks === 'function' ? String(pushEngineTasks()) : 'absent'; },
  metricsWatch: function () { return typeof metricsWatch === 'function' ? String(metricsWatch()) : 'absent'; },
  connectPendingSheets: function () { return typeof connectPendingSheets === 'function' ? String(connectPendingSheets()) : 'absent'; },
  setSalesOpsRole: function () { return typeof setSalesOpsRole === 'function' ? String(setSalesOpsRole()) : 'absent'; },
  freeYousafEmail: function () { return typeof freeYousafEmail === 'function' ? String(freeYousafEmail()) : 'absent'; },
  purgeSelfTestTasks: function () { return typeof purgeSelfTestTasks === 'function' ? String(purgeSelfTestTasks()) : 'absent'; },
  purgeSelfTestHunts: function () { return typeof purgeSelfTestHunts === 'function' ? String(purgeSelfTestHunts()) : 'absent'; },
  revisionQualify: function () { return typeof revisionQualify === 'function' ? String(revisionQualify()) : 'absent'; },
  sheetWritesStatus: function () { return typeof sheetWritesStatus === 'function' ? String(sheetWritesStatus()) : 'absent'; },
  enableSheetWrites: function () { return typeof enableSheetWrites === 'function' ? String(enableSheetWrites()) : 'absent'; },
  flushMirrorQueue: function () { return typeof flushMirrorQueue === 'function' ? String(flushMirrorQueue()) : 'absent'; },
  replayShadowOrders: function () { return typeof replayShadowOrders === 'function' ? String(replayShadowOrders()) : 'absent'; },
  updateSirHasibAnalysis: function () { return typeof updateSirHasibAnalysis === 'function' ? String(updateSirHasibAnalysis()) : 'absent'; },
  notifPrune: function () { return typeof notifPrune === 'function' ? String(notifPrune()) : 'absent'; },
  wbInspect: function (args) { return typeof wbInspect === 'function' ? wbInspect(args) : 'absent'; },
  phase0Dump: function (args) { return typeof phase0Dump === 'function' ? phase0Dump(args) : 'absent'; },
  pushSheetRowsHot: function () { return typeof pushSheetRowsHot === 'function' ? String(pushSheetRowsHot()) : 'absent'; },
  pushSheetRowsCold: function () { return typeof pushSheetRowsCold === 'function' ? String(pushSheetRowsCold()) : 'absent'; },
  ensureTruthTriggers: function () { return typeof ensureTruthTriggers === 'function' ? String(ensureTruthTriggers()) : 'absent'; },
  connectSirHasib: function () { return typeof connectSirHasib === 'function' ? String(connectSirHasib()) : 'absent'; },
  sirHasibMonthlyFill: function () { return typeof sirHasibMonthlyFill === 'function' ? String(sirHasibMonthlyFill()) : 'absent'; },
  truthCheck: function () { return typeof truthCheck === 'function' ? String(truthCheck()) : 'absent'; },
  bookFix: function (args) { return typeof bookFix === 'function' ? String(bookFix(args)) : 'absent'; },
  adsFromBooks: function () { return typeof adsFromBooks === 'function' ? String(adsFromBooks()) : 'absent'; },
  cpcKeywordSweep: function () { return typeof cpcKeywordSweep === 'function' ? String(cpcKeywordSweep()) : 'absent'; },
  inboxDump: function (args) { return typeof inboxDump === 'function' ? String(inboxDump(args)) : 'absent'; },
  notifDump: function (args) { return typeof notifDump === 'function' ? String(notifDump(args)) : 'absent'; },
  huntsDump: function (args) { return typeof huntsDump === 'function' ? String(huntsDump(args)) : 'absent'; },
  pushEngineTasks: function () { return typeof pushEngineTasks === 'function' ? String(pushEngineTasks()) : 'absent'; },
  notifSweep: function () { return typeof notifSweep_ === 'function' ? String(notifSweep_()) : 'absent'; },
  huntAliStats: function () { return typeof actionHuntAliCheck_ === 'function' ? JSON.stringify(actionHuntAliCheck_({ stats: true }, { user: { role: 'Management' }, ident: { email: 'engine' } })).slice(0, 400) : 'absent'; },
  buildDashboardCache: function () { return buildDashboardCache(); },
  alertsRefresh: function () { return alertsRefresh(); },
  dispatchOverdueSweep: function () { return dispatchOverdueSweep(); },
  runZeroSalesSweep: function () { return runZeroSalesSweep(); },
  aliSweep: function () { return typeof aliSweep === 'function' ? JSON.stringify(aliSweep()) : 'aliSweep absent'; },
  orderLinkSweep: function () { return typeof orderLinkSweep === 'function' ? String(orderLinkSweep()) : 'absent'; },
  reviewWatch: function () { return typeof reviewWatch === 'function' ? String(reviewWatch()) : 'absent'; },
  provenanceBackfill: function () { return typeof r8ProvenanceBackfill === 'function' ? String(r8ProvenanceBackfill()) : 'absent'; },
  seedTasks: function () { return typeof r8SeedTasks === 'function' ? String(r8SeedTasks()) : 'absent'; },
  aliSweepFast: function () { return typeof aliSweepFast === 'function' ? JSON.stringify(aliSweepFast()) : 'absent'; },
  /* Forced, because the only reason to kick this by hand is that the workbook already disagrees
   * with HUNTING_DB — and an unforced run would read the fingerprint and decide nothing moved. */
  huntBackupSync: function () { return typeof huntBackupSync === 'function' ? JSON.stringify(huntBackupSync(true)) : 'absent'; },
  /* 25 Aug: "orders of 25th still not have aliexpress links" — dump today's tab HEADERS and how
   * many rows actually carry an Ali number/link, per account. Separates "team hasn't typed them"
   * from "the portal cannot see the columns". Read-only. */
  aliColumnDiag: function () {
    var out = [];
    var ymd = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
    var candidates = ordersDayTabCandidates_(ymd);
    readTab_('CONNECTIONS').forEach(function (c) {
      if (String(c.sheet_kind) !== 'order_processing' || String(c.status || '').toLowerCase() === 'off') return;
      var row = { account: String(c.account_name || '') };
      try {
        var ss = SpreadsheetApp.openById(String(c.spreadsheet_id));
        var sheets = ss.getSheets(), hit = null;
        for (var s = 0; s < sheets.length; s++) {
          if (ordersTabIsCandidate_(sheets[s].getName(), candidates)) { hit = sheets[s]; break; }
        }
        if (!hit) { row.tab = 'MISSING'; out.push(row); return; }
        row.tab = hit.getName();
        var lastRow = hit.getLastRow(), lastCol = hit.getLastColumn();
        row.rows = lastRow - 1;
        var headers = hit.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
        row.headers = headers.map(function (h) { return String(h).replace(/\s+/g, ' ').trim(); }).slice(0, 14);
        var cols = nbHeaderCols_(headers);
        row.detected = { ebay: cols.ebayCol, aliNum: cols.aliNumCol, link: cols.linkCol };
        if (lastRow > 1) {
          var vals = hit.getRange(2, 1, Math.min(lastRow - 1, 30), lastCol).getDisplayValues();
          var filled = 0, ids = 0;
          vals.forEach(function (v) {
            if (cols.ebayCol >= 0 && /^\d{2}-\d{5}-\d{5}$/.test(String(v[cols.ebayCol] || '').trim())) ids++;
            var n = cols.aliNumCol >= 0 ? String(v[cols.aliNumCol] || '').replace(/\D/g, '') : '';
            var l = cols.linkCol >= 0 ? String(v[cols.linkCol] || '').trim() : '';
            if (n.length >= 8 || l.indexOf('https://') === 0) filled++;
          });
          row.order_ids_seen = ids;
          row.rows_with_ali = filled;
          /* which columns do the processors ACTUALLY fill? count non-empty per header */
          var fillCount = {};
          headers.forEach(function (h, i) {
            var name = String(h).replace(/\s+/g, ' ').trim();
            if (!name) return;
            var n = 0;
            vals.forEach(function (v) { if (String(v[i] || '').trim() !== '') n++; });
            if (n > 0) fillCount[name + '[' + i + ']'] = n;
          });
          row.filled_columns = fillCount;
        }
      } catch (e) { row.error = String(e && e.message || e).slice(0, 90); }
      out.push(row);
    });
    return JSON.stringify(out);
  },
  /* 24 Aug diagnosis: today's orders missing from the workspace — list each order book's REAL
   * tab names against the candidates the portal computes, so a naming drift or a dead importer
   * is seen, not guessed. Read-only. */
  dayTabDiag: function () {
    var out = [];
    var today = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
    var yday = Utilities.formatDate(new Date(Date.now() - 86400000), 'Asia/Karachi', 'yyyy-MM-dd');
    readTab_('CONNECTIONS').forEach(function (c) {
      if (String(c.sheet_kind) !== 'order_processing' || String(c.status || '').toLowerCase() === 'off') return;
      var row = { account: String(c.account_name || ''), status: String(c.status || ''), id: String(c.spreadsheet_id || '').slice(0, 8) || '(EMPTY)' };
      try {
        var ss = SpreadsheetApp.openById(String(c.spreadsheet_id));
        var names = ss.getSheets().map(function (s) { return s.getName(); });
        row.last6_tabs = names.slice(-6);
        row.today_candidates = ordersDayTabCandidates_(today);
        var hitT = null, hitY = null;
        names.forEach(function (n) {
          if (ordersTabIsCandidate_(n, ordersDayTabCandidates_(today))) hitT = n;
          if (ordersTabIsCandidate_(n, ordersDayTabCandidates_(yday))) hitY = n;
        });
        row.today_tab = hitT || 'MISSING';
        row.yday_tab = hitY || 'MISSING';
        if (hitT) { try { row.today_rows = ss.getSheetByName(hitT).getLastRow() - 1; } catch (e2) { row.today_rows = '?'; } }
      } catch (e) { row.error = String(e && e.message || e).slice(0, 120); }
      out.push(row);
    });
    return JSON.stringify(out);
  },
};

function actionEngineRunJob_(payload) {
  const key = PropertiesService.getScriptProperties().getProperty('ENGINE_SYNC_KEY');
  if (!key || String(payload.key_check || payload.key || '') !== key) throw new Error('auth');
  const name = String(payload.job || '');
  const fn = Object.prototype.hasOwnProperty.call(ENGINE_RUNNABLE, name) ? ENGINE_RUNNABLE[name] : null;
  if (!fn) throw new Error('SAY: unknown job — one of ' + Object.keys(ENGINE_RUNNABLE).join(', '));
  const started = Date.now();
  let result = '', failed = '';
  try { result = String(fn(payload.args || null)); }   // args ride only into runnables that read them
  catch (e) { failed = String(e && e.message || e).slice(0, 300); }
  logActivity_('system', 'ENGINE_RUN_JOB', name, '', String(Math.round((Date.now() - started) / 1000)) + 's', failed || result);
  if (failed) throw new Error('SAY: ' + name + ' failed — ' + failed);
  return { ran: name, seconds: Math.round((Date.now() - started) / 1000), result: result };
}

const ACTIONS_ENGINE = {
  engineNotify: [actionEngineNotify_, 'public'],       // key-checked inside — the Worker has no Google token
  engineSheetWrite: [actionEngineSheetWrite_, 'public'], // key-checked inside; whitelist tag picks the columns
  engineRunJob: [actionEngineRunJob_, 'public'],       // key-checked inside; closed whitelist of sync jobs
};

/** Facts for the Active Listings screen: the Central Main Sheet's own numbers per item, pushed
 * hourly with the users/accounts sync. Header names are the sheet's, verbatim (trailing space
 * on 'Profit ' included). Suppliers follow once their exact headers are confirmed on-sheet. */
/* ---------------- order COST feed (19 Aug) ----------------------------------
 * eBay's API can tell us what an order sold for and what eBay charged us. It cannot tell us what
 * we PAID for the goods — that number exists in exactly one place, the 'Cost' column the order
 * processor fills on the day tab. Without it every profit figure in the portal was revenue minus
 * eBay fees, which is not profit at all, and all 16k orders in the Engine carried cost = 0.
 *
 * The walk is deliberately incremental. Five accounts × a 45-day window is 225 sheet reads, far
 * past a trigger's 6-minute ceiling, so each run picks up where the last stopped and stops on a
 * time budget. Recent days are visited first because those are the ones staff are looking at.
 * Multi-line orders are summed: three lines of one order is one order that cost the sum. */
const COST_LOOKBACK_DAYS = 45;
const COST_BUDGET_MS = 110000;         // shares pushEngineSync's 6-minute life with the facts pass
const FACTS_BUDGET_MS = 110000;
const COST_CURSOR_KEY = 'COST_SYNC_CURSOR';
/* A day tab carries TWO order-number columns and they differ only in one letter's case:
 * 'Order number' in column B is eBay's, 'Order Number' in column M is the AliExpress order the
 * processor placed. Reading the wrong one matched nothing at all — 18 costs read, 0 landed. They
 * are told apart by POSITION, not spelling, so the sheet's own resolver decides, exactly as the
 * rest of the order code does. */
const COST_COL_ORDER = 'Order number';        // eBay's, col B — never the AliExpress one at col M
const COST_COL_COST = 'Cost';
/* 30 Aug: the day tabs also carry per-order 'Order Earning' — the calculator's own OE, typed at
   processing time. It rides the same walk: where eBay's Finances API never reached an order
   (Sir Hasib's backfilled history), fees = sold − this OE, from the business's own books. */
const COST_COL_EARN = 'Order Earning';

function costAccounts_() {
  return (connectionHealth().perAccount || []).filter(function (a) {
    return (a.items || []).some(function (i) { return i.kind === 'order_processing' && i.status === 'linked'; });
  }).map(function (a) { return String(a.account || ''); }).filter(String);
}

function pushEngineCosts() {
  const started = Date.now();
  const props = PropertiesService.getScriptProperties();
  const accounts = costAccounts_();
  if (!accounts.length) return 'cost sync: no linked order_processing workbook';

  let cur = {};
  try { cur = JSON.parse(props.getProperty(COST_CURSOR_KEY) || '{}'); } catch (e) { cur = {}; }
  let ai = Number(cur.a) || 0, di = Number(cur.d) || 0;
  if (ai >= accounts.length) ai = 0;
  if (di >= COST_LOOKBACK_DAYS) di = 0;

  const today = ordersToday_();          // day tabs are named on the PKT day, like the processors' shift
  let tabs = 0, sent = 0, landed = 0, misses = 0;

  while (Date.now() - started < COST_BUDGET_MS) {
    const account = accounts[ai];
    const ymd = ordersAddDays_(today, -di);
    let read = null;
    try {
      read = ordersReadTab_(account, ordersDayTabCandidates_(ymd), 600, ORDERS_EXPECT_DAY);
    } catch (e) { read = null; }
    tabs++;

    if (read && read.ok && read.rows && read.rows.length) {
      const map = ordersResolveFields_(read.headers || []);
      if (!map[COST_COL_ORDER] || !map[COST_COL_COST]) {
        logActivity_('system', 'ENGINE_COST_HEADERS', account + '!' + ymd, '', '',
          'day tab has no ' + (map[COST_COL_ORDER] ? COST_COL_COST : COST_COL_ORDER) + ' column');
        di++;
        if (di >= COST_LOOKBACK_DAYS) { di = 0; ai = (ai + 1) % accounts.length; }
        continue;
      }
      const byOrder = {};
      const earnBy = {};
      const hasEarn = !!map[COST_COL_EARN];
      read.rows.forEach(function (r) {
        const id = costOrderId_(ordersCell_(r, map, COST_COL_ORDER));
        if (!id) return;
        const c = costNumber_(ordersCell_(r, map, COST_COL_COST));
        if (c > 0) byOrder[id] = (byOrder[id] || 0) + c;
        if (hasEarn) {
          const e2 = costNumber_(ordersCell_(r, map, COST_COL_EARN));
          if (e2 > 0) earnBy[id] = (earnBy[id] || 0) + e2;
        }
      });
      const ids = {};
      Object.keys(byOrder).forEach(function (id) { ids[id] = 1; });
      Object.keys(earnBy).forEach(function (id) { ids[id] = 1; });
      const costs = Object.keys(ids).map(function (id) {
        const row = { order_id: id };
        if (byOrder[id]) row.cost = Math.round(byOrder[id] * 100) / 100;
        if (earnBy[id]) row.earn = Math.round(earnBy[id] * 100) / 100;
        return row;
      });
      if (costs.length) {
        for (let i = 0; i < costs.length; i += 200) {
          try {
            const res = enginePost_('syncCosts', { costs: costs.slice(i, i + 200), account: account, tab: read.tab });
            sent += Math.min(200, costs.length - i);
            landed += Number(res && res.updated) || 0;
          } catch (e) {
            logActivity_('system', 'ENGINE_COST_FAIL', account + '!' + ymd, '', '', String(e && e.message || e).slice(0, 160));
          }
        }
      }
    } else { misses++; }

    di++;
    if (di >= COST_LOOKBACK_DAYS) { di = 0; ai = (ai + 1) % accounts.length; }
  }

  props.setProperty(COST_CURSOR_KEY, JSON.stringify({ a: ai, d: di }));
  const summary = 'cost sync: ' + tabs + ' day tab(s) read, ' + sent + ' order cost(s) posted, '
    + landed + ' changed in the Engine' + (misses ? ', ' + misses + ' tab(s) not present' : '');
  logActivity_('system', 'ENGINE_COST_SYNC', accounts[ai] || '', '', String(landed), summary);
  return summary;
}

/* The sheet writes order numbers in several shapes — a leading apostrophe from a text-formatted
 * cell, stray spaces, occasionally a trailing note. eBay's own ids are digits and dashes only. */
function costOrderId_(v) {
  const raw = String(v == null ? '' : v).replace(/^'/, '').trim();
  const m = raw.match(/\d{2}-\d{5}-\d{5}/);
  if (m) return m[0];
  return /^[\d-]{8,}$/.test(raw) ? raw : '';
}

/* '£4.20', '4,20', ' 4.2 ' and a real number all mean the same thing to a processor. */
function costNumber_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const t = String(v == null ? '' : v).replace(/[^0-9.,-]/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, '');
  const n = Number(t);
  return isFinite(n) ? n : 0;
}

function enrichEngineFacts_() {
  /* Headers copied from the live Main Sheet, verbatim. 'Profit ' carries a trailing space and
   * 'Suuplier 2' is genuinely spelled with two u's — matching the typo is the only reason the
   * second supplier arrives at all. The four supplier columns and the category have been sitting
   * in the sheet unread this whole time, which is why the portal never showed a supplier. */
  const spec = ['Image Link', 'Listing Title', 'Sold For', 'Order Earning', 'Aliexpress Cost', 'Profit ',
    'Campaign Selection', 'Current Campaign Selection', 'eBay Item No',
    'Current Supplier Working', 'Ali Express Link 1', 'Suuplier 2', 'Supplier 3', 'eBay Category (FVF %)'];
  let pushed = 0;
  /* Budgeted and rotating, like the other sweeps. Reading five Main Sheets in one pass is what
   * pushed this job to 317 seconds against a 360-second ceiling and gave it a 28.8% failure
   * rate; whichever account came last simply never made it. */
  const factStarted = Date.now();
  const factProps = PropertiesService.getScriptProperties();
  const allAccounts = (connectionHealth().perAccount || []);
  let factStart = Number(factProps.getProperty('FACTS_CURSOR') || 0);
  if (!(factStart >= 0) || factStart >= allAccounts.length) factStart = 0;
  let factStopped = factStart;

  allAccounts.forEach(function (_ignored, n) {
    if (Date.now() - factStarted > FACTS_BUDGET_MS) return;
    const a = allAccounts[(factStart + n) % allAccounts.length];
    factStopped = (factStart + n) % allAccounts.length;
    const account = String(a.account || '');
    let read = null;
    try {
      read = bridgeReadRows_({ scope: 'account', account: account, kind: 'central', tab: ['Main Sheet'], expect: spec, limit: 3000 });   // 903 live items — 500 dropped a third of them
    } catch (e) { return; }
    if (!read || read.ok === false || !read.rows) return;
    /* Every workbook spells its headers its own way — ABRT writes 'Suuplier 2', another writes
     * 'Supplier 2', one adds a trailing space to 'Profit '. Exact-key lookups landed supplier
     * data for exactly ONE account (the one whose spellings were copied) and silently read
     * nothing from the other four. Headers are resolved through the bridge's normalizer against
     * per-field alias lists, and the fields a workbook does NOT offer are logged once per pass
     * so the next gap is a log line, not a mystery. */
    const norm = {};
    (read.headers || []).forEach(function (h) {
      const n = bridgeNormalizeHeader_(h);
      if (n && norm[n] === undefined) norm[n] = String(h);
    });
    const pick = function (aliases) {
      for (let i = 0; i < aliases.length; i++) {
        const hit = norm[bridgeNormalizeHeader_(aliases[i])];
        if (hit !== undefined) return hit;
      }
      return null;
    };
    const FIELDS = {
      id: pick(['eBay Item No', 'eBay Item Number', 'Item No']),
      oe: pick(['Order Earning']),
      ali_cost: pick(['Aliexpress Cost', 'AliExpress Cost', 'Ali Express Cost']),
      profit: pick(['Profit']),
      campaign_type: pick(['Campaign Selection']),
      campaign_name: pick(['Current Campaign Selection']),
      current_sup: pick(['Current Supplier Working', 'Current Supplier']),
      sup1_link: pick(['Ali Express Link 1', 'AliExpress Link 1', 'Supplier Link 1', 'Ali Express Link']),
      sup2_link: pick(['Suuplier 2', 'Supplier 2', 'Supplier Link 2']),
      sup3_link: pick(['Supplier 3', 'Suuplier 3', 'Supplier Link 3']),
      category: pick(['eBay Category (FVF %)', 'eBay Category', 'Category (FVF %)']),
    };
    const missing = Object.keys(FIELDS).filter(function (k) { return !FIELDS[k]; });
    if (missing.length) {
      logActivity_('system', 'ENGINE_FACTS_MAP', account, '', '', 'Main Sheet offers no: ' + missing.join(', '));
    }
    if (!FIELDS.id) return;
    const cell = function (r, k) { return FIELDS[k] ? r[FIELDS[k]] : ''; };
    const items = [];
    read.rows.forEach(function (r) {
      const id = String(cell(r, 'id') || '').replace(/\D/g, '');
      if (!id) return;
      items.push({
        item_id: id, account: account,
        oe: costNumber_(cell(r, 'oe')),
        ali_cost: costNumber_(cell(r, 'ali_cost')),
        profit: costNumber_(cell(r, 'profit')),
        campaign_type: String(cell(r, 'campaign_type') || ''),
        campaign_name: String(cell(r, 'campaign_name') || ''),
        current_sup: String(cell(r, 'current_sup') || ''),
        sup1_link: String(cell(r, 'sup1_link') || ''),
        sup2_link: String(cell(r, 'sup2_link') || ''),
        sup3_link: String(cell(r, 'sup3_link') || ''),
        category: String(cell(r, 'category') || ''),
      });
    });
    for (let i = 0; i < items.length; i += 150) {
      try { enginePost_('syncFacts', { items: items.slice(i, i + 150) }); pushed += Math.min(150, items.length - i); }
      catch (e) { logActivity_('system', 'ENGINE_FACTS_FAIL', account, '', '', String(e && e.message || e).slice(0, 160)); return; }
    }
  });
  factProps.setProperty('FACTS_CURSOR', String((factStopped + 1) % Math.max(1, allAccounts.length)));
  return pushed;
}


/** Mirror the TASKS tab into D1 so department boards answer from the edge (SPEED Phase 2).
 *  Full push every time — TASKS is a few thousand rows at most, and a full push is the only
 *  way a task DELETED from the sheet also leaves the boards. Sent in slices so one oversized
 *  body can never fail the whole sync. */
function pushEngineTasks() {
  const rows = readTab_('TASKS');
  const out = rows.map(function (t) {
    return {
      task_id: String(t.task_id || ''), type: String(t.type || ''), account: String(t.account || ''),
      item_id: String(t.item_id || ''), title: String(t.title || ''), details: String(t.details || ''),
      comments: String(t.comments || ''), assigned_by: String(t.assigned_by || ''),
      assigned_to: String(t.assigned_to || ''), priority: String(t.priority || ''),
      deadline_pkt: taskPktIso_(t.deadline_pkt), status: String(t.status || ''),
      created_at: taskPktIso_(t.created_at), updated_at: taskPktIso_(t.updated_at),
      submitted_at: taskPktIso_(t.submitted_at), approved_by: String(t.approved_by || ''),
      decided_at: taskPktIso_(t.decided_at),
      submission_note: String(t.submission_note || ''), time_taken_min: String(t.time_taken_min || ''),
    };
  }).filter(function (t) { return t.task_id; });

  let sent = 0, retired = 0;
  const SLICE = 300;
  /* ONE stamp for every slice of this push: the final slice retires whatever this stamp did not
   * touch, so a per-slice stamp would wipe the slices before it. */
  const stamp = Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") + '#' + Math.floor(Math.random() * 1e6);
  for (let i = 0; i < out.length; i += SLICE) {
    const last = i + SLICE >= out.length;
    /* only the FINAL slice may retire rows — the sweep needs the whole push written first */
    const r = enginePost_('syncTasks', { tasks: out.slice(i, i + SLICE), stamp: stamp, full: last ? 'true' : '' });
    sent += Number(r.synced || 0);
    retired += Number(r.retired || 0);
  }
  return sent + ' tasks mirrored' + (retired ? ', ' + retired + ' retired' : '');
}
