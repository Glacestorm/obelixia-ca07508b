/**
 * GaliaProvinceDetailPanel - Provincial Detail with Localities Drill-Down
 * Shows municipalities/localities with their expedientes when clicking a province
 * NOW CONNECTED TO EDGE FUNCTION for real data
 */

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  MapPin,
  ChevronLeft,
  Search,
  Building2,
  FileText,
  Euro,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Home,
  TreePine,
  Filter,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCompactCurrency } from './spain-paths';
import { toast } from 'sonner';

// Types for localities and expedientes
export interface LocalidadData {
  id: string;
  nombre: string;
  tipo: 'municipio' | 'pedania' | 'pueblo' | 'aldea';
  poblacion: number;
  expedientesCount: number;
  presupuestoTotal: number;
  ejecucion: number;
  latitud?: number;
  longitud?: number;
}

export interface ExpedienteLocalData {
  id: string;
  numero_expediente: string;
  titulo_proyecto: string;
  beneficiario_nombre: string;
  beneficiario_nif: string;
  beneficiario_telefono?: string;
  beneficiario_email?: string;
  importe_solicitado: number;
  importe_concedido: number | null;
  estado: 'instruccion' | 'evaluacion' | 'propuesta' | 'resolucion' | 'concedido' | 'denegado' | 'renunciado' | 'justificacion' | 'cerrado';
  fecha_solicitud: string;
  fecha_resolucion?: string;
  localidad: string;
  sector: string;
}

interface GaliaProvinceDetailPanelProps {
  provinceName: string;
  provinceId: string;
  ccaaName: string;
  onBack: () => void;
  isLoading?: boolean;
  className?: string;
}

