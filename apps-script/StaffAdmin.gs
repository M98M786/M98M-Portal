/** Phase 6 — §4.1b staff lifecycle and §3 accounts admin: the screens Management uses to run
 * the team. Add a person straight in as approved, edit them, Remove (= deactivate) them, hand
 * their open work to someone else in one call, and keep the eBay accounts + their four sheet
 * links (§6) as data rows rather than code.
 *
 * RL-5 needs nothing extra here. The router reads the USERS row fresh on every request
 * (Router.gs loadUser_), so writing status=disabled below already blocks a live session on its
 * very next request. Do not add a second invalidation mechanism — a second one can only
 * disagree with the first, and the first is the one the whole portal already trusts.
 *
 * Deactivation also removes the person from the rota, the assignment pickers and the checkpoint
 * grids without any code here: every one of those screens selects on status === 'approved'
 * (Auth.gs assignableStaff, Schedules.gs rotaGrid, Reports.gs grids, and the queues in Orders,
 * CS, Advertising, Hunting, PotentialCpc, CpcResearch, Recheck, RulesAck, Meetings). */

// §7 USERS vocabulary. 'disabled' is the tombstone — §16.2 forbids hard deletes, so a person is
// never removed from the tab, and Schedules.gs already refuses to schedule this status.
const SADM_STATUS_APPROVED = 'approved';
const SADM_STATUS_PENDING = 'pending';
const SADM_STATUS_DISABLED = 'disabled';

// §3 word for an account kept for its history (Yasin Bhai, Imtiaz Bhai) but out of new work.
const SADM_STATUS_ARCHIVED = 'archived';

// §7 TASKS vocabulary — anything that is not Completed is still open work to hand over.
const SADM_TASK_DONE = 'Completed';

// RL-6 column ownership: the only USERS columns this module writes, and the two that a super
// admin alone may touch (§4.1 — role and email changes are super-admin only).
const SADM_USER_WRITABLE = ['name', 'shift', 'accounts_access', 'status', 'approved_by', 'deactivated_at', 'notes', 'modules', 'tools'];
const SADM_USER_SUPER_ONLY = ['email', 'role'];
const SADM_TOOL_KINDS = ['tool_listing','tool_defense','tool_reply','tool_recovery','tool_cpc_keyword','tool_order_ops'];

// RL-6 column ownership for the handover: assigned_to and nothing else. In particular NOT
// updated_at — while a task is Working that column is the start-of-stint stamp Tasks.gs reads to
// close the clock, so stamping it here would silently rewrite someone's time_taken_min.
const SADM_TASK_WRITABLE = ['assigned_to'];

// §4.1b, verbatim: what the portal shows the moment someone is removed.
const SADM_OFFBOARDING = [
  'Reassign open tasks',
  'Change the password of their m98m company Gmail',
  'Remove them from external tools (e.g. the Listing Tool member list)',
  'Note the removal in the staff performance sheet',
];

const SADM_MAX_NOTE = 1000;

// ---------- permission ----------
/** Staff administration is Management (or a super admin) — deliberately NARROWER than isMgmt_,
 * which counts Ops Head as management. §4.4 lists user-role management and account/sheet/tab
 * admin among the things the Ops Head does NOT get, so this module cannot use isMgmt_. */
function sadmIsManagement_(ctx) {
  return isSuperAdmin(ctx.ident.email) || String(ctx.user.role) === 'Management';
}
function sadmAssertStaffAdmin_(ctx) {
  if (!sadmIsManagement_(ctx)) throw authErr_('not staff admin', ctx.ident.email);
}
function sadmAssertSuper_(ctx) {
  if (!isSuperAdmin(ctx.ident.email)) throw authErr_('not super admin', ctx.ident.email);
}

// ---------- validation ----------
function sadmEmail_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) throw new Error(SAFE_ERROR_PREFIX + 'email required');
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(s)) throw new Error(SAFE_ERROR_PREFIX + 'that is not a valid email address');
  return s;                                          // stored as given, matched normalized (§4.1)
}
function sadmRole_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (ROLES.indexOf(s) < 0) throw new Error(SAFE_ERROR_PREFIX + 'unknown role');
  return s;
}
function sadmShiftLabels_() {
  // Read at call time, never at load time: a top-level const in one file may still be in its
  // temporal dead zone while another file's top-level const is being initialised.
  return typeof SCHEDULE_SHIFT_LABELS !== 'undefined' ? SCHEDULE_SHIFT_LABELS : ['Shift 1', 'Shift 2', 'Custom'];
}
function sadmShift_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) return '';                                 // §5: Management may set the timetable later
  if (sadmShiftLabels_().indexOf(s) < 0) throw new Error(SAFE_ERROR_PREFIX + 'unknown shift');
  return s;
}
function sadmText_(raw, max) {
  return String(raw === null || raw === undefined ? '' : raw).trim().slice(0, max || 300);
}

/** The account names the portal actually knows, from CONNECTIONS — never a hardcoded list (§3). */
function sadmAccountNames_() {
  const seen = {}, out = [];
  readTab_('CONNECTIONS').forEach(function (r) {
    if (String(r.scope || '').trim() !== 'account') return;
    const name = String(r.account_name || '').trim();
    if (!name) return;
    const key = bridgeNormalizeHeader_(name);
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(name);
  });
  out.sort();
  return out;
}

