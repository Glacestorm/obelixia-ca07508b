/**
 * TaskDetail — Slide-over detail panel for a task
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, Clock, AlertTriangle, ArrowUpCircle,
  User, Calendar, Link2, Tag, Zap
} from 'lucide-react';
import type { HRTask } from '@/hooks/erp/hr/useHRTasksEngine';

interface Props {
  task: HRTask;
  engine: ReturnType<typeof import('@/hooks/erp/hr/useHRTasksEngine').useHRTasksEngine>;
  onClose: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-700',
  high: 'bg-amber-500/15 text-amber-700',
  medium: 'bg-blue-500/15 text-blue-700',
  low: 'bg-muted text-muted-foreground',
};

export function TaskDetail({ task, engine, onClose }: Props) {
  const isActive = task.status === 'pending' || task.status === 'in_progress';

  return (
    <div className="space-y-5 mt-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-snug">{task.title}</h3>
          <Badge variant="outline" className={PRIORITY_STYLES[task.priority]}>
            {task.priority}
          </Badge>
        </div>
        {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
      </div>

      {/* Status & Category */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
          {task.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> :
           task.status === 'in_progress' ? <ArrowUpCircle className="h-3 w-3 mr-1" /> :
           <Clock className="h-3 w-3 mr-1" />}
          {task.status}
        </Badge>
        <Badge variant="outline">{task.category}</Badge>
        {task.sla_breached && <Badge variant="destructive">SLA Vencido</Badge>}
        {task.escalated && <Badge variant="destructive" className="gap-1"><Zap className="h-3 w-3" /> Escalada</Badge>}
        {task.source_type && <Badge variant="outline">Origen: {task.source_type}</Badge>}
      </div>

      <Separator />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {task.assigned_to && (
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Asignado a</p>
            <p className="font-medium">{task.assigned_to.slice(0, 8)}...</p>
          </div>
        )}
        {task.assigned_role && (
          <div>
            <p className="text-muted-foreground">Rol asignado</p>
            <p className="font-medium">{task.assigned_role}</p>
          </div>
        )}
        {task.due_date && (
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Vencimiento</p>
            <p className="font-medium">{new Date(task.due_date).toLocaleDateString('es-ES')}</p>
          </div>
        )}
        {task.sla_deadline && (
          <div>
            <p className="text-muted-foreground">SLA Deadline</p>
            <p className="font-medium">{new Date(task.sla_deadline).toLocaleString('es-ES')}</p>
          </div>
        )}
        {task.sla_hours && (
          <div>
            <p className="text-muted-foreground">SLA (horas)</p>
            <p className="font-medium">{task.sla_hours}h</p>
          </div>
        )}
        {task.escalation_to && (
          <div>
            <p className="text-muted-foreground">Escalar a</p>
            <p className="font-medium">{task.escalation_to}</p>
          </div>
        )}
      </div>

      {/* Source / Origin context — V2-ES.2 Paso 3 */}
      {(task.source_type || task.related_entity_type || task.workflow_instance_id) && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><Zap className="h-3 w-3" /> Origen de la tarea</p>
            <div className="space-y-1 text-sm">
              {task.source_type && (
                <p className="text-muted-foreground">
                  Fuente: <span className="font-medium text-foreground">{SOURCE_TYPE_LABELS[task.source_type] || task.source_type}</span>
                </p>
              )}
              {task.related_entity_type && task.related_entity_id && (
                <p className="text-muted-foreground">
                  {ENTITY_TYPE_LABELS[task.related_entity_type] || task.related_entity_type}: <span className="font-medium text-foreground">{task.related_entity_id.slice(0, 8)}...</span>
                </p>
              )}
              {task.workflow_instance_id && (
                <p className="text-muted-foreground">
                  Workflow: <span className="font-medium text-foreground">{task.workflow_instance_id.slice(0, 8)}...</span>
                </p>
              )}
              {task.source_id && task.source_id !== task.related_entity_id && (
                <p className="text-muted-foreground">
                  Ref. origen: <span className="font-medium text-foreground">{task.source_id.slice(0, 8)}...</span>
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Related entities */}
      {(task.employee_id || task.contract_id || task.payroll_record_id || task.submission_id || task.assignment_id) && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><Link2 className="h-3 w-3" /> Entidades relacionadas</p>
            <div className="space-y-1 text-sm">
              {task.employee_id && <p className="text-muted-foreground">Empleado: {task.employee_id.slice(0, 8)}...</p>}
              {task.contract_id && <p className="text-muted-foreground">Contrato: {task.contract_id.slice(0, 8)}...</p>}
              {task.payroll_record_id && <p className="text-muted-foreground">Nómina: {task.payroll_record_id.slice(0, 8)}...</p>}
              {task.submission_id && <p className="text-muted-foreground">Envío: {task.submission_id.slice(0, 8)}...</p>}
              {task.assignment_id && <p className="text-muted-foreground">Movilidad: {task.assignment_id.slice(0, 8)}...</p>}
            </div>
          </div>
        </>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {task.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
          </div>
        </>
      )}

      {/* Timestamps */}
      <Separator />
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Creada: {new Date(task.created_at).toLocaleString('es-ES')}</p>
        {task.completed_at && <p>Completada: {new Date(task.completed_at).toLocaleString('es-ES')}</p>}
        {task.escalation_at && <p>Escalada: {new Date(task.escalation_at).toLocaleString('es-ES')}</p>}
      </div>

      {/* Actions */}
      {isActive && (
        <>
          <Separator />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { engine.completeTask(task.id); onClose(); }}>
              <CheckCircle className="h-4 w-4 mr-1" /> Completar
            </Button>
            {task.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => engine.updateTask(task.id, { status: 'in_progress' as any })}>
                En curso
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => engine.escalateTask(task.id)}>
              <Zap className="h-4 w-4 mr-1" /> Escalar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
