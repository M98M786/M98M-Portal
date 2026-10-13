# RANK-TRACKER-NOTES

Working notes for the M98M Rank Tracker (prompt: `M98M-RANK-TRACKER-PROMPT-v1.md`, v1, 13 Oct 2026).
Branch `feature/rank-tracker`. Updated after every step so a fresh session can resume.

---

# ⚠️ SCOPE CHANGE — owner's ruling, 13 Oct 2026. READ THIS BEFORE BUILDING ANYTHING.

The eBay API Licence Agreement **§8.1 "Prohibited Use and Derivation of Information"** needs
eBay's **written permission** for anything that derives seller performance, individually or in
aggregate. **Our own data is exempt.** And **§3.3**: attempts to circumvent call limits can get
API access suspended — and these keys run the live portal.

So the tool that gets built is a **keyword rank tracker, not a BSR tool.**

### One keyset only
Browse calls use **one keyset: the global `ZAREENLT` application** — the keyset already bound to
`m98m-engine` as `EBAY_APP_ID` / `EBAY_CERT_ID`, used for every account's consent links
(`engine/README-DEPLOY.md:52`, `worker.js:17674`). The five per-account keysets are **not pooled.**
If 5,000 calls/day is not enough we apply for higher limits on that one keyset
(eBay Application Growth Check) — we do not spread load.

### Parked until eBay gives written permission
Build none of this. It is designed, named here, and left out:

| Parked | Was |
|---|---|
| `rt_snapshots`, `rt_sales_daily`, `rt_bsr_daily` | §2A tables |
| sold-count snapshots of any listing | §2B step 6 |
| units 7d, units/day, est. revenue 7d | §2B step 7 |
| Keyword BSR rank + the whole **BSR tab** | §2B step 7, §2E |
| the competitor-surge alert ("enters BSR top 10 with units 7d ≥ 2× its previous week") | §2B step 8, 4th bullet |
| `RT_STICKY_DAYS` (only existed to keep sold deltas continuous) | `rt_config` |
| Number Register entries: units 7d, keyword BSR rank, est. revenue 7d | §2C |
| sold-estimate calibration vs our orders | §2C — nothing left to calibrate |

