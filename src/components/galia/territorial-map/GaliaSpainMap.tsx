/**
 * GaliaSpainMap - Interactive SVG Map of Spain using TopoJSON
 * Uses official IGN geographic data for accurate representation
 * Dynamically loads geo data to reduce bundle size
 * Supports zoom-dependent labels (CCAA at low zoom, provinces at high zoom)
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as topojson from 'topojson-client';
import { geoMercator, geoPath, geoCentroid } from 'd3-geo';
import { getCCAAByTopoId, getProvinceByINECode, spainProvincesData } from './spain-paths';
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
const PROVINCE_ZOOM_THRESHOLD = 1.5; // Show province labels above this zoom level

// Cache for loaded geo data
let cachedGeoData: { ccaa: any; provinces: any } | null = null;

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
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [dimensions] = useState({ width: 700, height: 600 });
  
  // Geo data state (loaded dynamically)
  const [geoData, setGeoData] = useState<{ ccaa: any; provinces: any } | null>(cachedGeoData);
  const [geoLoading, setGeoLoading] = useState(!cachedGeoData);
  
  // Zoom and pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load geo data dynamically
  useEffect(() => {
    if (cachedGeoData) {
      setGeoData(cachedGeoData);
      setGeoLoading(false);
      return;
    }

    const loadGeoData = async () => {
      try {
        setGeoLoading(true);
        const [ccaaRes, provincesRes] = await Promise.all([
          fetch('/geo/spain-ccaa.json'),
          fetch('/geo/spain-provinces.json')
        ]);
        
        if (!ccaaRes.ok || !provincesRes.ok) {
          throw new Error('Failed to load geo data');
        }
        
        const [ccaaData, provincesData] = await Promise.all([
          ccaaRes.json(),
          provincesRes.json()
        ]);
        
        cachedGeoData = { ccaa: ccaaData, provinces: provincesData };
        setGeoData(cachedGeoData);
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

  // Convert TopoJSON to GeoJSON features
  const { ccaaFeatures, provinceFeatures } = useMemo(() => {
    if (!geoData) return { ccaaFeatures: [], provinceFeatures: [] };
    
    try {
      // CCAA features
      let ccaa: any[] = [];
      if (geoData.ccaa?.objects?.autonomous_regions) {
        const ccaaGeo = topojson.feature(geoData.ccaa, geoData.ccaa.objects.autonomous_regions);
        ccaa = (ccaaGeo as any).features || [];
      }
      
      // Province features
      let provinces: any[] = [];
      if (geoData.provinces?.objects?.provinces) {
        const provGeo = topojson.feature(geoData.provinces, geoData.provinces.objects.provinces);
        provinces = (provGeo as any).features || [];
      }
      
      return { ccaaFeatures: ccaa, provinceFeatures: provinces };
    } catch (error) {
      console.error('Error converting TopoJSON:', error);
      return { ccaaFeatures: [], provinceFeatures: [] };
    }
  }, [geoData]);

  // Create projection and path generator
  const { pathGenerator } = useMemo(() => {
    if (ccaaFeatures.length === 0) {
      return { projection: null, pathGenerator: null };
    }

    // Custom projection for Spain
    const proj = geoMercator()
      .center([-3.7, 40.4])
      .scale(2200)
      .translate([dimensions.width / 2, dimensions.height / 2]);

    const path = geoPath().projection(proj);

    return { projection: proj, pathGenerator: path };
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

  // Get province fill color (lighter version of CCAA color)
  const getProvinceFillColor = useCallback((ineCode: string): string => {
    const provinceInfo = getProvinceByINECode(ineCode);
    if (!provinceInfo) return 'hsl(var(--muted) / 0.3)';
    
    const ccaaData = dataMap.get(provinceInfo.ccaaId);
    if (!ccaaData) return 'hsl(var(--muted) / 0.3)';
    
    const intensity = ccaaData.totalGrants / maxGrants;
    const opacity = 0.15 + (intensity * 0.35);
    
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

  // Calculate label position for a feature
  const getLabelPosition = useCallback((feature: any): { x: number; y: number } | null => {
    if (!pathGenerator) return null;
    
    const centroid = pathGenerator.centroid(feature);
    if (isNaN(centroid[0]) || isNaN(centroid[1])) return null;
    
    return { x: centroid[0], y: centroid[1] };
  }, [pathGenerator]);

  // Should show province labels based on zoom
  const showProvinceLabels = transform.scale >= PROVINCE_ZOOM_THRESHOLD;

  // Loading state
  if (geoLoading || !pathGenerator || ccaaFeatures.length === 0) {
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
          {showProvinceLabels && <span className="ml-2 text-primary">• Provincias</span>}
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
          setHoveredProvince(null);
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
          {/* Province layer (shown when zoomed in) */}
          {showProvinceLabels && provinceFeatures.length > 0 && (
            <g className="provinces-layer">
              {provinceFeatures.map((feature: any) => {
                const ineCode = feature.id || feature.properties?.id;
                const provinceInfo = getProvinceByINECode(ineCode);
                const pathD = pathGenerator(feature);
                const labelPos = getLabelPosition(feature);
                
                if (!pathD) return null;

                return (
                  <g key={`prov-${ineCode}`}>
                    <path
                      d={pathD}
                      fill={getProvinceFillColor(ineCode)}
                      stroke="hsl(var(--border) / 0.5)"
                      strokeWidth={0.3}
                      className="pointer-events-none"
                    />
                    {/* Province label */}
                    {labelPos && provinceInfo && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        className="text-[6px] fill-muted-foreground font-medium pointer-events-none"
                        style={{ 
                          opacity: Math.min(1, (transform.scale - PROVINCE_ZOOM_THRESHOLD) / 0.5) 
                        }}
                      >
                        {provinceInfo.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* CCAA Paths */}
          <g className="ccaa-layer">
            {ccaaFeatures.map((feature: any) => {
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
                <g key={topoId}>
                  {/* Region path */}
                  <path
                    d={pathD}
                    fill={showProvinceLabels ? 'transparent' : getFillColor(topoId)}
                    stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isHovered || isSelected ? 2 : (showProvinceLabels ? 1 : 0.5)}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={() => setHoveredCCAA(topoId)}
                    onClick={() => handleCCAAClick(topoId)}
                  />

                  {/* CCAA Name label (shown at low zoom) */}
                  {!showProvinceLabels && labelPos && ccaaInfo && (
                    <g className="pointer-events-none">
                      {/* Background for name */}
                      <rect
                        x={labelPos.x - 25}
                        y={labelPos.y - 18}
                        width="50"
                        height="12"
                        rx="2"
                        fill="hsl(var(--background) / 0.8)"
                        stroke="hsl(var(--border) / 0.3)"
                        strokeWidth="0.3"
                      />
                      <text
                        x={labelPos.x}
                        y={labelPos.y - 10}
                        textAnchor="middle"
                        className="text-[6px] font-semibold fill-foreground"
                      >
                        {ccaaInfo.shortName}
                      </text>
                    </g>
                  )}

                  {/* Grant count label */}
                  {ccaaData && labelPos && (
                    <g 
                      className="pointer-events-none"
                      style={{ opacity: isLoading ? 0.3 : 1 }}
                    >
                      <rect
                        x={labelPos.x - 18}
                        y={labelPos.y - 8}
                        width="36"
                        height="16"
                        rx="8"
                        fill="hsl(var(--background) / 0.95)"
                        stroke="hsl(var(--border))"
                        strokeWidth="0.5"
                      />
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 4}
                        textAnchor="middle"
                        className="text-[9px] font-bold fill-foreground"
                      >
                        {ccaaData.totalGrants}
                      </text>
                    </g>
                  )}
                </g>
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
