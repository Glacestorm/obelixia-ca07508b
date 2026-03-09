
-- energy_alert_preferences
CREATE TABLE public.energy_alert_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT,
  client_email TEXT,
  channels TEXT[] NOT NULL DEFAULT '{in_app}',
  alert_types TEXT[] NOT NULL DEFAULT '{contract_expiry,price_spike,savings_opportunity,regulation_change}',
  frequency TEXT NOT NULL DEFAULT 'immediate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert prefs" ON public.energy_alert_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- energy_report_schedules
CREATE TABLE public.energy_report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'executive_summary',
  format TEXT NOT NULL DEFAULT 'pdf',
  schedule TEXT NOT NULL DEFAULT 'monthly',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own report schedules" ON public.energy_report_schedules
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
