/** HuntBackup.gs — the product-hunting backup workbook (Hasib, 26 Aug: "make a separate google
 * sheet of product hunting data — pending for approval, approved, not approved — as a backup ...
 * as soon as Irfan or anyone else enters the product").
 *
 * HUNTING_DB is the only copy of every hunt the portal has ever taken. Lose that tab, or lose the
 * Portal DB between nightly backups, and the hunters' work goes with it. This module keeps a
 * second, human-readable copy in a workbook of its own, split into the three trays the team
 * already thinks in: waiting for a decision, approved, not approved.
 *
 * Two roads reach it, on purpose:
 *   · huntBackupUpsert_ — the hot path. submitHunt / decideHunt / reviseHunt each push their own
 *     row the moment they finish, so a product shows up in the backup as fast as it shows up in
 *     the queue. One row touched, three short column reads, nothing else.
 *   · huntBackupSync    — the reconciler. Rides runLossEscalationSweep (every 5 minutes; triggers
 *     run HEAD, so it works with no deploy), fingerprints HUNTING_DB, and only when something
 *     actually moved does it rewrite the three tabs. This is what heals a missed hot write, an
 *     Approval Status edited straight in the sheet, or a row somebody dragged.
 *
 * REVISION REQUIRED lives in the pending tray rather than a fourth one: it is a hunt still waiting
 * on a decision, and the Approval Status column right beside it says which kind of waiting.
 *
 * The backup never deletes a row it cannot account for. A hunt_id that has vanished from
 * HUNTING_DB keeps its place at the bottom of the tray it was last in — that orphan IS the backup
 * doing its job, and a reconciler that tidied it away would be the one bug that matters here. */

/* Hasib's workbook, 26 Aug. Overridable by Script Property so replacing the file is a property
 * edit, not a deploy. */
const HUNT_BACKUP_SS_DEFAULT = '14TbZlKmBHkawydJXjHif8xKCnYzA7-Wm-3rZOW8fBzI';
const HUNT_BACKUP_FP_PROP = 'HUNT_BACKUP_FP';          // last mirrored fingerprint of HUNTING_DB

/** Tab names verbatim as Hasib created them — 'Approved ' really does carry a trailing space, so
 * every lookup here matches on the trimmed name and never creates a second tab beside it. */
const HUNT_BACKUP_TABS = [
  { key: HUNT_PENDING, name: 'Pending For Approval' },
  { key: HUNT_APPROVED, name: 'Approved' },
  { key: HUNT_NOT_APPROVED, name: 'No Approved' },
];

// Same columns as HUNTING_DB, in the same order: the three portal keys, then the 38 hunting cols.
const HUNT_BACKUP_HEADERS = ['hunt_id', 'hunter_email', 'ts'].concat(HUNTING_COLS);
const HUNT_BACKUP_IMG = HUNT_BACKUP_HEADERS.indexOf(HC_IMAGE);              // written as a formula
const HUNT_BACKUP_IMG_SRC = HUNT_BACKUP_HEADERS.indexOf('Image Link');      // ...pointed at this one

function huntBackupBookId_() {
  return String(PropertiesService.getScriptProperties().getProperty('HUNT_BACKUP_SS_ID') ||
    HUNT_BACKUP_SS_DEFAULT);
}

function huntBackupBook_() { return SpreadsheetApp.openById(huntBackupBookId_()); }

/** Blank and REVISION REQUIRED both mean "no decision yet", so both land in the pending tray.
 * Everything the live sheet's seven spellings fold to APPROVED / NOT APPROVED lands in its own. */
function huntBackupBucket_(rawStatus) {
  const s = huntCanonStatus_(rawStatus);
  if (s === HUNT_APPROVED) return HUNT_APPROVED;
  if (s === HUNT_NOT_APPROVED) return HUNT_NOT_APPROVED;
  return HUNT_PENDING;
}

