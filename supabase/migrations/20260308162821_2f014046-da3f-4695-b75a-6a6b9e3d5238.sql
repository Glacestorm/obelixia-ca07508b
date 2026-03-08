
-- Extend erp_hr_report_templates with regulatory fields
ALTER TABLE public.erp_hr_report_templates
  ADD COLUMN IF NOT EXISTS is_regulatory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS regulatory_framework text,
  ADD COLUMN IF NOT EXISTS legal_basis text[] DEFAULT '{}';

-- Extend erp_hr_generated_reports with review/approval workflow
ALTER TABLE public.erp_hr_generated_reports
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS disclaimer text,
  ADD COLUMN IF NOT EXISTS regulatory_framework text,
  ADD COLUMN IF NOT EXISTS report_category text DEFAULT 'general';

-- Regulatory report reviews (audit trail for review/approval)
CREATE TABLE IF NOT EXISTS public.erp_hr_regulatory_report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.erp_hr_generated_reports(id) ON DELETE CASCADE NOT NULL,
  company_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  action text NOT NULL, -- 'review', 'approve', 'reject', 'archive', 'comment'
  previous_status text,
  new_status text,
  comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.erp_hr_regulatory_report_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for their company"
  ON public.erp_hr_regulatory_report_reviews
  FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert reviews for their company"
  ON public.erp_hr_regulatory_report_reviews
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));

-- Regulatory report evidence
CREATE TABLE IF NOT EXISTS public.erp_hr_regulatory_report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.erp_hr_generated_reports(id) ON DELETE CASCADE NOT NULL,
  company_id uuid NOT NULL,
  evidence_type text NOT NULL, -- 'data_snapshot', 'document', 'metric', 'ai_analysis', 'external'
  source_module text,
  title text NOT NULL,
  description text,
  data_snapshot jsonb DEFAULT '{}',
  data_source_type text DEFAULT 'demo', -- 'real', 'synced', 'demo', 'derived'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.erp_hr_regulatory_report_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence for their company"
  ON public.erp_hr_regulatory_report_evidence
  FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert evidence for their company"
  ON public.erp_hr_regulatory_report_evidence
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));
