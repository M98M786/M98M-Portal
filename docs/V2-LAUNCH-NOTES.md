# M98M Portal V2 — what shipped and how to switch it on
_Written 15 Aug 2026, the night the build completed. For Hasib and the managers.
Everything below is LIVE now; the things that touch eBay or move money are in
**shadow** — they record exactly what they would do, and do nothing, until armed._

## The Engine
A second server (Cloudflare, `m98m-engine…workers.dev`) now works alongside the
Apps Script backend. It talks to eBay directly on all five API accounts and answers
portal screens in ~150 ms. If it ever goes down, every screen falls back to the old
path by itself — pulling its plug breaks nothing.

What it watches, around the clock:
- **Orders** every 5 minutes (six-day rolling window, real units, delivery estimates).
- **Campaigns** every 5 minutes — created / ended / paused / budget moved / renamed,
  belled in plain English. External changes always say *"changed on eBay — the portal
  cannot see who"*; only portal edits ever carry a person's name.
- **Campaign membership** every 15 minutes — and any item sitting in more than one
  RUNNING campaign is confirmed for 90 minutes, then belled **once per account per
  day** with the full list on the Campaign watch screen. It found 210 real duplicate
  items on day one.
- **Listing violations** every 5 minutes — a new one bells CS and management with
  eBay's exact wording within minutes.
- **Cases, returns, item-not-received, buyer messages** hourly; **seller standards**
  nightly; **ad spend** nightly per item (real CPQ); **the books** roll nightly into
  UK business days.

## New screens
| Screen | Who | What it answers |
|---|---|---|
| **Business overview** | Management/Ops | The whole company at a glance: today live, yesterday, 7 days, per-account pulse, ads vs the ROAS≥5 target, health grid, and the two red lights (loss items, duplicate campaigns) with links to fix them |
| **Campaign watch** | Management/Ops/Zain | Every campaign as eBay has it, the duplicate list with one-click ✕ removal (shadow), and the change feed |
| **Account health** | Management/Ops | Live account numbers with vs-last-night arrows, every sync job's health, and the **eBay connections** panel (see below) |
| **Daily report** | Management/Ops | Revenue / order earning / cost / ads / profit-estimate per UK day and account, with weekly and monthly comparisons |
| **CS live desk** | CS + Management | Everything open on eBay right now sorted by respond-by clock, unread buyer messages, eBay's own TOP_RATED verdicts, violations verbatim — plus Reply and Refund buttons (shadow) and the auto-message switchboard |
| **Active listings** | most roles | Live listings joined with the sheet's own numbers; profit columns only for roles the visibility law allows |
| **Order rechecking** | (existing screen) | Now carries "Engine eyes": the concrete orders behind each of the four checkpoints and which still have no tracking on eBay |

## Your go-live checklist
**Step 1 — five consent clicks** (Account health → *eBay connections*): open each
link signed into that selling account, Agree, paste the code (the whole URL is fine).
This unlocks: campaign watching for ABRT + Hafiza, TOP_RATED verdicts for them, and
**real eBay fees for every account** (the fee-drift alert starts the same hour).
Nothing existing breaks — the sheet automations keep their own keys, always.

**Step 2 — arm the switches, one at a time, when each has earned it**
(Cloudflare → the Worker → Settings → Variables → add the var with value `true`):

| Switch | Arms | Watch first on |
|---|---|---|
| `TRACKING_LIVE` | tracking pushed to eBay the moment a processor records it | the shadow rows it has been recording |
| `ADS_WRITE_LIVE` | the Campaign-watch ✕ buttons | the change feed's shadow entries |
| `AUTOMSG_LIVE` | auto-messages (each account's triggers still gate each send) | the switchboard's queue tail |
| `CS_WRITE_LIVE` | CS desk Reply + Refund | the audit's CS_*_SHADOW rows |

Each is independent. Shadow-era records can never fire retroactively — arming only
affects what happens next.

**Step 3 — the sheet shadow flip** (`setExternalWrites(true,'hasib')`) when you want
portal edits writing to the live workbooks.

Also open: the "hamza - listing revision required" sheet share, and a yes/no on the
loss-ping hours (14:00–23:00 PKT is what runs).

## Trust notes
- Every number on every new screen has a live feed behind it — screens whose feeds
  don't exist yet (staff performance on the overview, for example) say so instead of
  showing samples.
- The build survived **three adversarial review cycles — 64 reviewer agents, 49
  confirmed findings, 49 fixed** — with the heaviest scrutiny on the paths that move
  money, message buyers, or change credentials.
- The operational runbook (deploy loop, cron map, platform quirks) lives in
  `engine/README-DEPLOY.md`.
