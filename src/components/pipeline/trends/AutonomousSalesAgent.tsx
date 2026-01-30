/**
 * Agente Autónomo de Ventas - Tendencia 2025-2026
 * Sistema que nutre leads, programa seguimientos y prepara propuestas automáticamente
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Play,
  Pause,
  Calendar,
  Mail,
  FileText,
  MessageSquare,
  Phone,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings2,
  Brain,
  Sparkles,
  ArrowRight,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AutomatedTask {
  id: string;
  type: 'nurture_email' | 'follow_up' | 'schedule_call' | 'prepare_proposal' | 'send_reminder';
  opportunityId: string;
  opportunityTitle: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  scheduledFor: Date;
  executedAt?: Date;
  details: string;
  confidence: number;
}

interface AgentConfig {
  autoNurture: boolean;
  autoFollowUp: boolean;
  autoSchedule: boolean;
  autoProposal: boolean;
  maxActionsPerDay: number;
  workingHoursStart: number;
  workingHoursEnd: number;
}

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  nurture_email: Mail,
  follow_up: MessageSquare,
  schedule_call: Phone,
  prepare_proposal: FileText,
  send_reminder: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  executing: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export function AutonomousSalesAgent() {
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState<AgentConfig>({
    autoNurture: true,
    autoFollowUp: true,
    autoSchedule: false,
    autoProposal: false,
    maxActionsPerDay: 20,
    workingHoursStart: 9,
    workingHoursEnd: 18,
  });

  const [tasks, setTasks] = useState<AutomatedTask[]>([
    {
      id: '1',
      type: 'nurture_email',
      opportunityId: 'opp-1',
      opportunityTitle: 'Acme Corp - Implementación ERP',
      status: 'completed',
      scheduledFor: new Date(Date.now() - 3600000),
      executedAt: new Date(Date.now() - 3500000),
      details: 'Email de seguimiento enviado con caso de éxito similar',
      confidence: 92,
    },
    {
      id: '2',
      type: 'follow_up',
      opportunityId: 'opp-2',
      opportunityTitle: 'TechStart - Licencias SaaS',
      status: 'executing',
      scheduledFor: new Date(),
      details: 'Preparando mensaje personalizado basado en última interacción',
      confidence: 87,
    },
    {
      id: '3',
      type: 'schedule_call',
      opportunityId: 'opp-3',
      opportunityTitle: 'Global Industries - Consultoría',
      status: 'pending',
      scheduledFor: new Date(Date.now() + 3600000),
      details: 'Proponer reunión de seguimiento para la próxima semana',
      confidence: 78,
    },
    {
      id: '4',
      type: 'prepare_proposal',
      opportunityId: 'opp-4',
      opportunityTitle: 'MegaCorp - Transformación Digital',
      status: 'pending',
      scheduledFor: new Date(Date.now() + 7200000),
      details: 'Generar propuesta económica basada en requisitos capturados',
      confidence: 85,
    },
  ]);

  const [stats] = useState({
    tasksToday: 15,
    completed: 12,
    successRate: 94,
    timeSaved: 4.5,
    leadsNurtured: 28,
    meetingsScheduled: 5,
  });

  const toggleAgent = useCallback(() => {
    setIsActive(!isActive);
    toast.success(isActive ? 'Agente autónomo pausado' : 'Agente autónomo activado');
  }, [isActive]);

  const executeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'executing' as const }
        : t
    ));
    
    // Simulate execution
    setTimeout(() => {
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'completed' as const, executedAt: new Date() }
          : t
      ));
      toast.success('Tarea ejecutada correctamente');
    }, 2000);
  }, []);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const executingTasks = tasks.filter(t => t.status === 'executing');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Agent Status Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300",
            isActive 
              ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25" 
              : "bg-muted"
          )}>
            <Bot className={cn("h-6 w-6", isActive ? "text-white" : "text-muted-foreground")} />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Agente Autónomo de Ventas
              {isActive && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                  Activo
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isActive 
                ? `${executingTasks.length} tareas ejecutándose • ${pendingTasks.length} pendientes`
                : 'Pausado - Las tareas se acumularán para revisión'}
            </p>
          </div>
        </div>
        <Button
          variant={isActive ? "destructive" : "default"}
          size="sm"
          onClick={toggleAgent}
          className="gap-2"
        >
          {isActive ? (
            <>
              <Pause className="h-4 w-4" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Activar
            </>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg border bg-card text-center">
          <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
          <div className="text-lg font-bold">{stats.tasksToday}</div>
          <div className="text-xs text-muted-foreground">Tareas Hoy</div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
          <div className="text-lg font-bold">{stats.successRate}%</div>
          <div className="text-xs text-muted-foreground">Éxito</div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
          <div className="text-lg font-bold">{stats.timeSaved}h</div>
          <div className="text-xs text-muted-foreground">Ahorradas</div>
        </div>
      </div>

      {/* Automation Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Automatizaciones Activas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Nurturing automático</span>
            </div>
            <Switch
              checked={config.autoNurture}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoNurture: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span className="text-sm">Follow-ups inteligentes</span>
            </div>
            <Switch
              checked={config.autoFollowUp}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoFollowUp: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Programar reuniones</span>
            </div>
            <Switch
              checked={config.autoSchedule}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoSchedule: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Preparar propuestas</span>
            </div>
            <Switch
              checked={config.autoProposal}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoProposal: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Task Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Cola de Tareas
            <Badge variant="secondary" className="ml-auto">
              {pendingTasks.length + executingTasks.length} activas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {tasks.map((task) => {
                const TaskIcon = TASK_ICONS[task.type] || Zap;
                return (
                  <div 
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      task.status === 'executing' && "border-blue-500/50 bg-blue-500/5",
                      task.status === 'completed' && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        task.status === 'executing' ? "bg-blue-500/20" : "bg-muted"
                      )}>
                        <TaskIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {task.opportunityTitle}
                          </span>
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            STATUS_COLORS[task.status]
                          )} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.details}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {task.confidence}% confianza
                          </span>
                          {task.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => executeTask(task.id)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Ejecutar
                            </Button>
                          )}
                          {task.status === 'executing' && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Ejecutando...
                            </span>
                          )}
                          {task.status === 'completed' && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20">
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-violet-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Insight del Agente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en patrones de éxito, sugiero aumentar la frecuencia de follow-ups 
              para oportunidades en etapa de "Propuesta" - tienen 34% más conversión con 
              contacto en las primeras 48h.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutonomousSalesAgent;
