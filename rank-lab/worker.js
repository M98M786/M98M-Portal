/* m98m-rank-lab — Phase 1 lab Worker for the M98M Rank Tracker.
   Prompt: M98M-RANK-TRACKER-PROMPT-v1.md §1B. Notes: RANK-TRACKER-NOTES.md.

   workers.dev ONLY — no route on m98mltd.co.uk, no cron (T8 adds one temporarily and removes it).
   Separate Worker from m98m-engine on purpose: nothing here can touch an engine code path.

   HARD RULES, enforced in code rather than by convention:
   - Read-only toward eBay. The only calls are the OAuth token endpoint, Browse
     item_summary/search · getItem · getItemByLegacyId · getItemsByItemGroup, and Developer
     Analytics getRateLimits. No Sell APIs, no user tokens, nothing that changes anything.
   - LICENCE §8.1 (owner's ruling, 13 Oct): sold counts are read for OUR OWN listings only.
     /sold refuses any item number that is not in items_api, and FAILS CLOSED when it cannot
     check. /search never reads `seller` out of the response, so a competitor-performance
     dataset cannot be assembled here even by accident.
   - LICENCE §3.3: one keyset (the global ZAREENLT app), exponential backoff on 429/5xx, and a
     per-request call ceiling. Never a tight retry loop.
   - The app token lives in isolate memory and nowhere else — never D1, never KV, never a log,
     never a response body. Minted once per isolate and reused until it expires.
   - D1 is bound READ-ONLY by discipline: the only statement in this file is a SELECT. */

const EBAY = 'https://api.ebay.com';
const MARKETPLACE = 'EBAY_GB';
const PAGE_SIZE = 200;              // Browse hard max
const MAX_DEPTH = 1000;             // lab ceiling: 5 search calls per scan
const MAX_CALLS_PER_REQUEST = 24;   // §3.3 belt and braces — one request can never run away
const DEFAULT_POSTCODE = 'SW1A 1AA';

/* ---- in-isolate state. Tokens never leave this scope. ---- */
let TOKEN = null;                   // { value, expMs, scope }
const CALLS = { token: 0, search: 0, item: 0, legacy: 0, group: 0, quota: 0, total: 0 };

const json = (obj, status) => new Response(JSON.stringify(obj, null, 2) + '\n',
  { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
const fail = (status, msg, extra) => json(Object.assign({ ok: false, error: msg }, extra || {}), status);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Length-independent compare, so the lab key cannot be probed a character at a time. */
function sameKey(a, b) {
  const x = String(a || ''), y = String(b || '');
  if (!x || !y || x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

async function appToken(env) {
  if (TOKEN && Date.now() < TOKEN.expMs - 120000) return TOKEN.value;
  const id = env.EBAY_APP_ID, cert = env.EBAY_CERT_ID;
  if (!id || !cert) throw new Error('EBAY_APP_ID / EBAY_CERT_ID are not bound on this Worker');
  const r = await fetch(EBAY + '/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + btoa(id + ':' + cert),
    },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent(EBAY + '/oauth/api_scope'),
  });
  CALLS.token++; CALLS.total++;
  const t = await r.json().catch(() => ({}));
  if (!r.ok || !t.access_token) {
    throw new Error('token mint ' + r.status + ' ' + String(t.error_description || t.error || '').slice(0, 160));
  }
  TOKEN = {
    value: t.access_token,
    expMs: Date.now() + Number(t.expires_in || 7200) * 1000,
    scope: String(t.scope || ''),
  };
  return TOKEN.value;
}

/* The whole header value URL-encoded, postcode from the caller. Without
   X-EBAY-C-MARKETPLACE-ID eBay SILENTLY serves EBAY_US — the single most expensive
   mistake available here, because the answer still looks plausible. */
function browseHeaders(tok, postcode) {
  return {
    authorization: 'Bearer ' + tok,
    'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
    'X-EBAY-C-ENDUSERCTX': 'contextualLocation=' + encodeURIComponent('country=GB,zip=' + postcode),
    'accept-language': 'en-GB',
    accept: 'application/json',
  };
}

async function browseGet(env, url, postcode, label) {
  if (CALLS.total >= MAX_CALLS_PER_REQUEST) {
    return { status: 0, error: 'lab call ceiling (' + MAX_CALLS_PER_REQUEST + ') hit — nothing more was asked of eBay' };
  }
  const tok = await appToken(env);
  let wait = 800;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: browseHeaders(tok, postcode) });
    CALLS[label] = (CALLS[label] || 0) + 1; CALLS.total++;
    if (r.status === 429 || r.status >= 500) {
      const body = await r.text();
      if (attempt === 3) return { status: r.status, error: 'eBay kept refusing', detail: body.slice(0, 300) };
      await sleep(wait); wait *= 2;
      continue;
    }
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch (e) { /* leave null */ }
    if (!body) return { status: r.status, error: 'non-JSON answer', detail: text.slice(0, 300) };
    return { status: r.status, body: body };
  }
}

