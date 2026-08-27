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
