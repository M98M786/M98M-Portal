# CHANGELOG

## 27 Nov 2026 — Ads command centre: every listing's ROAS; tables moved

- **Ads command centre**: two new columns, *ROAS today* and *ROAS · window*, on every listing row (green at 5× or better, amber under, red where the ad brought nothing, a dash where nothing was spent; the credited revenue in the tooltip). The item column now takes a fixed share of the width, so the figures sit closer to the listing. The *Day by day* and *Account to account* tables are gone from the centre.
- **The spend rule per band, and the Rerun box** (owner, 27 Nov): a listing that spends its band's limit on ads in a day without a sale is paused by the system — morning hours £2.00, evening hours £3.00, advertised all day (off the list) £5.00 — and runs again the next day (the switch at its hours; the rule itself puts an all-day listing back on). Stopped on three days (the last seven), it goes into the **Rerun box**: held off until Management presses *Run again tomorrow* (`adtoolPeakRerun`, Management / Ops Head only), after which its stops count afresh from that day. Engine: `adPeakBandLimit`, `adPeakStrikes`, `adtPeakStrikesRead`, tables `adtool_peak_rerun` / `adtool_peak_rerun_sent`, `adtool_peak_stops.band`; the rule now runs every sampler tick; settings `adtool_peak_stoploss_gbp_morning/evening/allday`, `adtool_peak_strikes_max`.
- **The three Peak pages** now draw their listings as the Ads command centre draws its rows (today and the 14-day window side by side, the Product history box under each, no red), each with a 24-hour box (units and ad spend by UK hour over the last seven days, the listing's own hours shaded), the rule in force at the top, the Rerun box, and the hours / limit / strikes line under every title. *Peak time listings* left the sidebar (the route still answers).
- **Three new pages — Morning Peak time, Evening Peak time, All day Peak Time** (owner): the Peak time listings page's own code on three bands. Morning = the list's morning-hour rows (07-13, 09-13, 10-14) plus a panel of every active listing in no campaign, each with a one-click *Add at 09-13*; Evening = the evening-hour rows (17-22); All day = every advertised listing NOT on the peak list, the best performing first (50+ units sold through a CPC campaign with a CPC ad still live) and shown by default, a chip for everyone, Add to the list on each row. Each page's Peak-time overview tiles count that page's listings only (engine cohorts `peak_morning`, `peak_evening`, `all_day`; `adtoolPeak` band `allday` returns `all_day` with `cpc_units / cpc_live / best`). Nothing is added to the list by itself.
- **Where each listing advertises**: the page is now the chips and ONE list — All, Duplication, No campaign, CPC live, CPC paused, Dynamic — each showing only its own listings; *2 Campaign* is gone; the two standing notes moved to the Extras page (`window.WLA_NOTES`).
- **Where each listing advertises**: the *Where each item stands* and *Gaps* chips are replaced by an *All* chip (every active listing, on by default) and five states — *No campaign* (in no campaign), *CPC live* (CPC live, not Dynamic), *CPC paused*, *Dynamic* (Dynamic live, not CPC) and *2 Campaign* (live in both at once). One pressed narrows the list to exactly those listings, with its own count and its own full read; pressed again it lets go. Engine: `adtoolItemCampaigns` states `cpc_live / cpc_paused / dyn_live / both`, cards carry `kind`, rows carry `cpc_live / dyn_live / cpc_paused`, counts carry the four.
- **All Account Listings**: a *ROAS today* column after Ads 14d (live, coloured against the 5× target, today's spend and credited sales underneath; in the CSV export too). Engine: `activeListings` rows carry `ad_spend_today`, `ad_units_today`, `ad_rev_today`, `roas_today` for the campaign roles; revenue leaves with the earnings strip.
- **Ads command centre**: a *ROAS today · all accounts* tile (today's credited sales over today's spend, live, coloured against the 5× target) beside Spend today, and each account card now carries its own live ROAS today. Engine: `adsBoard` `combined.rev_today/roas_today`, `accounts[].rev/roas`.
- **Ads command centre**: a seventh tile, *ROAS under 3× · window*, counts the listings bringing back under £3 for each £1 of ad spend (on £3 or more spent over the window). Clicked, it narrows the board to them, worst ROAS first, each row red with its Product history box underneath, exactly as the Wasting £3+ tile does.
- **Advertising overview**: the *Account to account · spend / revenue / ROAS per day* table now ends the page.
- **Business overview**: the *Profitability* section is gone.
- **Business overview → Extras**: the *Organic vs promoted sales · settled days* card (promoted = eBay-attributed revenue in the nightly books) moved from the Advertising dashboard block to the Extras page, under the live listings.
- Engine: `adsBoard` rows carry `rev_today`, `roas_today`, `rev_14d`, `roas_14d` (stripped for spend-only readers; the column is then left out).

## 2026-11-26 - BUSINESS OVERVIEW, ALL ACCOUNT LISTINGS, PRODUCT RETURNS: the owner's five-part list

Business overview. Before Right now there is a sales bar chart: green sold pounds from the daily books
and blue orders counted on the UK trading day, side by side, over one month of days, with an account
picker and 52-week and 12-month views (the engine's new bizSalesSeries; empty buckets are noughts, and
the hint says where the books begin when the window reaches further back). After Account health the
Account KPIs page sits in full, painted by its own module (K2_MOUNT), with its own account select and
7/30/90-day chips; Apply at the top moves both onto the chosen account.

All Account Listings. Active listings is renamed All Account Listings, and each listing's meta line
carries Supplier 1, 2 and 3 beside eBay and History, from the item facts' three AliExpress links.

Product Returns. Item risk is renamed Product Returns. Under every listing, in the decision box and in
the table, sit its number, eBay, its Product history and every supplier link on file. A window picker
(All time, Today, Yesterday, 7 days, 30 days) cuts the list to the products with a count in the window,
sorts by it, lights its column and makes the per-account columns follow it (the engine now folds the
accounts per window). Every product has an acknowledgement box: who, when and a required comment, kept
by the engine per board and product (item_risk_ack, itemRiskAck), with Acknowledge all shown and a hide
acknowledged tick. The account dropdown reloads the board for that account as before.

## 2026-11-24 - LISTING DESK: Send back to a hunter, beside Take back and Delete

Owner: "when I open Details on the Listing desk, give me a second option beside deletion: send the listing
back to the hunters - Jahanzaib, Irfan and Ahmad by name. I pick one and resend them the product to work on.
Time-bound, two days at most, the time block selectable, two days by default, with one day of grace before
it shows overdue." The Details card now carries a hunter picker (the approved Product Hunters; the one who
hunted it is pre-picked), a Pakistan-time deadline box that defaults to and cannot go past 23:59 two days on,
and Send back to hunter. The reason box that Delete uses goes with it. New Apps Script action
`huntSendBackToHunter`: the hunt goes to REVISION REQUIRED with the note in Comments; the listing task is
deleted and its lister told (not back into Send to listers); any older open revision task for the hunt is
closed; a hunt_revision task lands on the chosen hunter with the chosen deadline and a bell. When the chosen
hunter is not the one who hunted it, the hunt moves to them (hunters' screens list only their own hunts) and
the original hunter is named in Comments and the activity log. Revising it returns it to the approval queue.
The one-day grace is the portal-wide quiet day (TASK_GRACE_MS), so it shows overdue only after day three.

## 2026-11-23 - LISTINGS ARCHIVE: two rows instead of 882, because the page gave up after 30 seconds

Owner, with Bilal's screen in front of him: the archive showed his own two September listings and
nothing else - "कोई पुराना डेटा नहीं पड़ा हुआ". The giveaway is in the screenshot: the **All listers /
Mine chips were gone**, and `laPaint` hides them only when `LA.mineOnly` is true - the flag the page
sets when the TEAM feed fails and it quietly falls back to `myListingWork`, the person's own work.

`listingArchiveEngine` was building the whole page in one answer: `SELECT *` over 882 completed tasks
(1.6 MB of `details` nobody draws), then the live supplier record for all 678 items in IN-chunks of 50
- about **73 D1 queries per page open**. Cloudflare's own analytics show the price: 779 invocations in
three hours ended `clientDisconnected`, wall-time P99 **30.02 s**, which is exactly the browser's
30-second abort. So every lister who opened the archive waited half a minute and was then handed their
own two rows with no error anywhere - and 21 Nov's Details work was never even reached.

**The list is now three queries** - users, provenance, and the completed listing tasks by name (never
`SELECT *`: `details` is up to 8 KB a row and the list draws none of it). It carries no record at all.
**The record for ONE row is read when the person opens it** (`listingArchiveRow`: the §8.2 hunt-form
pack plus that item's live supplier rows, six single-row reads), so opening a row costs what one row
costs. The view keeps the opened records for the visit, and a Refresh forgets them.

Also: when the team feed does not answer, the count line now says so - "N of your own - the team
archive did not answer, press Refresh" - instead of letting a lister read an empty page as the truth.

§8.2 unchanged: same 21-column whitelist, no cost or earning on this path, and a revision's own
details prose (management's reasoning, which carries profit and CPC figures) is still never returned.

Build 20261123-1750 · engine deployed.
## 2026-11-23 - LISTINGS ARCHIVE: the record itself was being stripped away, not withheld

Owner, 23 Nov: "item listers are not getting whole listing archive, refresh it." The archive's Details
panel (21 Nov) drew a shell - a hunt id, "Listing Update Pending", and whatever live supplier rows the
item happened to have (only 316 of 665 listings and 109 of 217 revisions have one). The listing record
itself never arrived. A listing task's details JSON is `{hunt_id, limited:{… the 21 §8.2 columns …}}`,
written that way by `huntAppendTask_` since the pipeline's first day, so THE PACK LIVES UNDER `.limited`.
`lstParseDetails` hands back the OUTER object (it only unwraps a `.listing`), and `lstLimited` then
indexed `hunt_id` / `limited` as if they were column headers: every one of the 21 columns came out empty
but the 'Listing Update' default. Measured over all 665 completed listings on the live mirror, the engine
was shipping **1.00 filled field per row where the stored record holds 15.60** - 664 rows have a title and
at least one link, and not one of them reached a lister. My tasks looked right the whole time because that
card renders the RAW details in the browser and digs into `.limited` itself, which is exactly why the owner
could see a full card on 21 Nov and point at it.

One law, one helper (`lstPack`), three callers: `listingArchiveEngine` (the team archive every lister
reads), `myListingWorkEngine` (the lister's own Assigned-listings card and the Listing pipeline, blank the
same way), and `listingTaskCard`, which had the unwrap inline and correct since this morning and now shares
the helper. `lstFamily` keeps its behaviour and uses the helper too. §8.2 is untouched: the pack is still
built through the 21-column whitelist, the stored packs carry nothing outside it (checked on all 735
listing rows), and no cost or earning field exists in this path - the Details panel still shows supplier
names and links only.

Engine-only change, no portal build: a lister presses Refresh on the archive and the record is there.
## 2026-11-23 - SEND TO LISTERS: every lister topped up to 12 at UK midnight

Owner, 23 Nov: "When I approve hunts and they go into the Send to lister box, every day at UK midnight
look at how many listings each of the four listers has. Whoever has fewer than 12, pick listings from the
box and send them automatically, each up to a total of 12 - if they have 6, send 6 more. Never more than
12 in a day." The engine's hourly clock now takes the tick that is UK midnight (the clock decides, so
summer and winter both land on 00:00 UK), once per UK day, and calls the Apps Script job `listerTopUp`
through the deployed /exec, up to four times while listers are still short and cards remain. The job
counts each lister's listing_new tasks still on their desk (Pending, Working, Updated - a submitted one is
waiting on us, as the Send page's own workload boxes count it), deals the Pending-send cards oldest first,
one per lister per round, round the listers under 12, and sends each through the same core the Send
button uses (`huntSendCore_`, split out of `actionHuntSendToLister_` with no change to the click path):
same task row, mirror pushes and bells. Picks are what the page pre-selects: the hunter's account when it
is one the rotation allows, else accounts dealt round-robin skipping Rabia's and Yaseen's and any paused
one; the hunter's campaign pick when it is a known type, else '100 % Strong '; the deadline two days on at
23:59 PKT with a Sunday moved to the Monday. Task `assigned_by` reads `system:lister-top-up`; the night's
result lands in `sync_state` (job listerTopUp, account @last) and the ACTIVITY_LOG as LISTER_TOP_UP.
Listers = approved Item Listers and the Listing Manager, the Send form's own list.

## 2026-11-22 - ENGINE: ebayVideoUpload carries the whole file in one piece (WINDOWS)

The first real video (Perfect Super Deals, 11 MB) showed eBay does not take pieces: the create answered
201 with a video id, then the first 6 MB piece sent with Content-Range came back 400 190007
"Content-Length 6291456 cannot be less than video size 11516628" — the upload endpoint wants the whole
file in one request. The piece cap rises from 8 MB to 16 MB decoded so a normal listing video rides one
request with no Content-Range; 16 MB is the isolate's memory line with the base64 envelope and the
decoded copies in memory at once. The create now refuses a size over 16 MB so no empty media record is
left behind for a file the route cannot carry; a longer video needs a route that reads a raw body.

## 2026-11-22 - ENGINE: upload a listing video through the API (ebayVideoUpload)

Owner: "I will upload the video in the chat and you upload it on eBay — make a route." New sync-keyed
route `ebayVideoUpload` with three ops: **create** (declares the title and the file's exact byte count,
returns eBay's new video id — eBay answers 201 with an empty body and the id in the Location header,
so ebayRestFetch now carries that header back; audited as EBAY_VIDEO_CREATE), **part** (the file
travels as base64 pieces of up to 8 MB inside the JSON envelope; a single piece that is the whole file
goes plain, several go in order from offset 0 with Content-Range), and **status** (the same media read
the video sweep has made since 31 Oct — PENDING_UPLOAD → PROCESSING → LIVE, or eBay's refusal with its
reason). Attaching the finished video to a listing is ReviseFixedPriceItem with VideoDetails.VideoID
through the existing ebayTradeCall; eBay's cap is 150 MB, UK marketplace supported, and the
sell.inventory scope the upload needs is already in the consents.

Owner: "my page has the Acknowledge option, Husnain's doesn't - fix that." His row was one of the
provisional ones read from the engine's ledger before the day's Sales Analysis tab exists, which had no
buttons because no Signals card existed to acknowledge. Those rows now carry the same three actions and
the same acknowledge-with-a-comment form. The engine records the acknowledgement itself (day, listing,
who, when, comment), the row leaves the list, and when the Signals card for that day and listing is
raised later the board acknowledges the card on the Signals side with the same comment, so nothing has
to be acknowledged twice.

## 2026-11-21 - AD TOOL: the Team Lead reads the Product history with item profit

Owner, asked whether the Product history boxes and page should open to Husnain with profit too:
"open them too". The ad tool's reads (the Product history page, the boxes under the command centre's
rows and the other adtool pages) now reach the Team Lead with their item-level profit. Account and
fleet profit still leave for every role outside Management and Ops Head, and the price desk keeps its
strip.

## 2026-11-21 - ADS COMMAND CENTRE: yesterday's negatives from the engine's ledger before the day tab exists

Owner: "went negative only shows products up to 19 Nov, not yesterday the 20th - why, and fix it." The
WENT NEGATIVE cards are raised by the Signals scan from each account's Sales Analysis day tab, and on
the 21st no account had a "20th November" tab yet (the scan answered "not connected yet" for all six),
so no card for the 20th could exist. The command centre now reads yesterday's negatives from the
engine's own day ledger when the feed holds no card for that day - the same per-listing actual profit
the Product history By period table shows - and lists them first, marked provisional, with the
listing's figures and its Product history box; the Signals card, with Acknowledge, replaces them when
the tab lands.

## 2026-11-21 - ADS COMMAND CENTRE: Husnain sees it as Management does

Owner: "why is this page not shown to Husnain as it is to me in his portal - fix that, so he sees the
Ads command centre as we see it." The Team Lead role now receives the command centre's board whole
(ad revenue, ROAS and the organic-versus-promoted split included) and the WENT NEGATIVE cards whole,
so the went-negative section with its figures and actions draws for him. This is the one named
exception to the rule that a Team Lead sees loss alerts and never earnings: the Product history boxes
under the rows, the Product history page and the price desk still strip earnings for the role.

## 2026-11-21 - BUSINESS OVERVIEW: Live listings move to an Extras page at the end of the sidebar; Staff performance moves to My tasks

Owner: "remove the listings from the Business overview, show them under an Extras title at the end
of the portal; the staff performance, move that to my tasks page". The Live listings table leaves the
Business overview and stands unchanged on a page of its own, "Live listings", in a new Extras group at
the bottom of the sidebar, with its own Refresh. The week's Staff performance block now sits at the
foot of My tasks, for Management only, drawn by the same painter. The overview no longer fetches
either feed.

## 2026-11-21 - BUSINESS OVERVIEW: each individual day's money, by account, in the dispatch block's format

Owner: "the data for each individual day shown as the dispatch block is - its sold and so on for that
day, by each account". In the Individual days view the Collective block now draws one block per UK day
of the window, newest first: the day's tiles (sold, order earning, Ali cost, ads, profit before ads,
the sheet's Actual, margin) and an account table with the same columns for that day. The window's
total is one line above the blocks.

## 2026-11-21 - BUSINESS OVERVIEW: the Individual-days dispatch clock keeps the Today format

Owner: "the details shown the same way as above for the individual days too - no change in the
format". In the Individual days view the dispatch clock now draws one block per UK day of the window,
newest first, each with the same three tiles and the same account table as Today's block, over that
one day; the window's own totals are a single line above them.

## 2026-11-21 - BUSINESS OVERVIEW: the dispatch clock goes day by day in the Individual view

Owner: "Individual days doesn't work, it still comes through with the collective combined data." The
first section of the page, the dispatch clock, was still one total for the window. In the Individual
days view it now lists every UK day of the window, newest first - came, processed, remaining, the
progress bar, and each day's accounts beside it - with the three tiles above keeping the window's
total. The engine's window pulse answers the per-day split alongside its totals.

## 2026-11-21 - BUSINESS OVERVIEW: Apply for the account, and Collective / Individual days

Owner: "Refresh doesn't work - change it to Apply so that when clicked the information is exclusively
for the account selected. I want both individual days' performance when clicking the days selection
and the collective combined data too - an option to select either." The Refresh button is now Apply:
choosing an account arms it and pressing it reloads every section for that account (all accounts when
none is chosen); with the account unchanged it is the refresh it was. A Collective / Individual days
switch sits beside the day chips. Collective is the page as it was. Individual days lays the chosen
window out day by day, newest first: the Collective block becomes a table of sold, order earning,
AliExpress cost, ads, profit before ads, the sheet's Actual and the margin per day with the window
summed underneath; Profitability adds an account-to-account table per day; the Advertising card lists
spend, revenue and ROAS per day. All of it from the daily books; today is the live overlay.

## 2026-11-20 - SIGNALS PAGE DELETED

Owner: "Delete Signals, no longer needed". The Signals page leaves the sidebar and the pinned list, the
signal pins no longer mount on Home, and the Business overview's link to it is gone. The feed itself,
the clock-in and clock-out taps in the top bar, the Customer service and Advertising department signal
pages, and the went-negative section of the Ads command centre are unchanged.

## 2026-11-20 - PRODUCT HISTORY: the recently-advertised chip strip is gone

Owner: "remove this from the Product history page". The row of recently advertised listing chips under
the search box, and the search call that filled it on every open, are removed. The search box and the
Matches table it answers with are unchanged.

## 2026-11-20 - SIGNALS: the advertising group leaves the Signals page

Owner, after the went-negative cards moved to the Ads command centre: "Advertising no longer needed,
signal delete". The Signals page, the home pins and the badge now leave out the whole advertising
group - went negative yesterday, worst CPC performer yesterday and wrong advertising - and the summary
line says nothing about them. The Advertising department's own signal page is unchanged.

## 2026-11-20 - PRODUCT HISTORY: best and worst times, under the hour-by-weekday grid

Owner: "integrate the graph bottom with best or worst time slots". Under the grid the page now says
outright what the two pattern blocks imply: the best and worst time slot by units a day (with the ad
spend of each), the slot that turns ad money into units best and worst, the three strongest hours of
the clock summed over every weekday, the hours in which nothing sold (or the three quietest), the best
and weakest weekday per date held, and the three hottest weekday-hour cells. All of it is read off the
slot rows and the grid already on the page.

## 2026-11-20 - PRODUCT HISTORY: the window selector, the weekday profile and the dates block are gone

Owner: "delete these graphs, no longer needed". The Patterns panel with its window picker (All time,
Last 28 days, This/Last month, This/Last week, month and week pickers), the Weekday profile chart and
table, and the Best dates of the month chart are removed from the Product history page. The time slots
table and the hour-by-weekday grid stay, over all time, each heading still naming the window it covers.

## 2026-11-20 - ADS COMMAND CENTRE: the went-negative listings move here from Signals, with pictures on every row

Owner: "show 'Went negative yesterday' not in the Signals page anymore but in the Ads command centre, in a
different background colour, presented the same way as the red rows' box, adopting the product image;
present that data before today's negative-going products, only those on which no action is taken; and
on the Product history page and the command centre show the image of each product." The centre now reads
the same Signals feed and draws every WENT NEGATIVE listing nobody has acknowledged yet as an amber row
above today's red rows, newest day first and the biggest loss first within a day: the row names the day,
the actual profit, the order earning, the raw profit and the ad fees as the card did, the board's own
columns fill in where the listing is on today's board, and underneath sits the same box as a red row (By
period, All-time daily with its Day / One week / Last week / Week / Month tabs, Where its ads sit) with the
card's one-tap actions and the acknowledge-with-a-comment form, which takes the row off the list and logs
it exactly as the Signals page did. The Signals page and the home pins leave those cards out and say how
many are on the command centre instead. Every row of the board, and the Product history page head, now
carries the listing's picture from the item list.

## 2026-11-19 - ORDER BOOKS: a cancelled order stays in the sheet, painted yellow

Owner's rule of 19 Nov: every order is pasted into its day tab as it arrives; the moment eBay shows a
cancellation on it (a buyer's request waiting on us, or an order already cancelled) its row or rows turn
yellow and stay there as the record, so the processor does not order it and nothing is ever removed. All
seven automated order books' bound scripts carry the same cancellation watch now: each 15-minute sync also
reads the orders eBay changed recently, pastes a cancelled one it never saw, paints yellow, and un-paints a
request eBay later rejects. Rabia Masood's project was found empty and holds the full code now, still
awaiting the owner's go-live steps.

## 2026-11-19 - TRACKING UPLOAD: the courier is never guessed from the number again

Owner: "stop guessing DHL". The upload used to name the courier from the shape of the tracking number -
every JJD number went up as DHL, sixteen-digit numbers as Hermes, the rest as Other - and that guess was
what the shipping confirmation told the buyer. Since 1 Nov, 2,613 of 3,308 uploads said DHL; eBay's own
record of the same parcels says InPost Shops, Evri or Royal Mail. The push now sends the courier a person
picked in the portal when eBay's accepted list carries it (an exact pick from that list wins as typed),
otherwise Other, and eBay's own recognition names the courier on the order. After the push the fulfilment
is read back and eBay's answer is what the trackings ledger keeps, so the Orders screen's "carrier" label
and the tracking-fetch log show what eBay shows. The Messages tool has read the courier live from eBay
since 18 Nov, so buyer notes were already right; this closes the source.

## 2026-11-06 - ADVERTISING OVERVIEW: the hour-by-hour chart takes its own period bar

Owner: "develop the period option above the hour-by-hour graph - previous days and month data - the
graph changes to the period clicked". The hour panel now carries the same period bar as the other
advertising pages (Today, Yesterday, 3/7/14/30/90 d, this/last week, this/last month, custom) and its
own account chips (following the page chip until one is picked here). Today is the live five-minute
curve as before. Every other key is `adtoolHourWindow`: money and orders per UK hour from the hourly
roll-up (`adtool_listing_hour`), added up over the window, with the day count, the day-average in each
bar's tooltip, a note for days the roll-up does not hold (it starts 17 Sep 2026), and the published day
total beside it so money the five-minute readings never caught is named rather than dropped.
Verified live: Yesterday 209 orders / 230 units = the engine's own Yesterday tile exactly; spend lower
by the unplaceable part (published £612.33, in hours £542.88), now stated on the chart.

## 2026-11-04 - ACCOUNT TRAFFIC: the month-back comparison is its own block, not a dashed line

Owner: "red dotted line makes no sense, remove that - I want the same presentation duplicated with
last month's same-date stats." The dashed month-back marker inside every day bar and hour bar is
gone. Under the day rows a second block draws the same tiles (impressions, views, transactions, CTR,
conversion) over exactly the dates the tiles above cover, one calendar month earlier, and the same
two day rows on a SHARED scale with the rows above; the hour chart gets a second row of hours for
the same date a month back on the same scale. Tooltips still name the matching day/hour in the
other block. `trBarRow(label, key, word, rows, opt)` - opt.max / opt.vsOf / opt.today / opt.note.

## 2026-11-04 - BUSINESS OVERVIEW: the date chips drive the page

Owner: "Business overview page only shows data for today - Yesterday, 7 days, 30 days clicking
doesn't reflect any result." The chips only ever re-computed two sections far below the fold
(Collective KPIs, Profitability); everything on the first screen was pinned to today.

- Engine `ordersPulse` accepts `from`/`to` (UK trading days, capped at 92): the orders that came on
  those days and how many have been bought since, by the same cost-AND-order-number rule. Today is
  unchanged (live minute clock, backlog pile, yesterday line); a window has no backlog and no
  yesterday line. Memoised per window for 55 s like today.
- Overview: one `oRangeChanged()` for every chip/Apply click - the dispatch clock re-reads for the
  window and renames itself ("Orders - Last 7 days - the dispatch clock"), the Advertising card sums
  the day books per account over the window (Yesterday keeps the engine's own `ads_yesterday`
  rows), and the KPI/Profitability block repaints as before. A clock answer for an older window is
  guarded so a slow reply never paints over a newer click, and an engine build without window
  support says so instead of showing today's count under a 7-day heading.
- Sections that stay pinned say so in their hint: "Right now" (live today), "Today & yesterday".
- Same day, second pass (owner: ratings "Loading…", VAT "filling…", five funds rows "—"): the overview
  fired three `pageMetrics` register reads at once (8 s D1 scans each) and tipped D1 into "overloaded";
  `fundsSummary` then froze five refusals in KV for ten minutes. Shell `truthPage` now runs register
  reads one at a time per tab; the overview loads ratings on their own, retries each register read
  once and says what failed; `fundsSummary` keeps good rows, re-asks refused accounts within a minute
  (one retry on a D1 overload) and shows the last good figure marked stale instead of a dash.
- Third pass: err_log shows D1 "overloaded" refusals on every page at the engine's cron ticks (:00/:05/:15
  stack three slots). The request handler re-runs a pure read once after 1.5 s on that refusal
  (`D1_RETRY_READS`); every overview feed goes through `oFeed()` — staggered first load, ONE more try
  15 s later before a card says "did not answer"; the Collective block reads the register only (retry
  once) and falls back to the P&L brain only after that fails; the dispatch clock retries in 15 s.

## 2026-10-03 - TRACKING FETCH: a not-mine mark no longer hides the order from its owner

Two-day shadow test finding. Each AliExpress order is visible to exactly one of the four buyer
logins; the other three profiles mark it 'notmine' (mostly inferred from the order number's family,
without a visit). `tfIntake` stamped `tracking_pulls.last_checked_at` on every such mark, and that
stamp is the 12-hour re-ask throttle in `tfPullList` - so three sibling stamps hid an order from
its real owner for a day or more (order ...0195 / eBay 14-15235-89685: three not-mine marks, never
opened by m98mshop2, dispatched by hand). At the time of the fix 326 of 337 pending orders were
throttled, 179 of them only by sibling marks.

- `tfIntake`: a 'notmine' mark adds the login to `not_mine` and bumps `checks`; it never touches
  `last_checked_at` (NULL on first sight) and never replaces a real found/none `last_result`.
- Data repair after deploy: `last_checked_at` cleared where `last_result = 'notmine'`.
- Tests 41/41 (`M98M-Tracking-Sync/tests/engine-trackfetch.test.js`, 5 new).
- Also carries 8424733 (Tracking Fetch pushes pass `force_live`), inert while the gate is off.

## 2026-10-01 — TRACKING FETCH AGENT (fleet 07) — engine side, undeployed

The AliExpress → eBay tracking loop with no typing in it. A Chrome extension (repo
`M98M-Tracking-Sync`, v2) asks the Engine which orders still need a number (`trackingPullList`),
reads each order's own AliExpress tracking page, and hands the numbers back (`trackingIntake`).
The Engine matches on `orders.ali_order` and pushes through the existing `pushTracking`.

- New block `/* TRACKFETCH-BEGIN */ … END */`; tables `tracking_inbox`, `tracking_pulls`; index
  `idx_orders_ali`; routes `trackingPullList` / `trackingIntake` (own key: `TRACKING_KEY` secret
  or `portal_config.tracking_fetch_key`), `trackingInboxRead` (order roles), `trackingFetchSet`
  (Management); job `trackingInboxRetry` on the quarter-hour slot and in `runJobKey`;
  `backupDump` gains both tables; truth board gains `TRACKING_FETCH_HELD` (INFO).
- **Shadow by default** (`portal_config.tracking_fetch_live` unset). Held, never pushed:
  DUPLICATE (one parcel, two Ali orders), AMBIGUOUS (two buyers), HAS_OTHER (team's number
  wins), FAIL. No sheet is written from the block — `pushTracking`'s bridge write is the only
  one, as before.
- Written and tested (36/36 in `M98M-Tracking-Sync/tests/engine-trackfetch.test.js`);
  **not deployed** — the dash session had expired. Blueprint: `M98M-Tracking-Sync/BLUEPRINT.md`.

## 2026-09-01 — TRUTH UPDATE v2 (phases 0–6)

The whole portal moved onto a verified number register: one metric, one function, two
independent computation paths, provenance chips on every tile. Spec: `docs/TRUTH-UPDATE-v2.md`;
evidence per phase: `docs/TRUTH-UPDATE-PROGRESS.md`.

- **Money**: every £ figure = the sales-analysis day tabs' own columns (Σ Raw Profit, Σ VAT to
  HMRC, Σ True Order Earning) via the D1 sheet mirror; invented formulas ("0.8 ×", "20 % ×",
  estimates) deleted from every caption. Nightly penny audit.
