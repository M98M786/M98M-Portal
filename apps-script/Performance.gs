/** Phase 6 — §12 STAFF PERFORMANCE, both layers.
 *
 * §12.1 automatic: per person daily/weekly with increasing/decreasing trend arrows — tasks
 * completed vs deadline · avg time-taken · 2-hourly report compliance % · role counters. Staff
 * see ONLY their own numbers; Management, Ops Head and Team Lead see everyone.
 * §12.2 manual: Zaid's monthly rubric, the 18 columns exactly, Management + Team Lead only.
 *
 * REALITY (REALITY-MAP.md) vs §12.2: that exact 18-column order exists ONLY on the JULY and
 * SAMPLE ONLY tabs of the live Zaid workbook, and both are header-only. The two tabs that hold
 * data — APRIL (17 cols, no Absence, Verbal & Non Verbal at F and Idea Generation at G) and MAY
 * (17 cols, col A renamed WEEK, col E renamed 'Breaks extra') — do not match the schema. So the
 * portal BUILDS the 18-column version as the go-forward template, READS the older shapes
 * tolerantly by header, and never writes into them: a whitelisted header a month tab does not
 * carry comes back in skippedMissing and is reported, never created (the Sheet Contract).
 *
 * Nothing counts until APPROVED (§8.0b): every task counter reads `Completed`, which only
 * actionApproveTask_ can set — a submitted task is reported separately as awaiting approval so a
 * low number is explained rather than mysterious.
 *
 * This phase reads more data than any other, so the shape is: ONE pass per source into a
 * per-person accumulator, the result parked in DASH_CACHE (§13.4), and every viewer served from
 * the cache. Nothing recomputes per viewer while the cache is fresh.
 */

const PERF_TZ = 'Asia/Karachi';                       // staff-facing dates are PKT (§12, §5)

// ---------- cache (§13.4) ----------
const PERF_CACHE_METRIC = 'PERF';                     // DASH_CACHE: metric=PERF, account=email, period=day:|week:
const PERF_MAX_AGE_MIN = 20;                          // the trigger runs every 15 min; 20 allows one late run
const PERF_BUSY_KEY = 'perf_refresh_busy';
const PERF_BUSY_SEC = 180;
const PERF_TEAM_ROLES = ['Team Lead'];                // §12.1 "Mgmt+TL"; Management/Ops Head arrive via isMgmt_

/* ACTIVITY_LOG is append-only and chronological, so its TAIL is the recent past. Four of the
 * counters below have no home but this log, and reading the whole tab would grow without bound
 * until one request spends its entire budget there. This window must always outlast the widest
 * period the grids show (two weeks); at portal volume it covers roughly three. */
const PERF_LOG_TAIL = 12000;

// ---------- §12.1 the metric catalogue ----------
/* `scope` is a roleDept_ value; a counter outside a person's department still appears when it is
 * non-zero, because §4.1 has Yousaf leading the team AND hunting half-time — the org has people
 * whose real work is wider than their role word. `source` travels with the number so no grid can
 * imply a measurement the business does not actually make. */
const PERF_METRICS = [
  { key: 'tasks_completed', label: 'tasks completed', unit: 'count', better: 'up', scope: 'all',
    source: 'TASKS — approved only (§8.0b)' },
  { key: 'tasks_on_time', label: 'completed within deadline', unit: 'count', better: 'up', scope: 'all',
    source: 'TASKS — submitted_at vs deadline_pkt' },
  { key: 'tasks_late', label: 'completed past deadline', unit: 'count', better: 'down', scope: 'all',
    source: 'TASKS — submitted_at vs deadline_pkt' },
  { key: 'on_time_pct', label: 'tasks completed vs deadline', unit: 'percent', better: 'up', scope: 'all',
    source: 'TASKS — on-time share of approved tasks' },
  { key: 'avg_time_taken_min', label: 'avg time-taken', unit: 'minutes', better: 'down', scope: 'all',
    source: 'TASKS time_taken_min — the employee clock, stopped at submission (§8.0b)' },
  { key: 'report_compliance_pct', label: '2-hourly report compliance', unit: 'percent', better: 'up', scope: 'all',
    source: 'REPORTS_2H against the checkpoints the assigned schedule derives (§5)' },
  { key: 'hunts', label: 'hunts', unit: 'count', better: 'up', scope: 'Hunting',
    source: 'HUNTING_DB' },
  { key: 'hunt_approval_rate_pct', label: 'approval rate', unit: 'percent', better: 'up', scope: 'Hunting',
    source: 'HUNTING_DB Approval Status — decided hunts only' },
  { key: 'listings', label: 'listings', unit: 'count', better: 'up', scope: 'Listing',
    source: 'TASKS listing_new — approved' },
  { key: 'revisions_done', label: 'revisions done', unit: 'count', better: 'up', scope: 'Listing',
    source: 'TASKS listing_revision — approved, includes the +72h revision (§8.0)' },
  { key: 'campaigns_set', label: 'campaigns set', unit: 'count', better: 'up', scope: 'Advertising',
    source: 'CAMPAIGN_LOG' },
  { key: 'campaign_lag_hours', label: 'new-listing to campaign lag', unit: 'hours', better: 'down', scope: 'Advertising',
    source: 'CAMPAIGN_LOG first campaign per item vs its listing_new submission' },
  { key: 'orders_processed', label: 'orders processed', unit: 'count', better: 'up', scope: 'Order Processing',
    source: 'ACTIVITY_LOG RECORD_PURCHASE — distinct order rows' },
  { key: 'orders_rechecked', label: 'rechecked', unit: 'count', better: 'up', scope: 'Order Processing',
    source: 'ACTIVITY_LOG SUBMIT_RECHECK — completed checks per day (§11.1)' },
  { key: 'wrong_orders_found_by', label: 'wrong orders found by', unit: 'count', better: 'up', scope: 'Order Processing',
    source: 'ACTIVITY_LOG WRONG_ORDER — the finder (§11.3)' },
  { key: 'wrong_orders_caused', label: 'wrong orders caused', unit: 'count', better: 'down', scope: 'Order Processing',
    source: 'ACTIVITY_LOG WRONG_ORDER — Processed By (§11.3)' },
  { key: 'replies_sent', label: 'replies sent', unit: 'count', better: 'up', scope: 'CS',
    source: 'REPORTS_2H "buyer replies" — self-reported at each checkpoint until the Defense Agent log lands (§13.3)' },
  { key: 'cases_closed', label: 'cases closed', unit: 'count', better: 'up', scope: 'CS',
    source: 'ACTIVITY_LOG CS_CASE_UPDATE — the update that records FINAL RESULT (§8.6)' },
];

const PERF_SORT_EXTRA = ['name', 'role'];

// ---------- §12.2 the rubric ----------
/* §4.3 grants the manual evaluation to Management and Team Lead. §4.4 is explicit that the Front
 * Head of Operations does NOT get it — so this list cannot be isMgmt_, which includes Ops Head. */
const PERF_EVAL_ROLES = ['Management', 'Team Lead'];
const PERF_EVAL_KIND = 'staff_perf';
const PERF_EVAL_TEMPLATE_TAB = 'SAMPLE ONLY';         // the blank 18-col template — never written to
const PERF_EVAL_MAX_TEXT = 1000;
const PERF_EVAL_READ_LIMIT = 400;
const PERF_EVAL_MAX_TABS = 14;
const PERF_MONTH_TABS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

/* [OPEN-6] — should each staff member see their own evaluation? Spec default: NO until Hasib says
 * otherwise. The key is absent from CONFIG_DEFAULTS, and getConfig returns '' for a key that was
 * never written, so the default holds without a migration; flipping it is a CONFIG edit, not code. */
