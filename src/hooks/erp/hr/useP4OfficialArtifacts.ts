/**
 * useP4OfficialArtifacts — V2-RRHH-P4B
 * Orchestration hook for P4 official artifacts: RLC, RNT, CRA, Modelo 111, Modelo 190.
 * Follows the same persist pipeline as useOfficialArtifacts (P2B) for AFI/FAN.
 *
 * Flow: engine → validation → DB persistence → version registry → ledger → evidence
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  buildRLC, buildRNT, buildCRA,
  serializeRLCForSnapshot, serializeRNTForSnapshot, serializeCRAForSnapshot,
  type RLCArtifact, type RNTArtifact, type CRAArtifact,
} from '@/engines/erp/hr/rlcRntCraArtifactEngine';
import {
  buildModelo111, buildModelo190,
  serializeModelo111ForSnapshot, serializeModelo190ForSnapshot,
  type Modelo111Artifact, type Modelo190Artifact,
  type Modelo111MonthInput,
} from '@/engines/erp/hr/aeatArtifactEngine';
import type { FANEmployeeRecord, FANCotizacionTotals } from '@/engines/erp/hr/fanCotizacionArtifactEngine';
import type { Modelo190LineItem } from '@/engines/erp/hr/fiscalMonthlyExpedientEngine';
import { buildLedgerRow, type LedgerEventInput } from '@/engines/erp/hr/ledgerEngine';
import { buildEvidenceRow, type EvidenceInput } from '@/engines/erp/hr/evidenceEngine';
import {
  validateRLCPrerequisites, validateRNTPrerequisites, validateCRAPrerequisites,
  validateModelo111Prerequisites, validateModelo190Prerequisites,
  type ArtifactPreValidation,
} from '@/engines/erp/hr/officialArtifactValidationEngine';
import { logAuditEvent } from '@/lib/security/auditLogger';

// ── Types ──

type P4ArtifactType = 'rlc' | 'rnt' | 'cra' | 'modelo_111' | 'modelo_190';
type P4Artifact = RLCArtifact | RNTArtifact | CRAArtifact | Modelo111Artifact | Modelo190Artifact;

export interface P4ArtifactRecord {
  type: P4ArtifactType;
  artifact: P4Artifact;
  preValidation: ArtifactPreValidation | null;
  dbRowId: string | null;
  ledgerEventId: string | null;
  evidenceId: string | null;
  versionRegistryId: string | null;
  versionNumber: number;
  generatedAt: string;
}

// ── Helpers ──

function getCircuitId(type: P4ArtifactType): string {
  if (type === 'modelo_111') return 'aeat_111';
  if (type === 'modelo_190') return 'aeat_190';
  return 'tgss_cotizacion';
}

function getPeriodInfo(artifact: P4Artifact): { year: number | null; month: number | null; label: string | null } {
  if ('periodYear' in artifact && 'periodMonth' in artifact) {
    return { year: artifact.periodYear, month: artifact.periodMonth, label: (artifact as any).periodLabel ?? null };
  }
  if ('fiscalYear' in artifact) {
    return { year: (artifact as Modelo111Artifact | Modelo190Artifact).fiscalYear, month: null, label: null };
  }
  return { year: null, month: null, label: null };
}

function getEmployeeIds(artifact: P4Artifact): string[] {
  // RNT workers have NAF+DNI
  if ('workers' in artifact && Array.isArray((artifact as RNTArtifact).workers)) {
    return (artifact as RNTArtifact).workers.map(w => w.naf).filter(Boolean);
  }
  // Modelo 190 perceptor lines have NIF
  if ('perceptorLines' in artifact && Array.isArray((artifact as Modelo190Artifact).perceptorLines)) {
    return [...new Set((artifact as Modelo190Artifact).perceptorLines.map(l => l.nif).filter(Boolean))];
  }
  // Modelo 111: extract from perceptorIds in monthInputs if available
  if ('monthlyBreakdown' in artifact) {
    const m111 = artifact as Modelo111Artifact;
    const ids = new Set<string>();
    for (const m of m111.monthlyBreakdown) {
      if (m.perceptorIds) for (const id of m.perceptorIds) ids.add(id);
    }
    if (ids.size > 0) return [...ids];
  }
  return [];
}

// ── Hook ──

export function useP4OfficialArtifacts(companyId: string) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastArtifact, setLastArtifact] = useState<P4ArtifactRecord | null>(null);
  const [artifacts, setArtifacts] = useState<P4ArtifactRecord[]>([]);
  const queryClient = useQueryClient();

  // ── Generic persist pipeline (mirrors useOfficialArtifacts.persistArtifact) ──
  const persistP4Artifact = useCallback(async (
    type: P4ArtifactType,
    artifact: P4Artifact,
    snapshot: Record<string, unknown>,
    label: string,
  ): Promise<P4ArtifactRecord> => {
    let dbRowId: string | null = null;
    let ledgerEventId: string | null = null;
    let evidenceId: string | null = null;
    let versionRegistryId: string | null = null;
    let versionNumber = 1;

    const circuitId = getCircuitId(type);
    const periodInfo = getPeriodInfo(artifact);
    const employeeIds = getEmployeeIds(artifact);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sb = supabase as unknown as { from: (t: string) => any };

      // 1. Find previous version
      let previousQuery = sb
        .from('erp_hr_official_artifacts')
        .select('id, version_number')
        .eq('company_id', companyId)
        .eq('circuit_id', circuitId)
        .eq('artifact_type', type)
        .is('superseded_by_id', null)
        .order('version_number', { ascending: false })
        .limit(1);

      if (periodInfo.year !== null) {
        previousQuery = previousQuery.eq('period_year', periodInfo.year);
      }
      if (periodInfo.month !== null) {
        previousQuery = previousQuery.eq('period_month', periodInfo.month);
      }

      const { data: previousData } = await previousQuery.maybeSingle();
      const previousArtifactId = previousData?.id ?? null;
      if (previousData) {
        versionNumber = (previousData.version_number as number) + 1;
      }

      // 2. Insert artifact row
      const row = {
        company_id: companyId,
        artifact_type: type,
        artifact_id: artifact.id,
        circuit_id: circuitId,
        period_year: periodInfo.year,
        period_month: periodInfo.month,
        period_label: periodInfo.label,
        status: artifact.artifactStatus,
        is_valid: artifact.isValid,
        readiness_percent: artifact.readinessPercent,
        version_number: versionNumber,
        previous_artifact_id: previousArtifactId,
        artifact_payload: artifact as unknown as Record<string, unknown>,
        validations: artifact.validations as unknown as Record<string, unknown>[],
        warnings: [],
        totals: 'totalGeneral' in artifact ? { totalGeneral: (artifact as CRAArtifact).totalGeneral }
          : 'totalLiquidacion' in artifact ? { totalLiquidacion: (artifact as RLCArtifact).totalLiquidacion }
          : 'totalRetenciones' in artifact ? { totalRetenciones: (artifact as Modelo111Artifact).totalRetenciones }
          : null,
        employee_ids: employeeIds,
        effective_date: periodInfo.year && periodInfo.month
          ? `${periodInfo.year}-${String(periodInfo.month).padStart(2, '0')}-01`
          : periodInfo.year ? `${periodInfo.year}-01-01` : null,
        generated_by: user?.id ?? null,
        engine_version: artifact.version,
        metadata: { disclaimer: 'Artefacto interno preparatorio — NO constituye presentación oficial' },
      };

      const { data: insertedRow, error: insertError } = await sb
        .from('erp_hr_official_artifacts')
        .insert(row)
        .select('id')
        .single();

      if (insertError) {
        console.error('[useP4OfficialArtifacts] persist error:', insertError);
      } else {
        dbRowId = insertedRow?.id ?? null;
      }

      // 3. Supersede previous
      if (previousArtifactId && dbRowId) {
        await sb
          .from('erp_hr_official_artifacts')
          .update({ superseded_by_id: dbRowId, status: 'cancelled' })
          .eq('id', previousArtifactId);
      }

      // 4. Version Registry
      const { data: versionData } = await sb
        .from('erp_hr_version_registry')
        .insert({
          company_id: companyId,
          entity_type: `official_artifact_${type}`,
          entity_id: dbRowId ?? artifact.id,
          version_number: versionNumber,
          state: 'draft',
          content_snapshot: snapshot,
          content_hash: null,
          created_by: user?.id ?? null,
          metadata: { artifact_type: type, circuit_id: circuitId, engine_version: artifact.version },
        })
        .select('id')
        .single();

      versionRegistryId = versionData?.id ?? null;

      if (dbRowId && versionRegistryId) {
        await sb.from('erp_hr_official_artifacts').update({ version_registry_id: versionRegistryId }).eq('id', dbRowId);
      }

      // 5. Ledger event
      const ledgerInput: LedgerEventInput = {
        companyId,
        eventType: 'official_export_prepared',
        eventLabel: `${label} generado (v${versionNumber})`,
        entityType: `official_artifact_${type}`,
        entityId: dbRowId ?? artifact.id,
        sourceModule: 'hr_official_artifacts_p4',
        afterSnapshot: snapshot,
      };
      const ledgerRow = await buildLedgerRow(ledgerInput);
      const { data: ledgerData } = await sb.from('erp_hr_ledger').insert(ledgerRow).select('id').single();
      ledgerEventId = ledgerData?.id ?? null;

      if (dbRowId && ledgerEventId) {
        await sb.from('erp_hr_official_artifacts').update({ ledger_event_id: ledgerEventId }).eq('id', dbRowId);
      }

      // 6. Evidence
      const evidenceInput: EvidenceInput = {
        companyId,
        ledgerEventId: ledgerEventId ?? undefined,
        evidenceType: 'export_package',
        evidenceLabel: `${label} — v${versionNumber} — ${artifact.id}`,
        refEntityType: `official_artifact_${type}`,
        refEntityId: dbRowId ?? artifact.id,
        evidenceSnapshot: snapshot,
        metadata: {
          artifactStatus: artifact.artifactStatus,
          isValid: artifact.isValid,
          version: artifact.version,
          versionNumber,
          circuitId,
          dbRowId,
        },
      };
      const evidenceRow = buildEvidenceRow(evidenceInput);
      const { data: evidenceData } = await sb.from('erp_hr_evidence').insert(evidenceRow).select('id').single();
      evidenceId = evidenceData?.id ?? null;

      if (dbRowId && evidenceId) {
        await sb.from('erp_hr_official_artifacts').update({ evidence_id: evidenceId }).eq('id', dbRowId);
      }
    } catch (err) {
      console.error('[useP4OfficialArtifacts] persist/trace error:', err);
    }

    // Audit log
    logAuditEvent({
      action: 'official_artifact_generated',
      tableName: 'erp_hr_official_artifacts',
      category: 'data_access',
      severity: 'info',
      metadata: {
        artifact_type: type,
        artifact_id: artifact.id,
        company_id: companyId,
        version_number: versionNumber,
        db_row_id: dbRowId,
        is_valid: artifact.isValid,
        disclaimer: 'Artefacto interno preparatorio — NO constituye presentación oficial',
      },
    }).catch(() => {});

    queryClient.invalidateQueries({ queryKey: ['hr-official-artifacts', companyId] });

    const record: P4ArtifactRecord = {
      type,
      artifact,
      preValidation: null,
      dbRowId,
      ledgerEventId,
      evidenceId,
      versionRegistryId,
      versionNumber,
      generatedAt: artifact.generatedAt,
    };

    setLastArtifact(record);
    setArtifacts(prev => [record, ...prev]);

    const isValid = artifact.isValid;
    toast.success(`${label} generado (v${versionNumber})`, {
      description: isValid ? 'Validación interna OK' : 'Con errores — revisar validaciones',
    });

    return record;
  }, [companyId, queryClient]);

  // ── RLC ──
  const generateRLC = useCallback(async (params: {
    companyCIF: string;
    companyCCC: string;
    companyName: string;
    periodYear: number;
    periodMonth: number;
    records: FANEmployeeRecord[];
    totals: FANCotizacionTotals;
  }) => {
    setIsGenerating(true);
    try {
      const artifact = buildRLC({ ...params, companyId });
      const snapshot = serializeRLCForSnapshot(artifact);
      return await persistP4Artifact('rlc', artifact, snapshot, `RLC ${artifact.periodLabel}`);
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, persistP4Artifact]);

  // ── RNT ──
  const generateRNT = useCallback(async (params: {
    companyCIF: string;
    companyCCC: string;
    companyName: string;
    periodYear: number;
    periodMonth: number;
    records: FANEmployeeRecord[];
    totals: FANCotizacionTotals;
  }) => {
    setIsGenerating(true);
    try {
      const artifact = buildRNT({ ...params, companyId });
      const snapshot = serializeRNTForSnapshot(artifact);
      return await persistP4Artifact('rnt', artifact, snapshot, `RNT ${artifact.periodLabel}`);
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, persistP4Artifact]);

  // ── CRA ──
  const generateCRA = useCallback(async (params: {
    companyCIF: string;
    companyCCC: string;
    companyName: string;
    periodYear: number;
    periodMonth: number;
    records: FANEmployeeRecord[];
  }) => {
    setIsGenerating(true);
    try {
      const artifact = buildCRA({ ...params, companyId });
      const snapshot = serializeCRAForSnapshot(artifact);
      return await persistP4Artifact('cra', artifact, snapshot, `CRA ${artifact.periodLabel}`);
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, persistP4Artifact]);

  // ── Modelo 111 ──
  const generateModelo111 = useCallback(async (params: {
    companyCIF: string;
    companyName: string;
    fiscalYear: number;
    trimester: number;
    monthInputs: Modelo111MonthInput[];
  }) => {
    setIsGenerating(true);
    try {
      const artifact = buildModelo111({ ...params, companyId });
      const snapshot = serializeModelo111ForSnapshot(artifact);
      return await persistP4Artifact('modelo_111', artifact, snapshot, `Modelo 111 ${artifact.trimesterLabel}`);
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, persistP4Artifact]);

  // ── Modelo 190 ──
  const generateModelo190 = useCallback(async (params: {
    companyCIF: string;
    companyName: string;
    fiscalYear: number;
    perceptorLines: Modelo190LineItem[];
    totalRetencionesFrom111?: number;
  }) => {
    setIsGenerating(true);
    try {
      const artifact = buildModelo190({ ...params, companyId });
      const snapshot = serializeModelo190ForSnapshot(artifact);
      return await persistP4Artifact('modelo_190', artifact, snapshot, `Modelo 190 ${artifact.fiscalYear}`);
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, persistP4Artifact]);

  // ── Pre-validations ──
  const validateRLC = useCallback((params: Parameters<typeof validateRLCPrerequisites>[0]) => {
    return validateRLCPrerequisites(params);
  }, []);

  const validateRNT = useCallback((params: Parameters<typeof validateRNTPrerequisites>[0]) => {
    return validateRNTPrerequisites(params);
  }, []);

  const validateCRA = useCallback((params: Parameters<typeof validateCRAPrerequisites>[0]) => {
    return validateCRAPrerequisites(params);
  }, []);

  const validate111 = useCallback((params: Parameters<typeof validateModelo111Prerequisites>[0]) => {
    return validateModelo111Prerequisites(params);
  }, []);

  const validate190 = useCallback((params: Parameters<typeof validateModelo190Prerequisites>[0]) => {
    return validateModelo190Prerequisites(params);
  }, []);

  return {
    isGenerating,
    lastArtifact,
    artifacts,
    // Generation
    generateRLC,
    generateRNT,
    generateCRA,
    generateModelo111,
    generateModelo190,
    // Pre-validation
    validateRLC,
    validateRNT,
    validateCRA,
    validate111,
    validate190,
  };
}
