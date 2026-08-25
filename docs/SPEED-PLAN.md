# Portal speed & correctness — plan of action
**Measured 25 Aug 22:10 PKT, on the live portal, signed in as Management.**

## What I found (not opinion — measured)

Audited all **65 pages**. Rendered each one and timed the backends.

| Page family | Backend | Time to data |
|---|---|---|
| overview, ordersBoard, adsCentre, csDesk, liveSplit, activeListings, marketing, campaignWatch, itemRisk, listingDecisions, alerts | **Engine (D1)** | 0.1–1.6 s ✅ |
| tasks, deptBoard, tasksListing/Hunting/Orders/Ads/CS, mgmtDesk, huntDesk, listDesk, goLive, rev72, staffReviews, ideaBox, hunting, huntQueue, approvals, reportsGrid, rota, team, perf, vatBreakdown, dispatch, recheck, wrongOrders, wrongAds, cpc, keywordApprovals, potentialCpc, pipeline, reports, rules, tools, dashboard | **Apps Script (Google Sheets)** | **3.5–4.6 s** ❌ |

**35 of 65 pages were still showing a spinner 2.8 seconds after opening.**

Hard timings:
- `mgmtOverview` (engine) **7,065 ms** ← cold memo, needs its own fix
- `deptPending` (AS) 4,205 ms · `huntDesk` 4,621 ms · `listDesk` 4,215 ms · `myTasks` 3,624 ms
- `ordersBoard` (engine) 1,592 ms

**Root cause:** Apps Script re-reads Google Sheets on every request. A sheet read costs seconds; a D1 read costs ~50 ms. There is **no `tasks` table in D1** — the whole task system is sheet-only, so every task screen pays the sheet tax. The department task boards I made the landing pages are the worst of it: every employee's first screen is a 4-second spinner.

**This is not a data problem. It is an architecture problem, and it is fixable.**

---

## Phase 1 — Instant paint (relief on every slow page)
Cache-first rendering: paint the last answer immediately (0 ms), refresh behind it, and show a visible **"updated HH:MM"** stamp so nobody trusts a stale figure by accident. `cachedCall()` already exists and is used by older screens; the R8 screens use bare `api()`.
- Applies to: the 5 department boards, deptBoard, mgmtDesk, huntDesk, listDesk, goLive, rev72, staffReviews, ideaBox, priceDesk.
- Effect: first visit unchanged; **every repeat visit is instant**.
- Risk: low. Stale data is labelled, never silent.

## Phase 2 — Mirror TASKS into D1 (the real fix)
1. `CREATE TABLE tasks` in D1 (task_id, type, account, item_id, title, assigned_to, assigned_by, status, deadline_pkt, created_at, decided_at, comments).
2. AS pushes TASKS rows on the existing hourly sync (`pushEngineSync`) **and** after every task write, so it is never more than moments behind.
3. New engine actions `deptPendingEngine`, `listDeskEngine`, `huntDeskEngine` reading D1.
4. Frontend routes those through `ENGINE_ACTIONS`.
- Effect: **4,200 ms → ~100 ms (40×)** on every task screen, including the landing pages.

## Phase 3 — The 7-second overview
`mgmtOverview` costs 7 s cold: `computeHealth()` runs per-account queries in series inside the same request. Precompute it on the cron into `daily_health` and serve the stored row.

## Phase 4 — Correctness fixes found in the audit
- `feedback` page: "could not load" error.
- Two different 7-day revenue figures on the overview (£12.4k tile vs £11.6k feed) — one label is wrong; make both name their source.
- 2,222-letter backlog: tile now shows 48-hour actionable count (done) — decide with Hasib whether to bulk-close the historic pile.

---

## Order of execution
Phase 1 → verify → Phase 2 → verify → Phase 3 → Phase 4.
Each phase ships and is measured on the live portal before the next begins.
