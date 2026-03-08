
-- 1. Create energy_customers table
CREATE TABLE public.energy_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  contact_person TEXT,
  customer_type TEXT DEFAULT 'residential',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add FK from energy_cases to energy_customers
ALTER TABLE public.energy_cases
  ADD CONSTRAINT energy_cases_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.energy_customers(id)
  ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.energy_customers ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Users can view energy_customers"
  ON public.energy_customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert energy_customers"
  ON public.energy_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update energy_customers"
  ON public.energy_customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete energy_customers"
  ON public.energy_customers
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. Index
CREATE INDEX idx_energy_customers_company_id ON public.energy_customers(company_id);
CREATE INDEX idx_energy_customers_tax_id ON public.energy_customers(tax_id);
