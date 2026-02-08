/**
 * GaliaFederationDashboard - Dashboard Nacional Federado
 * Agregación y análisis multi-GAL a nivel regional/nacional
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe2, 
  TrendingUp, 
  Users, 
  Euro,
  Building2,
  MapPin,
  BarChart3,
  RefreshCw,
  Loader2,
  Award,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useGaliaFederation } from '@/hooks/galia/useGaliaFederation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaFederationDashboardProps {
  className?: string;
}

export function GaliaFederationDashboard({ className }: GaliaFederationDashboardProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  const {
    isLoading,
    kpis,
    nationalDashboard,
    aggregateKPIs,
    getNationalDashboard,
    compareGALs,
    getAvailableRegions
  } = useGaliaFederation();

  const regions = getAvailableRegions();

  useEffect(() => {
    loadData();
  }, [selectedRegion]);

  const loadData = async () => {
    const region = selectedRegion === 'all' ? undefined : selectedRegion;
    await Promise.all([
      aggregateKPIs(region),
      getNationalDashboard()
    ]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
            <Globe2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Portal Nacional Federado</h1>
            <p className="text-muted-foreground">
              Supervisión multi-GAL a nivel regional y nacional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-48">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todas las regiones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon"
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">GALs Incluidos</p>
                  <p className="text-3xl font-bold">{kpis.gals_incluidos}</p>
                </div>
                <Building2 className="h-10 w-10 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expedientes</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(kpis.kpis_nacionales.total_expedientes)}
                  </p>
                </div>
                <Users className="h-10 w-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Importe Concedido</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(kpis.kpis_nacionales.total_importe_concedido)}
                  </p>
                </div>
                <Euro className="h-10 w-10 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasa Ejecución</p>
                  <p className="text-3xl font-bold">
                    {kpis.kpis_nacionales.tasa_ejecucion.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500/50" />
              </div>
              <Progress 
                value={kpis.kpis_nacionales.tasa_ejecucion} 
                className="h-2 mt-3"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="ranking">Ranking GALs</TabsTrigger>
          <TabsTrigger value="regions">Por Región</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Estado por expediente */}
            {kpis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estado de Expedientes</CardTitle>
                  <CardDescription>Distribución a nivel nacional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(kpis.kpis_nacionales.expedientes_por_estado).map(([estado, count]) => {
                      const total = kpis.kpis_nacionales.total_expedientes;
                      const percent = total > 0 ? (count / total) * 100 : 0;
                      
                      const colors: Record<string, string> = {
                        aprobado: 'bg-green-500',
                        en_tramite: 'bg-blue-500',
                        pendiente: 'bg-amber-500',
                        denegado: 'bg-red-500',
                        justificacion: 'bg-purple-500'
                      };

                      return (
                        <div key={estado}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{estado.replace('_', ' ')}</span>
                            <span className="font-medium">{formatNumber(count)}</span>
                          </div>
                          <Progress 
                            value={percent} 
                            className={cn("h-2", colors[estado] && `[&>div]:${colors[estado]}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Convocatorias activas */}
            {kpis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Convocatorias Activas</CardTitle>
                  <CardDescription>Abiertas a nivel nacional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-primary">
                        {kpis.kpis_nacionales.convocatorias_activas}
                      </p>
                      <p className="text-muted-foreground mt-2">
                        convocatorias abiertas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Ranking de GALs por Importe Concedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {kpis?.ranking.map((gal, index) => (
                    <div 
                      key={gal.gal_id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border",
                        index === 0 && "bg-amber-500/10 border-amber-500/30",
                        index === 1 && "bg-gray-500/10 border-gray-500/30",
                        index === 2 && "bg-orange-500/10 border-orange-500/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                        index === 0 && "bg-amber-500 text-white",
                        index === 1 && "bg-gray-400 text-white",
                        index === 2 && "bg-orange-400 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{gal.gal_nombre}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(gal.importe_concedido)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos por Región</CardTitle>
              <CardDescription>
                Agregación de métricas por comunidad autónoma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nationalDashboard?.datos_por_region ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {nationalDashboard.datos_por_region.map((region) => (
                      <div 
                        key={region.region}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{region.region}</h4>
                          <Badge variant="outline">
                            {region.num_gals} GALs
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Expedientes</span>
                            <p className="font-medium">{formatNumber(region.total_expedientes)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Importe</span>
                            <p className="font-medium">{formatCurrency(region.importe_total)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ejecución</span>
                            <p className="font-medium">{region.tasa_ejecucion.toFixed(1)}%</p>
                          </div>
                        </div>
                        <Progress value={region.tasa_ejecucion} className="h-1.5 mt-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>No hay datos regionales disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Métricas por GAL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3">
                    {kpis?.metricas_por_gal.map((gal) => (
                      <div 
                        key={gal.gal_id}
                        className="p-3 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{gal.gal_nombre}</p>
                            <p className="text-xs text-muted-foreground">{gal.region}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {gal.tasa_concesion >= 70 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                            <span className={cn(
                              "font-bold",
                              gal.tasa_concesion >= 70 ? "text-green-600" : "text-red-600"
                            )}>
                              {gal.tasa_concesion.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Expedientes:</span>
                            <span className="ml-1 font-medium">{gal.total_expedientes}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Concedido:</span>
                            <span className="ml-1 font-medium">
                              {formatCurrency(gal.importe_concedido)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen Nacional</CardTitle>
                <CardDescription>
                  {nationalDashboard?.fecha_actualizacion && (
                    <>Actualizado {formatDistanceToNow(new Date(nationalDashboard.fecha_actualizacion), { 
                      locale: es, 
                      addSuffix: true 
                    })}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nationalDashboard?.resumen && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Total GALs</p>
                      <p className="text-2xl font-bold">{nationalDashboard.resumen.total_gals}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Regiones</p>
                      <p className="text-2xl font-bold">{nationalDashboard.resumen.total_regiones}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Expedientes</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(nationalDashboard.resumen.total_expedientes)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Ejecutado</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(nationalDashboard.resumen.presupuesto_total_ejecutado)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaFederationDashboard;
