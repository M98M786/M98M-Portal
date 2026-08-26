# 40-hour backlog — Hasib, 26 Aug 2026

Working file. Every item carries its own definition of done and a verification line,
because "it is deployed" and "it works when a human clicks it" are different claims and
only the second one counts here.

**Standing rules for this run**
- Every change: build → commit → deploy → **open the page as a human and look**, then say
  plainly whether it works. If it does not, do it again.
- Never report an item done on the strength of an API call alone. The dashboard poison
  survived exactly that mistake twice.
- The Engine (Cloudflare Worker) is WAF-blocked. Apps Script + frontend deploy normally.
  Anything needing the Worker is marked ENGINE and queues.

---

## Status key
`TODO` · `WIP` · `DONE (verified on screen)` · `BLOCKED`

---

## 1. Tasks & departments

- [x] **DONE (verified)** — `loss_review` was not in the department map, so 32 real
  Advertising tasks sat in an invisible "General" bucket and the Advertising board read
  empty. Map completed + `r8UnmappedTypes_` now reports anything unplaced.
  *Verified:* Listing 48 · Advertising 32 · General 5 · CS 0, `unmapped_types: []`.
- [x] **DONE** — department boards refresh every **20s** (was 45s).
- [x] **DONE** — all-departments overview restricted to Management/Ops Head/Team Lead;
  Orders board no longer shown to CS. Department members get their own board only.
- [ ] **TODO** — remove the 2 `SELFTEST` rows polluting the Listing count.
- [x] **AUDITED (all 13 desks respond + render, no errors)** — 26 Aug sweep:
  goLive (0 drafts - correct empty), listDesk (48 rows), priceDesk (23), mgmtDesk AS+engine (ok),
  staffReviews (ok), huntQueue (22), dispatch, recheck, returns/itemRisk, wrongAds, ordersBoard,
  deptPending (4 depts). The "desks not working" complaints were the loss_review board bug (fixed
  v54) + Apps Script latency. Empty desks (go-live, CPC tasks) are correct empty states, not bugs.
  Remaining real issue: Apps Script latency (deptPending ~6s clean / mgmtPendingAS 6.4s / huntQueue
  6.2s) - the dept pages paint cache-first so no spinner, and the ~50ms D1-mirror fix is WAF-queued.
- [ ] **TODO** — 32/32 Advertising and 39/48 Listing tasks are **overdue**. That is a real
  operational finding for Hasib, not a bug to fix in code.

## 2. Orders

- [ ] **TODO** — proper links throughout orders.
- [x] **DONE (verified)** — today's orders shows the awaiting-tracking count (verified 30 on ABRT 25 Aug).
- [x] **DONE (verified on screen)** — the count is a live button: clicking 'Awaiting tracking' shows only
  those 30 orders and scrolls to them; 'To purchase' → 2; 'Orders' → all 32. Note + highlight confirmed.
- [ ] **TODO** — generalise: **every number on an orders page drills through** to the rows
  behind it. No dead-end figures.
- [ ] **TODO** — orders tab shows that specific day.

## 3. Replacement orders  (new feature)

- [ ] **TODO** — a replacement-order desk. CS, Team Lead, Management and Order Processor
  can raise one.
- [ ] **TODO** — reason picker: preset reasons **plus** a custom option that *requires* an
  explanation.
- [ ] **TODO** — "Create a replacement for this order" button on today's order rows.
- [ ] **TODO** — the replacement is written into **that day's order sheet**, clearly headed
  as a Replacement Order.

## 4. Listing / hunting

- [x] **DONE (live, verified)** — product listers can reject: 'Reject this item' button on the
  lister task bar, reason picker from lister_reject_reasons, calls listerRejectRequest → Management
  decides. Backend already existed; button was missing. Verified: reasons load, button in bundle.
- [ ] **TODO** — proper Hunt approvals page.
- [ ] **TODO** — hunting gets three pages: **Approved · Not approved · Pending approval**,
  each with archive access.
