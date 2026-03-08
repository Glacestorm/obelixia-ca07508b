import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyCase {
  id: string;
  company_id: string;
  customer_id: string | null;
  title: string;
  status: string;
  priority: string;
  assigned_user_id: string | null;
  current_supplier: string | null;
  current_tariff: string | null;
  cups: string | null;
  address: string | null;
  contract_end_date: string | null;
  estimated_monthly_savings: number | null;
  estimated_annual_savings: number | null;
  created_at: string;
  updated_at: string;
}

export interface EnergyCaseFilters {
  search: string;
  status: string;
  priority: string;
  supplier: string;
  assignedUser: string;
}

const DEFAULT_FILTERS: EnergyCaseFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  supplier: 'all',
  assignedUser: 'all',
};

export function useEnergyCases(companyId: string) {
  const [cases, setCases] = useState<EnergyCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<EnergyCaseFilters>(DEFAULT_FILTERS);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('energy_cases')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.supplier !== 'all') {
        query = query.eq('current_supplier', filters.supplier);
      }
      if (filters.assignedUser !== 'all') {
        query = query.eq('assigned_user_id', filters.assignedUser);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,cups.ilike.%${filters.search}%,current_supplier.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setCases((data as EnergyCase[]) || []);
    } catch (err) {
      console.error('[useEnergyCases] fetch error:', err);
      toast.error('Error al cargar expedientes');
    } finally {
      setLoading(false);
    }
  }, [companyId, filters]);

  const createCase = useCallback(async (newCase: Partial<EnergyCase>) => {
    try {
      const { data, error } = await supabase
        .from('energy_cases')
        .insert([{ ...newCase, company_id: companyId }] as any)
        .select()
        .single();
      if (error) throw error;
      setCases(prev => [data as EnergyCase, ...prev]);
      toast.success('Expediente creado');
      return data as EnergyCase;
    } catch (err) {
      console.error('[useEnergyCases] create error:', err);
      toast.error('Error al crear expediente');
      return null;
    }
  }, [companyId]);

  const deleteCase = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_cases').delete().eq('id', id);
      if (error) throw error;
      setCases(prev => prev.filter(c => c.id !== id));
      toast.success('Expediente eliminado');
    } catch (err) {
      toast.error('Error al eliminar expediente');
    }
  }, []);

  useEffect(() => {
    if (companyId) fetchCases();
  }, [fetchCases, companyId]);

  // Extract unique values for filter dropdowns
  const uniqueSuppliers = [...new Set(cases.map(c => c.current_supplier).filter(Boolean))] as string[];
  const uniqueStatuses = [...new Set(cases.map(c => c.status).filter(Boolean))] as string[];

  return {
    cases,
    loading,
    filters,
    setFilters,
    fetchCases,
    createCase,
    deleteCase,
    uniqueSuppliers,
    uniqueStatuses,
  };
}
