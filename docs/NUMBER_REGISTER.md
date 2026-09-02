# NUMBER REGISTER — v0 (Phase 0 inventory)

State of 1 Sept 2026. `today_source` = what the number reads RIGHT NOW (pre-truth-layer).
The v1 register (§4.2 of TRUTH-UPDATE-v2) replaces these row by row as each module ships; the
target ids and definitions live in the spec and are not duplicated here.

## A. Where every page gets its numbers today (file → backend actions)

| view file | routes | today's backend actions |
|---|---|---|
| view-accountHealth.js | accountHealth | accountHealth, ebayConsentLinks, ebaySubmitConsent, runJobNow, selfTest |
| view-accountReport.js | accountReport | accountReport2, accountReportRows |
| view-activeListings.js | activeListings | activeListings |
| view-admin.js | staffAdmin | approveUser, assignableStaff |
| view-adsCentre.js | adsCentre | adsBoard |
| view-advertising.js | advertising, wrongAds | accountList, campaignWatch, instructionsFeed, ppcTable, setCampaign, wrongAdvertising |
| view-advertisingMoney.js | advertising | adsBoard |
| view-agenda.js | agenda, meetings | agendaHistory, congratulate, createMeeting, meetingGrid, myMeetings, rsvp, setAgenda, todayAgenda |
| view-alerts.js | alerts, kpis | accountDay, accountKpisEngine, alertMail, alertMailResolve, alertMailResolveAll, resolveAlert |
| view-calculator.js | calculator | (static) |
| view-campaignWatch.js | campaignWatch | campaignRemoveItem, campaignWatch |
| view-cpc.js | cpc, keywordApprovals | approveKeywords, competitorList, cpcWorkspace, myTasks, pendingApprovals, returnKeywords, submitCpcResearch |
| view-cs.js | cs, returns | accountList, createCase, csCases, updateCase |
| view-csDesk.js | csDesk | ackViolation, autoMsgConfig, autoMsgSet, csDesk, csRefund, csReply, ordersBoard |
| view-dailyReport.js | dailyReport | dailyReport |
| view-dashboard.js | dashboard | dashboard, itemPnl, refreshDashboard, salesAnalysisRows |
| view-deptBoard.js | deptBoard | (static) |
| view-deptTasks.js | — | (static) |
| view-feedback.js | feedback | feedbackBoard |
| view-goLive.js | goLive | enterItemId, goLiveReturn, listingPipeline, myListingWork |
| view-huntDesk.js | huntDesk | huntDesk |
| view-huntRecords.js | huntRecords | huntRecords |
| view-hunting.js | hunting, huntQueue | accountList, assignableStaff, calcProjectedProfit, decideHunt, huntDuplicateCheck, huntQueue |
| view-ideaBox.js | ideaBox | ideaDecide, ideaList, ideaSubmit |
| view-inbox.js | inbox | listThreads, markNotifRead, markThreadRead, poll, rsvp, sendMessage, threadMessages |
| view-itemRisk.js | itemRisk | itemRisk |
| view-listDesk.js | listDesk | huntReasons, listerRejectRequest |
| view-listing.js | listing | createRevision, enterItemId, listerClearFlag, listerDraft, listerNeedInfo, listerNeedTime, myListingWork, revisionRevisit |
| view-listingArchive.js | listingArchive | myListingWork |
| view-listingDecisions.js | listingDecisions | decisionAct, zeroSaleDecide, zeroSaleList |
| view-liveSplit.js | liveSplit | activeSplit |
| view-marketing.js | marketing | marketingBoard, promoMembers |
| view-mgmtDesk.js | mgmtDesk | listDesk, mgmtPendingAS, mgmtPendingEngine, mgmtRejectDecide |
| view-orders.js | orders, dispatch | courierList, dispatchDashboard, dispatchLive, orderAddAliLink, orderFind, orderPushTracking, ordersLive |
| view-ordersBoard.js | ordersBoard | oosReport, ordersBoard |
| view-overview.js | overview | activeListings, csDesk, dailyReport, fundsSummary, itemPnl, mgmtOverview, mgmtPulse, teamPerformance, vatBoard |
| view-performance.js | perf, team | assignableStaff, saveEvaluation, teamPerformance |
| view-pipeline.js | pipeline | connectionHealth, huntQueue, myListingWork, potentialCpcQueue |
| view-potential-cpc.js | potentialCpc | decidePotentialCpc, submitPotentialCpc, switchPotentialCpcCampaign |
| view-priceDesk.js | priceDesk | priceAck, priceBoard |
| view-recheck.js | recheck, wrongOrders | accountList, assignableStaff, deliveryCheckpoints, logWrongOrder, recheckFeed, recheckQueue, submitRecheck, wrongOrderCounters |
| view-replacements.js | replacements | replacementCreate, replacementList |
| view-reports.js | reports, reportsGrid | myCheckpoints, reportsGrid, submitReport |
| view-rev72.js | rev72 | (static) |
| view-revisionDesk.js | revisionDesk | assignableStaff, createTask, revisionDesk |
| view-rota.js | rules, rota | retireRule, ruleAckGrid, setSchedule |
| view-signals.js | signals | acknowledgeSignal, myAttendance, mySignals |
| view-sourcing.js | sourcing | sourcingBoard, sourcingSave |
| view-staff.js | staffAdmin | accountList, accountsAdmin, addStaff, approveUser, assignableStaff, deactivateStaff, listPending, reactivateStaff, reassignTasks, removedStaff, saveAccount, updateStaff |
| view-staffOversight.js | staffOversight | staffDossier |
| view-staffReviews.js | staffReviews | staffReviewHistory, staffReviewSave, staffReviewsPending |
| view-tasks.js | tasks, approvals | approveTask, createTask, huntReasons, listerClearFlag, listerDraft, listerNeedInfo, listerNeedTime, listerRejectRequest, myTasks, pendingApprovals, returnTask, startTask, submitTask |
| view-tools.js | tools | toolHtml, toolStateLoad, toolStateSave |
| view-traffic.js | traffic | trafficBoard |
| view-vatBreakdown.js | vatBreakdown | itemPnl, vatBoard |

