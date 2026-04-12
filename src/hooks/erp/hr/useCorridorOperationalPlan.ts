/**
 * useCorridorOperationalPlan.ts — G2.2 Phase 2
 * Orchestration hook: consumes SupervisorResult from useExpatriateSupervisor
 * and produces CorridorOperationalPlan. Includes idempotent task generation.
 *
 * PRINCIPLES:
 * - Hook orchestrates, does not invent data
 * - Task generation with deduplication by assignment + taskType + phase
 * - Preview before creation
 */

import { useMemo, useCallback, useState } from 'react';
import { buildCorridorOperationalPlan, type CorridorOperationalPlan, type SuggestedTask } from '@/engines/erp/hr/corridorOperationalEngine';
import { useExpatriateSupervisor } from '@/hooks/erp/hr/useExpatriateSupervisor';
import type { MobilityAssignment, MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';
import type { TaskCreateData } from '@/hooks/erp/hr/useHRTasksEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseCorridorOperationalPlanResult {
  plan: CorridorOperationalPlan | null;
  isLoading: boolean;
  /** Tasks ready for preview before creation */
  pendingTasks: SuggestedTask[];
  /** Tasks already existing in DB for this assignment */
  existingTaskTypes: Set<string>;
  /** Check which suggested tasks already exist */
  checkExistingTasks: () => Promise<void>;
  /** Create selected tasks idempotently */
  createTasks: (taskIds: string[], companyId: string) => Promise<number>;
  /** Whether we're checking for duplicates */
  isCheckingDuplicates: boolean;
}

export function useCorridorOperationalPlan(
  assignment: MobilityAssignment | null,
  documents: MobilityDocument[] = [],
  companyId?: string,
): UseCorridorOperationalPlanResult {
  const supervisor = useExpatriateSupervisor(assignment, companyId);
  const [existingTaskTypes, setExistingTaskTypes] = useState<Set<string>>(new Set());
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const plan = useMemo(() => {
    if (!assignment || !supervisor) return null;
    return buildCorridorOperationalPlan(supervisor, assignment, documents);
  }, [assignment, supervisor, documents]);

  // Filter out tasks that already exist
  const pendingTasks = useMemo(() => {
    if (!plan) return [];
    return plan.suggestedTasks.filter(t => !existingTaskTypes.has(t.deduplicationKey));
  }, [plan, existingTaskTypes]);

  // Check which tasks already exist in DB for this assignment
  const checkExistingTasks = useCallback(async () => {
    if (!assignment) return;
    setIsCheckingDuplicates(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hr_tasks')
        .select('task_type, metadata')
        .eq('assignment_id', assignment.id)
        .eq('category', 'mobility')
        .in('status', ['pending', 'in_progress']);

      if (error) throw error;

      const existing = new Set<string>();
      for (const row of (data ?? [])) {
        // Reconstruct deduplication key from stored metadata
        const dedupKey = row.metadata?.deduplication_key;
        if (dedupKey) {
          existing.add(dedupKey);
        }
        // Also match by assignment_id + task_type as fallback
        existing.add(`${assignment.id}:${row.task_type}:${row.metadata?.phase ?? 'unknown'}`);
      }
      setExistingTaskTypes(existing);
    } catch (e) {
      console.error('[useCorridorOperationalPlan] checkExistingTasks:', e);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [assignment]);

  // Create tasks idempotently — only creates those not already existing
  const createTasks = useCallback(async (taskIds: string[], companyId: string): Promise<number> => {
    if (!plan || !assignment) return 0;

    const tasksToCreate = plan.suggestedTasks.filter(t => taskIds.includes(t.id));
    if (tasksToCreate.length === 0) return 0;

    // Re-check for duplicates right before creating
    let currentExisting: Set<string>;
    try {
      const { data } = await (supabase as any)
        .from('hr_tasks')
        .select('task_type, metadata')
        .eq('assignment_id', assignment.id)
        .eq('category', 'mobility')
        .in('status', ['pending', 'in_progress']);

      currentExisting = new Set<string>();
      for (const row of (data ?? [])) {
        const dedupKey = row.metadata?.deduplication_key;
        if (dedupKey) currentExisting.add(dedupKey);
        currentExisting.add(`${assignment.id}:${row.task_type}:${row.metadata?.phase ?? 'unknown'}`);
      }
    } catch {
      currentExisting = existingTaskTypes;
    }

    const newTasks = tasksToCreate.filter(t => !currentExisting.has(t.deduplicationKey));
    if (newTasks.length === 0) {
      toast.info('Todas las tareas seleccionadas ya existen');
      return 0;
    }

    const inserts: TaskCreateData[] = newTasks.map(t => ({
      company_id: companyId,
      title: t.title,
      task_type: t.taskType,
      category: t.category as any,
      priority: t.priority as any,
      source_type: 'system' as const,
      assignment_id: assignment.id,
      tags: ['corridor_operational', t.phase],
      metadata: {
        deduplication_key: t.deduplicationKey,
        phase: t.phase,
        provenance: t.provenance,
        condition: t.condition,
        generated_by: 'corridor_operational_engine',
      },
    }));

    try {
      const { error } = await (supabase as any)
        .from('hr_tasks')
        .insert(inserts);

      if (error) throw error;

      // Update local state
      const newKeys = new Set(existingTaskTypes);
      newTasks.forEach(t => newKeys.add(t.deduplicationKey));
      setExistingTaskTypes(newKeys);

      toast.success(`${newTasks.length} tarea(s) creada(s)`);
      return newTasks.length;
    } catch (e) {
      console.error('[useCorridorOperationalPlan] createTasks:', e);
      toast.error('Error al crear tareas');
      return 0;
    }
  }, [plan, assignment, existingTaskTypes]);

  return {
    plan,
    isLoading: !supervisor && !!assignment,
    pendingTasks,
    existingTaskTypes,
    checkExistingTasks,
    createTasks,
    isCheckingDuplicates,
  };
}
