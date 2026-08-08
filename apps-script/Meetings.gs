/** §20.2 — MEETINGS: scheduling, the top-bar ⏰ alarm banner, one-tap RSVP, the creator's
 * live attendance grid, and post-meeting attendance marking that feeds §12.2 Punctuality.
 * Every write lands in ACTIVITY_LOG old→new (RL-6) and notifies per §14. */

const MEETING_CREATOR_ROLES = ['Management', 'Ops Head', 'Team Lead'];
const MEETING_DEPTS = ['Hunting', 'Listing', 'Advertising', 'CS', 'Order Processing'];

// §20.2 — the two RSVP answers are fixed company copy. Nothing else is ever accepted or stored.
const RSVP_YES = 'Yes sir, I will be there';
const RSVP_NO = "Can't attend (+reason)";
const RSVP_ANSWERS = [RSVP_YES, RSVP_NO];

const MEETING_DEFAULT_OFFSETS = [60, 10];        // §20.2 default reminder_offsets
const MEETING_DEFAULT_DURATION = 30;
const MEETING_MAX_OFFSETS = 4;

// ---------- actions ----------

function actionCreateMeeting_(payload, ctx) {
  if (MEETING_CREATOR_ROLES.indexOf(ctx.user.role) < 0) throw new Error('role may not schedule meetings');

  const title = String(payload.title || '').trim().slice(0, 200);
  if (!title) throw new Error('title required');
  const when = meetingParseIso_(payload.datetime_pkt);
  if (when.ms <= Date.now()) throw new Error('meeting time must be in the future');
  const duration = meetingDuration_(payload.duration);
  const users = readTab_('USERS');
  const audience = meetingAudience_(payload.audience, users);
  const location = meetingLocation_(payload.location_link);
  const offsets = meetingParseOffsets_(payload.reminder_offsets);

  const meetingId = 'M' + Utilities.getUuid().slice(0, 8);
  const invitees = meetingInvitees_({ audience: audience, created_by: ctx.ident.email }, users);
  if (!invitees.length) throw new Error('no one is invited');

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = meetingSheet_();
    sh.appendRow([meetingId, title, when.iso, duration, audience, location, ctx.ident.email,
      offsets.join(','), JSON.stringify({ responses: {}, attendance: {} })]);
    sh.getRange(sh.getLastRow(), meetingCol_('datetime_pkt')).setNumberFormat('@').setValue(when.iso);
  } finally { lock.releaseLock(); }

  const msg = title + ' · ' + when.iso + ' PKT · ' + duration + ' min' + (location ? ' · ' + location : '');
  invitees.forEach(function (u) { notify_(u.email, 'Meeting scheduled', msg, 'meeting:' + meetingId); });
  logActivity_(ctx.ident.email, 'CREATE_MEETING', meetingId, '', when.iso + '|' + audience,
    title + ' · invited ' + invitees.length + ' · reminders ' + offsets.join(','));

  return { meeting_id: meetingId, title: title, datetime_pkt: when.iso, duration: duration,
    audience: audience, location_link: location, reminder_offsets: offsets, invited: invitees.length };
}

function actionRsvp_(payload, ctx) {
  const meetingId = String(payload.meeting_id || '').trim();
  if (!meetingId) throw new Error('meeting_id required');
  const answer = String(payload.answer || '');
  if (RSVP_ANSWERS.indexOf(answer) < 0) throw new Error('unknown RSVP answer');
  const reason = String(payload.reason || '').trim().slice(0, 500);
  if (answer === RSVP_NO && !reason) throw new Error('a reason is required to decline');

  const me = normalizeEmail(ctx.ident.email);
  let creator = '', title = '', oldAnswer = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = meetingSheet_();
    const vals = sh.getDataRange().getValues();
    const rowIdx = meetingFindRow_(vals, meetingId);
    const rec = meetingRec_(vals[0], vals[rowIdx]);
    if (!meetingIsInvited_(rec, ctx.ident.email, ctx.user.role)) throw new Error('not invited to this meeting');
    const log = meetingParseRsvpLog_(rec.rsvp_log);
    const prev = log.responses[me];
    oldAnswer = prev ? String(prev.answer || '') + (prev.reason ? ' — ' + prev.reason : '') : '';
    log.responses[me] = { answer: answer, reason: answer === RSVP_NO ? reason : '', at: now_(), name: ctx.user.name || ctx.ident.name };
    sh.getRange(rowIdx + 1, meetingCol_('rsvp_log')).setValue(JSON.stringify(log));
    creator = String(rec.created_by || '');
    title = String(rec.title || '');
  } finally { lock.releaseLock(); }

  const newAnswer = answer + (answer === RSVP_NO ? ' — ' + reason : '');
  if (creator) notify_(creator, 'Meeting RSVP', (ctx.user.name || ctx.ident.email) + ': ' + newAnswer + ' ("' + title + '")', 'meeting:' + meetingId);
  logActivity_(ctx.ident.email, 'MEETING_RSVP', meetingId, oldAnswer, newAnswer, title);
  return { meeting_id: meetingId, answer: answer, reason: answer === RSVP_NO ? reason : '' };
}

