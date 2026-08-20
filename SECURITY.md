# M98M Portal — Daily Security Plan

*Effective 21 Aug 2026. Owner: Zaid (manager) · Director: Hasib Ullah.*

## What the machine does EVERY DAY (automatic, no one has to remember)

The **nightly security sweep** runs at 2 AM UK inside the Engine and letters management on any finding (Alerts centre → type "Security"). Every night it:

1. **Purges expired sessions** and flags malformed tokens or any account holding 15+ live sessions (a possible stolen-token pattern).
2. **Verifies the admin allowlist** — only the director's and manager's accounts may hold super rights; any new admin appearing rings the loudest bell the portal has.
3. **Diffs every user against yesterday** — a changed role, a changed super flag, or a new approval is reported by name. Nobody can quietly promote themselves.
4. **Confirms all five API secrets are present** on the Engine (a deploy that wiped them would be caught the same night).
5. **Checks the CORS allowlist is exactly the two portal origins** — any drift means a deploy mistake or tampering.
6. **Reads the failed-login counter** — every refused call all day is counted; a spike (>50) means someone is probing and management is told.

Also standing from earlier: the 16-check validation battery (data integrity), feed watchdogs (dead tokens), and the catch-up sentinel (missed jobs self-heal). Failures = letters, never silence.

## What a HUMAN checks (2 minutes, with the morning tea)

Daily — either of you:
- Open **Alerts centre** → any red "Security" letters? Act on them first.
- Glance at **Account health** → all syncs green.

Weekly — Zaid:
- **Staff & accounts**: does every listed person still work here, with the right role? Leavers are removed the same day they leave.
- **Namecheap + Google**: no unfamiliar DNS records on m98mltd.co.uk; OAuth client still lists exactly the two portal origins.
- Press **"Security sweep now"** on Account health → Engine ops after any staffing or settings change, instead of waiting for the night.

## The standing rules that keep the portal hard to hurt

- **Sign-in is Google-only** — the portal stores no passwords at all; account security = Google account security. Staff company accounts should have 2-step verification on (Zaid verifies when onboarding).
- **Roles are enforced server-side** — profit data physically never leaves the Engine for a role that may not see it (Team Lead exclusion included). The screen is a viewer, not a gate.
- **Sessions live 7 days, are 64-hex random, and die on sign-out**; expired ones are purged nightly.
- **Tools run in a sealed sandbox** — an embedded tool cannot read the portal's storage, tokens, or call the backend as the user.
- **No third-party JavaScript** — the only external code is Google Sign-In itself; there are no npm packages, no CDNs, nothing to supply-chain.
- **Secrets never leave Cloudflare** — eBay keys and the sync key exist only as Worker secrets; deploys preserve them by contract (`keep_bindings`).
- **Every deploy self-announces** (build stamp + auto-reload), so a tampered or stale bundle can't linger unnoticed, and every deploy is compile-checked before being declared done.

## The Night Watch (R5 — nightly, run by Claude on the office Mac)

Every night at 03:30 UK (07:30 PKT), a scheduled Claude session inspects the whole portal and reviews the code — beyond what the in-engine battery can see:

1. **Backup verification** — the Sheets backup stamped and healthy; local .xlsx copies exported and pruned.
2. **Full-portal inspection** — live build serves and *compiles*, engine and domain answer, every sync job fresh, every account's order feed alive, unhandled letters counted, session table scanned for anomalies.
3. **Line-by-line code review** — every line changed in the last day is read; on quiet nights a rotating deep-read covers the entire engine + frontend once a week. Anything suspicious or improvable letters Management the same night ("inform me earlier" — recommendations arrive before they become problems).
4. **A morning brief letter every night** — silence is never the signal; the letter says "all clear" or names findings.

The Mac must be awake with the Claude app open for the watch to run; a missed night runs on next launch, and the in-engine battery + securitySweep (which need no Mac) still cover every night regardless.

## If something looks wrong

1. Red Security letter → read it; the letter names the exact account/setting.
2. Suspected account compromise → change that person's Google password, then Account health → "Security sweep now"; sign-out from the portal kills the session server-side.
3. Suspected portal tampering → the repo is the truth: `git log` shows every change ever shipped; redeploying from the repo restores a known-good state in under two minutes.
