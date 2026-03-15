
-- Update BOE and DOUE sources to auto ingestion
UPDATE public.erp_regulatory_sources 
SET ingestion_method = 'auto'
WHERE code IN ('BOE', 'DOUE');
