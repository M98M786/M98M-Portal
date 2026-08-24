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
    batch:            [actionBatch_, 'token'],
    getPublicConfig:  [actionGetPublicConfig_, 'public'],
    whoami:           [actionWhoami_, 'token'],
    register:         [actionRegister_, 'token'],
    submitIdea:       [actionSubmitIdea_, 'any'],
    assignableStaff:  [actionAssignableStaff_, 'any'],
    accountList:      [actionAccountList_, 'any'],
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
    typeof ACTIONS_ADVERTISING !== 'undefined' ? ACTIONS_ADVERTISING : null,
    typeof ACTIONS_ORDERS     !== 'undefined' ? ACTIONS_ORDERS     : null,
    typeof ACTIONS_RECHECK    !== 'undefined' ? ACTIONS_RECHECK    : null,
    typeof ACTIONS_CS         !== 'undefined' ? ACTIONS_CS         : null,
    typeof ACTIONS_EMBEDS     !== 'undefined' ? ACTIONS_EMBEDS     : null,
    typeof ACTIONS_DASHBOARD  !== 'undefined' ? ACTIONS_DASHBOARD  : null,
    typeof ACTIONS_ALERTS     !== 'undefined' ? ACTIONS_ALERTS     : null,
    typeof ACTIONS_PERFORMANCE !== 'undefined' ? ACTIONS_PERFORMANCE : null,
    typeof ACTIONS_SIGNALS    !== 'undefined' ? ACTIONS_SIGNALS    : null,
    typeof ACTIONS_STAFFADMIN !== 'undefined' ? ACTIONS_STAFFADMIN : null,
    typeof ACTIONS_ATTENDANCE !== 'undefined' ? ACTIONS_ATTENDANCE : null,
    typeof ACTIONS_AUDIT      !== 'undefined' ? ACTIONS_AUDIT      : null,
    typeof ACTIONS_ENGINE     !== 'undefined' ? ACTIONS_ENGINE     : null,
    typeof ACTIONS_R8         !== 'undefined' ? ACTIONS_R8         : null,
  ];
  groups.forEach(function (g) {
    if (!g) return;
    Object.keys(g).forEach(function (k) { core[k] = g[k]; });
  });
  return core;
}
const ACTIONS = mergeActions_();

/** Reasons that are safe to show a staff member verbatim. Everything else stays generic (RL-9):
 * a refusal about identity or permission must not describe the lock it just failed to open. */
const SAFE_ERROR_PREFIX = 'SAY: ';

function doPost(e) {
  let req = {};
  execResetMemo_();          // fresh runtime per request, but be explicit about it
  try {
    req = JSON.parse(e.postData && e.postData.contents || '{}');
    const entry = ACTIONS[req.action];
    if (!entry) return out_({ ok: false, error: 'unknown action' }, 'REJECT unknown action', req);

    const ctx = authorizeFor_(entry[1], req.idToken, req.session);
    ctx.idToken = req.idToken;                              // batch re-authorises each inner call
    ctx.session = req.session;
    if (req.idem && seenIdem_(req.idem)) return out_({ ok: true, idempotent: true }, null, req);
    const data = entry[0](req.payload || {}, ctx);
    if (req.idem) markIdem_(req.idem);
    return out_({ ok: true, data: data }, null, req);
  } catch (err) {
    logActivity_('router', 'ERROR:' + (req.action || '?'), (req && req.action) || '', '', '', String(err && err.stack || err));
    const raw = String(err && err.message || '');
    let shown = 'request failed';
    if (raw === 'auth') shown = 'auth';
    else if (raw.indexOf(SAFE_ERROR_PREFIX) === 0) shown = raw.slice(SAFE_ERROR_PREFIX.length);
    // "Not saved: request failed" teaches a staff member nothing, so they try twice and then do
    // the job in the spreadsheet instead — which is the exact drift the portal exists to end.
    // Reasons a person can act on are passed through; anything security-shaped stays generic.
    return out_({ ok: false, error: shown }, null, req);
  }
}
function doGet() { return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'M98M Portal', ts: now_() })).setMimeType(ContentService.MimeType.JSON); }

/** The ONE place an access level is enforced. Both a direct call and a batched one go through
 * here, so a batched action can never be checked more loosely than the same action called alone
 * — the risk that makes batching dangerous if each path grows its own copy of the rules. */
function authorizeFor_(level, idToken, session) {
  if (level === 'public') return { ident: null, user: null };
  /* Portal sessions (the night list's reload fix): a reload or a new tab arrives with the
     Engine's own 7-day session instead of a fresh Google pass. The Engine is asked whose it is
     (sync-key gated, answer cached five minutes); every gate below still reads the USERS row
     fresh on every request, so deactivation still bites on the very next action. */
  const ident = sessionIdent_(session) || verifyGoogleToken_(idToken);   // RL-1 either way
  rateLimit_(ident.email);
  const user = loadUser_(ident.email);                    // may be null (not registered yet)
  if (level === 'any' || level === 'super') {
    if (!user || user.status !== 'approved') throw authErr_('not approved', ident.email);
    if (isSuperAdmin(ident.email)) user.role = 'Management';
    if (level === 'super' && !isSuperAdmin(ident.email)) throw authErr_('not super admin', ident.email);
  }
  return { ident: ident, user: user };
}

