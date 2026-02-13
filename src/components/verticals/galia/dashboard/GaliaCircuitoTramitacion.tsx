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
import { ZoomIn, ZoomOut, Maximize2, Minimize2, HelpCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaliaCircuitoTramitacionProps {
  estadoActual: string;
  historial?: Array<{ de: string; a: string; resultado: string; timestamp: string }>;
  onTransicion?: (nuevoEstado: string) => void;
  readOnly?: boolean;
}

// Node dimensions — larger for readability
const NODE_W = 200;
const NODE_H = 52;
const DIAMOND_SIZE = 48;
const TERMINAL_R = 28;
const PAD = 100;

export function GaliaCircuitoTramitacion({
  estadoActual,
  historial = [],
  onTransicion,
  readOnly = false,
}: GaliaCircuitoTramitacionProps) {
  const { getTransicionesDisponibles, getFaseProgreso } = useGaliaCircuitoTramitacion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
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

  // Calculate SVG bounds
  const { offsetX, offsetY, svgW, svgH } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    NODOS_FLUJOGRAMA.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_H);
    });
    const ox = -minX + PAD;
    const oy = -minY + PAD;
    return {
      offsetX: ox,
      offsetY: oy,
      svgW: maxX - minX + PAD * 2 + NODE_W,
      svgH: maxY - minY + PAD * 2 + NODE_H + 60,
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
    if (dir === 'in') setZoom(z => Math.min(z + 0.15, 2.5));
    else if (dir === 'out') setZoom(z => Math.max(z - 0.15, 0.3));
    else setZoom(1);
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

  // Word-wrap text into lines
  const wrapText = (text: string, maxChars: number): string[] => {
    if (text.length <= maxChars) return [text];
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars && current) {
        lines.push(current.trim());
        current = word;
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) lines.push(current.trim());
    return lines;
  };

  // Render edges
  const renderEdges = () => {
    return ARISTAS_FLUJOGRAMA.map((edge, i) => {
      const fromNode = nodeMap[edge.from];
      const toNode = nodeMap[edge.to];
      if (!fromNode || !toNode) return null;

      const start = getNodeCenter(fromNode);
      const end = getNodeCenter(toNode);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const isMainFlow = Math.abs(dx) < 30;
      
      let path: string;
      if (isMainFlow) {
        path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else {
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
            stroke={bothPassed ? '#22c55e' : isActive ? '#3b82f6' : '#cbd5e1'}
            strokeWidth={bothPassed || isActive ? 2.5 : 1.5}
            strokeDasharray={isActive ? '8 4' : undefined}
            markerEnd={`url(#arrow-${bothPassed ? 'green' : isActive ? 'blue' : 'gray'})`}
          />
          {edge.label && (
            <g>
              <rect
                x={(start.x + end.x) / 2 + (dx > 0 ? 6 : dx < 0 ? -6 : 14) - 24}
                y={(start.y + end.y) / 2 - 14}
                width={48}
                height={16}
                rx={4}
                fill="white"
                stroke={bothPassed ? '#bbf7d0' : '#e2e8f0'}
                strokeWidth={0.5}
                opacity={0.9}
              />
              <text
                x={(start.x + end.x) / 2 + (dx > 0 ? 6 : dx < 0 ? -6 : 14)}
                y={(start.y + end.y) / 2 - 3}
                fontSize="10"
                fill={bothPassed ? '#16a34a' : '#64748b'}
                textAnchor="middle"
                fontWeight="600"
              >
                {edge.label}
              </text>
            </g>
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
    let shadow = false;

    switch (status) {
      case 'current':
        fill = '#dbeafe'; stroke = '#2563eb'; strokeW = 3; textColor = '#1e3a8a'; shadow = true;
        break;
      case 'passed':
        fill = '#dcfce7'; stroke = '#22c55e'; strokeW = 2; textColor = '#14532d';
        break;
      case 'terminal_passed':
        fill = '#fee2e2'; stroke = '#ef4444'; strokeW = 2; textColor = '#7f1d1d';
        break;
      case 'next':
        fill = '#fef9c3'; stroke = '#eab308'; strokeW = 2.5; textColor = '#713f12'; shadow = true;
        break;
      case 'pending':
        opacity = 0.5; fill = '#f8fafc'; stroke = '#cbd5e1'; textColor = '#94a3b8';
        break;
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isClickable && onTransicion) {
        onTransicion(node.id);
      }
    };

    // Decision diamond
    if (node.tipo === 'decision') {
      const cx = nx + DIAMOND_SIZE;
      const cy = ny + DIAMOND_SIZE;
      const lines = wrapText(label, 14);
      return (
        <g key={node.id} onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default', opacity }}>
          {shadow && (
            <polygon
              points={`${cx},${cy - DIAMOND_SIZE - 2} ${cx + DIAMOND_SIZE + 2},${cy} ${cx},${cy + DIAMOND_SIZE + 2} ${cx - DIAMOND_SIZE - 2},${cy}`}
              fill="none" stroke={stroke} strokeWidth={1} opacity={0.2}
            />
          )}
          <polygon
            points={`${cx},${cy - DIAMOND_SIZE} ${cx + DIAMOND_SIZE},${cy} ${cx},${cy + DIAMOND_SIZE} ${cx - DIAMOND_SIZE},${cy}`}
            fill={fill} stroke={stroke} strokeWidth={strokeW}
          />
          {status === 'current' && (
            <polygon
              points={`${cx},${cy - DIAMOND_SIZE} ${cx + DIAMOND_SIZE},${cy} ${cx},${cy + DIAMOND_SIZE} ${cx - DIAMOND_SIZE},${cy}`}
              fill="none" stroke="#2563eb" strokeWidth={2} opacity={0.4}
            >
              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
            </polygon>
          )}
          {lines.map((line, li) => (
            <text key={li} x={cx} y={cy - ((lines.length - 1) * 6) + li * 12 + 4}
              textAnchor="middle" fontSize="11" fontWeight="700" fill={textColor}>
              {line}
            </text>
          ))}
          {isClickable && (
            <g>
              <rect x={cx - 30} y={cy + DIAMOND_SIZE + 4} width={60} height={20} rx={10}
                fill="#eab308" opacity={0.9} style={{ cursor: 'pointer' }} />
              <text x={cx} y={cy + DIAMOND_SIZE + 18} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">
                ▶ Click
              </text>
            </g>
          )}
        </g>
      );
    }

    // Terminal / end / start circles
    if (node.tipo === 'terminal' || node.tipo === 'end' || node.tipo === 'start') {
      const cx = nx + TERMINAL_R;
      const cy = ny + TERMINAL_R;
      const terminalFill = node.id === 'denegado' ? '#fee2e2' : node.id === 'concedido' ? '#dcfce7' :
        node.id === 'renunciado' || node.id === 'desistido' ? '#ffedd5' :
        node.tipo === 'start' ? '#dbeafe' : fill;
      const terminalStroke = node.id === 'denegado' ? '#ef4444' : node.id === 'concedido' ? '#22c55e' :
        node.id === 'renunciado' || node.id === 'desistido' ? '#f97316' :
        node.tipo === 'start' ? '#3b82f6' : stroke;
      const tColor = node.id === 'denegado' ? '#7f1d1d' : node.id === 'concedido' ? '#14532d' :
        node.id === 'renunciado' || node.id === 'desistido' ? '#7c2d12' :
        node.tipo === 'start' ? '#1e3a8a' : textColor;

      return (
        <g key={node.id} onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default', opacity: status === 'pending' ? 0.5 : 1 }}>
          {(node.tipo === 'start' || status === 'current') && (
            <circle cx={cx} cy={cy} r={TERMINAL_R + 4} fill="none" stroke={terminalStroke} strokeWidth={1.5} opacity={0.3}>
              {status === 'current' && <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />}
            </circle>
          )}
          <circle cx={cx} cy={cy} r={TERMINAL_R} fill={terminalFill} stroke={terminalStroke}
            strokeWidth={node.tipo === 'end' ? 3.5 : node.tipo === 'start' ? 3 : strokeW} />
          {status === 'passed' && (
            <text x={cx} y={cy - 5} textAnchor="middle" fontSize="14" fill="#22c55e" fontWeight="700">✓</text>
          )}
          <text x={cx} y={cy + (status === 'passed' ? 10 : 4)} textAnchor="middle" fontSize="11" fontWeight="700" fill={tColor}>
            {label}
          </text>
        </g>
      );
    }

    // Regular task rectangle
    const lines = wrapText(label, 22);
    return (
      <g key={node.id} onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default', opacity }}>
        {shadow && (
          <rect x={nx + 2} y={ny + 2} width={NODE_W} height={NODE_H} rx={8} ry={8}
            fill="none" stroke={stroke} strokeWidth={1} opacity={0.15} />
        )}
        <rect
          x={nx} y={ny}
          width={NODE_W} height={NODE_H}
          rx={8} ry={8}
          fill={fill} stroke={stroke} strokeWidth={strokeW}
        />
        {status === 'current' && (
          <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={8} ry={8}
            fill="none" stroke="#2563eb" strokeWidth={2.5} opacity={0.4}>
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
          </rect>
        )}
        {status === 'passed' && (
          <>
            <circle cx={nx + NODE_W - 14} cy={ny + 14} r={9} fill="#22c55e" />
            <text x={nx + NODE_W - 14} y={ny + 18} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">✓</text>
          </>
        )}
        {lines.map((line, li) => (
          <text key={li}
            x={nx + NODE_W / 2}
            y={ny + NODE_H / 2 - ((lines.length - 1) * 7) + li * 14 + 4}
            textAnchor="middle" fontSize="12" fontWeight="600" fill={textColor}>
            {line}
          </text>
        ))}
        {isClickable && (
          <g style={{ cursor: 'pointer' }}>
            <rect x={nx + NODE_W / 2 - 38} y={ny + NODE_H + 4} width={76} height={22} rx={11}
              fill="#eab308" opacity={0.9} />
            <text x={nx + NODE_W / 2} y={ny + NODE_H + 19} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">
              ▶ Ejecutar
            </text>
          </g>
        )}
        {status === 'current' && (
          <g>
            <rect x={nx + NODE_W / 2 - 24} y={ny - 16} width={48} height={18} rx={9} fill="#2563eb" />
            <text x={nx + NODE_W / 2} y={ny - 3} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">
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
      faseRanges[f].minY = Math.min(faseRanges[f].minY, ny - 30);
      faseRanges[f].maxY = Math.max(faseRanges[f].maxY, ny + NODE_H + 30);
    });

    return fases.map(fase => {
      const range = faseRanges[fase];
      if (!range) return null;
      const colors = FASE_SVG_COLORS[fase];
      return (
        <g key={`phase-${fase}`}>
          <rect
            x={0} y={range.minY - 12}
            width={svgW} height={range.maxY - range.minY + 24}
            fill={colors.fill} opacity={0.12} rx={6}
          />
          <text
            x={svgW - 14} y={range.minY + 16}
            textAnchor="end" fontSize="13" fontWeight="700"
            fill={colors.stroke} opacity={0.65}
          >
            {FASE_LABELS[fase]}
          </text>
        </g>
      );
    });
  };

  return (
    <Card ref={cardRef} className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "h-screen rounded-none border-none" : "h-full"
    )}>
      <CardHeader className="pb-3 border-b shrink-0">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span className="font-semibold">Flujograma LEADER</span>
            <Badge variant="outline" className="text-xs">{totalNodos} pasos</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('out')} title="Alejar">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('in')} title="Acercar">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('fit')} title="Ajustar 100%">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHelp(!showHelp)} title="Ayuda">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progreso} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
            {nodosPasados}/{totalNodos} · {progreso}%
          </span>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100 inline-block animate-pulse" /> Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-100 border-2 border-green-500 inline-block" />
            <CheckCircle2 className="h-3 w-3 text-green-500" /> Completado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-500 inline-block" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 border border-gray-300 inline-block opacity-50" /> Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-red-50 border-2 border-red-400 inline-block" /> Terminal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rotate-45 bg-amber-100 border-2 border-amber-400 inline-block" /> Decisión
          </span>
        </div>
      </CardHeader>

      {showHelp && (
        <div className="p-4 bg-muted/50 border-b text-sm space-y-1.5">
          <p className="font-semibold">¿Cómo interactuar con el flujograma?</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>El <strong className="text-blue-600">nodo azul pulsante</strong> es el estado actual del expediente</li>
            <li>Los <strong className="text-green-600">nodos verdes con ✓</strong> son los pasos ya completados</li>
            <li>Los <strong className="text-yellow-600">nodos amarillos con "▶ Ejecutar"</strong> son los siguientes disponibles — haz click para avanzar</li>
            <li>Los <strong>rombos</strong> son puntos de decisión con bifurcaciones condicionales</li>
            <li>Usa los controles de zoom (+/−/reset) y scroll para navegar</li>
            <li>Sin expediente seleccionado el diagrama es de solo lectura</li>
          </ul>
        </div>
      )}

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full overflow-auto bg-muted/10"
          style={{ minHeight: isFullscreen ? 'calc(100vh - 180px)' : 500 }}
        >
          <svg
            width={svgW * zoom}
            height={svgH * zoom}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="select-none"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            <defs>
              <marker id="arrow-gray" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 0, 10 4, 0 8" fill="#cbd5e1" />
              </marker>
              <marker id="arrow-green" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 0, 10 4, 0 8" fill="#22c55e" />
              </marker>
              <marker id="arrow-blue" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 0, 10 4, 0 8" fill="#3b82f6" />
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
