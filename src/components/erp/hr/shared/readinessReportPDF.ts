/**
 * readinessReportPDF — V2-ES.8 Tramo 7
 * Generates a professional PDF readiness report from OfficialReadinessSummary data.
 * Includes: connectors, domain stats, deadlines, alerts, multi-entity, approvals, certificates.
 *
 * DISCLAIMER: This is an internal preparatory document.
 * It does NOT constitute official submission or validation.
 */

import type { OfficialReadinessSummary } from './officialReadinessEngine';
import type { RegulatoryCalendarSummary } from './regulatoryCalendarEngine';
import type { MultiEntityReadinessReport } from './multiEntityReadinessEngine';
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

const URGENCY_LABELS: Record<string, string> = {
  ok: 'En plazo',
  upcoming: 'Proximo',
  urgent: 'Urgente',
  overdue: 'Vencido',
  insufficient: 'Sin datos',
  not_applicable: 'N/A',
};

// ─── Extended options ───────────────────────────────────────────────────────

export interface ReadinessReportOptions {
  companyId?: string;
  companyName?: string;
  generatedBy?: string;
  certificates?: Array<{ domain: string; status: string; completeness: number; expirationDate?: string }>;
  approvals?: { pending: number; approved: number; rejected: number };
  deadlines?: RegulatoryCalendarSummary;
  alerts?: Array<{ severity: string; category: string; title: string; status: string }>;
  multiEntity?: MultiEntityReadinessReport;
}

// ─── Section numbering helper ───────────────────────────────────────────────

