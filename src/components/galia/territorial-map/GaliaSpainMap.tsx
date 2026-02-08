/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Ultra-lightweight with pre-defined static paths
 * Build-optimized: no dynamic imports, minimal dependencies
 */

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCCAAByTopoId, spainCCAAData } from './spain-paths';
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

// Zoom constraints
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.002;

// Pre-calculated centroids for each CCAA (stable positions)
const CCAA_CENTROIDS: Record<string, { x: number; y: number }> = {
  '01': { x: 380, y: 450 },  // Andalucía
  '02': { x: 480, y: 220 },  // Aragón
  '03': { x: 300, y: 90 },   // Asturias
  '04': { x: 620, y: 290 },  // Baleares
  '05': { x: 120, y: 540 },  // Canarias
  '06': { x: 320, y: 110 },  // Cantabria
  '07': { x: 300, y: 170 },  // Castilla y León
  '08': { x: 370, y: 310 },  // Castilla-La Mancha
  '09': { x: 560, y: 180 },  // Cataluña
  '10': { x: 510, y: 320 },  // C. Valenciana
  '11': { x: 260, y: 360 },  // Extremadura
  '12': { x: 180, y: 120 },  // Galicia
  '13': { x: 360, y: 265 },  // Madrid
  '14': { x: 460, y: 400 },  // Murcia
  '15': { x: 420, y: 145 },  // Navarra
  '16': { x: 380, y: 100 },  // País Vasco
  '17': { x: 390, y: 170 },  // La Rioja
  '18': { x: 320, y: 525 },  // Ceuta
  '19': { x: 380, y: 525 },  // Melilla
};

