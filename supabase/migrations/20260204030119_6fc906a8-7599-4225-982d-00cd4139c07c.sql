-- =====================================================
-- Sistema de Gestión de Finiquitos con Validación Multinivel
-- Fase 1: Estructura de datos y persistencia
-- =====================================================

-- Tabla principal de finiquitos/liquidaciones
CREATE TABLE IF NOT EXISTS public.erp_hr_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  
  -- Datos del empleado al momento del finiquito (snapshot)
  employee_snapshot JSONB DEFAULT '{}'::jsonb,
  
  -- Fechas clave
  hire_date DATE NOT NULL,
  termination_date DATE NOT NULL,
  last_work_day DATE,
  
  -- Tipo de extinción
  termination_type TEXT NOT NULL CHECK (termination_type IN (
    'voluntary', 'objective', 'disciplinary', 'disciplinary_improcedent', 
    'collective', 'end_contract', 'mutual_agreement', 'retirement', 'death'
  )),
  termination_reason TEXT,
  
  -- Datos salariales base
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_salary NUMERIC(10,2),
  years_worked NUMERIC(6,2),
  
  -- Cálculo del finiquito
  pending_vacation_days NUMERIC(5,2) DEFAULT 0,
  vacation_amount NUMERIC(12,2) DEFAULT 0,
  extra_pays_proportional NUMERIC(12,2) DEFAULT 0,
  salary_current_month NUMERIC(12,2) DEFAULT 0,
  other_concepts NUMERIC(12,2) DEFAULT 0,
  other_concepts_detail JSONB DEFAULT '[]'::jsonb,
  
  -- Indemnización
  indemnization_type TEXT,
  indemnization_days_per_year INTEGER,
  indemnization_total_days NUMERIC(8,2) DEFAULT 0,
  indemnization_gross NUMERIC(12,2) DEFAULT 0,
  indemnization_exempt NUMERIC(12,2) DEFAULT 0,
  indemnization_taxable NUMERIC(12,2) DEFAULT 0,
  
  -- Totales
  gross_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  irpf_retention NUMERIC(12,2) DEFAULT 0,
  irpf_percentage NUMERIC(5,2) DEFAULT 0,
  ss_retention NUMERIC(12,2) DEFAULT 0,
  net_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Convenio colectivo aplicado
  collective_agreement_id UUID,
  collective_agreement_name TEXT,
  
  -- Referencias legales
  legal_references JSONB DEFAULT '[]'::jsonb,
  
  -- Estado del proceso
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'calculated', 'pending_ai_validation', 'pending_legal_validation',
    'pending_hr_approval', 'approved', 'rejected', 'paid', 'cancelled'
  )),
  
  -- Validación IA
  ai_validation_status TEXT CHECK (ai_validation_status IN ('pending', 'approved', 'warning', 'rejected')),
  ai_validation_at TIMESTAMPTZ,
  ai_validation_result JSONB DEFAULT '{}'::jsonb,
  ai_confidence_score NUMERIC(5,2),
  ai_warnings JSONB DEFAULT '[]'::jsonb,
  ai_explanation TEXT,
  
  -- Validación Legal
  legal_validation_status TEXT CHECK (legal_validation_status IN ('pending', 'approved', 'warning', 'rejected')),
  legal_validation_at TIMESTAMPTZ,
  legal_validated_by UUID REFERENCES public.profiles(id),
  legal_validation_notes TEXT,
  legal_compliance_checks JSONB DEFAULT '[]'::jsonb,
  
  -- Aprobación RRHH
  hr_approval_status TEXT CHECK (hr_approval_status IN ('pending', 'approved', 'rejected')),
  hr_approved_at TIMESTAMPTZ,
  hr_approved_by UUID REFERENCES public.profiles(id),
  hr_approval_notes TEXT,
  
  -- Pago
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Documento generado
  document_url TEXT,
  document_generated_at TIMESTAMPTZ,
  
  -- Metadatos
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_settlements_company ON public.erp_hr_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_settlements_employee ON public.erp_hr_settlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.erp_hr_settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_termination_date ON public.erp_hr_settlements(termination_date);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON public.erp_hr_settlements(created_at DESC);

-- Historial de cambios para auditoría
CREATE TABLE IF NOT EXISTS public.erp_hr_settlement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.erp_hr_settlements(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  changes JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_settlement_history_settlement ON public.erp_hr_settlement_history(settlement_id);

-- Habilitar RLS
ALTER TABLE public.erp_hr_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_settlement_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para finiquitos
CREATE POLICY "Users can view settlements in their company"
  ON public.erp_hr_settlements FOR SELECT
  TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can create settlements in their company"
  ON public.erp_hr_settlements FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can update settlements in their company"
  ON public.erp_hr_settlements FOR UPDATE
  TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Políticas RLS para historial
CREATE POLICY "Users can view settlement history in their company"
  ON public.erp_hr_settlement_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_settlements s
      WHERE s.id = settlement_id
      AND public.user_has_erp_company_access(s.company_id)
    )
  );

CREATE POLICY "Users can insert settlement history in their company"
  ON public.erp_hr_settlement_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.erp_hr_settlements s
      WHERE s.id = settlement_id
      AND public.user_has_erp_company_access(s.company_id)
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_settlement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_settlement_timestamp ON public.erp_hr_settlements;
CREATE TRIGGER trigger_update_settlement_timestamp
  BEFORE UPDATE ON public.erp_hr_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_settlement_updated_at();

-- Trigger para registrar cambios en historial
CREATE OR REPLACE FUNCTION public.log_settlement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.erp_hr_settlement_history (
      settlement_id, action, previous_status, new_status,
      changes, performed_by
    ) VALUES (
      NEW.id, 
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'ai_validation_status', NEW.ai_validation_status,
        'legal_validation_status', NEW.legal_validation_status,
        'hr_approval_status', NEW.hr_approval_status
      ),
      COALESCE(NEW.hr_approved_by, NEW.legal_validated_by, NEW.created_by)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_settlement_change ON public.erp_hr_settlements;
CREATE TRIGGER trigger_log_settlement_change
  AFTER UPDATE ON public.erp_hr_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.log_settlement_status_change();

-- Función para calcular métricas de compliance de finiquitos
CREATE OR REPLACE FUNCTION public.get_settlement_compliance_metrics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_settlements', COUNT(*),
    'pending_validation', COUNT(*) FILTER (WHERE status IN ('pending_ai_validation', 'pending_legal_validation', 'pending_hr_approval')),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'paid', COUNT(*) FILTER (WHERE status = 'paid'),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'total_gross', COALESCE(SUM(gross_total) FILTER (WHERE status IN ('approved', 'paid')), 0),
    'total_net', COALESCE(SUM(net_total) FILTER (WHERE status IN ('approved', 'paid')), 0),
    'total_indemnization', COALESCE(SUM(indemnization_gross) FILTER (WHERE status IN ('approved', 'paid')), 0),
    'avg_processing_days', COALESCE(
      AVG(EXTRACT(DAY FROM (hr_approved_at - created_at))) FILTER (WHERE hr_approved_at IS NOT NULL), 
      0
    ),
    'by_termination_type', (
      SELECT jsonb_object_agg(termination_type, cnt)
      FROM (
        SELECT termination_type, COUNT(*) as cnt
        FROM erp_hr_settlements
        WHERE company_id = p_company_id
        GROUP BY termination_type
      ) sub
    )
  ) INTO v_result
  FROM erp_hr_settlements
  WHERE company_id = p_company_id;
  
  RETURN v_result;
END;
$$;