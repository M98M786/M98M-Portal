/** Phase 7 — the integrity layer (§16).
 *
 * The portal's own database now holds things that exist NOWHERE else: who made each wrong order
 * (the live Wrong Order tabs have no "Processed By" column at all), every task and approval, the
 * 2-hourly reports, direct messages, and the hunting pipeline. Losing it would lose real work, so
 * a backup is not paperwork — it is the difference between a bad afternoon and a lost month.
 *
 * Deliberately NOT using ScriptApp to create its own trigger: that demands an OAuth scope which
 * forces a re-consent and blocks every other function until it is granted. The nightly trigger is
 * added once from the Apps Script Triggers screen (see docs/HASIB-STEPS.md).
 */

const BACKUP_FOLDER = 'M98M Portal Backups';
const BACKUP_KEEP_DAYS = 30;

/** Nightly. Copies the whole Portal DB into a dated folder the owner alone can read, then prunes
 * copies older than BACKUP_KEEP_DAYS so Drive does not fill up unnoticed. */
function nightlyBackup() {
  const started = now_();
  try {
    const db = getPortalDb_(false);
    const stamp = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd_HHmm');
    const folder = backupFolder_();
    const copy = DriveApp.getFileById(db.getId()).makeCopy(PORTAL_DB_NAME + ' — ' + stamp, folder);
    const pruned = backupPrune_(folder);
    logActivity_('backup', 'NIGHTLY_BACKUP', copy.getId(), '', copy.getName(),
      'started ' + started + ' · pruned ' + pruned);
    return 'Backed up as "' + copy.getName() + '". Pruned ' + pruned + ' copy(ies) older than ' + BACKUP_KEEP_DAYS + ' days.';
  } catch (err) {
    // A failed backup must shout, not fail silently — silence is how people discover at the worst
    // moment that they have no backups.
    logActivity_('backup', 'ERROR:nightlyBackup', BACKUP_FOLDER, '', '', String(err && err.stack || err));
    notifyManagement_('Backup failed', 'The nightly portal backup did not complete: ' + String(err && err.message || err), 'backup');
    throw err;
  }
}

function backupFolder_() {
  const existing = DriveApp.getFoldersByName(BACKUP_FOLDER);
  if (existing.hasNext()) return existing.next();
  const folder = DriveApp.createFolder(BACKUP_FOLDER);
  // Owner-only: the backup contains every profit figure and every buyer address in the portal.
  try { folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { /* default is already private */ }
  return folder;
}

function backupPrune_(folder) {
  const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000;
  const files = folder.getFiles();
  let pruned = 0;
  while (files.hasNext()) {
    const f = files.next();
    if (f.getDateCreated().getTime() < cutoff) { f.setTrashed(true); pruned++; }
  }
  return pruned;
}

/** §16.4 asks for a backup; a backup nobody has restored is a belief, not a control. This makes
 * the most recent copy readable and reports what it contains, so a restore can be checked without
 * touching the live database. */
function verifyLatestBackup() {
  const folder = backupFolder_();
  const files = folder.getFiles();
  let newest = null;
  while (files.hasNext()) {
    const f = files.next();
    if (!newest || f.getDateCreated() > newest.getDateCreated()) newest = f;
  }
  if (!newest) return 'NO BACKUP FOUND — run nightlyBackup() once, then this check will pass.';

  const copy = SpreadsheetApp.openById(newest.getId());
  const live = getPortalDb_(false);
  const liveTabs = live.getSheets().map(function (s) { return s.getName(); });
  const copyTabs = copy.getSheets().map(function (s) { return s.getName(); });
  const missing = liveTabs.filter(function (t) { return copyTabs.indexOf(t) < 0; });
  const rows = {};
  ['USERS', 'TASKS', 'REPORTS_2H', 'ACTIVITY_LOG'].forEach(function (t) {
    const sh = copy.getSheetByName(t);
    rows[t] = sh ? Math.max(0, sh.getLastRow() - 1) : 'missing';
  });
  const verdict = missing.length ? 'INCOMPLETE — missing tabs: ' + missing.join(', ') : 'COMPLETE';
  const msg = 'Latest backup: "' + newest.getName() + '" (' + newest.getDateCreated() + ')\n' +
    '  tabs: ' + copyTabs.length + ' of ' + liveTabs.length + ' — ' + verdict + '\n' +
    '  rows: ' + JSON.stringify(rows);
  Logger.log(msg);
  return msg;
}

/** §16.10 pilot gate. Flipping this is the moment the portal starts writing to the real
 * workbooks, so it is deliberately a decision with a receipt rather than a checkbox: it records
 * who turned it on, tells Management, and reports what was waiting in shadow mode. */
function setExternalWrites(enabled, actor) {
  const want = enabled === true || String(enabled) === 'true';
  const sh = getPortalDb_(false).getSheetByName('CONFIG');
  const rows = sh.getDataRange().getValues();
  let row = 0;
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === 'pipeline_write_external') { row = i + 1; break; }
  // The key can be absent — it was added to the defaults after this database was first built, and
  // setup only seeds keys that are missing when it runs. Absent still means NO writing, because
  // bridgeWriteEnabled_ requires the exact string 'true'. Create the row so the setting is
  // visible in the sheet rather than implied by a default nobody can see.
  let old = '(not set — writing was off)';
  if (!row) {
    sh.appendRow(['pipeline_write_external', 'false', 'setup', now_()]);
    SpreadsheetApp.flush();
    row = sh.getLastRow();
  } else {
    old = String(rows[row - 1][1]);
  }
  sh.getRange(row, 2).setValue(want ? 'true' : 'false');
  sh.getRange(row, 3).setValue(actor || 'owner');
  sh.getRange(row, 4).setValue(now_());
  SpreadsheetApp.flush();
  CacheService.getScriptCache().remove('cfg_pipeline_write_external');

  const shadowed = readTab_('ACTIVITY_LOG').filter(function (r) { return String(r.action) === 'SHADOW_WRITE'; }).length;
  logActivity_(actor || 'owner', 'SET_EXTERNAL_WRITES', 'CONFIG', old, want ? 'true' : 'false', shadowed + ' shadow writes recorded so far');
  notifyManagement_(want ? 'Live writing switched ON' : 'Live writing switched OFF',
    'The portal will ' + (want ? 'now write to the real business sheets.' : 'no longer write to the real business sheets.') +
    ' ' + shadowed + ' intended writes were recorded in shadow mode before this.', 'config');
  const msg = 'pipeline_write_external: ' + old + ' -> ' + (want ? 'true' : 'false') +
    '\n' + shadowed + ' shadow writes are in ACTIVITY_LOG — read them before trusting the first live one.';
  Logger.log(msg);
  return msg;
}

