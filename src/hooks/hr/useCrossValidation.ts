import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { validateEmployee, type CrossValidationResult } from '@/lib/hr/crossValidationEngine';

export function useCrossValidation(employeeId: string) {
  return useQuery({
    queryKey: ['cross-validation', employeeId],
    queryFn: async (): Promise<CrossValidationResult[]> => {
      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      if (!emp) return [];
      
      const e = emp as Record<string, any>; // Tipado mínimo seguro
      return validateEmployee({
        employee: { id: e.id, cotization_group: e.cotization_group ?? 7, cotization_base: e.base_salary ?? 2000, irpf_rate: e.irpf_rate ?? 15 },
        contract: { type: e.contract_type ?? 'indefinido', part_time_coeff: e.part_time_coefficient ?? 1 },
        ss: { group: e.cotization_group ?? 7, regime: 'general' },
        irpf: { current_rate: e.irpf_rate ?? 15, personal_situation: '1', descendants: 0 },
      });
    },
    enabled: !!employeeId,
  });
}
