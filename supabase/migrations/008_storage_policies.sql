-- Storage bucket policies
-- These policies control access to files in Supabase Storage buckets

-- Note: These policies assume the buckets have been created via the Supabase Dashboard or API
-- Bucket names:
-- - product-images (public)
-- - category-images (public)
-- - contracts (private)
-- - invoices (private)
-- - static-assets (public)

-- Product Images Bucket (public read, admin write)
-- Allow public read access to product images
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow authenticated admins to upload product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to update product images
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to delete product images
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Category Images Bucket (public read, admin write)
-- Allow public read access to category images
CREATE POLICY "Public can view category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-images');

-- Allow authenticated admins to upload category images
CREATE POLICY "Admins can upload category images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'category-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to update category images
CREATE POLICY "Admins can update category images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'category-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to delete category images
CREATE POLICY "Admins can delete category images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'category-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Contracts Bucket (private, organization members only)
-- Allow users to view contracts for orders from their organization
CREATE POLICY "Users can view contracts from their organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM contracts
      JOIN orders ON orders.id = contracts.order_id
      JOIN user_roles ON user_roles.organization_id = orders.organization_id
      WHERE user_roles.user_id = auth.uid()
        AND contracts.file_url LIKE '%' || storage.objects.name || '%'
    )
  );

-- Allow admins to upload contracts
CREATE POLICY "Admins can upload contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to update contracts
CREATE POLICY "Admins can update contracts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'contracts' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to delete contracts
CREATE POLICY "Admins can delete contracts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contracts' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Invoices Bucket (private, organization members only)
-- Allow users to view invoices from their organization
CREATE POLICY "Users can view invoices from their organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM invoices
      JOIN user_roles ON user_roles.organization_id = invoices.organization_id
      WHERE user_roles.user_id = auth.uid()
        AND invoices.file_url LIKE '%' || storage.objects.name || '%'
    )
  );

-- Allow admins to upload invoices
CREATE POLICY "Admins can upload invoices"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to update invoices
CREATE POLICY "Admins can update invoices"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'invoices' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Allow admins to delete invoices
CREATE POLICY "Admins can delete invoices"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoices' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Static Assets Bucket (public read, admin write)
-- Allow public read access to static assets
CREATE POLICY "Public can view static assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'static-assets');

-- Allow authenticated admins to upload static assets
CREATE POLICY "Admins can upload static assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'static-assets' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_super_admin = true
    )
  );

-- Allow super admins to update static assets
CREATE POLICY "Super admins can update static assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'static-assets' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.is_super_admin = true
    )
  );

-- Allow super admins to delete static assets
CREATE POLICY "Super admins can delete static assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'static-assets' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.is_super_admin = true
    )
  );
