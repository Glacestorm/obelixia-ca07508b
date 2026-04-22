/**
 * ESPayrollSlipDetail — Detalle de nómina española (formato legal)
 * Secciones: Devengos, Deducciones, Bases cotización, Costes empresa, Líquido
 * Incluye export PDF
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { FileDown, Euro, Building2, User } from 'lucide-react';
import { type ESPayrollCalculation } from '@/hooks/erp/hr/useESPayrollBridge';

interface Props {
  calculation: ESPayrollCalculation;
  employeeName?: string;
  employeeNAF?: string;
  companyName?: string;
  companyCIF?: string;
  companyCCC?: string;
  periodo?: string;
  grupo?: number;
  categoria?: string;
}

export function ESPayrollSlipDetail({
  calculation,
  employeeName = 'Empleado',
  employeeNAF,
  companyName,
  companyCIF,
  companyCCC,
  periodo,
  grupo,
  categoria,
}: Props) {
  const { lines, summary } = calculation;
  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const earnings = lines.filter(l => l.line_type === 'earning' && l.amount !== 0);
  const deductions = lines.filter(l => l.line_type === 'deduction' && l.amount !== 0);
  const employerCosts = lines.filter(l => l.line_type === 'employer_cost' && l.amount !== 0);
  const informatives = lines.filter(l => l.line_type === 'informative');

  const handleExportPDF = () => {
    // Simplified: in production, use jsPDF
    const content = [
      `NÓMINA — ${periodo || 'Período'}`,
      `Empresa: ${companyName || 'N/A'} | CIF: ${companyCIF || 'N/A'} | CCC: ${companyCCC || 'N/A'}`,
      `Trabajador: ${employeeName} | NAF: ${employeeNAF || 'N/A'} | Grupo: ${grupo || 'N/A'}`,
      '',
      'I. DEVENGOS',
      ...earnings.map(l => `  ${l.concept_name}: ${fmt(l.amount)} €`),
      `  TOTAL DEVENGOS: ${fmt(summary.totalDevengos)} €`,
      '',
      'II. DEDUCCIONES',
      ...deductions.map(l => `  ${l.concept_name}${l.percentage ? ` (${l.percentage}%)` : ''}: ${fmt(l.amount)} €`),
      `  TOTAL DEDUCCIONES: ${fmt(summary.totalDeducciones)} €`,
      '',
      'III. BASES DE COTIZACIÓN',
      `  BC Contingencias Comunes: ${fmt(summary.baseCotizacionCC)} €`,
      `  BC AT/EP: ${fmt(summary.baseCotizacionAT)} €`,
      `  Base IRPF: ${fmt(summary.baseIRPF)} €`,
      '',
      'IV. COSTE EMPRESA',
      ...employerCosts.map(l => `  ${l.concept_name}: ${fmt(l.amount)} €`),
      `  TOTAL COSTE EMPRESA: ${fmt(summary.totalCosteEmpresa)} €`,
      '',
      `═══════════════════════════════════════`,
      `LÍQUIDO A PERCIBIR: ${fmt(summary.liquidoPercibir)} €`,
      `COSTE TOTAL EMPRESA: ${fmt(summary.totalDevengos + summary.totalCosteEmpresa)} €`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina_${employeeName.replace(/\s+/g, '_')}_${periodo || 'sim'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-2">
      {/* Header */}
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4 text-primary" /> Nómina España
              {periodo && <Badge variant="outline" className="text-xs">{periodo}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {companyName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{companyName}</span>}
              {companyCIF && <span>CIF: {companyCIF}</span>}
              {companyCCC && <span>CCC: {companyCCC}</span>}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{employeeName}</span>
              {employeeNAF && <span>NAF: {employeeNAF}</span>}
              {grupo && <span>Grupo: {grupo}</span>}
              {categoria && <span>Cat: {categoria}</span>}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-1.5"
            title="Descarga un resumen del recibo en formato texto plano. PDF firmado pendiente."
          >
            <FileDown className="h-4 w-4" /> Descargar (TXT)
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* I. Devengos */}
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">I. Devengos (Percepciones)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Concepto</TableHead>
                <TableHead className="text-xs text-center">IRPF</TableHead>
                <TableHead className="text-xs text-center">SS</TableHead>
                <TableHead className="text-xs text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{l.concept_name}</TableCell>
                  <TableCell className="text-center text-xs">{l.is_taxable ? '✓' : '—'}</TableCell>
                  <TableCell className="text-center text-xs">{l.is_ss_contributable ? '✓' : '—'}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{fmt(l.amount)} €</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={3} className="text-sm">TOTAL DEVENGOS</TableCell>
                <TableCell className="text-sm text-right font-mono">{fmt(summary.totalDevengos)} €</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* II. Deducciones */}
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">II. Deducciones</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Concepto</TableHead>
                <TableHead className="text-xs text-right">Base</TableHead>
                <TableHead className="text-xs text-right">%</TableHead>
                <TableHead className="text-xs text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{l.concept_name}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{l.base_amount ? `${fmt(l.base_amount)}` : '—'}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{l.percentage ? `${l.percentage}%` : '—'}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{fmt(l.amount)} €</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={3} className="text-sm">TOTAL DEDUCCIONES</TableCell>
                <TableCell className="text-sm text-right font-mono">{fmt(summary.totalDeducciones)} €</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* III. Bases de cotización */}
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">III. Bases de Cotización</h4>
          <div className="grid grid-cols-3 gap-3">
            {informatives.filter(l => l.concept_code.startsWith('ES_BASE')).map((l, i) => (
              <div key={i} className="p-3 rounded-lg border bg-card text-center">
                <p className="text-[10px] text-muted-foreground uppercase">{l.concept_name}</p>
                <p className="text-lg font-bold font-mono">{fmt(l.amount)} €</p>
              </div>
            ))}
          </div>
          {summary.bases && (summary.bases.aplicoTopeMaximo || summary.bases.aplicoTopeMinimo) && (
            <p className="mt-2 text-[10px] italic text-muted-foreground">
              {summary.bases.aplicoTopeMaximo
                ? 'Base de cotización CC limitada por tope MÁXIMO legal vigente (Orden PJC/297/2026).'
                : 'Base de cotización CC ajustada al tope MÍNIMO legal vigente (Orden PJC/297/2026).'}
            </p>
          )}
        </div>

        <Separator />

        {/* IV. Coste empresa */}
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">IV. Coste Empresa (SS)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Concepto</TableHead>
                <TableHead className="text-xs text-right">Base</TableHead>
                <TableHead className="text-xs text-right">%</TableHead>
                <TableHead className="text-xs text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employerCosts.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{l.concept_name}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{l.base_amount ? `${fmt(l.base_amount)}` : '—'}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{l.percentage ? `${l.percentage}%` : '—'}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{fmt(l.amount)} €</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={3} className="text-sm">TOTAL COSTE EMPRESA (SS)</TableCell>
                <TableCell className="text-sm text-right font-mono">{fmt(summary.totalCosteEmpresa)} €</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* Footer: Líquido */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/20 text-center">
            <p className="text-xs text-muted-foreground uppercase">Líquido a percibir</p>
            <p className="text-2xl font-bold font-mono text-primary">{fmt(summary.liquidoPercibir)} €</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border text-center">
            <p className="text-xs text-muted-foreground uppercase">Coste total empresa</p>
            <p className="text-2xl font-bold font-mono">{fmt(summary.totalDevengos + summary.totalCosteEmpresa)} €</p>
          </div>
        </div>

        {/* IRPF summary */}
        <div className="text-xs text-muted-foreground flex items-center gap-4">
          <span>Tipo IRPF efectivo: <strong>{summary.tipoIRPF}%</strong></span>
          <span>Retención mensual: <strong>{fmt(summary.irpfResult.retencionMensual)} €</strong></span>
          <span>SS trabajador: <strong>{fmt(summary.ssContributions.totalTrabajador)} €</strong></span>
          <span>SS empresa: <strong>{fmt(summary.ssContributions.totalEmpresa)} €</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
