/* ============================================================================
   M98M ENGINE — Cloudflare Worker (single file, zero dependencies, so it can be
   deployed by PASTING into the dashboard editor — no Node, no wrangler needed).

   Contract (docs/M98M-V2-MASTER-PROMPT.md §1): same envelope as Apps Script —
   POST {action, idToken, payload} → {ok, data|error} — so the portal's api()
   falls back between the two transports with zero view changes. RL-11..16.

   Bindings this Worker expects (all created in the dashboard, names exact):
     D1  binding: DB          (database m98m-engine)
     KV  binding: HOT         (hot cache, 60s rollups)
     R2  binding: BACKUPS     (nightly exports)            [optional until D]
   Secrets (dashboard → Settings → Variables, encrypt):
     SYNC_KEY        shared secret for Apps Script ↔ Engine sync pushes
     EBAY_APP_ID     production keyset                     [Phase B2]
     EBAY_CERT_ID                                          [Phase B2]
     EBAY_RU_NAME    e.g. ZAREEN_LTD RuName                [Phase B2]
   Vars (plain):
     ALLOWED_ORIGIN  https://m98m786.github.io
   Cron (dashboard → Triggers): *5m orderSync · *15m listingSync · hourly rest.
   ============================================================================ */

/* ---------------- visibility law (§6 of the contract; server-enforced) ------ */
const PROFIT_ROLES = ['Management', 'Ops Head'];                 // collective profit: NOBODY else (A9)
/* Review 4 (Hasib): "don't share details of sales analysis to team lead, only loss alerts and
   nothing else, i don't want to show them the real earnings" — Team Lead is OUT of every
   profit-bearing read; loss letters still reach them by role. */
const ITEM_PROFIT_ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'CS'];
const CAMPAIGN_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'];
const MGMT_ROLES = ['Management', 'Ops Head'];

const JSON_HEADERS = { 'content-type': 'application/json' };

export default {
  async fetch(req, env, ctx) {
    /* ALLOWED_ORIGIN is a comma-separated LIST since the custom domain (portal.m98mltd.co.uk)
       joined the github.io address — the caller's own origin is echoed back only when listed. */
    const allowedList = String(env.ALLOWED_ORIGIN || '*').split(',').map(x => x.trim()).filter(Boolean);
    const reqOrigin = req.headers.get('origin') || '';
    const origin = allowedList.indexOf(reqOrigin) >= 0 ? reqOrigin : (allowedList[0] || '*');
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405, cors);

    let body = {};
    try { body = await req.json(); } catch (e) { return json({ ok: false, error: 'bad json' }, 400, cors); }
    const action = String(body.action || '');
    const route = ROUTES[action];
    if (!route) return json({ ok: false, error: 'unknown action' }, 200, cors);

    try {
      let ctx2 = { env, user: null, email: '' };
      if (route.auth === 'sync') {
        if (String(body.key || '') !== (await secret(env, 'SYNC_KEY'))) throw new AuthError('auth');
      } else if (route.auth !== 'public') {
        ctx2 = await authorize(env, String(body.idToken || ''), String(body.session || ''));
        if (route.auth === 'mgmt' && MGMT_ROLES.indexOf(ctx2.user.role) < 0 && !ctx2.user.super) throw new AuthError('auth');
      }
      const t0 = Date.now();
      /* SPEED (Hasib, night order): the heavy read boards recomputed full scans on every
         screen visit. These actions return IDENTICAL data to every permitted caller, so a
         short in-isolate cache answers repeat visits in milliseconds and cuts D1 work ~10x.
         Role-DEPENDENT actions (alertMail, csDesk, toolHtml…) are deliberately absent. */
      const ROUTE_CACHE_MS = { itemPnl: 90000, dailyReport: 45000, itemRisk: 120000,
        marketingBoard: 120000, feedbackBoard: 90000, adsBoard: 60000, trafficBoard: 300000,
        deliveryCheckpoints: 300000, accountDay: 60000, campaignWatch: 0, mgmtOverview: 0 };
      const rcTtl = ROUTE_CACHE_MS[action] || 0;
      const data = rcTtl
        ? await memo('rt:' + action + ':' + JSON.stringify(body.payload || {}), rcTtl, () => route.fn(body.payload || {}, ctx2))
        : await route.fn(body.payload || {}, ctx2);
      console.log('t', action, Date.now() - t0, 'ms');       // §9: server time per action, in the CF log
      return json({ ok: true, data }, 200, cors);
    } catch (e) {
      /* daily security telemetry: every refused call ticks a counter the nightly
         securitySweep reads — a spike means someone is probing the portal */
      if (e instanceof AuthError) {
        try {
          const k = 'authfail:' + ukDate('');
          const c = Number(await env.HOT.get(k)) || 0;
          await env.HOT.put(k, String(c + 1), { expirationTtl: 172800 });
        } catch (e2) {}
      }
      const msg = e instanceof AuthError ? 'auth'
        : String(e && e.message || e).startsWith('SAY: ') ? String(e.message).slice(5)
        : 'request failed';
      if (msg === 'request failed') console.log('ERR', action, String(e && e.stack || e).slice(0, 500));
      return json({ ok: false, error: msg }, 200, cors);
    }
  },

  /* Cron fan-out — each schedule set in the dashboard calls this with its own cron string.
     adsItems rides the 15-minute slot (with the light listingSync), NOT the 5-minute one:
     orderSync + adsSync + item fetches + notifications in one invocation can cross the
     50-subrequest cap, and a burst then kills whichever account happens to run last. The queue
     flush runs AFTER the jobs so this invocation's alerts go out in it (bounded at 8 fetches). */
  async scheduled(event, env, ctx) {
    /* Slot budgeting (20 Aug, after the cap deaths): every job in a slot shares ONE invocation's
       subrequest budget, so the heavy movers are spread out — listingSync dropped to hourly on
       the half-past slot (its every-quarter-hour full upserts alone were ~72k of D1's 100k
       rows-written/day), trafficSync moved off financeSync's slot, violationsSync off the
       5-minute treadmill. */
    const jobs = {
      '*/5 * * * *': [orderSync, adsSync, cpcAudit, adsIntraday],
      '*/15 * * * *': [adsItems, autoMsgSend, adsReportPoll, statusRefresh, markEndedListings, violationsSync, sleepWatch],
      '0 * * * *': [financeSync, csSync, autoMsgScan],
      /* Cheap D1-only work runs FIRST: the heavy API syncs at the tail can (and do) exhaust the
         invocation's subrequest budget, and anything queued after them silently never runs —
         processWatch starved exactly that way on its first armed tick (00:30, 21 Aug). */
      '30 * * * *': [processWatch, zeroSaleScan, cpcRevisionWatch, alertAckWatch, uncampaignedDigest, noSupplierScan, trackingBackfill, nightlyCatchup, listingSync, trafficSync, marketingSync, feedbackSync],
      /* Was '0 2 * * *' — Cloudflare skipped that exact tick THREE consecutive nights (20–22
         Aug; registration present, tick never delivered, all other slots fine). Moved to a
         fresh minute + re-registered; the anchored nightlyCatchup remains the safety net. */
      '10 2 * * *': [rollups, backup, adsReportKick, standardsSync, itemStats, selfTestJob, securitySweep],
    };
    const fns = jobs[event.cron] || [];
    ctx.waitUntil((async () => {
      try {
        /* The heartbeat is the black-box recorder: it proves in KV — a channel independent of
           D1 — that the tick fired, BEFORE any job runs. Kept to the quarter-hour slots so it
           stays far inside KV's 1k-writes/day budget. */
        if (event.cron !== '*/5 * * * *') {
          try { await env.HOT.put('cron:beat', JSON.stringify({ cron: event.cron, at: new Date().toISOString() })); } catch (e) {}
        }
        /* Sequential ON PURPOSE: under Promise.all a budget blow-up killed every job mid-flight
           at once; run one after another, the early jobs land whole and only the tail starves. */
        for (const fn of fns) { await runJob(env, fn); }
        await flushNotifyQueue(env);
      } catch (e) {
        try {
          await env.HOT.put('cron:err', JSON.stringify({
            cron: event.cron, at: new Date().toISOString(),
            err: String(e && e.message || e).slice(0, 400) }));
        } catch (e2) {}
      }
    })());
  },
};

class AuthError extends Error {}

/* §9's 60-second hot cache — in-isolate memory, NOT KV (the free plan's 1k KV writes/day cannot
   carry a per-minute cache). Best-effort by design: a fresh isolate simply misses. Only used for
   responses that are identical for every caller who passes the route's gate. */
const HOTMEM = new Map();
async function memo(key, ttlMs, fn) {
  const hit = HOTMEM.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v;
  const v = await fn();
  HOTMEM.set(key, { v, at: Date.now() });
  if (HOTMEM.size > 200) { HOTMEM.clear(); }               // crude bound; isolates recycle anyway
  return v;
}
function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), { status, headers: { ...JSON_HEADERS, ...(extra || {}) } });
}
async function secret(env, name) {
  const v = env[name];
  if (!v) throw new Error('SAY: the Engine is missing the ' + name + ' secret — set it in the Cloudflare dashboard');
  return v;
}

/* ---------------- auth: Google ID token → users row (RL-11) ----------------
   Same trust chain as Apps Script: verify with Google's tokeninfo, then the role
   comes from OUR users table, never from the client. Token verdicts are cached
   in KV for 5 minutes keyed by a digest, mirroring verifyGoogleToken_. */
async function authorize(env, idToken, session) {
  let email = '';
  /* PORTAL SESSIONS (Hasib's night list: "one refresh and it goes to login"): the Engine mints
     its own 7-day token at sign-in, so a reload or a new tab never begs Google again. The role
     STILL comes from the users table on every call — a session only answers "who", never "may". */
  if (session && /^[0-9a-f]{64}$/.test(String(session))) {
    email = await memo('sess:' + session, 300000, async () => {
      const row = await env.DB.prepare('SELECT email, expires_at FROM sessions WHERE token = ?1').bind(String(session)).first();
      if (!row) return '';
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (String(row.expires_at) <= nowStr) return '';
      return String(row.email).toLowerCase();
    });
  }
  if (!email) {
    if (!idToken) throw new AuthError('auth');
    const digest = await sha256(idToken);
    const kvKey = 'tok:' + digest;
    email = await env.HOT.get(kvKey);
    if (!email) {
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
      if (!r.ok) throw new AuthError('auth');
      const t = await r.json();
      if (String(t.email_verified) !== 'true' || !t.email) throw new AuthError('auth');
      if (Number(t.exp) * 1000 < Date.now()) throw new AuthError('auth');
      email = String(t.email).toLowerCase();
      await env.HOT.put(kvKey, email, { expirationTtl: 300 });
    }
  }
  const user = await env.DB.prepare(
    'SELECT email, name, role, status, modules, tools, super FROM users WHERE email = ?1'
  ).bind(email).first();
  if (!user || (user.status !== 'approved' && !user.super)) throw new AuthError('auth');
  if (user.super) user.role = 'Management';
  return { env, user, email };
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------------- role strippers (§6) — applied at the edge, not in views ---- */
/* Who may see per-item COST/earning and the AliExpress sourcing links (§6 matrix row 4). It is a
   superset of nobody's business but the order/ads/CS chain: a Lister or Hunter who receives
   oe AND ali_cost can compute profit = oe − ali_cost (the Main Sheet's own formula) and walk
   straight through the profit strip. So cost data is stripped for anyone outside this list. */
const ITEM_COST_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS', 'Order Processor'];

function stripItem(row, user) {
  const out = { ...row };
  if (ITEM_PROFIT_ROLES.indexOf(user.role) < 0 && !user.super) {
    delete out.profit; delete out.roi; delete out.margin; delete out.avg_profit_7d;
  }
  if (ITEM_COST_ROLES.indexOf(user.role) < 0 && !user.super) {
    // oe + ali_cost reconstruct the stripped profit exactly; suppliers are the cost's sourcing
    delete out.oe; delete out.ali_cost; delete out.current_sup; delete out.category;
    delete out.sup1; delete out.sup2; delete out.sup3;
    delete out.sup1_link; delete out.sup2_link; delete out.sup3_link;
  }
  if (CAMPAIGN_ROLES.indexOf(user.role) < 0 && !user.super) {
    delete out.campaign_name; delete out.campaign_type;
  }
  return out;
}

/* ---------------- sync-state (§2 correction 3): resumable, visible jobs ------
   The '@lock' row is a cheap lease so a forced runJobNow can't race the cron tick it overlaps —
   two concurrent runs of the same diff job would each see the old snapshot and double every
   event and bell. The read-then-write pair is not atomic, but the window is milliseconds against
   a 5-minute cadence, and a stale lease self-expires after 4 minutes. D1, not KV: the free plan
   allows only 1k KV writes a day and a lease per run would eat them. */
/* sync_state as a visible notebook: a job can leave a fact where a human can read it without a
   redeploy or a log dive. */
async function ctx_setSync(env, job, account, text) {
  await env.DB.prepare(
    "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES (?1, ?2, ?3, datetime('now'), '') " +
    "ON CONFLICT(job, account) DO UPDATE SET cursor = ?3, last_ok = datetime('now')"
  ).bind(String(job), String(account), String(text).slice(0, 1400)).run();
}

async function runJob(env, fn) {
  const name = fn.name;
  const lock = await env.DB.prepare("SELECT cursor FROM sync_state WHERE job = ?1 AND account = '@lock'").bind(name).first();
  if (lock && Number(lock.cursor) > Date.now()) return;
  await env.DB.prepare(
    "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES (?1, '@lock', ?2, '', '') " +
    'ON CONFLICT(job, account) DO UPDATE SET cursor = ?2'
  ).bind(name, String(Date.now() + 240000)).run();
  try {
    await fn(env);
    await env.DB.prepare("UPDATE sync_state SET cursor = '0' WHERE job = ?1 AND account = '@lock'").bind(name).run();
    await env.DB.prepare(
      "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES (?1, '', '', datetime('now'), '') " +
      "ON CONFLICT(job, account) DO UPDATE SET last_ok = datetime('now'), last_error = ''"
    ).bind(name).run();
  } catch (e) {
    await env.DB.prepare(
      "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES (?1, '', '', '', ?2) " +
      'ON CONFLICT(job, account) DO UPDATE SET last_error = ?2'
    ).bind(name, String(e && e.message || e).slice(0, 300)).run();
  }
}

/* ---------------- eBay OAuth scaffolding (Phase B2 — waits on the keyset) ----
   Per-account user tokens: consent URL → Hasib clicks Allow on each account →
   the code lands on the redirect (RuName) → exchanged and stored in D1
   (refresh token encrypted-at-rest by Cloudflare; access tokens cached in KV). */
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.finances',   // probed 403 on existing grants — future consents carry it
].join(' ');

async function ebayConsentUrl(env, accountName) {
  const appId = await secret(env, 'EBAY_APP_ID');
  const ru = await secret(env, 'EBAY_RU_NAME');
  return 'https://auth.ebay.com/oauth2/authorize?client_id=' + encodeURIComponent(appId) +
    '&redirect_uri=' + encodeURIComponent(ru) + '&response_type=code' +
    '&scope=' + encodeURIComponent(EBAY_SCOPES) +
    '&state=' + encodeURIComponent(accountName);
}

async function ebayExchangeCode(env, code) {
  const appId = await secret(env, 'EBAY_APP_ID');
  const cert = await secret(env, 'EBAY_CERT_ID');
  const ru = await secret(env, 'EBAY_RU_NAME');
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + btoa(appId + ':' + cert),
    },
    body: 'grant_type=authorization_code&code=' + encodeURIComponent(code) + '&redirect_uri=' + encodeURIComponent(ru),
  });
  const t = await r.json();
  if (!r.ok || !t.refresh_token) throw new Error('SAY: eBay did not accept the consent code — ' + String(t.error_description || r.status));
  return t;
}

/* REALITY (14 Aug): every selling account has its OWN eBay application — five keysets, not
   one. Per-account app_id/cert_id live on the accounts row next to its refresh token; the
   global EBAY_* secrets remain only as a fallback for any account without its own pair. */
async function ebayCreds(env, accountName) {
  const row = await env.DB.prepare('SELECT oauth_ref, app_id, cert_id FROM accounts WHERE name = ?1 AND api_enabled = 1').bind(accountName).first();
  if (!row || !row.oauth_ref) throw new Error('SAY: ' + accountName + ' has no eBay consent on file yet');
  return {
    refresh: row.oauth_ref,
    appId: row.app_id || await secret(env, 'EBAY_APP_ID'),
    cert: row.cert_id || await secret(env, 'EBAY_CERT_ID'),
  };
}

async function ebayAccessToken(env, accountName) {
  const kvKey = 'ebaytok:' + accountName;
  const cached = await env.HOT.get(kvKey);
  if (cached) return cached;
  const creds = await ebayCreds(env, accountName);
  const row = { oauth_ref: creds.refresh };
  const appId = creds.appId;
  const cert = creds.cert;
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + btoa(appId + ':' + cert),
    },
    // No scope param: eBay then applies the ORIGINAL grant's scopes, so a token minted by the
    // sheet-automation app works even where its scope list differs from ours.
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(row.oauth_ref),
  });
  const t = await r.json();
  if (!r.ok || !t.access_token) throw new Error('eBay refresh failed for ' + accountName + ': ' + String(t.error_description || r.status));
  await env.HOT.put(kvKey, t.access_token, { expirationTtl: Math.max(60, Number(t.expires_in || 7200) - 120) });
  return t.access_token;
}

/* eBay's own accepted-carrier list (A4: never a manual mapping) — one Trading call per account
   per week, cached on the accounts row. Falls back to the last cached list on any eBay hiccup. */
async function acceptedCarriers(env, account, tok) {
  const row = await env.DB.prepare('SELECT couriers_json FROM accounts WHERE name = ?1').bind(account).first();
  let cached = null;
  try { cached = row && row.couriers_json ? JSON.parse(row.couriers_json) : null; } catch (e) { cached = null; }
  if (cached && cached.list && cached.list.length && Date.now() - Number(cached.at || 0) < 7 * 86400000) return cached.list;
  try {
    const r = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: { 'X-EBAY-API-COMPATIBILITY-LEVEL': '1193', 'X-EBAY-API-CALL-NAME': 'GeteBayDetails',
        'X-EBAY-API-SITEID': '3', 'X-EBAY-API-IAF-TOKEN': tok, 'content-type': 'text/xml' },
      body: '<?xml version="1.0" encoding="utf-8"?><GeteBayDetailsRequest xmlns="urn:ebay:apis:eBLBaseComponents"><DetailName>ShippingCarrierDetails</DetailName></GeteBayDetailsRequest>',
    });
    const xml = await r.text();
    // exact-tag match only: xmlTag's <ShippingCarrier[^>]*> would also swallow <ShippingCarrierID>
    const list = [];
    for (const m of (xml.match(/<ShippingCarrier>([^<]*)<\/ShippingCarrier>/g) || [])) {
      const c = m.replace(/<\/?ShippingCarrier>/g, '').trim();
      if (c) list.push(c);
    }
    if (list.length) {
      await env.DB.prepare('UPDATE accounts SET couriers_json = ?2 WHERE name = ?1')
        .bind(account, JSON.stringify({ list, at: Date.now() })).run();
      return list;
    }
  } catch (e) { console.log('carrier list fetch failed', String(e).slice(0, 120)); }
  return (cached && cached.list) || ['RoyalMail', 'Hermes', 'Yodel', 'DHL', 'UPS', 'DPD', 'Other'];
}

/* ---------------- sync jobs (G-2: skip api_enabled=0; G-3: 48h shadow) -------
   Each is complete for the data it can reach; each degrades to a sync_state
   error instead of throwing the whole cron. Bodies land in Phase B2/C as the
   credentials arrive — the shells keep the cron wiring honest from day one. */
async function apiAccounts(env) {
  const rs = await env.DB.prepare('SELECT name FROM accounts WHERE api_enabled = 1').all();
  return (rs.results || []).map(r => r.name);
}

/* One account's bad credentials must never starve the accounts after it — each account gets its
 * own try/catch and its own sync_state row, so the job-level row stays for the job itself. */
async function perAccount(env, job, fn) {
  /* ROTATE the starting account each hour. The list used to run in one fixed order, so when an
     invocation neared the Workers subrequest cap it was always the SAME tail account that died —
     Saif's report kicks failed for 29 straight hours while the other four passed, and his ad
     books sat at £0. Rotation shares the tail; the per-run backlog cap bounds the budget. */
  const all = await apiAccounts(env);
  const off = all.length ? new Date().getUTCHours() % all.length : 0;
  const order = all.slice(off).concat(all.slice(0, off));
  for (const acct of order) {
    try {
      await fn(acct);
      await env.DB.prepare(
        "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES (?1, ?2, '', datetime('now'), '') " +
        "ON CONFLICT(job, account) DO UPDATE SET last_ok = datetime('now'), last_error = ''"
      ).bind(job, acct).run();
    } catch (e) {
      await env.DB.prepare(
        "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES (?1, ?2, '', '', ?3) " +
        'ON CONFLICT(job, account) DO UPDATE SET last_error = ?3'
      ).bind(job, acct, String(e && e.message || e).slice(0, 300)).run();
    }
  }
}

/* Listings live on the Trading API (GetMyeBaySelling) — the Inventory API only knows migrated
   listings, and none of these accounts migrated. XML in, regex out (Workers have no XML parser
   and this worker stays dependency-free). One page per account per tick keeps CPU inside the
   free plan; the page cursor rides sync_state.cursor, so the whole active list refreshes in a
   rolling cycle and a huge account can never blow the invocation budget. */
function xmlTag(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'));
  return m ? m[1].trim() : '';
}

async function listingSync(env) {
  await perAccount(env, 'listingSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const st = await env.DB.prepare("SELECT cursor FROM sync_state WHERE job = 'listingSync' AND account = ?1").bind(acct).first();
    const page = Math.max(1, Number(st && st.cursor) || 1);
    const body = '<?xml version="1.0" encoding="utf-8"?>' +
      '<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">' +
      '<ActiveList><Include>true</Include><Pagination><EntriesPerPage>200</EntriesPerPage>' +
      '<PageNumber>' + page + '</PageNumber></Pagination></ActiveList>' +
      '</GetMyeBaySellingRequest>';
    const r = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: {
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
        'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
        'X-EBAY-API-SITEID': '3',
        'X-EBAY-API-IAF-TOKEN': tok,
        'content-type': 'text/xml',
      },
      body,
    });
    const xml = await r.text();
    if (!r.ok || xml.indexOf('<Ack>Failure</Ack>') >= 0) {
      throw new Error(acct + ' GetMyeBaySelling p' + page + ': ' + (xmlTag(xml, 'LongMessage') || ('HTTP ' + r.status)).slice(0, 160));
    }
    const items = xml.match(/<Item>[\s\S]*?<\/Item>/g) || [];
    /* Batched: 200 single .run()s per page were 200 separate subrequests inside a shared slot. */
    const upserts = [];
    for (const it of items) {
      const id = xmlTag(it, 'ItemID');
      if (!id) continue;
      upserts.push(env.DB.prepare(
        /* INCIDENT 22 Aug: this statement carried SEVEN placeholders while bind() passed EIGHT
           values (sold_qty had its bind but no ?8) — every listingSync run since 20 Aug 21:01
           threw 'Wrong number of parameter bindings', the table froze, and markEndedListings
           diffed against the dead fetch and flipped all 798 items ENDED. ?8 restored. */
        'INSERT INTO items_api (item_id, account, title, price, qty, status, image, api_synced_at, start_time, first_seen, sold_qty) ' +
        "VALUES (?1, ?2, ?3, ?4, ?5, 'ACTIVE', ?6, datetime('now'), ?7, datetime('now'), ?8) " +
        "ON CONFLICT(item_id) DO UPDATE SET account=?2, " +
        /* review 4 (marketing 14-day rule): a PRICE or TITLE change stamps last_revised — the
           markdown-sale eligibility clock. Tracking starts 21 Aug; earlier revisions are unknowable. */
        "last_revised = CASE WHEN price != ?4 OR title != ?3 THEN datetime('now') ELSE last_revised END, " +
        "title=?3, price=?4, qty=?5, status='ACTIVE', image=?6, api_synced_at=datetime('now'), " +
        "start_time = CASE WHEN ?7 != '' THEN ?7 ELSE start_time END, sold_qty=?8"
      ).bind(
        id, acct,
        xmlTag(it, 'Title'),
        Number(xmlTag(it, 'CurrentPrice')) || 0,
        Number(xmlTag(it, 'QuantityAvailable') || xmlTag(it, 'Quantity')) || 0,
        xmlTag(it, 'GalleryURL'),
        /* the 7-day-rule age clock: eBay's own StartTime when the XML carries it (first_seen
           stays as the fallback clock and is never overwritten once set) */
        String(xmlTag(it, 'StartTime') || '').replace('T', ' ').replace(/\.\d+Z$/, '').replace('Z', ''),
        /* eBay's active list gives original Quantity and QuantityAvailable, never a sold count —
           lifetime sold is the difference (0 when either is missing) */
        Math.max(0, (Number(xmlTag(it, 'Quantity')) || 0) - (Number(xmlTag(it, 'QuantityAvailable')) || 0))
      ));
    }
    for (let i = 0; i < upserts.length; i += 50) await env.DB.batch(upserts.slice(i, i + 50));
    const totalPages = Number(xmlTag(xmlTag(xml, 'ActiveList'), 'TotalNumberOfPages')) || 1;
    const next = page >= totalPages ? 1 : page + 1;
    await env.DB.prepare(
      "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('listingSync', ?1, ?2, datetime('now'), '') " +
      "ON CONFLICT(job, account) DO UPDATE SET cursor = ?2"
    ).bind(acct, String(next)).run();
  });
}

/* The false-overdue root (Hasib's 19 Aug review, item 3): orderSync re-reads only the last 6
   days, so an order synced in May kept its NOT_STARTED for ever while eBay itself showed it
   delivered — 476 'awaiting' here against Seller Hub's 14. This sweeper walks the OLDEST open
   orders first, ~35 per run inside the subrequest budget, re-reading eBay's current status and
   ship-by. An order eBay no longer serves (404) is marked NOT_FOUND so it stops resurfacing.
   The 476-order backlog converges in a few hours at the 15-minute cadence, then stays converged. */
/* Ended listings never left: listingSync upserts what eBay returns and nothing ever marked the
   rows that stopped returning. The sync's page cursor makes a same-run diff unreliable, but
   api_synced_at is a clean proxy — every live listing is re-touched within a couple of hours at
   the 15-minute cadence, so an ACTIVE row untouched for a day is an ended item. Marked, not deleted:
   its history still joins orders and ads. */
async function markEndedListings(env) {
  /* INCIDENT GUARD (22 Aug): with listingSync itself broken, NOTHING gets re-touched and this
     diff would (did) end the entire fleet. Ending is only meaningful when the sync is alive —
     require a listing write within the last 2 hours, and never end more than 30% of the ACTIVE
     set in one pass; a bigger cut is a feed problem wearing an ended-items costume. */
  const alive = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM items_api WHERE api_synced_at >= datetime('now', '-2 hour')"
  ).first();
  if (!alive || Number(alive.n) === 0) return;
  const counts = await env.DB.prepare(
    "SELECT SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS act, " +
    "SUM(CASE WHEN status = 'ACTIVE' AND api_synced_at < datetime('now', '-1 day') THEN 1 ELSE 0 END) AS stale FROM items_api"
  ).first();
  const act = Number(counts && counts.act) || 0, stale = Number(counts && counts.stale) || 0;
  if (act > 20 && stale > act * 0.3) {
    await queueNotify(env, 'management', 'Listings check',
      '⚠ ' + stale + ' of ' + act + ' ACTIVE listings stopped refreshing — too many to be real endings, so nothing was marked. The listing feed needs eyes: Account health → run Pull listings.',
      'engine:endguard:' + ukDate(new Date().toISOString()));
    return;
  }
  await env.DB.prepare(
    "UPDATE items_api SET status = 'ENDED' WHERE status = 'ACTIVE' AND api_synced_at < datetime('now', '-1 day')"
  ).run();
}

/* THE 7-DAY RULE (Hasib, item 12): a NEW listing that has sold nothing in its first week goes
   to Management to decide — end it (job lands with the Team Lead) or revise it (job lands with
   a chosen listing manager). The age clock prefers eBay's own StartTime; where the sync never
   saw one, first_seen is the honest fallback and the row says which clock it used. Items only
   enter the queue while young (7 to 21 days) so day one doesn't drown Management in old stock;
   each item is queued once, ever — the decision row itself is the dedupe. */
/* Hasib item 20: an order being worked with NO supplier link anywhere — not on the order, not
   in any of the item's three supplier columns — is a dispatch stall waiting to happen. The
   Order Processors get the letter, one per item ever (alert_log is the memory), and the link
   lands via the order screen's own add-link box. */
async function noSupplierScan(env) {
  const rs = await env.DB.prepare(
    "SELECT o.item_id, MIN(o.order_id) AS order_id, o.account, COUNT(*) AS n, MAX(i.title) AS title " +
    "FROM orders o LEFT JOIN items_facts f ON f.item_id = o.item_id LEFT JOIN items_api i ON i.item_id = o.item_id " +
    "WHERE o.status NOT IN ('FULFILLED', 'NOT_FOUND', 'CANCELLED') AND o.created_at >= datetime('now', '-5 day') " +
    "  AND COALESCE(o.ali_link, '') = '' AND o.item_id != '' " +
    "  AND COALESCE(f.sup1_link, '') = '' AND COALESCE(f.sup2_link, '') = '' AND COALESCE(f.sup3_link, '') = '' AND COALESCE(f.current_sup, '') = '' " +
    "  AND NOT EXISTS (SELECT 1 FROM sourcing s WHERE s.item_id = o.item_id AND (COALESCE(s.s1,'') != '' OR COALESCE(s.s2,'') != '' OR COALESCE(s.s3,'') != '')) " +
    "  AND NOT EXISTS (SELECT 1 FROM alert_log a WHERE a.ref = 'engine:nosup:' || o.item_id) " +
    'GROUP BY o.item_id, o.account LIMIT 10'
  ).all();
  for (const r of (rs.results || [])) {
    await notifyRole(env, 'Order Processor', 'Supplier link missing',
      'Order ' + r.order_id + ' (' + r.account + ') is being worked but ' + String(r.title || r.item_id).slice(0, 60) +
      ' (' + r.item_id + ') has NO supplier link anywhere — not on the order, not in the sheet. Add it on the order screen or update the sheet.' +
      (Number(r.n) > 1 ? ' ' + r.n + ' open orders are on this item.' : ''),
      'engine:nosup:' + r.item_id);
  }
}

/* R7-3 (Hasib): "update trackings of all previous orders … you can take it from api too."
   eBay's own shipping fulfillments are the record of every tracking ever uploaded — from the
   portal, from the sheet flow, from anywhere. This walks FULFILLED orders that have no
   trackings row yet, newest first, 18 per run (each is one API call), until the history is
   drained; the '30' slot keeps it topped up forever after. */
async function trackingBackfill(env) {
  const rs = await env.DB.prepare(
    "SELECT o.order_id, o.account FROM orders o WHERE o.status = 'FULFILLED' " +
    "AND NOT EXISTS (SELECT 1 FROM trackings t WHERE t.order_id = o.order_id AND t.tracking != '') " +
    "AND o.created_at >= datetime('now', '-90 day') ORDER BY o.created_at DESC LIMIT 18"
  ).all();
  const rows = rs.results || [];
  let got = 0;
  const toks = {};
  for (const r of rows) {
    try {
      if (!toks[r.account]) toks[r.account] = await ebayAccessToken(env, r.account);
      const fr = await fetch('https://api.ebay.com/sell/fulfillment/v1/order/' + encodeURIComponent(r.order_id) + '/shipping_fulfillment',
        { headers: { authorization: 'Bearer ' + toks[r.account] } });
      if (!fr.ok) continue;
      const fj = await fr.json();
      const f = (fj.fulfillments || [])[0];
      const num = f ? String(f.shipmentTrackingNumber || '') : '';
      if (!num) {
        await env.DB.prepare(
          "INSERT INTO trackings (order_id, tracking, courier_ebay, pushed_at, push_status) VALUES (?1, '', '', datetime('now'), 'EBAY:none') " +
          'ON CONFLICT(order_id) DO NOTHING').bind(r.order_id).run();
        continue;
      }
      await env.DB.prepare(
        "INSERT INTO trackings (order_id, tracking, courier_ebay, pushed_at, push_status) VALUES (?1, ?2, ?3, ?4, 'EBAY') " +
        "ON CONFLICT(order_id) DO UPDATE SET tracking = CASE WHEN tracking = '' THEN ?2 ELSE tracking END, " +
        "courier_ebay = CASE WHEN courier_ebay = '' THEN ?3 ELSE courier_ebay END"
      ).bind(r.order_id, num.slice(0, 60), String(f.shippingCarrierCode || '').slice(0, 30),
        String(f.shippedDate || new Date().toISOString())).run();
      got++;
    } catch (e) { /* one bad order must not stop the walk — next run retries */ }
  }
  await env.DB.prepare(
    "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('trackingBackfill', '', ?1, datetime('now'), '') " +
    "ON CONFLICT(job, account) DO UPDATE SET cursor = ?1, last_ok = datetime('now'), last_error = ''"
  ).bind(got + ' of ' + rows.length + ' fetched this run').run();
}

/* R5 (Hasib): "if not processed after 1 business day show alert". Processed = an AliExpress
   order number or link on the order (the hourly sheet sweep + the portal's own add box are the
   two feeds). Letters ride the tier ladder so a growing pile re-rings the same day; the same
   hourly pass sends the 09:00 UK sourcing digest — ACTIVE items with no supplier link anywhere,
   by 30-day sales, which is the Order Processors' standing task queue. */
async function processWatch(env) {
  const oneBiz = (() => {
    let d = new Date(); let left = 1;
    while (left > 0) { d = new Date(d.getTime() - 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6) left--; }
    return d.toISOString();
  })();
  const day = ukDate(new Date().toISOString());
  const rs = await env.DB.prepare(
    'SELECT o.order_id, o.account, o.created_at, i.title FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
    "WHERE o.status = 'NOT_STARTED' AND COALESCE(o.ali_order,'') = '' AND COALESCE(o.ali_link,'') = '' " +
    "AND o.created_at <= ?1 AND o.created_at >= datetime('now','-10 day') " +
    "AND NOT EXISTS (SELECT 1 FROM trackings t WHERE t.order_id = o.order_id AND t.tracking != '') " +
    'ORDER BY o.created_at ASC LIMIT 60'
  ).bind(oneBiz).all();
  const rows = rs.results || [];
  /* Arming guard: until the hourly sheet sweep has landed Ali data at least once, "no Ali order
     on the order" is a statement about the sweep, not the processors — every open order would
     ring. The letter stays silent until the feed exists; the board itself always shows. */
  const armed = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM orders WHERE (COALESCE(ali_order,'') != '' OR COALESCE(ali_link,'') != '') AND created_at >= datetime('now','-7 day')"
  ).first();
  if (rows.length && armed && Number(armed.n) > 0) {
    const tier = Math.floor(rows.length / 10) * 10;
    const ref = 'engine:proc:' + day + ':' + tier;
    const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE ref = ?1 LIMIT 1').bind(ref).first();
    if (!seen) {
      const lines = rows.slice(0, 15).map((r) => '· ' + r.order_id + ' (' + r.account + ') — ' +
        String(r.title || '').slice(0, 55) + ' — since ' + String(r.created_at).slice(0, 16).replace('T', ' ')).join('\n');
      const msg = '🔴 ' + rows.length + ' order(s) have passed 1 BUSINESS DAY with no AliExpress order placed:\n' + lines +
        (rows.length > 15 ? '\n…and ' + (rows.length - 15) + ' more.' : '') +
        '\nOpen Orders → Needs processing and work them oldest-first.';
      await notifyRole(env, 'Order Processor', 'Orders not processed', msg, ref);
      await notifyRole(env, 'Ops Head', 'Orders not processed', msg, ref);
    }
  }
  await env.DB.prepare(
    "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('processWatch', '', ?1, datetime('now'), '') " +
    "ON CONFLICT(job, account) DO UPDATE SET cursor = ?1, last_ok = datetime('now'), last_error = ''"
  ).bind(rows.length + ' unprocessed >1 biz day').run();
  const ukHour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }));
  if (ukHour === 9) {
    const missSql =
      'FROM items_api i LEFT JOIN items_facts f ON f.item_id = i.item_id LEFT JOIN sourcing s ON s.item_id = i.item_id ' +
      "WHERE i.status = 'ACTIVE' AND COALESCE(f.sup1_link,'') = '' AND COALESCE(f.sup2_link,'') = '' AND COALESCE(f.sup3_link,'') = '' " +
      "AND COALESCE(s.s1,'') = '' AND COALESCE(s.s2,'') = '' AND COALESCE(s.s3,'') = ''";
    const m = await env.DB.prepare('SELECT COUNT(*) AS n ' + missSql).first();
    const n = (m && m.n) || 0;
    if (n > 0) {
      const ref = 'engine:sourcing:' + day;
      const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE ref = ?1 LIMIT 1').bind(ref).first();
      if (!seen) {
        const top = await env.DB.prepare('SELECT i.item_id, i.title, i.account, i.sold_30d ' + missSql + ' ORDER BY i.sold_30d DESC LIMIT 12').all();
        const lines = (top.results || []).map((r) => '· ' + String(r.title || r.item_id).slice(0, 55) + ' (' + r.account + ') — ' + r.sold_30d + ' sold/30d').join('\n');
        const msg = n + ' ACTIVE listing(s) have not a single supplier link — not in the sheet, not in the portal. Today\'s task: open Sourcing links → Missing and fill the top sellers first:\n' + lines;
        await notifyRole(env, 'Order Processor', 'Sourcing links missing', msg, ref);
        await notifyRole(env, 'Ops Head', 'Sourcing links missing', msg, ref);
      }
    }
  }
}

/* R5 (Hasib): "if one account does not give an order on ebay in the peak hours of 10am to 11pm
   UK — send an alert to management that the account is SLEEPING, look into it. No order for
   more than one hour in these timings = a message." Effective silence starts at the LATER of
   the last order and 10:00 UK, so the overnight quiet never counts. Tiers 1h/2h/4h/8h re-ring
   a still-sleeping account without 13 letters a day. When nearly every account is silent at
   once the problem is the FEED, not five shops — one letter says so instead of five crying
   wolf about the wrong thing. Only accounts that sold within 7 days play. */
async function sleepWatch(env) {
  const now = new Date();
  const uk = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const ukHour = Number((uk.find((p) => p.type === 'hour') || {}).value || 0);
  const ukMin = Number((uk.find((p) => p.type === 'minute') || {}).value || 0);
  if (ukHour < 10 || ukHour >= 23) return;
  const winStartMs = now.getTime() - ((ukHour - 10) * 60 + ukMin) * 60000;
  const rs = await env.DB.prepare(
    "SELECT account, MAX(created_at) AS last FROM orders WHERE status != 'NOT_FOUND' GROUP BY account " +
    "HAVING MAX(created_at) >= datetime('now', '-7 day')"
  ).all();
  const day = ukDate(now.toISOString());
  const sleeping = [];
  for (const r of (rs.results || [])) {
    const lastMs = new Date(String(r.last)).getTime();
    const gapMin = Math.floor((now.getTime() - Math.max(lastMs, winStartMs)) / 60000);
    if (gapMin > 60) sleeping.push({ account: String(r.account), gapMin, last: String(r.last) });
  }
  if (!sleeping.length) return;
  const total = (rs.results || []).length;
  if (total >= 3 && sleeping.length >= total - 1) {
    const ref = 'engine:sleep:FEED:' + day + ':' + (Math.floor(Math.min(...sleeping.map(s => s.gapMin)) / 120) * 120);
    const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE ref = ?1 LIMIT 1').bind(ref).first();
    if (!seen) await notifyRole(env, 'Management', 'Every account quiet — feed suspect',
      '⚠ ' + sleeping.length + ' of ' + total + ' accounts have no new order for over an hour in UK peak — when they all go quiet TOGETHER the likely cause is the order feed or eBay itself, not the shops. Check Account health → Validation first.', ref);
    return;
  }
  for (const s of sleeping) {
    const tier = s.gapMin >= 480 ? 480 : s.gapMin >= 240 ? 240 : s.gapMin >= 120 ? 120 : 60;
    const ref = 'engine:sleep:' + s.account + ':' + day + ':' + tier;
    const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE ref = ?1 LIMIT 1').bind(ref).first();
    if (!seen) {
      const h = Math.floor(s.gapMin / 60), m = s.gapMin % 60;
      await notifyRole(env, 'Management', 'Account sleeping',
        '🔴 ' + s.account + ' is SLEEPING — no new eBay order for ' + h + 'h' + (m ? m + 'm' : '') +
        ' during UK peak (10:00–23:00). Last order ' + s.last.slice(0, 16).replace('T', ' ') +
        ' UTC. Look into it: listings live? buy box lost? defect? price? If EVERY account is quiet it is the feed — Validation answers that.', ref);
    }
  }
}

/* THE NIGHTLY IS ALLOWED TO MISS — ONCE. Cloudflare skipped the 02:00 tick on 20 Aug and six
   jobs silently didn't run: the books stayed unfinalized, no daily ad reports were kicked, the
   validation never rang. This sentinel rides the half-past slot: any nightly job whose last
   clean run is older than 26 hours gets re-run, at most two per tick (oldest first), so a
   missed night self-repairs within three hours and never blows one invocation's budget. */
async function nightlyCatchup(env) {
  const NIGHTLY = { rollups, backup, adsReportKick, standardsSync, itemStats, selfTestJob };
  const names = Object.keys(NIGHTLY);
  const rs = await env.DB.prepare(
    "SELECT job, last_ok FROM sync_state WHERE account = '' AND job IN ('" + names.join("','") + "')"
  ).all();
  const last = {};
  for (const r of (rs.results || [])) last[r.job] = String(r.last_ok || '');
  /* Anchor on the most recent 02:00 UTC (grace 45 min), not a rolling 26h: after the 20 Aug
     miss was healed by afternoon catch-ups, the VERY NEXT night's miss (21 Aug — two in a row)
     left every nightly "fresh" on the 26h clock until mid-afternoon. Anchored, a missed night
     re-runs from the 03:30 tick and the whole set is healed by breakfast. */
  const nowMs = Date.now();
  let anchor = new Date();
  anchor = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 2, 0, 0);
  if (nowMs < anchor + 45 * 60000) anchor -= 86400000;
  const cutoff = new Date(anchor).toISOString().slice(0, 19).replace('T', ' ');
  const stale = names.filter((j) => !last[j] || last[j] < cutoff)
    .sort((a, b) => (last[a] || '') < (last[b] || '') ? -1 : 1);
  for (const j of stale.slice(0, 2)) {
    await runJob(env, NIGHTLY[j]);
  }
}

/* THE VALIDATION SETUP (Hasib's night list: "test, validate every single calculation... proper
   backend, validation setup, i need to make this live with my organization"). One battery of
   invariant checks over the live data — the same battery serves the on-demand management action
   AND the nightly job that files a letter for every failure. A check never throws; it reports. */
async function selfTestRun(env) {
  const out = [];
  const add = (check, pass, detail) => out.push({ check, pass: !!pass, detail: String(detail).slice(0, 240) });
  const one = async (sql, ...binds) => (await env.DB.prepare(sql).bind(...binds).first()) || {};

  try { // 1. fee sanity: real eBay fees sit at 10-25% of sale — outside that band something is mis-signed or double-counted
    const r = await one("SELECT ROUND(SUM(ebay_fees) * 100.0 / MAX(1, SUM(sold)), 1) AS pct, COUNT(*) AS n FROM orders WHERE ebay_fees > 0 AND created_at >= datetime('now', '-7 day')");
    const pct = Number(r.pct) || 0;
    add('fees within 10-25% of sale (7d)', r.n === 0 || (pct >= 10 && pct <= 25), pct + '% across ' + r.n + ' fee-known orders');
  } catch (e) { add('fees within 10-25% of sale (7d)', false, e.message); }

  try { // 2. no negative fees (the inverted-sign class)
    const r = await one('SELECT COUNT(*) AS n FROM orders WHERE ebay_fees < 0');
    add('no negative eBay fees', Number(r.n) === 0, r.n + ' negative-fee order(s)');
  } catch (e) { add('no negative eBay fees', false, e.message); }

  try { // 3. one order, one row
    const r = await one('SELECT COUNT(*) - COUNT(DISTINCT order_id) AS extra FROM orders');
    add('no duplicate order rows', Number(r.extra) === 0, r.extra + ' duplicate(s)');
  } catch (e) { add('no duplicate order rows', false, e.message); }

  try { // 4. the books reconcile with the orders for the last 2 FULL UK days (±£1 rounding)
    for (let back = 1; back <= 2; back++) {
      const day = ukDate(new Date(Date.now() - back * 86400000).toISOString());
      const startIso = (() => { let ms = Date.parse(day + 'T00:00:00Z'); for (const off of [0, -3600000]) { const c = Date.parse(day + 'T00:00:00Z') + off; if (ukDate(new Date(c).toISOString()) === day && ukDate(new Date(c - 1000).toISOString()) !== day) { ms = c; break; } } return new Date(ms).toISOString(); })();
      const endIso = new Date(Date.parse(startIso) + 86400000).toISOString();
      const o = await one("SELECT ROUND(COALESCE(SUM(sold), 0), 2) AS s FROM orders WHERE created_at >= ?1 AND created_at < ?2 AND status != 'NOT_FOUND'", startIso, endIso);
      const b = await one('SELECT ROUND(COALESCE(SUM(sold), 0), 2) AS s FROM sales_daily WHERE date = ?1', day);
      const diff = Math.abs((Number(o.s) || 0) - (Number(b.s) || 0));
      add('books match orders for ' + day, diff <= Math.max(1, (Number(o.s) || 0) * 0.02), 'orders £' + o.s + ' vs books £' + b.s);
    }
  } catch (e) { add('books match orders', false, e.message); }

  try { // 4b. the books CARRY the VAT law: sales_daily.profit ≈ 0.8 × (oe − cost) per closed day.
    // Guards the 20 Aug rollups change — a regression to pre-law oe−cost books would overstate
    // every profit surface by 25% and nothing else would notice. Small drift is legitimate:
    // orders with no real OE contribute via per-order fallbacks, not the aggregate identity.
    for (let back = 1; back <= 2; back++) {
      const day = ukDate(new Date(Date.now() - back * 86400000).toISOString());
      const b = await one('SELECT ROUND(SUM(profit), 2) AS p, ROUND(0.8 * (SUM(oe) - SUM(cost)), 2) AS law FROM sales_daily WHERE date = ?1', day);
      const p = Number(b.p) || 0, law = Number(b.law) || 0;
      const tol = Math.max(2, Math.abs(law) * 0.03);
      add('books carry the 0.8 law for ' + day, Math.abs(p - law) <= tol, '£' + p.toFixed(2) + ' vs 0.8×(OE−cost) £' + law.toFixed(2));
    }
  } catch (e) { add('books carry the 0.8 law', false, e.message); }

  try { // 4c. no sync job stuck failing: success writes last_error='', so a row still carrying
    // an error with no success for 6h is a feed problem, not a blip. Letters it within a day.
    const rs = await env.DB.prepare(
      "SELECT job, account, last_error FROM sync_state WHERE account != '@lock' AND last_error != '' " +
      "AND (last_ok = '' OR last_ok < datetime('now', '-6 hours')) LIMIT 5"
    ).all();
    const bad = (rs.results || []).map(r => r.job + (r.account ? '·' + r.account : '') + ': ' + String(r.last_error).slice(0, 60));
    add('no sync job stuck failing', bad.length === 0, bad.length ? bad.join(' | ') : 'every job clean or freshly recovered');
  } catch (e) { add('no sync job stuck failing', false, e.message); }

  try { // 4d. every selling account's order feed is ALIVE: an account that sold within the week
    // but has NOTHING for 18h has a dead token or a real sales collapse — both letter-worthy.
    // Dormant-from-the-start accounts never trigger. ISO instants bound from JS (check 9's lesson:
    // 'T'-form stamps never text-compare cleanly against SQL space-form datetimes).
    const iso = (h) => new Date(Date.now() - h * 3600000).toISOString();
    const rs = await env.DB.prepare(
      "SELECT account, MAX(created_at) AS last FROM orders WHERE status != 'NOT_FOUND' GROUP BY account " +
      'HAVING MAX(created_at) >= ?1 AND MAX(created_at) < ?2'
    ).bind(iso(168), iso(18)).all();
    const quiet = (rs.results || []).map(r => r.account + ' (last ' + String(r.last).slice(0, 16) + ')');
    add('every account feed is alive', quiet.length === 0, quiet.length ? 'QUIET: ' + quiet.join(', ') : 'all selling accounts have fresh orders');
  } catch (e) { add('every account feed is alive', false, e.message); }

  try { // 4f. the ACTIVE fleet did not collapse: 798→0 happened silently on 22 Aug when a
    // bindings bug froze listingSync and the ended-marker ate the table. Fewer than 100 ACTIVE
    // items on a 5-shop fleet is an emergency, not a market condition.
    const a = await one('SELECT COUNT(*) AS n FROM items_api WHERE status = ?1', 'ACTIVE');
    add('ACTIVE listings fleet alive', Number(a.n) > 100, Number(a.n) + ' ACTIVE listings on record');
  } catch (e) { add('ACTIVE listings fleet alive', false, e.message); }

  try { // 4e. the off-site Sheets backup stamped within 26h — Hasib's "portal dies" insurance.
    // Arms only after the first successful night, so day one never cries wolf.
    const raw = await env.HOT.get('backup:last');
    const st = raw ? JSON.parse(raw) : null;
    if (!st) add('nightly Sheets backup fresh', true, 'not armed yet — first backup has not stamped');
    else {
      const ageH = (Date.now() - new Date(st.at).getTime()) / 3600000;
      add('nightly Sheets backup fresh', !!st.ok && ageH < 26,
        (st.ok ? '' : 'LAST RUN FAILED (' + (st.fails || []).join(', ').slice(0, 80) + ') · ') +
        st.tables + ' tables, ' + st.rows + ' rows, ' + ageH.toFixed(1) + 'h ago');
    }
  } catch (e) { add('nightly Sheets backup fresh', false, e.message); }

  try { // 5. the P&L law recomputes (7d totals): Raw = 0.8 × (OE − Ali) — the central-sheet brain
    const t = await one("SELECT ROUND(SUM(sold), 2) AS rev, ROUND(SUM(CASE WHEN ebay_fees > 0 THEN ebay_fees ELSE 0 END), 2) AS fees, ROUND(SUM(cost), 2) AS cost FROM orders WHERE status != 'NOT_FOUND' AND created_at >= datetime('now', '-7 day')");
    const rev = Number(t.rev) || 0, fees = Number(t.fees) || 0, cost = Number(t.cost) || 0;
    const oe = rev - fees, raw = 0.8 * (oe - cost);
    add('P&L law recomputes (0.8 × (OE − Ali))', isFinite(raw) && oe >= 0, '7d: rev £' + rev.toFixed(0) + ' → OE £' + oe.toFixed(0) + ' → raw £' + raw.toFixed(0));
  } catch (e) { add('P&L law recomputes (0.8 × (OE − Ali))', false, e.message); }

  try { // 6. ads continuity: each of the last 2 full days has ad rows in the daily books
    for (let back = 1; back <= 2; back++) {
      const day = ukDate(new Date(Date.now() - back * 86400000).toISOString());
      const r = await one('SELECT ROUND(COALESCE(SUM(spend + cpc_spend), 0), 2) AS sp, COUNT(*) AS n FROM ads_daily WHERE date = ?1', day);
      add('ad books present for ' + day, Number(r.n) > 0, '£' + r.sp + ' across ' + r.n + ' rows' + (Number(r.n) === 0 ? ' — the daily report may not have landed yet' : ''));
    }
  } catch (e) { add('ad books present', false, e.message); }

  try { // 7. intraday rollover: every ads_today row carries today's UK day
    const r = await one('SELECT COUNT(*) AS n FROM ads_today WHERE day != ?1', ukDate(''));
    add('intraday ads carry only today', Number(r.n) === 0, r.n + ' stale-day row(s)');
  } catch (e) { add('intraday ads carry only today', false, e.message); }

  try { // 8. no ACTIVE listing at a zero or negative price
    const r = await one("SELECT COUNT(*) AS n FROM items_api WHERE status = 'ACTIVE' AND price <= 0");
    add('no zero-priced active listings', Number(r.n) === 0, r.n + ' listing(s) at £0');
  } catch (e) { add('no zero-priced active listings', false, e.message); }

  try { // 9b. the intraday pipeline agrees with eBay's official daily report (once it lands):
    // the rollover records each dying day's final intraday total; when ads_daily has that day,
    // the two must sit within max(£15, 20%) — different attribution timing, same money.
    const fin = await one("SELECT cursor FROM sync_state WHERE job = 'adsIntradayFinal' AND account = ''");
    const m = String((fin && fin.cursor) || '').match(/^(\d{4}-\d{2}-\d{2}):([0-9.]+)$/);
    if (m) {
      const dayF = m[1], intr = Number(m[2]) || 0;
      const dd = await one('SELECT ROUND(COALESCE(SUM(spend + cpc_spend), 0), 2) AS sp, COUNT(*) AS n FROM ads_daily WHERE date = ?1', dayF);
      if (Number(dd.n) > 0) {
        const daily = Number(dd.sp) || 0;
        const tol = Math.max(15, daily * 0.2);
        add('intraday agrees with the daily report (' + dayF + ')', Math.abs(daily - intr) <= tol,
          'intraday closed at £' + intr.toFixed(2) + ' vs official £' + daily.toFixed(2));
      } else {
        add('intraday agrees with the daily report (' + dayF + ')', true, 'official report not landed yet — the ad-books check guards that side');
      }
    }
  } catch (e) { add('intraday agrees with the daily report', false, e.message); }

  try { // 9. nothing dated in the future — the bound is an ISO instant because created_at is
    // ISO 'T'-form and SQL's space-form datetime('now') TEXT-compares below EVERY same-day ISO
    // stamp (this very check flagged 170 of today's orders as "future" on its first run)
    const r = await one("SELECT (SELECT COUNT(*) FROM orders WHERE created_at > ?1) + (SELECT COUNT(*) FROM sales_daily WHERE date > date('now', '+1 day')) AS n", new Date(Date.now() + 3600000).toISOString());
    add('nothing dated in the future', Number(r.n) === 0, r.n + ' future-dated row(s)');
  } catch (e) { add('nothing dated in the future', false, e.message); }

  return out;
}

/* Nightly: every failed check becomes a letter to Management — the validation is standing, not
   a one-off. Ref carries the day so a persistent failure rings daily until fixed, once a day. */
async function selfTestJob(env) {
  const results = await selfTestRun(env);
  const fails = results.filter((r) => !r.pass);
  for (const f of fails.slice(0, 8)) {
    await queueNotify(env, 'management', 'Validation failed',
      '🔴 ' + f.check + ' — ' + f.detail, 'engine:selftest:' + ukDate('') + ':' + f.check.replace(/[^a-z0-9]+/gi, '-').slice(0, 40));
  }
  await ctx_setSync(env, 'selfTest', '', results.length + ' checks, ' + fails.length + ' failed');
}

/* Item 9's bell: the advertising person hears ONCE a day how many active listings sit in no
   campaign — a digest, not a flood; the list itself lives on the Campaign watch screen. */
async function uncampaignedDigest(env) {
  const today = ukDate('');
  const st = await env.DB.prepare("SELECT cursor FROM sync_state WHERE job = 'uncampaignedDigest' AND account = ''").first();
  if (st && String(st.cursor) === today) return;
  const rs = await env.DB.prepare(
    "SELECT account, COUNT(*) AS n FROM items_api ia WHERE status = 'ACTIVE' " +
    'AND NOT EXISTS (SELECT 1 FROM campaign_ads ca WHERE ca.listing_id = ia.item_id) GROUP BY account'
  ).all();
  const rows = rs.results || [];
  const total = rows.reduce((s, r) => s + Number(r.n || 0), 0);
  if (total) {
    await notifyRole(env, 'Advertising Manager', 'Listings in no campaign',
      total + ' active listing(s) sit in no campaign: ' + rows.map((r) => r.account + ' ' + r.n).join(', ') +
      '. The full list is on the Campaign watch screen.', 'engine:uncamp:' + today);
  }
  await ctx_setSync(env, 'uncampaignedDigest', '', today);
}

async function zeroSaleScan(env) {
  const rs = await env.DB.prepare(
    "SELECT i.item_id, i.account, i.title, i.price, " +
    "  CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END AS born, " +
    "  CASE WHEN i.start_time != '' THEN 'eBay start time' ELSE 'first seen by portal' END AS clock " +
    "FROM items_api i " +
    "WHERE i.status = 'ACTIVE' AND (CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END) != '' " +
    "  AND (CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END) <= datetime('now', '-7 day') " +
    "  AND (CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END) >= datetime('now', '-21 day') " +
    "  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.item_id = i.item_id) " +
    "  AND NOT EXISTS (SELECT 1 FROM listing_decisions d WHERE d.item_id = i.item_id) " +
    'LIMIT 25'
  ).all();
  const rows = rs.results || [];
  /* R7-6 (Hasib): "any account item with no orders in 7 days → product revision task with
     explained reason". The reason is computed per item and stored on the board row so the
     Listing Manager sees WHY, not just WHICH. */
  const reasonFor = (r) => {
    const bornMs = Date.parse(String(r.born).replace(' ', 'T'));   // ISO or space-separated both parse
    const days = isFinite(bornMs) ? Math.max(7, Math.floor((Date.now() - bornMs) / 86400000)) : 7;
    return days + ' days live (' + r.clock + ' ' + String(r.born).slice(0, 10) + '), £' +
      (Number(r.price) || 0).toFixed(2) + ', 0 orders — revise the title, main image, price or campaign, or end it.';
  };
  const ins = rows.map((r) => env.DB.prepare(
    "INSERT OR IGNORE INTO listing_decisions (item_id, account, title, price, born, clock, flagged_at, status, decided_by, decided_at, assignee, note) " +
    "VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), 'PENDING', '', '', '', ?7)"
  ).bind(r.item_id, r.account, String(r.title || ''), Number(r.price) || 0, String(r.born), String(r.clock), reasonFor(r)));
  for (let i = 0; i < ins.length; i += 50) await env.DB.batch(ins.slice(i, i + 50));
  const queued = rows.length;
  if (queued) {
    await notifyRole(env, 'Management', 'Zero-sale listings need a decision',
      queued + ' new listing(s) passed 7 days with no sale — decide end or revise on the Listing decisions board.',
      'engine:zerosale:' + ukDate(''));
    /* the person who can actually revise it hears about each item with its reason, once ever */
    for (const r of rows.slice(0, 12)) {
      await notifyRole(env, 'Listing Manager', 'Product revision needed (7-day no sale)',
        '🟠 ' + r.account + ' · ' + r.item_id + (r.title ? ' · ' + String(r.title).slice(0, 55) : '') +
        ' — ' + reasonFor(r), 'engine:zerosale:item:' + r.item_id);
    }
  }
}

/* R7-6 (Hasib): "72h CPC revision alert to the listing manager". The Day-0 dummy becomes the
   real competitor-based listing at +72h, when its CPC must be set/revised. An item that has
   passed 72 hours and still sits in NO campaign missed that step — alert the Listing Manager and
   the Advertising Manager, once per item (alert_log's ref dedupe is the guard). */
async function cpcRevisionWatch(env) {
  const rs = await env.DB.prepare(
    "SELECT i.item_id, i.account, i.title, " +
    "  CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END AS born " +
    "FROM items_api i " +
    "WHERE i.status = 'ACTIVE' AND (CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END) != '' " +
    "  AND (CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END) <= datetime('now', '-72 hours') " +
    "  AND (CASE WHEN i.start_time != '' THEN i.start_time ELSE i.first_seen END) >= datetime('now', '-10 day') " +
    "  AND NOT EXISTS (SELECT 1 FROM campaign_ads ca WHERE ca.listing_id = i.item_id) " +
    "  AND NOT EXISTS (SELECT 1 FROM alert_log WHERE ref = 'engine:cpc72:' || i.item_id) " +
    'ORDER BY born ASC LIMIT 12'
  ).all();
  for (const r of (rs.results || [])) {
    const msg = '⏱ 72-hour CPC revision due · ' + r.account + ' · ' + r.item_id +
      (r.title ? ' · ' + String(r.title).slice(0, 55) : '') + ' — live since ' + String(r.born).slice(0, 10) +
      ' and still in no campaign. Set or revise the CPC now: at 72 hours the dummy is the real listing.';
    const ref = 'engine:cpc72:' + r.item_id;
    await notifyRole(env, 'Listing Manager', 'CPC revision due (72h)', msg, ref);
    await notifyRole(env, 'Advertising Manager', 'CPC revision due (72h)', msg, ref);
  }
}

/* R7-7 (Hasib): "every alert must be acknowledged within 2 hours with written feedback, strict
   for pricing and advertising". A money alert — price, CPC, campaign, ad waste — is STRICT: its
   SLA is 2 hours, it cannot be bulk-cleared, and its acknowledgement demands a real note. */
function alertStrict(type) {
  return /price|pricing|cpc|campaign|advertis|waste|roas|ad ?spend|ad ?fee/i.test(String(type || ''));
}

/* Open alerts past their SLA escalate to Management once each. Strict money alerts breach at 2
   hours; everything else gets a 6-hour grace so the mail does not become noise. The escalation is
   itself a letter (ref engine:acksla:<id>) so it never re-escalates and never files twice. */
async function alertAckWatch(env) {
  const rows = (await env.DB.prepare(
    "SELECT id, to_addr, type, message, created_at FROM alert_log " +
    "WHERE resolved_at = '' AND type != 'Alert not acknowledged in time' " +
    "  AND to_addr NOT IN ('management') " +
    "  AND created_at <= datetime('now', '-2 hours') " +
    "  AND NOT EXISTS (SELECT 1 FROM alert_log a2 WHERE a2.ref = 'engine:acksla:' || alert_log.id) " +
    'ORDER BY created_at ASC LIMIT 25'
  ).all()).results || [];
  for (const r of rows) {
    const strict = alertStrict(r.type);
    const ageMs = Date.now() - Date.parse(String(r.created_at).replace(' ', 'T') + 'Z');
    const ageH = isFinite(ageMs) ? Math.floor(ageMs / 3600000) : 2;
    if (!strict && ageH < 6) continue;                     // gentle 6-hour grace for non-money alerts
    const msg = (strict ? '⛔ STRICT SLA breach (2h) · ' : '⚠ Alert unacknowledged · ') +
      String(r.type) + ' → ' + String(r.to_addr) + ' has sat ' + ageH + 'h with no written feedback. ' +
      'Original: ' + String(r.message || '').slice(0, 180) + ' — chase the acknowledgement now.';
    await notifyRole(env, 'Management', 'Alert not acknowledged in time', msg, 'engine:acksla:' + r.id);
  }
}

async function statusRefresh(env) {
  const rs = await env.DB.prepare(
    "SELECT order_id, account FROM orders WHERE status NOT IN ('FULFILLED','NOT_FOUND','CANCELLED') AND created_at < datetime('now', '-6 day') ORDER BY created_at ASC LIMIT 20"
  ).all();
  const rows = rs.results || [];
  if (!rows.length) return;
  const byAcct = {};
  for (const r of rows) (byAcct[r.account] = byAcct[r.account] || []).push(r.order_id);
  let refreshed = 0;
  for (const acct of Object.keys(byAcct)) {
    let tok;
    try { tok = await ebayAccessToken(env, acct); } catch (e) { continue; }
    for (const oid of byAcct[acct]) {
      const r = await fetch('https://api.ebay.com/sell/fulfillment/v1/order/' + encodeURIComponent(oid), {
        headers: { authorization: 'Bearer ' + tok } });
      if (r.status === 404) {
        await env.DB.prepare("UPDATE orders SET status = 'NOT_FOUND' WHERE order_id = ?1").bind(oid).run();
        continue;
      }
      if (!r.ok) continue;
      const o = await r.json();
      let shipBy = '';
      for (const li of (o.lineItems || [])) {
        const d = String(((li.lineItemFulfillmentInstructions || {}).shipByDate) || '');
        if (d && (!shipBy || d < shipBy)) shipBy = d;
      }
      const rfCancelled = String(((o.cancelStatus || {}).cancelState) || '') === 'CANCELED';
      await env.DB.prepare('UPDATE orders SET status = ?2, ship_by = ?3 WHERE order_id = ?1')
        .bind(oid, rfCancelled ? 'CANCELLED' : String(o.orderFulfillmentStatus || ''), shipBy).run();
      refreshed++;
    }
  }
  await env.DB.prepare(
    "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('statusRefresh', '', ?1, datetime('now'), '') " +
    "ON CONFLICT(job, account) DO UPDATE SET cursor = ?1, last_ok = datetime('now'), last_error = ''"
  ).bind(refreshed + ' refreshed, ' + rows.length + ' scanned').run();

  /* Review 3, late-tracking ledger: an order that crosses 2 BUSINESS days with no dispatch is
     marked PERMANENTLY (INSERT OR IGNORE — the mark survives even after the order finally
     ships), so the Item risk board can count how often each listing does this. History cannot
     be reconstructed backwards (only current status is stored), so counting starts 21 Aug. */
  const twoBiz = (() => {
    let d = new Date(); let left = 2;
    while (left > 0) { d = new Date(d.getTime() - 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6) left--; }
    return d.toISOString();
  })();
  await env.DB.prepare(
    'INSERT OR IGNORE INTO late_marks (order_id, account, item_id, created_at, marked_at) ' +
    "SELECT order_id, account, item_id, created_at, datetime('now') FROM orders " +
    "WHERE status IN ('NOT_STARTED', 'IN_PROGRESS') AND created_at <= ?1"
  ).bind(twoBiz).run();
}

async function orderSync(env) {
  await perAccount(env, 'orderSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    // 6 days, not 3: the CHINA recheck looks at day-4 orders, and their fulfillment status must
    // still be refreshing when that checkpoint reads them (2-3 pages per account at 100/page).
    const since = new Date(Date.now() - 6 * 86400000).toISOString();
    let href = 'https://api.ebay.com/sell/fulfillment/v1/order?limit=100&filter=' +
      encodeURIComponent('creationdate:[' + since + '..]');
    // Known state up front: 288 ticks a day rewriting ~800 unchanged rows would burn the whole
    // D1 write budget by itself. A row is written only when something about it changed.
    const knownO = {};
    const ko = await env.DB.prepare('SELECT order_id, status, qty, est_delivery, ship_by FROM orders WHERE account = ?1 AND created_at >= ?2').bind(acct, since).all();
    for (const r of (ko.results || [])) knownO[r.order_id] = String(r.status) + '|' + String(r.qty) + '|' + String(r.est_delivery) + '|' + String(r.ship_by || '');

    let n = 0;
    while (href && n < 4) {              // 400 orders per 6-day window per account — ample here
      const r = await fetch(href, { headers: { authorization: 'Bearer ' + tok } });
      if (!r.ok) throw new Error(acct + ' orders ' + r.status);
      const page = await r.json();
      for (const o of (page.orders || [])) {
        const line = (o.lineItems && o.lineItems[0]) || {};
        // total units across every line; item_id stays the first line's (the sheet's own shape)
        let qty = 0;
        for (const li of (o.lineItems || [])) qty += Number(li.quantity) || 0;
        qty = Math.max(1, qty);
        const fsi = (o.fulfillmentStartInstructions || [])[0] || {};
        const est = String(fsi.maxEstimatedDeliveryDate || '');
        /* SHIP-BY is eBay's own deadline for this order, per line item. The portal used to invent
           it as "order date + 5 days" for every order alike, which is simply not what eBay
           promised the buyer: the handling time is set per listing, so a 1-day-handling item was
           being called on time four days after it was already late. Earliest line wins — the
           order is late as soon as any part of it is. */
        let shipBy = '';
        for (const li of (o.lineItems || [])) {
          const d = String(((li.lineItemFulfillmentInstructions || {}).shipByDate) || '');
          if (d && (!shipBy || d < shipBy)) shipBy = d;
        }
        /* Night review: cancelled orders sat in Awaiting/Overdue for ever — fulfillment
           status never says cancelled; cancelStatus does. A cancelled order leaves every open
           bucket and joins its own pile. */
        const cancelled = String(((o.cancelStatus || {}).cancelState) || '') === 'CANCELED';
        const status = cancelled ? 'CANCELLED' : String(o.orderFulfillmentStatus || '');
        const id = String(o.orderId);
        if (knownO[id] === status + '|' + qty + '|' + est + '|' + shipBy) continue;   // unchanged → no write
        await env.DB.prepare(
          'INSERT INTO orders (order_id, account, item_id, sold, status, buyer, created_at, qty, est_delivery, ship_by) ' +
          'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) ' +
          'ON CONFLICT(order_id) DO UPDATE SET status=?5, qty=?8, est_delivery=?9, ship_by=?10'
        ).bind(
          id, acct, String(line.legacyItemId || ''),
          Number((o.pricingSummary && o.pricingSummary.total && o.pricingSummary.total.value) || 0),
          status, String((o.buyer && o.buyer.username) || ''),
          String(o.creationDate || ''), qty, est, shipBy
        ).run();
      }
      n++; href = page.next || '';
    }
  });
}

/* Engine → portal bell, in two halves. Enqueue is a D1 write — it can never fail an eBay job,
   never spends a fetch, and survives the invocation. The flush at the end of every scheduled
   run delivers up to 8 oldest (bounded against the 50-subrequest budget); what does not go out
   now goes out next tick, so a burst degrades to a trickle instead of silence. A message is
   deleted only after Apps Script says ok — delivery is the fact, not the attempt — and one that
   keeps failing is dropped after ~30 tries with its fate recorded in sync_state. */
async function queueNotify(env, to, type, message, ref) {
  await env.DB.prepare(
    "INSERT INTO notify_queue (to_addr, type, message, ref, created_at, tries) VALUES (?1, ?2, ?3, ?4, datetime('now'), 0)"
  ).bind(String(to), String(type), String(message).slice(0, 900), String(ref)).run();
  /* Hasib item 7: a bell that vanishes after sending is why the alerts centre read as useless.
     Every bell is also a letter in alert_log — subject, body, who, when — so the centre can show
     it like mail and let someone mark it handled. Same (recipient, ref) never files twice. */
  try {
    await env.DB.prepare(
      "INSERT INTO alert_log (to_addr, type, message, ref, created_at) " +
      "SELECT ?1, ?2, ?3, ?4, datetime('now') WHERE NOT EXISTS (SELECT 1 FROM alert_log WHERE to_addr = ?1 AND ref = ?4)"
    ).bind(String(to), String(type), String(message).slice(0, 900), String(ref)).run();
  } catch (e) { /* the letter is best-effort — the bell itself must never fail on it */ }
}

/* The bell law fans out by role too: CS events must reach the CS people, not just management —
   the users table is synced from the Portal DB, so the Worker can address them directly. */
async function notifyRole(env, role, type, message, ref) {
  const rs = await env.DB.prepare("SELECT email FROM users WHERE role = ?1 AND status = 'approved'").bind(role).all();
  for (const u of (rs.results || []).slice(0, 6)) {
    await queueNotify(env, u.email, type, message, ref);
  }
}

async function flushNotifyQueue(env) {
  /* CLAIM-AS-LEASE before send: the five cron slots coincide at every quarter-hour and each ends
     in a flush. A bare tries compare-and-swap still double-sent when the second flush SELECTed
     mid-send (it read the post-claim tries and won its own swap) — the lease closes that window:
     a claimed row is invisible to other flushes for 60 seconds, far past the 8-second send. */
  const rs = await env.DB.prepare(
    "SELECT id, to_addr, type, message, ref, tries FROM notify_queue " +
    "WHERE claimed_at = '' OR claimed_at < datetime('now', '-60 second') ORDER BY id LIMIT 8"
  ).all();
  for (const row of (rs.results || [])) {
    const claim = await env.DB.prepare(
      "UPDATE notify_queue SET tries = tries + 1, claimed_at = datetime('now') " +
      "WHERE id = ?1 AND tries = ?2 AND (claimed_at = '' OR claimed_at < datetime('now', '-60 second'))"
    ).bind(row.id, Number(row.tries) || 0).run();
    if (!claim.meta || !claim.meta.changes) continue;
    let ok = false;
    try {
      const r = await fetch(env.AS_URL, {
        method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'engineNotify',
          payload: { key: await secret(env, 'SYNC_KEY'), to: row.to_addr, type: row.type, message: row.message, ref: row.ref } }),
        signal: AbortSignal.timeout(8000),
      });
      const body = r.ok ? await r.json().catch(() => ({})) : {};
      ok = !!body.ok;
    } catch (e) { ok = false; }
    if (ok) {
      await env.DB.prepare('DELETE FROM notify_queue WHERE id = ?1').bind(row.id).run();
    } else if (Number(row.tries) >= 30) {
      await env.DB.prepare('DELETE FROM notify_queue WHERE id = ?1').bind(row.id).run();
      await env.DB.prepare(
        "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('notifyQueue', '', '', '', ?1) " +
        'ON CONFLICT(job, account) DO UPDATE SET last_error = ?1'
      ).bind(('dropped after 30 tries: ' + row.type + ' → ' + row.to_addr).slice(0, 300)).run();
    }
    /* No else: the claim above already advanced tries — the row simply waits for the next flush. */
  }
}

/* Campaign watcher (V2 req 4/21/22, campaign level): every 5 minutes the live campaign list is
   diffed against the last snapshot — created, ended, paused, reactivated, renamed, budget moved.
   The honesty rule is structural here: the API never says WHO changed anything, so the message
   says "on eBay" and only the portal's own edits ever carry a name. Item-level membership and
   duplicate-ACTIVE detection ride adsItemsTick below (rolling per-account, subrequest budget). */
async function adsSync(env) {
  await perAccount(env, 'adsSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const r = await fetch('https://api.ebay.com/sell/marketing/v1/ad_campaign?limit=100', {
      headers: { authorization: 'Bearer ' + tok } });
    if (!r.ok) {
      const body = (await r.text()).slice(0, 400);
      /* A 403 here is usually a STATUS, not a fault: eBay refuses the campaign list outright
         for sellers who are not enrolled in Promoted Listings. Say what eBay said, verbatim,
         and record it as a known state so the screens stop calling it an error. */
      if (r.status === 403) {
        let said = '';
        try { const j = JSON.parse(body); said = String((j.errors || [{}])[0].message || (j.errors || [{}])[0].longMessage || ''); } catch (e) { said = body.slice(0, 160); }
        await env.DB.prepare(
          "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('adsEnrolment', ?1, '', datetime('now'), ?2) " +
          'ON CONFLICT(job, account) DO UPDATE SET last_ok = datetime(\'now\'), last_error = ?2'
        ).bind(acct, ('not enrolled in Promoted Listings — eBay says: ' + said).slice(0, 300)).run();
        return;                                   // not an error: nothing to diff, nothing to alarm
      }
      throw new Error(acct + ' campaigns ' + r.status + ': ' + body.slice(0, 160));
    }
    await env.DB.prepare("DELETE FROM sync_state WHERE job = 'adsEnrolment' AND account = ?1").bind(acct).run();
    const page = await r.json();
    const live = {};
    for (const c of (page.campaigns || [])) {
      const budget = String((c.budget && c.budget.daily && c.budget.daily.amount && c.budget.daily.amount.value) || '');
      /* COST_PER_SALE (Promoted Listings Standard) or COST_PER_CLICK (Advanced). Nothing recorded
         this before, which is why nobody could answer why the ad-spend report refused the CPC
         metrics: eBay's own words were "the metric key is not supported for the funding model".
         Under COST_PER_SALE a click that never sells genuinely costs nothing, so an account can
         truthfully show clicks against £0.00 — that is a fact about the campaign, not a bug, and
         the portal should be able to say so. */
      const funding = String((c.fundingStrategy && c.fundingStrategy.fundingModel) || '');
      live[c.campaignId] = { name: String(c.campaignName || ''), status: String(c.campaignStatus || ''), budget, funding };
    }
    const prevRs = await env.DB.prepare('SELECT campaign_id, name, status, budget FROM campaigns WHERE account = ?1').bind(acct).all();
    const prev = {};
    for (const row of (prevRs.results || [])) prev[row.campaign_id] = row;
    const firstSnapshot = Object.keys(prev).length === 0;

    const events = [];
    for (const id of Object.keys(live)) {
      const l = live[id], p = prev[id];
      if (!p) { if (!firstSnapshot) events.push({ id, type: 'created', old: '', nw: l.status, l }); }
      else {
        if (p.status !== l.status) events.push({ id, type: 'status', old: p.status, nw: l.status, l });
        if (p.budget !== l.budget && (p.budget || l.budget)) events.push({ id, type: 'budget', old: p.budget, nw: l.budget, l });
        if (p.name !== l.name) events.push({ id, type: 'renamed', old: p.name, nw: l.name, l });
      }
    }
    for (const id of Object.keys(prev)) {
      if (!live[id]) events.push({ id, type: 'removed', old: prev[id].status, nw: '', l: prev[id] });
    }

    /* Every event is recorded — a mass pause is exactly when the audit trail matters most, and
       a D1 insert costs nothing. Bells are bounded: the first 4 changes ring by name, the rest
       fold into one summary line, and the queue paces actual delivery. */
    let evN = 0;
    for (const ev of events) {
      evN++;
      const nm = ev.l.name || ev.id;
      let msg = '';
      if (ev.type === 'status') {
        const paused = /PAUSED|ENDED/i.test(ev.nw);
        msg = (paused ? '🔴 Campaign ' + (/ENDED/i.test(ev.nw) ? 'ENDED' : 'PAUSED') : '🟠 Campaign ' + ev.nw) +
          ' on eBay · ' + acct + ' · "' + nm + '" — ' + ev.old + ' → ' + ev.nw +
          (paused ? '. Its items just lost ads coverage — if nobody intended this, reactivate it.' : '.') +
          ' (Changed on eBay — the portal cannot see who.)';
      } else if (ev.type === 'budget') {
        msg = '🟠 Campaign budget changed on eBay · ' + acct + ' · "' + nm + '" — £' + (ev.old || '0') + ' → £' + (ev.nw || '0') +
          '/day. Spend changes from today. (Changed on eBay — the portal cannot see who.)';
      } else if (ev.type === 'created') {
        msg = '🔵 New campaign on eBay · ' + acct + ' · "' + nm + '" (' + ev.nw + '). If Zain did not create this, ask who did.';
      } else if (ev.type === 'removed') {
        msg = '🟠 Campaign gone from eBay · ' + acct + ' · "' + nm + '" — it no longer appears in the account\'s campaign list.';
      } else {
        msg = '🔵 Campaign renamed on eBay · ' + acct + ' · "' + ev.old + '" → "' + ev.nw + '".';
      }
      await env.DB.prepare(
        "INSERT INTO campaign_events (account, campaign, item_id, change_type, old, new, actor, at) VALUES (?1, ?2, '', ?3, ?4, ?5, '', datetime('now'))"
      ).bind(acct, nm, ev.type, String(ev.old), String(ev.nw)).run();
      if (evN <= 4) {
        await queueNotify(env, 'management', 'Campaign changed', msg, 'engine:camp:' + acct + ':' + ev.id + ':' + ev.type);
        await queueNotify(env, 'advertising', 'Campaign changed', msg, 'engine:camp:' + acct + ':' + ev.id + ':' + ev.type);
      }
    }
    if (events.length > 4) {
      const more = '🟠 ' + (events.length - 4) + ' more campaign change(s) on eBay · ' + acct +
        ' in the same 5 minutes — open Campaign watch for the full list.';
      await queueNotify(env, 'management', 'Campaign changed', more, 'engine:campmore:' + acct);
      await queueNotify(env, 'advertising', 'Campaign changed', more, 'engine:campmore:' + acct);
    }

    for (const id of Object.keys(live)) {
      const l = live[id];
      await env.DB.prepare(
        "INSERT INTO campaigns (account, campaign_id, name, status, budget, funding_model, synced_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now')) " +
        "ON CONFLICT(account, campaign_id) DO UPDATE SET name=?3, status=?4, budget=?5, funding_model=?6, synced_at=datetime('now')"
      ).bind(acct, id, l.name, l.status, l.budget, l.funding || '').run();
    }
    for (const id of Object.keys(prev)) {
      if (!live[id]) await env.DB.prepare('DELETE FROM campaigns WHERE account = ?1 AND campaign_id = ?2').bind(acct, id).run();
    }

  });
}

/* Item-level membership (req 22) — its own 15-minute job so its fetches never share an
   invocation with orderSync. Per account per tick: up to 2 RUNNING campaigns (from the D1
   snapshot, so the two marketing-403 accounts cost zero fetches), rolling cursor, and only the
   CHANGED rows are written — a full-table rewrite every tick would burn through D1's 100k
   rows-written/day free budget by mid-morning. Rule-based (dynamic/smart) campaigns have no ad
   list — eBay answers 4xx — and simply advance the cursor.

   Duplicate-ACTIVE (counts RUNNING only) is confirmed, not guessed: an item must stay
   duplicated for 90+ minutes — longer than a full rotation — before anything fires, because a
   normal move between campaigns looks duplicated until the old campaign's next refresh. State
   lives in dup_state (D1), never KV: per-item KV markers would blow the 1k-writes/day KV cap.
   Bells are one summary per account per UK day, not one per item — the full list lives on the
   Campaign watch screen, which is the action link. */
const ADS_ITEM_CAMPAIGNS_PER_TICK = 2;
const DUP_CONFIRM_MS = 90 * 60000;

async function adsItems(env) {
  await perAccount(env, 'adsItems', async (acct) => {
    const camps = await env.DB.prepare(
      "SELECT campaign_id, name FROM campaigns WHERE account = ?1 AND status LIKE '%RUNNING%' ORDER BY campaign_id"
    ).bind(acct).all();
    const running = (camps.results || []);
    if (!running.length) return;
    const tok = await ebayAccessToken(env, acct);

    const st = await env.DB.prepare("SELECT cursor FROM sync_state WHERE job = 'adsItems' AND account = ?1").bind(acct).first();
    let idx = (Math.max(0, Number(st && st.cursor) || 0)) % running.length;

    for (let k = 0; k < Math.min(ADS_ITEM_CAMPAIGNS_PER_TICK, running.length); k++) {
      const cid = running[idx].campaign_id;
      const nm = running[idx].name || cid;
      idx = (idx + 1) % running.length;

      let ads = [];
      let ok = true;
      for (let page = 0; page < 2; page++) {          // 1000 ads covers any campaign here; capped, not silent
        const r = await fetch('https://api.ebay.com/sell/marketing/v1/ad_campaign/' + encodeURIComponent(cid) +
          '/ad?limit=500&offset=' + (page * 500), { headers: { authorization: 'Bearer ' + tok } });
        if (!r.ok) {
          if (r.status >= 500) throw new Error(acct + ' ads ' + cid + ' ' + r.status);
          ok = false; break;                           // 4xx: rule-based campaign, no ad list — skip
        }
        const pj = await r.json();
        ads = ads.concat(pj.ads || []);
        if (ads.length >= Number(pj.total || 0) || !(pj.ads || []).length) break;
      }
      if (!ok) continue;

      const now = {};
      for (const ad of ads) {
        const lid = String(ad.listingId || '');
        if (lid) now[lid] = { ad_id: String(ad.adId || ''), bid: String(ad.bidPercentage || '') };
      }
      const prevRs = await env.DB.prepare('SELECT listing_id, bid_pct FROM campaign_ads WHERE account = ?1 AND campaign_id = ?2').bind(acct, cid).all();
      const prev = {};
      for (const row of (prevRs.results || [])) prev[row.listing_id] = String(row.bid_pct || '');
      const first = Object.keys(prev).length === 0;

      const added = Object.keys(now).filter(l => !(l in prev));
      const removed = Object.keys(prev).filter(l => !(l in now));
      const bidMoved = Object.keys(now).filter(l => (l in prev) && prev[l] !== now[l].bid);

      if (!first && (added.length || removed.length || bidMoved.length)) {
        const sample = ids => ids.length ? ' (' + ids.slice(0, 3).join(', ') + (ids.length > 3 ? ', …' : '') + ')' : '';
        const parts = [];
        if (added.length) parts.push(added.length + ' item(s) added' + sample(added));
        if (removed.length) parts.push(removed.length + ' removed' + sample(removed));
        if (bidMoved.length) parts.push(bidMoved.length + ' bid change(s)' + sample(bidMoved));
        const msg = '🔵 Campaign items changed on eBay · ' + acct + ' · "' + nm + '" — ' + parts.join(' · ') +
          '. (Changed on eBay — the portal cannot see who.)';
        await env.DB.prepare(
          "INSERT INTO campaign_events (account, campaign, item_id, change_type, old, new, actor, at) VALUES (?1, ?2, ?3, 'items', ?4, ?5, '', datetime('now'))"
        ).bind(acct, nm, added.concat(removed).slice(0, 5).join(','), removed.length + ' out', added.length + ' in / ' + bidMoved.length + ' bid').run();
        await queueNotify(env, 'advertising', 'Campaign items', msg, 'engine:campitems:' + acct + ':' + cid);
      }

      const stmts = [];
      for (const lid of added) {
        stmts.push(env.DB.prepare(
          "INSERT INTO campaign_ads (account, campaign_id, listing_id, ad_id, bid_pct, synced_at) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now')) " +
          "ON CONFLICT(account, campaign_id, listing_id) DO UPDATE SET ad_id = ?4, bid_pct = ?5, synced_at = datetime('now')"
        ).bind(acct, cid, lid, now[lid].ad_id, now[lid].bid));
      }
      for (const lid of bidMoved) {
        stmts.push(env.DB.prepare(
          "UPDATE campaign_ads SET bid_pct = ?4, ad_id = ?5, synced_at = datetime('now') WHERE account = ?1 AND campaign_id = ?2 AND listing_id = ?3"
        ).bind(acct, cid, lid, now[lid].bid, now[lid].ad_id));
      }
      for (const lid of removed) {
        stmts.push(env.DB.prepare('DELETE FROM campaign_ads WHERE account = ?1 AND campaign_id = ?2 AND listing_id = ?3').bind(acct, cid, lid));
      }
      for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
      await env.DB.prepare("UPDATE campaigns SET ads_synced_at = datetime('now') WHERE account = ?1 AND campaign_id = ?2").bind(acct, cid).run();
    }

    await env.DB.prepare(
      "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('adsItems', ?1, ?2, datetime('now'), '') " +
      "ON CONFLICT(job, account) DO UPDATE SET cursor = ?2, last_ok = datetime('now'), last_error = ''"
    ).bind(acct, String(idx)).run();

    await dupSweep(env, acct);
  });
}

/* dup_state carries each currently-duplicated item: first_seen for the 90-minute confirmation,
   alerted_day so the feed records an item once per UK day at most. Resolved items are deleted,
   so the table is always exactly "what is duplicated right now". */
async function dupSweep(env, acct) {
  /* Hasib's rule, restated 19 Aug: duplication exists only when the ITEM ITSELF is currently
     an ACTIVE listing sitting in more than one RUNNING campaign — an ended or unsold item in two
     stale campaign memberships is history, not a leak. The items_api join enforces it. */
  const dups = await env.DB.prepare(
    'SELECT ca.listing_id, COUNT(DISTINCT ca.campaign_id) AS n, GROUP_CONCAT(c.name, \' | \') AS names ' +
    'FROM campaign_ads ca JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id ' +
    "JOIN items_api ia ON ia.item_id = ca.listing_id AND ia.status = 'ACTIVE' " +
    "WHERE ca.account = ?1 AND c.status LIKE '%RUNNING%' " +
    'GROUP BY ca.listing_id HAVING COUNT(DISTINCT ca.campaign_id) > 1'
  ).bind(acct).all();
  const liveDup = {};
  for (const d of (dups.results || [])) liveDup[d.listing_id] = d;

  const stRs = await env.DB.prepare('SELECT listing_id, first_seen, alerted_day FROM dup_state WHERE account = ?1').bind(acct).all();
  const known = {};
  for (const r of (stRs.results || [])) known[r.listing_id] = r;

  const today = ukDate('');
  const stmts = [];
  let confirmedNew = 0;
  for (const lid of Object.keys(liveDup)) {
    const k = known[lid];
    if (!k) {
      stmts.push(env.DB.prepare(
        "INSERT INTO dup_state (account, listing_id, first_seen, alerted_day) VALUES (?1, ?2, ?3, '')"
      ).bind(acct, lid, String(Date.now())));
      continue;
    }
    const confirmed = Date.now() - Number(k.first_seen || 0) > DUP_CONFIRM_MS;
    if (confirmed && k.alerted_day !== today && confirmedNew < 10) {
      confirmedNew++;
      stmts.push(env.DB.prepare('UPDATE dup_state SET alerted_day = ?3 WHERE account = ?1 AND listing_id = ?2').bind(acct, lid, today));
      stmts.push(env.DB.prepare(
        "INSERT INTO campaign_events (account, campaign, item_id, change_type, old, new, actor, at) VALUES (?1, ?2, ?3, 'duplicate_active', '', ?4, '', datetime('now'))"
      ).bind(acct, String(liveDup[lid].names || '').slice(0, 200), lid, String(liveDup[lid].n)));
    }
  }
  for (const lid of Object.keys(known)) {
    if (!liveDup[lid]) stmts.push(env.DB.prepare('DELETE FROM dup_state WHERE account = ?1 AND listing_id = ?2').bind(acct, lid));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  if (confirmedNew > 0) {
    const total = Object.keys(liveDup).length;
    const msg = '🔴 ' + total + ' item(s) sit in more than one ACTIVE campaign · ' + acct +
      ' (' + confirmedNew + ' newly confirmed) — eBay can charge each of them in every campaign. Open Campaign watch and keep each item in ONE.';
    await queueNotify(env, 'advertising', 'Duplicate campaigns', msg, 'engine:dupsum:' + acct + ':' + today);
    await queueNotify(env, 'management', 'Duplicate campaigns', msg, 'engine:dupsum:' + acct + ':' + today);
  }
}

/* Real eBay fees per order (§3 financeSync) — WAITS on the extended-scope re-consent (existing
   grants 403 on sell.finances; that refusal is recorded per account, honestly, until the
   consent lands — then fees flow with no code change). Drift rule: the sheet's OE already
   encodes the fees the calculator EXPECTED (expected fees ≈ sold − OE×units), so when eBay's
   real fee beats that expectation by 15%+ AND 50p+, management hears about the exact order —
   that is the Brain-v17-drift alert the contract asks for. */
/* ---------------- eBay Digital Signatures (19 Aug) ----------------------------------------
   The Finances API refuses unsigned calls outright — error 215001, "Missing x-ebay-signature-key
   header". Every call must carry an RFC-9421 HTTP message signature made with an ED25519 key
   that eBay itself issues. The Engine MINTS ITS OWN key on first use and keeps it in D1 beside
   the OAuth tokens it already guards — no human ever handles the private key, and a lost row
   just means a fresh mint. Proven by hand against seller_funds_summary before being wired in. */
async function ebaySigningKey(env) {
  const row = await env.DB.prepare("SELECT v FROM engine_config WHERE k = 'ebay_sign_key'").first();
  if (row && row.v) {
    // a corrupt or half-written row must degrade to a fresh mint, not wedge every finances call
    try {
      const k = JSON.parse(row.v);
      if (k && k.privateKey && k.jwe) return k;
    } catch (e) { /* fall through to re-mint */ }
    await env.DB.prepare("DELETE FROM engine_config WHERE k = 'ebay_sign_key'").run();
  }

  const appId = await secret(env, 'EBAY_APP_ID');
  const cert = await secret(env, 'EBAY_CERT_ID');
  const tr = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { authorization: 'Basic ' + btoa(appId + ':' + cert), 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  if (!tr.ok) throw new Error('sign-key app token ' + tr.status);
  const appTok = (await tr.json()).access_token;

  const kr = await fetch('https://apiz.ebay.com/developer/key_management/v1/signing_key', {
    method: 'POST', headers: { authorization: 'Bearer ' + appTok, 'content-type': 'application/json' },
    body: JSON.stringify({ signingKeyCipher: 'ED25519' }),
  });
  if (!kr.ok && kr.status !== 201) throw new Error('sign-key create ' + kr.status + ': ' + (await kr.text()).slice(0, 140));
  const k = await kr.json();
  if (!k.privateKey || !k.jwe) throw new Error('sign-key create returned no private key');
  const keep = { privateKey: k.privateKey, jwe: k.jwe, signingKeyId: k.signingKeyId || '' };
  await env.DB.prepare("INSERT INTO engine_config (k, v) VALUES ('ebay_sign_key', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1")
    .bind(JSON.stringify(keep)).run();
  return keep;
}

async function ebaySignedFetch(env, url, tok, init) {
  const k = await ebaySigningKey(env);
  const u = new URL(url);
  const method = ((init && init.method) || 'GET').toUpperCase();
  const der = Uint8Array.from(atob(k.privateKey), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
  const created = Math.floor(Date.now() / 1000);
  const params = '("x-ebay-signature-key" "@method" "@path" "@authority");created=' + created;
  // The base string covers exactly the components eBay names, in eBay's order — path WITHOUT the
  // query string (@path is the target path component alone).
  const base = '"x-ebay-signature-key": ' + k.jwe +
    '\n"@method": ' + method +
    '\n"@path": ' + u.pathname +
    '\n"@authority": ' + u.host +
    '\n"@signature-params": ' + params;
  const sig = new Uint8Array(await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(base)));
  let raw = '';
  for (const b of sig) raw += String.fromCharCode(b);
  const headers = Object.assign({}, (init && init.headers) || {}, {
    authorization: 'Bearer ' + tok,
    'x-ebay-signature-key': k.jwe,
    'Signature-Input': 'sig1=' + params,
    'Signature': 'sig1=:' + btoa(raw) + ':',
  });
  return fetch(url, Object.assign({}, init || {}, { headers }));
}

async function financeSync(env) {
  await perAccount(env, 'financeSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    // The window matches orderSync's: an order CREATED in-window has its fee history inside the
    // same window, so the sum below is that order's COMPLETE fee picture. Orders older than the
    // window are left alone entirely — a late adjustment must never let a partial in-window sum
    // replace a complete stored total.
    const sinceMs = Date.now() - 6 * 86400000;
    const since = new Date(sinceMs).toISOString();
    const txs = [];
    /* 10 pages = 1,000 transactions per account per run. Three pages was under one busy week's
       volume (Hafiza alone holds 8,404 lifetime), and a silent cap reads as "covered". */
    for (let page = 0; page < 10; page++) {
      const r = await ebaySignedFetch(env,
        'https://apiz.ebay.com/sell/finances/v1/transaction?limit=100&offset=' + (page * 100) +
        '&filter=' + encodeURIComponent('transactionDate:[' + since + '..]'), tok);
      if (r.status === 403) throw new Error(acct + ' finances 403 — this account\'s token still lacks sell.finances: re-consent it');
      if (!r.ok) throw new Error(acct + ' finances ' + r.status + ': ' + (await r.text()).slice(0, 120));
      const d = await r.json();
      txs.push(...(d.transactions || []));
      if ((d.transactions || []).length < 100) break;
    }

    const feesByOrder = {};
    const refundsByOrder = {};
    for (const t of txs) {
      const oid = String(t.orderId || '');
      if (!oid) continue;
      // the money handed back to the buyer — the sheet's own Returns column, per order
      if (String(t.transactionType) === 'REFUND') {
        const amt = Number((t.amount || {}).value || 0);
        if (amt) refundsByOrder[oid] = round2((refundsByOrder[oid] || 0) + amt);
      }
      const fee = Number((t.totalFeeAmount || {}).value || 0);
      if (!fee) continue;
      /* bookingEntry describes the ORDER MONEY, not the fee: a SALE books CREDIT (money to us,
         fee charged alongside) and a REFUND books DEBIT (money out, part of the fee handed
         back). Keying the sign on bookingEntry read both backwards and wrote 618 orders with
         NEGATIVE fees before the live data made it obvious. The transaction type is the truth:
         a SALE's fee is charged, a REFUND's fee is returned; other types carry no order fee. */
      const tt = String(t.transactionType || '');
      const sign = tt === 'SALE' ? 1 : tt === 'REFUND' ? -1 : 0;
      if (!sign) continue;
      feesByOrder[oid] = round2((feesByOrder[oid] || 0) + sign * fee);
    }
    if (!Object.keys(feesByOrder).length) return;

    const ids = Object.keys(feesByOrder);
    const rows = {};
    for (let i = 0; i < ids.length; i += 90) {
      const chunk = ids.slice(i, i + 90);
      const rs = await env.DB.prepare(
        'SELECT o.order_id, o.sold, o.qty, o.item_id, o.ebay_fees, o.refunded, o.created_at, f.oe FROM orders o LEFT JOIN items_facts f ON f.item_id = o.item_id ' +
        'WHERE o.order_id IN (' + chunk.map(() => '?').join(',') + ')'
      ).bind(...chunk).all();
      for (const row of (rs.results || [])) rows[row.order_id] = row;
    }

    const stmts = [];
    for (const oid of ids) {
      const row = rows[oid];
      const fee = feesByOrder[oid];
      if (!row) continue;                                              // not an order we track
      const createdMs = new Date(String(row.created_at)).getTime();
      if (isNaN(createdMs) || createdMs < sinceMs) continue;           // straddles the window — never clobber
      const refund = refundsByOrder[oid] || 0;
      const feeSame = Math.abs(Number(row.ebay_fees) - fee) < 0.005;
      const refSame = Math.abs(Number(row.refunded || 0) - refund) < 0.005;
      if (feeSame && refSame) continue;                                // unchanged → no write
      stmts.push(env.DB.prepare('UPDATE orders SET ebay_fees = ?2, refunded = ?3 WHERE order_id = ?1').bind(oid, fee, refund));
      // drift is judged only on single-unit orders — multi-line orders mix items and the
      // per-unit OE of the first line would cry wolf
      const expected = round2((Number(row.sold) || 0) - (Number(row.oe) || 0));
      if (row.oe && Number(row.qty) === 1 && expected > 0 && fee > expected * 1.15 && fee - expected > 0.5) {
        await queueNotify(env, 'management', 'Fee drift',
          '🟠 eBay charged £' + fee.toFixed(2) + ' on order ' + oid + ' · ' + acct + ' · item ' + row.item_id +
          ' — the calculator expected ~£' + expected.toFixed(2) + '. Re-check that item\'s pricing.',
          'engine:feedrift:' + oid);
      }
    }
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  });
}

/* ---------------- Phase D: the CS feeds — probed live 14 Aug, shapes are real -------------
   Post-Order search endpoints answer the EXISTING tokens with 'IAF <token>' auth: cases
   (members[].caseId/caseStatusEnum/respondByDate), returns (members[].returnId/state/
   creationInfo.reason/comments.content), inquiries = INR (members[].inquiryId/
   inquiryStatusEnum). Analytics seller_standards_profile answers Bearer. Buyer messages ride
   Trading GetMyMessages headers. A NEW case/return/inquiry rings CS + management within the
   hour, with the respond-by date in the message — the date is the whole game in CS. */
async function csSync(env) {
  await perAccount(env, 'csSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const feeds = [
      { kind: 'CASE', url: 'https://api.ebay.com/post-order/v2/casemanagement/search?limit=100&sort=-caselastmodifieddate',
        list: d => d.members || [], id: m => String(m.caseId || ''), status: m => String(m.caseStatusEnum || ''),
        opened: m => String((m.creationDate || {}).value || ''), buyer: m => String(m.buyer || ''),
        item: m => String(m.itemId || ''), reason: m => 'claim £' + String(((m.claimAmount || {}).value) || '?'),
        due: m => String((m.respondByDate || {}).value || ''), openish: s => !/CLOSED|CS_CLOSED/i.test(s) },
      { kind: 'RETURN', url: 'https://api.ebay.com/post-order/v2/return/search?limit=100&sort=-creationdate',
        list: d => d.members || [],
        id: m => String(m.returnId || ''),
        /* a return carries BOTH a lifecycle `state` (ITEM_READY_TO_SHIP…) and an overall
           `status` — when either says CLOSED, closed wins, or a finished return wears its last
           lifecycle step forever and the desk counts it as open (Hasib: "cases closed and
           still showing") */
        status: m => { const st = String(m.state || ''); const s2 = String(m.status || ''); return (/CLOSED/i.test(s2) && !/CLOSED/i.test(st)) ? s2 : (st || s2); },
        opened: m => String((((m.creationInfo || {}).creationDate || {}).value) || ''), buyer: m => String(m.buyerLoginName || ''),
        item: m => String((((m.creationInfo || {}).item || {}).itemId) || ''),
        reason: m => String((m.creationInfo || {}).reason || '') + (((m.creationInfo || {}).comments || {}).content ? ' — "' + String(m.creationInfo.comments.content).slice(0, 120) + '"' : ''),
        due: m => '', openish: s => !/CLOSED/i.test(s) },
      { kind: 'INR', url: 'https://api.ebay.com/post-order/v2/inquiry/search?limit=100&sort=-inquirylastmodifieddate',
        list: d => d.members || [], id: m => String(m.inquiryId || ''), status: m => String(m.inquiryStatusEnum || ''),
        opened: m => String((m.creationDate || {}).value || ''), buyer: m => String(m.buyer || ''),
        item: m => String(m.itemId || ''), reason: m => 'item not received · £' + String(((m.claimAmount || {}).value) || '?'),
        due: m => String((m.respondByDate || {}).value || ''), openish: s => !/CLOSED/i.test(s) },
    ];

    // status per known id, so unchanged rows cost ZERO writes — D1's daily write budget is
    // finite and rewriting 400 unchanged rows an hour was most of it.
    const known = {};
    const seenKeys = {};                       // every id the searches served this run
    const kr = await env.DB.prepare('SELECT case_id, status FROM cases WHERE account = ?1').bind(acct).all();
    for (const r of (kr.results || [])) known[r.case_id] = String(r.status || '');

    for (const f of feeds) {
      const pages = [f.url];
      for (let pi = 0; pi < pages.length && pi < 2; pi++) {
        const r = await fetch(pages[pi], { headers: { authorization: 'IAF ' + tok } });
        if (!r.ok) throw new Error(acct + ' ' + f.kind + ' ' + r.status + ': ' + (await r.text()).slice(0, 120));
        const d = await r.json();
        const total = Number(d.total || d.totalNumberOfCases || d.totalNumberOfInquiries || 0);
        if (pi === 0 && total > 100) pages.push(f.url + '&offset=100');   // one more page covers these accounts
        for (const m of f.list(d)) {
          const id = f.id(m);
          if (!id) continue;
          const key = f.kind + ':' + id;
          seenKeys[key] = true;                 // seen = the search still serves it (fresh either way)
          const status = f.status(m);
          const isNew = !(key in known);
          if (!isNew && known[key] === status) continue;               // nothing changed → no write
          await env.DB.prepare(
            'INSERT INTO cases (case_id, account, kind, order_id, item_id, buyer, reason, status, opened_at, closed_at, payload_json) ' +
            "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, '', ?10) " +
            'ON CONFLICT(case_id) DO UPDATE SET status = ?8, payload_json = ?10'
          ).bind(key, acct, f.kind, String(m.orderId || ''), f.item(m), f.buyer(m),
            f.reason(m).slice(0, 300), status, f.opened(m), JSON.stringify(m).slice(0, 4000)).run();
          if (isNew && f.openish(status)) {
            const label = f.kind === 'CASE' ? 'eBay case' : f.kind === 'RETURN' ? 'Return opened' : 'Item-not-received inquiry';
            const due = f.due(m);
            const msg = '🔴 ' + label + ' · ' + acct + ' · item ' + f.item(m) + ' · buyer ' + f.buyer(m) +
              ' · ' + f.reason(m).slice(0, 140) + (due ? ' · RESPOND BY ' + due.slice(0, 10) : '') +
              ' — open the CS desk.';
            await queueNotify(env, 'management', label, msg, 'engine:cs:' + acct + ':' + f.kind + ':' + id);
            await notifyRole(env, 'CS', label, msg, 'engine:cs:' + acct + ':' + f.kind + ':' + id);
          }
        }
      }
    }

    /* R5 (Hasib: "cases closed and still showing, not showing correct status"): the searches
       window on the newest ~200 per feed — a case whose last modification drifts out of that
       window FOSSILIZES at its last-seen status and the desk keeps counting it open. Any row
       still open-ish in D1 that this sweep did NOT see gets re-fetched one by one (oldest
       first, 6 per account per run — heals a backlog within the hour) and corrected; a 404
       means eBay no longer serves it, which is a closed case by definition. */
    const staleRs = await env.DB.prepare(
      "SELECT case_id, kind FROM cases WHERE account = ?1 AND status NOT LIKE '%CLOSED%' ORDER BY opened_at ASC LIMIT 40"
    ).bind(acct).all();
    const unseen = (staleRs.results || []).filter((r) => !seenKeys[r.case_id]).slice(0, 6);
    for (const row of unseen) {
      const bare = String(row.case_id).split(':')[1] || '';
      const kindUrl = row.kind === 'CASE' ? 'https://api.ebay.com/post-order/v2/casemanagement/' + bare
        : row.kind === 'RETURN' ? 'https://api.ebay.com/post-order/v2/return/' + bare
        : 'https://api.ebay.com/post-order/v2/inquiry/' + bare;
      try {
        const rr = await fetch(kindUrl, { headers: { authorization: 'IAF ' + tok } });
        if (rr.status === 404) {
          await env.DB.prepare("UPDATE cases SET status = 'CLOSED' WHERE case_id = ?1").bind(row.case_id).run();
          continue;
        }
        if (!rr.ok) continue;                                      // transient — next run retries
        const j = await rr.json();
        const detail = j.caseDetails || j.detail || j;
        const st0 = String(detail.state || '');
        const st1 = String(detail.status || detail.caseStatusEnum || detail.inquiryStatusEnum || '');
        const fresh = (/CLOSED/i.test(st1) && !/CLOSED/i.test(st0)) ? st1 : (st0 || st1);
        if (fresh) {
          await env.DB.prepare('UPDATE cases SET status = ?2, payload_json = ?3 WHERE case_id = ?1')
            .bind(row.case_id, fresh, JSON.stringify(detail).slice(0, 4000)).run();
        }
      } catch (e) { /* one bad fetch must not kill the sweep — the next run retries */ }
    }

    // buyer messages RECEIVED (headers only — subject + sender is what the desk lists)
    const mb = '<?xml version="1.0" encoding="utf-8"?>' +
      '<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents"><DetailLevel>ReturnHeaders</DetailLevel>' +
      '<Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>1</PageNumber></Pagination></GetMyMessagesRequest>';
    const mr = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: { 'X-EBAY-API-COMPATIBILITY-LEVEL': '1193', 'X-EBAY-API-CALL-NAME': 'GetMyMessages',
        'X-EBAY-API-SITEID': '3', 'X-EBAY-API-IAF-TOKEN': tok, 'content-type': 'text/xml' },
      body: mb,
    });
    const mx = await mr.text();
    if (mr.ok && mx.indexOf('<Ack>Failure</Ack>') < 0) {
      const seen = {};
      const sm = await env.DB.prepare('SELECT msg_id, answered FROM buyer_messages WHERE account = ?1').bind(acct).all();
      for (const r of (sm.results || [])) seen[r.msg_id] = Number(r.answered);
      const msgs = mx.match(/<Message>[\s\S]*?<\/Message>/g) || [];
      const stmts = [];
      for (const mm of msgs) {
        const id = xmlTag(mm, 'MessageID');
        if (!id) continue;
        const read = /<Read>true<\/Read>/.test(mm) ? 1 : 0;
        if (id in seen && seen[id] === read) continue;                 // unchanged → no write
        stmts.push(env.DB.prepare(
          'INSERT INTO buyer_messages (msg_id, account, buyer, text, received_at, answered, item_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
          'ON CONFLICT(msg_id) DO UPDATE SET answered = ?6'
        ).bind(id, acct, xmlTag(mm, 'Sender'), xmlTag(mm, 'Subject').slice(0, 300),
          xmlTag(mm, 'ReceiveDate'), read, xmlTag(mm, 'ItemID')));
      }
      for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    }
  });

  /* Review 3: management decision bells. An item past 5 returns (or 5 INRs) ACROSS ALL
     ACCOUNTS — duplicated listings folded by title — or past 10 late-tracking marks, files
     ONE letter per 5-wide tier (5, 10, 15…): alert_log's (recipient, ref) dedupe is checked
     FIRST so the mail queue never repeats a tier. */
  try {
    const agg = async (sql) => (await env.DB.prepare(sql).all()).results || [];
    const notifyOnce = async (msg, ref) => {
      const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE to_addr = ?1 AND ref = ?2')
        .bind('management', ref).first();
      if (!seen) await queueNotify(env, 'management', 'Item decision needed', msg, ref);
    };
    const caseAgg = await agg(
      "SELECT COALESCE(NULLIF(TRIM(i.title), ''), c.item_id) AS k, c.kind, COUNT(*) AS n, " +
      "COUNT(DISTINCT c.item_id) AS ids, COUNT(DISTINCT c.account) AS accts " +
      "FROM cases c LEFT JOIN items_api i ON i.item_id = c.item_id " +
      "WHERE c.kind IN ('RETURN', 'INR') GROUP BY k, c.kind HAVING COUNT(*) > 5");
    for (const r of caseAgg) {
      const tier = Math.floor(Number(r.n) / 5) * 5;
      const word = r.kind === 'RETURN' ? 'returns' : 'item-not-received cases';
      await notifyOnce('🔴 DECISION NEEDED · "' + String(r.k).slice(0, 90) + '" has ' + r.n + ' ' + word +
        ' across ' + r.accts + ' account(s)' + (Number(r.ids) > 1 ? ' (duplicated — ' + r.ids + ' listings)' : '') +
        ' — review price, supplier or listing on the Item risk board.',
        'engine:itemrisk:' + r.kind + ':' + String(r.k).slice(0, 60) + ':' + tier);
    }
    const lateAgg = await agg(
      "SELECT COALESCE(NULLIF(TRIM(i.title), ''), lm.item_id) AS k, COUNT(DISTINCT lm.order_id) AS n, " +
      "COUNT(DISTINCT lm.account) AS accts FROM late_marks lm LEFT JOIN items_api i ON i.item_id = lm.item_id " +
      "GROUP BY k HAVING COUNT(DISTINCT lm.order_id) > 10");
    for (const r of lateAgg) {
      const tier = Math.floor(Number(r.n) / 5) * 5;
      await notifyOnce('🔴 DECISION NEEDED · "' + String(r.k).slice(0, 90) + '" failed to get tracking within 2 business days on ' +
        r.n + ' order(s) across ' + r.accts + ' account(s) — supplier or process problem, see the Item risk board.',
        'engine:itemrisk:LATE:' + String(r.k).slice(0, 60) + ':' + tier);
    }

    /* Review 4b, Hasib's dynamic-campaign price rules:
       A. any item priced OVER £15 sitting in a RUNNING dynamic campaign → tell management
       B. any item priced over £10 paying MORE THAN 15% in a dynamic GENERAL campaign → tell management
       ("dynamic" = the campaign's own name, his naming convention; general = cost-per-sale) */
    const rowsA = await agg(
      "SELECT ca.listing_id AS item_id, ca.account, c.name AS cname, i.title, i.price " +
      "FROM campaign_ads ca JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id " +
      "JOIN items_api i ON i.item_id = ca.listing_id " +
      "WHERE c.status LIKE '%RUNNING%' AND lower(c.name) LIKE '%dynamic%' AND i.price > 15 AND i.status = 'ACTIVE' LIMIT 40");
    for (const r of rowsA) {
      await notifyOnce('🟠 ADVERTISING RULE · "' + String(r.title || r.item_id).slice(0, 70) + '" (£' + Number(r.price).toFixed(2) +
        ') sits in dynamic campaign "' + String(r.cname).slice(0, 40) + '" on ' + r.account + ' — items over £15 do not belong in dynamic.',
        'engine:dynprice:' + r.account + ':' + r.item_id);
    }
    const rowsB = await agg(
      "SELECT ca.listing_id AS item_id, ca.account, ca.bid_pct, c.name AS cname, i.title, i.price " +
      "FROM campaign_ads ca JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id " +
      "JOIN items_api i ON i.item_id = ca.listing_id " +
      "WHERE c.status LIKE '%RUNNING%' AND lower(c.name) LIKE '%dynamic%' AND c.funding_model LIKE '%SALE%' " +
      "AND i.price > 10 AND ca.bid_pct > 15 AND i.status = 'ACTIVE' LIMIT 40");
    for (const r of rowsB) {
      await notifyOnce('🟠 ADVERTISING RULE · "' + String(r.title || r.item_id).slice(0, 70) + '" (£' + Number(r.price).toFixed(2) +
        ') pays ' + Number(r.bid_pct).toFixed(1) + '% in dynamic GENERAL campaign "' + String(r.cname).slice(0, 40) + '" on ' + r.account +
        ' — over £10 items must stay at 15% or below.',
        'engine:dynrate:' + r.account + ':' + r.item_id + ':' + Math.round(Number(r.bid_pct)));
    }
  } catch (e) { console.log('itemrisk alerts', String(e && e.message || e).slice(0, 200)); }
}

/* Review 4: MARKETING — every sale event on every account, from eBay's own Promotions API.
   Stores each promotion with dates, status, discount and member listings; letters management
   2 days before a running event ends ("arrange a new one"), and a daily digest of items that
   became ELIGIBLE to join a sale (14 days since their last observed revision) but sit in none. */
async function marketingSync(env) {
  await perAccount(env, 'marketingSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const lr = await fetch('https://api.ebay.com/sell/marketing/v1/promotion?marketplace_id=EBAY_GB&limit=100', {
      headers: { authorization: 'Bearer ' + tok } });
    if (!lr.ok) throw new Error(acct + ' promotions ' + lr.status + ': ' + (await lr.text()).slice(0, 120));
    const data = await lr.json();
    const promos = data.promotions || [];
    /* budget discipline (adsReportKick's lesson): the LIST row for every promotion always
       lands, but the per-promotion DETAIL fetch is capped per run and skipped while fresh —
       membership fills across runs instead of blowing the invocation's subrequest budget. */
    let details = 0;
    const freshRs = await env.DB.prepare(
      "SELECT promo_id FROM promotions WHERE account = ?1 AND synced_at >= datetime('now', '-20 hours') " +
      "AND (item_n > 0 OR status NOT LIKE '%RUNNING%')"
    ).bind(acct).all();
    const fresh = {};
    for (const f of (freshRs.results || [])) fresh[String(f.promo_id)] = 1;
    const ordered = promos.slice().sort((a, b) =>
      ((/RUNNING/i.test(String(b.promotionStatus)) ? 1 : 0) - (/RUNNING/i.test(String(a.promotionStatus)) ? 1 : 0)));
    for (const p0 of ordered) {
      const pid = String(p0.promotionId || (p0.promotionHref || '').split('/').filter(Boolean).pop() || '');
      if (!pid) continue;
      /* member listings: markdown sales and item promotions carry them in different envelopes */
      let listingIds = [];
      let discount = '';
      const wantDetail = !fresh[pid] && details < 8;
      try {
        if (!wantDetail) throw { skip: true };
        details++;
        const isMd = /MARKDOWN/i.test(String(p0.promotionType || ''));
        const dr = await fetch('https://api.ebay.com/sell/marketing/v1/' + (isMd ? 'item_price_markdown/' : 'item_promotion/') + encodeURIComponent(pid), {
          headers: { authorization: 'Bearer ' + tok } });
        if (!dr.ok) {
          /* csMetricsSkip's lesson: a swallowed refusal hides the WHY for weeks — record it */
          await ctx_setSync(env, 'promoDetailSkip', acct,
            (String(p0.promotionType) + ' ' + pid).slice(0, 60) + ' -> ' + dr.status + ': ' + (await dr.text()).replace(/\s+/g, ' ').slice(0, 200));
        }
        if (dr.ok) {
          const det = await dr.json();
          const topIds = ((det.inventoryCriterion || {}).listingIds) || [];
          listingIds = listingIds.concat(topIds.map(String));
          const sel = det.selectedInventoryDiscounts || [];
          for (const s of sel) {
            const ids = ((s.inventoryCriterion || {}).listingIds) || [];
            listingIds = listingIds.concat(ids.map(String));
            const b = s.discountBenefit || {};
            if (!discount) discount = b.percentageOffItem ? b.percentageOffItem + '% off' : b.amountOffItem ? '£' + (b.amountOffItem.value || '?') + ' off' : '';
          }
          if (!discount && det.discountRules && det.discountRules[0]) {
            const b = det.discountRules[0].discountBenefit || {};
            discount = b.percentageOffOrder ? b.percentageOffOrder + '% off order' : b.amountOffOrder ? '£' + (b.amountOffOrder.value || '?') + ' off order' : '';
          }
        }
      } catch (e) { /* membership detail is best effort — the event row still lands */ }
      /* the listing-to-listing HISTORY: when each item was ADDED to this event (first seen)
         and when it was last still there — history accumulates from 21 Aug */
      if (listingIds.length) {
        const mstmts = listingIds.slice(0, 500).map(id => env.DB.prepare(
          "INSERT INTO promo_members (account, promo_id, item_id, added_at, last_seen) VALUES (?1, ?2, ?3, datetime('now'), datetime('now')) " +
          "ON CONFLICT(account, promo_id, item_id) DO UPDATE SET last_seen = datetime('now')"
        ).bind(acct, pid, String(id)));
        for (let i = 0; i < mstmts.length; i += 50) await env.DB.batch(mstmts.slice(i, i + 50));
      }
      await env.DB.prepare(
        'INSERT INTO promotions (account, promo_id, name, type, status, start_at, end_at, discount, item_n, listing_ids, synced_at) ' +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now')) " +
        'ON CONFLICT(account, promo_id) DO UPDATE SET name=?3, type=?4, status=?5, start_at=?6, end_at=?7, ' +
        "discount = CASE WHEN ?8 != '' THEN ?8 ELSE discount END, " +
        'item_n = CASE WHEN ?9 > 0 THEN ?9 ELSE item_n END, ' +
        "listing_ids = CASE WHEN ?10 != '' THEN ?10 ELSE listing_ids END, synced_at=datetime('now')"
      ).bind(acct, pid, String(p0.name || '').slice(0, 120), String(p0.promotionType || ''), String(p0.promotionStatus || ''),
        String(p0.startDate || ''), String(p0.endDate || ''), discount,
        listingIds.length, listingIds.join(',').slice(0, 40000)).run();

      /* the 2-day ending bell — once per (promotion, end date) */
      if (/RUNNING/i.test(String(p0.promotionStatus || '')) && p0.endDate) {
        const endMs = Date.parse(p0.endDate);
        if (isFinite(endMs) && endMs - Date.now() > 0 && endMs - Date.now() <= 2 * 86400000) {
          const ref = 'engine:promoend:' + acct + ':' + pid + ':' + String(p0.endDate).slice(0, 10);
          const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE to_addr = ?1 AND ref = ?2').bind('management', ref).first();
          if (!seen) {
            await queueNotify(env, 'management', 'Sale event ending',
              '🟠 "' + String(p0.name || pid).slice(0, 70) + '" on ' + acct + ' ENDS ' + String(p0.endDate).slice(0, 10) +
              ' (within 2 days) — ARRANGE A NEW SALE EVENT so every listing stays covered.', ref);
          }
        }
      }
    }
  });

  /* eligibility digest: ACTIVE listings in NO running event whose last observed revision is
     14+ days old (or that have never changed since tracking began and are old stock) */
  try {
    const running = await env.DB.prepare("SELECT account, listing_ids FROM promotions WHERE status LIKE '%RUNNING%'").all();
    const covered = {};
    for (const r of (running.results || [])) {
      for (const id of String(r.listing_ids || '').split(',')) { if (id) covered[id] = 1; }
    }
    const items = await env.DB.prepare(
      "SELECT item_id, account, title FROM items_api WHERE status = 'ACTIVE' AND " +
      "(last_revised = '' OR last_revised <= datetime('now', '-14 day'))"
    ).all();
    const eligible = (items.results || []).filter(i => !covered[String(i.item_id)]);
    /* never letter management off half-filled membership: while many RUNNING events still
       await their detail fetch (item_n = 0), "uncovered" is an artifact of the fill, not a fact */
    const unfilled = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM promotions WHERE status LIKE '%RUNNING%' AND item_n = 0"
    ).first();
    if (eligible.length && Number(unfilled && unfilled.n) === 0) {
      const day = ukDate('');
      const ref = 'engine:saleeligible:' + day;
      const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE to_addr = ?1 AND ref = ?2').bind('management', ref).first();
      if (!seen) {
        const sample = eligible.slice(0, 8).map(i => String(i.title || i.item_id).slice(0, 40) + ' (' + i.account + ')').join(' · ');
        await queueNotify(env, 'management', 'Sale coverage',
          '🟠 ' + eligible.length + ' active listing(s) sit in NO running sale event and are past the 14-day revision rule — add them: ' + sample +
          (eligible.length > 8 ? ' +' + (eligible.length - 8) + ' more (Marketing board)' : ''), ref);
      }
    }
  } catch (e) { console.log('sale eligibility', String(e && e.message || e).slice(0, 160)); }
}

/* Review 4: FEEDBACK — per-account score and every comment, from Trading GetFeedback + GetUser.
   A NEW NEGATIVE files letters to management AND the CS role the moment the sync sees it. */
async function feedbackSync(env) {
  await perAccount(env, 'feedbackSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const fbReq = '<?xml version="1.0" encoding="utf-8"?>' +
      '<GetFeedbackRequest xmlns="urn:ebay:apis:eBLBaseComponents"><DetailLevel>ReturnAll</DetailLevel>' +
      '<Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>1</PageNumber></Pagination></GetFeedbackRequest>';
    const fr = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: { 'X-EBAY-API-COMPATIBILITY-LEVEL': '1193', 'X-EBAY-API-CALL-NAME': 'GetFeedback',
        'X-EBAY-API-SITEID': '3', 'X-EBAY-API-IAF-TOKEN': tok, 'content-type': 'text/xml' },
      body: fbReq,
    });
    const fx = await fr.text();
    if (!fr.ok || fx.indexOf('<Ack>Failure</Ack>') >= 0) throw new Error(acct + ' GetFeedback failed: ' + fx.slice(0, 140));
    const entries = fx.match(/<FeedbackDetail>[\s\S]*?<\/FeedbackDetail>/g) || [];
    /* one read of the known keys + batched inserts — a first run carries 100 entries per
       account and per-row SELECT+INSERT pairs blew the invocation's subrequest budget */
    const knownRs = await env.DB.prepare('SELECT fb_key FROM feedback WHERE account = ?1').bind(acct).all();
    const known = {};
    for (const k0 of (knownRs.results || [])) known[String(k0.fb_key)] = 1;
    const stmts = [];
    const newNegs = [];
    for (const e0 of entries) {
      const type = xmlTag(e0, 'CommentType');
      const user = xmlTag(e0, 'CommentingUser');
      const at = xmlTag(e0, 'CommentTime');
      const item = xmlTag(e0, 'ItemID');
      const key = acct + '|' + item + '|' + user + '|' + at;
      if (known[key]) continue;
      known[key] = 1;
      stmts.push(env.DB.prepare(
        "INSERT OR IGNORE INTO feedback (fb_key, account, type, item_id, order_line, buyer, text, at, synced_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))"
      ).bind(key, acct, type, item, xmlTag(e0, 'OrderLineItemID'), user, xmlTag(e0, 'CommentText').slice(0, 400), at));
      if (/Negative/i.test(type)) {
        newNegs.push({ key, item, user, text: xmlTag(e0, 'CommentText').slice(0, 140), line: xmlTag(e0, 'OrderLineItemID') });
      }
    }
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    for (const n of newNegs.slice(0, 10)) {
      const msg = '🔴 NEGATIVE FEEDBACK on ' + acct + ' · item ' + n.item + ' · buyer ' + n.user +
        ' — “' + n.text + '” · order ' + n.line + ' — CS: respond and try to resolve for a revision.';
      await queueNotify(env, 'management', 'Negative feedback', msg, 'engine:fbneg:' + n.key);
      await notifyRole(env, 'CS', 'Negative feedback', msg, 'engine:fbneg:cs:' + n.key);
    }
    /* the header numbers his Seller Hub card shows: score + positive % */
    const guReq = '<?xml version="1.0" encoding="utf-8"?>' +
      '<GetUserRequest xmlns="urn:ebay:apis:eBLBaseComponents"><DetailLevel>ReturnAll</DetailLevel></GetUserRequest>';
    const gr = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: { 'X-EBAY-API-COMPATIBILITY-LEVEL': '1193', 'X-EBAY-API-CALL-NAME': 'GetUser',
        'X-EBAY-API-SITEID': '3', 'X-EBAY-API-IAF-TOKEN': tok, 'content-type': 'text/xml' },
      body: guReq,
    });
    const gx = await gr.text();
    const score = Number(xmlTag(gx, 'FeedbackScore')) || 0;
    const pct = Number(xmlTag(gx, 'PositiveFeedbackPercent')) || 0;
    const cnt = await env.DB.prepare(
      "SELECT SUM(CASE WHEN type = 'Positive' AND at >= datetime('now', '-30 day') THEN 1 ELSE 0 END) AS p, " +
      "SUM(CASE WHEN type = 'Neutral' AND at >= datetime('now', '-30 day') THEN 1 ELSE 0 END) AS n, " +
      "SUM(CASE WHEN type = 'Negative' AND at >= datetime('now', '-30 day') THEN 1 ELSE 0 END) AS g " +
      'FROM feedback WHERE account = ?1'
    ).bind(acct).first();
    await env.DB.prepare(
      "INSERT INTO feedback_summary (account, score, pos_pct, pos_30d, neu_30d, neg_30d, json, synced_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, '', datetime('now')) " +
      "ON CONFLICT(account) DO UPDATE SET score=?2, pos_pct=?3, pos_30d=?4, neu_30d=?5, neg_30d=?6, synced_at=datetime('now')"
    ).bind(acct, score, pct, Number(cnt && cnt.p) || 0, Number(cnt && cnt.n) || 0, Number(cnt && cnt.g) || 0).run();
  });
}

/* Review 5 (Hasib, night order): "make a plan to do the cybersecurity of this portal every
   day." This sweep runs NIGHTLY and letters management on every finding. What it checks:
   sessions (purge expired, malformed tokens, per-user floods), the SUPER-USER ALLOWLIST (a
   new admin appearing is the loudest bell this portal can ring), role/status CHANGES since
   yesterday's snapshot (insider-threat guard), secrets presence, the CORS origin allowlist,
   and the day's failed-auth counter (probing detection). Human-side duties live in SECURITY.md. */
async function securitySweep(env) {
  const findings = [];
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  const bad = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE length(token) != 64').first();
  if (Number(bad && bad.n)) findings.push('🔴 ' + bad.n + ' malformed session token(s) in the sessions table');
  const flood = await env.DB.prepare('SELECT email, COUNT(*) AS n FROM sessions GROUP BY email HAVING COUNT(*) > 15').all();
  for (const r of (flood.results || [])) findings.push('🟠 session flood: ' + r.email + ' holds ' + r.n + ' live sessions (possible token leak)');

  const SUPER_ALLOW = ['mrhasibullah91@googlemail.com', 'zaidkaleem987@gmail.com', 'm98m786@gmail.com'];
  const sup = await env.DB.prepare('SELECT email FROM users WHERE super = 1').all();
  for (const r of (sup.results || [])) {
    if (SUPER_ALLOW.indexOf(String(r.email).toLowerCase()) < 0) findings.push('🔴 UNEXPECTED SUPER USER: ' + r.email + ' — remove or approve explicitly');
  }

  const now = (await env.DB.prepare('SELECT email, role, status, super FROM users').all()).results || [];
  const snap = (await env.DB.prepare('SELECT email, role, status, super FROM users_snapshot').all()).results || [];
  const snapBy = {};
  for (const r of snap) snapBy[String(r.email)] = r;
  for (const u of now) {
    const o = snapBy[String(u.email)];
    if (!o) { if (snap.length) findings.push('🟠 NEW USER since yesterday: ' + u.email + ' (' + u.role + ', ' + u.status + ')'); continue; }
    if (String(o.role) !== String(u.role)) findings.push('🔴 ROLE CHANGED: ' + u.email + ' — ' + o.role + ' → ' + u.role);
    if (Number(o.super) !== Number(u.super)) findings.push('🔴 SUPER FLAG CHANGED: ' + u.email + ' — ' + o.super + ' → ' + u.super);
    if (String(o.status) !== String(u.status) && u.status === 'approved') findings.push('🟠 user newly approved: ' + u.email + ' (' + u.role + ')');
  }
  const stmts = now.map(u => env.DB.prepare(
    "INSERT INTO users_snapshot (email, role, status, super, snapped_at) VALUES (?1, ?2, ?3, ?4, datetime('now')) " +
    "ON CONFLICT(email) DO UPDATE SET role = ?2, status = ?3, super = ?4, snapped_at = datetime('now')"
  ).bind(u.email, u.role, u.status, Number(u.super) || 0));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  for (const k of ['SYNC_KEY', 'EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_DEV_ID', 'EBAY_RU_NAME']) {
    if (!env[k]) findings.push('🔴 missing secret binding: ' + k);
  }
  const EXPECT_ORIGINS = 'https://m98m786.github.io,https://portal.m98mltd.co.uk';
  if (String(env.ALLOWED_ORIGIN || '') !== EXPECT_ORIGINS) {
    findings.push('🔴 CORS allowlist drifted: "' + String(env.ALLOWED_ORIGIN || '') + '" (expected the two portal origins)');
  }
  const day = ukDate('');
  const fails = Number(await env.HOT.get('authfail:' + day)) || 0;
  if (fails > 50) findings.push('🟠 ' + fails + ' refused calls today — someone may be probing the portal');

  for (const f of findings.slice(0, 8)) {
    const ref = 'engine:sec:' + day + ':' + f.slice(0, 60).replace(/[^a-z0-9]/gi, '').slice(0, 40);
    const seen = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE to_addr = ?1 AND ref = ?2').bind('management', ref).first();
    if (!seen) await queueNotify(env, 'management', 'Security', f + ' — nightly security sweep', ref);
  }
  await ctx_setSync(env, 'securitySweep', '',
    (findings.length ? findings.length + ' finding(s): ' + findings.join(' | ').slice(0, 1100) : 'clean — sessions purged, admins verified, roles unchanged, secrets present, CORS exact, auth-fails ' + fails));
}

/* Seller standards move slowly — eBay evaluates monthly — so one nightly read per account is
   the honest cadence, and it keeps the hourly slot far from the subrequest cap. */
async function standardsSync(env) {
  await perAccount(env, 'standardsSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const sr = await fetch('https://api.ebay.com/sell/analytics/v1/seller_standards_profile', {
      headers: { authorization: 'Bearer ' + tok } });
    if (!sr.ok) return;                                // scope-gap accounts simply stay absent
    const sd = await sr.json();
    const uk = (sd.standardsProfiles || []).filter(x => String(x.program || '').indexOf('UK') >= 0);
    await env.DB.prepare(
      "INSERT INTO cs_standards (account, json, synced_at) VALUES (?1, ?2, datetime('now')) " +
      "ON CONFLICT(account) DO UPDATE SET json = ?2, synced_at = datetime('now')"
    ).bind(acct, JSON.stringify(uk.length ? uk : (sd.standardsProfiles || [])).slice(0, 8000)).run();

    /* Hasib item 13: the Seller Hub service-metrics panel — your "item not as described" and
       "item not received" rates against eBay's peer benchmark. Same nightly cadence: eBay
       re-evaluates these monthly, so nightly is already generous. A scope-gap account simply
       stays absent, like the standards above. */
    const csSkips = [];
    for (const mt of ['ITEM_NOT_AS_DESCRIBED', 'ITEM_NOT_RECEIVED']) {
      const mr = await fetch('https://api.ebay.com/sell/analytics/v1/customer_service_metric/' + mt + '/CURRENT?evaluation_marketplace_id=EBAY_GB', {
        headers: { authorization: 'Bearer ' + tok } });
      if (!mr.ok) {
        /* Amna and Saif sat metrics-less for weeks and the silent `continue` hid WHY — a 403
           means a consent would fix it, a 404 means eBay has no evaluation for the account and
           no consent will ever change that. Record the refusal where it can be read. */
        csSkips.push(mt + ' ' + mr.status + ': ' + (await mr.text()).replace(/\s+/g, ' ').slice(0, 140));
        continue;
      }
      const md = await mr.json();
      await env.DB.prepare(
        "INSERT INTO cs_metrics (account, metric_type, json, synced_at) VALUES (?1, ?2, ?3, datetime('now')) " +
        "ON CONFLICT(account, metric_type) DO UPDATE SET json = ?3, synced_at = datetime('now')"
      ).bind(acct, mt, JSON.stringify(md).slice(0, 8000)).run();
    }
    if (csSkips.length) await ctx_setSync(env, 'csMetricsSkip', acct, csSkips.join(' | '));
  });
}

/* ---------------- Phase D2: auto-messages (§9-D) — SHADOW until AUTOMSG_LIVE='true' ---------
   The CS agent's controls are the product: per account, per trigger — on/off, template, delay.
   Nothing is hardcoded and nothing sends unless that account's row says enabled AND the global
   gate is armed. Detection reads data the Engine already holds (orders, cases, messages) plus
   one GetFeedback page per account — and only when a feedback trigger is actually enabled, so
   a fully-disabled account costs zero fetches. Every queued message is deduped by its event ref
   (a feedback ID, a return ID…) — an event queues its message once, ever. Templates speak with
   {{buyer}}, {{item}}, {{order}}. 'arrived' appears in the controls but detection waits on
   delivery events — the desk says so instead of pretending. */
const AUTOMSG_TRIGGERS = ['shipped', 'arrived', 'return_opened', 'neg_fb', 'pos_fb', 'buyer_query'];

function renderTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (m, k) => String(vars[k] || '')).slice(0, 900);
}

async function autoMsgScan(env) {
  await perAccount(env, 'autoMsgScan', async (acct) => {
    const cfgRs = await env.DB.prepare('SELECT trigger_kind, template, delay_min FROM auto_msgs WHERE account = ?1 AND enabled = 1').bind(acct).all();
    const cfg = {};
    for (const r of (cfgRs.results || [])) cfg[r.trigger_kind] = r;
    if (!Object.keys(cfg).length) return;

    const queue = async (kind, ref, vars) => {
      const c = cfg[kind];
      if (!c) return;
      const body = renderTemplate(c.template, vars);
      if (!body) return;
      await env.DB.prepare(
        'INSERT OR IGNORE INTO automsg_queue (account, trigger_kind, ref, buyer, order_id, item_id, body, due_at, status, detail, created_at) ' +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now', '+' || ?8 || ' minutes'), 'QUEUED', '', datetime('now'))"
      ).bind(acct, kind, ref, String(vars.buyer || ''), String(vars.order || ''), String(vars.item_id || ''),
        body, String(Math.max(0, Number(c.delay_min) || 0))).run();
    };

    // one titles map per account so {{item}} speaks the listing's name, not its number
    const titles = {};
    const tRs = await env.DB.prepare('SELECT item_id, title FROM items_api WHERE account = ?1').bind(acct).all();
    for (const t of (tRs.results || [])) titles[t.item_id] = t.title;
    const withTitle = v => ({ ...v, item: String(titles[v.item_id] || v.item_id || '') });

    if (cfg.shipped) {
      // 6 days, matching the order window — a parcel fulfilled on day 4 still deserves its note
      const rs = await env.DB.prepare(
        "SELECT order_id, buyer, item_id FROM orders WHERE account = ?1 AND status LIKE '%FULFILLED%' AND created_at >= datetime('now', '-6 day')"
      ).bind(acct).all();
      for (const o of (rs.results || [])) {
        await queue('shipped', 'ship:' + o.order_id, withTitle({ buyer: o.buyer, order: o.order_id, item_id: o.item_id }));
      }
    }
    if (cfg.return_opened) {
      const rs = await env.DB.prepare(
        "SELECT case_id, buyer, item_id, order_id FROM cases WHERE account = ?1 AND kind = 'RETURN' AND opened_at >= datetime('now', '-3 day')"
      ).bind(acct).all();
      for (const c of (rs.results || [])) {
        await queue('return_opened', 'ret:' + c.case_id, withTitle({ buyer: c.buyer, order: c.order_id, item_id: c.item_id }));
      }
    }
    if (cfg.buyer_query) {
      // needs an item to answer against (the member-message channel demands one), and eBay's own
      // system mail must never get an auto-reply — only real buyers with a real item qualify
      const rs = await env.DB.prepare(
        "SELECT msg_id, buyer, item_id FROM buyer_messages WHERE account = ?1 AND answered = 0 " +
        "AND item_id != '' AND buyer != '' AND lower(buyer) != 'ebay' AND received_at >= datetime('now', '-3 day')"
      ).bind(acct).all();
      for (const m of (rs.results || [])) {
        await queue('buyer_query', 'q:' + m.msg_id, withTitle({ buyer: m.buyer, order: '', item_id: m.item_id }));
      }
    }
    if (cfg.arrived) {
      // "arrived" = eBay's own delivery estimate has passed (the API exposes no carrier scans).
      // Dates compare as dates — est_delivery is ISO with a 'T', datetime('now') is not, and a
      // raw string compare would shift every same-day match. The 2-day window keeps a first
      // enable from messaging every historic order at once.
      const rs = await env.DB.prepare(
        "SELECT order_id, buyer, item_id FROM orders WHERE account = ?1 AND est_delivery != '' " +
        "AND substr(est_delivery, 1, 10) <= date('now') AND substr(est_delivery, 1, 10) >= date('now', '-2 day')"
      ).bind(acct).all();
      for (const o of (rs.results || [])) {
        await queue('arrived', 'arr:' + o.order_id, withTitle({ buyer: o.buyer, order: o.order_id, item_id: o.item_id }));
      }
    }
    if (cfg.neg_fb || cfg.pos_fb) {
      const tok = await ebayAccessToken(env, acct);
      const r = await fetch('https://api.ebay.com/ws/api.dll', {
        method: 'POST',
        headers: { 'X-EBAY-API-COMPATIBILITY-LEVEL': '1193', 'X-EBAY-API-CALL-NAME': 'GetFeedback',
          'X-EBAY-API-SITEID': '3', 'X-EBAY-API-IAF-TOKEN': tok, 'content-type': 'text/xml' },
        body: '<?xml version="1.0" encoding="utf-8"?><GetFeedbackRequest xmlns="urn:ebay:apis:eBLBaseComponents">' +
          '<DetailLevel>ReturnAll</DetailLevel><Pagination><EntriesPerPage>50</EntriesPerPage><PageNumber>1</PageNumber></Pagination></GetFeedbackRequest>',
      });
      const xml = await r.text();
      if (r.ok && xml.indexOf('<Ack>Failure</Ack>') < 0) {
        const fbCut = Date.now() - 3 * 86400000;
        for (const fb of (xml.match(/<FeedbackDetail>[\s\S]*?<\/FeedbackDetail>/g) || [])) {
          if (xmlTag(fb, 'Role') !== 'Seller') continue;             // feedback we RECEIVED
          // page 1 reaches back months — without this cut, first-enable would thank OLD buyers
          const when = new Date(xmlTag(fb, 'CommentTime')).getTime();
          if (isNaN(when) || when < fbCut) continue;
          const kind = xmlTag(fb, 'CommentType') === 'Negative' ? 'neg_fb'
            : xmlTag(fb, 'CommentType') === 'Positive' ? 'pos_fb' : '';
          if (!kind || !cfg[kind]) continue;
          await queue(kind, 'fb:' + xmlTag(fb, 'FeedbackID'), withTitle({
            buyer: xmlTag(fb, 'CommentingUser'), order: '', item_id: xmlTag(fb, 'ItemID'),
          }));
        }
      }
    }
  });
}

/* Sender: paced, gated, honest — and defensive, because the far end is a real buyer.
   Four review-driven guarantees:
   1. SHADOW marks EVERY due row in one statement (no fetch budget spent, no QUEUED backlog
      lingering) — so the day AUTOMSG_LIVE is armed, nothing from the shadow era can fire.
   2. LIVE sends only rows whose trigger is STILL enabled — the OFF switch stops the queue too;
      stopped rows are marked CANCELLED, visibly.
   3. Each row is CLAIMED (QUEUED → SENDING, checked) before any network call — an overlapping
      run or a crash-retry cannot double-message a buyer. A claim that never resolves is retried
      as FAIL by hand, never silently.
   4. Everything interpolated into Trading XML is XML-escaped — buyer names are attacker text. */
function xmlEsc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
async function autoMsgSend(env) {
  if (String(env.AUTOMSG_LIVE) !== 'true') {
    await env.DB.prepare(
      "UPDATE automsg_queue SET status = 'SHADOW', detail = 'recorded, not sent — AUTOMSG_LIVE is off' " +
      "WHERE status = 'QUEUED' AND due_at <= datetime('now')"
    ).run();
    return;
  }
  const due = await env.DB.prepare(
    'SELECT q.id, q.account, q.trigger_kind, q.ref, q.buyer, q.item_id, q.body, ' +
    '       COALESCE(a.enabled, 0) AS still_on ' +
    'FROM automsg_queue q LEFT JOIN auto_msgs a ON a.account = q.account AND a.trigger_kind = q.trigger_kind ' +
    "WHERE q.status = 'QUEUED' AND q.due_at <= datetime('now') ORDER BY q.id LIMIT 5"
  ).all();
  for (const q of (due.results || [])) {
    if (!Number(q.still_on)) {
      await env.DB.prepare("UPDATE automsg_queue SET status = 'CANCELLED', detail = 'trigger was switched off before sending' WHERE id = ?1 AND status = 'QUEUED'").bind(q.id).run();
      continue;
    }
    const claim = await env.DB.prepare("UPDATE automsg_queue SET status = 'SENDING' WHERE id = ?1 AND status = 'QUEUED'").bind(q.id).run();
    if (!claim.meta || !claim.meta.changes) continue;      // someone else holds it
    try {
      const tok = await ebayAccessToken(env, q.account);
      let ok = false, detail = '';
      if (q.trigger_kind === 'return_opened' && q.ref.indexOf('ret:RETURN:') === 0) {
        const rid = q.ref.slice('ret:RETURN:'.length);
        const r = await fetch('https://api.ebay.com/post-order/v2/return/' + encodeURIComponent(rid) + '/send_message', {
          method: 'POST', headers: { authorization: 'IAF ' + tok, 'content-type': 'application/json' },
          body: JSON.stringify({ message: { content: q.body } }) });
        ok = r.ok; detail = ok ? 'sent via return thread' : (r.status + ': ' + (await r.text()).slice(0, 200));
      } else {
        const xml = '<?xml version="1.0" encoding="utf-8"?><AddMemberMessageAAQToPartnerRequest xmlns="urn:ebay:apis:eBLBaseComponents">' +
          '<ItemID>' + xmlEsc(q.item_id) + '</ItemID><MemberMessage><Subject>About your order</Subject><Body>' +
          xmlEsc(q.body) + '</Body><QuestionType>General</QuestionType>' +
          '<RecipientID>' + xmlEsc(q.buyer) + '</RecipientID></MemberMessage></AddMemberMessageAAQToPartnerRequest>';
        const r = await fetch('https://api.ebay.com/ws/api.dll', {
          method: 'POST',
          headers: { 'X-EBAY-API-COMPATIBILITY-LEVEL': '1193', 'X-EBAY-API-CALL-NAME': 'AddMemberMessageAAQToPartner',
            'X-EBAY-API-SITEID': '3', 'X-EBAY-API-IAF-TOKEN': tok, 'content-type': 'text/xml' },
          body: xml });
        const rx = await r.text();
        ok = r.ok && rx.indexOf('<Ack>Failure</Ack>') < 0;
        detail = ok ? 'sent as member message' : (xmlTag(rx, 'LongMessage') || ('HTTP ' + r.status)).slice(0, 200);
      }
      await env.DB.prepare('UPDATE automsg_queue SET status = ?2, detail = ?3 WHERE id = ?1')
        .bind(q.id, ok ? 'SENT' : 'FAIL', detail).run();
    } catch (e) {
      await env.DB.prepare("UPDATE automsg_queue SET status = 'FAIL', detail = ?2 WHERE id = ?1")
        .bind(q.id, String(e && e.message || e).slice(0, 200)).run();
    }
  }
}

/* Listing violations (§9-D: instant alert with eBay's exact text) — every 5 minutes, one cheap
   summary read per account; detail reads happen only when the summary says something exists,
   which for these accounts is the exception, not the rule. */
const VIOLATION_TYPES = ['PRODUCT_ADOPTION', 'RETURNS_POLICY', 'HTTPS', 'OUTSIDE_EBAY_BUYING_AND_SELLING', 'ASPECTS_ADOPTION'];
async function violationsSync(env) {
  await perAccount(env, 'violationsSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const sr = await fetch('https://api.ebay.com/sell/compliance/v1/listing_violation_summary', {
      headers: { authorization: 'Bearer ' + tok, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB' } });
    // Probed live: a seller with NO violations on file gets 404 (empty body), not the documented
    // 204 — all five healthy accounts answer 404 identically while every other API answers 200.
    if (sr.status === 204 || sr.status === 404) return;
    if (!sr.ok) throw new Error(acct + ' violation summary ' + sr.status + ': ' + (await sr.text()).slice(0, 120));
    const sum = await sr.json();
    for (const v of (sum.violationSummaries || [])) {
      if (!Number(v.listingCount)) continue;
      const typ = String(v.complianceType || '');
      const dr = await fetch('https://api.ebay.com/sell/compliance/v1/listing_violation?compliance_type=' + encodeURIComponent(typ) + '&limit=50', {
        headers: { authorization: 'Bearer ' + tok, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB' } });
      if (!dr.ok) continue;
      const det = await dr.json();
      for (const lv of (det.listingViolations || [])) {
        const item = String(lv.listingId || '');
        const texts = (lv.violations || []).map(x => String(x.message || x.reasonCode || '')).join(' | ').slice(0, 500);
        const seen = await env.DB.prepare('SELECT id FROM violations WHERE account = ?1 AND item_id = ?2 AND type = ?3').bind(acct, item, typ).first();
        if (seen) continue;
        await env.DB.prepare(
          "INSERT INTO violations (account, item_id, type, text, at, ack_by) VALUES (?1, ?2, ?3, ?4, datetime('now'), '')"
        ).bind(acct, item, typ, texts).run();
        const msg = '🔴 Listing violation · ' + acct + ' · item ' + item + ' · ' + typ + ' — eBay says: "' + texts.slice(0, 200) + '"';
        await queueNotify(env, 'management', 'Listing violation', msg, 'engine:viol:' + acct + ':' + item + ':' + typ);
        await notifyRole(env, 'CS', 'Listing violation', msg, 'engine:viol:' + acct + ':' + item + ':' + typ);
      }
    }
  });
}

/* ---------------- ads spend (real CPQ) — eBay's report API is asynchronous ----------------
   Nightly: ask each account for yesterday's listing-level performance report, choosing metric
   keys from eBay's own metadata so a CPS account (ad_fees) and a CPC one (cost) both work.
   Hourly: poll the tasks, download finished reports (gzip handled, zip refused honestly),
   and land the numbers in ads_daily (CPQ = spend ÷ units sold) + sales_daily.ads. Every eBay
   refusal is recorded verbatim in ad_report_tasks.error / sync_state — this is the one flow
   built against a spec we cannot probe synchronously, so the errors ARE the iteration loop. */
/* Probed live (14 Aug, Amna token): LISTING_PERFORMANCE_REPORT requires BOTH listing_id and
   campaign_id dimensions (error 35119 otherwise); 'sales' is attributed sale COUNT (our units),
   'sale_amount' the money, 'ad_fees' the spend. */
/* 19 Aug — the spend on this account fleet was reading ~£11 a day against £1.7k of revenue, and
   Hafiza showed 29 clicks against £0.00. The cause: 'ad_fees' is the PROMOTED LISTINGS STANDARD
   fee, charged as a share of an attributed SALE. Every campaign here is CPC (Advanced), where the
   charge is per CLICK and lands under a different metric — which the comment above claimed was
   handled but which was never actually in this list. So spend appeared only where an item sold,
   and a click that cost money but made no sale cost nothing at all in the portal.
   Every key is filtered against eBay's own metadata before it is asked for, so listing keys that
   an account does not offer costs nothing; the ones it does offer are summed into spend. */
/* Read off eBay's own metadata for these accounts (recorded in sync_state 'adsMetrics'), so these
   are the real keys and not a guess. The CPC charge is 'cpc_ad_fees_listingsite_currency' —
   nothing shorter exists, which is why an earlier guess at 'cpc_ad_fees' silently matched nothing.
   listingsite currency is GBP on EBAY_GB; the payout-currency twins are THE SAME MONEY again and
   are deliberately not requested, because summing both would double every figure. */
/* eBay refuses (error 35122) to put Promoted Listings STANDARD metrics and Promoted Listings
   ADVANCED (CPC) metrics in one report — they are two different products billed two different
   ways, and asking for both at once fails the whole request. So each account gets TWO report
   tasks a day, one per family, and the two land in separate columns of ads_daily. Total spend is
   the sum: a seller running both pays both. Keys are eBay's own, read from its report metadata —
   the CPC charge is 'cpc_ad_fees_listingsite_currency', and its payout-currency twin is the same
   money again and is deliberately never requested. */
/* Dimensions differ per funding model, in eBay's own words: "Minimum required dimensionKeys are:
   listing_id,ad_group_id,campaign_id" for the CPC request. Advanced campaigns are organised into
   ad groups; Standard ones have none, and asking for that dimension there fails instead. */
const ADS_FAMILIES = {
  std: { model: 'COST_PER_SALE', dims: ['listing_id', 'campaign_id'],
    keys: ['ad_fees', 'clicks', 'impressions', 'sales', 'sale_amount'] },
  cpc: { model: 'COST_PER_CLICK', dims: ['listing_id', 'ad_group_id', 'campaign_id'],
    keys: ['cpc_ad_fees_listingsite_currency', 'cpc_clicks', 'cpc_impressions',
      'cpc_attributed_sales', 'cpc_sale_amount_listingsite_currency'] },
};

/* ---------------- INTRADAY ADS (Hasib items 1/10/22): today's spend, as fresh as eBay builds
   reports. eBay accepted a today-dated report task in the live probe, so every 5-minute tick
   either polls the pending intraday tasks or kicks fresh ones — effective refresh is 5-10
   minutes, which is the honest floor of eBay's report pipeline, not the wished-for 2. Results
   land in ads_today (replaced wholesale — partial-day totals), never in ads_daily. */
async function adsIntraday(env) {
  const day = ukDate('');
  /* Rollover is a hard reset: rows from any other day are DELETED, not zeroed — so "today" on
     every board is only ever today, and a family that stopped spending can't strand yesterday's
     numbers behind the other family's fresh day stamp. The dying day's final total is recorded
     FIRST, so the validation can later reconcile the intraday pipeline against eBay's official
     daily report — without this the number vanished before anything could check it. */
  const dying = await env.DB.prepare(
    'SELECT day, ROUND(SUM(spend + cpc_spend), 2) AS sp FROM ads_today WHERE day != ?1 GROUP BY day ORDER BY day DESC LIMIT 1'
  ).bind(day).first();
  if (dying && dying.day) {
    await ctx_setSync(env, 'adsIntradayFinal', '', String(dying.day) + ':' + (Number(dying.sp) || 0));
  }
  await env.DB.prepare('DELETE FROM ads_today WHERE day != ?1').bind(day).run();
  /* Zombie tasks (a 404-forever id, a report eBay quietly dropped) must not gate the kick loop:
     any intraday task still PENDING after 2 hours is failed and forgotten. */
  await env.DB.prepare(
    "UPDATE ad_report_tasks SET status = 'FAILED', error = 'intraday timeout' WHERE status = 'PENDING' AND family LIKE '%_intra' AND created_at < datetime('now', '-2 hour')"
  ).run();
  const accs = await env.DB.prepare('SELECT name FROM accounts WHERE api_enabled = 1').all();
  for (const a of (accs.results || [])) {
    const acct = a.name;
    let tok;
    try { tok = await ebayAccessToken(env, acct); } catch (e) { continue; }

    // 1) poll anything pending for this account
    const pend = await env.DB.prepare(
      "SELECT task_id, family, report_date FROM ad_report_tasks WHERE account = ?1 AND status = 'PENDING' AND family LIKE '%_intra'"
    ).bind(acct).all();
    let polled = 0;
    for (const t of (pend.results || [])) {
      /* A task kicked before UK midnight completes AFTER it — ingesting that report under the
         new day would stamp yesterday's full spend as today's and ring every waste bell again.
         The report's own date decides; a stale one is dropped unread. */
      if (String(t.report_date) !== day) {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = 'stale day — never ingested' WHERE account = ?1 AND task_id = ?2").bind(acct, t.task_id).run();
        polled++;
        continue;
      }
      const tr = await fetch('https://api.ebay.com/sell/marketing/v1/ad_report_task/' + encodeURIComponent(t.task_id), {
        headers: { authorization: 'Bearer ' + tok } });
      if (tr.status === 404 || tr.status === 400) {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = 'task gone HTTP ' || ?3 WHERE account = ?1 AND task_id = ?2").bind(acct, t.task_id, String(tr.status)).run();
        continue;
      }
      if (!tr.ok) continue;
      const task = await tr.json();
      const st = String(task.reportTaskStatus || '');
      if (st === 'FAILED') {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = 'report failed' WHERE account = ?1 AND task_id = ?2").bind(acct, t.task_id).run();
        continue;
      }
      if (st !== 'SUCCESS' && !task.reportHref) continue;
      const rep = await fetch(String(task.reportHref || ('https://api.ebay.com/sell/marketing/v1/ad_report/' + t.task_id)), {
        headers: { authorization: 'Bearer ' + tok } });
      if (!rep.ok) continue;
      const buf = new Uint8Array(await rep.arrayBuffer());
      let text = '';
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')));
        text = await ds.text();
      } else { text = new TextDecoder().decode(buf); }
      await ingestAdsToday(env, acct, day, text, String(t.family).indexOf('cpc') === 0);
      await env.DB.prepare("UPDATE ad_report_tasks SET status = 'INGESTED', error = 'intraday' WHERE account = ?1 AND task_id = ?2").bind(acct, t.task_id).run();
      polled++;
    }
    if ((pend.results || []).length && !polled) continue;   // still building — try next tick

    // 2) nothing pending → kick both families for today
    for (const fam of Object.keys(ADS_FAMILIES)) {
      const F = ADS_FAMILIES[fam];
      const cr = await fetch('https://api.ebay.com/sell/marketing/v1/ad_report_task', {
        method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
        body: JSON.stringify({ reportType: 'LISTING_PERFORMANCE_REPORT', reportFormat: 'TSV_GZIP',
          dateFrom: day + 'T00:00:00.000Z', dateTo: day + 'T23:59:59.000Z', fundingModels: [F.model],
          dimensions: F.dims.map(d => ({ dimensionKey: d })), metricKeys: F.keys }),
      });
      if (cr.status !== 202 && !cr.ok) continue;
      const loc = cr.headers.get('location') || '';
      const taskId = loc.split('/').filter(Boolean).pop();
      /* No location header → no trackable id. Never fabricate one: a made-up id polls 404
         forever and (before the timeout above) wedged the kick gate for good. */
      if (!taskId) continue;
      await env.DB.prepare(
        "INSERT INTO ad_report_tasks (account, task_id, report_date, status, error, created_at, family) " +
        "VALUES (?1, ?2, ?3, 'PENDING', '', datetime('now'), ?4) ON CONFLICT(account, task_id) DO NOTHING"
      ).bind(acct, taskId, day, fam + '_intra').run();
    }
  }
  await wasteAlarm(env);
}

/* One family's partial-day rows replace that family's columns wholesale — a snapshot, never a sum. */
async function ingestAdsToday(env, acct, day, tsv, isCpc) {
  const lines = String(tsv || '').split(/\r?\n/).filter(l => l.trim() !== '');
  let hi = lines.findIndex(l => /listing/i.test(l) && l.indexOf('\t') >= 0);
  if (hi < 0) return 0;
  const heads = lines[hi].split('\t').map(h => h.trim().toLowerCase());
  const col = re => heads.map((h, i) => (re.test(h) && !/payout_currency/.test(h) ? i : -1)).filter(i => i >= 0);
  const cL = heads.findIndex(h => /listing/.test(h));
  const cS = col(/ad_fee/), cC = col(/^clicks$|^cpc_clicks$/), cU = col(/^sales$|^cpc_attributed_sales$/);
  const agg = {};
  for (let i = hi + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const lid = String(cells[cL] || '').replace(/\D/g, '');
    if (!lid) continue;
    const num = idx => idx >= 0 ? (Number(String(cells[idx] || '').replace(/[^0-9.\-]/g, '')) || 0) : 0;
    const sum = list => list.reduce((t, idx) => t + num(idx), 0);
    const a = (agg[lid] = agg[lid] || { s: 0, c: 0, u: 0 });
    a.s += sum(cS); a.c += sum(cC); a.u += sum(cU);
  }
  /* Day rollover is handled by adsIntraday's DELETE of any other-day rows before polling —
     within one day the report is cumulative, so an item present earlier is present later too. */
  /* CHANGE-ONLY writes (20 Aug): a full rewrite of ~570 rows per ingest was ~80k D1 rows a day
     on its own — most snapshots move a handful of items, so unchanged rows are skipped. The
     prefetch is one read; the day column doubles as the rollover marker. */
  const cur = {};
  const curRs = await env.DB.prepare(
    'SELECT item_id, spend, clicks, sales, cpc_spend, cpc_clicks, cpc_sales, day FROM ads_today WHERE account = ?1'
  ).bind(acct).all();
  for (const r of (curRs.results || [])) cur[r.item_id] = r;
  const stmts = [];
  for (const lid of Object.keys(agg)) {
    const a = agg[lid];
    const c = cur[lid];
    const same = c && String(c.day) === day && (isCpc
      ? round2(a.s) === Number(c.cpc_spend) && Math.round(a.c) === Number(c.cpc_clicks) && Math.round(a.u) === Number(c.cpc_sales)
      : round2(a.s) === Number(c.spend) && Math.round(a.c) === Number(c.clicks) && Math.round(a.u) === Number(c.sales));
    if (same) continue;
    stmts.push(isCpc
      ? env.DB.prepare(
          "INSERT INTO ads_today (account, item_id, cpc_spend, cpc_clicks, cpc_sales, day, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now')) " +
          "ON CONFLICT(account, item_id) DO UPDATE SET cpc_spend = ?3, cpc_clicks = ?4, cpc_sales = ?5, day = ?6, updated_at = datetime('now')"
        ).bind(acct, lid, round2(a.s), Math.round(a.c), Math.round(a.u), day)
      : env.DB.prepare(
          "INSERT INTO ads_today (account, item_id, spend, clicks, sales, day, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now')) " +
          "ON CONFLICT(account, item_id) DO UPDATE SET spend = ?3, clicks = ?4, sales = ?5, day = ?6, updated_at = datetime('now')"
        ).bind(acct, lid, round2(a.s), Math.round(a.c), Math.round(a.u), day));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return Object.keys(agg).length;
}

/* Hasib's waste rule (item 10): an item that has taken £3+ today and returned NOTHING is burning
   the budget — the Advertising Manager hears about it within minutes, once per item per day. */
async function wasteAlarm(env) {
  const day = ukDate('');
  const rs = await env.DB.prepare(
    'SELECT t.account, t.item_id, ROUND(t.spend + t.cpc_spend, 2) AS sp, (t.sales + t.cpc_sales) AS sold, i.title ' +
    'FROM ads_today t LEFT JOIN items_api i ON i.item_id = t.item_id ' +
    'WHERE t.day = ?1 AND (t.spend + t.cpc_spend) >= 3 AND (t.sales + t.cpc_sales) = 0 LIMIT 20'
  ).bind(day).all();
  for (const r of (rs.results || [])) {
    /* Once per item per day means the BELL too, not just the letter: the query re-matches a
       wasting item on every 5-minute tick, so the letter file is checked BEFORE queueing —
       without this, one bad item rang ~180 times a day. */
    const rung = await env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE ref = ?1 LIMIT 1')
      .bind('waste:' + r.item_id + ':' + day).first();
    if (rung) continue;
    await queueNotify(env, 'advertising', 'Ad waste',
      '🔴 £' + Number(r.sp).toFixed(2) + ' spent TODAY on ' + r.item_id + ' · ' + r.account +
      (r.title ? ' · ' + String(r.title).slice(0, 55) : '') +
      ' — and not one order. Pause it or fix it: every hour it runs is money gone.',
      'waste:' + r.item_id + ':' + day);
    await queueNotify(env, 'management', 'Ad waste',
      '🔴 £' + Number(r.sp).toFixed(2) + ' today, zero orders — ' + r.item_id + ' · ' + r.account + ' (advertising has been told).',
      'waste-m:' + r.item_id + ':' + day);
    /* Review 4: Team Lead gets LOSS alerts — and nothing else of the money picture */
    await notifyRole(env, 'Team Lead', 'Ad waste',
      '🔴 Losing money: £' + Number(r.sp).toFixed(2) + ' spent today on ' + r.item_id + ' · ' + r.account + ' with zero orders — chase it.',
      'waste-tl:' + r.item_id + ':' + day);
  }
}

/* ---------------- TRAFFIC (Hasib item 11): eBay's own Traffic Report, proven in the probe.
   Per-day account series + per-listing drilldown for 7 and 30 days. eBay refreshes this data on
   its own slow clock — hourly here is already ahead of it. */
async function trafficSync(env) {
  await perAccount(env, 'trafficSync', async (acct) => {
    const tok = await ebayAccessToken(env, acct);
    const d8 = (n) => ukDate(new Date(Date.now() - n * 86400000).toISOString()).replace(/-/g, '');
    const dayUrl = 'https://api.ebay.com/sell/analytics/v1/traffic_report?dimension=DAY' +
      '&filter=' + encodeURIComponent('marketplace_ids:{EBAY_GB},date_range:[' + d8(30) + '..' + d8(0) + ']') +
      '&metric=LISTING_IMPRESSION_TOTAL,LISTING_VIEWS_TOTAL,TRANSACTION,CLICK_THROUGH_RATE,SALES_CONVERSION_RATE';
    const dr = await fetch(dayUrl, { headers: { authorization: 'Bearer ' + tok } });
    if (dr.ok) {
      const d = await dr.json();
      const keys = ((d.header || {}).metrics || []).map(m => m.key);
      const idx = k => keys.indexOf(k);
      const stmts = [];
      for (const rec of (d.records || [])) {
        const day = String(((rec.dimensionValues || [])[0] || {}).value || '');
        if (!/^\d{8}$/.test(day)) continue;
        const v = i => i >= 0 ? Number(((rec.metricValues || [])[i] || {}).value || 0) : 0;
        stmts.push(env.DB.prepare(
          'INSERT INTO traffic_daily (account, date, impressions, views, transactions, ctr, cvr) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
          'ON CONFLICT(account, date) DO UPDATE SET impressions=?3, views=?4, transactions=?5, ctr=?6, cvr=?7'
        ).bind(acct, day.slice(0,4) + '-' + day.slice(4,6) + '-' + day.slice(6,8),
          v(idx('LISTING_IMPRESSION_TOTAL')), v(idx('LISTING_VIEWS_TOTAL')), v(idx('TRANSACTION')),
          v(idx('CLICK_THROUGH_RATE')), v(idx('SALES_CONVERSION_RATE'))));
      }
      for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    }
    /* The per-listing drilldown re-lands ~760 rows per pass; eBay refreshes traffic on a slow
       clock anyway, so four passes a day is honest and saves ~15k D1 rows/day for the quota. */
    const listingPass = new Date().getUTCHours() % 6 === 0;
    for (const range of listingPass ? [7, 30] : []) {
      const lUrl = 'https://api.ebay.com/sell/analytics/v1/traffic_report?dimension=LISTING' +
        '&filter=' + encodeURIComponent('marketplace_ids:{EBAY_GB},date_range:[' + d8(range) + '..' + d8(0) + ']') +
        '&metric=LISTING_IMPRESSION_TOTAL,LISTING_VIEWS_TOTAL,TRANSACTION&sort=-LISTING_IMPRESSION_TOTAL';
      const lr = await fetch(lUrl, { headers: { authorization: 'Bearer ' + tok } });
      if (!lr.ok) continue;
      const d = await lr.json();
      const keys = ((d.header || {}).metrics || []).map(m => m.key);
      const idx = k => keys.indexOf(k);
      const stmts = [];
      for (const rec of (d.records || []).slice(0, 300)) {
        const lid = String(((rec.dimensionValues || [])[0] || {}).value || '').replace(/\D/g, '');
        if (!lid) continue;
        const v = i => i >= 0 ? Number(((rec.metricValues || [])[i] || {}).value || 0) : 0;
        stmts.push(env.DB.prepare(
          "INSERT INTO traffic_listing (account, item_id, range_days, impressions, views, transactions, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now')) " +
          'ON CONFLICT(account, item_id, range_days) DO UPDATE SET impressions=?4, views=?5, transactions=?6, updated_at=datetime(\'now\')'
        ).bind(acct, lid, range, v(idx('LISTING_IMPRESSION_TOTAL')), v(idx('LISTING_VIEWS_TOTAL')), v(idx('TRANSACTION'))));
      }
      /* Replace, don't accrete: the report is top-300 by impressions, and a listing that ended
         or fell out would otherwise keep its stale window forever and crowd live listings off
         the board. The DELETE rides INSIDE the first batch (a D1 batch is one transaction), so
         neither a bad fetch nor a mid-run kill can ever leave the board emptier than before —
         worst case is a partially refreshed board, never a blank one. */
      if (stmts.length) {
        const del = env.DB.prepare('DELETE FROM traffic_listing WHERE account = ?1 AND range_days = ?2').bind(acct, range);
        await env.DB.batch([del].concat(stmts.slice(0, 49)));
        for (let i = 49; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
      }
    }
  });
}

async function adsReportKick(env) {
  await perAccount(env, 'adsReportKick', async (acct) => {
    const camps = await env.DB.prepare('SELECT COUNT(*) AS n FROM campaigns WHERE account = ?1').bind(acct).first();
    if (!camps || !camps.n) return;                       // no campaigns → nothing to report (or no marketing scope)
    const tok = await ebayAccessToken(env, acct);

    const md = await fetch('https://api.ebay.com/sell/marketing/v1/ad_report_metadata/listing_performance_report', {
      headers: { authorization: 'Bearer ' + tok } });
    if (!md.ok) throw new Error(acct + ' report metadata ' + md.status + ': ' + (await md.text()).slice(0, 140));
    const meta = await md.json();
    const mets = (meta.metricMetadata || []).map(m => String(m.metricKey || ''));
    /* eBay's dimension rules differ per funding model, and its refusals name the report type but
       truncate before the required set. Record what it actually offers so the next question is
       answered by evidence rather than another guess-and-deploy cycle. */
    const dims = (meta.dimensionMetadata || []).map(d => String(d.dimensionKey || '') +
      (d.fundingModels ? '(' + [].concat(d.fundingModels).join('/') + ')' : '') +
      (d.required ? '*' : ''));
    await ctx_setSync(env, 'adsDims', acct, dims.join(' '));
    const families = Object.keys(ADS_FAMILIES)
      .map(f => ({ family: f, model: ADS_FAMILIES[f].model, dims: ADS_FAMILIES[f].dims, keys: ADS_FAMILIES[f].keys.filter(m => mets.indexOf(m) >= 0) }))
      .filter(x => x.keys.length);
    if (!families.length) throw new Error(acct + ' report metadata offers no known metrics: ' + mets.join(',').slice(0, 120));
    /* Which metrics this account's report actually offers, kept where it can be read without a
       redeploy. Spend was wrong for weeks precisely because nobody could see this list. */
    await ctx_setSync(env, 'adsMetrics', acct, families.map(f => f.family + '[' + f.keys.join(' ') + ']').join(' ') + ' offered[' + mets.join(' ') + ']');

    /* SELF-HEALING WINDOW (19 Aug). Kicking only "yesterday" meant a day the cron missed — or,
       as just happened, weeks where one whole billing family was being refused — stayed a hole
       for ever. Each run now looks over the last 7 UK days and files a task for any
       (family, day) that has never been ingested, so a gap closes itself within one run. */
    const have = {};
    const doneRs = await env.DB.prepare(
      "SELECT report_date, family, status FROM ad_report_tasks WHERE account = ?1 AND report_date >= ?2"
    ).bind(acct, ukDate(new Date(Date.now() - 8 * 86400000).toISOString())).all();
    for (const r of (doneRs.results || [])) {
      if (r.status === 'INGESTED' || r.status === 'PENDING' || r.status === 'SUCCESS') {
        have[String(r.report_date) + '|' + String(r.family || 'std')] = true;
      }
    }

    const problems = [];
    /* BACKLOG CAP (20 Aug): at most 4 report-task creates per account per run. An account with a
       week-deep hole used to fire up to 14 creates in one go, and the invocation's Workers
       subrequest budget died on whichever account ran last — Saif, for 29 hours straight. The
       'have' map resumes exactly where a capped run stopped, so a hole still heals in 2-3 runs. */
    let kicked = 0;
    for (let back = 1; back <= 7 && kicked < 4; back++) {
      const day = ukDate(new Date(Date.now() - back * 86400000).toISOString());
      const from = day + 'T00:00:00.000Z';
      const to = day + 'T23:59:59.000Z';
      /* One family failing must not cost us the other — a CPC-only seller and a Standard-only
         seller both have one family that legitimately returns nothing. */
      for (const fam of families) {
        if (have[day + '|' + fam.family]) continue;
        if (kicked >= 4) break;
        kicked++;
        const cr = await fetch('https://api.ebay.com/sell/marketing/v1/ad_report_task', {
          method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
          /* fundingModels is the half of the request that was missing for weeks. eBay's answer to
             asking for CPC metrics without it is "the metric key is not supported for the funding
             model" — it defaults the report to cost-per-sale campaigns, for which a per-click
             charge does not exist. 60 of the 68 running campaigns on this fleet are
             COST_PER_CLICK, so leaving it out meant the spend screen was reporting the other 8
             and calling it the total: £11.05 against a real £406. */
          body: JSON.stringify({ reportType: 'LISTING_PERFORMANCE_REPORT', reportFormat: 'TSV_GZIP',
            dateFrom: from, dateTo: to, fundingModels: [fam.model],
            dimensions: fam.dims.map(d => ({ dimensionKey: d })), metricKeys: fam.keys }),
        });
        if (cr.status !== 202 && !cr.ok) {
          problems.push(fam.family + ' ' + day + ' ' + cr.status + ': ' + (await cr.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
          continue;
        }
        const loc = cr.headers.get('location') || '';
        const taskId = loc.split('/').filter(Boolean).pop() || ('t' + Date.now() + fam.family + back);
        await env.DB.prepare(
          "INSERT INTO ad_report_tasks (account, task_id, report_date, status, error, created_at, family) " +
          "VALUES (?1, ?2, ?3, 'PENDING', '', datetime('now'), ?4) " +
          'ON CONFLICT(account, task_id) DO NOTHING'
        ).bind(acct, taskId, day, fam.family).run();
      }
    }
    if (problems.length) await ctx_setSync(env, 'adsFamilySkip', acct, problems.join(' | ').slice(0, 1200));
  });
}

async function adsReportPoll(env) {
  await perAccount(env, 'adsReportPoll', async (acct) => {
    const pend = await env.DB.prepare(
      "SELECT task_id, report_date, family FROM ad_report_tasks WHERE account = ?1 AND status IN ('PENDING', 'SUCCESS') AND family NOT LIKE '%_intra' ORDER BY created_at LIMIT 20"
    ).bind(acct).all();
    const tasks = pend.results || [];
    if (!tasks.length) return;
    const tok = await ebayAccessToken(env, acct);

    for (const t of tasks) {
      const tr = await fetch('https://api.ebay.com/sell/marketing/v1/ad_report_task/' + encodeURIComponent(t.task_id), {
        headers: { authorization: 'Bearer ' + tok } });
      if (!tr.ok) {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = ?3 WHERE account = ?1 AND task_id = ?2")
          .bind(acct, t.task_id, ('status read ' + tr.status + ': ' + (await tr.text()).slice(0, 160))).run();
        continue;
      }
      const task = await tr.json();
      const st = String(task.reportTaskStatus || task.status || '');
      if (/FAIL|ERROR|EXPIRED/i.test(st)) {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = ?3 WHERE account = ?1 AND task_id = ?2")
          .bind(acct, t.task_id, st.slice(0, 160)).run();
        continue;
      }
      if (!/SUCCESS|COMPLETED/i.test(st)) continue;        // still running — next hour

      const href = String(task.reportHref || ('https://api.ebay.com/sell/marketing/v1/ad_report/' + t.task_id));
      const rep = await fetch(href, { headers: { authorization: 'Bearer ' + tok } });
      if (!rep.ok) {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = ?3 WHERE account = ?1 AND task_id = ?2")
          .bind(acct, t.task_id, ('download ' + rep.status).slice(0, 160)).run();
        continue;
      }
      const buf = new Uint8Array(await rep.arrayBuffer());
      let text = '';
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')));
        text = await ds.text();
      } else if (buf[0] === 0x50 && buf[1] === 0x4b) {
        await env.DB.prepare("UPDATE ad_report_tasks SET status = 'FAILED', error = 'report is a ZIP — need TSV_GZIP format' WHERE account = ?1 AND task_id = ?2")
          .bind(acct, t.task_id).run();
        continue;
      } else {
        text = new TextDecoder().decode(buf);
      }

      const ingested = await ingestAdsReport(env, acct, t.report_date, text, String(t.family || 'std'));
      await env.DB.prepare("UPDATE ad_report_tasks SET status = 'INGESTED', error = ?3 WHERE account = ?1 AND task_id = ?2")
        .bind(acct, t.task_id, ingested + ' rows').run();
    }
  });
}

/* The report is TSV with a header row (eBay sometimes prefixes metadata lines — the header is
   the first line that mentions a listing column). Column names come from the metric metadata,
   so matching is by meaning, not position. */
async function ingestAdsReport(env, acct, day, text, family) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  let hi = lines.findIndex(l => /listing/i.test(l) && l.indexOf('\t') >= 0);
  if (hi < 0) return 0;
  const heads = lines[hi].split('\t').map(h => h.trim().toLowerCase());
  const col = re => heads.findIndex(h => re.test(h));
  const cListing = col(/listing/);
  /* Spend is the SUM of every money-charged column the report carries: the Standard sale fee and
     the CPC click cost are different charges on the same listing and a seller running both pays
     both. Reading only ad_fees is what made a CPC-only account look free. */
  /* payout-currency columns restate the same money in a second currency — never summed. */
  const cols = (re) => heads.map((h, i) => (re.test(h) && !/payout_currency/.test(h) ? i : -1)).filter(i => i >= 0);
  const cSpendAll = cols(/ad_fee/);
  const cClicksAll = cols(/^clicks$|^cpc_clicks$/);
  const cUnitsAll = cols(/^sales$|^cpc_attributed_sales$/);     // eBay's 'sales' = attributed sale COUNT
  const cSalesAll = cols(/sale_amount/);
  const isCpc = String(family || 'std') === 'cpc';
  if (cListing < 0) return 0;

  const agg = {};
  for (let i = hi + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const lid = String(cells[cListing] || '').replace(/\D/g, '');
    if (!lid) continue;
    const a = (agg[lid] = agg[lid] || { spend: 0, clicks: 0, units: 0, sales: 0 });
    // eBay prints money as "GBP 3.27" (zeros sometimes as "USD 0.00") — strip everything non-numeric
    const num = idx => idx >= 0 ? (Number(String(cells[idx] || '').replace(/[^0-9.\-]/g, '')) || 0) : 0;
    const sum = list => list.reduce((t, idx) => t + num(idx), 0);
    a.spend += sum(cSpendAll); a.clicks += sum(cClicksAll); a.units += sum(cUnitsAll); a.sales += sum(cSalesAll);
  }

  const stmts = [];
  let total = 0;
  for (const lid of Object.keys(agg)) {
    const a = agg[lid];
    total += a.spend;
    /* The two billing families are written to their own columns. Sending both to `spend` would
       mean whichever report ingested second silently erased the other. */
    /* a.sales is the MONEY eBay attributes to the ads (sale_amount) — Hasib's ROAS needs it.
       It was parsed and then dropped for weeks; each family keeps its own revenue column. */
    stmts.push(isCpc
      ? env.DB.prepare(
          'INSERT INTO ads_daily (account, item_id, date, cpc_spend, cpc_clicks, cpc_sales, cpc_sale_amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
          'ON CONFLICT(account, item_id, date) DO UPDATE SET cpc_spend = ?4, cpc_clicks = ?5, cpc_sales = ?6, cpc_sale_amount = ?7'
        ).bind(acct, lid, day, round2(a.spend), Math.round(a.clicks), Math.round(a.units), round2(a.sales))
      : env.DB.prepare(
          'INSERT INTO ads_daily (account, item_id, date, spend, clicks, sales, cpq, sale_amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ' +
          'ON CONFLICT(account, item_id, date) DO UPDATE SET spend = ?4, clicks = ?5, sales = ?6, cpq = ?7, sale_amount = ?8'
        ).bind(acct, lid, day, round2(a.spend), Math.round(a.clicks), Math.round(a.units), a.units > 0 ? round2(a.spend / a.units) : 0, round2(a.sales)));
  }
  /* The day's ad spend is BOTH families added together, read back from the table rather than from
     this report alone — otherwise ingesting the Standard report would overwrite the day's total
     with only its own half, and the CPC spend would vanish until the next poll. */
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  const dayTotal = await env.DB.prepare(
    'SELECT ROUND(SUM(spend + cpc_spend), 2) AS ads, ROUND(SUM(sale_amount + cpc_sale_amount), 2) AS rev FROM ads_daily WHERE account = ?1 AND date = ?2'
  ).bind(acct, day).first();
  await env.DB.prepare(
    'INSERT INTO sales_daily (account, date, sold, oe, cost, ads, profit, ads_rev) VALUES (?1, ?2, 0, 0, 0, ?3, 0, ?4) ' +
    'ON CONFLICT(account, date) DO UPDATE SET ads = ?3, ads_rev = ?4'
  ).bind(acct, day, round2((dayTotal && dayTotal.ads) || 0), round2((dayTotal && dayTotal.rev) || 0)).run();
  return Object.keys(agg).length;
}


/* Business dates are UK dates (timezone law T-1) — an order at 00:30 UK belongs to the UK day
   it happened in, not the UTC one. */
function ukDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
const round2 = v => Math.round((Number(v) || 0) * 100) / 100;

/* The ISO instant where the current UK trading day began — for comparing against raw UTC
   created_at stamps in SQL. Same probe ordersBoard uses: try GMT, then BST. */
function ukDayStartIso() {
  const today = ukDate('');
  let ms = Date.parse(today + 'T00:00:00Z');
  for (const off of [0, -3600000]) {
    const cand = Date.parse(today + 'T00:00:00Z') + off;
    if (ukDate(new Date(cand).toISOString()) === today && ukDate(new Date(cand - 1000).toISOString()) !== today) { ms = cand; break; }
  }
  return new Date(ms).toISOString();
}

/* Nightly rollups (§3): sales_daily per account per UK day (last 8 days re-rolled, so late
   orders correct yesterday), avg_profit_7d per item, and the daily_health snapshot. Ads spend
   stays 0 until the report-task feed lands — profit here is the sheet's own per-item projection
   times units, labelled an estimate wherever it is shown. */
/* BOUNDED (19 Aug): the 8-day rebuild plus a full sold_30d pass plus computeHealth in ONE
   invocation started dying silently once orders passed 16k rows — the Worker was killed
   mid-run, so the books simply stopped updating and every money screen went stale with no
   error anywhere. Each piece now runs in its own job with its own lease, and the day rebuild
   covers 3 days (yesterday can still be corrected) instead of 8. */
async function rollups(env) { return rollupsWindow(env, 8); }
/* The cost walk reaches 45 days back and financeSync corrects fees late — a number landing on an
   old order needs a road into the books. The nightly stays at 8 days (cheap, covers the active
   week); rollupsWide re-rolls the full 45 whenever history has been repaired underneath it. */
async function rollupsWide(env) { return rollupsWindow(env, 45); }

async function rollupsWindow(env, days) {
  /* Eight days nightly: the 3-day shrink was triage for the run that died at 16k orders, but the
     kill was the per-row writes, and those batch in fifties now. */
  const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
  const ors = await env.DB.prepare('SELECT account, item_id, sold, qty, cost, ebay_fees, refunded, created_at FROM orders WHERE created_at >= ?1').bind(sinceIso).all();
  const orders = ors.results || [];
  /* The oldest UK day in the window is only PARTIALLY covered (the window edge is an instant,
     a UK day is not) — writing it would overwrite a correct full-day row with a truncated one,
     permanently. Briefly disabled in the 3-day triage, which is exactly how 15 Aug's books shrank
     to a third of the real day. That day is done and written; skip it. */
  const edgeDay = ukDate(sinceIso);

  const ids = [...new Set(orders.map(o => String(o.item_id || '')).filter(Boolean))];
  const facts = {};
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const rs = await env.DB.prepare(
      'SELECT item_id, oe, ali_cost, profit FROM items_facts WHERE item_id IN (' + chunk.map(() => '?').join(',') + ')'
    ).bind(...chunk).all();
    for (const r of (rs.results || [])) facts[r.item_id] = r;
  }

  const day = {};
  const units7 = {};
  const cut7 = Date.now() - 7 * 86400000;
  for (const o of orders) {
    const dte = ukDate(o.created_at);
    if (!dte || dte <= edgeDay) continue;
    const q = Math.max(1, Number(o.qty) || 0);       // per-unit facts × units actually sold
    const f = facts[o.item_id] || {};
    const k = o.account + '|' + dte;
    const row = (day[k] = day[k] || { sold: 0, oe: 0, cost: 0, profit: 0, returns: 0, real: 0, n: 0 });
    row.sold += Number(o.sold) || 0;                  // order total is already all units
    row.returns += Number(o.refunded) > 0 ? Number(o.refunded) : 0;  // Finances refund £, by order day — the brain's basis
    const oe = (Number(f.oe) || 0) * q;
    row.oe += oe;
    row.n++;

    /* COST, in order of how much we trust it (19 Aug):
       1. orders.cost — what the processor actually paid, typed on the day tab. Real money.
       2. items_facts.ali_cost × units — the Main Sheet's standing cost for that item.
       The sheet's cost column is blank for most items, and treating blank as zero is exactly how
       this rollup used to report a day's profit as if the goods were free. When neither is known
       the order contributes NO profit rather than a flattering one. */
    const realCost = Number(o.cost) || 0;
    const cost = realCost > 0 ? realCost : (Number(f.ali_cost) || 0) * q;
    row.cost += cost;
    if (realCost > 0) row.real++;

    if (cost > 0) {
      /* THE LAW (brain of central account sheet): the daily books carry T = 0.8 × (Earning − Cost).
         Order Earning is already net of eBay's cut; the 0.8 nets VAT — 20% owed on the selling
         price less the 20% reclaimed on the cost. Ads live in their own column, deducted at the
         period level exactly as the sheet does. Without an OE we approximate earning as
         sold − eBay's own fee figure for the order. */
      const earn = oe > 0 ? oe : (Number(o.sold) || 0) - (Number(o.ebay_fees) || 0);
      row.profit += 0.8 * (earn - cost);
    } else if (Number(f.profit)) {
      row.profit += Number(f.profit) * q;             // sheet stated a (post-VAT) profit outright
    }
    const t = new Date(o.created_at).getTime();
    if (o.item_id && !isNaN(t) && t >= cut7) units7[o.item_id] = (units7[o.item_id] || 0) + q;
  }

  /* The brain's own per-day columns (Hasib review 3: "daily report not based on the sales
     analysis brain") — pri is the CPC family ex VAT (general already lives inside real-fee OE),
     actual = T − pri − returns, ads_rev is eBay's attributed sale money for real ROAS. */
  const extraByKey = {};
  const cpcRs = await env.DB.prepare(
    'SELECT account, date, ROUND(SUM(cpc_spend), 2) AS pri, ROUND(SUM(sale_amount + cpc_sale_amount), 2) AS rev FROM ads_daily WHERE date > ?1 GROUP BY account, date'
  ).bind(edgeDay).all();
  for (const r of (cpcRs.results || [])) extraByKey[r.account + '|' + r.date] = { pri: Number(r.pri) || 0, rev: Number(r.rev) || 0 };

  const stmts = [];
  for (const k of Object.keys(day)) {
    const cut = k.indexOf('|');
    const v = day[k];
    const ex = extraByKey[k] || { pri: 0, rev: 0 };
    const actual = round2(v.profit - ex.pri - v.returns);
    stmts.push(env.DB.prepare(
      'INSERT INTO sales_daily (account, date, sold, oe, cost, ads, profit, pri, returns, actual, ads_rev) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10) ' +
      'ON CONFLICT(account, date) DO UPDATE SET sold = ?3, oe = ?4, cost = ?5, profit = ?6, pri = ?7, returns = ?8, actual = ?9, ads_rev = ?10'
    ).bind(k.slice(0, cut), k.slice(cut + 1), round2(v.sold), round2(v.oe), round2(v.cost), round2(v.profit),
      round2(ex.pri), round2(v.returns), actual, round2(ex.rev)));
  }
  /* avg_profit_7d: zero ONLY the items that stopped selling, by explicit list — a blanket
     zero-then-set spans batches, and a failure between them would serve zeros all day. Every
     statement here is independently correct, so partial failure never corrupts. */
  const nz = await env.DB.prepare('SELECT item_id FROM items_facts WHERE avg_profit_7d != 0').all();
  const stale = (nz.results || []).map(r => String(r.item_id)).filter(id => !(id in units7));
  for (let i = 0; i < stale.length; i += 60) {
    const chunk = stale.slice(i, i + 60);
    stmts.push(env.DB.prepare(
      'UPDATE items_facts SET avg_profit_7d = 0 WHERE item_id IN (' + chunk.map(() => '?').join(',') + ')'
    ).bind(...chunk));
  }
  for (const id of Object.keys(units7)) {
    const f = facts[id];
    if (!f) continue;
    stmts.push(env.DB.prepare('UPDATE items_facts SET avg_profit_7d = ?2 WHERE item_id = ?1')
      .bind(id, round2(units7[id] * (Number(f.profit) || 0) / 7)));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  const rows = await computeHealth(env);
  for (const h of rows) {
    await env.DB.prepare(
      'INSERT INTO daily_health (day, account, listings, orders_7d, revenue_7d, loss_items, json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
      'ON CONFLICT(day, account) DO UPDATE SET listings = ?3, orders_7d = ?4, revenue_7d = ?5, loss_items = ?6, json = ?7'
    ).bind(ukDate(''), h.account, h.listings, h.orders_7d, h.revenue_7d, h.loss_items,
      JSON.stringify({ campaigns_running: h.campaigns_running, campaigns_total: h.campaigns_total })).run();
  }
}

/* Split out of rollups so one heavy pass can never kill the books again. */
async function itemStats(env) {
  const s30 = {};
  const o30 = await env.DB.prepare(
    "SELECT item_id, SUM(MAX(1, qty)) AS u FROM orders WHERE created_at >= datetime('now', '-30 day') AND item_id != '' GROUP BY item_id"
  ).all();
  for (const r of (o30.results || [])) s30[r.item_id] = Number(r.u) || 0;
  const cur30 = await env.DB.prepare('SELECT item_id, sold_30d FROM items_api').all();
  const st = [];
  for (const r of (cur30.results || [])) {
    const want = s30[r.item_id] || 0;
    if (Number(r.sold_30d) !== want) st.push(env.DB.prepare('UPDATE items_api SET sold_30d = ?2 WHERE item_id = ?1').bind(r.item_id, want));
  }
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  await env.DB.prepare("DELETE FROM automsg_queue WHERE status != 'QUEUED' AND created_at < datetime('now', '-30 day')").run();
  await env.DB.prepare("DELETE FROM ad_report_tasks WHERE status IN ('INGESTED', 'FAILED') AND created_at < datetime('now', '-30 day')").run();
  /* The letters keep their meaning for a month after handling, then leave; even an unhandled
     letter retires at 90 days — the alert has either done its job by then or never will. */
  await env.DB.prepare("DELETE FROM alert_log WHERE resolved_at != '' AND created_at < datetime('now', '-30 day')").run();
  await env.DB.prepare("DELETE FROM alert_log WHERE created_at < datetime('now', '-90 day')").run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

/* THE CPC RULE (Hasib, 19 Aug): an item whose raw profit after VAT is under £3.30 has no
   business in a CPC campaign. The moment the portal sees one, Zain and Management hear about
   it — that is a money leak running on every sale, so it rings within the 5-minute tick, not
   tomorrow. One bell per item per day; it clears itself when the item leaves CPC or earns. */
const CPC_MIN_PROFIT = 3.30;
async function cpcAudit(env) {
  const bad = await env.DB.prepare(
    "SELECT f.item_id, f.account, f.profit, f.campaign_type, f.campaign_name, i.title, i.price " +
    'FROM items_facts f JOIN items_api i ON i.item_id = f.item_id ' +
    "WHERE i.status = 'ACTIVE' AND f.campaign_type LIKE '%CPC%' AND f.profit > 0 AND f.profit < ?1 " +
    'ORDER BY f.profit ASC LIMIT 40'
  ).bind(CPC_MIN_PROFIT).all();
  const today = ukDate('');
  for (const r of (bad.results || [])) {
    const seen = await env.DB.prepare(
      "SELECT 1 AS x FROM campaign_events WHERE change_type = 'cpc_rule' AND item_id = ?1 AND date(at) = date('now')"
    ).bind(String(r.item_id)).first();
    if (seen) continue;
    const msg = '🔴 Wrong CPC decision · ' + r.account + ' · ' + String(r.title || '').slice(0, 60) +
      ' (' + r.item_id + ') — raw profit £' + Number(r.profit).toFixed(2) + ' is under the £' +
      CPC_MIN_PROFIT.toFixed(2) + ' CPC floor, but it sits in "' + (r.campaign_name || r.campaign_type) +
      '". Every CPC sale on it loses money. Move it out of CPC or reprice it.';
    await env.DB.prepare(
      "INSERT INTO campaign_events (account, campaign, item_id, change_type, old, new, actor, at) VALUES (?1, ?2, ?3, 'cpc_rule', ?4, ?5, '', datetime('now'))"
    ).bind(String(r.account), String(r.campaign_name || r.campaign_type), String(r.item_id),
      'profit £' + Number(r.profit).toFixed(2), 'below £' + CPC_MIN_PROFIT.toFixed(2)).run();
    await queueNotify(env, 'advertising', 'Wrong CPC decision', msg, 'engine:cpcrule:' + r.item_id + ':' + today);
    await queueNotify(env, 'management', 'Wrong CPC decision', msg, 'engine:cpcrule:' + r.item_id + ':' + today);
  }
}

/* One shape for both the nightly snapshot and the live Account-health screen. */
async function computeHealth(env) {
  const accs = await env.DB.prepare('SELECT name FROM accounts').all();
  const cut7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const out = [];
  for (const a of (accs.results || [])) {
    const li = await env.DB.prepare("SELECT COUNT(*) AS n FROM items_api WHERE account = ?1 AND status = 'ACTIVE'").bind(a.name).first();
    const od = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(sold), 0) AS rev FROM orders WHERE account = ?1 AND created_at >= ?2').bind(a.name, cut7).first();
    const lo = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM items_facts f JOIN items_api i ON i.item_id = f.item_id WHERE i.account = ?1 AND f.profit < 0'
    ).bind(a.name).first();
    const ca = await env.DB.prepare(
      "SELECT COALESCE(SUM(CASE WHEN status LIKE '%RUNNING%' THEN 1 ELSE 0 END), 0) AS run_n, COUNT(*) AS all_n FROM campaigns WHERE account = ?1"
    ).bind(a.name).first();
    out.push({
      account: a.name,
      listings: (li && li.n) || 0,
      orders_7d: (od && od.n) || 0,
      revenue_7d: round2((od && od.rev) || 0),
      loss_items: (lo && lo.n) || 0,
      campaigns_running: (ca && ca.run_n) || 0,
      campaigns_total: (ca && ca.all_n) || 0,
    });
  }
  return out;
}
async function backup(env) {
  if (!env.BACKUPS) return;
  const tabs = ['users', 'accounts', 'items_api', 'items_facts', 'orders', 'sync_state'];
  const dump = {};
  for (const t of tabs) {
    const rs = await env.DB.prepare('SELECT * FROM ' + t).all();
    dump[t] = rs.results || [];
  }
  const day = new Date().toISOString().slice(0, 10);
  await env.BACKUPS.put('d1/' + day + '.json', JSON.stringify(dump));
}

/* ---------------- actions ---------------- */
async function pushTracking(p, ctx) {
const account = String(p.account || ''), orderId = String(p.order_id || ''), tracking = String(p.tracking || '').trim();
if (!account || !orderId || !tracking) throw new Error('SAY: account, order_id and tracking are all needed');
/* Idempotency: eBay emails the buyer when tracking lands, so a double-press must not send the
   same number twice. If this exact order+number was already pushed LIVE, report the earlier
   success instead of firing again. A DIFFERENT number is a genuine correction and goes through. */
const prior = await ctx.env.DB.prepare(
  'SELECT tracking, courier_ebay, push_status, pushed_at FROM trackings WHERE order_id = ?1'
).bind(orderId).first();
if (prior && String(prior.tracking) === tracking && /^LIVE/.test(String(prior.push_status || ''))) {
  return { shadow: false, pushed: true, already: true, carrier_auto: prior.courier_ebay,
    note: 'already on eBay — sent ' + prior.pushed_at + ', not re-sent' };
}
const tok0 = await ebayAccessToken(ctx.env, account);
const accepted = await acceptedCarriers(ctx.env, account, tok0);
const nominate = () => {
  if (/^[A-Z]{2}\d{9}GB$/i.test(tracking)) return 'RoyalMail';
  if (/^(H0|C0|T0)\d{14}$/i.test(tracking) || /^\d{16}$/.test(tracking)) return 'Hermes';
  if (/^JD\d{16,}$/i.test(tracking)) return 'Yodel';
  if (/^(JJD|JVGL)/i.test(tracking)) return 'DHL';
  if (/^1Z/i.test(tracking)) return 'UPS';
  return '';
};
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const alias = { evri: 'hermes', royalmail: 'royalmail', rm: 'royalmail' };
const pickFromList = want => {
  const w = alias[norm(want)] || norm(want);
  if (!w) return '';
  const hit = accepted.find(c => norm(c) === w) || accepted.find(c => norm(c).indexOf(w) >= 0 || w.indexOf(norm(c)) >= 0);
  return hit || '';
};
let carrier = pickFromList(p.courier) || pickFromList(nominate());
if (!carrier) carrier = accepted.find(c => norm(c) === 'other') || 'Other';
const fulfillment = { lineItems: [], shippedDate: new Date().toISOString(), shippingCarrierCode: carrier, trackingNumber: tracking };
const tok = tok0;
const or_ = await fetch('https://api.ebay.com/sell/fulfillment/v1/order/' + encodeURIComponent(orderId), {
  headers: { authorization: 'Bearer ' + tok } });
if (!or_.ok) throw new Error('SAY: order ' + orderId + ' not found on ' + account + ' (' + or_.status + ')');
const order = await or_.json();
fulfillment.lineItems = (order.lineItems || []).map(li => ({ lineItemId: li.lineItemId, quantity: li.quantity }));
if (String(ctx.env.TRACKING_LIVE) !== 'true' && !p.force_live) {
  await ctx.env.DB.prepare(
    "INSERT INTO trackings (order_id, tracking, courier_ebay, pushed_at, push_status) VALUES (?1, ?2, ?3, datetime('now'), 'SHADOW') " +
    "ON CONFLICT(order_id) DO UPDATE SET tracking=?2, courier_ebay=?3, pushed_at=datetime('now'), push_status='SHADOW'"
  ).bind(orderId, tracking, carrier).run();
  return { shadow: true, would_send: fulfillment, carrier_auto: carrier,
    note: 'SHADOW — recorded, not sent to eBay. Set TRACKING_LIVE=true to arm.' };
}
const pr = await fetch('https://api.ebay.com/sell/fulfillment/v1/order/' + encodeURIComponent(orderId) + '/shipping_fulfillment', {
  method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
  body: JSON.stringify(fulfillment) });
const ptxt = await pr.text();
await ctx.env.DB.prepare(
  "INSERT INTO trackings (order_id, tracking, courier_ebay, pushed_at, push_status) VALUES (?1, ?2, ?3, datetime('now'), ?4) " +
  "ON CONFLICT(order_id) DO UPDATE SET tracking=?2, courier_ebay=?3, pushed_at=datetime('now'), push_status=?4"
).bind(orderId, tracking, carrier, pr.ok ? 'LIVE:' + pr.status : 'FAIL:' + pr.status).run();
if (!pr.ok) throw new Error('SAY: eBay rejected the tracking (' + pr.status + '): ' + ptxt.slice(0, 160));
/* R7-3 (Hasib: "I uploaded the tracking … but it didn't update in the sheet"): a successful
   eBay push now ALSO writes the day tab's own Tracking cell + flips its Delivery Status to
   the sheet's 'Tracking' token — the same bridge the Ali-link capture rides. Best-effort:
   the eBay push already succeeded; a sheet miss is reported, never fatal. */
let sheetSaid = { ok: false, reason: 'bridge did not answer' };
try {
  const sr = await fetch(ctx.env.AS_URL, {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'engineSheetWrite', payload: {
      key: await secret(ctx.env, 'SYNC_KEY'), whitelist: 'orders_day', account,
      match_header: 'Order number', match_value: orderId,
      values: { 'Tracking number': tracking.slice(0, 60), 'Delivery Status': 'Tracking' } } }),
    signal: AbortSignal.timeout(20000),
  });
  const sb = await sr.json().catch(() => ({}));
  sheetSaid = sb.ok ? sb.data : { ok: false, reason: String(sb.error || sr.status) };
} catch (e) { sheetSaid = { ok: false, reason: String(e && e.message || e).slice(0, 120) }; }
return { shadow: false, pushed: true, carrier_auto: carrier, status: pr.status, sheet: sheetSaid,
  carriers: accepted.slice(0, 200) };
}

/* Who may hand a tracking number to eBay. The processors who type them, and the people who
   answer for the accounts. */
const TRACKING_PUSH_ROLES = ['Order Processor', 'Management', 'Ops Head', 'Team Lead'];
/* Who may read per-order data (buyer, value, deadline): the order-handling chain and CS —
   mirrors ordersView_'s PII rule on the sheet side and the Orders/Dispatch screens' role lists. */
const ORDER_DATA_ROLES = ['Order Processor', 'Management', 'Ops Head', 'Team Lead', 'CS'];
/* Who may see the buyer USERNAME (PII) — mirrors ordersView_: management, Ops Head, CS,
   Order Processor. A Team Lead reads orders but never the buyer's name. */
const ORDER_PII_ROLES = ['Management', 'Ops Head', 'CS', 'Order Processor'];

const ROUTES = {
  /* liveness — also what the client transport uses to decide Engine vs fallback */
  enginePing: { auth: 'public', fn: async () => ({ pong: Date.now() }) },

  engineHealth: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const sync = await ctx.env.DB.prepare('SELECT job, account, last_ok, last_error FROM sync_state ORDER BY job').all();
      const counts = {};
      for (const t of ['users', 'accounts', 'items_api', 'items_facts', 'orders', 'campaigns', 'campaign_ads', 'trackings', 'sales_daily', 'notify_queue', 'dup_state']) {
        const r = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM ' + t).first();
        counts[t] = r ? r.n : 0;
      }
      return { sync: sync.results || [], counts };
    },
  },

  /* Apps Script pushes its USERS + accounts registry here after every change, so
     the edge's role/module truth is at most one change behind the Portal DB. */
  syncUsers: {
    auth: 'sync', fn: async (p, ctx) => {
      const users = p.users || [];
      for (const u of users) {
        await ctx.env.DB.prepare(
          'INSERT INTO users (email, name, role, status, modules, tools, super) VALUES (?1,?2,?3,?4,?5,?6,?7) ' +
          'ON CONFLICT(email) DO UPDATE SET name=?2, role=?3, status=?4, modules=?5, tools=?6, super=?7'
        ).bind(
          String(u.email || '').toLowerCase(), String(u.name || ''), String(u.role || ''),
          String(u.status || ''), String(u.modules || ''), String(u.tools || ''), u.super ? 1 : 0
        ).run();
      }
      return { synced: users.length };
    },
  },

  syncAccounts: {
    auth: 'sync', fn: async (p, ctx) => {
      for (const a of (p.accounts || [])) {
        await ctx.env.DB.prepare(
          'INSERT INTO accounts (name, api_enabled) VALUES (?1, ?2) ' +
          'ON CONFLICT(name) DO UPDATE SET api_enabled = ?2'
        ).bind(String(a.name || ''), a.api_enabled ? 1 : 0).run();
      }
      return { synced: (p.accounts || []).length };
    },
  },

  /* Sheet facts (suppliers, OE, campaign decision) pushed from Apps Script — the sheets stay
     the human truth, the Engine is their fast mirror (dual-run, G-1). */
  /* Find one order anywhere in the fleet (req 19 Aug: "there is not option of searching order by
     order id"). Until now a lookup meant knowing which account and which day tab an order landed
     on. This searches every order the Engine holds — by order number, buyer username or item
     number — and answers with the UK day, so the Orders screen can open that exact tab. */
  orderFind: {
    auth: 'any', fn: async (p, ctx) => {
      /* The finder answers with buyer names and order values — the ordersView_ PII rule gives
         those to the order-handling chain and CS, not to every signed-in role. Same list as the
         screens that show the same data. */
      if (ORDER_DATA_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const q = String(p.q || '').trim();
      if (q.length < 3) throw new Error('SAY: type at least three characters');
      const like = '%' + q.toLowerCase() + '%';
      const rs = await ctx.env.DB.prepare(
        'SELECT o.order_id, o.account, o.item_id, o.sold, o.status, o.tracking, o.created_at, i.title ' +
        'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
        'WHERE o.order_id LIKE ?1 OR lower(o.buyer) LIKE ?1 OR o.item_id LIKE ?1 OR o.tracking LIKE ?1 ' +
        'ORDER BY o.created_at DESC LIMIT 25'
      ).bind(like).all();
      /* The day tab an order lives on is the PKT day it arrived — the processors' shift clock,
         the same rule ordersToday_ uses on the sheet side. */
      const rows = (rs.results || []).map(r => {
        const t = new Date(String(r.created_at)).getTime();
        const day = isNaN(t) ? '' : new Date(t + 5 * 3600000).toISOString().slice(0, 10);
        return { order_id: r.order_id, account: r.account, item_id: r.item_id, title: r.title || '',
          sold: r.sold, status: r.status, has_tracking: !!String(r.tracking || ''), day };
      });
      return { rows };
    },
  },

  /* THE ADVERTISING COMMAND CENTRE (Hasib items 10/18/22): combined → account → item, in eBay's
     own vocabulary, from the intraday snapshot + the 14-day daily history. The updated stamp is
     the honest cadence — the data is as fresh as eBay built its last report, nothing pretended. */
  adsBoard: {
    auth: 'any', fn: async (p, ctx) => {
      /* Account-level ad-spend totals are a money read: the gate mirrors the screen's own
         role list exactly (CAMPAIGN_ROLES also carries CS, which must not see totals). */
      if (['Advertising Manager', 'Management', 'Ops Head'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth'); // Team Lead out — ad revenue is earnings (review 4)
      const day = ukDate('');
      /* Night review 2: "advertising requires all previous numbers the way i told you" — the
         board takes a window (7/14/30/60 days) and also returns the per-day series, so the
         command centre carries the history, not just today. */
      const histDays = Math.min(60, Math.max(7, Number(p.days) || 14));
      /* Review 3: the centre takes a CUSTOM window and an account filter — from/to override the
         day-count chips, and every series row carries eBay-attributed revenue for ROAS. */
      const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
      const from = okDate(p.from) ? String(p.from) : ukDate(new Date(Date.now() - histDays * 86400000).toISOString());
      const to = okDate(p.to) ? String(p.to) : day;
      const acctF = String(p.account || '');
      const AF = acctF ? ' AND account = ?3' : '';
      const bindR = acctF ? [from, to, acctF] : [from, to];
      const today = await ctx.env.DB.prepare(
        'SELECT t.account, t.item_id, ROUND(t.spend + t.cpc_spend, 2) AS spend_t, (t.clicks + t.cpc_clicks) AS clicks_t, ' +
        '(t.sales + t.cpc_sales) AS sold_t, t.updated_at, i.title, i.price, i.status AS listing_status ' +
        'FROM ads_today t LEFT JOIN items_api i ON i.item_id = t.item_id WHERE t.day = ?1' + (acctF ? ' AND t.account = ?2' : '')
      ).bind(...(acctF ? [day, acctF] : [day])).all();
      const series = await ctx.env.DB.prepare(
        'SELECT date, ROUND(SUM(spend + cpc_spend), 2) AS spend, SUM(clicks + cpc_clicks) AS clicks, ' +
        'SUM(sales + cpc_sales) AS sold, ROUND(SUM(sale_amount + cpc_sale_amount), 2) AS rev ' +
        'FROM ads_daily WHERE date >= ?1 AND date <= ?2' + AF + ' GROUP BY date ORDER BY date DESC'
      ).bind(...bindR).all().catch(() => ({ results: [] }));
      const seriesByAcct = await ctx.env.DB.prepare(
        'SELECT account, date, ROUND(SUM(spend + cpc_spend), 2) AS spend, ROUND(SUM(sale_amount + cpc_sale_amount), 2) AS rev ' +
        'FROM ads_daily WHERE date >= ?1 AND date <= ?2' + AF + ' GROUP BY account, date ORDER BY date DESC, account'
      ).bind(...bindR).all().catch(() => ({ results: [] }));
      const hist = await ctx.env.DB.prepare(
        "SELECT a.item_id, a.account, ROUND(SUM(a.spend + a.cpc_spend), 2) AS spend_14, SUM(a.clicks + a.cpc_clicks) AS clicks_14, " +
        "SUM(a.sales + a.cpc_sales) AS sold_14 FROM ads_daily a WHERE a.date >= ?1 AND a.date <= ?2" + (acctF ? ' AND a.account = ?3' : '') + " GROUP BY a.item_id, a.account"
      ).bind(...bindR).all();
      const hBy = {};
      for (const h of (hist.results || [])) hBy[h.account + '|' + h.item_id] = h;
      const items = [];
      const accounts = {};
      let updated = '';
      for (const t of (today.results || [])) {
        const h = hBy[t.account + '|' + t.item_id] || {};
        if (String(t.updated_at || '') > updated) updated = String(t.updated_at || '');
        const row = {
          account: t.account, item_id: t.item_id, title: t.title || '', price: t.price,
          listing_status: t.listing_status || '',
          spend_today: t.spend_t || 0, clicks_today: t.clicks_t || 0, sold_today: t.sold_t || 0,
          cpc_today: t.clicks_t ? round2(t.spend_t / t.clicks_t) : 0,
          spend_14d: h.spend_14 || 0, clicks_14d: h.clicks_14 || 0, sold_14d: h.sold_14 || 0,
          waste: (t.spend_t || 0) >= 3 && !(t.sold_t || 0),
        };
        items.push(row);
        const a = (accounts[t.account] = accounts[t.account] || { account: t.account, spend: 0, clicks: 0, sold: 0, waste_n: 0 });
        a.spend = round2(a.spend + row.spend_today); a.clicks += row.clicks_today; a.sold += row.sold_today;
        if (row.waste) a.waste_n++;
      }
      // an item spending over 14d but silent today still belongs on the board
      for (const k of Object.keys(hBy)) {
        const h = hBy[k];
        if (items.some(i => i.account === h.account && i.item_id === h.item_id)) continue;
        if (!(h.spend_14 > 0)) continue;
        items.push({ account: h.account, item_id: h.item_id, title: '', price: null, listing_status: '',
          spend_today: 0, clicks_today: 0, sold_today: 0, cpc_today: 0,
          spend_14d: h.spend_14, clicks_14d: h.clicks_14 || 0, sold_14d: h.sold_14 || 0, waste: false });
      }
      items.sort((a, b) => (b.waste - a.waste) || (b.spend_today - a.spend_today) || (b.spend_14d - a.spend_14d));
      const combined = {
        spend_today: round2(items.reduce((s, i) => s + i.spend_today, 0)),
        clicks_today: items.reduce((s, i) => s + i.clicks_today, 0),
        sold_today: items.reduce((s, i) => s + i.sold_today, 0),
        waste_n: items.filter(i => i.waste).length,
        spend_14d: round2(items.reduce((s, i) => s + i.spend_14d, 0)),
      };
      /* R7-8 (Hasib): "organic vs promoted sales stats". The split is PRECISE — sales_daily.sold
         is total revenue and ads_rev is eBay's own attributed (promoted) revenue, so organic is
         the remainder. Per account and combined, over the same window as the rest of the board. */
      const splitRows = await ctx.env.DB.prepare(
        'SELECT account, ROUND(SUM(sold), 2) AS total_rev, ROUND(SUM(ads_rev), 2) AS promoted_rev ' +
        'FROM sales_daily WHERE date >= ?1 AND date <= ?2' + AF + ' GROUP BY account'
      ).bind(...bindR).all().catch(() => ({ results: [] }));
      const split = (splitRows.results || []).map((r) => {
        const total = Number(r.total_rev) || 0, promoted = Math.min(total, Number(r.promoted_rev) || 0);
        return { account: r.account, total_rev: round2(total), promoted_rev: round2(promoted),
          organic_rev: round2(total - promoted), promoted_pct: total ? round2(promoted / total * 100) : 0 };
      }).sort((a, b) => b.total_rev - a.total_rev);
      const splitTotal = split.reduce((s, r) => ({
        total_rev: round2(s.total_rev + r.total_rev), promoted_rev: round2(s.promoted_rev + r.promoted_rev),
        organic_rev: round2(s.organic_rev + r.organic_rev),
      }), { total_rev: 0, promoted_rev: 0, organic_rev: 0 });
      splitTotal.promoted_pct = splitTotal.total_rev ? round2(splitTotal.promoted_rev / splitTotal.total_rev * 100) : 0;
      splitTotal.organic_pct = splitTotal.total_rev ? round2(splitTotal.organic_rev / splitTotal.total_rev * 100) : 0;
      return { day, updated_at: updated, combined, days: histDays, from, to, account: acctF,
        series: (series.results || []),
        series_by_account: (seriesByAcct.results || []),
        accounts: Object.values(accounts).sort((a, b) => b.spend - a.spend),
        items: items.slice(0, 300),
        split: split, split_total: splitTotal,
        note: 'refreshed every 5 minutes; each cycle is as fresh as eBay built its last report (typically 5-10 minutes behind live). Organic vs promoted uses eBay-attributed sale revenue — promoted is what eBay credits to the ads, organic is the rest.' };
    },
  },

  /* THE TRAFFIC BOARD (Hasib item 11): eBay's own Traffic Report — impressions, views, CTR,
     conversion — per account per day, with the 7/30-day listing drilldown. */
  trafficBoard: {
    auth: 'any', fn: async (p, ctx) => {
      const allowed = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];
      if (allowed.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || '');
      const range = Number(p.range) === 30 ? 30 : 7;
      /* Review 3: custom windows — from/to bound the day rows; the per-listing table stays on
         eBay's own 7/30-day pre-aggregation (their API's shape, honestly labeled). */
      const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
      const dFrom = okDate(p.from) ? String(p.from) : ukDate(new Date(Date.now() - 30 * 86400000).toISOString());
      const dTo = okDate(p.to) ? String(p.to) : ukDate('');
      const days = await ctx.env.DB.prepare(
        'SELECT account, date, impressions, views, transactions, ctr, cvr FROM traffic_daily ' +
        'WHERE date >= ?1 AND date <= ?2' + (account ? ' AND account = ?3' : '') + ' ORDER BY date'
      ).bind(...[dFrom, dTo].concat(account ? [account] : [])).all();
      const listings = await ctx.env.DB.prepare(
        'SELECT t.account, t.item_id, t.impressions, t.views, t.transactions, i.title, i.status AS listing_status ' +
        'FROM traffic_listing t LEFT JOIN items_api i ON i.item_id = t.item_id ' +
        'WHERE t.range_days = ?1' + (account ? ' AND t.account = ?2' : '') +
        ' ORDER BY t.impressions DESC LIMIT 200'
      ).bind(...[range].concat(account ? [account] : [])).all();
      /* Low-conversion callout: real reach, nothing landing — views well above the account's
         own average CVR expectation with zero-to-thin sales. The money leak the dashboard
         must name, per Hasib. */
      const lows = (listings.results || [])
        .filter(l => String(l.listing_status || 'ACTIVE') === 'ACTIVE' && Number(l.views) >= 50)
        .map(l => ({ ...l, cvr_l: Number(l.views) ? (Number(l.transactions) || 0) / Number(l.views) * 100 : 0 }))
        .filter(l => l.cvr_l < 1)
        .sort((a, b) => b.views - a.views)
        .slice(0, 25);
      return { days: days.results || [], listings: listings.results || [], range,
        from: dFrom, to: dTo, low_conversion: lows,
        note: 'eBay refreshes traffic data on its own clock (up to a day behind); the portal re-reads it hourly' };
    },
  },

  /* THE ORDERS BOARD (Hasib's item 2, 19 Aug review): eBay's own status dropdown as a screen —
     every bucket across ALL dates, counted in SQL, from the same statusRefresh-converged truth.
     'Archived' is the honest home for the old orders eBay holds no dispatch record for: they were
     dispatched and delivered in the real world (Hasib's word) but tracking never reached eBay, so
     they must never read as LATE NOW. Overdue means: a RECENT order past its live ship-by. */
  ordersBoard: {
    auth: 'any', fn: async (p, ctx) => {
      if (ORDER_DATA_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || '');
      const bucket = String(p.bucket || 'awaiting');
      const seesPII = ORDER_PII_ROLES.indexOf(ctx.user.role) >= 0 || ctx.user.super;
      const acctSql = account ? ' AND o.account = ?A' : '';
      const nowIso = new Date().toISOString();
      const horizonIso = new Date(Date.now() - 14 * 86400000).toISOString();  // 'recent' = ship-by within 14 days

      const OPEN = "o.status NOT IN ('FULFILLED','NOT_FOUND','CANCELLED')";
      /* R7-3 (Hasib: "over-dues tab shows the wrong numbers"): an order whose tracking is
         already recorded — pushed from the portal or found on eBay by the backfill — is
         dispatched in the real world even while eBay's own status field lags. It must never
         sit in OVERDUE or DUE; it is workload nobody owes anymore. */
      const UNTRACKED = " AND NOT EXISTS (SELECT 1 FROM trackings t2 WHERE t2.order_id = o.order_id AND t2.tracking != '')";
      const B = {
        all:       "o.created_at >= datetime('now','-90 day')",
        cancelled: "o.status = 'CANCELLED' AND o.created_at >= datetime('now','-30 day')",
        awaiting:  OPEN + " AND (o.ship_by = '' OR o.ship_by >= ?H)",
        overdue:   OPEN + " AND o.ship_by != '' AND o.ship_by < ?N AND o.ship_by >= ?H" + UNTRACKED,
        due24:     OPEN + " AND o.ship_by != '' AND o.ship_by >= ?N AND o.ship_by < datetime(?N, '+1 day')" + UNTRACKED,
        due2d:     OPEN + " AND o.ship_by != '' AND o.ship_by >= datetime(?N, '+1 day') AND o.ship_by < datetime(?N, '+2 day')" + UNTRACKED,
        due3d:     OPEN + " AND o.ship_by != '' AND o.ship_by >= datetime(?N, '+2 day') AND o.ship_by < datetime(?N, '+3 day')" + UNTRACKED,
        dispatched:"o.status = 'FULFILLED' AND o.created_at >= datetime('now','-30 day')",
        archived:  OPEN + " AND o.ship_by != '' AND o.ship_by < ?H",
        /* R5 (Hasib): "show orders not processed or still need to be processed". Processed = an
           AliExpress order number or link is on the order — the hourly sheet sweep fills those
           in, portal-entered ones are already here. Tracking pushed via the portal also counts. */
        needs_processing: "o.status = 'NOT_STARTED' AND COALESCE(o.ali_order,'') = '' AND COALESCE(o.ali_link,'') = '' " +
          "AND o.created_at >= datetime('now','-10 day') AND NOT EXISTS (SELECT 1 FROM trackings t WHERE t.order_id = o.order_id AND t.tracking != '')",
      };

      const bindFor = (sql) => {
        const bind = [];
        let s = sql;
        // positional rewrite: ?N → now, ?H → horizon, ?A → account, in first-appearance order
        s = s.replace(/\?[NHA]/g, (m) => {
          bind.push(m === '?N' ? nowIso : m === '?H' ? horizonIso : account);
          return '?' + bind.length;
        });
        return { s, bind };
      };

      const counts = {};
      for (const k of Object.keys(B)) {
        const q = bindFor('SELECT COUNT(*) AS n FROM orders o WHERE ' + B[k] + acctSql.replace('?A', '?A'));
        const row = await ctx.env.DB.prepare(q.s).bind(...q.bind).first();
        counts[k] = (row && row.n) || 0;
      }

      /* R7-8 (Hasib): "graphical orders dashboard in today's orders". Today's live pulse — order
         count and revenue for the current day — plus a per-account split so the board can draw
         bars, all honouring the account filter. */
      const todayQ = bindFor("SELECT COUNT(*) AS n, ROUND(COALESCE(SUM(o.sold), 0), 2) AS rev FROM orders o WHERE date(o.created_at) = date('now')" + acctSql);
      const todayRow = await ctx.env.DB.prepare(todayQ.s).bind(...todayQ.bind).first();
      const byAcctQ = bindFor("SELECT o.account, COUNT(*) AS n, ROUND(COALESCE(SUM(o.sold), 0), 2) AS rev FROM orders o WHERE date(o.created_at) = date('now')" + acctSql + ' GROUP BY o.account ORDER BY n DESC');
      const byAcct = await ctx.env.DB.prepare(byAcctQ.s).bind(...byAcctQ.bind).all().catch(() => ({ results: [] }));
      const today = { orders: Number(todayRow && todayRow.n) || 0, revenue: Number(todayRow && todayRow.rev) || 0,
        by_account: (byAcct.results || []).map((r) => ({ account: r.account, orders: Number(r.n) || 0, revenue: Number(r.rev) || 0 })) };

      const sel = B[bucket] ? bucket : 'awaiting';
      const listQ = bindFor(
        'SELECT o.order_id, o.account, o.item_id, o.buyer, o.sold, o.qty, o.status, o.created_at, o.ship_by, o.ali_order, o.ali_link, i.title ' +
        'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id WHERE ' + B[sel] + acctSql +
        " ORDER BY CASE WHEN o.ship_by != '' THEN o.ship_by ELSE o.created_at END " +
        (sel === 'dispatched' || sel === 'all' ? 'DESC' : 'ASC') + ' LIMIT 150');
      const rs = await ctx.env.DB.prepare(listQ.s).bind(...listQ.bind).all();
      const rows = (rs.results || []).map(r => {
        if (!seesPII) { const c = { ...r }; delete c.buyer; return c; }
        return r;
      });
      return { bucket: sel, counts, rows, as_of: nowIso, today,
        note: sel === 'archived' ? 'Orders eBay holds no dispatch record for — dispatched and delivered in the real world, but tracking never reached eBay. They are history, not workload.' : '' };
    },
  },

  /* THE PER-ITEM P&L (Hasib's items 4 and 21): his Sales Analysis sheet's own anatomy, computed
     from real data. Chain verified to the penny against his Saif Bhai GRAND TOTAL row:
       eBay Order Earning  = revenue − real eBay fees   (fees INCLUDE the Standard/General ad fee,
                                                          because eBay charges it inside the order)
       True Order Earning  = OE − AliExpress cost − Priority(CPC) ads × 1.2 VAT
                                                         (CPC is billed separately, so it is
                                                          subtracted here; General is not — it is
                                                          already inside the fees)
       VAT to HMRC         = revenue×20% − feesVAT − aliVAT − cpcVAT   (each reclaim = amount ÷ 6
                                                          for incl-VAT figures, ×0.2 for ex-VAT)
       Raw Profit          = True OE − VAT to HMRC
     Returns ride as a per-item refund column when the cases data carries an amount. */
  /* Hasib's closing line: "management home shows everything combined". One read, every headline
     the other boards carry — each tile on the screen deep-links to its board. Counts only, so
     the whole pulse is one cheap pass. */
  /* Account KPIs from the ENGINE for every account (night review: two accounts said "not
     computed yet" for ever because the sheet cache's round-robin never reached them, and a
     third was sparse). 30-day window; traffic from eBay's own report; ads from both families
     plus today's intraday. Same money gate as the KPI screen. */
  accountKpisEngine: {
    auth: 'mgmt', fn: async (p, ctx) => {
      return memo('accountKpisEngine', 60000, async () => {
        const since30 = ukDate(new Date(Date.now() - 30 * 86400000).toISOString());
        const o = await ctx.env.DB.prepare(
          "SELECT account, COUNT(*) AS n, ROUND(COALESCE(SUM(sold), 0), 2) AS rev, COALESCE(SUM(qty), 0) AS units, " +
          "ROUND(COALESCE(SUM(CASE WHEN refunded > 0 THEN refunded ELSE 0 END), 0), 2) AS refunded " +
          "FROM orders WHERE created_at >= datetime('now', '-30 day') AND status NOT IN ('NOT_FOUND', 'CANCELLED') GROUP BY account"
        ).all();
        const a = await ctx.env.DB.prepare(
          'SELECT account, ROUND(COALESCE(SUM(spend + cpc_spend), 0), 2) AS spend FROM ads_daily WHERE date >= ?1 GROUP BY account'
        ).bind(since30).all();
        const at = await ctx.env.DB.prepare(
          'SELECT account, ROUND(COALESCE(SUM(spend + cpc_spend), 0), 2) AS spend FROM ads_today WHERE day = ?1 GROUP BY account'
        ).bind(ukDate('')).all();
        const t = await ctx.env.DB.prepare(
          'SELECT account, COALESCE(SUM(impressions), 0) AS imp, COALESCE(SUM(views), 0) AS views, COALESCE(SUM(transactions), 0) AS tx FROM traffic_daily WHERE date >= ?1 GROUP BY account'
        ).bind(since30).all();
        const l = await ctx.env.DB.prepare(
          "SELECT account, COUNT(*) AS n FROM items_api WHERE status = 'ACTIVE' GROUP BY account"
        ).all();
        const by = {};
        const get = (acct) => (by[acct] = by[acct] || { account: acct });
        for (const r of (o.results || [])) Object.assign(get(r.account), { orders_30d: r.n, revenue_30d: Number(r.rev), units_30d: r.units, refunded_30d: Number(r.refunded) });
        for (const r of (a.results || [])) get(r.account).ad_spend_30d = Number(r.spend);
        for (const r of (at.results || [])) get(r.account).ad_spend_30d = round2((get(r.account).ad_spend_30d || 0) + Number(r.spend));
        for (const r of (t.results || [])) Object.assign(get(r.account), { impressions_30d: r.imp, views_30d: r.views, traffic_tx_30d: r.tx });
        for (const r of (l.results || [])) get(r.account).listings_active = r.n;
        const rows = Object.values(by).map((r) => {
          const n = Number(r.orders_30d) || 0, rev = Number(r.revenue_30d) || 0, sp = Number(r.ad_spend_30d) || 0;
          const imp = Number(r.impressions_30d) || 0, vw = Number(r.views_30d) || 0;
          return { ...r,
            orders_day: round2(n / 30), revenue_day: round2(rev / 30),
            aov: n ? round2(rev / n) : 0,
            ctr: imp ? round2(vw / imp * 1000) / 10 : null,
            cvr: vw ? round2(Number(r.traffic_tx_30d || 0) / vw * 1000) / 10 : null,
            ad_per_order: n ? round2(sp / n) : 0,
            tacos: rev ? round2(sp / rev * 1000) / 10 : 0,
            refund_rate: rev ? round2(Number(r.refunded_30d || 0) / rev * 1000) / 10 : 0,
            impressions_day: Math.round(imp / 30) };
        }).sort((x, y) => (y.revenue_30d || 0) - (x.revenue_30d || 0));
        return { rows, window_days: 30,
          note: 'Engine truth for every account: orders + revenue from eBay orders (cancelled excluded), ads from both billing families incl today intraday, traffic from eBay\u2019s Traffic Report, refund rate from real refunds.' };
      });
    },
  },

  /* The validation battery, on demand: Management presses the button, every check answers. */
  selfTest: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const results = await selfTestRun(ctx.env);
      return { results, failed: results.filter((r) => !r.pass).length, ran_at: new Date().toISOString() };
    },
  },
  mgmtPulse: {
    auth: 'mgmt', fn: async (p, ctx) => {
      return memo('mgmtPulse', 60000, async () => {
        const one = async (sql) => { const r = await ctx.env.DB.prepare(sql).first(); return r || {}; };
        const today = ukDate('');
        /* "today" means the UK trading day everywhere on this strip: orders compare against the
           UK-midnight instant (date('now') is UTC and disagrees for an hour each summer night),
           and overdue compares ISO-to-ISO — ship_by holds 'T'-form stamps that SQL's space-form
           datetime('now') text-compare can never call overdue on the same date. */
        const money = (await ctx.env.DB.prepare(
          "SELECT COUNT(*) AS orders_n, ROUND(COALESCE(SUM(sold), 0), 2) AS revenue FROM orders WHERE created_at >= ?1 AND status != 'NOT_FOUND'"
        ).bind(ukDayStartIso()).first()) || {};
        const ads = await one(
          'SELECT ROUND(COALESCE(SUM(spend + cpc_spend), 0), 2) AS spend, COALESCE(SUM(sales + cpc_sales), 0) AS sold, ' +
          "SUM(CASE WHEN spend + cpc_spend >= 3 AND sales + cpc_sales = 0 THEN 1 ELSE 0 END) AS waste_n FROM ads_today WHERE day = '" + today + "'");
        const disp = (await ctx.env.DB.prepare(
          "SELECT SUM(CASE WHEN ship_by != '' AND ship_by < ?1 THEN 1 ELSE 0 END) AS overdue, COUNT(*) AS awaiting " +
          "FROM orders WHERE status NOT IN ('FULFILLED', 'NOT_FOUND', 'CANCELLED') AND created_at >= datetime('now', '-6 day')"
        ).bind(new Date().toISOString()).first()) || {};
        const zs = await one("SELECT COUNT(*) AS n FROM listing_decisions WHERE status = 'PENDING'");
        const mail = await one("SELECT COUNT(*) AS n FROM alert_log WHERE resolved_at = ''");
        const unc = await one(
          "SELECT COUNT(*) AS n FROM items_api ia WHERE status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM campaign_ads ca WHERE ca.listing_id = ia.item_id)");
        const dup = await one(
          "SELECT COUNT(DISTINCT account || '|' || listing_id) AS n FROM dup_state WHERE alerted_day != ''");
        /* eBay's traffic data trails by up to a day — a row for the current UK day essentially
           never exists yet, and reading it painted "0 impressions today" every morning. The
           strip shows the LATEST completed day and says which day it is. */
        const traffic = (await ctx.env.DB.prepare(
          'SELECT date, SUM(impressions) AS impressions, SUM(views) AS views FROM traffic_daily GROUP BY date ORDER BY date DESC LIMIT 1'
        ).first()) || {};
        const listings = await one("SELECT COUNT(*) AS n FROM items_api WHERE status = 'ACTIVE'");
        return { day: today,
          orders_today: Number(money.orders_n) || 0, revenue_today: Number(money.revenue) || 0,
          ad_spend_today: Number(ads.spend) || 0, ad_sold_today: Number(ads.sold) || 0, waste_n: Number(ads.waste_n) || 0,
          overdue: Number(disp.overdue) || 0, awaiting: Number(disp.awaiting) || 0,
          zero_sale_pending: Number(zs.n) || 0, letters_open: Number(mail.n) || 0,
          uncampaigned: Number(unc.n) || 0, duplicates: Number(dup.n) || 0,
          impressions_today: Number(traffic.impressions) || 0, views_today: Number(traffic.views) || 0,
          traffic_date: String(traffic.date || ''),
          active_listings: Number(listings.n) || 0 };
      });
    },
  },

  /* PORTAL SESSIONS (night list): minted only against a live Google sign-in, held 7 days,
     shared across tabs via localStorage on the client. Identity rides back so the shell can
     paint instantly on the next boot without asking anyone anything. */
  sessionMint: {
    auth: 'any', fn: async (p, ctx) => {
      const buf = new Uint8Array(32);
      crypto.getRandomValues(buf);
      const token = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
      await ctx.env.DB.prepare(
        "INSERT INTO sessions (token, email, created_at, expires_at, last_seen) VALUES (?1, ?2, datetime('now'), datetime('now', '+7 day'), datetime('now'))"
      ).bind(token, ctx.email).run();
      const u = ctx.user;
      return { session: token, user: { email: u.email, name: u.name, role: u.role, status: u.status, modules: u.modules, tools: u.tools, super: u.super } };
    },
  },
  /* The boot check: proves the stored session still stands and refreshes the role (an access
     change lands on the very next page load, not in 7 days). */
  sessionHello: {
    auth: 'any', fn: async (p, ctx) => {
      const u = ctx.user;
      return { user: { email: u.email, name: u.name, role: u.role, status: u.status, modules: u.modules, tools: u.tools, super: u.super } };
    },
  },
  sessionEnd: {
    auth: 'any', fn: async (p, ctx) => {
      const tok = String(p.session || '');
      if (/^[0-9a-f]{64}$/.test(tok)) {
        await ctx.env.DB.prepare('DELETE FROM sessions WHERE token = ?1 AND email = ?2').bind(tok, ctx.email).run();
      }
      return { ok: true };
    },
  },
  /* For Apps Script: /exec asks the Engine who a session belongs to (sync-key gated), caches
     the answer five minutes, and applies its own users-table gates as always. */
  sessionCheck: {
    auth: 'sync', fn: async (p, ctx) => {
      const tok = String(p.session || '');
      if (!/^[0-9a-f]{64}$/.test(tok)) return { ok: false };
      const row = await ctx.env.DB.prepare('SELECT email, expires_at FROM sessions WHERE token = ?1').bind(tok).first();
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (!row || String(row.expires_at) <= nowStr) return { ok: false };
      return { ok: true, email: String(row.email).toLowerCase() };
    },
  },

  /* Hasib item 7, the read side: the Engine's bells as mail. Management reads every letter;
     everyone else reads their own inbox. Unhandled first, newest first. */
  alertMail: {
    auth: 'any', fn: async (p, ctx) => {
      const mgmt = ['Management', 'Ops Head'].indexOf(ctx.user.role) >= 0 || ctx.user.super;
      /* Some bells are addressed to a ROLE alias, not a person — wasteAlarm and the campaign
         alarms write to 'advertising'. The mail view resolves the alias so the Advertising
         Manager actually reads their own alarms; 'management' letters ride the mgmt=all path. */
      const addrs = [ctx.user.email];
      if (ctx.user.role === 'Advertising Manager') addrs.push('advertising');
      const rs = await ctx.env.DB.prepare(
        'SELECT id, to_addr, type, message, ref, created_at, resolved_by, resolved_at, note FROM alert_log ' +
        (mgmt ? '' : 'WHERE to_addr IN (?1, ?2) ') +
        "ORDER BY CASE WHEN resolved_at = '' THEN 0 ELSE 1 END, id DESC LIMIT 200"
      ).bind(...(mgmt ? [] : [addrs[0], addrs[1] || addrs[0]])).all();
      const open = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM alert_log WHERE resolved_at = ''" + (mgmt ? '' : ' AND to_addr IN (?1, ?2)')
      ).bind(...(mgmt ? [] : [addrs[0], addrs[1] || addrs[0]])).first();
      return { rows: rs.results || [], open: Number(open && open.n) || 0, mgmt };
    },
  },
  /* One press clears a whole type — the CPC rule alone filed 84 letters in a day, and handling
     them one by one made the mail useless. Same visibility rules as reading. */
  alertMailResolveAll: {
    auth: 'any', fn: async (p, ctx) => {
      const type = String(p.type || '').slice(0, 60);
      if (!type) throw new Error('SAY: which type?');
      /* R7-7: money alerts can never be swept away in bulk — each must carry its own written
         feedback, acknowledged one by one. */
      if (alertStrict(type)) throw new Error('SAY: pricing/advertising alerts must be acknowledged one at a time, each with written feedback — bulk clear is not allowed for them');
      const mgmt = ['Management', 'Ops Head'].indexOf(ctx.user.role) >= 0 || ctx.user.super;
      const addrs = [ctx.email];
      if (ctx.user.role === 'Advertising Manager') addrs.push('advertising');
      const r = await ctx.env.DB.prepare(
        "UPDATE alert_log SET resolved_by = ?1, resolved_at = datetime('now'), note = 'bulk' " +
        "WHERE resolved_at = '' AND type = ?2" + (mgmt ? '' : ' AND to_addr IN (?3, ?4)')
      ).bind(...[ctx.email, type].concat(mgmt ? [] : [addrs[0], addrs[1] || addrs[0]])).run();
      return { ok: true, handled: (r.meta && r.meta.changes) || 0 };
    },
  },
  alertMailResolve: {
    auth: 'any', fn: async (p, ctx) => {
      const id = Number(p.id) || 0;
      const mgmt = ['Management', 'Ops Head'].indexOf(ctx.user.role) >= 0 || ctx.user.super;
      const row = await ctx.env.DB.prepare('SELECT id, to_addr, type, resolved_at FROM alert_log WHERE id = ?1').bind(id).first();
      /* One error for "not yours" AND "not there" below mgmt — a distinguishable not-found
         message let any signed-in user count the org's alert stream by probing ids. */
      const mine = row && (String(row.to_addr) === ctx.user.email ||
        (String(row.to_addr) === 'advertising' && ctx.user.role === 'Advertising Manager'));
      if (!mgmt && !mine) throw new AuthError('auth');
      if (!row) throw new Error('SAY: that alert is gone');
      if (String(row.resolved_at)) throw new Error('SAY: already handled — refresh');
      /* R7-7: written feedback is mandatory to acknowledge — a bare click no longer clears a
         letter. Money alerts (price/CPC/campaign/ad waste) demand a real sentence. */
      const note = String(p.note || '').trim().slice(0, 400);
      if (note.length < 3) throw new Error('SAY: write what you did about it — every alert needs a note to be acknowledged');
      if (alertStrict(row.type) && note.length < 8) throw new Error('SAY: this is a pricing/advertising alert — say what you changed and why (a few words is not enough)');
      await ctx.env.DB.prepare(
        "UPDATE alert_log SET resolved_by = ?2, resolved_at = datetime('now'), note = ?3 WHERE id = ?1"
      ).bind(id, ctx.user.email, note).run();
      return { ok: true, id };
    },
  },
  /* Hasib item 12, the read side: the queue of week-old zero-sale listings. Management and the
     Team Lead see everything; a listing manager sees only revise jobs assigned to them. */
  zeroSaleList: {
    auth: 'any', fn: async (p, ctx) => {
      const mgmt = ['Management', 'Ops Head', 'Team Lead'].indexOf(ctx.user.role) >= 0 || ctx.user.super;
      const rs = await ctx.env.DB.prepare(
        'SELECT item_id, account, title, price, born, clock, flagged_at, status, decided_by, decided_at, assignee, note ' +
        'FROM listing_decisions ' + (mgmt ? '' : 'WHERE assignee = ?1 ') +
        'ORDER BY CASE status WHEN \'PENDING\' THEN 0 ELSE 1 END, flagged_at DESC LIMIT 200'
      ).bind(...(mgmt ? [] : [ctx.user.email])).all();
      let listers = [];
      if (mgmt) {
        const ls = await ctx.env.DB.prepare(
          "SELECT email, name FROM users WHERE role IN ('Listing Manager', 'Item Lister') AND status = 'approved' ORDER BY name"
        ).all();
        listers = ls.results || [];
      }
      /* Seeing the queue and deciding it are different powers: the Team Lead reads everything
         but only Management/Ops Head get live buttons — the screen keys off canDecide. */
      const canDecide = ['Management', 'Ops Head'].indexOf(ctx.user.role) >= 0 || !!ctx.user.super;
      return { rows: rs.results || [], mgmt, canDecide, listers,
        note: 'A listing enters this queue once, when it passes 7 days with no sale (eBay’s StartTime where the sync has it, portal first-seen otherwise, and each row names its clock).' };
    },
  },
  /* The decide lever: END lands with the Team Lead, REVISE with the chosen listing manager,
     KEEP closes the row quietly. Only Management/Ops Head decide. */
  zeroSaleDecide: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const item = String(p.item_id || ''), verdict = String(p.verdict || '').toUpperCase();
      const assignee = String(p.assignee || ''), note = String(p.note || '').slice(0, 300);
      if (['END', 'REVISE', 'KEEP'].indexOf(verdict) < 0) throw new Error('SAY: the decision is END, REVISE or KEEP');
      if (verdict === 'REVISE' && !assignee) throw new Error('SAY: pick which listing manager gets the revise job');
      const row = await ctx.env.DB.prepare("SELECT item_id, account, title, status FROM listing_decisions WHERE item_id = ?1").bind(item).first();
      if (!row) throw new Error('SAY: that listing is not in the queue');
      if (row.status !== 'PENDING') throw new Error('SAY: already decided (' + row.status + ') — refresh the board');
      /* The UPDATE itself is the referee: two managers deciding at once both pass the SELECT
         above, but only the write that still finds PENDING wins — the loser's bells never fire. */
      const claim = await ctx.env.DB.prepare(
        "UPDATE listing_decisions SET status = ?2, decided_by = ?3, decided_at = datetime('now'), assignee = ?4, note = ?5 WHERE item_id = ?1 AND status = 'PENDING'"
      ).bind(item, verdict, ctx.user.email, verdict === 'END' ? '' : assignee, note).run();
      if (!claim.meta || !claim.meta.changes) throw new Error('SAY: someone else just decided this one — refresh the board');
      const label = String(row.title || item).slice(0, 70);
      if (verdict === 'END') {
        await notifyRole(ctx.env, 'Team Lead', 'End this listing',
          'Management decided: END ' + label + ' (' + item + ', ' + row.account + ') — zero sales in its first week.' + (note ? ' Note: ' + note : ''),
          'engine:zerosale:end:' + item);
      } else if (verdict === 'REVISE') {
        await queueNotify(ctx.env, assignee, 'Revise this listing',
          'Management decided: REVISE ' + label + ' (' + item + ', ' + row.account + ') — zero sales in its first week. Improve title, photos, price or specifics.' + (note ? ' Note: ' + note : ''),
          'engine:zerosale:revise:' + item);
      }
      await flushNotifyQueue(ctx.env);
      return { ok: true, item_id: item, verdict };
    },
  },
  itemPnl: {
    auth: 'any', fn: async (p, ctx) => {
      if (ITEM_PROFIT_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || '');
      const from = String(p.from || '').slice(0, 10) || ukDate(new Date(Date.now() - 6 * 86400000).toISOString());
      const to = String(p.to || '').slice(0, 10) || ukDate('');
      const acctSql = account ? ' AND o.account = ?4' : '';
      const bind = [from, to];

      const ord = await ctx.env.DB.prepare(
        'SELECT o.item_id, o.account, SUM(o.sold) AS revenue, SUM(o.qty) AS qty, COUNT(*) AS orders_n, ' +
        '       SUM(CASE WHEN o.ebay_fees > 0 THEN o.ebay_fees ELSE 0 END) AS fees, ' +
        '       SUM(CASE WHEN o.ebay_fees > 0 THEN 1 ELSE 0 END) AS fees_n, ' +
        '       SUM(o.cost) AS cost, SUM(CASE WHEN o.cost > 0 THEN 1 ELSE 0 END) AS cost_n, ' +
        '       SUM(CASE WHEN o.refunded > 0 THEN o.refunded ELSE 0 END) AS refunded ' +
        "FROM orders o WHERE o.status != 'NOT_FOUND' AND date(o.created_at) >= ?1 AND date(o.created_at) <= ?2" +
        (account ? ' AND o.account = ?3' : '') + ' GROUP BY o.item_id, o.account'
      ).bind(...[from, to].concat(account ? [account] : [])).all();

      const ads = await ctx.env.DB.prepare(
        'SELECT a.item_id, SUM(a.spend) AS gen, SUM(a.sales) AS gen_qty, SUM(a.cpc_spend) AS pri, SUM(a.cpc_sales) AS pri_qty ' +
        'FROM ads_daily a WHERE a.date >= ?1 AND a.date <= ?2' + (account ? ' AND a.account = ?3' : '') +
        ' GROUP BY a.item_id'
      ).bind(...[from, to].concat(account ? [account] : [])).all();
      const adBy = {};
      for (const a of (ads.results || [])) adBy[a.item_id] = a;

      const ttl = await ctx.env.DB.prepare('SELECT item_id, title, status FROM items_api').all();
      const titleBy = {};
      for (const t of (ttl.results || [])) titleBy[t.item_id] = t;

      const rows = [];
      for (const o of (ord.results || [])) {
        const a = adBy[o.item_id] || {};
        const revenue = round2(o.revenue || 0);
        const fees = round2(o.fees || 0);
        const cost = round2(o.cost || 0);
        const pri = round2(a.pri || 0), gen = round2(a.gen || 0);
        const priIncl = round2(pri * 1.2), genIncl = round2(gen * 1.2);
        const oe = round2(revenue - fees);
        const trueOe = round2(oe - cost - priIncl);
        const vatOut = round2(revenue * 0.2);
        const vatBack = round2(fees / 6 + cost / 6 + pri * 0.2);
        const vatHmrc = round2(vatOut - vatBack);
        /* THE ORGANISATION'S OWN LAW (the central-sheet brain, v1.3, Hasib's instruction):
           Profit = 0.8 × (Order Earning − AliExpress) — "deduct 20% selling-price VAT, reclaim
           20% cost-price VAT" — then minus net-of-VAT ad cost, then minus returns. The real
           eBay fees already carry the GENERAL ad fees inside, so only the priority (CPC)
           family is subtracted separately here; the VAT ladder above stays as detail columns. */
        const raw = round2(0.8 * (oe - cost) - pri);
        const returns = round2(o.refunded || 0);
        const actual = round2(raw - returns);
        rows.push({
          item_id: o.item_id, account: o.account,
          title: (titleBy[o.item_id] || {}).title || '',
          listing_status: (titleBy[o.item_id] || {}).status || '',
          revenue, qty: o.qty || 0, orders_n: o.orders_n || 0,
          vat_out: vatOut, fees, fees_vat: round2(fees / 6), fees_n: o.fees_n || 0,
          oe,
          ali_cost: cost, ali_vat: round2(cost / 6), cost_n: o.cost_n || 0,
          pri_qty: a.pri_qty || 0, pri_fees: pri, pri_incl: priIncl,
          gen_qty: a.gen_qty || 0, gen_incl: genIncl, gen_ex: gen,
          true_oe: trueOe, vat_hmrc: vatHmrc, raw_profit: raw, returns, actual_profit: actual,
          // completeness flags — a row missing real fees or costs says so instead of lying
          fees_complete: (o.fees_n || 0) >= (o.orders_n || 0),
          cost_complete: (o.cost_n || 0) >= (o.orders_n || 0),
        });
      }
      rows.sort((x, y) => y.revenue - x.revenue);
      const tot = {};
      for (const k of ['revenue','qty','orders_n','fees_n','cost_n','vat_out','fees','fees_vat','oe','ali_cost','ali_vat','pri_qty','pri_fees','pri_incl','gen_qty','gen_incl','gen_ex','true_oe','vat_hmrc','raw_profit','returns','actual_profit']) {
        tot[k] = round2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
      }
      return { from, to, account, rows: rows.slice(0, 400), total: tot,
        note: 'The sheet law: Raw = 0.8 × (Order Earning − AliExpress) − priority ads net of VAT · Actual = Raw − returns · general ad fees already sit inside the real eBay fees · VAT columns shown as detail' };
    },
  },

  /* DISPATCH, from eBay rather than from the day tabs (19 Aug). The sheet-scanning board had four
     separate reasons to be wrong at once: it invented ship-by as a flat five days, it only ever
     scanned the current calendar month (so OVERDUE reset itself to zero every 1st), it counted
     each line of a multi-line order as its own order, and it called an order dispatched merely
     because the tracking cell had text in it. Every one of those is answered by the orders table:
     one row per order, eBay's own ship-by, and eBay's own fulfilment status.

     LATE means eBay's deadline has passed and eBay has not seen a dispatch. That is the number
     that costs money, and it is deliberately NOT bounded to a month. */
  dispatchLive: {
    auth: 'any', fn: async (p, ctx) => {
      // late orders carry buyer-adjacent detail and order values — the Dispatch screen's own roles
      if (ORDER_DATA_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || '');
      const where = ["o.status NOT IN ('FULFILLED','CANCELLED','NOT_FOUND')", "o.ship_by != ''"];
      const bind = [];
      if (account) { bind.push(account); where.push('o.account = ?' + bind.length); }
      const open = await ctx.env.DB.prepare(
        'SELECT o.order_id, o.account, o.item_id, o.sold, o.qty, o.status, o.ship_by, o.created_at, i.title ' +
        'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
        'WHERE ' + where.join(' AND ') + ' ORDER BY o.ship_by ASC LIMIT 400'
      ).bind(...bind).all();

      const now = Date.now();
      const soon = now + 3 * 86400000;
      const late = [], dueSoon = [];
      for (const r of (open.results || [])) {
        const t = new Date(String(r.ship_by)).getTime();
        if (isNaN(t)) continue;
        /* No has_tracking here: orders.tracking is a column nothing fills — claiming "no
           tracking" from it was an invented fact. LATE already means eBay saw no dispatch. */
        const row = {
          order_id: r.order_id, account: r.account, item_id: r.item_id, title: r.title || '',
          sold: r.sold, qty: r.qty, ship_by: r.ship_by, created_at: r.created_at,
          status: r.status,
          hours_late: Math.round((now - t) / 36000) / 100,
        };
        if (t < now) late.push(row); else if (t <= soon) dueSoon.push(row);
      }

      /* Counts come from SQL, not from the capped list above — a 400-row page must never be
         allowed to under-report how many orders are actually late. */
      const cnt = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS late_n, COALESCE(SUM(sold), 0) AS late_value FROM orders o " +
        "WHERE o.status NOT IN ('FULFILLED','CANCELLED','NOT_FOUND') AND o.ship_by != '' AND o.ship_by < ?1" +
        (account ? ' AND o.account = ?2' : '')
      ).bind(...[new Date(now).toISOString()].concat(account ? [account] : [])).first();

      const awaiting = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM orders o WHERE o.status NOT IN ('FULFILLED','CANCELLED','NOT_FOUND')" + (account ? ' AND o.account = ?1' : '')
      ).bind(...(account ? [account] : [])).first();

      /* due-soon counted in SQL like its siblings — the 400-row page must never under-report */
      const soonIso = new Date(soon).toISOString();
      const dueCnt = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM orders o WHERE o.status NOT IN ('FULFILLED','CANCELLED','NOT_FOUND') AND o.ship_by != '' AND o.ship_by >= ?1 AND o.ship_by <= ?2" +
        (account ? ' AND o.account = ?3' : '')
      ).bind(...[new Date(now).toISOString(), soonIso].concat(account ? [account] : [])).first();

      /* "today" is the UK trading day; created_at is UTC. date() on the raw stamp calls a 23:30
         UK-summer order "tomorrow". The boundary instant is found by asking ukDate itself. */
      const today = ukDate(new Date().toISOString());
      let dayStartMs = Date.parse(today + 'T00:00:00Z');
      for (const offMs of [0, -3600000]) {           // GMT, then BST
        if (ukDate(new Date(Date.parse(today + 'T00:00:00Z') + offMs).toISOString()) === today &&
            ukDate(new Date(Date.parse(today + 'T00:00:00Z') + offMs - 1000).toISOString()) !== today) {
          dayStartMs = Date.parse(today + 'T00:00:00Z') + offMs;
          break;
        }
      }
      const todayRow = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM orders o WHERE o.created_at >= ?1" + (account ? ' AND o.account = ?2' : '')
      ).bind(...[new Date(dayStartMs).toISOString()].concat(account ? [account] : [])).first();

      const noDeadline = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM orders o WHERE o.status NOT IN ('FULFILLED','CANCELLED','NOT_FOUND') AND o.ship_by = ''" +
        (account ? ' AND o.account = ?1' : '')
      ).bind(...(account ? [account] : [])).first();

      /* Orders eBay has never seen a dispatch for, 30+ days on. These predate the ship-by capture
         so they carry no deadline and would otherwise vanish from every count on this screen —
         yet they are the ones that actually threaten the accounts: eBay measures us on late
         dispatch. Every one is a real order eBay believes never shipped. */
      const staleRows = await ctx.env.DB.prepare(
        "SELECT o.account, COUNT(*) AS n, ROUND(SUM(o.sold), 2) AS value, MIN(date(o.created_at)) AS oldest " +
        "FROM orders o WHERE o.status NOT IN ('FULFILLED','CANCELLED','NOT_FOUND') AND o.created_at < date('now', '-30 day')" +
        (account ? ' AND o.account = ?1' : '') + ' GROUP BY o.account ORDER BY n DESC'
      ).bind(...(account ? [account] : [])).all();
      const stale = staleRows.results || [];

      /* Review 3: "orders which have passed 8 days since order came and still not delivered" —
         the engine cannot SEE carrier delivery, but an order still not even DISPATCHED 8 days
         in is a fact it can prove, and that list is the emergency. Delivered-or-not checking
         belongs to the recheck flow (day 4 Noman · day 7 Zeeshan · day 10 Wahab). */
      const iso8 = new Date(Date.now() - 8 * 86400000).toISOString();
      const stuck = await ctx.env.DB.prepare(
        'SELECT o.order_id, o.account, o.item_id, o.sold, o.status, o.created_at, o.est_delivery, i.title ' +
        'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
        "WHERE o.status NOT IN ('FULFILLED', 'CANCELLED', 'NOT_FOUND') AND o.created_at <= ?1 " +
        (account ? 'AND o.account = ?2 ' : '') +
        'ORDER BY o.created_at ASC LIMIT 100'
      ).bind(...(account ? [iso8, account] : [iso8])).all();
      return {
        as_of: new Date().toISOString(),
        late_count: (cnt && cnt.late_n) || 0,
        late_value: round2((cnt && cnt.late_value) || 0),
        due_soon_count: (dueCnt && dueCnt.n) || 0,
        awaiting_count: (awaiting && awaiting.n) || 0,
        orders_today: (todayRow && todayRow.n) || 0,
        // orders eBay has not given a deadline for — shown so the board never implies it saw them
        no_deadline_count: (noDeadline && noDeadline.n) || 0,
        stale_count: stale.reduce((a, r) => a + (Number(r.n) || 0), 0),
        stale_value: round2(stale.reduce((a, r) => a + (Number(r.value) || 0), 0)),
        stale_by_account: stale,
        late: late.slice(0, 120),
        due_soon: dueSoon.slice(0, 120),
        stuck_8d: (stuck.results || []),
      };
    },
  },

  /* Order COST — the number that made every profit figure in the portal a fiction (19 Aug).
     eBay knows what an order sold for and what it charged in fees; it has no idea what we paid
     AliExpress for the goods. That number lives only where the processor typed it: the 'Cost'
     column of the order_processing day tab. Until this action existed, all 16,259 orders carried
     cost = 0, so 'profit' meant revenue minus eBay fees and overstated every day, every account
     and every item. Apps Script walks the day tabs on a cursor and posts them here. */
  syncCosts: {
    auth: 'sync', fn: async (p, ctx) => {
      const rows = (p.costs || []).filter((c) => String(c.order_id || '').trim() && Number(c.cost) > 0);
      if (!rows.length) return { updated: 0, matched: 0 };
      const stmt = ctx.env.DB.prepare('UPDATE orders SET cost = ?2 WHERE order_id = ?1 AND cost != ?2');
      let matched = 0;
      const batch = rows.map((c) => stmt.bind(String(c.order_id).trim(), Number(c.cost)));
      for (let i = 0; i < batch.length; i += 50) {
        const res = await ctx.env.DB.batch(batch.slice(i, i + 50));
        for (const r of res) matched += (r.meta && r.meta.changes) || 0;
      }
      if (p.account) {
        await ctx.env.DB.prepare(
          "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('costSync', ?1, ?2, datetime('now'), '') " +
          "ON CONFLICT(job, account) DO UPDATE SET cursor = ?2, last_ok = datetime('now'), last_error = ''"
        ).bind(String(p.account), matched + ' of ' + rows.length + ' cost(s)' + (p.tab ? ' from ' + p.tab : '')).run();
      }
      return { updated: matched, seen: rows.length };
    },
  },

  /* The Main Sheet's supplier and category columns ride in here too (19 Aug). Their headers are
     taken from the live sheet verbatim — 'Suuplier 2' really is spelled with two u's, and matching
     it exactly is the only reason supplier 2 arrives at all. The writes are batched: 150 items used
     to mean 150 sequential D1 round trips, which is most of why a facts push took minutes. */
  syncFacts: {
    auth: 'sync', fn: async (p, ctx) => {
      const items = (p.items || []).filter((f) => String(f.item_id || '').trim());
      if (!items.length) return { synced: 0 };
      /* Hasib item 21: a cost price that climbed more than 30 pennies is a price-revision job,
         and it should ring the moment the sheet says so — not be noticed at month end. The old
         cost is read before the write; a riser only fires on a real change (the store then holds
         the new cost, so the same rise never rings twice), never on first fill, and only for
         items still ACTIVE. */
      const oldCost = {};
      const ids = items.map((f) => String(f.item_id).trim());
      for (let i = 0; i < ids.length; i += 90) {
        const chunk = ids.slice(i, i + 90);
        const prev = await ctx.env.DB.prepare(
          'SELECT f.item_id, f.ali_cost, i.status, i.title FROM items_facts f LEFT JOIN items_api i ON i.item_id = f.item_id ' +
          'WHERE f.item_id IN (' + chunk.map(() => '?').join(',') + ')'
        ).bind(...chunk).all();
        for (const r of (prev.results || [])) oldCost[r.item_id] = r;
      }
      const risers = [];
      for (const f of items) {
        const id = String(f.item_id).trim(), prev = oldCost[id];
        const oldC = prev ? Number(prev.ali_cost) || 0 : 0;
        const newC = Number(f.ali_cost) || 0;
        if (prev && oldC > 0 && newC - oldC > 0.30 && String(prev.status) === 'ACTIVE') {
          risers.push({ id, oldC, newC, title: String(prev.title || ''), account: String(f.account || '') });
        }
      }
      const stmt = ctx.env.DB.prepare(
        'INSERT INTO items_facts (item_id, account, source, ali_cost, oe, profit, campaign_name, campaign_type, ' +
        'current_sup, sup1_link, sup2_link, sup3_link, category, enriched_at) ' +
        "VALUES (?1, ?2, 'SHEET', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, datetime('now')) " +
        'ON CONFLICT(item_id) DO UPDATE SET account=?2, ali_cost=?3, oe=?4, profit=?5, campaign_name=?6, ' +
        'campaign_type=?7, current_sup=?8, sup1_link=?9, sup2_link=?10, sup3_link=?11, category=?12, ' +
        "enriched_at=datetime('now')"
      );
      const batch = items.map((f) => stmt.bind(
        String(f.item_id).trim(), String(f.account || ''), Number(f.ali_cost) || 0, Number(f.oe) || 0,
        Number(f.profit) || 0, String(f.campaign_name || ''), String(f.campaign_type || ''),
        String(f.current_sup || ''), String(f.sup1_link || ''), String(f.sup2_link || ''),
        String(f.sup3_link || ''), String(f.category || '')));
      for (let i = 0; i < batch.length; i += 50) await ctx.env.DB.batch(batch.slice(i, i + 50));
      try {
      /* Capped and shielded: the costs are already committed above, so a notify hiccup must
         never fail the push (a thrown error made Apps Script skip the remaining chunks). */
      for (const r of risers.slice(0, 5)) {
        const msg = 'Cost up ' + Math.round((r.newC - r.oldC) * 100) + 'p on ' + (r.title || r.id).slice(0, 70) +
          ' (' + r.id + (r.account ? ', ' + r.account : '') + '): £' + r.oldC.toFixed(2) + ' → £' + r.newC.toFixed(2) +
          '. Revise the sale price or switch supplier.';
        await notifyRole(ctx.env, 'Pricing', 'Price revision needed', msg, 'engine:costup:' + r.id + ':' + r.newC.toFixed(2));
        await notifyRole(ctx.env, 'Management', 'Price revision needed', msg, 'engine:costup:' + r.id + ':' + r.newC.toFixed(2));
      }
      } catch (e) { /* letters are best-effort — the cost write above already succeeded */ }
      return { synced: batch.length, risers: risers.length };
    },
  },

  /* Tracking push (V2 req 3, A4) — SHADOW until TRACKING_LIVE='true' (G-3). The carrier comes
     from eBay's OWN accepted-carrier list (GeteBayDetails, cached 7 days per account in
     accounts.couriers_json — Hasib's A4 ruling: no manual mapping, ever). The tracking number's
     format nominates a candidate; the list decides the exact enum eBay accepts. */
  ebayPushTracking: {
    auth: 'sync', fn: async (p, ctx) => pushTracking(p, ctx),
  },

  /* The same push, but reachable by a PERSON (req: "give an option there to paste tracking and
     than a button there to upload it on ebay by choosing courier"). The automatic bulk path stays
     behind TRACKING_LIVE; this one is a deliberate per-order press with a courier the operator
     chose, so it sends for real. Every send is written to `trackings` with eBay's own answer. */
  orderPushTracking: {
    auth: 'any', fn: async (p, ctx) => {
      if (TRACKING_PUSH_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      return pushTracking({ ...p, force_live: true, by: ctx.email }, ctx);
    },
  },



  /* Active Listings dashboard read (§5 second-module 2/3): API truth + sheet facts
     joined at the edge, stripped per §6 before it leaves. Sir Hasib rows arrive via
     the sheets bridge into items_facts with source='SHEET' (G-2 chip). */
  activeListings: {
    auth: 'any', fn: async (p, ctx) => {
      const account = String(p.account || '');
      /* Search runs in D1, not in the browser: the fleet is ~900 live listings and climbing, and
         a client-side filter can only search the page it was given. An item-number lookup has to
         reach every listing, so `q` is pushed down to SQL and the row cap only bounds the reply. */
      const q = String(p.q || '').trim();
      const where = [];
      const bind = [];
      if (account) { bind.push(account); where.push('a.account = ?' + bind.length); }
      if (q) {
        bind.push('%' + q.toLowerCase() + '%');
        const n = bind.length;
        /* Campaign columns are searchable ONLY for the roles that may SEE them — otherwise a
           stripped column still leaks membership through the filter: search "Scaling", get a
           hit, and you have learned an item is in that campaign the row never showed you. */
        const canCamp = CAMPAIGN_ROLES.indexOf(ctx.user.role) >= 0 || ctx.user.super;
        where.push('(a.item_id LIKE ?' + n + ' OR lower(a.title) LIKE ?' + n +
          (canCamp ? ' OR lower(f.campaign_name) LIKE ?' + n + ' OR lower(f.campaign_type) LIKE ?' + n : '') + ')');
      }
      const rs = await ctx.env.DB.prepare(
        'SELECT a.item_id, a.account, a.title, a.price, a.qty, a.status, a.image, a.api_synced_at, a.sold_qty, a.sold_30d, ' +
        '       f.ali_cost, f.sup1, f.sup2, f.sup3, f.sup1_link, f.sup2_link, f.sup3_link, ' +
        '       f.current_sup, f.category, f.oe, f.profit, f.roi, f.margin, ' +
        '       f.avg_profit_7d, f.campaign_name, f.campaign_type, f.source ' +
        'FROM items_api a LEFT JOIN items_facts f ON f.item_id = a.item_id ' +
        "WHERE a.status = 'ACTIVE' " + (where.length ? 'AND ' + where.join(' AND ') + ' ' : '') +
        'ORDER BY a.api_synced_at DESC LIMIT 1500'
      ).bind(...bind).all();
      const rows = (rs.results || []).map(r => stripItem(r, ctx.user));
      /* Req 33 / Q9: Team Lead (and the other campaign roles) see PER-ITEM ad spend — never
         account totals. The 14-day per-item spend rides along only for those roles; the strip
         law stays the single gate. */
      if (CAMPAIGN_ROLES.indexOf(ctx.user.role) >= 0 || ctx.user.super) {
        const ads = await ctx.env.DB.prepare(
          "SELECT item_id, ROUND(SUM(spend + cpc_spend), 2) AS ad_spend_14d, SUM(sales + cpc_sales) AS ad_units_14d FROM ads_daily " +
          "WHERE date >= date('now', '-14 day') GROUP BY item_id"
        ).all();
        const byItem = {};
        for (const r of (ads.results || [])) byItem[r.item_id] = r;
        for (const r of rows) {
          const a = byItem[r.item_id];
          if (a) { r.ad_spend_14d = a.ad_spend_14d; r.ad_units_14d = a.ad_units_14d; }
        }
      }
      return { rows, source_note: 'API rows join sheet facts; SHEET rows are the bridge for the no-API account' };
    },
  },

  /* Zain's campaign watch (req 21/22): campaigns with item counts, live duplicate-ACTIVE list,
     recent event feed. Advertising Manager + Management only — Team Lead is per-item by §6/Q9
     and campaign budgets are account-level spend, so TL stays out of this screen. */
  campaignWatch: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'Advertising Manager'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      return memo('campaignWatch', 60000, async () => {
      const camps = await ctx.env.DB.prepare(
        'SELECT c.account, c.campaign_id, c.name, c.status, c.budget, c.synced_at, ' +
        '(SELECT COUNT(*) FROM campaign_ads ca WHERE ca.account = c.account AND ca.campaign_id = c.campaign_id) AS items ' +
        'FROM campaigns c ORDER BY c.account, c.status, c.name'
      ).all();
      /* One row per (item, campaign) so the screen can offer "remove from THIS one" — an
         aggregated names string cannot carry campaign ids safely (names are free text). */
      /* Review 3: a duplicated listing shows its WHOLE campaign map — every membership carries
         the campaign's live status, so a paused campaign reads as paused instead of masquerading
         as active. The listing qualifies for this board only when RUNNING in more than one. */
      const dups = await ctx.env.DB.prepare(
        'SELECT ca.account, ca.listing_id, ca.campaign_id, c.name, c.status, ia.title ' +
        'FROM campaign_ads ca ' +
        'JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id ' +
        'LEFT JOIN items_api ia ON ia.item_id = ca.listing_id ' +
        'WHERE EXISTS (' +
        '  SELECT 1 FROM campaign_ads x JOIN campaigns cx ON cx.account = x.account AND cx.campaign_id = x.campaign_id ' +
        "  WHERE x.account = ca.account AND x.listing_id = ca.listing_id AND cx.status LIKE '%RUNNING%' " +
        '  GROUP BY x.listing_id HAVING COUNT(DISTINCT x.campaign_id) > 1) ' +
        'ORDER BY ca.account, ca.listing_id'
      ).all();
      const events = await ctx.env.DB.prepare(
        'SELECT account, campaign, item_id, change_type, old, new, actor, at FROM campaign_events ORDER BY id DESC LIMIT 60'
      ).all();
      const state = await ctx.env.DB.prepare(
        "SELECT job, account, last_ok, last_error FROM sync_state WHERE job IN ('adsSync', 'adsEnrolment') AND account != ''"
      ).all();
      /* CPQ, last 14 days per item: what each listing COSTS in ads per unit it sells — and the
         burners (spend, zero sales) float to the top, because that is the money leak. */
      const cpq = await ctx.env.DB.prepare(
        "SELECT a.account, a.item_id, MAX(i.title) AS title, ROUND(SUM(a.spend + a.cpc_spend), 2) AS spend, SUM(a.clicks + a.cpc_clicks) AS clicks, " +
        'SUM(a.sales + a.cpc_sales) AS units, ' +
        'ROUND(SUM(a.spend + a.cpc_spend) / MAX(1, SUM(a.sales + a.cpc_sales)), 2) AS cpq ' +
        'FROM ads_daily a LEFT JOIN items_api i ON i.item_id = a.item_id ' +
        "WHERE a.date >= date('now', '-14 day') GROUP BY a.account, a.item_id HAVING SUM(a.spend + a.cpc_spend) > 0 " +
        'ORDER BY (SUM(a.sales + a.cpc_sales) = 0) DESC, SUM(a.spend + a.cpc_spend) DESC LIMIT 60'
      ).all();
      /* Hasib item 9, the other half: an ACTIVE listing sitting in NO campaign at all is unsold
         reach — show it right next to the duplicates so the advertising person clears both. */
      const unc = await ctx.env.DB.prepare(
        'SELECT ia.account, ia.item_id, ia.title, ia.price, ia.sold_30d ' +
        "FROM items_api ia WHERE ia.status = 'ACTIVE' " +
        '  AND NOT EXISTS (SELECT 1 FROM campaign_ads ca WHERE ca.listing_id = ia.item_id) ' +
        'ORDER BY ia.account, ia.sold_30d DESC LIMIT 300'
      ).all();
      /* Review 4b: the dynamic-campaign price rules, visible on the board (letters fire hourly) */
      const dynOver15 = await ctx.env.DB.prepare(
        "SELECT ca.listing_id AS item_id, ca.account, c.name AS cname, i.title, i.price " +
        "FROM campaign_ads ca JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id " +
        "JOIN items_api i ON i.item_id = ca.listing_id " +
        "WHERE c.status LIKE '%RUNNING%' AND lower(c.name) LIKE '%dynamic%' AND i.price > 15 AND i.status = 'ACTIVE' " +
        'ORDER BY i.price DESC LIMIT 60'
      ).all().catch(() => ({ results: [] }));
      const dynHighRate = await ctx.env.DB.prepare(
        "SELECT ca.listing_id AS item_id, ca.account, ca.bid_pct, c.name AS cname, i.title, i.price " +
        "FROM campaign_ads ca JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id " +
        "JOIN items_api i ON i.item_id = ca.listing_id " +
        "WHERE c.status LIKE '%RUNNING%' AND lower(c.name) LIKE '%dynamic%' AND c.funding_model LIKE '%SALE%' " +
        "AND i.price > 10 AND ca.bid_pct > 15 AND i.status = 'ACTIVE' ORDER BY ca.bid_pct DESC LIMIT 60"
      ).all().catch(() => ({ results: [] }));
      return { campaigns: camps.results || [], duplicates: dups.results || [], uncampaigned: unc.results || [], events: events.results || [], sync: state.results || [], cpq: cpq.results || [],
        dyn_over15: dynOver15.results || [], dyn_high_rate: dynHighRate.results || [] };
      });
    },
  },

  /* The CS live desk in one read (§9-D): open cases / returns / INR sorted by respond-by,
     30/90-day open-closed counts, unanswered received messages, eBay's own seller-standards
     verdict per account, and any listing violations. No profit fields anywhere here — CS and
     Management/Ops read it. */
  /* Review 3: the Item risk boards — returns, item-not-received, and late-tracking, ITEM BY
     ITEM. Duplicated listings across accounts are folded into one product by TITLE (the same
     product carries a different listing id per account — the title is the honest join, and the
     board says which accounts/ids fold in). Windows: today · yesterday · 7d · 30d · all time. */
  /* Review 4: the Marketing board — every sale event on every account, coverage, and the
     14-day-eligible list. */
  marketingBoard: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'Advertising Manager'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const promos = (await ctx.env.DB.prepare(
        'SELECT account, promo_id, name, type, status, start_at, end_at, discount, item_n, synced_at FROM promotions ORDER BY account, status, end_at'
      ).all()).results || [];
      const running = (await ctx.env.DB.prepare("SELECT listing_ids FROM promotions WHERE status LIKE '%RUNNING%'").all()).results || [];
      const covered = {};
      for (const r of running) for (const id of String(r.listing_ids || '').split(',')) { if (id) covered[id] = 1; }
      const items = (await ctx.env.DB.prepare(
        "SELECT item_id, account, title, price, last_revised FROM items_api WHERE status = 'ACTIVE'"
      ).all()).results || [];
      const nowMs = Date.now();
      const uncovered = items.filter(i => !covered[String(i.item_id)]);
      const eligible = uncovered.filter(i => !i.last_revised || Date.parse(String(i.last_revised).replace(' ', 'T') + 'Z') <= nowMs - 14 * 86400000);
      const blocked = uncovered.filter(i => i.last_revised && Date.parse(String(i.last_revised).replace(' ', 'T') + 'Z') > nowMs - 14 * 86400000);

      /* Review 4b: "if any item is in sale and due to the sale its profit drops under £1 —
         show it." The sheet's stated per-item profit, minus what the discount really costs at
         the law's marginal rate: a £1 price cut loses ≈ £0.67 of Actual (fees scale with price,
         then the 0.8 VAT law applies) — so disc_profit = profit − price × pct% × 0.67. */
      const runningMd = (await ctx.env.DB.prepare(
        "SELECT account, promo_id, name, discount, listing_ids FROM promotions WHERE status LIKE '%RUNNING%' AND instr(discount, '% off') > 0 AND listing_ids != ''"
      ).all()).results || [];
      const factRs = (await ctx.env.DB.prepare('SELECT item_id, profit FROM items_facts WHERE profit != 0').all()).results || [];
      const profBy = {};
      for (const f of factRs) profBy[String(f.item_id)] = Number(f.profit) || 0;
      const priceBy = {};
      const titleBy = {};
      for (const i of items) { priceBy[String(i.item_id)] = Number(i.price) || 0; titleBy[String(i.item_id)] = String(i.title || ''); }
      const lowProfit = [];
      for (const ev of runningMd) {
        const pct = Number((String(ev.discount).match(/([\d.]+)\s*%/) || [])[1]) || 0;
        if (!pct) continue;
        for (const id of String(ev.listing_ids).split(',')) {
          if (!id || !(id in profBy) || !priceBy[id]) continue;
          const cut = priceBy[id] * pct / 100;
          const disc = round2(profBy[id] - cut * 0.67);
          if (disc < 1) {
            lowProfit.push({ item_id: id, account: ev.account, title: titleBy[id] || '',
              price: priceBy[id], pct, event: String(ev.name || ev.promo_id).slice(0, 50),
              profit_listed: round2(profBy[id]), profit_in_sale: disc });
          }
        }
      }
      lowProfit.sort((a, b) => a.profit_in_sale - b.profit_in_sale);

      /* optional filters — account to account, live-only, per type */
      let view = promos;
      const fAcct = String(p.account || ''), fStatus = String(p.status || ''), fType = String(p.type || '');
      if (fAcct) view = view.filter(x => x.account === fAcct);
      if (fStatus) view = view.filter(x => new RegExp(fStatus, 'i').test(String(x.status)));
      if (fType) view = view.filter(x => new RegExp(fType, 'i').test(String(x.type)));
      return {
        promotions: view.slice(0, 400),
        total_promotions: promos.length,
        coverage: { active_items: items.length, covered: items.length - uncovered.length,
          uncovered: uncovered.length, eligible_now: eligible.length, blocked_14d: blocked.length },
        eligible: eligible.slice(0, 80),
        blocked: blocked.slice(0, 40),
        low_profit_in_sale: lowProfit.slice(0, 80),
        note: 'covered = the listing sits in at least one RUNNING event · the 14-day clock runs from the last revision the engine OBSERVED (price/title change) — tracking began 21 Aug, so an unchanged listing counts as eligible · profit-in-sale uses the law’s marginal rate (a £1 cut costs ≈ £0.67 of Actual)' };
    },
  },

  /* Review 4b: the listing-to-listing history of one sale event — who is in it and when each
     was ADDED (history accumulates from 21 Aug). */
  promoMembers: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'Advertising Manager'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || ''), pid = String(p.promo_id || '');
      if (!account || !pid) throw new Error('SAY: which event?');
      const rows = (await ctx.env.DB.prepare(
        'SELECT pm.item_id, pm.added_at, pm.last_seen, i.title, i.price, i.status AS listing_status FROM promo_members pm ' +
        'LEFT JOIN items_api i ON i.item_id = pm.item_id WHERE pm.account = ?1 AND pm.promo_id = ?2 ORDER BY pm.added_at DESC LIMIT 400'
      ).bind(account, pid).all()).results || [];
      return { account, promo_id: pid, members: rows,
        note: '"added" = when the engine first SAW the listing inside this event — the ledger began 21 Aug' };
    },
  },

  /* Review 4: the Feedback board — his Seller Hub card, all accounts, plus every comment. */
  feedbackBoard: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS', 'Team Lead'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const sums = (await ctx.env.DB.prepare('SELECT * FROM feedback_summary ORDER BY account').all()).results || [];
      const today = ukDate('');
      const shiftD = (n) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
      const yday = shiftD(1);
      const daily = (await ctx.env.DB.prepare(
        "SELECT account, type, substr(at, 1, 10) AS d, COUNT(*) AS n FROM feedback " +
        "WHERE at >= datetime('now', '-31 day') GROUP BY account, type, d"
      ).all()).results || [];
      const fAcct = String(p.account || '');
      const negatives = (await ctx.env.DB.prepare(
        "SELECT f.account, f.item_id, f.order_line, f.buyer, f.text, f.at, i.title FROM feedback f " +
        "LEFT JOIN items_api i ON i.item_id = f.item_id WHERE f.type = 'Negative'" + (fAcct ? ' AND f.account = ?1' : '') + " ORDER BY f.at DESC LIMIT 60"
      ).bind(...(fAcct ? [fAcct] : [])).all()).results || [];
      const allComments = (await ctx.env.DB.prepare(
        "SELECT f.account, f.type, f.item_id, f.buyer, f.text, f.at, i.title FROM feedback f " +
        "LEFT JOIN items_api i ON i.item_id = f.item_id" + (fAcct ? ' WHERE f.account = ?1' : '') + " ORDER BY f.at DESC LIMIT 250"
      ).bind(...(fAcct ? [fAcct] : [])).all()).results || [];
      const neutrals = (await ctx.env.DB.prepare(
        "SELECT f.account, f.item_id, f.buyer, f.text, f.at, i.title FROM feedback f " +
        "LEFT JOIN items_api i ON i.item_id = f.item_id WHERE f.type = 'Neutral' ORDER BY f.at DESC LIMIT 20"
      ).all()).results || [];
      return { summaries: sums, daily, today, yesterday: yday, negatives, neutrals, all_comments: allComments, account: fAcct,
        note: 'score and positive % are eBay’s own (GetUser); the 30-day splits come from the stored comments · a NEW negative letters management + CS the moment the sync sees it' };
    },
  },

  itemRisk: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS', 'Team Lead'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const today = ukDate('');
      const shiftD = (n) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
      const d1 = shiftD(1), d7 = shiftD(6), d30 = shiftD(29);
      /* eBay's OWN reason wording, the way his Returns Summary workbook prints it —
         "Doesn't match description or photos (9); Item defective (7)" */
      const why = (reason) => {
        const r = String(reason || '');
        if (/NOT_AS_DESCRIBED|not as described|match description/i.test(r)) return "Doesn't match description or photos";
        if (/ARRIVED_DAMAGED|damaged/i.test(r)) return 'Arrived damaged';
        if (/DEFECTIVE|faulty/i.test(r)) return 'Item defective';
        if (/DOESNT_FIT|doesn.?t fit|WRONG_SIZE/i.test(r)) return "Doesn't fit";
        if (/ORDERED_BY_MISTAKE|by mistake/i.test(r)) return 'Ordered by mistake';
        if (/WRONG_ITEM|wrong item|ORDERED_WRONG/i.test(r)) return 'Ordered the wrong item';
        if (/NO_LONGER|no longer|changed.*mind/i.test(r)) return 'No longer needed';
        if (/not received|NOT_RECEIVED|item not received/i.test(r)) return 'Item not received';
        const clean = r.replace(/_/g, ' ').toLowerCase().trim();
        return clean ? clean.charAt(0).toUpperCase() + clean.slice(1, 40) : 'Other';
      };
      const fold = (rows, dateOf, withReasons) => {
        const by = {};
        let total = 0;
        for (const r of rows) {
          const key = String(r.title || '').trim() || String(r.item_id || '?');
          const g = (by[key] = by[key] || { key, title: String(r.title || '').trim(), items: {}, accounts: {},
            all: 0, w30: 0, w7: 0, y1: 0, t0: 0, reasons: {}, refund: 0 });
          g.all++; total++;
          const d = dateOf(r);
          if (d >= d30) g.w30++;
          if (d >= d7) g.w7++;
          if (d === d1) g.y1++;
          if (d === today) g.t0++;
          if (r.item_id) g.items[r.item_id] = 1;
          if (r.account) g.accounts[r.account] = (g.accounts[r.account] || 0) + 1;
          if (withReasons) { const w = why(r.reason); g.reasons[w] = (g.reasons[w] || 0) + 1; }
          if (r.refunded > 0) g.refund += Number(r.refunded);
        }
        return Object.values(by).map(g => ({ key: g.key, title: g.title,
          item_ids: Object.keys(g.items), accounts: g.accounts,
          all: g.all, d30: g.w30, d7: g.w7, yesterday: g.y1, today: g.t0,
          refund: round2(g.refund),
          pct: total ? Math.round(g.all / total * 1000) / 10 : 0,
          reasons: Object.entries(g.reasons).sort((a, b) => b[1] - a[1])
            .map(([k, n]) => k + ' (' + n + ')').join('; '),
          duplicated: Object.keys(g.items).length > 1,
        })).sort((a, b) => b.all - a.all).slice(0, 120);
      };
      /* refund £ rides in via the order the case sits on — Finances writes the amount there */
      const acctF = String(p.account || '');
      const kindRows = async (kind) => (await ctx.env.DB.prepare(
        'SELECT c.item_id, c.account, c.reason, c.opened_at, i.title, o.refunded FROM cases c ' +
        'LEFT JOIN items_api i ON i.item_id = c.item_id ' +
        'LEFT JOIN orders o ON o.order_id = c.order_id ' +
        'WHERE c.kind = ?1' + (acctF ? ' AND c.account = ?2' : '') + ' ORDER BY c.opened_at DESC LIMIT 4000'
      ).bind(...(acctF ? [kind, acctF] : [kind])).all()).results || [];
      const retRows = await kindRows('RETURN');
      const inrRows = await kindRows('INR');
      const lateRows = (await ctx.env.DB.prepare(
        'SELECT lm.item_id, lm.account, lm.marked_at, i.title, 0 AS refunded FROM late_marks lm ' +
        'LEFT JOIN items_api i ON i.item_id = lm.item_id' + (acctF ? ' WHERE lm.account = ?1' : '') + ' ORDER BY lm.marked_at DESC LIMIT 4000'
      ).bind(...(acctF ? [acctF] : [])).all()).results || [];
      const returns = fold(retRows, r => String(r.opened_at || '').slice(0, 10), true);
      const inr = fold(inrRows, r => String(r.opened_at || '').slice(0, 10), true);
      const late = fold(lateRows, r => String(r.marked_at || '').slice(0, 10), false);
      return { today, returns, inr, late,
        alerts: {
          returns5: returns.filter(x => x.all > 5),
          inr5: inr.filter(x => x.all > 5),
          late10: late.filter(x => x.all > 10),
        },
        note: 'products folded across accounts by TITLE (a duplicated listing carries a different id per shop) · late-tracking marks accumulate from 21 Aug — an order that crosses 2 business days untracked is marked forever, even after it finally ships' };
    },
  },

  csDesk: {
    auth: 'any', fn: async (p, ctx) => {
      /* R5 (Hasib: "update cs live desk … to husnain's system"): a per-user module grant opens
         this desk for a named person without widening the whole role — the modules column is
         the same one the screens honor. Refund figures here are LOSSES, never earnings, so the
         Team-Lead profit strip stays intact. */
      const csMods = String(ctx.user.modules || '').split(',');
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super && csMods.indexOf('csDesk') < 0) throw new AuthError('auth');
      const open = await ctx.env.DB.prepare(
        "SELECT case_id, account, kind, order_id, item_id, buyer, reason, status, opened_at, payload_json FROM cases " +
        "WHERE status NOT LIKE '%CLOSED%' ORDER BY opened_at DESC LIMIT 200"
      ).all();
      /* Seller Hub's own split, mirrored: a return the buyer has not posted yet, or one still in
         the mail, is not CS workload — it is WAITING ON OTHERS. Lumping those into "open" made
         the desk read 38 where Seller Hub reads ~13, which is exactly what a CS agent calls
         wrong data. The flag is computed HERE so every consumer agrees on whose move it is. */
      const OURS = /WAITING_SELLER|^OPEN$|DECLINED|ESCALAT|PAYMENT_DISPUTE|LESS_THAN_A_FULL_REFUND|SELLER_/i;
      const THEIRS = /WAITING_BUYER|READY_TO_SHIP|ITEM_SHIPPED|ITEM_DELIVERED|AWAITING_/i;
      for (const c of (open.results || [])) {
        c.our_move = OURS.test(String(c.status)) ? 1 : THEIRS.test(String(c.status)) ? 0 : 1;
      }
      const counts = await ctx.env.DB.prepare(
        "SELECT kind, account, " +
        "SUM(CASE WHEN status NOT LIKE '%CLOSED%' THEN 1 ELSE 0 END) AS open_n, " +
        "SUM(CASE WHEN status NOT LIKE '%CLOSED%' AND (status LIKE '%WAITING_SELLER%' OR status = 'OPEN' OR status LIKE '%DECLINED%' OR status LIKE '%ESCALAT%') THEN 1 ELSE 0 END) AS ours_n, " +
        "SUM(CASE WHEN opened_at >= datetime('now', '-30 day') THEN 1 ELSE 0 END) AS d30, " +
        "SUM(CASE WHEN opened_at >= datetime('now', '-90 day') THEN 1 ELSE 0 END) AS d90 " +
        'FROM cases GROUP BY kind, account'
      ).all();
      const msgs = await ctx.env.DB.prepare(
        'SELECT msg_id, account, buyer, text, received_at FROM buyer_messages WHERE answered = 0 ORDER BY received_at DESC LIMIT 100'
      ).all();
      const std = await ctx.env.DB.prepare('SELECT account, json, synced_at FROM cs_standards').all();
      const viol = await ctx.env.DB.prepare(
        'SELECT id, account, item_id, type, text, at, ack_by FROM violations ORDER BY at DESC LIMIT 50'
      ).all();
      /* Review 3: "customer service live desk needs some respect" — the dashboard header:
         lifecycle counts, INAD split, refund MONEY (from Finances via orders.refunded, grouped
         by the ORDER's month and said so), and the reasons behind the returns. */
      const life = await ctx.env.DB.prepare(
        "SELECT SUM(CASE WHEN status NOT LIKE '%CLOSED%' THEN 1 ELSE 0 END) AS live_n, " +
        "SUM(CASE WHEN opened_at >= datetime('now', '-30 day') THEN 1 ELSE 0 END) AS opened_30, " +
        "SUM(CASE WHEN status LIKE '%CLOSED%' AND opened_at >= datetime('now', '-30 day') THEN 1 ELSE 0 END) AS closed_30, " +
        "SUM(CASE WHEN kind = 'RETURN' AND status NOT LIKE '%CLOSED%' THEN 1 ELSE 0 END) AS returns_open, " +
        "SUM(CASE WHEN kind = 'INR' AND status NOT LIKE '%CLOSED%' THEN 1 ELSE 0 END) AS inr_open, " +
        "SUM(CASE WHEN kind = 'RETURN' AND (reason LIKE '%NOT_AS_DESCRIBED%' OR reason LIKE '%not as described%' OR reason LIKE '%DEFECTIVE%' OR reason LIKE '%WRONG%') AND status NOT LIKE '%CLOSED%' THEN 1 ELSE 0 END) AS inad_open " +
        'FROM cases'
      ).first();
      const refunds = await ctx.env.DB.prepare(
        "SELECT ROUND(COALESCE(SUM(CASE WHEN substr(created_at, 1, 10) = ?1 AND refunded > 0 THEN refunded END), 0), 2) AS today, " +
        "ROUND(COALESCE(SUM(CASE WHEN substr(created_at, 1, 7) = ?2 AND refunded > 0 THEN refunded END), 0), 2) AS this_month, " +
        "ROUND(COALESCE(SUM(CASE WHEN substr(created_at, 1, 7) = ?3 AND refunded > 0 THEN refunded END), 0), 2) AS last_month, " +
        "SUM(CASE WHEN substr(created_at, 1, 7) = ?2 AND refunded > 0 THEN 1 ELSE 0 END) AS this_month_n " +
        'FROM orders'
      ).bind(ukDate(''), ukDate('').slice(0, 7),
        (() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })()
      ).first();
      const reasons = await ctx.env.DB.prepare(
        "SELECT CASE WHEN reason LIKE '%NOT_AS_DESCRIBED%' OR reason LIKE '%not as described%' THEN 'Item not as described' " +
        "WHEN reason LIKE '%DEFECTIVE%' OR reason LIKE '%faulty%' THEN 'Defective / faulty' " +
        "WHEN reason LIKE '%WRONG%' THEN 'Wrong item sent' " +
        "WHEN reason LIKE '%NO_LONGER%' OR reason LIKE '%changed%mind%' OR reason LIKE '%BUYER%' THEN 'Buyer changed mind' " +
        "WHEN reason LIKE '%not received%' OR reason LIKE '%NOT_RECEIVED%' THEN 'Not received' " +
        "ELSE 'Other' END AS why, COUNT(*) AS n " +
        "FROM cases WHERE kind = 'RETURN' AND opened_at >= datetime('now', '-60 day') GROUP BY why ORDER BY n DESC"
      ).all();
      return { open: open.results || [], counts: counts.results || [], messages: msgs.results || [],
        standards: std.results || [], violations: viol.results || [],
        dashboard: { life: life || {}, refunds: refunds || {}, reasons: reasons.results || [],
          refund_note: 'refund £ grouped by the ORDER’s date (Finances writes the amount onto the order)' } };
    },
  },

  /* Auto-message controls (§9-D): the CS agent owns the switchboard — per account, per
     trigger: on/off, template, delay. Every change lands in the audit trail with a name. */
  autoMsgConfig: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const accs = await ctx.env.DB.prepare('SELECT name FROM accounts ORDER BY name').all();
      const rows = await ctx.env.DB.prepare('SELECT account, trigger_kind, template, delay_min, enabled FROM auto_msgs').all();
      const tail = await ctx.env.DB.prepare(
        'SELECT account, trigger_kind, buyer, body, due_at, status, detail FROM automsg_queue ORDER BY id DESC LIMIT 15'
      ).all();
      return { accounts: (accs.results || []).map(a => a.name), triggers: AUTOMSG_TRIGGERS,
        rows: rows.results || [], queue: tail.results || [],
        live: String(ctx.env.AUTOMSG_LIVE) === 'true',
        note: "'arrived' fires when eBay's estimated delivery date passes — the API has no carrier scans, so it means 'should have arrived by now'" };
    },
  },

  autoMsgSet: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || ''), kind = String(p.trigger_kind || '');
      if (!account || AUTOMSG_TRIGGERS.indexOf(kind) < 0) throw new Error('SAY: account and a known trigger are needed');
      const enabled = p.enabled ? 1 : 0;
      const tpl = String(p.template || '').slice(0, 900);
      const delay = Math.max(0, Math.min(1440, Number(p.delay_min) || 0));
      if (enabled && !tpl.trim()) throw new Error('SAY: an enabled trigger needs a template');
      await ctx.env.DB.prepare(
        'INSERT INTO auto_msgs (account, trigger_kind, template, delay_min, enabled) VALUES (?1, ?2, ?3, ?4, ?5) ' +
        'ON CONFLICT(account, trigger_kind) DO UPDATE SET template = ?3, delay_min = ?4, enabled = ?5'
      ).bind(account, kind, tpl, delay, enabled).run();
      await ctx.env.DB.prepare(
        "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'AUTOMSG_SET', ?2, '', ?3, datetime('now'))"
      ).bind(ctx.email, account + ':' + kind, (enabled ? 'ON' : 'OFF') + ' delay ' + delay + 'm').run();
      return { saved: true, account, trigger_kind: kind, enabled: !!enabled };
    },
  },

  /* CS writes (§9-D, the desk's hands) — SHADOW until CS_WRITE_LIVE='true'. Post-Order lets a
     seller message the buyer and issue the refund on RETURNS and INQUIRIES; formal CASES only
     take appeals, so the desk says "open eBay" for those instead of pretending. Every action is
     audited and belled under the actor's name — a refund is money moving. */
  csReply: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const key = String(p.case_key || ''), text = String(p.message || '').trim().slice(0, 900);
      const m = key.match(/^(RETURN|INR):(.+)$/);
      if (!m) throw new Error('SAY: replies work for returns and item-not-received inquiries — formal cases must be answered on eBay itself');
      if (!text) throw new Error('SAY: write the message first');
      const row = await ctx.env.DB.prepare('SELECT account, buyer, item_id, status FROM cases WHERE case_id = ?1').bind(key).first();
      if (!row) throw new Error('SAY: that record is not on the desk');
      if (/CLOSED/i.test(String(row.status || ''))) throw new Error('SAY: that one is closed — refresh the desk');
      const who = String(ctx.user.name || ctx.email);
      const url = m[1] === 'RETURN'
        ? 'https://api.ebay.com/post-order/v2/return/' + encodeURIComponent(m[2]) + '/send_message'
        : 'https://api.ebay.com/post-order/v2/inquiry/' + encodeURIComponent(m[2]) + '/send_message';
      if (String(ctx.env.CS_WRITE_LIVE) !== 'true') {
        await ctx.env.DB.prepare(
          "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'CS_REPLY_SHADOW', ?2, '', ?3, datetime('now'))"
        ).bind(ctx.email, key, text.slice(0, 200)).run();
        return { shadow: true, would_do: 'POST ' + url, note: 'SHADOW — recorded, nothing sent. CS_WRITE_LIVE=true arms replies.' };
      }
      const tok = await ebayAccessToken(ctx.env, row.account);
      const r = await fetch(url, { method: 'POST', headers: { authorization: 'IAF ' + tok, 'content-type': 'application/json' },
        body: JSON.stringify({ message: { content: text } }) });
      if (!r.ok) throw new Error('SAY: eBay refused the reply (' + r.status + '): ' + (await r.text()).slice(0, 160));
      // the message is on the thread — bookkeeping may not turn into a retry-inviting error
      try {
        await ctx.env.DB.prepare(
          "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'CS_REPLY', ?2, '', ?3, datetime('now'))"
        ).bind(ctx.email, key, text.slice(0, 200)).run();
        await queueNotify(ctx.env, 'management', 'CS reply', '🔵 ' + who + ' replied to ' + key + ' (' + row.account + ', buyer ' + row.buyer + ') through the portal.', 'engine:csreply:' + key);
      } catch (e) { console.log('post-reply bookkeeping failed', String(e).slice(0, 120)); }
      return { sent: true };
    },
  },

  csRefund: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const key = String(p.case_key || '');
      const m = key.match(/^(RETURN|INR):(.+)$/);
      if (!m) throw new Error('SAY: portal refunds work for returns and inquiries — formal cases are decided on eBay itself');
      const row = await ctx.env.DB.prepare('SELECT account, buyer, item_id, reason, status FROM cases WHERE case_id = ?1').bind(key).first();
      if (!row) throw new Error('SAY: that record is not on the desk');
      if (/CLOSED|REFUND_SENT/i.test(String(row.status || ''))) throw new Error('SAY: that one is already closed or refunded — refresh the desk');
      const who = String(ctx.user.name || ctx.email);
      const url = m[1] === 'RETURN'
        ? 'https://api.ebay.com/post-order/v2/return/' + encodeURIComponent(m[2]) + '/issue_refund'
        : 'https://api.ebay.com/post-order/v2/inquiry/' + encodeURIComponent(m[2]) + '/issue_refund';
      if (String(ctx.env.CS_WRITE_LIVE) !== 'true') {
        await ctx.env.DB.prepare(
          "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'CS_REFUND_SHADOW', ?2, '', ?3, datetime('now'))"
        ).bind(ctx.email, key, String(row.reason || '').slice(0, 200)).run();
        return { shadow: true, would_do: 'POST ' + url + ' (full refund)', note: 'SHADOW — recorded, no money moved. CS_WRITE_LIVE=true arms refunds.' };
      }
      /* CLAIM before money moves: the conditional UPDATE is the lock — a double-click, a
         timed-out retry, or a concurrent session finds REFUND_SENT (or 0 changes) and stops.
         eBay refusal rolls the claim back so a genuinely failed attempt stays actionable. */
      const claim = await ctx.env.DB.prepare(
        "UPDATE cases SET status = 'REFUND_SENT' WHERE case_id = ?1 AND status NOT LIKE '%CLOSED%' AND status != 'REFUND_SENT'"
      ).bind(key).run();
      if (!claim.meta || !claim.meta.changes) throw new Error('SAY: a refund for this one is already in flight — refresh the desk');
      await ctx.env.DB.prepare(
        "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'CS_REFUND_ATTEMPT', ?2, ?3, 'sending', datetime('now'))"
      ).bind(ctx.email, key, String(row.status || '')).run();
      let r;
      try {
        const tok = await ebayAccessToken(ctx.env, row.account);
        r = await fetch(url, { method: 'POST', headers: { authorization: 'IAF ' + tok, 'content-type': 'application/json' },
          body: JSON.stringify({}) });                     // empty body = eBay's own full-refund default
      } catch (e) {
        await ctx.env.DB.prepare('UPDATE cases SET status = ?2 WHERE case_id = ?1').bind(key, String(row.status || '')).run();
        throw e;
      }
      if (!r.ok) {
        await ctx.env.DB.prepare('UPDATE cases SET status = ?2 WHERE case_id = ?1').bind(key, String(row.status || '')).run();
        throw new Error('SAY: eBay refused the refund (' + r.status + '): ' + (await r.text()).slice(0, 160));
      }
      /* Money has moved — nothing after this may turn into an error the operator would retry. */
      try {
        await ctx.env.DB.prepare(
          "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'CS_REFUND', ?2, '', 'refunded', datetime('now'))"
        ).bind(ctx.email, key).run();
        const msg = '🟠 ' + who + ' issued the refund on ' + key + ' (' + row.account + ', buyer ' + row.buyer + ') through the portal.';
        await queueNotify(ctx.env, 'management', 'Refund issued', msg, 'engine:csrefund:' + key);
        await flushNotifyQueue(ctx.env);
      } catch (e) { console.log('post-refund bookkeeping failed', String(e).slice(0, 120)); }
      return { refunded: true };
    },
  },

  /* Violations carry an accountability field — §11.3's spirit: someone must SEE it. */
  ackViolation: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const id = Number(p.id) || 0;
      if (!id) throw new Error('SAY: which violation?');
      await ctx.env.DB.prepare("UPDATE violations SET ack_by = ?2 WHERE id = ?1 AND ack_by = ''").bind(id, ctx.email).run();
      return { acked: true };
    },
  },

  /* The Management overview in one read (§9-C "per-department overview", the parts with real
     data behind them tonight): collective KPIs, per-account pulse, advertising vs the SOP
     ROAS-5 target, live health, confirmed duplicates and the worst loss items. Sections whose
     feeds land in Phase D (returns/cases, staff) stay on their own screens — no fake numbers. */
  mgmtOverview: {
    auth: 'mgmt', fn: async (p, ctx) => memo('mgmtOverview', 60000, async () => {
      const today = ukDate('');
      const shift = (ymd, days) => {
        const d = new Date(ymd + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() - days);
        return d.toISOString().slice(0, 10);
      };
      const yday = shift(today, 1);
      const d7 = shift(today, 6);

      const sd = await ctx.env.DB.prepare(
        'SELECT account, date, sold, oe, cost, ads, profit, ads_rev FROM sales_daily WHERE date >= ?1'
      ).bind(shift(today, 8)).all();
      const days = sd.results || [];
      const sum = rows => rows.reduce((t, r) => ({ sold: t.sold + (Number(r.sold) || 0), profit: t.profit + (Number(r.profit) || 0), ads: t.ads + (Number(r.ads) || 0), promoted: t.promoted + Math.min(Number(r.sold) || 0, Number(r.ads_rev) || 0) }), { sold: 0, profit: 0, ads: 0, promoted: 0 });
      const kToday = sum(days.filter(r => r.date === today));
      const kYday = sum(days.filter(r => r.date === yday));
      const k7 = sum(days.filter(r => r.date >= d7));

      // today's live pulse straight from orders — sales_daily only materialises at the rollup
      const tOrders = await ctx.env.DB.prepare(
        "SELECT account, sold, created_at FROM orders WHERE created_at >= datetime('now', '-2 day')"
      ).all();
      const todayAcct = {};
      let todayCount = 0;
      for (const o of (tOrders.results || [])) {
        if (ukDate(o.created_at) !== today) continue;
        todayCount++;
        const a = (todayAcct[o.account] = todayAcct[o.account] || { account: o.account, orders: 0, revenue: 0 });
        a.orders++; a.revenue = round2(a.revenue + (Number(o.sold) || 0));
      }
      kToday.sold = round2(Object.values(todayAcct).reduce((t, a) => t + a.revenue, 0)) || kToday.sold;

      const ydayRows = days.filter(r => r.date === yday).map(r => ({ account: r.account, profit: r.profit, ads: r.ads, sold: r.sold }));

      const adsSale = await ctx.env.DB.prepare(
        'SELECT a.account, SUM(a.spend + a.cpc_spend) AS spend, SUM(a.clicks + a.cpc_clicks) AS clicks, SUM(a.sales + a.cpc_sales) AS units FROM ads_daily a WHERE a.date = ?1 GROUP BY a.account'
      ).bind(yday).all();
      // sale_amount is not stored per row — ROAS uses sales_daily revenue vs ads as the honest proxy
      const adsRows = (adsSale.results || []).map(r => {
        const rev = (days.find(x => x.account === r.account && x.date === yday) || {}).sold || 0;
        const spend = round2(r.spend || 0);
        return { account: r.account, spend, clicks: Number(r.clicks) || 0, units: Number(r.units) || 0,
          revenue: round2(rev), roas: spend > 0 ? round2(rev / spend) : null,
          cpq: (Number(r.units) || 0) > 0 ? round2(spend / Number(r.units)) : null };
      });

      const health = await computeHealth(ctx.env);
      const dups = await ctx.env.DB.prepare(
        "SELECT account, COUNT(*) AS n FROM dup_state WHERE alerted_day != '' GROUP BY account"
      ).all();
      const losses = await ctx.env.DB.prepare(
        'SELECT f.item_id, f.account, f.profit, i.title FROM items_facts f JOIN items_api i ON i.item_id = f.item_id ' +
        "WHERE f.profit < 0 AND i.status = 'ACTIVE' ORDER BY f.profit ASC LIMIT 5"
      ).all();

      return {
        date: today,
        kpis: {
          today: { revenue: round2(kToday.sold), orders: todayCount },
          yesterday: { revenue: round2(kYday.sold), profit_est: round2(kYday.profit), ads: round2(kYday.ads) },
          week: { revenue: round2(k7.sold), profit_est: round2(k7.profit), ads: round2(k7.ads) },
        },
        today_by_account: Object.values(todayAcct).sort((a, b) => b.revenue - a.revenue),
        yesterday_by_account: ydayRows,
        ads_yesterday: adsRows,
        /* R7-8 (Hasib): organic vs promoted sales "everywhere" — the 7-day split on the home,
           from eBay-attributed revenue (promoted) against total (the rest is organic). */
        split_7d: {
          total_rev: round2(k7.sold), promoted_rev: round2(k7.promoted),
          organic_rev: round2(k7.sold - k7.promoted),
          promoted_pct: k7.sold > 0 ? round2(k7.promoted / k7.sold * 100) : 0,
        },
        health,
        duplicates: dups.results || [],
        loss_items: losses.results || [],
        note: 'profit is the sheet projection × units; ROAS is account revenue ÷ ad spend for the day (per-item sale attribution lands with the finance feed)',
      };
    }),
  },

  /* The instant first paint for the Orders screen (§10 step 1: "opens Orders, 240ms"): today's
     eBay-side order list from D1 while the sheet workspace loads behind it. Order VALUES and the
     buyer USERNAME are per-order data, so the gate matches the Orders workspace: the order chain
     + CS reads it, and the buyer name is stripped for anyone outside the PII set (the same rule
     ordersView_ enforces sheet-side). The memo is keyed by the PII verdict so a stripped copy is
     never served to someone who may see the name, or the reverse. */
  ordersLive: {
    auth: 'any', fn: async (p, ctx) => {
      if (ORDER_DATA_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || '');
      if (!account) throw new Error('SAY: which account?');
      const seesPII = ORDER_PII_ROLES.indexOf(ctx.user.role) >= 0 || ctx.user.super;
      return memo('ordersLive:' + account + ':' + (seesPII ? 'pii' : 'nopii'), 60000, async () => {
        const rs = await ctx.env.DB.prepare(
          'SELECT o.order_id, o.buyer, o.item_id, o.sold, o.qty, o.status, o.created_at, o.est_delivery, i.title ' +
          'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
          "WHERE o.account = ?1 AND o.created_at >= datetime('now', '-2 day') ORDER BY o.created_at DESC LIMIT 200"
        ).bind(account).all();
        const today = ukDate('');
        const rows = (rs.results || []).filter(r => ukDate(r.created_at) === today)
          .map(r => { if (!seesPII) { const c = { ...r }; delete c.buyer; return c; } return r; });
        return { account, date: today, rows,
          note: 'live eBay orders — the sheet workspace below carries the processing columns' };
      });
    },
  },

  /* Req 16, the missing-Ali-link capture: the processor pastes the seller link once on the
     first order and it lands in BOTH truths — D1 and the day tab's own 'New Ali Link' column,
     through the v19 bridge under the full sheet law (whitelisted column, shadow via
     pipeline_write_external, old→new logged on the Apps Script side). */
  orderAddAliLink: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Order Processor', 'Management', 'Ops Head', 'Team Lead'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || ''), orderId = String(p.order_id || '').trim(), link = String(p.ali_link || '').trim();
      /* R5: the AliExpress ORDER NUMBER rides along — it is what tracking gets pulled with, so
         the portal stores it and the day tab's own 'Order Number' column receives it too. */
      const aliOrder = String(p.ali_order || '').replace(/\D/g, '').slice(0, 25);
      if (!account || !orderId || (!link && !aliOrder)) throw new Error('SAY: account, order_id and the link or the Ali order number are needed');
      if (link && !/^https:\/\/([a-z0-9-]+\.)*aliexpress\.[a-z.]+\//i.test(link)) throw new Error('SAY: that does not look like an AliExpress link');
      if (aliOrder && aliOrder.length < 8) throw new Error('SAY: an AliExpress order number is at least 8 digits');
      await ctx.env.DB.prepare(
        "UPDATE orders SET ali_link = CASE WHEN ?2 != '' THEN ?2 ELSE ali_link END, " +
        "ali_order = CASE WHEN ?3 != '' THEN ?3 ELSE ali_order END WHERE order_id = ?1"
      ).bind(orderId, link.slice(0, 400), aliOrder).run();
      let sheet = { ok: false, reason: 'bridge did not answer' };
      try {
        const values = {};
        if (link) values['New Ali Link'] = link.slice(0, 400);
        if (aliOrder) values['Order Number'] = aliOrder;
        const r = await fetch(ctx.env.AS_URL, {
          method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'engineSheetWrite', payload: {
            key: await secret(ctx.env, 'SYNC_KEY'), whitelist: 'orders_day', account,
            match_header: 'Order number', match_value: orderId,
            values } }),
          signal: AbortSignal.timeout(20000),
        });
        const body = await r.json().catch(() => ({}));
        sheet = body.ok ? body.data : { ok: false, reason: String(body.error || r.status) };
      } catch (e) { sheet = { ok: false, reason: String(e && e.message || e).slice(0, 120) }; }
      await ctx.env.DB.prepare(
        "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'ALI_LINK_ADDED', ?2, '', ?3, datetime('now'))"
      ).bind(ctx.email, account + ':' + orderId, (link + (aliOrder ? ' #' + aliOrder : '')).slice(0, 200)).run();
      return { saved: true, sheet,
        note: sheet.ok ? (sheet.shadow ? 'recorded in the Engine; the sheet write is in SHADOW (logged, not written) until the shadow flip' : 'written to the Engine AND the day tab')
          : 'saved in the Engine; the sheet side answered: ' + String(sheet.reason || '') };
    },
  },

  /* R5 sink for the hourly Apps Script day-tab sweep: order_id → AliExpress order number + link.
     A field only ever fills or corrects — an empty incoming value never erases what is stored,
     so a half-filled sheet row cannot blank a portal-entered number. */
  syncAliOrders: {
    auth: 'sync', fn: async (p, ctx) => {
      const rows = (Array.isArray(p.rows) ? p.rows : []).slice(0, 500);
      const stmts = [];
      for (const r of rows) {
        const id = String(r.order_id || '').trim();
        if (!/^\d{2}-\d{5}-\d{5}$/.test(id)) continue;
        const ord = String(r.ali_order || '').replace(/\D/g, '').slice(0, 25);
        const link = String(r.ali_link || '').trim().slice(0, 400);
        if (!ord && (!link || !/^https:\/\//i.test(link))) continue;
        stmts.push(ctx.env.DB.prepare(
          "UPDATE orders SET ali_order = CASE WHEN ?2 != '' THEN ?2 ELSE ali_order END, " +
          "ali_link = CASE WHEN ?3 != '' AND ?3 LIKE 'https://%' THEN ?3 ELSE ali_link END WHERE order_id = ?1"
        ).bind(id, ord.length >= 8 ? ord : '', link));
      }
      for (let i = 0; i < stmts.length; i += 50) await ctx.env.DB.batch(stmts.slice(i, i + 50));
      return { received: rows.length, written: stmts.length };
    },
  },

  /* R5 backups (Hasib: "at any day portal dies, we need backup data"). PULL model: the Apps
     Script night trigger calls this per table per page and writes the Google backup sheets —
     each pull is its own invocation, so the subrequest budget is never at risk. The whitelist
     is explicit and CREDENTIAL-FREE: sessions never leave, engine_config never leaves, and the
     accounts table gives up only its names — never app ids, certs or oauth refs. */
  backupDump: {
    auth: 'sync', fn: async (p, ctx) => {
      const T = {
        users: 'SELECT email, name, role, status, modules, tools, super FROM users',
        accounts: 'SELECT name, api_enabled FROM accounts',
        items_api: 'SELECT * FROM items_api',
        items_facts: 'SELECT * FROM items_facts',
        sourcing: 'SELECT * FROM sourcing',
        orders: 'SELECT * FROM orders',
        trackings: 'SELECT * FROM trackings',
        sales_daily: 'SELECT * FROM sales_daily',
        ads_daily: 'SELECT * FROM ads_daily',
        ads_today: 'SELECT * FROM ads_today',
        campaigns: 'SELECT * FROM campaigns',
        campaign_ads: 'SELECT * FROM campaign_ads',
        promotions: 'SELECT * FROM promotions',
        promo_members: 'SELECT * FROM promo_members',
        feedback: 'SELECT * FROM feedback',
        feedback_summary: 'SELECT * FROM feedback_summary',
        cases: 'SELECT * FROM cases',
        cs_metrics: 'SELECT * FROM cs_metrics',
        cs_standards: 'SELECT * FROM cs_standards',
        traffic_daily: 'SELECT * FROM traffic_daily',
        late_marks: 'SELECT * FROM late_marks',
        listing_decisions: 'SELECT * FROM listing_decisions',
        violations: 'SELECT * FROM violations',
        users_snapshot: 'SELECT * FROM users_snapshot',
        daily_health: 'SELECT * FROM daily_health',
        sync_state: 'SELECT job, account, cursor, last_ok, last_error FROM sync_state',
        alert_log: "SELECT * FROM alert_log WHERE created_at >= datetime('now','-90 day')",
        audit: "SELECT * FROM audit WHERE at >= datetime('now','-90 day')",
        /* Not a table — a REPRESENTABLE per-account summary computed from the engine's own
           truth (Hasib: the report books eBay-side agents stopped filling; this one always
           fills). 30 days, the profit law's own chain. */
        account_summary:
          "SELECT account, COUNT(*) AS orders_30d, COALESCE(SUM(qty), 0) AS units_30d, " +
          'ROUND(COALESCE(SUM(sold), 0), 2) AS revenue_30d, ' +
          'ROUND(COALESCE(SUM(CASE WHEN ebay_fees > 0 THEN ebay_fees ELSE 0 END), 0), 2) AS ebay_fees_30d, ' +
          'ROUND(COALESCE(SUM(cost), 0), 2) AS aliexpress_cost_30d, ' +
          'ROUND(0.8 * (COALESCE(SUM(sold), 0) - COALESCE(SUM(CASE WHEN ebay_fees > 0 THEN ebay_fees ELSE 0 END), 0) - COALESCE(SUM(cost), 0)), 2) AS raw_profit_law_30d, ' +
          'ROUND(COALESCE(SUM(CASE WHEN refunded > 0 THEN refunded ELSE 0 END), 0), 2) AS refunded_30d, ' +
          "MAX(created_at) AS last_order_at " +
          "FROM orders WHERE created_at >= datetime('now','-30 day') AND status != 'NOT_FOUND' GROUP BY account ORDER BY revenue_30d DESC",
      };
      const t = String(p.table || '');
      if (!T[t]) return { tables: Object.keys(T) };
      const limit = Math.min(Number(p.limit) || 2500, 4000), offset = Math.max(Number(p.offset) || 0, 0);
      const rs = await ctx.env.DB.prepare(T[t] + ' LIMIT ' + limit + ' OFFSET ' + offset).all();
      const rows = rs.results || [];
      const header = rows.length ? Object.keys(rows[0]) : [];
      return { table: t, offset, header, rows: rows.map((r) => header.map((h) => r[h])), n: rows.length, done: rows.length < limit };
    },
  },

  /* The night trigger reports back here when the Sheets copy is done — KV carries the stamp the
     battery's freshness check reads, and a failed night letters Management the same morning. */
  backupStamp: {
    auth: 'sync', fn: async (p, ctx) => {
      const ok = !!p.ok, tables = Number(p.tables) || 0, rowsN = Number(p.rows) || 0;
      const fails = (Array.isArray(p.fails) ? p.fails : []).map((s) => String(s).slice(0, 80)).slice(0, 10);
      await ctx.env.HOT.put('backup:last', JSON.stringify({ at: new Date().toISOString(), ok, tables, rows: rowsN, fails }), { expirationTtl: 7 * 86400 });
      await ctx.env.DB.prepare(
        "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('sheetBackup', '', ?1, datetime('now'), ?2) " +
        "ON CONFLICT(job, account) DO UPDATE SET cursor = ?1, last_ok = datetime('now'), last_error = ?2"
      ).bind(tables + ' tables, ' + rowsN + ' rows', ok ? '' : fails.join('; ').slice(0, 300)).run();
      if (!ok) {
        const ref = 'engine:backup:' + ukDate(new Date().toISOString());
        const seen = await ctx.env.DB.prepare('SELECT 1 AS x FROM alert_log WHERE ref = ?1 LIMIT 1').bind(ref).first();
        if (!seen) await notifyRole(ctx.env, 'Management', 'Backup FAILED',
          "🔴 Tonight's Google Sheets backup did not complete — failed on: " + fails.join(', ').slice(0, 400) +
          '. The portal itself is fine; the OFF-SITE COPY is what is stale. Run nightBackupPull again from the Apps Script editor, or tell Claude tonight.', ref);
      }
      return { stamped: true };
    },
  },

  /* R5, Hasib: "make a separate dashboard page in sourcing links of the products" — three
     supplier slots per listing. The Main Sheet's supplier columns arrive via syncFacts; portal
     edits live in the `sourcing` overrides table so a sheet push can never erase what a
     processor typed here. Effective link = portal override, else the sheet's. */
  sourcingBoard: {
    auth: 'any', fn: async (p, ctx) => {
      if (ITEM_COST_ROLES.indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const rs = await ctx.env.DB.prepare(
        "SELECT i.item_id, i.account, i.title, i.price, i.sold_30d, " +
        "COALESCE(f.sup1_link,'') AS f1, COALESCE(f.sup2_link,'') AS f2, COALESCE(f.sup3_link,'') AS f3, " +
        "COALESCE(f.current_sup,'') AS cur, COALESCE(f.ali_cost,0) AS cost, " +
        "COALESCE(s.s1,'') AS s1, COALESCE(s.s2,'') AS s2, COALESCE(s.s3,'') AS s3, " +
        "COALESCE(s.updated_by,'') AS upd_by, COALESCE(s.updated_at,'') AS upd_at, COALESCE(op.n,0) AS open_orders " +
        'FROM items_api i LEFT JOIN items_facts f ON f.item_id = i.item_id LEFT JOIN sourcing s ON s.item_id = i.item_id ' +
        "LEFT JOIN (SELECT item_id, COUNT(*) AS n FROM orders WHERE status = 'NOT_STARTED' GROUP BY item_id) op ON op.item_id = i.item_id " +
        "WHERE i.status = 'ACTIVE' ORDER BY i.sold_30d DESC, i.title"
      ).all();
      const rows = (rs.results || []).map((r) => {
        const e1 = r.s1 || r.f1, e2 = r.s2 || r.f2, e3 = r.s3 || r.f3;
        return { ...r, e1, e2, e3, links_n: [e1, e2, e3].filter(Boolean).length };
      });
      const missing = rows.filter((r) => r.links_n === 0);
      return { rows, total: rows.length,
        with_links: rows.length - missing.length,
        missing_n: missing.length,
        missing_hot: missing.filter((r) => r.open_orders > 0 || Number(r.sold_30d) > 0).length,
        note: 'links: portal-saved first, else the Main Sheet’s supplier columns · "missing" = not a single link in either place · the missing tab, sorted by 30-day sales, IS the Order Processors’ task queue' };
    },
  },

  /* R7 (22 Aug): bulk sourcing loader for Hasib's supplier workbooks — key-gated like every
     sync feed. Fills or corrects; an empty incoming slot never erases a stored link. */
  sourcingImport: {
    auth: 'sync', fn: async (p, ctx) => {
      const rows = (Array.isArray(p.rows) ? p.rows : []).slice(0, 1000);
      const stmts = [];
      for (const r of rows) {
        const id = String(r.item_id || '').trim();
        if (!/^\d{9,14}$/.test(id)) continue;
        const clean = (v) => { const s = String(v || '').trim().slice(0, 400); return /^https:\/\//i.test(s) ? s : ''; };
        stmts.push(ctx.env.DB.prepare(
          'INSERT INTO sourcing (item_id, account, s1, s2, s3, updated_by, updated_at) ' +
          "VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now')) " +
          'ON CONFLICT(item_id) DO UPDATE SET ' +
          "s1 = CASE WHEN excluded.s1 != '' THEN excluded.s1 ELSE s1 END, " +
          "s2 = CASE WHEN excluded.s2 != '' THEN excluded.s2 ELSE s2 END, " +
          "s3 = CASE WHEN excluded.s3 != '' THEN excluded.s3 ELSE s3 END, " +
          "updated_by = ?6, updated_at = datetime('now')"
        ).bind(id, String(r.account || '').slice(0, 40), clean(r.s1), clean(r.s2), clean(r.s3),
          String(p.source || 'import').slice(0, 40)));
      }
      for (let i = 0; i < stmts.length; i += 50) await ctx.env.DB.batch(stmts.slice(i, i + 50));
      return { received: rows.length, written: stmts.length };
    },
  },

  sourcingSave: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Order Processor', 'Management', 'Ops Head', 'Team Lead'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const itemId = String(p.item_id || '').trim(), slot = Number(p.slot);
      const url = String(p.url || '').trim().slice(0, 400);
      if (!/^\d{9,14}$/.test(itemId)) throw new Error('SAY: that item id does not look right');
      if ([1, 2, 3].indexOf(slot) < 0) throw new Error('SAY: slot must be 1, 2 or 3');
      if (url && !/^https:\/\/\S+$/i.test(url)) throw new Error('SAY: a supplier link must be a full https:// URL');
      const it = await ctx.env.DB.prepare('SELECT account FROM items_api WHERE item_id = ?1').bind(itemId).first();
      if (!it) throw new Error('SAY: that item is not in the listings table');
      const col = 's' + slot;
      await ctx.env.DB.prepare(
        'INSERT INTO sourcing (item_id, account, ' + col + ', updated_by, updated_at) VALUES (?1, ?2, ?3, ?4, datetime(\'now\')) ' +
        'ON CONFLICT(item_id) DO UPDATE SET ' + col + ' = ?3, account = ?2, updated_by = ?4, updated_at = datetime(\'now\')'
      ).bind(itemId, String(it.account), url, ctx.email).run();
      await ctx.env.DB.prepare(
        "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'SOURCING_SAVED', ?2, '', ?3, datetime('now'))"
      ).bind(ctx.email, itemId + ':s' + slot, url.slice(0, 200)).run();
      return { saved: true, item_id: itemId, slot, cleared: !url };
    },
  },

  /* The processor's courier dropdown speaks eBay's own list (A4) — per account, cached weekly. */
  courierList: {
    auth: 'any', fn: async (p, ctx) => {
      const account = String(p.account || '');
      if (!account) throw new Error('SAY: which account?');
      const tok = await ebayAccessToken(ctx.env, account);
      return { account, carriers: await acceptedCarriers(ctx.env, account, tok) };
    },
  },

  /* Recheck, with Engine eyes (§3 recheckFeed): the sheet flow stays the human record — this
     serves the CONCRETE order list behind each checkpoint from live API data: which orders sit
     on the reference date, and which of them STILL have no tracking on eBay (fulfillment
     status). At the CHINA check that is the "focus these" list nobody had before. Offsets
     arrive from the caller (the screen already knows the CONFIG-tuned values); defaults are
     the spec's 4/2/1/3. Order lists carry no profit, so any signed-in user may read them. */
  /* Review 3: "i have three people for order rechecking — Noman after 4 days, Zeeshan after 7,
     Wahab after 10 — either item is delivered or not." Each person's list = the orders created
     exactly that many days ago, still standing (not cancelled), with what the engine can prove:
     dispatched or not, and whether eBay's delivery estimate has already passed. */
  deliveryCheckpoints: {
    auth: 'any', fn: async (p, ctx) => {
      const day = ukDate('');
      const owners = [{ days: 4, owner: 'Noman' }, { days: 7, owner: 'Zeeshan' }, { days: 10, owner: 'Wahab' }];
      const shift = (ymd, days) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); };
      const out = [];
      for (const o of owners) {
        const ref = shift(day, o.days);
        const rs = await ctx.env.DB.prepare(
          'SELECT o.order_id, o.account, o.item_id, o.sold, o.status, o.est_delivery, i.title ' +
          'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
          "WHERE o.status NOT IN ('CANCELLED','NOT_FOUND') AND substr(o.created_at, 1, 10) = ?1 " +
          'ORDER BY o.account, o.order_id LIMIT 250'
        ).bind(ref).all();
        const rows = (rs.results || []).map(r => ({
          order_id: r.order_id, account: r.account, item_id: r.item_id, sold: r.sold,
          title: r.title || '', dispatched: r.status === 'FULFILLED',
          est_delivery: String(r.est_delivery || '').slice(0, 10),
          est_passed: !!(r.est_delivery && String(r.est_delivery) < new Date().toISOString()),
        }));
        const byAcct = {};
        for (const r of rows) {
          const a = (byAcct[r.account] = byAcct[r.account] || { account: r.account, n: 0, undispatched: 0, est_passed: 0 });
          a.n++; if (!r.dispatched) a.undispatched++; if (r.est_passed) a.est_passed++;
        }
        out.push({ owner: o.owner, days: o.days, order_date: ref, total: rows.length,
          accounts: Object.values(byAcct), focus: rows.filter(r => !r.dispatched || r.est_passed).slice(0, 60) });
      }
      return { day, checkpoints: out,
        note: 'the focus list = not yet dispatched OR past eBay’s delivery estimate — exactly what the checker must confirm delivered' };
    },
  },

  /* Review 3: "custom date account KPIs are showing wrong and not connected" — the day view
     now has ENGINE truth for any (account, date): the books row, traffic, and the live order
     count, straight from the same tables every money screen reads. */
  accountDay: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const account = String(p.account || '');
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) ? String(p.date) : ukDate('');
      if (!account) throw new Error('SAY: which account?');
      const book = await ctx.env.DB.prepare(
        'SELECT sold, oe, cost, ads, ads_rev, profit, pri, returns, actual FROM sales_daily WHERE account = ?1 AND date = ?2'
      ).bind(account, date).first();
      const traffic = await ctx.env.DB.prepare(
        'SELECT impressions, views, transactions FROM traffic_daily WHERE account = ?1 AND date = ?2'
      ).bind(account, date).first();
      const dayStart = date + 'T00:00:00Z';
      const dayEnd = date + 'T23:59:59Z';
      const ord = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS n, ROUND(COALESCE(SUM(sold), 0), 2) AS rev, SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled " +
        'FROM orders WHERE account = ?1 AND created_at >= ?2 AND created_at <= ?3 AND status != ?4'
      ).bind(account, dayStart, dayEnd, 'NOT_FOUND').first();
      return { account, date, book: book || null, traffic: traffic || null,
        orders: { n: Number(ord && ord.n) || 0, revenue: Number(ord && ord.rev) || 0, cancelled: Number(ord && ord.cancelled) || 0 },
        note: 'books row lands at the nightly rollup; a date with no row yet shows live orders only' };
    },
  },

  recheckFeed: {
    auth: 'any', fn: async (p, ctx) => {
      // presence check, not truthiness — Management may legitimately tune a checkpoint to 0 days
      const off = (v, dflt) => (v === undefined || v === null || v === '' ? dflt : Math.max(0, Number(v) || 0));
      const offsets = { china: off(p.china, 4), uk1: off(p.uk1, 2), uk2: off(p.uk2, 1), uk3: off(p.uk3, 3) };
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) ? String(p.date) : ukDate('');
      const maxBack = Math.max(offsets.china, offsets.uk1, offsets.uk2, offsets.uk3) + 2;
      const since = new Date(new Date(day + 'T12:00:00Z').getTime() - maxBack * 86400000).toISOString();
      const ors = await ctx.env.DB.prepare(
        'SELECT order_id, account, item_id, sold, qty, status, created_at, est_delivery FROM orders WHERE created_at >= ?1'
      ).bind(since).all();
      const byDate = {};
      const byEst = {};
      for (const o of (ors.results || [])) {
        const d = ukDate(o.created_at);
        (byDate[d] = byDate[d] || []).push(o);
        if (o.est_delivery) {
          const e = ukDate(o.est_delivery);
          (byEst[e] = byEst[e] || []).push(o);
        }
      }
      const ids = [...new Set((ors.results || []).map(o => String(o.item_id || '')).filter(Boolean))];
      const titles = {};
      for (let i = 0; i < ids.length; i += 90) {
        const chunk = ids.slice(i, i + 90);
        const rs = await ctx.env.DB.prepare(
          'SELECT item_id, title FROM items_api WHERE item_id IN (' + chunk.map(() => '?').join(',') + ')'
        ).bind(...chunk).all();
        for (const r of (rs.results || [])) titles[r.item_id] = r.title;
      }
      const shift = (ymd, days) => {
        const d = new Date(ymd + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() - days);
        return d.toISOString().slice(0, 10);
      };
      const stages = [];
      for (const key of ['china', 'uk1', 'uk2', 'uk3']) {
        const ref = shift(day, offsets[key]);
        // UK3 checks "3 days after DELIVERY" — its reference is the delivery estimate, not the
        // order date. The other stages count from the order.
        const list = (key === 'uk3' ? byEst[ref] : byDate[ref]) || [];
        const accounts = {};
        for (const o of list) {
          const a = (accounts[o.account] = accounts[o.account] || { account: o.account, orders: 0, no_tracking: 0, focus: [] });
          a.orders++;
          const fulfilled = /FULFILLED/i.test(String(o.status || ''));
          if (!fulfilled) {
            a.no_tracking++;
            if (a.focus.length < 25) {
              a.focus.push({ order_id: o.order_id, item_id: o.item_id, title: String(titles[o.item_id] || '').slice(0, 80),
                sold: o.sold, status: o.status });
            }
          }
        }
        const stage = { stage: key, offset_days: offsets[key], reference_date: ref,
          beyond_refresh: offsets[key] > 5,   // orderSync refreshes 6 days back — older statuses freeze
          accounts: Object.values(accounts).sort((x, y) => x.account < y.account ? -1 : 1) };
        if (key === 'uk2') {
          // UK Second Check's col C carries the SAME "3 days after delivery" checkpoint as UK 3rd
          const ref2 = shift(day, offsets.uk3);
          const l2 = byEst[ref2] || [];
          const acc2 = {};
          for (const o of l2) {
            const a = (acc2[o.account] = acc2[o.account] || { account: o.account, orders: 0 });
            a.orders++;
          }
          stage.reference_date2 = ref2;
          stage.accounts2 = Object.values(acc2).sort((x, y) => x.account < y.account ? -1 : 1);
        }
        stages.push(stage);
      }
      return { date: day, stages,
        note: 'API-side view: an order counts as "no tracking" while eBay\'s fulfillment status is not FULFILLED. UK 3rd counts from eBay\'s estimated delivery date (no carrier scans exist in the API). Dates are UK business days (the sheet clock is PKT — a midnight-hour order can sit one day apart).' };
    },
  },

  /* Zain's duplicate fix (req 30, first write path): pull ONE item out of ONE campaign, from
     the portal, with the actor's name on the event — the honesty rule's other half. SHADOW
     until ADS_WRITE_LIVE='true' (G-3): records exactly what it would send. Their CPC campaigns
     are smart-targeting, so DELETE-by-adId is the one write that works everywhere; add/move
     lands after the shadow period proves this path. */
  campaignRemoveItem: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'Advertising Manager'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const account = String(p.account || ''), cid = String(p.campaign_id || ''), lid = String(p.listing_id || '');
      if (!account || !cid || !lid) throw new Error('SAY: account, campaign_id and listing_id are all needed');
      const row = await ctx.env.DB.prepare('SELECT ad_id FROM campaign_ads WHERE account = ?1 AND campaign_id = ?2 AND listing_id = ?3').bind(account, cid, lid).first();
      if (!row) throw new Error('SAY: that item is not in that campaign (or the Engine has not synced it yet)');
      const camp = await ctx.env.DB.prepare('SELECT name FROM campaigns WHERE account = ?1 AND campaign_id = ?2').bind(account, cid).first();
      const nm = (camp && camp.name) || cid;
      const who = String(ctx.user.name || ctx.email);

      if (String(ctx.env.ADS_WRITE_LIVE) !== 'true') {
        await ctx.env.DB.prepare(
          "INSERT INTO campaign_events (account, campaign, item_id, change_type, old, new, actor, at) VALUES (?1, ?2, ?3, 'remove_item', '', 'SHADOW — not sent', ?4, datetime('now'))"
        ).bind(account, nm, lid, who).run();
        return { shadow: true, would_do: 'DELETE ad ' + String(row.ad_id) + ' (item ' + lid + ') from "' + nm + '" on ' + account,
          note: 'SHADOW — recorded, nothing touched eBay. ADS_WRITE_LIVE=true arms this button.' };
      }

      const tok = await ebayAccessToken(ctx.env, account);
      const r = await fetch('https://api.ebay.com/sell/marketing/v1/ad_campaign/' + encodeURIComponent(cid) + '/ad/' + encodeURIComponent(String(row.ad_id)), {
        method: 'DELETE', headers: { authorization: 'Bearer ' + tok } });
      if (!r.ok && r.status !== 204) throw new Error('SAY: eBay refused the removal (' + r.status + '): ' + (await r.text()).slice(0, 160));
      await ctx.env.DB.prepare('DELETE FROM campaign_ads WHERE account = ?1 AND campaign_id = ?2 AND listing_id = ?3').bind(account, cid, lid).run();
      await ctx.env.DB.prepare('DELETE FROM dup_state WHERE account = ?1 AND listing_id = ?2').bind(account, lid).run();
      HOTMEM.delete('campaignWatch');                       // the desk must not show the removed item for 60s
      await ctx.env.DB.prepare(
        "INSERT INTO campaign_events (account, campaign, item_id, change_type, old, new, actor, at) VALUES (?1, ?2, ?3, 'remove_item', '', 'removed', ?4, datetime('now'))"
      ).bind(account, nm, lid, who).run();
      await queueNotify(ctx.env, 'advertising', 'Campaign edited', '🔵 ' + who + ' removed item ' + lid + ' from "' + nm + '" · ' + account + ' — through the portal.', 'engine:rm:' + account + ':' + lid);
      await flushNotifyQueue(ctx.env);
      return { removed: true, campaign: nm };
    },
  },

  /* Account health (own menu, §9-C): live numbers plus the nightly trend. Management-only —
     revenue and loss counts are account totals. */
  accountHealth: {
    /* R5: was mgmt-only. A per-user 'accountHealth' module grant (Hasib: Husnain's system) now
       opens the READ — ops levers (runJobNow) stay their own mgmt-gated action. The module path
       never sees revenue: the trend's money column is stripped for anyone below management,
       keeping the Team-Lead earnings rule intact. */
    auth: 'any', fn: async (p, ctx) => {
      const ahMods = String(ctx.user.modules || '').split(',');
      const ahMgmt = ['Management', 'Ops Head'].indexOf(ctx.user.role) >= 0 || ctx.user.super;
      if (!ahMgmt && ahMods.indexOf('accountHealth') < 0) throw new AuthError('auth');
      const now = await computeHealth(ctx.env);
      const trend = await ctx.env.DB.prepare(
        'SELECT day, account, listings, orders_7d, revenue_7d, loss_items, json FROM daily_health ORDER BY day DESC LIMIT 84'
      ).all();
      if (!ahMgmt) { for (const r of (trend.results || [])) { delete r.revenue_7d; } }
      const sync = await ctx.env.DB.prepare('SELECT job, account, last_ok, last_error FROM sync_state ORDER BY job, account').all();
      /* eBay's own seller-standards verdict per account — the report this screen existed for.
         standardsSync has been landing it in cs_standards since the re-consents; serving it is
         what turns "account health is all useless" into eBay's actual TOP_RATED scoreboard. */
      const stdRs = await ctx.env.DB.prepare('SELECT account, json, synced_at FROM cs_standards ORDER BY account').all();
      const standards = (stdRs.results || []).map((r) => {
        let profiles = [];
        try { profiles = JSON.parse(r.json || '[]'); } catch (e) { profiles = []; }
        return { account: r.account, synced_at: r.synced_at, profiles };
      });
      /* Item 13: the two service-metric rates vs eBay's peer benchmark, per account. Parsed
         against the REAL response shape (verified live 19 Aug): each dimensionMetric is one
         evaluation row — INAD comes per LISTING CATEGORY, INR per shipping region — and inside
         it RATE / COUNT / TRANSACTION_COUNT are sibling metrics; the peer average rides at
         benchmark.metadata.average and the verdict at benchmark.rating (LOW is good here). */
      const metRs = await ctx.env.DB.prepare('SELECT account, metric_type, json, synced_at FROM cs_metrics ORDER BY account, metric_type').all();
      const metrics = (metRs.results || []).map((r) => {
        const dims = [];
        try {
          const j = JSON.parse(r.json || '{}');
          for (const dm of (j.dimensionMetrics || [])) {
            const ms = dm.metrics || [];
            const find = (k) => ms.filter((m) => String(m.metricKey) === k)[0] || {};
            const rate = find('RATE'), tx = find('TRANSACTION_COUNT'), cnt = find('COUNT');
            const bench = rate.benchmark || {};
            dims.push({
              dim: String((dm.dimension || {}).name || (dm.dimension || {}).value || ''),
              you: rate.value != null ? Number(rate.value) : null,
              peer: bench.metadata && bench.metadata.average != null ? Number(bench.metadata.average) : null,
              rating: String(bench.rating || ''),
              count: cnt.value != null ? Number(cnt.value) : null,
              transactions: tx.value != null ? Number(tx.value) : null,
            });
          }
        } catch (e) { /* an unparsable evaluation stays empty, never a crash */ }
        return { account: r.account, metric_type: r.metric_type, dims, synced_at: r.synced_at };
      });
      return { now, trend: trend.results || [], sync: sync.results || [], standards, metrics };
    },
  },

  /* Daily report (own dashboard, §9-C): sales_daily in UK business dates. Profit is the books'
     own identity — T = 0.8 × (order earning − cost), VAT netted, ads in their own column — and
     the auth gate is the §6 law: only Management/Ops ever see collective profit. */
  dailyReport: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const rs = await ctx.env.DB.prepare(
        "SELECT account, date, sold, oe, cost, ads, profit, pri, returns, actual, ads_rev FROM sales_daily WHERE date >= date('now', '-62 day') ORDER BY date DESC, account"
      ).all();
      /* Hasib's night list: "Business overview is still showing wrong stats" — the wrongest one
         was TODAY, because the books are rolled nightly and intraday ad spend lives in
         ads_today. This overlay carries today's LIVE facts per account: revenue and paid cost
         from orders, ads from the intraday snapshot, and order earning computed ONLY from the
         orders whose real eBay fees have already landed (fees_n says how many) — a partial
         truth labeled as such, never an invented number. */
      const today = ukDate('');
      const liveRs = await ctx.env.DB.prepare(
        'SELECT account, ROUND(COALESCE(SUM(sold), 0), 2) AS sold, COUNT(*) AS orders_n, ' +
        'ROUND(COALESCE(SUM(cost), 0), 2) AS cost, ' +
        'ROUND(COALESCE(SUM(CASE WHEN ebay_fees > 0 THEN sold - ebay_fees ELSE 0 END), 0), 2) AS oe_known, ' +
        'SUM(CASE WHEN ebay_fees > 0 THEN 1 ELSE 0 END) AS fees_n ' +
        "FROM orders WHERE created_at >= ?1 AND status != 'NOT_FOUND' GROUP BY account"
      ).bind(ukDayStartIso()).all();
      const adsRs = await ctx.env.DB.prepare(
        'SELECT account, ROUND(COALESCE(SUM(spend + cpc_spend), 0), 2) AS ads FROM ads_today WHERE day = ?1 GROUP BY account'
      ).bind(today).all();
      const adsBy = {};
      for (const a of (adsRs.results || [])) adsBy[a.account] = Number(a.ads) || 0;
      const today_live = (liveRs.results || []).map((r) => ({
        account: r.account, date: today, sold: Number(r.sold) || 0, orders_n: Number(r.orders_n) || 0,
        cost: Number(r.cost) || 0, oe_known: Number(r.oe_known) || 0, fees_n: Number(r.fees_n) || 0,
        ads: adsBy[r.account] || 0,
      }));
      for (const acct of Object.keys(adsBy)) {
        if (!today_live.some((r) => r.account === acct)) {
          today_live.push({ account: acct, date: today, sold: 0, orders_n: 0, cost: 0, oe_known: 0, fees_n: 0, ads: adsBy[acct] });
        }
      }
      return { rows: rs.results || [], today_live, today,
        note: 'cost = the day tab\u2019s real paid cost (hourly sync) · ads = eBay\u2019s own reports, both billing families · profit = 0.8 × (order earning − cost), the sheet’s VAT law, ads deducted separately · today rides the live overlay (intraday ads, real fees only)' };
    },
  },

  /* Ops lever for the build session and the Management ops panel: run any cron job now.
     mgmt-gated (nothing ever called it with the sync key): these are the same jobs the cron
     fires on its own, and the '@lock' lease keeps a forced run from racing a real tick. */
  runJobNow: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const jobs = { listingSync, orderSync, adsSync, adsItems, rollups, rollupsWide, backup, adsReportKick, adsReportPoll, csSync, violationsSync, autoMsgScan, autoMsgSend, standardsSync, financeSync, itemStats, cpcAudit, statusRefresh, adsIntraday, trafficSync, zeroSaleScan, cpcRevisionWatch, alertAckWatch, uncampaignedDigest, noSupplierScan, selfTestJob, nightlyCatchup, marketingSync, feedbackSync, securitySweep, processWatch, sleepWatch, trackingBackfill };
      const fn = jobs[String(p.job || '')];
      if (!fn) throw new Error('SAY: unknown job — one of ' + Object.keys(jobs).join(', '));
      await runJob(ctx.env, fn);
      await flushNotifyQueue(ctx.env);
      const st = await ctx.env.DB.prepare('SELECT job, account, cursor, last_ok, last_error FROM sync_state WHERE job = ?1').bind(String(p.job)).all();
      return { ran: String(p.job), state: st.results || [] };
    },
  },

  /* eBay consent flow — now SELF-SERVICE on the Account health screen (mgmt-gated): Hasib
     opens each link, clicks Allow while signed into that selling account, and pastes the code
     back. All links use the ZAREENLT application with the EXTENDED scope list (marketing,
     analytics, finances) — a fresh consent under one app is simpler than five RuNames, and
     nothing in his sheet automations is touched: their own apps and tokens stay as they are. */
  ebayConsentLinks: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const names = await ctx.env.DB.prepare('SELECT name FROM accounts WHERE api_enabled = 1').all();
      const out = [];
      for (const r of (names.results || [])) out.push({ account: r.name, url: await ebayConsentUrl(ctx.env, r.name) });
      return { links: out,
        note: 'Open a link SIGNED INTO that selling account, click Agree, then copy the code from the resulting page (or its URL, code=…) and paste it here. This adds campaign, standards and fee access — nothing existing breaks.' };
    },
  },
  /* Reuse path: Hasib's existing sheet-automation projects already hold per-account refresh
     tokens — paste one in and this stores it, then proves it by minting an access token and
     reading one order. If eBay rejects the scopes, the error says so and the consent-link
     fallback still exists. */
  ebaySetRefreshToken: {
    auth: 'sync', fn: async (p, ctx) => {
      const account = String(p.account || ''), token = String(p.refresh_token || '');
      if (!account || !token) throw new Error('SAY: account and refresh_token are both needed');
      if (p.app_id || p.cert_id) {
        await ctx.env.DB.prepare('UPDATE accounts SET oauth_ref = ?2, app_id = ?3, cert_id = ?4 WHERE name = ?1')
          .bind(account, token, String(p.app_id || ''), String(p.cert_id || '')).run();
      } else {
        await ctx.env.DB.prepare('UPDATE accounts SET oauth_ref = ?2 WHERE name = ?1').bind(account, token).run();
      }
      await ctx.env.HOT.delete('ebaytok:' + account);
      try {
        const access = await ebayAccessToken(ctx.env, account);
        const r = await fetch('https://api.ebay.com/sell/fulfillment/v1/order?limit=1', {
          headers: { authorization: 'Bearer ' + access } });
        const body = await r.text();
        return { account, refresh_ok: true, orders_probe: r.status,
          note: r.ok ? 'token works — orders readable' : 'refresh worked but orders read returned ' + r.status + ': ' + body.slice(0, 180) };
      } catch (e) {
        // sync-key-gated diagnostic: the caller is the build session, so the raw reason is safe
        return { account, refresh_ok: false, error: String(e && e.message || e).slice(0, 300) };
      }
    },
  },

  ebaySubmitConsent: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const account = String(p.account || ''), code = String(p.code || '').trim();
      if (!account || !code) throw new Error('SAY: account and code are both needed');
      /* Everything checkable happens BEFORE the exchange — the consent code is single-use, and
         burning it on a bad submit loses the whole click-through. The state parameter carries
         the account the link was minted for; a URL pasted into the wrong row is refused, not
         silently bound to the wrong eBay identity. */
      const prior = await ctx.env.DB.prepare('SELECT app_id FROM accounts WHERE name = ?1 AND api_enabled = 1').bind(account).first();
      if (!prior) throw new Error('SAY: unknown account row — refresh the screen and try again');
      const st = code.match(/[?&]state=([^&\s]+)/);
      if (st && decodeURIComponent(st[1]) !== account) {
        throw new Error('SAY: that code belongs to "' + decodeURIComponent(st[1]).slice(0, 40) + '" — paste it into that account\'s row');
      }
      const m = code.match(/[?&]code=([^&\s]+)/);
      const clean = decodeURIComponent(m ? m[1] : code);
      const t = await ebayExchangeCode(ctx.env, clean);
      // the new token was minted by the GLOBAL app — clear the per-account keyset so the
      // fallback in ebayCreds() applies; the sheet automations' own apps are untouched
      const upd = await ctx.env.DB.prepare("UPDATE accounts SET oauth_ref = ?2, app_id = '', cert_id = '' WHERE name = ?1")
        .bind(account, String(t.refresh_token)).run();
      if (!upd.meta || !upd.meta.changes) throw new Error('SAY: the token could not be stored — the code is spent, redo the consent click');
      await ctx.env.HOT.delete('ebaytok:' + account);
      await ctx.env.DB.prepare(
        "INSERT INTO audit (actor, action, target, old, new, at) VALUES (?1, 'EBAY_RECONSENT', ?2, ?3, 'global app, extended scopes', datetime('now'))"
      ).bind(ctx.email, account, ('was app: ' + String(prior.app_id || '(global)')).slice(0, 120)).run();
      // prove it immediately, on the scope that was missing before
      let marketing = 'not checked';
      try {
        const tok = await ebayAccessToken(ctx.env, account);
        const r = await fetch('https://api.ebay.com/sell/marketing/v1/ad_campaign?limit=1', { headers: { authorization: 'Bearer ' + tok } });
        marketing = r.ok ? 'campaigns readable ✓' : 'campaigns still refused (' + r.status + ')';
      } catch (e) { marketing = String(e && e.message || e).slice(0, 120); }
      return { account, connected: true, expires_days: Math.round(Number(t.refresh_token_expires_in || 0) / 86400), marketing };
    },
  },
};
