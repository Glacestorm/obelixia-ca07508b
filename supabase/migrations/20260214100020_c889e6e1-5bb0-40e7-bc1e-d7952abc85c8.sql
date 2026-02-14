
-- Tabla de contratación pública (LCSP)
CREATE TABLE public.galia_procurement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'menor',
  budget_base NUMERIC(12,2) DEFAULT 0,
  contractor TEXT,
  status TEXT NOT NULL DEFAULT 'preparacion',
  start_date DATE,
  end_date DATE,
  description TEXT,
  deliverables JSONB DEFAULT '[]'::jsonb,
  documents_checklist JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.galia_procurement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view procurement" ON public.galia_procurement FOR SELECT USING (true);
CREATE POLICY "Auth users can insert procurement" ON public.galia_procurement FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update procurement" ON public.galia_procurement FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete procurement" ON public.galia_procurement FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_galia_procurement_updated_at
  BEFORE UPDATE ON public.galia_procurement
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
