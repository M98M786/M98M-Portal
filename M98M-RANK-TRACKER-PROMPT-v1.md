> # ⚠️ SCOPE CHANGE — owner's ruling, 13 Oct 2026, AFTER this prompt was written
>
> The eBay API Licence Agreement **§8.1 "Prohibited Use and Derivation of Information"** needs
> eBay's written permission for anything that derives seller performance, individually or in
> aggregate — our own data is exempt. And **§3.3**: circumventing call limits risks suspension,
> and these keys run the live portal.
>
> **What this prompt says, overruled:**
> 1. **One keyset only** — the global `ZAREENLT` app (the Engine's `EBAY_APP_ID` / `EBAY_CERT_ID`).
>    Never pool the five per-account keysets. Outgrow 5,000 calls/day → apply for higher limits
>    on that one keyset.
> 2. **Everything competitor-sales is PARKED** "awaiting eBay permission": `rt_snapshots`,
>    `rt_sales_daily`, `rt_bsr_daily`, sold-count snapshots, units 7d, units/day, est. revenue 7d,
>    **the whole Keyword BSR idea and its tab** (§1.2, §2A, §2B steps 6–7, §2E BSR tab), the
>    competitor-surge alert (§2B step 8 bullet 4), `RT_STICKY_DAYS`, the §2C sold-estimate
>    calibration, and the units-7d / BSR-rank / est-revenue Number Register entries (§2C).
> 3. **Competitor rows hold item number · position · title · price as of the scan, and nothing
>    else.** No seller usernames anywhere. Scan time shown on the page. `rt_scan_hits` retention
>    **30 days**, not the 90 in §2B.9.
> 4. **T5 (§1D) runs on our own 5 listings only.** Pass = **4 of 5**, not 7 of 8.
> 5. §3 "Sold count = the BSR input" and §1.2 "Keyword BSR (estimated)" are **reference only**
>    until eBay writes back.
>
> What still gets built in full: keyword rank, page, change vs yesterday / 7 days, 30-day
> sparkline, our share of page 1, the three rank alerts, the rank re-check, Rank / Alerts /
> Manage tabs, item view, CSV export, health.
>
> Working notes and the full ruling: `RANK-TRACKER-NOTES.md`.

# M98M Rank Tracker — Claude Code prompt (v1, 13 Oct 2026)

**For Hasib:** save this file in the Engine repo root, then tell Claude Code:
*"Read M98M-RANK-TRACKER-PROMPT-v1.md fully, then start Phase 1. Stop at the Phase 1 gate."*
Fill the test-set table in step 1C first, or let Claude Code propose one.

---

**For Claude Code:** read the whole file before doing anything. Work strictly phase by phase. At every **STOP** gate, write the report and wait for Hasib to reply with the exact words `GO PHASE 2` or `GO PHASE 3`. Never skip a gate. Never flip anything live — Hasib does that himself. Reports: short, plain English, numbers first (Hasib often reads them on his phone).

## 1. What we're building and why

Amazon shows every product's Best Sellers Rank. eBay shows nothing similar, so we build our own, on Cloudflare, from the eBay Browse API. For each keyword and each of our listings:

1. **Keyword rank** — when a UK buyer searches the keyword on eBay.co.uk with the default sort (Best Match), where does our listing appear?
   - Position = 1-based place among distinct listings, in the order eBay returns them.
   - Page = ceil(position ÷ page size).
   - "400+" = searched 400 deep and not found.
2. **Keyword BSR (estimated)** — among the top listings for that keyword, who is actually selling? Built from the daily change in each listing's estimated sold count (the "X sold" figure), ranked by units sold in the last 7 days. Always labelled as an estimate.

Context:
- M98M LTD sells on several eBay UK seller accounts — use the account list the Engine already has. "Our listings" = every active listing on those accounts, with its account.
- Most sales are iPhone cases, mostly multi-variation listings (one listing, many phone models). The same product is often listed on several of our accounts with different titles (A/B tests), so one keyword can return several of our listings — record every one.
- The portal backend ("Engine") is a Cloudflare Worker + D1 + KV with scheduled sync jobs; the portal is live at portal.m98mltd.co.uk. Find the repos and their docs locally before planning.
- Existing house rules apply here too:
  - the logic freeze (no changes to existing data logic);
  - the shadow → soak → flip deploy discipline (`M98M-WRITE-PATH-DEPLOY-v1.md` if present);
  - the Number Register / `NUMBER-CONTRACT.md` (every number has a source, formula, freshness rule and a verification check);
  - missing values show as an em dash (NO DATA), never as 0.

## 2. Hard rules — every phase

1. **Read-only toward eBay.** Allowed calls only: the OAuth token endpoint (client-credentials grant); Browse `search`, `getItem`, `getItemByLegacyId`, `getItemsByItemGroup`; Developer Analytics `getRateLimits`. No Sell APIs, no user tokens, nothing that changes a listing, price, ad, order or account.
2. **Don't touch what already works.** No edits to existing Engine logic, D1 tables, sync jobs, cron schedules, routes or pages. Everything new is additive: `rt_` tables, a new Worker, new routes, a new page behind a flag that defaults OFF. SELECT-only queries against production D1 are fine; no writes outside `rt_` tables.
3. **Secrets.** Never print, log, commit or echo the eBay client ID/secret or any token.
   - If the keyset already sits in a local, gitignored `.dev.vars`, you may pipe the values into `wrangler secret put` without printing them.
   - Otherwise ask Hasib to run `wrangler secret put …` himself in his terminal (values are on developer.ebay.com → Application Keys → Production). Never ask him to paste a secret into chat.
4. **Protect the shared quota.** The Browse quota belongs to the whole eBay app keyset; anything else on these keys shares it. No tight retry loops; exponential backoff on 429/5xx; stop the run when the budget guard trips.
5. **API only.** No scraping of eBay web pages, no headless browsers against eBay.
6. **Gated endpoints are off-limits:** Browse `getItems` (Limited Release), Marketplace Insights, Buy Marketing "Best Selling". We don't have access.
7. **Git:** branch `feature/rank-tracker`, small commits with clear messages, never force-push `main`.
8. **Notes:** update `RANK-TRACKER-NOTES.md` after every step (done / next / open questions) so a fresh session can resume.
9. If this file conflicts with what you find in the repo (names, folders, conventions), follow the repo and say so in your report.
10. Ask before anything irreversible: deleting data or Workers, DNS or route changes, rotating keys, deploying to the production Engine.

## 3. eBay facts (checked against eBay's docs, Oct 2026 — re-verify anything that errors)

### Application token
- `POST https://api.ebay.com/identity/v1/oauth2/token`
- Headers: `Content-Type: application/x-www-form-urlencoded` and `Authorization: Basic <base64(client_id:client_secret)>`
- Body: `grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope`
- Valid 7,200 s. Keep it in memory and reuse it until it expires — never mint per call.
- Client-credentials minting is capped at 1,000 per day per app, shared with anything else on these keys.
- Never store tokens in D1, KV or logs.

### Search = the rank
- `GET https://api.ebay.com/buy/browse/v1/item_summary/search?q=<keyword>&limit=200&offset=0`
- No `sort` parameter → Best Match, the buyer default.
- Paging and query limits:
  - `limit` max 200;
  - `offset` must be 0 or a multiple of `limit`;
  - at most 10,000 results (`offset` < 10,000);
  - `q` ≤ 100 characters, no `*`.
- Headers:
  - `X-EBAY-C-MARKETPLACE-ID: EBAY_GB` — **if missing, eBay silently uses `EBAY_US`.**
  - `X-EBAY-C-ENDUSERCTX: contextualLocation=country%3DGB%2Czip%3DSW1A%201AA` — the whole value URL-encoded, postcode from config. Makes delivery estimates match a UK buyer.
  - `Accept-Language: en-GB`
- Only Buy It Now listings come back by default. `filter=buyingOptions:{FIXED_PRICE|AUCTION}` adds auctions (eBay.co.uk's default "All" view shows both). Phase 1 tests which mode matches the site.
- Keep per result: `itemId`, `legacyItemId`, `title`, `price`, `seller`, `itemGroupHref` / `itemGroupType` (variation listing), `itemWebUrl`, and `priorityListing` if present. Keep the top-level `total`.
- Identify listings by `legacyItemId` (the eBay item number), never by seller username — eBay is replacing usernames with immutable IDs for some developers.

### Sold count = the BSR input
- **Single listing:** `GET /buy/browse/v1/item/{itemId}?fieldgroups=COMPACT` → `estimatedAvailabilities[].estimatedSoldQuantity`.
  - COMPACT keeps the payload small and includes `estimatedAvailabilities`.
  - If `estimatedSoldQuantity` is missing under COMPACT, drop COMPACT.
- **Variation listing** (search result has `itemGroupHref`): call that href, i.e. `/buy/browse/v1/item/get_items_by_item_group?item_group_id=…`. The group id is the listing's item number.
  - It returns one entry per variation, each with `estimatedAvailabilities`.
  - Phase 1 decides whether `estimatedSoldQuantity` is per variation (sum them) or the listing total repeated (take one).
- **Item number → REST id:** `GET /buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=<item number>`.
- **Errors 11004 / 11008** = listing or group temporarily unavailable (seller revising) → retry later in the run.

### Quotas (defaults)
- **Browse:** 5,000 calls/day for all methods except getItems — app-level, shared.
- **OAuth client-credentials:** 1,000 tokens/day.
- **Analytics `traffic_report`:** 100 calls/day. Add **no** traffic_report calls; if impressions are wanted later, read what the Engine already syncs into D1.
- **Live usage:** Developer Analytics `getRateLimits` filtered with `api_context=buy&api_name=browse` returns quota, used, remaining, reset and window.
  - Confirm its base path and token type in Phase 1.
  - If it won't work with an app token, keep a call counter in D1 instead.
- Higher limits come through eBay's Application Growth Check — flag it in a report if we'll need it; don't apply.

### Docs
- [Browse API](https://developer.ebay.com/develop/api/buy/browse_api)
- [Browse guide / headers](https://developer.ebay.com/api-docs/buy/static/api-browse.html)
- [OAuth](https://developer.ebay.com/develop/guides/sell/authorization)
- [Call limits](https://developer.ebay.com/develop/get-started/api-call-limits)
- [Developer Analytics](https://developer.ebay.com/develop/api/sell/developer_analytics_api)

## 4. PHASE 1 — Lab test on Cloudflare, then STOP

Goal: prove Cloudflare → eBay Browse works with our keys, and measure how close the API rank is to what a UK buyer actually sees — without touching the live Engine.

### 1A. Recon (read-only)
Summarise in the report:
- Engine repo(s), Worker names, `wrangler` config, D1/KV bindings, migrations, cron setup, how jobs are scheduled.
- How the Engine holds the eBay keyset (`wrangler secret list` names) and whether it already mints an application token anywhere (reuse that code).
- Anything that already calls the Browse API on these keys, since it shares the 5,000/day.
- Where the Engine keeps our active listings per account (item numbers). The tracker matches against this.
- Whether the Engine stores approved CPC / main keywords per listing (Keyword approvals, Potential CPC). This is a possible keyword source later.
- Current Cloudflare Workers limits for Hasib's plan — CPU time, subrequests per invocation, cron duration, Queues availability. Take these from Cloudflare's docs, not memory.
- Deploy/flag conventions and the Number Register format.

### 1B. Lab Worker
- Create a separate Worker `m98m-rank-lab` on workers.dev only, with no routes on m98mltd.co.uk.
  - If the Engine already has a staging/preview environment with the keyset bound, you may use that instead.
  - Never use the production Engine.
- Secrets:
  - Bind the keyset under the same secret names the Engine uses (see rule 3).
  - Generate a `LAB_KEY`, keep it in `.dev.vars`, and set it as a secret.
  - Every route requires header `x-lab-key`.
- Read-only JSON routes: `/token-check`, `/search?q=&depth=&mode=bin|all&postcode=`, `/find?q=&item=&mode=`, `/sold?item=`, `/quota`.
- Reuse the Engine's eBay helper code where it fits.

### 1C. Test set
Hasib fills this in. If it's still empty when you get here:
1. Propose 5 listings from D1 — top sellers in the last 30 days across accounts, including at least 2 multi-variation iPhone case listings.
2. Suggest a main keyword for each from its title.
3. Wait for Hasib to confirm.

_CONFIRMED by Hasib, 13 Oct 2026._

| # | Account | Item number | Main keyword | Variation listing? |
|---|---|---|---|---|
| 1 | Sir Hasib | 236997583159 | heavy duty iphone case | yes (qty 5,457) |
| 2 | Saif Bhai | 136854829678 | silicone iphone case magsafe | yes (qty 3,702) |
| 3 | Azhar Bhai | 406845460680 | samsung s24 ultra case | yes (qty 2,468) |
| 4 | Sir Hasib | 236920889297 | motion sensor light under cabinet | no (qty 557) |
| 5 | Azhar Bhai | 406966567912 | wireless mouse | no (qty 74) |

API buyer postcode: `SW1A 1AA` unless Hasib gives another UK postcode.

### 1D. Tests

| ID | Test | Pass when |
|---|---|---|
| T1 | Mint an app token in the lab Worker; run one Browse search | Token minted with `api_scope`; search returns 200 |
| T2 | UK marketplace | Every result priced in GBP, with an ebay.co.uk URL |
| T3 | Rank each test item, depth 400, both modes (BIN only / all) | Position or "400+" for every item in both modes |
| T4 | Variation listings in search | How they appear is documented; dedupe by `legacyItemId` gives one position per listing |
| T5 | Sold count: the 5 test listings + 3 competitors | API figure matches the "X sold" on the listing page (Hasib reads it) for ≥ 7 of 8; rule for variation listings documented |
| T6 | Stability: 3 scans per keyword, 15 min apart | Position spread per keyword reported |
| T7 | Quota | `getRateLimits` works (or a D1 counter is in place); calls per keyword scan measured; daily capacity estimated |
| T8 | Cloudflare runtime | A temporary cron on the lab runs 5 keyword scans + their sold lookups well inside the plan limits; CPU and wall time recorded; temporary cron removed afterwards |
| T9 | Manual match with Hasib | API position within ±3 of what Hasib sees for ≥ 4 of 5 keywords — or a clear explanation and a fix |

**T9 protocol.** Write these steps out for Hasib in the report, with a fill-in table:
1. Use a private/incognito window, logged out, on eBay.co.uk.
2. Set eBay's delivery location ("Deliver to" / "Postage to") to the same UK postcode the API uses. If he is outside the UK, eBay otherwise ranks for delivery to his country and the test means nothing. A UK VPN also works.
3. Open the link you give for each keyword (`https://www.ebay.co.uk/sch/i.html?_nkw=<keyword>`). Keep Best Match and apply no filters.
4. Record:
   - our listing's position, counting every card from the top;
   - whether our card shows "Sponsored";
   - how many Sponsored cards sit above it;
   - how many results the page shows by default.
5. You then compare his numbers with the API using both counting methods (all cards / non-sponsored only) and both modes, and pick the combination that matches best.

### 1E. Report → `RANK-LAB-REPORT.md`
- Line 1: verdict — **GO / GO WITH CHANGES / NO-GO**.
- T1–T9 results, with numbers.
- Recommended settings: mode, counting method, depth, postcode, scans per day, competitors per keyword (K), page size.
- Quota plan: calls/day at 25 / 50 / 100 keywords with K = 20, as a % of the Browse quota left after other users of the keyset.
- Architecture for Phase 2 (default in §5), and anything from recon that changes it.
- Risks and questions for Hasib, in one list.

**STOP — wait for `GO PHASE 2`.**

## 5. PHASE 2 — Build the full system in shadow, then STOP

Default architecture (change it only with a reason given in the Phase 1 report):
- **Collector Worker `m98m-rank-tracker`**, grown from the lab. It owns all eBay calls and its own cron, and writes only `rt_` tables. Retire the lab Worker once the collector replaces it (ask first).
- **Storage:** the Engine's D1 database, bound to both Workers. One new migration that only creates `rt_` tables.
- **Engine:** gains read-only endpoints for the page.
  - Use the Engine's existing API style (routes or actions); the operations needed are listed in 2D.
  - The portal page lives behind flag `rank_tracker_enabled` (default OFF).
  - Deploy in a quiet window per the deploy doc.

### 2A. Tables (`rt_` prefix; adapt to repo conventions)

| Table | Columns / purpose |
|---|---|
| `rt_config` | Every tunable, editable without a redeploy — defaults below |
| `rt_keywords` | id, keyword, group (e.g. MagSafe / leather / silicone), active, created_by, created_at |
| `rt_watch` | keyword_id, item_number, account — listings Hasib pairs with a keyword |
| `rt_scans` | id, keyword_id, scanned_at, mode, postcode, depth, total_results, calls, status |
| `rt_scan_hits` | scan_id, position, item_number, is_ours, account, seller, price, title, is_variation, priority_listing — store the first page, all our listings and the keyword's competitor set, not all 400 |
| `rt_rank_daily` | date, keyword_id, item_number, account, position, page, depth — NULL position = not found within depth, shown as "400+" |
| `rt_snapshots` | date, item_number, est_sold_total, price, title, seller, is_variation, status, fetched_at |
| `rt_sales_daily` | date, item_number, units, flag (ok / first / gap / reset / ended) |
| `rt_bsr_daily` | date, keyword_id, item_number, units_7d, bsr_rank, search_position, est_revenue_7d, warming_up |
| `rt_alerts` | id, created_at, type, keyword_id, item_number, detail, acked_by, acked_at |
| `rt_runs` | id, date, started_at, finished_at, calls_search, calls_item, errors, quota_before, quota_after, status, notes |

`rt_config` defaults (Phase 1 findings override them):

| Key | Default |
|---|---|
| `RT_POSTCODE` | `SW1A 1AA` |
| `RT_MODE` | from T3/T9 |
| `RT_COUNTING` | from T9 |
| `RT_DEPTH` | 400 |
| `RT_PAGE_SIZE` | from T9 |
| `RT_K` | 20 |
| `RT_STICKY_DAYS` | 14 |
| `RT_SCANS_PER_DAY` | 1 |
| `RT_MAX_QUOTA_SHARE` | 0.6 |
| `RT_MIN_REMAINING` | 0.2 |
| `RT_ALERT_DROP` | 10 |

### 2B. Daily pipeline
1. **Day plan.** Once per Europe/London date, after 06:00 UK time, build the day's job list:
   - one job per active keyword;
   - then one job per listing in the union of competitor sets, deduped across keywords.
2. **Batching.** A frequent cron tick — or Cloudflare Queues, per Phase 1 — drains jobs in small batches so no invocation gets near the plan limits. Jobs are idempotent and resumable.
3. **Budget guard** before every batch. This tool uses at most `RT_MAX_QUOTA_SHARE` of the day's Browse quota, and stops when remaining quota drops below `RT_MIN_REMAINING`. Log what was skipped.
4. **Keyword scan.**
   - Search to `RT_DEPTH` and dedupe by item number in API order.
   - Compute position and page.
   - Match against all our active listings (all accounts, from the Engine's data).
   - Take the competitor set = the top `RT_K` listings that aren't ours.
5. **Sticky competitors.** A listing that entered a keyword's top K keeps being snapshotted for `RT_STICKY_DAYS` after it drops out, so its 7-day sales stay continuous.
6. **Snapshots.** One sold-count read per listing per day, all inside the same morning window, so deltas are ~24 h apart.
7. **Sales and BSR.**
   - Daily units = today's count − the previous snapshot.
   - Negative → 0, flag `reset`.
   - Missing days → spread the change across the gap, flag `gap`.
   - First snapshot → no units, flag `first`.
   - Units 7d = sum of the last 7 days; units/day = units 7d ÷ 7.
   - Keyword BSR = order by units 7d descending, ties broken by search position.
   - `warming_up` until a listing has ≥ 5 of the last 7 daily deltas.
   - Est. revenue 7d = units 7d × current price (for variation listings, the price shown in search).
8. **Alerts** fire when:
   - our listing drops ≥ `RT_ALERT_DROP` places day-on-day;
   - it leaves page 1;
   - it goes "400+";
   - a competitor enters the keyword's BSR top 10 with units 7d ≥ 2× its previous week.

   Use the portal's Alerts centre if it has a standard alert table; otherwise use `rt_alerts`.
9. **Retention:** `rt_scan_hits` 90 days; daily tables kept.

### 2C. Truth checks (Number Register)
Register each new number with its source, formula, freshness and checks:
- rank position
- page
- units 7d (est.)
- keyword BSR rank
- est. revenue 7d
- our share of page 1 (our distinct listings within the first `RT_PAGE_SIZE` positions)

Checks:
- **Rank re-check:** re-scan a random 5% of keywords 30–60 min after the main scan. Flag disagreement beyond the tolerance found in T6.
- **Sold-estimate calibration:** for our own listings, compare units 7d (API estimate) with our real 7-day orders from the Engine's order data. Flag a listing that's off by more than 20%. This is how we prove the competitor numbers can be trusted.
- **Freshness:** the page shows "checked 06:xx UK"; data older than 26 h shows as stale.

### 2D. Engine endpoints
All read-only and role-gated like the other Advertising pages:
- overview (Rank tab data)
- item detail by item number
- keyword BSR by keyword
- alerts
- health (last run, freshness, quota used)
- CSV export (rank or BSR, date range)

Keyword and watch management (add/edit/remove) is for Management and Advertising roles only, and follows the D1-primary write-path rules.

### 2E. Portal page "Keyword rank" (Advertising section, flag OFF)
Add it the same way other sidebar pages are built in the front-end repo.
- **Rank tab:** one row per keyword × our listing, with filters for account, group and keyword. Columns:
  - account and item;
  - today's position and page;
  - change vs yesterday and vs 7 days ago;
  - 30-day sparkline (lower is better);
  - our share of page 1 for that keyword.
- **BSR tab:** pick a keyword → its top listings by units 7d (est.).
  - Columns: BSR rank, seller, title, price, units 7d, units/day, search position, trend.
  - Our listings are highlighted in gold with the account name.
  - Shows "warming up (n/5)" until ready.
- **Alerts tab.**
- **Manage tab:** add/remove keywords and groups, pair listings with keywords, CSV import, view `rt_config`, last runs and quota use.
- **Item view** (click a row): that listing's rank on every tracked keyword over 30/90 days, and its BSR position per keyword.
- **Design:** the existing galaxy-edition theme tokens — black, white and gold only, no blue anywhere, bold headings. "400+" = measured and not found; "—" = no data; never show 0 for missing data.

### 2F. Deliverables, then STOP
- Collector deployed, with its cron running on the pilot keywords only.
- Migration applied.
- Engine endpoints and page deployed behind the OFF flag in a quiet window, with a preview link for Hasib.
- Pilot set seeded: up to 10 keywords Hasib picks at the gate.
- `RANK-TRACKER-README.md` covering how it works, tunables, adding keywords, and rollback (flag OFF → stop the collector's cron → drop `rt_` tables; nothing else is affected).
- Number Register / `NUMBER-CONTRACT.md` updated.

**STOP — wait for `GO PHASE 3`.**

## 6. PHASE 3 — Try the whole system (7-day trial), then STOP

- Run daily on the pilot keywords; the page stays in preview.
- Each day, append to `RANK-TRIAL-LOG.md`:
  - run status, calls used and errors;
  - alerts fired and truth-check results;
  - 3 spot-check links for Hasib (keyword, our listing, API position) to compare by hand.
- On day 7, write `RANK-TRIAL-REPORT.md` covering:
  - rank accuracy against Hasib's spot checks, and stability;
  - sold-estimate calibration against our real orders;
  - whether BSR is out of warm-up;
  - quota used per day;
  - failures and fixes;
  - how many keywords fit the quota at full scale;
  - go / no-go.
- Hasib flips `rank_tracker_enabled` himself and chooses which roles see the page. Then add keywords in steps, watching quota.

**STOP — end of this prompt.**

## 7. Start
1. Read this file, the repo docs named above, and `RANK-TRACKER-NOTES.md` if it exists.
2. Create the branch and the notes file.
3. Begin step 1A. When you reach 1B/1C, ask Hasib for anything you need (secrets, test set) in one message.
