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
// `title` is writable so go-live can save the final eBay title (enterItemId) and management can
// relabel a task — both server-controlled, never a lister writing a sensitive column. (5 Sept: its
// absence made "Make live" throw here after a partial write → the go-live desk's "request failed".)
const TASK_WRITABLE_COLS = ['item_id', 'comments', 'status', 'updated_at', 'submitted_at', 'submission_note', 'approved_by', 'decided_at', 'time_taken_min', 'assigned_to', 'title'];
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

  // Overload fix: a fresh-id appendRow needs no mutex — appends never collide and the id is a
  // UUID slice. Holding the portal-wide lock here only made every click queue behind every other.
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
  const pre = taskFind_(sh, payload.task_id);          // heavy read outside the lock
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskVerify_(sh, pre, payload.task_id);
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
  let rec = null, approver = '', stamp = '', total = 0;   // total is read by the bell text below — as a
  // const inside the try it was a guaranteed ReferenceError AFTER the write landed, masked as
  // "request failed": every task submit "failed" on screen while actually saving. (Pre-existing.)
  const pre = taskFind_(sh, payload.task_id);          // heavy read outside the lock
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskVerify_(sh, pre, payload.task_id);
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
    total = (Number(rec.time_taken_min) || 0) + elapsed;
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
  // Owner 9 Sept: a live revision-desk override outranks the module pick for revision steps.
  let chainTo = holders[0];
  if (String(step.type || '') === 'listing_revision') {
    const ovr = (typeof listingRevisionOverride_ === 'function') ? listingRevisionOverride_() : '';
    if (ovr) chainTo = ovr;
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
    String(step.title || rec.title || ''), JSON.stringify(nextDetails), '', 'system:chain', chainTo,
    String(rec.priority || ''), due, TASK_STATUS_PENDING, stamp, stamp, '', '', '', '', '',
  ]);
  logActivity_('system', 'CHAIN_TASK', nextId, rec.task_id, String(step.type || ''), 'to ' + chainTo);
  notify_(chainTo, 'Task assigned',
    '🔵 Next step of the flow · ' + String(rec.account || '') + (String(rec.item_id || '') ? ' · ' + String(rec.item_id) : '') +
    ' — "' + String(step.title || rec.title || '') + '". The previous step was just approved' +
    (ctx ? ' by ' + (ctx.user.name || ctx.ident.email) : '') + '; this one is due in ' + hours + 'h → open My tasks.',
    'task:' + nextId);
}

/** The only path to Completed anywhere in the portal (§8.0b). */
function actionApproveTask_(payload, ctx) {
  const sh = tasksSheet_();
  let rec = null, stamp = '', rateOut = 0;
  const pre = taskFind_(sh, payload.task_id);          // heavy read outside the lock
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskVerify_(sh, pre, payload.task_id);
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
    if (rating && String(rec.type) === 'listing_new' && String(rec.item_id || '')) rateOut = rating;
    logActivity_(ctx.ident.email, 'APPROVE_TASK', rec.task_id, old, TASK_STATUS_COMPLETED, 'lag_min ' + taskElapsedMin_(rec.submitted_at, taskMs_(stamp)) + (rating ? ' · rating ' + rating : ''));
  } finally { lock.releaseLock(); }
  engineTaskPush_(rec.task_id);   // outside the lock — see 30 Aug outage note
  // 9 Sept (global-lock work): the provenance rating is a NETWORK write — it must not ride inside
  // the global script lock, where a slow engine held every task approval (and everyone else's
  // writes) behind it. Fire it after release; best-effort, same as before.
  if (rateOut) { try { enginePost_('provenanceRate', { item_id: String(rec.item_id), rating: rateOut }); } catch (e) {} }

  // The chain spawn does sheet + USERS work of its own — if it hiccups, the approval (already
  // written) must still return success; the chain can be re-raised by hand.
  try { taskChainNext_(rec, ctx); } catch (e) { try { logActivity_('system', 'CHAIN_SPAWN_FAIL', String(rec.task_id), '', '', String(e && e.message || e).slice(0, 120)); } catch (e2) {} }

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
  const pre = taskFind_(sh, payload.task_id);          // heavy read outside the lock
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = taskVerify_(sh, pre, payload.task_id);
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

/** Overload fix (owner, 9 Sept): the full-tab TASKS read happens BEFORE the lock now; inside it
 * only the one row is re-read to prove the pre-lock find still points at the same task. Rows only
 * shift when management deletes one (taskAdmin), so the in-lock full re-scan is the rare fallback,
 * not the every-click cost that was serialising the whole portal behind one mutex. */
