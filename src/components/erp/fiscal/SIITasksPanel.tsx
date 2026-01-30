/**
 * SII Tasks Panel - Panel de tareas de corrección
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ListTodo,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { SIITask, SIITaskStatus } from '@/hooks/erp/useERPSII';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SIITasksPanelProps {
  tasks: SIITask[];
  onUpdateStatus: (taskId: string, status: SIITaskStatus) => Promise<boolean>;
}

const PRIORITY_CONFIG = {
  low: { label: 'Baja', color: 'bg-gray-500/10 text-gray-600' },
  medium: { label: 'Media', color: 'bg-blue-500/10 text-blue-600' },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600' },
  urgent: { label: 'Urgente', color: 'bg-red-500/10 text-red-600' },
};

const STATUS_CONFIG = {
  open: { label: 'Abierta', color: 'bg-yellow-500/10 text-yellow-600', icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/10 text-blue-600', icon: <ArrowRight className="h-4 w-4" /> },
  done: { label: 'Completada', color: 'bg-green-500/10 text-green-600', icon: <CheckCircle className="h-4 w-4" /> },
};

export function SIITasksPanel({ tasks, onUpdateStatus }: SIITasksPanelProps) {
  const openTasks = tasks.filter(t => t.status === 'open');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const renderTask = (task: SIITask) => {
    const priorityConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
    const statusConf = STATUS_CONFIG[task.status];

    return (
      <Card key={task.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn("text-xs", priorityConf.color)}>
                  {priorityConf.label}
                </Badge>
                {task.error_code && (
                  <Badge variant="outline" className="text-xs">
                    Código: {task.error_code}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Creada {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Select
                value={task.status}
                onValueChange={(value) => onUpdateStatus(task.id, value as SIITaskStatus)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Abierta
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      En progreso
                    </div>
                  </SelectItem>
                  <SelectItem value="done">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Completada
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Open Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            Abiertas ({openTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {openTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay tareas abiertas</p>
              </div>
            ) : (
              openTasks.map(renderTask)
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* In Progress Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-500/10">
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </div>
            En progreso ({inProgressTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {inProgressTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay tareas en progreso</p>
              </div>
            ) : (
              inProgressTasks.map(renderTask)
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Done Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            Completadas ({doneTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {doneTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay tareas completadas</p>
              </div>
            ) : (
              doneTasks.map(renderTask)
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default SIITasksPanel;
