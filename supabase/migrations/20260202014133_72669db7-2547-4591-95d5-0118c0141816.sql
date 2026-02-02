-- Eliminar constraints restrictivos para permitir más conectores
ALTER TABLE public.erp_migration_connectors DROP CONSTRAINT IF EXISTS erp_migration_connectors_kind_check;
ALTER TABLE public.erp_migration_connectors DROP CONSTRAINT IF EXISTS erp_migration_connectors_region_check;

-- Crear nuevos constraints más flexibles
ALTER TABLE public.erp_migration_connectors 
ADD CONSTRAINT erp_migration_connectors_kind_check 
CHECK (kind IN (
  'OAUTH2_REST', 'API_KEY_REST', 'SESSION_REST', 'FILE_IMPORT', 'DB_ODBC', 'SFTP', 'CUSTOM',
  -- Nuevos tipos para cada conector
  'sap_business_one', 'sap_s4hana', 'dynamics_365_bc', 'netsuite', 'sage_x3', 'infor_cloudsuite',
  'sage_50', 'sage_200', 'contaplus', 'a3_asesor', 'holded', 'odoo', 'quickbooks', 'xero',
  'facturaplus', 'cegid', 'alegra', 'siigo', 'aspel', 'contpaqi', 
  'zoho_books', 'freshbooks', 'wave', 'factorial'
));

ALTER TABLE public.erp_migration_connectors 
ADD CONSTRAINT erp_migration_connectors_region_check 
CHECK (region IN ('ES', 'INTL', 'GLOBAL', 'EU', 'US', 'LATAM', 'es', 'latam', 'global', 'mx', 'es,latam', 'es,fr', 'mx,latam'));