/**
 * GaliaMapTooltip - Custom tooltip for map hover states
 * Shows summary data for CCAA/Province/Municipality
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Euro
} from 'lucide-react';
import { CCAAMapData, ProvinceMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { formatCompactCurrency } from './spain-paths';
import { cn } from '@/lib/utils';

interface GaliaMapTooltipProps {
  data: CCAAMapData | ProvinceMapData | null;
  position: { x: number; y: number };
  visible: boolean;
}

const StatusIcon = ({ status }: { status: 'healthy' | 'warning' | 'critical' }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    case 'critical':
      return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  }
};

export const GaliaMapTooltip = memo(function GaliaMapTooltip({
  data,
  position,
  visible
}: GaliaMapTooltipProps) {
  if (!visible || !data) return null;

  const isCCAA = 'status' in data;
  const executionRate = data.executionRate;
  const status = isCCAA ? (data as CCAAMapData).status : 
    executionRate >= 75 ? 'healthy' : executionRate >= 50 ? 'warning' : 'critical';

  return (
    <div 
      className={cn(
        "absolute z-50 pointer-events-none",
        "bg-popover/95 backdrop-blur-md border border-border/50 rounded-lg shadow-xl",
        "p-3 min-w-[200px] max-w-[280px]",
        "transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: 'translateY(-50%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm truncate">{data.name}</h4>
        <StatusIcon status={status} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>{data.totalGrants} ayudas</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Euro className="h-3 w-3" />
          <span>{formatCompactCurrency(data.totalBudget)}</span>
        </div>
      </div>

      {/* Execution rate */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ejecución</span>
          <span className={cn(
            "font-medium",
            executionRate >= 75 ? "text-green-600" :
            executionRate >= 50 ? "text-yellow-600" : "text-red-600"
          )}>
            {executionRate.toFixed(1)}%
          </span>
        </div>
        <Progress 
          value={executionRate} 
          className="h-1.5"
        />
      </div>

      {/* CCAA specific info */}
      {isCCAA && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
          <span className="text-muted-foreground">
            {(data as CCAAMapData).pendingGrants} pendientes
          </span>
          <Badge 
            variant={status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
            className="text-[10px] h-5"
          >
            {(data as CCAAMapData).approvedGrants} aprobadas
          </Badge>
        </div>
      )}

      {/* Province specific info */}
      {!isCCAA && 'gals' in data && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
          <span className="text-muted-foreground">
            {(data as ProvinceMapData).gals} GALs activos
          </span>
        </div>
      )}

      {/* Click hint */}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Click para ver detalle
      </p>
    </div>
  );
});

export default GaliaMapTooltip;
