-- Add first_name and last_name to user_invitations for super admin invitations
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS last_name TEXT;
