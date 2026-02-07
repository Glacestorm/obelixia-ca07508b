-- =====================================================
-- PHASE 1: MARKETING AUTOMATION SUITE (CRM)
-- Enterprise SaaS 2025-2026 - Critical Priority
-- =====================================================

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS crm_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'email', -- email, social, multichannel, sms
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, active, paused, completed
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  audience_segment_id UUID,
  budget DECIMAL(12,2) DEFAULT 0,
  spent DECIMAL(12,2) DEFAULT 0,
  goals JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{"opens": 0, "clicks": 0, "conversions": 0, "revenue": 0}',
  settings JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  html_content TEXT,
  plain_content TEXT,
  variables JSONB DEFAULT '[]', -- Available merge variables
  category VARCHAR(100) DEFAULT 'general',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audience Segments
CREATE TABLE IF NOT EXISTS crm_audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]', -- Segmentation rules
  contact_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true, -- Auto-update on changes
  last_calculated_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Sequences (Drip campaigns)
CREATE TABLE IF NOT EXISTS crm_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_marketing_campaigns(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50), -- form_submit, tag_added, deal_stage, date_based
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]', -- Array of steps with delays and templates
  is_active BOOLEAN DEFAULT false,
  enrolled_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Contacts (Many-to-many with tracking)
CREATE TABLE IF NOT EXISTS crm_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_marketing_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, unsubscribed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

-- Sequence Enrollments
CREATE TABLE IF NOT EXISTS crm_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES crm_email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, paused, unsubscribed
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, contact_id)
);

-- A/B Tests
CREATE TABLE IF NOT EXISTS crm_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_marketing_campaigns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) DEFAULT 'subject', -- subject, content, sender
  variants JSONB NOT NULL DEFAULT '[]', -- Array of variants with their content
  winner_criteria VARCHAR(50) DEFAULT 'open_rate', -- open_rate, click_rate, conversion
  winner_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'running', -- running, completed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Analytics (Time-series)
CREATE TABLE IF NOT EXISTS crm_campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_marketing_campaigns(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- sends, opens, clicks, conversions, revenue
  metric_value DECIMAL(15,4) DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Marketing Forms
CREATE TABLE IF NOT EXISTS crm_marketing_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}', -- redirect_url, notification_emails, etc
  campaign_id UUID REFERENCES crm_marketing_campaigns(id),
  submission_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form Submissions
CREATE TABLE IF NOT EXISTS crm_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES crm_marketing_forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id),
  data JSONB NOT NULL DEFAULT '{}',
  source_url TEXT,
  utm_params JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_company ON crm_marketing_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_templates_company ON crm_email_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_segments_company ON crm_audience_segments(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_sequences_campaign ON crm_email_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_contacts_campaign ON crm_campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_contacts_status ON crm_campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_analytics_campaign ON crm_campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_analytics_recorded ON crm_campaign_analytics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_crm_forms_company ON crm_marketing_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_form_submissions_form ON crm_form_submissions(form_id);

-- Enable RLS
ALTER TABLE crm_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_marketing_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view campaigns from their company" ON crm_marketing_campaigns
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaigns from their company" ON crm_marketing_campaigns
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for templates
CREATE POLICY "Users can view templates from their company" ON crm_email_templates
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates from their company" ON crm_email_templates
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for segments
CREATE POLICY "Users can view segments from their company" ON crm_audience_segments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage segments from their company" ON crm_audience_segments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for sequences
CREATE POLICY "Users can view sequences from their company" ON crm_email_sequences
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sequences from their company" ON crm_email_sequences
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for campaign contacts
CREATE POLICY "Users can view campaign contacts from their campaigns" ON crm_campaign_contacts
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM crm_marketing_campaigns WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage campaign contacts from their campaigns" ON crm_campaign_contacts
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM crm_marketing_campaigns WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for sequence enrollments
CREATE POLICY "Users can view sequence enrollments" ON crm_sequence_enrollments
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM crm_email_sequences WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage sequence enrollments" ON crm_sequence_enrollments
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM crm_email_sequences WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for A/B tests
CREATE POLICY "Users can view AB tests from their campaigns" ON crm_ab_tests
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM crm_marketing_campaigns WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage AB tests from their campaigns" ON crm_ab_tests
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM crm_marketing_campaigns WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for analytics
CREATE POLICY "Users can view campaign analytics" ON crm_campaign_analytics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM crm_marketing_campaigns WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert campaign analytics" ON crm_campaign_analytics
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM crm_marketing_campaigns WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for forms
CREATE POLICY "Users can view forms from their company" ON crm_marketing_forms
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage forms from their company" ON crm_marketing_forms
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for form submissions (public insert, private read)
CREATE POLICY "Anyone can submit forms" ON crm_form_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view submissions from their forms" ON crm_form_submissions
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM crm_marketing_forms WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Function to update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'opened' AND OLD.status != 'opened' THEN
    INSERT INTO crm_campaign_analytics (campaign_id, metric_type, metric_value)
    VALUES (NEW.campaign_id, 'opens', 1);
  END IF;
  
  IF NEW.status = 'clicked' AND OLD.status != 'clicked' THEN
    INSERT INTO crm_campaign_analytics (campaign_id, metric_type, metric_value)
    VALUES (NEW.campaign_id, 'clicks', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_campaign_metrics
  AFTER UPDATE ON crm_campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics();

-- Function to update segment contact count
CREATE OR REPLACE FUNCTION update_segment_contact_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_audience_segments
  SET contact_count = (
    SELECT COUNT(*) FROM crm_contacts 
    WHERE company_id = NEW.company_id
  ),
  last_calculated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment form submission count
CREATE OR REPLACE FUNCTION increment_form_submissions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_marketing_forms
  SET submission_count = submission_count + 1,
      updated_at = NOW()
  WHERE id = NEW.form_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_form_submissions
  AFTER INSERT ON crm_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION increment_form_submissions();