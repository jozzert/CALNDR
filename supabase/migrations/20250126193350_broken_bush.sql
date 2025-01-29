/*
  # Add event types functionality
  
  1. New Tables
    - `event_types`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, references organisations)
      - `name` (text)
      - `color` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes
    - Modify events table to reference event_types
    - Add default event types for each organization
  
  3. Security
    - Enable RLS
    - Add policies for viewing and managing event types
*/

-- Create event_types table
CREATE TABLE event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key to events table
ALTER TABLE events
DROP CONSTRAINT IF EXISTS events_event_type_check,
ADD COLUMN event_type_id uuid REFERENCES event_types(id),
ADD COLUMN old_event_type text;

-- Copy existing event types to new column temporarily
UPDATE events SET old_event_type = event_type;

-- Enable RLS
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view event types for their organisation"
  ON event_types
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT DISTINCT t.organisation_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage event types"
  ON event_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.organisation_id = event_types.organisation_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'manager'
    )
  );

-- Create function to initialize default event types
CREATE OR REPLACE FUNCTION initialize_default_event_types(org_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO event_types (organisation_id, name, color)
  VALUES 
    (org_id, 'Training', '#3B82F6'),
    (org_id, 'Match', '#10B981'),
    (org_id, 'Meeting', '#8B5CF6');
END;
$$;

-- Create trigger to add default event types for new organizations
CREATE OR REPLACE FUNCTION create_default_event_types()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_default_event_types(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_organisation_created
  AFTER INSERT ON organisations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_event_types();

-- Initialize event types for existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organisations
  LOOP
    PERFORM initialize_default_event_types(org_record.id);
  END LOOP;
END $$;