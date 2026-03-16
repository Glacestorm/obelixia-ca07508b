
-- Enrich erp_cross_domain_feedback with source tracking and learning flags
ALTER TABLE public.erp_cross_domain_feedback 
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS source_code text,
  ADD COLUMN IF NOT EXISTS legal_area text,
  ADD COLUMN IF NOT EXISTS impact_domains text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS actionability_rating integer,
  ADD COLUMN IF NOT EXISTS should_have_escalated boolean,
  ADD COLUMN IF NOT EXISTS learning_applied boolean DEFAULT false;

-- Enrich erp_validated_cases with learning utility fields
ALTER TABLE public.erp_validated_cases
  ADD COLUMN IF NOT EXISTS origin_trigger text,
  ADD COLUMN IF NOT EXISTS resolution_accepted boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS conflict_resolution_quality integer,
  ADD COLUMN IF NOT EXISTS is_reference_case boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Learning configuration table for feature flags and thresholds
CREATE TABLE IF NOT EXISTS public.erp_learning_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL DEFAULT '{}',
  description text,
  is_active boolean DEFAULT true,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default learning config entries
INSERT INTO public.erp_learning_config (config_key, config_value, description, is_active) VALUES
  ('escalation_learning', '{"enabled": true, "min_samples": 5, "confidence_boost": 0.1, "confidence_penalty": 0.15}', 'Ajuste de escalado basado en feedback histórico', true),
  ('severity_learning', '{"enabled": true, "min_samples": 3, "correction_weight": 0.3}', 'Ajuste de severidad por correcciones humanas', true),
  ('deadline_learning', '{"enabled": true, "use_historical_deadlines": true}', 'Mejora de plazos por validación histórica', true),
  ('actions_learning', '{"enabled": true, "prefer_validated_templates": true}', 'Mejora de acciones prioritarias por feedback', true),
  ('few_shot_learning', '{"enabled": true, "max_examples": 5, "min_quality_score": 0.7}', 'Inyección de casos validados como few-shot en prompts', true),
  ('seed_exclusion', '{"enabled": true, "exclude_seed_from_learning": true}', 'Excluir datos seed/demo del aprendizaje', true)
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS on learning config
ALTER TABLE public.erp_learning_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write learning config
CREATE POLICY "Admin read learning config" ON public.erp_learning_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admin write learning config" ON public.erp_learning_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
