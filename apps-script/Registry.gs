/** §6 — CONNECTIONS import from Hasib's "Central Sheets" registry spreadsheet.
 * Reality (verified 8 Aug 2026): 5 of 6 tabs are `Name | Sheet Link` (with trailing spaces
 * in headers); "Staff Sheets" is a staff→email registry, NOT links — skipped here.
 * Missing links (Sir Hasib order/sales/report, Azhar Bhai order-processing) surface as
 * "not connected yet" — never errors. */

const REGISTRY_TAB_KINDS = {
  'Account Management Sheets': { scope: 'account', kind: 'central' },
  'Order Processing Sheets':   { scope: 'account', kind: 'order_processing' },
  'Sales Analysis Sheets':     { scope: 'account', kind: 'sales_analysis' },
  'Daily Account Report Sheets': { scope: 'account', kind: 'account_report' },
  'Staff Working Sheets':      { scope: 'global', kind: null }, // kind inferred per row name
};
const GLOBAL_NAME_HINTS = [
  // Spellings verified against the live registry 8 Aug 2026 ("Perfomance", "Costumer").
  [/ppc|advertis/i, 'ppc'], [/potential/i, 'potential_cpc'], [/hunt/i, 'hunting'],
  [/recheck|order check/i, 'order_recheck'], [/wrong/i, 'wrong_orders'],
  [/c[ou]st[ou]mer service|(^|\s)cs(\s|$)/i, 'cs'], [/return|refund/i, 'returns'],
  [/^staff.*perfo?r?mance/i, 'staff_perf'], [/email/i, 'staff_email'], [/learning/i, 'account_learnings'],
];

function importRegistry(registrySpreadsheetId, actor) {
  if (!registrySpreadsheetId) throw new Error('registryId required');
  const reg = SpreadsheetApp.openById(registrySpreadsheetId);
  const db = getPortalDb_(false);
  const conn = db.getSheetByName('CONNECTIONS');
  const existing = {};                                    // key scope|account|kind → row #
  const rows = conn.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) existing[rows[i][1] + '|' + rows[i][2] + '|' + rows[i][3]] = i + 1;

  // The registry itself is a global connection.
  upsert_(conn, existing, 'global', '', 'registry', registrySpreadsheetId, 'linked', 'Central Sheets registry');

  let imported = 0, skipped = [];
  reg.getSheets().forEach(function(sh) {
    const tab = sh.getName().trim();
    const map = REGISTRY_TAB_KINDS[tab];
    if (!map) { if (tab !== 'Staff Sheets') skipped.push(tab); return; }
    sh.getDataRange().getValues().slice(1).forEach(function(r) {
      const name = String(r[0] || '').trim();
      const link = String(r[1] || '').trim();
      if (!name) return;
      const id = extractSheetId_(link);
      const kind = map.kind || inferGlobalKind_(name);
      if (!kind) { skipped.push(tab + ':' + name); return; }
      const scope = map.scope;
      const account = scope === 'account' ? name : '';
      upsert_(conn, existing, scope, account, kind, id, id ? 'linked' : 'not connected yet', name);
      imported++;
    });
  });
  logActivity_(actor || 'system', 'importRegistry', registrySpreadsheetId, '', '', 'imported ' + imported + ' skipped ' + skipped.join('; '));
  return { imported: imported, skipped: skipped, health: connectionHealth() };
}

