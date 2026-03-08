/**
 * useHROrchestrationEmitter — P10.2
 * Allows any Premium HR module to emit events that trigger orchestration rules.
 * Usage: const { emit } = useHROrchestrationEmitter(companyId);
 *        await emit('security', 'status_changed', 'erp_hr_masking_rules', { status: 'critical' });
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ModuleKey, TriggerEvent } from './useHROrchestration';

export interface EmitResult {
  success: boolean;
  matched_rules: number;
  executed: number;
  skipped: number;
  failed: number;
  results: Array<{
    rule_id: string;
    rule_name: string;
    status: string;
    execution_time_ms: number;
    action_module: string;
    action_type: string;
  }>;
}

export function useHROrchestrationEmitter(companyId: string | null) {
  const [isEmitting, setIsEmitting] = useState(false);
  const [lastResult, setLastResult] = useState<EmitResult | null>(null);

  const emit = useCallback(async (
    triggerModule: ModuleKey,
    triggerEvent: TriggerEvent,
    triggerTable?: string,
    triggerData?: Record<string, unknown>
  ): Promise<EmitResult | null> => {
    if (!companyId) return null;

    setIsEmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('hr-orchestration-engine', {
        body: {
          action: 'emit_event',
          company_id: companyId,
          trigger_module: triggerModule,
          trigger_event: triggerEvent,
          trigger_table: triggerTable,
          trigger_data: triggerData,
        },
      });

      if (error) throw error;

      const result = data as EmitResult;
      setLastResult(result);
      return result;
    } catch (err) {
      console.error('[useHROrchestrationEmitter] emit error:', err);
      return null;
    } finally {
      setIsEmitting(false);
    }
  }, [companyId]);

  const getChainStatus = useCallback(async () => {
    if (!companyId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('hr-orchestration-engine', {
        body: { action: 'get_chain_status', company_id: companyId },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[useHROrchestrationEmitter] getChainStatus error:', err);
      return null;
    }
  }, [companyId]);

  return { emit, isEmitting, lastResult, getChainStatus };
}

export default useHROrchestrationEmitter;
