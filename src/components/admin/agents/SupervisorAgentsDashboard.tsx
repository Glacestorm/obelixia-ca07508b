/**
 * SupervisorAgentsDashboard - Dashboard Ultra-Avanzado del Supervisor General
 * Tendencias 2025-2027: Multi-agent orchestration, Real-time metrics, Agent interaction
 * Incluye agentes especializados ERP + CRM con supervisor coordinador
 * + Vistas de dominio RRHH / Jurídico / Cross-Module con datos reales
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
import { AgentConfigSheet } from './AgentConfigSheet';
import { RegistryAgentCard } from './RegistryAgentCard';
import { RegistryAgentConfigSheet } from './RegistryAgentConfigSheet';
import { SupervisorDomainView, SupervisorConflictsView } from './SupervisorDomainView';
import { RegulatoryIntelligencePanel } from './RegulatoryIntelligencePanel';
import { useSupervisorDomainData } from '@/hooks/admin/agents/useSupervisorDomainData';
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
   Scale,
   UserCheck,
   Newspaper
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

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
  { id: 'erp-fiscal', name: 'Agente Fiscal', domain: 'erp', module: 'Fiscal', status: 'active', healthScore: 95, lastActivity: new Date(), tasksCompleted: 178, capabilities: ['sii_management', 'vat_calculation', 'intrastat_reporting', 'tax_compliance', 'fiscal_calendar', 'multi_jurisdiction'], metrics: { declarations: 45, sii_entries: 890, compliance_score: 98 } },
  { id: 'erp-rrhh', name: 'Agente RRHH', domain: 'erp', module: 'RRHH', status: 'active', healthScore: 94, lastActivity: new Date(), tasksCompleted: 156, capabilities: ['payroll_calculation', 'vacation_planning', 'contract_management', 'severance_calculator', 'prl_safety', 'labor_compliance', 'recruitment'], metrics: { employees: 127, payrolls: 340, contracts: 89 } },
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
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedAgent, setSelectedAgent] = useState<AgentModule | null>(null);

  // Real data from erp_ai_agents_registry + erp_ai_agent_invocations
  const domainData = useSupervisorDomainData();
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metrics']));

  const allAgents = [...ERP_AGENTS, ...CRM_AGENTS];

  // Blend real registry data with mock for accurate counts
  const realAgentCount = domainData.stats.totalAgents;
  const realActiveCount = domainData.stats.activeAgents;
  
  const metrics: SupervisorMetrics = useMemo(() => ({
    totalAgents: allAgents.length + realAgentCount,
    activeAgents: allAgents.filter(a => a.status === 'active' || a.status === 'processing').length + realActiveCount,
    systemHealth: Math.round(allAgents.reduce((sum, a) => sum + a.healthScore, 0) / allAgents.length),
    avgResponseTime: domainData.stats.avgExecutionTime || 245,
    tasksToday: domainData.stats.totalInvocations || allAgents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    successRate: domainData.stats.totalInvocations > 0 ? domainData.stats.successRate : 96.5,
    conflictsResolved: domainData.stats.escalatedCount,
    autonomousDecisions: domainData.stats.totalInvocations - domainData.stats.humanReviewCount
  }), [allAgents, realAgentCount, realActiveCount, domainData.stats]);

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

  const [configAgent, setConfigAgent] = useState<AgentModule | null>(null);
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [registryConfigAgent, setRegistryConfigAgent] = useState<import('@/hooks/admin/agents/useSupervisorDomainData').RegistryAgent | null>(null);
  const [showRegistryConfig, setShowRegistryConfig] = useState(false);

  const handleConfigureAgent = (agent: AgentModule) => {
    setConfigAgent(agent);
    setShowConfigSheet(true);
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
            Supervisor Global · {ERP_AGENTS.length} ERP + {CRM_AGENTS.length} CRM + {realAgentCount} registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            {metrics.activeAgents}/{metrics.totalAgents} activos
          </Badge>
          <Button variant="outline" size="sm" onClick={() => { domainData.refresh(); toast.success('Datos sincronizados'); }} disabled={domainData.loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", domainData.loading && "animate-spin")} />
            Sincronizar
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden md:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="erp" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ERP</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden md:inline">CRM</span>
          </TabsTrigger>
          <TabsTrigger value="rrhh" className="gap-1 text-xs flex-1 min-w-[70px]">
            <UserCheck className="h-3.5 w-3.5" />
            <span className="hidden md:inline">RRHH</span>
            {domainData.hrAgents.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">{domainData.hrAgents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Scale className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Jurídico</span>
            {domainData.legalAgents.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">{domainData.legalAgents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cross" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Network className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Cross</span>
            {domainData.escalatedInvocations.length > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 px-1 text-[9px]">{domainData.escalatedInvocations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-1 text-xs flex-1 min-w-[70px]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Conflictos</span>
            {domainData.humanReviewInvocations.length > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 px-1 text-[9px]">{domainData.humanReviewInvocations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="supervisor" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Supervisor</span>
          </TabsTrigger>
          <TabsTrigger value="normativa" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Newspaper className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Normativa</span>
          </TabsTrigger>
          <TabsTrigger value="obelixia" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Cpu className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ObelixIA</span>
            {domainData.obelixiaInvocations.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">{domainData.obelixiaInvocations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1 text-xs flex-1 min-w-[70px]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Real Registry Summary */}
          {realAgentCount > 0 && (
            <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/5 via-background to-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-violet-500" />
                  <CardTitle className="text-sm">Agentes Multiagente (Live)</CardTitle>
                  <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Datos reales</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-primary">{realAgentCount}</p>
                    <p className="text-[10px] text-muted-foreground">Registrados</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-emerald-600">{domainData.stats.successRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Tasa éxito</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-amber-600">{domainData.stats.escalatedCount}</p>
                    <p className="text-[10px] text-muted-foreground">Escalados</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{domainData.stats.totalInvocations}</p>
                    <p className="text-[10px] text-muted-foreground">Invocaciones</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {domainData.agents.map(a => (
                    <Badge key={a.code} variant="outline" className={cn("text-[10px]",
                      a.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-muted')}>
                      {a.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {/* ERP Agents Preview */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Agentes ERP
                    <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Demo</Badge>
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
                    <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Demo</Badge>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold">Agentes ERP</h3>
              <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Demo</Badge>
            </div>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              {ERP_AGENTS.filter(a => a.status === 'active' || a.status === 'processing').length}/{ERP_AGENTS.length} activos
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ERP_AGENTS.map(agent => (
              <AgentCard key={agent.id} agent={agent} onInteract={handleInteractWithAgent} onConfigure={handleConfigureAgent} />
            ))}
          </div>
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-semibold">Agentes CRM</h3>
              <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Demo</Badge>
            </div>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              {CRM_AGENTS.filter(a => a.status === 'active' || a.status === 'processing').length}/{CRM_AGENTS.length} activos
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CRM_AGENTS.map(agent => (
              <AgentCard key={agent.id} agent={agent} onInteract={handleInteractWithAgent} onConfigure={handleConfigureAgent} />
            ))}
          </div>
        </TabsContent>

        {/* RRHH Tab - Live data */}
        <TabsContent value="rrhh" className="space-y-4">
          {domainData.hrAgents.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Agentes RRHH</h3>
                <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Live</Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {domainData.hrAgents.map(agent => {
                  const agentInvocations = domainData.hrInvocations.filter(i => i.agent_code === agent.code);
                  const lastInv = agentInvocations[0];
                  return (
                    <RegistryAgentCard
                      key={agent.code}
                      agent={agent}
                      invocationCount={agentInvocations.length}
                      lastInvocation={lastInv?.created_at}
                      onConfigure={(a) => { setRegistryConfigAgent(a); setShowRegistryConfig(true); }}
                    />
                  );
                })}
              </div>
              {/* Also show domain view for full context */}
              <SupervisorDomainView
                agents={domainData.hrAgents}
                invocations={domainData.hrInvocations}
                domain="hr"
                title="RRHH"
                icon={<UserCheck className="h-5 w-5" />}
                accentColor="text-blue-600"
              />
            </>
          ) : (
            <SupervisorDomainView
              agents={domainData.hrAgents}
              invocations={domainData.hrInvocations}
              domain="hr"
              title="RRHH"
              icon={<UserCheck className="h-5 w-5" />}
              accentColor="text-blue-600"
            />
          )}
        </TabsContent>

        {/* Legal Tab - Live data */}
        <TabsContent value="legal" className="space-y-4">
          {domainData.legalAgents.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Agentes Jurídicos</h3>
                <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Live</Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {domainData.legalAgents.map(agent => {
                  const agentInvocations = domainData.legalInvocations.filter(i => i.agent_code === agent.code);
                  const lastInv = agentInvocations[0];
                  return (
                    <RegistryAgentCard
                      key={agent.code}
                      agent={agent}
                      invocationCount={agentInvocations.length}
                      lastInvocation={lastInv?.created_at}
                      onConfigure={(a) => { setRegistryConfigAgent(a); setShowRegistryConfig(true); }}
                    />
                  );
                })}
              </div>
              <SupervisorDomainView
                agents={domainData.legalAgents}
                invocations={domainData.legalInvocations}
                domain="legal"
                title="Jurídico"
                icon={<Scale className="h-5 w-5" />}
                accentColor="text-amber-600"
              />
            </>
          ) : (
            <SupervisorDomainView
              agents={domainData.legalAgents}
              invocations={domainData.legalInvocations}
              domain="legal"
              title="Jurídico"
              icon={<Scale className="h-5 w-5" />}
              accentColor="text-amber-600"
            />
          )}
        </TabsContent>

        {/* Cross-Module Tab */}
        <TabsContent value="cross" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Network className="h-5 w-5 text-violet-600" />
            <h3 className="text-lg font-semibold">Cross-Module RRHH ↔ Jurídico</h3>
            <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Live</Badge>
          </div>
          {domainData.escalatedInvocations.length > 0 ? (
            <SupervisorConflictsView
              escalated={domainData.escalatedInvocations}
              humanReview={domainData.humanReviewInvocations}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin escalados cross-module</p>
                <p className="text-xs mt-1">Los escalados HR → Legal aparecerán aquí cuando se produzcan</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Conflictos y Revisión Humana</h3>
            <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Live</Badge>
          </div>
          <SupervisorConflictsView
            escalated={domainData.conflictInvocations}
            humanReview={domainData.humanReviewInvocations}
          />
        </TabsContent>

        {/* Supervisor General Tab */}
        <TabsContent value="supervisor" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
            {/* Chat area */}
            <div className="lg:col-span-2">
              <SupervisorChat
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isProcessing}
                selectedAgent={selectedAgent}
              />
            </div>
            {/* Agent selector sidebar */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Seleccionar Agente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-1">
                      <Button
                        variant={!selectedAgent ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start text-xs h-8"
                        onClick={() => setSelectedAgent(null)}
                      >
                        <Brain className="h-3 w-3 mr-2 text-primary" />
                        Supervisor General
                      </Button>
                      {allAgents.map(agent => (
                        <Button
                          key={agent.id}
                          variant={selectedAgent?.id === agent.id ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start text-xs h-8"
                          onClick={() => handleInteractWithAgent(agent)}
                        >
                          <Bot className={cn("h-3 w-3 mr-2", agent.domain === 'erp' ? 'text-blue-500' : 'text-emerald-500')} />
                          {agent.name}
                          <div className={cn("w-1.5 h-1.5 rounded-full ml-auto",
                            agent.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              {/* Context panel for selected agent */}
              {selectedAgent && (
                <Card>
                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Módulo</span><span className="font-medium">{selectedAgent.module}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dominio</span><Badge variant="outline" className="text-[9px]">{selectedAgent.domain.toUpperCase()}</Badge></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Health</span><span className="font-medium">{selectedAgent.healthScore}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tareas</span><span>{selectedAgent.tasksCompleted}</span></div>
                    <Progress value={selectedAgent.healthScore} className="h-1.5 mt-1" />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Normativa Tab */}
        <TabsContent value="normativa" className="space-y-4">
          <RegulatoryIntelligencePanel />
        </TabsContent>

        {/* ObelixIA Supersupervisor Tab */}
        <TabsContent value="obelixia" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">ObelixIA-Supervisor</h3>
            <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Fase 2 · Live</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Supersupervisor transversal que coordina HR-Supervisor y Legal-Supervisor. Resuelve conflictos cross-domain y escala a revisión humana.
          </p>

          {/* ObelixIA KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /><div><p className="text-lg font-bold">{domainData.obelixiaInvocations.length}</p><p className="text-[10px] text-muted-foreground">Casos totales</p></div></div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><div><p className="text-lg font-bold">{domainData.obelixiaConflicts.length}</p><p className="text-[10px] text-muted-foreground">Conflictos</p></div></div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-violet-500" /><div><p className="text-lg font-bold">{domainData.obelixiaInvocations.filter(i => i.outcome_status === 'human_review').length}</p><p className="text-[10px] text-muted-foreground">Revisión humana</p></div></div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /><div><p className="text-lg font-bold">{domainData.obelixiaInvocations.filter(i => i.outcome_status === 'success' || i.outcome_status === 'conflict_resolved').length}</p><p className="text-[10px] text-muted-foreground">Resueltos</p></div></div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-blue-500" /><div><p className="text-lg font-bold">{domainData.regulatoryCrossDomainCases.length}</p><p className="text-[10px] text-muted-foreground">Normativos cross</p></div></div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><div><p className="text-lg font-bold">{domainData.regulatoryConflicts.length}</p><p className="text-[10px] text-muted-foreground">Conflictos reg.</p></div></div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Timer className="h-4 w-4 text-amber-500" /><div><p className="text-lg font-bold">{domainData.obelixiaInvocations.length > 0 ? Math.round(domainData.obelixiaInvocations.reduce((s, i) => s + i.execution_time_ms, 0) / domainData.obelixiaInvocations.length) : 0}ms</p><p className="text-[10px] text-muted-foreground">Tiempo medio</p></div></div></CardContent></Card>
          </div>

          {/* ObelixIA agent card from registry */}
          {domainData.crossAgents.filter(a => a.code === 'obelixia-supervisor').length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {domainData.crossAgents.filter(a => a.code === 'obelixia-supervisor').map(agent => (
                <RegistryAgentCard
                  key={agent.code}
                  agent={agent}
                  invocationCount={domainData.obelixiaInvocations.length}
                  lastInvocation={domainData.obelixiaInvocations[0]?.created_at}
                  onConfigure={(a) => { setRegistryConfigAgent(a); setShowRegistryConfig(true); }}
                />
              ))}
            </div>
          )}

          {/* Regulatory cross-domain cases */}
          {domainData.regulatoryCrossDomainCases.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-blue-500" />
                  Casos normativos cross-domain
                  <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-700 border-blue-500/30">Fase 2B</Badge>
                </CardTitle>
                <CardDescription className="text-xs">Cambios regulatorios escalados automáticamente por impacto multi-dominio</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {domainData.regulatoryCrossDomainCases.slice(0, 15).map((inv) => {
                      const meta = inv.metadata as any;
                      const riskLevel = meta?.final_risk_level || meta?.impact_level || 'medium';
                      const hasConflict = meta?.has_conflict;
                      const domains = meta?.impact_domains || [];
                      return (
                        <div key={inv.id} className={cn(
                          "p-3 rounded-lg border text-sm",
                          hasConflict ? "border-amber-500/30 bg-amber-500/5" :
                          inv.outcome_status === 'human_review' ? "border-violet-500/30 bg-violet-500/5" :
                          "bg-muted/30"
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Newspaper className="h-3.5 w-3.5 text-blue-500" />
                              {hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                              <span className="font-medium text-xs truncate max-w-[280px]">{meta?.document_title || inv.input_summary}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className={cn("text-[9px]",
                                riskLevel === 'critical' ? 'bg-destructive/10 text-destructive' :
                                riskLevel === 'high' ? 'bg-amber-500/10 text-amber-700' :
                                'bg-muted'
                              )}>{riskLevel}</Badge>
                              <Badge variant="outline" className={cn("text-[9px]",
                                inv.outcome_status === 'success' || inv.outcome_status === 'conflict_resolved' ? 'bg-emerald-500/10 text-emerald-700' :
                                inv.outcome_status === 'human_review' ? 'bg-violet-500/10 text-violet-700' :
                                'bg-muted'
                              )}>{inv.outcome_status}</Badge>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{inv.routing_reason}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {domains.map((d: string) => (
                              <Badge key={d} variant="outline" className="text-[9px]">{d}</Badge>
                            ))}
                            {meta?.adaptation_deadline && (
                              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700">⏱ {meta.adaptation_deadline}</Badge>
                            )}
                          </div>
                          {meta?.priority_actions?.length > 0 && (
                            <div className="mt-1.5 text-[10px] text-muted-foreground">
                              <span className="font-medium">Acciones:</span> {meta.priority_actions.slice(0, 2).join(' · ')}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>{inv.execution_time_ms}ms</span>
                            <span>{new Date(inv.created_at).toLocaleString('es')}</span>
                            {meta?.source_url && (
                              <a href={meta.source_url} target="_blank" rel="noopener" className="text-primary hover:underline">📄 Ver fuente</a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Recent cross-domain cases (non-regulatory) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Casos cross-domain recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {domainData.obelixiaInvocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin casos cross-domain aún</p>
                  <p className="text-xs mt-1">Los casos coordinados por ObelixIA aparecerán aquí</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {domainData.obelixiaInvocations.filter(i => (i.metadata as any)?.trigger_type !== 'regulatory_cross_domain').slice(0, 20).map((inv) => {
                      const meta = inv.metadata as any;
                      const hasConflict = meta?.has_conflict;
                      const riskLevel = meta?.final_risk_level || 'medium';
                      return (
                        <div key={inv.id} className={cn(
                          "p-3 rounded-lg border text-sm",
                          hasConflict ? "border-amber-500/30 bg-amber-500/5" :
                          inv.outcome_status === 'human_review' ? "border-violet-500/30 bg-violet-500/5" :
                          "bg-muted/30"
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                              {inv.outcome_status === 'human_review' && <Shield className="h-3.5 w-3.5 text-violet-500" />}
                              <span className="font-medium text-xs truncate max-w-[300px]">{inv.input_summary}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className={cn("text-[9px]",
                                riskLevel === 'critical' ? 'bg-destructive/10 text-destructive' :
                                riskLevel === 'high' ? 'bg-amber-500/10 text-amber-700' :
                                'bg-muted'
                              )}>{riskLevel}</Badge>
                              <Badge variant="outline" className={cn("text-[9px]",
                                inv.outcome_status === 'success' || inv.outcome_status === 'conflict_resolved' ? 'bg-emerald-500/10 text-emerald-700' :
                                inv.outcome_status === 'human_review' ? 'bg-violet-500/10 text-violet-700' :
                                'bg-muted'
                              )}>{inv.outcome_status}</Badge>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{inv.routing_reason}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>{inv.execution_time_ms}ms</span>
                            <span>Conf: {Math.round(inv.confidence_score * 100)}%</span>
                            <span>{new Date(inv.created_at).toLocaleString('es')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Insights y Recomendaciones</h3>
            <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Demo</Badge>
          </div>
          <div className="space-y-3">
            {SUPERVISOR_INSIGHTS.map(insight => (
              <Card key={insight.id} className={cn(
                "transition-colors",
                insight.priority === 'critical' ? 'border-destructive/30 bg-destructive/5' :
                insight.priority === 'high' ? 'border-amber-500/30 bg-amber-500/5' :
                'bg-muted/30'
              )}>
                <CardContent className="p-4 flex items-start gap-4">
                  {insight.type === 'alert' ? (
                    <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5",
                      insight.priority === 'critical' ? 'text-destructive' : 'text-amber-500')} />
                  ) : insight.type === 'optimization' ? (
                    <TrendingUp className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  ) : (
                    <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{insight.title}</p>
                      <Badge variant="outline" className={cn("text-[9px]",
                        insight.priority === 'critical' ? 'bg-destructive/10 text-destructive' :
                        insight.priority === 'high' ? 'bg-amber-500/10 text-amber-700' :
                        'bg-muted'
                      )}>{insight.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {insight.affectedAgents.map(agentId => (
                        <Badge key={agentId} variant="outline" className="text-[10px]">{agentId}</Badge>
                      ))}
                    </div>
                  </div>
                  {insight.suggestedAction && (
                    <Button size="sm" variant="outline" className="shrink-0">
                      {insight.suggestedAction}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* All registered agents catalog */}
          {domainData.agents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Catálogo completo de agentes
                  <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {domainData.agents.map(agent => (
                    <RegistryAgentCard
                      key={agent.code}
                      agent={agent}
                      invocationCount={domainData.invocations.filter(i => i.agent_code === agent.code).length}
                      onConfigure={(a) => { setRegistryConfigAgent(a); setShowRegistryConfig(true); }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Mock Agent Configuration Sheet */}
      <AgentConfigSheet
        open={showConfigSheet}
        onOpenChange={setShowConfigSheet}
        agent={configAgent ? {
          id: configAgent.id,
          name: configAgent.name,
          type: configAgent.module,
          description: `Agente especializado en ${configAgent.module}`,
          capabilities: configAgent.capabilities,
          domain: configAgent.domain
        } : null}
        agentType={configAgent?.domain || 'erp'}
      />

      {/* Registry Agent Configuration Sheet */}
      <RegistryAgentConfigSheet
        open={showRegistryConfig}
        onOpenChange={setShowRegistryConfig}
        agent={registryConfigAgent}
        onSaved={() => domainData.refresh()}
      />
    </div>
  );
}

export default SupervisorAgentsDashboard;
