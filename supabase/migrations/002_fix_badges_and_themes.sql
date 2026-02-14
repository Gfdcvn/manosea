-- ============================================
-- FIX BADGES TABLE: Add missing columns, fix type constraint
-- ============================================

-- Drop the old type constraint
ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_type_check;

-- Add missing columns
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '⭐';
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS standing_override INTEGER;

-- Make icon_url nullable (we use icon emoji instead)
ALTER TABLE public.badges ALTER COLUMN icon_url DROP NOT NULL;
ALTER TABLE public.badges ALTER COLUMN icon_url SET DEFAULT NULL;

-- Add new type constraint that matches the app's badge types
ALTER TABLE public.badges ADD CONSTRAINT badges_type_check
  CHECK (type IN ('user', 'server', 'achievement', 'role', 'special', 'custom'));

-- ============================================
-- FIX USER_SETTINGS TABLE: Expand theme options
-- ============================================
ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_check;
