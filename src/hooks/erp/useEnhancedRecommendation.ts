// Enhanced recommendation engine that queries real tariff catalog

import { EnergyTariff } from './useEnergyTariffCatalog';

export interface EnhancedRecommendationInput {
  consumptionP1: number;
  consumptionP2: number;
  consumptionP3: number;
  contractedPowerP1: number;
  contractedPowerP2: number;
  maxDemandP1: number;
  maxDemandP2: number;
  currentSupplier: string;
  currentTariff: string;
  hasPermanence: boolean;
  billingDays: number;
  currentTotalCost: number;
  tariffCatalog: EnergyTariff[];
}

export interface EnhancedRecommendationOutput {
  recommended_supplier: string;
  recommended_tariff: string;
  recommended_power_p1: number;
  recommended_power_p2: number;
  monthly_savings_estimate: number;
  annual_savings_estimate: number;
  risk_level: string;
  confidence_score: number;
  implementation_notes: string;
  best_tariff_id: string | null;
  simulation_results: TariffSimResult[];
}

export interface TariffSimResult {
  tariff_id: string;
  supplier: string;
  tariff_name: string;
  energy_cost: number;
  power_cost: number;
  total_cost: number;
  savings: number;
  has_permanence: boolean;
}

export function generateEnhancedRecommendation(input: EnhancedRecommendationInput): EnhancedRecommendationOutput {
  const {
    consumptionP1, consumptionP2, consumptionP3,
    contractedPowerP1, contractedPowerP2,
    maxDemandP1, maxDemandP2,
    currentSupplier, currentTariff,
    hasPermanence, billingDays, currentTotalCost,
    tariffCatalog,
  } = input;

  const totalConsumption = consumptionP1 + consumptionP2 + consumptionP3;
  const notes: string[] = [];

  // 1. Power recommendation
  const recPowerP1 = maxDemandP1 > 0
    ? Math.max(Math.ceil(maxDemandP1 * 1.1 * 100) / 100, contractedPowerP1 * 0.85)
    : contractedPowerP1;
  const recPowerP2 = maxDemandP2 > 0
    ? Math.max(Math.ceil(maxDemandP2 * 1.1 * 100) / 100, contractedPowerP2 * 0.85)
    : contractedPowerP2;

  // Power margin checks
  if (contractedPowerP1 > 0) {
    const margin = (contractedPowerP1 - maxDemandP1) / contractedPowerP1;
    if (margin < 0.05 && maxDemandP1 > 0) {
      notes.push('⚠️ Potencia P1 muy ajustada. Riesgo de penalización por excesos.');
    } else if (margin > 0.30) {
      notes.push(`📉 Potencia P1 sobredimensionada (margen ${(margin * 100).toFixed(0)}%). Ajuste a la baja recomendado.`);
    }
  }
  if (contractedPowerP2 > 0) {
    const margin = (contractedPowerP2 - maxDemandP2) / contractedPowerP2;
    if (margin > 0.30) {
      notes.push(`📉 Potencia P2 sobredimensionada (margen ${(margin * 100).toFixed(0)}%). Ajuste a la baja recomendado.`);
    }
  }

  // 2. Simulate all active tariffs
  const daysRatio = billingDays > 0 ? billingDays / 365 : 30 / 365;
  const activeTariffs = tariffCatalog.filter(t => t.is_active);

  const simResults: TariffSimResult[] = activeTariffs.map(t => {
    const energyCost =
      (consumptionP1 * (t.price_p1_energy || 0)) +
      (consumptionP2 * (t.price_p2_energy || 0)) +
      (consumptionP3 * (t.price_p3_energy || 0));

    const powerCost =
      (recPowerP1 * (t.price_p1_power || 0) * daysRatio) +
      (recPowerP2 * (t.price_p2_power || 0) * daysRatio);

    const totalCost = Math.round((energyCost + powerCost) * 100) / 100;

    return {
      tariff_id: t.id,
      supplier: t.supplier,
      tariff_name: t.tariff_name,
      energy_cost: Math.round(energyCost * 100) / 100,
      power_cost: Math.round(powerCost * 100) / 100,
      total_cost: totalCost,
      savings: Math.round((currentTotalCost - totalCost) * 100) / 100,
      has_permanence: t.has_permanence || false,
    };
  });

  simResults.sort((a, b) => a.total_cost - b.total_cost);

  // 3. Best tariff
  const best = simResults[0];
  const bestWithoutPermanence = simResults.find(r => !r.has_permanence);

  // Choose best: prefer without permanence if savings difference < 10%
  let chosen = best;
  if (best?.has_permanence && bestWithoutPermanence) {
    const diff = (bestWithoutPermanence.total_cost - best.total_cost) / best.total_cost;
    if (diff < 0.1) {
      chosen = bestWithoutPermanence;
      notes.push(`✅ Se recomienda tarifa sin permanencia (${chosen.supplier} - ${chosen.tariff_name}) con diferencia < 10% respecto a la mejor.`);
    } else {
      notes.push(`⚠️ La mejor tarifa (${best.supplier} - ${best.tariff_name}) requiere permanencia.`);
    }
  }

  if (hasPermanence) {
    notes.push('⚠️ El contrato actual tiene permanencia. Verificar penalización antes de cambiar.');
  }

  if (activeTariffs.length === 0) {
    notes.push('❌ No hay tarifas activas en el catálogo. Añade tarifas para obtener recomendaciones precisas.');
  }

  if (totalConsumption === 0) {
    notes.push('⚠️ No hay datos de consumo. La recomendación se basa solo en potencia.');
  }

  const monthlySavings = chosen ? Math.round((chosen.savings / (billingDays / 30 || 1)) * 100) / 100 : 0;
  const annualSavings = chosen ? Math.round(chosen.savings * (365 / (billingDays || 30)) * 100) / 100 : 0;

  // Risk & confidence
  let riskLevel = 'low';
  let confidence = 80;
  if (hasPermanence) { riskLevel = 'medium'; confidence -= 15; }
  if (activeTariffs.length < 3) { confidence -= 20; notes.push('⚠️ Pocas tarifas en catálogo. Ampliar para mayor precisión.'); }
  if (maxDemandP1 === 0 && maxDemandP2 === 0) { confidence -= 10; }
  if (totalConsumption === 0) { confidence -= 20; }
  if (chosen?.has_permanence) { riskLevel = 'medium'; }
  confidence = Math.max(15, Math.min(95, confidence));

  return {
    recommended_supplier: chosen?.supplier || currentSupplier || 'Mantener actual',
    recommended_tariff: chosen?.tariff_name || currentTariff || 'Sin datos',
    recommended_power_p1: Math.round(recPowerP1 * 100) / 100,
    recommended_power_p2: Math.round(recPowerP2 * 100) / 100,
    monthly_savings_estimate: Math.max(0, monthlySavings),
    annual_savings_estimate: Math.max(0, annualSavings),
    risk_level: riskLevel,
    confidence_score: confidence,
    implementation_notes: notes.join('\n') || 'Sin observaciones especiales.',
    best_tariff_id: chosen?.tariff_id || null,
    simulation_results: simResults,
  };
}
