/**
 * GALIA - Portal Público del Ciudadano
 * Interfaz para ciudadanos, empresas y entidades
 * Integrado con Supabase para datos reales
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  FileText, 
  Calendar, 
  MapPin, 
  Euro, 
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Download,
  ExternalLink,
  Building2,
  Leaf,
  Users,
  Sparkles,
  RefreshCw,
  Loader2,
  Bell,
  BellRing
} from 'lucide-react';
import { GaliaAsistenteVirtualMejorado } from './GaliaAsistenteVirtualMejorado';
import { GaliaNotificacionesPanel } from './GaliaNotificacionesPanel';
import { useGaliaConvocatorias } from '@/hooks/galia/useGaliaConvocatorias';
import { useGaliaNotificaciones } from '@/hooks/galia/useGaliaNotificaciones';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpedientePublico {
  codigo: string;
  titulo: string;
  estado: string;
  fechaUltimaActualizacion: string;
  progreso: number;
  proximoPaso?: string;
  importeSolicitado?: number;
  importeConcedido?: number | null;
}

// Mapeo de estados a porcentaje de progreso
const estadoProgreso: Record<string, number> = {
  'borrador': 5,
  'presentada': 15,
  'admitida': 25,
  'subsanacion': 20,
  'instruccion': 40,
  'evaluacion': 55,
  'propuesta': 70,
  'resolucion': 85,
  'concedido': 95,
  'justificacion': 90,
  'cerrado': 100,
  'denegado': 100,
  'renunciado': 100,
  'desistido': 100,
};

// Mapeo de estados a próximo paso
const estadoProximoPaso: Record<string, string> = {
  'borrador': 'Completar y presentar la solicitud',
  'presentada': 'Pendiente de admisión a trámite',
  'admitida': 'En proceso de instrucción técnica',
  'subsanacion': 'Aportar documentación requerida',
  'instruccion': 'Análisis de elegibilidad en curso',
  'evaluacion': 'Valoración técnica y puntuación',
  'propuesta': 'Pendiente de resolución definitiva',
  'resolucion': 'Notificación de resolución',
  'concedido': 'Iniciar ejecución del proyecto',
  'justificacion': 'Presentar justificación de gastos',
  'cerrado': 'Expediente finalizado',
  'denegado': 'Posibilidad de recurso (20 días)',
  'renunciado': 'Sin acciones pendientes',
  'desistido': 'Sin acciones pendientes',
};

export function GaliaPortalCiudadano() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('convocatorias');
  const [showAsistente, setShowAsistente] = useState(false);
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [codigoExpediente, setCodigoExpediente] = useState('');
  const [expedienteConsultado, setExpedienteConsultado] = useState<ExpedientePublico | null>(null);
  const [isConsultando, setIsConsultando] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);

  // Hook real para convocatorias
  const { 
    convocatorias, 
    isLoading: isLoadingConvocatorias, 
    fetchConvocatorias,
    getPresupuestoStats 
  } = useGaliaConvocatorias({
    estado: 'abierta',
    searchTerm: searchTerm || undefined
  });

  // Hook para notificaciones del expediente consultado
  const { unreadCount } = useGaliaNotificaciones({
    codigoExpediente: expedienteConsultado?.codigo,
    autoSubscribe: !!expedienteConsultado
  });

  // Estadísticas del presupuesto
  const presupuestoStats = getPresupuestoStats();

  // Filtrar convocatorias por búsqueda local (además del filtro del hook)
  const filteredConvocatorias = convocatorias.filter(c => 
    !searchTerm || 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Consultar expediente real en Supabase
  const handleConsultarExpediente = useCallback(async () => {
    const codigo = codigoExpediente.trim().toUpperCase();
    if (!codigo) {
      toast.error('Introduce un código de expediente válido');
      return;
    }

    setIsConsultando(true);
    setConsultaError(null);
    setExpedienteConsultado(null);

    try {
      // Buscar en galia_expedientes por numero_expediente
      const { data: expediente, error: expError } = await supabase
        .from('galia_expedientes')
        .select(`
          *,
          solicitud:galia_solicitudes(
            titulo_proyecto,
            presupuesto_total,
            importe_solicitado
          )
        `)
        .eq('numero_expediente', codigo)
        .maybeSingle();

      if (expError) throw expError;

      if (expediente) {
        const solicitud = expediente.solicitud as { titulo_proyecto?: string; importe_solicitado?: number } | null;
        setExpedienteConsultado({
          codigo: expediente.numero_expediente,
          titulo: solicitud?.titulo_proyecto || 'Proyecto sin título',
          estado: expediente.estado,
          fechaUltimaActualizacion: expediente.updated_at,
          progreso: estadoProgreso[expediente.estado] || 0,
          proximoPaso: estadoProximoPaso[expediente.estado],
          importeSolicitado: solicitud?.importe_solicitado,
          importeConcedido: expediente.importe_concedido,
        });
        return;
      }

      // Si no encontró expediente, buscar en solicitudes
      const { data: solicitud, error: solError } = await supabase
        .from('galia_solicitudes')
        .select('*')
        .eq('numero_registro', codigo)
        .maybeSingle();

      if (solError) throw solError;

      if (solicitud) {
        setExpedienteConsultado({
          codigo: solicitud.numero_registro || codigo,
          titulo: solicitud.titulo_proyecto,
          estado: solicitud.estado,
          fechaUltimaActualizacion: solicitud.updated_at,
          progreso: estadoProgreso[solicitud.estado] || 0,
          proximoPaso: estadoProximoPaso[solicitud.estado],
          importeSolicitado: solicitud.importe_solicitado,
        });
        return;
      }

      // No encontrado
      setConsultaError('No se encontró ningún expediente o solicitud con ese código. Verifica que esté escrito correctamente.');

    } catch (err) {
      console.error('[GaliaPortalCiudadano] Error consultando expediente:', err);
      setConsultaError('Error al consultar el expediente. Inténtalo de nuevo.');
    } finally {
      setIsConsultando(false);
    }
  }, [codigoExpediente]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'abierta':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Abierta</Badge>;
      case 'publicada':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Próximamente</Badge>;
      case 'cerrada':
      case 'resuelta':
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30">Cerrada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getEstadoExpedienteBadge = (estado: string) => {
    const colores: Record<string, string> = {
      'borrador': 'bg-gray-500/20 text-gray-600',
      'presentada': 'bg-blue-500/20 text-blue-700',
      'admitida': 'bg-cyan-500/20 text-cyan-700',
      'subsanacion': 'bg-orange-500/20 text-orange-700',
      'instruccion': 'bg-indigo-500/20 text-indigo-700',
      'evaluacion': 'bg-purple-500/20 text-purple-700',
      'propuesta': 'bg-violet-500/20 text-violet-700',
      'resolucion': 'bg-pink-500/20 text-pink-700',
      'concedido': 'bg-green-500/20 text-green-700',
      'justificacion': 'bg-emerald-500/20 text-emerald-700',
      'cerrado': 'bg-slate-500/20 text-slate-700',
      'denegado': 'bg-red-500/20 text-red-700',
      'renunciado': 'bg-amber-500/20 text-amber-700',
    };
    return <Badge className={colores[estado] || 'bg-gray-500/20 text-gray-600'}>{estado}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-emerald-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Leaf className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Portal LEADER</h1>
              <p className="text-green-100">Ayudas al desarrollo rural - Programa FEADER</p>
            </div>
          </div>
          
          {/* Quick Stats - Datos reales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{convocatorias.length}</div>
              <div className="text-sm text-green-100">Convocatorias activas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">
                {presupuestoStats.disponible > 0 
                  ? `€${(presupuestoStats.disponible / 1000000).toFixed(1)}M`
                  : '€0'
                }
              </div>
              <div className="text-sm text-green-100">Presupuesto disponible</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">
                {((presupuestoStats.ejecutado / (presupuestoStats.total || 1)) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-green-100">Ejecución presupuestaria</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">
                {formatCurrency(presupuestoStats.comprometido)}
              </div>
              <div className="text-sm text-green-100">Comprometido</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="convocatorias" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Convocatorias</span>
            </TabsTrigger>
            <TabsTrigger value="consulta" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Mi Expediente</span>
            </TabsTrigger>
            <TabsTrigger value="documentacion" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Documentación</span>
            </TabsTrigger>
            <TabsTrigger value="ayuda" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ayuda</span>
            </TabsTrigger>
          </TabsList>

          {/* Convocatorias Tab - Datos reales */}
          <TabsContent value="convocatorias" className="space-y-6">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, código o tipo de proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => fetchConvocatorias()}
                disabled={isLoadingConvocatorias}
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingConvocatorias && "animate-spin")} />
                Actualizar
              </Button>
            </div>

            {/* Loading State */}
            {isLoadingConvocatorias && (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Convocatorias List - Datos reales */}
            {!isLoadingConvocatorias && (
              <div className="grid gap-4">
                {filteredConvocatorias.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No hay convocatorias disponibles con esos criterios</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredConvocatorias.map((conv) => (
                    <Card key={conv.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-lg font-semibold">{conv.nombre}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Building2 className="h-4 w-4" />
                                  Código: {conv.codigo}
                                </div>
                              </div>
                              {getEstadoBadge(conv.estado)}
                            </div>

                            {conv.descripcion && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {conv.descripcion}
                              </p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Hasta {format(new Date(conv.fecha_fin), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Euro className="h-4 w-4 text-muted-foreground" />
                                <span>{formatCurrency(conv.presupuesto_total - conv.presupuesto_comprometido)} disponibles</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>{conv.porcentaje_ayuda_max}% intensidad máx.</span>
                              </div>
                              <div>
                                <Button size="sm" className="gap-2">
                                  Ver detalles
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Barra de ejecución presupuestaria */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Ejecución presupuestaria</span>
                                <span>{((conv.presupuesto_comprometido / conv.presupuesto_total) * 100).toFixed(0)}%</span>
                              </div>
                              <Progress 
                                value={(conv.presupuesto_comprometido / conv.presupuesto_total) * 100} 
                                className="h-1.5" 
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Consulta Expediente Tab - Consulta real */}
          <TabsContent value="consulta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Consultar estado de expediente
                </CardTitle>
                <CardDescription>
                  Introduce el código de tu expediente o número de registro para conocer su estado actual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Ej: EXP-2024-00123 o REG-2024-00456"
                    value={codigoExpediente}
                    onChange={(e) => setCodigoExpediente(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConsultarExpediente()}
                    className="max-w-sm"
                  />
                  <Button 
                    onClick={handleConsultarExpediente}
                    disabled={isConsultando}
                  >
                    {isConsultando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Consultar'
                    )}
                  </Button>
                </div>

                {/* Error de consulta */}
                {consultaError && (
                  <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {consultaError}
                  </div>
                )}

                {/* Resultado de expediente */}
                {expedienteConsultado && (
                  <Card className="bg-muted/50 mt-6">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Expediente</div>
                          <div className="text-xl font-bold">{expedienteConsultado.codigo}</div>
                          <div className="text-sm mt-1">{expedienteConsultado.titulo}</div>
                        </div>
                        {getEstadoExpedienteBadge(expedienteConsultado.estado)}
                      </div>

                      {/* Importes */}
                      {(expedienteConsultado.importeSolicitado || expedienteConsultado.importeConcedido) && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-background rounded-lg">
                          <div>
                            <div className="text-xs text-muted-foreground">Importe solicitado</div>
                            <div className="font-semibold">
                              {expedienteConsultado.importeSolicitado 
                                ? formatCurrency(expedienteConsultado.importeSolicitado)
                                : '-'
                              }
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Importe concedido</div>
                            <div className="font-semibold text-green-600">
                              {expedienteConsultado.importeConcedido 
                                ? formatCurrency(expedienteConsultado.importeConcedido)
                                : 'Pendiente'
                              }
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progreso de tramitación</span>
                          <span className="font-medium">{expedienteConsultado.progreso}%</span>
                        </div>
                        <Progress value={expedienteConsultado.progreso} className="h-2" />
                      </div>

                      {expedienteConsultado.proximoPaso && (
                        <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
                          <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                          <span><strong>Próximo paso:</strong> {expedienteConsultado.proximoPaso}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Última actualización: {formatDistanceToNow(new Date(expedienteConsultado.fechaUltimaActualizacion), { addSuffix: true, locale: es })}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 gap-2"
                          onClick={() => setShowAsistente(true)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Consultar dudas
                        </Button>
                        <Button 
                          variant="outline"
                          className="gap-2 relative"
                          onClick={() => setShowNotificaciones(true)}
                        >
                          {unreadCount > 0 ? (
                            <BellRing className="h-4 w-4 text-primary" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                          Alertas
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 px-1">
                              {unreadCount}
                            </Badge>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentación Tab - Mejorada con categorías */}
          <TabsContent value="documentacion" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6 text-center">
                  <div className="p-4 bg-primary/20 rounded-xl w-fit mx-auto mb-3">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Formularios</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Documentos oficiales para tramitación
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                <CardContent className="p-6 text-center">
                  <div className="p-4 bg-green-500/20 rounded-xl w-fit mx-auto mb-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Guías</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manuales paso a paso
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
                <CardContent className="p-6 text-center">
                  <div className="p-4 bg-amber-500/20 rounded-xl w-fit mx-auto mb-3">
                    <Euro className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Justificación</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plantillas de gastos
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Guía del solicitante</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pasos para solicitar ayudas LEADER - Actualizado 2024
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">PDF</Badge>
                      <Badge variant="secondary" className="text-xs">2.4 MB</Badge>
                    </div>
                    <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Checklist de documentación</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Documentos necesarios según tipo de proyecto
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">Interactivo</Badge>
                    </div>
                    <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Ver checklist
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                    <Euro className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Guía de justificación económica</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cómo justificar los gastos de tu proyecto según normativa FEADER
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">PDF</Badge>
                      <Badge variant="secondary" className="text-xs">1.8 MB</Badge>
                    </div>
                    <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Directorio de GALs de Asturias</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Encuentra tu Grupo de Acción Local por municipio
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">Mapa</Badge>
                      <Badge className="text-xs bg-green-500/20 text-green-700">11 GALs</Badge>
                    </div>
                    <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                      <MapPin className="h-3 w-3" />
                      Ver directorio
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Modelo de memoria técnica</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Plantilla para describir tu proyecto y objetivos
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">DOCX</Badge>
                      <Badge variant="secondary" className="text-xs">156 KB</Badge>
                    </div>
                    <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                    <Sparkles className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Modelo de presupuesto</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Excel con desglose por partidas y cálculo automático de ayuda
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">XLSX</Badge>
                      <Badge variant="secondary" className="text-xs">89 KB</Badge>
                    </div>
                    <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ayuda Tab */}
          <TabsContent value="ayuda" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Preguntas frecuentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {[
                        { q: '¿Quién puede solicitar ayudas LEADER?', a: 'PYMEs, autónomos, ayuntamientos y asociaciones ubicados en zonas rurales definidas en la estrategia de cada GAL.' },
                        { q: '¿Qué porcentaje de ayuda puedo recibir?', a: 'La intensidad varía entre el 40% y 60% del coste elegible, dependiendo del tipo de proyecto y beneficiario.' },
                        { q: '¿Cuál es la inversión mínima?', a: 'Generalmente entre 10.000€ y 15.000€, aunque puede variar según la convocatoria específica.' },
                        { q: '¿Cuánto tarda la tramitación?', a: 'El proceso completo suele durar entre 6 y 12 meses desde la solicitud hasta la resolución.' },
                        { q: '¿Puedo empezar el proyecto antes de la resolución?', a: 'No se recomienda. Los gastos anteriores a la resolución de concesión no son elegibles.' },
                        { q: '¿Qué pasa si me deniegan la ayuda?', a: 'Puedes presentar un recurso de reposición en el plazo de 20 días hábiles desde la notificación.' },
                        { q: '¿Cómo justifico los gastos?', a: 'Mediante facturas, justificantes de pago bancario y documentación acreditativa de la inversión realizada.' },
                      ].map((faq, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="font-medium flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            {faq.q}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 ml-6">
                            {faq.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/20 rounded-lg">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Asistente Virtual GALIA</h3>
                        <p className="text-sm text-muted-foreground">
                          IA especializada en ayudas LEADER
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-4">
                      Resuelve tus dudas sobre convocatorias, documentación, requisitos y más con nuestro asistente inteligente.
                    </p>
                    <Button 
                      onClick={() => setShowAsistente(true)}
                      className="w-full gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Iniciar conversación
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Contacto directo</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Para consultas específicas, contacta con tu GAL</span>
                      </div>
                      <Button variant="outline" className="w-full gap-2">
                        <MapPin className="h-4 w-4" />
                        Buscar mi GAL
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Assistant - Versión Mejorada */}
      {showAsistente && (
        <div className="fixed bottom-4 right-4 w-full max-w-lg z-50 animate-in slide-in-from-bottom-4 duration-300">
          <GaliaAsistenteVirtualMejorado 
            modo="ciudadano"
            expedienteId={expedienteConsultado?.codigo}
            onClose={() => setShowAsistente(false)}
          />
        </div>
      )}

      {/* Panel de Notificaciones Flotante */}
      {showNotificaciones && expedienteConsultado && (
        <div className="fixed bottom-4 left-4 w-full max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
          <GaliaNotificacionesPanel
            codigoExpediente={expedienteConsultado.codigo}
            autoSubscribe={true}
            onClose={() => setShowNotificaciones(false)}
          />
        </div>
      )}
    </div>
  );
}

export default GaliaPortalCiudadano;
