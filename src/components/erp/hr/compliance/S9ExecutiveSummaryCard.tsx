/**
 * S9ExecutiveSummaryCard — Vista ejecutiva ligera del bloque S9-VPT (S9.9)
 * Deterministic, no AI. Observational language only.
 * Badge: internal_ready. Disclaimer always visible.
 */

import { memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import { useS9RetributiveAudit } from '@/hooks/erp/hr/useS9RetributiveAudit';
import { useS9SalaryRegister } from '@/hooks/erp/hr/useS9SalaryRegister';
import { useS9VPT } from '@/hooks/erp/hr/useS9VPT';
import { generateExecutivePDFData, type ExecutiveSummaryInput } from '@/engines/erp/hr/s9ComplianceEngine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { sanitizeForPDF } from '@/components/reports/constants/fonts';

interface Props {
  companyId: string;
}

export const S9ExecutiveSummaryCard = memo(function S9ExecutiveSummaryCard({ companyId }: Props) {
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const { report: auditReport, isLoading: loadAudit, hasVPTData, vptCoverage, latestVPTApproval, vptCount } =
    useS9RetributiveAudit(companyId, currentPeriod);

  const { report: srReport, isLoading: loadSR, employeeCount: srEmployees } =
    useS9SalaryRegister(companyId, currentPeriod);

  const { analytics, isLoading: loadVPT } = useS9VPT(companyId);

  const isLoading = loadAudit || loadSR || loadVPT;

  const summaryData = useMemo(() => {
    const input: ExecutiveSummaryInput = {
      period: currentPeriod,
      audit: auditReport ? {
        globalGapPercent: auditReport.globalGapPercent,
        groupsWithAlert: auditReport.groupsWithAlert,
        entries: auditReport.entries.length,
      } : null,
      vpt: {
        positionsValued: analytics?.positionsValued ?? vptCount ?? 0,
        totalPositions: analytics?.totalPositions ?? (vptCoverage > 0 ? Math.round(vptCount / vptCoverage) : 0),
        incoherenceCount: analytics?.incoherences?.length ?? 0,
        latestApproval: latestVPTApproval ?? null,
      },
      salaryRegister: srReport ? {
        employeeCount: srEmployees,
        hasVPTData,
      } : null,
    };
    return generateExecutivePDFData(input);
  }, [auditReport, analytics, srReport, currentPeriod, hasVPTData, vptCount, vptCoverage, latestVPTApproval, srEmployees]);

  const handleExportPDF = useCallback(() => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 18;
      let y = 20;
      const pageW = 210;
      const contentW = pageW - margin * 2;

      // Header disclaimer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      const disclaimerLines = doc.splitTextToSize(sanitizeForPDF(summaryData.disclaimer), contentW);
      doc.text(disclaimerLines, margin, y);
      y += disclaimerLines.length * 3.5 + 4;

      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 50, 120);
      doc.text(sanitizeForPDF('S9 - Resumen Ejecutivo VPT'), margin, y);
      y += 7;

      // Subtitle
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(sanitizeForPDF(`Periodo: ${summaryData.period} | Generado: ${new Date().toLocaleDateString('es-ES')}`), margin, y);
      y += 4;
      doc.text(sanitizeForPDF(`Estado: ${summaryData.readiness}`), margin, y);
      y += 10;

      // KPIs
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 80, 150);
      doc.text('Indicadores principales', margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont('times', 'normal');
      doc.setTextColor(0, 0, 0);

      const kpis = [
        ['Cobertura VPT', `${summaryData.vptCoverage.valued} / ${summaryData.vptCoverage.total} posiciones (${(summaryData.vptCoverage.ratio * 100).toFixed(0)}%)`],
        ['Brecha media bruta', summaryData.globalGapPercent != null ? `${(summaryData.globalGapPercent * 100).toFixed(1)}%` : 'Sin datos'],
        ['Incoherencias VPT', `${summaryData.vptIncoherenceCount}`],
        ['Cobertura registro retributivo', `${summaryData.salaryRegisterCoverage} empleados`],
        ['Ultimo VPT aprobado', summaryData.latestVPTApproval ? new Date(summaryData.latestVPTApproval).toLocaleDateString('es-ES') : 'Sin datos'],
      ];

      for (const [label, value] of kpis) {
        doc.setFont('times', 'bold');
        doc.text(sanitizeForPDF(`${label}:`), margin, y);
        doc.setFont('times', 'normal');
        doc.text(sanitizeForPDF(value), margin + 60, y);
        y += 5;
      }

      y += 6;

      // Summary sentences
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 80, 150);
      doc.text('Observaciones', margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont('times', 'normal');
      doc.setTextColor(0, 0, 0);

      for (const sentence of summaryData.sentences) {
        const lines = doc.splitTextToSize(sanitizeForPDF(`- ${sentence}`), contentW);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 2;
      }

      // Footer
      y = 280;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text(sanitizeForPDF('ObelixIA ERP Enterprise | Documento interno preparatorio | No constituye informe oficial'), margin, y);

      doc.save(`S9_Resumen_Ejecutivo_${summaryData.period}.pdf`);
      toast.success('PDF descargado');
    } catch (err) {
      console.error('[S9ExecutiveSummaryCard] PDF export error:', err);
      toast.error('Error al generar PDF');
    }
  }, [summaryData]);

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Cargando resumen ejecutivo S9...</p>
        </CardContent>
      </Card>
    );
  }

  const gapDisplay = summaryData.globalGapPercent != null
    ? `${(summaryData.globalGapPercent * 100).toFixed(1)}%`
    : '—';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            S9 — Resumen Ejecutivo VPT
            <S9ReadinessBadge readiness={summaryData.readiness} />
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPICell
            label="Cobertura VPT"
            value={`${summaryData.vptCoverage.valued}/${summaryData.vptCoverage.total}`}
            sub={`${(summaryData.vptCoverage.ratio * 100).toFixed(0)}%`}
          />
          <KPICell
            label="Brecha media bruta"
            value={gapDisplay}
            alert={summaryData.globalGapPercent != null && summaryData.globalGapPercent > 0.25}
          />
          <KPICell
            label="Incoherencias VPT"
            value={String(summaryData.vptIncoherenceCount)}
            alert={summaryData.vptIncoherenceCount > 0}
          />
          <KPICell
            label="Registro retributivo"
            value={`${summaryData.salaryRegisterCoverage} emp.`}
          />
          <KPICell
            label="Ultimo VPT aprobado"
            value={summaryData.latestVPTApproval
              ? new Date(summaryData.latestVPTApproval).toLocaleDateString('es-ES')
              : 'Sin datos'
            }
          />
          <KPICell
            label="Periodo"
            value={summaryData.period}
          />
        </div>

        <Separator />

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border">
          <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {summaryData.disclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

function KPICell({ label, value, sub, alert: isAlert }: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="p-2.5 rounded-md border bg-card">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {isAlert && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
        <span className={cn("text-sm font-semibold", isAlert && "text-amber-600")}>{value}</span>
        {sub && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sub}</Badge>}
      </div>
    </div>
  );
}

export default S9ExecutiveSummaryCard;
