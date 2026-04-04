import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEmployeeCustomConcepts(employeeId: string) {
  return useQuery({
    queryKey: ['employee-custom-concepts', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_employee_custom_concepts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('priority', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employeeId,
  });
}

export function useCreateCustomConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (concept: any) => {
      const { data, error } = await supabase.from('erp_hr_employee_custom_concepts').insert(concept).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employee-custom-concepts', vars.employee_id] });
      toast.success('Concepto personalizado creado');
    },
    onError: () => toast.error('Error al crear concepto'),
  });
}

export function useUpdateCustomConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('erp_hr_employee_custom_concepts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-custom-concepts'] });
      toast.success('Concepto actualizado');
    },
  });
}

export function useDeleteCustomConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employee_id }: { id: string; employee_id: string }) => {
      const { error } = await supabase.from('erp_hr_employee_custom_concepts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employee-custom-concepts', vars.employee_id] });
      toast.success('Concepto eliminado');
    },
  });
}