/** accounts_access: 'ALL', 'per-role', or a comma list of real account names. A typed name is
 * matched with the same rule bridgeResolveSheetId_ uses and stored back in the registry's own
 * wording ('AZHAR ABRT', not 'abrt'), so a scoping check later resolves to that account rather
 * than silently to none. 'per-role' and 'ALL' are the seed placeholders every scoping check
 * reads as "not scoped yet". */
function sadmAccounts_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) return 'per-role';
  if (s.toUpperCase() === 'ALL') return 'ALL';
  if (s.toLowerCase() === 'per-role') return 'per-role';
  const known = sadmAccountNames_();
  const out = [];
  s.split(',').forEach(function (part) {
    const want = String(part).trim();
    if (!want) return;
    let hit = '';
    known.forEach(function (k) {
      if (!hit && bridgeNormalizeHeader_(k) === bridgeNormalizeHeader_(want)) hit = k;
    });
    if (!hit) throw new Error(SAFE_ERROR_PREFIX + 'unknown account: ' + want);
    if (out.indexOf(hit) < 0) out.push(hit);
  });
  return out.length ? out.join(',') : 'per-role';
}

// ---------- USERS row access ----------
function sadmUsersSheet_() { return getPortalDb_(false).getSheetByName('USERS'); }

function sadmFind_(sh, email) {
  const n = normalizeEmail(email);
  if (!n) throw new Error(SAFE_ERROR_PREFIX + 'email required');
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(function (h) { return String(h); });
  for (let i = 1; i < vals.length; i++) {
    if (normalizeEmail(vals[i][0]) !== n) continue;
    const rec = {};
    head.forEach(function (h, c) { rec[h] = vals[i][c]; });
    return { row: i + 1, head: head, rec: rec, vals: vals };
  }
  throw new Error(SAFE_ERROR_PREFIX + 'no portal user with that email');
}

/** RL-6: a write to any column outside the whitelist throws. extra carries the super-admin-only
 * columns when the caller has already proved super-admin rights. */
function sadmWrite_(sh, found, patch, extra) {
  const allowed = SADM_USER_WRITABLE.concat(extra || []);
  Object.keys(patch).forEach(function (k) {
    if (allowed.indexOf(k) < 0) throw new Error('write outside the USERS whitelist: ' + k);
    const c = found.head.indexOf(k);
    if (c < 0) throw new Error('unknown USERS column: ' + k);
    const cell = sh.getRange(found.row, c + 1);
    // A name or a note typed as "=..." becomes a live formula in the Portal DB unless the cell
    // is text first: Sheets does the reinterpreting, not the portal.
    if (typeof patch[k] === 'string') cell.setNumberFormat('@');
    cell.setValue(patch[k]);
  });
}

function sadmNote_(existing, line) {
  const prior = String(existing || '').trim();
  return (prior ? prior + ' · ' : '') + line;
}

/* ---------- V2 modules & tools (contract §5 req 8/24/26) ---------- */
/** CSV of module keys; '-key' subtracts a role default. Unknown keys THROW so a typo in the
 * desk can never silently grant nothing. */
function sadmModules_(v) {
  const keys = parseAccessCsv_(v);
  keys.forEach(function (k) {
    const bare = k.charAt(0) === '-' ? k.slice(1) : k;
    if (!MODULE_KEYS[bare]) throw new Error(SAFE_ERROR_PREFIX + 'unknown module: ' + bare);
  });
  return keys.join(',');
}

function sadmTools_(v) {
  const keys = parseAccessCsv_(v);
  keys.forEach(function (k) {
    const bare = k.charAt(0) === '-' ? k.slice(1) : k;
    if (SADM_TOOL_KINDS.indexOf(bare) < 0) throw new Error(SAFE_ERROR_PREFIX + 'unknown tool: ' + bare);
  });
  return keys.join(',');
}

/** The desk's one read: every active/pending person with their access, plus the registries the
 * checkboxes are built from. Also the self-healing migration — appends the two V2 columns to an
 * older USERS sheet the first time Management opens the desk. */
function actionStaffDirectory_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const sh = sadmUsersSheet_();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  ['modules', 'tools'].forEach(function (col) {
    if (head.indexOf(col) < 0) {
      sh.getRange(1, head.length + 1).setValue(col);
      head.push(col);
      logActivity_(ctx.ident.email, 'USERS_MIGRATE_V2', col, '', 'column appended', '');
    }
  });
  sadmForgetUsers_();
  const staff = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) === SADM_STATUS_DISABLED) return;
    staff.push({ email: String(u.email || ''), name: String(u.name || ''), role: String(u.role || ''),
      shift: String(u.shift || ''), status: String(u.status || ''), accounts: String(u.accounts_access || ''),
      modules: parseAccessCsv_(u.modules), tools: parseAccessCsv_(u.tools) });
  });
  return { staff: staff, module_registry: MODULE_KEYS, tool_registry: SADM_TOOL_KINDS,
    roles: ROLES, may_set_roles: isSuperAdmin(ctx.ident.email) };
}

/** USERS is memoised for the rest of the request (Setup.gs EXEC_MEMO_TABS), so anything reading
 * it after a write here — the rota, the welcome message, the archive — must be told to re-read. */
function sadmForgetUsers_() {
  if (typeof execForgetTab_ === 'function') execForgetTab_('USERS');
}

