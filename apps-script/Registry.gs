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

/* ==================================================================================== 30 Aug —
 * the accountability the owner asked for by name ("you are not doing your own accountability,
 * not verifying stats"): every night the portal reads each account book's own Monthly Sheet and
 * compares three CLOSED days (T-2..T-4, both sides final) against its own engine day rows.
 * Sold drift past £1-and-2% or Actual drift past £2-and-5% goes to Management as one letter
 * naming the account, the day and both figures. Silence = the books and the portal agree. */
function truthCheck() {
  const eng = {};
  portalStatsRows_().forEach(function (r) { eng[String(r.account) + '|' + String(r.date)] = r; });
  const days = [];
  for (let k = 2; k <= 4; k++) {
    days.push(Utilities.formatDate(new Date(Date.now() + 3600000 - k * 86400000), 'Etc/GMT', 'yyyy-MM-dd'));
  }
  const drifts = [];
  let booksRead = 0;
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.sheet_kind).trim() !== 'sales_analysis') return;
    if (String(c.status || '').trim().toLowerCase() !== 'linked') return;
    const account = String(c.account_name || '').trim();
    let read = null;
    try {
      read = bridgeReadRows_({ scope: 'account', account: account, kind: 'sales_analysis',
        tab: DASH_MONTHLY_TAB, expect: DASH_MONTHLY_HEADERS, limit: DASH_MONTHLY_LIMIT });
    } catch (e) { return; }
    if (!read || read.ok === false) return;
    booksRead++;
    const sheetByDay = {};
    (read.rows || []).forEach(function (row) {
      shDateCellDays_(row[DASH_COL_DATE]).forEach(function (k) {
        sheetByDay[k] = { sold: Number(row[DASH_COL_SOLD]) || 0, actual: Number(row[DASH_COL_ACTUAL]) || 0, span: 1 };
      });
    });
    days.forEach(function (k) {
      const sh = sheetByDay[k];
      const en = eng[account + '|' + k];
      if (!sh || !en) return;                                  // a missing side is its own story, not a drift
      const dSold = Math.abs(sh.sold - (Number(en.sold) || 0));
      const dAct = Math.abs(sh.actual - (Number(en.actual) || 0));
      if (dSold > 1 && dSold > 0.02 * Math.max(sh.sold, Number(en.sold) || 0, 1)) {
        drifts.push(account + ' · ' + k + ' · Sold: book £' + r2_(sh.sold) + ' vs portal £' + r2_(en.sold));
      } else if (dAct > 2 && dAct > 0.05 * Math.max(Math.abs(sh.actual), Math.abs(Number(en.actual) || 0), 1)) {
        drifts.push(account + ' · ' + k + ' · Actual: book £' + r2_(sh.actual) + ' vs portal £' + r2_(en.actual));
      }
    });
  });
  if (drifts.length) {
    const body = 'The nightly truth check compared each account book\'s Monthly Sheet against the ' +
      'portal\'s own day rows (days ' + days.join(', ') + ') and found ' + drifts.length + ' figure(s) apart:\n\n' +
      drifts.slice(0, 12).join('\n') +
      (drifts.length > 12 ? '\n…and ' + (drifts.length - 12) + ' more.' : '') +
      '\n\nOne of the two is wrong — usually a book missing a late refund or an ad bill. The portal side is on the Daily report.';
    readTab_('USERS').forEach(function (u) {
      if (String(u.role) !== 'Management' || String(u.status || '').toLowerCase() === 'off') return;
      notify_(String(u.email), 'Truth check: books vs portal', body, 'truthcheck:' + days[0]);
    });
  }
  logActivity_('system', 'TRUTH_CHECK', '', '', String(drifts.length), booksRead + ' book(s) read · days ' + days.join(','));
  return 'checked ' + booksRead + ' book(s) over ' + days.join(', ') + ' — ' + drifts.length + ' drift(s)' +
    (drifts.length ? ': ' + drifts.slice(0, 3).join(' | ') : '');
}

/* ==================================================================================== 30 Aug —
 * "fix the drifts in books too" (owner). The corrector the truth check reports into: for every
 * linked Sales Analysis book, closed days only (T-2 back to T-9 — the engine's own nightly
 * window, ads billed or skipped), where the book and the portal disagree past the truth-check
 * tolerance, the book row is corrected to the portal's figures.
 *
 * Safety, in order: the global write switch is honoured · a day still riding an ad ESTIMATE is
 * never written · range rows ("12-13 July") are never touched · only VALUE cells are written —
 * a formula cell recalculates itself from the inputs · the old values go into a note on the
 * Date cell · the Month-to-date running column is rebuilt only when it is typed values (cumsum
 * of Actual, proven against the books) · Management gets one letter naming every correction.
 * args {dry:true} reports without writing. */
