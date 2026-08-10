/** §28 — office attendance (the two taps), the working hours that ride on the Daily
 * Productivity Report, and the Management side of the Ideas box.
 *
 * The rota is the only authority on shift times: schedules, PKT dates and the working-day test
 * come from Schedules.gs and Reports.gs, never from a second copy here — attendance that
 * disagreed with the checkpoint grid would be arguing with the same people it judges.
 *
 * REALITY (local/REALITY-MAP.md): attendance exists in no workbook — office hours are recorded
 * nowhere today, so there is no live column vocabulary to honour and DB_TABS.ATTENDANCE is the
 * whole contract. Its seven columns leave no room for a report reference, so §28.2's "working
 * hours auto-attached" is a join on email+date at read time (getWorkingHoursFor_) and never a
 * new column on REPORTS_2H.
 *
 * REALITY on the evaluation loop (§28.1 → §12.2): Zaid's live PERF tabs record Punctuality as
 * free text ('8.00  am', 'GOOD', 'SOMEWHAT') and the two tabs that actually carry data have no
 * Absence column at all. Hours therefore feed the rubric as CONTEXT a human reads while grading,
 * which is exactly what §28.1 asks for; this module never writes a score.
 */

const ATT_TAB = 'ATTENDANCE';
const ATT_GRID_ROLES = ['Management', 'Ops Head', 'Team Lead'];        // §28.1 + §4.4
const ATT_STATUSES = ['present', 'working', 'not concluded', 'not started', 'absent', 'off'];
const ATT_IDEA_STATUSES = ['new', 'reviewed', 'implemented'];          // §28.3, verbatim
const ATT_HISTORY_DEFAULT_DAYS = 30;
const ATT_HISTORY_MAX_DAYS = 92;
const ATT_IDEA_QUEUE_MAX = 200;
const ATT_IDEA_NOTES_MAX = 2000;
/** Longer than this and the person went home without tapping. The row keeps its blank clock_out
 * — nothing is invented — and the conclusion is refused rather than booking a 30-hour shift. */
const ATT_MAX_SESSION_HOURS = 20;
// Control characters are stripped before storage; newlines survive so notes keep their shape.
const ATT_CTRL_RE = new RegExp('[\\u0000-\\u0009\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

// ---------- time & parsing (PKT — Schedules.gs owns the primitives) ----------

function attToday_() { return schedToday_(); }
function attRound2_(n) { return Math.round(n * 100) / 100; }

/** §5's late threshold, reused: §28 sets no grace of its own, and two different definitions of
 * "late" for the same person on the same morning is worse than either one. */
function attGrace_() {
  const v = Number(getConfig('late_threshold_min'));
  return (isFinite(v) && v >= 0) ? v : Number(CONFIG_DEFAULTS.late_threshold_min);
}

function attDayNo_(dateStr) {
  const p = String(dateStr).split('-');
  return Math.round(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) / 86400000);
}

/** A stamp is stored as a full PKT timestamp, so an overnight shift's 06:10 conclusion carries
 * its own calendar date and no midnight guessing is needed. Tolerates a cell a human edited by
 * hand: a Date, a day fraction, or a bare "HH:mm" against the row's date. */
function attStamp_(v, fallbackDate) {
  if (v === null || v === undefined || v === '') return null;
  let s;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return null;
    s = Utilities.formatDate(v, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss");
  } else {
    s = String(v).trim();
  }
  const full = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})/);
  if (full) {
    const hm = schedHm_(full[2]);
    if (!hm) return null;
    return { date: full[1], hm: hm, min: attDayNo_(full[1]) * 1440 + schedMin_(hm) };
  }
  const bare = schedHm_(v);
  if (!bare || !fallbackDate) return null;
  return { date: fallbackDate, hm: bare, min: attDayNo_(fallbackDate) * 1440 + schedMin_(bare) };
}

function attHoursLabel_(hours) {
  const n = Number(hours);
  if (hours === null || hours === '' || !isFinite(n)) return '';
  const total = Math.round(n * 60);
  return Math.floor(total / 60) + 'h ' + (total % 60) + 'm';
}

