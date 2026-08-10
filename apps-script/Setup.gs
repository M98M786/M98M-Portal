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

/** The portal's two background sweeps (§5 missed checkpoints, §8.0b approval escalation).
 *
 * These are created as time-driven triggers through the Apps Script UI (Triggers -> Add Trigger),
 * deliberately NOT in code: calling ScriptApp.newTrigger would make the project demand the
 * script.scriptapp OAuth scope, which forces a re-consent that blocks EVERY function until it is
 * granted. Creating the same triggers from the UI needs no extra permission, so the portal keeps
 * the smallest set of scopes that does the job (least privilege).
 *
 * Each handler is defensive — a module that is not deployed is simply skipped. */
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

/** SETUP-ONLY: approve every seeded staff member at once, with the §4.1 role already on their row.
 * Editor-run only — never a router action. Approves ONLY the emails seeded from the real staff
 * list (ROLE_PREFILL): a stranger who self-registered is untouched and still needs a human.
 * Shift is deliberately left as it stands — §5 says Management assigns the timetable, and
 * guessing who works which shift would put people on the wrong hours. */
function bootstrapApproveSeededStaff() {
  const sh = getPortalDb_(false).getSheetByName('USERS');
  const rows = sh.getDataRange().getValues();
  const approved = [], skipped = [], noShift = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][0] || '');
      if (!email) continue;
      const n = normalizeEmail(email);
      const seededRole = ROLE_PREFILL[n];
      if (!seededRole) { if (String(rows[i][5]) !== 'approved') skipped.push(email); continue; }
      if (String(rows[i][5]) === 'approved') continue;
      const role = String(rows[i][2] || '') || seededRole;
      sh.getRange(i + 1, 3).setValue(role);
      sh.getRange(i + 1, 6).setValue('approved');
      sh.getRange(i + 1, 8).setValue('bulk approval by owner');
      approved.push(email + ' -> ' + role);
      if (!String(rows[i][3] || '').trim()) noShift.push(email);
      logActivity_('setup', 'BULK_APPROVE', email, 'pending', 'approved', role);
      notify_(email, 'Welcome to the M98M Portal',
        'Your access is approved. Role: ' + role + '. Your timetable is set by Management in the Rota screen.', 'approved');
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  const msg = 'APPROVED ' + approved.length + ':\n  ' + approved.join('\n  ') +
    '\nNot seeded staff, left for a human to decide: ' + (skipped.join(', ') || 'none') +
    '\nNo shift set yet (no checkpoints until the Rota screen assigns one): ' + (noShift.join(', ') || 'none');
  Logger.log(msg);
  return msg;
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
  try {
    logActivityInner_(actor, action, target, oldV, newV, detail);
  } catch (e) {
    // Logging must never be the reason a staff member's save fails.
  }
}

function logActivityInner_(actor, action, target, oldV, newV, detail) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    // false, never true: this runs on every error, and a create-if-missing here would answer a
    // temporarily unreachable database by making a blank one and overwriting the stored id of
    // the real one — erasing the way back at the exact moment something is already wrong.
    getPortalDb_(false).getSheetByName('ACTIVITY_LOG').appendRow([now_(), actor, action, target, String(oldV).slice(0, 500), String(newV).slice(0, 500), String(detail || '').slice(0, 1000)]);
  } finally { lock.releaseLock(); }
}
