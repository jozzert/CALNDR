CREATE TABLE calendar_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  last_export_time timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_exports ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own export records
CREATE POLICY "Users can manage their own export records"
ON calendar_exports
FOR ALL USING (user_id = auth.uid()); 