function huntBackupColA1_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/** The workbook's only formula. IFERROR because a blank or non-image link would otherwise leave
 * #VALUE! sitting in a backup, and a backup that looks broken stops being read. */
function huntBackupImage_(row) {
  return '=IFERROR(IMAGE($' + huntBackupColA1_(HUNT_BACKUP_IMG_SRC + 1) + row + '),"")';
}

function huntBackupTab_(ss, name) {
  const want = String(name).trim().toLowerCase();
  const sheets = ss.getSheets();
  let sh = null;
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === want) { sh = sheets[i]; break; }
  }
  if (!sh) sh = ss.insertSheet(name);
  huntBackupGrow_(sh, 1, HUNT_BACKUP_HEADERS.length);
  const head = sh.getRange(1, 1, 1, HUNT_BACKUP_HEADERS.length).getValues()[0]
    .map(function (h) { return String(h); });
  if (head.join('') !== HUNT_BACKUP_HEADERS.join('')) {
    sh.getRange(1, 1, 1, HUNT_BACKUP_HEADERS.length).setValues([HUNT_BACKUP_HEADERS]).setFontWeight('bold');
  }
  if (sh.getFrozenRows() < 1) sh.setFrozenRows(1);
  return sh;
}

function huntBackupGrow_(sh, rows, cols) {
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
}

function huntBackupRow_(rec, row) {
  return HUNT_BACKUP_HEADERS.map(function (h, i) {
    if (i === HUNT_BACKUP_IMG) return huntBackupImage_(row);
    const v = rec[h];
    return v === null || v === undefined ? '' : v;
  });
}

/** A record shaped like huntRecord_'s, built straight from what a handler already holds — so the
 * hot path never re-reads the row it just wrote. */
function huntBackupRecord_(huntId, hunterEmail, ts, cols) {
  const rec = { hunt_id: String(huntId || ''), hunter_email: String(hunterEmail || ''), ts: ts || '' };
  HUNTING_COLS.forEach(function (c) {
    const v = cols ? cols[c] : '';
    rec[c] = v === null || v === undefined ? '' : v;
  });
  return rec;
}

/* ------------------------------------------------------------------------------------------ */

/** The hot path: put ONE hunt where it belongs, and take it out of wherever it no longer belongs.
 * Never throws — a backup that could break a submission would be worse than no backup. */
function huntBackupUpsert_(rec) {
  /* 2 Sept: the hunt queue reads the ENGINE mirror now — every hunt mutation pushes its own
     row across immediately (best-effort; huntsDump/the fingerprint sweep catch any miss). */
  try {
    var hv = {};
    Object.keys(rec).forEach(function (k) { var x = rec[k]; hv[k] = (x instanceof Date) ? Utilities.formatDate(x, 'Etc/GMT', 'yyyy-MM-dd HH:mm:ss') : String(x == null ? '' : x); });
    enginePost_('syncHunts', { rows: [{ vals: hv }] });
  } catch (e) {}

  const id = rec ? String(rec.hunt_id || '').trim() : '';
  if (!id) return { ok: false, reason: 'no hunt_id' };
  try {
    const ss = huntBackupBook_();
    const target = huntBackupBucket_(rec[HC_APPROVAL]);
    const W = HUNT_BACKUP_HEADERS.length;
    let landed = '';
    HUNT_BACKUP_TABS.forEach(function (t) {
      const sh = huntBackupTab_(ss, t.name);
      const last = sh.getLastRow();
      const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
      const hits = [];
      ids.forEach(function (r, i) { if (String(r[0]).trim() === id) hits.push(i + 2); });
      if (t.key === target) {
        const row = hits.length ? hits[0] : sh.getLastRow() + 1;
        huntBackupGrow_(sh, row, W);
        sh.getRange(row, 1, 1, W).setValues([huntBackupRow_(rec, row)]);
        landed = t.name;
        // A duplicate can only sit BELOW the first hit, so deleting bottom-up leaves it in place.
        hits.slice(1).reverse().forEach(function (r) { sh.deleteRow(r); });
      } else {
        hits.reverse().forEach(function (r) { sh.deleteRow(r); });      // the decision moved it out
      }
    });
    return { ok: true, tab: landed };
  } catch (e) {
    logActivity_('system', 'HUNT_BACKUP_FAIL', id, '', '', String(e && e.message || e).slice(0, 300));
    return { ok: false, reason: String(e && e.message || e) };
  }
}

