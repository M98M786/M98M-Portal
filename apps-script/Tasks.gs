/** Phase 4 — TASKS (§7) and the UNIVERSAL APPROVAL GATE (§8.0b).
 * Pending → Working → `Submitted — awaiting approval` → Approve (Completed) | Return (Working
 * + mandatory comment). actionApproveTask_ is the ONLY path to Completed — nothing counts
 * toward targets, performance (§12.1) or shoutouts before an approval lands. */

const TASK_TYPES = ['general', 'listing_new', 'listing_revision', 'cpc_research', 'campaign_set', 'supplier_add', 'potential_cpc_review', 'query'];
const TASK_STATUS_PENDING = 'Pending';
const TASK_STATUS_WORKING = 'Working';
const TASK_STATUS_UPDATED = 'Updated';
const TASK_STATUS_SUBMITTED = 'Submitted — awaiting approval';   // §8.0b, verbatim
const TASK_STATUS_COMPLETED = 'Completed';
const TASK_STATUSES = [TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED, TASK_STATUS_SUBMITTED, TASK_STATUS_COMPLETED];

// RL-6 column ownership — the only TASKS columns this module writes after creation.
const TASK_WRITABLE_COLS = ['item_id', 'comments', 'status', 'updated_at', 'submitted_at', 'submission_note', 'approved_by', 'decided_at', 'time_taken_min'];
const TASK_ESCALATION_REF = 'task-escalation:';

// ---------- create (§4.3 / §4.4) ----------
function actionCreateTask_(payload, ctx) {
  const type = String(payload.type || '').trim();
  if (TASK_TYPES.indexOf(type) < 0) throw new Error('unknown task type');
  if (!taskCanCreate_(ctx.user.role, ctx.ident.email, type)) throw new Error('role may not create this task');

  const title = String(payload.title || '').trim();
  if (!title) throw new Error('title required');
  const deadline = taskPktIso_(payload.deadline_pkt);
  if (!deadline) throw new Error('deadline_pkt required');
  const itemId = taskItemId_(payload.item_id);
  const wanted = normalizeEmail(payload.assigned_to || '');
  if (!wanted) throw new Error('assigned_to required');

  const taskId = 'T' + Utilities.getUuid().slice(0, 8);
  const stamp = now_();
  let assignee = null;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    readTab_('USERS').forEach(function (u) {
      if (assignee) return;
      if (normalizeEmail(u.email) === wanted && String(u.status) === 'approved') assignee = { email: String(u.email), name: String(u.name || u.email) };
    });
    if (!assignee) throw new Error('assignee is not an approved portal user');
    tasksSheet_().appendRow([
      taskId, type, String(payload.account || '').trim(), itemId, title,
      String(payload.details || '').trim(), '', ctx.ident.email, assignee.email,
      String(payload.priority || '').trim().slice(0, 40), deadline, TASK_STATUS_PENDING,
      stamp, stamp, '', '', '', '', '',
    ]);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'CREATE_TASK', taskId, '', TASK_STATUS_PENDING, type + ' → ' + assignee.email + ' due ' + deadline);
  notify_(assignee.email, 'Task assigned', type + ': ' + title + ' — due ' + deadline, 'task:' + taskId);
  return { task_id: taskId, status: TASK_STATUS_PENDING, assigned_to: assignee.email, deadline_pkt: deadline };
}

/** §4.3 matrix + §4.4: Management and Ops Head and Team Lead create anything; Advertising
 * Manager creates revisions only; every other role creates nothing. */
function taskCanCreate_(role, email, type) {
  if (isMgmt_(role, email)) return true;
  if (role === 'Team Lead') return true;
  if (role === 'Advertising Manager') return type === 'listing_revision';
  return false;
}

