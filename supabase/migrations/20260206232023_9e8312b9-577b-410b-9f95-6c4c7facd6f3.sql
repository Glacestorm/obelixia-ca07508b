-- ============================================
-- Fase 8: Contingent Workforce Management
-- Gestión de Freelancers, Contratistas y Trabajadores Externos
-- ============================================

-- Tabla: Trabajadores Contingentes
CREATE TABLE IF NOT EXISTS public.erp_hr_contingent_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  -- Tipo y estado
  worker_type TEXT NOT NULL DEFAULT 'freelancer' CHECK (worker_type IN ('freelancer', 'contractor', 'consultant', 'temp_agency', 'outsourced', 'intern_external', 'gig_worker')),
  status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('active', 'inactive', 'onboarding', 'offboarding', 'suspended', 'pending_approval')),
  
  -- Datos personales/empresa
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT NOT NULL,
  is_company BOOLEAN DEFAULT false,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  country TEXT DEFAULT 'ES',
  
  -- Datos profesionales
  skills TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  portfolio_url TEXT,
  linkedin_url TEXT,
  
  -- Datos financieros
  default_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  rate_type TEXT NOT NULL DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'daily', 'monthly', 'project')),
  currency TEXT DEFAULT 'EUR',
  payment_method TEXT,
  bank_account TEXT,
  
  -- Compliance
  compliance_status TEXT NOT NULL DEFAULT 'medium' CHECK (compliance_status IN ('low', 'medium', 'high', 'critical')),
  last_compliance_review TIMESTAMPTZ,
  has_liability_insurance BOOLEAN DEFAULT false,
  insurance_expiry DATE,
  autonomo_registration TEXT,
  
  -- Metadata
  onboarding_date DATE,
  termination_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Contratos de Servicios
CREATE TABLE IF NOT EXISTS public.erp_hr_contingent_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.erp_hr_contingent_workers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'services' CHECK (contract_type IN ('services', 'project', 'retainer', 'hourly', 'fixed_price', 'milestone')),
  
  -- Detalles
  title TEXT NOT NULL,
  description TEXT,
  scope_of_work TEXT,
  deliverables TEXT[] DEFAULT '{}',
  
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE,
  is_indefinite BOOLEAN DEFAULT false,
  
  -- Financiero
  total_value DECIMAL(14,2),
  rate DECIMAL(12,2) NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'daily', 'monthly', 'fixed')),
  currency TEXT DEFAULT 'EUR',
  payment_terms TEXT DEFAULT 'net_30' CHECK (payment_terms IN ('net_15', 'net_30', 'net_45', 'net_60', 'on_completion', 'milestone')),
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'completed', 'terminated', 'expired')),
  signed_date DATE,
  signed_by_company UUID,
  signed_by_worker TEXT,
  document_url TEXT,
  
  -- Legal
  governing_law TEXT DEFAULT 'ES',
  confidentiality_clause BOOLEAN DEFAULT true,
  non_compete_clause BOOLEAN DEFAULT false,
  ip_assignment BOOLEAN DEFAULT true,
  
  -- Compliance
  compliance_reviewed BOOLEAN DEFAULT false,
  compliance_notes TEXT,
  risk_assessment TEXT CHECK (risk_assessment IS NULL OR risk_assessment IN ('low', 'medium', 'high', 'critical')),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Asignaciones a Proyectos
CREATE TABLE IF NOT EXISTS public.erp_hr_contingent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.erp_hr_contingent_workers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.erp_hr_contingent_contracts(id),
  project_id UUID,
  
  -- Detalles
  assignment_name TEXT NOT NULL,
  description TEXT,
  department_id UUID,
  supervisor_id UUID,
  
  -- Fechas y horas
  start_date DATE NOT NULL,
  end_date DATE,
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Financiero
  budget DECIMAL(14,2),
  actual_cost DECIMAL(14,2) DEFAULT 0,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Registro de Horas
CREATE TABLE IF NOT EXISTS public.erp_hr_contingent_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.erp_hr_contingent_workers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.erp_hr_contingent_assignments(id),
  
  -- Tiempo
  entry_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  
  -- Aprobación
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Facturación
  billable BOOLEAN DEFAULT true,
  rate_applied DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  invoice_id UUID,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Facturas de Trabajadores Contingentes
