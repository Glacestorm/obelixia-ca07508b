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

// Generous node dimensions for legibility
const NODE_W = 220;
const NODE_H = 58;
const DIAMOND_SIZE = 52;
const TERMINAL_R = 32;
const PAD = 120;
const BTN_W = 90;
const BTN_H = 28;

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

  const nodeMap = useMemo(() => {
    const m: Record<string, NodoFlujograma> = {};
    NODOS_FLUJOGRAMA.forEach(n => { m[n.id] = n; });
    return m;
  }, []);

  // Calculate SVG bounds
  const { offsetX, offsetY, svgW, svgH } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    NODOS_FLUJOGRAMA.forEach(n => {
      const w = n.tipo === 'decision' ? DIAMOND_SIZE * 2 : n.tipo === 'terminal' || n.tipo === 'end' || n.tipo === 'start' ? TERMINAL_R * 2 : NODE_W;
      const h = n.tipo === 'decision' ? DIAMOND_SIZE * 2 : n.tipo === 'terminal' || n.tipo === 'end' || n.tipo === 'start' ? TERMINAL_R * 2 : NODE_H;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    });
    return {
      offsetX: -minX + PAD,
      offsetY: -minY + PAD,
      svgW: maxX - minX + PAD * 2 + NODE_W,
      svgH: maxY - minY + PAD * 2 + NODE_H + 80,
    };
  }, []);

  const getNodeCenter = useCallback((n: NodoFlujograma) => {
    const nx = n.x + offsetX;
    const ny = n.y + offsetY;
    if (n.tipo === 'decision') return { x: nx + DIAMOND_SIZE, y: ny + DIAMOND_SIZE };
    if (n.tipo === 'terminal' || n.tipo === 'end' || n.tipo === 'start') return { x: nx + TERMINAL_R, y: ny + TERMINAL_R };
    return { x: nx + NODE_W / 2, y: ny + NODE_H / 2 };
  }, [offsetX, offsetY]);

  const progreso = getFaseProgreso(estadoActual);
  const totalNodos = NODOS_FLUJOGRAMA.length;
  const nodosPasados = NODOS_FLUJOGRAMA.filter(n => estadosPasados.has(n.id)).length;

  const getNodeStatus = useCallback((id: string): 'current' | 'passed' | 'next' | 'terminal_passed' | 'pending' => {
    if (id === estadoActual) return 'current';
    const isTerminal = ['denegado', 'renunciado', 'desistido', 'cerrado'].includes(id);
    if (estadosPasados.has(id)) return isTerminal ? 'terminal_passed' : 'passed';
    if (nextSet.has(id)) return 'next';
    return 'pending';
  }, [estadoActual, estadosPasados, nextSet]);

  const handleZoom = (dir: 'in' | 'out' | 'fit') => {
    if (dir === 'in') setZoom(z => Math.min(z + 0.15, 2.5));
    else if (dir === 'out') setZoom(z => Math.max(z - 0.15, 0.3));
    else setZoom(1);
  };

  // Scroll to current node
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

  // Word-wrap helper
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

  // === RENDER EDGES ===
  const renderEdges = () => {
    return ARISTAS_FLUJOGRAMA.map((edge, i) => {
      const fromNode = nodeMap[edge.from];
      const toNode = nodeMap[edge.to];
      if (!fromNode || !toNode) return null;

      const start = getNodeCenter(fromNode);
      const end = getNodeCenter(toNode);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const isMainFlow = Math.abs(dx) < 40;

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
            stroke={bothPassed ? '#16a34a' : isActive ? '#2563eb' : '#94a3b8'}
            strokeWidth={bothPassed || isActive ? 3 : 1.8}
            strokeDasharray={isActive ? '8 4' : undefined}
            markerEnd={`url(#arrow-${bothPassed ? 'green' : isActive ? 'blue' : 'gray'})`}
          />
          {edge.label && (
            <g>
              <rect
                x={(start.x + end.x) / 2 - 30}
                y={(start.y + end.y) / 2 - 12}
                width={60}
                height={20}
                rx={4}
                fill="white"
                stroke={bothPassed ? '#86efac' : '#d1d5db'}
                strokeWidth={1}
              />
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 + 3}
                fontSize="11"
                fill={bothPassed ? '#15803d' : '#374151'}
                textAnchor="middle"
                fontWeight="700"
              >
                {edge.label}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  // === STYLE MAP ===
  const getNodeStyle = (status: string) => {
    switch (status) {
      case 'current':
        return { fill: '#bfdbfe', stroke: '#1d4ed8', strokeW: 3.5, text: '#1e3a8a' };
      case 'passed':
        return { fill: '#bbf7d0', stroke: '#16a34a', strokeW: 2.5, text: '#14532d' };
      case 'terminal_passed':
        return { fill: '#fecaca', stroke: '#dc2626', strokeW: 2.5, text: '#7f1d1d' };
      case 'next':
        return { fill: '#fef08a', stroke: '#ca8a04', strokeW: 3, text: '#713f12' };
      default:
        return { fill: '#f1f5f9', stroke: '#94a3b8', strokeW: 1.5, text: '#64748b' };
    }
  };

  // === RENDER EXECUTE BUTTON (foreignObject for reliable click) ===
  const renderExecButton = (cx: number, cy: number, nodeId: string) => {
    return (
      <foreignObject
        x={cx - BTN_W / 2}
        y={cy}
        width={BTN_W}
        height={BTN_H}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onTransicion) onTransicion(nodeId);
          }}
          style={{
            width: BTN_W,
            height: BTN_H,
            background: 'linear-gradient(135deg, #eab308, #ca8a04)',
            color: 'white',
            border: '2px solid #a16207',
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            boxShadow: '0 2px 8px rgba(202,138,4,0.4)',
            letterSpacing: 0.5,
          }}
          title={`Avanzar a: ${ESTADO_LABELS[nodeId] || nodeId}`}
        >
          ▶ Ejecutar
        </button>
      </foreignObject>
    );
  };

  // === RENDER NODE ===
  const renderNode = (node: NodoFlujograma) => {
    const nx = node.x + offsetX;
    const ny = node.y + offsetY;
    const status = getNodeStatus(node.id);
    const label = ESTADO_LABELS[node.id] || node.label;
    const isClickable = status === 'next' && !readOnly;
    const style = getNodeStyle(status);
    const isPending = status === 'pending';

    // DECISION DIAMOND
    if (node.tipo === 'decision') {
      const cx = nx + DIAMOND_SIZE;
      const cy = ny + DIAMOND_SIZE;
      const lines = wrapText(label, 16);
      return (
        <g key={node.id} opacity={isPending ? 0.45 : 1}>
          {/* Diamond shape */}
          <polygon
            points={`${cx},${cy - DIAMOND_SIZE} ${cx + DIAMOND_SIZE},${cy} ${cx},${cy + DIAMOND_SIZE} ${cx - DIAMOND_SIZE},${cy}`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeW}
          />
          {status === 'current' && (
            <polygon
              points={`${cx},${cy - DIAMOND_SIZE - 4} ${cx + DIAMOND_SIZE + 4},${cy} ${cx},${cy + DIAMOND_SIZE + 4} ${cx - DIAMOND_SIZE - 4},${cy}`}
              fill="none" stroke="#1d4ed8" strokeWidth={2} opacity={0.5}
            >
              <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.8s" repeatCount="indefinite" />
            </polygon>
          )}
          {/* Invisible click area for the diamond */}
          <polygon
            points={`${cx},${cy - DIAMOND_SIZE} ${cx + DIAMOND_SIZE},${cy} ${cx},${cy + DIAMOND_SIZE} ${cx - DIAMOND_SIZE},${cy}`}
            fill="transparent"
            stroke="none"
            style={{ cursor: isClickable ? 'pointer' : 'default', pointerEvents: 'all' }}
            onClick={(e) => {
              e.stopPropagation();
              if (isClickable && onTransicion) onTransicion(node.id);
            }}
          />
          {/* Text lines */}
          {lines.map((line, li) => (
            <text key={li} x={cx} y={cy - ((lines.length - 1) * 7) + li * 14 + 5}
              textAnchor="middle" fontSize="13" fontWeight="800" fill={style.text}
              style={{ pointerEvents: 'none' }}
            >
              {line}
            </text>
          ))}
          {/* Execute button */}
          {isClickable && renderExecButton(cx, cy + DIAMOND_SIZE + 6, node.id)}
          {/* Current badge */}
          {status === 'current' && (
            <g>
              <rect x={cx - 30} y={cy - DIAMOND_SIZE - 24} width={60} height={22} rx={11} fill="#1d4ed8" />
              <text x={cx} y={cy - DIAMOND_SIZE - 9} textAnchor="middle" fontSize="11" fill="white" fontWeight="800"
                style={{ pointerEvents: 'none' }}>
                ACTUAL
              </text>
            </g>
          )}
        </g>
      );
    }

    // TERMINAL / START / END circles
    if (node.tipo === 'terminal' || node.tipo === 'end' || node.tipo === 'start') {
      const cx = nx + TERMINAL_R;
      const cy = ny + TERMINAL_R;
      const isStart = node.tipo === 'start';
      const termColors: Record<string, { fill: string; stroke: string; text: string }> = {
        denegado: { fill: '#fecaca', stroke: '#dc2626', text: '#7f1d1d' },
        concedido: { fill: '#bbf7d0', stroke: '#16a34a', text: '#14532d' },
        renunciado: { fill: '#fed7aa', stroke: '#ea580c', text: '#7c2d12' },
        desistido: { fill: '#fed7aa', stroke: '#ea580c', text: '#7c2d12' },
        cerrado: { fill: '#d1d5db', stroke: '#4b5563', text: '#1f2937' },
      };
      const tc = termColors[node.id] || (isStart
        ? { fill: '#bfdbfe', stroke: '#1d4ed8', text: '#1e3a8a' }
        : { fill: style.fill, stroke: style.stroke, text: style.text });

      return (
        <g key={node.id} opacity={isPending ? 0.45 : 1}>
          {(isStart || status === 'current') && (
            <circle cx={cx} cy={cy} r={TERMINAL_R + 5} fill="none" stroke={tc.stroke} strokeWidth={2} opacity={0.3}>
              {status === 'current' && <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite" />}
            </circle>
          )}
          <circle cx={cx} cy={cy} r={TERMINAL_R} fill={tc.fill} stroke={tc.stroke}
            strokeWidth={node.tipo === 'end' ? 4 : isStart ? 3.5 : style.strokeW} />
          {/* Click area */}
          <circle cx={cx} cy={cy} r={TERMINAL_R} fill="transparent" stroke="none"
            style={{ cursor: isClickable ? 'pointer' : 'default', pointerEvents: 'all' }}
            onClick={(e) => {
              e.stopPropagation();
              if (isClickable && onTransicion) onTransicion(node.id);
            }}
          />
          {status === 'passed' && (
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fill="#16a34a" fontWeight="800"
              style={{ pointerEvents: 'none' }}>✓</text>
          )}
          <text x={cx} y={cy + (status === 'passed' ? 14 : 5)} textAnchor="middle"
            fontSize="13" fontWeight="800" fill={tc.text}
            style={{ pointerEvents: 'none' }}>
            {label}
          </text>
          {isClickable && renderExecButton(cx, cy + TERMINAL_R + 6, node.id)}
        </g>
      );
    }

    // REGULAR TASK RECTANGLE
    const lines = wrapText(label, 20);
    return (
      <g key={node.id} opacity={isPending ? 0.4 : 1}>
        {/* Drop shadow for current/next */}
        {(status === 'current' || status === 'next') && (
          <rect x={nx + 3} y={ny + 3} width={NODE_W} height={NODE_H} rx={10}
            fill={style.stroke} opacity={0.15} />
        )}
        {/* Main rect */}
        <rect
          x={nx} y={ny} width={NODE_W} height={NODE_H}
          rx={10} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeW}
        />
        {/* Pulse for current */}
        {status === 'current' && (
          <rect x={nx - 3} y={ny - 3} width={NODE_W + 6} height={NODE_H + 6} rx={13}
            fill="none" stroke="#1d4ed8" strokeWidth={2.5} opacity={0.5}>
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite" />
          </rect>
        )}
        {/* Transparent click target covering the whole rect */}
        <rect
          x={nx} y={ny} width={NODE_W} height={NODE_H}
          rx={10} fill="transparent" stroke="none"
          style={{ cursor: isClickable ? 'pointer' : 'default', pointerEvents: 'all' }}
          onClick={(e) => {
            e.stopPropagation();
            if (isClickable && onTransicion) onTransicion(node.id);
          }}
        />
        {/* Check mark for passed */}
        {status === 'passed' && (
          <g>
            <circle cx={nx + NODE_W - 16} cy={ny + 16} r={11} fill="#16a34a" />
            <text x={nx + NODE_W - 16} y={ny + 21} textAnchor="middle" fontSize="13" fill="white" fontWeight="800"
              style={{ pointerEvents: 'none' }}>✓</text>
          </g>
        )}
        {/* Text lines — BOLD and high contrast */}
        {lines.map((line, li) => (
          <text key={li}
            x={nx + NODE_W / 2}
            y={ny + NODE_H / 2 - ((lines.length - 1) * 8) + li * 16 + 5}
            textAnchor="middle" fontSize="14" fontWeight="700" fill={style.text}
            style={{ pointerEvents: 'none' }}
          >
            {line}
          </text>
        ))}
        {/* Execute button using foreignObject for real HTML click */}
        {isClickable && renderExecButton(nx + NODE_W / 2, ny + NODE_H + 6, node.id)}
        {/* ACTUAL badge */}
        {status === 'current' && (
          <g>
            <rect x={nx + NODE_W / 2 - 30} y={ny - 22} width={60} height={22} rx={11} fill="#1d4ed8" />
            <text x={nx + NODE_W / 2} y={ny - 7} textAnchor="middle" fontSize="11" fill="white" fontWeight="800"
              style={{ pointerEvents: 'none' }}>
              ACTUAL
            </text>
          </g>
        )}
      </g>
    );
  };

  // === PHASE BANDS ===
  const renderPhaseBands = () => {
    const fases: FaseCircuito[] = ['solicitud', 'elegibilidad', 'evaluacion', 'resolucion', 'pago', 'cierre'];
    const faseRanges: Record<string, { minY: number; maxY: number }> = {};

    NODOS_FLUJOGRAMA.forEach(n => {
      const f = FASE_MAP[n.id] || n.fase;
      if (!faseRanges[f]) faseRanges[f] = { minY: Infinity, maxY: -Infinity };
      const ny = n.y + offsetY;
      faseRanges[f].minY = Math.min(faseRanges[f].minY, ny - 40);
      faseRanges[f].maxY = Math.max(faseRanges[f].maxY, ny + NODE_H + 50);
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
            fill={colors.fill} opacity={0.15} rx={8}
          />
          <rect
            x={svgW - 160} y={range.minY - 2}
            width={150} height={26}
            rx={6} fill="white" opacity={0.85}
          />
          <text
            x={svgW - 85} y={range.minY + 18}
            textAnchor="middle" fontSize="14" fontWeight="800"
            fill={colors.stroke}
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
            <span className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-200 inline-block animate-pulse" /> Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-200 border-2 border-green-600 inline-block" />
            <CheckCircle2 className="h-3 w-3 text-green-600" /> Completado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-200 border-2 border-yellow-600 inline-block" /> Disponible (click)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-200 border border-gray-400 inline-block opacity-50" /> Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-red-100 border-2 border-red-500 inline-block" /> Terminal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rotate-45 bg-amber-200 border-2 border-amber-500 inline-block" /> Decisión
          </span>
        </div>
      </CardHeader>

      {showHelp && (
        <div className="p-4 bg-muted/50 border-b text-sm space-y-1.5">
          <p className="font-semibold">¿Cómo interactuar con el flujograma?</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>El <strong className="text-blue-600">nodo azul pulsante</strong> es el estado actual del expediente</li>
            <li>Los <strong className="text-green-600">nodos verdes con ✓</strong> son los pasos ya completados</li>
            <li>Los <strong className="text-yellow-600">nodos amarillos con botón "▶ Ejecutar"</strong> — haz click en el botón o en el nodo para avanzar</li>
            <li>Los <strong>rombos</strong> son puntos de decisión con bifurcaciones condicionales</li>
            <li>Usa los controles de zoom (+/−/reset) y scroll para navegar</li>
            <li>Sin expediente seleccionado el diagrama es de solo lectura</li>
          </ul>
        </div>
      )}

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full overflow-auto"
          style={{
            minHeight: isFullscreen ? 'calc(100vh - 200px)' : 500,
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          }}
        >
          <svg
            width={svgW * zoom}
            height={svgH * zoom}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="select-none"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            <defs>
              <marker id="arrow-gray" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto">
                <polygon points="0 0, 12 5, 0 10" fill="#94a3b8" />
              </marker>
              <marker id="arrow-green" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto">
                <polygon points="0 0, 12 5, 0 10" fill="#16a34a" />
              </marker>
              <marker id="arrow-blue" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto">
                <polygon points="0 0, 12 5, 0 10" fill="#2563eb" />
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
