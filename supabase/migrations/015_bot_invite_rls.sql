-- Allow bot owners to invite their bots to servers
-- The existing policy "Users can join servers" only allows auth.uid() = user_id
-- Bot owners need to insert server_members rows for their bot's user_id

DROP POLICY IF EXISTS "Users can join servers" ON public.server_members;

CREATE POLICY "Users can join servers" ON public.server_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.user_id = server_members.user_id
      AND bots.owner_id = auth.uid()
  )
);
