-- =====================================================
-- FASE 6: MATTER MANAGEMENT & LEGAL SPEND
-- =====================================================

-- Tabla principal de asuntos legales
CREATE TABLE public.erp_legal_matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  matter_number VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  matter_type VARCHAR(100) NOT NULL, -- litigation, contract, compliance, advisory, ip, m_and_a, labor, regulatory
  status VARCHAR(50) DEFAULT 'active', -- active, pending, on_hold, closed, archived
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  practice_area VARCHAR(100), -- corporate, litigation, tax, labor, ip, real_estate, etc.
  client_matter_id VARCHAR(100), -- Reference externa del cliente
  
  -- Fechas importantes
  open_date DATE NOT NULL DEFAULT CURRENT_DATE,
  close_date DATE,
  statute_of_limitations DATE,
  next_deadline DATE,
  
  -- Responsables
  lead_attorney_id UUID,
  responsible_partner_id UUID,
  assigned_team JSONB DEFAULT '[]'::jsonb,
  
  -- Financieros
  billing_type VARCHAR(50) DEFAULT 'hourly', -- hourly, fixed_fee, contingency, hybrid, pro_bono
  agreed_fee DECIMAL(15,2),
  budget_amount DECIMAL(15,2),
  budget_spent DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Contraparte
  opposing_party VARCHAR(500),
  opposing_counsel VARCHAR(500),
  jurisdiction VARCHAR(100),
  court_reference VARCHAR(200),
  
  -- Metadatos
  risk_assessment VARCHAR(20), -- low, medium, high, critical
  risk_notes TEXT,
  outcome VARCHAR(100), -- won, lost, settled, dismissed, withdrawn
  outcome_amount DECIMAL(15,2),
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  
  UNIQUE(company_id, matter_number)
);

-- Tareas legales
CREATE TABLE public.erp_legal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  matter_id UUID REFERENCES public.erp_legal_matters(id) ON DELETE CASCADE NOT NULL,
  parent_task_id UUID REFERENCES public.erp_legal_tasks(id) ON DELETE SET NULL,
  
  title VARCHAR(500) NOT NULL,
  description TEXT,
  task_type VARCHAR(100), -- research, drafting, review, filing, hearing, meeting, call, negotiation
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, deferred
  priority VARCHAR(20) DEFAULT 'medium',
  
  assigned_to UUID,
  assigned_team JSONB DEFAULT '[]'::jsonb,
  
  due_date TIMESTAMPTZ,
  reminder_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  billable BOOLEAN DEFAULT true,
  
  dependencies UUID[] DEFAULT '{}',
  checklist JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de tiempo (Time Entries)
CREATE TABLE public.erp_legal_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  matter_id UUID REFERENCES public.erp_legal_matters(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.erp_legal_tasks(id) ON DELETE SET NULL,
  
  timekeeper_id UUID NOT NULL,
  timekeeper_role VARCHAR(100), -- partner, associate, paralegal, trainee
  
  work_date DATE NOT NULL,
  hours DECIMAL(6,2) NOT NULL,
  description TEXT NOT NULL,
  
  -- Códigos UTBMS/LEDES
  activity_code VARCHAR(20), -- A101, A102, etc.
  task_code VARCHAR(20), -- L110, L120, etc.
  expense_code VARCHAR(20),
  
  -- Facturación
  billable BOOLEAN DEFAULT true,
  billing_status VARCHAR(50) DEFAULT 'unbilled', -- unbilled, billed, written_off, no_charge
  hourly_rate DECIMAL(10,2),
  amount DECIMAL(15,2),
  invoice_id UUID,
  
  -- Aprobación
  approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gastos legales (Legal Expenses)
CREATE TABLE public.erp_legal_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  matter_id UUID REFERENCES public.erp_legal_matters(id) ON DELETE CASCADE NOT NULL,
  
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  expense_type VARCHAR(100) NOT NULL, -- court_fees, expert_fees, travel, filing, copies, research, courier, etc.
  
  -- Códigos LEDES
  expense_code VARCHAR(20), -- E101, E102, etc.
  
  -- Montos
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  billed_amount DECIMAL(15,2),
  
  -- Proveedor
  vendor_name VARCHAR(300),
  vendor_id UUID,
  invoice_reference VARCHAR(100),
  
  -- Estado
  billable BOOLEAN DEFAULT true,
  billing_status VARCHAR(50) DEFAULT 'unbilled',
  reimbursable BOOLEAN DEFAULT true,
  reimbursement_status VARCHAR(50) DEFAULT 'pending',
  
  -- Aprobación
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Facturas legales (Legal Invoices - LEDES compatible)
CREATE TABLE public.erp_legal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  matter_id UUID REFERENCES public.erp_legal_matters(id) ON DELETE CASCADE,
  
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Cliente/Proveedor
  billing_entity_type VARCHAR(20) NOT NULL, -- client (factura a cliente) o vendor (factura de proveedor)
  entity_id UUID,
  entity_name VARCHAR(300),
  
  -- Montos
  fees_amount DECIMAL(15,2) DEFAULT 0,
  expenses_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Estado
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, partial, overdue, disputed, written_off
  payment_date DATE,
  payment_amount DECIMAL(15,2),
  payment_reference VARCHAR(200),
  
  -- LEDES
  ledes_format VARCHAR(20), -- LEDES98B, LEDES2000, LEDES_XML
  ledes_file_url TEXT,
  ledes_data JSONB,
  
  -- Análisis AI
  ai_analysis JSONB,
  anomaly_flags JSONB DEFAULT '[]'::jsonb,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, invoice_number)
);