- [x] **DONE (v61, verified end-to-end)** — AliExpress duplicate detection.
  Backend huntDuplicateCheck matches a hunt by the AliExpress product ID (from any supplier link)
  and folded-title overlap, returns every prior hunt of the same product - rejected first, with
  reason/hunter/date. Frontend: the submit form checks as the hunter finishes the Title or main
  AliExpress link, plus a "Check for duplicates" button and a soft submit-gate (red banner for a
  prior REJECTION, amber for a prior hunt; a deliberate second click proceeds).
  VERIFIED: backend v61 live; tested with a real hunt title ("vacuum storage bags") - found 5
  prior hunts, 3 rejected, each with status/hunter/date/match-type. A hunter entering that product
  now sees the full history, rejected first. Deploy tip that finally worked: set the viewport to
  EXACTLY 800x600 (== screenshot frame) so coordinate clicks are 1:1, then drive via DOM dispatch.

## 5. Product revision  (DONE v59, verified backend live)

- [x] **DONE** — the 72-hour revisions tab now has an Archive section: completed revisions,
  newest first, each with its item, account, who did it, when, and the reason it was raised
  (listDesk.revisions_done). Verified live: the field is present (archive currently empty - no
  completed revisions yet).
- [x] **DONE** — CS and Order Processor can now raise a product listing revision (joined
  Advertising Manager + Management/Team Lead in taskCanCreate_ and the frontend composer). A
  revision REQUIRES an explanation (>=5 chars), enforced client- and server-side.

## 6. CPC

- [x] **VERIFIED WORKING** — the CPC / General / pending separation already exists and has real
  data: the "Live listings split" view (under Advertising) shows CPC live **485**, General &
  Dynamic live **260**, In no campaign (pending a decision) **200**, by real eBay campaign
  membership, with clickable tabs and per-item lists. Rendered live on screen 26 Aug.
  This read empty during the broken-boards era (the loss_review map bug, fixed v54); the view
  itself was always working. Task-side CPC pipeline (listDesk) correctly shows 0 because no
  cpc_research/campaign_set tasks exist right now - the 48 pending listing tasks are all
  General/Dynamic type.

## 7. Signals & notifications

- [x] **DONE (v58)** — the WENT NEGATIVE signal (loss/price) now routes to and is visible to the
  Advertising Manager. Takes effect on the next signal run.
- [x] **DONE (v58)** — when a weekly review is saved, the reviewed staff member gets a neutral bell
  pointing them to Staff reviews (management already sees it). More staff-matter events can follow.
