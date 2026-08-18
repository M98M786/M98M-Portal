/** Phase 5 — ADVERTISING (Zain). PPC decisions per account (§8.5), the campaign columns of the
 * Central Main Sheet (§8.7) with the two-way notification of §14, the "Wrong Advertising" ALARM
 * feed, and the read-only "Instructions Given By The Management" feed.
 *
 * REALITY WINS over §8.5 in four places, so everything here is header-addressed through
 * SheetBridge and nothing assumes a column letter:
 *  · 'Azhar Bhai' carries Campaign in B BEFORE Item ID in C; the other five tabs are B=Item ID,
 *    C=Campaign. The layout is read off the header row, never assumed.
 *  · A1 is literally blank on AMNA Baji, Sir Hasib, Hafiza Baaji and ABRT, yet the titles still
 *    occupy column A — SheetBridge hands those cells back under the positional key 'col:A', which
 *    is readable only: the portal will not write a column the tab does not head (no column is
 *    ever created, so on those four tabs a title simply reports as skippedMissing).
 *  · The G header is 'Past behaviour(7 days)' on Saif/AMNA/Hafiza and plain 'Past behaviour' on
 *    Azhar/Sir Hasib/ABRT. Both spellings are whitelisted; the write uses the tab's own.
 *  · Campaign names in the live PPC tabs are FREE TEXT ('scalling campaign', 'sand paper
 *    campaign', 'priority-21/07/2026,19:50', '90 day contributor'). The 7-tier SOP vocabulary
 *    lives only in the rules workbook, so the tiers are offered as SUGGESTIONS and an existing
 *    campaign name is never rewritten — the portal only ever APPENDS a PPC row, which is the
 *    tab's own daily-batch convention.
 *
 * The Main Sheet campaign dropdown (H2:I152) is a different, closed vocabulary — 'Campaign CPC,
 * General Dynamic, Organic' — and that is what actionSetCampaign_ validates against.
 */

// ---------- PPC Central, per-account decision tabs (§8.5) ----------
/** Tab names verbatim from the live workbook, including 'Saif bhai' lowercase b and the double-a
 * of 'Hafiza Baaji'. The registry spells its accounts differently again ('AZHAR ABRT',
 * 'HAFIZA BHAJI', 'Sir Hasib ' with a trailing space), and a misspelling cannot be bridged by
 * containment alone, so the mapping is explicit. */
const ADV_PPC_TAB_ALIASES = {
  'azhar bhai': ['Azhar Bhai'],
  'saif bhai': ['Saif bhai'],
  'amna baji': ['AMNA Baji'],
  'amna baaji': ['AMNA Baji'],
  'amna saif': ['AMNA Baji'],
  'sir hasib': ['Sir Hasib'],
  'sir haseeb': ['Sir Hasib'],
  'hafiza baaji': ['Hafiza Baaji'],
  'hafiza baji': ['Hafiza Baaji'],
  'hafiza bhaji': ['Hafiza Baaji'],
  'hafiza sadia': ['Hafiza Baaji'],
  'hafiza safdia': ['Hafiza Baaji'],
  'abrt': ['ABRT'],
  'azhar abrt': ['ABRT'],
};

const ADV_PPC_TITLE = 'Listing Title';
const ADV_PPC_ITEM = 'Item ID';
const ADV_PPC_CAMPAIGN = 'Campaign';
const ADV_PPC_DECISION = 'Decision';
const ADV_PPC_REASON = 'Reason to stop';
const ADV_PPC_ADDED = 'Added in another campaign';
const ADV_PPC_COMMENT = 'Comment';
// Both live spellings of the G header; the tab's own is resolved from its header row.
const ADV_PPC_PAST_VARIANTS = ['Past behaviour(7 days)', 'Past behaviour'];
const ADV_PPC_HEADERS = [ADV_PPC_TITLE, ADV_PPC_ITEM, ADV_PPC_CAMPAIGN, ADV_PPC_DECISION,
  ADV_PPC_REASON, ADV_PPC_ADDED, ADV_PPC_PAST_VARIANTS[0], ADV_PPC_PAST_VARIANTS[1], ADV_PPC_COMMENT];

/** The only closed vocabulary on these tabs: data validation on F2:F69, all six tabs. */
const ADV_ADDED_VALUES = ['Yes', 'No', 'pending'];
/** Column D has NO data validation — decisions are free lowercase text. These are the values the
 * live tabs actually contain, offered as suggestions; the typo 'pauswe' is read back verbatim
 * where it exists but is never offered as something to write. */
const ADV_DECISIONS_SEEN = ['paused', 'pause', 'resume', 'removed', 'shifted to old campaign'];
/** A day's block opens with the same date repeated across A–E, and 'nothing paused today' is this
 * literal string (its typo is the sheet's) repeated across A–E. Both are structure, not decisions,
 * and are classified rather than dropped. */
const ADV_PPC_DAY_MARKER = 'All active and dupliction checked';
const ADV_PPC_SEPARATOR_SPAN = 5;
const ADV_PPC_LIMIT = 200;

/** Advertising SOP v2.0. Suggestions for naming a campaign — never written on their own, never a
 * validation: the tier names do not appear in the live PPC tabs at all. */
const ADV_SOP_TIERS = [
  { tier: 1, name: 'TOP LISTINGS', model: 'CPC', budget: '£100–150/day', entry: 'ROAS ≥ 6' },
  { tier: 2, name: 'SCALING', model: 'CPC', budget: '£50–80/day', entry: 'ROAS ≥ 5' },
  { tier: 3, name: 'TESTING', model: 'CPC', budget: '£10–20/day', entry: 'every new CPC item, live 5–10 PM UK only' },
  { tier: 4, name: 'SEASONAL', model: 'CPC', budget: '£10/day', entry: 'seasonal tag from the Product Hunter, no ROAS gate' },
  { tier: 5, name: 'SIMPLE GENERAL', model: 'General', budget: 'no daily budget — % per sale', entry: 'items above £15, % from the sheet' },
  { tier: 6, name: 'DYNAMIC GENERAL', model: 'General', budget: 'no daily budget — % per sale', entry: 'CPC failures under £15 only' },
  { tier: 7, name: 'SALES PICK', model: 'CPC', budget: '£30/day', entry: 'specially picked sales items' },
];

// ---------- Central Main Sheet campaign columns (§8.7) ----------
const ADV_MAIN_SHEET_TAB = ['Main Sheet'];
// Headers as the live Central workbook spells them ('Aliexpress Cost', 'Profit ' with its
// trailing space). Matching is by header name, never by column letter.
const ADV_MAIN_SHEET_COLS = ['Image Link', 'Listing Title', 'Sold For', 'Order Earning',
  'Aliexpress Cost', 'Profit ', 'Campaign Selection', 'Current Campaign Selection', 'eBay Item No'];
