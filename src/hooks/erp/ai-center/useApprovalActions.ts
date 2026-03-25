import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useApprovalActions(onAction?: () => void) {
  const { user } = useAuth();

  const approve = useCallback(async (queueItemId: string) => {
    if (!user?.id) return;

    const { error: decError } = await supabase
      .from('erp_ai_approval_decisions')
      .insert({
        queue_item_id: queueItemId,
        decision: 'approved',
        decided_by: user.id,
      });

    if (decError) {
      toast.error('Error al registrar decisión');
      return;
    }

    const { error } = await supabase
      .from('erp_ai_approval_queue')
      .update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', queueItemId);

    if (error) {
      toast.error('Error al aprobar');
      return;
    }

    toast.success('Tarea aprobada');
    onAction?.();
  }, [user?.id, onAction]);

  const reject = useCallback(async (queueItemId: string, reason: string) => {
    if (!user?.id) return;

    const { error: decError } = await supabase
      .from('erp_ai_approval_decisions')
      .insert({
        queue_item_id: queueItemId,
        decision: 'rejected',
        decided_by: user.id,
        reason,
      });

    if (decError) {
      toast.error('Error al registrar decisión');
      return;
    }

    const { error } = await supabase
      .from('erp_ai_approval_queue')
      .update({ status: 'rejected', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', queueItemId);

    if (error) {
      toast.error('Error al rechazar');
      return;
    }

    toast.success('Tarea rechazada');
    onAction?.();
  }, [user?.id, onAction]);

  const escalate = useCallback(async (queueItemId: string) => {
    if (!user?.id) return;

    const { error: decError } = await supabase
      .from('erp_ai_approval_decisions')
      .insert({
        queue_item_id: queueItemId,
        decision: 'escalated',
        decided_by: user.id,
        reason: 'Escalado manualmente',
      });

    if (decError) {
      toast.error('Error al registrar decisión');
      return;
    }

    const { error } = await supabase
      .from('erp_ai_approval_queue')
      .update({ status: 'escalated', semaphore: 'red', priority: 10 })
      .eq('id', queueItemId);

    if (error) {
      toast.error('Error al escalar');
      return;
    }

    toast.success('Tarea escalada');
    onAction?.();
  }, [user?.id, onAction]);

  const force = useCallback(async (queueItemId: string) => {
    if (!user?.id) return;

    const { error: decError } = await supabase
      .from('erp_ai_approval_decisions')
      .insert({
        queue_item_id: queueItemId,
        decision: 'forced',
        decided_by: user.id,
        reason: 'Ejecución forzada por administrador',
      });

    if (decError) {
      toast.error('Error al registrar decisión');
      return;
    }

    const { error } = await supabase
      .from('erp_ai_approval_queue')
      .update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: user.id, metadata: { forced: true } })
      .eq('id', queueItemId);

    if (error) {
      toast.error('Error al forzar');
      return;
    }

    toast.warning('Tarea forzada');
    onAction?.();
  }, [user?.id, onAction]);

  return { approve, reject, escalate, force };
}

export default useApprovalActions;
