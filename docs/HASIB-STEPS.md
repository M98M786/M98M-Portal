# Hasib's Steps — everything the portal needs from you

Claude Code does all the building. These are the only things it cannot do for you, in the order they come up. Every step is click-by-click. If a question appears and you are happy with the suggestion, just answer **"default"**.

---

## Step 1 — Sign Claude into GitHub (needed to publish the portal)

The GitHub helper tool (`gh`) is not on this Mac yet, and Node.js on this Mac is broken, so we use the official installer:

1. Open Safari and go to: **https://cli.github.com**
2. Click the purple **Download for Mac** button, choose the **macOS installer (.pkg)** for Intel.
3. Open the downloaded file and click **Continue → Install** (it will ask for your Mac password — type it yourself).
4. When it finishes, tell Claude "gh installed". Claude will then run the sign-in command and show you a code.
5. A browser page will open (github.com/login/device). Sign in to **your own GitHub account**, type the code Claude shows you, click **Authorize**.

That's it — Claude then creates the `M98M-Portal` repository on your account, pushes everything, and turns on GitHub Pages itself.

## Step 2 — Create the portal database (one time, ~5 minutes)

1. Open **script.google.com** in Chrome, signed in as **mrhasibullah91@googlemail.com**.
2. Click **+ New project**. Name it **M98M Portal Backend** (click "Untitled project" at the top to rename).
3. Claude will give you the code files. For each one: delete what's in the editor, paste, press **⌘S**.
4. In the toolbar dropdown (next to "Debug"), choose **setupDatabase**, press **Run**, and click **Allow** on the permission screens (choose your mrhasibullah91 account).
5. Click **Deploy → New deployment → gear icon → Web app**. Set *Execute as:* **Me** · *Who has access:* **Anyone**. Click **Deploy**.
6. Copy the **Web app URL** (ends in `/exec`) and paste it to Claude.

## Step 3 — Paste the registry ID (10 seconds)

Open your **Central Sheets** registry spreadsheet in Chrome. The address bar shows
`https://docs.google.com/spreadsheets/d/LONG-CODE-HERE/edit`.
Copy the LONG-CODE-HERE part and paste it to Claude (or into the portal's admin screen when Claude shows you where).

## Step 4 — Anthropic API key (Phase 1, makes the AI live from day 1)

1. Go to **console.anthropic.com**, sign in, click **API Keys → Create Key**, name it `m98m-portal`.
2. Copy the key (starts with `sk-ant-`). **Never paste it to Claude or into chat.**
3. In the Apps Script editor: **Project Settings (gear icon) → Script Properties → Add script property**.
   Property name: `ANTHROPIC_API_KEY` · Value: paste the key → **Save**.

## Step 4b — Switch on staff sign-in (Google OAuth Client ID) — **the one thing blocking Phase 2**

Claude has built the login screen and the whole backend; it cannot finish this step because Google asks *you* to accept its Terms of Service.

1. In the **pane**, the Google Cloud page is already open (Google Auth Platform → Overview), signed in as m98m786.
2. Tick the box **"I agree to the Google Cloud Platform Terms of Service"** (leave the emails box unticked if you prefer), then click **Agree and continue**.
3. Say **"done"** — Claude does the rest itself: creates the project, configures the consent screen, creates the Web-app Client ID with `https://m98m786.github.io` as the allowed origin, and writes it into the portal's CONFIG.

Nothing to copy or paste, and no payment: this is the free tier — creating a sign-in credential costs nothing.

## Step 4c — Switch on the three background jobs (5 minutes, only you can do this)

The portal has three jobs that run on their own: one marks a 2-hourly report **missed** when nobody files it (this is the accountability spine — without it a missing report looks the same as one that isn't due yet), one nudges Management when a submitted task sits un-approved, and one generates each day's recheck rows.

There is **no `installTriggers` function** — an earlier version of this guide said there was, and that was wrong. Creating them in code would have forced a Google permission that blocks every other function, so they are created from the Apps Script screen instead, which needs no extra permission.

In your own Chrome (not the Claude window — Google's permission popup won't open there):

1. **script.google.com** → open **M98M Portal Backend**
2. Left sidebar → the **clock icon** (Triggers) → **+ Add Trigger** (bottom right)
3. Set: Function **runMissedCheckpointSweep** · Deployment **Head** · Event source **Time-driven** · **Hour timer** · **Every hour** → **Save** → **Allow** if asked
4. **Add Trigger** again for **runSubmissionEscalationSweep**, same settings
5. **Add Trigger** once more for **generateRecheckRows**, but choose **Day timer** and a time early in the shift

You'll know it worked when the Triggers list shows three rows. Everything else in the portal works without them.

## Step 5 — Approve staff and set the rota

When the portal is live, sign in with your Google account, open **Admin → Approvals**, approve each staff member, and set their shift in the **Rota** screen. Claude will walk you through it on screen.

## The ask-list (Claude asks each at its phase — "default" is always an accepted answer)

| # | Question | Default |
|---|---|---|
| OPEN-1 | Rabia Masood — new account opening? | ask |
| OPEN-2a | Ubaid Kaleem's portal version | Team-Lead dept |
| OPEN-3 | Hide Order Earning from Order Processors? | visible (as today) |
| OPEN-4 | 2-hourly checkpoint times | Shift 1: 4:15/6:30/8:30/11:15 PM · Shift 2: 11 PM/1/4/6 AM |
| OPEN-5 | Potential-CPC routing after approval | auto cpc_research task → Zain switches campaign |
| OPEN-6 | Staff see their own manual evaluation? | no |
| OPEN-7 | Ops Head keeps approval rights? | yes |
| OPEN-9 | Husnain reconciliation view from month 1? | yes |
| OPEN-10 | DMs fully private (no management reading UI)? | yes |

## Logo — ✅ received 8 Aug

`assets/logo.png` is installed, with the cart-mark cropped for favicon and app icons. Nothing more needed.

## One decision for Step 1 — public or private repo

GitHub Pages on a **free** account only works on **public** repos. The portal page itself is safe to be public (it contains no data — all business data stays behind Google sign-in in Apps Script). But your master prompt and business documents are **not** safe to publish, so:

- **Default (free):** the repo goes public with ONLY the portal files (index.html, assets, embeds). The master prompt and internal docs stay on this Mac, out of the public repo.
- **Alternative (£3–4/month):** GitHub Pro allows Pages on a **private** repo — then everything can live together privately.

Claude will ask you once at push time; answering **"default"** picks the free option.
