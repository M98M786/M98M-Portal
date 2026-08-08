# M98M Company Portal

One portal for M98M LTD (UK eBay dropshipping · Glasgow) — synchronized staff working, task giving, database, and business overview for Management.

**Owner:** Hasib (this repo must live on Hasib's personal GitHub account).
**Built by:** Claude Code, phase by phase, against `docs/M98M-Portal-Master-Prompt.md` (the single source of truth).

## Structure

| Path | What it is |
|---|---|
| `index.html` | The whole portal frontend — ONE single file, served by GitHub Pages |
| `assets/logo.png` | Company logo (drop the PNG here — until then the portal shows an M98M wordmark) |
| `apps-script/` | Google Apps Script backend (`Code.gs` + friends) — paste into script.google.com or push with clasp |
| `embeds/` | Existing tools embedded in the portal: Listing Tool, eBay Defense Agent v1.8, CS Reply Agent v1.7 |
| `docs/` | The master prompt (spec) and the Royal design preview (pixel reference) |

## The Sheet Contract (absolute)

Existing Google Sheets never change structure. The portal is an input/output layer: it reads documented columns and writes only whitelisted columns. Portal-only data lives in the "M98M Portal DB" spreadsheet.

## Status

- [x] Phase 0 — Workspace (this repo; Pages pending Hasib's GitHub steps)
- [ ] Phase 1 — Database & connections
- [ ] Phase 2 — Auth & shell (Royal design)
- [ ] Phase 3 — Core loop (tasks, reports, rota, DMs, agenda, meetings)
- [ ] Phase 4 — Product pipeline
- [ ] Phase 5 — Departments (Advertising, Orders, CS)
- [ ] Phase 6 — Management (dashboards, alerts, performance)
- [ ] Phase 7 — Integrity & pilot
- [ ] Phase 8 — AI completion (Monthly Audit Agent)
