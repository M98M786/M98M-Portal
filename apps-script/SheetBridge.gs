/** Phase 4 — THE SHEET CONTRACT. The only door between the portal and Hasib's live business
 * workbooks. Every column is addressed BY HEADER NAME, never by letter or index: the real
 * headers carry trailing spaces, embedded newlines and typos ('Perfomance', 'Costumer',
 * 'E-Bey Caluclator + £4', 'Suuplier 2'), the daily-tab Post-to block floats across 14
 * different column positions and is absent on 7 tabs, REPLACEMENT drops 'New Ali Link' so
 * everything from I shifts left, and PPC's 'Azhar Bhai' tab swaps Item ID and Campaign.
 * Structure is never changed: no column or tab is created, renamed, reordered or deleted;
 * a whitelisted header the sheet does not have is skipped and reported, never added.
 * Missing connection or missing tab degrades to { ok:false, reason:'not connected yet' } (§6). */

// §16.10 pilot gate. Until this CONFIG key is exactly 'true', no write leaves the portal:
// the intent is logged as SHADOW_WRITE and returned as wouldWrite. Reads are never gated.
const BRIDGE_WRITE_FLAG = 'pipeline_write_external';

// Tabs owned by the existing sync automation — readable, never writable (§6 sync discipline).
// Names verbatim from the live workbooks, including the missing S in 'INTRUCTION SHEET'.
const BRIDGE_SYNC_OWNED_TABS = ['SYNC_LOG', 'SYNC_PREVIEW', 'INTRUCTION SHEET', 'Ended Archive'];

const BRIDGE_SCAN_ROWS = 10;
const BRIDGE_DEFAULT_LIMIT = 200;
const BRIDGE_MAX_LIMIT = 2000;
const BRIDGE_PREVIEW_ROWS = 20;
const BRIDGE_MAX_CELL_CHARS = 5000;

let bridgeConnCache_ = null;
const bridgeSsCache_ = {};

// ---------- naming ----------
/** Header/tab-name equality for a business that types headers by hand. Lowercases, folds
 * newlines and non-breaking spaces, turns every punctuation mark into a space and collapses
 * runs, so 'E-Bey Caluclator + £4' and 'e bey caluclator + 4' are the same column while
 * 'Suuplier 2' and 'Supplier 2' stay different — typos are matched, not corrected. */
