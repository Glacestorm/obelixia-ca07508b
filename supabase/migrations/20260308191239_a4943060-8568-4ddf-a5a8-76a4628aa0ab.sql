
-- =============================================
-- MÓDULO CONSULTORÍA ELÉCTRICA - SCHEMA
-- Multi-tenant con company_id FK a erp_companies
-- =============================================

-- 1. energy_tariff_catalog (no FK to cases, standalone reference)
CREATE TABLE public.energy_tariff_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier TEXT NOT NULL,
  tariff_name TEXT NOT NULL,
  access_tariff TEXT,
  price_p1_energy NUMERIC(10,6),
  price_p2_energy NUMERIC(10,6),
  price_p3_energy NUMERIC(10,6),
  price_p1_power NUMERIC(10,6),
  price_p2_power NUMERIC(10,6),
  has_permanence BOOLEAN DEFAULT false,
  notes TEXT,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. energy_cases (main entity)
CREATE TABLE public.energy_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  customer_id UUID,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  assigned_user_id UUID,
  current_supplier TEXT,
  current_tariff TEXT,
  cups TEXT,
  address TEXT,
  contract_end_date DATE,
  estimated_monthly_savings NUMERIC(12,2),
  estimated_annual_savings NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. energy_supplies
CREATE TABLE public.energy_supplies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  cups TEXT,
  tariff_access TEXT,
  distributor TEXT,
  contracted_power_p1 NUMERIC(10,3),
  contracted_power_p2 NUMERIC(10,3),
  max_demand_p1 NUMERIC(10,3),
  max_demand_p2 NUMERIC(10,3),
  voltage_type TEXT DEFAULT 'low',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. energy_invoices
CREATE TABLE public.energy_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  billing_start DATE,
  billing_end DATE,
  days INTEGER,
  consumption_total_kwh NUMERIC(12,2),
  consumption_p1_kwh NUMERIC(12,2),
  consumption_p2_kwh NUMERIC(12,2),
  consumption_p3_kwh NUMERIC(12,2),
  power_cost NUMERIC(12,2),
  energy_cost NUMERIC(12,2),
  meter_rental NUMERIC(12,2),
  electricity_tax NUMERIC(12,2),
  vat NUMERIC(12,2),
  other_costs NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  document_url TEXT,
  is_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. energy_contracts
CREATE TABLE public.energy_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  supplier TEXT,
  tariff_name TEXT,
  start_date DATE,
  end_date DATE,
  has_renewal BOOLEAN DEFAULT false,
  has_permanence BOOLEAN DEFAULT false,
  early_exit_penalty_text TEXT,
  signed_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. energy_consumption_profiles
CREATE TABLE public.energy_consumption_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  household_size INTEGER,
  has_heat_pump BOOLEAN DEFAULT false,
  has_acs_aerothermal BOOLEAN DEFAULT false,
  has_ac_inverter BOOLEAN DEFAULT false,
  has_ev BOOLEAN DEFAULT false,
  has_induction BOOLEAN DEFAULT false,
  has_freezer BOOLEAN DEFAULT false,
  work_from_home BOOLEAN DEFAULT false,
  shiftable_load_pct NUMERIC(5,2),
  showers_start_time TIME,
  showers_end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. energy_recommendations
CREATE TABLE public.energy_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  recommended_supplier TEXT,
  recommended_tariff TEXT,
  recommended_power_p1 NUMERIC(10,3),
  recommended_power_p2 NUMERIC(10,3),
  monthly_savings_estimate NUMERIC(12,2),
  annual_savings_estimate NUMERIC(12,2),
  implementation_notes TEXT,
  risk_level TEXT DEFAULT 'low',
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. energy_reports
CREATE TABLE public.energy_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  report_type TEXT DEFAULT 'optimization',
  version INTEGER DEFAULT 1,
  pdf_url TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. energy_tasks
CREATE TABLE public.energy_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  assigned_user_id UUID,
  task_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES (multi-tenant via company_id)
