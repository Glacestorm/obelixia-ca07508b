/**
 * evidencePackGenerator — V2-ES.8 Tramo 7 P4
 * Generates internal evidence packs by domain/entity/period.
 * Aggregates readiness, dry-runs, validations, approvals, alerts into a single exportable package.
 *
 * DISCLAIMER: Paquete documental interno preparatorio.
 * NO constituye acuse oficial, justificante de organismo ni validación externa.
 */

import type { OfficialReadinessSummary } from './officialReadinessEngine';
import type { DryRunDiffReport } from './dryRunDiffEngine';
import type { RegulatoryCalendarSummary } from './regulatoryCalendarEngine';
import type { DryRunResult, DryRunEvidence } from '@/hooks/erp/hr/useDryRunPersistence';
import type { SandboxEvidenceData } from './sandboxEvidencePackExtension';
import {
  formatSandboxExecutionsForPDF,
  formatSandboxComparisonsForPDF,
  formatSandboxExecutionsForExcel,
  formatSandboxComparisonsForExcel,
} from './sandboxEvidencePackExtension';
import {
  createPDFDocument,
  addPDFHeader,
  addPDFDisclaimer,
  addPDFFooter,
  addAutoTable,
  checkPageBreak,
  generateFileName,
  createWorkbook,
  addSheet,
  addMetadataSheet,
  downloadWorkbook,
  type ExportMetadata,
  type ExportResult,
} from './officialExportEngine';
import { sanitizeForPDF } from '@/components/reports/constants/fonts';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvidencePackInput {
  companyId: string;
  companyName?: string;
  /** Filter by domain (null = all) */
  domain?: string;
  /** Filter by entity name */
  entityName?: string;
  /** Period label e.g. "2026-03" */
  period?: string;
  /** Readiness summary */
  readiness?: OfficialReadinessSummary;
  /** Domain-level stats */
  domainStats?: Record<string, { payloads: number; validated: number; dryRuns: number }>;
  /** Latest dry-runs */
  dryRuns?: DryRunResult[];
  /** Linked evidence records */
  evidence?: DryRunEvidence[];
  /** Latest diff (optional) */
  latestDiff?: DryRunDiffReport;
  /** Approval status */
  approvals?: { pending: number; approved: number; rejected: number };
  /** Calendar/deadlines */
  deadlines?: RegulatoryCalendarSummary;
  /** Active alerts */
  alerts?: Array<{ severity: string; category: string; title: string; status: string }>;
  /** Certificates */
  certificates?: Array<{ domain: string; status: string; completeness: number; expirationDate?: string }>;
  /** V2-ES.8 T9: Sandbox execution data */
  sandboxData?: SandboxEvidenceData;
}

const LEVEL_LABELS: Record<string, string> = {
  not_ready: 'No preparado',
  partial: 'Parcial',
  ready_internal: 'Listo interno',
  ready_dryrun: 'Listo dry-run',
};

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function sectionTitle(doc: any, num: number, text: string, y: number, margin: number): number {
  y = checkPageBreak(doc, y, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 50, 120);
  doc.text(sanitizeForPDF(`${num}. ${text}`), margin, y);
  return y + 6;
}

// ─── PDF Evidence Pack ──────────────────────────────────────────────────────

