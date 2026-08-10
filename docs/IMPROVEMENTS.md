# How to make the M98M Portal better
_Written for Hasib. Every number here is either measured from your own files or clearly marked as an estimate._

I was given five separate reviews of the portal and asked to check every claim against the actual code and against `local/REALITY-MAP.md` before passing it on to you. I threw out roughly half of what they said — some was wrong, some was already handled elsewhere in the code, some was advice that would apply to any software ever written. What survives is below, with the file and line number so anyone can check me.

---

## The short version

- **The portal cannot get through one shift right now.** Two separate faults each lock every staff member out somewhere between 30 and 70 minutes after they sign in, with no error message and no way back except reloading the page — which throws away everything they typed. Both are small fixes. Nothing else on this list matters until these are done.
- **The engineering underneath is genuinely careful.** I actively tried to break the part that reads and writes your real workbooks and could not. It refuses to guess when two of your column headings look alike, it refuses to write a formula into a cell, it takes a lock, and it logs every change. That is the part that could have destroyed real data, and it is solid.
- **Nothing is backed up yet.** That is scheduled for Phase 7 and the build is at Phase 5 — but staff will start putting real work into the portal's own database before Phase 7 arrives. Worse, there is one line of code that, if the database ever goes briefly missing, quietly creates a blank replacement and forgets where the real one was.
- **The background jobs have never run.** The setup guide tells you to run a function called `installTriggers`. There is no such function anywhere in the code. This means the "missed 2-hourly report" flag — the accountability spine of the whole thing — has never fired once.
- **One write escapes the safety catch.** You have the portal in rehearsal mode where it writes to nothing real. That holds everywhere except one path: publishing an Advertising instruction writes a row straight into the live PPC Central workbook.
- **The Listing Tool will not work inside the portal at all.** Not "will forget your drafts" — it will render a dead page. One unprotected line kills the entire tool's code.
- **The biggest money finding is not a bug in the portal, it's a hole in what the portal shows.** Your own Sales Analysis sheets already measure £834.83 of July advertising fees on Saif Bhai listings that sold nothing — but that number is only written down after month end. The portal reads those sheets already and could put it in front of Zain every morning.
- **And the boring true one:** the eleven staff rows are seeded as *pending* with no shift set (`Setup.gs:48`). Until you approve each person and set their shift, there are no checkpoints, no reports, no rota — the accountability layer is switched off by data, not by code. That is about 20 minutes of your time and it blocks the pilot.

---

## Fix these first

### 1. The request counter never resets, so everyone gets locked out mid-shift
**File: `apps-script/Router.gs`, lines 110–114.**

**What it is.** The portal counts how many requests each person makes and blocks them after 90. That count is supposed to clear every 60 seconds. It doesn't. Every new request pushes the clearing time 60 seconds further into the future, so the count never restarts — it just climbs all shift until it crosses 90, and then that person is blocked. And because the portal quietly checks for new messages every 45 seconds on its own (`frontend/view-inbox.js:76`, `IB_POLL_MS = 45000`), the count keeps climbing even when nobody touches anything — and every blocked retry pushes the clock forward again, so the block renews itself forever.

**How fast.** Doing nothing at all: 91 automatic checks at ~48 seconds apart ≈ **72 minutes**. Actually using the portal: opening a screen costs between 4 and 11 extra requests (measured by counting the `api(` calls per screen file), so six screens is roughly 50 more — **lockout in about 30 minutes**. *The active-use figure is an estimate; the idle figure is arithmetic.*

**Why it matters.** The person sees nothing. The error is swallowed silently by the message poller (`view-inbox.js:223`), and every other screen just says "That did not go through." Reloading does not help. On day one of the pilot, all thirteen staff will conclude the portal is broken within the first hour. Adoption dies before the portal is used once for real work.

**The fix.** One line — put the current minute into the counter's name so it genuinely resets each minute, and drop the ceiling from 90 to something like 30, which is still far above what any screen generates. **Claude · 30 minutes, plus an hour of testing with two browsers left open.**

---

### 2. Sign-in expires after exactly one hour and is never renewed — and anything typed is lost
**Files: `index.html:249`, `apps-script/Router.gs:92`.**

