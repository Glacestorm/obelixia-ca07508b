-- ============================================
-- FASE 11: Gestión de Fuerza Laboral Gig/Contingent
-- Tablas para freelancers, contractors y trabajadores externos
-- ============================================

-- Tabla principal de contractors
CREATE TABLE public.erp_gig_contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contractor_type TEXT NOT NULL CHECK (contractor_type IN ('freelancer', 'contractor', 'consultant', 'temp_agency', 'outsourced', 'intern')),
  status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('active', 'onboarding', 'offboarding', 'inactive', 'blacklisted')),
  
  -- Datos personales/empresa
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT NOT NULL DEFAULT 'ES',
  address TEXT,
  
  -- Datos contractuales
  primary_skill_category TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_type TEXT NOT NULL DEFAULT 'hourly' CHECK (payment_type IN ('hourly', 'daily', 'project', 'milestone', 'retainer')),
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  
  -- Compliance
  compliance_status TEXT NOT NULL DEFAULT 'pending_docs' CHECK (compliance_status IN ('compliant', 'pending_docs', 'expired', 'non_compliant')),
  has_liability_insurance BOOLEAN NOT NULL DEFAULT false,
  insurance_expiry DATE,
  has_nda_signed BOOLEAN NOT NULL DEFAULT false,
  nda_signed_at TIMESTAMPTZ,
  has_ip_agreement BOOLEAN NOT NULL DEFAULT false,
  background_check_status TEXT,
  
  -- Evaluación
  performance_rating DECIMAL(3,2),
  total_projects INTEGER NOT NULL DEFAULT 0,
  total_hours_logged DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_invoiced DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Relaciones
  agency_id UUID,
  manager_user_id UUID,
  
  -- Metadatos
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de proyectos asignados a contractors
CREATE TABLE public.erp_gig_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contractor_id UUID NOT NULL REFERENCES public.erp_gig_contractors(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Alcance
  scope_type TEXT NOT NULL DEFAULT 'time_and_materials' CHECK (scope_type IN ('fixed', 'time_and_materials', 'retainer')),
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  budget_amount DECIMAL(12,2),
  spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE,
  deadline DATE,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  
  -- Facturación
  invoiced_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Entregables
  deliverables JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, project_code)
);

-- Tabla de entradas de tiempo
CREATE TABLE public.erp_gig_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.erp_gig_projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.erp_gig_contractors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT true,
  rate_applied DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'invoiced')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de facturas de contractors
CREATE TABLE public.erp_gig_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contractor_id UUID NOT NULL REFERENCES public.erp_gig_contractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.erp_gig_projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  tax_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected', 'cancelled')),
  payment_date DATE,
  payment_reference TEXT,
  
  line_items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, invoice_number)
);

-- Tabla de documentos de compliance
CREATE TABLE public.erp_gig_compliance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES public.erp_gig_contractors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_document', 'tax_certificate', 'insurance', 'nda', 'contract', 'background_check', 'other')),
  document_name TEXT NOT NULL,
  file_url TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('valid', 'pending_review', 'expired', 'rejected')),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de rendimiento
CREATE INDEX idx_gig_contractors_company ON public.erp_gig_contractors(company_id);
CREATE INDEX idx_gig_contractors_status ON public.erp_gig_contractors(status);
CREATE INDEX idx_gig_contractors_type ON public.erp_gig_contractors(contractor_type);
CREATE INDEX idx_gig_contractors_compliance ON public.erp_gig_contractors(compliance_status);
CREATE INDEX idx_gig_projects_company ON public.erp_gig_projects(company_id);
CREATE INDEX idx_gig_projects_contractor ON public.erp_gig_projects(contractor_id);
CREATE INDEX idx_gig_projects_status ON public.erp_gig_projects(status);
CREATE INDEX idx_gig_time_entries_project ON public.erp_gig_time_entries(project_id);
CREATE INDEX idx_gig_time_entries_contractor ON public.erp_gig_time_entries(contractor_id);
CREATE INDEX idx_gig_time_entries_status ON public.erp_gig_time_entries(status);
CREATE INDEX idx_gig_invoices_company ON public.erp_gig_invoices(company_id);
CREATE INDEX idx_gig_invoices_contractor ON public.erp_gig_invoices(contractor_id);
CREATE INDEX idx_gig_invoices_status ON public.erp_gig_invoices(status);
CREATE INDEX idx_gig_compliance_docs_contractor ON public.erp_gig_compliance_documents(contractor_id);
CREATE INDEX idx_gig_compliance_docs_expiry ON public.erp_gig_compliance_documents(expiry_date);

-- Habilitar RLS
ALTER TABLE public.erp_gig_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_gig_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_gig_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_gig_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_gig_compliance_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS usando función de acceso existente
CREATE POLICY "erp_gig_contractors_access" ON public.erp_gig_contractors
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_gig_projects_access" ON public.erp_gig_projects
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_gig_time_entries_access" ON public.erp_gig_time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_gig_projects p 
      WHERE p.id = project_id AND public.user_has_erp_company_access(p.company_id)
    )
  );

CREATE POLICY "erp_gig_invoices_access" ON public.erp_gig_invoices
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_gig_compliance_documents_access" ON public.erp_gig_compliance_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_gig_contractors c 
      WHERE c.id = contractor_id AND public.user_has_erp_company_access(c.company_id)
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_erp_gig_contractors_updated_at
  BEFORE UPDATE ON public.erp_gig_contractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_gig_projects_updated_at
  BEFORE UPDATE ON public.erp_gig_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_gig_invoices_updated_at
  BEFORE UPDATE ON public.erp_gig_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();