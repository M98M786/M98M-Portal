/** R10 — LISTING REVISIONS THAT RAISE THEMSELVES (28 Aug, owner). "No listing revision creation
 * tab which is connected with automated feature for listings to qualify for sales." The decision
 * screens showed 7-day-no-sale items but every revision still waited on a human click. This is
 * the automation: a nightly qualifier reads the live listings through the engine mirror and
 * turns every listing that QUALIFIES into a listing_revision task on its own — plus the desk
 * action behind the new Revision desk tab (the auto-queue, the counts, the raise form's data).
 *
 * QUALIFY (v1): status ACTIVE · live ≥ 7 days · sold_30d = 0 · never sold (sold_qty = 0) ·
 * not revised in the last 14 days. Oldest listings first, capped per night so the listers get a
 * steady stream, not a flood. One revision per item: an item with ANY open listing_revision, or
 * an auto-raised one inside 30 days, is skipped. Assigned to the Listing Manager (who routes),
 * 72-hour deadline, reason written into the task so nobody asks why. */

const REVQ_MIN_DAYS_LIVE = 7;
const REVQ_REVISED_COOLDOWN_DAYS = 14;
const REVQ_AUTO_COOLDOWN_DAYS = 30;
const REVQ_MAX_PER_RUN = 15;
const REVQ_MARK = '[auto-qualify]';
const REVQ_ASSIGN_ROLES = ['Listing Manager', 'Team Lead', 'Management'];

function revqRows_(dump) {
  const h = dump.header || [];
  return (dump.rows || []).map(function (row) { const o = {}; h.forEach(function (c, i) { o[c] = row[i]; }); return o; });
}

function revqAssignee_() {
  const users = readTab_('USERS').filter(function (u) { return String(u.status) === 'approved'; });
  for (let i = 0; i < REVQ_ASSIGN_ROLES.length; i++) {
    const hit = users.filter(function (u) { return String(u.role) === REVQ_ASSIGN_ROLES[i]; })[0];
    if (hit) return { email: String(hit.email), name: String(hit.name || hit.email) };
  }
  return null;
}

