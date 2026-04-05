import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function callSupervisor(action: string, payload: object) {
  const { data, error } = await supabase.functions.invoke('payroll-supervisor', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Error en payroll-supervisor');
  return data;
}

export function useCurrentCycle(companyId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['payroll-cycle', companyId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_audit_nomina_cycles')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_year', year)
        .eq('period_month', month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
    enabled: !!companyId,
  });
}

export function useCycleHistory(companyId: string) {
  return useQuery({
    queryKey: ['payroll-cycles-history', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_audit_nomina_cycles')
        .select('*')
        .eq('company_id', companyId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useStartCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { company_id: string; period_year: number; period_month: number }) =>
      callSupervisor('start_cycle', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-cycle'] }),
  });
}

export function useAdvanceCycleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { company_id: string; cycle_id: string; new_status?: string; actor_id: string }) =>
      callSupervisor('advance_status', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-cycle'] }),
  });
}

export function useCycleKPIs(companyId: string) {
  return useQuery({
    queryKey: ['payroll-kpis', companyId],
    queryFn: () => callSupervisor('get_kpis', { company_id: companyId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!companyId,
  });
}
