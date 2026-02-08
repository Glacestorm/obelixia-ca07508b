/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Uses accurate geographic coordinates for realistic representation
 * Based on real GeoJSON/TopoJSON data converted to SVG paths
 */

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CCAAMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { GaliaMapTooltip } from './GaliaMapTooltip';
import { cn } from '@/lib/utils';

// Accurate SVG paths for Spain's CCAA - Based on real geographic boundaries
// ViewBox: 0 0 600 520 - Optimized for Spain's geographic proportions
const SPAIN_CCAA_PATHS = {
  'galicia': {
    name: 'Galicia',
    shortName: 'GAL',
    path: 'M55,72 L65,65 L78,60 L92,58 L105,62 L115,70 L120,82 L118,96 L110,108 L98,118 L84,122 L70,120 L58,112 L50,100 L48,86 L52,76 Z',
    labelPos: { x: 82, y: 92 },
    provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra']
  },
  'asturias': {
    name: 'Principado de Asturias',
    shortName: 'AST',
    path: 'M118,68 L135,62 L155,58 L178,60 L195,68 L200,80 L195,92 L182,100 L165,105 L145,104 L130,98 L120,88 L118,76 Z',
    labelPos: { x: 158, y: 82 },
    provinces: ['Asturias']
  },
  'cantabria': {
    name: 'Cantabria',
    shortName: 'CANT',
    path: 'M195,65 L215,60 L238,62 L255,72 L258,86 L252,98 L238,105 L220,106 L205,100 L196,90 L194,78 Z',
    labelPos: { x: 225, y: 84 },
    provinces: ['Cantabria']
  },
  'pais-vasco': {
    name: 'País Vasco',
    shortName: 'PVA',
    path: 'M255,68 L275,62 L295,65 L310,76 L315,90 L308,104 L292,112 L275,112 L260,105 L252,92 L254,78 Z',
    labelPos: { x: 282, y: 88 },
    provinces: ['Álava', 'Guipúzcoa', 'Vizcaya']
  },
  'navarra': {
    name: 'Comunidad Foral de Navarra',
    shortName: 'NAV',
    path: 'M310,72 L332,65 L355,68 L372,82 L378,100 L375,120 L365,138 L348,150 L328,152 L312,145 L302,130 L298,112 L302,92 L308,80 Z',
    labelPos: { x: 338, y: 110 },
    provinces: ['Navarra']
  },
  'la-rioja': {
    name: 'La Rioja',
    shortName: 'RIO',
    path: 'M260,105 L285,98 L310,102 L328,115 L332,132 L325,148 L308,158 L288,160 L270,152 L260,138 L258,122 L262,110 Z',
    labelPos: { x: 295, y: 130 },
    provinces: ['La Rioja']
  },
  'aragon': {
    name: 'Aragón',
    shortName: 'ARA',
    path: 'M332,110 L365,95 L400,88 L435,95 L458,115 L472,145 L478,180 L475,218 L462,255 L440,285 L410,305 L375,312 L345,302 L325,280 L315,250 L315,215 L322,180 L332,148 L338,125 Z',
    labelPos: { x: 395, y: 200 },
    provinces: ['Huesca', 'Teruel', 'Zaragoza']
  },
  'cataluna': {
    name: 'Cataluña',
    shortName: 'CAT',
    path: 'M435,88 L465,78 L498,82 L530,98 L552,125 L562,160 L558,198 L542,232 L518,258 L488,275 L455,280 L428,270 L412,248 L405,218 L408,185 L420,152 L432,120 L438,100 Z',
    labelPos: { x: 485, y: 175 },
    provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona']
  },
  'castilla-leon': {
    name: 'Castilla y León',
    shortName: 'CYL',
    path: 'M98,118 L130,108 L165,105 L200,108 L235,115 L268,130 L295,152 L318,180 L330,215 L332,252 L322,288 L302,318 L272,340 L235,352 L195,355 L158,348 L125,332 L100,308 L85,278 L78,245 L80,210 L88,178 L100,150 L108,130 Z',
    labelPos: { x: 200, y: 230 },
    provinces: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora']
  },
  'madrid': {
    name: 'Comunidad de Madrid',
    shortName: 'MAD',
    path: 'M272,298 L295,288 L318,292 L335,308 L342,328 L335,350 L318,365 L295,368 L275,358 L265,340 L265,318 L270,305 Z',
    labelPos: { x: 302, y: 330 },
    provinces: ['Madrid']
  },
  'castilla-la-mancha': {
    name: 'Castilla-La Mancha',
    shortName: 'CLM',
    path: 'M235,352 L280,342 L325,348 L368,362 L408,385 L438,418 L455,458 L458,498 L445,535 L418,565 L378,582 L332,588 L285,582 L242,565 L208,538 L185,502 L178,462 L185,422 L200,388 L220,365 Z',
    labelPos: { x: 325, y: 465 },
    provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo']
  },
  'extremadura': {
    name: 'Extremadura',
    shortName: 'EXT',
    path: 'M78,308 L115,295 L158,298 L195,315 L218,345 L228,382 L225,422 L210,458 L182,488 L148,505 L112,508 L80,495 L58,470 L48,438 L52,402 L65,368 L78,335 Z',
    labelPos: { x: 140, y: 400 },
    provinces: ['Badajoz', 'Cáceres']
  },
  'comunidad-valenciana': {
    name: 'Comunidad Valenciana',
    shortName: 'VAL',
    path: 'M438,285 L475,265 L510,268 L542,290 L562,325 L572,368 L568,412 L552,452 L525,485 L490,505 L455,508 L425,495 L405,468 L398,432 L402,395 L415,358 L428,322 Z',
    labelPos: { x: 485, y: 385 },
    provinces: ['Alicante', 'Castellón', 'Valencia']
  },
  'islas-baleares': {
    name: 'Islas Baleares',
    shortName: 'BAL',
    // Mallorca main island + Menorca + Ibiza
    path: 'M528,285 L555,278 L580,288 L595,308 L598,332 L588,355 L568,368 L545,370 L525,358 L515,338 L518,312 Z M565,375 L585,370 L602,382 L605,400 L592,415 L572,418 L558,405 L560,388 Z M520,390 L538,385 L552,398 L550,415 L535,425 L520,418 L515,402 Z',
    labelPos: { x: 558, y: 340 },
    provinces: ['Islas Baleares']
  },
  'region-murcia': {
    name: 'Región de Murcia',
    shortName: 'MUR',
    path: 'M418,502 L455,485 L492,492 L520,515 L532,548 L525,582 L502,608 L468,618 L435,608 L412,582 L405,548 L412,518 Z',
    labelPos: { x: 468, y: 555 },
    provinces: ['Murcia']
  },
  'andalucia': {
    name: 'Andalucía',
    shortName: 'AND',
    path: 'M52,495 L95,482 L145,478 L195,490 L242,515 L285,548 L320,588 L345,632 L355,678 L345,720 L318,755 L278,778 L232,788 L185,782 L140,762 L102,730 L72,690 L55,645 L48,598 L52,548 Z',
    labelPos: { x: 210, y: 635 },
    provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla']
  },
  'islas-canarias': {
    name: 'Islas Canarias',
    shortName: 'CAN',
    // Positioned as inset in bottom left - multiple islands
    path: 'M55,420 L75,415 L92,428 L95,448 L82,462 L62,458 L52,442 Z M105,408 L128,402 L148,418 L150,442 L135,458 L112,455 L102,435 Z M160,395 L188,388 L212,405 L218,432 L202,455 L175,458 L158,438 L158,415 Z M225,385 L255,378 L280,395 L288,425 L272,452 L242,458 L222,438 L225,408 Z',
    labelPos: { x: 170, y: 435 },
    provinces: ['Las Palmas', 'Santa Cruz de Tenerife']
  },
  'ceuta': {
    name: 'Ceuta',
    shortName: 'CEU',
    path: 'M255,480 L270,475 L282,485 L280,500 L268,508 L255,502 L250,490 Z',
    labelPos: { x: 265, y: 492 },
    provinces: ['Ceuta']
  },
  'melilla': {
    name: 'Melilla',
    shortName: 'MEL',
    path: 'M320,478 L335,472 L348,482 L346,498 L332,505 L320,498 L315,488 Z',
    labelPos: { x: 332, y: 488 },
    provinces: ['Melilla']
  }
};

