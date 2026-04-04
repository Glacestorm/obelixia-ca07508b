
-- Employee bank accounts (HR bounded context)
CREATE TABLE public.hr_employee_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  company_id UUID NOT NULL,
  iban TEXT NOT NULL,
  swift_bic TEXT,
  bank_name TEXT,
  account_alias TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_employee_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bank accounts"
  ON public.hr_employee_bank_accounts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert bank accounts"
  ON public.hr_employee_bank_accounts FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update bank accounts"
  ON public.hr_employee_bank_accounts FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete bank accounts"
  ON public.hr_employee_bank_accounts FOR DELETE
  TO authenticated USING (true);

CREATE INDEX idx_hr_bank_accounts_employee ON public.hr_employee_bank_accounts(employee_id);
CREATE INDEX idx_hr_bank_accounts_company ON public.hr_employee_bank_accounts(company_id);
CREATE UNIQUE INDEX idx_hr_bank_accounts_primary ON public.hr_employee_bank_accounts(employee_id) WHERE is_primary = true;

CREATE TRIGGER update_hr_bank_accounts_updated_at
  BEFORE UPDATE ON public.hr_employee_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
