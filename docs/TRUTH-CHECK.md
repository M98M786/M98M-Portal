# TRUTH-CHECK.md — how the portal verifies its own numbers

TRUTH UPDATE v2, WO-14. Two independent paths to every number; the page shows Path A, the
verifier recomputes with Path B (separately written code), and `#truthCheck` is where they meet.

## The rule (R3)

No number renders unless the register produced it. A metric that cannot be computed shows `—`
with the reason (source lag, unwritten day tab) — never `0`, never a guess, never `|| 0`.

## Statuses

| Status | Meaning |
|---|---|
| **PASS** | Path A === Path B on the latest run. |
| **FAIL** | The two paths disagree — the delta and both values are on the row. A FAIL is a bug somewhere, always worth reading. |
| **STALE** | The source has not delivered yet (e.g. a day tab the staff have not created). Honest gap. |
| **UNVERIFIED** | Metric registered but no verifier has run yet (only during a rollout). |

## Tiers

- **Tier 1 — every 15 min** (`truthTier1`): dispatch counts (LATE_NOW per account vs an
  independent second classifier over one stamp snapshot; AWAITING = LATE+DUE+AWAITING invariant),
  money yesterday (Σ and per-row `Raw Profit = True Order Earning − VAT to HMRC`, `R = H−I−N`,
  `S = C−G−J−M−Q`), **SPLIT_SUMS_TO_ACTIVE** (the four advertising buckets partition ACTIVE
  exactly, per account), **TASKS_OPEN_BY_DEPT** (JS loop vs SQL GROUP BY, keyword tasks counted
  in both), **CS_NEEDS_REPLY** (regex rule vs SQL classification).
- **Tier 3 — nightly 03:00 PKT** (`truthTier3`): the penny audit — last 7 closed days, every
  account, portal sums vs the workbook's own rows to the penny.

Results land in D1 `validation_runs`; every page tile carries a provenance chip (`mChip`) that
shows the metric's latest verification status and time.

## One definition per number

Each metric has exactly one Path-A function (worker `metric*`), and every consumer — tile, list,
badge, invariant — calls that function. A tile can therefore never disagree with the list it
opens (TILE_EQUALS_LIST is structural, and the 15-min invariants catch regressions).

Key definitions: `liveMembershipRow` (advertising "live"), `dispatchStateV2` +`truthClassifyB`
(order states), `metricMoney*` (day-tab sums), `metricDeptTasks` (departments),
`memberChipStatus` (LIVE / AD PAUSED / CAMPAIGN PAUSED / ARCHIVED / LISTING ENDED).

## When Truth Check shows a FAIL

1. Open the row — it carries shown, recomputed, delta, method, evidence.
2. `docs/SYNC.md` → re-run the feeding job; recheck.
3. If it persists, the bug is in one of the two paths — the delta tells you which direction.
Never "fix" a FAIL by making the page show the recomputed number; find the wrong path.
