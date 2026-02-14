
-- Tabla de socios potenciales para CRM LEADER
CREATE TABLE public.galia_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'gal' CHECK (type IN ('gal', 'organismo_publico', 'centro_tecnologico', 'universidad', 'empresa', 'asociacion', 'otro')),
  territory TEXT,
  scope TEXT DEFAULT 'nacional' CHECK (scope IN ('local', 'regional', 'nacional', 'transnacional')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'identificado' CHECK (status IN ('identificado', 'contactado', 'interesado', 'comprometido', 'descartado')),
  interest_declaration TEXT DEFAULT 'pendiente' CHECK (interest_declaration IN ('si', 'no', 'pendiente')),
  notes TEXT,
  website TEXT,
  evaluation_scores JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de interacciones con socios
CREATE TABLE public.galia_partner_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.galia_partners(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL DEFAULT 'nota' CHECK (interaction_type IN ('llamada', 'email', 'reunion', 'evento', 'nota', 'documento')),
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.galia_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_partner_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for galia_partners
CREATE POLICY "Authenticated users can view partners"
  ON public.galia_partners FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert partners"
  ON public.galia_partners FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update partners"
  ON public.galia_partners FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete partners"
  ON public.galia_partners FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- Policies for galia_partner_interactions
CREATE POLICY "Authenticated users can view interactions"
  ON public.galia_partner_interactions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interactions"
  ON public.galia_partner_interactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Authenticated users can update interactions"
  ON public.galia_partner_interactions FOR UPDATE
  TO authenticated USING (auth.uid() = performed_by);

-- Update trigger
CREATE TRIGGER update_galia_partners_updated_at
  BEFORE UPDATE ON public.galia_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
