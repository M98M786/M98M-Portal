/** NightBackup.gs — R5 (21 Aug): Hasib's off-site insurance + the Ali order-number sweep.
 *
 *  "at any day portal dies , we need backup data" — so every night this file PULLS the Engine's
 *  tables (backupDump, key-authed, credential-free whitelist) and writes them into four Google
 *  backup spreadsheets in the owner's Drive. Pull, not push: each page is its own Engine
 *  invocation, so the Worker's subrequest budget is never in the picture, and these functions
 *  run on HEAD — no /exec redeploy is ever needed to change what gets backed up.
 *
 *  The hourly aliSweep reads the day tabs' processor columns (the AliExpress 'Order Number' and
 *  'New Ali Link') and pours them into the Engine, which is what lets the portal answer
 *  "which orders are still not processed" from its own tables.
 *
 *  NO TRIGGERS OF THEIR OWN — this project deliberately never calls ScriptApp (the scriptapp
 *  scope forces a re-consent that blocks every function). Both jobs RIDE the two triggers that
 *  already exist, the same way alertsRefresh and dispatchOverdueSweep do:
 *    · aliSweep        rides runMissedCheckpointSweep (hourly, Setup.gs)
 *    · nightBackupPull rides nightlyBackup            (nightly, Integrity.gs)
 *  First-run bootstrap: until the backup files exist (no BACKUP_SS_MONEY property), the hourly
 *  sweep runs the backup once itself, so night one has an off-site copy without waiting a day.
 */

/* One backup spreadsheet PER DEPARTMENT (Hasib: "backup spreadsheet of each and every single
 * department… to keep backup of every single line written in it"). `tables` pull from the
 * Engine (backupDump); `portalTabs` copy line-for-line from the Portal DB spreadsheet the
 * office actually types into. BACKUP_SS_MONEY doubles as the first-run bootstrap marker. */
var NB_FILES = {
  BACKUP_SS_MONEY: { title: 'M98M Backup — Money & Daily Books',
    tables: ['sales_daily', 'daily_health', 'account_summary'] },
  BACKUP_SS_ORDERS: { title: 'M98M Backup — Orders Department',
    tables: ['orders', 'trackings', 'late_marks'] },
  BACKUP_SS_ADVERT: { title: 'M98M Backup — Advertising Department',
    tables: ['campaigns', 'campaign_ads', 'ads_daily', 'ads_today', 'promotions', 'promo_members'] },
  BACKUP_SS_CSDEPT: { title: 'M98M Backup — Customer Service Department',
    tables: ['cases', 'cs_metrics', 'cs_standards', 'violations', 'feedback', 'feedback_summary'] },
  BACKUP_SS_LISTINGS: { title: 'M98M Backup — Listings & Sourcing Department',
    tables: ['items_api', 'items_facts', 'sourcing', 'listing_decisions', 'traffic_daily'] },
  BACKUP_SS_OFFICE: { title: 'M98M Backup — Office, Tasks & Departments',
    tables: [],
    portalTabs: ['USERS', 'TASKS', 'SCHEDULES', 'ATTENDANCE', 'MEETINGS', 'DAILY_AGENDA', 'MESSAGES',
      'NOTICES', 'SOPS', 'RULES', 'SIGNALS', 'STAFF_REVIEWS', 'STAFF_EVAL', 'HUNTING_DB',
      'POTENTIAL_CPC', 'IDEAS', 'REPORTS_2H', 'CAMPAIGN_LOG', 'CONNECTIONS', 'CONFIG'] },
  BACKUP_SS_SYSTEM: { title: 'M98M Backup — People & System',
    tables: ['users', 'users_snapshot', 'accounts', 'alert_log', 'audit', 'sync_state'] },
};

/* A Portal DB tab is copied whole — header and every written line — capped at the LAST 4000
 * rows for the two unbounded logs so one giant log can never eat the night's budget. */
var NB_TAB_ROW_CAP = { REPORTS_2H: 4000, ACTIVITY_LOG: 4000 };

/** Create-once: each backup file lives in the owner's Drive, its id pinned in Script Properties. */
function nbFile_(propKey) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(propKey);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted? recreate below */ }
  }
  var ss = SpreadsheetApp.create(NB_FILES[propKey].title);
  props.setProperty(propKey, ss.getId());
  return ss;
}

function nbLog_(ss, row) {
  var sh = ss.getSheetByName('LOG') || ss.insertSheet('LOG');
  if (sh.getLastRow() === 0) sh.appendRow(['at', 'table', 'rows', 'seconds', 'note']);
  sh.appendRow(row);
  var extra = sh.getLastRow() - 500;                      // the log never grows without bound
  if (extra > 0) sh.deleteRows(2, extra);
}

