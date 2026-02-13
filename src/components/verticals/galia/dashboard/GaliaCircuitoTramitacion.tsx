/**
 * GALIA - Circuito de Tramitación Visual - Flujograma SVG Interactivo
 * ~49 pasos del circuito LEADER con nodos, flechas, decisiones y estados terminales
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  useGaliaCircuitoTramitacion,
  NODOS_FLUJOGRAMA,
  ARISTAS_FLUJOGRAMA,
  FASE_SVG_COLORS,
  FASE_LABELS,
  ESTADO_LABELS,
  FASE_MAP,
  type NodoFlujograma,
  type FaseCircuito,
} from '@/hooks/galia/useGaliaCircuitoTramitacion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, HelpCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaliaCircuitoTramitacionProps {
  estadoActual: string;
  historial?: Array<{ de: string; a: string; resultado: string; timestamp: string }>;
  onTransicion?: (nuevoEstado: string) => void;
  readOnly?: boolean;
}

// Node dimensions
const NODE_W = 150;
const NODE_H = 44;
const DIAMOND_SIZE = 40;
const TERMINAL_R = 22;

// Padding around entire diagram
const PAD = 80;

export function GaliaCircuitoTramitacion({
  estadoActual,
  historial = [],
  onTransicion,
  readOnly = false,
}: GaliaCircuitoTramitacionProps) {
  const { getTransicionesDisponibles, getFaseProgreso } = useGaliaCircuitoTramitacion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.85);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes (including Escape key exit)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!cardRef.current) return;
    if (!document.fullscreenElement) {
      cardRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Compute passed states
  const estadosPasados = useMemo(() => {
    const set = new Set<string>();
    historial.forEach(h => { set.add(h.de); set.add(h.a); });
    set.add(estadoActual);
    return set;
  }, [historial, estadoActual]);

  const transicionesPosibles = useMemo(
    () => getTransicionesDisponibles(estadoActual),
    [estadoActual, getTransicionesDisponibles]
  );

  const nextSet = useMemo(
    () => new Set(transicionesPosibles.map(t => t.estado)),
    [transicionesPosibles]
  );

  // Calculate offsets to center diagram
  const { offsetX, offsetY, svgW, svgH } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    NODOS_FLUJOGRAMA.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });
    const ox = -minX + PAD;
    const oy = -minY + PAD;
    return {
      offsetX: ox,
      offsetY: oy,
      svgW: maxX - minX + PAD * 2 + NODE_W,
      svgH: maxY - minY + PAD * 2 + NODE_H + 40,
    };
  }, []);

  const getNodeCenter = useCallback((n: NodoFlujograma) => {
    const nx = n.x + offsetX;
    const ny = n.y + offsetY;
    if (n.tipo === 'decision') return { x: nx + DIAMOND_SIZE, y: ny + DIAMOND_SIZE };
    if (n.tipo === 'terminal' || n.tipo === 'end' || n.tipo === 'start') return { x: nx + TERMINAL_R, y: ny + TERMINAL_R };
    return { x: nx + NODE_W / 2, y: ny + NODE_H / 2 };
  }, [offsetX, offsetY]);

  const nodeMap = useMemo(() => {
    const m: Record<string, NodoFlujograma> = {};
    NODOS_FLUJOGRAMA.forEach(n => { m[n.id] = n; });
    return m;
  }, []);

  const progreso = getFaseProgreso(estadoActual);
  const totalNodos = NODOS_FLUJOGRAMA.length;
  const nodosPasados = NODOS_FLUJOGRAMA.filter(n => estadosPasados.has(n.id)).length;

  // Status of a node
  const getNodeStatus = useCallback((id: string): 'current' | 'passed' | 'next' | 'terminal_passed' | 'pending' => {
    if (id === estadoActual) return 'current';
    const isTerminal = ['denegado', 'renunciado', 'desistido', 'cerrado'].includes(id);
    if (estadosPasados.has(id) && id !== estadoActual) {
      return isTerminal ? 'terminal_passed' : 'passed';
    }
    if (nextSet.has(id)) return 'next';
    return 'pending';
  }, [estadoActual, estadosPasados, nextSet]);

  // Handle zoom
  const handleZoom = (dir: 'in' | 'out' | 'fit') => {
    if (dir === 'in') setZoom(z => Math.min(z + 0.15, 2));
    else if (dir === 'out') setZoom(z => Math.max(z - 0.15, 0.3));
    else setZoom(0.85);
  };

  // Scroll to current node on mount
  useEffect(() => {
    const currentNode = nodeMap[estadoActual];
    if (currentNode && containerRef.current) {
      const cx = (currentNode.x + offsetX) * zoom;
      const cy = (currentNode.y + offsetY) * zoom;
      containerRef.current.scrollTo({
        left: cx - containerRef.current.clientWidth / 2,
        top: cy - containerRef.current.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [estadoActual, zoom, offsetX, offsetY, nodeMap]);

  // Render edges
  const renderEdges = () => {
    return ARISTAS_FLUJOGRAMA.map((edge, i) => {
      const fromNode = nodeMap[edge.from];
      const toNode = nodeMap[edge.to];
      if (!fromNode || !toNode) return null;

      const start = getNodeCenter(fromNode);
      const end = getNodeCenter(toNode);

      // Simple path with midpoint
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const isMainFlow = Math.abs(dx) < 20;
      
      let path: string;
      if (isMainFlow) {
        // Vertical straight line
        path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else {
        // Curved path for branches
        const midY = start.y + dy * 0.5;
        path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
      }

      const bothPassed = estadosPasados.has(edge.from) && estadosPasados.has(edge.to);
      const isActive = edge.from === estadoActual;

      return (
        <g key={`edge-${i}`}>
          <path
            d={path}
            fill="none"
            stroke={bothPassed ? '#22c55e' : isActive ? '#3b82f6' : '#d1d5db'}
            strokeWidth={bothPassed || isActive ? 2 : 1.5}
            strokeDasharray={isActive ? '6 3' : undefined}
            markerEnd={`url(#arrow-${bothPassed ? 'green' : isActive ? 'blue' : 'gray'})`}
          />
          {edge.label && (
            <text
              x={(start.x + end.x) / 2 + (dx > 0 ? 8 : dx < 0 ? -8 : 12)}
              y={(start.y + end.y) / 2 - 4}
              fontSize="9"
              fill={bothPassed ? '#16a34a' : '#9ca3af'}
              textAnchor="middle"
              fontWeight="600"
            >
              {edge.label}
            </text>
          )}
        </g>
      );
    });
  };

  // Render a single node
  const renderNode = (node: NodoFlujograma) => {
    const nx = node.x + offsetX;
    const ny = node.y + offsetY;
    const status = getNodeStatus(node.id);
    const fase = FASE_MAP[node.id] || node.fase;
    const colors = FASE_SVG_COLORS[fase];
    const label = ESTADO_LABELS[node.id] || node.label;
    const isClickable = status === 'next' && !readOnly;

    // Status-based styling
    let fill = colors.fill;
    let stroke = colors.stroke;
    let strokeW = 1.5;
    let textColor = colors.text;
    let opacity = 1;

    switch (status) {
      case 'current':
        fill = '#eff6ff'; stroke = '#2563eb'; strokeW = 3; textColor = '#1e40af';
        break;
      case 'passed':
        fill = '#f0fdf4'; stroke = '#22c55e'; textColor = '#15803d';
        break;
      case 'terminal_passed':
        fill = '#fef2f2'; stroke = '#ef4444'; textColor = '#991b1b';
        break;
      case 'next':
        fill = '#fefce8'; stroke = '#eab308'; strokeW = 2; textColor = '#854d0e';
        break;
      case 'pending':
        opacity = 0.45; fill = '#f9fafb'; stroke = '#d1d5db'; textColor = '#9ca3af';
        break;
    }

    const handleClick = () => {
      if (isClickable) onTransicion?.(node.id);
    };

    // Decision diamond
    if (node.tipo === 'decision') {
      const cx = nx + DIAMOND_SIZE;
      const cy = ny + DIAMOND_SIZE;
      return (
        <g key={node.id} onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default', opacity }}>
          <polygon
            points={`${cx},${cy - DIAMOND_SIZE} ${cx + DIAMOND_SIZE},${cy} ${cx},${cy + DIAMOND_SIZE} ${cx - DIAMOND_SIZE},${cy}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
          />
          {status === 'current' && (
            <polygon
              points={`${cx},${cy - DIAMOND_SIZE} ${cx + DIAMOND_SIZE},${cy} ${cx},${cy + DIAMOND_SIZE} ${cx - DIAMOND_SIZE},${cy}`}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              opacity={0.4}
            >
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
            </polygon>
          )}
          <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={textColor}>
            {label}
          </text>
          {isClickable && (
            <text x={cx} y={cy + DIAMOND_SIZE + 14} textAnchor="middle" fontSize="8" fill="#eab308" fontWeight="600">
              ▶ Click
            </text>
          )}
        </g>
      );
    }

    // Terminal / end / start circles
    if (node.tipo === 'terminal' || node.tipo === 'end' || node.tipo === 'start') {
      const cx = nx + TERMINAL_R;
      const cy = ny + TERMINAL_R;
      const terminalFill = node.id === 'denegado' ? '#fef2f2' : node.id === 'concedido' ? '#f0fdf4' :
        node.id === 'renunciado' || node.id === 'desistido' ? '#fff7ed' :
        node.tipo === 'start' ? '#eff6ff' : fill;
      const terminalStroke = node.id === 'denegado' ? '#ef4444' : node.id === 'concedido' ? '#22c55e' :
        node.id === 'renunciado' || node.id === 'desistido' ? '#f97316' :
        node.tipo === 'start' ? '#3b82f6' : stroke;
      const tColor = node.id === 'denegado' ? '#991b1b' : node.id === 'concedido' ? '#166534' :
        node.id === 'renunciado' || node.id === 'desistido' ? '#9a3412' :
        node.tipo === 'start' ? '#1e40af' : textColor;

      return (
        <g key={node.id} onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default', opacity: status === 'pending' ? 0.45 : 1 }}>
          <circle cx={cx} cy={cy} r={TERMINAL_R} fill={terminalFill} stroke={terminalStroke} strokeWidth={node.tipo === 'end' ? 3 : strokeW} />
          {status === 'passed' && (
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#22c55e">✓</text>
          )}
          <text x={cx} y={cy + (status === 'passed' ? 8 : 3)} textAnchor="middle" fontSize="8" fontWeight="700" fill={tColor}>
            {label}
          </text>
        </g>
      );
    }

    // Regular task rectangle
    return (
      <g key={node.id} onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default', opacity }}>
        <rect
          x={nx} y={ny}
          width={NODE_W} height={NODE_H}
          rx={6} ry={6}
          fill={fill} stroke={stroke} strokeWidth={strokeW}
        />
        {status === 'current' && (
          <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={6} ry={6} fill="none" stroke="#2563eb" strokeWidth={2} opacity={0.4}>
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
          </rect>
        )}
        {status === 'passed' && (
          <circle cx={nx + NODE_W - 10} cy={ny + 10} r={7} fill="#22c55e" />
        )}
        {status === 'passed' && (
          <text x={nx + NODE_W - 10} y={ny + 13} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">✓</text>
        )}
        <text x={nx + NODE_W / 2} y={ny + NODE_H / 2 + 3} textAnchor="middle" fontSize="9" fontWeight="600" fill={textColor}>
          {label}
        </text>
        {isClickable && (
          <text x={nx + NODE_W / 2} y={ny + NODE_H + 14} textAnchor="middle" fontSize="8" fill="#eab308" fontWeight="600">
            ▶ Ejecutar
          </text>
        )}
        {status === 'current' && (
          <g>
            <rect x={nx + NODE_W / 2 - 18} y={ny - 12} width={36} height={14} rx={7} fill="#2563eb" />
            <text x={nx + NODE_W / 2} y={ny - 2} textAnchor="middle" fontSize="7" fill="white" fontWeight="700">
              ACTUAL
            </text>
          </g>
        )}
      </g>
    );
  };

  // Phase labels (vertical bands)
  const renderPhaseBands = () => {
    const fases: FaseCircuito[] = ['solicitud', 'elegibilidad', 'evaluacion', 'resolucion', 'pago', 'cierre'];
    const faseRanges: Record<string, { minY: number; maxY: number }> = {};

    NODOS_FLUJOGRAMA.forEach(n => {
      const f = FASE_MAP[n.id] || n.fase;
      if (!faseRanges[f]) faseRanges[f] = { minY: Infinity, maxY: -Infinity };
      const ny = n.y + offsetY;
      faseRanges[f].minY = Math.min(faseRanges[f].minY, ny - 20);
      faseRanges[f].maxY = Math.max(faseRanges[f].maxY, ny + NODE_H + 20);
    });

    return fases.map(fase => {
      const range = faseRanges[fase];
      if (!range) return null;
      const colors = FASE_SVG_COLORS[fase];
      return (
        <g key={`phase-${fase}`}>
          <rect
            x={0} y={range.minY - 10}
            width={svgW} height={range.maxY - range.minY + 20}
            fill={colors.fill} opacity={0.15} rx={4}
          />
          <text
            x={svgW - 10} y={range.minY + 14}
            textAnchor="end" fontSize="10" fontWeight="700"
            fill={colors.stroke} opacity={0.7}
          >
            {FASE_LABELS[fase]}
          </text>
        </g>
      );
    });
  };

  return (
    <Card ref={cardRef} className={cn("flex flex-col", isFullscreen ? "h-screen rounded-none border-none" : "h-full")}>
      <CardHeader className="pb-3 border-b shrink-0">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            Flujograma LEADER
            <Badge variant="outline" className="text-[10px]">{totalNodos} pasos</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom('out')} title="Alejar">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom('in')} title="Acercar">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom('fit')} title="Ajustar">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHelp(!showHelp)} title="Ayuda">
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progreso} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {nodosPasados}/{totalNodos} · {progreso}%
          </span>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border-2 border-blue-500 bg-blue-50 inline-block animate-pulse" /> Actual</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-500 inline-block" /><CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> Completado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-500 inline-block" /> Disponible</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300 inline-block opacity-50" /> Pendiente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-50 border border-red-400 inline-block" /> Terminal</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rotate-45 bg-amber-100 border border-amber-400 inline-block" /> Decisión</span>
        </div>
      </CardHeader>

      {showHelp && (
        <div className="p-3 bg-muted/50 border-b text-xs space-y-1">
          <p className="font-semibold">¿Cómo interactuar con el flujograma?</p>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>El <strong className="text-blue-600">nodo azul pulsante</strong> es el estado actual del expediente</li>
            <li>Los <strong className="text-green-600">nodos verdes con ✓</strong> son los pasos ya completados</li>
            <li>Los <strong className="text-yellow-600">nodos amarillos con "▶ Ejecutar"</strong> son los siguientes disponibles — haz click para avanzar</li>
            <li>Los <strong>rombos</strong> son puntos de decisión con bifurcaciones condicionales</li>
            <li>Usa los controles de zoom (+ / - / ajustar) y scroll para navegar</li>
            <li>Sin expediente seleccionado el diagrama es de solo lectura</li>
          </ul>
        </div>
      )}

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full overflow-auto bg-muted/20"
          style={{ minHeight: 500 }}
        >
          <svg
            width={svgW * zoom}
            height={svgH * zoom}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="select-none"
          >
            <defs>
              <marker id="arrow-gray" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#d1d5db" />
              </marker>
              <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
              </marker>
              <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {renderPhaseBands()}
            {renderEdges()}
            {NODOS_FLUJOGRAMA.map(renderNode)}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

export default GaliaCircuitoTramitacion;
