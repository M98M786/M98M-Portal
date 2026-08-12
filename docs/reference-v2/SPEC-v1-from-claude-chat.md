# M98M PORTAL — THE BIG UPDATE (SPEC v1)
**For Claude Code. Read fully before writing a line.** This supersedes §30 of the master prompt where they conflict. The existing backend (119 actions), the six self-contained portals, and every working sheet job stay alive — this update wraps them in a speed layer and finishes the feature set. Hasib's 40 requirements are all mapped in §5; nothing is optional unless marked.

---
## 0. GUARDRAILS
- G-1 Never break a working sheet job. All new writes are **dual-writes** (Engine/DB + the exact sheet cell the team uses today). If the portal dies, staff work from sheets with zero loss (req 17).
- G-2 **Sir Hasib has NO eBay API.** `accounts.api_enabled=false` → every sync job skips it; its listings/orders/sales come from the sheets bridge; UI shows a `SHEET` source chip where other accounts show `API`.
- G-3 Shadow mode first: every new writer runs 48h logging what it *would* write before it writes.
- G-4 Profit visibility is law (see §6 matrix). Enforced server-side, not just hidden in UI.
- G-5 Every feature below ships with its acceptance test (§11). A feature without its test passing is not done.

## 1. ARCHITECTURE — "THE ENGINE"
```
eBay APIs (6 accounts) ─┐                        ┌─ Portals (6 self-contained HTML)
Sheets bridge (all 7) ──┤→ CF Worker + D1 + KV →─┤   reads: Engine (50–150ms)
Apps Script (existing) ─┘   cron sync + webhooks └─ writes: Engine → dual-write → Sheets + Apps Script log
```
- **Cloudflare Worker** = API gateway + auth + cron. **D1** (SQLite at edge) = the fastest DB for this scale. **KV** = hot cache (dashboard rollups, 60s TTL).
- Apps Script backend stays as: sheets bridge executor, fallback transport (portals auto-fall back if Engine unreachable), and legacy action host. Portals call Engine first, Apps Script second — same envelope `{action, idToken, payload, idem}` so **zero portal rewrites** for transport.
- Hasib's PC: optional dev runner (wrangler dev) only. Not production.
- Speed budgets (hard): screen open ≤400ms via Engine; ≤2.5s via fallback; tracking push visible on eBay ≤60s; campaign change detected ≤5 min; loss alert cycle exactly 5 min.

## 2. D1 SCHEMA (create migrations in /engine/migrations)
`accounts(id, name, api_enabled, oauth_ref, couriers_json)` · `users(email PK, name, role, status, modules_json, tools_json, super)` · `items(item_id PK, account, title, price, qty, status, image, sold_30d, api_synced_at, ali_cost, sup1, sup2, sup3, current_sup, sup1_link, sup2_link, sup3_link, campaign_name, campaign_type, notes, enriched_by, enriched_at)` — API-owned cols never human-edited; human cols never API-overwritten. Computed on read: OE (Brain v17), profit, ROI, margin, last-week avg profit/unit (req 8/33). · `orders(order_id PK, account, item_id, variation, sold, cost, ali_order, ali_link, tracking, courier, status, buyer, dates…)` · `trackings(order_id, tracking, courier_ebay_code, pushed_at, push_status)` · `campaign_events(id, account, campaign, item_id, change_type, old, new, actor, at)` · `ads_daily(account, item_id, date, spend, clicks, sales, cpq)` (cpq = cost/quantity sold — req 31) · `sales_daily(account, date, sold, oe, cost, ads, profit)` (profit col visible mgmt-only) · `cases(...19 cols)` · `buyer_messages(account, msg_id, buyer, text, received_at, answered)` (only received — req 14) · `violations(account, item_id, type, text, at, ack_by)` · `tasks(id, type, assignee_email, item_id, payload_json, state, chain_json, due, created_by)` · `notifications(id, to_email, severity, title, body, item_id, action_url, created, ack_at, dedupe_key)` · `audit(actor, action, target, old, new, at)` · `auto_msgs(account, trigger, template, delay_min, enabled)` (req 15). Indexes on every FK + (account,date).

