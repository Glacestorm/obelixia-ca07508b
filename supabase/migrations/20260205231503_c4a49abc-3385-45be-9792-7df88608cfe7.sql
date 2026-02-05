-- =============================================
-- FASE 5: ESG REPORTING SUITE (CSRD/ESRS)
-- Complete sustainability reporting infrastructure
-- =============================================

-- ESG Frameworks supported
CREATE TYPE public.esg_framework AS ENUM ('CSRD', 'GRI', 'TCFD', 'SASB', 'CDP', 'SFDR', 'EU_TAXONOMY');

-- ESG Data Points (ESRS compliant)
CREATE TABLE public.erp_esg_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(10) NOT NULL,
  
  -- ESRS Category
  esrs_standard VARCHAR(20) NOT NULL, -- E1, E2, E3, E4, E5, S1, S2, S3, S4, G1, G2
  disclosure_requirement VARCHAR(50), -- E1-1, E1-2, etc.
  data_point_id VARCHAR(100) NOT NULL, -- Unique identifier
  data_point_name TEXT NOT NULL,
  
  -- Values
  value_numeric DECIMAL(18,4),
  value_text TEXT,
  value_json JSONB,
  unit VARCHAR(50),
  
  -- Metadata
  reporting_period_start DATE,
  reporting_period_end DATE,
  data_quality_score INTEGER CHECK (data_quality_score BETWEEN 1 AND 5),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'internal_review', 'external_audit', 'verified')),
  auditor_notes TEXT,
  
  -- Tracking
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year, data_point_id)
);

-- Carbon Emissions Tracking (GHG Protocol)
CREATE TABLE public.erp_esg_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(10) NOT NULL,
  reporting_month INTEGER CHECK (reporting_month BETWEEN 1 AND 12),
  
  -- Scope 1: Direct emissions
  scope1_stationary_combustion DECIMAL(12,2) DEFAULT 0, -- tCO2e
  scope1_mobile_combustion DECIMAL(12,2) DEFAULT 0,
  scope1_process_emissions DECIMAL(12,2) DEFAULT 0,
  scope1_fugitive_emissions DECIMAL(12,2) DEFAULT 0,
  scope1_total DECIMAL(12,2) GENERATED ALWAYS AS (
    scope1_stationary_combustion + scope1_mobile_combustion + 
    scope1_process_emissions + scope1_fugitive_emissions
  ) STORED,
  
  -- Scope 2: Indirect emissions (electricity)
  scope2_location_based DECIMAL(12,2) DEFAULT 0,
  scope2_market_based DECIMAL(12,2) DEFAULT 0,
  
  -- Scope 3: Value chain
  scope3_purchased_goods DECIMAL(12,2) DEFAULT 0,
  scope3_capital_goods DECIMAL(12,2) DEFAULT 0,
  scope3_fuel_energy DECIMAL(12,2) DEFAULT 0,
  scope3_upstream_transport DECIMAL(12,2) DEFAULT 0,
  scope3_waste DECIMAL(12,2) DEFAULT 0,
  scope3_business_travel DECIMAL(12,2) DEFAULT 0,
  scope3_employee_commuting DECIMAL(12,2) DEFAULT 0,
  scope3_upstream_leased DECIMAL(12,2) DEFAULT 0,
  scope3_downstream_transport DECIMAL(12,2) DEFAULT 0,
  scope3_processing DECIMAL(12,2) DEFAULT 0,
  scope3_use_of_products DECIMAL(12,2) DEFAULT 0,
  scope3_end_of_life DECIMAL(12,2) DEFAULT 0,
  scope3_downstream_leased DECIMAL(12,2) DEFAULT 0,
  scope3_franchises DECIMAL(12,2) DEFAULT 0,
  scope3_investments DECIMAL(12,2) DEFAULT 0,
  scope3_total DECIMAL(12,2) GENERATED ALWAYS AS (
    scope3_purchased_goods + scope3_capital_goods + scope3_fuel_energy +
    scope3_upstream_transport + scope3_waste + scope3_business_travel +
    scope3_employee_commuting + scope3_upstream_leased + scope3_downstream_transport +
    scope3_processing + scope3_use_of_products + scope3_end_of_life +
    scope3_downstream_leased + scope3_franchises + scope3_investments
  ) STORED,
  
  -- Totals
  total_emissions DECIMAL(12,2) GENERATED ALWAYS AS (
    scope1_stationary_combustion + scope1_mobile_combustion + 
    scope1_process_emissions + scope1_fugitive_emissions +
    COALESCE(scope2_market_based, scope2_location_based) +
    scope3_purchased_goods + scope3_capital_goods + scope3_fuel_energy +
    scope3_upstream_transport + scope3_waste + scope3_business_travel +
    scope3_employee_commuting + scope3_upstream_leased + scope3_downstream_transport +
    scope3_processing + scope3_use_of_products + scope3_end_of_life +
    scope3_downstream_leased + scope3_franchises + scope3_investments
  ) STORED,
  
  -- Intensity metrics
  revenue_million DECIMAL(15,2),
  employees_count INTEGER,
  emissions_per_million_revenue DECIMAL(10,4),
  emissions_per_employee DECIMAL(10,4),
  
  -- Methodology
  calculation_methodology VARCHAR(50) DEFAULT 'GHG Protocol',
  emission_factors_source VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year, reporting_month)
);

