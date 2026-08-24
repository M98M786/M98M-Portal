# R8 — Department Dashboards, Hunting/Listing Ops, Staff System
**Ordered by Hasib 25 Aug (~00:30 PKT) · execute tonight, live by 3 AM PKT · designed A→Z, step by step**

---

## 0. Two reported bugs (fixed first, in Wave 1)

### 0a. "I create revision tasks for Irfan but he can't see them"
**Root cause (found):** `createRevision` assigns a `listing_revision` task to the named employee — that works — but a **Product Hunter has no "My listings" screen** (`LS_VIEW_ROLES` excludes the role), and that screen is where revision cards render richly. Irfan's only window is the generic **My tasks** row, which nobody told him to check and which shows revisions blandly.
**Fix (two-sided):**
1. The new **Hunting dashboard** (§2) gets a "Revisions required" panel that pulls the hunter's `listing_revision` + hunt-REVISION rows loudly — badge on the nav.
2. `createRevision` notification text for hunter-role assignees points them at the hunting dashboard, not "My tasks".

### 0b. "Report grid not updated" + "business overview / advertising delayed"
- reportsGrid: served through `cachedCall` (stale-while-refresh) with **no as-of stamp and no manual refresh** — feels frozen. Fix: refresh button + as-of line + shorter cache.
- Overview/ads: engine memos (60s) + eBay's own report lag (5–10 min) were compounded by the free-tier throttle killing refresh jobs. Paid plan fixed the throttle tonight. Remaining fix: every money screen shows **"as of HH:MM"** so delay is visible truth, and memo TTLs drop (overview 60s→30s, adsBoard 60s→30s).

---

## 1. Department pending-task dashboards ("Pending tasks for Listing" etc.)

**Data model:** no new tables — `TASKS` already carries type/assignee/status/deadline. Department = mapping from task type + assignee role:
- Hunting: types `hunt_revision`, `sourcing_link`, + hunt queue counts
- Listing: `listing_new`, `listing_revision`, `campaign_set` (lister-side)
- Orders: `supplier_add`, needs-processing bucket
- CS / Advertising / Pricing: their types + alert families

