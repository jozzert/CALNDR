/*
  # Add organization logo and update organization fields
  
  1. Changes
    - Add logo URL field to organizations
    - Add location field to organizations
    - Add last_updated trigger
  
  2. Security
    - Update organization policies for logo management
*/

-- Add new fields to organizations
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS location text;

-- Update organization policies
CREATE POLICY "Users can update their own organization"
  ON organisations
  FOR UPDATE
  USING (
    id IN (
      SELECT DISTINCT t.organisation_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'manager'
    )
  );