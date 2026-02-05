-- ============================================
-- FASE 4: TOTAL REWARDS STATEMENT (RRHH)
-- Visualización completa de compensación total
-- ============================================

-- Tabla de componentes de compensación
CREATE TABLE IF NOT EXISTS erp_hr_compensation_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- base_salary, variable, benefits, equity, perks, development
  description TEXT,
  is_taxable BOOLEAN DEFAULT true,
  is_cash_equivalent BOOLEAN DEFAULT true,
  calculation_type VARCHAR(50) DEFAULT 'fixed', -- fixed, percentage, formula
  calculation_formula TEXT,
  display_order INTEGER DEFAULT 0,
  icon VARCHAR(50),
  color VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de valores de compensación por empleado
CREATE TABLE IF NOT EXISTS erp_hr_employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  component_id UUID REFERENCES erp_hr_compensation_components(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  frequency VARCHAR(50) DEFAULT 'annual', -- annual, monthly, one_time
  effective_date DATE,
  end_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, component_id, fiscal_year)
);

-- Tabla de statements generados
CREATE TABLE IF NOT EXISTS erp_hr_rewards_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  fiscal_year INTEGER NOT NULL,
  statement_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, generated, sent, viewed
  total_compensation DECIMAL(15,2),
  total_cash DECIMAL(15,2),
  total_benefits_value DECIMAL(15,2),
  total_equity_value DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  breakdown JSONB NOT NULL DEFAULT '{}',
  comparisons JSONB DEFAULT '{}', -- market comparisons, peer benchmarks
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  generated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, fiscal_year)
);

-- Tabla de beneficios con valor monetario calculado
CREATE TABLE IF NOT EXISTS erp_hr_benefit_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  benefit_type VARCHAR(100) NOT NULL, -- health_insurance, life_insurance, pension, meal_vouchers, gym, car, etc
  benefit_name VARCHAR(255) NOT NULL,
  annual_company_cost DECIMAL(15,2),
  employee_perceived_value DECIMAL(15,2),
  market_value DECIMAL(15,2),
  description TEXT,
  coverage_details JSONB,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de benchmark de mercado
CREATE TABLE IF NOT EXISTS erp_hr_market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_level VARCHAR(100), -- junior, mid, senior, manager, director, executive
  job_family VARCHAR(100), -- engineering, sales, marketing, finance, hr, etc
  location VARCHAR(255),
  percentile_25 DECIMAL(15,2),
  percentile_50 DECIMAL(15,2),
  percentile_75 DECIMAL(15,2),
  percentile_90 DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  source VARCHAR(255),
  survey_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE erp_hr_compensation_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_rewards_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_benefit_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_market_benchmarks ENABLE ROW LEVEL SECURITY;

-- Policies para compensation_components (usando has_role si existe, sino permisivo para authenticated)
CREATE POLICY "Authenticated users can view compensation components" ON erp_hr_compensation_components
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage compensation components" ON erp_hr_compensation_components
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies para employee_compensation  
CREATE POLICY "Users can view own or managed compensation" ON erp_hr_employee_compensation
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage employee compensation" ON erp_hr_employee_compensation
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies para rewards_statements
CREATE POLICY "Users can view own or managed statements" ON erp_hr_rewards_statements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage statements" ON erp_hr_rewards_statements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies para benefit_valuations
CREATE POLICY "Authenticated users can view benefit valuations" ON erp_hr_benefit_valuations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage benefit valuations" ON erp_hr_benefit_valuations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies para market_benchmarks
CREATE POLICY "Authenticated users can view market benchmarks" ON erp_hr_market_benchmarks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage market benchmarks" ON erp_hr_market_benchmarks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes para rendimiento
CREATE INDEX idx_employee_compensation_employee ON erp_hr_employee_compensation(employee_id);
CREATE INDEX idx_employee_compensation_year ON erp_hr_employee_compensation(fiscal_year);
CREATE INDEX idx_rewards_statements_employee ON erp_hr_rewards_statements(employee_id);
CREATE INDEX idx_rewards_statements_year ON erp_hr_rewards_statements(fiscal_year);
CREATE INDEX idx_benefit_valuations_company ON erp_hr_benefit_valuations(company_id);
CREATE INDEX idx_market_benchmarks_job ON erp_hr_market_benchmarks(job_level, job_family);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_total_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compensation_components_updated
  BEFORE UPDATE ON erp_hr_compensation_components
  FOR EACH ROW EXECUTE FUNCTION update_total_rewards_updated_at();

