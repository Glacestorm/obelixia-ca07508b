/**
 * PayrollRunDiffCard — Comparación visual entre dos payroll runs
 * Muestra deltas de totales, empleados y warnings/errores
 * Reutilizable en HRPayrollRunsPanel y HRPayrollRecalculationPanel
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus, TrendingUp, Users, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PayrollRunDiffSummary } from '@/engines/erp/hr/payrollRunEngine';

interface Props {
  diff: PayrollRunDiffSummary | null | undefined;
  currentRunLabel?: string;
  previousRunLabel?: string;
  compact?: boolean;
}

function DiffArrow({ value }: { value: number }) {
  if (value > 0) return <ArrowUp className="h-3 w-3 text-emerald-600" />;
  if (value < 0) return <ArrowDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function eurFmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function pct(current: number, diff: number) {
  const prev = current - diff;
  if (prev === 0) return diff !== 0 ? '∞' : '0%';
  const p = (diff / Math.abs(prev)) * 100;
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
}

export function PayrollRunDiffCard({ diff, currentRunLabel, previousRunLabel, compact = false }: Props) {
  if (!diff) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-xs text-muted-foreground">
          Sin comparativa con ejecución anterior
        </CardContent>
      </Card>
    );
  }

  const prevLabel = previousRunLabel || `Run #${diff.previous_run_number}`;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/30 border">
        <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground">vs {prevLabel}:</span>
        <div className="flex items-center gap-1">
          <DiffArrow value={diff.diff_net} />
          <span className={cn(
            'font-mono font-medium',
            diff.diff_net > 0 && 'text-emerald-600',
            diff.diff_net < 0 && 'text-destructive'
          )}>
            {diff.diff_net > 0 ? '+' : ''}{eurFmt(diff.diff_net)} neto
          </span>
        </div>
        {(diff.employees_added > 0 || diff.employees_removed > 0) && (
          <span className="text-muted-foreground">
            {diff.employees_added > 0 && `+${diff.employees_added}`}
            {diff.employees_removed > 0 && ` -${diff.employees_removed}`} emp.
          </span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Comparativa vs {prevLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Summary deltas */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Δ Bruto', value: diff.diff_gross },
            { label: 'Δ Neto', value: diff.diff_net },
            { label: 'Δ Coste Emp.', value: diff.diff_employer_cost },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-lg border bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <div className="flex items-center justify-center gap-1">
                <DiffArrow value={value} />
                <span className={cn(
                  'text-sm font-bold font-mono',
                  value > 0 && 'text-emerald-600',
                  value < 0 && 'text-destructive'
                )}>
                  {value > 0 ? '+' : ''}{eurFmt(value)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Employee changes */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{diff.employees_changed} mantenidos</span>
          </div>
          {diff.employees_added > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-500/30">
              +{diff.employees_added} añadidos
            </Badge>
          )}
          {diff.employees_removed > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
              -{diff.employees_removed} eliminados
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PayrollRunDiffCard;
