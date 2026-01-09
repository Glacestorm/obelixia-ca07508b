import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  AlertCircle,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VerticalAgentTask, TaskStatus } from '@/hooks/admin/verticals/agents/useVerticalAgent';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentTaskMonitorProps {
  tasks: VerticalAgentTask[];
  pendingApprovals: VerticalAgentTask[];
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pendiente' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Ejecutando' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completada' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Fallida' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelada' },
  requires_approval: { icon: AlertCircle, color: 'text-yellow-500', label: 'Requiere aprobación' },
};

export function AgentTaskMonitor({
  tasks,
  pendingApprovals,
  onApprove,
  onReject,
}: AgentTaskMonitorProps) {
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  const handleReject = async (taskId: string) => {
    if (!rejectReason.trim()) return;
    await onReject(taskId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Pending approvals section */}
      {pendingApprovals.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border-b">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Acciones pendientes de aprobación
          </h3>
          <div className="space-y-2">
            {pendingApprovals.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-background border border-yellow-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{task.taskType}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                    Prioridad {task.priority}
                  </Badge>
                </div>

                {task.taskDescription && (
                  <p className="text-xs text-muted-foreground mb-3">{task.taskDescription}</p>
                )}

                {rejectingId === task.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Razón del rechazo..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(task.id)}
                        disabled={!rejectReason.trim()}
                      >
                        Confirmar rechazo
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="gap-1"
                      onClick={() => onApprove(task.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Aprobar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1"
                      onClick={() => setRejectingId(task.id)}
                    >
                      <XCircle className="h-3 w-3" />
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          {(['all', 'running', 'completed', 'failed'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filter === status ? 'default' : 'ghost'}
              className="h-7 text-xs"
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'Todas' : STATUS_CONFIG[status].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No hay tareas</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const config = STATUS_CONFIG[task.status];
              const Icon = config.icon;
              const isExpanded = expandedTask === task.id;

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        "h-5 w-5",
                        config.color,
                        task.status === 'running' && 'animate-spin'
                      )} />
                      <div>
                        <p className="font-medium text-sm">{task.taskType}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.confidenceScore && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(task.confidenceScore * 100)}%
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {task.taskDescription && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Descripción</p>
                          <p className="text-sm">{task.taskDescription}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Parámetros</p>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(task.inputParams, null, 2)}
                        </pre>
                      </div>

                      {task.outputResult && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Resultado</p>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(task.outputResult, null, 2)}
                          </pre>
                        </div>
                      )}

                      {task.errorMessage && (
                        <div className="p-2 bg-destructive/10 rounded">
                          <p className="text-xs text-destructive">{task.errorMessage}</p>
                        </div>
                      )}

                      {task.executionTimeMs && (
                        <p className="text-xs text-muted-foreground">
                          Tiempo de ejecución: {task.executionTimeMs}ms
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default AgentTaskMonitor;
