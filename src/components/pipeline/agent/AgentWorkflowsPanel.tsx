/**
 * Panel de Flujos de Trabajo Autónomos
 * Vinculación de tareas entre agentes de diferentes sectores
 */

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Workflow, 
  ArrowRight,
  Plus,
  Play,
  Pause,
  Settings,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Building2,
  HeartPulse,
  Truck,
  ShoppingCart,
  Briefcase,
  Link2,
  Unlink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AgentDefinition {
  id: string;
  name: string;
  sector: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface WorkflowTask {
  id: string;
  name: string;
  description: string;
  sourceAgent: string;
  targetAgent: string;
  trigger: 'stage_change' | 'time_based' | 'manual' | 'condition';
  triggerConfig?: Record<string, unknown>;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: Date;
  status: 'active' | 'paused' | 'error';
}

interface AgentWorkflowsPanelProps {
  className?: string;
}

const AVAILABLE_AGENTS: AgentDefinition[] = [
  { id: 'pipeline', name: 'Pipeline Sales', sector: 'Ventas', icon: Briefcase, color: 'text-violet-500' },
  { id: 'crm', name: 'CRM Agent', sector: 'CRM', icon: Users, color: 'text-blue-500' },
  { id: 'support', name: 'Soporte', sector: 'Soporte', icon: HeartPulse, color: 'text-green-500' },
  { id: 'logistics', name: 'Logística', sector: 'Operaciones', icon: Truck, color: 'text-orange-500' },
  { id: 'ecommerce', name: 'E-Commerce', sector: 'Ventas', icon: ShoppingCart, color: 'text-pink-500' },
  { id: 'enterprise', name: 'Enterprise', sector: 'Corporativo', icon: Building2, color: 'text-slate-500' },
];

const SAMPLE_WORKFLOWS: WorkflowTask[] = [
  {
    id: '1',
    name: 'Deal Ganado → Crear Proyecto',
    description: 'Cuando un deal se marca como ganado, crear proyecto en el agente de logística',
    sourceAgent: 'pipeline',
    targetAgent: 'logistics',
    trigger: 'stage_change',
    triggerConfig: { stage: 'won' },
    isActive: true,
    executionCount: 12,
    lastExecuted: new Date(Date.now() - 3600000),
    status: 'active',
  },
  {
    id: '2',
    name: 'Oportunidad en Riesgo → Alerta Soporte',
    description: 'Cuando se detecta una oportunidad en riesgo, notificar al agente de soporte',
    sourceAgent: 'pipeline',
    targetAgent: 'support',
    trigger: 'condition',
    triggerConfig: { riskLevel: 'high' },
    isActive: true,
    executionCount: 5,
    lastExecuted: new Date(Date.now() - 7200000),
    status: 'active',
  },
  {
    id: '3',
    name: 'Nuevo Lead → Enriquecer CRM',
    description: 'Al crear lead, el agente CRM enriquece automáticamente los datos',
    sourceAgent: 'pipeline',
    targetAgent: 'crm',
    trigger: 'stage_change',
    triggerConfig: { stage: 'lead' },
    isActive: false,
    executionCount: 28,
    status: 'paused',
  },
  {
    id: '4',
    name: 'Cierre Mensual → Reporte Enterprise',
    description: 'Generar reporte ejecutivo mensual automáticamente',
    sourceAgent: 'pipeline',
    targetAgent: 'enterprise',
    trigger: 'time_based',
    triggerConfig: { cron: '0 0 1 * *' },
    isActive: true,
    executionCount: 3,
    status: 'active',
  },
];

export function AgentWorkflowsPanel({ className }: AgentWorkflowsPanelProps) {
  const [workflows, setWorkflows] = useState<WorkflowTask[]>(SAMPLE_WORKFLOWS);
  const [showAddNew, setShowAddNew] = useState(false);

  const getAgentById = (id: string) => AVAILABLE_AGENTS.find(a => a.id === id);

  const toggleWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        const newActive = !w.isActive;
        toast.success(newActive ? 'Flujo activado' : 'Flujo pausado');
        return { 
          ...w, 
          isActive: newActive,
          status: newActive ? 'active' : 'paused'
        };
      }
      return w;
    }));
  }, []);

  const executeWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        toast.success('Ejecutando flujo manualmente...');
        return { 
          ...w, 
          executionCount: w.executionCount + 1,
          lastExecuted: new Date()
        };
      }
      return w;
    }));
  }, []);

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'stage_change': return 'Cambio de etapa';
      case 'time_based': return 'Programado';
      case 'manual': return 'Manual';
      case 'condition': return 'Condición';
      default: return trigger;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'paused': return <Pause className="h-3 w-3 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Workflow className="h-4 w-4 text-violet-500" />
          Flujos Autónomos
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddNew(!showAddNew)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2 text-center">
          <div className="text-lg font-bold text-green-600">
            {workflows.filter(w => w.isActive).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Activos</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-lg font-bold">
            {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
          </div>
          <div className="text-[10px] text-muted-foreground">Ejecuciones</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-lg font-bold text-violet-600">
            {AVAILABLE_AGENTS.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Agentes</div>
        </Card>
      </div>

      {/* Connected Agents */}
      <Card className="p-3">
        <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
          <Link2 className="h-3 w-3 text-violet-500" />
          Agentes Conectados
        </h4>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_AGENTS.map(agent => {
            const Icon = agent.icon;
            const isConnected = workflows.some(
              w => (w.sourceAgent === agent.id || w.targetAgent === agent.id) && w.isActive
            );
            return (
              <Badge
                key={agent.id}
                variant={isConnected ? "default" : "outline"}
                className={cn(
                  "text-xs gap-1",
                  isConnected && "bg-gradient-to-r from-violet-500/80 to-purple-600/80"
                )}
              >
                <Icon className="h-3 w-3" />
                {agent.name}
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Workflow List */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Flujos Configurados</h4>
        {workflows.map(workflow => {
          const sourceAgent = getAgentById(workflow.sourceAgent);
          const targetAgent = getAgentById(workflow.targetAgent);
          const SourceIcon = sourceAgent?.icon || Zap;
          const TargetIcon = targetAgent?.icon || Zap;

          return (
            <Card 
              key={workflow.id}
              className={cn(
                "p-3 transition-all",
                !workflow.isActive && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Workflow Name */}
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(workflow.status)}
                    <span className="text-sm font-medium truncate">{workflow.name}</span>
                  </div>

                  {/* Agent Flow */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={cn("text-[10px] gap-1", sourceAgent?.color)}>
                      <SourceIcon className="h-2 w-2" />
                      {sourceAgent?.name}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary" className={cn("text-[10px] gap-1", targetAgent?.color)}>
                      <TargetIcon className="h-2 w-2" />
                      {targetAgent?.name}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {workflow.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-2 w-2" />
                      {getTriggerLabel(workflow.trigger)}
                    </span>
                    <span>{workflow.executionCount} ejecuciones</span>
                    {workflow.lastExecuted && (
                      <span>
                        Última: {new Date(workflow.lastExecuted).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => executeWorkflow(workflow.id)}
                    disabled={!workflow.isActive}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={() => toggleWorkflow(workflow.id)}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add New Hint */}
      {showAddNew && (
        <Card className="p-4 border-dashed border-2 border-violet-500/30 bg-violet-500/5">
          <div className="text-center">
            <Workflow className="h-8 w-8 mx-auto mb-2 text-violet-500/50" />
            <h4 className="text-sm font-medium mb-1">Crear Nuevo Flujo</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Conecta agentes de diferentes sectores para automatizar tareas
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => toast.info('Próximamente: Constructor visual de flujos')}
            >
              <Plus className="h-3 w-3 mr-1" />
              Configurar Flujo
            </Button>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-3 bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
        <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
          <Zap className="h-3 w-3 text-violet-500" />
          Automatización Inteligente
        </h4>
        <p className="text-[10px] text-muted-foreground">
          Los flujos autónomos permiten que los agentes de diferentes sectores colaboren 
          automáticamente. Cuando se dispara un evento en un agente, puede activar acciones 
          en otros agentes sin intervención manual.
        </p>
      </Card>
    </div>
  );
}

export default AgentWorkflowsPanel;
