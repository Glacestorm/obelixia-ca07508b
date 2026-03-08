import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowRight, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useEnergyWorkflow, WORKFLOW_STATUSES, WorkflowStatus } from '@/hooks/erp/useEnergyWorkflow';
import { useEnergyAuditLog } from '@/hooks/erp/useEnergyAuditLog';
import { PermissionGate } from './PermissionGate';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { caseId: string; companyId: string; }

export function CaseWorkflowTab({ caseId, companyId }: Props) {
  const { history, currentStatus, loading, error, transition, getAvailableTransitions } = useEnergyWorkflow(caseId);
  const { log } = useEnergyAuditLog(companyId, caseId);
  const [showTransition, setShowTransition] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<WorkflowStatus | ''>('');
  const [comments, setComments] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const available = getAvailableTransitions();
  const currentInfo = WORKFLOW_STATUSES[currentStatus];

  const handleTransition = useCallback(async () => {
    if (!selectedStatus) return;
    setTransitioning(true);
    await transition(selectedStatus as WorkflowStatus, comments, log);
    setTransitioning(false);
    setShowTransition(false);
    setSelectedStatus('');
    setComments('');
  }, [selectedStatus, comments, transition, log]);

  const allStatuses = Object.entries(WORKFLOW_STATUSES).sort((a, b) => a[1].order - b[1].order);
  const currentOrder = currentInfo.order;

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Workflow de cambio
              </CardTitle>
              <CardDescription>Estado actual del proceso de cambio de comercializadora</CardDescription>
            </div>
            <Badge className={cn("text-white", currentInfo.color)}>{currentInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando workflow...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                {allStatuses.filter(([k]) => k !== 'cancelado').map(([key, info]) => {
                  const isDone = info.order < currentOrder;
                  const isCurrent = key === currentStatus;
                  const isFuture = info.order > currentOrder;
                  return (
                    <div key={key} className="flex items-center gap-1 shrink-0">
                      <div className={cn(
                        "h-3 w-3 rounded-full border-2 transition-all",
                        isDone && "bg-emerald-500 border-emerald-500",
                        isCurrent && `${info.color} border-current scale-125`,
                        isFuture && "bg-muted border-border",
                      )} />
                      <span className={cn(
                        "text-[9px] whitespace-nowrap",
                        isCurrent ? "font-bold text-foreground" : "text-muted-foreground",
                      )}>{info.label}</span>
                      {info.order < 9 && <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <PermissionGate action="edit_cases">
                {available.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {available.map(t => (
                      <Button
                        key={t.status}
                        variant={t.status === 'cancelado' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => { setSelectedStatus(t.status); setShowTransition(true); }}
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                        {t.label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Este expediente está en estado final.</p>
                )}
              </PermissionGate>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de cambios</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin historial. El flujo comenzará cuando se registre el primer cambio de estado.</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-border" />
              {[...history].reverse().map((entry) => {
                const info = WORKFLOW_STATUSES[entry.status as WorkflowStatus] || { label: entry.status, color: 'bg-gray-500' };
                return (
                  <div key={entry.id} className="relative flex items-start gap-3">
                    <div className={cn("absolute -left-3.5 p-1 rounded-full", info.color)}>
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{info.label}</p>
                      {entry.comments && <p className="text-xs text-muted-foreground mt-0.5">"{entry.comments}"</p>}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.changed_at), 'dd MMM yyyy HH:mm', { locale: es })}
                        {' · '}
                        {formatDistanceToNow(new Date(entry.changed_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showTransition} onOpenChange={setShowTransition}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar estado del workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Transición:</p>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-white", currentInfo.color)}>{currentInfo.label}</Badge>
                <ArrowRight className="h-4 w-4" />
                {selectedStatus && (
                  <Badge className={cn("text-white", WORKFLOW_STATUSES[selectedStatus as WorkflowStatus]?.color)}>
                    {WORKFLOW_STATUSES[selectedStatus as WorkflowStatus]?.label}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Comentarios (opcional)</label>
              <Textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Observaciones sobre este cambio..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransition(false)}>Cancelar</Button>
            <Button onClick={handleTransition} disabled={transitioning || !selectedStatus}>
              {transitioning ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando...</> : 'Confirmar cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseWorkflowTab;