## 3. SYNC JOBS (Worker cron)
- `listingSync` */15min: Trading GetMyeBaySelling per api_enabled account → items API cols. Sheets-bridge fills the same cols for Sir Hasib.
- `orderSync` */5min: Fulfillment getOrders → orders; detect new order → CS auto-message trigger (req 15) + order appears in processor desk.
- `trackingPush` event-driven: processor saves tracking → Worker maps courier to eBay carrier enum (Royal Mail, EVRi, Yodel, DPD, DHL, Amazon Shipping UK…) with **auto-selected courier from eBay's accepted list per account** (req 3), `createShippingFulfillment` immediately, writes push_status + dual-writes Trackings tab (exact existing columns).
- `adsSync` */5min: Marketing API campaigns+report → ads_daily + **diff engine** → campaign_events → notifications (req 4/21/22): message format §4; detects add/remove/pause/activate/budget/bid changes AND duplicate-ACTIVE membership (only counts ACTIVE campaigns — req 22).
- `financeSync` hourly (Ed25519): real fees → sales_daily correction vs Brain v17 drift alert.
- `csSync` */10min: getOrders returns/cancellations + Post-Order cases (INAD/INR), buyer messages (received only), service metrics daily, listing violations feed (req 14/40) → violation alert to CS + Management with the exact message text.
- `recheckFeed` (req 39): rechecking desk keeps its 4-stage technique but stage data = API (tracking status, est delivery, overdue flag, awaiting-dispatch) not sheet ages.
- `rollups` nightly + on-demand: sales_daily, weekly/monthly KPIs, account health snapshot, last-week avg profit per item, backup export to R2 + Drive (req 18).
- All jobs: skip api_enabled=false; rate-limit aware; exponential backoff; every run logged to audit.

## 4. NOTIFICATION QUALITY LAW (req: "alerts are useless")
Template (mandatory, no exceptions): **[Severity] Who/what · Account · Item (ID + short title) · old → new · why it matters · one action.**
- BAD (current): "Signal: value 1.03 baseline 3.03". BANNED.
- GOOD: "🔴 Zain paused campaign ABRT-Testing-Aug at 6:14 PM — 12 items lost ads coverage. If intentional, ignore; otherwise Reactivate →"
- GOOD: "🔴 Loss item: LED Strip 5m (336704118820, Sir Hasib) made −£3.42 yesterday vs +£1.10 30-day avg. Ads ate 17% of price. Fix →"
- GOOD: "🟠 Duplicate ACTIVE campaigns: 336705981012 in ABRT-Testing-Aug AND ABRT-General-5% — double fees on every sale. Remove one →"
- Dedupe by dedupe_key/day; severity 🔴🟠🔵; digest page groups by account; every notification deep-links its action.
- **Loss-item escalation (req 7):** item negative yesterday → sticky task to Zain + Team Lead; re-ping every 5 min during shift hours until resolved by choosing exactly one: `Changed advertising` / `Changed price` / `Decision by management — keep same`. Choice + actor + time logged; management sees the resolution feed.

