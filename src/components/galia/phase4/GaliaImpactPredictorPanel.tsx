/**
 * GaliaImpactPredictorPanel - Panel de predicción de impacto socioeconómico
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Target, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Briefcase,
  Building2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useGaliaImpactPredictor, ProjectData, ImpactPrediction, ViabilityAnalysis, EmploymentEstimate } from '@/hooks/galia/useGaliaImpactPredictor';
import { cn } from '@/lib/utils';

interface GaliaImpactPredictorPanelProps {
  className?: string;
  initialProject?: Partial<ProjectData>;
}

export function GaliaImpactPredictorPanel({ className, initialProject }: GaliaImpactPredictorPanelProps) {
  const [activeTab, setActiveTab] = useState('form');
  const [project, setProject] = useState<Partial<ProjectData>>(initialProject || {
    titulo: '',
    sector: '',
    importe_solicitado: 0,
    tipo_beneficiario: 'empresa',
    empleos_previstos: 0,
    empleos_mantener: 0,
  });
  const [impact, setImpact] = useState<ImpactPrediction | null>(null);
  const [viability, setViability] = useState<ViabilityAnalysis | null>(null);
  const [employment, setEmployment] = useState<EmploymentEstimate | null>(null);

  const { isAnalyzing, predictImpact, analyzeViability, estimateEmployment } = useGaliaImpactPredictor();

  const handleAnalyze = useCallback(async () => {
    if (!project.titulo || !project.sector || !project.importe_solicitado) return;

    const projectData: ProjectData = {
      id: crypto.randomUUID(),
      titulo: project.titulo!,
      descripcion: project.descripcion,
      sector: project.sector!,
      importe_solicitado: project.importe_solicitado!,
      importe_inversion_total: project.importe_inversion_total,
      municipio: project.municipio,
      comarca: project.comarca,
      tipo_beneficiario: project.tipo_beneficiario || 'empresa',
      empleos_previstos: project.empleos_previstos,
      empleos_mantener: project.empleos_mantener,
      innovacion: project.innovacion,
      digitalizacion: project.digitalizacion,
      sostenibilidad: project.sostenibilidad,
    };

    const [impactResult, viabilityResult, employmentResult] = await Promise.all([
      predictImpact(projectData),
      analyzeViability(projectData),
      estimateEmployment(projectData),
    ]);

    if (impactResult) setImpact(impactResult);
    if (viabilityResult) setViability(viabilityResult);
    if (employmentResult) setEmployment(employmentResult);
    
    if (impactResult || viabilityResult || employmentResult) {
      setActiveTab('impact');
    }
  }, [project, predictImpact, analyzeViability, estimateEmployment]);

  const getImpactColor = (nivel: string) => {
    switch (nivel) {
      case 'transformador': return 'text-purple-600 bg-purple-100';
      case 'alto': return 'text-green-600 bg-green-100';
      case 'medio': return 'text-yellow-600 bg-yellow-100';
      case 'bajo': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getViabilityColor = (nivel: string) => {
    switch (nivel) {
      case 'muy_viable': return 'text-green-600 bg-green-100';
      case 'viable': return 'text-blue-600 bg-blue-100';
      case 'dudoso': return 'text-yellow-600 bg-yellow-100';
      case 'inviable': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Predictor de Impacto
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">Análisis socioeconómico con IA</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="form" className="text-xs">Proyecto</TabsTrigger>
            <TabsTrigger value="impact" className="text-xs" disabled={!impact}>Impacto</TabsTrigger>
            <TabsTrigger value="viability" className="text-xs" disabled={!viability}>Viabilidad</TabsTrigger>
            <TabsTrigger value="employment" className="text-xs" disabled={!employment}>Empleo</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del proyecto</Label>
                <Input
                  id="titulo"
                  value={project.titulo || ''}
                  onChange={(e) => setProject({ ...project, titulo: e.target.value })}
                  placeholder="Nombre del proyecto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <Select
                  value={project.sector || ''}
                  onValueChange={(value) => setProject({ ...project, sector: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agroalimentario">Agroalimentario</SelectItem>
                    <SelectItem value="turismo">Turismo</SelectItem>
                    <SelectItem value="artesania">Artesanía</SelectItem>
                    <SelectItem value="comercio">Comercio</SelectItem>
                    <SelectItem value="industria">Industria</SelectItem>
                    <SelectItem value="servicios">Servicios</SelectItem>
                    <SelectItem value="tecnologia">Tecnología</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importe">Importe solicitado (€)</Label>
                <Input
                  id="importe"
                  type="number"
                  value={project.importe_solicitado || ''}
                  onChange={(e) => setProject({ ...project, importe_solicitado: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de beneficiario</Label>
                <Select
                  value={project.tipo_beneficiario || 'empresa'}
                  onValueChange={(value: 'empresa' | 'ayuntamiento' | 'asociacion' | 'autonomo') => 
                    setProject({ ...project, tipo_beneficiario: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="autonomo">Autónomo</SelectItem>
                    <SelectItem value="ayuntamiento">Ayuntamiento</SelectItem>
                    <SelectItem value="asociacion">Asociación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="empleos_crear">Empleos a crear</Label>
                <Input
                  id="empleos_crear"
                  type="number"
                  value={project.empleos_previstos || ''}
                  onChange={(e) => setProject({ ...project, empleos_previstos: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empleos_mantener">Empleos a mantener</Label>
                <Input
                  id="empleos_mantener"
                  type="number"
                  value={project.empleos_mantener || ''}
                  onChange={(e) => setProject({ ...project, empleos_mantener: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !project.titulo || !project.sector}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analizar Impacto con IA
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="impact">
            {impact && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Impacto Global */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Impacto Global
                      </h4>
                      <Badge className={getImpactColor(impact.impacto_global.nivel)}>
                        {impact.impacto_global.nivel.toUpperCase()}
                      </Badge>
                    </div>
                    <Progress value={impact.impacto_global.puntuacion} className="h-3 mb-2" />
                    <p className="text-sm text-muted-foreground">{impact.impacto_global.descripcion}</p>
                  </div>

                  {/* Impacto Económico */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4" />
                      Impacto Económico
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Efecto multiplicador:</span>
                        <span className="ml-2 font-medium">{impact.impacto_economico.efecto_multiplicador}x</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inversión inducida:</span>
                        <span className="ml-2 font-medium">
                          {impact.impacto_economico.inversion_inducida_estimada.toLocaleString()}€
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Impacto Territorial */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4" />
                      Impacto Territorial
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Fijación de población:</span>
                        <Badge variant="outline">{impact.impacto_territorial.fijacion_poblacion}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mejora servicios:</span>
                        {impact.impacto_territorial.mejora_servicios ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <span className="text-muted-foreground">-</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Recomendaciones */}
                  {impact.recomendaciones_mejora.length > 0 && (
                    <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        Recomendaciones de Mejora
                      </h4>
                      <ul className="space-y-1">
                        {impact.recomendaciones_mejora.map((rec, i) => (
                          <li key={i} className="text-sm text-amber-600 dark:text-amber-300">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="viability">
            {viability && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Viabilidad Global */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Viabilidad Global
                      </h4>
                      <Badge className={getViabilityColor(viability.viabilidad_global.nivel)}>
                        {viability.viabilidad_global.nivel.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <Progress value={viability.viabilidad_global.puntuacion} className="h-3 mb-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Confianza: {viability.viabilidad_global.confianza}%</span>
                      <span>Prob. éxito: {viability.probabilidad_exito}%</span>
                    </div>
                  </div>

                  {/* Viabilidad Económica */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Briefcase className="h-4 w-4" />
                      Viabilidad Económica
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ROI estimado:</span>
                        <span className="ml-2 font-medium">{viability.viabilidad_economica.roi_estimado}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payback:</span>
                        <span className="ml-2 font-medium">{viability.viabilidad_economica.payback_meses} meses</span>
                      </div>
                    </div>
                  </div>

                  {/* Factores Críticos */}
                  {viability.factores_criticos.length > 0 && (
                    <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        Factores Críticos
                      </h4>
                      <ul className="space-y-1">
                        {viability.factores_criticos.map((factor, i) => (
                          <li key={i} className="text-sm text-red-600 dark:text-red-300">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Condiciones de Éxito */}
                  {viability.condiciones_exito.length > 0 && (
                    <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Condiciones de Éxito
                      </h4>
                      <ul className="space-y-1">
                        {viability.condiciones_exito.map((cond, i) => (
                          <li key={i} className="text-sm text-green-600 dark:text-green-300">• {cond}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="employment">
            {employment && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Empleo Directo */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      Empleo Directo
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {employment.empleo_directo.creacion}
                        </div>
                        <div className="text-xs text-muted-foreground">Nuevos empleos</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {employment.empleo_directo.mantenimiento}
                        </div>
                        <div className="text-xs text-muted-foreground">Empleos mantenidos</div>
                      </div>
                    </div>
                  </div>

                  {/* Empleo Indirecto */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4" />
                      Empleo Indirecto
                    </h4>
                    <div className="text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Estimación:</span>
                        <span className="font-medium">{employment.empleo_indirecto.estimacion} empleos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Multiplicador:</span>
                        <span className="font-medium">{employment.empleo_indirecto.multiplicador}x</span>
                      </div>
                    </div>
                    {employment.empleo_indirecto.sectores_beneficiados.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {employment.empleo_indirecto.sectores_beneficiados.map((sector, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{sector}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sostenibilidad */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-3">Sostenibilidad del Empleo</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>1 año</span>
                          <span>{employment.sostenibilidad.probabilidad_permanencia_1_ano}%</span>
                        </div>
                        <Progress value={employment.sostenibilidad.probabilidad_permanencia_1_ano} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>3 años</span>
                          <span>{employment.sostenibilidad.probabilidad_permanencia_3_anos}%</span>
                        </div>
                        <Progress value={employment.sostenibilidad.probabilidad_permanencia_3_anos} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>5 años</span>
                          <span>{employment.sostenibilidad.probabilidad_permanencia_5_anos}%</span>
                        </div>
                        <Progress value={employment.sostenibilidad.probabilidad_permanencia_5_anos} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Coste por empleo */}
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {employment.coste_por_empleo.toLocaleString()}€
                      </div>
                      <div className="text-sm text-muted-foreground">Coste por empleo creado</div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaImpactPredictorPanel;
