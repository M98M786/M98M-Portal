# HANDOVER-LOG — the shared brain of the two Claudes

Both Claudes write this file and both read it: MAC is the primary and owns every standing duty; WINDOWS is the backup,
for portal updates when Hasib asks and for taking over only when Hasib says so. One dated entry per change or finding,
newest at the BOTTOM. Each entry carries: date/time UTC · MAC or WINDOWS · what was done · files and commits · what was
verified · what is still open · any new rule Hasib gave. A change is not finished until its entry is pushed to main.
This repo is public: no secret, token id, IP address or email ever goes in here.

---

## 2026-11-12 15:50 UTC · WINDOWS · Backup Claude set up, keyed verification done, two flags recorded, standby

**What was done.** A third machine (a Windows 10 PC) was set up from the 11 Nov knowledge-transfer package as the
BACKUP Claude: all 12 repos cloned on `main` (Portal at `7457168`), the 14 non-git work folders copied, the Mac's 129
memory files installed plus a device memory file, `~/.m98m` rebuilt with the ten scripts and the three key files
(placed by Hasib 15:10 UTC, zip deleted after extraction). Windows adaptations: portable Node 20 and gh, MinGit (its
`core.autocrlf=true` default undone, because a CRLF `engine/worker.js` fails every byte-diff against the live engine),
per-user Python 3.12, a Node shim that runs `scripts/adtool-test.js` (PASS 1452/1452), `node --check` in place of the
JXA syntax check, `adtool-sqlcheck.py` OK, and `verify-day1.py` for the read-only first-day checklist. No scheduled
task, watch loop or scheduled Claude session was created. Nothing live was touched.

**Files and commits.** This file (new) and one CHANGELOG line. Nothing else in the repo changed; `rank-lab/` stays
untracked as on the Mac.

**What was verified (12 Nov 15:11 UTC, read-only, doc 24 §16).** `version.txt` 20261111-2234 = origin/main;
`enginePing` ok; credential-free probe → "unknown action"; `backupDump` 40 tables; `runJobKey` with a bogus name
printed the 52-job whitelist and ran nothing; `sync_state` 488 rows, newest `last_ok` 0 min old, all 22 cron slots
beating on cadence, `orderSync` fresh for all 8 accounts with no error, `securitySweep` clean at 02:11; Cloudflare token
active, 5 workers, engine 12 bindings with the office-IP gate armed and every secret present, 22 crons registered ==
`engine/crons.json`; rank lab 401 without key and 200 with key, quota works; messages mode live, listing 5,309 log
items / 498 galleries / 9 members, calculator 15 users / 4 assets; Apps Script `/exec` ok; engine-guard runs green.
Differences from the 11 Nov package: 22 cron slots (the doc said 21); calculator 15 users (14); listing 9 members (8).

**Still open (recorded, NOT acted on — standing duties belong to the Mac).**
1. `selfTest` 12 Nov 02:11 UTC = "18 checks, 4 failed" (package baseline: 2 failed, standing since 5 Oct). The four,
   read from `notif_live` refs: books-carry-the-0-8-law for 10 Nov and for 11 Nov, every-account-feed-is-alive,
   nightly-Sheets-backup-fresh. All four slugs rang on other nights in the last 30 days; no new slug.
2. `sheetBackup` 11 Nov 23:10:56 UTC stopped at 23 of 49 tables (192,165 rows) with a `TIME:portal:…` tail (USERS,
   TASKS, SCHEDULES, ATTENDANCE, MEETINGS, DAILY_AGENDA, MESSAGES and onward); no retry stamp by 15:11 UTC. The Mac's
   05:30 sheet-backup guard owns the retry; left to it.

**New rules from Hasib (12 Nov).** WINDOWS = backup, MAC = primary; standing duties never run on Windows unless Hasib
activates it in words ("Mac is down, you are primary until I say otherwise"); this log is the sync channel: every
change = own memory file + log entry + CHANGELOG line + push to main; one Claude in the code at a time (git status and
`git log origin/main -3` first; ask if the Mac pushed within the hour or the tree is dirty); account scope: Yaseen Bhai
and Rabia Masood freely, ask before touching the other six accounts' listings or ads; a PAUSED or ARCHIVED CPC ad means
the desks own that listing, leave it.

**State.** WINDOWS STANDBY.
