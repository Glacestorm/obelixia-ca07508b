/**
 * GaliaTerritorialMapPanel - Main Container for Territorial Map
 * Manages drill-down navigation between Spain -> CCAA -> Province -> Expediente
 */

import { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  RefreshCw, 
  Maximize2, 
  Minimize2,
  FileText,
  Euro,
  TrendingUp,
  Building,
  Users
} from 'lucide-react';
import { useGaliaTerritorialMap } from '@/hooks/galia/useGaliaTerritorialMap';
import { GaliaSpainMap } from './GaliaSpainMap';
import { GaliaMapBreadcrumb } from './GaliaMapBreadcrumb';
import { GaliaMapLegend } from './GaliaMapLegend';
import { formatCompactCurrency } from './spain-paths';
import { cn } from '@/lib/utils';

interface GaliaTerritorialMapPanelProps {
  className?: string;
}

export const GaliaTerritorialMapPanel = memo(function GaliaTerritorialMapPanel({
  className
}: GaliaTerritorialMapPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    navigation,
    isLoading,
    ccaaData,
    provinceData,
    drillDown,
    drillUp,
    goToLevel,
    refreshData,
    selectedCCAAInfo,
    currentLevelData
  } = useGaliaTerritorialMap();

  // Handle CCAA selection
  const handleSelectCCAA = useCallback((ccaaId: string, ccaaName: string) => {
    drillDown('regional', ccaaId, ccaaName);
  }, [drillDown]);

  // Calculate totals for national level
  const nationalTotals = {
    grants: ccaaData.reduce((sum, c) => sum + c.totalGrants, 0),
    budget: ccaaData.reduce((sum, c) => sum + c.totalBudget, 0),
    avgExecution: ccaaData.length > 0 
      ? ccaaData.reduce((sum, c) => sum + c.executionRate, 0) / ccaaData.length 
      : 0
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isFullscreen && "fixed inset-4 z-50 shadow-2xl",
      className
    )}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Mapa Territorial de Subvenciones
                <Badge variant="outline" className="text-[10px]">
                  v2.0
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visualización jerárquica de ayudas por territorio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Breadcrumb navigation */}
        <GaliaMapBreadcrumb
          breadcrumb={navigation.breadcrumb}
          onNavigate={goToLevel}
          onBack={drillUp}
          className="mt-3"
        />
      </CardHeader>

      <CardContent className={cn(
        "pt-4",
        isFullscreen ? "h-[calc(100%-120px)]" : "min-h-[500px]"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Main map area */}
          <div className={cn(
            "lg:col-span-3 relative",
            isFullscreen ? "h-full" : "min-h-[400px]"
          )}>
            <AnimatePresence mode="wait">
              {navigation.level === 'national' && (
                <motion.div
                  key="national"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <GaliaSpainMap
                    data={ccaaData}
                    onSelectCCAA={handleSelectCCAA}
                    selectedCCAA={navigation.selectedCCAA}
                    isLoading={isLoading}
                    className="h-full"
                  />
                </motion.div>
              )}

              {navigation.level === 'regional' && selectedCCAAInfo && (
                <motion.div
                  key="regional"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col"
                >
                  {/* Regional header */}
                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 mb-4">
                    <h3 className="text-xl font-bold mb-2">{selectedCCAAInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCCAAInfo.provinces.length} provincias • {provinceData.reduce((s, p) => s + p.gals, 0)} GALs activos
                    </p>
                  </div>

                  {/* Province list */}
                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {isLoading ? (
                        Array(4).fill(0).map((_, i) => (
                          <Skeleton key={i} className="h-24 rounded-lg" />
                        ))
                      ) : (
                        provinceData.map((province) => (
                          <motion.div
                            key={province.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            className="bg-card border border-border/50 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all"
                            onClick={() => drillDown('provincial', province.id, province.name)}
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
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    province.executionRate >= 75 ? "bg-green-500" :
                                    province.executionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${province.executionRate}%` }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend overlay - top left */}
            <GaliaMapLegend 
              className="absolute top-4 left-4 w-44"
              compact={!isFullscreen}
            />
          </div>

          {/* Side panel - Summary stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Level summary */}
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {navigation.level === 'national' ? 'Resumen Nacional' : 'Resumen Regional'}
              </h4>

              {navigation.level === 'national' ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5" />
                        CC.AA. activas
                      </span>
                      <span className="font-semibold">{ccaaData.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Total ayudas
                      </span>
                      <span className="font-semibold">{nationalTotals.grants.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Euro className="h-3.5 w-3.5" />
                        Presupuesto
                      </span>
                      <span className="font-semibold">{formatCompactCurrency(nationalTotals.budget)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Ejecución media
                      </span>
                      <span className={cn(
                        "font-semibold",
                        nationalTotals.avgExecution >= 75 ? "text-green-600" :
                        nationalTotals.avgExecution >= 50 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {nationalTotals.avgExecution.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </>
              ) : currentLevelData && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total ayudas</span>
                      <span className="font-semibold">{currentLevelData.totalGrants}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Presupuesto</span>
                      <span className="font-semibold">{formatCompactCurrency(currentLevelData.totalBudget)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Ejecución</span>
                      <span className={cn(
                        "font-semibold",
                        currentLevelData.executionRate >= 75 ? "text-green-600" :
                        currentLevelData.executionRate >= 50 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {currentLevelData.executionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Top regions */}
            {navigation.level === 'national' && ccaaData.length > 0 && (
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  Top 5 por volumen
                </h4>
                <div className="space-y-2">
                  {[...ccaaData]
                    .sort((a, b) => b.totalGrants - a.totalGrants)
                    .slice(0, 5)
                    .map((ccaa, idx) => (
                      <div 
                        key={ccaa.id}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 transition-colors"
                        onClick={() => handleSelectCCAA(ccaa.id, ccaa.name)}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[100px]">{ccaa.shortName}</span>
                        </span>
                        <span className="font-medium">{ccaa.totalGrants}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default GaliaTerritorialMapPanel;
