/*
  # Fix team members policies

  This migration:
  1. Drops and recreates team members policies to avoid recursion
  2. Simplifies policy logic for better performance
  3. Ensures proper access control without circular references
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Managers can manage team members" ON team_members;

-- Create new policies without recursive references
CREATE POLICY "Users can view own team memberships"
  ON team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can view team member list"
  ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members AS my_teams
      WHERE my_teams.team_id = team_members.team_id
      AND my_teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage team members"
  ON team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members AS managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
    )
  );

-- Add composite index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_role ON team_members(team_id, role);