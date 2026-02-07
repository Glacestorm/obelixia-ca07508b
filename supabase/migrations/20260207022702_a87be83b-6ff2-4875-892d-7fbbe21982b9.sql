-- =====================================================
-- FASE 1: Sistema de IA Híbrido Universal
-- Infraestructura de Base de Datos (CORREGIDO)
-- =====================================================

-- 1.1 Enums necesarios
CREATE TYPE ai_provider_type AS ENUM ('local', 'external', 'hybrid');
CREATE TYPE ai_data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');
CREATE TYPE ai_credit_transaction_type AS ENUM ('purchase', 'usage', 'refund', 'bonus', 'adjustment');
CREATE TYPE ai_routing_mode AS ENUM ('local_only', 'external_only', 'hybrid_auto', 'hybrid_manual');

-- 1.2 Tabla de proveedores de IA disponibles
CREATE TABLE public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_key TEXT NOT NULL UNIQUE,
  provider_type ai_provider_type NOT NULL DEFAULT 'external',
  api_endpoint TEXT,
  requires_api_key BOOLEAN NOT NULL DEFAULT true,
  supported_models JSONB DEFAULT '[]'::jsonb,
  pricing_info JSONB DEFAULT '{}'::jsonb,
  capabilities JSONB DEFAULT '[]'::jsonb,
  documentation_url TEXT,
  billing_url TEXT,
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Credenciales por empresa/workspace
CREATE TABLE public.ai_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  api_key_encrypted TEXT,
  organization_id TEXT,
  project_id TEXT,
  additional_config JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  credits_balance DECIMAL(12,4) DEFAULT 0,
  credits_alert_threshold DECIMAL(12,4) DEFAULT 10,
  monthly_budget_limit DECIMAL(12,2),
  last_usage_check TIMESTAMPTZ,
  last_balance_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_provider_company UNIQUE (provider_id, company_id),
  CONSTRAINT unique_provider_workspace UNIQUE (provider_id, workspace_id),
  CONSTRAINT check_company_or_workspace CHECK (
    (company_id IS NOT NULL AND workspace_id IS NULL) OR
    (company_id IS NULL AND workspace_id IS NOT NULL) OR
    (company_id IS NULL AND workspace_id IS NULL)
  )
);

