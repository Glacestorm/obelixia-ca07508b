ALTER TABLE hr_es_flexible_remuneration_plans
  ADD COLUMN IF NOT EXISTS num_beneficiarios INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS num_beneficiarios_discapacidad INTEGER DEFAULT 0;