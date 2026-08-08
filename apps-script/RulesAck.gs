/** §26 — the living company law: RULES (Do / Don't / Criteria), INSTRUCTIONS and SOPS.
 * Every publish is delivered to its department the moment it lands (§26.2b) — stamped with
 * date, time and who issued it — and badges New until the one-tap "Understood" (§26.3).
 * Nothing is deleted: retiring is a tombstone and retired rules stay in history (RL-6). */

const RULE_DEPTS = ['Hunting', 'Listing', 'Advertising', 'CS', 'Order Processing', 'ALL'];  // §26.1
const RULE_TYPES = ['Do', "Don't", 'Criteria'];                                            // §26.1
const RULE_ACTIVE = 'active';
const RULE_RETIRED = 'retired';
const RULE_MAX_TEXT = 4000;

// §26.2 — Advertising's master list is additionally pinned as a card on Zain's home.
const RULE_PINNED_DEPT = 'Advertising';
const RULE_PINNED_ROLE = 'Advertising Manager';

// §26.5 — authorship is Management; this CONFIG key (absent, so off) extends it to Team Lead later.
const RULE_TEAM_LEAD_FLAG = 'rules_authors_include_team_lead';

// §26.4 sheet contract: the PPC Central feed is APPENDED to by header-addressed column only —
// never created, never renamed, never reshaped, and a missing sheet or tab is never an error.
const PPC_INSTRUCTIONS_TAB = 'Instructions Given By The Management';
const PPC_INSTRUCTION_COL = 'Instruction';
const PPC_DATE_COL = 'Date';
const PPC_NOT_CONNECTED = 'not connected yet';
const PPC_APPENDED = 'appended';

// ---------- rules ----------

function actionAddRule_(payload, ctx) {
  rulesRequireAuthor_(ctx);
  const department = rulesDept_(payload.department);
  const type = rulesType_(payload.type);
  const ruleText = rulesText_(payload.rule_text, RULE_MAX_TEXT);
  if (!ruleText) throw new Error('rule_text required');

  const ruleId = 'R' + Utilities.getUuid().slice(0, 8);
  const addedAt = now_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    rulesSheet_('RULES').appendRow([ruleId, department, type, ruleText, ctx.ident.email, addedAt,
      RULE_ACTIVE, JSON.stringify({ acks: {} })]);
  } finally { lock.releaseLock(); }

  const issuer = ctx.user.name || ctx.ident.name || ctx.ident.email;
  const message = department + ' · ' + type + ' — ' + ruleText + ' · ' + rulesStamp_(issuer, addedAt);
  const delivered = rulesDeliver_(department, 'Rule published', message, 'rule:' + ruleId, ctx.ident.email);
  logActivity_(ctx.ident.email, 'ADD_RULE', ruleId, '', department + '|' + type + '|' + RULE_ACTIVE,
    ruleText.slice(0, 200) + ' · delivered ' + delivered);

  return { rule_id: ruleId, department: department, type: type, rule_text: ruleText,
    added_by: ctx.ident.email, added_at: addedAt, status: RULE_ACTIVE, delivered: delivered };
}

/** §26.1 tombstone: status flips to retired and the rule stays in history. RULES has no
 * retired_by/retired_at column and none may be added, so who and when live in the ack_log JSON. */