function bookFix(args) {
  args = args || {};
  var dry = String(args.dry || '') === 'true' || args.dry === true;
  if (!dry && !bridgeWriteEnabled_()) return 'sheet writes are OFF (§16.10) — run enableSheetWrites first';

  var eng = {};
  portalStatsRows_().forEach(function (r) { eng[String(r.account) + '|' + String(r.date)] = r; });
  var winStart = Utilities.formatDate(new Date(Date.now() + 3600000 - 9 * 86400000), 'Etc/GMT', 'yyyy-MM-dd');
  var winEnd = Utilities.formatDate(new Date(Date.now() + 3600000 - 2 * 86400000), 'Etc/GMT', 'yyyy-MM-dd');
  var counts = enginePost_('dayCounts', { from: winStart });
  var cBy = {};
  (((counts || {}).rows) || []).forEach(function (r) { cBy[String(r.account) + '|' + String(r.d)] = r; });

  /* header name → engine value for the day; only the proven columns, never General fees / Ad
     Waste / Trend (book-internal). */
  function targetsFor(en, cn) {
    var pri = Number(en.pri) || 0;
    var t = (Number(en.actual) || 0) + (Number(en.returns) || 0);
    var out = {
      'Sold (B)': r2_(en.sold), 'Earning (H)': r2_(en.oe), 'AliExpress (I)': r2_(en.cost),
      'All Priority incl VAT (N)': r2_(pri * 1.2), 'Raw Profit (T)': r2_(t),
      'Returns (U)': r2_(en.returns), 'Actual Profit (V)': r2_(en.actual),
      'Ratio N/T': t > 0 && pri > 0 ? r2_(pri * 1.2 / t) : '',
    };
    if (cn) { out['Orders'] = Number(cn.n) || 0; out['Units'] = Number(cn.units) || 0; }
    return out;
  }

  var fixedRows = 0, fixedCells = 0, skippedEst = 0, booksTouched = 0;
  var lines = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.sheet_kind).trim() !== 'sales_analysis') return;
    if (String(c.status || '').trim().toLowerCase() !== 'linked') return;
    var account = String(c.account_name || '').trim();
    var ss;
    try { ss = SpreadsheetApp.openById(String(c.spreadsheet_id || '').trim()); } catch (e) { return; }
    var sh = null;
    DASH_MONTHLY_TAB.forEach(function (nm) { if (!sh) sh = ss.getSheetByName(nm); });
    if (!sh) return;
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    if (lr < 2) return;
    var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
    var col = {};
    head.forEach(function (h, i) { if (h && !(h in col)) col[h] = i; });
    if (!('Date' in col) || !('Sold (B)' in col) || !('Actual Profit (V)' in col)) return;

    var vals = sh.getRange(2, 1, lr - 1, lc).getValues();
    var fmls = sh.getRange(2, 1, lr - 1, lc).getFormulas();
    var touched = false;

    for (var rI = 0; rI < vals.length; rI++) {
      var days = shDateCellDays_(vals[rI][col['Date']]);
      if (days.length !== 1) continue;                        // range rows are the book's own business
      var k = days[0];
      if (k < winStart || k > winEnd) continue;
      var en = eng[account + '|' + k];
      if (!en) continue;
      if (Number(en.pri_est)) { skippedEst++; continue; }     // ads still an estimate — never write a book from a guess
      var shSold = Number(vals[rI][col['Sold (B)']]) || 0;
      var shAct = Number(vals[rI][col['Actual Profit (V)']]) || 0;
      var dSold = Math.abs(shSold - (Number(en.sold) || 0));
      var dAct = Math.abs(shAct - (Number(en.actual) || 0));
      var soldDrifts = dSold > 1 && dSold > 0.02 * Math.max(shSold, Number(en.sold) || 0, 1);
      var actDrifts = dAct > 2 && dAct > 0.05 * Math.max(Math.abs(shAct), Math.abs(Number(en.actual) || 0), 1);
      if (!soldDrifts && !actDrifts) continue;

      var want = targetsFor(en, cBy[account + '|' + k]);
      var noteBits = [];
      var rowFixed = 0;
      Object.keys(want).forEach(function (name) {
        if (!(name in col)) return;
        var cI = col[name];
        if (fmls[rI][cI]) return;                             // a formula recalculates itself from the fixed inputs
        var oldV = vals[rI][cI];
        var newV = want[name];
        if (newV === '' && String(oldV) === '') return;
        var oldN = Number(oldV), newN = Number(newV);
        if (isFinite(oldN) && isFinite(newN) && Math.abs(oldN - newN) < 0.006) return;
        if (!dry) sh.getRange(rI + 2, cI + 1).setValue(newV);
        noteBits.push(name.replace(/ \(.\)$/, '') + ' ' + oldV + '→' + newV);
        rowFixed++;
      });
      if (!rowFixed) continue;
      fixedRows++; fixedCells += rowFixed; touched = true;
      if (!dry) {
        var cell = sh.getRange(rI + 2, col['Date'] + 1);
        var note = String(cell.getNote() || '');
        cell.setNote((note ? note + '\n' : '') +
          ('Corrected by the portal ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'd MMM, hh:mm a') +
           ' PKT (eBay truth): ' + noteBits.join(' · ')).slice(0, 900));
      }
      lines.push(account + ' · ' + k + ': ' + noteBits.slice(0, 4).join(' · ') + (noteBits.length > 4 ? ' · +' + (noteBits.length - 4) + ' more' : ''));
    }

    /* the running Month-to-date column: typed values in every book (proven cumsum of Actual);
       rebuild it only when NO cell in it is a formula. */
    if (touched && !dry && ('Month-to-date' in col) && ('Actual Profit (V)' in col)) {
      SpreadsheetApp.flush();
      var mI = col['Month-to-date'];
      var mFml = sh.getRange(2, mI + 1, lr - 1, 1).getFormulas();
      var anyFml = mFml.some(function (f) { return !!f[0]; });
      if (!anyFml) {
        var vNow = sh.getRange(2, 1, lr - 1, lc).getValues();
        var run = 0;
        var out = [];
        for (var r2 = 0; r2 < vNow.length; r2++) {
          var vv = Number(vNow[r2][col['Actual Profit (V)']]);
          if (isFinite(vv) && String(vNow[r2][col['Date']]) !== '') { run += vv; }
          out.push([String(vNow[r2][col['Date']]) !== '' ? r2_(run) : vNow[r2][mI]]);
        }
        sh.getRange(2, mI + 1, lr - 1, 1).setValues(out);
      }
    }
    if (touched) booksTouched++;
  });

  if (!dry && lines.length) {
    var body = 'The portal corrected ' + fixedCells + ' figure(s) on ' + fixedRows + ' day row(s) across ' +
      booksTouched + ' book(s) to match eBay\'s own data (closed days ' + winStart + ' → ' + winEnd + '):\n\n' +
      lines.slice(0, 14).join('\n') + (lines.length > 14 ? '\n…and ' + (lines.length - 14) + ' more.' : '') +
      '\n\nEvery old value is preserved in a note on that row\'s Date cell. Days whose ad bill has not landed were left alone.';
    readTab_('USERS').forEach(function (u) {
      if (String(u.role) !== 'Management' || String(u.status || '').toLowerCase() === 'off') return;
      notify_(String(u.email), 'Books corrected to eBay truth', body, 'bookfix:' + winEnd);
    });
  }
  logActivity_('system', dry ? 'BOOK_FIX_DRY' : 'BOOK_FIX', '', '', fixedCells + 'c/' + fixedRows + 'r', lines.slice(0, 3).join(' | ').slice(0, 240));
  return (dry ? 'DRY RUN — would fix ' : 'fixed ') + fixedCells + ' cell(s) on ' + fixedRows + ' row(s) in ' +
    booksTouched + ' book(s)' + (skippedEst ? ' · ' + skippedEst + ' day(s) skipped (ads still estimated)' : '') +
    (lines.length ? ' :: ' + lines.slice(0, 3).join(' | ') : '');
}

