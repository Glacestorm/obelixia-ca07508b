/**
 * PayrollDiffPanel — Shows diff_vs_previous comparison inside record detail
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiffVsPrevious } from '@/hooks/erp/hr/useESPayrollBridge';

interface Props {
  diff: DiffVsPrevious | null | undefined;
}

function DiffArrow({ value }: { value: number }) {
  if (value > 0) return <ArrowUp className="h-3 w-3 text-emerald-600" />;
  if (value < 0) return <ArrowDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function PayrollDiffPanel({ diff }: Props) {
  if (!diff) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-xs text-muted-foreground">
          Sin comparativa con período anterior
        </CardContent>
      </Card>
    );
  }

  const grossPct = diff.previous_gross > 0
    ? ((diff.diff_gross / diff.previous_gross) * 100)
    : 0;
  const netPct = diff.previous_net > 0
    ? ((diff.diff_net / diff.previous_net) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Comparativa vs período anterior
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Summary deltas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg border bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Δ Bruto</p>
            <div className="flex items-center gap-1">
              <DiffArrow value={diff.diff_gross} />
              <span className={cn(
                'text-sm font-bold font-mono',
                diff.diff_gross > 0 && 'text-emerald-600',
                diff.diff_gross < 0 && 'text-destructive'
              )}>
                {diff.diff_gross > 0 ? '+' : ''}{fmt(diff.diff_gross)} €
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{pct(grossPct)}</p>
          </div>
          <div className="p-2 rounded-lg border bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Δ Neto</p>
            <div className="flex items-center gap-1">
              <DiffArrow value={diff.diff_net} />
              <span className={cn(
                'text-sm font-bold font-mono',
                diff.diff_net > 0 && 'text-emerald-600',
                diff.diff_net < 0 && 'text-destructive'
              )}>
                {diff.diff_net > 0 ? '+' : ''}{fmt(diff.diff_net)} €
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{pct(netPct)}</p>
          </div>
        </div>

        {/* Line-level diffs */}
        {diff.line_diffs && diff.line_diffs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detalle por concepto</p>
            {diff.line_diffs
              .filter(ld => ld.diff_amount !== 0)
              .map((ld, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded border">
                  <span className="truncate max-w-[180px]">{ld.concept_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{fmt(ld.previous_amount)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono">{fmt(ld.current_amount)}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 font-mono',
                        ld.diff_amount > 0 && 'text-emerald-600 border-emerald-500/30',
                        ld.diff_amount < 0 && 'text-destructive border-destructive/30'
                      )}
                    >
                      {ld.diff_amount > 0 ? '+' : ''}{fmt(ld.diff_amount)}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