const ADV_CAMPAIGN_COL = 'Campaign Selection';
const ADV_CURRENT_CAMPAIGN_COL = 'Current Campaign Selection';
/** RL-6 column ownership. 'Current Campaign Selection' is deliberately OUT: it mirrors what eBay
 * actually runs and is maintained by the existing sync (which also writes the per-campaign comment
 * on 'Campaign Selection'); it is empty in all 151 live rows and is the ALARM's "Live on eBay"
 * side. The portal owns the manager's decision column and nothing else on this tab. */
const ADV_CAMPAIGN_WHITELIST = [ADV_CAMPAIGN_COL];
/** The Main Sheet's own dropdown (H2:I152), identical to ⚙ Config CPC_LABEL / GENERAL_LABEL /
 * ORGANIC_LABEL. The wider tier list of §8.5 is not on this sheet and is not written to it. */
const ADV_CAMPAIGNS = ['Campaign CPC', 'General Dynamic', 'Organic'];
// The Main Sheet grid is padded far past its data (1151 rows on the live ABRT workbook).
const ADV_CENTRAL_SCAN = 2000;

// ---------- the "Wrong Advertising" ALARM tab (§8.7) ----------
const ADV_ALARM_TAB = ['Wrong Advertising'];
// REALITY: the header is 'Listing Title', not §8.7's 'Title'.
const ADV_ALARM_COLS = ['Date', 'Type', 'Item No', 'Listing Title', 'Manager wants', 'Live on eBay',
  'Raw profit £', 'Net after CPC £', 'Status', 'Resolved'];
const ADV_ALARM_TYPE = 'ALARM';
const ADV_ALARM_OPEN = 'OPEN';
const ADV_ALARM_RESOLVED = 'RESOLVED';
const ADV_ALARM_STATUSES = [ADV_ALARM_OPEN, ADV_ALARM_RESOLVED];
const ADV_ALARM_LIMIT = 200;
const ADV_ALARM_MAX = 1000;
/** One bell entry per new alarm up to this many; beyond it a single summary, so a first scan of
 * every account's backlog cannot flood Management's and Zain's notifications. */
const ADV_ALARM_NOTIFY_MAX = 25;

/** §27 SIGNALS is the portal's own alarm ledger and the ONLY place a resolution is recorded: the
 * Wrong Advertising tab surfaces read-only (§8.7), so its Status and Resolved cells stay the
 * business's own and are never written by the portal. */
const ADV_SIGNAL_TYPE = 'Wrong Advertising';
const ADV_SIGNAL_ROLES = 'Management, Advertising Manager';
const ADV_SIGNAL_WRITABLE_COLS = ['acknowledged_by'];
const ADV_ALARM_REF = 'wrong-advertising:';
const ADV_CAMPAIGN_REF = 'campaign:';

// ---------- the management instructions feed (§8.5) ----------
/** Excel truncated the tab name to 31 chars in the export; the live Sheets tab carries the full
 * name. Both candidates are offered and SheetBridge accepts a unique containment match. */
const ADV_INSTRUCTIONS_TABS = ['Instructions Given By The Management', 'Instructions Given By The Manag'];
// REALITY: 'Instruction ' sits in A1 with a trailing space and 'Date' in E1 — B–D are empty, so
// the two are NOT adjacent. Header-name addressing makes the gap irrelevant.
const ADV_INSTRUCTION_COL = 'Instruction';
const ADV_INSTRUCTION_DATE_COL = 'Date';
const ADV_INSTRUCTIONS_LIMIT = 200;
const ADV_DEPT = 'Advertising';

const ADV_MAX_TEXT = 2000;

// ---------- who may do what (§4.3) ----------
/** "Business dashboard: ads view" for Advertising, full for Management and Team Lead. */
function advMayReadPpc_(ctx) {
  const role = String(ctx.user.role || '');
  return isMgmt_(ctx.user.role, ctx.ident.email) || role === 'Advertising Manager' || role === 'Team Lead';
}

/** §4.3 "Change campaign type": Mgmt ✅→notify Zain · TL ✅ · Adv ✅→notify Mgmt · CS record-update. */
function advMayChangeCampaign_(ctx) {
  const role = String(ctx.user.role || '');
  return isMgmt_(ctx.user.role, ctx.ident.email) || role === 'Advertising Manager'
    || role === 'Team Lead' || role === 'CS';
}

/** §8.7: the ALARM tab surfaces for Management and Advertising — those two, exactly. */
function advMaySeeAlarms_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || String(ctx.user.role || '') === 'Advertising Manager';
}

// ---------- §8.5 the per-account decision table ----------
function actionPpcTable_(payload, ctx) {
  if (!advMayReadPpc_(ctx)) throw new Error('advertising or management only');
  const account = advAccount_(payload.account);
  let limit = Number(payload.limit) || ADV_PPC_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > ADV_ALARM_MAX) limit = ADV_ALARM_MAX;

  const read = advReadPpcTab_(account, limit);
  if (!read.ok) {
    return {
      account: account, ok: false, reason: read.reason || 'not connected yet', rows: [], count: 0,
      campaigns_in_use: [], suggestions: advPpcSuggestions_([]), may_write: advMayChangeCampaign_(ctx),
    };
  }

  const layout = advPpcLayout_(read.headers);
  const rows = [], campaigns = [];
  const seenCampaign = {};
  let day = '';
  read.rows.forEach(function (r) {
    const rec = advPpcRow_(r, layout, day);
    if (rec.kind === 'day') day = rec.day;
    rec.day = day;
    if (rec.campaign) {
      const n = advNorm_(rec.campaign);
      if (n && !seenCampaign[n]) { seenCampaign[n] = true; campaigns.push(rec.campaign); }
    }
    rows.push(rec);
  });

  return {
    account: account, ok: true, tab: read.tab, headers: read.headers, layout: layout,
    rows: stripForRole_(rows, ctx.user.role, ctx.ident.email),
    count: rows.length, truncated: !!read.truncated,
    campaigns_in_use: campaigns,
    suggestions: advPpcSuggestions_(campaigns),
    may_write: advMayChangeCampaign_(ctx),
  };
}

function advPpcSuggestions_(campaignsInUse) {
  return {
    // Suggestions only. An existing campaign name is never rewritten and the tier names are not a
    // vocabulary this sheet uses — reusing a name already on the tab keeps the selling history,
    // which is how the SOP says a listing moves tier.
    sop_tiers: ADV_SOP_TIERS,
    campaigns_in_use: campaignsInUse,
    decisions: ADV_DECISIONS_SEEN,
    added_in_another_campaign: ADV_ADDED_VALUES,
    main_sheet_campaigns: ADV_CAMPAIGNS,
  };
}

