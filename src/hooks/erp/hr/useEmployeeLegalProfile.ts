/**
 * useEmployeeLegalProfile — Hook que computa y persiste el perfil legal unificado
 * del empleado, y lo expone como contexto compartido para agentes IA cross-module.
 *
 * Persiste en erp_employee_legal_profiles (JSONB) para que los agentes de
 * HR, Contabilidad y Fiscal puedan consultarlo sin recalcular.
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeEmployeeLegalProfile,
  buildLegalProfileContextForAI,
  type EmployeeLegalProfile,
  type EmployeeLegalProfileInput,
} from '@/engines/erp/hr/employeeLegalProfileEngine';

export function useEmployeeLegalProfile(companyId: string) {
  const [profile, setProfile] = useState<EmployeeLegalProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Compute profile from form data (reactive, no DB call)
   */
  const compute = useCallback((input: EmployeeLegalProfileInput): EmployeeLegalProfile => {
    const result = computeEmployeeLegalProfile(input);
    setProfile(result);
    return result;
  }, []);

  /**
   * Persist the computed profile to DB for AI agent consumption
   */
  const persist = useCallback(async (employeeId: string, legalProfile: EmployeeLegalProfile) => {
    if (!employeeId) return;
    setIsSaving(true);
    try {
      const payload = {
        company_id: companyId,
        employee_id: employeeId,
        profile_data: JSON.parse(JSON.stringify(legalProfile)),
        ai_context: buildLegalProfileContextForAI(legalProfile),
        computed_at: legalProfile.computedAt,
      };

      // Upsert by employee_id
      const { data: existing } = await supabase
        .from('erp_employee_legal_profiles' as any)
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('erp_employee_legal_profiles' as any)
          .update(payload)
          .eq('id', (existing as any).id);
      } else {
        await supabase
          .from('erp_employee_legal_profiles' as any)
          .insert([payload]);
      }
    } catch (err) {
      console.error('[useEmployeeLegalProfile] persist error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [companyId]);

  /**
   * Load persisted profile for an employee (for AI agents)
   */
  const loadForEmployee = useCallback(async (employeeId: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('erp_employee_legal_profiles' as any)
        .select('ai_context')
        .eq('employee_id', employeeId)
        .maybeSingle();
      return (data as any)?.ai_context || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Load profiles for multiple employees (batch, for AI agents)
   */
  const loadForCompany = useCallback(async (): Promise<Array<{ employeeId: string; context: string }>> => {
    try {
      const { data } = await supabase
        .from('erp_employee_legal_profiles' as any)
        .select('employee_id, ai_context')
        .eq('company_id', companyId);
      return (data as any[] || []).map((d: any) => ({
        employeeId: d.employee_id,
        context: d.ai_context,
      }));
    } catch {
      return [];
    }
  }, [companyId]);

  const aiContext = useMemo(() => {
    if (!profile) return '';
    return buildLegalProfileContextForAI(profile);
  }, [profile]);

  return {
    profile,
    aiContext,
    isSaving,
    compute,
    persist,
    loadForEmployee,
    loadForCompany,
  };
}