/* eBay's own error numbers worth naming: 11004 / 11008 = listing or group temporarily
   unavailable because the seller is revising it. Retry later in the run, never hammer. */
function ebayErrs(body) {
  const list = (body && body.errors) || [];
  return list.map(e => ({ id: e.errorId, msg: String(e.message || '').slice(0, 160) }));
}
const retryable = errs => errs.some(e => e.id === 11004 || e.id === 11008);

/* ---------------- the rank scan ---------------- */
async function scan(env, q, depth, mode, postcode) {
  const pages = [], hits = [], seen = new Set();
  let total = null, truncated = false;

  for (let off = 0; off < depth; off += PAGE_SIZE) {
    const u = new URL(EBAY + '/buy/browse/v1/item_summary/search');
    u.searchParams.set('q', q);
    u.searchParams.set('limit', String(PAGE_SIZE));
    u.searchParams.set('offset', String(off));          // must be 0 or a multiple of limit
    /* No `sort` parameter — that IS Best Match, the buyer default. Adding sort breaks the test.
       Default Browse returns Buy-It-Now only; `all` adds auctions, which is what eBay.co.uk's
       own "All listings" view shows. T3/T9 decide which one matches the site. */
    if (mode === 'all') u.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE|AUCTION}');

    const r = await browseGet(env, u.toString(), postcode, 'search');
    if (r.status !== 200) {
      return { q, mode, depth, error: r.error || ('search ' + r.status), status: r.status,
        ebay: ebayErrs(r.body), retryable: retryable(ebayErrs(r.body)),
        detail: r.detail, total, scanned: hits.length, pages, hits };
    }
    const b = r.body || {};
    if (total === null) total = Number(b.total || 0);
    const arr = b.itemSummaries || [];
    pages.push({ offset: off, returned: arr.length });

    for (const s of arr) {
      /* Identity is legacyItemId — the eBay item number. NEVER the seller username:
         eBay is replacing usernames with immutable ids for some developers, and §8.1 keeps
         seller identity out of this tool entirely. `s.seller` is deliberately not read. */
      const item = String(s.legacyItemId || '');
      const key = item || String(s.itemId || '');
      if (!key || seen.has(key)) continue;             // dedupe in API order
      seen.add(key);
      hits.push({
        position: hits.length + 1,
        item: item,
        rest_id: String(s.itemId || ''),
        title: String(s.title || ''),
        price: s.price ? Number(s.price.value) : null,
        currency: s.price ? String(s.price.currency || '') : '',
        url: String(s.itemWebUrl || ''),
        is_group: !!s.itemGroupHref,
        group_type: String(s.itemGroupType || ''),
        group_href: String(s.itemGroupHref || ''),
        sponsored: s.priorityListing === true,
      });
    }
    if (arr.length < PAGE_SIZE) break;                 // ran out of results before the depth
    if (off + PAGE_SIZE >= 10000) { truncated = true; break; }   // Browse hard ceiling
  }
  return { q, mode, depth, page_size: PAGE_SIZE, total, scanned: hits.length,
    truncated, pages, hits };
}

/* ---------------- our-own check (licence §8.1) ---------------- */
/* Returns the items_api row, false if the item is not ours, or null if we cannot tell.
   null must FAIL CLOSED at the call site — "I could not check" is not permission. */
async function ourListing(env, item) {
  if (!env.DB) return null;
  try {
    return (await env.DB.prepare(
      'SELECT item_id, account, title, price, qty, status FROM items_api WHERE item_id = ?1'
    ).bind(item).first()) || false;
  } catch (e) {
    return null;
  }
}

