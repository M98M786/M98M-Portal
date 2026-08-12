# M98M PORTAL V2 — THE BIG UPDATE (build contract, v2 FINAL)
_Written 13 Aug 2026 by the session that built and shipped V1. Supersedes
`docs/reference-v2/SPEC-v1-from-claude-chat.md` (kept verbatim for reference) — that spec was
written without access to this repo; THIS document reconciles it with the code that actually
exists. Where the two disagree, this file wins. Hasib's 40 requirements are all mapped; the
SPEC-v1 §5 requirement map remains the index into them._

---
## 0. WHAT THE SPEC-WRITER DIDN'T KNOW (read before planning anything)

1. **There are not "six self-contained portals."** Production is ONE `public/index.html`
   (33 role-gated views, GIS auth, warm-up prefetch, `cachedCall` last-answer cache, slow-server
   banner, auto-batching `api()`). The four files in `docs/reference-v2/` are DESIGN references
   (Royal theme v2, order-ops table anatomy, rangepop date control, KPI/panel/drawer components)
   — adopt their look and components INSIDE the existing shell. Do not fork into six files: that
   would re-open auth, caching, RL-scan, and double every future fix.
2. **Node is broken on this Mac** (old install, PATH issues; gh was installed via guided .pkg).
   `wrangler` needs Node. Phase B therefore starts with EITHER a guided Node LTS .pkg install
   (same checksum-verified flow used for gh) OR dashboard-paste deployment of the Worker +
   D1 console migrations. Both work from the pane; plan for the .pkg first, it's 10 minutes.
3. **The backend is 927KB / 1,664 functions with a measured cost**: ~1.3s Google toll +
   ~1.6s parse per request, tails to 13.5s. That is WHY the Engine exists. Keep the Apps Script
   backend as workflow/fallback host exactly as SPEC-v1 says — but do not add heavy new read
   paths to it; new hot reads belong to the Engine from day one.
4. **Sheet Contract + shadow mode are law and already implemented** (SheetBridge.gs, whitelists,
   `pipeline_write_external`). Engine dual-writes to sheets MUST route through the same
   discipline: header-name addressing, whitelisted columns, SHADOW first (G-3 = our existing
   shadow pattern, 48h per new writer), old→new logging. The Engine writes sheets via the
   Sheets API with the SAME whitelists mirrored in `/engine/src/sheetContract.ts` — generate
   that file FROM SheetBridge.gs, never hand-copy.
5. **USERS is the portal's own tab** — extending it with `modules_json`, `tools_json`,
   `accounts_json` columns is allowed (append-only, header-addressed reads keep working).
   Write a `migrateUsersV2()` run-once that appends headers if absent.
6. **Brain v17 is authoritative and per-account** (each "⚙ Config" tab; ABRT vehicle FVF is
   still a placeholder — V2's financeSync drift alert will surface this on day one; that is
   correct behaviour, not a bug).
7. **Actor attribution on eBay changes is impossible from the API.** SPEC-v1's example
   "Zain paused campaign X" may only be used when the change went through OUR portal. External
   changes must say "Campaign X was paused on eBay at 6:14 PM (changed outside the portal)".
   The notification law (§4 of SPEC-v1) stands, with this honesty rule added — inaccurate
   alerts are the exact thing Hasib is angry about.
8. **Pane lessons** (memory + HANDOFF): Apps Script function picker silently reverts (run
   one-offs via temporary 1-minute trigger); consent popups open as real tabs from the
   Add-Trigger flow; Material dropdowns need screenshot-located double clicks. Applies to any
   V2 step that touches the Apps Script editor.

## 1. FINAL ARCHITECTURE

```
eBay APIs (api_enabled accts) ─┐                       ┌─ public/index.html (one shell,
Sheets (all 7 workbooks) ──────┤→ ENGINE ──────────────┤   Royal v2 skin, 33+new views)
Apps Script (119+ actions) ────┘  CF Worker + D1 + KV  │   reads: Engine first (≤400ms),
                                  cron sync + diffs    │          /exec fallback (≤2.5s)
                                                       └─ writes: Engine → dual-write
                                                          (D1 + exact sheet cell) + audit
```
- **Engine = Cloudflare Worker + D1 (SQLite) + KV + R2** (free tier covers this scale;
  recommended over Hasib's PC — the PC is Darwin 21, sleeps, residential IP; PC = dev runner
  only). If Hasib insists on PC-server (Q3), the same code runs under `wrangler dev` behind a
  Cloudflare named tunnel, accepted as DEGRADED mode with an on-call restart doc.
- **Transport in the client**: extend `api()` — try `ENGINE_URL` with a 1.5s abort, fall back
  to `/exec` transparently (same `{action, idToken, payload, idem}` envelope; SPEC-v1 was right
  that zero view rewrites are needed). `cachedCall`/warm-up keep working unchanged on top.