function advReadPpcTab_(account, limit) {
  if (typeof bridgeReadRows_ !== 'function') return { ok: false, reason: 'not connected yet' };
  return bridgeReadRows_({
    scope: 'global', kind: 'ppc', tab: advPpcTabCandidates_(account),
    expect: ADV_PPC_HEADERS, limit: limit,
  });
}

/** REALITY: the 'Azhar Bhai' tab is header-only — that account's listings are tracked on the ABRT
 * tab under 'azhar bhai duplicate' campaigns. An empty table there is the truth, not a fault. */
function advPpcTabCandidates_(account) {
  const raw = String(account || '').trim();
  const out = raw ? [raw] : [];
  (ADV_PPC_TAB_ALIASES[advNorm_(raw)] || []).forEach(function (a) { if (out.indexOf(a) < 0) out.push(a); });
  return out;
}

/** The tab's real shape, read off its header row: which raw header spells each column, where the
 * title lives when A1 is blank, and whether this is the Azhar tab with Campaign before Item ID. */
function advPpcLayout_(headers) {
  const norm = {}, pos = {};
  (headers || []).forEach(function (h, i) {
    const raw = String(h === null || h === undefined ? '' : h);
    const n = advNorm_(raw);
    if (!n || norm[n] !== undefined) return;
    norm[n] = raw;
    pos[n] = i + 1;
  });
  function pick(name) { return norm[advNorm_(name)] || ''; }

  const title = pick(ADV_PPC_TITLE);
  const item = pick(ADV_PPC_ITEM);
  const campaign = pick(ADV_PPC_CAMPAIGN);
  let past = '';
  for (let i = 0; i < ADV_PPC_PAST_VARIANTS.length && !past; i++) past = pick(ADV_PPC_PAST_VARIANTS[i]);

  const itemCol = pos[advNorm_(ADV_PPC_ITEM)] || 0;
  const campaignCol = pos[advNorm_(ADV_PPC_CAMPAIGN)] || 0;
  return {
    // '' means the tab does not head that column. The four blank-A1 tabs still hold their titles in
    // column A, which SheetBridge returns under 'col:A' — readable, never writable.
    title_header: title,
    title_key: title || 'col:A',
    item_header: item,
    campaign_header: campaign,
    decision_header: pick(ADV_PPC_DECISION),
    reason_header: pick(ADV_PPC_REASON),
    added_header: pick(ADV_PPC_ADDED),
    past_header: past,
    comment_header: pick(ADV_PPC_COMMENT),
    campaign_before_item: !!(itemCol && campaignCol && campaignCol < itemCol),
  };
}

function advPpcRow_(r, layout, currentDay) {
  const title = advCellText_(advPick_(r, layout.title_key));
  const rec = {
    _row: r._row,
    listing_title: title,
    item_id: advDigits_(advPick_(r, layout.item_header)),
    campaign: advCellText_(advPick_(r, layout.campaign_header)),
    decision: advCellText_(advPick_(r, layout.decision_header)),
    reason_to_stop: advCellText_(advPick_(r, layout.reason_header)),
    added_in_another_campaign: advCellText_(advPick_(r, layout.added_header)),
    past_behaviour: advCellText_(advPick_(r, layout.past_header)),
    comment: advCellText_(advPick_(r, layout.comment_header)),
    // Overflow comments really do spill into the unheaded column I on four live rows.
    comment_overflow: advCellText_(r['col:I']),
    day: currentDay,
    kind: 'decision',
  };

  if (advIsSpanRow_(r, layout)) {
    // The repeated value is kept in day/marker and cleared from the decision fields: a separator's
    // date sitting in column B is not an item number, and nothing is lost by saying so.
    rec.listing_title = '';
    rec.item_id = '';
    rec.campaign = '';
    rec.decision = '';
    rec.reason_to_stop = '';
    if (advNorm_(title) === advNorm_(ADV_PPC_DAY_MARKER)) {
      rec.kind = 'marker';
      rec.marker = title;
    } else {
      rec.kind = 'day';
      rec.day = title;
    }
    return rec;
  }
  if (rec.item_id && !rec.decision && !rec.campaign) rec.kind = 'watchlist';
  return rec;
}

/** A day separator and the day-status marker both repeat one value across A–E; a decision row
 * never does. Positional keys are used here because the repeat is positional on every tab. */
function advIsSpanRow_(r, layout) {
  const first = advCellText_(advPick_(r, layout.title_key));
  if (!first) return false;
  const want = advNorm_(first);
  if (!want) return false;
  let same = 1;
  for (let c = 2; c <= ADV_PPC_SEPARATOR_SPAN; c++) {
    const key = 'col:' + String.fromCharCode(64 + c);
    let v = Object.prototype.hasOwnProperty.call(r, key) ? r[key] : undefined;
    if (v === undefined) v = advColumnAt_(r, c, layout);
    if (advNorm_(advCellText_(v)) !== want) return false;
    same++;
  }
  return same === ADV_PPC_SEPARATOR_SPAN;
}

/** Column c of a row when that column IS headed — the header name differs per tab, so the lookup
 * goes through the layout rather than through a letter. */
function advColumnAt_(r, c, layout) {
  const order = layout.campaign_before_item
    ? [layout.title_key, layout.campaign_header, layout.item_header, layout.decision_header, layout.reason_header]
    : [layout.title_key, layout.item_header, layout.campaign_header, layout.decision_header, layout.reason_header];
  const key = order[c - 1];
  return key ? advPick_(r, key) : '';
}

function advPick_(rec, key) {
  if (!key) return '';
  if (Object.prototype.hasOwnProperty.call(rec, key)) return rec[key];
  const want = advNorm_(key);
  const keys = Object.keys(rec);
  for (let i = 0; i < keys.length; i++) if (advNorm_(keys[i]) === want) return rec[keys[i]];
  return '';
}

