/**
 * useOfficialArtifacts — V2-RRHH-P2B
 * Hook for generating, validating, persisting, versioning, and exporting official artifacts (AFI, FAN).
 * Orchestrates: artifact engine → validation → DB persistence → ledger → evidence → version registry.
 *
 * P2B additions:
 *  - Full artifact persistence in erp_hr_official_artifacts table
 *  - Version registry integration (draft→validated→superseded chain)
 *  - Export/download of generated artifact as JSON
 *  - Corrected totalLiquidoEstimado honesty
 *  - Eliminated `as any` casts where possible
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  buildAFIAlta, buildAFIBaja, buildAFIVariacion,
  promoteAFIStatus, serializeAFIForSnapshot,
  type AFIArtifact, type AFIAltaSubtype, type AFIBajaSubtype,
  type AFIVariacionSubtype, type AFIWorkerData, type AFIEmployerData,
  type AFIContractData, type AFIBajaDetails, type AFIVariacionChange,
  type AFIArtifactStatus,
} from '@/engines/erp/hr/afiArtifactEngine';
import {
  buildFANCotizacion, buildFANEmployeeRecord, promoteFANStatus,
  serializeFANForSnapshot,
  type FANCotizacionArtifact, type FANArtifactStatus,
} from '@/engines/erp/hr/fanCotizacionArtifactEngine';
import {
  validateAFIPrerequisites, validateFANPrerequisites,
  type ArtifactPreValidation,
} from '@/engines/erp/hr/officialArtifactValidationEngine';
import type { SSContributionBreakdown } from '@/engines/erp/hr/ssContributionEngine';
import { buildLedgerRow, type LedgerEventInput } from '@/engines/erp/hr/ledgerEngine';
import { buildEvidenceRow, type EvidenceInput } from '@/engines/erp/hr/evidenceEngine';
import { logAuditEvent } from '@/lib/security/auditLogger';

// ── Artifact DB row type ──

export interface OfficialArtifactDBRow {
  id: string;
  company_id: string;
  artifact_type: string;
  artifact_id: string;
  circuit_id: string;
  period_year: number | null;
  period_month: number | null;
  period_label: string | null;
  status: string;
  is_valid: boolean;
  readiness_percent: number;
  version_number: number;
  version_registry_id: string | null;
  previous_artifact_id: string | null;
  superseded_by_id: string | null;
  ledger_event_id: string | null;
  evidence_id: string | null;
  artifact_payload: Record<string, unknown>;
  validations: unknown[];
  warnings: string[];
  totals: Record<string, unknown> | null;
  employee_ids: string[];
  effective_date: string | null;
  generated_by: string | null;
  engine_version: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── In-memory record ──

export interface OfficialArtifactRecord {
  type: 'afi' | 'fan';
  artifact: AFIArtifact | FANCotizacionArtifact;
  preValidation: ArtifactPreValidation | null;
  dbRowId: string | null;
  ledgerEventId: string | null;
  evidenceId: string | null;
  versionRegistryId: string | null;
  versionNumber: number;
  generatedAt: string;
}

// ── Helper: map artifact type ──

function resolveArtifactType(type: 'afi' | 'fan', artifact: AFIArtifact | FANCotizacionArtifact): string {
  if (type === 'fan') return 'fan_cotizacion';
  return `afi_${(artifact as AFIArtifact).actionType}`;
}

// ── Helper: extract employee IDs ──

function extractEmployeeIds(type: 'afi' | 'fan', artifact: AFIArtifact | FANCotizacionArtifact): string[] {
  if (type === 'afi') return [(artifact as AFIArtifact).worker.employeeId];
  return (artifact as FANCotizacionArtifact).records.map(r => r.employeeId);
}

// ── Export helper: download JSON ──

export function downloadArtifactJSON(artifact: AFIArtifact | FANCotizacionArtifact, fileName?: string): void {
  const json = JSON.stringify(artifact, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? `${artifact.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Hook ──

interface UseOfficialArtifactsReturn {
  isGenerating: boolean;
  lastArtifact: OfficialArtifactRecord | null;
  artifacts: OfficialArtifactRecord[];

  /** Persisted artifacts from DB for this company */
  persistedArtifacts: OfficialArtifactDBRow[];
  isLoadingPersisted: boolean;

  // Pre-validation
  validateAFI: (params: {
    worker: Partial<AFIWorkerData>;
    employer: Partial<AFIEmployerData>;
    contract: Partial<AFIContractData>;
    actionType: 'alta' | 'baja' | 'variacion';
  }) => ArtifactPreValidation;

  validateFAN: (params: {
    companyCCC: string;
    companyCIF: string;
    employeeCount: number;
    allHaveNAF: boolean;
    allHaveGrupo: boolean;
    allHaveSSData: boolean;
    periodYear: number;
    periodMonth: number;
    payrollClosed: boolean;
  }) => ArtifactPreValidation;

  // Generation
  generateAFIAlta: (params: {
    worker: AFIWorkerData;
    employer: AFIEmployerData;
    contract: AFIContractData;
    subtype: AFIAltaSubtype;
  }) => Promise<OfficialArtifactRecord>;

  generateAFIBaja: (params: {
    worker: AFIWorkerData;
    employer: AFIEmployerData;
    contract: AFIContractData;
    bajaDetails: AFIBajaDetails;
  }) => Promise<OfficialArtifactRecord>;

  generateAFIVariacion: (params: {
    worker: AFIWorkerData;
    employer: AFIEmployerData;
    contract: AFIContractData;
    variacionSubtype: AFIVariacionSubtype;
    changes: AFIVariacionChange[];
    effectiveDate: string;
  }) => Promise<OfficialArtifactRecord>;

  generateFANCotizacion: (params: {
    companyCIF: string;
    companyCCC: string;
    companyName: string;
    periodYear: number;
    periodMonth: number;
    employeeResults: Array<{
      employeeId: string;
      employeeName: string;
      naf: string;
      dniNie: string;
      grupoCotizacion: number;
      contractTypeCode: string;
      isTemporary: boolean;
      coeficienteParcialidad: number;
      diasCotizados: number;
      ssResult: SSContributionBreakdown;
      tipoIRPF: number;
      retencionIRPF: number;
    }>;
  }) => Promise<OfficialArtifactRecord>;

  // Status promotion
  promoteArtifactStatus: (artifactIndex: number, targetStatus: AFIArtifactStatus | FANArtifactStatus) => void;

  // Export
  downloadArtifact: (artifactIndex: number) => void;
}

