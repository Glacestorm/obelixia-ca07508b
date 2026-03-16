/**
 * useHRDocActionQueue — Hook para cola de acciones documentales pendientes
 * V2-ES.4 Paso 2: Genera, resuelve y consulta acciones doc operativas
 *
 * REGLAS:
 * - No hace fetch de documentos (recibe datos por prop vía computePendingActions)
 * - Persiste acciones en erp_hr_doc_action_queue para tracking
 * - Deduplicación por (document_id, action_type, status='pending')
 * - Modelo enriquecido: title, description, severity derivados del action_type
 * - Escalado automático: pending + overdue → priority critical
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeDocStatus } from '@/engines/erp/hr/documentStatusEngine';
import { isReconcilableDocType } from '@/engines/erp/hr/docReconciliationRules';
import type { EmployeeDocument } from './useHRDocumentExpedient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocActionType =
  | 'generate'     // Generar documento faltante (obligatorio del checklist)
  | 'submit'       // Enviar doc en pending_submission
  | 'review'       // Revisar doc rechazado o en draft
  | 'correct'      // Corregir doc rechazado
  | 'close'        // Cerrar doc accepted pero no cerrado
  | 'renew'        // Renovar doc vencido o próximo a vencer
  | 'reconcile'    // Conciliar doc reconciliable
  | 'escalate';    // Escalado automático

export type DocActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type DocActionSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type DocActionStatus = 'pending' | 'in_progress' | 'done' | 'dismissed' | 'escalated';
export type DocActionSource = 'system' | 'manual' | 'escalation' | 'checklist';

export interface DocAction {
  id: string;
  employee_id: string;
  document_id: string | null;
  document_type_code: string;
  action_type: DocActionType;
  priority: DocActionPriority;
  source: string;
  status: DocActionStatus;
  due_date: string | null;
  assigned_to: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  context: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocActionSummary {
  total: number;
  pending: number;
  critical: number;
  high: number;
  byType: Record<string, number>;
}

// ─── Enriched action (computed presentation layer) ───────────────────────────

export interface EnrichedDocAction {
  /** Raw persisted or computed action */
  raw: PendingAction;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity for visual indicators */
  severity: DocActionSeverity;
}

const ACTION_META: Record<DocActionType, { title: string; verb: string; severity: DocActionSeverity }> = {
  generate:  { title: 'Generar documento',           verb: 'generar',   severity: 'high' },
  submit:    { title: 'Enviar documento',             verb: 'enviar',    severity: 'medium' },
  review:    { title: 'Revisar documento',            verb: 'revisar',   severity: 'medium' },
  correct:   { title: 'Corregir documento rechazado', verb: 'corregir',  severity: 'high' },
  close:     { title: 'Cerrar documento',             verb: 'cerrar',    severity: 'low' },
  renew:     { title: 'Renovar documento vencido',    verb: 'renovar',   severity: 'critical' },
  reconcile: { title: 'Conciliar documento',          verb: 'conciliar', severity: 'info' },
  escalate:  { title: 'Escalado automático',          verb: 'escalar',   severity: 'critical' },
};

export function enrichAction(action: PendingAction): EnrichedDocAction {
  const meta = ACTION_META[action.action_type] ?? ACTION_META.review;
  const severityOverride = action.priority === 'critical' ? 'critical' as const
    : action.priority === 'high' ? 'high' as const
    : meta.severity;

  return {
    raw: action,
    title: `${meta.title}: ${action.document_type_code}`,
    description: action.reason,
    severity: severityOverride,
  };
}

// ─── Action generation (pure, no side effects) ──────────────────────────────

export interface PendingAction {
  document_id: string | null;
  document_type_code: string;
  action_type: DocActionType;
  priority: DocActionPriority;
  source: DocActionSource;
  due_date: string | null;
  reason: string;
}

/**
 * Computes ALL pending actions from a set of documents (pure function).
 * Covers: generate, submit, review, correct, close, renew, reconcile.
 * Does NOT persist — call syncActions to persist.
 */
