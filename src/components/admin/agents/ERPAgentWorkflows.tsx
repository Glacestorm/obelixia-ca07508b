/**
 * ERPAgentWorkflows - Sistema de Workflows Automatizados
 * Permite crear, gestionar y ejecutar cadenas de acciones automáticas entre agentes
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  ArrowRight,
  GitBranch,
  Settings,
  BarChart3,
  RefreshCw,
  History,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Target,
  Sparkles,
  Brain,
  Shield,
  TrendingUp,
  Users,
  Calculator,
  Cog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// Tipos
interface WorkflowStep {
  id: string;
  agentId: string;
  agentName: string;
  domain: string;
  action: string;
  parameters: Record<string, unknown>;
  condition?: {
    type: 'always' | 'if_success' | 'if_failure' | 'if_threshold';
    threshold?: number;
    field?: string;
  };
  timeout: number;
  retries: number;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'scheduled' | 'event' | 'condition';
  triggerConfig?: {
    schedule?: string;
    event?: string;
    condition?: string;
  };
  steps: WorkflowStep[];
  isActive: boolean;
  lastRun?: string;
  runCount: number;
  successRate: number;
  avgDuration: number;
  createdAt: string;
  createdBy: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  results: Array<{
    stepId: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    output?: unknown;
    error?: string;
    duration?: number;
  }>;
}

// Datos de ejemplo
const SAMPLE_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'wf-1',
    name: 'Análisis Financiero Completo',
    description: 'Ejecuta análisis de cashflow, predicciones y genera recomendaciones',
    trigger: 'scheduled',
    triggerConfig: { schedule: '0 6 * * 1' },
    steps: [
      { id: 's1', agentId: 'fin-cashflow', agentName: 'Cashflow Analyzer', domain: 'financial', action: 'analyze_cashflow', parameters: { period: '30d' }, condition: { type: 'always' }, timeout: 60, retries: 2 },
      { id: 's2', agentId: 'fin-forecast', agentName: 'Financial Forecaster', domain: 'financial', action: 'predict_revenue', parameters: { horizon: '90d' }, condition: { type: 'if_success' }, timeout: 120, retries: 1 },
      { id: 's3', agentId: 'analytics-predict', agentName: 'Predictive Analytics', domain: 'analytics', action: 'generate_insights', parameters: {}, condition: { type: 'if_success' }, timeout: 90, retries: 1 }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    runCount: 45,
    successRate: 96,
    avgDuration: 185,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    createdBy: 'Sistema'
  },
  {
    id: 'wf-2',
    name: 'Gestión de Riesgo de Cliente',
    description: 'Detecta clientes en riesgo de churn y activa retención',
    trigger: 'event',
    triggerConfig: { event: 'churn_risk_detected' },
    steps: [
      { id: 's1', agentId: 'crm-churn', agentName: 'Churn Predictor', domain: 'crm_cs', action: 'analyze_risk', parameters: {}, condition: { type: 'always' }, timeout: 45, retries: 2 },
      { id: 's2', agentId: 'crm-retention', agentName: 'Retention Specialist', domain: 'crm_cs', action: 'generate_strategy', parameters: {}, condition: { type: 'if_threshold', threshold: 70, field: 'risk_score' }, timeout: 60, retries: 1 },
      { id: 's3', agentId: 'crm-health', agentName: 'Customer Health', domain: 'crm_cs', action: 'create_action_plan', parameters: {}, condition: { type: 'if_success' }, timeout: 30, retries: 1 }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    runCount: 128,
    successRate: 92,
    avgDuration: 95,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    createdBy: 'Sistema'
  },
  {
    id: 'wf-3',
    name: 'Auditoría de Compliance Automática',
    description: 'Ejecuta verificaciones de cumplimiento y genera reportes',
    trigger: 'scheduled',
    triggerConfig: { schedule: '0 0 1 * *' },
    steps: [
      { id: 's1', agentId: 'comp-gdpr', agentName: 'GDPR Validator', domain: 'compliance', action: 'validate_gdpr', parameters: {}, condition: { type: 'always' }, timeout: 120, retries: 1 },
      { id: 's2', agentId: 'comp-sox', agentName: 'SOX Auditor', domain: 'compliance', action: 'audit_controls', parameters: {}, condition: { type: 'always' }, timeout: 180, retries: 1 },
      { id: 's3', agentId: 'comp-risk', agentName: 'Risk Assessor', domain: 'compliance', action: 'assess_risks', parameters: {}, condition: { type: 'if_success' }, timeout: 90, retries: 2 }
    ],
    isActive: true,
    lastRun: new Date(Date.now() - 7 * 86400000).toISOString(),
    runCount: 12,
    successRate: 100,
    avgDuration: 320,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    createdBy: 'Sistema'
  },
  {
    id: 'wf-4',
    name: 'Optimización de Operaciones',
    description: 'Analiza inventario, supply chain y genera optimizaciones',
    trigger: 'condition',
    triggerConfig: { condition: 'inventory_level < 20%' },
    steps: [
      { id: 's1', agentId: 'ops-inventory', agentName: 'Inventory Optimizer', domain: 'operations', action: 'analyze_stock', parameters: {}, condition: { type: 'always' }, timeout: 60, retries: 2 },
      { id: 's2', agentId: 'ops-supply', agentName: 'Supply Chain Manager', domain: 'operations', action: 'optimize_orders', parameters: {}, condition: { type: 'if_success' }, timeout: 90, retries: 1 },
      { id: 's3', agentId: 'analytics-dashboard', agentName: 'Dashboard Generator', domain: 'analytics', action: 'update_metrics', parameters: {}, condition: { type: 'always' }, timeout: 30, retries: 1 }
    ],
    isActive: false,
    runCount: 78,
    successRate: 89,
    avgDuration: 145,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    createdBy: 'Sistema'
  }
];

const SAMPLE_EXECUTIONS: WorkflowExecution[] = [
  {
    id: 'exec-1',
    workflowId: 'wf-2',
    workflowName: 'Gestión de Riesgo de Cliente',
    status: 'running',
    progress: 66,
    currentStep: 2,
    totalSteps: 3,
    startedAt: new Date(Date.now() - 45000).toISOString(),
    results: [
      { stepId: 's1', status: 'success', duration: 32000 },
      { stepId: 's2', status: 'running' },
      { stepId: 's3', status: 'pending' }
    ]
  },
  {
    id: 'exec-2',
    workflowId: 'wf-1',
    workflowName: 'Análisis Financiero Completo',
    status: 'completed',
    progress: 100,
    currentStep: 3,
    totalSteps: 3,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3400000).toISOString(),
    duration: 200,
    results: [
      { stepId: 's1', status: 'success', duration: 55000 },
      { stepId: 's2', status: 'success', duration: 98000 },
      { stepId: 's3', status: 'success', duration: 47000 }
    ]
  }
];

// Iconos por dominio
const DOMAIN_ICONS: Record<string, React.ElementType> = {
  financial: Calculator,
  crm_cs: Users,
  compliance: Shield,
  operations: Cog,
  hr: Users,
  analytics: BarChart3
};

export function ERPAgentWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(SAMPLE_WORKFLOWS);
  const [executions, setExecutions] = useState<WorkflowExecution[]>(SAMPLE_EXECUTIONS);
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions' | 'templates'>('workflows');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  // Toggle workflow activo
  const toggleWorkflow = useCallback((workflowId: string, isActive: boolean) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, isActive } : w
    ));
    toast.success(isActive ? 'Workflow activado' : 'Workflow pausado');
  }, []);

  // Ejecutar workflow manualmente
  const executeWorkflow = useCallback((workflow: WorkflowDefinition) => {
    const newExecution: WorkflowExecution = {
      id: `exec-${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'running',
      progress: 0,
      currentStep: 0,
      totalSteps: workflow.steps.length,
      startedAt: new Date().toISOString(),
      results: workflow.steps.map(s => ({ stepId: s.id, status: 'pending' }))
    };
    
    setExecutions(prev => [newExecution, ...prev]);
    toast.success(`Workflow "${workflow.name}" iniciado`);
    
    // Simular progreso
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step > workflow.steps.length) {
        clearInterval(interval);
        setExecutions(prev => prev.map(e => 
          e.id === newExecution.id 
            ? { ...e, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
            : e
        ));
        return;
      }
      
      setExecutions(prev => prev.map(e => 
        e.id === newExecution.id 
          ? { 
              ...e, 
              progress: (step / workflow.steps.length) * 100,
              currentStep: step,
              results: e.results.map((r, i) => ({
                ...r,
                status: i < step ? 'success' : i === step ? 'running' : 'pending',
                duration: i < step ? Math.random() * 50000 + 10000 : undefined
              }))
            }
          : e
      ));
    }, 2000);
  }, []);

  // Duplicar workflow
  const duplicateWorkflow = useCallback((workflow: WorkflowDefinition) => {
    const newWorkflow: WorkflowDefinition = {
      ...workflow,
      id: `wf-${Date.now()}`,
      name: `${workflow.name} (Copia)`,
      isActive: false,
      runCount: 0,
      lastRun: undefined,
      createdAt: new Date().toISOString()
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    toast.success('Workflow duplicado');
  }, []);

  // Eliminar workflow
  const deleteWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    toast.success('Workflow eliminado');
  }, []);

  // Toggle expanded
  const toggleExpanded = (workflowId: string) => {
    setExpandedWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(workflowId)) next.delete(workflowId);
      else next.add(workflowId);
      return next;
    });
  };

  const getTriggerLabel = (trigger: WorkflowDefinition['trigger']) => {
    switch (trigger) {
      case 'manual': return 'Manual';
      case 'scheduled': return 'Programado';
      case 'event': return 'Por Evento';
      case 'condition': return 'Condicional';
    }
  };

  const getStatusColor = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-destructive';
      case 'cancelled': return 'bg-yellow-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Workflows Automatizados
          </h3>
          <p className="text-sm text-muted-foreground">
            Orquesta cadenas de acciones entre agentes de forma automática
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Historial
          </Button>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-xs text-muted-foreground">Workflows Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{workflows.filter(w => w.isActive).length}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{executions.filter(e => e.status === 'running').length}</p>
                <p className="text-xs text-muted-foreground">En Ejecución</p>
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
                <p className="text-2xl font-bold">
                  {Math.round(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length)}%
                </p>
                <p className="text-xs text-muted-foreground">Tasa de Éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">
            <GitBranch className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="executions" className="relative">
            <Play className="h-4 w-4 mr-2" />
            Ejecuciones
            {executions.filter(e => e.status === 'running').length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {executions.filter(e => e.status === 'running').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="h-4 w-4 mr-2" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              <AnimatePresence>
                {workflows.map((workflow) => (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card className={cn(
                      "transition-all",
                      !workflow.isActive && "opacity-60"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => toggleExpanded(workflow.id)}
                              >
                                {expandedWorkflows.has(workflow.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <h4 className="font-semibold">{workflow.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getTriggerLabel(workflow.trigger)}
                              </Badge>
                              {workflow.isActive && (
                                <Badge className="bg-green-500/10 text-green-600 text-xs">
                                  Activo
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">{workflow.description}</p>
                            
                            {/* Stats inline */}
                            <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Play className="h-3 w-3" />
                                {workflow.runCount} ejecuciones
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {workflow.successRate}% éxito
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                ~{Math.round(workflow.avgDuration)}s promedio
                              </span>
                              {workflow.lastRun && (
                                <span>
                                  Última: {formatDistanceToNow(new Date(workflow.lastRun), { addSuffix: true, locale: es })}
                                </span>
                              )}
                            </div>

                            {/* Expanded: Steps */}
                            <AnimatePresence>
                              {expandedWorkflows.has(workflow.id) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 ml-6 space-y-2"
                                >
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <GitBranch className="h-4 w-4 text-primary" />
                                    Pasos del Workflow
                                  </div>
                                  <div className="space-y-2">
                                    {workflow.steps.map((step, idx) => {
                                      const DomainIcon = DOMAIN_ICONS[step.domain] || Brain;
                                      return (
                                        <div key={step.id} className="flex items-center gap-2">
                                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                                            {idx + 1}
                                          </div>
                                          {idx > 0 && (
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                          )}
                                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 flex-1">
                                            <DomainIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{step.agentName}</span>
                                            <Badge variant="secondary" className="text-xs">
                                              {step.action}
                                            </Badge>
                                            {step.condition?.type !== 'always' && (
                                              <Badge variant="outline" className="text-xs">
                                                {step.condition?.type === 'if_success' ? 'Si éxito' :
                                                 step.condition?.type === 'if_failure' ? 'Si falla' :
                                                 `Si ${step.condition?.field} > ${step.condition?.threshold}%`}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={workflow.isActive}
                              onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => executeWorkflow(workflow)}
                              disabled={!workflow.isActive}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateWorkflow(workflow)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedWorkflow(workflow)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteWorkflow(workflow.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {executions.map((execution) => (
                <Card key={execution.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor(execution.status))} />
                        <h4 className="font-semibold">{execution.workflowName}</h4>
                        <Badge variant="outline">
                          {execution.status === 'running' ? 'En ejecución' :
                           execution.status === 'completed' ? 'Completado' :
                           execution.status === 'failed' ? 'Fallido' : 'Cancelado'}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Paso {execution.currentStep} de {execution.totalSteps}</span>
                        <span className="font-medium">{Math.round(execution.progress)}%</span>
                      </div>
                      <Progress value={execution.progress} className="h-2" />
                    </div>

                    {/* Steps status */}
                    <div className="flex items-center gap-2 mt-3">
                      {execution.results.map((result, idx) => (
                        <div
                          key={result.stepId}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            result.status === 'success' && "bg-green-500/10 text-green-600",
                            result.status === 'running' && "bg-blue-500/10 text-blue-600 animate-pulse",
                            result.status === 'failed' && "bg-destructive/10 text-destructive",
                            result.status === 'pending' && "bg-muted text-muted-foreground",
                            result.status === 'skipped' && "bg-yellow-500/10 text-yellow-600"
                          )}
                        >
                          {result.status === 'success' ? <CheckCircle className="h-4 w-4" /> :
                           result.status === 'running' ? <RefreshCw className="h-4 w-4 animate-spin" /> :
                           result.status === 'failed' ? <X className="h-4 w-4" /> :
                           idx + 1}
                        </div>
                      ))}
                    </div>

                    {execution.status === 'running' && (
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Pipeline de Ventas', desc: 'Lead → Oportunidad → Cierre con seguimiento automático', icon: Target, domain: 'crm_cs' },
              { name: 'Cierre Contable', desc: 'Verificación → Conciliación → Reportes mensuales', icon: Calculator, domain: 'financial' },
              { name: 'Onboarding Cliente', desc: 'Bienvenida → Configuración → Seguimiento inicial', icon: Users, domain: 'crm_cs' },
              { name: 'Auditoría Trimestral', desc: 'Compliance → Risk → Documentación', icon: Shield, domain: 'compliance' },
              { name: 'Análisis Predictivo', desc: 'Data → ML Models → Insights → Actions', icon: Brain, domain: 'analytics' },
              { name: 'Supply Chain', desc: 'Inventario → Pedidos → Logística', icon: Cog, domain: 'operations' }
            ].map((template, idx) => (
              <Card key={idx} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <template.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.desc}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Usar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dialog placeholder */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Workflow</label>
              <Input placeholder="Ej: Análisis de Riesgo Automático" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea placeholder="Describe el propósito del workflow..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Trigger</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona cuándo se ejecuta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Programado (Cron)</SelectItem>
                  <SelectItem value="event">Por Evento</SelectItem>
                  <SelectItem value="condition">Condición</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                Arrastra agentes aquí para crear los pasos del workflow
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
            <Button onClick={() => {
              toast.success('Workflow creado');
              setIsCreating(false);
            }}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ERPAgentWorkflows;
