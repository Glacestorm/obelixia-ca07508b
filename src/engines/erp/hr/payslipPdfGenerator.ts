/**
 * payslipPdfGenerator — Generador único de PDF del recibo de nómina ES (S9.22).
 * Variantes:
 *   - 'official': PDF limpio, sin watermark (uso oficial firmado por empresa).
 *   - 'system_generated': watermark diagonal + banner ámbar superior + hash en footer
 *      → recibo provisional generado por el sistema.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PayslipRenderModel } from './payslipRenderModel';
import { PAYROLL_LEGAL_NOTICES } from '@/lib/hr/payroll/legalNotices';
import { openPrintDialogForJsPdf } from '@/lib/pdfPrint';

export type PayslipPdfVariant = 'official' | 'system_generated';

export interface GeneratePayslipPdfOptions {
  variant: PayslipPdfVariant;
  /** Hash SHA-256 (hex) del calculation_details fuente. Solo se imprime en system_generated. */
  sourceHash?: string | null;
}

const fmt = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const PRIMARY: [number, number, number] = [30, 58, 95];
const MUTED: [number, number, number] = [110, 110, 110];
const AMBER_BG: [number, number, number] = [254, 243, 199];
const AMBER_TEXT: [number, number, number] = [146, 64, 14];

/**
 * Genera un PDF del recibo de nómina y devuelve la instancia jsPDF.
 */