Action resolution: actions in `ENGINE_ACTIONS` (src/shell.html) go to the Cloudflare Worker
(engine/worker.js); everything else goes to Apps Script /exec (apps-script/Router.gs merges the
per-module ACTIONS_* maps). Maths lives in BOTH places today — that is the disease v2 cures.

## B. The money source (Phase 0 finding — resolves DECISIONS #1)

- The **money workbook is the per-account sales-analysis workbook**, and the order rows live in
  its DAY TABS (named like `28th August 2026`). One identical 22-column layout across all six
  books: A Item Title · B Total Sales/Sold For · C Total Sale HMRC VAT · D Final Value Fee-eBay ·
  E Regulatory Fee-eBay · F FVF+Reg incl VAT · G FVF & Reg VAT Paid · H eBay Order Earning ·
  I Total AliExpress Cost incl VAT · J AliExpress VAT Paid · K Qty Via Promoting · L Priority
  Fees Dashboard · M Add 20% On Priority VAT · N Total Priority incl VAT · O Qty Sold Via
  General · P General Fees incl VAT · Q General Fees Minus 20% VAT · **R True Order Earning ·
  S VAT to HMRC · T Raw Profit** · U Returns · V Actual Profit.
- The order-processing workbook's day tabs carry NO R/S/T — no ambiguity.
- **Ported formulas (identical in all six books, first three data rows verified):**
  - `True Order Earning (R) = H − I − N`
  - `VAT to HMRC (S) = C − G − J − M − Q`
  - `Raw Profit (T) = R − S`  (the invariant holds by construction — T is a formula)
- **The money rows carry no order-id column.** Sheet↔API joins are therefore per Pakistan-day
  only (counts and sums); the penny audit compares per-row R/S/T arithmetic and day totals,
  never per-order across sources.

## C. Current fake-number inventory (R3 targets)

- `Math.random`: 4 uses in view-agenda.js (confetti animation — cosmetic, keep) + 1 nonce in
  Engine.gs stamps (not a displayed number).
- `|| 0` coercions: 177 in engine/worker.js, 271 in frontend — each becomes either a real value
  or `—` with a source chip as its metric ships.
- 'sample|demo|placeholder' matches: 32 (mostly input placeholder attributes; the true
  placeholder VALUES are: Sales analysis 'VAT TO PAY — history still building' tile and every
  banner listed in WO-04).
- Hardcoded account names: killed in the UI on 30 Aug (shared fillAccountSelect); 1 cosmetic
  placeholder string remains (view-revisionDesk.js:91) + comments/messages.

## D. Existing workbook WRITE paths (R10 baseline — these keep their credentials; nothing new)

