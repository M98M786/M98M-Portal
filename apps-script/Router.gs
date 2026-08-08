/** RL-1 deny-by-default action router. Identity comes ONLY from a Google ID token verified
 * server-side on every request (signature via Google tokeninfo, audience, expiry). Any
 * email/role posted by the client is ignored. Unknown action → rejected. Errors to the
 * browser are generic (RL-9); details go to ACTIVITY_LOG. */

const ACTIONS = {
  // action: [handler, minRole] — minRole 'public' | 'any' (approved user) | 'super'
  ping:             [actionPing_, 'public'],
  whoami:           [actionWhoami_, 'any'],
  importRegistry:   [actionImportRegistry_, 'super'],
  connectionHealth: [actionConnectionHealth_, 'any'],
};

function doPost(e) {
  let req = {};
  try {
    req = JSON.parse(e.postData && e.postData.contents || '{}');
    const entry = ACTIONS[req.action];
    if (!entry) return out_({ ok: false, error: 'unknown action' }, 'REJECT unknown action', req);

    let user = null;
    if (entry[1] !== 'public') {
      user = verifyAndLoadUser_(req.idToken);                       // throws on any failure
      rateLimit_(user.email);
      if (entry[1] === 'super' && !isSuperAdmin(user.email)) throw authErr_('not super admin', user.email);
    }
    if (req.idem && seenIdem_(req.idem)) return out_({ ok: true, idempotent: true }, null, req);

    const data = entry[0](req.payload || {}, user);
    if (req.idem) markIdem_(req.idem);
    return out_({ ok: true, data: data }, null, req);
  } catch (err) {
    logActivity_('router', 'ERROR:' + (req.action || '?'), (req && req.action) || '', '', '', String(err && err.stack || err));
    return out_({ ok: false, error: 'request failed' }, null, req);  // generic to client (RL-9)
  }
}
function doGet() { return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'M98M Portal', ts: now_() })).setMimeType(ContentService.MimeType.JSON); }

/** RL-1 core: verify Google ID token (signature+aud+exp via Google's tokeninfo), then load
 * the APPROVED user row. Deactivated user → rejected on this very request (RL-5). */
function verifyAndLoadUser_(idToken) {
  if (!idToken) throw authErr_('no token', '');
  const clientId = getConfig('oauth_client_id');
  if (!clientId) throw authErr_('oauth_client_id not configured', '');
  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw authErr_('token rejected by Google', '');
  const t = JSON.parse(resp.getContentText());
  if (t.aud !== clientId) throw authErr_('audience mismatch', t.email || '');
  if (Number(t.exp) * 1000 < Date.now()) throw authErr_('token expired', t.email || '');
  if (String(t.email_verified) !== 'true') throw authErr_('email not verified', t.email || '');

  const n = normalizeEmail(t.email);
  const rows = getPortalDb_(false).getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalizeEmail(rows[i][0]) === n) {
      const u = { email: rows[i][0], name: rows[i][1], role: rows[i][2], shift: rows[i][3], accounts: rows[i][4], status: rows[i][5], row: i + 1 };
      if (u.status !== 'approved') throw authErr_('status=' + u.status, n);
      if (isSuperAdmin(n)) u.role = 'Management';
      return u;
    }
  }
  throw authErr_('unknown user', n);
}
function authErr_(why, email) { logActivity_('auth', 'AUTH_FAIL', email, '', '', why); return new Error('auth'); }

/** RL-5 rate limit: 60 requests/min per user via CacheService. */
function rateLimit_(email) {
  const c = CacheService.getScriptCache(), k = 'rl_' + normalizeEmail(email);
  const nRaw = c.get(k); const n = Number(nRaw || 0) + 1;
  c.put(k, String(n), 60);
  if (n > 60) throw authErr_('rate limit', email);
}
/** RL-6 idempotency: retried writes never duplicate. */
function seenIdem_(key) { return CacheService.getScriptCache().get('idem_' + key) === '1'; }
function markIdem_(key) { CacheService.getScriptCache().put('idem_' + key, '1', 21600); }

function out_(obj, logMsg, req) {
  if (logMsg) logActivity_('router', logMsg, (req && req.action) || '', '', '', '');
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Phase 1 actions ----------
function actionPing_() { return { service: 'M98M Portal', phase: 1, ts: now_() }; }
function actionWhoami_(payload, user) { return { email: user.email, name: user.name, role: user.role, shift: user.shift }; }
function actionImportRegistry_(payload, user) { return importRegistry(String(payload.registryId || ''), user.email); }
function actionConnectionHealth_(payload, user) { return connectionHealth(); }
