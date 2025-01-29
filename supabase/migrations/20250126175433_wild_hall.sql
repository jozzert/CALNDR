/*
  # Add foreign key relationship to auth.users

  1. Changes
    - Add foreign key relationship between team_members.user_id and auth.users.id
    - Add index on user_id for better performance
*/

-- Add foreign key relationship to auth.users
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS team_members_user_id_fkey,
ADD CONSTRAINT team_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add index for the foreign key
CREATE INDEX IF NOT EXISTS idx_team_members_user_id 
  ON team_members(user_id);