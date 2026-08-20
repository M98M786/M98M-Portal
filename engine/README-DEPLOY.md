# Engine deploy & operations
_Live at **https://m98m-engine.m98m786.workers.dev/** (CF account 22159c26d5386e3ac543be2bbed95e6d,
free plan). D1 `m98m-engine` = 83a5bb0f-d2d8-4c25-93fe-477d6e6ae452 · KV `m98m-hot` =
86ae131b71684136b8860fd7bf86995d. This file is the runbook — history lives in git._

## Deploying a change (the loop that always works)
1. Edit `engine/worker.js`. Syntax-check without node (node is broken on this Mac):
   strip `export default` → `new Function(src)` via `osascript -l JavaScript` (JXA).
2. Run `scripts/rl-scan.sh engine` — must be CLEAN.
3. One-command upload (CF token file in the session scratchpad, chmod 600 — regenerate at
   dash.cloudflare.com → My Profile → API Tokens if lost):
```
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/22159c26d5386e3ac543be2bbed95e6d/workers/scripts/m98m-engine" \
  -H "Authorization: Bearer $(cat <scratchpad>/cf_token.txt)" \
  -F "metadata=@<scratchpad>/metadata.json;type=application/json" \
  -F "worker.js=@engine/worker.js;type=application/javascript+module"
```
4. **The upload WIPES the secrets** — re-PUT all five via the `/secrets` endpoint every time:
   `SYNC_KEY`, `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_DEV_ID`, `EBAY_RU_NAME`.
5. Wait 30–60 s for isolate propagation before trusting a test (a stale isolate answers
   `unknown action` for new routes). Test from curl; note that Apps Script /exec URLs
   bot-block curl — test those from a browser-origin fetch instead.

`metadata.json` carries the bindings (D1 `DB`, KV `HOT`) + plain vars `ALLOWED_ORIGIN`,
`AS_URL`. Keep it in sync if bindings change.

## The cron slots (subrequest budget ≈50 fetches per invocation — respect it)
| Cron | Jobs |
|---|---|
| `*/5` | orderSync · adsSync (campaign diff) · violationsSync |
| `*/15` | listingSync · adsItems (membership + duplicate-ACTIVE) · autoMsgSend · adsReportPoll |
| hourly | financeSync · csSync (cases/returns/INR/messages) · autoMsgScan |
| 02:00 | rollups · backup · adsReportKick · standardsSync |

Every job: `runJob()` lease (`sync_state` row `account='@lock'`, 4-min self-expiry) then
`flushNotifyQueue` (≤8 deliveries per invocation, delete-on-confirmed-ok only).
Force any job: `POST {action:'runJobNow', key:SYNC_KEY, payload:{job:'<name>'}}`.

## The go-live switches (plain vars; unset = SHADOW, nothing external happens)
| Var | Arms |
|---|---|
| `TRACKING_LIVE` | tracking push to eBay on dispatch (`ebayPushTracking`) |
| `ADS_WRITE_LIVE` | Campaign-watch ✕ buttons (remove item from campaign) |
| `AUTOMSG_LIVE` | the auto-message sender (per-account triggers still gate each send) |
| `CS_WRITE_LIVE` | CS desk Reply + Refund buttons |

Set to the string `true` in Settings → Variables. Each is independent. Everything records its
shadow would-do first — watch a feature's screen for a day before arming it.

## Re-consent (self-service — Account health → "eBay connections")
Links use the global ZAREENLT app with the extended scopes (marketing, analytics, finances).
Submitting a code stores the new refresh token and clears that account's per-app keyset **in
D1 only** — the sheet automations keep their own apps and tokens untouched, always.

## Hard-won platform facts (do not relearn these)
- **D1 write budget (~100k rows/day)**: never upsert unchanged rows — prefetch current state
  and skip. **KV write budget (1k/day)**: never per-item KV markers; dedupe state lives in D1.
- Block comments must never contain `*/5`-style cron strings (`*/` ends the comment).
- eBay money prints as `"GBP 3.27"` — strip non-numerics. Report `report_id ≠ task_id`
  (follow `reportHref`). LISTING_PERFORMANCE_REPORT needs BOTH listing_id and campaign_id.
- Post-Order auth is `IAF <token>`; totals field differs per feed (`total`,
  `totalNumberOfCases`, `totalNumberOfInquiries`). Compliance answers **404** when a seller
  has no violations (not the documented 204).
- ISO timestamps (`...T...Z`) do NOT string-compare against SQLite `datetime('now')`
  (`T` vs space) — compare `substr(x,1,10)` against `date('now')`.
- Smart-targeting CPC campaigns have no ad groups (error 35129); DELETE-by-adId works.
- `esc()` does not escape quotes — attribute contexts need their own escaper.
- Business dates are UK (`ukDate()`); staff-facing display is PKT (T-1 law).


## 19 Aug additions — the day the numbers became real

**Deploying needs NO Cloudflare API token.** From any `dash.cloudflare.com` page (signed-in pane),
`fetch('/api/v4/...', {credentials:'include'})` has full account rights. Deploy = PUT
`/accounts/22159c26d5386e3ac543be2bbed95e6d/workers/scripts/m98m-engine` with FormData
(`metadata` JSON blob + `worker.js` blob). Put `"keep_bindings":["secret_text"]` in the metadata
and all secrets survive — the re-PUT-five-secrets ritual is dead. Ship the source to the page via
`public/engine-worker.txt` on Pages (open CORS); ALWAYS assert a new symbol exists in the fetched
text before deploying, or you redeploy the old build. Pages publishes in 1–3 min; the Worker
propagates in ~30–60s (a new action answers "unknown action" until it lands).

