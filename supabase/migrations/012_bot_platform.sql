-- Bot platform tables

-- Bots table (references users table for the bot user account)
CREATE TABLE IF NOT EXISTS public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  description text,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bot workflows (visual node graphs)
CREATE TABLE IF NOT EXISTS public.bot_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main Workflow',
  nodes jsonb NOT NULL DEFAULT '[]',
  connections jsonb NOT NULL DEFAULT '[]',
  variables jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bot logs for console output
CREATE TABLE IF NOT EXISTS public.bot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bot memory (key-value store for variables)
CREATE TABLE IF NOT EXISTS public.bot_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  UNIQUE(bot_id, key)
);

-- RLS policies
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_memory ENABLE ROW LEVEL SECURITY;

-- Bot owners can manage their bots
CREATE POLICY "Bot owners can manage bots" ON public.bots
  FOR ALL USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Bot owners can manage workflows" ON public.bot_workflows
  FOR ALL USING (bot_id IN (SELECT id FROM public.bots WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Bot owners can view logs" ON public.bot_logs
  FOR ALL USING (bot_id IN (SELECT id FROM public.bots WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Bot owners can manage memory" ON public.bot_memory
  FOR ALL USING (bot_id IN (SELECT id FROM public.bots WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Index for fast bot lookups
CREATE INDEX IF NOT EXISTS idx_bots_owner ON public.bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_bot_workflows_bot ON public.bot_workflows(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot ON public.bot_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_memory_bot_key ON public.bot_memory(bot_id, key);