function actionRetireRule_(payload, ctx) {
  rulesRequireAuthor_(ctx);
  const ruleId = String(payload.rule_id || '').trim();
  if (!ruleId) throw new Error('rule_id required');

  const retiredAt = now_();
  let department = '', type = '', ruleText = '', already = false, wasBy = '', wasAt = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = rulesSheet_('RULES');
    const vals = sh.getDataRange().getValues();
    const idx = rulesHeadIdx_(vals[0], 'RULES');
    const rowIdx = rulesFindRow_(vals, idx.rule_id, ruleId, 'rule not found');
    const rec = rulesRec_(vals[0], vals[rowIdx]);
    department = String(rec.department || 'ALL');
    type = String(rec.type || '');
    ruleText = String(rec.rule_text || '');
    const log = rulesParseAck_(rec.ack_log);
    if (String(rec.status) === RULE_RETIRED) {
      already = true;
      wasBy = String(log.retired_by || '');
      wasAt = String(log.retired_at || '');
    } else {
      log.retired_by = ctx.ident.email;
      log.retired_at = retiredAt;
      wasBy = ctx.ident.email;
      wasAt = retiredAt;
      sh.getRange(rowIdx + 1, idx.status + 1).setValue(RULE_RETIRED);
      sh.getRange(rowIdx + 1, idx.ack_log + 1).setValue(JSON.stringify(log));
    }
  } finally { lock.releaseLock(); }

  if (!already) {
    const issuer = ctx.user.name || ctx.ident.name || ctx.ident.email;
    const message = department + ' · ' + type + ' — ' + ruleText + ' · ' + rulesStamp_(issuer, retiredAt);
    rulesDeliver_(department, 'Rule retired', message, 'rule:' + ruleId, ctx.ident.email);
    logActivity_(ctx.ident.email, 'RETIRE_RULE', ruleId, RULE_ACTIVE, RULE_RETIRED, ruleText.slice(0, 200));
  }
  return { rule_id: ruleId, department: department, type: type, rule_text: ruleText,
    status: RULE_RETIRED, retired_by: wasBy, retired_at: wasAt, alreadyRetired: already };
}

/** §26.3 one-tap "Understood". Idempotent — a second tap returns the first acknowledgment. */
function actionAcknowledgeRule_(payload, ctx) {
  const ruleId = String(payload.rule_id || '').trim();
  if (!ruleId) throw new Error('rule_id required');
  const res = rulesAckWrite_('RULES', 'rule_id', ruleId, 'rule not found', ctx);
  if (res.first) logActivity_(ctx.ident.email, 'ACK_RULE', ruleId, '', 'acknowledged', String(res.rec.rule_text || '').slice(0, 200));
  return { rule_id: ruleId, acknowledged: true, acknowledged_at: res.at, alreadyAcknowledged: !res.first };
}

/** §26.4 — instructions badge New until acknowledged too; INSTRUCTIONS carries its own ack_log. */
function actionAcknowledgeInstruction_(payload, ctx) {
  const instrId = String(payload.instr_id || '').trim();
  if (!instrId) throw new Error('instr_id required');
  const res = rulesAckWrite_('INSTRUCTIONS', 'instr_id', instrId, 'instruction not found', ctx);
  if (res.first) logActivity_(ctx.ident.email, 'ACK_INSTRUCTION', instrId, '', 'acknowledged', String(res.rec.instruction_text || '').slice(0, 200));
  return { instr_id: instrId, acknowledged: true, acknowledged_at: res.at, alreadyAcknowledged: !res.first };
}

/** §26.3 — per rule, who has read it and who has not. Without a rule_id: the counts for every
 * active rule, so Management can see at a glance where the law has not landed. */
function actionRuleAckGrid_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw new Error('only Management may see the acknowledgment grid');
  const users = readTab_('USERS');
  const rows = readTab_('RULES');
  const ruleId = String(payload.rule_id || '').trim();

  if (!ruleId) {
    const summary = [];
    rows.forEach(function (r) {
      if (!r.rule_id || rulesStatus_(r.status) !== RULE_ACTIVE) return;
      const department = String(r.department || 'ALL');
      const log = rulesParseAck_(r.ack_log);
      const targets = rulesTargets_(department, users);
      let acked = 0;
      targets.forEach(function (u) { if (log.acks[normalizeEmail(u.email)]) acked++; });
      summary.push({ rule_id: String(r.rule_id), department: department, type: String(r.type || ''),
        rule_text: String(r.rule_text || ''), added_by: String(r.added_by || ''), added_at: rulesTs_(r.added_at),
        acknowledged: acked, of: targets.length });
    });
    return { rules: summary };
  }

  let rec = null;
  rows.forEach(function (r) { if (String(r.rule_id) === ruleId) rec = r; });
  if (!rec) throw new Error('rule not found');
  const department = String(rec.department || 'ALL');
  const log = rulesParseAck_(rec.ack_log);
  const counts = { acknowledged: 0, pending: 0 };
  const grid = [], seen = {};
  rulesTargets_(department, users).forEach(function (u) {
    seen[normalizeEmail(u.email)] = true;
    grid.push(rulesGridRow_(u, log, counts));
  });
  // Someone who acknowledged and later changed role still owes Management their row.
  Object.keys(log.acks).forEach(function (n) {
    if (seen[n]) return;
    grid.push(rulesGridRow_({ email: n, name: String(log.acks[n].name || n), role: '' }, log, counts));
  });

  return { rule_id: String(rec.rule_id), department: department, type: String(rec.type || ''),
    rule_text: String(rec.rule_text || ''), added_by: String(rec.added_by || ''), added_at: rulesTs_(rec.added_at),
    status: rulesStatus_(rec.status), retired_by: String(log.retired_by || ''), retired_at: String(log.retired_at || ''),
    counts: counts, grid: stripForRole_(grid, ctx.user.role, ctx.ident.email) };
}

