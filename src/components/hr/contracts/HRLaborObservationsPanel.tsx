/**
 * HRLaborObservationsPanel — Observaciones laborales
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquareText, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useHRLaborObservations, type HRLaborObservation } from '@/hooks/hr/useHRLaborObservations';
import { OBSERVATION_LABELS, type ObservationType } from '@/lib/hr/contractEngine';
import { cn } from '@/lib/utils';

const obsStatusCfg: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierta', color: 'bg-amber-500/10 text-amber-600' },
  in_progress: { label: 'En curso', color: 'bg-primary/10 text-primary' },
  resolved: { label: 'Resuelta', color: 'bg-green-500/10 text-green-700' },
  cancelled: { label: 'Anulada', color: 'bg-muted text-muted-foreground' },
};

function ObservationRow({ obs }: { obs: HRLaborObservation }) {
  const cfg = obsStatusCfg[obs.status] || obsStatusCfg.open;
  const typeLabel = OBSERVATION_LABELS[obs.observation_type as ObservationType] || obs.observation_type;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{obs.title}</span>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[9px]">{typeLabel}</Badge>
        {obs.effective_date && (
          <span className="text-[10px] text-muted-foreground">Efectiva: {obs.effective_date}</span>
        )}
      </div>
      {obs.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{obs.description}</p>
      )}
      {obs.resolution_notes && (
        <p className="text-xs text-green-700 dark:text-green-400">
          <CheckCircle className="h-3 w-3 inline mr-1" />
          {obs.resolution_notes}
        </p>
      )}
    </div>
  );
}

export function HRLaborObservationsPanel() {
  const { observations, isLoading, refetch } = useHRLaborObservations();
  const open = observations.filter(o => o.status === 'open');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <MessageSquareText className="h-4 w-4 text-amber-600" />
            </div>
            Observaciones Laborales
            {open.length > 0 && (
              <Badge variant="destructive" className="text-[10px] ml-1">{open.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[350px]">
          {observations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay observaciones registradas
            </div>
          ) : (
            <div className="space-y-2">
              {observations.map(obs => <ObservationRow key={obs.id} obs={obs} />)}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRLaborObservationsPanel;
