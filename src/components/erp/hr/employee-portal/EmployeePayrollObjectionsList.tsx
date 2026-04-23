/**
 * EmployeePayrollObjectionsList — Lista de incidencias del empleado para una nómina (S9.22).
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Loader2, RotateCcw, CheckCircle2, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { usePayrollObjections, type ObjectionStatus } from '@/hooks/erp/hr/usePayrollObjections';
import { usePayrollObjectionEvents, type ObjectionEvent } from '@/hooks/erp/hr/usePayrollObjectionEvents';

interface Props {
  payrollRecordId: string;
  employeeId: string;
  companyId: string;
}

const STATUS_LABEL: Record<ObjectionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Abierta', variant: 'default' },
  in_review: { label: 'En revisión', variant: 'secondary' },
  answered: { label: 'Contestada', variant: 'secondary' },
  closed: { label: 'Cerrada', variant: 'outline' },
  escalated: { label: 'Escalada', variant: 'destructive' },
};

export function EmployeePayrollObjectionsList({ payrollRecordId, employeeId, companyId }: Props) {
  const { items, loading, reopen, closeAsResolved } = usePayrollObjections({ payrollRecordId, employeeId, companyId });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando incidencias…
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> Mis incidencias en este recibo
      </p>
      {items.map((it) => {
        const st = STATUS_LABEL[it.status];
        const canReopen = it.status === 'closed' && it.closed_at &&
          differenceInDays(new Date(), new Date(it.closed_at)) < 30;
        const canClose = ['open', 'in_review', 'answered'].includes(it.status);
        const isExpanded = expandedId === it.id;
        return (
          <Card key={it.id}>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium truncate">{it.subject}</p>
                <Badge variant={st.variant} className="text-[10px] shrink-0">{st.label}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{it.description}</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Ref: {it.reference_number}</span>
                <span>{format(new Date(it.created_at), 'dd MMM yyyy', { locale: es })}</span>
              </div>
              {it.hr_response && (
                <div className="mt-1.5 p-2 rounded border bg-muted/30">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Respuesta RRHH</p>
                  <p className="text-[11px] mt-0.5">{it.hr_response}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {canClose && (
                  <Button
                    variant="outline" size="sm" className="h-7 text-[11px] gap-1"
                    onClick={() => closeAsResolved(it.id)}
                  >
                    <CheckCircle2 className="h-3 w-3" /> Marcar como resuelta
                  </Button>
                )}
                {canReopen && (
                  <Button
                    variant="outline" size="sm" className="h-7 text-[11px] gap-1"
                    onClick={() => reopen(it.id)}
                  >
                    <RotateCcw className="h-3 w-3" /> Reabrir
                  </Button>
                )}
                <Button
                  variant="ghost" size="sm" className="h-7 text-[11px] gap-1 ml-auto"
                  onClick={() => setExpandedId(isExpanded ? null : it.id)}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Historial
                </Button>
              </div>
              {isExpanded && <ObjectionTimeline objectionId={it.id} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  created: 'Incidencia creada',
  reopened: 'Reabierta',
  closed: 'Cerrada',
  in_review: 'En revisión',
  answered: 'Contestada',
  escalated: 'Escalada',
  note: 'Nota interna',
};

function ObjectionTimeline({ objectionId }: { objectionId: string }) {
  const { events, loading } = usePayrollObjectionEvents(objectionId);
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando historial…
      </div>
    );
  }
  if (!events.length) {
    return <p className="text-[10px] text-muted-foreground italic pt-1">Sin eventos registrados.</p>;
  }
  return (
    <ol className="mt-1.5 border-l border-border pl-3 space-y-1.5">
      {events.map((ev: ObjectionEvent) => (
        <li key={ev.id} className="text-[10px] relative">
          <span className="absolute -left-[15px] top-0.5 h-2 w-2 rounded-full bg-primary/60" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">{EVENT_LABEL[ev.event_type] || ev.event_type}</span>
            {ev.actor_role && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                {ev.actor_role === 'employee' ? 'Empleado' : ev.actor_role === 'hr' ? 'RRHH' : ev.actor_role}
              </Badge>
            )}
            <span className="text-muted-foreground inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(ev.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
            </span>
          </div>
          {ev.message && <p className="text-muted-foreground mt-0.5">{ev.message}</p>}
        </li>
      ))}
    </ol>
  );
}