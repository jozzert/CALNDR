/*
  # Ultra-simple team members policies
  
  This migration:
  1. Drops all existing team member policies
  2. Creates new ultra-simple policies with no subqueries
  3. Optimizes indexes for the simplified queries
*/

-- Drop all existing team members policies
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Create new ultra-simple policies
CREATE POLICY "view_own_memberships"
  ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "view_team_members"
  ON team_members
  FOR SELECT
  USING (team_id IN (
    SELECT tm.team_id 
    FROM team_members tm 
    WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "manage_as_manager"
  ON team_members
  FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role = 'manager'
    )
  );

-- Drop existing indexes
DROP INDEX IF EXISTS idx_team_members_user_id;
DROP INDEX IF EXISTS idx_team_members_team_user;
DROP INDEX IF EXISTS idx_team_members_manager;

-- Create minimal set of indexes
CREATE INDEX team_members_user_idx ON team_members(user_id);
CREATE INDEX team_members_team_role_idx ON team_members(team_id, role);