function attFlagMinutes_(flag) {
  const m = String(flag || '').match(/(\d+)\s*m/);
  return m ? Number(m[1]) : 0;
}

/** A night shift belongs to the date it STARTED — the same anchor REPORTS_2H uses — so both taps
 * land on one row and 01:30 does not open a second day. Two of the team work that shift. */
function attShiftDate_(schedule) {
  const today = attToday_();
  if (!schedule) return today;
  const start = schedMin_(schedule.work_start), end = schedMin_(schedule.work_end);
  if (start < 0 || end < 0 || end > start) return today;
  return schedNowMin_() < end ? schedAddDays_(today, -1) : today;
}

/** The assigned window on one date, as absolute minutes, so a shift crossing midnight compares
 * against clock stamps without special cases. */
function attWindow_(schedule, dateStr) {
  if (!schedule) return null;
  const start = schedMin_(schedule.work_start), end = schedMin_(schedule.work_end);
  if (start < 0 || end < 0) return null;
  let span = end - start;
  if (span <= 0) span += 1440;
  const base = attDayNo_(dateStr) * 1440 + start;
  return { start: base, end: base + span, span: span };
}

function attBreakMinutes_(schedule) {
  if (!schedule || !schedule.break_start || !schedule.break_end) return 0;
  const bs = schedMin_(schedule.break_start), be = schedMin_(schedule.break_end);
  if (bs < 0 || be < 0) return 0;
  let m = be - bs;
  if (m <= 0) m += 1440;
  return m;
}

/** repIsWorkingDay_ already reads both "Mon,Tue,…" and the "Mon-Sat" the whole team actually
 * works, and the missed-checkpoint sweep judges the same days by it. An unset pattern counts as
 * a working day there, so it counts as one here. */
function attIsWorkingDay_(schedule, dateStr) {
  return repIsWorkingDay_(schedule ? schedule.working_days : '', dateStr);
}

// ---------- rows ----------

function attHeaderIdx_(head, cols, tab) {
  const idx = {};
  head.forEach(function (h, i) { if (String(h)) idx[String(h).trim()] = i + 1; });
  cols.forEach(function (c) { if (!idx[c]) throw new Error(tab + ' is missing column ' + c); });
  return idx;
}

function attObjects_(vals) {
  if (!vals || vals.length < 2) return [];
  const head = vals[0];
  return vals.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    const o = {};
    head.forEach(function (h, i) { o[String(h).trim()] = r[i]; });
    return o;
  });
}

/** working_hours is derived from the two stamps, so correcting a mistyped clock_in corrects the
 * hours with it; the stored figure is trusted only when a stamp is missing. */
function attRow_(raw) {
  const date = schedDateStr_(raw.date);
  const inS = attStamp_(raw.clock_in, date);
  const outS = attStamp_(raw.clock_out, date);
  let hours = null;
  if (inS && outS) {
    const span = attRound2_((outS.min - inS.min) / 60);
    if (span >= 0 && span <= ATT_MAX_SESSION_HOURS) hours = span;
  } else {
    const stored = Number(raw.working_hours);
    if (isFinite(stored) && stored > 0 && stored <= ATT_MAX_SESSION_HOURS) hours = attRound2_(stored);
  }
  return {
    email: String(raw.email || ''),
    date: date,
    clock_in: inS ? inS.hm : '',
    clock_out: outS ? outS.hm : '',
    clock_in_date: inS ? inS.date : '',
    clock_out_date: outS ? outS.date : '',
    working_hours: hours,
    hours_label: attHoursLabel_(hours),
    late_flag: String(raw.late_flag || ''),
    early_flag: String(raw.early_flag || ''),
  };
}

