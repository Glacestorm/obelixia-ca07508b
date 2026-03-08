import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyRecommendation {
  id: string;
  case_id: string;
  recommended_supplier: string | null;
  recommended_tariff: string | null;
  recommended_power_p1: number | null;
  recommended_power_p2: number | null;
  monthly_savings_estimate: number | null;
  annual_savings_estimate: number | null;
  implementation_notes: string | null;
  risk_level: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export function useEnergyRecommendation(caseId: string | null) {
  const [recommendation, setRecommendation] = useState<EnergyRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendation = useCallback(async () => {
    if (!caseId) { setRecommendation(null); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_recommendations').select('*').eq('case_id', caseId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      setRecommendation(data as EnergyRecommendation | null);
    } catch (err) {
      console.error('[useEnergyRecommendation] error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const saveRecommendation = useCallback(async (values: Partial<EnergyRecommendation>) => {
    if (!caseId) return null;
    try {
      if (recommendation?.id) {
        const { data, error } = await supabase
          .from('energy_recommendations').update(values).eq('id', recommendation.id).select().single();
        if (error) throw error;
        setRecommendation(data as EnergyRecommendation);
        toast.success('Recomendación actualizada');
        return data;
      } else {
        const { data, error } = await supabase
          .from('energy_recommendations').insert([{ ...values, case_id: caseId }] as any).select().single();
        if (error) throw error;
        setRecommendation(data as EnergyRecommendation);
        toast.success('Recomendación guardada');
        return data;
      }
    } catch (err) {
      toast.error('Error al guardar recomendación');
      return null;
    }
  }, [caseId, recommendation]);

  useEffect(() => { fetchRecommendation(); }, [fetchRecommendation]);

  return { recommendation, loading, fetchRecommendation, saveRecommendation };
}

/** Basic recommendation engine - no AI, rule-based */
export interface RecommendationInput {
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
}

export interface RecommendationOutput {
  recommended_supplier: string;
  recommended_tariff: string;
  recommended_power_p1: number;
  recommended_power_p2: number;
  monthly_savings_estimate: number;
  annual_savings_estimate: number;
  risk_level: string;
  confidence_score: number;
  implementation_notes: string;
}

export function generateRecommendation(input: RecommendationInput): RecommendationOutput {
  const totalConsumption = input.consumptionP1 + input.consumptionP2 + input.consumptionP3;
  const p3Ratio = totalConsumption > 0 ? input.consumptionP3 / totalConsumption : 0;

  // Power recommendation: 10% margin above max demand, but never below 85% of contracted
  const recPowerP1 = Math.max(
    Math.ceil(input.maxDemandP1 * 1.1 * 100) / 100,
    input.contractedPowerP1 * 0.85
  );
  const recPowerP2 = Math.max(
    Math.ceil(input.maxDemandP2 * 1.1 * 100) / 100,
    input.contractedPowerP2 * 0.85
  );

  // Tariff recommendation based on P3 usage
  let recommendedTariff = input.currentTariff;
  let recommendedSupplier = input.currentSupplier;
  const notes: string[] = [];

  if (p3Ratio > 0.4) {
    recommendedTariff = '2.0TD';
    notes.push('Alto consumo en P3 (valle): tarifa con energía nocturna económica recomendada.');
  }

  // Power proximity check
  const p1Margin = input.contractedPowerP1 > 0
    ? (input.contractedPowerP1 - input.maxDemandP1) / input.contractedPowerP1
    : 1;
  if (p1Margin < 0.1) {
    notes.push('⚠️ Potencia máxima demandada P1 muy próxima a la contratada. No se recomienda bajada agresiva.');
  }
  if (p1Margin > 0.3) {
    notes.push('La potencia P1 contratada está sobredimensionada. Se recomienda ajustar a la baja para ahorrar en término fijo.');
  }

  // Permanence warning
  if (input.hasPermanence) {
    notes.push('⚠️ El contrato actual tiene permanencia. Verificar penalización antes de cambiar.');
  }

  // Estimated savings (simplified)
  const powerSavings = (input.contractedPowerP1 - recPowerP1) * 3.5 + (input.contractedPowerP2 - recPowerP2) * 2.0;
  const energySavings = p3Ratio > 0.4 ? totalConsumption * 0.015 : totalConsumption * 0.005;
  const monthlySavings = Math.max(0, Math.round((powerSavings + energySavings) * 100) / 100);
  const annualSavings = Math.round(monthlySavings * 12 * 100) / 100;

  // Risk & confidence
  let riskLevel = 'low';
  let confidence = 75;
  if (input.hasPermanence) { riskLevel = 'medium'; confidence -= 15; }
  if (p1Margin < 0.05) { riskLevel = 'high'; confidence -= 10; }
  if (monthlySavings < 5) { confidence -= 10; }
  confidence = Math.max(20, Math.min(95, confidence));

  return {
    recommended_supplier: recommendedSupplier || 'Mantener actual',
    recommended_tariff: recommendedTariff,
    recommended_power_p1: Math.round(recPowerP1 * 100) / 100,
    recommended_power_p2: Math.round(recPowerP2 * 100) / 100,
    monthly_savings_estimate: monthlySavings,
    annual_savings_estimate: annualSavings,
    risk_level: riskLevel,
    confidence_score: confidence,
    implementation_notes: notes.join('\n') || 'Sin observaciones especiales.',
  };
}
