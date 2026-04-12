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
      // erp_hr_legal_entities: .cif → .tax_id (aligned with types.ts)
      const { data: entities } = await supabase
        .from('erp_hr_legal_entities')
        .select('id, legal_name, tax_id, is_active')
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
      // NOTE: erp_hr_employees does not have registration_status — using status only.
      // erp_hr_domain_certificates does NOT have legal_entity_id — certificates are company-wide.
      // This is a conscious degradation vs per-entity cert filtering, but the previous code
      // queried a ghost column that always returned null, so behaviour is equivalent.
      const [employeesRes, contractsRes, payrollRes, certsRes] = await Promise.all([
        supabase.from('erp_hr_employees')
          .select('id, status, legal_entity_id')
          .eq('company_id', companyId)
          .eq('status', 'active'),
        supabase.from('erp_hr_contracts')
          .select('id, status, contract_type')
          .eq('company_id', companyId)
          .in('status', ['active', 'pending']),
        supabase.from('hr_payroll_periods')
          .select('id, status, legal_entity_id')
          .eq('company_id', companyId)
          .eq('status', 'closed'),
        supabase.from('erp_hr_domain_certificates')
          .select('domain, certificate_status, certificate_type, configuration_completeness, expiration_date, readiness_impact')
          .eq('company_id', companyId),
      ]);

      const allEmployees = employeesRes.data || [];
      const allContracts = contractsRes.data || [];
      const allPeriods = payrollRes.data || [];
      // Certificates are company-wide (no legal_entity_id column exists)
      const allCerts = certsRes.data || [];

      const adapterMappings = adapters.map(a => ({
        id: a.id, adapter_type: a.adapter_type, system_name: a.system_name, is_active: a.is_active, status: a.status,
      }));

      const inputs: EntityReadinessInput[] = (entities || []).map(ent => {
        const entEmployees = allEmployees.filter(e => e.legal_entity_id === ent.id);
        // NOTE: registration_status not available — all active employees counted as complete
        const completeEmp = entEmployees.length;

        // erp_hr_contracts does not have legal_entity_id — assigning all contracts company-wide
        const entContracts = allContracts;
        const completeContracts = entContracts.filter(c => c.contract_type && c.status === 'active').length;

        const entPeriods = allPeriods.filter(p => p.legal_entity_id === ent.id);
        // Certificates are company-wide — no per-entity filtering possible
        const entCerts = allCerts;

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
          fiscalId: ent.tax_id ?? undefined,
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
      // NOTE: erp_hr_employees does not have registration_status — using status only.
      // erp_hr_contracts does not have legal_entity_id — querying company-wide.
      const [empRes, contRes, payRes] = await Promise.all([
        supabase.from('erp_hr_employees').select('id, status', { count: 'exact' })
          .eq('company_id', cId).eq('status', 'active'),
        supabase.from('erp_hr_contracts').select('id, status, contract_type', { count: 'exact' })
          .eq('company_id', cId).in('status', ['active', 'pending']),
        supabase.from('hr_payroll_periods').select('id, status', { count: 'exact' })
          .eq('company_id', cId).eq('status', 'closed'),
      ]);

      const employees = empRes.data || [];
      // NOTE: registration_status not available — all active employees counted as complete
      const complete = employees.length;
      const contracts = contRes.data || [];
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
