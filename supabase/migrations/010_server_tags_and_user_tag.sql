-- Add multiple tags support for servers (JSON array of strings)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add user's selected server tag (the server_id they chose to display)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selected_server_tag text DEFAULT NULL;

-- Migrate existing single tag to tags array
UPDATE public.servers SET tags = ARRAY[tag] WHERE tag IS NOT NULL AND tag != '' AND (tags IS NULL OR tags = '{}');
