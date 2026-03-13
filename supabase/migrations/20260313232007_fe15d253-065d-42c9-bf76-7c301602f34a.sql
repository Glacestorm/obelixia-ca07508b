
-- V2-ES.4 Paso 6.1: Calendario laboral — festivos configurables
CREATE TABLE public.erp_hr_holiday_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'national'
    CHECK (scope IN ('national', 'regional', 'local', 'company')),
  country_code text NOT NULL DEFAULT 'ES',
  region_code text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  year smallint NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR FROM holiday_date)::smallint) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, holiday_date, scope, region_code)
);

-- Indexes
CREATE INDEX idx_erp_hr_holiday_calendar_year_active
  ON public.erp_hr_holiday_calendar (year, is_active)
  WHERE is_active = true;

CREATE INDEX idx_erp_hr_holiday_calendar_company
  ON public.erp_hr_holiday_calendar (company_id, year)
  WHERE is_active = true;

-- RLS
ALTER TABLE public.erp_hr_holiday_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read holidays"
  ON public.erp_hr_holiday_calendar FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage company holidays"
  ON public.erp_hr_holiday_calendar FOR ALL
  TO authenticated
  USING (
    company_id IS NULL
    OR company_id IN (SELECT id FROM public.companies)
  )
  WITH CHECK (
    company_id IS NULL
    OR company_id IN (SELECT id FROM public.companies)
  );