function bridgeNormalizeHeader_(s) {
  if (s === null || s === undefined) return '';
  // One fold does all of it: every non-alphanumeric run — spaces, newlines, non-breaking and
  // zero-width spaces, punctuation, £ and + — becomes a single space.
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function bridgeColLetter_(col) {
  let n = Number(col) || 0, out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Item IDs and order numbers live as text in some rows and as floats in others. */
function bridgeMatchKey_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return String(v.getTime());
  if (typeof v === 'number') {
    const s = String(v);
    return s.indexOf('e') < 0 && s.indexOf('E') < 0 ? s.replace(/\.0+$/, '') : v.toFixed(0);
  }
  return String(v).trim().toLowerCase();
}

// ---------- connections (§6) ----------
function bridgeOpenSs_(spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  if (!id) return null;
  if (bridgeSsCache_[id] !== undefined) return bridgeSsCache_[id];
  let ss = null;
  try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  bridgeSsCache_[id] = ss;
  return ss;
}

function bridgeConnections_() {
  if (!bridgeConnCache_) bridgeConnCache_ = readTab_('CONNECTIONS');
  return bridgeConnCache_;
}

/** '' when the sheet is not connected — never throws, never creates anything (§6).
 * Account names in the registry are honorific variants with trailing spaces ('Sir Hasib ',
 * 'AZHAR ABRT'); an exact normalized name wins, otherwise a UNIQUE containment match is
 * accepted and an ambiguous one resolves to nothing rather than to the wrong account. */
function bridgeResolveSheetId_(scope, accountName, sheetKind) {
  const sc = String(scope || '').trim();
  const kind = String(sheetKind || '').trim();
  if (sc !== 'account' && sc !== 'global') return '';
  const allowed = sc === 'account' ? ACCOUNT_SHEET_KINDS : GLOBAL_KINDS;
  if (allowed.indexOf(kind) < 0) return '';

  const want = bridgeNormalizeHeader_(accountName);
  const rows = bridgeConnections_().filter(function (r) {
    return String(r.scope || '').trim() === sc && String(r.sheet_kind || '').trim() === kind && String(r.spreadsheet_id || '').trim() !== '';
  });
  if (!rows.length) return '';
  if (sc === 'global') return String(rows[0].spreadsheet_id).trim();
  if (!want) return '';

  for (let i = 0; i < rows.length; i++) {
    if (bridgeNormalizeHeader_(rows[i].account_name) === want) return String(rows[i].spreadsheet_id).trim();
  }
  const near = rows.filter(function (r) {
    const have = bridgeNormalizeHeader_(r.account_name);
    return have !== '' && (have.indexOf(want) >= 0 || want.indexOf(have) >= 0);
  });
  return near.length === 1 ? String(near[0].spreadsheet_id).trim() : '';
}

// ---------- opening a tab ----------
/** Returns {ss, sheet, headerRowIndex, headerIndex, headers} or null. The header row is
 * FOUND, not assumed: 'UK Second Check' keeps its labels on row 1 and its account columns on
 * row 2, 'INTRUCTION SHEET' has its real headers on row 2, and Sales-Analysis dashboards put
 * tile labels on row 3. When the winning row sits below row 1, blank cells inherit the label
 * directly above so both header bands stay addressable. expectHeaders is optional and only
 * sharpens the scan. */
function bridgeOpenTab_(spreadsheetId, tabNameCandidates, expectHeaders) {
  const ss = bridgeOpenSs_(spreadsheetId);
  if (!ss) return null;
  const sheet = bridgePickSheet_(ss, tabNameCandidates);
  if (!sheet) return null;

  const lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return null;
  const scan = Math.min(BRIDGE_SCAN_ROWS, lastRow);
  const grid = sheet.getRange(1, 1, scan, lastCol).getValues();

  const want = {};
  (Array.isArray(expectHeaders) ? expectHeaders : []).forEach(function (h) {
    const n = bridgeNormalizeHeader_(h);
    if (n) want[n] = true;
  });

  let headerRowIndex = 0, best = 0;
  for (let r = 0; r < scan; r++) {
    let score = 0;
    for (let c = 0; c < lastCol; c++) {
      const v = grid[r][c];
      if (v === '' || v === null || v === undefined) continue;
      if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') continue;
      const n = bridgeNormalizeHeader_(v);
      if (!n || n.length > 120) continue;
      score += want[n] ? 12 : 1;
    }
    if (score > best) { best = score; headerRowIndex = r + 1; }
  }
  if (!headerRowIndex) return null;

  const headers = [];
  for (let c = 0; c < lastCol; c++) {
    let raw = grid[headerRowIndex - 1][c];
    if ((raw === '' || raw === null || raw === undefined) && headerRowIndex > 1) raw = grid[headerRowIndex - 2][c];
    if (raw instanceof Date || typeof raw === 'number' || typeof raw === 'boolean') raw = '';
    headers.push(raw === null || raw === undefined ? '' : String(raw));
  }

  const idx = bridgeIndexHeaders_(headers);
  return {
    ss: ss, sheet: sheet, headerRowIndex: headerRowIndex, headers: headers,
    headerIndex: idx.headerIndex, headerExactCols: idx.headerExactCols, headerNormCols: idx.headerNormCols,
  };
}

function bridgeIndexHeaders_(headers) {
  const headerIndex = {}, headerExactCols = {}, headerNormCols = {};
  headers.forEach(function (h, i) {
    const raw = String(h === null || h === undefined ? '' : h);
    const n = bridgeNormalizeHeader_(raw);
    if (!n) return;
    if (!headerExactCols[raw]) headerExactCols[raw] = [];
    headerExactCols[raw].push(i + 1);
    if (!headerNormCols[n]) headerNormCols[n] = [];
    headerNormCols[n].push(i + 1);
    if (headerIndex[n] === undefined) headerIndex[n] = i + 1;
  });
  return { headerIndex: headerIndex, headerExactCols: headerExactCols, headerNormCols: headerNormCols };
}

function bridgePickSheet_(ss, tabNameCandidates) {
  const sheets = ss.getSheets();
  const cands = [];
  const raw = Array.isArray(tabNameCandidates) ? tabNameCandidates : (tabNameCandidates ? [tabNameCandidates] : []);
  raw.forEach(function (c) {
    const n = bridgeNormalizeHeader_(c);
    if (n) cands.push(n);
  });
  if (!cands.length) {
    for (let i = 0; i < sheets.length; i++) if (!sheets[i].isSheetHidden()) return sheets[i];
    return null;
  }
  for (let ci = 0; ci < cands.length; ci++) {
    for (let i = 0; i < sheets.length; i++) {
      if (bridgeNormalizeHeader_(sheets[i].getName()) === cands[ci]) return sheets[i];
    }
  }
  // Excel truncates tab names at 31 chars ('Instructions Given By The Manag'), so a unique
  // containment match is accepted; two candidates matching means we pick neither.
  for (let ci = 0; ci < cands.length; ci++) {
    const hits = sheets.filter(function (s) {
      const have = bridgeNormalizeHeader_(s.getName());
      return have !== '' && (have.indexOf(cands[ci]) >= 0 || cands[ci].indexOf(have) >= 0);
    });
    if (hits.length === 1) return hits[0];
  }
  return null;
}

/** Column number, 0 when the sheet has no such header, -1 when the name is AMBIGUOUS. The daily
 * order tabs really do carry 'Order number' (eBay, col B) and 'Order Number' (AliExpress, col M),
 * and the competitor block repeats 'Edit Date ' three times: the header spelled exactly as the
 * sheet spells it wins, and anything that still resolves to two columns is refused rather than
 * guessed — guessing here writes a buyer's order number into the wrong column of a live sheet. */
function bridgeColumnFor_(open, headerName) {
  const raw = headerName === null || headerName === undefined ? '' : String(headerName);
  const exact = (open.headerExactCols || {})[raw];
  if (exact && exact.length === 1) return exact[0];
  if (exact && exact.length > 1) return -1;
  const n = bridgeNormalizeHeader_(raw);
  if (!n) return 0;
  const cols = (open.headerNormCols || {})[n] || [];
  if (cols.length > 1) return -1;
  return cols.length ? cols[0] : 0;
}

// ---------- read ----------
/** spec {scope, account, kind, tab:[candidates], limit, expect}. Records are keyed by the RAW
 * header exactly as the sheet spells it; unheaded columns (daily-tab col Q carrier notes,
 * blank A1 on four PPC tabs) survive under a positional 'col:<letter>' key so the portal never
 * summarises data away (§13.5) — those keys are readable only, writes are header-addressed.
 * Nothing here is role-filtered: pass the result through stripForRole_ before returning it. */
function bridgeReadRows_(spec) {
  spec = spec || {};
  const id = bridgeResolveSheetId_(spec.scope, spec.account, spec.kind);
  if (!id) return { ok: false, reason: 'not connected yet' };
  const open = bridgeOpenTab_(id, spec.tab, spec.expect);
  if (!open) return { ok: false, reason: 'not connected yet' };

  let limit = Number(spec.limit) || BRIDGE_DEFAULT_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > BRIDGE_MAX_LIMIT) limit = BRIDGE_MAX_LIMIT;

  const first = open.headerRowIndex + 1;
  const lastRow = open.sheet.getLastRow();
  const available = Math.max(0, lastRow - first + 1);
  const take = Math.min(limit, available);
  const rows = [];

  if (take > 0) {
    const tz = open.ss.getSpreadsheetTimeZone();
    const vals = open.sheet.getRange(first, 1, take, open.headers.length).getValues();
    vals.forEach(function (r, i) {
      if (r.join('') === '') return;
      const rec = { _row: first + i };
      open.headers.forEach(function (h, c) {
        let key = bridgeNormalizeHeader_(h) ? String(h) : 'col:' + bridgeColLetter_(c + 1);
        if (Object.prototype.hasOwnProperty.call(rec, key)) key = 'col:' + bridgeColLetter_(c + 1);
        rec[key] = bridgeCellOut_(r[c], tz);
      });
      rows.push(rec);
    });
  }

  return {
    ok: true, spreadsheetId: id, tab: open.sheet.getName(), headerRowIndex: open.headerRowIndex,
    headers: open.headers, rows: rows, count: rows.length, truncated: available > take,
  };
}