const PERF_SEE_OWN_EVAL_KEY = 'staff_see_own_evaluation';

/* The 18 columns in §12.2's order. `sheet` is the LIVE workbook's own spelling — 'Reaction to
 * Criticisim' is misspelled on all four tabs and in its dropdown, 'Mobile Usage During Work '
 * carries a trailing space and 'Comments:' a colon. `alt` are the header names the older data
 * tabs use for the same column, so APRIL and MAY read correctly without being written to.
 * `vocab` is the tab's real data-validation list, verbatim — including 'Some what ' and
 * 'Frequently ' with their trailing spaces, and the misspellings that are canonical here.
 * The Sheets export puts the header text itself first in every list; users occasionally picked it
 * (MAY E7 holds 'Breaks extra'), so that artifact is deliberately NOT offered as a value.
 * Punctuality is NOT strict: its dropdown offers 10:00–11:00 am in 5-minute steps, APRIL was typed
 * free-hand as '8.30 am' and '8.00  am', and MAY switched the whole vocabulary to GOOD/SOMEWHAT.
 * Absence, Late Reason, Idea Generation and Comments have no dropdown anywhere in the file. */
const PERF_EVAL_FIELDS = [
  { key: 'date', label: 'Date', sheet: 'Date', alt: ['WEEK'] },
  { key: 'staff_name', label: 'Staff Name', sheet: 'Staff Name', alt: [] },
  { key: 'punctuality', label: 'Punctuality', sheet: 'Punctuality', alt: [], strict: false,
    vocab: ['10.00  am', '10.05 am', '10.10 am', '10.15 am', '10: 20 am', '10.25 am', '10.30 am',
      '10.35 am', '10.40 am', '10.45 am', '10..50 am', '10.55 am', '11. 00 am',
      'GOOD', 'SOMEWHAT', '3  DAYS IN A WEEK '] },
  { key: 'late_reason', label: 'Late Reason', sheet: 'Late Reason', alt: [] },
  { key: 'breaks', label: 'Breaks', sheet: 'Breaks', alt: ['Breaks extra'], strict: true,
    vocab: ['10 minutes', '15 minutes', '20 minutes', '25 minutes', '30 minutes', '35 minutes', '40 minutes'] },
  { key: 'absence', label: 'Absence', sheet: 'Absence', alt: [] },
  { key: 'tasks_sheet', label: 'Tasks Sheet', sheet: 'Tasks Sheet', alt: [], strict: true,
    vocab: ['Completed', 'Not Completed', 'Explaination Given', 'Statisfied', 'Not Statified', 'No Explaination'] },
  { key: 'task_turnaround_time', label: 'Task Turnaround Time', sheet: 'Task Turnaround Time', alt: [], strict: true,
    vocab: ['On Time', 'Late', 'Concerning'] },
  { key: 'work_pressure_handling', label: 'Work Pressure Handling', sheet: 'Work Pressure Handling', alt: [], strict: true,
    vocab: ['Calm', 'Nervous', 'Confident'] },
  { key: 'verbal_non_verbal', label: 'Verbal & Non Verbal', sheet: 'Verbal & Non Verbal', alt: [], strict: true,
    vocab: ['Excellent', 'Good', 'Some what ', 'Little Concerning', 'Very Concerning'] },
  { key: 'willing_to_learn', label: 'Willing to learn', sheet: 'Willing to learn', alt: [], strict: true,
    vocab: ['Yes', 'No', 'Some What', 'Follow Intruction', 'Improvise'] },
  { key: 'reaction_to_criticism', label: 'Reaction to Criticism', sheet: 'Reaction to Criticisim',
    alt: ['Reaction to Criticism'], strict: true,
    vocab: ['Positive', 'Negative', 'Neutral', 'Debate'] },
  { key: 'office_ethics', label: 'Office Ethics', sheet: 'Office Ethics', alt: [], strict: true,
    vocab: ['Proffessional', 'Decent', 'Non Professional'] },
  { key: 'desk_cleaning', label: 'Desk Cleaning', sheet: 'Desk Cleaning', alt: [], strict: true,
    vocab: ['Yes', 'No'] },
  { key: 'mobile_usage_during_work', label: 'Mobile Usage During Work', sheet: 'Mobile Usage During Work ',
    alt: ['Mobile Usage During Work'], strict: true,
    vocab: ['Permission', 'Without Permission', 'Rarely', 'Frequently '] },
  { key: 'helping_teammates', label: 'Helping Teammates', sheet: 'Helping Teammates', alt: [], strict: true,
    vocab: ['Always', 'Only When asked', 'Detailed', 'Breif', 'Not Needed'] },
  { key: 'idea_generation', label: 'Idea Generation', sheet: 'Idea Generation', alt: [] },
  { key: 'comments', label: 'Comments', sheet: 'Comments:', alt: ['Comments'] },
];

const PERF_EVAL_SHEET_HEADERS = PERF_EVAL_FIELDS.map(function (f) { return f.sheet; });

// ================= §12.1 — the automatic layer =================

/** The caller's own numbers, daily and weekly, with the trend arrow against the period before.
 * No role gate beyond "approved": this action can only ever describe the person asking. */
function actionMyPerformance_(payload, ctx) {
  const fresh = perfEnsureFresh_(false);
  const me = normalizeEmail(ctx.ident.email);
  const view = perfPersonView_(me, fresh.cache, {
    email: ctx.user.email, name: ctx.user.name, role: ctx.user.role,
  });
  const out = {
    person: view,
    columns: PERF_METRICS,
    computed_at: fresh.computed_at,
    stale: fresh.stale,
    source: fresh.computed_at ? 'DASH_CACHE' : 'not computed yet',
  };
  out.person = perfStripRecord_(out.person, ctx);
  return out;
}

/** Everyone's numbers for one period, sortable. Management, Ops Head (§4.4 performance grids) and
 * Team Lead (§12.1) only. `refresh:true` is the §13.4 Refresh-now button and is Management-only. */
