# Engine deploy
_Everything here happens in the Cloudflare dashboard (free plan is enough). ~20 minutes once._

## A. One-time setup (Hasib signs in; Claude drives the pane after that)
1. **Cloudflare account** — dash.cloudflare.com, sign up/log in with m98m786@gmail.com.
2. **Workers & Pages → Create → Worker**, name `m98m-engine`, deploy the hello-world, then
   *Edit code* and PASTE `engine/worker.js` over it → Deploy. The URL is
   `https://m98m-engine.<subdomain>.workers.dev`.
3. **D1**: Storage & Databases → D1 → Create → `m98m-engine`. Open its Console and paste
   `engine/migrations/001_init.sql` (whole file) → Run.
4. **KV**: Create namespace `m98m-hot`. **R2** (optional until Phase D): bucket `m98m-backups`.
5. Worker → **Settings → Bindings**: D1 binding `DB` → m98m-engine · KV binding `HOT` →
   m98m-hot · R2 binding `BACKUPS` → m98m-backups.
6. Worker → **Settings → Variables**: plain var `ALLOWED_ORIGIN` = `https://m98m786.github.io`;
   **secrets**: `SYNC_KEY` (long random string — same value goes into Apps Script Script
   Properties as `ENGINE_SYNC_KEY`), and when the keyset arrives: `EBAY_APP_ID`,
   `EBAY_CERT_ID`, `EBAY_RU_NAME`.
7. Worker → **Triggers → Cron**: `*/5 * * * *`, `*/15 * * * *`, `0 * * * *`, `0 2 * * *`.

## B. Wire the portal to it
1. Apps Script Script Properties: add `ENGINE_SYNC_KEY` = the same SYNC_KEY value.
2. Portal DB CONFIG tab: `engine_url` = the workers.dev /  custom URL. (The frontend learns it
   from getPublicConfig; only whitelisted actions use it, everything else stays on /exec.)
3. Run `pushEngineSync` once in the Apps Script editor (temp-trigger trick if the picker
   reverts) — Engine now has users + accounts. Add it as an hourly trigger.
4. Verify: POST `{"action":"enginePing"}` to the worker URL → `{"ok":true,...}`;
   `engineHealth` from a Management portal session shows table counts and sync_state.

## C. eBay consent (Phase B2 — needs the production keyset first)
1. Set the three EBAY_* secrets (step A6).
2. In the portal (Management): the consent links come from `ebayConsentLinks`; open each,
   sign in to THAT eBay account, click Allow, copy the `code` from the landing URL, submit via
   `ebaySubmitConsent {account, code}`. One per API account; Sir Hasib is never in the list.

## Acceptance (contract §9 Phase B)
- Engine `activeListings` p95 ≤ 400ms from the portal.
- Sir Hasib rows carry the SHEET chip (items_facts.source).
- Kill test: set CONFIG engine_url to a garbage URL → every screen still works via /exec
  (the client falls back on any network failure; an `auth` verdict never falls back).

## DEPLOYED 13 Aug 2026 — and the paste method is now obsolete
Live at **https://m98m-engine.m98m786.workers.dev/** (account 22159c26d5386e3ac543be2bbed95e6d).
D1 `m98m-engine` = 83a5bb0f-d2d8-4c25-93fe-477d6e6ae452 (16 tables) · KV `m98m-hot` =
86ae131b71684136b8860fd7bf86995d · bindings DB/HOT + ALLOWED_ORIGIN · SYNC_KEY secret set ·
cron */5, */15, hourly, 02:00. Verified: enginePing 320ms; wrong sync key → auth; right key →
syncUsers writes D1.

**Future deploys are ONE command** (token file lives in the session scratchpad, chmod 600 —
regenerate at dash.cloudflare.com → My Profile → API Tokens if lost):
```
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/22159c26d5386e3ac543be2bbed95e6d/workers/scripts/m98m-engine" \
  -H "Authorization: Bearer $(cat <scratchpad>/cf_token.txt)" \
  -F "metadata=@<scratchpad>/metadata.json;type=application/json" \
  -F "worker.js=@engine/worker.js;type=application/javascript+module"
```
(metadata.json carries the bindings above; keep it in sync if bindings change. Secrets are
re-applied via the /secrets endpoint after upload if ever wiped.)
