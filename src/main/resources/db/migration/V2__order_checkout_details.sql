ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(30);
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS shipping_cep VARCHAR(12);
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS shipping_days INTEGER;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS payment_simulation VARCHAR(30);
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS email_notification VARCHAR(220);