// ---------- employee flow ----------
function actionMyTasks_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  let wantStatus = String(payload.status || '').trim();
  if (wantStatus && TASK_STATUSES.indexOf(wantStatus) < 0) throw new Error('unknown status filter');
  const nowMs = taskMs_(now_());

  const rows = [];
  readTab_('TASKS').forEach(function (t) {
    if (normalizeEmail(t.assigned_to) !== me) return;
    const status = String(t.status || '');
    if (wantStatus && status !== wantStatus) return;
    const dl = taskMs_(t.deadline_pkt);
    const act = taskMs_(t.updated_at);
    const rec = taskRecord_(t);
    rec.overdue = !isNaN(dl) && dl < nowMs && status !== TASK_STATUS_COMPLETED;
    rows.push({ rec: rec, dl: isNaN(dl) ? Infinity : dl, act: isNaN(act) ? 0 : act });
  });
  rows.sort(function (a, b) { return a.dl !== b.dl ? a.dl - b.dl : b.act - a.act; });

  const tasks = rows.map(function (r) { return r.rec; });
  return { tasks: stripForRole_(tasks, ctx.user.role, ctx.ident.email) };
}

/** While a task is Working, `updated_at` IS the start-of-stint stamp: only start and return
 * write it, and submission reads it to close the clock. Do not stamp it from anywhere else. */
function actionStartTask_(payload, ctx) {
  const sh = tasksSheet_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    if (normalizeEmail(found.rec.assigned_to) !== normalizeEmail(ctx.ident.email)) throw new Error('not your task');
    const old = String(found.rec.status || '');
    if (old !== TASK_STATUS_PENDING) throw new Error('task is not Pending');
    taskWrite_(sh, found, { status: TASK_STATUS_WORKING, updated_at: now_() });
    logActivity_(ctx.ident.email, 'START_TASK', found.rec.task_id, old, TASK_STATUS_WORKING, '');
    return { task_id: found.rec.task_id, status: TASK_STATUS_WORKING };
  } finally { lock.releaseLock(); }
}

function actionSubmitTask_(payload, ctx) {
  const note = String(payload.submission_note || '').trim();
  if (!note) throw new Error('submission note required');
  const sh = tasksSheet_();
  let rec = null, approver = '', stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (normalizeEmail(rec.assigned_to) !== normalizeEmail(ctx.ident.email)) throw new Error('not your task');
    const old = String(rec.status || '');
    if (old !== TASK_STATUS_WORKING && old !== TASK_STATUS_UPDATED) throw new Error('task is not in progress');

    let itemId = taskItemId_(payload.item_id) || String(rec.item_id || '').trim();
    if (String(rec.type) === 'listing_new' && !itemId) throw new Error('item_id required to submit a listing');

    stamp = now_();
    const elapsed = taskElapsedMin_(rec.updated_at, taskMs_(stamp));
    const total = (Number(rec.time_taken_min) || 0) + elapsed;
    const patch = {
      status: TASK_STATUS_SUBMITTED, submitted_at: stamp, submission_note: note.slice(0, 2000),
      updated_at: stamp, time_taken_min: total,
    };
    if (itemId) patch.item_id = itemId;
    taskWrite_(sh, found, patch);
    approver = String(rec.assigned_by || '').trim();
    logActivity_(ctx.ident.email, 'SUBMIT_TASK', rec.task_id, old, TASK_STATUS_SUBMITTED, 'time_taken_min ' + total);
  } finally { lock.releaseLock(); }

  const msg = ctx.user.name + ' submitted "' + rec.title + '" for approval — ' + note.slice(0, 200);
  if (approver) notify_(approver, 'Task submitted', msg, 'task:' + rec.task_id);
  else notifyManagement_('Task submitted', msg, 'task:' + rec.task_id);
  return { task_id: rec.task_id, status: TASK_STATUS_SUBMITTED, submitted_at: stamp };
}

