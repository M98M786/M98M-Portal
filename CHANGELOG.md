# CHANGELOG

## 2026-11-04 - BUSINESS OVERVIEW: the date chips drive the page

Owner: "Business overview page only shows data for today - Yesterday, 7 days, 30 days clicking
doesn't reflect any result." The chips only ever re-computed two sections far below the fold
(Collective KPIs, Profitability); everything on the first screen was pinned to today.

- Engine `ordersPulse` accepts `from`/`to` (UK trading days, capped at 92): the orders that came on
  those days and how many have been bought since, by the same cost-AND-order-number rule. Today is
  unchanged (live minute clock, backlog pile, yesterday line); a window has no backlog and no
  yesterday line. Memoised per window for 55 s like today.
- Overview: one `oRangeChanged()` for every chip/Apply click - the dispatch clock re-reads for the
  window and renames itself ("Orders - Last 7 days - the dispatch clock"), the Advertising card sums
  the day books per account over the window (Yesterday keeps the engine's own `ads_yesterday`
  rows), and the KPI/Profitability block repaints as before. A clock answer for an older window is
  guarded so a slow reply never paints over a newer click, and an engine build without window
  support says so instead of showing today's count under a 7-day heading.
- Sections that stay pinned say so in their hint: "Right now" (live today), "Today & yesterday".
- Same day, second pass (owner: ratings "Loading…", VAT "filling…", five funds rows "—"): the overview
  fired three `pageMetrics` register reads at once (8 s D1 scans each) and tipped D1 into "overloaded";
  `fundsSummary` then froze five refusals in KV for ten minutes. Shell `truthPage` now runs register
  reads one at a time per tab; the overview loads ratings on their own, retries each register read
  once and says what failed; `fundsSummary` keeps good rows, re-asks refused accounts within a minute
  (one retry on a D1 overload) and shows the last good figure marked stale instead of a dash.
- Third pass: err_log shows D1 "overloaded" refusals on every page at the engine's cron ticks (:00/:05/:15
  stack three slots). The request handler re-runs a pure read once after 1.5 s on that refusal
  (`D1_RETRY_READS`); every overview feed goes through `oFeed()` — staggered first load, ONE more try
  15 s later before a card says "did not answer"; the Collective block reads the register only (retry
  once) and falls back to the P&L brain only after that fails; the dispatch clock retries in 15 s.

## 2026-10-03 - TRACKING FETCH: a not-mine mark no longer hides the order from its owner

Two-day shadow test finding. Each AliExpress order is visible to exactly one of the four buyer
logins; the other three profiles mark it 'notmine' (mostly inferred from the order number's family,
without a visit). `tfIntake` stamped `tracking_pulls.last_checked_at` on every such mark, and that
stamp is the 12-hour re-ask throttle in `tfPullList` - so three sibling stamps hid an order from
its real owner for a day or more (order ...0195 / eBay 14-15235-89685: three not-mine marks, never
opened by m98mshop2, dispatched by hand). At the time of the fix 326 of 337 pending orders were
throttled, 179 of them only by sibling marks.

- `tfIntake`: a 'notmine' mark adds the login to `not_mine` and bumps `checks`; it never touches
  `last_checked_at` (NULL on first sight) and never replaces a real found/none `last_result`.
- Data repair after deploy: `last_checked_at` cleared where `last_result = 'notmine'`.
- Tests 41/41 (`M98M-Tracking-Sync/tests/engine-trackfetch.test.js`, 5 new).
- Also carries 8424733 (Tracking Fetch pushes pass `force_live`), inert while the gate is off.

## 2026-10-01 — TRACKING FETCH AGENT (fleet 07) — engine side, undeployed

The AliExpress → eBay tracking loop with no typing in it. A Chrome extension (repo
`M98M-Tracking-Sync`, v2) asks the Engine which orders still need a number (`trackingPullList`),
reads each order's own AliExpress tracking page, and hands the numbers back (`trackingIntake`).
The Engine matches on `orders.ali_order` and pushes through the existing `pushTracking`.