**What it is.** Google's sign-in pass lasts one hour. The portal takes it once at sign-in (`STATE.idToken = resp.credential`) and never asks for a fresh one — I searched the whole frontend and there is no renewal anywhere. At the 60-minute mark every button stops working. Nothing sends the person back to the login screen; the app just sits there looking normal.

**And there is no safety net underneath it.** There is no browser storage used anywhere in the portal — zero uses of `localStorage` across all sixteen frontend files. Everything typed lives only in the page's memory. The only way back in is to reload, which destroys it. The worst version: an Order Processor types Cost and a 16-digit AliExpress number for eight orders across an afternoon, hits save on the ninth, gets "Not saved: request failed", reloads — and all eight are gone.

**There is a knock-on that hits everyone else too.** Each failed request writes **two** rows into the activity log (`Router.gs:108` then `Router.gs:77`), and each row takes a lock that covers the *whole portal* (`Setup.gs:182–186`). A stranded browser polls 75 times an hour, so that is 150 lock grabs per hour of pure noise, per stranded person. Every genuine save — a task, a message, a 2-hourly report — queues behind them.

**The fix.** Three parts: silently mint a fresh pass at about the 50-minute mark (the code to read the expiry time already exists at `index.html:256`); on any sign-in failure show a visible "your sign-in expired, please sign in again" strip instead of retrying into the void; and save what people have typed into the browser so a reload restores it. Also wrap the logging call in a try/catch so logging can never take a request down. **Claude · about 1 day.**

---

### 3. Approve the staff and set their shifts — nothing about accountability works until you do
**Files: `apps-script/Setup.gs:48`, `apps-script/Reports.gs:258`.**

**What it is.** Setup seeds all eleven staff rows with status `pending` and a blank shift. The report screen reads a person's shift to know when their checkpoints are; with no shift there are no checkpoints, and the screen correctly says "Nothing to submit until Management sets your timetable." The rota, the reports grid and the missed-checkpoint flag all hang off the same thing.

**Second half of the same job.** Every seeded row also has `accounts_access` set to the placeholder `per-role`, and all three account-scoping checks in the code treat that as *"not scoped yet — allow everything"* (`CpcResearch.gs:377`, `Orders.gs:340`, `CustomerService.gs:224`). So today every approved person can see every seller account's orders, cases and competitor research. That may well be what you want for a 13-person team — but you should know it is the current state rather than assume people are limited to their own accounts.

**The fix.** You, in the portal: approve eleven people, set each shift, and set each person's accounts. **Hasib · about 20 minutes.** No code needed.

---

### 4. The background jobs have never run, and the instructions name a function that doesn't exist
**File: `docs/HASIB-STEPS.md:55`.**

**What it is.** The guide says: *"pick **installTriggers** from the function dropdown and press Run."* I searched every file in the project. There is no function called `installTriggers`. You would get "Script function not found", reasonably conclude it was broken, and stop — which is what happened.

**What is off as a result.** The one that matters most is `flagMissedCheckpoints` (`Reports.gs:204`). Without it, a 2-hourly report that is never filed leaves a **blank** in the management grid rather than a *missed* mark — indistinguishable from "not due yet". The single mechanism you are buying this portal for is quietly not running. Also off: the nudge when a submitted task sits un-approved (`Tasks.gs`), and the daily recheck-row generator (`Recheck.gs:552`).

**One thing to fix at the same time.** When `flagMissedCheckpoints` *is* switched on, it holds the portal-wide write lock across its entire sweep with individual writes inside a triple-nested loop (`Reports.gs:207`–`236`). Worst case is 13 people × 2 days × 4 checkpoints = 104 separate writes inside one lock. At an estimated half-second each *(estimate — I have not timed it)* that is a roughly 50-second freeze on every save in the portal, every time it runs. It should collect the rows first and write them in one go.

**The fix.** Rewrite that step of the guide with the real click-path, and restructure the sweep. **Claude · 3 hours. Then Hasib · 15 minutes to register them and confirm one *missed* mark appears.**

---

