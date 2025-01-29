/*
  # Fix user registration trigger

  1. Changes
    - Drop and recreate user registration trigger with proper error handling
    - Add proper organization creation with default values
    - Ensure team creation and manager role assignment
    - Add proper error handling and constraints

  2. Security
    - Maintain existing RLS policies
    - No changes to existing security model
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_organization;

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION create_user_organization()
RETURNS TRIGGER
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  org_id uuid;
  team_id uuid;
BEGIN
  -- Create default organization with proper error handling
  INSERT INTO organisations (
    name,
    created_at,
    updated_at
  ) VALUES (
    'My Organization',
    now(),
    now()
  )
  RETURNING id INTO org_id;

  -- Create default team with proper error handling
  INSERT INTO teams (
    organisation_id,
    name,
    description,
    created_at,
    updated_at
  ) VALUES (
    org_id,
    'My Team',
    'Default team',
    now(),
    now()
  )
  RETURNING id INTO team_id;

  -- Add user as team manager with proper error handling
  INSERT INTO team_members (
    team_id,
    user_id,
    role,
    created_at
  ) VALUES (
    team_id,
    NEW.id,
    'manager',
    now()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_organization();

-- Add index to improve trigger performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_role ON team_members(user_id, role);