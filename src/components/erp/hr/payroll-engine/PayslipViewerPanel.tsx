/**
 * PayslipViewerPanel — V2-RRHH-P1
 * Displays a legal-format payslip with SS bases, IRPF, devengos/deducciones.
 * Integrates with usePayrollLegalCalculation results.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Info, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PayslipData } from '@/engines/erp/hr/payslipEngine';

interface Props {
  payslip: PayslipData;
  className?: string;
}

const r2 = (n: number) => n.toFixed(2);

export function PayslipViewerPanel({ payslip, className }: Props) {
  const { header, devengos, deducciones, bases, liquidoTotal, traceability, warnings, limitations } = payslip;

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recibo de Salarios
          </CardTitle>
          <div className="flex items-center gap-1">
            {traceability.isLegallyComplete ? (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700">
                <CheckCircle className="h-3 w-3 mr-1" /> Datos completos
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700">
                <AlertTriangle className="h-3 w-3 mr-1" /> Datos parciales
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="text-xs space-y-3">
        <ScrollArea className="max-h-[600px]">
          {/* ── Header: Empresa ── */}
          <div className="grid grid-cols-2 gap-3 p-2 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold text-sm">{header.empresaNombre}</p>
              <p className="text-muted-foreground">CIF: {header.empresaCIF || '—'}</p>
              <p className="text-muted-foreground">{header.empresaDomicilio || '—'}</p>
              <p className="text-muted-foreground">CCC: {header.empresaCCC || '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-sm">{header.trabajadorNombre}</p>
              <p className="text-muted-foreground">DNI/NIE: {header.trabajadorDNI || '—'}</p>
              <p className="text-muted-foreground">NAF: {header.trabajadorNAF || '—'}</p>
              <p className="text-muted-foreground">Grupo cot.: {header.trabajadorGrupoCotizacion || '—'} · {header.trabajadorCategoria || '—'}</p>
              <p className="text-muted-foreground">Antigüedad: {header.trabajadorAntiguedad || '—'}</p>
            </div>
          </div>

          <div className="text-center py-1">
            <Badge variant="secondary" className="text-xs">
              {header.periodoNombre} · {header.periodoDesde} a {header.periodoHasta} · {header.diasTotales} días
            </Badge>
          </div>

          <Separator />

          {/* ── Devengos ── */}
          <div>
            <p className="font-semibold mb-1">I. DEVENGOS</p>
            <table className="w-full">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-0.5">Concepto</th>
                  <th className="text-right py-0.5 w-16">Uds</th>
                  <th className="text-right py-0.5 w-20">€/ud</th>
                  <th className="text-right py-0.5 w-20">Importe</th>
                </tr>
              </thead>
              <tbody>
                {devengos.map((d, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-0.5">
                      {d.concepto}
                      {!d.isSalarial && <span className="text-muted-foreground ml-1">(ext.)</span>}
                    </td>
                    <td className="text-right py-0.5">{d.unidades ?? ''}</td>
                    <td className="text-right py-0.5">{d.precioUnidad ? r2(d.precioUnidad) : ''}</td>
                    <td className="text-right py-0.5 font-medium">{r2(d.importe)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2">
                  <td colSpan={3} className="py-1">TOTAL DEVENGOS</td>
                  <td className="text-right py-1">{r2(payslip.totalDevengos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Separator />

          {/* ── Deducciones ── */}
          <div>
            <p className="font-semibold mb-1">II. DEDUCCIONES</p>
            <table className="w-full">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-0.5">Concepto</th>
                  <th className="text-right py-0.5 w-20">Base</th>
                  <th className="text-right py-0.5 w-16">%</th>
                  <th className="text-right py-0.5 w-20">Importe</th>
                </tr>
              </thead>
              <tbody>
                {deducciones.map((d, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-0.5">{d.concepto}</td>
                    <td className="text-right py-0.5">{d.base ? r2(d.base) : ''}</td>
                    <td className="text-right py-0.5">{d.porcentaje ? d.porcentaje.toFixed(2) : ''}</td>
                    <td className="text-right py-0.5 font-medium">{r2(d.importe)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2">
                  <td colSpan={3} className="py-1">TOTAL DEDUCCIONES</td>
                  <td className="text-right py-1">{r2(payslip.totalDeducciones)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Separator />

          {/* ── Bases de cotización ── */}
          <div>
            <p className="font-semibold mb-1">III. DETERMINACIÓN DE LAS BASES DE COTIZACIÓN Y CONCEPTOS DE RECAUDACIÓN CONJUNTA</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Base CC:</span><span className="font-medium">{r2(bases.baseCotizacionCC)}</span></div>
                <div className="flex justify-between"><span>Base AT/EP:</span><span className="font-medium">{r2(bases.baseCotizacionAT)}</span></div>
                <div className="flex justify-between"><span>Base IRPF:</span><span className="font-medium">{r2(bases.baseIRPF)}</span></div>
                {bases.baseHorasExtra > 0 && (
                  <div className="flex justify-between"><span>Base HHEE:</span><span className="font-medium">{r2(bases.baseHorasExtra)}</span></div>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-muted-foreground"><span>Cot. empresa:</span><span>{r2(bases.totalCotizacionesEmpresa)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Cot. trabajador:</span><span>{r2(bases.totalCotizacionesTrabajador)}</span></div>
                {bases.meiTrabajador > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>MEI trab.:</span><span>{r2(bases.meiTrabajador)}</span></div>
                )}
                {bases.meiEmpresa > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>MEI emp.:</span><span>{r2(bases.meiEmpresa)}</span></div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Líquido ── */}
          <div className="p-3 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">LÍQUIDO TOTAL A PERCIBIR</span>
              <span className="font-bold text-lg">{r2(liquidoTotal)} €</span>
            </div>
          </div>

          {/* ── Warnings & Limitations ── */}
          {(warnings.length > 0 || limitations.length > 0) && (
            <div className="space-y-1 pt-2">
              {warnings.map((w, i) => (
                <div key={`w-${i}`} className="flex items-start gap-1 text-amber-700 text-[10px]">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
              {limitations.map((l, i) => (
                <div key={`l-${i}`} className="flex items-start gap-1 text-muted-foreground text-[10px]">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Traceability footer ── */}
          <div className="pt-2 border-t text-[10px] text-muted-foreground flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span>Hash: {traceability.calculationHash} · SS: {traceability.ssDataQuality} · IRPF: {traceability.irpfDataQuality} · v{traceability.snapshotVersion}</span>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