-- Carbon Reduction Targets (SBTi aligned)
CREATE TABLE public.erp_esg_reduction_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  target_name VARCHAR(200) NOT NULL,
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('absolute', 'intensity', 'net_zero', 'carbon_neutral')),
  scope_covered VARCHAR(50) NOT NULL, -- 'scope1', 'scope1_2', 'scope1_2_3'
  
  -- Baseline
  baseline_year INTEGER NOT NULL,
  baseline_emissions DECIMAL(12,2) NOT NULL,
  
  -- Target
  target_year INTEGER NOT NULL,
  target_emissions DECIMAL(12,2),
  reduction_percentage DECIMAL(5,2),
  
  -- Progress
  current_emissions DECIMAL(12,2),
  current_year INTEGER,
  progress_percentage DECIMAL(5,2),
  on_track BOOLEAN DEFAULT true,
  
  -- SBTi alignment
  sbti_validated BOOLEAN DEFAULT false,
  sbti_target_type VARCHAR(30), -- '1.5C', 'well_below_2C', '2C'
  sbti_validation_date DATE,
  
  -- Pathway
  reduction_pathway JSONB, -- Year-by-year expected reductions
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ESG Reports (CSRD/ESRS compliant)
CREATE TABLE public.erp_esg_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(10) NOT NULL,
  
  report_type public.esg_framework NOT NULL,
  report_title VARCHAR(300) NOT NULL,
  
  -- Content
  executive_summary TEXT,
  governance_section JSONB,
  strategy_section JSONB,
  risk_management_section JSONB,
  metrics_targets_section JSONB,
  
  -- ESRS-specific sections
  esrs_general_disclosures JSONB, -- ESRS 2
  esrs_environmental JSONB, -- E1-E5
  esrs_social JSONB, -- S1-S4
  esrs_governance JSONB, -- G1-G2
  
  -- Materiality
  materiality_assessment JSONB,
  double_materiality_matrix JSONB,
  
  -- Compliance
  compliance_score DECIMAL(5,2),
  disclosure_completeness DECIMAL(5,2),
  data_quality_score DECIMAL(5,2),
  
  -- Status
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'internal_review', 'external_audit', 'approved', 'published')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Files
  pdf_url TEXT,
  xbrl_url TEXT, -- EU Taxonomy XBRL format
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year, report_type)
);

-- EU Taxonomy Alignment
CREATE TABLE public.erp_esg_taxonomy_alignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(10) NOT NULL,
  
  -- Activity identification
  economic_activity VARCHAR(200) NOT NULL,
  nace_code VARCHAR(20),
  environmental_objective VARCHAR(50) NOT NULL, -- climate_mitigation, climate_adaptation, water, circular_economy, pollution, biodiversity
  
  -- Financials
  turnover_amount DECIMAL(15,2),
  turnover_percentage DECIMAL(5,2),
  capex_amount DECIMAL(15,2),
  capex_percentage DECIMAL(5,2),
  opex_amount DECIMAL(15,2),
  opex_percentage DECIMAL(5,2),
  
  -- Alignment assessment
  substantial_contribution BOOLEAN DEFAULT false,
  dnsh_assessment JSONB, -- Do No Significant Harm
  minimum_safeguards BOOLEAN DEFAULT false,
  
  is_eligible BOOLEAN DEFAULT true,
  is_aligned BOOLEAN DEFAULT false,
  alignment_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social Metrics (ESRS S1-S4)
