# M98M PORTAL — TRUTH UPDATE v2

**Work order for the Claude Code agent · issued 1 September 2026 · supersedes every earlier instruction about numbers, pages and layout**

> **How to use this file.** Commit it as `docs/TRUTH-UPDATE-v2.md`. Start every session with:
> *"Read docs/TRUTH-UPDATE-v2.md in full, then docs/NUMBER_REGISTER.md and docs/TRUTH-UPDATE-PROGRESS.md, then continue from the first unchecked item. Do not start a work order whose phase gate is not passed."*
> The three files are the agent's memory. Nothing is "done" until it is ticked in `docs/TRUTH-UPDATE-PROGRESS.md` with the acceptance evidence attached.

---

## 0. Read this first — why the portal is wrong and what "fixed" means

The portal runs on Cloudflare Workers + D1 + KV. It reads the per-account Google Sheets workbooks (sales-analysis workbook and Central Account Management sheet per account) and the eBay APIs. On 1 September 2026 its pages contradicted each other and reality:

| Where | What it shows | Why it is wrong |
|---|---|---|
| Home → "Yesterday" | £2,471.21 sold, **£72.01 actual** | Business overview shows **£1.9k actual profit** for its one-day range; Sales analysis shows August at **11.5 % margin** while Business overview shows **64.22 %** for one day — a margin six times the monthly figure, with no explanation on the page. Three pages, three formulas. |
| Home → "Late right now" 5 · £155.13 | Dispatch lists them as 39–93 days late | They are orders that were **refunded and never dispatched**. They are not late; they are closed. Dispatch's "OVERDUE NOW = 2" box (from the workbook day tabs) lists two orders that were **already delivered**. |
| Pending approvals | "Nothing is waiting" | Management desk says **3 rejection requests + 14 staff reviews** are waiting; Departments says **149 listing tasks, 109 overdue**. Three pages, three queries over the same task table. |
| Campaign watch / Live listings split / Wrong advertising | 391 items "ACTIVE in 2+ RUNNING campaigns" | The portal cannot see whether the **ad is ACTIVE or PAUSED inside each campaign**. eBay's own Ads tab shows most of those rows as *Paused*. Duplicated-ad counts, "CPC live 509", "in no campaign 195" are therefore all wrong. |
| Account KPIs / Account report | Numbers with no source; **Sir Hasib missing**; broken chart | Page has its own account list and its own maths. |
| Business overview → VAT to pay, Actual profit | "20 % × (sold − eBay fees ex VAT − AliExpress − CPC ex VAT)", "0.8 × (OE − Ali) − ads net − returns" | Formulas invented in the portal. The business defines profit and VAT in the sales-analysis workbook: **True Order Earning → VAT to HMRC → Raw Profit**, where **Raw Profit = True Order Earning − VAT to HMRC**. |
| Sales analysis | Eight "workbook disagrees with itself" banners | Noise. Nobody acts on them. |

**Root cause of all of it:** every page computes its own numbers from whichever source was convenient, with its own formula, its own idea of "today", and fallback or sample values when a source is slow. There is no single owner of any number.

**"Fixed" means all four of these are true, and provable on a page:**

1. Every number on every page is produced by **exactly one registered metric function**, from **one declared source**, with a visible as-of time.
2. **No number is estimated, sampled, hard-coded, defaulted or silently stale.** If the source is unavailable the tile shows `—` and says why.
3. An **independent verifier** ("Truth Check") recomputes every number on a published schedule and shows PASS / FAIL beside it.
4. **The same fact is the same number on every page.** Home = Business overview = Dispatch = Account KPIs = Management desk, always, because they call the same function.

You are allowed — expected — to **replace the data skeleton** (tables, sync jobs, page data-fetching) to achieve this. You are **not** allowed to change how the business defines a number: the workbook columns and the eBay API define them; the portal only reads, sums, divides for the ratios named in the register (margin, ROAS, coverage), and displays.

---

## 1. Operating rules — the anti-confusion contract

These rules apply to every task in this file. When a rule and an old instruction, an old comment in the code, or your own instinct disagree, the rule wins.

**R1 — One number, one owner.** Every value rendered anywhere (tile, table cell, badge, chart bar, signal, alert, task count) is produced by exactly one function in `src/metrics/`, registered in `docs/NUMBER_REGISTER.md` with an ID like `LATE_NOW` or `ORDER_VAT_HMRC`. Pages call metrics by ID through one page-API; pages never contain arithmetic, date logic, or fetches. If you find a page doing maths, you move the maths into a metric and delete it from the page.

**R2 — Source ranking, and no third formula.** For every metric the register names one source of truth: (a) the eBay API for anything eBay knows (orders, dispatch, refunds, cancellations, fees, funds, listings, campaigns, ads, ad spend, seller standards, traffic); (b) the money workbook for anything the business defines by hand (True Order Earning, VAT to HMRC, Raw Profit, AliExpress cost) and the Central sheet for management's intended campaign; (c) the portal's own D1 tables for tasks, approvals, messages, hunts. A metric uses its named source and nothing else. A formula that exists in the portal but not in the source is a bug: delete it. Never "reconcile" two sources by averaging, picking the larger, or inventing a correction factor.

**R3 — No fake numbers, ever.** Delete every sample dataset, demo array, `Math.random`, hard-coded constant, "≈", "history still building" placeholder, and every `|| 0`, `?? 0`, `catch { return 0 }` that turns a failure into a zero. A failure renders as `—` with a chip *"source unavailable since 03:18"*. Zero is a number; it must be proven.

**R4 — Provenance on everything.** Every metric result carries `{value, unit, asOf, source, scope, verify: {status, checkedAt, nextAt, delta}}`. The UI renders a small chip under each tile: `✓ 12:40 · next 12:55` or `✗ delta £4.20` or `— source down`. Clicking it opens the Truth Check evidence for that metric.

**R5 — Time.** Store every timestamp in UTC. Display in Asia/Karachi. "Today" means the Asia/Karachi calendar day unless the register says otherwise. The workbook files order rows by Pakistan date. eBay ad reports and Seller Hub are UK days (Europe/London); metrics built on them are labelled *eBay day*. Ship-by dates come from the order (`shipByDate`) and are compared in UTC. Never mix the two day definitions inside one metric; a tile that shows both labels each.

**R6 — Money.** Store integer pence. Round only at render. Every money metric states VAT treatment in its register row (`ex VAT`, `incl VAT`, `VAT amount`). Ad fees from eBay reports are ex VAT; "incl VAT" = ex VAT × 1.20 and is labelled as such.

**R7 — Account registry.** `accounts` (D1) is the only list of accounts. Every page, sync job, metric and validator iterates over `accounts WHERE active = 1`. A page that hard-codes account names, or shows fewer accounts than the registry, fails its acceptance test (this is the Sir Hasib bug).

**R8 — Pages never wait on Google or eBay.** Sync jobs write D1; pages read D1. The "Still loading — the Google server is being slow" state must become impossible. The only allowed live calls from a page are user actions (remove an ad, send a message) followed by an immediate targeted re-sync of the affected rows.

**R9 — Shadow mode before go-live.** New metrics run side by side with the old code; the shadow ledger (Truth Check → Shadow tab) shows old vs new for every number. The owner flips each module live with the per-module flag in `config/flags.ts`. Until flipped, the old page keeps rendering the old numbers with a *"shadow: new value £x"* chip. After the flip and seven clean days, delete the old code path. Never delete a page before its replacement is flipped live.

**R10 — Destructive or account-affecting actions.** Pausing/removing ads, sending messages, closing tasks, writing to a workbook: behind a confirmation, logged to `audit_log`, and per-account. The portal writes to workbooks only where it already does today (Phase 0 lists every existing write path); the money columns (True Order Earning, VAT to HMRC, Raw Profit) and every order row are read-only to the portal, always. Never call eBay write endpoints from a sync job. Before adding any eBay OAuth scope, keyset or Cert ID change, list it in the report and stop — Hamza must be notified before it happens (standing rule).

**R11 — Ask once, in a batch, with a default.** Do not ask the owner things the codebase, the workbook or the API can answer. Collect true decisions in `docs/DECISIONS-NEEDED.md` with a recommended default each; proceed with the default and mark the item `ASSUMED` until answered.

**R12 — Small, reversible changes.** One work order per branch/commit series. Feature flags, not big-bang rewrites. Keep `CHANGELOG.md`. Never reformat or "tidy" code you are not changing.

**R13 — Prove, don't claim.** A work order is complete when its acceptance test in this file passes and the evidence (query output, screenshot, Truth Check row) is pasted into `docs/TRUTH-UPDATE-PROGRESS.md`. "It should work now" is not a status.

**R14 — Report format.** After each work order, write the report using the template in §8. Numbers in reports come from the Truth Check page, not from memory.

**R15 — This file outranks older specs and code comments.** Where `M98M-BIG-UPDATE-SPEC-v1.md`, a CLAUDE.md note, a code comment, or an existing implementation disagrees with this file about a number, a source, a page or a layout, this file wins. Never reintroduce a removed formula because an older document mentions it. If two existing implementations of the same number disagree, neither is right by default — go to the source named in the register.

---

## 2. Vocabulary — use these words, exactly