/** Everything Phase 7 promises, checked in one place so "is this safe yet?" has a real answer
 * rather than an opinion. Read-only: it inspects, it never fixes. */
function integritySelfCheck() {
  const out = [];
  const ok = function (name, pass, detail) { out.push((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + detail : '')); };

  const flag = String(getConfig('pipeline_write_external'));
  const shadow = flag !== 'true';
  ok('shadow mode protects the live workbooks', shadow,
    shadow ? ('writes are recorded, not applied' + (flag ? '' : ' (setting absent — absent means off)')) : 'LIVE WRITING IS ON');

  // Prove it at the door rather than trusting the flag: ask the bridge itself.
  ok('the bridge agrees writing is off', typeof bridgeWriteEnabled_ !== 'function' || bridgeWriteEnabled_() === false);

  const folder = DriveApp.getFoldersByName(BACKUP_FOLDER);
  let count = 0, newest = null;
  if (folder.hasNext()) {
    const files = folder.next().getFiles();
    while (files.hasNext()) { const f = files.next(); count++; if (!newest || f.getDateCreated() > newest) newest = f.getDateCreated(); }
  }
  ok('a backup exists', count > 0, count + ' copies, newest ' + (newest || 'none'));
  ok('the newest backup is less than 48 hours old', !!newest && (Date.now() - newest.getTime()) < 172800000,
    newest ? String(newest) : 'no backup yet');

  ok('the audit log is being written', readTab_('ACTIVITY_LOG').length > 0);
  ok('sync-owned tabs refuse writes', (function () {
    try { bridgeAssertWritableTab_('_OrderItems'); return false; } catch (e) { return true; }
  })());
  ok('the fee engine still hits its anchor', brainOrderEarning_(19.99, 0.10, {}).orderEarning === 17.15);

  const approved = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; }).length;
  ok('staff are approved and can work', approved > 1, approved + ' approved users');

  const scheduled = readTab_('SCHEDULES').filter(function (s) { return String(s.work_start || '').trim(); }).length;
  ok('timetables are set, so checkpoints exist', scheduled > 0, scheduled + ' schedules');

  const msg = 'PORTAL INTEGRITY CHECK\n' + out.join('\n');
  Logger.log(msg);
  return msg;
}
