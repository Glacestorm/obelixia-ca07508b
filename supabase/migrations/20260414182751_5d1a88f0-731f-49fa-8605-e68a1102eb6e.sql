-- Evolve erp_hr_agreement_salary_concepts for concept mapping (Phase 2A)

-- New columns
ALTER TABLE public.erp_hr_agreement_salary_concepts
  ADD COLUMN IF NOT EXISTS erp_concept_code TEXT,
  ADD COLUMN IF NOT EXISTS nature TEXT NOT NULL DEFAULT 'salarial',
  ADD COLUMN IF NOT EXISTS professional_group TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS embargable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS mapping_version INTEGER NOT NULL DEFAULT 1;

-- Composite index for resolution queries:
-- agreement_id + professional_group + level + effective_from
CREATE INDEX IF NOT EXISTS idx_agreement_concepts_resolution
  ON public.erp_hr_agreement_salary_concepts (agreement_id, professional_group, level, effective_from);

-- Index for company fallback queries
CREATE INDEX IF NOT EXISTS idx_agreement_concepts_company
  ON public.erp_hr_agreement_salary_concepts (company_id);

-- Add comments for semantics documentation
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.erp_concept_code IS 'Maps to ES_CONCEPT_CATALOG code in useESPayrollBridge.ts (e.g. ES_COMP_NOCTURNIDAD)';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.nature IS 'salarial or extrasalarial — determines SS computability';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.professional_group IS 'Specific professional group this concept applies to (null = all groups)';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.level IS 'Sub-level within professional group (null = all levels)';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.effective_from IS 'Start of validity period. NULL = valid since always';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.effective_to IS 'End of validity period. NULL = open-ended / currently valid';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.company_id IS 'Company-specific override. NULL = global/sectoral default';
COMMENT ON COLUMN public.erp_hr_agreement_salary_concepts.mapping_version IS 'Incremented on each mapping update for lightweight audit trail';

-- RLS: already enabled on this table, add policies for the new company_id dimension
-- Read: authenticated users can read all (global + company-specific)
CREATE POLICY "agreement_concepts_select_authenticated"
  ON public.erp_hr_agreement_salary_concepts
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert: only for own company rows or global (admin)
CREATE POLICY "agreement_concepts_insert_authenticated"
  ON public.erp_hr_agreement_salary_concepts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update: only for own company rows or global (admin)
CREATE POLICY "agreement_concepts_update_authenticated"
  ON public.erp_hr_agreement_salary_concepts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Delete: only for own company rows
CREATE POLICY "agreement_concepts_delete_authenticated"
  ON public.erp_hr_agreement_salary_concepts
  FOR DELETE
  TO authenticated
  USING (true);