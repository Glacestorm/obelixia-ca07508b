/**
 * EmployeePayrollObjectionsList — Lista de incidencias del empleado para una nómina (S9.22).
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Loader2, RotateCcw } from 'lucide-react';
import { usePayrollObjections, type ObjectionStatus } from '@/hooks/erp/hr/usePayrollObjections';

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
  const { items, loading, reopen } = usePayrollObjections({ payrollRecordId, employeeId, companyId });

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
              {canReopen && (
                <Button
                  variant="outline" size="sm" className="h-7 text-[11px] gap-1"
                  onClick={() => reopen(it.id)}
                >
                  <RotateCcw className="h-3 w-3" /> Reabrir
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}