function actionTeamPerformance_(payload, ctx) {
  if (!perfMaySeeAll_(ctx)) throw new Error('role may not see team performance');

  const wantRefresh = payload.refresh === true || String(payload.refresh || '') === 'true';
  if (wantRefresh && !isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('only Management forces a recompute');
  const fresh = perfEnsureFresh_(wantRefresh);

  const kind = String(payload.period || 'day').trim();
  if (kind !== 'day' && kind !== 'week') throw new Error(SAFE_ERROR_PREFIX + 'period must be day or week');

  const rows = [];
  perfUsers_().forEach(function (u) {
    const view = perfPersonView_(normalizeEmail(u.email), fresh.cache, u);
    const p = view.periods[kind];
    rows.push({
      email: view.email, name: view.name, role: view.role, department: view.department,
      period: p.period, compare: p.compare, from: p.from, to: p.to,
      metric_keys: p.metric_keys, metrics: p.metrics, notes: p.notes, has_data: p.has_data,
    });
  });

  perfSortRows_(rows, payload.sort, payload.dir);

  return {
    period: kind,
    rows: perfStripRows_(rows, ctx),
    columns: PERF_METRICS,
    sortable: PERF_SORT_EXTRA.concat(PERF_METRICS.map(function (m) { return m.key; })),
    computed_at: fresh.computed_at,
    stale: fresh.stale,
    refreshed: fresh.computed,
    source: fresh.computed_at ? 'DASH_CACHE' : 'not computed yet',
  };
}

// ---------- assembling one person from the cache ----------
function perfPersonView_(email, cache, user) {
  const periods = perfPeriodList_();
  const dept = roleDept_(user && user.role);
  const out = {
    email: (user && user.email) || email, name: (user && user.name) || email,
    role: (user && user.role) || '', department: dept, periods: {},
  };
  ['day', 'week'].forEach(function (kind) {
    const cur = perfFindPeriod_(periods, kind, 0);
    const prev = perfFindPeriod_(periods, kind, 1);
    const a = perfCacheGet_(cache, email, cur.key);
    const b = perfCacheGet_(cache, email, prev.key);
    out.periods[kind] = perfPeriodView_(cur, prev, dept, a, b);
  });
  return out;
}

function perfPeriodView_(cur, prev, dept, a, b) {
  const metrics = {}, keys = [];
  PERF_METRICS.forEach(function (m) {
    const c = a ? a[m.key] : '';
    const p = b ? b[m.key] : '';
    const inScope = (m.scope === 'all' || m.scope === dept);
    if (!inScope && !perfNonZero_(c) && !perfNonZero_(p)) return;
    keys.push(m.key);
    metrics[m.key] = perfTrend_(m, c, p);
  });
  return {
    period: cur.key, compare: prev.key, label: cur.label, from: cur.from, to: cur.to,
    metric_keys: keys, metrics: metrics,
    notes: (a && a.notes) || {},
    has_data: !!a,
  };
}

/** The arrow §12.1 asks for. `better` says which direction is good news — wrong orders caused
 * going up is not the same kind of "increasing" as listings going up. */
function perfTrend_(metric, current, previous) {
  const c = Number(current), p = Number(previous);
  const hasC = current !== '' && current !== null && current !== undefined && isFinite(c);
  const hasP = previous !== '' && previous !== null && previous !== undefined && isFinite(p);
  const rec = {
    key: metric.key, label: metric.label, unit: metric.unit, better: metric.better,
    value: hasC ? c : '', prev: hasP ? p : '', delta: '', dir: 'flat', source: metric.source,
  };
  if (!hasC || !hasP) return rec;
  const d = Math.round((c - p) * 100) / 100;
  rec.delta = d;
  rec.dir = d > 0 ? 'up' : (d < 0 ? 'down' : 'flat');
  return rec;
}

function perfNonZero_(v) {
  const n = Number(v);
  return v !== '' && v !== null && v !== undefined && isFinite(n) && n !== 0;
}

function perfSortRows_(rows, sortKey, dir) {
  let key = String(sortKey || 'name').trim();
  const isMetric = PERF_METRICS.some(function (m) { return m.key === key; });
  if (!isMetric && PERF_SORT_EXTRA.indexOf(key) < 0) key = 'name';
  let desc = String(dir || '').toLowerCase() === 'desc';
  if (!dir && isMetric) desc = true;             // a leaderboard opens on its biggest number
  rows.sort(function (x, y) {
    let a, b;
    if (isMetric) {
      a = x.metrics[key] ? Number(x.metrics[key].value) : NaN;
      b = y.metrics[key] ? Number(y.metrics[key].value) : NaN;
      if (!isFinite(a) && !isFinite(b)) return perfCmpText_(x.name, y.name);
      if (!isFinite(a)) return 1;                // "no number" always sinks, in both directions
      if (!isFinite(b)) return -1;
      if (a !== b) return desc ? b - a : a - b;
      return perfCmpText_(x.name, y.name);
    }
    a = String(x[key] || ''); b = String(y[key] || '');
    const c = perfCmpText_(a, b);
    return desc ? -c : c;
  });
}

function perfCmpText_(a, b) {
  const x = String(a || '').toLowerCase(), y = String(b || '').toLowerCase();
  return x < y ? -1 : (x > y ? 1 : 0);
}

// ---------- RL-4 on the way out ----------
/** The numbers below carry no profit or PII by construction, but every outgoing record still
 * passes the stripper — including the nested metric map, which a top-level scrub would not see. */
function perfStripRecord_(rec, ctx) {
  const out = stripForRole_(rec, ctx.user.role, ctx.ident.email);
  if (out && out.periods) {
    Object.keys(out.periods).forEach(function (k) {
      out.periods[k].metrics = stripForRole_(out.periods[k].metrics, ctx.user.role, ctx.ident.email);
    });
  }
  return out;
}

function perfStripRows_(rows, ctx) {
  const out = stripForRole_(rows, ctx.user.role, ctx.ident.email);
  out.forEach(function (r) { r.metrics = stripForRole_(r.metrics, ctx.user.role, ctx.ident.email); });
  return out;
}

// ================= the compute + cache layer (§13.4) =================

/** Time-trigger target (no ctx) — every 15 minutes. Everything is computed OUTSIDE the script
 * lock; the lock is taken once, at the end, around the DASH_CACHE read-modify-write, and the rows
 * go in as contiguous blocks. A sweep that holds the portal-wide lock across its whole run turns
 * an audit convenience into a freeze on every staff member's save. */
function performanceRefresh() {
  const started = Date.now();
  const snap = perfCompute_();
  const rows = [];
  Object.keys(snap.byPerson).forEach(function (email) {
    Object.keys(snap.byPerson[email]).forEach(function (period) {
      rows.push({ account: email, period: period, value: perfJson_(snap.byPerson[email][period]) });
    });
  });
  const written = perfCacheWrite_(rows);

  if (snap.log_gap) {
    logActivity_('system', 'PERF_LOG_WINDOW_SHORT', 'ACTIVITY_LOG', snap.log_from, snap.earliest,
      'the log tail no longer reaches the start of the widest performance period — raise PERF_LOG_TAIL');
  }
  logActivity_('system', 'PERF_REFRESH', 'DASH_CACHE', '', String(written),
    snap.people + ' people × ' + snap.periods + ' periods in ' + Math.round((Date.now() - started) / 100) / 10 + 's');
  return 'performance: ' + written + ' cache row(s) for ' + snap.people + ' people';
}

/** ONE pass per source. Every source row is bucketed straight into the periods it belongs to, so
 * nothing is re-scanned per person and no sheet is opened inside a loop. */
function perfCompute_() {
  const periods = perfPeriodList_();
  const users = perfUsers_();
  const acc = {};
  const byPerson = {};

  users.forEach(function (u) {
    const em = normalizeEmail(u.email);
    acc[em] = {};
    periods.forEach(function (p) { acc[em][p.key] = perfBlank_(); });
  });

  // --- TASKS: tasks completed vs deadline, avg time-taken, listings, revisions ---
  // Bucketed on the employee's OWN submission day, not the approver's decision day: §8.0b stops
  // the employee's clock at submission, and a slow approver must not move someone's work into a
  // different week. The approval still gates it — only `Completed` is counted at all.
  const listedAt = {};
  readTab_('TASKS').forEach(function (t) {
    const who = normalizeEmail(t.assigned_to);
    if (!who || !acc[who]) return;
    const status = String(t.status || '');
    const type = String(t.type || '');

    if (status === TASK_STATUS_SUBMITTED) {
      perfEachPeriod_(periods, perfYmd_(t.submitted_at), function (key) { acc[who][key].awaiting++; });
      return;
    }
    if (status !== TASK_STATUS_COMPLETED) return;

    // Returning a task blanks submitted_at (Tasks.gs), so on a Completed row this stamp is the
    // FINAL submission — the moment the employee actually finished. decided_at only covers rows
    // that reached Completed by some path that left no submission stamp.
    const doneAt = String(t.submitted_at || '').trim() !== '' ? t.submitted_at : t.decided_at;
    const ymd = perfYmd_(doneAt);
    if (type === 'listing_new') {
      const item = String(t.item_id || '').trim();
      const ms = perfMs_(doneAt);
      if (item && !isNaN(ms) && (listedAt[item] === undefined || ms < listedAt[item])) listedAt[item] = ms;
    }
    const onTime = perfOnTime_(doneAt, t.deadline_pkt);
    const mins = Number(t.time_taken_min);

    perfEachPeriod_(periods, ymd, function (key) {
      const a = acc[who][key];
      a.tasks_completed++;
      if (onTime === true) a.tasks_on_time++;
      else if (onTime === false) a.tasks_late++;
      if (isFinite(mins) && mins >= 0) { a.time_sum += mins; a.time_n++; }
      if (type === 'listing_new') a.listings++;
      if (type === 'listing_revision') a.revisions_done++;
    });
  });

  // --- REPORTS_2H: compliance %, and the CS "replies sent" the checkpoints already collect ---
  perfReports_(periods, users, acc);

  // --- HUNTING_DB: hunts + approval rate ---
  readTab_('HUNTING_DB').forEach(function (h) {
    const who = normalizeEmail(h.hunter_email);
    if (!who || !acc[who]) return;
    const decision = perfHuntStatus_(h['Approval Status']);
    perfEachPeriod_(periods, perfYmd_(h.ts), function (key) {
      const a = acc[who][key];
      a.hunts++;
      if (!decision) { a.hunts_pending++; return; }
      a.hunts_decided++;
      if (decision === 'APPROVED') a.hunts_approved++;
    });
  });

  // --- CAMPAIGN_LOG: campaigns set + new-listing to campaign lag ---
  // Only the FIRST campaign an item ever receives measures the lag; a later change of campaign
  // type is a decision about a live listing, not a delay in launching one.
  const campaigns = readTab_('CAMPAIGN_LOG');
  const firstCampaign = {};
  campaigns.forEach(function (c) {
    const item = String(c.item_id || '').trim();
    const ms = perfMs_(c.ts);
    if (!item || isNaN(ms)) return;
    if (firstCampaign[item] === undefined || ms < firstCampaign[item]) firstCampaign[item] = ms;
  });
  campaigns.forEach(function (c) {
    const who = normalizeEmail(c.changed_by);
    if (!who || !acc[who]) return;
    const item = String(c.item_id || '').trim();
    const ms = perfMs_(c.ts);
    const lag = (item && !isNaN(ms) && firstCampaign[item] === ms && listedAt[item] !== undefined)
      ? ms - listedAt[item] : null;
    perfEachPeriod_(periods, perfYmd_(c.ts), function (key) {
      const a = acc[who][key];
      a.campaigns_set++;
      if (lag !== null && lag >= 0) { a.lag_sum += lag; a.lag_n++; }
    });
  });

  // --- ACTIVITY_LOG tail: orders processed / rechecked / wrong orders / cases closed ---
  const log = perfLogTail_();
  const people = perfPeopleIndex_(users);
  log.rows.forEach(function (r) {
    const action = String(r.action || '');
    const ymd = perfYmd_(r.ts);
    if (!ymd) return;
    const actor = normalizeEmail(r.actor);

    if (action === 'RECORD_PURCHASE') {
      if (!acc[actor]) return;
      const target = String(r.target || '');
      perfEachPeriod_(periods, ymd, function (key) { acc[actor][key].orders[target] = 1; });
      return;
    }
    if (action === 'SUBMIT_RECHECK') {
      // §11.1: one completed check = one recheck row. The row may be filed for someone else by a
      // Team Lead, and then new_value names the checker who actually did the work.
      const credited = perfResolvePerson_(people, r.new_value) || (acc[actor] ? actor : '');
      if (!credited || !acc[credited]) return;
      perfEachPeriod_(periods, ymd, function (key) { acc[credited][key].orders_rechecked++; });
      return;
    }
    if (typeof WRONG_ORDER_LOG_ACTION !== 'undefined' && action === WRONG_ORDER_LOG_ACTION) {
      const caused = perfResolvePerson_(people, r.old_value);      // §11.3 Processed By = accountability
      perfEachPeriod_(periods, ymd, function (key) {
        if (acc[actor]) acc[actor][key].wrong_found++;
        if (caused && acc[caused]) acc[caused][key].wrong_caused++;
      });
      return;
    }
    if (action === 'CS_CASE_UPDATE') {
      if (!acc[actor]) return;
      if (!perfMentionsFinalResult_(r.detail)) return;
      perfEachPeriod_(periods, ymd, function (key) { acc[actor][key].cases_closed++; });
    }
  });

  users.forEach(function (u) {
    const em = normalizeEmail(u.email);
    byPerson[em] = {};
    periods.forEach(function (p) { byPerson[em][p.key] = perfSnapshot_(acc[em][p.key]); });
  });

  const earliest = perfEarliest_(periods);
  return {
    byPerson: byPerson, people: users.length, periods: periods.length,
    log_from: log.from, earliest: earliest,
    log_gap: !!(log.from && earliest && log.from > earliest),
  };
}

/** §12.1 compliance and §5 role counts in one pass over REPORTS_2H. A checkpoint with no row is
 * MISSED once its deadline has passed, whether or not the missed-checkpoint sweep has ever run —
 * otherwise an un-registered trigger silently reads as 100% compliance. */
function perfReports_(periods, users, acc) {
  if (typeof repCheckpointsFor_ !== 'function' || typeof repTiming_ !== 'function') return;

  const filed = {};
  readTab_('REPORTS_2H').forEach(function (r) {
    const em = normalizeEmail(r.email);
    if (!acc[em]) return;
    const date = perfYmd_(r.date);
    const cp = typeof repCpKey_ === 'function' ? repCpKey_(r.checkpoint) : String(r.checkpoint || '');
    if (!date || !cp) return;
    filed[em + '|' + date + '|' + cp] = r;

    // §5 gives CS count_1 = buyer replies. Reports.gs owns that mapping; reading it here keeps the
    // two layers from disagreeing about which column holds which count.
    const labels = (typeof repCountFields_ === 'function') ? repCountFields_(String(r.role || '')) : [];
    const idx = labels.indexOf('buyer replies');
    if (idx < 0) return;
    const v = Number(r['count_' + (idx + 1)]);
    if (!isFinite(v) || v < 0) return;
    perfEachPeriod_(periods, date, function (key) { acc[em][key].replies_sent += v; });
  });

  users.forEach(function (u) {
    const em = normalizeEmail(u.email);
    const cps = repCheckpointsFor_(u.email, u.shift);
    if (!cps.length) return;
    const sched = (typeof repScheduleFor_ === 'function') ? repScheduleFor_(u.email) : null;
    periods.forEach(function (p) {
      perfDatesIn_(p).forEach(function (date) {
        if (sched && typeof repIsWorkingDay_ === 'function' && !repIsWorkingDay_(sched.working_days, date)) return;
        const t = repTiming_(cps, date);
        cps.forEach(function (cp, i) {
          if (t.nowAbs < t.deadlines[i]) return;                 // not due yet — never counted against anyone
          const a = acc[em][p.key];
          a.reports_expected++;
          const row = filed[em + '|' + date + '|' + cp];
          const flag = row ? String(row.flag || '') : 'missed';
          if (flag === 'ontime') a.reports_ontime++;
          else if (flag === 'late') a.reports_late++;
          else a.reports_missed++;
        });
      });
    });
  });
}

function perfBlank_() {
  return {
    tasks_completed: 0, tasks_on_time: 0, tasks_late: 0, time_sum: 0, time_n: 0, awaiting: 0,
    reports_expected: 0, reports_ontime: 0, reports_late: 0, reports_missed: 0,
    hunts: 0, hunts_approved: 0, hunts_decided: 0, hunts_pending: 0,
    listings: 0, revisions_done: 0,
    campaigns_set: 0, lag_sum: 0, lag_n: 0,
    orders: {}, orders_rechecked: 0, wrong_found: 0, wrong_caused: 0,
    replies_sent: 0, cases_closed: 0,
  };
}

/** Rates and averages are computed here, once, at the end — never accumulated as running
 * percentages, which is how an average of averages ends up in a management grid. */
function perfSnapshot_(a) {
  return {
    tasks_completed: a.tasks_completed,
    tasks_on_time: a.tasks_on_time,
    tasks_late: a.tasks_late,
    on_time_pct: perfPct_(a.tasks_on_time, a.tasks_completed),
    avg_time_taken_min: a.time_n ? Math.round(a.time_sum / a.time_n) : '',
    report_compliance_pct: perfPct_(a.reports_ontime, a.reports_expected),
    hunts: a.hunts,
    hunt_approval_rate_pct: perfPct_(a.hunts_approved, a.hunts_decided),
    listings: a.listings,
    revisions_done: a.revisions_done,
    campaigns_set: a.campaigns_set,
    campaign_lag_hours: a.lag_n ? Math.round((a.lag_sum / a.lag_n) / 3600000 * 100) / 100 : '',
    orders_processed: Object.keys(a.orders).length,
    orders_rechecked: a.orders_rechecked,
    wrong_orders_found_by: a.wrong_found,
    wrong_orders_caused: a.wrong_caused,
    replies_sent: a.replies_sent,
    cases_closed: a.cases_closed,
    notes: {
      tasks_awaiting_approval: a.awaiting,
      reports_expected: a.reports_expected,
      reports_ontime: a.reports_ontime,
      reports_late: a.reports_late,
      reports_missed: a.reports_missed,
      reports_filed_pct: perfPct_(a.reports_ontime + a.reports_late, a.reports_expected),
      hunts_decided: a.hunts_decided,
      hunts_pending: a.hunts_pending,
      campaign_lag_measured: a.lag_n,
    },
  };
}

function perfPct_(part, whole) {
  if (!whole) return '';
  return Math.round((part / whole) * 1000) / 10;
}

// ---------- the cache tab ----------
function perfCacheWrite_(rows) {
  const sh = getPortalDb_(false).getSheetByName('DASH_CACHE');
  if (!sh) return 0;
  const width = DB_TABS.DASH_CACHE.length;
  const stamp = now_();
  let written = 0;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const vals = sh.getDataRange().getValues();
    const at = {};
    for (let i = 1; i < vals.length; i++) {
      at[String(vals[i][0]) + '|' + String(vals[i][1]) + '|' + String(vals[i][2])] = i + 1;
    }
    const updates = [], appends = [];
    rows.forEach(function (r) {
      const row = [PERF_CACHE_METRIC, r.account, r.period, r.value, stamp];
      const key = PERF_CACHE_METRIC + '|' + r.account + '|' + r.period;
      if (at[key]) updates.push({ row: at[key], values: row });
      else appends.push(row);
    });

    // Contiguous runs go in as one setValues each. Thirteen people × four periods is 52 rows, and
    // 52 single-cell writes inside a held lock is a freeze every staff member feels.
    updates.sort(function (x, y) { return x.row - y.row; });
    let i = 0;
    while (i < updates.length) {
      let j = i;
      while (j + 1 < updates.length && updates[j + 1].row === updates[j].row + 1) j++;
      const block = [];
      for (let k = i; k <= j; k++) block.push(updates[k].values);
      sh.getRange(updates[i].row, 1, block.length, width).setValues(block);
      written += block.length;
      i = j + 1;
    }
    if (appends.length) {
      sh.getRange(Math.max(sh.getLastRow(), 1) + 1, 1, appends.length, width).setValues(appends);
      written += appends.length;
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return written;
}

function perfCacheRead_() {
  const out = { rows: {}, computed_at: '' };
  readTab_('DASH_CACHE').forEach(function (r) {
    if (String(r.metric || '') !== PERF_CACHE_METRIC) return;
    const email = normalizeEmail(r.account);
    const period = String(r.period || '');
    if (!email || !period) return;
    let parsed = null;
    try { parsed = JSON.parse(String(r.value || '')); } catch (e) { parsed = null; }
    if (!parsed) return;
    out.rows[email + '|' + period] = parsed;
    const stamp = String(r.computed_at || '');
    if (stamp > out.computed_at) out.computed_at = stamp;
  });
  return out;
}

function perfCacheGet_(cache, email, period) {
  return (cache && cache.rows[email + '|' + period]) || null;
}

/** §13.4: viewers read the cache. A recompute happens only when the cache is missing or older
 * than PERF_MAX_AGE_MIN, or when Management presses Refresh now — and one flag stops thirteen
 * people arriving at 9 AM from each starting the same computation. */
function perfEnsureFresh_(force) {
  let cache = perfCacheRead_();
  const age = perfAgeMin_(cache.computed_at);
  if (!force && age !== null && age <= PERF_MAX_AGE_MIN) {
    return { cache: cache, computed: false, stale: false, computed_at: cache.computed_at };
  }
  const sc = CacheService.getScriptCache();
  if (!force && sc.get(PERF_BUSY_KEY) === '1') {
    return { cache: cache, computed: false, stale: true, computed_at: cache.computed_at };
  }
  sc.put(PERF_BUSY_KEY, '1', PERF_BUSY_SEC);
  try {
    performanceRefresh();
  } catch (e) {
    logActivity_('system', 'ERROR:performanceRefresh', 'DASH_CACHE', '', '', String((e && e.stack) || e));
    return { cache: cache, computed: false, stale: true, computed_at: cache.computed_at };
  }
  cache = perfCacheRead_();
  return { cache: cache, computed: true, stale: false, computed_at: cache.computed_at };
}

function perfAgeMin_(stamp) {
  const ms = perfMs_(stamp);
  if (isNaN(ms)) return null;
  return Math.round((Date.now() - ms) / 60000);
}

// ================= §12.2 — Zaid's manual rubric =================

/** The 18-column monthly evaluation. Written to STAFF_EVAL and mirrored to the live workbook's
 * month tab through SheetBridge — the only door to a business sheet. One evaluation per person
 * per month; a second one must say `replace:true`, which updates the portal row in place (§16.2,
 * no hard deletes) and reports the mirrored row as needing a manual correction, because the month
 * tab carries no key column the bridge could safely re-find a single row by. */
function actionSaveEvaluation_(payload, ctx) {
  perfAssertEvaluator_(ctx);

  const ymd = perfEvalDate_(payload.date);
  const month = ymd.slice(0, 7);
  const staff = perfEvalStaff_(payload.staff);
  const values = perfEvalValues_(payload, ymd, staff.name);

  const replace = payload.replace === true || String(payload.replace || '') === 'true';
  const rec = { filled_by: ctx.ident.email };
  PERF_EVAL_FIELDS.forEach(function (f) { rec[f.key] = values[f.key]; });

  // The "already evaluated this month" look-up and the write are one read-modify-write: checking
  // outside the lock is how two evaluators filling the same person at the same time get two rows.
  let existing = null;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    readTab_('STAFF_EVAL').forEach(function (r) {
      if (existing) return;
      if (perfNorm_(r.staff_name) !== perfNorm_(staff.name)) return;
      if (perfYmd_(r.date).slice(0, 7) !== month) return;
      existing = r;
    });
    if (existing && !replace) {
      throw new Error(SAFE_ERROR_PREFIX + staff.name + ' already has an evaluation for ' + month
        + ' — send replace:true to update it');
    }
    rec.eval_id = existing ? String(existing.eval_id) : 'E' + Utilities.getUuid().slice(0, 8);
    perfEvalWrite_(rec, existing ? rec.eval_id : '');
  } finally { lock.releaseLock(); }
  const evalId = rec.eval_id;

  logActivity_(ctx.ident.email, existing ? 'UPDATE_EVALUATION' : 'SAVE_EVALUATION', 'STAFF_EVAL:' + evalId,
    existing ? perfEvalDigest_(existing) : '', perfEvalDigest_(rec), staff.name + ' · ' + month);

  // The mirror runs OUTSIDE the lock above: SheetBridge takes the script lock around its own
  // read-modify-write, and a second lock from the same execution deadlocks itself.
  const mirror = existing ? { ok: false, reason: 'update the mirrored row by hand — the month tab has no key column' }
    : perfEvalMirror_(rec, ctx.ident.email);

  /* Deliberately no notification to the person evaluated: [OPEN-6] says staff do not see their own
   * evaluation until Hasib says otherwise, and a "your evaluation was saved" bell would announce
   * the thing the setting is there to withhold. */
  return {
    ok: true, eval_id: evalId, staff_name: staff.name, month: month, date: ymd,
    replaced: !!existing, values: rec, mirror: mirror,
    columns: perfEvalColumns_(),
  };
}

/** Read: Management + Team Lead (§4.3 / §4.4 — not Ops Head). Portal rows plus the live
 * workbook's history, which is where the only real data is: APRIL and MAY hold every filled row
 * in the file and neither matches the 18-column schema, so they are read by header and reported
 * with the shape they actually have. */
function actionEvaluations_(payload, ctx) {
  const own = perfEvalOwnAccess_(ctx);
  if (!own.mayAll && !own.maySelf) throw new Error('role may not see staff evaluations');

  const month = String(payload.month || '').trim();
  if (month && !/^\d{4}-\d{2}$/.test(month)) throw new Error(SAFE_ERROR_PREFIX + 'month must be yyyy-MM');
  const source = String(payload.source || 'all').trim();
  if (['all', 'portal', 'sheet'].indexOf(source) < 0) throw new Error(SAFE_ERROR_PREFIX + 'source must be all, portal or sheet');
  const wantStaff = own.mayAll ? String(payload.staff || '').trim() : String(ctx.user.name || '');

  const rows = [];
  if (source !== 'sheet') {
    readTab_('STAFF_EVAL').forEach(function (r) {
      const ymd = perfYmd_(r.date);
      if (month && ymd.slice(0, 7) !== month) return;
      if (wantStaff && perfNorm_(r.staff_name) !== perfNorm_(wantStaff)) return;
      const rec = { source: 'portal', tab: 'STAFF_EVAL', eval_id: String(r.eval_id || ''), shape: 18 };
      PERF_EVAL_FIELDS.forEach(function (f) { rec[f.key] = r[f.key] === undefined ? '' : r[f.key]; });
      rec.date = ymd || String(r.date || '');
      rec.filled_by = String(r.filled_by || '');
      rows.push(rec);
    });
  }

  let sheetInfo = { ok: false, reason: 'not read' };
  if (source !== 'portal') {
    sheetInfo = perfEvalReadSheet_(month, wantStaff, rows);
  }

  rows.sort(function (a, b) {
    const c = perfCmpText_(b.date, a.date);
    return c !== 0 ? c : perfCmpText_(a.staff_name, b.staff_name);
  });

  return {
    rows: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    count: rows.length,
    month: month || 'all',
    staff: wantStaff || 'all',
    scope: own.mayAll ? 'all staff' : 'your own evaluations only',
    columns: perfEvalColumns_(),
    sheet: sheetInfo,
    schema_note: 'The 18-column order exists on JULY and SAMPLE ONLY, both of which are empty. The '
      + 'tabs that hold data are APRIL (17 columns, no Absence) and MAY (17 columns, WEEK instead '
      + 'of Date and "Breaks extra" instead of Breaks). The portal writes the 18-column version '
      + 'and reads the older shapes by header without changing them.',
  };
}

// ---------- evaluation helpers ----------
function perfAssertEvaluator_(ctx) {
  if (isSuperAdmin(ctx.ident.email)) return;
  if (PERF_EVAL_ROLES.indexOf(String(ctx.user.role)) < 0) throw new Error('role may not fill staff evaluations');
}

function perfEvalOwnAccess_(ctx) {
  const mayAll = isSuperAdmin(ctx.ident.email) || PERF_EVAL_ROLES.indexOf(String(ctx.user.role)) >= 0;
  const maySelf = !mayAll && String(getConfig(PERF_SEE_OWN_EVAL_KEY) || 'false') === 'true';
  return { mayAll: mayAll, maySelf: maySelf };
}

function perfMaySeeAll_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || PERF_TEAM_ROLES.indexOf(String(ctx.user.role)) >= 0;
}

