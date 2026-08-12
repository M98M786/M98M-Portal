/** Phase 4 — CPC RESEARCH WORKSPACE (§8.3) and the KEYWORD APPROVAL LOOP (§8, §8.0b, §14).
 * cpc_research task → the lister fills Hamza's research columns → SUBMIT (never self-complete)
 * → Zain (Advertising Manager) or Management approve the keywords/working, or RETURN with a
 * mandatory comment that reaches the lister attached to the notification (§14).
 *
 * SCHEMA IS REALITY, NOT §8.3. The live "Hamza CPC research" sheet (REALITY-MAP key_data
 * `cpc_headers_row1_exact`) carries 23 columns A–W. Spec drift, reality wins: there is NO
 * 'Sold Total 30d' column, there is ONE 'Main Image Link ' rather than 1–4, and there is no
 * 'User-manual Image'; 'Total Sold History 1d/7d' is two columns; R is 'New title Search
 * Results' not 'Final title Search Results'; 'Duplicat Image' and 'Recomendation' are the
 * sheet's own spellings; C is literally 'Dates To \nRevisit\n72/Hrs'. Headers are addressed
 * through SheetBridge's fold, so the older per-account tab that still carries 'Main Image
 * Link 1–4' simply reports the absent headers as skippedMissing — the portal never adds,
 * renames or reorders a column (the Sheet Contract).
 */

const CPC_TASK_TYPE = 'cpc_research';

// Live tab names, most-real first. 'Hamza-CPC new Listing' is the per-account central tab;
// the standalone research workbook keeps the same header row on its single tab.
const CPC_RESEARCH_TABS = ['Hamza-CPC new Listing', 'Hamza-CPC Listing', 'Hamza CPC research'];
const CPC_COMPETITOR_TABS = ['Hamza-  Competitior List', 'Hamza- Competitor List'];

// Dropdown A3:A27 on the live sheet. A2 carries the legacy 'Pending / Listing Done ' pair,
// but data starts at row 3 (row 2 is an intentional blank spacer), so A3:A27 is the vocabulary.
const CPC_LISTING_STATUS = ['Live', 'Draft', 'Pending'];

// Reality: the data-validation on U2:U1000 is this CPC status list even though U's header reads
// 'Final description Page Link'. Both a link and one of these values are accepted so a strict
// validation on the live sheet can never reject the portal's write. Trailing spaces are the
// sheet's own.
const CPC_U_STATUS = ['CPC Update For Zain ', 'Added In General ', 'Added in CPC ', 'Added in CPC with Price increase '];

/** §8.0 (Organizational Structure v1.2) — UK clock, stored as absolute ISO with its real offset.
 * Day 0 live 7:00 PM UK · day 3 revision 1:00–5:00 PM UK · day 3 campaign testing 5:00–10:00 PM UK. */
const CPC_UK_TZ = 'Europe/London';
const CPC_PKT_TZ = 'Asia/Karachi';
const CPC_WINDOWS = [
  { key: 'listing_live_uk', day: 0, from: [19, 0], to: [19, 0], label: '7:00 PM UK', who: 'Umar — dummy listing goes live' },
  { key: 'revision_72h_uk', day: 3, from: [13, 0], to: [17, 0], label: '1:00–5:00 PM UK', who: 'Umar — real revision, 72 hours later' },
  { key: 'campaign_testing_uk', day: 3, from: [17, 0], to: [22, 0], label: '5:00–10:00 PM UK', who: 'Zain — campaign testing window' },
];

/** The 23 real columns. `header` is byte-for-byte the sheet's header including embedded
 * newlines; `key` is the portal-side field name. E and F are =image() FORMULA columns (E is
 * driven by S 'Duplicate Image Link ', F by a Drive link) — the portal writes the link columns
 * and never the formula cells, and bridgeCellIn_ refuses a leading '=' regardless.
 * V's header carries a leading space before its newlines; REALITY-MAP quotes it to show that. */
const CPC_COLUMNS = [
  { key: 'listing_status', header: 'Listing Status', type: 'enum', options: CPC_LISTING_STATUS, writable: true },
  { key: 'date', header: 'Date', type: 'date', writable: true },
  { key: 'revisit_72h', header: 'Dates To \nRevisit\n72/Hrs', type: 'date', writable: true },
  { key: 'keywords_link_by_zain', header: 'Keywords Link \nProvided \nBy Zain', type: 'url', writable: true },
  { key: 'duplicate_image', header: 'Duplicat Image', type: 'formula', writable: false, note: '=image(S<row>) — rendered from Duplicate Image Link' },
  { key: 'product_main_image', header: 'product\nMain \nImage', type: 'formula', writable: false, note: '=IMAGE(drive link) — rendered from Main Image Link' },
  { key: 'item_id', header: 'Item ID', type: 'item_id', writable: true },
  { key: 'keywords', header: 'Keywords', type: 'lines', writable: true, required: true },
  { key: 'positive_keywords', header: 'Positive \nkeywords', type: 'lines', writable: true, required: true },
  { key: 'keywords_search_results', header: 'Keywords Listing\n Search results', type: 'count_lines', writable: true, note: "one '(3,400)' per keyword line" },
  { key: 'keywords_sell_through', header: 'Keywords \nSell Through rate', type: 'rate_lines', writable: true, note: "one '(23.70%)' per keyword line" },
  { key: 'avg_price_30d', header: 'Average \nprice\n30/days', type: 'number', writable: true },
  { key: 'avg_price_90d', header: 'Average \nprice\n90/days', type: 'number', writable: true },
  { key: 'sold_history_1d', header: 'Total Sold \nHistory 1 days\ntop keyword', type: 'int', writable: true },
  { key: 'sold_history_7d', header: 'Total Sold \nHistory 7 days\ntop keyword', type: 'int', writable: true },
  { key: 'duplicate_title', header: 'Duplicate title', type: 'text', writable: true },
  { key: 'final_title', header: 'Final Title', type: 'text', writable: true, required: true },
  { key: 'new_title_search_results', header: 'New title \nSearch Results', type: 'int', writable: true },
  { key: 'duplicate_image_link', header: 'Duplicate Image \nLink ', type: 'url', writable: true },
  { key: 'main_image_link', header: 'Main Image \nLink ', type: 'url', writable: true },
  { key: 'final_description_page_link', header: 'Final description \nPage Link', type: 'url_or_status', writable: true, options: CPC_U_STATUS },
  { key: 'product_idea_link', header: ' \nProduct Idea\nLink', type: 'url', writable: true },
  { key: 'recommendation', header: 'Recomendation', type: 'text', writable: true },
];