-- 1.4 Reglas de clasificación de datos
CREATE TABLE public.ai_data_classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  description TEXT,
  data_category TEXT NOT NULL,
  classification_level ai_data_classification NOT NULL DEFAULT 'internal',
  can_send_external BOOLEAN NOT NULL DEFAULT true,
  anonymization_required BOOLEAN NOT NULL DEFAULT false,
  anonymization_method TEXT,
  field_patterns JSONB DEFAULT '[]'::jsonb,
  entity_types TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_system_rule BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 1.5 Logs de uso de IA
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  credential_id UUID REFERENCES public.ai_provider_credentials(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(12,6) DEFAULT 0,
  data_classification_applied ai_data_classification,
  was_anonymized BOOLEAN DEFAULT false,
  source_module TEXT,
  source_action TEXT,
  request_type TEXT,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.6 Transacciones de créditos
CREATE TABLE public.ai_credits_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.ai_provider_credentials(id) ON DELETE CASCADE,
  transaction_type ai_credit_transaction_type NOT NULL,
  amount DECIMAL(12,4) NOT NULL,
  balance_before DECIMAL(12,4) NOT NULL,
  balance_after DECIMAL(12,4) NOT NULL,
  description TEXT,
  payment_reference TEXT,
  invoice_url TEXT,
  external_transaction_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 1.7 Políticas de enrutamiento de IA
CREATE TABLE public.ai_routing_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  routing_mode ai_routing_mode NOT NULL DEFAULT 'hybrid_auto',
  conditions JSONB DEFAULT '{}'::jsonb,
  preferred_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  fallback_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  local_provider_url TEXT DEFAULT 'http://localhost:11434',
  data_classification_override ai_data_classification,
  max_tokens_per_request INTEGER DEFAULT 4000,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  auto_fallback_on_error BOOLEAN NOT NULL DEFAULT true,
  auto_fallback_on_low_credits BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 1.8 Alertas de créditos
CREATE TABLE public.ai_credit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.ai_provider_credentials(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  threshold_percentage DECIMAL(5,2),
  current_balance DECIMAL(12,4),
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  notified_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- 1.9 Configuración global de IA por empresa/workspace
CREATE TABLE public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  default_routing_mode ai_routing_mode NOT NULL DEFAULT 'hybrid_auto',
  default_local_provider_url TEXT DEFAULT 'http://localhost:11434',
  default_local_model TEXT DEFAULT 'llama3.2',
  enable_usage_logging BOOLEAN NOT NULL DEFAULT true,
  enable_cost_tracking BOOLEAN NOT NULL DEFAULT true,
  enable_privacy_gateway BOOLEAN NOT NULL DEFAULT true,
  strict_privacy_mode BOOLEAN NOT NULL DEFAULT false,
  auto_anonymize_confidential BOOLEAN NOT NULL DEFAULT true,
  block_restricted_external BOOLEAN NOT NULL DEFAULT true,
  low_credits_threshold_warning DECIMAL(5,2) DEFAULT 20,
  low_credits_threshold_critical DECIMAL(5,2) DEFAULT 5,
  monthly_budget_alert_threshold DECIMAL(5,2) DEFAULT 80,
  cache_responses BOOLEAN NOT NULL DEFAULT false,
  cache_ttl_seconds INTEGER DEFAULT 3600,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_company_settings UNIQUE (company_id),
  CONSTRAINT unique_workspace_settings UNIQUE (workspace_id)
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_ai_provider_credentials_provider ON public.ai_provider_credentials(provider_id);
CREATE INDEX idx_ai_provider_credentials_company ON public.ai_provider_credentials(company_id);
CREATE INDEX idx_ai_provider_credentials_workspace ON public.ai_provider_credentials(workspace_id);

CREATE INDEX idx_ai_data_classification_rules_company ON public.ai_data_classification_rules(company_id);
CREATE INDEX idx_ai_data_classification_rules_workspace ON public.ai_data_classification_rules(workspace_id);
CREATE INDEX idx_ai_data_classification_rules_level ON public.ai_data_classification_rules(classification_level);

CREATE INDEX idx_ai_usage_logs_provider ON public.ai_usage_logs(provider_id);
CREATE INDEX idx_ai_usage_logs_credential ON public.ai_usage_logs(credential_id);
CREATE INDEX idx_ai_usage_logs_company ON public.ai_usage_logs(company_id);
CREATE INDEX idx_ai_usage_logs_workspace ON public.ai_usage_logs(workspace_id);
CREATE INDEX idx_ai_usage_logs_timestamp ON public.ai_usage_logs(request_timestamp DESC);
CREATE INDEX idx_ai_usage_logs_user ON public.ai_usage_logs(user_id);

CREATE INDEX idx_ai_credits_transactions_credential ON public.ai_credits_transactions(credential_id);
CREATE INDEX idx_ai_credits_transactions_created ON public.ai_credits_transactions(created_at DESC);

CREATE INDEX idx_ai_routing_policies_company ON public.ai_routing_policies(company_id);
CREATE INDEX idx_ai_routing_policies_workspace ON public.ai_routing_policies(workspace_id);

CREATE INDEX idx_ai_credit_alerts_credential ON public.ai_credit_alerts(credential_id);
CREATE INDEX idx_ai_credit_alerts_unread ON public.ai_credit_alerts(credential_id) WHERE NOT is_read;

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================

CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_provider_credentials_updated_at
  BEFORE UPDATE ON public.ai_provider_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_data_classification_rules_updated_at
  BEFORE UPDATE ON public.ai_data_classification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_routing_policies_updated_at
  BEFORE UPDATE ON public.ai_routing_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCIÓN HELPER PARA VERIFICAR ACCESO A WORKSPACE CRM
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_crm_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_user_workspaces
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND is_active = true
  )
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_data_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_routing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_providers (tabla de sistema, lectura pública para autenticados)
CREATE POLICY "ai_providers_select_authenticated"
  ON public.ai_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "ai_providers_all_admin"
  ON public.ai_providers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_provider_credentials (simplificadas)
CREATE POLICY "ai_provider_credentials_select_own"
  ON public.ai_provider_credentials FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id))
  );

