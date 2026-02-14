-- ============================================
-- Migration 004: Fix RLS policies for system DM + punishment delete
-- ============================================

-- Fix DM channels SELECT — admins can view any DM channel (needed for system bot DMs)
DROP POLICY IF EXISTS "DM channels viewable by participants" ON public.dm_channels;
CREATE POLICY "DM channels viewable by participants" ON public.dm_channels FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Fix DM channels INSERT — admins can create DM channels on behalf of system bot
DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;
CREATE POLICY "Users can create DM channels" ON public.dm_channels FOR INSERT WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Add DM channels DELETE policy
DROP POLICY IF EXISTS "Users can delete own DM channels" ON public.dm_channels;
CREATE POLICY "Users can delete own DM channels" ON public.dm_channels FOR DELETE USING (
  auth.uid() = user1_id OR auth.uid() = user2_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Fix Messages INSERT — admins can send messages as system bot
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Add punishment DELETE policy for admins
DROP POLICY IF EXISTS "Admins can delete punishments" ON public.user_punishments;
CREATE POLICY "Admins can delete punishments" ON public.user_punishments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);
