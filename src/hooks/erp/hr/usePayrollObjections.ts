/**
 * usePayrollObjections — Reportar incidencia / Solicitar revisión interna (S9.22).
 * Canal interno por RRHH. NO sustituye reclamación previa ni vía judicial.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ObjectionCategory =
  | 'concepto_incorrecto'
  | 'importe_incorrecto'
  | 'concepto_faltante'
  | 'datos_personales'
  | 'otro';

export type ObjectionStatus = 'open' | 'in_review' | 'answered' | 'closed' | 'escalated';

export interface PayrollObjection {
  id: string;
  reference_number: string;
  payroll_record_id: string;
  employee_id: string;
  company_id: string;
  category: ObjectionCategory;
  subject: string;
  description: string;
  status: ObjectionStatus;
  attachments: any;
  hr_response: string | null;
  hr_responded_by: string | null;
  hr_responded_at: string | null;
  closed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Args {
  payrollRecordId?: string | null;
  employeeId: string;
  companyId: string;
}

export function usePayrollObjections({ payrollRecordId, employeeId, companyId }: Args) {
  const { user } = useAuth();
  const [items, setItems] = useState<PayrollObjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      let q = (supabase as any)
        .from('hr_payroll_objections')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (payrollRecordId) {
        q = q.eq('payroll_record_id', payrollRecordId);
      }
      const { data, error } = await q;
      if (error) throw error;
      setItems((data || []) as PayrollObjection[]);
    } catch (err) {
      console.error('[usePayrollObjections] fetch error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, payrollRecordId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const create = useCallback(
    async (params: {
      payrollRecordId: string;
      category: ObjectionCategory;
      subject: string;
      description: string;
      attachments?: any[];
    }) => {
      if (!user?.id || !employeeId) {
        toast.error('Sesión no disponible');
        return null;
      }
      setSubmitting(true);
      try {
        const { data, error } = await (supabase as any)
          .from('hr_payroll_objections')
          .insert({
            payroll_record_id: params.payrollRecordId,
            employee_id: employeeId,
            company_id: companyId,
            category: params.category,
            subject: params.subject,
            description: params.description,
            status: 'open',
            attachments: params.attachments || [],
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        const fresh = data as PayrollObjection;
        setItems((prev) => [fresh, ...prev]);
        // Timeline (best-effort, non-blocking)
        try {
          await (supabase as any)
            .from('hr_payroll_objection_events')
            .insert({
              objection_id: fresh.id,
              event_type: 'created',
              actor_id: user.id,
              actor_role: 'employee',
              message: params.subject,
            });
        } catch (e) {
          console.warn('[usePayrollObjections] event create failed:', e);
        }
        toast.success(`Incidencia registrada: ${fresh.reference_number}`);
        return fresh;
      } catch (err) {
        console.error('[usePayrollObjections] create error:', err);
        toast.error('No se pudo registrar la incidencia');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [user?.id, employeeId, companyId],
  );

  const reopen = useCallback(
    async (objectionId: string) => {
      try {
        const { error } = await (supabase as any)
          .from('hr_payroll_objections')
          .update({ status: 'open', closed_at: null })
          .eq('id', objectionId)
          .eq('employee_id', employeeId);
        if (error) throw error;
        if (user?.id) {
          try {
            await (supabase as any)
              .from('hr_payroll_objection_events')
              .insert({
                objection_id: objectionId,
                event_type: 'reopened',
                actor_id: user.id,
                actor_role: 'employee',
              });
          } catch (e) { console.warn('[usePayrollObjections] event reopen failed:', e); }
        }
        toast.success('Incidencia reabierta');
        fetchItems();
      } catch (err) {
        console.error('[usePayrollObjections] reopen error:', err);
        toast.error('No se pudo reabrir');
      }
    },
    [employeeId, fetchItems, user?.id],
  );

  const closeAsResolved = useCallback(
    async (objectionId: string) => {
      try {
        const { error } = await (supabase as any)
          .from('hr_payroll_objections')
          .update({ status: 'closed', closed_at: new Date().toISOString() })
          .eq('id', objectionId)
          .eq('employee_id', employeeId);
        if (error) throw error;
        if (user?.id) {
          try {
            await (supabase as any)
              .from('hr_payroll_objection_events')
              .insert({
                objection_id: objectionId,
                event_type: 'closed',
                actor_id: user.id,
                actor_role: 'employee',
                message: 'Marcada como resuelta por el empleado',
              });
          } catch (e) { console.warn('[usePayrollObjections] event close failed:', e); }
        }
        toast.success('Incidencia cerrada');
        fetchItems();
      } catch (err) {
        console.error('[usePayrollObjections] close error:', err);
        toast.error('No se pudo cerrar');
      }
    },
    [employeeId, fetchItems, user?.id],
  );

  return { items, loading, submitting, create, reopen, closeAsResolved, refresh: fetchItems };
}