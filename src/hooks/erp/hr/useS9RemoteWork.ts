/**
 * useS9RemoteWork — Hook for Remote Work Agreements (Ley 10/2021)
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { validateRemoteWorkAgreement, computePresenciality } from '@/engines/erp/hr/s9ComplianceEngine';
import type { RemoteWorkAgreement, RemoteWorkValidation } from '@/types/s9-compliance';
import { toast } from 'sonner';

interface AgreementRow {
  id: string;
  company_id: string;
  employee_id: string;
  agreement_date: string;
  start_date: string;
  end_date: string | null;
  status: string;
  remote_percentage: number;
  work_location: Record<string, unknown>;
  equipment_inventory: unknown[];
  expense_compensation: Record<string, unknown>;
  schedule_details: Record<string, unknown>;
  disconnection_policy_id: string | null;
  agreement_content: Record<string, unknown>;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
}

export function useS9RemoteWork(companyId: string) {
  const queryClient = useQueryClient();

  const { data: agreements, isLoading } = useQuery({
    queryKey: ['s9-remote-work', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_remote_work_agreements')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) { console.error('[useS9RemoteWork]', error); return []; }
      return (data ?? []) as AgreementRow[];
    },
    enabled: !!companyId,
  });

  const enrichedAgreements = useMemo(() => {
    return (agreements ?? []).map(a => ({
      ...a,
      validation: validateRemoteWorkAgreement(a.agreement_content || {}),
      presenciality: computePresenciality(a.remote_percentage),
    }));
  }, [agreements]);

  const stats = useMemo(() => {
    const all = enrichedAgreements;
    return {
      total: all.length,
      active: all.filter(a => a.status === 'active').length,
      draft: all.filter(a => a.status === 'draft').length,
      avgRemotePercent: all.length > 0
        ? all.reduce((s, a) => s + a.remote_percentage, 0) / all.length
        : 0,
      incompleteAgreements: all.filter(a => !a.validation.isComplete).length,
    };
  }, [enrichedAgreements]);

  const createAgreement = useCallback(async (input: {
    employeeId: string;
    agreementDate: string;
    startDate: string;
    endDate?: string;
    remotePercentage: number;
    agreementContent?: Record<string, unknown>;
  }) => {
    const { data, error } = await (supabase as any)
      .from('erp_hr_remote_work_agreements')
      .insert({
        company_id: companyId,
        employee_id: input.employeeId,
        agreement_date: input.agreementDate,
        start_date: input.startDate,
        end_date: input.endDate || null,
        remote_percentage: input.remotePercentage,
        agreement_content: input.agreementContent || {},
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('[useS9RemoteWork] create', error);
      toast.error('Error al crear acuerdo de teletrabajo');
      return null;
    }

    toast.success('Acuerdo de teletrabajo creado');
    queryClient.invalidateQueries({ queryKey: ['s9-remote-work', companyId] });
    return data;
  }, [companyId, queryClient]);

  const updateAgreement = useCallback(async (
    id: string,
    updates: Partial<AgreementRow>,
  ) => {
    const { error } = await (supabase as any)
      .from('erp_hr_remote_work_agreements')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('[useS9RemoteWork] update', error);
      toast.error('Error al actualizar acuerdo');
      return false;
    }

    toast.success('Acuerdo actualizado');
    queryClient.invalidateQueries({ queryKey: ['s9-remote-work', companyId] });
    return true;
  }, [companyId, queryClient]);

  return {
    agreements: enrichedAgreements,
    stats,
    isLoading,
    createAgreement,
    updateAgreement,
    validateAgreement: validateRemoteWorkAgreement,
    computePresenciality,
  };
}
