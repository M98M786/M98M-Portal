/** §5 — SHIFTS & 2-HOURLY REPORTING: the rota (SCHEDULES tab) and checkpoint derivation.
 * Schedules are set by Management (and Ops Head); at registration a staff member only
 * *requests* a shift (§5), so no handler here lets anyone write their own timetable.
 * Other modules call getScheduleForUser_ / getCheckpointsForUser_ / deriveCheckpoints_. */

const SCHEDULE_SHIFT_LABELS = ['Shift 1', 'Shift 2', 'Custom'];
const SCHEDULE_DAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SCHEDULE_INTERVAL_MIN = 120;
/** A candidate landing less than this before work_end is absorbed into the end-of-shift
 * checkpoint — the final report (§5) must not be shadowed by one raised minutes earlier. */
const SCHEDULE_TAIL_MERGE_MIN = 60;

// ---------- time / date primitives (PKT; script timezone is Asia/Karachi) ----------
function schedPad2_(n) { return (n < 10 ? '0' : '') + n; }

/** Sheets turns "14:15" into a time value, so a time read back from SCHEDULES or REPORTS_2H
 * may be a Date or a day fraction rather than a string. Every time value funnels through here. */
function schedHm_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return schedPad2_(v.getHours()) + ':' + schedPad2_(v.getMinutes());
  }
  if (typeof v === 'number') {
    if (!(v >= 0 && v < 1)) return '';
    const mins = Math.round(v * 1440) % 1440;
    return schedPad2_(Math.floor(mins / 60)) + ':' + schedPad2_(mins % 60);
  }
  const m = String(v).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return '';
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return '';
  return schedPad2_(h) + ':' + schedPad2_(mi);
}
function schedMin_(v) {
  const s = schedHm_(v);
  return s ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : -1;
}
function schedFmtMin_(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return schedPad2_(Math.floor(m / 60)) + ':' + schedPad2_(m % 60);
}
function schedDateStr_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return v.getFullYear() + '-' + schedPad2_(v.getMonth() + 1) + '-' + schedPad2_(v.getDate());
  }
  const m = String(v).trim().match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}
function schedToday_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd'); }
function schedNowMin_() { return schedMin_(Utilities.formatDate(new Date(), 'Asia/Karachi', 'HH:mm')); }
/** Calendar arithmetic on the yyyy-MM-dd string only — never on a local Date, so no DST/timezone drift. */
function schedAddDays_(dateStr, days) {
  const p = String(dateStr).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  d.setUTCDate(d.getUTCDate() + (days || 0));
  return d.getUTCFullYear() + '-' + schedPad2_(d.getUTCMonth() + 1) + '-' + schedPad2_(d.getUTCDate());
}
function schedDayIndex_(dateStr) {
  const p = String(dateStr).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return (d.getUTCDay() + 6) % 7;
}
function schedDayCode_(dateStr) { return SCHEDULE_DAY_CODES[schedDayIndex_(dateStr)]; }

// ---------- checkpoint derivation (§5) ----------
/** §5: every 2 hours from work_start, skipping the break window, final checkpoint at work_end.
 * Verified against the two documented shifts:
 *   Shift 1 · 14:15-23:15 · break 17:30-18:30
 *     +2h = 16:15 · +2h = 18:15 falls inside the break so it moves to 18:30 · +2h = 20:30 ·
 *     +2h = 22:30 sits only 45 min before the end so it merges into the final checkpoint
 *     => 16:15, 18:30, 20:30, 23:15  ✅ exactly as documented.
 *   Shift 2 · 21:00-06:00 · break 00:00-01:00
 *     derivation yields 23:00, 01:00, 03:00, 06:00 — NOT the documented 04:00 third checkpoint.
 *     That shift's times therefore come from the CONFIG override checkpoints_shift2
 *     ("per-shift overrides in CONFIG", §5), applied in schedCheckpoints_ below; derivation is
 *     the fallback for Custom shifts. => 23:00, 01:00, 04:00, 06:00  ✅ */
