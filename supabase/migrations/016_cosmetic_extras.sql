-- Add new cosmetic columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_glow text DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chat_bubble_color text DEFAULT NULL;
