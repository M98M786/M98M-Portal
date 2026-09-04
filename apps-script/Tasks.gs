/** Phase 4 — TASKS (§7) and the UNIVERSAL APPROVAL GATE (§8.0b).
 * Pending → Working → `Submitted — awaiting approval` → Approve (Completed) | Return (Working
 * + mandatory comment). actionApproveTask_ is the ONLY path to Completed — nothing counts
 * toward targets, performance (§12.1) or shoutouts before an approval lands. */

const TASK_TYPES = ['general', 'listing_new', 'listing_revision', 'cpc_research', 'campaign_set', 'supplier_add', 'potential_cpc_review', 'query', 'loss_review'];
/* V2 loss escalation (§4): a loss_review closes with one of exactly these, nothing else. */
const LOSS_RESOLUTIONS = ['Changed advertising', 'Changed price', 'Decision by management — keep same'];
const TASK_STATUS_PENDING = 'Pending';
const TASK_STATUS_WORKING = 'Working';
const TASK_STATUS_UPDATED = 'Updated';
const TASK_STATUS_SUBMITTED = 'Submitted — awaiting approval';   // §8.0b, verbatim
const TASK_STATUS_COMPLETED = 'Completed';
const TASK_STATUSES = [TASK_STATUS_PENDING, TASK_STATUS_WORKING, TASK_STATUS_UPDATED, TASK_STATUS_SUBMITTED, TASK_STATUS_COMPLETED];

// RL-6 column ownership — the only TASKS columns this module writes after creation.
// `assigned_to` is writable so a controlled server action can REASSIGN a task (the go-live
// hand-off, the retroactive clear, management reassignment). Its value is always chosen by the
// action, never by the caller — no user-facing path lets someone reassign their own work away.
// (4 Sept: adding it fixes the draft hand-off, which threw here and stranded the task on the lister.)
const TASK_WRITABLE_COLS = ['item_id', 'comments', 'status', 'updated_at', 'submitted_at', 'submission_note', 'approved_by', 'decided_at', 'time_taken_min', 'assigned_to'];
const TASK_ESCALATION_REF = 'task-escalation:';

// ---------- create (§4.3 / §4.4) ----------
function actionCreateTask_(payload, ctx) {
  const type = String(payload.type || '').trim();
  if (TASK_TYPES.indexOf(type) < 0) throw new Error(SAFE_ERROR_PREFIX + 'unknown task type');
  if (!taskCanCreate_(ctx.user.role, ctx.ident.email, type)) throw new Error('role may not create this task');

  const title = String(payload.title || '').trim();
  if (!title) throw new Error('title required');
  /* A revision without a reason is not actionable - the lister needs to know WHAT to change. */
  if (type === 'listing_revision' && String(payload.details || '').trim().length < 5) {
    throw new Error(SAFE_ERROR_PREFIX + 'a revision needs an explanation of what to change');
  }
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
  engineTaskPush_(taskId);   // on the boards within a tick, not an hour
  notify_(assignee.email, 'Task assigned',
    '🔵 New ' + type.replace(/_/g, ' ') + ' task' + (payload.account ? ' · ' + payload.account : '') +
    (itemId ? ' · ' + itemId : '') + ' — "' + title + '" from ' + (ctx.ident.name || ctx.ident.email) +
    ', due ' + deadline + ' (Pakistan time). Open My tasks to start it.', 'task:' + taskId);
  return { task_id: taskId, status: TASK_STATUS_PENDING, assigned_to: assignee.email, deadline_pkt: deadline };
}

/** §4.3 matrix + §4.4: Management and Ops Head and Team Lead create anything; Advertising
 * Manager creates revisions only; every other role creates nothing. */