/* ------------------------------------------------------------------------------------------ */

/** The reconciler. Reads HUNTING_DB once, and when its fingerprint has not moved since the last
 * mirror it stops right there — the backup workbook is never even opened. Force with true to
 * rebuild regardless (a hand-edited tray, a restored file). */
function huntBackupSync(force) {
  let rows;
  try { rows = readTab_('HUNTING_DB'); }
  catch (e) {
    logActivity_('trigger', 'HUNT_BACKUP_FAIL', 'read', '', '', String(e && e.message || e).slice(0, 300));
    return 'HUNTING_DB unreadable: ' + String(e && e.message || e);
  }

  const live = [], byId = {}, print = [];
  rows.forEach(function (r) {
    const id = String(r.hunt_id || '').trim();
    if (!id || byId[id]) return;
    const rec = huntRecord_(r);
    byId[id] = rec;
    live.push(rec);
    print.push(HUNT_BACKUP_HEADERS.map(function (h) {
      return String(rec[h] === undefined ? '' : rec[h]);
    }).join(''));
  });

  /* A read that comes back empty is a fault, not a business event — a hundred hunts do not vanish
   * in five minutes. Rebuilding from it would blank the very thing this file exists to protect. */
  if (!live.length && !force) return 'HUNTING_DB read empty — backup left untouched';

  const props = PropertiesService.getScriptProperties();
  const fp = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, print.join(''), Utilities.Charset.UTF_8));
  /* A bumped format version has to reach a workbook that is otherwise sitting still, so it counts
   * as a reason to open the book — one property read, and cosmetics can never wait on a hunt. */
  const fmtStale = props.getProperty(HUNT_BACKUP_FMT_PROP) !== HUNT_BACKUP_FMT_VERSION;
  if (!force && !fmtStale && fp === props.getProperty(HUNT_BACKUP_FP_PROP)) {
    return 'unchanged (' + live.length + ' hunts)';
  }

  live.sort(function (a, b) { return String(a.ts).localeCompare(String(b.ts)); });
  const want = {};
  HUNT_BACKUP_TABS.forEach(function (t) { want[t.key] = []; });
  live.forEach(function (rec) { want[huntBackupBucket_(rec[HC_APPROVAL])].push(rec); });

  const W = HUNT_BACKUP_HEADERS.length;
  const out = { hunts: live.length, orphans: 0, tabs: {} };
  let ss;
  try { ss = huntBackupBook_(); }
  catch (e) {
    logActivity_('trigger', 'HUNT_BACKUP_FAIL', huntBackupBookId_(), '', '', String(e && e.message || e).slice(0, 300));
    return 'backup workbook unreachable: ' + String(e && e.message || e);
  }

  HUNT_BACKUP_TABS.forEach(function (t) {
    const sh = huntBackupTab_(ss, t.name);
    const last = sh.getLastRow();
    const have = last > 1 ? sh.getRange(2, 1, last - 1, W).getValues() : [];
    const block = want[t.key].map(function (rec, i) { return huntBackupRow_(rec, i + 2); });
    // Rows whose hunt is no longer in HUNTING_DB are kept, below the live ones. See the banner.
    have.forEach(function (row) {
      const id = String(row[0]).trim();
      if (!id || byId[id]) return;
      const copy = row.slice(0, W);
      while (copy.length < W) copy.push('');
      copy[HUNT_BACKUP_IMG] = huntBackupImage_(block.length + 2);
      block.push(copy);
      out.orphans++;
    });
    huntBackupGrow_(sh, block.length + 1, W);
    if (block.length) sh.getRange(2, 1, block.length, W).setValues(block);
    if (last > block.length + 1) sh.getRange(block.length + 2, 1, last - block.length - 1, W).clearContent();
    out.tabs[t.name] = block.length;
  });

  try { huntBackupFormat_(ss); } catch (e) { /* cosmetics never block the mirror */ }
  try { huntBackupStatus_(ss, out); } catch (e) { /* nor does the status page */ }

  props.setProperty(HUNT_BACKUP_FP_PROP, fp);
  logActivity_('trigger', 'HUNT_BACKUP_SYNC', huntBackupBookId_(), '', '',
    out.hunts + ' hunts · ' + JSON.stringify(out.tabs) + (out.orphans ? ' · ' + out.orphans + ' orphan' : ''));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

