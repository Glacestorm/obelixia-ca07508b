/**
 * GaliaPublicDashboard - Portal de Transparencia y Estadísticas Públicas
 * Dashboard conforme a Ley 19/2013 de Transparencia
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Users,
  Euro,
  FileText,
  Search,
  ExternalLink,
  Info,
  MapPin,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Globe,
  Scale,
  Briefcase,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Convocatoria {
  id: string;
  codigo_bdns: string;
  nombre: string;
  programa: string;
  fondo_europeo: string;
  estado: string;
  presupuesto_total: number;
  intensidad_maxima: number;
  fecha_inicio: string;
  fecha_fin: string;
  beneficiarios_elegibles: string[];
  sectores: string[];
  territorio: string;
  enlace_bases: string;
}

interface Estadisticas {
  resumen_ejecucion: {
    presupuesto_total: number;
    presupuesto_ejecutado: number;
    porcentaje_ejecucion: number;
    expedientes_aprobados: number;
    expedientes_en_tramite: number;
    empleo_generado: number;
    inversion_privada_movilizada: number;
  };
  distribucion_sectorial: Array<{ sector: string; porcentaje: number; importe: number }>;
}

interface KPIs {
  kpis_ejecucion: Record<string, { valor: number; unidad: string; descripcion: string; tendencia: string }>;
  kpis_impacto: Record<string, { valor: number; objetivo: number; porcentaje_objetivo: number }>;
  comparativa_historica: Array<{ año: number; expedientes: number; importe: number }>;
}

export function GaliaPublicDashboard() {
  const [activeTab, setActiveTab] = useState('estadisticas');
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [codigoExpediente, setCodigoExpediente] = useState('');
  const [resultadoVerificacion, setResultadoVerificacion] = useState<Record<string, unknown> | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('abierta');
  const [filtroPrograma, setFiltroPrograma] = useState('todos');

  // Fetch all public data
  const fetchPublicData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch convocatorias
      const { data: convData } = await supabase.functions.invoke('galia-public-api', {
        body: { 
          endpoint: 'convocatorias', 
          params: { estado: filtroEstado, programa: filtroPrograma !== 'todos' ? filtroPrograma : undefined } 
        }
      });
      if (convData?.success) {
        setConvocatorias(convData.data.convocatorias);
      }

      // Fetch estadisticas
      const { data: statsData } = await supabase.functions.invoke('galia-public-api', {
        body: { endpoint: 'estadisticas', params: { periodo: '2024' } }
      });
      if (statsData?.success) {
        setEstadisticas(statsData.data);
      }

      // Fetch KPIs
      const { data: kpisData } = await supabase.functions.invoke('galia-public-api', {
        body: { endpoint: 'kpis_publicos', params: { año: '2024' } }
      });
      if (kpisData?.success) {
        setKpis(kpisData.data);
      }
    } catch (error) {
      console.error('Error fetching public data:', error);
      toast.error('Error al cargar datos públicos');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroPrograma]);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  // Verify expediente
  const handleVerificarExpediente = async () => {
    if (!codigoExpediente.trim()) {
      toast.error('Introduce un código de expediente');
      return;
    }

    try {
      const { data } = await supabase.functions.invoke('galia-public-api', {
        body: { endpoint: 'verificar_expediente', params: { codigo: codigoExpediente } }
      });
      
      if (data?.success) {
        setResultadoVerificacion(data.data);
        if (data.data.encontrado) {
          toast.success('Expediente encontrado');
        } else {
          toast.warning('No se encontró el expediente');
        }
      }
    } catch (error) {
      console.error('Error verifying expediente:', error);
      toast.error('Error al verificar expediente');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      abierta: 'bg-green-500/10 text-green-600 border-green-500/20',
      cerrada: 'bg-red-500/10 text-red-600 border-red-500/20',
      proxima: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    };
    return colors[estado] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Portal de Transparencia LEADER
          </h1>
          <p className="text-muted-foreground">
            Información pública conforme a Ley 19/2013 de Transparencia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPublicData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar datos
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Euro className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(estadisticas.resumen_ejecucion.presupuesto_ejecutado)}
                  </p>
                  <p className="text-xs text-muted-foreground">Ejecutado</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{estadisticas.resumen_ejecucion.expedientes_aprobados}</p>
                  <p className="text-xs text-muted-foreground">Aprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{estadisticas.resumen_ejecucion.empleo_generado}</p>
                  <p className="text-xs text-muted-foreground">Empleos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{estadisticas.resumen_ejecucion.porcentaje_ejecucion}%</p>
                  <p className="text-xs text-muted-foreground">Ejecución</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="estadisticas" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="convocatorias" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
            Convocatorias
          </TabsTrigger>
          <TabsTrigger value="consulta" className="text-xs sm:text-sm">
            <Search className="h-4 w-4 mr-1 hidden sm:inline" />
            Consultar
          </TabsTrigger>
          <TabsTrigger value="transparencia" className="text-xs sm:text-sm">
            <Scale className="h-4 w-4 mr-1 hidden sm:inline" />
            Transparencia
          </TabsTrigger>
        </TabsList>

        {/* Estadísticas Tab */}
        <TabsContent value="estadisticas" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* KPIs de Impacto */}
            {kpis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Indicadores de Impacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(kpis.kpis_impacto).map(([key, data]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">
                          {typeof data.valor === 'number' && data.valor > 10000 
                            ? formatCurrency(data.valor) 
                            : data.valor} / {typeof data.objetivo === 'number' && data.objetivo > 10000 
                            ? formatCurrency(data.objetivo) 
                            : data.objetivo}
                        </span>
                      </div>
                      <Progress value={data.porcentaje_objetivo} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Distribución Sectorial */}
            {estadisticas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Distribución por Sectores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {estadisticas.distribucion_sectorial.map((sector) => (
                        <div key={sector.sector} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{sector.sector}</span>
                            <span className="font-medium">{sector.porcentaje}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={sector.porcentaje} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-20 text-right">
                              {formatCurrency(sector.importe)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Evolución Histórica */}
          {kpis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolución Histórica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {kpis.comparativa_historica.map((año) => (
                    <div key={año.año} className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{año.año}</p>
                      <p className="text-2xl font-bold text-primary">{año.expedientes}</p>
                      <p className="text-xs text-muted-foreground">expedientes</p>
                      <p className="text-sm font-medium mt-1">{formatCurrency(año.importe)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Convocatorias Tab */}
        <TabsContent value="convocatorias" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="abierta">Abiertas</SelectItem>
                <SelectItem value="cerrada">Cerradas</SelectItem>
                <SelectItem value="proxima">Próximas</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filtroPrograma} onValueChange={setFiltroPrograma}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="LEADER">LEADER</SelectItem>
                <SelectItem value="FEDER">FEDER</SelectItem>
                <SelectItem value="PRTR">PRTR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Convocatorias List */}
          <div className="space-y-3">
            {convocatorias.map((conv) => (
              <Card key={conv.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getEstadoBadge(conv.estado)}>
                          {conv.estado === 'abierta' ? 'Abierta' : conv.estado === 'cerrada' ? 'Cerrada' : 'Próxima'}
                        </Badge>
                        <Badge variant="secondary">{conv.programa}</Badge>
                        <Badge variant="outline">{conv.fondo_europeo}</Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{conv.nombre}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        BDNS: {conv.codigo_bdns}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(conv.presupuesto_total)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(conv.fecha_fin).toLocaleDateString('es-ES')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {conv.territorio}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{conv.intensidad_maxima}%</p>
                        <p className="text-xs text-muted-foreground">Intensidad máx.</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={conv.enlace_bases} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver bases
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Consulta Tab */}
        <TabsContent value="consulta" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Verificar Estado de Expediente
              </CardTitle>
              <CardDescription>
                Introduce el código de tu expediente para consultar su estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: GAL-2024-0001"
                  value={codigoExpediente}
                  onChange={(e) => setCodigoExpediente(e.target.value.toUpperCase())}
                  className="max-w-xs"
                />
                <Button onClick={handleVerificarExpediente}>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>

              {resultadoVerificacion && (
                <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                  {resultadoVerificacion.encontrado ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Expediente encontrado</span>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Código:</span>
                          <span className="font-medium">{resultadoVerificacion.codigo_expediente as string}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estado:</span>
                          <Badge variant="outline">{resultadoVerificacion.estado_descripcion as string}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Convocatoria:</span>
                          <span>{resultadoVerificacion.convocatoria as string}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Última actualización:</span>
                          <span>{resultadoVerificacion.ultima_actualizacion as string}</span>
                        </div>
                        {resultadoVerificacion.importe_concedido && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Importe concedido:</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(resultadoVerificacion.importe_concedido as number)}
                            </span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div>
                          <span className="text-muted-foreground">Próximos pasos:</span>
                          <p className="mt-1">{resultadoVerificacion.proximos_pasos as string}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Info className="h-5 w-5" />
                      <span>{resultadoVerificacion.mensaje as string}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transparencia Tab */}
        <TabsContent value="transparencia" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Portal de Transparencia
              </CardTitle>
              <CardDescription>
                Información pública conforme a la Ley 19/2013, de 9 de diciembre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Normativa */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Normativa Aplicable
                </h4>
                <div className="space-y-2">
                  {[
                    { norma: 'Ley 19/2013', titulo: 'Ley de transparencia, acceso a la información pública' },
                    { norma: 'Ley 38/2003', titulo: 'Ley General de Subvenciones' },
                    { norma: 'Ley 39/2015', titulo: 'Procedimiento Administrativo Común' },
                    { norma: 'Reglamento (UE) 2021/1060', titulo: 'Disposiciones comunes fondos europeos' }
                  ].map((ley) => (
                    <div key={ley.norma} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Badge variant="outline">{ley.norma}</Badge>
                      <span className="text-sm">{ley.titulo}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Criterios de Evaluación */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Criterios de Evaluación de Proyectos
                </h4>
                <div className="space-y-2">
                  {[
                    { criterio: 'Viabilidad técnica', ponderacion: 25 },
                    { criterio: 'Impacto en el empleo', ponderacion: 20 },
                    { criterio: 'Innovación y diferenciación', ponderacion: 20 },
                    { criterio: 'Sostenibilidad ambiental', ponderacion: 15 },
                    { criterio: 'Arraigo territorial', ponderacion: 10 },
                    { criterio: 'Viabilidad económica', ponderacion: 10 }
                  ].map((item) => (
                    <div key={item.criterio} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.criterio}</span>
                        <span className="font-medium">{item.ponderacion}%</span>
                      </div>
                      <Progress value={item.ponderacion} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Contacto */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Órgano Responsable
                </h4>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium">Grupo de Acción Local</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Email: transparencia@gal.es<br />
                    Teléfono: 985 000 000<br />
                    Horario: L-V 9:00-14:00
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaPublicDashboard;
