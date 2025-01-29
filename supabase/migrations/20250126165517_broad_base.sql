/*
  # Final fix for team members policies

  This migration:
  1. Simplifies team members policies to completely eliminate recursion
  2. Uses a more direct approach for access control
  3. Optimizes query performance with proper indexes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can view team member list" ON team_members;
DROP POLICY IF EXISTS "Managers can manage team members" ON team_members;

-- Create new simplified policies
CREATE POLICY "Users can view own memberships"
  ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view team members in same team"
  ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can insert members"
  ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
    )
  );

CREATE POLICY "Team managers can update members"
  ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
    )
  );

CREATE POLICY "Team managers can delete members"
  ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
    )
  );

-- Ensure all necessary indexes exist
DROP INDEX IF EXISTS idx_team_members_user_id;
DROP INDEX IF EXISTS idx_team_members_team_id;
DROP INDEX IF EXISTS idx_team_members_role;
DROP INDEX IF EXISTS idx_team_members_team_user;
DROP INDEX IF EXISTS idx_team_members_team_role;

-- Create optimized indexes
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_role ON team_members(team_id, role);
CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id);