-- CRM Multi-Workspace Tables (equivalente a ERP multi-empresa)

-- 1. Workspaces CRM (equivalente a erp_companies)
CREATE TABLE public.crm_workspaces (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    website TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'ES',
    timezone TEXT DEFAULT 'Europe/Madrid',
    currency TEXT DEFAULT 'EUR',
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Roles CRM
CREATE TABLE public.crm_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, name)
);

-- 3. Permisos CRM
CREATE TABLE public.crm_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Relación Roles-Permisos
CREATE TABLE public.crm_role_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES public.crm_roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.crm_permissions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

-- 5. Usuarios-Workspaces
CREATE TABLE public.crm_user_workspaces (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.crm_roles(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, workspace_id)
);

-- Insertar permisos base del CRM
INSERT INTO public.crm_permissions (key, name, description, module) VALUES
-- Admin
('admin.all', 'Super Administrador', 'Acceso total al CRM', 'admin'),
-- Pipeline
('pipeline.read', 'Ver Pipeline', 'Ver oportunidades y pipeline de ventas', 'pipeline'),
('pipeline.write', 'Gestionar Pipeline', 'Crear y editar oportunidades', 'pipeline'),
('pipeline.delete', 'Eliminar Oportunidades', 'Eliminar oportunidades del pipeline', 'pipeline'),
-- Contactos
('contacts.read', 'Ver Contactos', 'Ver contactos y leads', 'contacts'),
('contacts.write', 'Gestionar Contactos', 'Crear y editar contactos', 'contacts'),
('contacts.delete', 'Eliminar Contactos', 'Eliminar contactos', 'contacts'),
-- Inbox/Omnichannel
('inbox.read', 'Ver Inbox', 'Ver conversaciones omnicanal', 'inbox'),
('inbox.write', 'Gestionar Conversaciones', 'Responder y asignar conversaciones', 'inbox'),
-- Sentimiento
('sentiment.read', 'Ver Análisis de Sentimiento', 'Acceder a análisis de sentimiento', 'sentiment'),
-- SLAs
('sla.read', 'Ver SLAs', 'Ver configuración y métricas de SLAs', 'sla'),
('sla.write', 'Gestionar SLAs', 'Configurar SLAs', 'sla'),
-- Automatización
('automation.read', 'Ver Automatizaciones', 'Ver flujos de automatización', 'automation'),
('automation.write', 'Gestionar Automatizaciones', 'Crear y editar automatizaciones', 'automation'),
-- Reportes
('reports.read', 'Ver Reportes', 'Acceder a reportes y analytics', 'reports'),
('reports.export', 'Exportar Reportes', 'Exportar datos de reportes', 'reports'),
-- Equipos
('teams.read', 'Ver Equipos', 'Ver equipos y asignaciones', 'teams'),
('teams.write', 'Gestionar Equipos', 'Gestionar equipos y miembros', 'teams'),
-- Agentes IA
('agents.read', 'Ver Agentes IA', 'Ver agentes de IA', 'agents'),
('agents.write', 'Gestionar Agentes IA', 'Configurar agentes de IA', 'agents');

-- Enable RLS
ALTER TABLE public.crm_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_user_workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies para crm_workspaces
CREATE POLICY "Users can view their workspaces"
ON public.crm_workspaces FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT workspace_id FROM public.crm_user_workspaces
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Users with admin can insert workspaces"
ON public.crm_workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update their workspaces"
ON public.crm_workspaces FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT uw.workspace_id FROM public.crm_user_workspaces uw
        JOIN public.crm_roles r ON r.id = uw.role_id
        JOIN public.crm_role_permissions rp ON rp.role_id = r.id
        JOIN public.crm_permissions p ON p.id = rp.permission_id
        WHERE uw.user_id = auth.uid() AND p.key = 'admin.all'
    )
);

-- RLS Policies para crm_roles
CREATE POLICY "Users can view roles in their workspaces"
ON public.crm_roles FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.crm_user_workspaces
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Users can insert roles"
ON public.crm_roles FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies para crm_permissions (todos pueden leer)
CREATE POLICY "Anyone can read permissions"
ON public.crm_permissions FOR SELECT
TO authenticated
USING (true);

-- RLS Policies para crm_role_permissions
CREATE POLICY "Users can view role permissions in their workspaces"
ON public.crm_role_permissions FOR SELECT
TO authenticated
USING (
    role_id IN (
        SELECT id FROM public.crm_roles WHERE workspace_id IN (
            SELECT workspace_id FROM public.crm_user_workspaces
            WHERE user_id = auth.uid() AND is_active = true
        )
    )
);

CREATE POLICY "Users can insert role permissions"
ON public.crm_role_permissions FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies para crm_user_workspaces
CREATE POLICY "Users can view their own workspace assignments"
ON public.crm_user_workspaces FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert workspace assignments"
ON public.crm_user_workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_crm_workspaces_updated_at
    BEFORE UPDATE ON public.crm_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_roles_updated_at
    BEFORE UPDATE ON public.crm_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_user_workspaces_updated_at
    BEFORE UPDATE ON public.crm_user_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();