function actionMyMeetings_(payload, ctx) {
  const nowMs = Date.now();
  const me = normalizeEmail(ctx.ident.email);
  const out = [];
  readTab_('MEETINGS').forEach(function (r) {
    if (!r.meeting_id) return;
    const startMs = meetingStartMs_(r.datetime_pkt);
    if (!startMs) return;
    const duration = Number(r.duration) || MEETING_DEFAULT_DURATION;
    if (nowMs >= startMs + duration * 60000) return;
    if (!meetingIsInvited_(r, ctx.ident.email, ctx.user.role)) return;
    const mine = meetingParseRsvpLog_(r.rsvp_log).responses[me] || null;
    out.push({
      meeting_id: String(r.meeting_id), title: String(r.title || ''),
      datetime_pkt: meetingToPktIso_(r.datetime_pkt), duration: duration,
      audience: String(r.audience || ''), location_link: String(r.location_link || ''),
      created_by: String(r.created_by || ''), reminder_offsets: meetingReadOffsets_(r.reminder_offsets),
      minutesUntil: Math.round((startMs - nowMs) / 60000),
      inProgress: nowMs >= startMs,
      isCreator: normalizeEmail(r.created_by) === me,
      myRsvp: mine ? { answer: String(mine.answer || ''), reason: String(mine.reason || ''), at: String(mine.at || '') } : null,
    });
  });
  out.sort(function (a, b) { return a.minutesUntil - b.minutesUntil; });
  return { meetings: out, answers: RSVP_ANSWERS };
}

function actionMeetingGrid_(payload, ctx) {
  const meetingId = String(payload.meeting_id || '').trim();
  if (!meetingId) throw new Error('meeting_id required');
  let rec = null;
  readTab_('MEETINGS').forEach(function (r) { if (String(r.meeting_id) === meetingId) rec = r; });
  if (!rec) throw new Error('meeting not found');
  const me = normalizeEmail(ctx.ident.email);
  if (normalizeEmail(rec.created_by) !== me && !isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('not your meeting');

  const log = meetingParseRsvpLog_(rec.rsvp_log);
  const counts = { pending: 0, yes: 0, no: 0 };
  const grid = [], seen = {};
  meetingInvitees_(rec, readTab_('USERS')).forEach(function (u) {
    seen[normalizeEmail(u.email)] = true;
    grid.push(meetingGridRow_(u, log, counts));
  });
  // Someone who answered and was later moved out of the audience still owes the creator a row.
  Object.keys(log.responses).forEach(function (n) {
    if (seen[n]) return;
    grid.push(meetingGridRow_({ email: n, name: String(log.responses[n].name || n), role: '' }, log, counts));
  });

  return {
    meeting_id: String(rec.meeting_id), title: String(rec.title || ''),
    datetime_pkt: meetingToPktIso_(rec.datetime_pkt), duration: Number(rec.duration) || MEETING_DEFAULT_DURATION,
    audience: String(rec.audience || ''), location_link: String(rec.location_link || ''),
    created_by: String(rec.created_by || ''), reminder_offsets: meetingReadOffsets_(rec.reminder_offsets),
    pending_flagged_at: String(log.pending_flagged_at || ''),
    counts: counts, grid: stripForRole_(grid, ctx.user.role, ctx.ident.email),
  };
}

/** §20.2 post-meeting: Management marks who actually attended. Attendance is written to its own
 * map inside rsvp_log — an RSVP answer is the person's word and is never overwritten by it. */
function actionMarkAttendance_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('only Management may mark attendance');
  const meetingId = String(payload.meeting_id || '').trim();
  if (!meetingId) throw new Error('meeting_id required');
  const marks = Array.isArray(payload.marks) ? payload.marks
    : (payload.email ? [{ email: payload.email, attended: payload.attended }] : []);
  if (!marks.length) throw new Error('no attendance marks supplied');

  const users = readTab_('USERS');
  const before = [], after = [];
  let title = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = meetingSheet_();
    const vals = sh.getDataRange().getValues();
    const rowIdx = meetingFindRow_(vals, meetingId);
    const rec = meetingRec_(vals[0], vals[rowIdx]);
    const startMs = meetingStartMs_(rec.datetime_pkt);
    if (!startMs || Date.now() < startMs) throw new Error('meeting has not started yet');
    title = String(rec.title || '');

    const log = meetingParseRsvpLog_(rec.rsvp_log);
    const allowed = {};
    meetingInvitees_(rec, users).forEach(function (u) { allowed[normalizeEmail(u.email)] = true; });
    Object.keys(log.responses).forEach(function (n) { allowed[n] = true; });

    marks.forEach(function (m) {
      const n = normalizeEmail(m && m.email);
      if (!n || !allowed[n]) throw new Error('not an invitee of this meeting');
      const attended = meetingBool_(m.attended);
      const prev = log.attendance[n];
      before.push(n + ':' + (prev ? (prev.attended ? 'attended' : 'absent') : 'unmarked'));
      after.push(n + ':' + (attended ? 'attended' : 'absent'));
      log.attendance[n] = { attended: attended, marked_by: ctx.ident.email, marked_at: now_() };
    });
    sh.getRange(rowIdx + 1, meetingCol_('rsvp_log')).setValue(JSON.stringify(log));
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'MEETING_ATTENDANCE', meetingId, before.join(', '), after.join(', '), title);
  return { meeting_id: meetingId, marked: marks.length };
}

