/** Phase 1 — setupDatabase(): builds the M98M Portal DB spreadsheet (every §7 tab),
 * seeds USERS from the real staff list, CONFIG defaults, and RULES/SOPS from SEED
 * (verbatim from the Do's & Don'ts workbook + Organizational Structure doc).
 * Idempotent: safe to run again — creates only what's missing, never duplicates seeds. */

function setupDatabase() {
  const ss = getPortalDb_(true);
  const created = [], seeded = [];

  Object.keys(DB_TABS).forEach(function(name) {
    let headers = DB_TABS[name];
    if (name === 'HUNTING_DB') headers = headers.concat(HUNTING_COLS);
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); created.push(name); }
    if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  // CONFIG defaults — only keys that don't exist yet.
  const cfg = ss.getSheetByName('CONFIG');
  const have = {};
  cfg.getDataRange().getValues().slice(1).forEach(function(r){ if (r[0]) have[r[0]] = true; });
  Object.keys(CONFIG_DEFAULTS).forEach(function(k) {
    if (!have[k]) { cfg.appendRow([k, CONFIG_DEFAULTS[k], 'setup', now_()]); seeded.push('CONFIG:' + k); }
  });

  seedUsers_(ss, seeded);
  seedFromSeedGs_(ss, seeded);

  logActivity_('setup', 'setupDatabase', PORTAL_DB_NAME, '', '', 'created:[' + created.join(',') + '] seeded:' + seeded.length);
  const msg = 'Portal DB ready: ' + ss.getUrl() + '\nTabs created: ' + (created.join(', ') || 'none (already existed)') + '\nSeeded: ' + seeded.length + ' items';
  Logger.log(msg);
  return msg;
}

/** USERS: 11 staff prefilled per §4.1 as pending + 2 super admins approved. */
function seedUsers_(ss, seeded) {
  const sh = ss.getSheetByName('USERS');
  const existing = {};
  sh.getDataRange().getValues().slice(1).forEach(function(r){ if (r[0]) existing[normalizeEmail(r[0])] = true; });
  SEED.STAFF.forEach(function(s) {
    const em = normalizeEmail(s.email);
    if (existing[em]) return;
    sh.appendRow([s.email.trim(), s.name.trim(), ROLE_PREFILL[em] || '', '', 'per-role', 'pending', now_(), '', '', 'seeded §4.1']);
    seeded.push('USER:' + em);
  });
  SUPER_ADMINS.forEach(function(e) {
    if (existing[normalizeEmail(e)]) return;
    sh.appendRow([e, e.indexOf('mrhasibullah') === 0 ? 'Hasib' : 'Zaid', 'Management', '', 'ALL', 'approved', now_(), 'setup', '', 'super admin']);
    seeded.push('USER:' + normalizeEmail(e));
  });
}

/** RULES + SOPS from the generated SEED (only when the tab has no data yet). */
function seedFromSeedGs_(ss, seeded) {
  const rules = ss.getSheetByName('RULES');
  if (rules.getLastRow() < 2 && typeof SEED !== 'undefined') {
    const rows = SEED.RULES.map(function(r, i) {
      return ['R' + String(i + 1).padStart(3, '0'), r.department, r.type, r.rule_text, 'seed (Do\'s & Don\'ts workbook)', now_(), 'active', ''];
    });
    if (rows.length) { rules.getRange(2, 1, rows.length, rows[0].length).setValues(rows); seeded.push('RULES:' + rows.length); }
  }
  const sops = ss.getSheetByName('SOPS');
  if (sops.getLastRow() < 2 && typeof SEED !== 'undefined') {
    const rows = SEED.SOPS.map(function(s, i) {
      return ['S' + String(i + 1).padStart(2, '0'), s.dept, s.order, s.title, s.content, 'seed (org doc v1.2 + Advertising SOP v2.0)', now_()];
    });
    if (rows.length) { sops.getRange(2, 1, rows.length, rows[0].length).setValues(rows); seeded.push('SOPS:' + rows.length); }
  }
}

/** SETUP-ONLY bootstrap: approve a user from the script editor.
 * Needed once, to solve the chicken-and-egg — approveUser (§4.1b) requires an already-approved
 * Management user, and on day one nobody is approved. Run from the editor only; it is not exposed
 * as a router action, so it can never be called from the browser. Every use is logged.
 * Super-admin rights are NOT granted here — those live in CONFIG.super_admins (§4.1). */
