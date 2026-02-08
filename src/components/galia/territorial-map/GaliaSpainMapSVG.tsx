/**
 * GaliaSpainMapSVG - Interactive Spain Map (IGN-style)
 * Geographically accurate CCAA paths with zoom, pan, search, layers, tooltips
 * Based on IGN Atlas Didáctico styling with data overlay capabilities
 */

import { memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Minus, RotateCcw, Search, Layers, X, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CCAAMapData } from "@/hooks/galia/useGaliaTerritorialMap";
import { cn } from "@/lib/utils";

import { GaliaMapTooltip } from "./GaliaMapTooltip";

// Accurate CCAA SVG paths based on IGN geographic data
// ViewBox: 0 0 800 700 - optimized for Spain's proportions including Canarias inset
const CCAA_PATHS: Record<
  string,
  { path: string; center: [number, number]; name: string; shortName: string }
> = {
  galicia: {
    path: "M52,120 L75,100 L100,92 L130,95 L155,108 L165,130 L160,160 L145,188 L118,205 L85,210 L58,198 L42,172 L38,145 L45,128 Z",
    center: [98, 152],
    name: "Galicia",
    shortName: "GAL",
  },
  asturias: {
    path: "M165,118 L195,105 L235,98 L280,102 L310,118 L315,138 L298,158 L260,168 L220,170 L188,162 L168,145 L162,128 Z",
    center: [238, 135],
    name: "Principado de Asturias",
    shortName: "AST",
  },
  cantabria: {
    path: "M310,108 L345,98 L382,102 L405,118 L408,140 L392,158 L358,165 L328,160 L312,142 L308,122 Z",
    center: [358, 130],
    name: "Cantabria",
    shortName: "CANT",
  },
  "pais-vasco": {
    path: "M405,105 L440,95 L478,100 L502,118 L508,142 L492,162 L458,172 L428,168 L408,150 L402,128 Z",
    center: [452, 132],
    name: "País Vasco",
    shortName: "PVA",
  },
  navarra: {
    path: "M502,108 L538,95 L578,102 L608,125 L615,165 L600,208 L562,228 L525,218 L505,180 L498,145 Z",
    center: [555, 162],
    name: "C.F. de Navarra",
    shortName: "NAV",
  },
  "la-rioja": {
    path: "M428,168 L468,158 L505,178 L515,215 L495,248 L455,260 L425,245 L418,208 L422,182 Z",
    center: [462, 210],
    name: "La Rioja",
    shortName: "RIO",
  },
  aragon: {
    path: "M525,218 L575,185 L635,162 L698,172 L735,215 L750,295 L735,392 L698,468 L638,495 L575,480 L535,432 L518,358 L522,285 Z",
    center: [632, 335],
    name: "Aragón",
    shortName: "ARA",
  },
  cataluna: {
    path: "M698,158 L758,142 L822,155 L875,198 L905,262 L898,338 L865,405 L808,442 L748,455 L705,425 L688,358 L695,285 L698,215 Z",
    center: [795, 298],
    name: "Cataluña",
    shortName: "CAT",
  },
  "castilla-leon": {
    path: "M118,205 L175,188 L245,175 L328,182 L408,195 L468,235 L512,295 L535,372 L508,445 L445,495 L362,518 L275,512 L198,478 L148,428 L122,368 L115,305 L120,248 Z",
    center: [318, 352],
    name: "Castilla y León",
    shortName: "CYL",
  },
  madrid: {
    path: "M445,475 L488,455 L528,482 L542,532 L518,578 L478,592 L438,575 L428,528 L435,492 Z",
    center: [482, 525],
    name: "C. de Madrid",
    shortName: "MAD",
  },
  "castilla-la-mancha": {
    path: "M362,518 L438,508 L535,532 L618,515 L698,555 L762,625 L788,715 L735,795 L632,832 L522,845 L412,818 L318,768 L282,688 L298,605 L335,545 Z",
    center: [538, 675],
    name: "Castilla-La Mancha",
    shortName: "CLM",
  },
  extremadura: {
    path: "M88,445 L158,432 L245,458 L315,535 L328,628 L298,715 L238,772 L162,785 L98,748 L62,675 L68,595 L78,518 Z",
    center: [192, 608],
    name: "Extremadura",
    shortName: "EXT",
  },
  "comunidad-valenciana": {
    path: "M698,508 L758,455 L825,435 L878,475 L912,552 L905,648 L872,738 L815,785 L755,768 L715,715 L695,638 L698,568 Z",
    center: [802, 605],
    name: "C. Valenciana",
    shortName: "VAL",
  },
  "islas-baleares": {
    // Mallorca + Menorca + Ibiza/Formentera
    path: "M788,355 L825,342 L868,358 L882,395 L865,435 L825,448 L792,432 L778,398 Z M838,458 L875,448 L905,472 L895,508 L862,518 L835,498 Z M802,488 L828,478 L848,498 L838,528 L808,535 L792,512 Z",
    center: [838, 425],
    name: "Illes Balears",
    shortName: "BAL",
  },
  "region-murcia": {
    path: "M715,768 L775,738 L835,778 L862,838 L838,898 L778,922 L718,898 L695,842 L702,795 Z",
    center: [775, 832],
    name: "Región de Murcia",
    shortName: "MUR",
  },
  andalucia: {
    path: "M62,772 L162,785 L282,768 L412,818 L555,848 L698,878 L762,942 L718,1005 L598,1035 L448,1028 L302,1005 L178,965 L92,918 L48,862 L55,808 Z",
    center: [398, 898],
    name: "Andalucía",
    shortName: "AND",
  },
  "islas-canarias": {
    // 7 islands simplified - positioned in bottom-left inset
    path: "M55,585 L88,575 L118,595 L125,628 L102,648 L68,642 L52,615 Z M135,565 L175,552 L212,575 L218,612 L188,635 L152,625 L135,595 Z M225,548 L278,535 L328,562 L335,608 L298,638 L252,628 L228,588 Z",
    center: [185, 598],
    name: "Canarias",
    shortName: "CAN",
  },
  ceuta: {
    path: "M348,945 L372,935 L392,952 L385,975 L358,985 L338,968 Z",
    center: [365, 958],
    name: "Ceuta",
    shortName: "CEU",
  },
  melilla: {
    path: "M432,938 L458,928 L478,945 L472,968 L448,978 L428,962 Z",
    center: [452, 952],
    name: "Melilla",
    shortName: "MEL",
  },
};

