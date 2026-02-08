/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Accurate geographic representation with data overlays
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
      {/* SVG Map - Updated viewBox for accurate Spain representation */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 900"
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
        style={{ maxHeight: '70vh' }}
      >
        {/* Sea background */}
        <defs>
          <linearGradient id="seaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--muted) / 0.3)" />
            <stop offset="100%" stopColor="hsl(var(--muted) / 0.1)" />
          </linearGradient>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width="1000" 
          height="900" 
          fill="url(#seaGradient)"
        />

        {/* Portugal outline (decorative) */}
        <path
          d="M50,280 L100,260 L120,300 L130,380 L120,450 L100,520 L80,580 L60,620 L40,580 L35,500 L40,400 L45,320 Z"
          fill="hsl(var(--muted) / 0.4)"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <text
          x="75"
          y="430"
          textAnchor="middle"
          className="text-[10px] fill-muted-foreground/60"
          style={{ fontStyle: 'italic' }}
        >
          Portugal
        </text>

        {/* France outline (decorative) */}
        <path
          d="M650,80 L750,60 L850,70 L920,90 L950,120 L940,150 L900,170 L850,155 L790,145 L730,160 L680,170 L650,150 L640,120 Z"
          fill="hsl(var(--muted) / 0.4)"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <text
          x="800"
          y="110"
          textAnchor="middle"
          className="text-[10px] fill-muted-foreground/60"
          style={{ fontStyle: 'italic' }}
        >
          Francia
        </text>

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
                  strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(ccaa.id)}
                  onClick={() => handleCCAAClick(ccaa.id)}
                  whileHover={{ scale: 1.01 }}
                  style={{ 
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                    transformOrigin: `${ccaa.labelPosition.x}px ${ccaa.labelPosition.y}px`
                  }}
                />

                {/* CCAA short name */}
                <text
                  x={ccaa.labelPosition.x}
                  y={ccaa.labelPosition.y - 12}
                  textAnchor="middle"
                  className="text-[9px] font-medium fill-foreground/70 pointer-events-none"
                >
                  {ccaa.shortName}
                </text>

                {/* Data label */}
                {ccaaData && (
                  <g 
                    className="pointer-events-none"
                    style={{ opacity: isLoading ? 0.3 : 1 }}
                  >
                    {/* Background pill */}
                    <rect
                      x={ccaa.labelPosition.x - 24}
                      y={ccaa.labelPosition.y - 2}
                      width="48"
                      height="18"
                      rx="9"
                      fill="hsl(var(--background) / 0.95)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    {/* Grant count */}
                    <text
                      x={ccaa.labelPosition.x}
                      y={ccaa.labelPosition.y + 11}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-foreground"
                    >
                      {ccaaData.totalGrants}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </g>

        {/* Mediterranean Sea label */}
        <text
          x="900"
          y="600"
          textAnchor="middle"
          className="text-[11px] fill-muted-foreground/50"
          style={{ fontStyle: 'italic' }}
        >
          Mar Mediterráneo
        </text>

        {/* Atlantic Ocean label */}
        <text
          x="60"
          y="180"
          textAnchor="middle"
          className="text-[11px] fill-muted-foreground/50"
          style={{ fontStyle: 'italic' }}
          transform="rotate(-45, 60, 180)"
        >
          Océano Atlántico
        </text>

        {/* Cantabrian Sea label */}
        <text
          x="350"
          y="85"
          textAnchor="middle"
          className="text-[11px] fill-muted-foreground/50"
          style={{ fontStyle: 'italic' }}
        >
          Mar Cantábrico
        </text>

        {/* Canary Islands separator */}
        <line
          x1="40"
          y1="790"
          x2="320"
          y2="790"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="6 3"
        />
        <text
          x="180"
          y="778"
          textAnchor="middle"
          className="text-[10px] fill-muted-foreground"
        >
          Islas Canarias (África)
        </text>

        {/* Ceuta & Melilla label */}
        <text
          x="400"
          y="862"
          textAnchor="middle"
          className="text-[9px] fill-muted-foreground"
        >
          Ceuta y Melilla (Norte de África)
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
              Cargando datos territoriales...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default GaliaSpainMap;
