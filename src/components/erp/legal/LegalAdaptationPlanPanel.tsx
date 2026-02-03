/**
 * LegalAdaptationPlanPanel - Generador de Planes de Adaptación
 * Fase 8: Generación automática de acciones para cumplir nueva normativa
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  RefreshCw,
  CheckCircle,
  Circle,
  Clock,
  Users,
  Calendar,
  Target,
  AlertTriangle,
  Download,
  Send,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ListChecks,
  BarChart3,
  Building,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdaptationTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: Date;
  assignee?: string;
  assigneeType: 'user' | 'role' | 'team' | 'agent';
  estimatedHours: number;
  dependencies?: string[];
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  notes?: string;
}

interface AdaptationPlan {
  id: string;
  regulation: string;
  jurisdiction: string;
  title: string;
  description: string;
  createdAt: Date;
  effectiveDate: Date;
  transitionEndDate?: Date;
  status: 'draft' | 'active' | 'completed' | 'overdue';
  progress: number;
  tasks: AdaptationTask[];
  owner: string;
  affectedAreas: string[];
  estimatedCost?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface LegalAdaptationPlanPanelProps {
  companyId?: string;
  className?: string;
}

const DEMO_PLANS: AdaptationPlan[] = [
  {
    id: '1',
    regulation: 'Ley 28/2025',
    jurisdiction: 'ES',
    title: 'Plan de Adaptación - Jornada Laboral 37.5h',
    description: 'Plan completo para adaptar la empresa a la nueva regulación de jornada laboral máxima.',
    createdAt: new Date('2025-01-29'),
    effectiveDate: new Date('2025-02-15'),
    transitionEndDate: new Date('2025-08-15'),
    status: 'active',
    progress: 45,
    owner: 'Dirección RRHH',
    affectedAreas: ['RRHH', 'Nóminas', 'Operaciones', 'Legal'],
    estimatedCost: '15.000 - 25.000€',
    riskLevel: 'high',
    tasks: [
      {
        id: 't1',
        title: 'Auditoría de contratos laborales actuales',
        description: 'Revisar todos los contratos para identificar cláusulas afectadas',
        status: 'completed',
        priority: 'critical',
        dueDate: new Date('2025-02-05'),
        assignee: 'Equipo Legal',
        assigneeType: 'team',
        estimatedHours: 40,
        subtasks: [
          { id: 's1', title: 'Extraer contratos del sistema', completed: true },
          { id: 's2', title: 'Clasificar por tipo de jornada', completed: true },
          { id: 's3', title: 'Identificar contratos a modificar', completed: true }
        ]
      },
      {
        id: 't2',
        title: 'Actualización del sistema de control horario',
        description: 'Configurar el sistema para la nueva jornada máxima',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2025-02-10'),
        assignee: 'TI',
        assigneeType: 'team',
        estimatedHours: 16,
        dependencies: ['t1'],
        subtasks: [
          { id: 's4', title: 'Modificar parámetros de jornada', completed: true },
          { id: 's5', title: 'Actualizar alertas de exceso', completed: false },
          { id: 's6', title: 'Pruebas del sistema', completed: false }
        ]
      },
      {
        id: 't3',
        title: 'Comunicación oficial a empleados',
        description: 'Informar a toda la plantilla sobre los cambios',
        status: 'pending',
        priority: 'high',
        dueDate: new Date('2025-02-12'),
        assignee: 'Comunicación Interna',
        assigneeType: 'role',
        estimatedHours: 8,
        dependencies: ['t2']
      },
      {
        id: 't4',
        title: 'Negociación con representantes',
        description: 'Acordar con comité de empresa la implementación',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2025-02-14'),
        assignee: 'Director RRHH',
        assigneeType: 'user',
        estimatedHours: 20
      },
      {
        id: 't5',
        title: 'Modificación de contratos afectados',
        description: 'Generar y firmar anexos contractuales',
        status: 'pending',
        priority: 'critical',
        dueDate: new Date('2025-03-01'),
        assignee: 'Equipo Legal',
        assigneeType: 'team',
        estimatedHours: 80,
        dependencies: ['t1', 't4']
      },
      {
        id: 't6',
        title: 'Formación a managers',
        description: 'Capacitar a responsables sobre nuevas normas',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date('2025-03-15'),
        assignee: 'Formación',
        assigneeType: 'team',
        estimatedHours: 24
      }
    ]
  },
  {
    id: '2',
    regulation: 'AI Act',
    jurisdiction: 'EU',
    title: 'Plan de Cumplimiento AI Act',
    description: 'Adaptación de sistemas de IA a los requisitos del Reglamento europeo.',
    createdAt: new Date('2025-01-26'),
    effectiveDate: new Date('2025-08-01'),
    status: 'active',
    progress: 20,
    owner: 'Dirección TI + Compliance',
    affectedAreas: ['TI', 'Legal', 'Compliance', 'Productos'],
    estimatedCost: '50.000 - 100.000€',
    riskLevel: 'critical',
    tasks: [
      {
        id: 'ai1',
        title: 'Inventario completo de sistemas IA',
        description: 'Mapear todos los sistemas que utilizan IA en la organización',
        status: 'in_progress',
        priority: 'critical',
        dueDate: new Date('2025-03-31'),
        assignee: 'CTO',
        assigneeType: 'user',
        estimatedHours: 60
      },
      {
        id: 'ai2',
        title: 'Clasificación de riesgo',
        description: 'Evaluar cada sistema según categorías del AI Act',
        status: 'pending',
        priority: 'critical',
        dueDate: new Date('2025-05-01'),
        assignee: 'Compliance',
        assigneeType: 'team',
        estimatedHours: 40,
        dependencies: ['ai1']
      },
      {
        id: 'ai3',
        title: 'Documentación técnica',
        description: 'Preparar documentación requerida para sistemas alto riesgo',
        status: 'pending',
        priority: 'high',
        dueDate: new Date('2025-06-30'),
        assignee: 'TI + Legal',
        assigneeType: 'team',
        estimatedHours: 120,
        dependencies: ['ai2']
      }
    ]
  }
];

const statusColors = {
  pending: 'bg-gray-500/10 text-gray-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-green-500/10 text-green-500',
  blocked: 'bg-red-500/10 text-red-500',
  draft: 'bg-gray-500/10 text-gray-500',
  active: 'bg-blue-500/10 text-blue-500',
  overdue: 'bg-red-500/10 text-red-500'
};

const statusLabels = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  blocked: 'Bloqueado',
  draft: 'Borrador',
  active: 'Activo',
  overdue: 'Vencido'
};

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  critical: 'text-red-500'
};

export function LegalAdaptationPlanPanel({ companyId, className }: LegalAdaptationPlanPanelProps) {
  const [plans, setPlans] = useState<AdaptationPlan[]>(DEMO_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<AdaptationPlan | null>(DEMO_PLANS[0]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(['t1', 't2']));
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const handleToggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleToggleSubtask = useCallback((planId: string, taskId: string, subtaskId: string) => {
    setPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        tasks: plan.tasks.map(task => {
          if (task.id !== taskId || !task.subtasks) return task;
          const updatedSubtasks = task.subtasks.map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          return { ...task, subtasks: updatedSubtasks };
        })
      };
    }));
  }, []);

  const handleGeneratePlan = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'generate_adaptation_plan',
          context: { companyId }
        }
      });

      if (error) throw error;
      toast.success('Plan de adaptación generado');
    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error('Error al generar plan');
    } finally {
      setIsGenerating(false);
    }
  }, [companyId]);

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAssigneeIcon = (type: string) => {
    switch (type) {
      case 'team': return <Users className="h-3 w-3" />;
      case 'role': return <Building className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  return (
    <div className={cn("grid gap-4 lg:grid-cols-4", className)}>
      {/* Lista de planes */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Planes de Adaptación</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleGeneratePlan} disabled={isGenerating}>
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:shadow-md",
                    selectedPlan?.id === plan.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{plan.jurisdiction}</Badge>
                      <Badge className={cn("text-xs", statusColors[plan.status])}>
                        {statusLabels[plan.status]}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm line-clamp-2">{plan.title}</h4>
                    <div className="flex items-center justify-between">
                      <Progress value={plan.progress} className="h-1.5 flex-1 mr-2" />
                      <span className="text-xs font-medium">{plan.progress}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detalle del plan */}
      <Card className="lg:col-span-3">
        {selectedPlan ? (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                    <ListChecks className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedPlan.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{selectedPlan.regulation}</span>
                      <span>•</span>
                      <span>Vigente: {format(selectedPlan.effectiveDate, 'dd/MM/yyyy')}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Compartir
                  </Button>
                </div>
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Progreso total</p>
                  <p className="text-xl font-bold">{selectedPlan.progress}%</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Tareas</p>
                  <p className="text-xl font-bold">
                    {selectedPlan.tasks.filter(t => t.status === 'completed').length}/{selectedPlan.tasks.length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Coste estimado</p>
                  <p className="text-sm font-bold">{selectedPlan.estimatedCost || 'Por definir'}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Riesgo</p>
                  <Badge className={cn(
                    "mt-1",
                    selectedPlan.riskLevel === 'critical' && "bg-red-500/10 text-red-500",
                    selectedPlan.riskLevel === 'high' && "bg-orange-500/10 text-orange-500",
                    selectedPlan.riskLevel === 'medium' && "bg-yellow-500/10 text-yellow-500",
                    selectedPlan.riskLevel === 'low' && "bg-green-500/10 text-green-500"
                  )}>
                    {selectedPlan.riskLevel === 'critical' && 'Crítico'}
                    {selectedPlan.riskLevel === 'high' && 'Alto'}
                    {selectedPlan.riskLevel === 'medium' && 'Medio'}
                    {selectedPlan.riskLevel === 'low' && 'Bajo'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Tareas
                  </TabsTrigger>
                  <TabsTrigger value="gantt" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Cronograma
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Recursos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tasks">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {selectedPlan.tasks.map((task) => (
                        <Card key={task.id} className="p-3">
                          <div className="space-y-2">
                            <div 
                              className="flex items-start gap-3 cursor-pointer"
                              onClick={() => task.subtasks && handleToggleTask(task.id)}
                            >
                              {getTaskIcon(task.status)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className={cn(
                                    "font-medium text-sm",
                                    task.status === 'completed' && "line-through text-muted-foreground"
                                  )}>
                                    {task.title}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge className={statusColors[task.status]} variant="outline">
                                      {statusLabels[task.status]}
                                    </Badge>
                                    {task.subtasks && (
                                      expandedTasks.has(task.id) 
                                        ? <ChevronDown className="h-4 w-4" />
                                        : <ChevronRight className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(task.dueDate, 'dd/MM/yyyy')}
                                  </span>
                                  {task.assignee && (
                                    <span className="flex items-center gap-1">
                                      {getAssigneeIcon(task.assigneeType)}
                                      {task.assignee}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.estimatedHours}h
                                  </span>
                                  <Target className={cn("h-3 w-3", priorityColors[task.priority])} />
                                </div>
                              </div>
                            </div>

                            {/* Subtareas */}
                            {task.subtasks && expandedTasks.has(task.id) && (
                              <div className="ml-7 mt-2 space-y-1.5 border-l-2 pl-4">
                                {task.subtasks.map((subtask) => (
                                  <div 
                                    key={subtask.id} 
                                    className="flex items-center gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSubtask(selectedPlan.id, task.id, subtask.id);
                                    }}
                                  >
                                    <Checkbox checked={subtask.completed} />
                                    <span className={cn(
                                      "text-sm",
                                      subtask.completed && "line-through text-muted-foreground"
                                    )}>
                                      {subtask.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="gantt">
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Vista de Gantt disponible próximamente</p>
                      <p className="text-xs mt-2">Visualización temporal de tareas y dependencias</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="resources">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Equipos involucrados
                      </h4>
                      <div className="space-y-2">
                        {selectedPlan.affectedAreas.map((area, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{area}</span>
                            <Badge variant="outline" className="text-xs">Activo</Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Responsable del plan
                      </h4>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{selectedPlan.owner}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Creado: {format(selectedPlan.createdAt, 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        ) : (
          <CardContent className="h-[600px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona un plan para ver el detalle</p>
              <Button variant="outline" className="mt-4" onClick={handleGeneratePlan}>
                <Plus className="h-4 w-4 mr-2" />
                Generar nuevo plan con IA
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default LegalAdaptationPlanPanel;
