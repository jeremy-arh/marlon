-- Allow creation of organizations during setup (when no super admin exists)
-- This policy allows anyone to create an organization if no super admin exists
CREATE POLICY "Allow organization creation during setup"
  ON organizations FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM user_roles WHERE is_super_admin = true
    )
  );

-- Allow creation of user_roles during setup
CREATE POLICY "Allow user role creation during setup"
  ON user_roles FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM user_roles WHERE is_super_admin = true
    )
  );

-- Allow creation of user_permissions during setup
CREATE POLICY "Allow permission creation during setup"
  ON user_permissions FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM user_roles WHERE is_super_admin = true
    )
  );