function sadmOpenTasksFor_(email) {
  const n = normalizeEmail(email), out = [];
  readTab_('TASKS').forEach(function (t) {
    if (normalizeEmail(t.assigned_to) !== n) return;
    if (String(t.status || '') === SADM_TASK_DONE) return;
    // Sheets may hand back a deadline as a Date; Tasks.gs owns the PKT rendering rule (§2).
    const dl = (typeof taskPktIso_ === 'function') ? taskPktIso_(t.deadline_pkt) : String(t.deadline_pkt || '');
    out.push({
      task_id: String(t.task_id || ''), type: String(t.type || ''), title: String(t.title || ''),
      account: String(t.account || ''), status: String(t.status || ''), deadline_pkt: dl,
    });
  });
  return out;
}

/** The SOP titles a new colleague is pointed at (§4.1b welcome). §26.2b decides visibility. */
function sadmSopTitles_(dept) {
  const out = [];
  readTab_('SOPS').forEach(function (s) {
    if (!s.sop_id) return;
    const d = String(s.dept || 'ALL');
    const visible = (typeof rulesVisible_ === 'function') ? rulesVisible_(d, dept) : (d === 'ALL' || dept === '*' || d === dept);
    if (visible) out.push(String(s.title || ''));
  });
  return out;
}

// ---------- §4.1b ADD ----------
/** Management creates the user directly as approved — no waiting for a self-registration that
 * may never come. The registration + approval queue (Auth.gs) stays as the second path in. */
function actionAddStaff_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const email = sadmEmail_(payload.email);
  const name = sadmText_(payload.name, 120);
  if (!name) throw new Error(SAFE_ERROR_PREFIX + 'name required');
  const role = sadmRole_(payload.role);
  // Handing out a management-tier role creates someone who can do to people what a super admin
  // can; §4.1 keeps role granting with the two super admins, so the add path honours it too.
  if (MGMT_ROLES.indexOf(role) >= 0 && !isSuperAdmin(ctx.ident.email)) {
    throw authErr_('management-tier role granted by non-super admin', ctx.ident.email);
  }
  const shift = sadmShift_(payload.shift);
  const accounts = sadmAccounts_(payload.accounts);
  const notes = sadmText_(payload.notes, 300);
  const cols = DB_TABS.USERS;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = sadmUsersSheet_();
    const vals = sh.getDataRange().getValues();
    const n = normalizeEmail(email);
    for (let i = 1; i < vals.length; i++) {
      if (normalizeEmail(vals[i][0]) !== n) continue;
      if (String(vals[i][5]) === SADM_STATUS_DISABLED) {
        throw new Error(SAFE_ERROR_PREFIX + 'that person is in Removed staff — reactivate them instead of adding them again');
      }
      throw new Error(SAFE_ERROR_PREFIX + 'that email is already a portal user');
    }
    const row = [email, name, role, shift, accounts, SADM_STATUS_APPROVED, now_(), ctx.ident.email, '',
      sadmNote_(notes, 'added by ' + ctx.ident.email + ' (§4.1b)')];
    const r = sh.getLastRow() + 1;
    // Name and notes are typed text: format the cells first so a value beginning with '=' cannot
    // be reinterpreted as a live formula by the sheet.
    sh.getRange(r, cols.indexOf('name') + 1).setNumberFormat('@');
    sh.getRange(r, cols.indexOf('notes') + 1).setNumberFormat('@');
    sh.getRange(r, 1, 1, cols.length).setValues([row]);
  } finally { lock.releaseLock(); }

  sadmForgetUsers_();
  logActivity_(ctx.ident.email, 'ADD_STAFF', email, '', role + '|' + SADM_STATUS_APPROVED,
    'shift ' + (shift || 'not set') + ' · accounts ' + accounts);

  // The rota is §5's job and it already validates hours, breaks and checkpoints — call it rather
  // than growing a second timetable writer here.
  let schedule = null, checkpoints = [], scheduleNote = '';
  if (shift && typeof actionSetSchedule_ === 'function') {
    try {
      const res = actionSetSchedule_({
        email: email, shift_label: shift, effective_from: payload.effective_from,
        work_start: payload.work_start, work_end: payload.work_end,
        break_start: payload.break_start, break_end: payload.break_end,
        working_days: payload.working_days,
      }, ctx);
      schedule = res.schedule;
      checkpoints = res.checkpoints || [];
    } catch (e) {
      // A timetable that will not take (a Custom shift with no hours) must not undo the account.
      scheduleNote = 'timetable not set yet — do it on the rota screen';
      logActivity_(ctx.ident.email, 'ADD_STAFF_NO_SCHEDULE', email, '', shift, String(e && e.message || e));
    }
  } else if (!shift) {
    scheduleNote = 'timetable not set yet — do it on the rota screen';
  }

  const sops = sadmSopTitles_(roleDept_(role));
  const timetable = schedule
    ? schedule.shift_label + ' · ' + schedule.work_start + '–' + schedule.work_end +
      (checkpoints.length ? ' · checkpoints ' + checkpoints.join(', ') : '')
    : 'Management will set your timetable on the rota screen';
  notify_(email, 'Welcome to the M98M Portal',
    'You are set up as ' + role + '. Timetable: ' + timetable + '. ' +
    (sops.length ? 'Your SOPs (open the SOPs screen to read them in full): ' + sops.join(' · ') + '.'
                 : 'Your SOPs appear on the SOPs screen.'),
    'welcome:' + normalizeEmail(email));
  notifyManagement_('Staff added', name + ' (' + email + ') was added as ' + role + ' by ' + ctx.ident.email,
    'staff:' + normalizeEmail(email));

  return stripForRole_({
    ok: true, email: email, name: name, role: role, shift: shift, accounts: accounts,
    status: SADM_STATUS_APPROVED, schedule: schedule, checkpoints: checkpoints,
    schedule_note: scheduleNote, sops: sops,
  }, ctx.user.role, ctx.ident.email);
}

