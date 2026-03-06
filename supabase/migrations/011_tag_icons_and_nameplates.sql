-- Add tag_icons (JSON map of tag -> emoji) to servers
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tag_icons jsonb DEFAULT '{}';

-- Add nameplate config (JSON) to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nameplate jsonb DEFAULT NULL;

-- Add avatar ring config (JSON) to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_ring jsonb DEFAULT NULL;

-- Add name effect to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name_effect text DEFAULT 'none';
