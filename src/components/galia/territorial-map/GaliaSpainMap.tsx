/**
 * GaliaSpainMap - Static SVG Map of Spain
 * Ultra-lightweight implementation with no external dependencies
 * Uses pre-computed simplified paths for maximum build efficiency
 */

import { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Simplified SVG paths for each CCAA (pre-computed, no runtime processing)
const CCAA_PATHS: Record<string, { path: string; name: string; shortName: string; cx: number; cy: number }> = {
  'andalucia': {
    path: 'M120,280 L180,260 L240,270 L300,260 L340,280 L320,320 L280,350 L220,360 L160,340 L120,300 Z',
    name: 'Andalucía',
    shortName: 'AND',
    cx: 220,
    cy: 310
  },
  'aragon': {
    path: 'M320,120 L360,100 L400,110 L420,150 L400,200 L360,220 L320,200 L300,160 Z',
    name: 'Aragón',
    shortName: 'ARA',
    cx: 360,
    cy: 155
  },
  'asturias': {
    path: 'M140,60 L200,50 L240,60 L230,90 L180,100 L140,85 Z',
    name: 'Principado de Asturias',
    shortName: 'AST',
    cx: 190,
    cy: 72
  },
  'islas-baleares': {
    path: 'M440,220 L480,210 L500,230 L490,260 L450,270 L430,250 Z',
    name: 'Illes Balears',
    shortName: 'BAL',
    cx: 465,
    cy: 240
  },
  'islas-canarias': {
    path: 'M60,380 L120,375 L160,390 L150,420 L100,430 L50,415 Z',
    name: 'Canarias',
    shortName: 'CAN',
    cx: 105,
    cy: 400
  },
  'cantabria': {
    path: 'M210,50 L260,45 L290,55 L280,80 L240,90 L210,75 Z',
    name: 'Cantabria',
    shortName: 'CTB',
    cx: 250,
    cy: 65
  },
  'castilla-leon': {
    path: 'M120,90 L200,80 L280,90 L300,120 L280,180 L200,200 L140,180 L100,140 Z',
    name: 'Castilla y León',
    shortName: 'CYL',
    cx: 200,
    cy: 140
  },
  'castilla-la-mancha': {
    path: 'M200,200 L280,190 L340,210 L360,260 L320,300 L260,310 L200,280 L180,240 Z',
    name: 'Castilla-La Mancha',
    shortName: 'CLM',
    cx: 270,
    cy: 250
  },
  'cataluna': {
    path: 'M400,80 L450,70 L480,90 L490,140 L460,180 L420,190 L390,160 L380,110 Z',
    name: 'Cataluña',
    shortName: 'CAT',
    cx: 435,
    cy: 130
  },
  'comunidad-valenciana': {
    path: 'M360,200 L400,180 L430,200 L440,260 L410,300 L360,290 L340,250 Z',
    name: 'Comunitat Valenciana',
    shortName: 'VAL',
    cx: 390,
    cy: 240
  },
  'extremadura': {
    path: 'M80,200 L140,190 L180,210 L180,270 L140,300 L80,290 L60,250 Z',
    name: 'Extremadura',
    shortName: 'EXT',
    cx: 120,
    cy: 245
  },
  'galicia': {
    path: 'M40,60 L100,50 L140,70 L130,120 L80,140 L30,120 L20,80 Z',
    name: 'Galicia',
    shortName: 'GAL',
    cx: 80,
    cy: 95
  },
  'madrid': {
    path: 'M220,190 L260,180 L280,200 L270,230 L240,240 L210,220 Z',
    name: 'Comunidad de Madrid',
    shortName: 'MAD',
    cx: 245,
    cy: 210
  },
  'region-murcia': {
    path: 'M340,300 L390,290 L420,310 L410,350 L360,360 L330,340 Z',
    name: 'Región de Murcia',
    shortName: 'MUR',
    cx: 370,
    cy: 325
  },
  'navarra': {
    path: 'M280,60 L320,50 L350,65 L345,100 L310,115 L280,100 Z',
    name: 'Comunidad Foral de Navarra',
    shortName: 'NAV',
    cx: 315,
    cy: 80
  },
  'pais-vasco': {
    path: 'M250,40 L300,35 L330,50 L320,75 L280,85 L250,70 Z',
    name: 'País Vasco',
    shortName: 'PVA',
    cx: 290,
    cy: 57
  },
  'la-rioja': {
    path: 'M280,95 L320,90 L340,105 L330,130 L300,140 L275,125 Z',
    name: 'La Rioja',
    shortName: 'RIO',
    cx: 305,
    cy: 115
  },
  'ceuta': {
    path: 'M180,370 L200,365 L210,380 L195,395 L175,390 Z',
    name: 'Ciudad Autónoma de Ceuta',
    shortName: 'CEU',
    cx: 192,
    cy: 380
  },
  'melilla': {
    path: 'M230,370 L250,365 L260,380 L245,395 L225,390 Z',
    name: 'Ciudad Autónoma de Melilla',
    shortName: 'MEL',
    cx: 242,
    cy: 380
  }
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
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Map data by CCAA ID for quick lookup
  const dataMap = new Map<string, CCAAMapData>();
  data.forEach(d => dataMap.set(d.id, d));

  // Calculate max values for color scaling
  const maxGrants = Math.max(...data.map(d => d.totalGrants), 1);

  // Get fill color based on data
  const getFillColor = useCallback((ccaaId: string): string => {
    const ccaaData = dataMap.get(ccaaId);
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

  // Reset zoom
  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Get tooltip data
  const tooltipData = hoveredCCAA ? dataMap.get(hoveredCCAA) || null : null;

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
        viewBox="0 0 520 450"
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
        <rect x="0" y="0" width="520" height="450" fill="transparent" />
        
        {/* Zoomable/Pannable group */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* CCAA Paths */}
          {Object.entries(CCAA_PATHS).map(([id, ccaaPath]) => {
            const ccaaData = dataMap.get(id);
            const isHovered = hoveredCCAA === id;
            const isSelected = selectedCCAA === id;

            return (
              <g key={id}>
                <path
                  d={ccaaPath.path}
                  fill={getFillColor(id)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isHovered || isSelected ? 2 : 0.5}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(id)}
                  onClick={() => onSelectCCAA(id, ccaaPath.name)}
                />

                {/* CCAA Name label */}
                <g className="pointer-events-none">
                  <rect
                    x={ccaaPath.cx - 18}
                    y={ccaaPath.cy - 16}
                    width="36"
                    height="12"
                    rx="2"
                    fill="hsl(var(--background) / 0.85)"
                    stroke="hsl(var(--border) / 0.3)"
                    strokeWidth="0.3"
                  />
                  <text
                    x={ccaaPath.cx}
                    y={ccaaPath.cy - 8}
                    textAnchor="middle"
                    className="text-[6px] font-semibold fill-foreground"
                  >
                    {ccaaPath.shortName}
                  </text>
                </g>

                {/* Grant count label */}
                {ccaaData && (
                  <g 
                    className="pointer-events-none"
                    style={{ opacity: isLoading ? 0.3 : 1 }}
                  >
                    <rect
                      x={ccaaPath.cx - 14}
                      y={ccaaPath.cy - 2}
                      width="28"
                      height="14"
                      rx="7"
                      fill="hsl(var(--background) / 0.95)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    <text
                      x={ccaaPath.cx}
                      y={ccaaPath.cy + 9}
                      textAnchor="middle"
                      className="text-[8px] font-bold fill-foreground"
                    >
                      {ccaaData.totalGrants}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Canary Islands separator */}
          <g>
            <line
              x1="30"
              y1="365"
              x2="180"
              y2="365"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text
              x="105"
              y="358"
              textAnchor="middle"
              className="text-[8px] fill-muted-foreground"
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
