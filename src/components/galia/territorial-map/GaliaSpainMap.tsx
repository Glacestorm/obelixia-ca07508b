/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Displays all CCAA with data overlays and click to drill-down
 */

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spainCCAAData, formatCompactCurrency } from './spain-paths';
import { CCAAMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { GaliaMapTooltip } from './GaliaMapTooltip';
import { cn } from '@/lib/utils';

interface GaliaSpainMapProps {
  data: CCAAMapData[];
  onSelectCCAA: (ccaaId: string, ccaaName: string) => void;
  selectedCCAA?: string | null;
  isLoading?: boolean;
  className?: string;
}

export const GaliaSpainMap = memo(function GaliaSpainMap({
  data,
  onSelectCCAA,
  selectedCCAA,
  isLoading = false,
  className
}: GaliaSpainMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Map data by CCAA ID for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, CCAAMapData>();
    data.forEach(d => map.set(d.id, d));
    return map;
  }, [data]);

  // Calculate max values for color scaling
  const maxGrants = useMemo(() => {
    return Math.max(...data.map(d => d.totalGrants), 1);
  }, [data]);

  // Get fill color based on data
  const getFillColor = useCallback((ccaaId: string): string => {
    const ccaaData = dataMap.get(ccaaId);
    if (!ccaaData) return 'hsl(var(--muted))';
    
    const intensity = ccaaData.totalGrants / maxGrants;
    const opacity = 0.3 + (intensity * 0.6);
    
    // Color based on status
    if (ccaaData.status === 'critical') {
      return `hsl(var(--destructive) / ${opacity})`;
    }
    if (ccaaData.status === 'warning') {
      return `hsl(45 100% 50% / ${opacity})`;
    }
    return `hsl(var(--primary) / ${opacity})`;
  }, [dataMap, maxGrants]);

  // Handle mouse move for tooltip positioning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Handle CCAA click
  const handleCCAAClick = useCallback((ccaaId: string) => {
    const ccaaInfo = spainCCAAData.find(c => c.id === ccaaId);
    if (ccaaInfo) {
      onSelectCCAA(ccaaId, ccaaInfo.name);
    }
  }, [onSelectCCAA]);

  // Get tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox="0 0 600 500"
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
      >
        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width="600" 
          height="500" 
          fill="transparent"
        />

        {/* CCAA Paths */}
        <g>
          {spainCCAAData.map((ccaa) => {
            const ccaaData = dataMap.get(ccaa.id);
            const isHovered = hoveredCCAA === ccaa.id;
            const isSelected = selectedCCAA === ccaa.id;
            
            return (
              <motion.g
                key={ccaa.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.random() * 0.2 }}
              >
                {/* Region path */}
                <motion.path
                  d={ccaa.path}
                  fill={getFillColor(ccaa.id)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isHovered || isSelected ? 2.5 : 1}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(ccaa.id)}
                  onClick={() => handleCCAAClick(ccaa.id)}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />

                {/* Data label */}
                {ccaaData && (
                  <g 
                    className="pointer-events-none"
                    style={{ opacity: isLoading ? 0.3 : 1 }}
                  >
                    {/* Background pill */}
                    <rect
                      x={ccaa.labelPosition.x - 22}
                      y={ccaa.labelPosition.y - 8}
                      width="44"
                      height="16"
                      rx="8"
                      fill="hsl(var(--background) / 0.9)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    {/* Grant count */}
                    <text
                      x={ccaa.labelPosition.x}
                      y={ccaa.labelPosition.y + 4}
                      textAnchor="middle"
                      className="text-[9px] font-semibold fill-foreground"
                    >
                      {ccaaData.totalGrants}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </g>

        {/* Canary Islands separator line */}
        <line
          x1="0"
          y1="445"
          x2="170"
          y2="445"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <text
          x="85"
          y="438"
          textAnchor="middle"
          className="text-[8px] fill-muted-foreground"
        >
          Islas Canarias
        </text>

        {/* Ceuta & Melilla label */}
        <text
          x="200"
          y="505"
          textAnchor="middle"
          className="text-[8px] fill-muted-foreground"
        >
          Ceuta y Melilla
        </text>
      </svg>

      {/* Tooltip */}
      <GaliaMapTooltip
        data={tooltipData}
        position={tooltipPosition}
        visible={!!hoveredCCAA && !!tooltipData}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Cargando datos...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default GaliaSpainMap;
