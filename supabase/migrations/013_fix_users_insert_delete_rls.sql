-- Migration 013: Add INSERT and DELETE RLS policies to users table
-- Fixes: bot creation and bot deletion failing due to missing policies

-- Allow authenticated users to insert bot user accounts (is_bot=true only)
CREATE POLICY "Users can create bot accounts" ON public.users
  FOR INSERT WITH CHECK (
    is_bot = true AND auth.uid() IS NOT NULL
  );

-- Allow admins to insert any user
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Allow bot owners to delete their bot user accounts
CREATE POLICY "Users can delete own bot accounts" ON public.users
  FOR DELETE USING (
    is_bot = true AND EXISTS (
      SELECT 1 FROM public.bots WHERE bots.user_id = users.id AND bots.owner_id = auth.uid()
    )
  );

-- Allow admins to delete any user
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );
