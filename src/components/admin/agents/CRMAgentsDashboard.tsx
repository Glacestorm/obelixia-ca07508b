/**
 * CRMAgentsDashboard - Dashboard ultra-avanzado de agentes CRM
 * Tendencias 2025-2027: Agentic AI, Multi-agent orchestration, Interactive AI
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Brain, Network, RefreshCw, Play, Pause, Settings, Activity,
  AlertTriangle, CheckCircle, Clock, Zap, ChevronDown, ChevronRight,
  Sparkles, Target, TrendingUp, Eye, Lightbulb, MessageSquare, Send,
  Users, Building, Heart, Headphones, BarChart3, Megaphone, FileText,
  FileSignature, Workflow, UserPlus, Cpu, ArrowUpRight, ArrowDownRight,
  Shield, DollarSign, Timer, Maximize2, Minimize2, Plus, X, Gauge, 
  RefreshCcw, Calculator, Layers, Route, Undo2, ShieldCheck, MessageCircle
} from 'lucide-react';
import { useCRMAgents, type CRMModuleAgent, type SupervisorGeneralConfig, CRM_MODULE_CONFIG } from '@/hooks/admin/agents/useCRMAgents';
import type { CRMModuleType, AgentConversation } from '@/hooks/admin/agents/crmAgentTypes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// === ICONOS POR MÓDULO ===
const MODULE_ICONS: Record<CRMModuleType, React.ElementType> = {
  // Core CRM Modules
  leads: UserPlus,
  opportunities: Target,
  accounts: Building,
  contacts: Users,
  campaigns: Megaphone,
  pipeline: Workflow,
  quotes: FileText,
  contracts: FileSignature,
  customer_success: Heart,
  support: Headphones,
  analytics: BarChart3,
  automation: Zap,
  // Extended Modules
  customer_360: Eye,
  retention: ShieldCheck,
  cs_metrics: Activity,
  customer_journey: Route,
  omnichannel: MessageCircle,
  sentiment: Heart,
  sla: Timer,
  winback: Undo2,
  health_score: Gauge,
  renewals: RefreshCcw,
  rfm: Calculator,
  segmentation: Layers,
};

// === ANIMACIONES ===
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } }
};

const messageVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export function CRMAgentsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'supervisor' | 'insights' | 'chat'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<CRMModuleAgent | null>(null);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [supervisorInput, setSupervisorInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const {
    isLoading,
    agents,
    supervisor,
    dashboardStats,
    lastRefresh,
    initializeAgents,
    sendInstructionToAgent,
    sendInstructionToSupervisor,
    executeAgent,
    configureAgent,
    toggleAgent,
    toggleAutonomousMode,
    startAutoRefresh,
    stopAutoRefresh
  } = useCRMAgents();

  // Inicialización única
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    startAutoRefresh(90000);
    return () => stopAutoRefresh();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedAgent?.conversationHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'running': return 'bg-green-500';
      case 'processing': case 'coordinating': case 'analyzing': return 'bg-blue-500 animate-pulse';
      case 'idle': return 'bg-muted-foreground/50';
      case 'paused': return 'bg-yellow-500';
      case 'learning': return 'bg-purple-500';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted-foreground/50';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activo', running: 'Ejecutando', processing: 'Procesando',
      coordinating: 'Coordinando', analyzing: 'Analizando', idle: 'En espera',
      paused: 'Pausado', learning: 'Aprendiendo', error: 'Error'
    };
    return labels[status] || status;
  };

  const handleSendToAgent = useCallback(async () => {
    if (!selectedAgent || !chatInput.trim()) return;
    
    await sendInstructionToAgent({
      agentId: selectedAgent.id,
      instruction: chatInput,
      expectResponse: true,
    });
    setChatInput('');
  }, [selectedAgent, chatInput, sendInstructionToAgent]);

  const handleSendToSupervisor = useCallback(async () => {
    if (!supervisorInput.trim()) return;
    await sendInstructionToSupervisor(supervisorInput);
    setSupervisorInput('');
  }, [supervisorInput, sendInstructionToSupervisor]);

  const toggleExpandAgent = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300",
      isExpanded && "fixed inset-4 z-50 bg-background rounded-xl shadow-2xl overflow-auto p-6"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Dashboard Agentes CRM
            <Badge variant="secondary" className="ml-2">v2.0 - 2025</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Agentes ultra-especializados con orquestación multi-agente y supervisor general
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={initializeAgents} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            size="sm" 
            onClick={() => sendInstructionToSupervisor('coordinate_all_agents')}
            disabled={isLoading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Coordinar Todo
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.activeAgents}/{dashboardStats.totalAgents}</p>
                  <p className="text-xs text-muted-foreground">Agentes Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.avgHealthScore.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Salud Media</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalTasksToday}</p>
                  <p className="text-xs text-muted-foreground">Tareas Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Cpu className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalDecisionsAutonomous}</p>
                  <p className="text-xs text-muted-foreground">Decisiones IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">€{(dashboardStats.totalRevenueImpacted / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">Impacto Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Timer className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalTimeSaved.toFixed(0)}h</p>
                  <p className="text-xs text-muted-foreground">Tiempo Ahorrado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Vista General
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="supervisor" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Supervisor
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Interacción
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agents.map((agent) => {
              const config = CRM_MODULE_CONFIG[agent.moduleType];
              const Icon = MODULE_ICONS[agent.moduleType];
              
              return (
                <motion.div
                  key={agent.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                >
                  <Card 
                    className="cursor-pointer transition-shadow hover:shadow-lg"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setActiveTab('chat');
                    }}
                  >
                    <CardHeader className={cn("pb-2 text-white rounded-t-lg bg-gradient-to-r", config.color)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-white/20">
                            <Icon className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-sm">{agent.name}</CardTitle>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor(agent.status))} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Health</span>
                        <span className="font-medium">{agent.healthScore.toFixed(0)}%</span>
                      </div>
                      <Progress value={agent.healthScore} className="h-1.5" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tareas</span>
                        <span className="font-medium">{agent.metrics.tasksCompleted}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(agent.lastActivity), { locale: es, addSuffix: true })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {agents.map((agent) => {
                const config = CRM_MODULE_CONFIG[agent.moduleType];
                const Icon = MODULE_ICONS[agent.moduleType];
                const isExpanded = expandedAgents.has(agent.id);

                return (
                  <Collapsible key={agent.id} open={isExpanded} onOpenChange={() => toggleExpandAgent(agent.id)}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg bg-gradient-to-r text-white", config.color)}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  {agent.name}
                                  <Badge variant="outline" className="text-xs">
                                    {getStatusLabel(agent.status)}
                                  </Badge>
                                </CardTitle>
                                <CardDescription className="text-xs">{agent.description}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right text-sm">
                                <p className="font-medium">{agent.healthScore.toFixed(0)}%</p>
                                <p className="text-xs text-muted-foreground">Health</p>
                              </div>
                              <div className="text-right text-sm">
                                <p className="font-medium">{agent.metrics.successRate.toFixed(0)}%</p>
                                <p className="text-xs text-muted-foreground">Éxito</p>
                              </div>
                              <Switch
                                checked={agent.status !== 'paused'}
                                onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                              />
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4 border-t pt-4">
                          {/* Métricas detalladas */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-2xl font-bold">{agent.metrics.tasksCompleted}</p>
                              <p className="text-xs text-muted-foreground">Tareas Completadas</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-2xl font-bold">{agent.metrics.autonomousDecisions}</p>
                              <p className="text-xs text-muted-foreground">Decisiones Autónomas</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-2xl font-bold">€{(agent.metrics.revenueImpacted / 1000).toFixed(1)}k</p>
                              <p className="text-xs text-muted-foreground">Revenue Impactado</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-2xl font-bold">{agent.metrics.timesSaved.toFixed(1)}h</p>
                              <p className="text-xs text-muted-foreground">Tiempo Ahorrado</p>
                            </div>
                          </div>

                          {/* Capacidades */}
                          <div>
                            <p className="text-sm font-medium mb-2">Capacidades</p>
                            <div className="flex flex-wrap gap-2">
                              {agent.capabilities.map((cap) => (
                                <Badge key={cap.id} variant={cap.isAutonomous ? "default" : "secondary"} className="text-xs">
                                  {cap.name}
                                  {cap.isAutonomous && <Zap className="h-3 w-3 ml-1" />}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Configuración */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Umbral Confianza</p>
                              <div className="flex items-center gap-2">
                                <Slider
                                  value={[agent.confidenceThreshold]}
                                  min={50}
                                  max={100}
                                  step={5}
                                  onValueChange={([v]) => configureAgent(agent.id, { confidenceThreshold: v })}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-10">{agent.confidenceThreshold}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Modo Ejecución</p>
                              <Select
                                value={agent.executionMode}
                                onValueChange={(v) => configureAgent(agent.id, { executionMode: v as CRMModuleAgent['executionMode'] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="autonomous">Autónomo</SelectItem>
                                  <SelectItem value="supervised">Supervisado</SelectItem>
                                  <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Prioridad</p>
                              <Select
                                value={String(agent.priority)}
                                onValueChange={(v) => configureAgent(agent.id, { priority: Number(v) as CRMModuleAgent['priority'] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Crítica</SelectItem>
                                  <SelectItem value="2">Alta</SelectItem>
                                  <SelectItem value="3">Media</SelectItem>
                                  <SelectItem value="4">Baja</SelectItem>
                                  <SelectItem value="5">Mínima</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Acciones rápidas */}
                          <div className="flex gap-2 pt-2">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedAgent(agent);
                                setActiveTab('chat');
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Interactuar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => executeAgent(agent.id, 'analyze', {})}
                              disabled={isLoading}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Analizar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => executeAgent(agent.id, 'learn', {})}
                              disabled={isLoading}
                            >
                              <Sparkles className="h-4 w-4 mr-1" />
                              Aprender
                            </Button>
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

        {/* Supervisor Tab */}
        <TabsContent value="supervisor" className="space-y-4">
          {supervisor && (
            <>
              <Card>
                <CardHeader className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-white/20">
                        <Brain className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{supervisor.name}</CardTitle>
                        <CardDescription className="text-white/80">
                          Coordinador central de todos los agentes CRM y ERP
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">Modo Autónomo</p>
                        <p className="text-xs text-white/70">
                          {supervisor.autonomousMode ? 'Activo' : 'Manual'}
                        </p>
                      </div>
                      <Switch
                        checked={supervisor.autonomousMode}
                        onCheckedChange={(checked) => toggleAutonomousMode(checked, 60000)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Métricas del Supervisor */}
                  <div className="grid grid-cols-5 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                      <p className="text-3xl font-bold">{supervisor.totalAgentsManaged}</p>
                      <p className="text-xs text-muted-foreground">Agentes Gestionados</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <p className="text-3xl font-bold">{supervisor.systemHealth.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Salud del Sistema</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                      <p className="text-3xl font-bold">{supervisor.resourceUtilization.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Utilización</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <p className="text-3xl font-bold">{supervisor.decisionsToday}</p>
                      <p className="text-xs text-muted-foreground">Decisiones Hoy</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20">
                      <p className="text-3xl font-bold">{supervisor.conflictsResolved}</p>
                      <p className="text-xs text-muted-foreground">Conflictos Resueltos</p>
                    </div>
                  </div>

                  {/* Progreso de Aprendizaje */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progreso de Aprendizaje Cross-Agente</span>
                      <span className="text-sm">{supervisor.learningProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={supervisor.learningProgress} className="h-2" />
                  </div>

                  {/* Instrucción al Supervisor */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Enviar Instrucción al Supervisor</p>
                    <div className="flex gap-2">
                      <Textarea
                        value={supervisorInput}
                        onChange={(e) => setSupervisorInput(e.target.value)}
                        placeholder="Escribe una instrucción para el supervisor general..."
                        className="flex-1 min-h-[60px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendToSupervisor();
                          }
                        }}
                      />
                      <Button onClick={handleSendToSupervisor} disabled={isLoading || !supervisorInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="grid grid-cols-4 gap-2 border-t pt-4">
                    {[
                      { label: 'Coordinar Todos', action: 'coordinate_all_agents', icon: Network },
                      { label: 'Optimizar Pipeline', action: 'optimize_pipeline', icon: TrendingUp },
                      { label: 'Detectar Oportunidades', action: 'detect_revenue_opportunities', icon: DollarSign },
                      { label: 'Prevenir Churn', action: 'prevent_churn_risks', icon: Shield },
                      { label: 'Balancear Carga', action: 'balance_workload', icon: Activity },
                      { label: 'Aprendizaje Cruzado', action: 'cross_module_learning', icon: Sparkles },
                      { label: 'Generar Insights', action: 'generate_insights', icon: Lightbulb },
                      { label: 'Resolver Conflictos', action: 'resolve_conflicts', icon: CheckCircle },
                    ].map(({ label, action, icon: Icon }) => (
                      <Button
                        key={action}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => sendInstructionToSupervisor(action)}
                        disabled={isLoading}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Insights Predictivos
              </CardTitle>
              <CardDescription>
                Predicciones y recomendaciones generadas por el supervisor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supervisor?.predictiveInsights && supervisor.predictiveInsights.length > 0 ? (
                <div className="space-y-3">
                  {supervisor.predictiveInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={cn(
                        "p-4 rounded-lg border",
                        insight.priority === 'critical' && "border-destructive bg-destructive/5",
                        insight.priority === 'high' && "border-orange-500 bg-orange-500/5",
                        insight.priority === 'medium' && "border-yellow-500 bg-yellow-500/5",
                        insight.priority === 'low' && "border-muted"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            insight.type === 'opportunity' ? 'default' :
                            insight.type === 'risk' ? 'destructive' :
                            insight.type === 'optimization' ? 'secondary' : 'outline'
                          }>
                            {insight.type}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {insight.priority}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {insight.probability}% probabilidad
                        </span>
                      </div>
                      <h4 className="font-medium mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      {insight.recommendedAction && (
                        <div className="flex items-center gap-2 text-sm">
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                          <span>{insight.recommendedAction}</span>
                        </div>
                      )}
                      {insight.estimatedImpact > 0 && (
                        <p className="text-sm font-medium mt-2 text-emerald-600">
                          Impacto estimado: €{insight.estimatedImpact.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No hay insights activos</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => sendInstructionToSupervisor('generate_insights')}
                    disabled={isLoading}
                  >
                    Generar Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Lista de agentes */}
            <Card className="col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Seleccionar Agente</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-2 space-y-1">
                    {agents.map((agent) => {
                      const Icon = MODULE_ICONS[agent.moduleType];
                      const isSelected = selectedAgent?.id === agent.id;
                      
                      return (
                        <Button
                          key={agent.id}
                          variant={isSelected ? "secondary" : "ghost"}
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => setSelectedAgent(agent)}
                        >
                          <Icon className="h-4 w-4 mr-2 shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium truncate">{agent.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {agent.conversationHistory.length} mensajes
                            </p>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat con agente seleccionado */}
            <Card className="col-span-9">
              {selectedAgent ? (
                <>
                  <CardHeader className="pb-2 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const Icon = MODULE_ICONS[selectedAgent.moduleType];
                          return <Icon className="h-5 w-5 text-primary" />;
                        })()}
                        <div>
                          <CardTitle className="text-base">{selectedAgent.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {getStatusLabel(selectedAgent.status)} • Confianza: {selectedAgent.confidenceThreshold}%
                          </CardDescription>
                        </div>
                      </div>
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(selectedAgent.status))} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col h-[450px]">
                    {/* Mensajes */}
                    <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                      <div className="space-y-3">
                        {selectedAgent.conversationHistory.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Inicia una conversación con {selectedAgent.name}</p>
                          </div>
                        ) : (
                          <AnimatePresence>
                            {selectedAgent.conversationHistory.map((msg) => (
                              <motion.div
                                key={msg.id}
                                variants={messageVariants}
                                initial="hidden"
                                animate="visible"
                                className={cn(
                                  "flex gap-2",
                                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                              >
                                <div className={cn(
                                  "max-w-[80%] p-3 rounded-lg",
                                  msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                )}>
                                  <p className="text-sm">{msg.content}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(msg.timestamp), { locale: es, addSuffix: true })}
                                    {msg.confidenceScore && (
                                      <Badge variant="outline" className="text-[10px] h-4">
                                        {msg.confidenceScore}% confianza
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={`Escribe una instrucción para ${selectedAgent.name}...`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendToAgent();
                            }
                          }}
                        />
                        <Button onClick={handleSendToAgent} disabled={isLoading || !chatInput.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Sugerencias rápidas */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {['Analiza el estado actual', 'Genera un reporte', 'Optimiza el proceso', 'Predice tendencias'].map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => setChatInput(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
                  <div className="text-center">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Selecciona un agente para interactuar</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer con última actualización */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {lastRefresh && `Última actualización: ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`}
        </span>
        <span>
          {agents.length} agentes CRM • {supervisor?.predictiveInsights?.length || 0} insights activos
        </span>
      </div>
    </div>
  );
}

export default CRMAgentsDashboard;