- **Orders**: dispatch rebuilt on eBay's own open set (openSync, 5-min, complete-run guarded);
  LATE/DUE/AWAITING partition exactly; the five 39–93-day "late" ghosts were closed on eBay and
  left the board entirely.
- **Advertising** (WO-08): one `liveMembershipRow` definition; eBay per-ad `adStatus` synced;
  four-way split partitions ACTIVE exactly (SPLIT_SUMS_TO_ACTIVE, 15-min);
  MULTI_RUNNING corrected 391 → 25 (paused ads/campaigns/ended listings no longer count);
  CPC ✕ pause (`adsPauseListing`) — the portal's only eBay write, user-click only.
- **Management desk** (WO-02): Pending approvals + Management desk + Departments merged into
  one page (Waiting on you / Queues / Departments); old routes redirect; TASKS_OPEN_BY_DEPT
  verified 15-min.
- **Keyword docs** (WO-09): a listing newly live in a CPC campaign starts a 72 h clock → task
  for Zain (opens +72 h, due +96 h), four outcomes, searchable archive, follow-ups capped at 3;
  AS keyword sweep retired.
- **Hunting** (WO-11): AliExpress duplicate check (multi-link, short-link resolution) at the
  top of Product hunting + a submit-time block with logged Management override. Backfill:
  408/408 stored supplier links parse (100 %).
