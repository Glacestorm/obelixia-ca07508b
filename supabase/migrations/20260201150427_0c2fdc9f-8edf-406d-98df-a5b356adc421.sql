-- =====================================================
-- FASE 8: KPIs PREDICTIVOS AVANZADOS Y MÉTRICAS INTERNACIONALES
-- Sistema de analytics enterprise con benchmarks sectoriales
-- =====================================================

-- Tabla de métricas de reclutamiento (Time-to-Hire, Cost-per-Hire)
CREATE TABLE public.erp_hr_recruitment_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  position_id UUID REFERENCES public.erp_hr_job_positions(id) ON DELETE SET NULL,
  requisition_code VARCHAR(50), -- Código de requisición en lugar de FK
  
  -- Time-to-Hire metrics
  requisition_open_date DATE NOT NULL,
  first_interview_date DATE,
  offer_date DATE,
  acceptance_date DATE,
  start_date DATE,
  time_to_fill_days INTEGER,
  time_to_hire_days INTEGER,
  
  -- Cost-per-Hire metrics
  advertising_cost DECIMAL(12,2) DEFAULT 0,
  agency_fees DECIMAL(12,2) DEFAULT 0,
  referral_bonus DECIMAL(12,2) DEFAULT 0,
  travel_expenses DECIMAL(12,2) DEFAULT 0,
  assessment_costs DECIMAL(12,2) DEFAULT 0,
  internal_hours_cost DECIMAL(12,2) DEFAULT 0,
  total_cost_per_hire DECIMAL(12,2),
  
  -- Source tracking
  source_channel VARCHAR(100),
  recruiter_id UUID,
  hiring_manager_id UUID,
  
  -- Quality indicators
  candidates_screened INTEGER DEFAULT 0,
  candidates_interviewed INTEGER DEFAULT 0,
  offers_made INTEGER DEFAULT 0,
  offers_accepted INTEGER DEFAULT 0,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Quality of Hire (seguimiento 12 meses)
CREATE TABLE public.erp_hr_quality_of_hire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  recruitment_metric_id UUID REFERENCES public.erp_hr_recruitment_metrics(id) ON DELETE SET NULL,
  
  evaluation_period INTEGER NOT NULL,
  evaluation_date DATE NOT NULL,
  
  performance_rating DECIMAL(3,2),
  manager_satisfaction DECIMAL(3,2),
  cultural_fit_score DECIMAL(3,2),
  skill_match_score DECIMAL(3,2),
  goal_achievement_percentage DECIMAL(5,2),
  
  is_still_employed BOOLEAN DEFAULT true,
  turnover_date DATE,
  turnover_reason VARCHAR(100),
  
  quality_score DECIMAL(5,2),
  
  notes TEXT,
  evaluated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Flight Risk Score
CREATE TABLE public.erp_hr_flight_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  
  risk_score DECIMAL(5,2) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  confidence_level DECIMAL(5,2),
  
  tenure_factor DECIMAL(5,2),
  compensation_factor DECIMAL(5,2),
  performance_factor DECIMAL(5,2),
  engagement_factor DECIMAL(5,2),
  career_growth_factor DECIMAL(5,2),
  manager_relationship_factor DECIMAL(5,2),
  workload_factor DECIMAL(5,2),
  market_demand_factor DECIMAL(5,2),
  
  time_since_last_promotion_months INTEGER,
  salary_vs_market_percentage DECIMAL(5,2),
  recent_performance_trend VARCHAR(20),
  absence_trend VARCHAR(20),
  training_participation_trend VARCHAR(20),
  
  alert_triggered BOOLEAN DEFAULT false,
  alert_date TIMESTAMPTZ,
  recommended_actions JSONB DEFAULT '[]',
  action_taken JSONB DEFAULT '[]',
  
  actual_outcome VARCHAR(50),
  outcome_date DATE,
  prediction_accuracy BOOLEAN,
  
  calculated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de eNPS Surveys
