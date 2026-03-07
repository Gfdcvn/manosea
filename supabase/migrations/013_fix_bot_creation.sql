-- Fix bot creation: add a security-definer function to create bots
-- This bypasses RLS since regular users can't INSERT into users table

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
  -- Check owner exists and get role
  SELECT role INTO v_owner_role FROM public.users WHERE id = p_owner_id;
  IF v_owner_role IS NULL THEN
    RAISE EXCEPTION 'Owner not found';
  END IF;

  -- Enforce 5-bot limit for non-superadmins
  IF v_owner_role != 'superadmin' THEN
    SELECT count(*) INTO v_bot_count FROM public.bots WHERE owner_id = p_owner_id;
    IF v_bot_count >= 5 THEN
      RAISE EXCEPTION 'Bot limit reached (5 max)';
    END IF;
  END IF;

  -- Create bot user account
  v_bot_user_id := gen_random_uuid();
  INSERT INTO public.users (id, email, username, display_name, status, role, is_bot, standing_level)
  VALUES (
    v_bot_user_id,
    p_username || '@bot.local',
    p_username,
    p_name,
    'online',
    'user',
    true,
    0
  );

  -- Create bot record
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.bots (user_id, owner_id, name, description, token, status)
  VALUES (v_bot_user_id, p_owner_id, p_name, NULLIF(p_description, ''), v_token, 'offline')
  RETURNING id INTO v_bot_id;

  -- Create default workflow
  INSERT INTO public.bot_workflows (bot_id, name, nodes, connections, variables)
  VALUES (v_bot_id, 'Main Workflow', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb);

  -- Return the created bot as JSON
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

-- Also add DELETE policy for bot user accounts (so owners can delete their bots)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Bot owners can delete bot accounts'
  ) THEN
    CREATE POLICY "Bot owners can delete bot accounts" ON public.users
      FOR DELETE USING (
        is_bot = true AND id IN (
          SELECT user_id FROM public.bots WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;