/** Super-admin manual run of the §20.2 reminder-#2 sweep; the same function is the time-trigger entry. */
function actionSweepMeetingPending_(payload, ctx) {
  return { result: meetingPendingSweep() };
}

// ---------- shared poll helper ----------

/** The top-bar ⏰ banner for this caller: live from the FIRST reminder until the meeting starts,
 * else null. Called on every poll, so it costs exactly one MEETINGS read — audience membership is
 * decided from ctx alone, never a USERS lookup. */
function activeMeetingBanner_(ctx) {
  const nowMs = Date.now();
  const me = normalizeEmail(ctx.ident.email);
  const role = ctx.user ? ctx.user.role : '';
  let best = null, bestStart = 0;
  readTab_('MEETINGS').forEach(function (r) {
    if (!r.meeting_id) return;
    const startMs = meetingStartMs_(r.datetime_pkt);
    if (!startMs || nowMs >= startMs) return;
    const offsets = meetingReadOffsets_(r.reminder_offsets);
    if (nowMs < startMs - offsets[0] * 60000) return;
    if (best && bestStart <= startMs) return;
    if (!meetingIsInvited_(r, ctx.ident.email, role)) return;
    const mine = meetingParseRsvpLog_(r.rsvp_log).responses[me];
    bestStart = startMs;
    best = {
      meeting_id: String(r.meeting_id),
      title: String(r.title || ''),
      datetime_pkt: meetingToPktIso_(r.datetime_pkt),
      minutesUntil: Math.max(0, Math.round((startMs - nowMs) / 60000)),
      myRsvp: (mine && String(mine.answer)) || null,
    };
  });
  return best;
}

/** §20.2 — non-response by reminder #2 auto-flags as pending to the creator. Time-trigger entry
 * point; the flag stamp inside rsvp_log makes repeat runs idempotent. */
function meetingPendingSweep() {
  const nowMs = Date.now();
  const users = readTab_('USERS');
  const flagged = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = meetingSheet_();
    const vals = sh.getDataRange().getValues();
    const logCol = meetingCol_('rsvp_log');
    for (let i = 1; i < vals.length; i++) {
      const rec = meetingRec_(vals[0], vals[i]);
      if (!rec.meeting_id) continue;
      const startMs = meetingStartMs_(rec.datetime_pkt);
      if (!startMs || nowMs >= startMs) continue;
      const offsets = meetingReadOffsets_(rec.reminder_offsets);
      const second = offsets.length > 1 ? offsets[1] : offsets[0];
      if (nowMs < startMs - second * 60000) continue;
      const log = meetingParseRsvpLog_(rec.rsvp_log);
      if (log.pending_flagged_at) continue;
      const creator = normalizeEmail(rec.created_by);
      const names = [];
      meetingInvitees_(rec, users).forEach(function (u) {
        const n = normalizeEmail(u.email);
        if (n === creator || log.responses[n]) return;
        names.push(String(u.name || u.email));
      });
      log.pending_flagged_at = now_();
      sh.getRange(i + 1, logCol).setValue(JSON.stringify(log));
      flagged.push({ meeting_id: String(rec.meeting_id), title: String(rec.title || ''), created_by: String(rec.created_by || ''), names: names });
    }
  } finally { lock.releaseLock(); }

  flagged.forEach(function (f) {
    logActivity_('meetings', 'MEETING_PENDING_FLAG', f.meeting_id, '', f.names.length + ' pending', f.title + ' · ' + f.names.join(', '));
    if (!f.names.length || !f.created_by) return;
    notify_(f.created_by, 'Meeting RSVP pending', f.names.length + ' have not responded to "' + f.title + '": ' + f.names.join(', '), 'meeting:' + f.meeting_id);
  });
  return 'meetings flagged: ' + flagged.length;
}

