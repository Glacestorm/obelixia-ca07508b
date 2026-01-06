-- =============================================
-- FASE 3: Sistema de Ayuda de Agentes - Base de Conocimiento
-- =============================================

-- Tabla para almacenar el conocimiento base de cada agente
CREATE TABLE IF NOT EXISTS public.agent_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  category TEXT NOT NULL, -- 'overview', 'capability', 'use_case', 'best_practice', 'example', 'tip', 'warning'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  section_index INTEGER DEFAULT 0,
  
  -- Para ejemplos
  example_input TEXT,
  example_output TEXT,
  example_context JSONB,
  
  -- Metadatos
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  
  -- Aprendizaje
  source TEXT DEFAULT 'manual', -- 'manual', 'user_feedback', 'interaction', 'ai_generated'
  confidence_score NUMERIC(3,2) DEFAULT 1.0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Verificación
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Para conocimiento jerárquico
  parent_knowledge_id UUID REFERENCES public.agent_knowledge_base(id),
  module_type TEXT, -- Para agentes de módulo específico
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabla para conversaciones de ayuda
CREATE TABLE IF NOT EXISTS public.agent_help_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  user_id UUID,
  
  -- Mensaje
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  
  -- Modalidad
  input_mode TEXT DEFAULT 'text', -- 'text', 'voice'
  output_mode TEXT DEFAULT 'text', -- 'text', 'voice'
  audio_url TEXT,
  audio_duration_ms INTEGER,
  
  -- Contexto
  context JSONB,
  attachments JSONB,
  
  -- Métricas
  response_time_ms INTEGER,
  tokens_used INTEGER,
  
  -- Feedback
  was_helpful BOOLEAN,
  feedback_score INTEGER, -- 1-5
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para feedback y aprendizaje
CREATE TABLE IF NOT EXISTS public.agent_help_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id UUID REFERENCES public.agent_help_conversations(id),
  agent_id TEXT NOT NULL,
  user_id UUID,
  
  -- Feedback
  was_helpful BOOLEAN,
  rating INTEGER, -- 1-5
  feedback_type TEXT, -- 'helpful', 'not_helpful', 'incorrect', 'suggestion'
  feedback_text TEXT,
  
  -- Si generó nuevo conocimiento
  created_knowledge_id UUID REFERENCES public.agent_knowledge_base(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON public.agent_knowledge_base(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_type ON public.agent_knowledge_base(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_category ON public.agent_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_tags ON public.agent_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_keywords ON public.agent_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_active ON public.agent_knowledge_base(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_agent_conversations_conversation_id ON public.agent_help_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_id ON public.agent_help_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON public.agent_help_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON public.agent_help_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_agent_id ON public.agent_help_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_conversation_id ON public.agent_help_feedback(conversation_id);

-- RLS
ALTER TABLE public.agent_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_help_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_help_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas: Conocimiento es público de lectura, escritura requiere autenticación
CREATE POLICY "Knowledge base is readable by all" 
ON public.agent_knowledge_base FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can insert knowledge" 
ON public.agent_knowledge_base FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own knowledge" 
ON public.agent_knowledge_base FOR UPDATE 
TO authenticated
USING (created_by = auth.uid() OR created_by IS NULL);

-- Políticas para conversaciones
CREATE POLICY "Users can view their own conversations" 
ON public.agent_help_conversations FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can insert conversations" 
ON public.agent_help_conversations FOR INSERT 
WITH CHECK (true);

-- Políticas para feedback
CREATE POLICY "Users can view their own feedback" 
ON public.agent_help_feedback FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can insert feedback" 
ON public.agent_help_feedback FOR INSERT 
WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_agent_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_knowledge_updated_at
BEFORE UPDATE ON public.agent_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_knowledge_updated_at();

-- Habilitar realtime para conversaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_help_conversations;