function upsert_(conn, existing, scope, account, kind, id, status, notes) {
  const key = scope + '|' + account + '|' + kind;
  const row = ['C' + Utilities.getUuid().slice(0, 8), scope, account, kind, id || '', status, notes || ''];
  if (existing[key]) {
    const keep = conn.getRange(existing[key], 1, 1, 7).getValues()[0];
    row[0] = keep[0];
    if (String(keep[4]) !== String(id || '')) logActivity_('registry', 'CONNECTION_CHANGE', key, keep[4], id || '', notes || '');
    conn.getRange(existing[key], 1, 1, 7).setValues([row]);
  } else {
    conn.appendRow(row);
    existing[key] = conn.getLastRow();
  }
}
function extractSheetId_(url) {
  const m = String(url || '').match(/\/d\/([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : '';
}
function inferGlobalKind_(name) {
  for (let i = 0; i < GLOBAL_NAME_HINTS.length; i++) if (GLOBAL_NAME_HINTS[i][0].test(name)) return GLOBAL_NAME_HINTS[i][1];
  return null;
}

/* 25 Aug — Sir Hasib's order-processing book was never in the registry, so CONNECTIONS had no
   order_processing row for him and the Ali sweep had nothing to read. Every one of his 299 orders
   since the account went live carried no AliExpress number and no link, while the four connected
   accounts sat at 97-99% coverage. Verified before linking: the book's "25 August" tab carries the
   standard header shape and its first order, 15-15067-04501, is Sir Hasib's own row in D1.

   Deliberately NOT importRegistry(). A full re-import rewrites every CONNECTIONS row from the
   registry, and at least one row here was corrected by hand and never pushed back to the registry
   (Azhar Bhai's account_report was repointed off a blank book). Re-importing would revert that
   silently. So this writes the ONE row that is missing, and also fills the registry so a future
   import agrees with us instead of undoing us. */
const PENDING_SHEET_LINKS = [
  { account: 'Sir Hasib', kind: 'order_processing', registryTab: 'Order Processing Sheets',
    id: '1MJK7wt3r3w-7JCCZjaSGxU23ZftbqerS7LlKAk-qwmQ', note: 'Sir Hasib' },
];

/* One-shot: put Ubaid on the new Sales Operations department (26 Aug, owner request). Role
   changes normally require a super admin through updateStaff; this is the maintenance path, run
   server-side and key-gated via ENGINE_RUNNABLE. It writes ONE cell — the role — after checking
   the target exists and the role is valid, and refuses to touch a super admin. Idempotent. */
function setSalesOpsRole() {
  const TARGET = 'm98mthree@gmail.com';   // Ubaid Kaleem
  const ROLE = 'Sales Operations';
  if (ROLES.indexOf(ROLE) < 0) return 'ABORT: ' + ROLE + ' is not in ROLES — deploy Config first';
  const sh = getPortalDb_(false).getSheetByName('USERS');
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(function (h) { return String(h); });
  const emailCol = head.indexOf('email'), roleCol = head.indexOf('role');
  if (emailCol < 0 || roleCol < 0) return 'ABORT: USERS is missing email/role columns';
  for (let i = 1; i < vals.length; i++) {
    if (normalizeEmail(vals[i][emailCol]) !== normalizeEmail(TARGET)) continue;
    if (isSuperAdmin(vals[i][emailCol])) return 'REFUSED: target is a super admin';
    const before = String(vals[i][roleCol] || '');
    if (before === ROLE) return 'already ' + ROLE;
    sh.getRange(i + 1, roleCol + 1).setValue(ROLE);
    logActivity_('system', 'ROLE_SET', TARGET, before, ROLE, 'Sales Operations department');
    return 'set ' + TARGET + ': ' + before + ' -> ' + ROLE;
  }
  return 'ABORT: ' + TARGET + ' not found in USERS';
}

/* One-shot: free up Yousaf's email (26 Aug, owner request — "remove Yousaf from his role and
   make it a free email"). Deactivates the account so it holds no role and cannot sign in, and
   renames it so the directory reads plainly that this address is now spare, matching the other
   free-email accounts in the roster. Idempotent; refuses a super admin. */
function freeYousafEmail() {
  const TARGET = 'm98mseven@gmail.com';   // Yousaf Bhai
  const sh = getPortalDb_(false).getSheetByName('USERS');
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(function (h) { return String(h); });
  const c = {};
  ['email', 'name', 'role', 'status', 'deactivated_at', 'notes'].forEach(function (k) { c[k] = head.indexOf(k); });
  if (c.email < 0 || c.status < 0) return 'ABORT: USERS missing columns';
  for (let i = 1; i < vals.length; i++) {
    if (normalizeEmail(vals[i][c.email]) !== normalizeEmail(TARGET)) continue;
    if (isSuperAdmin(vals[i][c.email])) return 'REFUSED: target is a super admin';
    const beforeRole = String(vals[i][c.role] || ''), beforeStatus = String(vals[i][c.status] || '');
    if (beforeStatus === SADM_STATUS_DISABLED && String(vals[i][c.name] || '').indexOf('Free Email') >= 0) return 'already freed';
    const row = i + 1;
    sh.getRange(row, c.status + 1).setValue(SADM_STATUS_DISABLED);
    if (c.deactivated_at >= 0) sh.getRange(row, c.deactivated_at + 1).setValue(now_());
    if (c.name >= 0) sh.getRange(row, c.name + 1).setValue('Yousaf Free Email');
    if (c.role >= 0) sh.getRange(row, c.role + 1).setValue('');
    if (c.notes >= 0) sh.getRange(row, c.notes + 1).setValue('Freed 26 Aug by owner request (was ' + beforeRole + ').');
    logActivity_('system', 'STAFF_FREED', TARGET, beforeRole + '|' + beforeStatus, 'disabled|free email', 'owner request');
    return 'freed ' + TARGET + ' (was ' + beforeRole + '/' + beforeStatus + ')';
  }
  return 'ABORT: ' + TARGET + ' not found';
}

function connectPendingSheets() {
  const out = [];
  const db = getPortalDb_(false);
  const conn = db.getSheetByName('CONNECTIONS');
  const rows = conn.getDataRange().getValues();
  const existing = {};
  for (let i = 1; i < rows.length; i++) existing[rows[i][1] + '|' + rows[i][2] + '|' + rows[i][3]] = i + 1;

  let regId = '';
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === 'global' && String(rows[i][3]) === 'registry') { regId = String(rows[i][4] || ''); break; }
  }

  PENDING_SHEET_LINKS.forEach(function (p) {
    const key = 'account|' + p.account + '|' + p.kind;
    const before = existing[key] ? String(conn.getRange(existing[key], 5).getValue() || '') : '';
    if (before && before !== p.id) {                      // never silently repoint a live link
      out.push('SKIP ' + key + ' — already points at ' + before);
      return;
    }
    upsert_(conn, existing, 'account', p.account, p.kind, p.id, 'linked', p.note || p.account);
    out.push('linked ' + key + ' -> ' + p.id);

    if (regId && p.registryTab) {
      try {
        const sh = SpreadsheetApp.openById(regId).getSheetByName(p.registryTab);
        if (!sh) { out.push('registry tab missing: ' + p.registryTab); return; }
        const v = sh.getDataRange().getValues();
        const url = 'https://docs.google.com/spreadsheets/d/' + p.id + '/edit';
        let at = -1;
        for (let i = 1; i < v.length; i++) {
          if (String(v[i][0] || '').trim().toLowerCase() === p.account.toLowerCase()) { at = i + 1; break; }
        }
        if (at > 0) {
          if (String(v[at - 1][1] || '').trim()) { out.push('registry already had a link for ' + p.account + ' — left alone'); }
          else { sh.getRange(at, 2).setValue(url); out.push('registry row ' + at + ' filled'); }
        } else {
          sh.appendRow([p.account, url]);
          out.push('registry row appended for ' + p.account);
        }
      } catch (e) { out.push('registry write failed: ' + String(e && e.message || e).slice(0, 80)); }
    }
  });

  const msg = out.join(' | ');
  logActivity_('system', 'CONNECT_PENDING', '', '', '', msg.slice(0, 400));
  return msg;
}

/** §6 checklist: per active account ×4, globals ×11. Missing = "not connected yet". */
function connectionHealth() {
  const rows = getPortalDb_(false).getSheetByName('CONNECTIONS').getDataRange().getValues().slice(1);
  const byKey = {};
  const accounts = {};
  rows.forEach(function(r) {
    byKey[r[1] + '|' + r[2] + '|' + r[3]] = { id: r[4], status: r[5] };
    if (r[1] === 'account' && r[2]) accounts[r[2]] = true;
  });
  const perAccount = Object.keys(accounts).sort().map(function(a) {
    const items = ACCOUNT_SHEET_KINDS.map(function(k) {
      const hit = byKey['account|' + a + '|' + k];
      return { kind: k, status: hit && hit.id ? 'linked' : 'not connected yet' };
    });
    return { account: a, linked: items.filter(function(x){ return x.status === 'linked'; }).length, of: ACCOUNT_SHEET_KINDS.length, items: items };
  });
  const globals = GLOBAL_KINDS.map(function(k) {
    const hit = byKey['global||' + k];
    return { kind: k, status: hit && hit.id ? 'linked' : 'not connected yet' };
  });
  return { perAccount: perAccount, globals: globals,
    globalsLinked: globals.filter(function(g){ return g.status === 'linked'; }).length, globalsOf: GLOBAL_KINDS.length };
}

/** 26 Aug one-shot: two synthetic SELFTEST rows sit in TASKS and pollute the Listing pending
 * count on every board. Deletes rows — bottom-up so indexes hold — whose task_id, title, details
 * or assigned_by carries 'selftest' (case-blind). Portal-owned data only; returns what it
 * removed so the run is auditable. Idempotent: a second run finds nothing. */
function purgeSelfTestTasks() {
  const sh = getPortalDb_(false).getSheetByName('TASKS');
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const idx = {};
  head.forEach(function (h, i) { idx[h] = i; });
  const last = sh.getLastRow();
  if (last < 2) return 'TASKS is empty';
  const data = sh.getRange(2, 1, last - 1, head.length).getValues();
  const hits = [];
  data.forEach(function (r, i) {
    /* Only rows that ARE the synthetic artifact: id or title STARTING with the marker, or a
       synthetic assigner. A real task that merely mentions "self-test" in its details (the
       codebase's own vocabulary — bridgeSelfTest_, cpcSelfTest_) must never be deleted. */
    const id = String(idx.task_id === undefined ? '' : r[idx.task_id] || '').toLowerCase();
    const title = String(idx.title === undefined ? '' : r[idx.title] || '').toLowerCase();
    const by = String(idx.assigned_by === undefined ? '' : r[idx.assigned_by] || '').toLowerCase();
    if (/^self[- ]?test/.test(id) || /^self[- ]?test/.test(title) || /^self[- ]?test/.test(by)) {
      hits.push({ row: i + 2, id: String(r[idx.task_id] || ''), title: String(r[idx.title] || '').slice(0, 60) });
    }
  });
  if (!hits.length) return 'no SELFTEST rows found';
  hits.slice().reverse().forEach(function (h) { sh.deleteRow(h.row); });
  logActivity_('system', 'SELFTEST_PURGE', 'TASKS', '', String(hits.length) + ' row(s)',
    hits.map(function (h) { return h.id + ' ' + h.title; }).join(' | ').slice(0, 300));
  return 'deleted ' + hits.length + ' row(s): ' + hits.map(function (h) { return h.id + ' "' + h.title + '"'; }).join(', ');
}


/** 28 Aug one-shot: the pipeline's Approved tray still carried a synthetic SELFTEST hunt
 * (the TASKS purge could not reach HUNTING_DB). Deletes rows whose hunt_id or Title starts
 * with the marker, bottom-up. Portal-owned rows only; the backup workbook keeps its history. */
function purgeSelfTestHunts() {
  const sh = getPortalDb_(false).getSheetByName('HUNTING_DB');
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const iId = head.indexOf('hunt_id'), iTitle = head.indexOf('Title');
  const last = sh.getLastRow();
  if (last < 2) return 'HUNTING_DB is empty';
  const data = sh.getRange(2, 1, last - 1, head.length).getValues();
  const hits = [];
  data.forEach(function (r, i) {
    const id = String(iId >= 0 ? r[iId] || '' : '').toLowerCase();
    const title = String(iTitle >= 0 ? r[iTitle] || '' : '').toLowerCase();
    if (/^self[- ]?test/.test(id) || /^self[- ]?test/.test(title)) {
      hits.push({ row: i + 2, id: String(r[iId] || ''), title: String(r[iTitle] || '').slice(0, 50) });
    }
  });
  if (!hits.length) return 'no SELFTEST hunts found';
  hits.slice().reverse().forEach(function (h) { sh.deleteRow(h.row); });
  logActivity_('system', 'SELFTEST_HUNT_PURGE', 'HUNTING_DB', '', String(hits.length) + ' row(s)',
    hits.map(function (h) { return h.id + ' ' + h.title; }).join(' | ').slice(0, 300));
  return 'deleted ' + hits.length + ' hunt row(s): ' + hits.map(function (h) { return h.id; }).join(', ');
}

/** 28 Aug (owner: "trackings & order cost from portal not automatically getting updated in
 * sheets"). Two relay-runnable helpers: the STATUS one shows the write gate and the last
 * recorded write attempts (shadow vs real), so the diagnosis is a fact, not a guess; the
 * ENABLE one flips §16.10 live writing on with the full receipt setExternalWrites keeps. */
function sheetWritesStatus() {
  const flag = String(getConfig('pipeline_write_external') || '(unset)');
  const rows = readTab_('ACTIVITY_LOG');
  const recent = [];
  for (let i = rows.length - 1; i >= 0 && recent.length < 12; i--) {
    const a = String(rows[i].action || '');
    if (a === 'SHADOW_WRITE' || a === 'SHEET_UPDATE' || a === 'SHEET_APPEND' ||
        a.indexOf('RECORD_PURCHASE') === 0 || a.indexOf('RECORD_TRACKING') === 0) {
      recent.push(String(rows[i].ts).slice(5, 16) + ' ' + a + ' ' + String(rows[i].target).slice(0, 40) +
        ' = ' + String(rows[i].new_value).slice(0, 30) + ' by ' + String(rows[i].actor).split('@')[0]);
    }
  }
  return 'pipeline_write_external=' + flag + ' | last write events (newest first): ' +
    (recent.length ? recent.join(' ;; ') : 'none found');
}

function enableSheetWrites() {
  return String(setExternalWrites(true, 'owner order 28 Aug — portal writes must land in sheets'));
}

/* ---------- 29 Aug: mirror queue + instant task push ----------
   Owner: "products are not getting approved timely, and not updating tasks timely."
   Two causes, one deploy:
   1. A hunt decision carried THREE live-workbook round-trips inline (hunting sheet, backup
      workbook, central sheet) since writes went live — 20-50s per approval at peak, eating
      execution slots. Those mirrors now QUEUE (AGENT_QUEUE) and flush on the hourly ride or
      the runnable — the decision itself returns in seconds, the workbooks catch up minutes
      later, and a flush failure is a logged row, never a lost decision (HUNTING_DB is the
      source of truth the flush re-reads).
   2. Task boards read the engine mirror, which refreshed only hourly — so a new task or a
      status change took up to an hour to appear. engineTaskPush_ sends THAT ONE ROW to the
      engine (~300ms, fire-and-log) the moment it changes; boards see it on their next 20s tick. */

function mirrorEnqueue_(kind, payload) {
  try {
    getPortalDb_(false).getSheetByName('AGENT_QUEUE').appendRow([
      'Q' + Utilities.getUuid().slice(0, 8), kind, JSON.stringify(payload).slice(0, 4000),
      '', now_(), '', '', '', '']);
  } catch (e) {
    logActivity_('system', 'MIRROR_ENQUEUE_FAIL', kind, '', '', String(e && e.message || e).slice(0, 140));
  }
}

function engineTaskPush_(taskId) {
  try {
    const t = readTab_('TASKS').filter(function (r) { return String(r.task_id) === String(taskId); })[0];
    if (!t) return;
    enginePost_('syncTasks', { tasks: [t] });
  } catch (e) {
    logActivity_('system', 'ENGINE_TASK_PUSH_FAIL', String(taskId), '', '', String(e && e.message || e).slice(0, 120));
  }
}

/** Flush queued hunt-decision mirrors, oldest first, inside a time budget. Each queue row only
 * names the hunt — the values written come FRESH from HUNTING_DB, so a stale intent can never
 * overwrite a newer state. One failure marks that row and moves on. */
function flushMirrorQueue() {
  const sh = getPortalDb_(false).getSheetByName('AGENT_QUEUE');
  const last = sh.getLastRow();
  if (last < 2) return 'queue empty';
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const iKind = head.indexOf('kind'), iPay = head.indexOf('payload'), iStatus = head.indexOf('status'),
        iDone = head.indexOf('done_at'), iErr = head.indexOf('error');
  const data = sh.getRange(2, 1, last - 1, head.length).getValues();
  const t0 = Date.now();
  let done = 0, failed = 0, pending = 0;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][iKind]) !== 'hunt_decision' || String(data[i][iStatus])) continue;
    if (Date.now() - t0 > 90000) { pending++; continue; }        // 90s budget (30 Aug: shorter slots under load) — the rest next run
    const row = i + 2;
    try {
      const p = JSON.parse(String(data[i][iPay] || '{}'));
      const found = huntFind_(huntSheet_(), p.hunt_id);
      const rec = huntRecord_(found.rec);
      huntMirrorDecision_(rec, rec.approval_status, String(rec[HC_COMMENTS] || ''),
        String(rec[HC_ACCOUNT] || ''), String(rec[HC_CPC] || ''), String(p.actor || 'queue'));
      if (typeof huntBackupUpsert_ === 'function') huntBackupUpsert_(rec);
      if (p.approving && p.limited) huntCopyToCentral_(String(rec[HC_ACCOUNT] || ''), p.limited, String(p.actor || 'queue'));
      sh.getRange(row, iStatus + 1).setValue('done');
      sh.getRange(row, iDone + 1).setValue(now_());
      done++;
    } catch (e) {
      sh.getRange(row, iStatus + 1).setValue('error');
      sh.getRange(row, iErr + 1).setValue(String(e && e.message || e).slice(0, 200));
      failed++;
    }
  }
  const msg = 'mirrors flushed: ' + done + ' done, ' + failed + ' failed, ' + pending + ' left for next run';
  if (done || failed) logActivity_('system', 'MIRROR_FLUSH', 'hunt_decision', '', String(done), msg);
  return msg;
}

