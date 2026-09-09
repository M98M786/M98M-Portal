# Write-path baseline — KNOWN-GOOD (Phase 0 / WO-1)

Recorded 9 Sept 2026, at hunt-submit parity approval. This is the state to roll back TO if any
write-path conversion goes wrong. Nothing here has a D1-primary write path yet — all writes are the
original direct-to-sheets path.

## Pinned build
- **Git HEAD (KNOWN-GOOD):** `e5330652c35c3b5209191e385a2ef3791d0cfce0` (`e533065`)
- **Git tag:** `known-good-writepath-20260909`
- **Pages build stamp:** `20260909-0024` (galaxy default, live)
- **Apps Script deployment:** Version **119** on stable deployment `AKfycbx1_6…` (/exec URL unchanged)
- **Worker:** `m98m-engine` current build (no write-path flags yet)

## Write-path flags (all OFF — old path is primary for everything)
- `WRITE_HUNT_MODE` = (unset → old path) · target first: off → shadow → primary
- `WRITE_TASK_MODE` = (unset) · off
- `WRITE_LISTING_MODE` = (unset) · off

## D1 export / row counts
- D1 is exported nightly to Drive (OPERATIONS.md §6b: `backupDump` → four backup workbooks +
  `nightlyBackup` file copy). That nightly export IS the Phase-0 baseline export.
- Capture per-sheet / per-table row counts on the night Phase 1 begins (HUNTING_DB, hunt_rows,
  TASKS, tasks) so Phase 2 divergence has a starting reference.

## Rollback to KNOWN-GOOD
- Front end / any Pages change: `git checkout known-good-writepath-20260909 -- <files>`, build, push.
- A write flip gone wrong: set its MODE flag back to `shadow` (flag-only, instant) — never a deploy.
- Full worst case: redeploy AS v119 + the pinned worker; the /exec URL is stable so no client change.
