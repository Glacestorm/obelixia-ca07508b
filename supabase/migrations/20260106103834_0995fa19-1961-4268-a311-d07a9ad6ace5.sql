-- =====================================================
-- FIX: Funciones SECURITY DEFINER para prevenir recursión en RLS
-- =====================================================

-- 1. Función para obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 2. Función para verificar si el usuario es admin de una organización
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id 
    AND user_role IN ('admin', 'superadmin', 'super_admin', 'ceo')
  )
$$;

-- 3. Función para verificar si usuario pertenece a una organización específica
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id 
    AND organization_id = _org_id
  )
$$;

-- 4. Función para obtener el rol del usuario
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_role FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 5. Función para obtener la oficina del usuario
CREATE OR REPLACE FUNCTION public.get_user_oficina(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oficina FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- =====================================================
-- REEMPLAZAR POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Eliminar políticas existentes que causan recursión
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can manage tokens" ON public.auditor_access_tokens;
DROP POLICY IF EXISTS "Users can view org alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "System can manage alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "Users can view audit entries" ON public.blockchain_audit_entries;
DROP POLICY IF EXISTS "System can create entries" ON public.blockchain_audit_entries;
DROP POLICY IF EXISTS "Authors and admins can update documents" ON public.support_knowledge_documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.support_knowledge_documents;

-- Recrear políticas usando funciones SECURITY DEFINER

-- Organizations
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (
    id = public.get_user_organization_id(auth.uid()) AND public.is_org_admin(auth.uid())
  );

-- Auditor Access Tokens
CREATE POLICY "Org admins can manage tokens" ON public.auditor_access_tokens
  FOR ALL USING (
    organization_id = public.get_user_organization_id(auth.uid()) AND public.is_org_admin(auth.uid())
  );

-- Audit Alerts
CREATE POLICY "Users can view org alerts" ON public.audit_alerts
  FOR SELECT USING (
    organization_id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "System can manage alerts" ON public.audit_alerts
  FOR ALL USING (
    organization_id = public.get_user_organization_id(auth.uid()) AND public.is_org_admin(auth.uid())
  );

-- Blockchain Audit Entries
CREATE POLICY "Users can view audit entries" ON public.blockchain_audit_entries
  FOR SELECT USING (
    organization_id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "System can create entries" ON public.blockchain_audit_entries
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- Support Knowledge Documents
CREATE POLICY "Authors and admins can update documents" ON public.support_knowledge_documents
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_org_admin(auth.uid()));

CREATE POLICY "Admins can delete documents" ON public.support_knowledge_documents
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid()));