/** One table: page the Engine dump and rewrite the tab wholesale. Returns the row count. */
function nbPullTable_(ss, table) {
  var t0 = Date.now();
  var header = null, all = [];
  for (var offset = 0; offset < 200000; ) {
    var d = enginePost_('backupDump', { table: table, offset: offset, limit: 2500 });
    if (!header && d.header && d.header.length) header = d.header;
    var rows = d.rows || [];
    for (var i = 0; i < rows.length; i++) {
      all.push(rows[i].map(function (c) {
        if (c === null || c === undefined) return '';
        var s = typeof c === 'number' ? c : String(c);
        return typeof s === 'string' && s.length > 45000 ? s.slice(0, 45000) : s;   // cell cap
      }));
    }
    offset += rows.length;
    if (d.done || !rows.length) break;
  }
  var sh = ss.getSheetByName(table) || ss.insertSheet(table);
  sh.clearContents();
  if (header) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    for (var r = 0; r < all.length; r += 2000) {
      var chunk = all.slice(r, r + 2000);
      sh.getRange(r + 2, 1, chunk.length, header.length).setValues(chunk);
    }
  } else {
    sh.getRange(1, 1).setValue('(empty on ' + new Date().toISOString() + ')');
  }
  nbLog_(ss, [new Date().toISOString(), table, all.length, Math.round((Date.now() - t0) / 100) / 10, '']);
  return all.length;
}

/** One Portal DB tab, line for line, into the department backup file. */
function nbCopyPortalTab_(ss, db, name, t0) {
  var src = db.getSheetByName(name);
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  if (!src || src.getLastRow() === 0) { sh.getRange(1, 1).setValue('(no such tab or empty on ' + new Date().toISOString() + ')'); return 0; }
  var vals = src.getDataRange().getValues();
  var cap = NB_TAB_ROW_CAP[name];
  if (cap && vals.length > cap + 1) vals = [vals[0]].concat(vals.slice(vals.length - cap));  // header + newest lines
  vals = vals.map(function (row) {
    return row.map(function (c) {
      if (c === null || c === undefined) return '';
      if (typeof c === 'number' || c instanceof Date) return c;
      var s = String(c);
      return s.length > 45000 ? s.slice(0, 45000) : s;
    });
  });
  for (var r = 0; r < vals.length; r += 2000) {
    var chunk = vals.slice(r, r + 2000);
    sh.getRange(r + 1, 1, chunk.length, chunk[0].length).setValues(chunk);
  }
  nbLog_(ss, [new Date().toISOString(), 'portal:' + name, vals.length - 1, Math.round((Date.now() - t0) / 100) / 10, '']);
  return vals.length - 1;
}

/** Hasib: "create minimum 3 backups of all this portal". Copy 1 = the live backup files
 *  (rewritten nightly). Copy 2 = a dated file-copy of each into the Drive backup folder
 *  (30-day history, pruned by the same prune the DB copy uses). Copy 3 = the Night Watch's
 *  local .xlsx exports on the office Mac. Plus the untouched nightly Portal DB copy. */
function nbGenerationCopies_(fails) {
  var stamp = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
  var folder;
  try { folder = backupFolder_(); } catch (e) { fails.push('gen:folder ' + String(e).slice(0, 50)); return 0; }
  var made = 0;
  Object.keys(NB_FILES).forEach(function (k) {
    var id = PropertiesService.getScriptProperties().getProperty(k);
    if (!id) return;
    try { DriveApp.getFileById(id).makeCopy(NB_FILES[k].title + ' — ' + stamp, folder); made++; }
    catch (e) { fails.push('gen:' + k + ' ' + String(e).slice(0, 40)); }
  });
  return made;
}

/** Hasib: "create every sheet i gave you at the back end for which ebay is not putting data,
 *  but create sheets that are representable." The account_report books whose eBay-side agents
 *  went quiet get a clean ENGINE REPORT tab, rewritten nightly from the Engine's own truth:
 *  the 30-day summary block plus that account's daily book lines. The agents' own tabs are
 *  never touched — this adds a tab that is always alive. */
