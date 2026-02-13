/**
 * GALIA - Circuito de Tramitación Visual
 * Visualización interactiva del flujograma LEADER con estado en tiempo real
 */

import { useCallback } from 'react';
import { useGaliaCircuitoTramitacion, FaseCircuito, FASE_LABELS as FASE_LABELS_CONST, ESTADO_LABELS as ESTADO_LABELS_CONST } from '@/hooks/galia/useGaliaCircuitoTramitacion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Circle, ArrowRight, AlertTriangle, FileText, 
  Search, ShieldCheck, Euro, Archive, Milestone, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaliaCircuitoTramitacionProps {
  estadoActual: string;
  historial?: Array<{ de: string; a: string; resultado: string; timestamp: string }>;
  onTransicion?: (nuevoEstado: string) => void;
  readOnly?: boolean;
}

const NODOS_CIRCUITO: Array<{ id: string; fase: FaseCircuito; icon: React.ElementType; x: number; y: number }> = [
  // Solicitud
  { id: 'incorporacion_solicitud', fase: 'solicitud', icon: FileText, x: 50, y: 50 },
  { id: 'peticion_informes_cruzados', fase: 'solicitud', icon: Search, x: 250, y: 50 },
  { id: 'apertura_expediente', fase: 'solicitud', icon: FileText, x: 450, y: 50 },
  { id: 'especificacion_controles', fase: 'solicitud', icon: ShieldCheck, x: 650, y: 50 },
  
  // Elegibilidad
  { id: 'control_elegibilidad_oodr', fase: 'elegibilidad', icon: CheckCircle2, x: 50, y: 150 },
  { id: 'control_administrativo_elegibilidad', fase: 'elegibilidad', icon: CheckCircle2, x: 250, y: 150 },
  { id: 'propuesta_resolucion_elegibilidad', fase: 'elegibilidad', icon: FileText, x: 450, y: 150 },
  { id: 'resolucion_elegibilidad_dg', fase: 'elegibilidad', icon: CheckCircle2, x: 650, y: 150 },
  
  // Evaluación
  { id: 'peticion_informe_tecnico_economico', fase: 'evaluacion', icon: FileText, x: 50, y: 250 },
  { id: 'tramite_espera_junta_ct', fase: 'evaluacion', icon: Milestone, x: 250, y: 250 },
  { id: 'control_previsto_ayuda_concesion', fase: 'evaluacion', icon: ShieldCheck, x: 450, y: 250 },
  
  // Resolución
  { id: 'tramite_espera_resolucion_dg', fase: 'resolucion', icon: Milestone, x: 50, y: 350 },
  { id: 'incorporar_resolucion_dg', fase: 'resolucion', icon: FileText, x: 250, y: 350 },
  { id: 'notificacion_beneficiario', fase: 'resolucion', icon: ArrowRight, x: 450, y: 350 },
  { id: 'control_aceptacion_renuncia', fase: 'resolucion', icon: ShieldCheck, x: 650, y: 350 },
  
  // Pago
  { id: 'aceptacion_pago_anticipado', fase: 'pago', icon: Euro, x: 50, y: 450 },
  { id: 'adjuntar_solicitud_pago', fase: 'pago', icon: FileText, x: 250, y: 450 },
  { id: 'especificacion_controles_pago', fase: 'pago', icon: ShieldCheck, x: 450, y: 450 },
  { id: 'informe_certificacion', fase: 'pago', icon: CheckCircle2, x: 650, y: 450 },
  { id: 'acta_verificacion_in_situ', fase: 'pago', icon: MapPin, x: 850, y: 450 },
  { id: 'control_certificacion_pago', fase: 'pago', icon: ShieldCheck, x: 1050, y: 450 },
  
  // Cierre
  { id: 'propuesta_ordenacion_pago', fase: 'cierre', icon: Euro, x: 50, y: 550 },
  { id: 'peticion_orden_pago', fase: 'cierre', icon: Euro, x: 250, y: 550 },
  { id: 'indicar_fecha_pago', fase: 'cierre', icon: CheckCircle2, x: 450, y: 550 },
  { id: 'terminacion_expediente', fase: 'cierre', icon: Archive, x: 650, y: 550 },
];

export function GaliaCircuitoTramitacion({ 
  estadoActual, 
  historial = [], 
  onTransicion,
  readOnly = false 
}: GaliaCircuitoTramitacionProps) {
  const { getTransicionesDisponibles, FASE_COLORS, FASE_LABELS, ESTADO_LABELS } = useGaliaCircuitoTramitacion();
  
  const transicionesPosibles = getTransicionesDisponibles(estadoActual);
  const estadosPasados = new Set(historial.map(h => h.a));
  estadosPasados.add(estadoActual); // El actual también es "pasado" o "presente"

  const renderFase = (fase: FaseCircuito) => {
    const nodosFase = NODOS_CIRCUITO.filter(n => n.fase === fase);
    if (nodosFase.length === 0) return null;

    return (
      <div key={fase} className="mb-6 last:mb-0">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={cn("uppercase text-[10px]", FASE_COLORS[fase])}>
            {FASE_LABELS[fase]}
          </Badge>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {nodosFase.map((nodo) => {
            const isActual = estadoActual === nodo.id;
            const isPasado = estadosPasados.has(nodo.id) && !isActual;
            const isNext = transicionesPosibles.some(t => t.estado === nodo.id);
            const Icon = nodo.icon;

            return (
              <div 
                key={nodo.id}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-lg border min-w-[120px] max-w-[140px] text-center transition-all",
                  isActual && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary",
                  isPasado && "border-green-500/30 bg-green-500/5 text-muted-foreground",
                  isNext && !readOnly && "border-dashed border-primary/50 cursor-pointer hover:bg-primary/5 hover:border-primary",
                  !isActual && !isPasado && !isNext && "opacity-50 grayscale border-dashed"
                )}
                onClick={() => isNext && !readOnly && onTransicion?.(nodo.id)}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-2",
                  isActual ? "bg-primary text-primary-foreground" : 
                  isPasado ? "bg-green-500 text-white" :
                  isNext ? "bg-muted text-muted-foreground" : "bg-muted/30 text-muted-foreground/50"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-medium leading-tight">
                  {ESTADO_LABELS[nodo.id] || nodo.id}
                </span>
                
                {isActual && (
                  <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-[9px] animate-pulse">
                    Actual
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Circuito de Tramitación
          </div>
          {!readOnly && transicionesPosibles.length > 0 && (
            <div className="flex gap-2">
              {transicionesPosibles.map(t => (
                <Button 
                  key={t.estado} 
                  size="sm" 
                  onClick={() => onTransicion?.(t.estado)}
                  className="text-xs h-7"
                >
                  Avanzar a {t.label}
                </Button>
              ))}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {(['solicitud', 'elegibilidad', 'evaluacion', 'resolucion', 'pago', 'cierre'] as FaseCircuito[]).map(renderFase)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GaliaCircuitoTramitacion;