## 5. REQUIREMENT MAP (Hasib's numbering → build)
**First change:** 1 API-first everywhere + sheets parallel (§1,§3; Sir Hasib G-2) · 2 API sales + live ads dashboards + live active-listings styled like Order Earning & Processing (order-ops components, same table anatomy) · 3 tracking tab API push + courier auto-select (§3 trackingPush) · 4 campaign-change watcher with human messages (§3 adsSync, §4) · 5 code speed rules (§9) · 6 API/direct reads (§1) · 7 portal computes sales-analysis figures from ads spend + processor costs using Brain v17/sales-sheet identities (rollups) · 8 Management **Access Control desk**: add/edit/delete users, assign multiple modules live, per-person tools, company Google accounts registry (users table; UI in management portal).
**Second module:** 1 §4 law · 2 Active Listings DB page: live price, OE via central-sheet formula, sup1/2/3 + links + current supplier, profit — supplier edits by processors dual-write sheet; supplier truth = sheets, listing truth = API · 3 processor view of items = OE, sold price, cost, supplier cost ONLY · 4 profit calc + campaign type/name = mgmt, TL, advertising only (server-enforced) · 5 sales data → mgmt overview + TL + advertising · 6 business/daily profit = management ONLY · 7 loss workflow (§4) · 8 TL+Zain get last-week avg profit + expected per-unit profit ex-ads · 9 mgmt gets every department dashboard with collective per-worker data · 10 tools open in NEW TAB, assigned per department/person, mgmt grant/revoke live · 11 mgmt adds company Google accounts + edits staff details · 12 KPIs, daily report, health, CPC, orders, active listings, ads dashboards = API-fed · 13 ads dashboard fastest + profit-based alerts · 14 CS mega-dashboard: calculations history, open eBay buyer messages (received only), queries needing answers, all-account health, open returns + live data, INAD, INR, service metrics, **listing-violations dashboard + instant alert with the violation text** · 15 CS auto-messages: triggers {order arrived, return opened, neg FB, pos FB, shipped, buyer query}; CS agent controls per-account: on/off, template, delay, which accounts (auto_msgs table + sender via eBay messaging) · 16 orders show Ali link if present; if missing, processor adds seller1/2/3 links on first order → items table + sheet · 17 dual-write everywhere (G-1) · 18 nightly backups R2+Drive; every dashboard datum has a DB row behind it · 19 max API (§3) · 20 **OE calculator embedded**: advertising/hunter/processor/TL versions (full vs employee editions, v15.4 logic) · 21 campaign-type change → notify Zain · 22 duplicate check counts ACTIVE only · 23 taskflow engine (tasks.chain_json; states Submitted→Approved/Returned; §5 flows) · 24 multiple modules per person (users.modules_json; mgmt UI) · 25 Listing Tool, CPC research, Keywords tool = tool registry entries, new-tab launch, token-locked · 26 tools per assigned person only · 27 lister task detail = **structured field grid** (Title / Specifics table / Images / Price / Account / Notes) never a paragraph · 28 auto task: CPC item +72h → revision task "selected for revision by automated system" → **Hamza's portal** · 29 listed item 7 days & 0 sales & in General → auto task → **Umar's portal** · 30 Zain edits campaign type inline on Active Listings · 31 Zain+mgmt dashboard: **ad cost per quantity sold per item**, weekly/monthly KPI history · 32 custom date range (the order-ops rangepop) on every submission, sales view, history · 33 TL sees per-item profitability + yesterday item profit + ads details, NEVER account totals · 34 Potential-CPC chain: Zain adds → Mgmt approval → Lister revision → TL price revision → back to Zain to add to campaign (tasks.chain_json drives it) · 35 Account Health = its own menu + dashboard (tracker data + API metrics) · 36 Daily account report = its own dashboard (existing daily-report working) · 37 Keyword-approvals dashboard **built by reading the "hamza - listing revision required" sheet** — Claude Code reads that sheet's real columns first · 38 Daily agenda rebuilt: targets, meetings, shoutouts, rule pushes, per-role · 39 rechecking desk = same techniques, API data (§3 recheckFeed) · 40 CS API-complete: open/closed cases, 30/90-day history, live responses, return reasons, everything Post-Order exposes.

## 6. VISIBILITY MATRIX (server-enforced)
| Data | Mgmt | TL | Zain | Lister | Hunter | Processor | CS |
|---|---|---|---|---|---|---|---|
| Business/account daily profit | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Per-item profit/loss, yesterday | ✔ | ✔ | ✔ | ✖ | own calc only | ✖ | ✔(lookup) |
| Campaign name/type | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✔(read) |
| OE + sold + cost + supplier cost | ✔ | ✔ | ✔ | ✖ | ✖ | ✔ | ✔ |
| Sales dashboards (no profit) | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ |
| Last-week avg profit/unit ex-ads | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ |

## 7. UI STANDARD ("million-dollar")
Order-ops design system only (m98m-theme). Source chips API/SHEET on every table. Skeleton loaders, never spinners >400ms. rangepop date control everywhere (req 32). Structured field grids, zero paragraphs in tasks (req 27). Tools launch new tab with one-time token. Every number 2dp, PKT times, mono IDs. Notifications page = digest by account with action buttons.

## 8. SECURITY ADDENDUM (RL-11…16)
RL-11 Engine verifies Google ID token on every call (same as Apps Script) + role from users table, not client. RL-12 eBay tokens in Worker Secrets only; per-account scopes; never logged. RL-13 tool launches use 5-min single-use tokens. RL-14 access-control changes (modules/tools/users) write audit rows + notify Management. RL-15 CORS locked to portal origins; rate limits per email. RL-16 backups encrypted; restore drill monthly.

