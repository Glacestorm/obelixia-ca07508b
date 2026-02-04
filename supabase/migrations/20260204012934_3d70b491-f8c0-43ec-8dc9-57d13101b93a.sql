-- Actualizar política de INSERT para legal_knowledge_base
-- Permitir que usuarios autenticados creen conocimiento esencial (is_verified = true indica sistema)
DROP POLICY IF EXISTS "Users can create knowledge entries" ON public.legal_knowledge_base;

CREATE POLICY "Authenticated users can create knowledge entries"
ON public.legal_knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política adicional para UPDATE - permitir actualizar entradas verificadas (sistema)
DROP POLICY IF EXISTS "Users can update own knowledge entries" ON public.legal_knowledge_base;

CREATE POLICY "Authenticated users can update knowledge entries"
ON public.legal_knowledge_base
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE solo del creador
CREATE POLICY "Users can delete own knowledge entries"
ON public.legal_knowledge_base
FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR created_by IS NULL);