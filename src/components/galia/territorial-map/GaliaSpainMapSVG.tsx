/**
 * GaliaSpainMapSVG - Interactive Spain Map with embedded lightweight CCAA paths
 * Uses inline SVG paths to avoid memory issues during build
 */

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Minus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CCAAMapData } from "@/hooks/galia/useGaliaTerritorialMap";
import { cn } from "@/lib/utils";

import { GaliaMapTooltip } from "./GaliaMapTooltip";

// Lightweight CCAA path data (simplified polygons)
const CCAA_PATHS: Record<string, { path: string; center: [number, number]; name: string }> = {
  "galicia": {
    path: "M45,55 L60,45 L85,48 L95,60 L90,80 L75,95 L55,90 L40,75 Z",
    center: [65, 70],
    name: "Galicia"
  },
  "asturias": {
    path: "M95,60 L130,50 L155,55 L150,70 L125,75 L95,70 Z",
    center: [125, 62],
    name: "Principado de Asturias"
  },
  "cantabria": {
    path: "M155,55 L185,50 L200,55 L195,70 L170,72 L155,68 Z",
    center: [175, 60],
    name: "Cantabria"
  },
  "pais-vasco": {
    path: "M200,55 L230,48 L245,55 L240,72 L220,78 L200,72 Z",
    center: [220, 62],
    name: "País Vasco"
  },
  "navarra": {
    path: "M245,55 L275,50 L290,60 L285,85 L260,90 L245,78 Z",
    center: [265, 70],
    name: "Navarra"
  },
  "la-rioja": {
    path: "M220,78 L245,78 L255,95 L240,110 L215,105 L210,88 Z",
    center: [230, 92],
    name: "La Rioja"
  },
  "aragon": {
    path: "M285,85 L320,70 L355,85 L360,140 L340,180 L300,175 L275,130 Z",
    center: [315, 125],
    name: "Aragón"
  },
  "cataluna": {
    path: "M355,85 L400,75 L420,90 L415,140 L380,165 L355,150 L360,110 Z",
    center: [385, 115],
    name: "Cataluña"
  },
  "castilla-leon": {
    path: "M85,80 L150,70 L200,72 L220,88 L240,110 L275,130 L260,165 L200,180 L140,175 L95,150 L75,110 Z",
    center: [170, 125],
    name: "Castilla y León"
  },
  "madrid": {
    path: "M200,180 L230,175 L245,190 L240,215 L215,220 L195,205 Z",
    center: [220, 198],
    name: "Comunidad de Madrid"
  },
  "castilla-la-mancha": {
    path: "M195,205 L240,190 L290,175 L340,180 L345,230 L320,280 L260,290 L200,270 L180,230 Z",
    center: [265, 235],
    name: "Castilla-La Mancha"
  },
  "extremadura": {
    path: "M75,180 L140,175 L180,195 L180,250 L145,290 L95,280 L65,235 Z",
    center: [120, 230],
    name: "Extremadura"
  },
  "comunidad-valenciana": {
    path: "M340,180 L375,170 L395,200 L385,260 L355,295 L320,280 L330,220 Z",
    center: [355, 230],
    name: "Comunidad Valenciana"
  },
  "islas-baleares": {
    path: "M420,180 L455,175 L470,195 L465,220 L435,230 L415,210 Z M475,200 L495,195 L500,215 L485,225 L470,215 Z",
    center: [455, 200],
    name: "Islas Baleares"
  },
  "region-murcia": {
    path: "M320,280 L355,295 L365,330 L340,350 L300,340 L295,310 Z",
    center: [330, 318],
    name: "Región de Murcia"
  },
  "andalucia": {
    path: "M95,280 L200,270 L295,310 L300,340 L280,380 L200,400 L120,390 L70,350 L65,300 Z",
    center: [180, 340],
    name: "Andalucía"
  },
  "islas-canarias": {
    path: "M50,430 L85,425 L100,445 L90,465 L55,470 L40,450 Z M110,440 L140,435 L155,455 L145,475 L115,478 L100,460 Z",
    center: [100, 455],
    name: "Islas Canarias"
  },
  "ceuta": {
    path: "M175,415 L190,410 L195,425 L180,430 Z",
    center: [185, 420],
    name: "Ceuta"
  },
  "melilla": {
    path: "M310,405 L325,400 L330,415 L315,420 Z",
    center: [320, 410],
    name: "Melilla"
  }
};