// ---------- §8.7 + §14 the campaign change ----------
function actionSetCampaign_(payload, ctx) {
  if (!advMayChangeCampaign_(ctx)) throw new Error('not allowed to change a campaign');
  const account = advAccount_(payload.account);
  const itemId = advItemId_(payload.item_id);
  const campaign = advCampaign_(payload.campaign);
  const note = advText_(payload.comment, 500);
  // Validated BEFORE anything is written: a bad PPC field must never surface after the Main Sheet
  // row has already changed, when the throw would lose the log line and both notifications.
  const ppcSpec = advPpcSpec_(payload.ppc);

  const before = advMainSheetRow_(account, itemId);
  if (!before.ok) return { account: account, item_id: itemId, changed: false, sheet: before };
  const old = String(before.campaign || '');

  if (advNorm_(old) === advNorm_(campaign)) {
    return {
      account: account, item_id: itemId, changed: false, already_set: true,
      campaign: old, current_campaign: before.current_campaign, row: before.row,
    };
  }

  let write = { ok: false, reason: 'not connected yet' };
  if (typeof bridgeUpdateRow_ === 'function') {
    const values = {};
    values[ADV_CAMPAIGN_COL] = campaign;
    // '↳' variation sub-rows repeat the parent's eBay Item No, so the main row found above is
    // targeted explicitly — an unqualified match would be ambiguous and refuse to write.
    write = bridgeUpdateRow_(
      { scope: 'account', account: account, kind: 'central', tab: ADV_MAIN_SHEET_TAB, expect: ADV_MAIN_SHEET_COLS, row: before.row },
      'eBay Item No', itemId, values, ADV_CAMPAIGN_WHITELIST, ctx.ident.email);
  }
  if (!write || !write.ok) {
    logActivity_(ctx.ident.email, 'CAMPAIGN_SET_FAILED', account + '!' + itemId, old, campaign,
      String((write && write.reason) || 'not connected yet'));
    return { account: account, item_id: itemId, changed: false, sheet: write };
  }

  const targets = advCampaignTargets_(ctx);
  const stamp = now_();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    getPortalDb_(false).getSheetByName('CAMPAIGN_LOG').appendRow([
      stamp, account, itemId, old, campaign, ctx.ident.email, targets.labels.join(', '),
    ]);
  } finally { lock.releaseLock(); }

  logActivity_(ctx.ident.email, 'CAMPAIGN_SET', account + '!' + itemId, old, campaign,
    targets.direction + (note ? ' · ' + note : '') + (write.shadow ? ' · pilot gate: live sheet not written' : ''));

  const ppc = advRecordPpcDecision_(account, itemId, before, ppcSpec, ctx);

  const advTitle = String(before && before.listing_title || '').slice(0, 55);
  const message = '🟠 Campaign changed by ' + ctx.user.name + ' · ' + account + ' · ' + itemId +
    (advTitle ? ' · ' + advTitle : '') + ' — ' + (old || 'no campaign') + ' → ' + campaign + '.' +
    (note ? ' Reason: ' + note + '.' : '') +
    ' Ad fees and visibility change from the next click.' +
    (write.shadow ? ' (Recorded in the portal — the live sheet write is held by the pilot gate.)' : '');
  // §14, both directions: a Management change reaches Zain, Zain's change reaches Management, and
  // a CS record-update reaches both.
  targets.emails.forEach(function (e) { notify_(e, 'Campaign changed', message, ADV_CAMPAIGN_REF + itemId); });
  if (targets.management) notifyManagement_('Campaign changed', message, ADV_CAMPAIGN_REF + itemId);

  return {
    account: account, item_id: itemId, changed: true, campaign: campaign, previous_campaign: old,
    current_campaign: before.current_campaign, listing_title: before.listing_title, row: before.row,
    shadow: !!write.shadow, sheet: write, notified_to: targets.labels, ppc: ppc,
    campaign_set_task: advCampaignTask_(itemId),
  };
}

/** §14 direction, decided by the actor's role — never by anything the browser posted (RL-1).
 * §4.3 gives the Team Lead the capability without naming a direction; both sides are told, which
 * is the only reading that leaves no one uninformed. */
function advCampaignTargets_(ctx) {
  const mgmt = isMgmt_(ctx.user.role, ctx.ident.email);
  const role = String(ctx.user.role || '');
  const emails = advAdvertisingEmails_(ctx.ident.email);
  // A Management change with no Advertising Manager on the books would otherwise be silent, so the
  // change still reaches Management — a campaign change is never recorded without a recipient.
  const toManagement = !mgmt || !emails.length;
  const labels = [];
  if (emails.length) labels.push('Advertising');
  if (toManagement) labels.push('Management');
  let direction = 'changed by Management → Advertising notified';
  if (role === 'Advertising Manager' && !mgmt) direction = 'changed by Advertising → Management notified';
  else if (role === 'CS') direction = 'CS record-update → Advertising and Management notified';
  else if (role === 'Team Lead' && !mgmt) direction = 'changed by the Team Lead → Advertising and Management notified';
  return { emails: emails, management: toManagement, labels: labels, direction: direction };
}

/** The open campaign_set task for this item, so the UI can send the operator to submit it. The
 * task's own status is not touched here — §8.0b makes approval the only path to Completed. */
function advCampaignTask_(itemId) {
  let hit = null;
  readTab_('TASKS').forEach(function (t) {
    if (hit) return;
    if (String(t.type || '') !== 'campaign_set') return;
    if (advDigits_(t.item_id) !== itemId) return;
    if (String(t.status || '') === TASK_STATUS_COMPLETED) return;
    hit = { task_id: String(t.task_id || ''), status: String(t.status || ''), assigned_to: String(t.assigned_to || '') };
  });
  return hit;
}

/** Optional companion write: the decision row on the account's PPC tab. It is an APPEND, always —
 * the tab's daily-batch convention is that each day's block restates the items, and an existing
 * row's free-text campaign name is the team's, never the portal's, to rewrite. */
function advRecordPpcDecision_(account, itemId, before, spec, ctx) {
  if (!spec) return null;
  if (typeof bridgeAppendRow_ !== 'function') return { ok: false, reason: 'not connected yet' };

  const read = advReadPpcTab_(account, 1);
  if (!read.ok) return { ok: false, reason: read.reason || 'not connected yet' };
  const layout = advPpcLayout_(read.headers);

  const values = {};
  if (layout.title_header) {
    // On the four blank-A1 tabs there is no header to write to, so the title is simply not written
    // — a column is never created to make room for it.
    const title = spec.listing_title || String(before.listing_title || '');
    if (title) values[layout.title_header] = title;
  }
  if (layout.campaign_header && spec.campaign) values[layout.campaign_header] = spec.campaign;
  if (layout.decision_header && spec.decision) values[layout.decision_header] = spec.decision;
  if (layout.reason_header && spec.reason_to_stop) values[layout.reason_header] = spec.reason_to_stop;
  if (layout.added_header && spec.added_in_another_campaign) values[layout.added_header] = spec.added_in_another_campaign;
  if (layout.past_header && spec.past_behaviour) values[layout.past_header] = spec.past_behaviour;
  if (layout.comment_header && spec.comment) values[layout.comment_header] = spec.comment;
  if (!Object.keys(values).length) return null;             // nothing to record beyond the item id
  if (layout.item_header) values[layout.item_header] = itemId;

  try {
    return bridgeAppendRow_(
      { scope: 'global', kind: 'ppc', tab: advPpcTabCandidates_(account), expect: ADV_PPC_HEADERS },
      values, ADV_PPC_HEADERS, ctx.ident.email);
  } catch (e) {
    logActivity_(ctx.ident.email, 'PPC_DECISION_FAILED', account + '!' + itemId, '', '', String((e && e.message) || e));
    return { ok: false, reason: 'ppc row not written' };
  }
}

