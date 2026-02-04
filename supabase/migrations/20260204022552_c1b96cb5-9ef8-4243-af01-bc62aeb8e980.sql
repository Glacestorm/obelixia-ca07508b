-- ============================================
-- FASE 1: Sistema de Convenios Colectivos y Recálculo de Nóminas
-- ============================================

-- 1.1 Tabla de Convenios Colectivos
CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cnae_codes TEXT[] DEFAULT '{}',
  jurisdiction_code TEXT NOT NULL DEFAULT 'ES',
  effective_date DATE NOT NULL,
  expiration_date DATE,
  salary_tables JSONB DEFAULT '{}',
  annual_updates JSONB DEFAULT '[]',
  extra_payments INTEGER DEFAULT 14,
  working_hours_week NUMERIC(5,2) DEFAULT 40.00,
  vacation_days INTEGER DEFAULT 30,
  seniority_rules JSONB DEFAULT '{}',
  night_shift_bonus JSONB DEFAULT '{}',
  other_concepts JSONB DEFAULT '{}',
  union_obligations JSONB DEFAULT '{}',
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_hr_agreements_cnae ON public.erp_hr_collective_agreements USING GIN (cnae_codes);
CREATE INDEX IF NOT EXISTS idx_hr_agreements_code ON public.erp_hr_collective_agreements (code);
CREATE INDEX IF NOT EXISTS idx_hr_agreements_jurisdiction ON public.erp_hr_collective_agreements (jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_hr_agreements_name_search ON public.erp_hr_collective_agreements USING GIN (to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_hr_agreements_company ON public.erp_hr_collective_agreements (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_agreements_active ON public.erp_hr_collective_agreements (is_active) WHERE is_active = true;

-- 1.2 Catálogo de Conceptos Salariales por Convenio
CREATE TABLE IF NOT EXISTS public.erp_hr_agreement_salary_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES public.erp_hr_collective_agreements(id) ON DELETE CASCADE NOT NULL,
  concept_code TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  concept_type TEXT NOT NULL CHECK (concept_type IN ('earning', 'deduction')),
  is_mandatory BOOLEAN DEFAULT false,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('fixed', 'percentage', 'formula', 'days', 'hours')),
  base_amount NUMERIC(12,2) DEFAULT 0,
  percentage NUMERIC(6,4) DEFAULT 0,
  formula TEXT,
  applies_to_categories TEXT[] DEFAULT '{}',
  cotiza_ss BOOLEAN DEFAULT true,
  tributa_irpf BOOLEAN DEFAULT true,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'annual', 'per_day', 'per_hour', 'biannual', 'quarterly')),
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agreement_id, concept_code)
);

CREATE INDEX IF NOT EXISTS idx_hr_salary_concepts_agreement ON public.erp_hr_agreement_salary_concepts (agreement_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_concepts_mandatory ON public.erp_hr_agreement_salary_concepts (is_mandatory) WHERE is_mandatory = true;

-- 1.3 Histórico de Recálculos y Validaciones
CREATE TABLE IF NOT EXISTS public.erp_hr_payroll_recalculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  payroll_id UUID,
  employee_id UUID NOT NULL,
  contract_id UUID,
  agreement_id UUID REFERENCES public.erp_hr_collective_agreements(id),
  period TEXT NOT NULL,
  original_values JSONB DEFAULT '{}',
  recalculated_values JSONB DEFAULT '{}',
  differences JSONB DEFAULT '[]',
  compliance_issues JSONB DEFAULT '[]',
  ai_validation JSONB DEFAULT '{}',
  ai_validation_status TEXT DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'approved', 'rejected', 'review_required')),
  legal_validation JSONB DEFAULT '{}',
  legal_validation_status TEXT DEFAULT 'pending' CHECK (legal_validation_status IN ('pending', 'approved', 'rejected', 'escalated')),
  legal_review_id UUID,
  hr_approval JSONB DEFAULT '{}',
  hr_approval_status TEXT DEFAULT 'pending' CHECK (hr_approval_status IN ('pending', 'approved', 'rejected', 'more_info_needed')),
  hr_approver_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculating', 'ai_reviewed', 'legal_reviewed', 'pending_approval', 'approved', 'rejected', 'applied', 'cancelled')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  total_difference NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hr_recalculations_company ON public.erp_hr_payroll_recalculations (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_recalculations_employee ON public.erp_hr_payroll_recalculations (employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_recalculations_period ON public.erp_hr_payroll_recalculations (period);
CREATE INDEX IF NOT EXISTS idx_hr_recalculations_status ON public.erp_hr_payroll_recalculations (status);
CREATE INDEX IF NOT EXISTS idx_hr_recalculations_pending ON public.erp_hr_payroll_recalculations (hr_approval_status) WHERE hr_approval_status = 'pending';

-- 1.4 Añadir campo Convenio a Contratos (Obligatorio por Art. 8.5 ET)
ALTER TABLE public.erp_hr_contracts 
ADD COLUMN IF NOT EXISTS collective_agreement_id UUID REFERENCES public.erp_hr_collective_agreements(id);

