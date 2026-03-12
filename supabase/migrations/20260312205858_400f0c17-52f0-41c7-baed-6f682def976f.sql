
-- =============================================
-- Localización España (G2) — 4 tablas + seed data
-- =============================================

-- 1. Datos laborales españoles por empleado
CREATE TABLE public.hr_es_employee_labor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  company_id UUID NOT NULL,
  naf TEXT,
  grupo_cotizacion INT,
  cno_code TEXT,
  convenio_colectivo_id UUID,
  tipo_contrato_rd TEXT,
  comunidad_autonoma TEXT,
  provincia TEXT,
  regimen_ss TEXT DEFAULT 'general',
  categoria_profesional TEXT,
  coeficiente_parcialidad NUMERIC DEFAULT 1.0,
  fecha_alta_ss DATE,
  fecha_baja_ss DATE,
  codigo_contrato_red TEXT,
  epigrafe_at TEXT,
  situacion_familiar_irpf INT DEFAULT 1,
  hijos_menores_25 INT DEFAULT 0,
  hijos_menores_3 INT DEFAULT 0,
  discapacidad_hijos BOOLEAN DEFAULT false,
  ascendientes_cargo INT DEFAULT 0,
  reduccion_movilidad_geografica BOOLEAN DEFAULT false,
  pension_compensatoria NUMERIC DEFAULT 0,
  anualidad_alimentos NUMERIC DEFAULT 0,
  prolongacion_laboral BOOLEAN DEFAULT false,
  contrato_inferior_anual BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, company_id)
);

ALTER TABLE public.hr_es_employee_labor_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ES labor data"
  ON public.hr_es_employee_labor_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Tramos IRPF por año y CCAA
CREATE TABLE public.hr_es_irpf_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  tax_year INT NOT NULL,
  ccaa_code TEXT,
  tramo_desde NUMERIC NOT NULL DEFAULT 0,
  tramo_hasta NUMERIC,
  tipo_estatal NUMERIC NOT NULL DEFAULT 0,
  tipo_autonomico NUMERIC NOT NULL DEFAULT 0,
  tipo_total NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_es_irpf_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage IRPF tables"
  ON public.hr_es_irpf_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Bases y tipos SS por grupo y año
CREATE TABLE public.hr_es_ss_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  year INT NOT NULL,
  grupo_cotizacion INT NOT NULL,
  base_minima_mensual NUMERIC NOT NULL DEFAULT 0,
  base_maxima_mensual NUMERIC NOT NULL DEFAULT 0,
  base_minima_diaria NUMERIC,
  base_maxima_diaria NUMERIC,
  tipo_cc_empresa NUMERIC NOT NULL DEFAULT 23.60,
  tipo_cc_trabajador NUMERIC NOT NULL DEFAULT 4.70,
  tipo_desempleo_empresa_gi NUMERIC NOT NULL DEFAULT 5.50,
  tipo_desempleo_trabajador_gi NUMERIC NOT NULL DEFAULT 1.55,
  tipo_desempleo_empresa_td NUMERIC NOT NULL DEFAULT 6.70,
  tipo_desempleo_trabajador_td NUMERIC NOT NULL DEFAULT 1.60,
  tipo_fogasa NUMERIC NOT NULL DEFAULT 0.20,
  tipo_fp_empresa NUMERIC NOT NULL DEFAULT 0.60,
  tipo_fp_trabajador NUMERIC NOT NULL DEFAULT 0.10,
  tipo_mei NUMERIC NOT NULL DEFAULT 0.58,
  tipo_at_empresa NUMERIC DEFAULT 1.50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_es_ss_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage SS bases"
  ON public.hr_es_ss_bases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tipos de contrato RD
CREATE TABLE public.hr_es_contract_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'indefinido',
  subcategory TEXT,
  jornada_default TEXT DEFAULT 'completa',
  duracion_maxima_meses INT,
  periodo_prueba_max_meses NUMERIC,
  indemnizacion_dias_anyo NUMERIC DEFAULT 0,
  conversion_indefinido BOOLEAN DEFAULT false,
  normativa_referencia TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_es_contract_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ES contract types"
  ON public.hr_es_contract_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- SEED: Tramos IRPF 2026 (estatal)
