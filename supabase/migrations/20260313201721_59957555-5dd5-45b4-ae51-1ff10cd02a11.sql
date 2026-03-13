
-- V2-ES.4 Paso 1 (subfase): Conciliación documental básica
-- Columnas aditivas para marcar reconciliación manual con nómina/SS/fiscal
ALTER TABLE public.erp_hr_employee_documents
  ADD COLUMN IF NOT EXISTS reconciled_with_payroll boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_with_social_security boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_with_tax boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliation_notes text,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid;

COMMENT ON COLUMN public.erp_hr_employee_documents.reconciled_with_payroll IS 'Conciliado con nómina (manual flag)';
COMMENT ON COLUMN public.erp_hr_employee_documents.reconciled_with_social_security IS 'Conciliado con Seguridad Social (manual flag)';
COMMENT ON COLUMN public.erp_hr_employee_documents.reconciled_with_tax IS 'Conciliado con IRPF/fiscal (manual flag)';

-- Partial index for quick lookup of unreconciled docs
CREATE INDEX idx_hr_docs_unreconciled
  ON public.erp_hr_employee_documents (document_type)
  WHERE reconciled_with_payroll = false
    OR reconciled_with_social_security = false
    OR reconciled_with_tax = false;
