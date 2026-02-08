/**
 * GaliaRegionalView - Vista del nivel regional (provincias de una CCAA)
 * Muestra lista de provincias con sus KPIs cuando se selecciona una CCAA
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Euro } from 'lucide-react';
import { CCAAData, formatCompactCurrency } from './spain-paths';
import { ProvinceMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { cn } from '@/lib/utils';

interface GaliaRegionalViewProps {
  ccaaInfo: CCAAData;
  provinceData: ProvinceMapData[];
  isLoading: boolean;
  onSelectProvince: (provinceId: string, provinceName: string) => void;
  isFullscreen?: boolean;
  className?: string;
}

export const GaliaRegionalView = memo(function GaliaRegionalView({
  ccaaInfo,
  provinceData,
  isLoading,
  onSelectProvince,
  isFullscreen = false,
  className
}: GaliaRegionalViewProps) {
  const totalGALs = provinceData.reduce((sum, p) => sum + p.gals, 0);

  return (
    <motion.div
      key="regional"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn("h-full flex flex-col", className)}
    >
      {/* Regional header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 mb-4">
        <h3 className="text-xl font-bold mb-2">{ccaaInfo.name}</h3>
        <p className="text-sm text-muted-foreground">
          {ccaaInfo.provinces.length} provincias • {totalGALs} GALs activos
        </p>
      </div>

      {/* Province list */}
      <ScrollArea className={cn("flex-1", isFullscreen ? "h-[calc(100vh-320px)]" : "")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          ) : (
            provinceData.map((province, idx) => (
              <motion.div
                key={province.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="bg-card border border-border/50 rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => onSelectProvince(province.id, province.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{province.name}</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {province.gals} GALs
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {province.totalGrants} ayudas
                  </div>
                  <div className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    {formatCompactCurrency(province.totalBudget)}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Ejecución</span>
                    <span className={cn(
                      "font-medium",
                      province.executionRate >= 75 ? "text-green-600" :
                      province.executionRate >= 50 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {province.executionRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${province.executionRate}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 + 0.2 }}
                      className={cn(
                        "h-full rounded-full",
                        province.executionRate >= 75 ? "bg-green-500" :
                        province.executionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
});

export default GaliaRegionalView;
