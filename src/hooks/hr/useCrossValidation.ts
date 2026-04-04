import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CrossValidationInput {
  employee: { id: string; cotization_group: number; cotization_base: number; irpf_rate: number };
  contract: { type: string; part_time_coeff: number; bonus_code?: string; time_record_mandatory?: boolean };
  ss: { group: number; regime: string };
  irpf: { current_rate: number; personal_situation: string; descendants: number };
  observations?: { ta2_reason?: string; substitute_naf?: string };
}

export interface CrossValidationResult {
  code: string; severity: 'error' | 'warning' | 'info';
  message: string; norm: string; suggestion: string;
}

export function useCrossValidation(employeeId: string) {
  return useQuery({
    queryKey: ['cross-validation', employeeId],
    queryFn: async () => {
      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      if (!emp) return [];
      
      const { validateEmployee } = await import('@/lib/hr/crossValidationEngine');
      return validateEmployee({
        employee: { id: emp.id, cotization_group: emp.cotization_group ?? 7, cotization_base: emp.base_salary ?? 2000, irpf_rate: emp.irpf_rate ?? 15 },
        contract: { type: emp.contract_type ?? 'indefinido', part_time_coeff: emp.part_time_coefficient ?? 1 },
        ss: { group: emp.cotization_group ?? 7, regime: 'general' },
        irpf: { current_rate: emp.irpf_rate ?? 15, personal_situation: '1', descendants: 0 },
      });
    },
    enabled: !!employeeId,
  });
}