function revisionQualify() {
  const props = PropertiesService.getScriptProperties();
  const ukDay = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
  if (props.getProperty('REVQ_DAY') === ukDay) return 'already ran today';

  let items;
  try { items = revqRows_(enginePost_('backupDump', { table: 'items_api' })); }
  catch (e) { return 'engine read failed: ' + String(e && e.message || e).slice(0, 120); }

  const now = Date.now();
  const liveCut = now - REVQ_MIN_DAYS_LIVE * 86400000;
  const revisedCut = now - REVQ_REVISED_COOLDOWN_DAYS * 86400000;

  const candidates = items.filter(function (it) {
    if (String(it.status) !== 'ACTIVE') return false;
    const started = Date.parse(String(it.start_time || '').replace(' ', 'T') + 'Z');
    if (isNaN(started) || started > liveCut) return false;         // too young (or unknown age: skip)
    if (Number(it.sold_30d) > 0 || Number(it.sold_qty) > 0) return false;
    const revised = Date.parse(String(it.last_revised || '').replace(' ', 'T') + 'Z');
    if (!isNaN(revised) && revised > revisedCut) return false;     // freshly revised — give it air
    return true;
  }).sort(function (a, b) { return String(a.start_time).localeCompare(String(b.start_time)); });

  // one revision per item: any open listing_revision, or an auto one inside the cooldown, blocks
  const openByItem = {}, autoRecent = {};
  const autoCut = now - REVQ_AUTO_COOLDOWN_DAYS * 86400000;
  readTab_('TASKS').forEach(function (t) {
    if (String(t.type) !== 'listing_revision') return;
    const id = String(t.item_id || '');
    if (!id) return;
    if (String(t.status) !== TASK_STATUS_COMPLETED) openByItem[id] = true;
    if (String(t.details || '').indexOf(REVQ_MARK) >= 0) {
      const made = Date.parse(String(t.created_at || ''));
      if (!isNaN(made) && made > autoCut) autoRecent[id] = true;
    }
  });

  const who = revqAssignee_();
  if (!who) return 'no assignable Listing Manager / Team Lead / Management';

  const deadline = Utilities.formatDate(new Date(now + 72 * 3600000), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
  let raised = 0;
  const titles = [];
  for (let i = 0; i < candidates.length && raised < REVQ_MAX_PER_RUN; i++) {
    const it = candidates[i];
    const id = String(it.item_id);
    if (openByItem[id] || autoRecent[id]) continue;
    const taskId = 'T' + Utilities.getUuid().slice(0, 8);
    const liveDays = Math.floor((now - Date.parse(String(it.start_time).replace(' ', 'T') + 'Z')) / 86400000);
    huntAppendTask_({
      task_id: taskId, type: 'listing_revision', account: String(it.account), item_id: id,
      title: 'Revise: ' + String(it.title || id).slice(0, 120),
      details: REVQ_MARK + ' Qualified for a sales revision automatically: live ' + liveDays +
        ' days, 0 sold in 30 days, never sold. Revise title/photos/price so it can sell — the ' +
        '72-hour window applies.',
      comments: '', assigned_by: 'system:auto-qualify', assigned_to: who.email, priority: 'High',
      deadline_pkt: deadline, status: TASK_STATUS_PENDING, created_at: now_(), updated_at: now_(),
    });
    raised++;
    if (titles.length < 5) titles.push(String(it.title || id).slice(0, 40));
    logActivity_('system', 'AUTO_REVISION', id, '', taskId, String(it.account) + ' · live ' + liveDays + 'd · 0 sales');
  }

  props.setProperty('REVQ_DAY', ukDay);
  if (raised) {
    try {
      notify_(who.email, 'Auto revisions', '🔁 ' + raised + ' listing(s) qualified for a sales revision overnight (7+ days live, no sales) and are on your board with 72-hour deadlines — starting with: ' + titles.join(' · '), 'revq:' + ukDay);
      notifyManagement_('Auto revisions', raised + ' no-sale listing(s) auto-queued for revision to ' + who.name + '. The Revision desk shows the queue.', 'revq:' + ukDay);
    } catch (e) { logActivity_('system', 'REVQ_NOTIFY_FAIL', '', '', '', String(e && e.message || e).slice(0, 120)); }
  }
  return 'auto-raised ' + raised + ' of ' + candidates.length + ' qualifying listing(s)';
}

/* ---------- the desk ---------- */
const REVD_ROLES = ['Listing Manager', 'Item Lister', 'Team Lead', 'Ops Head', 'Management',
  'Advertising Manager', 'CS', 'Order Processor', 'Sales Operations'];

function actionRevisionDesk_(payload, ctx) {
  if (REVD_ROLES.indexOf(ctx.user.role) < 0 && !isMgmt_(ctx.user.role, ctx.ident.email)) {
    throw authErr_('not permitted on the revision desk', ctx.ident.email);
  }
  const nowMs = Date.now();
  const open = [], done = [];
  let auto30 = 0, overdue = 0, done7 = 0;
  const cut30 = nowMs - 30 * 86400000, cut7 = nowMs - 7 * 86400000;
  readTab_('TASKS').forEach(function (t) {
    if (String(t.type) !== 'listing_revision') return;
    const isAuto = String(t.details || '').indexOf(REVQ_MARK) >= 0;
    const made = Date.parse(String(t.created_at || '')) || 0;
    if (isAuto && made > cut30) auto30++;
    const rec = {
      task_id: String(t.task_id), account: String(t.account || ''), item_id: String(t.item_id || ''),
      title: String(t.title || ''), details: String(t.details || '').slice(0, 240),
      assigned_to: String(t.assigned_to || ''), status: String(t.status || ''),
      deadline_pkt: String(t.deadline_pkt || ''), created_at: String(t.created_at || ''),
      decided_at: String(t.decided_at || ''), auto: isAuto,
    };
    if (String(t.status) === TASK_STATUS_COMPLETED) {
      const dec = Date.parse(rec.decided_at) || made;
      if (dec > cut7) done7++;
      done.push(rec);
    } else {
      const dl = Date.parse(rec.deadline_pkt);
      rec.overdue = !isNaN(dl) && dl < nowMs;
      if (rec.overdue) overdue++;
      open.push(rec);
    }
  });
  open.sort(function (a, b) { return String(a.deadline_pkt).localeCompare(String(b.deadline_pkt)); });
  done.sort(function (a, b) { return String(b.decided_at).localeCompare(String(a.decided_at)); });
  return {
    open: open.slice(0, 200), done: done.slice(0, 60),
    counts: { open: open.length, overdue: overdue, auto_30d: auto30, done_7d: done7 },
    can_raise: taskCanCreate_(ctx.user.role, ctx.ident.email, 'listing_revision') === true,
  };
}

const ACTIONS_REVISIONAUTO = {
  revisionDesk: [actionRevisionDesk_, 'any'],
};