| writer | target | columns |
|---|---|---|
| SheetBridge `orders_day` tag (engineSheetWrite) | order-processing day tabs | Cost, Order Number, Tracking number, Email, Delivery Status, New Ali Link |
| Advertising §8.7 | Central Main Sheet | campaign columns + title |
| huntBackupUpsert_ / HuntBackup | hunting backup workbook | hunt trays |
| portalStatsWrite_ | Sir Hasib analysis book | PORTAL STATS tabs (auto) |
| sirHasibMonthlyFill | Sir Hasib analysis book | Monthly Sheet missing day rows |
| bookFix (nightly) | all analysis books | Monthly Sheet corrections + Date-cell notes |
| NightBackup / AuditAgent / Registry one-shots | backups & Portal DB | — |

**None of these touches the day-tab money columns (R/S/T) — already compliant with R10.**
`bookFix`/`truthCheck`/`sirHasibMonthlyFill` are legacy of the 30-Aug truth work; they retire
when the `money` module flips (the Truth Check supersedes them).

## E. Scopes & tokens (per account)

- Tokens: refresh tokens per account in worker config; access tokens cached in KV `ebaytok:<name>`;
  minted WITHOUT a scope param so the original grant's scopes apply.
- Evidence of working scopes (sync_state, 1 Sept: ZERO standing errors): sell.fulfillment ✓,
  sell.finances ✓ (signed calls incl funds), sell.marketing ✓, sell.analytics.readonly ✓,
  Trading/listings ✓ — for ALL SIX accounts. Azhar Bhai's syncs succeed (the account is dark
  commercially, not technically).
- The Finances host apiz.ebay.com + ED25519 digital signatures are already implemented.

## F. Account registry gaps (vs §3.4)

- D1 `accounts` today: only `name, api_enabled`. Missing: ebay_username, ebay_user_id,
  workbook ids, oauth_kv_key, colour, sort_order — Phase 1 migration fills from CONNECTIONS +
  Trading GetUser.
- CONNECTIONS registry captured in scratchpad/phase0-dump.json (39 rows: 6 accounts × up to 4
  kinds + 15 global sheets/tools). Azhar Bhai `order_processing` = not connected yet.

## G. Advertising metrics (Phase 4, WO-08 — added 1 Sept)

One definition of **live membership** (worker `liveMembershipRow`), used by every count:
campaign status ∈ {RUNNING/ENDING_SOON} AND listing ACTIVE AND, for COST_PER_CLICK,
`ad_status = 'ACTIVE'` (eBay's own per-ad state, synced verbatim by adsItems); for
COST_PER_SALE, the ad exists and is not ARCHIVED (General ads carry no per-ad status).

| metric_id | definition (Path A) | verifier (Path B) |
|---|---|---|
| ADS_SPLIT.cpc_only / general_only / both / none | partition of ACTIVE listings by live memberships | SPLIT_SUMS_TO_ACTIVE |
| SPLIT_SUMS_TO_ACTIVE | cpc+gen+both+none per account | independent COUNT(items_api ACTIVE), truthTier1, 15 min |
| MULTI_RUNNING | ACTIVE listing with ≥2 LIVE memberships (paused ads/campaigns excluded) | dupSweep (separately written, same exclusions) |
| LEAKS_DAILY | ads_daily spend/day (both families) + orders.refunded shown on the order's sale day | tier-3 nightly vs books' N column |
| CPC pause | `adsPauseListing` action — the ONLY portal→eBay write; user-click only, never from a cron (R10); confirmed by reading the ad back |

Display chips per membership: LIVE · AD PAUSED · CAMPAIGN PAUSED · ARCHIVED · LISTING ENDED —
worker `memberChipStatus`, mirrored on Campaign watch / Wrong advertising / Live listings.

## UP-TO-DATE money (2 Sept, owner's law refinement)
"Use the mind of sales analysis but take up to date from API." Business overview headlines
`*_UPTODATE`: per ACCOUNT-DAY, the books stay the number when the day is filled (its own GRAND
TOTAL row, or >=90% of that day's API orders present as item rows); an unfilled day-book
headlines the eBay API pushed through the sheet's own chain — TE = Sold − fees − Ali;
VAT = Sold/6 − fees/6 − Ali/6 − 20%·ads (S = C−G−J−M−Q); Raw = TE − VAT; Actual = Raw − refunds.
Missing fee/cost orders are topped up from the fleet's own last-7-day ratios (`BOOKS_LAG.
estimates_used`, ratios in the same value). The books ids (SOLD_SHEET, ACTUAL_*, VAT_TO_HMRC…)
are UNTOUCHED — every existing truth check still verifies them against the sheet; BOOKS_LAG
carries the lagging account-days for audit. When nothing lags the tiles are books-only,
identical to before.