const CPC_HEADERS = CPC_COLUMNS.map(function (c) { return c.header; });
// RL-6 column ownership for the research tab: the two formula columns are excluded by construction.
const CPC_WRITE_WHITELIST = CPC_COLUMNS.filter(function (c) { return c.writable; }).map(function (c) { return c.header; });

/** Competitor list (§8.3, Central 'Hamza-  Competitior List'). Reality: the layout is our own
 * listing block + TWO competitor blocks (Main, Copy), not the three competitor blocks the spec
 * describes, separated by blank columns H/O/V with 'Ebay Store Link ' out at AB.
 * The blocks repeat identical headers — 'Edit Date' three times, 'Sale Price' three times,
 * 'List date ' and ' sales history' twice — so those columns CANNOT be addressed by name.
 * SheetBridge refuses an ambiguous header rather than guessing which block it means, so the
 * portal writes only the uniquely-named cells and reports the rest as blocked; they stay manual
 * until the header row is disambiguated, which the Sheet Contract forbids the portal from doing. */
const CPC_COMPETITOR_WRITE_MAP = {
  account: 'Account ',
  item_id: 'Item Id',
  product_name: 'product name ',
  sale_history: 'Sale History',
  main_competitor_store_link: 'Main Competitor store link',
  main_competitor_product_link: 'main Competitor product  link',
  main_competitor_start_date: 'Start Date ',
  copy_competitor_store_link: 'Copy Competitor store link',
  copy_competitor_product_link: 'Copy Competitor product  link',
  ebay_store_link: 'Ebay Store Link ',
};
const CPC_COMPETITOR_WRITE_WHITELIST = Object.keys(CPC_COMPETITOR_WRITE_MAP).map(function (k) { return CPC_COMPETITOR_WRITE_MAP[k]; });
const CPC_COMPETITOR_BLOCKED_KEYS = ['list_date', 'edit_date', 'sale_price',
  'main_competitor_edit_date', 'main_competitor_sale_price', 'main_competitor_sales_history',
  'copy_competitor_list_date', 'copy_competitor_edit_date', 'copy_competitor_sale_price', 'copy_competitor_sales_history'];
const CPC_COMPETITOR_AMBIGUOUS_HEADERS = ['List date ', 'Edit Date', 'Sale Price', ' sales history'];

const CPC_MAX_TEXT = 2000;
const CPC_MAX_LINES_TEXT = 4000;
const CPC_READ_LIMIT = 500;

// ---------- UK ↔ absolute time (§8.0) ----------
/** Minutes-east offset London is really on at that instant — DST comes from the tz database,
 * never from a hardcoded BST rule. */
function cpcTzOffsetMs_(instantMs, tz) {
  const z = Utilities.formatDate(new Date(instantMs), tz, 'Z');       // '+0100'
  const sign = z.charAt(0) === '-' ? -1 : 1;
  return sign * ((Number(z.substr(1, 2)) * 60 + Number(z.substr(3, 2))) * 60000);
}

/** The absolute instant of a London WALL time. Two passes settle the DST boundary: the first
 * guess uses the offset in force at the UTC reading, the second the offset at that instant. */
function cpcLondonInstant_(y, m, d, hh, mm) {
  const base = Date.UTC(y, m - 1, d, hh, mm, 0);
  const first = base - cpcTzOffsetMs_(base, CPC_UK_TZ);
  return base - cpcTzOffsetMs_(first, CPC_UK_TZ);
}

function cpcIsoIn_(instantMs, tz) {
  const d = new Date(instantMs);
  const z = Utilities.formatDate(d, tz, 'Z');
  return Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ss") + z.slice(0, 3) + ':' + z.slice(3);
}

/** {y,m,d} from an ISO date, the sheet's mm-dd-yyyy, or a Date; null when unreadable. */
function cpcDateParts_(value) {
  if (value instanceof Date) {
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
  }
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);                        // cpc_date_format mm-dd-yyyy
  if (m) return { y: Number(m[3]), m: Number(m[1]), d: Number(m[2]) };
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;
  return { y: parsed.getFullYear(), m: parsed.getMonth() + 1, d: parsed.getDate() };
}

function cpcTodayPkt_() {
  return cpcDateParts_(Utilities.formatDate(new Date(), CPC_PKT_TZ, 'yyyy-MM-dd'));
}

/** Day 0 = the research date. Every §8.0 window is returned in UK wall time AND in PKT, plus the
 * absolute instant, so a Lahore staff member and a UK clock never disagree about the same moment. */
function cpcTimingWindows_(dayZero) {
  const base = dayZero || cpcTodayPkt_();
  return CPC_WINDOWS.map(function (w) {
    const from = cpcLondonInstant_(base.y, base.m, base.d + w.day, w.from[0], w.from[1]);
    const to = cpcLondonInstant_(base.y, base.m, base.d + w.day, w.to[0], w.to[1]);
    return {
      key: w.key, label: w.label, who: w.who, day_offset: w.day,
      start_uk: cpcIsoIn_(from, CPC_UK_TZ), end_uk: cpcIsoIn_(to, CPC_UK_TZ),
      start_pkt: cpcIsoIn_(from, CPC_PKT_TZ), end_pkt: cpcIsoIn_(to, CPC_PKT_TZ),
      start_ms: from, end_ms: to,
    };
  });
}

function cpcWindow_(windows, key) {
  for (let i = 0; i < windows.length; i++) if (windows[i].key === key) return windows[i];
  return null;
}

/** Dates land in the sheet as real date values, anchored at 12:00 UTC so no workbook timezone
 * can render the day before or after. The workbook's own mm-dd-yyyy format does the display. */