-- =============================================
INSERT INTO public.hr_es_irpf_tables (tax_year, ccaa_code, tramo_desde, tramo_hasta, tipo_estatal, tipo_autonomico, tipo_total) VALUES
  (2026, NULL, 0, 12450, 9.50, 9.50, 19.00),
  (2026, NULL, 12450, 20200, 12.00, 12.00, 24.00),
  (2026, NULL, 20200, 35200, 15.00, 15.00, 30.00),
  (2026, NULL, 35200, 60000, 18.50, 18.50, 37.00),
  (2026, NULL, 60000, 300000, 22.50, 22.50, 45.00),
  (2026, NULL, 300000, NULL, 24.50, 22.50, 47.00);

-- =============================================
-- SEED: Bases SS 2026 por grupo (1-11)
-- =============================================
INSERT INTO public.hr_es_ss_bases (year, grupo_cotizacion, base_minima_mensual, base_maxima_mensual, base_minima_diaria, base_maxima_diaria) VALUES
  (2026, 1,  1847.40, 4720.50, NULL, NULL),
  (2026, 2,  1532.10, 4720.50, NULL, NULL),
  (2026, 3,  1332.90, 4720.50, NULL, NULL),
  (2026, 4,  1323.00, 4720.50, NULL, NULL),
  (2026, 5,  1323.00, 4720.50, NULL, NULL),
  (2026, 6,  1323.00, 4720.50, NULL, NULL),
  (2026, 7,  1323.00, 4720.50, NULL, NULL),
  (2026, 8,  44.10, 157.35, 44.10, 157.35),
  (2026, 9,  44.10, 157.35, 44.10, 157.35),
  (2026, 10, 44.10, 157.35, 44.10, 157.35),
  (2026, 11, 44.10, 157.35, 44.10, 157.35);

-- =============================================
-- SEED: Tipos de contrato RD vigentes
-- =============================================
INSERT INTO public.hr_es_contract_types (code, name, category, subcategory, jornada_default, duracion_maxima_meses, periodo_prueba_max_meses, indemnizacion_dias_anyo, conversion_indefinido, normativa_referencia) VALUES
  ('100', 'Indefinido ordinario', 'indefinido', 'ordinario', 'completa', NULL, 6, 33, false, 'Art. 49.1 ET'),
  ('109', 'Indefinido personas con discapacidad', 'indefinido', 'discapacidad', 'completa', NULL, 6, 33, false, 'RD 1451/1983'),
  ('130', 'Indefinido fijo-discontinuo', 'indefinido', 'fijo-discontinuo', 'completa', NULL, 6, 33, false, 'Art. 16 ET'),
  ('150', 'Indefinido apoyo emprendedores', 'indefinido', 'emprendedores', 'completa', NULL, 12, 33, false, 'Ley 3/2012'),
  ('189', 'Indefinido a tiempo parcial', 'indefinido', 'parcial', 'parcial', NULL, 6, 33, false, 'Art. 12 ET'),
  ('401', 'Obra o servicio determinado', 'temporal', 'obra', 'completa', 36, 6, 12, true, 'Art. 15.1.a ET (derogado RDL 32/2021)'),
  ('402', 'Eventual por circunstancias de producción', 'temporal', 'eventual', 'completa', 6, 2, 12, true, 'Art. 15.2 ET / RDL 32/2021'),
  ('410', 'Interinidad', 'temporal', 'interinidad', 'completa', NULL, 2, 12, false, 'Art. 15.1.c ET → Art. 15.3 RDL 32/2021'),
  ('420', 'Prácticas', 'formacion', 'practicas', 'completa', 24, 2, 12, true, 'Art. 11.1 ET / RDL 32/2021'),
  ('421', 'Formación en alternancia', 'formacion', 'alternancia', 'completa', 24, NULL, 12, true, 'Art. 11.2 ET / RDL 32/2021'),
  ('501', 'Indefinido adscrito a obra (construcción)', 'indefinido', 'construccion', 'completa', NULL, 6, 33, false, 'VI Convenio General Construcción'),
  ('502', 'Temporal por sustitución', 'temporal', 'sustitucion', 'completa', NULL, NULL, 12, false, 'Art. 15.3 ET / RDL 32/2021'),
  ('510', 'Relevo', 'temporal', 'relevo', 'parcial', NULL, 2, 12, true, 'Art. 12.6-7 ET'),
  ('520', 'Jubilación parcial', 'indefinido', 'jubilacion-parcial', 'parcial', NULL, NULL, 33, false, 'Art. 12.6 ET'),
  ('300', 'Temporal para personas con discapacidad', 'temporal', 'discapacidad', 'completa', 36, 2, 12, true, 'RD 1451/1983');
