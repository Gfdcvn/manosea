-- ============================================
-- RICORD: Full Database Schema
-- Discord Clone - Supabase PostgreSQL
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  profile_color TEXT DEFAULT '#353535',
  about_me TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'idle', 'dnd', 'invisible')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  standing_level INTEGER DEFAULT 0 CHECK (standing_level >= 0 AND standing_level <= 4),
  is_banned BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspension_end TIMESTAMPTZ,
  is_bot BOOLEAN DEFAULT FALSE,
  is_messagable BOOLEAN DEFAULT TRUE,
  bot_token TEXT,
  last_punishment_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⭐',
  icon_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('user', 'server', 'achievement', 'role', 'special', 'custom')),
  affects_standing BOOLEAN DEFAULT FALSE,
  standing_override INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER_BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- SERVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id),
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspension_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVER_BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.server_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, badge_id)
);

-- ============================================
-- SERVER ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.server_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99aab5',
  permissions INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVER MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.server_roles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHANNELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DM CHANNELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.dm_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_channel_id UUID REFERENCES public.dm_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id),
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CHECK (
    (channel_id IS NOT NULL AND dm_channel_id IS NULL) OR
    (channel_id IS NULL AND dm_channel_id IS NOT NULL)
  )
);

-- ============================================
-- ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER PUNISHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_punishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('warn', 'suspend', 'ban')),
  reason TEXT NOT NULL,
  severity INTEGER,
  issued_by UUID NOT NULL REFERENCES public.users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  becomes_past_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  popup_shown BOOLEAN DEFAULT FALSE
);

-- ============================================
-- SERVER INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.server_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  uses INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FRIEND REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  send_mode TEXT DEFAULT 'button_or_enter' CHECK (send_mode IN ('button_only', 'button_or_enter', 'button_or_shift_enter')),
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_dm_channel ON public.messages(dm_channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_author ON public.messages(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_members_server ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user ON public.server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_server ON public.channels(server_id);
CREATE INDEX IF NOT EXISTS idx_punishments_user ON public.user_punishments(user_id);
CREATE INDEX IF NOT EXISTS idx_punishments_active ON public.user_punishments(is_active);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_dm_channels_users ON public.dm_channels(user1_id, user2_id);

-- ============================================
-- SEED DATA: System Bot
-- ============================================
INSERT INTO public.users (id, email, username, display_name, role, is_bot, is_messagable, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@ricord.app',
  'system',
  'System',
  'superadmin',
  TRUE,
  FALSE,
  'online'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA: Default Superadmin
-- ============================================
INSERT INTO public.users (email, username, display_name, role, standing_level)
VALUES (
  'richardsonnomad@gmail.com',
  'richardd',
  'Richard',
  'superadmin',
  0
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Users RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any user" ON public.users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Badges RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Superadmins can manage badges" ON public.badges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
);

-- User Badges RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage user badges" ON public.user_badges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Servers RLS
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Servers viewable by members" ON public.servers FOR SELECT USING (true);
CREATE POLICY "Users can create servers" ON public.servers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update servers" ON public.servers FOR UPDATE USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);
CREATE POLICY "Owners can delete servers" ON public.servers FOR DELETE USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Server Badges RLS
ALTER TABLE public.server_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server badges viewable by everyone" ON public.server_badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage server badges" ON public.server_badges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Server Roles RLS
ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles viewable by server members" ON public.server_roles FOR SELECT USING (true);
CREATE POLICY "Server owners can manage roles" ON public.server_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Server Members RLS
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by server members" ON public.server_members FOR SELECT USING (true);
CREATE POLICY "Users can join servers" ON public.server_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave servers" ON public.server_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Categories RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Server owners can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Channels RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels viewable by server members" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Server owners can manage channels" ON public.channels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- DM Channels RLS
ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DM channels viewable by participants" ON public.dm_channels FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);
CREATE POLICY "Users can create DM channels" ON public.dm_channels FOR INSERT WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable in context" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can edit messages" ON public.messages FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete messages" ON public.messages FOR DELETE USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Attachments RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments viewable by everyone" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "Message authors can add attachments" ON public.attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND author_id = auth.uid())
);

-- User Punishments RLS
ALTER TABLE public.user_punishments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own punishments" ON public.user_punishments FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins can issue punishments" ON public.user_punishments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins can update punishments" ON public.user_punishments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Server Invites RLS
ALTER TABLE public.server_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invites viewable by everyone" ON public.server_invites FOR SELECT USING (true);
CREATE POLICY "Members can create invites" ON public.server_invites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.server_members WHERE server_id = server_invites.server_id AND user_id = auth.uid())
);

-- Friend Requests RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own friend requests" ON public.friend_requests FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update received requests" ON public.friend_requests FOR UPDATE USING (
  receiver_id = auth.uid() OR sender_id = auth.uid()
);
CREATE POLICY "Users can delete own requests" ON public.friend_requests FOR DELETE USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- User Settings RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- REALTIME PUBLICATION
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_punishments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_badges;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('server-icons', 'server-icons', true) ON CONFLICT DO NOTHING;

-- Storage Policies
CREATE POLICY "Public access to avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Public access to banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Authenticated users can upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');
CREATE POLICY "Public access to attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Public access to server-icons" ON storage.objects FOR SELECT USING (bucket_id = 'server-icons');
CREATE POLICY "Authenticated users can upload server-icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'server-icons' AND auth.role() = 'authenticated');