export function generateEvidencePackPDF(input: EvidencePackInput): ExportResult {
  try {
    const doc = createPDFDocument('portrait');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 15;
    let sec = 1;

    const scopeParts: string[] = [];
    if (input.domain) scopeParts.push(`Dominio: ${input.domain}`);
    if (input.entityName) scopeParts.push(`Entidad: ${input.entityName}`);
    if (input.period) scopeParts.push(`Periodo: ${input.period}`);
    const scopeLabel = scopeParts.length > 0 ? scopeParts.join(' · ') : 'Global';

    const meta: ExportMetadata = {
      category: 'evidence_pack',
      format: 'pdf',
      companyId: input.companyId,
      generatedAt: new Date().toISOString(),
      title: 'Evidence Pack Interno',
      subtitle: `${input.companyName || input.companyId} · ${scopeLabel}`,
      domain: input.domain,
      period: input.period,
    };

    let y = addPDFHeader(doc, meta, pw);
    y = addPDFDisclaimer(doc, y, pw);

    // 1. Scope & metadata
    y = sectionTitle(doc, sec++, 'Alcance del Evidence Pack', y, margin);
    y = addAutoTable(doc, y, [['Parametro', 'Valor']], [
      ['Empresa', sanitizeForPDF(input.companyName || input.companyId)],
      ['Dominio', input.domain || 'Todos'],
      ['Entidad', input.entityName || 'Global'],
      ['Periodo', input.period || 'Actual'],
      ['Generado', fmtDate(meta.generatedAt)],
    ]);
    y += 4;

    // 2. Readiness summary
    if (input.readiness) {
      const r = input.readiness;
      y = sectionTitle(doc, sec++, 'Estado de Readiness', y, margin);

      const connectors = input.domain
        ? r.connectors.filter(c => c.connectorId.toLowerCase().includes((input.domain || '').toLowerCase()))
        : r.connectors;

      y = addAutoTable(doc, y, [['Metrica', 'Valor']], [
        ['Preparacion global', `${r.overallPercent}% — ${LEVEL_LABELS[r.overallLevel] || r.overallLevel}`],
        ['Conectores en scope', `${connectors.length}`],
        ['Dry-run ready', `${connectors.filter(c => c.canDryRun).length}`],
        ['Bloqueantes', `${connectors.reduce((s, c) => s + c.blockers.length, 0)}`],
      ]);
      y += 4;
    }

    // 3. Dry-runs
    if (input.dryRuns && input.dryRuns.length > 0) {
      const runs = input.domain
        ? input.dryRuns.filter(r => r.submission_domain.toLowerCase().includes((input.domain || '').toLowerCase()))
        : input.dryRuns;

      if (runs.length > 0) {
        y = sectionTitle(doc, sec++, 'Historial de Dry-Runs', y, margin);
        const body = runs.slice(0, 15).map(r => [
          `#${r.execution_number}`,
          sanitizeForPDF(r.submission_domain),
          r.status,
          `${r.readiness_score}%`,
          fmtDate(r.created_at),
        ]);
        y = addAutoTable(doc, y, [['#', 'Dominio', 'Estado', 'Score', 'Fecha']], body);
        y += 4;
      }
    }

    // 4. Evidence records
    if (input.evidence && input.evidence.length > 0) {
      y = sectionTitle(doc, sec++, 'Evidencias Documentales Vinculadas', y, margin);
      const evBody = input.evidence.slice(0, 20).map(e => [
        sanitizeForPDF(e.label),
        e.evidence_type,
        e.document_id ? 'Si' : 'No',
        fmtDate(e.created_at),
      ]);
      y = addAutoTable(doc, y, [['Evidencia', 'Tipo', 'Expediente', 'Fecha']], evBody);
      y += 4;
    }

    // 5. Approvals
    if (input.approvals) {
      y = sectionTitle(doc, sec++, 'Aprobaciones Pre-Real', y, margin);
      y = addAutoTable(doc, y, [['Estado', 'Cantidad']], [
        ['Pendientes', `${input.approvals.pending}`],
        ['Aprobadas', `${input.approvals.approved}`],
        ['Rechazadas', `${input.approvals.rejected}`],
      ]);
      y += 4;
    }

    // 6. Deadlines
    if (input.deadlines && input.deadlines.deadlines.length > 0) {
      const dls = input.domain
        ? input.deadlines.deadlines.filter(d => d.domain.toLowerCase().includes((input.domain || '').toLowerCase()))
        : input.deadlines.deadlines;

      if (dls.length > 0) {
        y = sectionTitle(doc, sec++, 'Plazos Regulatorios', y, margin);
        const dlBody = dls.slice(0, 10).map(d => [
          sanitizeForPDF(d.label),
          d.domain.toUpperCase(),
          d.deadlineDate.toLocaleDateString('es-ES'),
          `${d.daysRemaining}d`,
        ]);
        y = addAutoTable(doc, y, [['Plazo', 'Dominio', 'Fecha', 'Dias']], dlBody);
        y += 4;
      }
    }

    // 7. Active alerts
    if (input.alerts && input.alerts.length > 0) {
      const active = input.alerts.filter(a => a.status === 'active');
      if (active.length > 0) {
        y = sectionTitle(doc, sec++, 'Alertas Activas', y, margin);
        const alBody = active.slice(0, 10).map(a => [
          sanitizeForPDF(a.title),
          a.category,
          a.severity,
        ]);
        y = addAutoTable(doc, y, [['Alerta', 'Categoria', 'Severidad']], alBody);
        y += 4;
      }
    }

    // 8. Certificates
    if (input.certificates && input.certificates.length > 0) {
      const certs = input.domain
        ? input.certificates.filter(c => c.domain.toLowerCase().includes((input.domain || '').toLowerCase()))
        : input.certificates;

      if (certs.length > 0) {
        y = sectionTitle(doc, sec++, 'Certificados', y, margin);
        const certBody = certs.map(c => [
          sanitizeForPDF(c.domain),
          c.status,
          `${c.completeness}%`,
          c.expirationDate ? new Date(c.expirationDate).toLocaleDateString('es-ES') : 'N/A',
        ]);
        y = addAutoTable(doc, y, [['Dominio', 'Estado', 'Completitud', 'Expiracion']], certBody);
        y += 4;
      }
    }

    // 9. Sandbox executions (T9)
    if (input.sandboxData?.sandboxExecutions && input.sandboxData.sandboxExecutions.length > 0) {
      y = sectionTitle(doc, sec++, 'Ejecuciones Sandbox', y, margin);
      const { headers, body } = formatSandboxExecutionsForPDF(input.sandboxData.sandboxExecutions);
      y = addAutoTable(doc, y, headers, body);
      y += 2;
      doc.setFont('times', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(sanitizeForPDF('Ejecuciones sandbox preparatorias — no constituyen envios oficiales'), margin, y, { maxWidth: pw - margin * 2 });
      y += 6;
    }

    // 10. Sandbox vs Dry-run comparisons (T9)
    if (input.sandboxData?.sandboxComparisons && input.sandboxData.sandboxComparisons.length > 0) {
      y = sectionTitle(doc, sec++, 'Comparativa Sandbox vs Dry-Run', y, margin);
      const { headers: cHeaders, body: cBody } = formatSandboxComparisonsForPDF(input.sandboxData.sandboxComparisons);
      y = addAutoTable(doc, y, cHeaders, cBody);
      y += 2;
      doc.setFont('times', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(sanitizeForPDF('Comparativa interna — no constituye validacion de organismo'), margin, y, { maxWidth: pw - margin * 2 });
      y += 6;
    }

    // Final disclaimer
    y = checkPageBreak(doc, y, 20);
    doc.setFont('times', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(sanitizeForPDF(
      'Este evidence pack es un documento interno preparatorio. No constituye acuse oficial, ' +
      'justificante de organismo ni validacion externa de cumplimiento.'
    ), margin, y, { maxWidth: pw - margin * 2 });

    addPDFFooter(doc, pw, ph);
    const fileName = generateFileName('evidence_pack', 'pdf', input.domain);
    doc.save(fileName);

    return { success: true, fileName, format: 'pdf', category: 'evidence_pack', generatedAt: meta.generatedAt };
  } catch (err) {
    console.error('[evidencePackGenerator] PDF error:', err);
    return { success: false, fileName: '', format: 'pdf', category: 'evidence_pack', generatedAt: new Date().toISOString(), error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}

// ─── Excel Evidence Pack ────────────────────────────────────────────────────

export function generateEvidencePackExcel(input: EvidencePackInput): ExportResult {
  try {
    const meta: ExportMetadata = {
      category: 'evidence_pack',
      format: 'excel',
      companyId: input.companyId,
      generatedAt: new Date().toISOString(),
      title: 'Evidence Pack Interno',
      subtitle: `${input.companyName || input.companyId}`,
      domain: input.domain,
      period: input.period,
    };

    const wb = createWorkbook();

    // Scope
    addSheet(wb, [
      { Parametro: 'Empresa', Valor: input.companyName || input.companyId },
      { Parametro: 'Dominio', Valor: input.domain || 'Todos' },
      { Parametro: 'Entidad', Valor: input.entityName || 'Global' },
      { Parametro: 'Periodo', Valor: input.period || 'Actual' },
      { Parametro: 'Generado', Valor: fmtDate(meta.generatedAt) },
    ], 'Alcance');

    // Readiness
    if (input.readiness) {
      const connectors = input.domain
        ? input.readiness.connectors.filter(c => c.connectorId.toLowerCase().includes((input.domain || '').toLowerCase()))
        : input.readiness.connectors;

      addSheet(wb, connectors.map(c => ({
        Conector: c.label,
        Nivel: LEVEL_LABELS[c.level] || c.level,
        '%': c.percent,
        'Dry-run': c.canDryRun ? 'Si' : 'No',
        Bloqueantes: c.blockers.length,
        Avisos: c.warnings.length,
      })), 'Readiness');
    }

    // Dry-runs
    if (input.dryRuns && input.dryRuns.length > 0) {
      const runs = input.domain
        ? input.dryRuns.filter(r => r.submission_domain.toLowerCase().includes((input.domain || '').toLowerCase()))
        : input.dryRuns;

      if (runs.length > 0) {
        addSheet(wb, runs.map(r => ({
          '#': r.execution_number,
          Dominio: r.submission_domain,
          Estado: r.status,
          Score: r.readiness_score,
          Modo: r.execution_mode,
          Fecha: fmtDate(r.created_at),
        })), 'Dry-Runs');
      }
    }

    // Evidence
    if (input.evidence && input.evidence.length > 0) {
      addSheet(wb, input.evidence.map(e => ({
        Evidencia: e.label,
        Tipo: e.evidence_type,
        'Vinculada a expediente': e.document_id ? 'Si' : 'No',
        'Dry-run ID': e.dry_run_id,
        Fecha: fmtDate(e.created_at),
      })), 'Evidencias');
    }

    // Deadlines
    if (input.deadlines && input.deadlines.deadlines.length > 0) {
      const dls = input.domain
        ? input.deadlines.deadlines.filter(d => d.domain.toLowerCase().includes((input.domain || '').toLowerCase()))
        : input.deadlines.deadlines;

      if (dls.length > 0) {
        addSheet(wb, dls.map(d => ({
          Plazo: d.label,
          Dominio: d.domain.toUpperCase(),
          Fecha: d.deadlineDate.toLocaleDateString('es-ES'),
          'Dias restantes': d.daysRemaining,
          Urgencia: d.urgency,
        })), 'Plazos');
      }
    }

    // Alerts
    if (input.alerts && input.alerts.length > 0) {
      addSheet(wb, input.alerts.map(a => ({
        Titulo: a.title,
        Categoria: a.category,
        Severidad: a.severity,
        Estado: a.status,
      })), 'Alertas');
    }

    // Certificates
    if (input.certificates && input.certificates.length > 0) {
      addSheet(wb, input.certificates.map(c => ({
        Dominio: c.domain,
        Estado: c.status,
        'Completitud (%)': c.completeness,
        Expiracion: c.expirationDate || 'N/A',
      })), 'Certificados');
    }

    addMetadataSheet(wb, meta);

    const fileName = generateFileName('evidence_pack', 'excel', input.domain);
    downloadWorkbook(wb, fileName);

    return { success: true, fileName, format: 'excel', category: 'evidence_pack', generatedAt: meta.generatedAt };
  } catch (err) {
    console.error('[evidencePackGenerator] Excel error:', err);
    return { success: false, fileName: '', format: 'excel', category: 'evidence_pack', generatedAt: new Date().toISOString(), error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}
