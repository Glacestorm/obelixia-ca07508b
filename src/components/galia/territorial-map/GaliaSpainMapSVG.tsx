/**
 * GaliaSpainMapSVG - Interactive Spain Map using Real SVG (provinces) but visualized at CCAA level
 * - Provinces are grouped by Autonomous Community (CCAA)
 * - Data overlay + hover/click are CCAA-based
 * - Zoom is handled via CSS transform on the SVG (wheel + controls)
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Minus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CCAAMapData } from "@/hooks/galia/useGaliaTerritorialMap";
import { cn } from "@/lib/utils";

import { GaliaMapTooltip } from "./GaliaMapTooltip";

// Province codes to CCAA mapping (ISO 3166-2:ES)
const PROVINCE_TO_CCAA: Record<string, string> = {
  // Galicia
  "ES-C": "galicia",
  "ES-LU": "galicia",
  "ES-OR": "galicia",
  "ES-PO": "galicia",
  // Asturias
  "ES-O": "asturias",
  // Cantabria
  "ES-S": "cantabria",
  // País Vasco
  "ES-VI": "pais-vasco",
  "ES-SS": "pais-vasco",
  "ES-BI": "pais-vasco",
  // Navarra
  "ES-NA": "navarra",
  // La Rioja
  "ES-LO": "la-rioja",
  // Aragón
  "ES-HU": "aragon",
  "ES-TE": "aragon",
  "ES-Z": "aragon",
  // Cataluña
  "ES-B": "cataluna",
  "ES-GI": "cataluna",
  "ES-L": "cataluna",
  "ES-T": "cataluna",
  // Castilla y León
  "ES-AV": "castilla-leon",
  "ES-BU": "castilla-leon",
  "ES-LE": "castilla-leon",
  "ES-P": "castilla-leon",
  "ES-SA": "castilla-leon",
  "ES-SG": "castilla-leon",
  "ES-SO": "castilla-leon",
  "ES-VA": "castilla-leon",
  "ES-ZA": "castilla-leon",
  // Madrid
  "ES-M": "madrid",
  // Castilla-La Mancha
  "ES-AB": "castilla-la-mancha",
  "ES-CR": "castilla-la-mancha",
  "ES-CU": "castilla-la-mancha",
  "ES-GU": "castilla-la-mancha",
  "ES-TO": "castilla-la-mancha",
  // Extremadura
  "ES-BA": "extremadura",
  "ES-CC": "extremadura",
  // Comunidad Valenciana
  "ES-A": "comunidad-valenciana",
  "ES-CS": "comunidad-valenciana",
  "ES-V": "comunidad-valenciana",
  // Islas Baleares
  "ES-PM": "islas-baleares",
  "ES-IB": "islas-baleares",
  // Región de Murcia
  "ES-MU": "region-murcia",
  // Andalucía
  "ES-AL": "andalucia",
  "ES-CA": "andalucia",
  "ES-CO": "andalucia",
  "ES-GR": "andalucia",
  "ES-H": "andalucia",
  "ES-J": "andalucia",
  "ES-MA": "andalucia",
  "ES-SE": "andalucia",
  // Islas Canarias
  "ES-GC": "islas-canarias",
  "ES-TF": "islas-canarias",
  // Ceuta y Melilla
  "ES-CE": "ceuta",
  "ES-ML": "melilla",
};

// CCAA names
const CCAA_INFO: Record<string, { name: string; shortName: string }> = {
  galicia: { name: "Galicia", shortName: "GAL" },
  asturias: { name: "Principado de Asturias", shortName: "AST" },
  cantabria: { name: "Cantabria", shortName: "CANT" },
  "pais-vasco": { name: "País Vasco", shortName: "PVA" },
  navarra: { name: "Comunidad Foral de Navarra", shortName: "NAV" },
  "la-rioja": { name: "La Rioja", shortName: "RIO" },
  aragon: { name: "Aragón", shortName: "ARA" },
  cataluna: { name: "Cataluña", shortName: "CAT" },
  "castilla-leon": { name: "Castilla y León", shortName: "CYL" },
  madrid: { name: "Comunidad de Madrid", shortName: "MAD" },
  "castilla-la-mancha": { name: "Castilla-La Mancha", shortName: "CLM" },
  extremadura: { name: "Extremadura", shortName: "EXT" },
  "comunidad-valenciana": { name: "Comunidad Valenciana", shortName: "VAL" },
  "islas-baleares": { name: "Islas Baleares", shortName: "BAL" },
  "region-murcia": { name: "Región de Murcia", shortName: "MUR" },
  andalucia: { name: "Andalucía", shortName: "AND" },
  "islas-canarias": { name: "Islas Canarias", shortName: "CAN" },
  ceuta: { name: "Ceuta", shortName: "CEU" },
  melilla: { name: "Melilla", shortName: "MEL" },
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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ccaaPathsRef = useRef<Map<string, SVGPathElement[]>>(new Map());
  const cleanupListenersRef = useRef<(() => void)[]>([]);

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const dataMap = useMemo(() => {
    const map = new Map<string, CCAAMapData>();
    data.forEach((d) => map.set(d.id, d));
    return map;
  }, [data]);

  const maxGrants = useMemo(() => Math.max(...data.map((d) => d.totalGrants), 1), [data]);

  // Load SVG on mount (kept in /public so it won't inflate the bundle)
  useEffect(() => {
    let cancelled = false;

    fetch("/maps/spain-provinces.svg")
      .then((res) => res.text())
      .then((svg) => {
        if (cancelled) return;
        setSvgContent(svg);
      })
      .catch((err) => console.error("Error loading Spain SVG:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  // Token-based fill color (intensity as opacity, not hard-coded colors)
  const getFillColor = useCallback(
    (ccaaId: string): string => {
      const ccaaData = dataMap.get(ccaaId);
      if (!ccaaData) return "hsl(var(--muted))";

      const intensity = clamp(ccaaData.totalGrants / maxGrants, 0, 1);
      const alpha = 0.18 + intensity * 0.72;

      if (ccaaData.status === "critical") return `hsl(var(--destructive) / ${alpha})`;
      if (ccaaData.status === "warning") return `hsl(var(--accent) / ${alpha})`;
      return `hsl(var(--primary) / ${alpha})`;
    },
    [dataMap, maxGrants]
  );

  // Setup SVG DOM once (attach listeners, build CCAA->paths index)
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    // Clear previous listeners/index
    cleanupListenersRef.current.forEach((fn) => fn());
    cleanupListenersRef.current = [];
    ccaaPathsRef.current = new Map();

    const container = containerRef.current;
    const svgElement = container.querySelector("svg") as SVGSVGElement | null;
    if (!svgElement) return;

    svgRef.current = svgElement;

    // Normalize SVG sizing for responsiveness
    svgElement.removeAttribute("width");
    svgElement.removeAttribute("height");
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgElement.style.width = "100%";
    svgElement.style.height = "auto";
    svgElement.style.maxHeight = "65vh";
    svgElement.style.transformOrigin = "50% 50%";
    svgElement.style.willChange = "transform";

    // Provinces in the wikimedia SVG are grouped by <g id="ES-XX">
    const groups = svgElement.querySelectorAll("g[id^='ES-']");

    groups.forEach((group) => {
      const provinceId = group.getAttribute("id");
      if (!provinceId) return;

      const ccaaId = PROVINCE_TO_CCAA[provinceId];
      if (!ccaaId) return;

      const path = group.querySelector("path") as SVGPathElement | null;
      if (!path) return;

      // Hide original province labels
      const text = group.querySelector("text");
      if (text) (text as SVGTextElement).style.display = "none";

      path.dataset.ccaa = ccaaId;
      path.style.cursor = "pointer";
      path.style.transition = "opacity 120ms ease, filter 120ms ease, stroke-width 120ms ease";
      // Keep strokes consistent while zooming
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (path.style as any).vectorEffect = "non-scaling-stroke";

      const existing = ccaaPathsRef.current.get(ccaaId) ?? [];
      existing.push(path);
      ccaaPathsRef.current.set(ccaaId, existing);

      const onEnter = () => setHoveredCCAA(ccaaId);
      const onLeave = () => setHoveredCCAA((prev) => (prev === ccaaId ? null : prev));
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const info = CCAA_INFO[ccaaId];
        onSelectCCAA(ccaaId, info?.name ?? ccaaId);
      };

      path.addEventListener("mouseenter", onEnter);
      path.addEventListener("mouseleave", onLeave);
      path.addEventListener("click", onClick);

      cleanupListenersRef.current.push(() => {
        path.removeEventListener("mouseenter", onEnter);
        path.removeEventListener("mouseleave", onLeave);
        path.removeEventListener("click", onClick);
      });
    });

    return () => {
      cleanupListenersRef.current.forEach((fn) => fn());
      cleanupListenersRef.current = [];
      ccaaPathsRef.current = new Map();
      svgRef.current = null;
    };
  }, [svgContent, onSelectCCAA]);

  // Apply data-driven styling (no listener re-binding)
  useEffect(() => {
    const ccaaToPaths = ccaaPathsRef.current;
    if (ccaaToPaths.size === 0) return;

    ccaaToPaths.forEach((paths, ccaaId) => {
      const fill = getFillColor(ccaaId);
      const isSelected = selectedCCAA === ccaaId;
      const isHovered = hoveredCCAA === ccaaId;
      const dimmed = !!hoveredCCAA && !isHovered;

      for (const path of paths) {
        // Base fill
        path.style.fill = fill;

        // Hide internal province borders: use stroke == fill to seal AA gaps, so it reads as one CCAA
        path.style.stroke = fill;
        path.style.strokeWidth = "0.75";

        // Hover/selection outline across ALL provinces in the CCAA
        if (isHovered || isSelected) {
          path.style.stroke = "hsl(var(--primary))";
          path.style.strokeWidth = isSelected ? "2.25" : "1.75";
        }

        path.style.opacity = dimmed ? "0.28" : "1";
        path.style.filter = isHovered ? "brightness(1.04)" : "none";
      }
    });
  }, [getFillColor, hoveredCCAA, selectedCCAA]);

  // Apply zoom (CSS transform on SVG)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.style.transform = `scale(${zoom})`;
  }, [zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Zoom when user scrolls on the map area
    e.preventDefault();
    const delta = e.deltaY;
    setZoom((z) => clamp(z + (delta > 0 ? -0.15 : 0.15), 1, 4));
  }, []);

  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  if (!svgContent) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Container (overflow hidden so zoom stays within bounds) */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
        onWheel={handleWheel}
        // Needed to keep wheel zoom from scrolling the page
        style={{ touchAction: "none" }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom((z) => clamp(z + 0.25, 1, 4))}
          aria-label="Acercar"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom((z) => clamp(z - 0.25, 1, 4))}
          aria-label="Alejar"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(1)}
          aria-label="Reiniciar zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCCAA && (
          <GaliaMapTooltip data={tooltipData} position={tooltipPosition} visible={!!tooltipData} />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
});

export default GaliaSpainMapSVG;
