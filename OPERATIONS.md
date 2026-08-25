# M98M Portal — Operations Handbook

*Last updated: 20 Aug 2026. For Management and Ops Head. The portal: https://m98m786.github.io/M98M-Portal/*

---

## 1. The profit law (what every number means)

Every profit figure on every screen follows the central sheet's VAT law:

- **Order earning (OE)** = sale price − eBay's real fees (from the Finances API; general-campaign ad fees are already inside these fees).
- **Raw profit** = `0.8 × (OE − AliExpress cost)` − CPC ad fees (ex VAT). The 0.8 nets VAT: 20% owed on the selling price, less the 20% reclaimed on the cost.
- **Actual profit** = Raw − returns.
- **Daily books (T)** = `0.8 × (OE − cost)` per account per day; ads sit in their own column and are deducted at period level, exactly like the sheet.
- **"All Ads incl VAT"** on the overview = (general + CPC) × 1.2.

If two screens disagree by a small margin on a recent day, it is fee-completeness: orders whose real eBay fees have not landed yet contribute through an honest fallback until they do. Closed days match to the penny.

## 2. Deploys (how changes ship)

- **Frontend + engine staging**: `python3 scripts/build.py` then `git push origin main`. GitHub Pages serves the repo **root**; the built `index.html`, `version.txt`, and `engine-worker.txt` are written there by the build. The source shell lives in `src/shell.html` — never serve it directly.
- **Engine (Cloudflare Worker)**: deployed from a dash.cloudflare.com session via the API (no token needed). Always assert the new code contains a new symbol before AND after the PUT; bindings must be re-declared (ALLOWED_ORIGIN, AS_URL, DB, HOT) with `keep_bindings: ["secret_text"]` so the five secrets survive. Edge propagation takes ~1 minute — a call right after a deploy may still answer from the old build.
- **Apps Script (/exec)**: splice via the editor, deploy a **new version** from the Deploy dialog, and require the banner to name a new version number. Triggers always run HEAD.
- **Staff screens update themselves**: every portal tab checks `version.txt` every 4 minutes and reloads once when a new build ships. No announcement needed.

## 3. The Engine ops panel (Account health → Engine ops)

Twelve buttons, each running the same job the clock runs. Safe to press; a lease stops a press racing a real cron tick.

| Button | Use when |
|---|---|
| Re-roll books · 8 / 45 days | after any data repair, or a day's profit looks wrong |
| Pull latest orders / Refresh order statuses | an order is missing or a status looks stale |
| Pull today's ad spend | the intraday ads number looks behind |
| Request eBay ad reports | an ads day shows "—" on a closed day |
| Pull traffic report / cases & returns / listings | the respective screen looks stale |
| Validation + letters | run the full battery now instead of waiting for 2 AM |
| Heal missed nightly jobs | after any suspected missed cron window |
| Backup now | before risky manual changes |

## 4. The validation battery (the portal checks itself)

Runs nightly at 2 AM UK; every failure lands as a letter in the Alerts centre. Sixteen checks, including:

- **Books match orders** (revenue reconciliation, per closed day)
- **Books carry the 0.8 law** (a regression to pre-VAT books would overstate profit 25% — this catches it in a day)
- **No sync job stuck failing** (any job erroring with no success for 6h)
- **Every account feed is alive** (an account that sold this week but is 18h quiet = dead token or sales collapse)
- **Intraday ads agree with eBay's official report** (arms at each midnight rollover)
- Fee sanity, duplicates, ad-book presence, future-dated rows, zero-priced listings, intraday day-purity

An hourly **catch-up sentinel** re-runs any nightly job that goes stale >26h, so a missed cron window heals itself.

## 5. Letters (Alerts centre) — what they mean

- **Validation failed** — a battery check failed; the detail names the day and numbers. If you repair data, re-run "Validation + letters" and the letter can be resolved with a note.
- **Campaign changed / Ad waste** — advertising signals; owned by the Advertising Manager (also copied to management).
- **Supplier link missing / Price revision needed** — operational to-dos for the named staff.
- **eBay case / Return / INR** — customer service, with respond-by dates.

Resolve letters only after acting on them; "resolve all of this type" exists for floods.

## 6. Known operational facts

- eBay **ad report kicks** are capped at 4 catch-up requests per account per run and the account order rotates hourly (a fixed order once starved the last account for 29 hours). A week-deep hole heals in 2–3 runs on its own.
- **CS service metrics and seller standards** refresh in the *nightly standards job*, not the CS sync. If a metrics fetch is refused, the reason is recorded in sync_state under `csMetricsSkip` (403 = a consent would fix it; 404 = eBay has no evaluation for that account).
- **All five accounts** currently hold working tokens for every scope the portal uses: orders, finances, marketing reports, traffic, standards, CS metrics, post-order. No consents are outstanding.
- **Sessions** last 7 days and survive reloads and new tabs. Signing out ends the session server-side.
- The engine's D1 is backed up nightly to Drive; the Portal DB sheet is the staff-facing mirror.