function perfEvalDate_(value) {
  if (value === undefined || value === null || String(value).trim() === '') return perfToday_();
  const ymd = perfYmd_(value);
  if (!ymd) throw new Error(SAFE_ERROR_PREFIX + 'date must be yyyy-MM-dd');
  return ymd;
}

/** The evaluated person must be a real USERS row so the rubric joins to the roster. A deactivated
 * person still qualifies: §4.1b keeps their history, and the month they worked is still assessable. */
function perfEvalStaff_(value) {
  const want = String(value || '').trim();
  if (!want) throw new Error(SAFE_ERROR_PREFIX + 'staff is required');
  const wantEmail = normalizeEmail(want), wantName = perfNorm_(want);
  const hits = [];
  readTab_('USERS').forEach(function (u) {
    if (normalizeEmail(u.email) === wantEmail || perfNorm_(u.name) === wantName) {
      hits.push({ email: String(u.email), name: String(u.name || u.email).trim() });
    }
  });
  if (!hits.length) throw new Error(SAFE_ERROR_PREFIX + 'no staff member matches "' + want + '"');
  if (hits.length > 1) throw new Error(SAFE_ERROR_PREFIX + 'that name matches more than one staff member — use the email');
  return hits[0];
}

/** Enum values are matched loosely and STORED verbatim from the list, so the sheet keeps exactly
 * the strings its own dropdown holds — trailing spaces and canonical misspellings included. */
