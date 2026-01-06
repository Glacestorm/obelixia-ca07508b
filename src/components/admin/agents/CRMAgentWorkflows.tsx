/**
 * CRMAgentWorkflows - Sistema de Workflows Automatizados entre Agentes CRM
 * Cadenas de acciones orquestadas con triggers y condiciones
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow,
  Play,
  Pause,
  Plus,
  Settings,
  Trash2,
  ChevronRight,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  GitBranch,
  Heart,
  TrendingUp,
  MessageSquare,
  Calendar,
  BarChart3,
  RefreshCw,
  Loader2,
  Eye,
  Copy,
  MoreVertical,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// === TIPOS ===
interface WorkflowStep {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  condition?: string;
  timeout?: number;
  order: number;
}

interface CRMWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'event' | 'schedule' | 'manual' | 'condition';
    config: Record<string, unknown>;
  };
  steps: WorkflowStep[];
  isActive: boolean;
  lastRun?: Date;
  runCount: number;
  successRate: number;
  avgDuration: number;
  createdAt: Date;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentStep: number;
  results: Array<{
    stepId: string;
    status: 'success' | 'failed' | 'skipped';
    output?: unknown;
    error?: string;
    duration: number;
  }>;
}

interface CRMAgentWorkflowsProps {
  className?: string;
}

// === AGENTES CRM ===
const CRM_AGENTS = [
  { id: 'lead_scoring', name: 'Lead Scoring AI', icon: Target, color: 'from-blue-500 to-cyan-500' },
  { id: 'pipeline_optimizer', name: 'Pipeline Optimizer', icon: GitBranch, color: 'from-violet-500 to-purple-500' },
  { id: 'churn_predictor', name: 'Churn Predictor', icon: AlertTriangle, color: 'from-amber-500 to-orange-500' },
  { id: 'upsell_detector', name: 'Upsell Detector', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  { id: 'customer_success', name: 'Customer Success', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { id: 'engagement_analyzer', name: 'Engagement Analyzer', icon: MessageSquare, color: 'from-indigo-500 to-blue-500' },
  { id: 'activity_optimizer', name: 'Activity Optimizer', icon: Calendar, color: 'from-teal-500 to-cyan-500' },
  { id: 'forecast_analyst', name: 'Forecast Analyst', icon: BarChart3, color: 'from-purple-500 to-violet-500' },
];

// === ACCIONES POR AGENTE ===
const AGENT_ACTIONS: Record<string, string[]> = {
  lead_scoring: ['Puntuar lead', 'Clasificar por tier', 'Detectar señales de compra', 'Priorizar seguimiento'],
  pipeline_optimizer: ['Analizar etapa', 'Detectar bottlenecks', 'Sugerir siguiente paso', 'Calcular probabilidad'],
  churn_predictor: ['Calcular riesgo', 'Identificar señales', 'Generar alerta', 'Proponer retención'],
  upsell_detector: ['Buscar oportunidades', 'Calcular potencial', 'Recomendar productos', 'Crear propuesta'],
  customer_success: ['Evaluar salud', 'Detectar problemas', 'Proponer acciones', 'Generar reporte'],
  engagement_analyzer: ['Medir engagement', 'Analizar patrones', 'Detectar anomalías', 'Recomendar contenido'],
  activity_optimizer: ['Priorizar tareas', 'Sugerir horarios', 'Detectar conflictos', 'Optimizar agenda'],
  forecast_analyst: ['Proyectar revenue', 'Analizar tendencias', 'Ajustar predicciones', 'Generar escenarios'],
};

// === TEMPLATES DE WORKFLOWS ===
const WORKFLOW_TEMPLATES: Omit<CRMWorkflow, 'id' | 'lastRun' | 'runCount' | 'successRate' | 'avgDuration' | 'createdAt'>[] = [
  {
    name: 'Lead Qualification Pipeline',
    description: 'Cualifica leads automáticamente y los asigna según score',
    trigger: { type: 'event', config: { event: 'new_lead' } },
    steps: [
      { id: '1', agentId: 'lead_scoring', agentName: 'Lead Scoring AI', action: 'Puntuar lead', order: 1 },
      { id: '2', agentId: 'lead_scoring', agentName: 'Lead Scoring AI', action: 'Clasificar por tier', condition: 'score > 50', order: 2 },
      { id: '3', agentId: 'engagement_analyzer', agentName: 'Engagement Analyzer', action: 'Medir engagement', order: 3 },
    ],
    isActive: true,
  },
  {
    name: 'Churn Prevention Workflow',
    description: 'Detecta riesgo de churn y activa retención automática',
    trigger: { type: 'schedule', config: { cron: '0 9 * * *' } },
    steps: [
      { id: '1', agentId: 'churn_predictor', agentName: 'Churn Predictor', action: 'Calcular riesgo', order: 1 },
      { id: '2', agentId: 'churn_predictor', agentName: 'Churn Predictor', action: 'Generar alerta', condition: 'riskLevel > 70', order: 2 },
      { id: '3', agentId: 'customer_success', agentName: 'Customer Success', action: 'Proponer acciones', order: 3 },
    ],
    isActive: true,
  },
  {
    name: 'Upsell Opportunity Flow',
    description: 'Identifica y actúa sobre oportunidades de expansión',
    trigger: { type: 'condition', config: { condition: 'customer.usage > threshold' } },
    steps: [
      { id: '1', agentId: 'upsell_detector', agentName: 'Upsell Detector', action: 'Buscar oportunidades', order: 1 },
      { id: '2', agentId: 'upsell_detector', agentName: 'Upsell Detector', action: 'Calcular potencial', order: 2 },
      { id: '3', agentId: 'pipeline_optimizer', agentName: 'Pipeline Optimizer', action: 'Sugerir siguiente paso', order: 3 },
    ],
    isActive: false,
  },
];

// === MOCK DATA ===
function generateMockWorkflows(): CRMWorkflow[] {
  return WORKFLOW_TEMPLATES.map((template, i) => ({
    ...template,
    id: `wf-${i + 1}`,
    lastRun: i < 2 ? new Date(Date.now() - Math.random() * 3600000) : undefined,
    runCount: Math.floor(Math.random() * 500) + 50,
    successRate: 85 + Math.random() * 12,
    avgDuration: Math.floor(1000 + Math.random() * 4000),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  }));
}

function generateMockExecution(workflow: CRMWorkflow): WorkflowExecution {
  return {
    id: `exec-${Date.now()}`,
    workflowId: workflow.id,
    status: 'running',
    startedAt: new Date(),
    currentStep: 0,
    results: [],
  };
}

// === COMPONENTE PRINCIPAL ===
export function CRMAgentWorkflows({ className }: CRMAgentWorkflowsProps) {
  const [workflows, setWorkflows] = useState<CRMWorkflow[]>(() => generateMockWorkflows());
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<CRMWorkflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Partial<CRMWorkflow>>({
    name: '',
    description: '',
    steps: [],
    isActive: false,
    trigger: { type: 'manual', config: {} }
  });

  // === STATS ===
  const stats = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter(w => w.isActive).length,
    totalRuns: workflows.reduce((sum, w) => sum + w.runCount, 0),
    avgSuccess: workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length,
    running: executions.filter(e => e.status === 'running').length,
  }), [workflows, executions]);

  // === HANDLERS ===
  const handleToggleActive = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w
    ));
    const workflow = workflows.find(w => w.id === workflowId);
    toast.success(`Workflow "${workflow?.name}" ${workflow?.isActive ? 'desactivado' : 'activado'}`);
  }, [workflows]);

  const handleRunWorkflow = useCallback((workflow: CRMWorkflow) => {
    const execution = generateMockExecution(workflow);
    setExecutions(prev => [execution, ...prev]);
    toast.success(`Ejecutando "${workflow.name}"`);

    // Simular ejecución
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setExecutions(prev => prev.map(e => {
        if (e.id !== execution.id) return e;
        
        const newResult: WorkflowExecution['results'][0] = {
          stepId: workflow.steps[step - 1]?.id || '',
          status: Math.random() > 0.1 ? 'success' : 'failed',
          duration: Math.floor(500 + Math.random() * 1500),
        };
        const newResults = [...e.results, newResult];

        if (step >= workflow.steps.length) {
          clearInterval(interval);
          return {
            ...e,
            status: newResults.every(r => r.status === 'success') ? 'completed' : 'failed',
            completedAt: new Date(),
            currentStep: step,
            results: newResults,
          };
        }

        return { ...e, currentStep: step, results: newResults };
      }));
    }, 1500);
  }, []);

  const handleDeleteWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(null);
    }
    toast.success('Workflow eliminado');
  }, [selectedWorkflow]);

  const handleDuplicateWorkflow = useCallback((workflow: CRMWorkflow) => {
    const newWf: CRMWorkflow = {
      ...workflow,
      id: `wf-${Date.now()}`,
      name: `${workflow.name} (copia)`,
      isActive: false,
      runCount: 0,
      lastRun: undefined,
      createdAt: new Date(),
    };
    setWorkflows(prev => [...prev, newWf]);
    toast.success('Workflow duplicado');
  }, []);

  const handleAddStep = useCallback(() => {
    if (!newWorkflow.steps) return;
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      agentId: CRM_AGENTS[0].id,
      agentName: CRM_AGENTS[0].name,
      action: AGENT_ACTIONS[CRM_AGENTS[0].id][0],
      order: (newWorkflow.steps?.length || 0) + 1,
    };
    setNewWorkflow(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }));
  }, [newWorkflow.steps]);

  const handleCreateWorkflow = useCallback(() => {
    if (!newWorkflow.name) {
      toast.error('El nombre es requerido');
      return;
    }
    
    const workflow: CRMWorkflow = {
      id: `wf-${Date.now()}`,
      name: newWorkflow.name || 'Nuevo Workflow',
      description: newWorkflow.description || '',
      trigger: newWorkflow.trigger || { type: 'manual', config: {} },
      steps: newWorkflow.steps || [],
      isActive: false,
      runCount: 0,
      successRate: 0,
      avgDuration: 0,
      createdAt: new Date(),
    };
    
    setWorkflows(prev => [...prev, workflow]);
    setIsCreating(false);
    setNewWorkflow({ name: '', description: '', steps: [], isActive: false, trigger: { type: 'manual', config: {} } });
    toast.success('Workflow creado');
  }, [newWorkflow]);

  // === RENDER ===
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4", className)}>
      {/* Lista de Workflows */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-violet-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                <Workflow className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">CRM Workflows Automatizados</CardTitle>
                <CardDescription className="text-xs">
                  {stats.active} de {stats.total} activos • {stats.running} en ejecución
                </CardDescription>
              </div>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Crear
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Workflow CRM</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nombre</label>
                      <Input
                        value={newWorkflow.name || ''}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Mi workflow"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Trigger</label>
                      <Select
                        value={newWorkflow.trigger?.type || 'manual'}
                        onValueChange={(v) => setNewWorkflow(prev => ({ ...prev, trigger: { type: v as any, config: {} } }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="event">Evento</SelectItem>
                          <SelectItem value="schedule">Programado</SelectItem>
                          <SelectItem value="condition">Condición</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <Input
                      value={newWorkflow.description || ''}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción del workflow"
                    />
                  </div>

                  {/* Pasos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Pasos ({newWorkflow.steps?.length || 0})</label>
                      <Button size="sm" variant="outline" onClick={handleAddStep}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Añadir paso
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {newWorkflow.steps?.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                          <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                          <Select
                            value={step.agentId}
                            onValueChange={(v) => {
                              const agent = CRM_AGENTS.find(a => a.id === v);
                              setNewWorkflow(prev => ({
                                ...prev,
                                steps: prev.steps?.map(s => s.id === step.id ? { 
                                  ...s, 
                                  agentId: v, 
                                  agentName: agent?.name || '',
                                  action: AGENT_ACTIONS[v]?.[0] || ''
                                } : s)
                              }));
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CRM_AGENTS.map(agent => (
                                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={step.action}
                            onValueChange={(v) => {
                              setNewWorkflow(prev => ({
                                ...prev,
                                steps: prev.steps?.map(s => s.id === step.id ? { ...s, action: v } : s)
                              }));
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AGENT_ACTIONS[step.agentId]?.map(action => (
                                <SelectItem key={action} value={action}>{action}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              setNewWorkflow(prev => ({
                                ...prev,
                                steps: prev.steps?.filter(s => s.id !== step.id)
                              }));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                  <Button onClick={handleCreateWorkflow}>Crear Workflow</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <motion.div
                  key={workflow.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer",
                    selectedWorkflow?.id === workflow.id 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:shadow-md hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{workflow.name}</h4>
                        <Badge variant={workflow.isActive ? "default" : "secondary"} className="text-[10px]">
                          {workflow.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {workflow.trigger.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{workflow.description}</p>
                      
                      {/* Steps preview */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {workflow.steps.map((step, i) => {
                          const agent = CRM_AGENTS.find(a => a.id === step.agentId);
                          const Icon = agent?.icon || Bot;
                          return (
                            <React.Fragment key={step.id}>
                              <div className={cn("p-1 rounded bg-gradient-to-br", agent?.color || 'from-gray-400 to-gray-500')}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              {i < workflow.steps.length - 1 && (
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={workflow.isActive}
                          onCheckedChange={() => handleToggleActive(workflow.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunWorkflow(workflow);
                          }}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-600">{workflow.successRate.toFixed(0)}%</p>
                        <p className="text-[10px] text-muted-foreground">{workflow.runCount} ejecuciones</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Panel de detalles / Ejecuciones */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            {selectedWorkflow ? (
              <>
                <Eye className="h-4 w-4" />
                Detalles
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Ejecuciones Recientes
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {selectedWorkflow ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">{selectedWorkflow.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedWorkflow.description}</p>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-lg font-bold text-green-600">{selectedWorkflow.successRate.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground">Tasa de éxito</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-lg font-bold text-blue-600">{(selectedWorkflow.avgDuration / 1000).toFixed(1)}s</p>
                  <p className="text-[10px] text-muted-foreground">Duración media</p>
                </div>
              </div>

              {/* Pasos */}
              <div>
                <p className="text-xs font-medium mb-2">Pasos del Workflow</p>
                <div className="space-y-2">
                  {selectedWorkflow.steps.map((step, i) => {
                    const agent = CRM_AGENTS.find(a => a.id === step.agentId);
                    const Icon = agent?.icon || Bot;
                    return (
                      <div key={step.id} className="flex items-center gap-2 p-2 rounded-lg border">
                        <Badge variant="outline" className="shrink-0 h-6 w-6 p-0 flex items-center justify-center">
                          {i + 1}
                        </Badge>
                        <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", agent?.color)}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{step.action}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{step.agentName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  className="flex-1" 
                  onClick={() => handleRunWorkflow(selectedWorkflow)}
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Ejecutar
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDuplicateWorkflow(selectedWorkflow)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDeleteWorkflow(selectedWorkflow.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay ejecuciones recientes</p>
                  </div>
                ) : (
                  executions.map((exec) => {
                    const workflow = workflows.find(w => w.id === exec.workflowId);
                    return (
                      <div 
                        key={exec.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          exec.status === 'running' && "bg-blue-500/5 border-blue-500/20",
                          exec.status === 'completed' && "bg-green-500/5 border-green-500/20",
                          exec.status === 'failed' && "bg-red-500/5 border-red-500/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium truncate">{workflow?.name}</p>
                          <Badge 
                            variant={exec.status === 'completed' ? 'default' : exec.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            {exec.status === 'running' && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                            {exec.status === 'completed' && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                            {exec.status === 'failed' && <XCircle className="h-2.5 w-2.5 mr-1" />}
                            {exec.status}
                          </Badge>
                        </div>
                        {exec.status === 'running' && workflow && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Paso {exec.currentStep + 1} de {workflow.steps.length}</span>
                              <span>{Math.round(((exec.currentStep) / workflow.steps.length) * 100)}%</span>
                            </div>
                            <Progress value={(exec.currentStep / workflow.steps.length) * 100} className="h-1" />
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(exec.startedAt, 'HH:mm:ss', { locale: es })}
                          {exec.completedAt && ` - ${format(exec.completedAt, 'HH:mm:ss', { locale: es })}`}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CRMAgentWorkflows;
