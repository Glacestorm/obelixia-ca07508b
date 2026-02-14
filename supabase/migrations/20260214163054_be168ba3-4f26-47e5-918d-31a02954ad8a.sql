
-- =============================================
-- ACADEMIA PLATFORM UPGRADE - COMPLETE MIGRATION
-- =============================================

-- === Phase 1: Add columns to academia_courses ===
ALTER TABLE public.academia_courses
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS target_avatar jsonb,
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS validation_checklist jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS beta_price numeric,
  ADD COLUMN IF NOT EXISTS launch_date timestamptz;

-- === Phase 3: Add columns to academia_lessons ===
ALTER TABLE public.academia_lessons
  ADD COLUMN IF NOT EXISTS production_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS script_template jsonb,
  ADD COLUMN IF NOT EXISTS recording_batch text;

-- === Phase 2: academia_course_resources ===
CREATE TABLE public.academia_course_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.academia_modules(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'template',
  title text NOT NULL,
  description text,
  file_url text,
  download_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_course_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view resources" ON public.academia_course_resources FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage resources" ON public.academia_course_resources FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 2: academia_capstone_projects ===
CREATE TABLE public.academia_capstone_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.academia_enrollments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  deliverable_url text,
  rubric_score jsonb,
  feedback text,
  status text DEFAULT 'pending',
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_capstone_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own capstones" ON public.academia_capstone_projects FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage own capstones" ON public.academia_capstone_projects FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 3: academia_legal_config ===
CREATE TABLE public.academia_legal_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  disclaimer_text text,
  has_financial_disclaimer boolean DEFAULT true,
  crypto_advertising boolean DEFAULT false,
  influencer_warning boolean DEFAULT false,
  vat_exempt boolean DEFAULT false,
  vat_config jsonb DEFAULT '{}',
  country_rules jsonb DEFAULT '{}',
  oss_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id)
);
ALTER TABLE public.academia_legal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view legal config" ON public.academia_legal_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage legal config" ON public.academia_legal_config FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 4: academia_pricing_tiers ===
CREATE TABLE public.academia_pricing_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  tier_type text NOT NULL DEFAULT 'core',
  price numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  description text,
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  max_students integer,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active tiers" ON public.academia_pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage tiers" ON public.academia_pricing_tiers FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 4: academia_cohorts ===
CREATE TABLE public.academia_cohorts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  max_participants integer DEFAULT 30,
  current_participants integer DEFAULT 0,
  status text DEFAULT 'upcoming',
  schedule jsonb DEFAULT '[]',
  deliverables jsonb DEFAULT '[]',
  description text,
  price numeric,
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view cohorts" ON public.academia_cohorts FOR SELECT USING (true);
CREATE POLICY "Admins can manage cohorts" ON public.academia_cohorts FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 4: academia_subscriptions ===
CREATE TABLE public.academia_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.academia_pricing_tiers(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.academia_courses(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subs" ON public.academia_subscriptions FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage subs" ON public.academia_subscriptions FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 5: academia_sales_funnels ===
CREATE TABLE public.academia_sales_funnels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  stages jsonb DEFAULT '[{"name":"Contenido","order":1},{"name":"Captación","order":2},{"name":"Email","order":3},{"name":"Evento","order":4},{"name":"Oferta","order":5}]',
  conversion_rates jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  total_leads integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_sales_funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view funnels" ON public.academia_sales_funnels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage funnels" ON public.academia_sales_funnels FOR ALL USING (auth.uid() IS NOT NULL);

-- === Phase 5: academia_leads ===
CREATE TABLE public.academia_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid REFERENCES public.academia_sales_funnels(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.academia_courses(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  source text,
  stage text DEFAULT 'captured',
  lead_magnet_downloaded boolean DEFAULT false,
  webinar_attended boolean DEFAULT false,
  converted boolean DEFAULT false,
  converted_at timestamptz,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academia_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view leads" ON public.academia_leads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage leads" ON public.academia_leads FOR ALL USING (auth.uid() IS NOT NULL);

-- === Enable realtime for key tables ===
ALTER PUBLICATION supabase_realtime ADD TABLE public.academia_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academia_cohorts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academia_subscriptions;