export function useOfficialArtifacts(companyId: string): UseOfficialArtifactsReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastArtifact, setLastArtifact] = useState<OfficialArtifactRecord | null>(null);
  const [artifacts, setArtifacts] = useState<OfficialArtifactRecord[]>([]);
  const queryClient = useQueryClient();

  // ── Query persisted artifacts ──
  const { data: persistedArtifacts = [], isLoading: isLoadingPersisted } = useQuery({
    queryKey: ['hr-official-artifacts', companyId],
    queryFn: async (): Promise<OfficialArtifactDBRow[]> => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from('erp_hr_official_artifacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        console.error('[useOfficialArtifacts] query error:', error);
        return [];
      }
      return (data ?? []) as OfficialArtifactDBRow[];
    },
    enabled: !!companyId,
  });

  // ── Persist artifact to DB + ledger + evidence + version registry ──
  const persistArtifact = useCallback(async (
    type: 'afi' | 'fan',
    artifact: AFIArtifact | FANCotizacionArtifact,
    snapshot: Record<string, unknown>,
  ): Promise<{
    dbRowId: string | null;
    ledgerEventId: string | null;
    evidenceId: string | null;
    versionRegistryId: string | null;
    versionNumber: number;
  }> => {
    let dbRowId: string | null = null;
    let ledgerEventId: string | null = null;
    let evidenceId: string | null = null;
    let versionRegistryId: string | null = null;
    let versionNumber = 1;

    const artifactType = resolveArtifactType(type, artifact);
    const employeeIds = extractEmployeeIds(type, artifact);
    const circuitId = type === 'afi' ? 'tgss_afiliacion' : 'tgss_cotizacion';
    const isFAN = type === 'fan';
    const fanArt = isFAN ? artifact as FANCotizacionArtifact : null;
    const afiArt = !isFAN ? artifact as AFIArtifact : null;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Check for previous artifact of same type/circuit/period to build version chain
      const sb = supabase as unknown as { from: (t: string) => any };

      let previousQuery = sb
        .from('erp_hr_official_artifacts')
        .select('id, version_number')
        .eq('company_id', companyId)
        .eq('circuit_id', circuitId)
        .eq('artifact_type', artifactType)
        .is('superseded_by_id', null)
        .order('version_number', { ascending: false })
        .limit(1);

      // For FAN, also match period
      if (isFAN && fanArt) {
        previousQuery = previousQuery
          .eq('period_year', fanArt.periodYear)
          .eq('period_month', fanArt.periodMonth);
      }

      const { data: previousData } = await previousQuery.maybeSingle();
      const previousArtifactId = previousData?.id ?? null;
      if (previousData) {
        versionNumber = (previousData.version_number as number) + 1;
      }

      // 2. Insert the artifact row
      const row = {
        company_id: companyId,
        artifact_type: artifactType,
        artifact_id: artifact.id,
        circuit_id: circuitId,
        period_year: isFAN ? fanArt!.periodYear : null,
        period_month: isFAN ? fanArt!.periodMonth : null,
        period_label: isFAN ? fanArt!.periodLabel : null,
        status: isFAN ? fanArt!.artifactStatus : afiArt!.artifactStatus,
        is_valid: isFAN ? fanArt!.isValid : afiArt!.isValid,
        readiness_percent: isFAN ? fanArt!.readinessPercent : afiArt!.readinessPercent,
        version_number: versionNumber,
        previous_artifact_id: previousArtifactId,
        artifact_payload: artifact as unknown as Record<string, unknown>,
        validations: (isFAN ? fanArt!.validations : afiArt!.validations) as unknown as Record<string, unknown>[],
        warnings: isFAN ? fanArt!.warnings : afiArt!.warnings,
        totals: isFAN ? (fanArt!.totals as unknown as Record<string, unknown>) : null,
        employee_ids: employeeIds,
        effective_date: isFAN ? `${fanArt!.periodYear}-${String(fanArt!.periodMonth).padStart(2, '0')}-01` : afiArt!.effectiveDate,
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
        console.error('[useOfficialArtifacts] persist error:', insertError);
      } else {
        dbRowId = insertedRow?.id ?? null;
      }

      // 3. Mark previous artifact as superseded
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
          entity_type: `official_artifact_${artifactType}`,
          entity_id: dbRowId ?? artifact.id,
          version_number: versionNumber,
          state: 'draft',
          content_snapshot: snapshot,
          content_hash: null,
          created_by: user?.id ?? null,
          metadata: { artifact_type: artifactType, circuit_id: circuitId, engine_version: artifact.version },
        })
        .select('id')
        .single();

      versionRegistryId = versionData?.id ?? null;

      // Update the artifact row with version_registry_id
      if (dbRowId && versionRegistryId) {
        await sb
          .from('erp_hr_official_artifacts')
          .update({ version_registry_id: versionRegistryId })
          .eq('id', dbRowId);
      }

      // 5. Ledger event
      const ledgerInput: LedgerEventInput = {
        companyId,
        eventType: 'official_export_prepared',
        eventLabel: type === 'afi'
          ? `AFI ${afiArt!.actionType} generado (v${versionNumber})`
          : `FAN cotización ${fanArt!.periodLabel} generada (v${versionNumber})`,
        entityType: `official_artifact_${artifactType}`,
        entityId: dbRowId ?? artifact.id,
        sourceModule: 'hr_official_artifacts',
        afterSnapshot: snapshot,
      };
      const ledgerRow = await buildLedgerRow(ledgerInput);
      const { data: ledgerData } = await sb
        .from('erp_hr_ledger')
        .insert(ledgerRow)
        .select('id')
        .single();
      ledgerEventId = ledgerData?.id ?? null;

      // Update artifact with ledger event id
      if (dbRowId && ledgerEventId) {
        await sb
          .from('erp_hr_official_artifacts')
          .update({ ledger_event_id: ledgerEventId })
          .eq('id', dbRowId);
      }

      // 6. Evidence
      const evidenceInput: EvidenceInput = {
        companyId,
        ledgerEventId: ledgerEventId ?? undefined,
        evidenceType: 'export_package',
        evidenceLabel: type === 'afi'
          ? `AFI ${afiArt!.actionType} — v${versionNumber} — ${artifact.id}`
          : `FAN cotización ${fanArt!.periodLabel} — v${versionNumber} — ${artifact.id}`,
        refEntityType: `official_artifact_${artifactType}`,
        refEntityId: dbRowId ?? artifact.id,
        evidenceSnapshot: snapshot,
        metadata: {
          artifactStatus: isFAN ? fanArt!.artifactStatus : afiArt!.artifactStatus,
          isValid: isFAN ? fanArt!.isValid : afiArt!.isValid,
          version: artifact.version,
          versionNumber,
          circuitId,
          dbRowId,
        },
      };
      const evidenceRow = buildEvidenceRow(evidenceInput);
      const { data: evidenceData } = await sb
        .from('erp_hr_evidence')
        .insert(evidenceRow)
        .select('id')
        .single();
      evidenceId = evidenceData?.id ?? null;

      // Update artifact with evidence id
      if (dbRowId && evidenceId) {
        await sb
          .from('erp_hr_official_artifacts')
          .update({ evidence_id: evidenceId })
          .eq('id', dbRowId);
      }

    } catch (err) {
      console.error('[useOfficialArtifacts] persist/trace error:', err);
    }

    // Audit log (fire-and-forget)
    logAuditEvent({
      action: 'official_artifact_generated',
      tableName: 'erp_hr_official_artifacts',
      category: 'data_access',
      severity: 'info',
      metadata: {
        artifact_type: artifactType,
        artifact_id: artifact.id,
        company_id: companyId,
        version_number: versionNumber,
        db_row_id: dbRowId,
        is_valid: isFAN ? (artifact as FANCotizacionArtifact).isValid : (artifact as AFIArtifact).isValid,
        disclaimer: 'Artefacto interno preparatorio — NO constituye presentación oficial',
      },
    }).catch(() => {});

    // Invalidate persisted artifacts query
    queryClient.invalidateQueries({ queryKey: ['hr-official-artifacts', companyId] });

    return { dbRowId, ledgerEventId, evidenceId, versionRegistryId, versionNumber };
  }, [companyId, queryClient]);

  // ── Pre-validations ──
  const validateAFI = useCallback((params: Parameters<UseOfficialArtifactsReturn['validateAFI']>[0]) => {
    return validateAFIPrerequisites(params);
  }, []);

  const validateFAN = useCallback((params: Parameters<UseOfficialArtifactsReturn['validateFAN']>[0]) => {
    return validateFANPrerequisites(params);
  }, []);

  // ── Generic generate helper ──
  const generateAndPersist = useCallback(async (
    type: 'afi' | 'fan',
    artifact: AFIArtifact | FANCotizacionArtifact,
    snapshot: Record<string, unknown>,
    label: string,
  ): Promise<OfficialArtifactRecord> => {
    const { dbRowId, ledgerEventId, evidenceId, versionRegistryId, versionNumber } = await persistArtifact(type, artifact, snapshot);
    const record: OfficialArtifactRecord = {
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
    const isValid = type === 'afi' ? (artifact as AFIArtifact).isValid : (artifact as FANCotizacionArtifact).isValid;
    toast.success(`${label} generado (v${versionNumber})`, {
      description: isValid ? 'Validación interna OK' : 'Con errores — revisar validaciones',
    });
    return record;
  }, [persistArtifact]);

  // ── AFI Alta ──
  const generateAFIAlta = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateAFIAlta']>[0]) => {
    setIsGenerating(true);
    try {
      const artifact = buildAFIAlta({ ...params, companyId });
      const snapshot = serializeAFIForSnapshot(artifact);
      return await generateAndPersist('afi', artifact, snapshot, 'AFI Alta');
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, generateAndPersist]);

  // ── AFI Baja ──
  const generateAFIBaja = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateAFIBaja']>[0]) => {
    setIsGenerating(true);
    try {
      const artifact = buildAFIBaja({ ...params, companyId });
      const snapshot = serializeAFIForSnapshot(artifact);
      return await generateAndPersist('afi', artifact, snapshot, 'AFI Baja');
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, generateAndPersist]);

  // ── AFI Variación ──
  const generateAFIVariacion = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateAFIVariacion']>[0]) => {
    setIsGenerating(true);
    try {
      const artifact = buildAFIVariacion({ ...params, companyId });
      const snapshot = serializeAFIForSnapshot(artifact);
      return await generateAndPersist('afi', artifact, snapshot, 'AFI Variación');
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, generateAndPersist]);

  // ── FAN Cotización ──
  const generateFANCotizacion = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateFANCotizacion']>[0]) => {
    setIsGenerating(true);
    try {
      const records = params.employeeResults.map(e => buildFANEmployeeRecord(e));
      const artifact = buildFANCotizacion({
        companyId,
        companyCIF: params.companyCIF,
        companyCCC: params.companyCCC,
        companyName: params.companyName,
        periodYear: params.periodYear,
        periodMonth: params.periodMonth,
        records,
      });
      const snapshot = serializeFANForSnapshot(artifact);
      return await generateAndPersist('fan', artifact, snapshot, `FAN Cotización ${artifact.periodLabel}`);
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, generateAndPersist]);

  // ── Status promotion ──
  const promoteArtifactStatus = useCallback((index: number, targetStatus: AFIArtifactStatus | FANArtifactStatus) => {
    setArtifacts(prev => {
      const updated = [...prev];
      const rec = updated[index];
      if (!rec) return prev;

      if (rec.type === 'afi') {
        updated[index] = {
          ...rec,
          artifact: promoteAFIStatus(rec.artifact as AFIArtifact, targetStatus as AFIArtifactStatus),
        };
      } else {
        updated[index] = {
          ...rec,
          artifact: promoteFANStatus(rec.artifact as FANCotizacionArtifact, targetStatus as FANArtifactStatus),
        };
      }
      return updated;
    });
  }, []);

  // ── Download ──
  const downloadArtifact = useCallback((index: number) => {
    const rec = artifacts[index];
    if (!rec) return;
    downloadArtifactJSON(rec.artifact, `${rec.artifact.id}_v${rec.versionNumber}.json`);
    toast.success('Artefacto descargado', { description: `${rec.artifact.id}_v${rec.versionNumber}.json` });
  }, [artifacts]);

  return {
    isGenerating,
    lastArtifact,
    artifacts,
    persistedArtifacts,
    isLoadingPersisted,
    validateAFI,
    validateFAN,
    generateAFIAlta,
    generateAFIBaja,
    generateAFIVariacion,
    generateFANCotizacion,
    promoteArtifactStatus,
    downloadArtifact,
  };
}