function taskCanCreate_(role, email, type) {
  if (isMgmt_(role, email)) return true;
  if (role === 'Team Lead') return true;
  if (role === 'Advertising Manager') return type === 'listing_revision';
  /* 26 Aug (owner): "advertising, management, customer service, order processor can create a new
     product listing revision." CS and Order Processor join Advertising on the revision type. */
  if ((role === 'CS' || role === 'Order Processor') && type === 'listing_revision') return true;
  /* Hasib item 19: every approved staff member can hand a task or a lead to anyone. The open
     types only — the privileged types above keep their gates. */
  return type === 'general' || type === 'query' || type === 'supplier_add';
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
    if (old !== TASK_STATUS_PENDING) throw new Error(SAFE_ERROR_PREFIX + 'task is not Pending');
    taskWrite_(sh, found, { status: TASK_STATUS_WORKING, updated_at: now_() });
    logActivity_(ctx.ident.email, 'START_TASK', found.rec.task_id, old, TASK_STATUS_WORKING, '');
    var startedId = found.rec.task_id;
  } finally { lock.releaseLock(); }
  /* OUTSIDE the lock (30 Aug outage): a network call inside the global lock serialized every
     task action portal-wide until the backend stopped answering. Push after release, always. */
  engineTaskPush_(startedId);
  return { task_id: startedId, status: TASK_STATUS_WORKING };
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
    if (old !== TASK_STATUS_WORKING && old !== TASK_STATUS_UPDATED) throw new Error(SAFE_ERROR_PREFIX + 'task is not in progress');

    let itemId = taskItemId_(payload.item_id) || String(rec.item_id || '').trim();
    if (String(rec.type) === 'listing_new' && !itemId) throw new Error('item_id required to submit a listing');
    // V2 loss escalation: the ping stops only on one of exactly three recorded decisions.
    if (String(rec.type) === 'loss_review' && LOSS_RESOLUTIONS.indexOf(note) < 0) {
      throw new Error(SAFE_ERROR_PREFIX + 'a loss review is closed with exactly one of: ' + LOSS_RESOLUTIONS.join(' · '));
    }

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
  engineTaskPush_(rec.task_id);   // outside the lock — see 30 Aug outage note

  const msg = '🔵 ' + ctx.user.name + ' submitted "' + rec.title + '"' +
    (rec.account ? ' · ' + rec.account : '') + (rec.item_id ? ' · ' + rec.item_id : '') +
    ' for approval — took ' + total + ' min. Note: ' + note.slice(0, 200) + ' → approve or return it on the Approvals desk.';
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

/* ---------- V2 req 34: the task chain ----------
 * A task whose details JSON carries {chain:[{type,title,module,module_roles,deadline_hours,
 * details}, …]} spawns the next link the moment it is approved — the remaining chain rides
 * along, so a three-step flow needs no engine state anywhere but the task itself. The next
 * link goes to the first approved holder of `module` (role defaults + Access-desk grants). */
function taskChainNext_(rec, ctx) {
  let parsed = null;
  try { parsed = JSON.parse(String(rec.details || '')); } catch (e) { return; }
  const chain = parsed && parsed.chain;
  if (!chain || !chain.length) return;

  const step = chain[0], rest = chain.slice(1);
  const holders = usersWithModule_(String(step.module || ''), step.module_roles || []);
  if (!holders.length) {
    notifyManagement_('Task assigned',
      '🔴 A chained task could not be routed · ' + String(rec.account || '') + ' · ' + String(rec.item_id || '') +
      ' — nobody holds "' + String(step.module || '') + '". The ' + String(step.type || 'next') +
      ' step of this flow is stuck → grant the module on the Access desk.', 'task:' + rec.task_id);
    return;
  }
  const stamp = now_();
  const nextId = 'T' + Utilities.getUuid().slice(0, 8);
  const hours = Number(step.deadline_hours) || 24;
  const due = Utilities.formatDate(new Date(Date.now() + hours * 3600000), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const nextDetails = {};
  if (step.details) nextDetails.note = String(step.details);
  if (rest.length) nextDetails.chain = rest;
  nextDetails.chained_from = String(rec.task_id);
  tasksSheet_().appendRow([
    nextId, String(step.type || 'general'), String(rec.account || ''), String(rec.item_id || ''),
    String(step.title || rec.title || ''), JSON.stringify(nextDetails), '', 'system:chain', holders[0],
    String(rec.priority || ''), due, TASK_STATUS_PENDING, stamp, stamp, '', '', '', '', '',
  ]);
  logActivity_('system', 'CHAIN_TASK', nextId, rec.task_id, String(step.type || ''), 'to ' + holders[0]);
  notify_(holders[0], 'Task assigned',
    '🔵 Next step of the flow · ' + String(rec.account || '') + (String(rec.item_id || '') ? ' · ' + String(rec.item_id) : '') +
    ' — "' + String(step.title || rec.title || '') + '". The previous step was just approved' +
    (ctx ? ' by ' + (ctx.user.name || ctx.ident.email) : '') + '; this one is due in ' + hours + 'h → open My tasks.',
    'task:' + nextId);
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
    if (old !== TASK_STATUS_SUBMITTED) throw new Error(SAFE_ERROR_PREFIX + 'task is not awaiting approval');
    stamp = now_();
    /* R8-3g: the approver may rate a listing 1-5 — the score rides the comments (parseable
       'RATING:n' line, no schema change) and the provenance row engine-side. */
    const rating = Math.max(0, Math.min(5, Number(payload.rating) || 0));
    const patch = { status: TASK_STATUS_COMPLETED, approved_by: ctx.ident.email, decided_at: stamp, updated_at: stamp };
    if (rating && String(rec.type) === 'listing_new') {
      patch.comments = (String(rec.comments || '') + '\n[' + stamp + '] RATING:' + rating + ' by ' + ctx.ident.email).slice(0, 1900);
    }
    taskWrite_(sh, found, patch);
    if (rating && String(rec.type) === 'listing_new' && String(rec.item_id || '')) {
      try { enginePost_('provenanceRate', { item_id: String(rec.item_id), rating: rating }); } catch (e) {}
    }
    logActivity_(ctx.ident.email, 'APPROVE_TASK', rec.task_id, old, TASK_STATUS_COMPLETED, 'lag_min ' + taskElapsedMin_(rec.submitted_at, taskMs_(stamp)) + (rating ? ' · rating ' + rating : ''));
  } finally { lock.releaseLock(); }
  engineTaskPush_(rec.task_id);   // outside the lock — see 30 Aug outage note

  taskChainNext_(rec, ctx);

  notify_(rec.assigned_to, 'Task approved',
    '🔵 "' + rec.title + '"' + (rec.account ? ' · ' + rec.account : '') + (rec.item_id ? ' · ' + rec.item_id : '') +
    ' — approved by ' + (ctx.user.name || ctx.ident.email) + '. Submitted → Completed. Nothing more to do on this one.', 'task:' + rec.task_id);
  return { task_id: rec.task_id, status: TASK_STATUS_COMPLETED, decided_at: stamp };
}

