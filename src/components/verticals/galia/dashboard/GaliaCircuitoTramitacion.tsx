/**
 * GALIA - Circuito de Tramitación Visual Completo
 * Visualización interactiva del flujograma LEADER con todos los estados (~35 pasos)
 */

import { useCallback } from 'react';
import { useGaliaCircuitoTramitacion, FaseCircuito, FASE_LABELS as FASE_LABELS_CONST, ESTADO_LABELS as ESTADO_LABELS_CONST } from '@/hooks/galia/useGaliaCircuitoTramitacion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, ArrowRight, AlertTriangle, FileText, 
  Search, ShieldCheck, Euro, Archive, Milestone, MapPin,
  ClipboardCheck, BarChart3, Ban, XCircle, Bell, FileWarning,
  Scale, Gavel, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaliaCircuitoTramitacionProps {
  estadoActual: string;
  historial?: Array<{ de: string; a: string; resultado: string; timestamp: string }>;
  onTransicion?: (nuevoEstado: string) => void;
  readOnly?: boolean;
}

interface NodoCircuito {
  id: string;
  fase: FaseCircuito;
  icon: React.ElementType;
}

// === ALL CIRCUIT NODES ORGANIZED BY PHASE ===
const NODOS_POR_FASE: Record<FaseCircuito, NodoCircuito[]> = {
  solicitud: [
    { id: 'incorporacion_solicitud', fase: 'solicitud', icon: FileText },
    { id: 'peticion_informes_cruzados', fase: 'solicitud', icon: Search },
    { id: 'apertura_expediente', fase: 'solicitud', icon: FileText },
    { id: 'especificacion_controles', fase: 'solicitud', icon: ShieldCheck },
    { id: 'requerimiento_subsanacion', fase: 'solicitud', icon: FileWarning },
  ],
  elegibilidad: [
    { id: 'control_elegibilidad_oodr', fase: 'elegibilidad', icon: CheckCircle2 },
    { id: 'control_administrativo_elegibilidad', fase: 'elegibilidad', icon: ClipboardCheck },
    { id: 'propuesta_resolucion_elegibilidad', fase: 'elegibilidad', icon: FileText },
    { id: 'resolucion_elegibilidad_dg', fase: 'elegibilidad', icon: Gavel },
    { id: 'elegibilidad_hechos', fase: 'elegibilidad', icon: CheckCircle2 },
    { id: 'indicadores_expediente', fase: 'elegibilidad', icon: BarChart3 },
  ],
  evaluacion: [
    { id: 'peticion_informe_tecnico_economico', fase: 'evaluacion', icon: FileText },
    { id: 'tramite_espera_junta_ct', fase: 'evaluacion', icon: Clock },
    { id: 'control_previsto_ayuda_concesion', fase: 'evaluacion', icon: ShieldCheck },
  ],
  resolucion: [
    { id: 'tramite_espera_resolucion_dg', fase: 'resolucion', icon: Clock },
    { id: 'incorporar_resolucion_dg', fase: 'resolucion', icon: FileText },
    { id: 'notificacion_beneficiario', fase: 'resolucion', icon: Bell },
    { id: 'control_aceptacion_renuncia', fase: 'resolucion', icon: ShieldCheck },
  ],
  pago: [
    { id: 'aceptacion_pago_anticipado', fase: 'pago', icon: Euro },
    { id: 'solicitud_excepcion', fase: 'pago', icon: FileWarning },
    { id: 'adjuntar_solicitud_pago', fase: 'pago', icon: FileText },
    { id: 'peticion_informes_cruzados_pago', fase: 'pago', icon: Search },
    { id: 'especificacion_controles_pago', fase: 'pago', icon: ShieldCheck },
    { id: 'requerimiento_subsanacion_pago', fase: 'pago', icon: FileWarning },
    { id: 'informe_certificacion', fase: 'pago', icon: CheckCircle2 },
    { id: 'control_justificacion', fase: 'pago', icon: ClipboardCheck },
    { id: 'acta_verificacion_in_situ', fase: 'pago', icon: MapPin },
    { id: 'control_contratacion_publica', fase: 'pago', icon: Scale },
    { id: 'control_certificacion_pago', fase: 'pago', icon: ShieldCheck },
  ],
  cierre: [
    { id: 'propuesta_ordenacion_pago', fase: 'cierre', icon: Euro },
    { id: 'peticion_orden_pago', fase: 'cierre', icon: Euro },
    { id: 'indicar_fecha_pago', fase: 'cierre', icon: CheckCircle2 },
    { id: 'resolucion_revocacion', fase: 'cierre', icon: XCircle },
    { id: 'notificacion_revocacion', fase: 'cierre', icon: Bell },
    { id: 'terminacion_expediente', fase: 'cierre', icon: Archive },
  ],
};

