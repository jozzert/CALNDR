-- Add is_all_day column to events table
ALTER TABLE events
ADD COLUMN is_all_day boolean NOT NULL DEFAULT false;

-- Create index for is_all_day column to improve query performance
CREATE INDEX idx_events_is_all_day ON events(is_all_day);

-- Update existing events to set is_all_day based on time
UPDATE events
SET is_all_day = (
  EXTRACT(HOUR FROM start_time) = 0 
  AND EXTRACT(MINUTE FROM start_time) = 0
  AND EXTRACT(HOUR FROM end_time) = 23
  AND EXTRACT(MINUTE FROM end_time) = 59
);