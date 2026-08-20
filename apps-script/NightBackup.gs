/** NightBackup.gs — R5 (21 Aug): Hasib's off-site insurance + the Ali order-number sweep.
 *
 *  "at any day portal dies , we need backup data" — so every night this file PULLS the Engine's
 *  tables (backupDump, key-authed, credential-free whitelist) and writes them into four Google
 *  backup spreadsheets in the owner's Drive. Pull, not push: each page is its own Engine
 *  invocation, so the Worker's subrequest budget is never in the picture, and triggers run HEAD
 *  code — no /exec redeploy is ever needed to change what gets backed up.
 *
 *  The hourly aliSweep reads the day tabs' processor columns (the AliExpress 'Order Number' and
 *  'New Ali Link') and pours them into the Engine, which is what lets the portal answer
 *  "which orders are still not processed" from its own tables.
 */

var NB_FILES = {
  BACKUP_SS_MONEY: { title: 'M98M Backup — Money & Marketing',
    tables: ['sales_daily', 'ads_daily', 'ads_today', 'daily_health', 'campaigns', 'campaign_ads', 'promotions', 'promo_members'] },
  BACKUP_SS_ORDERS: { title: 'M98M Backup — Orders & Tracking',
    tables: ['orders', 'trackings', 'late_marks', 'cases'] },
  BACKUP_SS_LISTINGS: { title: 'M98M Backup — Listings & Sourcing',
    tables: ['items_api', 'items_facts', 'sourcing', 'listing_decisions', 'traffic_daily'] },
  BACKUP_SS_SYSTEM: { title: 'M98M Backup — People, Feedback & System',
    tables: ['users', 'users_snapshot', 'accounts', 'feedback', 'feedback_summary', 'cs_metrics', 'cs_standards', 'violations', 'alert_log', 'audit', 'sync_state'] },
};

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

/** The nightly trigger (7 AM PKT = 3 AM UK). Every table into its file; failures collect and
 *  stamp back to the Engine, which letters Management the same morning if anything failed. */
function nightBackupPull() {
  var t0 = Date.now(), fails = [], tables = 0, rowsTotal = 0;
  Object.keys(NB_FILES).forEach(function (propKey) {
    var ss;
    try { ss = nbFile_(propKey); } catch (e) { fails.push(propKey + ': ' + String(e).slice(0, 60)); return; }
    NB_FILES[propKey].tables.forEach(function (table) {
      if (Date.now() - t0 > 300000) {                     // 5-minute guard: never die mid-write
        fails.push('TIME:' + table); return;
      }
      try { rowsTotal += nbPullTable_(ss, table); tables++; }
      catch (e) { fails.push(table + ': ' + String(e).slice(0, 60)); }
    });
  });
  var stamp = { ok: fails.length === 0, tables: tables, rows: rowsTotal, fails: fails, secs: Math.round((Date.now() - t0) / 1000) };
  try { enginePost_('backupStamp', stamp); } catch (e) { stamp.stampError = String(e).slice(0, 120); }
  PropertiesService.getScriptProperties().setProperty('BACKUP_LAST', JSON.stringify({ at: new Date().toISOString(), tables: tables, rows: rowsTotal, fails: fails }));
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
    for (var back = 0; back <= 3; back++) {
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

/** Run once from the editor. Replaces any previous copies of these two triggers. */
function setupNightWatchTriggers() {
  var mine = { nightBackupPull: 1, aliSweep: 1 };
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (mine[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('nightBackupPull').timeBased().atHour(7).everyDays(1).create();  // 7 AM PKT = 3 AM UK
  ScriptApp.newTrigger('aliSweep').timeBased().everyHours(1).create();
  return 'triggers set: nightBackupPull daily @ 7 AM PKT, aliSweep hourly';
}
