-- 008: Role Channel Overrides
-- Allows hiding/showing channels per role

CREATE TABLE IF NOT EXISTS role_channel_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  hidden BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, channel_id)
);

ALTER TABLE role_channel_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_channel_overrides_select" ON role_channel_overrides FOR SELECT USING (true);
CREATE POLICY "role_channel_overrides_insert" ON role_channel_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "role_channel_overrides_update" ON role_channel_overrides FOR UPDATE USING (true);
CREATE POLICY "role_channel_overrides_delete" ON role_channel_overrides FOR DELETE USING (true);
