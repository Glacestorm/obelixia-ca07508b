// PDF generation functions extracted from ApplicationStateAnalyzer
// These are pure async functions with no React dependencies

import { toast } from 'sonner';

interface ModuleAnalysis {
  name: string;
  description: string;
  implementedFeatures: string[];
  pendingFeatures: string[];
  completionPercentage: number;
  businessValue: string;
  differentiators: string[];
}

interface ComplianceRegulation {
  name: string;
  status: 'compliant' | 'partial' | 'pending';
  description: string;
  implementedFeatures: string[];
  pendingActions: string[];
  compliancePercentage?: number;
  totalRequirements?: number;
  implementedRequirements?: number;
  jurisdiction?: string;
}

interface CodebaseAnalysis {
  version: string;
  generationDate: string;
  modules: ModuleAnalysis[];
  pendingFeatures: string[];
  securityFindings: string[];
  codeStats: {
    totalFiles: number;
    totalComponents: number;
    totalHooks: number;
    totalEdgeFunctions: number;
    totalPages: number;
    linesOfCode: number;
  };
}

interface ImprovementsAnalysis {
  generationDate: string;
  improvements: { title: string; priority: string; effort: string; impact: string; }[];
  technologyTrends: any[];
  securityUpdates: string[];
  performanceOptimizations: string[];
  uxEnhancements: string[];
  aiIntegrations: string[];
  complianceUpdates: string[];
  summary: string;
  complianceRegulations?: ComplianceRegulation[];
  detailedTrends?: { number: number; name: string; relevance: string; installed: boolean; }[];
}

// Sanitize text for PDF - handle accented characters and unicode
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/✅/g, '[OK]').replace(/⏳/g, '[PEND]').replace(/✓/g, 'OK')
    .replace(/○/g, 'o').replace(/•/g, '-').replace(/→/g, '->').replace(/←/g, '<-')
    .replace(/★/g, '*').replace(/☆/g, '*').replace(/✔/g, 'OK').replace(/✘/g, 'X')
    .replace(/❌/g, '[X]').replace(/⚠/g, '[!]')
    .replace(/🔒|🔓|📊|📈|📉|💡|🚀|⚡|🔥|✨|🎯|📋|📁|📂|🔧|⚙|🛡|🏦|💼|📱|💻|🌐/g, '')
    .replace(/[ÀÁÂÃÄÅ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/Ñ/g, 'N').replace(/Ç/g, 'C')
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ñ/g, 'n').replace(/ç/g, 'c')
    .replace(/«/g, '"').replace(/»/g, '"').replace(/'/g, "'").replace(/'/g, "'")
    .replace(/\u201C/g, '"').replace(/\u201D/g, '"').replace(/–/g, '-').replace(/—/g, '-')
    .replace(/…/g, '...').replace(/·/g, '.').replace(/€/g, 'EUR').replace(/£/g, 'GBP')
    .replace(/¥/g, 'JPY').replace(/©/g, '(c)').replace(/®/g, '(R)').replace(/™/g, '(TM)')
    .replace(/°/g, ' deg').replace(/±/g, '+/-').replace(/×/g, 'x').replace(/÷/g, '/')
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=').replace(/∞/g, 'inf')
    .replace(/[^\x20-\x7E]/g, '').trim();
}

type RGB = [number, number, number];

const colors = {
  primary: [30, 64, 175] as RGB,
  secondary: [16, 185, 129] as RGB,
  accent: [139, 92, 246] as RGB,
  warning: [245, 158, 11] as RGB,
  danger: [239, 68, 68] as RGB,
  dark: [30, 41, 59] as RGB,
  light: [241, 245, 249] as RGB,
  white: [255, 255, 255] as RGB,
};

