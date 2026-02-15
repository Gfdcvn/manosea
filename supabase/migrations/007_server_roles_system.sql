-- 007: Server Roles System
-- Adds role icon, elevated flag, server-level moderation tables

-- Extend server_roles with icon and elevated flag
ALTER TABLE server_roles ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
ALTER TABLE server_roles ADD COLUMN IF NOT EXISTS is_elevated BOOLEAN DEFAULT FALSE;

-- Allow members to have multiple roles via junction table
CREATE TABLE IF NOT EXISTS server_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES server_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, role_id)
);

-- Server bans (permanent, user cannot rejoin)
CREATE TABLE IF NOT EXISTS server_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  banned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- Server mutes (duration-based, can't type/talk in server channels)
CREATE TABLE IF NOT EXISTS server_mutes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  duration_days INTEGER NOT NULL DEFAULT 1,
  muted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Server suspensions (duration-based, can't enter server at all)
CREATE TABLE IF NOT EXISTS server_suspensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  duration_days INTEGER NOT NULL DEFAULT 1,
  suspended_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Server member notes (visible only to admins/moderators)
CREATE TABLE IF NOT EXISTS server_member_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel visibility overrides (hide channels from specific users)
CREATE TABLE IF NOT EXISTS channel_visibility_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hidden BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE server_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_visibility_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for server_member_roles
CREATE POLICY "server_member_roles_select" ON server_member_roles FOR SELECT USING (true);
CREATE POLICY "server_member_roles_insert" ON server_member_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "server_member_roles_delete" ON server_member_roles FOR DELETE USING (true);

-- RLS policies for server_bans
CREATE POLICY "server_bans_select" ON server_bans FOR SELECT USING (true);
CREATE POLICY "server_bans_insert" ON server_bans FOR INSERT WITH CHECK (true);
CREATE POLICY "server_bans_delete" ON server_bans FOR DELETE USING (true);

-- RLS policies for server_mutes
CREATE POLICY "server_mutes_select" ON server_mutes FOR SELECT USING (true);
CREATE POLICY "server_mutes_insert" ON server_mutes FOR INSERT WITH CHECK (true);
CREATE POLICY "server_mutes_update" ON server_mutes FOR UPDATE USING (true);
CREATE POLICY "server_mutes_delete" ON server_mutes FOR DELETE USING (true);

-- RLS policies for server_suspensions
CREATE POLICY "server_suspensions_select" ON server_suspensions FOR SELECT USING (true);
CREATE POLICY "server_suspensions_insert" ON server_suspensions FOR INSERT WITH CHECK (true);
CREATE POLICY "server_suspensions_update" ON server_suspensions FOR UPDATE USING (true);
CREATE POLICY "server_suspensions_delete" ON server_suspensions FOR DELETE USING (true);

-- RLS policies for server_member_notes
CREATE POLICY "server_member_notes_select" ON server_member_notes FOR SELECT USING (true);
CREATE POLICY "server_member_notes_insert" ON server_member_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "server_member_notes_update" ON server_member_notes FOR UPDATE USING (true);
CREATE POLICY "server_member_notes_delete" ON server_member_notes FOR DELETE USING (true);

-- RLS policies for channel_visibility_overrides
CREATE POLICY "channel_visibility_select" ON channel_visibility_overrides FOR SELECT USING (true);
CREATE POLICY "channel_visibility_insert" ON channel_visibility_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "channel_visibility_update" ON channel_visibility_overrides FOR UPDATE USING (true);
CREATE POLICY "channel_visibility_delete" ON channel_visibility_overrides FOR DELETE USING (true);