**Backend (AS):** `deptPending` action → for each department: open tasks (Pending/Working/Updated), overdue count, oldest, per-person split; plus `origin` split — **system-generated vs management-generated** using `assigned_by` (system tasks carry `assigned_by` = engine/system; management tasks a person's email). History = last 50 decided tasks per department with origin labels.

**UI:** new view `deptBoard` ("Departments"):
- Management sees every department as a card row: dept name, open count, overdue (red), oldest waiting, top assignee load.
- A department member sees THEIR department's card first + their own list.
- Toggle: "System-created / Management-created / All" + history strip.

---

## 2. Product Hunting dashboard (Irfan + hunters + management)

**One new view `huntDesk` ("Hunting dashboard"), hunter-personal + mgmt-wide.**

Tiles (per hunter + combined for mgmt):
1. **Products hunted** (total / this month) — HUNTING_DB rows by hunter.
2. **Approved** (total / this month).
3. **Revision required** — hunt rows with `REVISION REQUIRED` **plus** open `listing_revision`/`hunt_revision` tasks assigned to the hunter → the §0a fix panel with direct "Revise" links into the hunting form.
4. **Order links required** — engine knows orders whose item has **no sourcing link** (`noSupplierScan` data): join `orders`×`sourcing`-missing → provenance (§2c) names the hunter → tile + auto-task.
5. **Still awaiting approval** — pending queue count for their hunts.

**Pages (tabs within huntDesk):**
- *Revision required* — full list, reasons, revise buttons.
- *Supplier link required* — item, account, order date, "Add link" inline (writes sourcing via `sourcingSave`), auto-created hunter tasks listed.
- *Rejection dashboard* — WHY products get rejected: reason-frequency table from decided hunts' Comments (canned reasons parse cleanly since R7-5), per-hunter and fleet-wide, last 30 days.

**2a. Data-driven rejection reasons.** New CONFIG row `hunt_reject_reasons` (JSON array). `huntQueue` returns it; the chips UI reads it instead of the hardcoded list. **Manager UI**: "Add a reason" box on the approvals screen (mgmt-only) → `configAddRejectReason` action appends. Same for revision-needs list.

**2b. Order-link request (processor → hunter).** On the Orders board / workspace rows with no sourcing link: button "Request link from hunter" → `requestItemLink` action → resolves hunter via provenance → creates `sourcing_link` task + bell. Idempotent per item (one open task max).

**2c. Provenance — who hunted, who listed.** From now on every listed item records both:
- At hunt approval: `listing_new` task details already carry `hunt_id` (has hunter). At **enterItemId** (item goes live): engine action `provenanceSet` stores `{item_id, hunter_email, lister_email, hunt_id, listed_at}` in new D1 table `provenance`. Backfill: walk existing TASKS `listing_new` with item_id + hunt details JSON → seed provenance for the ~fleet.
- Surfaces: item cards, order-link requests, zero-sale decisions ("hunted by · listed by").

---

## 3. Product Listing dashboards

**3a. Listing manager dashboard + lister self view — new view `listDesk`:**
- Manager: all `listing_new`/`listing_revision` tasks — assigned to whom, deadlines, **overdue count**, account-to-account pending numbers.
- Lister: own numbers only, account-to-account, deadline-sorted.
- **CPC vs General/Dynamic split**: from the task's hunt details `CPC Selling Chance` (canonical advertising type) → classify CPC-family vs General/Dynamic-family; tiles "listed this month / pending this month" per family. (Also §8.)

**3b. Lister reject-back flow.** On a listing task: "Can't list this" → reasons dropdown (data-driven list): `issues with data`, `no sale worth it`, `no data available` (+ manager-extendable) → task state flag `reject_requested` (rides comments @LFLAG@ style) → **management rejection-approval queue** (in mgmt pending desk §6): approve = task cancelled + hunt marked NOT APPROVED with reason + hunter notified; deny = task returns Working with note.

**3c. Listing decisions page (7-day no-sale) — upgrade existing `listingDecisions`:**
Every row gets two proper actions: **"End listing" → command task to Team Lead** (`end_listing` task + bell) and **"Send to revision" → `listing_revision` task** to the lister who listed it (provenance!). Decision recorded (decided_by/at, note) — already in schema, wire the UI fully.

**3d. Active listings split dashboards.** `activeListings` view gains two sub-boards: **CPC live** vs **General & Dynamic live** — engine knows campaign membership (`campaign_ads` + campaign type from `campaigns`), so classification is real: item in a CPC-type campaign → CPC board; else General/Dynamic. Counts + tables per account.

**3e. Go-live desk (Team Lead).** Extends R7-4 draft flow: new view `goLive` for TL/Husnain/mgmt listing all `listing_new` tasks flagged draft (`@LFLAG@` draft) or assigned to the go-live person: open draft link, **"Make live"** (enter Item ID right there — same enterItemId chain) or **"Send back to lister"** (reassigns back + note). Dashboard tiles: waiting drafts per account.

**3f. 72-hour revision dashboard.** New view `rev72`: all `listing_revision` tasks with the 72h marker + upcoming windows (due today / overdue / done this week), per lister, with the revisit form links. Data: myTasks-wide (mgmt) + window classification by deadline.

**3g. Listing rating (1–5 stars).** On task approval (approveTask) of `listing_new`: approver may pass `rating` 1–5 → stored in new TASKS column `rating` (append col — sheet-safe) + provenance row. Lister averages surface on listDesk + staff system (§5).

---

## 4. Account health: projected metrics
`accountHealth` already computes current service metrics. Add **projected**: eBay evaluates on a lookback window — compute the projection from current counts vs thresholds trajectory: `projected = (defects_current + defects_in_window_pending) / transactions_projected`. Honest version: show current rate, the evaluation-date, and "if the next N transactions stay clean → rate becomes X%" — no invented numbers, a real arithmetic projection with its assumption printed.

## 5. Staff working & behavior system (A→Z)
**Data:** new sheet tab `STAFF_REVIEWS`: `review_id, email, week (YYYY-Www), rated_by, behavior (1-5), working (1-5), notes, created_at`.
**Logic:**
1. Weekly cadence: every Monday the system opens a "review week" — `staffReviewsPending` lists every approved staff member without a review this week.
2. Management sees pending reviews in their pending desk (§6) + a bell if any pending by Wednesday (`reviewWatch` ride on the hourly sweep, letter once per week).
3. `staffReviewSave` (mgmt-only) writes the row; history per person with trend.
4. Auto-context shown beside the form: tasks completed this week, overdue count, avg listing rating (§3g), reports missed (REPORTS_2H) — the objective side pre-filled, the human adds behavior/working scores + notes.
5. Surface: new `staffReviews` view (mgmt) + a person's own trend (scores only, no other people) on their profile/home.

## 6. Management pending desk
New view `mgmtDesk` — ONE place with every queue that waits on management, each with count + jump link + inline quick-actions where cheap:
hunt approvals · task approvals (submitted) · lister reject-back requests (§3b) · listing decisions (7-day) · pending staff reviews (§5) · unacked strict alerts · keyword approvals · pending registrations. Backend `mgmtPendingSummary` aggregates counts in one call (engine + AS mix — two calls, merged client-side).

## 7. Price revision dashboard
New view `priceDesk` (mgmt/pricing): engine `priceRevisionBoard` — items whose **cost climbed** (costup letters exist; persist them into a D1 `price_watch` table on detection: item, old→new cost, margin now, alerted_at, acked) + current sell price + margin after change + quick links. Tiles: open price alerts, resolved this week. Ack writes feedback (reuses alert ack with note).

## 8. CPC pipelines
- **Pending CPC listings about to update**: `cpc_research`/`potential_cpc_review` open tasks + campaign_set queue — view tab under listDesk: "CPC pipeline".
- Monthly split tiles (listed/pending, CPC vs General/Dynamic) — §3a data.

## 9. Sir Hasib full integration
- In rotation since 24 Aug ✓ (11 orders already).
- Add its CONNECTIONS `order_processing` row when Hasib names/creates the book (the broken empty-id row is repaired or repurposed for it).
- **Drafts per account "current data of eBay"**: eBay exposes no drafts API — the honest number is the portal's own draft-flagged tasks per account (§3e) + listings tasks not yet live. The dashboard labels it exactly that; no fake numbers.
- Verify listings pull (0 so far — account may genuinely hold none; watch tonight).

## 10. Tasks for Husnain / management
Seed real TASKS for the human parts: connect Sir Hasib order book · review new rejection-reason list · first weekly staff reviews · VAT/behavior spot-checks. Created via createTask as part of Wave 4.

---

## Execution waves (tonight)
- **Wave 1 (backend foundations):** provenance table+backfill, rejection-reasons config actions, deptPending, huntDesk aggregates, requestItemLink, lister reject-back state, decisions actions (end/revise), rating column, STAFF_REVIEWS tab + actions, priceDesk table+board, mgmtPendingSummary. AS full-model deploy + engine deploy.
- **Wave 2 (views):** huntDesk, deptBoard, listDesk (+CPC pipeline), goLive, rev72, priceDesk, mgmtDesk, staffReviews, activeListings split, decisions UI actions.
- **Wave 3 (fixes & polish):** §0 bug fixes, as-of stamps + memo TTLs, projected health, nav/roles wiring, badges.
- **Wave 4:** seed tasks (§10), verify end-to-end with live data, deploy final, report.