function attGroups_(rows) {
  const map = {};
  rows.forEach(function (r) {
    const k = normalizeEmail(r.email);
    if (!k) return;
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function attRowsInRange_(list, from, to) {
  const out = [];
  list.forEach(function (raw) {
    const d = schedDateStr_(raw.date);
    if (!d || d < from || d > to) return;
    out.push(attRow_(raw));
  });
  out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  return out;
}

function attRowOn_(list, date) {
  let hit = null;
  list.forEach(function (raw) { if (!hit && schedDateStr_(raw.date) === date) hit = attRow_(raw); });
  return hit;
}

function attStatusOf_(row, working, dayOver) {
  if (!row || !row.clock_in) return working ? (dayOver ? 'absent' : 'not started') : 'off';
  if (row.clock_out) return 'present';
  return dayOver ? 'not concluded' : 'working';
}

/** What the two buttons may do right now. A session left open from an earlier date keeps
 * "Conclude" live so the person can close it, while "Start" stays available for today. */
function attSessionFrom_(list, date) {
  const prev = schedAddDays_(date, -1);
  let today = null, open = null;
  list.forEach(function (raw) {
    const d = schedDateStr_(raw.date);
    if (d !== date && d !== prev) return;
    const row = attRow_(raw);
    if (d === date) today = row;
    if (row.clock_in && !row.clock_out && (!open || row.date > open.date)) open = row;
  });
  return { today: today, open_session: open, can_clock_in: !today, can_clock_out: !!open };
}

function attSchedulePublic_(s) {
  if (!s) return null;
  return {
    shift_label: s.shift_label, work_start: s.work_start, work_end: s.work_end,
    break_start: s.break_start, break_end: s.break_end, working_days: s.working_days,
    effective_from: s.effective_from, assigned: s.source === 'assigned',
  };
}

// ---------- evaluation context (§28.1 → §12.2) ----------

/** The figures Zaid's rubric reads while grading Punctuality, Breaks and Absence.
 * Absence counts only days that are already over — a working day still ahead of its shift start
 * is not an absence. Breaks are the SCHEDULED break: two taps cannot see a break being taken, so
 * the rubric's Breaks column stays a human judgement and this number is only its yardstick. */
function attContext_(list, from, to, schedule) {
  const byDate = {};
  attRowsInRange_(list, from, to).forEach(function (r) { byDate[r.date] = r; });
  const cutoff = attShiftDate_(schedule);
  let workingDays = 0, present = 0, absent = 0, late = 0, early = 0, unclosed = 0, hours = 0, hourDays = 0, lateMin = 0;
  for (let d = from; d <= to; d = schedAddDays_(d, 1)) {
    const working = attIsWorkingDay_(schedule, d);
    const row = byDate[d];
    if (working) workingDays++;
    if (row && row.clock_in) {
      present++;
      // A day nobody concluded has no length, so it is not allowed to drag the average down.
      if (row.working_hours) { hours += row.working_hours; hourDays++; }
      if (row.late_flag) { late++; lateMin += attFlagMinutes_(row.late_flag); }
      if (row.early_flag) early++;
      if (!row.clock_out && d < cutoff) unclosed++;
    } else if (working && d < cutoff) {
      absent++;
    }
  }
  return {
    from: from, to: to,
    working_days: workingDays,
    present_days: present,
    absent_days: absent,
    late_days: late,
    avg_late_min: late ? Math.round(lateMin / late) : 0,
    early_days: early,
    not_concluded_days: unclosed,
    total_hours: attRound2_(hours),
    concluded_days: hourDays,
    avg_hours: hourDays ? attRound2_(hours / hourDays) : 0,
    scheduled_break_min: attBreakMinutes_(schedule),
  };
}

// ---------- shared state (one builder behind all three staff-facing actions) ----------

function attState_(ctx, schedule, rows, date, days, message) {
  const email = ctx.user.email;
  const list = attGroups_(rows)[normalizeEmail(email)] || [];
  const from = schedAddDays_(date, -(days - 1));
  return {
    date: date,
    from: from,
    days: days,
    now: now_(),
    late_threshold_min: attGrace_(),
    schedule: attSchedulePublic_(schedule),
    working_today: attIsWorkingDay_(schedule, date),
    session: attSessionFrom_(list, date),
    history: stripForRole_(attRowsInRange_(list, from, date), ctx.user.role, ctx.ident.email),
    context: attContext_(list, from, date, schedule),
    statuses: ATT_STATUSES,
    message: message || '',
  };
}

// ---------- actions: the two taps (§28.1) ----------

/** "Start office working". Works with no rota assigned — §5 leaves schedules to Management, and
 * until one exists there is nothing to be late against, so the tap must not wait for it. */
function actionClockIn_(payload, ctx) {
  const email = ctx.user.email;                       // identity from the token only (RL-1)
  const schedule = getScheduleForUser_(email);
  const date = attShiftDate_(schedule);
  const days = attDays_(payload.days);
  const stamp = now_();
  const at = attStamp_(stamp, date);
  const win = attWindow_(schedule, date);
  let lateFlag = '';
  if (win && attIsWorkingDay_(schedule, date)) {
    const lateMin = at.min - win.start;
    if (lateMin > attGrace_()) lateFlag = 'late ' + lateMin + 'm';
  }

  let rows = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName(ATT_TAB);
    const vals = sh.getDataRange().getValues();
    const idx = attHeaderIdx_(vals[0], DB_TABS.ATTENDANCE, ATT_TAB);
    const n = normalizeEmail(email);
    for (let i = 1; i < vals.length; i++) {
      if (normalizeEmail(vals[i][idx.email - 1]) !== n) continue;
      if (schedDateStr_(vals[i][idx.date - 1]) !== date) continue;
      throw new Error(SAFE_ERROR_PREFIX + 'you already started office working for ' + date);
    }
    // Addressed by header index, never by position, so a reordered tab still writes each value
    // under its own heading — the same rule the business sheets are written by.
    const row = [];
    for (let c = 0; c < vals[0].length; c++) row.push('');
    row[idx.email - 1] = email;
    row[idx.date - 1] = date;
    row[idx.clock_in - 1] = stamp;
    row[idx.late_flag - 1] = lateFlag;
    const r = sh.getLastRow() + 1;
    // The sheet would turn a date or a timestamp into its own value type and the email+date key
    // would stop matching, so these cells are made text before anything is written to them.
    sh.getRange(r, idx.date).setNumberFormat('@');
    sh.getRange(r, idx.clock_in).setNumberFormat('@');
    sh.getRange(r, idx.clock_out).setNumberFormat('@');
    sh.getRange(r, 1, 1, row.length).setValues([row]);
    vals.push(row);
    rows = attObjects_(vals);
  } finally {
    lock.releaseLock();
  }

  logActivity_(ctx.ident.email, 'CLOCK_IN', ATT_TAB + ':' + date, '', at.hm, lateFlag || 'on time');
  return attState_(ctx, schedule, rows, date, days,
    'Started office working at ' + at.hm + ' PKT' + (lateFlag ? ' · ' + lateFlag : ''));
}

/** "Conclude working". The open row is searched over the shift date AND the one before it, so an
 * overnight worker tapping after work_end still closes the shift they actually worked. */
function actionClockOut_(payload, ctx) {
  const email = ctx.user.email;
  const schedule = getScheduleForUser_(email);
  const date = attShiftDate_(schedule);
  const days = attDays_(payload.days);
  const stamp = now_();
  const n = normalizeEmail(email);

  let rows = [], closedDate = '', hours = 0, earlyFlag = '', outHm = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName(ATT_TAB);
    const vals = sh.getDataRange().getValues();
    const idx = attHeaderIdx_(vals[0], DB_TABS.ATTENDANCE, ATT_TAB);

    let rowNum = -1, rowDate = '', started = null;
    [date, schedAddDays_(date, -1)].forEach(function (d) {
      if (rowNum > 0) return;
      for (let i = 1; i < vals.length; i++) {
        if (normalizeEmail(vals[i][idx.email - 1]) !== n) continue;
        if (schedDateStr_(vals[i][idx.date - 1]) !== d) continue;
        const inS = attStamp_(vals[i][idx.clock_in - 1], d);
        if (!inS) continue;
        if (attStamp_(vals[i][idx.clock_out - 1], d)) {
          if (d === date) throw new Error(SAFE_ERROR_PREFIX + 'you already concluded working for ' + d);
          continue;
        }
        rowNum = i + 1; rowDate = d; started = inS;
        break;
      }
    });
    if (rowNum < 0) throw new Error(SAFE_ERROR_PREFIX + 'no open working session — tap "Start office working" first');

    const at = attStamp_(stamp, rowDate);
    const span = attRound2_((at.min - started.min) / 60);
    if (span < 0) throw new Error(SAFE_ERROR_PREFIX + 'the clock-out is before the recorded start — ask Management to correct the record');
    if (span > ATT_MAX_SESSION_HOURS) {
      throw new Error(SAFE_ERROR_PREFIX + 'that session started ' + attHoursLabel_(span) +
        ' ago and was never concluded — ask Management to correct ' + rowDate);
    }
    hours = span;
    outHm = at.hm;
    const win = attWindow_(schedule, rowDate);
    if (win && attIsWorkingDay_(schedule, rowDate)) {
      const earlyMin = win.end - at.min;
      if (earlyMin > attGrace_()) earlyFlag = 'early ' + earlyMin + 'm';
    }

    const rowArr = vals[rowNum - 1].slice();
    rowArr[idx.clock_out - 1] = stamp;
    rowArr[idx.working_hours - 1] = hours;
    rowArr[idx.early_flag - 1] = earlyFlag;
    sh.getRange(rowNum, idx.clock_out).setNumberFormat('@');
    sh.getRange(rowNum, 1, 1, rowArr.length).setValues([rowArr]);
    vals[rowNum - 1] = rowArr;
    closedDate = rowDate;
    rows = attObjects_(vals);
  } finally {
    lock.releaseLock();
  }

  logActivity_(ctx.ident.email, 'CLOCK_OUT', ATT_TAB + ':' + closedDate, 'open',
    outHm + ' · ' + hours + 'h', earlyFlag || 'full shift');
  return attState_(ctx, schedule, rows, date, days,
    'Concluded working for ' + closedDate + ' — ' + attHoursLabel_(hours) +
    (earlyFlag ? ' · ' + earlyFlag : ''));
}

/** §28.1 "staff see their own history" — own only. payload.email is ignored by design (RL-1);
 * the grid below is the one path to anyone else's attendance. */
function actionMyAttendance_(payload, ctx) {
  const email = ctx.user.email;
  const schedule = getScheduleForUser_(email);
  return attState_(ctx, schedule, readTab_(ATT_TAB), attShiftDate_(schedule), attDays_(payload.days), '');
}

// ---------- actions: the grid Management and Team Lead see (§28.1 + §28.2) ----------

/** The attendance grid that sits beside the checkpoint grid: one row per approved person for the
 * chosen date, each carrying that day's Daily Productivity Report with the hours attached (§28.2)
 * and a rolling window of context for the evaluation (§12.2). Every tab is read once. */
function actionAttendanceGrid_(payload, ctx) {
  if (!isSuperAdmin(ctx.ident.email) && ATT_GRID_ROLES.indexOf(ctx.user.role) < 0) {
    throw authErr_('not permitted to read the attendance grid', ctx.ident.email);
  }
  const date = payload.date ? attValidDate_(payload.date) : attToday_();
  const days = attDays_(payload.days);
  const from = schedAddDays_(date, -(days - 1));

  const groups = attGroups_(readTab_(ATT_TAB));
  const scheduleRows = readTab_('SCHEDULES');
  const reportIdx = repIndexRows_(readTab_('REPORTS_2H'));
  const totals = { people: 0, present: 0, working: 0, absent: 0, off: 0, late: 0, early: 0, not_concluded: 0, hours: 0 };
  const rows = [];

  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const schedule = schedEffectiveRow_(scheduleRows, u.email, date) || schedDefaultFor_(u.email, u);
    const list = groups[normalizeEmail(u.email)] || [];
    const row = attRowOn_(list, date);
    const working = attIsWorkingDay_(schedule, date);
    const status = attStatusOf_(row, working, date < attShiftDate_(schedule));

    totals.people++;
    if (status === 'present') totals.present++;
    if (status === 'working') totals.working++;
    if (status === 'absent') totals.absent++;
    if (status === 'off') totals.off++;
    if (status === 'not concluded') totals.not_concluded++;
    if (row && row.late_flag) totals.late++;
    if (row && row.early_flag) totals.early++;
    if (row && row.working_hours) totals.hours += row.working_hours;

    rows.push({
      email: String(u.email || ''),
      name: String(u.name || ''),
      role: String(u.role || ''),
      shift: String(u.shift || ''),
      schedule: attSchedulePublic_(schedule),
      working_day: working,
      status: status,
      clock_in: row ? row.clock_in : '',
      clock_out: row ? row.clock_out : '',
      working_hours: row ? row.working_hours : null,
      hours_label: row ? row.hours_label : '',
      late_flag: row ? row.late_flag : '',
      early_flag: row ? row.early_flag : '',
      daily_productivity_report: attDailyReport_(reportIdx, u, schedule, date, row),
      context: attContext_(list, from, date, schedule),
    });
  });

  totals.hours = attRound2_(totals.hours);
  return {
    date: date, from: from, days: days,
    late_threshold_min: attGrace_(),
    statuses: ATT_STATUSES,
    rows: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    totals: totals,
  };
}

