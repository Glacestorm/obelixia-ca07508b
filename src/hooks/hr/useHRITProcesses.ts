import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HRITProcess, HRITPart, HRITBase } from '@/types/hr';

// ─── QUERIES ────────────────────────────────────────────────

export function useITProcesses(companyId: string | undefined, filters?: {
  employee_id?: string; status?: string; process_type?: string;
}) {
  return useQuery({
    queryKey: ['hr-it-processes', companyId, filters],
    queryFn: async (): Promise<HRITProcess[]> => {
      if (!companyId) return [];
      let q = supabase.from('erp_hr_it_processes').select('*')
        .eq('company_id', companyId).order('start_date', { ascending: false });
      if (filters?.employee_id) q = q.eq('employee_id', filters.employee_id);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.process_type) q = q.eq('process_type', filters.process_type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HRITProcess[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

export function useITParts(processId: string | undefined) {
  return useQuery({
    queryKey: ['hr-it-parts', processId],
    queryFn: async (): Promise<HRITPart[]> => {
      if (!processId) return [];
      const { data, error } = await supabase.from('erp_hr_it_parts').select('*')
        .eq('process_id', processId).order('issue_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HRITPart[];
    },
    enabled: !!processId,
  });
}

export function useITBases(processId: string | undefined) {
  return useQuery({
    queryKey: ['hr-it-bases', processId],
    queryFn: async (): Promise<HRITBase[]> => {
      if (!processId) return [];
      const { data, error } = await supabase.from('erp_hr_it_bases').select('*')
        .eq('process_id', processId).order('calculation_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HRITBase[];
    },
    enabled: !!processId,
  });
}

// ─── MUTATIONS ──────────────────────────────────────────────

export function useCreateITProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (process: Partial<HRITProcess>) => {
      const start = new Date(process.start_date!);
      const addDays = (d: Date, n: number) => { const r=new Date(d); r.setDate(r.getDate()+n); return r.toISOString().split('T')[0]; };
      const payload = {
        ...process,
        milestone_365_date: addDays(start, 365),
        milestone_545_date: addDays(start, 545),
      };
      const { data, error } = await supabase.from('erp_hr_it_processes')
        .insert([payload as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-it-processes'] });
      toast.success('Proceso IT creado');
    },
    onError: (err: any) => toast.error(`Error al crear proceso IT: ${err.message}`),
  });
}

export function useUpdateITProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<HRITProcess>) => {
      const { error } = await supabase.from('erp_hr_it_processes').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-it-processes'] }); toast.success('Proceso IT actualizado'); },
    onError: (err: any) => toast.error(`Error al actualizar: ${err.message}`),
  });
}

export function useCreateITPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (part: Partial<HRITPart> & { company_id: string }) => {
      const { data, error } = await supabase.from('erp_hr_it_parts').insert([part as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['hr-it-parts', data?.process_id] });
      toast.success('Parte registrado');
    },
    onError: (err: any) => toast.error(`Error al registrar parte: ${err.message}`),
  });
}

export function useUpsertITBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (base: Partial<HRITBase> & { company_id: string }) => {
      const { data, error } = await supabase.from('erp_hr_it_bases').upsert([base as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => { qc.invalidateQueries({ queryKey: ['hr-it-bases', data?.process_id] }); },
    onError: (err: any) => toast.error(`Error al calcular base: ${err.message}`),
  });
}

// ─── LEGACY COMPAT (para no romper componentes que usen el hook viejo) ──────
// Los componentes que llamen a useHRITProcesses(companyId) seguirán funcionando.
export function useHRITProcesses(companyId: string | undefined) {
  const processesQuery = useITProcesses(companyId);
  const createMutation = useCreateITProcess();
  const updateMutation = useUpdateITProcess();
  const partMutation = useCreateITPart();
  const baseMutation = useUpsertITBase();

  return {
    processes: processesQuery.data ?? [],
    parts: [] as HRITPart[],
    bases: [] as HRITBase[],
    isLoading: processesQuery.isLoading,
    fetchProcesses: (filters?: { employee_id?: string; status?: string; process_type?: string }) => processesQuery.refetch(),
    fetchParts: async (_: string) => {},
    fetchBases: async (_: string) => {},
    createProcess: async (p: Partial<HRITProcess>) => { const r = await createMutation.mutateAsync({ ...p, company_id: companyId } as any); return r ?? null; },
    updateProcess: async (id: string, updates: Partial<HRITProcess>): Promise<boolean> => { try { await updateMutation.mutateAsync({ id, ...updates }); return true; } catch { return false; } },
    createPart: async (part: Partial<HRITPart>) => { const r = await partMutation.mutateAsync({ ...part, company_id: companyId! } as any); return r ?? null; },
    upsertBase: async (base: Partial<HRITBase>) => { const r = await baseMutation.mutateAsync({ ...base, company_id: companyId! } as any); return r ?? null; },
    saveBase: async (base: Partial<HRITBase>) => { const r = await baseMutation.mutateAsync({ ...base, company_id: companyId! } as any); return r ?? null; },
  };
}
