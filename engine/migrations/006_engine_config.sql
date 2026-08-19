-- Small key-value home for the Engine's own operational material (the eBay signing key lives
-- here, minted by the Worker itself — the same trust level as the OAuth tokens in accounts).
CREATE TABLE IF NOT EXISTS engine_config (k TEXT PRIMARY KEY, v TEXT NOT NULL DEFAULT '');
