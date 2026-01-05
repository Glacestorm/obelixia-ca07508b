-- Fix infinite recursion in RLS policies by removing self-referencing SELECT policies

-- =============================
-- chat_participants
-- =============================
-- This policy self-references chat_participants and can trigger "infinite recursion detected in policy"
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON public.chat_participants;

-- =============================
-- chat_rooms
-- =============================
-- Replace buggy membership policy with a safe helper-based one
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

CREATE POLICY "Users can view rooms they participate in"
ON public.chat_rooms
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_chat_room_member(id, auth.uid())
);

-- =============================
-- partner_users
-- =============================
-- Create helper function to avoid self-referencing partner_users in RLS
CREATE OR REPLACE FUNCTION public.get_partner_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pu.partner_company_id
  FROM public.partner_users pu
  WHERE pu.user_id = _user_id
  ORDER BY pu.created_at DESC
  LIMIT 1;
$$;

-- Drop the recursive policy and recreate using the helper
DROP POLICY IF EXISTS "Partner users can view their team" ON public.partner_users;

CREATE POLICY "Partner users can view their team"
ON public.partner_users
FOR SELECT
USING (
  partner_company_id = public.get_partner_company_id(auth.uid())
);