/* 30 Aug — the ads history the engine lost (billing ages out of eBay's report after ~2 weeks)
 * exists in the account books: the N column, recorded when the billing was live. This reads
 * every linked book's Monthly Sheet and hands N/1.2 to the engine for the days that currently
 * ride an ESTIMATE - real recorded spend replaces the guess, day by day. */
function adsFromBooks() {
  const out = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.sheet_kind).trim() !== 'sales_analysis') return;
    if (String(c.status || '').trim().toLowerCase() !== 'linked') return;
    const account = String(c.account_name || '').trim();
    let read = null;
    try {
      read = bridgeReadRows_({ scope: 'account', account: account, kind: 'sales_analysis',
        tab: DASH_MONTHLY_TAB, expect: DASH_MONTHLY_HEADERS, limit: DASH_MONTHLY_LIMIT });
    } catch (e) { return; }
    if (!read || read.ok === false) return;
    (read.rows || []).forEach(function (row) {
      const days = shDateCellDays_(row[DASH_COL_DATE]);
      if (days.length !== 1) return;
      const n = Number(row[DASH_COL_PRIORITY]);
      if (!isFinite(n) || n < 0) return;
      out.push({ account: account, date: days[0], pri: Math.round(n / 1.2 * 100) / 100 });
    });
  });
  let updated = 0;
  for (let i = 0; i < out.length; i += 300) {
    const res = enginePost_('priFromBooks', { rows: out.slice(i, i + 300) });
    updated += Number(res && res.updated) || 0;
  }
  logActivity_('system', 'ADS_FROM_BOOKS', '', '', String(updated), out.length + ' book day(s) offered');
  return out.length + ' book day(s) offered, ' + updated + ' estimated day(s) replaced with the books\' real N';
}