/** 29 Aug one-shot: replay the shadow-era order writes. Before live writing was switched on,
 * every Cost / Ali order number / tracking the processors typed was logged as SHADOW_WRITE and
 * never reached the day tabs. This walks those log rows (order books only, last 3 days),
 * and fills each captured value into its exact cell ONLY IF that cell is still blank — a value
 * someone has since re-entered, or that changed, is never touched. Idempotent; returns counts. */
function replayShadowOrders() {
  const cutoff = new Date(Date.now() - 3 * 86400000);
  const books = {};
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.sheet_kind) === 'order_processing' && String(c.status || '').toLowerCase() !== 'off') {
      books[String(c.spreadsheet_id)] = String(c.account_name);
    }
  });
  const t0 = Date.now();
  let filled = 0, skippedHasValue = 0, rowsSeen = 0, errors = 0;
  const opened = {};
  const perAccount = {};
  readTab_('ACTIVITY_LOG').forEach(function (r) {
    if (String(r.action) !== 'SHADOW_WRITE') return;
    const ts = new Date(String(r.ts));
    if (isNaN(ts) || ts < cutoff) return;
    const target = String(r.target || '');
    const parts = target.split('!');
    if (parts.length !== 3) return;
    const bookId = parts[0], tabName = parts[1], rowLabel = parts[2];
    if (!books[bookId]) return;                          // order books only
    const rowNum = Number(rowLabel);
    if (!rowNum || rowNum < 2) return;                   // updates only, never appends
    if (Date.now() - t0 > 250000) return;                // budget — rerun for the rest
    let values;
    try { values = JSON.parse(String(r.new_value || '{}')); } catch (e) { return; }
    rowsSeen++;
    try {
      const key = bookId + '|' + tabName;
      if (!(key in opened)) {
        opened[key] = bridgeOpenTab_(bookId, [tabName], ORDERS_EXPECT_DAY);
      }
      const open = opened[key];
      if (!open) { errors++; return; }
      Object.keys(values).forEach(function (h) {
        if (ORDERS_WRITABLE_COLS.indexOf(h) < 0) return; // §10.1 whitelist, exactly
        const col = bridgeColumnFor_(open, h);
        if (!col || col === -1) return;
        const cell = open.sheet.getRange(rowNum, col);
        const cur = String(cell.getValue() === null || cell.getValue() === undefined ? '' : cell.getValue()).trim();
        if (cur) { skippedHasValue++; return; }          // someone re-entered / it changed — keep theirs
        cell.setValue(bridgeCellIn_(values[h]));
        filled++;
        perAccount[books[bookId]] = (perAccount[books[bookId]] || 0) + 1;
      });
    } catch (e) { errors++; }
  });
  SpreadsheetApp.flush();
  const summary = 'replayed ' + filled + ' blank cell(s) from ' + rowsSeen + ' shadow write(s); ' +
    skippedHasValue + ' already had values (kept); ' + errors + ' error(s) · per account: ' + JSON.stringify(perAccount);
  logActivity_('system', 'SHADOW_REPLAY', 'order books 3d', '', String(filled), summary.slice(0, 250));
  return summary;
}