function cpcSheetDate_(parts) {
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 12, 0, 0));
}

// ---------- field validation ----------
function cpcText_(value, max) {
  const s = String(value === null || value === undefined ? '' : value).replace(/\r\n/g, '\n').trim();
  if (s.length > (max || CPC_MAX_TEXT)) throw new Error('value too long');
  return s;
}

function cpcNumber_(value, field) {
  const s = cpcText_(value, 40).replace(/[£,\s]/g, '');
  if (!s) return '';
  const n = Number(s);
  if (!isFinite(n)) throw new Error('not a number: ' + field);
  return n;
}

function cpcInt_(value, field) {
  const n = cpcNumber_(value, field);
  if (n === '') return '';
  return Math.round(n);
}

/** RL-3: only http/https ever reaches a cell the portal renders back as a link. */
function cpcUrl_(value, field) {
  const s = cpcText_(value, CPC_MAX_TEXT);
  if (!s) return '';
  if (!/^https?:\/\/\S+$/i.test(s)) throw new Error('not an http(s) link: ' + field);
  return s;
}

function cpcEnum_(value, options, field) {
  const s = cpcText_(value, 120);
  if (!s) return '';
  for (let i = 0; i < options.length; i++) if (options[i].trim() === s.trim()) return options[i];
  throw new Error('value outside the sheet dropdown: ' + field);
}

/** Keyword blocks are newline-separated in the live sheet; blank lines are kept because the
 * 'Positive keywords' column really does carry trailing blanks. */
function cpcLines_(value) {
  return cpcText_(value, CPC_MAX_LINES_TEXT);
}

function cpcNonEmptyLines_(value) {
  return String(value === null || value === undefined ? '' : value).split('\n').filter(function (l) { return l.trim() !== ''; });
}

/** Sheet convention: '(3,400)' — a bare number typed by the lister is formatted into it, an
 * already-parenthesized value is left exactly as typed. */
function cpcCountLines_(value) {
  const lines = cpcLines_(value).split('\n');
  return lines.map(function (l) {
    const t = l.trim();
    if (!t || t.indexOf('(') >= 0) return l;
    const n = Number(t.replace(/,/g, ''));
    if (!isFinite(n)) return l;
    return '(' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ')';
  }).join('\n');
}

/** Sheet convention: '(23.70%)'. */
function cpcRateLines_(value) {
  const lines = cpcLines_(value).split('\n');
  return lines.map(function (l) {
    const t = l.trim();
    if (!t || t.indexOf('(') >= 0) return l;
    const n = Number(t.replace(/%/g, ''));
    if (!isFinite(n)) return l;
    return '(' + n.toFixed(2) + '%)';
  }).join('\n');
}

function cpcColumn_(key) {
  for (let i = 0; i < CPC_COLUMNS.length; i++) if (CPC_COLUMNS[i].key === key) return CPC_COLUMNS[i];
  return null;
}

/** payload.research {key: value} → {header: value} ready for SheetBridge, plus warnings.
 * Unknown keys are rejected outright: an unknown key here means an invented column. */
