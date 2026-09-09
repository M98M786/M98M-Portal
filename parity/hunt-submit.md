# Parity Checklist — hunt submit (`submitHunt` → `actionSubmitHunt_`)

> ## ✅ APPROVED — Hasib, 9 Sept 2026
> Phase 0 gate **PASSED for hunt submit.** This document is now the LOCKED yardstick: the
> D1-primary shadow path must reproduce every numbered behavior below, and Phase 2's divergence
> report is scored against it (100% match required before any flip). Any change to hunt-submit
> behavior after this date must update this checklist first.
> Phase 1 (shadow build, WO-2/WO-3) is unblocked — to run in a **separate quiet window**: the
> galaxy front end went live 9 Sept, and the orders forbid stacking a write-path step on the same
> night. Task/listing parity checklists are written just before their own conversions (Phase 5).

*Write-path plan Phase 0 / WO-1 yardstick. Grounded in the LIVE code as deployed 9 Sept 2026
(Apps Script v119) — NOT the 8-Sept snapshot in the handover zip, which predates the v118/v119
revise fixes. The D1-primary shadow path must reproduce every numbered behavior below exactly.*

## 1. Entry & role gate
- Action `submitHunt`, handler `actionSubmitHunt_(payload, ctx)` (apps-script/Hunting.gs).
- Allowed roles: `HUNT_SUBMIT_ROLES` = Product Hunter · Team Lead · Ops Head · Management ·
  Order Processor (management super always passes). Any other role → error.

## 2. Input normalization (`huntColumnsFromPayload_`)
- Reads `payload.columns` (header-alias tolerant via `huntColFor_`).
- Every value: trimmed, string-capped at `HUNT_MAX_CELL` = 5000 chars; Dates pass through.
- Object/array values → error `unsupported value for <col>`.
- Portal-owned columns (`HUNT_PORTAL_OWNED`) in the payload → error
  `column is set by the portal, not by the form: <col>`.

## 3. Validation (same message, same order)
1. Required columns (`HUNT_REQUIRED`): **Title · Main Keyword Terapeak link · Product Link 1
   Main supplier · Source Price · E-Bey Caluclator + £4** — first missing one → error naming it.
2. `Source Price` must contain a parseable number (`huntFirstNumber_`) → else
   `a numeric price is required: Source Price` (ranges like "3.02 - 3.30" are valid).
3. `Seasonal` (item kind) required at submit, value must map to **Seasonal | Consistent**
   (`huntKind_`) → SAY-errors otherwise.
4. Profit projection: `huntCalculate_(cols, payload.shipping)` fills **Our Profit** and **ROI**
   server-side (hunter's own §4.2 calculator; default fee rates, no account chosen yet).

## 4. Duplicate check (AT SUBMIT, before any write)
- Extract AliExpress item ids from the three supplier columns (`HUNT_DUP_SUPPLIER_COLS` =
  Product Link 1 Main supplier · Product Link 2 · Product Link 3), with short-link resolution
  (`huntResolveShortLink_` → `huntAliItemId_`).
- Scan the whole `HUNTING_DB`; a hit = any stored supplier id equals any submitted id.
- On hit, THREE outcomes (v118/v119 semantics — critical to replicate):
  a. **Hit is the CALLER'S OWN hunt in flight** (approval_status `''` pending or
     `REVISION REQUIRED`) → the submit **delegates to `actionReviseHunt_`**: the existing row is
     updated (hunter-editable whitelist = HUNTING_COLS minus Selected By / Date Added / IMAGE /
     Account Selected / Listing Status), status returns to pending, `(revised <PKT date>)` is
     appended to Comments, the engine mirror is pushed. **No new row.** Response
     `{revised:true, hunt_id, fields}`.
  b. **Any other hit** → blocked with
     `duplicate product — already hunted by <name> (<status>, <date>, <hunt_id>). Management can
     override with a note.`
  c. **Management + `override_note`** → proceeds; `HUNT_DUP_OVERRIDE` activity-logged.

## 5. The write (atomic, inside the global script lock)
- `lock.waitLock(15000)`; timeout → SAY
  `the hunting sheet is busy right now — give it a moment and press Submit again (your data is kept)`.
- One `appendRow` to `HUNTING_DB` (Portal DB spreadsheet): `hunt_id` = `'H' + uuid8`,
  `hunter_email` = caller, `ts` = now, plus every normalized column; nothing else in the lock.

## 6. Post-write tail (ALL best-effort — v119 contract: nothing here may fail the response)
1. Criteria flags computed (`huntCriteriaFlags_`) — product-criteria warnings, non-blocking.
2. **Engine mirror push** `huntMirrorPush_` → engine `syncHunts` → D1 `hunt_rows` upsert with
   `approval_status:''`, `hunter_name`, `criteria_flags` — the reviewer queue and the hunter's
   own list see the submission instantly (mirror-FIRST, before the slow human sheets).
3. Activity log `SUBMIT_HUNT` (self-caught).
4. `notifyManagement_('Hunt submitted', '<name> submitted "<title>" for review — N criteria
   flag(s)')` → one NOTIFICATIONS row per approved Management-role user + super admins
   (bell delivery rides `notifSweep_`); wrapped try/catch (a failed bell never fails the save).
5. Live hunting-workbook mirror `huntMirrorAppend_` (bridge appendRow, header-whitelisted;
   self-caught — failure logs `HUNT_MIRROR_FAIL`, response still succeeds).
6. Backup workbook: **not inline** — `huntBackupSync` (5-min reconciler) carries it.

## 7. Response shape
`{ hunt_id, approval_status: '', submitted_at, calculator: <detail>, criteria_flags: [...],
mirror: {ok|queued...} }` — or the delegation response from 4a.

## 8. Client contract (frontend/view-hunting.js — must stay byte-identical under shadow)
- Optimistic submit: form clears instantly; draft keeper holds keystrokes until confirmed.
- Soft dup gate: first submit runs `huntDuplicateCheck` and warns once; second click proceeds.
  In revise mode the hunt being revised is filtered out of the warning (v119).
- On timeout/overload/`request failed`: **verify-before-restore** — waits 4 s, re-reads
  `myHunts`; if the hunt landed → "Saved ✓", clean form; only a truly missing save restores typing.

## 9. Stores touched (complete list)
| Store | Op |
|---|---|
| Portal DB → `HUNTING_DB` | appendRow (the write of record) |
| Portal DB → `NOTIFICATIONS` | appendRow ×N mgmt recipients (best-effort) |
| Portal DB → `ACTIVITY_LOG` | appendRow (best-effort) |
| Live hunting workbook (kind `hunting`) | bridge appendRow (best-effort) |
| Engine D1 `hunt_rows` | upsert via `syncHunts` (best-effort, instant queue truth) |
| Backup workbook | via 5-min reconciler, NOT in this path |

## 10. Failure-mode law
- Non-SAY server errors are masked to `request failed` by the router (real error + stack in
  ACTIVITY_LOG as `ERROR:submitHunt`).
- The write of record is #5; everything after is best-effort. The shadow path must reproduce
  the SAME ordering guarantee: no downstream effect may fire if the write of record fails, and
  no downstream failure may report failure to the submitter.