// ---------- instructions ----------

function actionAddInstruction_(payload, ctx) {
  rulesRequireAuthor_(ctx);
  const department = rulesDept_(payload.department);
  const text = rulesText_(payload.instruction_text, RULE_MAX_TEXT);
  if (!text) throw new Error('instruction_text required');
  const date = rulesDate_(payload.date);

  const instrId = 'I' + Utilities.getUuid().slice(0, 8);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    rulesSheet_('INSTRUCTIONS').appendRow([instrId, text, department, date, ctx.ident.email, true,
      JSON.stringify({ acks: {} })]);
  } finally { lock.releaseLock(); }

  const ppc = department === RULE_PINNED_DEPT ? rulesPpcAppend_(text, date) : '';
  const issuer = ctx.user.name || ctx.ident.name || ctx.ident.email;
  const message = department + ' — ' + text + ' · effective from ' + date + ' · ' + rulesStamp_(issuer, now_());
  const delivered = rulesDeliver_(department, 'Instruction published', message, 'instruction:' + instrId, ctx.ident.email);
  logActivity_(ctx.ident.email, 'ADD_INSTRUCTION', instrId, '', department + '|' + date,
    text.slice(0, 200) + ' · delivered ' + delivered + (ppc ? ' · ppc ' + ppc : ''));

  return { instr_id: instrId, instruction_text: text, department: department, date: date,
    given_by: ctx.ident.email, active: true, delivered: delivered, ppc: ppc };
}

// ---------- staff reads ----------

/** §26.2 — this caller's department law, in the workbook's own order: Do's, Don'ts and Criteria
 * separated, ALL-department rules included for everyone, anything unacknowledged badged New. */
function actionMyRules_(payload, ctx) {
  const dept = roleDept_(ctx.user.role);
  const me = normalizeEmail(ctx.ident.email);
  const groups = {};
  RULE_TYPES.forEach(function (t) { groups[t] = []; });
  const rules = [], retired = [], pinned = [];
  let unacknowledged = 0;

  readTab_('RULES').forEach(function (r) {
    if (!r.rule_id) return;
    const department = String(r.department || 'ALL');
    if (!rulesVisible_(department, dept)) return;
    const log = rulesParseAck_(r.ack_log);
    const mine = log.acks[me] || null;
    const status = rulesStatus_(r.status);
    const rec = {
      rule_id: String(r.rule_id), department: department, type: String(r.type || ''),
      rule_text: String(r.rule_text || ''), added_by: String(r.added_by || ''), added_at: rulesTs_(r.added_at),
      status: status, acknowledged: !!mine, acknowledged_at: mine ? String(mine.at || '') : '',
      isNew: status === RULE_ACTIVE && !mine,
    };
    if (status === RULE_RETIRED) {
      rec.retired_by = String(log.retired_by || '');
      rec.retired_at = String(log.retired_at || '');
      retired.push(rec);
      return;
    }
    rules.push(rec);
    if (groups[rec.type]) groups[rec.type].push(rec);
    if (rec.isNew) unacknowledged++;
    if (department === RULE_PINNED_DEPT) pinned.push(rec);
  });

  const instructions = [];
  readTab_('INSTRUCTIONS').forEach(function (r) {
    if (!r.instr_id || !rulesIsActiveFlag_(r.active)) return;
    const department = String(r.department || 'ALL');
    if (!rulesVisible_(department, dept)) return;
    const log = rulesParseAck_(r.ack_log);
    const mine = log.acks[me] || null;
    const rec = {
      instr_id: String(r.instr_id), instruction_text: String(r.instruction_text || ''), department: department,
      date: rulesTs_(r.date), given_by: String(r.given_by || ''), active: true,
      acknowledged: !!mine, acknowledged_at: mine ? String(mine.at || '') : '', isNew: !mine,
    };
    instructions.push(rec);
    if (rec.isNew) unacknowledged++;
  });

  return {
    dept: dept, types: RULE_TYPES, rules: rules, groups: groups, retired: retired,
    instructions: instructions,
    pinned: ctx.user.role === RULE_PINNED_ROLE ? pinned : [],
    pinnedDepartment: ctx.user.role === RULE_PINNED_ROLE ? RULE_PINNED_DEPT : '',
    unacknowledged: unacknowledged,
  };
}

function actionMySops_(payload, ctx) {
  const dept = roleDept_(ctx.user.role);
  const out = [];
  readTab_('SOPS').forEach(function (s) {
    if (!s.sop_id) return;
    const d = String(s.dept || 'ALL');
    if (!rulesVisible_(d, dept)) return;
    out.push({ sop_id: String(s.sop_id), dept: d, order: Number(s.order) || 0, title: String(s.title || ''),
      content: String(s.content || ''), updated_by: String(s.updated_by || ''), updated_at: rulesTs_(s.updated_at) });
  });
  out.sort(function (a, b) { return (a.order - b.order) || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0); });
  return { dept: dept, sops: out };
}

// ---------- delivery (§26.2b) ----------

/** Push to exactly that department's staff, or everyone when the target is ALL. The issuer is
 * not notified of their own publish. Returns how many staff it reached. */
function rulesDeliver_(department, type, message, ref, issuerEmail) {
  const issuer = normalizeEmail(issuerEmail);
  let delivered = 0;
  rulesTargets_(department, readTab_('USERS')).forEach(function (u) {
    if (normalizeEmail(u.email) === issuer) return;
    notify_(u.email, type, message, ref);
    delivered++;
  });
  return delivered;
}

function rulesTargets_(department, users) {
  const dept = String(department || 'ALL');
  const out = [], seen = {};
  users.forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    const n = normalizeEmail(u.email);
    if (!n || seen[n]) return;
    if (dept !== 'ALL' && roleDept_(String(u.role)) !== dept) return;
    seen[n] = true;
    out.push({ email: String(u.email), name: String(u.name || u.email), role: String(u.role || '') });
  });
  return out;
}

function rulesVisible_(department, myDept) {
  const d = String(department || 'ALL');
  if (d === 'ALL') return true;
  if (myDept === '*') return true;
  return d === myDept;
}

/** §26.2b — the stamp every delivery carries: date, time, and who issued it. */
function rulesStamp_(issuer, iso) {
  const s = String(iso || '');
  return 'issued by ' + issuer + ' on ' + s.slice(0, 10) + ' at ' + s.slice(11, 16) + ' PKT';
}

// ---------- the PPC Central sheet contract (§26.4) ----------

/** Appends ONLY the Instruction and Date cells to the existing PPC Central instructions tab.
 * Any missing connection, tab or column is reported as "not connected yet" — never an error,
 * and nothing on that sheet is ever created, renamed or reshaped. */
