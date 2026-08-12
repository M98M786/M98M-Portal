# HANDOFF — read this first, before touching anything
_Written 11 Aug 2026, end of a long build session, at the owner's request. Brutally honest by design._

## The owner's verdict, taken seriously

Hasib's words: "so slow, not working at all, it's just keep loading and loading" and "there is
nothing in this portal that can help me in any stage of the working". He is substantially right,
and the next session must treat these as the ground truth, not as complaints to soothe:

1. **Slow is structural, not a bug.** Apps Script spends ~2.5s parsing our script before ANY code
   runs, on EVERY request (measured: doGet with zero sheet access = 2.2–2.7s). We then grew the
   script to **916KB / 1,643 functions**, which makes that parse WORSE with every phase shipped.
   Request batching (client `api()` auto-batches; server `batch` action) and per-request memoisation
   helped, but the floor is still ~2.5–4s per interaction. **Every feature added has made the
   portal slower.** This is the central architectural fact of the project.
2. **Built ≠ shipped happened repeatedly.** The management dashboard existed in source for a full
   day while the live portal showed nothing. The deploy UI silently redeployed the SAME version
   twice (dropdown snaps back — see gotchas below). The tools screen said "not set up yet" for
   weeks because nobody uploaded the files to Drive. Verify deployments by CALLING the /exec URL
   and checking for the new action names — never by reading the success dialog.