/* ---------- 30 Aug (owner): "update Sir Hasib's order sheet and sales analysis sheet with the
   portal — sales analysis of overall portal — update stats." His book's own report agents died
   in July; the tabs stop there. The portal now writes its OWN clearly-marked stats tabs into
   both books from the engine's penny-verified daily rows — never touching the book's original
   tabs — and refreshes them on the nightly ride. Columns follow the daily-report brain:
   Revenue · OE · Cost · CPC ads · Ad revenue · ROAS · T (0.8 law) · Returns · ACTUAL. */
const SH_ANALYSIS_BOOK = '1RQwuTJElRd-v7BKaK_DjFn8SjeKk_PRxa5XzGavSzSA';
const SH_ORDER_BOOK = '1MJK7wt3r3w-7JCCZjaSGxU23ZftbqerS7LlKAk-qwmQ';
const PORTAL_STATS_DAYS = 45;

function portalStatsRows_() {
  const out = [];
  let offset = 0;
  for (let page = 0; page < 6; page++) {
    const d = enginePost_('backupDump', { table: 'sales_daily', offset: offset });
    const head = (d && d.header) || [];
    (d.rows || []).forEach(function (r) {
      const o = {}; head.forEach(function (c, i) { o[c] = r[i]; });
      out.push(o);
    });
    offset += (d.rows || []).length;
    if (d.done || !(d.rows || []).length) break;
  }
  return out;
}

