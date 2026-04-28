/**
 * HRCCPayrollReadinessCard — Phase 1.
 * Real data via usePayrollPreflight aggregated upstream.
 * Honesty: never green if blockers > 0 or no data.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { PayrollSnapshot, ReadinessLevel } from '@/hooks/erp/hr/useHRCommandCenter';

const variantMap: Record<ReadinessLevel, 'success' | 'warning' | 'destructive' | 'muted'> = {
  green: 'success', amber: 'warning', red: 'destructive', gray: 'muted',
};
const labelMap: Record<ReadinessLevel, string> = {
  green: 'Listo', amber: 'Revisión', red: 'Bloqueado', gray: 'Sin datos',
};

const closableLabel: Record<PayrollSnapshot['closableState'], { label: string; icon: any; tone: string }> = {
  closable: { label: 'Cerrable', icon: CheckCircle2, tone: 'text-success' },
  closable_with_warnings: { label: 'Cerrable con avisos', icon: AlertTriangle, tone: 'text-warning' },
  blocked: { label: 'Bloqueado', icon: ShieldAlert, tone: 'text-destructive' },
  unknown: { label: 'Sin determinar', icon: AlertTriangle, tone: 'text-muted-foreground' },
};

interface Props {
  snapshot: PayrollSnapshot;
  onOpenPayroll?: () => void;
}

export function HRCCPayrollReadinessCard({ snapshot, onOpenPayroll }: Props) {
  const closable = closableLabel[snapshot.closableState];
  const Icon = closable.icon;
  return (
    <Card data-testid="hr-cc-payroll">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4 text-primary" />
            Nómina · Preflight
          </CardTitle>
          <Badge variant={variantMap[snapshot.level]} data-testid="hr-cc-payroll-badge">
            {labelMap[snapshot.level]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className={`flex items-center gap-2 ${closable.tone}`}>
          <Icon className="h-4 w-4" />
          <span className="font-medium" data-testid="hr-cc-payroll-closable">{closable.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/20 p-2">
            <span className="text-[11px] uppercase text-muted-foreground">Bloqueos</span>
            <p className="text-base font-semibold">{snapshot.blockers}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <span className="text-[11px] uppercase text-muted-foreground">Avisos</span>
            <p className="text-base font-semibold">{snapshot.warnings}</p>
          </div>
        </div>
        {!snapshot.hasData && (
          <p className="text-xs text-muted-foreground">
            Sin datos de preflight para el periodo actual.
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenPayroll}
          disabled={!onOpenPayroll}
          title={onOpenPayroll ? undefined : 'Navegación no disponible en esta vista'}
        >
          Abrir nóminas del periodo
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCPayrollReadinessCard;