/** Phase 8 — the AI Monthly Audit Agent (§22) and the AGENT_QUEUE consumer.
 *
 * Division of labour, per §22.6: Apps Script does ALL arithmetic deterministically (Brain v17,
 * sums, reconciliations) — the model interprets, cross-checks and writes prose. AI output never
 * causes a write, send or purchase (RL-7): reports are DRAFTS stored to Drive for humans.
 *
 * Runs the moment the Anthropic account has credits; until then every attempt fails loudly with
 * "credit balance too low", notifies Management once, and the queue row stays 'pending'.
 */

const AUDIT_FOLDER = 'M98M Audits';
const AUDIT_MODEL_FALLBACK = 'claude-sonnet-5';
const AUDIT_MAX_TOKENS_FALLBACK = 4096;
const AUDIT_QUEUE_KIND = 'monthly_audit';

/** §22.1 trigger entry point (owner adds a monthly time trigger on the 1st, PKT). Enqueues one
 * job per active account for the month that just closed, then consumes the queue. */
function runMonthlyAudit() {
  const month = auditPrevMonth_();
  const accounts = connectionHealth().perAccount || [];
  const sh = getPortalDb_(false).getSheetByName('AGENT_QUEUE');
  accounts.forEach(function (a) {
    sh.appendRow(['J' + Utilities.getUuid().slice(0, 8), AUDIT_QUEUE_KIND,
      JSON.stringify({ account: a.account, month: month }), 'pending', now_(), '', '', '', '']);
  });
  logActivity_('audit', 'AUDIT_ENQUEUED', month, '', String(accounts.length) + ' accounts', '');
  return consumeAgentQueue();
}

/** Generic queue consumer (also safe on its own trigger). One job per run keeps each execution
 * far inside Apps Script's 6-minute ceiling; the trigger's next firing takes the next job. */
function consumeAgentQueue() {
  const sh = getPortalDb_(false).getSheetByName('AGENT_QUEUE');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][3]) !== 'pending') continue;
    if (String(rows[i][1]) !== AUDIT_QUEUE_KIND) continue;   // other kinds wait for their consumer
    const jobId = rows[i][0];
    const payload = JSON.parse(String(rows[i][2] || '{}'));
    sh.getRange(i + 1, 4).setValue('running');
    sh.getRange(i + 1, 6).setValue(now_());
    SpreadsheetApp.flush();
    try {
      const ref = auditOneAccount_(payload.account, payload.month);
      sh.getRange(i + 1, 4).setValue('done');
      sh.getRange(i + 1, 7).setValue(now_());
      sh.getRange(i + 1, 8).setValue(ref);
      logActivity_('audit', 'AUDIT_DONE', payload.account, '', ref, payload.month);
    } catch (e) {
      sh.getRange(i + 1, 4).setValue('pending');            // retriable, never lost
      sh.getRange(i + 1, 9).setValue(String(e && e.message || e).slice(0, 400));
      logActivity_('audit', 'ERROR:audit', payload.account, '', '', String(e && e.stack || e));
      if (/credit balance/i.test(String(e))) {
        notifyManagement_('AI audit waiting on credits',
          'The monthly audit is queued but the Anthropic account has no credits. Top up at console.anthropic.com and it resumes on the next run.', 'audit');
        break;                                              // no point burning through the queue
      }
    }
    break;                                                  // one job per execution
  }
  return 'queue pass complete';
}

/** §22.2–§22.4 for one account: deterministic data pack -> model -> report file in Drive. */
function auditOneAccount_(account, month) {
  const pack = auditDataPack_(account, month);
  const prose = auditCallModel_(auditSystemPrompt_(), JSON.stringify(pack));
  const folder = auditFolder_(month);
  const file = folder.createFile('Audit — ' + account + ' — ' + month + '.md',
    '# M98M Monthly Audit — ' + account + ' — ' + month + '\n\n' +
    '_Numbers computed deterministically in Apps Script; the model interpreted them. Draft for Management (§22, RL-7)._\n\n' +
    prose + '\n\n---\n## The data pack the model saw\n```json\n' + JSON.stringify(pack, null, 1) + '\n```\n',
    MimeType.PLAIN_TEXT);
  return file.getId();
}

/** The numeric groundwork (§22.3 items the sheets can answer today). All sums here, none in the
 * model. Missing connections degrade to notes, never throws — an audit of what exists beats no
 * audit of everything. */