// ---------- §4.1b UPDATE ----------
/** Management edits any field; role and email stay super-admin only (§4.1). Every change lands
 * in ACTIVITY_LOG as its own old→new row and the person is told what changed. */
function actionUpdateStaff_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const target = normalizeEmail(payload.email || '');
  if (!target) throw new Error(SAFE_ERROR_PREFIX + 'email required');
  const superAdmin = isSuperAdmin(ctx.ident.email);

  const patch = {}, changes = [];

  if (payload.role !== undefined) {
    if (!superAdmin) throw authErr_('role change by non-super admin', ctx.ident.email);
    if (isSuperAdmin(target)) throw new Error(SAFE_ERROR_PREFIX + 'a super admin\'s rights come from CONFIG super_admins, not from this field');
    patch.role = sadmRole_(payload.role);
  }
  if (payload.new_email !== undefined && String(payload.new_email).trim() !== '') {
    if (!superAdmin) throw authErr_('email change by non-super admin', ctx.ident.email);
    const em = sadmEmail_(payload.new_email);
    if (normalizeEmail(em) !== target) patch.email = em;
  }
  if (payload.name !== undefined) {
    const nm = sadmText_(payload.name, 120);
    if (!nm) throw new Error(SAFE_ERROR_PREFIX + 'name cannot be blank');
    patch.name = nm;
  }
  if (payload.shift !== undefined) patch.shift = sadmShift_(payload.shift);
  if (payload.accounts !== undefined) patch.accounts_access = sadmAccounts_(payload.accounts);
  if (payload.notes !== undefined) patch.notes = sadmText_(payload.notes, SADM_MAX_NOTE);
  if (payload.modules !== undefined) patch.modules = sadmModules_(payload.modules);
  if (payload.tools !== undefined) patch.tools = sadmTools_(payload.tools);
  if (!Object.keys(patch).length) throw new Error(SAFE_ERROR_PREFIX + 'nothing to change');

  let person = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = sadmUsersSheet_();
    const found = sadmFind_(sh, target);
    person = { email: String(found.rec.email || ''), name: String(found.rec.name || '') };
    if (String(found.rec.status) === SADM_STATUS_DISABLED) {
      throw new Error(SAFE_ERROR_PREFIX + 'that person is removed — reactivate them before editing');
    }
    if (patch.email) {
      const vals = found.vals;                          // already read once, inside this lock
      const wanted = normalizeEmail(patch.email);
      for (let i = 1; i < vals.length; i++) {
        if (i + 1 !== found.row && normalizeEmail(vals[i][0]) === wanted) {
          throw new Error(SAFE_ERROR_PREFIX + 'another portal user already has that email');
        }
      }
      // Past work stays under the address it was done with: TASKS, REPORTS_2H, MESSAGES and
      // ACTIVITY_LOG are append-only (RL-6), so rewriting history to match a new address is not
      // on offer. The old address is kept on the row so the two can be joined by a human.
      patch.notes = sadmNote_(patch.notes !== undefined ? patch.notes : found.rec.notes,
        'email changed from ' + String(found.rec.email || '') + ' on ' + now_());
    }
    Object.keys(patch).forEach(function (k) {
      const before = String(found.rec[k] === undefined ? '' : found.rec[k]);
      const after = String(patch[k]);
      if (before !== after) changes.push({ field: k, old: before, new: after });
    });
    if (!changes.length) throw new Error(SAFE_ERROR_PREFIX + 'nothing to change');
    sadmWrite_(sh, found, patch, superAdmin ? SADM_USER_SUPER_ONLY : []);
  } finally { lock.releaseLock(); }

  sadmForgetUsers_();
  changes.forEach(function (c) {
    logActivity_(ctx.ident.email, 'UPDATE_STAFF:' + c.field, person.email, c.old, c.new, '');
  });
  const summary = changes.map(function (c) {
    return c.field + ': ' + (c.old || '(blank)') + ' → ' + (c.new || '(blank)');
  }).join(' · ');
  notify_(patch.email || person.email, 'Your portal details were updated', summary, 'staff:' + target);

  const out = { ok: true, email: patch.email || person.email, changes: changes };
  // §5: the authoritative timetable is the SCHEDULES row, not this label — the rota screen sets it.
  if (patch.shift !== undefined) out.schedule_note = 'shift label changed — set the hours on the rota screen';
  if (patch.email) out.history_stays_under = person.email;
  return stripForRole_(out, ctx.user.role, ctx.ident.email);
}

// ---------- §4.1b REMOVE (= deactivate) ----------
/** The button says Remove; nothing is deleted (§16.2). Sign-in is blocked from the next request
 * (RL-5, enforced by the router's fresh USERS read — see the file header). */