interface GaliaSpainMapSVGProps {
  data: CCAAMapData[];
  onSelectCCAA: (ccaaId: string, ccaaName: string) => void;
  selectedCCAA?: string | null;
  isLoading?: boolean;
  className?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const GaliaSpainMapSVG = memo(function GaliaSpainMapSVG({
  data,
  onSelectCCAA,
  selectedCCAA,
  isLoading = false,
  className,
}: GaliaSpainMapSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // State
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [showDataBadges, setShowDataBadges] = useState(true);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);

  // Data map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, CCAAMapData>();
    data.forEach((d) => map.set(d.id, d));
    return map;
  }, [data]);

  const maxGrants = useMemo(
    () => Math.max(...data.map((d) => d.totalGrants), 1),
    [data]
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return Object.entries(CCAA_PATHS)
      .filter(
        ([, ccaa]) =>
          ccaa.name.toLowerCase().includes(q) ||
          ccaa.shortName.toLowerCase().includes(q)
      )
      .map(([id, ccaa]) => ({ id, ...ccaa }));
  }, [searchQuery]);

  // Color based on data
  const getFillColor = useCallback(
    (ccaaId: string): string => {
      const ccaaData = dataMap.get(ccaaId);
      if (!ccaaData) return "hsl(var(--muted) / 0.5)";

      const intensity = clamp(ccaaData.totalGrants / maxGrants, 0.15, 1);

      if (ccaaData.status === "critical")
        return `hsl(0 65% ${75 - intensity * 35}%)`;
      if (ccaaData.status === "warning")
        return `hsl(35 80% ${75 - intensity * 30}%)`;

      // Green IGN-style gradient
      return `hsl(145 55% ${78 - intensity * 40}%)`;
    },
    [dataMap, maxGrants]
  );

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      if (isPanning) {
        const dx = e.clientX - lastPanPoint.x;
        const dy = e.clientY - lastPanPoint.y;
        setPan((p) => ({
          x: clamp(p.x + dx, -300 * zoom, 300 * zoom),
          y: clamp(p.y + dy, -200 * zoom, 200 * zoom),
        }));
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    },
    [isPanning, lastPanPoint, zoom]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
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

  // Zoom controls
  const zoomIn = useCallback(() => setZoom((z) => clamp(z + 0.25, 0.8, 3)), []);
  const zoomOut = useCallback(() => setZoom((z) => clamp(z - 0.25, 0.8, 3)), []);
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Search selection
  const handleSearchSelect = useCallback(
    (ccaaId: string, ccaaName: string) => {
      setSearchQuery("");
      onSelectCCAA(ccaaId, ccaaName);
    },
    [onSelectCCAA]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchQuery("");
      }
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, resetView]);

  // Tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  return (
    <div className={cn("relative w-full select-none", className)}>
      {/* Top toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        {/* Search */}
        <div className="relative pointer-events-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar región..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 w-56 bg-background/95 backdrop-blur-sm shadow-md"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Search results dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-30"
              >
                <ScrollArea className="max-h-48">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                      onClick={() => handleSearchSelect(result.id, result.name)}
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{result.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {result.shortName}
                      </Badge>
                    </button>
                  ))}
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />

        {/* Layers control */}
        <Popover open={isLayersPanelOpen} onOpenChange={setIsLayersPanelOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 shadow-md bg-background/95 backdrop-blur-sm pointer-events-auto"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Capas</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="labels" className="text-sm">
                    Etiquetas
                  </Label>
                  <Switch
                    id="labels"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="badges" className="text-sm">
                    Datos
                  </Label>
                  <Switch
                    id="badges"
                    checked={showDataBadges}
                    onCheckedChange={setShowDataBadges}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border",
          "bg-gradient-to-br from-sky-100/80 via-slate-50 to-blue-100/60",
          "dark:from-slate-900 dark:via-slate-850 dark:to-slate-800",
          isPanning ? "cursor-grabbing" : "cursor-grab"
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
          viewBox="0 0 950 1080"
          className="w-full h-auto"
          style={{
            maxHeight: "72vh",
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 180ms ease-out",
          }}
        >
          {/* Sea background */}
          <rect
            width="950"
            height="1080"
            fill="hsl(205 60% 94%)"
            className="dark:fill-slate-800"
          />

          {/* Portugal silhouette */}
          <path
            d="M15,180 L55,165 L72,205 L75,295 L68,395 L55,505 L48,598 L42,695 L52,765 L35,778 L18,735 L12,625 L15,495 L18,355 L22,248 Z"
            fill="hsl(40 20% 88%)"
            stroke="hsl(40 15% 75%)"
            strokeWidth="1"
            className="dark:fill-slate-700"
          />
          <text
            x="42"
            y="445"
            fontSize="14"
            fill="hsl(40 15% 55%)"
            fontStyle="italic"
            textAnchor="middle"
          >
            Portugal
          </text>

          {/* France silhouette */}
          <path
            d="M545,52 L635,42 L745,55 L845,78 L908,108 L895,148 L825,162 L745,152 L665,158 L588,148 L548,128 L542,85 Z"
            fill="hsl(40 20% 88%)"
            stroke="hsl(40 15% 75%)"
            strokeWidth="1"
            className="dark:fill-slate-700"
          />
          <text
            x="725"
            y="98"
            fontSize="14"
            fill="hsl(40 15% 55%)"
            fontStyle="italic"
            textAnchor="middle"
          >
            Francia
          </text>

          {/* Andorra */}
          <ellipse
            cx="585"
            cy="138"
            rx="12"
            ry="10"
            fill="hsl(40 20% 92%)"
            stroke="hsl(40 15% 75%)"
            strokeWidth="0.8"
          />

          {/* Morocco */}
          <path
            d="M148,948 L298,935 L478,952 L618,985 L598,1065 L412,1075 L232,1062 L118,1025 L128,975 Z"
            fill="hsl(40 25% 85%)"
            stroke="hsl(40 15% 72%)"
            strokeWidth="1"
            className="dark:fill-slate-700"
          />
          <text
            x="378"
            y="1015"
            fontSize="14"
            fill="hsl(40 15% 50%)"
            fontStyle="italic"
            textAnchor="middle"
          >
            Marruecos
          </text>

          {/* Maritime labels */}
          <text
            x="232"
            y="68"
            fontSize="13"
            fill="hsl(205 40% 55%)"
            fontStyle="italic"
            opacity="0.8"
          >
            Mar Cantábrico
          </text>
          <text
            x="868"
            y="588"
            fontSize="12"
            fill="hsl(205 40% 55%)"
            fontStyle="italic"
            opacity="0.8"
            transform="rotate(90 868 588)"
          >
            Mar Mediterráneo
          </text>
          <text
            x="25"
            y="485"
            fontSize="12"
            fill="hsl(205 40% 55%)"
            fontStyle="italic"
            opacity="0.8"
            transform="rotate(-82 25 485)"
          >
            Océano Atlántico
          </text>

          {/* Canarias inset box */}
          <rect
            x="42"
            y="528"
            width="315"
            height="135"
            fill="hsl(205 60% 96%)"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="6 3"
            rx="6"
            className="dark:fill-slate-850"
          />
          <text
            x="55"
            y="548"
            fontSize="10"
            fill="hsl(var(--muted-foreground))"
          >
            Islas Canarias (escala diferente)
          </text>

          {/* CCAA Paths */}
          {Object.entries(CCAA_PATHS).map(([ccaaId, { path, center, name, shortName }]) => {
            const isHovered = hoveredCCAA === ccaaId;
            const isSelected = selectedCCAA === ccaaId;
            const isSearchMatch =
              searchQuery &&
              (name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                shortName.toLowerCase().includes(searchQuery.toLowerCase()));
            const dimmed = !!hoveredCCAA && !isHovered && !isSearchMatch;
            const ccaaData = dataMap.get(ccaaId);

            return (
              <g key={ccaaId}>
                <motion.path
                  d={path}
                  fill={getFillColor(ccaaId)}
                  stroke={
                    isHovered || isSelected || isSearchMatch
                      ? "hsl(var(--primary))"
                      : "hsl(0 0% 45%)"
                  }
                  strokeWidth={isSelected ? 2.5 : isHovered || isSearchMatch ? 2 : 1}
                  style={{
                    cursor: "pointer",
                    opacity: dimmed ? 0.4 : 1,
                    filter:
                      isHovered || isSearchMatch
                        ? "drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
                        : "none",
                  }}
                  initial={false}
                  animate={{ scale: isHovered ? 1.012 : 1 }}
                  transition={{ duration: 0.1 }}
                  onMouseEnter={() => setHoveredCCAA(ccaaId)}
                  onMouseLeave={() => setHoveredCCAA(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCCAA(ccaaId, name);
                  }}
                />

                {/* Labels */}
                {showLabels && !["ceuta", "melilla"].includes(ccaaId) && (
                  <text
                    x={center[0]}
                    y={center[1] - (ccaaData && showDataBadges ? 10 : 0)}
                    fontSize={ccaaId === "islas-canarias" ? "10" : "11"}
                    fontWeight="600"
                    fill="hsl(0 0% 18%)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={dimmed ? 0.3 : 0.9}
                    className="pointer-events-none dark:fill-white"
                    style={{ textShadow: "0 1px 2px rgba(255,255,255,0.7)" }}
                  >
                    {shortName}
                  </text>
                )}

                {/* Data badge */}
                {showDataBadges && ccaaData && !["ceuta", "melilla"].includes(ccaaId) && (
                  <g className="pointer-events-none">
                    <rect
                      x={center[0] - 22}
                      y={center[1] + 2}
                      width={44}
                      height={18}
                      rx={9}
                      fill="hsl(var(--background) / 0.92)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.6"
                    />
                    <text
                      x={center[0]}
                      y={center[1] + 14}
                      fontSize="10"
                      fontWeight="700"
                      fill="hsl(var(--primary))"
                      textAnchor="middle"
                    >
                      {ccaaData.totalGrants}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 shadow-md bg-background/95 backdrop-blur-sm"
          onClick={zoomIn}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 shadow-md bg-background/95 backdrop-blur-sm"
          onClick={zoomOut}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 shadow-md bg-background/95 backdrop-blur-sm"
          onClick={resetView}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-3 left-3 bg-background/85 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs text-muted-foreground border shadow-sm z-20">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCCAA && tooltipData && !isPanning && (
          <GaliaMapTooltip data={tooltipData} position={tooltipPosition} visible />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl z-30">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
});

export default GaliaSpainMapSVG;