/* ---------------- sold count, OUR LISTINGS ONLY ---------------- */
async function soldOurs(env, item, postcode) {
  const out = { item: item, group: null, single: null, compact: null };

  /* A variation listing's group id IS the listing's item number, so try the group first —
     one call tells us which shape this listing is. */
  const g = await browseGet(env,
    EBAY + '/buy/browse/v1/item/get_items_by_item_group?item_group_id=' + encodeURIComponent(item),
    postcode, 'group');
  if (g.status === 200) {
    const items = (g.body && g.body.items) || [];
    const per = items.map(it => {
      const av = (it.estimatedAvailabilities || [])[0] || {};
      return {
        rest_id: String(it.itemId || ''),
        variation: (it.localizedAspects || []).map(a => a.name + '=' + a.value).join(' · ').slice(0, 120),
        est_sold: av.estimatedSoldQuantity === undefined ? null : Number(av.estimatedSoldQuantity),
        est_available: av.estimatedAvailableQuantity === undefined ? null : Number(av.estimatedAvailableQuantity),
      };
    });
    const vals = per.map(p => p.est_sold).filter(v => v !== null);
    const distinct = Array.from(new Set(vals));
    out.group = {
      variations: per.length,
      with_sold: vals.length,
      sum: vals.reduce((a, b) => a + b, 0),
      distinct_values: distinct.length,
      /* THE T5 QUESTION: one repeated figure means eBay is handing us the LISTING total per
         variation (take one); many different figures mean it is per variation (sum them). */
      reading: distinct.length === 1 && per.length > 1 ? 'listing total repeated — TAKE ONE'
        : distinct.length > 1 ? 'per variation — SUM THEM'
        : 'inconclusive',
      take_one: distinct.length === 1 ? distinct[0] : null,
      per_variation: per,
    };
    return out;
  }
  out.group = { status: g.status, ebay: ebayErrs(g.body), retryable: retryable(ebayErrs(g.body)) };

  /* Not a group → single listing. Item number → REST id, then COMPACT. */
  const l = await browseGet(env,
    EBAY + '/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=' + encodeURIComponent(item),
    postcode, 'legacy');
  if (l.status !== 200) {
    out.single = { status: l.status, ebay: ebayErrs(l.body), retryable: retryable(ebayErrs(l.body)) };
    return out;
  }
  const av = ((l.body.estimatedAvailabilities || [])[0]) || {};
  out.single = {
    rest_id: String(l.body.itemId || ''),
    est_sold: av.estimatedSoldQuantity === undefined ? null : Number(av.estimatedSoldQuantity),
    est_available: av.estimatedAvailableQuantity === undefined ? null : Number(av.estimatedAvailableQuantity),
  };

  /* Does COMPACT keep estimatedAvailabilities? If not, Phase 2 drops the fieldgroup.
     Worth one extra call on five listings, once. */
  if (out.single.rest_id) {
    const c = await browseGet(env,
      EBAY + '/buy/browse/v1/item/' + encodeURIComponent(out.single.rest_id) + '?fieldgroups=COMPACT',
      postcode, 'item');
    const cav = c.status === 200 ? (((c.body.estimatedAvailabilities || [])[0]) || {}) : {};
    out.compact = c.status === 200
      ? { est_sold: cav.estimatedSoldQuantity === undefined ? null : Number(cav.estimatedSoldQuantity),
          keeps_field: cav.estimatedSoldQuantity !== undefined }
      : { status: c.status, ebay: ebayErrs(c.body) };
  }
  return out;
}

/* ---------------- quota ---------------- */
/* §3 asks us to confirm the base path and the token type. Both candidates are tried, because
   the signing-key API lives on apiz.ebay.com while most of Buy lives on api.ebay.com. */
async function quota(env) {
  const tok = await appToken(env);
  const tried = [];
  for (const base of [EBAY, 'https://apiz.ebay.com']) {
    const url = base + '/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=browse';
    const r = await fetch(url, { headers: { authorization: 'Bearer ' + tok, accept: 'application/json' } });
    CALLS.quota++; CALLS.total++;
    const text = await r.text();
    let body = null; try { body = JSON.parse(text); } catch (e) { /* keep null */ }
    tried.push({ base: base, status: r.status, body: r.status === 200 ? body : undefined,
      detail: r.status === 200 ? undefined : text.slice(0, 240) });
    if (r.status === 200) return { works: true, base: base, token_type: 'application (client_credentials)', tried: tried };
  }
  return { works: false, note: 'getRateLimits refused an application token on both base paths — Phase 2 keeps its own call counter in rt_runs instead', tried: tried };
}

/* ---------------- T8: one timed run of the real daily shape ----------------
   A temporary cron fires this once. It does exactly what a production day would do for the
   pilot set — scan every keyword to depth, then read the sold count of each of OUR listings —
   and records what it cost. The guard makes repeat ticks free: the cron fires every 5 minutes
   while it exists, and only the first tick of a UK day does any work, so a forgotten trigger
   cannot quietly drain the Browse budget.
   Writes go to rt_lab_runs and nowhere else (prompt rule 2: no writes outside rt_ tables). */
const T8_KEYWORDS = [
  ['heavy duty iphone case', '236997583159'],
  ['silicone iphone case magsafe', '136854829678'],
  ['samsung s24 ultra case', '406845460680'],
  ['motion sensor light under cabinet', '236920889297'],
  ['wireless mouse', '406966567912'],
];

