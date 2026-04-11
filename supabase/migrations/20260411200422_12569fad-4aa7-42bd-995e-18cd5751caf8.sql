
ALTER TABLE erp_hr_employees 
  ADD COLUMN IF NOT EXISTS disability_percentage integer DEFAULT NULL;

COMMENT ON COLUMN erp_hr_employees.disability_percentage 
  IS 'Grado de discapacidad reconocida (0-100). Fuente: certificado oficial.';

CREATE INDEX IF NOT EXISTS idx_employees_disability ON erp_hr_employees(disability_percentage) WHERE disability_percentage IS NOT NULL;
