/**
 * UltraCRMAgentsDashboard - Dashboard Ultra-Avanzado de Agentes CRM
 * Tendencias 2025-2027: Multi-Agent Supervisor Architecture
 * - Agentes ultra-especializados por módulo CRM
 * - Coordinación con Supervisor General
 * - Métricas extensivas en tiempo real
 * - Interacción directa con cada agente
 * - Sistema dinámico para nuevos módulos
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentConfigSheet } from './AgentConfigSheet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Brain, 
  Network,
  Sparkles,
  Activity,
  Zap,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  Gauge,
  Timer,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Target,
  Shield,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Cpu,
  Database,
  Radio,
  GitBranch,
  Plus,
  Heart,
  UserPlus,
  Calendar,
  BarChart3,
  Workflow,
  Layers,
  Globe,
  Signal,
  Maximize2,
  Minimize2,
  Command,
  Mic,
  Volume2,
  PieChart,
  LineChart,
  Users,
  Building2,
  Crown,
  Star,
  CircleDot,
  Orbit,
  Radar,
  ScanSearch,
  FlaskConical,
  Telescope,
  Waypoints
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, subDays, subHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCRMModuleAgents, CRM_AGENT_CONFIG } from '@/hooks/crm/agents';
import type { CRMModuleAgent, CRMAgentInsight, CRMModuleType } from '@/hooks/crm/agents/crmAgentTypes';
import { useCRMAgentNotifications } from '@/hooks/admin/agents/useCRMAgentNotifications';
import { useCRMAgentAI } from '@/hooks/admin/agents/useCRMAgentAI';
import { CRMRealTimeMetrics } from './CRMRealTimeMetrics';
import { CRMAgentConversationHistory } from './CRMAgentConversationHistory';
import { CRMCommandCenter } from './CRMCommandCenter';
import { CRMAgentLeaderboard } from './CRMAgentLeaderboard';
import { CRMAgentWorkflows } from './CRMAgentWorkflows';

// === TIPOS EXTENDIDOS ===
interface AgentDetailedMetrics {
  performance: {
    successRate: number;
    avgResponseTime: number;
    tasksCompleted: number;
    tasksInProgress: number;
    errorRate: number;
  };
  activity: {
    last24h: number;
    last7d: number;
    trend: 'up' | 'down' | 'stable';
    peakHour: number;
  };
  intelligence: {
    confidenceAvg: number;
    learningProgress: number;
    decisionsAutonomous: number;
    escalationsCount: number;
  };
  impact: {
    revenueInfluenced: number;
    dealsAccelerated: number;
    risksDetected: number;
    opportunitiesFound: number;
  };
}

interface SupervisorCommand {
  id: string;
  command: string;
  targetAgents: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'supervisor' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  metadata?: Record<string, unknown>;
}

// === ICONOS POR TIPO ===
const AGENT_ICONS: Record<CRMModuleType, React.ElementType> = {
  lead_scoring: Target,
  pipeline_optimizer: GitBranch,
  customer_success: Heart,
  churn_predictor: AlertTriangle,
  upsell_detector: TrendingUp,
  engagement_analyzer: MessageSquare,
  deal_accelerator: Zap,
  contact_enrichment: UserPlus,
  activity_optimizer: Calendar,
  forecast_analyst: BarChart3
};

// === COMPONENTES ===

function MiniSparkline({ data, color = 'text-primary', height = 32 }: { 
  data: number[]; 
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.slice(-15).map((val, i) => (
        <motion.div 
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${((val - min) / range) * 100}%` }}
          transition={{ delay: i * 0.02 }}
          className={cn("w-1 rounded-t bg-current", color)}
          style={{ minHeight: '2px', opacity: 0.3 + (i / data.length) * 0.7 }}
        />
      ))}
    </div>
  );
}

function AgentHealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);
  
  const getColor = () => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-destructive';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" style={{ width: size, height: size }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", getColor())}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-sm font-bold", getColor())}>{score}%</span>
      </div>
    </div>
  );
}

function AgentDetailCard({ 
  agent, 
  metrics,
  onInteract, 
  onConfigure,
  onExecute,
  isExpanded,
  onToggleExpand
}: { 
  agent: CRMModuleAgent;
  metrics: AgentDetailedMetrics;
  onInteract: () => void;
  onConfigure: () => void;
  onExecute: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const config = CRM_AGENT_CONFIG[agent.type];
  const Icon = AGENT_ICONS[agent.type] || Bot;
  
  const statusConfig = {
    active: { color: 'bg-green-500', label: 'Activo', textColor: 'text-green-500' },
    processing: { color: 'bg-blue-500 animate-pulse', label: 'Procesando', textColor: 'text-blue-500' },
    analyzing: { color: 'bg-purple-500 animate-pulse', label: 'Analizando', textColor: 'text-purple-500' },
    idle: { color: 'bg-muted-foreground/50', label: 'En espera', textColor: 'text-muted-foreground' },
    paused: { color: 'bg-amber-500', label: 'Pausado', textColor: 'text-amber-500' },
    error: { color: 'bg-destructive', label: 'Error', textColor: 'text-destructive' }
  };

  const sparklineData = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => 60 + Math.sin(i * 0.5) * 20 + Math.random() * 20), 
  [agent.id]);

  return (
    <motion.div layout className="group">
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded ? "shadow-xl ring-2 ring-primary/20" : "hover:shadow-lg"
      )}>
        {/* Header con gradiente */}
        <div className={cn("h-1.5 bg-gradient-to-r", config.color)} />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
                config.color
              )}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background",
                      statusConfig[agent.status].color
                    )} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{statusConfig[agent.status].label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onToggleExpand}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          {/* Métricas principales */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <AgentHealthRing score={agent.healthScore} size={50} />
              <p className="text-[10px] text-muted-foreground mt-1">Health</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{metrics.performance.successRate}%</p>
              <p className="text-[10px] text-muted-foreground">Éxito</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{metrics.activity.last24h}</p>
              <p className="text-[10px] text-muted-foreground">24h</p>
            </div>
          </div>

          {/* Sparkline de actividad */}
          <div className="px-1">
            <MiniSparkline data={sparklineData} color={statusConfig[agent.status].textColor} />
          </div>

          {/* Sección expandida */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-2 border-t"
              >
                {/* Métricas de Inteligencia */}
                <div className="space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Brain className="h-3 w-3" /> Inteligencia
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Confianza</span>
                      <span className="font-medium">{metrics.intelligence.confidenceAvg}%</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Aprendizaje</span>
                      <span className="font-medium">{metrics.intelligence.learningProgress}%</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Autónomas</span>
                      <span className="font-medium">{metrics.intelligence.decisionsAutonomous}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Escaladas</span>
                      <span className="font-medium">{metrics.intelligence.escalationsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Impacto */}
                <div className="space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Impacto
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-2 rounded bg-green-500/10">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium text-green-600">
                        €{(metrics.impact.revenueInfluenced / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-blue-500/10">
                      <span className="text-muted-foreground">Deals</span>
                      <span className="font-medium text-blue-600">{metrics.impact.dealsAccelerated}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-amber-500/10">
                      <span className="text-muted-foreground">Riesgos</span>
                      <span className="font-medium text-amber-600">{metrics.impact.risksDetected}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-purple-500/10">
                      <span className="text-muted-foreground">Oport.</span>
                      <span className="font-medium text-purple-600">{metrics.impact.opportunitiesFound}</span>
                    </div>
                  </div>
                </div>

                {/* Capacidades */}
                <div className="space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Capacidades
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {config.capabilities.slice(0, 4).map((cap, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] py-0">
                        {cap.length > 25 ? cap.substring(0, 25) + '...' : cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Última actividad */}
          <div className="text-[10px] text-muted-foreground pt-1">
            Última actividad: {formatDistanceToNow(new Date(agent.lastActivity), { locale: es, addSuffix: true })}
          </div>

          {/* Acciones */}
          <div className="flex gap-1.5">
            <Button 
              variant="default" 
              size="sm" 
              className={cn("flex-1 h-8 text-xs bg-gradient-to-r", config.color)}
              onClick={onExecute}
              disabled={agent.status === 'paused' || agent.status === 'analyzing'}
            >
              {agent.status === 'analyzing' ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Ejecutar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={onInteract}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={onConfigure}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SupervisorCommandPanel({
  commands,
  onSendCommand,
  isProcessing,
  allAgents
}: {
  commands: SupervisorCommand[];
  onSendCommand: (command: string, targets: string[]) => void;
  isProcessing: boolean;
  allAgents: CRMModuleAgent[];
}) {
  const [commandInput, setCommandInput] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['all']);

  const handleSend = () => {
    if (!commandInput.trim()) return;
    const targets = selectedTargets.includes('all') 
      ? allAgents.map(a => a.id) 
      : selectedTargets;
    onSendCommand(commandInput, targets);
    setCommandInput('');
  };

  const presetCommands = [
    { label: 'Análisis completo del pipeline', icon: GitBranch },
    { label: 'Detectar leads en riesgo', icon: AlertTriangle },
    { label: 'Buscar oportunidades de upsell', icon: TrendingUp },
    { label: 'Optimizar actividades pendientes', icon: Calendar },
    { label: 'Generar forecast semanal', icon: BarChart3 },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Command className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Centro de Comandos</CardTitle>
            <CardDescription className="text-xs">Instrucciones al Supervisor General</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 pt-3">
        {/* Comandos preset */}
        <div className="flex flex-wrap gap-1.5">
          {presetCommands.map((cmd, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setCommandInput(cmd.label)}
            >
              <cmd.icon className="h-3 w-3 mr-1" />
              {cmd.label.substring(0, 20)}...
            </Button>
          ))}
        </div>

        {/* Selector de agentes target */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Target:</span>
          <Select 
            value={selectedTargets[0]} 
            onValueChange={(v) => setSelectedTargets([v])}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los agentes</SelectItem>
              {allAgents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input de comando */}
        <div className="flex gap-2">
          <Input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Escribe una instrucción..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isProcessing || !commandInput.trim()}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Historial de comandos */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {commands.slice().reverse().map(cmd => (
              <div 
                key={cmd.id}
                className={cn(
                  "p-2 rounded-lg border text-xs",
                  cmd.status === 'completed' ? 'bg-green-500/5 border-green-500/20' :
                  cmd.status === 'failed' ? 'bg-destructive/5 border-destructive/20' :
                  cmd.status === 'executing' ? 'bg-blue-500/5 border-blue-500/20' :
                  'bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    {cmd.status === 'executing' && <Loader2 className="h-2 w-2 animate-spin mr-1" />}
                    {cmd.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(cmd.timestamp, 'HH:mm:ss')}
                  </span>
                </div>
                <p className="font-medium">{cmd.command}</p>
                {cmd.result && (
                  <p className="text-muted-foreground mt-1">{cmd.result}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AgentChatInterface({
  agent,
  messages,
  onSendMessage,
  isLoading,
  onClose
}: {
  agent: CRMModuleAgent | null;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const config = agent ? CRM_AGENT_CONFIG[agent.type] : null;
  const Icon = agent ? AGENT_ICONS[agent.type] : Brain;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const quickActions = agent ? [
    `¿Cuál es el estado actual de ${agent.name.replace('Agente ', '')}?`,
    '¿Qué acciones recomiendas ahora?',
    'Dame un resumen de las últimas 24 horas',
    '¿Hay algún riesgo que deba conocer?'
  ] : [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg bg-gradient-to-br",
              config?.color || 'from-primary to-primary/70'
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm">
                {agent ? agent.name : 'Supervisor General'}
              </CardTitle>
              <CardDescription className="text-xs">
                {agent ? agent.description : 'Coordinador de todos los agentes CRM'}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Icon className={cn("h-12 w-12 mx-auto mb-3", config?.color ? 'text-primary' : 'text-muted-foreground/30')} />
              <p className="text-sm font-medium">
                {agent ? `Chat con ${agent.name}` : 'Chat con el Supervisor'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Puedes dar instrucciones específicas o hacer preguntas
              </p>
              {quickActions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs w-full justify-start"
                      onClick={() => {
                        setInput(action);
                      }}
                    >
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {action}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role !== 'user' && (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'system' ? 'bg-muted' : 
                  msg.role === 'supervisor' ? 'bg-violet-500/10' : 'bg-primary/10'
                )}>
                  {msg.role === 'system' ? (
                    <Radio className="h-4 w-4 text-muted-foreground" />
                  ) : msg.role === 'supervisor' ? (
                    <Crown className="h-4 w-4 text-violet-500" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2",
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : msg.role === 'system'
                    ? 'bg-muted text-muted-foreground italic text-xs'
                    : 'bg-muted'
              )}>
                {msg.agentName && msg.role === 'agent' && (
                  <p className="text-[10px] font-medium text-primary mb-1">{msg.agentName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] opacity-60 mt-1">
                  {format(msg.timestamp, 'HH:mm', { locale: es })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <span className="text-sm text-muted-foreground">Procesando...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={agent ? `Mensaje para ${agent.name}...` : 'Mensaje para el Supervisor...'}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isLoading}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

// === MAIN COMPONENT ===
export function UltraCRMAgentsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'supervisor' | 'analytics' | 'insights'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<CRMModuleAgent | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [supervisorCommands, setSupervisorCommands] = useState<SupervisorCommand[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const {
    isLoading,
    agents,
    supervisorStatus,
    insights,
    initializeAgents,
    executeAgent,
    supervisorOrchestrate,
    sendMessageToAgent,
    toggleAutonomousMode
  } = useCRMModuleAgents();

  // Inicialización con guard
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeAgents();
    }
  }, []);

  // Generar métricas mock para cada agente
  const agentMetrics = useMemo<Record<string, AgentDetailedMetrics>>(() => {
    const metricsMap: Record<string, AgentDetailedMetrics> = {};
    agents.forEach(agent => {
      metricsMap[agent.id] = {
        performance: {
          successRate: Math.round(85 + Math.random() * 15),
          avgResponseTime: Math.round(100 + Math.random() * 400),
          tasksCompleted: Math.floor(50 + Math.random() * 200),
          tasksInProgress: Math.floor(Math.random() * 10),
          errorRate: Math.round((Math.random() * 5) * 10) / 10
        },
        activity: {
          last24h: Math.floor(20 + Math.random() * 80),
          last7d: Math.floor(100 + Math.random() * 400),
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
          peakHour: Math.floor(9 + Math.random() * 8)
        },
        intelligence: {
          confidenceAvg: Math.round(75 + Math.random() * 20),
          learningProgress: Math.round(60 + Math.random() * 35),
          decisionsAutonomous: Math.floor(10 + Math.random() * 50),
          escalationsCount: Math.floor(Math.random() * 10)
        },
        impact: {
          revenueInfluenced: Math.floor(10000 + Math.random() * 90000),
          dealsAccelerated: Math.floor(5 + Math.random() * 25),
          risksDetected: Math.floor(2 + Math.random() * 15),
          opportunitiesFound: Math.floor(3 + Math.random() * 20)
        }
      };
    });
    return metricsMap;
  }, [agents]);

  // Métricas agregadas
  const aggregatedMetrics = useMemo(() => ({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active' || a.status === 'analyzing').length,
    systemHealth: supervisorStatus?.systemHealth || 0,
    totalTasks: Object.values(agentMetrics).reduce((sum, m) => sum + m.performance.tasksCompleted, 0),
    avgSuccessRate: Object.values(agentMetrics).reduce((sum, m) => sum + m.performance.successRate, 0) / agents.length || 0,
    totalRevenue: Object.values(agentMetrics).reduce((sum, m) => sum + m.impact.revenueInfluenced, 0),
    totalDealsAccelerated: Object.values(agentMetrics).reduce((sum, m) => sum + m.impact.dealsAccelerated, 0),
    totalRisksDetected: Object.values(agentMetrics).reduce((sum, m) => sum + m.impact.risksDetected, 0),
    totalOpportunities: Object.values(agentMetrics).reduce((sum, m) => sum + m.impact.opportunitiesFound, 0),
    autonomousDecisions: Object.values(agentMetrics).reduce((sum, m) => sum + m.intelligence.decisionsAutonomous, 0),
    avgConfidence: Object.values(agentMetrics).reduce((sum, m) => sum + m.intelligence.confidenceAvg, 0) / agents.length || 0,
    insightsCount: insights.length
  }), [agents, agentMetrics, supervisorStatus, insights]);

  // Handlers
  const handleInteractWithAgent = useCallback((agent: CRMModuleAgent) => {
    setSelectedAgent(agent);
    setChatMessages([{
      id: `system-${Date.now()}`,
      role: 'system',
      content: `Conectado con ${agent.name}. Capacidades: ${CRM_AGENT_CONFIG[agent.type].capabilities.slice(0, 2).join(', ')}...`,
      timestamp: new Date()
    }]);
    setShowChat(true);
  }, []);

  const [configAgent, setConfigAgent] = useState<CRMModuleAgent | null>(null);
  const [showConfigSheet, setShowConfigSheet] = useState(false);

  const handleConfigureAgent = useCallback((agent: CRMModuleAgent) => {
    setConfigAgent(agent);
    setShowConfigSheet(true);
  }, []);

  const handleExecuteAgent = useCallback(async (agentId: string) => {
    await executeAgent(agentId, { trigger: 'manual', timestamp: new Date().toISOString() });
  }, [executeAgent]);

  const handleSendChatMessage = useCallback(async (message: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      let response: string | null = null;
      
      if (selectedAgent) {
        response = await sendMessageToAgent(selectedAgent.id, message);
      } else {
        // Simular respuesta del supervisor
        await new Promise(r => setTimeout(r, 1500));
        response = `[Supervisor General] He analizado tu solicitud: "${message}". Coordinando con ${agents.length} agentes especializados. El sistema opera al ${aggregatedMetrics.systemHealth}% de capacidad con ${aggregatedMetrics.activeAgents} agentes activos.`;
      }

      if (response) {
        setChatMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: selectedAgent ? 'agent' : 'supervisor',
          content: response,
          timestamp: new Date(),
          agentId: selectedAgent?.id,
          agentName: selectedAgent?.name || 'Supervisor General'
        }]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAgent, sendMessageToAgent, agents.length, aggregatedMetrics]);

  const handleSupervisorCommand = useCallback(async (command: string, targets: string[]) => {
    const newCommand: SupervisorCommand = {
      id: `cmd-${Date.now()}`,
      command,
      targetAgents: targets,
      status: 'executing',
      timestamp: new Date()
    };
    setSupervisorCommands(prev => [...prev, newCommand]);
    setIsProcessing(true);

    try {
      await supervisorOrchestrate(command, 'medium');
      
      setSupervisorCommands(prev => prev.map(c => 
        c.id === newCommand.id 
          ? { ...c, status: 'completed', result: `Comando ejecutado en ${targets.length} agentes. Insights generados.` }
          : c
      ));
      toast.success('Comando ejecutado correctamente');
    } catch {
      setSupervisorCommands(prev => prev.map(c => 
        c.id === newCommand.id 
          ? { ...c, status: 'failed', result: 'Error al ejecutar comando' }
          : c
      ));
    } finally {
      setIsProcessing(false);
    }
  }, [supervisorOrchestrate]);

  const handleOrchestrate = useCallback(async () => {
    await supervisorOrchestrate('Análisis integral del pipeline y agentes CRM', 'high');
  }, [supervisorOrchestrate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Orbit className="h-6 w-6" />
            </div>
            Centro de Agentes CRM Ultra-Especializados
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.length} agentes especializados • Supervisor General • Coordinación en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
            <Signal className={cn(
              "h-4 w-4",
              aggregatedMetrics.activeAgents > 0 ? 'text-green-500 animate-pulse' : 'text-muted-foreground'
            )} />
            <span className="text-sm font-medium">
              {aggregatedMetrics.activeAgents}/{aggregatedMetrics.totalAgents} activos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Autónomo</span>
            <Switch 
              checked={supervisorStatus?.autonomousMode || false}
              onCheckedChange={(checked) => toggleAutonomousMode(checked, 90000)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => initializeAgents()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Sincronizar
          </Button>
          <Button size="sm" onClick={handleOrchestrate} disabled={isLoading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Orquestar Todo
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {[
          { label: 'Agentes Activos', value: `${aggregatedMetrics.activeAgents}/${aggregatedMetrics.totalAgents}`, icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Salud Sistema', value: `${Math.round(aggregatedMetrics.systemHealth)}%`, icon: Gauge, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Tareas Completadas', value: aggregatedMetrics.totalTasks.toLocaleString(), icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Tasa de Éxito', value: `${Math.round(aggregatedMetrics.avgSuccessRate)}%`, icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Revenue Influido', value: `€${(aggregatedMetrics.totalRevenue / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Deals Acelerados', value: aggregatedMetrics.totalDealsAccelerated, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Decisiones Auto', value: aggregatedMetrics.autonomousDecisions, icon: Brain, color: 'text-pink-500', bg: 'bg-pink-500/10' },
          { label: 'Insights', value: aggregatedMetrics.insightsCount, icon: Lightbulb, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((metric) => (
          <motion.div key={metric.label} whileHover={{ scale: 1.02 }}>
            <Card className={cn("p-3 cursor-pointer transition-shadow hover:shadow-md", metric.bg)}>
              <div className="flex items-center gap-2">
                <metric.icon className={cn("h-5 w-5 shrink-0", metric.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold truncate">{metric.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{metric.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="command" className="gap-1.5">
            <Command className="h-3.5 w-3.5" />
            Command
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5">
            <Workflow className="h-3.5 w-3.5" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="realtime" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Tiempo Real
          </TabsTrigger>
          <TabsTrigger value="supervisor" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Supervisor
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <PieChart className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Tab Command Center - NUEVO */}
        <TabsContent value="command" className="mt-4">
          <CRMCommandCenter />
        </TabsContent>

        {/* Tab Workflows - NUEVO */}
        <TabsContent value="workflows" className="mt-4">
          <CRMAgentWorkflows />
        </TabsContent>

        {/* Tab Leaderboard - NUEVO */}
        <TabsContent value="leaderboard" className="mt-4">
          <CRMAgentLeaderboard />
        </TabsContent>

        {/* Tab Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Top Agents */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Agentes Más Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {agents.slice(0, 4).map(agent => {
                    const metrics = agentMetrics[agent.id];
                    const config = CRM_AGENT_CONFIG[agent.type];
                    const Icon = AGENT_ICONS[agent.type];
                    
                    return (
                      <div 
                        key={agent.id}
                        className="p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleInteractWithAgent(agent)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg bg-gradient-to-br", config.color)}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{agent.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={agent.healthScore} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground">{metrics?.activity.last24h || 0} tareas</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedAgent(null);
                    setShowChat(true);
                    setChatMessages([]);
                  }}
                >
                  <Crown className="h-4 w-4 mr-2 text-violet-500" />
                  Hablar con Supervisor
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleOrchestrate}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Orquestar Análisis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generar Forecast
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Detectar Riesgos
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Insights recientes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Insights Recientes del Supervisor
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('insights')}>
                  Ver todos <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ejecuta una orquestación para generar insights
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.slice(0, 3).map(insight => (
                    <div 
                      key={insight.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        insight.priority === 'critical' ? 'bg-destructive/5 border-destructive/30' :
                        insight.priority === 'high' ? 'bg-amber-500/5 border-amber-500/30' :
                        'bg-muted/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {insight.type === 'risk' ? (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        ) : insight.type === 'opportunity' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Agents */}
        <TabsContent value="agents" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {agents.map(agent => (
                <AgentDetailCard
                  key={agent.id}
                  agent={agent}
                  metrics={agentMetrics[agent.id]}
                  onInteract={() => handleInteractWithAgent(agent)}
                  onConfigure={() => handleConfigureAgent(agent)}
                  onExecute={() => handleExecuteAgent(agent.id)}
                  isExpanded={expandedAgentId === agent.id}
                  onToggleExpand={() => setExpandedAgentId(prev => prev === agent.id ? null : agent.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Tab Supervisor */}
        <TabsContent value="supervisor" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4 h-[600px]">
            <SupervisorCommandPanel
              commands={supervisorCommands}
              onSendCommand={handleSupervisorCommand}
              isProcessing={isProcessing}
              allAgents={agents}
            />
            <AgentChatInterface
              agent={selectedAgent}
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              isLoading={isProcessing}
              onClose={() => {
                setSelectedAgent(null);
                setChatMessages([]);
              }}
            />
          </div>
        </TabsContent>

        {/* Tab Analytics */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Performance por agente */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  Performance por Agente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.map(agent => {
                    const metrics = agentMetrics[agent.id];
                    const config = CRM_AGENT_CONFIG[agent.type];
                    const Icon = AGENT_ICONS[agent.type];
                    
                    return (
                      <div key={agent.id} className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded bg-gradient-to-br", config.color)}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium w-40 truncate">{agent.name}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <Progress value={metrics?.performance.successRate || 0} className="h-2" />
                          <span className="text-xs text-muted-foreground w-12">
                            {Math.round(metrics?.performance.successRate || 0)}%
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {metrics?.activity.last24h || 0} tareas
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Distribución de impacto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Impacto por Área
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Revenue Influido', value: `€${(aggregatedMetrics.totalRevenue / 1000).toFixed(0)}k`, color: 'bg-green-500' },
                  { label: 'Deals Acelerados', value: aggregatedMetrics.totalDealsAccelerated, color: 'bg-blue-500' },
                  { label: 'Riesgos Detectados', value: aggregatedMetrics.totalRisksDetected, color: 'bg-amber-500' },
                  { label: 'Oportunidades', value: aggregatedMetrics.totalOpportunities, color: 'bg-purple-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", item.color)} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Insights */}
        <TabsContent value="insights" className="mt-4">
          {insights.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin insights todavía</h3>
                <p className="text-muted-foreground mb-4">
                  Ejecuta una orquestación del supervisor para generar insights inteligentes
                </p>
                <Button onClick={handleOrchestrate}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar Insights
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map(insight => (
                <Card 
                  key={insight.id}
                  className={cn(
                    "overflow-hidden",
                    insight.priority === 'critical' ? 'border-destructive' :
                    insight.priority === 'high' ? 'border-amber-500' : ''
                  )}
                >
                  <div className={cn(
                    "h-1",
                    insight.priority === 'critical' ? 'bg-destructive' :
                    insight.priority === 'high' ? 'bg-amber-500' :
                    insight.priority === 'medium' ? 'bg-blue-500' : 'bg-muted'
                  )} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={
                        insight.priority === 'critical' ? 'destructive' :
                        insight.priority === 'high' ? 'default' : 'secondary'
                      }>
                        {insight.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(insight.timestamp), { locale: es, addSuffix: true })}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-2">{insight.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.suggestedAction && (
                      <Button size="sm" variant="outline" className="w-full">
                        <ChevronRight className="h-3 w-3 mr-1" />
                        {insight.suggestedAction}
                      </Button>
                    )}
                    {insight.estimatedImpact?.revenue && (
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-green-500/10">
                        <span>Impacto estimado</span>
                        <span className="font-bold text-green-600">
                          €{insight.estimatedImpact.revenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Tiempo Real - NUEVO */}
        <TabsContent value="realtime" className="mt-4">
          <CRMRealTimeMetrics />
        </TabsContent>

        {/* Tab Historial de Conversaciones - NUEVO */}
        <TabsContent value="history" className="mt-4">
          <CRMAgentConversationHistory />
        </TabsContent>
      </Tabs>

      {/* Chat Sheet flotante */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent className="w-[400px] sm:w-[540px] p-0">
          <div className="h-full">
            <AgentChatInterface
              agent={selectedAgent}
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              isLoading={isProcessing}
              onClose={() => setShowChat(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Agent Configuration Sheet */}
      <AgentConfigSheet
        open={showConfigSheet}
        onOpenChange={setShowConfigSheet}
        agent={configAgent ? {
          id: configAgent.id,
          name: configAgent.name,
          type: configAgent.type,
          description: CRM_AGENT_CONFIG[configAgent.type]?.description,
          capabilities: CRM_AGENT_CONFIG[configAgent.type]?.capabilities,
          domain: 'crm'
        } : null}
        agentType="crm"
      />
    </div>
  );
}

export default UltraCRMAgentsDashboard;
