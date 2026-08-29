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
/* Hunting v3 (20 Aug): the DB tab self-heals its columns — any HUNTING_COLS name missing from
 * the HUNTING_DB header row is appended at the end, so a workbook redesign never needs manual
 * sheet surgery. Idempotent; rides the hourly sweep below. */
function huntEnsureDbCols_() {
  try {
    const sh = getPortalDb_(false).getSheetByName('HUNTING_DB');
    if (!sh) return;
    const width = sh.getLastColumn();
    const head = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
    const want = ['hunt_id', 'hunter_email', 'ts'].concat(HUNTING_COLS);
    const missing = want.filter(function (c) { return head.indexOf(c) < 0; });
    if (!missing.length) return;
    sh.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    logActivity_('system', 'HUNTING_DB_COLS', '', '', '', 'appended: ' + missing.join(', '));
  } catch (e) { logActivity_('system', 'ERROR:huntEnsureCols', '', '', '', String(e && e.message || e)); }
}

/* 28 Aug ("Exceeded maximum execution time" ×3, Google's failure mail): five riders shared one
 * 6-minute run with no clock — on odd hours the dispatch recompute (~40s × 6 accounts) plus the
 * Ali sweep outgrew the window and Apps Script KILLED the run mid-rider, silently, logging
 * nothing. The sweep now carries a hard budget: the riders people wait on (checkpoint flags,
 * the Ali order numbers) run FIRST, the heavy alternating dashboard rider runs only while at
 * least two minutes remain, and anything skipped is LOGGED as skipped — a visible skip beats an
 * invisible kill. The skipped rider simply runs on a later, quieter hour. */