function taskVerify_(sh, pre, taskId) {
  try {
    const rowVals = sh.getRange(pre.row, 1, 1, pre.head.length).getValues()[0];
    if (String(rowVals[0]) === String(taskId || '').trim()) {
      const rec = {};
      pre.head.forEach(function (h, c) { rec[h] = rowVals[c]; });
      return { row: pre.row, head: pre.head, rec: rec };
    }
  } catch (e) {}
  return taskFind_(sh, taskId);
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
  const pre = taskFind_(sh, id);                       // heavy read outside the lock
  const lock = LockService.getScriptLock();
  const result = { task_id: id, op: op };
  try {
    lock.waitLock(10000);
    const found = taskVerify_(sh, pre, id);
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

/* 11 Sept (owner: "increase deadline of all the tasks for one day" → "ahsan ali tasking only").
 * One-shot, re-runnable via engineRunJob {job:'taskDeadlineExtend', args:{assignee, days}}. Gives
 * ONE named person's OPEN tasks more time. His listing tasks are all already overdue, so "one
 * more day" means a fresh deadline of end-of-day `days` (default 1) days from now — not +1 day on
 * a date already in the past, which would still read overdue. Completed tasks are final and
 * untouched. The deadline + updated_at columns are rewritten in ONE setValues each (no row moves,
 * indices stay stable), then the engine tasks mirror is reconciled so every board shows the date.
 * REQUIRES an assignee — it never touches the whole portal by omission. */
function taskDeadlineExtend(args) {
  const assignee = normalizeEmail((args && (args.assignee || args.email)) || '');
  if (!assignee) return 'SAY: assignee required (this job never bumps everyone)';
  const days = Math.max(1, Math.min(30, Number(args && args.days) || 1));
  // End of the target day in PKT: today + `days`, at 23:59:59 +05:00.
  const target = Utilities.formatDate(new Date(Date.now() + days * 86400000), 'Asia/Karachi', 'yyyy-MM-dd') + 'T23:59:59+05:00';
  const sh = tasksSheet_();
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return 'no tasks';
  const head = vals[0].map(String);
  const cDl = head.indexOf('deadline_pkt');
  const cStatus = head.indexOf('status');
  const cWho = head.indexOf('assigned_to');
  const cUpd = head.indexOf('updated_at');
  if (cDl < 0 || cStatus < 0 || cWho < 0) return 'columns missing';
  const stamp = now_();
  let bumped = 0;
  const dlOut = [], updOut = [];
  for (let i = 1; i < vals.length; i++) {
    let dl = vals[i][cDl], newUpd = vals[i][cUpd];
    if (normalizeEmail(vals[i][cWho]) === assignee && String(vals[i][cStatus] || '') !== TASK_STATUS_COMPLETED) {
      dl = target; newUpd = stamp; bumped++;             // updated_at bumped so the mirror sweep re-syncs
    }
    dlOut.push([dl]);
    updOut.push([newUpd]);
  }
  sh.getRange(2, cDl + 1, dlOut.length, 1).setValues(dlOut);
  if (cUpd >= 0) sh.getRange(2, cUpd + 1, updOut.length, 1).setValues(updOut);
  try { logActivity_('system', 'TASK_DEADLINE_EXTEND', assignee, '', target, bumped + ' open tasks moved'); } catch (e) {}
  let mirror = 'mirror not pushed';
  try { if (typeof pushEngineTasks === 'function') mirror = String(pushEngineTasks()); } catch (e) { mirror = 'mirror push failed: ' + (e && e.message || e); }
  return 'extended ' + bumped + ' open task(s) for ' + assignee + ' to ' + target + ' · ' + mirror;
}

/* 12 Sept (owner: "delete previous tasking of whole portal before sep" — the pre-September OPEN
 * tasks still clogging All tasks — manage). One-shot via engineRunJob {job:'tasksPurgeBefore',
 * args:{before:'2026-09-01'}}. Deletes every task created BEFORE `before` whose status is not
 * Completed — completed tasks are history (archives, performance) and are never touched. Rows
 * are removed bottom-up under the lock so earlier deletions can never shift a later target. Returns
 * the deleted task_ids so the engine mirror (which never deletes on its own) can be purged of the
 * same set. */
function tasksPurgeBefore(args) {
  const before = String((args && args.before) || '2026-09-01').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) return 'SAY: before must be yyyy-MM-dd';
  const sh = tasksSheet_();
  const lock = LockService.getScriptLock();
  const deleted = [];
  try {
    lock.waitLock(20000);
    const vals = sh.getDataRange().getValues();
    const head = vals[0].map(String);
    const cId = head.indexOf('task_id'), cStatus = head.indexOf('status'), cCreated = head.indexOf('created_at');
    if (cId < 0 || cStatus < 0 || cCreated < 0) return 'columns missing';
    const rowsToDelete = [];
    for (let i = 1; i < vals.length; i++) {
      const status = String(vals[i][cStatus] || '');
      if (status === TASK_STATUS_COMPLETED) continue;
      const created = taskPktIso_(vals[i][cCreated]).slice(0, 10);
      if (!created || created >= before) continue;
      rowsToDelete.push({ row: i + 1, id: String(vals[i][cId] || '') });
    }
    rowsToDelete.sort(function (a, b) { return b.row - a.row; });           // bottom-up
    rowsToDelete.forEach(function (r) { sh.deleteRow(r.row); deleted.push(r.id); });
  } finally { lock.releaseLock(); }
  try { logActivity_('system', 'TASKS_PURGE_BEFORE', before, '', String(deleted.length) + ' open tasks deleted', deleted.join(',').slice(0, 900)); } catch (e) {}
  return 'purged ' + deleted.length + ' open task(s) created before ' + before + ': ' + deleted.join(',');
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