export function computePendingActions(
  docs: EmployeeDocument[],
  expectedTypes?: string[],
): PendingAction[] {
  const actions: PendingAction[] = [];
  const now = new Date();

  for (const doc of docs) {
    const status = doc.document_status ?? 'draft';

    // 1. Draft → review (borrador pendiente de revisión)
    if (status === 'draft') {
      actions.push({
        document_id: doc.id,
        document_type_code: doc.document_type,
        action_type: 'review',
        priority: 'medium',
        source: 'system',
        due_date: doc.expiry_date,
        reason: 'Documento en borrador pendiente de revisión',
      });
    }

    // 2. pending_submission → submit
    if (status === 'pending_submission') {
      actions.push({
        document_id: doc.id,
        document_type_code: doc.document_type,
        action_type: 'submit',
        priority: 'high',
        source: 'system',
        due_date: doc.expiry_date,
        reason: 'Documento listo para envío, pendiente de presentación',
      });
    }

    // 3. rejected → correct
    if (status === 'rejected') {
      actions.push({
        document_id: doc.id,
        document_type_code: doc.document_type,
        action_type: 'correct',
        priority: 'high',
        source: 'system',
        due_date: null,
        reason: 'Documento rechazado, requiere corrección y reenvío',
      });
    }

    // 4. accepted but not closed → close
    if (status === 'accepted') {
      actions.push({
        document_id: doc.id,
        document_type_code: doc.document_type,
        action_type: 'close',
        priority: 'low',
        source: 'system',
        due_date: null,
        reason: 'Documento aceptado pendiente de cierre formal',
      });
    }

    // 5. Expiring / expired → renew
    if (doc.expiry_date) {
      const docStatus = computeDocStatus(doc.document_type, doc.expiry_date, now);
      if (docStatus.status === 'expired') {
        actions.push({
          document_id: doc.id,
          document_type_code: doc.document_type,
          action_type: 'renew',
          priority: 'critical',
          source: 'system',
          due_date: doc.expiry_date,
          reason: docStatus.label,
        });
      } else if (docStatus.status === 'expiring') {
        actions.push({
          document_id: doc.id,
          document_type_code: doc.document_type,
          action_type: 'renew',
          priority: docStatus.isUrgent ? 'high' : 'medium',
          source: 'system',
          due_date: doc.expiry_date,
          reason: docStatus.label,
        });
      }
    }

    // 6. Reconciliation needed (accepted doc, reconcilable type, not reconciled)
    if (isReconcilableDocType(doc.document_type) && (status === 'accepted' || status === 'closed')) {
      const anyReconciled = doc.reconciled_with_payroll || doc.reconciled_with_social_security || doc.reconciled_with_tax;
      if (!anyReconciled) {
        actions.push({
          document_id: doc.id,
          document_type_code: doc.document_type,
          action_type: 'reconcile',
          priority: 'low',
          source: 'system',
          due_date: null,
          reason: 'Documento sin conciliación contable',
        });
      }
    }
  }

  // 7. Missing mandatory docs from checklist → generate
  if (expectedTypes && expectedTypes.length > 0) {
    const presentTypes = new Set(docs.map(d => d.document_type.toLowerCase()));
    for (const expected of expectedTypes) {
      if (!presentTypes.has(expected.toLowerCase())) {
        actions.push({
          document_id: null,
          document_type_code: expected,
          action_type: 'generate',
          priority: 'high',
          source: 'checklist',
          due_date: null,
          reason: `Documento obligatorio faltante: ${expected}`,
        });
      }
    }
  }

  // Sort: critical first, then high, then by due_date
  return actions.sort((a, b) => {
    const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    if (diff !== 0) return diff;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    return 1;
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseHRDocActionQueueOptions {
  employeeId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function useHRDocActionQueue(opts: UseHRDocActionQueueOptions = {}) {
  const qc = useQueryClient();
  const { employeeId, relatedEntityType, relatedEntityId } = opts;

  const queryKey = ['hr-doc-action-queue', employeeId, relatedEntityType, relatedEntityId];

  const { data: persistedActions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<DocAction[]> => {
      let query = supabase
        .from('erp_hr_doc_action_queue')
        .select('*')
        .in('status', ['pending', 'in_progress', 'escalated'])
        .order('priority')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (employeeId) query = query.eq('employee_id', employeeId);
      if (relatedEntityType && relatedEntityId) {
        query = query.eq('related_entity_type', relatedEntityType).eq('related_entity_id', relatedEntityId);
      }

      const { data, error } = await query.limit(100);
      if (error) {
        console.warn('[useHRDocActionQueue] Query failed:', error.message);
        return [];
      }
      return (data ?? []) as unknown as DocAction[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!(employeeId || (relatedEntityType && relatedEntityId)),
  });

  // Summary
  const summary = useMemo<DocActionSummary>(() => {
    const byType: Record<string, number> = {};
    let critical = 0;
    let high = 0;
    for (const a of persistedActions) {
      byType[a.action_type] = (byType[a.action_type] ?? 0) + 1;
      if (a.priority === 'critical') critical++;
      if (a.priority === 'high') high++;
    }
    return {
      total: persistedActions.length,
      pending: persistedActions.filter(a => a.status === 'pending').length,
      critical,
      high,
      byType,
    };
  }, [persistedActions]);

  // Resolve action
  const resolveMutation = useMutation({
    mutationFn: async ({ actionId, resolution, notes }: { actionId: string; resolution: 'done' | 'dismissed'; notes?: string }) => {
      const { error } = await supabase
        .from('erp_hr_doc_action_queue')
        .update({
          status: resolution,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes ?? null,
        } as any)
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Acción resuelta');
    },
    onError: () => toast.error('Error al resolver acción'),
  });

  // Sync computed actions to DB (dedup by document_id + action_type)
  const syncActions = useCallback(async (
    employeeIdParam: string,
    actions: PendingAction[],
    entityType?: string,
    entityId?: string,
  ) => {
    if (actions.length === 0) return;

    const { data: existing } = await supabase
      .from('erp_hr_doc_action_queue')
      .select('document_id, action_type')
      .eq('employee_id', employeeIdParam)
      .eq('status', 'pending');

    const existingSet = new Set(
      (existing ?? []).map((e: any) => `${e.document_id ?? 'null'}:${e.action_type}`)
    );

    const newActions = actions.filter(a => {
      const key = `${a.document_id ?? 'null'}:${a.action_type}`;
      return !existingSet.has(key);
    });

    if (newActions.length === 0) return;

    const rows = newActions.map(a => ({
      employee_id: employeeIdParam,
      document_id: a.document_id,
      document_type_code: a.document_type_code,
      action_type: a.action_type,
      priority: a.priority,
      source: a.source,
      status: 'pending',
      due_date: a.due_date,
      related_entity_type: entityType ?? null,
      related_entity_id: entityId ?? null,
      context: { reason: a.reason },
    }));

    const { error } = await supabase
      .from('erp_hr_doc_action_queue')
      .insert(rows as any);

    if (error) {
      console.warn('[useHRDocActionQueue] Sync failed:', error.message);
    } else {
      qc.invalidateQueries({ queryKey });
    }
  }, [qc, queryKey]);

  return {
    actions: persistedActions,
    summary,
    isLoading,
    resolveAction: resolveMutation.mutate,
    isResolving: resolveMutation.isPending,
    syncActions,
    computePendingActions,
    enrichAction,
  };
}