/** Several actions in one round trip. Apps Script spends roughly 2.5 seconds loading this script
 * before a single line of ours runs, and a screen used to make four to eleven separate calls —
 * so opening one screen cost 10-27 seconds of almost pure waiting. Batching pays that toll once.
 * Each inner action is authorised individually through authorizeFor_, and one failure returns its
 * own error without spoiling the rest. */
const BATCH_MAX_CALLS = 12;

function actionBatch_(payload, ctx) {
  const calls = payload && payload.calls;
  if (!Array.isArray(calls) || !calls.length) throw new Error(SAFE_ERROR_PREFIX + 'nothing to do');
  if (calls.length > BATCH_MAX_CALLS) throw new Error('batch too large');

  const results = calls.map(function (call) {
    const name = call && call.action;
    const entry = ACTIONS[name];
    if (!entry || name === 'batch') return { ok: false, error: 'unknown action' };
    try {
      const inner = authorizeFor_(entry[1], ctx.idToken, ctx.session);
      return { ok: true, data: entry[0](call.payload || {}, inner) };
    } catch (err) {
      logActivity_('router', 'ERROR:batch:' + name, name, '', '', String(err && err.stack || err));
      const raw = String(err && err.message || '');
      return { ok: false, error: raw === 'auth' ? 'auth'
        : (raw.indexOf(SAFE_ERROR_PREFIX) === 0 ? raw.slice(SAFE_ERROR_PREFIX.length) : 'request failed') };
    }
  });
  return { results: results };
}

/** Portal-session identity: ask the Engine whose session this is. Returns an ident shaped like
 * verifyGoogleToken_'s, or null — it NEVER throws, so the Google path stays the fallback. */
function sessionIdent_(session) {
  if (!session || !/^[0-9a-f]{64}$/.test(String(session))) return null;
  try {
    const cache = CacheService.getScriptCache();
    const key = 'sess_' + String(session).slice(0, 32);
    const hit = cache.get(key);
    if (hit) { const h = JSON.parse(hit); return (h && h.email) ? h : null; }
    const engineUrl = getConfig('engine_url');
    const syncKey = PropertiesService.getScriptProperties().getProperty('ENGINE_SYNC_KEY');
    if (!engineUrl || !syncKey) return null;
    const resp = UrlFetchApp.fetch(engineUrl, { method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ action: 'sessionCheck', key: syncKey, payload: { session: String(session) } }),
      muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return null;
    const j = JSON.parse(resp.getContentText());
    if (!j || !j.ok || !j.data || !j.data.ok || !j.data.email) { cache.put(key, '{}', 60); return null; }
    const ident = { email: String(j.data.email), name: String(j.data.email), given_name: '', picture: '' };
    cache.put(key, JSON.stringify(ident), 300);
    return ident;
  } catch (e) { return null; }
}

/** RL-1 identity: verify Google ID token (signature+aud+exp via Google), return {email,name,...}. */
function verifyGoogleToken_(idToken) {
  if (!idToken) throw authErr_('no token', '');
  const clientId = getConfig('oauth_client_id');
  if (!clientId) throw authErr_('oauth_client_id not configured', '');

  /* Google's answer about a given pass cannot change for the hour that pass is valid, so asking
   * again on every request spends an outbound call (a capped daily resource) to re-learn the
   * same fact and adds a network round trip to every screen. Remember it briefly, keyed by a
   * digest of the pass rather than the pass itself so no credential sits in the cache.
   * Revocation is unaffected: the USERS row is still read fresh on every request below, so
   * deactivating someone still stops them on their very next action (RL-5). */
  const cache = CacheService.getScriptCache();
  const digest = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).slice(0, 32);
  const cacheKey = 'tok_' + digest;
  const hit = cache.get(cacheKey);
  let t;
  if (hit) {
    t = JSON.parse(hit);
  } else {
    const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw authErr_('token rejected by Google', '');
    t = JSON.parse(resp.getContentText());
    // Never outlive the pass itself.
    const secondsLeft = Math.floor((Number(t.exp) * 1000 - Date.now()) / 1000);
    if (secondsLeft > 30) cache.put(cacheKey, JSON.stringify(t), Math.min(300, secondsLeft - 30));
  }
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
      return { email: rows[i][0], name: rows[i][1], role: rows[i][2], shift: rows[i][3], accounts: rows[i][4], status: rows[i][5],
        modules: rows[i][10] === undefined ? '' : String(rows[i][10]),
        tools: rows[i][11] === undefined ? '' : String(rows[i][11]), row: i + 1 };
    }
  }
  return null;
}
function authErr_(why, email) { logActivity_('auth', 'AUTH_FAIL', email, '', '', why); return new Error('auth'); }

const RATE_LIMIT_PER_MIN = 60;

/** Fixed one-minute window. The key CONTAINS the minute, so the count genuinely restarts each
 * minute. Re-putting a fixed key with a 60s TTL instead makes a SLIDING window: every request
 * pushes the expiry out, the count never resets, and a staff member polling every 45 seconds is
 * locked out mid-shift for the rest of the day. */
function rateLimit_(email) {
  const minute = Math.floor(Date.now() / 60000);
  const key = 'rl_' + minute + '_' + normalizeEmail(email);
  const c = CacheService.getScriptCache();
  const n = Number(c.get(key) || 0) + 1;
  c.put(key, String(n), 120);
  if (n > RATE_LIMIT_PER_MIN) throw authErr_('rate limit', email);
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