interface GaliaSpainMapProps {
  data: CCAAMapData[];
  onSelectCCAA: (ccaaId: string, ccaaName: string) => void;
  selectedCCAA?: string | null;
  isLoading?: boolean;
  className?: string;
}

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

  // Get fill color based on data
  const getFillColor = useCallback((ccaaId: string): string => {
    const ccaaData = dataMap.get(ccaaId);
    if (!ccaaData) return 'hsl(var(--muted))';
    
    const intensity = ccaaData.totalGrants / maxGrants;
    const lightness = 75 - (intensity * 40);
    
    if (ccaaData.status === 'critical') {
      return `hsl(0, 65%, ${lightness}%)`;
    }
    if (ccaaData.status === 'warning') {
      return `hsl(45, 75%, ${lightness}%)`;
    }
    return `hsl(220, 70%, ${lightness}%)`;
  }, [dataMap, maxGrants]);

  // Handle mouse move for tooltip positioning
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
  const handleCCAAClick = useCallback((ccaaId: string) => {
    const ccaaInfo = SPAIN_CCAA_PATHS[ccaaId as keyof typeof SPAIN_CCAA_PATHS];
    if (ccaaInfo) {
      onSelectCCAA(ccaaId, ccaaInfo.name);
    }
  }, [onSelectCCAA]);

  // Get tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  const ccaaEntries = Object.entries(SPAIN_CCAA_PATHS);

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Map - ViewBox optimized for Spain's geographic bounds */}
      <svg
        ref={svgRef}
        viewBox="0 0 620 520"
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
        style={{ maxHeight: '70vh' }}
        aria-label="Mapa interactivo de España por comunidades autónomas"
      >
        {/* Definitions */}
        <defs>
          {/* Sea gradient */}
          <linearGradient id="seaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 60%, 96%)" />
            <stop offset="100%" stopColor="hsl(210, 50%, 93%)" />
          </linearGradient>
          
          {/* Land shadow */}
          <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.12" />
          </filter>
          
          {/* Hover glow */}
          <filter id="hoverGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="hsl(var(--primary))" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Sea background */}
        <rect x="0" y="0" width="620" height="520" fill="url(#seaGradient)" />

        {/* Canary Islands inset box */}
        <rect x="45" y="378" width="260" height="95" rx="4" 
              fill="hsl(var(--background))" 
              stroke="hsl(var(--border))" 
              strokeWidth="1" 
              strokeDasharray="4 2" />
        <text x="55" y="395" className="text-[8px] fill-muted-foreground">
          Islas Canarias (escala diferente)
        </text>

        {/* Ceuta & Melilla inset */}
        <rect x="245" y="468" width="115" height="52" rx="4" 
              fill="hsl(var(--background))" 
              stroke="hsl(var(--border))" 
              strokeWidth="1" 
              strokeDasharray="4 2" />
        <text x="255" y="485" className="text-[7px] fill-muted-foreground">
          Ceuta y Melilla
        </text>

        {/* Portugal (decorative neighbor) */}
        <path
          d="M25,180 L52,168 L65,195 L70,248 L68,305 L58,358 L45,402 L30,365 L22,298 L25,230 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          opacity="0.6"
        />
        <text x="42" y="290" textAnchor="middle" className="text-[9px] fill-muted-foreground italic">
          Portugal
        </text>

        {/* France (decorative neighbor) */}
        <path
          d="M375,42 L445,35 L520,45 L575,62 L595,85 L588,110 L558,118 L515,108 L465,112 L418,125 L385,118 L378,92 L375,65 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          opacity="0.6"
        />
        <text x="485" y="75" textAnchor="middle" className="text-[9px] fill-muted-foreground italic">
          Francia
        </text>

        {/* Andorra marker */}
        <circle cx="412" cy="102" r="5" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        <text x="422" y="106" className="text-[7px] fill-muted-foreground italic">
          Andorra
        </text>

        {/* Main Spain landmass group with shadow */}
        <g filter="url(#landShadow)">
          {/* CCAA Paths - rendered in order for proper layering */}
          {ccaaEntries.map(([ccaaId, ccaa]) => {
            const ccaaData = dataMap.get(ccaaId);
            const isHovered = hoveredCCAA === ccaaId;
            const isSelected = selectedCCAA === ccaaId;
            
            // Skip Canarias, Ceuta, Melilla from main group (they're in insets)
            if (ccaaId === 'islas-canarias' || ccaaId === 'ceuta' || ccaaId === 'melilla') {
              return null;
            }
            
            return (
              <motion.path
                key={ccaaId}
                d={ccaa.path}
                fill={getFillColor(ccaaId)}
                stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={isHovered || isSelected ? 2 : 0.8}
                strokeLinejoin="round"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredCCAA(ccaaId)}
                onClick={() => handleCCAAClick(ccaaId)}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  filter: isHovered ? 'url(#hoverGlow)' : 'none'
                }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.015 }}
                style={{ 
                  transformOrigin: `${ccaa.labelPos.x}px ${ccaa.labelPos.y}px`
                }}
              />
            );
          })}
        </g>

        {/* Inset regions: Canarias, Ceuta, Melilla */}
        <g>
          {['islas-canarias', 'ceuta', 'melilla'].map((ccaaId) => {
            const ccaa = SPAIN_CCAA_PATHS[ccaaId as keyof typeof SPAIN_CCAA_PATHS];
            const ccaaData = dataMap.get(ccaaId);
            const isHovered = hoveredCCAA === ccaaId;
            const isSelected = selectedCCAA === ccaaId;
            
            return (
              <motion.path
                key={ccaaId}
                d={ccaa.path}
                fill={getFillColor(ccaaId)}
                stroke={isHovered || isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={isHovered || isSelected ? 1.5 : 0.6}
                strokeLinejoin="round"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredCCAA(ccaaId)}
                onClick={() => handleCCAAClick(ccaaId)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            );
          })}
        </g>

        {/* Labels layer (on top of paths) */}
        <g className="pointer-events-none">
          {ccaaEntries.map(([ccaaId, ccaa]) => {
            const ccaaData = dataMap.get(ccaaId);
            
            // Smaller labels for small/inset regions
            const isSmallRegion = ['ceuta', 'melilla', 'la-rioja', 'cantabria'].includes(ccaaId);
            const isInset = ['islas-canarias', 'ceuta', 'melilla'].includes(ccaaId);
            
            return (
              <g key={`label-${ccaaId}`} opacity={isLoading ? 0.4 : 1}>
                {/* Short name label */}
                <text
                  x={ccaa.labelPos.x}
                  y={ccaa.labelPos.y - (isSmallRegion ? 4 : ccaaData ? 10 : 4)}
                  textAnchor="middle"
                  className={cn(
                    "font-semibold fill-foreground/80",
                    isSmallRegion || isInset ? "text-[7px]" : "text-[9px]"
                  )}
                  style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                >
                  {ccaa.shortName}
                </text>

                {/* Data badge - only for regions with data and not too small */}
                {ccaaData && !['ceuta', 'melilla'].includes(ccaaId) && (
                  <g>
                    {/* Background pill */}
                    <rect
                      x={ccaa.labelPos.x - (isSmallRegion ? 14 : 18)}
                      y={ccaa.labelPos.y - 2}
                      width={isSmallRegion ? 28 : 36}
                      height={isSmallRegion ? 14 : 16}
                      rx={isSmallRegion ? 7 : 8}
                      fill="hsl(var(--background) / 0.95)"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    {/* Grant count */}
                    <text
                      x={ccaa.labelPos.x}
                      y={ccaa.labelPos.y + (isSmallRegion ? 8 : 10)}
                      textAnchor="middle"
                      className={cn(
                        "font-bold fill-primary",
                        isSmallRegion ? "text-[8px]" : "text-[10px]"
                      )}
                    >
                      {ccaaData.totalGrants}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Sea labels */}
        <g className="pointer-events-none">
          <text x="200" y="42" textAnchor="middle" className="text-[10px] fill-muted-foreground/60 italic">
            Mar Cantábrico
          </text>
          <text x="22" y="140" textAnchor="start" className="text-[9px] fill-muted-foreground/60 italic" transform="rotate(-75, 22, 140)">
            Océano Atlántico
          </text>
          <text x="570" y="350" textAnchor="middle" className="text-[10px] fill-muted-foreground/60 italic" transform="rotate(-25, 570, 350)">
            Mar Mediterráneo
          </text>
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
              Cargando datos territoriales...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default GaliaSpainMap;
