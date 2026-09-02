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
- [x] WO-12: inbox rebuilt on D1 (`inbox_messages`/`inbox_threads`, indexes per §3.2 —
  unread badge is ONE indexed COUNT; thread list one query; 30-message cursor pages;
  optimistic send with rollback; 30 s delta poll; participant-only reads enforced server-side,
  Management included). The 24 sheet DMs mirrored in (`inboxDump` — rows 2–25 of 25, complete);
  the sheet is now a frozen archive and its poll no longer writes the badge. New-message bells
  still fire (inboxSend → queueNotify → the notifications feed). **R2 probe (1 Sept): NOT
  enabled on the account (API 10042 "Please enable R2") — per spec, attachments wait on
  DECISIONS #3 with the Drive fallback; no public bucket shipped.** inbox flag: LIVE.
  Shape note (R11 default taken): DMs are two-party here, so recipient state lives on the
  message row (to_email, read_at) instead of a separate message_recipients table — same
  indexes, same query costs; a group-thread table split is a mechanical migration if group
  chat is ever wanted.
- [x] Home CS tile: reads csDesk's own `our_move` rule (tile = the list it opens by
  construction) and the rule itself is now verified 15-min as CS_NEEDS_REPLY (JS regex path
  vs an independently written SQL classification).

## Phase 6 — Cleanup (WO-14) — DONE 1 Sept 2026 (24 h-green gate left running)
- [x] Replaced code paths deleted (~2,900 lines): view-accountReport.js, view-liveSplit.js,
  view-mgmtDesk.js, view-deptBoard.js, view-advertising.js (advertising + wrongAds), the old
  kpis section of view-alerts.js, the old dispatch section of view-orders.js. Desk CSS ported.
  view-inbox.js stays for now: its module-level `api('poll')` machinery drives the phone-style
  notification pops and the bell for the WHOLE portal — only its inbox-page body is dead;
  extracting the poll into the shell is a separate mechanical change.
- [x] 30-Aug truth machinery (bookFix / truthCheck letters / sirHasibMonthlyFill) removed from
  the nightly chain per DECISIONS #11 (money live) — still hand-callable via ENGINE_RUNNABLE.
  AS cpcKeywordSweep retired (WO-09 replaces it).
- [x] Docs: SYNC.md (every job, cadence, re-run commands), TRUTH-CHECK.md (statuses, tiers,
  what to do on FAIL), CHANGELOG.md, NUMBER_REGISTER.md §G advertising.
- [x] Fake-number grep: `Math.random` appears only in the agenda confetti animation (visual,
  no data); `placeholder` hits are input placeholders/comments; no sample/demo data paths
  remain in the bundle.
- [x] Sidebar build stamp auto-bumps per build (scripts/build.py, footer shows `build <stamp>`).
- [ ] **GATE: Truth Check green for 24 h** — standing at 54+ PASS · 0 FAIL as of the flip;
  the 15-min tiers keep scoring it. Deploys: worker 01:34 UTC 1 Sept; Apps Script **v88**
  ("Deployment successfully updated. Version 88 on Sep 1, 2026, 6:33 AM"), same /exec URL.
- Backfill evidence (WO-11): `huntAliStats` — **408 links, 408 parsed, 0 failed (100 %)**.


## 1 Sept evening — full click-through validation (owner-requested), fixes shipped same hour
All 69 visible pages rendered twice (cold + warm) with zero JS exceptions; every safe control
exercised (tabs, ranges, account filters, refreshes, lenses, pickers, the Ali checker live).
Live-fire buttons (approve/return, CPC ✕ pause, refunds, sends) verified present, not pressed.
Found and FIXED during the pass:
- `deptPendingEngine` was never routed to the engine → the merged desk's Departments tab died
  with "unknown action". One-line ENGINE_ACTIONS fix; tab now paints in ~2 s with real counts.
- Engine-only reads detoured through Apps Script on a 2.5 s abort (engineApi fallback), costing
  10–20 s of AS "unknown action" before the engine retry — the reason every truth page crawled
  under load. Engine-only actions now get a patient 15 s first try + 20 s retry, never AS.
- pageMetrics dropped the row lists for DUE_3D/AWAITING_ONLY → Dispatch tabs showed a count
  over an empty list. Rows now flow; capped lists say "showing the first 80 of N".
- Boot: public config now fetched engine-first (worker serves it unauthenticated); a corrupt
  m98m:pident (literal "undefined", found in the wild) no longer kills session restore — the
  token alone restores and sessionHello refetches identity. Both proven by the page
  self-recovering mid-test.
