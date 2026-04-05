/**
 * useHRMultiEmployment — Hook de dominio para pluriempleo/pluriactividad
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRMultiEmployment {
  id: string;
  company_id: string | null;
  employee_id: string;
  multi_type: string;
  authorization_date: string | null;
  authorization_number: string | null;
  other_employer_name: string | null;
  other_employer_ccc: string | null;
  other_employer_activity: string | null;
  base_distribution_own: number | null;
  base_distribution_other: number | null;
  own_weekly_hours: number | null;
  other_weekly_hours: number | null;
  solidarity_rate: number | null;
  solidarity_bracket: number | null;
  solidarity_amount: number | null;
  reimbursement_right: boolean;
  reimbursement_amount: number | null;
  effective_from: string;
  effective_to: string | null;
  status: string;
  calculation_details: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'hr-multi-employment';

export function useHRMultiEmployment(filters?: { employeeId?: string; status?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('erp_hr_multi_employment')
        .select('*')
        .order('effective_from', { ascending: false });

      if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
      if (filters?.status) q = q.eq('status', filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HRMultiEmployment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<HRMultiEmployment>) => {
      const { data, error } = await supabase
        .from('erp_hr_multi_employment')
        .insert([input as any])
        .select()
        .single();
      if (error) throw error;
      return data as HRMultiEmployment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Registro de pluriempleo creado');
    },
    onError: () => toast.error('Error al crear registro'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HRMultiEmployment> & { id: string }) => {
      const { error } = await supabase
        .from('erp_hr_multi_employment')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Registro actualizado');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
