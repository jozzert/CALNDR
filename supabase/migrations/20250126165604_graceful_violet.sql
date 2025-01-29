/*
  # Simplified team members policies

  This migration:
  1. Uses the simplest possible policy structure to prevent recursion
  2. Separates read and write policies completely
  3. Uses direct user ID comparisons instead of subqueries where possible
*/

-- Drop all existing team members policies to start fresh
DROP POLICY IF EXISTS "Users can view own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can view team members in same team" ON team_members;
DROP POLICY IF EXISTS "Team managers can insert members" ON team_members;
DROP POLICY IF EXISTS "Team managers can update members" ON team_members;
DROP POLICY IF EXISTS "Team managers can delete members" ON team_members;

-- Create new ultra-simple policies
CREATE POLICY "Read own membership"
  ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Read team memberships"
  ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT DISTINCT team_id
      FROM team_members base
      WHERE base.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers insert"
  ON team_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id
      FROM team_members
      WHERE team_id = team_members.team_id
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers update"
  ON team_members
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id
      FROM team_members
      WHERE team_id = team_members.team_id
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers delete"
  ON team_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id
      FROM team_members
      WHERE team_id = team_members.team_id
      AND role = 'manager'
    )
  );

-- Recreate optimized indexes
DROP INDEX IF EXISTS idx_team_members_user_id;
DROP INDEX IF EXISTS idx_team_members_team_id;
DROP INDEX IF EXISTS idx_team_members_role;
DROP INDEX IF EXISTS idx_team_members_team_user;
DROP INDEX IF EXISTS idx_team_members_team_role;

CREATE INDEX idx_team_members_user_lookup ON team_members(user_id);
CREATE INDEX idx_team_members_team_lookup ON team_members(team_id);
CREATE INDEX idx_team_members_role_lookup ON team_members(team_id, role, user_id);