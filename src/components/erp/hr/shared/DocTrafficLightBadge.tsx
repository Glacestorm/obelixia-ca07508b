/**
 * DocTrafficLightBadge — Semáforo visual de estado documental
 * V2-ES.4 Paso 1: Badge compacto green/amber/red basado en vencimiento
 * Componente puro — recibe datos por prop, sin fetch.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CircleCheck, CircleAlert, CircleX, Clock } from 'lucide-react';
import { computeDocStatus, type DocTrafficLight, type DocStatusResult } from './documentStatusEngine';

const LIGHT_STYLES: Record<DocTrafficLight, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  red: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const LIGHT_ICONS: Record<DocTrafficLight, typeof CircleCheck> = {
  green: CircleCheck,
  amber: CircleAlert,
  red: CircleX,
};

interface DocTrafficLightBadgeProps {
  documentType: string;
  expiryDate: string | null | undefined;
  /** Show label text next to icon (default: true) */
  showLabel?: boolean;
  className?: string;
}

export function DocTrafficLightBadge({
  documentType,
  expiryDate,
  showLabel = true,
  className,
}: DocTrafficLightBadgeProps) {
  const result = computeDocStatus(documentType, expiryDate);
  const Icon = LIGHT_ICONS[result.light];

  return (
    <Badge
      variant="outline"
      className={cn(
        LIGHT_STYLES[result.light],
        'text-[10px] px-1.5 py-0 gap-1 font-normal',
        className,
      )}
      title={result.label}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span className="truncate max-w-[100px]">{result.label}</span>}
    </Badge>
  );
}

/**
 * Variant: precomputed status (avoid recomputing when already available)
 */
export function DocTrafficLightBadgeFromStatus({
  status,
  className,
  showLabel = true,
}: {
  status: DocStatusResult;
  showLabel?: boolean;
  className?: string;
}) {
  const Icon = LIGHT_ICONS[status.light];

  return (
    <Badge
      variant="outline"
      className={cn(
        LIGHT_STYLES[status.light],
        'text-[10px] px-1.5 py-0 gap-1 font-normal',
        className,
      )}
      title={status.label}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span className="truncate max-w-[100px]">{status.label}</span>}
    </Badge>
  );
}
