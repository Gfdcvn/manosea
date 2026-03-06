-- Migration 009: Profile customization, pinned messages, reports, notification settings, channel permissions, gradient banners

-- ============================================
-- 1. User profile customization (fonts, colors, gradients)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_color text DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_gradient_start text DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_gradient_end text DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_font text DEFAULT 'default';

-- ============================================
-- 2. Server gradient banners
-- ============================================
ALTER TABLE servers ADD COLUMN IF NOT EXISTS banner_gradient_start text DEFAULT NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS banner_gradient_end text DEFAULT NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS banner_gradient_angle integer DEFAULT 135;

-- ============================================
-- 3. Pinned messages
-- ============================================
CREATE TABLE IF NOT EXISTS pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  dm_channel_id uuid REFERENCES dm_channels(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pinned_at timestamptz DEFAULT now(),
  UNIQUE(message_id)
);

-- ============================================
-- 4. Channel-specific permission overrides
-- ============================================
CREATE TABLE IF NOT EXISTS channel_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  role_id uuid REFERENCES server_roles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  allow_permissions integer DEFAULT 0,
  deny_permissions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, role_id, user_id)
);

-- ============================================
-- 5. Reports system
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('user', 'message', 'server')),
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  target_server_id uuid REFERENCES servers(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================
-- 6. Notification settings
-- ============================================
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_mentions boolean DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_dms boolean DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_friend_requests boolean DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS muted_servers text[] DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS muted_channels text[] DEFAULT '{}';

-- ============================================
-- 7. Server verified badge (displayed next to name)
-- ============================================
ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