// Estado badge component
const EstadoBadge = ({ estado }: { estado: ExpedienteLocalData['estado'] }) => {
  const config: Record<string, { color: string; icon: typeof CheckCircle }> = {
    instruccion: { color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Clock },
    evaluacion: { color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', icon: Clock },
    propuesta: { color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400', icon: FileText },
    resolucion: { color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400', icon: FileText },
    concedido: { color: 'bg-green-500/20 text-green-700 dark:text-green-400', icon: CheckCircle },
    denegado: { color: 'bg-red-500/20 text-red-700 dark:text-red-400', icon: AlertTriangle },
    renunciado: { color: 'bg-gray-500/20 text-gray-700 dark:text-gray-400', icon: AlertTriangle },
    justificacion: { color: 'bg-teal-500/20 text-teal-700 dark:text-teal-400', icon: FileText },
    cerrado: { color: 'bg-slate-500/20 text-slate-700 dark:text-slate-400', icon: CheckCircle }
  };
  
  const { color, icon: Icon } = config[estado] || config.instruccion;
  
  return (
    <Badge className={cn('text-[10px] gap-1', color)}>
      <Icon className="h-3 w-3" />
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </Badge>
  );
};

// Tipo localidad icon
const TipoIcon = ({ tipo }: { tipo: LocalidadData['tipo'] }) => {
  const icons = {
    municipio: Building2,
    pedania: Home,
    pueblo: Users,
    aldea: TreePine
  };
  const Icon = icons[tipo] || Home;
  return <Icon className="h-4 w-4" />;
};

export const GaliaProvinceDetailPanel = memo(function GaliaProvinceDetailPanel({
  provinceName,
  provinceId,
  ccaaName,
  onBack,
  isLoading: externalLoading = false,
  className
}: GaliaProvinceDetailPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState<LocalidadData | null>(null);
  const [selectedExpediente, setSelectedExpediente] = useState<ExpedienteLocalData | null>(null);
  const [filterTipo, setFilterTipo] = useState<LocalidadData['tipo'] | 'all'>('all');
  
  // Data states - fetched from edge function
  const [localidades, setLocalidades] = useState<LocalidadData[]>([]);
  const [expedientes, setExpedientes] = useState<ExpedienteLocalData[]>([]);
  const [isLoadingLocalidades, setIsLoadingLocalidades] = useState(true);
  const [isLoadingExpedientes, setIsLoadingExpedientes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch localidades from edge function
  const fetchLocalidades = useCallback(async () => {
    setIsLoadingLocalidades(true);
    setError(null);
    
    try {
      console.log('[GaliaProvinceDetailPanel] Fetching localidades for province:', provinceId);
      
      const { data, error: fnError } = await supabase.functions.invoke('galia-territorial-map', {
        body: { 
          action: 'get_province_grants', 
          provinceId 
        }
      });
      
      if (fnError) {
        console.error('[GaliaProvinceDetailPanel] Edge function error:', fnError);
        throw fnError;
      }
      
      if (data?.success && Array.isArray(data?.data)) {
        console.log('[GaliaProvinceDetailPanel] Received localidades:', data.data.length);
        setLocalidades(data.data);
      } else {
        console.warn('[GaliaProvinceDetailPanel] Invalid response format:', data);
        setError('Formato de respuesta inválido');
      }
    } catch (err) {
      console.error('[GaliaProvinceDetailPanel] Error fetching localidades:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar localidades');
      toast.error('Error al cargar localidades');
    } finally {
      setIsLoadingLocalidades(false);
    }
  }, [provinceId]);

  // Fetch expedientes for selected localidad
  const fetchExpedientes = useCallback(async (localidadId: string, localidadNombre: string) => {
    setIsLoadingExpedientes(true);
    
    try {
      console.log('[GaliaProvinceDetailPanel] Fetching expedientes for localidad:', localidadId);
      
      const { data, error: fnError } = await supabase.functions.invoke('galia-territorial-map', {
        body: { 
          action: 'get_municipality_detail', 
          municipalityId: localidadId 
        }
      });
      
      if (fnError) throw fnError;
      
      if (data?.success && Array.isArray(data?.data)) {
        console.log('[GaliaProvinceDetailPanel] Received expedientes:', data.data.length);
        // Add localidad name to each expediente
        const expedientesWithLocalidad = data.data.map((exp: ExpedienteLocalData) => ({
          ...exp,
          localidad: localidadNombre
        }));
        setExpedientes(expedientesWithLocalidad);
      }
    } catch (err) {
      console.error('[GaliaProvinceDetailPanel] Error fetching expedientes:', err);
      toast.error('Error al cargar expedientes');
    } finally {
      setIsLoadingExpedientes(false);
    }
  }, []);

  // Fetch localidades on mount
  useEffect(() => {
    fetchLocalidades();
  }, [fetchLocalidades]);

  // Filter localidades
  const filteredLocalidades = useMemo(() => {
    return localidades.filter(loc => {
      const matchesSearch = loc.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = filterTipo === 'all' || loc.tipo === filterTipo;
      return matchesSearch && matchesTipo;
    });
  }, [localidades, searchTerm, filterTipo]);

  // Totals
  const totals = useMemo(() => ({
    localidades: localidades.length,
    expedientes: localidades.reduce((sum, l) => sum + l.expedientesCount, 0),
    presupuesto: localidades.reduce((sum, l) => sum + l.presupuestoTotal, 0),
    poblacion: localidades.reduce((sum, l) => sum + l.poblacion, 0)
  }), [localidades]);

  const handleSelectLocalidad = useCallback((localidad: LocalidadData) => {
    setSelectedLocalidad(localidad);
    fetchExpedientes(localidad.id, localidad.nombre);
  }, [fetchExpedientes]);

  const handleBackFromLocalidad = useCallback(() => {
    setSelectedLocalidad(null);
    setExpedientes([]);
  }, []);

  const isLoading = externalLoading || isLoadingLocalidades;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className={cn("h-full min-h-[400px] flex flex-col", className)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={selectedLocalidad ? handleBackFromLocalidad : onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {selectedLocalidad ? selectedLocalidad.nombre : provinceName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedLocalidad 
                  ? `${provinceName} • ${ccaaName}` 
                  : `${ccaaName} • ${isLoading ? '...' : totals.localidades} localidades`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => selectedLocalidad ? fetchExpedientes(selectedLocalidad.id, selectedLocalidad.nombre) : fetchLocalidades()}
              disabled={isLoading || isLoadingExpedientes}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isLoadingExpedientes) && "animate-spin")} />
            </Button>
            {!selectedLocalidad && !isLoading && (
              <Badge variant="outline" className="text-xs">
                {totals.expedientes} expedientes
              </Badge>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchLocalidades}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <div className="space-y-2 flex-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Content when loaded */}
        {!isLoading && !error && (
          <AnimatePresence mode="wait">
            {!selectedLocalidad ? (
              /* Localities List View */
              <motion.div
                key="localities"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{totals.localidades}</p>
                    <p className="text-[10px] text-muted-foreground">Localidades</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{totals.expedientes}</p>
                    <p className="text-[10px] text-muted-foreground">Expedientes</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{formatCompactCurrency(totals.presupuesto)}</p>
                    <p className="text-[10px] text-muted-foreground">Presupuesto</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{totals.poblacion.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Población</p>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar localidad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value as LocalidadData['tipo'] | 'all')}
                    className="h-9 px-2 text-xs rounded-md border bg-background"
                  >
                    <option value="all">Todos</option>
                    <option value="municipio">Municipios</option>
                    <option value="pedania">Pedanías</option>
                    <option value="pueblo">Pueblos</option>
                    <option value="aldea">Aldeas</option>
                  </select>
                </div>

                {/* Empty State */}
                {filteredLocalidades.length === 0 && (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                      <MapPin className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {localidades.length === 0 
                          ? 'No hay localidades registradas en esta provincia'
                          : 'No se encontraron localidades con los filtros aplicados'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Localities List */}
                {filteredLocalidades.length > 0 && (
                  <ScrollArea className="flex-1 min-h-[200px]">
                    <div className="space-y-2 pr-2 pb-4">
                      {filteredLocalidades.map((loc, idx) => (
                        <motion.div
                          key={loc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => handleSelectLocalidad(loc)}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                <TipoIcon tipo={loc.tipo} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{loc.nombre}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">
                                  {loc.tipo} • {loc.poblacion.toLocaleString()} hab.
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">{loc.expedientesCount}</p>
                              <p className="text-[10px] text-muted-foreground">expedientes</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatCompactCurrency(loc.presupuestoTotal)}
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress value={loc.ejecucion} className="w-16 h-1.5" />
                              <span className={cn(
                                "text-[10px] font-medium",
                                loc.ejecucion >= 75 ? "text-green-600" :
                                loc.ejecucion >= 50 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {loc.ejecucion.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </motion.div>
            ) : (
              /* Expedientes List View for Selected Localidad */
              <motion.div
                key="expedientes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Loading Expedientes */}
                {isLoadingExpedientes ? (
                  <div className="flex-1 flex flex-col gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Localidad Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-primary/5 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-primary">{expedientes.length}</p>
                        <p className="text-[10px] text-muted-foreground">Expedientes</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-600">
                          {expedientes.filter(e => e.estado === 'concedido').length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Concedidos</p>
                      </div>
                      <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-yellow-600">
                          {expedientes.filter(e => ['instruccion', 'evaluacion', 'propuesta'].includes(e.estado)).length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">En trámite</p>
                      </div>
                    </div>

                    {/* Empty Expedientes State */}
                    {expedientes.length === 0 && (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No hay expedientes registrados en esta localidad
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Expedientes List */}
                    {expedientes.length > 0 && (
                      <ScrollArea className="flex-1 min-h-[200px]">
                        <div className="space-y-2 pr-2 pb-4">
                          {expedientes.map((exp, idx) => (
                            <motion.div
                              key={exp.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              onClick={() => setSelectedExpediente(exp)}
                              className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-mono text-xs text-muted-foreground">{exp.numero_expediente}</p>
                                  <p className="font-medium text-sm line-clamp-1">{exp.titulo_proyecto}</p>
                                </div>
                                <EstadoBadge estado={exp.estado} />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{exp.beneficiario_nombre}</span>
                                <span className="font-semibold text-primary">
                                  {formatCompactCurrency(exp.importe_concedido || exp.importe_solicitado)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-[9px]">{exp.sector}</Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(exp.fecha_solicitud).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Expediente Detail Dialog */}
      <Dialog open={!!selectedExpediente} onOpenChange={() => setSelectedExpediente(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedExpediente?.numero_expediente}
            </DialogTitle>
            <DialogDescription>
              Detalle completo del expediente
            </DialogDescription>
          </DialogHeader>

          {selectedExpediente && (
            <div className="space-y-4">
              {/* Estado */}
              <div className="flex items-center justify-between">
                <EstadoBadge estado={selectedExpediente.estado} />
                <span className="text-sm text-muted-foreground">
                  {selectedExpediente.localidad}
                </span>
              </div>

              {/* Proyecto */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">{selectedExpediente.titulo_proyecto}</h4>
                <Badge variant="secondary" className="text-xs">{selectedExpediente.sector}</Badge>
              </div>

              {/* Importes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    Solicitado
                  </p>
                  <p className="font-semibold">{formatCompactCurrency(selectedExpediente.importe_solicitado)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-green-500/5">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Concedido
                  </p>
                  <p className="font-semibold text-green-600">
                    {selectedExpediente.importe_concedido 
                      ? formatCompactCurrency(selectedExpediente.importe_concedido)
                      : 'Pendiente'
                    }
                  </p>
                </div>
              </div>

              {/* Beneficiario */}
              <div className="p-3 rounded-lg border">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Beneficiario
                </h4>
                <div className="space-y-1.5">
                  <p className="text-sm">{selectedExpediente.beneficiario_nombre}</p>
                  <p className="text-xs text-muted-foreground">NIF: {selectedExpediente.beneficiario_nif}</p>
                  {selectedExpediente.beneficiario_telefono && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedExpediente.beneficiario_telefono}
                    </p>
                  )}
                  {selectedExpediente.beneficiario_email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedExpediente.beneficiario_email}
                    </p>
                  )}
                </div>
              </div>

              {/* Fechas */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Solicitud: {new Date(selectedExpediente.fecha_solicitud).toLocaleDateString('es-ES')}
                </span>
                {selectedExpediente.fecha_resolucion && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Resolución: {new Date(selectedExpediente.fecha_resolucion).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver completo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

export default GaliaProvinceDetailPanel;