function cpcValidateResearch_(research, dayZero) {
  const src = research || {};
  const values = {}, warnings = [], given = {};

  Object.keys(src).forEach(function (k) {
    const col = cpcColumn_(k);
    if (!col) throw new Error('unknown research field: ' + k);
    if (!col.writable) throw new Error('column is written by the sheet itself: ' + col.header);
    let v = src[k];
    switch (col.type) {
      case 'enum': v = cpcEnum_(v, col.options, col.header); break;
      case 'date': {
        const p = cpcDateParts_(v);
        if (v !== '' && v !== null && v !== undefined && !p) throw new Error('unreadable date: ' + col.header);
        v = p ? cpcSheetDate_(p) : '';
        break;
      }
      case 'url': v = cpcUrl_(v, col.header); break;
      case 'url_or_status': {
        const t = cpcText_(v, CPC_MAX_TEXT);
        if (t && !/^https?:\/\//i.test(t)) v = cpcEnum_(t, col.options, col.header);
        else v = t;
        break;
      }
      case 'item_id': v = taskItemId_(v); break;
      case 'number': v = cpcNumber_(v, col.header); break;
      case 'int': v = cpcInt_(v, col.header); break;
      case 'lines': v = cpcLines_(v); break;
      case 'count_lines': v = cpcCountLines_(v); break;
      case 'rate_lines': v = cpcRateLines_(v); break;
      default: v = cpcText_(v, CPC_MAX_TEXT);
    }
    given[k] = v;
    if (v !== '') values[col.header] = v;
  });

  CPC_COLUMNS.forEach(function (c) {
    if (c.required && !String(given[c.key] === undefined ? '' : given[c.key]).trim()) {
      throw new Error('required before submission: ' + c.header.replace(/\n/g, ' '));
    }
  });

  if (!Object.prototype.hasOwnProperty.call(given, 'date')) {
    values[cpcColumn_('date').header] = cpcSheetDate_(dayZero);
  }
  if (!Object.prototype.hasOwnProperty.call(given, 'revisit_72h')) {
    const w = cpcWindow_(cpcTimingWindows_(dayZero), 'revision_72h_uk');
    values[cpcColumn_('revisit_72h').header] = cpcSheetDate_(cpcDateParts_(w.start_uk));
  }

  // Reality: J and K carry one parenthesized value per keyword line, aligned 1:1 with H.
  const kw = cpcNonEmptyLines_(given.keywords).length;
  const res = cpcNonEmptyLines_(given.keywords_search_results).length;
  const str = cpcNonEmptyLines_(given.keywords_sell_through).length;
  if (res && res !== kw) warnings.push('Keywords Listing Search results has ' + res + ' lines for ' + kw + ' keywords');
  if (str && str !== kw) warnings.push('Keywords Sell Through rate has ' + str + ' lines for ' + kw + ' keywords');

  return { values: values, given: given, warnings: warnings };
}

// ---------- sheet access ----------
function cpcResearchSpec_(account) {
  return { scope: 'account', account: account, kind: 'central', tab: CPC_RESEARCH_TABS, expect: CPC_HEADERS };
}

function cpcCompetitorSpec_(account) {
  return { scope: 'account', account: account, kind: 'central', tab: CPC_COMPETITOR_TABS, expect: Object.keys(CPC_COMPETITOR_WRITE_MAP).map(function (k) { return CPC_COMPETITOR_WRITE_MAP[k]; }) };
}

/** Header lookup that tolerates the whitespace drift between two copies of the same tab. */
function cpcPick_(rec, header) {
  if (rec && Object.prototype.hasOwnProperty.call(rec, header)) return rec[header];
  const want = bridgeNormalizeHeader_(header);
  const keys = Object.keys(rec || {});
  for (let i = 0; i < keys.length; i++) if (bridgeNormalizeHeader_(keys[i]) === want) return rec[keys[i]];
  return '';
}

function cpcRowToFields_(rec) {
  const out = {};
  CPC_COLUMNS.forEach(function (c) { out[c.key] = cpcPick_(rec, c.header); });
  return out;
}

/** The research row for this item on the live tab, or null. Item ID is the key; a task that has
 * no Item ID yet (the §8 new-listing CPC route) falls back to the Final Title. */
function cpcFindResearchRow_(account, itemId, finalTitle) {
  const read = bridgeReadRows_({ scope: 'account', account: account, kind: 'central', tab: CPC_RESEARCH_TABS, expect: CPC_HEADERS, limit: CPC_READ_LIMIT });
  if (!read.ok) return { ok: false, reason: read.reason };
  const wantId = String(itemId || '').trim();
  const wantTitle = bridgeNormalizeHeader_(finalTitle || '');
  let hit = null;
  read.rows.forEach(function (r) {
    if (hit) return;
    const id = String(cpcPick_(r, 'Item ID') || '').trim();
    if (wantId && id && bridgeMatchKey_(id) === bridgeMatchKey_(wantId)) hit = r;
    else if (!wantId && wantTitle && bridgeNormalizeHeader_(cpcPick_(r, 'Final Title')) === wantTitle) hit = r;
  });
  return { ok: true, tab: read.tab, row: hit, count: read.count };
}

// ---------- access ----------
function cpcIsKeywordApprover_(ctx) {
  return isMgmt_(ctx.user.role, ctx.ident.email) || ctx.user.role === 'Advertising Manager';
}

function cpcMaySeeWorkspace_(rec, ctx) {
  if (normalizeEmail(rec.assigned_to) === normalizeEmail(ctx.ident.email)) return true;
  if (cpcIsKeywordApprover_(ctx)) return true;
  return ctx.user.role === 'Listing Manager' || ctx.user.role === 'Team Lead';
}

/** accounts_access is a comma list when Management has scoped the person; the seed placeholders
 * ('per-role', 'ALL', empty) mean "not scoped yet" and do not restrict. */
function cpcAccountAllowed_(ctx, account) {
  if (isMgmt_(ctx.user.role, ctx.ident.email)) return true;
  const raw = String(ctx.user.accounts || '').trim();
  if (!raw || raw === 'ALL' || raw === 'per-role') return true;
  const want = bridgeNormalizeHeader_(account);
  if (!want) return false;
  return raw.split(',').some(function (a) {
    const have = bridgeNormalizeHeader_(a);
    return have !== '' && (have === want || have.indexOf(want) >= 0 || want.indexOf(have) >= 0);
  });
}

/** §8 designated approvers for keywords/working: Zain, else Management. */
function cpcKeywordApprovers_() {
  const out = [];
  readTab_('USERS').forEach(function (u) {
    if (String(u.status) !== 'approved') return;
    if (String(u.role) === 'Advertising Manager') out.push({ email: String(u.email), name: String(u.name || u.email), role: 'Advertising Manager' });
  });
  return out;
}

function cpcLoadTask_(taskId) {
  const sh = tasksSheet_();
  const found = taskFind_(sh, taskId);
  if (String(found.rec.type) !== CPC_TASK_TYPE) throw new Error('not a cpc_research task');
  found.sheet = sh;
  return found;
}

function cpcTaskCard_(rec) {
  return {
    task_id: String(rec.task_id || ''), type: String(rec.type || ''), account: String(rec.account || ''),
    item_id: String(rec.item_id || ''), title: String(rec.title || ''), details: String(rec.details || ''),
    comments: String(rec.comments || ''), status: String(rec.status || ''),
    assigned_by: String(rec.assigned_by || ''), assigned_to: String(rec.assigned_to || ''),
    deadline_pkt: taskPktIso_(rec.deadline_pkt), submitted_at: taskPktIso_(rec.submitted_at),
    submission_note: String(rec.submission_note || ''),
  };
}

/** "Keywords link provided by Zain" reaches the lister inside the task the approver wrote —
 * an explicitly labelled line wins, otherwise the first http(s) link in the task text. */
function cpcKeywordsLinkFromTask_(rec) {
  const text = String(rec.details || '') + '\n' + String(rec.comments || '');
  const labelled = text.match(/keywords?\s*(?:link|doc[^\n:]*)?\s*[:\-]\s*(https?:\/\/\S+)/i);
  if (labelled) return labelled[1];
  const any = text.match(/https?:\/\/\S+/);
  return any ? any[0] : '';
}

/** §9 context: the Potential-CPC nomination Zain submitted for this item, if there is one. */
function cpcPotentialRow_(account, itemId) {
  const wantId = String(itemId || '').trim();
  if (!wantId) return null;
  let hit = null;
  readTab_('POTENTIAL_CPC').forEach(function (r) {
    if (hit) return;
    if (bridgeMatchKey_(r.listing_item_id) !== bridgeMatchKey_(wantId)) return;
    if (account && bridgeNormalizeHeader_(r.account) !== bridgeNormalizeHeader_(account)) return;
    hit = {
      account: String(r.account || ''), status: String(r.status || ''), submitted_by: String(r.submitted_by || ''),
      listing_item_id: String(r.listing_item_id || ''), item_link: String(r.item_link || ''),
      date_listing_started: String(r.date_listing_started || ''), reason_for_selection: String(r.reason_for_selection || ''),
      comments: String(r.comments || ''), our_price: r.our_price, avg_sold_price: r.avg_sold_price,
      last30_link: String(r.last30_link || ''), last90_link: String(r.last90_link || ''),
      main_competitor: String(r.main_competitor || ''),
    };
  });
  return hit;
}

// ---------- §8.3 workspace ----------
function actionCpcWorkspace_(payload, ctx) {
  const found = cpcLoadTask_(payload.task_id);
  const rec = found.rec;
  if (!cpcMaySeeWorkspace_(rec, ctx)) throw new Error('not your task');

  const account = String(rec.account || '').trim();
  const itemId = String(rec.item_id || '').trim();
  const isAssignee = normalizeEmail(rec.assigned_to) === normalizeEmail(ctx.ident.email);
  const status = String(rec.status || '');

  const dayZero = cpcTodayPkt_();
  const windows = cpcTimingWindows_(dayZero);

  const prefill = {};
  CPC_COLUMNS.forEach(function (c) { prefill[c.key] = ''; });
  prefill.item_id = itemId;
  prefill.date = Utilities.formatDate(new Date(), CPC_PKT_TZ, 'yyyy-MM-dd');
  prefill.revisit_72h = String(cpcWindow_(windows, 'revision_72h_uk').start_uk).slice(0, 10);
  prefill.keywords_link_by_zain = cpcKeywordsLinkFromTask_(rec);

  // A returned task resumes from whatever already reached the live tab (§8.0b rework cycle).
  let sheet = { ok: false, reason: 'not connected yet' };
  const existing = cpcFindResearchRow_(account, itemId, '');
  if (existing.ok) {
    sheet = { ok: true, tab: existing.tab, row: existing.row ? existing.row._row : 0 };
    if (existing.row) {
      const fields = cpcRowToFields_(existing.row);
      Object.keys(fields).forEach(function (k) {
        const v = fields[k];
        if (v !== '' && v !== null && v !== undefined) prefill[k] = v;
      });
    }
  } else {
    sheet = { ok: false, reason: existing.reason || 'not connected yet' };
  }

  const columns = CPC_COLUMNS.map(function (c) {
    return {
      key: c.key, header: c.header, label: c.header.replace(/\s*\n\s*/g, ' ').trim(),
      type: c.type, writable: !!c.writable, required: !!c.required,
      options: c.options || null, note: c.note || '',
    };
  });

  const pipeline = cpcPotentialRow_(account, itemId);

  return {
    task: cpcTaskCard_(rec),
    can_edit: isAssignee && (status === TASK_STATUS_WORKING || status === TASK_STATUS_UPDATED),
    read_only_reason: isAssignee ? '' : 'you are viewing this workspace as an approver',
    schema: { columns: columns, listing_status: CPC_LISTING_STATUS, u_column_dropdown: CPC_U_STATUS },
    prefill: stripForRole_(prefill, ctx.user.role, ctx.ident.email),
    pipeline: pipeline ? stripForRole_(pipeline, ctx.user.role, ctx.ident.email) : null,
    sheet: sheet,
    timing: windows,
    approvers: cpcKeywordApprovers_(),
    competitor_tab: CPC_COMPETITOR_TABS[0],
  };
}

// ---------- §8.0b submission ----------
/** The lister SUBMITS; nothing here completes the task. The research is mirrored to the live tab
 * first so a rejected task never loses the lister's work, then the universal gate in Tasks.gs
 * moves the status — and the keyword approvers are notified on top of the assigner, because §8
 * designates Zain or Management for this gate rather than whoever raised the task. */
function actionSubmitCpcResearch_(payload, ctx) {
  const found = cpcLoadTask_(payload.task_id);
  const rec = found.rec;
  if (normalizeEmail(rec.assigned_to) !== normalizeEmail(ctx.ident.email)) throw new Error('not your task');
  const status = String(rec.status || '');
  if (status !== TASK_STATUS_WORKING && status !== TASK_STATUS_UPDATED) throw new Error('task is not in progress');

  const account = String(rec.account || '').trim();
  const dayZero = cpcDateParts_(payload.research && payload.research.date) || cpcTodayPkt_();
  const checked = cpcValidateResearch_(payload.research, dayZero);

  const itemId = String(checked.given.item_id || rec.item_id || '').trim();
  if (itemId) checked.values[cpcColumn_('item_id').header] = itemId;
  const finalTitle = String(checked.given.final_title || '');

  // Best-effort mirror: a live sheet that is not connected, or that refuses a cell, must not
  // strand a submission the employee has finished (§6 graceful degradation).
  let sheet = { ok: false, reason: 'not connected yet' };
  try {
    const target = cpcFindResearchRow_(account, itemId, finalTitle);
    if (target.ok && target.row) {
      const matchHeader = itemId ? 'Item ID' : 'Final Title';
      const matchValue = itemId || finalTitle;
      sheet = bridgeUpdateRow_(cpcResearchSpec_(account), matchHeader, matchValue, checked.values, CPC_WRITE_WHITELIST, ctx.ident.email);
    } else if (target.ok) {
      sheet = bridgeAppendRow_(cpcResearchSpec_(account), checked.values, CPC_WRITE_WHITELIST, ctx.ident.email);
    } else {
      sheet = { ok: false, reason: target.reason || 'not connected yet' };
    }
  } catch (err) {
    sheet = { ok: false, reason: 'sheet write refused', detail: String(err && err.message || err) };
    logActivity_(ctx.ident.email, 'CPC_SHEET_WRITE_FAILED', String(rec.task_id || ''), '', '', String(err && err.message || err));
  }

  const kwCount = cpcNonEmptyLines_(checked.given.keywords).length;
  const posCount = cpcNonEmptyLines_(checked.given.positive_keywords).length;
  const note = ['CPC research submitted for keyword approval.',
    'Final Title: ' + (finalTitle || '—'),
    'Keywords: ' + kwCount + ' · Positive keywords: ' + posCount,
    itemId ? 'Item ID: ' + itemId : 'Item ID: not listed yet',
    'Recommendation: ' + (String(checked.given.recommendation || '') || '—'),
    String(payload.submission_note || '').trim()].filter(function (l) { return l !== ''; }).join('\n');

  const submitted = actionSubmitTask_({ task_id: rec.task_id, submission_note: note, item_id: itemId || '' }, ctx);

  const approvers = cpcKeywordApprovers_();
  const assigner = normalizeEmail(rec.assigned_by);
  const msg = '🔵 CPC keywords ready for approval · ' + String(rec.account || '') + (String(rec.item_id || '') ? ' · ' + String(rec.item_id) : '') +
    ' — "' + (finalTitle || String(rec.title || '')).slice(0, 60) + '" by ' + ctx.user.name +
    '. The campaign cannot start until this is decided → open Keyword approvals.';
  approvers.forEach(function (a) {
    if (normalizeEmail(a.email) === assigner) return;                  // actionSubmitTask_ already told the assigner
    notify_(a.email, 'Keyword approval needed', msg, 'task:' + rec.task_id);
  });
  if (!approvers.length) notifyManagement_('Keyword approval needed', msg, 'task:' + rec.task_id);

  logActivity_(ctx.ident.email, 'SUBMIT_CPC_RESEARCH', String(rec.task_id || ''), '', TASK_STATUS_SUBMITTED,
    'account ' + (account || '—') + ' · item ' + (itemId || '—') + ' · sheet ' + (sheet.ok ? (sheet.shadow ? 'shadow' : 'written') : String(sheet.reason || 'not written')));

  return {
    task_id: rec.task_id, status: submitted.status, submitted_at: submitted.submitted_at,
    sheet: sheet, warnings: checked.warnings, awaiting: approvers.length ? approvers : 'Management',
  };
}

// ---------- §8 keyword / working approval ----------
function actionApproveKeywords_(payload, ctx) {
  if (!cpcIsKeywordApprover_(ctx)) throw new Error('keywords are approved by Zain or Management');
  let rec = null, stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = cpcLoadTask_(payload.task_id);
    rec = found.rec;
    const old = String(rec.status || '');
    if (old !== TASK_STATUS_SUBMITTED) throw new Error('task is not awaiting approval');
    stamp = now_();
    taskWrite_(found.sheet, found, { status: TASK_STATUS_COMPLETED, approved_by: ctx.ident.email, decided_at: stamp, updated_at: stamp });
    logActivity_(ctx.ident.email, 'APPROVE_KEYWORDS', rec.task_id, old, TASK_STATUS_COMPLETED,
      'lag_min ' + taskElapsedMin_(rec.submitted_at, taskMs_(stamp)));
  } finally { lock.releaseLock(); }

  const itemId = String(rec.item_id || '');
  notify_(rec.assigned_to, 'Keywords approved',
    '🔵 Your CPC keywords for "' + String(rec.title || '').slice(0, 60) + '"' + (itemId ? ' · ' + itemId : '') +
    ' — approved by ' + ctx.user.name + '. Zain sets the campaign next; nothing more on you.', 'task:' + rec.task_id);

  // §9: once the research is approved, Zain switches the campaign to CPC. Management approving
  // therefore has to reach Zain, and Zain approving has to reach Management (§14 cross-notify).
  const msg = '🟠 Keywords approved · ' + String(rec.account || '') + (itemId ? ' · ' + itemId : '') +
    ' — "' + String(rec.title || '').slice(0, 60) + '" cleared by ' + ctx.user.name +
    '. Next step: switch the campaign to CPC in the testing window.';
  if (ctx.user.role === 'Advertising Manager') {
    notifyManagement_('Keywords approved', msg, 'task:' + rec.task_id);
  } else {
    cpcKeywordApprovers_().forEach(function (a) { notify_(a.email, 'Keywords approved', msg, 'task:' + rec.task_id); });
  }
  return { task_id: rec.task_id, status: TASK_STATUS_COMPLETED, decided_at: stamp };
}

