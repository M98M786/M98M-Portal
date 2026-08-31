# DECISIONS NEEDED — Truth Update v2

One line each. Defaults are applied and marked ASSUMED until you answer (R11).

| # | Question | Recommended default | Status |
|---|---|---|---|
| 1 | Money workbook per account | **RESOLVED by Phase 0**: sales-analysis workbook day tabs — the only place the R/S/T headers exist; identical layout in all six books | RESOLVED |
| 2 | Missing OAuth scopes | **None found** — all six accounts pass every sync (fulfillment, finances incl signatures, marketing, analytics, listings). No consent flow needed; Hamza needs no notification yet | RESOLVED |
| 3 | R2 for inbox attachments | Use R2 (`portal-attachments`, private). If R2 is not enabled on the Cloudflare account when WO-12 starts, fall back to Drive via the service account | ASSUMED |
| 4 | CPC_LIVE_EVENT dedupe window | 30 days | ASSUMED |
| 5 | 'Projected profit' for unwritten days | No — show ROWS_COVERAGE only | ASSUMED |
| 6 | Zain's user id | `m98mfour@gmail.com` (Advertising Manager; the existing keyword/campaign assignee) — single match, no ambiguity found | ASSUMED |
| 7 | Fold Account health into Business overview | Keep both, same RATING metric | ASSUMED |
| 8 | WO-09 timing | Task opens at live+72h, due at live+96h (invisible to Zain until it opens; Management sees Scheduled) | ASSUMED |
| 9 | **NEW** — money rows have no order-id column | Per-day joins only (counts + sums); penny audit is per-row arithmetic + day totals. If you want per-order joins ever, an Order No column must be added to the day tabs by the team — the portal will not write it | ASSUMED |
| 10 | **NEW** — Azhar Bhai has no order_processing workbook connected and his newest sales day tab is 22nd July | Treat as dark account: metrics render `—` with 'no rows since 22 Jul'; no backfill invented | ASSUMED |
| 11 | **NEW** — legacy 30-Aug jobs (bookFix, truthCheck letters, sirHasibMonthlyFill, PORTAL STATS tabs) | Keep running until the `money` module flips, then retire (the v2 Truth Check + ROWS_COVERAGE replace them). They never touch R/S/T | ASSUMED |
| 12 | **NEW** — existing Cloudflare skeleton is one worker.js + Apps Script, not the src/ TS layout the spec sketches | Build the v2 layers INSIDE the existing worker repo (new modules/files, same deploy pipeline), matching the spec's structure logically (metrics/, truth/, registry) rather than porting to a new project mid-flight | ASSUMED |
