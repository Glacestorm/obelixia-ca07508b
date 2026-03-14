
-- V2-ES.7 Paso 2 — Evolución del modelo de payroll runs
-- Añade: period_year, period_month, version, warnings_count, errors_count, 
-- recalculation_ref, locked_at, superseded_by, snapshot_hash
-- Actualiza estados a: draft, running, calculated, reviewed, approved, failed, superseded
-- Añade trigger de auditoría

-- 1. Nuevas columnas
ALTER TABLE public.erp_hr_payroll_runs
  ADD COLUMN IF NOT EXISTS period_year INTEGER,
  ADD COLUMN IF NOT EXISTS period_month INTEGER,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS warnings_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errors_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recalculation_reference UUID REFERENCES public.erp_hr_payroll_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.erp_hr_payroll_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT DEFAULT NULL;

-- 2. Drop old CHECK constraint and add new one with updated states
ALTER TABLE public.erp_hr_payroll_runs DROP CONSTRAINT IF EXISTS erp_hr_payroll_runs_status_check;
ALTER TABLE public.erp_hr_payroll_runs ADD CONSTRAINT erp_hr_payroll_runs_status_check 
  CHECK (status IN ('draft', 'running', 'calculated', 'reviewed', 'approved', 'failed', 'cancelled', 'superseded'));

-- 3. Migrate existing data to new states
UPDATE public.erp_hr_payroll_runs SET status = 'draft' WHERE status = 'pending';
UPDATE public.erp_hr_payroll_runs SET status = 'calculated' WHERE status = 'completed';
UPDATE public.erp_hr_payroll_runs SET status = 'calculated' WHERE status = 'completed_with_warnings';

-- 4. Backfill period_year and period_month from period
UPDATE public.erp_hr_payroll_runs r
SET period_year = p.fiscal_year, period_month = p.period_number
FROM public.hr_payroll_periods p
WHERE r.period_id = p.id AND r.period_year IS NULL;

-- 5. Audit trigger — inserts into erp_hr_audit_log on every run change
CREATE OR REPLACE FUNCTION audit_hr_payroll_run_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.erp_hr_audit_log (
    company_id, entity_type, entity_id, action, 
    old_value, new_value, actor_id, actor_name
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    'payroll_run',
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'status_changed'
      WHEN 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    COALESCE(NEW.started_by, auth.uid()),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_hr_payroll_runs
  AFTER INSERT OR UPDATE ON public.erp_hr_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION audit_hr_payroll_run_changes();

-- 6. Index for new columns
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_year_month ON public.erp_hr_payroll_runs(period_year, period_month);