- The bell's LETTERS lost their reading surface at the inbox flip — restored as a Letters pane
  on the D1 inbox (rides the global poller's last answer for instant paint; markNotifRead).
- Desk Waiting tab: a silently failed hunts/approvals feed painted "queue clear" over 2 real
  pending hunts — failures now surface as an amber feed-failed card with retry (R3 for lists).
- Hunt cards on the desk read the workbook's own headers (titles were blank).
- WO-13 backlog: one-time `truthAlertSweep` closed 448 old-generation price/campaign/CPC/waste
  letters as "re-evaluated in Truth Update v2" (658 → 210 current, queues untouched).
- WO-11 proven in production: real supplier link → DUPLICATE (supplier sheet + live listing
  named); unknown id → New; garbage → "not an AliExpress item link".
- Sidebar: Account report redirect hidden (one entry per page).
Non-bugs confirmed: "Hasib" twice in staff pickers = his two real accounts; feedback-page
"refused" = buyer comment text; staffOversight dossier ~26 s = old AS-heavy page (unchanged).
Truth Check during the pass: **59 PASS · 0 FAIL · 15 STALE · 0 UNVERIFIED**; MULTI_RUNNING
converged 391 → 25 → **3** as ad_status stamping completed. Deploys: worker 15:55 UTC,
Pages builds -1532…-1604.
## 1 Sept ~21:30 UTC — evening-peak slowness (owner report) — root-caused and fixed
The register was recomputed from scratch for EVERY viewer of every page (no server cache on the
new truth reads), tier-1 ran the fleet ads pass six times per cycle, pageMetrics scanned the
money mirror twice, and the evening's stream of ~10 builds force-reloaded every signed-in staff
member repeatedly (typing-guarded, but disruptive — "the portal keeps restarting").
Fixes (worker deploy 21:32 UTC, one final frontend build):
- Route-level response cache for the shared truth reads (30–45 s, ROLE-keyed so a cached answer
  can never cross a role gate; per-user feeds stay uncached).
- metricAds: one memoised fleet pass with per-account splits (tier-1 reuses it).
- pageMetrics: one sheet_rows scan (totals derived from the per-account pass).
- signalReeval: 3 batched queries instead of 200 sequential.
Measured on the live portal at peak: pageMetrics 3.7 s → 1.45 s cold → 0.19 s cached;
adsTruth 3.0 s → 0.16 s; overview paints in 0.3 s, dispatch/kpis 1.5 s, Live listings 0.6 s.
Truth Check after the refactor: 59 PASS · 0 FAIL. Standing rule added: batch changes, push
once, prefer worker-only deploys during office hours (no version.txt bump = no forced reload).
Known remaining: Management desk "Waiting on you" ~11 s at peak — the four Apps Script feeds
(approvals, hunts, counts, desk rows) are the sheet backend's latency, not the engine's;
candidate improvement queued: paint each feed as it lands.

## 2 Sept ~00:40–01:00 UTC — THE SHEET LAW (owner's standing order) + alerts/notifications rebuild
Owner (verbatim): "from now on … never show any data other than logic of sales analysis sheet."
- **GRAND TOTAL bug (real number bug, owner's screenshot):** day tabs carry a GRAND TOTAL row;
  every reader summed it, inflating August book figures — and BOTH truth paths read the same
  raw rows, so they agreed while wrong. One gate (`srIsItemRow`) now feeds every reader AND
  both verifier tiers: blank titles and /^(grand )?totals?$/i rows are never items.
- Headline **Actual profit = the sheet's 'Actual Profit' column** (raw − returns); Raw kept as
  the secondary figure. New law columns mirrored per account and per day: Returns,
  'Total Priority incl VAT' + 'General Fees incl VAT' (ads), and the five VAT components
  (S = C − G − J − M − Q) exposed as vat_parts.
- **Sales analysis rebuilt**: today/yesterday/7/30/60/90 · this/last week · this/last month ·
  custom dates; four always-on profit strips; the report sheet's two charts; per-account
  ledger; item-by-item P&L grouped from the day rows (`sheetItems`, losses first).
- **VAT breakdown rebuilt**: the sheet's five VAT columns per account with the equation printed;
  per-day VAT table; full range control incl Last month.
- **Daily report rebuilt**: any single day per account from that day's tabs + 14-day trend.
- **Alerts centre**: `_ALERTS` rows without a message are structural, skipped and counted (the
  "This alert carries no message." cards are gone); department tiles (DATA 47 · ROUTINE 20 ·
  SALES 8 · ADS 4 · HEALTH 2 · SERVICE 2 at ship time) drive the category filter; HIGH alerts
  render big (Signals style); **Create task…** on every alert (department chips → person,
  prefilled title/details/account/priority, the tasks screen's own createTask).
- **Notifications page** (#notifications, all roles): the bell's new home — system letters only,
  big cards, mark read / mark all. The Inbox is people's messages only again.
- September £0.00s were honest (no September day tabs existed in any book yet); found Sir Hasib
  + Amna 31-Aug tabs were created after the mirror's last pass over that day — cold walk
  re-run to backfill; verification anchor: Sir Hasib 31 Aug GRAND TOTAL (sold 724.39 · ali
  273.96 · ads 202.46 · VAT 31.84 · raw 93.62 · actual 93.62 · 21 item rows).

## 2 Sept ~01:10 UTC — the totals-row law, penny-verified
A day tab's GRAND TOTAL row can disagree with the sum of its own item rows (Sir Hasib 31 Aug:
items Σads 185.22 vs totals row 202.46 — hand-verified from the owner's screenshot AND the live
tab). The owner reads the totals row, so where a day has one IT is the headline; item sums are
the fallback; both verifier paths apply the rule independently; the disagreement is reported as
TOTALS_VS_ITEMS (INFO) on Truth Check, never silently resolved. **Live penny check: portal
Sir Hasib 31 Aug = Sold 724.39 · VAT 31.84 · Ads 202.46 · Actual 93.62 · TE 125.47 · Ali 273.96
— identical to the sheet's totals row. Truth Check 59 PASS · 0 FAIL.** Hot mirror widened to
the last 4 PKT days (AS v89) — late-created tabs and ~2-day ad revisions stay fresh.

## QUEUED NEXT (owner, 2 Sept): CS tools as live dashboards
Husnain's CS tools (Reply / Recovery / Defense — today docked embeds on the CS desk) to become
native portal pages with real backends. Not started.
