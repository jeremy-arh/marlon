-- Fix infinite recursion in RLS policies for user_roles
-- The issue is that policies try to read user_roles to check permissions,
-- which triggers the same policies, creating infinite recursion.

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Allow user role creation during setup" ON user_roles;

-- Create simpler policies that don't cause recursion
-- Users can always view their own roles (no subquery needed)
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view roles in their organization
-- But we need to avoid recursion, so we'll use a function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION user_has_admin_role_in_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role = 'admin'
  );
END;
$$;

CREATE POLICY "Admins can view roles in their organization"
  ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_has_admin_role_in_org(organization_id)
  );

-- Allow admins to manage roles in their organization
CREATE POLICY "Admins can manage roles in their organization"
  ON user_roles FOR ALL
  USING (
    user_id = auth.uid() OR
    user_has_admin_role_in_org(organization_id)
  );

-- Allow creation during setup (when no super admin exists)
-- Use a function to avoid recursion
CREATE OR REPLACE FUNCTION no_super_admin_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_roles WHERE is_super_admin = true
  );
END;
$$;

CREATE POLICY "Allow user role creation during setup"
  ON user_roles FOR INSERT
  WITH CHECK (no_super_admin_exists());

-- Fix the setup policies for organizations and permissions too
DROP POLICY IF EXISTS "Allow organization creation during setup" ON organizations;
DROP POLICY IF EXISTS "Allow permission creation during setup" ON user_permissions;

CREATE POLICY "Allow organization creation during setup"
  ON organizations FOR INSERT
  WITH CHECK (no_super_admin_exists());

CREATE POLICY "Allow permission creation during setup"
  ON user_permissions FOR INSERT
  WITH CHECK (no_super_admin_exists());

-- Fix policies that reference user_roles in subqueries
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;

CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  USING (user_id = auth.uid() OR user_has_admin_role_in_org(organization_id));

CREATE POLICY "Admins can manage permissions"
  ON user_permissions FOR ALL
  USING (user_id = auth.uid() OR user_has_admin_role_in_org(organization_id));

-- Fix organization policy
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND organization_id = org_id
  );
END;
$$;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (user_belongs_to_org(id));

-- Fix order policies
DROP POLICY IF EXISTS "Users can view orders from their organization" ON orders;
DROP POLICY IF EXISTS "Users with can_create_orders can create orders" ON orders;

CREATE POLICY "Users can view orders from their organization"
  ON orders FOR SELECT
  USING (user_belongs_to_org(organization_id));

CREATE POLICY "Users with can_create_orders can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    user_belongs_to_org(organization_id) AND
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND organization_id = orders.organization_id
        AND can_create_orders = true
    )
  );

-- Fix order items policy
DROP POLICY IF EXISTS "Users can view order items from their organization" ON order_items;

CREATE POLICY "Users can view order items from their organization"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND user_belongs_to_org(orders.organization_id)
    )
  );

-- Fix notifications policy
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND user_belongs_to_org(organization_id))
  );

-- Fix invoices policy
DROP POLICY IF EXISTS "Users can view invoices from their organization" ON invoices;

CREATE POLICY "Users can view invoices from their organization"
  ON invoices FOR SELECT
  USING (user_belongs_to_org(organization_id));
