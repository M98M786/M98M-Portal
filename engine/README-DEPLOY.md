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
