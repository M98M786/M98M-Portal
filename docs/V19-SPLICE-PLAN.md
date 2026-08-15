# v19 — the editor sitting, scripted (target: under 10 minutes)
_The Apps Script code is already written and built into `build/Code.gs`. The pane cannot push
whole files anymore (Chrome blocks localhost fetches), but the **monaco diff-splice** works:
find the old block in the editor's model, `setValue` the surgically replaced string. Two
splices, one save, one deploy._

## Pre-flight
1. Hasib signs into the pane → `script.google.com` project editor (M98M Portal Backend).
2. `javascript_tool`: confirm `monaco.editor.getModels()[0]` length ≈ v18 (954,912 chars).

## Splice 1 — Engine.gs: the sheet-write bridge
Anchor (exists verbatim in v18):
```
const ACTIONS_ENGINE = {
  engineNotify: [actionEngineNotify_, 'public'],   // key-checked inside — the Worker has no Google token
};
```
Replace with the current `apps-script/Engine.gs` block from `ENGINE_SHEET_WHITELISTS` through the
new two-entry `ACTIONS_ENGINE`. (Copy from the repo file — it is the source of truth.)

## Splice 2 — Dashboard.gs: the two workbook readers
Anchor (exists verbatim in v18):
```
const ACTIONS_DASHBOARD = {
  dashboard:        [actionDashboard_, 'any'],          // gated to the §4.3 roles inside
  refreshDashboard: [actionRefreshDashboard_, 'any'],   // gated to Management inside
};
```
Replace with the current `apps-script/Dashboard.gs` block from `actionSalesAnalysisRows_`
through the new four-entry `ACTIONS_DASHBOARD`.

## Save + deploy
1. Model length after both splices must equal `python3 -c "print(len(open('build/Code.gs').read()))"` ± the constant 55-char editor offset.
2. Click **Save project to Drive** (toolbar ref) → header shows "Saved to Drive".
3. Deploy ▾ → Manage deployments → confirm the **AKfycbx1_…** deployment is selected → pencil →
   Version → **New version** → Deploy → "Version 19".
4. Verify from the pane (same-origin fetch): `engineSheetWrite` with a wrong key → `auth`
   (v18 says `unknown action`). `salesAnalysisRows` unauthenticated → auth.

## After v19 (same sitting, Claude drives)
- Worker: `orderAddAliLink` action (req 16) calling `engineSheetWrite` whitelist `orders_day`
  col `New Ali Link` — sheet shadow law applies automatically via `pipeline_write_external`.
- Frontend: Sales analysis screen gains the Monthly-Sheet day-row table
  (`salesAnalysisRows`); new **Account report** section/screen (`accountReportRows`);
  Orders workspace gains the Ali-link prompt.
- Trackings-tab dual-write: needs Hasib's header confirmation first, then a second
  whitelist tag in `ENGINE_SHEET_WHITELISTS` (one line) + a Worker call after tracking push.

## Still Hasib-only (unchanged)
Husnain's team-lead module grant · Trackings-tab headers · Q6 hours · 5 consents ·
R2 enable · the go-live switches.