/* 30 Aug (owner): 24 hours after a CPC listing goes live, Zain gets the keyword-research task —
 * pull eBay keyword research for the item and hand it to the lister so the CPC Main Potential
 * Revision carries those keywords. Engine names candidates; dedupe by (type, item) here. */
function cpcKeywordSweep() {
  let cands = [];
  try { cands = ((enginePost_('cpcKeywordCandidates', {}) || {}).items) || []; }
  catch (e) { return 'engine unreachable: ' + String(e && e.message || e).slice(0, 100); }
  if (!cands.length) return 'no CPC listings in the 24-96h window';
  const sh = tasksSheet_();
  const all = readTab_('TASKS');
  const adv = listingPickForRole_('Advertising Manager', '', all, 'cpc_keywords');
  if (!adv) return 'no Advertising Manager to assign';
  const stamp = now_();
  const deadline = Utilities.formatDate(new Date(Date.now() + 24 * 3600000), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
  let made = 0;
  cands.forEach(function (c) {
    const id = String(c.item_id || '');
    if (!id) return;
    if (listingFindTask_(all, 'cpc_keywords', id)) return;
    const taskId = listingCreateTask_(sh, {
      type: 'cpc_keywords', account: String(c.account || ''), item_id: id,
      title: 'CPC keywords — Item ID ' + id,
      details: listingLines_([
        'Item ID: ' + id,
        'Listing: ' + String(c.title || ''),
        'Live since: ' + String(c.live_at || '').slice(0, 16) + ' — 24h in a CPC campaign.',
        'Pull the eBay keyword research page for this item, pick the winning keywords, and send them to ' + String(c.lister || 'the lister') + '.',
        'The CPC Main Potential Revision must carry these keywords — the lister updates title/keywords with what you send.',
      ]),
      assigned_by: 'system:cpc-24h', assigned_to: adv.email,
      priority: 'High', deadline_pkt: deadline, stamp: stamp,
    });
    notify_(adv.email, 'CPC keywords task',
      '🔎 24h in CPC: "' + String(c.title || id).slice(0, 90) + '" (' + id + ') — pull eBay keyword research and send it to ' +
      String(c.lister || 'the lister') + ' for the CPC Main Potential Revision.', 'task:' + taskId);
    if (c.lister) {
      notify_(String(c.lister), 'CPC keywords coming',
      '🔎 Zain is pulling eBay keyword research for "' + String(c.title || id).slice(0, 90) + '" — your CPC Main Potential Revision must carry those keywords once they arrive.', 'task:' + taskId + ':l');
    }
    logActivity_('system', 'CREATE_TASK', taskId, '', 'Pending', 'cpc_keywords → ' + adv.email + ' (item ' + id + ')');
    made++;
  });
  return cands.length + ' candidate(s), ' + made + ' keyword task(s) raised';
}

/* ==================================================================================== 1 Sept —
 * TRUTH UPDATE v2, Phase 0 recon (read-only): one call returns the CONNECTIONS registry and,
 * per sales-analysis workbook, the header row of the newest day tab plus the FORMULAS of the
 * True Order Earning / VAT to HMRC / Raw Profit cells on the first three data rows — the
 * porting evidence §9.3 asks for. Touches nothing. */
function phase0Dump(args) {
  args = args || {};
  const out = { connections: [], formulas: [] };
  readTab_('CONNECTIONS').forEach(function (c) {
    out.connections.push({ scope: String(c.scope || ''), account: String(c.account_name || ''),
      kind: String(c.sheet_kind || ''), id: String(c.spreadsheet_id || ''), status: String(c.status || '') });
  });
  const wanted = ['True Order Earning', 'VAT to HMRC', 'Raw Profit'];
  out.connections.forEach(function (c) {
    if (c.kind !== 'sales_analysis' || c.status.toLowerCase() !== 'linked') return;
    try {
      const ss = SpreadsheetApp.openById(c.id);
      /* newest day tab = highest sheet with a name like "28th August 2026" */
      let best = null, bestT = 0;
      ss.getSheets().forEach(function (sh) {
        const m = String(sh.getName()).match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/);
        if (!m) return;
        const t = Date.parse(m[2] + ' ' + m[1] + ', ' + m[3]);
        if (isFinite(t) && t > bestT) { bestT = t; best = sh; }
      });
      if (!best) { out.formulas.push({ account: c.account, why: 'no day tab' }); return; }
      const lc = best.getLastColumn();
      const head = best.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
      const cols = {};
      wanted.forEach(function (w) { cols[w] = head.indexOf(w); });
      const rec = { account: c.account, tab: best.getName(), header_count: lc, cols: cols, rows: [] };
      const lr = Math.min(best.getLastRow(), 4);
      if (lr >= 2) {
        const fml = best.getRange(2, 1, lr - 1, lc).getFormulas();
        const val = best.getRange(2, 1, lr - 1, lc).getValues();
        for (let r = 0; r < fml.length; r++) {
          const row = {};
          wanted.forEach(function (w) {
            const i = cols[w];
            if (i < 0) return;
            row[w] = fml[r][i] ? fml[r][i] : ('MANUAL:' + val[r][i]);
          });
          rec.rows.push(row);
        }
      }
      out.formulas.push(rec);
    } catch (e) { out.formulas.push({ account: c.account, why: String(e && e.message || e).slice(0, 120) }); }
  });
  return JSON.stringify(out);
}