- **Auth**: Engine verifies the Google ID token per request (tokeninfo, 5-min digest cache —
  port `verifyGoogleToken_` behaviour), then role/modules from D1 `users` (synced from USERS
  tab every 5 min + on change). RL-11..16 from SPEC-v1 §8 adopted verbatim.
- **Sir Hasib's account: `api_enabled=false` forever** (G-2). Every table shows an
  `API`/`SHEET` source chip.

## 2. DATA MODEL — SPEC-v1 §2 adopted with three corrections
1. `items`: split API-owned vs human-owned columns into TWO tables joined on item_id
   (`items_api`, `items_facts`) — the "never overwrite each other" rule becomes a schema
   guarantee instead of a code promise.
2. `notifications.dedupe_key` gets a UNIQUE(day, dedupe_key, to_email) index — dedupe by
   constraint, not by code.
3. Add `sync_state(job, account, cursor, last_ok, last_error)` — every cron job is resumable
   and its health is visible on the Management ops panel.

## 3. SYNC JOBS — SPEC-v1 §3 adopted, with cadences confirmed
listingSync */15m · orderSync */5m · trackingPush event-driven (courier auto-select from each
account's accepted-carrier list; push visible on eBay ≤60s) · adsSync */5m with diff engine
(add/remove/pause/activate/budget/bid + duplicate-ACTIVE detection, req 22 counts ACTIVE only)
· financeSync hourly (real fees vs Brain v17 → drift alert) · csSync */10m (returns, INAD/INR,
cases, buyer messages RECEIVED only, service metrics, listing violations → instant alert with
eBay's exact text) · recheckFeed (same 4-stage technique, API data) · rollups nightly
(sales_daily, weekly/monthly KPIs, CPQ per item, last-week avg profit/unit, account health
snapshot, backup to R2 + Drive). All jobs skip api_enabled=false, are rate-limit aware,
exponential backoff, audit-logged, resumable via sync_state.

## 4. THE NOTIFICATION LAW — SPEC-v1 §4 verbatim + the honesty rule (§0.7)
Template: **[🔴🟠🔵] What happened · Account · Item (ID + short title) · old → new · why it
matters · ONE action link.** Dedupe per day. Digest page grouped by account. The loss-item
escalation: negative-yesterday item → sticky task to Zain + Team Lead, re-ping every 5 min
during shift hours until resolved with exactly one of `Changed advertising` / `Changed price` /
`Decision by management — keep same`; resolution feed visible to Management. Kill every alert
that fails the template — the old Signals format is BANNED from user-visible surfaces.

## 5. REQUIREMENT MAP — SPEC-v1 §5 stands as the index (all 8 + 40 items)
Implementation notes that change against V1 code:
- **req 27 (lister paragraph)**: the fix is in `Listing.gs` task payload + `view-listing.js`
  card renderer — structured grid: Title / Specifics table / Images / Price / Account / Notes.
- **req 28/29 (72h→Hamza, 7d-zero-sales→Umar)**: new sweeps in Tasks.gs on the existing
  hourly trigger; assignee emails from Q8, never hardcoded (rl-scan will catch it).
- **req 34 (Potential-CPC chain)**: extends the EXISTING PotentialCpc.gs states with
  `chain_json` — Zain → Mgmt approve → Lister revision → TL price → back to Zain.
- **req 37**: FIRST read the real "hamza - listing revision required" sheet headers (they will
  have typos/trailing spaces like every other workbook — REALITY-MAP discipline), THEN build.
- **req 20 (OE calculator)**: Brain v17 already lives in Brain.gs + the fee-calc HTML in
  Downloads; embed as a view with role-versioned fields (full for TL/advertising; employee
  edition for hunters/processors).
- **req 8/24 (modules)**: `modules_json` on USERS + Management Access-Control desk (extend
  StaffAdmin.gs + view-staff.js); `canSee()` in the shell gains module awareness; role stays
  as the default module bundle so nothing breaks for existing staff.
- **req 10/25/26 (tools)**: tools open in a NEW TAB via the existing authenticated
  `toolHtml` route + a 5-min single-use token (RL-13); per-person grants in tools_json.

## 6. VISIBILITY MATRIX — SPEC-v1 §6 adopted verbatim, enforced in BOTH servers
(Engine middleware + existing `stripForRole_`). One addition: Team Lead sees per-item ads
spend (needed for req 33) but NEVER account totals — confirmed as Q9.

## 7. UI — Royal v2 (docs/reference-v2/) inside the existing shell
Adopt: m98m-theme.css tokens (merge over current VIEW_CSS), order-ops table anatomy, rangepop
custom date control (req 32 — every submission/sales/history view), KPI strip, drawer, source
chips, skeleton loaders (no spinner >400ms when Engine is up), structured field grids, mono
IDs, 2dp money, PKT times. `m98m-management-overview.html` is the pixel reference for the
Management overview rebuild; `m98m-advertising.html` for Zain's campaign desk + CPQ dashboard.
The core.js demo-fallback pattern is NOT adopted (we have a live backend; demo mode would be
dead code).

## 8. SECURITY — RL-1..10 remain law; RL-11..16 from SPEC-v1 §8 added
Plus: Engine repo is PRIVATE like the source repo; `rl-scan.sh` runs before ANY push of
public/ AND engine deploys (extend it to scan the Worker bundle for tokens/spreadsheet IDs);
eBay tokens live in Worker Secrets, never in D1, never logged; sheets service-account key in
Worker Secrets; backups encrypted at R2; restore drill monthly (calendar task).

## 9. PHASES (each gated by its acceptance tests; a failing test = phase not done)

**A — 48h, no new infra (Apps Script + frontend only):**
notification law rewrite (Signals/Alerts/Messaging builders) · structured lister cards ·
rangepop everywhere · Access-Control desk v1 (modules/tools grants, add/edit/deactivate
users, company-account registry) · OE calculators embedded · req 28/29/34 task flows ·
req 37 keyword-approvals dashboard from Hamza's sheet.
_Accept: zero old-format alerts anywhere; lister card readable in one glance; a module grant
takes effect on the next sign-in without a deploy._

**B — Engine online:**
Node .pkg install (or dashboard-paste) · Worker+D1+KV+R2 · migrations · users/accounts sync ·
listingSync + orderSync · client Engine-first transport · Active Listings dashboard
(live price, OE, sup1/2/3 + links, current supplier; processor edits dual-write the sheet;
role-scoped columns per §6).
_Accept: Engine reads ≤400ms p95; Sir Hasib rows show SHEET chip; pull the Engine's plug →
portal still works via /exec._

**C — the watchers:**
trackingPush with courier auto-select · adsSync diff → human notifications (honesty rule) ·
loss-item 5-min escalation · recheckFeed · dashboards: ads CPQ + weekly/monthly KPIs,
account health (own menu), daily report (own dashboard), Management per-department overview.
_Accept: tracking on eBay ≤60s; a deliberate campaign edit detected ≤5 min with a correct
plain-English message; the 5-min loss ping provably repeats until one of the three options
is chosen; duplicate-ACTIVE caught._

**D — CS mega:**
CS dashboard (open/closed cases 30/90d, INAD/INR, returns with live data, service metrics,
account healths, received buyer messages, queries needing answers) · listing-violations
dashboard + instant alert with eBay's exact text · auto-messages engine (triggers: order
arrived / return opened / neg FB / pos FB / shipped / buyer query; CS agent controls per
account: on/off, template, delay — transactional only, eBay policy-safe).
_Accept: violation alert ≤10 min including the violation text; auto-message respects the CS
agent's per-account settings; nothing sends for an account switched off._

## 10. DATA HASIB PROVIDES (blocking items marked ⛔)
1. ⛔ eBay developer production keyset (App ID / Dev ID / Cert ID) + RuName (SPEC-v1 says
   ZAREEN_LTD exists — confirm it is production, not sandbox).
2. ⛔ One OAuth consent click per API-enabled account (links will be prepared; Hasib clicks
   Allow on each — Sir Hasib's account excluded).
3. ⛔ Cloudflare account (free) — or the explicit decision "use my PC" (accepted as degraded).
4. Couriers actually used per account (Royal Mail / EVRi / Yodel / DPD / other) for the
   auto-select mapping.
5. ⛔ Share "hamza - listing revision required" sheet + confirm the Trackings tab's exact
   column headers (screenshot or share is enough; headers will be read verbatim).
6. CS auto-message templates per account — or approve Claude-drafted defaults before enabling.
7. Today's module→person and tool→person matrix (one message: who gets what).
8. Loss-ping shift hours (suggest 2 PM–11 PM PKT).
9. Permission for a guided Node LTS install on this Mac (checksum-verified .pkg, same as gh).
10. Optional: move AI insights to Engine later (needs the Anthropic key topped up — parked).

## 11. OPEN QUESTIONS (answer in one message, numbers only is fine)
Q1 Which accounts have WORKING eBay API access today — all six except Sir Hasib, or fewer?
Q2 Production keyset in hand, or do we apply for it now?
Q3 Cloudflare (recommended) or your PC as the server?
Q4 Couriers per account?
Q5 Auto-messages ON at launch for which accounts?
Q6 Loss-ping hours 2–11 PM PKT — confirm or change.
Q7 Team Lead for loss-task routing today = Yousaf?
Q8 Exact portal emails for auto-tasks: Hamza = ? · Umar = ? (m98m…@gmail.com — confirm which).
Q9 Confirm: TL may see per-item ads spend (never account totals).
Q10 Anything in the six reference dashboards' demo numbers that is wrong for your business
    (they were invented for design — the build uses real data, but layouts lock now).