- **Inbox** (WO-12): DMs on D1 — thread list + unread by one indexed query, 30-message pages,
  optimistic send, 30 s delta polling; sheet archive mirrored in; participant-only reads.
  R2 is not enabled on the Cloudflare account, so attachments wait on DECISIONS #3.
- **Signals** (WO-13): 15-min re-evaluation auto-resolves alerts whose condition ended.
- **Cleanup** (WO-14): ~2,900 lines of replaced pages deleted (old account report, live
  listings, management desk, departments, advertising/wrongAds, kpis + dispatch sections);
  30-Aug truth machinery (bookFix / truthCheck letters / sirHasibMonthlyFill) off the nightly
  chain, callable by hand; docs SYNC.md + TRUTH-CHECK.md + NUMBER_REGISTER.md.

Deploys: worker `m98m-engine` (1 Sept 01:34 UTC), Apps Script v88 (same /exec URL), Pages
builds 20260901-00xx–01xx.

## 2026-11-06 — Overview hour chart: the overnight money, named
- `adtoolHourWindow` now returns `published.before_first_reading`: the share of eBay's published day total that was spent between midnight and the first reading (~08:05 UK), estimated as the carry's share of the sampled mass. eBay refuses a report task for a day Pacific time has not reached, so no hour before ~08:00 UK can ever hold ad money.
- The chart's gap note says so (owner: "between 1 am and 6 am I do not see any CPC deducted"): the ads run and charge through those hours; the money arrives as one lump with no hour. The live Today note says the same.

