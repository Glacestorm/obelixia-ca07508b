/**
 * dryRunDiffReport — V2-ES.8 Tramo 7 P3
 * Generates PDF and Excel exports from a DryRunDiffReport.
 *
 * DISCLAIMER: Comparación interna entre simulaciones.
 * NO constituye respuesta oficial ni validación de organismo.
 */

import type { DryRunDiffReport, DiffItem, BlockerWarningDiff } from './dryRunDiffEngine';
import { getDiffDirectionLabel } from './dryRunDiffEngine';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function sectionTitle(doc: any, num: number, text: string, y: number, margin: number): number {
  y = checkPageBreak(doc, y, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 50, 120);
  doc.text(sanitizeForPDF(`${num}. ${text}`), margin, y);
  return y + 6;
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

export function generateDiffPDF(diff: DryRunDiffReport): ExportResult {
  try {
    const doc = createPDFDocument('portrait');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 15;
    let sec = 1;

    const meta: ExportMetadata = {
      category: 'dry_run_diff',
      format: 'pdf',
      companyId: '',
      generatedAt: diff.generatedAt,
      title: 'Comparativa entre Dry-Runs',
      subtitle: `Dominio: ${diff.domain} · ${fmtDate(diff.baselineAt)} vs ${fmtDate(diff.comparisonAt)}`,
      domain: diff.domain,
    };

    let y = addPDFHeader(doc, meta, pw);
    y = addPDFDisclaimer(doc, y, pw);

    // 1. Executive summary
    y = sectionTitle(doc, sec++, 'Resumen Ejecutivo', y, margin);
    y = addAutoTable(doc, y, [['Metrica', 'Valor']], [
      ['Direccion general', getDiffDirectionLabel(diff.overallDirection)],
      ['Score delta', `${diff.readinessScoreDelta > 0 ? '+' : ''}${diff.readinessScoreDelta}%`],
      ['Run base (#)', `#${diff.baselineExecNumber} — ${fmtDate(diff.baselineAt)}`],
      ['Run comparado (#)', `#${diff.comparisonExecNumber} — ${fmtDate(diff.comparisonAt)}`],
      ['Dominio', diff.domain],
      ['Cambios detectados', `${diff.diffs.length}`],
    ]);
    y += 4;

    // 2. Detailed summary lines
    if (diff.detailedSummaryLines.length > 0) {
      y = sectionTitle(doc, sec++, 'Resumen Detallado', y, margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      for (const line of diff.detailedSummaryLines) {
        y = checkPageBreak(doc, y, 5);
        doc.text(sanitizeForPDF(`• ${line}`), margin + 2, y);
        y += 4;
      }
      y += 3;
    }

    // 3. Field-level diffs
    if (diff.diffs.length > 0) {
      y = sectionTitle(doc, sec++, 'Cambios por Campo', y, margin);
      const body = diff.diffs.map(d => [
        sanitizeForPDF(d.label),
        sanitizeForPDF(d.category || ''),
        getDiffDirectionLabel(d.direction),
        sanitizeForPDF(String(d.oldValue ?? '-')),
        sanitizeForPDF(String(d.newValue ?? '-')),
        sanitizeForPDF(d.explanation || ''),
      ]);
      y = addAutoTable(doc, y, [['Campo', 'Cat.', 'Direccion', 'Anterior', 'Nuevo', 'Detalle']], body);
      y += 4;
    }

    // 4. Validation diff
    if (diff.validationDiff) {
      const vd = diff.validationDiff;
      y = sectionTitle(doc, sec++, 'Diferencias de Validacion', y, margin);
      y = addAutoTable(doc, y, [['Metrica', 'Base', 'Comparado', 'Delta']], [
        ['Score', `${vd.scoreOld}`, `${vd.scoreNew}`, `${vd.scoreDelta > 0 ? '+' : ''}${vd.scoreDelta}`],
        ['Errores', `${vd.errorsOld}`, `${vd.errorsNew}`, `${vd.errorsNew - vd.errorsOld}`],
        ['Avisos', `${vd.warningsOld}`, `${vd.warningsNew}`, `${vd.warningsNew - vd.warningsOld}`],
        ['Pasa validacion', vd.passedOld ? 'Si' : 'No', vd.passedNew ? 'Si' : 'No', ''],
      ]);
      y += 2;

      if (vd.changedChecks.length > 0) {
        const ccBody = vd.changedChecks.map(c => [
          sanitizeForPDF(c.message),
          c.oldPassed ? 'OK' : 'Fallo',
          c.newPassed ? 'OK' : 'Fallo',
          c.severity,
        ]);
        y = addAutoTable(doc, y, [['Check', 'Base', 'Comparado', 'Severidad']], ccBody);
        y += 4;
      }
    }

    // 5. Payload diff
    const pk = diff.payloadKeysDiff;
    if (pk.added.length + pk.removed.length + pk.modified.length > 0) {
      y = sectionTitle(doc, sec++, 'Cambios Estructurales de Payload', y, margin);
      const pkBody: string[][] = [];
      pk.added.slice(0, 20).forEach(k => pkBody.push([sanitizeForPDF(k), 'Añadido', '']));
      pk.removed.slice(0, 20).forEach(k => pkBody.push([sanitizeForPDF(k), 'Eliminado', '']));
      pk.modified.slice(0, 20).forEach(k => pkBody.push([sanitizeForPDF(k), 'Modificado', '']));
      y = addAutoTable(doc, y, [['Campo', 'Tipo', 'Nota']], pkBody);
      y += 4;
    }

    // 6. Blocker/warning changes
    const bw = diff.blockerWarningDiff;
    const bwRows: string[][] = [];
    bw.blockersResolved.forEach(b => bwRows.push([sanitizeForPDF(b), 'Bloqueante', 'Resuelto']));
    bw.blockersAdded.forEach(b => bwRows.push([sanitizeForPDF(b), 'Bloqueante', 'Nuevo']));
    bw.warningsResolved.forEach(w => bwRows.push([sanitizeForPDF(w), 'Aviso', 'Resuelto']));
    bw.warningsAdded.forEach(w => bwRows.push([sanitizeForPDF(w), 'Aviso', 'Nuevo']));
    if (bwRows.length > 0) {
      y = sectionTitle(doc, sec++, 'Bloqueantes y Avisos', y, margin);
      y = addAutoTable(doc, y, [['Descripcion', 'Tipo', 'Estado']], bwRows);
      y += 4;
    }

    // 7. Config/certificate diff
    if (diff.configDiff.configHashChanged || diff.configDiff.certificateChanged) {
      y = sectionTitle(doc, sec++, 'Configuracion y Certificados', y, margin);
      const cfgRows: string[][] = [];
      if (diff.configDiff.configHashChanged) cfgRows.push(['Configuracion', 'Cambio detectado entre ejecuciones']);
      if (diff.configDiff.certificateChanged) cfgRows.push(['Certificado', sanitizeForPDF(diff.configDiff.certificateDetails || 'Cambio detectado')]);
      y = addAutoTable(doc, y, [['Elemento', 'Detalle']], cfgRows);
      y += 4;
    }

    // 8. Deadline diff
    if (diff.deadlineDiff.deadlinesChanged) {
      y = sectionTitle(doc, sec++, 'Plazos Regulatorios', y, margin);
      y = addAutoTable(doc, y, [['Metrica', 'Base', 'Comparado']], [
        ['Plazos activos', `${diff.deadlineDiff.oldDeadlineCount}`, `${diff.deadlineDiff.newDeadlineCount}`],
      ]);
      y += 4;
    }

    addPDFFooter(doc, pw, ph);
    const fileName = generateFileName('dry_run_diff', 'pdf', diff.domain);
    doc.save(fileName);

    return { success: true, fileName, format: 'pdf', category: 'dry_run_diff', generatedAt: diff.generatedAt };
  } catch (err) {
    console.error('[dryRunDiffReport] PDF error:', err);
    return { success: false, fileName: '', format: 'pdf', category: 'dry_run_diff', generatedAt: new Date().toISOString(), error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}

// ─── Excel Generator ────────────────────────────────────────────────────────

export function generateDiffExcel(diff: DryRunDiffReport): ExportResult {
  try {
    const meta: ExportMetadata = {
      category: 'dry_run_diff',
      format: 'excel',
      companyId: '',
      generatedAt: diff.generatedAt,
      title: 'Comparativa entre Dry-Runs',
      subtitle: `${diff.domain} · #${diff.baselineExecNumber} vs #${diff.comparisonExecNumber}`,
      domain: diff.domain,
    };

    const wb = createWorkbook();

    // Resumen
    addSheet(wb, [
      { Metrica: 'Direccion general', Valor: getDiffDirectionLabel(diff.overallDirection) },
      { Metrica: 'Score delta', Valor: `${diff.readinessScoreDelta > 0 ? '+' : ''}${diff.readinessScoreDelta}%` },
      { Metrica: 'Run base', Valor: `#${diff.baselineExecNumber} — ${fmtDate(diff.baselineAt)}` },
      { Metrica: 'Run comparado', Valor: `#${diff.comparisonExecNumber} — ${fmtDate(diff.comparisonAt)}` },
      { Metrica: 'Dominio', Valor: diff.domain },
      { Metrica: 'Cambios detectados', Valor: `${diff.diffs.length}` },
    ], 'Resumen');

    // Cambios
    if (diff.diffs.length > 0) {
      addSheet(wb, diff.diffs.map(d => ({
        Campo: d.label,
        Categoria: d.category || '',
        Direccion: getDiffDirectionLabel(d.direction),
        Anterior: String(d.oldValue ?? ''),
        Nuevo: String(d.newValue ?? ''),
        Detalle: d.explanation || '',
      })), 'Cambios');
    }

    // Validacion
    if (diff.validationDiff) {
      const vd = diff.validationDiff;
      addSheet(wb, [
        { Metrica: 'Score', Base: vd.scoreOld, Comparado: vd.scoreNew, Delta: vd.scoreDelta },
        { Metrica: 'Errores', Base: vd.errorsOld, Comparado: vd.errorsNew, Delta: vd.errorsNew - vd.errorsOld },
        { Metrica: 'Avisos', Base: vd.warningsOld, Comparado: vd.warningsNew, Delta: vd.warningsNew - vd.warningsOld },
        { Metrica: 'Pasa', Base: vd.passedOld ? 'Si' : 'No', Comparado: vd.passedNew ? 'Si' : 'No', Delta: '' },
      ], 'Validacion');
    }

    // Payload
    const pk = diff.payloadKeysDiff;
    if (pk.added.length + pk.removed.length + pk.modified.length > 0) {
      const pkRows = [
        ...pk.added.map(k => ({ Campo: k, Tipo: 'Añadido' })),
        ...pk.removed.map(k => ({ Campo: k, Tipo: 'Eliminado' })),
        ...pk.modified.map(k => ({ Campo: k, Tipo: 'Modificado' })),
      ];
      addSheet(wb, pkRows, 'Payload');
    }

    // Bloqueantes/Avisos
    const bw = diff.blockerWarningDiff;
    const bwRows = [
      ...bw.blockersResolved.map(b => ({ Descripcion: b, Tipo: 'Bloqueante', Estado: 'Resuelto' })),
      ...bw.blockersAdded.map(b => ({ Descripcion: b, Tipo: 'Bloqueante', Estado: 'Nuevo' })),
      ...bw.warningsResolved.map(w => ({ Descripcion: w, Tipo: 'Aviso', Estado: 'Resuelto' })),
      ...bw.warningsAdded.map(w => ({ Descripcion: w, Tipo: 'Aviso', Estado: 'Nuevo' })),
    ];
    if (bwRows.length > 0) addSheet(wb, bwRows, 'Bloqueantes-Avisos');

    // Metadata
    addMetadataSheet(wb, meta);

    const fileName = generateFileName('dry_run_diff', 'excel', diff.domain);
    downloadWorkbook(wb, fileName);

    return { success: true, fileName, format: 'excel', category: 'dry_run_diff', generatedAt: diff.generatedAt };
  } catch (err) {
    console.error('[dryRunDiffReport] Excel error:', err);
    return { success: false, fileName: '', format: 'excel', category: 'dry_run_diff', generatedAt: new Date().toISOString(), error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}
