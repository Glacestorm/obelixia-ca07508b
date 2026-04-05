/**
 * useHRGarnishments — Hook de dominio para embargos judiciales
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRGarnishment {
  id: string;
  employee_id: string;
  procedure_number: string;
  court_name: string | null;
  court_type: string;
  beneficiary_name: string | null;
  beneficiary_id_number: string | null;
  garnishment_type: string;
  priority_order: number;
  total_amount: number | null;
  monthly_cap: number | null;
  accumulated_paid: number | null;
  remaining_amount: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  art608_alimentos: boolean;
  cargas_familiares: number;
  conceptos_embargables_100pct: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'hr-garnishments';

export function useHRGarnishments(filters?: { status?: string; employeeId?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('erp_hr_garnishments')
        .select('*')
        .order('priority_order', { ascending: true });

      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HRGarnishment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Omit<HRGarnishment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('erp_hr_garnishments')
        .insert([input])
        .select()
        .single();
      if (error) throw error;
      return data as HRGarnishment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Embargo registrado');
    },
    onError: () => toast.error('Error al registrar embargo'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HRGarnishment> & { id: string }) => {
      const { error } = await supabase
        .from('erp_hr_garnishments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Embargo actualizado');
    },
    onError: () => toast.error('Error al actualizar embargo'),
  });

  return {
    garnishments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
