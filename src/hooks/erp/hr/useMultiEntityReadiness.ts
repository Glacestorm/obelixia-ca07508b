/**
 * useMultiEntityReadiness — V2-ES.8 Tramo 4
 * Hook that evaluates readiness across multiple legal entities.
 * Connects real entity data with multiEntityReadinessEngine.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  evaluateMultiEntityReadiness,
  type MultiEntityReadinessReport,
  type EntityReadinessInput,
} from '@/components/erp/hr/shared/multiEntityReadinessEngine';
import type { ConnectorDataContext } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

export interface UseMultiEntityReadinessReturn {
  report: MultiEntityReadinessReport | null;
  isLoading: boolean;
  lastEvaluatedAt: string | null;
  evaluate: (adapters: IntegrationAdapter[]) => Promise<MultiEntityReadinessReport | null>;
  /** Summary counts for quick display */
  entityCounts: {
    total: number;
    fullyReady: number;
    partiallyReady: number;
    notReady: number;
  };
}

export function useMultiEntityReadiness(companyId: string): UseMultiEntityReadinessReturn {
  const [report, setReport] = useState<MultiEntityReadinessReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(null);

  const evaluate = useCallback(async (adapters: IntegrationAdapter[]): Promise<MultiEntityReadinessReport | null> => {
    if (!companyId) return null;
    setIsLoading(true);

    try {
      // Fetch legal entities
      // erp_hr_legal_entities.cif not in generated types — cast retained
      const { data: entities } = await (supabase as any)
        .from('erp_hr_legal_entities')
        .select('id, legal_name, cif, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!entities || entities.length === 0) {
        // Single-company mode: create a synthetic entity from company data
        const singleCtx = await buildEntityContext(companyId, null, adapters);
        const singleReport = evaluateMultiEntityReadiness([{
          entityId: companyId,
          entityName: 'Empresa principal',
          entityType: 'company',
          dataContext: singleCtx,
        }]);
        setReport(singleReport);
        setLastEvaluatedAt(singleReport.evaluatedAt);
        return singleReport;
      }

      // Multi-entity: fetch per-entity data
      // NOTE: hr_employees/hr_contracts are DB views; legal_entity_id and other cols not in types — cast retained
      const [employeesRes, contractsRes, payrollRes, certsRes] = await Promise.all([
        (supabase as any).from('hr_employees')
          .select('id, status, registration_status, legal_entity_id')
          .eq('company_id', companyId)
          .eq('status', 'active'),
        (supabase as any).from('hr_contracts')
          .select('id, status, contract_type, legal_entity_id')
          .eq('company_id', companyId)
          .in('status', ['active', 'pending']),
        supabase.from('hr_payroll_periods')
          .select('id, status, legal_entity_id')
          .eq('company_id', companyId)
          .eq('status', 'closed'),
        // erp_hr_domain_certificates.legal_entity_id not in types — cast retained
        (supabase as any).from('erp_hr_domain_certificates')
          .select('domain, certificate_status, certificate_type, configuration_completeness, expiration_date, readiness_impact, legal_entity_id')
          .eq('company_id', companyId),
      ]);

      const allEmployees = (employeesRes.data || []) as Array<{ id: string; status: string; registration_status: string; legal_entity_id: string | null }>;
      const allContracts = (contractsRes.data || []) as Array<{ id: string; status: string; contract_type: string; legal_entity_id: string | null }>;
      const allPeriods = (payrollRes.data || []) as unknown as Array<{ id: string; status: string | null; legal_entity_id: string | null }>;
      const allCerts = (certsRes.data || []) as Array<{ domain: string; certificate_status: string; certificate_type: string; configuration_completeness: number; expiration_date: string | null; readiness_impact: string; legal_entity_id: string | null }>;

      const adapterMappings = adapters.map(a => ({
        id: a.id, adapter_type: a.adapter_type, system_name: a.system_name, is_active: a.is_active, status: a.status,
      }));

      const inputs: EntityReadinessInput[] = (entities as any[]).map((ent: any) => {
        const entEmployees = allEmployees.filter(e => e.legal_entity_id === ent.id);
        const completeEmp = entEmployees.filter(e =>
          e.registration_status === 'completed' || e.registration_status === 'tgss_prepared'
        ).length;

        const entContracts = allContracts.filter(c => c.legal_entity_id === ent.id);
        const completeContracts = entContracts.filter(c => c.contract_type && c.status === 'active').length;

        const entPeriods = allPeriods.filter(p => p.legal_entity_id === ent.id);
        const entCerts = allCerts.filter(c => c.legal_entity_id === ent.id || !c.legal_entity_id);

        const ctx: ConnectorDataContext = {
          employeesWithCompleteData: completeEmp,
          totalActiveEmployees: entEmployees.length,
          contractsWithCompleteData: completeContracts,
          totalActiveContracts: entContracts.length,
          hasClosedPayrollPeriods: entPeriods.length > 0,
          closedPayrollPeriodsCount: entPeriods.length,
          hasSSExpedient: entPeriods.length > 0,
          hasFiscalExpedient: entPeriods.length > 0,
          docCompletenessAvg: entEmployees.length > 0 ? Math.round((completeEmp / entEmployees.length) * 100) : 0,
          configuredAdapters: adapterMappings,
          certificateConfigs: entCerts.map(c => ({
            domain: c.domain,
            certificate_status: c.certificate_status,
            certificate_type: c.certificate_type,
            configuration_completeness: c.configuration_completeness,
            expiration_date: c.expiration_date,
            readiness_impact: c.readiness_impact,
          })),
        };

        return {
          entityId: ent.id,
          entityName: ent.legal_name ?? 'Sin nombre',
          entityType: 'legal_entity' as const,
          fiscalId: ent.cif ?? undefined,
          dataContext: ctx,
        };
      });

      const result = evaluateMultiEntityReadiness(inputs);
      setReport(result);
      setLastEvaluatedAt(result.evaluatedAt);
      return result;
    } catch (err) {
      console.error('[useMultiEntityReadiness] evaluate error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Convenience: build context for single company (no legal entities)
  async function buildEntityContext(
    cId: string,
    _entityId: string | null,
    adapters: IntegrationAdapter[],
  ): Promise<ConnectorDataContext> {
    // NOTE: hr_employees/hr_contracts are DB views not in generated types — cast retained
    const [empRes, contRes, payRes] = await Promise.all([
      (supabase as any).from('hr_employees').select('id, status, registration_status', { count: 'exact' })
        .eq('company_id', cId).eq('status', 'active'),
      (supabase as any).from('hr_contracts').select('id, status, contract_type', { count: 'exact' })
        .eq('company_id', cId).in('status', ['active', 'pending']),
      supabase.from('hr_payroll_periods').select('id, status', { count: 'exact' })
        .eq('company_id', cId).eq('status', 'closed'),
    ]);

    const employees = (empRes.data || []) as Array<{ id: string; status: string; registration_status: string }>;
    const complete = employees.filter(e =>
      e.registration_status === 'completed' || e.registration_status === 'tgss_prepared'
    ).length;
    const contracts = (contRes.data || []) as Array<{ id: string; status: string; contract_type: string }>;
    const completeContracts = contracts.filter(c => c.contract_type && c.status === 'active').length;

    return {
      employeesWithCompleteData: complete,
      totalActiveEmployees: empRes.count ?? 0,
      contractsWithCompleteData: completeContracts,
      totalActiveContracts: contRes.count ?? 0,
      hasClosedPayrollPeriods: (payRes.count ?? 0) > 0,
      closedPayrollPeriodsCount: payRes.count ?? 0,
      hasSSExpedient: (payRes.count ?? 0) > 0,
      hasFiscalExpedient: (payRes.count ?? 0) > 0,
      docCompletenessAvg: (empRes.count ?? 0) > 0 ? Math.round((complete / (empRes.count ?? 1)) * 100) : 0,
      configuredAdapters: adapters.map(a => ({
        id: a.id, adapter_type: a.adapter_type, system_name: a.system_name, is_active: a.is_active, status: a.status,
      })),
    };
  }

  // Computed entity counts
  const entityCounts = report ? {
    total: report.entities.length,
    fullyReady: report.consolidated.fullyReadyEntities,
    partiallyReady: report.entities.filter(e => e.summary.overallPercent >= 30 && e.summary.overallPercent < 80).length,
    notReady: report.entities.filter(e => e.summary.overallPercent < 30).length,
  } : { total: 0, fullyReady: 0, partiallyReady: 0, notReady: 0 };

  return { report, isLoading, lastEvaluatedAt, evaluate, entityCounts };
}
