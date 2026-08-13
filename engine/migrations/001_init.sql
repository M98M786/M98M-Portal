-- M98M Engine — D1 schema v1 (contract §2 with its three corrections).
-- Paste into the D1 console (dashboard → D1 → m98m-engine → Console) in one go.

CREATE TABLE IF NOT EXISTS users (
  email    TEXT PRIMARY KEY,
  name     TEXT DEFAULT '',
  role     TEXT DEFAULT '',
  status   TEXT DEFAULT '',
  modules  TEXT DEFAULT '',
  tools    TEXT DEFAULT '',
  super    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounts (
  name          TEXT PRIMARY KEY,
  api_enabled   INTEGER DEFAULT 0,
  oauth_ref     TEXT DEFAULT '',      -- eBay refresh token (encrypted at rest by CF)
  couriers_json TEXT DEFAULT ''
);

-- §2 correction 1: API-owned and human-owned columns are two tables, so neither
-- side can ever overwrite the other — the rule is the schema, not a promise.
CREATE TABLE IF NOT EXISTS items_api (
  item_id       TEXT PRIMARY KEY,
  account       TEXT NOT NULL,
  title         TEXT DEFAULT '',
  price         REAL DEFAULT 0,
  qty           INTEGER DEFAULT 0,
  status        TEXT DEFAULT '',
  image         TEXT DEFAULT '',
  sold_30d      INTEGER DEFAULT 0,
  api_synced_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_items_api_account ON items_api(account);

CREATE TABLE IF NOT EXISTS items_facts (
  item_id       TEXT PRIMARY KEY,
  account       TEXT DEFAULT '',
  source        TEXT DEFAULT 'SHEET',  -- API | SHEET chip (G-2)
  ali_cost      REAL DEFAULT 0,
  sup1 TEXT DEFAULT '', sup2 TEXT DEFAULT '', sup3 TEXT DEFAULT '',
  sup1_link TEXT DEFAULT '', sup2_link TEXT DEFAULT '', sup3_link TEXT DEFAULT '',
  current_sup   TEXT DEFAULT '',
  oe            REAL DEFAULT 0,        -- Brain v17, computed at write time
  profit        REAL DEFAULT 0,
  roi           REAL DEFAULT 0,
  margin        REAL DEFAULT 0,
  avg_profit_7d REAL DEFAULT 0,
  campaign_name TEXT DEFAULT '',
  campaign_type TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  enriched_by   TEXT DEFAULT '',
  enriched_at   TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_items_facts_account ON items_facts(account);

CREATE TABLE IF NOT EXISTS orders (
  order_id   TEXT PRIMARY KEY,
  account    TEXT NOT NULL,
  item_id    TEXT DEFAULT '',
  variation  TEXT DEFAULT '',
  sold       REAL DEFAULT 0,
  cost       REAL DEFAULT 0,
  ali_order  TEXT DEFAULT '',
  ali_link   TEXT DEFAULT '',
  tracking   TEXT DEFAULT '',
  courier    TEXT DEFAULT '',
  status     TEXT DEFAULT '',
  buyer      TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_account_created ON orders(account, created_at);

CREATE TABLE IF NOT EXISTS trackings (
  order_id        TEXT PRIMARY KEY,
  tracking        TEXT DEFAULT '',
  courier_ebay    TEXT DEFAULT '',
  pushed_at       TEXT DEFAULT '',
  push_status     TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account     TEXT NOT NULL,
  campaign    TEXT DEFAULT '',
  item_id     TEXT DEFAULT '',
  change_type TEXT DEFAULT '',
  old         TEXT DEFAULT '',
  new         TEXT DEFAULT '',
  actor       TEXT DEFAULT '',        -- ONLY when the change went through the portal (honesty rule)
  at          TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_campev_account_at ON campaign_events(account, at);

CREATE TABLE IF NOT EXISTS ads_daily (
  account TEXT NOT NULL, item_id TEXT NOT NULL, date TEXT NOT NULL,
  spend REAL DEFAULT 0, clicks INTEGER DEFAULT 0, sales INTEGER DEFAULT 0, cpq REAL DEFAULT 0,
  PRIMARY KEY (account, item_id, date)
);

CREATE TABLE IF NOT EXISTS sales_daily (
  account TEXT NOT NULL, date TEXT NOT NULL,
  sold REAL DEFAULT 0, oe REAL DEFAULT 0, cost REAL DEFAULT 0, ads REAL DEFAULT 0,
  profit REAL DEFAULT 0,                -- served to PROFIT_ROLES only, stripped at the edge
  PRIMARY KEY (account, date)
);

CREATE TABLE IF NOT EXISTS cases (
  case_id TEXT PRIMARY KEY, account TEXT NOT NULL, kind TEXT DEFAULT '',
  order_id TEXT DEFAULT '', item_id TEXT DEFAULT '', buyer TEXT DEFAULT '',
  reason TEXT DEFAULT '', status TEXT DEFAULT '', opened_at TEXT DEFAULT '',
  closed_at TEXT DEFAULT '', payload_json TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cases_account ON cases(account, status);

CREATE TABLE IF NOT EXISTS buyer_messages (
  msg_id TEXT PRIMARY KEY, account TEXT NOT NULL, buyer TEXT DEFAULT '',
  text TEXT DEFAULT '', received_at TEXT DEFAULT '', answered INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account TEXT NOT NULL, item_id TEXT DEFAULT '',
  type TEXT DEFAULT '', text TEXT DEFAULT '', at TEXT DEFAULT '', ack_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL, severity TEXT DEFAULT '', title TEXT DEFAULT '',
  body TEXT DEFAULT '', item_id TEXT DEFAULT '', action_url TEXT DEFAULT '',
  day TEXT DEFAULT '', dedupe_key TEXT DEFAULT '', created TEXT DEFAULT '', ack_at TEXT DEFAULT ''
);
-- §2 correction 2: dedupe is a constraint, not a code path.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_dedupe ON notifications(day, dedupe_key, to_email);

CREATE TABLE IF NOT EXISTS auto_msgs (
  account TEXT NOT NULL, trigger_kind TEXT NOT NULL,
  template TEXT DEFAULT '', delay_min INTEGER DEFAULT 0, enabled INTEGER DEFAULT 0,
  PRIMARY KEY (account, trigger_kind)
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT DEFAULT '', action TEXT DEFAULT '', target TEXT DEFAULT '',
  old TEXT DEFAULT '', new TEXT DEFAULT '', at TEXT DEFAULT ''
);

-- §2 correction 3: every cron job is resumable and its health is visible.
CREATE TABLE IF NOT EXISTS sync_state (
  job TEXT NOT NULL, account TEXT NOT NULL DEFAULT '',
  cursor TEXT DEFAULT '', last_ok TEXT DEFAULT '', last_error TEXT DEFAULT '',
  PRIMARY KEY (job, account)
);
