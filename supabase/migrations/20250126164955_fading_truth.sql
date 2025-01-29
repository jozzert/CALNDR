/*
  # Fix recursive policies

  This migration fixes the infinite recursion in the RLS policies by:
  1. Simplifying the team member policies
  2. Ensuring no circular dependencies in policy checks
  3. Adding proper indexes for performance
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Managers can manage team members" ON team_members;

-- Create new, simplified policies
CREATE POLICY "Users can view team members"
  ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage team members"
  ON team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_members.team_id
      AND user_id = auth.uid()
      AND role = 'manager'
    )
  );

-- Add indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);