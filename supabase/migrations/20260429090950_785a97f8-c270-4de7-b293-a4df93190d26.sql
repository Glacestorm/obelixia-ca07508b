-- =====================================================================
-- B9 — Activation traceability columns on the Collective Agreement Registry
-- =====================================================================
-- Adds three nullable columns to the master registry to record WHEN, BY WHOM
-- and FROM WHICH activation request a registry agreement became
-- ready_for_payroll=true. All columns are nullable; no defaults that mutate
-- existing rows.
--
-- HARD SAFETY (B9):
--   - Does NOT touch the operational table erp_hr_collective_agreements.
--   - Does NOT modify the existing trigger enforce_ca_registry_ready_for_payroll
--     (kept intact as the last DB defense).
--   - Does NOT add INSERT/UPDATE policies on the registry. Writes remain
--     server-side only via service-role.
--   - Does NOT touch payroll, payslip, salaryNormalizer, agreementSalaryResolver
--     or useESPayrollBridge.
-- =====================================================================

ALTER TABLE public.erp_hr_collective_agreements_registry
  ADD COLUMN IF NOT EXISTS activated_for_payroll_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS activated_by uuid NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS activation_request_id uuid NULL
    REFERENCES public.erp_hr_collective_agreement_registry_activation_requests(id);

CREATE INDEX IF NOT EXISTS idx_erp_hr_car_activation_request
  ON public.erp_hr_collective_agreements_registry(activation_request_id);
