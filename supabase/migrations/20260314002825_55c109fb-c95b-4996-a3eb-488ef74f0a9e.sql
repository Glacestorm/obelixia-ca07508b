
-- V2-ES.5 Paso 2: Add deadline/payload tracking columns to erp_hr_registration_data
-- Additive — all nullable, no impact on existing rows

ALTER TABLE public.erp_hr_registration_data
  ADD COLUMN IF NOT EXISTS internal_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_urgency text DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS is_overdue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payload_status text DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS payload_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payload_missing_fields text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payload_format_errors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payload_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS last_payload_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_computed_at timestamptz;

-- Comment for documentation
COMMENT ON COLUMN public.erp_hr_registration_data.internal_deadline_at IS 'Pre-alta deadline: 3 business days before registration_date';
COMMENT ON COLUMN public.erp_hr_registration_data.deadline_urgency IS 'Computed urgency: ok, upcoming, urgent, overdue, blocked, resolved';
COMMENT ON COLUMN public.erp_hr_registration_data.payload_status IS 'TGSS payload status: incomplete, has_errors, ready';
COMMENT ON COLUMN public.erp_hr_registration_data.payload_snapshot IS 'Last computed TGSS payload JSON (preparatory, not official)';
