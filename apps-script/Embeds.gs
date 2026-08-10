/** Phase 5 · §17 step 11, §15 — SECURE DELIVERY OF THE FOUR EMBEDDED TOOLS (RL-8).
 *
 * THE DESIGN. The four tools carry M98M's customer-service playbooks, appeal scripts and
 * listing templates — business content, so RL-2 keeps them out of the public repo and off
 * GitHub Pages. They live as private HTML files in Hasib's own Drive and are registered in
 * the Portal DB CONNECTIONS tab as scope 'global' with sheet_kind 'tool_listing',
 * 'tool_defense', 'tool_reply', 'tool_recovery'. In those rows the `spreadsheet_id` column
 * holds a Drive FILE id, NOT a spreadsheet id — the column is reused because CONNECTIONS is
 * the portal's own registry and its structure is fixed by §7.
 *
 * Consequently these four kinds are deliberately absent from GLOBAL_KINDS, so
 * bridgeResolveSheetId_ refuses them and no SheetBridge call can ever try to open a tool as a
 * workbook. The rows are read here directly from the Portal DB — the portal's own database,
 * never a business sheet — which is why nothing in this file goes through SheetBridge. The
 * §6 registry import cannot collide with them either: importRegistry only upserts the keys
 * it derives from the registry tabs, and 'tool_*' is not among them.
 *
 * RL-8. The HTML is served only by actionToolHtml_, only to a token-verified, approved user
 * whose role is on that tool's list. Because the file never reaches the public site, there is
 * no direct URL to lock — the tool cannot be reached without a portal session at all, which
 * is stronger than a lock screen inside a publicly downloadable page.
 * RL-9. Drive file ids never leave the server: the manifest and the HTML response carry no id.
 * RL-3. The caller renders this HTML in a SANDBOXED iframe — it is first-party code, but the
 * sandbox is what keeps a tool from reaching the portal's session.
 *
 * REALITY WINS (files verified 8 Aug 2026):
 *  · the Listing Tool's own <title> is 'eBay Listing Generator Premium 1.0 — M98M'; the
 *    company — and the Listing SOP rule — call it the M98M Listing Tool, so that is the label.
 *  · the recovery tool is filed as M98M-AliExpress-Recovery-Agent-v1_0.html but its <title>
 *    says v1.2; the file wins, so the label reads v1.2.
 *  · only the Listing Tool carries `var OPEN_MODE=true` (line 3881, "link = access"). Serving
 *    it through this authenticated route already satisfies RL-8, but registerTool_ and
 *    toolSelfCheck_ report the flag so Hasib can see it is still in the copy he registered.
 */

// Largest live tool is the Listing Tool at ~426 KB; the cap refuses anything far bigger
// rather than truncating, because half an HTML file is a broken tool, not a smaller one.
const EMBED_MAX_BYTES = 1000000;
const EMBED_MAX_CHARS = 1000000;
// A second cap under the router's 90/min: one user pulling megabytes of playbook in a loop is
// exfiltration, not work. The window extends while the abuse continues — deliberate.
const EMBED_OPEN_MAX = 20;
const EMBED_OPEN_WINDOW_SEC = 600;

const EMBED_NOT_SET_UP = 'not set up yet';
const EMBED_NOT_SET_UP_NOTE = 'Not set up yet — Management still has to connect this tool.';

/** §17 step 11 / §15. `roles` is additive to Management and Ops Head, who see all four. */
const EMBED_TOOLS = [
  { kind: 'tool_listing',  title: 'M98M Listing Tool',
    roles: ['Item Lister', 'Listing Manager'],
    file_hint: 'M98M-Listing-Tool-index.html' },
  { kind: 'tool_defense',  title: 'M98M eBay Defense Agent v1.8',
    roles: ['CS'],
    file_hint: 'M98M-eBay-Defense-Agent-v1_8.html' },
  { kind: 'tool_reply',    title: 'M98M CS Reply Agent v1.7',
    roles: ['CS'],
    file_hint: 'M98M-CS-Reply-Agent-v1.7.html' },
  { kind: 'tool_recovery', title: 'M98M AliExpress Recovery Agent v1.2',
    roles: ['CS', 'Order Processor'],
    file_hint: 'M98M-AliExpress-Recovery-Agent-v1_0.html' },
  { kind: 'tool_cpc_keyword', title: 'M98M CPC Keyword Decision Engine',
    roles: ['Item Lister', 'Listing Manager', 'Advertising Manager'],
    file_hint: 'M98M-CPC-Keyword-Agent-v3_2.html' },
  { kind: 'tool_order_ops', title: 'M98M Order Operations',
    roles: ['Order Processor', 'Team Lead'],
    file_hint: 'M98M-Order-Ops.html' },
];

