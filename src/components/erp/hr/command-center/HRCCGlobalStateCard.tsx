/**
 * HRCCGlobalStateCard — Phase 1 (real data from useHRExecutiveData).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import type { GlobalStateSnapshot, ReadinessLevel } from '@/hooks/erp/hr/useHRCommandCenter';

const variantMap: Record<ReadinessLevel, 'success' | 'warning' | 'destructive' | 'muted'> = {
  green: 'success', amber: 'warning', red: 'destructive', gray: 'muted',
};
const labelMap: Record<ReadinessLevel, string> = {
  green: 'Listo', amber: 'Revisión', red: 'Bloqueado', gray: 'Sin datos',
};

interface Props {
  snapshot: GlobalStateSnapshot;
  onOpenEmployees?: () => void;
}

export function HRCCGlobalStateCard({ snapshot, onOpenEmployees }: Props) {
  const fmt = (v: number | null) => (v === null ? '—' : v.toString());
  return (
    <Card data-testid="hr-cc-global">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            Estado global RRHH
          </CardTitle>
          <Badge variant={variantMap[snapshot.level]}>{labelMap[snapshot.level]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Activos" value={fmt(snapshot.activeEmployees)} />
          <Metric label="En baja" value={fmt(snapshot.onLeave)} />
          <Metric label="Altas mes" value={fmt(snapshot.newHiresMonth)} />
          <Metric label="Bajas mes" value={fmt(snapshot.departuresMonth)} />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenEmployees}
          disabled={!onOpenEmployees}
          title={onOpenEmployees ? undefined : 'Navegación no disponible en esta vista'}
        >
          Ver empleados
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md border bg-muted/20 p-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}

export default HRCCGlobalStateCard;