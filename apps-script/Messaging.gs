/** §24 Direct Messages + §14 in-portal bell / unread counts.
 *
 * thread_id is the two participants' normalized emails, sorted and joined — so a message in
 * either direction lands in exactly one thread.
 *
 * PRIVACY ([OPEN-10] default, confirmed in §24): a DM is readable ONLY by its two participants.
 * No role — including Management and super admins — gets a reading UI here; every attempt to open
 * someone else's thread is refused and logged. (§24 states the honest technical limit: the
 * Portal DB spreadsheet's owner can always open the raw sheet; the portal enforces the rule.)
 *
 * §16 / RL-6: nothing is ever deleted. MESSAGES.hidden is the tombstone.
 */

const DM_MAX_BODY = 4000;
const DM_PREVIEW_CHARS = 120;
const DM_POLL_NOTIF_LIMIT = 25;
const DM_POLL_THREAD_LIMIT = 15;
const DM_NOTIF_TYPE = 'New message';

// MESSAGES:      1 msg_id · 2 thread_id · 3 from · 4 to · 5 body · 6 sent_at · 7 read_at · 8 hidden
// NOTIFICATIONS: 1 notif_id · 2 to · 3 from · 4 type · 5 message · 6 ref · 7 created_at · 8 read_at
const DM_COL_BODY = 5;
const DM_COL_READ_AT = 7;
const DM_COL_HIDDEN = 8;
const NOTIF_COL_READ_AT = 8;

// ---------- actions ----------

/** §24: Management can message anyone; any team member can message any other team member. */
function actionSendMessage_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const to = normalizeEmail(payload.to || '');
  const body = String(payload.body === null || payload.body === undefined ? '' : payload.body).trim();

  if (!to) throw new Error('no recipient');
  if (!body) throw new Error(SAFE_ERROR_PREFIX + 'empty message');
  if (body.length > DM_MAX_BODY) throw new Error('message too long');
  if (to === me) throw new Error('cannot message yourself');

  const users = dmUsersByEmail_();
  const rec = users[to];
  if (!(rec && rec.status === 'approved') && !isSuperAdmin(to)) throw new Error('unknown or unapproved recipient');

  const threadId = dmThreadId_(me, to);
  const msgId = 'M' + Utilities.getUuid().slice(0, 8);
  const sentAt = now_();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('MESSAGES');
    const r = sh.getLastRow() + 1;
    // The body is PLAIN TEXT and is stored raw: format the cell as text first so the sheet
    // cannot re-interpret it as a number, date or formula. Rendering escapes it (RL-3).
    sh.getRange(r, DM_COL_BODY).setNumberFormat('@');
    sh.getRange(r, 1, 1, DB_TABS.MESSAGES.length).setValues([[msgId, threadId, me, to, body, sentAt, '', '']]);
  } finally {
    lock.releaseLock();
  }

  // §24 privacy: metadata only — a DM body never enters ACTIVITY_LOG.
  logActivity_(ctx.ident.email, 'DM_SEND', threadId, '', msgId, 'to ' + to + ' · ' + body.length + ' chars');
  notify_(rec ? rec.email : to, DM_NOTIF_TYPE, dmSenderName_(ctx) + ': ' + dmPreview_(body), 'dm:' + threadId);

  return { ok: true, msg_id: msgId, thread_id: threadId, sent_at: sentAt };
}

function actionListThreads_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const threads = dmBuildThreads_(readTab_('MESSAGES'), me, dmUsersByEmail_());
  return { threads: stripForRole_(threads, ctx.user.role, ctx.ident.email) };
}

/** Participant-only (§24, [OPEN-10]). Any other caller is refused and logged. */
function actionThreadMessages_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const tid = dmResolveThread_(payload, me, ctx, 'DM_READ_DENIED');
  const other = dmOtherParticipant_(tid, me);
  const u = dmUsersByEmail_()[other] || {};

  const messages = [];
  readTab_('MESSAGES').forEach(function (m) {
    if (String(m.thread_id || '') !== tid) return;
    if (dmIsHidden_(m.hidden)) return;
    const from = normalizeEmail(m.from);
    messages.push({
      msg_id: String(m.msg_id || ''),
      from: from,
      to: normalizeEmail(m.to),
      body: String(m.body === null || m.body === undefined ? '' : m.body),
      sent_at: dmTsText_(m.sent_at),
      read_at: dmTsText_(m.read_at),
      mine: from === me,
      _ms: dmTsMs_(m.sent_at),
    });
  });
  messages.sort(function (a, b) { return a._ms - b._ms; });
  messages.forEach(function (m) { delete m._ms; });

  return {
    thread_id: tid,
    other: { email: other, name: u.name || other, role: u.role || '' },
    messages: stripForRole_(messages, ctx.user.role, ctx.ident.email),
  };
}

function actionMarkThreadRead_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const tid = dmResolveThread_(payload, me, ctx, 'DM_MARK_DENIED');
  const stamp = now_();
  let marked = 0;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('MESSAGES');
    const vals = sh.getDataRange().getValues();
    if (vals.length > 1) {
      const col = [];
      for (let i = 1; i < vals.length; i++) {
        let readAt = vals[i][DM_COL_READ_AT - 1];
        const unread = String(readAt === null || readAt === undefined ? '' : readAt).trim() === '';
        if (unread && String(vals[i][1]) === tid && normalizeEmail(vals[i][3]) === me) { readAt = stamp; marked++; }
        col.push([readAt]);
      }
      if (marked) sh.getRange(2, DM_COL_READ_AT, col.length, 1).setValues(col);
    }
  } finally {
    lock.releaseLock();
  }

  if (marked) logActivity_(ctx.ident.email, 'DM_MARK_READ', tid, 'unread', 'read', marked + ' messages');
  return { ok: true, marked: marked };
}

/** §24: THE shared ~45s poll — the bell, the DM badge and the inbox all ride on this one call,
 *  which is what keeps the portal inside Apps Script quotas. Three tab reads, no lookups in loops. */
/* Same tail law for the DM store: the poll only previews threads (DM_POLL_THREAD_LIMIT of
   them); 2,000 recent messages cover every live conversation. Opening a thread still reads it
   in full through its own action. */
function msgTail_(n) {
  const sh = getPortalDb_(false).getSheetByName('MESSAGES');
  const last = sh.getLastRow();
  if (last < 2) return [];
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const start = Math.max(2, last - n + 1);
  const vals = sh.getRange(start, 1, last - start + 1, head.length).getValues();
  return vals.map(function (row) {
    const o = {}; head.forEach(function (h, i) { o[h] = row[i]; }); return o;
  });
}

function notifTail_(n) {
  const sh = getPortalDb_(false).getSheetByName('NOTIFICATIONS');
  const last = sh.getLastRow();
  if (last < 2) return [];
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const start = Math.max(2, last - n + 1);
  const vals = sh.getRange(start, 1, last - start + 1, head.length).getValues();
  return vals.map(function (row) {
    const o = {}; head.forEach(function (h, i) { o[h] = row[i]; }); return o;
  });
}

