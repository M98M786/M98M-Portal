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

  logActivity_('system', 'ENGINE_SYNC', 'users+accounts+facts', '', users.length + 'u/' + accounts.length + 'a/' + facts + 'f', '');
  return 'engine sync: ' + su.synced + ' users, ' + sa.synced + ' accounts, ' + facts + ' item facts';
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

const ACTIONS_ENGINE = {
  engineNotify: [actionEngineNotify_, 'public'],   // key-checked inside — the Worker has no Google token
};

/** Facts for the Active Listings screen: the Central Main Sheet's own numbers per item, pushed
 * hourly with the users/accounts sync. Header names are the sheet's, verbatim (trailing space
 * on 'Profit ' included). Suppliers follow once their exact headers are confirmed on-sheet. */
function enrichEngineFacts_() {
  const spec = ['Image Link', 'Listing Title', 'Sold For', 'Order Earning', 'Aliexpress Cost', 'Profit ',
    'Campaign Selection', 'Current Campaign Selection', 'eBay Item No'];
  let pushed = 0;
  (connectionHealth().perAccount || []).forEach(function (a) {
    const account = String(a.account || '');
    let read = null;
    try {
      read = bridgeReadRows_({ scope: 'account', account: account, kind: 'central', tab: ['Main Sheet'], expect: spec, limit: 500 });
    } catch (e) { return; }
    if (!read || read.ok === false || !read.rows) return;
    const items = [];
    read.rows.forEach(function (r) {
      const id = String(r['eBay Item No'] || '').replace(/\D/g, '');
      if (!id) return;
      items.push({
        item_id: id, account: account,
        oe: Number(r['Order Earning']) || 0,
        ali_cost: Number(r['Aliexpress Cost']) || 0,
        profit: Number(r['Profit ']) || 0,
        campaign_type: String(r['Campaign Selection'] || ''),
        campaign_name: String(r['Current Campaign Selection'] || ''),
      });
    });
    for (let i = 0; i < items.length; i += 150) {
      try { enginePost_('syncFacts', { items: items.slice(i, i + 150) }); pushed += Math.min(150, items.length - i); }
      catch (e) { logActivity_('system', 'ENGINE_FACTS_FAIL', account, '', '', String(e && e.message || e).slice(0, 160)); return; }
    }
  });
  return pushed;
}
