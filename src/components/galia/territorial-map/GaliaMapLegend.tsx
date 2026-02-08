/**
 * GaliaMapLegend - Legend for the territorial map
 * Shows color scale and status indicators
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaliaMapLegendProps {
  className?: string;
  showGradient?: boolean;
  compact?: boolean;
}

export const GaliaMapLegend = memo(function GaliaMapLegend({
  className,
  showGradient = true,
  compact = false
}: GaliaMapLegendProps) {
  return (
    <div className={cn(
      "bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3",
      compact ? "space-y-2" : "space-y-3",
      className
    )}>
      {/* Title */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        Leyenda
      </div>

      {/* Color gradient for volume */}
      {showGradient && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Volumen de ayudas</span>
          <div className="flex items-center gap-1">
            <div className="h-3 flex-1 rounded bg-gradient-to-r from-primary/20 via-primary/50 to-primary" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Bajo</span>
            <span>Alto</span>
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted-foreground">Estado de ejecución</span>
        <div className={cn("grid gap-1.5", compact ? "grid-cols-1" : "grid-cols-3")}>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-[10px]">&gt;75%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            <span className="text-[10px]">50-75%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-[10px]">&lt;50%</span>
          </div>
        </div>
      </div>

      {/* Interaction hints */}
      {!compact && (
        <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground space-y-1">
          <p>• Click en región para zoom</p>
          <p>• ESC para volver atrás</p>
          <p>• Hover para ver datos</p>
        </div>
      )}
    </div>
  );
});

export default GaliaMapLegend;
