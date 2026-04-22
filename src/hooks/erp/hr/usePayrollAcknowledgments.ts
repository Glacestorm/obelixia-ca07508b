/**
 * usePayrollAcknowledgments — Acuse de recepción de nómina (S9.22).
 * El acuse acredita RECEPCIÓN, no conformidad ni renuncia a reclamación.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PayrollAcknowledgment {
  id: string;
  payroll_record_id: string;
  employee_id: string;
  company_id: string;
  acknowledged_at: string;
  acknowledged_by: string;
  user_agent: string | null;
  ip_hash: string | null;
  notes: string | null;
  created_at: string;
}

interface Args {
  payrollRecordId: string | null;
  employeeId: string;
  companyId: string;
}

export function usePayrollAcknowledgments({ payrollRecordId, employeeId, companyId }: Args) {
  const { user } = useAuth();
  const [ack, setAck] = useState<PayrollAcknowledgment | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAck = useCallback(async () => {
    if (!payrollRecordId || !employeeId) {
      setAck(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hr_payroll_acknowledgments')
        .select('*')
        .eq('payroll_record_id', payrollRecordId)
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (error) throw error;
      setAck((data as PayrollAcknowledgment) || null);
    } catch (err) {
      console.error('[usePayrollAcknowledgments] fetch error:', err);
      setAck(null);
    } finally {
      setLoading(false);
    }
  }, [payrollRecordId, employeeId]);

  useEffect(() => {
    fetchAck();
  }, [fetchAck]);

  const confirmReceipt = useCallback(
    async (notes?: string) => {
      if (!payrollRecordId || !employeeId || !user?.id) {
        toast.error('Falta información para confirmar la recepción');
        return null;
      }
      setSubmitting(true);
      try {
        const { data, error } = await (supabase as any)
          .from('hr_payroll_acknowledgments')
          .insert({
            payroll_record_id: payrollRecordId,
            employee_id: employeeId,
            company_id: companyId,
            acknowledged_by: user.id,
            user_agent: navigator.userAgent,
            notes: notes ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        const fresh = data as PayrollAcknowledgment;
        setAck(fresh);
        toast.success('Recepción del recibo confirmada');
        return fresh;
      } catch (err: any) {
        console.error('[usePayrollAcknowledgments] confirm error:', err);
        if (err?.code === '23505') {
          toast.info('Ya habías confirmado la recepción de este recibo');
          fetchAck();
        } else {
          toast.error('No se pudo registrar la recepción');
        }
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [payrollRecordId, employeeId, companyId, user?.id, fetchAck],
  );

  return { ack, loading, submitting, confirmReceipt, refresh: fetchAck };
}