function actionDeactivateStaff_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const target = normalizeEmail(payload.email || '');
  if (!target) throw new Error(SAFE_ERROR_PREFIX + 'email required');
  if (target === normalizeEmail(ctx.ident.email)) throw new Error(SAFE_ERROR_PREFIX + 'you cannot remove yourself');
  if (isSuperAdmin(target)) {
    throw new Error(SAFE_ERROR_PREFIX + 'a super admin is removed by editing CONFIG super_admins, not from this screen');
  }
  const reason = sadmText_(payload.reason, 300);
  const stamp = now_();
  let person = null, before = '';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = sadmUsersSheet_();
    const found = sadmFind_(sh, target);
    before = String(found.rec.status || '');
    if (before === SADM_STATUS_DISABLED) throw new Error(SAFE_ERROR_PREFIX + 'that person is already removed');
    person = { email: String(found.rec.email || ''), name: String(found.rec.name || ''), role: String(found.rec.role || '') };
    sadmWrite_(sh, found, {
      status: SADM_STATUS_DISABLED,
      deactivated_at: stamp,
      notes: sadmNote_(found.rec.notes, 'removed by ' + ctx.ident.email + ' on ' + stamp + (reason ? ' — ' + reason : '')).slice(0, SADM_MAX_NOTE),
    });
  } finally { lock.releaseLock(); }

  sadmForgetUsers_();
  logActivity_(ctx.ident.email, 'DEACTIVATE_STAFF', person.email, before, SADM_STATUS_DISABLED, reason);
  // Written even though they can no longer sign in: NOTIFICATIONS is part of the audit trail
  // §4.1b preserves, and it records that the removal was communicated.
  notify_(person.email, 'Your portal access has ended',
    'Your M98M Portal access was removed on ' + stamp + '.' + (reason ? ' Reason: ' + reason : ''), 'staff:' + target);
  notifyManagement_('Staff removed', person.name + ' (' + person.email + ', ' + person.role + ') was removed by ' + ctx.ident.email,
    'staff:' + target);

  const open = sadmOpenTasksFor_(person.email);
  return stripForRole_({
    ok: true, email: person.email, name: person.name, role: person.role,
    status: SADM_STATUS_DISABLED, deactivated_at: stamp,
    open_tasks: open, open_task_count: open.length,
    offboarding: SADM_OFFBOARDING,
    note: 'Their reports, messages, tasks and history are kept read-only for audit. Nothing is ever purged.',
  }, ctx.user.role, ctx.ident.email);
}

/** §4.1b — Reactivate lives in the Removed staff archive and is a super admin's call alone. */
function actionReactivateStaff_(payload, ctx) {
  sadmAssertSuper_(ctx);
  const target = normalizeEmail(payload.email || '');
  if (!target) throw new Error(SAFE_ERROR_PREFIX + 'email required');
  const stamp = now_();
  let person = null, before = '';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = sadmUsersSheet_();
    const found = sadmFind_(sh, target);
    before = String(found.rec.status || '');
    const wasRemoved = before === SADM_STATUS_DISABLED || String(found.rec.deactivated_at || '') !== '';
    if (!wasRemoved) throw new Error(SAFE_ERROR_PREFIX + 'that person is not in Removed staff');
    if (before === SADM_STATUS_APPROVED) throw new Error(SAFE_ERROR_PREFIX + 'that person can already sign in');
    person = { email: String(found.rec.email || ''), name: String(found.rec.name || ''), role: String(found.rec.role || '') };
    sadmWrite_(sh, found, {
      status: SADM_STATUS_APPROVED,
      deactivated_at: '',
      approved_by: ctx.ident.email,
      notes: sadmNote_(found.rec.notes, 'reactivated by ' + ctx.ident.email + ' on ' + stamp).slice(0, SADM_MAX_NOTE),
    });
  } finally { lock.releaseLock(); }

  sadmForgetUsers_();
  logActivity_(ctx.ident.email, 'REACTIVATE_STAFF', person.email, before, SADM_STATUS_APPROVED, '');
  notify_(person.email, 'Your portal access is restored',
    'You can sign in again. Role: ' + person.role + '. Check your timetable on the rota screen.', 'staff:' + target);
  notifyManagement_('Staff reactivated', person.name + ' (' + person.email + ') was reactivated by ' + ctx.ident.email, 'staff:' + target);

  return stripForRole_({ ok: true, email: person.email, name: person.name, role: person.role, status: SADM_STATUS_APPROVED },
    ctx.user.role, ctx.ident.email);
}

/** §4.1b — the "Removed staff" archive. Reactivate is offered to a super admin only and there is
 * no permanent purge here by design. The counts prove the audit trail is intact rather than
 * asserting it. */
function actionRemovedStaff_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const canReactivate = isSuperAdmin(ctx.ident.email);
  const rows = [];
  readTab_('USERS').forEach(function (u) {
    const status = String(u.status || '');
    const off = String(u.deactivated_at || '').trim();
    if (status !== SADM_STATUS_DISABLED && !off) return;
    rows.push({
      email: String(u.email || ''), name: String(u.name || ''), role: String(u.role || ''),
      accounts: String(u.accounts_access || ''), joined_at: String(u.joined_at || ''),
      deactivated_at: off, status: status, notes: String(u.notes || ''),
      // A removed person who signs in again can put their own row back in the approval queue
      // (Auth.gs register), where it reads exactly like a new hire. Surfaced here so the person
      // approving can see that this one was removed before.
      re_registered: off !== '' && status === SADM_STATUS_PENDING,
      open_tasks: 0, tasks_total: 0, reports_total: 0,
      can_reactivate: canReactivate,
    });
  });
  if (!rows.length) {
    return { removed: [], can_reactivate: canReactivate, offboarding: SADM_OFFBOARDING };
  }

  const index = {};
  rows.forEach(function (r) { index[normalizeEmail(r.email)] = r; });
  readTab_('TASKS').forEach(function (t) {
    const hit = index[normalizeEmail(t.assigned_to)];
    if (!hit) return;
    hit.tasks_total++;
    if (String(t.status || '') !== SADM_TASK_DONE) hit.open_tasks++;
  });
  readTab_('REPORTS_2H').forEach(function (r) {
    const hit = index[normalizeEmail(r.email)];
    if (hit) hit.reports_total++;
  });
  rows.sort(function (a, b) { return a.deactivated_at < b.deactivated_at ? 1 : a.deactivated_at > b.deactivated_at ? -1 : 0; });

  return {
    removed: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    can_reactivate: canReactivate,
    offboarding: SADM_OFFBOARDING,
    note: 'Nothing is ever purged: every row above keeps its reports, messages, tasks and history read-only for audit.',
  };
}

