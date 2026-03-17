/**
 * MonthlyPackageTab — V2-RRHH-P4C
 * Container that wires useMonthlyOfficialPackage to MonthlyOfficialPackagePanel.
 * Provides real data from DB + cross-validation runtime.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Package, AlertCircle } from 'lucide-react';
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

export function MonthlyPackageTab({ companyId, companyName, className }: Props) {
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth()); // Previous month as default

  // Note: payrollSummary would come from real payroll data in a full implementation.
  // For now we pass null — the hook handles this gracefully.
  const { pkg, crossValidation, isLoading, error, refresh } = useMonthlyOfficialPackage(
    companyId,
    companyName ?? 'Empresa',
    periodYear,
    periodMonth + 1, // 1-indexed
    null, // payrollSummary — will be wired when payroll closing data is available
    false, // periodClosed
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
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
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
            {isLoading && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Cargando…
              </Badge>
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
      ) : !isLoading ? (
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