function rulesPpcAppend_(text, date) {
  let ss = null;
  try {
    const id = rulesPpcId_();
    if (!id) return rulesPpcSkip_('no ppc row in CONNECTIONS');
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    return rulesPpcSkip_('cannot open the PPC Central sheet');
  }

  // The skip/append log lines are written after the lock is released — logActivity_ takes the
  // same script lock, so nothing here may log while holding it.
  let why = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = rulesPpcTab_(ss);
    const lastCol = sh ? sh.getLastColumn() : 0;
    if (!sh) why = 'instructions tab not found';
    else if (lastCol < 1) why = 'instructions tab is empty';
    else {
      const head = sh.getRange(1, 1, 1, lastCol).getValues()[0];
      let instrCol = 0, dateCol = 0;
      head.forEach(function (h, i) {
        const n = rulesNormName_(h);
        if (!instrCol && n === rulesNormName_(PPC_INSTRUCTION_COL)) instrCol = i + 1;
        if (!dateCol && n === rulesNormName_(PPC_DATE_COL)) dateCol = i + 1;
      });
      if (!instrCol || !dateCol) why = 'Instruction/Date columns not found';
      else {
        const row = sh.getLastRow() + 1;
        sh.getRange(row, instrCol).setValue(text);
        sh.getRange(row, dateCol).setValue(date);
        SpreadsheetApp.flush();
      }
    }
  } catch (e) {
    why = 'append failed';
  } finally { lock.releaseLock(); }

  if (why) return rulesPpcSkip_(why);
  logActivity_('rules', 'PPC_INSTRUCTION_APPEND', PPC_INSTRUCTIONS_TAB, '', text.slice(0, 200), date);
  return PPC_APPENDED;
}

function rulesPpcSkip_(why) {
  logActivity_('rules', 'PPC_INSTRUCTION_SKIP', PPC_INSTRUCTIONS_TAB, '', PPC_NOT_CONNECTED, why);
  return PPC_NOT_CONNECTED;
}

function rulesPpcId_() {
  let id = '';
  readTab_('CONNECTIONS').forEach(function (c) {
    if (id) return;
    if (String(c.sheet_kind) !== 'ppc') return;
    const v = String(c.spreadsheet_id || '').trim();
    if (v) id = v;
  });
  return id;
}

function rulesPpcTab_(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) if (sheets[i].getName() === PPC_INSTRUCTIONS_TAB) return sheets[i];
  const want = rulesNormName_(PPC_INSTRUCTIONS_TAB);
  for (let i = 0; i < sheets.length; i++) if (rulesNormName_(sheets[i].getName()) === want) return sheets[i];
  return null;
}

function rulesNormName_(v) {
  return rulesStr_(v).replace(/\s+/g, ' ').trim().toLowerCase();
}

// ---------- shared helpers ----------

function rulesSheet_(tabName) {
  const sh = getPortalDb_(false).getSheetByName(tabName);
  if (!sh) throw new Error(tabName + ' tab missing — run setupDatabase()');
  return sh;
}

function rulesHeadIdx_(head, tabName) {
  const idx = {};
  head.forEach(function (h, i) { if (String(h)) idx[String(h)] = i; });
  DB_TABS[tabName].forEach(function (c) { if (typeof idx[c] !== 'number') throw new Error(tabName + ' is missing column ' + c); });
  return idx;
}

function rulesRec_(head, row) {
  const o = {};
  head.forEach(function (h, i) { o[h] = row[i]; });
  return o;
}

function rulesFindRow_(vals, colIdx, id, missingMsg) {
  for (let i = 1; i < vals.length; i++) if (String(vals[i][colIdx]) === id) return i;
  throw new Error(missingMsg);
}

/** One acknowledgment writer for both RULES and INSTRUCTIONS — both carry an ack_log column. */
function rulesAckWrite_(tabName, idColName, idValue, missingMsg, ctx) {
  const dept = roleDept_(ctx.user.role);
  const me = normalizeEmail(ctx.ident.email);
  let rec = null, at = '', first = false;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = rulesSheet_(tabName);
    const vals = sh.getDataRange().getValues();
    const idx = rulesHeadIdx_(vals[0], tabName);
    const rowIdx = rulesFindRow_(vals, idx[idColName], idValue, missingMsg);
    rec = rulesRec_(vals[0], vals[rowIdx]);
    if (!rulesVisible_(String(rec.department || 'ALL'), dept)) throw new Error('not addressed to your department');
    const log = rulesParseAck_(rec.ack_log);
    if (log.acks[me]) {
      at = String(log.acks[me].at || '');
    } else {
      at = now_();
      first = true;
      log.acks[me] = { at: at, name: ctx.user.name || ctx.ident.name || ctx.ident.email };
      sh.getRange(rowIdx + 1, idx.ack_log + 1).setValue(JSON.stringify(log));
    }
  } finally { lock.releaseLock(); }
  return { rec: rec, at: at, first: first };
}

