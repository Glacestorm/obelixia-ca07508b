/**
 * TaskDetail — Slide-over detail panel for a task
 * H1.1: UUID→name lookups for employee, assigned_to; copy button for technical IDs
 * S9.11-P3: ProcessDeadlinesSummary for tasks linked to admin requests
 */
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, Clock, AlertTriangle, ArrowUpCircle,
  User, Calendar, Link2, Tag, Zap, Copy
} from 'lucide-react';
import type { HRTask } from '@/hooks/erp/hr/useHRTasksEngine';
import { LinkedDocumentsSection } from '../shared/LinkedDocumentsSection';
import { ProcessDeadlinesSummary } from '../shared/ProcessDeadlinesSummary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  workflow: 'Workflow',
  admin_request: 'Solicitud administrativa',
  system: 'Sistema',
  scheduled: 'Programada',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  admin_request: 'Solicitud',
  payroll_record: 'Nómina',
  contract: 'Contrato',
  employee: 'Empleado',
};

/** Batch-resolve UUIDs to human names */
function useEntityNameResolver(task: HRTask) {
  const [names, setNames] = useState<Record<string, string>>({});

  // Collect all unique IDs that need resolving
  const idsToResolve = useMemo(() => {
    const employeeIds = new Set<string>();
    const profileIds = new Set<string>();

    if (task.employee_id) employeeIds.add(task.employee_id);
    if (task.assigned_to) profileIds.add(task.assigned_to);

    return { employeeIds: [...employeeIds], profileIds: [...profileIds] };
  }, [task.employee_id, task.assigned_to]);

  useEffect(() => {
    const resolve = async () => {
      const resolved: Record<string, string> = {};

      // Resolve employees
      if (idsToResolve.employeeIds.length > 0) {
        const { data } = await supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name')
          .in('id', idsToResolve.employeeIds);
        data?.forEach(e => {
          resolved[e.id] = `${e.first_name} ${e.last_name}`.trim();
        });
      }

      // Resolve profiles (assigned_to is a user_id)
      if (idsToResolve.profileIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', idsToResolve.profileIds);
        data?.forEach(p => {
          resolved[p.id] = p.full_name || p.email || p.id.slice(0, 8);
        });
      }

      setNames(resolved);
    };

    resolve();
  }, [idsToResolve]);

  return names;
}

/** Lightweight: fetch request_type for a linked admin_request (single field, single query) */
function useLinkedRequestType(task: HRTask) {
  const [requestType, setRequestType] = useState<string | null>(null);
  const isLinked = task.related_entity_type === 'admin_request' && !!task.related_entity_id;

  useEffect(() => {
    if (!isLinked) return;
    (supabase as any)
      .from('erp_hr_admin_requests')
      .select('request_type')
      .eq('id', task.related_entity_id!)
      .single()
      .then(({ data }: { data: { request_type?: string } | null }) => {
        if (data?.request_type) setRequestType(data.request_type);
      });
  }, [isLinked, task.related_entity_id]);

  return { requestType, isLinked };
}

function CopyableId({ label, id }: { label: string; id: string }) {
  return (
    <p className="text-muted-foreground flex items-center gap-1">
      {label}: <span className="font-medium text-foreground font-mono text-xs">{id.slice(0, 8)}…</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-0.5"
        onClick={() => { navigator.clipboard.writeText(id); toast.info('ID copiado'); }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </p>
  );
}

export function TaskDetail({ task, engine, onClose }: Props) {
  const isActive = task.status === 'pending' || task.status === 'in_progress';
  const names = useEntityNameResolver(task);
  const { requestType } = useLinkedRequestType(task);

  const resolvedName = (id: string | null | undefined) => {
    if (!id) return null;
    return names[id] || null;
  };

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
            <p className="font-medium">{resolvedName(task.assigned_to) || task.assigned_to.slice(0, 8) + '…'}</p>
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

      {/* Source / Origin context */}
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
                <CopyableId label={ENTITY_TYPE_LABELS[task.related_entity_type] || task.related_entity_type} id={task.related_entity_id} />
              )}
              {task.workflow_instance_id && (
                <CopyableId label="Workflow" id={task.workflow_instance_id} />
              )}
              {task.source_id && task.source_id !== task.related_entity_id && (
                <CopyableId label="Ref. origen" id={task.source_id} />
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
              {task.employee_id && (
                <p className="text-muted-foreground">
                  Empleado: <span className="font-medium text-foreground">{resolvedName(task.employee_id) || task.employee_id.slice(0, 8) + '…'}</span>
                </p>
              )}
              {task.contract_id && <CopyableId label="Contrato" id={task.contract_id} />}
              {task.payroll_record_id && <CopyableId label="Nómina" id={task.payroll_record_id} />}
              {task.submission_id && <CopyableId label="Envío" id={task.submission_id} />}
              {task.assignment_id && <CopyableId label="Movilidad" id={task.assignment_id} />}
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

      {/* V2-ES.3 Paso 2: Linked documents */}
      {task.company_id && (
        <>
          <Separator />
          <LinkedDocumentsSection
            companyId={task.company_id}
            entityType="hr_task"
            entityId={task.id}
            employeeId={task.employee_id}
          />
        </>
      )}

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