function bootstrapApproveUser(email, role, accounts) {
  email = email || 'm98m786@gmail.com';
  role = role || 'Management';
  accounts = accounts || 'ALL';
  if (ROLES.indexOf(role) < 0) throw new Error('unknown role: ' + role);
  const sh = getPortalDb_(false).getSheetByName('USERS');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalizeEmail(rows[i][0]) === normalizeEmail(email)) {
      const old = rows[i][2] + '|' + rows[i][5];
      sh.getRange(i + 1, 3).setValue(role);
      sh.getRange(i + 1, 5).setValue(accounts);
      sh.getRange(i + 1, 6).setValue('approved');
      sh.getRange(i + 1, 8).setValue('setup bootstrap');
      SpreadsheetApp.flush();
      logActivity_('setup', 'BOOTSTRAP_APPROVE', rows[i][0], old, role + '|approved', 'editor-run');
      const okMsg = 'APPROVED ' + rows[i][0] + ' as ' + role + ' (accounts: ' + accounts + ') — row ' + (i + 1);
      Logger.log(okMsg);
      return okMsg;
    }
  }
  const missMsg = 'NOT FOUND: ' + email + ' among ' + (rows.length - 1) + ' users — sign in once first so the row exists.';
  Logger.log(missMsg);
  return missMsg;
}

/** Time triggers the portal needs to run on its own (§5 missed checkpoints, §8.0b approval
 * escalation). Idempotent: clears the ones it owns before recreating, so running it twice
 * never doubles them up. Each handler is defensive — a module that is not deployed is skipped. */
function installTriggers() {
  const owned = ['runMissedCheckpointSweep', 'runSubmissionEscalationSweep'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (owned.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runMissedCheckpointSweep').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('runSubmissionEscalationSweep').timeBased().everyHours(1).create();
  logActivity_('setup', 'INSTALL_TRIGGERS', 'triggers', '', owned.join(','), '');
  return 'Triggers installed: missed-checkpoint sweep every 30 min, submission escalation hourly.';
}

function runMissedCheckpointSweep() {
  if (typeof flagMissedCheckpoints !== 'function') return;
  try { flagMissedCheckpoints(); }
  catch (e) { logActivity_('trigger', 'ERROR:missedCheckpoints', '', '', '', String(e && e.stack || e)); }
}

function runSubmissionEscalationSweep() {
  if (typeof escalateStaleSubmissions !== 'function') return;
  try { escalateStaleSubmissions(); }
  catch (e) { logActivity_('trigger', 'ERROR:submissionEscalation', '', '', '', String(e && e.stack || e)); }
}

/** Phase 1 DoD: one-line Anthropic test — proves the key works. Reads key from Script Properties ONLY (RL-2). */
function testAnthropicKey() {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return 'NO KEY: add ANTHROPIC_API_KEY in Project Settings → Script Properties';
  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: getConfig('ai_model') || 'claude-sonnet-5', max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with exactly: M98M AI LIVE' }] }),
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  const body = JSON.parse(resp.getContentText() || '{}');
  const text = body.content && body.content[0] && body.content[0].text;
  logActivity_('setup', 'testAnthropicKey', 'anthropic', '', '', 'http ' + code);
  return code === 200 ? 'AI LIVE ✅ — model replied: ' + text : 'FAILED http ' + code + ' — check the key (details in ACTIVITY_LOG only)';
}

// ---------- shared helpers ----------
function getPortalDb_(createIfMissing) {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_DB_ID);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* fall through */ } }
  if (!createIfMissing) throw new Error('Portal DB not initialised — run setupDatabase()');
  const found = DriveApp.getFilesByName(PORTAL_DB_NAME);
  const ss = found.hasNext() ? SpreadsheetApp.open(found.next()) : SpreadsheetApp.create(PORTAL_DB_NAME);
  props.setProperty(PROP_DB_ID, ss.getId());
  return ss;
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'"); }
/** Security-critical keys are never cached: a change to who is a super admin, or to the
 * sign-in client, must take effect on the very next request — not up to a cache TTL later. */
const CONFIG_NEVER_CACHE = ['super_admins', 'oauth_client_id'];
const CONFIG_CACHE_SECONDS = 25;

function getConfig(key) {
  const cacheable = CONFIG_NEVER_CACHE.indexOf(key) < 0;
  const cache = CacheService.getScriptCache();
  if (cacheable) {
    const hit = cache.get('cfg_' + key);
    if (hit !== null) return hit;
  }
  const sh = getPortalDb_(false).getSheetByName('CONFIG');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === key) {
    const val = String(rows[i][1]);
    if (cacheable) cache.put('cfg_' + key, val, CONFIG_CACHE_SECONDS);
    return val;
  }
  return '';
}
/** RL-6: append-only activity log, locked. Detail stays server-side (RL-9). */
function logActivity_(actor, action, target, oldV, newV, detail) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    getPortalDb_(true).getSheetByName('ACTIVITY_LOG').appendRow([now_(), actor, action, target, String(oldV).slice(0, 500), String(newV).slice(0, 500), String(detail || '').slice(0, 1000)]);
  } finally { lock.releaseLock(); }
}
