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

async function ebayAccessToken(env, accountName) {
  const kvKey = 'ebaytok:' + accountName;
  const cached = await env.HOT.get(kvKey);
  if (cached) return cached;
  const row = await env.DB.prepare('SELECT oauth_ref FROM accounts WHERE name = ?1 AND api_enabled = 1').bind(accountName).first();
  if (!row || !row.oauth_ref) throw new Error('SAY: ' + accountName + ' has no eBay consent on file yet');
  const appId = await secret(env, 'EBAY_APP_ID');
  const cert = await secret(env, 'EBAY_CERT_ID');
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + btoa(appId + ':' + cert),
    },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(row.oauth_ref) + '&scope=' + encodeURIComponent(EBAY_SCOPES),
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

async function listingSync(env) {
  for (const acct of await apiAccounts(env)) {
    const tok = await ebayAccessToken(env, acct);
    let href = 'https://api.ebay.com/sell/inventory/v1/inventory_item?limit=200';
    // eBay Inventory API only covers migrated listings; GetMyeBaySelling via the
    // Trading API covers the rest — Phase B2 decides per account after a probe.
    let n = 0;
    while (href && n < 25) {
      const r = await fetch(href, { headers: { authorization: 'Bearer ' + tok } });
      if (!r.ok) throw new Error(acct + ' inventory ' + r.status);
      const page = await r.json();
      const rows = page.inventoryItems || [];
      for (const it of rows) {
        await env.DB.prepare(
          'INSERT INTO items_api (item_id, account, title, price, qty, status, image, api_synced_at) ' +
          "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now')) " +
          'ON CONFLICT(item_id) DO UPDATE SET title=?3, price=?4, qty=?5, status=?6, image=?7, api_synced_at=datetime(\'now\')'
        ).bind(
          String(it.sku || it.inventoryItemId || ''), acct,
          String((it.product && it.product.title) || ''), 0,
          Number((it.availability && it.availability.shipToLocationAvailability && it.availability.shipToLocationAvailability.quantity) || 0),
          'ACTIVE', String((it.product && it.product.imageUrls && it.product.imageUrls[0]) || '')
        ).run();
      }
      n++; href = page.next || '';
    }
  }
}

async function orderSync(env) {
  for (const acct of await apiAccounts(env)) {
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
  }
}

async function adsSync(env) { /* Phase C: Marketing API diff engine → campaign_events + notifications. */ }
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
  ebayConsentLinks: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const names = await ctx.env.DB.prepare('SELECT name FROM accounts WHERE api_enabled = 1').all();
      const out = [];
      for (const r of (names.results || [])) out.push({ account: r.name, url: await ebayConsentUrl(ctx.env, r.name) });
      return { links: out };
    },
  },
  ebaySubmitConsent: {
    auth: 'mgmt', fn: async (p, ctx) => {
      const account = String(p.account || ''), code = String(p.code || '');
      if (!account || !code) throw new Error('SAY: account and code are both needed');
      const t = await ebayExchangeCode(ctx.env, code);
      await ctx.env.DB.prepare('UPDATE accounts SET oauth_ref = ?2 WHERE name = ?1').bind(account, String(t.refresh_token)).run();
      return { account, connected: true, expires_days: Math.round(Number(t.refresh_token_expires_in || 0) / 86400) };
    },
  },
};
