/**
 * HRCCAlertsAndBlockersCard — Phase 1.
 * Shows aggregated counts (real, derived from sections), but the ranked
 * Top-5 risks/actions are deferred to Phase 3.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { HRCommandCenterData } from '@/hooks/erp/hr/useHRCommandCenter';

interface Props {
  data: HRCommandCenterData;
  onOpenAlerts?: () => void;
}

export function HRCCAlertsAndBlockersCard({ data, onOpenAlerts }: Props) {
  const totalBlockers = data.globalReadiness.blockers;
  const totalWarnings = data.globalReadiness.warnings;
  return (
    <Card data-testid="hr-cc-alerts">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Alertas & bloqueos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={totalBlockers > 0 ? 'destructive' : 'muted'}>
              {totalBlockers} bloqueos
            </Badge>
            <Badge variant={totalWarnings > 0 ? 'warning' : 'muted'}>
              {totalWarnings} avisos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground" data-testid="hr-cc-alerts-disclaimer">
          {data.alerts.disclaimer}
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-[11px] uppercase text-muted-foreground">Top 5 riesgos del mes</p>
            <p className="text-xs text-muted-foreground">Disponible en Fase 3</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-[11px] uppercase text-muted-foreground">Top 5 acciones para cerrar</p>
            <p className="text-xs text-muted-foreground">Disponible en Fase 3</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenAlerts}
          disabled={!onOpenAlerts}
          title={onOpenAlerts ? undefined : 'Navegación no disponible en esta vista'}
        >
          Ver detalle
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCAlertsAndBlockersCard;