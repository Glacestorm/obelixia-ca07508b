/**
 * GaliaSpainMapSVG - Mapa interactivo de España con CCAA
 * Paths geográficos precisos basados en datos del IGN
 * ViewBox optimizado: 0 0 1000 900
 */

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Minus, RotateCcw, Move } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CCAAMapData } from "@/hooks/galia/useGaliaTerritorialMap";
import { cn } from "@/lib/utils";

import { GaliaMapTooltip } from "./GaliaMapTooltip";

// Paths geográficos precisos de las CCAA de España
// Basados en coordenadas reales del Instituto Geográfico Nacional
const SPAIN_CCAA: Record<string, { 
  path: string; 
  center: [number, number]; 
  name: string;
  labelOffset?: [number, number];
}> = {
  "galicia": {
    path: "M95,120 L120,95 L155,85 L185,90 L210,105 L215,130 L205,165 L180,190 L145,200 L110,190 L85,165 L80,135 Z",
    center: [145, 140],
    name: "Galicia"
  },
  "asturias": {
    path: "M210,95 L255,80 L305,78 L345,85 L360,105 L350,130 L315,140 L265,142 L225,135 L210,115 Z",
    center: [280, 108],
    name: "Asturias"
  },
  "cantabria": {
    path: "M360,85 L400,78 L435,82 L455,100 L450,125 L425,138 L385,140 L360,128 L355,105 Z",
    center: [405, 108],
    name: "Cantabria"
  },
  "pais-vasco": {
    path: "M455,82 L495,75 L535,80 L555,100 L548,125 L520,140 L480,142 L455,128 L450,105 Z",
    center: [500, 108],
    name: "País Vasco"
  },
  "navarra": {
    path: "M535,80 L580,72 L625,80 L655,105 L655,145 L635,185 L590,200 L550,188 L530,150 L530,110 Z",
    center: [590, 130],
    name: "Navarra"
  },
  "la-rioja": {
    path: "M455,142 L505,135 L545,150 L555,185 L535,218 L490,230 L455,215 L448,178 Z",
    center: [500, 180],
    name: "La Rioja"
  },
  "aragon": {
    path: "M555,188 L615,155 L680,130 L745,140 L785,180 L800,260 L785,360 L745,435 L680,460 L610,445 L565,400 L545,325 L545,250 Z",
    center: [670, 295],
    name: "Aragón"
  },
  "cataluna": {
    path: "M745,125 L810,108 L875,120 L935,160 L965,220 L960,295 L925,365 L865,402 L800,415 L750,385 L728,320 L735,245 L740,175 Z",
    center: [845, 260],
    name: "Cataluña"
  },
  "castilla-leon": {
    path: "M145,185 L225,168 L315,158 L400,165 L465,188 L520,225 L560,285 L580,360 L550,430 L485,480 L395,502 L295,498 L205,465 L150,415 L125,355 L115,290 L125,225 Z",
    center: [345, 330],
    name: "Castilla y León"
  },
  "madrid": {
    path: "M385,445 L445,425 L490,450 L505,500 L480,545 L435,562 L390,545 L378,495 Z",
    center: [440, 495],
    name: "Madrid"
  },
  "castilla-la-mancha": {
    path: "M295,498 L395,502 L505,525 L585,500 L660,538 L730,600 L758,685 L708,765 L610,802 L495,815 L375,790 L280,745 L245,665 L260,580 Z",
    center: [505, 660],
    name: "Castilla-La Mancha"
  },
  "extremadura": {
    path: "M85,420 L160,408 L245,435 L280,502 L295,595 L268,675 L210,735 L135,748 L70,712 L38,645 L45,568 L62,488 Z",
    center: [170, 580],
    name: "Extremadura"
  },
  "comunidad-valenciana": {
    path: "M730,480 L795,425 L860,408 L915,448 L955,520 L948,615 L915,700 L858,748 L790,735 L750,685 L728,605 Z",
    center: [840, 575],
    name: "C. Valenciana"
  },
  "islas-baleares": {
    path: "M875,385 L920,372 L970,392 L985,432 L968,475 L925,490 L888,472 L875,428 Z M935,498 L978,488 L1008,515 L998,555 L962,565 L935,540 Z M890,535 L920,528 L945,548 L935,578 L902,585 L882,560 Z",
    center: [925, 445],
    name: "Illes Balears",
    labelOffset: [0, -30]
  },
  "region-murcia": {
    path: "M750,735 L818,710 L880,748 L910,808 L885,868 L822,895 L758,872 L732,808 Z",
    center: [818, 800],
    name: "R. de Murcia"
  },
  "andalucia": {
    path: "M70,745 L160,748 L275,745 L385,790 L525,815 L642,832 L732,858 L758,922 L708,982 L575,1010 L428,1002 L282,982 L162,945 L75,902 L30,838 L42,778 Z",
    center: [400, 878],
    name: "Andalucía"
  },
  "islas-canarias": {
    path: "M50,820 L85,810 L120,825 L128,860 L102,880 L58,875 Z M145,805 L188,792 L228,812 L238,850 L205,875 L158,862 Z M250,785 L308,772 L358,795 L368,842 L328,872 L275,858 Z",
    center: [200, 835],
    name: "Canarias",
    labelOffset: [0, 10]
  },
  "ceuta": {
    path: "M355,1012 L378,1002 L398,1018 L390,1042 L365,1050 L348,1035 Z",
    center: [372, 1028],
    name: "Ceuta"
  },
  "melilla": {
    path: "M445,1012 L468,1002 L488,1018 L480,1042 L455,1050 L438,1035 Z",
    center: [462, 1028],
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
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const dataMap = useMemo(() => {
    const map = new Map<string, CCAAMapData>();
    data.forEach((d) => map.set(d.id, d));
    return map;
  }, [data]);

  const maxGrants = useMemo(() => Math.max(...data.map((d) => d.totalGrants), 1), [data]);

  const getFillColor = useCallback(
    (ccaaId: string): string => {
      const ccaaData = dataMap.get(ccaaId);
      if (!ccaaData) return "hsl(var(--muted) / 0.5)";

      const intensity = clamp(ccaaData.totalGrants / maxGrants, 0.15, 1);
      
      // Status-based coloring
      if (ccaaData.status === "critical") {
        return `hsl(0 65% ${70 - intensity * 25}%)`;
      }
      if (ccaaData.status === "warning") {
        return `hsl(35 80% ${70 - intensity * 25}%)`;
      }
      
      // Green gradient for healthy status
      return `hsl(145 55% ${75 - intensity * 35}%)`;
    },
    [dataMap, maxGrants]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prev => ({
        x: clamp(prev.x + dx, -200, 200),
        y: clamp(prev.y + dy, -200, 200)
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isPanning, panStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    setZoom((z) => clamp(z + (delta > 0 ? -0.15 : 0.15), 0.8, 3));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border",
          "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50",
          "dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
          isPanning && "cursor-grabbing"
        )}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredCCAA(null);
          setIsPanning(false);
        }}
        onWheel={handleWheel}
        style={{ touchAction: "none" }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 1080"
          className="w-full h-auto"
          style={{
            maxHeight: "72vh",
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 200ms ease-out"
          }}
        >
          {/* Fondo océano/mar */}
          <defs>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(200 40% 92%)" />
              <stop offset="100%" stopColor="hsl(210 50% 88%)" />
            </linearGradient>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>
          
          <rect width="1000" height="1080" fill="url(#oceanGradient)" className="dark:fill-slate-800" />
          
          {/* Portugal (silueta gris) */}
          <path
            d="M20,130 L55,120 L85,165 L85,420 L70,712 L38,745 L15,700 L10,500 L15,300 Z"
            fill="hsl(0 0% 82%)"
            stroke="hsl(0 0% 72%)"
            strokeWidth="1"
            className="dark:fill-slate-700"
          />
          <text x="45" y="430" fontSize="12" fill="hsl(0 0% 55%)" fontWeight="500" transform="rotate(-90 45 430)">Portugal</text>
          
          {/* Francia (silueta gris) */}
          <path
            d="M530,70 L620,50 L750,45 L880,58 L960,45 L1000,65 L1000,150 L935,160 L810,108 L680,100 L580,72 Z"
            fill="hsl(0 0% 82%)"
            stroke="hsl(0 0% 72%)"
            strokeWidth="1"
            className="dark:fill-slate-700"
          />
          <text x="820" y="85" fontSize="14" fill="hsl(0 0% 55%)" fontWeight="500">Francia</text>
          
          {/* Andorra */}
          <ellipse cx="645" cy="98" rx="12" ry="10" fill="hsl(0 0% 88%)" stroke="hsl(0 0% 72%)" strokeWidth="0.8" />
          <text x="645" y="102" fontSize="8" fill="hsl(0 0% 50%)" textAnchor="middle">AND</text>

          {/* Etiquetas marítimas */}
          <text x="280" y="55" fontSize="14" fill="hsl(210 40% 55%)" fontStyle="italic" opacity="0.7" fontWeight="300">
            Mar Cantábrico
          </text>
          <text x="920" y="280" fontSize="12" fill="hsl(210 40% 55%)" fontStyle="italic" opacity="0.7" fontWeight="300" transform="rotate(80 920 280)">
            Mar Mediterráneo
          </text>
          <text x="25" y="560" fontSize="11" fill="hsl(210 40% 55%)" fontStyle="italic" opacity="0.7" fontWeight="300" transform="rotate(-80 25 560)">
            Océano Atlántico
          </text>

          {/* Marruecos */}
          <path
            d="M150,1020 L300,1005 L480,1012 L650,1035 L620,1080 L350,1080 L150,1065 Z"
            fill="hsl(0 0% 84%)"
            stroke="hsl(0 0% 74%)"
            strokeWidth="1"
            className="dark:fill-slate-700"
          />
          <text x="400" y="1055" fontSize="13" fill="hsl(0 0% 50%)" textAnchor="middle">Marruecos</text>

          {/* Recuadro para Canarias */}
          <rect 
            x="35" 
            y="775" 
            width="340" 
            height="120" 
            fill="none" 
            stroke="hsl(0 0% 60%)" 
            strokeWidth="1" 
            strokeDasharray="6,3" 
            rx="4"
          />
          <text x="205" y="900" fontSize="9" fill="hsl(0 0% 55%)" textAnchor="middle" fontStyle="italic">
            Islas Canarias (representación esquemática)
          </text>

          {/* CCAA paths */}
          <g filter="url(#dropShadow)">
            {Object.entries(SPAIN_CCAA).map(([ccaaId, { path, center, name }]) => {
              const isHovered = hoveredCCAA === ccaaId;
              const isSelected = selectedCCAA === ccaaId;
              const dimmed = !!hoveredCCAA && !isHovered;

              return (
                <motion.path
                  key={ccaaId}
                  d={path}
                  fill={getFillColor(ccaaId)}
                  stroke={isHovered || isSelected ? "hsl(var(--primary))" : "hsl(0 0% 35%)"}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                  style={{
                    cursor: "pointer",
                    opacity: dimmed ? 0.45 : 1,
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
              );
            })}
          </g>

          {/* Labels de CCAA */}
          {zoom >= 0.8 && Object.entries(SPAIN_CCAA).map(([ccaaId, { center, name, labelOffset }]) => {
            const dimmed = !!hoveredCCAA && hoveredCCAA !== ccaaId;
            const ccaaData = dataMap.get(ccaaId);
            
            // Saltar labels para territorios muy pequeños
            if (["ceuta", "melilla"].includes(ccaaId) && zoom < 1.5) return null;

            const labelX = center[0] + (labelOffset?.[0] || 0);
            const labelY = center[1] + (labelOffset?.[1] || 0);

            return (
              <g key={`label-${ccaaId}`} style={{ pointerEvents: "none" }}>
                <text
                  x={labelX}
                  y={labelY - 8}
                  fontSize={ccaaId === "islas-canarias" ? "10" : "11"}
                  fontWeight="600"
                  fill="hsl(0 0% 15%)"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  opacity={dimmed ? 0.35 : 0.9}
                  className="dark:fill-white"
                  style={{ textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
                >
                  {name}
                </text>
                {ccaaData && zoom >= 1 && (
                  <text
                    x={labelX}
                    y={labelY + 10}
                    fontSize="9"
                    fontWeight="500"
                    fill="hsl(145 60% 28%)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={dimmed ? 0.25 : 0.75}
                    className="dark:fill-green-300"
                  >
                    {ccaaData.totalGrants} ayudas
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controles de zoom */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 shadow-lg bg-background/95 backdrop-blur-sm hover:bg-background"
          onClick={() => setZoom((z) => clamp(z + 0.25, 0.8, 3))}
          title="Acercar"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 shadow-lg bg-background/95 backdrop-blur-sm hover:bg-background"
          onClick={() => setZoom((z) => clamp(z - 0.25, 0.8, 3))}
          title="Alejar"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 shadow-lg bg-background/95 backdrop-blur-sm hover:bg-background"
          onClick={resetView}
          title="Restablecer vista"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Indicador de zoom y ayuda */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
        <div className="bg-background/90 backdrop-blur-sm px-2.5 py-1.5 rounded-md text-xs text-muted-foreground border shadow-sm">
          {Math.round(zoom * 100)}%
        </div>
        <div className="bg-background/90 backdrop-blur-sm px-2.5 py-1.5 rounded-md text-xs text-muted-foreground border shadow-sm flex items-center gap-1.5">
          <Move className="h-3 w-3" />
          <span>Shift + arrastrar</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCCAA && tooltipData && (
          <GaliaMapTooltip data={tooltipData} position={tooltipPosition} visible />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl z-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
});

export default GaliaSpainMapSVG;
