-- M98M Engine — Phase C additions (applied live via the D1 HTTP API on 14 Aug 2026;
-- this file is the record so a rebuild-from-scratch replays the same shape).

-- Five eBay applications, one per selling account — the keyset rides the account row.
ALTER TABLE accounts ADD COLUMN app_id  TEXT DEFAULT '';
ALTER TABLE accounts ADD COLUMN cert_id TEXT DEFAULT '';

-- Campaign-level snapshot the */5m adsSync diffs against.
CREATE TABLE IF NOT EXISTS campaigns (
  account     TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  name        TEXT DEFAULT '',
  status      TEXT DEFAULT '',
  budget      TEXT DEFAULT '',
  synced_at   TEXT DEFAULT '',
  PRIMARY KEY (account, campaign_id)
);

-- Item-level campaign membership (req 22): which listing sits in which campaign, so
-- add/remove/bid diffs and duplicate-ACTIVE detection are D1 queries, not API loops.
CREATE TABLE IF NOT EXISTS campaign_ads (
  account     TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  listing_id  TEXT NOT NULL,
  ad_id       TEXT DEFAULT '',
  bid_pct     TEXT DEFAULT '',
  synced_at   TEXT DEFAULT '',
  PRIMARY KEY (account, campaign_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_ads_listing ON campaign_ads(account, listing_id);

-- Nightly per-account health snapshot (rollups cron) — the trend behind the live view.
CREATE TABLE IF NOT EXISTS daily_health (
  day        TEXT NOT NULL,
  account    TEXT NOT NULL,
  listings   INTEGER DEFAULT 0,
  orders_7d  INTEGER DEFAULT 0,
  revenue_7d REAL DEFAULT 0,
  loss_items INTEGER DEFAULT 0,
  json       TEXT DEFAULT '',
  PRIMARY KEY (day, account)
);
