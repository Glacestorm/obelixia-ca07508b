/**
 * DocGenerationBadge — Visual indicator for auto-generated/placeholder/assisted documents
 * V2-ES.4 Paso 5.4: Indicador compacto de origen de generación
 *
 * REGLAS:
 * - Solo se muestra si metadata.generation_mode existe
 * - No se muestra para documentos legacy/manuales (graceful degradation)
 * - Colores coherentes con el sistema de badges existente
 */
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Zap, FileEdit, FilePlus2 } from 'lucide-react';
import type { GenerationMode } from '@/hooks/erp/hr/useHRDocGenerationRules';

interface DocGenerationBadgeProps {
  metadata?: Record<string, any> | null;
  source?: string | null;
}

const MODE_CONFIG: Record<GenerationMode, {
  label: string;
  tooltip: string;
  icon: typeof Zap;
  className: string;
}> = {
  auto: {
    label: 'Auto',
    tooltip: 'Generado automáticamente por el sistema',
    icon: Zap,
    className: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  },
  placeholder: {
    label: 'Placeholder',
    tooltip: 'Placeholder pendiente de completar',
    icon: FilePlus2,
    className: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
  },
  assisted: {
    label: 'Asistido',
    tooltip: 'Borrador generado con asistencia',
    icon: FileEdit,
    className: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  },
};

export function DocGenerationBadge({ metadata, source }: DocGenerationBadgeProps) {
  // Only show for auto-generated documents
  if (source !== 'auto_generated') return null;

  const mode = (metadata?.generation_mode as GenerationMode) ?? 'auto';
  const config = MODE_CONFIG[mode] ?? MODE_CONFIG.auto;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-[9px] h-4 px-1 gap-0.5 shrink-0 ${config.className}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