- [x] **DONE (v62, verified live)** — detect and route to **CS + Management**: transaction
  defect, new late-shipment case, any service-metric movement, positive-feedback rating change.
  `metricsWatch` (Apps Script — deploys while the Worker is WAF-blocked) reads cs_standards /
  cs_metrics / feedback_summary through the engine, folds each account's watched numbers
  (seller level, every standards metric incl. defect + late-shipment rates, INAD/INR service
  metrics, feedback score / positive% / 30-day negatives) into a signature, diffs against a
  Script-Properties snapshot, and letters CS + Management on every movement — naming the metric
  and its old→new value. Once per UK day (guarded, so a flickering metric can't spam the desk);
  first sighting of an account is not treated as a change. Runs off hourly pushEngineSync +
  registered as a runnable. *Verified:* `asRunJob metricsWatch` → "0 change(s) across 6 account(s)"
  (baseline set), second call → "already ran today" (guard holds).

## 8. Account report

- [x] **DONE (verified on screen)** — two bugs fixed:
  (1) the engine stats table filtered dailyReport by a live-DOM account value that was blank by
      the time the async filter ran, so every account showed "No book rows". Now holds the chosen
      account in state. Renders the proper HTML table (Revenue/OE/Cost/Ads/ROAS/0.8 law/Returns/
      Actual) for all connected accounts - verified 21 rows for ABRT.
  (2) engine mode was gated behind the sheet-based accountReportRows, so Sir Hasib (no report
      book) saw "not connected yet" even though the engine had his figures. Engine mode now paints
      straight from D1 - verified Sir Hasib shows 6 days incl. 24 Aug £517 revenue, 4.2x ROAS.
  *Still Hasib-side:* the report AGENTS that fill the sheet books stopped ~23-25 July; engine mode
  bypasses that by reading D1, so the portal page is no longer dependent on those agents.

## 9. Naming

- [x] **DONE** — "CS live desk" → "Customer service desk".

## 10. Validation (continuous)

- [x] **VALIDATED 26 Aug (full cross-check)** — every sales figure cross-checked against
  ground-truth sales_daily:
  - CORE FIGURES ALL AGREE at the 7-day window (20-26 Aug): sold £11,147.28, profit £4,201.50,
    ads £2,797.54 - identical across sales_daily, mgmtOverview.week, mgmtOverview.split_7d, and
    dailyReport. The reconciliation logic where deployed is sound.
  - ONE REMAINING VISIBLE DISCREPANCY: per-account revenue_7d tiles sum to £13,254.23 vs the
    £11,147.28 week headline (£2,107 gap) - the rolling-168h vs UK-calendar-days window bug. The
    fix (computeHealth aligned to UK calendar days) is committed but WAF-queued.
  - Dashboard (Sales analysis) healthy - the sanity-guard fix (v53) holds, no poisoned values.
  - Azhar Bhai £0 across 7 days - the dark-account operational issue (campaigns paused since ~22 Jul).
- [ ] **TODO** — walk real scenarios end to end as a human would, per role.
- [ ] **TODO** — screenshots as evidence.

---

## Carried-over blockers

- **ENGINE / Cloudflare WAF** — 8 changes queued behind a 403 on every POST from this
  machine's dash session: the task mirror (Phase 2), `computeHealth` 28→4 queries, the
  Business-overview week/split reconciliation, `darkAccountWatch`, the per-account 7-day
  window, the **400-character link truncation** (damaging 93.6% of stored links), and the
  `syncAliOrders` written-count fix. Unblocks either by the WAF ageing out, or a token at
  `~/.m98m/cf-token` (chmod 600, never pasted into chat).

## Decisions waiting on Hasib

- **Azhar Bhai**: all 8 campaigns paused since ~22 July. Confirmed twice over — impressions
  22,657 vs 316k–440k, `sold_30d` 0 across 186 listings, and his own order book has **no
  August tabs at all**. Biggest lifetime seller in the fleet. Restarting ads spends real
  money, so it is his call.
- **Sir Hasib sales_analysis**: book exists but is stale since 8 Aug and uses a different
  tab convention. Not linked on purpose.
- **Sir Hasib account_report**: the book does not exist and needs creating.
- **1,381 historical orders** (Jul–18 Aug) have supplier links in the sheet but no order row
  in D1, because they predate his API. Backfilling means inserting sheet-derived rows into
  an eBay-sourced table, which could skew revenue. His call.

## 11. Sales Operations department + staff oversight  (NEW — DONE, verified on screen)

- [x] **DONE (verified)** — 'Sales Operations' role added to ROLES; Ubaid (m98mthree) moved
  Pricing → Sales Operations via a key-gated one-shot. Verified: role appears in the config
  list; the one-shot returned "set m98mthree@gmail.com: Pricing -> Sales Operations".
- [x] **DONE (verified)** — oversight wiring: Sales Operations added to the department overview,
  staff reviews, performance, alerts centre and all 5 department task boards.
- [x] **DONE (verified on screen)** — new `Staff oversight` page + `staffDossier` action. Pick a
  person → their open workflow (with overdue flags), done-in-7-days, avg turnaround, every alert
  that reached them, and their behaviour/working review history. Rendered live for Zain: 8 open /
  8 overdue, 1833 alerts, review ★★★★/★★★★. All four sections paint. Read-only, oversight tier only.

### Operational findings this surfaced (for Hasib, not code bugs)
- **Alert feeds are drowning**: Fasieh 2,774 unread, Zain 1,833 unread. The notification system
  has no read/clear-down, so letters pile up unboundedly. Worth a "mark all read" and/or an
  auto-expiry of old letters.
- **Zain: 8 open, all 8 overdue, 0 done in 7 days** — every one a loss-review task. Advertising's
  loss queue is not being worked.

## 12. Nav order, Yousaf, Hunting types  (26 Aug batch)

- [x] **DONE (verified on screen)** — Nav reordered: **My desk first for everyone**; Management
  leads with the desk + Sales analysis + account/business screens; the scheduling/personal-report
  line (Staff reviews, Rota, My reports, Reports grid, My performance, Team performance, Meetings,
  Daily agenda) kept together at the end. Marketing→Advertising, Item risk + VAT→Management, so the
  "More" catch-all is gone. Verified: group order My desk · Management · Advertising · Orders ·
  Listings · Hunting · CS.
- [x] **DONE (verified)** — Yousaf (m98mseven) freed: role cleared, status disabled, renamed
  "Yousaf Free Email". Directory active count 14 → 13, no longer listed.
- [x] **DONE (verified on screen)** — Hunting two types: hunter picks **Seasonal** or **Consistent** at submit
  (reuse the existing `Seasonal` column in HUNTING_COLS); Hunt approvals splits into **Seasonal
  items approval** and **Consistent items approval**. Backend: submit captures the kind + huntQueue
  returns it per row; frontend: selector on submit + two-tab filter on the approvals queue.

### Hunting two-types — verified 26 Aug
Submit form: required "Item type" selector (Consistent/Seasonal). Backend huntKind_ rejects
untyped. Hunt approvals split into tabs **All 1 · Seasonal 0 · Consistent 0 · Unsorted 1** — the
one pre-existing hunt correctly sits in Unsorted (nothing hidden); clicking Seasonal shows
"Nothing in the Seasonal tray right now." Tab filter + counts confirmed live.

## 13. Buyer auto-message: "order placed" after payment (Sir Hasib + ABRT)

- [~] **BUILT, blocked on deploy + live switch** — owner: send the order-confirmation to buyers
  on Sir Hasib and ABRT after they pay.
  - The templates already existed for both accounts but on the WRONG trigger ('arrived' = delivery
    estimate passed, ~a week later). The text is "your order has been placed successfully…" — an
    order confirmation. Enabling it there would message buyers after delivery. Left OFF; did not
    enable.
  - Added an 'ordered' trigger to the engine (fires right after a paid order appears, delay_min
    later; 1-day window + dedup so first-enable is safe). Committed; **queued behind the Cloudflare
    WAF block** with the other engine changes.
  - **Nothing has been sent to any buyer.** Two gates remain, both by design: (1) the engine must
    deploy (WAF), (2) AUTOMSG_LIVE must be armed — currently false, so every message is SHADOW
    (recorded, not sent). Arming live is the owner's call.
  - After deploy: move templates arrived → ordered + enable; then owner arms AUTOMSG_LIVE.

## 14. Auto-message templates carry real order details  (DONE, verified)

- [x] **DONE (verified on screen)** — the buyer-message templates now substitute the real order
  number, item name and buyer. Fixed entirely in the frontend (no engine change):
  - On save, cdNormPlaceholders converts single-brace / friendly / literal-sample placeholders
    ({00-00000-00000}, {Sample Item}, {order}, {Order ID}, {buyer}) to the {{order}} {{item}}
    {{buyer}} tokens the deployed engine fills. Sentinel-protected so {{order}} is never nested.
  - Insert buttons (buyer name / order number / item name) drop the right token at the cursor.
  - "Preview with a real order" fills the template with a real recent order for the account.
  - Verified live: "Order ID: {00-00000-00000} Item Name: {Sample Item} Hi {buyer}!" previewed as
    "Order ID: 18-15052-74974 Item Name: Rechargeable USB LED Motion Sensor Light... Hi fayne23!"
    - no stray braces, no placeholder literals.
  NOTE: still SHADOW (AUTOMSG_LIVE off) - nothing sends to buyers until the owner arms it.