/** §14: the lister is notified WITH the comment attached — the comment is mandatory. */
function actionReturnKeywords_(payload, ctx) {
  if (!cpcIsKeywordApprover_(ctx)) throw new Error('keywords are approved by Zain or Management');
  const comment = String(payload.comment || '').trim();
  if (!comment) throw new Error('a comment is mandatory when returning keywords');

  let rec = null, stamp = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const found = cpcLoadTask_(payload.task_id);
    rec = found.rec;
    const old = String(rec.status || '');
    if (old !== TASK_STATUS_SUBMITTED) throw new Error('task is not awaiting approval');
    stamp = now_();
    const prior = String(rec.comments || '');
    const line = '[' + stamp + '] ' + ctx.user.name + ' returned the keywords: ' + comment.slice(0, 1000);
    taskWrite_(found.sheet, found, {
      comments: (prior ? prior + '\n' : '') + line,
      status: TASK_STATUS_WORKING, submitted_at: '', decided_at: stamp, updated_at: stamp,
    });
    logActivity_(ctx.ident.email, 'RETURN_KEYWORDS', rec.task_id, old, TASK_STATUS_WORKING, comment.slice(0, 200));
  } finally { lock.releaseLock(); }

  notify_(rec.assigned_to, 'Keywords returned',
    '🟠 "' + String(rec.title || '').slice(0, 60) + '"' + (String(rec.item_id || '') ? ' · ' + String(rec.item_id) : '') +
    ' — keywords returned by ' + ctx.user.name + '. Fix this first: ' + comment.slice(0, 500) + ' → open CPC research.', 'task:' + rec.task_id);
  return { task_id: rec.task_id, status: TASK_STATUS_WORKING, decided_at: stamp, comment: comment };
}

