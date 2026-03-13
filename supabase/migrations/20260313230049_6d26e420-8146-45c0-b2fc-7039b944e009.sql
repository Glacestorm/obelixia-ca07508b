
-- ============================================================
-- V2-ES.4 Paso 5.2b: Columnas aditivas en erp_hr_doc_generation_rules
-- generation_mode, company_id, description_template
-- ============================================================

-- 1. generation_mode: auto | assisted | placeholder
ALTER TABLE public.erp_hr_doc_generation_rules
  ADD COLUMN generation_mode text NOT NULL DEFAULT 'auto';

-- 2. company_id: NULL = regla de sistema, UUID = override por empresa
ALTER TABLE public.erp_hr_doc_generation_rules
  ADD COLUMN company_id uuid DEFAULT NULL
  REFERENCES public.erp_companies(id) ON DELETE CASCADE;

-- 3. description_template: descripción opcional para el documento generado
ALTER TABLE public.erp_hr_doc_generation_rules
  ADD COLUMN description_template text DEFAULT NULL;

-- 4. Índice para lookup multi-tenant (system + company)
CREATE INDEX idx_hr_doc_gen_rules_company
  ON public.erp_hr_doc_generation_rules (company_id)
  WHERE is_active = true;

-- 5. Update seed: set generation_mode explicitly (already defaulted to 'auto')
UPDATE public.erp_hr_doc_generation_rules SET generation_mode = 'auto' WHERE generation_mode = 'auto';
