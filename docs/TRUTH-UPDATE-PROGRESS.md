# TRUTH UPDATE v2 — PROGRESS

Nothing is done until ticked here with evidence (R13).

## Phase 0 — Discovery ✅ COMPLETE 1 Sept 2026, 05:0x PKT
- [x] Page/number inventory with today_source → docs/NUMBER_REGISTER.md §A (55 view files)
- [x] Money workbook identified + R/S/T formulas ported → NUMBER_REGISTER §B (phase0Dump evidence; identical `R=H−I−N`, `S=C−G−J−M−Q`, `T=R−S` in all six books)
- [x] Account registry captured (CONNECTIONS 39 rows → scratchpad/phase0-dump.json); D1 gaps listed → NUMBER_REGISTER §F
- [x] Token/scope inventory: all required scopes working on all six accounts (sync_state clean) → NUMBER_REGISTER §E
- [x] Fake-number inventory → NUMBER_REGISTER §C
- [x] Workbook write-path baseline → NUMBER_REGISTER §D (R/S/T untouched by any writer)
- [x] docs/DECISIONS-NEEDED.md seeded (8 spec items + 4 new; #1 and #2 resolved by discovery)
- [ ] **GATE: owner reads docs/PHASE0-REPORT.md and accepts the defaults**

## Phase 1 — Truth layer + safe removals ✅ COMPLETE 1 Sept 2026, 05:3x PKT (gate passed by owner: "defaults fine, go", soak compressed on owner's order to run phases consecutively)
- [x] D1 additive migrations live: orders +payment_status/cancel_state/fh_count/open_seen_at; sheet_rows/sheet_tabs/metric_snapshots/validation_runs (worker self-heal)
- [x] Sync jobs: openSync (eBay open set, complete-run guarded, D1-stamped — KV null-cache burned us once), orderSync captures truth fields, orderBackfill upserts them onto history (3,443 orders), orderTruthSweep fixed the 5 ghosts per-order, sheet mirror hot (15-min AS trigger) + cold (62-day cursor walk)
- [x] Metric engine (Path A): dispatch family from the stamped open set, money family from sheet_rows R/S/T, tasks family from the D1 mirror; pageMetrics page API with provenance
- [x] Truth Check (Path B): second classifier, per-row T=R−S + ported formula checks, independent SQL recomputes; tier 1 every 15 min, tier 3 nightly penny audit; validation_runs + #truthCheck page
- [x] Safe removals: Home signal pins + health cards, Sales-analysis reconciliation banners, sidebar regroup (Library, Returns→Customer Service, Truth Check→Management)
- **GATE EVIDENCE: Truth Check 15 PASS · 0 FAIL · 0 UNVERIFIED (12 STALE = unwritten day tabs, honest); dispatch truth from eBay's own open pull: LATE 0 · DUE 1 · AWAITING 585 · OPEN 586 (the old page said LATE 5 including 93-day-old closed orders — those five are not open on eBay at all); one mid-run stamp race found by the verifier itself and fixed (snapshot per run). Screenshot: Truth Check page green.**
## Phase 2 — Money ✅ COMPLETE 1 Sept 2026, 05:5x PKT (soak compressed on owner's order)
- [x] metricMoneyByAccount: per-account sums + daily series straight from the mirrored R/S/T rows
- [x] WO-03: Business overview range tiles = register (Σ Raw Profit / Σ VAT to HMRC / Σ True Order Earning / sheet Sold + eBay sub-line + rows coverage / margin / open orders); VAT card per account from the rows; rating strip from eBay standards; invented formulas GONE from captions
- [x] WO-04: Sales analysis month tiles = register with account chips + coverage note ("rows 0 of 82" on a fresh month — honest zero, labeled)
- [x] WO-05: Account report + Account KPIs merged (view-kpis2) — all accounts incl Sir Hasib, 7/30/90d, tiles with chips, Sold-vs-Actual daily chart on Pakistan days, day table, old route redirects
- [x] Home Yesterday = SOLD_SHEET/ACTUAL_PROFIT/VAT + rows coverage
- **EVIDENCE: Truth Check 17 PASS · 0 FAIL after tier-3; merged KPIs page live (30d: books £101,465.78 · actual £15,409.21 · VAT £4,548.25 · 2,566 rows · chips ✓); Sept MTD renders £0.00 books / £789.36 eBay / rows 0 of 82 — coverage replaces every 'behind' banner. Penny audit runs nightly 03:00 PKT; per-row T=R−S checks pass on every mirrored day so far. money flag: LIVE (owner's standing order).**
## Phase 3 — Orders ✅ COMPLETE 1 Sept 2026, 06:0x PKT
- [x] WO-07: Dispatch rebuilt on the truth model (view-orders2-dispatch): 7 state tabs = the metrics' own rows, hero tiles, state reasons, eBay re-pull button, zero workbook references
- [x] Home 'Late right now' + overview open-orders read LATE_NOW/AWAITING_DISPATCH — same function as Dispatch (HOME_EQUALS_OVERVIEW by construction)
- [x] openSync every 5 min (complete-run guarded, D1-stamped); orderSync/orderBackfill carry payment truth; the 5 ghosts fetched per-order — eBay shows them closed, they left 'late' entirely
- **EVIDENCE: Dispatch shows LATE 0 (£0.00) · DUE 1 · AWAITING 586 · OPEN 587 (0+1+586=587 invariant ✓); old page claimed 'late 5 · £155.13' for 39–93-day-old closed orders. Truth Check PASS on LATE_NOW/AWAITING_DISPATCH for every account. Screenshot taken. orders flag: LIVE.**
## Phase 4 — Advertising ✅ COMPLETE 1 Sept 2026, 06:1x PKT (WO-08, WO-13, WO-03 §7–8)
- [x] `campaign_ads` carries eBay's own per-ad state (`ad_status`, `ad_group`); adsItems captures
  `adStatus` verbatim, UPDATEs it for unchanged memberships (a pause lands even when membership
  didn't change), and walks ENDING_SOON campaigns like RUNNING. 14 manual rounds stamped all six
  accounts.
- [x] ONE definition of live (`liveMembershipRow`, spec §9.4) + display chips
  (`memberChipStatus`): LIVE / AD PAUSED / CAMPAIGN PAUSED / ARCHIVED / LISTING ENDED. Un-stamped
  CPC rows (ad_status NULL) keep the pre-WO-08 meaning until stamped — matches dupSweep, so Path
  A and the dup feed cannot disagree while converging.
- [x] `metricAds` + `adsTruth`: the four-way partition; `ADS_SPLIT`/`LEAKS_DAILY` on pageMetrics.
- [x] `adsPauseListing` — the ONE portal→eBay write, user-click only (R10), CPC only, confirmed
  by reading the ad back, logged to campaign_events with the actor.
- [x] dupSweep: ENDING_SOON counts as running; paused CPC ads no longer count as duplicates.
- [x] WO-13 `signalReeval` (15-min cron): dup alerts auto-resolve when the listing leaves
  dup_state; day-scoped wasting alerts close when their day ends — reason on the row.
- [x] Pages rebuilt (`view-truthAds.js`): Live listings 4 tiles + printed invariant; Wrong
  advertising (multi / both-live / none, membership chips, CPC ✕); Campaign watch wrapped with
  the register dup panel. WO-03 §7–8: overview CAMPAIGN GAPS tile + LEAKS strip (ads_daily +
  refunds, refund labeled "on the order's sale day").
- **EVIDENCE (deployed worker 01:10 UTC, verified live): SPLIT_SUMS_TO_ACTIVE PASS × 6 accounts
  (138+155+186+126+160+154 = 919 ACTIVE, partition exact, invariant_split_ok true).
  Split: CPC-only 157 · General-only 450 · Both 17 · No campaign 295. MULTI_RUNNING = 25 —
  the old page said 391 because it counted PAUSED CPC ads, paused/ended campaigns and ended
  listings as live memberships; with eBay's own adStatus + campaign/listing state, 25 listings
  are genuinely live in 2+ running campaigns. Truth Check: 54 PASS · 0 FAIL · 19 STALE
  (unwritten day tabs) · 0 UNVERIFIED. ads + catalogue flags: LIVE.**

## Phase 5 — Workflow & structure — IN PROGRESS (WO-02 ✓ · WO-09 ✓ · WO-11 ✓ · WO-12 building)
- [x] WO-02: merged Management desk (`view-truthDesk.js`) — tabs Waiting on you / Queues /
  Departments; approvals decided inline (approve / return-with-comment), rejection requests as
  rows-with-picker, hunt approvals listed with the jump to their 4-input form; Departments =
  `deptPendingEngine` → shared `metricDeptTasks` (one function feeds tile and list);
  `#deptBoard`/`#approvals` are hidden redirects (sidebar shows ONE desk entry, badge =
  everything waiting on Management); TASKS_OPEN_BY_DEPT verified 15-min (PASS all depts:
  Advertising 46/46 · Listing 149/149 · General 5/5 · CS 0/0).
- [x] WO-09: CPC_LIVE_EVENT flow in adsItems (baseline-safe: a never-synced campaign records
  memberships, no events; 30-day dedupe per listing) → keyword_tasks for Zain
  (m98mfour@gmail.com, DECISIONS #6) with opens_at = live_at+72h, due_at = live_at+96h;
  keywordBoard/keywordDecide with the four outcomes (REVISE_NOW → Management request row +
  letter; REVISE_LATER → follow-up capped at 3; NO_REVISION; ARCHIVE — every outcome archived
  in keyword_docs); page section + searchable archive on Keyword approvals; open keyword tasks
  count into Departments→Advertising in BOTH truth paths; AS cpcKeywordSweep retired (dual
  task-making would hand Zain the same work twice).
- [x] WO-11: multi-link AliExpress check card on Product hunting (short links resolved
  server-side ≤3 hops, ids normalised, hunt records live from AS + supplier/listing mirror from
  D1 `aliCheck`); the SAME id check blocks submitHunt on duplicates unless Management sends an
  override note (logged HUNT_DUP_OVERRIDE); backfill = parse-at-read across every stored link +
  `huntAliCheck {stats:true}` reports parsed/failed. tasks + hunting flags: LIVE.
- [ ] WO-12: inbox rebuild (D1 threads/messages/recipients, 30/page cursor, optimistic send).
  R2 probe (1 Sept): **NOT enabled** on the account (API 10042 "Please enable R2") — per spec,
  attachments go to DECISIONS-NEEDED #3 with the Drive fallback; no public bucket shipped.
- [ ] Home CS tile → CS_NEEDS_REPLY register metric.

## Phase 6 — Cleanup — NOT STARTED
