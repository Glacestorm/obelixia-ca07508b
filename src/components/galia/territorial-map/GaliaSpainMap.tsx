/**
 * GaliaSpainMap - Interactive SVG Map of Spain using TopoJSON
 * Uses official IGN geographic data for accurate representation
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as topojson from 'topojson-client';
import { geoMercator, geoPath, GeoPath, GeoPermissibleObjects } from 'd3-geo';
import { spainCCAAData, getCCAAByTopoId } from './spain-paths';
import { CCAAMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { GaliaMapTooltip } from './GaliaMapTooltip';
import { cn } from '@/lib/utils';
import spainTopoJSON from '@/assets/spain-ccaa.json';

interface GaliaSpainMapProps {
  data: CCAAMapData[];
  onSelectCCAA: (ccaaId: string, ccaaName: string) => void;
  selectedCCAA?: string | null;
  isLoading?: boolean;
  className?: string;
}

interface TopoGeometry {
  type: string;
  id: string;
  properties: {
    name: string;
  };
  arcs: number[][][];
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
  const [dimensions, setDimensions] = useState({ width: 700, height: 600 });

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

  // Convert TopoJSON to GeoJSON features
  const geoFeatures = useMemo(() => {
    try {
      const topoData = spainTopoJSON as any;
      if (!topoData.objects?.autonomous_regions) {
        console.error('TopoJSON missing autonomous_regions object');
        return [];
      }
      
      const geoData = topojson.feature(
        topoData, 
        topoData.objects.autonomous_regions
      );
      
      return (geoData as any).features || [];
    } catch (error) {
      console.error('Error converting TopoJSON:', error);
      return [];
    }
  }, []);

  // Create projection and path generator
  const { projection, pathGenerator } = useMemo(() => {
    if (geoFeatures.length === 0) {
      return { projection: null, pathGenerator: null };
    }

    // Custom projection for Spain (centered on peninsula, Canary Islands repositioned)
    const proj = geoMercator()
      .center([-3.7, 40.4]) // Center on Spain
      .scale(2200)
      .translate([dimensions.width / 2, dimensions.height / 2]);

    const path = geoPath().projection(proj);

    return { projection: proj, pathGenerator: path };
  }, [geoFeatures, dimensions]);

  // Get fill color based on data
  const getFillColor = useCallback((topoId: string): string => {
    const ccaaInfo = getCCAAByTopoId(topoId);
    if (!ccaaInfo) return 'hsl(var(--muted))';
    
    const ccaaData = dataMap.get(ccaaInfo.id);
    if (!ccaaData) return 'hsl(var(--muted) / 0.5)';
    
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
  const handleCCAAClick = useCallback((topoId: string) => {
    const ccaaInfo = getCCAAByTopoId(topoId);
    if (ccaaInfo) {
      onSelectCCAA(ccaaInfo.id, ccaaInfo.name);
    }
  }, [onSelectCCAA]);

  // Get tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    const ccaaInfo = getCCAAByTopoId(hoveredCCAA);
    if (!ccaaInfo) return null;
    return dataMap.get(ccaaInfo.id) || null;
  }, [hoveredCCAA, dataMap]);

  // Handle hover with CCAA ID
  const handleMouseEnter = useCallback((topoId: string) => {
    setHoveredCCAA(topoId);
  }, []);

  // Calculate label position for a feature
  const getLabelPosition = useCallback((feature: any): { x: number; y: number } | null => {
    if (!pathGenerator) return null;
    
    const centroid = pathGenerator.centroid(feature);
    if (isNaN(centroid[0]) || isNaN(centroid[1])) return null;
    
    return { x: centroid[0], y: centroid[1] };
  }, [pathGenerator]);

  if (!pathGenerator || geoFeatures.length === 0) {
    return (
      <div className={cn("relative w-full flex items-center justify-center h-[500px]", className)}>
        <div className="text-muted-foreground">Cargando mapa...</div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
      >
        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width={dimensions.width} 
          height={dimensions.height} 
          fill="transparent"
        />

        {/* CCAA Paths */}
        <g>
          {geoFeatures.map((feature: any) => {
            const topoId = feature.id;
            const ccaaInfo = getCCAAByTopoId(topoId);
            const ccaaData = ccaaInfo ? dataMap.get(ccaaInfo.id) : null;
            const isHovered = hoveredCCAA === topoId;
            const isSelected = ccaaInfo && selectedCCAA === ccaaInfo.id;
            const pathD = pathGenerator(feature);
            const labelPos = getLabelPosition(feature);
            
            if (!pathD) return null;

            // Skip Gibraltar (id: 20)
            if (topoId === '20') return null;

            return (
              <motion.g
                key={topoId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.random() * 0.2 }}
              >
                {/* Region path */}
                <motion.path
                  d={pathD}
                  fill={getFillColor(topoId)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isHovered || isSelected ? 2 : 0.5}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => handleMouseEnter(topoId)}
                  onClick={() => handleCCAAClick(topoId)}
                  whileHover={{ scale: 1.01 }}
                  style={{ transformOrigin: 'center' }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />

                {/* Data label */}
                {ccaaData && labelPos && (
                  <g 
                    className="pointer-events-none"
                    style={{ opacity: isLoading ? 0.3 : 1 }}
                  >
                    {/* Background pill */}
                    <rect
                      x={labelPos.x - 18}
                      y={labelPos.y - 8}
                      width="36"
                      height="16"
                      rx="8"
                      fill="hsl(var(--background) / 0.9)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    {/* Grant count */}
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 4}
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

        {/* Canary Islands separator */}
        <g transform="translate(50, 480)">
          <line
            x1="0"
            y1="0"
            x2="150"
            y2="0"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x="75"
            y="-8"
            textAnchor="middle"
            className="text-[8px] fill-muted-foreground"
          >
            Islas Canarias
          </text>
        </g>
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