function actionReturnTask_(payload, ctx) {
  const comment = String(payload.comment || '').trim();
  if (!comment) throw new Error(SAFE_ERROR_PREFIX + 'a comment is mandatory when returning a task');
  const sh = tasksSheet_();
  let rec = null, stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, payload.task_id);
    rec = found.rec;
    if (!taskMayDecide_(rec, ctx)) throw new Error('not the approver');
    const old = String(rec.status || '');
    if (old !== TASK_STATUS_SUBMITTED) throw new Error(SAFE_ERROR_PREFIX + 'task is not awaiting approval');
    stamp = now_();
    const prior = String(rec.comments || '');
    const line = '[' + stamp + '] ' + ctx.user.name + ' returned: ' + comment.slice(0, 1000);
    taskWrite_(sh, found, {
      comments: (prior ? prior + '\n' : '') + line,
      status: TASK_STATUS_WORKING, submitted_at: '', decided_at: stamp, updated_at: stamp,
    });
    logActivity_(ctx.ident.email, 'RETURN_TASK', rec.task_id, old, TASK_STATUS_WORKING, comment.slice(0, 200));
  } finally { lock.releaseLock(); }
  engineTaskPush_(rec.task_id);   // outside the lock — see 30 Aug outage note

  notify_(rec.assigned_to, 'Task returned',
    '🟠 "' + rec.title + '"' + (rec.account ? ' · ' + rec.account : '') + (rec.item_id ? ' · ' + rec.item_id : '') +
    ' — returned by ' + (ctx.user.name || ctx.ident.email) + '. Submitted → back to Working. Fix this first: ' + comment.slice(0, 500), 'task:' + rec.task_id);
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
      '🟠 "' + String(t.title || id) + '"' + (t.account ? ' · ' + String(t.account) : '') +
      (t.item_id ? ' · ' + String(t.item_id) : '') + ' — submitted by ' + String(t.assigned_to || '?') +
      ' has waited ' + Math.round(waited / 60) + 'h ' + (waited % 60) + 'm on ' + String(t.assigned_by || 'an unassigned approver') +
      '. The person cannot move on until it is decided → open the Approvals desk.',
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

/** Management authority (owner, 4 Sept): open ANY task — including one the system created — and
 * end it, withdraw it, delete it, edit its details, or push out its deadline. Management / super
 * only. ops: 'end' (close as Completed) · 'withdraw' (close + a withdrawn note) · 'delete' (remove
 * the row) · 'edit' (title / details / priority / assigned_to / deadline_pkt) · 'extend' (deadline). */
