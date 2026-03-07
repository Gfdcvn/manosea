-- Migration 014: Reaction roles + scheduled messages + consolidate bot policies

-- ============================
-- Reaction Roles table
-- ============================
CREATE TABLE IF NOT EXISTS public.reaction_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.server_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, emoji)
);

ALTER TABLE public.reaction_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view reaction roles" ON public.reaction_roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.server_members WHERE server_id = reaction_roles.server_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage reaction roles" ON public.reaction_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      JOIN public.server_member_roles smr ON sm.id = smr.member_id
      JOIN public.server_roles sr ON smr.role_id = sr.id
      WHERE sm.server_id = reaction_roles.server_id
        AND sm.user_id = auth.uid()
        AND sr.permissions & 16 > 0  -- MANAGE_ROLES permission
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE INDEX IF NOT EXISTS idx_reaction_roles_message ON public.reaction_roles(message_id);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_server ON public.reaction_roles(server_id);

-- ============================
-- Scheduled Messages table
-- ============================
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_channel_id uuid REFERENCES public.dm_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (channel_id IS NOT NULL OR dm_channel_id IS NOT NULL)
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled messages" ON public.scheduled_messages
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user ON public.scheduled_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending ON public.scheduled_messages(scheduled_at) WHERE sent = false;

-- ============================
-- Message reactions table (for reaction roles to work)
-- ============================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.message_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add own reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

-- ============================
-- Ensure bot user INSERT/DELETE policies exist
-- ============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can create bot accounts'
  ) THEN
    CREATE POLICY "Users can create bot accounts" ON public.users
      FOR INSERT WITH CHECK (is_bot = true AND auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can delete own bot accounts'
  ) THEN
    CREATE POLICY "Users can delete own bot accounts" ON public.users
      FOR DELETE USING (
        is_bot = true AND EXISTS (
          SELECT 1 FROM public.bots WHERE bots.user_id = users.id AND bots.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================
-- Ensure create_bot RPC exists
-- ============================
CREATE OR REPLACE FUNCTION public.create_bot(
  p_owner_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_username text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_user_id uuid;
  v_bot_id uuid;
  v_token text;
  v_bot_count int;
  v_owner_role text;
  v_result jsonb;
BEGIN
  SELECT role INTO v_owner_role FROM public.users WHERE id = p_owner_id;
  IF v_owner_role IS NULL THEN
    RAISE EXCEPTION 'Owner not found';
  END IF;

  IF v_owner_role != 'superadmin' THEN
    SELECT count(*) INTO v_bot_count FROM public.bots WHERE owner_id = p_owner_id;
    IF v_bot_count >= 5 THEN
      RAISE EXCEPTION 'Bot limit reached (5 max)';
    END IF;
  END IF;

  v_bot_user_id := gen_random_uuid();
  INSERT INTO public.users (id, email, username, display_name, status, role, is_bot, standing_level)
  VALUES (
    v_bot_user_id,
    p_username || '@bot.ricord',
    p_username,
    p_name,
    'online',
    'user',
    true,
    0
  );

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.bots (user_id, owner_id, name, description, token, status)
  VALUES (v_bot_user_id, p_owner_id, p_name, NULLIF(p_description, ''), v_token, 'offline')
  RETURNING id INTO v_bot_id;

  INSERT INTO public.bot_workflows (bot_id, name, nodes, connections, variables)
  VALUES (v_bot_id, 'Main Workflow', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb);

  SELECT jsonb_build_object(
    'id', b.id,
    'user_id', b.user_id,
    'owner_id', b.owner_id,
    'name', b.name,
    'avatar_url', b.avatar_url,
    'description', b.description,
    'token', b.token,
    'status', b.status,
    'is_public', b.is_public,
    'created_at', b.created_at
  ) INTO v_result
  FROM public.bots b WHERE b.id = v_bot_id;

  RETURN v_result;
END;
$$;
