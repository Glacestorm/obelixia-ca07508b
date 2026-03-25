import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Zap,
  Clock,
  Bot,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SemaphoreIndicator } from './SemaphoreIndicator';
import { useApprovalActions } from '@/hooks/erp/ai-center/useApprovalActions';
import type { ApprovalQueueItem } from '@/hooks/erp/ai-center/useAICommandCenter';
import type { SemaphoreColor } from './PriorityCalculator';
import { cn } from '@/lib/utils';

interface ApprovalQueueProps {
  items: ApprovalQueueItem[];
  onRefresh: () => void;
}

const domainColors: Record<string, string> = {
  hr: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  legal: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  crm: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  erp: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  general: 'bg-muted text-muted-foreground border-border',
};

export function ApprovalQueue({ items, onRefresh }: ApprovalQueueProps) {
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [forceDialog, setForceDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { approve, reject, escalate, force } = useApprovalActions(onRefresh);

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    await reject(rejectDialog, rejectReason);
    setRejectDialog(null);
    setRejectReason('');
  };

  const handleForce = async () => {
    if (!forceDialog) return;
    await force(forceDialog);
    setForceDialog(null);
  };

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
          <p className="text-sm font-medium">Cola vacía</p>
          <p className="text-xs text-muted-foreground mt-1">No hay tareas pendientes de aprobación</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Cola de Aprobaciones
            <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[420px]">
            <div className="space-y-0 divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'px-4 py-3 hover:bg-muted/50 transition-colors',
                    item.semaphore === 'red' && 'bg-red-500/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <SemaphoreIndicator color={item.semaphore as SemaphoreColor} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{item.agent_code}</span>
                        <Badge variant="outline" className={cn('text-[10px] h-5', domainColors[item.domain] || domainColors.general)}>
                          {item.domain.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] h-5">{item.task_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.action_required || item.payload_summary || 'Acción pendiente de revisión'}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.created_at), { locale: es, addSuffix: true })}
                        </span>
                        {item.confidence_score != null && (
                          <span>Confianza: {item.confidence_score}%</span>
                        )}
                        <span>Prioridad: {item.priority}/10</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                        title="Aprobar"
                        onClick={() => approve(item.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600 hover:bg-red-500/10"
                        title="Rechazar"
                        onClick={() => setRejectDialog(item.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-yellow-600 hover:bg-yellow-500/10"
                        title="Escalar"
                        onClick={() => escalate(item.id)}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-orange-600 hover:bg-orange-500/10"
                        title="Forzar"
                        onClick={() => setForceDialog(item.id)}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo del rechazo</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Indica el motivo del rechazo..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Dialog */}
      <Dialog open={!!forceDialog} onOpenChange={() => setForceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Forzar ejecución?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto ejecutará la tarea ignorando las validaciones de confianza. Esta acción quedará registrada en el log de auditoría.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleForce}>
              <Zap className="h-4 w-4 mr-1" /> Confirmar forzado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ApprovalQueue;