function portalStatsWrite_(bookId, tabName, rows, label) {
  const ss = SpreadsheetApp.openById(bookId);
  let sh = ss.getSheetByName(tabName);
  if (!sh) { sh = ss.insertSheet(tabName, 0); }
  sh.clearContents();
  const header = ['Date (UK)', 'Revenue', 'Order Earning', 'Cost', 'CPC Ads', 'Ad Revenue', 'ROAS',
    'T = 0.8×(OE−Cost)', 'Returns', 'ACTUAL PROFIT'];
  const byDay = {};
  rows.forEach(function (r) {
    const k = String(r.date);
    const b = (byDay[k] = byDay[k] || { sold: 0, oe: 0, cost: 0, pri: 0, ads_rev: 0, profit: 0, returns: 0, actual: 0 });
    ['sold', 'oe', 'cost', 'pri', 'ads_rev', 'profit', 'returns', 'actual'].forEach(function (c) {
      b[c] += Number(r[c]) || 0;
    });
  });
  const days = Object.keys(byDay).sort().reverse().slice(0, PORTAL_STATS_DAYS);
  const cut7 = days.slice(0, 7);
  const month = days.length ? String(days[0]).slice(0, 7) : '';
  let t7 = 0, a7 = 0, rMtd = 0, aMtd = 0;
  const grid = days.map(function (k) {
    const b = byDay[k];
    if (cut7.indexOf(k) >= 0) { t7 += b.sold; a7 += b.actual; }
    if (k.slice(0, 7) === month) { rMtd += b.sold; aMtd += b.actual; }
    const roas = b.pri > 0 ? Math.round(b.ads_rev / b.pri * 10) / 10 : '';
    return [k, r2_(b.sold), r2_(b.oe), r2_(b.cost), r2_(b.pri), r2_(b.ads_rev), roas,
      r2_(b.profit), r2_(b.returns), r2_(b.actual)];
  });
  const stamp = 'Updated by the portal · ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'd MMM, hh:mm a') + ' PKT · ' + label;
  const summary = ['REVENUE · 7 DAYS £' + r2_(t7) + '   ACTUAL · 7 DAYS £' + r2_(a7) +
    '   REVENUE · MTD £' + r2_(rMtd) + '   ACTUAL · MTD £' + r2_(aMtd)];
  sh.getRange(1, 1).setValue(stamp).setFontWeight('bold');
  sh.getRange(2, 1).setValue(summary[0]).setFontWeight('bold');
  sh.getRange(4, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (grid.length) sh.getRange(5, 1, grid.length, header.length).setValues(grid);
  sh.setFrozenRows(4);
  return grid.length;
}
function r2_(v) { return Math.round((Number(v) || 0) * 100) / 100; }

function updateSirHasibAnalysis() {
  const all = portalStatsRows_();
  const mine = all.filter(function (r) { return String(r.account) === 'Sir Hasib'; });
  const n1 = portalStatsWrite_(SH_ANALYSIS_BOOK, 'PORTAL STATS — Sir Hasib (auto)', mine, 'Sir Hasib');
  const n2 = portalStatsWrite_(SH_ANALYSIS_BOOK, 'PORTAL STATS — ALL ACCOUNTS (auto)', all, 'every account combined');
  const n3 = portalStatsWrite_(SH_ORDER_BOOK, 'PORTAL STATS (auto)', mine, 'Sir Hasib');
  logActivity_('system', 'PORTAL_STATS_WRITE', 'Sir Hasib books', '', String(n1 + n2 + n3),
    'analysis: ' + n1 + '+' + n2 + ' day rows · order book: ' + n3);
  return 'written: Sir Hasib ' + n1 + ' day(s), all-accounts ' + n2 + ' day(s), order-book ' + n3 + ' day(s)';
}

/** 30 Aug — the letters table had grown into the thousands (2,668 unread alone) and EVERY
 * ~45-second poll from every signed-in person reads the whole tab. The pruner keeps each
 * person's letters for 30 days (never touching unread ones younger than 90 days), rewrites the
 * tab once under the lock, and runs nightly. Read letters older than a month are history the
 * ACTIVITY_LOG already keeps in spirit; unread ones get a longer grace because unread is a
 * signal someone may still need. */
function notifPrune() {
  const lock = LockService.getScriptLock();
  /* First run found 25,623 letters — the polls read this whole tab every ~45s per person.
     Letters are pings, not records (ACTIVITY_LOG keeps the record): read ones live 7 days,
     unread 21 — a three-week-old unread bell is noise nobody will ever open. */
  const cut30 = Date.now() - 7 * 86400000;
  const cut90 = Date.now() - 21 * 86400000;
  let kept = 0, dropped = 0;
  try {
    lock.waitLock(15000);
    const sh = getPortalDb_(false).getSheetByName('NOTIFICATIONS');
    const vals = sh.getDataRange().getValues();
    if (vals.length < 2) return 'empty';
    const head = vals[0];
    const keep = [head];
    for (let i = 1; i < vals.length; i++) {
      const ts = new Date(String(vals[i][6]));                    // created_at
      const readAt = String(vals[i][7] === null || vals[i][7] === undefined ? '' : vals[i][7]).trim();
      const ageOk = isNaN(ts) ? true : (readAt ? ts.getTime() > cut30 : ts.getTime() > cut90);
      if (ageOk) { keep.push(vals[i]); kept++; } else { dropped++; }
    }
    if (dropped) {
      sh.clearContents();
      sh.getRange(1, 1, keep.length, head.length).setValues(keep);
    }
  } finally { lock.releaseLock(); }
  logActivity_('system', 'NOTIF_PRUNE', 'NOTIFICATIONS', '', String(dropped), 'kept ' + kept + ', dropped ' + dropped);
  return 'kept ' + kept + ' letter(s), dropped ' + dropped + ' old one(s)';
}

/* ==================================================================================== 30 Aug —
 * the owner's "wrong numbers are dangerous" batch. Three tools:
 * wbInspect        — read-only recon of any connected workbook (tabs, headers, sample rows), so
 *                    sheet questions get answered server-side instead of by eyeballing panes.
 * connectSirHasib  — the missing CONNECTIONS row: his Sales Analysis book existed, fed nothing.
 * sirHasibMonthlyFill — his report agents died in July; the portal now writes his Monthly Sheet
 *                    day rows itself from engine truth (append-only, never touches a filled row).
 */
function wbInspect(args) {
  args = args || {};
  var id = String(args.id || '');
  if (!id && args.account && args.kind) {
    readTab_('CONNECTIONS').forEach(function (c) {
      if (!id && String(c.account_name).trim() === String(args.account).trim() &&
          String(c.sheet_kind).trim() === String(args.kind).trim()) { id = String(c.spreadsheet_id || '').trim(); }
    });
  }
  if (!id) return JSON.stringify({ ok: false, why: 'no id — pass {id} or {account,kind}' });
  var ss = SpreadsheetApp.openById(id);
  if (!args.tab) {
    return JSON.stringify({ ok: true, title: ss.getName(),
      tabs: ss.getSheets().map(function (sh) { return sh.getName() + ' [' + sh.getLastRow() + 'r x ' + sh.getLastColumn() + 'c]'; }) });
  }
  var sh = ss.getSheetByName(String(args.tab));
  if (!sh) return JSON.stringify({ ok: false, why: 'no tab called ' + args.tab });
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 30);
  if (!lr) return JSON.stringify({ ok: true, rows: 0 });
  var top = sh.getRange(1, 1, Math.min(lr, Math.max(1, Number(args.rows || 6))), lc).getDisplayValues();
  var tail = lr > 12 ? sh.getRange(Math.max(2, lr - 3), 1, 4, lc).getDisplayValues() : [];
  return JSON.stringify({ ok: true, rows: lr, cols: sh.getLastColumn(), top: top, tail: tail });
}