function actionTaskAdmin_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error(SAFE_ERROR_PREFIX + 'management only');
  const op = String(payload.op || '').trim();
  const id = String(payload.task_id || '').trim();
  if (!id) throw new Error('task_id required');
  const sh = tasksSheet_();
  const lock = LockService.getScriptLock();
  const result = { task_id: id, op: op };
  try {
    lock.waitLock(10000);
    const found = taskFind_(sh, id);
    const rec = found.rec;
    const stamp = now_();
    if (op === 'delete') {
      sh.deleteRow(found.row);
      logActivity_(ctx.ident.email, 'TASK_DELETE', id, String(rec.status || ''), 'deleted', String(rec.type || ''));
      result.deleted = true;
    } else if (op === 'end' || op === 'withdraw') {
      const note = String(payload.note || '').trim().slice(0, 500);
      taskAdminWrite_(sh, found, {
        status: TASK_STATUS_COMPLETED, decided_at: stamp, approved_by: ctx.ident.email, updated_at: stamp,
        comments: taskAdminAppendNote_(rec.comments, (op === 'withdraw' ? 'Withdrawn' : 'Ended') + ' by management' + (note ? ': ' + note : '')),
      });
      logActivity_(ctx.ident.email, op === 'withdraw' ? 'TASK_WITHDRAW' : 'TASK_END', id, String(rec.status || ''), TASK_STATUS_COMPLETED, note);
      result.status = TASK_STATUS_COMPLETED;
    } else if (op === 'edit' || op === 'extend') {
      const patch = { updated_at: stamp };
      if (payload.title != null && String(payload.title).trim()) patch.title = String(payload.title).slice(0, 160);
      if (payload.details != null && String(payload.details).trim()) patch.details = String(payload.details).slice(0, 4000);
      if (payload.priority != null && String(payload.priority).trim()) patch.priority = String(payload.priority).slice(0, 40);
      if (payload.assigned_to != null && String(payload.assigned_to).trim()) {
        const u = (typeof listingResolveUser_ === 'function') ? listingResolveUser_(String(payload.assigned_to), '') : null;
        patch.assigned_to = u ? u.email : String(payload.assigned_to).trim();
      }
      if (payload.deadline_pkt != null && String(payload.deadline_pkt).trim()) patch.deadline_pkt = String(payload.deadline_pkt).trim();
      if (Object.keys(patch).length <= 1) throw new Error('nothing to change — send a title, details, priority, assignee or deadline');
      taskAdminWrite_(sh, found, patch);
      logActivity_(ctx.ident.email, 'TASK_EDIT', id, String(rec.status || ''), Object.keys(patch).join(','), '');
      result.patched = Object.keys(patch);
    } else {
      throw new Error('unknown op — end | withdraw | delete | edit | extend');
    }
  } finally { lock.releaseLock(); }
  return result;
}

/** Raw TASKS writer for the management-authority action ONLY — it may touch columns outside the
 * RL-6 whitelist (title, details, deadline_pkt, priority, assigned_to) because management is
 * explicitly authorized to edit any task. Reached only through actionTaskAdmin_'s isMgmt_ gate. */
function taskAdminWrite_(sh, found, patch) {
  Object.keys(patch).forEach(function (k) {
    const c = found.head.indexOf(k);
    if (c < 0) throw new Error('unknown TASKS column: ' + k);
    sh.getRange(found.row, c + 1).setValue(patch[k]);
  });
}

function taskAdminAppendNote_(comments, note) {
  const base = String(comments || '');
  return (base ? base + '\n' : '') + '@MGMT@ ' + note + ' · ' + now_();
}

const ACTIONS_TASKS = {
  createTask:       [actionCreateTask_, 'any'],
  myTasks:          [actionMyTasks_, 'any'],
  startTask:        [actionStartTask_, 'any'],
  submitTask:       [actionSubmitTask_, 'any'],
  taskAdmin:        [actionTaskAdmin_, 'any'],   // management gated inside (end/withdraw/delete/edit/extend any task)
  pendingApprovals: [actionPendingApprovals_, 'any'],
  approveTask:      [actionApproveTask_, 'any'],
  returnTask:       [actionReturnTask_, 'any'],
};