function auditDataPack_(account, month) {
  const pack = { account: account, month: month, computed_at: now_(), notes: [] };

  const monthly = bridgeReadRows_({ scope: 'account', account: account, kind: 'sales_analysis',
    tab: ['Monthly Sheet'], limit: 400 });
  if (monthly && monthly.ok !== false && monthly.rows) {
    const inMonth = monthly.rows.filter(function (r) {
      return String(r['Date'] || '').slice(0, 7) === month || String(r['Date'] || '').indexOf(month) === 0;
    });
    const sum = function (col) {
      let t = 0; inMonth.forEach(function (r) { const v = Number(r[col]); if (isFinite(v)) t += v; });
      return Math.round(t * 100) / 100;
    };
    pack.pnl = {
      days: inMonth.length,
      sold: sum('Sold (B)'), earning: sum('Earning (H)'), aliexpress: sum('AliExpress (I)'),
      ads_priority: sum('All Priority incl VAT (N)'), general_fees: sum('General fees'),
      ad_waste: sum('Ad Waste'), raw_profit: sum('Raw Profit (T)'),
      returns: sum('Returns (U)'), actual_profit: sum('Actual Profit (V)'),
    };
    pack.pnl.total_ads = Math.round((pack.pnl.ads_priority + pack.pnl.general_fees + pack.pnl.ad_waste) * 100) / 100;
    pack.pnl.margin_pct = pack.pnl.sold > 0 ? Math.round(pack.pnl.actual_profit / pack.pnl.sold * 1000) / 10 : null;
  } else {
    pack.notes.push('sales_analysis not connected — P&L section limited');
  }

  // Fee engine cross-check (§22.3.1): what the fee config says a sample of this month's sold
  // prices should have earned, so the model can flag drift without doing arithmetic itself.
  try {
    const cfg = brainFeeConfig_(account);
    pack.fee_config = { defaultFvf: cfg.defaultFvf, configMissing: !!cfg.configMissing };
    pack.anchor = brainOrderEarning_(19.99, 0.10, {}).orderEarning;   // must be 17.15
  } catch (e) { pack.notes.push('fee config unreadable: ' + String(e && e.message || e)); }

  // Portal-side operations (§22.3.8, §22.3.10) — the portal's own DB, always available.
  const wrongs = readTab_('HUNTING_DB');                      // placeholder guard: tab always exists
  const tasks = readTab_('TASKS');
  const monthTasks = tasks.filter(function (t) { return String(t.created_at || '').slice(0, 7) === month; });
  pack.ops = {
    tasks_created: monthTasks.length,
    tasks_completed: monthTasks.filter(function (t) { return String(t.status) === 'Completed'; }).length,
    reports_filed: readTab_('REPORTS_2H').filter(function (r) { return String(r.date || '').slice(0, 7) === month; }).length,
  };
  pack.shadow_writes = readTab_('ACTIVITY_LOG').filter(function (r) {
    return String(r.action) === 'SHADOW_WRITE' && String(r.ts || '').slice(0, 7) === month;
  }).length;

  return pack;
}

function auditSystemPrompt_() {
  return 'You are the M98M monthly auditor (spec §22). You receive a JSON data pack whose numbers ' +
    'were computed deterministically — NEVER recompute or invent figures; quote them. Write for a ' +
    'non-technical owner: 5-bullet executive summary, a scorecard (profit, margin, ads, returns, ' +
    'each with 🟢🟡🔴), findings with the evidence field named, £-impact where the pack gives it, ' +
    'and 3–7 prioritised recommendations. Flag data the pack marks as missing or inconsistent ' +
    'rather than papering over it. You are an auditor: you recommend, Management decides.';
}

/** One place talks to the API. Key from Script Properties only (RL-2); model/tokens from CONFIG. */
function auditCallModel_(system, userContent) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY missing from Script Properties');
  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: getConfig('ai_model') || AUDIT_MODEL_FALLBACK,
      max_tokens: Number(getConfig('ai_max_tokens')) || AUDIT_MAX_TOKENS_FALLBACK,
      system: system,
      messages: [{ role: 'user', content: userContent }],
    }),
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  const body = JSON.parse(resp.getContentText() || '{}');
  if (code !== 200) {
    throw new Error('Anthropic ' + code + ': ' + String(body.error && body.error.message || 'request failed'));
  }
  return (body.content && body.content[0] && body.content[0].text) || '';
}

function auditFolder_(month) {
  let root = DriveApp.getFoldersByName(AUDIT_FOLDER);
  root = root.hasNext() ? root.next() : DriveApp.createFolder(AUDIT_FOLDER);
  let sub = root.getFoldersByName(month);
  return sub.hasNext() ? sub.next() : root.createFolder(month);
}

function auditPrevMonth_() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  const mm = String(d.getUTCMonth() + 1);
  return d.getUTCFullYear() + '-' + (mm.length < 2 ? '0' + mm : mm);
}

// ---------- router actions ----------
/** "Run audit now" (§22.1) — Management only. */
function actionRunAudit_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const month = String(payload.month || auditPrevMonth_());
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(SAFE_ERROR_PREFIX + 'month must look like 2026-07');
  const sh = getPortalDb_(false).getSheetByName('AGENT_QUEUE');
  const account = String(payload.account || '').trim();
  const targets = account ? [{ account: account }] : (connectionHealth().perAccount || []);
  targets.forEach(function (a) {
    sh.appendRow(['J' + Utilities.getUuid().slice(0, 8), AUDIT_QUEUE_KIND,
      JSON.stringify({ account: a.account, month: month }), 'pending', now_(), '', '', '', '']);
  });
  logActivity_(ctx.ident.email, 'AUDIT_REQUESTED', month, '', String(targets.length) + ' jobs', '');
  const result = consumeAgentQueue();
  return { queued: targets.length, month: month, note: result };
}

function actionAuditReports_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email) && String(ctx.user.role) !== 'Team Lead') {
    throw authErr_('not management', ctx.ident.email);
  }
  const jobs = readTab_('AGENT_QUEUE').filter(function (j) { return String(j.kind) === AUDIT_QUEUE_KIND; });
  return { jobs: jobs.map(function (j) {
    return { job_id: j.job_id, payload: j.payload, status: j.status, done_at: j.done_at,
      result_ref: j.result_ref, error: j.error };
  }) };
}

const ACTIONS_AUDIT = {
  runAudit: [actionRunAudit_, 'any'],
  auditReports: [actionAuditReports_, 'any'],
};
