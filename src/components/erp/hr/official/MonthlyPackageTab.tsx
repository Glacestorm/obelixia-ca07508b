/**
 * MonthlyPackageTab — V2-RRHH-P4D
 * Container that wires useMonthlyOfficialPackage to MonthlyOfficialPackagePanel.
 * P4D: + real payrollSummary from DB aggregation + honest fallback
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Package, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyOfficialPackagePanel } from './MonthlyOfficialPackagePanel';
import { useMonthlyOfficialPackage } from '@/hooks/erp/hr/useMonthlyOfficialPackage';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  companyName?: string;
  className?: string;
}

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface PayrollSummary {
  totalBruto: number;
  totalNeto: number;
  totalSSEmpresa: number;
  totalSSTrabajador: number;
  totalIRPF: number;
  totalBasesCC: number;
  totalBasesAT: number;
  employeeCount: number;
}

export function MonthlyPackageTab({ companyId, companyName, className }: Props) {
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth()); // 0-indexed for UI

  const periodMonth1 = periodMonth + 1; // 1-indexed for queries

  // ── Fetch real payroll period data for this month ──
  const { data: payrollPeriodData, isLoading: isLoadingPayroll } = useQuery({
    queryKey: ['hr-payroll-period-summary', companyId, periodYear, periodMonth1],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      // Find the payroll period for this month
      const { data: periods } = await sb
        .from('hr_payroll_periods')
        .select('id, status, total_gross, total_net, total_employer_cost, employee_count, closed_at')
        .eq('company_id', companyId)
        .eq('fiscal_year', periodYear)
        .eq('period_number', periodMonth1)
        .order('created_at', { ascending: false })
        .limit(1);

      const period = periods?.[0] as {
        id: string;
        status: string;
        total_gross: number;
        total_net: number;
        total_employer_cost: number;
        employee_count: number;
        closed_at: string | null;
      } | undefined;

      if (!period) return null;

      // Fetch aggregated line data for SS/IRPF breakdowns
      const { data: records } = await sb
        .from('hr_payroll_records')
        .select('id, gross_salary, net_salary, total_deductions, employer_cost, calculation_details')
        .eq('payroll_period_id', period.id)
        .limit(500);

      const recs = (records ?? []) as Array<{
        id: string;
        gross_salary: number;
        net_salary: number;
        total_deductions: number;
        employer_cost: number;
        calculation_details: Record<string, unknown> | null;
      }>;

      // Aggregate from calculation_details.bases (PayslipData structure)
      let totalSSEmpresa = 0;
      let totalSSTrabajador = 0;
      let totalIRPF = 0;
      let totalBasesCC = 0;
      let totalBasesAT = 0;

      for (const r of recs) {
        const d = r.calculation_details;
        if (d && typeof d === 'object') {
          // PayslipData stores SS data under .bases
          const bases = (d as Record<string, unknown>).bases as Record<string, number> | undefined;
          if (bases) {
            totalSSEmpresa += Number(bases.totalCotizacionesEmpresa ?? 0);
            totalSSTrabajador += Number(bases.totalCotizacionesTrabajador ?? 0);
            totalBasesCC += Number(bases.baseCotizacionCC ?? 0);
            totalBasesAT += Number(bases.baseCotizacionAT ?? 0);
          }
          // IRPF is in deducciones or totalDeducciones
          const deducciones = (d as Record<string, unknown>).deducciones as Array<{ concepto?: string; importe?: number }> | undefined;
          if (deducciones) {
            const irpfLine = deducciones.find(dd => dd.concepto?.startsWith('IRPF'));
            if (irpfLine) totalIRPF += Number(irpfLine.importe ?? 0);
          }
        }
      }

      return {
        period,
        summary: {
          totalBruto: period.total_gross ?? recs.reduce((s, r) => s + r.gross_salary, 0),
          totalNeto: period.total_net ?? recs.reduce((s, r) => s + r.net_salary, 0),
          totalSSEmpresa,
          totalSSTrabajador,
          totalIRPF,
          totalBasesCC,
          totalBasesAT,
          employeeCount: period.employee_count ?? recs.length,
        } as PayrollSummary,
        periodClosed: period.status === 'closed' || period.status === 'locked',
        hasDetailedData: recs.some(r => r.calculation_details != null),
      };
    },
    enabled: !!companyId && !!periodYear,
  });

  const payrollSummary = payrollPeriodData?.summary ?? null;
  const periodClosed = payrollPeriodData?.periodClosed ?? false;
  const hasDetailedData = payrollPeriodData?.hasDetailedData ?? false;

  const { pkg, crossValidation, isLoading, error, refresh } = useMonthlyOfficialPackage(
    companyId,
    companyName ?? 'Empresa',
    periodYear,
    periodMonth1,
    payrollSummary,
    periodClosed,
  );

  const years = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Period selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Paquete Oficial Mensual</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading || isLoadingPayroll}>
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', (isLoading || isLoadingPayroll) && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-3">
            <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(periodMonth)} onValueChange={(v) => setPeriodMonth(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_LABELS.map((label, i) => (
                  <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(isLoading || isLoadingPayroll) && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Cargando…
              </Badge>
            )}
          </div>

          {/* Payroll data status indicator */}
          <div className={cn(
            'flex items-center gap-2 p-2 rounded-md border text-xs',
            payrollSummary
              ? hasDetailedData
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700'
                : 'bg-amber-500/5 border-amber-500/20 text-amber-700'
              : 'bg-muted/50 border-border text-muted-foreground'
          )}>
            <Info className="h-3.5 w-3.5 shrink-0" />
            {payrollSummary ? (
              hasDetailedData ? (
                <span>
                  Datos de nómina disponibles: {payrollSummary.employeeCount} empleados,
                  bruto total {payrollSummary.totalBruto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  {periodClosed ? ' — período cerrado' : ' — período abierto'}
                </span>
              ) : (
                <span>
                  Datos de nómina parciales (sin desglose SS/IRPF detallado).
                  La validación cruzada puede ser limitada.
                </span>
              )
            ) : (
              <span>
                No hay datos de nómina para {MONTH_LABELS[periodMonth]} {periodYear}.
                La validación cruzada no incluirá comparativas de payroll.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package panel */}
      {pkg ? (
        <MonthlyOfficialPackagePanel pkg={pkg} />
      ) : !isLoading && !isLoadingPayroll ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay datos disponibles para {MONTH_LABELS[periodMonth]} {periodYear}.</p>
            <p className="text-xs mt-1">Genera artefactos oficiales en la pestaña correspondiente.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default MonthlyPackageTab;
