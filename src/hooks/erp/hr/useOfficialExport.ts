/**
 * useOfficialExport — V2-ES.8 Tramo 7
 * Hook that orchestrates exports for HR official integrations.
 * Manages audit trail, loading state, and format selection.
 * Supports: readiness reports, dry-run diffs, evidence packs.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/security/auditLogger';
import { generateReadinessPDF, type ReadinessReportOptions } from '@/components/erp/hr/shared/readinessReportPDF';
import { generateReadinessExcel, type ReadinessExcelOptions } from '@/components/erp/hr/shared/readinessReportExcel';
import { generateDiffPDF, generateDiffExcel } from '@/components/erp/hr/shared/dryRunDiffReport';
import { generateEvidencePackPDF, generateEvidencePackExcel, type EvidencePackInput } from '@/components/erp/hr/shared/evidencePackGenerator';
import type { OfficialReadinessSummary } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { DryRunDiffReport } from '@/components/erp/hr/shared/dryRunDiffEngine';
import type { ExportFormat, ExportCategory, ExportResult } from '@/components/erp/hr/shared/officialExportEngine';

/** Unified options for readiness export */
export type ReadinessExportOptions = ReadinessReportOptions & ReadinessExcelOptions;

interface UseOfficialExportReturn {
  isExporting: boolean;
  lastExport: ExportResult | null;
  exportReadiness: (
    format: ExportFormat,
    summary: OfficialReadinessSummary,
    domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
    options?: ReadinessExportOptions,
  ) => Promise<ExportResult>;
  exportDiff: (
    format: ExportFormat,
    diff: DryRunDiffReport,
  ) => Promise<ExportResult>;
  exportEvidencePack: (
    format: ExportFormat,
    input: EvidencePackInput,
  ) => Promise<ExportResult>;
}

export function useOfficialExport(companyId: string): UseOfficialExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const logExport = useCallback(async (result: ExportResult, category: ExportCategory, format: ExportFormat) => {
    // Map category to specific audit event name
    const eventMap: Record<string, string> = {
      readiness_report: result.success ? 'readiness_report_exported' : 'readiness_report_export_failed',
      dry_run_diff: result.success ? 'dry_run_diff_exported' : 'dry_run_diff_export_failed',
      evidence_pack: result.success ? 'evidence_pack_generated' : 'evidence_pack_generation_failed',
      dry_run_summary: result.success ? 'dry_run_summary_exported' : 'dry_run_summary_export_failed',
      connector_status: result.success ? 'connector_status_exported' : 'connector_status_export_failed',
      approval_history: result.success ? 'approval_history_exported' : 'approval_history_export_failed',
    };
    try {
      await logAuditEvent({
        action: eventMap[category] || 'official_export_generated',
        tableName: 'hr_official_exports',
        category: 'data_access',
        severity: result.success ? 'info' : 'warning',
        metadata: {
          export_category: category,
          export_format: format,
          file_name: result.fileName,
          success: result.success,
          company_id: companyId,
          error: result.error,
          disclaimer: 'Documento interno preparatorio — no constituye presentación oficial ni validación de organismo',
        },
      });
    } catch (err) {
      console.error('[useOfficialExport] audit log error:', err);
    }
  }, [companyId]);

  const handleResult = useCallback(async (result: ExportResult, category: ExportCategory, format: ExportFormat, label: string) => {
    setLastExport(result);
    await logExport(result, category, format);
    if (result.success) {
      toast.success(`${label} exportado (${format.toUpperCase()})`, { description: result.fileName });
    } else {
      toast.error(`Error al exportar ${label.toLowerCase()}`, { description: result.error });
    }
    return result;
  }, [logExport]);

  const exportReadiness = useCallback(async (
    format: ExportFormat,
    summary: OfficialReadinessSummary,
    domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
    options?: ReadinessExportOptions,
  ): Promise<ExportResult> => {
    setIsExporting(true);
    try {
      const opts = { ...options, companyId: options?.companyId || companyId };
      const result = format === 'pdf'
        ? generateReadinessPDF(summary, domainStats, opts)
        : generateReadinessExcel(summary, domainStats, opts);
      return await handleResult(result, 'readiness_report', format, 'Informe de readiness');
    } finally {
      setIsExporting(false);
    }
  }, [companyId, handleResult]);

  const exportDiff = useCallback(async (
    format: ExportFormat,
    diff: DryRunDiffReport,
  ): Promise<ExportResult> => {
    setIsExporting(true);
    try {
      const result = format === 'pdf'
        ? generateDiffPDF(diff)
        : generateDiffExcel(diff);
      return await handleResult(result, 'dry_run_diff', format, 'Comparativa dry-run');
    } finally {
      setIsExporting(false);
    }
  }, [handleResult]);

  const exportEvidencePack = useCallback(async (
    format: ExportFormat,
    input: EvidencePackInput,
  ): Promise<ExportResult> => {
    setIsExporting(true);
    try {
      const result = format === 'pdf'
        ? generateEvidencePackPDF(input)
        : generateEvidencePackExcel(input);
      return await handleResult(result, 'evidence_pack', format, 'Evidence pack');
    } finally {
      setIsExporting(false);
    }
  }, [handleResult]);

  return {
    isExporting,
    lastExport,
    exportReadiness,
    exportDiff,
    exportEvidencePack,
  };
}
