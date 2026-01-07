/**
 * ERP PDF Part Generators
 * 7 partes para documentación comercial ERP Enterprise
 */

import jsPDF from 'jspdf';
import { BRAND, PDF_COLORS, SAFE_FONTS, sanitizeForPDF, ERP_COMPONENTS, ERP_HOOKS, ERP_EDGE_FUNCTIONS } from '../constants';

// Helper type for analysis data
interface ERPAnalysis {
  version: string;
  modules: Array<{
    name: string;
    description: string;
    implementedFeatures: string[];
    pendingFeatures: string[];
    completionPercentage: number;
    files: string[];
    businessValue?: string;
    differentiators?: string[];
  }>;
  codeStats: {
    totalComponents: number;
    totalEdgeFunctions: number;
    linesOfCode: number;
  };
  marketValuation: {
    totalCost: number;
    totalHours: number;
    hourlyRate: number;
    marketValue?: number;
  };
}

// PDF Helper creator
const createERPPDFHelpers = (doc: jsPDF, analysis: ERPAnalysis) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin + 10;
  let pageNumber = 1;

  const sanitizeText = (text: string) => sanitizeForPDF(text);

  const addPageNumber = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`ObelixIA ERP Enterprise v${analysis.version} - Pagina ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`(c) ${new Date().getFullYear()} ObelixIA - Confidencial`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const addNewPage = () => {
    addPageNumber();
    doc.addPage();
    pageNumber++;
    currentY = margin + 10;
  };

  const checkPageBreak = (requiredSpace: number = 30) => {
    if (currentY + requiredSpace > pageHeight - 25) {
      addNewPage();
      return true;
    }
    return false;
  };

  const addMainTitle = (text: string) => {
    checkPageBreak(20);
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, currentY - 5, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(text), pageWidth / 2, currentY + 3, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 18;
  };

  const addTitle = (text: string, level: number = 2) => {
    checkPageBreak(15);
    const sizes = { 2: 12, 3: 11, 4: 10 };
    const colors = {
      2: PDF_COLORS.titles.h2,
      3: PDF_COLORS.titles.h3,
      4: PDF_COLORS.titles.h4,
    };
    doc.setFontSize(sizes[level as keyof typeof sizes] || 11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(colors[level as keyof typeof colors] || PDF_COLORS.primary));
    doc.text(sanitizeText(text), margin, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  };

  const addSubtitle = (text: string) => addTitle(text, 3);

  const addParagraph = (text: string) => {
    checkPageBreak(20);
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const lines = doc.splitTextToSize(sanitizeText(text), contentWidth);
    doc.text(lines, margin, currentY);
    currentY += lines.length * 4.5 + 4;
  };

  const addBullet = (text: string, indent: number = 0) => {
    checkPageBreak(8);
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const bulletX = margin + indent * 5;
    doc.text('-', bulletX, currentY);
    const lines = doc.splitTextToSize(sanitizeText(text), contentWidth - indent * 5 - 5);
    doc.text(lines, bulletX + 4, currentY);
    currentY += lines.length * 4 + 2;
  };

  const addHighlightBox = (title: string, content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    checkPageBreak(35);
    const colors = {
      info: { bg: PDF_COLORS.backgrounds.info, border: PDF_COLORS.borders.info, title: [20, 60, 140] as [number, number, number] },
      success: { bg: PDF_COLORS.backgrounds.success, border: PDF_COLORS.borders.success, title: [22, 101, 52] as [number, number, number] },
      warning: { bg: PDF_COLORS.backgrounds.warning, border: PDF_COLORS.borders.warning, title: [161, 98, 7] as [number, number, number] },
      error: { bg: PDF_COLORS.backgrounds.error, border: PDF_COLORS.borders.error, title: [153, 27, 27] as [number, number, number] },
    };
    const style = colors[type];
    
    doc.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
    doc.setDrawColor(style.border[0], style.border[1], style.border[2]);
    const lines = doc.splitTextToSize(sanitizeText(content), contentWidth - 10);
    const boxHeight = 14 + lines.length * 4;
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(style.title[0], style.title[1], style.title[2]);
    doc.text(sanitizeText(title), margin + 5, currentY + 6);
    
    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(lines, margin + 5, currentY + 12);
    currentY += boxHeight + 6;
  };

  const addTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
    checkPageBreak(20 + rows.length * 7);
    const numCols = headers.length;
    const defaultWidth = contentWidth / numCols;
    const widths = colWidths || headers.map(() => defaultWidth);
    
    // Header
    doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      doc.text(sanitizeText(header), xPos, currentY + 5);
      xPos += widths[i];
    });
    currentY += 7;
    
    // Rows
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(PDF_COLORS.backgrounds.zebra[0], PDF_COLORS.backgrounds.zebra[1], PDF_COLORS.backgrounds.zebra[2]);
        doc.rect(margin, currentY, contentWidth, 6, 'F');
      }
      xPos = margin + 2;
      row.forEach((cell, i) => {
        const cellText = doc.splitTextToSize(sanitizeText(cell), widths[i] - 4);
        doc.text(cellText[0] || '', xPos, currentY + 4);
        xPos += widths[i];
      });
      currentY += 6;
    });
    currentY += 4;
  };

  const addProgressBar = (label: string, value: number, max: number = 100) => {
    checkPageBreak(12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText(label), margin, currentY);
    
    const barX = margin + 60;
    const barWidth = 80;
    const barHeight = 4;
    const fillWidth = (value / max) * barWidth;
    
    doc.setFillColor(...PDF_COLORS.gray[200]);
    doc.roundedRect(barX, currentY - 3, barWidth, barHeight, 1, 1, 'F');
    
    const barColor = value >= 80 ? PDF_COLORS.success : value >= 50 ? PDF_COLORS.warning : PDF_COLORS.error;
    doc.setFillColor(...barColor);
    doc.roundedRect(barX, currentY - 3, fillWidth, barHeight, 1, 1, 'F');
    
    doc.text(`${value}%`, barX + barWidth + 5, currentY);
    currentY += 7;
  };

  return {
    doc, pageWidth, pageHeight, margin, contentWidth,
    get currentY() { return currentY; },
    set currentY(val: number) { currentY = val; },
    get pageNumber() { return pageNumber; },
    sanitizeText, addPageNumber, addNewPage, checkPageBreak,
    addMainTitle, addTitle, addSubtitle, addParagraph, addBullet,
    addHighlightBox, addTable, addProgressBar
  };
};

// ERP Component counts
const getERPStats = () => {
  const components = Object.values(ERP_COMPONENTS).flat();
  return {
    totalComponents: components.length,
    totalHooks: ERP_HOOKS.length,
    totalEdgeFunctions: ERP_EDGE_FUNCTIONS.length,
    accounting: ERP_COMPONENTS.accounting.length,
    sales: ERP_COMPONENTS.sales.length,
    purchases: ERP_COMPONENTS.purchases.length,
    treasury: ERP_COMPONENTS.treasury.length,
    inventory: ERP_COMPONENTS.inventory.length,
    banking: ERP_COMPONENTS.banking.length,
    trade: ERP_COMPONENTS.trade.length,
    audit: ERP_COMPONENTS.audit.length,
  };
};

/**
 * ERP PART 1: Resumen Ejecutivo ERP - Contabilidad PGC
 */
export const generateERPPart1 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);
  const stats = getERPStats();

  // PORTADA
  setProgress(5);
    doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('PARTE 1: Resumen Ejecutivo - Contabilidad PGC', h.pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  doc.setFillColor(...PDF_COLORS.backgrounds.muted);
  doc.roundedRect(h.margin, h.currentY - 5, h.contentWidth, 55, 3, 3, 'F');
  
  doc.setFontSize(10);
  const metadata = [
    ['Fecha:', new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Componentes ERP:', `${stats.totalComponents} componentes contables`],
    ['Hooks Especializados:', `${stats.totalHooks} hooks de negocio`],
    ['Edge Functions:', `${stats.totalEdgeFunctions} funciones IA`],
    ['Normativa:', 'PGC Espana + Andorra, NIIF/IFRS completo'],
    ['Coste Desarrollo:', `${analysis.marketValuation.totalCost.toLocaleString()} EUR`],
  ];
  
  metadata.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, h.margin + 5, h.currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), h.margin + 55, h.currentY);
    h.currentY += 8;
  });

  h.currentY += 8;
  h.addHighlightBox('PARTE 1 - CONTENIDO ERP', 
    'Resumen Ejecutivo ERP, Arquitectura Contable PGC, Plan de Cuentas Multinorma, Libro Diario Inteligente, Cierre Fiscal Automatizado, Estados Financieros.',
    'info');

  h.addPageNumber();

  // INDICE
  h.addNewPage();
  setProgress(10);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('INDICE - PARTE 1 ERP', h.pageWidth / 2, h.currentY, { align: 'center' });
  h.currentY += 12;
  doc.setTextColor(0, 0, 0);

  const indexItems = [
    { num: '1', title: 'RESUMEN EJECUTIVO ERP', page: 3 },
    { num: '2', title: 'ARQUITECTURA CONTABLE', page: 5 },
    { num: '2.1', title: 'Plan General de Contabilidad PGC', page: 6 },
    { num: '2.2', title: 'Plan de Cuentas Multinorma', page: 8 },
    { num: '2.3', title: 'Grupos Contables 1-9', page: 10 },
    { num: '3', title: 'LIBRO DIARIO INTELIGENTE', page: 12 },
    { num: '3.1', title: 'Asientos Automaticos con IA', page: 13 },
    { num: '3.2', title: 'Validacion PGC en Tiempo Real', page: 15 },
    { num: '4', title: 'CIERRE FISCAL AUTOMATIZADO', page: 17 },
    { num: '4.1', title: 'Wizard de Cierre Contable', page: 18 },
    { num: '4.2', title: 'Regularizacion y Resultado', page: 20 },
    { num: '5', title: 'ESTADOS FINANCIEROS', page: 22 },
    { num: '5.1', title: 'Balance de Situacion', page: 23 },
    { num: '5.2', title: 'Cuenta de Perdidas y Ganancias', page: 25 },
    { num: '5.3', title: 'Estado de Flujos de Efectivo', page: 27 },
  ];

  doc.setFontSize(9);
  indexItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(item.num, h.margin, h.currentY);
    doc.text(item.title, h.margin + 12, h.currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    const dotsWidth = h.contentWidth - 45 - doc.getTextWidth(item.title);
    const dots = '.'.repeat(Math.max(1, Math.floor(dotsWidth / 1.5)));
    doc.text(dots, h.margin + 17 + doc.getTextWidth(item.title), h.currentY);
    doc.setTextColor(0, 0, 0);
    doc.text(String(item.page), h.pageWidth - h.margin, h.currentY, { align: 'right' });
    h.currentY += 6;
  });

  h.addPageNumber();

  // 1. RESUMEN EJECUTIVO ERP
  h.addNewPage();
  setProgress(20);
  
  h.addMainTitle('1. RESUMEN EJECUTIVO ERP ENTERPRISE');
  
  h.addParagraph(`ObelixIA ERP Enterprise version ${analysis.version} es una plataforma contable-financiera completa desarrollada bajo normativa PGC Espana y Andorra, con soporte completo NIIF/IFRS. Incluye ${stats.totalComponents} componentes especializados y ${stats.totalEdgeFunctions} funciones de inteligencia artificial para automatizacion contable.`);

  h.addHighlightBox('PROPUESTA DE VALOR ERP', 
    'ERP contable-financiero que reduce el tiempo de cierre fiscal un 70%, automatiza el 85% de asientos contables con IA, y garantiza cumplimiento PGC/NIIF con validacion en tiempo real. Propiedad total del codigo sin dependencia de terceros.',
    'success');

  h.addSubtitle('Estadisticas Clave ERP');
  h.addTable(
    ['Modulo', 'Componentes', 'Funcionalidad Principal'],
    [
      ['Contabilidad', String(stats.accounting), 'Plan Cuentas, Diario, Mayor, Cierre'],
      ['Ventas', String(stats.sales), 'Facturacion, Pedidos, Albaranes'],
      ['Compras', String(stats.purchases), 'Proveedores, RFQ, Recepciones'],
      ['Tesoreria', String(stats.treasury), 'Cash Flow, SEPA, Confirming'],
      ['Inventario', String(stats.inventory), 'Stock, Almacenes, Valoracion'],
      ['Banking Hub', String(stats.banking), 'Conexiones, Conciliacion, Extractos'],
      ['Trade Finance', String(stats.trade), 'Creditos Documentarios, Forex'],
      ['Auditoria', String(stats.audit), 'Trail, Controles, Compliance'],
    ],
    [50, 35, 89]
  );

  h.addNewPage();
  setProgress(30);
  h.addTitle('1.1 Diferenciadores ERP Enterprise', 2);
  
  const differentiators = [
    'Unico ERP con contabilidad PGC Espana + Andorra nativa integrada',
    'Asistente IA contable que genera asientos automaticos validados',
    'Cierre fiscal automatizado con wizard paso a paso',
    'Estados financieros PGC con formatos oficiales AEAT',
    'Conciliacion bancaria automatica con machine learning',
    'SEPA y remesas integradas sin modulos adicionales',
    'Multiempresa, multimoneda y multiidioma nativo',
    'Codigo fuente propio sin dependencia de licencias externas',
  ];
  
  differentiators.forEach(d => h.addBullet(d));

  // 2. ARQUITECTURA CONTABLE
  h.addNewPage();
  setProgress(40);
  
  h.addMainTitle('2. ARQUITECTURA CONTABLE PGC');
  
  h.addParagraph('La arquitectura contable de ObelixIA ERP sigue estrictamente el Plan General de Contabilidad espanol (Real Decreto 1514/2007) con adaptaciones para Andorra y soporte completo de Normas Internacionales de Informacion Financiera (NIIF/IFRS).');

  h.addSubtitle('2.1 Plan General de Contabilidad');
  h.addTable(
    ['Grupo', 'Descripcion', 'Cuentas Implementadas'],
    [
      ['Grupo 1', 'Financiacion Basica', '100-199 (Capital, Reservas, Deudas LP)'],
      ['Grupo 2', 'Activo No Corriente', '200-299 (Inmovilizado, Amortizaciones)'],
      ['Grupo 3', 'Existencias', '300-399 (Mercancias, Materias Primas)'],
      ['Grupo 4', 'Acreedores y Deudores', '400-499 (Proveedores, Clientes)'],
      ['Grupo 5', 'Cuentas Financieras', '500-599 (Bancos, Caja, Inversiones)'],
      ['Grupo 6', 'Compras y Gastos', '600-699 (Compras, Gastos Personal)'],
      ['Grupo 7', 'Ventas e Ingresos', '700-799 (Ventas, Ingresos Financieros)'],
      ['Grupo 8', 'Gastos Imputados Patrimonio', '800-899 (Gastos ECPN)'],
      ['Grupo 9', 'Ingresos Imputados Patrimonio', '900-999 (Ingresos ECPN)'],
    ],
    [30, 65, 79]
  );

  h.addNewPage();
  setProgress(50);
  h.addSubtitle('2.2 Caracteristicas Plan de Cuentas');
  
  h.addHighlightBox('MULTINORMA CONTABLE', 
    'El plan de cuentas soporta simultaneamente PGC Espana, PGC Andorra y NIIF/IFRS, permitiendo reporting en multiples normativas desde una unica base de datos contable.',
    'info');

  const features = [
    'Estructura jerarquica ilimitada de cuentas (hasta 12 digitos)',
    'Cuentas auxiliares para clientes, proveedores y bancos',
    'Centros de coste y analitica por dimension',
    'Conversion automatica entre normativas contables',
    'Validacion en tiempo real de asientos contra plan',
    'Bloqueo de cuentas cerradas por ejercicio',
  ];
  features.forEach(f => h.addBullet(f));

  // 3. LIBRO DIARIO
  h.addNewPage();
  setProgress(60);
  
  h.addMainTitle('3. LIBRO DIARIO INTELIGENTE');
  
  h.addParagraph('El Libro Diario de ObelixIA ERP incorpora inteligencia artificial para automatizar la creacion de asientos contables, validar la coherencia PGC y sugerir contrapartidas basadas en patrones historicos.');

  h.addSubtitle('3.1 Asientos Automaticos con IA');
  h.addTable(
    ['Tipo Documento', 'Automatizacion', 'Precision IA'],
    [
      ['Factura Venta', 'Asiento completo con IVA', '99.2%'],
      ['Factura Compra', 'Asiento con retenciones', '98.8%'],
      ['Extracto Bancario', 'Reconocimiento y asiento', '97.5%'],
      ['Nominas', 'Desglose por concepto', '99.5%'],
      ['Amortizaciones', 'Calculo y asiento mensual', '100%'],
      ['Periodificaciones', 'Distribucion temporal', '99.0%'],
    ],
    [50, 70, 54]
  );

  h.addNewPage();
  setProgress(70);
  h.addSubtitle('3.2 Validacion PGC Tiempo Real');
  
  h.addParagraph('Cada asiento se valida automaticamente contra las reglas del Plan General de Contabilidad:');
  
  const validations = [
    'Cuadre debe/haber obligatorio',
    'Cuentas existentes en plan activo',
    'Periodos contables abiertos',
    'Coherencia de signos por naturaleza cuenta',
    'Limites de importes configurables',
    'Alertas por cuentas inusuales',
  ];
  validations.forEach(v => h.addBullet(v));

  // 4. CIERRE FISCAL
  h.addNewPage();
  setProgress(80);
  
  h.addMainTitle('4. CIERRE FISCAL AUTOMATIZADO');
  
  h.addParagraph('El proceso de cierre fiscal se ejecuta mediante un wizard inteligente que guia paso a paso las operaciones de regularizacion, calculo de resultado y apertura del nuevo ejercicio.');

  h.addSubtitle('4.1 Wizard de Cierre Contable');
  h.addTable(
    ['Paso', 'Operacion', 'Automatizacion'],
    [
      ['1', 'Revision saldos pendientes', 'Alertas automaticas'],
      ['2', 'Amortizaciones pendientes', 'Calculo y asiento'],
      ['3', 'Periodificaciones', 'Propuesta IA'],
      ['4', 'Provision impuestos', 'Calculo IS/IRPF'],
      ['5', 'Regularizacion grupos 6-7', 'Asiento automatico'],
      ['6', 'Calculo resultado ejercicio', 'Cuenta 129'],
      ['7', 'Asiento de cierre', 'Generacion completa'],
      ['8', 'Asiento de apertura', 'Nuevo ejercicio'],
    ],
    [20, 70, 84]
  );

  // 5. ESTADOS FINANCIEROS
  h.addNewPage();
  setProgress(90);
  
  h.addMainTitle('5. ESTADOS FINANCIEROS PGC');
  
  h.addParagraph('ObelixIA ERP genera automaticamente los estados financieros oficiales segun los formatos establecidos por el Plan General de Contabilidad, listos para presentacion ante la AEAT y deposito en el Registro Mercantil.');

  h.addSubtitle('5.1 Estados Disponibles');
  h.addTable(
    ['Estado Financiero', 'Formatos', 'Exportacion'],
    [
      ['Balance de Situacion', 'Normal, Abreviado, PYME', 'PDF, Excel, XBRL'],
      ['Cuenta de PyG', 'Normal, Abreviado', 'PDF, Excel, XBRL'],
      ['Estado Cambios PN', 'Completo', 'PDF, Excel'],
      ['Estado Flujos Efectivo', 'Metodo directo/indirecto', 'PDF, Excel'],
      ['Memoria', 'Estructurada por notas', 'Word, PDF'],
    ],
    [55, 60, 59]
  );

  h.addHighlightBox('DEPOSITO CUENTAS AUTOMATICO', 
    'Generacion automatica de ficheros XBRL para deposito telematico de cuentas anuales en el Registro Mercantil, compatible con formatos D2 y taxonomias vigentes.',
    'success');

  // PAGINA FINAL
  h.addNewPage();
  setProgress(98);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documentacion Comercial Exhaustiva v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 1 de 7 - Resumen Ejecutivo y Contabilidad PGC', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addSubtitle('Resumen Documento ERP (7 Partes)');
  const summaryData = [
    ['Parte 1:', 'Resumen Ejecutivo, Contabilidad PGC'],
    ['Parte 2:', 'Modulos Contables, NIIF, Fiscalidad'],
    ['Parte 3:', 'Facturacion, SII, FacturaE, Ventas/Compras'],
    ['Parte 4:', 'Tesoreria Enterprise, Cash Flow'],
    ['Parte 5:', 'Inventario, Stock, Logistica'],
    ['Parte 6:', 'Compliance NIIF/IFRS, Auditoria'],
    ['Parte 7:', 'Integracion Bancaria, SEPA, Core Banking'],
  ];
  
  summaryData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, h.margin, h.currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, h.margin + 25, h.currentY);
    h.currentY += 6;
  });

  h.currentY += 8;
  h.addHighlightBox('DOCUMENTACION COMPLETA ERP', 
    `Las 7 partes contienen documentacion comercial exhaustiva del ERP contable-financiero con ${stats.totalComponents} componentes y ${stats.totalEdgeFunctions} funciones IA.`,
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE1_Contabilidad_PGC_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};

/**
 * ERP PART 2: Modulos Contables - NIIF y Fiscalidad
 */
export const generateERPPart2 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);
  const stats = getERPStats();

  // PORTADA
  setProgress(5);
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PARTE 2: Modulos Contables - NIIF y Fiscalidad', h.pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  h.addHighlightBox('PARTE 2 - CONTENIDO', 
    'Modulos Contables Avanzados, Contabilidad Analitica, Centros de Coste, NIIF/IFRS Completo, Consolidacion, Impuesto Sociedades, Fiscalidad Internacional.',
    'info');

  h.addPageNumber();

  // 6. MODULOS CONTABLES AVANZADOS
  h.addNewPage();
  setProgress(15);
  
  h.addMainTitle('6. MODULOS CONTABLES AVANZADOS');
  
  h.addParagraph('ObelixIA ERP incluye modulos contables avanzados que van mas alla de la contabilidad basica, permitiendo analisis multidimensional, consolidacion de grupos y reporting avanzado.');

  h.addSubtitle('6.1 Contabilidad Analitica');
  h.addParagraph('Sistema completo de contabilidad analitica con multiples dimensiones de analisis:');
  
  h.addTable(
    ['Dimension', 'Descripcion', 'Niveles'],
    [
      ['Centros de Coste', 'Departamentos, Unidades de Negocio', 'Hasta 5 niveles'],
      ['Proyectos', 'Proyectos, Obras, Contratos', 'Ilimitados'],
      ['Productos', 'Lineas de Producto, Familias', 'Hasta 4 niveles'],
      ['Clientes', 'Segmentos, Zonas Geograficas', 'Hasta 3 niveles'],
      ['Campanas', 'Marketing, Promociones', 'Por periodo'],
    ],
    [45, 75, 54]
  );

  h.addNewPage();
  setProgress(25);
  h.addSubtitle('6.2 Presupuestos y Desviaciones');
  
  h.addParagraph('Gestion presupuestaria completa con control de desviaciones en tiempo real:');
  
  const budgetFeatures = [
    'Presupuestos anuales con desglose mensual',
    'Multiples versiones (inicial, revisado, forecast)',
    'Comparativa presupuesto vs real automatica',
    'Alertas por desviaciones configurables',
    'Bloqueo de gastos que excedan presupuesto',
    'Reporting de desviaciones por dimension',
  ];
  budgetFeatures.forEach(f => h.addBullet(f));

  // 7. NIIF/IFRS
  h.addNewPage();
  setProgress(35);
  
  h.addMainTitle('7. NORMATIVA NIIF/IFRS');
  
  h.addParagraph('Soporte completo de Normas Internacionales de Informacion Financiera para empresas que reportan bajo IFRS o grupos multinacionales.');

  h.addSubtitle('7.1 NIIF Implementadas');
  h.addTable(
    ['NIIF', 'Descripcion', 'Funcionalidad'],
    [
      ['NIIF 9', 'Instrumentos Financieros', 'Valoracion, Deterioro, Coberturas'],
      ['NIIF 15', 'Ingresos de Contratos', 'Reconocimiento 5 pasos'],
      ['NIIF 16', 'Arrendamientos', 'Activos por derecho uso'],
      ['NIC 12', 'Impuesto Ganancias', 'Diferidos, Corrientes'],
      ['NIC 21', 'Tipo de Cambio', 'Conversion, Diferencias'],
      ['NIC 36', 'Deterioro Activos', 'Test impairment'],
    ],
    [30, 60, 84]
  );

  h.addNewPage();
  setProgress(45);
  h.addSubtitle('7.2 Conversion PGC a NIIF');
  
  h.addHighlightBox('MAPPING AUTOMATICO', 
    'El sistema convierte automaticamente la contabilidad PGC a NIIF mediante tablas de correspondencia configurables, generando ajustes de conversion trazables.',
    'info');

  // 8. CONSOLIDACION
  h.addNewPage();
  setProgress(55);
  
  h.addMainTitle('8. CONSOLIDACION DE GRUPOS');
  
  h.addParagraph('Modulo de consolidacion para grupos empresariales con multiples sociedades, soportando metodos de integracion global, proporcional y puesta en equivalencia.');

  h.addTable(
    ['Metodo', 'Aplicacion', 'Automatizacion'],
    [
      ['Integracion Global', 'Filiales >50% control', 'Eliminaciones automaticas'],
      ['Integracion Proporcional', 'Multigrupo', 'Prorrateo configurable'],
      ['Puesta Equivalencia', 'Asociadas 20-50%', 'Ajustes participacion'],
      ['Eliminaciones', 'Operaciones intragrupo', 'Deteccion automatica'],
      ['Conversion Moneda', 'Filiales extranjeras', 'Tipos BCE automaticos'],
    ],
    [50, 55, 69]
  );

  // 9. FISCALIDAD
  h.addNewPage();
  setProgress(70);
  
  h.addMainTitle('9. FISCALIDAD EMPRESARIAL');
  
  h.addParagraph('Gestion fiscal completa incluyendo Impuesto de Sociedades, IVA, retenciones y obligaciones informativas.');

  h.addSubtitle('9.1 Impuesto de Sociedades');
  h.addTable(
    ['Concepto', 'Funcionalidad', 'Automatizacion'],
    [
      ['Base Imponible', 'Calculo desde resultado contable', 'Ajustes permanentes/temporales'],
      ['Tipo Impositivo', 'General, reducido, cooperativas', 'Seleccion por sociedad'],
      ['Deducciones', 'I+D+i, Empleo, Reinversion', 'Control limites'],
      ['Pagos Fraccionados', 'Modelos 202, 222', 'Generacion automatica'],
      ['Declaracion Anual', 'Modelo 200', 'Cumplimentacion asistida'],
    ],
    [45, 60, 69]
  );

  h.addNewPage();
  setProgress(85);
  h.addSubtitle('9.2 Modelos Fiscales');
  
  h.addTable(
    ['Modelo', 'Descripcion', 'Periodicidad'],
    [
      ['303', 'Autoliquidacion IVA', 'Mensual/Trimestral'],
      ['349', 'Operaciones Intracomunitarias', 'Mensual/Trimestral'],
      ['347', 'Operaciones con Terceros', 'Anual'],
      ['390', 'Resumen Anual IVA', 'Anual'],
      ['111', 'Retenciones Trabajo', 'Mensual/Trimestral'],
      ['190', 'Resumen Retenciones', 'Anual'],
      ['200', 'Impuesto Sociedades', 'Anual'],
      ['202', 'Pago Fraccionado IS', 'Trimestral'],
    ],
    [30, 80, 64]
  );

  // PAGINA FINAL
  h.addNewPage();
  setProgress(98);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Documentacion Comercial v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 2 de 7 - Modulos Contables, NIIF y Fiscalidad', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addHighlightBox('PARTE 2 COMPLETADA', 
    'Modulos contables avanzados con soporte NIIF/IFRS completo, consolidacion de grupos y fiscalidad empresarial integrada.',
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE2_NIIF_Fiscalidad_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};

/**
 * ERP PART 3: Facturacion y SII
 */
export const generateERPPart3 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);

  // PORTADA
  setProgress(5);
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PARTE 3: Facturacion, SII y FacturaE', h.pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  h.addHighlightBox('PARTE 3 - CONTENIDO', 
    'Facturacion Electronica, SII AEAT, FacturaE/Facturae, Ciclo Ventas Completo, Ciclo Compras, IVA Automatico, Retenciones.',
    'info');

  h.addPageNumber();

  // 10. FACTURACION ELECTRONICA
  h.addNewPage();
  setProgress(15);
  
  h.addMainTitle('10. FACTURACION ELECTRONICA');
  
  h.addParagraph('Sistema completo de facturacion electronica conforme a la normativa espanola y europea, con soporte SII, FacturaE y formatos internacionales.');

  h.addSubtitle('10.1 Formatos Soportados');
  h.addTable(
    ['Formato', 'Normativa', 'Uso'],
    [
      ['FacturaE 3.2.2', 'Ley 25/2013', 'Factura electronica Espana'],
      ['UBL 2.1', 'EN 16931', 'Factura europea B2G'],
      ['CII D16B', 'UN/CEFACT', 'Comercio internacional'],
      ['PEPPOL BIS 3.0', 'OpenPEPPOL', 'Red paneuropea'],
      ['PDF/A-3', 'ISO 19005', 'Archivo con XML embebido'],
    ],
    [45, 50, 79]
  );

  // 11. SII AEAT
  h.addNewPage();
  setProgress(30);
  
  h.addMainTitle('11. SII - SUMINISTRO INMEDIATO INFORMACION');
  
  h.addParagraph('Integracion completa con el Suministro Inmediato de Informacion de la AEAT para el envio automatico de libros registro de IVA.');

  h.addSubtitle('11.1 Libros Registro SII');
  h.addTable(
    ['Libro', 'Contenido', 'Plazo Envio'],
    [
      ['Facturas Emitidas', 'Ventas y servicios', '4 dias habiles'],
      ['Facturas Recibidas', 'Compras y gastos', '4 dias habiles'],
      ['Bienes de Inversion', 'Activos fijos', '4 dias habiles'],
      ['Operaciones Intracomunitarias', 'Adquisiciones/Entregas', '4 dias habiles'],
    ],
    [55, 60, 59]
  );

  h.addHighlightBox('ENVIO AUTOMATICO SII', 
    'Las facturas se envian automaticamente al SII tras su validacion, con reintentos automaticos y gestion de errores. Estado sincronizado en tiempo real.',
    'success');

  // 12. CICLO VENTAS
  h.addNewPage();
  setProgress(45);
  
  h.addMainTitle('12. CICLO DE VENTAS COMPLETO');
  
  h.addParagraph('Flujo completo desde presupuesto hasta cobro, con trazabilidad total y contabilizacion automatica.');

  h.addTable(
    ['Documento', 'Siguiente Fase', 'Contabilizacion'],
    [
      ['Presupuesto', 'Pedido de Venta', 'No contabiliza'],
      ['Pedido de Venta', 'Albaran', 'Compromiso opcional'],
      ['Albaran de Venta', 'Factura', 'Existencias (si aplica)'],
      ['Factura de Venta', 'Cobro', 'Clientes + IVA + Ingresos'],
      ['Cobro', 'Conciliacion', 'Tesoreria + Clientes'],
    ],
    [50, 50, 74]
  );

  // 13. CICLO COMPRAS
  h.addNewPage();
  setProgress(60);
  
  h.addMainTitle('13. CICLO DE COMPRAS COMPLETO');
  
  h.addParagraph('Gestion integral de compras desde solicitud hasta pago, con control presupuestario y aprobaciones.');

  h.addTable(
    ['Documento', 'Siguiente Fase', 'Contabilizacion'],
    [
      ['Solicitud Compra', 'Peticion Oferta', 'No contabiliza'],
      ['Peticion Oferta (RFQ)', 'Pedido Compra', 'No contabiliza'],
      ['Pedido de Compra', 'Albaran Entrada', 'Compromiso opcional'],
      ['Albaran Entrada', 'Factura Proveedor', 'Existencias'],
      ['Factura Proveedor', 'Pago', 'Proveedores + IVA + Gastos'],
      ['Pago', 'Conciliacion', 'Tesoreria + Proveedores'],
    ],
    [50, 50, 74]
  );

  // 14. IVA AUTOMATICO
  h.addNewPage();
  setProgress(75);
  
  h.addMainTitle('14. GESTION IVA AUTOMATIZADA');
  
  h.addSubtitle('14.1 Tipos de IVA');
  h.addTable(
    ['Tipo', 'Porcentaje', 'Aplicacion'],
    [
      ['General', '21%', 'Tipo ordinario'],
      ['Reducido', '10%', 'Alimentos, transporte'],
      ['Superreducido', '4%', 'Primera necesidad'],
      ['Exento', '0%', 'Operaciones exentas'],
      ['Intracomunitario', 'Inversion sujeto', 'Adquisiciones UE'],
      ['Importacion', 'DUA diferido', 'Terceros paises'],
    ],
    [45, 45, 84]
  );

  h.addNewPage();
  setProgress(90);
  h.addSubtitle('14.2 Retenciones IRPF');
  
  h.addTable(
    ['Tipo Retencion', 'Porcentaje', 'Aplicacion'],
    [
      ['Profesionales', '15%', 'Servicios profesionales'],
      ['Profesionales nuevos', '7%', 'Primeros 3 anos'],
      ['Alquileres', '19%', 'Arrendamientos inmuebles'],
      ['Rendimientos capital', '19%', 'Intereses, dividendos'],
      ['Trabajo', 'Segun tablas', 'Nominas'],
    ],
    [50, 40, 84]
  );

  // PAGINA FINAL
  h.addNewPage();
  setProgress(98);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Documentacion Comercial v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 3 de 7 - Facturacion, SII y FacturaE', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addHighlightBox('PARTE 3 COMPLETADA', 
    'Facturacion electronica completa con SII, FacturaE, ciclos de ventas y compras integrados con contabilizacion automatica.',
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE3_Facturacion_SII_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};

/**
 * ERP PART 4: Tesoreria Enterprise
 */
export const generateERPPart4 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);

  // PORTADA
  setProgress(5);
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PARTE 4: Tesoreria Enterprise', h.pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  h.addHighlightBox('PARTE 4 - CONTENIDO', 
    'Gestion de Tesoreria, Cash Flow, Previsiones, SEPA, Remesas, Confirming, Factoring, Descuento Comercial, Cash Pooling.',
    'info');

  h.addPageNumber();

  // 15. GESTION TESORERIA
  h.addNewPage();
  setProgress(15);
  
  h.addMainTitle('15. GESTION DE TESORERIA');
  
  h.addParagraph('Modulo completo de tesoreria para la gestion de liquidez, previsiones de cash flow y optimizacion de posiciones bancarias.');

  h.addSubtitle('15.1 Dashboard Tesoreria');
  h.addTable(
    ['Indicador', 'Descripcion', 'Actualizacion'],
    [
      ['Posicion Global', 'Saldo consolidado todas las cuentas', 'Tiempo real'],
      ['Cash Flow Diario', 'Cobros y pagos previstos', 'Automatico'],
      ['Posicion por Banco', 'Desglose por entidad', 'Tiempo real'],
      ['Alertas Saldo', 'Avisos saldo minimo/maximo', 'Automatico'],
      ['Vencimientos', 'Proximos cobros y pagos', 'Diario'],
    ],
    [45, 70, 59]
  );

  // 16. CASH FLOW
  h.addNewPage();
  setProgress(30);
  
  h.addMainTitle('16. PREVISION CASH FLOW');
  
  h.addParagraph('Sistema de previsiones de tesoreria con horizonte configurable y multiples escenarios.');

  h.addSubtitle('16.1 Fuentes de Prevision');
  h.addTable(
    ['Fuente', 'Tipo', 'Horizonte'],
    [
      ['Facturas pendientes cobro', 'Cobros', 'Segun vencimiento'],
      ['Facturas pendientes pago', 'Pagos', 'Segun vencimiento'],
      ['Pedidos confirmados', 'Cobros futuros', 'Fecha entrega + plazo'],
      ['Nominas y SS', 'Pagos recurrentes', 'Calendario fijo'],
      ['Impuestos', 'Pagos programados', 'Calendario fiscal'],
      ['Presupuesto', 'Estimaciones', 'Segun presupuesto'],
    ],
    [55, 45, 74]
  );

  h.addHighlightBox('PREVISION CON IA', 
    'El sistema utiliza machine learning para predecir retrasos en cobros basandose en el historico de cada cliente, mejorando la precision del cash flow.',
    'info');

  // 17. SEPA
  h.addNewPage();
  setProgress(45);
  
  h.addMainTitle('17. SEPA - ZONA UNICA PAGOS EUROS');
  
  h.addSubtitle('17.1 Esquemas SEPA');
  h.addTable(
    ['Esquema', 'Descripcion', 'Formato'],
    [
      ['SCT', 'SEPA Credit Transfer', 'pain.001.001.03'],
      ['SDD Core', 'SEPA Direct Debit Core', 'pain.008.001.02'],
      ['SDD B2B', 'SEPA DD Business', 'pain.008.001.02'],
      ['SCT Inst', 'Transferencia Instantanea', 'pain.001.001.09'],
    ],
    [40, 70, 64]
  );

  h.addNewPage();
  setProgress(55);
  h.addSubtitle('17.2 Remesas y Adeudos');
  
  const sepaFeatures = [
    'Generacion automatica ficheros ISO 20022',
    'Validacion IBAN y BIC integrada',
    'Gestion de mandatos SDD con versionado',
    'Envio multibancos desde una unica interfaz',
    'Conciliacion automatica de devoluciones',
    'Historico completo de remesas',
  ];
  sepaFeatures.forEach(f => h.addBullet(f));

  // 18. CONFIRMING Y FACTORING
  h.addNewPage();
  setProgress(70);
  
  h.addMainTitle('18. CONFIRMING Y FACTORING');
  
  h.addSubtitle('18.1 Confirming');
  h.addParagraph('Gestion de lineas de confirming para pago a proveedores con financiacion bancaria.');

  h.addTable(
    ['Tipo', 'Descripcion', 'Contabilizacion'],
    [
      ['Pronto pago', 'Pago anticipado con descuento', 'Ingreso financiero'],
      ['Financiado', 'Banco financia al proveedor', 'Deuda financiera'],
      ['Sin recurso', 'Riesgo asumido por banco', 'Baja proveedor'],
    ],
    [45, 70, 59]
  );

  h.addNewPage();
  setProgress(85);
  h.addSubtitle('18.2 Factoring');
  
  h.addTable(
    ['Modalidad', 'Descripcion', 'Tratamiento'],
    [
      ['Con recurso', 'Anticipo de facturas', 'Financiacion'],
      ['Sin recurso', 'Cesion de creditos', 'Baja clientes'],
      ['Inverso', 'Financiacion proveedor', 'Pago diferido'],
    ],
    [45, 70, 59]
  );

  // PAGINA FINAL
  h.addNewPage();
  setProgress(98);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Documentacion Comercial v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 4 de 7 - Tesoreria Enterprise', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addHighlightBox('PARTE 4 COMPLETADA', 
    'Tesoreria completa con cash flow predictivo, SEPA, confirming y factoring integrados.',
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE4_Tesoreria_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};

/**
 * ERP PART 5: Inventario y Stock
 */
export const generateERPPart5 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);

  // PORTADA
  setProgress(5);
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PARTE 5: Inventario y Stock', h.pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  h.addHighlightBox('PARTE 5 - CONTENIDO', 
    'Gestion de Inventario, Almacenes, Ubicaciones, Movimientos de Stock, Valoracion, Inventario Fisico, Logistica.',
    'info');

  h.addPageNumber();

  // 19. GESTION INVENTARIO
  h.addNewPage();
  setProgress(20);
  
  h.addMainTitle('19. GESTION DE INVENTARIO');
  
  h.addParagraph('Sistema completo de gestion de inventario multialmacen con control de ubicaciones, lotes y numeros de serie.');

  h.addSubtitle('19.1 Estructura de Almacenes');
  h.addTable(
    ['Nivel', 'Descripcion', 'Ejemplo'],
    [
      ['Almacen', 'Ubicacion fisica principal', 'Almacen Central Madrid'],
      ['Zona', 'Division del almacen', 'Zona A - Productos terminados'],
      ['Ubicacion', 'Posicion especifica', 'Estanteria 01, Nivel 3'],
      ['Lote', 'Agrupacion por fabricacion', 'LOTE-2024-001'],
      ['Numero Serie', 'Identificacion unica', 'SN-123456789'],
    ],
    [40, 65, 69]
  );

  // 20. MOVIMIENTOS STOCK
  h.addNewPage();
  setProgress(40);
  
  h.addMainTitle('20. MOVIMIENTOS DE STOCK');
  
  h.addTable(
    ['Tipo Movimiento', 'Descripcion', 'Contabilizacion'],
    [
      ['Entrada Compra', 'Recepcion de proveedor', 'Grupo 3 + 400'],
      ['Salida Venta', 'Expedicion a cliente', 'Grupo 3 + 700'],
      ['Transferencia', 'Entre almacenes', 'Solo analitica'],
      ['Ajuste Inventario', 'Regularizacion', 'Grupo 3 + 61x/71x'],
      ['Produccion', 'Entrada producto terminado', 'Grupo 3 + 71x'],
      ['Consumo', 'Salida a produccion', 'Grupo 3 + 61x'],
    ],
    [45, 55, 74]
  );

  // 21. VALORACION
  h.addNewPage();
  setProgress(60);
  
  h.addMainTitle('21. VALORACION DE EXISTENCIAS');
  
  h.addSubtitle('21.1 Metodos de Valoracion PGC');
  h.addTable(
    ['Metodo', 'Descripcion', 'Uso Recomendado'],
    [
      ['Precio Medio Ponderado', 'Media de costes', 'General'],
      ['FIFO', 'Primera entrada, primera salida', 'Perecederos'],
      ['Precio Especifico', 'Coste identificado', 'Alto valor unitario'],
      ['Coste Estandar', 'Precio predefinido', 'Produccion'],
    ],
    [50, 60, 64]
  );

  h.addHighlightBox('VALORACION AUTOMATICA', 
    'El sistema recalcula automaticamente el valor del inventario en cada movimiento, manteniendo el coste actualizado para contabilidad.',
    'info');

  // 22. INVENTARIO FISICO
  h.addNewPage();
  setProgress(80);
  
  h.addMainTitle('22. INVENTARIO FISICO');
  
  h.addParagraph('Proceso guiado de recuento fisico con soporte para dispositivos moviles y lectores de codigo de barras.');

  h.addTable(
    ['Paso', 'Actividad', 'Herramienta'],
    [
      ['1', 'Crear recuento', 'Seleccion almacen/zona'],
      ['2', 'Generar hojas conteo', 'PDF o dispositivo'],
      ['3', 'Registro cantidades', 'App movil / Web'],
      ['4', 'Revision discrepancias', 'Comparativa automatica'],
      ['5', 'Aprobacion ajustes', 'Workflow'],
      ['6', 'Contabilizacion', 'Asiento automatico'],
    ],
    [20, 55, 99]
  );

  // PAGINA FINAL
  h.addNewPage();
  setProgress(98);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Documentacion Comercial v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 5 de 7 - Inventario y Stock', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addHighlightBox('PARTE 5 COMPLETADA', 
    'Gestion de inventario completa con multialmacen, valoracion PGC y proceso de inventario fisico integrado.',
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE5_Inventario_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};

/**
 * ERP PART 6: Compliance NIIF/IFRS y Auditoria
 */
export const generateERPPart6 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);

  // PORTADA
  setProgress(5);
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PARTE 6: Compliance NIIF/IFRS y Auditoria', h.pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  h.addHighlightBox('PARTE 6 - CONTENIDO', 
    'Compliance NIIF/IFRS, Pista de Auditoria, Controles Internos, Informes de Auditoria, Cierre Fiscal, Deposito Cuentas.',
    'info');

  h.addPageNumber();

  // 23. PISTA AUDITORIA
  h.addNewPage();
  setProgress(20);
  
  h.addMainTitle('23. PISTA DE AUDITORIA');
  
  h.addParagraph('Sistema completo de trazabilidad que registra todas las operaciones contables con usuario, fecha, hora y datos modificados.');

  h.addSubtitle('23.1 Registros de Auditoria');
  h.addTable(
    ['Campo', 'Descripcion', 'Retencion'],
    [
      ['Usuario', 'Identificador del operador', '10 anos'],
      ['Fecha/Hora', 'Timestamp preciso', '10 anos'],
      ['Accion', 'Crear, Modificar, Eliminar', '10 anos'],
      ['Tabla/Registro', 'Entidad afectada', '10 anos'],
      ['Valores anteriores', 'Datos antes del cambio', '10 anos'],
      ['Valores nuevos', 'Datos despues del cambio', '10 anos'],
      ['IP origen', 'Direccion de acceso', '10 anos'],
    ],
    [50, 65, 59]
  );

  // 24. CONTROLES INTERNOS
  h.addNewPage();
  setProgress(40);
  
  h.addMainTitle('24. CONTROLES INTERNOS');
  
  h.addSubtitle('24.1 Segregacion de Funciones');
  h.addTable(
    ['Control', 'Descripcion', 'Implementacion'],
    [
      ['Registro vs Autorizacion', 'Quien registra no autoriza', 'Roles separados'],
      ['Custodia vs Registro', 'Quien custodia no registra', 'Perfiles'],
      ['Limites de Aprobacion', 'Importes maximos por rol', 'Parametrizable'],
      ['Doble Firma', 'Aprobacion multiple', 'Workflow'],
      ['Bloqueo Retroactivo', 'No editar periodos cerrados', 'Automatico'],
    ],
    [50, 55, 69]
  );

  // 25. INFORMES AUDITORIA
  h.addNewPage();
  setProgress(60);
  
  h.addMainTitle('25. INFORMES DE AUDITORIA');
  
  h.addTable(
    ['Informe', 'Contenido', 'Formato'],
    [
      ['Balance de Comprobacion', 'Sumas y saldos', 'PDF, Excel'],
      ['Libro Diario', 'Todos los asientos', 'PDF, Excel'],
      ['Libro Mayor', 'Movimientos por cuenta', 'PDF, Excel'],
      ['Conciliacion Bancaria', 'Partidas pendientes', 'PDF'],
      ['Antiguedad Saldos', 'Vencimientos', 'PDF, Excel'],
      ['Circularizacion', 'Cartas a terceros', 'PDF, Word'],
    ],
    [55, 55, 64]
  );

  // 26. CIERRE Y DEPOSITO
  h.addNewPage();
  setProgress(80);
  
  h.addMainTitle('26. CIERRE Y DEPOSITO CUENTAS');
  
  h.addSubtitle('26.1 Proceso de Cierre Anual');
  h.addTable(
    ['Fase', 'Actividades', 'Plazo'],
    [
      ['Pre-cierre', 'Revision, ajustes', 'Enero'],
      ['Cierre contable', 'Regularizacion, resultado', 'Febrero'],
      ['Formulacion', 'Cuentas anuales', 'Marzo'],
      ['Aprobacion', 'Junta General', 'Junio'],
      ['Deposito', 'Registro Mercantil', 'Julio'],
    ],
    [40, 70, 64]
  );

  h.addHighlightBox('DEPOSITO TELEMATICO', 
    'Generacion automatica de ficheros XBRL para deposito telematico en el Registro Mercantil, compatible con D2.',
    'success');

  // PAGINA FINAL
  h.addNewPage();
  setProgress(98);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Documentacion Comercial v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 6 de 7 - Compliance NIIF/IFRS y Auditoria', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addHighlightBox('PARTE 6 COMPLETADA', 
    'Compliance completo con pista de auditoria, controles internos y proceso de deposito de cuentas integrado.',
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE6_Compliance_Auditoria_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};

/**
 * ERP PART 7: Integracion Bancaria y SEPA
 */
export const generateERPPart7 = async (
  analysis: ERPAnalysis,
  setProgress: (p: number) => void
): Promise<{ filename: string; pages: number }> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const h = createERPPDFHelpers(doc, analysis);
  const stats = getERPStats();

  // PORTADA
  setProgress(5);
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, h.pageWidth, 90, 'F');
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 60, h.pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PARTE 7: Integracion Bancaria y SEPA', h.pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Version ${analysis.version}`, h.pageWidth / 2, 75, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  h.currentY = 105;
  
  h.addHighlightBox('PARTE 7 - CONTENIDO', 
    'Banking Hub, Conexiones Bancarias, Importacion Extractos, Conciliacion Automatica, Core Banking APIs, Open Banking PSD2.',
    'info');

  h.addPageNumber();

  // 27. BANKING HUB
  h.addNewPage();
  setProgress(15);
  
  h.addMainTitle('27. BANKING HUB ENTERPRISE');
  
  h.addParagraph('Plataforma centralizada para la gestion de todas las conexiones bancarias, con integracion nativa a los principales bancos espanoles y europeos.');

  h.addSubtitle('27.1 Bancos Soportados');
  h.addTable(
    ['Banco', 'Tipo Conexion', 'Funcionalidades'],
    [
      ['Santander', 'API PSD2 + Host-to-Host', 'Extractos, pagos, SEPA'],
      ['BBVA', 'API Open Banking', 'Extractos, pagos, SEPA'],
      ['CaixaBank', 'API + SWIFT', 'Extractos, comercio exterior'],
      ['Sabadell', 'API PSD2', 'Extractos, pagos'],
      ['Bankinter', 'API Open Banking', 'Extractos, pagos'],
      ['Andbank', 'Host-to-Host', 'Extractos, pagos'],
      ['Credit Andorra', 'Host-to-Host', 'Extractos, pagos'],
    ],
    [40, 50, 84]
  );

  // 28. EXTRACTOS BANCARIOS
  h.addNewPage();
  setProgress(30);
  
  h.addMainTitle('28. IMPORTACION DE EXTRACTOS');
  
  h.addSubtitle('28.1 Formatos Soportados');
  h.addTable(
    ['Formato', 'Descripcion', 'Procesamiento'],
    [
      ['Norma 43 AEB', 'Estandar espanol', 'Automatico'],
      ['CAMT.053', 'ISO 20022 Statement', 'Automatico'],
      ['MT940', 'SWIFT tradicional', 'Automatico'],
      ['CSV Banco', 'Formatos propietarios', 'Configurable'],
      ['API Tiempo Real', 'Conexion directa', 'Push/Pull'],
    ],
    [45, 60, 69]
  );

  // 29. CONCILIACION AUTOMATICA
  h.addNewPage();
  setProgress(50);
  
  h.addMainTitle('29. CONCILIACION BANCARIA AUTOMATICA');
  
  h.addParagraph('Motor de conciliacion con machine learning que aprende de las decisiones del usuario para mejorar la precision automatica.');

  h.addSubtitle('29.1 Reglas de Matching');
  h.addTable(
    ['Criterio', 'Precision', 'Tipo'],
    [
      ['Importe exacto + Referencia', '99%', 'Automatico'],
      ['Importe + Fecha +/- 3 dias', '95%', 'Automatico'],
      ['Importe + Cliente/Proveedor', '92%', 'Sugerido'],
      ['Patron historico ML', '88%', 'Sugerido'],
      ['Importe similar +/- 1%', '75%', 'Manual'],
    ],
    [55, 35, 84]
  );

  h.addHighlightBox('MACHINE LEARNING', 
    'El sistema aprende de cada conciliacion manual para mejorar las sugerencias futuras. Precision media del 94% tras 3 meses de uso.',
    'success');

  // 30. OPEN BANKING
  h.addNewPage();
  setProgress(70);
  
  h.addMainTitle('30. OPEN BANKING PSD2/PSD3');
  
  h.addSubtitle('30.1 Servicios PSD2');
  h.addTable(
    ['Servicio', 'Descripcion', 'Uso'],
    [
      ['AIS', 'Account Information', 'Consulta saldos y movimientos'],
      ['PIS', 'Payment Initiation', 'Ordenes de pago'],
      ['CBPII', 'Card-Based Payment', 'Consulta fondos'],
      ['SCA', 'Strong Customer Auth', 'Autenticacion reforzada'],
    ],
    [30, 55, 89]
  );

  h.addNewPage();
  setProgress(85);
  h.addSubtitle('30.2 Preparacion PSD3');
  
  const psd3Features = [
    'APIs estandarizadas pan-europeas',
    'Instant payments obligatorios',
    'Open Finance mas alla de pagos',
    'IBAN portabilidad',
    'Dashboard de permisos mejorado',
  ];
  psd3Features.forEach(f => h.addBullet(f));

  // PAGINA FINAL RESUMEN COMPLETO
  h.addNewPage();
  setProgress(95);
  
  doc.setFillColor(20, 80, 60);
  doc.rect(0, 0, h.pageWidth, 70, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OBELIXIA ERP ENTERPRISE', h.pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documentacion Comercial Exhaustiva v${analysis.version}`, h.pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Parte 7 de 7 - Integracion Bancaria SEPA y Core Banking', h.pageWidth / 2, 55, { align: 'center' });

  h.currentY = 85;
  doc.setTextColor(0, 0, 0);
  
  h.addSubtitle('Resumen Completo Documento ERP (7 Partes)');
  const summaryData = [
    ['Parte 1:', 'Resumen Ejecutivo, Contabilidad PGC'],
    ['Parte 2:', 'Modulos Contables, NIIF, Fiscalidad'],
    ['Parte 3:', 'Facturacion, SII, FacturaE'],
    ['Parte 4:', 'Tesoreria, Cash Flow, SEPA'],
    ['Parte 5:', 'Inventario, Stock, Logistica'],
    ['Parte 6:', 'Compliance, Auditoria, Cierre'],
    ['Parte 7:', 'Banking Hub, Open Banking'],
  ];
  
  summaryData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, h.margin, h.currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, h.margin + 25, h.currentY);
    h.currentY += 6;
  });

  h.currentY += 8;
  h.addHighlightBox('DOCUMENTACION ERP COMPLETA', 
    `Las 7 partes contienen documentacion comercial exhaustiva del ERP contable-financiero ObelixIA con ${stats.totalComponents} componentes, ${stats.totalHooks} hooks especializados y ${stats.totalEdgeFunctions} funciones de IA.`,
    'success');

  h.addPageNumber();

  const filename = `ERP_ObelixIA_PARTE7_Banking_Hub_v${analysis.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, pages: h.pageNumber };
};