function runMissedCheckpointSweep() {
  const t0 = Date.now();
  const msLeft = function () { return 330000 - (Date.now() - t0); };   // 5.5 min of the 6 allowed
  huntEnsureDbCols_();
  if (typeof flagMissedCheckpoints === 'function') {
    try { flagMissedCheckpoints(); }
    catch (e) { logActivity_('trigger', 'ERROR:missedCheckpoints', '', '', '', String(e && e.stack || e)); }
  }
  /* R5: the Ali order-number sweep (day tabs → Engine) — the one the Order Processors wait on,
   * so it outranks the dashboard refreshers. Carries the one-time first-backup bootstrap. */
  if (typeof nightWatchHourlyRide === 'function') {
    try { nightWatchHourlyRide(); }
    catch (e) { logActivity_('trigger', 'ERROR:nightWatchRide', '', '', '', String(e && e.stack || e)); }
  }
  /* Queued hunt-decision mirrors (29 Aug) — land the workbooks' copies out of the interactive
   * path. Runs before the alternating heavy rider; carries its own 200s internal budget. */
  if (msLeft() > 150000 && typeof flushMirrorQueue === 'function') {
    try { flushMirrorQueue(); }
    catch (e) { logActivity_('trigger', 'ERROR:mirrorFlush', '', '', '', String(e && e.stack || e).slice(0, 200)); }
  }
  /* alertsRefresh (Account-KPI cards) and dispatchOverdueSweep (overdue bells) alternate by
   * hour — new triggers need the scriptapp scope this project avoids, so they ride here. Each
   * can eat minutes; neither starts unless two minutes remain. */
  const hour = new Date().getHours();
  const rider = hour % 2 === 0 ? 'alertsRefresh' : 'dispatchOverdueSweep';
  if (msLeft() < 120000) {
    logActivity_('trigger', 'SWEEP_BUDGET_SKIP', rider, '', '', 'only ' + Math.round(msLeft() / 1000) + 's left — runs next cycle');
  } else if (hour % 2 === 0) {
    if (typeof alertsRefresh === 'function') {
      try { alertsRefresh(); }
      catch (e) { logActivity_('trigger', 'ERROR:alertsRefresh', '', '', '', String(e && e.stack || e)); }
    }
  } else if (typeof dispatchOverdueSweep === 'function') {
    try { dispatchOverdueSweep(); }
    catch (e) { logActivity_('trigger', 'ERROR:dispatchOverdue', '', '', '', String(e && e.stack || e)); }
  }
  /* The hunting backup workbook's dated Drive copy — day-gated by property, so the first hour
   * of the Pakistan day with budget to spare takes it. */
  if (msLeft() < 45000) {
    logActivity_('trigger', 'SWEEP_BUDGET_SKIP', 'huntBackupDailyCopy', '', '', 'runs next cycle');
    return;
  }
  if (typeof huntBackupDailyCopy_ === 'function') {
    try { huntBackupDailyCopy_(); }
    catch (e) { logActivity_('trigger', 'ERROR:huntBackupCopy', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  }
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

/** SETUP-ONLY: apply the shift assignments Hasib gave, as §5 intends — Management sets the
 * timetable, staff only ever requested one. Writes both the USERS shift column and a real
 * SCHEDULES row per person, because checkpoints derive from the schedule, and notifies each
 * person of their hours. Editor-run only; safe to re-run (it upserts). */
function bootstrapSetShifts() {
  // Zain works 6 PM - 3 AM, which is neither named shift, so it is a Custom schedule.
  // Its break follows the pattern of the other two (three hours in, one hour long) — change it
  // in the Rota screen if that is wrong; nothing else depends on the exact minute.
  const PLAN = {
    'm98mnine@gmail.com':  { label: 'Shift 2' },                                            // Rana Noman
    'm98meight@gmail.com': { label: 'Shift 2' },                                            // Wahab
    'm98mten@gmail.com':   { label: 'Shift 2' },                                            // Fasieh-Ul-Hassan
    'm98mfour@gmail.com':  { label: 'Custom', start: '18:00', end: '03:00', bs: '21:00', be: '22:00' }, // Zain
  };
  const DEFAULT_LABEL = 'Shift 1';

  const hoursFor = function (label) {
    const key = label === 'Shift 2' ? 'shift2' : 'shift1';
    const hours = String(getConfig(key + '_hours') || '').split('-');
    const brk = String(getConfig(key + '_break') || '').split('-');
    return { start: hours[0] || '', end: hours[1] || '', bs: brk[0] || '', be: brk[1] || '' };
  };

  const db = getPortalDb_(false);
  const us = db.getSheetByName('USERS');
  const sc = db.getSheetByName('SCHEDULES');
  const rows = us.getDataRange().getValues();
  const schedRows = sc.getDataRange().getValues();
  const applied = [];

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][0] || '');
      if (!email) continue;
      const n = normalizeEmail(email);
      if (!ROLE_PREFILL[n]) continue;                       // seeded staff only; owners keep theirs
      if (String(rows[i][5]) !== 'approved') continue;

      const plan = PLAN[n] || { label: DEFAULT_LABEL };
      const base = hoursFor(plan.label);
      const start = plan.start || base.start;
      const end = plan.end || base.end;
      const bs = plan.bs !== undefined ? plan.bs : base.bs;
      const be = plan.be !== undefined ? plan.be : base.be;

      const old = String(rows[i][3] || '');
      us.getRange(i + 1, 4).setValue(plan.label);

      let schedRow = 0;
      for (let s = 1; s < schedRows.length; s++) {
        if (normalizeEmail(schedRows[s][0]) === n) { schedRow = s + 1; break; }
      }
      const record = [email, now_().slice(0, 10), plan.label, start, end, bs, be, '', 'owner', now_()];
      if (schedRow) sc.getRange(schedRow, 1, 1, record.length).setValues([record]);
      else { sc.appendRow(record); schedRows.push(record); }

      applied.push(email + ' -> ' + plan.label + ' ' + start + '-' + end + (bs ? ' (break ' + bs + '-' + be + ')' : ''));
      logActivity_('setup', 'SET_SHIFT', email, old, plan.label + ' ' + start + '-' + end, 'owner instruction');
      notify_(email, 'Your timetable is set',
        'You are on ' + plan.label + ', ' + start + ' to ' + end + (bs ? ', break ' + bs + '-' + be : '') +
        '. Your 2-hourly checkpoints appear on the My reports screen.', 'schedule');
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  const checks = applied.map(function (line) {
    const email = line.split(' -> ')[0];
    let cps = [];
    try { cps = getCheckpointsForUser_(email) || []; } catch (e) { cps = ['(could not derive)']; }
    return '  ' + line + '\n      checkpoints: ' + cps.join(', ');
  });
  const msg = 'SHIFTS SET for ' + applied.length + ':\n' + checks.join('\n') +
    '\nWorking days left blank on purpose — set them in the Rota screen if some staff do not work every day.';
  Logger.log(msg);
  return msg;
}

/** SETUP-ONLY: the whole team works Monday to Saturday (owner's instruction).
 * Stored as the canonical comma list the rota screen and the report sweep both read, so Sunday
 * stops producing checkpoints — no missed-report marks against a day nobody was working. */
function bootstrapSetWorkingDays() {
  const DAYS = 'Mon,Tue,Wed,Thu,Fri,Sat';
  const sc = getPortalDb_(false).getSheetByName('SCHEDULES');
  const rows = sc.getDataRange().getValues();
  const head = rows[0];
  let col = 0;
  head.forEach(function (h, i) { if (String(h).trim() === 'working_days') col = i + 1; });
  if (!col) throw new Error('working_days column not found');

  const done = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][0] || '');
      if (!email) continue;
      const old = String(rows[i][col - 1] || '');
      if (old === DAYS) continue;
      sc.getRange(i + 1, col).setValue(DAYS);
      done.push(email);
      logActivity_('setup', 'SET_WORKING_DAYS', email, old, DAYS, 'owner instruction');
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  // Prove it took effect where it matters: Sunday must be a non-working day now.
  const sample = done.length ? done[0] : '';
  let sundayCheck = 'no rows to check';
  if (sample) {
    const sched = getScheduleForUser_(sample);
    sundayCheck = 'Sunday counted as a working day for ' + sample + '? ' +
      (repIsWorkingDay_(sched && sched.working_days, '2026-08-16') ? 'YES (wrong)' : 'no (correct)') +
      ' · Monday? ' + (repIsWorkingDay_(sched && sched.working_days, '2026-08-17') ? 'yes (correct)' : 'NO (wrong)');
  }
  const msg = 'WORKING DAYS set to ' + DAYS + ' for ' + done.length + ' schedule rows.\n' + sundayCheck;
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
/** Per-execution memo. Apps Script starts a fresh runtime for every request, so these live
 * exactly as long as one request — there is no staleness across users. Opening the spreadsheet
 * and reading Script Properties are both round trips of roughly 100-300ms, and a single request
 * used to do it ten to twenty times (every logActivity_, getConfig, readTab_ and handler),
 * which is where most of the portal's response time was going. */