-- Proveedores legales externos (Law Firms, Counsel)
CREATE TABLE public.erp_legal_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  
  vendor_name VARCHAR(300) NOT NULL,
  vendor_type VARCHAR(50) NOT NULL, -- law_firm, solo_practitioner, consultant, expert_witness, court, notary
  
  -- Contacto
  contact_name VARCHAR(200),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  address TEXT,
  country VARCHAR(2),
  
  -- Especialidades
  practice_areas TEXT[],
  jurisdictions TEXT[],
  
  -- Tarifas
  standard_rates JSONB, -- { "partner": 400, "associate": 250, "paralegal": 120 }
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_terms INTEGER DEFAULT 30,
  
  -- Evaluación
  performance_rating DECIMAL(3,2), -- 0-5
  relationship_status VARCHAR(50) DEFAULT 'active', -- active, preferred, on_hold, terminated
  
  -- Panel/Roster
  panel_member BOOLEAN DEFAULT false,
  panel_category VARCHAR(50),
  diversity_certified BOOLEAN DEFAULT false,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Análisis de gastos legales (Legal Spend Analytics)
CREATE TABLE public.erp_legal_spend_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Métricas de gasto
  total_spend DECIMAL(15,2) DEFAULT 0,
  internal_spend DECIMAL(15,2) DEFAULT 0,
  external_spend DECIMAL(15,2) DEFAULT 0,
  fees_spend DECIMAL(15,2) DEFAULT 0,
  expenses_spend DECIMAL(15,2) DEFAULT 0,
  
  -- Desglose por área
  spend_by_practice_area JSONB DEFAULT '{}'::jsonb,
  spend_by_matter_type JSONB DEFAULT '{}'::jsonb,
  spend_by_vendor JSONB DEFAULT '{}'::jsonb,
  spend_by_jurisdiction JSONB DEFAULT '{}'::jsonb,
  
  -- KPIs
  matters_opened INTEGER DEFAULT 0,
  matters_closed INTEGER DEFAULT 0,
  average_matter_cost DECIMAL(15,2),
  budget_variance_percentage DECIMAL(5,2),
  
  -- Tendencias
  spend_vs_previous_period DECIMAL(5,2),
  forecast_next_period DECIMAL(15,2),
  
  -- Análisis AI
  ai_insights JSONB,
  cost_optimization_opportunities JSONB DEFAULT '[]'::jsonb,
  anomalies_detected JSONB DEFAULT '[]'::jsonb,
  
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.erp_legal_matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_legal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_legal_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_legal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_legal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_legal_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_legal_spend_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage legal matters" ON public.erp_legal_matters
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage legal tasks" ON public.erp_legal_tasks
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage time entries" ON public.erp_legal_time_entries
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage legal expenses" ON public.erp_legal_expenses
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage legal invoices" ON public.erp_legal_invoices
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage legal vendors" ON public.erp_legal_vendors
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view spend analytics" ON public.erp_legal_spend_analytics
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Índices para rendimiento
CREATE INDEX idx_legal_matters_company ON public.erp_legal_matters(company_id);
CREATE INDEX idx_legal_matters_status ON public.erp_legal_matters(status);
CREATE INDEX idx_legal_matters_type ON public.erp_legal_matters(matter_type);
CREATE INDEX idx_legal_tasks_matter ON public.erp_legal_tasks(matter_id);
CREATE INDEX idx_legal_tasks_status ON public.erp_legal_tasks(status);
CREATE INDEX idx_legal_tasks_due ON public.erp_legal_tasks(due_date);
CREATE INDEX idx_legal_time_matter ON public.erp_legal_time_entries(matter_id);
CREATE INDEX idx_legal_time_date ON public.erp_legal_time_entries(work_date);
CREATE INDEX idx_legal_time_billing ON public.erp_legal_time_entries(billing_status);
CREATE INDEX idx_legal_expenses_matter ON public.erp_legal_expenses(matter_id);
CREATE INDEX idx_legal_invoices_matter ON public.erp_legal_invoices(matter_id);
CREATE INDEX idx_legal_invoices_status ON public.erp_legal_invoices(status);
CREATE INDEX idx_legal_spend_period ON public.erp_legal_spend_analytics(period_start, period_end);

-- Triggers para updated_at
CREATE TRIGGER update_erp_legal_matters_updated_at
  BEFORE UPDATE ON public.erp_legal_matters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_legal_tasks_updated_at
  BEFORE UPDATE ON public.erp_legal_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_legal_time_entries_updated_at
  BEFORE UPDATE ON public.erp_legal_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_legal_expenses_updated_at
  BEFORE UPDATE ON public.erp_legal_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_legal_invoices_updated_at
  BEFORE UPDATE ON public.erp_legal_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_legal_vendors_updated_at
  BEFORE UPDATE ON public.erp_legal_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();