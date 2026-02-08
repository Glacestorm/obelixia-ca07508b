/**
 * GaliaProvinceDetailPanel - Provincial Detail with Localities Drill-Down
 * Shows municipalities/localities with their expedientes when clicking a province
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
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
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCompactCurrency } from './spain-paths';

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

// Mock data generator for localities
const generateMockLocalidades = (provinceId: string): LocalidadData[] => {
  const tipos: LocalidadData['tipo'][] = ['municipio', 'pedania', 'pueblo', 'aldea'];
  const nombresBase = [
    'San Miguel', 'Villarroya', 'Peñalba', 'Valdepeñas', 'Aldeanueva',
    'Fuente del Olmo', 'Villanueva', 'Torrecilla', 'Moraleja', 'Hontoria',
    'Ribafrecha', 'Bobadilla', 'Cañada Real', 'El Pinar', 'La Alameda'
  ];

  return nombresBase.map((nombre, idx) => ({
    id: `${provinceId}-loc-${idx}`,
    nombre: `${nombre} de la ${provinceId.split('-')[0]}`,
    tipo: tipos[Math.floor(Math.random() * tipos.length)],
    poblacion: Math.floor(Math.random() * 5000) + 100,
    expedientesCount: Math.floor(Math.random() * 20) + 1,
    presupuestoTotal: (Math.random() * 2 + 0.1) * 1000000,
    ejecucion: Math.random() * 100,
    latitud: 40 + Math.random() * 3,
    longitud: -3 + Math.random() * 4
  }));
};

// Mock data generator for expedientes
const generateMockExpedientes = (localidadId: string, localidadNombre: string): ExpedienteLocalData[] => {
  const estados: ExpedienteLocalData['estado'][] = ['instruccion', 'evaluacion', 'propuesta', 'resolucion', 'concedido', 'justificacion'];
  const sectores = ['Agroalimentario', 'Turismo Rural', 'Artesanía', 'Servicios', 'Comercio Local', 'Energías Renovables'];
  const proyectos = [
    'Modernización de bodega tradicional',
    'Casa rural con encanto',
    'Tienda de productos locales',
    'Taller de cerámica artesanal',
    'Granja ecológica',
    'Restaurante de cocina tradicional',
    'Alojamiento turístico rural',
    'Centro de interpretación natural'
  ];

  const count = Math.floor(Math.random() * 8) + 2;
  return Array.from({ length: count }, (_, idx) => {
    const estado = estados[Math.floor(Math.random() * estados.length)];
    const solicitado = (Math.random() * 100 + 10) * 1000;
    
    return {
      id: `${localidadId}-exp-${idx}`,
      numero_expediente: `GAL-2024-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      titulo_proyecto: proyectos[Math.floor(Math.random() * proyectos.length)],
      beneficiario_nombre: `Empresa ${idx + 1} S.L.`,
      beneficiario_nif: `B${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`,
      beneficiario_telefono: `+34 6${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`,
      beneficiario_email: `empresa${idx + 1}@email.com`,
      importe_solicitado: solicitado,
      importe_concedido: estado === 'concedido' || estado === 'justificacion' ? solicitado * 0.7 : null,
      estado,
      fecha_solicitud: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      fecha_resolucion: estado === 'concedido' ? new Date().toISOString() : undefined,
      localidad: localidadNombre,
      sector: sectores[Math.floor(Math.random() * sectores.length)]
    };
  });
};

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
  isLoading = false,
  className
}: GaliaProvinceDetailPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState<LocalidadData | null>(null);
  const [selectedExpediente, setSelectedExpediente] = useState<ExpedienteLocalData | null>(null);
  const [filterTipo, setFilterTipo] = useState<LocalidadData['tipo'] | 'all'>('all');

  // Generate mock data
  const localidades = useMemo(() => generateMockLocalidades(provinceId), [provinceId]);
  const expedientes = useMemo(() => 
    selectedLocalidad ? generateMockExpedientes(selectedLocalidad.id, selectedLocalidad.nombre) : [],
    [selectedLocalidad]
  );

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
  }, []);

  const handleBackFromLocalidad = useCallback(() => {
    setSelectedLocalidad(null);
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className={cn("h-full flex flex-col", className)}
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
                  : `${ccaaName} • ${totals.localidades} localidades`
                }
              </p>
            </div>
          </div>
          {!selectedLocalidad && (
            <Badge variant="outline" className="text-xs">
              {totals.expedientes} expedientes
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!selectedLocalidad ? (
            /* Localities List View */
            <motion.div
              key="localities"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
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

              {/* Localities List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
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
            </motion.div>
          ) : (
            /* Expedientes List View for Selected Localidad */
            <motion.div
              key="expedientes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
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

              {/* Expedientes List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
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
            </motion.div>
          )}
        </AnimatePresence>
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