| Term | Meaning in this portal |
|---|---|
| **Account** | One eBay seller account. Display names today: AZHAR ABRT, Amna Baji, Azhar Bhai, HAFIZA BHAJI, Saif Bhai, Sir Hasib. The registry (§3.4) is the truth for the list, the eBay usernames, and which workbooks belong to which account. Portal logins such as `m98mone`, `m98meleven`, `mrhasibullah91`, `m98m786` are **users**, not accounts. |
| **Workbook** | A per-account Google Sheets file. Two kinds exist today: the **sales-analysis workbook** and the **Central Account Management sheet** (Monthly Sheet, Overall Report tiles, Wrong Advertising tab). The **money workbook** for an account is whichever file holds the per-order rows with the three headers *True Order Earning / VAT to HMRC / Raw Profit*; Phase 0 records, per account, the file ID, the tab layout (day tabs, monthly tabs, or one running sheet), the header row, and the totals row if any. Everything in this file that says "order rows", "day rows" or "month rows" means the rows of the money workbook selected by the order's Pakistan date, whatever tab they physically sit in. |
| **True Order Earning (R)** | Column headed *True Order Earning* in the money workbook (column R in the screenshot; locate by header, never by letter). |
| **VAT to HMRC (S)** | Column headed *VAT to HMRC*. The VAT the business will pay for that order. Can be negative on loss/refund rows. |
| **Raw Profit (T)** | Column headed *Raw Profit*. **T = R − S**, penny for penny. This is *Actual Profit* everywhere in the portal. |
| **Pakistan day** | Order rows are filed under the Asia/Karachi date of the order; every sheet-based money metric is grouped by that date. |
| **eBay day** | Europe/London calendar day, the grain of eBay's ad reports, traffic reports and Seller Hub. Ad-spend metrics use it and are labelled with it. A tile that shows a sheet number and an ad number side by side (Home "Yesterday", Business overview) labels each with its own day basis; the two are never added together. |
| **CPC campaign** | eBay campaign with `fundingStrategy.fundingModel = COST_PER_CLICK` (eBay now calls this *priority* strategy; older name Promoted Listings Advanced). Ads inside it have an `adStatus` of ACTIVE / PAUSED / ARCHIVED and belong to an `adGroupId`. |
| **General / Dynamic campaign** | eBay campaign with `fundingModel = COST_PER_SALE` (eBay now calls this *general* strategy; older name Promoted Listings Standard). "Dynamic" = general campaign with dynamic ad rate. Ads inside it carry **no per-ad status** in the API; an ad is live if it exists in the latest complete sync, the campaign is RUNNING (or ENDING_SOON) and the listing is ACTIVE. |
| **Live membership** | The fact "listing L is being promoted in campaign C right now". Defined precisely in WO-08. Every advertising count is built from it. |
| **Dispatch state** | Exactly one of seven per order: `LATE`, `DUE`, `AWAITING`, `SHIPPED`, `REFUNDED_NEVER_SENT`, `CANCELLED`, `PENDING_PAYMENT`. Defined in WO-07. `AWAITING_DISPATCH` (= "open orders") is `LATE + DUE + AWAITING`. |
| **Module / flip flag** | Eight modules own every metric and every flip switch, with the same names in `config/flags.ts` and in the register's `owner_module` column: `orders`, `money`, `ads`, `catalogue`, `standards`, `tasks` (Management desk, approvals, signals, alerts), `inbox`, `hunting`. A page can be part-new part-old; each tile's chip says which module it belongs to and whether that module is live or shadow. |
| **Metric** | A registered function `metric(id, scope, window) → result` (§4). |
| **Truth Check** | The independent verifier and its page (§6). |
| **Shadow** | A new metric running beside the old number before the owner flips it live (R9). |
| **Zain** | Zain ul Abideen, Advertising. Assignee of the keyword-doc tasks (WO-09). Look up his `users.id`; if more than one Zain exists, put it in DECISIONS-NEEDED. |

---

## 3. Target skeleton — the data layer you are allowed to replace

### 3.1 Layers

```
 eBay APIs ──┐                                   ┌─ Pages (render only; provenance chips)
 Sheets API ─┼─► SYNC JOBS (cron Workers) ─► D1 ─┼─ Page API  /api/page/<page>?scope=…   → metrics by ID
 Portal UI ──┘   (per account, logged,           │
                  isolated failures)             └─ TRUTH CHECK (independent recompute, schedule, page)
                                                       ▲
                                    src/metrics/*  ────┘  one function per NUMBER_REGISTER id
```

Rules of the skeleton: sync jobs are the only code that talks to eBay or Google on a schedule; D1 is the only thing pages read; `src/metrics/` is the only place arithmetic lives; Truth Check has its own `src/truth/` recompute code that must not import from `src/metrics/`. The only modules shared by both sides are `src/lib/money.ts`, `src/lib/time.ts` and `src/lib/registry.ts` (the register: IDs, definitions, tolerances, methods, owner module — data, not maths).

### 3.2 D1 tables (add; migrate existing tasks/users/messages into the same schema style)

```sql
-- registry
accounts(id TEXT PK, display_name, ebay_username, ebay_user_id, marketplace 'EBAY_GB',
         program 'PROGRAM_UK', wb_sales_analysis_id, wb_central_id, oauth_kv_key,
         colour, sort_order, active INT)

-- orders (Fulfillment API)
orders(account_id, order_id PK, created_at, last_modified_at, fulfillment_status,
       payment_status, cancel_state, fulfillment_href_count, ship_by_earliest, total_pence,
       marketplace_fee_pence, currency, raw JSON, synced_at)
       -- fulfillment_href_count = length of fulfillmentHrefs[] on the order itself:
       -- 0 means eBay has never seen a dispatch; it is the primary "has dispatch" signal
order_lines(account_id, order_id, line_item_id PK, listing_id, sku, title, qty, total_pence,
            ship_by, min_edd, max_edd, line_fulfillment_status, refunded_pence)
shipments(account_id, order_id, fulfillment_id PK, shipped_at, carrier, tracking, line_item_ids JSON)

-- money (Finances API)
transactions(account_id, transaction_id PK, type, order_id, booking_entry, amount_pence,
             fee_pence, fee_types JSON, transaction_at, raw JSON)
funds(account_id PK, available_pence, processing_pence, on_hold_pence, total_pence, as_of)

-- catalogue & advertising (Trading GetMyeBaySelling or Inventory API; Marketing API)
listings(account_id, listing_id PK, title, price_pence, qty, status, start_at, end_at,
         ali_item_id, synced_at)
campaigns(account_id, campaign_id PK, name, status, funding_model, start_at, end_at, synced_at)
ads(account_id, campaign_id, ad_id PK, listing_id, ad_status, bid_pct, ad_group_id,
    first_seen_at, last_seen_at, synced_at)
ad_daily(account_id, campaign_id, listing_id, date_uk, impressions, clicks,
         ad_fees_pence_ex_vat, sales_pence, sold_qty, PK(account_id,campaign_id,listing_id,date_uk))
standards(account_id, program, cycle, standards_level, evaluation_date, metrics JSON, synced_at,
          PK(account_id, program, cycle))
traffic_daily(account_id, listing_id, date_uk, impressions, views, transactions, PK(...))

-- workbook mirror (Sheets API)
sheet_rows(account_id, workbook_id, tab, row_no, day_pk, order_id, values JSON, formulas JSON,
           row_hash, synced_at, PK(workbook_id, tab, row_no))
sheet_tabs(workbook_id, tab, header_row_no, headers JSON, last_full_sync_at, PK(workbook_id, tab))

-- engine & verification
metric_snapshots(metric_id, scope_key, value, unit, as_of, computed_at, provenance JSON,
                 PK(metric_id, scope_key, as_of))
validation_runs(id PK, metric_id, scope_key, ran_at, shown_value, recomputed_value, delta,
                status, method, evidence JSON, next_run_at)
sync_runs(id PK, job, account_id, started_at, finished_at, ok, rows_written, error)
audit_log(id PK, at, user_id, action, target, before JSON, after JSON)

-- tasks (existing table, normalised additively in Phase 1 — old columns stay until the flip)
tasks(id PK, type, department, title, payload JSON, status_raw, status_norm, created_by_kind,
      created_by, assignee_id, approver_role, due_at, opens_at, created_at, closed_at, closed_reason)
      -- status_norm ∈ OPEN · IN_PROGRESS · SUBMITTED · RETURNED · DONE · CANCELLED
      -- all timestamps ISO-8601 UTC strings so that `due_at < datetime('now')` is valid in D1

-- inbox (WO-12)
threads(id PK, subject, created_by, created_at, last_message_at)
messages(id PK, thread_id, sender_id, body, created_at)
message_recipients(message_id, user_id, read_at, PK(message_id, user_id))
attachments(id PK, message_id, r2_key, mime, size_bytes, original_name, uploaded_by, uploaded_at)

-- workflow additions
cpc_live_events(id PK, account_id, listing_id, campaign_id, live_at, task_id)
keyword_docs(id PK, account_id, listing_id, doc_url, outcome, uploaded_by, uploaded_at, task_id)
job_schedule(job PK, cadence_minutes, run_at_utc, last_ok_at, next_due_at, enabled)
```

Indexes you will need: `orders(account_id, payment_status, cancel_state, ship_by_earliest)`, `orders(account_id, fulfillment_href_count)`, `shipments(order_id)`, `ads(listing_id)`, `ads(campaign_id, ad_status)`, `ad_daily(account_id, date_uk)`, `sheet_rows(account_id, day_pk)`, `sheet_rows(order_id)`, `messages(thread_id, created_at)`, `message_recipients(user_id, read_at)`, `tasks(department, status_norm, due_at)`, `tasks(assignee_id, status_norm)`, `validation_runs(metric_id, ran_at)`.

### 3.3 Sync jobs and cadence (one job per source, every account, failures isolated per account)

**Scheduling mechanics.** Cloudflare cron triggers are UTC and limited per Worker, so use **one dispatcher cron every 5 minutes** that reads `job_schedule` and runs whatever is due; nightly times below are PKT and are stored in `job_schedule.run_at_utc` (Pakistan has no DST: 02:00 PKT = 21:00 UTC the previous day, 03:00 = 22:00, 06:00 = 01:00, 06:30 = 01:30). Long pulls (nightly 120-day orders, month sheets) are chunked per account and per page across invocations (Queues or self-invocation) so no single run hits the subrequest or CPU limit.

**Run-success guard (applies to every job).** A job advances its incremental marker, and anything "not seen this run" is treated as removed, **only when every page for that account succeeded** (`sync_runs.ok = 1`). A failed or partial run leaves the previous snapshot intact and marks that source `STALE` for that account with the time. This is what stops one failed page from emptying a campaign, ending every listing, or re-firing CPC-live events.

