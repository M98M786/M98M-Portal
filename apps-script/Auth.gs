/** Phase 2 — auth, registration/approval, home-screen reads, and the profit-stripping
 * middleware (RL-4). Registration writes a pending USERS row; Management approves.
 * Profit / PII / Learnings are removed from payloads server-side for restricted roles. */

const MGMT_ROLES = ['Management', 'Ops Head'];
// RL-4 — fields stripped from any record before it leaves the server for a restricted role.
const PROFIT_FIELDS = ['Our Profit', 'ROI', 'Profit', 'Order Earning', 'order_earning', 'profit', 'roi',
  'Raw Profit', 'Actual Profit', 'margin', 'Margin', 'earning', 'Earning', 'Our price net', 'net_after_cpc'];
const PII_FIELDS = ['Full Address', 'Post to name', 'Post to address 1', 'Post to address 2', 'Post to city',
  'Post to county', 'Post to postcode', 'Post to phone', 'Email', 'buyer', 'Buyer', 'Customer Address Detail'];

function roleDept_(role) {
  switch (role) {
    case 'Product Hunter': return 'Hunting';
    case 'Item Lister': case 'Listing Manager': return 'Listing';
    case 'Advertising Manager': return 'Advertising';
    case 'CS': return 'CS';
    case 'Order Processor': return 'Order Processing';
    default: return '*';                                   // Management/Ops Head/Team Lead/Pricing see all
  }
}
function isMgmt_(role, email) { return isSuperAdmin(email) || MGMT_ROLES.indexOf(role) >= 0; }
function canSeeProfit_(role) { return PROFIT_ROLES.indexOf(role) >= 0; }

/** RL-4 middleware — strip disallowed keys from an array/object of records for this role. */
function stripForRole_(records, role, email) {
  const profitOk = canSeeProfit_(role);
  const piiOk = (role === 'CS' || role === 'Order Processor' || isMgmt_(role, email));
  if (profitOk && piiOk) return records;
  const scrub = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    Object.keys(obj).forEach(function (k) {
      if (!profitOk && PROFIT_FIELDS.indexOf(k) >= 0) return;
      if (!piiOk && PII_FIELDS.indexOf(k) >= 0) return;
      out[k] = obj[k];
    });
    return out;
  };
  return Array.isArray(records) ? records.map(scrub) : scrub(records);
}

// ---------- public ----------
function actionGetPublicConfig_() {
  return { oauth_client_id: getConfig('oauth_client_id'), roles: ROLES, service: 'M98M Portal', phase: 2,
    engine_url: getConfig('engine_url') || '' };
}

// ---------- token-level ----------
function actionWhoami_(payload, ctx) {
  const email = ctx.ident.email;
  if (isSuperAdmin(email)) {
    const su = ctx.user || {};
    return { status: 'approved', email: email, name: su.name || ctx.ident.name, role: 'Management', shift: su.shift || '', accounts: 'ALL', isSuper: true, modules: [], tools: [] };
  }
  if (!ctx.user) return { status: 'none', email: email, name: ctx.ident.name, prefillRole: ROLE_PREFILL[normalizeEmail(email)] || '' };
  const u = ctx.user;
  return { status: u.status, email: u.email, name: u.name, role: u.role, shift: u.shift, accounts: u.accounts,
    modules: parseAccessCsv_(u.modules), tools: parseAccessCsv_(u.tools) };
}

/** V2 routing helper: everyone who holds a module — role defaults come from the roles the
 * frontend view declares (passed in), explicit grants add, '-key' subtracts. */
function usersWithModule_(moduleKey, defaultRoles) {
  const out = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const mods = parseAccessCsv_(u.modules);
    if (mods.indexOf('-' + moduleKey) >= 0) return;
    if (mods.indexOf(moduleKey) >= 0 || (defaultRoles || []).indexOf(String(u.role)) >= 0) out.push(normalizeEmail(u.email));
  });
  return out;
}

function actionRegister_(payload, ctx) {
  const email = ctx.ident.email, name = ctx.ident.name;
  if (ctx.user && ctx.user.status === 'approved') return { status: 'approved', email: email, name: ctx.user.name, role: ctx.user.role, shift: ctx.user.shift, accounts: ctx.user.accounts };
  let role = String(payload.role || '');
  if (ROLES.indexOf(role) < 0) role = ROLE_PREFILL[normalizeEmail(email)] || 'Item Lister';
  let shift = String(payload.shift || 'Custom');
  if (['Shift 1', 'Shift 2', 'Custom'].indexOf(shift) < 0) shift = 'Custom';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('USERS');
    const rows = sh.getDataRange().getValues();
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) if (normalizeEmail(rows[i][0]) === normalizeEmail(email)) { rowIdx = i + 1; break; }
    if (rowIdx > 0) {
      const old = sh.getRange(rowIdx, 3, 1, 4).getValues()[0]; // role, shift, accounts, status
      sh.getRange(rowIdx, 3).setValue(role);
      sh.getRange(rowIdx, 4).setValue(shift);
      if (String(old[3]) !== 'approved') sh.getRange(rowIdx, 6).setValue('pending');
      logActivity_(email, 'REGISTER_UPDATE', email, old.join('|'), role + '|' + shift, 'requested');
    } else {
      sh.appendRow([email, name, role, shift, 'per-role', 'pending', now_(), '', '', 'self-registered']);
      logActivity_(email, 'REGISTER_NEW', email, '', role + '|' + shift, 'self-registered');
    }
  } finally { lock.releaseLock(); }

  notifyManagement_('New staff registration', name + ' (' + email + ') requested ' + role + ' · ' + shift, 'register:' + email);
  return { status: 'pending', email: email, name: name, role: role, shift: shift };
}

