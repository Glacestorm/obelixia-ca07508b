/**
 * GaliaTerritorialMapPanel - Main Container for Territorial Map
 * Manages drill-down navigation between Spain -> CCAA -> Province -> Expediente
 */

import { memo, useCallback, useState, useMemo } from 'react';
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
import { GaliaRegionMap, ProvinceMapData } from './GaliaRegionMap';
import { GaliaMapBreadcrumb } from './GaliaMapBreadcrumb';
import { GaliaMapLegend } from './GaliaMapLegend';
import { formatCompactCurrency } from './spain-paths';
import { getProvincesByCCAA } from './province-paths';
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

  // Handle Province selection
  const handleSelectProvince = useCallback((provinceId: string, provinceName: string) => {
    drillDown('provincial', provinceId, provinceName);
  }, [drillDown]);

  // Transform province data for regional map component
  const regionProvinceData = useMemo((): ProvinceMapData[] => {
    if (!navigation.selectedCCAA) return [];
    
    const provinces = getProvincesByCCAA(navigation.selectedCCAA);
    
    return provinces.map((province, idx) => {
      const existing = provinceData.find(p => p.name === province.name);
      const totalGrants = existing?.totalGrants ?? Math.floor(Math.random() * 100) + 20;
      const totalBudget = existing?.totalBudget ?? (Math.random() * 10 + 2) * 1000000;
      const executionRate = existing?.executionRate ?? Math.random() * 100;
      
      return {
        id: province.id,
        name: province.name,
        totalGrants,
        totalBudget,
        executionRate,
        pendingGrants: Math.floor(totalGrants * 0.25),
        status: executionRate < 50 ? 'critical' as const : 
                executionRate < 75 ? 'warning' as const : 'healthy' as const,
        trend: Math.random() > 0.5 ? 'up' as const : 'down' as const,
        trendPercentage: Math.floor(Math.random() * 20) + 1,
        topSectors: [
          { name: 'Agroalimentario', amount: totalBudget * 0.35 },
          { name: 'Turismo rural', amount: totalBudget * 0.25 },
          { name: 'Digitalización', amount: totalBudget * 0.20 },
        ],
        gals: [
          { id: `gal-${idx}-1`, name: `GAL ${province.name} Norte`, grants: Math.floor(totalGrants * 0.4) },
          { id: `gal-${idx}-2`, name: `GAL ${province.name} Sur`, grants: Math.floor(totalGrants * 0.35) },
        ]
      };
    });
  }, [navigation.selectedCCAA, provinceData]);

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
              <MapPin className="h-5 w-5 text-primary-foreground" />
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
        <AnimatePresence mode="wait">
          {/* National Level */}
          {navigation.level === 'national' && (
            <motion.div
              key="national"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full"
            >
              {/* Main map area */}
              <div className={cn(
                "lg:col-span-3 relative",
                isFullscreen ? "h-full" : "min-h-[400px]"
              )}>
                <GaliaSpainMap
                  data={ccaaData}
                  onSelectCCAA={handleSelectCCAA}
                  selectedCCAA={navigation.selectedCCAA}
                  isLoading={isLoading}
                  className="h-full"
                />

                {/* Legend overlay */}
                <GaliaMapLegend 
                  className="absolute bottom-4 left-4 w-40"
                  compact={!isFullscreen}
                />
              </div>

              {/* Side panel - Summary stats */}
              <div className="lg:col-span-1 space-y-4">
                {/* National summary */}
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
                      <span className="font-semibold text-primary">
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
              </div>
            </motion.div>
          )}

          {/* Regional Level - Phase 3 */}
          {navigation.level === 'regional' && selectedCCAAInfo && (
            <motion.div
              key="regional"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <GaliaRegionMap
                ccaaId={navigation.selectedCCAA!}
                ccaaName={selectedCCAAInfo.name}
                provinceData={regionProvinceData}
                onSelectProvince={handleSelectProvince}
                onBack={drillUp}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {/* Provincial Level - Placeholder for Phase 4 */}
          {navigation.level === 'provincial' && (
            <motion.div
              key="provincial"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center h-full min-h-[400px]"
            >
              <div className="text-center p-8 bg-muted/30 rounded-lg">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Vista Provincial</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Mapa con municipios y markers de ayudas individuales.
                </p>
                <Badge variant="outline">Fase 4 - Próximamente</Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
});

export default GaliaTerritorialMapPanel;