// Simplified SVG paths for each CCAA (approximate shapes)
const CCAA_PATHS: Record<string, string> = {
  '01': 'M230,380 L280,360 L330,370 L380,360 L430,380 L490,390 L530,420 L510,470 L470,490 L400,500 L330,490 L270,470 L230,430 Z', // Andalucía
  '02': 'M440,160 L480,150 L530,170 L540,220 L520,270 L480,280 L440,260 L420,210 Z', // Aragón
  '03': 'M250,70 L290,60 L340,70 L350,100 L320,120 L270,110 L240,90 Z', // Asturias
  '04': 'M590,270 L620,260 L650,280 L640,310 L610,320 L580,300 Z', // Baleares
  '05': 'M60,510 L100,500 L150,510 L170,540 L150,570 L100,580 L60,560 Z', // Canarias
  '06': 'M300,90 L340,80 L360,100 L350,130 L310,140 L280,120 Z', // Cantabria
  '07': 'M200,120 L260,100 L340,120 L400,140 L420,180 L400,230 L340,250 L280,230 L220,200 L200,160 Z', // Castilla y León
  '08': 'M280,260 L340,250 L420,260 L470,290 L480,350 L440,380 L380,380 L310,360 L270,320 Z', // Castilla-La Mancha
  '09': 'M520,140 L560,130 L610,150 L620,200 L590,240 L540,250 L500,220 L510,170 Z', // Cataluña
  '10': 'M480,280 L530,270 L560,310 L550,370 L510,400 L470,390 L460,340 Z', // C. Valenciana
  '11': 'M200,310 L260,290 L320,320 L330,380 L290,420 L230,420 L180,380 Z', // Extremadura
  '12': 'M120,80 L180,60 L240,80 L250,130 L220,180 L160,190 L110,160 L100,110 Z', // Galicia
  '13': 'M330,240 L370,230 L400,250 L400,290 L370,310 L330,290 Z', // Madrid
  '14': 'M430,380 L480,370 L510,400 L490,440 L440,450 L420,420 Z', // Murcia
  '15': 'M390,120 L430,110 L470,130 L460,170 L420,180 L380,160 Z', // Navarra
  '16': 'M340,80 L390,70 L430,90 L420,120 L380,130 L340,110 Z', // País Vasco
  '17': 'M370,150 L410,140 L440,160 L430,190 L390,200 L360,180 Z', // La Rioja
  '18': 'M300,510 L330,500 L350,520 L340,545 L310,550 L290,530 Z', // Ceuta
  '19': 'M360,510 L390,500 L410,520 L400,545 L370,550 L350,530 Z', // Melilla
};

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
  const dimensions = useMemo(() => ({ width: 700, height: 600 }), []);
  
  // Zoom and pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
  const getFillColor = useCallback((topoId: string): string => {
    const ccaaInfo = getCCAAByTopoId(topoId);
    if (!ccaaInfo) return 'hsl(var(--muted))';
    
    const ccaaData = dataMap.get(ccaaInfo.id);
    if (!ccaaData) return 'hsl(var(--muted) / 0.5)';
    
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

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.scale * (1 + delta)));
    
    if (newScale === transform.scale) return;

    const scaleFactor = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleFactor;
    const newY = mouseY - (mouseY - transform.y) * scaleFactor;

    setTransform({ x: newX, y: newY, scale: newScale });
  }, [transform]);

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMoveForPan = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle mouse move for tooltip
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

  // Reset zoom
  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Get tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    const ccaaInfo = getCCAAByTopoId(hoveredCCAA);
    if (!ccaaInfo) return null;
    return dataMap.get(ccaaInfo.id) || null;
  }, [hoveredCCAA, dataMap]);

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setTransform(prev => ({ 
            ...prev, 
            scale: Math.min(MAX_ZOOM, prev.scale * 1.3) 
          }))}
          className="h-8 w-8 rounded bg-background/90 border border-border hover:bg-muted flex items-center justify-center text-sm font-bold"
          title="Acercar"
        >
          +
        </button>
        <button
          onClick={() => setTransform(prev => ({ 
            ...prev, 
            scale: Math.max(MIN_ZOOM, prev.scale / 1.3) 
          }))}
          className="h-8 w-8 rounded bg-background/90 border border-border hover:bg-muted flex items-center justify-center text-sm font-bold"
          title="Alejar"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="h-8 w-8 rounded bg-background/90 border border-border hover:bg-muted flex items-center justify-center text-[10px]"
          title="Restablecer zoom"
        >
          1:1
        </button>
      </div>

      {/* Zoom level indicator */}
      {transform.scale !== 1 && (
        <div className="absolute bottom-2 left-2 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {Math.round(transform.scale * 100)}%
        </div>
      )}

      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className={cn(
          "w-full h-auto",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleMouseMoveForPan(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredCCAA(null);
          setIsPanning(false);
        }}
      >
        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width={dimensions.width} 
          height={dimensions.height} 
          fill="transparent"
        />
        
        {/* Zoomable/Pannable group */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* CCAA Paths */}
          {spainCCAAData.map(ccaa => {
            const topoId = ccaa.topoId;
            const path = CCAA_PATHS[topoId];
            const centroid = CCAA_CENTROIDS[topoId];
            const ccaaData = dataMap.get(ccaa.id);
            const isHovered = hoveredCCAA === topoId;
            const isSelected = selectedCCAA === ccaa.id;

            if (!path || !centroid) return null;

            return (
              <g key={topoId}>
                <path
                  d={path}
                  fill={getFillColor(topoId)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={(isHovered || isSelected ? 2 : 0.5) / transform.scale}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(topoId)}
                  onClick={() => handleCCAAClick(topoId)}
                />

                {/* Labels inside the region - scaled inversely to maintain size */}
                <g 
                  transform={`translate(${centroid.x}, ${centroid.y}) scale(${1 / transform.scale})`}
                  className="pointer-events-none"
                >
                  {/* CCAA Name */}
                  <text
                    x={0}
                    y={-4}
                    textAnchor="middle"
                    className="text-[10px] font-bold"
                    fill="hsl(var(--foreground))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    paintOrder="stroke"
                  >
                    {ccaa.shortName}
                  </text>
                  
                  {/* Grant count */}
                  {ccaaData && (
                    <text
                      x={0}
                      y={10}
                      textAnchor="middle"
                      className="text-[11px] font-semibold"
                      fill="hsl(var(--foreground))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      paintOrder="stroke"
                      style={{ opacity: isLoading ? 0.3 : 1 }}
                    >
                      {ccaaData.totalGrants}
                    </text>
                  )}
                </g>
              </g>
            );
          })}

          {/* Canary Islands separator */}
          <g transform="translate(50, 480)">
            <line
              x1="0"
              y1="0"
              x2="150"
              y2="0"
              stroke="hsl(var(--border))"
              strokeWidth={1 / transform.scale}
              strokeDasharray="4 2"
            />
            <text
              x="75"
              y="-8"
              textAnchor="middle"
              className="text-[8px] fill-muted-foreground"
              style={{ transform: `scale(${1 / transform.scale})`, transformOrigin: '75px -8px' }}
            >
              Islas Canarias
            </text>
          </g>
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