/* ==================================================================================== 1 Sept —
 * TRUTH v2 Phase 1: the sheets mirror. Apps Script holds the Google credentials, so it reads
 * the money day tabs and hands rows to the engine (syncSheetRows); pages and the verifier read
 * D1 only (R8). Hot = today + yesterday every 15 minutes; cold = current + previous month,
 * cursor-walked nightly. Read-only on the books, always. */
function truthDayTabName_(pk) {
  return shYmdToOrd_(pk);                       // '1st September 2026' — the books' own naming
}
function truthPushTab_(ss, wbId, account, tabName, dayPk) {
  const sh = ss.getSheetByName(tabName);
  if (!sh) return { tab: tabName, rows: 0, missing: true };
  const lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 30);
  if (lr < 1) return { tab: tabName, rows: 0 };
  const head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  const n = lr > 1 ? lr - 1 : 0;
  const vals = n ? sh.getRange(2, 1, n, lc).getValues() : [];
  let sent = 0;
  for (let i = 0; i < vals.length; i += 200) {
    const chunk = [];
    for (let r = i; r < Math.min(i + 200, vals.length); r++) {
      const o = {};
      head.forEach(function (h, c) { if (h) o[h] = vals[r][c]; });
      chunk.push({ row_no: r + 2, vals: o });
    }
    enginePost_('syncSheetRows', { workbook_id: wbId, account: account, tab: tabName, day_pk: dayPk,
      headers: i === 0 ? head : null, rows: chunk, last_row: (i + 200 >= vals.length) ? lr : null });
    sent += chunk.length;
  }
  return { tab: tabName, rows: sent };
}
function truthMoneyBooks_() {
  const out = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.sheet_kind).trim() !== 'sales_analysis') return;
    if (String(c.status || '').trim().toLowerCase() !== 'linked') return;
    out.push({ account: String(c.account_name || '').trim(), id: String(c.spreadsheet_id || '').trim() });
  });
  return out;
}
function pushSheetRowsHot() {
  /* 2 Sept: FOUR days, not two — staff create a day's tab late (Sir Hasib's 31 Aug tab appeared
     on 2 Sept) and the report agent revises the ad columns for ~2 days after. Two days of cover
     left late tabs unmirrored and revised numbers stale until the nightly cold walk. */
  const days = [0, 1, 2, 3].map(function (k) {
    return Utilities.formatDate(new Date(Date.now() + 5 * 3600000 - k * 86400000), 'Etc/GMT', 'yyyy-MM-dd');
  });
  let pushed = 0, tabs = 0;
  truthMoneyBooks_().forEach(function (b) {
    try {
      const ss = SpreadsheetApp.openById(b.id);
      days.forEach(function (pk) {
        const res = truthPushTab_(ss, b.id, b.account, truthDayTabName_(pk), pk);
        if (!res.missing) { tabs++; pushed += res.rows; }
      });
    } catch (e) { logActivity_('system', 'SHEETMIRROR_FAIL', b.account, '', '', String(e && e.message || e).slice(0, 120)); }
  });
  try { notifSweep_(); } catch (e) { logActivity_('system', 'NOTIF_SWEEP_FAIL', '', '', '', String(e && e.message || e).slice(0, 120)); }
  try { huntsSweep_(); } catch (e) {}
  try { reportsSweep_(); } catch (e) {}
  try { tasksSweep_(); } catch (e) {}
  /* the three R8 reason lists ride across too — tiny, keeps huntReasonsEngine current */
  try {
    enginePost_('syncConfig', { rows: ['hunt_reject_reasons', 'hunt_revise_needs', 'lister_reject_reasons', 'late_threshold_min', 'checkpoints_shift1', 'checkpoints_shift2']
      .map(function (k) { return { key: k, value: String(getConfig(k) || '') }; })
      .filter(function (r) { return r.value; }) });
  } catch (e) {}
  logActivity_('system', 'SHEETMIRROR_HOT', '', '', String(pushed), tabs + ' tab(s)');
  return tabs + ' tab(s), ' + pushed + ' row(s) mirrored (last 4 days)';
}
function pushSheetRowsCold() {
  /* cursor: {a: accountIndex, d: dayOffset} walking 0..62 days back per account, ~150s budget */
  const props = PropertiesService.getScriptProperties();
  let cur = {};
  try { cur = JSON.parse(props.getProperty('SHEETMIRROR_COLD') || '{}'); } catch (e) {}
  const books = truthMoneyBooks_();
  let ai = Math.min(Number(cur.a) || 0, Math.max(0, books.length - 1));
  let di = Number(cur.d) || 0;
  const started = Date.now();
  let pushed = 0, tabs = 0;
  while (Date.now() - started < 150000 && books.length) {
    const b = books[ai];
    const pk = Utilities.formatDate(new Date(Date.now() + 5 * 3600000 - di * 86400000), 'Etc/GMT', 'yyyy-MM-dd');
    try {
      const ss = SpreadsheetApp.openById(b.id);
      const res = truthPushTab_(ss, b.id, b.account, truthDayTabName_(pk), pk);
      if (!res.missing) { tabs++; pushed += res.rows; }
    } catch (e) { logActivity_('system', 'SHEETMIRROR_FAIL', b.account, '', '', String(e && e.message || e).slice(0, 120)); }
    di++;
    if (di > 62) { di = 0; ai = (ai + 1) % books.length; if (ai === 0) break; }
  }
  props.setProperty('SHEETMIRROR_COLD', JSON.stringify({ a: ai, d: di }));
  return tabs + ' tab(s), ' + pushed + ' row(s) mirrored (cold cursor a=' + ai + ' d=' + di + ')';
}
function ensureTruthTriggers() {
  const have = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'pushSheetRowsHot'; });
  if (!have) { ScriptApp.newTrigger('pushSheetRowsHot').timeBased().everyMinutes(15).create(); }
  return have ? 'hot mirror trigger already present' : 'hot mirror trigger created (every 15 min)';
}


