
-- V2-ES.4 Paso 1 (parte 3): Reglas de plazos y vencimientos legales documentales
CREATE TABLE public.erp_hr_document_due_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id uuid REFERENCES public.erp_hr_document_types(id) ON DELETE CASCADE,
  document_type_code text NOT NULL,
  process_type text NOT NULL,
  trigger_event text NOT NULL,
  due_offset_days integer NOT NULL DEFAULT 0,
  due_rule_type text NOT NULL DEFAULT 'calendar_days',
  severity text NOT NULL DEFAULT 'medium',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.erp_hr_document_due_rules IS 'Reglas de plazos legales para tipos documentales HR España (V2-ES.4)';
COMMENT ON COLUMN public.erp_hr_document_due_rules.due_rule_type IS 'calendar_days|business_days|before_start|end_of_next_month|custom';
COMMENT ON COLUMN public.erp_hr_document_due_rules.severity IS 'low|medium|high|critical';
COMMENT ON COLUMN public.erp_hr_document_due_rules.trigger_event IS 'Evento que inicia el cómputo: hiring_date, termination_date, incident_date, birth_date, etc.';

CREATE INDEX idx_hr_due_rules_process ON public.erp_hr_document_due_rules (process_type) WHERE is_active = true;
CREATE INDEX idx_hr_due_rules_doc_type ON public.erp_hr_document_due_rules (document_type_code) WHERE is_active = true;

ALTER TABLE public.erp_hr_document_due_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read due rules"
  ON public.erp_hr_document_due_rules
  FOR SELECT
  TO authenticated
  USING (true);
