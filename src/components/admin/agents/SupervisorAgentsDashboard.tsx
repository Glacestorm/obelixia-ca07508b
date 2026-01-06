/**
 * SupervisorAgentsDashboard - Dashboard Ultra-Avanzado del Supervisor General
 * Tendencias 2025-2027: Multi-agent orchestration, Real-time metrics, Agent interaction
 * Incluye agentes especializados ERP + CRM con supervisor coordinador
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Brain, 
  Network,
  Users,
  Building2,
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
  History,
  Cpu,
  Database,
  Radio,
  GitBranch,
  Plus,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { AgentHelpSheet } from './help/AgentHelpSheet';

// === TIPOS ===
interface AgentModule {
  id: string;
  name: string;
  domain: 'erp' | 'crm';
  module: string;
  status: 'active' | 'idle' | 'processing' | 'error' | 'paused';
  healthScore: number;
  lastActivity: Date;
  tasksCompleted: number;
  capabilities: string[];
  metrics: Record<string, number>;
}

interface SupervisorMetrics {
  totalAgents: number;
  activeAgents: number;
  systemHealth: number;
  avgResponseTime: number;
  tasksToday: number;
  successRate: number;
  conflictsResolved: number;
  autonomousDecisions: number;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
}

interface SupervisorInsight {
  id: string;
  type: 'optimization' | 'alert' | 'recommendation' | 'conflict';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedAction?: string;
  affectedAgents: string[];
  timestamp: Date;
}

// === DATOS MOCK ===
const ERP_AGENTS: AgentModule[] = [
  { id: 'erp-maestros', name: 'Agente Maestros', domain: 'erp', module: 'Maestros', status: 'active', healthScore: 94, lastActivity: new Date(), tasksCompleted: 156, capabilities: ['import_data', 'validate_entities', 'sync_masters', 'ai_mapping'], metrics: { imports: 45, validations: 230 } },
  { id: 'erp-ventas', name: 'Agente Ventas', domain: 'erp', module: 'Ventas', status: 'processing', healthScore: 88, lastActivity: new Date(), tasksCompleted: 89, capabilities: ['invoice_generation', 'pricing_rules', 'discount_management'], metrics: { invoices: 120, quotes: 45 } },
  { id: 'erp-compras', name: 'Agente Compras', domain: 'erp', module: 'Compras', status: 'active', healthScore: 91, lastActivity: new Date(), tasksCompleted: 78, capabilities: ['purchase_orders', 'supplier_eval', 'cost_optimization'], metrics: { orders: 67, savings: 12500 } },
  { id: 'erp-inventario', name: 'Agente Inventario', domain: 'erp', module: 'Almacén', status: 'active', healthScore: 96, lastActivity: new Date(), tasksCompleted: 203, capabilities: ['stock_management', 'reorder_alerts', 'location_optimization'], metrics: { movements: 450, alerts: 12 } },
  { id: 'erp-contabilidad', name: 'Agente Contabilidad', domain: 'erp', module: 'Contabilidad', status: 'active', healthScore: 98, lastActivity: new Date(), tasksCompleted: 312, capabilities: ['journal_entries', 'reconciliation', 'closing_automation'], metrics: { entries: 890, reconciled: 156 } },
  { id: 'erp-tesoreria', name: 'Agente Tesorería', domain: 'erp', module: 'Tesorería', status: 'idle', healthScore: 92, lastActivity: new Date(Date.now() - 300000), tasksCompleted: 67, capabilities: ['cash_forecasting', 'payment_scheduling', 'bank_sync'], metrics: { payments: 89, forecasts: 5 } },
  { id: 'erp-comercio', name: 'Agente Comercio', domain: 'erp', module: 'Comercio', status: 'active', healthScore: 85, lastActivity: new Date(), tasksCompleted: 45, capabilities: ['trade_finance', 'currency_management', 'customs'], metrics: { operations: 23, currencies: 8 } },
  { id: 'erp-logistica', name: 'Agente Logística', domain: 'erp', module: 'Logística', status: 'active', healthScore: 90, lastActivity: new Date(), tasksCompleted: 134, capabilities: ['route_optimization', 'carrier_management', 'tracking'], metrics: { shipments: 178, routes: 45 } },
];

const CRM_AGENTS: AgentModule[] = [
  { id: 'crm-pipeline', name: 'Agente Pipeline', domain: 'crm', module: 'Pipeline', status: 'active', healthScore: 93, lastActivity: new Date(), tasksCompleted: 234, capabilities: ['deal_scoring', 'stage_automation', 'forecast_ai'], metrics: { deals: 89, forecasts: 12 } },
  { id: 'crm-contacts', name: 'Agente Contactos', domain: 'crm', module: 'Contactos', status: 'active', healthScore: 95, lastActivity: new Date(), tasksCompleted: 456, capabilities: ['enrichment', 'dedup', 'segmentation'], metrics: { contacts: 2340, enriched: 890 } },
  { id: 'crm-inbox', name: 'Agente Inbox', domain: 'crm', module: 'Omnicanal', status: 'processing', healthScore: 89, lastActivity: new Date(), tasksCompleted: 567, capabilities: ['auto_response', 'routing', 'sentiment'], metrics: { messages: 1230, responses: 890 } },
  { id: 'crm-sentiment', name: 'Agente Sentimiento', domain: 'crm', module: 'Sentimiento', status: 'active', healthScore: 87, lastActivity: new Date(), tasksCompleted: 789, capabilities: ['emotion_detection', 'trend_analysis', 'alerts'], metrics: { analyzed: 3450, alerts: 23 } },
  { id: 'crm-sla', name: 'Agente SLA', domain: 'crm', module: 'SLAs', status: 'active', healthScore: 96, lastActivity: new Date(), tasksCompleted: 123, capabilities: ['sla_monitoring', 'escalation', 'reporting'], metrics: { slas: 45, breaches: 2 } },
  { id: 'crm-automation', name: 'Agente Automatización', domain: 'crm', module: 'Automatización', status: 'idle', healthScore: 91, lastActivity: new Date(Date.now() - 600000), tasksCompleted: 89, capabilities: ['workflow_execution', 'trigger_management', 'actions'], metrics: { workflows: 34, executions: 567 } },
];

const SUPERVISOR_INSIGHTS: SupervisorInsight[] = [
  { id: '1', type: 'optimization', priority: 'medium', title: 'Optimización de rutas detectada', description: 'El agente de logística puede reducir tiempos de entrega un 15%', suggestedAction: 'Aplicar nuevas rutas', affectedAgents: ['erp-logistica'], timestamp: new Date() },
  { id: '2', type: 'alert', priority: 'high', title: 'Carga alta en Agente Inbox', description: 'El agente de inbox está procesando 50% más mensajes que el promedio', suggestedAction: 'Escalar recursos', affectedAgents: ['crm-inbox'], timestamp: new Date(Date.now() - 1800000) },
  { id: '3', type: 'recommendation', priority: 'low', title: 'Sincronización cross-module', description: 'Los agentes de Ventas ERP y Pipeline CRM pueden sincronizar datos', suggestedAction: 'Habilitar sync bidireccional', affectedAgents: ['erp-ventas', 'crm-pipeline'], timestamp: new Date(Date.now() - 3600000) },
];

// === COMPONENTES ===
function MiniChart({ data, color = 'text-primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.slice(-12).map((val, i) => (
        <div 
          key={i}
          className={cn("w-1.5 rounded-t bg-current opacity-60 hover:opacity-100 transition-opacity", color)}
          style={{ height: `${((val - min) / range) * 100}%`, minHeight: '3px' }}
        />
      ))}
    </div>
  );
}

function AgentCard({ agent, onInteract, onConfigure }: { 
  agent: AgentModule; 
  onInteract: (agent: AgentModule) => void;
  onConfigure: (agent: AgentModule) => void;
}) {
  const statusConfig = {
    active: { color: 'bg-green-500', label: 'Activo' },
    processing: { color: 'bg-blue-500 animate-pulse', label: 'Procesando' },
    idle: { color: 'bg-muted-foreground/50', label: 'En espera' },
    paused: { color: 'bg-amber-500', label: 'Pausado' },
    error: { color: 'bg-destructive', label: 'Error' }
  };

  const chartData = useMemo(() => 
    Array.from({ length: 12 }, () => 70 + Math.random() * 30), 
  [agent.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                agent.domain === 'erp' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
              )}>
                <Bot className={cn(
                  "h-4 w-4",
                  agent.domain === 'erp' ? 'text-blue-500' : 'text-emerald-500'
                )} />
              </div>
              <div>
                <CardTitle className="text-sm">{agent.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{agent.module}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", statusConfig[agent.status].color)} />
              <Badge variant="outline" className="text-xs">
                {agent.domain.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Health</span>
            <div className="flex items-center gap-2">
              <Progress value={agent.healthScore} className="w-16 h-1.5" />
              <span className="text-xs font-medium">{agent.healthScore}%</span>
            </div>
          </div>
          
          <MiniChart 
            data={chartData} 
            color={agent.domain === 'erp' ? 'text-blue-500' : 'text-emerald-500'} 
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{agent.tasksCompleted} tareas</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(agent.lastActivity, { locale: es, addSuffix: true })}
            </span>
          </div>

          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs"
              onClick={() => onInteract(agent)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Interactuar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => onConfigure(agent)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SupervisorChat({ 
  messages, 
  onSendMessage, 
  isLoading,
  selectedAgent 
}: { 
  messages: AgentMessage[];
  onSendMessage: (message: string, targetAgent?: string) => void;
  isLoading: boolean;
  selectedAgent?: AgentModule | null;
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input, selectedAgent?.id);
    setInput('');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedAgent ? (
              <>
                <Bot className={cn(
                  "h-5 w-5",
                  selectedAgent.domain === 'erp' ? 'text-blue-500' : 'text-emerald-500'
                )} />
                <div>
                  <CardTitle className="text-sm">{selectedAgent.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{selectedAgent.module}</p>
                </div>
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-sm">Supervisor General</CardTitle>
                  <p className="text-xs text-muted-foreground">Coordinador de todos los agentes</p>
                </div>
              </>
            )}
          </div>
          {selectedAgent && (
            <Badge variant={selectedAgent.domain === 'erp' ? 'default' : 'secondary'}>
              {selectedAgent.domain.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {selectedAgent 
                  ? `Envía instrucciones al ${selectedAgent.name}`
                  : 'Envía instrucciones al Supervisor General'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Puedes dar comandos específicos o pedir información
              </p>
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
                  msg.role === 'system' ? 'bg-muted' : 'bg-primary/10'
                )}>
                  {msg.role === 'system' ? (
                    <Radio className="h-4 w-4 text-muted-foreground" />
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
                    ? 'bg-muted text-muted-foreground italic text-sm'
                    : 'bg-muted'
              )}>
                {msg.agentName && msg.role === 'agent' && (
                  <p className="text-xs font-medium text-primary mb-1">{msg.agentName}</p>
                )}
                <p className="text-sm">{msg.content}</p>
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
          placeholder={selectedAgent 
            ? `Instrucción para ${selectedAgent.name}...`
            : "Instrucción para el Supervisor..."
          }
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
export function SupervisorAgentsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'erp' | 'crm' | 'supervisor' | 'insights'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<AgentModule | null>(null);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metrics']));

  const allAgents = [...ERP_AGENTS, ...CRM_AGENTS];
  
  const metrics: SupervisorMetrics = useMemo(() => ({
    totalAgents: allAgents.length,
    activeAgents: allAgents.filter(a => a.status === 'active' || a.status === 'processing').length,
    systemHealth: Math.round(allAgents.reduce((sum, a) => sum + a.healthScore, 0) / allAgents.length),
    avgResponseTime: 245,
    tasksToday: allAgents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    successRate: 96.5,
    conflictsResolved: 12,
    autonomousDecisions: 89
  }), [allAgents]);

  const handleSendMessage = useCallback(async (message: string, targetAgentId?: string) => {
    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Simular respuesta
    await new Promise(r => setTimeout(r, 1500));

    const targetAgent = targetAgentId ? allAgents.find(a => a.id === targetAgentId) : null;
    const agentResponse: AgentMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'agent',
      content: targetAgent 
        ? `[${targetAgent.name}] Instrucción recibida: "${message}". Procesando en módulo ${targetAgent.module}. Estado actual: ${targetAgent.healthScore}% health. Últimas tareas completadas: ${targetAgent.tasksCompleted}.`
        : `[Supervisor] Analizando instrucción: "${message}". Coordinando con ${allAgents.length} agentes activos. Sistema operando al ${metrics.systemHealth}% de capacidad.`,
      timestamp: new Date(),
      agentId: targetAgentId,
      agentName: targetAgent?.name || 'Supervisor General'
    };
    setChatMessages(prev => [...prev, agentResponse]);
    setIsProcessing(false);
    toast.success('Instrucción procesada');
  }, [allAgents, metrics.systemHealth]);

  const handleInteractWithAgent = (agent: AgentModule) => {
    setSelectedAgent(agent);
    setChatMessages([{
      id: `system-${Date.now()}`,
      role: 'system',
      content: `Conectado con ${agent.name} (${agent.module}). Capacidades: ${agent.capabilities.slice(0, 3).join(', ')}...`,
      timestamp: new Date()
    }]);
    setActiveTab('supervisor');
  };

  const handleConfigureAgent = (agent: AgentModule) => {
    toast.info(`Configuración de ${agent.name} - Próximamente`);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Centro de Control de Agentes IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Supervisor General + {ERP_AGENTS.length} agentes ERP + {CRM_AGENTS.length} agentes CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            {metrics.activeAgents}/{metrics.totalAgents} activos
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
          <Button size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Orquestar Todo
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Agentes Activos', value: `${metrics.activeAgents}/${metrics.totalAgents}`, icon: Bot, color: 'text-blue-500' },
          { label: 'Salud Sistema', value: `${metrics.systemHealth}%`, icon: Gauge, color: 'text-emerald-500' },
          { label: 'Tareas Hoy', value: metrics.tasksToday.toLocaleString(), icon: CheckCircle, color: 'text-green-500' },
          { label: 'Tasa Éxito', value: `${metrics.successRate}%`, icon: Target, color: 'text-primary' },
          { label: 'Tiempo Resp.', value: `${metrics.avgResponseTime}ms`, icon: Timer, color: 'text-amber-500' },
          { label: 'Conflictos', value: metrics.conflictsResolved, icon: Shield, color: 'text-purple-500' },
          { label: 'Decisiones Auto', value: metrics.autonomousDecisions, icon: Brain, color: 'text-pink-500' },
          { label: 'Insights', value: SUPERVISOR_INSIGHTS.length, icon: Lightbulb, color: 'text-orange-500' },
        ].map((metric) => (
          <Card key={metric.label} className="p-3">
            <div className="flex items-center gap-2">
              <metric.icon className={cn("h-4 w-4", metric.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold truncate">{metric.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{metric.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <Eye className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="erp" className="gap-2">
            <Building2 className="h-4 w-4" />
            ERP ({ERP_AGENTS.length})
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-2">
            <Users className="h-4 w-4" />
            CRM ({CRM_AGENTS.length})
          </TabsTrigger>
          <TabsTrigger value="supervisor" className="gap-2">
            <Brain className="h-4 w-4" />
            Supervisor
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* ERP Agents Preview */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Agentes ERP
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('erp')}>
                    Ver todos <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {ERP_AGENTS.slice(0, 4).map(agent => (
                    <div 
                      key={agent.id} 
                      className="p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleInteractWithAgent(agent)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{agent.name}</span>
                        <div className={cn("w-2 h-2 rounded-full", 
                          agent.status === 'active' ? 'bg-green-500' : 
                          agent.status === 'processing' ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/50'
                        )} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Progress value={agent.healthScore} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{agent.healthScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CRM Agents Preview */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    Agentes CRM
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('crm')}>
                    Ver todos <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {CRM_AGENTS.slice(0, 4).map(agent => (
                    <div 
                      key={agent.id} 
                      className="p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleInteractWithAgent(agent)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{agent.name}</span>
                        <div className={cn("w-2 h-2 rounded-full", 
                          agent.status === 'active' ? 'bg-green-500' : 
                          agent.status === 'processing' ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/50'
                        )} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Progress value={agent.healthScore} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{agent.healthScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Insights Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SUPERVISOR_INSIGHTS.map(insight => (
                  <div key={insight.id} className={cn(
                    "p-3 rounded-lg border flex items-center gap-3",
                    insight.priority === 'critical' ? 'bg-destructive/5 border-destructive/20' :
                    insight.priority === 'high' ? 'bg-amber-500/5 border-amber-500/20' :
                    'bg-muted/50'
                  )}>
                    {insight.type === 'alert' ? (
                      <AlertTriangle className={cn("h-5 w-5 shrink-0", 
                        insight.priority === 'critical' ? 'text-destructive' : 'text-amber-500'
                      )} />
                    ) : insight.type === 'optimization' ? (
                      <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{insight.description}</p>
                    </div>
                    {insight.suggestedAction && (
                      <Button size="sm" variant="outline" className="shrink-0">
                        {insight.suggestedAction}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ERP Tab */}
        <TabsContent value="erp" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ERP_AGENTS.map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onInteract={handleInteractWithAgent}
                onConfigure={handleConfigureAgent}
              />
            ))}
          </div>
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CRM_AGENTS.map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onInteract={handleInteractWithAgent}
                onConfigure={handleConfigureAgent}
              />
            ))}
          </div>
        </TabsContent>

        {/* Supervisor Tab */}
        <TabsContent value="supervisor" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SupervisorChat 
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isProcessing}
                selectedAgent={selectedAgent}
              />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Seleccionar Agente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      <Button 
                        variant={!selectedAgent ? 'secondary' : 'ghost'}
                        className="w-full justify-start h-auto py-2"
                        onClick={() => {
                          setSelectedAgent(null);
                          setChatMessages([]);
                        }}
                      >
                        <Brain className="h-4 w-4 mr-2 text-primary" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Supervisor General</p>
                          <p className="text-xs text-muted-foreground">Coordina todos</p>
                        </div>
                      </Button>
                      <div className="py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2">ERP</p>
                      </div>
                      {ERP_AGENTS.map(agent => (
                        <Button 
                          key={agent.id}
                          variant={selectedAgent?.id === agent.id ? 'secondary' : 'ghost'}
                          className="w-full justify-start h-auto py-2"
                          onClick={() => handleInteractWithAgent(agent)}
                        >
                          <Bot className="h-4 w-4 mr-2 text-blue-500" />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.module}</p>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full shrink-0",
                            agent.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/50'
                          )} />
                        </Button>
                      ))}
                      <div className="py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2">CRM</p>
                      </div>
                      {CRM_AGENTS.map(agent => (
                        <Button 
                          key={agent.id}
                          variant={selectedAgent?.id === agent.id ? 'secondary' : 'ghost'}
                          className="w-full justify-start h-auto py-2"
                          onClick={() => handleInteractWithAgent(agent)}
                        >
                          <Bot className="h-4 w-4 mr-2 text-emerald-500" />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.module}</p>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full shrink-0",
                            agent.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/50'
                          )} />
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPERVISOR_INSIGHTS.map(insight => (
              <Card key={insight.id} className={cn(
                insight.priority === 'critical' ? 'border-destructive' :
                insight.priority === 'high' ? 'border-amber-500' : ''
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      insight.priority === 'critical' ? 'destructive' :
                      insight.priority === 'high' ? 'default' : 'secondary'
                    }>
                      {insight.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(insight.timestamp, { locale: es, addSuffix: true })}
                    </span>
                  </div>
                  <CardTitle className="text-base">{insight.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {insight.affectedAgents.map(agentId => (
                      <Badge key={agentId} variant="outline" className="text-xs">
                        {agentId}
                      </Badge>
                    ))}
                  </div>
                  {insight.suggestedAction && (
                    <Button size="sm" className="w-full">
                      <Zap className="h-3 w-3 mr-2" />
                      {insight.suggestedAction}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Supervisor Help Sheet */}
      <AgentHelpSheet
        open={false}
        onOpenChange={() => {}}
        agentId="supervisor"
        agentType="supervisor"
      />
    </div>
  );
}

export default SupervisorAgentsDashboard;
