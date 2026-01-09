import { useCallback } from 'react';
import { useVerticalAgent, VerticalAgentConfig } from './useVerticalAgent';
import type { CropHealthAnalysis, IrrigationPlan, WeatherPrediction, BlockchainTrace } from '../useAgriculturePro';

export interface HarvestPredictionParams {
  fieldId: string;
  cropType: string;
  plantingDate: string;
  currentConditions?: Record<string, unknown>;
}

export interface IrrigationOptimizeParams {
  fieldId: string;
  cropType: string;
  soilMoisture: number;
  weatherForecast?: WeatherPrediction[];
}

export interface PestDetectionParams {
  fieldId: string;
  symptoms: string[];
  imageUrls?: string[];
  recentConditions?: Record<string, unknown>;
}

export interface PlantingPlanParams {
  fieldId: string;
  availableCrops: string[];
  soilAnalysis: Record<string, unknown>;
  seasonalData: Record<string, unknown>;
}

export interface TraceabilityParams {
  productId: string;
  batchId: string;
  eventType: 'planting' | 'treatment' | 'harvest' | 'processing' | 'shipping';
  eventData: Record<string, unknown>;
}

export function useAgricultureAgent() {
  const agent = useVerticalAgent();

  // Start agriculture-specific session
  const startAgricultureSession = useCallback(async (config?: Partial<VerticalAgentConfig>) => {
    await agent.startSession({
      verticalType: 'agriculture',
      mode: config?.mode || 'supervised',
      confidenceThreshold: config?.confidenceThreshold || 0.75,
      context: {
        ...config?.context,
        specialization: 'agriculture',
        sustainabilityFocus: true,
      },
    });
  }, [agent.startSession]);

  // Predict harvest yield
  const predictHarvest = useCallback(async (
    params: HarvestPredictionParams
  ): Promise<{ yield: number; confidence: number; factors: string[] } | null> => {
    const result = await agent.executeTask('predict_harvest', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as { yield: number; confidence: number; factors: string[] };
    }
    return null;
  }, [agent.executeTask]);

  // Optimize irrigation plan
  const optimizeIrrigation = useCallback(async (
    params: IrrigationOptimizeParams
  ): Promise<IrrigationPlan | null> => {
    const result = await agent.executeTask('optimize_irrigation', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as IrrigationPlan;
    }
    return null;
  }, [agent.executeTask]);

  // Detect pests or diseases
  const detectPests = useCallback(async (
    params: PestDetectionParams
  ): Promise<CropHealthAnalysis | null> => {
    const result = await agent.executeTask('detect_pests', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as CropHealthAnalysis;
    }
    return null;
  }, [agent.executeTask]);

  // Plan planting schedule
  const planPlanting = useCallback(async (
    params: PlantingPlanParams
  ): Promise<{ schedule: Array<{ crop: string; date: string; field: string }> } | null> => {
    const result = await agent.executeTask('plan_planting', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as { schedule: Array<{ crop: string; date: string; field: string }> };
    }
    return null;
  }, [agent.executeTask]);

  // Record traceability event
  const recordTraceability = useCallback(async (
    params: TraceabilityParams
  ): Promise<BlockchainTrace | null> => {
    const result = await agent.executeTask('trace_product', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as BlockchainTrace;
    }
    return null;
  }, [agent.executeTask]);

  return {
    ...agent,
    startSession: startAgricultureSession,
    // Agriculture-specific actions
    predictHarvest,
    optimizeIrrigation,
    detectPests,
    planPlanting,
    recordTraceability,
  };
}

export default useAgricultureAgent;