### 5. One write path skips the rehearsal-mode safety catch
**File: `apps-script/RulesAck.gs`, lines 321 and 347–348.**

**What it is.** The portal is currently in shadow mode — the setting `pipeline_write_external` is `false` (`Config.gs:68`), meaning it writes to nothing real and instead logs what it *would* have written so you can inspect it first. Every module honours this because they all go through one door that checks the flag (`SheetBridge.gs:355` and `:394`).

One function does not. `rulesPpcAppend_` opens the live PPC Central workbook directly and writes two cells. I checked: it does not call the flag check, and because it never goes through the common door it also skips the column whitelist and the guard that refuses to write a formula into a cell. It is triggered whenever Management, Ops Head or an enabled Team Lead publishes an instruction to the Advertising department (`RulesAck.gs:167`, `:182`). It will succeed — the target tab's headings match.

**Why it matters.** The rehearsal gate is the single control standing between an unfinished portal and years of real working files. One person publishing one instruction puts a row into a live workbook while everyone believes nothing is being written.

**The fix.** Route it through the common door like every other write. As a stopgap **today**, one line at the top of that function that returns "shadow mode" when the flag is off. **Claude · 5 minutes for the stopgap, 2 hours for the proper fix.**

---

### 6. Nothing is backed up, and one line can silently replace the database with a blank one
**Files: `apps-script/Setup.gs:148–157` and `:185`.**

**What it is.** There is no backup code anywhere in the project — I searched for every likely spelling. Backups are a Phase 7 item and the build is at Phase 5, so this is a schedule gap rather than a mistake. But your staff will be writing real tasks, reports, messages, hunting rows and wrong-order accountability into the portal's own database from the day the pilot starts, and some of it exists nowhere else. The clearest case: your live Wrong Order tabs have no "Processed By" column at all on any of the thirteen historical daily tabs, so who made each order mistake is recorded in the portal and nowhere else.

**The sharper half.** `getPortalDb_` has a "if the database is missing, make a new one" behaviour, and the only place it is used at runtime is inside the logging function — which runs on **every error**. If the database is ever trashed, renamed, or briefly unreachable, the logger will create a brand-new empty spreadsheet and overwrite the stored ID of the real one. From then on the portal points at an empty file and the way back has just been erased.

**The fix.** Change that one call so logging can never create anything (a one-word change), and add a nightly job that copies the database into a dated folder only you can read, keeping 30 days — then actually restore one copy once, so the backup is a proven control rather than a belief. **Claude · 4 hours, plus 1 hour to prove a restore.**

---

### 7. Every refusal the portal gives reads "request failed"
**File: `apps-script/Router.gs:78`.**

**What it is.** The backend contains **335** written, specific, human explanations for saying no (I counted them across the 20 files). One line at the top rewrites every single one into the words "request failed" before it reaches the browser. So the person sees "Not saved: request failed" whether the real reason was *"you already filed the 6:30 PM report today"*, *"that checkpoint's window has closed"*, or *"missing count: listings done"*.

There is also no offline detection and no timeout on any request, so when the WiFi drops in Lahore the message becomes the raw browser text "Not saved: Failed to fetch".

**Why it matters more than it sounds.** Someone told *why* fixes it and carries on. Someone told "request failed" tries twice and then does the work in the spreadsheet instead — and now the sheet and the portal disagree, which is the exact problem the portal exists to end.

**The fix.** Keep the generic message for anything security-shaped, but add a deliberate "safe to show" error type that passes the real sentence through while still logging the details. Convert the ~30 messages staff will actually hit first. Add a 30-second timeout and an offline banner. **Claude · 4–6 hours.**

---

### 8. The Listing Tool renders a dead page inside the portal
**File: `embeds/M98M-Listing-Tool-index.html:861`.**

**What it is.** The Tools screen opens each tool inside a sealed frame. That seal is correct and well-reasoned — the code comment explaining it at `view-tools.js:266–280` is accurate. But a sealed frame has no browser storage, and in Chrome *touching* storage from inside the seal throws an error rather than politely returning nothing.

