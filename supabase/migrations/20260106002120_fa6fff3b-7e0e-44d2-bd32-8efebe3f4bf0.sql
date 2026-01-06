-- Añadir tablas de teams y function de permisos

-- CRM TEAMS
CREATE TABLE IF NOT EXISTS public.crm_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  lead_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.crm_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.crm_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.crm_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_team_members ENABLE ROW LEVEL SECURITY;

-- Security definer function para verificar permisos CRM
CREATE OR REPLACE FUNCTION public.has_crm_permission(_user_id UUID, _workspace_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crm_user_workspaces uw
    JOIN crm_roles r ON r.id = uw.role_id
    JOIN crm_role_permissions rp ON rp.role_id = r.id
    JOIN crm_permissions p ON p.id = rp.permission_id
    WHERE uw.user_id = _user_id
      AND uw.workspace_id = _workspace_id
      AND uw.is_active = true
      AND (p.key = _permission_key OR p.key = 'admin.all')
  )
$$;

-- Políticas para teams
DROP POLICY IF EXISTS "Users can view workspace teams" ON public.crm_teams;
CREATE POLICY "Users can view workspace teams"
ON public.crm_teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM crm_user_workspaces
    WHERE workspace_id = crm_teams.workspace_id
    AND user_id = auth.uid()
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Users can view team members" ON public.crm_team_members;
CREATE POLICY "Users can view team members"
ON public.crm_team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM crm_teams t
    JOIN crm_user_workspaces uw ON uw.workspace_id = t.workspace_id
    WHERE t.id = crm_team_members.team_id
    AND uw.user_id = auth.uid()
    AND uw.is_active = true
  )
);

-- Añadir permisos faltantes (usando columnas correctas: key, name, description, module)
INSERT INTO public.crm_permissions (key, name, description, module) 
VALUES
('admin.all', 'Administrador Total', 'Acceso total de administrador', 'admin'),
('workspace.read', 'Ver Workspace', 'Ver configuración del workspace', 'workspace'),
('workspace.update', 'Editar Workspace', 'Editar configuración del workspace', 'workspace'),
('workspace.users.read', 'Ver Usuarios', 'Ver usuarios del workspace', 'workspace'),
('workspace.users.invite', 'Invitar Usuarios', 'Invitar usuarios', 'workspace'),
('teams.read', 'Ver Equipos', 'Ver equipos', 'teams'),
('teams.manage', 'Gestionar Equipos', 'Gestionar equipos', 'teams'),
('contacts.read', 'Ver Contactos', 'Ver contactos', 'contacts'),
('contacts.create', 'Crear Contactos', 'Crear contactos', 'contacts'),
('contacts.update', 'Editar Contactos', 'Editar contactos', 'contacts'),
('pipeline.read', 'Ver Pipeline', 'Ver pipeline', 'pipeline'),
('pipeline.manage', 'Gestionar Pipeline', 'Gestionar pipeline', 'pipeline'),
('deals.read', 'Ver Oportunidades', 'Ver oportunidades', 'deals'),
('deals.create', 'Crear Oportunidades', 'Crear oportunidades', 'deals'),
('automation.read', 'Ver Automatización', 'Ver automatizaciones', 'automation'),
('automation.manage', 'Gestionar Automatización', 'Gestionar automatizaciones', 'automation'),
('reports.read', 'Ver Reportes', 'Ver reportes', 'reports')
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_teams_workspace ON public.crm_teams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_team_members_team ON public.crm_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_crm_team_members_user ON public.crm_team_members(user_id);