function deriveCheckpoints_(schedule) {
  if (!schedule) return [];
  const start = schedMin_(schedule.work_start), end = schedMin_(schedule.work_end);
  if (start < 0 || end < 0) return [];
  let span = end - start;
  if (span <= 0) span += 1440;                                     // shift crosses midnight
  let bs = -1, be = -1;
  const bsAbs = schedMin_(schedule.break_start), beAbs = schedMin_(schedule.break_end);
  if (bsAbs >= 0 && beAbs >= 0) {
    bs = (bsAbs - start + 1440) % 1440;
    be = (beAbs - start + 1440) % 1440;
    if (be <= bs) be += 1440;
    if (bs >= span) { bs = -1; be = -1; }                          // break outside this shift
  }
  const offsets = [];
  let t = 0, guard = 0;
  while (guard++ < 64) {
    t += SCHEDULE_INTERVAL_MIN;
    if (bs >= 0 && t > bs && t < be) t = be;
    if (t >= span - SCHEDULE_TAIL_MERGE_MIN) break;
    if (offsets.length && t <= offsets[offsets.length - 1]) continue;
    offsets.push(t);
  }
  offsets.push(span);                                              // final checkpoint = work_end
  return offsets.map(function (off) { return schedFmtMin_(start + off); });
}

/** CONFIG override for the two named shifts. Order is shift order, never re-sorted, so a night
 * shift reads 23:00, 01:00, 04:00, 06:00 rather than clock-sorted. */
function schedConfigCheckpoints_(shiftLabel) {
  let key = '';
  if (shiftLabel === 'Shift 1') key = 'checkpoints_shift1';
  else if (shiftLabel === 'Shift 2') key = 'checkpoints_shift2';
  if (!key) return null;
  const raw = String(getConfig(key) || CONFIG_DEFAULTS[key] || '');
  const list = [];
  raw.split(',').forEach(function (part) {
    const hm = schedHm_(part);
    if (hm && list.indexOf(hm) < 0) list.push(hm);
  });
  return list.length ? list : null;
}
function schedCheckpoints_(schedule) {
  if (!schedule) return [];
  return schedConfigCheckpoints_(schedule.shift_label) || deriveCheckpoints_(schedule);
}

// ---------- schedule lookup ----------
function schedNormalizeRow_(o, source) {
  return {
    email: String(o.email || ''),
    effective_from: schedDateStr_(o.effective_from),
    shift_label: String(o.shift_label || '').trim(),
    work_start: schedHm_(o.work_start),
    work_end: schedHm_(o.work_end),
    break_start: schedHm_(o.break_start),
    break_end: schedHm_(o.break_end),
    working_days: String(o.working_days || '').trim(),
    assigned_by: String(o.assigned_by || ''),
    assigned_at: String(o.assigned_at || ''),
    source: source,
  };
}
function schedValuesToObj_(values) {
  const o = {};
  DB_TABS.SCHEDULES.forEach(function (c, i) { o[c] = values[i]; });
  return schedNormalizeRow_(o, 'assigned');
}
function schedUser_(email) {
  const n = normalizeEmail(email);
  const rows = readTab_('USERS');
  for (let i = 0; i < rows.length; i++) if (normalizeEmail(rows[i].email) === n) return rows[i];
  return null;
}
/** Rows dated in the future are not effective yet; on equal dates the later row wins (latest edit). */
function schedEffectiveRow_(rows, email, today) {
  const n = normalizeEmail(email);
  let best = null, bestKey = '';
  rows.forEach(function (r) {
    if (normalizeEmail(r.email) !== n) return;
    const eff = schedDateStr_(r.effective_from);
    if (eff && eff > today) return;
    const key = eff || '0000-00-00';
    if (best && key < bestKey) return;
    best = r; bestKey = key;
  });
  return best ? schedNormalizeRow_(best, 'assigned') : null;
}
/** CONFIG hours for a named shift, e.g. shift1_hours "14:15-23:15" + shift1_break "17:30-18:30". */
function schedPreset_(label) {
  let hoursKey = '', breakKey = '';
  if (label === 'Shift 1') { hoursKey = 'shift1_hours'; breakKey = 'shift1_break'; }
  else if (label === 'Shift 2') { hoursKey = 'shift2_hours'; breakKey = 'shift2_break'; }
  if (!hoursKey) return null;
  const hours = String(getConfig(hoursKey) || CONFIG_DEFAULTS[hoursKey] || '').split('-');
  const brk = String(getConfig(breakKey) || CONFIG_DEFAULTS[breakKey] || '').split('-');
  const ws = schedHm_(hours[0]), we = schedHm_(hours[1]);
  if (!ws || !we) return null;
  return { work_start: ws, work_end: we, break_start: schedHm_(brk[0]), break_end: schedHm_(brk[1]) };
}
/** Until Management assigns a rota row, fall back to the shift the staff member requested. */
function schedDefaultFor_(email, userRow) {
  const u = userRow || schedUser_(email);
  if (!u) return null;
  const label = String(u.shift || '').trim();
  const preset = schedPreset_(label);
  if (!preset) return null;
  return schedNormalizeRow_({
    email: u.email || email, effective_from: '', shift_label: label,
    work_start: preset.work_start, work_end: preset.work_end,
    break_start: preset.break_start, break_end: preset.break_end,
    working_days: '', assigned_by: '', assigned_at: '',
  }, 'shift-default');
}