**Apps Script**: project id `1M-P4Bpfrd2Z-c5NgeiOER0KgJM7D09bAmlEPPg2eakqY1gAeceZGGr8v` (older
notes carry a truncated id that 400s). Splices = find/replace pairs from `git diff` served as
JSON on Pages, applied to `monaco.editor.getModels()[0]`, each `find` verified to occur EXACTLY
once. Triggers run HEAD; `/exec` runs the deployed version — a saved fix is live for cron jobs
before any deploy. `engineRunJob` (key-gated, /exec) runs
pushEngineSync/pushEngineCosts/buildDashboardCache/alertsRefresh/dispatchOverdueSweep/
runZeroSalesSweep on demand. The Deploy menu toggles shut on a second synthetic click — open it
with a JS `.click()`, then MOUSE-click the item from a fresh screenshot; if the dialog will not
open, reload the editor first.

**eBay facts that cost a day each:**
- **Finances needs Digital Signatures** (error 215001): RFC-9421 message signature, ED25519 key
  minted from the Key Management API. The Engine mints and keeps its own key in D1
  `engine_config` k='ebay_sign_key' (`ebaySigningKey`/`ebaySignedFetch`); corrupt row → re-mint.
- **Fee sign**: `bookingEntry` describes the ORDER money, not the fee. Sign by transactionType —
  SALE +, REFUND −, others carry no order fee. (bookingEntry-keyed signs wrote 618 negative fees.)
- **Ads reports**: Standard and CPC metrics cannot share one report (35122) — one task per
  funding family per day, each declaring `fundingModels`; CPC needs dims
  listing_id+ad_group_id+campaign_id (35119); the CPC spend key is
  `cpc_ad_fees_listingsite_currency`; payout-currency twins are the same money — never sum both.
  Reports older than ~2 days return nothing — a permanent gap, not a bug.
- **Day tabs carry TWO order-number columns** differing only in case: 'Order number' (col B,
  eBay) vs 'Order Number' (col M, AliExpress). Resolve by POSITION (`ordersResolveFields_`).
- **Every workbook spells its headers its own way** ('Suuplier 2', trailing spaces): resolve
  through `bridgeNormalizeHeader_` with per-field alias lists, and log what a sheet lacks.
- **Standards metrics** ship value objects two ways: RATE {numerator,denominator} = percent,
  AMOUNT {currencyCodeEnum} = money. Thresholds can be {value} objects.
- The sheet bridge keys duplicate/blank headers as `col:<letter>` — consumers reading records by
  raw header must mirror that rule.

**Repair tools**: `rollupsWide` re-rolls the 45-day window after any history repair (the nightly
covers 8 days with the edge-day skipped — its brief absence shrank 15 Aug to a third). The ads
kick self-heals a 7-day window of missed family-days.

## 20 Aug additions — the overnight hardening (sessions, validation, departments)

**Portal sessions** (the reload/new-tab logout fix): `sessions` D1 table; the Engine mints a
64-hex 7-day token at sign-in (`sessionMint`), the client keeps it in localStorage
(`m98m:psess` + cached identity `m98m:pident`) and boots straight into the app; `sessionHello`
re-verifies in the background; `sessionEnd` on sign-out. Apps Script accepts the same token:
`authorizeFor_(level, idToken, session)` → `sessionIdent_` asks the Engine (`sessionCheck`,
sync-key gated, CacheService 5 min) and falls back to the Google pass. Roles are STILL read
from the users table on every call, both servers — a session answers who, never may.

**The validation battery**: `selfTestRun` (11 checks — fee band 10-25%, no negative fees, no
duplicate orders, books-vs-orders to ±2% for the last two full UK days, independent P&L
recompute, ad-book continuity, intraday rollover purity, zero-priced listings, future-dated
rows). `selfTest` action (mgmt) behind the Run-validation button on Account health;
`selfTestJob` nightly at 02:00 files a letter per failure. First live run: 11/11 after fixing
its own check 9 — **never TEXT-compare ISO 'T'-form stamps against SQL's space-form
datetime('now'); bind a real ISO instant.**

**Deploying /exec from the pane — the ONLY reliable dialog recipe**: coordinate clicks from
scaled screenshots silently mis-select (three deploys re-pinned the old version while showing a
success banner). Drive it by DOM events: find the `[role=option]` LI whose textContent is
'New version', dispatch pointerdown/mousedown/pointerup/mouseup/click with clientX/Y, same for
the Deploy button, then read `document.body.innerText` and REQUIRE the banner to name a NEW
version number.

**Reading/writing Google Sheets from the pane** (no API, session cookies only): read any tab via
`/htmlview/sheet?headers=true&gid=<gid>` + regex (gviz needs OAuth, export?format=csv dies on
redirect CORS, DOMParser is blocked by TrustedHTML); find a gid by clicking the tab name in
/htmlview and reading location.hash; write a cell in the editor via #t-name-box (set value +
synthetic Enter) then a synthetic ClipboardEvent('paste') on .docs-texteventtarget-iframe's
activeElement — computer-typing never reaches the grid.