CREATE POLICY "ai_provider_credentials_insert"
  ON public.ai_provider_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_provider_credentials_update"
  ON public.ai_provider_credentials FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_provider_credentials_delete"
  ON public.ai_provider_credentials FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );

-- Políticas para ai_data_classification_rules
CREATE POLICY "ai_data_classification_rules_select"
  ON public.ai_data_classification_rules FOR SELECT
  TO authenticated
  USING (
    is_system_rule = true OR
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id))
  );

CREATE POLICY "ai_data_classification_rules_insert"
  ON public.ai_data_classification_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_data_classification_rules_update"
  ON public.ai_data_classification_rules FOR UPDATE
  TO authenticated
  USING (
    (is_system_rule = false AND created_by = auth.uid()) OR
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_data_classification_rules_delete"
  ON public.ai_data_classification_rules FOR DELETE
  TO authenticated
  USING (
    (is_system_rule = false AND created_by = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Políticas para ai_usage_logs
CREATE POLICY "ai_usage_logs_select"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id))
  );

CREATE POLICY "ai_usage_logs_insert"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas para ai_credits_transactions
CREATE POLICY "ai_credits_transactions_select"
  ON public.ai_credits_transactions FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.ai_provider_credentials c
      WHERE c.id = ai_credits_transactions.credential_id
      AND (
        c.created_by = auth.uid() OR
        (c.company_id IS NOT NULL AND public.user_has_erp_company_access(c.company_id)) OR
        (c.workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(c.workspace_id))
      )
    )
  );

CREATE POLICY "ai_credits_transactions_insert"
  ON public.ai_credits_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas para ai_routing_policies
CREATE POLICY "ai_routing_policies_select"
  ON public.ai_routing_policies FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_routing_policies_insert"
  ON public.ai_routing_policies FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_routing_policies_update"
  ON public.ai_routing_policies FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_routing_policies_delete"
  ON public.ai_routing_policies FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );

-- Políticas para ai_credit_alerts
CREATE POLICY "ai_credit_alerts_select"
  ON public.ai_credit_alerts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(notified_users) OR
    EXISTS (
      SELECT 1 FROM public.ai_provider_credentials c
      WHERE c.id = ai_credit_alerts.credential_id
      AND (
        c.created_by = auth.uid() OR
        (c.company_id IS NOT NULL AND public.user_has_erp_company_access(c.company_id)) OR
        (c.workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(c.workspace_id))
      )
    )
  );

CREATE POLICY "ai_credit_alerts_update"
  ON public.ai_credit_alerts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(notified_users) OR
    EXISTS (
      SELECT 1 FROM public.ai_provider_credentials c
      WHERE c.id = ai_credit_alerts.credential_id
      AND c.created_by = auth.uid()
    )
  );

-- Políticas para ai_settings
CREATE POLICY "ai_settings_select"
  ON public.ai_settings FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id))
  );

CREATE POLICY "ai_settings_insert"
  ON public.ai_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ai_settings_update"
  ON public.ai_settings FOR UPDATE
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.user_has_erp_company_access(company_id)) OR
    (workspace_id IS NOT NULL AND public.user_has_crm_workspace_access(workspace_id)) OR
    public.has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- DATOS INICIALES: Proveedores de IA
-- =====================================================

