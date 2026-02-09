-- Add contract_start_date to order_tracking table
ALTER TABLE order_tracking
ADD COLUMN IF NOT EXISTS contract_start_date DATE;
