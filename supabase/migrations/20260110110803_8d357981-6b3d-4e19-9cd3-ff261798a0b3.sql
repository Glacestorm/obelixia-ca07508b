-- Crear tabla pipeline_stages para etapas personalizables
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  order_position INTEGER NOT NULL DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  probability_mode TEXT NOT NULL DEFAULT 'auto' CHECK (probability_mode IN ('auto', 'manual')),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'Circle',
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  terminal_type TEXT CHECK (terminal_type IN ('won', 'lost', NULL)),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - lectura para todos los autenticados
CREATE POLICY "Users can view pipeline stages" 
ON public.pipeline_stages 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Políticas RLS - solo admins pueden modificar
CREATE POLICY "Admins can manage pipeline stages" 
ON public.pipeline_stages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('superadmin', 'admin')
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar etapas por defecto basadas en las existentes
INSERT INTO public.pipeline_stages (name, slug, order_position, probability, color, icon, is_terminal, terminal_type, is_default) VALUES
('Descubrimiento', 'discovery', 0, 10, '#6366f1', 'Search', false, NULL, true),
('Propuesta', 'proposal', 1, 30, '#8b5cf6', 'FileText', false, NULL, false),
('Negociación', 'negotiation', 2, 60, '#f59e0b', 'MessageSquare', false, NULL, false),
('Ganada', 'won', 3, 100, '#22c55e', 'Trophy', true, 'won', false),
('Perdida', 'lost', 4, 0, '#ef4444', 'XCircle', true, 'lost', false);

-- Añadir columnas a opportunities
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.pipeline_stages(id),
ADD COLUMN IF NOT EXISTS probability_override INTEGER CHECK (probability_override IS NULL OR (probability_override >= 0 AND probability_override <= 100));

-- Migrar datos existentes: mapear stage TEXT a stage_id UUID
UPDATE public.opportunities o
SET stage_id = ps.id
FROM public.pipeline_stages ps
WHERE o.stage = ps.slug AND o.stage_id IS NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON public.pipeline_stages(order_position);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_active ON public.pipeline_stages(is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage_id ON public.opportunities(stage_id);

-- Habilitar realtime para actualizaciones en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;