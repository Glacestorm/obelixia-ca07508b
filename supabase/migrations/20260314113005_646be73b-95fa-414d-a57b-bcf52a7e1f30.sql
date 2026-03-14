
-- V2-ES.7 Paso 2 Prompt 3: Vincular recálculos con payroll runs
-- Añade run_id a la tabla de recálculos para trazabilidad cruzada

ALTER TABLE public.erp_hr_payroll_recalculations
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.erp_hr_payroll_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_run_id UUID REFERENCES public.erp_hr_payroll_runs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.erp_hr_payroll_recalculations.run_id IS 'Run generado por este recálculo';
COMMENT ON COLUMN public.erp_hr_payroll_recalculations.source_run_id IS 'Run original sobre el que se recalcula';

CREATE INDEX IF NOT EXISTS idx_hr_recalc_run_id ON public.erp_hr_payroll_recalculations(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hr_recalc_source_run ON public.erp_hr_payroll_recalculations(source_run_id) WHERE source_run_id IS NOT NULL;
