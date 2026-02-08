/**
 * GaliaSpainMapSVG - Interactive Spain Map using Real SVG from Wikimedia Commons
 * Uses the official provinces SVG and groups them by Autonomous Communities
 * @version 2.0.0
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CCAAMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { GaliaMapTooltip } from './GaliaMapTooltip';
import { cn } from '@/lib/utils';

// Province codes to CCAA mapping (ISO 3166-2:ES)
const PROVINCE_TO_CCAA: Record<string, string> = {
  // Galicia
  'ES-C': 'galicia', 'ES-LU': 'galicia', 'ES-OR': 'galicia', 'ES-PO': 'galicia',
  // Asturias
  'ES-O': 'asturias',
  // Cantabria
  'ES-S': 'cantabria',
  // País Vasco
  'ES-VI': 'pais-vasco', 'ES-SS': 'pais-vasco', 'ES-BI': 'pais-vasco',
  // Navarra
  'ES-NA': 'navarra',
  // La Rioja
  'ES-LO': 'la-rioja',
  // Aragón
  'ES-HU': 'aragon', 'ES-TE': 'aragon', 'ES-Z': 'aragon',
  // Cataluña
  'ES-B': 'cataluna', 'ES-GI': 'cataluna', 'ES-L': 'cataluna', 'ES-T': 'cataluna',
  // Castilla y León
  'ES-AV': 'castilla-leon', 'ES-BU': 'castilla-leon', 'ES-LE': 'castilla-leon',
  'ES-P': 'castilla-leon', 'ES-SA': 'castilla-leon', 'ES-SG': 'castilla-leon',
  'ES-SO': 'castilla-leon', 'ES-VA': 'castilla-leon', 'ES-ZA': 'castilla-leon',
  // Madrid
  'ES-M': 'madrid',
  // Castilla-La Mancha
  'ES-AB': 'castilla-la-mancha', 'ES-CR': 'castilla-la-mancha', 
  'ES-CU': 'castilla-la-mancha', 'ES-GU': 'castilla-la-mancha', 'ES-TO': 'castilla-la-mancha',
  // Extremadura
  'ES-BA': 'extremadura', 'ES-CC': 'extremadura',
  // Comunidad Valenciana
  'ES-A': 'comunidad-valenciana', 'ES-CS': 'comunidad-valenciana', 'ES-V': 'comunidad-valenciana',
  // Islas Baleares
  'ES-PM': 'islas-baleares', 'ES-IB': 'islas-baleares',
  // Región de Murcia
  'ES-MU': 'region-murcia',
  // Andalucía
  'ES-AL': 'andalucia', 'ES-CA': 'andalucia', 'ES-CO': 'andalucia',
  'ES-GR': 'andalucia', 'ES-H': 'andalucia', 'ES-J': 'andalucia',
  'ES-MA': 'andalucia', 'ES-SE': 'andalucia',
  // Islas Canarias
  'ES-GC': 'islas-canarias', 'ES-TF': 'islas-canarias',
  // Ceuta y Melilla
  'ES-CE': 'ceuta', 'ES-ML': 'melilla'
};

// CCAA names and short names
const CCAA_INFO: Record<string, { name: string; shortName: string }> = {
  'galicia': { name: 'Galicia', shortName: 'GAL' },
  'asturias': { name: 'Principado de Asturias', shortName: 'AST' },
  'cantabria': { name: 'Cantabria', shortName: 'CANT' },
  'pais-vasco': { name: 'País Vasco', shortName: 'PVA' },
  'navarra': { name: 'Comunidad Foral de Navarra', shortName: 'NAV' },
  'la-rioja': { name: 'La Rioja', shortName: 'RIO' },
  'aragon': { name: 'Aragón', shortName: 'ARA' },
  'cataluna': { name: 'Cataluña', shortName: 'CAT' },
  'castilla-leon': { name: 'Castilla y León', shortName: 'CYL' },
  'madrid': { name: 'Comunidad de Madrid', shortName: 'MAD' },
  'castilla-la-mancha': { name: 'Castilla-La Mancha', shortName: 'CLM' },
  'extremadura': { name: 'Extremadura', shortName: 'EXT' },
  'comunidad-valenciana': { name: 'Comunidad Valenciana', shortName: 'VAL' },
  'islas-baleares': { name: 'Islas Baleares', shortName: 'BAL' },
  'region-murcia': { name: 'Región de Murcia', shortName: 'MUR' },
  'andalucia': { name: 'Andalucía', shortName: 'AND' },
  'islas-canarias': { name: 'Islas Canarias', shortName: 'CAN' },
  'ceuta': { name: 'Ceuta', shortName: 'CEU' },
  'melilla': { name: 'Melilla', shortName: 'MEL' }
};

interface GaliaSpainMapSVGProps {
  data: CCAAMapData[];
  onSelectCCAA: (ccaaId: string, ccaaName: string) => void;
  selectedCCAA?: string | null;
  isLoading?: boolean;
  className?: string;
}

export const GaliaSpainMapSVG = memo(function GaliaSpainMapSVG({
  data,
  onSelectCCAA,
  selectedCCAA,
  isLoading = false,
  className
}: GaliaSpainMapSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [hoveredCCAA, setHoveredCCAA] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Map data by CCAA ID
  const dataMap = useMemo(() => {
    const map = new Map<string, CCAAMapData>();
    data.forEach(d => map.set(d.id, d));
    return map;
  }, [data]);

  // Calculate max for color scaling
  const maxGrants = useMemo(() => {
    return Math.max(...data.map(d => d.totalGrants), 1);
  }, [data]);

  // Load SVG on mount
  useEffect(() => {
    fetch('/maps/spain-provinces.svg')
      .then(res => res.text())
      .then(svg => {
        setSvgContent(svg);
        setIsMapLoaded(true);
      })
      .catch(err => console.error('Error loading Spain SVG:', err));
  }, []);

  // Get fill color based on CCAA data
  const getFillColor = useCallback((ccaaId: string): string => {
    const ccaaData = dataMap.get(ccaaId);
    if (!ccaaData) return 'hsl(220, 20%, 85%)';
    
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

  // Apply styles to SVG after loading
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    // Style the SVG
    svgElement.style.width = '100%';
    svgElement.style.height = 'auto';
    svgElement.style.maxHeight = '65vh';

    // Get all province groups
    const groups = svgElement.querySelectorAll('g[id^="ES-"]');
    
    groups.forEach((group) => {
      const provinceId = group.getAttribute('id');
      if (!provinceId) return;

      const ccaaId = PROVINCE_TO_CCAA[provinceId];
      if (!ccaaId) return;

      const path = group.querySelector('path');
      const text = group.querySelector('text');
      
      if (path) {
        // Apply fill color based on data
        path.style.fill = getFillColor(ccaaId);
        path.style.stroke = 'hsl(var(--background))';
        path.style.strokeWidth = '0.5px';
        path.style.cursor = 'pointer';
        path.style.transition = 'fill 0.2s, stroke 0.2s, stroke-width 0.2s';

        // Event handlers
        path.addEventListener('mouseenter', () => {
          setHoveredCCAA(ccaaId);
          path.style.stroke = 'hsl(var(--primary))';
          path.style.strokeWidth = '2px';
          path.style.filter = 'brightness(1.1)';
        });

        path.addEventListener('mouseleave', () => {
          setHoveredCCAA(null);
          path.style.stroke = 'hsl(var(--background))';
          path.style.strokeWidth = '0.5px';
          path.style.filter = 'none';
        });

        path.addEventListener('click', () => {
          const info = CCAA_INFO[ccaaId];
          if (info) {
            onSelectCCAA(ccaaId, info.name);
          }
        });

        // Handle selected state
        if (selectedCCAA === ccaaId) {
          path.style.stroke = 'hsl(var(--primary))';
          path.style.strokeWidth = '2.5px';
        }
      }

      // Hide original text labels - we'll add our own
      if (text) {
        text.style.display = 'none';
      }
    });
  }, [svgContent, getFillColor, onSelectCCAA, selectedCCAA, hoveredCCAA]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Get tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredCCAA) return null;
    return dataMap.get(hoveredCCAA) || null;
  }, [hoveredCCAA, dataMap]);

  if (!svgContent) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Container */}
      <div
        ref={containerRef}
        className="relative w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCCAA(null)}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* CCAA Labels Overlay */}
      <AnimatePresence>
        {isMapLoaded && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* We'll render labels based on the SVG positions */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCCAA && (
          <GaliaMapTooltip
            data={tooltipData}
            position={tooltipPosition}
            visible={!!tooltipData}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
});

export default GaliaSpainMapSVG;