| Job | Source | Cadence | Method |
|---|---|---|---|
| `sync-orders` | Fulfillment `getOrders` | every 5 min incremental on `lastmodifieddate:[<last>..]`; nightly full pull of last 120 days | upsert `orders` (incl. `fulfillment_href_count`, `cancel_state`, `payment_status`), `order_lines`; store raw |
| `sync-shipments` | Fulfillment `getShippingFulfillments` **only** for orders whose `fulfillment_href_count > 0` and whose fulfillment details are not yet stored (or whose order changed since) | every 15 min; and immediately for one order on "Recheck this order" | upsert `shipments` (`shipped_at`, carrier, tracking). Dispatch state never waits for this job — it uses the order's own fields (WO-07). |
| `sync-finances` | Finances `getTransactions` (all types), `getSellerFundsSummary` — note the Finances API host is `https://apiz.ebay.com`, not `api.ebay.com` | every 15 min incremental; nightly full month | upsert `transactions`, `funds` |
| `sync-listings` | Trading `GetMyeBaySelling` ActiveList (or Inventory API where listings are inventory-managed) | every 30 min | upsert `listings`; listings missing from a **complete** successful pull → ENDED |
| `sync-campaigns` | Marketing `getCampaigns` (all statuses) then `getAds` per campaign, all pages, **no `ad_status` filter** | every 15 min; plus targeted re-sync of one campaign right after a user action | upsert `campaigns`, `ads`; after a complete run, ads not returned for that campaign keep their old `last_seen_at` (treated as removed) |
| `sync-ad-reports` | Marketing report task, **one report type** — `CAMPAIGN_PERFORMANCE_REPORT` (item level) — with explicit dimensions for campaign, listing and day and explicit metric keys (Phase 0 copies the exact dimension/metric key strings from the docs into `config/ebay.ts`) | every 30 min for yesterday + today (UK days); nightly trailing 14 days | upsert `ad_daily` by (account, campaign, listing, date_uk) |
| `sync-standards` | Analytics `getSellerStandardsProfile` for `PROGRAM_UK` × {`CURRENT`, `PROJECTED`} | daily 06:00 PKT + manual | upsert `standards` |
| `sync-traffic` | Analytics `getTrafficReport` (dimension DAY, and LISTING for the trailing 7 days) | daily 06:00 PKT | upsert `traffic_daily` |
| `sync-sheets-hot` | Sheets API `values.batchGet` of the tabs that hold today's and yesterday's order rows in every account's money workbook (tab layout from the registry) | every 10 min | upsert `sheet_rows` by row hash |
| `sync-sheets-cold` | every tab holding the current and previous month's order rows, plus the Wrong Advertising tab of the Central sheet | nightly 02:00 PKT | upsert; record `formulas` for the R/S/T columns of the first three data rows of each tab |
| `truth-check` | see §6 | tiered: 15 / 30 min / daily | writes `validation_runs` |

Every job writes a `sync_runs` row. A failing account never blanks another account's data: catch per account, log, continue. Tokens live in KV per account (`oauth_kv_key`); refresh on 401 once, then mark the account `SOURCE_DOWN` for that source with the time.

### 3.4 Account registry — populate in Phase 0, then never hard-code an account again

For each account record: display name (as staff know it), eBay username, eBay user ID, marketplace (`EBAY_GB`), standards program (`PROGRAM_UK`), sales-analysis workbook ID, Central sheet ID, KV key of the OAuth tokens, sort order, colour. Verify against `GET /sell/account/v1/...` or the Trading `GetUser` call that each token really belongs to the username written in the row. Any account in the workbook set that has no token, or any token with no workbook, goes to DECISIONS-NEEDED.

### 3.5 Page API

`GET /api/page/<page>?range=…&account=all|<id>` returns `{ asOf, metrics: { <METRIC_ID>: MetricResult, … } }`. `MetricResult = { value, unit, asOf, source, scope, verify }` (R4). Pages have no other data endpoints. A page's list views (e.g. the late orders table) are also metrics (`LATE_NOW.rows`) so that **the count on a tile always equals the rows in the list it opens** — this is an invariant the Truth Check tests.

---

## 4. Number Register

### 4.1 Register row format (`docs/NUMBER_REGISTER.md`, one row per metric — keep it current; both the Metric Engine and the Truth Check read the same definitions from `src/lib/registry.ts`, and a test fails the build if the markdown and the code disagree)

| Field | Content |
|---|---|
| `id` | UPPER_SNAKE, stable forever |
| `label` | what the tile says |
| `pages` | every page that renders it |
| `definition` | one sentence a manager would sign off |
| `formula` | precise, in terms of table columns |
| `source` | API method(s) or workbook column header(s) |
| `unit` / `vat` | pence / count / % ; ex VAT / incl VAT / VAT amount |
| `time_basis` | Pakistan day / eBay day / instant |
| `tolerance` | `0` for counts; `1p` per row and `5p` per day for money read from sheets; `0` for money read from the API |
| `verify` | `API_RECOMPUTE` / `SHEET_RECOMPUTE` / `D1_RECOMPUTE` / `INVARIANT` / `CROSS_SOURCE` and the cadence tier |
| `owner_module` | one of the eight modules in §2: `orders` / `money` / `ads` / `catalogue` / `standards` / `tasks` / `inbox` / `hunting` — the same name as its flip flag |

### 4.2 Initial register (the definitions the business signed off in this update; add to it, never fork it)

IDs that appear inside another row's definition (`AD_SPEND_INCL_VAT`, `ORDERS_TODAY`, `VAT_TO_HMRC_MTD`, `KEYWORD_DOC_SCHEDULED`, the `DEPT_*(d)` family per department) get their own rows in `src/lib/registry.ts` with the parent's source, tolerance and method — one ID per rendered number, no exceptions.

**Orders & dispatch (source: Fulfillment API; instant; tolerance 0)**

