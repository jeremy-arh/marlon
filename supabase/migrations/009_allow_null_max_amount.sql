-- Allow NULL for max_amount in leaser_coefficients to represent infinity
ALTER TABLE leaser_coefficients
  ALTER COLUMN max_amount DROP NOT NULL;

-- Drop the old unique constraint
ALTER TABLE leaser_coefficients
  DROP CONSTRAINT IF EXISTS leaser_coefficients_leaser_id_min_amount_max_amount_duration_id_key;

-- Create a new unique constraint that handles NULL properly
-- PostgreSQL treats NULL as distinct, so we can have multiple rows with NULL max_amount
-- as long as other fields differ
CREATE UNIQUE INDEX leaser_coefficients_unique_range 
  ON leaser_coefficients (leaser_id, duration_id, min_amount, max_amount);
