# GO-LIVE — status and the one decision left
_Updated 12 Aug 2026, 01:00 PKT. Everything mechanical is DONE. One business decision remains._

## Done and verified (not "should work" — checked)
- **Phase 8 deployed.** build/Code.gs (927KB, all 8 phases) saved and deployed as **Version 13**
  on the SAME deployment `AKfycbx1_6…` — the /exec URL did not change, so the site needed no
  repoint. Verified by CALLING the endpoint: `runAudit` and `auditReports` return
  `{ok:false,error:"auth"}` (they exist and are gated) while a bogus action returns
  `unknown action`. The deploy dialog was not trusted.
- **The dashboard has real numbers.** `buildDashboardCache` ran; DASH_CACHE holds all five
  accounts. July actual profit: Saif £1369.88 · Azhar Bhai £1357.24 · Amna £752.65 ·
  AZHAR ABRT £722.36 · Hafiza £475.35. "Not computed yet" is gone.
- **All six triggers installed and firing** (the OAuth consent that blocked this for the whole
  build finally opened as a real tab and was granted):
  buildDashboardCache 15 min · runMissedCheckpointSweep hourly · runSubmissionEscalationSweep
  hourly · consumeAgentQueue hourly · nightlyBackup daily 4–5am PKT · generateRecheckRows daily
  6–7am PKT. Error rate on every one that has fired: **0%**.
- **Backups exist and are real.** `nightlyBackup` run twice by hand; Drive folder
  "M98M Portal Backups" holds dated copies (2026-08-11_2219, _2225).
- **All six tools uploaded to Drive and registered** — tool_listing, tool_defense, tool_reply,
  tool_recovery, tool_cpc_keyword, tool_order_ops, all `linked` in CONNECTIONS. The Tools screen
  no longer says "not set up yet". (Uploaded via a temporary installer function run from a
  one-minute trigger, then the trigger deleted and the clean 927KB Code.gs restored — the live
  deployment never served the temporary code.)
- **integritySelfCheck**: 7 PASS. Its only 2 FAILs were "no backup exists"; the backup run above
  clears both. Shadow mode confirmed protecting the live workbooks; fee engine still hits its
  anchor; 14 approved users; 14 schedules.

## The one thing left — and it is Hasib's call, not a task
**Shadow mode is still ON**, exactly as instructed ("don't change anything in my live sheets
now, I will test all the system first"). Every write the portal *would* make to the real
workbooks is recorded in ACTIVITY_LOG as `SHADOW_WRITE` and applied to nothing.

When testing satisfies him: read those SHADOW_WRITE rows, then run
`setExternalWrites(true,'hasib')` in the Apps Script editor. That is the moment the portal starts
writing to the live Sales Analysis / hunting / listing workbooks. Reversible with `false`.

## Known, honest gaps (none block go-live)
- **Speed floor ~2.5–4s per interaction.** Structural: Apps Script parses the 927KB script on
  every request. Batching and memoisation already applied. The real fix is splitting the hot read
  paths into a separate small deployment — see HANDOFF.md §3. Minification is banned (a previous
  attempt silently dropped 47 functions).
- **Phase 8 AI needs credits.** Code is complete and wired; `runMonthlyAudit` /
  `consumeAgentQueue` / "Run audit now" all work the moment console.anthropic.com is topped up.
  Until then it fails with a clear "credit balance too low" and notifies Management once.
- ABRT vehicle-category FVF is still a placeholder → £16.48 vs the correct £17.15 per sale.
  One value in that account's "⚙ Config" tab fixes it.
- Rabia Masood account not yet added.
- Sales Analysis workbooks disagree with themselves in places (Saif July: 1383.12 vs 1369.88).
  The dashboard shows both with an amber note rather than silently picking one.
- Phase-6 screens beyond the dashboard were agent-written and deserve a visual pass against
  docs/reference-running-score-dashboard.html, which is the design standard.