-- Índice para la relación
CREATE INDEX IF NOT EXISTS idx_hr_contracts_agreement ON public.erp_hr_contracts (collective_agreement_id);

-- 1.5 Enable RLS
ALTER TABLE public.erp_hr_collective_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_agreement_salary_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_payroll_recalculations ENABLE ROW LEVEL SECURITY;

-- 1.6 RLS Policies for erp_hr_collective_agreements
CREATE POLICY "Convenios sistema visibles para todos autenticados"
ON public.erp_hr_collective_agreements
FOR SELECT
TO authenticated
USING (is_system = true);

CREATE POLICY "Usuarios pueden ver convenios de su empresa"
ON public.erp_hr_collective_agreements
FOR SELECT
TO authenticated
USING (
  company_id IS NULL 
  OR company_id IN (
    SELECT company_id FROM public.erp_user_companies 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "HR Managers pueden gestionar convenios de su empresa"
ON public.erp_hr_collective_agreements
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT uc.company_id FROM public.erp_user_companies uc
    JOIN public.erp_roles r ON uc.role_id = r.id
    WHERE uc.user_id = auth.uid() AND uc.is_active = true
    AND (r.name ILIKE '%admin%' OR r.name ILIKE '%hr%' OR r.name ILIKE '%rrhh%')
  )
)
WITH CHECK (
  company_id IN (
    SELECT uc.company_id FROM public.erp_user_companies uc
    JOIN public.erp_roles r ON uc.role_id = r.id
    WHERE uc.user_id = auth.uid() AND uc.is_active = true
    AND (r.name ILIKE '%admin%' OR r.name ILIKE '%hr%' OR r.name ILIKE '%rrhh%')
  )
);

-- 1.7 RLS Policies for erp_hr_agreement_salary_concepts
CREATE POLICY "Conceptos visibles si el convenio es visible"
ON public.erp_hr_agreement_salary_concepts
FOR SELECT
TO authenticated
USING (
  agreement_id IN (
    SELECT id FROM public.erp_hr_collective_agreements
    WHERE is_system = true 
    OR company_id IS NULL
    OR company_id IN (
      SELECT company_id FROM public.erp_user_companies 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "HR Managers pueden gestionar conceptos"
ON public.erp_hr_agreement_salary_concepts
FOR ALL
TO authenticated
USING (
  agreement_id IN (
    SELECT ca.id FROM public.erp_hr_collective_agreements ca
    WHERE ca.company_id IN (
      SELECT uc.company_id FROM public.erp_user_companies uc
      JOIN public.erp_roles r ON uc.role_id = r.id
      WHERE uc.user_id = auth.uid() AND uc.is_active = true
      AND (r.name ILIKE '%admin%' OR r.name ILIKE '%hr%' OR r.name ILIKE '%rrhh%')
    )
  )
);

-- 1.8 RLS Policies for erp_hr_payroll_recalculations
CREATE POLICY "Usuarios ven recálculos de su empresa"
ON public.erp_hr_payroll_recalculations
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.erp_user_companies 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "HR Managers gestionan recálculos"
ON public.erp_hr_payroll_recalculations
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT uc.company_id FROM public.erp_user_companies uc
    JOIN public.erp_roles r ON uc.role_id = r.id
    WHERE uc.user_id = auth.uid() AND uc.is_active = true
    AND (r.name ILIKE '%admin%' OR r.name ILIKE '%hr%' OR r.name ILIKE '%rrhh%' OR r.name ILIKE '%payroll%' OR r.name ILIKE '%nomina%')
  )
)
WITH CHECK (
  company_id IN (
    SELECT uc.company_id FROM public.erp_user_companies uc
    JOIN public.erp_roles r ON uc.role_id = r.id
    WHERE uc.user_id = auth.uid() AND uc.is_active = true
    AND (r.name ILIKE '%admin%' OR r.name ILIKE '%hr%' OR r.name ILIKE '%rrhh%' OR r.name ILIKE '%payroll%' OR r.name ILIKE '%nomina%')
  )
);

-- 1.9 Trigger para updated_at
CREATE OR REPLACE FUNCTION update_hr_agreements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hr_agreements_updated_at
  BEFORE UPDATE ON public.erp_hr_collective_agreements
  FOR EACH ROW EXECUTE FUNCTION update_hr_agreements_updated_at();

CREATE TRIGGER trigger_hr_salary_concepts_updated_at
  BEFORE UPDATE ON public.erp_hr_agreement_salary_concepts
  FOR EACH ROW EXECUTE FUNCTION update_hr_agreements_updated_at();

CREATE TRIGGER trigger_hr_recalculations_updated_at
  BEFORE UPDATE ON public.erp_hr_payroll_recalculations
  FOR EACH ROW EXECUTE FUNCTION update_hr_agreements_updated_at();

-- 1.10 Enable realtime for recalculations
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_payroll_recalculations;