/** The listing's main row on the Central Main Sheet: its campaign columns and its title. */
function advMainSheetRow_(account, itemId) {
  if (typeof bridgeReadRows_ !== 'function') return { ok: false, reason: 'not connected yet' };
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'central', tab: ADV_MAIN_SHEET_TAB,
    expect: ADV_MAIN_SHEET_COLS, limit: ADV_CENTRAL_SCAN,
  });
  if (!read || !read.ok) return { ok: false, reason: (read && read.reason) || 'not connected yet' };

  const want = advDigits_(itemId);
  let hit = null;
  read.rows.forEach(function (r) {
    if (hit) return;
    if (advDigits_(advPick_(r, 'eBay Item No')) !== want) return;
    // '↳' rows are the highest-priced variation of the row above and repeat its item number; the
    // listing's own campaign lives on the main row.
    if (String(advPick_(r, 'Listing Title')).charAt(0) === '↳') return;
    hit = r;
  });
  if (!hit) return { ok: false, reason: 'item not on the Main Sheet' };

  return {
    ok: true, row: hit._row,
    listing_title: advCellText_(advPick_(hit, 'Listing Title')),
    campaign: advCellText_(advPick_(hit, ADV_CAMPAIGN_COL)),
    current_campaign: advCellText_(advPick_(hit, ADV_CURRENT_CAMPAIGN_COL)),
  };
}

// ---------- §8.7 + §14 the Wrong Advertising alarms ----------
function actionWrongAdvertising_(payload, ctx) {
  if (!advMaySeeAlarms_(ctx)) throw new Error('management and advertising only');

  if (payload.acknowledge) return advAcknowledgeAlarm_(payload, ctx);

  const accounts = payload.account ? [advAccount_(payload.account)] : advAccounts_();
  let want = String(payload.status || '').trim().toUpperCase();
  if (want === 'ALL') want = '';
  if (want && ADV_ALARM_STATUSES.indexOf(want) < 0) throw new Error('unknown status filter');
  let limit = Number(payload.limit) || ADV_ALARM_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > ADV_ALARM_MAX) limit = ADV_ALARM_MAX;

  const scan = advScanAlarms_(accounts, limit);
  advRaiseAlarmSignals_(scan.alarms, ctx.ident.email);

  const signals = advSignalIndex_();
  const out = [];
  scan.alarms.forEach(function (a) {
    const sig = signals[a.signal_key] || null;
    a.signalled_at = sig ? String(sig.date_raised || '') : '';
    a.acknowledged_by = sig ? String(sig.acknowledged_by || '') : '';
    a.acknowledged = !!a.acknowledged_by;
    // §27: an unacknowledged signal stays pinned. The sheet's own RESOLVED closes it too.
    a.pinned = !a.acknowledged && !a.resolved_on_sheet;
    a.status_effective = a.resolved_on_sheet || a.acknowledged ? ADV_ALARM_RESOLVED : ADV_ALARM_OPEN;
    if (want && a.status_effective !== want) return;
    out.push(a);
  });

  return {
    alarms: stripForRole_(out, ctx.user.role, ctx.ident.email),
    count: out.length, accounts: scan.scanned, not_connected: scan.notConnected,
    open: out.filter(function (a) { return a.status_effective === ADV_ALARM_OPEN; }).length,
    statuses: ADV_ALARM_STATUSES, type: ADV_ALARM_TYPE,
  };
}

/** Time-driven twin of the read above: the alarms come to Management and Zain (§27) without anyone
 * having to open the screen. Safe to run repeatedly — SIGNALS keys make the raise once-only. */
function scanWrongAdvertising() {
  const scan = advScanAlarms_(advAccounts_(), ADV_ALARM_LIMIT);
  const raised = advRaiseAlarmSignals_(scan.alarms, 'system');
  return 'raised ' + raised.length + ' Wrong Advertising alarm(s) across ' + scan.scanned.length + ' account(s)';
}

function advScanAlarms_(accounts, limit) {
  const alarms = [], scanned = [], notConnected = [];
  const mainSheets = {};
  accounts.forEach(function (account) {
    const read = typeof bridgeReadRows_ === 'function'
      ? bridgeReadRows_({ scope: 'account', account: account, kind: 'central', tab: ADV_ALARM_TAB, expect: ADV_ALARM_COLS, limit: limit })
      : { ok: false, reason: 'not connected yet' };
    if (!read || !read.ok) {
      notConnected.push({ account: account, reason: (read && read.reason) || 'not connected yet' });
      return;
    }
    scanned.push(account);
    read.rows.forEach(function (r) {
      const type = advCellText_(advPick_(r, 'Type'));
      if (advNorm_(type) !== advNorm_(ADV_ALARM_TYPE)) return;
      alarms.push(advAlarmRecord_(account, r, mainSheets));
    });
  });
  return { alarms: alarms, scanned: scanned, notConnected: notConnected };
}

function advAlarmRecord_(account, r, mainSheets) {
  const itemId = advDigits_(advPick_(r, 'Item No'));
  const date = advCellText_(advPick_(r, 'Date'));
  const status = advCellText_(advPick_(r, 'Status'));
  let wants = advCellText_(advPick_(r, 'Manager wants'));
  let wantsSource = 'Wrong Advertising tab';
  // REALITY: 'Manager wants' is empty in all 52 live rows, so the manager's side of the alarm is
  // read (never written) from the Main Sheet's own campaign column instead.
  if (!wants && itemId) {
    if (mainSheets[account] === undefined) mainSheets[account] = advMainSheetIndex_(account);
    const hit = mainSheets[account][itemId];
    if (hit) { wants = hit.campaign; wantsSource = 'Main Sheet ' + ADV_CAMPAIGN_COL; }
  }
  return {
    account: account, row: r._row, date: date, type: ADV_ALARM_TYPE, item_id: itemId,
    listing_title: advCellText_(advPick_(r, 'Listing Title')),
    manager_wants: wants, manager_wants_source: wants ? wantsSource : '',
    live_on_ebay: advCellText_(advPick_(r, 'Live on eBay')),
    // Keys chosen to match PROFIT_FIELDS exactly so RL-4 stripping actually bites on them.
    'Raw Profit': advPick_(r, 'Raw profit £'),
    // The £2 CPC allowance behind this figure lives in the account's ⚙ Config; the sheet's own
    // number is reported and never recomputed.
    net_after_cpc: advPick_(r, 'Net after CPC £'),
    status: status,
    resolved_at: advCellText_(advPick_(r, 'Resolved')),
    resolved_on_sheet: advNorm_(status) === advNorm_(ADV_ALARM_RESOLVED),
    // A row on the Wrong Advertising tab is a HISTORY entry, not a live verdict: once the Main
    // Sheet was corrected the two sides agree, and an alarm saying "live: Campaign CPC · manager
    // wants: Campaign CPC" is noise that destroys trust in the whole Alerts centre. The alarm is
    // only live while the two sides genuinely differ.
    sides_agree: !!(wants && advCellText_(advPick_(r, 'Live on eBay')) &&
      advNorm_(wants) === advNorm_(advCellText_(advPick_(r, 'Live on eBay')))),
    signal_key: advSignalKey_(account, itemId, date),
  };
}

