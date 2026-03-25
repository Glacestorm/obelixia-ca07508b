/**
 * AdvancedAgentsDashboard - Dashboard Ultra-Avanzado de Agentes IA
 * Tendencias 2025-2027: Multi-agent orchestration, Agent Memory, MCP, Dynamic Module Registration
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  TrendingDown,
  Eye,
  Lightbulb,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Save,
  Cpu,
  Database,
  Share2,
  History,
  Layers,
  GitBranch,
  Workflow,
  Radio,
  Signal,
  Gauge,
  Timer,
  Loader2,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  HelpCircle,
  ExternalLink,
  Scale
} from 'lucide-react';
import { useERPModuleAgents, type DomainAgent, type ModuleAgent, type AgentDomain, DOMAIN_CONFIG, MODULE_AGENT_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';
import type { ModuleAgentType, SupervisorInsight, SupervisorStatus, InsightPriority, ExecutionMode } from '@/hooks/admin/agents/erpAgentTypes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// === TIPOS LOCALES ===
interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
}

interface AgentMetricHistory {
  timestamp: Date;
  value: number;
}

interface DynamicModule {
  id: string;
  name: string;
  type: string;
  domain: AgentDomain;
  description: string;
  capabilities: string[];
  createdAt: Date;
  isActive: boolean;
}

// Iconos por dominio
const DOMAIN_ICONS: Record<AgentDomain, React.ElementType> = {
  financial: Calculator,
  crm_cs: Users,
  compliance: Shield,
  operations: Cog,
  hr: UserCheck,
  analytics: BarChart3,
  legal: Scale
};

// Estado de métricas simuladas con historial
const generateMetricHistory = (baseValue: number, variance: number = 5): AgentMetricHistory[] => {
  const history: AgentMetricHistory[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    history.push({
      timestamp: new Date(now.getTime() - i * 3600000),
      value: Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * variance * 2))
    });
  }
  return history;
};

// Componente de Gráfico simple inline
function MiniChart({ data, color = 'text-primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.slice(-12).map((val, i) => (
        <div 
          key={i}
          className={cn("w-1 rounded-t bg-current opacity-60 hover:opacity-100 transition-opacity", color)}
          style={{ height: `${((val - min) / range) * 100}%`, minHeight: '2px' }}
        />
      ))}
    </div>
  );
}

// Componente de Chat con Agente
function AgentChat({ 
  agent, 
  onSendMessage, 
  messages,
  isLoading 
}: { 
  agent: ModuleAgent; 
  onSendMessage: (message: string) => void;
  messages: AgentMessage[];
  isLoading: boolean;
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-lg">
      <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{agent.name}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {agent.domain}
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Envía instrucciones precisas a este agente</p>
              <p className="text-xs mt-1">Especializado en: {agent.capabilities.slice(0, 3).join(', ')}</p>
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
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : msg.role === 'system'
                    ? 'bg-muted text-muted-foreground italic'
                    : 'bg-muted'
              )}>
                {msg.content}
                <p className="text-[10px] opacity-60 mt-1">
                  {format(msg.timestamp, 'HH:mm', { locale: es })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
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
          placeholder="Escribe una instrucción..."
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isLoading}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente de Métricas Detalladas por Agente
function AgentDetailedMetrics({ agent }: { agent: ModuleAgent }) {
  const metricsData = useMemo(() => ({
    healthHistory: generateMetricHistory(agent.healthScore),
    performanceHistory: generateMetricHistory(85),
    responseTimeHistory: generateMetricHistory(200, 50),
    successRateHistory: generateMetricHistory(92),
  }), [agent.healthScore]);

  return (
    <div className="space-y-4">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Health Score</span>
            <Gauge className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{agent.healthScore}%</p>
          <MiniChart data={metricsData.healthHistory.map(h => h.value)} color="text-emerald-500" />
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Performance</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">85%</p>
          <MiniChart data={metricsData.performanceHistory.map(h => h.value)} color="text-blue-500" />
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Tiempo Resp.</span>
            <Timer className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold">~200ms</p>
          <MiniChart data={metricsData.responseTimeHistory.map(h => h.value)} color="text-amber-500" />
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Éxito</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold">92%</p>
          <MiniChart data={metricsData.successRateHistory.map(h => h.value)} color="text-green-500" />
        </Card>
      </div>

      {/* Métricas específicas del agente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Métricas del Módulo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(agent.metrics).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-xs text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
            {Object.keys(agent.metrics).length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                Sin métricas registradas aún
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capacidades */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Capacidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {cap.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Configuración Avanzada de Agente
function AgentConfigPanel({ 
  agent, 
  onSave 
}: { 
  agent: ModuleAgent; 
  onSave: (config: Record<string, unknown>) => void;
}) {
  const [threshold, setThreshold] = useState(agent.confidenceThreshold);
  const [mode, setMode] = useState<ExecutionMode>(agent.executionMode);
  const [priority, setPriority] = useState(agent.priority);
  const [isActive, setIsActive] = useState(agent.status === 'active' || agent.status === 'analyzing');
  const [maxActionsPerHour, setMaxActionsPerHour] = useState(50);
  const [maxTokensPerAction, setMaxTokensPerAction] = useState(2000);
  const [requiresHumanReview, setRequiresHumanReview] = useState(false);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [escalationThreshold, setEscalationThreshold] = useState(60);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [learningRate, setLearningRate] = useState(70);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'minimal' | 'limited' | 'high'>('limited');
  const [responseTimeout, setResponseTimeout] = useState(30);
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [scheduledHours, setScheduledHours] = useState({ start: 0, end: 24 });
  const [allowWeekends, setAllowWeekends] = useState(true);
  const [logLevel, setLogLevel] = useState<'minimal' | 'standard' | 'verbose'>('standard');
  const [activeSection, setActiveSection] = useState('execution');

  const sections = [
    { id: 'execution', label: 'Ejecución', icon: Play },
    { id: 'thresholds', label: 'Umbrales', icon: Target },
    { id: 'limits', label: 'Límites', icon: Shield },
    { id: 'escalation', label: 'Escalado', icon: AlertTriangle },
    { id: 'learning', label: 'Aprendizaje', icon: Brain },
    { id: 'schedule', label: 'Horario', icon: Clock },
    { id: 'notifications', label: 'Alertas', icon: Activity },
    { id: 'advanced', label: 'Avanzado', icon: Cog },
  ];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 pb-2">
          {sections.map((s) => (
            <Button
              key={s.id}
              variant={activeSection === s.id ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs shrink-0 gap-1"
              onClick={() => setActiveSection(s.id)}
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <ScrollArea className="h-[400px] pr-2">
        {/* === EJECUCIÓN === */}
        {activeSection === 'execution' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Agente Activo</Label>
                <p className="text-xs text-muted-foreground">Activar o desactivar este agente</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Modo de Ejecución</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'autonomous' as ExecutionMode, label: 'Autónomo', desc: 'Actúa sin supervisión', icon: Zap },
                  { value: 'supervised' as ExecutionMode, label: 'Supervisado', desc: 'Requiere aprobación', icon: Eye },
                  { value: 'manual' as ExecutionMode, label: 'Manual', desc: 'Solo bajo petición', icon: UserCheck },
                ]).map((m) => (
                  <div
                    key={m.value}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all text-center",
                      mode === m.value ? "ring-2 ring-primary bg-primary/5 border-primary" : "hover:bg-muted/50"
                    )}
                    onClick={() => setMode(m.value)}
                  >
                    <m.icon className={cn("h-5 w-5 mx-auto mb-1", mode === m.value ? "text-primary" : "text-muted-foreground")} />
                    <p className="text-xs font-medium">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridad: {priority}</Label>
              <Slider value={[priority]} onValueChange={([v]) => setPriority(v)} min={1} max={5} step={1} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 - Baja</span><span>3 - Normal</span><span>5 - Crítica</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Revisión Humana Obligatoria</Label>
                <p className="text-xs text-muted-foreground">Todas las acciones requieren aprobación humana</p>
              </div>
              <Switch checked={requiresHumanReview} onCheckedChange={setRequiresHumanReview} />
            </div>
          </div>
        )}

        {/* === UMBRALES === */}
        {activeSection === 'thresholds' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Umbral de Confianza</Label>
                <Badge variant="outline" className="text-xs">{threshold}%</Badge>
              </div>
              <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={10} max={100} step={5} />
              <p className="text-[10px] text-muted-foreground">
                Solo ejecutará acciones con confianza ≥ {threshold}%. Debajo se escalará al supervisor.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Umbral de Escalado</Label>
                <Badge variant="outline" className="text-xs">{escalationThreshold}%</Badge>
              </div>
              <Slider value={[escalationThreshold]} onValueChange={([v]) => setEscalationThreshold(v)} min={10} max={100} step={5} />
              <p className="text-[10px] text-muted-foreground">
                Por debajo de {escalationThreshold}% se escala automáticamente al supervisor del dominio.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Nivel de Riesgo (EU AI Act)</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as typeof riskLevel)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">
                    <span className="flex items-center gap-2">🟢 Mínimo</span>
                  </SelectItem>
                  <SelectItem value="limited">
                    <span className="flex items-center gap-2">🟡 Limitado</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">🔴 Alto</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Clasificación según el EU AI Act. Nivel "Alto" activa auditorías obligatorias.
              </p>
            </div>
          </div>
        )}

        {/* === LÍMITES === */}
        {activeSection === 'limits' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Máx. acciones/hora</Label>
                <Badge variant="outline" className="text-xs">{maxActionsPerHour}</Badge>
              </div>
              <Slider value={[maxActionsPerHour]} onValueChange={([v]) => setMaxActionsPerHour(v)} min={1} max={200} step={5} />
              <p className="text-[10px] text-muted-foreground">Limita cuántas acciones puede ejecutar el agente por hora</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Máx. tokens por acción</Label>
                <Badge variant="outline" className="text-xs">{maxTokensPerAction}</Badge>
              </div>
              <Slider value={[maxTokensPerAction]} onValueChange={([v]) => setMaxTokensPerAction(v)} min={500} max={8000} step={250} />
              <p className="text-[10px] text-muted-foreground">Tokens máximos de IA por cada acción individual</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Timeout de respuesta</Label>
                <Badge variant="outline" className="text-xs">{responseTimeout}s</Badge>
              </div>
              <Slider value={[responseTimeout]} onValueChange={([v]) => setResponseTimeout(v)} min={5} max={120} step={5} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Reintentos en error</Label>
                <Badge variant="outline" className="text-xs">{retryAttempts}</Badge>
              </div>
              <Slider value={[retryAttempts]} onValueChange={([v]) => setRetryAttempts(v)} min={0} max={10} step={1} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Cooldown entre acciones</Label>
                <Badge variant="outline" className="text-xs">{cooldownMinutes} min</Badge>
              </div>
              <Slider value={[cooldownMinutes]} onValueChange={([v]) => setCooldownMinutes(v)} min={0} max={60} step={1} />
            </div>
          </div>
        )}

        {/* === ESCALADO === */}
        {activeSection === 'escalation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Auto-escalar al supervisor</Label>
                <p className="text-xs text-muted-foreground">Escalar automáticamente cuando la confianza es baja</p>
              </div>
              <Switch checked={autoEscalate} onCheckedChange={setAutoEscalate} />
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Reglas de escalado</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Confianza &lt; {escalationThreshold}% → Escalar al supervisor</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Error consecutivo × {retryAttempts} → Pausar y notificar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Exceso de {maxActionsPerHour} acciones/hora → Rate limit</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Modo de emergencia</p>
                  <p className="text-[10px] text-muted-foreground">
                    Si el agente detecta anomalías críticas, se pausará automáticamente y notificará al supervisor general.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === APRENDIZAJE === */}
        {activeSection === 'learning' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Aprendizaje continuo</Label>
                <p className="text-xs text-muted-foreground">El agente mejora con cada interacción</p>
              </div>
              <Switch checked={learningEnabled} onCheckedChange={setLearningEnabled} />
            </div>

            {learningEnabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tasa de aprendizaje</Label>
                    <Badge variant="outline" className="text-xs">{learningRate}%</Badge>
                  </div>
                  <Slider value={[learningRate]} onValueChange={([v]) => setLearningRate(v)} min={10} max={100} step={5} />
                  <p className="text-[10px] text-muted-foreground">
                    Cuánto peso dar a las experiencias recientes vs. conocimiento base
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Fuentes de aprendizaje</h4>
                  <div className="space-y-1.5 text-xs">
                    {['Feedback del usuario', 'Resultados de acciones', 'Patrones del dominio', 'Correcciones del supervisor'].map((source) => (
                      <div key={source} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* === HORARIO === */}
        {activeSection === 'schedule' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Horario de operación</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Inicio</Label>
                  <Select value={String(scheduledHours.start)} onValueChange={(v) => setScheduledHours(h => ({ ...h, start: Number(v) }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 25 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Select value={String(scheduledHours.end)} onValueChange={(v) => setScheduledHours(h => ({ ...h, end: Number(v) }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 25 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {scheduledHours.start === 0 && scheduledHours.end === 24 
                  ? '24/7 - El agente opera sin restricción horaria'
                  : `Activo de ${String(scheduledHours.start).padStart(2, '0')}:00 a ${String(scheduledHours.end).padStart(2, '0')}:00`
                }
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Operar en fines de semana</Label>
                <p className="text-xs text-muted-foreground">Permite ejecución sábados y domingos</p>
              </div>
              <Switch checked={allowWeekends} onCheckedChange={setAllowWeekends} />
            </div>
          </div>
        )}

        {/* === NOTIFICACIONES === */}
        {activeSection === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Notificaciones activas</Label>
                <p className="text-xs text-muted-foreground">Recibir alertas de este agente</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>

            {notificationsEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-xs">Notificar en errores</Label>
                    <p className="text-[10px] text-muted-foreground">Alertar cuando falle una acción</p>
                  </div>
                  <Switch checked={notifyOnError} onCheckedChange={setNotifyOnError} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-xs">Notificar en éxitos</Label>
                    <p className="text-[10px] text-muted-foreground">Alertar al completar acciones</p>
                  </div>
                  <Switch checked={notifyOnSuccess} onCheckedChange={setNotifyOnSuccess} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* === AVANZADO === */}
        {activeSection === 'advanced' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nivel de logging</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'minimal' as const, label: 'Mínimo', desc: 'Solo errores' },
                  { value: 'standard' as const, label: 'Estándar', desc: 'Acciones + errores' },
                  { value: 'verbose' as const, label: 'Detallado', desc: 'Todo el flujo' },
                ]).map((l) => (
                  <div
                    key={l.value}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-all text-center",
                      logLevel === l.value ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => setLogLevel(l.value)}
                  >
                    <p className="text-xs font-medium">{l.label}</p>
                    <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Capacidades del agente</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px]">
                    {cap.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Info técnica</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">ID</span><code className="bg-background px-1 rounded text-[10px]">{agent.id}</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dominio</span><span>{agent.domain}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{agent.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Health</span><span>{agent.healthScore}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Última actividad</span><span>{agent.lastActivity}</span></div>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      <Button 
        onClick={() => onSave({ 
          confidenceThreshold: threshold, 
          executionMode: mode, 
          priority,
          isActive,
          maxActionsPerHour,
          maxTokensPerAction,
          requiresHumanReview,
          autoEscalate,
          escalationThreshold,
          learningEnabled,
          learningRate,
          notificationsEnabled,
          notifyOnError,
          notifyOnSuccess,
          riskLevel,
          responseTimeout,
          retryAttempts,
          cooldownMinutes,
          scheduledHours,
          allowWeekends,
          logLevel,
        })}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        Guardar Configuración Completa
      </Button>
    </div>
  );
}

// Componente para Registrar Nuevo Módulo Dinámico
function RegisterModuleDialog({ 
  onRegister,
  existingDomains 
}: { 
  onRegister: (module: Omit<DynamicModule, 'id' | 'createdAt'>) => void;
  existingDomains: AgentDomain[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [domain, setDomain] = useState<AgentDomain>('crm_cs');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState('');

  const handleSubmit = () => {
    if (!name || !type || !description) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    onRegister({
      name,
      type: type.toLowerCase().replace(/\s+/g, '_'),
      domain,
      description,
      capabilities: capabilities.split(',').map(c => c.trim()).filter(Boolean),
      isActive: true
    });

    setOpen(false);
    setName('');
    setType('');
    setDescription('');
    setCapabilities('');
    toast.success('Módulo registrado y coordinado con el Supervisor');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Módulo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Registrar Nuevo Módulo ERP/CRM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Módulo *</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Agente Loyalty"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo (identificador) *</Label>
            <Input 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              placeholder="Ej: loyalty_program"
            />
          </div>

          <div className="space-y-2">
            <Label>Dominio</Label>
            <Select value={domain} onValueChange={(v) => setDomain(v as AgentDomain)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {existingDomains.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DOMAIN_CONFIG[d].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción *</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué hace este agente..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Capacidades (separadas por coma)</Label>
            <Input 
              value={capabilities} 
              onChange={(e) => setCapabilities(e.target.value)}
              placeholder="reward_tracking, tier_management, point_calculation"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === CONFIGURACIÓN AVANZADA DEL SUPERVISOR ===
function SupervisorConfigSheet({ 
  open, 
  onOpenChange, 
  supervisorStatus,
  toggleAutonomousMode,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  supervisorStatus: SupervisorStatus | null;
  toggleAutonomousMode: (enabled: boolean, intervalMs: number) => void;
}) {
  const [autonomousMode, setAutonomousMode] = useState(supervisorStatus?.autonomousMode || false);
  const [orchestrationInterval, setOrchestrationInterval] = useState(Math.round((supervisorStatus?.autonomousIntervalMs || 45000) / 1000));
  const [maxConcurrentDomains, setMaxConcurrentDomains] = useState(7);
  const [conflictResolution, setConflictResolution] = useState<'conservative' | 'balanced' | 'aggressive'>('conservative');
  const [globalConfidenceThreshold, setGlobalConfidenceThreshold] = useState(75);
  const [escalationPolicy, setEscalationPolicy] = useState<'auto' | 'manual' | 'hybrid'>('hybrid');
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [learningRate, setLearningRate] = useState(70);
  const [fewShotEnabled, setFewShotEnabled] = useState(true);
  const [maxFewShotCases, setMaxFewShotCases] = useState(10);
  const [parallelExecution, setParallelExecution] = useState(true);
  const [maxParallelAgents, setMaxParallelAgents] = useState(5);
  const [budgetLimitTokens, setBudgetLimitTokens] = useState(100000);
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(80);
  const [humanReviewCritical, setHumanReviewCritical] = useState(true);
  const [humanReviewHigh, setHumanReviewHigh] = useState(true);
  const [humanReviewMedium, setHumanReviewMedium] = useState(false);
  const [auditAllActions, setAuditAllActions] = useState(true);
  const [retentionDays, setRetentionDays] = useState(730);
  const [activeSection, setActiveSection] = useState('orchestration');
  const [scheduleStart, setScheduleStart] = useState(0);
  const [scheduleEnd, setScheduleEnd] = useState(24);
  const [allowWeekends, setAllowWeekends] = useState(true);
  const [notifyOnConflict, setNotifyOnConflict] = useState(true);
  const [notifyOnEscalation, setNotifyOnEscalation] = useState(true);
  const [notifyOnAnomaly, setNotifyOnAnomaly] = useState(true);

  const sections = [
    { id: 'orchestration', label: 'Orquestación', icon: Network },
    { id: 'autonomy', label: 'Autonomía', icon: Zap },
    { id: 'conflict', label: 'Conflictos', icon: GitBranch },
    { id: 'learning', label: 'Aprendizaje', icon: Brain },
    { id: 'budget', label: 'Presupuesto', icon: Calculator },
    { id: 'review', label: 'Rev. Humana', icon: Eye },
    { id: 'schedule', label: 'Horario', icon: Clock },
    { id: 'audit', label: 'Auditoría', icon: Shield },
    { id: 'alerts', label: 'Alertas', icon: Activity },
  ];

  const handleSave = () => {
    toggleAutonomousMode(autonomousMode, orchestrationInterval * 1000);
    toast.success('Configuración del supervisor actualizada');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-violet-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            Configuración del Supervisor General
          </SheetTitle>
          <SheetDescription>
            Orquestación multi-dominio · Health: {supervisorStatus?.systemHealth || 0}%
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Status banner */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              supervisorStatus?.status === 'running' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )} />
            <div className="flex-1">
              <p className="text-sm font-medium">Supervisor General ObelixIA</p>
              <p className="text-xs text-muted-foreground">
                {supervisorStatus?.activeDomains || 0} dominios · {supervisorStatus?.activeAgents || 0} agentes · {supervisorStatus?.conflictsResolved || 0} conflictos resueltos
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {supervisorStatus?.status === 'running' ? '🟢 Activo' : '🔴 Inactivo'}
            </Badge>
          </div>

          {/* Section tabs */}
          <ScrollArea className="w-full">
            <div className="flex gap-1 pb-2">
              {sections.map((s) => (
                <Button
                  key={s.id}
                  variant={activeSection === s.id ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs shrink-0 gap-1"
                  onClick={() => setActiveSection(s.id)}
                >
                  <s.icon className="h-3 w-3" />
                  {s.label}
                </Button>
              ))}
            </div>
          </ScrollArea>

          <ScrollArea className="h-[450px] pr-2">
            {/* === ORQUESTACIÓN === */}
            {activeSection === 'orchestration' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Máx. dominios concurrentes</Label>
                    <Badge variant="outline" className="text-xs">{maxConcurrentDomains}</Badge>
                  </div>
                  <Slider value={[maxConcurrentDomains]} onValueChange={([v]) => setMaxConcurrentDomains(v)} min={1} max={10} step={1} />
                  <p className="text-[10px] text-muted-foreground">Cuántos dominios puede coordinar simultáneamente</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Ejecución paralela</Label>
                    <p className="text-xs text-muted-foreground">Permite ejecutar múltiples agentes a la vez</p>
                  </div>
                  <Switch checked={parallelExecution} onCheckedChange={setParallelExecution} />
                </div>

                {parallelExecution && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Máx. agentes paralelos</Label>
                      <Badge variant="outline" className="text-xs">{maxParallelAgents}</Badge>
                    </div>
                    <Slider value={[maxParallelAgents]} onValueChange={([v]) => setMaxParallelAgents(v)} min={1} max={20} step={1} />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Umbral global de confianza</Label>
                    <Badge variant="outline" className="text-xs">{globalConfidenceThreshold}%</Badge>
                  </div>
                  <Slider value={[globalConfidenceThreshold]} onValueChange={([v]) => setGlobalConfidenceThreshold(v)} min={10} max={100} step={5} />
                  <p className="text-[10px] text-muted-foreground">Umbral mínimo para que el supervisor acepte resultados de los agentes</p>
                </div>
              </div>
            )}

            {/* === AUTONOMÍA === */}
            {activeSection === 'autonomy' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Modo autónomo</Label>
                    <p className="text-xs text-muted-foreground">El supervisor actúa sin intervención humana</p>
                  </div>
                  <Switch checked={autonomousMode} onCheckedChange={setAutonomousMode} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Intervalo de orquestación</Label>
                    <Badge variant="outline" className="text-xs">{orchestrationInterval}s</Badge>
                  </div>
                  <Slider value={[orchestrationInterval]} onValueChange={([v]) => setOrchestrationInterval(v)} min={10} max={300} step={5} />
                  <p className="text-[10px] text-muted-foreground">Cada cuántos segundos ejecuta un ciclo de orquestación</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Política de escalado</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'auto' as const, label: 'Automático', desc: 'Escala sin intervención', icon: Zap },
                      { value: 'hybrid' as const, label: 'Híbrido', desc: 'Auto + revisión crítica', icon: Eye },
                      { value: 'manual' as const, label: 'Manual', desc: 'Siempre requiere aprobación', icon: UserCheck },
                    ]).map((p) => (
                      <div
                        key={p.value}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all text-center",
                          escalationPolicy === p.value ? "ring-2 ring-primary bg-primary/5 border-primary" : "hover:bg-muted/50"
                        )}
                        onClick={() => setEscalationPolicy(p.value)}
                      >
                        <p.icon className={cn("h-5 w-5 mx-auto mb-1", escalationPolicy === p.value ? "text-primary" : "text-muted-foreground")} />
                        <p className="text-xs font-medium">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === CONFLICTOS === */}
            {activeSection === 'conflict' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estrategia de resolución de conflictos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'conservative' as const, label: 'Conservadora', desc: 'Prioriza seguridad', color: 'text-blue-500' },
                      { value: 'balanced' as const, label: 'Equilibrada', desc: 'Balance riesgo/eficiencia', color: 'text-amber-500' },
                      { value: 'aggressive' as const, label: 'Agresiva', desc: 'Prioriza eficiencia', color: 'text-red-500' },
                    ]).map((s) => (
                      <div
                        key={s.value}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all text-center",
                          conflictResolution === s.value ? "ring-2 ring-primary bg-primary/5 border-primary" : "hover:bg-muted/50"
                        )}
                        onClick={() => setConflictResolution(s.value)}
                      >
                        <GitBranch className={cn("h-5 w-5 mx-auto mb-1", s.color)} />
                        <p className="text-xs font-medium">{s.label}</p>
                        <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Protocolo de conflictos</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>HR ↔ Legal: Prioriza recomendación más conservadora</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Discrepancia de riesgo &gt; 2 niveles: Revisión humana obligatoria</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Conflicto no resuelto: Escalar a super-supervisor</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === APRENDIZAJE === */}
            {activeSection === 'learning' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Aprendizaje continuo</Label>
                    <p className="text-xs text-muted-foreground">Mejora con cada orquestación</p>
                  </div>
                  <Switch checked={learningEnabled} onCheckedChange={setLearningEnabled} />
                </div>

                {learningEnabled && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Tasa de aprendizaje</Label>
                        <Badge variant="outline" className="text-xs">{learningRate}%</Badge>
                      </div>
                      <Slider value={[learningRate]} onValueChange={([v]) => setLearningRate(v)} min={10} max={100} step={5} />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium">Few-shot learning</Label>
                        <p className="text-xs text-muted-foreground">Usa casos validados (erp_validated_cases) como ejemplos</p>
                      </div>
                      <Switch checked={fewShotEnabled} onCheckedChange={setFewShotEnabled} />
                    </div>

                    {fewShotEnabled && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Máx. casos few-shot</Label>
                          <Badge variant="outline" className="text-xs">{maxFewShotCases}</Badge>
                        </div>
                        <Slider value={[maxFewShotCases]} onValueChange={([v]) => setMaxFewShotCases(v)} min={1} max={50} step={1} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* === PRESUPUESTO === */}
            {activeSection === 'budget' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Límite diario de tokens</Label>
                    <Badge variant="outline" className="text-xs">{(budgetLimitTokens / 1000).toFixed(0)}K</Badge>
                  </div>
                  <Slider value={[budgetLimitTokens]} onValueChange={([v]) => setBudgetLimitTokens(v)} min={10000} max={500000} step={10000} />
                  <p className="text-[10px] text-muted-foreground">Tokens máximos de IA que puede consumir el supervisor al día</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Alerta de presupuesto</Label>
                    <Badge variant="outline" className="text-xs">{budgetAlertThreshold}%</Badge>
                  </div>
                  <Slider value={[budgetAlertThreshold]} onValueChange={([v]) => setBudgetAlertThreshold(v)} min={50} max={95} step={5} />
                  <p className="text-[10px] text-muted-foreground">Notificar cuando se alcance este % del presupuesto</p>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Al alcanzar el límite, el supervisor pasará a modo manual hasta el siguiente día.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* === REVISIÓN HUMANA === */}
            {activeSection === 'review' && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Define qué prioridades requieren aprobación humana antes de ejecutar</p>
                
                <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                  <div>
                    <Label className="text-sm font-medium">🔴 Prioridad Crítica</Label>
                    <p className="text-xs text-muted-foreground">Despidos, sanciones, datos sensibles</p>
                  </div>
                  <Switch checked={humanReviewCritical} onCheckedChange={setHumanReviewCritical} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div>
                    <Label className="text-sm font-medium">🟠 Prioridad Alta</Label>
                    <p className="text-xs text-muted-foreground">Contratos, cambios salariales, permisos especiales</p>
                  </div>
                  <Switch checked={humanReviewHigh} onCheckedChange={setHumanReviewHigh} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">🟡 Prioridad Media</Label>
                    <p className="text-xs text-muted-foreground">Informes, análisis, recomendaciones</p>
                  </div>
                  <Switch checked={humanReviewMedium} onCheckedChange={setHumanReviewMedium} />
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Las acciones de prioridad baja se ejecutan siempre sin revisión cuando el modo es autónomo.
                  </p>
                </div>
              </div>
            )}

            {/* === HORARIO === */}
            {activeSection === 'schedule' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Horario de operación del supervisor</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Inicio</Label>
                      <Select value={String(scheduleStart)} onValueChange={(v) => setScheduleStart(Number(v))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 25 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fin</Label>
                      <Select value={String(scheduleEnd)} onValueChange={(v) => setScheduleEnd(Number(v))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 25 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Operar en fines de semana</Label>
                    <p className="text-xs text-muted-foreground">Permite orquestación sábados y domingos</p>
                  </div>
                  <Switch checked={allowWeekends} onCheckedChange={setAllowWeekends} />
                </div>
              </div>
            )}

            {/* === AUDITORÍA === */}
            {activeSection === 'audit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Auditar todas las acciones</Label>
                    <p className="text-xs text-muted-foreground">Registra cada decisión del supervisor (GDPR/EU AI Act)</p>
                  </div>
                  <Switch checked={auditAllActions} onCheckedChange={setAuditAllActions} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Retención de logs</Label>
                    <Badge variant="outline" className="text-xs">{retentionDays} días ({(retentionDays / 365).toFixed(1)} años)</Badge>
                  </div>
                  <Slider value={[retentionDays]} onValueChange={([v]) => setRetentionDays(v)} min={90} max={2555} step={30} />
                  <p className="text-[10px] text-muted-foreground">GDPR/LOPDGDD requiere mínimo 2 años para decisiones automatizadas</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Datos auditados</h4>
                  <div className="space-y-1.5 text-xs">
                    {[
                      'Decisiones de orquestación',
                      'Escalados entre dominios',
                      'Conflictos resueltos (valores old/new)',
                      'Cambios de configuración',
                      'Tokens consumidos por acción',
                      'Intervenciones humanas',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === ALERTAS === */}
            {activeSection === 'alerts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Notificar conflictos entre dominios</Label>
                    <p className="text-xs text-muted-foreground">HR vs Legal, CRM vs Compliance, etc.</p>
                  </div>
                  <Switch checked={notifyOnConflict} onCheckedChange={setNotifyOnConflict} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Notificar escalados</Label>
                    <p className="text-xs text-muted-foreground">Cuando un agente escala al supervisor</p>
                  </div>
                  <Switch checked={notifyOnEscalation} onCheckedChange={setNotifyOnEscalation} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Notificar anomalías</Label>
                    <p className="text-xs text-muted-foreground">Patrones inusuales detectados por el supervisor</p>
                  </div>
                  <Switch checked={notifyOnAnomaly} onCheckedChange={setNotifyOnAnomaly} />
                </div>
              </div>
            )}
          </ScrollArea>

          <Button onClick={handleSave} className="w-full mt-4">
            <Save className="h-4 w-4 mr-2" />
            Guardar Configuración del Supervisor
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// === COMPONENTE PRINCIPAL ===
export function AdvancedAgentsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'supervisor' | 'supersupervisor' | 'agents' | 'insights' | 'registry'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<ModuleAgent | null>(null);
  const [agentMessages, setAgentMessages] = useState<Record<string, AgentMessage[]>>({});
  const [dynamicModules, setDynamicModules] = useState<DynamicModule[]>([]);
  const [isAgentChatLoading, setIsAgentChatLoading] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [configAgent, setConfigAgent] = useState<ModuleAgent | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [supervisorConfigOpen, setSupervisorConfigOpen] = useState(false);
  const [ssConfigOpen, setSSConfigOpen] = useState(false);

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

  // Inicializar agentes solo una vez al montar - NO usar startAutoRefresh como dependencia
  useEffect(() => {
    initializeAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estadísticas globales
  const stats = useMemo(() => {
    const totalAgents = domainAgents.reduce((sum, d) => sum + d.moduleAgents.length, 0);
    const activeAgents = domainAgents.reduce((sum, d) => 
      sum + d.moduleAgents.filter(a => a.status === 'active' || a.status === 'analyzing').length, 0
    );
    const totalDomains = domainAgents.length;
    const activeDomains = domainAgents.filter(d => d.status === 'active' || d.status === 'coordinating').length;

    return { totalAgents, activeAgents, totalDomains, activeDomains };
  }, [domainAgents]);

  // Enviar mensaje a agente
  const handleSendAgentMessage = useCallback(async (message: string) => {
    if (!selectedAgent) return;

    const userMsg: AgentMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      agentId: selectedAgent.id
    };

    setAgentMessages(prev => ({
      ...prev,
      [selectedAgent.id]: [...(prev[selectedAgent.id] || []), userMsg]
    }));

    setIsAgentChatLoading(true);

    try {
      const result = await executeModuleAgent(selectedAgent.id, { 
        instruction: message,
        userRequest: true 
      });

      const agentResponse: AgentMessage = {
        id: `msg_${Date.now()}_agent`,
        role: 'agent',
        content: result 
          ? `✅ Instrucción procesada. ${JSON.stringify(result.recommendations || result.actions_taken || 'Completado').slice(0, 200)}...`
          : 'He procesado tu instrucción. Revisa los insights para más detalles.',
        timestamp: new Date(),
        agentId: selectedAgent.id
      };

      setAgentMessages(prev => ({
        ...prev,
        [selectedAgent.id]: [...(prev[selectedAgent.id] || []), agentResponse]
      }));
    } catch {
      const errorMsg: AgentMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'system',
        content: 'Error al procesar la instrucción. Intenta de nuevo.',
        timestamp: new Date(),
        agentId: selectedAgent.id
      };
      setAgentMessages(prev => ({
        ...prev,
        [selectedAgent.id]: [...(prev[selectedAgent.id] || []), errorMsg]
      }));
    } finally {
      setIsAgentChatLoading(false);
    }
  }, [selectedAgent, executeModuleAgent]);

  // Registrar módulo dinámico
  const handleRegisterModule = useCallback((module: Omit<DynamicModule, 'id' | 'createdAt'>) => {
    const newModule: DynamicModule = {
      ...module,
      id: `dynamic_${Date.now()}`,
      createdAt: new Date()
    };
    setDynamicModules(prev => [...prev, newModule]);

    // Notificar al supervisor
    supervisorOrchestrate(`Integrar nuevo módulo: ${module.name} en dominio ${module.domain}`, 'medium');
  }, [supervisorOrchestrate]);

  const toggleDomainExpand = (domainId: string) => {
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

  const getPriorityColor = (priority: InsightPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Centro de Control de Agentes IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Multi-Agent Orchestration • Dynamic Module Registry • 2025-2027 Architecture
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RegisterModuleDialog 
            onRegister={handleRegisterModule}
            existingDomains={Object.keys(DOMAIN_CONFIG) as AgentDomain[]}
          />
          <Button variant="outline" size="sm" onClick={initializeAgents} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Sync
          </Button>
          <Button 
            size="sm" 
            onClick={() => supervisorOrchestrate('Optimización global con insights predictivos', 'high')}
            disabled={isLoading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Orquestar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              supervisorStatus?.status === 'running' ? 'bg-green-500' : 'bg-muted'
            )} />
            <span className="text-xs text-muted-foreground">Supervisor</span>
          </div>
          <p className="text-lg font-bold capitalize mt-1">
            {supervisorStatus?.status || 'Offline'}
          </p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Dominios</span>
          </div>
          <p className="text-lg font-bold mt-1">
            {stats.activeDomains}/{stats.totalDomains}
          </p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Agentes</span>
          </div>
          <p className="text-lg font-bold mt-1">
            {stats.activeAgents}/{stats.totalAgents}
          </p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Health</span>
          </div>
          <p className="text-lg font-bold mt-1">
            {supervisorStatus?.systemHealth || 0}%
          </p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Insights</span>
          </div>
          <p className="text-lg font-bold mt-1">{insights.length}</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-500" />
            <span className="text-xs text-muted-foreground">Dinámicos</span>
          </div>
          <p className="text-lg font-bold mt-1">{dynamicModules.length}</p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-1">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="supersupervisor" className="gap-1">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">ObelixIA</span>
          </TabsTrigger>
          <TabsTrigger value="supervisor" className="gap-1">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Supervisor</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Agentes</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-1">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Registry</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Dominios con sus agentes */}
            <div className="lg:col-span-2 space-y-3">
              {domainAgents.map((domain) => {
                const DomainIcon = DOMAIN_ICONS[domain.domain];
                const config = DOMAIN_CONFIG[domain.domain];
                const isExpanded = expandedDomains.has(domain.id);
                const activeCount = domain.moduleAgents.filter(a => 
                  a.status === 'active' || a.status === 'analyzing'
                ).length;

                return (
                  <Collapsible 
                    key={domain.id} 
                    open={isExpanded}
                    onOpenChange={() => toggleDomainExpand(domain.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className={cn(
                          "cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg",
                          "bg-gradient-to-r",
                          config.color.replace('from-', 'from-').replace(' to-', '/10 to-') + '/5'
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", config.color)}>
                                <DomainIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{domain.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {activeCount}/{domain.moduleAgents.length} agentes activos
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", getStatusColor(domain.status))}>
                                {domain.status}
                              </Badge>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {domain.moduleAgents.map((agent) => (
                              <div 
                                key={agent.id}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                                  selectedAgent?.id === agent.id && "ring-2 ring-primary"
                                )}
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setActiveTab('agents');
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{agent.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfigAgent(agent);
                                        setConfigDialogOpen(true);
                                      }}
                                      title="Configurar agente"
                                    >
                                      <Settings className="h-3.5 w-3.5" />
                                    </Button>
                                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(agent.status))} />
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                  {agent.description}
                                </p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Health: {agent.healthScore}%</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {agent.executionMode === 'autonomous' ? 'Autónomo' : agent.executionMode === 'supervised' ? 'Supervisado' : 'Manual'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => coordinateDomain(domain.id, 'Coordinación completa')}
                              disabled={isLoading}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Coordinar
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>

            {/* Insights recientes */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Insights Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {insights.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin insights aún</p>
                      <p className="text-xs">Ejecuta el orquestador para generar</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {insights.slice(0, 10).map((insight) => (
                        <div key={insight.id} className="p-3 rounded-lg border">
                          <div className="flex items-start gap-2">
                            <Badge className={cn("text-[10px] shrink-0", getPriorityColor(insight.priority))}>
                              {insight.priority}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{insight.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {insight.description}
                              </p>
                              {insight.suggestedAction && (
                                <p className="text-xs text-primary mt-1">
                                  → {insight.suggestedAction}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Supervisor Tab */}
        <TabsContent value="supervisor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Supervisor General
                    </CardTitle>
                    <CardDescription>
                      Orquestación multi-agente con inteligencia predictiva
                    </CardDescription>
                  </div>
                   <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSupervisorConfigOpen(true)}
                      title="Configuración avanzada del supervisor"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={supervisorStatus?.autonomousMode || false}
                      onCheckedChange={(checked) => toggleAutonomousMode(checked, 45000)}
                    />
                    <span className="text-xs">Auto</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Métricas del supervisor */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">Conflictos Resueltos</p>
                    <p className="text-2xl font-bold">{supervisorStatus?.conflictsResolved || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">Decisiones Pendientes</p>
                    <p className="text-2xl font-bold">{supervisorStatus?.pendingDecisions || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">Utilización</p>
                    <p className="text-2xl font-bold">{supervisorStatus?.resourceUtilization || 0}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">Aprendizaje</p>
                    <p className="text-2xl font-bold">{supervisorStatus?.learningProgress || 0}%</p>
                  </div>
                </div>

                {/* Progreso de aprendizaje */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso de Aprendizaje</span>
                    <span>{supervisorStatus?.learningProgress || 0}%</span>
                  </div>
                  <Progress value={supervisorStatus?.learningProgress || 0} />
                </div>

                {/* Acciones del supervisor */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Distribuir Tareas', action: 'distribute_tasks', icon: Share2 },
                    { label: 'Análisis Predictivo', action: 'predictive_analysis', icon: TrendingUp },
                    { label: 'Resolver Conflictos', action: 'resolve_conflicts', icon: GitBranch },
                    { label: 'Auto-Optimizar', action: 'auto_optimize', icon: Sparkles },
                  ].map((item) => (
                    <Button
                      key={item.action}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => supervisorOrchestrate(item.action, 'medium')}
                      disabled={isLoading}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat con Supervisor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Instrucciones al Supervisor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AgentChat
                  agent={{
                    id: 'supervisor',
                    name: 'Supervisor General',
                    domain: 'analytics' as AgentDomain,
                    type: 'reporting' as ModuleAgentType,
                    description: 'Coordina todos los agentes',
                    status: supervisorStatus?.status === 'running' ? 'active' : 'idle',
                    capabilities: ['orchestration', 'conflict_resolution', 'optimization'],
                    metrics: {},
                    lastActivity: new Date().toISOString(),
                    healthScore: supervisorStatus?.systemHealth || 100,
                    confidenceThreshold: 80,
                    executionMode: 'autonomous',
                    priority: 1
                  }}
                  messages={agentMessages['supervisor'] || []}
                  onSendMessage={async (msg) => {
                    const userMsg: AgentMessage = {
                      id: `msg_${Date.now()}`,
                      role: 'user',
                      content: msg,
                      timestamp: new Date()
                    };
                    setAgentMessages(prev => ({
                      ...prev,
                      supervisor: [...(prev['supervisor'] || []), userMsg]
                    }));
                    setIsAgentChatLoading(true);
                    try {
                      await supervisorOrchestrate(msg, 'medium');
                      const resp: AgentMessage = {
                        id: `msg_${Date.now()}_resp`,
                        role: 'agent',
                        content: '✅ Instrucción procesada. Revisa la pestaña Insights para ver los resultados.',
                        timestamp: new Date()
                      };
                      setAgentMessages(prev => ({
                        ...prev,
                        supervisor: [...(prev['supervisor'] || []), resp]
                      }));
                    } finally {
                      setIsAgentChatLoading(false);
                    }
                  }}
                  isLoading={isAgentChatLoading}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Lista de agentes */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Seleccionar Agente</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {domainAgents.flatMap(d => d.moduleAgents).map((agent) => (
                      <div
                        key={agent.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                          selectedAgent?.id === agent.id && "ring-2 ring-primary bg-muted/30"
                        )}
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{agent.name}</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfigAgent(agent);
                                setConfigDialogOpen(true);
                              }}
                              title="Configurar agente"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                            <div className={cn("w-2 h-2 rounded-full", getStatusColor(agent.status))} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{agent.domain}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Detalle del agente seleccionado */}
            <div className="lg:col-span-2">
              {selectedAgent ? (
                <Tabs defaultValue="metrics">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="metrics">Métricas</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="config">Config</TabsTrigger>
                  </TabsList>

                  <TabsContent value="metrics">
                    <AgentDetailedMetrics agent={selectedAgent} />
                  </TabsContent>

                  <TabsContent value="chat">
                    <AgentChat
                      agent={selectedAgent}
                      messages={agentMessages[selectedAgent.id] || []}
                      onSendMessage={handleSendAgentMessage}
                      isLoading={isAgentChatLoading}
                    />
                  </TabsContent>

                  <TabsContent value="config">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Configuración de {selectedAgent.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AgentConfigPanel
                          agent={selectedAgent}
                          onSave={(cfg) => {
                            configureAgent(selectedAgent.id, cfg);
                          }}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card className="h-[500px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Selecciona un agente para ver sus detalles</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Insights Predictivos</h3>
            <Button 
              size="sm" 
              onClick={() => supervisorOrchestrate('Generar insights predictivos completos', 'high')}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Generar Nuevos
            </Button>
          </div>

          {insights.length === 0 ? (
            <Card className="p-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No hay insights generados</p>
              <p className="text-sm text-muted-foreground">Ejecuta el orquestador para generar insights predictivos</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight) => (
                <Card key={insight.id} className="overflow-hidden">
                  <CardHeader className={cn(
                    "pb-2",
                    insight.priority === 'critical' && "bg-red-500/10",
                    insight.priority === 'high' && "bg-orange-500/10",
                    insight.priority === 'medium' && "bg-yellow-500/10",
                    insight.priority === 'low' && "bg-blue-500/10"
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge className={cn("mb-2", getPriorityColor(insight.priority))}>
                          {insight.priority}
                        </Badge>
                        <CardTitle className="text-base">{insight.title}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {insight.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      {insight.description}
                    </p>
                    {insight.suggestedAction && (
                      <div className="p-2 rounded bg-primary/5 border-l-2 border-primary">
                        <p className="text-xs font-medium text-primary">Acción Sugerida:</p>
                        <p className="text-sm">{insight.suggestedAction}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Confianza: {insight.confidence}%</span>
                      <span>Dominios: {insight.affectedDomains.join(', ')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Registry Tab */}
        <TabsContent value="registry" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Registro de Módulos Dinámicos</h3>
              <p className="text-sm text-muted-foreground">
                Añade nuevos módulos ERP/CRM que se coordinarán automáticamente con el Supervisor
              </p>
            </div>
            <RegisterModuleDialog 
              onRegister={handleRegisterModule}
              existingDomains={Object.keys(DOMAIN_CONFIG) as AgentDomain[]}
            />
          </div>

          {dynamicModules.length === 0 ? (
            <Card className="p-12 text-center">
              <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No hay módulos dinámicos registrados</p>
              <p className="text-sm text-muted-foreground">
                Usa el botón "Registrar Módulo" para añadir nuevos agentes especializados
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dynamicModules.map((module) => (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{module.name}</CardTitle>
                      <Switch 
                        checked={module.isActive}
                        onCheckedChange={(checked) => {
                          setDynamicModules(prev => prev.map(m => 
                            m.id === module.id ? { ...m, isActive: checked } : m
                          ));
                        }}
                      />
                    </div>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{module.domain}</Badge>
                        <Badge variant="secondary">{module.type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {module.capabilities.slice(0, 3).map((cap, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {module.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{module.capabilities.length - 3}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Creado: {format(module.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Información sobre tendencias */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tendencias 2025-2027 Implementadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Multi-Agent Orchestration', desc: 'Coordinación jerárquica Supervisor → Dominios → Módulos', icon: Network },
                  { title: 'Dynamic Module Registry', desc: 'Registro y coordinación automática de nuevos módulos', icon: Layers },
                  { title: 'Agent-to-Agent Communication', desc: 'Comunicación directa entre agentes para resolver tareas', icon: Share2 },
                  { title: 'Predictive Insights', desc: 'Análisis predictivo con IA para optimización proactiva', icon: Sparkles },
                  { title: 'Autonomous Mode', desc: 'Ejecución autónoma con supervisión configurable', icon: Cpu },
                  { title: 'Interactive Chat', desc: 'Instrucciones precisas a cada agente vía chat', icon: MessageSquare },
                ].map((trend, i) => (
                  <div key={i} className="p-3 rounded-lg border flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      <trend.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{trend.title}</p>
                      <p className="text-xs text-muted-foreground">{trend.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer info */}
      <div className="text-center text-xs text-muted-foreground">
        Última sincronización: {lastRefresh ? formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true }) : 'Nunca'} • 
        Arquitectura: Multi-Agent Hierarchical Orchestration v2.0
      </div>

      {/* Sheet de Configuración Avanzada de Agente */}
      <Sheet open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-violet-600">
                <Settings className="h-4 w-4 text-white" />
              </div>
              Configuración Avanzada
            </SheetTitle>
            <SheetDescription>
              {configAgent?.name} · {configAgent?.domain?.toUpperCase()}
            </SheetDescription>
          </SheetHeader>
          {configAgent && (
            <div className="mt-4 space-y-4">
              {/* Info del agente */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className={cn("w-2.5 h-2.5 rounded-full", getStatusColor(configAgent.status))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{configAgent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{configAgent.description}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {configAgent.executionMode === 'autonomous' ? '🤖 Autónomo' : configAgent.executionMode === 'supervised' ? '👁️ Supervisado' : '✋ Manual'}
                </Badge>
                <Badge variant="outline" className="text-xs shrink-0">
                  Health: {configAgent.healthScore}%
                </Badge>
              </div>

              <AgentConfigPanel
                agent={configAgent}
                onSave={(cfg) => {
                  configureAgent(configAgent.id, cfg);
                  setConfigDialogOpen(false);
                  toast.success(`Configuración de ${configAgent.name} actualizada`);
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de Configuración Avanzada del Supervisor */}
      <SupervisorConfigSheet
        open={supervisorConfigOpen}
        onOpenChange={setSupervisorConfigOpen}
        supervisorStatus={supervisorStatus}
        toggleAutonomousMode={toggleAutonomousMode}
      />
    </div>
  );
}

export default AdvancedAgentsDashboard;