function nbRefreshReportBooks_(fails) {
  var conns = readTab_('CONNECTIONS').filter(function (c) {
    return String(c.sheet_kind) === 'account_report' && String(c.status || '').toLowerCase() !== 'off';
  });
  if (!conns.length) return 0;
  var sum, daily;
  try {
    sum = enginePost_('backupDump', { table: 'account_summary', limit: 100 });
    daily = enginePost_('backupDump', { table: 'sales_daily', limit: 4000 });
  } catch (e) { fails.push('reportBooks: ' + String(e).slice(0, 60)); return 0; }
  var accCol = daily.header.indexOf('account'), dateCol = daily.header.indexOf('date');
  var done = 0;
  conns.forEach(function (c) {
    var acct = String(c.account_name || '').trim();
    try {
      var ss = SpreadsheetApp.openById(String(c.spreadsheet_id));
      var sh = ss.getSheetByName('ENGINE REPORT') || ss.insertSheet('ENGINE REPORT', 0);
      sh.clearContents();
      var out = [['M98M ENGINE REPORT — ' + acct], ['always alive: rewritten nightly from the portal engine (eBay API truth), ' + new Date().toISOString()], ['']];
      out.push(['30-DAY SUMMARY']);
      var mine = (sum.rows || []).filter(function (r) { return String(r[sum.header.indexOf('account')]).trim() === acct; });
      if (mine.length) {
        for (var i = 0; i < sum.header.length; i++) out.push([sum.header[i], mine[0][i]]);
      } else { out.push(['no orders in the last 30 days', '']); }
      out.push(['']);
      out.push(['DAILY BOOKS (newest first)']);
      out.push(daily.header);
      var rowsAcct = (daily.rows || []).filter(function (r) { return String(r[accCol]).trim() === acct; })
        .sort(function (a, b) { return String(b[dateCol]).localeCompare(String(a[dateCol])); }).slice(0, 60);
      rowsAcct.forEach(function (r) { out.push(r); });
      var width = Math.max.apply(null, out.map(function (r) { return r.length; }));
      var rect = out.map(function (r) { while (r.length < width) r.push(''); return r.map(function (x) { return x === null || x === undefined ? '' : x; }); });
      sh.getRange(1, 1, rect.length, width).setValues(rect);
      sh.getRange(1, 1).setFontWeight('bold');
      done++;
    } catch (e) { fails.push('report:' + acct + ' ' + String(e).slice(0, 50)); }
  });
  return done;
}

/** The nightly pull (rides nightlyBackup; first run rides the hourly sweep via the bootstrap).
 *  Engine tables + Portal DB department tabs into their files, then the dated generation
 *  copies; failures collect and stamp back to the Engine, which letters Management if anything
 *  failed. */
function nightBackupPull() {
  var t0 = Date.now(), fails = [], tables = 0, rowsTotal = 0;
  var db = null;
  try { db = getPortalDb_(false); } catch (e) { fails.push('portalDb: ' + String(e).slice(0, 60)); }
  Object.keys(NB_FILES).forEach(function (propKey) {
    var ss;
    try { ss = nbFile_(propKey); } catch (e) { fails.push(propKey + ': ' + String(e).slice(0, 60)); return; }
    NB_FILES[propKey].tables.forEach(function (table) {
      if (Date.now() - t0 > 270000) { fails.push('TIME:' + table); return; }   // never die mid-write
      try { rowsTotal += nbPullTable_(ss, table); tables++; }
      catch (e) { fails.push(table + ': ' + String(e).slice(0, 60)); }
    });
    (NB_FILES[propKey].portalTabs || []).forEach(function (tab) {
      if (!db) return;
      if (Date.now() - t0 > 270000) { fails.push('TIME:portal:' + tab); return; }
      try { rowsTotal += nbCopyPortalTab_(ss, db, tab, t0); tables++; }
      catch (e) { fails.push('portal:' + tab + ': ' + String(e).slice(0, 50)); }
    });
  });
  var copies = nbGenerationCopies_(fails);
  var books = nbRefreshReportBooks_(fails);
  var stamp = { ok: fails.length === 0, tables: tables, rows: rowsTotal, fails: fails, copies: copies, report_books: books, secs: Math.round((Date.now() - t0) / 1000) };
  try { enginePost_('backupStamp', stamp); } catch (e) { stamp.stampError = String(e).slice(0, 120); }
  PropertiesService.getScriptProperties().setProperty('BACKUP_LAST', JSON.stringify({ at: new Date().toISOString(), tables: tables, rows: rowsTotal, copies: copies, fails: fails }));
  return stamp;
}

/* ------------------------------------------------------------------------------------------ */
/* The hourly Ali sweep: day tabs → Engine. Reads TODAY plus 3 days back per account, pulls the
 * eBay order id (first 'Order number' column), the AliExpress order number (the second — the
 * sheet's own capital-N 'Order Number'), and 'New Ali Link'; only filled values travel. */