function perfEvalValues_(payload, ymd, staffName) {
  const out = {};
  PERF_EVAL_FIELDS.forEach(function (f) {
    if (f.key === 'date') { out.date = ymd; return; }
    if (f.key === 'staff_name') { out.staff_name = staffName; return; }
    const raw = payload[f.key];
    const s = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!s) { out[f.key] = ''; return; }                 // a blank rubric cell is normal on every live tab
    if (!f.strict) { out[f.key] = s.slice(0, PERF_EVAL_MAX_TEXT); return; }
    const want = perfNorm_(s);
    let hit = '';
    f.vocab.forEach(function (v) { if (!hit && perfNorm_(v) === want) hit = v; });
    if (!hit) throw new Error(SAFE_ERROR_PREFIX + f.label + ' must be one of: ' + f.vocab.join(' / '));
    out[f.key] = hit;
  });
  return out;
}

function perfEvalColumns_() {
  return PERF_EVAL_FIELDS.map(function (f) {
    return {
      key: f.key, label: f.label, sheet_header: f.sheet,
      options: f.vocab || [], strict: !!f.strict,
      note: f.strict ? '' : (f.vocab ? 'typed free-hand on the live tabs — the list is a suggestion' : 'free text'),
    };
  });
}

function perfEvalWrite_(rec, updateId) {
  const sh = getPortalDb_(false).getSheetByName('STAFF_EVAL');
  const cols = DB_TABS.STAFF_EVAL;
  const values = cols.map(function (c) { return rec[c] === undefined ? '' : rec[c]; });
  let row = 0;
  if (updateId) {
    const vals = sh.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === updateId) { row = i + 1; break; }
    }
  }
  if (row) sh.getRange(row, 1, 1, cols.length).setValues([values]);
  else { sh.appendRow(values); row = sh.getLastRow(); }
  // The date is forced to text: a rubric date that Sheets coerces into a serial stops matching the
  // month key this module looks an existing evaluation up by.
  sh.getRange(row, cols.indexOf('date') + 1).setNumberFormat('@').setValue(String(rec.date));
  SpreadsheetApp.flush();
  return row;
}