INSERT INTO public.ai_providers (name, provider_key, provider_type, api_endpoint, requires_api_key, supported_models, pricing_info, capabilities, documentation_url, billing_url, icon_name, is_active, is_default, order_index) VALUES
-- Proveedor Local (Ollama)
('Ollama Local', 'ollama', 'local', 'http://localhost:11434', false, 
 '[{"id": "llama3.2", "name": "Llama 3.2", "context": 128000}, {"id": "mistral", "name": "Mistral 7B", "context": 32000}, {"id": "phi3", "name": "Phi-3", "context": 4096}, {"id": "codellama", "name": "CodeLlama", "context": 16000}, {"id": "deepseek-coder", "name": "DeepSeek Coder", "context": 16000}]'::jsonb,
 '{"type": "free", "cost_per_1k_tokens": 0}'::jsonb,
 '["text", "code", "embedding"]'::jsonb,
 'https://ollama.ai/docs', null, 'Server', true, false, 1),

-- Lovable AI (Pre-integrado)
('Lovable AI', 'lovable', 'external', 'https://ai.gateway.lovable.dev/v1/chat/completions', false,
 '[{"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "context": 1000000}, {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "context": 1000000}, {"id": "openai/gpt-5", "name": "GPT-5", "context": 128000}, {"id": "openai/gpt-5-mini", "name": "GPT-5 Mini", "context": 128000}]'::jsonb,
 '{"type": "credits", "cost_per_1k_tokens": 0.001, "free_tier": true}'::jsonb,
 '["text", "vision", "code", "reasoning"]'::jsonb,
 'https://docs.lovable.dev/features/ai', 'https://lovable.dev/settings', 'Sparkles', true, true, 0),

-- OpenAI
('OpenAI', 'openai', 'external', 'https://api.openai.com/v1/chat/completions', true,
 '[{"id": "gpt-4o", "name": "GPT-4o", "context": 128000}, {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "context": 128000}, {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "context": 128000}, {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "context": 16385}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.005, "cost_per_1k_output": 0.015}'::jsonb,
 '["text", "vision", "function_calling", "json_mode"]'::jsonb,
 'https://platform.openai.com/docs', 'https://platform.openai.com/account/billing', 'Zap', true, false, 2),

-- Anthropic
('Anthropic Claude', 'anthropic', 'external', 'https://api.anthropic.com/v1/messages', true,
 '[{"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "context": 200000}, {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "context": 200000}, {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "context": 200000}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.003, "cost_per_1k_output": 0.015}'::jsonb,
 '["text", "vision", "long_context"]'::jsonb,
 'https://docs.anthropic.com', 'https://console.anthropic.com/settings/billing', 'Brain', true, false, 3),

-- Google AI (Gemini directo)
('Google Gemini', 'google', 'external', 'https://generativelanguage.googleapis.com/v1beta/models', true,
 '[{"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "context": 2000000}, {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "context": 1000000}, {"id": "gemini-1.0-pro", "name": "Gemini 1.0 Pro", "context": 32000}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.00125, "cost_per_1k_output": 0.005}'::jsonb,
 '["text", "vision", "multimodal", "long_context"]'::jsonb,
 'https://ai.google.dev/docs', 'https://console.cloud.google.com/billing', 'Sparkle', true, false, 4),

-- Mistral AI
('Mistral AI', 'mistral', 'external', 'https://api.mistral.ai/v1/chat/completions', true,
 '[{"id": "mistral-large-latest", "name": "Mistral Large", "context": 128000}, {"id": "mistral-medium-latest", "name": "Mistral Medium", "context": 32000}, {"id": "mistral-small-latest", "name": "Mistral Small", "context": 32000}, {"id": "open-mixtral-8x22b", "name": "Mixtral 8x22B", "context": 64000}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.002, "cost_per_1k_output": 0.006}'::jsonb,
 '["text", "code", "eu_hosting"]'::jsonb,
 'https://docs.mistral.ai', 'https://console.mistral.ai/billing', 'Wind', true, false, 5),