// ---------- role gate ----------
function embedTool_(kind) {
  const k = String(kind || '').trim();
  for (let i = 0; i < EMBED_TOOLS.length; i++) if (EMBED_TOOLS[i].kind === k) return EMBED_TOOLS[i];
  return null;
}

function embedMayOpen_(def, role, email) {
  if (!def) return false;
  if (isMgmt_(role, email)) return true;
  return def.roles.indexOf(String(role)) >= 0;
}

// ---------- the CONNECTIONS registry ----------
/** '' when the tool is not registered — never throws, never creates a row (§6 graceful
 * degradation). The id stays server-side; only the caller of embedFetchHtml_ ever sees it. */
function embedResolveFileId_(kind) {
  const k = String(kind || '').trim();
  if (!embedTool_(k)) return '';
  const rows = readTab_('CONNECTIONS');
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].scope || '').trim() !== 'global') continue;
    if (String(rows[i].sheet_kind || '').trim() !== k) continue;
    const id = String(rows[i].spreadsheet_id || '').trim();
    if (id) return id;
  }
  return '';
}

function embedRegisteredKinds_() {
  const map = {};
  const rows = readTab_('CONNECTIONS');
  rows.forEach(function (r) {
    if (String(r.scope || '').trim() !== 'global') return;
    const k = String(r.sheet_kind || '').trim();
    if (!embedTool_(k)) return;
    if (String(r.spreadsheet_id || '').trim()) map[k] = true;
  });
  return map;
}

// ---------- reading the file ----------
/** Returns {ok, html, bytes, chars} or {ok:false, reason}. Every failure reason handed back is
 * generic (RL-9); what actually went wrong goes to ACTIVITY_LOG. */
function embedFetchHtml_(kind, actor) {
  const def = embedTool_(kind);
  if (!def) return { ok: false, reason: EMBED_NOT_SET_UP };
  const id = embedResolveFileId_(def.kind);
  if (!id) return { ok: false, reason: EMBED_NOT_SET_UP };

  let file = null;
  try { file = DriveApp.getFileById(id); } catch (e) { file = null; }
  if (!file) {
    logActivity_(actor || 'embeds', 'TOOL_UNREADABLE', def.kind, '', '', 'Drive file id registered but not readable by the portal account');
    return { ok: false, reason: EMBED_NOT_SET_UP };
  }

  // A tool uploaded as a Google Doc would hand back a converted export, not the tool — refuse.
  const mime = String(file.getMimeType() || '');
  if (mime !== MimeType.HTML) {
    logActivity_(actor || 'embeds', 'TOOL_BAD_MIME', def.kind, '', '', 'expected text/html, found ' + mime);
    return { ok: false, reason: 'tool unavailable' };
  }

  const bytes = Number(file.getSize() || 0);
  if (bytes > EMBED_MAX_BYTES) {
    logActivity_(actor || 'embeds', 'TOOL_TOO_LARGE', def.kind, '', String(bytes), 'over ' + EMBED_MAX_BYTES + ' bytes');
    return { ok: false, reason: 'tool unavailable' };
  }

  let html = '';
  try { html = file.getBlob().getDataAsString('UTF-8'); } catch (e) {
    logActivity_(actor || 'embeds', 'TOOL_READ_FAIL', def.kind, '', '', String(e && e.message || e));
    return { ok: false, reason: 'tool unavailable' };
  }
  if (html.length > EMBED_MAX_CHARS) {
    logActivity_(actor || 'embeds', 'TOOL_TOO_LARGE', def.kind, '', String(html.length), 'decoded over ' + EMBED_MAX_CHARS + ' chars');
    return { ok: false, reason: 'tool unavailable' };
  }
  if (!/^\s*<(!doctype|html)/i.test(html)) {
    logActivity_(actor || 'embeds', 'TOOL_NOT_HTML', def.kind, '', '', 'registered file does not begin as an HTML document');
    return { ok: false, reason: 'tool unavailable' };
  }

  return { ok: true, html: html, bytes: bytes, chars: html.length };
}

