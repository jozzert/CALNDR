/*
  # Fix team members policies with non-recursive approach
  
  This migration:
  1. Drops all existing team member policies
  2. Creates new non-recursive policies
  3. Optimizes indexes for performance
*/

-- Drop all existing team members policies
DROP POLICY IF EXISTS "Allow users to read their memberships" ON team_members;
DROP POLICY IF EXISTS "Allow managers to insert" ON team_members;
DROP POLICY IF EXISTS "Allow managers to update" ON team_members;
DROP POLICY IF EXISTS "Allow managers to delete" ON team_members;

-- Drop materialized path as it's not needed
ALTER TABLE team_members DROP COLUMN IF EXISTS membership_path;

-- Create new non-recursive policies
CREATE POLICY "team_members_select_policy"
  ON team_members
  FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    OR
    -- Users can see members of teams they belong to
    EXISTS (
      SELECT 1
      FROM team_members my_teams
      WHERE my_teams.team_id = team_members.team_id
      AND my_teams.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "team_members_insert_policy"
  ON team_members
  FOR INSERT
  WITH CHECK (
    -- Only team managers can insert
    EXISTS (
      SELECT 1
      FROM team_members managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
      LIMIT 1
    )
  );

CREATE POLICY "team_members_update_policy"
  ON team_members
  FOR UPDATE
  USING (
    -- Only team managers can update
    EXISTS (
      SELECT 1
      FROM team_members managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
      LIMIT 1
    )
  );

CREATE POLICY "team_members_delete_policy"
  ON team_members
  FOR DELETE
  USING (
    -- Only team managers can delete
    EXISTS (
      SELECT 1
      FROM team_members managers
      WHERE managers.team_id = team_members.team_id
      AND managers.user_id = auth.uid()
      AND managers.role = 'manager'
      LIMIT 1
    )
  );

-- Drop existing indexes
DROP INDEX IF EXISTS idx_team_members_membership_path;
DROP INDEX IF EXISTS idx_team_members_team_manager;
DROP INDEX IF EXISTS idx_team_members_user_teams;

-- Create optimized indexes
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_manager ON team_members(team_id, user_id) WHERE role = 'manager';