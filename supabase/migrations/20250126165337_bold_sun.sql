/*
  # Fix database access and policies

  This migration:
  1. Adds default organization and team creation on user signup
  2. Simplifies policies to ensure proper access
  3. Adds functions to manage user onboarding
  4. Adds performance indexes
*/

-- Create function to ensure user has an organization and team
CREATE OR REPLACE FUNCTION create_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  team_id uuid;
BEGIN
  -- Create default organization
  INSERT INTO organisations (name)
  VALUES ('My Organization')
  RETURNING id INTO org_id;

  -- Create default team
  INSERT INTO teams (organisation_id, name, description)
  VALUES (org_id, 'My Team', 'Default team')
  RETURNING id INTO team_id;

  -- Add user as team manager
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (team_id, NEW.id, 'manager');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_organization();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organisation" ON organisations;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can view events for their teams" ON events;

-- Create new policies
CREATE POLICY "Users can view their organisation" ON organisations
  USING (
    id IN (
      SELECT DISTINCT t.organisation_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view teams they belong to" ON teams
  USING (
    id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view events for their teams" ON events
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_organisation_id ON teams(organisation_id);
CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);