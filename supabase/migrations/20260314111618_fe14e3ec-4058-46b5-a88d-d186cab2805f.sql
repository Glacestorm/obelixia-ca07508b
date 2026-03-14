
-- V2-ES.7 Paso 2: Payroll Runs — Unidad auditable de ejecución de nómina
-- Cada run captura un intento de cálculo con contexto, snapshot y resultado

CREATE TABLE IF NOT EXISTS public.erp_hr_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.hr_payroll_periods(id) ON DELETE CASCADE,
  
  -- Versionado
  run_number INTEGER NOT NULL DEFAULT 1,
  run_type TEXT NOT NULL DEFAULT 'initial' CHECK (run_type IN ('initial', 'recalculation', 'correction', 'simulation')),
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'completed_with_warnings', 'failed', 'cancelled', 'superseded')),
  
  -- Contexto de ejecución (snapshot inmutable)
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Resultados
  total_employees INTEGER DEFAULT 0,
  employees_calculated INTEGER DEFAULT 0,
  employees_skipped INTEGER DEFAULT 0,
  employees_errored INTEGER DEFAULT 0,
  total_gross NUMERIC(15,2) DEFAULT 0,
  total_net NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  total_employer_cost NUMERIC(15,2) DEFAULT 0,
  
  -- Warnings y errores
  warnings JSONB DEFAULT '[]'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  validation_summary JSONB DEFAULT '{}'::jsonb,
  
  -- Comparación con run anterior
  previous_run_id UUID REFERENCES public.erp_hr_payroll_runs(id) ON DELETE SET NULL,
  diff_summary JSONB DEFAULT NULL,
  
  -- Trazabilidad
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  started_by UUID DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_company ON public.erp_hr_payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_period ON public.erp_hr_payroll_runs(period_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_status ON public.erp_hr_payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_period_number ON public.erp_hr_payroll_runs(period_id, run_number DESC);

-- RLS
ALTER TABLE public.erp_hr_payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_payroll_runs_access"
  ON public.erp_hr_payroll_runs
  FOR ALL
  TO authenticated
  USING (user_has_erp_company_access(company_id));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_hr_payroll_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hr_payroll_runs_updated_at
  BEFORE UPDATE ON public.erp_hr_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_hr_payroll_runs_updated_at();

-- Vincular records a runs (columna opcional en hr_payroll_records)
ALTER TABLE public.hr_payroll_records
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.erp_hr_payroll_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_payroll_records_run ON public.hr_payroll_records(run_id) WHERE run_id IS NOT NULL;
