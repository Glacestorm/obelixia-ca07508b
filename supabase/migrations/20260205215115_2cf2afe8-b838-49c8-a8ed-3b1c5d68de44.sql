-- =============================================
-- FASE 1: Marketing Automation Suite - Tables
-- =============================================

-- Campañas de marketing
CREATE TABLE public.crm_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'email',
  status VARCHAR(50) DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  audience_segment_id UUID,
  budget DECIMAL(12,2) DEFAULT 0,
  spent DECIMAL(12,2) DEFAULT 0,
  goals JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencias de email automatizadas
CREATE TABLE public.crm_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.crm_marketing_campaigns(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  stats JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segmentos de audiencia
CREATE TABLE public.crm_audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]',
  filter_type VARCHAR(20) DEFAULT 'dynamic',
  contact_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates de email
CREATE TABLE public.crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  preview_text VARCHAR(255),
  html_content TEXT,
  plain_content TEXT,
  design_json JSONB,
  variables JSONB DEFAULT '[]',
  category VARCHAR(100),
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  stats JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments en secuencias
CREATE TABLE public.crm_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES public.crm_email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_step_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, contact_id)
);

-- Historial de envíos de email
CREATE TABLE public.crm_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.crm_marketing_campaigns(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.crm_email_sequences(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.crm_email_templates(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  links_clicked JSONB DEFAULT '[]',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing
CREATE TABLE public.crm_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.crm_marketing_campaigns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50),
  variants JSONB NOT NULL DEFAULT '[]',
  winning_variant VARCHAR(50),
  winner_criteria VARCHAR(50) DEFAULT 'open_rate',
  sample_size_percent DECIMAL(5,2) DEFAULT 10,
  test_duration_hours INTEGER DEFAULT 24,
  status VARCHAR(50) DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros de segmentos estáticos
CREATE TABLE public.crm_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES public.crm_audience_segments(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(segment_id, contact_id)
);

-- Índices para performance
CREATE INDEX idx_campaigns_company ON public.crm_marketing_campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.crm_marketing_campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.crm_marketing_campaigns(start_date, end_date);
CREATE INDEX idx_sequences_company ON public.crm_email_sequences(company_id);
CREATE INDEX idx_sequences_active ON public.crm_email_sequences(is_active);
CREATE INDEX idx_segments_company ON public.crm_audience_segments(company_id);
CREATE INDEX idx_templates_company ON public.crm_email_templates(company_id);
CREATE INDEX idx_templates_category ON public.crm_email_templates(category);
CREATE INDEX idx_enrollments_sequence ON public.crm_sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_contact ON public.crm_sequence_enrollments(contact_id);
CREATE INDEX idx_enrollments_status ON public.crm_sequence_enrollments(status);
CREATE INDEX idx_email_sends_campaign ON public.crm_email_sends(campaign_id);
CREATE INDEX idx_email_sends_contact ON public.crm_email_sends(contact_id);
CREATE INDEX idx_email_sends_status ON public.crm_email_sends(status);

-- Enable RLS
ALTER TABLE public.crm_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segment_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando crm_team_members para acceso por empresa
CREATE POLICY "crm_campaigns_company_access" ON public.crm_marketing_campaigns
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_sequences_company_access" ON public.crm_email_sequences
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_segments_company_access" ON public.crm_audience_segments
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_templates_company_access" ON public.crm_email_templates
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_enrollments_access" ON public.crm_sequence_enrollments
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM public.crm_email_sequences 
      WHERE company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_email_sends_access" ON public.crm_email_sends
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM public.crm_marketing_campaigns 
      WHERE company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    )
    OR sequence_id IN (
      SELECT id FROM public.crm_email_sequences 
      WHERE company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_ab_tests_access" ON public.crm_ab_tests
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM public.crm_marketing_campaigns 
      WHERE company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "crm_segment_members_access" ON public.crm_segment_members
  FOR ALL USING (
    segment_id IN (
      SELECT id FROM public.crm_audience_segments 
      WHERE company_id IN (SELECT company_id FROM public.crm_team_members WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Trigger para updated_at
CREATE TRIGGER update_crm_campaigns_updated_at
  BEFORE UPDATE ON public.crm_marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_sequences_updated_at
  BEFORE UPDATE ON public.crm_email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_segments_updated_at
  BEFORE UPDATE ON public.crm_audience_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_templates_updated_at
  BEFORE UPDATE ON public.crm_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();