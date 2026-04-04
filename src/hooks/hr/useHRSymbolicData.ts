/**
 * useHRSymbolicData — Hook para datos simbólicos del empleado
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HREmployeeSymbolicData } from '@/types/hr';

export function useHRSymbolicData(companyId: string | undefined) {
  const [symbols, setSymbols] = useState<HREmployeeSymbolicData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSymbols = useCallback(async (employeeId: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_symbolic_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .order('symbol_name', { ascending: true });
      if (error) throw error;
      setSymbols((data || []) as unknown as HREmployeeSymbolicData[]);
    } catch (err) {
      console.error('[useHRSymbolicData] fetch error:', err);
      toast.error('Error cargando datos simbólicos');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const upsertSymbol = useCallback(async (symbol: Partial<HREmployeeSymbolicData>) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_symbolic_data')
        .upsert([{ ...symbol, company_id: companyId } as any], {
          onConflict: 'company_id,employee_id,symbol_name,valid_from',
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Dato simbólico guardado');
      if (symbol.employee_id) await fetchSymbols(symbol.employee_id);
      return data;
    } catch (err) {
      toast.error('Error al guardar dato simbólico');
      return null;
    }
  }, [companyId, fetchSymbols]);

  const deleteSymbol = useCallback(async (id: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_employee_symbolic_data')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Dato simbólico eliminado');
      await fetchSymbols(employeeId);
      return true;
    } catch (err) {
      toast.error('Error al eliminar');
      return false;
    }
  }, [fetchSymbols]);

  return { symbols, isLoading, fetchSymbols, upsertSymbol, deleteSymbol };
}