-- =============================================

ALTER TABLE public.energy_tariff_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_consumption_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_tasks ENABLE ROW LEVEL SECURITY;

-- Tariff catalog: readable by all authenticated, writable by authenticated
CREATE POLICY "energy_tariff_catalog_select" ON public.energy_tariff_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "energy_tariff_catalog_insert" ON public.energy_tariff_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "energy_tariff_catalog_update" ON public.energy_tariff_catalog FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "energy_tariff_catalog_delete" ON public.energy_tariff_catalog FOR DELETE TO authenticated USING (true);

-- energy_cases: multi-tenant via erp_user_companies
CREATE POLICY "energy_cases_select" ON public.energy_cases FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));
CREATE POLICY "energy_cases_insert" ON public.energy_cases FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));
CREATE POLICY "energy_cases_update" ON public.energy_cases FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));
CREATE POLICY "energy_cases_delete" ON public.energy_cases FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

-- Child tables: access via case_id -> energy_cases (inherits tenant isolation)
-- energy_supplies
CREATE POLICY "energy_supplies_select" ON public.energy_supplies FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_supplies_insert" ON public.energy_supplies FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_supplies_update" ON public.energy_supplies FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_supplies_delete" ON public.energy_supplies FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- energy_invoices
CREATE POLICY "energy_invoices_select" ON public.energy_invoices FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_invoices_insert" ON public.energy_invoices FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_invoices_update" ON public.energy_invoices FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_invoices_delete" ON public.energy_invoices FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- energy_contracts
CREATE POLICY "energy_contracts_select" ON public.energy_contracts FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_contracts_insert" ON public.energy_contracts FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_contracts_update" ON public.energy_contracts FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_contracts_delete" ON public.energy_contracts FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- energy_consumption_profiles
CREATE POLICY "energy_consumption_profiles_select" ON public.energy_consumption_profiles FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_consumption_profiles_insert" ON public.energy_consumption_profiles FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_consumption_profiles_update" ON public.energy_consumption_profiles FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_consumption_profiles_delete" ON public.energy_consumption_profiles FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- energy_recommendations
CREATE POLICY "energy_recommendations_select" ON public.energy_recommendations FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_recommendations_insert" ON public.energy_recommendations FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_recommendations_update" ON public.energy_recommendations FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_recommendations_delete" ON public.energy_recommendations FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- energy_reports
CREATE POLICY "energy_reports_select" ON public.energy_reports FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_reports_insert" ON public.energy_reports FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_reports_update" ON public.energy_reports FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_reports_delete" ON public.energy_reports FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- energy_tasks
CREATE POLICY "energy_tasks_select" ON public.energy_tasks FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_tasks_insert" ON public.energy_tasks FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_tasks_update" ON public.energy_tasks FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())))
  WITH CHECK (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));
CREATE POLICY "energy_tasks_delete" ON public.energy_tasks FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM public.energy_cases WHERE company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid())));

-- Indexes for performance
CREATE INDEX idx_energy_cases_company ON public.energy_cases(company_id);
CREATE INDEX idx_energy_cases_status ON public.energy_cases(status);
CREATE INDEX idx_energy_supplies_case ON public.energy_supplies(case_id);
CREATE INDEX idx_energy_invoices_case ON public.energy_invoices(case_id);
CREATE INDEX idx_energy_contracts_case ON public.energy_contracts(case_id);
CREATE INDEX idx_energy_consumption_profiles_case ON public.energy_consumption_profiles(case_id);
CREATE INDEX idx_energy_recommendations_case ON public.energy_recommendations(case_id);
CREATE INDEX idx_energy_reports_case ON public.energy_reports(case_id);
CREATE INDEX idx_energy_tasks_case ON public.energy_tasks(case_id);
CREATE INDEX idx_energy_tasks_status ON public.energy_tasks(status);
CREATE INDEX idx_energy_tariff_catalog_active ON public.energy_tariff_catalog(is_active);