// ---------- approver flow (§8.0b) ----------
function actionPendingApprovals_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email);
  const nowMs = taskMs_(now_());

  const rows = [];
  readTab_('TASKS').forEach(function (t) {
    if (String(t.status || '') !== TASK_STATUS_SUBMITTED) return;
    if (!mgmt && normalizeEmail(t.assigned_by) !== me) return;
    const sub = taskMs_(t.submitted_at);
    const rec = taskRecord_(t);
    rec.approval_lag_min = isNaN(sub) ? '' : Math.max(0, Math.round((nowMs - sub) / 60000));
    const dl = taskMs_(t.deadline_pkt);
    rec.overdue = !isNaN(dl) && dl < nowMs;
    rows.push({ rec: rec, sub: isNaN(sub) ? Infinity : sub });
  });
  rows.sort(function (a, b) { return a.sub - b.sub; });

  const tasks = rows.map(function (r) { return r.rec; });
  return { tasks: stripForRole_(tasks, ctx.user.role, ctx.ident.email) };
}

/** The only path to Completed anywhere in the portal (§8.0b). */
function actionApproveTask_(payload, ctx) {
  const sh = tasksSheet_();
  let rec = null, stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (!taskMayDecide_(rec, ctx)) throw new Error('not the approver');
    const old = String(rec.status || '');
    if (old !== TASK_STATUS_SUBMITTED) throw new Error('task is not awaiting approval');
    stamp = now_();
    taskWrite_(sh, found, { status: TASK_STATUS_COMPLETED, approved_by: ctx.ident.email, decided_at: stamp, updated_at: stamp });
    logActivity_(ctx.ident.email, 'APPROVE_TASK', rec.task_id, old, TASK_STATUS_COMPLETED, 'lag_min ' + taskElapsedMin_(rec.submitted_at, taskMs_(stamp)));
  } finally { lock.releaseLock(); }

  notify_(rec.assigned_to, 'Task approved', '"' + rec.title + '" is approved and Completed.', 'task:' + rec.task_id);
  return { task_id: rec.task_id, status: TASK_STATUS_COMPLETED, decided_at: stamp };
}

function actionReturnTask_(payload, ctx) {
  const comment = String(payload.comment || '').trim();
  if (!comment) throw new Error('a comment is mandatory when returning a task');
  const sh = tasksSheet_();
  let rec = null, stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (!taskMayDecide_(rec, ctx)) throw new Error('not the approver');
    const old = String(rec.status || '');
    if (old !== TASK_STATUS_SUBMITTED) throw new Error('task is not awaiting approval');
    stamp = now_();
    const prior = String(rec.comments || '');
    const line = '[' + stamp + '] ' + ctx.user.name + ' returned: ' + comment.slice(0, 1000);
    taskWrite_(sh, found, {
      comments: (prior ? prior + '\n' : '') + line,
      status: TASK_STATUS_WORKING, submitted_at: '', decided_at: stamp, updated_at: stamp,
    });
    logActivity_(ctx.ident.email, 'RETURN_TASK', rec.task_id, old, TASK_STATUS_WORKING, comment.slice(0, 200));
  } finally { lock.releaseLock(); }

  notify_(rec.assigned_to, 'Task returned', '"' + rec.title + '" was returned: ' + comment.slice(0, 500), 'task:' + rec.task_id);
  return { task_id: rec.task_id, status: TASK_STATUS_WORKING, decided_at: stamp };
}

/** Time trigger (no ctx) — §8.0b: a submission left undecided past CONFIG
 * `submission_escalation_hours` escalates to Management, once per task. */