function perfEvalDigest_(rec) {
  const parts = [];
  PERF_EVAL_FIELDS.forEach(function (f) {
    const v = String(rec[f.key] === undefined ? '' : rec[f.key]).trim();
    if (v) parts.push(f.label + '=' + v);
  });
  return parts.join(' · ').slice(0, 500);
}

/** Appends the 18-column row to the month tab of the live workbook. A tab that does not exist is
 * reported as "not connected yet" — the bridge never creates a tab, and the portal row already
 * holds the evaluation, so a missing month costs the record nothing. */
function perfEvalMirror_(rec, actor) {
  const id = bridgeResolveSheetId_('global', '', PERF_EVAL_KIND);
  if (!id) return { ok: false, reason: 'not connected yet' };

  const tabs = perfEvalTabCandidates_(rec.date);
  const open = bridgeOpenTab_(id, tabs, PERF_EVAL_SHEET_HEADERS);
  if (!open) {
    return { ok: false, reason: 'not connected yet', wanted_tab: tabs[0],
      detail: 'the Staff Performance workbook has no "' + tabs[0] + '" tab — add it from SAMPLE ONLY' };
  }
  const tabName = open.sheet.getName();
  if (perfNorm_(tabName) === perfNorm_(PERF_EVAL_TEMPLATE_TAB)) {
    return { ok: false, reason: 'the blank template tab is never written to', tab: tabName };
  }

  const values = {};
  PERF_EVAL_FIELDS.forEach(function (f) { values[f.sheet] = rec[f.key]; });

  let res = null;
  try {
    res = bridgeAppendRow_({ scope: 'global', account: '', kind: PERF_EVAL_KIND, tab: [tabName], expect: PERF_EVAL_SHEET_HEADERS },
      values, PERF_EVAL_SHEET_HEADERS, actor);
  } catch (e) {
    logActivity_(actor, 'EVAL_MIRROR_FAILED', tabName, '', '', String((e && e.message) || e));
    return { ok: false, reason: 'the sheet refused this write', tab: tabName };
  }
  if (res && res.ok && (res.skippedMissing || []).length) {
    // A 17-column month tab (APRIL/MAY shape) simply has nowhere to put Absence. Reported, never added.
    res.shape_note = 'this tab does not carry: ' + res.skippedMissing.join(' | ');
  }
  return res;
}

