import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Save, Printer, CheckCircle, AlertTriangle, TrendingDown, Zap, Building2, FileBarChart } from 'lucide-react';
import { PermissionGate } from './PermissionGate';
import { useEnergyCase } from '@/hooks/erp/useEnergyCases';
import { useEnergyRecommendation } from '@/hooks/erp/useEnergyRecommendation';
import { useEnergyReports, EnergyReport } from '@/hooks/erp/useEnergyReports';
import { useEnergySupply } from '@/hooks/erp/useEnergySupply';
import { useEnergyConsumptionProfile } from '@/hooks/erp/useEnergyConsumptionProfile';
import { useEnergyContracts } from '@/hooks/erp/useEnergyContracts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props { caseId: string; }

export function CaseReportTab({ caseId }: Props) {
  const { energyCase } = useEnergyCase(caseId);
  const { recommendation } = useEnergyRecommendation(caseId);
  const { supply } = useEnergySupply(caseId);
  const { profile } = useEnergyConsumptionProfile(caseId);
  const { contracts } = useEnergyContracts(caseId);
  const { reports, createReport } = useEnergyReports(caseId);
  const [previewMode, setPreviewMode] = useState(true);
  const [generating, setGenerating] = useState(false);

  const today = format(new Date(), 'dd/MM/yyyy', { locale: es });
  const fmtCurrency = (v: number | null) => v != null ? `${v.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €` : '—';
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  const activeContract = contracts.length > 0 ? contracts[0] : null;

  const riskColor = (r: string | null) => {
    if (r === 'low') return 'text-emerald-600';
    if (r === 'medium') return 'text-amber-600';
    return 'text-destructive';
  };

  const riskLabel = (r: string | null) => {
    if (r === 'low') return 'Bajo';
    if (r === 'medium') return 'Medio';
    if (r === 'high') return 'Alto';
    return r || '—';
  };

  // =============== PDF GENERATION ===============
  const generatePDF = useCallback(async () => {
    if (!energyCase) return;
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = 0;

      const addHeader = () => {
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageW, 12, 'F');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('INFORME DE OPTIMIZACIÓN ELÉCTRICA', margin, 8);
        doc.text(today, pageW - margin, 8, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      };

      const addFooter = (pageNum: number) => {
        const h = doc.internal.pageSize.getHeight();
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, h - 15, pageW - margin, h - 15);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${pageNum}`, pageW / 2, h - 10, { align: 'center' });
        doc.text('Confidencial — Consultoría Eléctrica', margin, h - 10);
        doc.setTextColor(0, 0, 0);
      };

      const checkPage = (needed: number, pageNum: { value: number }) => {
        const h = doc.internal.pageSize.getHeight();
        if (y + needed > h - 25) {
          addFooter(pageNum.value);
          doc.addPage();
          pageNum.value++;
          addHeader();
          y = 20;
        }
      };

      const sectionTitle = (text: string, pageNum: { value: number }) => {
        checkPage(20, pageNum);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(text, margin + 4, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        y += 15;
      };

      const pageNum = { value: 1 };

      // ===== PAGE 1: COVER =====
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageW, 100, 'F');
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Informe de', margin, 45);
      doc.text('Optimización Eléctrica', margin, 58);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(energyCase.title, margin, 75);
      doc.text(today, margin, 85);

      doc.setTextColor(0, 0, 0);
      y = 115;

      // Cover info box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentW, 50, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentW, 50, 3, 3, 'S');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const leftCol = margin + 8;
      const rightCol = pageW / 2 + 5;
      let iy = y + 12;

      doc.text('CUPS:', leftCol, iy);
      doc.setTextColor(0, 0, 0);
      doc.text(energyCase.cups || '—', leftCol + 30, iy);
      doc.setTextColor(100, 116, 139);
      doc.text('Comercializadora:', rightCol, iy);
      doc.setTextColor(0, 0, 0);
      doc.text(energyCase.current_supplier || '—', rightCol + 45, iy);
      iy += 10;
      doc.setTextColor(100, 116, 139);
      doc.text('Tarifa actual:', leftCol, iy);
      doc.setTextColor(0, 0, 0);
      doc.text(energyCase.current_tariff || '—', leftCol + 30, iy);
      doc.setTextColor(100, 116, 139);
      doc.text('Fin contrato:', rightCol, iy);
      doc.setTextColor(0, 0, 0);
      doc.text(fmtDate(energyCase.contract_end_date), rightCol + 45, iy);
      iy += 10;
      doc.setTextColor(100, 116, 139);
      doc.text('Dirección:', leftCol, iy);
      doc.setTextColor(0, 0, 0);
      doc.text(energyCase.address || '—', leftCol + 30, iy);

      addFooter(pageNum.value);

      // ===== PAGE 2: EXECUTIVE SUMMARY =====
      doc.addPage();
      pageNum.value++;
      addHeader();
      y = 22;

      sectionTitle('1. Resumen Ejecutivo', pageNum);
      doc.setFontSize(9);
      y += 2;
      const summaryLines = [
        `Este informe analiza el suministro eléctrico del expediente "${energyCase.title}" con el objetivo de`,
        'identificar oportunidades de optimización en tarifa, potencia contratada y hábitos de consumo.',
      ];
      summaryLines.forEach(line => {
        doc.text(line, margin, y);
        y += 5;
      });
      y += 5;

      // KPI boxes
      if (recommendation) {
        const boxW = contentW / 3 - 4;
        const boxes = [
          { label: 'Ahorro Mensual', value: fmtCurrency(recommendation.monthly_savings_estimate), color: [16, 185, 129] as [number, number, number] },
          { label: 'Ahorro Anual', value: fmtCurrency(recommendation.annual_savings_estimate), color: [5, 150, 105] as [number, number, number] },
          { label: 'Confianza', value: `${recommendation.confidence_score || 0}%`, color: [59, 130, 246] as [number, number, number] },
        ];

        boxes.forEach((box, i) => {
          const bx = margin + i * (boxW + 6);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(bx, y, boxW, 22, 2, 2, 'F');
          doc.setDrawColor(...box.color);
          doc.roundedRect(bx, y, boxW, 22, 2, 2, 'S');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(box.label, bx + boxW / 2, y + 8, { align: 'center' });
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...box.color);
          doc.text(box.value, bx + boxW / 2, y + 18, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        });
        y += 30;
      }

      // ===== CURRENT SITUATION =====
      sectionTitle('2. Situación Actual', pageNum);
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      const situationData = [
        ['Comercializadora', energyCase.current_supplier || '—'],
        ['Tarifa actual', energyCase.current_tariff || '—'],
        ['CUPS', energyCase.cups || '—'],
        ['Dirección', energyCase.address || '—'],
        ['Fin de contrato', fmtDate(energyCase.contract_end_date)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Concepto', 'Valor']],
        body: situationData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ===== CONTRACT =====
      if (activeContract) {
        sectionTitle('3. Contrato Actual', pageNum);
        const contractData = [
          ['Comercializadora', activeContract.supplier || '—'],
          ['Tarifa', activeContract.tariff_name || '—'],
          ['Inicio', fmtDate(activeContract.start_date)],
          ['Fin', fmtDate(activeContract.end_date)],
          ['Permanencia', activeContract.has_permanence ? 'Sí' : 'No'],
          ['Penalización salida', activeContract.early_exit_penalty_text || '—'],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Concepto', 'Valor']],
          body: contractData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ===== SUPPLY / POWER =====
      if (supply) {
        checkPage(50, pageNum);
        sectionTitle('4. Análisis de Potencia', pageNum);
        const powerData = [
          ['Tarifa de acceso', supply.tariff_access || '—'],
          ['Distribuidora', supply.distributor || '—'],
          ['Potencia contratada P1', `${supply.contracted_power_p1 || '—'} kW`],
          ['Potencia contratada P2', `${supply.contracted_power_p2 || '—'} kW`],
          ['Potencia máx. demandada P1', `${supply.max_demand_p1 || '—'} kW`],
          ['Potencia máx. demandada P2', `${supply.max_demand_p2 || '—'} kW`],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Concepto', 'Valor']],
          body: powerData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ===== RECOMMENDATION =====
      if (recommendation) {
        checkPage(60, pageNum);
        sectionTitle('5. Recomendación', pageNum);
        const recData = [
          ['Comercializadora recomendada', recommendation.recommended_supplier || '—'],
          ['Tarifa recomendada', recommendation.recommended_tariff || '—'],
          ['Potencia recomendada P1', `${recommendation.recommended_power_p1 || '—'} kW`],
          ['Potencia recomendada P2', `${recommendation.recommended_power_p2 || '—'} kW`],
          ['Ahorro mensual estimado', fmtCurrency(recommendation.monthly_savings_estimate)],
          ['Ahorro anual estimado', fmtCurrency(recommendation.annual_savings_estimate)],
          ['Nivel de riesgo', riskLabel(recommendation.risk_level)],
          ['Confianza', `${recommendation.confidence_score || 0}%`],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Concepto', 'Valor']],
          body: recData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [240, 253, 244] },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        if (recommendation.implementation_notes) {
          checkPage(25, pageNum);
          doc.setFillColor(255, 251, 235);
          doc.roundedRect(margin, y, contentW, 20, 2, 2, 'F');
          doc.setFontSize(8);
          doc.setTextColor(146, 64, 14);
          doc.text('Observaciones:', margin + 4, y + 6);
          doc.setTextColor(0, 0, 0);
          const noteLines = doc.splitTextToSize(recommendation.implementation_notes, contentW - 12);
          doc.text(noteLines.slice(0, 3), margin + 4, y + 12);
          y += 25;
        }
      }

      // ===== ACTION PLAN =====
      checkPage(40, pageNum);
      sectionTitle('6. Plan de Acción', pageNum);
      doc.setFontSize(9);
      const actions = [
        '1. Verificar condiciones de permanencia del contrato actual.',
        '2. Solicitar ofertas a la comercializadora recomendada.',
        '3. Tramitar cambio de potencia contratada si procede.',
        '4. Realizar seguimiento mensual del ahorro conseguido.',
        '5. Revisar tarifa a los 12 meses.',
      ];
      actions.forEach(a => {
        checkPage(7, pageNum);
        doc.text(a, margin + 4, y);
        y += 6;
      });

      // Final footer
      addFooter(pageNum.value);

      // ===== SAVE PDF =====
      const fileName = `Informe_${energyCase.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      // Save reference
      await createReport({
        report_type: 'optimization',
        summary: `Informe de optimización generado el ${today}. Ahorro estimado: ${fmtCurrency(recommendation?.annual_savings_estimate ?? null)}/año.`,
      });

      toast.success('PDF generado correctamente');
    } catch (err) {
      console.error('[CaseReportTab] PDF error:', err);
      toast.error('Error al generar PDF');
    } finally {
      setGenerating(false);
    }
  }, [energyCase, recommendation, supply, activeContract, createReport, today]);

  if (!energyCase) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Informe de Optimización
          </h3>
          <p className="text-xs text-muted-foreground">Vista previa y generación de informe PDF profesional</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="h-4 w-4 mr-1" /> {previewMode ? 'Ocultar preview' : 'Ver preview'}
          </Button>
          <PermissionGate action="generate_report">
            <Button size="sm" onClick={generatePDF} disabled={generating}>
              <Download className="h-4 w-4 mr-1" /> {generating ? 'Generando...' : 'Generar PDF'}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Previous reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Versiones anteriores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">v{r.version}</span>
                    <span className="text-muted-foreground">{fmtDate(r.created_at)}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.report_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report preview */}
      {previewMode && (
        <Card className="border-2 border-dashed">
          <CardContent className="p-6">
            <ScrollArea className="h-[600px]">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Cover */}
                <div className="bg-slate-800 text-white rounded-lg p-8">
                  <h1 className="text-2xl font-bold">Informe de Optimización Eléctrica</h1>
                  <p className="text-slate-300 mt-2">{energyCase.title}</p>
                  <p className="text-slate-400 text-sm mt-1">{today}</p>
                </div>

                {/* Summary KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-xs text-emerald-600">Ahorro Mensual</p>
                    <p className="text-xl font-bold text-emerald-700">{fmtCurrency(recommendation?.monthly_savings_estimate ?? null)}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-xs text-emerald-600">Ahorro Anual</p>
                    <p className="text-xl font-bold text-emerald-700">{fmtCurrency(recommendation?.annual_savings_estimate ?? null)}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                    <p className="text-xs text-blue-600">Confianza</p>
                    <p className="text-xl font-bold text-blue-700">{recommendation?.confidence_score || 0}%</p>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm border-b pb-1 mb-2">Situación Actual</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Comercializadora:</span> {energyCase.current_supplier || '—'}</div>
                      <div><span className="text-muted-foreground">Tarifa:</span> {energyCase.current_tariff || '—'}</div>
                      <div><span className="text-muted-foreground">CUPS:</span> <span className="font-mono text-xs">{energyCase.cups || '—'}</span></div>
                      <div><span className="text-muted-foreground">Fin contrato:</span> {fmtDate(energyCase.contract_end_date)}</div>
                    </div>
                  </div>

                  {supply && (
                    <div>
                      <h3 className="font-semibold text-sm border-b pb-1 mb-2">Potencia</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Contratada P1: <strong>{supply.contracted_power_p1 || '—'} kW</strong></div>
                        <div>Contratada P2: <strong>{supply.contracted_power_p2 || '—'} kW</strong></div>
                        <div>Máx. demandada P1: <strong>{supply.max_demand_p1 || '—'} kW</strong></div>
                        <div>Máx. demandada P2: <strong>{supply.max_demand_p2 || '—'} kW</strong></div>
                      </div>
                    </div>
                  )}

                  {recommendation && (
                    <div>
                      <h3 className="font-semibold text-sm border-b pb-1 mb-2">Recomendación</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Comercializadora: <strong>{recommendation.recommended_supplier || '—'}</strong></div>
                        <div>Tarifa: <strong>{recommendation.recommended_tariff || '—'}</strong></div>
                        <div>Potencia P1: <strong>{recommendation.recommended_power_p1 || '—'} kW</strong></div>
                        <div>Potencia P2: <strong>{recommendation.recommended_power_p2 || '—'} kW</strong></div>
                        <div>Riesgo: <strong className={riskColor(recommendation.risk_level)}>{riskLabel(recommendation.risk_level)}</strong></div>
                      </div>
                      {recommendation.implementation_notes && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          <strong>Observaciones:</strong> {recommendation.implementation_notes}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-sm border-b pb-1 mb-2">Plan de Acción</h3>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                      <li>Verificar condiciones de permanencia del contrato actual.</li>
                      <li>Solicitar ofertas a la comercializadora recomendada.</li>
                      <li>Tramitar cambio de potencia contratada si procede.</li>
                      <li>Realizar seguimiento mensual del ahorro conseguido.</li>
                      <li>Revisar tarifa a los 12 meses.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CaseReportTab;
