-- =====================================================
-- FIX: Función SECURITY DEFINER para chat_participants
-- =====================================================

-- Función para verificar si un usuario es participante de una sala
CREATE OR REPLACE FUNCTION public.user_is_chat_participant(_user_id UUID, _room_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE user_id = _user_id 
    AND room_id = _room_id
  )
$$;

-- Eliminar política problemática
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON public.chat_participants;

-- Recrear política usando función SECURITY DEFINER
CREATE POLICY "Users can view participants of their rooms" ON public.chat_participants
  FOR SELECT USING (
    user_id = auth.uid() OR public.user_is_chat_participant(auth.uid(), room_id)
  );