CREATE TABLE IF NOT EXISTS public.erp_hr_contingent_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.erp_hr_contingent_workers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  
  -- Detalles
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Financiero
  subtotal DECIMAL(14,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 21,
  tax_amount DECIMAL(14,2) NOT NULL,
  total DECIMAL(14,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'rejected', 'disputed')),
  payment_date DATE,
  payment_reference TEXT,
  
  -- Documentos
  invoice_document_url TEXT,
  supporting_docs TEXT[] DEFAULT '{}',
  
  -- Integración
  treasury_payment_id UUID,
  accounting_entry_id UUID,
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Checks de Compliance
CREATE TABLE IF NOT EXISTS public.erp_hr_contingent_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.erp_hr_contingent_workers(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL DEFAULT 'periodic' CHECK (check_type IN ('initial', 'periodic', 'incident', 'termination')),
  check_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Scores de evaluación (0-100)
  economic_dependence_score DECIMAL(5,2) DEFAULT 0,
  organizational_integration_score DECIMAL(5,2) DEFAULT 0,
  autonomy_score DECIMAL(5,2) DEFAULT 0,
  tools_ownership_score DECIMAL(5,2) DEFAULT 0,
  overall_risk_score DECIMAL(5,2) DEFAULT 0,
  
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Detalles del análisis
  factors_analyzed JSONB DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  action_required BOOLEAN DEFAULT false,
  
  -- Revisión
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'closed')),
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_contingent_workers_company ON public.erp_hr_contingent_workers(company_id);
CREATE INDEX IF NOT EXISTS idx_contingent_workers_status ON public.erp_hr_contingent_workers(status);
CREATE INDEX IF NOT EXISTS idx_contingent_workers_compliance ON public.erp_hr_contingent_workers(compliance_status);
CREATE INDEX IF NOT EXISTS idx_contingent_contracts_company ON public.erp_hr_contingent_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contingent_contracts_worker ON public.erp_hr_contingent_contracts(worker_id);
CREATE INDEX IF NOT EXISTS idx_contingent_contracts_status ON public.erp_hr_contingent_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contingent_time_entries_worker ON public.erp_hr_contingent_time_entries(worker_id);
CREATE INDEX IF NOT EXISTS idx_contingent_time_entries_date ON public.erp_hr_contingent_time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_contingent_invoices_worker ON public.erp_hr_contingent_invoices(worker_id);
CREATE INDEX IF NOT EXISTS idx_contingent_compliance_worker ON public.erp_hr_contingent_compliance_checks(worker_id);

-- RLS Policies
ALTER TABLE public.erp_hr_contingent_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_contingent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_contingent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_contingent_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_contingent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_contingent_compliance_checks ENABLE ROW LEVEL SECURITY;

-- Policy para usuarios autenticados (pueden ver sus empresas)
CREATE POLICY "contingent_workers_access" ON public.erp_hr_contingent_workers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "contingent_contracts_access" ON public.erp_hr_contingent_contracts
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "contingent_assignments_access" ON public.erp_hr_contingent_assignments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "contingent_time_entries_access" ON public.erp_hr_contingent_time_entries
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "contingent_invoices_access" ON public.erp_hr_contingent_invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "contingent_compliance_access" ON public.erp_hr_contingent_compliance_checks
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_contingent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contingent_workers_updated
  BEFORE UPDATE ON public.erp_hr_contingent_workers
  FOR EACH ROW EXECUTE FUNCTION update_contingent_updated_at();

CREATE TRIGGER trg_contingent_contracts_updated
  BEFORE UPDATE ON public.erp_hr_contingent_contracts
  FOR EACH ROW EXECUTE FUNCTION update_contingent_updated_at();

CREATE TRIGGER trg_contingent_assignments_updated
  BEFORE UPDATE ON public.erp_hr_contingent_assignments
  FOR EACH ROW EXECUTE FUNCTION update_contingent_updated_at();

CREATE TRIGGER trg_contingent_time_entries_updated
  BEFORE UPDATE ON public.erp_hr_contingent_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_contingent_updated_at();

CREATE TRIGGER trg_contingent_invoices_updated
  BEFORE UPDATE ON public.erp_hr_contingent_invoices
  FOR EACH ROW EXECUTE FUNCTION update_contingent_updated_at();

CREATE TRIGGER trg_contingent_compliance_updated
  BEFORE UPDATE ON public.erp_hr_contingent_compliance_checks
  FOR EACH ROW EXECUTE FUNCTION update_contingent_updated_at();