// ---------- §4.1b REASSIGN ----------
/** One call moves every open task off a removed person. task_ids narrows it to a subset when
 * Management wants to split the work between several people. */
function actionReassignTasks_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const from = normalizeEmail(payload.from_email || '');
  const to = normalizeEmail(payload.to_email || '');
  if (!from || !to) throw new Error(SAFE_ERROR_PREFIX + 'pick who the tasks come from and who they go to');
  if (from === to) throw new Error(SAFE_ERROR_PREFIX + 'pick a different person to take the work');

  let owner = null;
  readTab_('USERS').forEach(function (u) {
    if (owner) return;
    if (normalizeEmail(u.email) === to && String(u.status) === SADM_STATUS_APPROVED) {
      owner = { email: String(u.email), name: String(u.name || u.email) };
    }
  });
  if (!owner) throw new Error(SAFE_ERROR_PREFIX + 'the new owner is not an approved portal user');

  const wanted = Array.isArray(payload.task_ids)
    ? payload.task_ids.map(function (id) { return String(id || '').trim(); }).filter(function (id) { return id !== ''; })
    : null;
  if (SADM_TASK_WRITABLE.indexOf('assigned_to') < 0) throw new Error('write outside the TASKS whitelist: assigned_to');

  const moved = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('TASKS');
    const vals = sh.getDataRange().getValues();
    const head = vals[0].map(function (h) { return String(h); });
    const cAssigned = head.indexOf('assigned_to');
    const cId = head.indexOf('task_id'), cStatus = head.indexOf('status'), cTitle = head.indexOf('title');
    if (cAssigned < 0 || cId < 0 || cStatus < 0) throw new Error('unknown TASKS column');

    const hits = [];
    for (let i = 1; i < vals.length; i++) {
      if (normalizeEmail(vals[i][cAssigned]) !== from) continue;
      const status = String(vals[i][cStatus] || '');
      if (status === SADM_TASK_DONE) continue;
      const id = String(vals[i][cId] || '');
      if (wanted && wanted.indexOf(id) < 0) continue;
      hits.push(i);
      moved.push({ task_id: id, title: cTitle >= 0 ? String(vals[i][cTitle] || '') : '', status: status });
    }
    if (!hits.length) throw new Error(SAFE_ERROR_PREFIX + 'that person has no open tasks to move');

    // One write for any number of tasks. A setValue per task inside the loop turns a thirty-task
    // handover into thirty locked round trips; the untouched cells inside the block are written
    // back exactly as they were read, microseconds earlier, inside this same lock.
    const first = hits[0], last = hits[hits.length - 1];
    const marked = {};
    hits.forEach(function (i) { marked[i] = true; });
    const column = [];
    for (let i = first; i <= last; i++) column.push([marked[i] ? owner.email : vals[i][cAssigned]]);
    sh.getRange(first + 1, cAssigned + 1, column.length, 1).setValues(column);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'REASSIGN_TASKS', from, from, owner.email,
    moved.length + ' task(s): ' + moved.map(function (m) { return m.task_id; }).join(','));
  // One notification carrying the whole handover, not one per task — a person taking over ten
  // tasks needs one clear message, and ten appended rows is ten writes.
  notify_(owner.email, 'Open tasks reassigned to you',
    moved.length + ' open task(s) moved to you: ' + moved.map(function (m) { return m.title || m.task_id; }).join(' · '),
    'reassign:' + from);

  return stripForRole_({ ok: true, from: from, to: owner.email, count: moved.length, moved: moved },
    ctx.user.role, ctx.ident.email);
}

// ---------- §3 / §6 ACCOUNTS ADMIN ----------
function sadmConnSheet_() { return getPortalDb_(false).getSheetByName('CONNECTIONS'); }

/** CONNECTIONS is memoised for the rest of the request and SheetBridge keeps its own copy —
 * both must be dropped after a write or the screen redraws from the state before it. */
function sadmForgetConnections_() {
  if (typeof execForgetTab_ === 'function') execForgetTab_('CONNECTIONS');
  if (typeof bridgeConnCache_ !== 'undefined') bridgeConnCache_ = null;
}

function sadmSheetId_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) return '';
  const fromUrl = (typeof extractSheetId_ === 'function') ? extractSheetId_(s) : '';
  if (fromUrl) return fromUrl;
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;      // a bare id pasted instead of the whole URL
  throw new Error(SAFE_ERROR_PREFIX + 'that does not look like a Google Sheets link');
}

/** §6: a link the portal cannot open is not a connection. The id is stored anyway — throwing it
 * away would make the fix harder — so the row's own status, not the presence of an id, is what
 * this screen believes. */