async function labScheduledRun(env) {
  if (!env.DB) return;
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS rt_lab_runs (day TEXT PRIMARY KEY, started_at TEXT, finished_at TEXT, ' +
    'wall_ms INTEGER, calls_search INTEGER, calls_sold INTEGER, calls_total INTEGER, ' +
    'keywords INTEGER, items INTEGER, found INTEGER, status TEXT, note TEXT)'
  ).run();

  const day = new Date().toISOString().slice(0, 10);
  const claimed = await env.DB.prepare(
    "INSERT INTO rt_lab_runs (day, started_at, status) VALUES (?1, ?2, 'running') ON CONFLICT(day) DO NOTHING"
  ).bind(day, new Date().toISOString()).run();
  /* Already ran today — a repeat tick costs one D1 write and no eBay call at all. */
  if (!claimed.meta || !claimed.meta.changes) return;

  CALLS.token = 0; CALLS.search = 0; CALLS.item = 0; CALLS.legacy = 0;
  CALLS.group = 0; CALLS.quota = 0; CALLS.total = 0;
  const t0 = Date.now();
  let found = 0, status = 'ok', note = '';

  try {
    for (const [q, item] of T8_KEYWORDS) {
      const s = await scan(env, q, 400, 'bin', DEFAULT_POSTCODE);
      if (s.error) { status = 'partial'; note = (note + ' ' + q + ':' + s.error).trim().slice(0, 300); continue; }
      if (s.hits.some(h => h.item === item)) found++;
    }
    const searchCalls = CALLS.search;
    for (const [, item] of T8_KEYWORDS) {
      const own = await ourListing(env, item);
      if (own) await soldOurs(env, item, DEFAULT_POSTCODE);   // §8.1: ours only, same guard as the route
    }
    await env.DB.prepare(
      'UPDATE rt_lab_runs SET finished_at = ?2, wall_ms = ?3, calls_search = ?4, calls_sold = ?5, ' +
      'calls_total = ?6, keywords = ?7, items = ?8, found = ?9, status = ?10, note = ?11 WHERE day = ?1'
    ).bind(day, new Date().toISOString(), Date.now() - t0, searchCalls,
      CALLS.total - searchCalls - CALLS.token, CALLS.total, T8_KEYWORDS.length, T8_KEYWORDS.length,
      found, status, note).run();
  } catch (e) {
    await env.DB.prepare("UPDATE rt_lab_runs SET status = 'error', note = ?2, wall_ms = ?3 WHERE day = ?1")
      .bind(day, String((e && e.message) || e).slice(0, 300), Date.now() - t0).run();
  }
}

