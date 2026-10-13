# RANK-TRACKER-NOTES

Working notes for the M98M Rank Tracker (prompt: `M98M-RANK-TRACKER-PROMPT-v1.md`, v1, 13 Oct 2026).
Branch `feature/rank-tracker`. Updated after every step so a fresh session can resume.

---

## 13 Oct 2026 — Phase 1A (recon) DONE · 1B/1C BLOCKED on Hasib

### Done
- Read the prompt in full. Created branch `feature/rank-tracker` off `main` @ `a121a54`.
- Phase 1A recon, read-only. Findings below.

### Next (needs Hasib — see the gate list)
1. Cloudflare API token at `~/.m98m/cf-token` (or he creates `m98m-rank-lab` himself).
2. eBay keyset for the lab Worker — he sets the secrets, I never see them.
3. Confirm the 1C test set + the API buyer postcode.

Then: 1B lab Worker → 1D tests T1–T9 → 1E `RANK-LAB-REPORT.md` → **STOP for `GO PHASE 2`**.

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

## T9 manual-check protocol (Hasib's half — do this once the lab is up and I hand over the links)

1. Private/incognito window, **logged out**, on `ebay.co.uk`.
2. Set "Deliver to" / "Postage to" to the **same UK postcode the API uses** (`SW1A 1AA`).
   If you are outside the UK this step is the whole test — without it eBay ranks for delivery to
   your country and the comparison means nothing. A UK VPN works too.
3. Open `https://www.ebay.co.uk/sch/i.html?_nkw=<keyword>`. Keep **Best Match**. Apply no filters.
4. For each keyword record:

| Keyword | Our position (count every card) | Our card marked "Sponsored"? | Sponsored cards above ours | Results per page by default |
|---|---|---|---|---|
| heavy duty iphone case | | | | |
| silicone iphone case magsafe | | | | |
| samsung s24 ultra case | | | | |
| motion sensor light under cabinet | | | | |
| wireless mouse | | | | |

5. I then compare against the API using both counting methods (all cards / non-sponsored only)
   and both modes (BIN-only / all), and keep whichever combination matches.

---

## Open questions for Hasib
Listed in the gate message of 13 Oct; repeated here so a fresh session has them.
1. Cloudflare API token, or does he create `m98m-rank-lab` himself?
2. Which eBay keyset does the lab use — the global `ZAREENLT` one? And long-term, may the tracker
   spread Browse calls across the per-account keysets (5,000/day each)?
3. Confirm the test set + postcode.
4. Confirm Workers Paid (I am reading it off the 15 cron triggers).
5. Do `M98M-WRITE-PATH-DEPLOY-v1.md` / `NUMBER-CONTRACT.md` exist somewhere outside the repo?
