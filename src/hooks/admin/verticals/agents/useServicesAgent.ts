import { useCallback } from 'react';
import { useVerticalAgent, VerticalAgentConfig } from './useVerticalAgent';
import type { RevenuePricing, ReviewSentiment, CustomerDNA, GuestExperience } from '../useServicesPro';

export interface CustomerInteractionParams {
  customerId?: string;
  channel: 'chat' | 'email' | 'phone' | 'social';
  message: string;
  context?: Record<string, unknown>;
}

export interface DynamicPricingParams {
  productId: string;
  currentPrice: number;
  demand: number;
  occupancy?: number;
  competitorPrices?: number[];
  seasonality?: string;
}

export interface ChurnPredictionParams {
  customerId: string;
  activityHistory: Array<{ date: string; action: string; value?: number }>;
  subscriptionData?: Record<string, unknown>;
}

export interface ReservationParams {
  resourceType: string;
  requestedDate: string;
  duration: number;
  preferences?: Record<string, unknown>;
  customerId?: string;
}

export interface ReviewAnalysisParams {
  reviews: Array<{ text: string; rating?: number; date: string; source?: string }>;
  aspectsToAnalyze?: string[];
}

export function useServicesAgent() {
  const agent = useVerticalAgent();

  // Start services-specific session
  const startServicesSession = useCallback(async (config?: Partial<VerticalAgentConfig>) => {
    await agent.startSession({
      verticalType: 'services',
      mode: config?.mode || 'supervised',
      confidenceThreshold: config?.confidenceThreshold || 0.75,
      context: {
        ...config?.context,
        specialization: 'services',
        customerFirst: true,
      },
    });
  }, [agent.startSession]);

  // Handle customer interaction autonomously
  const handleCustomer = useCallback(async (
    params: CustomerInteractionParams
  ): Promise<{ response: string; sentiment: string; nextBestAction?: string } | null> => {
    const result = await agent.executeTask('handle_customer', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as { response: string; sentiment: string; nextBestAction?: string };
    }
    return null;
  }, [agent.executeTask]);

  // Calculate dynamic pricing
  const calculateDynamicPricing = useCallback(async (
    params: DynamicPricingParams
  ): Promise<RevenuePricing | null> => {
    const result = await agent.executeTask('dynamic_pricing', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as RevenuePricing;
    }
    return null;
  }, [agent.executeTask]);

  // Predict customer churn
  const predictChurn = useCallback(async (
    params: ChurnPredictionParams
  ): Promise<{ churnProbability: number; riskFactors: string[]; retentionActions: string[] } | null> => {
    const result = await agent.executeTask('predict_churn', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as { churnProbability: number; riskFactors: string[]; retentionActions: string[] };
    }
    return null;
  }, [agent.executeTask]);

  // Manage reservations intelligently
  const manageReservation = useCallback(async (
    params: ReservationParams
  ): Promise<GuestExperience | null> => {
    const result = await agent.executeTask('manage_reservations', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as GuestExperience;
    }
    return null;
  }, [agent.executeTask]);

  // Analyze customer reviews
  const analyzeReviews = useCallback(async (
    params: ReviewAnalysisParams
  ): Promise<ReviewSentiment | null> => {
    const result = await agent.executeTask('analyze_reviews', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as ReviewSentiment;
    }
    return null;
  }, [agent.executeTask]);

  // Get customer DNA profile
  const getCustomerDNA = useCallback(async (
    customerId: string
  ): Promise<CustomerDNA | null> => {
    const result = await agent.executeTask('customer_dna', { customerId });
    if (result?.outputResult?.success) {
      return result.outputResult.result as CustomerDNA;
    }
    return null;
  }, [agent.executeTask]);

  return {
    ...agent,
    startSession: startServicesSession,
    // Services-specific actions
    handleCustomer,
    calculateDynamicPricing,
    predictChurn,
    manageReservation,
    analyzeReviews,
    getCustomerDNA,
  };
}

export default useServicesAgent;
