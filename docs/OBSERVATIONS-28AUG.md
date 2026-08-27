# Full-portal observation — 28 Aug 2026 (pre-deploy analysis; NO changes made)

All 68 pages opened in the pane, screenshotted, and read. Numbers recomputed from
raw data. Everything below is diagnosis + tonight's exact fix list.

## 1. Portal speed — measured per page (time to content)

| Class | Pages | Time | Why |
|---|---|---|---|
| Instant | 26 (home, overview, dashboard, dailyReport, orders, boards, signals, health, CS desk, pipeline…) | **0.5–0.6s** | cache-first paint + engine reads |
| Engine-backed | 11 (ordersBoard, dispatch, sourcing, adsCentre, traffic, feedback, liveSplit, marketing, campaignWatch, activeListings, advertising) | **1–3s** | Cloudflare engine ~50ms + render |
| One sheet call | 12 (dept task pages, listDesk, huntQueue, approvals, goLive, rota…) | **4–6.5s** | ONE Apps Script round trip: Google's own ~3.5s floor |
| Multi-panel | 15 (mgmtDesk, staffAdmin, rules, team, reports, kpis, recheck…) | **7–20s** | 2–4 sheet calls, each paying the floor |

**Conclusion:** every slow page is slow for ONE reason — the Apps Script ~3.5s/request
floor. Every engine-backed page is 1–3s. The speed fix is not more tuning; it is moving
the remaining hot reads onto the engine (the D1 task mirror, already written) —
**tonight's worker deploy**. Expected result: the 4–6.5s class → ~1s; multi-panels → 2–3s.

## 2. THE data bug — sales_daily rollup destroyed 27 Aug (root of "exact number")

- Raw orders table (complete, verified): **27 Aug = £1,519.68** (ABRT 231.16 · Amna
  282.88 · HAFIZA 216.20 · Saif 374.29 · Sir Hasib 415.15).
- The books mirror (sales_daily) after the nightly run: **27 Aug = £88.21** — 94% of
  the day erased. 26 Aug intact (£1,871.49).
- The Daily report's LIVE row still shows the correct ~£1,541 because the live day is
  computed straight from orders; the corruption lands when the deployed (old) rollup
  freezes the closed day using a truncated window.
- The corrected rollup is ALREADY WRITTEN in engine/worker.js HEAD: 8-day nightly
  re-roll from the full orders table, edge-day skip (the exact "15 Aug shrank" guard),
  cost-trust ladder, and the law's own columns.
- **Tonight:** deploy the HEAD worker → run `rollupsWide` (45-day re-roll) → every
  historical day rebuilt from complete orders. Verify 27 Aug reads ~£1,519.68.

## 3. Profit number on Business overview — the observation

The sheet's brain, verified to the penny from the mirror (window 21–27 Aug):

- T (0.8 law) = 0.8 × (OE − cost) = **£4,046.43** ← what Overview currently labels "profit"
- CPC ads ex VAT (pri) = **£2,292.60**; returns = £0.00
- **Actual = T − pri − returns = £1,753.83** — matches the stored column EXACTLY.

So Overview's "profit" is **T before ads** — not wrong arithmetic, wrong figure
surfaced. Daily report already shows Actual. **Tonight:** mgmtOverview's kpis read
SUM(actual) as "Actual profit" (keep T visible as its own line, labelled "T · 0.8 law").
One query change in the worker + a label in view-overview. Then Overview = Daily
report = the sheet's brain, one number.

## 4. "Portal calculates sales analysis on its own" — status

It already does — the rollup carries the sheet's exact law (T = 0.8×(OE−cost),
Actual = T − CPC − returns, real order-level costs first, eBay-attributed ad revenue
for ROAS), and Daily report + Overview read it, with the live day computed from
orders directly. The two gaps are §2 (deployed rollup is the broken old version) and
§3 (Overview surfaces T instead of Actual). Both close with tonight's single worker
deploy. No sheet agent needed anywhere in that path.

## 5. Account report / VAT breakdown

- **Account report**: WORKS for Management (verified: ABRT table renders engine-mode).
  What staff hit is §2's poisoned rows (27 Aug £15.18 for ABRT — the broken rollup, not
  the page). Heals with the re-roll.
- **VAT breakdown**: page-killing frontend bug found — `ukToday()` is private inside
  view-overview.js; vatBreakdown calls it → ReferenceError swallowed by renderView →
  spinner forever. **Traffic's "Today" button dies the same way.** Fix: one shared
  global helper. Two-line change, tonight. (Backend itemPnl verified healthy: 992ms,
  221 rows.)

## 6. Listing-revision creation tab + auto-qualify (new feature — design)

Ask: "no listing revision creation tab which is connected with automated feature for
listings to qualify for sales."
- Today: listingDecisions lists 7-day-no-sale items but every revision needs a human
  click; CS/OP/Advertising can raise revisions via My tasks; there is no automation
  and no single Revision desk.
- Design (buildable tonight, Apps-Script-side so the WAF cannot block it):
  1. `revisionQualify` nightly job (metricsWatch pattern): read items via the engine
     mirror; QUALIFY rule: live ≥7 days AND sold_30d = 0 (later: CTR/views tiers);
     auto-create a `listing_revision` task to the item's lister, deadline +72h,
     reason auto-written; dedup: one open revision per item, ever.
  2. "Revision desk" tab: the auto-queue (what qualified, why, who got it, status) +
     the manual raise form + the rev72 archive — one home for revisions.
  3. mgmtDesk counter for auto-raised revisions.

## 7. Also spotted during the sweep
- A SELFTEST hunt still sits in the hunting pipeline's Approved tray (TASKS purge done
  earlier; HUNTING_DB has its own) → purge tonight.
- Freed emails ("Ubaid free email" Sales Ops, "Yousaf Free email" Product Hunter)
  appear in weekly Staff reviews — decide: exclude freed/spare emails from reviews.
- Overdue pressure: Listing 52/52 overdue now (was 46), Advertising 32/32.

## Tonight's deploy list (in order)
1. Worker deploy (dash paste, 5 min) → arms AUTOMSG_LIVE, fixes rollup + health tiles
   + link truncation + task mirror speed.
2. `rollupsWide` run → verify 27 Aug = ~£1,519.68 fleet.
3. Overview kpis → Actual (worker, same deploy).
4. ukToday shared helper (frontend push).
5. revisionQualify job + Revision desk (AS v67 + frontend).
6. HUNTING_DB selftest purge one-shot (AS v67).