/** §28.2 — the final checkpoint of the shift IS the Daily Productivity Report: role counters,
 * the required "Value addition today", and the hours joined on from attendance. Reports.gs stores
 * the value addition inside work_summary (REPORTS_2H has no column for it), so it is split back
 * out here against the same label rather than a second copy of the wording. */
function attDailyReport_(reportIdx, user, schedule, date, attendanceRow) {
  const checkpoints = schedCheckpoints_(schedule);
  if (!checkpoints.length) return null;
  const finalCp = checkpoints[checkpoints.length - 1];
  const rep = reportIdx[normalizeEmail(user.email) + '|' + date + '|' + finalCp];
  if (!rep) return { checkpoint: finalCp, filed: false, flag: '', submitted_at: '', work_summary: '', value_addition: '', counts: [], working_hours: attendanceRow ? attendanceRow.working_hours : null, hours_label: attendanceRow ? attendanceRow.hours_label : '' };
  const split = attSplitValueAddition_(rep.work_summary);
  const labels = repCountFields_(String(user.role || ''));
  return {
    checkpoint: finalCp,
    filed: String(rep.flag || '') !== 'missed',
    flag: String(rep.flag || ''),
    submitted_at: String(rep.submitted_at || ''),
    work_summary: split.work_summary,
    value_addition: split.value_addition,
    counts: labels.map(function (label, i) {
      const v = Number(rep['count_' + (i + 1)]);
      return { label: label, value: isFinite(v) ? v : 0 };
    }),
    working_hours: attendanceRow ? attendanceRow.working_hours : null,
    hours_label: attendanceRow ? attendanceRow.hours_label : '',
  };
}