## 2026-11-06 — Overview hour chart: the overnight lump drawn as an estimate
- `adtoolHourWindow` returns `overnight` (total = published share + unpublished carry, and `arrivals` by the hour each day's first reading landed in). The page spreads each arrival over the hours before it, half evenly and half by those hours' orders, and draws it as hatched bars marked ≈ on top of the read money; Today does the same with the live carry.

## 2026-11-08 — Ads command centre: Today and Yesterday chips
- `adsBoard` takes `period` (today | yesterday). Today's window is the live table plus ad revenue from the five-minute readings; Yesterday reads eBay's published report, and until that lands (about 08:00 UK) the last readings of the day stand in, named as such on the page. Day chips now clear picked dates, Refresh keeps the window on screen, and every heading names the window in words.

## 2026-11-12 — Handover log: the shared brain of the two Claudes
- `docs/HANDOVER-LOG.md` added (WINDOWS). The Mac Claude (primary) and the Windows Claude (backup) each append one dated entry per change or finding, newest at the bottom, and push it with the change. First entry: the Windows backup set up from the 11 Nov package, the read-only keyed verification of 12 Nov, and two flags recorded for the Mac (`selfTest` 4 failed on 12 Nov; the 11 Nov sheet backup stopped at 23 of 49 tables).

## 2026-11-20 — Send to listers: the Send itself, 7-10 s → one TASKS text search
- `actionHuntSendToLister_` read the whole TASKS tab twice per send (the double-send guard, and `engineTaskPush_` re-reading the row just written) and made two sequential Google→engine hops. The guard is now a server-side TextFinder over the details column (`huntTaskHolding_`), `huntAppendTask_` hands back the row it wrote, and hunt mirror + task push go in one parallel `enginePostAll_`. The SLOW_ACTION ledger had every Send at 7.0-10.6 s.
- Page: a send no longer re-reads the archive, the heavy Sent list and the workload and redraws every card (which wiped the picks on the other cards); the card goes, the counts move, the Sent list gets its row, only the workload boxes are re-read.
- Backend code is saved in the Apps Script project (head); the web app still serves version 200 until a new version is deployed — the project is at Google's 200-version cap, so an old version must be deleted first.

## 2026-11-20 — Send to listers: three separate numbers per lister
- `listingLoad` also returns `revisions` (listing_revision tasks assigned to a lister) and `issues` (hunt_revision tasks a lister raised with Need info, i.e. listings sent back for issues), same 60-day window. Each lister box shows new listings received (listed / open), listings sent back for issues (still with the hunter), and revisions sent to them (open), under the waiting count.

## 2026-11-20 — Business overview: 3, 4, 5, 6 and 14-day chips
- `oRange` resolves any `dN` chip as the last N UK days ending today (same law as 7 and 30), so the dispatch clock, Collective, Profitability, Advertising and the prior-window deltas all follow the new chips through the one path.

## 2026-11-20 — Ads command centre: a red row carries its Product history
- Under every red row (£3+ today, no order) the board draws the listing's own Product history blocks in the page's order — By period, All-time daily (inline SVG, no chart library) and Where its ads sit — small enough to sit in one box with the row. Read per listing through `adtoolListing`, one after another, kept ten minutes.

## 2026-11-20 — Product history charts rebuilt as green / red / white bars
- Yesterday's behaviour and All-time daily (and the red-row copy in the Ads command centre) now draw units sold as green bars, the ad spend of that hour or day as red bars, and the average ad spend as white bars. `adtoolListing` returns `hour_avg_spend` (each hour's spend averaged over the days in the last 28 that hold an ad reading); the daily average is the 7-day mean of spend.