/** The page somebody opens to answer "is this thing still working?". Written only on a real
 * mirror, and it says so — a stamp that moved three days ago on a quiet week is the truth, and
 * pretending otherwise by touching it every five minutes would cost a workbook open each time. */
const HUNT_BACKUP_STATUS_TAB = 'Backup Status';

function huntBackupStatus_(ss, out) {
  let sh = null;
  const want = HUNT_BACKUP_STATUS_TAB.toLowerCase();
  ss.getSheets().forEach(function (s) { if (s.getName().trim().toLowerCase() === want) sh = s; });
  if (!sh) sh = ss.insertSheet(HUNT_BACKUP_STATUS_TAB, 0);
  const stamp = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd HH:mm') + ' PKT';
  const rows = [
    ['M98M — product hunting backup', ''],
    ['', ''],
    ['Last change mirrored', stamp],
    ['Products in the backup', out.hunts + out.orphans],
    ['', ''],
    ['Pending For Approval', out.tabs['Pending For Approval'] || 0],
    ['Approved', out.tabs['Approved'] || 0],
    ['No Approved', out.tabs['No Approved'] || 0],
    ['Kept after removal from the portal', out.orphans],
    ['', ''],
    ['Source', 'M98M Portal DB — HUNTING_DB tab'],
    ['', ''],
    ['How this stays current', ''],
    ['A product is written here the moment it is submitted, approved, not approved or sent back for revision.', ''],
    ['The portal also re-reads the whole hunting database every 5 minutes and repairs anything that drifted.', ''],
    ['The stamp above moves only when something actually changed — a quiet day is not a broken backup.', ''],
    ['Nothing is ever deleted here. A product removed from the portal keeps its row at the bottom of its tray.', ''],
    ['Do not rename the three tabs: the portal finds them by name.', ''],
  ];
  huntBackupGrow_(sh, rows.length, 2);
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  sh.getRange(3, 1, 7, 1).setFontWeight('bold');
  sh.getRange(13, 1).setFontWeight('bold');
  sh.setColumnWidth(1, 620);
  sh.setColumnWidth(2, 220);
  if (sh.getMaxRows() > rows.length) sh.getRange(rows.length + 1, 1, sh.getMaxRows() - rows.length, 2).clearContent();
  try { sh.setTabColor('#5f6368'); } catch (e) { /* older Sheets */ }
  return stamp;
}

/* ------------------------------------------------------------------------------------------ */

/** Widths, tab colours and a filter row — applied once and re-applied only when this version
 * string is bumped, because 41 setColumnWidth calls every five minutes would be absurd. */