The Listing Tool is one single block of code from line 748 to line 4632. At line 861, inside a function that runs the instant the page loads, it touches storage with no protection around it. I checked the earlier one at line 776 — that one *is* protected. Line 861 is not. So the error fires, the entire block from 748 to 4632 never loads, and the tool paints its shell and then does nothing when clicked. The other three tools (CS Reply Agent, eBay Defense Agent, AliExpress Recovery Agent) protect all their storage access and will run fine.

**Why it matters.** Your Listing SOP mandates that descriptions are produced only with the M98M Listing Tool. The Item Listers will click Open, see a tool that does nothing, and go straight back to the standalone copy — and once a lister is outside the portal for their main job all day, they will not come back into it to file a checkpoint report either.

**One related thing.** That file still contains `var OPEN_MODE=true` at line 3881 — "link = access", no login. Your own red line RL-8 says no embedded tool ships in OPEN_MODE. The registration code notices it and writes a log line about it (`Embeds.gs:248`) but registers it anyway. Make it refuse.

**The fix.** Same-day: protect the six unguarded storage lines and drop in a small stand-in for storage so the tool works for the length of one session, with an honest banner that saved galleries and drafts are not available in this window. Proper: give the frame a message channel to a store held in the Portal DB, so a lister's library follows them to any machine — genuinely better than today. **Claude · 3 hours for the patch, 1–2 days for the proper version.**

---

### 9. A report can be filed hours early and counts as on time; a report five minutes late cannot be filed at all
**Files: `frontend/view-reports.js:200–205`, `apps-script/Reports.gs:85` and `:110`.**

**What it is.** Two opposite problems in the same screen.

*Early is free.* When no checkpoint is due, the screen falls through to the next **upcoming** one and shows a working Submit button under a header reading e.g. "6:30 PM · in 2h 15m". The backend has no lower bound at all: `flag = (now <= checkpoint time + threshold) ? 'ontime' : 'late'`. So at 4:20 PM a lister can file the 6:15, 8:30, 10:30 and 11:15 PM reports back to back in five minutes and get four green ticks. The 11:15 one is the Daily Productivity Report with the "what value did you add today" question — answered at 4:20 PM about a day that has not happened.

*Late is impossible.* Once the next checkpoint arrives, the previous one throws "checkpoint window closed" forever. There is no "file late with a reason" path anywhere. So the honest person who was stuck on a buyer call for two hours gets a permanent red mark, no way to explain it, and (because of finding 7) a message telling them to try again — which will never work.

*And the last report of the day is due at the exact minute the shift ends* — checkpoints for Shift 1 are `16:15,18:30,20:30,23:15` and Shift 1 runs `14:15-23:15` (`Config.gs:54`, `:56`).

**The fix.** Don't show the form for a checkpoint that isn't open yet; if early filing is wanted, mark it `early` with its own colour rather than making it look identical to on-time; allow late filing with a required one-line reason, still flagged late. Move the final checkpoint 30 minutes before shift end — that is a settings change, not code. **Claude · 4–6 hours. Hasib · one decision on the final checkpoint time.**

---

### 10. Strangers can burn your Google allowance and flood your audit log without an account
**File: `apps-script/Router.gs`, lines 58–63.**

**What it is.** The backend address is printed in the published page, so it is public knowledge, and it has to accept anonymous requests for sign-in to work. The problem is the order things happen in: the portal checks *who you are* by calling Google — an outbound call that is capped per day — and only *after* that does it start counting your requests. So someone with no account is never counted and never slowed down, and each of their forged requests costs you one of your daily outbound calls. Requests with a made-up action name are cheaper still for them: those are logged at line 58 *before any check runs at all*, one locked write to your activity log each.

**Size, honestly.** Google publishes a limit of 20,000 outbound calls per day for a free Gmail account. *(I want to correct something two of the reviews told you: they claimed a "90 minutes of script runtime per day" cap. That figure is the limit on scheduled background jobs, not on portal use. Do not plan around it.)* Your legitimate traffic already uses a meaningful share of the 20,000 because every single request re-asks Google to verify the same pass — a question whose answer cannot change for an hour.

