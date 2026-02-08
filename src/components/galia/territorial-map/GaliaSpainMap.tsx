/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Lightweight implementation using dynamic JSON loading
 * Optimized for build memory efficiency
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCCAAByTopoId } from './spain-paths';
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

// Simple centroid approximations for labels
const CCAA_CENTROIDS: Record<string, { x: number; y: number }> = {
  '01': { x: 350, y: 480 }, // Andalucía
  '02': { x: 420, y: 280 }, // Aragón
  '03': { x: 280, y: 150 }, // Asturias
  '04': { x: 580, y: 350 }, // Baleares
  '05': { x: 120, y: 520 }, // Canarias
  '06': { x: 300, y: 170 }, // Cantabria
  '07': { x: 280, y: 230 }, // Castilla y León
  '08': { x: 320, y: 340 }, // Castilla-La Mancha
  '09': { x: 510, y: 240 }, // Cataluña
  '10': { x: 460, y: 360 }, // Comunitat Valenciana
  '11': { x: 220, y: 380 }, // Extremadura
  '12': { x: 170, y: 180 }, // Galicia
  '13': { x: 340, y: 320 }, // Madrid
  '14': { x: 430, y: 400 }, // Murcia
  '15': { x: 370, y: 200 }, // Navarra
  '16': { x: 340, y: 170 }, // País Vasco
  '17': { x: 360, y: 230 }, // La Rioja
  '18': { x: 260, y: 520 }, // Ceuta
  '19': { x: 290, y: 520 }, // Melilla
};

interface GeoFeature {
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

// Cache for loaded geo data
let cachedCCAAData: GeoFeature[] | null = null;

export const GaliaSpainMap = memo(function GaliaSpainMap({
  data,
  onSelectCCAA,
  selectedCCAA,
  isLoading = false,
  className
}: GaliaSpainMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [dimensions] = useState({ width: 700, height: 600 });
  
  // Geo data state
  const [ccaaFeatures, setCcaaFeatures] = useState<GeoFeature[]>(cachedCCAAData || []);
  const [geoLoading, setGeoLoading] = useState(!cachedCCAAData);
  
  // Zoom and pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load geo data dynamically
  useEffect(() => {
    if (cachedCCAAData && cachedCCAAData.length > 0) {
      setCcaaFeatures(cachedCCAAData);
      setGeoLoading(false);
      return;
    }

    const loadGeoData = async () => {
      try {
        setGeoLoading(true);
        const response = await fetch('/geo/spain-ccaa.json');
        
        if (!response.ok) {
          throw new Error('Failed to load geo data');
        }
        
        const topoData = await response.json();
        
        // Dynamically import topojson only when needed
        const topojson = await import('topojson-client');
        
        let features: GeoFeature[] = [];
        if (topoData?.objects?.autonomous_regions) {
          const geoJson = topojson.feature(topoData, topoData.objects.autonomous_regions);
          features = (geoJson as any).features || [];
        }
        
        cachedCCAAData = features;
        setCcaaFeatures(features);
      } catch (error) {
        console.error('Error loading geo data:', error);
      } finally {
        setGeoLoading(false);
      }
    };

    loadGeoData();
  }, []);

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

  // Create paths from features (memoized to avoid recomputation)
  const pathData = useMemo(() => {
    if (ccaaFeatures.length === 0) return [];

    // Dynamically compute projection
    const width = dimensions.width;
    const height = dimensions.height;
    const centerLon = -3.7;
    const centerLat = 40.4;
    const scale = 2200;

    const projectPoint = (lon: number, lat: number): [number, number] => {
      const x = (lon - centerLon) * (scale / 100) + width / 2;
      const y = (centerLat - lat) * (scale / 80) + height / 2;
      return [x, y];
    };

    const pathFromCoords = (coords: number[][]): string => {
      if (coords.length === 0) return '';
      const points = coords.map(c => projectPoint(c[0], c[1]));
      return 'M' + points.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
    };

    return ccaaFeatures.map(feature => {
      let d = '';
      const geom = feature.geometry;
      
      if (geom.type === 'Polygon') {
        const coords = geom.coordinates as number[][][];
        coords.forEach(ring => {
          d += pathFromCoords(ring);
        });
      } else if (geom.type === 'MultiPolygon') {
        const coords = geom.coordinates as number[][][][];
        coords.forEach(polygon => {
          polygon.forEach(ring => {
            d += pathFromCoords(ring);
          });
        });
      }

      return {
        id: String(feature.id),
        path: d,
      };
    });
  }, [ccaaFeatures, dimensions]);

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

  // Loading state
  if (geoLoading || pathData.length === 0) {
    return (
      <div className={cn("relative w-full flex items-center justify-center h-[500px]", className)}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full overflow-hidden", className)}
    >
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
          {pathData.map(({ id, path }) => {
            const ccaaInfo = getCCAAByTopoId(id);
            const ccaaData = ccaaInfo ? dataMap.get(ccaaInfo.id) : null;
            const isHovered = hoveredCCAA === id;
            const isSelected = ccaaInfo && selectedCCAA === ccaaInfo.id;
            const centroid = CCAA_CENTROIDS[id];

            // Skip Gibraltar
            if (id === '20') return null;

            return (
              <g key={id}>
                <path
                  d={path}
                  fill={getFillColor(id)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isHovered || isSelected ? 2 : 0.5}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(id)}
                  onClick={() => handleCCAAClick(id)}
                />

                {/* CCAA Name label */}
                {centroid && ccaaInfo && (
                  <g className="pointer-events-none">
                    <rect
                      x={centroid.x - 20}
                      y={centroid.y - 18}
                      width="40"
                      height="12"
                      rx="2"
                      fill="hsl(var(--background) / 0.85)"
                      stroke="hsl(var(--border) / 0.3)"
                      strokeWidth="0.3"
                    />
                    <text
                      x={centroid.x}
                      y={centroid.y - 10}
                      textAnchor="middle"
                      className="text-[6px] font-semibold fill-foreground"
                    >
                      {ccaaInfo.shortName}
                    </text>
                  </g>
                )}

                {/* Grant count label */}
                {ccaaData && centroid && (
                  <g 
                    className="pointer-events-none"
                    style={{ opacity: isLoading ? 0.3 : 1 }}
                  >
                    <rect
                      x={centroid.x - 16}
                      y={centroid.y - 6}
                      width="32"
                      height="14"
                      rx="7"
                      fill="hsl(var(--background) / 0.95)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    <text
                      x={centroid.x}
                      y={centroid.y + 5}
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