// ---------- approved-user reads ----------
// todayAgenda lives in Agenda.gs and myRules in RulesAck.gs — the full versions, per §20.1 and §26.

function actionSubmitIdea_(payload, ctx) {
  const idea = String(payload.idea || '').trim();
  if (!idea) throw new Error('empty idea');
  const dept = roleDept_(ctx.user.role);
  getPortalDb_(false).getSheetByName('IDEAS').appendRow(['I' + Utilities.getUuid().slice(0, 8), ctx.user.name, dept, idea, now_(), 'new', '']);
  notifyManagement_('New idea submitted', ctx.user.name + ' shared an idea', 'idea');
  logActivity_(ctx.ident.email, 'SUBMIT_IDEA', 'IDEAS', '', idea.slice(0, 80), '');
  return { ok: true };
}

/** Who a task, hunt or meeting may be assigned to. Staff names and company emails are business
 * data: they are served to signed-in users only and must never be baked into the public page
 * (RL-2, RL-9). Optional payload.roles narrows the list, e.g. the listers on a hunt approval. */
function actionAssignableStaff_(payload, ctx) {
  const wantRoles = Array.isArray(payload.roles) ? payload.roles.filter(function (r) { return ROLES.indexOf(r) >= 0; }) : null;
  const staff = readTab_('USERS').filter(function (u) {
    if (String(u.status) !== 'approved') return false;
    return !wantRoles || !wantRoles.length || wantRoles.indexOf(String(u.role)) >= 0;
  }).map(function (u) {
    return { email: String(u.email), name: String(u.name || u.email), role: String(u.role), accounts: String(u.accounts || '') };
  });
  staff.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  return { staff: staff };
}

/** The eBay seller accounts the portal is connected to — from CONNECTIONS, never hardcoded,
 * so adding an account in the registry is enough for it to appear in every picker (§3). */
function actionAccountList_(payload, ctx) {
  const health = connectionHealth();
  const accounts = (health.perAccount || []).map(function (a) {
    return { account: a.account, linked: a.linked, of: a.of };
  });
  return { accounts: accounts };
}

// ---------- management ----------
function actionListPending_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  return { pending: readTab_('USERS').filter(function (u) { return String(u.status) === 'pending'; })
    .map(function (u) { return { email: u.email, name: u.name, role: u.role, shift: u.shift }; }) };
}

function actionApproveUser_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const target = normalizeEmail(payload.email || '');
  const sh = getPortalDb_(false).getSheetByName('USERS');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalizeEmail(rows[i][0]) === target) {
      const old = rows[i].slice();
      if (payload.role && ROLES.indexOf(payload.role) >= 0) sh.getRange(i + 1, 3).setValue(payload.role);
      if (payload.shift) sh.getRange(i + 1, 4).setValue(payload.shift);
      if (payload.accounts) sh.getRange(i + 1, 5).setValue(payload.accounts);
      sh.getRange(i + 1, 6).setValue('approved');
      sh.getRange(i + 1, 8).setValue(ctx.ident.email);
      logActivity_(ctx.ident.email, 'APPROVE_USER', rows[i][0], old[5], 'approved', payload.role || rows[i][2]);
      notify_(rows[i][0], 'Welcome to the M98M Portal', 'Your access is approved. Role: ' + (payload.role || rows[i][2]) + '.', 'approved');
      return { ok: true, email: rows[i][0] };
    }
  }
  throw new Error('user not found');
}

// ---------- helpers ----------
function readTab_(name) {
  if (Object.prototype.hasOwnProperty.call(EXEC_TABS, name)) return EXEC_TABS[name];
  const sheet = getPortalDb_(false).getSheetByName(name);
  if (!sheet) throw new Error('unknown tab: ' + name);
  const vals = sheet.getDataRange().getValues();
  let out = [];
  if (vals.length >= 2) {
    const head = vals[0];
    out = vals.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
      const o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
    });
  }
  // Only the read-mostly tabs are held for the rest of the request; everything else is re-read
  // each time so a handler that writes and then reads still sees its own change.
  if (EXEC_MEMO_TABS.indexOf(name) >= 0) EXEC_TABS[name] = out;
  return out;
}
function notify_(toEmail, type, message, ref) {
  getPortalDb_(false).getSheetByName('NOTIFICATIONS').appendRow(['N' + Utilities.getUuid().slice(0, 8), toEmail, 'system', type, message, ref || '', now_(), '']);
}
function notifyManagement_(type, message, ref) {
  const mgmt = readTab_('USERS').filter(function (u) { return MGMT_ROLES.indexOf(u.role) >= 0 && String(u.status) === 'approved'; }).map(function (u) { return u.email; });
  SUPER_ADMINS.forEach(function (e) { if (mgmt.indexOf(e) < 0) mgmt.push(e); });
  mgmt.forEach(function (e) { notify_(e, type, message, ref); });
}
