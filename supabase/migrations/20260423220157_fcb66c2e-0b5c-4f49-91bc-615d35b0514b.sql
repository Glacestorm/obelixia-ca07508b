-- ===========================================================================
-- S9.21p — Source of truth contractual + auditoría de incoherencia consciente
-- ===========================================================================
-- Añade 6 columnas no destructivas a erp_hr_contracts:
--   * 3 funcionales: salary_amount_unit, salary_periods_per_year, extra_payments_prorated
--   * 3 de auditoría: manual_incoherence_confirmation_at/_by/_type
--
-- INVARIANTES (documentadas para futuras revisiones):
--   1. Los 3 campos funcionales son INMUTABLES ante procesos automáticos
--      cuando el contrato está en estado 'incoherent' (helper
--      diagnoseContractParametrization). Solo edición explícita del usuario
--      en el formulario los modifica.
--   2. El backfill de esta migración se ejecuta UNA SOLA VEZ. No hay jobs,
--      triggers ni edge functions que lo reejecuten.
--   3. Los 3 campos de auditoría SÓLO se escriben desde el flujo de
--      confirmación del formulario (HRContractFormDialog) tras log central
--      OK. Su limpieza al resolver una incoherencia exige también log central
--      OK previo (la huella histórica completa queda en audit_logs).
--   4. El índice parcial es OPTIMIZACIÓN de pre-filtrado, NO fuente de verdad
--      del estado funcional. La fuente de verdad es el helper en runtime.
-- ===========================================================================

-- ── 1. Columnas de parametrización salarial (funcionales) ──
ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS salary_amount_unit TEXT
    CHECK (salary_amount_unit IS NULL OR salary_amount_unit IN ('monthly','annual'));

ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS salary_periods_per_year INTEGER
    CHECK (salary_periods_per_year IS NULL OR (salary_periods_per_year BETWEEN 12 AND 16));

ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS extra_payments_prorated BOOLEAN;

COMMENT ON COLUMN public.erp_hr_contracts.salary_amount_unit IS
  'S9.21p: Unidad del importe salarial declarado en contrato (monthly|annual). INMUTABLE ante procesos automáticos cuando el contrato está incoherent — sólo edición explícita en formulario lo modifica.';

COMMENT ON COLUMN public.erp_hr_contracts.salary_periods_per_year IS
  'S9.21p: Número de pagas anuales pactadas (12-16). INMUTABLE ante procesos automáticos cuando el contrato está incoherent.';

COMMENT ON COLUMN public.erp_hr_contracts.extra_payments_prorated IS
  'S9.21p: TRUE si las pagas extra están prorrateadas en la mensualidad. INMUTABLE ante procesos automáticos cuando el contrato está incoherent.';

-- ── 2. Columnas de auditoría de confirmación consciente de incoherencia ──
ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS manual_incoherence_confirmation_at TIMESTAMPTZ;

ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS manual_incoherence_confirmed_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS manual_incoherence_confirmation_type TEXT
    CHECK (manual_incoherence_confirmation_type IS NULL OR manual_incoherence_confirmation_type IN ('structural','soft'));

COMMENT ON COLUMN public.erp_hr_contracts.manual_incoherence_confirmation_at IS
  'S9.21p: Fecha en la que un usuario confirmó conscientemente guardar el contrato con datos salariales incoherentes. Sólo lo escribe HRContractFormDialog tras log central OK. Su limpieza al resolver requiere también log central OK previo.';

COMMENT ON COLUMN public.erp_hr_contracts.manual_incoherence_confirmed_by IS
  'S9.21p: Usuario que confirmó la incoherencia. Para resolución mostrar nombre/email vía useProfileLookup con fallback estable.';

COMMENT ON COLUMN public.erp_hr_contracts.manual_incoherence_confirmation_type IS
  'S9.21p: Tipo de incoherencia confirmada (structural=safeMode obligatorio, soft=legacy con warning).';

-- ── 3. Índice parcial — OPTIMIZACIÓN, NO fuente de verdad funcional ──
-- Sólo cubre el subconjunto evidente (NULL en campos requeridos).
-- Los casos 'incoherent' (datos presentes pero contradictorios) requieren
-- el helper en runtime, NO son capturables por índice.
CREATE INDEX IF NOT EXISTS idx_hr_contracts_param_pending
  ON public.erp_hr_contracts(company_id)
  WHERE salary_amount_unit IS NULL
     OR (salary_amount_unit = 'annual' AND salary_periods_per_year IS NULL);

COMMENT ON INDEX public.idx_hr_contracts_param_pending IS
  'S9.21p: Optimización de pre-filtrado para contratos con parametrización claramente incompleta. NO es fuente de verdad del estado: usar helper diagnoseContractParametrization en runtime.';

-- ===========================================================================
-- BACKFILL ESTRICTO — ÚNICA EJECUCIÓN
-- ===========================================================================
-- Margen de coherencia: 2 % entre base_salary*N y annual_salary, N ∈ {12,14,15,16}
--   N=12  → unit='monthly', periods=12, prorated=true
--   N=14+ → unit='monthly', periods=N,  prorated=false
-- En cualquier otro caso → los 3 campos quedan NULL.
-- NO se infiere nada en contratos con sólo base_salary o sólo annual_salary.
-- NO se rellenan jamás los campos manual_incoherence_* en backfill.
-- ===========================================================================

WITH candidates AS (
  SELECT
    id,
    base_salary::numeric AS base,
    annual_salary::numeric AS annual,
    -- Para cada N candidato, comprobamos coherencia ≤ 2 %
    CASE
      WHEN base_salary > 0 AND annual_salary > 0
           AND ABS(base_salary * 12 - annual_salary) / annual_salary <= 0.02 THEN 12
      WHEN base_salary > 0 AND annual_salary > 0
           AND ABS(base_salary * 14 - annual_salary) / annual_salary <= 0.02 THEN 14
      WHEN base_salary > 0 AND annual_salary > 0
           AND ABS(base_salary * 15 - annual_salary) / annual_salary <= 0.02 THEN 15
      WHEN base_salary > 0 AND annual_salary > 0
           AND ABS(base_salary * 16 - annual_salary) / annual_salary <= 0.02 THEN 16
      ELSE NULL
    END AS resolved_periods
  FROM public.erp_hr_contracts
  WHERE salary_amount_unit IS NULL                  -- sólo contratos sin parametrizar
    AND salary_periods_per_year IS NULL
    AND extra_payments_prorated IS NULL
)
UPDATE public.erp_hr_contracts c
SET
  salary_amount_unit       = 'monthly',
  salary_periods_per_year  = candidates.resolved_periods,
  extra_payments_prorated  = (candidates.resolved_periods = 12)
FROM candidates
WHERE c.id = candidates.id
  AND candidates.resolved_periods IS NOT NULL;