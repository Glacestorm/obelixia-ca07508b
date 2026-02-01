/**
 * HROnboardingPanel - Fase 3: Proceso de Onboarding Adaptativo por CNAE
 * Gestión de incorporaciones con tareas adaptadas al sector económico
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Sparkles,
  Users,
  ClipboardList,
  FileText,
  Calendar,
  Target,
  RefreshCw,
  Plus,
  Search,
  Play,
  Pause,
  LayoutGrid,
  List
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HROnboardingPanelProps {
  companyId: string;
}

interface OnboardingTemplate {
  id: string;
  template_name: string;
  cnae_code: string | null;
  description: string | null;
  phases: any[];
  estimated_duration_days: number;
  is_default: boolean;
  is_active: boolean;
}

interface EmployeeOnboarding {
  id: string;
  employee_id: string;
  template_id: string | null;
  status: string;
  started_at: string | null;
  target_completion_date: string | null;
  completed_at: string | null;
  current_phase: string | null;
  progress_percentage: number;
  assigned_buddy_id: string | null;
  notes: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    job_title: string | null;
  };
  buddy?: {
    first_name: string;
    last_name: string;
  };
  template?: OnboardingTemplate;
}

interface OnboardingTask {
  id: string;
  onboarding_id: string;
  task_code: string;
  task_name: string;
  description: string | null;
  phase: string;
  order_in_phase: number;
  responsible: string;
  due_date: string | null;
  completed_at: string | null;
  status: string;
  priority: string;
  requires_signature: boolean;
  ai_generated: boolean;
}

export function HROnboardingPanel({ companyId }: HROnboardingPanelProps) {
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [onboardings, setOnboardings] = useState<EmployeeOnboarding[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [selectedOnboarding, setSelectedOnboarding] = useState<EmployeeOnboarding | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTasksDialog, setShowTasksDialog] = useState(false);

  // Fetch onboardings
  const fetchOnboardings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_onboarding')
        .select(`
          *,
          employee:erp_hr_employees!employee_id(first_name, last_name, job_title),
          buddy:erp_hr_employees!assigned_buddy_id(first_name, last_name),
          template:erp_hr_onboarding_templates(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOnboardings(data as EmployeeOnboarding[] || []);
    } catch (error) {
      console.error('Error fetching onboardings:', error);
      toast.error('Error al cargar onboardings');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_onboarding_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data as OnboardingTemplate[] || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [companyId]);

  // Fetch tasks for selected onboarding
  const fetchTasks = useCallback(async (onboardingId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_onboarding_tasks')
        .select('*')
        .eq('onboarding_id', onboardingId)
        .order('phase')
        .order('order_in_phase');

      if (error) throw error;
      setTasks(data as OnboardingTask[] || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error al cargar tareas');
    }
  }, []);

  useEffect(() => {
    fetchOnboardings();
    fetchTemplates();
  }, [fetchOnboardings, fetchTemplates]);

  // Generate AI onboarding plan
  const generateOnboardingPlan = async (cnaeCode: string, jobPosition: string, department: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-onboarding-agent', {
        body: {
          action: 'generate_onboarding_plan',
          company_id: companyId,
          cnae_code: cnaeCode,
          job_position: jobPosition,
          department: department
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        // Save template
        const { data: savedTemplate, error: saveError } = await supabase
          .from('erp_hr_onboarding_templates')
          .insert([{
            company_id: companyId,
            template_name: data.data.template_name,
            description: data.data.description,
            cnae_code: cnaeCode,
            phases: data.data.phases,
            estimated_duration_days: data.data.estimated_duration_days || 30,
            is_active: true
          }])
          .select()
          .single();

        if (saveError) throw saveError;

        toast.success('Plan de onboarding generado con IA');
        fetchTemplates();
        return savedTemplate;
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error('Error al generar plan');
    } finally {
      setIsGenerating(false);
    }
    return null;
  };

  // Complete task
  const completeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_onboarding_tasks')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Tarea completada');
      if (selectedOnboarding) {
        fetchTasks(selectedOnboarding.id);
        fetchOnboardings();
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Error al completar tarea');
    }
  };

  // Filter onboardings
  const filteredOnboardings = onboardings.filter(o => {
    const matchesSearch = 
      o.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.employee?.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const activeOnboardings = filteredOnboardings.filter(o => o.status === 'in_progress');
  const completedOnboardings = filteredOnboardings.filter(o => o.status === 'completed');
  const pendingOnboardings = filteredOnboardings.filter(o => o.status === 'not_started');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/20 text-success border-success/30">Completado</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary/20 text-primary border-primary/30">En progreso</Badge>;
      case 'paused':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Pausado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const getResponsibleLabel = (responsible: string) => {
    const labels: Record<string, string> = {
      employee: 'Empleado',
      buddy: 'Buddy',
      hr: 'RRHH',
      manager: 'Manager',
      it: 'IT',
      finance: 'Finanzas'
    };
    return labels[responsible] || responsible;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Crítica</Badge>;
      case 'high':
        return <Badge className="bg-warning/20 text-warning text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Media</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Baja</Badge>;
    }
  };

  // Stats
  const stats = {
    active: activeOnboardings.length,
    completed: completedOnboardings.length,
    pending: pendingOnboardings.length,
    avgProgress: activeOnboardings.length > 0 
      ? Math.round(activeOnboardings.reduce((sum, o) => sum + o.progress_percentage, 0) / activeOnboardings.length)
      : 0
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En Progreso</p>
                <p className="text-2xl font-bold text-primary">{stats.active}</p>
              </div>
              <Play className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Progreso Medio</p>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
              </div>
              <Target className="h-8 w-8 text-accent/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Gestión de Onboarding
              </CardTitle>
              <CardDescription>
                Proceso de incorporación adaptativo por sector CNAE
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchOnboardings()}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowNewDialog(true)}
                className="gap-1"
              >
                <Sparkles className="h-4 w-4" />
                Generar Plan IA
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="not_started">Pendiente</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="gap-1">
                <Play className="h-3 w-3" />
                Activos ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="h-3 w-3" />
                Pendientes ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completados ({stats.completed})
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-1">
                <FileText className="h-3 w-3" />
                Plantillas ({templates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              <ScrollArea className="h-[400px]">
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {activeOnboardings.map((onboarding) => (
                      <Card 
                        key={onboarding.id} 
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          setSelectedOnboarding(onboarding);
                          fetchTasks(onboarding.id);
                          setShowTasksDialog(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">
                                {onboarding.employee?.first_name} {onboarding.employee?.last_name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {onboarding.employee?.job_title || 'Sin puesto'}
                              </p>
                            </div>
                            {getStatusBadge(onboarding.status)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progreso</span>
                              <span className="font-medium">{onboarding.progress_percentage}%</span>
                            </div>
                            <Progress value={onboarding.progress_percentage} className="h-2" />
                          </div>

                          {onboarding.current_phase && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Fase: {onboarding.current_phase}
                            </p>
                          )}

                          {onboarding.buddy && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              Buddy: {onboarding.buddy.first_name} {onboarding.buddy.last_name}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Puesto</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Progreso</TableHead>
                        <TableHead>Buddy</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeOnboardings.map((onboarding) => (
                        <TableRow 
                          key={onboarding.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedOnboarding(onboarding);
                            fetchTasks(onboarding.id);
                            setShowTasksDialog(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            {onboarding.employee?.first_name} {onboarding.employee?.last_name}
                          </TableCell>
                          <TableCell>{onboarding.employee?.job_title || '-'}</TableCell>
                          <TableCell>{onboarding.current_phase || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={onboarding.progress_percentage} className="h-2 w-20" />
                              <span className="text-xs">{onboarding.progress_percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {onboarding.buddy 
                              ? `${onboarding.buddy.first_name} ${onboarding.buddy.last_name}` 
                              : '-'
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(onboarding.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {activeOnboardings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No hay onboardings activos</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 gap-3">
                  {pendingOnboardings.map((onboarding) => (
                    <Card key={onboarding.id} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">
                              {onboarding.employee?.first_name} {onboarding.employee?.last_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {onboarding.employee?.job_title || 'Sin puesto'}
                            </p>
                          </div>
                          {getStatusBadge(onboarding.status)}
                        </div>
                        <Button size="sm" variant="outline" className="w-full mt-2 gap-1">
                          <Play className="h-3 w-3" />
                          Iniciar Onboarding
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Completado</TableHead>
                      <TableHead>Duración</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOnboardings.map((onboarding) => (
                      <TableRow key={onboarding.id}>
                        <TableCell className="font-medium">
                          {onboarding.employee?.first_name} {onboarding.employee?.last_name}
                        </TableCell>
                        <TableCell>{onboarding.employee?.job_title || '-'}</TableCell>
                        <TableCell>
                          {onboarding.started_at 
                            ? format(new Date(onboarding.started_at), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {onboarding.completed_at 
                            ? format(new Date(onboarding.completed_at), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {onboarding.started_at && onboarding.completed_at
                            ? formatDistanceToNow(new Date(onboarding.started_at), { locale: es })
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{template.template_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {template.description || 'Sin descripción'}
                            </p>
                          </div>
                          {template.is_default && (
                            <Badge variant="secondary" className="text-xs">Por defecto</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            {template.phases?.length || 0} fases
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {template.estimated_duration_days} días
                          </span>
                          {template.cnae_code && (
                            <Badge variant="outline" className="text-xs">
                              CNAE {template.cnae_code}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No hay plantillas creadas</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2 gap-1"
                      onClick={() => setShowNewDialog(true)}
                    >
                      <Sparkles className="h-3 w-3" />
                      Generar con IA
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tasks Dialog */}
      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Tareas de Onboarding
              {selectedOnboarding?.employee && (
                <span className="text-muted-foreground font-normal">
                  - {selectedOnboarding.employee.first_name} {selectedOnboarding.employee.last_name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Gestiona las tareas del proceso de incorporación
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {/* Group tasks by phase */}
                {Array.from(new Set(tasks.map(t => t.phase))).map((phase) => (
                  <div key={phase} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2 sticky top-0 bg-background py-1">
                      <Target className="h-4 w-4 text-primary" />
                      {phase}
                    </h4>
                    {tasks.filter(t => t.phase === phase).map((task) => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          task.status === 'completed' && "bg-success/5 border-success/20"
                        )}
                      >
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={() => {
                            if (task.status !== 'completed') {
                              completeTask(task.id);
                            }
                          }}
                          disabled={task.status === 'completed'}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium text-sm",
                              task.status === 'completed' && "line-through text-muted-foreground"
                            )}>
                              {task.task_name}
                            </span>
                            {task.ai_generated && (
                              <Sparkles className="h-3 w-3 text-primary" />
                            )}
                            {getPriorityBadge(task.priority)}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Responsable: {getResponsibleLabel(task.responsible)}</span>
                            {task.due_date && (
                              <span>Vence: {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: es })}</span>
                            )}
                          </div>
                        </div>
                        {task.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No hay tareas para este onboarding</p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTasksDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Onboarding Plan Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generar Plan de Onboarding con IA
            </DialogTitle>
            <DialogDescription>
              La IA creará un plan personalizado según el sector CNAE y puesto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código CNAE</label>
              <Input 
                id="cnae-input"
                placeholder="Ej: 6201 - Desarrollo de software" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Puesto de trabajo</label>
              <Input 
                id="position-input"
                placeholder="Ej: Desarrollador Full Stack" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento</label>
              <Input 
                id="department-input"
                placeholder="Ej: Tecnología" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                const cnae = (document.getElementById('cnae-input') as HTMLInputElement)?.value;
                const position = (document.getElementById('position-input') as HTMLInputElement)?.value;
                const dept = (document.getElementById('department-input') as HTMLInputElement)?.value;
                
                if (!cnae || !position) {
                  toast.error('Completa CNAE y puesto');
                  return;
                }
                
                await generateOnboardingPlan(cnae, position, dept);
                setShowNewDialog(false);
              }}
              disabled={isGenerating}
              className="gap-1"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HROnboardingPanel;