CREATE TABLE public.erp_esg_social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(10) NOT NULL,
  
  -- S1: Own Workforce
  total_employees INTEGER,
  permanent_employees INTEGER,
  temporary_employees INTEGER,
  full_time_employees INTEGER,
  part_time_employees INTEGER,
  gender_diversity_percentage DECIMAL(5,2), -- % women
  gender_pay_gap_percentage DECIMAL(5,2),
  training_hours_per_employee DECIMAL(6,2),
  employee_turnover_rate DECIMAL(5,2),
  health_safety_incidents INTEGER,
  fatalities INTEGER,
  lost_time_injury_rate DECIMAL(6,4),
  collective_bargaining_coverage DECIMAL(5,2),
  
  -- S2: Workers in Value Chain
  suppliers_with_social_audits INTEGER,
  suppliers_with_living_wage DECIMAL(5,2),
  child_labor_risk_suppliers INTEGER,
  forced_labor_risk_suppliers INTEGER,
  
  -- S3: Affected Communities
  community_investments DECIMAL(15,2),
  community_engagement_initiatives INTEGER,
  grievance_mechanisms_available BOOLEAN DEFAULT true,
  grievances_received INTEGER,
  grievances_resolved INTEGER,
  
  -- S4: Consumers and End-users
  product_safety_incidents INTEGER,
  data_privacy_breaches INTEGER,
  customer_satisfaction_score DECIMAL(3,1),
  accessibility_compliance BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year)
);

-- Governance Metrics (ESRS G1-G2)
CREATE TABLE public.erp_esg_governance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(10) NOT NULL,
  
  -- Board composition
  board_size INTEGER,
  independent_directors INTEGER,
  women_on_board INTEGER,
  board_diversity_percentage DECIMAL(5,2),
  average_board_tenure DECIMAL(4,1),
  board_meetings_per_year INTEGER,
  
  -- Sustainability governance
  sustainability_committee BOOLEAN DEFAULT false,
  esg_linked_executive_compensation BOOLEAN DEFAULT false,
  esg_compensation_percentage DECIMAL(5,2),
  
  -- Ethics & Compliance
  ethics_training_completion DECIMAL(5,2),
  whistleblower_reports INTEGER,
  confirmed_corruption_cases INTEGER,
  regulatory_fines_amount DECIMAL(15,2),
  regulatory_fines_count INTEGER,
  anti_corruption_policy BOOLEAN DEFAULT true,
  human_rights_policy BOOLEAN DEFAULT true,
  
  -- Lobbying & Political engagement
  lobbying_expenditure DECIMAL(15,2),
  political_contributions DECIMAL(15,2),
  
  -- Tax transparency
  effective_tax_rate DECIMAL(5,2),
  tax_transparency_report BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year)
);

-- Indexes for performance
CREATE INDEX idx_esg_data_points_company ON public.erp_esg_data_points(company_id, fiscal_year);
CREATE INDEX idx_esg_data_points_esrs ON public.erp_esg_data_points(esrs_standard, disclosure_requirement);
CREATE INDEX idx_esg_emissions_company ON public.erp_esg_emissions(company_id, fiscal_year);
CREATE INDEX idx_esg_reports_company ON public.erp_esg_reports(company_id, fiscal_year);
CREATE INDEX idx_esg_taxonomy_company ON public.erp_esg_taxonomy_alignment(company_id, fiscal_year);

-- Enable RLS
ALTER TABLE public.erp_esg_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_esg_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_esg_reduction_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_esg_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_esg_taxonomy_alignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_esg_social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_esg_governance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users)
CREATE POLICY "ESG data points access" ON public.erp_esg_data_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ESG emissions access" ON public.erp_esg_emissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ESG targets access" ON public.erp_esg_reduction_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ESG reports access" ON public.erp_esg_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ESG taxonomy access" ON public.erp_esg_taxonomy_alignment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ESG social metrics access" ON public.erp_esg_social_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ESG governance metrics access" ON public.erp_esg_governance_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_esg_data_points_timestamp BEFORE UPDATE ON public.erp_esg_data_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esg_emissions_timestamp BEFORE UPDATE ON public.erp_esg_emissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esg_targets_timestamp BEFORE UPDATE ON public.erp_esg_reduction_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esg_reports_timestamp BEFORE UPDATE ON public.erp_esg_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esg_taxonomy_timestamp BEFORE UPDATE ON public.erp_esg_taxonomy_alignment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esg_social_timestamp BEFORE UPDATE ON public.erp_esg_social_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esg_governance_timestamp BEFORE UPDATE ON public.erp_esg_governance_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();