// ---------- §8.3 competitor list ----------
function cpcFindHeader_(headers, name) {
  for (let i = 0; i < headers.length; i++) if (String(headers[i]) === name) return i;
  const want = bridgeNormalizeHeader_(name);
  for (let i = 0; i < headers.length; i++) if (bridgeNormalizeHeader_(headers[i]) === want) return i;
  return -1;
}

/** Rebuilds the positional row from a bridgeReadRows_ record, using the same key rule the bridge
 * used: raw header, or 'col:<letter>' when the header is blank or already taken. The competitor
 * tab repeats 'Edit Date' and 'Sale Price', so the 2nd and 3rd copies only exist under their
 * positional keys — this is how the blocks are read back without losing a single cell. */
function cpcRowValues_(headers, rec) {
  const seen = { _row: true };
  const out = [];
  headers.forEach(function (h, i) {
    let key = bridgeNormalizeHeader_(h) ? String(h) : 'col:' + bridgeColLetter_(i + 1);
    if (seen[key]) key = 'col:' + bridgeColLetter_(i + 1);
    seen[key] = true;
    out.push(rec[key] === undefined ? '' : rec[key]);
  });
  return out;
}

function cpcBlockAt_(values, start, dateKey) {
  if (start < 0) return null;
  const block = {};
  block.store_link = values[start] === undefined ? '' : values[start];
  block.product_link = values[start + 1] === undefined ? '' : values[start + 1];
  block[dateKey] = values[start + 2] === undefined ? '' : values[start + 2];
  block.edit_date = values[start + 3] === undefined ? '' : values[start + 3];
  block.sale_price = values[start + 4] === undefined ? '' : values[start + 4];
  block.sales_history = values[start + 5] === undefined ? '' : values[start + 5];
  return block;
}

