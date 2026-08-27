# Portal audit & plan of action — 27 Aug 2026, evening

Owner's brief: "check every page, validate numbers, make a plan, deploy tonight."
Deployed tonight: backend **v66** + three frontend pushes. Everything below was
verified on screen, not assumed.

## 1. The audit — all 68 pages

Method: every view my Management login can see was rendered in the pane and
snapshotted; anything still loading was re-visited with longer waits.

- **68 / 68 pages functional. Zero errors, zero dead pages.**
- 37 paint within ~5s; the multi-panel desks (Management desk, Staff & accounts,
  Rules, Team performance, Rota) took 15–25s because each panel pays Apps
  Script's ~4s transport toll separately — **their reads joined the server memo
  tonight (v66)**, so repeat visits are now cache-fast.
- Three real bugs the audit caught and FIXED tonight:
  1. dept boards shared one in-flight flag — switching boards mid-fetch left the
     next board stuck on its spinner;
  2. a late answer painted into a DETACHED node (stamp updated, board never did)
     — the "stuck spinner with a fresh timestamp" ghost;
  3. Replacement desk's Refresh passed its click event as a parameter and never
     repainted the form.

## 2. Numbers validation — every figure against eBay's own data (sales_daily)

| Figure | Portal | Ground truth | Verdict |
|---|---|---|---|
| Yesterday sold / profit / ads (home) | £1,871.49 / £567.98 / £427.19 | same | ✅ exact |
| Week sold / profit / ads (overview) | £11,047.59 / £4,046.43 / £2,927.52 | same | ✅ exact |
| 7-day promoted split | £11,047.59 total | same | ✅ exact |
| Yesterday by account (5 rows) | sum £1,871.49 | same | ✅ exact to the penny |
| Ad spend by account (5 rows) | sum £427.19 | same | ✅ exact |
| Task counts (3 screens) | Listing 52 open / 46 overdue | agree across tasksListing = listDesk = deptBoard | ✅ consistent |
| Hunt pipeline | Pending 6 · Approved 59 · Not approved 58 | matches mgmtDesk "6 waiting" | ✅ consistent |
| **Health tiles rev 7d** | **£13,008.28** | £11,047.59 | ❌ +£1,960.69 — rolling-168h window bug; fix written, WAF-queued |
| **Sales analysis month** | **£34,371.16 / 3,311 orders** | £39,854.93 / 3,926 orders | ❌ −£5,483.77 — the account BOOKS lag (Azhar dark since 22 Jul; books ≠ eBay). **Fixed tonight**: the screen now shows eBay's own month figure and names the quiet books (amber banner, verified on screen). |

## 3. Shipped tonight

- **v65** — server memo for hot reads + poll guards (the "everything is stuck"
  stampede fix; server runs 157s → 1.7–4s).
- **v66** — dashboard truth line vs eBay's own money (live, banner verified);
  memo extended to the slow desks' panel reads; **write-bust**: any task/hunt/
  review/rota/replacement write clears the memos it affects, so your own action
  is visible immediately.
- Frontend: dept-board guards ×2, Replacement-desk refresh fix.

## 4. Plan of action — what remains, ranked

1. **Cloudflare Worker deploy (needs you, ~5 min).** dash.cloudflare.com →
   Workers → m98m-engine → paste `portal.m98mltd.co.uk/engine-worker.txt` →
   Deploy; add variable `AUTOMSG_LIVE = true`. Unlocks in one stroke: the
   £1,961 health-tile window fix · buyer "order placed" messages (Sir Hasib +
   ABRT, fires after payment) · the 400-char link truncation repair · the D1
   task mirror (sub-second boards, ends the ~4s floor) · computeHealth batching.
2. **Azhar Bhai (business decision):** dark since 22 Jul — the single biggest
   number distorting every month figure. Restart campaigns or retire the book
   from the fleet totals.
3. **Sir Hasib's report agents** stopped ~23 Jul: his book's cards lag a day+.
   Engine-mode already covers his portal pages; either revive the sheet agents
   or let the truth banner carry it.
4. **Operational, not code:** Listing 46/52 tasks overdue · Advertising 32/32
   overdue (all loss-reviews) · alert feeds drowning (Fasieh 2,774 unread) —
   worth a "mark all read" button next build.
5. Watch v66's memo in tomorrow's peak: if any desk still crawls at 9 pm PKT,
   the next lever is batching each desk's panels into one request.
