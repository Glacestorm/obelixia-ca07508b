/**
 * officialExportEngine — V2-ES.8 Tramo 7
 * Base export utilities for HR official integrations reporting.
 * Provides PDF and Excel generation helpers with branding, disclaimers, and audit support.
 *
 * IMPORTANT DISCLAIMERS:
 * - exported ≠ presentado oficialmente
 * - evidence pack ≠ acuse oficial
 * - readiness report ≠ validación del organismo
 * - reporte interno ≠ cumplimiento confirmado externamente
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { sanitizeForPDF } from '@/components/reports/constants/fonts';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExportFormat = 'pdf' | 'excel';

export type ExportCategory =
  | 'readiness_report'
  | 'dry_run_summary'
  | 'dry_run_diff'
  | 'evidence_pack'
  | 'connector_status'
  | 'approval_history';

export interface ExportMetadata {
  category: ExportCategory;
  format: ExportFormat;
  companyId: string;
  generatedAt: string;
  generatedBy?: string;
  title: string;
  subtitle?: string;
  /** Domain filter applied */
  domain?: string;
  /** Period filter applied */
  period?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  format: ExportFormat;
  category: ExportCategory;
  generatedAt: string;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BRAND_NAME = 'ObelixIA';
const BRAND_FULL = 'ObelixIA ERP Enterprise';
const MODULE_NAME = 'RRHH - Integraciones Oficiales';

const DISCLAIMER_LINES = [
  'DOCUMENTO INTERNO - NO CONSTITUYE PRESENTACION OFICIAL',
  'Este informe es de uso interno preparatorio. No sustituye la presentacion',
  'ante organismos oficiales ni valida cumplimiento normativo.',
  'Los datos reflejados son el resultado de simulaciones internas (dry-run)',
  'y no representan comunicaciones reales enviadas a TGSS, AEAT o SEPE.',
];

const PDF_COLORS = {
  primary: [15, 50, 120] as const,
  primaryLight: [30, 80, 150] as const,
  text: [30, 30, 30] as const,
  muted: [120, 120, 120] as const,
  success: [22, 101, 52] as const,
  warning: [161, 98, 7] as const,
  error: [153, 27, 27] as const,
  white: [255, 255, 255] as const,
  gray100: [243, 244, 246] as const,
  gray200: [229, 231, 235] as const,
  disclaimerBg: [254, 249, 195] as const,
  disclaimerBorder: [234, 179, 8] as const,
};

// ─── PDF Helpers ────────────────────────────────────────────────────────────

export function createPDFDocument(orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  return new jsPDF({ orientation, unit: 'mm', format: 'a4' });
}

export function addPDFHeader(
  doc: jsPDF,
  meta: ExportMetadata,
  pageWidth: number,
): number {
  const margin = 15;
  let y = 15;

  // Brand bar
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(sanitizeForPDF(BRAND_FULL), margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(sanitizeForPDF(MODULE_NAME), margin, 18);

  // Date on right
  const dateStr = new Date(meta.generatedAt).toLocaleString('es-ES', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  doc.text(sanitizeForPDF(dateStr), pageWidth - margin, 12, { align: 'right' });
  doc.text('Documento interno preparatorio', pageWidth - margin, 18, { align: 'right' });

  y = 35;

  // Title
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(sanitizeForPDF(meta.title), margin, y);
  y += 6;

  if (meta.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(sanitizeForPDF(meta.subtitle), margin, y);
    y += 5;
  }

  // Separator
  doc.setDrawColor(...PDF_COLORS.gray200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  return y;
}

export function addPDFDisclaimer(doc: jsPDF, y: number, pageWidth: number): number {
  const margin = 15;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = 22;

  // Check page space
  if (y + boxHeight + 10 > doc.internal.pageSize.getHeight() - 15) {
    doc.addPage();
    y = 15;
  }

  // Disclaimer box
  doc.setFillColor(...PDF_COLORS.disclaimerBg);
  doc.setDrawColor(...PDF_COLORS.disclaimerBorder);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.warning);
  doc.text(sanitizeForPDF(DISCLAIMER_LINES[0]), margin + 4, y + 5);

  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.muted);
  for (let i = 1; i < DISCLAIMER_LINES.length; i++) {
    doc.text(sanitizeForPDF(DISCLAIMER_LINES[i]), margin + 4, y + 5 + i * 3.5);
  }

  return y + boxHeight + 4;
}

export function addPDFFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.muted);

    const footerY = pageHeight - 8;
    doc.text(
      sanitizeForPDF(`${BRAND_NAME} | Documento interno preparatorio | Pagina ${p} de ${totalPages}`),
      pageWidth / 2, footerY, { align: 'center' },
    );
    doc.text(
      sanitizeForPDF(`(c) ${new Date().getFullYear()} ${BRAND_NAME} - Todos los derechos reservados`),
      pageWidth / 2, footerY + 3, { align: 'center' },
    );
  }
}

export function checkPageBreak(doc: jsPDF, y: number, needed: number, margin = 15): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return margin;
  }
  return y;
}

// ─── Excel Helpers ──────────────────────────────────────────────────────────

export function createWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}

export function addSheet(
  wb: XLSX.WorkBook,
  data: Record<string, unknown>[],
  sheetName: string,
  headers?: string[],
): void {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  // Set column widths
  if (data.length > 0) {
    const keys = headers || Object.keys(data[0]);
    ws['!cols'] = keys.map(k => ({
      wch: Math.max(k.length + 2, 15),
    }));
  }
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
}

export function addMetadataSheet(wb: XLSX.WorkBook, meta: ExportMetadata): void {
  const rows = [
    { Campo: 'Titulo', Valor: meta.title },
    { Campo: 'Subtitulo', Valor: meta.subtitle || '' },
    { Campo: 'Categoria', Valor: meta.category },
    { Campo: 'Formato', Valor: meta.format },
    { Campo: 'Generado', Valor: meta.generatedAt },
    { Campo: 'Generado por', Valor: meta.generatedBy || 'Sistema' },
    { Campo: 'Dominio', Valor: meta.domain || 'Todos' },
    { Campo: 'Periodo', Valor: meta.period || 'Actual' },
    { Campo: 'Disclaimer', Valor: DISCLAIMER_LINES.join(' ') },
    { Campo: 'Producto', Valor: BRAND_FULL },
    { Campo: 'Modulo', Valor: MODULE_NAME },
  ];
  addSheet(wb, rows, 'Metadata');
}

export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  XLSX.writeFile(wb, fileName);
}

// ─── File naming ────────────────────────────────────────────────────────────

export function generateFileName(
  category: ExportCategory,
  format: ExportFormat,
  domain?: string,
  dateSuffix?: string,
): string {
  const date = dateSuffix || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const domainSuffix = domain ? `_${domain.toLowerCase()}` : '';
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  return `obelixia_hr_${category}${domainSuffix}_${date}.${ext}`;
}

// ─── AutoTable wrapper ──────────────────────────────────────────────────────

export function addAutoTable(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: (string | number)[][],
  options?: Partial<{
    columnStyles: Record<number, any>;
    headStyles: Record<string, any>;
    margin: { left: number; right: number };
  }>,
): number {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      textColor: PDF_COLORS.text as any,
    },
    headStyles: {
      fillColor: PDF_COLORS.primary as any,
      textColor: PDF_COLORS.white as any,
      fontStyle: 'bold',
      fontSize: 7.5,
      ...options?.headStyles,
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.gray100 as any,
    },
    margin: options?.margin || { left: 15, right: 15 },
    columnStyles: options?.columnStyles,
  });

  return (doc as any).lastAutoTable?.finalY || startY + 20;
}
