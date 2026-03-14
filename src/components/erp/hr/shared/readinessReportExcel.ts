/**
 * readinessReportExcel — V2-ES.8 Tramo 7
 * Generates an Excel workbook with readiness data for operational analysis.
 *
 * DISCLAIMER: Internal preparatory document only.
 */

import type { OfficialReadinessSummary } from './officialReadinessEngine';
import {
  createWorkbook,
  addSheet,
  addMetadataSheet,
  downloadWorkbook,
  generateFileName,
  type ExportMetadata,
  type ExportResult,
} from './officialExportEngine';

const LEVEL_LABELS: Record<string, string> = {
  not_ready: 'No preparado',
  partial: 'Parcial',
  ready_internal: 'Listo interno',
  ready_dryrun: 'Listo dry-run',
};

export function generateReadinessExcel(
  summary: OfficialReadinessSummary,
  domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
  options?: {
    companyId?: string;
    generatedBy?: string;
    certificates?: Array<{ domain: string; status: string; completeness: number }>;
    approvals?: { pending: number; approved: number; rejected: number };
  },
): ExportResult {
  try {
    const meta: ExportMetadata = {
      category: 'readiness_report',
      format: 'excel',
      companyId: options?.companyId || '',
      generatedAt: new Date().toISOString(),
      generatedBy: options?.generatedBy,
      title: 'Readiness - Integraciones Oficiales',
      subtitle: 'Estado de preparacion para envios oficiales',
    };

    const wb = createWorkbook();

    // ── Resumen sheet ──
    const resumenRows = [
      { Metrica: 'Preparacion global (%)', Valor: summary.overallPercent, Detalle: LEVEL_LABELS[summary.overallLevel] || summary.overallLevel },
      { Metrica: 'Conectores evaluados', Valor: summary.connectors.length, Detalle: '' },
      { Metrica: 'Listos para dry-run', Valor: summary.dryRunReady, Detalle: `de ${summary.connectors.length}` },
      { Metrica: 'Bloqueantes', Valor: summary.totalBlockers, Detalle: summary.totalBlockers > 0 ? 'Requieren atencion' : '' },
      { Metrica: 'Avisos', Valor: summary.totalWarnings, Detalle: '' },
      { Metrica: 'Evaluado', Valor: summary.evaluatedAt, Detalle: '' },
    ];
    addSheet(wb, resumenRows, 'Resumen');

    // ── Conectores sheet ──
    const connectorRows = summary.connectors.map(c => ({
      Conector: c.label,
      Nivel: LEVEL_LABELS[c.level] || c.level,
      'Preparacion (%)': c.percent,
      'Puede Dry-Run': c.canDryRun ? 'Si' : 'No',
      Datos: c.signals.dataComplete ? 'OK' : 'Pendiente',
      Formato: c.signals.formatValid ? 'OK' : 'Pendiente',
      Consistencia: c.signals.consistencyOk ? 'OK' : 'Pendiente',
      Documentos: c.signals.docsReady === null ? 'N/A' : c.signals.docsReady ? 'OK' : 'Pendiente',
      Adaptador: c.adapterStatus,
      Certificado: c.signals.credentialsPresent ? 'Configurado' : 'Pendiente',
      Bloqueantes: c.blockers.length,
      Avisos: c.warnings.length,
    }));
    addSheet(wb, connectorRows, 'Conectores');

    // ── Dominios sheet ──
    const domainRows = Object.entries(domainStats).map(([domain, stats]) => ({
      Dominio: domain,
      Payloads: stats.payloads,
      Validados: stats.validated,
      'Dry-Runs': stats.dryRuns,
    }));
    addSheet(wb, domainRows, 'Dominios');

    // ── Incidencias sheet ──
    const issueRows = summary.connectors.flatMap(c => [
      ...c.blockers.map(b => ({ Conector: c.label, Tipo: 'Bloqueante', Descripcion: b })),
      ...c.warnings.map(w => ({ Conector: c.label, Tipo: 'Aviso', Descripcion: w })),
    ]);
    if (issueRows.length > 0) {
      addSheet(wb, issueRows, 'Incidencias');
    }

    // ── Certificates sheet ──
    if (options?.certificates && options.certificates.length > 0) {
      addSheet(wb, options.certificates.map(c => ({
        Dominio: c.domain,
        Estado: c.status,
        'Completitud (%)': c.completeness,
      })), 'Certificados');
    }

    // ── Metadata sheet ──
    addMetadataSheet(wb, meta);

    // ── Download ──
    const fileName = generateFileName('readiness_report', 'excel');
    downloadWorkbook(wb, fileName);

    return {
      success: true,
      fileName,
      format: 'excel',
      category: 'readiness_report',
      generatedAt: meta.generatedAt,
    };
  } catch (err) {
    console.error('[readinessReportExcel] generation error:', err);
    return {
      success: false,
      fileName: '',
      format: 'excel',
      category: 'readiness_report',
      generatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}
