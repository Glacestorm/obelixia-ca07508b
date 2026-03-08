
-- =============================================
-- ENERGY 360 EXPANSION: Gas, Solar, Unified Model
-- =============================================

-- 1. Add energy_type to existing tables
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS energy_type text NOT NULL DEFAULT 'electricity';
ALTER TABLE public.energy_contracts ADD COLUMN IF NOT EXISTS energy_type text NOT NULL DEFAULT 'electricity';
ALTER TABLE public.energy_invoices ADD COLUMN IF NOT EXISTS energy_type text NOT NULL DEFAULT 'electricity';
ALTER TABLE public.energy_supplies ADD COLUMN IF NOT EXISTS energy_type text NOT NULL DEFAULT 'electricity';

-- Add gas-specific fields to invoices
ALTER TABLE public.energy_invoices ADD COLUMN IF NOT EXISTS gas_fixed_cost numeric DEFAULT NULL;
ALTER TABLE public.energy_invoices ADD COLUMN IF NOT EXISTS gas_variable_cost numeric DEFAULT NULL;
ALTER TABLE public.energy_invoices ADD COLUMN IF NOT EXISTS gas_consumption_kwh numeric DEFAULT NULL;

-- Add gas-specific fields to contracts
ALTER TABLE public.energy_contracts ADD COLUMN IF NOT EXISTS gas_tariff text DEFAULT NULL;
ALTER TABLE public.energy_contracts ADD COLUMN IF NOT EXISTS gas_annual_consumption_kwh numeric DEFAULT NULL;
ALTER TABLE public.energy_contracts ADD COLUMN IF NOT EXISTS distributor text DEFAULT NULL;

-- Add gas fields to supplies
ALTER TABLE public.energy_supplies ADD COLUMN IF NOT EXISTS gas_pressure text DEFAULT NULL;
ALTER TABLE public.energy_supplies ADD COLUMN IF NOT EXISTS gas_annual_consumption_kwh numeric DEFAULT NULL;

-- Add solar/savings fields to cases
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS estimated_gas_savings numeric DEFAULT NULL;
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS estimated_solar_savings numeric DEFAULT NULL;
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS validated_annual_savings numeric DEFAULT NULL;
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS validated_gas_savings numeric DEFAULT NULL;
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS validated_solar_savings numeric DEFAULT NULL;
ALTER TABLE public.energy_cases ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medium';

-- 2. Solar installations table
CREATE TABLE IF NOT EXISTS public.energy_solar_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  supply_id uuid REFERENCES public.energy_supplies(id),
  installed_power_kwp numeric NOT NULL DEFAULT 0,
  installation_date date,
  modality text DEFAULT 'with_surplus',
  has_battery boolean DEFAULT false,
  battery_capacity_kwh numeric,
  inverter_brand text,
  inverter_power_kw numeric,
  installer_company text,
  financing_type text DEFAULT 'purchase',
  monthly_estimated_savings numeric DEFAULT 0,
  monthly_real_savings numeric DEFAULT 0,
  annual_self_consumption_kwh numeric DEFAULT 0,
  annual_surplus_kwh numeric DEFAULT 0,
  annual_compensation_eur numeric DEFAULT 0,
  grid_dependency_pct numeric DEFAULT 100,
  maintenance_contract boolean DEFAULT false,
  maintenance_cost_annual numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_solar_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage solar installations via company"
  ON public.energy_solar_installations
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
    )
  );

-- 3. Energy market prices (enhanced for gas too)
CREATE TABLE IF NOT EXISTS public.energy_market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_date date NOT NULL,
  hour smallint NOT NULL DEFAULT 0,
  energy_type text NOT NULL DEFAULT 'electricity',
  market_source text NOT NULL DEFAULT 'omie',
  price_eur_mwh numeric,
  price_eur_kwh numeric,
  zone text DEFAULT 'peninsula',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(price_date, hour, energy_type, market_source, zone)
);

ALTER TABLE public.energy_market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market prices readable by authenticated"
  ON public.energy_market_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Market prices insertable by authenticated"
  ON public.energy_market_prices
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Energy recommendations enhanced
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS energy_type text DEFAULT 'electricity';
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS savings_energy_eur numeric DEFAULT NULL;
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS savings_power_eur numeric DEFAULT NULL;
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS savings_gas_eur numeric DEFAULT NULL;
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS savings_solar_eur numeric DEFAULT NULL;
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS savings_surplus_eur numeric DEFAULT NULL;
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS confidence_level text DEFAULT 'medium';
ALTER TABLE public.energy_recommendations ADD COLUMN IF NOT EXISTS missing_data text[] DEFAULT '{}';

-- 5. Energy reports enhanced
ALTER TABLE public.energy_reports ADD COLUMN IF NOT EXISTS energy_type text DEFAULT 'global';
ALTER TABLE public.energy_reports ADD COLUMN IF NOT EXISTS report_subtype text DEFAULT 'standard';

-- 6. Proposals enhanced  
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS energy_type text DEFAULT 'global';
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS gas_savings numeric DEFAULT NULL;
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS solar_savings numeric DEFAULT NULL;

-- 7. Smart actions enhanced
ALTER TABLE public.energy_smart_actions ADD COLUMN IF NOT EXISTS energy_type text DEFAULT 'electricity';

-- 8. Alerts / notifications enhanced
ALTER TABLE public.energy_notifications ADD COLUMN IF NOT EXISTS energy_type text DEFAULT 'electricity';
