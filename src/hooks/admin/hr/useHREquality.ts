/**
 * useHREquality Hook — Enhanced for B1 Complete
 * Gestión de Planes de Igualdad, Auditorías Salariales y Protocolos de Acoso
 * Cumplimiento: Ley Orgánica 3/2007, RD 901/2020, RD 902/2020, Ley 15/2022
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  parseDiagnosisData,
  parseMeasuresData,
  parseNegotiationTimeline,
  serializeDiagnosisData,
  serializeMeasuresData,
  serializeNegotiationTimeline,
  evaluateRegconReadiness,
  computeDiagnosticProgress,
  computeMeasuresSummary,
  type DiagnosticAreaScore,
  type EqualityMeasure,
  type NegotiationEvent,
  type RegconReadinessResult,
} from '@/engines/erp/hr/equalityPlanEngine';

export type EqualityPlanStatus = 'draft' | 'in_progress' | 'approved' | 'expired' | 'under_review';

export interface EqualityPlan {
  id: string;
  company_id: string | null;
  plan_name: string;
  plan_code: string | null;
  status: EqualityPlanStatus | null;
  start_date: string;
  end_date: string;
  diagnosis_data: Record<string, unknown> | null;
  measures: Record<string, unknown> | null;
  objectives: Record<string, unknown> | null;
  equality_commission: Record<string, unknown> | null;
  registration_number: string | null;
  registration_date: string | null;
  last_review_date: string | null;
  review_dates: Record<string, unknown> | null;
  document_urls: string[] | null;
  version: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SalaryAudit {
  id: string;
  company_id: string | null;
  equality_plan_id: string | null;
  audit_year: number;
  audit_period: string | null;
  overall_gap_percentage: number | null;
  gap_by_category: Record<string, unknown> | null;
  gap_by_concept: Record<string, unknown> | null;
  gap_causes: Record<string, unknown> | null;
  correction_measures: Record<string, unknown> | null;
  correction_timeline: Record<string, unknown> | null;
  salary_data: Record<string, unknown> | null;
  legal_justification: string | null;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HarassmentProtocol {
  id: string;
  company_id: string;
  protocol_name: string;
  version: string;
  effective_date: string;
  content: Record<string, unknown> | null;
  contact_person: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EqualityStats {
  totalPlans: number;
  activePlans: number;
  expiringSoon: number;
  avgGenderGap: number | null;
  protocolsActive: number;
}

export function useHREquality(companyId?: string) {
  const [plans, setPlans] = useState<EqualityPlan[]>([]);
  const [audits, setAudits] = useState<SalaryAudit[]>([]);
  const [protocols, setProtocols] = useState<HarassmentProtocol[]>([]);
  const [stats, setStats] = useState<EqualityStats>({
    totalPlans: 0,
    activePlans: 0,
    expiringSoon: 0,
    avgGenderGap: null,
    protocolsActive: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch all equality data
  const fetchEqualityData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);

    try {
      const [plansRes, auditsRes, protocolsRes] = await Promise.all([
        supabase.from('erp_hr_equality_plans').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('erp_hr_salary_audits').select('*').eq('company_id', companyId).order('audit_year', { ascending: false }),
        supabase.from('erp_hr_harassment_protocols').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      ]);

      if (plansRes.error) throw plansRes.error;
      if (auditsRes.error) throw auditsRes.error;
      if (protocolsRes.error) throw protocolsRes.error;

      const typedPlans = (plansRes.data || []) as unknown as EqualityPlan[];
      const typedAudits = (auditsRes.data || []) as unknown as SalaryAudit[];
      const typedProtocols = (protocolsRes.data || []) as unknown as HarassmentProtocol[];

      setPlans(typedPlans);
      setAudits(typedAudits);
      setProtocols(typedProtocols);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const activePlans = typedPlans.filter(p => p.status === 'approved');
      const expiringSoon = typedPlans.filter(p => {
        const endDate = new Date(p.end_date);
        return endDate <= thirtyDaysFromNow && endDate > now;
      });
      const gapValues = typedAudits.filter(a => a.overall_gap_percentage !== null).map(a => a.overall_gap_percentage as number);
      const avgGap = gapValues.length > 0 ? gapValues.reduce((a, b) => a + b, 0) / gapValues.length : null;

      setStats({
        totalPlans: typedPlans.length,
        activePlans: activePlans.length,
        expiringSoon: expiringSoon.length,
        avgGenderGap: avgGap,
        protocolsActive: typedProtocols.filter(p => p.is_active).length
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos de igualdad';
      setError(message);
      console.error('[useHREquality] fetchEqualityData error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Create equality plan
  const createPlan = useCallback(async (planData: {
    plan_name: string;
    start_date: string;
    end_date: string;
  }) => {
    if (!companyId || !user?.id) {
      toast.error('Sesión no válida');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_hr_equality_plans')
        .insert([{
          company_id: companyId,
          plan_name: planData.plan_name,
          start_date: planData.start_date,
          end_date: planData.end_date,
          status: 'draft' as const,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Plan de igualdad creado');
      await fetchEqualityData();
      return data as unknown as EqualityPlan;
    } catch (err) {
      console.error('[useHREquality] createPlan error:', err);
      toast.error('Error al crear plan de igualdad');
      return null;
    }
  }, [companyId, user?.id, fetchEqualityData]);

  // Update plan (diagnosis, measures, objectives, status, etc.)
  const updatePlan = useCallback(async (
    planId: string,
    updates: Partial<Pick<EqualityPlan, 'plan_name' | 'status' | 'diagnosis_data' | 'measures' | 'objectives' | 'equality_commission' | 'document_urls'>>
  ) => {
    try {
      const { error } = await supabase
        .from('erp_hr_equality_plans')
        .update(updates as any)
        .eq('id', planId);

      if (error) throw error;
      toast.success('Plan actualizado');
      await fetchEqualityData();
      return true;
    } catch (err) {
      console.error('[useHREquality] updatePlan error:', err);
      toast.error('Error al actualizar plan');
      return false;
    }
  }, [fetchEqualityData]);

  // Save diagnostic areas
  const saveDiagnosis = useCallback(async (planId: string, areas: DiagnosticAreaScore[]) => {
    return updatePlan(planId, { diagnosis_data: serializeDiagnosisData(areas) as any });
  }, [updatePlan]);

  // Save measures
  const saveMeasures = useCallback(async (planId: string, items: EqualityMeasure[]) => {
    return updatePlan(planId, { measures: serializeMeasuresData(items) as any });
  }, [updatePlan]);

  // Save negotiation timeline (stored in objectives JSONB for now)
  const saveTimeline = useCallback(async (planId: string, events: NegotiationEvent[]) => {
    return updatePlan(planId, { objectives: serializeNegotiationTimeline(events) as any });
  }, [updatePlan]);

  // Create salary audit
  const createAudit = useCallback(async (auditData: {
    audit_year: number;
    audit_period?: string;
    overall_gap_percentage?: number;
    equality_plan_id?: string;
  }) => {
    if (!companyId) {
      toast.error('Empresa no seleccionada');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_hr_salary_audits')
        .insert([{
          company_id: companyId,
          audit_year: auditData.audit_year,
          audit_period: auditData.audit_period || null,
          overall_gap_percentage: auditData.overall_gap_percentage || null,
          equality_plan_id: auditData.equality_plan_id || null,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Auditoría salarial registrada');
      await fetchEqualityData();
      return data as unknown as SalaryAudit;
    } catch (err) {
      console.error('[useHREquality] createAudit error:', err);
      toast.error('Error al registrar auditoría');
      return null;
    }
  }, [companyId, fetchEqualityData]);

  // Update protocol
  const updateProtocol = useCallback(async (
    protocolId: string,
    updates: Partial<HarassmentProtocol>
  ) => {
    try {
      const { error } = await supabase
        .from('erp_hr_harassment_protocols')
        .update(updates)
        .eq('id', protocolId);

      if (error) throw error;
      toast.success('Protocolo actualizado');
      await fetchEqualityData();
      return true;
    } catch (err) {
      console.error('[useHREquality] updateProtocol error:', err);
      toast.error('Error al actualizar protocolo');
      return false;
    }
  }, [fetchEqualityData]);

  // Compute REGCON readiness for a plan
  const getRegconReadiness = useCallback((plan: EqualityPlan | null): RegconReadinessResult => {
    if (!plan) {
      return evaluateRegconReadiness({
        planExists: false, planApproved: false, diagnosticComplete: false,
        measuresApproved: false, salaryAuditDone: false,
        harassmentProtocolActive: false, commissionConstituted: false,
        hasRegistrationNumber: false,
      });
    }

    const diagAreas = parseDiagnosisData(plan.diagnosis_data);
    const measures = parseMeasuresData(plan.measures);
    const diagProgress = computeDiagnosticProgress(diagAreas);
    const measuresSummary = computeMeasuresSummary(measures);

    return evaluateRegconReadiness({
      planExists: true,
      planApproved: plan.status === 'approved',
      diagnosticComplete: diagProgress.percentage === 100,
      measuresApproved: measuresSummary.total > 0 && measuresSummary.byStatus.proposed === 0,
      salaryAuditDone: audits.some(a => a.status === 'approved' || a.status === 'completed'),
      harassmentProtocolActive: protocols.some(p => p.is_active),
      commissionConstituted: plan.equality_commission != null && Object.keys(plan.equality_commission).length > 0,
      hasRegistrationNumber: !!plan.registration_number,
    });
  }, [audits, protocols]);

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchEqualityData();
    }
  }, [companyId, fetchEqualityData]);

  return {
    plans,
    audits,
    protocols,
    stats,
    loading,
    error,
    fetchEqualityData,
    createPlan,
    updatePlan,
    saveDiagnosis,
    saveMeasures,
    saveTimeline,
    createAudit,
    updateProtocol,
    getRegconReadiness,
  };
}

export default useHREquality;
