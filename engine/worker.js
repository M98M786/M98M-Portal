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
const ITEM_PROFIT_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'];
const CAMPAIGN_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'];
const MGMT_ROLES = ['Management', 'Ops Head'];

const JSON_HEADERS = { 'content-type': 'application/json' };

export default {
  async fetch(req, env, ctx) {
    const origin = env.ALLOWED_ORIGIN || '*';
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
        ctx2 = await authorize(env, String(body.idToken || ''));
        if (route.auth === 'mgmt' && MGMT_ROLES.indexOf(ctx2.user.role) < 0 && !ctx2.user.super) throw new AuthError('auth');
      }
      const t0 = Date.now();
      const data = await route.fn(body.payload || {}, ctx2);
      console.log('t', action, Date.now() - t0, 'ms');       // §9: server time per action, in the CF log
      return json({ ok: true, data }, 200, cors);
    } catch (e) {
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
    const jobs = {
      '*/5 * * * *': [orderSync, adsSync, violationsSync],
      '*/15 * * * *': [listingSync, adsItems, autoMsgSend, adsReportPoll],
      '0 * * * *': [financeSync, csSync, autoMsgScan],
      '0 2 * * *': [rollups, backup, adsReportKick, standardsSync],
    };
    const fns = jobs[event.cron] || [];
    ctx.waitUntil((async () => {
      await Promise.all(fns.map(fn => runJob(env, fn)));
      await flushNotifyQueue(env);
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
async function authorize(env, idToken) {
  if (!idToken) throw new AuthError('auth');
  const digest = await sha256(idToken);
  const kvKey = 'tok:' + digest;
  let email = await env.HOT.get(kvKey);
  if (!email) {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
    if (!r.ok) throw new AuthError('auth');
    const t = await r.json();
    if (String(t.email_verified) !== 'true' || !t.email) throw new AuthError('auth');
    if (Number(t.exp) * 1000 < Date.now()) throw new AuthError('auth');
    email = String(t.email).toLowerCase();
    await env.HOT.put(kvKey, email, { expirationTtl: 300 });
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
function stripItem(row, user) {
  const out = { ...row };
  if (ITEM_PROFIT_ROLES.indexOf(user.role) < 0 && !user.super) {
    delete out.profit; delete out.roi; delete out.margin; delete out.avg_profit_7d;
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
  for (const acct of await apiAccounts(env)) {
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
    for (const it of items) {
      const id = xmlTag(it, 'ItemID');
      if (!id) continue;
      await env.DB.prepare(
        'INSERT INTO items_api (item_id, account, title, price, qty, status, image, api_synced_at) ' +
        "VALUES (?1, ?2, ?3, ?4, ?5, 'ACTIVE', ?6, datetime('now')) " +
        "ON CONFLICT(item_id) DO UPDATE SET account=?2, title=?3, price=?4, qty=?5, status='ACTIVE', image=?6, api_synced_at=datetime('now')"
      ).bind(
        id, acct,
        xmlTag(it, 'Title'),
        Number(xmlTag(it, 'CurrentPrice')) || 0,
        Number(xmlTag(it, 'QuantityAvailable') || xmlTag(it, 'Quantity')) || 0,
        xmlTag(it, 'GalleryURL')
      ).run();
    }
    const totalPages = Number(xmlTag(xmlTag(xml, 'ActiveList'), 'TotalNumberOfPages')) || 1;
    const next = page >= totalPages ? 1 : page + 1;
    await env.DB.prepare(
      "INSERT INTO sync_state (job, account, cursor, last_ok, last_error) VALUES ('listingSync', ?1, ?2, datetime('now'), '') " +
      "ON CONFLICT(job, account) DO UPDATE SET cursor = ?2"
    ).bind(acct, String(next)).run();
  });
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
    const ko = await env.DB.prepare('SELECT order_id, status, qty, est_delivery FROM orders WHERE account = ?1 AND created_at >= ?2').bind(acct, since).all();
    for (const r of (ko.results || [])) knownO[r.order_id] = String(r.status) + '|' + String(r.qty) + '|' + String(r.est_delivery);

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
        const status = String(o.orderFulfillmentStatus || '');
        const id = String(o.orderId);
        if (knownO[id] === status + '|' + qty + '|' + est) continue;   // unchanged → no write
        await env.DB.prepare(
          'INSERT INTO orders (order_id, account, item_id, sold, status, buyer, created_at, qty, est_delivery) ' +
          'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ' +
          'ON CONFLICT(order_id) DO UPDATE SET status=?5, qty=?8, est_delivery=?9'
        ).bind(
          id, acct, String(line.legacyItemId || ''),
          Number((o.pricingSummary && o.pricingSummary.total && o.pricingSummary.total.value) || 0),
          status, String((o.buyer && o.buyer.username) || ''),
          String(o.creationDate || ''), qty, est
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
  const rs = await env.DB.prepare('SELECT id, to_addr, type, message, ref, tries FROM notify_queue ORDER BY id LIMIT 8').all();
  for (const row of (rs.results || [])) {
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
    } else {
      await env.DB.prepare('UPDATE notify_queue SET tries = tries + 1 WHERE id = ?1').bind(row.id).run();
    }
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
    if (!r.ok) throw new Error(acct + ' campaigns ' + r.status);
    const page = await r.json();
    const live = {};
    for (const c of (page.campaigns || [])) {
      const budget = String((c.budget && c.budget.daily && c.budget.daily.amount && c.budget.daily.amount.value) || '');
      live[c.campaignId] = { name: String(c.campaignName || ''), status: String(c.campaignStatus || ''), budget };
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
        "INSERT INTO campaigns (account, campaign_id, name, status, budget, synced_at) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now')) " +
        "ON CONFLICT(account, campaign_id) DO UPDATE SET name=?3, status=?4, budget=?5, synced_at=datetime('now')"
      ).bind(acct, id, l.name, l.status, l.budget).run();
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
  const dups = await env.DB.prepare(
    'SELECT ca.listing_id, COUNT(DISTINCT ca.campaign_id) AS n, GROUP_CONCAT(c.name, \' | \') AS names ' +
    'FROM campaign_ads ca JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id ' +
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
    for (let page = 0; page < 3; page++) {
      const r = await fetch('https://apiz.ebay.com/sell/finances/v1/transaction?limit=100&offset=' + (page * 100) +
        '&filter=' + encodeURIComponent('transactionDate:[' + since + '..]'), { headers: { authorization: 'Bearer ' + tok } });
      if (r.status === 403) throw new Error(acct + ' finances 403 — needs the extended-scope re-consent (Account health screen)');
      if (!r.ok) throw new Error(acct + ' finances ' + r.status + ': ' + (await r.text()).slice(0, 120));
      const d = await r.json();
      txs.push(...(d.transactions || []));
      if ((d.transactions || []).length < 100) break;
    }

    const feesByOrder = {};
    for (const t of txs) {
      const oid = String(t.orderId || '');
      if (!oid) continue;
      const fee = Number((t.totalFeeAmount || {}).value || 0);
      if (!fee) continue;
      // bookingEntry says which way the money went: a refunded fee is a CREDIT and subtracts
      const sign = /CREDIT/i.test(String(t.bookingEntry || '')) ? -1 : 1;
      feesByOrder[oid] = round2((feesByOrder[oid] || 0) + sign * fee);
    }
    if (!Object.keys(feesByOrder).length) return;

    const ids = Object.keys(feesByOrder);
    const rows = {};
    for (let i = 0; i < ids.length; i += 90) {
      const chunk = ids.slice(i, i + 90);
      const rs = await env.DB.prepare(
        'SELECT o.order_id, o.sold, o.qty, o.item_id, o.ebay_fees, o.created_at, f.oe FROM orders o LEFT JOIN items_facts f ON f.item_id = o.item_id ' +
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
      if (Math.abs(Number(row.ebay_fees) - fee) < 0.005) continue;     // unchanged → no write
      stmts.push(env.DB.prepare('UPDATE orders SET ebay_fees = ?2 WHERE order_id = ?1').bind(oid, fee));
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
        list: d => d.members || [], id: m => String(m.returnId || ''), status: m => String(m.state || m.status || ''),
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
const ADS_METRIC_WANTED = ['ad_fees', 'clicks', 'impressions', 'sales', 'sale_amount'];

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
    const metricKeys = ADS_METRIC_WANTED.filter(m => mets.indexOf(m) >= 0);
    if (!metricKeys.length) throw new Error(acct + ' report metadata offers no known metrics: ' + mets.join(',').slice(0, 120));

    const y = new Date(Date.now() - 86400000);
    const day = ukDate(y.toISOString());
    const from = day + 'T00:00:00.000Z';
    const to = day + 'T23:59:59.000Z';
    const cr = await fetch('https://api.ebay.com/sell/marketing/v1/ad_report_task', {
      method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
      body: JSON.stringify({ reportType: 'LISTING_PERFORMANCE_REPORT', reportFormat: 'TSV_GZIP',
        dateFrom: from, dateTo: to,
        dimensions: [{ dimensionKey: 'listing_id' }, { dimensionKey: 'campaign_id' }], metricKeys }),
    });
    if (cr.status !== 202 && !cr.ok) throw new Error(acct + ' report create ' + cr.status + ': ' + (await cr.text()).slice(0, 160));
    const loc = cr.headers.get('location') || '';
    const taskId = loc.split('/').filter(Boolean).pop() || ('t' + Date.now());
    await env.DB.prepare(
      "INSERT INTO ad_report_tasks (account, task_id, report_date, status, error, created_at) VALUES (?1, ?2, ?3, 'PENDING', '', datetime('now')) " +
      'ON CONFLICT(account, task_id) DO NOTHING'
    ).bind(acct, taskId, day).run();
  });
}

async function adsReportPoll(env) {
  await perAccount(env, 'adsReportPoll', async (acct) => {
    const pend = await env.DB.prepare(
      "SELECT task_id, report_date FROM ad_report_tasks WHERE account = ?1 AND status IN ('PENDING', 'SUCCESS') ORDER BY created_at LIMIT 3"
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

      const ingested = await ingestAdsReport(env, acct, t.report_date, text);
      await env.DB.prepare("UPDATE ad_report_tasks SET status = 'INGESTED', error = ?3 WHERE account = ?1 AND task_id = ?2")
        .bind(acct, t.task_id, ingested + ' rows').run();
    }
  });
}

/* The report is TSV with a header row (eBay sometimes prefixes metadata lines — the header is
   the first line that mentions a listing column). Column names come from the metric metadata,
   so matching is by meaning, not position. */
async function ingestAdsReport(env, acct, day, text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  let hi = lines.findIndex(l => /listing/i.test(l) && l.indexOf('\t') >= 0);
  if (hi < 0) return 0;
  const heads = lines[hi].split('\t').map(h => h.trim().toLowerCase());
  const col = re => heads.findIndex(h => re.test(h));
  const cListing = col(/listing/);
  const cSpend = col(/ad_fee/);
  const cClicks = col(/^clicks$/);
  const cUnits = col(/^sales$/);          // eBay's 'sales' = attributed sale count
  const cSales = col(/sale_amount/);
  if (cListing < 0) return 0;

  const agg = {};
  for (let i = hi + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const lid = String(cells[cListing] || '').replace(/\D/g, '');
    if (!lid) continue;
    const a = (agg[lid] = agg[lid] || { spend: 0, clicks: 0, units: 0, sales: 0 });
    // eBay prints money as "GBP 3.27" (zeros sometimes as "USD 0.00") — strip everything non-numeric
    const num = idx => idx >= 0 ? (Number(String(cells[idx] || '').replace(/[^0-9.\-]/g, '')) || 0) : 0;
    a.spend += num(cSpend); a.clicks += num(cClicks); a.units += num(cUnits); a.sales += num(cSales);
  }

  const stmts = [];
  let total = 0;
  for (const lid of Object.keys(agg)) {
    const a = agg[lid];
    total += a.spend;
    stmts.push(env.DB.prepare(
      'INSERT INTO ads_daily (account, item_id, date, spend, clicks, sales, cpq) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
      'ON CONFLICT(account, item_id, date) DO UPDATE SET spend = ?4, clicks = ?5, sales = ?6, cpq = ?7'
    ).bind(acct, lid, day, round2(a.spend), Math.round(a.clicks), Math.round(a.units), a.units > 0 ? round2(a.spend / a.units) : 0));
  }
  stmts.push(env.DB.prepare(
    'INSERT INTO sales_daily (account, date, sold, oe, cost, ads, profit) VALUES (?1, ?2, 0, 0, 0, ?3, 0) ' +
    'ON CONFLICT(account, date) DO UPDATE SET ads = ?3'
  ).bind(acct, day, round2(total)));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
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

/* Nightly rollups (§3): sales_daily per account per UK day (last 8 days re-rolled, so late
   orders correct yesterday), avg_profit_7d per item, and the daily_health snapshot. Ads spend
   stays 0 until the report-task feed lands — profit here is the sheet's own per-item projection
   times units, labelled an estimate wherever it is shown. */
async function rollups(env) {
  const sinceIso = new Date(Date.now() - 8 * 86400000).toISOString();
  const ors = await env.DB.prepare('SELECT account, item_id, sold, qty, created_at FROM orders WHERE created_at >= ?1').bind(sinceIso).all();
  const orders = ors.results || [];
  /* The oldest UK day in the window is only PARTIALLY covered (the window edge is an instant,
     a UK day is not) — writing it would overwrite last night's correct full-day row with a
     truncated one, permanently. That day is done and written; skip it. */
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
    const row = (day[k] = day[k] || { sold: 0, oe: 0, cost: 0, profit: 0 });
    row.sold += Number(o.sold) || 0;                  // order total is already all units
    row.oe += (Number(f.oe) || 0) * q;
    row.cost += (Number(f.ali_cost) || 0) * q;
    row.profit += (Number(f.profit) || 0) * q;
    const t = new Date(o.created_at).getTime();
    if (o.item_id && !isNaN(t) && t >= cut7) units7[o.item_id] = (units7[o.item_id] || 0) + q;
  }

  const stmts = [];
  for (const k of Object.keys(day)) {
    const cut = k.indexOf('|');
    const v = day[k];
    stmts.push(env.DB.prepare(
      'INSERT INTO sales_daily (account, date, sold, oe, cost, ads, profit) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6) ' +
      'ON CONFLICT(account, date) DO UPDATE SET sold = ?3, oe = ?4, cost = ?5, profit = ?6'
    ).bind(k.slice(0, cut), k.slice(cut + 1), round2(v.sold), round2(v.oe), round2(v.cost), round2(v.profit)));
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

  // sold_30d per item (change-only, like everything that writes daily) + queue hygiene
  const s30 = {};
  const o30 = await env.DB.prepare(
    "SELECT item_id, SUM(MAX(1, qty)) AS u FROM orders WHERE created_at >= datetime('now', '-30 day') AND item_id != '' GROUP BY item_id"
  ).all();
  for (const r of (o30.results || [])) s30[r.item_id] = Number(r.u) || 0;
  const cur30 = await env.DB.prepare('SELECT item_id, sold_30d FROM items_api').all();
  const st30 = [];
  for (const r of (cur30.results || [])) {
    const want = s30[r.item_id] || 0;
    if (Number(r.sold_30d) !== want) st30.push(env.DB.prepare('UPDATE items_api SET sold_30d = ?2 WHERE item_id = ?1').bind(r.item_id, want));
  }
  for (let i = 0; i < st30.length; i += 50) await env.DB.batch(st30.slice(i, i + 50));
  await env.DB.prepare("DELETE FROM automsg_queue WHERE status != 'QUEUED' AND created_at < datetime('now', '-30 day')").run();
  await env.DB.prepare("DELETE FROM ad_report_tasks WHERE status IN ('INGESTED', 'FAILED') AND created_at < datetime('now', '-30 day')").run();

  const rows = await computeHealth(env);
  for (const h of rows) {
    await env.DB.prepare(
      'INSERT INTO daily_health (day, account, listings, orders_7d, revenue_7d, loss_items, json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
      'ON CONFLICT(day, account) DO UPDATE SET listings = ?3, orders_7d = ?4, revenue_7d = ?5, loss_items = ?6, json = ?7'
    ).bind(ukDate(''), h.account, h.listings, h.orders_7d, h.revenue_7d, h.loss_items,
      JSON.stringify({ campaigns_running: h.campaigns_running, campaigns_total: h.campaigns_total })).run();
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
  syncFacts: {
    auth: 'sync', fn: async (p, ctx) => {
      let n = 0;
      for (const f of (p.items || [])) {
        const id = String(f.item_id || '').trim();
        if (!id) continue;
        await ctx.env.DB.prepare(
          'INSERT INTO items_facts (item_id, account, source, ali_cost, oe, profit, campaign_name, campaign_type, current_sup, enriched_at) ' +
          "VALUES (?1, ?2, 'SHEET', ?3, ?4, ?5, ?6, ?7, ?8, datetime('now')) " +
          'ON CONFLICT(item_id) DO UPDATE SET account=?2, ali_cost=?3, oe=?4, profit=?5, campaign_name=?6, campaign_type=?7, current_sup=?8, enriched_at=datetime(\'now\')'
        ).bind(id, String(f.account || ''), Number(f.ali_cost) || 0, Number(f.oe) || 0,
          Number(f.profit) || 0, String(f.campaign_name || ''), String(f.campaign_type || ''), String(f.current_sup || '')).run();
        n++;
      }
      return { synced: n };
    },
  },

  /* Tracking push (V2 req 3, A4) — SHADOW until TRACKING_LIVE='true' (G-3). The carrier comes
     from eBay's OWN accepted-carrier list (GeteBayDetails, cached 7 days per account in
     accounts.couriers_json — Hasib's A4 ruling: no manual mapping, ever). The tracking number's
     format nominates a candidate; the list decides the exact enum eBay accepts. */
  ebayPushTracking: {
    auth: 'sync', fn: async (p, ctx) => {
      const account = String(p.account || ''), orderId = String(p.order_id || ''), tracking = String(p.tracking || '').trim();
      if (!account || !orderId || !tracking) throw new Error('SAY: account, order_id and tracking are all needed');
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
      if (String(ctx.env.TRACKING_LIVE) !== 'true') {
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
      return { shadow: false, pushed: true, carrier_auto: carrier, status: pr.status };
    },
  },

  /* Active Listings dashboard read (§5 second-module 2/3): API truth + sheet facts
     joined at the edge, stripped per §6 before it leaves. Sir Hasib rows arrive via
     the sheets bridge into items_facts with source='SHEET' (G-2 chip). */
  activeListings: {
    auth: 'any', fn: async (p, ctx) => {
      const account = String(p.account || '');
      const rs = await ctx.env.DB.prepare(
        'SELECT a.item_id, a.account, a.title, a.price, a.qty, a.status, a.image, a.api_synced_at, ' +
        '       f.ali_cost, f.sup1, f.sup2, f.sup3, f.current_sup, f.oe, f.profit, f.roi, f.margin, ' +
        '       f.avg_profit_7d, f.campaign_name, f.campaign_type, f.source ' +
        'FROM items_api a LEFT JOIN items_facts f ON f.item_id = a.item_id ' +
        (account ? 'WHERE a.account = ?1 ' : '') + 'ORDER BY a.api_synced_at DESC LIMIT 500'
      ).bind(...(account ? [account] : [])).all();
      const rows = (rs.results || []).map(r => stripItem(r, ctx.user));
      /* Req 33 / Q9: Team Lead (and the other campaign roles) see PER-ITEM ad spend — never
         account totals. The 14-day per-item spend rides along only for those roles; the strip
         law stays the single gate. */
      if (CAMPAIGN_ROLES.indexOf(ctx.user.role) >= 0 || ctx.user.super) {
        const ads = await ctx.env.DB.prepare(
          "SELECT item_id, ROUND(SUM(spend), 2) AS ad_spend_14d, SUM(sales) AS ad_units_14d FROM ads_daily " +
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
      const dups = await ctx.env.DB.prepare(
        'SELECT ca.account, ca.listing_id, ca.campaign_id, c.name, ia.title ' +
        'FROM campaign_ads ca ' +
        'JOIN campaigns c ON c.account = ca.account AND c.campaign_id = ca.campaign_id ' +
        'LEFT JOIN items_api ia ON ia.item_id = ca.listing_id ' +
        "WHERE c.status LIKE '%RUNNING%' AND EXISTS (" +
        '  SELECT 1 FROM campaign_ads x JOIN campaigns cx ON cx.account = x.account AND cx.campaign_id = x.campaign_id ' +
        "  WHERE x.account = ca.account AND x.listing_id = ca.listing_id AND cx.status LIKE '%RUNNING%' " +
        '  GROUP BY x.listing_id HAVING COUNT(DISTINCT x.campaign_id) > 1) ' +
        'ORDER BY ca.account, ca.listing_id'
      ).all();
      const events = await ctx.env.DB.prepare(
        'SELECT account, campaign, item_id, change_type, old, new, actor, at FROM campaign_events ORDER BY id DESC LIMIT 60'
      ).all();
      const state = await ctx.env.DB.prepare(
        "SELECT account, last_ok, last_error FROM sync_state WHERE job = 'adsSync' AND account != ''"
      ).all();
      /* CPQ, last 14 days per item: what each listing COSTS in ads per unit it sells — and the
         burners (spend, zero sales) float to the top, because that is the money leak. */
      const cpq = await ctx.env.DB.prepare(
        "SELECT a.account, a.item_id, MAX(i.title) AS title, ROUND(SUM(a.spend), 2) AS spend, SUM(a.clicks) AS clicks, " +
        'SUM(a.sales) AS units, ' +
        'ROUND(SUM(a.spend) / MAX(1, SUM(a.sales)), 2) AS cpq ' +
        'FROM ads_daily a LEFT JOIN items_api i ON i.item_id = a.item_id ' +
        "WHERE a.date >= date('now', '-14 day') GROUP BY a.account, a.item_id HAVING SUM(a.spend) > 0 " +
        'ORDER BY (SUM(a.sales) = 0) DESC, SUM(a.spend) DESC LIMIT 60'
      ).all();
      return { campaigns: camps.results || [], duplicates: dups.results || [], events: events.results || [], sync: state.results || [], cpq: cpq.results || [] };
      });
    },
  },

  /* The CS live desk in one read (§9-D): open cases / returns / INR sorted by respond-by,
     30/90-day open-closed counts, unanswered received messages, eBay's own seller-standards
     verdict per account, and any listing violations. No profit fields anywhere here — CS and
     Management/Ops read it. */
  csDesk: {
    auth: 'any', fn: async (p, ctx) => {
      if (['Management', 'Ops Head', 'CS'].indexOf(ctx.user.role) < 0 && !ctx.user.super) throw new AuthError('auth');
      const open = await ctx.env.DB.prepare(
        "SELECT case_id, account, kind, order_id, item_id, buyer, reason, status, opened_at, payload_json FROM cases " +
        "WHERE status NOT LIKE '%CLOSED%' ORDER BY opened_at DESC LIMIT 200"
      ).all();
      const counts = await ctx.env.DB.prepare(
        "SELECT kind, account, " +
        "SUM(CASE WHEN status NOT LIKE '%CLOSED%' THEN 1 ELSE 0 END) AS open_n, " +
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
      return { open: open.results || [], counts: counts.results || [], messages: msgs.results || [],
        standards: std.results || [], violations: viol.results || [] };
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
        'SELECT account, date, sold, oe, cost, ads, profit FROM sales_daily WHERE date >= ?1'
      ).bind(shift(today, 8)).all();
      const days = sd.results || [];
      const sum = rows => rows.reduce((t, r) => ({ sold: t.sold + (Number(r.sold) || 0), profit: t.profit + (Number(r.profit) || 0), ads: t.ads + (Number(r.ads) || 0) }), { sold: 0, profit: 0, ads: 0 });
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
        'SELECT a.account, SUM(a.spend) AS spend, SUM(a.clicks) AS clicks, SUM(a.sales) AS units FROM ads_daily a WHERE a.date = ?1 GROUP BY a.account'
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
        health,
        duplicates: dups.results || [],
        loss_items: losses.results || [],
        note: 'profit is the sheet projection × units; ROAS is account revenue ÷ ad spend for the day (per-item sale attribution lands with the finance feed)',
      };
    }),
  },

  /* The instant first paint for the Orders screen (§10 step 1: "opens Orders, 240ms"): today's
     eBay-side order list from D1 while the sheet workspace loads behind it. No profit fields,
     so every signed-in role may read it; the sheet stays the write truth. */
  ordersLive: {
    auth: 'any', fn: async (p, ctx) => {
      const account = String(p.account || '');
      if (!account) throw new Error('SAY: which account?');
      return memo('ordersLive:' + account, 60000, async () => {
        const rs = await ctx.env.DB.prepare(
          'SELECT o.order_id, o.buyer, o.item_id, o.sold, o.qty, o.status, o.created_at, o.est_delivery, i.title ' +
          'FROM orders o LEFT JOIN items_api i ON i.item_id = o.item_id ' +
          "WHERE o.account = ?1 AND o.created_at >= datetime('now', '-2 day') ORDER BY o.created_at DESC LIMIT 200"
        ).bind(account).all();
        const today = ukDate('');
        const rows = (rs.results || []).filter(r => ukDate(r.created_at) === today);
        return { account, date: today, rows,
          note: 'live eBay orders — the sheet workspace below carries the processing columns' };
      });
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
    auth: 'mgmt', fn: async (p, ctx) => {
      const now = await computeHealth(ctx.env);
      const trend = await ctx.env.DB.prepare(
        'SELECT day, account, listings, orders_7d, revenue_7d, loss_items, json FROM daily_health ORDER BY day DESC LIMIT 84'
      ).all();
      const sync = await ctx.env.DB.prepare('SELECT job, account, last_ok, last_error FROM sync_state ORDER BY job, account').all();
      return { now, trend: trend.results || [], sync: sync.results || [] };
    },
  },

  /* Daily report (own dashboard, §9-C): sales_daily in UK business dates. Profit is the sheet's
     per-item projection × units — an estimate until the fee/ads feeds land — and the auth gate
     is the §6 law: only Management/Ops ever see collective profit. */
  dailyReport: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const rs = await ctx.env.DB.prepare(
        "SELECT account, date, sold, oe, cost, ads, profit FROM sales_daily WHERE date >= date('now', '-62 day') ORDER BY date DESC, account"
      ).all();
      return { rows: rs.results || [], note: 'profit = per-item sheet projection × units (estimate); ads spend joins when the report feed lands' };
    },
  },

  /* Ops lever for the build session and the Management ops panel: run any cron job now. */
  runJobNow: {
    auth: 'sync', fn: async (p, ctx) => {
      const jobs = { listingSync, orderSync, adsSync, adsItems, rollups, backup, adsReportKick, adsReportPoll, csSync, violationsSync, autoMsgScan, autoMsgSend, standardsSync, financeSync };
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