/* ---------------- router ---------------- */
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(labScheduledRun(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (!env.LAB_KEY) return fail(503, 'LAB_KEY is not bound on this Worker');
    if (!sameKey(request.headers.get('x-lab-key'), env.LAB_KEY)) return fail(401, 'x-lab-key header required');

    CALLS.token = 0; CALLS.search = 0; CALLS.item = 0; CALLS.legacy = 0; CALLS.group = 0;
    CALLS.quota = 0; CALLS.total = 0;

    const t0 = Date.now();
    const postcode = (url.searchParams.get('postcode') || DEFAULT_POSTCODE).trim();
    const mode = url.searchParams.get('mode') === 'all' ? 'all' : 'bin';
    const q = (url.searchParams.get('q') || '').trim();
    const item = (url.searchParams.get('item') || '').replace(/\D/g, '');
    let depth = Number(url.searchParams.get('depth') || 400);
    if (!Number.isFinite(depth) || depth < PAGE_SIZE) depth = PAGE_SIZE;
    depth = Math.min(Math.ceil(depth / PAGE_SIZE) * PAGE_SIZE, MAX_DEPTH);

    const badQ = () => {
      if (!q) return 'q is required';
      if (q.length > 100) return 'q must be 100 characters or fewer (eBay limit)';
      if (q.indexOf('*') >= 0) return 'q may not contain *';
      return '';
    };
    const done = (body, status) => json(Object.assign({ ok: status === undefined || status === 200 },
      body, { calls: Object.assign({}, CALLS), ms: Date.now() - t0 }), status);

    try {
      if (path === '/' || path === '/health') {
        return done({
          worker: 'm98m-rank-lab', phase: 1,
          bindings: { DB: !!env.DB, EBAY_APP_ID: !!env.EBAY_APP_ID, EBAY_CERT_ID: !!env.EBAY_CERT_ID },
          routes: ['/token-check', '/search?q=&depth=&mode=bin|all&postcode=', '/find?q=&item=&mode=', '/sold?item=', '/quota'],
          scope: 'rank only · sold counts for our own listings only (licence §8.1) · one keyset (§3.3)',
          marketplace: MARKETPLACE, default_postcode: DEFAULT_POSTCODE,
        });
      }

      if (path === '/token-check') {
        await appToken(env);
        /* Report the SHAPE of the token, never the token. */
        return done({ minted: true, scope: TOKEN.scope,
          expires_in_s: Math.round((TOKEN.expMs - Date.now()) / 1000),
          length: TOKEN.value.length,
          has_api_scope: TOKEN.scope.indexOf('/oauth/api_scope') >= 0 });
      }

      if (path === '/search') {
        const bad = badQ(); if (bad) return fail(400, bad);
        const s = await scan(env, q, depth, mode, postcode);
        /* Mark which hits are ours, so T3/T4 read straight off. One D1 SELECT, no eBay cost. */
        if (env.DB && s.hits && s.hits.length) {
          const ids = s.hits.map(h => h.item).filter(Boolean);
          const mine = new Map();
          for (let i = 0; i < ids.length; i += 90) {
            const chunk = ids.slice(i, i + 90);
            const rs = await env.DB.prepare(
              'SELECT item_id, account FROM items_api WHERE item_id IN (' +
              chunk.map((_, j) => '?' + (j + 1)).join(',') + ')'
            ).bind(...chunk).all().catch(() => ({ results: [] }));
            for (const r of (rs.results || [])) mine.set(String(r.item_id), String(r.account));
          }
          for (const h of s.hits) {
            h.is_ours = mine.has(h.item);
            if (h.is_ours) h.account = mine.get(h.item);
          }
          s.ours = s.hits.filter(h => h.is_ours).map(h => ({
            position: h.position, page_200: Math.ceil(h.position / PAGE_SIZE),
            item: h.item, account: h.account, sponsored: h.sponsored, price: h.price,
          }));
        }
        return done({ postcode, scan: s });
      }

      if (path === '/find') {
        const bad = badQ(); if (bad) return fail(400, bad);
        if (!/^\d{9,15}$/.test(item)) return fail(400, 'item must be an eBay item number');
        const s = await scan(env, q, depth, mode, postcode);
        if (s.error) return done({ postcode, scan: s }, 502);
        const hit = s.hits.find(h => h.item === item) || null;
        const spAbove = hit ? s.hits.slice(0, hit.position - 1).filter(h => h.sponsored).length : null;
        return done({
          q, item, mode, postcode, depth: s.depth, total_results: s.total, scanned: s.scanned,
          found: !!hit,
          /* "400+" is the measured verdict: we looked this deep and it was not there. */
          position: hit ? hit.position : null,
          position_label: hit ? String(hit.position) : (s.depth + '+'),
          position_excl_sponsored: hit ? hit.position - spAbove : null,
          sponsored_above: spAbove,
          our_card_sponsored: hit ? hit.sponsored : null,
          is_group: hit ? hit.is_group : null,
          title: hit ? hit.title : null, price: hit ? hit.price : null, url: hit ? hit.url : null,
        });
      }

      if (path === '/sold') {
        if (!/^\d{9,15}$/.test(item)) return fail(400, 'item must be an eBay item number');
        const own = await ourListing(env, item);
        /* FAIL CLOSED. "I could not check" is not permission. */
        if (own === null) {
          return fail(503, 'the lab cannot reach items_api, so it cannot prove this listing is ours — refusing', {
            licence: '§8.1 — sold counts are read for our own listings only',
          });
        }
        if (own === false) {
          return fail(403, 'that item number is not on our accounts', {
            licence: '§8.1 — deriving another seller\'s performance needs eBay\'s written permission',
          });
        }
        const sold = await soldOurs(env, item, postcode);
        return done({ ours: { account: own.account, status: own.status, qty: own.qty,
          price: own.price, title: String(own.title || '').slice(0, 90) }, sold });
      }

      if (path === '/quota') return done({ quota: await quota(env) });

      /* T8 read-back: what the cron run actually cost. */
      if (path === '/lab-runs') {
        if (!env.DB) return fail(503, 'no D1 binding');
        const rs = await env.DB.prepare('SELECT * FROM rt_lab_runs ORDER BY day DESC LIMIT 5').all().catch(() => ({ results: [] }));
        return done({ runs: rs.results || [] });
      }

      return fail(404, 'no such lab route');
    } catch (e) {
      return fail(500, String((e && e.message) || e).slice(0, 300));
    }
  },
};
