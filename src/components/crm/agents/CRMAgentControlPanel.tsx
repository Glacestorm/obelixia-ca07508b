/**
 * CRMAgentControlPanel - Panel de control del sistema de agentes CRM
 * Fase 8: Sistema de Agentes Autónomos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  RefreshCw, 
  Sparkles, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  Settings,
  Brain,
  Zap,
  Target,
  TrendingUp,
  Users,
  GitBranch,
  BarChart3,
  Bot,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useCRMModuleAgents, CRM_AGENT_CONFIG } from '@/hooks/crm/agents';
import type { CRMModuleAgent, CRMAgentInsight, CRMModuleType } from '@/hooks/crm/agents';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Iconos por tipo de agente
const AGENT_ICONS: Record<CRMModuleType, React.ReactNode> = {
  lead_scoring: <Target className="h-4 w-4" />,
  pipeline_optimizer: <GitBranch className="h-4 w-4" />,
  customer_success: <Users className="h-4 w-4" />,
  churn_predictor: <AlertTriangle className="h-4 w-4" />,
  upsell_detector: <TrendingUp className="h-4 w-4" />,
  engagement_analyzer: <MessageSquare className="h-4 w-4" />,
  deal_accelerator: <Zap className="h-4 w-4" />,
  contact_enrichment: <Users className="h-4 w-4" />,
  activity_optimizer: <Activity className="h-4 w-4" />,
  forecast_analyst: <BarChart3 className="h-4 w-4" />
};

// Colores de estado
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-gray-400',
  analyzing: 'bg-blue-500 animate-pulse',
  error: 'bg-red-500',
  paused: 'bg-yellow-500'
};

interface CRMAgentControlPanelProps {
  className?: string;
}

export function CRMAgentControlPanel({ className }: CRMAgentControlPanelProps) {
  const {
    agents,
    supervisorStatus,
    insights,
    isLoading,
    initializeAgents,
    executeAgent,
    supervisorOrchestrate,
    configureAgent,
    toggleAgent,
    toggleAutonomousMode
  } = useCRMModuleAgents();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAgent, setSelectedAgent] = useState<CRMModuleAgent | null>(null);
  const [autonomousInterval, setAutonomousInterval] = useState(60);

  // Inicializar agentes al montar
  useEffect(() => {
    if (agents.length === 0) {
      initializeAgents();
    }
  }, [agents.length, initializeAgents]);

  // Ejecutar ciclo del supervisor
  const handleRunCycle = async () => {
    await supervisorOrchestrate('Análisis completo del pipeline CRM', 'high');
  };

  // Toggle modo autónomo
  const handleToggleAutonomous = (enabled: boolean) => {
    toggleAutonomousMode(enabled, autonomousInterval * 1000);
  };

  // Ejecutar agente individual
  const handleExecuteAgent = async (agentId: string) => {
    await executeAgent(agentId, { source: 'manual' });
  };

  // Renderizar tarjeta de agente
  const renderAgentCard = (agent: CRMModuleAgent) => {
    const config = CRM_AGENT_CONFIG[agent.type];
    const icon = AGENT_ICONS[agent.type];

    return (
      <Card 
        key={agent.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedAgent?.id === agent.id && "ring-2 ring-primary"
        )}
        onClick={() => setSelectedAgent(agent)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br",
                config.color
              )}>
                {icon}
              </div>
              <div>
                <h4 className="font-medium text-sm">{config.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Prioridad: {agent.priority}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                STATUS_COLORS[agent.status]
              )} />
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                {agent.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Health Score</span>
              <span className="font-medium">{agent.healthScore}%</span>
            </div>
            <Progress value={agent.healthScore} className="h-1.5" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground">Acciones</span>
              <p className="font-semibold">{agent.metrics.actionsGenerated || 0}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground">Éxito</span>
              <p className="font-semibold">{agent.metrics.successRate || 0}%</p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8"
              onClick={(e) => {
                e.stopPropagation();
                handleExecuteAgent(agent.id);
              }}
              disabled={isLoading || agent.status === 'paused'}
            >
              <Play className="h-3 w-3 mr-1" />
              Ejecutar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleAgent(agent.id, agent.status === 'paused');
              }}
            >
              {agent.status === 'paused' ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizar insight
  const renderInsight = (insight: CRMAgentInsight) => {
    const priorityColors = {
      low: 'border-l-gray-400',
      medium: 'border-l-yellow-500',
      high: 'border-l-orange-500',
      critical: 'border-l-red-500'
    };

    return (
      <div 
        key={insight.id}
        className={cn(
          "p-3 rounded-lg border-l-4 bg-card",
          priorityColors[insight.priority]
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {insight.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {insight.confidence}% confianza
              </span>
            </div>
            <h5 className="font-medium text-sm">{insight.title}</h5>
            <p className="text-xs text-muted-foreground mt-1">
              {insight.description}
            </p>
          </div>
        </div>

        {insight.suggestedAction && (
          <div className="mt-2 p-2 bg-primary/5 rounded text-xs">
            <span className="font-medium">Acción sugerida:</span> {insight.suggestedAction}
          </div>
        )}

        {insight.estimatedImpact?.revenue && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>Impacto estimado: €{insight.estimatedImpact.revenue.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Sistema de Agentes CRM
                {supervisorStatus?.autonomousMode && (
                  <Badge variant="default" className="bg-green-500 animate-pulse">
                    Autónomo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {agents.length} agentes • {insights.length} insights activos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRunCycle}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Ejecutar Ciclo
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Config
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Métricas del Supervisor */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Sistema Health</div>
                <div className="text-2xl font-bold text-blue-600">
                  {supervisorStatus?.systemHealth || 0}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Precisión IA</div>
                <div className="text-2xl font-bold text-purple-600">
                  {supervisorStatus?.predictiveAccuracy || 0}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Insights</div>
                <div className="text-2xl font-bold text-green-600">
                  {supervisorStatus?.insightsGenerated || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Deals Acelerados</div>
                <div className="text-2xl font-bold text-amber-600">
                  {supervisorStatus?.pipelineHealth?.acceleratedDeals || 0}
                </div>
              </div>
            </div>

            {/* Estado de Agentes Rápido */}
            <div className="grid grid-cols-5 gap-2">
              {agents.slice(0, 5).map(agent => (
                <div 
                  key={agent.id}
                  className="bg-muted/50 rounded-lg p-2 text-center"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mx-auto mb-1",
                    STATUS_COLORS[agent.status]
                  )} />
                  <div className="text-xs font-medium truncate">
                    {CRM_AGENT_CONFIG[agent.type].name.replace('Agente ', '')}
                  </div>
                </div>
              ))}
            </div>

            {/* Insights Recientes */}
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Insights Recientes
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {insights.length > 0 ? (
                    insights.slice(0, 5).map(renderInsight)
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ejecuta un ciclo para generar insights</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 gap-3">
                {agents.map(renderAgentCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {insights.length > 0 ? (
                  insights.map(renderInsight)
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay insights generados</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={handleRunCycle}
                    >
                      Generar Insights
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4">
            {/* Modo Autónomo */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Modo Autónomo</h4>
                  <p className="text-xs text-muted-foreground">
                    Los agentes ejecutarán análisis automáticamente
                  </p>
                </div>
                <Switch
                  checked={supervisorStatus?.autonomousMode || false}
                  onCheckedChange={handleToggleAutonomous}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Intervalo: {autonomousInterval}s</span>
                  <span className="text-muted-foreground">15s - 300s</span>
                </div>
                <Slider
                  value={[autonomousInterval]}
                  onValueChange={(v) => setAutonomousInterval(v[0])}
                  min={15}
                  max={300}
                  step={15}
                  disabled={supervisorStatus?.autonomousMode}
                />
              </div>
            </div>

            {/* Configuración por Agente */}
            {selectedAgent && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  {AGENT_ICONS[selectedAgent.type]}
                  {CRM_AGENT_CONFIG[selectedAgent.type].name}
                </h4>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Umbral de Confianza</span>
                      <span>{selectedAgent.confidenceThreshold}%</span>
                    </div>
                    <Slider
                      value={[selectedAgent.confidenceThreshold]}
                      onValueChange={(v) => configureAgent(selectedAgent.id, { 
                        confidenceThreshold: v[0] 
                      })}
                      min={50}
                      max={95}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Prioridad</span>
                      <span>{selectedAgent.priority}</span>
                    </div>
                    <Slider
                      value={[selectedAgent.priority]}
                      onValueChange={(v) => configureAgent(selectedAgent.id, { 
                        priority: v[0] 
                      })}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExecuteAgent(selectedAgent.id)}
                      disabled={isLoading}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Ejecutar
                    </Button>
                    <Button 
                      variant={selectedAgent.status === 'paused' ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => toggleAgent(selectedAgent.id, selectedAgent.status === 'paused')}
                    >
                      {selectedAgent.status === 'paused' ? 'Activar' : 'Pausar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CRMAgentControlPanel;