interface GaliaSpainMapSVGProps {
  data: CCAAMapData[];
  onSelectCCAA: (ccaaId: string, ccaaName: string) => void;
  selectedCCAA?: string | null;
  isLoading?: boolean;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const GaliaSpainMapSVG = memo(function GaliaSpainMapSVG({
  data,
  onSelectCCAA,
  selectedCCAA,
  isLoading = false,
  className,
}: GaliaSpainMapSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dataMap = useMemo(() => {
    const map = new Map<string, CCAAMapData>();
    data.forEach((d) => map.set(d.id, d));
    return map;
  }, [data]);

  const maxGrants = useMemo(() => Math.max(...data.map((d) => d.totalGrants), 1), [data]);

  // Get fill color based on data
  const getFillColor = useCallback(
    (ccaaId: string): string => {
      const ccaaData = dataMap.get(ccaaId);
      if (!ccaaData) return "hsl(var(--muted) / 0.5)";

      const intensity = clamp(ccaaData.totalGrants / maxGrants, 0.2, 1);
      const alpha = 0.3 + intensity * 0.6;

      if (ccaaData.status === "critical") return `hsl(var(--destructive) / ${alpha})`;
      if (ccaaData.status === "warning") return `hsl(348 83% 47% / ${alpha})`; // orange-ish
      return `hsl(var(--primary) / ${alpha})`;
    },
    [dataMap, maxGrants]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    setZoom((z) => clamp(z + (delta > 0 ? -0.15 : 0.15), 1, 3));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border bg-gradient-to-br from-background via-muted/20 to-background"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
        onWheel={handleWheel}
        style={{ touchAction: "none" }}
      >
        <svg
          viewBox="0 0 520 500"
          className="w-full h-auto"
          style={{
            maxHeight: "65vh",
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "center center",
            transition: "transform 150ms ease-out"
          }}
        >
          {/* Background with subtle grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="520" height="500" fill="url(#grid)" />

          {/* Maritime labels */}
          <text x="30" y="35" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.6" fontStyle="italic">
            Mar Cantábrico
          </text>
          <text x="440" y="320" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.6" fontStyle="italic">
            Mar Mediterráneo
          </text>
          <text x="25" y="350" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.6" fontStyle="italic">
            Océano Atlántico
          </text>

          {/* CCAA paths */}
          {Object.entries(CCAA_PATHS).map(([ccaaId, { path, center, name }]) => {
            const isHovered = hoveredCCAA === ccaaId;
            const isSelected = selectedCCAA === ccaaId;
            const dimmed = !!hoveredCCAA && !isHovered;
            const ccaaData = dataMap.get(ccaaId);

            return (
              <g key={ccaaId}>
                <motion.path
                  d={path}
                  fill={getFillColor(ccaaId)}
                  stroke={isHovered || isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                  style={{
                    cursor: "pointer",
                    opacity: dimmed ? 0.35 : 1,
                    filter: isHovered ? "brightness(1.1)" : "none",
                  }}
                  initial={false}
                  animate={{
                    scale: isHovered ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.15 }}
                  onMouseEnter={() => setHoveredCCAA(ccaaId)}
                  onMouseLeave={() => setHoveredCCAA(null)}
                  onClick={() => onSelectCCAA(ccaaId, name)}
                />
                
                {/* CCAA label */}
                <text
                  x={center[0]}
                  y={center[1]}
                  fontSize="7"
                  fontWeight="600"
                  fill="hsl(var(--foreground))"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: "none", opacity: dimmed ? 0.3 : 0.9 }}
                >
                  {name.length > 12 ? name.substring(0, 10) + "…" : name}
                </text>

                {/* Data badge */}
                {ccaaData && (
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={center[0] - 18}
                      y={center[1] + 8}
                      width="36"
                      height="14"
                      rx="3"
                      fill="hsl(var(--background) / 0.85)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    <text
                      x={center[0]}
                      y={center[1] + 17}
                      fontSize="6"
                      fontWeight="500"
                      fill="hsl(var(--primary))"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {ccaaData.totalGrants} ayudas
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Canarias inset box */}
          <rect x="35" y="415" width="130" height="70" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="3,2" rx="4" />
          <text x="100" y="412" fontSize="6" fill="hsl(var(--muted-foreground))" textAnchor="middle" opacity="0.7">
            Islas Canarias
          </text>
        </svg>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          onClick={() => setZoom((z) => clamp(z + 0.25, 1, 3))}
          aria-label="Acercar"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          onClick={() => setZoom((z) => clamp(z - 0.25, 1, 3))}
          aria-label="Alejar"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          onClick={handleReset}
          aria-label="Reiniciar zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCCAA && tooltipData && (
          <GaliaMapTooltip data={tooltipData} position={tooltipPosition} visible />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
});

export default GaliaSpainMapSVG;
