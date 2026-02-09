-- Add super_admin field to user_roles table
-- Super admins can be in multiple organizations or have a special flag
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create index for super admin lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_super_admin ON user_roles(is_super_admin) WHERE is_super_admin = true;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_super_admin.user_id
    AND user_roles.is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
