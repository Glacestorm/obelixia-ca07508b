-- =============================================
-- AI HYBRID SYSTEM - Database Schema
-- Sistema de IA Híbrida Universal
-- =============================================

-- 1. Proveedores de IA configurados
CREATE TABLE public.ai_hybrid_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('local', 'external', 'lovable')),
  provider_name TEXT NOT NULL,
  display_name TEXT,
  base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  models JSONB DEFAULT '[]',
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Credenciales de proveedores (encriptadas)
CREATE TABLE public.ai_hybrid_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.ai_hybrid_providers(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  credential_name TEXT NOT NULL,
  encrypted_value TEXT,
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Balance y uso de créditos
CREATE TABLE public.ai_hybrid_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID,
  balance_credits NUMERIC(12,4) DEFAULT 0,
  total_used NUMERIC(12,4) DEFAULT 0,
  total_purchased NUMERIC(12,4) DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  alert_threshold NUMERIC(12,4) DEFAULT 10,
  auto_recharge BOOLEAN DEFAULT false,
  auto_recharge_amount NUMERIC(12,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Transacciones de créditos
CREATE TABLE public.ai_hybrid_credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id UUID NOT NULL REFERENCES public.ai_hybrid_credits(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment')),
  amount NUMERIC(12,4) NOT NULL,
  balance_after NUMERIC(12,4),
  description TEXT,
  provider_name TEXT,
  model_name TEXT,
  tokens_used INTEGER,
  request_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Reglas de privacidad personalizadas
CREATE TABLE public.ai_hybrid_privacy_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('field_pattern', 'content_pattern', 'entity_type', 'custom')),
  classification_level TEXT NOT NULL CHECK (classification_level IN ('public', 'internal', 'confidential', 'restricted')),
  pattern TEXT,
  field_names TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  action TEXT DEFAULT 'anonymize' CHECK (action IN ('anonymize', 'block', 'warn', 'local_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 6. Logs de enrutamiento para analytics
CREATE TABLE public.ai_hybrid_routing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  routing_mode TEXT NOT NULL,
  requested_provider TEXT,
  actual_provider TEXT NOT NULL,
  actual_model TEXT NOT NULL,
  privacy_level TEXT NOT NULL,
  was_anonymized BOOLEAN DEFAULT false,
  fallback_used BOOLEAN DEFAULT false,
  fallback_reason TEXT,
  prompt_length INTEGER,
  response_length INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  latency_ms INTEGER,
  estimated_cost NUMERIC(10,6),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  context_type TEXT,
  context_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Configuración global del sistema
CREATE TABLE public.ai_hybrid_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_ai_hybrid_providers_type ON public.ai_hybrid_providers(provider_type);
CREATE INDEX idx_ai_hybrid_providers_active ON public.ai_hybrid_providers(is_active);
CREATE INDEX idx_ai_hybrid_credits_user ON public.ai_hybrid_credits(user_id);
CREATE INDEX idx_ai_hybrid_credit_tx_credit ON public.ai_hybrid_credit_transactions(credit_id);
CREATE INDEX idx_ai_hybrid_credit_tx_created ON public.ai_hybrid_credit_transactions(created_at DESC);
CREATE INDEX idx_ai_hybrid_routing_logs_user ON public.ai_hybrid_routing_logs(user_id);
CREATE INDEX idx_ai_hybrid_routing_logs_created ON public.ai_hybrid_routing_logs(created_at DESC);
CREATE INDEX idx_ai_hybrid_routing_logs_provider ON public.ai_hybrid_routing_logs(actual_provider);
CREATE INDEX idx_ai_hybrid_privacy_rules_active ON public.ai_hybrid_privacy_rules(is_active);

-- =============================================
-- RLS POLICIES (using existing has_role function)
-- =============================================
ALTER TABLE public.ai_hybrid_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hybrid_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hybrid_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hybrid_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hybrid_privacy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hybrid_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hybrid_config ENABLE ROW LEVEL SECURITY;

-- Providers: Admins can manage, all authenticated can view
CREATE POLICY "Admins can manage AI providers" ON public.ai_hybrid_providers
  FOR ALL USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Authenticated users can view active providers" ON public.ai_hybrid_providers
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Credentials: Only admins
CREATE POLICY "Only admins can manage credentials" ON public.ai_hybrid_credentials
  FOR ALL USING (public.is_admin_or_superadmin(auth.uid()));

-- Credits: Users see their own, admins see all
CREATE POLICY "Users can view their own credits" ON public.ai_hybrid_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits" ON public.ai_hybrid_credits
  FOR ALL USING (public.is_admin_or_superadmin(auth.uid()));

-- Credit transactions: Users see their own
CREATE POLICY "Users can view their credit transactions" ON public.ai_hybrid_credit_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ai_hybrid_credits WHERE id = credit_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage credit transactions" ON public.ai_hybrid_credit_transactions
  FOR ALL USING (public.is_admin_or_superadmin(auth.uid()));

-- Privacy rules: Admins manage, all authenticated view
CREATE POLICY "Admins can manage privacy rules" ON public.ai_hybrid_privacy_rules
  FOR ALL USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Authenticated users can view privacy rules" ON public.ai_hybrid_privacy_rules
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Routing logs: Users see their own, admins see all
CREATE POLICY "Users can view their routing logs" ON public.ai_hybrid_routing_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all routing logs" ON public.ai_hybrid_routing_logs
  FOR SELECT USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "System can insert routing logs" ON public.ai_hybrid_routing_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Config: Only admins
CREATE POLICY "Only admins can manage config" ON public.ai_hybrid_config
  FOR ALL USING (public.is_admin_or_superadmin(auth.uid()));

-- =============================================
-- TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_ai_hybrid_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_hybrid_providers_updated_at
  BEFORE UPDATE ON public.ai_hybrid_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_hybrid_updated_at();

CREATE TRIGGER update_ai_hybrid_credentials_updated_at
  BEFORE UPDATE ON public.ai_hybrid_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_hybrid_updated_at();

CREATE TRIGGER update_ai_hybrid_credits_updated_at
  BEFORE UPDATE ON public.ai_hybrid_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_hybrid_updated_at();

CREATE TRIGGER update_ai_hybrid_privacy_rules_updated_at
  BEFORE UPDATE ON public.ai_hybrid_privacy_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_hybrid_updated_at();

CREATE TRIGGER update_ai_hybrid_config_updated_at
  BEFORE UPDATE ON public.ai_hybrid_config
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_hybrid_updated_at();

-- =============================================
-- SEED DATA: Default Lovable AI Provider
-- =============================================
INSERT INTO public.ai_hybrid_providers (provider_type, provider_name, display_name, base_url, is_active, is_default, priority, models) VALUES
  ('lovable', 'lovable-ai', 'Lovable AI Gateway', 'https://ai.gateway.lovable.dev', true, true, 100, 
   '[{"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "contextWindow": 1000000, "costPer1kTokens": 0.001},
     {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "contextWindow": 2000000, "costPer1kTokens": 0.01},
     {"id": "openai/gpt-5-mini", "name": "GPT-5 Mini", "contextWindow": 128000, "costPer1kTokens": 0.005}]'::jsonb);

-- Default config
INSERT INTO public.ai_hybrid_config (config_key, config_value, description) VALUES
  ('default_routing_mode', '"hybrid_auto"', 'Modo de enrutamiento por defecto'),
  ('default_model', '"google/gemini-2.5-flash"', 'Modelo por defecto para solicitudes'),
  ('enable_privacy_gateway', 'true', 'Activar gateway de privacidad automático'),
  ('enable_cost_tracking', 'true', 'Activar seguimiento de costes'),
  ('local_fallback_enabled', 'true', 'Permitir fallback a local cuando externo falla'),
  ('anonymization_enabled', 'true', 'Activar anonimización automática de datos sensibles');