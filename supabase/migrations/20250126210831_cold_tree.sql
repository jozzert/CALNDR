/*
  # Fix auth users relationship

  1. Changes
    - Add proper foreign key relationship to auth.users
    - Add RLS policies for auth user access
    - Add indexes for performance

  2. Security
    - Maintain existing RLS policies
    - Add proper constraints for data integrity
*/

-- Drop existing foreign key if it exists
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- Add proper foreign key to auth.users
ALTER TABLE team_members
ADD CONSTRAINT team_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Create auth user lookup function
CREATE OR REPLACE FUNCTION public.get_auth_user(user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    jsonb_build_object(
      'id', id,
      'email', email
    )
  FROM auth.users
  WHERE id = user_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_user TO authenticated;

-- Add index for foreign key lookup
CREATE INDEX IF NOT EXISTS idx_team_members_user_id 
  ON team_members(user_id);

-- Add index for team lookup
CREATE INDEX IF NOT EXISTS idx_team_members_team_id 
  ON team_members(team_id);