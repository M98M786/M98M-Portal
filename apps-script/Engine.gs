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
function pushEngineSync() {
  const users = readTab_('USERS').map(function (u) {
    return { email: String(u.email || ''), name: String(u.name || ''), role: String(u.role || ''),
      status: String(u.status || ''), modules: String(u.modules || ''), tools: String(u.tools || ''),
      super: isSuperAdmin(u.email) };
  });
  const su = enginePost_('syncUsers', { users: users });

  // A5 answer (contract §11): exactly these five have API; the rest ride the sheets bridge.
  const apiNorm = ['hafiza', 'abrt', 'saif', 'azhar bhai', 'amna'];
  const accounts = (connectionHealth().perAccount || []).map(function (a) {
    const n = String(a.account || '').toLowerCase();
    const enabled = apiNorm.some(function (k) { return n.indexOf(k) >= 0; }) && n.indexOf('hasib') < 0;
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

  logActivity_('system', 'ENGINE_SYNC', 'users+accounts+facts+costs', '', users.length + 'u/' + accounts.length + 'a/' + facts + 'f', costs);
  return 'engine sync: ' + su.synced + ' users, ' + sa.synced + ' accounts, ' + facts + ' item facts · ' + costs;
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

const ACTIONS_ENGINE = {
  engineNotify: [actionEngineNotify_, 'public'],       // key-checked inside — the Worker has no Google token
  engineSheetWrite: [actionEngineSheetWrite_, 'public'], // key-checked inside; whitelist tag picks the columns
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
      read.rows.forEach(function (r) {
        const id = costOrderId_(ordersCell_(r, map, COST_COL_ORDER));
        const c = costNumber_(ordersCell_(r, map, COST_COL_COST));
        if (!id || !(c > 0)) return;
        byOrder[id] = (byOrder[id] || 0) + c;
      });
      const costs = Object.keys(byOrder).map(function (id) { return { order_id: id, cost: Math.round(byOrder[id] * 100) / 100 }; });
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
    const items = [];
    read.rows.forEach(function (r) {
      const id = String(r['eBay Item No'] || '').replace(/\D/g, '');
      if (!id) return;
      items.push({
        item_id: id, account: account,
        oe: costNumber_(r['Order Earning']),
        ali_cost: costNumber_(r['Aliexpress Cost']),
        profit: costNumber_(r['Profit ']),
        campaign_type: String(r['Campaign Selection'] || ''),
        campaign_name: String(r['Current Campaign Selection'] || ''),
        current_sup: String(r['Current Supplier Working'] || ''),
        sup1_link: String(r['Ali Express Link 1'] || ''),
        sup2_link: String(r['Suuplier 2'] || ''),
        sup3_link: String(r['Supplier 3'] || ''),
        category: String(r['eBay Category (FVF %)'] || ''),
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