// ---------- helpers ----------

function meetingSheet_() {
  const sh = getPortalDb_(false).getSheetByName('MEETINGS');
  if (!sh) throw new Error('MEETINGS tab missing — run setupDatabase()');
  return sh;
}
function meetingCol_(name) {
  const i = DB_TABS.MEETINGS.indexOf(name);
  if (i < 0) throw new Error('MEETINGS column missing: ' + name);
  return i + 1;
}
function meetingRec_(head, row) {
  const o = {};
  head.forEach(function (h, i) { o[h] = row[i]; });
  return o;
}
function meetingFindRow_(vals, meetingId) {
  const c = meetingCol_('meeting_id') - 1;
  for (let i = 1; i < vals.length; i++) if (String(vals[i][c]) === meetingId) return i;
  throw new Error('meeting not found');
}

function meetingToPktIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
  return String(v || '');
}
/** datetime_pkt is PKT by definition, so any offset in the input is replaced with +05:00. */
function meetingNormalizeIso_(s) {
  const m = String(s || '').trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return '';
  return m[1] + 'T' + m[2] + ':' + m[3] + ':' + (m[4] || '00') + '+05:00';
}
function meetingParseIso_(v) {
  const iso = (v instanceof Date) ? meetingToPktIso_(v) : meetingNormalizeIso_(v);
  if (!iso) throw new Error('datetime_pkt must be YYYY-MM-DDTHH:MM (PKT)');
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) throw new Error('datetime_pkt is not a valid time');
  return { iso: iso, ms: ms };
}
function meetingStartMs_(v) {
  if (v instanceof Date) return v.getTime();
  const iso = meetingNormalizeIso_(v);
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return isNaN(ms) ? 0 : ms;
}

function meetingDuration_(v) {
  if (v === '' || v === null || v === undefined) return MEETING_DEFAULT_DURATION;
  const n = Math.round(Number(v));
  if (!isFinite(n) || n < 5 || n > 480) throw new Error('duration must be 5–480 minutes');
  return n;
}
function meetingParseOffsets_(raw) {
  const parts = (Array.isArray(raw) ? raw : String(raw === 0 || raw ? raw : '').split(','))
    .filter(function (v) { return String(v).trim() !== ''; });
  if (!parts.length) return MEETING_DEFAULT_OFFSETS.slice();
  if (parts.length > MEETING_MAX_OFFSETS) throw new Error('at most ' + MEETING_MAX_OFFSETS + ' reminder offsets');
  const out = [];
  parts.forEach(function (v) {
    const n = Math.round(Number(String(v).trim()));
    if (!isFinite(n) || n < 1 || n > 1440) throw new Error('reminder offsets must be 1–1440 minutes');
    if (out.indexOf(n) < 0) out.push(n);
  });
  out.sort(function (a, b) { return b - a; });
  return out;
}
/** Read side: stored offsets are never trusted to be valid, and never throw. Sorted descending,
 * so [0] is reminder #1 (the banner opens) and [1] is reminder #2 (the pending flag). */
function meetingReadOffsets_(raw) {
  const out = [];
  String(raw || '').split(',').forEach(function (v) {
    const n = Math.round(Number(String(v).trim()));
    if (isFinite(n) && n >= 1 && n <= 1440 && out.indexOf(n) < 0) out.push(n);
  });
  if (!out.length) return MEETING_DEFAULT_OFFSETS.slice();
  out.sort(function (a, b) { return b - a; });
  return out;
}

