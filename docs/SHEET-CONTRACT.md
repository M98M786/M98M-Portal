# Google Sheet contract — what the portal actually reads and writes

**Generated 25 Aug 2026 by reading the portal source, then adversarially re-checked by a second pass.**
Every header below is copied **verbatim** from the code, including the deliberate misspellings and
trailing spaces your sheets already use. Reproduce them exactly — the portal matches on these strings.

> Rebuilding a sheet? Keep these headers identical and the portal connects with no code change.

---

## 1. Order Processing workbook

*One per account. Day tabs are where processors work.*

### Tab names

- CONFIRMED — '<day> <MonthName>', day NOT zero-padded, full English month name (e.g. '1 July', '8 August'). Orders.gs:179 const out = [p.d + ' ' + month]; month from ORDERS_MONTH_NAMES, Orders.gs:33-34 (verbatim: 'January','February','March','April','May','June','July','August','September','October',
- CONFIRMED — '<day-1>-<day> <MonthName>' (e.g. '24-25 August'). Orders.gs:180 if (p.d > 1) out.push((p.d - 1) + '-' + p.d + ' ' + month); Only when p.d > 1.
- CONFIRMED — '<day>-<day+1> <MonthName>' (e.g. '25-26 August'). Orders.gs:181 if (p.d < ordersMonthDays_(p.y, p.m)) out.push(p.d + '-' + (p.d + 1) + ' ' + month); Only when the day is not the month's last (ordersMonthDays_, Orders.gs:161). Live combined tabs named verbatim: '5-6 JULY' and '12-13 July
- CORRECTED — a combined tab is offered as a candidate for BOTH of its days, so the claim's 'this date is the SECOND day' / 'this date is the FIRST day' is a property of the CONSUMER, not the generator. ordersComputeDashboard_ dedupes with seenTabs (Orders.gs:746 if (seenTabs[read.tab]) continue; // a
- CONFIRMED — matching is NORMALIZED, not literal. SheetBridge.gs:37 return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); applied to tab names by ordersTabIsCandidate_ (Orders.gs:188-195). So '5-6 JULY' == '5 6 july' == '5 / 6 July' == '5-6 July ' all match candidate '5-6 July'.
- CORRECTED (missed non-match) — the claim's list of non-matching spellings is right ('25th August','August 25','25 Aug','25.8' all fail) but INCOMPLETE: a ZERO-PADDED tab also fails. Candidates are built from a Number (Orders.gs:179), so '01 July' normalizes to '01 july' and never equals candidate '1

### Columns

