/**
 * useEmployeePortal — Hook principal del Portal del Empleado
 * V2-ES.9: Obtiene datos del empleado autenticado via user_id mapping
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EmployeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department_id: string | null;
  company_id: string;
  employee_code: string | null;
  employee_number: string | null;
  hire_date: string;
  status: string | null;
  category: string | null;
  contract_type: string | null;
  national_id: string | null;
  base_salary: number | null;
}

export interface EmployeePortalState {
  employee: EmployeeProfile | null;
  isLoading: boolean;
  error: string | null;
  isLinked: boolean;
}

export function useEmployeePortal() {
  const { user } = useAuth();
  const [state, setState] = useState<EmployeePortalState>({
    employee: null,
    isLoading: true,
    error: null,
    isLinked: false,
  });

  const fetchEmployee = useCallback(async () => {
    if (!user?.id) {
      setState({ employee: null, isLoading: false, error: null, isLinked: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, email, phone, job_title, department_id, company_id, employee_code, employee_number, hire_date, status, category, contract_type, national_id, base_salary')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setState({
        employee: data as EmployeeProfile | null,
        isLoading: false,
        error: null,
        isLinked: !!data,
      });
    } catch (err) {
      console.error('[useEmployeePortal] Error:', err);
      setState({
        employee: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
        isLinked: false,
      });
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  return {
    ...state,
    refresh: fetchEmployee,
  };
}
