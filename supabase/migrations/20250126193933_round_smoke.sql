-- First, make event_type_id NOT NULL
ALTER TABLE events 
  ALTER COLUMN event_type_id SET NOT NULL;

-- Drop the old event_type column as it's no longer needed
ALTER TABLE events 
  DROP COLUMN IF EXISTS event_type,
  DROP COLUMN IF EXISTS old_event_type;

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_events_event_type_id ON events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_event_types_org_id ON event_types(organisation_id);

-- Update event policies to include event type checks
DROP POLICY IF EXISTS "Users can view events for their teams" ON events;
DROP POLICY IF EXISTS "Managers can manage events" ON events;

CREATE POLICY "Users can view events for their teams"
  ON events
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage events"
  ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM team_members
      WHERE team_members.team_id = events.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'manager'
    )
  );