| Header (exact) | Portal | Purpose |
|---|---|---|
| `Order number` | READ ONLY — never a write target; it i | eBay's order number, live column B, lowercase 'n'. ORDERS_ROW_FIELDS entry Orders.gs:61 { key: 'Order number', exact: ['Order number'], ordinal: 0 },  |
| `Order Number` | READ + WRITE | AliExpress order number, live column M, capital 'N'. Orders.gs:71 { key: 'Order Number', exact: ['Order Number'], ordinal: 1 }, On the write whitelist |
| `Cost` | READ + WRITE | Live column L, a float in every live tab. Orders.gs:70 { key: 'Cost', exact: ['Cost ', 'Cost'] }, — note the TRAILING-SPACE variant is first. Whitelis |
| `Tracking number` | READ + WRITE | Whitelisted Orders.gs:46 / Engine.gs:81. Written by actionRecordTracking_ (Orders.gs:514) and by the Worker's eBay tracking push (engine/worker.js:484 |
| `Email` | READ + WRITE (PII-gated on read) | CORRECTION TO ANY 'buyer email' READING: live column O is the PURCHASING ACCOUNT, not an email address — Orders.gs:661-662 names the real values 'mrha |
| `Delivery Status` | READ + WRITE | Live column P. Orders.gs:74. Whitelisted Orders.gs:46 / Engine.gs:81. Value must be one of ORDERS_DELIVERY_STATUS verbatim (Orders.gs:92-93): 'Pending |
| `New Ali Link` | READ + WRITE — but NOT present on ever | Orders.gs:67 { key: 'New Ali Link', exact: ['New Ali Link'] }, Whitelisted Orders.gs:46 / Engine.gs:81. Written at Orders.gs:498 (must be http/https,  |
| `Ali Express Link` | READ ONLY | Orders.gs:66 { key: 'Ali Express Link', exact: ['Ali Express Link ', 'Ali Express Link'] }, — trailing-space variant first. In the header hints (Order |
| `Image Link` | READ ONLY | Orders.gs:60 { key: 'Image Link', exact: ['Image Link ', 'Image Link'] }, — trailing-space variant first. Not in the write whitelist. Distinct from 'M |
| `Item title` | READ ONLY | Orders.gs:62. Header hint Orders.gs:49. Surfaced (truncated to 200 chars) on the dispatch due-list as 'Item' at Orders.gs:777. |
| `Sold for` | READ ONLY | Orders.gs:63. Header hint Orders.gs:49. |
| `Full Address` | READ ONLY, PII-gated | Live column E. Orders.gs:64 { key: 'Full Address', exact: ['Full Address'], pii: true }, Listed in PII_FIELDS (Auth.gs:9). On 7 tabs it holds literal  |
| `Order Earning` | READ ONLY, profit-gated | Orders.gs:65 { key: 'Order Earning', exact: ['Order Earning'], profit: true }, Header hint Orders.gs:49. Listed in PROFIT_FIELDS (Auth.gs:7). Processo |
| `Quantity` | READ ONLY | Orders.gs:68. Header hint Orders.gs:50. One of the two always-emitted TOTALS-row fields (Orders.gs:426). |
| `Variation details` | READ ONLY | Orders.gs:69. Header hint Orders.gs:50. Used to disambiguate when one order number repeats across consecutive rows and the caller must pick a row (Ord |
| `Supplier Link 1` | READ ONLY | Orders.gs:75. The only Supplier Link in the header hints (Orders.gs:51). |
| `Supplier Link 2` | READ ONLY | Orders.gs:76. |
| `Supplier Link 3` | READ ONLY | Orders.gs:77. |
| `Post to name` | READ ONLY, PII-gated | Orders.gs:78, pii: true. In PII_FIELDS (Auth.gs:9). Part of the 7-column Post-to block that floats across 14 different column positions and is absent  |
| `Post to address 1` | READ ONLY, PII-gated | Orders.gs:79, pii: true. PII_FIELDS Auth.gs:9. |
| `Post to address 2` | READ ONLY, PII-gated | Orders.gs:80, pii: true. PII_FIELDS Auth.gs:9. |
| `Post to city` | READ ONLY, PII-gated | Orders.gs:81, pii: true. PII_FIELDS Auth.gs:9. |
| `Post to county` | READ ONLY, PII-gated | Orders.gs:82, pii: true. PII_FIELDS Auth.gs:10. |
| `Post to postcode` | READ ONLY, PII-gated | Orders.gs:83, pii: true. PII_FIELDS Auth.gs:10. |
| `Post to phone` | READ ONLY, PII-gated | Orders.gs:84, pii: true. PII_FIELDS Auth.gs:10. The live column already contains broken '=+44...' formulas, which is why the bridge refuses to write a |
| `col:Q  (unheaded carrier-note column)` | READ ONLY — positional key, not a head | NOT an invented name: the column genuinely has no header, so it survives under the bridge's positional key, spelled 'col:Q' on today's tabs (Orders.gs |

### Accepted alternate spellings

- 'Cost ' (trailing space) — Orders.gs:70 exact[0]; the whitelist matches it, SheetBridge.gs:572-573.
- 'Image Link ' (trailing space) — Orders.gs:60 exact[0]; SheetBridge.gs:554.
- 'Ali Express Link ' (trailing space) — Orders.gs:66 exact[0]; SheetBridge.gs:552.
- 'INSTRUCTION SHEET' — the correctly-spelled alternate is ALSO blocked alongside the real misspelled live name 'INTRUCTION SHEET' (Orders.gs:39).
- 'Ali Express Link' is the live ALTERNATE for 'New Ali Link' on order books that lack the latter — nbHeaderCols_ returns BOTH columns and each row takes whichever is set (NightBackup.gs:236-242, 270-271, 352-354).
- Header/tab equality is normalized, so every punctuation and case variant of a header is the same column: 'Order' + NBSP + 'Earning' == 'Order Earning' (SheetBridge.gs:542); but typos are matched, never corrected — 'Perfomance' != 'Performan
- NO alternate spelling exists in code for: 'Order number', 'Order Number', 'Item title', 'Sold for', 'Full Address', 'Order Earning', 'New Ali Link', 'Quantity', 'Variation details', 'Tracking number', 'Email', 'Delivery Status', 'Supplier L
- ORDERS_EXPECT_DAY (Orders.gs:49-51) is only a header-row-FINDER hint, not the column contract: it omits 'Image Link', 'New Ali Link', 'Supplier Link 2', 'Supplier Link 3' and the whole Post-to block, and omitting a header there does not mak

### Gotchas found during verification

- FALSE CITATION — the claim says NightBackup.gs:9-11 states 'TODAY plus 3 days back'. It does not. Lines 9-11 read: the hourly aliSweep reads the day tabs' processor columns (the AliExpress 'Order Number' and 'New Ali Link') and pours them into the Engine. The stale '3 days back' phrase appears ONLY 
- FALSE — 'REPLACEMENT is the only other tab the same order workspace can open'. 'Returns & INAD' (ORDERS_RETURNS_TAB, Orders.gs:37) is opened from the same kind:'order_processing' workbook via the same ordersReadTab_ at Orders.gs:871, with its own 12-column contract ORDERS_RETURNS_COLS (Orders.gs:52-
- FALSE AS STATED — 'STRICT equality is re-asserted; the bridge's loose containment fallback is REJECTED for day tabs'. It is rejected on the Orders path (Orders.gs:393) and on the sheet-walking callers (NightBackup.gs:258/335, Engine.gs:133/187-188), but the Engine/Worker write path bypasses tab reso
- MIS-CITED — 'returned in skippedMissing (Orders.gs:15-16, 464)'. Orders.gs:15-16 is prose comment only and Orders.gs:464 is the filter that removes 'New Ali Link' from the ADVERTISED writable list in the actionTodayOrders_ response. skippedMissing is actually produced at SheetBridge.gs:317-325 (brid
- MISSED ALTERNATE / OVERSTATED — 'New Ali Link' is not merely 'the column REPLACEMENT lacks'. NightBackup.gs:232-235 records that TWO of the four live order books (AZHAR ABRT, Amna Baji) have NO 'New Ali Link' column on their DAY tabs and carry 'Ali Express Link' instead, and NightBackup.gs:239-241 r
- INCOMPLETE — 'read-blocked AND write-blocked' conflates two lists. Only leading-underscore names and ORDERS_SYNC_OWNED (Orders.gs:39) are read-blocked, and only inside ordersReadTab_ (Orders.gs:394-399). BRIDGE_SYNC_OWNED_TABS (SheetBridge.gs:17) is enforced ONLY in bridgeAssertWritableTab_ (SheetBr
- INCOMPLETE — 'which dates are looked for' lists only the two sweeps. Five more consumers compute day-tab candidates: ordersComputeDashboard_ (Orders.gs:731-743, current month plus a sla+6-day tail into the previous month so OVERDUE does not reset on the 1st), pushEngineCosts (Engine.gs:272 with COST
- MISSED NON-MATCH — the claim's 'what does NOT match' list omits the zero-padded form. Candidates come from a Number (Orders.gs:179), so a tab spelled '01 July' normalizes to '01 july' and can never equal candidate '1 july'. Also note the mechanism protecting 'Order number' from being written is the 

---

## 2. Daily Account Report workbook

*One per account. Feeds the daily report screens.*

### Tab names

- _ALERTS
- 🔔 Notifications
- Notifications
- _LEDGER
- _CONFIG
- ENGINE REPORT

### Columns

| Header (exact) | Portal | Purpose |
|---|---|---|
| `fingerprint` | READ | _ALERTS tab. Alerts.gs:53 (ALERTS_H_FINGERPRINT); read :311. VERIFIED verbatim. CORRECTION to claim: read cap is 200 chars (:311), not 1000. Also doub |
| `raised_at` | READ | _ALERTS tab. Alerts.gs:54 (ALERTS_H_RAISED); read :320. VERIFIED. Feeds alertsKey_ (:785-787) and the mirror row match (:846). |
| `last_seen` | READ | _ALERTS tab. Alerts.gs:55 (ALERTS_H_LAST_SEEN); read :321. VERIFIED. One of the two columns beyond the seven the spec names (file header comment :11). |
| `severity` | READ | _ALERTS tab. Alerts.gs:56 (ALERTS_H_SEVERITY); read :322. VERIFIED. Not a closed list; only its sort rank is keyword-derived (alertsSeverityRank_, :60 |
| `category` | READ | _ALERTS tab. Alerts.gs:57 (ALERTS_H_CATEGORY); read :323. VERIFIED. Also compared in the resolve path at :847. |
| `message` | READ | _ALERTS tab. Alerts.gs:58 (ALERTS_H_MESSAGE); read :313. VERIFIED. Capped at ALERTS_MAX_TEXT = 1000 (:101). Also compared at :848 and truncated to 400 |
| `action` | READ | _ALERTS tab. Alerts.gs:59 (ALERTS_H_ACTION); read :325. VERIFIED. |
| `status` | READ | _ALERTS tab. Alerts.gs:60 (ALERTS_H_STATUS); read :312, tested by alertsIsActive_ :617. VERIFIED. The only column deciding whether an alert is open. N |
| `resolved_at` | READ | _ALERTS tab. Alerts.gs:61 (ALERTS_H_RESOLVED_AT); read :329. VERIFIED. Deliberately never used to decide open/closed (:327-328). |
| `Raised` | READ | 🔔 Notifications mirror tab (headers on row 5). Alerts.gs:66 (ALERTS_M_RAISED); read :351. VERIFIED. |
| `Severity` | READ | 🔔 Notifications. Alerts.gs:67 (ALERTS_M_SEVERITY); read :345. VERIFIED. A row with no Severity AND no Status is layout, not an alert (:347). |
| `Category` | READ | 🔔 Notifications. Alerts.gs:68 (ALERTS_M_CATEGORY); read :353. VERIFIED. |
| `What happened` | READ | 🔔 Notifications. Alerts.gs:69 (ALERTS_M_MESSAGE); read :354. VERIFIED verbatim — the mirror's own wording for `message`. |
| `Do this` | READ | 🔔 Notifications. Alerts.gs:70 (ALERTS_M_ACTION); read :355. VERIFIED verbatim — the mirror's own wording for `action`. |
| `Status` | READ + WRITE | 🔔 Notifications. Alerts.gs:71 (ALERTS_M_STATUS); read :346; whitelist :74 (ALERTS_MIRROR_WHITELIST); write via bridgeUpdateRow_ :857-861 with values f |
| `date` | READ | _LEDGER tab (hidden, 73 columns). MISSING FROM CLAIM. Alerts.gs:152 (ALERTS_LEDGER_EXPECT); resolved :395, sorted :399, read :407. |
| `weekday` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:151 (ALERTS_SERIES_NOTES) and :152; read :413. |
| `z` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:150 (ALERTS_SERIES_NUMS); read :409-412 as a number so the client can compare it against _CONFIG's z_threshold. |
| `forecast` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:150 (ALERTS_SERIES_NUMS); read :409-412. |
| `why` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:151 (ALERTS_SERIES_NOTES); read :413, capped at 300 chars. Carries the workbook's own verdict text. |
| `orders` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:125 (ALERTS_KPI metric); read :408. label 'Orders/day', agg avg. |
| `sale_amount` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:126; read :408. label 'Revenue/day'. |
| `aov` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:127; read :408. |
| `ctr` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:128; read :408. Target key target_ctr. |
| `cvr` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:129; read :408. Target key target_cvr. |
| `ad_per_order` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:130; read :408. label 'Ad £/order', good 'low', target target_ad_per_order. |
| `tacos` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:131; read :408. Stored as a decimal (0.1935), never a percent — a cell carrying '%' is treated as missing (:190 |
| `net_sales` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:132; read :408. label 'Net £/day'. |
| `ad_spend` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:133; read :408. |
| `impressions_day` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:134; read :408. One of the TWO impressions columns (:8-10). |
| `impressions_30d` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:135; read :408. agg 'last'. |
| `views` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:136; read :408. |
| `refund_rate` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:137; read :408. |
| `str_pct` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:138; read :408. Target key target_str. |
| `promo_share` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:139; read :408. |
| `listings_active` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:140; read :408. agg 'last'. |
| `listings_new` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:141; read :408. agg 'sum'. |
| `listings_deleted` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:142; read :408. agg 'sum'. |
| `listing_violation` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:143; read :408. agg 'last'. |
| `late_delivery` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:144; read :408. Target key target_late_pct. |
| `inad_rate` | READ | _LEDGER. MISSING FROM CLAIM. Alerts.gs:145; read :408. Target key target_inad_pct. |
| `key` | READ | _CONFIG tab. Alerts.gs:372 (expect list); resolved :375, read :377. VERIFIED. |
| `value` | READ | _CONFIG tab. Alerts.gs:372; resolved :375, read :379 through alertsNum_ — a non-numeric value is discarded, not stored. |
| `description` | declared, NEVER read | _CONFIG tab. Alerts.gs:372 only. VERIFIED CORRECT: alertsKeyMap_ at :375 maps only key and value; 'description' is passed solely as an `expect` hint t |
| `z_threshold` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:112 (ALERTS_CFG_KEYS); matched :378, value stored :380, surfaced :516. Fallback 2 (:115). |
| `drop_threshold` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:112; matched :378; used :471. Fallback -0.15 (:115). |
| `delta_threshold` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:112; matched :378; used :472. Fallback -0.1 (:115). |
| `dashboard_days` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:112; matched :378; used :487-488, clamped to 1..400. Fallback 30 (:115). |
| `target_ad_per_order` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:113; matched :378; used :454/:475-477. NO fallback — ALERTS_CFG_FALLBACK (:115) holds only the four threshold keys. |
| `target_tacos` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:113; matched :378. No fallback. |
| `target_ctr` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:113; matched :378. No fallback. |
| `target_cvr` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:113; matched :378. No fallback. |
| `target_late_pct` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:114; matched :378. No fallback. |
| `target_inad_pct` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:114; matched :378. No fallback. |
| `target_str` | READ (row VALUE in _CONFIG's `key` col | Alerts.gs:114; matched :378. No fallback. |
| `ACTIVE` | READ (cell VALUE, not a header) + WRIT | Alerts.gs:76 (ALERTS_STATUS_ACTIVE); compared normalized at :617 so case does not matter; passed as bridgeUpdateRow_'s matchValue at :859. VERIFIED. |
| `RESOLVED` | WRITE (cell VALUE, not a header) | Alerts.gs:77 (ALERTS_STATUS_RESOLVED); written into the mirror Status cell at :885. VERIFIED. |
| `ENGINE REPORT (whole tab)` | WRITE — tab CREATED and cleared | MISSING FROM CLAIM, and it refutes the 'only cell written' claim. NightBackup.gs:167 `ss.getSheetByName('ENGINE REPORT') || ss.insertSheet('ENGINE REP |
| `M98M ENGINE REPORT — <account>` | WRITE (literal cell text) | ENGINE REPORT tab, A1. NightBackup.gs:169. Followed by a provenance line and a blank row. |
| `30-DAY SUMMARY` | WRITE (literal section banner) | ENGINE REPORT tab. NightBackup.gs:170. Below it, label/value pairs from the engine's account_summary query (:173): account, orders_30d, units_30d, rev |
| `DAILY BOOKS (newest first)` | WRITE (literal section banner) | ENGINE REPORT tab. NightBackup.gs:176. Followed at :177 by the sales_daily header row written verbatim from the engine: account, date, sold, oe, cost, |
| `account_name` | READ | Portal DB CONNECTIONS tab — locates the workbook. Alerts.gs:273; NightBackup.gs:164; SheetBridge.gs:97/:100. |
| `scope` | READ | Portal DB CONNECTIONS. Alerts.gs:270 (must equal 'account'). |
| `sheet_kind` | READ | Portal DB CONNECTIONS. Alerts.gs:271 (must equal ALERTS_KIND 'account_report', :42); NightBackup.gs:153; Config.gs:100 ACCOUNT_SHEET_KINDS. |
| `spreadsheet_id` | READ | Portal DB CONNECTIONS. Alerts.gs:272; NightBackup.gs:166; SheetBridge.gs:97. |

### Accepted alternate spellings

- 🔔 Notifications | Notifications — the mirror tab's two declared name candidates (Alerts.gs:48); the claim names only the emoji form
- Header matching is normalization-based throughout, so every header in this contract also matches any case/punctuation/whitespace variant: bridgeNormalizeHeader_ (SheetBridge.gs:29-31) and alertsNorm_ (Alerts.gs:170-174) lowercase, fold newl
- Tab names also match on unique containment after a 31-char Excel truncation (SheetBridge.gs:192-200), so a renamed tab can still resolve.
- ACTIVE / RESOLVED status values are compared normalized (Alerts.gs:617), so 'active', 'Active' and 'ACTIVE' are equivalent; ALERTS_STATUSES (:78) is returned to the client as a closed list at :773 — unlike severity, which is deliberately op

### Gotchas found during verification

- FALSE CLAIM — 'Status ... THE ONLY CELL THE PORTAL EVER WRITES IN THIS WORKBOOK'. Refuted by NightBackup.gs:151-189 (nbRefreshReportBooks_), which opens every account_report workbook with SpreadsheetApp.openById(String(c.spreadsheet_id)) at :166, does `ss.getSheetByName('ENGINE REPORT') || ss.insert
- MISSING — the entire `_LEDGER` tab. The visible portion of the contract lists no _LEDGER header at all, yet it is the workbook's largest read surface: the hidden 73-column tab read at Alerts.gs:388-421 with ALERTS_LEDGER_EXPECT (:152). 26 headers are addressed by name: date, weekday, z, forecast, wh
- MISSING — seven of the eleven _CONFIG row keys. The claim's list reaches z_threshold and stops. ALERTS_CFG_KEYS (Alerts.gs:112-114) is: z_threshold, drop_threshold, delta_threshold, dashboard_days, target_ad_per_order, target_tacos, target_ctr, target_cvr, target_late_pct, target_inad_pct, target_st
- MISSED ALTERNATE SPELLING — the mirror tab has TWO name candidates, not one. Alerts.gs:48: `const ALERTS_TAB_MIRROR = ['🔔 Notifications', 'Notifications'];`. The claim names only '🔔 Notifications'. The plain spelling is a deliberate fallback for a hand-renamed tab, and SheetBridge additionally accep
- INACCURATE DETAIL — `fingerprint` is read with a 200-char cap (Alerts.gs:311, and again on the resolve payload at :810), not the 1000-char ALERTS_MAX_TEXT. The 1000 cap applies to `message` and `action` only (:313, :325, :354, :355).
- UNSTATED, MATERIAL — Dashboard.gs's actionAccountReportRows_ (:1013-1019) contributes ZERO named columns to this contract and the claim should say so. It calls bridgeReadRows_ with no `tab` and no `expect` (:1017), so bridgePickSheet_ falls through to 'first non-hidden sheet' (SheetBridge.gs:183-185
- UNSTATED — a third and fourth file touch this workbook beyond the three named in the task: NightBackup.gs (writes, above) and Registry.gs:11, which is what maps the registry tab name to sheet_kind in the first place. Config.gs:100 declares account_report in ACCOUNT_SHEET_KINDS.
- UNSTATED — two header STRINGS double as sentinel cell VALUES used to discard layout rows: 'fingerprint' at Alerts.gs:316 (a row whose fingerprint cell equals the word 'fingerprint' is a repeated header) and 'Status' at :348 (same for the mirror's repeat at row 56). If the claim lists ACTIVE and RESO

---

## 3. Central Main Sheet (Account Management)

*One per account. Item facts, suppliers, cost.*

### Tab names

- Main Sheet
- Wrong Advertising
- UMAR- Selected Listing
- Selected Listing
- HAMZA UMAR - Listing Revision
- Listing Revision

### Columns

| Header (exact) | Portal | Purpose |
|---|---|---|
| `eBay Item No` | READ (item facts) + WRITE match key | CONFIRMED. Item identity on 'Main Sheet'. Expect lists: Engine.gs:340, Advertising.gs:89, CustomerService.gs:133 (CS_MAIN_ITEM = CustomerService.gs:14 |
| `Listing Title` | READ only | CONFIRMED read-only — never in any write whitelist. Engine.gs:339 expect list only (no title field in FIELDS, Engine.gs:381-393). Advertising.gs:88, : |
| `Image Link` | READ only | CONFIRMED read-only. Engine.gs:339 expect list only (never extracted). Advertising.gs:88 (expect only — Advertising never reads it). CustomerService.g |
| `Sold For` | READ only | CONFIRMED read-only. Engine.gs:339 expect list only. Advertising.gs:88; CustomerService.gs:132 + CS_MAIN_SOLD at :135; Signals.gs:100; PotentialCpc.gs |
| `Order Earning` | READ only | CONFIRMED read-only. Engine.gs:339 expect, :383 pick(['Order Earning']), :406 pushed as `oe`. Also Advertising.gs:88; CustomerService.gs:132 + CS_MAIN |
| `Aliexpress Cost` | READ + WRITE (sole writer: Customer Se | CONFIRMED as the only cost column the portal writes on 'Main Sheet'. READ: Engine.gs:339, :384, :407; Advertising.gs:89; Signals.gs:101; PotentialCpc. |
| `Profit ` | READ ONLY — never written by the porta | CONFIRMED, trailing space intact and load-bearing. Engine.gs:339 (with trailing space), :385 pick(['Profit']) — the alias works because bridgeNormaliz |
| `Campaign Selection` | READ + WRITE (writers: Advertising and | CONFIRMED. READ: Engine.gs:340, :386, :409; Advertising.gs:89, ADV_CAMPAIGN_COL at :90, :632; CustomerService.gs:133 + CS_MAIN_CAMPAIGN at :139; Signa |
| `Current Campaign Selection` | READ ONLY — deliberately excluded from | CONFIRMED. Engine.gs:340, :387, :410; Advertising.gs:89, ADV_CURRENT_CAMPAIGN_COL at :91, :633; CustomerService.gs:133 + CS_MAIN_CURRENT_CAMPAIGN at : |
| `Current Supplier Working` | READ ONLY (no code path writes it) | CONFIRMED. Engine.gs:341 expect, :388 pick(['Current Supplier Working','Current Supplier']), payload at Engine.gs:411 (NOT :412 as claimed). Named in  |
| `Ali Express Link 1` | READ ONLY | CONFIRMED. Engine.gs:341, :389 pick(['Ali Express Link 1','AliExpress Link 1','Supplier Link 1','Ali Express Link']), payload at Engine.gs:412 (NOT :4 |
| `Suuplier 2` | READ ONLY | CONFIRMED — genuinely two u's. Engine.gs:341, :390 pick(['Suuplier 2','Supplier 2','Supplier Link 2']), payload at Engine.gs:413 (NOT :414). Source co |
| `Supplier 3` | READ ONLY | CONFIRMED. Engine.gs:341, :391 pick(['Supplier 3','Suuplier 3','Supplier Link 3']), payload at Engine.gs:414 (NOT :415). Listing.gs:344. The 'Suuplier |
| `eBay Category (FVF %)` | READ ONLY | RESTORED — the claimed contract was truncated mid-entry at 'eBay Category' and never stated this column's access or evidence. Full verbatim header is  |

### Accepted alternate spellings

- eBay Item No → aliases accepted at Engine.gs:382: 'eBay Item Number', 'Item No'
- Aliexpress Cost → aliases at Engine.gs:384: 'AliExpress Cost' (REDUNDANT — normalizes identically), 'Ali Express Cost' (genuinely distinct)
- Profit → alias 'Profit' at Engine.gs:385; works because bridgeNormalizeHeader_ trims (SheetBridge.gs:37). SheetBridge.gs:553 pins that it is NOT 'Our Profit'
- Current Supplier Working → alias 'Current Supplier' (Engine.gs:388)
- Ali Express Link 1 → aliases 'AliExpress Link 1', 'Supplier Link 1', 'Ali Express Link' (Engine.gs:389); SheetBridge.gs:552 pins 'Ali Express Link ' ≠ 'AliExpress Link'
- Suuplier 2 → aliases 'Supplier 2', 'Supplier Link 2' (Engine.gs:390); SheetBridge.gs:551 pins 'Suuplier 2' ≠ 'Supplier 2'
- Supplier 3 → aliases 'Suuplier 3' (found nowhere else in the tree), 'Supplier Link 3' (Engine.gs:391)
- eBay Category (FVF %) → aliases 'eBay Category', 'Category (FVF %)' (Engine.gs:392)

### Gotchas found during verification

- SCOPE OVERREACH — the contract calls itself "the Central / Account Management workbook" but every column listed lives on ONE tab, 'Main Sheet'. The same kind:'central' workbook holds other tabs the portal touches, several of which it WRITES: 'Wrong Advertising' (ADV_ALARM_TAB, Advertising.gs:104, re
- BOTH WRITE CLAIMS ARE UNQUALIFIED — 'READ + WRITE' is stated as if live. bridgeUpdateRow_ gates on bridgeWriteEnabled_() at SheetBridge.gs:394; that reads BRIDGE_WRITE_FLAG = 'pipeline_write_external' (SheetBridge.gs:13, :276-278), whose default in Config.gs:96 is 'false' with the comment 'the pipel
- SIGNALS LINE NUMBERS ARE OFF BY ONE THROUGHOUT. Claimed 'Signals.gs:96 (SIG_MAIN_IMAGE)' — line 96 is `const SIG_MAIN_TAB = ['Main Sheet'];`. SIG_MAIN_IMAGE is line 97. Claimed 'Signals.gs:97' for Listing Title — line 97 is SIG_MAIN_IMAGE; SIG_MAIN_TITLE is line 98. Claimed 'Signals.gs:99' (for both
- FOUR ENGINE PAYLOAD LINES ARE OFF BY ONE. Claimed Current Supplier Working :412, Ali Express Link 1 :413, Suuplier 2 :414, Supplier 3 :415. Actual Engine.gs push lines are 411, 412, 413, 414 respectively; line 415 is `category:`. (The pick() lines :388-:391 the claim cites are all correct, as are :4
- CustomerService.gs:957 CITED FOR THE '↳' MARKER IS A COMMENT LINE, not code. Lines 956-958 are the explanatory comment; the actual variation flag is `out.variation = String(out[CS_MAIN_TITLE] || '').charAt(0) === '↳';` at CustomerService.gs:959, and the filter is at CustomerService.gs:968. (The pair
- 'AliExpress Cost' IS NOT A DISTINCT SPELLING. The claim says "Engine also accepts 'AliExpress Cost' and 'Ali Express Cost'". bridgeNormalizeHeader_ (SheetBridge.gs:33-38) lowercases and folds every non-alphanumeric run to one space, so 'Aliexpress Cost' and 'AliExpress Cost' both normalize to 'aliex
- Advertising.gs comment span misstated: claimed "':92-96 (comment: deliberately OUT)'". The comment block is Advertising.gs:92-95; line 96 is `const ADV_CAMPAIGN_WHITELIST = [ADV_CAMPAIGN_COL];`, code not comment.
- MISSING ACCESS DIMENSION — the contract records no role gating. 'Order Earning' and 'Profit' are both in PROFIT_FIELDS (Auth.gs:7) and are stripped server-side before payloads leave for restricted roles: stripForRole_ (Auth.gs:26-41, exact-key match at :34), plus normalized variants at SheetBridge.g

---

## 4. Monthly Sheet + workbook Dashboard tiles

*Feeds the management dashboard tiles.*

### Tab names

- Monthly Sheet (business workbook, READ)
- 📊 Dashboard (business workbook, READ, current month tiles)
- Dashboard (business workbook, READ, alternate candidate for the same tab)
- <Month> Overall Report (business workbook, READ, previous month tiles only)
- DASH_CACHE (portal DB, WRITE — the only business-facing figures the module persists)
- ACTIVITY_LOG (portal DB, WRITE — DASH_BUILD_FAIL, DASH_UNATTRIBUTED_ROW, DASH_CACHE_BUILD, DASH_REFRESH)

### Columns

| Header (exact) | Portal | Purpose |
|---|---|---|
| `Monthly Sheet` | READ (tab name) | CONFIRMED. DASH_MONTHLY_TAB = ['Monthly Sheet'] at Dashboard.gs:89; used at :473 (with expect: DASH_MONTHLY_HEADERS) and :1006 (actionSalesAnalysisRow |
| `Date` | READ | CONFIRMED as a header read: declared Dashboard.gs:34, read at :294 via dashParseDate_(dashCell_(rec, map, DASH_COL_DATE)); parser at :258-279 handles  |
| `Orders` | READ | CONFIRMED. Declared :35, read :297, summed :312, emitted :367. In DASH_MONTH_METRICS (:77) therefore in DASH_SUMMABLE (:82). Also in the ads view (:87 |
| `Units` | READ | CONFIRMED. Declared :36, read :298, summed :313, emitted :368. In DASH_SUMMABLE. Also in the ads view (:87). |
| `Sold (B)` | READ | CONFIRMED including the sharp part. Declared :37, read :299, summed :314, re-emitted under the TILE name 'Sold' at :361. Grep confirms DASH_COL_SOLD a |
| `Earning (H)` | READ | CONFIRMED. Declared :38, read :300, summed :315, emitted :369. In DASH_SUMMABLE. NOT in the ads view. |
| `AliExpress (I)` | READ | CONFIRMED. Declared :39, read :301, summed :316, re-emitted as tile 'AliExpress Cost' at :363. Grep confirms DASH_COL_ALIEXPRESS appears only at :39,  |
| `All Priority incl VAT (N)` | READ | CONFIRMED on every count. Declared :40, read :302, summed :317, emitted :370; it is the N of the recomputed ratio (:379, :842) and the N of the ads ti |
| `General fees` | READ | CONFIRMED. Declared :41, read :303, summed :318, emitted :371, VAT-grossed at (1 + DASH_VAT_RATE) inside the ads tile (:364; DASH_VAT_RATE = 0.2 at :9 |
| `Ad Waste` | READ | CONFIRMED, contradiction included. Declared :42, read :304, summed :319, emitted :372; a per-day metric (:84, :387) and a per-week one (:527, :533). T |
| `Raw Profit (T)` | READ | CONFIRMED. Declared :43, read :305, summed :320, emitted :373; the T denominator at :379 and, for the fleet total, at :841-842. In DASH_SUMMABLE and i |
| `Returns (U)` | READ | CONFIRMED. Declared :44, read :306, summed :321, emitted :374; feeds the RETURNS tile as (returns + old_returns) at :365, where old_returns comes from |
| `Actual Profit (V)` | READ | CONFIRMED. Declared :45, read :307, summed :322, emitted :376; the ACTUAL PROFIT tile adds old_actual on top (:356, :362). It is §13.1's 'profit yeste |
| `Ratio N/T` | DECLARED; its CELL is never read, but  | PARTLY WRONG as claimed. Confirmed: declared :46, listed in DASH_MONTHLY_HEADERS (declared :47-49, the literal sits on line 49), and grep shows NO das |
| `Trend` | DECLARED, never read | CONFIRMED. A bare literal inside DASH_MONTHLY_HEADERS at Dashboard.gs:49; no dashCell_ call, no metric key, no output. Its only effect is the +12 scor |
| `Month-to-date` | DECLARED, never read | MISSING FROM THE CLAIM (its list was truncated at 'Trend'). Bare literal in DASH_MONTHLY_HEADERS at Dashboard.gs:49. Same status as 'Trend' — expect-l |
| `Profit graph` | DECLARED, never read | MISSING FROM THE CLAIM. Bare literal in DASH_MONTHLY_HEADERS at Dashboard.gs:49. Expect-list scoring only. It has no counterpart at all in docs/M98M-P |
| `Sold` | READ (tile label, workbook Dashboard / | MISSING FROM THE CLAIM. DASH_TILE_SOLD at :52. Matched by EXACT normalized equality (n === 'sold', :409), value taken from row 4 of the fixed A1:P4 co |
| `ACTUAL PROFIT (after old returns)` | READ (tile label) | MISSING FROM THE CLAIM. DASH_TILE_PROFIT at :53. Matched by SUBSTRING containment on 'actual profit' (:405), not equality. Portal value = Σ Actual Pro |
| `AliExpress Cost` | READ (tile label) | MISSING FROM THE CLAIM. DASH_TILE_ALIEXPRESS at :54. Matched by SUBSTRING containment on 'aliexpress' (:406). Portal value = Σ AliExpress (I) (:363). |
| `All Ads incl VAT (waste inside)` | READ (tile label) | MISSING FROM THE CLAIM. DASH_TILE_ADS at :55. Matched by SUBSTRING containment on 'all ads' (:407). Portal value = Σ N + 1.2 × Σ General fees (:364).  |
| `RETURNS` | READ (tile label) | MISSING FROM THE CLAIM. DASH_TILE_RETURNS at :56. Matched by PREFIX (indexOf('returns') === 0, :408) because the live label carries its own split — 'R |
| `Margin` | READ (tile label) | MISSING FROM THE CLAIM. DASH_TILE_MARGIN at :57. Matched by EXACT normalized equality (n === 'margin', :410). A ratio metric (:62): excluded from DASH |
| `Returns — old` | PORTAL-OWNED metric name — NOT a sheet | MISSING FROM THE CLAIM, and the one string most likely to be mistaken for a column. DASH_METRIC_RETURNS_OLD at :66, spelled with an EM DASH. No such h |
| `DASH_CACHE` | WRITE (portal DB tab, not a business s | Columns metric/account/period/value/computed_at (Config.gs:21). Opened via getPortalDb_(false) at :561; setValues :595, setNumberFormat on cols 1-3 an |
| `ACTIVITY_LOG` | WRITE (portal DB tab) | MISSING FROM THE CLAIM, which said DASH_CACHE was the only write target. logActivity_ is called four times in this module: DASH_BUILD_FAIL (:664), DAS |

### Accepted alternate spellings

- '📊 Dashboard' — Dashboard.gs:90, FIRST candidate in DASH_TILE_TAB and the live tab name; omitted by the claim, which named only 'Dashboard'
- 'Dashboard' — Dashboard.gs:90, second candidate; folds to the same normalized 'dashboard' as the emoji form, so the pair is belt-and-braces rather than two distinct matches
- '<Month> Overall Report' — not a literal; built at Dashboard.gs:486 from DASH_MONTH_NAMES (:92-93) + DASH_OVERALL_SUFFIX = ' Overall Report' (:91), single candidate, previous month only
- 'Monthly Sheet' — Dashboard.gs:89, genuinely single-candidate with no alternate spelling anywhere; independently hardcoded as ['Monthly Sheet'] at AuditAgent.gs:84
- unique-containment tab fallback — SheetBridge.gs:194-200 would accept a near-miss tab name; neutralised for this module by the dashTabIsCandidate_ equality re-check at Dashboard.gs:423 and :477
- 'Month-to-date' (code, Dashboard.gs:49) vs 'MTD' (spec, docs/M98M-Portal-Master-Prompt.md:195) — divergent spellings of the same column; inert only because the column is never read
- 'All Ads incl VAT (waste inside)' (code, Dashboard.gs:55) vs 'All Ads incl VAT' (spec, docs/M98M-Portal-Master-Prompt.md:195) — the code's tile constant carries a parenthetical the spec does not; matching survives because dashTileFor_ tests

### Gotchas found during verification

- WRITE SCOPE — the claim's 'the only writes are into the portal's own DASH_CACHE tab' is FALSE as stated. Also written: ACTIVITY_LOG via logActivity_ (Dashboard.gs:664, :673, :688, :989), the script property DASH_SWEEP_CURSOR (:681), the CacheService key 'dash_refresh' (:987), plus setNumberFormat (:
- TWO HEADERS OMITTED — 'Month-to-date' and 'Profit graph' are both in DASH_MONTHLY_HEADERS (Dashboard.gs:49) and were left out (the claim's list was truncated mid-sentence at 'Trend'). Both are declared-but-never-read, identical in status to 'Trend'. 'Month-to-date' also does not match the spec's spe
- SIX TILE LABELS AND ONE PORTAL METRIC OMITTED — the claim covers Monthly Sheet columns but not the tile vocabulary it says the module reads: 'Sold' (:52), 'ACTUAL PROFIT (after old returns)' (:53), 'AliExpress Cost' (:54), 'All Ads incl VAT (waste inside)' (:55), 'RETURNS' (:56), 'Margin' (:57), plu
- MISSED ALTERNATE TAB SPELLING — DASH_TILE_TAB = ['📊 Dashboard', 'Dashboard'] (Dashboard.gs:90). The claim names only the second candidate; the emoji-prefixed form is listed FIRST and is the live tab name (see the module header comment at :4). Both fold to 'dashboard' through bridgeNormalizeHeader_ s
- OVERALL REPORT TAB IS CONSTRUCTED, AND ONLY FOR THE PREVIOUS MONTH — '<Month> Overall Report' is not a constant: DASH_OVERALL_SUFFIX = ' Overall Report' (:91) is concatenated onto DASH_MONTH_NAMES[prevMonth-1] at :486, passed as a SINGLE-candidate list. The Dashboard / 📊 Dashboard tab is read only f
- TILE-LABEL MATCHING IS NOT NORMALIZED EQUALITY — the claim's blanket 'all header/tab matching is normalised through bridgeNormalizeHeader_' holds for Monthly Sheet headers (dashHeaderMap_ :239-249) and tab names (dashTabIsCandidate_ :393-400), but dashTileFor_ (:402-412) uses SUBSTRING containment f
- 'Ratio N/T' STATUS UNDERSTATED — 'declared but its cell is never read' is CORRECT (grep confirms no dashCell_ call for DASH_COL_RATIO). But 'appears in the expect list only' is WRONG: dashHeaderMap_ (:242) builds a map entry for it, and it is a member of DASH_MONTH_METRICS (:79) and DASH_ADS_VIEW_ME
- 'Date ... Monthly Sheet col A' IS NOT EVIDENCED — column letters exist only in the comment at Dashboard.gs:32 ('row 1, cols A–P'). No positional access occurs anywhere: bridgeOpenTab_ finds the header row by scoring the first BRIDGE_SCAN_ROWS = 10 rows (SheetBridge.gs:19, :121-143) and inherits blan

---