function embedDocTitle_(html) {
  const m = String(html || '').match(/<title[^>]*>([^<]{0,200})<\/title>/i);
  return m ? m[1].trim() : '';
}

/** RL-8 audit signal: the shipped Listing Tool really does set OPEN_MODE=true. */
function embedHasOpenMode_(html) {
  return /open_mode\s*[:=]\s*true/i.test(String(html || ''));
}

function embedRateLimit_(email, kind) {
  const cache = CacheService.getScriptCache();
  const key = 'toolopen_' + normalizeEmail(email);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), EMBED_OPEN_WINDOW_SEC);
  if (n > EMBED_OPEN_MAX) {
    logActivity_(email, 'TOOL_RATE_LIMIT', kind, '', String(n), 'more than ' + EMBED_OPEN_MAX + ' tool opens in ' + EMBED_OPEN_WINDOW_SEC + 's');
    throw new Error('too many tool opens');
  }
}

// ---------- actions ----------
/** Which tools THIS caller may open. A tool the role may not open is absent from the list, not
 * disabled in it; a tool nobody has registered yet is present with a friendly line — §6 says a
 * missing connection reads "not set up yet", never as an error. */
function actionToolManifest_(payload, ctx) {
  const role = ctx.user.role, email = ctx.ident.email;
  const registered = embedRegisteredKinds_();
  const tools = [];
  EMBED_TOOLS.forEach(function (t) {
    if (!embedMayOpen_(t, role, email)) return;
    const ready = registered[t.kind] === true;
    tools.push({
      tool: t.kind,
      title: t.title,
      status: ready ? 'ready' : EMBED_NOT_SET_UP,
      note: ready ? '' : EMBED_NOT_SET_UP_NOTE,
    });
  });
  return { tools: tools };
}

/** The HTML itself. Identity and role come from ctx only (RL-1) — a payload that names a role
 * is ignored. Every open is written to ACTIVITY_LOG so tool access is auditable, and every
 * refusal is logged with the role that tried it. */
function actionToolHtml_(payload, ctx) {
  const kind = String(payload.tool || '').trim();
  const role = ctx.user.role, email = ctx.ident.email;

  const def = embedTool_(kind);
  if (!def) {
    logActivity_(email, 'TOOL_DENY', kind || '(none)', '', '', 'unknown tool requested by role ' + role);
    throw new Error('unknown tool');
  }
  if (!embedMayOpen_(def, role, email)) {
    logActivity_(email, 'TOOL_DENY', def.kind, '', '', 'role ' + role + ' may not open this tool');
    throw new Error('role may not open this tool');
  }

  embedRateLimit_(email, def.kind);

  const got = embedFetchHtml_(def.kind, email);
  if (!got.ok) {
    logActivity_(email, 'TOOL_OPEN_FAIL', def.kind, '', '', got.reason);
    return { ok: false, tool: def.kind, title: def.title, reason: got.reason,
      note: got.reason === EMBED_NOT_SET_UP ? EMBED_NOT_SET_UP_NOTE : '' };
  }

  logActivity_(email, 'TOOL_OPEN', def.kind, '', String(got.bytes), def.title + ' · role ' + role);
  // No id, no path, no Drive link — only the document (RL-9). Render it in a sandboxed iframe.
  return { ok: true, tool: def.kind, title: def.title, bytes: got.bytes,
    html: embedWithStorageShim_(got.html), storageIsTemporary: true };
}