function rulesParseAck_(raw) {
  let log = null;
  try { log = JSON.parse(String(raw || '') || '{}'); } catch (e) { log = null; }
  if (!log || typeof log !== 'object') log = {};
  if (!log.acks || typeof log.acks !== 'object') log.acks = {};
  return log;
}

function rulesGridRow_(u, log, counts) {
  const a = log.acks[normalizeEmail(u.email)] || null;
  counts[a ? 'acknowledged' : 'pending']++;
  return { email: u.email, name: u.name, role: u.role, acknowledged: !!a,
    acknowledged_at: a ? String(a.at || '') : '' };
}

function rulesCanAuthor_(ctx) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return true;
  return ctx.user.role === 'Team Lead' && rulesFlagOn_(getConfig(RULE_TEAM_LEAD_FLAG));
}
function rulesRequireAuthor_(ctx) {
  if (!rulesCanAuthor_(ctx)) throw new Error('role may not publish or retire company law');
}
function rulesFlagOn_(v) {
  return ['true', 'yes', '1'].indexOf(rulesStr_(v).trim().toLowerCase()) >= 0;
}

function rulesDept_(v) {
  const d = String(v || '').trim();
  if (RULE_DEPTS.indexOf(d) < 0) throw new Error('department must be one of: ' + RULE_DEPTS.join(', '));
  return d;
}
function rulesType_(v) {
  const t = String(v || '').trim();
  if (RULE_TYPES.indexOf(t) < 0) throw new Error('type must be one of: ' + RULE_TYPES.join(', '));
  return t;
}
function rulesStatus_(v) {
  return String(v || '').trim() === RULE_RETIRED ? RULE_RETIRED : RULE_ACTIVE;
}
/** A blank `active` cell reads as active: an instruction never disappears through an empty cell. */
function rulesIsActiveFlag_(v) {
  return ['false', 'no', '0', 'retired', 'inactive'].indexOf(rulesStr_(v).trim().toLowerCase()) < 0;
}

function rulesStr_(v) {
  return (v === null || typeof v === 'undefined') ? '' : String(v);
}

const RULE_CTRL_RE = new RegExp('[\\u0000-\\u0009\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

function rulesText_(v, max) {
  return String(typeof v === 'undefined' || v === null ? '' : v).replace(RULE_CTRL_RE, ' ').trim().slice(0, max);
}

function rulesToday_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd'); }

function rulesDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Karachi', 'yyyy-MM-dd');
  const s = String(v || '').trim();
  if (!s) return rulesToday_();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error('date must be YYYY-MM-DD (PKT)');
  const d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T00:00:00+05:00');
  if (isNaN(d.getTime())) throw new Error('date is not a valid day');
  return m[1] + '-' + m[2] + '-' + m[3];
}

/** Sheets hands back a Date for anything it parsed as one; stored stamps stay PKT either way. */
function rulesTs_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'");
  return rulesStr_(v);
}

const ACTIONS_RULES = {
  addRule: [actionAddRule_, 'any'],
  retireRule: [actionRetireRule_, 'any'],
  acknowledgeRule: [actionAcknowledgeRule_, 'any'],
  acknowledgeInstruction: [actionAcknowledgeInstruction_, 'any'],
  ruleAckGrid: [actionRuleAckGrid_, 'any'],
  addInstruction: [actionAddInstruction_, 'any'],
  myRules: [actionMyRules_, 'any'],
  mySops: [actionMySops_, 'any'],
};