function connectSirHasib() {
  var sh = getPortalDb_(false).getSheetByName('CONNECTIONS');
  var vals = sh.getDataRange().getValues();
  var head = vals[0].map(function (h) { return String(h).trim(); });
  var iRow = head.indexOf('row_id'), iSc = head.indexOf('scope'), iA = head.indexOf('account_name'),
      iK = head.indexOf('sheet_kind'), iId = head.indexOf('spreadsheet_id'), iS = head.indexOf('status'),
      iN = head.indexOf('notes');
  var out = [];
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][iA]).trim() === 'Sir Hasib' && String(vals[r][iK]).trim() === 'sales_analysis') {
      sh.getRange(r + 1, iId + 1).setValue(SH_ANALYSIS_BOOK);
      sh.getRange(r + 1, iS + 1).setValue('linked');
      out.push('updated existing row ' + (r + 1));
    }
  }
  if (!out.length) {
    var row = [];
    for (var c = 0; c < head.length; c++) { row.push(''); }
    if (iRow >= 0) row[iRow] = 'conn_shsa_' + Date.now();
    if (iSc >= 0) row[iSc] = 'account';
    row[iA] = 'Sir Hasib'; row[iK] = 'sales_analysis'; row[iId] = SH_ANALYSIS_BOOK; row[iS] = 'linked';
    if (iN >= 0) row[iN] = 'linked by the portal 30 Aug 2026 - owner: every number must include Sir Hasib';
    sh.appendRow(row);
    out.push('appended');
  }
  return out.join('; ');
}