function attSplitValueAddition_(summary) {
  const label = (typeof VALUE_ADDITION_LABEL === 'string' && VALUE_ADDITION_LABEL) ? VALUE_ADDITION_LABEL : 'Value addition today';
  const s = String(summary || '');
  const at = s.indexOf(label + ':');
  if (at < 0) return { work_summary: s.trim(), value_addition: '' };
  return { work_summary: s.slice(0, at).trim(), value_addition: s.slice(at + label.length + 1).trim() };
}

// ---------- actions: the Ideas box, Management side (§28.3) ----------

/** The review queue. A blank or unknown status cell reads as `new` so nothing an odd cell value
 * touches can drop out of Management's sight. */
function actionIdeasQueue_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const want = payload.status ? attIdeaStatus_(payload.status) : '';
  const index = attStaffIndex_();
  const counts = { new: 0, reviewed: 0, implemented: 0, total: 0 };
  const list = [];

  readTab_('IDEAS').forEach(function (r) {
    const status = attIdeaStatusOf_(r.status);
    counts[status]++;
    counts.total++;
    if (want && status !== want) return;
    const author = attResolveAuthor_(index, r.by);
    list.push({
      idea_id: String(r.idea_id || ''),
      by: String(r.by || ''),
      author_email: author ? String(author.email) : '',
      department: String(r.department || ''),
      idea_text: String(r.idea_text || ''),
      submitted_at: String(r.submitted_at || ''),
      status: status,
      management_notes: String(r.management_notes || ''),
      can_shoutout: !!author,
    });
  });
  list.sort(function (a, b) { return a.submitted_at < b.submitted_at ? 1 : (a.submitted_at > b.submitted_at ? -1 : 0); });

  return {
    statuses: ATT_IDEA_STATUSES,
    counts: counts,
    ideas: stripForRole_(list.slice(0, ATT_IDEA_QUEUE_MAX), ctx.user.role, ctx.ident.email),
    truncated: list.length > ATT_IDEA_QUEUE_MAX,
    showing: 'newest ' + Math.min(list.length, ATT_IDEA_QUEUE_MAX) + ' of ' + list.length,
  };
}

