/**
 * GaliaGeoIntelligencePanel - Panel de Geointeligencia Territorial
 * Mapas de impacto, detección de despoblación y optimización de inversión
 */

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Map as MapIcon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Euro,
  Target,
  Maximize2,
  Minimize2,
  Download,
  Filter,
  Layers,
  BarChart3,
  PieChart,
  Activity,
  Building,
  MapPin,
  Zap
} from 'lucide-react';
import { useGaliaGeoIntelligence, MunicipalityData, DepopulationZone } from '@/hooks/galia/useGaliaGeoIntelligence';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Lazy load heavy map component
const LazyMapContainer = lazy(() => import('@/components/map/LazyMapContainer').then(m => ({ default: m.LazyMapContainer })));

interface GaliaGeoIntelligencePanelProps {
  className?: string;
  defaultRegion?: string;
}

export function GaliaGeoIntelligencePanel({ 
  className,
  defaultRegion = 'asturias'
}: GaliaGeoIntelligencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState<'investment' | 'employment' | 'depopulation' | 'impact'>('depopulation');
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityData | null>(null);
  const [optimizationBudget, setOptimizationBudget] = useState(5000000);
  const [priorities, setPriorities] = useState({
    employment: 30,
    sustainability: 25,
    equity: 25,
    depopulation: 20
  });

  const {
    isLoading,
    municipalities,
    impacts,
    depopulationZones,
    optimization,
    error,
    lastAnalysis,
    fetchMunicipalData,
    analyzeTerritorialImpact,
    detectDepopulationZones,
    optimizeInvestment
  } = useGaliaGeoIntelligence();

  // Cargar datos iniciales
  useEffect(() => {
    fetchMunicipalData(defaultRegion);
  }, [defaultRegion, fetchMunicipalData]);

  const handleAnalyzeImpact = useCallback(async () => {
    await analyzeTerritorialImpact({
      region: defaultRegion,
      analysisType: 'impact'
    });
  }, [defaultRegion, analyzeTerritorialImpact]);

  const handleDetectDepopulation = useCallback(async () => {
    await detectDepopulationZones(defaultRegion);
  }, [defaultRegion, detectDepopulationZones]);

  const handleOptimizeInvestment = useCallback(async () => {
    await optimizeInvestment(
      optimizationBudget,
      {
        employment: priorities.employment / 100,
        sustainability: priorities.sustainability / 100,
        equity: priorities.equity / 100,
        depopulation: priorities.depopulation / 100
      },
      defaultRegion
    );
  }, [optimizationBudget, priorities, defaultRegion, optimizeInvestment]);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-orange-500 text-xs">Alto</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500 text-xs">Medio</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Bajo</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'growing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Stats summary
  const stats = {
    totalMunicipalities: municipalities.length,
    criticalZones: municipalities.filter(m => m.depopulationRisk === 'critical').length,
    highRiskZones: municipalities.filter(m => m.depopulationRisk === 'high').length,
    totalInvestment: municipalities.reduce((sum, m) => sum + m.totalInvestment, 0),
    totalEmployment: municipalities.reduce((sum, m) => sum + m.employmentGenerated, 0)
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 via-green-500/10 to-amber-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-green-500">
              <MapIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Geointeligencia Territorial
                <Badge variant="outline" className="text-xs">Phase 8B</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastAnalysis 
                  ? `Actualizado ${formatDistanceToNow(lastAnalysis, { locale: es, addSuffix: true })}`
                  : 'Cargando datos territoriales...'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => fetchMunicipalData(defaultRegion)}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <div className="text-lg font-bold text-primary">{stats.totalMunicipalities}</div>
            <div className="text-xs text-muted-foreground">Municipios</div>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 text-center">
            <div className="text-lg font-bold text-destructive">{stats.criticalZones}</div>
            <div className="text-xs text-muted-foreground">Críticos</div>
          </div>
          <div className="p-2 rounded-lg bg-orange-500/10 text-center">
            <div className="text-lg font-bold text-orange-600">{stats.highRiskZones}</div>
            <div className="text-xs text-muted-foreground">Alto Riesgo</div>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <div className="text-lg font-bold text-green-600">{(stats.totalInvestment / 1000000).toFixed(1)}M€</div>
            <div className="text-xs text-muted-foreground">Inversión</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-center">
            <div className="text-lg font-bold text-blue-600">{stats.totalEmployment}</div>
            <div className="text-xs text-muted-foreground">Empleos</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <Layers className="h-3 w-3" />
              Vista General
            </TabsTrigger>
            <TabsTrigger value="depopulation" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Despoblación
            </TabsTrigger>
            <TabsTrigger value="impact" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              Impacto
            </TabsTrigger>
            <TabsTrigger value="optimization" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              Optimización
            </TabsTrigger>
          </TabsList>

          {/* VISTA GENERAL */}
          <TabsContent value="overview" className="flex-1 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Metric Selector */}
              <div className="lg:col-span-1">
                <Label className="text-xs mb-2 block">Métrica del Mapa</Label>
                <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as typeof selectedMetric)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="depopulation">Riesgo Despoblación</SelectItem>
                    <SelectItem value="investment">Inversión Total</SelectItem>
                    <SelectItem value="employment">Empleo Generado</SelectItem>
                    <SelectItem value="impact">Puntuación Impacto</SelectItem>
                  </SelectContent>
                </Select>

                <ScrollArea className={isExpanded ? "h-[calc(100vh-400px)]" : "h-[250px]"}>
                  <div className="space-y-2 mt-3 pr-2">
                    {municipalities.map((m) => (
                      <div 
                        key={m.id}
                        onClick={() => setSelectedMunicipality(m)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                          selectedMunicipality?.id === m.id && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{m.name}</span>
                          {getRiskBadge(m.depopulationRisk)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{m.population.toLocaleString('es-ES')}</span>
                          {getTrendIcon(m.populationTrend)}
                          <Euro className="h-3 w-3 ml-2" />
                          <span>{(m.totalInvestment / 1000).toFixed(0)}k€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Map Placeholder */}
              <div className="lg:col-span-2">
                <div className={cn(
                  "rounded-lg border bg-muted/30 flex items-center justify-center",
                  isExpanded ? "h-[calc(100vh-350px)]" : "h-[300px]"
                )}>
                  <div className="text-center p-6">
                    <MapIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Mapa Interactivo de Asturias
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Visualización de {selectedMetric === 'depopulation' ? 'riesgo de despoblación' :
                        selectedMetric === 'investment' ? 'inversión total' :
                        selectedMetric === 'employment' ? 'empleo generado' : 'puntuación de impacto'}
                    </p>
                    {selectedMunicipality && (
                      <div className="p-3 bg-background rounded-lg border inline-block text-left">
                        <div className="font-medium text-sm">{selectedMunicipality.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Población: {selectedMunicipality.population.toLocaleString('es-ES')} hab
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Inversión: {(selectedMunicipality.totalInvestment / 1000).toFixed(0)}k€
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ayudas: {selectedMunicipality.grantCount} expedientes
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* DESPOBLACIÓN */}
          <TabsContent value="depopulation" className="flex-1 mt-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                Detección de zonas en riesgo de despoblación con intervenciones sugeridas
              </p>
              <Button 
                size="sm" 
                onClick={handleDetectDepopulation}
                disabled={isLoading}
                className="gap-1"
              >
                <Zap className="h-4 w-4" />
                Analizar Zonas
              </Button>
            </div>

            <ScrollArea className={isExpanded ? "h-[calc(100vh-350px)]" : "h-[280px]"}>
              {depopulationZones.length > 0 ? (
                <div className="space-y-3 pr-2">
                  {depopulationZones.map((zone) => (
                    <Card key={zone.id} className="border-l-4 border-l-destructive">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {zone.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {zone.municipalities.join(', ')}
                            </p>
                          </div>
                          {getRiskBadge(zone.riskLevel)}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="text-sm font-bold">{zone.totalPopulation.toLocaleString('es-ES')}</div>
                            <div className="text-xs text-muted-foreground">Habitantes</div>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="text-sm font-bold">{zone.populationDensity.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">hab/km²</div>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="text-sm font-bold">{zone.priorityScore}</div>
                            <div className="text-xs text-muted-foreground">Prioridad</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <Label className="text-xs font-medium">Intervenciones Sugeridas</Label>
                          <div className="space-y-1 mt-1">
                            {zone.suggestedInterventions.slice(0, 2).map((intervention, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-green-50 dark:bg-green-950 rounded">
                                <span>{intervention.description}</span>
                                <Badge variant="outline" className="text-xs">
                                  {(intervention.budget / 1000).toFixed(0)}k€
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {zone.grantOpportunities.length > 0 && (
                          <div>
                            <Label className="text-xs font-medium">Convocatorias Relevantes</Label>
                            <div className="space-y-1 mt-1">
                              {zone.grantOpportunities.map((grant, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-blue-50 dark:bg-blue-950 rounded">
                                  <span className="truncate flex-1">{grant.title}</span>
                                  <Badge className="ml-2">{grant.relevanceScore}%</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic en "Analizar Zonas" para detectar áreas en riesgo de despoblación
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* IMPACTO */}
          <TabsContent value="impact" className="flex-1 mt-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                Análisis de impacto económico, social y ambiental por municipio
              </p>
              <Button 
                size="sm" 
                onClick={handleAnalyzeImpact}
                disabled={isLoading}
                className="gap-1"
              >
                <BarChart3 className="h-4 w-4" />
                Calcular Impacto
              </Button>
            </div>

            <ScrollArea className={isExpanded ? "h-[calc(100vh-350px)]" : "h-[280px]"}>
              {impacts.length > 0 ? (
                <div className="space-y-3 pr-2">
                  {impacts.map((impact) => (
                    <Card key={impact.municipalityId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{impact.municipalityName}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Impacto:</span>
                            <Badge 
                              variant={impact.impactScore >= 80 ? 'default' : impact.impactScore >= 60 ? 'secondary' : 'outline'}
                              className="text-sm"
                            >
                              {impact.impactScore}/100
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {/* Económico */}
                          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                            <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Económico</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Empleos directos</span>
                                <span className="font-medium">{impact.economicImpact.directJobs}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Multiplicador</span>
                                <span className="font-medium">x{impact.economicImpact.investmentMultiplier.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Social */}
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Social</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Retención</span>
                                <span className="font-medium">{impact.socialImpact.populationRetention}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Calidad vida</span>
                                <span className="font-medium">{impact.socialImpact.qualityOfLife}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Ambiental */}
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Ambiental</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Sostenibilidad</span>
                                <span className="font-medium">{impact.environmentalImpact.sustainabilityScore}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>CO₂ reducido</span>
                                <span className="font-medium">{impact.environmentalImpact.carbonReduction}t</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {impact.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <Label className="text-xs font-medium">Recomendaciones</Label>
                            <ul className="mt-1 space-y-1">
                              {impact.recommendations.slice(0, 2).map((rec, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-primary">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic en "Calcular Impacto" para analizar el impacto territorial
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* OPTIMIZACIÓN */}
          <TabsContent value="optimization" className="flex-1 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Configuración */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Presupuesto Total</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={optimizationBudget}
                      onChange={(e) => setOptimizationBudget(Number(e.target.value))}
                      className="h-8"
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-3 block">Prioridades de Inversión</Label>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Empleo</span>
                        <span>{priorities.employment}%</span>
                      </div>
                      <Slider
                        value={[priorities.employment]}
                        onValueChange={([v]) => setPriorities(p => ({ ...p, employment: v }))}
                        max={100}
                        step={5}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Sostenibilidad</span>
                        <span>{priorities.sustainability}%</span>
                      </div>
                      <Slider
                        value={[priorities.sustainability]}
                        onValueChange={([v]) => setPriorities(p => ({ ...p, sustainability: v }))}
                        max={100}
                        step={5}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Equidad Territorial</span>
                        <span>{priorities.equity}%</span>
                      </div>
                      <Slider
                        value={[priorities.equity]}
                        onValueChange={([v]) => setPriorities(p => ({ ...p, equity: v }))}
                        max={100}
                        step={5}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Lucha Despoblación</span>
                        <span>{priorities.depopulation}%</span>
                      </div>
                      <Slider
                        value={[priorities.depopulation]}
                        onValueChange={([v]) => setPriorities(p => ({ ...p, depopulation: v }))}
                        max={100}
                        step={5}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleOptimizeInvestment}
                  disabled={isLoading}
                  className="w-full gap-2"
                >
                  <Target className="h-4 w-4" />
                  Calcular Distribución Óptima
                </Button>
              </div>

              {/* Resultados */}
              <div>
                {optimization ? (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{optimization.scenarioName}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-2 rounded bg-green-50 dark:bg-green-950 text-center">
                          <div className="text-lg font-bold text-green-600">{optimization.expectedOutcomes.totalJobs}</div>
                          <div className="text-xs text-muted-foreground">Empleos Esperados</div>
                        </div>
                        <div className="p-2 rounded bg-blue-50 dark:bg-blue-950 text-center">
                          <div className="text-lg font-bold text-blue-600">{optimization.expectedOutcomes.populationRetained}</div>
                          <div className="text-xs text-muted-foreground">Población Retenida</div>
                        </div>
                      </div>

                      <Label className="text-xs">Distribución por Municipio</Label>
                      <ScrollArea className="h-[150px] mt-2">
                        <div className="space-y-2">
                          {optimization.allocations.map((alloc) => (
                            <div key={alloc.municipalityId} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                              <div>
                                <span className="font-medium">{alloc.municipalityName}</span>
                                <p className="text-muted-foreground truncate max-w-[150px]">{alloc.priorityReason}</p>
                              </div>
                              <Badge variant="outline">{(alloc.amount / 1000).toFixed(0)}k€</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="mt-3 pt-3 border-t">
                        <Label className="text-xs">Mejora vs. Línea Base</Label>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            +{optimization.comparisonToBaseline.jobsImprovement}% empleos
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            +{optimization.comparisonToBaseline.efficiencyGain}% eficiencia
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border rounded-lg border-dashed">
                    <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Configura las prioridades y calcula la distribución óptima del presupuesto
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaGeoIntelligencePanel;