function nbHeaderCols_(headers) {
  var ebayCol = -1, aliNumCol = -1, linkCol = -1, seen = 0;
  for (var i = 0; i < headers.length; i++) {
    var n = bridgeNormalizeHeader_(String(headers[i] || ''));
    if (n === 'order number') { if (seen === 0) ebayCol = i; else if (aliNumCol < 0) aliNumCol = i; seen++; }
    if (n === 'new ali link' && linkCol < 0) linkCol = i;
  }
  return { ebayCol: ebayCol, aliNumCol: aliNumCol, linkCol: linkCol };
}

function aliSweep() {
  var conns = readTab_('CONNECTIONS').filter(function (c) {
    return String(c.sheet_kind) === 'order_processing' && String(c.status || '').toLowerCase() !== 'off';
  });
  var out = [], opened = 0;
  conns.forEach(function (c) {
    var ss;
    try { ss = SpreadsheetApp.openById(String(c.spreadsheet_id)); } catch (e) { return; }
    var sheets = ss.getSheets();
    for (var back = 0; back <= 6; back++) {
      var ymd = Utilities.formatDate(new Date(Date.now() - back * 86400000), 'Asia/Karachi', 'yyyy-MM-dd');
      var candidates = ordersDayTabCandidates_(ymd);
      for (var s = 0; s < sheets.length; s++) {
        if (!ordersTabIsCandidate_(sheets[s].getName(), candidates)) continue;
        opened++;
        var values = sheets[s].getDataRange().getValues();
        if (values.length < 2) continue;
        var cols = nbHeaderCols_(values[0]);
        if (cols.ebayCol < 0 || (cols.aliNumCol < 0 && cols.linkCol < 0)) continue;
        for (var r = 1; r < values.length; r++) {
          var id = String(values[r][cols.ebayCol] || '').trim();
          if (!/^\d{2}-\d{5}-\d{5}$/.test(id)) continue;
          var num = cols.aliNumCol >= 0 ? String(values[r][cols.aliNumCol] || '').replace(/\D/g, '') : '';
          var link = cols.linkCol >= 0 ? String(values[r][cols.linkCol] || '').trim() : '';
          if (num.length < 8) num = '';
          if (link.indexOf('https://') !== 0) link = '';
          if (num || link) out.push({ order_id: id, ali_order: num, ali_link: link });
        }
        break;                                             // one tab per date is enough
      }
    }
  });
  var written = 0;
  for (var i = 0; i < out.length; i += 400) {
    var res = enginePost_('syncAliOrders', { rows: out.slice(i, i + 400) });
    written += Number(res.written) || 0;
  }
  PropertiesService.getScriptProperties().setProperty('ALI_SWEEP_LAST',
    JSON.stringify({ at: new Date().toISOString(), tabs: opened, found: out.length, written: written }));
  return { accounts: conns.length, tabs: opened, found: out.length, written: written };
}

/* ------------------------------------------------------------------------------------------ */

/** The hourly ride (called from runMissedCheckpointSweep): the Ali sweep every hour, plus the
 *  one-time first backup — until the backup files exist, night one must not wait for the nightly
 *  trigger to come around. After the first run the property exists and this is sweep-only. */
/** One-shot: until the backup files exist, run the whole first cycle (sweep + backup) from
 *  whichever trigger reaches here first — the 5-minute loss sweep carries it so night one
 *  starts within minutes, not at the hourly trigger's leisure. Pure no-op ever after. */
function nightWatchBootstrapOnce_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('BACKUP_SS_MONEY')) return;
  if (props.getProperty('NW_BOOT_LOCK')) return;                    // a 6-min run must not double-start
  props.setProperty('NW_BOOT_LOCK', new Date().toISOString());
  try {
    try { aliSweep(); }
    catch (e) { logActivity_('trigger', 'ERROR:aliSweep', '', '', '', String(e && e.stack || e).slice(0, 300)); }
    try { nightBackupPull(); }
    catch (e) { logActivity_('trigger', 'ERROR:firstBackup', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  } finally {
    props.deleteProperty('NW_BOOT_LOCK');
  }
}

function nightWatchHourlyRide() {
  try { aliSweep(); }
  catch (e) { logActivity_('trigger', 'ERROR:aliSweep', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  if (!PropertiesService.getScriptProperties().getProperty('BACKUP_SS_MONEY')) {
    try { nightBackupPull(); }
    catch (e) { logActivity_('trigger', 'ERROR:firstBackup', '', '', '', String(e && e.stack || e).slice(0, 300)); }
  }
}