function sectionTitle(doc: any, num: number, text: string, y: number, margin: number): number {
  y = checkPageBreak(doc, y, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 50, 120);
  doc.text(sanitizeForPDF(`${num}. ${text}`), margin, y);
  return y + 6;
}

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateReadinessPDF(
  summary: OfficialReadinessSummary,
  domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
  options?: ReadinessReportOptions,
): ExportResult {
  try {
    const doc = createPDFDocument('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let section = 1;

    const meta: ExportMetadata = {
      category: 'readiness_report',
      format: 'pdf',
      companyId: options?.companyId || '',
      generatedAt: new Date().toISOString(),
      generatedBy: options?.generatedBy,
      title: 'Informe de Readiness - Integraciones Oficiales',
      subtitle: options?.companyName
        ? `${sanitizeForPDF(options.companyName)} · ${new Date().toLocaleDateString('es-ES')}`
        : `Estado de preparacion para envios oficiales · ${new Date().toLocaleDateString('es-ES')}`,
    };

    let y = addPDFHeader(doc, meta, pageWidth);

    // ── Disclaimer ──
    y = addPDFDisclaimer(doc, y, pageWidth);

    // ── 1. Executive Summary ──
    y = sectionTitle(doc, section++, 'Resumen Ejecutivo', y, margin);

    const summaryBody: (string | number)[][] = [
      ['Preparacion global', `${summary.overallPercent}%`, LEVEL_LABELS[summary.overallLevel] || summary.overallLevel],
      ['Conectores evaluados', `${summary.connectors.length}`, ''],
      ['Listos para dry-run', `${summary.dryRunReady}`, `de ${summary.connectors.length}`],
      ['Bloqueantes', `${summary.totalBlockers}`, summary.totalBlockers > 0 ? 'Requieren atencion' : 'Sin bloqueantes'],
      ['Avisos', `${summary.totalWarnings}`, summary.totalWarnings > 0 ? 'Revisar' : 'Sin avisos'],
    ];

    if (options?.approvals) {
      summaryBody.push(['Aprobaciones pendientes', `${options.approvals.pending}`, '']);
      summaryBody.push(['Aprobaciones completadas', `${options.approvals.approved}`, '']);
    }

    if (options?.deadlines) {
      summaryBody.push(['Plazos vencidos', `${options.deadlines.overdueCount}`, options.deadlines.overdueCount > 0 ? 'Requieren atencion' : '']);
      summaryBody.push(['Plazos urgentes', `${options.deadlines.urgentCount}`, '']);
    }

    if (options?.alerts) {
      const activeAlerts = options.alerts.filter(a => a.status === 'active');
      summaryBody.push(['Alertas activas', `${activeAlerts.length}`, '']);
    }

    y = addAutoTable(doc, y, [['Metrica', 'Valor', 'Detalle']], summaryBody);
    y += 4;

    // ── 2. Operational Pipeline ──
    y = sectionTitle(doc, section++, 'Pipeline Operativo', y, margin);

    const totalPayloads = Object.values(domainStats).reduce((s, d) => s + d.payloads, 0);
    const totalValidated = Object.values(domainStats).reduce((s, d) => s + d.validated, 0);
    const totalDryRuns = Object.values(domainStats).reduce((s, d) => s + d.dryRuns, 0);
    const testedDomains = Object.values(domainStats).filter(d => d.dryRuns > 0).length;

    y = addAutoTable(doc, y, [['Indicador', 'Valor']], [
      ['Payloads generados', `${totalPayloads}`],
      ['Validados internamente', `${totalValidated}`],
      ['Dry-runs ejecutados', `${totalDryRuns}`],
      ['Dominios testeados', `${testedDomains}`],
    ]);
    y += 4;

    // ── 3. Connector Detail ──
    y = sectionTitle(doc, section++, 'Detalle por Conector', y, margin);

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

    // ── 4. Domain Stats ──
    const domainEntries = Object.entries(domainStats);
    if (domainEntries.length > 0) {
      y = sectionTitle(doc, section++, 'Estadisticas por Dominio', y, margin);
      y = addAutoTable(doc, y, [['Dominio', 'Payloads', 'Validados', 'Dry-runs']], 
        domainEntries.map(([domain, stats]) => [domain, `${stats.payloads}`, `${stats.validated}`, `${stats.dryRuns}`])
      );
      y += 4;
    }

    // ── 5. Regulatory Deadlines ──
    if (options?.deadlines && options.deadlines.deadlines.length > 0) {
      y = sectionTitle(doc, section++, 'Plazos Regulatorios', y, margin);

      doc.setFont('times', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(sanitizeForPDF('Plazos orientativos internos. No sustituyen el calendario oficial de cada organismo.'), margin, y);
      y += 4;

      const deadlineBody = options.deadlines.deadlines.slice(0, 20).map(dl => [
        sanitizeForPDF(dl.label),
        dl.domain.toUpperCase(),
        dl.deadlineDate.toLocaleDateString('es-ES'),
        `${dl.daysRemaining}d`,
        URGENCY_LABELS[dl.urgency] || dl.urgency,
        sanitizeForPDF(dl.referencePeriod),
      ]);

      y = addAutoTable(doc, y, [['Plazo', 'Dominio', 'Fecha', 'Dias', 'Urgencia', 'Periodo']], deadlineBody);
      y += 4;
    }

    // ── 6. Certificates ──
    if (options?.certificates && options.certificates.length > 0) {
      y = sectionTitle(doc, section++, 'Certificados Digitales', y, margin);

      const certBody = options.certificates.map(c => [
        sanitizeForPDF(c.domain),
        sanitizeForPDF(c.status),
        `${c.completeness}%`,
        c.expirationDate ? new Date(c.expirationDate).toLocaleDateString('es-ES') : 'N/A',
      ]);
      y = addAutoTable(doc, y, [['Dominio', 'Estado', 'Completitud', 'Expiracion']], certBody);
      y += 4;
    }

    // ── 7. Active Alerts ──
    if (options?.alerts && options.alerts.length > 0) {
      const activeAlerts = options.alerts.filter(a => a.status === 'active');
      if (activeAlerts.length > 0) {
        y = sectionTitle(doc, section++, 'Alertas Proactivas Activas', y, margin);

        const alertBody = activeAlerts.slice(0, 15).map(a => [
          sanitizeForPDF(a.title),
          sanitizeForPDF(a.category),
          sanitizeForPDF(a.severity),
        ]);
        y = addAutoTable(doc, y, [['Alerta', 'Categoria', 'Severidad']], alertBody);
        y += 4;
      }
    }

    // ── 8. Blockers & Warnings ──
    const allBlockers = summary.connectors.flatMap(c =>
      c.blockers.map(b => [sanitizeForPDF(c.label), sanitizeForPDF(b), 'Bloqueante'])
    );
    const allWarnings = summary.connectors.flatMap(c =>
      c.warnings.map(w => [sanitizeForPDF(c.label), sanitizeForPDF(w), 'Aviso'])
    );
    const issues = [...allBlockers, ...allWarnings];

    if (issues.length > 0) {
      y = sectionTitle(doc, section++, 'Incidencias Detectadas', y, margin);
      y = addAutoTable(doc, y, [['Conector', 'Descripcion', 'Tipo']], issues);
      y += 4;
    }

    // ── 9. Approvals ──
    if (options?.approvals) {
      y = sectionTitle(doc, section++, 'Estado de Aprobaciones Pre-Real', y, margin);
      y = addAutoTable(doc, y, [['Estado', 'Cantidad']], [
        ['Pendientes', `${options.approvals.pending}`],
        ['Aprobadas', `${options.approvals.approved}`],
        ['Rechazadas', `${options.approvals.rejected}`],
      ]);
      y += 4;
    }

    // ── 10. Multi-Entity Readiness ──
    if (options?.multiEntity && options.multiEntity.entities.length > 1) {
      y = sectionTitle(doc, section++, 'Readiness Multi-Entidad', y, margin);

      const meBody = options.multiEntity.entities.map(e => [
        sanitizeForPDF(e.entityName),
        sanitizeForPDF(e.entityType),
        `${e.summary.overallPercent}%`,
        LEVEL_LABELS[e.summary.overallLevel] || e.summary.overallLevel,
        `${e.summary.totalBlockers}`,
        `${e.summary.dryRunReady}/${e.summary.connectors.length}`,
      ]);

      y = addAutoTable(doc, y, [['Entidad', 'Tipo', '%', 'Nivel', 'Bloq.', 'Dry-run']], meBody);
      y += 4;

      // Consolidated
      const c = options.multiEntity.consolidated;
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      y = checkPageBreak(doc, y, 12);
      doc.text(sanitizeForPDF(
        `Consolidado: ${c.avgPercent}% promedio | ${c.minPercent}% min | ${c.maxPercent}% max | ` +
        `${c.fullyReadyEntities} entidades completas | ${c.totalBlockers} bloqueantes totales`
      ), margin, y);
      y += 6;
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
