-- Storage buckets creation script
-- Note: Supabase Storage buckets cannot be created via SQL directly
-- This file documents the buckets that need to be created
-- Use the Supabase Dashboard or API to create these buckets

-- Buckets to create:
-- 1. product-images - Public bucket for product images
-- 2. category-images - Public bucket for category images  
-- 3. contracts - Private bucket for leasing contracts (only accessible by admins and organization members)
-- 4. invoices - Private bucket for organization invoices (only accessible by organization members)
-- 5. static-assets - Public bucket for static assets (logo, favicon, etc.)

-- Storage policies will be created in a separate migration file