function actionPoll_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const users = dmUsersByEmail_();

  const unread = [];
  /* 30 Aug: the letters table holds ~25k rows (≈1,200 new/day) and this poll fires every ~45s
     from every signed-in person — reading the WHOLE tab each time was a hidden tax on every
     request slot. Letters append at the bottom; the last 4,000 rows cover well over two days of
     the entire company's traffic, which is more than a bell ever needs.
     9:12 AM peak: 20s polls as staff arrived - 1,500 rows (a full day) is still plenty. */
  notifTail_(1500).forEach(function (r) {
    if (normalizeEmail(r.to) !== me) return;
    if (String(r.read_at === null || r.read_at === undefined ? '' : r.read_at).trim() !== '') return;
    unread.push({
      notif_id: String(r.notif_id || ''),
      from: String(r.from || ''),
      type: String(r.type || ''),
      message: String(r.message || ''),
      ref: String(r.ref || ''),
      created_at: dmTsText_(r.created_at),
      _ms: dmTsMs_(r.created_at),
    });
  });
  unread.sort(function (a, b) { return b._ms - a._ms; });
  const notifications = unread.slice(0, DM_POLL_NOTIF_LIMIT);
  notifications.forEach(function (n) { delete n._ms; });

  const threads = dmBuildThreads_(msgTail_(2000), me, users);   // 9 AM peak: the full-tab read was the poll's other 10 seconds
  let unreadDm = 0;
  threads.forEach(function (t) { unreadDm += t.unread; });

  return {
    notifications: stripForRole_(notifications, ctx.user.role, ctx.ident.email),
    unreadNotif: unread.length,
    unreadDm: unreadDm,
    threads: stripForRole_(threads.slice(0, DM_POLL_THREAD_LIMIT), ctx.user.role, ctx.ident.email),
    meetings: (typeof activeMeetingBanner_ === 'function' ? activeMeetingBanner_(ctx) : null),
    ts: now_(),
  };
}

function actionMarkNotifRead_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const all = payload.all === true || String(payload.all) === 'true';
  const id = String(payload.notifId || payload.notif_id || '').trim();
  if (!all && !id) throw new Error('no notification specified');

  const stamp = now_();
  let marked = 0, denied = false;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('NOTIFICATIONS');
    const vals = sh.getDataRange().getValues();
    if (vals.length > 1) {
      const col = [];
      for (let i = 1; i < vals.length; i++) {
        let readAt = vals[i][NOTIF_COL_READ_AT - 1];
        const mine = normalizeEmail(vals[i][1]) === me;
        const hit = all ? mine : String(vals[i][0]) === id;
        if (hit && !mine) denied = true;
        if (hit && mine && String(readAt === null || readAt === undefined ? '' : readAt).trim() === '') { readAt = stamp; marked++; }
        col.push([readAt]);
      }
      if (marked) sh.getRange(2, NOTIF_COL_READ_AT, col.length, 1).setValues(col);
    }
  } finally {
    lock.releaseLock();
  }

  if (denied) {
    logActivity_(ctx.ident.email, 'NOTIF_ACCESS_DENIED', id, '', '', 'addressed to another user');
    throw new Error('not your notification');
  }
  if (marked) logActivity_(ctx.ident.email, 'NOTIF_MARK_READ', all ? 'ALL' : id, 'unread', 'read', marked + ' notifications');
  return { ok: true, marked: marked };
}

/** RL-6 / §24: no deletes. One tombstone column, so hiding is author-only — a recipient may not
 *  erase a message from the sender's own thread, and the row itself stays forever. */
function actionHideMessage_(payload, ctx) {
  const me = normalizeEmail(ctx.ident.email);
  const id = String(payload.msgId || payload.msg_id || '').trim();
  if (!id) throw new Error('no message specified');

  let found = false, denied = false, hidden = false, threadId = '';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('MESSAGES');
    const vals = sh.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) !== id) continue;
      found = true;
      threadId = String(vals[i][1] || '');
      if (normalizeEmail(vals[i][2]) !== me) { denied = true; break; }
      if (!dmIsHidden_(vals[i][DM_COL_HIDDEN - 1])) { sh.getRange(i + 1, DM_COL_HIDDEN).setValue(me); hidden = true; }
      break;
    }
  } finally {
    lock.releaseLock();
  }

  if (denied) {
    logActivity_(ctx.ident.email, 'DM_HIDE_DENIED', id, '', '', 'not the author');
    throw new Error('not your message');
  }
  if (!found) throw new Error('message not found');
  if (hidden) logActivity_(ctx.ident.email, 'DM_HIDE', threadId, '', id, 'tombstoned, row retained');
  return { ok: true, msg_id: id, hidden: true };
}

// ---------- helpers ----------

/** The canonical thread key: both participants' normalized emails, sorted, joined. */
function dmThreadId_(a, b) {
  const x = normalizeEmail(a), y = normalizeEmail(b);
  if (!x || !y || x === y) throw new Error('invalid thread participants');
  return [x, y].sort().join('|');
}

