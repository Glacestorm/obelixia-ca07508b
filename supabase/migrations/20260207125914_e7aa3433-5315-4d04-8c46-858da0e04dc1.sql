-- AI Copilot Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_copilot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  model_used TEXT,
  provider_type TEXT CHECK (provider_type IN ('local', 'external')),
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Copilot Messages Table
CREATE TABLE IF NOT EXISTS public.ai_copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_copilot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  provider_type TEXT,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_copilot_conversations_user_id ON public.ai_copilot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_conversations_updated_at ON public.ai_copilot_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_messages_conversation_id ON public.ai_copilot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_messages_created_at ON public.ai_copilot_messages(created_at);

-- Enable RLS
ALTER TABLE public.ai_copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Conversations
CREATE POLICY "Users can view their own conversations"
  ON public.ai_copilot_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.ai_copilot_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.ai_copilot_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.ai_copilot_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Messages (inherit from conversation ownership)
CREATE POLICY "Users can view messages from their conversations"
  ON public.ai_copilot_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_copilot_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their conversations"
  ON public.ai_copilot_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_copilot_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages from their conversations"
  ON public.ai_copilot_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_copilot_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_ai_copilot_conversations_updated_at
  BEFORE UPDATE ON public.ai_copilot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();