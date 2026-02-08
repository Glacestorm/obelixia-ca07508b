/**
 * GaliaNationalFederationDashboard - Portal Nacional Multi-GAL
 * Fase 10 del Plan Estratégico GALIA 2.0
 * 
 * Agregación nacional, benchmarking y predicciones
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe2, 
  BarChart3, 
  TrendingUp, 
  Building2,
  Users,
  Euro,
  RefreshCw,
  MapPin,
  Award,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Shield,
  Link2
} from 'lucide-react';
import { useGaliaNationalFederation } from '@/hooks/galia/useGaliaNationalFederation';
import { cn } from '@/lib/utils';

export function GaliaNationalFederationDashboard() {
  const [activeTab, setActiveTab] = useState('nacional');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const {
    isLoading,
    error,
    nationalKPIs,
    getNationalKPIs,
    getRegionalAnalysis,
    benchmarkGALs,
    predictTrends,
    checkEUInteroperability,
    getAvailableRegions
  } = useGaliaNationalFederation();

  useEffect(() => {
    getNationalKPIs();
  }, []);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary via-blue-500 to-purple-500">
            <Globe2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Portal Nacional GALIA
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Fase 10
              </Badge>
            </h2>
            <p className="text-muted-foreground">
              Federación Multi-GAL e Interoperabilidad UE
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => getNationalKPIs()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* KPIs Nacionales */}
      {nationalKPIs && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {nationalKPIs.resumen_nacional.total_gals_activos}
                  </div>
                  <div className="text-sm text-muted-foreground">GALs Activos</div>
                </div>
                <Building2 className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {formatNumber(nationalKPIs.resumen_nacional.total_expedientes_2024)}
                  </div>
                  <div className="text-sm text-muted-foreground">Expedientes 2024</div>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {formatCurrency(nationalKPIs.resumen_nacional.importe_total_concedido)}
                  </div>
                  <div className="text-sm text-muted-foreground">Concedido</div>
                </div>
                <Euro className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-500">
                    {nationalKPIs.resumen_nacional.tasa_ejecucion_media.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Ejecución Media</div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-500">
                    {formatNumber(nationalKPIs.resumen_nacional.empleos_creados + nationalKPIs.resumen_nacional.empleos_mantenidos)}
                  </div>
                  <div className="text-sm text-muted-foreground">Empleos Impactados</div>
                </div>
                <Users className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="nacional">
            <Globe2 className="h-4 w-4 mr-2" />
            Nacional
          </TabsTrigger>
          <TabsTrigger value="regional">
            <MapPin className="h-4 w-4 mr-2" />
            Regional
          </TabsTrigger>
          <TabsTrigger value="ranking">
            <Award className="h-4 w-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="ue">
            <Link2 className="h-4 w-4 mr-2" />
            Interop UE
          </TabsTrigger>
        </TabsList>

        {/* NACIONAL */}
        <TabsContent value="nacional" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mapa de regiones */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución Regional</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {nationalKPIs?.por_region.map((region, idx) => (
                      <div key={idx} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{region.region}</span>
                          <Badge variant="outline">{region.num_gals} GALs</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Expedientes:</span>
                            <div className="font-medium">{formatNumber(region.expedientes)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ejecución:</span>
                            <div className="font-medium">{region.tasa_ejecucion}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ranking:</span>
                            <div className="font-medium">#{region.ranking_eficiencia}</div>
                          </div>
                        </div>
                        <Progress value={region.tasa_ejecucion} className="h-1.5 mt-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Tendencias */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencias y Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Variaciones interanuales */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Variación Interanual</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-green-500/10 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 text-green-500">
                          <ArrowUp className="h-4 w-4" />
                          <span className="font-bold">+{nationalKPIs?.tendencias.variacion_interanual.expedientes}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Expedientes</div>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-500">
                          <ArrowUp className="h-4 w-4" />
                          <span className="font-bold">+{nationalKPIs?.tendencias.variacion_interanual.presupuesto}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Presupuesto</div>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-500">
                          <ArrowUp className="h-4 w-4" />
                          <span className="font-bold">+{nationalKPIs?.tendencias.variacion_interanual.empleo}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Empleo</div>
                      </div>
                    </div>
                  </div>

                  {/* Sectores en crecimiento */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sectores en Crecimiento</h4>
                    <div className="flex flex-wrap gap-2">
                      {nationalKPIs?.tendencias.sectores_crecimiento.map((sector, i) => (
                        <Badge key={i} className="bg-primary/20 text-primary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {sector}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Alertas */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Alertas Nacionales</h4>
                    <div className="space-y-2">
                      {nationalKPIs?.tendencias.alertas_nacionales.map((alerta, i) => (
                        <div key={i} className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm">
                          ⚠️ {alerta}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REGIONAL */}
        <TabsContent value="regional" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Análisis por Región</CardTitle>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar región" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRegions().map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedRegion ? (
                <div className="text-center py-12">
                  <Button onClick={() => getRegionalAnalysis(selectedRegion)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generar Análisis de {selectedRegion}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Selecciona una región para ver su análisis detallado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top GALs Nacionales</CardTitle>
              <CardDescription>Ranking por eficiencia y resultados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nationalKPIs?.top_gals.map((gal, idx) => (
                  <div key={idx} className={cn(
                    "p-4 border rounded-lg flex items-center gap-4",
                    idx === 0 && "bg-yellow-500/10 border-yellow-500/30",
                    idx === 1 && "bg-gray-400/10 border-gray-400/30",
                    idx === 2 && "bg-orange-500/10 border-orange-500/30"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                      idx === 0 && "bg-yellow-500 text-black",
                      idx === 1 && "bg-gray-400 text-black",
                      idx === 2 && "bg-orange-500 text-white",
                      idx > 2 && "bg-muted"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{gal.nombre}</div>
                      <div className="text-sm text-muted-foreground">{gal.region}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{gal.score}</div>
                      <div className="text-xs text-muted-foreground">puntos</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEROPERABILIDAD UE */}
        <TabsContent value="ue" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  eIDAS 2.0
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Progreso de implementación</span>
                    <Badge>65%</Badge>
                  </div>
                  <Progress value={65} className="h-2" />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 text-xs">✓</Badge>
                      <span>Identificación Cl@ve</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">◐</Badge>
                      <span>EUDI Wallet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 text-xs">✓</Badge>
                      <span>Firma electrónica cualificada</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5" />
                  Red ENRD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Badge className="bg-green-500/20 text-green-400">
                    ✓ Conectado
                  </Badge>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">Datos compartidos:</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">Convocatorias</Badge>
                      <Badge variant="outline" className="text-xs">Estadísticas</Badge>
                      <Badge variant="outline" className="text-xs">Buenas prácticas</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Open Data UE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Datasets publicados</span>
                    <Badge variant="outline">12</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="text-xs">CSV</Badge>
                    <Badge className="text-xs">JSON</Badge>
                    <Badge className="text-xs">RDF</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Licencia: CC-BY-4.0
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  GDPR Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge className="bg-green-500/20 text-green-400">
                    ✓ Cumple
                  </Badge>
                  <div className="text-sm space-y-1">
                    <p>✓ DPD registrado</p>
                    <p>✓ Evaluación de impacto completada</p>
                    <p>✓ Sin transferencias internacionales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaNationalFederationDashboard;
