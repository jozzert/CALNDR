/*
  # Fix team members policies with temporary tables
  
  This migration:
  1. Creates helper functions to avoid policy recursion
  2. Implements completely separated policies
  3. Uses temporary tables to break circular dependencies
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "view_own_memberships" ON team_members;
DROP POLICY IF EXISTS "view_team_members" ON team_members;
DROP POLICY IF EXISTS "manage_as_manager" ON team_members;

-- Create helper function to get user's teams
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid uuid)
RETURNS TABLE (team_id uuid) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = user_uuid;
END;
$$;

-- Create helper function to check if user is team manager
CREATE OR REPLACE FUNCTION is_team_manager(user_uuid uuid, team_uuid uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = user_uuid
    AND tm.team_id = team_uuid
    AND tm.role = 'manager'
  );
END;
$$;

-- Create new policies using helper functions
CREATE POLICY "select_own_membership"
  ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "select_team_members"
  ON team_members
  FOR SELECT
  USING (team_id IN (SELECT get_user_teams(auth.uid())));

CREATE POLICY "insert_as_manager"
  ON team_members
  FOR INSERT
  WITH CHECK (is_team_manager(auth.uid(), team_id));

CREATE POLICY "update_as_manager"
  ON team_members
  FOR UPDATE
  USING (is_team_manager(auth.uid(), team_id));

CREATE POLICY "delete_as_manager"
  ON team_members
  FOR DELETE
  USING (is_team_manager(auth.uid(), team_id));

-- Drop existing indexes
DROP INDEX IF EXISTS team_members_user_idx;
DROP INDEX IF EXISTS team_members_team_role_idx;

-- Create optimized indexes for the new approach
CREATE INDEX idx_team_members_user_lookup ON team_members(user_id);
CREATE INDEX idx_team_members_team_manager ON team_members(team_id, user_id, role);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_teams TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_manager TO authenticated;