function perfEvalTabCandidates_(ymd) {
  const parts = String(ymd || '').split('-');
  const m = Number(parts[1]);
  const name = PERF_MONTH_TABS[m - 1] || '';
  if (!name) return [PERF_MONTH_TABS[0]];
  return [name, name + ' ' + parts[0]];
}

/** History from the live workbook. Every month-named tab is read once, by header, so APRIL's
 * 17 columns and MAY's renamed A and E land in the same records as JULY's 18 would. */
function perfEvalReadSheet_(month, wantStaff, rows) {
  const id = bridgeResolveSheetId_('global', '', PERF_EVAL_KIND);
  if (!id) return { ok: false, reason: 'not connected yet' };
  const probe = bridgeOpenTab_(id, month ? perfEvalTabCandidates_(month + '-01') : PERF_MONTH_TABS, PERF_EVAL_SHEET_HEADERS);
  if (!probe) return { ok: false, reason: 'not connected yet' };

  let names = [];
  if (month) {
    names = [probe.sheet.getName()];
  } else {
    probe.ss.getSheets().forEach(function (s) {
      if (s.isSheetHidden()) return;
      const n = perfNorm_(s.getName());
      if (perfMonthIndex_(n) < 0) return;
      names.push(s.getName());
    });
    names = names.slice(0, PERF_EVAL_MAX_TABS);
  }

  const tabsRead = [], shapes = {};
  names.forEach(function (name) {
    const read = bridgeReadRows_({ scope: 'global', account: '', kind: PERF_EVAL_KIND, tab: [name],
      expect: PERF_EVAL_SHEET_HEADERS, limit: PERF_EVAL_READ_LIMIT });
    if (!read || !read.ok) return;
    tabsRead.push(name);
    shapes[name] = read.headers.filter(function (h) { return String(h || '').trim() !== ''; }).length;
    const index = perfEvalHeaderIndex_(read.headers);
    read.rows.forEach(function (r) {
      const rec = { source: 'sheet', tab: name, eval_id: '', shape: shapes[name], _row: r._row };
      let filled = 0;
      PERF_EVAL_FIELDS.forEach(function (f) {
        const header = index[f.key];
        const v = header === undefined ? '' : r[header];
        rec[f.key] = v === undefined || v === null ? '' : v;
        if (String(rec[f.key]).trim() !== '') filled++;
      });
      if (!filled || String(rec.staff_name).trim() === '') return;      // APRIL separates its date blocks with blank rows
      if (wantStaff && perfNorm_(rec.staff_name) !== perfNorm_(wantStaff)) return;
      const ymd = perfYmd_(rec.date);
      if (month && ymd && ymd.slice(0, 7) !== month) return;
      rec.date = ymd || String(rec.date);          // MAY writes ordinal week labels ('1st'), kept verbatim
      rec.filled_by = '';
      rows.push(rec);
    });
  });

  return { ok: true, tabs_read: tabsRead, shapes: shapes,
    note: 'read by header — a tab missing a column simply returns it empty; nothing is added to the workbook' };
}

function perfEvalHeaderIndex_(headers) {
  const byNorm = {};
  headers.forEach(function (h) {
    const n = bridgeNormalizeHeader_(h);
    if (!n || byNorm[n] !== undefined) return;
    byNorm[n] = String(h);
  });
  const out = {};
  PERF_EVAL_FIELDS.forEach(function (f) {
    const tries = [f.sheet].concat(f.alt || []);
    for (let i = 0; i < tries.length; i++) {
      const n = bridgeNormalizeHeader_(tries[i]);
      if (n && byNorm[n] !== undefined) { out[f.key] = byNorm[n]; return; }
    }
  });
  return out;
}

function perfMonthIndex_(normalizedName) {
  for (let i = 0; i < PERF_MONTH_TABS.length; i++) {
    const m = perfNorm_(PERF_MONTH_TABS[i]);
    if (normalizedName === m || normalizedName.indexOf(m) === 0) return i;
  }
  return -1;
}

// ================= shared helpers =================

