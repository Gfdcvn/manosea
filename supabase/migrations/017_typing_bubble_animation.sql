-- Migration 017: Typing indicator styles, chat bubble styles, profile card animations

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS typing_indicator_style text NOT NULL DEFAULT 'default';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS typing_indicator_color text DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chat_bubble_style text NOT NULL DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_card_animation text NOT NULL DEFAULT 'none';
