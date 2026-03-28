/**
 * useLegalProcedures - Hook para gestión de trámites legales ejecutables
 * Clasificación de intención, routing a supervisores/agentes, y seguimiento
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LegalProcedure {
  id: string;
  company_id: string;
  user_id: string | null;
  session_id: string;
  procedure_type: string;
  title: string;
  description: string | null;
  status: 'initiated' | 'pending_review' | 'in_progress' | 'awaiting_approval' | 'completed' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  routed_to_module: string | null;
  routed_to_agent: string | null;
  routed_to_supervisor: string | null;
  routing_confidence: number;
  routing_reasoning: string | null;
  target_entity_type: string | null;
  target_entity_id: string | null;
  target_entity_name: string | null;
  jurisdiction: string;
  specialty: string;
  legal_basis: string[];
  ai_analysis: string | null;
  steps: Array<{ step: number; description: string; status: string; completed_at?: string }>;
  current_step: number;
  total_steps: number;
  module_deep_link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface IntentClassification {
  intent_type: 'informative' | 'actionable';
  procedure_type: string | null;
  title: string;
  description: string;
  priority: string;
  target_module: string;
  target_agent: string;
  target_supervisor: string | null;
  legal_basis: string[];
  steps: Array<{ step: number; description: string; status: string }>;
  risk_assessment: string;
  requires_human_review: boolean;
  confidence: number;
  legal_analysis: string;
  manual_action_hint: string;
  procedure_id?: string;
  module_deep_link?: string;
}

export function useLegalProcedures(companyId: string) {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState<LegalProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);

  // Fetch procedures
  const fetchProcedures = useCallback(async (sessionId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-action-router', {
        body: {
          action: 'get_procedures',
          company_id: companyId,
          session_id: sessionId,
        }
      });
      if (error) throw error;
      setProcedures((data?.data || []) as LegalProcedure[]);
    } catch (err) {
      console.error('[useLegalProcedures] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Classify intent from chat message
  const classifyIntent = useCallback(async (
    query: string,
    jurisdiction: string,
    specialty: string,
    sessionId: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<IntentClassification | null> => {
    setIsClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-action-router', {
        body: {
          action: 'classify_intent',
          company_id: companyId,
          user_id: user?.id,
          session_id: sessionId,
          query,
          jurisdiction,
          specialty,
          conversation_history: conversationHistory,
        }
      });
      if (error) throw error;

      const classification = data?.data as IntentClassification;

      // If a procedure was created, refresh
      if (classification?.procedure_id) {
        fetchProcedures();
        toast.success('Trámite iniciado', {
          description: classification.title,
        });
      }

      return classification;
    } catch (err) {
      console.error('[useLegalProcedures] classify error:', err);
      toast.error('Error al clasificar la consulta');
      return null;
    } finally {
      setIsClassifying(false);
    }
  }, [companyId, user?.id, fetchProcedures]);

  // Update procedure
  const updateProcedure = useCallback(async (procedureId: string, updates: Partial<LegalProcedure>) => {
    try {
      const { data, error } = await supabase.functions.invoke('legal-action-router', {
        body: {
          action: 'update_procedure',
          company_id: companyId,
          procedure_id: procedureId,
          procedure_update: updates,
        }
      });
      if (error) throw error;
      setProcedures(prev => prev.map(p => p.id === procedureId ? { ...p, ...data?.data } : p));
      return true;
    } catch (err) {
      console.error('[useLegalProcedures] update error:', err);
      return false;
    }
  }, [companyId]);

  // Cancel procedure
  const cancelProcedure = useCallback(async (procedureId: string) => {
    const ok = await updateProcedure(procedureId, { status: 'cancelled' });
    if (ok) toast.info('Trámite cancelado');
    return ok;
  }, [updateProcedure]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('legal-procedures-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'erp_legal_procedures' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProc = payload.new as LegalProcedure;
            setProcedures(prev => {
              if (prev.some(p => p.id === newProc.id)) return prev;
              return [newProc, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as LegalProcedure;
            setProcedures(prev => prev.map(p => p.id === updated.id ? updated : p));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (companyId) fetchProcedures();
  }, [companyId, fetchProcedures]);

  // Computed
  const activeProcedures = procedures.filter(p => !['completed', 'cancelled', 'rejected'].includes(p.status));
  const completedProcedures = procedures.filter(p => ['completed', 'cancelled', 'rejected'].includes(p.status));

  return {
    procedures,
    activeProcedures,
    completedProcedures,
    isLoading,
    isClassifying,
    fetchProcedures,
    classifyIntent,
    updateProcedure,
    cancelProcedure,
  };
}

export default useLegalProcedures;