/** Review, or mark implemented — which fires the author's shoutout on the Daily Agenda (§28.3,
 * §14). The mark is committed before the shoutout is attempted and never rolled back by it: the
 * record is the point and the celebration is a courtesy, so a shoutout that cannot be posted is
 * reported back rather than allowed to lose the decision. Re-marking an idea that is already
 * implemented does not congratulate the author twice. */
function actionMarkIdea_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const ideaId = String(payload.idea_id || '').trim();
  if (!ideaId) throw new Error(SAFE_ERROR_PREFIX + 'which idea?');
  const status = attIdeaStatus_(payload.status);
  const keepNotes = (payload.notes === undefined || payload.notes === null);
  const notes = keepNotes ? '' : attText_(payload.notes, ATT_IDEA_NOTES_MAX);

  let before = null, saved = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('IDEAS');
    const vals = sh.getDataRange().getValues();
    const idx = attHeaderIdx_(vals[0], DB_TABS.IDEAS, 'IDEAS');
    let rowNum = -1;
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][idx.idea_id - 1]).trim() === ideaId) { rowNum = i + 1; break; }
    }
    if (rowNum < 0) throw new Error(SAFE_ERROR_PREFIX + 'idea not found');

    const cur = vals[rowNum - 1];
    before = {
      status: attIdeaStatusOf_(cur[idx.status - 1]),
      by: String(cur[idx.by - 1] || ''),
      idea_text: String(cur[idx.idea_text - 1] || ''),
      notes: String(cur[idx.management_notes - 1] || ''),
    };
    const rowArr = cur.slice();
    rowArr[idx.status - 1] = status;
    rowArr[idx.management_notes - 1] = keepNotes ? before.notes : notes;
    // Management types into this cell, and Sheets treats a leading "=" as a formula.
    sh.getRange(rowNum, idx.management_notes).setNumberFormat('@');
    sh.getRange(rowNum, 1, 1, rowArr.length).setValues([rowArr]);
    vals[rowNum - 1] = rowArr;
    saved = {
      idea_id: ideaId,
      by: before.by,
      department: String(rowArr[idx.department - 1] || ''),
      idea_text: before.idea_text,
      submitted_at: String(rowArr[idx.submitted_at - 1] || ''),
      status: status,
      management_notes: String(rowArr[idx.management_notes - 1] || ''),
    };
  } finally {
    lock.releaseLock();
  }

  logActivity_(ctx.ident.email, 'MARK_IDEA', 'IDEAS:' + ideaId,
    before.status + ' | ' + before.notes, status + ' | ' + saved.management_notes, '');

  let shoutout = false, shoutoutNote = '';
  if (status === 'implemented' && before.status !== 'implemented') {
    const author = attResolveAuthor_(attStaffIndex_(), before.by);
    if (!author) {
      // IDEAS records its author by display name (§28.3 schema), so an unmatched or duplicated
      // name has no address to congratulate — Management is told instead of guessing a person.
      shoutoutNote = 'no single approved staff member matches "' + before.by + '"';
    } else if (normalizeEmail(author.email) === normalizeEmail(ctx.ident.email)) {
      shoutoutNote = 'the idea is your own';
    } else if (typeof actionCongratulate_ !== 'function') {
      shoutoutNote = 'the agenda module is not available';
    } else {
      try {
        actionCongratulate_({ to: author.email, text: 'Idea implemented — ' + attLine_(before.idea_text, 140) }, ctx);
        shoutout = true;
      } catch (e) {
        shoutoutNote = 'the shoutout could not be posted';
        logActivity_(ctx.ident.email, 'IDEA_SHOUTOUT_FAILED', 'IDEAS:' + ideaId, '', String(author.email), String(e && e.message || e));
      }
    }
  }
  return { ok: true, idea: stripForRole_(saved, ctx.user.role, ctx.ident.email), shoutout: shoutout, shoutout_note: shoutoutNote };
}