/** The sandbox that makes these tools safe to embed (no allow-same-origin) also makes browser
 * storage throw rather than return empty. The Listing Tool touches storage unguarded inside its
 * startup path, so the throw kills its entire script block and it renders as a dead page.
 * Rather than edit the tool — which would risk the standalone copies staff still rely on — give
 * the frame a storage object that works for the session. Drafts last while the tab is open and
 * are not carried between machines; the UI says so honestly. */
function embedWithStorageShim_(html) {
  const shim = '<script>(function(){' +
    'function mem(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null;},' +
    'setItem:function(k,v){d[k]=String(v);},removeItem:function(k){delete d[k];},' +
    'clear:function(){d={};},key:function(i){return Object.keys(d)[i]||null;},' +
    'get length(){return Object.keys(d).length;}};}' +
    'function ok(n){try{var s=window[n];s.setItem("__probe","1");s.removeItem("__probe");return true;}catch(e){return false;}}' +
    '["localStorage","sessionStorage"].forEach(function(n){' +
      'if(ok(n))return;' +
      'try{Object.defineProperty(window,n,{value:mem(),configurable:true});}catch(e){try{window[n]=mem();}catch(e2){}}' +
    '});' +
  '})();<\/script>';
  const s = String(html || '');
  const head = s.search(/<head[^>]*>/i);
  if (head >= 0) {
    const end = s.indexOf('>', head) + 1;
    return s.slice(0, end) + shim + s.slice(end);
  }
  return shim + s;
}

// ---------- setup (run from the Apps Script editor, never from the browser) ----------
/** Point a tool kind at its private Drive file. Idempotent: the existing CONNECTIONS row for
 * that kind is updated in place, so re-running it swaps in a new build of a tool. */
function registerTool_(kind, driveFileId, actor) {
  const def = embedTool_(kind);
  if (!def) throw new Error('unknown tool kind: ' + kind);
  const id = String(driveFileId || '').trim();
  if (!id) throw new Error('drive file id required');

  let who = String(actor || '').trim();
  if (!who) { try { who = Session.getActiveUser().getEmail() || 'setup'; } catch (e) { who = 'setup'; } }

  let file = null;
  try { file = DriveApp.getFileById(id); } catch (e) { file = null; }
  if (!file) throw new Error('drive file not readable by the portal account');
  const mime = String(file.getMimeType() || '');
  if (mime !== MimeType.HTML) throw new Error('not an HTML file (found ' + mime + ') — upload the tool without converting it');
  const bytes = Number(file.getSize() || 0);
  if (bytes > EMBED_MAX_BYTES) throw new Error('file is larger than the ' + EMBED_MAX_BYTES + '-byte serve cap');

  const html = file.getBlob().getDataAsString('UTF-8');
  const openMode = embedHasOpenMode_(html);
  embedUpsertConnection_(def.kind, id, def.title + ' · Drive file id (not a spreadsheet) · ' + file.getName(), who);
  if (openMode) {
    logActivity_(who, 'TOOL_OPEN_MODE', def.kind, '', 'true', 'RL-8: registered copy still sets OPEN_MODE=true — harmless behind this authenticated route, but note it');
  }
  return { ok: true, tool: def.kind, title: def.title, file: file.getName(), bytes: bytes,
    doc_title: embedDocTitle_(html), open_mode: openMode };
}

/** Writes to the Portal DB's own CONNECTIONS tab — the portal's database, not a business sheet,
 * so the Sheet Contract's SheetBridge route does not apply. Logged after the lock is released,
 * matching SheetBridge's ordering. */
function embedUpsertConnection_(kind, fileId, notes, actor) {
  let row = 0, created = false, old = '';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('CONNECTIONS');
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1] || '').trim() !== 'global') continue;
      if (String(rows[i][3] || '').trim() !== kind) continue;
      row = i + 1;
      old = String(rows[i][4] || '');
      break;
    }
    if (row) {
      sh.getRange(row, 5, 1, 3).setValues([[fileId, 'linked', notes]]);
    } else {
      sh.appendRow(['C' + Utilities.getUuid().slice(0, 8), 'global', '', kind, fileId, 'linked', notes]);
      row = sh.getLastRow();
      created = true;
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  logActivity_(actor, 'TOOL_REGISTER', kind, old, fileId, notes);
  return { row: row, created: created };
}