/* TRUTH v2 WO-12: mirror the MESSAGES tab into D1 (worker syncInbox). Re-runnable — msg_id
 * upserts keep read/hidden fresh. args {from_row} continues a big tab across calls. */
function inboxDump(args) {
  const sh = getPortalDb_(false).getSheetByName('MESSAGES');
  if (!sh) return 'no MESSAGES tab';
  const lr = sh.getLastRow();
  if (lr < 2) return '0 messages';
  const start = Math.max(2, Number(args && args.from_row) || 2);
  const n = Math.min(lr - start + 1, 4000);
  if (n <= 0) return 'done at ' + lr;
  const vals = sh.getRange(start, 1, n, 8).getValues();
  let sent = 0;
  for (let i = 0; i < vals.length; i += 400) {
    const chunk = vals.slice(i, i + 400).map(function (r) {
      return { msg_id: String(r[0] || ''), thread_id: String(r[1] || ''),
        from_email: String(r[2] || ''), to_email: String(r[3] || ''), body: String(r[4] || ''),
        sent_at: r[5] instanceof Date ? r[5].toISOString() : String(r[5] || ''),
        read_at: r[6] instanceof Date ? r[6].toISOString() : String(r[6] || ''),
        hidden: String(r[7] || '') };
    }).filter(function (m) { return m.msg_id && m.thread_id; });
    if (chunk.length) { enginePost_('syncInbox', { messages: chunk }); sent += chunk.length; }
  }
  return sent + ' message(s) mirrored (rows ' + start + '–' + (start + n - 1) + ' of ' + lr + ')' +
    (start + n <= lr ? ' · continue with {from_row:' + (start + n) + '}' : ' · complete');
}

