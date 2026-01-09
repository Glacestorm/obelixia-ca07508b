import { useCallback } from 'react';
import { useVerticalAgent, VerticalAgentConfig } from './useVerticalAgent';
import type { PredictiveMaintenance, OEEMetrics, RouteOptimization, SmartGridData } from '../useIndustrialPro';

export interface MaintenancePredictionParams {
  equipmentId: string;
  sensorData: Record<string, number>;
  lastMaintenanceDate?: string;
  operatingHours?: number;
}

export interface OEEOptimizeParams {
  lineId: string;
  currentMetrics: Partial<OEEMetrics>;
  constraints?: Record<string, unknown>;
}

export interface InventoryOptimizeParams {
  warehouseId: string;
  currentLevels: Record<string, number>;
  demandForecast: Record<string, number>;
  leadTimes: Record<string, number>;
}

export interface RouteOptimizeParams {
  vehicleIds: string[];
  deliveries: Array<{
    id: string;
    location: { lat: number; lng: number };
    timeWindow?: { start: string; end: string };
    priority?: number;
  }>;
  constraints?: {
    maxDistance?: number;
    maxTime?: number;
    vehicleCapacity?: number;
  };
}

export interface EnergyMonitorParams {
  facilityId: string;
  meters: string[];
  period: 'hour' | 'day' | 'week' | 'month';
}

export function useIndustrialAgent() {
  const agent = useVerticalAgent();

  // Start industrial-specific session
  const startIndustrialSession = useCallback(async (config?: Partial<VerticalAgentConfig>) => {
    await agent.startSession({
      verticalType: 'industrial',
      mode: config?.mode || 'supervised',
      confidenceThreshold: config?.confidenceThreshold || 0.80,
      context: {
        ...config?.context,
        specialization: 'industrial',
        safetyFirst: true,
      },
    });
  }, [agent.startSession]);

  // Predict maintenance needs
  const predictMaintenance = useCallback(async (
    params: MaintenancePredictionParams
  ): Promise<PredictiveMaintenance | null> => {
    const result = await agent.executeTask('predict_maintenance', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as PredictiveMaintenance;
    }
    return null;
  }, [agent.executeTask]);

  // Optimize OEE
  const optimizeOEE = useCallback(async (
    params: OEEOptimizeParams
  ): Promise<{ recommendations: string[]; projectedOEE: number } | null> => {
    const result = await agent.executeTask('optimize_oee', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as { recommendations: string[]; projectedOEE: number };
    }
    return null;
  }, [agent.executeTask]);

  // Manage inventory levels
  const manageInventory = useCallback(async (
    params: InventoryOptimizeParams
  ): Promise<{ reorderPoints: Record<string, number>; suggestions: string[] } | null> => {
    const result = await agent.executeTask('manage_inventory', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as { reorderPoints: Record<string, number>; suggestions: string[] };
    }
    return null;
  }, [agent.executeTask]);

  // Optimize delivery routes
  const optimizeRoutes = useCallback(async (
    params: RouteOptimizeParams
  ): Promise<RouteOptimization | null> => {
    const result = await agent.executeTask('optimize_routes', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as RouteOptimization;
    }
    return null;
  }, [agent.executeTask]);

  // Monitor energy consumption
  const monitorEnergy = useCallback(async (
    params: EnergyMonitorParams
  ): Promise<SmartGridData | null> => {
    const result = await agent.executeTask('monitor_energy', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as SmartGridData;
    }
    return null;
  }, [agent.executeTask]);

  return {
    ...agent,
    startSession: startIndustrialSession,
    // Industrial-specific actions
    predictMaintenance,
    optimizeOEE,
    manageInventory,
    optimizeRoutes,
    monitorEnergy,
  };
}

export default useIndustrialAgent;