function sadmLinkStatus_(id) {
  if (!id) return 'not connected yet';
  const ss = (typeof bridgeOpenSs_ === 'function') ? bridgeOpenSs_(id) : null;
  return ss ? 'linked' : 'not connected yet';
}

/** RL-9 keeps the map to the business data off the wire for anyone who cannot change it anyway:
 * the full spreadsheet id goes only to a super admin, everyone else gets a tail to tell rows apart. */
function sadmIdOut_(id, canEdit) {
  const s = String(id || '');
  if (!s) return { spreadsheet_id: '', id_tail: '' };
  return canEdit ? { spreadsheet_id: s, id_tail: s.slice(-6) } : { spreadsheet_id: '', id_tail: s.slice(-6) };
}

/** §3 + §6 — the accounts screen and the connection-health checklist in one read. */
function actionAccountsAdmin_(payload, ctx) {
  sadmAssertStaffAdmin_(ctx);
  const canEdit = isSuperAdmin(ctx.ident.email);
  const rows = readTab_('CONNECTIONS');
  // The account part of the key is normalized on both sides: the registry's own names carry
  // trailing spaces ('Sir Hasib ') and connectionHealth reports them exactly as stored.
  const byKey = {};
  rows.forEach(function (r) {
    const key = String(r.scope || '').trim() + '|' + bridgeNormalizeHeader_(r.account_name) + '|' + String(r.sheet_kind || '').trim();
    byKey[key] = r;
  });
  // §6's completeness rule lives in connectionHealth() — reused, never re-derived, so the two
  // screens can never disagree about what 4/4 and 11/11 mean.
  const health = connectionHealth();

  const accounts = (health.perAccount || []).map(function (a) {
    let archived = 0;
    const items = a.items.map(function (it) {
      const r = byKey['account|' + bridgeNormalizeHeader_(a.account) + '|' + it.kind] || {};
      const rowStatus = String(r.status || '').trim();
      if (rowStatus === SADM_STATUS_ARCHIVED) archived++;
      const idOut = sadmIdOut_(r.spreadsheet_id, canEdit);
      return {
        kind: it.kind, status: rowStatus || it.status, notes: String(r.notes || ''),
        spreadsheet_id: idOut.spreadsheet_id, id_tail: idOut.id_tail,
      };
    });
    return {
      account: a.account, linked: a.linked, of: a.of, items: items,
      archived: archived > 0 && archived === items.length,
      complete: a.linked === a.of,
    };
  });

  const globals = (health.globals || []).map(function (g) {
    const r = byKey['global||' + g.kind] || {};                       // globals carry no account name
    const idOut = sadmIdOut_(r.spreadsheet_id, canEdit);
    return {
      kind: g.kind, status: String(r.status || '').trim() || g.status, notes: String(r.notes || ''),
      spreadsheet_id: idOut.spreadsheet_id, id_tail: idOut.id_tail,
    };
  });

  const live = accounts.filter(function (a) { return !a.archived; });
  return {
    accounts: stripForRole_(accounts, ctx.user.role, ctx.ident.email),
    globals: stripForRole_(globals, ctx.user.role, ctx.ident.email),
    sheet_kinds: ACCOUNT_SHEET_KINDS,
    global_kinds: GLOBAL_KINDS,
    globals_linked: health.globalsLinked, globals_of: health.globalsOf,
    can_edit: canEdit,
    // §6: setup is not complete until every active account shows 4/4 and the globals show 11/11.
    complete: live.length > 0 && live.every(function (a) { return a.complete; }) && health.globalsLinked === health.globalsOf,
  };
}

/** §3 + §6 — add, rename or archive an account and its four sheet links in one call, or set a
 * single global connection. Accounts are data rows: nothing here is hardcoded, and archiving
 * keeps the links so a historical account's data (Yasin Bhai, Imtiaz Bhai in the order-check
 * workbooks) stays readable. Super admin only (§4.1). */
