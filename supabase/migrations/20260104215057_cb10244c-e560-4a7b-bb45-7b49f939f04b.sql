-- Feature Flags Enterprise - Sistema avanzado por tenant y licencia
-- Tabla principal de Feature Flags Enterprise
CREATE TABLE IF NOT EXISTS public.enterprise_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  
  -- Estado global
  is_enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- Targeting avanzado
  target_tenants TEXT[] DEFAULT '{}',
  target_license_tiers TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  target_user_ids UUID[] DEFAULT '{}',
  
  -- Configuración temporal
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- A/B Testing
  is_experiment BOOLEAN DEFAULT false,
  experiment_variants JSONB DEFAULT '[]',
  control_percentage INTEGER DEFAULT 50,
  
  -- Metadata
  dependencies TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Auditoría
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historial de cambios de Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flag_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID REFERENCES public.enterprise_feature_flags(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- Overrides por tenant
CREATE TABLE IF NOT EXISTS public.feature_flag_tenant_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID NOT NULL REFERENCES public.enterprise_feature_flags(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  custom_value JSONB,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flag_id, tenant_id)
);

-- Overrides por licencia
CREATE TABLE IF NOT EXISTS public.feature_flag_license_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID NOT NULL REFERENCES public.enterprise_feature_flags(id) ON DELETE CASCADE,
  license_id UUID,
  license_tier TEXT,
  is_enabled BOOLEAN NOT NULL,
  custom_value JSONB,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Analytics de Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flag_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID REFERENCES public.enterprise_feature_flags(id) ON DELETE SET NULL,
  flag_key TEXT NOT NULL,
  user_id UUID,
  tenant_id TEXT,
  license_id UUID,
  evaluated_value BOOLEAN NOT NULL,
  variant_key TEXT,
  evaluation_reason TEXT,
  context_data JSONB,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.enterprise_feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON public.enterprise_feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.enterprise_feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_ff_tenant_overrides_flag ON public.feature_flag_tenant_overrides(flag_id);
CREATE INDEX IF NOT EXISTS idx_ff_tenant_overrides_tenant ON public.feature_flag_tenant_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ff_evaluations_flag ON public.feature_flag_evaluations(flag_id);
CREATE INDEX IF NOT EXISTS idx_ff_evaluations_date ON public.feature_flag_evaluations(evaluated_at);

-- Enable RLS
ALTER TABLE public.enterprise_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_tenant_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_license_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies usando user_role en lugar de role
CREATE POLICY "Authenticated users can read feature flags"
ON public.enterprise_feature_flags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.enterprise_feature_flags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('superadmin', 'admin')
  )
);

CREATE POLICY "Admins can read audit logs"
ON public.feature_flag_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('superadmin', 'admin')
  )
);

CREATE POLICY "Admins can manage tenant overrides"
ON public.feature_flag_tenant_overrides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('superadmin', 'admin')
  )
);

CREATE POLICY "Admins can manage license overrides"
ON public.feature_flag_license_overrides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('superadmin', 'admin')
  )
);

CREATE POLICY "Authenticated users can log evaluations"
ON public.feature_flag_evaluations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can read their own evaluations"
ON public.feature_flag_evaluations FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND user_role IN ('superadmin', 'admin')
));

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_enterprise_feature_flags_updated_at
BEFORE UPDATE ON public.enterprise_feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar algunos Feature Flags de ejemplo
INSERT INTO public.enterprise_feature_flags (flag_key, flag_name, description, category, is_enabled, rollout_percentage, target_license_tiers) VALUES
('new_dashboard_ui', 'Nueva UI Dashboard', 'Nueva interfaz de usuario para el dashboard principal', 'ui', false, 0, '{"enterprise","professional"}'),
('ai_copilot_v2', 'IA Copilot V2', 'Nueva versión del asistente IA con capacidades mejoradas', 'ai', false, 25, '{"enterprise"}'),
('advanced_analytics', 'Analytics Avanzados', 'Módulo de analytics con ML y predicciones', 'analytics', true, 100, '{}'),
('multi_tenant_mode', 'Modo Multi-Tenant', 'Permite gestión de múltiples tenants', 'core', true, 100, '{"enterprise"}'),
('real_time_collaboration', 'Colaboración en Tiempo Real', 'Funcionalidad de edición colaborativa', 'collaboration', false, 50, '{"professional","enterprise"}'),
('voice_commands', 'Comandos por Voz', 'Control del sistema mediante comandos de voz', 'accessibility', false, 10, '{}'),
('dark_mode_v2', 'Modo Oscuro V2', 'Nueva versión del tema oscuro', 'ui', true, 100, '{}'),
('export_pdf_pro', 'Export PDF Pro', 'Exportación avanzada a PDF con plantillas', 'export', false, 75, '{"professional","enterprise"}')
ON CONFLICT (flag_key) DO NOTHING;