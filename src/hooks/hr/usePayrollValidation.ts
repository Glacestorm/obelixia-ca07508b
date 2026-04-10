import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractErrorMessage } from '@/lib/hr/extractErrorMessage';

export function useValidatePayrollCycle() {
  return useMutation({
    mutationFn: async (payload: { company_id: string; period_year: number; period_month: number }) => {
      const { data, error } = await supabase.functions.invoke('payroll-calculation-engine', {
        body: { action: 'get_legal_validations_batch', ...payload },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(extractErrorMessage(data, 'Error en validación'));
      return (data.data ?? data) as { total: number; errors: number; warnings: number; validations_by_employee: Record<string, any[]> };
    },
  });
}

export function useCalculatePayroll() {
  return useMutation({
    mutationFn: async (payload: { company_id: string; employee_id: string; period_year: number; period_month: number }) => {
      const { data, error } = await supabase.functions.invoke('payroll-calculation-engine', {
        body: { action: 'calculate_payroll', ...payload },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(extractErrorMessage(data, 'Error en cálculo'));
      return data.data ?? data;
    },
  });
}
