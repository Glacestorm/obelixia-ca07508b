/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Simplified implementation without zoom (fixed 1:4 scale)
 * Memory-optimized with Canary Islands repositioned
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

interface GeoFeature {
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

// Fixed scale (no zoom)
const FIXED_SCALE = 2;

// Map dimensions
const WIDTH = 800;
const HEIGHT = 550;

// Projection function - projects lon/lat to SVG coordinates (larger map)
const projectPoint = (lon: number, lat: number): [number, number] => {
  const centerLon = -3.7;
  const centerLat = 40.0;
  const scale = 3000; // Adjusted scale
  const x = (lon - centerLon) * (scale / 100) + WIDTH / 2 + 70;
  const y = (centerLat - lat) * (scale / 75) + HEIGHT / 2 - 50;
  return [x, y];
};

// Offset for Canary Islands repositioning (inside the box on left)
const CANARIAS_OFFSET = { x: 100, y: -50 };

// Project point with optional offset for Canarias
const projectPointWithOffset = (
  lon: number, 
  lat: number, 
  isCanarias: boolean
): [number, number] => {
  const [x, y] = projectPoint(lon, lat);
  if (isCanarias) {
    return [x + CANARIAS_OFFSET.x, y + CANARIAS_OFFSET.y];
  }
  return [x, y];
};

// Calculate centroid from polygon coordinates
const calculateCentroid = (
  coords: number[][][], 
  isCanarias: boolean
): { x: number; y: number } => {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  
  coords.forEach(ring => {
    ring.forEach(point => {
      const [x, y] = projectPointWithOffset(point[0], point[1], isCanarias);
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
const calculateMultiPolygonCentroid = (
  coords: number[][][][], 
  isCanarias: boolean
): { x: number; y: number } => {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  
  coords.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(point => {
        const [x, y] = projectPointWithOffset(point[0], point[1], isCanarias);
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
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Geo data state
  const [ccaaFeatures, setCcaaFeatures] = useState<GeoFeature[]>(cachedCCAAData || []);
  const [geoLoading, setGeoLoading] = useState(!cachedCCAAData);

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

    const pathFromCoords = (coords: number[][], isCanarias: boolean): string => {
      if (coords.length === 0) return '';
      const points = coords.map(c => projectPointWithOffset(c[0], c[1], isCanarias));
      return 'M' + points.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
    };

    return ccaaFeatures.map(feature => {
      const isCanarias = feature.id === '05';
      let d = '';
      const geom = feature.geometry;
      let centroid = { x: 0, y: 0 };
      
      if (geom.type === 'Polygon') {
        const coords = geom.coordinates as number[][][];
        coords.forEach(ring => {
          d += pathFromCoords(ring, isCanarias);
        });
        centroid = calculateCentroid(coords, isCanarias);
      } else if (geom.type === 'MultiPolygon') {
        const coords = geom.coordinates as number[][][][];
        coords.forEach(polygon => {
          polygon.forEach(ring => {
            d += pathFromCoords(ring, isCanarias);
          });
        });
        centroid = calculateMultiPolygonCentroid(coords, isCanarias);
      }

      return {
        id: String(feature.id),
        path: d,
        centroid,
        isCanarias
      };
    });
  }, [ccaaFeatures]);

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
    <div className={cn("relative w-full", className)}>
      {/* Scale indicator */}
      <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border border-border">
        Escala 1:{FIXED_SCALE}
      </div>

      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
      >
        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width={WIDTH} 
          height={HEIGHT} 
          fill="transparent"
        />
        
        {/* Main map group */}
        <g>
          {/* CCAA Paths */}
          {pathData.map(({ id, path, centroid, isCanarias }) => {
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
                  strokeWidth={isHovered || isSelected ? 2 : 0.5}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredCCAA(id)}
                  onClick={() => handleCCAAClick(id)}
                />

                {/* Labels inside the region */}
                {ccaaInfo && centroid.x > 0 && (
                  <g 
                    className="pointer-events-none"
                  >
                    {/* CCAA Name */}
                    <text
                      x={centroid.x}
                      y={centroid.y - 4}
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
                        x={centroid.x}
                        y={centroid.y + 10}
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

          {/* Canary Islands separator box - positioned to contain islands */}
          <g>
            <rect
              x="25"
              y="420"
              width="170"
              height="120"
              fill="hsl(var(--background) / 0.5)"
              stroke="hsl(var(--border))"
              strokeWidth={1}
              strokeDasharray="4 2"
              rx={4}
            />
            <text
              x="110"
              y="438"
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground"
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
