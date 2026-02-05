/**
 * Email Sequences Hook - Phase 1
 * Manages automated email sequences and enrollments
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface EmailSequenceStep {
  order: number;
  type: 'email' | 'wait' | 'condition' | 'action';
  template_id?: string;
  delay_days: number;
  delay_hours: number;
  conditions?: SequenceCondition[];
  action?: SequenceAction;
}

export interface SequenceCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less';
  value: string;
  logic?: 'AND' | 'OR';
}

export interface SequenceAction {
  type: 'add_tag' | 'remove_tag' | 'update_field' | 'create_task' | 'notify';
  config: Record<string, unknown>;
}

export interface EmailSequence {
  id: string;
  company_id: string | null;
  campaign_id: string | null;
  name: string;
  description: string | null;
  trigger_type: 'form_submit' | 'tag_added' | 'deal_stage' | 'contact_created' | 'manual' | 'date_based';
  trigger_config: Record<string, unknown>;
  steps: EmailSequenceStep[];
  is_active: boolean;
  stats: SequenceStats;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SequenceStats {
  enrolled?: number;
  completed?: number;
  dropped?: number;
  converted?: number;
  in_progress?: number;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  current_step: number;
  status: 'active' | 'completed' | 'paused' | 'dropped' | 'converted';
  enrolled_at: string;
  last_step_at: string | null;
  next_step_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// === HOOK ===
export function useEmailSequences(companyId?: string) {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH SEQUENCES ===
  const fetchSequences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('crm_email_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => ({
        ...row,
        steps: (row.steps || []) as unknown as EmailSequenceStep[],
        trigger_config: (row.trigger_config || {}) as Record<string, unknown>,
        stats: (row.stats || {}) as SequenceStats,
        trigger_type: row.trigger_type as EmailSequence['trigger_type'],
      })) as EmailSequence[];

      setSequences(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching sequences';
      setError(message);
      console.error('[useEmailSequences] fetchSequences error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === CREATE SEQUENCE ===
  const createSequence = useCallback(async (
    sequence: Partial<EmailSequence>
  ): Promise<EmailSequence | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('crm_email_sequences')
        .insert([{
          name: sequence.name,
          description: sequence.description,
          campaign_id: sequence.campaign_id,
          trigger_type: sequence.trigger_type,
          company_id: sequence.company_id || companyId,
          created_by: userData.user?.id,
          is_active: false,
          steps: JSON.parse(JSON.stringify(sequence.steps || [])),
          trigger_config: JSON.parse(JSON.stringify(sequence.trigger_config || {})),
          stats: {},
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const newSequence = {
        ...data,
        steps: (data.steps || []) as unknown as EmailSequenceStep[],
        trigger_config: (data.trigger_config || {}) as Record<string, unknown>,
        stats: (data.stats || {}) as SequenceStats,
        trigger_type: data.trigger_type as EmailSequence['trigger_type'],
      } as EmailSequence;
      setSequences(prev => [newSequence, ...prev]);
      toast.success('Secuencia creada correctamente');
      return newSequence;
    } catch (err) {
      console.error('[useEmailSequences] createSequence error:', err);
      toast.error('Error al crear la secuencia');
      return null;
    }
  }, [companyId]);

  // === UPDATE SEQUENCE ===
  const updateSequence = useCallback(async (
    id: string,
    updates: Partial<EmailSequence>
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.steps) updateData.steps = JSON.parse(JSON.stringify(updates.steps));
      if (updates.stats) updateData.stats = JSON.parse(JSON.stringify(updates.stats));
      if (updates.trigger_config) updateData.trigger_config = JSON.parse(JSON.stringify(updates.trigger_config));
      
      const { error: updateError } = await supabase
        .from('crm_email_sequences')
        .update(updateData as any)
        .eq('id', id);

      if (updateError) throw updateError;

      setSequences(prev => prev.map(s => 
        s.id === id ? { ...s, ...updates } : s
      ));
      toast.success('Secuencia actualizada');
      return true;
    } catch (err) {
      console.error('[useEmailSequences] updateSequence error:', err);
      toast.error('Error al actualizar la secuencia');
      return false;
    }
  }, []);

  // === DELETE SEQUENCE ===
  const deleteSequence = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_email_sequences')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSequences(prev => prev.filter(s => s.id !== id));
      toast.success('Secuencia eliminada');
      return true;
    } catch (err) {
      console.error('[useEmailSequences] deleteSequence error:', err);
      toast.error('Error al eliminar la secuencia');
      return false;
    }
  }, []);

  // === TOGGLE ACTIVE ===
  const toggleActive = useCallback(async (
    id: string,
    isActive: boolean
  ): Promise<boolean> => {
    return updateSequence(id, { is_active: isActive });
  }, [updateSequence]);

  // === ADD STEP ===
  const addStep = useCallback(async (
    sequenceId: string,
    step: Partial<EmailSequenceStep>
  ): Promise<boolean> => {
    const sequence = sequences.find(s => s.id === sequenceId);
    if (!sequence) return false;

    const newStep: EmailSequenceStep = {
      order: sequence.steps.length + 1,
      type: step.type || 'email',
      delay_days: step.delay_days || 0,
      delay_hours: step.delay_hours || 0,
      ...step,
    };

    return updateSequence(sequenceId, {
      steps: [...sequence.steps, newStep],
    });
  }, [sequences, updateSequence]);

  // === REMOVE STEP ===
  const removeStep = useCallback(async (
    sequenceId: string,
    stepOrder: number
  ): Promise<boolean> => {
    const sequence = sequences.find(s => s.id === sequenceId);
    if (!sequence) return false;

    const updatedSteps = sequence.steps
      .filter(s => s.order !== stepOrder)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    return updateSequence(sequenceId, { steps: updatedSteps });
  }, [sequences, updateSequence]);

  // === ENROLL CONTACT ===
  const enrollContact = useCallback(async (
    sequenceId: string,
    contactId: string
  ): Promise<SequenceEnrollment | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('crm_sequence_enrollments')
        .insert([{
          sequence_id: sequenceId,
          contact_id: contactId,
          current_step: 1,
          status: 'active',
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const enrollment = data as SequenceEnrollment;
      setEnrollments(prev => [enrollment, ...prev]);
      toast.success('Contacto inscrito en la secuencia');
      return enrollment;
    } catch (err) {
      console.error('[useEmailSequences] enrollContact error:', err);
      toast.error('Error al inscribir el contacto');
      return null;
    }
  }, []);

  // === UNENROLL CONTACT ===
  const unenrollContact = useCallback(async (
    sequenceId: string,
    contactId: string
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('crm_sequence_enrollments')
        .update({ status: 'dropped' })
        .eq('sequence_id', sequenceId)
        .eq('contact_id', contactId);

      if (updateError) throw updateError;

      setEnrollments(prev => prev.map(e => 
        e.sequence_id === sequenceId && e.contact_id === contactId
          ? { ...e, status: 'dropped' as const }
          : e
      ));
      toast.success('Contacto dado de baja de la secuencia');
      return true;
    } catch (err) {
      console.error('[useEmailSequences] unenrollContact error:', err);
      toast.error('Error al dar de baja el contacto');
      return false;
    }
  }, []);

  // === FETCH ENROLLMENTS ===
  const fetchEnrollments = useCallback(async (sequenceId?: string) => {
    try {
      let query = supabase
        .from('crm_sequence_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false });

      if (sequenceId) {
        query = query.eq('sequence_id', sequenceId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEnrollments((data || []) as SequenceEnrollment[]);
      return data as SequenceEnrollment[];
    } catch (err) {
      console.error('[useEmailSequences] fetchEnrollments error:', err);
      return [];
    }
  }, []);

  // === GET SEQUENCE TEMPLATES ===
  const getSequenceTemplates = useCallback((): Partial<EmailSequence>[] => {
    return [
      {
        name: 'Bienvenida Nuevos Leads',
        description: 'Secuencia de 3 emails para nuevos leads',
        trigger_type: 'contact_created',
        steps: [
          { order: 1, type: 'email', delay_days: 0, delay_hours: 1 },
          { order: 2, type: 'wait', delay_days: 2, delay_hours: 0 },
          { order: 3, type: 'email', delay_days: 0, delay_hours: 0 },
          { order: 4, type: 'wait', delay_days: 3, delay_hours: 0 },
          { order: 5, type: 'email', delay_days: 0, delay_hours: 0 },
        ],
      },
      {
        name: 'Follow-up Post Demo',
        description: 'Seguimiento después de demo comercial',
        trigger_type: 'deal_stage',
        trigger_config: { stage: 'demo_completed' },
        steps: [
          { order: 1, type: 'email', delay_days: 1, delay_hours: 0 },
          { order: 2, type: 'wait', delay_days: 3, delay_hours: 0 },
          { order: 3, type: 'condition', delay_days: 0, delay_hours: 0, conditions: [{ field: 'email_opened', operator: 'equals', value: 'false' }] },
          { order: 4, type: 'email', delay_days: 0, delay_hours: 0 },
        ],
      },
      {
        name: 'Re-engagement Inactivos',
        description: 'Recuperar contactos sin actividad',
        trigger_type: 'date_based',
        trigger_config: { days_inactive: 30 },
        steps: [
          { order: 1, type: 'email', delay_days: 0, delay_hours: 0 },
          { order: 2, type: 'wait', delay_days: 7, delay_hours: 0 },
          { order: 3, type: 'email', delay_days: 0, delay_hours: 0 },
        ],
      },
    ];
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  return {
    sequences,
    enrollments,
    isLoading,
    error,
    fetchSequences,
    createSequence,
    updateSequence,
    deleteSequence,
    toggleActive,
    addStep,
    removeStep,
    enrollContact,
    unenrollContact,
    fetchEnrollments,
    getSequenceTemplates,
  };
}

export default useEmailSequences;
