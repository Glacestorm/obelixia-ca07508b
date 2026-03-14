
-- V2-ES.7 Paso 1: Tabla de incidencias y variables de nómina
CREATE TABLE public.erp_hr_payroll_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  period_id UUID REFERENCES public.hr_payroll_periods(id) ON DELETE SET NULL,
  
  -- Concepto vinculado
  concept_code TEXT NOT NULL,
  concept_id UUID REFERENCES public.erp_hr_payroll_concepts(id) ON DELETE SET NULL,
  
  -- Clasificación
  incident_type TEXT NOT NULL DEFAULT 'variable',
  -- variable | absence | overtime | bonus | commission | allowance | adjustment | deduction | it_cc | it_at | leave | other
  
  description TEXT,
  
  -- Importes y unidades
  amount NUMERIC(12,2) DEFAULT 0,
  units NUMERIC(8,2),
  unit_price NUMERIC(10,2),
  
  -- Fechas de aplicación
  applies_from DATE,
  applies_to DATE,
  
  -- Clasificación fiscal/cotización (hereda de concepto, pero puede sobreescribirse)
  tributa_irpf BOOLEAN DEFAULT true,
  cotiza_ss BOOLEAN DEFAULT true,
  is_prorrateado BOOLEAN DEFAULT false,
  
  -- Estado del ciclo de vida
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | validated | applied | cancelled
  
  -- Origen
  source TEXT NOT NULL DEFAULT 'manual',
  -- manual | import | admin_request | workflow | calculated
  admin_request_id UUID,
  
  -- Validación
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  
  -- Aplicación a nómina
  applied_to_record_id UUID,
  applied_at TIMESTAMPTZ,
  
  -- Auditoría
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices operativos
CREATE INDEX idx_payroll_incidents_company_period ON public.erp_hr_payroll_incidents(company_id, period_id);
CREATE INDEX idx_payroll_incidents_employee ON public.erp_hr_payroll_incidents(employee_id, period_id);
CREATE INDEX idx_payroll_incidents_status ON public.erp_hr_payroll_incidents(status) WHERE status IN ('pending', 'validated');
CREATE INDEX idx_payroll_incidents_concept ON public.erp_hr_payroll_incidents(concept_code);

-- RLS
ALTER TABLE public.erp_hr_payroll_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payroll incidents for their companies"
ON public.erp_hr_payroll_incidents
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_payroll_incidents
  BEFORE UPDATE ON public.erp_hr_payroll_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