function getScheduleForUser_(email) {
  const today = schedToday_();
  return schedEffectiveRow_(readTab_('SCHEDULES'), email, today) || schedDefaultFor_(email, null);
}
function getCheckpointsForUser_(email) {
  return schedCheckpoints_(getScheduleForUser_(email));
}

// ---------- today's checkpoint state ----------
/** Keyed 'yyyy-MM-dd|HH:mm'. Both the shift's own date and the following calendar date are kept,
 * so an after-midnight checkpoint is recognised whichever of the two a report was filed under. */
function schedDoneCheckpoints_(email, dates) {
  const n = normalizeEmail(email), map = {};
  readTab_('REPORTS_2H').forEach(function (r) {
    if (normalizeEmail(r.email) !== n) return;
    const d = schedDateStr_(r.date);
    if (dates.indexOf(d) < 0) return;
    const hm = schedHm_(r.checkpoint);
    if (hm) map[d + '|' + hm] = r;
  });
  return map;
}
/** A night shift's checkpoints belong to the date the shift STARTED, so before work_end we are
 * still inside the shift that began yesterday. Positions are minutes from shift_date 00:00 PKT. */
function schedCheckpointState_(schedule, checkpoints, email) {
  const today = schedToday_(), nowMin = schedNowMin_();
  const start = schedMin_(schedule.work_start), end = schedMin_(schedule.work_end);
  const crossesMidnight = end <= start;
  const shiftDate = (crossesMidnight && nowMin < end) ? schedAddDays_(today, -1) : today;
  const nowPos = (shiftDate === today) ? nowMin : nowMin + 1440;
  const nextDate = schedAddDays_(shiftDate, 1);
  const done = schedDoneCheckpoints_(email, [shiftDate, nextDate]);
  const list = [];
  let nextDue = null;
  checkpoints.forEach(function (hm) {
    const pos = start + (schedMin_(hm) - start + 1440) % 1440;
    const cpDate = schedAddDays_(shiftDate, Math.floor(pos / 1440));
    const at = cpDate + 'T' + hm + ':00+05:00';
    const rep = done[cpDate + '|' + hm] || done[shiftDate + '|' + hm] || null;
    if (!rep && !nextDue) nextDue = hm;
    list.push({
      time: hm, at: at,
      status: rep ? 'done' : (nowPos >= pos ? 'due' : 'upcoming'),
      flag: rep ? String(rep.flag || '') : '',
    });
  });
  const days = schedule.working_days ? schedule.working_days.split(',') : [];
  return {
    shift_date: shiftDate,
    working_today: days.length ? days.indexOf(schedDayCode_(shiftDate)) >= 0 : null,
    checkpoints: list,
    next_due: nextDue,
  };
}

