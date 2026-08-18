-- eBay's own per-line ship-by deadline. The portal had been inventing it as order date + 5 days
-- for every order alike, which is not the handling time eBay promised the buyer.
ALTER TABLE orders ADD COLUMN ship_by TEXT DEFAULT '';
