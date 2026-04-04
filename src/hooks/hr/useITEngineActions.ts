import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function callITEngine(action: string, payload: object) {
  const { data, error } = await supabase.functions.invoke('payroll-it-engine', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Error en payroll-it-engine');
  return data;
}

export function useCreateITProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { company_id: string; employee_id: string; data: object }) =>
      callITEngine('create_process', payload),
    onSuccess: (_, { employee_id }) => {
      qc.invalidateQueries({ queryKey: ['hr-it-processes', employee_id] });
      qc.invalidateQueries({ queryKey: ['hr-audit-findings'] });
    },
  });
}

export function useAddITPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { company_id: string; process_id: string; data: object }) =>
      callITEngine('add_part', payload),
    onSuccess: (_, { process_id }) => {
      qc.invalidateQueries({ queryKey: ['hr-it-parts', process_id] });
    },
  });
}

export function useCalculateITBase() {
  return useMutation({
    mutationFn: (payload: { company_id: string; process_id: string; employee_id: string }) =>
      callITEngine('calculate_base', payload),
  });
}

export function useCheckITMilestones() {
  return useMutation({
    mutationFn: (company_id: string) => callITEngine('check_milestones', { company_id }),
  });
}