// ---------- shared with other modules ----------

/** §28.2 — the hours the Daily Productivity Report carries. Pass `rows` when calling inside a
 * loop so the tab is read once for the whole grid rather than once per person. */
function getWorkingHoursFor_(email, date, rows) {
  const list = (rows ? attGroups_(rows) : attGroups_(readTab_(ATT_TAB)))[normalizeEmail(email)] || [];
  const row = attRowOn_(list, schedDateStr_(date) || attToday_());
  return row ? row.working_hours : null;
}

/** §28.1 — hours as evaluation context for Punctuality, Breaks and Absence (§12.2). */
function getAttendanceEvalContext_(email, from, to, rows) {
  const a = attValidDate_(from), b = attValidDate_(to);
  const schedule = schedEffectiveRow_(readTab_('SCHEDULES'), email, b) || getScheduleForUser_(email);
  const list = (rows ? attGroups_(rows) : attGroups_(readTab_(ATT_TAB)))[normalizeEmail(email)] || [];
  return attContext_(list, a <= b ? a : b, a <= b ? b : a, schedule);
}

// ---------- validation & small helpers ----------

function attValidDate_(v) {
  const s = schedDateStr_(v);
  if (!s) throw new Error(SAFE_ERROR_PREFIX + 'invalid date');
  return s;
}