-- Cohere
('Cohere', 'cohere', 'external', 'https://api.cohere.ai/v1/chat', true,
 '[{"id": "command-r-plus", "name": "Command R+", "context": 128000}, {"id": "command-r", "name": "Command R", "context": 128000}, {"id": "command", "name": "Command", "context": 4096}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.003, "cost_per_1k_output": 0.015}'::jsonb,
 '["text", "rag", "rerank", "embedding"]'::jsonb,
 'https://docs.cohere.com', 'https://dashboard.cohere.com/billing', 'Layers', true, false, 6),

-- Groq
('Groq', 'groq', 'external', 'https://api.groq.com/openai/v1/chat/completions', true,
 '[{"id": "llama-3.1-70b-versatile", "name": "Llama 3.1 70B", "context": 128000}, {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B", "context": 128000}, {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "context": 32768}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.0005, "cost_per_1k_output": 0.001}'::jsonb,
 '["text", "ultra_fast"]'::jsonb,
 'https://console.groq.com/docs', 'https://console.groq.com/settings/billing', 'Zap', true, false, 7),

-- Together AI
('Together AI', 'together', 'external', 'https://api.together.xyz/v1/chat/completions', true,
 '[{"id": "meta-llama/Llama-3-70b-chat-hf", "name": "Llama 3 70B", "context": 8192}, {"id": "mistralai/Mixtral-8x7B-Instruct-v0.1", "name": "Mixtral 8x7B", "context": 32768}, {"id": "Qwen/Qwen2-72B-Instruct", "name": "Qwen2 72B", "context": 32768}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.0002, "cost_per_1k_output": 0.0002}'::jsonb,
 '["text", "code", "fine_tuning", "open_source"]'::jsonb,
 'https://docs.together.ai', 'https://api.together.xyz/settings/billing', 'Users', true, false, 8),

-- DeepSeek
('DeepSeek', 'deepseek', 'external', 'https://api.deepseek.com/v1/chat/completions', true,
 '[{"id": "deepseek-chat", "name": "DeepSeek V2.5", "context": 64000}, {"id": "deepseek-coder", "name": "DeepSeek Coder", "context": 64000}]'::jsonb,
 '{"type": "pay_per_use", "cost_per_1k_input": 0.00014, "cost_per_1k_output": 0.00028}'::jsonb,
 '["text", "code", "reasoning"]'::jsonb,
 'https://platform.deepseek.com/docs', 'https://platform.deepseek.com/usage', 'Code', true, false, 9);

-- =====================================================
-- REGLAS DE CLASIFICACIÓN DE DATOS POR DEFECTO (SISTEMA)
-- =====================================================

INSERT INTO public.ai_data_classification_rules (rule_name, description, data_category, classification_level, can_send_external, anonymization_required, field_patterns, entity_types, keywords, priority, is_system_rule, is_active) VALUES
-- Datos RESTRICTED (nunca salen)
('Identificadores Fiscales', 'NIF, CIF, NIE y números de identificación fiscal', 'fiscal_ids', 'restricted', false, false,
 '[{"pattern": "\\b[0-9]{8}[A-Z]\\b", "description": "NIF español"}, {"pattern": "\\b[A-Z][0-9]{8}\\b", "description": "CIF español"}, {"pattern": "\\b[XYZ][0-9]{7}[A-Z]\\b", "description": "NIE español"}]'::jsonb,
 ARRAY['companies', 'contacts', 'employees', 'invoices'], ARRAY['nif', 'cif', 'nie', 'tax_id', 'vat_number'], 100, true, true),

('Cuentas Bancarias', 'IBAN, números de cuenta y datos bancarios', 'banking', 'restricted', false, false,
 '[{"pattern": "\\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}\\b", "description": "IBAN"}, {"pattern": "\\b[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{2}\\s?[0-9]{10}\\b", "description": "CCC español"}]'::jsonb,
 ARRAY['companies', 'contacts', 'bank_accounts', 'payments'], ARRAY['iban', 'cuenta', 'bank_account', 'swift', 'bic'], 100, true, true),

