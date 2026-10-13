# RANK-LAB-REPORT — Phase 1 verdict

# GO WITH CHANGES

The API reproduces what a UK buyer sees, the quota is a non-issue, and the one thing that cost
real money in the original design is the thing the licence ruling already removed. Two items are
open: **T9 (Hasib's manual check) has not come back**, and **the lab's cron never delivered**.
Neither blocks Phase 2's design; both change what Phase 2 must verify on day one.

_13 Oct 2026 · lab `m98m-rank-lab` on workers.dev · ZAREENLT Production keyset · all times UTC._

---

## 1. The numbers first

| | |
|---|---|
| Browse quota | **5,000/day**, resets 07:00 UTC, **nothing else shares it** |
| Cost of a keyword scan | **2 calls** (depth 400, page size 200) |
| 100 keywords, once a day | **200 calls — 4 % of quota** |
| The 10-keyword pilot | **20 calls — 0.4 %** |
| Full daily shape, 5 keywords | **21.1 s wall**, 16 calls, 2.3 % of the cron budget |
| Rank stability | **zero variance** across 3 scans in 20 minutes |
| Our listings on one keyword | **10, across all six accounts** |

---

## 2. T1–T9

| ID | Test | Result |
|---|---|---|
| T1 | app token + one search | **PASS** — token minted, 7,200 s. See the scope note. |
| T2 | UK marketplace | **PASS** — 200/200 results GBP, 200/200 on ebay.co.uk |
| T3 | rank 5 items, depth 400, both modes | **PASS** — all five found in both modes |
| T4 | variation listings in search | **PASS** — documented below; dedupe gives one position per listing |
| T5 | sold count, our 5 listings | **PASS 5/5** (needed 4) |
| T6 | 3 scans, 15 min apart | **PASS** — spread **0** on every keyword |
| T7 | quota | **PASS** — `getRateLimits` works with an application token |
| T8 | Cloudflare runtime | **PASS on runtime · cron delivery UNRESOLVED** |
| T9 | manual match with Hasib | **PENDING** |

### T1 — one trap worth carrying into Phase 2
eBay's client-credentials response carried **no `scope` field at all**. The grant is still correct —
every Browse call since has returned 200, which is impossible without `…/oauth/api_scope`.
**Phase 2 must not gate anything on that field being present.**

### T3 — positions (depth 400, SW1A 1AA)
| Keyword | BIN | ALL | excl. sponsored | sponsored above | total results |
|---|---|---|---|---|---|
| heavy duty iphone case | 9 | **8** | 6 | 3 | 21,388 |
| silicone iphone case magsafe | 1 | 1 | 1 | 0 | 25,478 |
| samsung s24 ultra case | 20 | 20 | 14 | 6 | 64,692 |
| motion sensor light under cabinet | 1 | 1 | 1 | 0 | 4,931 |
| wireless mouse | 9 | 9 | 6 | 3 | 35,022 |

**BIN vs ALL barely matters** — one keyword moved by one place, four were identical. Auctions are
not displacing us in these categories.

### T4 — every M98M listing is a variation listing
All five test listings return `itemGroupHref`, and so do one-variation listings
(236914232995 → 1 variation, 336720139422 → 1). **198 of the top 200 competitors are the same.**
Three consequences:
- dedupe by `legacyItemId` gives exactly one position per listing — no listing appeared twice in
  400 results;
- **`items_api.qty` is not a variation tell.** It predicted 2 singles out of 5 and both were
  groups. Only `itemGroupHref` counts;
- the single-listing branch of `/sold` is **untested** — our catalogue contains nothing to test it
  with. It stays as a documented fallback, not a proven path.

### T5 — the rule, and the cross-check
**`estimatedSoldQuantity` is per variation — sum it.** Never one figure repeated: the five
listings returned 18, 44, 35, 11 and 2 *distinct* values across their variations.

Checked against eBay's own `QuantitySold` in `items_api`; a nightly backup landed at 21:23:08,
two minutes after the scans:

| Item | variations | Browse sum | our record | diff |
|---|---|---|---|---|
| 236997583159 | 232 | 634 | 634 | **0** |
| 136854829678 | 198 | 2,620 | 2,623 | −3 |
| 406845460680 | 126 | 1,369 | 1,368 | +1 |
| 236920889297 | 12 | 672 | 663 | +9 |
| 406966567912 | 2 | 210 | 208 | +2 |

This needed no manual reading of listing pages, and is stronger evidence than the eyeball check
the prompt asked for.

**The §8.1 guard is proven live**, not just coded: `/sold` on a non-owned item number returns
`403 — that item number is not on our accounts`, and the `seller` field is absent from all 200
search hits.

### T8 — runtime fine, cron silent
The full daily shape ran in **21.1 s / 16 calls / 5-of-5 found**, which is 2.3 % of the
15-minute cron wall budget and ~4.2 s per keyword.

But **the cron never fired** — six missed windows across 30 minutes. It is registered
(`*/5 * * * *`), Cloudflare's own UI says *"Runs: Every 5 minutes · Next: 22:00:00"*, the Worker's
settings match the Engine's (`usage_model: standard`), and the Engine's own 15 triggers fire
normally on this account. So this is specific to a newly created Worker, not the account.

**It was also nearly invisible.** The day-guard makes a repeat tick a silent no-op, so "nothing
happened" read identically to "the cron never arrived". `rt_lab_beat` now records every tick
*before* any guard — that instrumentation is the real deliverable here, and Phase 2 should carry
it from the first commit.

---

## 3. Recommended settings

| Key | Recommendation | Why |
|---|---|---|
| `RT_POSTCODE` | `SW1A 1AA` | as agreed |
| `RT_MODE` | **`bin`** unless T9 says otherwise | four of five keywords identical; fewer moving parts |
| `RT_COUNTING` | **awaits T9** | the API gives both readings in one pass, so this is a config choice, not a re-scan |
| `RT_DEPTH` | **400** | all five found well inside it; deepest was 20 |
| `RT_PAGE_SIZE` | **awaits T9** | needs the "results per page" eBay actually shows |
| `RT_K` | 20 | **no longer affects cost** — competitor rows ride along free |
| `RT_SCANS_PER_DAY` | 1 | T6 found zero intra-day drift |
| `RT_MAX_QUOTA_SHARE` | 0.6 | unchanged |
| `RT_MIN_REMAINING` | 0.2 | unchanged |
| `RT_ALERT_DROP` | 10 | unchanged |
| `RT_STICKY_DAYS` | **parked** | existed only to keep sold-count deltas continuous |

**One optimisation worth taking:** fetch page 2 only when a watched listing has not yet been
found on page 1. Every test keyword placed inside the top 20, so most scans would cost **1 call
instead of 2** — halving an already-small budget. Full depth is still needed to justify a "400+".

---

## 4. Quota plan

`RT_K` has dropped out of the arithmetic entirely: item number, position, title and price all
arrive inside the search response. The per-item sold-count calls were the only thing that scaled
with K, and they are parked.

| Keywords | Scans/day | Calls/day | % of 5,000 |
|---|---|---|---|
| 25 | 1 | 50 | 1.0 % |
| 50 | 1 | 100 | 2.0 % |
| 100 | 1 | 200 | 4.0 % |
| 100 | 2 | 400 | 8.0 % |
| 500 | 1 | 1,000 | 20 % |
| 1,500 | 1 | 3,000 | 60 % — the `RT_MAX_QUOTA_SHARE` ceiling |

Add ~5 % for the §2C re-check sample, plus one token mint a day (cap 1,000/day).
**"Quota left after other users of the keyset" is the whole 5,000** — T7's used count matched our
own calls exactly, so nothing else touches it. Application Growth Check is not needed at any
scale we are likely to want.

---

## 5. Phase 2 architecture — §5's default, with what recon changed

Keep: collector Worker `m98m-rank-tracker` grown from the lab, the Engine's D1, read-only Engine
endpoints, portal page behind an OFF flag.

Changed by what the repo actually does:
1. **No `wrangler` anywhere.** Deploy is a multipart PUT to the Cloudflare API
   (`rank-lab/deploy.sh` is the working template). Secrets go in via the API or the dashboard.
2. **No migration file.** `rt_` tables follow the repo's own `ensure…Schema(env)` pattern inside
   the worker — the same way all 80-odd `adtool_*` tables arrived.
3. **`rank_tracker_enabled` is a `portal_config` row**, read with `adtFlag(env, key)` → `'on'`/`'off'`,
   not a Worker variable.
4. Engine read actions must also be listed in `ENGINE_ACTIONS` in `index.html`, or the client
   routes them to Apps Script instead.
5. Page is `frontend/view-rankTracker.js` on the `VIEWS.<key>` pattern, roles
   `['Advertising Manager', 'Management', 'Ops Head']`, joining the Advertising sidebar group.
   Galaxy theme tokens only — in that theme the `--blue*` tokens are themselves gold, which is how
   "no blue" is already enforced.
6. **Cron delivery must be proven, not assumed.** The collector writes a heartbeat on its first
   tick and the health endpoint surfaces it. If a new Worker's cron stays silent, the fallback is
   the Engine's own proven scheduler poking the collector over HTTP — the Engine has 15 working
   triggers and free slots at `*/10` and `:45`.
7. **Owner-approved addition:** our **own** units/day from the `orders` table shown beside our
   rank per keyword, plus share of page 1. Entirely exempt under §8.1, needs no eBay call, and is
   the actionable half of what the parked BSR would have given.
8. `rt_rank_daily` is **one row per (keyword, item)** — proven necessary, not theoretical: one
   keyword returns ten of our listings across all six accounts.

---

## 6. Risks and questions — one list

1. **T9 has not come back.** Until it does, `RT_COUNTING` and `RT_PAGE_SIZE` are unset and the
   claim "the API matches what a buyer sees" rests on plausibility, not measurement.
2. **Cron delivery on a new Worker is unproven.** Phase 2 must verify its first tick before
   anything depends on it; the heartbeat is already built.
3. **Roll the Cloudflare token.** Its value reached the transcript via a screenshot. Scoped to
   Workers Scripts:Edit, expires 27 Oct — but that scope can edit the Engine.
4. **A duplicate commit sits on this branch.** `35a924c` (another session's engine work, also on
   `main` as `9179bd7`) landed on `feature/rank-tracker`. Untangle before merging.
5. **Confirm `priority_listing` may be stored.** Kept because the counting method depends on it;
   it describes the search result, not a seller's performance.
6. **The single-listing `/sold` path is untested** — our catalogue has no single listings.
7. Telemetry/log diagnostics need a wider token (`Account Analytics: Read`). Not requested.
8. **T6 proved 20 minutes of stability, not 24 hours.** Phase 3 should test across a day boundary
   before the once-a-day scan is treated as settled.
9. The lab's temporary cron must be removed before Phase 1 closes.