## 9. CODE-SPEED RULES for Claude Code (req 5)
One round trip per screen (batch stays). Hot paths comment-light, shared helpers, no dead code. D1 prepared statements + indexes; KV rollup cache 60s; ETag/304 on reads; gzip; portals lazy-render below-fold panes; minified core inline. Measure: log server time per action; fail build if p95 > budget.

## 10. DRY RUN (a day, end to end)
9:02 PM Zeeshan opens Orders (Engine, 240ms). New order auto-message already sent to buyer (template CS set for Azhar). He buys, enters cost+Ali order no; missing Ali link → form asks seller1 link once → items+sheet updated. Pastes tracking; courier auto-selected "EVRi"; eBay shows tracking 41s later; Trackings tab row appears. 9:35 PM adsSync catches Zain adding 336712889034 to Scaling → notification to Zain+Mgmt in plain English. 11:05 PM rollups mark LED Strip negative for the day → 8:00 AM sticky loss task to Zain+Yousaf, pings every 5 min in shift until Zain picks "Changed advertising"; Mgmt sees resolution. 72h after a CPC listing goes live → revision task lands in Hamza's portal tagged "selected for revision by automated system". Day-7 zero-sales General item → task to Umar. Zain nominates a Potential-CPC → Hasib approves → Umar revises → Yousaf reprices → back to Zain, added to campaign; chain visible at every step. Hasib opens Management: every department dashboard, collective per-worker data, business profit only on his screen. A listing violation appears on Hafiza → CS + Hasib get the alert with eBay's exact text inside 10 minutes.

## 11. PHASES & ACCEPTANCE
**A (48h, no new infra):** batch+cache in Apps Script, notification law rewrite, structured lister cards, custom date ranges, access-control desk v1, OE calculators embedded. Test: screens ≤2.5s; zero old-format alerts.
**B (Engine):** Worker+D1+KV, migrations, listing/order sync, portals point Engine-first. Test: ≤400ms reads; Sir Hasib rows show SHEET chip.
**C:** trackingPush, adsSync+diff notifications, loss workflow, rechecking-from-API, dashboards (KPIs, health, daily report, ads CPQ, keyword approvals from Hamza's sheet), auto-task flows 28/29/34. Tests: §1 budgets; 5-min loss ping proven; duplicate-ACTIVE detected.
**D:** CS mega-dashboard + violations + auto-messages + Post-Order history. Test: violation alert ≤10 min with text; auto-message respects CS agent's per-account settings.

## 12. DATA HASIB PROVIDES (checklist for Claude Code)
1. eBay developer keyset (App ID, Dev ID, Cert ID) + RuName (exists: ZAREEN_LTD) — production keys.
2. OAuth consent click for each **API-enabled** account (6 — Sir Hasib excluded): Claude Code sends each consent link; Hasib clicks Allow.
3. Cloudflare account (free) — email login for wrangler; or say "use my PC" and Phase B waits.
4. Confirm couriers actually used per account (Royal Mail / EVRi / Yodel / DPD / other?).
5. Share the "hamza - listing revision required" sheet (req 37) + Trackings tab (confirm column headers verbatim).
6. CS auto-message templates per account tone (or approve Claude-drafted defaults before enabling).
7. Current module→person + tool→person matrix (one message: who gets what today).
8. Loss-alert shift hours for the 5-min ping (suggest 2 PM–11 PM PKT).
9. GitHub repo for portals (Pages) + Apps Script /exec already in hand; Script Properties access for tokens.
10. Anthropic/AI keys if AI insights move to Engine (optional Phase C+).

## 13. QUESTIONS (answer in one message)
Q1 Which accounts definitely HAVE working eBay API access — all six except Sir Hasib, or fewer? Q2 Do you already have the eBay production keyset, or do we apply now? Q3 Cloudflare (free, recommended) or insist on PC-server? Q4 Couriers per account? Q5 Auto-messages ON at launch for which accounts? Q6 Loss-ping hours confirm? Q7 Team Lead for routing today = Yousaf? Q8 Hamza + Umar portal emails for auto-tasks = m98mone…/m98m… (confirm exact). Q9 OK that TL sees per-item ads spend (needed for req 33) while never seeing account totals? Q10 When do we schedule the Cert-ID rotation with Hamza (AutoLister depends on it)?
