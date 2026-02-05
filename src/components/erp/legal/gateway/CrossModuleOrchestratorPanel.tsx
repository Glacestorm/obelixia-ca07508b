/**
 * CrossModuleOrchestratorPanel - Fase 10
 * Panel para orquestación IA entre módulos ERP
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  Share2,
  Zap,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Users,
  ArrowRight,
  Layers,
  Network,
  Target,
  TrendingUp,
  Clock,
  Play
} from 'lucide-react';
import { useCrossModuleOrchestrator } from '@/hooks/admin/legal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CrossModuleOrchestratorPanelProps {
  entityId?: string;
  entityType?: string;
  className?: string;
}

export function CrossModuleOrchestratorPanel({
  entityId,
  entityType,
  className
}: CrossModuleOrchestratorPanelProps) {
  const [activeTab, setActiveTab] = useState('orchestration');

  const {
    isLoading,
    currentOrchestration,
    sharedContext,
    agentCoordination,
    conflicts,
    lastRefresh,
    fetchSharedContext,
    orchestrateOperation
  } = useCrossModuleOrchestrator();

  useEffect(() => {
    if (entityId && entityType) {
      fetchSharedContext(entityId, entityType);
    }
  }, [entityId, entityType, fetchSharedContext]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'requires_intervention': return 'text-orange-600 bg-orange-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'hr': return <Users className="h-4 w-4" />;
      case 'legal': return <GitBranch className="h-4 w-4" />;
      case 'fiscal': return <TrendingUp className="h-4 w-4" />;
      case 'purchases': return <Target className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-accent/10 via-primary/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent to-primary">
              <Network className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Orquestador Cross-Module</CardTitle>
              <CardDescription>
                Coordinación IA entre RRHH, Legal, Fiscal y Compras
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="orchestration" className="text-xs">Orquestación</TabsTrigger>
            <TabsTrigger value="context" className="text-xs">Contexto</TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">Agentes</TabsTrigger>
            <TabsTrigger value="conflicts" className="text-xs">
              Conflictos
              {conflicts.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs px-1">
                  {conflicts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orchestration" className="space-y-4">
            {currentOrchestration ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{currentOrchestration.operation}</h4>
                      <p className="text-sm text-muted-foreground">
                        ID: {currentOrchestration.id.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge className={getStatusColor(currentOrchestration.status)}>
                      {currentOrchestration.status}
                    </Badge>
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {currentOrchestration.workflow.steps.map((step, idx) => (
                        <div key={step.stepId} className="relative pl-10">
                          <div className={cn(
                            "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
                            step.status === 'completed' ? "bg-green-500" :
                            step.status === 'executing' ? "bg-blue-500 animate-pulse" :
                            step.status === 'failed' ? "bg-red-500" : "bg-muted"
                          )}>
                            {step.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-white" />}
                            {step.status === 'executing' && <Play className="h-3 w-3 text-white" />}
                            {step.status === 'failed' && <AlertCircle className="h-3 w-3 text-white" />}
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{step.agent}</Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{step.action}</span>
                            </div>
                            {step.executedAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(step.executedAt), { locale: es, addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {currentOrchestration.recommendations.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Recomendaciones
                    </h4>
                    <ul className="space-y-2">
                      {currentOrchestration.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay orquestación activa</p>
                <p className="text-sm">Selecciona una entidad para iniciar</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            {sharedContext ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(sharedContext.modules || {}).map(([module, data]) => (
                    <Card key={module} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {getModuleIcon(module)}
                        <span className="font-medium capitalize">{module}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(data as any).hasData ? (
                          <span className="text-green-600">✓ Datos disponibles</span>
                        ) : (
                          <span>Sin datos</span>
                        )}
                      </div>
                      {(data as any).lastUpdate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date((data as any).lastUpdate), { locale: es, addSuffix: true })}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {sharedContext.crossReferences && sharedContext.crossReferences.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-primary" />
                      Referencias Cruzadas
                    </h4>
                    <div className="space-y-2">
                      {sharedContext.crossReferences.map((ref, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                          <Badge variant="outline">{ref.fromModule}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline">{ref.toModule}</Badge>
                          <span className="text-muted-foreground">({ref.relationship})</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {sharedContext.pendingSync && sharedContext.pendingSync.length > 0 && (
                  <Card className="p-4 border-yellow-200 bg-yellow-50/50">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-yellow-700">
                      <Clock className="h-4 w-4" />
                      Sincronización Pendiente
                    </h4>
                    <div className="space-y-2">
                      {sharedContext.pendingSync.map((sync, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white text-sm">
                          <div>
                            <Badge variant="outline" className="mr-2">{sync.module}</Badge>
                            <span>{sync.field}</span>
                          </div>
                          <Button size="sm" variant="outline">Sincronizar</Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sin contexto compartido</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            {agentCoordination ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {agentCoordination.agents.map((agent) => (
                    <Card key={agent.agentId} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{agent.agentType}</span>
                        <Badge className={cn(
                          agent.status === 'completed' ? "bg-green-100 text-green-700" :
                          agent.status === 'processing' ? "bg-blue-100 text-blue-700 animate-pulse" :
                          agent.status === 'error' ? "bg-red-100 text-red-700" :
                          "bg-muted"
                        )}>
                          {agent.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{agent.assignedTask}</p>
                    </Card>
                  ))}
                </div>

                <Card className="p-4">
                  <h4 className="font-medium mb-3">Métricas de Rendimiento</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {agentCoordination.performance.totalDuration}ms
                      </div>
                      <div className="text-xs text-muted-foreground">Duración total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {agentCoordination.agents.filter(a => a.status === 'completed').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Completados</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {agentCoordination.performance.bottlenecks?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Cuellos de botella</div>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sin coordinación de agentes activa</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="conflicts">
            <ScrollArea className="h-[400px]">
              {conflicts.length > 0 ? (
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <Card key={conflict.id} className="p-4 border-orange-200 bg-orange-50/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                          <span className="font-medium">{conflict.conflictType}</span>
                        </div>
                        <Badge variant={conflict.status === 'open' ? 'destructive' : 'outline'}>
                          {conflict.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{conflict.description}</p>
                      <div className="flex items-center gap-2">
                        {conflict.agents.map((agent, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{agent}</Badge>
                        ))}
                      </div>
                      {conflict.status === 'open' && (
                        <div className="mt-3 flex justify-end">
                          <Button size="sm">Resolver</Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>Sin conflictos pendientes</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CrossModuleOrchestratorPanel;