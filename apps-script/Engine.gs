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

  logActivity_('system', 'ENGINE_SYNC', 'users+accounts', '', users.length + 'u/' + accounts.length + 'a', '');
  return 'engine sync: ' + su.synced + ' users, ' + sa.synced + ' accounts';
}
