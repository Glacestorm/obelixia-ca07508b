/**
 * DocStatusBadge — Badge de estado documental operativo
 * V2-ES.4 Paso 1 (parte 2): Estados funcionales del documento HR
 *
 * REGLAS:
 * - Colores semánticos consistentes con HRStatusBadge
 * - Fallback a 'draft' para documentos legacy sin estado
 * - No duplica lógica de workflows (V2-ES.2)
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocOperationalStatus =
  | 'draft'
  | 'generated'
  | 'pending_submission'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'corrected'
  | 'closed'
  | 'archived';

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DocOperationalStatus, { label: string; style: string }> = {
  draft: {
    label: 'Borrador',
    style: 'bg-muted text-muted-foreground border-border',
  },
  generated: {
    label: 'Generado',
    style: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  },
  pending_submission: {
    label: 'Pend. envío',
    style: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  },
  submitted: {
    label: 'Enviado',
    style: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
  },
  accepted: {
    label: 'Aceptado',
    style: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  },
  rejected: {
    label: 'Rechazado',
    style: 'bg-red-500/10 text-red-700 border-red-500/30',
  },
  corrected: {
    label: 'Corregido',
    style: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  },
  closed: {
    label: 'Cerrado',
    style: 'bg-emerald-600/10 text-emerald-800 border-emerald-600/30',
  },
  archived: {
    label: 'Archivado',
    style: 'bg-muted text-muted-foreground border-border',
  },
};

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Normaliza un valor de estado documental.
 * Devuelve 'draft' para valores no reconocidos o undefined (legacy fallback).
 */
export function normalizeDocStatus(status: string | null | undefined): DocOperationalStatus {
  if (!status) return 'draft';
  const normalized = status.toLowerCase().trim() as DocOperationalStatus;
  return STATUS_CONFIG[normalized] ? normalized : 'draft';
}

/**
 * Devuelve la etiqueta legible de un estado documental.
 */
export function getDocStatusLabel(status: string | null | undefined): string {
  return STATUS_CONFIG[normalizeDocStatus(status)].label;
}

/**
 * Transiciones válidas desde cada estado.
 * Informativo — no bloquea en UI, pero puede usarse para validación futura.
 */
export const DOC_STATUS_TRANSITIONS: Record<DocOperationalStatus, DocOperationalStatus[]> = {
  draft: ['generated', 'pending_submission', 'archived'],
  generated: ['pending_submission', 'closed', 'archived'],
  pending_submission: ['submitted', 'draft', 'archived'],
  submitted: ['accepted', 'rejected'],
  accepted: ['closed', 'archived'],
  rejected: ['corrected', 'draft', 'archived'],
  corrected: ['pending_submission', 'submitted'],
  closed: ['archived'],
  archived: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

interface DocStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

export function DocStatusBadge({ status, className, size = 'sm' }: DocStatusBadgeProps) {
  const normalized = normalizeDocStatus(status);
  const config = STATUS_CONFIG[normalized];

  return (
    <Badge
      variant="outline"
      className={cn(
        config.style,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
