/*
  # Fix team members policies with materialized paths
  
  This migration:
  1. Adds a materialized path column to track team membership
  2. Creates simplified policies that avoid recursion
  3. Updates indexes for optimal performance
*/

-- Drop all existing team members policies
DROP POLICY IF EXISTS "Read own membership" ON team_members;
DROP POLICY IF EXISTS "Read team memberships" ON team_members;
DROP POLICY IF EXISTS "Managers insert" ON team_members;
DROP POLICY IF EXISTS "Managers update" ON team_members;
DROP POLICY IF EXISTS "Managers delete" ON team_members;

-- Add materialized path column
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS membership_path text 
GENERATED ALWAYS AS (team_id::text || '/' || user_id::text) STORED;

-- Create new simplified policies
CREATE POLICY "Allow users to read their memberships"
  ON team_members
  FOR SELECT
  USING (
    membership_path LIKE '%' || auth.uid()::text || '%'
    OR
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow managers to insert"
  ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM team_members manager_check
      WHERE manager_check.team_id = team_members.team_id
      AND manager_check.user_id = auth.uid()
      AND manager_check.role = 'manager'
      LIMIT 1
    )
  );

CREATE POLICY "Allow managers to update"
  ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM team_members manager_check
      WHERE manager_check.team_id = team_members.team_id
      AND manager_check.user_id = auth.uid()
      AND manager_check.role = 'manager'
      LIMIT 1
    )
  );

CREATE POLICY "Allow managers to delete"
  ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM team_members manager_check
      WHERE manager_check.team_id = team_members.team_id
      AND manager_check.user_id = auth.uid()
      AND manager_check.role = 'manager'
      LIMIT 1
    )
  );

-- Create optimized indexes
DROP INDEX IF EXISTS idx_team_members_user_lookup;
DROP INDEX IF EXISTS idx_team_members_team_lookup;
DROP INDEX IF EXISTS idx_team_members_role_lookup;

CREATE INDEX idx_team_members_membership_path ON team_members(membership_path);
CREATE INDEX idx_team_members_team_manager ON team_members(team_id, user_id) WHERE role = 'manager';
CREATE INDEX idx_team_members_user_teams ON team_members(user_id, team_id);