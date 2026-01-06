/**
 * ERPModuleAgentsPanel - Panel de gestión de agentes especializados por módulo ERP
 * Arquitectura: Supervisor → Dominios → Módulos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Brain, 
  Calculator,
  Users,
  Shield,
  Cog,
  UserCheck,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  Network,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Lightbulb
} from 'lucide-react';
import { useERPModuleAgents, type DomainAgent, type ModuleAgent, type AgentDomain, DOMAIN_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Iconos por dominio
const DOMAIN_ICONS: Record<AgentDomain, React.ElementType> = {
  financial: Calculator,
  crm_cs: Users,
  compliance: Shield,
  operations: Cog,
  hr: UserCheck,
  analytics: BarChart3
};

// Variantes de animación
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  hover: { scale: 1.02 }
};

export function ERPModuleAgentsPanel() {
  const [activeTab, setActiveTab] = useState<'supervisor' | 'domains' | 'insights'>('supervisor');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<ModuleAgent | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const {
    isLoading,
    domainAgents,
    supervisorStatus,
    insights,
    lastRefresh,
    initializeAgents,
    executeModuleAgent,
    coordinateDomain,
    supervisorOrchestrate,
    configureAgent,
    toggleAgent,
    toggleAutonomousMode,
    startAutoRefresh,
    stopAutoRefresh
  } = useERPModuleAgents();

  useEffect(() => {
    initializeAgents();
    // No usar startAutoRefresh en useEffect por dependencias inestables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'running': return 'bg-green-500';
      case 'analyzing': case 'coordinating': return 'bg-blue-500 animate-pulse';
      case 'idle': return 'bg-muted-foreground/50';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted-foreground/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'running': return 'Ejecutando';
      case 'analyzing': return 'Analizando';
      case 'coordinating': return 'Coordinando';
      case 'idle': return 'En espera';
      case 'paused': return 'Pausado';
      case 'error': return 'Error';
      default: return status;
    }
  };

  const totalAgents = domainAgents.reduce((sum, d) => sum + d.moduleAgents.length, 0);
  const activeAgents = domainAgents.reduce((sum, d) => 
    sum + d.moduleAgents.filter(a => a.status === 'active' || a.status === 'analyzing').length, 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Agentes ERP por Módulo
          </h2>
          <p className="text-sm text-muted-foreground">
            Arquitectura jerárquica: Supervisor → Dominios → Módulos especializados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={initializeAgents} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            size="sm" 
            onClick={() => supervisorOrchestrate('Optimización general del sistema', 'medium')}
            disabled={isLoading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Orquestar Todo
          </Button>
        </div>
      </div>

      {/* Supervisor Stats */}
      {supervisorStatus && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", supervisorStatus.status === 'running' ? 'bg-green-500/10' : 'bg-blue-500/10')}>
                  <Brain className={cn("h-5 w-5", supervisorStatus.status === 'running' ? 'text-green-500' : 'text-blue-500')} />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{getStatusLabel(supervisorStatus.status)}</p>
                  <p className="text-xs text-muted-foreground">Supervisor General</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Activity className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeAgents}/{totalAgents}</p>
                  <p className="text-xs text-muted-foreground">Agentes Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{supervisorStatus.systemHealth}%</p>
                  <p className="text-xs text-muted-foreground">Salud Sistema</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{supervisorStatus.resourceUtilization}%</p>
                  <p className="text-xs text-muted-foreground">Utilización</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{insights.length}</p>
                  <p className="text-xs text-muted-foreground">Insights Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="supervisor" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Supervisor
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Dominios
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Supervisor Tab */}
        <TabsContent value="supervisor" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Agente Supervisor General
                  </CardTitle>
                  <CardDescription>
                    Coordina todos los dominios, resuelve conflictos y optimiza el rendimiento global
                  </CardDescription>
                </div>
                {/* Selector de Modo Autónomo */}
                <div className="flex flex-col items-end gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">Modo Autónomo</p>
                      <p className="text-xs text-muted-foreground">
                        {supervisorStatus?.autonomousMode ? 'Activo' : 'Manual'}
                      </p>
                    </div>
                    <Switch
                      checked={supervisorStatus?.autonomousMode || false}
                      onCheckedChange={(checked) => toggleAutonomousMode(checked, 45000)}
                    />
                  </div>
                  {supervisorStatus?.autonomousMode && (
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Ejecutando cada 45s</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Capacidades del Supervisor */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Target, label: 'Distribución de tareas', active: true, action: 'distribute_tasks' },
                  { icon: Activity, label: 'Monitoreo en tiempo real', active: true, action: 'realtime_monitoring' },
                  { icon: TrendingUp, label: 'Análisis predictivo', active: true, action: 'predictive_analysis' },
                  { icon: Zap, label: 'Optimización de workflows', active: true, action: 'optimize_workflows' },
                  { icon: Brain, label: 'Aprendizaje entre módulos', active: true, action: 'cross_learning' },
                  { icon: Shield, label: 'Resolución de conflictos', active: true, action: 'resolve_conflicts' },
                  { icon: Eye, label: 'Escalado inteligente', active: true, action: 'smart_scaling' },
                  { icon: Sparkles, label: 'Auto-optimización', active: true, action: 'auto_optimize' }
                ].map((cap, idx) => (
                  <Button 
                    key={idx}
                    variant="outline"
                    className={cn(
                      "p-3 h-auto rounded-lg flex items-center gap-2 justify-start",
                      cap.active ? "bg-primary/5 border-primary/20 hover:bg-primary/10" : "bg-muted/50"
                    )}
                    onClick={async () => {
                      // Llevar al usuario a donde verá el resultado
                      setActiveTab('insights');
                      await supervisorOrchestrate(cap.action);
                    }}
                    disabled={isLoading}
                  >
                    <cap.icon className={cn("h-4 w-4", cap.active ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-xs font-medium">{cap.label}</span>
                  </Button>
                ))}
              </div>

              {/* Métricas del Supervisor */}
              {supervisorStatus && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Progreso de Aprendizaje</span>
                    <span className="text-sm font-medium">{supervisorStatus.learningProgress}%</span>
                  </div>
                  <Progress value={supervisorStatus.learningProgress} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{supervisorStatus.conflictsResolved}</p>
                      <p className="text-xs text-muted-foreground">Conflictos Resueltos</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{supervisorStatus.pendingDecisions}</p>
                      <p className="text-xs text-muted-foreground">Decisiones Pendientes</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dominios Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {domainAgents.map((domain) => {
              const DomainIcon = DOMAIN_ICONS[domain.domain];
              const config = DOMAIN_CONFIG[domain.domain];
              const activeCount = domain.moduleAgents.filter(a => a.status === 'active' || a.status === 'analyzing').length;

              return (
                <motion.div
                  key={domain.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                >
                  <Card className="h-full">
                    <CardHeader className={cn("pb-2 bg-gradient-to-r text-white rounded-t-lg", config.color)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-white/20">
                            <DomainIcon className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-base">{domain.name}</CardTitle>
                        </div>
                        <Badge className={cn("text-xs", getStatusColor(domain.status))}>
                          {getStatusLabel(domain.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Agentes activos</span>
                        <span className="font-medium">{activeCount}/{domain.moduleAgents.length}</span>
                      </div>
                      <Progress value={(activeCount / domain.moduleAgents.length) * 100} className="h-2 mb-3" />
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            coordinateDomain(domain.id, 'Coordinar módulos');
                          }}
                          disabled={isLoading || domain.status === 'coordinating'}
                        >
                          {domain.status === 'coordinating' ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          {domain.status === 'coordinating' ? 'Coordinando...' : 'Coordinar'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setExpandedDomains(prev => new Set([...prev, domain.id]));
                            setActiveTab('domains');
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Domains Tab - Detalle */}
        <TabsContent value="domains" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {domainAgents.map((domain) => {
                const DomainIcon = DOMAIN_ICONS[domain.domain];
                const config = DOMAIN_CONFIG[domain.domain];
                const isExpanded = expandedDomains.has(domain.id);

                return (
                  <Collapsible 
                    key={domain.id} 
                    open={isExpanded} 
                    onOpenChange={() => toggleDomain(domain.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          "bg-gradient-to-r",
                          config.color,
                          "text-white rounded-t-lg"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-white/20">
                                <DomainIcon className="h-6 w-6" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{domain.name}</CardTitle>
                                <CardDescription className="text-white/80">
                                  {domain.moduleAgents.length} agentes especializados
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", getStatusColor(domain.status))}>
                                {getStatusLabel(domain.status)}
                              </Badge>
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {domain.moduleAgents.map((agent) => (
                              <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                  "p-3 rounded-lg border transition-all",
                                  agent.status === 'active' ? "border-green-500/30 bg-green-500/5" :
                                  agent.status === 'analyzing' ? "border-blue-500/30 bg-blue-500/5" :
                                  agent.status === 'paused' ? "border-yellow-500/30 bg-yellow-500/5" :
                                  agent.status === 'error' ? "border-destructive/30 bg-destructive/5" :
                                  "border-border"
                                )}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full", getStatusColor(agent.status))} />
                                    <span className="font-medium text-sm">{agent.name}</span>
                                  </div>
                                  <Switch
                                    checked={agent.status !== 'paused'}
                                    onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                                    className="scale-75"
                                  />
                                </div>

                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {agent.description}
                                </p>

                                <div className="flex flex-wrap gap-1 mb-2">
                                  {agent.capabilities.slice(0, 2).map((cap, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px]">
                                      {cap.replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                  {agent.capabilities.length > 2 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      +{agent.capabilities.length - 2}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                  <span className="text-xs text-muted-foreground">
                                    P{agent.priority} • {agent.confidenceThreshold}%
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => executeModuleAgent(agent.id, {})}
                                      disabled={isLoading || agent.status === 'paused'}
                                    >
                                      <Play className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => {
                                        setSelectedAgent(agent);
                                        setShowConfigDialog(true);
                                      }}
                                    >
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Insights Predictivos del Supervisor
              </CardTitle>
              <CardDescription>
                Recomendaciones, predicciones y alertas generadas por el análisis continuo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay insights activos en este momento</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => supervisorOrchestrate('Generar insights predictivos')}
                  >
                    Generar Insights
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {insights.map((insight) => (
                      <div
                        key={insight.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          insight.priority === 'critical' ? "border-destructive bg-destructive/5" :
                          insight.priority === 'high' ? "border-orange-500 bg-orange-500/5" :
                          insight.priority === 'medium' ? "border-yellow-500 bg-yellow-500/5" :
                          "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                            {insight.type === 'optimization' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {insight.type === 'prediction' && <Eye className="h-4 w-4 text-blue-500" />}
                            {insight.type === 'recommendation' && <Lightbulb className="h-4 w-4 text-yellow-500" />}
                            <span className="font-medium">{insight.title}</span>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        {insight.suggestedAction && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Confianza: {insight.confidence}%
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isLoading}
                              onClick={async () => {
                                await supervisorOrchestrate(insight.suggestedAction!, insight.priority);
                              }}
                            >
                              {insight.suggestedAction}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar {selectedAgent?.name}</DialogTitle>
          </DialogHeader>

          {selectedAgent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Modo de ejecución</label>
                <div className="flex gap-2">
                  {['autonomous', 'supervised', 'manual'].map((mode) => (
                    <Button
                      key={mode}
                      variant={selectedAgent.executionMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        configureAgent(selectedAgent.id, { 
                          executionMode: mode as ModuleAgent['executionMode'] 
                        });
                        setSelectedAgent({ ...selectedAgent, executionMode: mode as ModuleAgent['executionMode'] });
                      }}
                    >
                      {mode === 'autonomous' ? 'Autónomo' : mode === 'supervised' ? 'Supervisado' : 'Manual'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Umbral de confianza: {selectedAgent.confidenceThreshold}%
                </label>
                <Slider
                  value={[selectedAgent.confidenceThreshold]}
                  onValueChange={([val]) => {
                    configureAgent(selectedAgent.id, { confidenceThreshold: val });
                    setSelectedAgent({ ...selectedAgent, confidenceThreshold: val });
                  }}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Prioridad: {selectedAgent.priority}
                </label>
                <Slider
                  value={[selectedAgent.priority]}
                  onValueChange={([val]) => {
                    configureAgent(selectedAgent.id, { priority: val });
                    setSelectedAgent({ ...selectedAgent, priority: val });
                  }}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Capacidades:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAgent.capabilities.map((cap, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {cap.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Last refresh */}
      {lastRefresh && (
        <p className="text-xs text-muted-foreground text-center">
          Última actualización: {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}
        </p>
      )}
    </div>
  );
}

export default ERPModuleAgentsPanel;
