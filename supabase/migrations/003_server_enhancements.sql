-- ============================================
-- SERVER ENHANCEMENTS — Description, Banner Color, Tag
-- ============================================

ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS banner_color TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tag TEXT;
