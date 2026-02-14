-- Add mute support and enforcement fields to users table

-- Add mute-related columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_end timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES users(id);

-- Update the user_punishments type check to include 'mute'
-- (The existing check constraint may need to be dropped and re-added)
DO $$
BEGIN
  -- Drop existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_punishments_type_check' 
    AND table_name = 'user_punishments'
  ) THEN
    ALTER TABLE user_punishments DROP CONSTRAINT user_punishments_type_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Note: If there's no check constraint, the type column is just text and 'mute' will work fine.
-- If there was one, we've removed it above to allow 'mute' values.

-- Enable realtime for dm_channels table (for new DM notifications)
DO $$
BEGIN
  -- Check if dm_channels is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'dm_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_channels;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
