-- ============================================
-- FASE 1: Funciones SECURITY DEFINER para CRM
-- Elimina recursión infinita en políticas RLS
-- ============================================

-- 1. Función para verificar pertenencia a workspace
CREATE OR REPLACE FUNCTION public.crm_user_belongs_to_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
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
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM crm_user_workspaces
  WHERE user_id = _user_id AND is_active = true
$$;

-- 3. Función para verificar si es admin del workspace
CREATE OR REPLACE FUNCTION public.crm_is_workspace_admin(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_user_workspaces uw
    JOIN crm_roles r ON r.id = uw.role_id
    JOIN crm_role_permissions rp ON rp.role_id = r.id
    JOIN crm_permissions p ON p.id = rp.permission_id
    WHERE uw.user_id = _user_id 
      AND uw.workspace_id = _workspace_id
      AND uw.is_active = true
      AND p.key = 'admin.all'
  )
$$;

-- 4. Función para verificar pertenencia a team
CREATE OR REPLACE FUNCTION public.crm_user_in_team_workspace(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_teams t
    JOIN crm_user_workspaces uw ON uw.workspace_id = t.workspace_id
    WHERE t.id = _team_id
      AND uw.user_id = _user_id
      AND uw.is_active = true
      AND t.is_active = true
  )
$$;

-- ============================================
-- ACTUALIZAR POLÍTICAS RLS
-- ============================================

-- crm_teams: Actualizar política SELECT
DROP POLICY IF EXISTS "Users can view workspace teams" ON crm_teams;
CREATE POLICY "Users can view workspace teams" ON crm_teams
  FOR SELECT USING (
    public.crm_user_belongs_to_workspace(auth.uid(), workspace_id)
  );

-- crm_teams: Actualizar política INSERT
DROP POLICY IF EXISTS "Admins can create teams" ON crm_teams;
CREATE POLICY "Admins can create teams" ON crm_teams
  FOR INSERT WITH CHECK (
    public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );

-- crm_teams: Actualizar política UPDATE
DROP POLICY IF EXISTS "Admins can update teams" ON crm_teams;
CREATE POLICY "Admins can update teams" ON crm_teams
  FOR UPDATE USING (
    public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );

-- crm_teams: Actualizar política DELETE
DROP POLICY IF EXISTS "Admins can delete teams" ON crm_teams;
CREATE POLICY "Admins can delete teams" ON crm_teams
  FOR DELETE USING (
    public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );

-- crm_team_members: Actualizar política SELECT
DROP POLICY IF EXISTS "Users can view team members" ON crm_team_members;
CREATE POLICY "Users can view team members" ON crm_team_members
  FOR SELECT USING (
    public.crm_user_in_team_workspace(auth.uid(), team_id)
  );

-- crm_team_members: Actualizar política INSERT
DROP POLICY IF EXISTS "Admins can add team members" ON crm_team_members;
CREATE POLICY "Admins can add team members" ON crm_team_members
  FOR INSERT WITH CHECK (
    public.crm_user_in_team_workspace(auth.uid(), team_id)
  );

-- crm_team_members: Actualizar política DELETE
DROP POLICY IF EXISTS "Admins can remove team members" ON crm_team_members;
CREATE POLICY "Admins can remove team members" ON crm_team_members
  FOR DELETE USING (
    public.crm_user_in_team_workspace(auth.uid(), team_id)
  );

-- crm_roles: Actualizar política SELECT
DROP POLICY IF EXISTS "Users can view roles in their workspaces" ON crm_roles;
CREATE POLICY "Users can view roles in their workspaces" ON crm_roles
  FOR SELECT USING (
    workspace_id IS NULL 
    OR workspace_id IN (SELECT public.crm_get_user_workspaces(auth.uid()))
  );

-- crm_roles: Actualizar política INSERT
DROP POLICY IF EXISTS "Admins can create roles" ON crm_roles;
CREATE POLICY "Admins can create roles" ON crm_roles
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL 
    AND public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );

-- crm_roles: Actualizar política UPDATE
DROP POLICY IF EXISTS "Admins can update roles" ON crm_roles;
CREATE POLICY "Admins can update roles" ON crm_roles
  FOR UPDATE USING (
    workspace_id IS NOT NULL 
    AND public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );

-- crm_roles: Actualizar política DELETE
DROP POLICY IF EXISTS "Admins can delete roles" ON crm_roles;
CREATE POLICY "Admins can delete roles" ON crm_roles
  FOR DELETE USING (
    workspace_id IS NOT NULL 
    AND NOT is_system 
    AND public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );

-- crm_role_permissions: Actualizar política SELECT
DROP POLICY IF EXISTS "Users can view role permissions" ON crm_role_permissions;
CREATE POLICY "Users can view role permissions" ON crm_role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm_roles r
      WHERE r.id = crm_role_permissions.role_id
        AND (r.workspace_id IS NULL OR r.workspace_id IN (SELECT public.crm_get_user_workspaces(auth.uid())))
    )
  );

-- crm_workspaces: Actualizar política SELECT
DROP POLICY IF EXISTS "Users can view their workspaces" ON crm_workspaces;
CREATE POLICY "Users can view their workspaces" ON crm_workspaces
  FOR SELECT USING (
    id IN (SELECT public.crm_get_user_workspaces(auth.uid()))
  );

-- crm_workspaces: Actualizar política UPDATE
DROP POLICY IF EXISTS "Admins can update their workspaces" ON crm_workspaces;
CREATE POLICY "Admins can update their workspaces" ON crm_workspaces
  FOR UPDATE USING (
    public.crm_is_workspace_admin(auth.uid(), id)
  );

-- crm_user_workspaces: Actualizar política SELECT
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON crm_user_workspaces;
CREATE POLICY "Users can view their workspace memberships" ON crm_user_workspaces
  FOR SELECT USING (
    user_id = auth.uid() 
    OR public.crm_is_workspace_admin(auth.uid(), workspace_id)
  );