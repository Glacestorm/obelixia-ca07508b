/**
 * Unified Audit PDF Generator
 * Supports ERP, CRM, and Combined scopes
 * Includes Economic Valuation and Commercial Proposals
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND, PDF_COLORS, sanitizeForPDF } from '@/components/reports/constants';
import { 
  AuditConfig, 
  AuditScope, 
  ModuleFeature, 
  CompetitorFeature,
  CompetitorProfile,
  ModuleStats,
} from './types';
import { 
  HR_FEATURES, HR_EDGE_FUNCTIONS,
  FISCAL_FEATURES, FISCAL_EDGE_FUNCTIONS,
  LEGAL_FEATURES, LEGAL_EDGE_FUNCTIONS,
  ERP_COMPETITORS,
  getERPStats,
} from './erpModuleData';
import { 
  getCRMFeatures, 
  CRM_EDGE_FUNCTIONS, 
  CRM_HOOKS,
  CRM_COMPETITORS,
  CRM_COMPETITOR_FEATURES,
  getCRMStats,
} from './crmModuleData';
import { 
  CROSS_MODULE_FEATURES, 
  COMBINED_COMPETITOR_FEATURES,
  getCrossModuleStats,
  getIntegrationScore,
} from './crossModuleData';
import {
  CRM_VALUATIONS,
  HR_VALUATIONS,
  FISCAL_VALUATIONS,
  LEGAL_VALUATIONS,
  CROSS_MODULE_VALUATIONS,
  CRM_PRICING_TIERS,
  ERP_PRICING_TIERS,
  LICENSE_OPTIONS,
  getCRMValuationSummary,
  getERPValuationSummary,
  getCombinedValuationSummary,
  type FeatureValuation,
  type PricingTier,
} from './valuationData';

// ============================================
// PDF HELPERS
// ============================================

function addHeader(doc: jsPDF, title: string, pageNumber: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 22, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(BRAND.name.toUpperCase(), 15, 14);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(sanitizeForPDF(title), pageWidth / 2, 14, { align: 'center' });
  doc.text(`${pageNumber}`, pageWidth - 15, 14, { align: 'right' });
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(PDF_COLORS.gray[300][0], PDF_COLORS.gray[300][1], PDF_COLORS.gray[300][2]);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.gray[500][0], PDF_COLORS.gray[500][1], PDF_COLORS.gray[500][2]);
  doc.text(BRAND.copyright(), 15, pageHeight - 8);
  doc.text('Documento Confidencial', pageWidth - 15, pageHeight - 8, { align: 'right' });
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(PDF_COLORS.primaryLight[0], PDF_COLORS.primaryLight[1], PDF_COLORS.primaryLight[2]);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitizeForPDF(title), 20, y + 7);
  
  return y + 15;
}

function addSubsectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.text(sanitizeForPDF(title), 15, y);
  return y + 8;
}

function addParagraph(doc: jsPDF, text: string, y: number, maxWidth: number = 180): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
  
  const lines = doc.splitTextToSize(sanitizeForPDF(text), maxWidth);
  doc.text(lines, 15, y);
  return y + (lines.length * 5) + 3;
}

function checkPageBreak(doc: jsPDF, currentY: number, neededSpace: number, title: string, pageCount: { value: number }): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (currentY + neededSpace > pageHeight - 25) {
    doc.addPage();
    pageCount.value++;
    addHeader(doc, title, pageCount.value);
    addFooter(doc);
    return 32;
  }
  return currentY;
}

// ============================================
// COVER PAGE
// ============================================

function generateCoverPage(doc: jsPDF, scope: AuditScope): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, pageHeight * 0.45, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(255, 255, 255);
  doc.text(BRAND.name, pageWidth / 2, 60, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('Enterprise Platform Suite', pageWidth / 2, 75, { align: 'center' });
  
  // Scope-specific titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.text('INFORME DE AUDITORIA', pageWidth / 2, 130, { align: 'center' });
  
  let subtitle = '';
  let description = '';
  
  switch (scope) {
    case 'crm':
      subtitle = 'CRM UNIVERSAL';
      description = 'Plataforma CRM Multi-Sector con IA Avanzada';
      break;
    case 'erp':
      subtitle = 'ERP ENTERPRISE';
      description = 'Modulos RRHH, Fiscal y Juridico';
      break;
    case 'combined':
      subtitle = 'SUITE INTEGRAL';
      description = 'CRM + ERP con Integracion Cross-Module';
      break;
  }
  
  doc.text(subtitle, pageWidth / 2, 145, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(PDF_COLORS.gray[600][0], PDF_COLORS.gray[600][1], PDF_COLORS.gray[600][2]);
  doc.text(description, pageWidth / 2, 165, { align: 'center' });
  
  // Competitors line
  let competitors = '';
  switch (scope) {
    case 'crm':
      competitors = 'Benchmark vs. Salesforce, HubSpot, Pipedrive, Zoho';
      break;
    case 'erp':
      competitors = 'Benchmark vs. SAP, Workday, Oracle, Icertis';
      break;
    case 'combined':
      competitors = 'Benchmark vs. SAP, Salesforce, Oracle, Microsoft';
      break;
  }
  doc.text(competitors, pageWidth / 2, 178, { align: 'center' });
  
  // Info box
  doc.setFillColor(PDF_COLORS.backgrounds.muted[0], PDF_COLORS.backgrounds.muted[1], PDF_COLORS.backgrounds.muted[2]);
  doc.roundedRect(40, 200, pageWidth - 80, 50, 3, 3, 'F');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(PDF_COLORS.gray[700][0], PDF_COLORS.gray[700][1], PDF_COLORS.gray[700][2]);
  
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Fecha: ${today}`, 50, 218);
  doc.text('Version: 10.0 (Fase 10 Completada)', 50, 230);
  doc.text('Clasificacion: Confidencial', 50, 242);
  
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.gray[500][0], PDF_COLORS.gray[500][1], PDF_COLORS.gray[500][2]);
  doc.text(BRAND.copyright(), pageWidth / 2, pageHeight - 20, { align: 'center' });
}

// ============================================
// EXECUTIVE SUMMARY
// ============================================

function generateExecutiveSummary(doc: jsPDF, scope: AuditScope, pageCount: { value: number }): void {
  doc.addPage();
  pageCount.value++;
  
  const title = 'Resumen Ejecutivo';
  addHeader(doc, title, pageCount.value);
  addFooter(doc);
  
  let y = 35;
  y = addSectionTitle(doc, '1. RESUMEN EJECUTIVO', y);
  
  y = addSubsectionTitle(doc, '1.1 Vision General', y + 5);
  
  let overview = '';
  switch (scope) {
    case 'crm':
      overview = 'ObelixIA CRM Universal es una plataforma de gestion de relaciones con clientes de nueva generacion ' +
        'que integra inteligencia artificial avanzada, omnicanalidad nativa y automatizacion inteligente. ' +
        'Diseñada para sectores enterprise como Banca, Seguros, Retail y Servicios Profesionales, ' +
        'ofrece capacidades comparables a Salesforce con integracion nativa al ecosistema ERP.';
      break;
    case 'erp':
      overview = 'ObelixIA ERP Enterprise es una suite integral que integra los modulos de Recursos Humanos (HCM), ' +
        'Gestion Fiscal y Modulo Juridico en una unica plataforma con arquitectura multi-agente de Inteligencia Artificial. ' +
        'Tras completar las 10 fases del plan maestro de evolucion, la plataforma ha alcanzado paridad funcional con los ' +
        'lideres mundiales (SAP, Workday, Oracle) y los supera en innovacion tecnologica.';
      break;
    case 'combined':
      overview = 'ObelixIA Suite Integral representa la unica plataforma del mercado que integra nativamente ' +
        'CRM, HCM, Fiscal y Legal en un ecosistema unificado con orquestacion de agentes IA cross-module. ' +
        'Esta arquitectura unica permite flujos Quote-to-Cash completos, validacion legal transversal y ' +
        'Customer 360 real, superando las capacidades de suites fragmentadas de la competencia.';
      break;
  }
  
  y = addParagraph(doc, overview, y);
  
  // Stats table
  y = addSubsectionTitle(doc, '1.2 Metricas Clave', y + 5);
  y = checkPageBreak(doc, y, 60, title, pageCount);
  
  let statsData: string[][] = [];
  
  switch (scope) {
    case 'crm': {
      const crmStats = getCRMStats();
      statsData = [
        ['CRM Universal', 'Top 5 Global', `${crmStats.total} funciones`, `${crmStats.edgeFunctions} agentes IA`, 'Completo'],
      ];
      break;
    }
    case 'erp': {
      const erpStats = getERPStats();
      statsData = [
        ['RRHH', 'Top 5 Global', `${erpStats.hr.total} funciones`, `${erpStats.hr.edgeFunctions} agentes IA`, 'Fase 7 Completa'],
        ['Fiscal', 'Top 3 España', `${erpStats.fiscal.total} funciones`, `${erpStats.fiscal.edgeFunctions} agentes IA`, '20+ jurisdicciones'],
        ['Juridico', 'Top 3 Global', `${erpStats.legal.total} funciones`, `${erpStats.legal.edgeFunctions} agentes IA`, 'Fase 10 Completa'],
      ];
      break;
    }
    case 'combined': {
      const crmStats = getCRMStats();
      const erpStats = getERPStats();
      const crossStats = getCrossModuleStats();
      const integrationScore = getIntegrationScore();
      statsData = [
        ['CRM Universal', 'Top 5 Global', `${crmStats.total} funciones`, `${crmStats.edgeFunctions} agentes`, 'Completo'],
        ['ERP (HR+Fiscal+Legal)', 'Top 3 Global', `${erpStats.hr.total + erpStats.fiscal.total + erpStats.legal.total} funciones`, `${erpStats.hr.edgeFunctions + erpStats.fiscal.edgeFunctions + erpStats.legal.edgeFunctions} agentes`, 'Fase 10'],
        ['Cross-Module', 'Unico Mercado', `${crossStats.totalFeatures} integraciones`, `Score: ${integrationScore}%`, 'Innovacion'],
      ];
      break;
    }
  }
  
  autoTable(doc, {
    startY: y,
    head: [['Modulo', 'Posicion', 'Funcionalidades', 'IA', 'Estado']],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]] },
    styles: { fontSize: 9, cellPadding: 4 },
    margin: { left: 15, right: 15 },
  });
  
  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Strengths
  y = checkPageBreak(doc, y, 50, title, pageCount);
  y = addSubsectionTitle(doc, '1.3 Fortalezas Principales', y);
  
  let strengths: string[] = [];
  switch (scope) {
    case 'crm':
      strengths = [
        'Omnicanalidad nativa (Email, WhatsApp, Telegram, SMS)',
        'Analisis de sentimiento en tiempo real',
        'Pipeline predictivo con IA',
        'Integracion ERP nativa',
        'Arquitectura multi-workspace',
      ];
      break;
    case 'erp':
      strengths = [
        'Suite HCM-Legal-Fiscal integrada',
        'Arquitectura multi-agente IA',
        'Blockchain Credentials y Smart Contracts',
        'Multi-jurisdiccion nativa (ES, AD, EU, UK, UAE, US)',
        'Copiloto autonomo 3 niveles',
      ];
      break;
    case 'combined':
      strengths = [
        'Unica plataforma CRM+ERP+Legal integrada nativamente',
        'Orquestador cross-module de agentes IA',
        'Quote-to-Cash end-to-end',
        'Validacion legal transversal automatica',
        'Customer 360 real con datos financieros y legales',
        'Innovaciones disruptivas: Blockchain, Smart Contracts, Voz',
      ];
      break;
  }
  
  strengths.forEach((s, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
    doc.text(`• ${sanitizeForPDF(s)}`, 20, y + (i * 6));
  });
  
  y += strengths.length * 6 + 10;
  
  // Gaps
  y = checkPageBreak(doc, y, 40, title, pageCount);
  y = addSubsectionTitle(doc, '1.4 Areas de Mejora', y);
  
  let gaps: string[] = [];
  switch (scope) {
    case 'crm':
      gaps = ['Marketing Automation avanzado', 'Advanced Workflow Builder visual'];
      break;
    case 'erp':
      gaps = ['Gig/Contingent Workforce', 'Total Rewards Statement', 'ESG Reporting Social', 'Legal Spend Management'];
      break;
    case 'combined':
      gaps = ['Marketing Automation Suite', 'ESG Reporting completo', 'Advanced Analytics consolidado'];
      break;
  }
  
  gaps.forEach((g, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(PDF_COLORS.gray[600][0], PDF_COLORS.gray[600][1], PDF_COLORS.gray[600][2]);
    doc.text(`• ${sanitizeForPDF(g)}`, 20, y + (i * 6));
  });
}

// ============================================
// FEATURE INVENTORY
// ============================================

function generateFeatureInventory(
  doc: jsPDF, 
  features: ModuleFeature[], 
  moduleName: string,
  pageCount: { value: number }
): void {
  doc.addPage();
  pageCount.value++;
  
  const title = `Inventario ${moduleName}`;
  addHeader(doc, title, pageCount.value);
  addFooter(doc);
  
  let y = 35;
  y = addSectionTitle(doc, `INVENTARIO DE FUNCIONALIDADES - ${moduleName.toUpperCase()}`, y);
  
  // Group by category
  const categories = [...new Set(features.map(f => f.category))];
  
  for (const category of categories) {
    y = checkPageBreak(doc, y, 40, title, pageCount);
    y = addSubsectionTitle(doc, category, y + 5);
    
    const categoryFeatures = features.filter(f => f.category === category);
    
    const tableData = categoryFeatures.map(f => [
      sanitizeForPDF(f.name),
      sanitizeForPDF(f.description),
      f.status === 'complete' ? 'Completo' : 
        f.status === 'innovation' ? 'Innovacion' : 
        f.status === 'advantage' ? 'Ventaja' :
        f.status === 'partial' ? 'Parcial' : 'Pendiente',
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Funcionalidad', 'Descripcion', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [PDF_COLORS.primaryLight[0], PDF_COLORS.primaryLight[1], PDF_COLORS.primaryLight[2]] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 100 },
        2: { cellWidth: 25 },
      },
      margin: { left: 15, right: 15 },
    });
    
    y = (doc as any).lastAutoTable.finalY + 8;
  }
}

// ============================================
// COMPETITOR ANALYSIS
// ============================================

function generateCompetitorAnalysis(
  doc: jsPDF,
  competitors: CompetitorProfile[],
  features: CompetitorFeature[],
  title: string,
  pageCount: { value: number }
): void {
  doc.addPage();
  pageCount.value++;
  
  addHeader(doc, title, pageCount.value);
  addFooter(doc);
  
  let y = 35;
  y = addSectionTitle(doc, `ANALISIS COMPETITIVO - ${title.toUpperCase()}`, y);
  
  // Competitor profiles
  y = addSubsectionTitle(doc, 'Perfiles de Competidores', y + 5);
  
  for (const comp of competitors) {
    y = checkPageBreak(doc, y, 30, title, pageCount);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
    doc.text(sanitizeForPDF(comp.fullName), 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(PDF_COLORS.text.secondary[0], PDF_COLORS.text.secondary[1], PDF_COLORS.text.secondary[2]);
    doc.text(`Fortalezas: ${sanitizeForPDF(comp.strengths.join(', '))}`, 20, y + 5);
    doc.text(`Debilidades: ${sanitizeForPDF(comp.weaknesses.join(', '))}`, 20, y + 10);
    
    y += 18;
  }
  
  // Feature comparison table
  y = checkPageBreak(doc, y, 60, title, pageCount);
  y = addSubsectionTitle(doc, 'Matriz Comparativa', y + 5);
  
  const tableData = features.map(f => [
    sanitizeForPDF(f.feature),
    f.competitor1 === 'yes' ? 'Si' : f.competitor1 === 'partial' ? 'Parcial' : 'No',
    f.competitor2 === 'yes' ? 'Si' : f.competitor2 === 'partial' ? 'Parcial' : 'No',
    f.competitor3 === 'yes' ? 'Si' : f.competitor3 === 'partial' ? 'Parcial' : 'No',
    f.obelixia === 'yes' ? 'Si' : f.obelixia === 'partial' ? 'Parcial' : 'No',
    f.status === 'complete' ? 'Paridad' : 
      f.status === 'innovation' ? 'INNOVACION' : 
      f.status === 'advantage' ? 'VENTAJA' : 'Gap',
  ]);
  
  const headers = competitors.length >= 3 
    ? ['Funcionalidad', competitors[0].name, competitors[1].name, competitors[2].name, 'ObelixIA', 'Estado']
    : ['Funcionalidad', 'Comp1', 'Comp2', 'Comp3', 'ObelixIA', 'Estado'];
  
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 50 },
      5: { fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const text = data.cell.raw as string;
        if (text === 'INNOVACION') {
          data.cell.styles.textColor = [34, 197, 94];
        } else if (text === 'VENTAJA') {
          data.cell.styles.textColor = [59, 130, 246];
        } else if (text === 'Gap') {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });
}

// ============================================
// ROADMAP
// ============================================

function generateRoadmap(doc: jsPDF, scope: AuditScope, pageCount: { value: number }): void {
  doc.addPage();
  pageCount.value++;
  
  const title = 'Roadmap 2026-2027';
  addHeader(doc, title, pageCount.value);
  addFooter(doc);
  
  let y = 35;
  y = addSectionTitle(doc, 'ROADMAP DE EVOLUCION 2026-2027', y);
  
  let roadmapItems: { quarter: string; items: string[] }[] = [];
  
  switch (scope) {
    case 'crm':
      roadmapItems = [
        { quarter: 'Q1 2026', items: ['Marketing Automation Suite', 'Advanced Email Sequences'] },
        { quarter: 'Q2 2026', items: ['Visual Workflow Builder', 'Advanced Lead Scoring ML'] },
        { quarter: 'Q3 2026', items: ['Customer Journey Mapping', 'Predictive Churn v2'] },
        { quarter: 'Q4 2026', items: ['Partner Portal', 'Self-service Customer Portal'] },
      ];
      break;
    case 'erp':
      roadmapItems = [
        { quarter: 'Q1 2026', items: ['Gig Workforce Module', 'Total Rewards Statement'] },
        { quarter: 'Q2 2026', items: ['ESG Social Reporting', 'Matter Management v2'] },
        { quarter: 'Q3 2026', items: ['Legal Spend LEDES', 'HR Mobility Global'] },
        { quarter: 'Q4 2026', items: ['Certificaciones ISO 27001', 'SOC2 Compliance'] },
      ];
      break;
    case 'combined':
      roadmapItems = [
        { quarter: 'Q1 2026', items: ['Marketing-Sales Fusion', 'Unified Analytics Dashboard'] },
        { quarter: 'Q2 2026', items: ['ESG Suite Completa', 'Advanced Cross-Module AI'] },
        { quarter: 'Q3 2026', items: ['Partner/Vendor Portal', 'Customer Self-Service'] },
        { quarter: 'Q4 2026', items: ['Industry Cloud Templates', 'Global Expansion Pack'] },
      ];
      break;
  }
  
  for (const { quarter, items } of roadmapItems) {
    y = checkPageBreak(doc, y, 30, title, pageCount);
    
    doc.setFillColor(PDF_COLORS.backgrounds.info[0], PDF_COLORS.backgrounds.info[1], PDF_COLORS.backgrounds.info[2]);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
    doc.text(quarter, 20, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
    items.forEach((item, idx) => {
      doc.text(`• ${sanitizeForPDF(item)}`, 25, y + 15 + (idx * 5));
    });
    
    y += 32;
  }
}

// ============================================
// ECONOMIC VALUATION
// ============================================

function generateEconomicValuation(
  doc: jsPDF,
  scope: AuditScope,
  pageCount: { value: number }
): void {
  doc.addPage();
  pageCount.value++;
  
  const title = 'Valoracion Economica';
  addHeader(doc, title, pageCount.value);
  addFooter(doc);
  
  let y = 35;
  y = addSectionTitle(doc, 'VALORACION ECONOMICA A MERCADO', y);
  
  y = addSubsectionTitle(doc, 'Metodologia de Valoracion', y + 5);
  y = addParagraph(doc, 
    'La valoracion se basa en: (1) Horas de desarrollo a tarifa senior EUR 85/hora, ' +
    '(2) Valor de mercado equivalente de funcionalidades similares, ' +
    '(3) Precio de referencia de competidores para funciones comparables, ' +
    '(4) Prima adicional por capacidades de IA propietaria.',
    y
  );
  
  y = checkPageBreak(doc, y, 80, title, pageCount);
  
  // Valuation table based on scope
  let valuationData: string[][] = [];
  let totalMarket = 0;
  let totalCompetitor = 0;
  let totalDevCost = 0;
  
  if (scope === 'crm') {
    const summary = getCRMValuationSummary();
    totalMarket = summary.totalMarketValue;
    totalCompetitor = summary.totalCompetitorPrice;
    totalDevCost = summary.devCostAt85;
    
    // Group by category
    const categories = [...new Set(CRM_VALUATIONS.map(v => v.category))];
    for (const cat of categories) {
      const catItems = CRM_VALUATIONS.filter(v => v.category === cat);
      const catMarket = catItems.reduce((s, v) => s + v.marketValue, 0);
      const catComp = catItems.reduce((s, v) => s + v.competitorPrice, 0);
      const catAI = catItems.reduce((s, v) => s + v.aiPremium, 0);
      valuationData.push([
        sanitizeForPDF(cat),
        `${catItems.length}`,
        `EUR ${catMarket.toLocaleString('es-ES')}`,
        `EUR ${catComp.toLocaleString('es-ES')}`,
        `EUR ${catAI.toLocaleString('es-ES')}`,
      ]);
    }
  } else if (scope === 'erp') {
    const summary = getERPValuationSummary();
    totalMarket = summary.total.totalMarketValue;
    totalCompetitor = summary.total.totalCompetitorPrice;
    totalDevCost = summary.total.devCostAt85;
    
    valuationData = [
      ['RRHH (HCM)', `${HR_VALUATIONS.length}`, `EUR ${summary.hr.totalMarketValue.toLocaleString('es-ES')}`, `EUR ${summary.hr.totalCompetitorPrice.toLocaleString('es-ES')}`, `EUR ${summary.hr.totalAIPremium.toLocaleString('es-ES')}`],
      ['Fiscal', `${FISCAL_VALUATIONS.length}`, `EUR ${summary.fiscal.totalMarketValue.toLocaleString('es-ES')}`, `EUR ${summary.fiscal.totalCompetitorPrice.toLocaleString('es-ES')}`, `EUR ${summary.fiscal.totalAIPremium.toLocaleString('es-ES')}`],
      ['Juridico', `${LEGAL_VALUATIONS.length}`, `EUR ${summary.legal.totalMarketValue.toLocaleString('es-ES')}`, `EUR ${summary.legal.totalCompetitorPrice.toLocaleString('es-ES')}`, `EUR ${summary.legal.totalAIPremium.toLocaleString('es-ES')}`],
    ];
  } else {
    const summary = getCombinedValuationSummary();
    totalMarket = summary.grandTotal.totalMarketValue;
    totalCompetitor = summary.grandTotal.totalCompetitorPrice;
    totalDevCost = summary.grandTotal.devCostAt85;
    
    valuationData = [
      ['CRM Universal', `${CRM_VALUATIONS.length}`, `EUR ${summary.crm.totalMarketValue.toLocaleString('es-ES')}`, `EUR ${summary.crm.totalCompetitorPrice.toLocaleString('es-ES')}`, `EUR ${summary.crm.totalAIPremium.toLocaleString('es-ES')}`],
      ['ERP Enterprise', `${HR_VALUATIONS.length + FISCAL_VALUATIONS.length + LEGAL_VALUATIONS.length}`, `EUR ${summary.erp.totalMarketValue.toLocaleString('es-ES')}`, `EUR ${summary.erp.totalCompetitorPrice.toLocaleString('es-ES')}`, `EUR ${summary.erp.totalAIPremium.toLocaleString('es-ES')}`],
      ['Cross-Module', `${CROSS_MODULE_VALUATIONS.length}`, `EUR ${summary.cross.totalMarketValue.toLocaleString('es-ES')}`, `EUR ${summary.cross.totalCompetitorPrice.toLocaleString('es-ES')}`, `EUR ${summary.cross.totalAIPremium.toLocaleString('es-ES')}`],
    ];
  }
  
  y = addSubsectionTitle(doc, 'Desglose por Modulo/Categoria', y + 5);
  
  autoTable(doc, {
    startY: y,
    head: [['Modulo/Categoria', 'Funciones', 'Valor Mercado', 'Precio Competencia', 'Prima IA']],
    body: valuationData,
    foot: [['TOTAL', '', `EUR ${totalMarket.toLocaleString('es-ES')}`, `EUR ${totalCompetitor.toLocaleString('es-ES')}`, '']],
    theme: 'striped',
    headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 9 },
    footStyles: { fillColor: [PDF_COLORS.primaryLight[0], PDF_COLORS.primaryLight[1], PDF_COLORS.primaryLight[2]], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 15, right: 15 },
  });
  
  y = (doc as any).lastAutoTable.finalY + 15;
  
  // Summary box
  y = checkPageBreak(doc, y, 60, title, pageCount);
  
  doc.setFillColor(PDF_COLORS.backgrounds.success[0], PDF_COLORS.backgrounds.success[1], PDF_COLORS.backgrounds.success[2]);
  doc.roundedRect(15, y, 180, 50, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.text('RESUMEN VALORACION', 20, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
  
  const discount = Math.round(((totalCompetitor - totalMarket) / totalCompetitor) * 100);
  
  doc.text(`Coste Desarrollo (${Math.round(totalDevCost / 85).toLocaleString('es-ES')} horas x EUR 85): EUR ${totalDevCost.toLocaleString('es-ES')}`, 25, y + 22);
  doc.text(`Valor de Mercado ObelixIA: EUR ${totalMarket.toLocaleString('es-ES')}`, 25, y + 30);
  doc.text(`Precio Equivalente Competencia: EUR ${totalCompetitor.toLocaleString('es-ES')}`, 25, y + 38);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(`Ahorro vs. Competencia: ${discount}% (EUR ${(totalCompetitor - totalMarket).toLocaleString('es-ES')})`, 25, y + 46);
}

// ============================================
// COMMERCIAL PROPOSAL
// ============================================

function generateCommercialProposal(
  doc: jsPDF,
  scope: AuditScope,
  pageCount: { value: number }
): void {
  doc.addPage();
  pageCount.value++;
  
  const title = 'Propuesta Comercial';
  addHeader(doc, title, pageCount.value);
  addFooter(doc);
  
  let y = 35;
  y = addSectionTitle(doc, 'PROPUESTA COMERCIAL', y);
  
  // Pricing tiers
  y = addSubsectionTitle(doc, 'Planes de Suscripcion', y + 5);
  
  const tiers = scope === 'crm' ? CRM_PRICING_TIERS : 
                scope === 'erp' ? ERP_PRICING_TIERS :
                [...CRM_PRICING_TIERS.slice(2), ...ERP_PRICING_TIERS.slice(2)];
  
  const tierData = tiers.map(t => [
    sanitizeForPDF(t.name),
    t.userRange,
    `EUR ${t.monthlyPerUser}/mes`,
    `EUR ${t.annualPerUser}/mes`,
    `${Math.round((1 - t.annualPerUser / t.monthlyPerUser) * 100)}%`,
    t.support,
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['Plan', 'Usuarios', 'Precio Mensual', 'Precio Anual', 'Ahorro', 'Soporte']],
    body: tierData,
    theme: 'striped',
    headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 15, right: 15 },
  });
  
  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Features per tier
  y = checkPageBreak(doc, y, 60, title, pageCount);
  y = addSubsectionTitle(doc, 'Caracteristicas por Plan', y);
  
  for (const tier of tiers.slice(0, 4)) {
    y = checkPageBreak(doc, y, 25, title, pageCount);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
    doc.text(`${tier.name}:`, 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(PDF_COLORS.text.secondary[0], PDF_COLORS.text.secondary[1], PDF_COLORS.text.secondary[2]);
    doc.text(tier.features.join(' | '), 50, y);
    
    y += 8;
  }
  
  // License options
  y = checkPageBreak(doc, y, 80, title, pageCount);
  y = addSubsectionTitle(doc, 'Modalidades de Licenciamiento', y + 5);
  
  const licenseData = LICENSE_OPTIONS.map(l => [
    sanitizeForPDF(l.name),
    sanitizeForPDF(l.description),
    sanitizeForPDF(l.pricing),
    sanitizeForPDF(l.terms),
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['Modalidad', 'Descripcion', 'Precio', 'Condiciones']],
    body: licenseData,
    theme: 'striped',
    headStyles: { fillColor: [PDF_COLORS.primaryLight[0], PDF_COLORS.primaryLight[1], PDF_COLORS.primaryLight[2]], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { cellWidth: 45 }, 3: { cellWidth: 50 } },
    margin: { left: 15, right: 15 },
  });
  
  y = (doc as any).lastAutoTable.finalY + 15;
  
  // Enterprise offer box
  y = checkPageBreak(doc, y, 70, title, pageCount);
  
  doc.setFillColor(PDF_COLORS.backgrounds.info[0], PDF_COLORS.backgrounds.info[1], PDF_COLORS.backgrounds.info[2]);
  doc.roundedRect(15, y, 180, 60, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.text('OFERTA ENTERPRISE - LICENCIA PERPETUA', 20, y + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
  
  let perpetualPrice = 0;
  let marketValue = 0;
  
  if (scope === 'crm') {
    const s = getCRMValuationSummary();
    perpetualPrice = 320000;
    marketValue = s.totalMarketValue;
  } else if (scope === 'erp') {
    const s = getERPValuationSummary();
    perpetualPrice = 580000;
    marketValue = s.total.totalMarketValue;
  } else {
    const s = getCombinedValuationSummary();
    perpetualPrice = 880000;
    marketValue = s.grandTotal.totalMarketValue;
  }
  
  const savingsPercent = Math.round(((marketValue - perpetualPrice) / marketValue) * 100);
  
  doc.text(`Precio Licencia Perpetua: EUR ${perpetualPrice.toLocaleString('es-ES')}`, 25, y + 25);
  doc.text(`Valor de Mercado: EUR ${marketValue.toLocaleString('es-ES')}`, 25, y + 33);
  doc.text(`Mantenimiento Anual (18%): EUR ${Math.round(perpetualPrice * 0.18).toLocaleString('es-ES')}/año`, 25, y + 41);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(`DESCUENTO OFERTADO: ${savingsPercent}% (Ahorro EUR ${(marketValue - perpetualPrice).toLocaleString('es-ES')})`, 25, y + 52);
  
  // Volume discounts
  y += 70;
  y = checkPageBreak(doc, y, 50, title, pageCount);
  y = addSubsectionTitle(doc, 'Descuentos por Volumen', y);
  
  const volumeData = [
    ['50-99 usuarios', '5%', '10%'],
    ['100-249 usuarios', '10%', '15%'],
    ['250-499 usuarios', '15%', '20%'],
    ['500+ usuarios', '20%', '25%'],
    ['Multi-filial (3+ entidades)', '10% adicional', '15% adicional'],
  ];
  
  autoTable(doc, {
    startY: y,
    head: [['Tramo', 'Descuento SaaS', 'Descuento Perpetua']],
    body: volumeData,
    theme: 'striped',
    headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
    margin: { left: 15, right: 15 },
  });
}

// ============================================
// MAIN GENERATOR
// ============================================

export async function generateAuditPDF(config: AuditConfig): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageCount = { value: 1 };
  
  // Cover
  generateCoverPage(doc, config.scope);
  
  // Executive Summary
  generateExecutiveSummary(doc, config.scope, pageCount);
  
  // Feature Inventories based on scope
  if (config.scope === 'crm' || config.scope === 'combined') {
    generateFeatureInventory(doc, getCRMFeatures(), 'CRM', pageCount);
  }
  
  if (config.scope === 'erp' || config.scope === 'combined') {
    if (config.detailLevel !== 'executive') {
      generateFeatureInventory(doc, HR_FEATURES, 'RRHH', pageCount);
      generateFeatureInventory(doc, FISCAL_FEATURES, 'Fiscal', pageCount);
      generateFeatureInventory(doc, LEGAL_FEATURES, 'Juridico', pageCount);
    }
  }
  
  if (config.scope === 'combined') {
    generateFeatureInventory(doc, CROSS_MODULE_FEATURES, 'Cross-Module', pageCount);
  }
  
  // Competitor Analysis
  if (config.includeCompetitorAnalysis) {
    if (config.scope === 'crm') {
      generateCompetitorAnalysis(doc, CRM_COMPETITORS, CRM_COMPETITOR_FEATURES, 'CRM', pageCount);
    } else if (config.scope === 'erp') {
      generateCompetitorAnalysis(doc, ERP_COMPETITORS, [], 'ERP', pageCount);
    } else {
      generateCompetitorAnalysis(doc, [...CRM_COMPETITORS.slice(0,2), ...ERP_COMPETITORS.slice(0,2)], COMBINED_COMPETITOR_FEATURES, 'Suite Integral', pageCount);
    }
  }
  
  // Economic Valuation - ALWAYS included
  generateEconomicValuation(doc, config.scope, pageCount);
  
  // Commercial Proposal - ALWAYS included
  generateCommercialProposal(doc, config.scope, pageCount);
  
  // Roadmap
  if (config.includeRoadmap) {
    generateRoadmap(doc, config.scope, pageCount);
  }
  
  // Save
  const scopeName = config.scope === 'crm' ? 'CRM' : config.scope === 'erp' ? 'ERP' : 'CRM-ERP';
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`ObelixIA-Auditoria-${scopeName}-${timestamp}.pdf`);
}

// ============================================
// UI STATS HELPERS
// ============================================

export function getModuleStats(scope: AuditScope): ModuleStats[] {
  switch (scope) {
    case 'crm': {
      const stats = getCRMStats();
      return [{
        name: 'CRM Universal',
        code: 'crm',
        features: stats.total,
        edgeFunctions: stats.edgeFunctions,
        status: 'advanced',
        highlights: [
          'Pipeline Predictivo IA',
          'Omnichannel Inbox',
          'Analisis Sentimiento',
          'Colaboracion Realtime',
          'Integracion ERP Nativa',
        ],
      }];
    }
    case 'erp': {
      const stats = getERPStats();
      return [
        {
          name: 'Recursos Humanos',
          code: 'hr',
          features: stats.hr.total,
          edgeFunctions: stats.hr.edgeFunctions,
          status: 'advanced',
          highlights: ['Skills Ontology', 'Talent Marketplace', 'Wellbeing Dashboard', 'Blockchain Credentials', 'Copiloto Autonomo'],
        },
        {
          name: 'Fiscal',
          code: 'fiscal',
          features: stats.fiscal.total,
          edgeFunctions: stats.fiscal.edgeFunctions,
          status: 'complete',
          highlights: ['SII España', 'Intrastat UE', '20+ jurisdicciones', 'Agente IA con voz', 'Ayuda activa'],
        },
        {
          name: 'Juridico',
          code: 'legal',
          features: stats.legal.total,
          edgeFunctions: stats.legal.edgeFunctions,
          status: 'innovation',
          highlights: ['CLM Avanzado', 'Entity Management', 'Predictive Litigation', 'Smart Contracts', 'Cross-Module Gateway'],
        },
      ];
    }
    case 'combined': {
      const crmStats = getCRMStats();
      const erpStats = getERPStats();
      const crossStats = getCrossModuleStats();
      return [
        {
          name: 'CRM Universal',
          code: 'crm',
          features: crmStats.total,
          edgeFunctions: crmStats.edgeFunctions,
          status: 'advanced',
          highlights: ['Pipeline IA', 'Omnichannel', 'Sentimiento'],
        },
        {
          name: 'ERP Enterprise',
          code: 'erp',
          features: erpStats.hr.total + erpStats.fiscal.total + erpStats.legal.total,
          edgeFunctions: erpStats.hr.edgeFunctions + erpStats.fiscal.edgeFunctions + erpStats.legal.edgeFunctions,
          status: 'advanced',
          highlights: ['HR+Fiscal+Legal', 'Multi-jurisdiccion', 'Blockchain'],
        },
        {
          name: 'Cross-Module',
          code: 'cross',
          features: crossStats.totalFeatures,
          edgeFunctions: 3,
          status: 'innovation',
          highlights: ['Orquestador IA', 'Legal Gateway', 'Quote-to-Cash'],
        },
      ];
    }
  }
}
