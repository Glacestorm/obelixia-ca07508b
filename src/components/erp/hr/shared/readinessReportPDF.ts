/**
 * readinessReportPDF — V2-ES.8 Tramo 7
 * Generates a professional PDF readiness report from OfficialReadinessSummary data.
 *
 * DISCLAIMER: This is an internal preparatory document.
 * It does NOT constitute official submission or validation.
 */

import type { OfficialReadinessSummary, ConnectorReadiness } from './officialReadinessEngine';
import {
  createPDFDocument,
  addPDFHeader,
  addPDFDisclaimer,
  addPDFFooter,
  addAutoTable,
  checkPageBreak,
  generateFileName,
  type ExportMetadata,
  type ExportResult,
} from './officialExportEngine';
import { sanitizeForPDF } from '@/components/reports/constants/fonts';

// ─── Level labels ───────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  not_ready: 'No preparado',
  partial: 'Parcial',
  ready_internal: 'Listo interno',
  ready_dryrun: 'Listo dry-run',
};

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateReadinessPDF(
  summary: OfficialReadinessSummary,
  domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
  options?: {
    companyId?: string;
    companyName?: string;
    generatedBy?: string;
    certificates?: Array<{ domain: string; status: string; completeness: number }>;
    approvals?: { pending: number; approved: number; rejected: number };
  },
): ExportResult {
  try {
    const doc = createPDFDocument('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const meta: ExportMetadata = {
      category: 'readiness_report',
      format: 'pdf',
      companyId: options?.companyId || '',
      generatedAt: new Date().toISOString(),
      generatedBy: options?.generatedBy,
      title: 'Informe de Readiness - Integraciones Oficiales',
      subtitle: `Estado de preparacion para envios oficiales · ${new Date().toLocaleDateString('es-ES')}`,
    };

    let y = addPDFHeader(doc, meta, pageWidth);

    // ── Disclaimer ──
    y = addPDFDisclaimer(doc, y, pageWidth);

    // ── Executive Summary ──
    y = checkPageBreak(doc, y, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 50, 120);
    doc.text(sanitizeForPDF('1. Resumen Ejecutivo'), margin, y);
    y += 6;

    // Summary KPIs as table
    const summaryBody = [
      ['Preparacion global', `${summary.overallPercent}%`, LEVEL_LABELS[summary.overallLevel] || summary.overallLevel],
      ['Conectores evaluados', `${summary.connectors.length}`, ''],
      ['Listos para dry-run', `${summary.dryRunReady}`, `de ${summary.connectors.length}`],
      ['Bloqueantes', `${summary.totalBlockers}`, summary.totalBlockers > 0 ? 'Requieren atencion' : 'Sin bloqueantes'],
      ['Avisos', `${summary.totalWarnings}`, summary.totalWarnings > 0 ? 'Revisar' : 'Sin avisos'],
    ];

    y = addAutoTable(doc, y, [['Metrica', 'Valor', 'Detalle']], summaryBody);
    y += 4;

    // ── Operational Pipeline ──
    y = checkPageBreak(doc, y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 50, 120);
    doc.text(sanitizeForPDF('2. Pipeline Operativo'), margin, y);
    y += 6;

    const totalPayloads = Object.values(domainStats).reduce((s, d) => s + d.payloads, 0);
    const totalValidated = Object.values(domainStats).reduce((s, d) => s + d.validated, 0);
    const totalDryRuns = Object.values(domainStats).reduce((s, d) => s + d.dryRuns, 0);

    const pipelineBody = [
      ['Payloads generados', `${totalPayloads}`],
      ['Validados internamente', `${totalValidated}`],
      ['Dry-runs ejecutados', `${totalDryRuns}`],
      ['Dominios testeados', `${Object.values(domainStats).filter(d => d.dryRuns > 0).length}`],
    ];

    y = addAutoTable(doc, y, [['Indicador', 'Valor']], pipelineBody);
    y += 4;

    // ── Per-connector detail ──
    y = checkPageBreak(doc, y, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 50, 120);
    doc.text(sanitizeForPDF('3. Detalle por Conector'), margin, y);
    y += 6;

    const connectorHead = [['Conector', 'Nivel', '%', 'Dry-run', 'Datos', 'Formato', 'Cert.', 'Bloq.', 'Avisos']];
    const connectorBody = summary.connectors.map(c => [
      sanitizeForPDF(c.label),
      LEVEL_LABELS[c.level] || c.level,
      `${c.percent}`,
      c.canDryRun ? 'Si' : 'No',
      c.signals.dataComplete ? 'OK' : 'Pendiente',
      c.signals.formatValid ? 'OK' : 'Pendiente',
      c.signals.credentialsPresent ? 'OK' : 'Pendiente',
      `${c.blockers.length}`,
      `${c.warnings.length}`,
    ]);

    y = addAutoTable(doc, y, connectorHead, connectorBody, {
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 22 },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 12, halign: 'center' },
        8: { cellWidth: 12, halign: 'center' },
      } as any,
    });
    y += 4;

    // ── Domain Stats ──
    const domainEntries = Object.entries(domainStats);
    if (domainEntries.length > 0) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 50, 120);
      doc.text(sanitizeForPDF('4. Estadisticas por Dominio'), margin, y);
      y += 6;

      const domainHead = [['Dominio', 'Payloads', 'Validados', 'Dry-runs']];
      const domainBody = domainEntries.map(([domain, stats]) => [
        domain,
        `${stats.payloads}`,
        `${stats.validated}`,
        `${stats.dryRuns}`,
      ]);

      y = addAutoTable(doc, y, domainHead, domainBody);
      y += 4;
    }

    // ── Blockers & Warnings ──
    const allBlockers = summary.connectors.flatMap(c =>
      c.blockers.map(b => [sanitizeForPDF(c.label), sanitizeForPDF(b), 'Bloqueante'])
    );
    const allWarnings = summary.connectors.flatMap(c =>
      c.warnings.map(w => [sanitizeForPDF(c.label), sanitizeForPDF(w), 'Aviso'])
    );
    const issues = [...allBlockers, ...allWarnings];

    if (issues.length > 0) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 50, 120);
      doc.text(sanitizeForPDF('5. Incidencias Detectadas'), margin, y);
      y += 6;

      y = addAutoTable(doc, y, [['Conector', 'Descripcion', 'Tipo']], issues);
      y += 4;
    }

    // ── Certificates section ──
    if (options?.certificates && options.certificates.length > 0) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 50, 120);
      doc.text(sanitizeForPDF('6. Certificados Digitales'), margin, y);
      y += 6;

      const certBody = options.certificates.map(c => [
        sanitizeForPDF(c.domain),
        sanitizeForPDF(c.status),
        `${c.completeness}%`,
      ]);
      y = addAutoTable(doc, y, [['Dominio', 'Estado', 'Completitud']], certBody);
      y += 4;
    }

    // ── Approvals section ──
    if (options?.approvals) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 50, 120);
      const sectionNum = options?.certificates?.length ? '7' : '6';
      doc.text(sanitizeForPDF(`${sectionNum}. Estado de Aprobaciones Pre-Real`), margin, y);
      y += 6;

      const approvalBody = [
        ['Pendientes', `${options.approvals.pending}`],
        ['Aprobadas', `${options.approvals.approved}`],
        ['Rechazadas', `${options.approvals.rejected}`],
      ];
      y = addAutoTable(doc, y, [['Estado', 'Cantidad']], approvalBody);
    }

    // ── Footer ──
    addPDFFooter(doc, pageWidth, pageHeight);

    // ── Save ──
    const fileName = generateFileName('readiness_report', 'pdf');
    doc.save(fileName);

    return {
      success: true,
      fileName,
      format: 'pdf',
      category: 'readiness_report',
      generatedAt: meta.generatedAt,
    };
  } catch (err) {
    console.error('[readinessReportPDF] generation error:', err);
    return {
      success: false,
      fileName: '',
      format: 'pdf',
      category: 'readiness_report',
      generatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}