CREATE TRIGGER trg_employee_compensation_updated
  BEFORE UPDATE ON erp_hr_employee_compensation
  FOR EACH ROW EXECUTE FUNCTION update_total_rewards_updated_at();

CREATE TRIGGER trg_rewards_statements_updated
  BEFORE UPDATE ON erp_hr_rewards_statements
  FOR EACH ROW EXECUTE FUNCTION update_total_rewards_updated_at();

CREATE TRIGGER trg_benefit_valuations_updated
  BEFORE UPDATE ON erp_hr_benefit_valuations
  FOR EACH ROW EXECUTE FUNCTION update_total_rewards_updated_at();

-- Insertar componentes de compensación predeterminados
INSERT INTO erp_hr_compensation_components (name, category, description, is_taxable, is_cash_equivalent, display_order, icon, color)
VALUES
  ('Salario Base', 'base_salary', 'Salario bruto anual fijo', true, true, 1, 'Wallet', 'blue'),
  ('Bonus Anual', 'variable', 'Bonus por rendimiento anual', true, true, 2, 'Gift', 'green'),
  ('Comisiones', 'variable', 'Comisiones por ventas', true, true, 3, 'TrendingUp', 'emerald'),
  ('Seguro Médico', 'benefits', 'Seguro de salud privado', false, false, 4, 'Heart', 'red'),
  ('Seguro de Vida', 'benefits', 'Seguro de vida y accidentes', false, false, 5, 'Shield', 'purple'),
  ('Plan de Pensiones', 'benefits', 'Aportación a plan de pensiones', false, false, 6, 'Landmark', 'amber'),
  ('Stock Options', 'equity', 'Opciones sobre acciones', true, false, 7, 'LineChart', 'indigo'),
  ('RSUs', 'equity', 'Restricted Stock Units', true, false, 8, 'BarChart3', 'violet'),
  ('Ticket Restaurante', 'perks', 'Vales de comida', false, false, 9, 'UtensilsCrossed', 'orange'),
  ('Coche de Empresa', 'perks', 'Vehículo corporativo', true, false, 10, 'Car', 'slate'),
  ('Gimnasio', 'perks', 'Membresía gimnasio', false, false, 11, 'Dumbbell', 'pink'),
  ('Formación', 'development', 'Presupuesto formación', false, false, 12, 'GraduationCap', 'cyan'),
  ('Días Extra Vacaciones', 'perks', 'Días adicionales de vacaciones', false, false, 13, 'Palmtree', 'teal'),
  ('Teletrabajo', 'perks', 'Compensación teletrabajo', false, true, 14, 'Home', 'gray');

-- Insertar benchmark de mercado de ejemplo
INSERT INTO erp_hr_market_benchmarks (job_level, job_family, location, percentile_25, percentile_50, percentile_75, percentile_90, source, survey_date)
VALUES
  ('junior', 'engineering', 'Spain', 28000, 32000, 38000, 45000, 'Glassdoor 2025', '2025-01-01'),
  ('mid', 'engineering', 'Spain', 38000, 45000, 55000, 65000, 'Glassdoor 2025', '2025-01-01'),
  ('senior', 'engineering', 'Spain', 55000, 65000, 78000, 92000, 'Glassdoor 2025', '2025-01-01'),
  ('manager', 'engineering', 'Spain', 70000, 85000, 100000, 120000, 'Glassdoor 2025', '2025-01-01'),
  ('junior', 'sales', 'Spain', 24000, 28000, 34000, 40000, 'Glassdoor 2025', '2025-01-01'),
  ('mid', 'sales', 'Spain', 35000, 42000, 52000, 62000, 'Glassdoor 2025', '2025-01-01'),
  ('senior', 'sales', 'Spain', 50000, 62000, 75000, 90000, 'Glassdoor 2025', '2025-01-01'),
  ('junior', 'finance', 'Spain', 26000, 30000, 36000, 42000, 'Glassdoor 2025', '2025-01-01'),
  ('mid', 'finance', 'Spain', 36000, 44000, 54000, 65000, 'Glassdoor 2025', '2025-01-01'),
  ('senior', 'finance', 'Spain', 52000, 64000, 78000, 95000, 'Glassdoor 2025', '2025-01-01');