function advMainSheetIndex_(account) {
  const map = {};
  if (typeof bridgeReadRows_ !== 'function') return map;
  const read = bridgeReadRows_({
    scope: 'account', account: account, kind: 'central', tab: ADV_MAIN_SHEET_TAB,
    expect: ADV_MAIN_SHEET_COLS, limit: ADV_CENTRAL_SCAN,
  });
  if (!read || !read.ok) return map;
  read.rows.forEach(function (r) {
    if (String(advPick_(r, 'Listing Title')).charAt(0) === '↳') return;
    const id = advDigits_(advPick_(r, 'eBay Item No'));
    if (!id || map[id]) return;
    map[id] = {
      campaign: advCellText_(advPick_(r, ADV_CAMPAIGN_COL)),
      current_campaign: advCellText_(advPick_(r, ADV_CURRENT_CAMPAIGN_COL)),
    };
  });
  return map;
}

/** New alarms land in SIGNALS once and reach Management and Zain once (§14). The index is re-read
 * inside the lock so two concurrent readers cannot both raise the same alarm. */
function advRaiseAlarmSignals_(alarms, actor) {
  const fresh = [];
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const seen = advSignalIndex_();
    const sh = getPortalDb_(false).getSheetByName('SIGNALS');
    alarms.forEach(function (a) {
      if (a.resolved_on_sheet || !a.signal_key || seen[a.signal_key]) return;
      const rec = {
        date: a.date, account: a.account, item_id: a.item_id, type: ADV_SIGNAL_TYPE,
        value: a.net_after_cpc, baseline: a['Raw Profit'],
        targeted_roles: ADV_SIGNAL_ROLES, acknowledged_by: '',
      };
      sh.appendRow(DB_TABS.SIGNALS.map(function (c) { return rec[c] === undefined ? '' : rec[c]; }));
      seen[a.signal_key] = { acknowledged_by: '' };
      fresh.push(a);
    });
  } finally { lock.releaseLock(); }

  // logActivity_ takes the same script lock, so nothing below may run while holding it.
  if (!fresh.length) return fresh;
  const advertising = advAdvertisingEmails_('');
  fresh.slice(0, ADV_ALARM_NOTIFY_MAX).forEach(function (a) {
    const msg = '🔴 Wrong advertising · ' + a.account + ' · ' + a.item_id
      + ' — running on eBay as ' + (a.live_on_ebay || 'unknown')
      + (a.manager_wants ? ' but the manager decided ' + a.manager_wants : ' with no decision recorded')
      + '. Every sale pays the wrong fee until it is fixed → open Wrong advertising and clear it.';
    notifyManagement_('Wrong Advertising ALARM', msg, ADV_ALARM_REF + a.signal_key);
    advertising.forEach(function (e) { notify_(e, 'Wrong Advertising ALARM', msg, ADV_ALARM_REF + a.signal_key); });
    logActivity_(actor, 'WRONG_ADVERTISING_ALARM', a.account + '!' + a.item_id, '', a.live_on_ebay, a.date);
  });
  if (fresh.length > ADV_ALARM_NOTIFY_MAX) {
    const extra = fresh.length - ADV_ALARM_NOTIFY_MAX;
    const msg = '🔴 ' + extra + ' more wrong-advertising alarms are open beyond the ones just sent — each is paying the wrong fee right now → open Wrong advertising and work through the list.';
    notifyManagement_('Wrong Advertising ALARM', msg, ADV_ALARM_REF + 'batch');
    advertising.forEach(function (e) { notify_(e, 'Wrong Advertising ALARM', msg, ADV_ALARM_REF + 'batch'); });
    logActivity_(actor, 'WRONG_ADVERTISING_ALARM_BATCH', 'SIGNALS', '', String(fresh.length), 'notified ' + ADV_ALARM_NOTIFY_MAX + ' individually');
  }
  return fresh;
}

/** Resolve tracking lives here and nowhere else: the alarm's own Status and Resolved cells belong
 * to the business (§8.7 surfaces that tab read-only), so the portal records who cleared it in the
 * SIGNALS row instead — appended, never overwritten, so the trail keeps every acknowledgement. */
function advAcknowledgeAlarm_(payload, ctx) {
  const account = advAccount_(payload.account);
  const itemId = advItemId_(payload.item_id);
  const date = advText_(payload.date, 60);
  const key = advSignalKey_(account, itemId, date);
  const note = advText_(payload.note, 500);

  const sh = getPortalDb_(false).getSheetByName('SIGNALS');
  let old = '', next = '', row = 0;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const vals = sh.getDataRange().getValues();
    const head = vals[0].map(function (h) { return String(h); });
    const col = advSignalCol_(head, 'acknowledged_by');
    for (let i = 1; i < vals.length && !row; i++) {
      const rec = {};
      head.forEach(function (h, c) { rec[h] = vals[i][c]; });
      if (advNorm_(rec.type) !== advNorm_(ADV_SIGNAL_TYPE)) continue;
      if (advSignalKey_(rec.account, rec.item_id, rec.date) !== key) continue;
      row = i + 1;
      old = String(rec.acknowledged_by || '');
      next = (old ? old + ' | ' : '') + ctx.ident.email + ' @ ' + now_() + (note ? ' — ' + note : '');
      sh.getRange(row, col).setValue(next);
    }
  } finally { lock.releaseLock(); }

  if (!row) throw new Error('alarm not found');
  logActivity_(ctx.ident.email, 'WRONG_ADVERTISING_RESOLVED', account + '!' + itemId, old, next, date);

  const msg = '🔵 Wrong-advertising alarm cleared by ' + ctx.user.name + ' · ' + account + ' · ' + itemId +
    (note ? ' — ' + note : '') + '. Alarm open → resolved; logged with name and time.';
  advAdvertisingEmails_(ctx.ident.email).forEach(function (e) { notify_(e, 'Wrong Advertising cleared', msg, ADV_ALARM_REF + key); });
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) notifyManagement_('Wrong Advertising cleared', msg, ADV_ALARM_REF + key);

  return { account: account, item_id: itemId, acknowledged: true, acknowledged_by: next, signal_key: key };
}

