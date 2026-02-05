-- =====================================================
-- FASE 2: ADVANCED WORKFLOW BUILDER - DATABASE SCHEMA
-- =====================================================

-- Workflow Definitions
CREATE TABLE public.crm_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('manual', 'event', 'schedule', 'condition', 'webhook')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  is_template BOOLEAN DEFAULT false,
  template_category VARCHAR(100),
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Nodes (Visual Builder)
CREATE TABLE public.crm_workflow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('trigger', 'action', 'condition', 'delay', 'split', 'merge', 'end')),
  node_subtype VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Connections (Node Links)
CREATE TABLE public.crm_workflow_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.crm_workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.crm_workflow_nodes(id) ON DELETE CASCADE,
  source_handle VARCHAR(50) DEFAULT 'default',
  target_handle VARCHAR(50) DEFAULT 'default',
  condition_label VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Executions
CREATE TABLE public.crm_workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused')),
  trigger_data JSONB DEFAULT '{}'::jsonb,
  context_data JSONB DEFAULT '{}'::jsonb,
  current_node_id UUID REFERENCES public.crm_workflow_nodes(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  executed_by UUID REFERENCES auth.users(id),
  entity_type VARCHAR(100),
  entity_id UUID
);

-- Workflow Execution Steps (Audit Trail)
CREATE TABLE public.crm_workflow_execution_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.crm_workflow_executions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.crm_workflow_nodes(id),
  step_order INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  duration_ms INTEGER
);

-- Workflow Triggers (Event Subscriptions)
CREATE TABLE public.crm_workflow_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(255),
  entity_type VARCHAR(100),
  conditions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Variables (Runtime Context)
CREATE TABLE public.crm_workflow_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  variable_type VARCHAR(50) NOT NULL CHECK (variable_type IN ('string', 'number', 'boolean', 'object', 'array', 'date')),
  default_value JSONB,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workflow_id, name)
);

-- Workflow Templates
CREATE TABLE public.crm_workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  workflow_data JSONB NOT NULL,
  use_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_crm_workflows_status ON public.crm_workflows(status);
CREATE INDEX idx_crm_workflows_trigger_type ON public.crm_workflows(trigger_type);
CREATE INDEX idx_crm_workflow_nodes_workflow ON public.crm_workflow_nodes(workflow_id);
CREATE INDEX idx_crm_workflow_connections_workflow ON public.crm_workflow_connections(workflow_id);
CREATE INDEX idx_crm_workflow_executions_workflow ON public.crm_workflow_executions(workflow_id);
CREATE INDEX idx_crm_workflow_executions_status ON public.crm_workflow_executions(status);
CREATE INDEX idx_crm_workflow_execution_steps_execution ON public.crm_workflow_execution_steps(execution_id);
CREATE INDEX idx_crm_workflow_triggers_workflow ON public.crm_workflow_triggers(workflow_id);
CREATE INDEX idx_crm_workflow_triggers_event ON public.crm_workflow_triggers(event_name);

-- Enable RLS
ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view workflows" ON public.crm_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflows" ON public.crm_workflows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage own workflows" ON public.crm_workflows FOR ALL TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can view workflow nodes" ON public.crm_workflow_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflow nodes" ON public.crm_workflow_nodes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view workflow connections" ON public.crm_workflow_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflow connections" ON public.crm_workflow_connections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view workflow executions" ON public.crm_workflow_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflow executions" ON public.crm_workflow_executions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own executions" ON public.crm_workflow_executions FOR SELECT TO authenticated USING (executed_by = auth.uid());

CREATE POLICY "Authenticated users can view execution steps" ON public.crm_workflow_execution_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage execution steps" ON public.crm_workflow_execution_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view workflow triggers" ON public.crm_workflow_triggers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflow triggers" ON public.crm_workflow_triggers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view workflow variables" ON public.crm_workflow_variables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflow variables" ON public.crm_workflow_variables FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view workflow templates" ON public.crm_workflow_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflow templates" ON public.crm_workflow_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_crm_workflows_updated_at BEFORE UPDATE ON public.crm_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_workflow_nodes_updated_at BEFORE UPDATE ON public.crm_workflow_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_workflow_templates_updated_at BEFORE UPDATE ON public.crm_workflow_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default workflow templates
INSERT INTO public.crm_workflow_templates (name, description, category, icon, workflow_data, is_system) VALUES
('Lead Nurturing', 'Secuencia automática de emails para nuevos leads', 'sales', 'mail', '{"nodes": [{"type": "trigger", "subtype": "lead_created"}, {"type": "delay", "config": {"days": 1}}, {"type": "action", "subtype": "send_email"}], "connections": []}', true),
('Deal Won Notification', 'Notifica al equipo cuando se cierra un deal', 'sales', 'trophy', '{"nodes": [{"type": "trigger", "subtype": "deal_won"}, {"type": "action", "subtype": "send_notification"}], "connections": []}', true),
('Inactive Lead Follow-up', 'Reactivación de leads inactivos', 'marketing', 'user-x', '{"nodes": [{"type": "trigger", "subtype": "schedule"}, {"type": "condition", "config": {"field": "last_activity", "operator": "older_than", "value": 30}}, {"type": "action", "subtype": "send_email"}], "connections": []}', true),
('Task Reminder', 'Recordatorio de tareas pendientes', 'productivity', 'bell', '{"nodes": [{"type": "trigger", "subtype": "schedule"}, {"type": "action", "subtype": "send_notification"}], "connections": []}', true),
('Welcome Sequence', 'Secuencia de bienvenida para nuevos contactos', 'onboarding', 'hand-wave', '{"nodes": [{"type": "trigger", "subtype": "contact_created"}, {"type": "action", "subtype": "send_email"}, {"type": "delay", "config": {"days": 3}}, {"type": "action", "subtype": "send_email"}], "connections": []}', true);