('Tarjetas de Crédito', 'Números de tarjetas de crédito y débito', 'payment_cards', 'restricted', false, false,
 '[{"pattern": "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b", "description": "Visa/Mastercard/Amex"}]'::jsonb,
 ARRAY['payments', 'transactions'], ARRAY['card_number', 'credit_card', 'cvv', 'expiry'], 100, true, true),

('Contraseñas y Tokens', 'Credenciales de acceso y tokens de autenticación', 'credentials', 'restricted', false, false,
 '[{"pattern": "password|contraseña|secret|token|api_key|bearer", "description": "Campos sensibles", "case_insensitive": true}]'::jsonb,
 ARRAY['users', 'api_keys', 'settings'], ARRAY['password', 'secret', 'token', 'api_key', 'bearer'], 100, true, true),

('Salarios y Nóminas', 'Información salarial y datos de nóminas', 'payroll', 'restricted', false, false,
 '[{"pattern": "salario|sueldo|nómina|payroll", "description": "Datos salariales", "case_insensitive": true}]'::jsonb,
 ARRAY['employees', 'payroll', 'hr_records'], ARRAY['salary', 'wage', 'payroll', 'nomina', 'sueldo'], 100, true, true),

-- Datos CONFIDENTIAL (requieren anonimización)
('Emails de Clientes', 'Direcciones de correo electrónico de clientes y contactos', 'contact_emails', 'confidential', true, true,
 '[{"pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", "description": "Email"}]'::jsonb,
 ARRAY['contacts', 'leads', 'customers'], ARRAY['email', 'correo', 'mail'], 80, true, true),

('Teléfonos', 'Números de teléfono de clientes y contactos', 'contact_phones', 'confidential', true, true,
 '[{"pattern": "\\+?[0-9]{9,15}", "description": "Teléfono"}]'::jsonb,
 ARRAY['contacts', 'leads', 'customers'], ARRAY['phone', 'telefono', 'mobile', 'movil'], 80, true, true),

('Direcciones Completas', 'Direcciones postales completas de clientes', 'addresses', 'confidential', true, true,
 '[{"pattern": "calle|avenida|plaza|paseo|carrer", "description": "Dirección", "case_insensitive": true}]'::jsonb,
 ARRAY['contacts', 'companies', 'shipping'], ARRAY['address', 'direccion', 'domicilio', 'calle'], 70, true, true),

('Movimientos Contables', 'Asientos y movimientos contables detallados', 'accounting', 'confidential', true, false,
 '[]'::jsonb,
 ARRAY['journal_entries', 'transactions', 'ledger'], ARRAY['asiento', 'debe', 'haber', 'balance'], 60, true, true),

-- Datos INTERNAL (uso interno)
('Valores de Oportunidades', 'Importes y valores de deals/oportunidades', 'deal_values', 'internal', true, false,
 '[]'::jsonb,
 ARRAY['deals', 'opportunities', 'quotes'], ARRAY['deal_value', 'amount', 'importe', 'precio'], 50, true, true),

('Nombres de Proveedores', 'Información de proveedores', 'suppliers', 'internal', true, false,
 '[]'::jsonb,
 ARRAY['suppliers', 'vendors'], ARRAY['proveedor', 'supplier', 'vendor'], 40, true, true),

-- Datos PUBLIC
('Catálogos de Productos', 'Información pública de productos', 'products', 'public', true, false,
 '[]'::jsonb,
 ARRAY['products', 'catalog', 'inventory'], ARRAY['producto', 'product', 'articulo', 'sku'], 10, true, true),

('Nombres de Empresa', 'Razón social y nombres comerciales públicos', 'company_names', 'public', true, false,
 '[]'::jsonb,
 ARRAY['companies', 'organizations'], ARRAY['empresa', 'company', 'razon_social'], 10, true, true);