// ---------- validation ----------
function schedNormalizeDays_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) return '';
  const picked = [];
  s.split(/[^A-Za-z]+/).forEach(function (tok) {
    if (!tok) return;
    const key = tok.slice(0, 3).toLowerCase();
    let hit = '';
    SCHEDULE_DAY_CODES.forEach(function (c) { if (c.toLowerCase() === key) hit = c; });
    if (!hit) throw new Error('unknown working day: ' + tok);
    if (picked.indexOf(hit) < 0) picked.push(hit);
  });
  return SCHEDULE_DAY_CODES.filter(function (c) { return picked.indexOf(c) >= 0; }).join(',');
}
function schedAssertBreakInside_(s) {
  if (!s.break_start || !s.break_end) return;
  const start = schedMin_(s.work_start), end = schedMin_(s.work_end);
  let span = end - start;
  if (span <= 0) span += 1440;
  const bs = (schedMin_(s.break_start) - start + 1440) % 1440;
  let be = (schedMin_(s.break_end) - start + 1440) % 1440;
  if (be <= bs) be += 1440;
  if (bs === 0 || be > span) throw new Error('break must fall inside the shift');
}
function schedSummary_(s, checkpoints) {
  return s.shift_label + ' · ' + s.work_start + '–' + s.work_end +
    (s.break_start ? ' · break ' + s.break_start + '–' + s.break_end : '') +
    (s.working_days ? ' · ' + s.working_days : '') +
    ' · from ' + s.effective_from +
    ' · checkpoints ' + checkpoints.join(', ');
}

// ---------- actions ----------
/** §5: Management (and Ops Head) only. One row per person per effective_from; superseding a
 * timetable adds a later-dated row, never removes an old one (RL-6, no hard deletes). */
function actionSetSchedule_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);

  const target = normalizeEmail(payload.email || '');
  if (!target) throw new Error('email required');
  const u = schedUser_(target);
  if (!u) throw new Error('user not found');
  if (String(u.status) === 'disabled') throw new Error('user is deactivated');

  const label = String(payload.shift_label || '').trim();
  if (SCHEDULE_SHIFT_LABELS.indexOf(label) < 0) throw new Error('unknown shift_label');
  const effective = payload.effective_from ? schedDateStr_(payload.effective_from) : schedToday_();
  if (!effective) throw new Error('effective_from must be yyyy-MM-dd');

  const lock = LockService.getScriptLock();
  let before = '', after = '', saved = null, checkpoints = [];
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('SCHEDULES');
    const cols = DB_TABS.SCHEDULES;
    const vals = sh.getDataRange().getValues();
    let rowNum = -1, prevValues = null;
    for (let i = 1; i < vals.length; i++) {
      if (normalizeEmail(vals[i][0]) !== target) continue;
      if (schedDateStr_(vals[i][1]) !== effective) continue;
      rowNum = i + 1; prevValues = vals[i]; break;
    }
    const prev = prevValues ? schedValuesToObj_(prevValues) : null;
    const preset = schedPreset_(label);
    // payload wins; then the row being edited (same label); then the CONFIG preset for a named shift.
    const pick = function (key) {
      const given = schedHm_(payload[key]);
      if (given) return given;
      if (prev && prev.shift_label === label && prev[key]) return prev[key];
      return preset && preset[key] ? preset[key] : '';
    };
    const workStart = pick('work_start'), workEnd = pick('work_end');
    if (!workStart || !workEnd) throw new Error('work_start and work_end required as HH:mm');
    if (workStart === workEnd) throw new Error('work_start and work_end must differ');
    const breakStart = pick('break_start'), breakEnd = pick('break_end');
    if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) throw new Error('break needs both start and end');

    let days = '';
    if (payload.working_days === undefined || payload.working_days === null) days = prev ? prev.working_days : '';
    else days = schedNormalizeDays_(payload.working_days);

    const draft = schedNormalizeRow_({
      email: u.email, effective_from: effective, shift_label: label,
      work_start: workStart, work_end: workEnd, break_start: breakStart, break_end: breakEnd,
      working_days: days, assigned_by: ctx.ident.email, assigned_at: now_(),
    }, 'assigned');
    schedAssertBreakInside_(draft);
    checkpoints = schedCheckpoints_(draft);
    if (!checkpoints.length) throw new Error('schedule yields no checkpoints');

    const rowArr = cols.map(function (c) { return draft[c] === undefined ? '' : draft[c]; });
    before = prevValues ? prevValues.join(' | ') : '';
    after = rowArr.join(' | ');
    if (rowNum > 0) sh.getRange(rowNum, 1, 1, rowArr.length).setValues([rowArr]);
    else sh.appendRow(rowArr);
    saved = draft;
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'SET_SCHEDULE', saved.email, before, after, 'checkpoints ' + checkpoints.join(','));
  notify_(saved.email, 'Timetable updated', schedSummary_(saved, checkpoints), 'schedule:' + target);
  return { ok: true, schedule: saved, checkpoints: checkpoints };
}

