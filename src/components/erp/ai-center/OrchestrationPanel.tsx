/**
 * OrchestrationPanel — Phase 6
 * Agent pipelines, dependency graph, and what-if simulation sandbox.
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Map as MapIcon,
  Play,
  RefreshCw,
  GitBranch,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FlaskConical,
  BarChart3,
  Network,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOrchestration, type Pipeline, type SimulationScenario } from '@/hooks/erp/ai-center/useOrchestration';
import type { AgentRegistryItem } from '@/hooks/erp/ai-center/useAICommandCenter';

interface OrchestrationPanelProps {
  agents: AgentRegistryItem[];
  loading: boolean;
}

// === Sub-components ===

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-none shadow-sm bg-muted/30">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          {sub && <p className="text-[9px] text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineCard({ pipeline, onSimulate }: { pipeline: Pipeline; onSimulate: (p: Pipeline) => void }) {
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    paused: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    draft: 'bg-muted text-muted-foreground border-muted',
  };

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-4 w-4 text-violet-500 shrink-0" />
              <h4 className="text-sm font-semibold truncate">{pipeline.name}</h4>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{pipeline.description}</p>
          </div>
          <Badge variant="outline" className={cn('text-[9px] shrink-0', statusColors[pipeline.status])}>
            {pipeline.status}
          </Badge>
        </div>

        {/* Steps visualization */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {pipeline.steps.map((step, i) => (
            <div key={step.agentCode} className="flex items-center gap-1 shrink-0">
              <div className="px-2 py-1 rounded-md bg-primary/10 text-[10px] font-medium text-primary border border-primary/20">
                {step.agentName.length > 12 ? step.agentName.substring(0, 12) + '…' : step.agentName}
              </div>
              {i < pipeline.steps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs font-bold">{pipeline.totalExecutions}</p>
            <p className="text-[9px] text-muted-foreground">Ejecuciones</p>
          </div>
          <div>
            <p className="text-xs font-bold">{pipeline.successRate}%</p>
            <p className="text-[9px] text-muted-foreground">Éxito</p>
          </div>
          <div>
            <p className="text-xs font-bold">{pipeline.avgDurationMs}ms</p>
            <p className="text-[9px] text-muted-foreground">Latencia</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground">
            {pipeline.lastRun
              ? `Última: ${formatDistanceToNow(new Date(pipeline.lastRun), { locale: es, addSuffix: true })}`
              : 'Sin ejecuciones'}
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onSimulate(pipeline)}>
            <FlaskConical className="h-3 w-3" />
            Simular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DependencyGraphView({ edges, agents }: {
  edges: Array<{ from: string; to: string; type: string }>;
  agents: AgentRegistryItem[];
}) {
  const agentMap = new Map(agents.map(a => [a.code, a]));
  const nodes = new Set<string>();
  edges.forEach(e => { nodes.add(e.from); nodes.add(e.to); });

  const typeColors: Record<string, string> = {
    sequential: 'border-primary/50 bg-primary/5',
    fallback: 'border-amber-500/50 bg-amber-500/5',
    escalation: 'border-red-500/50 bg-red-500/5',
  };

  if (edges.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <Network className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No hay dependencias entre agentes detectadas
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3 mb-3">
        {['sequential', 'fallback', 'escalation'].map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded border', typeColors[t])} />
            <span className="text-[10px] text-muted-foreground capitalize">{t === 'sequential' ? 'Secuencial' : t === 'fallback' ? 'Fallback' : 'Escalación'}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 max-h-[400px] overflow-auto">
        {edges.map((edge, i) => {
          const fromAgent = agentMap.get(edge.from);
          const toAgent = agentMap.get(edge.to);
          return (
            <div
              key={i}
              className={cn('flex items-center gap-2 p-2 rounded-lg border text-xs', typeColors[edge.type])}
            >
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {fromAgent?.name || edge.from}
              </Badge>
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {toAgent?.name || edge.to}
              </Badge>
              <span className="text-[9px] text-muted-foreground ml-auto capitalize">
                {edge.type === 'sequential' ? 'secuencial' : edge.type === 'fallback' ? 'fallback' : 'escalación'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimulationResultView({ scenario }: { scenario: SimulationScenario }) {
  const r = scenario.result;
  if (!r) return null;

  const statusIcon: Record<string, React.ReactNode> = {
    success: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
    failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    escalated: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    skipped: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-violet-500" />
          {scenario.name}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">{scenario.description}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary metrics */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <p className="text-sm font-bold text-emerald-600">{r.completedSteps}</p>
            <p className="text-[9px] text-muted-foreground">Éxito</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <p className="text-sm font-bold text-destructive">{r.failedSteps}</p>
            <p className="text-[9px] text-muted-foreground">Fallos</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10">
            <p className="text-sm font-bold text-amber-600">{r.escalations}</p>
            <p className="text-[9px] text-muted-foreground">Escalados</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <p className="text-sm font-bold text-primary">{r.totalDurationMs}ms</p>
            <p className="text-[9px] text-muted-foreground">Duración</p>
          </div>
        </div>

        {/* Step-by-step results */}
        <div className="space-y-1.5">
          {r.stepResults.map((step, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
              {statusIcon[step.status]}
              <span className="text-xs font-medium flex-1 truncate">{step.agentName}</span>
              <Badge variant="outline" className="text-[9px]">{step.confidence}%</Badge>
              <span className="text-[9px] text-muted-foreground">{step.durationMs}ms</span>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-xs leading-relaxed">{r.recommendation}</p>
        </div>

        <div className="text-right">
          <span className="text-[9px] text-muted-foreground">
            Coste estimado: €{r.costEstimate.toFixed(4)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// === MAIN PANEL ===

export function OrchestrationPanel({ agents, loading: agentsLoading }: OrchestrationPanelProps) {
  const {
    pipelines,
    simulations,
    dependencyGraph,
    orchestrationKPIs: kpis,
    loading,
    simulating,
    loadPipelines,
    runSimulation,
  } = useOrchestration(agents);

  const [activeTab, setActiveTab] = useState('pipelines');

  useEffect(() => {
    if (agents.length > 0) loadPipelines();
  }, [agents, loadPipelines]);

  const handleSimulate = useCallback(async (pipeline: Pipeline) => {
    await runSimulation(pipeline);
    setActiveTab('simulation');
  }, [runSimulation]);

  const isLoading = loading || agentsLoading;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <KPICard icon={GitBranch} label="Pipelines" value={kpis.total} color="bg-violet-600" />
        <KPICard icon={Zap} label="Activos" value={kpis.active} color="bg-emerald-600" />
        <KPICard icon={BarChart3} label="Éxito Promedio" value={`${kpis.avgSuccess}%`} color="bg-blue-600" />
        <KPICard icon={Play} label="Ejecuciones" value={kpis.totalExecs} color="bg-indigo-600" />
        <KPICard icon={Clock} label="Latencia Prom." value={`${kpis.avgLatency}ms`} color="bg-amber-600" />
        <KPICard icon={Network} label="Multi-Step" value={kpis.multiStepPipelines} color="bg-pink-600" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipelines" className="text-xs gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="graph" className="text-xs gap-1">
            <Network className="h-3.5 w-3.5" />
            Dependencias
          </TabsTrigger>
          <TabsTrigger value="simulation" className="text-xs gap-1">
            <FlaskConical className="h-3.5 w-3.5" />
            Simulación
            {simulations.length > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{simulations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pipelines tab */}
        <TabsContent value="pipelines" className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Pipelines de Agentes</h3>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={loadPipelines}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              Actualizar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pipelines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MapIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No hay pipelines detectados aún
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 md:grid-cols-2">
                {pipelines.map(p => (
                  <PipelineCard key={p.id} pipeline={p} onSimulate={handleSimulate} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Dependency graph tab */}
        <TabsContent value="graph" className="mt-3">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Grafo de Dependencias</h3>
            <p className="text-xs text-muted-foreground">Relaciones entre agentes detectadas en los pipelines</p>
          </div>
          <Card>
            <CardContent className="p-4">
              <DependencyGraphView edges={dependencyGraph} agents={agents} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulation tab */}
        <TabsContent value="simulation" className="mt-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sandbox de Simulación</h3>
              <p className="text-xs text-muted-foreground">Ejecuta simulaciones what-if sobre los pipelines</p>
            </div>
            {simulating && (
              <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-[10px] gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Simulando…
              </Badge>
            )}
          </div>

          {simulations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Sin simulaciones aún</p>
              <p className="text-xs mt-1">Haz clic en "Simular" en cualquier pipeline para comenzar</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {simulations.map(s => (
                  <SimulationResultView key={s.id} scenario={s} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OrchestrationPanel;