/** RL-6 column ownership on the portal's own SIGNALS tab: everything a scan writes is written once
 * at raise time, and the acknowledgement column is the only cell an action may touch afterwards. */
function advSignalCol_(head, name) {
  if (ADV_SIGNAL_WRITABLE_COLS.indexOf(name) < 0) throw new Error('write outside the SIGNALS whitelist: ' + name);
  const c = head.indexOf(name);
  if (c < 0) throw new Error('SIGNALS is missing column ' + name);
  return c + 1;
}

function advSignalIndex_() {
  const map = {};
  readTab_('SIGNALS').forEach(function (s) {
    if (advNorm_(s.type) !== advNorm_(ADV_SIGNAL_TYPE)) return;
    map[advSignalKey_(s.account, s.item_id, s.date)] = {
      acknowledged_by: String(s.acknowledged_by || ''),
      date_raised: String(s.date || ''),
      targeted_roles: String(s.targeted_roles || ''),
    };
  });
  return map;
}

/** The alarm's own timestamp is part of the key, so a second alarm on the same item later in the
 * day still raises. Sheets re-parses an appended timestamp string back into a Date, so both sides
 * of the comparison go through one canonical form — otherwise the same alarm would raise twice. */
function advSignalKey_(account, itemId, date) {
  return advNorm_(account) + '|' + advDigits_(itemId) + '|' + advDateKey_(date);
}

function advDateKey_(value) {
  const s = advCellText_(value).trim();
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(s);
  if (m) return m[1] + m[2] + m[3] + (m[4] ? m[4] + m[5] + m[6] : '000000');
  const d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Asia/Karachi', 'yyyyMMddHHmmss');
  return advNorm_(s);
}

// ---------- §8.5 the read-only management instructions feed ----------
/** Read-only by contract: Management writes these from their own version (§8.5, §26 addInstruction),
 * which appends to the PPC Central tab and to the portal INSTRUCTIONS tab. This action never writes. */
function actionInstructionsFeed_(payload, ctx) {
  if (!advMayReadPpc_(ctx)) throw new Error('advertising or management only');
  let limit = Number(payload.limit) || ADV_INSTRUCTIONS_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > ADV_ALARM_MAX) limit = ADV_ALARM_MAX;

  const read = typeof bridgeReadRows_ === 'function'
    ? bridgeReadRows_({
      scope: 'global', kind: 'ppc', tab: ADV_INSTRUCTIONS_TABS,
      expect: [ADV_INSTRUCTION_COL, ADV_INSTRUCTION_DATE_COL], limit: limit,
    })
    : { ok: false, reason: 'not connected yet' };

  const out = [], seen = {};
  const me = normalizeEmail(ctx.ident.email);

  readTab_('INSTRUCTIONS').forEach(function (r) {
    if (!r.instr_id) return;
    const dept = String(r.department || 'ALL');
    if (dept !== ADV_DEPT && dept !== 'ALL') return;
    if (!advActiveFlag_(r.active)) return;
    const text = advCellText_(r.instruction_text);
    const n = advNorm_(text);
    if (!n) return;
    const acks = advAcks_(r.ack_log);
    seen[n] = true;
    out.push({
      instr_id: String(r.instr_id), instruction: text, date: advCellText_(r.date),
      department: dept, given_by: String(r.given_by || ''), source: 'portal',
      acknowledged: !!acks[me], acknowledged_at: acks[me] ? String(acks[me].at || '') : '',
      isNew: !acks[me],
    });
  });

  if (read && read.ok) {
    read.rows.forEach(function (r) {
      const text = advCellText_(advPick_(r, ADV_INSTRUCTION_COL));
      const n = advNorm_(text);
      if (!n || seen[n]) return;
      seen[n] = true;
      out.push({
        instr_id: '', instruction: text, date: advCellText_(advPick_(r, ADV_INSTRUCTION_DATE_COL)),
        department: ADV_DEPT, given_by: '', source: 'PPC Central', row: r._row,
        acknowledged: false, acknowledged_at: '', isNew: false,
      });
    });
  }

  out.sort(function (a, b) {
    const x = advDateMs_(a.date), y = advDateMs_(b.date);
    if (x === y) return 0;
    return (isNaN(y) ? -1 : y) - (isNaN(x) ? -1 : x);
  });

  return {
    instructions: stripForRole_(out, ctx.user.role, ctx.ident.email),
    count: out.length, department: ADV_DEPT, read_only: true,
    tab: read && read.ok ? read.tab : '',
    connected: !!(read && read.ok), reason: read && read.ok ? '' : (read && read.reason) || 'not connected yet',
    unacknowledged: out.filter(function (i) { return i.isNew; }).length,
  };
}

function advAcks_(raw) {
  try {
    const parsed = JSON.parse(String(raw || '{}'));
    return parsed && typeof parsed.acks === 'object' && parsed.acks ? parsed.acks : {};
  } catch (e) { return {}; }
}

function advActiveFlag_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  return s === '' || s === 'true' || s === 'yes' || s === '1';
}

// ---------- people and accounts ----------
function advAdvertisingEmails_(skipEmail) {
  const skip = normalizeEmail(skipEmail || '');
  const seen = {}, out = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.role || '') !== 'Advertising Manager') return;
    if (String(u.status) !== 'approved') return;
    const n = normalizeEmail(u.email);
    if (!n || n === skip || seen[n]) return;
    seen[n] = true;
    out.push(String(u.email));
  });
  return out;
}

/** §3: accounts are rows in CONNECTIONS, never hardcoded — the registry's own spelling is kept so
 * tab resolution downstream sees the name the business uses. */
function advAccounts_() {
  const seen = {}, out = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.scope || '').trim() !== 'account') return;
    const name = String(c.account_name || '').trim();
    const n = advNorm_(name);
    if (!n || seen[n]) return;
    seen[n] = true;
    out.push(name);
  });
  return out;
}

function advAccount_(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 120) throw new Error('account required');
  const known = advAccounts_();
  if (!known.length) return raw;                      // §6: a portal without a registry yet still works
  const want = advNorm_(raw);
  for (let i = 0; i < known.length; i++) if (advNorm_(known[i]) === want) return known[i];
  throw new Error('unknown account');
}