function shMonths_() {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
}
function shYmdToOrd_(ymd) {
  var p = String(ymd).split('-'); var day = Number(p[2]);
  var sfx = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd'
    : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  return day + sfx + ' ' + shMonths_()[Number(p[1]) - 1] + ' ' + p[0];
}
/* One Date cell may cover a RANGE ("12-13 July 2026"); return every yyyy-mm-dd it covers. */
function shDateCellDays_(v) {
  if (v instanceof Date) {
    return [Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')];
  }
  var s = String(v == null ? '' : v).trim();
  if (!s) return [];
  var m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s*-\s*(\d{1,2})(?:st|nd|rd|th)?)?\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) {
    var t = Date.parse(s);
    return isFinite(t) ? [Utilities.formatDate(new Date(t), 'Etc/GMT', 'yyyy-MM-dd')] : [];
  }
  var names = shMonths_().map(function (x) { return x.toLowerCase(); });
  var mo = names.indexOf(m[3].toLowerCase()) + 1;
  if (!mo) return [];
  var lo = Number(m[1]), hi = m[2] ? Number(m[2]) : lo;
  var out = [];
  for (var d = lo; d <= hi && d <= 31; d++) {
    out.push(m[4] + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2));
  }
  return out;
}

function sirHasibMonthlyFill() {
  var ss = SpreadsheetApp.openById(SH_ANALYSIS_BOOK);
  var sh = ss.getSheetByName('Monthly Sheet');
  if (!sh) return 'no Monthly Sheet tab';
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  var iDate = head.indexOf('Date');
  if (iDate < 0) return 'no Date column';
  var have = {};
  if (lr > 1) {
    sh.getRange(2, iDate + 1, lr - 1, 1).getValues().forEach(function (r) {
      shDateCellDays_(r[0]).forEach(function (k) { have[k] = true; });
    });
  }
  var mine = portalStatsRows_().filter(function (r) { return String(r.account) === 'Sir Hasib'; });
  var byDay = {};
  mine.forEach(function (r) { byDay[String(r.date)] = r; });
  var counts = enginePost_('dayCounts', { from: '2026-08-01' });
  var cByDay = {};
  (((counts || {}).rows) || []).forEach(function (r) {
    if (String(r.account) === 'Sir Hasib') cByDay[String(r.d)] = r;
  });
  var yest = new Date(Date.now() + 3600000 - 86400000);          // yesterday, UK clock
  var end = Utilities.formatDate(yest, 'Etc/GMT', 'yyyy-MM-dd');
  var out = [];
  for (var t = Date.parse('2026-08-01T00:00:00Z'); ; t += 86400000) {
    var k = Utilities.formatDate(new Date(t), 'Etc/GMT', 'yyyy-MM-dd');
    if (k > end) break;
    if (have[k]) continue;
    var b = byDay[k], c = cByDay[k];
    if (!b && !c) continue;                                      // engine knows nothing for the day
    var row = [];
    for (var i = 0; i < lc; i++) { row.push(''); }
    var put = function (name, v) { var ix = head.indexOf(name); if (ix >= 0) row[ix] = v; };
    var sold = b ? r2_(b.sold) : 0, oe = b ? r2_(b.oe) : 0;
    put('Date', shYmdToOrd_(k));
    put('Orders', c ? Number(c.n) || 0 : 0);
    put('Units', c ? Number(c.units) || 0 : 0);
    put('Sold (B)', sold);
    put('Earning (H)', oe);
    put('AliExpress (I)', b ? r2_(b.cost) : 0);
    /* Sheet semantics proven against Saif's book 30 Aug: N = CPC x 1.2 (incl VAT), the sheet's
       T already carries the CPC deduction (T = 0.8x(OE-Ali) - CPC ex VAT = engine 'actual'+ret),
       Ratio column is literally named 'Ratio N/T'. General fees / Ad Waste are book-internal
       columns the engine cannot honestly reproduce - left blank, never invented. */
    var priEx = b ? Number(b.pri) || 0 : 0;
    put('All Priority incl VAT (N)', r2_(priEx * 1.2));
    var tSheet = b ? (Number(b.actual) || 0) + (Number(b.returns) || 0) : 0;
    put('Raw Profit (T)', r2_(tSheet));
    put('Returns (U)', b ? r2_(b.returns) : 0);
    put('Actual Profit (V)', b ? r2_(b.actual) : 0);
    put('Ratio N/T', tSheet > 0 && priEx > 0 ? r2_(priEx * 1.2 / tSheet) : '');
    out.push(row);
  }
  if (out.length) sh.getRange(lr + 1, 1, out.length, lc).setValues(out);
  return 'appended ' + out.length + ' day row(s), ' + Object.keys(have).length + ' already present';
}