var EXEC_DB = null;
var EXEC_CFG = {};
var EXEC_TABS = {};

/** Tabs that are read repeatedly in one request but never written and re-read inside it.
 * Anything not listed here is read fresh every time, so write-then-read stays correct. */
const EXEC_MEMO_TABS = ['USERS', 'CONFIG', 'CONNECTIONS', 'SCHEDULES', 'RULES', 'SOPS', 'INSTRUCTIONS'];

function execResetMemo_() { EXEC_DB = null; EXEC_CFG = {}; EXEC_TABS = {}; }
function execForgetTab_(name) { delete EXEC_TABS[name]; }

function getPortalDb_(createIfMissing) {
  if (EXEC_DB) return EXEC_DB;
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_DB_ID);
  if (id) { try { EXEC_DB = SpreadsheetApp.openById(id); return EXEC_DB; } catch (e) { /* fall through */ } }
  if (!createIfMissing) throw new Error('Portal DB not initialised — run setupDatabase()');
  const found = DriveApp.getFilesByName(PORTAL_DB_NAME);
  const ss = found.hasNext() ? SpreadsheetApp.open(found.next()) : SpreadsheetApp.create(PORTAL_DB_NAME);
  props.setProperty(PROP_DB_ID, ss.getId());
  EXEC_DB = ss;
  return ss;
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'"); }
/** Security-critical keys are never cached: a change to who is a super admin, or to the
 * sign-in client, must take effect on the very next request — not up to a cache TTL later. */
const CONFIG_NEVER_CACHE = ['super_admins', 'oauth_client_id'];
const CONFIG_CACHE_SECONDS = 25;

function getConfig(key) {
  // Within one request a setting cannot change, and the security keys below were re-reading the
  // whole CONFIG tab on every single call.
  if (Object.prototype.hasOwnProperty.call(EXEC_CFG, key)) return EXEC_CFG[key];

  const cacheable = CONFIG_NEVER_CACHE.indexOf(key) < 0;
  const cache = CacheService.getScriptCache();
  if (cacheable) {
    const hit = cache.get('cfg_' + key);
    if (hit !== null) { EXEC_CFG[key] = hit; return hit; }
  }
  const rows = readTab_('CONFIG');
  let val = '';
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].key === key) { val = String(rows[i].value); break; }
  }
  if (cacheable) cache.put('cfg_' + key, val, CONFIG_CACHE_SECONDS);
  EXEC_CFG[key] = val;
  return val;
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
  // No script lock. appendRow already appends atomically, and taking the PORTAL-WIDE lock here
  // made every logged action — which is nearly all of them — queue behind every other user's.
  // With 13 staff that turned an audit trail into the portal's main traffic jam. The lock still
  // guards genuine read-modify-write sequences elsewhere, which is what it is for.
  // false, never true: this runs on every error, and a create-if-missing here would answer a
  // temporarily unreachable database by making a blank one and overwriting the stored id of the
  // real one — erasing the way back at the exact moment something is already wrong.
  getPortalDb_(false).getSheetByName('ACTIVITY_LOG')
    .appendRow([now_(), actor, action, target, String(oldV).slice(0, 500), String(newV).slice(0, 500), String(detail || '').slice(0, 1000)]);
}
