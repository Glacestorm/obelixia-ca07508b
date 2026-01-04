-- Tabla para almacenar conocimientos aprendidos por agentes
CREATE TABLE IF NOT EXISTS public.agent_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  module_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  confidence_score NUMERIC(5,2) DEFAULT 85,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  example_input TEXT,
  example_output TEXT,
  example_context JSONB,
  section_index INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  parent_knowledge_id UUID,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabla para historial de interacciones con chatbot del agente
CREATE TABLE IF NOT EXISTS public.agent_help_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  user_id UUID,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  input_mode TEXT DEFAULT 'text',
  output_mode TEXT DEFAULT 'text',
  audio_url TEXT,
  audio_duration_ms INTEGER,
  context JSONB,
  attachments JSONB,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  was_helpful BOOLEAN,
  feedback_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para feedback
CREATE TABLE IF NOT EXISTS public.agent_help_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id UUID,
  agent_id TEXT NOT NULL,
  user_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  was_helpful BOOLEAN,
  feedback_type TEXT,
  feedback_text TEXT,
  created_knowledge_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices (solo crear si no existen)
CREATE INDEX IF NOT EXISTS idx_agent_kb_agent ON public.agent_knowledge_base(agent_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_kb_category ON public.agent_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_agent_kb_tags ON public.agent_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_agent_kb_active ON public.agent_knowledge_base(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_conv_agent ON public.agent_help_conversations(agent_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_conv_session ON public.agent_help_conversations(conversation_id);

-- Enable RLS
ALTER TABLE public.agent_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_help_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_help_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "agent_kb_read" ON public.agent_knowledge_base;
DROP POLICY IF EXISTS "agent_kb_admin" ON public.agent_knowledge_base;
DROP POLICY IF EXISTS "agent_conv_access" ON public.agent_help_conversations;
DROP POLICY IF EXISTS "agent_fb_access" ON public.agent_help_feedback;

CREATE POLICY "agent_kb_read" ON public.agent_knowledge_base FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "agent_kb_admin" ON public.agent_knowledge_base FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role IN ('admin', 'super_admin', 'owner')));
CREATE POLICY "agent_conv_access" ON public.agent_help_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "agent_fb_access" ON public.agent_help_feedback FOR ALL TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Insertar conocimientos base
INSERT INTO public.agent_knowledge_base (agent_id, agent_type, title, description, category, content, section_index, order_index, tags) VALUES
('supervisor', 'supervisor', '¿Qué es el Supervisor General?', 'Visión general del coordinador de agentes', 'capability', 'El Supervisor General es el orquestador central que coordina todos los agentes del sistema ERP y CRM. Actúa como un "director de orquesta" que optimiza la colaboración entre agentes, resuelve conflictos, distribuye tareas y garantiza que todo el ecosistema funcione de manera armónica y eficiente.', 0, 0, ARRAY['supervisor', 'orquestador', 'coordinación']),
('supervisor', 'supervisor', 'Capacidades Principales', 'Lista de capacidades', 'capability', '• **Coordinación Multi-agente**: Sincroniza y orquesta todos los agentes activos\n• **Resolución de Conflictos**: Detecta y resuelve conflictos entre agentes\n• **Distribución Inteligente**: Asigna tareas al agente más adecuado\n• **Optimización de Recursos**: Balancea carga y prioridades\n• **Aprendizaje Cruzado**: Comparte conocimientos entre agentes\n• **Predicción Proactiva**: Anticipa problemas y oportunidades', 0, 1, ARRAY['capacidades', 'funciones']),
('supervisor', 'supervisor', 'Ejemplo: Coordinar Cierre Mensual', 'Ejemplo práctico', 'example', '**Escenario**: Cierre contable mensual\n**Instrucción**: "Coordina el cierre mensual"\n**Acciones**:\n1. Activa Agente Contabilidad\n2. Notifica Agente Tesorería\n3. Sincroniza Agente Facturación\n4. Alerta Agente Compliance', 1, 0, ARRAY['ejemplo', 'cierre']),
('leads', 'crm', '¿Qué hace el Agente de Leads?', 'Descripción', 'capability', 'El Agente de Leads es un especialista en la gestión inteligente de prospectos. Utiliza IA avanzada para cualificar leads, predecir probabilidades de conversión, y automatizar el seguimiento óptimo.', 0, 0, ARRAY['leads', 'prospectos']),
('accounting', 'erp', '¿Qué hace el Agente de Contabilidad?', 'Descripción', 'capability', 'El Agente de Contabilidad automatiza las tareas contables rutinarias, valida asientos, detecta anomalías y asegura el cumplimiento normativo.', 0, 0, ARRAY['contabilidad', 'asientos']);