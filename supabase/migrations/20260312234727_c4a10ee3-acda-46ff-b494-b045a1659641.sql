-- V2-ES.1 Block C: D8 — CREATE hr_es_flexible_remuneration_plans

CREATE TABLE hr_es_flexible_remuneration_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  company_id UUID NOT NULL,
  plan_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  seguro_medico_mensual NUMERIC(10,2) DEFAULT 0,
  ticket_restaurante_mensual NUMERIC(10,2) DEFAULT 0,
  cheque_guarderia_mensual NUMERIC(10,2) DEFAULT 0,
  formacion_anual NUMERIC(10,2) DEFAULT 0,
  transporte_mensual NUMERIC(10,2) DEFAULT 0,
  total_mensual_exento NUMERIC(10,2) GENERATED ALWAYS AS (
    seguro_medico_mensual + ticket_restaurante_mensual 
    + cheque_guarderia_mensual + transporte_mensual 
    + (formacion_anual / 12)
  ) STORED,
  max_porcentaje_salario NUMERIC(5,2) DEFAULT 30.00,
  status TEXT NOT NULL DEFAULT 'active',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, employee_id, plan_year),
  CONSTRAINT chk_flex_plan_status CHECK (status IN ('active', 'suspended', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_flex_plans_company ON hr_es_flexible_remuneration_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_flex_plans_employee ON hr_es_flexible_remuneration_plans(employee_id);

ALTER TABLE hr_es_flexible_remuneration_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_es_flexible_remuneration_plans_company_access" ON hr_es_flexible_remuneration_plans
  FOR ALL TO authenticated
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));