export function generatePayslipPDF(
  model: PayslipRenderModel,
  options: GeneratePayslipPdfOptions,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = model.header.currency || 'EUR';

  let cursorY = 14;

  // ─── Banner ámbar superior (solo system_generated) ───
  if (options.variant === 'system_generated') {
    doc.setFillColor(...AMBER_BG);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(...AMBER_TEXT);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'RECIBO PROVISIONAL · Pendiente de documento oficial firmado por la empresa',
      pageWidth / 2,
      7.5,
      { align: 'center' },
    );
    cursorY = 18;
  }

  // ─── Cabecera ───
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE SALARIOS', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Período: ${model.header.periodoLabel}` +
      (model.header.periodoDesde && model.header.periodoHasta
        ? `  ·  ${model.header.periodoDesde} – ${model.header.periodoHasta}`
        : ''),
    pageWidth / 2,
    cursorY,
    { align: 'center' },
  );
  cursorY += 6;

  // ─── Bloque empresa / trabajador ───
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(14, cursorY, pageWidth - 14, cursorY);
  cursorY += 4;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA', 14, cursorY);
  doc.text('TRABAJADOR', pageWidth / 2 + 4, cursorY);
  cursorY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const companyLines = [
    model.header.empresaNombre,
    `CIF: ${model.header.empresaCIF}`,
    `CCC: ${model.header.empresaCCC}`,
  ];
  const workerLines = [
    model.header.empleadoNombre,
    `DNI/NIE: ${model.header.empleadoDNI}  ·  NAF: ${model.header.empleadoNAF}`,
    `Categoría: ${model.header.empleadoCategoria}` +
      (model.header.empleadoGrupoCotizacion
        ? `  ·  Grupo: ${model.header.empleadoGrupoCotizacion}`
        : ''),
  ];
  for (let i = 0; i < Math.max(companyLines.length, workerLines.length); i++) {
    if (companyLines[i]) doc.text(String(companyLines[i]), 14, cursorY);
    if (workerLines[i]) doc.text(String(workerLines[i]), pageWidth / 2 + 4, cursorY);
    cursorY += 4;
  }

  cursorY += 2;

  // ─── I. Devengos ───
  cursorY = drawSectionTitle(doc, 'I. DEVENGOS', cursorY);
  autoTable(doc, {
    startY: cursorY,
    head: [['Concepto', 'Unid.', 'Importe (€)']],
    body: model.devengos.length
      ? model.devengos.map((l) => [
          l.name,
          l.units != null ? String(l.units) : '—',
          fmt(l.amount, currency),
        ])
      : [['—', '—', fmt(0, currency)]],
    foot: [
      [
        { content: 'TOTAL DEVENGOS', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: fmt(model.totals.totalDevengos, currency), styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
    footStyles: { fillColor: [240, 240, 240], textColor: 30 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // ─── II. Deducciones ───
  cursorY = drawSectionTitle(doc, 'II. DEDUCCIONES', cursorY);
  autoTable(doc, {
    startY: cursorY,
    head: [['Concepto', 'Base (€)', '%', 'Importe (€)']],
    body: model.deducciones.length
      ? model.deducciones.map((l) => [
          l.name,
          l.base != null ? fmt(Number(l.base), currency) : '—',
          l.percentage != null ? `${l.percentage}%` : '—',
          fmt(l.amount, currency),
        ])
      : [['—', '—', '—', fmt(0, currency)]],
    foot: [
      [
        { content: 'TOTAL DEDUCCIONES', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: fmt(model.totals.totalDeducciones, currency), styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
    footStyles: { fillColor: [240, 240, 240], textColor: 30 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // ─── III. Bases de cotización ───
  if (cursorY > pageHeight - 60) {
    doc.addPage();
    cursorY = 14;
  }
  cursorY = drawSectionTitle(doc, 'III. BASES DE COTIZACIÓN', cursorY);
  autoTable(doc, {
    startY: cursorY,
    body: [
      ['Base contingencias comunes', fmt(model.bases.baseCC, currency)],
      ['Base AT/EP', fmt(model.bases.baseAT, currency)],
      ['Base IRPF', fmt(model.bases.baseIRPF, currency)],
      ['Base horas extra', fmt(model.bases.baseHorasExtra, currency)],
    ],
    theme: 'plain',
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 2;

  if (model.notes.length) {
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'italic');
    for (const n of model.notes) {
      doc.text(n, 14, cursorY);
      cursorY += 3.5;
    }
  }
  cursorY += 2;

  // ─── IV. Coste empresa (opcional, solo si hay datos) ───
  if (model.costesEmpresa.length > 0) {
    if (cursorY > pageHeight - 60) {
      doc.addPage();
      cursorY = 14;
    }
    cursorY = drawSectionTitle(doc, 'IV. COSTE EMPRESA (SS)', cursorY);
    autoTable(doc, {
      startY: cursorY,
      head: [['Concepto', 'Base (€)', '%', 'Importe (€)']],
      body: model.costesEmpresa.map((l) => [
        l.name,
        l.base != null ? fmt(Number(l.base), currency) : '—',
        l.percentage != null ? `${l.percentage}%` : '—',
        fmt(l.amount, currency),
      ]),
      foot: [
        [
          { content: 'TOTAL COSTE EMPRESA (SS)', colSpan: 3, styles: { fontStyle: 'bold' } },
          {
            content: fmt(model.totals.totalCosteEmpresa, currency),
            styles: { fontStyle: 'bold' },
          },
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
      footStyles: { fillColor: [240, 240, 240], textColor: 30 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ─── Totales ───
  if (cursorY > pageHeight - 50) {
    doc.addPage();
    cursorY = 14;
  }
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, cursorY, pageWidth - 28, 18, 2, 2, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LÍQUIDO A PERCIBIR', 18, cursorY + 7);
  doc.setFontSize(13);
  doc.text(fmt(model.totals.liquidoPercibir, currency), pageWidth - 18, cursorY + 8, {
    align: 'right',
  });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    `Coste total empresa: ${fmt(model.totals.costeTotalEmpresa, currency)}  ·  Tipo IRPF efectivo: ${model.totals.tipoIRPF}%`,
    18,
    cursorY + 14,
  );
  cursorY += 22;

  // ─── Aviso legal canónico ───
  if (cursorY > pageHeight - 40) {
    doc.addPage();
    cursorY = 14;
  }
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  const legalLines = [
    PAYROLL_LEGAL_NOTICES.RECEIPT_DELIVERY,
    PAYROLL_LEGAL_NOTICES.ACK_MEANING,
    PAYROLL_LEGAL_NOTICES.CLAIM_TERM,
    PAYROLL_LEGAL_NOTICES.RETENTION,
  ];
  for (const line of legalLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - 28);
    doc.text(wrapped, 14, cursorY);
    cursorY += wrapped.length * 3 + 1.5;
  }

  // ─── Watermark + footer system_generated ───
  if (options.variant === 'system_generated') {
    drawWatermark(doc);
    drawSystemFooter(doc, options.sourceHash || model.sourceHash || null);
  } else {
    drawOfficialFooter(doc);
  }

  return doc;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY);
  doc.text(title, 14, y);
  return y + 2;
}

function drawWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const gState = (doc as any).GState
      ? new (doc as any).GState({ opacity: 0.12 })
      : null;
    if (gState) (doc as any).setGState(gState);
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(34);
    doc.setFont('helvetica', 'bold');
    doc.text('GENERADO POR EL SISTEMA · NO FIRMADO ELECTRÓNICAMENTE', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 35,
    });
    if (gState) {
      const reset = new (doc as any).GState({ opacity: 1 });
      (doc as any).setGState(reset);
    }
  }
}

function drawSystemFooter(doc: jsPDF, sourceHash: string | null) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Recibo provisional generado por el sistema · No firmado electrónicamente · Página ${p}/${pageCount}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' },
    );
    if (sourceHash) {
      const short = sourceHash.length > 24 ? sourceHash.slice(0, 24) + '…' : sourceHash;
      doc.text(`SHA-256: ${short}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
    }
  }
}

function drawOfficialFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${p}/${pageCount}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
  }
}

/** Dispara descarga inmediata del PDF. */
export function downloadPayslipPDF(
  model: PayslipRenderModel,
  fileName: string,
  variant: PayslipPdfVariant = 'system_generated',
  sourceHash?: string | null,
) {
  const doc = generatePayslipPDF(model, { variant, sourceHash });
  doc.save(fileName);
}

/** Abre el diálogo de impresión del navegador. */
export function printPayslipPDF(
  model: PayslipRenderModel,
  variant: PayslipPdfVariant = 'system_generated',
  sourceHash?: string | null,
) {
  const doc = generatePayslipPDF(model, { variant, sourceHash });
  openPrintDialogForJsPdf(doc);
}