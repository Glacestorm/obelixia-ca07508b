/**
 * useOfficialReadinessMatrix — V2-RRHH-FASE-4
 * Hook that assembles the unified readiness matrix from existing hooks/data.
 *
 * Aggregates:
 *  - useOfficialReadiness (connector evaluations)
 *  - usePreparatorySubmissions (latest submissions per circuit)
 *  - useHRDomainCertificates (certificate statuses)
 *  - useOfficialIntegrationsHub (adapters)
 *
 * Connects to ledger for audit trail on evaluations.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildReadinessMatrix,
  CIRCUIT_DEFINITIONS,
  type ReadinessMatrix,
  type CircuitId,
} from '@/engines/erp/hr/officialReadinessMatrixEngine';
import type { ConnectorId, ConnectorReadiness } from '@/components/erp/hr/shared/officialReadinessEngine';
import { evaluateOfficialReadiness, type ConnectorDataContext } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { PreparatorySubmissionStatus, SubmissionDomain } from '@/components/erp/hr/shared/preparatorySubmissionEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

// ─── Map circuit to domain for submission lookup ────────────────────────────

const CIRCUIT_DOMAIN_MAP: Record<CircuitId, SubmissionDomain> = {
  tgss_afiliacion: 'TGSS',
  tgss_cotizacion: 'TGSS',
  contrata_comunicacion: 'CONTRATA',
  contrata_finalizacion: 'CONTRATA',
  certifica2: 'CERTIFICA2',
  delta_accidentes: 'DELTA',
  aeat_111: 'AEAT_111',
  aeat_190: 'AEAT_190',
  rlc_rnt: 'TGSS',
};

const CIRCUIT_SUBTYPE_MAP: Partial<Record<CircuitId, string>> = {
  tgss_afiliacion: 'afiliacion',
  tgss_cotizacion: 'cotizacion',
  contrata_comunicacion: 'comunicacion',
  contrata_finalizacion: 'finalizacion',
  rlc_rnt: 'rlc_rnt',
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOfficialReadinessMatrix(companyId: string) {
  const [matrix, setMatrix] = useState<ReadinessMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(null);
  const { writeLedgerWithEvidence, writeVersion } = useHRLedgerWriter(companyId, 'official-readiness');

  const evaluate = useCallback(async (): Promise<ReadinessMatrix | null> => {
    if (!companyId) return null;
    setIsLoading(true);

    try {
      // 1. Gather connector readiness context (same as useOfficialReadiness)
      const [employeesRes, contractsRes, payrollRes, ssRes, certsRes, adaptersRes] = await Promise.all([
        supabase.from('hr_employees' as any).select('id, status, registration_status', { count: 'exact' })
          .eq('company_id', companyId).eq('status', 'active'),
        supabase.from('hr_contracts' as any).select('id, status, contract_type', { count: 'exact' })
          .eq('company_id', companyId).in('status', ['active', 'pending']),
        supabase.from('hr_payroll_periods' as any).select('id, status', { count: 'exact' })
          .eq('company_id', companyId).eq('status', 'closed'),
        supabase.from('erp_hr_ss_contributions' as any).select('id', { count: 'exact' })
          .eq('company_id', companyId),
        (supabase as any).from('erp_hr_domain_certificates')
          .select('domain, certificate_status, certificate_type, configuration_completeness, expiration_date, readiness_impact')
          .eq('company_id', companyId),
        supabase.from('hr_integration_adapters').select('id, adapter_type, system_name, is_active, status')
          .or(`company_id.eq.${companyId},company_id.is.null`),
      ]);

      const totalEmployees = employeesRes.count ?? 0;
      const employees = (employeesRes.data || []) as any[];
      const completeEmployees = employees.filter((e: any) =>
        e.registration_status === 'completed' || e.registration_status === 'tgss_prepared'
      ).length;

      const totalContracts = contractsRes.count ?? 0;
      const contracts = (contractsRes.data || []) as any[];
      const completeContracts = contracts.filter((c: any) => c.contract_type && c.status === 'active').length;

      const closedPeriods = payrollRes.count ?? 0;
      const hasSSExpedient = (ssRes.count ?? 0) > 0;

      const adapters = (adaptersRes.data || []) as any[];

      const ctx: ConnectorDataContext = {
        employeesWithCompleteData: completeEmployees,
        totalActiveEmployees: totalEmployees,
        contractsWithCompleteData: completeContracts,
        totalActiveContracts: totalContracts,
        hasClosedPayrollPeriods: closedPeriods > 0,
        closedPayrollPeriodsCount: closedPeriods,
        hasSSExpedient,
        hasFiscalExpedient: closedPeriods > 0,
        docCompletenessAvg: totalEmployees > 0 ? Math.round((completeEmployees / totalEmployees) * 100) : 0,
        configuredAdapters: adapters.map((a: any) => ({
          id: a.id,
          adapter_type: a.adapter_type,
          system_name: a.system_name,
          is_active: a.is_active,
          status: a.status,
        })),
        certificateConfigs: ((certsRes.data || []) as any[]).map((c: any) => ({
          domain: c.domain,
          certificate_status: c.certificate_status,
          certificate_type: c.certificate_type,
          configuration_completeness: c.configuration_completeness,
          expiration_date: c.expiration_date,
          readiness_impact: c.readiness_impact,
        })),
      };

      // 2. Evaluate connectors
      const readinessSummary = evaluateOfficialReadiness(ctx, { includeSecondary: true });
      const connectorMap = new Map<ConnectorId, ConnectorReadiness>();
      for (const cr of readinessSummary.connectors) {
        connectorMap.set(cr.connectorId, cr);
      }

      // 3. Fetch latest submissions per domain
      const { data: submissionsData } = await supabase
        .from('hr_official_submissions')
        .select('id, submission_domain, submission_subtype, status, reference_period, updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(100);

      const latestSubmissions = new Map<CircuitId, {
        id: string;
        status: PreparatorySubmissionStatus;
        referencePeriod: string | null;
        updatedAt: string;
      }>();

      for (const circuit of CIRCUIT_DEFINITIONS) {
        const domain = CIRCUIT_DOMAIN_MAP[circuit.id];
        const subtype = CIRCUIT_SUBTYPE_MAP[circuit.id];
        const match = (submissionsData || []).find((s: any) => {
          if (s.submission_domain !== domain) return false;
          if (subtype && s.submission_subtype !== subtype) return true; // accept if no subtype filter
          return true;
        });
        if (match) {
          latestSubmissions.set(circuit.id, {
            id: match.id,
            status: match.status as PreparatorySubmissionStatus,
            referencePeriod: match.reference_period,
            updatedAt: match.updated_at,
          });
        }
      }

      // 4. Certificate statuses
      const certStatuses = new Map<string, string>();
      for (const cert of ((certsRes.data || []) as any[])) {
        certStatuses.set(cert.domain, cert.certificate_status);
      }

      // 5. Build matrix
      const result = buildReadinessMatrix({
        connectorReadinessMap: connectorMap,
        latestSubmissions,
        certificateStatuses: certStatuses,
        adapterIds: new Set(adapters.map((a: any) => a.id)),
      });

      setMatrix(result);
      setLastEvaluatedAt(result.evaluatedAt);

      // 6. Build per-circuit snapshot for evidence
      const circuitSnapshot = result.circuits.map(c => ({
        circuitId: c.circuit.id,
        organism: c.circuit.organism,
        status: c.operationalStatus,
        systemLimit: c.circuit.systemLimit,
        certificateStatus: c.certificateStatus,
        blockReasons: c.blockReasons,
        realSubmissionBlocked: c.realSubmissionBlocked,
      }));

      const evidenceSnapshot = {
        overallStatus: result.overallStatus,
        totalCircuits: result.totalCircuits,
        configured: result.configured,
        preparatory: result.preparatory,
        sandboxReady: result.sandboxReady,
        productionReady: result.productionReady,
        submitted: result.submitted,
        blocked: result.blocked,
        circuits: circuitSnapshot,
      };

      // 7. Ledger + evidence (non-noisy — only on explicit evaluation)
      writeLedgerWithEvidence(
        {
          eventType: 'system_event',
          entityType: 'official_readiness',
          entityId: companyId,
          afterSnapshot: evidenceSnapshot,
          metadata: { action: 'readiness_matrix_evaluated' },
        },
        [
          {
            evidenceType: 'snapshot' as const,
            evidenceLabel: `Evaluación readiness España: ${result.overallStatus}`,
            refEntityType: 'readiness_matrix',
            refEntityId: companyId,
            evidenceSnapshot: evidenceSnapshot,
            metadata: {
              configured: result.configured,
              totalCircuits: result.totalCircuits,
              blocked: result.blocked,
            },
          },
        ],
      );

      // 8. Version registry: track readiness evaluation version
      writeVersion({
        entityType: 'readiness_matrix',
        entityId: companyId,
        state: result.overallStatus,
        contentSnapshot: evidenceSnapshot,
        metadata: {
          action: 'readiness_matrix_evaluated',
          configured: result.configured,
          blocked: result.blocked,
        },
      });

      return result;
    } catch (err) {
      console.error('[useOfficialReadinessMatrix] evaluate error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, writeLedgerWithEvidence, writeVersion]);

  return {
    matrix,
    isLoading,
    lastEvaluatedAt,
    evaluate,
  };
}