- New block `/* TRACKFETCH-BEGIN */ … END */`; tables `tracking_inbox`, `tracking_pulls`; index
  `idx_orders_ali`; routes `trackingPullList` / `trackingIntake` (own key: `TRACKING_KEY` secret
  or `portal_config.tracking_fetch_key`), `trackingInboxRead` (order roles), `trackingFetchSet`
  (Management); job `trackingInboxRetry` on the quarter-hour slot and in `runJobKey`;
  `backupDump` gains both tables; truth board gains `TRACKING_FETCH_HELD` (INFO).
- **Shadow by default** (`portal_config.tracking_fetch_live` unset). Held, never pushed:
  DUPLICATE (one parcel, two Ali orders), AMBIGUOUS (two buyers), HAS_OTHER (team's number
  wins), FAIL. No sheet is written from the block — `pushTracking`'s bridge write is the only
  one, as before.
- Written and tested (36/36 in `M98M-Tracking-Sync/tests/engine-trackfetch.test.js`);
  **not deployed** — the dash session had expired. Blueprint: `M98M-Tracking-Sync/BLUEPRINT.md`.

## 2026-09-01 — TRUTH UPDATE v2 (phases 0–6)

The whole portal moved onto a verified number register: one metric, one function, two
independent computation paths, provenance chips on every tile. Spec: `docs/TRUTH-UPDATE-v2.md`;
evidence per phase: `docs/TRUTH-UPDATE-PROGRESS.md`.

- **Money**: every £ figure = the sales-analysis day tabs' own columns (Σ Raw Profit, Σ VAT to
  HMRC, Σ True Order Earning) via the D1 sheet mirror; invented formulas ("0.8 ×", "20 % ×",
  estimates) deleted from every caption. Nightly penny audit.
- **Orders**: dispatch rebuilt on eBay's own open set (openSync, 5-min, complete-run guarded);
  LATE/DUE/AWAITING partition exactly; the five 39–93-day "late" ghosts were closed on eBay and
  left the board entirely.
- **Advertising** (WO-08): one `liveMembershipRow` definition; eBay per-ad `adStatus` synced;
  four-way split partitions ACTIVE exactly (SPLIT_SUMS_TO_ACTIVE, 15-min);
  MULTI_RUNNING corrected 391 → 25 (paused ads/campaigns/ended listings no longer count);
  CPC ✕ pause (`adsPauseListing`) — the portal's only eBay write, user-click only.
- **Management desk** (WO-02): Pending approvals + Management desk + Departments merged into
  one page (Waiting on you / Queues / Departments); old routes redirect; TASKS_OPEN_BY_DEPT
  verified 15-min.
- **Keyword docs** (WO-09): a listing newly live in a CPC campaign starts a 72 h clock → task
  for Zain (opens +72 h, due +96 h), four outcomes, searchable archive, follow-ups capped at 3;
  AS keyword sweep retired.
- **Hunting** (WO-11): AliExpress duplicate check (multi-link, short-link resolution) at the
  top of Product hunting + a submit-time block with logged Management override. Backfill:
  408/408 stored supplier links parse (100 %).
- **Inbox** (WO-12): DMs on D1 — thread list + unread by one indexed query, 30-message pages,
  optimistic send, 30 s delta polling; sheet archive mirrored in; participant-only reads.
  R2 is not enabled on the Cloudflare account, so attachments wait on DECISIONS #3.
- **Signals** (WO-13): 15-min re-evaluation auto-resolves alerts whose condition ended.
- **Cleanup** (WO-14): ~2,900 lines of replaced pages deleted (old account report, live
  listings, management desk, departments, advertising/wrongAds, kpis + dispatch sections);
  30-Aug truth machinery (bookFix / truthCheck letters / sirHasibMonthlyFill) off the nightly
  chain, callable by hand; docs SYNC.md + TRUTH-CHECK.md + NUMBER_REGISTER.md.

Deploys: worker `m98m-engine` (1 Sept 01:34 UTC), Apps Script v88 (same /exec URL), Pages
builds 20260901-00xx–01xx.
