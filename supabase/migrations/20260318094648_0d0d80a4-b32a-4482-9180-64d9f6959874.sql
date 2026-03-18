
-- Site settings table for maintenance mode and other global settings
CREATE TABLE IF NOT EXISTS public.site_maintenance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.site_maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (need to check maintenance mode)
CREATE POLICY "Anyone can read site_maintenance_settings"
  ON public.site_maintenance_settings FOR SELECT USING (true);

-- Only admins can update
CREATE POLICY "Admins can update site_maintenance_settings"
  ON public.site_maintenance_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Only admins can insert
CREATE POLICY "Admins can insert site_maintenance_settings"
  ON public.site_maintenance_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Seed maintenance_mode = false
INSERT INTO public.site_maintenance_settings (setting_key, setting_value)
VALUES ('maintenance_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
