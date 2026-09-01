# TRUTH UPDATE v2 — PROGRESS

Nothing is done until ticked here with evidence (R13).

## Phase 0 — Discovery ✅ COMPLETE 1 Sept 2026, 05:0x PKT
- [x] Page/number inventory with today_source → docs/NUMBER_REGISTER.md §A (55 view files)
- [x] Money workbook identified + R/S/T formulas ported → NUMBER_REGISTER §B (phase0Dump evidence; identical `R=H−I−N`, `S=C−G−J−M−Q`, `T=R−S` in all six books)
- [x] Account registry captured (CONNECTIONS 39 rows → scratchpad/phase0-dump.json); D1 gaps listed → NUMBER_REGISTER §F
- [x] Token/scope inventory: all required scopes working on all six accounts (sync_state clean) → NUMBER_REGISTER §E
- [x] Fake-number inventory → NUMBER_REGISTER §C
- [x] Workbook write-path baseline → NUMBER_REGISTER §D (R/S/T untouched by any writer)
- [x] docs/DECISIONS-NEEDED.md seeded (8 spec items + 4 new; #1 and #2 resolved by discovery)
- [ ] **GATE: owner reads docs/PHASE0-REPORT.md and accepts the defaults**

## Phase 1 — Truth layer + safe removals ✅ COMPLETE 1 Sept 2026, 05:3x PKT (gate passed by owner: "defaults fine, go", soak compressed on owner's order to run phases consecutively)
- [x] D1 additive migrations live: orders +payment_status/cancel_state/fh_count/open_seen_at; sheet_rows/sheet_tabs/metric_snapshots/validation_runs (worker self-heal)
- [x] Sync jobs: openSync (eBay open set, complete-run guarded, D1-stamped — KV null-cache burned us once), orderSync captures truth fields, orderBackfill upserts them onto history (3,443 orders), orderTruthSweep fixed the 5 ghosts per-order, sheet mirror hot (15-min AS trigger) + cold (62-day cursor walk)
- [x] Metric engine (Path A): dispatch family from the stamped open set, money family from sheet_rows R/S/T, tasks family from the D1 mirror; pageMetrics page API with provenance
- [x] Truth Check (Path B): second classifier, per-row T=R−S + ported formula checks, independent SQL recomputes; tier 1 every 15 min, tier 3 nightly penny audit; validation_runs + #truthCheck page
- [x] Safe removals: Home signal pins + health cards, Sales-analysis reconciliation banners, sidebar regroup (Library, Returns→Customer Service, Truth Check→Management)
- **GATE EVIDENCE: Truth Check 15 PASS · 0 FAIL · 0 UNVERIFIED (12 STALE = unwritten day tabs, honest); dispatch truth from eBay's own open pull: LATE 0 · DUE 1 · AWAITING 585 · OPEN 586 (the old page said LATE 5 including 93-day-old closed orders — those five are not open on eBay at all); one mid-run stamp race found by the verifier itself and fixed (snapshot per run). Screenshot: Truth Check page green.**
## Phase 2 — Money — IN PROGRESS (started 1 Sept 05:3x)
## Phase 3 — Orders — NOT STARTED
## Phase 4 — Advertising — NOT STARTED
## Phase 5 — Workflow & structure — NOT STARTED
## Phase 6 — Cleanup — NOT STARTED