function attDays_(v) {
  if (v === undefined || v === null || v === '') return ATT_HISTORY_DEFAULT_DAYS;
  const n = Number(v);
  if (!isFinite(n) || n < 1 || Math.floor(n) !== n) throw new Error(SAFE_ERROR_PREFIX + 'days must be a whole number');
  if (n > ATT_HISTORY_MAX_DAYS) throw new Error(SAFE_ERROR_PREFIX + 'at most ' + ATT_HISTORY_MAX_DAYS + ' days at a time');
  return n;
}

function attIdeaStatus_(v) {
  const s = String(v || '').trim().toLowerCase();
  if (ATT_IDEA_STATUSES.indexOf(s) < 0) throw new Error(SAFE_ERROR_PREFIX + 'status must be one of ' + ATT_IDEA_STATUSES.join(', '));
  return s;
}

function attIdeaStatusOf_(v) {
  const s = String(v || '').trim().toLowerCase();
  return ATT_IDEA_STATUSES.indexOf(s) >= 0 ? s : 'new';
}

function attText_(v, max) {
  const s = String(v === undefined || v === null ? '' : v);
  return s.replace(ATT_CTRL_RE, ' ').trim().slice(0, max);
}

function attLine_(v, max) {
  return attText_(v, max).replace(/\s*\n\s*/g, ' ').trim();
}

/** Approved staff by normalized email and by lower-cased display name — the name index is what
 * lets an IDEAS row, which stores only a name, be traced back to an address. */
function attStaffIndex_() {
  const byEmail = {}, byName = {};
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const rec = { email: String(u.email || ''), name: String(u.name || ''), role: String(u.role || '') };
    byEmail[normalizeEmail(rec.email)] = rec;
    const key = rec.name.trim().toLowerCase();
    if (!key) return;
    if (!byName[key]) byName[key] = [];
    byName[key].push(rec);
  });
  return { byEmail: byEmail, byName: byName };
}

function attResolveAuthor_(index, by) {
  const raw = String(by || '').trim();
  if (!raw) return null;
  if (raw.indexOf('@') > 0) return index.byEmail[normalizeEmail(raw)] || null;
  const hit = index.byName[raw.toLowerCase()];
  return (hit && hit.length === 1) ? hit[0] : null;      // an ambiguous name is not a person
}

const ACTIONS_ATTENDANCE = {
  clockIn: [actionClockIn_, 'any'],
  clockOut: [actionClockOut_, 'any'],
  myAttendance: [actionMyAttendance_, 'any'],
  attendanceGrid: [actionAttendanceGrid_, 'any'],
  ideasQueue: [actionIdeasQueue_, 'any'],
  markIdea: [actionMarkIdea_, 'any'],
};