function cpcCompetitorRow_(headers, rec) {
  const v = cpcRowValues_(headers, rec);
  const nameAt = cpcFindHeader_(headers, 'product name ');
  const own = {
    account: v[cpcFindHeader_(headers, 'Account ')] || '',
    item_id: v[cpcFindHeader_(headers, 'Item Id')] || '',
    product_name: nameAt >= 0 ? v[nameAt] : '',
    list_date: nameAt >= 0 ? (v[nameAt + 1] || '') : '',
    edit_date: nameAt >= 0 ? (v[nameAt + 2] || '') : '',
    sale_price: nameAt >= 0 ? (v[nameAt + 3] || '') : '',
    sale_history: nameAt >= 0 ? (v[nameAt + 4] || '') : '',
  };
  return {
    _row: rec._row,
    own: own,
    main_competitor: cpcBlockAt_(v, cpcFindHeader_(headers, 'Main Competitor store link'), 'start_date'),
    copy_competitor: cpcBlockAt_(v, cpcFindHeader_(headers, 'Copy Competitor store link'), 'list_date'),
    ebay_store_link: v[cpcFindHeader_(headers, 'Ebay Store Link ')] || '',
  };
}

/** mode 'read' (default) or 'save'. Saving writes ONLY the uniquely-named columns; the repeated
 * date/price/history headers are returned as `blocked` with the reason, never guessed. */
function actionCompetitorList_(payload, ctx) {
  const account = String(payload.account || '').trim();
  if (!account) throw new Error('account required');
  if (!cpcAccountAllowed_(ctx, account)) throw new Error('no access to this account');

  const mode = String(payload.mode || 'read').trim();
  if (mode !== 'read' && mode !== 'save') throw new Error('unknown mode');

  const blocked = {
    keys: CPC_COMPETITOR_BLOCKED_KEYS, headers: CPC_COMPETITOR_AMBIGUOUS_HEADERS,
    reason: "these headers repeat across the three blocks on the live tab, so they cannot be addressed by name and are never guessed — they stay manual",
  };

  if (mode === 'read') {
    const read = bridgeReadRows_(cpcCompetitorSpec_(account));
    if (!read.ok) return { ok: false, reason: read.reason, blocked: blocked };
    const wantId = String(payload.item_id || '').trim();
    const rows = [];
    read.rows.forEach(function (r) {
      const parsed = cpcCompetitorRow_(read.headers, r);
      if (wantId && bridgeMatchKey_(parsed.own.item_id) !== bridgeMatchKey_(wantId)) return;
      rows.push(parsed);
    });
    return {
      ok: true, tab: read.tab, headers: read.headers, count: rows.length,
      rows: stripForRole_(rows, ctx.user.role, ctx.ident.email),
      raw: stripForRole_(read.rows, ctx.user.role, ctx.ident.email),
      blocked: blocked,
    };
  }

  const allowedRoles = ['Item Lister', 'Listing Manager', 'Advertising Manager', 'Team Lead'];
  if (!isMgmt_(ctx.user.role, ctx.ident.email) && allowedRoles.indexOf(ctx.user.role) < 0) throw new Error('role may not write the competitor list');

  const row = payload.row || {};
  const itemId = taskItemId_(row.item_id || payload.item_id || '');
  if (!itemId) throw new Error('item_id required');

  const values = {}, skipped = [];
  Object.keys(row).forEach(function (k) {
    if (k === 'item_id') return;
    if (CPC_COMPETITOR_BLOCKED_KEYS.indexOf(k) >= 0) { skipped.push(k); return; }
    const header = CPC_COMPETITOR_WRITE_MAP[k];
    if (!header) throw new Error('unknown competitor field: ' + k);
    const v = /link$/.test(k) ? cpcUrl_(row[k], header) : cpcText_(row[k], CPC_MAX_TEXT);
    if (v !== '') values[header] = v;
  });
  values[CPC_COMPETITOR_WRITE_MAP.item_id] = itemId;
  values[CPC_COMPETITOR_WRITE_MAP.account] = account;

  const existing = bridgeReadRows_(cpcCompetitorSpec_(account));
  if (!existing.ok) return { ok: false, reason: existing.reason, blocked: blocked };
  let hasRow = false;
  existing.rows.forEach(function (r) {
    if (bridgeMatchKey_(cpcPick_(r, 'Item Id')) === bridgeMatchKey_(itemId)) hasRow = true;
  });

  const res = hasRow
    ? bridgeUpdateRow_(cpcCompetitorSpec_(account), 'Item Id', itemId, values, CPC_COMPETITOR_WRITE_WHITELIST, ctx.ident.email)
    : bridgeAppendRow_(cpcCompetitorSpec_(account), values, CPC_COMPETITOR_WRITE_WHITELIST, ctx.ident.email);

  logActivity_(ctx.ident.email, 'CPC_COMPETITOR_SAVE', account + '!' + itemId, '',
    Object.keys(values).join(' | '), (res.ok ? (res.shadow ? 'shadow' : 'written') : String(res.reason || 'not written')) + (skipped.length ? ' · blocked ' + skipped.join(',') : ''));

  return { ok: !!res.ok, sheet: res, item_id: itemId, skipped_blocked: skipped, blocked: blocked };
}

