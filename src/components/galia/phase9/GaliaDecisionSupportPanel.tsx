/**
 * GaliaDecisionSupportPanel - AI-Powered Decision Support System
 * 
 * Phase 6 of GALIA 2.0 Strategic Plan:
 * - Multi-criteria evaluation with weighted scoring
 * - Automated compliance verification
 * - Cross-module integration (Accounting, Treasury, Legal)
 * - Intelligent recommendation engine
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  Scale, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Banknote,
  Gavel,
  Link2,
  Lightbulb,
  TrendingUp,
  Clock,
  Shield,
  Sparkles,
  BarChart3,
  GitBranch,
  Target
} from 'lucide-react';
import { useGaliaDecisionSupport, ApplicationData, EvaluationCriteria } from '@/hooks/galia/useGaliaDecisionSupport';
import { cn } from '@/lib/utils';

interface GaliaDecisionSupportPanelProps {
  expedienteId?: string;
  applicationData?: ApplicationData;
  criterios?: EvaluationCriteria[];
  className?: string;
}

export function GaliaDecisionSupportPanel({
  expedienteId,
  applicationData,
  criterios,
  className
}: GaliaDecisionSupportPanelProps) {
  const [activeTab, setActiveTab] = useState('evaluacion');
  
  const {
    isLoading,
    error,
    evaluationResult,
    scoringResult,
    complianceResult,
    syncResult,
    recommendations,
    evaluateApplication,
    generateScoring,
    checkCompliance,
    syncWithModule,
    getRecommendations,
    clearState
  } = useGaliaDecisionSupport();

  // Demo data for testing
  const demoApplicationData: ApplicationData = applicationData || {
    proyecto: {
      titulo: 'Modernización de Quesería Artesanal',
      descripcion: 'Inversión en equipamiento para producción de queso ecológico',
      sector: 'Agroalimentario',
      inversion: 85000,
      empleosCreados: 2,
      empleosMantenidos: 4
    },
    presupuesto: {
      inversionTotal: 85000,
      subvencionSolicitada: 42500,
      fondosPropios: 42500,
      porcentajeAyuda: 50
    },
    solicitante: {
      tipo: 'PYME',
      nif: 'B12345678',
      antiguedad: 8,
      municipio: 'Cangas de Onís',
      zonaRural: true
    },
    documentacion: [
      'Memoria técnica',
      'Plan de negocio',
      'Presupuestos proveedores',
      'Certificado tributario AEAT',
      'Certificado TGSS'
    ]
  };

  const demoCriterios: EvaluationCriteria[] = criterios || [
    { id: 'c1', nombre: 'Viabilidad técnica', peso: 25, descripcion: 'Capacidad técnica del proyecto' },
    { id: 'c2', nombre: 'Impacto territorial', peso: 20, descripcion: 'Beneficio para la zona rural' },
    { id: 'c3', nombre: 'Creación de empleo', peso: 20, descripcion: 'Puestos de trabajo creados/mantenidos' },
    { id: 'c4', nombre: 'Innovación', peso: 15, descripcion: 'Grado de innovación del proyecto' },
    { id: 'c5', nombre: 'Sostenibilidad', peso: 20, descripcion: 'Viabilidad económica a largo plazo' }
  ];

  const handleEvaluate = useCallback(async () => {
    await evaluateApplication(demoApplicationData, demoCriterios);
  }, [evaluateApplication, demoApplicationData, demoCriterios]);

  const handleScoring = useCallback(async () => {
    await generateScoring(expedienteId || 'EXP-2024-001', demoApplicationData, demoCriterios);
  }, [generateScoring, expedienteId, demoApplicationData, demoCriterios]);

  const handleCompliance = useCallback(async () => {
    await checkCompliance(expedienteId || 'EXP-2024-001', demoApplicationData);
  }, [checkCompliance, expedienteId, demoApplicationData]);

  const handleSync = useCallback(async (moduleType: 'accounting' | 'treasury' | 'legal' | 'contracting') => {
    await syncWithModule(expedienteId || 'EXP-2024-001', moduleType, demoApplicationData as unknown as Record<string, unknown>);
  }, [syncWithModule, expedienteId, demoApplicationData]);

  const handleRecommendations = useCallback(async () => {
    await getRecommendations(expedienteId || 'EXP-2024-001', demoApplicationData);
  }, [getRecommendations, expedienteId, demoApplicationData]);

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APROBAR': return 'bg-green-500';
      case 'DENEGAR': return 'bg-red-500';
      case 'SUBSANAR': return 'bg-yellow-500';
      case 'REVISAR': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return 'destructive';
      case 'ALTA': return 'default';
      case 'MEDIA': return 'secondary';
      case 'BAJA': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Sistema de Soporte a Decisiones
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </CardTitle>
              <CardDescription>
                Evaluación multi-criterio y sincronización cross-modular
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearState}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="evaluacion" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              Evaluación
            </TabsTrigger>
            <TabsTrigger value="scoring" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Scoring
            </TabsTrigger>
            <TabsTrigger value="cumplimiento" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Cumplimiento
            </TabsTrigger>
            <TabsTrigger value="integracion" className="text-xs">
              <GitBranch className="h-3 w-3 mr-1" />
              Integración
            </TabsTrigger>
            <TabsTrigger value="recomendaciones" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Sugerencias
            </TabsTrigger>
          </TabsList>

          {/* EVALUACIÓN TAB */}
          <TabsContent value="evaluacion" className="mt-0">
            <div className="space-y-4">
              <Button 
                onClick={handleEvaluate} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Scale className="h-4 w-4 mr-2" />
                )}
                Evaluar Solicitud
              </Button>

              {evaluationResult && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {/* Decision Summary */}
                    <div className={cn(
                      "p-4 rounded-lg text-white",
                      getDecisionColor(evaluationResult.recomendacion.decision)
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90">Recomendación IA</p>
                          <p className="text-2xl font-bold">
                            {evaluationResult.recomendacion.decision}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm opacity-90">Confianza</p>
                          <p className="text-2xl font-bold">
                            {evaluationResult.recomendacion.confianza}%
                          </p>
                        </div>
                      </div>
                      <p className="text-sm mt-2 opacity-90">
                        {evaluationResult.recomendacion.justificacionTecnica}
                      </p>
                    </div>

                    {/* Score Overview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Puntuación Total</p>
                        <p className="text-2xl font-bold text-primary">
                          {evaluationResult.evaluacion.puntuacionTotal}/100
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Ponderada</p>
                        <p className="text-2xl font-bold">
                          {evaluationResult.evaluacion.puntuacionPonderada.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    {/* Criteria Breakdown */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Desglose por Criterios</p>
                      {evaluationResult.evaluacion.criteriosEvaluados.map((criterio, idx) => (
                        <div key={idx} className="p-2 border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{criterio.nombre}</span>
                            <Badge variant={criterio.puntuacion >= 70 ? 'default' : 'secondary'}>
                              {criterio.puntuacion}/100
                            </Badge>
                          </div>
                          <Progress value={criterio.puntuacion} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {criterio.justificacion}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Eligibility */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {evaluationResult.elegibilidad.cumpleRequisitos ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          {evaluationResult.elegibilidad.cumpleRequisitos 
                            ? 'Cumple requisitos de elegibilidad' 
                            : 'Requisitos pendientes'}
                        </span>
                      </div>
                      {evaluationResult.elegibilidad.subsanables.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Subsanables:</p>
                          <ul className="text-xs list-disc list-inside">
                            {evaluationResult.elegibilidad.subsanables.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* SCORING TAB */}
          <TabsContent value="scoring" className="mt-0">
            <div className="space-y-4">
              <Button 
                onClick={handleScoring} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Generar Scoring
              </Button>

              {scoringResult && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {/* Main Score */}
                    <div className="p-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Puntuación Final</p>
                      <p className="text-4xl font-bold text-primary">
                        {scoringResult.scoring.puntuacionFinal}
                      </p>
                      <Badge className="mt-2" variant="outline">
                        Ranking: {scoringResult.scoring.ranking}
                      </Badge>
                    </div>

                    {/* Comparative */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Percentil</p>
                        <p className="font-bold">{scoringResult.scoring.percentil}%</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Media Conv.</p>
                        <p className="font-bold">{scoringResult.comparativa.mediaConvocatoria}</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Prob. Aprob.</p>
                        <p className="font-bold text-green-600">
                          {scoringResult.comparativa.probabilidadAprobacion}%
                        </p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Desglose de Puntuación</p>
                      {scoringResult.scoring.desglose.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="text-sm">{item.criterio}</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.peso}%)</span>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{item.puntuacionPonderada.toFixed(1)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Improvements */}
                    {scoringResult.mejoras.length > 0 && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Oportunidades de Mejora
                        </p>
                        {scoringResult.mejoras.map((mejora, idx) => (
                          <div key={idx} className="flex items-start gap-2 py-1">
                            <Target className="h-3 w-3 text-primary mt-1" />
                            <div>
                              <p className="text-sm font-medium">{mejora.area}</p>
                              <p className="text-xs text-muted-foreground">{mejora.sugerencia}</p>
                              <Badge variant="secondary" className="text-xs mt-1">
                                +{mejora.impactoPotencial} pts potencial
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* CUMPLIMIENTO TAB */}
          <TabsContent value="cumplimiento" className="mt-0">
            <div className="space-y-4">
              <Button 
                onClick={handleCompliance} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4 mr-2" />
                )}
                Verificar Cumplimiento
              </Button>

              {complianceResult && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {/* Global Status */}
                    <div className={cn(
                      "p-4 rounded-lg border",
                      complianceResult.cumplimiento.global 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-destructive/10 border-destructive/30"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {complianceResult.cumplimiento.global ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <span className="font-medium">
                            {complianceResult.cumplimiento.nivel}
                          </span>
                        </div>
                        <Badge variant={complianceResult.cumplimiento.global ? 'default' : 'destructive'}>
                          {complianceResult.cumplimiento.porcentaje}%
                        </Badge>
                      </div>
                    </div>

                    {/* De Minimis Check */}
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Control De Minimis</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Acumulado:</span>
                          <span className="font-medium">{complianceResult.minimisDenota.acumulado.toLocaleString()}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Límite disponible:</span>
                          <span>{complianceResult.minimisDenota.limiteDisponible.toLocaleString()}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Solicitada:</span>
                          <span>{complianceResult.minimisDenota.ayudaSolicitada.toLocaleString()}€</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-medium">
                          <span>Estado:</span>
                          {complianceResult.minimisDenota.superaLimite ? (
                            <Badge variant="destructive">Excede límite</Badge>
                          ) : (
                            <Badge variant="default">Dentro del límite</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Alerts */}
                    {complianceResult.alertas.map((alerta, idx) => (
                      <Alert key={idx} variant={alerta.tipo === 'BLOQUEO' ? 'destructive' : 'default'}>
                        {alerta.tipo === 'BLOQUEO' ? (
                          <XCircle className="h-4 w-4" />
                        ) : alerta.tipo === 'ADVERTENCIA' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <AlertTitle>{alerta.tipo}</AlertTitle>
                        <AlertDescription>{alerta.mensaje}</AlertDescription>
                      </Alert>
                    ))}

                    {/* Verifications */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Verificaciones Normativas</p>
                      {complianceResult.verificaciones.map((v, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 border rounded">
                          {v.cumple ? (
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{v.normativa}</p>
                            <p className="text-xs text-muted-foreground">{v.requisito}</p>
                            {v.observacion && (
                              <p className="text-xs italic mt-1">{v.observacion}</p>
                            )}
                          </div>
                          <Badge variant={
                            v.criticidad === 'ALTA' ? 'destructive' : 
                            v.criticidad === 'MEDIA' ? 'secondary' : 'outline'
                          }>
                            {v.criticidad}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* INTEGRACIÓN TAB */}
          <TabsContent value="integracion" className="mt-0">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sincroniza el expediente con otros módulos del sistema
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleSync('accounting')}
                  disabled={isLoading}
                  className="h-auto py-4 flex-col"
                >
                  <Banknote className="h-6 w-6 mb-2" />
                  <span>Contabilidad</span>
                  <span className="text-xs text-muted-foreground">PGC 2007</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => handleSync('treasury')}
                  disabled={isLoading}
                  className="h-auto py-4 flex-col"
                >
                  <ArrowRight className="h-6 w-6 mb-2" />
                  <span>Tesorería</span>
                  <span className="text-xs text-muted-foreground">Órdenes de pago</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => handleSync('legal')}
                  disabled={isLoading}
                  className="h-auto py-4 flex-col"
                >
                  <Gavel className="h-6 w-6 mb-2" />
                  <span>Jurídico</span>
                  <span className="text-xs text-muted-foreground">Resoluciones</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => handleSync('contracting')}
                  disabled={isLoading}
                  className="h-auto py-4 flex-col"
                >
                  <Link2 className="h-6 w-6 mb-2" />
                  <span>Contratación</span>
                  <span className="text-xs text-muted-foreground">Licitaciones</span>
                </Button>
              </div>

              {syncResult && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Sincronización completada</AlertTitle>
                    <AlertDescription>
                      Módulo: {syncResult.sincronizacion.modulo} | 
                      Estado: {syncResult.sincronizacion.estado} |
                      Registros: {syncResult.sincronizacion.registrosAfectados}
                    </AlertDescription>
                  </Alert>

                  {syncResult.contabilidad && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm font-medium mb-2">Asientos Propuestos</p>
                      {syncResult.contabilidad.asientosPropuestos.map((asiento, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2 text-xs py-1 border-b last:border-0">
                          <span>{asiento.cuenta}</span>
                          <span className="text-right">{asiento.debe.toLocaleString()}€</span>
                          <span className="text-right">{asiento.haber.toLocaleString()}€</span>
                          <span className="truncate">{asiento.concepto}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {syncResult.tesoreria && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm font-medium mb-2">Orden de Pago</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Beneficiario:</span>
                          <span>{syncResult.tesoreria.ordenPago.beneficiario}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Importe:</span>
                          <span className="font-bold">{syncResult.tesoreria.ordenPago.importe.toLocaleString()}€</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* RECOMENDACIONES TAB */}
          <TabsContent value="recomendaciones" className="mt-0">
            <div className="space-y-4">
              <Button 
                onClick={handleRecommendations} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Obtener Recomendaciones
              </Button>

              {recommendations && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {/* Recommendations */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recomendaciones del Sistema</p>
                      {recommendations.recomendaciones.map((rec, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-accent" />
                              <span className="font-medium text-sm">{rec.titulo}</span>
                            </div>
                            <Badge variant={getPriorityColor(rec.prioridad) as any}>
                              {rec.prioridad}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{rec.descripcion}</p>
                          {rec.fundamentoLegal && (
                            <p className="text-xs text-primary mt-1">📜 {rec.fundamentoLegal}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{rec.plazoSugerido}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Next Steps */}
                    {recommendations.proximosPasos.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Próximos Pasos</p>
                        {recommendations.proximosPasos.map((paso, idx) => (
                          <div key={idx} className="flex items-center gap-3 py-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {paso.orden}
                            </div>
                            <div>
                              <p className="text-sm">{paso.accion}</p>
                              <p className="text-xs text-muted-foreground">
                                {paso.responsable} • {paso.plazo}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Proactive Alerts */}
                    {recommendations.alertasProactivas.map((alerta, idx) => (
                      <Alert key={idx} variant={alerta.tipo === 'PLAZO' ? 'destructive' : 'default'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{alerta.tipo}</AlertTitle>
                        <AlertDescription>
                          {alerta.mensaje}
                          {alerta.fechaLimite && (
                            <span className="block text-xs mt-1">
                              Fecha límite: {new Date(alerta.fechaLimite).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}

                    {/* Similar Cases */}
                    {recommendations.expedientesSimilares.length > 0 && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Expedientes Similares</p>
                        {recommendations.expedientesSimilares.map((exp, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <span className="text-sm font-medium">{exp.id}</span>
                              <p className="text-xs text-muted-foreground">{exp.aprendizaje}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{exp.similitud}%</Badge>
                              <p className="text-xs">{exp.decision}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaDecisionSupportPanel;
