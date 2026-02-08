/**
 * GaliaRegionMap - Regional Map Component (Phase 3)
 * Shows province-level detail when drilling down from national map
 */

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  MapPin,
  Euro,
  FileText
} from 'lucide-react';
import { getProvincesByCCAA, ProvinceData } from './province-paths';
import { getCCAAById } from './spain-paths';
import { cn } from '@/lib/utils';
import { formatCompactCurrency } from './spain-paths';

// Province data interface
export interface ProvinceMapData {
  id: string;
  name: string;
  totalGrants: number;
  totalBudget: number;
  executionRate: number;
  pendingGrants: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  topSectors: { name: string; amount: number }[];
  gals: { id: string; name: string; grants: number }[];
}

interface GaliaRegionMapProps {
  ccaaId: string;
  ccaaName: string;
  provinceData: ProvinceMapData[];
  onSelectProvince: (provinceId: string, provinceName: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  className?: string;
}

export const GaliaRegionMap = memo(function GaliaRegionMap({
  ccaaId,
  ccaaName,
  provinceData,
  onSelectProvince,
  onBack,
  isLoading = false,
  className
}: GaliaRegionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  // Get province paths for this CCAA
  const provinces = useMemo(() => getProvincesByCCAA(ccaaId), [ccaaId]);
  const ccaaInfo = useMemo(() => getCCAAById(ccaaId), [ccaaId]);

  // Map data by province ID
  const dataMap = useMemo(() => {
    const map = new Map<string, ProvinceMapData>();
    provinceData.forEach(d => map.set(d.id, d));
    return map;
  }, [provinceData]);

  // Calculate max values for color scaling
  const maxGrants = useMemo(() => {
    return Math.max(...provinceData.map(d => d.totalGrants), 1);
  }, [provinceData]);

  // Get fill color based on data
  const getFillColor = useCallback((provinceId: string): string => {
    const data = dataMap.get(provinceId);
    if (!data) return 'hsl(var(--muted))';
    
    const intensity = data.totalGrants / maxGrants;
    const opacity = 0.3 + (intensity * 0.6);
    
    if (data.status === 'critical') {
      return `hsl(var(--destructive) / ${opacity})`;
    }
    if (data.status === 'warning') {
      return `hsl(45 100% 50% / ${opacity})`;
    }
    return `hsl(var(--primary) / ${opacity})`;
  }, [dataMap, maxGrants]);

  // Handle province click
  const handleProvinceClick = useCallback((province: ProvinceData) => {
    setSelectedProvince(province.id);
    onSelectProvince(province.id, province.name);
  }, [onSelectProvince]);

  // Get selected province data
  const selectedData = useMemo(() => {
    if (!selectedProvince) return null;
    return dataMap.get(selectedProvince) || null;
  }, [selectedProvince, dataMap]);

  // Calculate regional totals
  const regionalTotals = useMemo(() => {
    return {
      totalGrants: provinceData.reduce((sum, p) => sum + p.totalGrants, 0),
      totalBudget: provinceData.reduce((sum, p) => sum + p.totalBudget, 0),
      avgExecution: provinceData.length > 0 
        ? provinceData.reduce((sum, p) => sum + p.executionRate, 0) / provinceData.length 
        : 0,
      pendingGrants: provinceData.reduce((sum, p) => sum + p.pendingGrants, 0)
    };
  }, [provinceData]);

  return (
    <motion.div 
      className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4", className)}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      {/* Map Column */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onBack}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">{ccaaName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {provinces.length} provincias · {regionalTotals.totalGrants} expedientes
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                {formatCompactCurrency(regionalTotals.totalBudget)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Regional SVG Map */}
            <svg
              ref={svgRef}
              viewBox="0 0 400 400"
              className="w-full h-auto"
              style={{ maxHeight: '50vh' }}
              onMouseLeave={() => setHoveredProvince(null)}
            >
              {/* Background */}
              <rect 
                x="0" y="0" 
                width="400" height="400" 
                fill="hsl(var(--muted) / 0.1)"
                rx="8"
              />

              {/* Province Paths */}
              <g>
                {provinces.map((province) => {
                  const data = dataMap.get(province.id);
                  const isHovered = hoveredProvince === province.id;
                  const isSelected = selectedProvince === province.id;
                  
                  return (
                    <motion.g
                      key={province.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
                    >
                      <motion.path
                        d={province.path}
                        fill={getFillColor(province.id)}
                        stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                        strokeWidth={isHovered || isSelected ? 3 : 1.5}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredProvince(province.id)}
                        onClick={() => handleProvinceClick(province)}
                        whileHover={{ scale: 1.02 }}
                        style={{ 
                          filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                          transformOrigin: `${province.labelPosition.x}px ${province.labelPosition.y}px`
                        }}
                      />

                      {/* Province label */}
                      <g className="pointer-events-none">
                        <text
                          x={province.labelPosition.x}
                          y={province.labelPosition.y - 8}
                          textAnchor="middle"
                          className="text-[11px] font-medium fill-foreground"
                        >
                          {province.name}
                        </text>
                        {data && (
                          <>
                            <rect
                              x={province.labelPosition.x - 20}
                              y={province.labelPosition.y}
                              width="40"
                              height="16"
                              rx="8"
                              fill="hsl(var(--background) / 0.9)"
                              stroke="hsl(var(--border))"
                              strokeWidth="0.5"
                            />
                            <text
                              x={province.labelPosition.x}
                              y={province.labelPosition.y + 12}
                              textAnchor="middle"
                              className="text-[10px] font-bold fill-foreground"
                            >
                              {data.totalGrants}
                            </text>
                          </>
                        )}
                      </g>
                    </motion.g>
                  );
                })}
              </g>
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* Detail Sidebar */}
      <div className="space-y-4">
        {/* Regional KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">KPIs Regionales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expedientes activos</span>
              <span className="font-semibold">{regionalTotals.totalGrants}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Presupuesto total</span>
              <span className="font-semibold">{formatCompactCurrency(regionalTotals.totalBudget)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tasa de ejecución</span>
                <span className="font-medium">{regionalTotals.avgExecution.toFixed(1)}%</span>
              </div>
              <Progress value={regionalTotals.avgExecution} className="h-2" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pendientes</span>
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {regionalTotals.pendingGrants}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Province Detail or List */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedData ? selectedData.name : 'Provincias'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {selectedData ? (
                <div className="space-y-4">
                  {/* Province Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <FileText className="h-3 w-3" />
                        Expedientes
                      </div>
                      <p className="text-lg font-bold">{selectedData.totalGrants}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Euro className="h-3 w-3" />
                        Presupuesto
                      </div>
                      <p className="text-lg font-bold">{formatCompactCurrency(selectedData.totalBudget)}</p>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-2">
                    {selectedData.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : selectedData.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className="text-sm">
                      {selectedData.trend === 'up' ? '+' : selectedData.trend === 'down' ? '-' : ''}
                      {selectedData.trendPercentage}% vs año anterior
                    </span>
                  </div>

                  {/* Top Sectors */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Top Sectores</h4>
                    <div className="space-y-2">
                      {selectedData.topSectors.slice(0, 3).map((sector, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="truncate">{sector.name}</span>
                          <span className="font-medium">{formatCompactCurrency(sector.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GALs */}
                  {selectedData.gals.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">GALs en la provincia</h4>
                      <div className="space-y-2">
                        {selectedData.gals.map((gal) => (
                          <div key={gal.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{gal.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {gal.grants}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => onSelectProvince(selectedData.id, selectedData.name)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Ver municipios
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {provinceData.map((prov) => (
                    <div 
                      key={prov.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        hoveredProvince === prov.id ? "bg-muted border-primary" : "hover:bg-muted/50"
                      )}
                      onMouseEnter={() => setHoveredProvince(prov.id)}
                      onMouseLeave={() => setHoveredProvince(null)}
                      onClick={() => setSelectedProvince(prov.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{prov.name}</span>
                        <Badge 
                          variant={prov.status === 'critical' ? 'destructive' : prov.status === 'warning' ? 'secondary' : 'default'}
                        >
                          {prov.totalGrants}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatCompactCurrency(prov.totalBudget)}</span>
                        <span>{prov.executionRate.toFixed(0)}% ejecutado</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Cargando datos provinciales...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default GaliaRegionMap;
