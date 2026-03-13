/**
 * DocumentOriginBadge — Badge visual indicando origen del documento
 * V2-ES.3 Paso 3: Visibilidad cruzada de origen documental
 */
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckSquare, FolderOpen } from 'lucide-react';
import type { RelatedEntityType } from '@/hooks/erp/hr/useHRDocumentExpedient';

interface Props {
  relatedEntityType: RelatedEntityType | null | undefined;
  size?: 'sm' | 'xs';
}

const ORIGIN_CONFIG: Record<string, { label: string; icon: typeof FolderOpen; className: string }> = {
  admin_request: {
    label: 'Solicitud',
    icon: ClipboardList,
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  },
  hr_task: {
    label: 'Tarea',
    icon: CheckSquare,
    className: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400',
  },
  direct: {
    label: 'Directo',
    icon: FolderOpen,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function DocumentOriginBadge({ relatedEntityType, size = 'xs' }: Props) {
  const key = relatedEntityType ?? 'direct';
  const config = ORIGIN_CONFIG[key] ?? ORIGIN_CONFIG.direct;
  const Icon = config.icon;
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';

  return (
    <Badge variant="outline" className={`${config.className} ${textSize} gap-1 font-normal`}>
      <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {config.label}
    </Badge>
  );
}

export type OriginFilterValue = 'all' | 'admin_request' | 'hr_task' | 'direct';

export const ORIGIN_FILTER_OPTIONS: { value: OriginFilterValue; label: string }[] = [
  { value: 'all', label: 'Todos los orígenes' },
  { value: 'admin_request', label: 'Solicitudes' },
  { value: 'hr_task', label: 'Tareas' },
  { value: 'direct', label: 'Directos' },
];

/** Utility filter function for documents by origin */
export function filterByOrigin<T extends { related_entity_type?: string | null }>(
  docs: T[],
  origin: OriginFilterValue,
): T[] {
  if (origin === 'all') return docs;
  if (origin === 'direct') return docs.filter(d => !d.related_entity_type);
  return docs.filter(d => d.related_entity_type === origin);
}
