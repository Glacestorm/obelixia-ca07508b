/**
 * GaliaRegionMap - Interactive Province Map for a CCAA
 * Loads TopoJSON from IGN for the selected autonomous community
 * Memory-optimized with lazy loading
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProvinceMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { GaliaMapTooltip } from './GaliaMapTooltip';
import { spainProvincesData, getProvincesByCCAA, formatCompactCurrency } from './spain-paths';
import { cn } from '@/lib/utils';

interface GaliaRegionMapProps {
  ccaaId: string;
  ccaaName: string;
  data: ProvinceMapData[];
  onSelectProvince: (provinceId: string, provinceName: string) => void;
  selectedProvince?: string | null;
  isLoading?: boolean;
  className?: string;
}

interface GeoFeature {
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: {
    name?: string;
    cod_prov?: string;
    [key: string]: unknown;
  };
}

// Map dimensions
const WIDTH = 600;
const HEIGHT = 500;

// Projection function for provinces (will be adjusted per CCAA)
const createProjection = (centerLon: number, centerLat: number, scale: number) => {
  return (lon: number, lat: number): [number, number] => {
    const x = (lon - centerLon) * (scale / 100) + WIDTH / 2;
    const y = (centerLat - lat) * (scale / 75) + HEIGHT / 2;
    return [x, y];
  };
};

// Calculate bounds from features
const calculateBounds = (features: GeoFeature[]): { minLon: number; maxLon: number; minLat: number; maxLat: number } => {
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  const processCoords = (coords: number[][]) => {
    coords.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  };

  features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      (feature.geometry.coordinates as number[][][]).forEach(processCoords);
    } else if (feature.geometry.type === 'MultiPolygon') {
      (feature.geometry.coordinates as number[][][][]).forEach(polygon => 
        polygon.forEach(processCoords)
      );
    }
  });

  return { minLon, maxLon, minLat, maxLat };
};

// Calculate centroid
const calculateCentroid = (
  coords: number[][][],
  project: (lon: number, lat: number) => [number, number]
): { x: number; y: number } => {
  let sumX = 0, sumY = 0, count = 0;
  coords.forEach(ring => {
    ring.forEach(point => {
      const [x, y] = project(point[0], point[1]);
      sumX += x;
      sumY += y;
      count++;
    });
  });
  return { x: count > 0 ? sumX / count : 0, y: count > 0 ? sumY / count : 0 };
};

const calculateMultiPolygonCentroid = (
  coords: number[][][][],
  project: (lon: number, lat: number) => [number, number]
): { x: number; y: number } => {
  let sumX = 0, sumY = 0, count = 0;
  coords.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(point => {
        const [x, y] = project(point[0], point[1]);
        sumX += x;
        sumY += y;
        count++;
      });
    });
  });
  return { x: count > 0 ? sumX / count : 0, y: count > 0 ? sumY / count : 0 };
};

// Province cache
const provinceCache: Record<string, GeoFeature[]> = {};

export const GaliaRegionMap = memo(function GaliaRegionMap({
  ccaaId,
  ccaaName,
  data,
  onSelectProvince,
  selectedProvince,
  isLoading = false,
  className
}: GaliaRegionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Geo data state
  const [provinceFeatures, setProvinceFeatures] = useState<GeoFeature[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);

  // Get expected provinces for this CCAA
  const expectedProvinces = useMemo(() => getProvincesByCCAA(ccaaId), [ccaaId]);

  // Load province geo data
  useEffect(() => {
    const loadProvinceData = async () => {
      // Check cache first
      if (provinceCache[ccaaId] && provinceCache[ccaaId].length > 0) {
        setProvinceFeatures(provinceCache[ccaaId]);
        setGeoLoading(false);
        return;
      }

      setGeoLoading(true);
      try {
        // Load national provinces TopoJSON
        const response = await fetch('/geo/spain-provinces.json');
        if (!response.ok) throw new Error('Failed to load province data');

        const topoData = await response.json();
        const topojson = await import('topojson-client');

        let allFeatures: GeoFeature[] = [];
        if (topoData?.objects?.provinces) {
          const geoJson = topojson.feature(topoData, topoData.objects.provinces);
          allFeatures = (geoJson as any).features || [];
        }

        // Filter to provinces in this CCAA
        const ccaaProvinceNames = expectedProvinces.map(p => p.name.toLowerCase());
        const ccaaProvinceCodes = expectedProvinces.map(p => p.ineCode);
        
        const filteredFeatures = allFeatures.filter(f => {
          const props = f.properties || {};
          const name = (props.name || '').toString().toLowerCase();
          const code = (props.cod_prov || f.id || '').toString();
          
          return ccaaProvinceNames.some(pn => name.includes(pn) || pn.includes(name)) ||
                 ccaaProvinceCodes.includes(code);
        });

        // Cache and set
        provinceCache[ccaaId] = filteredFeatures.length > 0 ? filteredFeatures : [];
        setProvinceFeatures(provinceCache[ccaaId]);
      } catch (error) {
        console.error('Error loading province data:', error);
        setProvinceFeatures([]);
      } finally {
        setGeoLoading(false);
      }
    };

    loadProvinceData();
  }, [ccaaId, expectedProvinces]);

  // Data map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, ProvinceMapData>();
    data.forEach(d => map.set(d.id, d));
    // Also map by name for fallback matching
    data.forEach(d => map.set(d.name.toLowerCase(), d));
    return map;
  }, [data]);

  // Max grants for color scaling
  const maxGrants = useMemo(() => Math.max(...data.map(d => d.totalGrants), 1), [data]);

  // Create projection based on bounds
  const { project, pathData } = useMemo(() => {
    if (provinceFeatures.length === 0) {
      return { project: null, pathData: [] };
    }

    const bounds = calculateBounds(provinceFeatures);
    const centerLon = (bounds.minLon + bounds.maxLon) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    
    // Calculate scale to fit
    const lonSpan = bounds.maxLon - bounds.minLon;
    const latSpan = bounds.maxLat - bounds.minLat;
    const scale = Math.min(
      (WIDTH * 0.8 * 100) / lonSpan,
      (HEIGHT * 0.8 * 75) / latSpan
    );

    const projectFn = createProjection(centerLon, centerLat, scale);

    const pathFromCoords = (coords: number[][]): string => {
      if (coords.length === 0) return '';
      const points = coords.map(c => projectFn(c[0], c[1]));
      return 'M' + points.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
    };

    const paths = provinceFeatures.map(feature => {
      let d = '';
      let centroid = { x: 0, y: 0 };
      const geom = feature.geometry;

      if (geom.type === 'Polygon') {
        const coords = geom.coordinates as number[][][];
        coords.forEach(ring => { d += pathFromCoords(ring); });
        centroid = calculateCentroid(coords, projectFn);
      } else if (geom.type === 'MultiPolygon') {
        const coords = geom.coordinates as number[][][][];
        coords.forEach(polygon => {
          polygon.forEach(ring => { d += pathFromCoords(ring); });
        });
        centroid = calculateMultiPolygonCentroid(coords, projectFn);
      }

      const name = feature.properties?.name || `Provincia ${feature.id}`;
      const code = feature.properties?.cod_prov || feature.id;

      return {
        id: String(code),
        name: String(name),
        path: d,
        centroid
      };
    });

    return { project: projectFn, pathData: paths };
  }, [provinceFeatures]);

  // Get fill color based on data
  const getFillColor = useCallback((provinceName: string): string => {
    const provinceData = dataMap.get(provinceName.toLowerCase());
    if (!provinceData) return 'hsl(var(--muted) / 0.5)';

    const intensity = provinceData.totalGrants / maxGrants;
    const opacity = 0.3 + (intensity * 0.6);

    if (provinceData.executionRate < 50) {
      return `hsl(var(--destructive) / ${opacity})`;
    }
    if (provinceData.executionRate < 75) {
      return `hsl(45 100% 50% / ${opacity})`;
    }
    return `hsl(var(--primary) / ${opacity})`;
  }, [dataMap, maxGrants]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Handle province click
  const handleProvinceClick = useCallback((id: string, name: string) => {
    onSelectProvince(id, name);
  }, [onSelectProvince]);

  // Tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredProvince) return null;
    return dataMap.get(hoveredProvince.toLowerCase()) || null;
  }, [hoveredProvince, dataMap]);

  // Loading state - show province cards as fallback
  if (geoLoading || pathData.length === 0) {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              {geoLoading ? 'Cargando mapa provincial...' : `Mostrando ${expectedProvinces.length} provincias`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Region title */}
      <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
        <span className="text-sm font-medium">{ccaaName}</span>
        <span className="text-xs text-muted-foreground ml-2">
          {pathData.length} provincias
        </span>
      </div>

      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto min-h-[400px]"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredProvince(null)}
      >
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />

        <g>
          {pathData.map(({ id, name, path, centroid }) => {
            const isHovered = hoveredProvince === name;
            const isSelected = selectedProvince === id;
            const provinceData = dataMap.get(name.toLowerCase());

            return (
              <g key={id}>
                <path
                  d={path}
                  fill={getFillColor(name)}
                  stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isHovered || isSelected ? 2.5 : 1}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredProvince(name)}
                  onClick={() => handleProvinceClick(id, name)}
                />

                {/* Province label */}
                {centroid.x > 0 && (
                  <g className="pointer-events-none">
                    <text
                      x={centroid.x}
                      y={centroid.y - 6}
                      textAnchor="middle"
                      className="text-[11px] font-semibold"
                      fill="hsl(var(--foreground))"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {name}
                    </text>
                    
                    {provinceData && (
                      <text
                        x={centroid.x}
                        y={centroid.y + 10}
                        textAnchor="middle"
                        className="text-[10px] font-medium"
                        fill="hsl(var(--muted-foreground))"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        paintOrder="stroke"
                      >
                        {provinceData.totalGrants} ayudas
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <GaliaMapTooltip
        data={tooltipData ? {
          id: tooltipData.id,
          name: tooltipData.name,
          shortName: tooltipData.name,
          totalGrants: tooltipData.totalGrants,
          totalBudget: tooltipData.totalBudget,
          executionRate: tooltipData.executionRate,
          pendingGrants: 0,
          approvedGrants: tooltipData.totalGrants,
          status: tooltipData.executionRate >= 75 ? 'healthy' : 
                  tooltipData.executionRate >= 50 ? 'warning' : 'critical'
        } : null}
        position={tooltipPosition}
        visible={!!hoveredProvince && !!tooltipData}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Actualizando...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default GaliaRegionMap;
