-- FIX CRITICAL: Corregir recursión infinita en RLS de chat_participants

-- 1. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can view participants in their chat rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can add participants to their chat rooms" ON public.chat_participants;

-- 2. Crear función SECURITY DEFINER para verificar membresía sin recursión
CREATE OR REPLACE FUNCTION public.is_chat_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id AND user_id = _user_id
  )
$$;

-- 3. Recrear políticas SIN recursión
CREATE POLICY "Users can view participants in their chat rooms"
ON public.chat_participants
FOR SELECT
USING (public.is_chat_room_member(room_id, auth.uid()));

CREATE POLICY "Users can add participants to rooms they belong to"
ON public.chat_participants
FOR INSERT
WITH CHECK (public.is_chat_room_member(room_id, auth.uid()) OR user_id = auth.uid());