
-- C1: Add contract_template_id to erp_hr_contracts for country-agnostic template linking
ALTER TABLE public.erp_hr_contracts 
ADD COLUMN IF NOT EXISTS contract_template_id UUID REFERENCES public.hr_document_templates(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_erp_hr_contracts_template ON public.erp_hr_contracts(contract_template_id) WHERE contract_template_id IS NOT NULL;

-- Add country_code to erp_hr_contracts for multi-jurisdiction support
ALTER TABLE public.erp_hr_contracts
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'ES';
