-- =====================================================
-- FASE 1: CORREGIR POLÍTICAS RLS CON RECURSIÓN POTENCIAL
-- Crear funciones SECURITY DEFINER y actualizar políticas
-- =====================================================

-- 1. Función para verificar pertenencia a workspace (evita recursión en RLS)
CREATE OR REPLACE FUNCTION public.crm_user_belongs_to_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_user_workspaces
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id 
    AND is_active = true
  )
$$;

-- 2. Función para obtener workspaces del usuario
CREATE OR REPLACE FUNCTION public.crm_get_user_workspaces(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM crm_user_workspaces
  WHERE user_id = _user_id AND is_active = true
$$;

-- 3. Función para verificar si es admin del workspace
CREATE OR REPLACE FUNCTION public.crm_is_workspace_admin(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_user_workspaces uw
    JOIN crm_roles r ON r.id = uw.role_id
    JOIN crm_role_permissions rp ON rp.role_id = r.id
    JOIN crm_permissions p ON p.id = rp.permission_id
    WHERE uw.user_id = _user_id 
      AND uw.workspace_id = _workspace_id
      AND p.key = 'admin.all'
  )
$$;

-- 4. Función para verificar pertenencia a equipo
CREATE OR REPLACE FUNCTION public.crm_user_belongs_to_team(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_teams t
    JOIN crm_user_workspaces uw ON uw.workspace_id = t.workspace_id
    WHERE t.id = _team_id
    AND uw.user_id = _user_id
    AND uw.is_active = true
  )
$$;

-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS
-- =====================================================

-- crm_teams: usar función SECURITY DEFINER en lugar de subquery directo
DROP POLICY IF EXISTS "Users can view workspace teams" ON public.crm_teams;
CREATE POLICY "Users can view workspace teams" ON public.crm_teams FOR SELECT
USING (public.crm_user_belongs_to_workspace(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can create teams" ON public.crm_teams;
CREATE POLICY "Admins can create teams" ON public.crm_teams FOR INSERT
WITH CHECK (public.crm_is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can update teams" ON public.crm_teams;
CREATE POLICY "Admins can update teams" ON public.crm_teams FOR UPDATE
USING (public.crm_is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can delete teams" ON public.crm_teams;
CREATE POLICY "Admins can delete teams" ON public.crm_teams FOR DELETE
USING (public.crm_is_workspace_admin(auth.uid(), workspace_id));

-- crm_team_members: usar función SECURITY DEFINER
DROP POLICY IF EXISTS "Users can view team members" ON public.crm_team_members;
CREATE POLICY "Users can view team members" ON public.crm_team_members FOR SELECT
USING (public.crm_user_belongs_to_team(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team leads can manage members" ON public.crm_team_members;
CREATE POLICY "Team leads can manage members" ON public.crm_team_members FOR ALL
USING (public.crm_user_belongs_to_team(auth.uid(), team_id));

-- crm_roles: usar función SECURITY DEFINER
DROP POLICY IF EXISTS "Users can view roles in their workspaces" ON public.crm_roles;
CREATE POLICY "Users can view roles in their workspaces" ON public.crm_roles FOR SELECT
USING (workspace_id IN (SELECT public.crm_get_user_workspaces(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.crm_roles;
CREATE POLICY "Admins can manage roles" ON public.crm_roles FOR ALL
USING (public.crm_is_workspace_admin(auth.uid(), workspace_id));

-- crm_role_permissions: usar función SECURITY DEFINER
DROP POLICY IF EXISTS "Users can view role permissions" ON public.crm_role_permissions;
CREATE POLICY "Users can view role permissions" ON public.crm_role_permissions FOR SELECT
USING (
  role_id IN (
    SELECT r.id FROM crm_roles r
    WHERE r.workspace_id IN (SELECT public.crm_get_user_workspaces(auth.uid()))
  )
);

-- crm_workspaces: usar funciones SECURITY DEFINER
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.crm_workspaces;
CREATE POLICY "Users can view their workspaces" ON public.crm_workspaces FOR SELECT
USING (id IN (SELECT public.crm_get_user_workspaces(auth.uid())));

DROP POLICY IF EXISTS "Admins can update their workspaces" ON public.crm_workspaces;
CREATE POLICY "Admins can update their workspaces" ON public.crm_workspaces FOR UPDATE
USING (public.crm_is_workspace_admin(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can delete their workspaces" ON public.crm_workspaces;
CREATE POLICY "Admins can delete their workspaces" ON public.crm_workspaces FOR DELETE
USING (public.crm_is_workspace_admin(auth.uid(), id));