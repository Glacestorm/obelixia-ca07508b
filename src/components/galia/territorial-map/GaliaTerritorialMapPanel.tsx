/**
 * GaliaTerritorialMapPanel - Main Container for Territorial Map
 * Manages drill-down navigation between Spain -> CCAA -> Province -> Expediente
 */

import { memo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { GaliaRegionalView } from './GaliaRegionalView';
import { GaliaRegionInfoPanel } from './GaliaRegionInfoPanel';
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

  // Keyboard shortcuts (Escape to exit fullscreen or go back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (navigation.level !== 'national') {
          drillUp();
        }
      }
      // F key to toggle fullscreen
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          setIsFullscreen(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, navigation.level, drillUp]);

  // Handle CCAA selection
  const handleSelectCCAA = useCallback((ccaaId: string, ccaaName: string) => {
    drillDown('regional', ccaaId, ccaaName);
  }, [drillDown]);

  // Handle province selection
  const handleSelectProvince = useCallback((provinceId: string, provinceName: string) => {
    drillDown('provincial', provinceId, provinceName);
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
        "pt-3",
        isFullscreen ? "h-[calc(100%-120px)]" : "min-h-[380px]"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-full">
          {/* Main map area */}
          <div className={cn(
            "lg:col-span-3 relative",
            isFullscreen ? "h-full" : "min-h-[320px]"
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

              {(navigation.level === 'regional' || navigation.level === 'provincial') && selectedCCAAInfo && (
                <GaliaRegionalView
                  ccaaInfo={selectedCCAAInfo}
                  provinceData={provinceData}
                  isLoading={isLoading}
                  onSelectProvince={handleSelectProvince}
                  isFullscreen={isFullscreen}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Side panel - Summary stats or Regional Info */}
          <div className="lg:col-span-1 space-y-4">
            <AnimatePresence mode="wait">
              {navigation.level === 'national' ? (
                <motion.div
                  key="national-sidebar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Level summary */}
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Resumen Nacional
                    </h4>

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
                  </div>

                  {/* Top regions */}
                  {ccaaData.length > 0 && (
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

                  {/* Legend */}
                  <GaliaMapLegend className="w-full" compact={false} />
                </motion.div>
              ) : navigation.level === 'regional' && selectedCCAAInfo && currentLevelData && (
                <GaliaRegionInfoPanel
                  key="regional-sidebar"
                  ccaaInfo={selectedCCAAInfo}
                  ccaaData={currentLevelData as any}
                  provinceData={provinceData}
                  isLoading={isLoading}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default GaliaTerritorialMapPanel;