// ---------- field validation ----------
function advCampaign_(value) {
  const want = advNorm_(value);
  if (!want) throw new Error('campaign required');
  for (let i = 0; i < ADV_CAMPAIGNS.length; i++) {
    if (advNorm_(ADV_CAMPAIGNS[i]) === want) return ADV_CAMPAIGNS[i];
  }
  throw new Error('campaign must be one of the Main Sheet values');
}

/** The optional PPC decision row, validated up front. Decision, reason, past behaviour and the
 * campaign name are free text on these tabs — only column F carries a real dropdown. */
function advPpcSpec_(spec) {
  if (!spec || typeof spec !== 'object') return null;
  const out = {
    listing_title: advText_(spec.listing_title, 300),
    campaign: advText_(spec.campaign, 200),
    decision: advText_(spec.decision, 200),
    reason_to_stop: advText_(spec.reason_to_stop, 500),
    added_in_another_campaign: '',
    past_behaviour: advText_(spec.past_behaviour, 300),
    comment: advText_(spec.comment, ADV_MAX_TEXT),
  };
  if (spec.added_in_another_campaign !== undefined && String(spec.added_in_another_campaign) !== '') {
    out.added_in_another_campaign = advAddedValue_(spec.added_in_another_campaign);
  }
  return out;
}

function advAddedValue_(value) {
  const want = advNorm_(value);
  for (let i = 0; i < ADV_ADDED_VALUES.length; i++) {
    if (advNorm_(ADV_ADDED_VALUES[i]) === want) return ADV_ADDED_VALUES[i];
  }
  throw new Error('added_in_another_campaign must be Yes, No or pending');
}

function advItemId_(value) {
  const s = advDigits_(value);
  if (!/^\d{9,15}$/.test(s)) throw new Error('invalid item_id');
  return s;
}

/** Item numbers sit in these sheets as text in some rows and as floats in others. */
function advDigits_(value) {
  if (typeof value === 'number') return isFinite(value) ? String(Math.round(value)) : '';
  return String(value === null || value === undefined ? '' : value).trim().replace(/\s/g, '').replace(/\.0+$/, '');
}

function advCellText_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Karachi', 'yyyy-MM-dd HH:mm:ss');
  return String(v);
}

const ADV_CTRL_RE = new RegExp('[\\u0000-\\u0009\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

function advText_(v, max) {
  return advCellText_(v).replace(ADV_CTRL_RE, '').trim().slice(0, max || ADV_MAX_TEXT);
}

function advNorm_(s) {
  if (s === null || s === undefined) return '';
  // A cell read straight from the Portal DB can still be a Date where the same value arrived from
  // SheetBridge as text; both must fold identically or a comparison silently fails.
  const raw = s instanceof Date ? advCellText_(s) : String(s);
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Alarm dates render 'm/d/yyyy h:mm:ss' on the sheet and come back from SheetBridge as
 * 'yyyy-MM-dd HH:mm:ss'; anything unparseable sorts last rather than being corrected. */
function advDateMs_(value) {
  const raw = advCellText_(value).trim();
  if (!raw) return NaN;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return new Date(raw.replace(' ', 'T') + (raw.length <= 10 ? 'T00:00:00' : '')).getTime();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

/* ---------- V2 req 29: 7-day zero-sales sweep (daily trigger: runZeroSalesSweep) ----------
 * The PPC tab's own 'Past behaviour (7 days)' column IS the seven-day sales figure, so an item
 * in a General campaign showing 0 there has had its week and sold nothing. One revision task per
 * item goes to the current lister-module holder; an open task on the same item blocks a repeat,
 * so nobody gets the same item twice while they work on it. */
function runZeroSalesSweep() {
  const holders = usersWithModule_('listing', ['Listing Manager', 'Item Lister']);
  if (!holders.length) {
    notifyManagement_('Task assigned', '🔴 Zero-sales sweep found nobody holding the listing module — grant it on the Access desk.', 'zerosales:noholder');
    return 'no lister-module holder';
  }
  const open = {};
  readTab_('TASKS').forEach(function (t) {
    if (String(t.type) !== 'listing_revision') return;
    if (String(t.status) === TASK_STATUS_COMPLETED) return;
    const id = String(t.item_id || '').trim();
    if (id) open[id] = true;
  });

  let made = 0, scanned = 0;
  (connectionHealth().perAccount || []).forEach(function (a) {
    const account = String(a.account || '');
    const read = advReadPpcTab_(account, ADV_ALARM_MAX);
    if (!read.ok) return;
    const layout = advPpcLayout_(read.headers);
    (read.rows || []).forEach(function (r) {
      const rec = advPpcRow_(r, layout, '');
      if (!rec.item_id || open[rec.item_id]) return;
      if (!/general/i.test(rec.campaign)) return;
      const past = String(rec.past_behaviour || '').replace(/[^\d.]/g, '');
      if (past === '' || Number(past) !== 0) return;
      scanned++;
      if (made >= 15) return;                                   // a drip, not a flood — next run takes more
      const stamp = now_();
      const taskId = 'T' + Utilities.getUuid().slice(0, 8);
      const due = Utilities.formatDate(new Date(Date.now() + 48 * 3600000), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ssXXX");
      tasksSheet_().appendRow([
        taskId, 'listing_revision', account, rec.item_id,
        'Zero sales in 7 days — ' + (rec.listing_title || rec.item_id).slice(0, 80),
        'Selected for revision by the automated system: 7 days in a General campaign with 0 sales. Revise the title, price or photos — or recommend removal.',
        '', 'system:zero-sales', holders[0], '', due, TASK_STATUS_PENDING, stamp, stamp, '', '', '', '', '',
      ]);
      open[rec.item_id] = true;
      made++;
      notify_(holders[0], 'Task assigned',
        '🟠 Zero sales in 7 days · ' + account + ' · ' + rec.item_id +
        (rec.listing_title ? ' · ' + rec.listing_title.slice(0, 55) : '') +
        ' — a week in a General campaign and nothing sold; it is paying listing space for nothing. Revise it or recommend removal, due in 48h → open My tasks.',
        'zerosales:' + rec.item_id);
      logActivity_('system', 'ZERO_SALES_TASK', taskId, '', rec.item_id, account);
    });
  });
  logActivity_('system', 'ZERO_SALES_SWEEP', 'PPC', '', made + ' task(s)', scanned + ' candidate(s)');
  return made + ' task(s) created from ' + scanned + ' zero-sales candidate(s)';
}

const ACTIONS_ADVERTISING = {
  ppcTable:         [actionPpcTable_, 'any'],
  setCampaign:      [actionSetCampaign_, 'any'],
  wrongAdvertising: [actionWrongAdvertising_, 'any'],
  instructionsFeed: [actionInstructionsFeed_, 'any'],
};
