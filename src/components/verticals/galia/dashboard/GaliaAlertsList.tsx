/**
 * GALIA - Lista de Alertas
 * Panel de alertas con filtros y acciones
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Clock,
  FileText,
  Euro,
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Filter,
  Bot,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Alerta {
  id: string;
  tipo: 'plazo' | 'documento' | 'coste' | 'riesgo' | 'sistema';
  prioridad: 'alta' | 'media' | 'baja';
  titulo: string;
  descripcion: string;
  expediente?: string;
  fecha: string;
  resuelta: boolean;
  accionRequerida?: string;
}

const alertasMock: Alerta[] = [
  {
    id: '1',
    tipo: 'plazo',
    prioridad: 'alta',
    titulo: 'Vencimiento inminente',
    descripcion: 'El plazo de justificación vence en 5 días',
    expediente: 'EXP-2024-0045',
    fecha: new Date().toISOString(),
    resuelta: false,
    accionRequerida: 'Contactar beneficiario',
  },
  {
    id: '2',
    tipo: 'coste',
    prioridad: 'alta',
    titulo: 'Desviación de costes detectada',
    descripcion: 'Factura de maquinaria supera el 25% del precio de referencia',
    expediente: 'EXP-2024-0032',
    fecha: new Date(Date.now() - 3600000).toISOString(),
    resuelta: false,
    accionRequerida: 'Revisar moderación de costes',
  },
  {
    id: '3',
    tipo: 'riesgo',
    prioridad: 'media',
    titulo: 'Scoring de riesgo elevado',
    descripcion: 'La IA ha detectado patrones de riesgo en 3 justificaciones',
    expediente: 'EXP-2024-0028',
    fecha: new Date(Date.now() - 86400000).toISOString(),
    resuelta: false,
  },
  {
    id: '4',
    tipo: 'documento',
    prioridad: 'media',
    titulo: 'Documento pendiente de validación',
    descripcion: 'Memoria técnica requiere revisión manual',
    expediente: 'EXP-2024-0051',
    fecha: new Date(Date.now() - 172800000).toISOString(),
    resuelta: false,
  },
  {
    id: '5',
    tipo: 'sistema',
    prioridad: 'baja',
    titulo: 'Actualización de catálogo de costes',
    descripcion: 'Nuevos precios de referencia disponibles para Q1 2024',
    fecha: new Date(Date.now() - 259200000).toISOString(),
    resuelta: false,
  },
  {
    id: '6',
    tipo: 'plazo',
    prioridad: 'baja',
    titulo: 'Recordatorio de cierre trimestral',
    descripcion: 'Finaliza el periodo de informe trimestral en 15 días',
    fecha: new Date(Date.now() - 345600000).toISOString(),
    resuelta: true,
  },
];

const tipoConfig = {
  plazo: { icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
  documento: { icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  coste: { icon: Euro, color: 'text-purple-500 bg-purple-500/10' },
  riesgo: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
  sistema: { icon: Bot, color: 'text-cyan-500 bg-cyan-500/10' },
};

interface GaliaAlertsListProps {
  onSelectExpediente?: (expedienteId: string) => void;
}

export function GaliaAlertsList({ onSelectExpediente }: GaliaAlertsListProps) {
  const [activeTab, setActiveTab] = useState('pendientes');
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);

  const alertasFiltradas = alertasMock.filter(a => {
    if (activeTab === 'pendientes' && a.resuelta) return false;
    if (activeTab === 'resueltas' && !a.resuelta) return false;
    if (selectedTipo && a.tipo !== selectedTipo) return false;
    return true;
  });

  const alertasPendientes = alertasMock.filter(a => !a.resuelta).length;
  const alertasAltas = alertasMock.filter(a => !a.resuelta && a.prioridad === 'alta').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alertas
            {alertasPendientes > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alertasPendientes}
              </Badge>
            )}
          </CardTitle>
          {alertasAltas > 0 && (
            <Badge variant="outline" className="border-destructive text-destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {alertasAltas} prioritarias
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-3">
            <TabsList className="h-8">
              <TabsTrigger value="pendientes" className="text-xs">
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="resueltas" className="text-xs">
                Resueltas
              </TabsTrigger>
              <TabsTrigger value="todas" className="text-xs">
                Todas
              </TabsTrigger>
            </TabsList>
            
            {/* Filtro por tipo */}
            <div className="flex gap-1">
              {Object.entries(tipoConfig).map(([tipo, config]) => {
                const Icon = config.icon;
                const isSelected = selectedTipo === tipo;
                return (
                  <Button
                    key={tipo}
                    variant={isSelected ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedTipo(isSelected ? null : tipo)}
                  >
                    <Icon className="h-3 w-3" />
                  </Button>
                );
              })}
            </div>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {alertasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No hay alertas en esta categoría</p>
                </div>
              ) : (
                alertasFiltradas.map((alerta) => {
                  const config = tipoConfig[alerta.tipo];
                  const Icon = config.icon;

                  return (
                    <div
                      key={alerta.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        alerta.resuelta ? "opacity-60" : "hover:bg-muted/50",
                        alerta.prioridad === 'alta' && !alerta.resuelta && "border-destructive/50 bg-destructive/5"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          config.color
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{alerta.titulo}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {alerta.descripcion}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                alerta.prioridad === 'alta' ? 'destructive' :
                                alerta.prioridad === 'media' ? 'secondary' : 'outline'
                              }
                              className="text-xs shrink-0"
                            >
                              {alerta.prioridad}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {alerta.expediente && (
                                <button
                                  onClick={() => onSelectExpediente?.(alerta.expediente!)}
                                  className="font-mono hover:text-primary"
                                >
                                  {alerta.expediente}
                                </button>
                              )}
                              <span>·</span>
                              <span>
                                {formatDistanceToNow(new Date(alerta.fecha), { addSuffix: true, locale: es })}
                              </span>
                            </div>

                            {!alerta.resuelta && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Resolver
                                </Button>
                              </div>
                            )}
                          </div>

                          {alerta.accionRequerida && !alerta.resuelta && (
                            <div className="mt-2 p-2 rounded bg-muted/50 text-xs flex items-center gap-2">
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span className="text-muted-foreground">Acción:</span>
                              <span className="font-medium">{alerta.accionRequerida}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaAlertsList;
