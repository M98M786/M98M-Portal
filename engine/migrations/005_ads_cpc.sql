-- eBay refuses (35122) to mix Promoted Listings STANDARD and ADVANCED (CPC) metrics in one
-- report. Each account now files one report per family per day, and the two land in separate
-- columns so neither overwrites the other. Spend anywhere = spend + cpc_spend.
ALTER TABLE ads_daily ADD COLUMN cpc_spend REAL DEFAULT 0;
ALTER TABLE ads_daily ADD COLUMN cpc_clicks INTEGER DEFAULT 0;
ALTER TABLE ads_daily ADD COLUMN cpc_sales INTEGER DEFAULT 0;
ALTER TABLE ad_report_tasks ADD COLUMN family TEXT DEFAULT 'std';