/** Dates render in the SOURCE workbook's timezone, not PKT: a cell is shown back exactly as the
 * sheet shows it. Portal-generated timestamps stay PKT via now_(). */
function bridgeCellOut_(v, tz) {
  if (v instanceof Date) {
    const stamp = Utilities.formatDate(v, tz || 'Asia/Karachi', 'yyyy-MM-dd HH:mm:ss');
    return stamp.indexOf(' 00:00:00') === stamp.length - 9 ? stamp.slice(0, 10) : stamp;
  }
  return v === null || v === undefined ? '' : v;
}

// ---------- write discipline (RL-6) ----------
function bridgeWriteEnabled_() {
  return String(getConfig(BRIDGE_WRITE_FLAG) || 'false') === 'true';
}

/** A value whose header is outside the workflow's whitelist THROWS — it never quietly lands. */
function bridgeAssertWhitelist_(values, whitelist) {
  const allow = {};
  (Array.isArray(whitelist) ? whitelist : []).forEach(function (h) {
    const n = bridgeNormalizeHeader_(h);
    if (n) allow[n] = true;
  });
  Object.keys(values || {}).forEach(function (k) {
    const n = bridgeNormalizeHeader_(k);
    if (!n || !allow[n]) throw new Error('write outside the column whitelist: ' + k);
  });
}

