/**
 * useHRCustomConcepts — Hook de dominio para conceptos retributivos personalizados
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRCustomConcept {
  id: string;
  company_id: string | null;
  employee_id: string;
  concept_code: string;
  concept_name: string;
  nature: string;
  concept_type: string;
  calculation_type: string;
  value: number | null;
  formula: string | null;
  algorithm: Record<string, any>;
  priority: number;
  ss_computable: boolean;
  irpf_computable: boolean;
  embargable: boolean;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'hr-custom-concepts';

export function useHRCustomConcepts(filters?: { employeeId?: string; active?: boolean }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('erp_hr_employee_custom_concepts')
        .select('*')
        .order('priority', { ascending: true });

      if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
      if (filters?.active !== undefined) q = q.eq('is_active', filters.active);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HRCustomConcept[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Omit<HRCustomConcept, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('erp_hr_employee_custom_concepts')
        .insert([input])
        .select()
        .single();
      if (error) throw error;
      return data as HRCustomConcept;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Concepto creado');
    },
    onError: () => toast.error('Error al crear concepto'),
  });

  return {
    concepts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
