/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Lightweight implementation with labels inside regions
 * Memory-optimized for build efficiency
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

interface GeoFeature {
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

// Projection function (outside component for memory efficiency)
const projectPoint = (lon: number, lat: number, width: number, height: number): [number, number] => {
  const centerLon = -3.7;
  const centerLat = 40.4;
  const scale = 2200;
  const x = (lon - centerLon) * (scale / 100) + width / 2;
  const y = (centerLat - lat) * (scale / 80) + height / 2;
  return [x, y];
};

// Calculate centroid from coordinates
const calculateCentroid = (coords: number[][][], width: number, height: number): { x: number; y: number } => {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  
  coords.forEach(ring => {
    ring.forEach(point => {
      const [x, y] = projectPoint(point[0], point[1], width, height);
      sumX += x;
      sumY += y;
      count++;
    });
  });
  
  return {
    x: count > 0 ? sumX / count : 0,
    y: count > 0 ? sumY / count : 0
  };
};

// Calculate centroid for MultiPolygon
const calculateMultiPolygonCentroid = (coords: number[][][][], width: number, height: number): { x: number; y: number } => {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  
  coords.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(point => {
        const [x, y] = projectPoint(point[0], point[1], width, height);
        sumX += x;
        sumY += y;
        count++;
      });
    });
  });
  
  return {
    x: count > 0 ? sumX / count : 0,
    y: count > 0 ? sumY / count : 0
  };
};

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
  const dimensions = useMemo(() => ({ width: 700, height: 600 }), []);
  
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

  // Create paths and centroids from features
  const pathData = useMemo(() => {
    if (ccaaFeatures.length === 0) return [];

    const width = dimensions.width;
    const height = dimensions.height;

    const pathFromCoords = (coords: number[][]): string => {
      if (coords.length === 0) return '';
      const points = coords.map(c => projectPoint(c[0], c[1], width, height));
      return 'M' + points.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
    };

    return ccaaFeatures.map(feature => {
      let d = '';
      const geom = feature.geometry;
      let centroid = { x: 0, y: 0 };
      
      if (geom.type === 'Polygon') {
        const coords = geom.coordinates as number[][][];
        coords.forEach(ring => {
          d += pathFromCoords(ring);
        });
        centroid = calculateCentroid(coords, width, height);
      } else if (geom.type === 'MultiPolygon') {
        const coords = geom.coordinates as number[][][][];
        coords.forEach(polygon => {
          polygon.forEach(ring => {
            d += pathFromCoords(ring);
          });
        });
        centroid = calculateMultiPolygonCentroid(coords, width, height);
      }

      return {
        id: String(feature.id),
        path: d,
        centroid
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
          {pathData.map(({ id, path, centroid }) => {
            const ccaaInfo = getCCAAByTopoId(id);
            const ccaaData = ccaaInfo ? dataMap.get(ccaaInfo.id) : null;
            const isHovered = hoveredCCAA === id;
            const isSelected = ccaaInfo && selectedCCAA === ccaaInfo.id;

            // Skip Gibraltar
            if (id === '20') return null;

            return (
              <g key={id}>
                <path
                  d={path}
                  fill={getFillColor(id)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={(isHovered || isSelected ? 2 : 0.5) / transform.scale}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(id)}
                  onClick={() => handleCCAAClick(id)}
                />

                {/* Labels inside the region - scaled inversely to maintain size */}
                {ccaaInfo && centroid.x > 0 && (
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
                      {ccaaInfo.shortName}
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
