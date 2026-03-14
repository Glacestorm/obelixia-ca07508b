/**
 * useOfficialExport — V2-ES.8 Tramo 7
 * Hook that orchestrates exports for HR official integrations.
 * Manages audit trail, loading state, and format selection.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/security/auditLogger';
import { generateReadinessPDF } from '@/components/erp/hr/shared/readinessReportPDF';
import { generateReadinessExcel } from '@/components/erp/hr/shared/readinessReportExcel';
import type { OfficialReadinessSummary } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { ExportFormat, ExportCategory, ExportResult } from '@/components/erp/hr/shared/officialExportEngine';

interface UseOfficialExportReturn {
  isExporting: boolean;
  lastExport: ExportResult | null;
  exportReadiness: (
    format: ExportFormat,
    summary: OfficialReadinessSummary,
    domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
    options?: {
      companyId?: string;
      generatedBy?: string;
      certificates?: Array<{ domain: string; status: string; completeness: number }>;
      approvals?: { pending: number; approved: number; rejected: number };
    },
  ) => Promise<ExportResult>;
}

export function useOfficialExport(companyId: string): UseOfficialExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const logExport = useCallback(async (result: ExportResult, category: ExportCategory, format: ExportFormat) => {
    try {
      await logAuditEvent({
        action: 'official_export_generated',
        tableName: 'hr_official_exports',
        category: 'data_access',
        severity: 'info',
        metadata: {
          export_category: category,
          export_format: format,
          file_name: result.fileName,
          success: result.success,
          company_id: companyId,
          error: result.error,
        },
      });
    } catch (err) {
      console.error('[useOfficialExport] audit log error:', err);
    }
  }, [companyId]);

  const exportReadiness = useCallback(async (
    format: ExportFormat,
    summary: OfficialReadinessSummary,
    domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
    options?: {
      companyId?: string;
      generatedBy?: string;
      certificates?: Array<{ domain: string; status: string; completeness: number }>;
      approvals?: { pending: number; approved: number; rejected: number };
    },
  ): Promise<ExportResult> => {
    setIsExporting(true);
    try {
      const opts = { ...options, companyId: options?.companyId || companyId };

      const result = format === 'pdf'
        ? generateReadinessPDF(summary, domainStats, opts)
        : generateReadinessExcel(summary, domainStats, opts);

      setLastExport(result);

      await logExport(result, 'readiness_report', format);

      if (result.success) {
        toast.success(`Informe de readiness exportado (${format.toUpperCase()})`, {
          description: result.fileName,
        });
      } else {
        toast.error('Error al exportar informe', {
          description: result.error,
        });
      }

      return result;
    } finally {
      setIsExporting(false);
    }
  }, [companyId, logExport]);

  return {
    isExporting,
    lastExport,
    exportReadiness,
  };
}
