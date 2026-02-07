-- =============================================
-- PHASE 6: CRM OMNICHANNEL COMMUNICATION HUB
-- WhatsApp, Email, SMS, Chat unificado
-- =============================================

-- 1. Conversations (Unified Inbox)
CREATE TABLE public.crm_omni_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'webchat', 'instagram', 'facebook', 'telegram')),
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed', 'spam')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent_id UUID,
  assigned_team_id UUID,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
  unread_count INTEGER DEFAULT 0,
  is_bot_active BOOLEAN DEFAULT false,
  bot_handoff_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score NUMERIC(3,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Messages
CREATE TABLE public.crm_omni_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.crm_omni_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'bot', 'system')),
  sender_id UUID,
  sender_name TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'template', 'interactive')),
  attachments JSONB DEFAULT '[]',
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  is_internal_note BOOLEAN DEFAULT false,
  reply_to_message_id UUID REFERENCES public.crm_omni_messages(id),
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(3,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Channel Configurations
CREATE TABLE public.crm_channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  display_name TEXT,
  credentials JSONB DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  current_daily_usage INTEGER DEFAULT 0,
  current_monthly_usage INTEGER DEFAULT 0,
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_message TEXT,
  business_hours JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel)
);

-- 4. Message Templates (Multi-channel)
CREATE TABLE public.crm_omni_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication', 'support', 'sales', 'notification')),
  language TEXT NOT NULL DEFAULT 'es',
  content TEXT NOT NULL,
  header_type TEXT CHECK (header_type IN ('text', 'image', 'video', 'document')),
  header_content TEXT,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  variables TEXT[] DEFAULT '{}',
  external_id TEXT,
  approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Quick Replies
CREATE TABLE public.crm_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  channels TEXT[] DEFAULT '{}',
  variables TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_global BOOLEAN DEFAULT true,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Agent Teams
CREATE TABLE public.crm_agent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  channels TEXT[] DEFAULT '{}',
  max_concurrent_chats INTEGER DEFAULT 5,
  auto_assign_enabled BOOLEAN DEFAULT true,
  assignment_method TEXT DEFAULT 'round_robin' CHECK (assignment_method IN ('round_robin', 'least_busy', 'skills_based', 'random')),
  working_hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Agent Status
CREATE TABLE public.crm_agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  agent_name TEXT,
  team_id UUID REFERENCES public.crm_agent_teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  status_message TEXT,
  current_chat_count INTEGER DEFAULT 0,
  max_chats INTEGER DEFAULT 5,
  skills TEXT[] DEFAULT '{}',
  channels TEXT[] DEFAULT '{}',
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  session_started_at TIMESTAMPTZ,
  total_handled_today INTEGER DEFAULT 0,
  avg_response_time_today INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id)
);

-- 8. SLA Policies
CREATE TABLE public.crm_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  channel TEXT,
  first_response_time INTEGER NOT NULL,
  resolution_time INTEGER NOT NULL,
  escalation_after INTEGER,
  escalation_to UUID,
  business_hours_only BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Routing Rules
CREATE TABLE public.crm_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  assign_to_team_id UUID REFERENCES public.crm_agent_teams(id),
  assign_to_agent_id UUID,
  add_tags TEXT[] DEFAULT '{}',
  set_priority TEXT,
  trigger_bot BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Chatbot Flows
CREATE TABLE public.crm_chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'intent', 'event', 'schedule', 'fallback')),
  trigger_value TEXT,
  channels TEXT[] DEFAULT '{}',
  flow_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Conversation Tags
CREATE TABLE public.crm_conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  auto_apply_conditions JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Broadcast Campaigns
CREATE TABLE public.crm_broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  template_id UUID REFERENCES public.crm_omni_templates(id),
  segment_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  variables JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_omni_conv_status ON public.crm_omni_conversations(status);
CREATE INDEX idx_omni_conv_channel ON public.crm_omni_conversations(channel);
CREATE INDEX idx_omni_conv_assigned ON public.crm_omni_conversations(assigned_agent_id);
CREATE INDEX idx_omni_conv_last_msg ON public.crm_omni_conversations(last_message_at DESC);
CREATE INDEX idx_omni_msg_conv ON public.crm_omni_messages(conversation_id);
CREATE INDEX idx_omni_msg_created ON public.crm_omni_messages(created_at DESC);
CREATE INDEX idx_agent_status_agent ON public.crm_agent_status(agent_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_omni_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_omni_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_agent_status;

-- RLS
ALTER TABLE public.crm_omni_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_omni_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_omni_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_agent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "omni_conv_policy" ON public.crm_omni_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "omni_msg_policy" ON public.crm_omni_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "channel_cfg_policy" ON public.crm_channel_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "omni_tpl_policy" ON public.crm_omni_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quick_rep_policy" ON public.crm_quick_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "agent_teams_policy" ON public.crm_agent_teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "agent_status_pol" ON public.crm_agent_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sla_pol_policy" ON public.crm_sla_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "routing_rules_pol" ON public.crm_routing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chatbot_flows_pol" ON public.crm_chatbot_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "conv_tags_policy" ON public.crm_conversation_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "broadcast_camp_pol" ON public.crm_broadcast_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_crm_omni_conv_updated_at BEFORE UPDATE ON public.crm_omni_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_omni_tpl_updated_at BEFORE UPDATE ON public.crm_omni_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_channel_cfg_updated_at BEFORE UPDATE ON public.crm_channel_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_quick_rep_updated_at BEFORE UPDATE ON public.crm_quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_agent_teams_updated_at BEFORE UPDATE ON public.crm_agent_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_agent_status_updated_at BEFORE UPDATE ON public.crm_agent_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_sla_pol_updated_at BEFORE UPDATE ON public.crm_sla_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_routing_updated_at BEFORE UPDATE ON public.crm_routing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_chatbot_updated_at BEFORE UPDATE ON public.crm_chatbot_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_broadcast_updated_at BEFORE UPDATE ON public.crm_broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();