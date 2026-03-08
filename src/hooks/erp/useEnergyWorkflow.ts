import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const WORKFLOW_STATUSES = {
  pendiente_propuesta: { label: 'Pendiente de propuesta', color: 'bg-slate-500', order: 0 },
  propuesta_enviada: { label: 'Propuesta enviada', color: 'bg-blue-500', order: 1 },
  propuesta_aceptada: { label: 'Aceptada', color: 'bg-emerald-500', order: 2 },
  documentacion_completa: { label: 'Documentación completa', color: 'bg-teal-500', order: 3 },
  enviada_comercializadora: { label: 'Enviada a comercializadora', color: 'bg-indigo-500', order: 4 },
  en_validacion: { label: 'En validación', color: 'bg-violet-500', order: 5 },
  subsanacion_requerida: { label: 'Subsanación requerida', color: 'bg-amber-500', order: 6 },
  cambio_confirmado: { label: 'Cambio confirmado', color: 'bg-green-600', order: 7 },
  primera_factura_recibida: { label: 'Primera factura recibida', color: 'bg-cyan-500', order: 8 },
  cerrado: { label: 'Cerrado', color: 'bg-gray-700', order: 9 },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', order: 10 },
} as const;

export type WorkflowStatus = keyof typeof WORKFLOW_STATUSES;

export interface WorkflowState {
  id: string;
  case_id: string;
  status: WorkflowStatus;
  assigned_user_id: string | null;
  comments: string | null;
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Valid transitions — strict matrix
const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  pendiente_propuesta: ['propuesta_enviada', 'cancelado'],
  propuesta_enviada: ['propuesta_aceptada', 'pendiente_propuesta', 'cancelado'],
  propuesta_aceptada: ['documentacion_completa', 'cancelado'],
  documentacion_completa: ['enviada_comercializadora', 'cancelado'],
  enviada_comercializadora: ['en_validacion', 'subsanacion_requerida', 'cancelado'],
  en_validacion: ['cambio_confirmado', 'subsanacion_requerida', 'cancelado'],
  subsanacion_requerida: ['enviada_comercializadora', 'cancelado'],
  cambio_confirmado: ['primera_factura_recibida', 'cancelado'],
  primera_factura_recibida: ['cerrado'],
  cerrado: [],
  cancelado: ['pendiente_propuesta'],
};

export function isValidTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

export function useEnergyWorkflow(caseId: string | null) {
  const [history, setHistory] = useState<WorkflowState[]>([]);
  const [currentStatus, setCurrentStatus] = useState<WorkflowStatus>('pendiente_propuesta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('energy_workflow_states')
        .select('*')
        .eq('case_id', caseId)
        .order('changed_at', { ascending: true });
      if (fetchErr) throw fetchErr;
      const states = (data || []) as WorkflowState[];
      setHistory(states);
      if (states.length > 0) {
        setCurrentStatus(states[states.length - 1].status as WorkflowStatus);
      } else {
        setCurrentStatus('pendiente_propuesta');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar workflow';
      setError(msg);
      console.error('[useEnergyWorkflow] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const transition = useCallback(async (
    newStatus: WorkflowStatus,
    comments?: string,
    onAuditLog?: (action: string, entityType: string, entityId?: string | null, details?: Record<string, unknown>) => void
  ) => {
    if (!caseId || !user?.id) {
      toast.error('Debes iniciar sesión para cambiar estado');
      return null;
    }

    // Strict validation
    if (!isValidTransition(currentStatus, newStatus)) {
      toast.error(`Transición no permitida: ${WORKFLOW_STATUSES[currentStatus].label} → ${WORKFLOW_STATUSES[newStatus].label}`);
      return null;
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('energy_workflow_states')
        .insert([{
          case_id: caseId,
          status: newStatus,
          comments: comments || null,
          changed_by: user.id,
          changed_at: new Date().toISOString(),
        }] as any)
        .select()
        .single();
      if (insertErr) throw insertErr;
      const state = data as WorkflowState;
      setHistory(prev => [...prev, state]);
      setCurrentStatus(newStatus);
      toast.success(`Estado: ${WORKFLOW_STATUSES[newStatus].label}`);

      // Audit log integration
      if (onAuditLog) {
        onAuditLog('workflow_transition', 'energy_workflow_states', state.id, {
          from: currentStatus,
          to: newStatus,
          comments: comments || null,
        });
      }

      return state;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado';
      console.error('[useEnergyWorkflow] transition error:', err);
      toast.error(msg);
      return null;
    }
  }, [caseId, currentStatus, user?.id]);

  const getAvailableTransitions = useCallback(() => {
    return (TRANSITIONS[currentStatus] || []).map(s => ({
      status: s,
      ...WORKFLOW_STATUSES[s],
    }));
  }, [currentStatus]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return {
    history, currentStatus, loading, error,
    transition, getAvailableTransitions, fetchHistory,
    isValidTransition,
  };
}
