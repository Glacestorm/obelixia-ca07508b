/**
 * HRStatusBadge — Unified status badge with semantic colors for all HR entities
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type HREntityType = 
  | 'employee' | 'contract' | 'payroll' | 'submission' 
  | 'incident' | 'mobility' | 'request' | 'evidence';

const STATUS_COLORS: Record<string, string> = {
  // Employee
  'employee:active': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'employee:temporary_leave': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'employee:terminated': 'bg-red-500/15 text-red-700 border-red-500/30',
  'employee:excedencia': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  // Contract
  'contract:active': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'contract:expiring': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'contract:ended': 'bg-muted text-muted-foreground border-border',
  'contract:processing': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  // Payroll
  'payroll:draft': 'bg-muted text-muted-foreground border-border',
  'payroll:calculated': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'payroll:approved': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'payroll:paid': 'bg-emerald-600/15 text-emerald-800 border-emerald-600/30',
  'payroll:error': 'bg-red-500/15 text-red-700 border-red-500/30',
  // Submission
  'submission:pending': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'submission:sent': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'submission:accepted': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'submission:rejected': 'bg-red-500/15 text-red-700 border-red-500/30',
  'submission:error': 'bg-red-500/15 text-red-700 border-red-500/30',
  // Incident
  'incident:open': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'incident:in_progress': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'incident:resolved': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'incident:escalated': 'bg-red-500/15 text-red-700 border-red-500/30',
  // Mobility
  'mobility:draft': 'bg-muted text-muted-foreground border-border',
  'mobility:planned': 'bg-muted text-muted-foreground border-border',
  'mobility:pre_assignment': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'mobility:active': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'mobility:extending': 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  'mobility:repatriating': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'mobility:transition': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'mobility:completed': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'mobility:cancelled': 'bg-muted text-muted-foreground border-border',
  // Request
  'request:draft': 'bg-muted text-muted-foreground border-border',
  'request:submitted': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'request:pending': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'request:reviewing': 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  'request:pending_approval': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'request:approved': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'request:in_progress': 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  'request:completed': 'bg-emerald-600/15 text-emerald-800 border-emerald-600/30',
  'request:denied': 'bg-red-500/15 text-red-700 border-red-500/30',
  'request:rejected': 'bg-red-500/15 text-red-700 border-red-500/30',
  'request:returned': 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  'request:cancelled': 'bg-muted text-muted-foreground border-border',
  'request:open': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  // Evidence
  'evidence:valid': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'evidence:expiring': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'evidence:expired': 'bg-red-500/15 text-red-700 border-red-500/30',
  'evidence:pending': 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  'employee:active': 'Activo',
  'employee:temporary_leave': 'Baja temporal',
  'employee:terminated': 'Baja definitiva',
  'employee:excedencia': 'Excedencia',
  'contract:active': 'Vigente',
  'contract:expiring': 'Próximo vencimiento',
  'contract:ended': 'Finalizado',
  'contract:processing': 'En trámite',
  'payroll:draft': 'Borrador',
  'payroll:calculated': 'Calculada',
  'payroll:approved': 'Aprobada',
  'payroll:paid': 'Pagada',
  'payroll:error': 'Error',
  'submission:pending': 'Pendiente',
  'submission:sent': 'Enviado',
  'submission:accepted': 'Aceptado',
  'submission:rejected': 'Rechazado',
  'submission:error': 'Error',
  'incident:open': 'Abierta',
  'incident:in_progress': 'En proceso',
  'incident:resolved': 'Resuelta',
  'incident:escalated': 'Escalada',
  'mobility:planned': 'Planificada',
  'mobility:active': 'Activa',
  'mobility:transition': 'En transición',
  'mobility:completed': 'Finalizada',
  'request:draft': 'Borrador',
  'request:submitted': 'Enviada',
  'request:pending': 'Pendiente',
  'request:reviewing': 'En revisión',
  'request:pending_approval': 'Pend. aprobación',
  'request:approved': 'Aprobada',
  'request:in_progress': 'En gestión',
  'request:completed': 'Completada',
  'request:denied': 'Denegada',
  'request:rejected': 'Rechazada',
  'request:returned': 'Devuelta',
  'request:cancelled': 'Cancelada',
  'request:open': 'Abierta',
  'evidence:valid': 'Vigente',
  'evidence:expiring': 'Próx. vencimiento',
  'evidence:expired': 'Expirada',
  'evidence:pending': 'Pendiente',
};

interface HRStatusBadgeProps {
  entity: HREntityType;
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function HRStatusBadge({ entity, status, className, size = 'sm' }: HRStatusBadgeProps) {
  const key = `${entity}:${status}`;
  const colors = STATUS_COLORS[key] || 'bg-muted text-muted-foreground border-border';
  const label = STATUS_LABELS[key] || status;

  return (
    <Badge
      variant="outline"
      className={cn(
        colors,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {label}
    </Badge>
  );
}
