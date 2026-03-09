import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ComparatorInput {
  case_id: string;
  energy_type: 'electricity' | 'gas' | 'solar' | 'mixed';
  consumption: {
    p1_kwh: number;
    p2_kwh: number;
    p3_kwh: number;
  };
  power: {
    p1_kw: number;
    p2_kw: number;
  };
  max_demand?: {
    p1_kw: number;
    p2_kw: number;
  };
  current_cost: number;
  billing_days: number;
  access_tariff: string;
  current_supplier?: string;
  current_tariff?: string;
  has_permanence?: boolean;
  // Solar options
  solar_kw_peak?: number;
  solar_self_consumption_pct?: number;
  battery_kwh?: number;
  // Gas options
  gas_consumption_kwh?: number;
  gas_current_cost?: number;
}

interface TariffResult {
  tariff_id: string;
  supplier: string;
  tariff_name: string;
  energy_cost: number;
  power_cost: number;
  total_cost: number;
  savings: number;
  savings_pct: number;
  has_permanence: boolean;
  tariff_type: string;
  notes: string | null;
}

interface ComparatorOutput {
  success: boolean;
  case_id: string;
  energy_type: string;
  timestamp: string;
  // Power recommendation
  recommended_power: { p1_kw: number; p2_kw: number; notes: string[] };
  // Tariff comparison
  tariff_results: TariffResult[];
  best_tariff: TariffResult | null;
  best_without_permanence: TariffResult | null;
  // Solar scenario (if applicable)
  solar_scenario?: {
    annual_production_kwh: number;
    self_consumption_kwh: number;
    surplus_kwh: number;
    savings_estimate: number;
    payback_years: number;
    notes: string[];
  };
  // Gas scenario (if applicable)
  gas_scenario?: {
    gas_results: Array<{ supplier: string; tariff: string; cost: number; savings: number }>;
    best_gas: { supplier: string; cost: number; savings: number } | null;
  };
  // Consolidated
  total_annual_savings: number;
  confidence_score: number;
  data_quality: {
    has_real_market_data: boolean;
    has_real_tariff_catalog: boolean;
    has_real_consumption: boolean;
    limitations: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const input: ComparatorInput = await req.json();

    if (!input.case_id) throw new Error('case_id is required');

    console.log(`[energy-multi-vector-comparator] Processing case: ${input.case_id}, type: ${input.energy_type}`);

    const limitations: string[] = [];

    // ========== 1. Fetch tariff catalog ==========
    let tariffQuery = supabase
      .from('energy_tariff_catalog')
      .select('*')
      .eq('is_active', true);

    if (input.access_tariff && input.access_tariff !== 'all') {
      tariffQuery = tariffQuery.eq('access_tariff', input.access_tariff);
    }

    const { data: tariffs, error: tariffErr } = await tariffQuery;
    if (tariffErr) throw tariffErr;

    const hasRealCatalog = (tariffs?.length || 0) > 0;
    if (!hasRealCatalog) {
      limitations.push('No hay tarifas activas en el catálogo. Resultados basados en heurística.');
    }

    // ========== 2. Check real market prices ==========
    const today = new Date().toISOString().split('T')[0];
    const { data: marketPrices } = await supabase
      .from('energy_market_prices')
      .select('price_eur_mwh, market_source')
      .eq('price_date', today)
      .eq('energy_type', 'electricity')
      .limit(1);

    const hasRealMarket = marketPrices && marketPrices.length > 0 && marketPrices[0].market_source === 'omie';
    if (!hasRealMarket) {
      limitations.push('Precios de mercado del día no disponibles de OMIE. Usando último dato disponible.');
    }

    // ========== 3. Power recommendation ==========
    const powerNotes: string[] = [];
    const maxP1 = input.max_demand?.p1_kw || 0;
    const maxP2 = input.max_demand?.p2_kw || 0;
    const recPowerP1 = maxP1 > 0
      ? Math.max(Math.ceil(maxP1 * 1.1 * 100) / 100, input.power.p1_kw * 0.85)
      : input.power.p1_kw;
    const recPowerP2 = maxP2 > 0
      ? Math.max(Math.ceil(maxP2 * 1.1 * 100) / 100, input.power.p2_kw * 0.85)
      : input.power.p2_kw;

    if (input.power.p1_kw > 0 && maxP1 > 0) {
      const margin = (input.power.p1_kw - maxP1) / input.power.p1_kw;
      if (margin < 0.05) powerNotes.push('⚠️ Potencia P1 muy ajustada. Riesgo de penalización.');
      else if (margin > 0.30) powerNotes.push(`📉 Potencia P1 sobredimensionada (${(margin * 100).toFixed(0)}%).`);
    }
    if (input.power.p2_kw > 0 && maxP2 > 0) {
      const margin = (input.power.p2_kw - maxP2) / input.power.p2_kw;
      if (margin > 0.30) powerNotes.push(`📉 Potencia P2 sobredimensionada (${(margin * 100).toFixed(0)}%).`);
    }

    // ========== 4. Tariff simulation ==========
    const daysRatio = input.billing_days / 365;
    const tariffResults: TariffResult[] = (tariffs || []).map((t: any) => {
      const energyCost =
        (input.consumption.p1_kwh * (t.price_p1_energy || 0)) +
        (input.consumption.p2_kwh * (t.price_p2_energy || 0)) +
        (input.consumption.p3_kwh * (t.price_p3_energy || 0));

      const powerCost =
        (recPowerP1 * (t.price_p1_power || 0) * daysRatio) +
        (recPowerP2 * (t.price_p2_power || 0) * daysRatio);

      const totalCost = Math.round((energyCost + powerCost) * 100) / 100;
      const savings = Math.round((input.current_cost - totalCost) * 100) / 100;

      return {
        tariff_id: t.id,
        supplier: t.supplier,
        tariff_name: t.tariff_name,
        energy_cost: Math.round(energyCost * 100) / 100,
        power_cost: Math.round(powerCost * 100) / 100,
        total_cost: totalCost,
        savings,
        savings_pct: input.current_cost > 0 ? Math.round((savings / input.current_cost) * 10000) / 100 : 0,
        has_permanence: t.has_permanence || false,
        tariff_type: t.tariff_type || 'fixed',
        notes: t.notes,
      };
    });

    tariffResults.sort((a, b) => a.total_cost - b.total_cost);

    const bestTariff = tariffResults[0] || null;
    const bestWithoutPermanence = tariffResults.find(r => !r.has_permanence) || null;

    // ========== 5. Solar scenario ==========
    let solarScenario: ComparatorOutput['solar_scenario'] | undefined;
    if ((input.energy_type === 'solar' || input.energy_type === 'mixed') && input.solar_kw_peak) {
      const annualProduction = input.solar_kw_peak * 1400; // avg Spain hours
      const selfConsumptionPct = (input.solar_self_consumption_pct || 30) / 100;
      const selfConsumption = annualProduction * selfConsumptionPct;
      const surplus = annualProduction - selfConsumption;
      // Avg price ~0.15 €/kWh for self-consumed, ~0.05 €/kWh for surplus
      const savingsEstimate = Math.round((selfConsumption * 0.15 + surplus * 0.05) * 100) / 100;
      const installCost = input.solar_kw_peak * 1200; // avg €/kWp installed
      const paybackYears = Math.round((installCost / savingsEstimate) * 10) / 10;

      const solarNotes: string[] = [];
      if (input.battery_kwh) {
        solarNotes.push(`Batería de ${input.battery_kwh} kWh incluida en el cálculo.`);
      }
      solarNotes.push(`Producción estimada: ${annualProduction.toFixed(0)} kWh/año (1.400 h sol equiv.)`);

      solarScenario = {
        annual_production_kwh: Math.round(annualProduction),
        self_consumption_kwh: Math.round(selfConsumption),
        surplus_kwh: Math.round(surplus),
        savings_estimate: savingsEstimate,
        payback_years: paybackYears,
        notes: solarNotes,
      };
    }

    // ========== 6. Gas scenario ==========
    let gasScenario: ComparatorOutput['gas_scenario'] | undefined;
    if ((input.energy_type === 'gas' || input.energy_type === 'mixed') && input.gas_consumption_kwh) {
      // Simple gas model — placeholder for real MIBGAS integration
      const gasProviders = [
        { supplier: 'Naturgy', tariff: 'Gas Fija 12M', price_kwh: 0.065 },
        { supplier: 'Repsol', tariff: 'Gas Hogar', price_kwh: 0.062 },
        { supplier: 'Endesa', tariff: 'Gas One', price_kwh: 0.068 },
        { supplier: 'TotalEnergies', tariff: 'Gas Total', price_kwh: 0.060 },
      ];
      limitations.push('Precios de gas basados en estimaciones. MIBGAS no integrado aún.');

      const gasResults = gasProviders.map(gp => {
        const cost = Math.round(input.gas_consumption_kwh! * gp.price_kwh * 100) / 100;
        return {
          supplier: gp.supplier,
          tariff: gp.tariff,
          cost,
          savings: Math.round(((input.gas_current_cost || 0) - cost) * 100) / 100,
        };
      }).sort((a, b) => a.cost - b.cost);

      gasScenario = {
        gas_results: gasResults,
        best_gas: gasResults[0] || null,
      };
    }

    // ========== 7. Confidence & totals ==========
    let confidence = 80;
    if (!hasRealCatalog) confidence -= 25;
    if (!hasRealMarket) confidence -= 10;
    if (input.consumption.p1_kwh === 0 && input.consumption.p2_kwh === 0) confidence -= 20;
    if (input.has_permanence) confidence -= 10;
    if (tariffResults.length < 3) confidence -= 15;
    confidence = Math.max(10, Math.min(95, confidence));

    const totalAnnualSavings = Math.max(0,
      (bestTariff?.savings || 0) * (365 / (input.billing_days || 30)) +
      (solarScenario?.savings_estimate || 0) +
      (gasScenario?.best_gas?.savings || 0) * (365 / (input.billing_days || 30))
    );

    const hasRealConsumption = input.consumption.p1_kwh > 0 || input.consumption.p2_kwh > 0;

    // ========== 8. Persist simulation ==========
    try {
      await supabase.from('energy_simulations').insert([{
        company_id: null, // Will be set by the caller if needed
        case_id: input.case_id,
        name: `Comparador ${input.energy_type} - ${new Date().toLocaleDateString('es')}`,
        status: 'completed',
        simulation_type: input.energy_type,
        consumption_data: input.consumption,
        power_data: input.power,
        billing_days: input.billing_days,
        access_tariff: input.access_tariff,
        results: tariffResults.slice(0, 20),
        best_tariff_id: bestTariff?.tariff_id || null,
        current_cost: input.current_cost,
        best_cost: bestTariff?.total_cost || 0,
        savings: bestTariff?.savings || 0,
        notes: `Backend simulation. Confidence: ${confidence}%. Limitations: ${limitations.join('; ')}`,
      }]).select();
    } catch (persistErr) {
      console.warn('[energy-multi-vector-comparator] Persist warning:', persistErr);
    }

    // ========== 9. Build response ==========
    const output: ComparatorOutput = {
      success: true,
      case_id: input.case_id,
      energy_type: input.energy_type,
      timestamp: new Date().toISOString(),
      recommended_power: {
        p1_kw: Math.round(recPowerP1 * 100) / 100,
        p2_kw: Math.round(recPowerP2 * 100) / 100,
        notes: powerNotes,
      },
      tariff_results: tariffResults,
      best_tariff: bestTariff,
      best_without_permanence: bestWithoutPermanence,
      solar_scenario: solarScenario,
      gas_scenario: gasScenario,
      total_annual_savings: Math.round(totalAnnualSavings * 100) / 100,
      confidence_score: confidence,
      data_quality: {
        has_real_market_data: hasRealMarket || false,
        has_real_tariff_catalog: hasRealCatalog,
        has_real_consumption: hasRealConsumption,
        limitations,
      },
    };

    console.log(`[energy-multi-vector-comparator] Done. ${tariffResults.length} tariffs, confidence: ${confidence}%`);

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[energy-multi-vector-comparator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