function escalateStaleSubmissions() {
  const hours = Number(getConfig('submission_escalation_hours') || CONFIG_DEFAULTS.submission_escalation_hours) || 12;
  const nowMs = taskMs_(now_());
  const cutoff = nowMs - hours * 3600000;

  const done = {};
  readTab_('NOTIFICATIONS').forEach(function (n) {
    const ref = String(n.ref || '');
    if (ref.indexOf(TASK_ESCALATION_REF) === 0) done[ref.slice(TASK_ESCALATION_REF.length)] = true;
  });

  let count = 0;
  readTab_('TASKS').forEach(function (t) {
    const id = String(t.task_id || '');
    if (!id || done[id]) return;
    if (String(t.status || '') !== TASK_STATUS_SUBMITTED) return;
    const sub = taskMs_(t.submitted_at);
    if (isNaN(sub) || sub > cutoff) return;
    const waited = Math.round((nowMs - sub) / 60000);
    notifyManagement_('Submission unactioned',
      '"' + String(t.title || id) + '" has waited ' + waited + ' min for approval by ' + String(t.assigned_by || 'unassigned approver') + '.',
      TASK_ESCALATION_REF + id);
    logActivity_('system', 'ESCALATE_TASK', id, TASK_STATUS_SUBMITTED, 'escalated', 'waited ' + waited + ' min; approver ' + String(t.assigned_by || ''));
    count++;
  });
  return 'escalated ' + count + ' submission(s) older than ' + hours + 'h';
}

// ---------- helpers ----------
function tasksSheet_() { return getPortalDb_(false).getSheetByName('TASKS'); }

function taskFind_(sh, taskId) {
  const id = String(taskId || '').trim();
  if (!id) throw new Error('task_id required');
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(function (h) { return String(h); });
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== id) continue;
    const rec = {};
    head.forEach(function (h, c) { rec[h] = vals[i][c]; });
    return { row: i + 1, head: head, rec: rec };
  }
  throw new Error('task not found');
}

/** RL-6: a write to any column outside TASK_WRITABLE_COLS throws. */
function taskWrite_(sh, found, patch) {
  Object.keys(patch).forEach(function (k) {
    if (TASK_WRITABLE_COLS.indexOf(k) < 0) throw new Error('write outside the TASKS whitelist: ' + k);
    const c = found.head.indexOf(k);
    if (c < 0) throw new Error('unknown TASKS column: ' + k);
    sh.getRange(found.row, c + 1).setValue(patch[k]);
  });
}

function taskMayDecide_(rec, ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return true;
  const approver = normalizeEmail(rec.assigned_by);
  return approver !== '' && approver === normalizeEmail(ctx.ident.email);
}

function taskRecord_(t) {
  const rec = {};
  DB_TABS.TASKS.forEach(function (c) { rec[c] = t[c] instanceof Date ? taskPktIso_(t[c]) : t[c]; });
  return rec;
}

/** Wall-clock input carrying no offset is PKT (Asia/Karachi, UTC+5), never UTC. */
function taskPktIso_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
  let s = String(value || '').trim();
  if (!s) return '';
  s = s.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, '$1T$2');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T23:59:59';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ':00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return s + '+05:00';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
}

function taskMs_(value) {
  if (value instanceof Date) return value.getTime();
  const iso = taskPktIso_(value);
  return iso ? new Date(iso).getTime() : NaN;
}

/** §12.1 time-taken: minutes accumulate across return→rework cycles, never go negative. */
function taskElapsedMin_(startValue, endMs) {
  const s = taskMs_(startValue);
  if (isNaN(s) || isNaN(endMs)) return 0;
  const d = Math.round((endMs - s) / 60000);
  return d > 0 ? d : 0;
}

function taskItemId_(value) {
  const s = String(value || '').trim().replace(/\s/g, '');
  if (!s) return '';
  if (!/^\d{9,15}$/.test(s)) throw new Error('invalid item_id');
  return s;
}

const ACTIONS_TASKS = {
  createTask:       [actionCreateTask_, 'any'],
  myTasks:          [actionMyTasks_, 'any'],
  startTask:        [actionStartTask_, 'any'],
  submitTask:       [actionSubmitTask_, 'any'],
  pendingApprovals: [actionPendingApprovals_, 'any'],
  approveTask:      [actionApproveTask_, 'any'],
  returnTask:       [actionReturnTask_, 'any'],
};
