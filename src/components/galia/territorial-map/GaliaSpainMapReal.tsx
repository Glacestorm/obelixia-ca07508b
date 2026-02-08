/**
 * GaliaSpainMapReal - Accurate geographic SVG map of Spain
 * Real coordinates-based rendering with data overlay
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { realSpainCCAAData, getHeatmapColorScale, formatCompactNumber, RealCCAAData } from './spain-real-paths';
import { cn } from '@/lib/utils';

interface RegionData {
  id: string;
  totalGrants: number;
  totalBudget: number;
  executionRate: number;
  activeProjects: number;
}

interface GaliaSpainMapRealProps {
  regionData?: RegionData[];
  selectedRegion?: string | null;
  onRegionSelect?: (regionId: string) => void;
  onRegionHover?: (regionId: string | null) => void;
  showLabels?: boolean;
  showValues?: boolean;
  colorScheme?: 'blue' | 'green' | 'orange';
  className?: string;
}

// Generate mock data if not provided
const generateMockData = (): RegionData[] => {
  return realSpainCCAAData.map(ccaa => ({
    id: ccaa.id,
    totalGrants: Math.floor(Math.random() * 500) + 50,
    totalBudget: Math.floor(Math.random() * 500000000) + 10000000,
    executionRate: Math.floor(Math.random() * 40) + 50,
    activeProjects: Math.floor(Math.random() * 200) + 20
  }));
};

export function GaliaSpainMapReal({
  regionData,
  selectedRegion,
  onRegionSelect,
  onRegionHover,
  showLabels = true,
  showValues = true,
  colorScheme = 'blue',
  className
}: GaliaSpainMapRealProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{ ccaa: RealCCAAData; data: RegionData; x: number; y: number } | null>(null);

  const data = useMemo(() => regionData || generateMockData(), [regionData]);
  
  const maxGrants = useMemo(() => Math.max(...data.map(d => d.totalGrants)), [data]);

  const getRegionData = useCallback((id: string): RegionData | undefined => {
    return data.find(d => d.id === id);
  }, [data]);

  const getRegionColor = useCallback((id: string): string => {
    const regionInfo = getRegionData(id);
    if (!regionInfo) return 'hsl(220, 15%, 90%)';
    return getHeatmapColorScale(regionInfo.totalGrants, maxGrants, colorScheme);
  }, [getRegionData, maxGrants, colorScheme]);

  const handleRegionClick = useCallback((regionId: string) => {
    onRegionSelect?.(regionId);
  }, [onRegionSelect]);

  const handleRegionHover = useCallback((regionId: string | null, event?: React.MouseEvent) => {
    setHoveredRegion(regionId);
    onRegionHover?.(regionId);
    
    if (regionId && event) {
      const ccaa = realSpainCCAAData.find(c => c.id === regionId);
      const regionInfo = getRegionData(regionId);
      if (ccaa && regionInfo) {
        const rect = (event.target as SVGElement).closest('svg')?.getBoundingClientRect();
        if (rect) {
          setTooltipData({
            ccaa,
            data: regionInfo,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        }
      }
    } else {
      setTooltipData(null);
    }
  }, [onRegionHover, getRegionData]);

  const getExecutionStatusColor = (rate: number): string => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox="0 0 650 680"
        className="w-full h-auto"
        style={{ maxHeight: '70vh' }}
      >
        {/* Background */}
        <defs>
          <linearGradient id="seaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 60%, 95%)" />
            <stop offset="100%" stopColor="hsl(210, 50%, 92%)" />
          </linearGradient>
          <filter id="regionShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.15"/>
          </filter>
          <filter id="hoverGlow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Sea background */}
        <rect x="0" y="0" width="650" height="680" fill="url(#seaGradient)" />

        {/* Maritime labels */}
        <text x="80" y="50" className="text-[9px] fill-blue-400/60 italic font-light">Océano Atlántico</text>
        <text x="300" y="35" className="text-[9px] fill-blue-400/60 italic font-light">Mar Cantábrico</text>
        <text x="520" y="320" className="text-[9px] fill-blue-400/60 italic font-light">Mar Mediterráneo</text>

        {/* Country labels */}
        <text x="60" y="220" className="text-[10px] fill-muted-foreground/40 font-medium">Portugal</text>
        <text x="420" y="55" className="text-[10px] fill-muted-foreground/40 font-medium">Francia</text>
        <text x="450" y="75" className="text-[8px] fill-muted-foreground/30">Andorra</text>

        {/* Canarias inset box */}
        <rect x="55" y="555" width="290" height="130" rx="4" 
              fill="white" stroke="hsl(220, 20%, 85%)" strokeWidth="1" strokeDasharray="4 2" />
        <text x="65" y="575" className="text-[8px] fill-muted-foreground">Islas Canarias (escala diferente)</text>

        {/* Render all CCAA regions */}
        {realSpainCCAAData.map((ccaa) => {
          const isHovered = hoveredRegion === ccaa.id;
          const isSelected = selectedRegion === ccaa.id;
          const regionInfo = getRegionData(ccaa.id);
          const fillColor = getRegionColor(ccaa.id);

          return (
            <motion.g
              key={ccaa.id}
              initial={false}
              animate={{
                scale: isHovered || isSelected ? 1.02 : 1,
              }}
              style={{ transformOrigin: `${ccaa.labelPosition.x}px ${ccaa.labelPosition.y}px` }}
            >
              <motion.path
                d={ccaa.path}
                fill={fillColor}
                stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'white'}
                strokeWidth={isHovered || isSelected ? 2 : 1}
                filter={isHovered ? 'url(#hoverGlow)' : 'url(#regionShadow)'}
                className="cursor-pointer transition-colors"
                onClick={() => handleRegionClick(ccaa.id)}
                onMouseEnter={(e) => handleRegionHover(ccaa.id, e)}
                onMouseLeave={() => handleRegionHover(null)}
                initial={false}
                animate={{
                  fillOpacity: isHovered || isSelected ? 1 : 0.9,
                }}
                transition={{ duration: 0.2 }}
              />

              {/* Labels */}
              {showLabels && (
                <text
                  x={ccaa.labelPosition.x}
                  y={ccaa.labelPosition.y - (showValues && regionInfo ? 8 : 0)}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-semibold pointer-events-none select-none",
                    isHovered || isSelected ? "fill-primary" : "fill-foreground/80"
                  )}
                  style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                >
                  {ccaa.shortName}
                </text>
              )}

              {/* Value badges */}
              {showValues && regionInfo && (
                <g>
                  <rect
                    x={ccaa.labelPosition.x - 18}
                    y={ccaa.labelPosition.y + 2}
                    width="36"
                    height="16"
                    rx="8"
                    fill="white"
                    stroke="hsl(220, 20%, 80%)"
                    strokeWidth="0.5"
                    className="pointer-events-none"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                  />
                  <text
                    x={ccaa.labelPosition.x}
                    y={ccaa.labelPosition.y + 13}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-primary pointer-events-none select-none"
                  >
                    {regionInfo.totalGrants}
                  </text>
                </g>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 pointer-events-none"
            style={{
              left: Math.min(tooltipData.x + 15, 400),
              top: tooltipData.y - 10,
            }}
          >
            <div className="bg-popover/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 min-w-[200px]">
              <div className="font-semibold text-sm border-b pb-2 mb-2">
                {tooltipData.ccaa.name}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital:</span>
                  <span className="font-medium">{tooltipData.ccaa.capital}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total ayudas:</span>
                  <span className="font-bold text-primary">{tooltipData.data.totalGrants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Presupuesto:</span>
                  <span className="font-medium">{formatCompactNumber(tooltipData.data.totalBudget)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ejecución:</span>
                  <span className={cn("font-bold", getExecutionStatusColor(tooltipData.data.executionRate))}>
                    {tooltipData.data.executionRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proyectos activos:</span>
                  <span className="font-medium">{tooltipData.data.activeProjects}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground text-center">
                Clic para ver detalle regional
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GaliaSpainMapReal;
