# GO-LIVE RUNBOOK — everything between here and a working company portal
_All 8 phases are now written (31 backend modules, 21 screens, 33 views). What remains is
deployment + the clicks only the owner's own Chrome can make. In order:_

## A. Deploy the Phase-8 build (next Claude session, ~10 min)
1. Inject `build/Code.gs` into the Apps Script editor (localhost CORS server → monaco setValue —
   pattern in HANDOFF.md), save via the toolbar disk icon.
2. **New deployment** (NOT "manage/edit" — the old deployment refuses new versions). Web app ·
   Execute as me · Anyone.
3. Update the /exec URL in `index.html` + `config/exec-url.txt`, rebuild, rl-scan, push public/.
4. VERIFY by POSTing `{"action":"runAudit"}` → must say `auth`, not `unknown action`.

## B. Hasib's clicks (his Chrome, ~10 min, one time)
1. **Triggers screen → Add Trigger**, six total:
   `buildDashboardCache` (15 min) · `runMissedCheckpointSweep` (hourly) ·
   `runSubmissionEscalationSweep` (hourly) · `generateRecheckRows` (daily, early shift) ·
   `nightlyBackup` (daily, 4–5 AM) · `consumeAgentQueue` (hourly — Phase 8 queue).
2. Run `buildDashboardCache` once by hand → dashboard shows real numbers immediately.
3. Drag `~/Desktop/M98M Portal Tools/` (6 files) into Drive **unconverted** → run
   `bootstrapRegisterTools()` → all six tools open in the portal.
4. Run `integritySelfCheck` → expect PASS lines; run `nightlyBackup` once, then
   `verifyLatestBackup` → COMPLETE.

## C. The live-writing decision (owner only — he said test first)
Shadow mode is ON. Every intended business-sheet write is in ACTIVITY_LOG as SHADOW_WRITE.
When testing satisfies him: read those rows, then run `setExternalWrites(true,'hasib')`.
That is the moment the portal starts writing to the real workbooks. Reversible with `false`.

## D. Phase 8 activation (blocked only on money)
Code is complete: `runMonthlyAudit` / `consumeAgentQueue` / `actionRunAudit_` — deterministic
data pack (P&L sums from the Monthly Sheet, Brain v17 anchor, ops counters), model writes the
prose, report lands in Drive `M98M Audits/<YYYY-MM>/` as a DRAFT (RL-7). It fails loudly with
"credit balance too low" until console.anthropic.com is topped up, then works with no code change.
Still to build later (§22.0 ②–⑤): CS reply drafting, title suggestions, daily insight, weekly CPC
sheet — the queue kinds exist; each needs its own consumer.

## Known gaps that are NOT go-live blockers
- Speed floor ~2.5–4s/request (see HANDOFF.md §3 for the three fixes; the 927KB script is the cause).
- Rabia Masood account: add via Staff & approvals → Accounts admin when it opens ([OPEN-1]).
- Sales Analysis self-inconsistencies surface as amber notes — his automation's issue, not ours.
- Phase-6 screens beyond the dashboard were agent-written and deserve a visual pass.
