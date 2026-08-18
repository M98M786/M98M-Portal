-- 19 Aug — the Main Sheet's supplier links and category were being read by nobody.
-- sup*_link already existed (001) but nothing ever wrote them; category is new and is what the
-- Order Earning calculator needs to pick the right final-value-fee band per listing.
ALTER TABLE items_facts ADD COLUMN category TEXT DEFAULT '';
