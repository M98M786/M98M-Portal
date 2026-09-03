# Night plan — 3 Sept 2026 (research complete, build together tonight)

## A. The wrong collective number — ROOT CAUSE FOUND (proven)

The portal has **two different definitions of "a day"** and they disagree:

- **UK / eBay day** — what `mgmtOverview` uses (`ukDate(created_at)`, Europe/London). This
  drives the tiles the owner trusts: **ORDERS TODAY 118 · £1,131.58**, and the per-account
  "Today's sales" bars (Amna £279, Saif £258, Sir Hasib £247, Hafiza £182, Azhar £165 = £1,131.58).
  It is also what the **sales-analysis day tabs contain** — a tab named "3rd September" holds
  eBay's *UK-3-September* sales, because eBay dates orders in the account's own (UK) timezone.

- **PKT day** — what my 2-Sept blend uses (`substr(datetime(created_at,'+5 hours'),1,10)`) and
  what `sheet_rows.day_pk` is *labelled* with. PKT-"today" starts **4 hours earlier** than
  UK-"today" (PKT midnight = 19:00 UTC vs UK midnight = 23:00 UTC in BST).

**Result:** the blend's "SOLD — UP TO DATE" sweeps in ~4 extra hours of *UK-yesterday-evening*
orders → **178 orders / £1.7k** instead of the real **118 / £1,131.58**. The sub-line even says
it: "5 unfilled day-books · 178 rows" — 178 over ~5 accounts ≈ 36/account, i.e. more than one
UK day's worth.

### Fix
Unify every money/order count on the **UK/eBay day** (the books' own basis). One shared helper
`bizDay(created_at)` (Europe/London, DST-aware via Intl, identical to the existing `ukDate`),
used in the blend's `apiDay`, the `SOLD_API` sub-line, and swept through `metricMoney` /
`pageMetrics` / `accountDay`. Then assert: blend "today" === mgmtOverview "today" === £1,131.58.
~30 lines + a verification pass. Low risk.

## B. Sales Analysis breakdowns — bring back per-account, per-day, per-product (the sheet's shape)

My 2-Sept blend collapsed the day charts into ONE giant merged (dashed) bar and left the
per-account ledger + item P&L empty on unwritten days. The owner wants the sheet's richness back:

1. **Charts must be account-to-account.** Single-day range → bars **per account** (sold + actual
   profit), not one merged bar. Multi-day range (7/30/60/90) → keep the day-by-day bars but stack
   /colour **per account**. Add the y-scale and legend (already added), drop the full-width single
   dashed block.
2. **"Yesterday's breakdown, each day" page** — a section that lists each day in the range with
   its per-account line, exactly like the report sheet's daily rollup.
3. **Product-to-product for a chosen day** — an item-by-item table for yesterday/today in the
   **sheet's own columns** (Item Title · Sold · AliExpress · Ads incl VAT · Returns · VAT to HMRC
   · Raw · Actual · margin). When the book is written → book rows (exact). When not written yet →
   built from **live eBay orders** grouped by item_id/title (orders table already has item_id,
   sold, cost, qty, ebay_fees, refunded), clearly labelled "live — book not written yet".

All three read from D1 (fast). Live product/account breakdowns are fully buildable from the
`orders` mirror we already keep.

## C. Notifications + Alerts — a proper bell, separate from Inbox

Current state: Inbox = DMs only; a hidden `#notifications` page (system letters, opened by the
bell); a separate `#alerts` page. The owner wants ONE bell icon that covers **notifications +
alerts together**, each item carrying a **plain-English explanation** of what it means and a
click-through to the thing it is about. Inbox stays strictly people-messages.

Design: bell → a panel with two tabs **Notifications | Alerts**; every row shows an icon, a
one-line "what this means" explainer keyed off the notification type, the time, and a button that
opens the relevant board. Big/critical alerts rendered large (Signals-style). 853 unread → add a
"mark all read" and grouping by type so it is not an overwhelming wall.

## D. Faster + cheaper database — the honest finding

**The database is not the bottleneck. Google Sheets / Apps Script in the operational hot path is.**
D1 already answers in 160–650 ms; the sheet path is 4–40 s and collapses at PKT peak. Every bug
this week (hunt "unsaved", reports missing, 15-min mirror lag) traces to Apps Script being in the
write/sync path, not to D1.

Recommendation — **stay on Cloudflare D1** (it is already the cheapest fast option) and change the
architecture, not the vendor:

- **Operational data (tasks, hunts, reports, notifications):** make **D1 the primary store**.
  Writes hit the Worker → D1 directly (instant, consistent — kills the timeout AND the mirror
  lag), then a background job mirrors OUT to Google Sheets as the human/backup view. This reverses
  today's "Sheets first, mirror later" for operational data.
- **Money (sales-analysis workbooks):** stay the source of truth (owner's law), mirrored INTO D1
  as now, on the UK-day basis from §A.
- **Cost:** free tier likely covers it; if read/write limits bite, **Workers Paid $5/mo** removes
  the worry. Keep KV (`env.HOT`) for hot config/session.
- **Fallback if D1 limits ever bite:** Turso (libSQL) — same SQL, easy migration, edge replicas.
  Do **not** move to Postgres (Supabase/Neon): a non-edge hop adds latency for no gain at this scale.

Sequence tonight: (1) number-basis fix + verify; (2) Sales Analysis breakdowns; (3) notifications
bell; (4) start the D1-primary write path for one department (hunts) as the proof, then roll out.
