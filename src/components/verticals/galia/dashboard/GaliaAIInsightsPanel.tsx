/**
 * GaliaAIInsightsPanel - Panel de Insights IA para expedientes GALIA
 * Muestra análisis de riesgo, predicciones y recomendaciones
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Calendar,
  UserCheck,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Shield,
  Clock,
  Target,
} from 'lucide-react';
import { useGaliaAIAnalysis, FullAnalysisResult } from '@/hooks/galia/useGaliaAIAnalysis';
import type { GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaAIInsightsPanelProps {
  expediente: GaliaExpediente;
  onClose?: () => void;
  className?: string;
}

const getRiskColor = (nivel: string) => {
  switch (nivel) {
    case 'bajo': return 'text-green-600 bg-green-500/10';
    case 'medio': return 'text-amber-600 bg-amber-500/10';
    case 'alto': return 'text-orange-600 bg-orange-500/10';
    case 'critico': return 'text-red-600 bg-red-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

const getSeverityColor = (severidad: string) => {
  switch (severidad) {
    case 'info': return 'border-blue-500/30 bg-blue-500/5';
    case 'warning': return 'border-amber-500/30 bg-amber-500/5';
    case 'error': return 'border-orange-500/30 bg-orange-500/5';
    case 'critical': return 'border-red-500/30 bg-red-500/5';
    default: return 'border-muted';
  }
};

export function GaliaAIInsightsPanel({ 
  expediente, 
  onClose,
  className 
}: GaliaAIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [analysis, setAnalysis] = useState<FullAnalysisResult | null>(null);
  
  const { 
    isAnalyzing, 
    error, 
    getFullAnalysis,
    clearAnalysis 
  } = useGaliaAIAnalysis();

  // Ejecutar análisis al montar o cambiar expediente
  useEffect(() => {
    const runAnalysis = async () => {
      const result = await getFullAnalysis(expediente);
      if (result) {
        setAnalysis(result);
      }
    };
    
    runAnalysis();
    
    return () => {
      clearAnalysis();
    };
  }, [expediente.id]);

  const handleRefresh = async () => {
    const result = await getFullAnalysis(expediente);
    if (result) {
      setAnalysis(result);
    }
  };

  if (isAnalyzing && !analysis) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base">Analizando con IA...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !analysis) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Análisis IA</CardTitle>
              <p className="text-xs text-muted-foreground">
                {expediente.numero_expediente}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isAnalyzing}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {/* Score de Salud */}
        <div className="mb-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <Target className="h-4 w-4" />
              Puntuación de Salud
            </span>
            <span className={cn(
              "text-lg font-bold",
              analysis.puntuacion_salud >= 70 ? "text-green-600" :
              analysis.puntuacion_salud >= 40 ? "text-amber-600" : "text-red-600"
            )}>
              {analysis.puntuacion_salud}/100
            </span>
          </div>
          <Progress 
            value={analysis.puntuacion_salud} 
            className="h-2"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="riesgo" className="text-xs">Riesgo</TabsTrigger>
            <TabsTrigger value="plazos" className="text-xs">Plazos</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs">Alertas</TabsTrigger>
          </TabsList>

          {/* Resumen */}
          <TabsContent value="resumen" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {/* Resumen ejecutivo */}
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.resumen_ejecutivo}
                  </p>
                </div>

                {/* Próximos pasos */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Próximos Pasos Recomendados
                  </h4>
                  <div className="space-y-1">
                    {analysis.proximos_pasos.map((paso, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm"
                      >
                        <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{paso}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asignación */}
                {analysis.asignacion.tecnico_recomendado && (
                  <div className="p-3 rounded-lg border bg-primary/5">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Técnico Recomendado</span>
                    </div>
                    <p className="text-sm">{analysis.asignacion.tecnico_recomendado}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analysis.asignacion.justificacion}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Riesgo */}
          <TabsContent value="riesgo" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {/* Nivel de riesgo */}
                <div className={cn(
                  "p-4 rounded-lg text-center",
                  getRiskColor(analysis.riesgo.nivel)
                )}>
                  <Shield className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{analysis.riesgo.scoring}</p>
                  <p className="text-sm font-medium capitalize">Riesgo {analysis.riesgo.nivel}</p>
                </div>

                {/* Factores principales */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Factores de Riesgo</h4>
                  <div className="space-y-1">
                    {analysis.riesgo.factores_principales.map((factor, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Plazos */}
          <TabsContent value="plazos" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {/* Fecha estimada */}
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-lg font-bold">
                    {format(new Date(analysis.plazos.fecha_estimada_resolucion), 'dd MMM yyyy', { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ~{analysis.plazos.dias_estimados} días restantes
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Confianza: {analysis.plazos.confianza}%
                  </Badge>
                </div>

                {/* Timeline visual simplificado */}
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Estimación</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Hoy</span>
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {format(new Date(analysis.plazos.fecha_estimada_resolucion), 'dd/MM/yy')}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Alertas */}
          <TabsContent value="alertas" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {analysis.alertas_activas.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">Sin alertas activas</p>
                  </div>
                ) : (
                  analysis.alertas_activas.map((alerta, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border",
                        getSeverityColor(alerta.severidad)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn(
                          "h-4 w-4 shrink-0 mt-0.5",
                          alerta.severidad === 'critical' ? "text-red-500" :
                          alerta.severidad === 'error' ? "text-orange-500" :
                          alerta.severidad === 'warning' ? "text-amber-500" : "text-blue-500"
                        )} />
                        <div>
                          <p className="text-sm font-medium">{alerta.tipo}</p>
                          <p className="text-xs text-muted-foreground">{alerta.mensaje}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaAIInsightsPanel;