function bridgeAssertWritableTab_(tabName) {
  const name = String(tabName || '');
  if (name.charAt(0) === '_') throw new Error('sync-owned tab is read-only: ' + name);
  const n = bridgeNormalizeHeader_(name);
  for (let i = 0; i < BRIDGE_SYNC_OWNED_TABS.length; i++) {
    if (bridgeNormalizeHeader_(BRIDGE_SYNC_OWNED_TABS[i]) === n) throw new Error('sync-owned tab is read-only: ' + name);
  }
}

/** The portal writes values, never formulas: a leading '=' would put portal text into the
 * sheet's calculation layer (the phone column already shows what broken '=+44...' does). */
function bridgeCellIn_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'object') throw new Error('unsupported cell value');
  const s = String(v);
  if (s.charAt(0) === '=') throw new Error('formula values are never written to a business sheet');
  if (s.length > BRIDGE_MAX_CELL_CHARS) throw new Error('cell value too long');
  return s;
}

/** A whitelisted header the sheet does not carry is skipped and reported — never created. */
function bridgePlanCells_(open, values) {
  const cells = [], written = [], skippedMissing = [];
  Object.keys(values || {}).forEach(function (k) {
    const col = bridgeColumnFor_(open, k);
    if (col === -1) throw new Error('ambiguous header on this sheet: ' + k);
    if (!col) { skippedMissing.push(String(k)); return; }
    cells.push({ header: String(k), col: col, value: bridgeCellIn_(values[k]) });
    written.push(String(k));
  });
  return { cells: cells, written: written, skippedMissing: skippedMissing };
}

function bridgeShadow_(actor, id, tabName, rowLabel, values, plan) {
  logActivity_(actor || 'system', 'SHADOW_WRITE', id + '!' + tabName + '!' + rowLabel, '',
    bridgeJson_(values), 'would write ' + plan.written.join(' | ') + (plan.skippedMissing.length ? ' · missing ' + plan.skippedMissing.join(' | ') : ''));
  return {
    ok: true, shadow: true,
    wouldWrite: { spreadsheetId: id, tab: tabName, row: rowLabel, values: values, written: plan.written, skippedMissing: plan.skippedMissing },
  };
}

function bridgeJson_(o) {
  try { return JSON.stringify(o); } catch (e) { return String(o); }
}

// ---------- append ----------
function bridgeAppendRow_(spec, values, whitelist, actor) {
  spec = spec || {};
  values = values || {};
  bridgeAssertWhitelist_(values, whitelist);

  const id = bridgeResolveSheetId_(spec.scope, spec.account, spec.kind);
  if (!id) return { ok: false, reason: 'not connected yet' };
  const open = bridgeOpenTab_(id, spec.tab, spec.expect);
  if (!open) return { ok: false, reason: 'not connected yet' };
  const tabName = open.sheet.getName();
  bridgeAssertWritableTab_(tabName);

  const plan = bridgePlanCells_(open, values);
  if (!bridgeWriteEnabled_()) return bridgeShadow_(actor, id, tabName, 'APPEND', values, plan);

  let row = 0;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    row = Math.max(open.sheet.getLastRow(), open.headerRowIndex) + 1;
    plan.cells.forEach(function (c) { open.sheet.getRange(row, c.col).setValue(c.value); });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  plan.cells.forEach(function (c) {
    logActivity_(actor || 'system', 'SHEET_APPEND', id + '!' + tabName + '!' + bridgeColLetter_(c.col) + row, '', c.value, c.header);
  });
  return { ok: true, shadow: false, spreadsheetId: id, tab: tabName, row: row, written: plan.written, skippedMissing: plan.skippedMissing };
}