/* 2 Sept — the bell off Google: sweep + backfill for the Engine's notifications store. */
function notifRowsOut_(startRow, n) {
  const sh = getPortalDb_(false).getSheetByName('NOTIFICATIONS');
  const lr = sh.getLastRow();
  if (lr < 2 || startRow > lr) return { rows: [], last: lr };
  const take = Math.min(n, lr - startRow + 1);
  const vals = sh.getRange(startRow, 1, take, 8).getValues();
  const rows = vals.map(function (r) {
    return { as_id: String(r[0] || ''), to: String(r[1] || ''), from: String(r[2] || 'system'),
      type: String(r[3] || ''), message: String(r[4] || ''), ref: String(r[5] || ''),
      created_at: r[6] instanceof Date ? Utilities.formatDate(r[6], 'Etc/GMT', 'yyyy-MM-dd HH:mm:ss') : String(r[6] || ''),
      read_at: r[7] instanceof Date ? Utilities.formatDate(r[7], 'Etc/GMT', 'yyyy-MM-dd HH:mm:ss') : String(r[7] || '') };
  }).filter(function (r) { return r.as_id && r.to.indexOf('@') > 0; });
  return { rows: rows, last: startRow + take - 1 };
}
/** the 15-min catch-up: pushes NOTIFICATIONS rows appended since the cursor (idempotent). */
function notifSweep_() {
  const props = PropertiesService.getScriptProperties();
  const sh = getPortalDb_(false).getSheetByName('NOTIFICATIONS');
  const lr = sh.getLastRow();
  let cur = Number(props.getProperty('NOTIF_PUSH_ROW') || 0);
  if (!cur) { cur = Math.max(1, lr - 5); }              // first run: only the newest few, backfill owns history
  if (lr <= cur) return '0 pushed (at ' + lr + ')';
  let pushed = 0, at = cur + 1;
  while (at <= lr && pushed < 800) {
    const batch = notifRowsOut_(at, 400);
    if (batch.rows.length) { enginePost_('syncNotifs', { rows: batch.rows }); pushed += batch.rows.length; }
    at = batch.last + 1;
  }
  props.setProperty('NOTIF_PUSH_ROW', String(at - 1));
  return pushed + ' letter(s) pushed (cursor ' + (at - 1) + ' of ' + lr + ')';
}
/** one-time (re-runnable) backfill of the recent tail — args {from_row} to continue. */
function notifDump(args) {
  const sh = getPortalDb_(false).getSheetByName('NOTIFICATIONS');
  const lr = sh.getLastRow();
  const start = Math.max(2, Number(args && args.from_row) || Math.max(2, lr - 2999));
  let at = start, pushed = 0;
  const t0 = Date.now();
  while (at <= lr && Date.now() - t0 < 220000) {
    const batch = notifRowsOut_(at, 400);
    if (batch.rows.length) { enginePost_('syncNotifs', { rows: batch.rows }); pushed += batch.rows.length; }
    at = batch.last + 1;
  }
  PropertiesService.getScriptProperties().setProperty('NOTIF_PUSH_ROW', String(Math.max(at - 1, Number(PropertiesService.getScriptProperties().getProperty('NOTIF_PUSH_ROW') || 0))));
  return pushed + ' letter(s) backfilled (rows ' + start + '–' + (at - 1) + ' of ' + lr + ')' + (at <= lr ? ' · continue with {from_row:' + at + '}' : ' · complete');
}

/* 2 Sept — hunts mirror for the Engine's queue reads. Full dump, re-runnable; {from_row} to continue. */
/* Rides pushSheetRowsHot every 15 min: re-push the newest hunts so a swallowed write-through
   can never leave a submitted hunt invisible to the engine queue (self-healing, 1 call). */
/* 3 Sept — safety net: re-push the newest tasks every 15 min so a task whose creation path
   forgot the write-through (the revision creators did) still reaches the board within the cycle. */
function tasksSweep_() {
  try {
    var COLS = ['task_id','type','account','item_id','title','details','comments','assigned_by','assigned_to','priority','deadline_pkt','status','created_at','updated_at','submitted_at','approved_by','decided_at','submission_note','time_taken_min'];
    var rows = readTab_('TASKS');
    var recent = rows.slice(Math.max(0, rows.length - 100)).map(function (t) {
      var o = {}; COLS.forEach(function (k) { var v = t[k]; o[k] = (v instanceof Date) ? taskPktIso_(v) : String(v == null ? '' : v); });
      return o;
    }).filter(function (o) { return o.task_id; });
    if (recent.length) enginePost_('syncTasks', { tasks: recent });
  } catch (e) {}
}

