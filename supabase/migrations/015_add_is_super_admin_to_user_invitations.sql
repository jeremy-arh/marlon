-- Add is_super_admin to user_invitations for super admin invitation flow
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
