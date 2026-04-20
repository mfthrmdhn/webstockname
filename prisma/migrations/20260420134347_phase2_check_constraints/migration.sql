ALTER TABLE products ADD CONSTRAINT store_qty_non_negative CHECK (store_qty >= 0);
ALTER TABLE products ADD CONSTRAINT warehouse_qty_non_negative CHECK (warehouse_qty >= 0);