3. **The dashboard shows "not computed yet"** because `buildDashboardCache` has never run — its
   15-minute trigger was never installed (blocked: triggers can only be added in the owner's own
   Chrome; Google's consent popup cannot open in the Claude pane). Run it once manually from the
   editor and the owner's real numbers appear. This alone would change his experience most.

## What actually works (verified, not assumed)

- Sign-in via Google, registration → approval queue, role routing. 11 staff approved, shifts set
  (Noman/Wahab/Fasieh Shift 2, Zain custom 18:00–03:00, rest Shift 1), Mon–Sat working days.
- 33 views live at https://m98m786.github.io/M98M-Portal/ pointing at the NEW deployment
  `AKfycbx1_6VpJUMVEJeifbwq79DIhNwhZgzHmPxRuC2oj6my3b1Kl2mpowSGjNMAM8D3bLP1wg` (the old one is
  stuck on v11 and refuses new versions through the UI).
- Full pipeline chain passed 24/24 self-tests (hunt→approve→list→ItemID→auto-tasks, idempotent).
- Brain v17 anchor £19.99@0.10→£17.15 verified. SheetBridge: header-addressed, whitelisted,
  refuses sync-owned tabs and formula writes.
- **SHADOW MODE IS ON and the owner explicitly wants it on while he tests.** Every intended
  business-sheet write logs as SHADOW_WRITE in ACTIVITY_LOG. `pipeline_write_external` is ABSENT
  from CONFIG (added to defaults after DB creation) — absent = off, and that is fail-safe.
  DO NOT flip without him reading the shadow log. `setExternalWrites(true,'hasib')` is the switch.

## What is broken or missing, in priority order

1. **Dashboard cache never computed** → run `buildDashboardCache` once in the editor; then the
   owner must add the 15-min trigger (his Chrome only). Same for `runMissedCheckpointSweep`,
   `runSubmissionEscalationSweep`, `generateRecheckRows`, `nightlyBackup` — NONE are installed;
   accountability flags and backups are silently off.
2. **Tools not registered.** Six HTML files staged in `~/Desktop/M98M Portal Tools/`; owner must
   drag into Drive (keep .html, no conversion), then run `bootstrapRegisterTools()` — it finds
   them by filename and reports what's missing.
3. **Speed — now MEASURED, 12 Aug. Read this before optimising anything.**
   A 472-byte throwaway web app was deployed in the same account and timed against our 927KB
   backend, 10 interleaved calls each, same tab, same minute:

   | | tiny (472 B) | ours (927 KB) |
   |---|---|---|
   | best | 981 ms | 2,449 ms |
   | **median** | **1,282 ms** | **2,895 ms** |
   | worst | 4.0 s | 13.5 s |

   So roughly **1.3s is Google's fixed toll (unavoidable) and ~1.6s is our script's size**, and
   the big script's tail is far worse (13.5s vs 4.0s) — that tail is what makes screens look
   hung. Splitting the hot read paths into a small second deployment is therefore worth about
   **2.3× on every read**, and is the single biggest remaining win.
   The probe is still deployed as an unnamed Apps Script project ("Untitled project",
   1t7Whhvy8_CjbSiRCo1YlDifoxxIGmFNLvz7adh3wEdL0v0Dsxj8d-uww). It returns only `{ok,t}` and
   touches nothing — keep it for future benchmarking or delete it, but do not be puzzled by it.

   **What did NOT work (do not repeat):** trying to pick a subset of modules for the small
   deployment by static dependency analysis. The modules are too interlinked and a naive scan
   returns "all 31 modules, 892KB" — it also produces nonsense edges (Config.gs "needing"
   Advertising.gs) because local variable names collide with other modules' identifiers. Doing
   the split properly means choosing a small set of ACTIONS and writing a purpose-built small
   backend for them, accepting that the role gate must be re-implemented and re-tested — the
   profit-visibility rule (§4.2 PROFIT_ROLES) is the thing that must not be got wrong. Start with
   `poll` (the most frequent call in the system: every 90s per signed-in user) because it returns
   only the user's own notifications and messages, so it carries no profit data and its gate is
   simply "rows addressed to me".

   Other options: (b) serve DASH_CACHE via a published CSV/gviz read — REJECTED, it would require
   giving staff Drive access to the Portal DB, which holds profit and PII; (c) prune Seed.gs
   (25KB of one-time data parsed on every request). Do NOT try comment-stripping minification
   again — a previous attempt silently dropped 47 functions and was discarded.

   Already shipped on the client, and worth knowing before adding more: read-only screens paint
   from the last answer and refresh underneath (business overview, pipeline board), and anything
   outstanding past 6s raises a "the Google server is being slow" notice so a spinner is never
   mistaken for a broken screen.
4. **Phase 6 screens exist but are thin** vs the owner's real bar: his Running Score dashboard
   (docs/reference-running-score-dashboard.html) is the design standard. view-dashboard.js was
   rebuilt to it; alerts/kpis/perf/staff/signals were agent-written and NOT visually reviewed.
5. **Anthropic credits** = £0, key installed and valid. All Phase 8 AI is parked on his money
   decision. Do not re-raise; he said later.

## Gotchas that cost hours (do not rediscover these)

- Deploy dialog: version dropdown snaps back; "New version" clicks don't register via synthetic
  events; even real clicks failed on the OLD deployment. Fresh "New deployment" worked. VERIFY BY
  CALLING /exec.
- Pane keyboard combos (⌘V/⌘Z/⌘↓) do NOT deliver to Monaco; plain typing and clicks do. Edit code
  via `monaco.editor.getModels()[0].setValue(fetch('http://localhost:8123/...'))` from a local
  CORS server; save via the toolbar disk icon.
- Typing into Google Sheets cells via the pane LOOKS saved but is NOT (server reads empty). Write
  CONFIG/data via a run-once Apps Script function instead.
- ScriptApp is banned in code — it forces an OAuth re-consent popup that cannot open in the pane
  and blocks EVERY function until granted. Triggers = owner's Chrome, Triggers screen, manually.
- rl-scan.sh must pass before any push of public/ (it caught real staff-PII leaks twice). The
  public repo history must never contain the master prompt/business docs (RL-2).
- The Sales Analysis workbooks disagree with themselves (Saif July: 1383.12 vs 1369.88). The
  dashboard shows BOTH with an amber note. Never silently pick.

## The one-paragraph truth

The foundations are genuinely solid — security, sheet contract, shadow mode, the pipeline chain —
but the product experience failed the owner: too slow, key screens shipped late or empty-handed,
and setup steps (triggers, cache, tools) left dangling behind "the owner must click" without
walking him through them at the moment it mattered. The next session should ship nothing new until
(1) the dashboard shows his real numbers, (2) the five triggers exist, (3) the six tools open, and
(4) a screen loads in under ~3s. That is the whole job.