// ---------- self-test ----------
/** Proves the two things this module cannot show on its face: the header set is the REAL 23
 * columns, and the §8.0 UK windows survive both sides of a DST switch. */
function cpcSelfTest_() {
  const results = [];
  function ok(name, cond, got, want) { results.push({ check: name, ok: !!cond, got: String(got), want: String(want) }); }

  ok('23 real columns', CPC_COLUMNS.length === 23, CPC_COLUMNS.length, 23);
  ok('no Sold Total 30d', CPC_HEADERS.join('|').indexOf('Sold Total') < 0, 'absent', 'absent');
  ok('no User-manual Image', CPC_HEADERS.join('|').indexOf('User-manual') < 0, 'absent', 'absent');
  ok('single Main Image Link', CPC_HEADERS.filter(function (h) { return bridgeNormalizeHeader_(h).indexOf('main image link') === 0; }).length === 1, 'one', 'one');
  ok("column C keeps its newlines", cpcColumn_('revisit_72h').header === 'Dates To \nRevisit\n72/Hrs', JSON.stringify(cpcColumn_('revisit_72h').header), 'Dates To \\nRevisit\\n72/Hrs');
  ok('sheet spellings kept', cpcColumn_('recommendation').header === 'Recomendation' && cpcColumn_('duplicate_image').header === 'Duplicat Image', 'kept', 'kept');
  ok('formula columns are not writable', CPC_WRITE_WHITELIST.indexOf('Duplicat Image') < 0 && CPC_WRITE_WHITELIST.length === 21, CPC_WRITE_WHITELIST.length, 21);

  const summer = cpcTimingWindows_({ y: 2026, m: 7, d: 1 });
  const winter = cpcTimingWindows_({ y: 2026, m: 12, d: 1 });
  ok('BST revision window is 13:00 +01:00', cpcWindow_(summer, 'revision_72h_uk').start_uk === '2026-07-04T13:00:00+01:00', cpcWindow_(summer, 'revision_72h_uk').start_uk, '2026-07-04T13:00:00+01:00');
  ok('GMT revision window is 13:00 +00:00', cpcWindow_(winter, 'revision_72h_uk').start_uk === '2026-12-04T13:00:00+00:00', cpcWindow_(winter, 'revision_72h_uk').start_uk, '2026-12-04T13:00:00+00:00');
  ok('BST 1PM UK is 5PM PKT', cpcWindow_(summer, 'revision_72h_uk').start_pkt === '2026-07-04T17:00:00+05:00', cpcWindow_(summer, 'revision_72h_uk').start_pkt, '2026-07-04T17:00:00+05:00');
  ok('GMT 1PM UK is 6PM PKT', cpcWindow_(winter, 'revision_72h_uk').start_pkt === '2026-12-04T18:00:00+05:00', cpcWindow_(winter, 'revision_72h_uk').start_pkt, '2026-12-04T18:00:00+05:00');
  ok('day 0 goes live 7PM UK', cpcWindow_(summer, 'listing_live_uk').start_uk === '2026-07-01T19:00:00+01:00', cpcWindow_(summer, 'listing_live_uk').start_uk, '2026-07-01T19:00:00+01:00');

  ok("count lines format as '(3,400)'", cpcCountLines_('3400\n(293)') === '(3,400)\n(293)', cpcCountLines_('3400\n(293)'), '(3,400)\n(293)');
  ok("rate lines format as '(23.70%)'", cpcRateLines_('23.7\n (18.40%)') === '(23.70%)\n (18.40%)', cpcRateLines_('23.7\n (18.40%)'), '(23.70%)\n (18.40%)');
  ok('mm-dd-yyyy parses to the sheet date', JSON.stringify(cpcDateParts_('08-07-2026')) === JSON.stringify({ y: 2026, m: 8, d: 7 }), JSON.stringify(cpcDateParts_('08-07-2026')), '{y:2026,m:8,d:7}');

  let threw = false;
  try { cpcValidateResearch_({ sold_total_30d: '5' }, cpcTodayPkt_()); } catch (e) { threw = true; }
  ok('a spec column the sheet lacks is rejected', threw, threw ? 'threw' : 'accepted', 'threw');
  threw = false;
  try { cpcValidateResearch_({ duplicate_image: 'x' }, cpcTodayPkt_()); } catch (e) { threw = true; }
  ok('formula column refuses a write', threw, threw ? 'threw' : 'accepted', 'threw');
  threw = false;
  try { cpcValidateResearch_({ keywords: 'a', positive_keywords: 'b' }, cpcTodayPkt_()); } catch (e) { threw = true; }
  ok('Final Title required before submission', threw, threw ? 'threw' : 'accepted', 'threw');
  threw = false;
  try { cpcEnum_('Sold', CPC_LISTING_STATUS, 'Listing Status'); } catch (e) { threw = true; }
  ok('Listing Status outside the dropdown is refused', threw, threw ? 'threw' : 'accepted', 'threw');

  const fail = results.filter(function (r) { return !r.ok; });
  return { ok: fail.length === 0, pass: results.length - fail.length, fail: fail.length, failed: fail, results: results };
}

const ACTIONS_CPC = {
  cpcWorkspace:       [actionCpcWorkspace_, 'any'],
  submitCpcResearch:  [actionSubmitCpcResearch_, 'any'],
  approveKeywords:    [actionApproveKeywords_, 'any'],   // gated to Zain/Management inside
  returnKeywords:     [actionReturnKeywords_, 'any'],
  competitorList:     [actionCompetitorList_, 'any'],
};