function dmParticipants_(threadId) {
  return String(threadId || '').split('|').map(function (e) { return normalizeEmail(e); })
    .filter(function (e) { return !!e; });
}

function dmOtherParticipant_(threadId, me) {
  const p = dmParticipants_(threadId);
  return p[0] === me ? p[1] : p[0];
}

/** Accepts {threadId} or {with: otherEmail}, canonicalizes it, and enforces §24 participant-only
 *  access. Called by every read/write path that touches one thread. */
function dmResolveThread_(payload, me, ctx, deniedAction) {
  let tid = String(payload.threadId || payload.thread_id || '').trim();
  if (!tid && payload['with']) tid = dmThreadId_(me, payload['with']);
  const parts = dmParticipants_(tid);
  if (parts.length !== 2 || parts[0] === parts[1]) throw new Error('unknown thread');
  if (parts.indexOf(me) < 0) {
    logActivity_(ctx.ident.email, deniedAction, tid, '', '', 'role ' + ctx.user.role + ' is not a participant');
    throw new Error('not a participant');
  }
  return parts.slice().sort().join('|');
}

/** One pass over MESSAGES: the caller's threads with the other participant, last message,
 *  unread count, newest first. */
function dmBuildThreads_(rows, me, users) {
  const byThread = {};
  rows.forEach(function (m) {
    if (dmIsHidden_(m.hidden)) return;
    const tid = String(m.thread_id || '');
    if (!tid) return;
    const from = normalizeEmail(m.from), to = normalizeEmail(m.to);
    if (from !== me && to !== me) return;

    let t = byThread[tid];
    if (!t) {
      const other = from === me ? to : from;
      const u = users[other] || {};
      t = { thread_id: tid, other: other, name: u.name || other, role: u.role || '',
        unread: 0, last_at: '', last_from: '', preview: '', _ms: -1 };
      byThread[tid] = t;
    }
    const ms = dmTsMs_(m.sent_at);
    if (ms >= t._ms) {
      t._ms = ms;
      t.last_at = dmTsText_(m.sent_at);
      t.last_from = from;
      t.preview = dmPreview_(String(m.body === null || m.body === undefined ? '' : m.body));
    }
    if (to === me && String(m.read_at === null || m.read_at === undefined ? '' : m.read_at).trim() === '') t.unread++;
  });

  const list = Object.keys(byThread).map(function (k) { return byThread[k]; });
  list.sort(function (a, b) { return b._ms - a._ms; });
  list.forEach(function (t) { delete t._ms; });
  return list;
}

function dmUsersByEmail_() {
  const map = {};
  readTab_('USERS').forEach(function (u) {
    const n = normalizeEmail(u.email);
    if (!n) return;
    map[n] = { email: String(u.email), name: String(u.name || ''), role: String(u.role || ''), status: String(u.status || '') };
  });
  return map;
}

function dmSenderName_(ctx) {
  return String((ctx.user && ctx.user.name) || ctx.ident.name || ctx.ident.email);
}

function dmPreview_(body) {
  return String(body).replace(/\s+/g, ' ').trim().slice(0, DM_PREVIEW_CHARS);
}

function dmIsHidden_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  return s !== '' && s !== 'false';
}

/** Sheets may hand back a Date where an ISO string was written; both forms must sort
 *  and render identically, and stored text stays PKT (never new Date().toISOString()). */
function dmTsMs_(v) {
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v || ''));
  return isNaN(t) ? 0 : t;
}
function dmTsText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
  return String(v === null || v === undefined ? '' : v);
}

const ACTIONS_MESSAGING = {
  sendMessage:    [actionSendMessage_, 'any'],
  listThreads:    [actionListThreads_, 'any'],
  threadMessages: [actionThreadMessages_, 'any'],
  markThreadRead: [actionMarkThreadRead_, 'any'],
  poll:           [actionPoll_, 'any'],
  markNotifRead:  [actionMarkNotifRead_, 'any'],
  hideMessage:    [actionHideMessage_, 'any'],
};
