
-- Simulations table for managing tariff comparison sessions
CREATE TABLE public.energy_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.energy_cases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  simulation_type TEXT NOT NULL DEFAULT 'electricity',
  consumption_data JSONB DEFAULT '{}',
  power_data JSONB DEFAULT '{}',
  billing_days INTEGER DEFAULT 30,
  access_tariff TEXT DEFAULT '2.0TD',
  results JSONB DEFAULT '[]',
  best_tariff_id UUID REFERENCES public.energy_tariff_catalog(id) ON DELETE SET NULL,
  current_cost NUMERIC DEFAULT 0,
  best_cost NUMERIC DEFAULT 0,
  savings NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage simulations" ON public.energy_simulations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexed prices cache table for OMIE/PVPC data
CREATE TABLE public.energy_indexed_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  omie_price NUMERIC,
  peajes_price NUMERIC,
  pvpc_price NUMERIC,
  tariff_zone TEXT DEFAULT 'peninsula',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_date, hour, tariff_zone)
);

ALTER TABLE public.energy_indexed_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read indexed prices" ON public.energy_indexed_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage indexed prices" ON public.energy_indexed_prices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_energy_indexed_prices_date ON public.energy_indexed_prices(price_date);
CREATE INDEX idx_energy_simulations_company ON public.energy_simulations(company_id);
