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
      const data = await route.fn(body.payload || {}, ctx2);
      return json({ ok: true, data }, 200, cors);
    } catch (e) {
      const msg = e instanceof AuthError ? 'auth'
        : String(e && e.message || e).startsWith('SAY: ') ? String(e.message).slice(5)
        : 'request failed';
      if (msg === 'request failed') console.log('ERR', action, String(e && e.stack || e).slice(0, 500));
      return json({ ok: false, error: msg }, 200, cors);
    }
  },

  /* Cron fan-out — each schedule set in the dashboard calls this with its own cron string. */
  async scheduled(event, env, ctx) {
    const jobs = {
      '*/5 * * * *': [orderSync, adsSync],
      '*/15 * * * *': [listingSync],
      '0 * * * *': [financeSync, csSync],
      '0 2 * * *': [rollups, backup],
    };
    for (const fn of (jobs[event.cron] || [])) {
      ctx.waitUntil(runJob(env, fn));
    }
  },
};

class AuthError extends Error {}
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

/* ---------------- sync-state (§2 correction 3): resumable, visible jobs ------ */
async function runJob(env, fn) {
  const name = fn.name;
  try {
    await fn(env);
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
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    let href = 'https://api.ebay.com/sell/fulfillment/v1/order?limit=100&filter=' +
      encodeURIComponent('creationdate:[' + since + '..]');
    let n = 0;
    while (href && n < 10) {
      const r = await fetch(href, { headers: { authorization: 'Bearer ' + tok } });
      if (!r.ok) throw new Error(acct + ' orders ' + r.status);
      const page = await r.json();
      for (const o of (page.orders || [])) {
        const line = (o.lineItems && o.lineItems[0]) || {};
        await env.DB.prepare(
          'INSERT INTO orders (order_id, account, item_id, sold, status, buyer, created_at) ' +
          'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
          'ON CONFLICT(order_id) DO UPDATE SET status=?5'
        ).bind(
          String(o.orderId), acct, String(line.legacyItemId || ''),
          Number((o.pricingSummary && o.pricingSummary.total && o.pricingSummary.total.value) || 0),
          String(o.orderFulfillmentStatus || ''), String((o.buyer && o.buyer.username) || ''),
          String(o.creationDate || '')
        ).run();
      }
      n++; href = page.next || '';
    }
  });
}

/* Engine → portal bell: events raised at the edge surface through the same Apps Script
   notification law pipeline every other alert uses. Fire-and-forget with a hard timeout. */
async function notifyAS(env, to, type, message, ref) {
  try {
    await fetch(env.AS_URL, {
      method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'engineNotify',
        payload: { key: await secret(env, 'SYNC_KEY'), to, type, message, ref } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) { console.log('notifyAS failed', String(e).slice(0, 120)); }
}

/* Campaign watcher (V2 req 4/21/22, campaign level): every 5 minutes the live campaign list is
   diffed against the last snapshot — created, ended, paused, reactivated, renamed, budget moved.
   The honesty rule is structural here: the API never says WHO changed anything, so the message
   says "on eBay" and only the portal's own edits ever carry a name. Item-level membership and
   duplicate-ACTIVE detection ride the next iteration (rolling per-account, subrequest budget). */
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

    for (const ev of events.slice(0, 6)) {
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
      await notifyAS(env, 'management', 'Campaign changed', msg, 'engine:camp:' + acct + ':' + ev.id + ':' + ev.type);
      await notifyAS(env, 'advertising', 'Campaign changed', msg, 'engine:camp:' + acct + ':' + ev.id + ':' + ev.type);
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
async function financeSync(env) { /* Phase C: real fees vs Brain v17 drift. */ }
async function csSync(env) { /* Phase D: Post-Order cases, buyer messages, violations. */ }
async function rollups(env) { /* Phase C: sales_daily, CPQ, weekly/monthly KPIs, health snapshot. */ }
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
      for (const t of ['users', 'accounts', 'items_api', 'orders']) {
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

  /* Tracking push (V2 req 3) — SHADOW until TRACKING_LIVE='true' (G-3): resolves the order,
     auto-picks the carrier from the tracking number's own format, and reports exactly what it
     WOULD send to eBay. Flip the var and the same call ships for real. */
  ebayPushTracking: {
    auth: 'sync', fn: async (p, ctx) => {
      const account = String(p.account || ''), orderId = String(p.order_id || ''), tracking = String(p.tracking || '').trim();
      if (!account || !orderId || !tracking) throw new Error('SAY: account, order_id and tracking are all needed');
      const carriers = [
        [/^[A-Z]{2}\d{9}GB$/i, 'ROYAL_MAIL'],
        [/^(H0|C0|T0)\d{14}$/i, 'HERMES'],
        [/^\d{16}$/, 'HERMES'],
        [/^JD\d{16,}$/i, 'YODEL'],
        [/^(JJD|JVGL)/i, 'DHL'],
        [/^1Z/i, 'UPS'],
      ];
      let carrier = String(p.courier || '').trim().toUpperCase();
      if (!carrier) { for (const [re, c] of carriers) { if (re.test(tracking)) { carrier = c; break; } } }
      if (!carrier) carrier = 'OTHER';
      const fulfillment = { lineItems: [], shippedDate: new Date().toISOString(), shippingCarrierCode: carrier, trackingNumber: tracking };
      const tok = await ebayAccessToken(ctx.env, account);
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
      return { rows: (rs.results || []).map(r => stripItem(r, ctx.user)), source_note: 'API rows join sheet facts; SHEET rows are the bridge for the no-API account' };
    },
  },

  /* eBay consent flow (Phase B2): Management asks for the links, clicks Allow on
     each account, pastes the resulting code back. */
  /* sync-key auth until the Management dashboard view ships — only Apps Script and the build
     session hold the key, and the links contain nothing secret (client_id is public in OAuth). */
  ebayConsentLinks: {
    auth: 'sync', fn: async (p, ctx) => {
      const names = await ctx.env.DB.prepare('SELECT name FROM accounts WHERE api_enabled = 1').all();
      const out = [];
      for (const r of (names.results || [])) out.push({ account: r.name, url: await ebayConsentUrl(ctx.env, r.name) });
      return { links: out };
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
    auth: 'sync', fn: async (p, ctx) => {
      const account = String(p.account || ''), code = String(p.code || '');
      if (!account || !code) throw new Error('SAY: account and code are both needed');
      const t = await ebayExchangeCode(ctx.env, code);
      await ctx.env.DB.prepare('UPDATE accounts SET oauth_ref = ?2 WHERE name = ?1').bind(account, String(t.refresh_token)).run();
      return { account, connected: true, expires_days: Math.round(Number(t.refresh_token_expires_in || 0) / 86400) };
    },
  },
};
