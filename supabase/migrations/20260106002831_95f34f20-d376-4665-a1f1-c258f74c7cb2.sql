-- =====================================================
-- CRM CONTACTS & DEALS - Tablas principales
-- =====================================================

-- Tabla de contactos
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  
  -- Datos básicos
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  
  -- Clasificación
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'inactive', 'customer', 'lost')),
  source TEXT, -- web, referral, social, email, phone, etc.
  
  -- Asignación
  assigned_to UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.crm_teams(id),
  
  -- Valores
  lifetime_value NUMERIC(12,2) DEFAULT 0,
  deals_count INTEGER DEFAULT 0,
  
  -- Metadatos
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Tabla de deals/oportunidades
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  
  -- Datos del deal
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Pipeline
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost')),
  probability INTEGER DEFAULT 20 CHECK (probability >= 0 AND probability <= 100),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Fechas
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  
  -- Asignación
  owner_id UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.crm_teams(id),
  
  -- Metadatos
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  lost_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Tabla de actividades
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  
  -- Tipo de actividad
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'task', 'note', 'whatsapp', 'other')),
  subject TEXT NOT NULL,
  description TEXT,
  
  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Programación
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Asignación
  assigned_to UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace ON public.crm_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON public.crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned ON public.crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_deals_workspace ON public.crm_deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON public.crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_workspace ON public.crm_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities(contact_id);

-- Enable RLS
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando la función has_crm_permission
CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.read'));

CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT
  WITH CHECK (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.create'));

CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.update'));

CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.delete'));

CREATE POLICY "crm_deals_select" ON public.crm_deals FOR SELECT
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'deals.read'));

CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT
  WITH CHECK (public.has_crm_permission(auth.uid(), workspace_id, 'deals.create'));

CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'deals.update'));

CREATE POLICY "crm_deals_delete" ON public.crm_deals FOR DELETE
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'deals.delete'));

CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.read'));

CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT
  WITH CHECK (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.create'));

CREATE POLICY "crm_activities_update" ON public.crm_activities FOR UPDATE
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.update'));

CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE
  USING (public.has_crm_permission(auth.uid(), workspace_id, 'contacts.delete'));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_activities_updated_at
  BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();