| id | definition / formula |
|---|---|
| `DISPATCH_STATE` | per order, exactly one of LATE / DUE / AWAITING / SHIPPED / REFUNDED_NEVER_SENT / CANCELLED / PENDING_PAYMENT (WO-07) |
| `LATE_NOW` | count and Σ `orders.total_pence` of orders with `DISPATCH_STATE = LATE` |
| `DUE_3D` | state DUE (paid, unshipped, `ship_by_earliest ≤ now + 72h`) |
| `AWAITING_ONLY` | state AWAITING (paid, unshipped, ship-by more than 72h away or no ship-by on the order) |
| `AWAITING_DISPATCH` | state ∈ {LATE, DUE, AWAITING}; invariant `LATE_NOW + DUE_3D + AWAITING_ONLY = AWAITING_DISPATCH` |
| `OPEN_ORDERS` | = `AWAITING_DISPATCH` (Business overview's "open orders" is this number, nothing else) |
| `ORDERS_COUNT` / `ORDERS_VALUE` | count and Σ total of non-cancelled orders with `created_at` in the scope's Pakistan-day range. `ORDERS_TODAY` is this metric for today; Dispatch's "came in today" tile is the same metric, not a second one. |
| `REFUNDED_NEVER_SENT` | state REFUNDED_NEVER_SENT within the synced window (120 days), count and £, with refund date from `transactions` |
| `SHIPPED_7D` | state SHIPPED with `shipped_at` (or last modification when shipped_at is not yet fetched) in the last 7 days |
| `CANCELLED_30D` | state CANCELLED in the last 30 days (cancel requested in progress is flagged, see WO-07) |
| `PENDING_PAYMENT` | state PENDING_PAYMENT, count |
| `SHIPPED_LATE_30D` | shipped in last 30 days with `shipped_at > ship_by` (information for the late-shipment rate; never counted as "late now") |
| `SHEET_VS_API_ORDERS` | CROSS_SOURCE row only (Truth Check): order rows in the money workbook for a day vs `ORDERS_COUNT` for that day; expected to lag until rows are written |

**Money — sheet-defined (source: sales-analysis workbook rows; Pakistan day; tolerance 1p/row, 5p/day)**

| id | definition / formula |
|---|---|
| `ORDER_TRUE_EARNING` | value of the *True Order Earning* cell of the order's row |
| `ORDER_VAT_HMRC` | value of the *VAT to HMRC* cell of the order's row |
| `ORDER_RAW_PROFIT` | value of the *Raw Profit* cell; invariant `= ORDER_TRUE_EARNING − ORDER_VAT_HMRC` (±1p) |
| `ACTUAL_PROFIT` | Σ `ORDER_RAW_PROFIT` over rows in scope (account × day range). This is the only "actual profit" in the portal. |
| `VAT_TO_HMRC` | Σ `ORDER_VAT_HMRC` over rows in scope; `VAT_TO_HMRC_MTD` = month to date |
| `TRUE_EARNING` | Σ `ORDER_TRUE_EARNING` |
| `SOLD_SHEET` | Σ of the row's *Sold* / sale-price column (header recorded in Phase 0) |
| `ALI_COST` | Σ of the row's AliExpress cost column |
| `MARGIN` | `ACTUAL_PROFIT ÷ SOLD_SHEET` for the same scope; `—` if `SOLD_SHEET = 0` (a ratio the register defines; the two inputs come from the sheet) |
| `ROWS_COVERAGE` | order rows in the money workbook for the scope ÷ `ORDERS_COUNT` for the same scope. Rendered beside every sheet-based money tile ("rows written: 240 of 306"). This replaces every "books behind eBay" banner. |

**Money — eBay-defined (source: Finances / Fulfillment / Marketing; tolerance 0)**

| id | definition / formula |
|---|---|
| `SOLD_API` | Σ `total_pence` of non-cancelled orders in scope (Pakistan day of `created_at`) |
| `RETURNS_API` | Σ `REFUND` transactions in scope (by `transaction_at`) |
| `FEES_API` | Σ fees on `SALE` transactions in scope |
| `FUNDS` | `getSellerFundsSummary` per account: available / processing / on hold / total |
| `AD_SPEND` | Σ `ad_daily.ad_fees_pence_ex_vat` in scope (eBay day); `AD_SPEND_INCL_VAT = × 1.20`, labelled |
| `AD_SPEND_BILLED` | Σ `NON_SALE_CHARGE` transactions whose fee type is an ad fee, plus ad fees inside `SALE` transactions — the real invoiced cost; used by Truth Check to cross-check `AD_SPEND` **per month** (CPC fees are not booked per day) |
| `AD_SALES` | Σ `ad_daily.sales_pence`; `ROAS = AD_SALES ÷ AD_SPEND`, `—` when spend = 0 |
| `WASTING_TODAY` | listings with `AD_SPEND` today ≥ `sop.wastingThresholdPence` (today £3, kept in `config/sop.ts`) and no order line for the listing today (`order_lines`) |
| `BURNERS_14D` | listings with Σ 14-day `AD_SPEND` > 0 and no order line for the listing in the same 14 days |

**Catalogue & advertising (source: listings, campaigns, ads; instant; tolerance 0)**

| id | definition / formula |
|---|---|
| `ACTIVE_LISTINGS` | count `listings.status = ACTIVE` |
| `LIVE_MEMBERSHIP` | set of (listing, campaign) pairs that are live (WO-08) |
| `CPC_ONLY_LIVE` / `GENERAL_ONLY_LIVE` / `BOTH_LIVE` / `NO_CAMPAIGN` | partition of ACTIVE listings by the funding models of their live memberships; invariant: the four sum to `ACTIVE_LISTINGS` |
| `MULTI_RUNNING` | listings with ≥ 2 live memberships (the "in more than one running campaign" number) |
| `RATE_BREACH` | live memberships in COST_PER_SALE campaigns whose `bid_pct` breaks the SOP ad-rate rule for the item's price band (the existing "over-£10 items … 15 %" rule). Phase 0 copies the current thresholds and their direction exactly into `config/sop.ts`; the metric reads them from there. |
| `IMPRESSIONS` / `VIEWS` | Σ `traffic_daily` for the eBay day, labelled "eBay day, trails one day" |

**Standards (source: Analytics seller standards; daily)**

| id | definition / formula |
|---|---|
| `RATING` | per account: `standards_level` (TOP_RATED / ABOVE_STANDARD / BELOW_STANDARD) + each metric in `metrics[]` (defect rate, late shipment rate, cases closed without seller resolution, transaction count) with value, threshold and level, for `CURRENT` and `PROJECTED`, with `evaluation_date` |

**Tasks & approvals (source: D1 tasks; instant; tolerance 0; verify `D1_RECOMPUTE` + `TILE_EQUALS_LIST`; every count = rows of the list it opens)**

| id | definition / formula |
|---|---|
| `WAITING_ON_ME` | tasks in status SUBMITTED whose approver role includes the current user (task approvals, hunt approvals, rejection requests, keyword revision requests, registrations) |
| `DEPT_OPEN(d)` / `DEPT_OVERDUE(d)` | tasks with `department = d`, status ∉ {DONE, CANCELLED}; overdue additionally `due_at < now` |
| `DEPT_OLDEST(d)` | min `created_at` of `DEPT_OPEN(d)` |
| `BY_SYSTEM` / `BY_MANAGEMENT` | split of `DEPT_OPEN` by `created_by_kind` |
| `LISTING_DECISIONS` | listings ACTIVE, live ≥ 7 days, no order line in the last 7 days (`order_lines`, not ad-attributed sales), no open decision task |
| `PRICE_ALERTS_OPEN`, `STRICT_ALERTS_UNACKED`, `STAFF_REVIEWS_PENDING`, `REGISTRATIONS_PENDING` | existing definitions, re-expressed as queries and registered; each must open a list with exactly that many rows |
| `CS_NEEDS_REPLY` | the existing CS definition (buyer messages awaiting our reply), registered with its query |

**Workflow (WO-09)**

| id | definition / formula |
|---|---|
| `CPC_LIVE_EVENT` | first observation of a live membership in a COST_PER_CLICK campaign for a listing (per WO-09 dedupe rule) |
| `KEYWORD_DOC_DUE` | KEYWORD_DOC tasks whose `opens_at` has passed and are not closed, with `due_at`, countdown, overdue flag; `KEYWORD_DOC_SCHEDULED` = those whose `opens_at` is still in the future (Management view only) |

---

## 5. Work orders

Each work order has: **Goal · Today (what is wrong) · Truth (source and logic) · Build · Accept (the test that closes it)**. Do them in the phase order of §7. Every "Accept" is pasted with evidence into `docs/TRUTH-UPDATE-PROGRESS.md`.

### WO-01 — Home page: remove Signals and health cards; make the three tiles true

**Goal.** Home shows only: the greeting, three tiles (Yesterday · Late right now · Customer service needs our reply), My timetable, the idea box, Today's agenda.

**Today.** The pinned Signals card ("−£8.25 … open record / create revision task / flag to advertising / Acknowledge"), the "56 more pinned to you · Open Signals" row, and the six account-health cards sit above the tiles. "Late right now = 5" counts refunded orders. "Yesterday £72.01 actual" disagrees with Business overview.

**Truth.** Yesterday = `SOLD_SHEET` and `ACTUAL_PROFIT` for yesterday's Pakistan day (all accounts, with the `ROWS_COVERAGE` chip) and `AD_SPEND_INCL_VAT` for yesterday's **eBay day**, labelled "ads · eBay day" — the two day bases sit side by side and are never added. Late right now = `LATE_NOW`. CS = `CS_NEEDS_REPLY`.

**Build.** (a) *Safe removal, Phase 1:* delete the Signals block, the "56 more pinned" row and the health-card row from the Home template and its data loader. The Signals page itself stays. The Account health page stays; if it has a Signals section of its own, remove that section too (the owner's request covered both places). WO-03 adds the rating strip to Business overview. (b) *Per module, at each flip:* wire the three tiles to the page API — Yesterday flips with `money`, Late right now with `orders`, CS with `tasks`. Nothing else on Home fetches data.

**Accept.** Home's three numbers equal, to the penny, the same metric IDs on Business overview and Dispatch at the same `asOf` (Truth Check invariant `HOME_EQUALS_OVERVIEW`). No request from Home goes to Google or eBay (check the Worker logs). Screenshot attached.

### WO-02 — Merge Pending approvals + Management desk + Departments into one Management desk

**Goal.** One page, three tabs, one query layer, every count equals the rows in the list it opens.

**Today.** Three pages, three sets of counts over the same task table: "Nothing is waiting" vs "3 rejection requests / 14 staff reviews" vs "149 listing tasks, 109 overdue".

**Truth.** D1 `tasks`. Phase 0 must document the real status vocabulary in the table; Phase 1 adds `status_norm` **additively** (mapping table `status_raw → status_norm`, kept in sync by the write path; old pages keep reading `status_raw` until the `tasks` flip). Overdue = `due_at < datetime('now') AND status_norm NOT IN ('DONE','CANCELLED')` with `due_at` stored as ISO-8601 UTC. Department = `tasks.department`. Created-by kind = `SYSTEM` / `MANAGEMENT` / `STAFF`.

**Build.**
1. New route `#mgmtDesk` with tabs **Waiting on you** (all approval types in one list, oldest first, Approve / Return-with-comment inline; the rejection-request picker becomes rows), **Queues** (Listing decisions, Price alerts, Strict alerts, Staff reviews, Registrations — each tile opens its list on the same page), **Departments** (Listing / Advertising / General / CS / Hunting: open, overdue, oldest waiting, by system/management, per-user open counts, Recently completed).
2. Every tile is a register metric (§4.2 Tasks). The list under a tile is `<METRIC>.rows`. Same function, so they cannot disagree.
3. Old routes `#pendingApprovals` and `#deptBoard` redirect to the matching tab. Sidebar shows one entry, badge = `WAITING_ON_ME` count for the logged-in user.
4. Delete the three old loaders after the flip (R9).

**Accept.** For every tile on the page, `count == rows.length` (automated invariant `TILE_EQUALS_LIST`, all tiles). Approving an item from Waiting on you removes it from the list and decrements the badge without a reload. A SQL spot-check pasted in the report: `SELECT department, COUNT(*) FROM tasks WHERE status_norm NOT IN ('DONE','CANCELLED') AND due_at < datetime('now') GROUP BY department` equals the Overdue tiles, and the same query written independently in `src/truth/tasks.ts` (`D1_RECOMPUTE`) agrees.

### WO-03 — Business overview: Actual profit with VAT beside it, VAT to pay, account rating strip

**Goal.** Actual profit and VAT come from the workbook columns; the rating of every account is visible on the page; no invented formula anywhere on the page.

**Today.** "ACTUAL PROFIT £1.9k · 0.8 × (OE − Ali) − ads net − returns — the sheet law", "VAT TO PAY — 2026-08 £2.8k · 20 % × (sold − eBay fees ex VAT − AliExpress − CPC ex VAT) · ad estimates inside", "MARGIN 64.22 %". All three are portal-invented. Ratings live only on Home cards (being removed) and the Account health page.

**Truth.** `ACTUAL_PROFIT = Σ Raw Profit`, `VAT_TO_HMRC = Σ VAT to HMRC`, `TRUE_EARNING = Σ True Order Earning`, read from the rows; `Raw Profit = True Order Earning − VAT to HMRC` verified per row. Rating = `RATING` from the Analytics API. If the workbook's True Order Earning is itself produced by the business's calculator formula (Brain v17), that is the calculator's job — the portal still reads the cell value and never re-implements the calculator for display.

**Build.**
1. **Port the sheet, do not reinvent it.** In `sync-sheets-cold`, read the formulas of the *True Order Earning*, *VAT to HMRC* and *Raw Profit* cells (Sheets API `valueRenderOption=FORMULA`) for the first three data rows of each tab; expand references to input columns by header name; write the expanded formula into the register rows `ORDER_TRUE_EARNING` / `ORDER_VAT_HMRC` / `ORDER_RAW_PROFIT`. If a cell is a typed value rather than a formula (the daily management sheets keep VAT as a manual column), record `manual` — the value is still the truth, and the verifier can only check T = R − S and the totals row.
2. Display reads **values** (`sheet_rows.values` by header), never the ported formula. The ported formula lives in `src/truth/profit.ts` and is used only to verify (§6).
3. Tiles: **ACTUAL PROFIT** (`ACTUAL_PROFIT`, with a **VAT button** beside it that shows `VAT_TO_HMRC` for the same range and, when pressed, expands the per-account line `True Order Earning − VAT to HMRC = Raw Profit`); **VAT TO PAY — <month>** = `VAT_TO_HMRC_MTD` per account with the totals; **MARGIN** = `MARGIN`; **SOLD** = `SOLD_SHEET` with `SOLD_API` shown as the eBay figure in the sub-line ("eBay: £x · rows written 240 of 306"); ALIEXPRESS COST = `ALI_COST`; RETURNS = `RETURNS_API`; ALL ADS INCL VAT = `AD_SPEND_INCL_VAT`; ROAS = `ROAS`; ORDER EARNING = `TRUE_EARNING`; TODAY · LIVE = `ORDERS_TODAY` (£ and count from the API — it is a live order feed, not a profit).
4. Delete the formula captions and replace each with the register definition text (the register is what the caption shows).
5. **Rating strip** under the "Right now" row: one card per account from the registry: standards level badge, defect rate, late shipment rate, cases closed without seller resolution, transactions in window, evaluation date, and PROJECTED next to CURRENT when they differ. Source `RATING`. The Account health page keeps existing but is re-wired to the same `RATING` metric.
6. Money — funds: `FUNDS` from `getSellerFundsSummary` per account (keep).
7. "Where the money leaks" chart: daily bars from `AD_SPEND_INCL_VAT` (eBay day) and `RETURNS_API`; a bar is dashed only when `ad_daily` for that day has not been received yet (not "estimated").
8. Remove "ZERO-SALE DECISIONS", "CAMPAIGN GAPS 195/339" tiles' local logic — they render `LISTING_DECISIONS` and `NO_CAMPAIGN` / `BOTH_LIVE` from WO-08. Steps 7 and 8 belong to the `ads` module and land in **Phase 4**; until then those tiles keep the old code with a shadow chip. Every tile on this page carries its module name in the chip (money / orders / ads / catalogue / standards) and flips with that module.

**Accept.** For every account and for each of the last 7 closed days: portal `VAT_TO_HMRC(day)` and `ACTUAL_PROFIT(day)` equal the money workbook's own figures for that day within 5p — the day's totals row where the layout has one, otherwise Path B's independent sum of that day's rows read straight from the Sheets API (paste the 7 × N table). For 200 random rows across accounts and months, `Raw Profit = True Order Earning − VAT to HMRC` within 1p. No caption on the page contains "0.8 ×", "20 % ×" or "estimate". Rating strip shows every account in the registry, with the API evaluation date.

### WO-04 — Sales analysis: remove the banners, add VAT

**Goal.** A calm page: tiles + a small "as of" line; VAT to pay MTD is a number.

**Today.** Eight amber "workbook disagrees with itself" banners; "VAT TO PAY · MTD — history still building"; "ADS (N) INCL VAT £15,361.98 · N/T 2.32"; "the books are £3,940.36 behind eBay" info bar.

**Build.** *Safe removal, Phase 1:* delete the banner generators (the whole reconciliation-warning module). *Phase 2:* tiles: `ORDERS` = `ORDERS_COUNT` for the month, `UNITS` = Σ `order_lines.qty`, `SOLD` = `SOLD_SHEET` (sub-line `SOLD_API`), `ACTUAL PROFIT` = `ACTUAL_PROFIT`, `MARGIN`, `ADS INCL VAT` = `AD_SPEND_INCL_VAT`, **`VAT TO PAY · MTD` = `VAT_TO_HMRC_MTD`** with per-account breakdown, and a `ROWS_COVERAGE` chip for the month ("rows written 5,401 of 5,574 orders"). The "behind eBay" bar becomes that chip. Keep the daily chart (ads incl VAT, returns, and now VAT per day).

**Accept.** Zero banners in the DOM. `VAT TO PAY · MTD` on Sales analysis equals `VAT TO PAY` on Business overview for the same month (invariant). Month `ACTUAL_PROFIT` equals the sum of the daily values on Account KPIs across all accounts (invariant `SUM_ACCOUNTS_EQUALS_COLLECTIVE`).

### WO-05 — Merge Account report + Account KPIs into one Account KPIs page with real numbers

**Goal.** One page: account selector (from the registry, all accounts including Sir Hasib), date range, KPI tiles, a clean daily chart, a per-day table.

**Today.** Two pages; Account KPIs lacks Sir Hasib and shows figures with no source; Account report's chart is unreadable.

**Build.**
1. Page reads the registry; the selector lists `accounts WHERE active = 1` plus "All accounts".
2. Tiles per account × range: `SOLD_SHEET`, `SOLD_API`, orders, `ACTUAL_PROFIT`, `VAT_TO_HMRC`, `MARGIN`, `AD_SPEND_INCL_VAT`, `ROAS`, `RETURNS_API`, `LATE_NOW`, `RATING` (level + three rates).
3. Chart: one panel, daily bars for `SOLD_SHEET` and a line for `ACTUAL_PROFIT`, Pakistan days on the x-axis, y-axis in £, legend, tooltip with the exact values; a second small panel for `AD_SPEND_INCL_VAT` vs `AD_SALES` with its own axis labelled "eBay day" (the two panels are never merged). No smoothing, no synthetic points for missing days (a missing day is a gap with the `ROWS_COVERAGE` reason).
4. Table below the chart: one row per day with the same metric IDs and a "rows written / orders" column.
5. Old routes redirect; the old page code is deleted after the flip.

**Accept.** Sir Hasib appears and his month totals equal his workbook totals (5p). For every account, Σ daily rows = the range tiles (invariant). Σ over all accounts = Business overview collective tiles (invariant). The chart renders for a 90-day range without overlapping labels (screenshot).

### WO-06 — Sidebar: move Tools and Rules & SOPs out of My desk

**Build (safe change, Phase 1).** My desk keeps Home and My tasks. Management group: Management desk (the merged page, WO-02), Business overview, Sales analysis, Account KPIs (merged, WO-05), Account health, Daily report, VAT breakdown, Item risk, Price revisions, Signals, Alerts centre, Truth Check. Add a bottom group **Library** with Tools and Rules & SOPs (keep the SOP badge). Returns & INAD moves under Customer service (WO-10). Sidebar groups, in order: My desk · Management · Advertising · Orders · Listings · Hunting · Customer service · Library. Sidebar config is one file (`config/nav.ts`) with role visibility; no page defines its own nav. Until WO-02 and WO-05 are flipped, the old entries stay and the merged pages are reachable behind their flags.

**Accept.** Screenshot per role (Management, Advertising, Lister, Orders, CS, Hunting) showing the groups; no dead links (crawl every nav item).

### WO-07 — Dispatch and "Late right now": the order truth model

**Goal.** Every order has exactly one dispatch state computed from the eBay API; late means late; refunded-never-sent orders get their own tab; delivered orders are never overdue.

**Today.** "Late right now = 5 (£155.13)" lists orders 39–93 days late that were refunded and never dispatched. "OVERDUE NOW = 2" comes from the workbook's day tabs and includes delivered orders. "5 orders eBay has never seen a dispatch for" mixes both.

**Truth.** Fulfillment API — the **order object alone** decides the state; `shipments` rows only add `shipped_at`, carrier and tracking for display and for `SHIPPED_LATE_30D`. "Has dispatch" = `fulfillment_href_count > 0` (eBay lists a `getShippingFulfillment` URI for every dispatch it knows about) **or** `fulfillment_status = 'FULFILLED'`. State classifier, evaluated in this order — the first match wins:

```
CANCELLED             cancel_state = 'CANCELED'
                      (cancel_state = 'IN_PROGRESS' → also this tab, flagged "cancel requested";
                       it drops back into the paid flow if the request is declined)
REFUNDED_NEVER_SENT   payment_status = 'FULLY_REFUNDED' AND no dispatch
SHIPPED               has dispatch (delivered is a subset of SHIPPED; a SHIPPED order is never
                      late-now, even if shipped_at > ship_by — that goes to SHIPPED_LATE_30D)
PENDING_PAYMENT       payment_status ∈ {PENDING, FAILED} → its own small list, never late
LATE                  paid* AND now > ship_by_earliest
DUE                   paid* AND ship_by_earliest ≤ now + 72h
AWAITING              paid* (everything else that is paid and unshipped; an order with no
                      shipByDate on any line is AWAITING and listed as "no ship-by from eBay")

  paid* = payment_status ∈ {PAID, PARTIALLY_REFUNDED}. A partial refund (a discount, a
  postage refund) does not close an order: it still has to ship, so it stays in the normal
  flow with a 'partial refund' flag. Only FULLY_REFUNDED with no dispatch is "refunded — never sent".
```

`ship_by_earliest` = min over the order's line items of `lineItemFulfillmentInstructions.shipByDate`. Compare in UTC. Tracking uploaded through any channel (portal automation, Seller Hub, AutoLister) shows on the order as a fulfillment href within eBay's own processing time, so the state is right after the next 5-minute `sync-orders` run; the Dispatch page also offers **"Recheck this order"** which re-syncs that one order (and its fulfillment details) immediately.

**Build.**
1. Dispatch tabs, each a register metric: **Late now** (`LATE_NOW`) · **Due within 3 days** (`DUE_3D`) · **Awaiting** (`AWAITING_ONLY`) · **Shipped (7 days)** (`SHIPPED_7D`) · **Refunded — never sent** (`REFUNDED_NEVER_SENT`) · **Cancelled (30 days)** (`CANCELLED_30D`) · **Pending payment** (`PENDING_PAYMENT`). Each tab is `<METRIC>.rows`; each tile is its count; £ on Late and Refunded. Header tiles: `AWAITING_DISPATCH` ("open orders") and `ORDERS_TODAY` ("came in today").
2. Columns: account, order no (link), item, value, ship-by, state reason (e.g. "no dispatch; ship-by 2026-08-26 passed 6 days ago" / "FULLY_REFUNDED on 2026-06-02, no dispatch ever"), for Refunded: refund date and amount from `transactions`.
3. Delete the "OVERDUE NOW — counted from the workbook day tabs" block and the "Month and account" workbook counter. If the owner wants a workbook view, it is the Truth Check cross-source row `SHEET_VS_API_ORDERS`, not a Dispatch number.
4. Home "Late right now", Business overview "Overdue dispatch" and "open orders", Account KPIs "Late now" all render `LATE_NOW` / `OPEN_ORDERS`.

**Accept.** The five orders currently shown as 39–93 days late have `DISPATCH_STATE = REFUNDED_NEVER_SENT` and appear only in that tab, with their refund dates. Orders `10-15060-27951` and `15-15059-67515` have `DISPATCH_STATE = SHIPPED` (assert by query — they will be older than the 7-day tab window by then). For each account, `LATE_NOW` equals the count the owner reads in Seller Hub → Orders → Awaiting dispatch, filtered to past ship-by, at the same minute (owner spot-check, pasted). Invariant `LATE_NOW + DUE_3D + AWAITING_ONLY = AWAITING_DISPATCH` holds for every account. No Dispatch number references a workbook.

### WO-08 — Advertising truth: campaign membership and per-campaign ad status

**Goal.** The portal knows, for every listing and every campaign, whether the ad is ACTIVE, PAUSED, ARCHIVED, or absent — exactly what eBay's Ads tab shows — and every advertising count is built from that.

**Today.** Campaign watch flags 391 items "ACTIVE in more than one RUNNING campaign" and shows chips like "TOP Listings Campaign RUNNING ✕" for ads that eBay shows as *Paused*. Live listings split ("CPC live 509 · General & Dynamic 215 · in no campaign 195") and Wrong advertising ("391 · 195 · 60") inherit the same blindness. "A fresh move can echo here for ~90 minutes" because the data came through a workbook.

**Truth.** Marketing API, per account:
- `getCampaigns` → `campaigns` with `campaignStatus` (RUNNING, PAUSED, SYSTEM_PAUSED, SCHEDULED, ENDING_SOON, ENDED, DELETED, DRAFT, PENDING) and `fundingStrategy.fundingModel` (COST_PER_SALE / COST_PER_CLICK).
- `getAds` for **every** campaign (all pages, no status filter) → `ads` with `listingId`, `adId`, `bidPercentage`, and — for COST_PER_CLICK campaigns — `adStatus` ∈ {ACTIVE, PAUSED, ARCHIVED} and `adGroupId`. eBay documents `adStatus` as "the current status of the CPC ad"; **do not expect it on COST_PER_SALE ads** — if it is absent, treat existence as the status.
- Listing status from `listings` (Trading `GetMyeBaySelling` ActiveList; a listing not in the active list is ENDED).

```
LIVE_MEMBERSHIP(listing L, campaign C) is TRUE iff
   C.status ∈ {'RUNNING', 'ENDING_SOON'}          -- ENDING_SOON still serves ads until ended
   AND L.status = 'ACTIVE'
   AND an ads row (L, C) was seen in the latest COMPLETE sync of C
   AND ( C.funding_model = 'COST_PER_CLICK'  → ad_status = 'ACTIVE'
       | C.funding_model = 'COST_PER_SALE'   → ad_status IS NULL OR ad_status <> 'ARCHIVED' )
Per-chip display status = CAMPAIGN PAUSED | CAMPAIGN ENDED | AD PAUSED | ARCHIVED | LISTING ENDED | LIVE
```

**Build.**
1. `sync-campaigns` as in §3.3, with the run-success guard: ads not returned for a campaign in the latest **complete** run are marked removed (`last_seen_at` < run time) and never count; a partial run changes nothing.
2. **Campaign watch**: rows = listings with ≥ 2 live memberships (`MULTI_RUNNING`), chips per campaign with the display status above (grey for anything not LIVE), the ✕ action = for COST_PER_CLICK `bulkUpdateAdsStatusByListingId` → PAUSED (reversible), for COST_PER_SALE the delete-ad-by-listing method (the only option); after the action, re-sync that campaign and re-render — the row must update within one request cycle, not "~90 minutes".
3. **Live listings split**: four tiles `CPC_ONLY_LIVE`, `GENERAL_ONLY_LIVE`, `BOTH_LIVE`, `NO_CAMPAIGN`, per-account chips, lists under each. Invariant: the four sum to `ACTIVE_LISTINGS`.
4. **Wrong advertising**: `MULTI_RUNNING`, `NO_CAMPAIGN`, `BURNERS_14D`; the ALARM rows compare management's intended campaign (from the Central sheet's Wrong Advertising tab — an *input*, mirrored by `sync-sheets-cold`) with the live memberships; the "read-only from each account's Wrong Advertising tab" spinner disappears because it reads D1.
5. Rate rule `RATE_BREACH` uses `bid_pct` from `ads`.
6. Ad spend, ROAS, wasting, burners: `ad_daily` from report tasks (eBay days); Truth Check cross-checks against `AD_SPEND_BILLED` from Finances.
7. Business overview "campaign gaps" tile renders `NO_CAMPAIGN` / `BOTH_LIVE`.

**Accept.** Pick 20 listings across all accounts (at least 3 that eBay shows as Paused in a CPC campaign, 3 in a General campaign, 3 ended). For each, the portal's chips equal eBay's Ads tab status per campaign — paste the table. `CPC_ONLY + GENERAL_ONLY + BOTH + NO_CAMPAIGN = ACTIVE_LISTINGS` for every account. After pausing one ad through the portal, the row updates on the next render. `MULTI_RUNNING` drops from 391 to the true figure; the report states the figure and why it changed.

### WO-09 — Keyword approvals: the 72-hour keyword-doc task for Zain

**Goal.** 72 hours after a listing goes live in a CPC campaign (once there is data to judge the keywords by), Zain gets a task to upload the keywords document link and record what should happen next.

**Truth.** `CPC_LIVE_EVENT`: in `sync-campaigns`, when a listing's live membership in a COST_PER_CLICK campaign appears (previous complete snapshot none, current one live), insert `cpc_live_events(live_at = sync time)`. **Baseline rule:** the first complete `sync-campaigns` run after the WO-09 flag (`flags.keywordDocs`) is enabled only records the existing memberships as the baseline and creates no events — otherwise every CPC listing already live would flood Zain with hundreds of tasks on day one. Dedupe: at most one event per listing per 30 days (a pause/resume inside 30 days does not re-trigger; a new campaign for the same listing after 30 days does). If the portal's own "Add to CPC" task completes for that listing, use that completion time as `live_at` when it is earlier.

**Timing (default; DECISIONS-NEEDED #8).** The task is created with `opens_at = live_at + 72h` and `due_at = live_at + 96h` — it is invisible to Zain until `opens_at` (Management sees it under "Scheduled"), then he has 24 hours. The owner's words were "create a task for Zain after 72 hours"; if he prefers the task to appear immediately with a 72-hour deadline, change the two constants in `config/sop.ts`, nothing else.

**Build.**
1. On each event: create task `type = KEYWORD_DOC`, `assignee = Zain`, `department = Advertising`, `opens_at`/`due_at` as above, title "Upload keywords doc — <listing title> (<account>)", payload {listing_id, campaign_id, campaign name, live_at}. Link the task id back on the event row.
2. Keyword approvals page gets a section **Keyword docs due** (for Zain: his own, once open; for Management: all, including Scheduled), showing countdown, overdue in red, and the "Open a submission by task ID" box stays.
3. Opening the task shows: listing + campaign, **Keywords doc link** (required; must be a Google Docs/Drive/Sheets URL or a portal attachment), and **Outcome** (one of): *Select for revision now* → creates a `KEYWORD_REVISION_REQUEST` in Management's Waiting on you with the doc link; *No revision needed* → closes; *Needs revision after 72 hours* → closes and creates a follow-up `KEYWORD_DOC` task for Zain on the same listing with `opens_at = now + 72h`, `due_at = now + 96h` (max 3 follow-ups, then it must be an explicit decision); *Archive only* → closes and stores the link in `keyword_docs` with `outcome = ARCHIVE`.
4. Every outcome writes `keyword_docs`; the page has an **Archive** list searchable by listing, account, campaign, date.
5. Overdue KEYWORD_DOC tasks appear in Management desk → Departments → Advertising overdue, like any task.

**Accept.** Move a test listing into a CPC campaign on one account; within one sync cycle the event and the task exist with `opens_at = live_at + 72h` and `due_at = live_at + 96h` to the minute; the task is hidden from Zain until `opens_at` and visible to Management as Scheduled; each of the four outcomes behaves as specified (paste the task rows before/after). Pausing and resuming the same ad within 30 days creates no second task. The baseline run creates zero tasks (paste the count).

### WO-10 — Returns & INAD under Customer service

**Build.** Move the nav entry into the Customer service group (`config/nav.ts`); route, permissions (CS + Management only, buyer data never sent to other roles) and the automation feed unchanged; the feed reads its D1 mirror, not Google, so the spinner goes.

**Accept.** Screenshot of the CS group; a Lister role cannot reach the route (403 test).

### WO-11 — Product hunting: AliExpress duplicate check at the top

**Goal.** Before a hunt is written, the hunter pastes AliExpress links and sees whether the product already exists anywhere in the business.

**Build.**
1. Top of Product hunting: **Check AliExpress link(s)** — textarea, one or many links or item IDs, button *Check*.
2. Normalise every input to `ali_item_id`: patterns `aliexpress.com/item/<id>.html`, `/i/<id>.html`, `m.aliexpress…/item/<id>`, `<id>` bare; short links (`a.aliexpress.com/_…`, `s.click.aliexpress.com`) are resolved server-side by following redirects, then parsed; strip all query parameters. Unparseable → "not an AliExpress item link".
3. Look up the id in: every hunt record's *Product link 1/2/3 · main supplier* (all accounts, all statuses), the supplier sheet mirror, `listings.ali_item_id`. Return per input: **Duplicate** (who hunted it, when, status, account, listing link if live) or **New**. Backfill `ali_item_id` on all existing hunt rows and listings by parsing their stored links (nightly job; report how many parsed / failed).
4. The same check runs on submit; a duplicate blocks submission unless Management overrides with a note (logged).

**Accept.** Paste three known-duplicate links and three new ones; results correct. Backfill report shows ≥ 95 % of stored links parsed (list the failures).

### WO-12 — Internal staff inbox: make it fast, add attachments

**Goal.** The inbox opens in under one second on the office connection, and staff can send images and files.

**Diagnose first (paste the numbers).** Time to first render, number of requests, payload size, D1 query plans for the thread list and unread count, whether the client fetches all 3,000+ messages on open, whether unread counts are computed per render, whether polling re-fetches everything.

**Build.**
1. D1: `threads`, `messages(thread_id, sender_id, body, created_at)`, `message_recipients(message_id, user_id, read_at)` with the indexes in §3.2; unread badge = one indexed `COUNT(*)` on `message_recipients(user_id, read_at)` per request (KV's minimum TTL is 60 s, so it is the wrong place for a badge that must change on read).
2. API: cursor pagination (30 messages per page), `since=<cursor>` polling every 30 s for new items only; thread list returns last message preview only.
3. UI: optimistic send, skeleton loading, no full reloads.
4. **Attachments**: Cloudflare R2 bucket `portal-attachments` (private). Upload through a Worker endpoint (multipart, streamed), limits: images png/jpg/webp/gif and pdf/xlsx/csv/docx/txt, 10 MB per file, 5 per message; MIME sniffed server-side; row in `attachments`; download only through `/api/inbox/attachment/<id>` with the recipient check; inline thumbnails for images; paste-from-clipboard and drag-and-drop. If R2 is not enabled on the account, put it in DECISIONS-NEEDED (fallback: Google Drive folder via the service account) and do not ship a public bucket.

**Accept.** Inbox first render ≤ 1 s with 3,000 messages (paste timings before/after); opening a 200-message thread ≤ 500 ms; an image sent from one user appears inline for the recipient; a non-recipient gets 403 on the attachment URL.

### WO-13 — Signals and alerts: rebuilt from the register, self-closing

**Goal.** "56 pinned to you", "Signals 60", "Strict alerts unacked 840" become true, explainable, and disappear by themselves when the condition ends.

**Build.** Each signal/alert type declares the metric ID and condition it is built on (e.g. `RATE_BREACH`, `BURNERS_14D`, `LATE_NOW`, `MULTI_RUNNING`, price-cost alerts from the sheet mirror). A nightly and every-30-min job re-evaluates: creates missing signals, **auto-resolves** signals whose condition no longer holds (reason "condition cleared at <time>"), and never duplicates. Every signal shows its evidence (the metric result and rows). Signals created by the old logic are re-evaluated once under the new definitions; those that no longer hold are closed with reason "re-evaluated in Truth Update v2".

**Accept.** Every open signal, when clicked, shows a metric ID and evidence; count of open signals on the page equals the sidebar badge (invariant); the 840 figure is replaced by the true count with a one-line explanation in the report.

### WO-14 — Cleanup, redirects, documentation

**Build.** After each flip: delete the replaced code paths; remove sample data and dead endpoints; update `config/nav.ts`; write `docs/NUMBER_REGISTER.md` (final), `docs/SYNC.md` (jobs, cadences, how to re-run), `docs/TRUTH-CHECK.md` (how verification works, what each status means), `CHANGELOG.md`. Bump the build stamp in the sidebar footer.

**Accept.** `grep` for `Math.random`, `sample`, `demo`, `placeholder`, `|| 0` returns nothing outside tests; every route in `config/nav.ts` renders; Truth Check overall status is green for 24 h.

---

## 6. Truth Check — the independent verifier

### 6.1 Principle

Two independent paths to every number. **Path A** is the Metric Engine (`src/metrics/`), which the pages show. **Path B** is the Verifier (`src/truth/`), which recomputes the same register entry from the raw source with separately written code, then compares. Shared code between the two paths is limited to `src/lib/money.ts` and `src/lib/time.ts`. A number that only one path can produce is not verified and is shown with a grey chip until it can be.

### 6.2 Verification methods (each register row names one)

| Method | What Path B does |
|---|---|
| `API_RECOMPUTE` | Re-fetches the raw objects from eBay for the scope (not from D1) and re-derives the number with its own copy of the rules. Orders: the open-order pages of `getOrders` (`orderfulfillmentstatus:{NOT_STARTED\|IN_PROGRESS}`) plus a random 10 % of recent orders — classified from the order fields alone, no per-order calls except for every order on the shown *Late* list. Ads: `getAds` for the campaigns of a 20-listing sample plus every listing on a shown list. Compares count and £ with the shown value. |
| `SHEET_RECOMPUTE` | Re-reads the workbook rows for the day/month directly from the Sheets API, sums the *VAT to HMRC* / *Raw Profit* / *True Order Earning* columns, checks `T = R − S` per row with the ported formula, and compares with the shown totals and with the workbook's own totals row where the layout has one. |
| `D1_RECOMPUTE` | For numbers whose source is the portal's own tables (task counts, approvals, signals, unread messages, hunts): an independent SQL statement in `src/truth/` written against the base columns (`status_raw` and the mapping table, not `status_norm`), compared with the shown value. Always paired with `TILE_EQUALS_LIST`. |
| `INVARIANT` | Pure algebra across metrics: `HOME_EQUALS_OVERVIEW`, `TILE_EQUALS_LIST`, `SUM_ACCOUNTS_EQUALS_COLLECTIVE`, `SPLIT_SUMS_TO_ACTIVE` (CPC only + General only + Both + None = active listings), `DISPATCH_STATES_SUM_TO_OPEN` (`LATE_NOW + DUE_3D + AWAITING_ONLY = AWAITING_DISPATCH`), `RAW_EQUALS_TRUE_MINUS_VAT`, `SIGNAL_COUNT_EQUALS_BADGE`, `MARGIN_EQUALS_PROFIT_OVER_SOLD`. |
| `CROSS_SOURCE` | Two sources that should agree within a stated tolerance and lag: `AD_SPEND` (report) vs `AD_SPEND_BILLED` (Finances) **per month**; `SOLD_SHEET` vs `SOLD_API` for closed days (rows-coverage aware); `SHEET_VS_API_ORDERS`; `LATE_NOW` vs the Seller Hub count entered by the owner in a spot-check form. A disagreement outside tolerance is FAIL; inside the known lag window it is STALE, not FAIL. |

### 6.3 Schedule — what rechecks when (published on the page and in `docs/TRUTH-CHECK.md`)

| Tier | Metrics | Recheck | Method |
|---|---|---|---|
| 1 — money and lateness | `LATE_NOW`, `DUE_3D`, `AWAITING_DISPATCH`, `REFUNDED_NEVER_SENT`, `ORDERS_TODAY`, `ACTUAL_PROFIT` (today, yesterday), `VAT_TO_HMRC` (today, yesterday), `SOLD_SHEET`/`SOLD_API`, `FUNDS`, all task and approval counts | **every 15 minutes** | API_RECOMPUTE, SHEET_RECOMPUTE, D1_RECOMPUTE, INVARIANT |
| 2 — advertising and catalogue | `LIVE_MEMBERSHIP` sample, `MULTI_RUNNING`, split tiles, `NO_CAMPAIGN`, `AD_SPEND` today, `WASTING_TODAY`, `BURNERS_14D`, `RATE_BREACH`, signals | **every 30 minutes** | API_RECOMPUTE (20-listing sample + every listing on a shown list), INVARIANT |
| 3 — history and standards | monthly `VAT_TO_HMRC_MTD`, monthly `ACTUAL_PROFIT`, per-day KPIs for the last 35 days, `RATING`, `IMPRESSIONS`, `AD_SPEND` closed days vs billed | **daily 06:30 PKT** and after every cold sync | SHEET_RECOMPUTE (full month), CROSS_SOURCE |
| Manual | any metric, any page | button **Recheck now** on every tile chip and a **Recheck page** button | the row's method |
| Penny audit | every order row of yesterday, every account | **nightly 03:00 PKT** | per-row R/S/T comparison sheet vs engine; diff table stored |

Each run writes `validation_runs` and sets `next_run_at`. The chip under a tile shows `✓ 12:40 · next 12:55`; the page header shows "142 of 142 numbers verified in the last window · 0 failing · 3 stale (eBay report lag)".

### 6.4 Statuses

`PASS` (delta within tolerance) · `FAIL` (outside tolerance — the tile keeps showing the engine value but with a red chip and the delta) · `STALE` (source lag within its known window, e.g. eBay ad report ≤ 24 h, workbook rows not yet written) · `SOURCE_DOWN` (the verifier could not reach the source; the last PASS time is shown) · `UNVERIFIED` (no Path B exists yet — allowed only during Phase 1 and listed on the page).

### 6.5 The page (`#truthCheck`, Management only; the chips and their evidence popover are visible to every role, read-only)

Sections: **Overall** (verified / failing / stale / down counts, last full run, next runs per tier); **By page** (each portal page → its metrics and their status, so the owner can see "Business overview: 14/14 ✓"); **Failures** (metric, shown, recomputed, delta, since when, evidence link, "create task" button — a FAIL that persists for two runs auto-creates a Management task, deduplicated); **Penny audit** (yesterday's per-order diff table, per account, with a filter for non-zero deltas); **Shadow** (old value vs new value per replaced number, since the shadow began, with the per-module flip switches); **Sync health** (every job's last run, rows, error, per account); **Spot-check forms** (owner types the Seller Hub figure for late orders / active listings / funds; stored as a CROSS_SOURCE run).

### 6.6 Alerts

FAIL for two consecutive runs → Management task "Truth Check: <metric> off by <delta> since <time>" (one open task per metric). SOURCE_DOWN → a single banner on the affected pages only ("eBay Fulfillment API unreachable since 03:18 — figures are as of 03:03"), never a blank tile, never a zero.

---

## 7. Phases and gates — do them in this order

| Phase | Work | Gate to pass before the next phase |
|---|---|---|
| **0 — Discovery (no behaviour changes)** | Inventory every page and every number it renders with file:line and the source it reads today (this is `docs/NUMBER_REGISTER.md` v0, with a `today_source` column). Build the account registry (§3.4) and verify each token's owner. Record every workbook ID, tab, header row and the R/S/T formulas (or `manual`). List every OAuth scope each account's token has versus the scopes the sync jobs need (`sell.fulfillment`, `sell.finances`, `sell.marketing`, `sell.analytics.readonly`, `sell.inventory`/Trading); missing scopes go to DECISIONS-NEEDED with the consent steps — do not run the consent flow yet (R10). List every hard-coded/sample number and every `|| 0`. Produce a module map: every data-fetching function, its callers, and whether this update replaces it. Write `docs/DECISIONS-NEEDED.md` with defaults. | Owner reads `docs/PHASE0-REPORT.md` and answers or accepts defaults. |
| **1 — Truth layer + safe removals** | D1 migrations (§3.2, **additive only** — new tables and columns such as `status_norm`, `fulfillment_href_count`; nothing existing renamed or dropped), sync jobs (§3.3), `src/metrics/` with the register (§4), page API (§3.5), Truth Check core + page (§6), shadow ledger. No number is switched yet; every tile gets the shadow chip. **Safe removals** that replace nothing can ship now: Home Signals block and health cards (WO-01a), Sales analysis banners (WO-04 removal step), sidebar moves (WO-06, WO-10). | Truth Check runs green on all INVARIANT rows for 48 h; every Tier-1 metric has a Path B; sync health shows every job succeeding for every account. |
| **2 — Money** | WO-03 (steps 1–6), WO-04 tiles, WO-05, Home "Yesterday". | Penny audit passes 7 consecutive nights for every account (all rows ±1p, day totals ±5p); owner flips `money` live. |
| **3 — Orders** | WO-07 and Home "Late right now". | Owner's Seller Hub spot-check matches `LATE_NOW` per account; the five refunded orders sit in their tab; owner flips `orders` live. |
| **4 — Advertising** | WO-08, WO-13, WO-03 steps 7–8. | 20-listing table matches eBay's Ads tab; split invariant holds for every account; owner flips `ads`, `catalogue` and `standards` live. |
| **5 — Workflow and structure** | WO-02, WO-09, WO-11, WO-12, Home CS tile. | Acceptance tests of each WO pasted; owner flips `tasks`, `inbox`, `hunting` live. |
| **6 — Cleanup** | WO-14. | 24 h green Truth Check; old code deleted; docs complete. |

Do not reorder phases to "show something quickly". A page switched before its Path B exists is exactly how the portal got here.

---

## 8. Reporting

### 8.1 After every work order — `docs/TRUTH-UPDATE-PROGRESS.md` entry

```
## WO-07 Dispatch — DONE 2026-09-0X 14:20 PKT   flag: orders = shadow
Changed: <files>, migrations <ids>, jobs <names>
Numbers before → after (from Truth Check, all accounts, same minute):
  LATE_NOW 5 (£155.13) → 0 ;  REFUNDED_NEVER_SENT — → 5 (£155.13) ;  OPEN_ORDERS 581 → 588
Why they changed: <one line per number>
Acceptance evidence: <query output / screenshot paths / Truth Check run ids>
Invariants: DISPATCH_TABS_SUM_TO_OPEN PASS, HOME_EQUALS_OVERVIEW PASS
Open questions → DECISIONS-NEEDED #n
```

### 8.2 `docs/DECISIONS-NEEDED.md` — the only place to ask the owner

One line per decision: number, question, recommended default, what happens if unanswered (the default is applied and the item is marked ASSUMED). Seed it with these, which this file could not settle:

1. Which workbook and tab layout is the money workbook per account (Phase 0 lists candidates). **Default:** the per-account sales-analysis workbook, the tab(s) holding per-order rows under the three headers; if both workbooks carry the headers, the sales-analysis workbook wins and the other is a CROSS_SOURCE check.
2. eBay OAuth scopes missing on any account. **Default:** list them, notify Hamza, and keep the affected metrics `SOURCE_DOWN` for that account until consent is done — never work around a missing scope by reading a workbook instead.
3. R2 availability for inbox attachments (default: R2; fallback Google Drive).
4. `CPC_LIVE_EVENT` dedupe window (default 30 days).
5. Whether a "projected profit" for today (before rows are written) is wanted anywhere (default: **no** — show `ROWS_COVERAGE` instead).
6. The Zain user id if ambiguous. **Default:** the `users` row in the Advertising department whose display name is "Zain" or "Zain ul Abideen"; if two match, assign to the one with the most recent login and flag it.
7. Whether the Account health page should be folded into Business overview later (default: keep it, same `RATING` metric).
8. WO-09 timing: task opens at +72 h with a 24 h deadline (**default**), or opens immediately with a 72 h deadline.

---

## 9. Appendix

### 9.1 Coverage map — the owner's requests → work orders

| Request | Where |
|---|---|
| Remove Signals from Home (and from the Account health page if it has a Signals section); remove health metrics from Home; fix "late right now" | WO-01, WO-07 |
| Merge Pending approvals + Management desk + Departments; real numbers | WO-02 |
| Business overview: actual profit with VAT beside it, proper logic; VAT to pay from the sales-analysis column logic | WO-03 (+ §4.2 money) |
| Account rating on Business overview | WO-03 step 5 |
| Merge Account report + Account KPIs; Sir Hasib present; readable chart; no fake numbers | WO-05 |
| Move Tools and Rules & SOPs out of My desk | WO-06 |
| Dispatch: refunded-never-sent tab; delivered orders not overdue; all order stats from the API | WO-07 |
| A separate mechanism that verifies every number, with recheck timing and method | §6, WO-13 |
| Inbox slow; attachments | WO-12 |
| Sales analysis: remove banners; add VAT | WO-04 |
| Campaign watch / Live listings split / Wrong advertising: per-campaign active/paused | WO-08 |
| Keyword approvals: 72 h task for Zain with the four outcomes | WO-09 |
| Returns & INAD under Customer service | WO-10 |
| Product hunting: AliExpress duplicate check at the top | WO-11 |
| "Fix every single number", "change the whole skeleton if needed", "stop the agent's confusion" | §0, §1, §3, §7 |

### 9.2 eBay API cheat-sheet (verified against developer.ebay.com on 1 Sept 2026 — re-check the docs before coding; quote the doc URL in the register row)

**Fulfillment API** — `GET /sell/fulfillment/v1/order` with `filter=lastmodifieddate:[<ISO>..]` or `creationdate:[<from>..<to>]`, and `orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}` when only open orders are wanted. Order fields used: `orderId`, `creationDate`, `lastModifiedDate`, `orderFulfillmentStatus`, `orderPaymentStatus` ∈ {PAID, PENDING, FAILED, FULLY_REFUNDED, PARTIALLY_REFUNDED}, `cancelStatus.cancelState` (`NONE_REQUESTED` when nothing was requested; `CANCELED` when cancelled), `fulfillmentHrefs[]` (the `getShippingFulfillment` URIs — an empty array means eBay has never seen a dispatch), `lineItems[].lineItemFulfillmentInstructions.shipByDate` / `minEstimatedDeliveryDate` / `maxEstimatedDeliveryDate`, `lineItems[].lineItemFulfillmentStatus`, `lineItems[].refunds[]`, `paymentSummary`, `totalMarketplaceFee`, `totalFeeBasisAmount`. Shipments: `GET /sell/fulfillment/v1/order/{orderId}/shipping_fulfillment` → `shippedDate`, `shipmentTrackingNumber`, `shippingCarrierCode`, `lineItems[]`.

**Marketing API** — `GET /sell/marketing/v1/ad_campaign` → `campaignStatus` ∈ {RUNNING, PAUSED, SYSTEM_PAUSED, SCHEDULED, ENDING_SOON, ENDED, DELETED, DRAFT, PENDING}, `fundingStrategy.fundingModel` ∈ {COST_PER_SALE, COST_PER_CLICK}. `GET /sell/marketing/v1/ad_campaign/{campaign_id}/ad` (paginate with `limit`/`offset`; supports `listing_ids` and `ad_status` filters — sync without the status filter) → `ads[]` with `adId`, `listingId`, `bidPercentage`, and for CPC ads `adStatus` ∈ {ACTIVE, PAUSED, ARCHIVED} and `adGroupId`. Status changes: `POST /sell/marketing/v1/ad_campaign/{campaign_id}/bulk_update_ads_status_by_listing_id` with `{listingId, adStatus}`; removal: the delete-ads-by-listing-id method of the same resource. Spend: `POST /sell/marketing/v1/ad_report_task` — the sync uses one type, `CAMPAIGN_PERFORMANCE_REPORT` (item level, with campaign, listing and day dimensions); the others exist for reference (LISTING_PERFORMANCE_REPORT daily per listing, TRANSACTION_REPORT transaction level for general and priority campaigns, ACCOUNT_PERFORMANCE_REPORT daily account view). Poll `getReportTask`, then download the report. Metrics available: impressions, clicks, CTR, average CPC, ad fee, sold quantity, sales amount, conversion rate, ROAS. Ad fees are ex VAT. Phase 0 copies the exact dimension and metric key strings from the current docs into `config/ebay.ts`.

**Analytics API** — `GET /sell/analytics/v1/seller_standards_profile/{program}/{cycle}` with `program = PROGRAM_UK` (also PROGRAM_US/DE/GLOBAL), `cycle = CURRENT | PROJECTED`; scope `sell.analytics.readonly`; response `standardsLevel` ∈ {TOP_RATED, ABOVE_STANDARD, BELOW_STANDARD}, `cycle.evaluationDate`, `metrics[]` with `metricKey`, `value`, thresholds/levels. Log the exact `metricKey` strings the API returns on the first sync and put them in the register. `GET /sell/analytics/v1/traffic_report?dimension=DAY|LISTING&metric=LISTING_IMPRESSION_TOTAL,LISTING_VIEWS_TOTAL,TRANSACTION,SALES_CONVERSION_RATE&filter=…` (eBay days; trails).

**Finances API** (host `https://apiz.ebay.com`, not `api.ebay.com`) — `GET /sell/finances/v1/transaction` → `transactionType` ∈ {SALE, REFUND, CREDIT, DISPUTE, NON_SALE_CHARGE, SHIPPING_LABEL, TRANSFER, ADJUSTMENT, WITHDRAWAL, LOAN_REPAYMENT, PURCHASE}; SALE rows carry the order's fees (`totalFeeAmount`, per-line `marketplaceFees[]` with `feeType`); ad fees for promoted listings appear as fees on SALE rows (general) and as NON_SALE_CHARGE rows (priority/CPC billing) — confirm the exact `feeType` strings on first sync and register them. `GET /sell/finances/v1/seller_funds_summary` → available / processing / on-hold / total funds.

**Listings** — Trading `GetMyeBaySelling` (`ActiveList`, paginated, 200 per page) for the active-listing set, or the Inventory API where listings are inventory-managed; record which each account uses in Phase 0.

**Google Sheets API** — `spreadsheets.values.batchGet` with `valueRenderOption=UNFORMATTED_VALUE` for values and `=FORMULA` for the formula pass; locate columns by header text on the recorded header row; the sync jobs use a service account with **read-only** access to every workbook in the registry (the portal's existing write paths, listed in Phase 0, keep their own credentials and are untouched by this update).

### 9.3 Sheet-formula porting procedure (WO-03 step 1, done once per workbook layout)

1. Read the header row; find *True Order Earning*, *VAT to HMRC*, *Raw Profit* (trim, case-insensitive; fail loudly if any is missing or duplicated).
2. Read the formulas of those three cells on the first three data rows. If they are values, record `manual` and stop; the verifier then checks only `T = R − S` and the totals row.
3. Expand every cell reference in the formula to `<header>@row` recursively until only input columns (typed values) and constants remain. Record the expanded expression in the register.
4. Implement the expression in `src/truth/profit.ts` with the same operator order and rounding (`ROUND` → half away from zero, two decimals, as Sheets does).
5. Test: for 200 random rows across accounts and months, `|ported − sheet| ≤ 1p` for each of R, S, T; day totals `≤ 5p`. If any row fails, the sheet has a row-level exception — record it, do not "fix" the formula to make it pass.

### 9.4 Reference pseudo-code

```ts
// src/metrics/orders.ts — one function, used by every page; decided by the order object alone
export function dispatchState(o: OrderRow, now: Date): DispatchState {
  if (o.cancel_state === 'CANCELED' || o.cancel_state === 'IN_PROGRESS') return 'CANCELLED'; // flag 'requested' for IN_PROGRESS
  const hasDispatch = o.fulfillment_href_count > 0 || o.fulfillment_status === 'FULFILLED';
  if (o.payment_status === 'FULLY_REFUNDED' && !hasDispatch) return 'REFUNDED_NEVER_SENT';
  if (hasDispatch) return 'SHIPPED';
  const paid = o.payment_status === 'PAID' || o.payment_status === 'PARTIALLY_REFUNDED';
  if (!paid) return 'PENDING_PAYMENT';
  if (o.ship_by_earliest && o.ship_by_earliest < now) return 'LATE';
  if (o.ship_by_earliest && o.ship_by_earliest <= addHours(now, 72)) return 'DUE';
  return 'AWAITING';   // includes "no ship-by from eBay" (rare) — never silently LATE, never silently fine
}

// src/metrics/ads.ts
export function liveMembership(l: Listing, c: Campaign, ad: Ad | null, lastCompleteRunAt: Date): boolean {
  if (!ad || ad.last_seen_at < lastCompleteRunAt) return false;   // not in the latest complete sync of this campaign
  if (!['RUNNING', 'ENDING_SOON'].includes(c.status) || l.status !== 'ACTIVE') return false;
  return c.funding_model === 'COST_PER_CLICK'
    ? ad.ad_status === 'ACTIVE'
    : ad.ad_status == null || ad.ad_status !== 'ARCHIVED';
}

// src/metrics/money.ts — display reads values; verification (src/truth/profit.ts) recomputes
export function actualProfit(rows: SheetRow[]): Pence {
  return sumPence(rows.map(r => r.values['Raw Profit']));   // never 0.8 × anything
}
export function vatToHmrc(rows: SheetRow[]): Pence {
  return sumPence(rows.map(r => r.values['VAT to HMRC']));
}
```

### 9.5 Definition of done for the whole update

All fourteen work orders ticked with evidence; Truth Check green (no FAIL, no UNVERIFIED) for 24 hours across every account in the registry; every flip switch set to live by the owner; old pages and formulas deleted; `docs/NUMBER_REGISTER.md`, `docs/SYNC.md`, `docs/TRUTH-CHECK.md`, `CHANGELOG.md` current; the sidebar footer build stamp updated.
