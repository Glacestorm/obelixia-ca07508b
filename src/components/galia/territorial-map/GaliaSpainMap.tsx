/**
 * GaliaSpainMap - Interactive SVG Map of Spain
 * Uses accurate geographic coordinates for realistic representation
 */

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spainCCAAPathData, formatCompactCurrencyValue, type CCAAPathData } from './spain-ccaa-paths';
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
    if (!ccaaData) return 'hsl(220, 30%, 92%)';
    
    const intensity = ccaaData.totalGrants / maxGrants;
    const lightness = 80 - (intensity * 45);
    
    if (ccaaData.status === 'critical') {
      return `hsl(0, 65%, ${lightness}%)`;
    }
    if (ccaaData.status === 'warning') {
      return `hsl(45, 80%, ${lightness}%)`;
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
    const ccaaInfo = spainCCAAPathData.find(c => c.id === ccaaId);
    if (ccaaInfo) {
      onSelectCCAA(ccaaId, ccaaInfo.name);
    }
  }, [onSelectCCAA]);

  // Get tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Map - ViewBox optimized for Spain's geographic bounds */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 950"
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
            <stop offset="0%" stopColor="#e8f4fc" />
            <stop offset="100%" stopColor="#d1e9f8" />
          </linearGradient>
          
          {/* Land shadow */}
          <filter id="landShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
          
          {/* Hover glow */}
          <filter id="hoverGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="hsl(220, 70%, 50%)" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Sea background */}
        <rect x="0" y="0" width="1000" height="950" fill="url(#seaGradient)" />

        {/* Portugal (decorative neighbor) */}
        <path
          d="M25,250 L75,235 L98,275 L108,355 L105,435 L90,505 L70,565 L50,615 L30,570 L22,485 L25,385 L28,295 Z"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
          opacity="0.8"
        />
        <text
          x="60"
          y="420"
          textAnchor="middle"
          className="text-[11px] fill-gray-400"
          style={{ fontStyle: 'italic' }}
        >
          Portugal
        </text>

        {/* France (decorative neighbor) */}
        <path
          d="M620,50 L720,35 L830,45 L910,68 L945,98 L935,135 L890,155 L835,142 L770,132 L710,148 L660,158 L628,138 L618,102 Z"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
          opacity="0.8"
        />
        <text
          x="780"
          y="92"
          textAnchor="middle"
          className="text-[11px] fill-gray-400"
          style={{ fontStyle: 'italic' }}
        >
          Francia
        </text>

        {/* Andorra marker */}
        <circle cx="688" cy="138" r="6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
        <text
          x="705"
          y="142"
          className="text-[8px] fill-gray-400"
          style={{ fontStyle: 'italic' }}
        >
          Andorra
        </text>

        {/* Main Spain landmass group with shadow */}
        <g filter="url(#landShadow)">
          {/* CCAA Paths - rendered in order for proper layering */}
          {spainCCAAPathData.map((ccaa) => {
            const ccaaData = dataMap.get(ccaa.id);
            const isHovered = hoveredCCAA === ccaa.id;
            const isSelected = selectedCCAA === ccaa.id;
            
            return (
              <motion.g key={ccaa.id}>
                {/* Region path */}
                <motion.path
                  d={ccaa.path}
                  fill={getFillColor(ccaa.id)}
                  stroke={isHovered || isSelected ? '#3b82f6' : '#6b7280'}
                  strokeWidth={isHovered || isSelected ? 2.5 : 1}
                  strokeLinejoin="round"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredCCAA(ccaa.id)}
                  onClick={() => handleCCAAClick(ccaa.id)}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    filter: isHovered ? 'url(#hoverGlow)' : 'none'
                  }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.01 }}
                  style={{ 
                    transformOrigin: `${ccaa.labelPosition.x}px ${ccaa.labelPosition.y}px`
                  }}
                />
              </motion.g>
            );
          })}
        </g>

        {/* Labels layer (on top of paths) */}
        <g className="pointer-events-none">
          {spainCCAAPathData.map((ccaa) => {
            const ccaaData = dataMap.get(ccaa.id);
            
            // Skip labels for very small regions (Ceuta, Melilla)
            const isSmallRegion = ccaa.id === 'ceuta' || ccaa.id === 'melilla';
            
            return (
              <g key={`label-${ccaa.id}`} opacity={isLoading ? 0.4 : 1}>
                {/* Short name label */}
                <text
                  x={ccaa.labelPosition.x}
                  y={ccaa.labelPosition.y - (isSmallRegion ? 5 : 14)}
                  textAnchor="middle"
                  className="text-[10px] font-semibold"
                  fill="#374151"
                >
                  {ccaa.shortName}
                </text>

                {/* Data badge */}
                {ccaaData && !isSmallRegion && (
                  <g>
                    {/* Background pill */}
                    <rect
                      x={ccaa.labelPosition.x - 22}
                      y={ccaa.labelPosition.y - 4}
                      width="44"
                      height="20"
                      rx="10"
                      fill="rgba(255, 255, 255, 0.95)"
                      stroke="#d1d5db"
                      strokeWidth="1"
                    />
                    {/* Grant count */}
                    <text
                      x={ccaa.labelPosition.x}
                      y={ccaa.labelPosition.y + 10}
                      textAnchor="middle"
                      className="text-[11px] font-bold"
                      fill="#1f2937"
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
          {/* Cantabrian Sea */}
          <text
            x="300"
            y="55"
            textAnchor="middle"
            className="text-[12px]"
            fill="#6b7280"
            style={{ fontStyle: 'italic' }}
          >
            Mar Cantábrico
          </text>

          {/* Atlantic Ocean */}
          <text
            x="28"
            y="160"
            textAnchor="start"
            className="text-[11px]"
            fill="#6b7280"
            style={{ fontStyle: 'italic' }}
            transform="rotate(-75, 28, 160)"
          >
            Océano Atlántico
          </text>

          {/* Mediterranean Sea */}
          <text
            x="920"
            y="580"
            textAnchor="middle"
            className="text-[12px]"
            fill="#6b7280"
            style={{ fontStyle: 'italic' }}
            transform="rotate(-30, 920, 580)"
          >
            Mar Mediterráneo
          </text>

          {/* Gulf of Cadiz */}
          <text
            x="180"
            y="860"
            textAnchor="middle"
            className="text-[10px]"
            fill="#6b7280"
            style={{ fontStyle: 'italic' }}
          >
            Golfo de Cádiz
          </text>
        </g>

        {/* Canary Islands separator and label */}
        <g>
          <line
            x1="30"
            y1="720"
            x2="340"
            y2="720"
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="5 3"
          />
          <text
            x="185"
            y="710"
            textAnchor="middle"
            className="text-[10px]"
            fill="#6b7280"
          >
            Islas Canarias (Océano Atlántico)
          </text>
        </g>

        {/* North Africa label for Ceuta & Melilla */}
        <text
          x="400"
          y="905"
          textAnchor="middle"
          className="text-[9px]"
          fill="#9ca3af"
        >
          Ceuta y Melilla (Norte de África)
        </text>
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