function actionMyTimetable_(payload, ctx) {
  const email = ctx.ident.email;
  const schedule = getScheduleForUser_(email);
  const base = { shift: String(ctx.user.shift || ''), now: now_(), today: schedToday_(),
    late_threshold_min: Number(getConfig('late_threshold_min') || CONFIG_DEFAULTS.late_threshold_min) };
  if (!schedule) {
    base.schedule = null; base.checkpoints = []; base.shift_date = base.today;
    base.working_today = null; base.next_due = null;
    return base;
  }
  const checkpoints = schedCheckpoints_(schedule);
  const state = schedCheckpointState_(schedule, checkpoints, email);
  base.schedule = schedule;
  base.shift_date = state.shift_date;
  base.working_today = state.working_today;
  base.checkpoints = state.checkpoints;
  base.next_due = state.next_due;
  return base;
}

/** Staff × days rota screen (§5). Management/Ops Head set it; Team Lead reads it. */
function actionRotaGrid_(payload, ctx) {
  const role = ctx.user.role;
  if (!isMgmt_(role, ctx.ident.email) && role !== 'Team Lead') throw authErr_('not permitted to read the rota', ctx.ident.email);

  const today = schedToday_();
  const weekStart = schedAddDays_(today, -schedDayIndex_(today));
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = schedAddDays_(weekStart, i);
    week.push({ date: d, day: schedDayCode_(d) });
  }
  const scheduleRows = readTab_('SCHEDULES');
  const staff = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const s = schedEffectiveRow_(scheduleRows, u.email, today) || schedDefaultFor_(u.email, u);
    const days = s && s.working_days ? s.working_days.split(',') : [];
    staff.push({
      email: String(u.email || ''), name: String(u.name || ''), role: String(u.role || ''),
      requested_shift: String(u.shift || ''),
      assigned: !!(s && s.source === 'assigned'),
      effective_from: s ? s.effective_from : '',
      shift_label: s ? s.shift_label : '',
      work_start: s ? s.work_start : '', work_end: s ? s.work_end : '',
      break_start: s ? s.break_start : '', break_end: s ? s.break_end : '',
      working_days: s ? s.working_days : '',
      assigned_by: s ? s.assigned_by : '', assigned_at: s ? s.assigned_at : '',
      checkpoints: s ? schedCheckpoints_(s) : [],
      // working is null where Management has not set a working-days pattern yet.
      week: week.map(function (d) {
        return { date: d.date, day: d.day, working: days.length ? days.indexOf(d.day) >= 0 : null };
      }),
    });
  });
  return {
    today: today, days: SCHEDULE_DAY_CODES, week: week,
    shift_labels: SCHEDULE_SHIFT_LABELS,
    staff: stripForRole_(staff, role, ctx.ident.email),
  };
}

const ACTIONS_SCHEDULES = {
  setSchedule: [actionSetSchedule_, 'any'],
  myTimetable: [actionMyTimetable_, 'any'],
  rotaGrid: [actionRotaGrid_, 'any'],
};
