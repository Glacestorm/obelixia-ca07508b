/**
 * CASUISTICA-FECHAS-01 — Fase C3A
 * Badge visual read-only para tipos de proceso/incidencia.
 *
 * Cubre:
 *  - tipos de `erp_hr_payroll_incidents.incident_type`
 *  - tipos de IT (`erp_hr_it_processes.process_type`: EC/AT/EP/ANL)
 *  - tipos de leaves (`erp_hr_leave_requests.leave_type`: PAT/MAT/...)
 *
 * Sin writes, sin lógica de negocio, sin side-effects.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface IncidentTypeBadgeProps {
  /** Valor crudo de la tabla origen. */
  type: string | null | undefined;
  /** Origen para resolver tipos colisionados (ej. EC ≠ pnr). */
  source?: 'payroll_incidents' | 'it_processes' | 'leave_requests';
  className?: string;
}

const PAYROLL_TYPE_LABELS: Record<string, string> = {
  pnr: 'PNR',
  reduccion_jornada_guarda_legal: 'Reducción jornada',
  reduction: 'Reducción',
  atrasos_regularizacion: 'Atrasos',
  desplazamiento_temporal: 'Desplazamiento temporal',
  suspension_empleo_sueldo: 'Suspensión empleo/sueldo',
  variable: 'Variable',
  correction: 'Corrección',
  modification: 'Modificación',
  retribution_in_kind: 'Retribución en especie',
  otra: 'Otra',
};

const IT_TYPE_LABELS: Record<string, string> = {
  EC: 'IT — Enfermedad común',
  AT: 'IT — Accidente trabajo',
  EP: 'IT — Enfermedad profesional',
  ANL: 'IT — Accidente no laboral',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  PAT: 'Paternidad',
  PATERNIDAD: 'Paternidad',
  MAT: 'Maternidad',
  MATERNIDAD: 'Maternidad',
  birth: 'Nacimiento',
  corresponsabilidad: 'Corresponsabilidad',
  CORRESPONSABILIDAD: 'Corresponsabilidad',
  lactancia: 'Lactancia',
};

function resolveLabel(
  type: string | null | undefined,
  source?: IncidentTypeBadgeProps['source'],
): { label: string; tone: 'default' | 'muted' | 'warning' | 'destructive' } {
  if (!type) return { label: 'Tipo desconocido', tone: 'muted' };

  if (source === 'it_processes') {
    return { label: IT_TYPE_LABELS[type] ?? `IT — ${type}`, tone: 'warning' };
  }
  if (source === 'leave_requests') {
    return { label: LEAVE_TYPE_LABELS[type] ?? type, tone: 'default' };
  }
  // payroll_incidents (default)
  const legalSensitive = type === 'desplazamiento_temporal' || type === 'suspension_empleo_sueldo';
  return {
    label: PAYROLL_TYPE_LABELS[type] ?? type,
    tone: legalSensitive ? 'destructive' : 'default',
  };
}

export function IncidentTypeBadge({ type, source, className }: IncidentTypeBadgeProps) {
  const { label, tone } = resolveLabel(type, source);

  const variant = tone === 'destructive' ? 'destructive' : tone === 'warning' ? 'outline' : 'secondary';
  const extra =
    tone === 'warning'
      ? 'border-warning/40 text-warning bg-warning/5'
      : tone === 'muted'
        ? 'text-muted-foreground'
        : '';

  return (
    <Badge variant={variant} className={cn('text-[10px] font-medium', extra, className)}>
      {label}
    </Badge>
  );
}

export default IncidentTypeBadge;