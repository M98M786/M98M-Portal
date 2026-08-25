# 40-hour backlog — Hasib, 26 Aug 2026

Working file. Every item carries its own definition of done and a verification line,
because "it is deployed" and "it works when a human clicks it" are different claims and
only the second one counts here.

**Standing rules for this run**
- Every change: build → commit → deploy → **open the page as a human and look**, then say
  plainly whether it works. If it does not, do it again.
- Never report an item done on the strength of an API call alone. The dashboard poison
  survived exactly that mistake twice.
- The Engine (Cloudflare Worker) is WAF-blocked. Apps Script + frontend deploy normally.
  Anything needing the Worker is marked ENGINE and queues.

---

## Status key
`TODO` · `WIP` · `DONE (verified on screen)` · `BLOCKED`

---

## 1. Tasks & departments

- [x] **DONE (verified)** — `loss_review` was not in the department map, so 32 real
  Advertising tasks sat in an invisible "General" bucket and the Advertising board read
  empty. Map completed + `r8UnmappedTypes_` now reports anything unplaced.
  *Verified:* Listing 48 · Advertising 32 · General 5 · CS 0, `unmapped_types: []`.
- [x] **DONE** — department boards refresh every **20s** (was 45s).
- [x] **DONE** — all-departments overview restricted to Management/Ops Head/Team Lead;
  Orders board no longer shown to CS. Department members get their own board only.
- [ ] **TODO** — remove the 2 `SELFTEST` rows polluting the Listing count.
- [ ] **TODO** — every other desk that "is not updating": Go-live desk, and each remaining
  desk. Audit one by one, same 20s contract.
- [ ] **TODO** — 32/32 Advertising and 39/48 Listing tasks are **overdue**. That is a real
  operational finding for Hasib, not a bug to fix in code.

## 2. Orders

- [ ] **TODO** — proper links throughout orders.
- [ ] **TODO** — today's orders: show how many are **awaiting tracking**.
- [ ] **TODO** — make that count a **live button**: click → the exact orders behind it.
- [ ] **TODO** — generalise: **every number on an orders page drills through** to the rows
  behind it. No dead-end figures.
- [ ] **TODO** — orders tab shows that specific day.

## 3. Replacement orders  (new feature)

- [ ] **TODO** — a replacement-order desk. CS, Team Lead, Management and Order Processor
  can raise one.
- [ ] **TODO** — reason picker: preset reasons **plus** a custom option that *requires* an
  explanation.
- [ ] **TODO** — "Create a replacement for this order" button on today's order rows.
- [ ] **TODO** — the replacement is written into **that day's order sheet**, clearly headed
  as a Replacement Order.

## 4. Listing / hunting

- [ ] **TODO** — product listers still have **no reject option**. Add it.
- [ ] **TODO** — proper Hunt approvals page.
- [ ] **TODO** — hunting gets three pages: **Approved · Not approved · Pending approval**,
  each with archive access.
- [ ] **TODO** — **AliExpress title database**. Hunters must record the AliExpress title.
  On entry, check it against every previous record *including rejected ones* and tell the
  hunter what happened last time. Stop duplicate hunting.

## 5. Product revision

- [ ] **TODO** — rebuild the revision tab: full archive, the concerned items, and the
  item-level data that makes it usable.
- [ ] **TODO** — Advertising, Management, CS and Order Processor can each raise a new
  product listing revision, with an explanation.

## 6. CPC

- [ ] **TODO** — separate **CPC items**, **General items**, and **CPC pending items**.
  None of these exist yet.

## 7. Signals & notifications

- [ ] **TODO** — price-related and negative sales-analysis signals also go to the
  **Advertising Manager**.
- [ ] **TODO** — staff matters notify **management and the staff member**.
- [ ] **TODO** — detect and route to **CS + Management**: transaction defect, new late
  shipment case, any service-metric movement, positive-feedback rating change.

## 8. Account report

- [ ] **TODO** — page is not working. Fix it and give the stats a proper HTML presentation.
  *Known:* Sir Hasib returns 0 rows — he has no `account_report` book (it does not exist).
  Every other account's daily tabs stop at **23–25 July**: the report agents have not run
  in a month. That part is Hasib-side, outside the portal.

## 9. Naming

- [x] **DONE** — "CS live desk" → "Customer service desk".

## 10. Validation (continuous)

- [ ] **TODO** — re-check every sales figure repeatedly, not once.
- [ ] **TODO** — walk real scenarios end to end as a human would, per role.
- [ ] **TODO** — screenshots as evidence.

---

## Carried-over blockers

- **ENGINE / Cloudflare WAF** — 8 changes queued behind a 403 on every POST from this
  machine's dash session: the task mirror (Phase 2), `computeHealth` 28→4 queries, the
  Business-overview week/split reconciliation, `darkAccountWatch`, the per-account 7-day
  window, the **400-character link truncation** (damaging 93.6% of stored links), and the
  `syncAliOrders` written-count fix. Unblocks either by the WAF ageing out, or a token at
  `~/.m98m/cf-token` (chmod 600, never pasted into chat).

## Decisions waiting on Hasib

- **Azhar Bhai**: all 8 campaigns paused since ~22 July. Confirmed twice over — impressions
  22,657 vs 316k–440k, `sold_30d` 0 across 186 listings, and his own order book has **no
  August tabs at all**. Biggest lifetime seller in the fleet. Restarting ads spends real
  money, so it is his call.
- **Sir Hasib sales_analysis**: book exists but is stale since 8 Aug and uses a different
  tab convention. Not linked on purpose.
- **Sir Hasib account_report**: the book does not exist and needs creating.
- **1,381 historical orders** (Jul–18 Aug) have supplier links in the sheet but no order row
  in D1, because they predate his API. Backfilling means inserting sheet-derived rows into
  an eBay-sourced table, which could skew revenue. His call.

## 11. Sales Operations department + staff oversight  (NEW — DONE, verified on screen)

- [x] **DONE (verified)** — 'Sales Operations' role added to ROLES; Ubaid (m98mthree) moved
  Pricing → Sales Operations via a key-gated one-shot. Verified: role appears in the config
  list; the one-shot returned "set m98mthree@gmail.com: Pricing -> Sales Operations".
- [x] **DONE (verified)** — oversight wiring: Sales Operations added to the department overview,
  staff reviews, performance, alerts centre and all 5 department task boards.
- [x] **DONE (verified on screen)** — new `Staff oversight` page + `staffDossier` action. Pick a
  person → their open workflow (with overdue flags), done-in-7-days, avg turnaround, every alert
  that reached them, and their behaviour/working review history. Rendered live for Zain: 8 open /
  8 overdue, 1833 alerts, review ★★★★/★★★★. All four sections paint. Read-only, oversight tier only.

### Operational findings this surfaced (for Hasib, not code bugs)
- **Alert feeds are drowning**: Fasieh 2,774 unread, Zain 1,833 unread. The notification system
  has no read/clear-down, so letters pile up unboundedly. Worth a "mark all read" and/or an
  auto-expiry of old letters.
- **Zain: 8 open, all 8 overdue, 0 done in 7 days** — every one a loss-review task. Advertising's
  loss queue is not being worked.
