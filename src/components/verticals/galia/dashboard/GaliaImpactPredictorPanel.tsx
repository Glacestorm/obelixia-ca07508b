/**
 * GaliaImpactPredictorPanel - Panel de predicción de impacto socioeconómico
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Users,
  Building2,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Briefcase,
  MapPin,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useGaliaImpactPredictor, type ProjectData, type ImpactPrediction } from '@/hooks/galia/useGaliaImpactPredictor';
import type { GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';
import { cn } from '@/lib/utils';

interface GaliaImpactPredictorPanelProps {
  expediente?: GaliaExpediente;
  className?: string;
}

const getImpactColor = (nivel: string) => {
  switch (nivel) {
    case 'bajo': return 'text-muted-foreground bg-muted';
    case 'medio': return 'text-amber-600 bg-amber-500/10';
    case 'alto': return 'text-green-600 bg-green-500/10';
    case 'transformador': return 'text-primary bg-primary/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

export function GaliaImpactPredictorPanel({ 
  expediente,
  className 
}: GaliaImpactPredictorPanelProps) {
  const [activeTab, setActiveTab] = useState('impacto');
  const [prediction, setPrediction] = useState<ImpactPrediction | null>(null);
  
  const { isAnalyzing, predictImpact } = useGaliaImpactPredictor();

  const handlePredict = async () => {
    if (!expediente) return;

    const projectData: ProjectData = {
      id: expediente.id,
      titulo: expediente.solicitud?.titulo_proyecto || 'Sin título',
      descripcion: undefined,
      sector: 'general',
      importe_solicitado: expediente.solicitud?.importe_solicitado || 0,
      importe_inversion_total: expediente.solicitud?.presupuesto_total,
      municipio: undefined,
      tipo_beneficiario: (expediente.solicitud?.beneficiario?.tipo as ProjectData['tipo_beneficiario']) || 'empresa',
      empleos_previstos: undefined,
      empleos_mantener: undefined,
    };

    const result = await predictImpact(projectData);
    if (result) {
      setPrediction(result);
    }
  };

  if (!expediente) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-8 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Selecciona un expediente para predecir su impacto
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Predicción de Impacto</CardTitle>
              <p className="text-xs text-muted-foreground">
                {expediente.numero_expediente}
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={handlePredict}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {prediction ? 'Actualizar' : 'Analizar'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {!prediction && !isAnalyzing && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Haz clic en "Analizar" para predecir el impacto</p>
            <p className="text-xs mt-1">Se evaluará empleo, economía y territorio</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <RefreshCw className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Analizando impacto socioeconómico...</p>
          </div>
        )}

        {prediction && !isAnalyzing && (
          <>
            {/* Score global */}
            <div className="mb-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Impacto Global
                </span>
                <Badge className={getImpactColor(prediction.impacto_global.nivel)}>
                  {prediction.impacto_global.nivel.toUpperCase()}
                </Badge>
              </div>
              <Progress value={prediction.impacto_global.puntuacion} className="h-3 mb-2" />
              <p className="text-xs text-muted-foreground">
                {prediction.impacto_global.descripcion}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-3">
                <TabsTrigger value="impacto" className="text-xs">Económico</TabsTrigger>
                <TabsTrigger value="empleo" className="text-xs">Empleo</TabsTrigger>
                <TabsTrigger value="territorio" className="text-xs">Territorio</TabsTrigger>
                <TabsTrigger value="riesgos" className="text-xs">Riesgos</TabsTrigger>
              </TabsList>

              {/* Impacto Económico */}
              <TabsContent value="impacto" className="mt-0">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium">Efecto Multiplicador</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          x{prediction.impacto_economico.efecto_multiplicador.toFixed(1)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">Inversión Inducida</span>
                        </div>
                        <p className="text-lg font-bold">
                          {new Intl.NumberFormat('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR',
                            maximumFractionDigits: 0 
                          }).format(prediction.impacto_economico.inversion_inducida_estimada)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <h4 className="text-sm font-medium mb-2">Alineación con EDL</h4>
                      <Progress 
                        value={prediction.indicadores_edl.alineacion_estrategia} 
                        className="h-2 mb-2" 
                      />
                      <div className="flex flex-wrap gap-1">
                        {prediction.indicadores_edl.contribucion_objetivos.map((obj, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {obj}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <h4 className="text-sm font-medium mb-2">Comparativa Sector</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Percentil</span>
                        <Badge className={
                          prediction.comparativa_sector.posicion === 'destacado' ? 'bg-green-500' :
                          prediction.comparativa_sector.posicion === 'por_encima' ? 'bg-emerald-500' :
                          prediction.comparativa_sector.posicion === 'media' ? 'bg-amber-500' :
                          'bg-muted'
                        }>
                          Top {100 - prediction.comparativa_sector.percentil}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Empleo */}
              <TabsContent value="empleo" className="mt-0">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-lg bg-primary/10 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-xl font-bold text-primary">
                          {prediction.impacto_empleo.empleos_directos_estimados}
                        </p>
                        <p className="text-xs text-muted-foreground">Directos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-secondary-foreground" />
                        <p className="text-xl font-bold">
                          {prediction.impacto_empleo.empleos_indirectos_estimados}
                        </p>
                        <p className="text-xs text-muted-foreground">Indirectos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10 text-center">
                        <Briefcase className="h-5 w-5 mx-auto mb-1 text-green-600" />
                        <p className="text-xl font-bold text-green-600">
                          {prediction.impacto_empleo.empleos_directos_estimados + prediction.impacto_empleo.empleos_indirectos_estimados}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border">
                      <h4 className="text-sm font-medium mb-2">Calidad del Empleo</h4>
                      <Badge className={
                        prediction.impacto_empleo.calidad_empleo === 'cualificado' ? 'bg-green-500' :
                        prediction.impacto_empleo.calidad_empleo === 'estable' ? 'bg-amber-500' :
                        'bg-red-500'
                      }>
                        {prediction.impacto_empleo.calidad_empleo.toUpperCase()}
                      </Badge>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Sostenibilidad</span>
                          <span>{prediction.impacto_empleo.sostenibilidad_empleo}%</span>
                        </div>
                        <Progress value={prediction.impacto_empleo.sostenibilidad_empleo} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Territorio */}
              <TabsContent value="territorio" className="mt-0">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-primary/10 text-center">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">
                        {prediction.impacto_territorial.puntuacion}/100
                      </p>
                      <p className="text-sm text-muted-foreground">Impacto Territorial</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="text-sm">Fijación de población</span>
                        <Badge variant="outline" className={
                          prediction.impacto_territorial.fijacion_poblacion === 'alto' ? 'border-green-500 text-green-600' :
                          prediction.impacto_territorial.fijacion_poblacion === 'medio' ? 'border-amber-500 text-amber-600' :
                          'border-muted'
                        }>
                          {prediction.impacto_territorial.fijacion_poblacion}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="text-sm">Mejora servicios básicos</span>
                        {prediction.impacto_territorial.mejora_servicios ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="text-sm">Atracción inversiones</span>
                        {prediction.impacto_territorial.atraccion_inversiones ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Riesgos */}
              <TabsContent value="riesgos" className="mt-0">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {prediction.riesgos_impacto.length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p className="text-sm text-muted-foreground">Sin riesgos significativos</p>
                      </div>
                    ) : (
                      prediction.riesgos_impacto.map((riesgo, idx) => (
                        <div key={idx} className="p-3 rounded-lg border">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={cn(
                              "h-4 w-4 shrink-0 mt-0.5",
                              riesgo.probabilidad >= 70 ? "text-red-500" :
                              riesgo.probabilidad >= 40 ? "text-amber-500" : "text-blue-500"
                            )} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{riesgo.riesgo}</span>
                                <Badge variant="outline" className="text-xs">
                                  {riesgo.probabilidad}%
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>Mitigación:</strong> {riesgo.mitigacion}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {prediction.recomendaciones_mejora.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Recomendaciones
                        </h4>
                        {prediction.recomendaciones_mejora.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaImpactPredictorPanel;
