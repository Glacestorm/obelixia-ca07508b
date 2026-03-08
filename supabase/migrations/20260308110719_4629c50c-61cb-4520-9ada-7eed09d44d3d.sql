
-- P8: Role-Based Experience Ecosystem

-- 1. Role Experience Profiles
CREATE TABLE public.erp_hr_role_experience_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  role_label TEXT NOT NULL,
  description TEXT,
  dashboard_layout JSONB DEFAULT '{}',
  visible_modules JSONB DEFAULT '[]',
  quick_actions JSONB DEFAULT '[]',
  kpi_widgets JSONB DEFAULT '[]',
  notification_preferences JSONB DEFAULT '{}',
  theme_overrides JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Role Dashboards (custom per-role views)
CREATE TABLE public.erp_hr_role_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  role_profile_id UUID REFERENCES erp_hr_role_experience_profiles(id) ON DELETE CASCADE,
  dashboard_name TEXT NOT NULL,
  dashboard_type TEXT DEFAULT 'main',
  layout_config JSONB DEFAULT '{}',
  widgets JSONB DEFAULT '[]',
  filters_config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Role Onboarding Guides
CREATE TABLE public.erp_hr_role_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  role_profile_id UUID REFERENCES erp_hr_role_experience_profiles(id) ON DELETE CASCADE,
  step_order INT DEFAULT 1,
  step_title TEXT NOT NULL,
  step_description TEXT,
  step_type TEXT DEFAULT 'info',
  target_module TEXT,
  target_action TEXT,
  is_required BOOLEAN DEFAULT false,
  estimated_minutes INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. User Experience Preferences (per-user overrides)
CREATE TABLE public.erp_hr_user_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  role_profile_id UUID REFERENCES erp_hr_role_experience_profiles(id),
  custom_layout JSONB DEFAULT '{}',
  pinned_modules JSONB DEFAULT '[]',
  recent_modules JSONB DEFAULT '[]',
  completed_onboarding JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  last_active_module TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Role Analytics (usage tracking)
CREATE TABLE public.erp_hr_role_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  module_id TEXT NOT NULL,
  action_type TEXT DEFAULT 'view',
  usage_count INT DEFAULT 1,
  avg_time_seconds NUMERIC DEFAULT 0,
  satisfaction_score NUMERIC,
  period TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE erp_hr_role_experience_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_role_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_role_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_user_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_role_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage role profiles" ON erp_hr_role_experience_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage role dashboards" ON erp_hr_role_dashboards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage role onboarding" ON erp_hr_role_onboarding FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage user experience" ON erp_hr_user_experience FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage role analytics" ON erp_hr_role_analytics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime for user experience
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_user_experience;
