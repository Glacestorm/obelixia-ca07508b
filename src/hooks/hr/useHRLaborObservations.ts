/**
 * useHRLaborObservations — Hook de dominio para observaciones laborales
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRLaborObservation {
  id: string;
  company_id: string | null;
  employee_id: string;
  contract_id: string | null;
  observation_type: string;
  title: string;
  description: string | null;
  observation_data: Record<string, unknown>;
  effective_date: string | null;
  resolution_date: string | null;
  resolution_notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'hr-labor-observations';

export function useHRLaborObservations(filters?: { employeeId?: string; contractId?: string; status?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('erp_hr_labor_observations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
      if (filters?.contractId) q = q.eq('contract_id', filters.contractId);
      if (filters?.status) q = q.eq('status', filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HRLaborObservation[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<HRLaborObservation>) => {
      const { data, error } = await supabase
        .from('erp_hr_labor_observations')
        .insert([input])
        .select()
        .single();
      if (error) throw error;
      return data as HRLaborObservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Observación registrada');
    },
    onError: () => toast.error('Error al registrar observación'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HRLaborObservation> & { id: string }) => {
      const { error } = await supabase
        .from('erp_hr_labor_observations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Observación actualizada');
    },
    onError: () => toast.error('Error al actualizar observación'),
  });

  return {
    observations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