## 6b. Backups (R5 — "at any day portal dies, we need backup data")

Three independent layers, none sharing a failure mode:

1. **Google backup sheets, nightly** — four spreadsheets in the owner's Drive (*M98M Backup — Money & Marketing / Orders & Tracking / Listings & Sourcing / People, Feedback & System*). The Apps Script night trigger PULLS every Engine table page by page (`backupDump`, key-authed) and rewrites the tabs, then stamps the Engine (`backupStamp` → KV `backup:last` + a `sheetBackup` sync_state row). A failed night letters Management by itself, and the validation battery's check 4e rings if no stamp lands within 26 h. The dump whitelist is **credential-free**: sessions never leave, engine_config never leaves, the accounts table gives up names only.
2. **Drive copy of the Portal DB, nightly** — the long-standing `nightlyBackup` file copy (30-day retention), untouched.
3. **Local copies on the office Mac** — the Night Watch session exports the four backup sheets as .xlsx into `Documents/Claude Code/M98M-Backups/<date>/` each night it runs, pruning after 21 days.

4. **The product hunting backup workbook** — *Product Hunting Backup Sheet*, three trays (**Pending For Approval · Approved · No Approved**) carrying the same 41 columns as `HUNTING_DB`. This one is different from the three above: it is not a nightly snapshot but a **live mirror**. A product is written into it the moment it is submitted, approved, not approved or sent back for revision (`huntBackupUpsert_`, from the three hunting handlers), and `huntBackupSync` re-reads the whole hunting database **every 5 minutes** and repairs anything that drifted — an Approval Status edited straight in a sheet, a row somebody dragged, a write that never landed. It fingerprints the database first, so a quiet sweep costs one read and never opens the workbook.

   Three rules worth knowing before you touch it:
   - **Nothing is ever deleted.** A product that disappears from `HUNTING_DB` keeps its row at the bottom of the tray it was last in.
   - **An empty read is refused, not mirrored.** A Google fault cannot blank the file.
   - **Do not rename the three tabs** — the portal finds them by name. The *Backup Status* tab shows when the last real change was mirrored; that stamp moves only when something actually changed, so a quiet day is not a broken backup.

   It is itself a single Drive file, so `huntBackupDailyCopy_` drops a dated duplicate into the same owner-only *M98M Portal Backups* folder on the same 30-day prune. Reviewers reach the workbook from **Hunt approvals → Backup sheet**; hunters deliberately get no link, because it holds every hunter's rows and their profit figures (§4.2).

Apps Script has **no triggers of its own** for any of this (house rule: no ScriptApp scope). The hourly work rides `runMissedCheckpointSweep`, the nightly work rides `nightlyBackup`, the 5-minute work rides `runLossEscalationSweep` — same pattern as every other sweep.

## 6c. Order processing & sourcing (R5)

- **Ali order numbers**: processors record them in the day tab (or the portal's order card — both write both stores). The hourly `aliSweep` reads the last 7 days of day tabs per account and pours `Order Number` + `New Ali Link` into the Engine's orders, so **All orders → Needs processing** is live truth: NOT_STARTED + no Ali order + no tracking. One tap on the 📋 button copies the Ali number for tracking pulls.
- **processWatch (hourly)**: any order past **1 UK business day** unprocessed → letters Order Processors + Ops Head (tier ladder re-rings as the pile grows). It stays silent until the sweep has landed data at least once, so it can never cry wolf about a feed that hasn't run.
- **Sourcing links** (screen): supplier 1/2/3 per ACTIVE listing — the Main Sheet's columns merged with portal-saved overrides (portal wins; a sheet push can never erase a portal entry). The **Missing tab is the Order Processors' task queue**, sorted by 30-day sales; the 09:00 UK digest letters the count + top sellers daily until it is empty. Links saved in the portal are **not** written back to the Main Sheet yet — that write-back is a pending decision.

## 6d. Typing is safe (R5 emergency fix)

Everything anyone types into any portal field is **auto-saved as they type** and poured back into the form after any reload, update, or accidental navigation — a toast says "Restored N unsaved fields". A finished submit clears its own drafts. Portal updates **never reload a tab while someone typed in the last 10 minutes**; the update waits for a pause and says so. Half-typed work cannot be eaten again.

## 7. If something looks wrong

1. Open **Account health** — sync problems surface there first; run **Validation** for a full answer in one press.
2. Check the **Alerts centre** for letters — the battery almost certainly already filed one.
3. Use the matching **ops button** (pull orders / request reports / re-roll books) rather than editing data by hand.
4. A screen showing obviously old data: the tab self-updates within 4 minutes of a deploy; a manual reload never hurts.
