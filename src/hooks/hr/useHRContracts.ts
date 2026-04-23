/**
 * useHRContracts — Hook de dominio para contratos avanzados (bounded context HR)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRContractAdvanced {
  id: string;
  employee_id: string | null;
  company_id: string | null;
  contract_type: string;
  contract_code: string | null;
  start_date: string;
  end_date: string | null;
  base_salary: number | null;
  annual_salary: number | null;
  working_hours: number | null;
  workday_type: string | null;
  category: string | null;
  professional_group: string | null;
  is_active: boolean | null;
  status: string | null;
  // Advanced fields
  extension_date: string | null;
  extension_count: number | null;
  ss_bonus_code: string | null;
  ss_bonus_percentage: number | null;
  ss_bonus_start: string | null;
  ss_bonus_end: string | null;
  part_time_coefficient: number | null;
  part_time_days_week: Record<string, boolean> | null;
  weekly_hours_distribution: Record<string, number> | null;
  maternity_reincorporation_date: string | null;
  maternity_reserve_until: string | null;
  conversion_from_contract_id: string | null;
  ta2_movement_code: string | null;
  termination_date: string | null;
  termination_type: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// S9.21p — Source of truth contractual + auditoría de incoherencia consciente
export interface HRContractAdvancedS921p extends HRContractAdvanced {
  /** Unidad del importe salarial declarado en contrato. Inmutable ante automatismos cuando incoherent. */
  salary_amount_unit: 'monthly' | 'annual' | null;
  /** Número de pagas anuales pactadas (12-16). Inmutable ante automatismos cuando incoherent. */
  salary_periods_per_year: number | null;
  /** TRUE si las pagas extra están prorrateadas en la mensualidad. Inmutable ante automatismos cuando incoherent. */
  extra_payments_prorated: boolean | null;
  /** Fecha en la que un usuario confirmó conscientemente guardar el contrato con datos incoherentes. */
  manual_incoherence_confirmation_at: string | null;
  /** Usuario que confirmó la incoherencia (resolver con useProfileLookup). */
  manual_incoherence_confirmed_by: string | null;
  /** Tipo de incoherencia confirmada (structural=safeMode obligatorio; soft=legacy con warning). */
  manual_incoherence_confirmation_type: 'structural' | 'soft' | null;
}

const QUERY_KEY = 'hr-contracts-advanced';

export function useHRContracts(filters?: { companyId?: string; status?: string; employeeId?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('erp_hr_contracts')
        .select('*')
        .order('start_date', { ascending: false });

      if (filters?.companyId) q = q.eq('company_id', filters.companyId);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HRContractAdvanced[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HRContractAdvanced> & { id: string }) => {
      const { error } = await supabase
        .from('erp_hr_contracts')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato actualizado');
    },
    onError: () => toast.error('Error al actualizar contrato'),
  });

  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