const FASES_ORDERED: FaseCircuito[] = ['solicitud', 'elegibilidad', 'evaluacion', 'resolucion', 'pago', 'cierre'];

export function GaliaCircuitoTramitacion({ 
  estadoActual, 
  historial = [], 
  onTransicion,
  readOnly = false 
}: GaliaCircuitoTramitacionProps) {
  const { getTransicionesDisponibles, getFaseProgreso, FASE_COLORS, FASE_LABELS, ESTADO_LABELS } = useGaliaCircuitoTramitacion();
  
  const transicionesPosibles = getTransicionesDisponibles(estadoActual);
  const estadosPasados = new Set(historial.map(h => h.a));
  historial.forEach(h => estadosPasados.add(h.de));
  estadosPasados.add(estadoActual);

  const progreso = getFaseProgreso(estadoActual);

  const renderNodo = (nodo: NodoCircuito) => {
    const isActual = estadoActual === nodo.id;
    const isPasado = estadosPasados.has(nodo.id) && !isActual;
    const isNext = transicionesPosibles.some(t => t.estado === nodo.id);
    const Icon = nodo.icon;

    return (
      <div 
        key={nodo.id}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
          isActual && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary",
          isPasado && "border-green-500/30 bg-green-500/5 text-muted-foreground",
          isNext && !readOnly && "border-dashed border-primary/50 cursor-pointer hover:bg-primary/5 hover:border-primary",
          !isActual && !isPasado && !isNext && "opacity-40 border-dashed"
        )}
        onClick={() => isNext && !readOnly && onTransicion?.(nodo.id)}
        title={ESTADO_LABELS[nodo.id] || nodo.id}
      >
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
          isActual ? "bg-primary text-primary-foreground" : 
          isPasado ? "bg-green-500 text-white" :
          isNext ? "bg-muted text-muted-foreground" : "bg-muted/30 text-muted-foreground/50"
        )}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-[11px] font-medium leading-tight truncate">
          {ESTADO_LABELS[nodo.id] || nodo.id}
        </span>
        
        {isActual && (
          <Badge className="absolute -top-2 -right-2 h-4 px-1 text-[8px] animate-pulse">
            Actual
          </Badge>
        )}
      </div>
    );
  };

  const renderFase = (fase: FaseCircuito, idx: number) => {
    const nodos = NODOS_POR_FASE[fase];
    if (!nodos || nodos.length === 0) return null;

    const faseHasActual = nodos.some(n => n.id === estadoActual);
    const faseCompleted = nodos.every(n => estadosPasados.has(n.id) && n.id !== estadoActual);

    return (
      <div key={fase} className="mb-5 last:mb-0">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider",
            FASE_COLORS[fase]
          )}>
            <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[9px]">
              {idx + 1}
            </span>
            {FASE_LABELS[fase]}
          </div>
          {faseCompleted && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          )}
          {faseHasActual && (
            <span className="text-[10px] text-primary font-medium">← En curso</span>
          )}
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-[10px] text-muted-foreground">{nodos.length} pasos</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pl-2">
          {nodos.map(renderNodo)}
        </div>
      </div>
    );
  };

  const totalNodos = Object.values(NODOS_POR_FASE).flat().length;
  const nodosPasados = Object.values(NODOS_POR_FASE).flat().filter(n => estadosPasados.has(n.id)).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Circuito de Tramitación LEADER
            <Badge variant="outline" className="text-[10px]">{totalNodos} pasos</Badge>
          </div>
          {!readOnly && transicionesPosibles.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
              {transicionesPosibles.slice(0, 3).map(t => (
                <Button 
                  key={t.estado} 
                  size="sm" 
                  onClick={() => onTransicion?.(t.estado)}
                  className="text-[10px] h-6 px-2"
                >
                  → {t.label}
                </Button>
              ))}
              {transicionesPosibles.length > 3 && (
                <Badge variant="secondary" className="text-[10px]">+{transicionesPosibles.length - 3} más</Badge>
              )}
            </div>
          )}
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progreso} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {nodosPasados}/{totalNodos} completados · {progreso}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="h-[600px] pr-2">
          <div className="space-y-1">
            {FASES_ORDERED.map((fase, idx) => renderFase(fase, idx))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GaliaCircuitoTramitacion;
