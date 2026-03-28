
CREATE TABLE public.legal_advisor_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'ES',
  specialty TEXT NOT NULL DEFAULT 'general',
  legal_references TEXT[] DEFAULT '{}',
  confidence NUMERIC DEFAULT 0.85,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  asked_count INTEGER DEFAULT 1,
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.legal_advisor_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read FAQ" ON public.legal_advisor_faq FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert FAQ" ON public.legal_advisor_faq FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update FAQ" ON public.legal_advisor_faq FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_legal_faq_jurisdiction_specialty ON public.legal_advisor_faq (jurisdiction, specialty);
CREATE INDEX idx_legal_faq_asked_count ON public.legal_advisor_faq (asked_count DESC);
