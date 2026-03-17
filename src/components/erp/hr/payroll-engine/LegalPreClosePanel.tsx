/**
 * LegalPreClosePanel — V2-RRHH-P1
 * Shows legal pre-close validation checks (SS, IRPF, SMI, data completeness)
 * and triggers legal calculation for the period.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Calculator, CheckCircle, XCircle, AlertTriangle, Info, Loader2,
  FileText, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePayrollLegalCalculation } from '@/hooks/erp/hr/usePayrollLegalCalculation';
import { PayslipViewerPanel } from './PayslipViewerPanel';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import type { LegalPreCloseCheck } from '@/engines/erp/hr/payslipEngine';

interface Props {
  companyId: string;
  period: PayrollPeriod | null;
  className?: string;
}

export function LegalPreClosePanel({ companyId, period, className }: Props) {
  const { isCalculating, lastResult, calculateForPeriod } = usePayrollLegalCalculation(companyId);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleCalculate = async () => {
    if (!period) return;
    await calculateForPeriod(
      period.id,
      period.fiscal_year,
      period.period_number,
      period.period_name,
      period.start_date,
      period.end_date,
    );
  };

  const selectedResult = lastResult?.results.find(r => r.employeeId === selectedPayslip);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Validación Legal de Nómina
            <Badge variant="outline" className="text-[10px]">V2-RRHH-P1</Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={handleCalculate}
            disabled={isCalculating || !period}
            className="h-7 text-xs"
          >
            {isCalculating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Calculator className="h-3 w-3 mr-1" />}
            Calcular SS + IRPF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="text-xs space-y-3">
        {!period && (
          <p className="text-muted-foreground text-center py-4">Selecciona un período para validar</p>
        )}

        {lastResult && (
          <>
            {/* ── Summary ── */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">{lastResult.calculated}</p>
                <p className="text-muted-foreground">Calculadas</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">{lastResult.skipped}</p>
                <p className="text-muted-foreground">Omitidas</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">{lastResult.errors.length}</p>
                <p className="text-muted-foreground">Errores</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">
                  {lastResult.preCloseChecks.filter(c => c.passed).length}/{lastResult.preCloseChecks.length}
                </p>
                <p className="text-muted-foreground">Checks OK</p>
              </div>
            </div>

            <Separator />

            {/* ── Pre-close checks ── */}
            <div>
              <p className="font-semibold mb-1">Validaciones precierre legal</p>
              <div className="space-y-1">
                {lastResult.preCloseChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Employee results ── */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 text-xs"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>Detalle por empleado ({lastResult.results.length})</span>
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>

              {showDetails && (
                <ScrollArea className="max-h-[300px] mt-1">
                  <div className="space-y-1">
                    {lastResult.results.map(r => (
                      <div
                        key={r.employeeId}
                        className={cn(
                          'p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors',
                          selectedPayslip === r.employeeId && 'ring-2 ring-primary/50'
                        )}
                        onClick={() => setSelectedPayslip(
                          selectedPayslip === r.employeeId ? null : r.employeeId
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{r.employeeName}</p>
                            <p className="text-muted-foreground">
                              IRPF {r.irpf.tipoEfectivo}% · Base CC {r.ss.baseCCMensual.toFixed(2)}€ · Líquido {r.payslip.liquidoTotal.toFixed(2)}€
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {r.ss.warnings.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700">
                                {r.ss.warnings.length} aviso SS
                              </Badge>
                            )}
                            {r.irpf.limitations.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700">
                                <Info className="h-2.5 w-2.5" />
                              </Badge>
                            )}
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* ── Selected payslip ── */}
            {selectedResult && (
              <>
                <Separator />
                <PayslipViewerPanel payslip={selectedResult.payslip} />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CheckRow({ check }: { check: LegalPreCloseCheck }) {
  const icon = check.passed
    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
    : check.severity === 'error'
      ? <XCircle className="h-3.5 w-3.5 text-destructive" />
      : check.severity === 'warning'
        ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        : <Info className="h-3.5 w-3.5 text-blue-600" />;

  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1">
        <span className="font-medium">{check.label}</span>
        {check.legalReference && <span className="text-muted-foreground ml-1">({check.legalReference})</span>}
        <p className="text-muted-foreground">{check.detail}</p>
      </div>
    </div>
  );
}
