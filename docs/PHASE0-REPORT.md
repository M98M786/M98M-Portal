# PHASE 0 REPORT — Truth Update v2 discovery

**1 September 2026 · read this, answer or accept the defaults in docs/DECISIONS-NEEDED.md, and Phase 1 starts.**

## What Phase 0 found, in five sentences

1. **Your money truth is one clean system already**: every account's sales-analysis workbook carries identical 22-column day tabs whose last columns are literally *True Order Earning = H−I−N*, *VAT to HMRC = C−G−J−M−Q*, *Raw Profit = R−S* — one formula set, six books, verified from the live cells. Porting is trivial and done on paper (NUMBER_REGISTER §B).
2. **Every eBay scope the spec needs already works on all six accounts** — fulfillment, finances (with the ED25519 signatures), marketing, analytics, listings — zero standing sync errors today. Nothing to consent, nothing for Hamza yet.
3. **The order table cannot express the truth the spec demands**: it stores no payment_status, no cancel_state, no fulfillment hrefs — which is exactly WHY refunded-never-sent orders show as '93 days late' today. WO-07's columns are the cure, confirmed necessary.
4. **The money rows have no order-id column**, so sheet↔API comparison is per-day (counts and sums), never per-order across sources — the register and penny audit are specified accordingly (DECISIONS #9).
5. The number sprawl is real and mapped: **55 view files, ~90 backend actions, maths living in both the Worker and Apps Script** (NUMBER_REGISTER §A) — plus 448 `|| 0` coercions to hunt down as metrics ship.

## Two decisions resolved by evidence (no need to answer)
- **#1 Money workbook** → the sales-analysis day tabs (only place R/S/T exists; order-book day tabs have none).
- **#2 Scopes** → none missing.

## Four new decisions with defaults (say nothing to accept)
- **#9** No order-id in money rows → per-day joins only.
- **#10** Azhar Bhai: no order book connected, newest sales day tab 22 July → render `—` honestly, never backfill.
- **#11** The 30-Aug-era nightly jobs (book corrector, truth-check letters, Sir Hasib fill) stay until the `money` module flips, then retire.
- **#12** The v2 layers are built inside the existing worker/repo (same deploy pipeline), matching the spec's structure logically — not a new project mid-flight.

## What Phase 1 will build (once you pass this gate)
Additive D1 migrations (§3.2), the sync-job dispatcher (§3.3), `metrics` + register in code, the page API, the Truth Check core with the shadow ledger — plus the four SAFE REMOVALS the spec allows early: Home Signals block + health cards off Home, the Sales-analysis banners deleted, the sidebar regrouped (Library group; Returns & INAD under Customer Service). No number switches; every tile gets its shadow chip. Gate out: 48h green invariants.

## Where the evidence lives
- `docs/NUMBER_REGISTER.md` (v0) — inventory, money source, formulas, fake-number list, write paths, scopes.
- `docs/DECISIONS-NEEDED.md` — the twelve lines above.
- `docs/TRUTH-UPDATE-PROGRESS.md` — the tick sheet; Phase 0 ticked with evidence pointers.
- `scratchpad/phase0-dump.json` — raw CONNECTIONS registry + formula pass output.