// ---------- update ----------
/** Matches by header value, not by position. Multi-line orders repeat the same order number on
 * consecutive rows, so an ambiguous match refuses to write and hands the rows back; spec.row
 * targets one of them explicitly. */
function bridgeUpdateRow_(spec, matchHeader, matchValue, values, whitelist, actor) {
  spec = spec || {};
  values = values || {};
  bridgeAssertWhitelist_(values, whitelist);

  const id = bridgeResolveSheetId_(spec.scope, spec.account, spec.kind);
  if (!id) return { ok: false, reason: 'not connected yet' };
  const open = bridgeOpenTab_(id, spec.tab, spec.expect);
  if (!open) return { ok: false, reason: 'not connected yet' };
  const tabName = open.sheet.getName();
  bridgeAssertWritableTab_(tabName);

  const matchCol = bridgeColumnFor_(open, matchHeader);
  if (matchCol === -1) return { ok: false, reason: 'ambiguous match column', match_header: String(matchHeader || '') };
  if (!matchCol) return { ok: false, reason: 'match column not on this sheet', match_header: String(matchHeader || '') };

  const plan = bridgePlanCells_(open, values);

  if (!bridgeWriteEnabled_()) {
    const preview = bridgeFindRow_(open, matchCol, matchValue, spec.row);
    if (!preview.ok) return preview;
    return bridgeShadow_(actor, id, tabName, String(preview.row), values, plan);
  }

  const lock = LockService.getScriptLock();
  const changed = [], unchanged = [], logs = [];
  let row = 0;
  try {
    lock.waitLock(10000);
    const hit = bridgeFindRow_(open, matchCol, matchValue, spec.row);
    if (!hit.ok) return hit;
    row = hit.row;
    plan.cells.forEach(function (c) {
      const cell = open.sheet.getRange(row, c.col);
      const old = cell.getValue();
      if (bridgeMatchKey_(old) === bridgeMatchKey_(c.value)) { unchanged.push(c.header); return; }
      cell.setValue(c.value);
      changed.push(c.header);
      logs.push({ col: c.col, header: c.header, old: old, val: c.value });
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  logs.forEach(function (l) {
    logActivity_(actor || 'system', 'SHEET_UPDATE', id + '!' + tabName + '!' + bridgeColLetter_(l.col) + row, l.old, l.val, l.header);
  });
  return {
    ok: true, shadow: false, spreadsheetId: id, tab: tabName, row: row,
    written: changed, unchanged: unchanged, skippedMissing: plan.skippedMissing,
  };
}

function bridgeFindRow_(open, matchCol, matchValue, forcedRow) {
  const first = open.headerRowIndex + 1;
  const lastRow = open.sheet.getLastRow();
  if (lastRow < first) return { ok: false, reason: 'row not found' };
  const key = bridgeMatchKey_(matchValue);
  if (!key) return { ok: false, reason: 'row not found' };

  const col = open.sheet.getRange(first, matchCol, lastRow - first + 1, 1).getValues();
  const hits = [];
  col.forEach(function (r, i) { if (bridgeMatchKey_(r[0]) === key) hits.push(first + i); });

  if (!hits.length) return { ok: false, reason: 'row not found' };
  const forced = Number(forcedRow) || 0;
  if (forced) {
    if (hits.indexOf(forced) < 0) return { ok: false, reason: 'row not found' };
    return { ok: true, row: forced };
  }
  if (hits.length > 1) return { ok: false, reason: 'ambiguous match', rows: hits };
  return { ok: true, row: hits[0] };
}

// ---------- §13.5 full-fidelity viewer ----------
/** Management-only preview of any connected workbook/tab: display values, so the viewer shows
 * every character as the sheet renders it. Columns are dropped, not blanked, when the role may
 * not see them (RL-4) — matched on normalized headers so 'Profit ' cannot slip through. */
function actionSheetPreview_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('management only');
  const scope = String(payload.scope || '').trim();
  const kind = String(payload.kind || '').trim();
  const account = String(payload.account || '').trim();
  if (scope !== 'account' && scope !== 'global') throw new Error('unknown scope');
  const allowed = scope === 'account' ? ACCOUNT_SHEET_KINDS : GLOBAL_KINDS;
  if (allowed.indexOf(kind) < 0) throw new Error('unknown sheet kind');

  const id = bridgeResolveSheetId_(scope, account, kind);
  if (!id) return { ok: false, reason: 'not connected yet' };
  const ss = bridgeOpenSs_(id);
  if (!ss) return { ok: false, reason: 'not connected yet' };

  const tabs = ss.getSheets().map(function (s) { return { name: s.getName(), hidden: s.isSheetHidden() }; });
  const open = bridgeOpenTab_(id, payload.tab ? [String(payload.tab)] : null);
  if (!open) return { ok: false, reason: 'not connected yet', tabs: tabs };

  const keep = bridgeVisibleCols_(open.headers, ctx.user.role, ctx.ident.email);
  const first = open.headerRowIndex + 1;
  const lastRow = open.sheet.getLastRow();
  const take = Math.min(BRIDGE_PREVIEW_ROWS, Math.max(0, lastRow - first + 1));
  let rows = [];
  if (take > 0) {
    const vals = open.sheet.getRange(first, 1, take, open.headers.length).getDisplayValues();
    rows = vals.map(function (r) { return keep.map(function (c) { return r[c]; }); });
  }

  logActivity_(ctx.ident.email, 'SHEET_PREVIEW', id + '!' + open.sheet.getName(), '', '', scope + '/' + (account || 'global') + '/' + kind);
  return {
    ok: true, spreadsheetId: id, tabs: tabs, tab: open.sheet.getName(), headerRowIndex: open.headerRowIndex,
    headers: keep.map(function (c) { return open.headers[c]; }),
    columns: keep.map(function (c) { return bridgeColLetter_(c + 1); }),
    rows: rows, firstDataRow: first, totalRows: Math.max(0, lastRow - first + 1),
  };
}

function bridgeVisibleCols_(headers, role, email) {
  const probe = {};
  const keys = headers.map(function (h, i) {
    const raw = h === null || h === undefined ? '' : String(h);
    const key = bridgeNormalizeHeader_(raw) ? raw : 'col:' + bridgeColLetter_(i + 1);
    probe[key] = 1;
    return key;
  });
  const kept = stripForRole_(probe, role, email) || {};
  const denied = {};
  if (!canSeeProfit_(role)) PROFIT_FIELDS.forEach(function (f) { denied[bridgeNormalizeHeader_(f)] = true; });
  if (!(role === 'CS' || role === 'Order Processor' || isMgmt_(role, email))) PII_FIELDS.forEach(function (f) { denied[bridgeNormalizeHeader_(f)] = true; });

  const out = [];
  keys.forEach(function (k, i) {
    if (!Object.prototype.hasOwnProperty.call(kept, k)) return;
    if (denied[bridgeNormalizeHeader_(k)]) return;
    out.push(i);
  });
  return out;
}

// ---------- self-test ----------
/** Header matching checked against the strings that actually exist in Hasib's workbooks. */
function bridgeSelfTest_() {
  const results = [];
  function same(name, a, b) {
    const x = bridgeNormalizeHeader_(a), y = bridgeNormalizeHeader_(b);
    results.push({ check: name, ok: x === y && x !== '', got: x, want: y });
  }
  function differs(name, a, b) {
    const x = bridgeNormalizeHeader_(a), y = bridgeNormalizeHeader_(b);
    results.push({ check: name, ok: x !== y, got: x, want: 'not ' + y });
  }
  function is(name, a, want) {
    const x = bridgeNormalizeHeader_(a);
    results.push({ check: name, ok: x === want, got: x, want: want });
  }
  function throws(name, fn) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    results.push({ check: name, ok: threw, got: threw ? 'threw' : 'no throw', want: 'threw' });
  }
  function ok(name, cond, got, want) {
    results.push({ check: name, ok: !!cond, got: String(got), want: String(want) });
  }

  same('E-Bey Caluclator + £4 ≡ e bey caluclator + 4', 'E-Bey Caluclator + £4', 'e bey caluclator + 4');
  is('E-Bey Caluclator + £4 normalizes', 'E-Bey Caluclator + £4', 'e bey caluclator 4');
  same('trailing space header', 'Profit ', 'Profit');
  same('double space + trailing', 'Sold Unit  ANALYSIS   ', 'sold unit analysis');
  same('embedded newlines', 'Product Link 1 Main supplier\n\n\nAdded in supplier sheet', 'Product Link 1 Main supplier Added in supplier sheet');
  same('non-breaking space', 'Order' + String.fromCharCode(160) + 'Earning', 'Order Earning');
  same('paren spacing', 'Past behaviour(7 days)', 'Past behaviour (7 days)');
  same('tab name trailing space', 'Sir Hasib ', 'sir hasib');
  same('misspelled tab kept as-is', 'INTRUCTION SHEET', 'intruction sheet');
  same('Costumer Service typo', 'Costumer Service ', 'costumer service');
  same('double space in tab name', 'Hamza-  Competitior List', 'hamza competitior list');
  same('emoji tab name', '📊 Dashboard', 'Dashboard');
  same('ampersand folds', 'Hamza-Keyword&Title', 'hamza keyword title');
  differs('Perfomance is not Performance', 'Perfomance', 'Performance');
  differs('Suuplier 2 is not Supplier 2', 'Suuplier 2', 'Supplier 2');
  differs('Ali Express Link is not AliExpress Link', 'Ali Express Link ', 'AliExpress Link');
  differs('Profit is not Our Profit', 'Profit ', 'Our Profit');
  differs('Image Link is not Image Link 1', 'Image Link ', 'Main Image Link 1');
  differs('short competitor header is not the real one', 'Total Competitors on main keyword', "Total Competitors on main keyword's search bar");
  is('blank header stays blank', '   ', '');

  ok('column letter BE', bridgeColLetter_(57) === 'BE', bridgeColLetter_(57), 'BE');
  ok('column letter AM', bridgeColLetter_(39) === 'AM', bridgeColLetter_(39), 'AM');
  ok('float item id matches text', bridgeMatchKey_(136880901903) === bridgeMatchKey_('136880901903'), bridgeMatchKey_(136880901903), '136880901903');
  ok('order id with trailing newline matches', bridgeMatchKey_('15-14796-52804\n') === bridgeMatchKey_('15-14796-52804'), bridgeMatchKey_('15-14796-52804\n'), '15-14796-52804');

  const probe = bridgeIndexHeaders_(['Order number', 'Cost ', 'Order Number', 'Edit Date ', 'Sale Price', 'Edit Date ']);
  ok('eBay Order number resolves to col B', bridgeColumnFor_(probe, 'Order number') === 1, bridgeColumnFor_(probe, 'Order number'), 1);
  ok('AliExpress Order Number resolves to its own column', bridgeColumnFor_(probe, 'Order Number') === 3, bridgeColumnFor_(probe, 'Order Number'), 3);
  ok('case-blind duplicate is refused', bridgeColumnFor_(probe, 'order number') === -1, bridgeColumnFor_(probe, 'order number'), -1);
  ok('repeated identical header is refused', bridgeColumnFor_(probe, 'Edit Date ') === -1, bridgeColumnFor_(probe, 'Edit Date '), -1);
  ok('unique header still matches loosely', bridgeColumnFor_(probe, 'cost') === 2, bridgeColumnFor_(probe, 'cost'), 2);
  ok('absent header reports missing', bridgeColumnFor_(probe, 'Tracking number') === 0, bridgeColumnFor_(probe, 'Tracking number'), 0);
  throws('ambiguous header never writes', function () { bridgePlanCells_(probe, { 'Edit Date ': '1' }); });

  bridgeAssertWhitelist_({ 'Cost ': 1 }, ['Cost']);
  results.push({ check: 'whitelist matches trailing-space header', ok: true, got: 'accepted', want: 'accepted' });
  throws('out-of-whitelist write throws', function () { bridgeAssertWhitelist_({ 'Profit ': 1 }, ['Cost ', 'Tracking number']); });
  throws('sync-owned tab refuses writes', function () { bridgeAssertWritableTab_('INTRUCTION SHEET'); });
  throws('underscore tab refuses writes', function () { bridgeAssertWritableTab_('_OrderItems'); });
  throws('formula value refused', function () { bridgeCellIn_('=SUM(A1:A2)'); });
  bridgeAssertWritableTab_('1 July');
  results.push({ check: 'daily order tab is writable', ok: true, got: 'accepted', want: 'accepted' });

  const fail = results.filter(function (r) { return !r.ok; });
  return { ok: fail.length === 0, pass: results.length - fail.length, fail: fail.length, failed: fail, results: results };
}

const ACTIONS_BRIDGE = {
  sheetPreview: [actionSheetPreview_, 'any'],   // gated to Management inside, like listPending
};
