import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  RotateCcw,
  Eye
} from 'lucide-react';
import { useCRMWorkflows } from '@/hooks/crm/workflows';
import { useCRMWorkflowExecutor } from '@/hooks/crm/workflows';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending: { label: 'Pendiente', icon: Clock, color: 'text-gray-500' },
  running: { label: 'Ejecutando', icon: Activity, color: 'text-blue-500' },
  completed: { label: 'Completado', icon: CheckCircle, color: 'text-emerald-500' },
  failed: { label: 'Fallido', icon: XCircle, color: 'text-red-500' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-amber-500' },
  paused: { label: 'Pausado', icon: Pause, color: 'text-gray-500' }
};

export function WorkflowExecutionHistory() {
  const [search, setSearch] = useState('');
  const { workflows, executions, isLoading } = useCRMWorkflows();
  const { retryExecution, cancelExecution, resumeExecution } = useCRMWorkflowExecutor();

  const filteredExecutions = executions.filter(e => {
    const workflow = workflows.find(w => w.id === e.workflow_id);
    return workflow?.name.toLowerCase().includes(search.toLowerCase()) ||
           e.status.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ejecuciones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Executions List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredExecutions.map((execution) => {
            const workflow = workflows.find(w => w.id === execution.workflow_id);
            const statusConfig = STATUS_CONFIG[execution.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={execution.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-full bg-muted', statusConfig.color)}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {workflow?.name || 'Workflow desconocido'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(execution.started_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(execution.started_at), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </span>
                          {execution.completed_at && (
                            <>
                              <span>•</span>
                              <span>
                                Duración: {Math.round(
                                  (new Date(execution.completed_at).getTime() - 
                                   new Date(execution.started_at).getTime()) / 1000
                                )}s
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', statusConfig.color)}
                      >
                        {statusConfig.label}
                      </Badge>

                      {execution.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => retryExecution(execution.id)}
                          title="Reintentar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}

                      {execution.status === 'running' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => cancelExecution(execution.id)}
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}

                      {execution.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => resumeExecution(execution.id)}
                          title="Reanudar"
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {execution.error_message && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      {execution.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {filteredExecutions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay ejecuciones registradas</p>
        </div>
      )}
    </div>
  );
}
