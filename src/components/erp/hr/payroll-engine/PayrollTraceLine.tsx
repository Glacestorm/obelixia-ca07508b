/**
 * PayrollTraceLine — Expandable calculation_trace per payroll line
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculationTrace {
  rule: string;
  inputs: Record<string, unknown>;
  formula: string;
  timestamp: string;
}

interface Props {
  conceptCode: string;
  conceptName: string;
  amount: number;
  lineType: string;
  trace?: CalculationTrace | null;
  incidentRef?: string | null;
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayrollTraceLine({ conceptCode, conceptName, amount, lineType, trace, incidentRef }: Props) {
  const [expanded, setExpanded] = useState(false);

  const colorClass = lineType === 'earning'
    ? ''
    : lineType === 'deduction'
      ? 'text-destructive'
      : lineType === 'employer_cost'
        ? 'text-muted-foreground'
        : 'text-blue-600';

  const prefix = lineType === 'deduction' ? '-' : '';

  return (
    <div className="border rounded transition-colors hover:bg-muted/30">
      <div
        className="flex items-center justify-between p-2 text-sm cursor-pointer"
        onClick={() => trace && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {trace ? (
            expanded
              ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span className="font-medium truncate">{conceptName}</span>
          <span className="text-[10px] text-muted-foreground">{conceptCode}</span>
          {incidentRef && (
            <span className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded font-mono">
              {incidentRef}
            </span>
          )}
        </div>
        <span className={cn('font-mono shrink-0', colorClass)}>
          {prefix}{fmt(amount)} €
        </span>
      </div>

      {expanded && trace && (
        <div className="px-2 pb-2 pt-0 ml-5 border-t">
          <div className="bg-muted/50 rounded p-2 space-y-1 text-[11px]">
            <div className="flex items-center gap-1 text-primary font-medium">
              <Calculator className="h-3 w-3" />
              Traza de cálculo
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <span className="text-muted-foreground">Regla:</span>
              <span className="font-mono">{trace.rule}</span>
              <span className="text-muted-foreground">Fórmula:</span>
              <span className="font-mono">{trace.formula}</span>
              {Object.keys(trace.inputs).length > 0 && (
                <>
                  <span className="text-muted-foreground">Inputs:</span>
                  <span className="font-mono">
                    {Object.entries(trace.inputs).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
