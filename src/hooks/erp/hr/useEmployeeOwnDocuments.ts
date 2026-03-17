/**
 * useEmployeeOwnDocuments — Efficient query for a single employee's documents
 * V2-RRHH-P3B: Replaces the pattern of loading all company docs + client-side filter
 *
 * Queries erp_hr_employee_documents filtered by employee_id at the DB level.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import type { EmployeeDocument } from './useHRDocumentExpedient';

export function useEmployeeOwnDocuments(companyId: string, employeeId: string) {
  const qc = useQueryClient();

  const queryKey = ['hr-employee-documents', companyId, employeeId];

  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_employee_documents')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeDocument[];
    },
    enabled: !!companyId && !!employeeId,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey });
    // Also invalidate the company-wide query used by admin views
    qc.invalidateQueries({ queryKey: ['hr-documents', companyId] });
  }, [qc, queryKey, companyId]);

  return {
    documents,
    isLoading,
    error,
    refetch,
    invalidate,
  };
}
