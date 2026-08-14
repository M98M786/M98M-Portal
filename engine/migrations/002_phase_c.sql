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

-- Adversarial-review fixes (14 Aug): per-campaign ads freshness, real units per order,
-- durable notification queue (delivery is the fact, not the attempt), and D1-backed
-- duplicate confirmation state (KV writes are capped at 1k/day on the free plan).
ALTER TABLE campaigns ADD COLUMN ads_synced_at TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN qty INTEGER DEFAULT 1;
-- eBay's own estimated-delivery window (maxEstimatedDeliveryDate) — no delivery scans exist in
-- the API, so "arrived" everywhere in this portal means "eBay's estimate has passed".
ALTER TABLE orders ADD COLUMN est_delivery TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS notify_queue (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_addr    TEXT DEFAULT '',
  type       TEXT DEFAULT '',
  message    TEXT DEFAULT '',
  ref        TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  tries      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dup_state (
  account     TEXT NOT NULL,
  listing_id  TEXT NOT NULL,
  first_seen  TEXT DEFAULT '',     -- ms epoch; alert only after 90 min continuously duplicated
  alerted_day TEXT DEFAULT '',     -- UK day of the last feed entry for this item
  PRIMARY KEY (account, listing_id)
);

-- Ads spend report tasks (eBay's report API is async: create nightly, poll hourly, ingest
-- into ads_daily + sales_daily.ads — CPQ becomes real numbers, not projections).
CREATE TABLE IF NOT EXISTS ad_report_tasks (
  account     TEXT NOT NULL,
  task_id     TEXT NOT NULL,
  report_date TEXT DEFAULT '',    -- the UK day the report covers
  status      TEXT DEFAULT '',    -- PENDING → SUCCESS/FAILED → INGESTED
  error       TEXT DEFAULT '',
  created_at  TEXT DEFAULT '',
  PRIMARY KEY (account, task_id)
);

-- Phase D: the CS feeds and the auto-message engine. The UNIQUE ref index is the whole
-- "one event, one message, ever" guarantee — a constraint, not a code path (001's own rule).
CREATE TABLE IF NOT EXISTS cs_standards (
  account   TEXT PRIMARY KEY,
  json      TEXT DEFAULT '',
  synced_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS automsg_queue (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  account      TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  ref          TEXT NOT NULL,       -- the event's identity: fb:<id>, ret:<id>, ship:<order>…
  buyer        TEXT DEFAULT '',
  order_id     TEXT DEFAULT '',
  item_id      TEXT DEFAULT '',
  body         TEXT DEFAULT '',
  due_at       TEXT DEFAULT '',
  status       TEXT DEFAULT 'QUEUED',  -- QUEUED → SENDING → SENT/FAIL · SHADOW · CANCELLED
  detail       TEXT DEFAULT '',
  created_at   TEXT DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_automsg_ref ON automsg_queue(account, trigger_kind, ref);

-- Buyer messages carry the item so a reply channel exists (AAQToPartner needs an ItemID).
ALTER TABLE buyer_messages ADD COLUMN item_id TEXT DEFAULT '';

-- Real eBay fees per order (financeSync, post-re-consent) — drift alerts compare against
-- the sheet's own expectation (sold − OE×units).
ALTER TABLE orders ADD COLUMN ebay_fees REAL DEFAULT 0;

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