function actionSaveAccount_(payload, ctx) {
  sadmAssertSuper_(ctx);
  const scope = String(payload.scope || 'account').trim() === 'global' ? 'global' : 'account';
  const notes = sadmText_(payload.notes, 300);
  const done = [], unreadable = [];
  let account = '', renamedTo = '';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const conn = sadmConnSheet_();
    const vals = conn.getDataRange().getValues();
    // Keyed exactly as Registry.gs upsert_ keys it — scope|account_name|kind on the stored
    // strings — so an existing row is rewritten in place instead of appended a second time.
    const existing = {};
    for (let i = 1; i < vals.length; i++) {
      existing[String(vals[i][1]) + '|' + String(vals[i][2]) + '|' + String(vals[i][3])] = i + 1;
    }
    const notesFor = function (key) {
      const r = existing[key];
      return notes || (r ? String(vals[r - 1][6] || '') : '');
    };

    if (scope === 'global') {
      const kind = String(payload.kind || '').trim();
      if (GLOBAL_KINDS.indexOf(kind) < 0) throw new Error(SAFE_ERROR_PREFIX + 'unknown sheet kind');
      const id = sadmSheetId_(payload.link);
      const status = sadmLinkStatus_(id);
      if (id && status !== 'linked') unreadable.push(kind);
      // Registry.gs upsert_ is the one CONNECTIONS writer: same row shape, same CONNECTION_CHANGE
      // log line whether a row arrives from the registry import or from this screen.
      upsert_(conn, existing, 'global', '', kind, id, status, notesFor('global||' + kind));
      done.push(kind);
    } else {
      account = sadmText_(payload.account, 120);
      if (!account) throw new Error(SAFE_ERROR_PREFIX + 'account name required');
      // An account that already exists keeps the spelling the registry gave it ('AZHAR ABRT',
      // 'Sir Hasib ' with its trailing space). Matching on the normalized form but then writing
      // back the typed form would rename an account nobody asked to rename.
      const want = bridgeNormalizeHeader_(account);
      let stored = '';
      for (let i = 1; i < vals.length; i++) {
        if (String(vals[i][1]) !== 'account') continue;
        if (bridgeNormalizeHeader_(vals[i][2]) === want) { stored = String(vals[i][2]); break; }
      }
      const isNew = stored === '';
      if (stored) account = stored;

      // Rename: every row of the account moves together, so the four links follow the new name.
      const wantName = sadmText_(payload.new_name, 120);
      if (wantName && bridgeNormalizeHeader_(wantName) !== want) {
        if (isNew) throw new Error(SAFE_ERROR_PREFIX + 'there is no account with that name to rename');
        const clashKey = bridgeNormalizeHeader_(wantName);
        const rowNums = [];
        for (let i = 1; i < vals.length; i++) {
          if (String(vals[i][1]) !== 'account') continue;
          const have = bridgeNormalizeHeader_(vals[i][2]);
          if (have === clashKey) throw new Error(SAFE_ERROR_PREFIX + 'another account already has that name');
          if (have === want) rowNums.push(i + 1);
        }
        rowNums.forEach(function (r) {
          conn.getRange(r, 3).setNumberFormat('@');
          conn.getRange(r, 3).setValue(wantName);
          delete existing[String(vals[r - 1][1]) + '|' + String(vals[r - 1][2]) + '|' + String(vals[r - 1][3])];
          existing['account|' + wantName + '|' + String(vals[r - 1][3])] = r;
          vals[r - 1][2] = wantName;
        });
        logActivity_(ctx.ident.email, 'RENAME_ACCOUNT', account, account, wantName, rowNums.length + ' connection row(s)');
        renamedTo = wantName;
        account = wantName;
      }

      const archive = payload.archive === true || String(payload.archive) === 'true';
      const restore = payload.archive === false || String(payload.archive) === 'false';
      const links = payload.links && typeof payload.links === 'object' ? payload.links : {};
      Object.keys(links).forEach(function (k) {
        if (ACCOUNT_SHEET_KINDS.indexOf(k) < 0) throw new Error(SAFE_ERROR_PREFIX + 'unknown sheet kind: ' + k);
      });

      ACCOUNT_SHEET_KINDS.forEach(function (kind) {
        const key = 'account|' + account + '|' + kind;
        const row = existing[key] ? vals[existing[key] - 1] : null;
        const hasLink = Object.prototype.hasOwnProperty.call(links, kind);
        if (!row && !hasLink && !isNew) return;              // nothing asked of this kind
        const id = hasLink ? sadmSheetId_(links[kind]) : String(row ? row[4] || '' : '').trim();
        let status;
        if (archive) status = SADM_STATUS_ARCHIVED;
        else if (hasLink || restore || !row) status = sadmLinkStatus_(id);
        else status = String(row[5] || '').trim() || sadmLinkStatus_(id);
        if (hasLink && id && status !== 'linked' && status !== SADM_STATUS_ARCHIVED) unreadable.push(kind);
        upsert_(conn, existing, 'account', account, kind, id, status, notesFor(key));
        done.push(kind);
      });

      if (archive) logActivity_(ctx.ident.email, 'ARCHIVE_ACCOUNT', account, 'active', SADM_STATUS_ARCHIVED, 'links kept — historical data stays readable');
      else if (restore) logActivity_(ctx.ident.email, 'RESTORE_ACCOUNT', account, SADM_STATUS_ARCHIVED, 'active', '');
      else if (isNew) logActivity_(ctx.ident.email, 'ADD_ACCOUNT', account, '', account, ACCOUNT_SHEET_KINDS.join(','));
    }
  } finally { lock.releaseLock(); }

  sadmForgetConnections_();
  logActivity_(ctx.ident.email, 'SAVE_ACCOUNT', scope + ':' + (account || String(payload.kind || '')), '',
    done.join(','), unreadable.length ? 'portal cannot open: ' + unreadable.join(',') : '');

  const view = actionAccountsAdmin_({}, ctx);
  view.ok = true;
  view.saved = { scope: scope, account: account, renamed_to: renamedTo, kinds: done };
  // Not an error (§6 never errors on a missing link): the row is saved, the sheet just is not
  // shared with the account this portal runs as.
  view.unreadable = unreadable;
  return view;
}

const ACTIONS_STAFFADMIN = {
  addStaff:        [actionAddStaff_, 'any'],        // Management gated inside — §4.4 keeps Ops Head out
  updateStaff:     [actionUpdateStaff_, 'any'],
  staffDirectory:  [actionStaffDirectory_, 'any'],  // Management gated inside; self-migrates USERS
  deactivateStaff: [actionDeactivateStaff_, 'any'],
  reactivateStaff: [actionReactivateStaff_, 'super'],
  removedStaff:    [actionRemovedStaff_, 'any'],
  reassignTasks:   [actionReassignTasks_, 'any'],
  accountsAdmin:   [actionAccountsAdmin_, 'any'],
  saveAccount:     [actionSaveAccount_, 'super'],
};
