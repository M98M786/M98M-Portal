/** RL-1 deny-by-default action router. Identity comes ONLY from a Google ID token verified
 * server-side on every request (signature via Google tokeninfo, audience, expiry). Any
 * email/role posted by the client is ignored. Unknown action → rejected. Errors to the
 * browser are generic (RL-9); details go to ACTIVITY_LOG.
 *
 * Access levels: 'public' (no token) | 'token' (valid Google identity, any portal status)
 *              | 'any' (approved user) | 'super' (super admin). */

/** Core actions, then every feature module's ACTIONS_* merged in. A module that is not
 * deployed simply contributes nothing — its actions stay unknown and are rejected (RL-1). */
function mergeActions_() {
  const core = {
    ping:             [actionPing_, 'public'],
    getPublicConfig:  [actionGetPublicConfig_, 'public'],
    whoami:           [actionWhoami_, 'token'],
    register:         [actionRegister_, 'token'],
    submitIdea:       [actionSubmitIdea_, 'any'],
    listPending:      [actionListPending_, 'any'],   // gated to management inside
    approveUser:      [actionApproveUser_, 'any'],
    importRegistry:   [actionImportRegistry_, 'super'],
    connectionHealth: [actionConnectionHealth_, 'any'],
  };
  const groups = [
    typeof ACTIONS_TASKS      !== 'undefined' ? ACTIONS_TASKS      : null,
    typeof ACTIONS_SCHEDULES  !== 'undefined' ? ACTIONS_SCHEDULES  : null,
    typeof ACTIONS_REPORTS    !== 'undefined' ? ACTIONS_REPORTS    : null,
    typeof ACTIONS_MESSAGING  !== 'undefined' ? ACTIONS_MESSAGING  : null,
    typeof ACTIONS_AGENDA     !== 'undefined' ? ACTIONS_AGENDA     : null,
    typeof ACTIONS_MEETINGS   !== 'undefined' ? ACTIONS_MEETINGS   : null,
    typeof ACTIONS_RULES      !== 'undefined' ? ACTIONS_RULES      : null,
    typeof ACTIONS_BRIDGE     !== 'undefined' ? ACTIONS_BRIDGE     : null,
    typeof ACTIONS_BRAIN      !== 'undefined' ? ACTIONS_BRAIN      : null,
    typeof ACTIONS_HUNTING    !== 'undefined' ? ACTIONS_HUNTING    : null,
    typeof ACTIONS_LISTING    !== 'undefined' ? ACTIONS_LISTING    : null,
    typeof ACTIONS_CPC        !== 'undefined' ? ACTIONS_CPC        : null,
    typeof ACTIONS_POTENTIALCPC !== 'undefined' ? ACTIONS_POTENTIALCPC : null,
  ];
  groups.forEach(function (g) {
    if (!g) return;
    Object.keys(g).forEach(function (k) { core[k] = g[k]; });
  });
  return core;
}
const ACTIONS = mergeActions_();

function doPost(e) {
  let req = {};
  try {
    req = JSON.parse(e.postData && e.postData.contents || '{}');
    const entry = ACTIONS[req.action];
    if (!entry) return out_({ ok: false, error: 'unknown action' }, 'REJECT unknown action', req);

    let ident = null, user = null;
    if (entry[1] !== 'public') {
      ident = verifyGoogleToken_(req.idToken);              // RL-1: throws on any token failure
      rateLimit_(ident.email);
      user = loadUser_(ident.email);                        // may be null (not registered)
      if (entry[1] === 'any' || entry[1] === 'super') {
        if (!user || user.status !== 'approved') throw authErr_('not approved', ident.email);
        if (isSuperAdmin(ident.email)) user.role = 'Management';
        if (entry[1] === 'super' && !isSuperAdmin(ident.email)) throw authErr_('not super admin', ident.email);
      }
    }
    if (req.idem && seenIdem_(req.idem)) return out_({ ok: true, idempotent: true }, null, req);
    const ctx = { ident: ident, user: user };
    const data = entry[0](req.payload || {}, ctx);
    if (req.idem) markIdem_(req.idem);
    return out_({ ok: true, data: data }, null, req);
  } catch (err) {
    logActivity_('router', 'ERROR:' + (req.action || '?'), (req && req.action) || '', '', '', String(err && err.stack || err));
    return out_({ ok: false, error: (String(err.message) === 'auth' ? 'auth' : 'request failed') }, null, req);
  }
}
function doGet() { return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'M98M Portal', ts: now_() })).setMimeType(ContentService.MimeType.JSON); }

/** RL-1 identity: verify Google ID token (signature+aud+exp via Google), return {email,name,...}. */
function verifyGoogleToken_(idToken) {
  if (!idToken) throw authErr_('no token', '');
  const clientId = getConfig('oauth_client_id');
  if (!clientId) throw authErr_('oauth_client_id not configured', '');
  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw authErr_('token rejected by Google', '');
  const t = JSON.parse(resp.getContentText());
  if (t.aud !== clientId) throw authErr_('audience mismatch', t.email || '');
  if (Number(t.exp) * 1000 < Date.now()) throw authErr_('token expired', t.email || '');
  if (String(t.email_verified) !== 'true') throw authErr_('email not verified', t.email || '');
  return { email: t.email, name: t.name || t.given_name || t.email, given_name: t.given_name || '', picture: t.picture || '' };
}

/** Load the USERS row for a (normalized) email, or null. */
function loadUser_(email) {
  const n = normalizeEmail(email);
  const rows = getPortalDb_(false).getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalizeEmail(rows[i][0]) === n) {
      return { email: rows[i][0], name: rows[i][1], role: rows[i][2], shift: rows[i][3], accounts: rows[i][4], status: rows[i][5], row: i + 1 };
    }
  }
  return null;
}
function authErr_(why, email) { logActivity_('auth', 'AUTH_FAIL', email, '', '', why); return new Error('auth'); }

function rateLimit_(email) {
  const c = CacheService.getScriptCache(), k = 'rl_' + normalizeEmail(email);
  const n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 60);
  if (n > 90) throw authErr_('rate limit', email);
}
function seenIdem_(key) { return CacheService.getScriptCache().get('idem_' + key) === '1'; }
function markIdem_(key) { CacheService.getScriptCache().put('idem_' + key, '1', 21600); }
function out_(obj, logMsg, req) {
  if (logMsg) logActivity_('router', logMsg, (req && req.action) || '', '', '', '');
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function actionPing_() { return { service: 'M98M Portal', phase: 2, ts: now_() }; }
function actionImportRegistry_(payload, ctx) { return importRegistry(String(payload.registryId || ''), ctx.ident.email); }
function actionConnectionHealth_(payload, ctx) { return connectionHealth(); }
