/**
 * GaliaComplianceAuditor - Panel de auditoría de cumplimiento GALIA V4
 * Análisis punto por punto del documento de requisitos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Target,
  RefreshCw,
  Download,
  Globe,
  TrendingUp,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useGaliaComplianceAuditor } from '@/hooks/galia/useGaliaComplianceAuditor';
import { cn } from '@/lib/utils';

export function GaliaComplianceAuditor() {
  const [activeTab, setActiveTab] = useState('resumen');
  
  const {
    isLoading,
    report,
    requisitosBase,
    generateComplianceReport,
    getInternationalComparison,
    exportReport
  } = useGaliaComplianceAuditor();

  useEffect(() => {
    generateComplianceReport({ 
      incluir_evidencias: true, 
      analizar_gaps: true, 
      generar_recomendaciones: true 
    });
  }, []);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'implementado':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Implementado</Badge>;
      case 'parcial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Parcial</Badge>;
      case 'pendiente':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'planificado':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Target className="h-3 w-3 mr-1" />Planificado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'text-red-400';
      case 'alta': return 'text-orange-400';
      case 'media': return 'text-yellow-400';
      case 'baja': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Auditor de Cumplimiento GALIA V4
          </h2>
          <p className="text-muted-foreground">
            Análisis del estado de implementación respecto al documento de requisitos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => generateComplianceReport()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            variant="outline"
            onClick={() => exportReport('pdf')}
            disabled={!report}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{report.porcentaje_global}%</div>
                <div className="text-sm text-muted-foreground mt-1">Cumplimiento Global</div>
                <Progress value={report.porcentaje_global} className="mt-3 h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {report.categorias?.reduce((acc, cat) => acc + cat.requisitos_cumplidos, 0) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Implementados</div>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {report.categorias?.reduce((acc, cat) => 
                      acc + cat.requisitos.filter(r => r.estado === 'parcial').length, 0) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Parciales</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {report.categorias?.reduce((acc, cat) => 
                      acc + cat.requisitos.filter(r => r.estado === 'pendiente').length, 0) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Pendientes</div>
                </div>
                <Clock className="h-8 w-8 text-red-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="requisitos">Requisitos</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        </TabsList>

        {/* Tab Resumen */}
        <TabsContent value="resumen" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumen Ejecutivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {report?.resumen_ejecutivo || 'Generando resumen ejecutivo...'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Próximos Pasos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report?.proximos_pasos?.map((paso, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                      <span className="text-sm">{paso}</span>
                    </li>
                  )) || (
                    <li className="text-muted-foreground text-sm">Cargando próximos pasos...</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Progreso por categoría */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Progreso por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report?.categorias?.map((cat, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{cat.nombre}</span>
                        <span className="text-sm text-muted-foreground">
                          {cat.requisitos_cumplidos}/{cat.requisitos_totales} ({cat.porcentaje_total}%)
                        </span>
                      </div>
                      <Progress value={cat.porcentaje_total} className="h-2" />
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Analizando cumplimiento...' : 'No hay datos disponibles'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Requisitos */}
        <TabsContent value="requisitos" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px]">
                <Accordion type="single" collapsible className="space-y-2">
                  {report?.categorias?.flatMap(cat => cat.requisitos)?.map((req, idx) => (
                    <AccordionItem key={req.id || idx} value={req.id || `req-${idx}`} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 w-full">
                          <span className={cn("font-mono text-xs", getPrioridadColor(req.prioridad))}>
                            {req.actuacion}
                          </span>
                          <span className="flex-1 text-left text-sm">{req.descripcion}</span>
                          {getEstadoBadge(req.estado)}
                          <span className="text-sm font-medium">{req.porcentaje}%</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Evidencias */}
                          {req.evidencias?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-green-400 mb-2">✓ Evidencias</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {req.evidencias.map((ev, i) => (
                                  <li key={i}>• {ev}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Gaps */}
                          {req.gaps?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-yellow-400 mb-2">⚠ Gaps identificados</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {req.gaps.map((gap, i) => (
                                  <li key={i}>• {gap}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recomendaciones */}
                          {req.recomendaciones?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-blue-400 mb-2">💡 Recomendaciones</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {req.recomendaciones.map((rec, i) => (
                                  <li key={i}>• {rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <Progress value={req.porcentaje} className="h-1 mt-2" />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )) || requisitosBase.map((req, idx) => (
                    <AccordionItem key={req.id} value={req.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 w-full">
                          <span className={cn("font-mono text-xs", getPrioridadColor(req.prioridad))}>
                            {req.actuacion}
                          </span>
                          <span className="flex-1 text-left text-sm">{req.descripcion}</span>
                          <Badge variant="outline">Pendiente análisis</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          Categoría: {req.categoria} | Prioridad: {req.prioridad}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Comparativa */}
        <TabsContent value="comparativa" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Estonia */}
            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  Estonia (e-Governance)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-blue-400">85%</div>
                  <Progress value={85} className="mt-2 h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-green-400">✓ Identidad digital universal (X-Road)</p>
                  <p className="text-green-400">✓ e-Residency para empresas</p>
                  <p className="text-green-400">✓ Interoperabilidad total</p>
                  <p className="text-muted-foreground">− Escala pequeña (1.3M hab)</p>
                </div>
              </CardContent>
            </Card>

            {/* Dinamarca */}
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-red-400" />
                  Dinamarca (Digital First)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-red-400">82%</div>
                  <Progress value={82} className="mt-2 h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-green-400">✓ Obligatoriedad digital</p>
                  <p className="text-green-400">✓ MitID unificado</p>
                  <p className="text-green-400">✓ Datos abiertos avanzados</p>
                  <p className="text-muted-foreground">− Brecha digital rural</p>
                </div>
              </CardContent>
            </Card>

            {/* GALIA */}
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  GALIA (España)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary">
                    {report?.comparativa_internacional?.galia || 78}%
                  </div>
                  <Progress value={report?.comparativa_internacional?.galia || 78} className="mt-2 h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-green-400">✓ IA avanzada (Gemini 2.5)</p>
                  <p className="text-green-400">✓ Transparencia Ley 19/2013</p>
                  <p className="text-green-400">✓ Multi-tenant escalable</p>
                  <p className="text-yellow-400">◐ Integración Cl@ve en progreso</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Roadmap */}
        <TabsContent value="roadmap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Roadmap de Implementación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-6 pl-10">
                  {[
                    { fase: 'Fase 0', titulo: 'Corrección Error Memoria', estado: 'completado', prioridad: 'CRÍTICA' },
                    { fase: 'Fase 1', titulo: 'Knowledge Base RAG', estado: 'completado', prioridad: 'ALTA' },
                    { fase: 'Fase 2', titulo: 'EU Funding Monitor', estado: 'completado', prioridad: 'ALTA' },
                    { fase: 'Fase 3', titulo: 'Portal Ciudadano Avanzado', estado: 'completado', prioridad: 'ALTA' },
                    { fase: 'Fase 4', titulo: 'Knowledge Graph', estado: 'completado', prioridad: 'MEDIA' },
                    { fase: 'Fase 5', titulo: 'API Pública + Transparencia', estado: 'completado', prioridad: 'MEDIA' },
                    { fase: 'Fase 6', titulo: 'Decision Support System', estado: 'completado', prioridad: 'MEDIA' },
                    { fase: 'Fase 7', titulo: 'Export/Print Universal', estado: 'completado', prioridad: 'MEDIA' },
                    { fase: 'Fase 8', titulo: 'Compliance Auditor', estado: 'en_progreso', prioridad: 'MEDIA' },
                    { fase: 'Fase 9', titulo: 'IA Híbrida Extrema', estado: 'pendiente', prioridad: 'BAJA' },
                    { fase: 'Fase 10', titulo: 'Federación Nacional', estado: 'pendiente', prioridad: 'BAJA' },
                  ].map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={cn(
                        "absolute -left-10 w-4 h-4 rounded-full border-2",
                        item.estado === 'completado' ? 'bg-green-500 border-green-500' :
                        item.estado === 'en_progreso' ? 'bg-yellow-500 border-yellow-500 animate-pulse' :
                        'bg-muted border-muted-foreground'
                      )} />
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="font-mono">{item.fase}</Badge>
                        <span className="font-medium">{item.titulo}</span>
                        <Badge className={cn(
                          item.prioridad === 'CRÍTICA' ? 'bg-red-500/20 text-red-400' :
                          item.prioridad === 'ALTA' ? 'bg-orange-500/20 text-orange-400' :
                          item.prioridad === 'MEDIA' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        )}>
                          {item.prioridad}
                        </Badge>
                        {item.estado === 'completado' && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaComplianceAuditor;