function perfUsers_() {
  return readTab_('USERS').filter(function (u) {
    return String(u.status) === 'approved' && String(u.email || '').trim() !== '';
  }).map(function (u) {
    return { email: String(u.email), name: String(u.name || u.email), role: String(u.role || ''), shift: String(u.shift || '') };
  });
}

/** Names as the sheets write them — 'Processed By' and the recheck checker are typed names, not
 * emails. A name that matches two people resolves to nobody: attributing a wrong order to the
 * wrong person is worse than leaving it unattributed (§11.3 is accountability data). */
function perfPeopleIndex_(users) {
  const byEmail = {}, byName = {}, byToken = {}, dupName = {}, dupToken = {};
  users.forEach(function (u) {
    const em = normalizeEmail(u.email);
    byEmail[em] = em;
    const n = perfNorm_(u.name);
    if (n) {
      if (byName[n] !== undefined && byName[n] !== em) dupName[n] = true;
      byName[n] = em;
      n.split(' ').forEach(function (tok) {
        if (tok.length < 3) return;
        if (byToken[tok] !== undefined && byToken[tok] !== em) dupToken[tok] = true;
        byToken[tok] = em;
      });
    }
  });
  return { byEmail: byEmail, byName: byName, byToken: byToken, dupName: dupName, dupToken: dupToken };
}

function perfResolvePerson_(people, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.indexOf('@') >= 0) return people.byEmail[normalizeEmail(raw)] || '';
  const n = perfNorm_(raw);
  if (!n) return '';
  if (people.byName[n] && !people.dupName[n]) return people.byName[n];
  const toks = n.split(' ');
  let hit = '';
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.length < 3 || people.dupToken[t] || !people.byToken[t]) continue;
    if (hit && hit !== people.byToken[t]) return '';
    hit = people.byToken[t];
  }
  return hit;
}

/** §8.1 canonical: APPROVED / NOT APPROVED, and undecided is a BLANK cell on the live sheet.
 * Hunting.gs keeps the map of the spellings the workbook actually contains ('APRROVED',
 * 'ALREADY TESTED'…); this reads through it when that module is present and falls back to the two
 * canonical strings when it is not, so an approval rate is never invented from an unread status. */
function perfHuntStatus_(value) {
  const s = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!s) return '';
  if (typeof HUNT_STATUS_READ_MAP !== 'undefined' && HUNT_STATUS_READ_MAP[s]) return String(HUNT_STATUS_READ_MAP[s]);
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'NOT APPROVED') return 'NOT APPROVED';
  return '';
}

/** CS_CASE_UPDATE writes the canonical column names it changed into the log's detail column, so
 * the update that records FINAL RESULT is the moment a case is closed (§8.6). */
function perfMentionsFinalResult_(detail) {
  const want = (typeof CS_F_RESULT !== 'undefined') ? CS_F_RESULT : 'FINAL RESULT';
  return perfNorm_(detail).indexOf(perfNorm_(want)) >= 0;
}

/** The log tail, read as ONE range. Reading the whole tab costs the request its budget once the
 * portal has been live a few months, and only the recent past can affect these periods. */
function perfLogTail_() {
  const sh = getPortalDb_(false).getSheetByName('ACTIVITY_LOG');
  if (!sh) return { rows: [], from: '' };
  const last = sh.getLastRow();
  if (last < 2) return { rows: [], from: '' };
  const cols = DB_TABS.ACTIVITY_LOG;
  const first = Math.max(2, last - PERF_LOG_TAIL + 1);
  const vals = sh.getRange(first, 1, last - first + 1, cols.length).getValues();
  const rows = vals.map(function (r) {
    const o = {};
    cols.forEach(function (c, i) { o[c] = r[i]; });
    return o;
  });
  return { rows: rows, from: rows.length ? perfYmd_(rows[0].ts) : '' };
}

// ---------- periods ----------
/** Today and yesterday, this week and last week. The week starts on Monday because the team works
 * Monday to Saturday; the trend arrow compares a period with the one directly before it. */
function perfPeriodList_() {
  const today = perfToday_();
  const yesterday = perfAddDays_(today, -1);
  const weekStart = perfWeekStart_(today);
  const lastWeek = perfAddDays_(weekStart, -7);
  return [
    { key: 'day:' + today, kind: 'day', ago: 0, label: 'today', from: today, to: today },
    { key: 'day:' + yesterday, kind: 'day', ago: 1, label: 'yesterday', from: yesterday, to: yesterday },
    { key: 'week:' + weekStart, kind: 'week', ago: 0, label: 'this week', from: weekStart, to: perfAddDays_(weekStart, 6) },
    { key: 'week:' + lastWeek, kind: 'week', ago: 1, label: 'last week', from: lastWeek, to: perfAddDays_(lastWeek, 6) },
  ];
}

function perfFindPeriod_(periods, kind, ago) {
  for (let i = 0; i < periods.length; i++) {
    if (periods[i].kind === kind && periods[i].ago === ago) return periods[i];
  }
  return periods[0];
}

function perfEachPeriod_(periods, ymd, fn) {
  if (!ymd) return;
  periods.forEach(function (p) {
    if (ymd >= p.from && ymd <= p.to) fn(p.key);
  });
}

/** The dates a period covers, never past today — a checkpoint in the future is not a missed one. */
function perfDatesIn_(period) {
  const today = perfToday_();
  const out = [];
  let d = period.from;
  while (d <= period.to && d <= today) {
    out.push(d);
    d = perfAddDays_(d, 1);
  }
  return out;
}

function perfEarliest_(periods) {
  let out = '';
  periods.forEach(function (p) { if (!out || p.from < out) out = p.from; });
  return out;
}

// ---------- dates, text, json ----------
function perfToday_() { return Utilities.formatDate(new Date(), PERF_TZ, 'yyyy-MM-dd'); }

function perfAddDays_(ymd, n) {
  const p = String(ymd).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  d.setUTCDate(d.getUTCDate() + n);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function perfWeekStart_(ymd) {
  const p = String(ymd).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return perfAddDays_(ymd, -((d.getUTCDay() + 6) % 7));
}

/** A portal stamp already carries its PKT date in the first ten characters; anything else is
 * parsed and re-read in PKT, so a shift that ran past midnight is never filed under the wrong day. */
function perfYmd_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, PERF_TZ, 'yyyy-MM-dd');
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, PERF_TZ, 'yyyy-MM-dd');
}

/** Wall-clock text carrying no offset is PKT, never UTC — the same rule Tasks.gs applies. */
function perfMs_(value) {
  if (value instanceof Date) return value.getTime();
  let s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return NaN;
  s = s.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, '$1T$2');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ':00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) s += '+05:00';
  const d = new Date(s);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

/** true on time, false late, null when the task carries no usable deadline — an unmeasurable task
 * is left out of the ratio rather than counted as a failure. */
function perfOnTime_(doneAt, deadline) {
  const a = perfMs_(doneAt), b = perfMs_(deadline);
  if (isNaN(a) || isNaN(b)) return null;
  return a <= b;
}

function perfNorm_(v) {
  return String(v === null || v === undefined ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function perfJson_(o) {
  try { return JSON.stringify(o); } catch (e) { return '{}'; }
}

const ACTIONS_PERFORMANCE = {
  myPerformance:   [actionMyPerformance_, 'any'],
  teamPerformance: [actionTeamPerformance_, 'any'],   // Mgmt / Ops Head / Team Lead gated inside
  saveEvaluation:  [actionSaveEvaluation_, 'any'],    // Mgmt / Team Lead gated inside (§4.4: not Ops Head)
  evaluations:     [actionEvaluations_, 'any'],       // Mgmt / Team Lead gated inside; [OPEN-6] own-view off by default
};