/* 3 Sept (owner) — rename a staff member in the USERS master, then propagate to the engine. */
function adminRenameUser(args) {
  var email = String(args && args.email || '').trim().toLowerCase();
  var name = String(args && args.name || '').trim();
  if (!email || !name) return 'need {email,name}';
  var sh = getPortalDb_(false).getSheetByName('USERS');
  var data = sh.getDataRange().getValues();
  var head = data[0].map(String);
  var ei = head.indexOf('email'), ni = head.indexOf('name');
  if (ei < 0 || ni < 0) return 'USERS missing email/name column';
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][ei]).trim().toLowerCase() === email) {
      var old = String(data[i][ni]);
      sh.getRange(i + 1, ni + 1).setValue(name);
      logActivity_('system', 'ADMIN_RENAME_USER', email, old, name, '');
      try { pushEngineSync(); } catch (e) {}
      return 'renamed ' + email + ': "' + old + '" -> "' + name + '" (pushed to engine)';
    }
  }
  return 'no USERS row for ' + email;
}

/* 3 Sept — REPORTS_2H mirror for the Engine's reports pages. Newest rows re-pushed every
   15 min (self-heal); reportsDump backfills history. Rows are small; 80 is a shift's worth. */
function reportsSweep_() {
  try {
    const rows = readTab_('REPORTS_2H');
    const recent = rows.slice(Math.max(0, rows.length - 80)).map(repRowOut_).filter(function (r) { return r.report_id; });
    if (recent.length) enginePost_('syncReports', { rows: recent });
  } catch (e) {}
}

function repRowOut_(r) {
  const o = {};
  ['report_id', 'email', 'role', 'shift', 'work_summary', 'count_1', 'count_2', 'count_3', 'count_4', 'flag'].forEach(function (c) {
    o[c] = String(r[c] == null ? '' : r[c]);
  });
  o.date = (typeof schedDateStr_ === 'function') ? schedDateStr_(r.date) : String(r.date || '');
  o.checkpoint = (typeof schedHm_ === 'function') ? schedHm_(r.checkpoint) : String(r.checkpoint || '');
  o.submitted_at = (r.submitted_at instanceof Date) ? taskPktIso_(r.submitted_at) : String(r.submitted_at || '');
  return o;
}

function reportsDump(args) {
  const rows = readTab_('REPORTS_2H');
  const start = Math.max(0, Number(args && args.from_row) || Math.max(0, rows.length - 1500));
  let pushed = 0;
  const t0 = Date.now();
  for (let i = start; i < rows.length && Date.now() - t0 < 220000; i += 200) {
    const batch = rows.slice(i, i + 200).map(repRowOut_).filter(function (b) { return b.report_id; });
    if (batch.length) { enginePost_('syncReports', { rows: batch }); pushed += batch.length; }
  }
  return pushed + ' report row(s) mirrored of ' + rows.length;
}

function huntsSweep_() {
  try {
    const rows = readTab_('HUNTING_DB');
    const recent = rows.slice(Math.max(0, rows.length - 40)).map(huntValsOut_).filter(function (b) { return b.vals.hunt_id; });
    if (recent.length) enginePost_('syncHunts', { rows: recent });
  } catch (e) {}
}

/* JSON-native: arrays/objects (criteria_flags!) survive intact — String() flattened them and
   crashed the queue's flags renderer. Only Dates need converting. */
function huntValsOut_(r) {
  const rec = huntRecord_(r);
  const hv = {};
  Object.keys(rec).forEach(function (k) {
    const x = rec[k];
    hv[k] = (x instanceof Date) ? Utilities.formatDate(x, 'Etc/GMT', 'yyyy-MM-dd HH:mm:ss') : (x == null ? '' : x);
  });
  return { vals: hv };
}

function huntsDump(args) {
  const rows = readTab_('HUNTING_DB');
  const start = Math.max(0, Number(args && args.from_row) || 0);
  let pushed = 0;
  const t0 = Date.now();
  for (let i = start; i < rows.length && Date.now() - t0 < 220000; i += 120) {
    const batch = rows.slice(i, i + 120).map(huntValsOut_).filter(function (b) { return b.vals.hunt_id; });
    if (batch.length) { enginePost_('syncHunts', { rows: batch }); pushed += batch.length; }
  }
  return pushed + ' hunt(s) mirrored of ' + rows.length;
}