CREATE TABLE public.erp_hr_enps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  survey_name VARCHAR(200) NOT NULL,
  survey_period_start DATE NOT NULL,
  survey_period_end DATE NOT NULL,
  survey_type VARCHAR(50) DEFAULT 'quarterly',
  is_anonymous BOOLEAN DEFAULT true,
  
  status VARCHAR(50) DEFAULT 'draft',
  
  total_invited INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2),
  
  promoters_count INTEGER DEFAULT 0,
  passives_count INTEGER DEFAULT 0,
  detractors_count INTEGER DEFAULT 0,
  
  enps_score INTEGER,
  
  previous_enps_score INTEGER,
  enps_trend VARCHAR(20),
  industry_benchmark INTEGER,
  
  top_positive_themes JSONB DEFAULT '[]',
  top_negative_themes JSONB DEFAULT '[]',
  department_breakdown JSONB DEFAULT '{}',
  
  created_by UUID,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Respuestas eNPS
CREATE TABLE public.erp_hr_enps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.erp_hr_enps_surveys(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE SET NULL,
  anonymous_token VARCHAR(100),
  
  recommendation_score INTEGER NOT NULL CHECK (recommendation_score >= 0 AND recommendation_score <= 10),
  respondent_category VARCHAR(20) NOT NULL,
  
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  engagement_score INTEGER CHECK (engagement_score >= 1 AND engagement_score <= 5),
  
  what_do_you_like TEXT,
  what_would_you_improve TEXT,
  additional_comments TEXT,
  
  department_category VARCHAR(100),
  tenure_category VARCHAR(50),
  role_level_category VARCHAR(50),
  
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Compa-Ratio
CREATE TABLE public.erp_hr_compa_ratio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  
  analysis_date DATE NOT NULL,
  analysis_period VARCHAR(50) DEFAULT 'annual',
  
  current_base_salary DECIMAL(12,2) NOT NULL,
  current_total_compensation DECIMAL(12,2),
  
  market_median_salary DECIMAL(12,2) NOT NULL,
  market_25th_percentile DECIMAL(12,2),
  market_75th_percentile DECIMAL(12,2),
  market_90th_percentile DECIMAL(12,2),
  
  compa_ratio DECIMAL(5,3) NOT NULL,
  range_penetration DECIMAL(5,2),
  
  compensation_status VARCHAR(50),
  action_recommended VARCHAR(100),
  priority_level VARCHAR(20),
  
  department_avg_compa_ratio DECIMAL(5,3),
  company_avg_compa_ratio DECIMAL(5,3),
  industry_avg_compa_ratio DECIMAL(5,3),
  
  market_data_source VARCHAR(200),
  market_data_date DATE,
  job_family VARCHAR(100),
  geographic_region VARCHAR(100),
  
  notes TEXT,
  calculated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de benchmarks sectoriales por CNAE
CREATE TABLE public.erp_hr_industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cnae_code VARCHAR(10) NOT NULL,
  cnae_description VARCHAR(300),
  country_code VARCHAR(3) DEFAULT 'ES',
  region_code VARCHAR(10),
  company_size_category VARCHAR(50),
  
  benchmark_year INTEGER NOT NULL,
  benchmark_quarter INTEGER,
  data_date DATE NOT NULL,
  
  avg_time_to_hire_days DECIMAL(6,1),
  avg_cost_per_hire DECIMAL(12,2),
  avg_quality_of_hire_score DECIMAL(5,2),
  
  avg_voluntary_turnover_rate DECIMAL(5,2),
  avg_involuntary_turnover_rate DECIMAL(5,2),
  avg_total_turnover_rate DECIMAL(5,2),
  avg_first_year_turnover_rate DECIMAL(5,2),
  
  avg_enps_score INTEGER,
  avg_engagement_score DECIMAL(5,2),
  avg_absenteeism_rate DECIMAL(5,2),
  
  avg_compa_ratio DECIMAL(5,3),
  salary_increase_rate DECIMAL(5,2),
  
  avg_training_hours_per_employee DECIMAL(6,1),
  avg_training_investment_per_employee DECIMAL(12,2),
  
  revenue_per_employee DECIMAL(14,2),
  profit_per_employee DECIMAL(14,2),
  
  data_source VARCHAR(200),
  sample_size INTEGER,
  confidence_level DECIMAL(5,2),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de histórico de KPIs
CREATE TABLE public.erp_hr_kpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  period_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  
  kpi_category VARCHAR(100) NOT NULL,
  kpi_name VARCHAR(100) NOT NULL,
  kpi_code VARCHAR(50) NOT NULL,
  
  value DECIMAL(14,4) NOT NULL,
  previous_value DECIMAL(14,4),
  change_percentage DECIMAL(8,4),
  change_direction VARCHAR(20),
  
  target_value DECIMAL(14,4),
  target_achievement_percentage DECIMAL(8,4),
  
  benchmark_value DECIMAL(14,4),
  vs_benchmark_percentage DECIMAL(8,4),
  
  department_id UUID,
  department_name VARCHAR(200),
  location VARCHAR(200),
  
  data_quality_score DECIMAL(5,2),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de alertas de KPIs
CREATE TABLE public.erp_hr_kpi_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  alert_name VARCHAR(200) NOT NULL,
  kpi_code VARCHAR(50) NOT NULL,
  kpi_category VARCHAR(100) NOT NULL,
  
  condition_type VARCHAR(50) NOT NULL,
  condition_operator VARCHAR(20),
  threshold_value DECIMAL(14,4),
  threshold_value_max DECIMAL(14,4),
  consecutive_periods INTEGER DEFAULT 1,
  
  severity VARCHAR(20) DEFAULT 'medium',
  
  is_active BOOLEAN DEFAULT true,
  is_triggered BOOLEAN DEFAULT false,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  
  notify_roles TEXT[] DEFAULT ARRAY['hr_manager'],
  notify_emails TEXT[],
  auto_create_task BOOLEAN DEFAULT false,
  
  current_value DECIMAL(14,4),
  current_status VARCHAR(50),
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_recruitment_metrics_company ON public.erp_hr_recruitment_metrics(company_id);
CREATE INDEX idx_recruitment_metrics_dates ON public.erp_hr_recruitment_metrics(requisition_open_date, start_date);
CREATE INDEX idx_quality_hire_employee ON public.erp_hr_quality_of_hire(employee_id, evaluation_period);
CREATE INDEX idx_flight_risk_employee ON public.erp_hr_flight_risk(employee_id, risk_level);
CREATE INDEX idx_flight_risk_score ON public.erp_hr_flight_risk(company_id, risk_score DESC);
CREATE INDEX idx_enps_surveys_company ON public.erp_hr_enps_surveys(company_id, status);
CREATE INDEX idx_enps_responses_survey ON public.erp_hr_enps_responses(survey_id);
CREATE INDEX idx_compa_ratio_employee ON public.erp_hr_compa_ratio(employee_id, analysis_date DESC);
CREATE INDEX idx_benchmarks_cnae ON public.erp_hr_industry_benchmarks(cnae_code, benchmark_year);
CREATE INDEX idx_kpi_history_company ON public.erp_hr_kpi_history(company_id, period_date DESC);
CREATE INDEX idx_kpi_history_kpi ON public.erp_hr_kpi_history(kpi_code, period_type);
CREATE INDEX idx_kpi_alerts_triggered ON public.erp_hr_kpi_alerts(company_id, is_triggered);

-- RLS Policies
ALTER TABLE public.erp_hr_recruitment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_quality_of_hire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_flight_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_enps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_enps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compa_ratio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_industry_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_kpi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_kpi_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recruitment_metrics_company_access" ON public.erp_hr_recruitment_metrics
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "quality_hire_company_access" ON public.erp_hr_quality_of_hire
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "flight_risk_company_access" ON public.erp_hr_flight_risk
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "enps_surveys_company_access" ON public.erp_hr_enps_surveys
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "enps_responses_company_access" ON public.erp_hr_enps_responses
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "compa_ratio_company_access" ON public.erp_hr_compa_ratio
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "benchmarks_public_read" ON public.erp_hr_industry_benchmarks
  FOR SELECT USING (true);

CREATE POLICY "kpi_history_company_access" ON public.erp_hr_kpi_history
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "kpi_alerts_company_access" ON public.erp_hr_kpi_alerts
  FOR ALL USING (user_has_erp_company_access(company_id));

-- Función para calcular Quality of Hire Score
CREATE OR REPLACE FUNCTION calculate_quality_of_hire_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.quality_score := (
    (COALESCE(NEW.performance_rating, 3) * 20) +
    (COALESCE(NEW.manager_satisfaction, 3) * 20) +
    (COALESCE(NEW.cultural_fit_score, 3) * 15) +
    (COALESCE(NEW.skill_match_score, 3) * 15) +
    (COALESCE(NEW.goal_achievement_percentage, 50) * 0.3)
  );
  NEW.quality_score := LEAST(100, GREATEST(0, NEW.quality_score));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_quality_score
  BEFORE INSERT OR UPDATE ON public.erp_hr_quality_of_hire
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quality_of_hire_score();

-- Función para categorizar respuestas eNPS
CREATE OR REPLACE FUNCTION categorize_enps_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.respondent_category := CASE
    WHEN NEW.recommendation_score >= 9 THEN 'promoter'
    WHEN NEW.recommendation_score >= 7 THEN 'passive'
    ELSE 'detractor'
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_categorize_enps
  BEFORE INSERT OR UPDATE ON public.erp_hr_enps_responses
  FOR EACH ROW
  EXECUTE FUNCTION categorize_enps_response();

-- Función para actualizar estadísticas del survey eNPS
CREATE OR REPLACE FUNCTION update_enps_survey_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promoters INTEGER;
  v_passives INTEGER;
  v_detractors INTEGER;
  v_total INTEGER;
  v_enps INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE respondent_category = 'promoter'),
    COUNT(*) FILTER (WHERE respondent_category = 'passive'),
    COUNT(*) FILTER (WHERE respondent_category = 'detractor'),
    COUNT(*)
  INTO v_promoters, v_passives, v_detractors, v_total
  FROM public.erp_hr_enps_responses
  WHERE survey_id = COALESCE(NEW.survey_id, OLD.survey_id);
  
  IF v_total > 0 THEN
    v_enps := ROUND(((v_promoters::DECIMAL - v_detractors::DECIMAL) / v_total) * 100);
  ELSE
    v_enps := NULL;
  END IF;
  
  UPDATE public.erp_hr_enps_surveys
  SET 
    total_responses = v_total,
    promoters_count = v_promoters,
    passives_count = v_passives,
    detractors_count = v_detractors,
    enps_score = v_enps,
    response_rate = CASE WHEN total_invited > 0 THEN (v_total::DECIMAL / total_invited) * 100 ELSE 0 END,
    updated_at = now()
  WHERE id = COALESCE(NEW.survey_id, OLD.survey_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_enps_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_enps_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_enps_survey_stats();

-- Función para calcular Compa-Ratio
CREATE OR REPLACE FUNCTION calculate_compa_ratio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.market_median_salary > 0 THEN
    NEW.compa_ratio := NEW.current_base_salary / NEW.market_median_salary;
  ELSE
    NEW.compa_ratio := 1.0;
  END IF;
  
  NEW.compensation_status := CASE
    WHEN NEW.compa_ratio < 0.85 THEN 'below_market'
    WHEN NEW.compa_ratio > 1.15 THEN 'above_market'
    ELSE 'at_market'
  END;
  
  NEW.priority_level := CASE
    WHEN NEW.compa_ratio < 0.80 THEN 'critical'
    WHEN NEW.compa_ratio < 0.90 THEN 'high'
    WHEN NEW.compa_ratio < 0.95 THEN 'medium'
    ELSE 'low'
  END;
  
  IF NEW.market_25th_percentile IS NOT NULL AND NEW.market_75th_percentile IS NOT NULL 
     AND NEW.market_75th_percentile > NEW.market_25th_percentile THEN
    NEW.range_penetration := 
      ((NEW.current_base_salary - NEW.market_25th_percentile) / 
       (NEW.market_75th_percentile - NEW.market_25th_percentile)) * 100;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_compa_ratio
  BEFORE INSERT OR UPDATE ON public.erp_hr_compa_ratio
  FOR EACH ROW
  EXECUTE FUNCTION calculate_compa_ratio();