### What competitor rows may hold
**Item number · position · title · price, as of the scan only.** Nothing else.
- **No seller usernames** — not stored, not displayed, not even read out of the API response.
- The page shows the **scan time** against every competitor row.
- Retention **30 days** (the prompt said 90 for `rt_scan_hits` — 30 now).
- `priority_listing` (eBay's own Sponsored flag) **is** kept: the counting method settled in T9
  depends on it, and it is a property of the search result, not of a seller's performance.
  Flagged for the owner rather than assumed.

### Still built, in full
Keyword rank, page number, change vs yesterday / 7 days, the 30-day sparkline, our share of
page 1, the three rank alerts (drop ≥ `RT_ALERT_DROP`, left page 1, gone 400+), the rank
re-check truth check, the Rank / Alerts / Manage tabs, the item view, CSV export, health.

### Phase 1 test change
**T5 runs on our own 5 listings only — no competitor sold counts.** Pass = **4 of 5**
(was 7 of 8 across 5 ours + 3 competitors).

The lab Worker enforces this in code, not by convention: `/sold` refuses any item number that is
not in `items_api`, and fails closed if it cannot check. `/search` never reads `seller` from the
response at all.

---

## 13 Oct 2026 — 1A recon DONE · 1B lab code WRITTEN · deploy BLOCKED on keys

### Done
- Read the prompt in full. Created branch `feature/rank-tracker` off `main` @ `a121a54`.
- Phase 1A recon, read-only. Findings below.
- Owner's scope ruling recorded at the top of this file and of `M98M-RANK-TRACKER-PROMPT-v1.md`
  (copied into the repo root, as that prompt's own header asks).
- 1C test set **confirmed** by Hasib; filled into the prompt's §1C table.
- 1B lab Worker **written and syntax-checked**: `rank-lab/worker.js` + `metadata.json` +
  `deploy.sh` + `mint-lab-key.sh`. Not deployed — nothing has been sent to eBay yet.
- T9 links generated; Hasib can do his half in parallel (see the T9 section).

### Blocked on, and only on
1. **Cloudflare API token** with *Workers Scripts: Edit* at `~/.m98m/cf-token` (chmod 600) —
   or Hasib creates an empty `m98m-rank-lab` himself. `rank-lab/deploy.sh` expects the token path.
2. **The two eBay secrets on the lab Worker** — `EBAY_APP_ID`, `EBAY_CERT_ID` from the ZAREENLT
   production keyset, added by Hasib in the dashboard. I never see them.

`LAB_KEY` needs nobody: `mint-lab-key.sh` generates it into `~/.m98m/rank-lab-key` and
`deploy.sh` pipes it to the Worker as a secret without printing it.

### Then
1B deploy → 1D tests T1–T9 → 1E `RANK-LAB-REPORT.md` → **STOP for `GO PHASE 2`**.

---

## 1A recon findings

### The Engine
| Thing | Value |
|---|---|
| Worker | `m98m-engine` · `https://m98m-engine.m98m786.workers.dev/` |
| CF account | `22159c26d5386e3ac543be2bbed95e6d` |
| Plan | **Workers Paid** (15 cron expressions registered; Free caps at 5). `engine/README-DEPLOY.md` line 2 still says "free plan" — stale header, the code comments record the 24 Aug upgrade. |
| D1 | `m98m-engine` = `83a5bb0f-d2d8-4c25-93fe-477d6e6ae452`, binding `DB` |
| KV | `m98m-hot` = `86ae131b71684136b8860fd7bf86995d`, binding `HOT` |
| R2 | binding `BACKUPS` |
| Plain vars | `ALLOWED_ORIGIN`, `AS_URL`, `OFFICE_IP`, `TRACKING_LIVE`, `ADS_WRITE_LIVE`, `AUTOMSG_LIVE`, `CS_WRITE_LIVE` |
| Secrets | `SYNC_KEY`, `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_DEV_ID`, `EBAY_RU_NAME`, `TRACKING_KEY`, `ANTHROPIC_API_KEY` (read via `secret(env, name)` → plain `env[name]`) |
| Repo | `~/Documents/Claude Code/M98M-Portal` · `engine/worker.js` (17,822 lines, 1.4 MB, single module) |
| Second repo | none — frontend, Apps Script and engine all live in this one repo |

**No `wrangler` config anywhere in the repo, and no `wrangler` on this Mac.** Deploys are a
multipart `PUT` to the Cloudflare API with `metadata.json` carrying the bindings +
`keep_bindings`. Two working paths:
- `scripts/deploy-engine.sh` (untracked, written by another session) — needs an API token at
  `~/.m98m/cf-token`; its `keep_bindings` list now includes `plain_text`, which closes the
  OFFICE_IP drop trap.
- the signed-in `dash.cloudflare.com` pane — `XMLHttpRequest` multipart PUT (plain `fetch()`
  stalls behind the dash service worker).

So the prompt's `wrangler secret put` instructions (rule 3) do not map onto this repo. Repo wins
(rule 9): secrets go in via the dashboard UI or the API, never through chat.

### Migrations and schema convention
Two live conventions:
- `engine/migrations/NNN_name.sql` — only 6 files, last one 19 Aug. Effectively frozen.
- **`ensure…Schema(env)` functions inside `worker.js`** with `CREATE TABLE IF NOT EXISTS`
  arrays and a module-level `…_OK` latch, called at the top of every action that needs them.
  This is how all 80-odd `adtool_*` tables arrived. **This is the pattern `rt_` should follow** —
  it needs no migration run and no `wrangler d1 execute`.

No `rt_`-prefixed identifiers and no `rank*` tables/actions exist today. Prefix and page name are free.

### Cron
15 slots. Heavy families each get their own invocation so one slot cannot starve another.
Free for the taking: nothing on `*/10`, `45 * * * *`, or anything between `06:00` and `23:00` UK
on the daily slots. The tracker's own cron must not share an invocation with an engine job.

### Cloudflare limits (from the docs today, not memory) — Workers **Paid**
| Limit | Paid | (Free, for contrast) |
|---|---|---|
| CPU per HTTP request | 5 min max, 30 s default | 10 ms |
| CPU per cron invocation | **30 s** if interval < 1 h; 15 min if ≥ 1 h | 10 ms |
| Wall time, cron | 15 min | 15 min |
| Subrequests per invocation | 10,000 | 50 |
| Cron triggers per account | 250 | 5 |
| D1 queries per invocation | 1,000 | 50 |
| D1 max database size | 10 GB | 500 MB |
| Queues | available (retention up to 14 days) | available (24 h retention) |
| KV writes/day | unlimited | 1,000 |

Headroom is not the constraint — **eBay's 5,000 Browse calls/day is**. A `*/5` cron with a
30 s CPU ceiling and 10,000 subrequests can drain the whole day's eBay budget in one tick.
The budget guard, not the platform, is what paces this tool.

### eBay plumbing already in the Engine
- **Nothing anywhere calls the Browse API.** Grepped every repo for `buy/browse` and
  `item_summary/search`: zero hits. The Browse quota is untouched.
- **Client-credentials minting already works in production** — `ebaySigningKey()` (worker.js:2415)
  and `ebayTradeCall:taxonomyAspects` (worker.js:17732) both mint an app token with
  `scope=…/oauth/api_scope` off `EBAY_APP_ID`/`EBAY_CERT_ID` and use it. Reusable code, exactly as
  rule 1B asks. T1's token half is effectively pre-verified.
- **Per-account user tokens** (`ebayAccessToken`) are refresh-token based, cached in KV
  (`ebaytok:<account>`), used for Trading + Sell APIs. The tracker does **not** need these.
- **`ebayTradeCall`** (sync-key gated) is the existing read-only Trading escape hatch:
  GetItem · ReviseFixedPriceItem · GetSellerList · GetMyMessages · GetMemberMessages ·
  taxonomyAspects. Trading has its own quota — separate from Browse.
- **CRITICAL for the quota plan:** worker.js:2434 — *"every selling account has its OWN eBay
  application — five keysets, not one. Per-account `app_id`/`cert_id` live on the accounts row…
  the global `EBAY_*` secrets remain only as a fallback."* Browse quota is **per keyset**, so the
  real ceiling is 5,000 × (keysets we are allowed to use), not a flat 5,000. Owner's call — see
  the gate questions.

### Where our listings live
`items_api` — `item_id` is the eBay item number (the key the tracker matches on).
```
item_id, account, title, price, qty, status, image, sold_30d, api_synced_at,
start_time, first_seen, last_revised, sold_qty, primary_category
```
From today's 05:30 backup: **1,265 rows · 979 ACTIVE · 286 ENDED**, across 6 accounts
(Saif Bhai 189 · Amna Baji 175 · Azhar Bhai 173 · Sir Hasib 168 · AZHAR ABRT 139 ·
HAFIZA BHAJI 135). 238 of the 979 active titles mention a case/iPhone.
Mirror: `adtool_listings` (same key, plus category/margin/campaign facts).
Fed by `listingSync` on the `40 * * * *` slot.

**`items_api.qty` is the usable variation tell** — it is the sum over variations, so a
multi-variation phone case reads 1,100–5,500 while a single listing reads 16–560. `orders.variation`
is empty on every row, so orders cannot tell us. The search result's `itemGroupHref` stays the
authoritative test (prompt §3).

### Keyword sources already in the system
| Where | What it holds | Use for us |
|---|---|---|
| `keyword_tasks`, `keyword_docs` (D1) | the approval workflow + a Google **doc link**, not the keyword text | workflow only |
| `listing_research` (D1) — `item_id, kind, data_json`, columns configurable in `portal_config.listing_research_columns` | per-listing keyword/SEO research, every revision archived | **best D1 keyword source for Phase 2** |
| `CpcResearch.gs` (Apps Script/Sheets) | keyword blocks as newline text + sell-through + search-results counts, "Keywords link provided by Zain" | import candidate |
| `cpcKeywordCandidates` (sync action) | listings that *need* a keyword doc — no keyword text | not a source |

So keywords are **not** sitting in a clean per-listing column. Phase 2 seeds `rt_keywords` by
hand / CSV import (as §2E's Manage tab already assumes), and a `listing_research` import is a
later nicety, not a dependency.

### Our own sales, for the §2C calibration
`orders` (30,576 rows in today's backup; `created_at`, `item_id`, `qty`, `cancel_state`, `status`)
and `sales_daily`. 540 distinct items sold in the last 30 days, 8,238 units. Plenty to calibrate
the API's sold estimate against real orders.

### Portal conventions
- **Flags:** `portal_config` (`key`, `value`, `updated_at`), read by `adtFlag(env, key)`,
  value `'on'` / `'off'`, default `'off'`. So the prompt's `rank_tracker_enabled` is a
  `portal_config` row, not a Worker var. Server-side gate; the client shows a
  "switched off in Flags (…)" line.
- **Actions:** one object per action in a big map, `{ auth: 'any'|'mgmt'|'sync', fn }`. 41 actions
  are sync-key gated. An engine-served action must also be listed in `ENGINE_ACTIONS` in
  `index.html` or the client routes it to Apps Script instead.
- **Pages:** `frontend/view-*.js`, each `VIEWS.<key> = { label, icon, roles, order, prefetch, render, init }`.
  `scripts/build.py` splices them into `index.html` → `public/index.html` (GitHub Pages).
  Advertising roles: `['Advertising Manager', 'Management', 'Ops Head']`.
  Sidebar group (index.html:34156) `Advertising` keys: `tasksAds, adSignals, adsCentre, marketing,
  campaignWatch, traffic, liveSplit, wrongAds, advertising, cpc, potentialCpc, keywordApprovals`
  → the new page's key joins this list.
- **Theme tokens:** `--bg0 --bg1 --panel --panel-2 --text-2 --text-3 --gold-a --gold-b --gold-c
  --gold-ink --ok --bad`. In the galaxy edition the `--blue*` tokens are themselves re-pointed to
  gold (`#f2b035`), which is how "no blue anywhere" is already enforced — use the tokens, never a
  literal colour.
- **Gate before any commit:** `scripts/rl-scan.sh <dir>` must print `RL-SCAN CLEAN`.
- **Number Register:** two halves — `docs/NUMBER_REGISTER.md` (prose, v0 inventory) and D1
  `adtool_number_register` seeded from `ADTOOL_REGISTER*` consts in the worker, row shape
  `[metric_id, name, formula, source_tables, recompute, recheck]`, surfaced by the `adtoolRegister`
  action. The 6 new numbers get a `rt_number_register` seeded the same way.

### Docs the prompt names that do not exist here
- `M98M-WRITE-PATH-DEPLOY-v1.md` — **absent.** Repo equivalent: `engine/README-DEPLOY.md`
  (deploy loop, cron slots, the shadow/go-live switch table) + the per-feature pattern of
  "record the shadow would-do first, watch the screen for a day, then arm the flag".
- `NUMBER-CONTRACT.md` — **absent.** Repo equivalent: `docs/NUMBER_REGISTER.md` + the D1 register above.

Rule 9 applies: follow the repo, which is what these notes do.

### Read-only production access, confirmed working
`POST https://m98m-engine.m98m786.workers.dev/` with `{action, key, payload}`, the key from
`~/.m98m/sync-key` (exists, mode 600) **and a browser `user-agent` header** — without the UA
Cloudflare answers error 1010. Verified today against `dayCounts`. Read-only actions available:
`backupDump` (fixed SELECT allow-list), `dayCounts`, `syncConfig`, `provenanceGet`, `monthTruth`.
No arbitrary-SQL route exists, by design. `~/.m98m/cf-token` does **not** exist — hence gate item 1.

Daily local backups (read-only recon without touching production):
`~/Documents/Claude Code/M98M-Backups/YYYY-MM-DD/*.csv`, latest 2026-10-13.

---

## Proposed 1C test set (awaiting Hasib's confirmation)

Picked from the 30-day order history in today's backup — top sellers, all ACTIVE, 4 of the 6
accounts, 3 near-certain multi-variation phone cases (2 iPhone, 1 Samsung) + 2 single listings
as controls.

| # | Account | Item number | Main keyword | Variation listing? | u30 | qty | price |
|---|---|---|---|---|---|---|---|
| 1 | Sir Hasib | `236997583159` | `heavy duty iphone case` | yes (qty 5,457) | 352 | 5457 | £8.95 |
| 2 | Saif Bhai | `136854829678` | `silicone iphone case magsafe` | yes (qty 3,702) | 282 | 3702 | £6.90 |
| 3 | Azhar Bhai | `406845460680` | `samsung s24 ultra case` | yes (qty 2,468) | 201 | 2468 | £9.79 |
| 4 | Sir Hasib | `236920889297` | `motion sensor light under cabinet` | no (qty 557) | 362 | 557 | £4.90 |
| 5 | Azhar Bhai | `406966567912` | `wireless mouse` | no (qty 74) | 198 | 74 | £6.85 |

Why these five: #1–#3 exercise `itemGroupHref` / `get_items_by_item_group` and the
per-variation-vs-listing-total question (T4, T5). #4 is a single listing with real volume — the
clean control for the sold-count rule. #5 is a deliberately brutal keyword: if "wireless mouse"
comes back 400+ we learn what the depth ceiling feels like on a head term, and it is the one most
likely to be ad-dominated for the sponsored-counting question in T9.

Keyword #2 contains "MagSafe". Tracking it is read-only and harmless, but note the listing-safety
archive flags MagSafe as a trademark word on 56 live listings — the rank tracker is not the place
to fix that.

API buyer postcode: `SW1A 1AA` unless Hasib says otherwise.

---

## T9 manual-check protocol — Hasib's half, ready to run NOW

This does not wait for the lab. The links are final; the API side gets compared against whatever
he writes down. Doing it today means T9 is not the thing holding up the Phase 1 gate.

1. Private/incognito window, **logged out**, on `ebay.co.uk`.
2. Set "Deliver to" / "Postage to" to the **same UK postcode the API uses** (`SW1A 1AA`).
   If you are outside the UK this step is the whole test — without it eBay ranks for delivery to
   your country and the comparison means nothing. A UK VPN works too.
3. Open each link below. Keep **Best Match**. Apply **no** filters. Do not change the view.
4. Fill in the four right-hand columns:

| Keyword (link) | Our listing | Our position (count every card from the top) | Our card marked "Sponsored"? | Sponsored cards above ours | Results per page by default |
|---|---|---|---|---|---|
| [heavy duty iphone case](https://www.ebay.co.uk/sch/i.html?_nkw=heavy+duty+iphone+case) | `236997583159` · Sir Hasib | | | | |
| [silicone iphone case magsafe](https://www.ebay.co.uk/sch/i.html?_nkw=silicone+iphone+case+magsafe) | `136854829678` · Saif Bhai | | | | |
| [samsung s24 ultra case](https://www.ebay.co.uk/sch/i.html?_nkw=samsung+s24+ultra+case) | `406845460680` · Azhar Bhai | | | | |
| [motion sensor light under cabinet](https://www.ebay.co.uk/sch/i.html?_nkw=motion+sensor+light+under+cabinet) | `236920889297` · Sir Hasib | | | | |
| [wireless mouse](https://www.ebay.co.uk/sch/i.html?_nkw=wireless+mouse) | `406966567912` · Azhar Bhai | | | | |

If a listing is not on the first few pages, keep going to roughly page 8 (≈400 cards) and then
write "400+" — that is a real answer, not a failure.

5. I then compare against the API using both counting methods (all cards / non-sponsored only)
   and both modes (BIN-only / all), and keep whichever combination matches. Pass = within ±3 on
   4 of the 5 keywords.

---

## The lab Worker as written (`rank-lab/`)

| File | What it is |
|---|---|
| `worker.js` | the lab. 5 routes, all gated on an `x-lab-key` header (length-independent compare) |
| `metadata.json` | bindings: D1 `DB` → `83a5bb0f-…` (the engine's own database, read with SELECT only). `keep_bindings: ["secret_text"]` so later deploys preserve the secrets |
| `deploy.sh` | multipart PUT + turns on the workers.dev subdomain (`previews_enabled: false`) + pushes `LAB_KEY` + prints the surviving bindings. No custom route, ever |
| `mint-lab-key.sh` | `openssl rand -hex 32` → `~/.m98m/rank-lab-key`, mode 600, outside the repo |

Routes: `/` (health + which bindings landed) · `/token-check` · `/search?q=&depth=&mode=&postcode=`
· `/find?q=&item=&mode=` · `/sold?item=` · `/quota`.

Choices worth knowing before reading the code:
- **`s.seller` is never read.** Not redacted later — never pulled out of the response. A
  competitor-performance dataset cannot be assembled from this Worker's output.
- **`/sold` fails closed.** It SELECTs the item out of `items_api` first. Not ours → 403.
  Cannot reach D1 → **503, not a guess**. "I could not check" is not permission.
- **`/sold` tries the item group first.** One call tells us the listing's shape, and it answers
  T5's real question directly: if every variation reports the same `estimatedSoldQuantity` the
  figure is the listing total repeated (take one); if they differ it is per variation (sum them).
  The response says which, in words.
- **`/find` reports both counting methods at once** — `position` (every card) and
  `position_excl_sponsored`, plus `sponsored_above` and whether our own card is sponsored. T9
  then picks the method that matches the site instead of needing a second round of scans.
- **No `sort` parameter anywhere.** That is what makes it Best Match. Adding one would quietly
  invalidate every comparison.
- **`X-EBAY-C-MARKETPLACE-ID: EBAY_GB` on every Browse call.** Omit it and eBay silently serves
  `EBAY_US` — the answer still looks plausible, which is what makes it dangerous.
- Ceilings: depth capped at 1,000 (5 search calls), **24 eBay calls per HTTP request**,
  exponential backoff 0.8 → 6.4 s on 429/5xx, four attempts then give up. Every response carries
  a `calls` breakdown, so T7's "calls per keyword scan" is measured, not estimated.
- `/quota` tries `api.ebay.com` **and** `apiz.ebay.com` for `getRateLimits` and reports which
  base path accepted an application token — §3's open question, answered by the route itself.
- No cron. T8 adds one temporarily and removes it.

## Owner's answers, 13 Oct 2026
1. **Keyset:** one only — the global **ZAREENLT** app. Never pool the five per-account keysets
   (§3.3). Outgrow 5,000/day → apply for higher limits on that keyset.
2. **Docs:** `M98M-WRITE-PATH-DEPLOY-v1.md` and `NUMBER-CONTRACT.md` are not needed. Follow
   `engine/README-DEPLOY.md` + `docs/NUMBER_REGISTER.md`, and seed `rt_number_register` the same
   way as `adtool_number_register`.
3. **Scope:** the §8.1 ruling at the top of this file.
4. **Test set + postcode `SW1A 1AA`:** confirmed.

Still open: Workers Paid is inferred from the 15 registered cron triggers (Free caps at 5), not
confirmed by anyone. It changes nothing about the design — eBay's budget is the binding
constraint either way — so it is recorded, not chased.

## Standing note on this clone
`origin` is the **PUBLIC** GitHub repo (`M98M786/M98M-Portal`), `private` is the private mirror.
`engine/worker.js`, `engine/README-DEPLOY.md` (CF account id, D1 and KV uuids) and the six account
names are already on the public remote by the owner's own choice, so these notes expose nothing
new — but **nothing here is pushed anywhere** without the owner saying so, and `scripts/rl-scan.sh`
runs before every commit. Another session works from this same clone: check `git log` before any
commit or deploy.

---

# PHASE 1D — test results (13 Oct 2026, evening)

Lab: `https://m98m-rank-lab.m98m786.workers.dev/` · D1 `DB` bound · secrets `EBAY_APP_ID`,
`EBAY_CERT_ID` (ZAREENLT **Production**), `LAB_KEY`. CF token `m98m-rank-lab (Claude Code)`,
Workers Scripts:Edit, M98M account only, expires 27 Oct.

| ID | Result | Evidence |
|---|---|---|
| T1 | **PASS** | token minted, 1,932 chars, `expires_in` 7,200 s. See the scope note below. |
| T2 | **PASS** | every result priced GBP, every `itemWebUrl` on ebay.co.uk |
| T3 | **PASS** | all five found at depth 400 in both modes; 2 search calls per scan |
| T4 | **documented** | every one of our listings is a variation listing — see below |
| T5 | **PASS 5/5** (needed 4) | per-variation sums matched our own records to 0/−3/+1/+9/+2 |
| T6 | rounds 1–2 identical | round 3 pending |
| T7 | **PASS** | `getRateLimits` works; Browse 5,000/day, ours alone |
| T8 | running | temporary cron added 21:28:34Z, fires `*/5` |
| T9 | with Hasib | API scans recorded 21:21:55–21:22:25Z |

### T1 — the scope field is empty, and that is fine
eBay's client-credentials response carried **no `scope` field**, so the lab's `has_api_scope`
reads false. The grant is still right: every Browse call since has returned 200, which is only
possible with `…/oauth/api_scope`. Phase 2 must not gate anything on that field being present.

### T3 — positions (depth 400, postcode SW1A 1AA)
| Keyword | BIN | ALL | excl. sponsored | sponsored above | total results |
|---|---|---|---|---|---|
| heavy duty iphone case | 9 | **8** | 6 | 3 | 21,388 |
| silicone iphone case magsafe | 1 | 1 | 1 | 0 | 25,478 |
| samsung s24 ultra case | 20 | 20 | 14 | 6 | 64,692 |
| motion sensor light under cabinet | 1 | 1 | 1 | 0 | 4,931 |
| wireless mouse | 9 | 9 | 6 | 3 | 35,022 |

**BIN vs ALL barely matters** — one keyword moved by one place; the other four were identical.
Auctions are not displacing us, so `RT_MODE` is close to a free choice. T9 decides it.

### T4 — EVERY M98M listing is a variation listing
All five test listings return `itemGroupHref`, and so do one-variation listings
(236914232995 → 1 variation, 336720139422 → 1). The listing tool evidently creates a variation
listing every time. Consequences:
- dedupe by `legacyItemId` gives exactly one position per listing — confirmed, no listing
  appeared twice in 400 results;
- `items_api.qty` is **not** a variation tell (it predicted 2 singles out of 5; both were groups).
  Only `itemGroupHref` is;
- the single-listing branch of `/sold` is **untested** — our catalogue contains nothing to test
  it with. Left in as a fallback, documented as unproven rather than claimed to work.

### T5 — the rule: `estimatedSoldQuantity` is PER VARIATION, sum them
Never one figure repeated: the five listings returned 18, 44, 35, 11 and 2 *distinct* values
across their variations. Cross-checked against eBay's own `QuantitySold` in `items_api` — and a
nightly backup happened to land at 21:23:08Z, two minutes after the scans:

| Item | variations | Browse sum | items_api | diff |
|---|---|---|---|---|
| 236997583159 | 232 | 634 | 634 | 0 |
| 136854829678 | 198 | 2,620 | 2,623 | −3 |
| 406845460680 | 126 | 1,369 | 1,368 | +1 |
| 236920889297 | 12 | 672 | 663 | +9 |
| 406966567912 | 2 | 210 | 208 | +2 |

This needed no manual reading of listing pages, and it is better evidence than the eyeball check
the prompt asked for.

**The §8.1 guard is proven live:** `/sold?item=146123456789` (not ours) →
`403 that item number is not on our accounts`.

### T7 — quota, confirmed empirically
`GET https://api.ebay.com/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=browse`
accepts an **application** token. `apiz.ebay.com` was not needed.
`buy.browse`: limit **5,000**, used 30, remaining 4,970, resets **07:00 UTC**, window 86,400 s.
The count matching our own calls exactly proves nothing else shares this keyset.

**Cost per keyword scan: 2 Browse calls** at depth 400 (page size 200). So the daily budget is
`5000 / 2 = 2,500` keyword-scans/day in principle; the real ceiling will be `RT_MAX_QUOTA_SHARE`.

### The secrets ordeal — two hours, two causes, both worth remembering
1. **The browser pane's clipboard is completely isolated from the Mac's.** Copy buttons,
   `navigator.clipboard.writeText` (permission denied), synthetic Cmd+C after a DOM selection,
   and a native triple-click + Cmd+C — none of them reached `pbpaste`. Anything that must cross
   that boundary needs the owner's own hands, or a trick that never moves the value (we recovered
   one mis-read token character by having the page return a **SHA-256** and matching
   single-deletion candidates locally).
2. **Sandbox vs Production keys look identical in length.** Three pastes in a row were sandbox
   (39 and 36 chars — exactly what production turned out to be). The only reliable tell is the
   marker: App ID contains `-PRD-`, Cert ID starts `PRD-`, sandbox says `SBX`. The lab's
   `/secret-shape` route reports that **without revealing a character**, and
   `pbpaste | grep -o 'PRD\|SBX'` gives the owner the same check in one second.
   Keep `/secret-shape` for Phase 2 — it turned an opaque 401 into a one-line diagnosis.
3. `read -rs` does **not** work in Claude Code's inline bash mode (no TTY). Use `pbpaste`.

### T6 — PASS, zero variance
Three scans of all five keywords, BIN, depth 400:

| Round | Time (UTC) | heavy duty | silicone magsafe | samsung s24 | motion sensor | wireless mouse |
|---|---|---|---|---|---|---|
| 1 | 21:21:55 | 9 | 1 | 20 | 1 | 9 |
| 2 | 21:28:42 | 9 | 1 | 20 | 1 | 9 |
| 3 | 21:41:23 | 9 | 1 | 20 | 1 | 9 |

**Spread 0 on every keyword over 20 minutes**, sponsored counts identical too. So the §2C rank
re-check tolerance can start at **±1**, and a once-a-day scan is defensible: nothing suggests
rank wanders within a day in a way that would make a single reading unrepresentative. Worth
re-testing across a *day* boundary in Phase 3 — 20 minutes is not 24 hours.

### T8 — runtime, measured
One run of the exact daily shape (5 keyword scans to depth 400 + 5 sold lookups on our own
listings), via the manual trigger:

| | |
|---|---|
| wall time | **21.1 s** |
| eBay calls | 16 — 1 token, 10 search, 5 group |
| our listings found | 5 of 5 |
| status | ok, no errors |

21.1 s is **2.3 % of the 15-minute cron wall budget**, and ~4.2 s per keyword. CPU time is not
readable from inside a Worker and nearly all of that 21 s is network wait; **observability is now
enabled on the lab**, so per-invocation CPU is visible in the dash if it is ever in doubt.

Batching guidance for Phase 2: at ~4.2 s per keyword, **10–20 keywords per cron tick** keeps an
invocation at 40–85 s — far inside the 15-minute wall and leaving the 30 s CPU ceiling (crons
under an hour) untouched, since almost none of that is CPU.

### THE QUOTA PLAN — and why the §8.1 ruling made it a non-issue
**Competitor rows cost nothing.** Item number, position, title and price all arrive inside the
search response we already paid for. The per-item sold-count calls were the only thing that
scaled with `RT_K`, and those are parked. So **`RT_K` no longer affects the call budget at all** —
the prompt's "25 / 50 / 100 keywords with K = 20" question collapses to one number: **2 Browse
calls per keyword per scan** (depth 400, page size 200).

Measured quota: **5,000/day**, resetting 07:00 UTC, and T7 proved **nothing else shares this
keyset** (eBay's used count matched our own calls exactly).

| Keywords | Scans/day | Browse calls/day | % of 5,000 |
|---|---|---|---|
| 25 | 1 | 50 | 1.0 % |
| 50 | 1 | 100 | 2.0 % |
| 100 | 1 | 200 | 4.0 % |
| 100 | 2 | 400 | 8.0 % |
| 500 | 1 | 1,000 | 20 % |
| **1,500** | 1 | 3,000 | **60 % — the `RT_MAX_QUOTA_SHARE` ceiling** |

Add ~5 % for the §2C re-check sample and one token mint a day (cap 1,000/day). The pilot of 10
keywords costs **20 calls a day, 0.4 % of the quota.**

**We are nowhere near needing eBay's Application Growth Check.** The honest framing for the
owner: the thing that would have made this expensive is the thing the licence ruling removed.

### T2 — verified across a whole page, not inferred from one listing
`/search?q=heavy duty iphone case&depth=200`:
- **200 of 200** results priced **GBP**
- **200 of 200** `itemWebUrl` on **www.ebay.co.uk**
- `seller` absent from **every** hit — the §8.1 code guarantee confirmed by inspection, not claimed
- 14 of 200 carry `priorityListing` (sponsored), 7 %
- **198 of 200 are variation listings** — this is how the whole category lists, not just us

### The multi-account finding that matters for the page design
One keyword, `heavy duty iphone case`, returns **ten of our own listings inside the top 200**,
across **all six accounts**:

| Position | Item | Account |
|---|---|---|
| 9 | 236997583159 | Sir Hasib |
| 12 | 366646968328 | HAFIZA BHAJI |
| 36 | 336755872107 | AZHAR ABRT |
| 47 | 336698987235 | AZHAR ABRT |
| 61 | 236891747676 | Sir Hasib |
| 65 | 188233983546 | Amna Baji |
| 98 | 407254987195 | Azhar Bhai |
| 100 | 406616696483 | Azhar Bhai |
| 148 | 137540214464 | Saif Bhai |
| 186 | 136979422410 | Saif Bhai |

This is exactly the A/B-test situation §1 of the prompt describes, and it is live right now.
Consequences for Phase 2:
- `rt_rank_daily` must hold **one row per (keyword, item)**, never one per keyword — already the
  design, now proven necessary rather than theoretical;
- the Rank tab's "our share of page 1" is a real number with real movement in it;
- the lab's `/search` already marks every one of ours with its account from `items_api` in a
  single batched D1 SELECT, so Phase 2 needs no extra eBay calls to do this.

### T8's cron — everything that was ruled out
Registered `*/5 * * * *` at 21:28:34, re-set clean at 22:05:11 after the final deploy. Seven-plus
missed windows. Ruled out, each by evidence rather than assumption:

| Hypothesis | Checked | Verdict |
|---|---|---|
| schedule not actually registered | `GET …/schedules` | present, both times |
| the dash disagrees with the API | dash Settings → Trigger events | *"Runs: Every 5 minutes · Next: Tue, 13 Oct 2026 22:00:00"* |
| a redeploy dropped it | re-read after each deploy | survived |
| the deployed bundle has no `scheduled` export | fetched the live script from the API | `async scheduled` at line 348, `rt_lab_beat` present ×3 |
| the handler throws before writing | the same code path ran fine via `/lab-run-now` | works |
| plan or settings differ from the Engine | `GET …/settings` on both | identical (`usage_model: standard`) |
| crons broken on this account | Engine has 15 triggers, all firing | account is fine |
| schedule bound to a stale deployment | cleared and re-set AFTER the last deploy | still silent |

Left standing: **a newly created Worker's first cron delivery is slow or unreliable here.** Not
provable from the outside without `Account Analytics: Read` (the telemetry endpoint 401s for the
current token), and not worth widening the token for.

**What Phase 2 must do about it:** the collector writes a heartbeat on its very first tick and the
health endpoint surfaces "last tick"; if that stays empty after two windows, fall back to the
Engine's own proven scheduler poking the collector over HTTP (free slots at `*/10` and `:45`).
Never let a daily pipeline depend on a cron whose delivery has not been observed at least once.
