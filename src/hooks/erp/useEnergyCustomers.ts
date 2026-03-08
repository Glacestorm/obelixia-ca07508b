import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyCustomer {
  id: string;
  company_id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  contact_person: string | null;
  customer_type: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed (joined)
  cases_count?: number;
}

export function useEnergyCustomers(companyId: string) {
  const [customers, setCustomers] = useState<EnergyCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_customers')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (error) throw error;

      // Get case counts per customer
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('customer_id')
        .eq('company_id', companyId)
        .not('customer_id', 'is', null);

      const countMap = new Map<string, number>();
      (cases || []).forEach((c: any) => {
        countMap.set(c.customer_id, (countMap.get(c.customer_id) || 0) + 1);
      });

      setCustomers((data || []).map(d => ({
        ...(d as EnergyCustomer),
        cases_count: countMap.get(d.id) || 0,
      })));
    } catch (err) {
      console.error('[useEnergyCustomers] error:', err);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createCustomer = useCallback(async (values: Partial<EnergyCustomer>) => {
    try {
      const { data, error } = await supabase
        .from('energy_customers')
        .insert([{ ...values, company_id: companyId }] as any)
        .select()
        .single();
      if (error) throw error;
      const c = data as EnergyCustomer;
      setCustomers(prev => [...prev, { ...c, cases_count: 0 }]);
      toast.success('Cliente creado');
      return c;
    } catch (err) {
      console.error('[useEnergyCustomers] create error:', err);
      toast.error('Error al crear cliente');
      return null;
    }
  }, [companyId]);

  const updateCustomer = useCallback(async (id: string, values: Partial<EnergyCustomer>) => {
    try {
      const { data, error } = await supabase
        .from('energy_customers')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as EnergyCustomer;
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      toast.success('Cliente actualizado');
      return updated;
    } catch (err) {
      toast.error('Error al actualizar cliente');
      return null;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_customers').delete().eq('id', id);
      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente eliminado');
    } catch (err) {
      toast.error('Error al eliminar cliente');
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const s = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.tax_id?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s)
    );
  }, [customers, search]);

  return {
    customers, filtered, loading, search, setSearch,
    fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
  };
}
