/**
 * VerticalAgentsRegistryPanel - Panel de Registro de Agentes Verticales
 * 
 * Vista unificada para gestionar todos los agentes de verticales:
 * - Healthcare, Agriculture, Industrial, Services
 * - Métricas de sesiones activas
 * - Tareas pendientes y completadas
 * - Historial de decisiones
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  HeartPulse,
  Leaf,
  Factory,
  Headphones,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
  Activity,
  Play,
  Pause,
  Eye,
  Brain,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VerticalType, SessionStatus, TaskStatus } from '@/hooks/admin/verticals/agents/useVerticalAgent';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// === TYPES ===
interface VerticalAgentStats {
  verticalType: VerticalType;
  activeSessions: number;
  totalSessions: number;
  tasksCompleted: number;
  tasksPending: number;
  avgConfidence: number;
  lastActivity: string | null;
}

interface SessionSummary {
  id: string;
  vertical_type: VerticalType;
  agent_mode: 'supervised' | 'autonomous';
  status: SessionStatus;
  tasks_executed: number;
  tasks_pending: number;
  confidence_threshold: number;
  started_at: string;
  ended_at: string | null;
  user_id: string;
}

interface TaskSummary {
  id: string;
  session_id: string;
  vertical_type: VerticalType;
  task_type: string;
  status: TaskStatus;
  priority: number;
  confidence_score: number | null;
  execution_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

// === CONFIG ===
const VERTICAL_CONFIG: Record<VerticalType, {
  name: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
}> = {
  healthcare: {
    name: 'Healthcare',
    icon: HeartPulse,
    color: 'text-rose-500',
    bgGradient: 'from-rose-500 to-pink-600',
  },
  agriculture: {
    name: 'Agricultura',
    icon: Leaf,
    color: 'text-emerald-500',
    bgGradient: 'from-emerald-500 to-teal-600',
  },
  industrial: {
    name: 'Industrial',
    icon: Factory,
    color: 'text-orange-500',
    bgGradient: 'from-orange-500 to-amber-600',
  },
  services: {
    name: 'Servicios',
    icon: Headphones,
    color: 'text-blue-500',
    bgGradient: 'from-blue-500 to-indigo-600',
  },
};

// === MAIN COMPONENT ===
export function VerticalAgentsRegistryPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<VerticalAgentStats[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('vertical_agent_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (sessionsError) throw sessionsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('vertical_agent_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (tasksError) throw tasksError;

      setSessions(sessionsData as SessionSummary[]);
      setTasks(tasksData as TaskSummary[]);

      // Calculate stats per vertical
      const verticals: VerticalType[] = ['healthcare', 'agriculture', 'industrial', 'services'];
      const calculatedStats = verticals.map(vertical => {
        const verticalSessions = sessionsData?.filter(s => s.vertical_type === vertical) || [];
        const activeSessions = verticalSessions.filter(s => s.status === 'active').length;
        const verticalTasks = tasksData?.filter(t => t.vertical_type === vertical) || [];
        const completedTasks = verticalTasks.filter(t => t.status === 'completed').length;
        const pendingTasks = verticalTasks.filter(t => 
          t.status === 'pending' || t.status === 'requires_approval'
        ).length;
        
        const confidenceScores = verticalTasks
          .filter(t => t.confidence_score !== null)
          .map(t => t.confidence_score!);
        const avgConfidence = confidenceScores.length > 0
          ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length * 100)
          : 0;

        const lastSession = verticalSessions[0];

        return {
          verticalType: vertical,
          activeSessions,
          totalSessions: verticalSessions.length,
          tasksCompleted: completedTasks,
          tasksPending: pendingTasks,
          avgConfidence,
          lastActivity: lastSession?.started_at || null,
        };
      });

      setStats(calculatedStats);
      setLastRefresh(new Date());

    } catch (err) {
      console.error('Error fetching vertical agents data:', err);
      toast.error('Error al cargar datos de agentes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes
    const sessionsChannel = supabase
      .channel('vertical-sessions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vertical_agent_sessions' },
        () => fetchData()
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('vertical-tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vertical_agent_tasks' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [fetchData]);

  // Filter sessions by search
  const filteredSessions = sessions.filter(s =>
    s.vertical_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Totals
  const totalActiveSessions = stats.reduce((a, s) => a + s.activeSessions, 0);
  const totalTasksCompleted = stats.reduce((a, s) => a + s.tasksCompleted, 0);
  const totalTasksPending = stats.reduce((a, s) => a + s.tasksPending, 0);
  const overallConfidence = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.avgConfidence, 0) / stats.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            Registro de Agentes Verticales
          </h2>
          <p className="text-muted-foreground mt-1">
            {lastRefresh ? (
              <>Actualizado {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}</>
            ) : (
              'Sincronizando...'
            )}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualizar
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Sesiones Activas"
          value={totalActiveSessions}
          subtitle={`de ${sessions.length} totales`}
          icon={Activity}
          color="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Tareas Completadas"
          value={totalTasksCompleted}
          subtitle="ejecutadas"
          icon={CheckCircle}
          color="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Tareas Pendientes"
          value={totalTasksPending}
          subtitle="por procesar"
          icon={Clock}
          color="from-amber-500 to-orange-600"
        />
        <StatCard
          title="Confianza Promedio"
          value={`${overallConfidence}%`}
          subtitle="global"
          icon={Target}
          color="from-purple-500 to-violet-600"
        />
      </div>

      {/* Vertical Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => {
          const config = VERTICAL_CONFIG[stat.verticalType];
          const Icon = config.icon;

          return (
            <Card key={stat.verticalType} className="overflow-hidden">
              <CardHeader className={cn(
                "pb-2 bg-gradient-to-r",
                config.bgGradient,
                "text-white"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-base">{config.name}</CardTitle>
                  </div>
                  <Badge 
                    variant={stat.activeSessions > 0 ? 'default' : 'secondary'}
                    className="bg-white/20 hover:bg-white/30"
                  >
                    {stat.activeSessions} activos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Sesiones</p>
                    <p className="font-medium">{stat.totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tareas</p>
                    <p className="font-medium">{stat.tasksCompleted + stat.tasksPending}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Completadas</p>
                    <p className="font-medium text-green-500">{stat.tasksCompleted}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Pendientes</p>
                    <p className="font-medium text-amber-500">{stat.tasksPending}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confianza</span>
                    <span className="font-medium">{stat.avgConfidence}%</span>
                  </div>
                  <Progress value={stat.avgConfidence} className="h-1.5" />
                </div>

                {stat.lastActivity && (
                  <p className="text-xs text-muted-foreground">
                    Última actividad: {formatDistanceToNow(new Date(stat.lastActivity), { 
                      locale: es, 
                      addSuffix: true 
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Sesiones</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <SessionsTab
            sessions={filteredSessions}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TasksTab tasks={tasks} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingTasksTab 
            tasks={tasks.filter(t => 
              t.status === 'pending' || t.status === 'requires_approval'
            )} 
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === SUB-COMPONENTS ===

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br", color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionsTab({
  sessions,
  searchQuery,
  setSearchQuery,
  isLoading
}: {
  sessions: SessionSummary[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Sesiones de Agentes</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sesiones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bot className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay sesiones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => {
                const config = VERTICAL_CONFIG[session.vertical_type];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-br",
                        config.bgGradient
                      )}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{config.name}</p>
                          <Badge variant={session.agent_mode === 'autonomous' ? 'default' : 'secondary'} className="text-[10px]">
                            {session.agent_mode === 'autonomous' ? 'Autónomo' : 'Supervisado'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.tasks_executed} tareas · {formatDistanceToNow(new Date(session.started_at), { locale: es, addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={session.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ir al Panel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TasksTab({
  tasks,
  isLoading
}: {
  tasks: TaskSummary[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Historial de Tareas</CardTitle>
        <CardDescription>Todas las tareas ejecutadas por agentes verticales</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Zap className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay tareas registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 50).map(task => {
                const config = VERTICAL_CONFIG[task.vertical_type];
                const Icon = config.icon;

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded", config.bgGradient)}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.task_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {config.name} · {formatDistanceToNow(new Date(task.created_at), { locale: es, addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {task.confidence_score !== null && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(task.confidence_score * 100)}%
                        </span>
                      )}
                      {task.execution_time_ms !== null && (
                        <span className="text-xs text-muted-foreground">
                          {task.execution_time_ms}ms
                        </span>
                      )}
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PendingTasksTab({
  tasks,
  isLoading,
  onRefresh
}: {
  tasks: TaskSummary[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const handleApprove = async (taskId: string) => {
    try {
      await supabase
        .from('vertical_agent_tasks')
        .update({ status: 'running' })
        .eq('id', taskId);
      toast.success('Tarea aprobada');
      onRefresh();
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await supabase
        .from('vertical_agent_tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);
      toast.info('Tarea rechazada');
      onRefresh();
    } catch {
      toast.error('Error al rechazar');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Tareas Pendientes de Aprobación
            </CardTitle>
            <CardDescription>{tasks.length} tareas esperando revisión</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 opacity-50 text-green-500" />
              <p className="text-sm">No hay tareas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const config = VERTICAL_CONFIG[task.vertical_type];
                const Icon = config.icon;

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border bg-card border-amber-500/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-gradient-to-br", config.bgGradient)}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{task.task_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {config.name} · Prioridad: {task.priority}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500 text-amber-500">
                        Pendiente
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(task.id)}
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className={cn("bg-gradient-to-r", config.bgGradient)}
                        onClick={() => handleApprove(task.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const config = {
    active: { label: 'Activo', variant: 'default' as const, className: 'bg-green-500' },
    paused: { label: 'Pausado', variant: 'secondary' as const, className: '' },
    completed: { label: 'Completado', variant: 'outline' as const, className: '' },
    failed: { label: 'Fallido', variant: 'destructive' as const, className: '' },
  };

  const cfg = config[status] || config.completed;
  
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    pending: { label: 'Pendiente', className: 'bg-slate-500' },
    running: { label: 'Ejecutando', className: 'bg-blue-500' },
    completed: { label: 'Completada', className: 'bg-green-500' },
    failed: { label: 'Fallida', className: 'bg-red-500' },
    cancelled: { label: 'Cancelada', className: 'bg-gray-500' },
    requires_approval: { label: 'Pendiente', className: 'bg-amber-500' },
  };

  const cfg = config[status] || config.pending;
  
  return (
    <Badge className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

export default VerticalAgentsRegistryPanel;