const HUNT_BACKUP_FMT_VERSION = 'fmt-1';
const HUNT_BACKUP_FMT_PROP = 'HUNT_BACKUP_FMT';
const HUNT_BACKUP_WIDTHS = {
  'hunt_id': 95, 'hunter_email': 165, 'ts': 155, 'Selected By': 135, 'Approval Status': 125,
  'Comments': 230, 'Date Added': 105, 'Account Selected': 125, 'Listing Status': 105,
  'Seasonal': 85, 'Title': 280, 'IMAGE': 120, 'DESCRIPTION': 250, 'Category': 135,
  'Source Price': 95, 'E-Bey Caluclator + £4': 115, 'CPC Selling Chance': 140, 'Sell Through': 95,
  'Competitors': 105, 'TOP THREE SALES': 125, 'Total Competitors on main keyword': 150,
  'Price Range ANALYSIS': 140, 'Sold Unit ANALYSIS': 130, 'Our Profit': 95, 'ROI': 80,
  'Comment': 220, 'Comments given by': 140, 'Prime Competitor Selling Price': 150,
  'Competitor High Selling Price': 150, 'Campaign category': 140,
};
const HUNT_BACKUP_TAB_COLOURS = {
  'Pending For Approval': '#f9ab00',        // amber: somebody still owes this a decision
  'Approved': '#188038',
  'No Approved': '#c5221f',
};

function huntBackupFormat_(ss) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(HUNT_BACKUP_FMT_PROP) === HUNT_BACKUP_FMT_VERSION) return 'already ' + HUNT_BACKUP_FMT_VERSION;
  HUNT_BACKUP_TABS.forEach(function (t) {
    const sh = huntBackupTab_(ss, t.name);
    HUNT_BACKUP_HEADERS.forEach(function (h, i) {
      // Every link column shares one width; naming them all would be a list nobody maintains.
      const w = HUNT_BACKUP_WIDTHS[h] || 165;
      try { sh.setColumnWidth(i + 1, w); } catch (e) { /* a merged or protected column */ }
    });
    try { if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), HUNT_BACKUP_HEADERS.length).createFilter(); }
    catch (e) { /* a filter already exists, or the sheet is protected */ }
    try { sh.setTabColor(HUNT_BACKUP_TAB_COLOURS[t.name] || null); } catch (e) { /* older Sheets */ }
  });
  props.setProperty(HUNT_BACKUP_FMT_PROP, HUNT_BACKUP_FMT_VERSION);
  return 'applied ' + HUNT_BACKUP_FMT_VERSION;
}

/* ------------------------------------------------------------------------------------------ */

/** A backup nobody can restore is decoration. The three trays live in ONE Drive file, so a bad
 * edit inside it — a sort with the header row selected, a deleted tab — would take the copy with
 * it. Once a Pakistan day, a dated duplicate lands in the same owner-only folder the Portal DB
 * backups use, and prunes on the same 30-day clock.
 *
 * Day-gated by property rather than by trigger, so it does not matter which of the two callers
 * (nightlyBackup, or the hourly sweep) reaches it first — the second one is a no-op. */
const HUNT_BACKUP_COPY_DAY_PROP = 'HUNT_BACKUP_COPY_DAY';

function huntBackupDailyCopy_() {
  const props = PropertiesService.getScriptProperties();
  const day = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
  if (props.getProperty(HUNT_BACKUP_COPY_DAY_PROP) === day) return 'already copied ' + day;
  if (typeof backupFolder_ !== 'function') return 'backup folder helper absent';
  try {
    const folder = backupFolder_();
    const copy = DriveApp.getFileById(huntBackupBookId_())
      .makeCopy('Product Hunting Backup — ' + day, folder);
    props.setProperty(HUNT_BACKUP_COPY_DAY_PROP, day);
    if (typeof backupPrune_ === 'function') { try { backupPrune_(folder); } catch (e) { /* pruned next run */ } }
    logActivity_('backup', 'HUNT_BACKUP_COPY', copy.getId(), '', copy.getName(), day);
    return copy.getName();
  } catch (e) {
    logActivity_('backup', 'ERROR:huntBackupCopy', huntBackupBookId_(), '', '', String(e && e.message || e).slice(0, 300));
    return 'copy failed: ' + String(e && e.message || e);
  }
}