export async function generateStatePDF(
  codebaseAnalysis: CodebaseAnalysis | null,
  improvementsAnalysis: ImprovementsAnalysis | null,
  overallCompletion: number
) {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont('times', 'normal');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const lineHeight = 5;

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFillColor(...colors.dark);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(8);
      doc.text('ObelixIA - CRM Bancari Intel·ligent', margin, pageHeight - 5);
      doc.text(`Pàgina ${pageNum} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 5);
      doc.text(new Date().toLocaleDateString('ca-ES'), pageWidth / 2, pageHeight - 5, { align: 'center' });
    };

    const drawStatCard = (x: number, y: number, width: number, height: number, title: string, value: string, color: RGB) => {
      doc.setFillColor(...colors.white);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, width, height, 3, 3, 'FD');
      doc.setFillColor(...color);
      doc.rect(x, y, 4, height, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(title, x + 8, y + 8);
      doc.setTextColor(...colors.dark);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x + 8, y + 20);
    };

    // ===============================
    // PAGE 1: COVER PAGE
    // ===============================
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 100, 'F');
    doc.setFillColor(20, 50, 140);
    doc.rect(0, 80, pageWidth, 30, 'F');
    
    const logoX = pageWidth / 2;
    const logoY = 45;
    const logoSize = 22;
    
    doc.setFillColor(...colors.white);
    const hexPoints: number[][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      hexPoints.push([logoX + logoSize * Math.cos(angle), logoY + logoSize * Math.sin(angle)]);
    }
    doc.setLineWidth(0);
    doc.moveTo(hexPoints[0][0], hexPoints[0][1]);
    for (let i = 1; i < 6; i++) {
      doc.lineTo(hexPoints[i][0], hexPoints[i][1]);
    }
    doc.lineTo(hexPoints[0][0], hexPoints[0][1]);
    doc.fill();
    
    doc.setFillColor(20, 50, 140);
    doc.circle(logoX, logoY, 15, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('OIA', logoX, logoY + 5, { align: 'center' });
    doc.setDrawColor(...colors.white);
    doc.setLineWidth(1.5);
    doc.circle(logoX, logoY, 18, 'S');
    
    doc.setTextColor(...colors.white);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME D\'ESTAT', pageWidth / 2, 125, { align: 'center' });
    doc.setFontSize(14);
    doc.text('DE L\'APLICACIO', pageWidth / 2, 135, { align: 'center' });
    
    doc.setTextColor(...colors.dark);
    doc.setFontSize(18);
    doc.text('ObelixIA - CRM Bancari Intel.ligent', pageWidth / 2, 160, { align: 'center' });
    
    doc.setFillColor(...colors.light);
    doc.roundedRect(pageWidth / 2 - 50, 175, 100, 35, 5, 5, 'F');
    doc.setTextColor(...colors.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Versio: ${codebaseAnalysis?.version || '8.0.0'}`, pageWidth / 2, 188, { align: 'center' });
    doc.text(`Generat: ${new Date().toLocaleDateString('ca-ES')}`, pageWidth / 2, 198, { align: 'center' });
    
    const stats = codebaseAnalysis?.codeStats || { totalComponents: 195, totalHooks: 24, totalEdgeFunctions: 50, totalPages: 9 };
    const statY = 230;
    drawStatCard(margin, statY, 40, 30, 'Components', String(stats.totalComponents), colors.primary);
    drawStatCard(margin + 45, statY, 40, 30, 'Edge Func.', String(stats.totalEdgeFunctions), colors.secondary);
    drawStatCard(margin + 90, statY, 40, 30, 'Hooks', String(stats.totalHooks), colors.accent);
    drawStatCard(margin + 135, statY, 40, 30, 'Pagines', String(stats.totalPages), colors.warning);
    
    doc.setFillColor(...colors.dark);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(9);
    doc.text('DOCUMENT CONFIDENCIAL - US INTERN', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // ===============================
    // PAGE 2: TABLE OF CONTENTS
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INDEX DE CONTINGUTS', margin, 17);
    
    let tocY = 45;
    doc.setTextColor(...colors.dark);
    
    const tocItems = [
      { num: '1', title: 'Resum Executiu', page: 3 },
      { num: '2', title: 'Estadistiques del Projecte', page: 3 },
      { num: '3', title: 'Moduls de l\'Aplicacio', page: 4 },
      { num: '4', title: 'Seguretat Implementada', page: 5 },
      { num: '5', title: 'Compliance Normatiu', page: 6 },
      { num: '6', title: 'Tendencies Tecnologiques', page: 7 },
      { num: '7', title: 'Millores Suggerides', page: 8 },
      { num: '8', title: 'Integracions IA', page: 9 },
      { num: '9', title: 'Optimitzacions de Rendiment', page: 10 },
    ];
    
    tocItems.forEach((item) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(item.num + '.', margin, tocY);
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'normal');
      doc.text(item.title, margin + 10, tocY);
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin + 80, tocY, pageWidth - margin - 15, tocY);
      doc.setLineDashPattern([], 0);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.page), pageWidth - margin - 5, tocY);
      tocY += 12;
    });

    // ===============================
    // PAGE 3: EXECUTIVE SUMMARY
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('1. RESUM EXECUTIU', margin, 17);
    
    let yPos = 40;
    
    if (improvementsAnalysis?.summary) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, 70, 4, 4, 'F');
      doc.setFillColor(...colors.primary);
      doc.rect(margin, yPos, 3, 70, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      const sanitizedSummary = sanitizeText(improvementsAnalysis.summary);
      const summaryLines = doc.splitTextToSize(sanitizedSummary, contentWidth - 15);
      let textY = yPos + 10;
      summaryLines.slice(0, 12).forEach((line: string) => {
        doc.text(line, margin + 8, textY);
        textY += lineHeight;
      });
      yPos += 80;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('2. ESTADISTIQUES DEL PROJECTE', margin, yPos);
    yPos += 15;
    
    const cardWidth = (contentWidth - 15) / 4;
    drawStatCard(margin, yPos, cardWidth, 35, 'Completitud Global', `${overallCompletion}%`, colors.primary);
    drawStatCard(margin + cardWidth + 5, yPos, cardWidth, 35, 'Moduls', String(codebaseAnalysis?.modules?.length || 16), colors.secondary);
    drawStatCard(margin + (cardWidth + 5) * 2, yPos, cardWidth, 35, 'Edge Functions', String(stats.totalEdgeFunctions), colors.accent);
    drawStatCard(margin + (cardWidth + 5) * 3, yPos, cardWidth, 35, 'Compliance', `${improvementsAnalysis?.complianceRegulations?.filter(r => r.status === 'compliant').length || 0}/${improvementsAnalysis?.complianceRegulations?.length || 0}`, colors.warning);
    yPos += 50;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Stack Tecnologic Principal:', margin, yPos);
    yPos += 8;
    
    const techStack = ['React 19', 'TypeScript', 'Supabase', 'Tailwind CSS', 'MapLibre GL', 'Recharts', 'jsPDF'];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    techStack.forEach((tech, idx) => {
      const x = margin + (idx % 4) * 45;
      const y = yPos + Math.floor(idx / 4) * 8;
      doc.setFillColor(...colors.secondary);
      doc.circle(x, y - 1, 1.5, 'F');
      doc.text(tech, x + 4, y);
    });

    // ===============================
    // PAGE 4: MODULES
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('3. MODULS DE L\'APLICACIO', margin, 17);
    
    yPos = 35;
    
    if (codebaseAnalysis?.modules && Array.isArray(codebaseAnalysis.modules)) {
      const moduleData = codebaseAnalysis.modules.map((m, idx) => [
        String(idx + 1),
        sanitizeText(m.name || 'N/A'),
        `${m.completionPercentage || 0}%`,
        sanitizeText((m.businessValue || 'N/A').substring(0, 60)) + '...'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Num', 'Modul', '% Complet', 'Valor de Negoci']],
        body: moduleData,
        theme: 'grid',
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center' },
        bodyStyles: { fontSize: 9, textColor: colors.dark, font: 'times' },
        styles: { font: 'times', cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 55 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 80 },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (data: any) => {
          if (data.column.index === 2 && data.section === 'body') {
            const percentage = parseInt(String(data.cell.raw).replace('%', '')) || 0;
            const color = percentage >= 90 ? colors.secondary : percentage >= 70 ? colors.warning : colors.danger;
            doc.setFillColor(...color);
            doc.circle(data.cell.x + 3, data.cell.y + data.cell.height / 2, 2, 'F');
          }
        },
      });
    }

    // ===============================
    // PAGE 5: SECURITY
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.secondary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('4. SEGURETAT IMPLEMENTADA', margin, 17);
    yPos = 35;
    
    if (codebaseAnalysis?.securityFindings && codebaseAnalysis.securityFindings.length > 0) {
      const securityData = codebaseAnalysis.securityFindings.map((finding) => ['v', sanitizeText(String(finding))]);
      autoTable(doc, {
        startY: yPos,
        head: [['', 'Control de Seguretat Implementat']],
        body: securityData,
        theme: 'striped',
        headStyles: { fillColor: colors.secondary, textColor: colors.white, fontStyle: 'bold', fontSize: 11, font: 'helvetica' },
        bodyStyles: { fontSize: 10, textColor: colors.dark, font: 'times' },
        styles: { font: 'times', cellPadding: 5 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center', textColor: colors.secondary }, 1: { cellWidth: contentWidth - 15 } },
        margin: { left: margin, right: margin },
      });
    }

    // ===============================
    // PAGE 6: COMPLIANCE
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.accent);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('5. COMPLIANCE NORMATIU', margin, 17);
    yPos = 35;
    
    if (improvementsAnalysis?.complianceRegulations && improvementsAnalysis.complianceRegulations.length > 0) {
      const complianceData = improvementsAnalysis.complianceRegulations.map((reg) => [
        sanitizeText(reg.name || 'N/A'),
        reg.status === 'compliant' ? 'COMPLERT' : reg.status === 'partial' ? 'PARCIAL' : 'PENDENT',
        `${reg.compliancePercentage || (reg.status === 'compliant' ? 100 : 80)}%`,
        sanitizeText(reg.jurisdiction || 'EU')
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Normativa', 'Estat', '% Complet', 'Jurisdiccio']],
        body: complianceData,
        theme: 'grid',
        headStyles: { fillColor: colors.accent, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center' },
        bodyStyles: { fontSize: 10, textColor: colors.dark, font: 'times' },
        styles: { font: 'times', cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 70, halign: 'left' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (data: any) => {
          if (data.column.index === 1 && data.section === 'body') {
            const status = String(data.cell.raw);
            const color = status === 'COMPLERT' ? colors.secondary : status === 'PARCIAL' ? colors.warning : colors.danger;
            doc.setTextColor(...color);
          }
        },
      });
    }

    // ===============================
    // PAGE 7: TECHNOLOGY TRENDS
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.warning);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('6. TENDENCIES TECNOLOGIQUES', margin, 17);
    yPos = 35;
    
    if (improvementsAnalysis?.detailedTrends && improvementsAnalysis.detailedTrends.length > 0) {
      const trendsInstalled = improvementsAnalysis.detailedTrends.filter(t => t.installed);
      const trendsPending = improvementsAnalysis.detailedTrends.filter(t => !t.installed);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.secondary);
      doc.text(`INSTALLADES (${trendsInstalled.length})`, margin, yPos);
      yPos += 8;
      
      const installedData = trendsInstalled.slice(0, 10).map((t) => [`#${t.number}`, sanitizeText(t.name), sanitizeText(t.relevance || 'Alta'), 'OK']);
      
      if (installedData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Num', 'Tecnologia', 'Rellevancia', 'Estat']],
          body: installedData,
          theme: 'striped',
          headStyles: { fillColor: colors.secondary, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center' },
          bodyStyles: { fontSize: 10, font: 'times' },
          styles: { font: 'times', cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 100, halign: 'left' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 20, halign: 'center', textColor: colors.secondary },
          },
          margin: { left: margin, right: margin },
          tableWidth: contentWidth,
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
      
      if (trendsPending.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.warning);
        doc.text(`PENDENTS (${trendsPending.length})`, margin, yPos);
        yPos += 8;
        
        const pendingData = trendsPending.slice(0, 5).map((t) => [`#${t.number}`, sanitizeText(t.name), sanitizeText(t.relevance || 'Mitjana'), 'o']);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Num', 'Tecnologia', 'Rellevancia', 'Estat']],
          body: pendingData,
          theme: 'striped',
          headStyles: { fillColor: colors.warning, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center' },
          bodyStyles: { fontSize: 10, font: 'times' },
          styles: { font: 'times', cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 100, halign: 'left' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 20, halign: 'center', textColor: colors.warning },
          },
          margin: { left: margin, right: margin },
          tableWidth: contentWidth,
        });
      }
    }

    // ===============================
    // PAGE 8: IMPROVEMENTS
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.danger);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('7. MILLORES SUGGERIDES', margin, 17);
    yPos = 35;
    
    if (improvementsAnalysis?.improvements && improvementsAnalysis.improvements.length > 0) {
      const improvementData = improvementsAnalysis.improvements.slice(0, 15).map((imp, idx) => [
        String(idx + 1),
        sanitizeText(imp.title || 'N/A'),
        (imp.priority || 'media').toUpperCase(),
        sanitizeText(imp.effort || 'N/A'),
        sanitizeText(imp.impact || 'N/A')
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Num', 'Millora Suggerida', 'Prioritat', 'Esforc', 'Impacte']],
        body: improvementData,
        theme: 'grid',
        headStyles: { fillColor: colors.danger, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center', overflow: 'linebreak' },
        bodyStyles: { fontSize: 10, font: 'times' },
        styles: { font: 'times', cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 75, halign: 'left' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (data: any) => {
          if (data.column.index === 2 && data.section === 'body') {
            const priority = String(data.cell.raw);
            const color = priority === 'ALTA' ? colors.danger : priority === 'MEDIA' ? colors.warning : colors.secondary;
            doc.setTextColor(...color);
          }
        },
      });
    }

    // ===============================
    // PAGE 9: AI INTEGRATIONS
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.accent);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('8. INTEGRACIONS IA', margin, 17);
    yPos = 35;
    
    if (improvementsAnalysis?.aiIntegrations && improvementsAnalysis.aiIntegrations.length > 0) {
      const aiData = improvementsAnalysis.aiIntegrations.map((ai, idx) => {
        const text = sanitizeText(String(ai));
        const isInstalled = String(ai).includes('[OK] INSTALLAT') || String(ai).includes('INSTAL');
        return [
          String(idx + 1),
          text.replace('[OK] INSTALLAT:', '').replace('[PEND] PENDENT:', '').replace('INSTAL.LAT:', '').replace('PENDENT:', '').trim(),
          isInstalled ? 'ACTIU' : 'PENDENT'
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['Num', 'Integracio IA', 'Estat']],
        body: aiData,
        theme: 'striped',
        headStyles: { fillColor: colors.accent, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center', overflow: 'linebreak' },
        bodyStyles: { fontSize: 10, font: 'times' },
        styles: { font: 'times', cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 125, halign: 'left' },
          2: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (data: any) => {
          if (data.column.index === 2 && data.section === 'body') {
            const status = String(data.cell.raw);
            const color = status === 'ACTIU' ? colors.secondary : colors.warning;
            doc.setTextColor(...color);
          }
        },
      });
    }

    // ===============================
    // PAGE 10: PERFORMANCE
    // ===============================
    doc.addPage();
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('9. OPTIMITZACIONS DE RENDIMENT', margin, 17);
    yPos = 35;
    
    if (improvementsAnalysis?.performanceOptimizations && improvementsAnalysis.performanceOptimizations.length > 0) {
      const perfData = improvementsAnalysis.performanceOptimizations.map((opt, idx) => {
        const text = sanitizeText(String(opt));
        const isInstalled = String(opt).includes('[OK] INSTALLAT') || String(opt).includes('INSTAL');
        return [
          String(idx + 1),
          text.replace('[OK] INSTALLAT:', '').replace('[PEND] PENDENT:', '').replace('INSTAL.LAT:', '').replace('PENDENT:', '').trim(),
          isInstalled ? 'ACTIU' : 'PENDENT'
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['Num', 'Optimitzacio de Rendiment', 'Estat']],
        body: perfData,
        theme: 'striped',
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 10, font: 'helvetica', halign: 'center', overflow: 'linebreak' },
        bodyStyles: { fontSize: 10, font: 'times' },
        styles: { font: 'times', cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 125, halign: 'left' },
          2: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (data: any) => {
          if (data.column.index === 2 && data.section === 'body') {
            const status = String(data.cell.raw);
            const color = status === 'ACTIU' ? colors.secondary : colors.warning;
            doc.setTextColor(...color);
          }
        },
      });
    }
    
    yPos = (doc as any).lastAutoTable?.finalY + 20 || 150;
    
    doc.setFillColor(...colors.light);
    doc.roundedRect(margin, yPos, contentWidth, 40, 5, 5, 'F');
    doc.setTextColor(...colors.dark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUM FINAL', margin + 5, yPos + 10);
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    const finalStats = [
      'Completitud Global: ' + overallCompletion + '%',
      'Moduls Completats: ' + (codebaseAnalysis?.modules?.filter(m => m.completionPercentage >= 90).length || 0) + '/' + (codebaseAnalysis?.modules?.length || 0),
      'Controls de Seguretat: ' + (codebaseAnalysis?.securityFindings?.length || 0),
      'Normatives Complertes: ' + (improvementsAnalysis?.complianceRegulations?.filter(r => r.status === 'compliant').length || 0) + '/' + (improvementsAnalysis?.complianceRegulations?.length || 0),
    ];
    doc.text(finalStats, margin + 5, yPos + 20);

    // ADD FOOTERS TO ALL PAGES
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i - 1, totalPages - 1);
    }

    doc.save(`informe-obelixia-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF professional generat correctament!');
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    toast.error(`Error generant PDF: ${error.message}`);
  }
}

export async function generateCommercialPDF(
  codebaseAnalysis: CodebaseAnalysis | null,
) {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont('times', 'normal');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    const sanitize = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ñ/g, 'n').replace(/ç/g, 'c')
        .replace(/[ÀÁÂÃÄÅ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
        .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/Ñ/g, 'N').replace(/Ç/g, 'C')
        .replace(/·/g, '.').replace(/–/g, '-').replace(/—/g, '-').replace(/…/g, '...')
        .replace(/€/g, 'EUR').replace(/✅/g, '[OK]').replace(/❌/g, '[X]')
        .replace(/[^\x20-\x7E]/g, '').trim();
    };
    
    const salesColors = {
      gold: [212, 175, 55] as RGB,
      darkBlue: [15, 32, 75] as RGB,
      accentBlue: [45, 90, 165] as RGB,
      success: [34, 139, 34] as RGB,
      white: [255, 255, 255] as RGB,
      lightGray: [245, 245, 245] as RGB,
      darkGray: [60, 60, 60] as RGB,
    };

    // COVER PAGE
    doc.setFillColor(...salesColors.darkBlue);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(...salesColors.gold);
    doc.rect(0, 100, pageWidth, 3, 'F');
    doc.rect(0, 175, pageWidth, 3, 'F');
    
    doc.setTextColor(...salesColors.gold);
    doc.setFontSize(42);
    doc.setFont('helvetica', 'bold');
    doc.text('ObelixIA', pageWidth / 2, 70, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...salesColors.white);
    doc.text('CRM Bancari Intel.ligent', pageWidth / 2, 85, { align: 'center' });
    
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA COMERCIAL', pageWidth / 2, 125, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('times', 'italic');
    doc.text('La revolucio digital per a la banca comercial', pageWidth / 2, 140, { align: 'center' });
    
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...salesColors.gold);
    doc.text('95%', 50, 210, { align: 'center' });
    doc.text('72', pageWidth / 2, 210, { align: 'center' });
    doc.text('520%', pageWidth - 50, 210, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(...salesColors.white);
    doc.setFont('helvetica', 'normal');
    doc.text('Completitud', 50, 220, { align: 'center' });
    doc.text('Funcions IA', pageWidth / 2, 220, { align: 'center' });
    doc.text('ROI 5 anys', pageWidth - 50, 220, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(...salesColors.gold);
    doc.text('Confidencial - ' + new Date().toLocaleDateString('ca-ES'), pageWidth / 2, pageHeight - 20, { align: 'center' });

    // PAGE 2 - EXECUTIVE SUMMARY
    doc.addPage();
    let yPos = 20;
    doc.setFillColor(...salesColors.gold);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(...salesColors.darkBlue);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUM EXECUTIU', margin, 20);
    
    yPos = 45;
    doc.setTextColor(...salesColors.darkGray);
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const executiveSummary = [
      'ObelixIA es la plataforma CRM bancaria mes avancada del mercat, dissenyada especificament per a',
      'entitats financeres d\'Andorra, Espanya i Europa. Ofereix una solucio completa que integra:',
      '',
      '[OK] Gestio de cartera empresarial amb 20.000+ empreses geolocalitzades',
      '[OK] Contabilitat PGC Andorra/Espanya amb analisi financera automatitzada', 
      '[OK] IA generativa amb 72 Edge Functions intel.ligents',
      '[OK] Compliance total: ISO 27001, DORA, NIS2, PSD2/PSD3, Basel III/IV',
      '[OK] Autenticacio adaptativa MFA amb biometria comportamental',
      '',
      'VALOR DIFERENCIAL:',
      '- Estalvi vs competidors: 80% menys cost que Salesforce FSC o Temenos',
      '- Temps implantacio: 4-8 setmanes vs 12-18 mesos alternatives',
      '- ROI demostrat: 520% en 5 anys amb break-even a 8 mesos',
    ];
    
    executiveSummary.forEach(line => {
      doc.text(sanitize(line), margin, yPos);
      yPos += 6;
    });
    
    yPos += 10;
    doc.setFillColor(...salesColors.lightGray);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
    doc.setDrawColor(...salesColors.gold);
    doc.setLineWidth(1);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'S');
    doc.setTextColor(...salesColors.darkBlue);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVERSIO: 95.000 EUR llicencia perpetua', margin + 10, yPos + 12);
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Inclou: Implementacio, formacio, 12 mesos manteniment, personalitzacio marca blanca', margin + 10, yPos + 22);
    doc.text('Preu per usuari subscripcio: 89 EUR/mes (minim 10 usuaris)', margin + 10, yPos + 30);

    // PAGE 3 - MODULES
    doc.addPage();
    doc.setFillColor(...salesColors.accentBlue);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(...salesColors.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MODULS PRINCIPALS', margin, 20);
    
    const modules = codebaseAnalysis?.modules?.slice(0, 12) || [];
    const moduleData = modules.map((m, idx) => [
      String(idx + 1),
      sanitize(m.name || 'Modul'),
      String(m.completionPercentage || 0) + '%',
      sanitize(m.businessValue?.substring(0, 50) || 'N/A') + '...'
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['#', 'Modul', 'Completat', 'Valor de Negoci']],
      body: moduleData.length > 0 ? moduleData : [['1', 'Analitza primer', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: salesColors.darkBlue, textColor: salesColors.white, fontSize: 10, font: 'helvetica' },
      bodyStyles: { fontSize: 9, font: 'times' },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 50 }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 90 } },
      margin: { left: margin, right: margin },
    });

    // PAGE 4 - COMPETITORS
    doc.addPage();
    doc.setFillColor(...salesColors.success);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(...salesColors.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPARATIVA AMB COMPETIDORS', margin, 20);
    
    const competitorData = [
      ['Salesforce FSC', '150-300 EUR/usuari/mes', '6-12 mesos', 'NO', '50.000-500.000 EUR'],
      ['Temenos T24', '500K-5M EUR llicencia', '18-36 mesos', 'NO', '1M-15M EUR'],
      ['SAP Banking', '3000-8000 EUR/usuari', '12-24 mesos', 'NO', '500K-10M EUR'],
      ['Microsoft Dynamics', '40-135 EUR/usuari/mes', '6-12 mesos', 'NO', '50.000-300.000 EUR'],
      ['ObelixIA', '89 EUR/usuari/mes', '4-8 SETMANES', 'SI', '95.000 EUR TOTAL']
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [['Solucio', 'Cost Llicencia', 'Implantacio', 'GIS Bancari', 'Inversio Inicial']],
      body: competitorData,
      theme: 'striped',
      headStyles: { fillColor: salesColors.darkBlue, textColor: salesColors.white, fontSize: 9, font: 'helvetica' },
      bodyStyles: { fontSize: 9, font: 'times' },
      didDrawCell: (data: any) => { if (data.row.index === 4 && data.section === 'body') doc.setFillColor(...salesColors.gold); },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFillColor(...salesColors.lightGray);
    doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'F');
    doc.setTextColor(...salesColors.darkBlue);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTALVI ESTIMAT vs SALESFORCE (50 usuaris, 5 anys):', margin + 5, yPos + 12);
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Salesforce FSC: 50 x 200 EUR x 12 x 5 = 600.000 EUR + 200.000 EUR implantacio = 800.000 EUR', margin + 5, yPos + 24);
    doc.text('ObelixIA: 95.000 EUR + (50 x 89 EUR x 12 x 5) = 95.000 + 267.000 = 362.000 EUR', margin + 5, yPos + 32);
    doc.setTextColor(...salesColors.success);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTALVI TOTAL: 438.000 EUR (55% menys cost)', margin + 5, yPos + 42);

    // PAGE 5 - ROI
    doc.addPage();
    doc.setFillColor(...salesColors.gold);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(...salesColors.darkBlue);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ANALISI ROI I BENEFICIS', margin, 20);
    
    const roiData = [
      ['Productivitat gestors', '+35%', '15 min estalvi/visita x 10 visites/dia = 2.5h/dia'],
      ['Reduccio errors', '-80%', 'Validacio automatica fichas, IA resumen'],
      ['Conversio oportunitats', '+25%', 'Pipeline visual, ML predictions'],
      ['Retencio clients', '+15%', 'Segmentacio RFM, churn prediction'],
      ['Temps analisi financer', '-70%', 'RAG Chat, import PDF automatic'],
      ['Compliance audits', '-60%', 'DORA/NIS2 dashboard, stress tests auto'],
      ['Temps implantacio', '-75%', '4-8 setmanes vs 12-18 mesos'],
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [['Metrica', 'Millora', 'Detall']],
      body: roiData,
      theme: 'striped',
      headStyles: { fillColor: salesColors.darkBlue, textColor: salesColors.white, fontSize: 10, font: 'helvetica' },
      bodyStyles: { fontSize: 9, font: 'times' },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 20, halign: 'center', textColor: salesColors.success }, 2: { cellWidth: 110 } },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 20;
    doc.setFillColor(...salesColors.accentBlue);
    doc.roundedRect(margin, yPos, contentWidth, 50, 3, 3, 'F');
    doc.setTextColor(...salesColors.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TIMELINE ROI', pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text('Mes 1-2: Implantacio i formacio', margin + 10, yPos + 25);
    doc.text('Mes 3-4: Adopcio i optimitzacio processos', margin + 10, yPos + 33);
    doc.text('Mes 5-8: Break-even - Inversio recuperada', margin + 10, yPos + 41);
    doc.setTextColor(...salesColors.gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Any 5: ROI acumulat 520%', pageWidth - margin - 60, yPos + 33);

    // PAGE 6 - SECURITY & COMPLIANCE
    doc.addPage();
    doc.setFillColor(...salesColors.darkBlue);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(...salesColors.gold);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SEGURETAT I COMPLIANCE', margin, 20);
    
    const securityData = [
      ['ISO 27001', '92%', '114 controls Annex A implementats'],
      ['DORA', '100%', '7 stress tests automatitzats, incidents, resiliencia'],
      ['NIS2', '95%', 'Gestio riscos, tercers, notificacions'],
      ['PSD2/PSD3 SCA', '100%', 'WebAuthn, biometria, step-up auth'],
      ['GDPR/APDA', '100%', 'Consentiment, drets, audit complet'],
      ['Basel III/IV', '85%', 'Ratios liquiditat, solvencia proxies'],
      ['eIDAS 2.0', '90%', 'DIDs, VCs, EUDI Wallet ready'],
      ['OWASP API Top 10', '100%', '10 controls implementats Edge Functions'],
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [['Normativa', 'Compliment', 'Detall Implementacio']],
      body: securityData,
      theme: 'grid',
      headStyles: { fillColor: salesColors.accentBlue, textColor: salesColors.white, fontSize: 10, font: 'helvetica' },
      bodyStyles: { fontSize: 9, font: 'times' },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 115 } },
      didDrawCell: (data: any) => {
        if (data.column.index === 1 && data.section === 'body') {
          const val = String(data.cell.raw);
          if (val.includes('100')) doc.setTextColor(...salesColors.success);
          else if (parseInt(val) >= 90) doc.setTextColor(34, 139, 100);
          else doc.setTextColor(200, 150, 0);
        }
      },
      margin: { left: margin, right: margin },
    });

    // PAGE 7 - NEXT STEPS / CTA
    doc.addPage();
    doc.setFillColor(...salesColors.darkBlue);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(...salesColors.gold);
    doc.rect(0, 60, pageWidth, 3, 'F');
    doc.rect(0, 180, pageWidth, 3, 'F');
    
    doc.setTextColor(...salesColors.gold);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERS PASSOS', pageWidth / 2, 90, { align: 'center' });
    doc.setTextColor(...salesColors.white);
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    
    const nextSteps = [
      '1. Demo personalitzada amb les vostres dades (2 hores)',
      '2. Analisi de requeriments especifics (1 setmana)',
      '3. Proposta tecnica i economica detallada',
      '4. POC (Proof of Concept) amb 5 usuaris pilot (2 setmanes)',
      '5. Decisio i contractacio',
      '6. Implantacio i formacio (4-8 setmanes)',
      '7. Go-live i suport continu'
    ];
    
    yPos = 110;
    nextSteps.forEach(step => {
      doc.text(sanitize(step), pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    });
    
    doc.setFillColor(...salesColors.gold);
    doc.roundedRect(margin + 20, 200, contentWidth - 40, 40, 5, 5, 'F');
    doc.setTextColor(...salesColors.darkBlue);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTACTE', pageWidth / 2, 215, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Sr. Jaime FERNANDEZ GARCIA | Tel: +34 606770033 | Email: jfernandez@obelixia.com', pageWidth / 2, 228, { align: 'center' });
    
    doc.setTextColor(...salesColors.gold);
    doc.setFontSize(9);
    doc.text('Document confidencial - Propietat ObelixIA - ' + new Date().toLocaleDateString('ca-ES'), pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(...salesColors.darkGray);
      doc.setFontSize(8);
      doc.text(`Pagina ${i - 1} de ${totalPages - 1}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`ObelixIA-Proposta-Comercial-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Proposta comercial generada amb exit!');
    
  } catch (error: any) {
    console.error('Error generating sales PDF:', error);
    toast.error(`Error: ${error.message}`);
  }
}