function meetingLocation_(raw) {
  const v = String(raw || '').trim().slice(0, 300);
  if (!v) return '';
  if (/^\s*(javascript|data|vbscript|file)\s*:/i.test(v)) throw new Error('location must be plain text or an http(s) link');
  if (/:\/\//.test(v) && !/^https?:\/\//i.test(v)) throw new Error('a meeting link must be http or https');
  return v;
}
function meetingBool_(v) {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  throw new Error('attended must be true or false');
}
function meetingNormList_(raw) {
  const out = [];
  String(raw || '').split(',').forEach(function (v) {
    const n = normalizeEmail(String(v).trim());
    if (n && n.indexOf('@') > 0 && out.indexOf(n) < 0) out.push(n);
  });
  return out;
}
function meetingAudienceKind_(audience) {
  if (audience === 'ALL') return 'all';
  if (MEETING_DEPTS.indexOf(audience) >= 0) return 'dept';
  return 'people';
}
/** Write side: audience is whitelisted to ALL, one department, or a list of approved staff. */
function meetingAudience_(raw, users) {
  const a = String(raw || 'ALL').trim();
  if (a === 'ALL' || MEETING_DEPTS.indexOf(a) >= 0) return a;
  const wanted = meetingNormList_(a);
  if (!wanted.length) throw new Error('audience must be ALL, a department, or a list of staff emails');
  const approved = {};
  users.forEach(function (u) { if (String(u.status) === 'approved') approved[normalizeEmail(u.email)] = String(u.email); });
  const out = [];
  wanted.forEach(function (n) {
    if (!approved[n]) throw new Error('unknown or unapproved invitee');
    if (out.indexOf(approved[n]) < 0) out.push(approved[n]);
  });
  return out.join(',');
}

function meetingIsInvited_(meeting, email, role) {
  const n = normalizeEmail(email);
  if (normalizeEmail(meeting.created_by) === n) return true;
  const audience = String(meeting.audience || 'ALL').trim();
  const kind = meetingAudienceKind_(audience);
  if (kind === 'all') return true;
  if (kind === 'dept') return roleDept_(String(role)) === audience;
  return meetingNormList_(audience).indexOf(n) >= 0;
}

function meetingInvitees_(meeting, users) {
  const audience = String(meeting.audience || 'ALL').trim();
  const kind = meetingAudienceKind_(audience);
  const wanted = kind === 'people' ? meetingNormList_(audience) : [];
  const creator = normalizeEmail(meeting.created_by);
  const picked = [], seen = {};
  users.forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const n = normalizeEmail(u.email);
    if (!n || seen[n]) return;
    const hit = (kind === 'all') || (kind === 'dept' && roleDept_(String(u.role)) === audience)
      || (kind === 'people' && wanted.indexOf(n) >= 0) || n === creator;
    if (!hit) return;
    seen[n] = true;
    picked.push({ email: String(u.email), name: String(u.name || u.email), role: String(u.role || '') });
  });
  return picked;
}

/** §20.2 grid state per person: pending / yes / no+reason, with attendance kept alongside it. */
function meetingGridRow_(u, log, counts) {
  const n = normalizeEmail(u.email);
  const r = log.responses[n] || null;
  const a = log.attendance[n] || null;
  let status = 'pending';
  if (r && String(r.answer) === RSVP_YES) status = 'yes';
  else if (r && String(r.answer) === RSVP_NO) status = 'no';
  counts[status]++;
  return {
    email: u.email, name: u.name, role: u.role, status: status,
    answer: r ? String(r.answer || '') : '', reason: r ? String(r.reason || '') : '',
    responded_at: r ? String(r.at || '') : '',
    attended: a ? !!a.attended : null,
    marked_by: a ? String(a.marked_by || '') : '', marked_at: a ? String(a.marked_at || '') : '',
  };
}

function meetingParseRsvpLog_(raw) {
  let log = null;
  try { log = JSON.parse(String(raw || '') || '{}'); } catch (e) { log = null; }
  if (!log || typeof log !== 'object') log = {};
  if (!log.responses || typeof log.responses !== 'object') log.responses = {};
  if (!log.attendance || typeof log.attendance !== 'object') log.attendance = {};
  return log;
}

const ACTIONS_MEETINGS = {
  createMeeting: [actionCreateMeeting_, 'any'],
  rsvp: [actionRsvp_, 'any'],
  myMeetings: [actionMyMeetings_, 'any'],
  meetingGrid: [actionMeetingGrid_, 'any'],
  markAttendance: [actionMarkAttendance_, 'any'],
  sweepMeetingPending: [actionSweepMeetingPending_, 'super'],
};
