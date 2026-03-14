/**
 * readinessReportExcel — V2-ES.8 Tramo 7
 * Generates an Excel workbook with readiness data for operational analysis.
 * Includes: connectors, domains, deadlines, alerts, multi-entity, certificates, approvals.
 *
 * DISCLAIMER: Internal preparatory document only.
 */

import type { OfficialReadinessSummary } from './officialReadinessEngine';
import type { RegulatoryCalendarSummary } from './regulatoryCalendarEngine';
import type { MultiEntityReadinessReport } from './multiEntityReadinessEngine';
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

const URGENCY_LABELS: Record<string, string> = {
  ok: 'En plazo',
  upcoming: 'Proximo',
  urgent: 'Urgente',
  overdue: 'Vencido',
  insufficient: 'Sin datos',
  not_applicable: 'N/A',
};

export interface ReadinessExcelOptions {
  companyId?: string;
  generatedBy?: string;
  certificates?: Array<{ domain: string; status: string; completeness: number; expirationDate?: string }>;
  approvals?: { pending: number; approved: number; rejected: number };
  deadlines?: RegulatoryCalendarSummary;
  alerts?: Array<{ severity: string; category: string; title: string; status: string }>;
  multiEntity?: MultiEntityReadinessReport;
}

export function generateReadinessExcel(
  summary: OfficialReadinessSummary,
  domainStats: Record<string, { payloads: number; validated: number; dryRuns: number }>,
  options?: ReadinessExcelOptions,
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
    const resumenRows: Record<string, string | number>[] = [
      { Metrica: 'Preparacion global (%)', Valor: summary.overallPercent, Detalle: LEVEL_LABELS[summary.overallLevel] || summary.overallLevel },
      { Metrica: 'Conectores evaluados', Valor: summary.connectors.length, Detalle: '' },
      { Metrica: 'Listos para dry-run', Valor: summary.dryRunReady, Detalle: `de ${summary.connectors.length}` },
      { Metrica: 'Bloqueantes', Valor: summary.totalBlockers, Detalle: summary.totalBlockers > 0 ? 'Requieren atencion' : '' },
      { Metrica: 'Avisos', Valor: summary.totalWarnings, Detalle: '' },
      { Metrica: 'Evaluado', Valor: summary.evaluatedAt, Detalle: '' },
    ];

    if (options?.approvals) {
      resumenRows.push({ Metrica: 'Aprobaciones pendientes', Valor: options.approvals.pending, Detalle: '' });
      resumenRows.push({ Metrica: 'Aprobaciones completadas', Valor: options.approvals.approved, Detalle: '' });
      resumenRows.push({ Metrica: 'Aprobaciones rechazadas', Valor: options.approvals.rejected, Detalle: '' });
    }

    if (options?.deadlines) {
      resumenRows.push({ Metrica: 'Plazos vencidos', Valor: options.deadlines.overdueCount, Detalle: '' });
      resumenRows.push({ Metrica: 'Plazos urgentes', Valor: options.deadlines.urgentCount, Detalle: '' });
    }

    if (options?.alerts) {
      const active = options.alerts.filter(a => a.status === 'active');
      resumenRows.push({ Metrica: 'Alertas activas', Valor: active.length, Detalle: '' });
    }

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

    // ── Plazos Regulatorios sheet ──
    if (options?.deadlines && options.deadlines.deadlines.length > 0) {
      const deadlineRows = options.deadlines.deadlines.map(dl => ({
        Plazo: dl.label,
        Dominio: dl.domain.toUpperCase(),
        Fecha: dl.deadlineDate.toLocaleDateString('es-ES'),
        'Dias restantes': dl.daysRemaining,
        'Dias habiles': dl.businessDaysRemaining ?? 'N/A',
        Urgencia: URGENCY_LABELS[dl.urgency] || dl.urgency,
        Severidad: dl.severity,
        Periodo: dl.referencePeriod,
        'Base regulatoria': dl.regulatoryBasis,
        'Impacta readiness': dl.impactsReadiness ? 'Si' : 'No',
      }));
      addSheet(wb, deadlineRows, 'Plazos Regulatorios');
    }

    // ── Alertas sheet ──
    if (options?.alerts && options.alerts.length > 0) {
      const alertRows = options.alerts.map(a => ({
        Titulo: a.title,
        Categoria: a.category,
        Severidad: a.severity,
        Estado: a.status,
      }));
      addSheet(wb, alertRows, 'Alertas');
    }

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
        Expiracion: c.expirationDate ? new Date(c.expirationDate).toLocaleDateString('es-ES') : 'N/A',
      })), 'Certificados');
    }

    // ── Multi-Entity sheet ──
    if (options?.multiEntity && options.multiEntity.entities.length > 0) {
      const meRows = options.multiEntity.entities.map(e => ({
        Entidad: e.entityName,
        Tipo: e.entityType,
        NIF: e.fiscalId || '',
        'Preparacion (%)': e.summary.overallPercent,
        Nivel: LEVEL_LABELS[e.summary.overallLevel] || e.summary.overallLevel,
        Bloqueantes: e.summary.totalBlockers,
        'Dry-run listos': e.summary.dryRunReady,
        'Conectores totales': e.summary.connectors.length,
      }));
      addSheet(wb, meRows, 'Multi-Entidad');

      // Consolidated summary row
      const c = options.multiEntity.consolidated;
      addSheet(wb, [{
        Metrica: 'Promedio', Valor: `${c.avgPercent}%`,
      }, {
        Metrica: 'Minimo', Valor: `${c.minPercent}%`,
      }, {
        Metrica: 'Maximo', Valor: `${c.maxPercent}%`,
      }, {
        Metrica: 'Entidades completas', Valor: `${c.fullyReadyEntities}`,
      }, {
        Metrica: 'Bloqueantes totales', Valor: `${c.totalBlockers}`,
      }], 'Consolidado Multi-Entidad');
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