**The fix, which is also a speed-up.** Remember the result of each sign-in check for five minutes instead of re-asking Google every time. This cuts your outbound calls by roughly 85%, makes every screen noticeably faster for the team in Lahore, and leaves your ability to cut someone off intact (the user's row is still read fresh on every request). Then add a cheap cap before the identity check so anonymous traffic is limited, and count rejected junk instead of writing a log row for each. **Claude · 4 hours.**

---

## Worth doing when there is time

Ranked, briefly.

1. **Put yesterday's ad waste in front of Zain every morning.** Your Sales Analysis workbooks already compute it: Saif Bhai's July total is **£834.83 excluding VAT (£1,001.80 with VAT)**, against £4,045.44 of total ad spend and £1,383.12 of reported profit for the month; August is running at the same rate. Today that number only appears itemised in a month-end report nobody reads at the time it would be useful. The portal already reads these files. *One honest caveat the original review missed:* the sheets define waste as fees on listings that sold **nothing that day** — some of that is normal for pay-per-click, where a click today can sell tomorrow. Treat it as a shortlist to look at, not proven loss. **~2 days.**

2. **Show "profit after ads" next to profit.** Every listing's Profit is a live formula `=ROUND(0.8*(Order Earning − AliExpress Cost),2)` and it never subtracts advertising — while **141 of 151** listings on ABRT's Main Sheet carry a paid campaign. Measured ad spend is £2.14–£2.25 per order. So a hunter approving an item at the £4 net gate on the portal's calculator is really approving something closer to £1.50–£2. Show both numbers side by side; never overwrite the sheet's own. **~3 days.**

3. **Ask one question about column P on the Sales Analysis daily tabs.** Working through the formulas: `Raw Profit = R − S`, where `R = H − I − N` and `S = C − G − J − M − Q`. Priority ad fees (column N) are correctly subtracted. General ad fees (column P) appear in the whole chain **only** as `Q = P × 0.2`, and because Q is subtracted inside S which is then subtracted from R, general fees end up *increasing* raw profit by 20% of themselves instead of reducing it. Yet the Dashboard tile treats the same money as spent — `All Ads incl VAT = Σ Priority + 1.2 × Σ General`. Both cannot be right. Saif Bhai's July general fees were £404.92 against £1,383.12 of reported profit. **This is an inference, not a measurement — the arithmetic is certain, the intention behind column P is not.** One hour of someone's time to answer. Separately and definitely: that £1,383.12 does not reconcile with its own Monthly Sheet, which sums to £1,369.88.

4. **Build the management overview.** This is Phase 6 in the plan and it is not built yet — no screen in the portal shows profit, sales or alerts. It is the fourth thing you asked for and the biggest remaining piece of work. Do it after items 1 and 2 so it has the two numbers that matter on it. Worth knowing: Hafiza Sadia's Daily Account Report has already written the verdict in plain English in a tab nobody opens — "£2.25/order, over the £2.00 ceiling: run the kill list" — with 48 alerts sitting at ACTIVE.

5. **Make retries safe.** The backend has proper "don't do this twice" protection (`Router.gs:71`, `:74`) but the browser never sends the key that switches it on, so it is dead code. Three of your riskiest writes already have their own real duplicate checks — reports, listing Item IDs, and CS cases — so this is narrower than it sounds, but a dropped connection on a wrong-order log can still write the row twice. **~3 hours.**

6. **Add a search box to Today's Orders.** Real day tabs run to 44–57 rows and the month total is 326 as of 8 August. The screen has no search, no filter, no sort — a processor looking for one order number scrolls past every card. The spreadsheet has Ctrl+F; the portal does not, and that is a reason to go back to the spreadsheet. Also: remember the last account picked, and make Enter save. **~4–6 hours.**

7. **Tell people a report is due before they have missed it.** The countdown exists only on the reports screen — the one screen you would only visit if you had already remembered. Put "Next report: 6:30 PM · in 12m" in the top bar and make the sidebar badge live from sign-in. **~3–4 hours.**

8. **Fix four labels that say "newest" when they mean "oldest".** When a tab is longer than the portal reads, it reads from the top — so a truncated read is the *oldest* rows. The backend says so honestly (`CustomerService.gs:470`) and even sends a flag saying so, which the frontend never reads. Two Customer Service labels and two Advertising labels say the opposite. Low urgency: the Advertising screen has a "Load the full tab" button, and the CS limits (1,000 and 500) are years away against 26–52 real rows. **~1 hour.**

9. **Close the offboarding loophole.** There is no way to remove someone from inside the portal — the only method is typing `disabled` into the USERS sheet by hand. And a person you have disabled can sign in, re-register, and flip their own row back to `pending` (`Auth.gs:79`), appearing in your approval list worded identically to a genuine new hire, with a role of their own choosing. The approval list doesn't show that they were ever removed. **~2 hours.**

10. **Stop staff-typed text from becoming a live formula in the Portal DB.** Google Sheets treats text starting with `=` as a formula. The portal already knows this and formats cells as plain text in three places (`Messaging.gs:55`, `Reports.gs:326`, `Meetings.gs:42`), but not in the idea box, the task title, or the activity log. Your *business* sheets are properly protected — this is only the portal's own database. Adding the guard inside the logging function covers most of it in one place. **~3 hours.**

11. **One 30-minute tidy on what is public.** Your published page carries staff first names (Zain 21 times, Hamza 5, plus Wahab, Noman, Irfan, Fasieh) — replace them with role words, which reads better anyway. The script written to catch exactly this reports CLEAN because it only looks for the `m98m…@gmail` addresses, not names. And `HASIB-STEPS.md:87` and the README both say the public repo should contain "index.html, assets, **embeds**". It currently does not — I checked, the live public repo has only the page and images — but if that instruction is ever followed, your CS playbooks, eBay appeal scripts and the Listing Tool go public. Correct the instruction and put `embeds/` in the ignore list.

12. **Settle the recheck offsets with Wahab and Zeeshan.** The portal is honest about this — it prints both the number your CONFIG holds and the number the row on the sheet actually carries, and flags the disagreement. But nobody has decided which is right, and CHINA agrees (4 = 4) while the three UK stages disagree on every row. It becomes a real problem on **1 January 2027**, when the UK First Check tab runs out of pre-filled rows (it is filled to 2026-12-31) and the portal starts writing reference dates using the CONFIG arithmetic — 2 days back — into a tab whose 208 existing rows are all 6 days back. Fifteen minutes of conversation, then one settings change. **Hasib · 15 minutes.**

13. **Small things, grouped.** On a phone the sidebar is 13 unlabelled icons with no tooltips. The browser Back button exits the portal entirely. The logo is a 640×640 PNG (166 KB) shown at 120 and 40 pixels — resizing it removes about a third of the page's weight for fifteen minutes of work. The wrong-order form redraws under your fingers while the pickers load, kicking a fast typist out of the field. **~4 hours for all of it.**

---

## Deliberately not recommended

These are things an audit would normally push, and I do not think they are worth your attention. This section is here so you know what I cut and why.

- **Chasing the four different money-rounding routines.** One review made a lot of this, so I tested it myself: I ran all 10,000 exact half-penny values from £0.005 to £100.00 through each one. The result is exactly as claimed — the fee engine's rounding (`Brain.gs:641`) is **perfect, 0 errors out of 10,000**, and the other three lose a penny on 557 and 572 cases. But those three are not the fee engine; they tidy up numbers a person typed in. It costs you a penny only when someone types a cost with three decimal places. Tidy it up whenever someone is next in that code, for consistency's sake. Do not schedule it.

- **Filling in the vehicle-parts fee cell as a five-minute money fix.** One review said typing the vehicle category ID into the `⚙ Config` placeholder would stop vehicle listings being under-priced by £0.67 on a £19.99 sale. The arithmetic is right but the fix would do nothing: the eBay Category (FVF %) column on the Main Sheet is **empty on all 151 rows**, so no listing has a category to look up in the first place — everything falls through to the default rate regardless. Doing this properly means tagging listings with categories, which is a real project, not five minutes.

- **Rebuilding the deployment process, adding clasp, adding automated tests.** Real advice, generic advice. Everything above is worth more per hour. The one piece worth taking from it costs an hour: print the build date in the portal's footer so you can see at a glance whether the page and the backend match.

- **Adding email alerting.** It needs a Google permission the project deliberately does not request, and adding it forces a re-consent that blocks **every** function in the portal until you click through it (the reasoning is written out at `Setup.gs:107–115` and it is sound). Put a health panel on your own home screen instead.

- **Splitting the database or archiving the activity log.** On estimated volumes the portal's database would hit Google's cell ceiling in roughly two years. That is a real horizon, but everything in "fix first" is a this-week problem.

- **Worrying about the competitor list being readable by everyone, or the profit-stripping trap.** Both were raised. The competitor list is genuinely open to any approved user — but it is not profit and not customer data, and the real cause is item 3 above (nobody is scoped yet). And there is a latent trap where the profit stripper matches column names exactly while one of your live headings is `Profit ` with a trailing space — but I traced every path and there is **no way today** for a restricted role to reach a sheet carrying that column. Worth fixing before the next module is built; not worth fixing now.

- **Buying a Google Workspace seat for more capacity.** Suggested at about £5/month. Do the five-minute caching change in item 10 first — it is free and buys more headroom than the upgrade would.

---

## What I checked and found solid

So you know what you do not need to worry about. I tried to break each of these and could not.

- **The part that touches your real workbooks.** `SheetBridge.gs` is the one door for eight of the nine modules that write to a live file. It addresses every column by your actual heading — trailing spaces, typos and all. When two headings would collide after tidying (`Order number` vs `Order Number`, or your three `Edit Date ` columns), it **refuses and throws** rather than guessing. It rejects any value starting with `=`. It rejects any column outside that workflow's approved list. It takes a lock and re-finds the row *inside* the lock, so a row inserted between reading and writing cannot cause a mis-write. This was the thing most likely to damage real data, and it is right.

- **The fee maths.** The Brain v17 engine reproduces your £19.99 → £17.15 anchor exactly, keeps full precision until the very end, and correctly declines to apply the sheet's own 0.8 haircut (that lives in the cell, not the fee engine). Rounding verified across 10,000 values with zero errors.

- **Who can see profit and customer addresses.** I could not construct a path by which an Item Lister obtains a profit figure or a buyer's address. The two modules holding that data don't strip fields afterwards — they never build them — and then check on the way out using tidied-up name matching that survives your headings' trailing spaces.

- **The sealed frame for the embedded tools.** The exact pair of permissions granted is the correct one, and the reasoning comment is accurate rather than decorative. The tool files themselves are held privately in Drive and handed over only after sign-in; they are not on the public site.

- **Escaping.** All 26 screens escape text consistently, including inside HTML attributes, which most codebases get wrong. Links and images are restricted to http/https.

- **Nothing sensitive in the published page.** No spreadsheet IDs, no emails, no keys — I checked the built file. Staff first names are there (item 11), and that is the only thing.

- **Duplicate protection where it matters most.** 2-hourly reports refuse a second submission for the same person, day and checkpoint. Listing refuses a conflicting Item ID. Customer Service refuses a second case on the same order, issue and product.

- **Overnight Shift 2.** Checkpoints that cross midnight are correctly anchored to the day the shift started. I expected this to be broken and it is not.

- **The recheck honesty.** Every recheck row reports both the number your settings hold and the number the sheet's own cells carry, and says plainly when they disagree instead of quietly picking one.

---

## Suggested order

| When | What | Who |
|---|---|---|
| Today, 5 minutes | The one-line stopgap on the shadow-mode hole (item 5) | Claude |
| This week, ~2 days | Items 1, 2, 6, 10 — the lockouts, the database safety, the quota | Claude |
| This week, 35 minutes | Item 3 (approve staff, set shifts, set accounts) + item 4 (register the triggers) | Hasib |
| Next, ~2 days | Items 7, 8, 9 — real error messages, the Listing Tool, the report windows | Claude |
| Then | The money work: ad waste, profit after ads, the column-P question, the management screen | Both |

The first two rows are the difference between a portal that survives its first shift and one that does not. Everything after that is improvement; those are survival.
