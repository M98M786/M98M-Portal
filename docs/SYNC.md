# SYNC.md — every job, its cadence, and how to re-run it

TRUTH UPDATE v2, WO-14. The engine is the Cloudflare Worker `m98m-engine`
(`https://m98m-engine.m98m786.workers.dev/`); Apps Script (`/exec`, deployment v88+) is the
sheet-side runner. All jobs are idempotent — re-running catches up, never duplicates.

## Worker cron slots (wrangler `triggers` in worker.js `scheduled`)

| Slot | Jobs |
|---|---|
| every 5 min | orderSync, statusRefresh (rotating), **openSync** (eBay open-order pull, complete-run guarded, stamps `sync_state job='openStamp'`) |
| every 15 min | adsItems (ad memberships + per-ad `adStatus`, 2 campaigns/account/tick, +ENDING_SOON), autoMsgSend, adsReportPoll, statusRefresh, markEndedListings, violationsSync, sleepWatch, trackingBackfill, **truthTier1** (Path A vs Path B on every registered metric), **signalReeval** (WO-13 auto-resolve) |
| hourly | listingSync, adsSync, csSync, standardsSync, financeSync, trafficSync, feedbackSync, marketingSync, stockWatch, lateDeliveryWatch, **truthTier3Gate** (fires the nightly penny audit at 22:00 UTC ≈ 03:00 PKT) |
| nightly | rollups, backup, zeroSaleScan, nightlyCatchup, itemStats … |

## Re-run anything by hand

Portal (Management): Truth Check → **Recheck now** runs truthTier1.
Terminal (sync key at `~/.m98m/sync-key`):

```
curl -s https://m98m-engine.m98m786.workers.dev/ -X POST -H 'content-type: application/json' \
  -d '{"action":"runJobKey","key":"<KEY>","payload":{"job":"openSync"}}'
```

Jobs the key can run: every cron job above plus `truthTier1`, `truthTier3`, `openSync`,
`signalReeval`. Apps Script jobs run through the relay:
`{"action":"asRunJob","key":"<KEY>","payload":{"job":"pushSheetRowsCold","args":{...}}}` —
whitelist in `apps-script/Engine.gs` `ENGINE_RUNNABLE` (includes `inboxDump`, `huntAliStats`,
`phase0Dump`, `pushSheetRowsHot/Cold`, and the retired-but-callable `bookFix`, `truthCheck`,
`sirHasibMonthlyFill`).

## Sheet mirror (money truth, R8 — pages never read Google live)

- **Hot**: Apps Script trigger `pushSheetRowsHot` every 15 min mirrors today + yesterday's day
  tabs of all six sales-analysis books into D1 `sheet_rows`/`sheet_tabs`.
- **Cold**: `pushSheetRowsCold` walks a 62-day cursor (~150 s per round, nightly + on demand).
  A missing tab = the staff have not created that day yet — an honest gap, never a zero.

## Inbox (WO-12)

DMs live in D1 (`inbox_messages`/`inbox_threads`) — actions `inboxThreads/Thread/Send/Poll`.
The old sheet MESSAGES tab is a frozen archive; `inboxDump` (relay) re-mirrors it any time.

## The one write to eBay

`adsPauseListing` (CPC ad pause) — user-click only, never called by any cron (R10). Everything
else the portal does to eBay is read-only. No sync job calls a write endpoint.