/** Which of the four are registered and readable, and what is actually in each file. */
function toolSelfCheck_() {
  const tools = EMBED_TOOLS.map(function (t) {
    const id = embedResolveFileId_(t.kind);
    const out = {
      tool: t.kind, title: t.title, roles: MGMT_ROLES.concat(t.roles),
      registered: !!id, readable: false, status: id ? 'registered' : EMBED_NOT_SET_UP,
      bytes: 0, doc_title: '', open_mode: false, file_hint: t.file_hint,
      fix: id ? '' : "upload " + t.file_hint + " to the owner Drive, then run registerTool_('" + t.kind + "', '<drive file id>')",
    };
    if (!id) return out;
    const got = embedFetchHtml_(t.kind, 'selfcheck');
    if (!got.ok) {
      out.status = got.reason;
      out.fix = 'check the Drive file is shared with the portal account and is still an HTML file';
      return out;
    }
    out.readable = true;
    out.status = 'ready';
    out.bytes = got.bytes;
    out.doc_title = embedDocTitle_(got.html);
    out.open_mode = embedHasOpenMode_(got.html);
    return out;
  });
  const ready = tools.filter(function (x) { return x.readable; }).length;
  logActivity_('selfcheck', 'TOOL_SELFCHECK', 'embeds', '', ready + '/' + tools.length, 'registered and readable');
  return { ok: ready === tools.length, ready: ready, of: tools.length, tools: tools };
}

// The Apps Script editor's Run picker does not list functions whose names end in '_', so the
// two setup entry points get plain aliases — same code, runnable by hand at setup time.
function registerTool(kind, driveFileId, actor) { return registerTool_(kind, driveFileId, actor); }
function toolSelfCheck() { return toolSelfCheck_(); }

const ACTIONS_EMBEDS = {
  toolManifest: [actionToolManifest_, 'any'],
  toolHtml:     [actionToolHtml_, 'any'],   // role gated inside, every open logged
};

/** SETUP-ONLY: find every tool in Drive by its filename and register it in one go.
 *
 * The tools live in the owner's Drive rather than on the public site because they carry M98M's
 * customer-service playbooks and listing templates — a public URL for them would be a leak that
 * no lock screen could take back. Upload them (unconverted, as .html) and run this once.
 *
 * Safe to re-run: it re-points a kind at whatever file it finds now, and says plainly which
 * tools it could not find rather than failing the whole batch for one missing file. */
function bootstrapRegisterTools() {
  const done = [], missing = [], failed = [];

  EMBED_TOOLS.forEach(function (def) {
    const name = def.file_hint;
    let file = null;
    const byName = DriveApp.getFilesByName(name);
    if (byName.hasNext()) file = byName.next();

    if (!file) {
      // Tolerate Drive dropping or changing the extension on upload.
      const stem = name.replace(/\.html?$/i, '');
      const all = DriveApp.getFilesByName(stem);
      if (all.hasNext()) file = all.next();
    }

    if (!file) { missing.push(name); return; }
    try {
      registerTool_(def.kind, file.getId(), 'setup');
      done.push(def.title + '  ←  ' + file.getName());
    } catch (e) {
      failed.push(def.title + ' — ' + String(e && e.message || e));
    }
  });

  const msg = 'TOOLS REGISTERED: ' + done.length + '\n' +
    (done.length ? '  ' + done.join('\n  ') + '\n' : '') +
    (missing.length ? 'NOT FOUND IN DRIVE (upload these, keeping the .html extension):\n  ' + missing.join('\n  ') + '\n' : '') +
    (failed.length ? 'COULD NOT REGISTER:\n  ' + failed.join('\n  ') + '\n' : '') +
    'Anything not registered shows as "not set up yet" on the Tools screen — never an error.';
  Logger.log(msg);
  return msg;
}
