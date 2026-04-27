/**
 * CASUISTICA-FECHAS-01 — Fase C3A
 * Badges read-only para estado y flags legales/oficiales de una incidencia.
 *
 * Sólo muestra campos que EXISTEN en la fila persistida:
 *  - status, applied_at, deleted_at
 *  - legal_review_required, requires_external_filing, official_communication_type
 *
 * No inventa estados nuevos. No hay `pending_communication` ni `communicated`
 * salvo que el campo concreto lo refleje.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, FileWarning, Lock, Trash2, CheckCircle2, Clock } from 'lucide-react';

export interface IncidentStatusFlags {
  status?: string | null;
  applied_at?: string | null;
  deleted_at?: string | null;
  version?: number | null;
  legal_review_required?: boolean | null;
  requires_external_filing?: boolean | null;
  requires_ss_action?: boolean | null;
  requires_tax_adjustment?: boolean | null;
  official_communication_type?: string | null;
}

function StatusChip({
  status,
  applied_at,
  deleted_at,
  version,
}: Pick<IncidentStatusFlags, 'status' | 'applied_at' | 'deleted_at' | 'version'>) {
  if (deleted_at) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 line-through opacity-70">
        <Trash2 className="h-2.5 w-2.5" />
        Cancelada
      </Badge>
    );
  }
  if (applied_at) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-success/40 text-success bg-success/5">
        <Lock className="h-2.5 w-2.5" />
        Aplicada{typeof version === 'number' ? ` v${version}` : ''}
      </Badge>
    );
  }
  switch (status) {
    case 'approved':
      return (
        <Badge variant="outline" className="text-[10px] gap-1 border-info/40 text-info bg-info/5">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Aprobada
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          Pendiente
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="text-[10px] gap-1 line-through opacity-70">
          Cancelada
        </Badge>
      );
    case null:
    case undefined:
    case '':
      return (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Sin estado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {status}
        </Badge>
      );
  }
}

export function IncidentStatusBadge({
  flags,
  className,
}: {
  flags: IncidentStatusFlags;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <StatusChip
        status={flags.status ?? null}
        applied_at={flags.applied_at ?? null}
        deleted_at={flags.deleted_at ?? null}
        version={flags.version ?? null}
      />

      {flags.legal_review_required && (
        <Badge
          variant="outline"
          className="text-[10px] gap-1 border-warning/40 text-warning bg-warning/5"
          title="Esta incidencia requiere revisión legal antes de aplicarse."
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          Revisión legal
        </Badge>
      )}

      {(flags.requires_external_filing || flags.official_communication_type) && (
        <Badge
          variant="outline"
          className="text-[10px] gap-1 border-warning/40 text-warning bg-warning/5"
          title="La comunicación oficial está pendiente. No se ha enviado nada."
        >
          <FileWarning className="h-2.5 w-2.5" />
          {flags.official_communication_type
            ? `${flags.official_communication_type} pendiente`
            : 'Comunicación oficial pendiente'}
        </Badge>
      )}

      {flags.requires_ss_action && (
        <Badge
          variant="outline"
          className="text-[10px] border-warning/40 text-warning bg-warning/5"
          title="Requiere acción ante la Seguridad Social."
        >
          SS pendiente
        </Badge>
      )}

      {flags.requires_tax_adjustment && (
        <Badge
          variant="outline"
          className="text-[10px] border-warning/40 text-warning bg-warning/5"
          title="Requiere ajuste fiscal (IRPF/regularización)."
        >
          Ajuste fiscal
        </Badge>
      )}
    </div>
  );
}

export default IncidentStatusBadge;