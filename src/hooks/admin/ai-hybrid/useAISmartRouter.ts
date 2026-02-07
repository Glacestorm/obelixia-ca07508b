/**
 * Hook para enrutamiento inteligente de IA
 * Selecciona automáticamente el mejor proveedor basándose en
 * seguridad (40%), coste (30%), latencia (15%) y capacidad (15%)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAILegalCompliance } from './useAILegalCompliance';

// === INTERFACES ===
export interface RoutingDecision {
  selectedProviderId: string;
  selectedProviderName: string;
  selectedModel: string;
  providerType: 'local' | 'external';
  scores: {
    security: number;
    cost: number;
    latency: number;
    capability: number;
    total: number;
  };
  wasBlocked: boolean;
  blockReason?: string;
  legalValidationId?: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  fallbackAvailable: boolean;
  timestamp: Date;
}

export interface ProviderScore {
  providerId: string;
  providerName: string;
  providerType: 'local' | 'external';
  model: string;
  securityScore: number;
  costScore: number;
  latencyScore: number;
  capabilityScore: number;
  totalScore: number;
  isAvailable: boolean;
  reason?: string;
}

export interface RoutingContext {
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  operationType: string;
  requiredCapabilities?: string[];
  preferLocal?: boolean;
  maxCost?: number;
  maxLatencyMs?: number;
  destinationCountry?: string;
}

export interface RoutingStats {
  totalDecisions: number;
  localUsage: number;
  externalUsage: number;
  blockedCount: number;
  averageLatency: number;
  totalCostSaved: number;
}

// === SCORING WEIGHTS ===
const WEIGHTS = {
  security: 0.40,
  cost: 0.30,
  latency: 0.15,
  capability: 0.15,
};

// === HOOK ===
export function useAISmartRouter() {
  const [lastDecision, setLastDecision] = useState<RoutingDecision | null>(null);
  const [providerScores, setProviderScores] = useState<ProviderScore[]>([]);
  const [isRouting, setIsRouting] = useState(false);
  const [routingHistory, setRoutingHistory] = useState<RoutingDecision[]>([]);
  
  const { validateAIOperation } = useAILegalCompliance();

  // === CALCULATE SECURITY SCORE ===
  const calculateSecurityScore = useCallback((
    providerType: 'local' | 'external',
    classification: string,
    trustLevel: string
  ): number => {
    // Local providers are always more secure for sensitive data
    if (providerType === 'local') {
      return 100;
    }

    // External providers score based on classification
    const classificationPenalty: Record<string, number> = {
      public: 0,
      internal: 10,
      confidential: 40,
      restricted: 100, // Effectively blocks external for restricted
    };

    const trustBonus: Record<string, number> = {
      verified: 20,
      trusted: 10,
      standard: 0,
      untrusted: -20,
    };

    return Math.max(0, Math.min(100, 
      80 - (classificationPenalty[classification] || 0) + (trustBonus[trustLevel] || 0)
    ));
  }, []);

  // === CALCULATE COST SCORE ===
  const calculateCostScore = useCallback((
    providerType: 'local' | 'external',
    estimatedCost: number,
    maxCost?: number
  ): number => {
    // Local is free
    if (providerType === 'local') {
      return 100;
    }

    // Score based on cost relative to max
    if (maxCost && estimatedCost > maxCost) {
      return 0;
    }

    // Inverse relationship: lower cost = higher score
    const costPerToken = estimatedCost / 1000; // Normalize
    return Math.max(0, Math.min(100, 100 - (costPerToken * 1000)));
  }, []);

  // === CALCULATE LATENCY SCORE ===
  const calculateLatencyScore = useCallback((
    averageLatencyMs: number,
    maxLatencyMs?: number
  ): number => {
    if (maxLatencyMs && averageLatencyMs > maxLatencyMs) {
      return 0;
    }

    // Score based on latency (lower is better)
    // 100ms = 100 score, 1000ms = 50 score, 5000ms = 0 score
    return Math.max(0, Math.min(100, 100 - (averageLatencyMs / 50)));
  }, []);

  // === CALCULATE CAPABILITY SCORE ===
  const calculateCapabilityScore = useCallback((
    modelCapabilities: string[],
    requiredCapabilities: string[]
  ): number => {
    if (requiredCapabilities.length === 0) return 100;

    const matchedCount = requiredCapabilities.filter(
      req => modelCapabilities.includes(req)
    ).length;

    return (matchedCount / requiredCapabilities.length) * 100;
  }, []);

  // === GET OPTIMAL ROUTE ===
  const getOptimalRoute = useCallback(async (
    context: RoutingContext,
    availableProviders: Array<{
      id: string;
      name: string;
      type: 'local' | 'external';
      model: string;
      trustLevel: string;
      capabilities: string[];
      averageLatencyMs: number;
      costPer1kTokens: number;
      isActive: boolean;
    }>
  ): Promise<RoutingDecision> => {
    setIsRouting(true);
    
    try {
      // First, validate with legal compliance
      const legalValidation = await validateAIOperation({
        operationType: context.operationType,
        dataClassification: context.dataClassification,
        destinationCountry: context.destinationCountry,
        providerType: 'external', // Check if external is allowed
      });

      // If blocked, only allow local providers
      const mustUseLocal = !legalValidation.isAllowed || 
        context.dataClassification === 'restricted' ||
        legalValidation.blockingIssues.length > 0;

      // Calculate scores for each provider
      const scores: ProviderScore[] = availableProviders
        .filter(p => p.isActive)
        .map(provider => {
          const isExternal = provider.type === 'external';
          
          // Block external if required
          if (isExternal && mustUseLocal) {
            return {
              providerId: provider.id,
              providerName: provider.name,
              providerType: provider.type,
              model: provider.model,
              securityScore: 0,
              costScore: 0,
              latencyScore: 0,
              capabilityScore: 0,
              totalScore: 0,
              isAvailable: false,
              reason: 'Bloqueado por política de seguridad',
            };
          }

          const securityScore = calculateSecurityScore(
            provider.type,
            context.dataClassification,
            provider.trustLevel
          );

          const costScore = calculateCostScore(
            provider.type,
            provider.costPer1kTokens,
            context.maxCost
          );

          const latencyScore = calculateLatencyScore(
            provider.averageLatencyMs,
            context.maxLatencyMs
          );

          const capabilityScore = calculateCapabilityScore(
            provider.capabilities,
            context.requiredCapabilities || []
          );

          const totalScore = 
            securityScore * WEIGHTS.security +
            costScore * WEIGHTS.cost +
            latencyScore * WEIGHTS.latency +
            capabilityScore * WEIGHTS.capability;

          return {
            providerId: provider.id,
            providerName: provider.name,
            providerType: provider.type,
            model: provider.model,
            securityScore,
            costScore,
            latencyScore,
            capabilityScore,
            totalScore,
            isAvailable: true,
          };
        });

      setProviderScores(scores);

      // Sort by total score
      const sortedScores = [...scores]
        .filter(s => s.isAvailable)
        .sort((a, b) => b.totalScore - a.totalScore);

      // Select best provider
      const bestProvider = sortedScores[0];
      const fallbackProvider = sortedScores[1];

      if (!bestProvider) {
        const decision: RoutingDecision = {
          selectedProviderId: '',
          selectedProviderName: '',
          selectedModel: '',
          providerType: 'local',
          scores: { security: 0, cost: 0, latency: 0, capability: 0, total: 0 },
          wasBlocked: true,
          blockReason: 'No hay proveedores disponibles que cumplan los requisitos',
          estimatedCost: 0,
          estimatedLatencyMs: 0,
          fallbackAvailable: false,
          timestamp: new Date(),
        };
        setLastDecision(decision);
        setRoutingHistory(prev => [decision, ...prev.slice(0, 99)]);
        toast.error('No hay proveedores de IA disponibles');
        return decision;
      }

      const selectedProvider = availableProviders.find(p => p.id === bestProvider.providerId)!;

      const decision: RoutingDecision = {
        selectedProviderId: bestProvider.providerId,
        selectedProviderName: bestProvider.providerName,
        selectedModel: bestProvider.model,
        providerType: bestProvider.providerType,
        scores: {
          security: bestProvider.securityScore,
          cost: bestProvider.costScore,
          latency: bestProvider.latencyScore,
          capability: bestProvider.capabilityScore,
          total: bestProvider.totalScore,
        },
        wasBlocked: false,
        estimatedCost: selectedProvider.costPer1kTokens,
        estimatedLatencyMs: selectedProvider.averageLatencyMs,
        fallbackAvailable: !!fallbackProvider,
        timestamp: new Date(),
      };

      setLastDecision(decision);
      setRoutingHistory(prev => [decision, ...prev.slice(0, 99)]);

      // Log to database
      await supabase.rpc('log_ai_routing_decision', {
        p_request_id: crypto.randomUUID(),
        p_user_id: null, // Would come from auth context
        p_data_classification: context.dataClassification,
        p_selected_provider_id: decision.selectedProviderId,
        p_selected_model: decision.selectedModel,
        p_security_score: decision.scores.security,
        p_cost_score: decision.scores.cost,
        p_latency_score: decision.scores.latency,
        p_capability_score: decision.scores.capability,
        p_total_score: decision.scores.total,
        p_was_blocked: decision.wasBlocked,
        p_block_reason: decision.blockReason,
        p_estimated_cost: decision.estimatedCost,
        p_estimated_tokens: 1000,
      });

      return decision;
    } catch (err) {
      console.error('[useAISmartRouter] getOptimalRoute error:', err);
      toast.error('Error al seleccionar proveedor');
      throw err;
    } finally {
      setIsRouting(false);
    }
  }, [validateAIOperation, calculateSecurityScore, calculateCostScore, calculateLatencyScore, calculateCapabilityScore]);

  // === GET ROUTING STATS ===
  const getRoutingStats = useCallback((): RoutingStats => {
    const decisions = routingHistory;
    
    if (decisions.length === 0) {
      return {
        totalDecisions: 0,
        localUsage: 0,
        externalUsage: 0,
        blockedCount: 0,
        averageLatency: 0,
        totalCostSaved: 0,
      };
    }

    const localCount = decisions.filter(d => d.providerType === 'local').length;
    const blockedCount = decisions.filter(d => d.wasBlocked).length;
    const avgLatency = decisions.reduce((sum, d) => sum + d.estimatedLatencyMs, 0) / decisions.length;
    
    // Estimate savings from using local instead of external
    const localDecisions = decisions.filter(d => d.providerType === 'local');
    const estimatedExternalCostPerRequest = 0.005; // $0.005 per request average
    const costSaved = localDecisions.length * estimatedExternalCostPerRequest;

    return {
      totalDecisions: decisions.length,
      localUsage: (localCount / decisions.length) * 100,
      externalUsage: ((decisions.length - localCount - blockedCount) / decisions.length) * 100,
      blockedCount,
      averageLatency: Math.round(avgLatency),
      totalCostSaved: costSaved,
    };
  }, [routingHistory]);

  return {
    // State
    lastDecision,
    providerScores,
    isRouting,
    routingHistory,

    // Actions
    getOptimalRoute,
    getRoutingStats,

    // Weights (exposed for UI)
    weights: WEIGHTS,
  };
}

export default useAISmartRouter;
