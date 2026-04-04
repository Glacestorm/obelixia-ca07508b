/**
 * useHRITProcesses — Hook para gestión de procesos IT
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HRITProcess, HRITPart, HRITBase } from '@/types/hr';

export function useHRITProcesses(companyId: string | undefined) {
  const [processes, setProcesses] = useState<HRITProcess[]>([]);
  const [parts, setParts] = useState<HRITPart[]>([]);
  const [bases, setBases] = useState<HRITBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProcesses = useCallback(async (filters?: {
    employee_id?: string;
    status?: string;
    process_type?: string;
  }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_it_processes')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.process_type) query = query.eq('process_type', filters.process_type);

      const { data, error } = await query;
      if (error) throw error;
      setProcesses((data || []) as unknown as HRITProcess[]);
    } catch (err) {
      console.error('[useHRITProcesses] fetchProcesses error:', err);
      toast.error('Error cargando procesos IT');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchParts = useCallback(async (processId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_it_parts')
        .select('*')
        .eq('process_id', processId)
        .order('issue_date', { ascending: true });
      if (error) throw error;
      setParts((data || []) as unknown as HRITPart[]);
    } catch (err) {
      console.error('[useHRITProcesses] fetchParts error:', err);
    }
  }, []);

  const fetchBases = useCallback(async (processId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_it_bases')
        .select('*')
        .eq('process_id', processId)
        .order('calculation_date', { ascending: false });
      if (error) throw error;
      setBases((data || []) as unknown as HRITBase[]);
    } catch (err) {
      console.error('[useHRITProcesses] fetchBases error:', err);
    }
  }, []);

  const createProcess = useCallback(async (process: Partial<HRITProcess>) => {
    if (!companyId) return null;
    try {
      // Calculate milestone dates
      const startDate = new Date(process.start_date!);
      const m365 = new Date(startDate);
      m365.setDate(m365.getDate() + 365);
      const m545 = new Date(startDate);
      m545.setDate(m545.getDate() + 545);

      const { data, error } = await supabase
        .from('erp_hr_it_processes')
        .insert([{
          ...process,
          company_id: companyId,
          milestone_365_date: m365.toISOString().split('T')[0],
          milestone_545_date: m545.toISOString().split('T')[0],
        } as any])
        .select()
        .single();
      if (error) throw error;
      toast.success('Proceso IT creado');
      await fetchProcesses();
      return data;
    } catch (err) {
      console.error('[useHRITProcesses] createProcess error:', err);
      toast.error('Error al crear proceso IT');
      return null;
    }
  }, [companyId, fetchProcesses]);

  const updateProcess = useCallback(async (id: string, updates: Partial<HRITProcess>) => {
    try {
      const { error } = await supabase
        .from('erp_hr_it_processes')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Proceso IT actualizado');
      await fetchProcesses();
      return true;
    } catch (err) {
      toast.error('Error al actualizar proceso IT');
      return false;
    }
  }, [fetchProcesses]);

  const createPart = useCallback(async (part: Partial<HRITPart>) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase
        .from('erp_hr_it_parts')
        .insert([{ ...part, company_id: companyId } as any])
        .select()
        .single();
      if (error) throw error;
      toast.success(`Parte de ${part.part_type} registrado`);
      if (part.process_id) await fetchParts(part.process_id);
      return data;
    } catch (err) {
      toast.error('Error al registrar parte');
      return null;
    }
  }, [companyId, fetchParts]);

  const saveBase = useCallback(async (base: Partial<HRITBase>) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase
        .from('erp_hr_it_bases')
        .insert([{ ...base, company_id: companyId } as any])
        .select()
        .single();
      if (error) throw error;
      toast.success('Base reguladora calculada y guardada');
      if (base.process_id) await fetchBases(base.process_id);
      return data;
    } catch (err) {
      toast.error('Error al guardar base reguladora');
      return null;
    }
  }, [companyId, fetchBases]);

  return {
    processes, parts, bases, isLoading,
    fetchProcesses, fetchParts, fetchBases,
    createProcess, updateProcess, createPart, saveBase,
  };
}
