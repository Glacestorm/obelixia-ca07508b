/**
 * LegalEnforcementTimelinePanel - Timeline de Entrada en Vigor
 * Fase 8: Calendario visual de obligaciones normativas y plazos de adaptación
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Target,
  Flag,
  CalendarDays,
  ListChecks,
  Timer,
  Zap,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, isPast, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';

interface EnforcementDeadline {
  id: string;
  regulation: string;
  title: string;
  jurisdiction: string;
  date: Date;
  type: 'enforcement' | 'transition_end' | 'reporting' | 'compliance_check';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requiredActions: string[];
  progress: number;
  affectedModules: string[];
  reminderSet: boolean;
}

interface LegalEnforcementTimelinePanelProps {
  companyId?: string;
  className?: string;
}

const DEMO_DEADLINES: EnforcementDeadline[] = [
  {
    id: '1',
    regulation: 'Ley 28/2025',
    title: 'Entrada en vigor Ley Jornada Laboral',
    jurisdiction: 'ES',
    date: new Date('2025-02-15'),
    type: 'enforcement',
    status: 'in_progress',
    priority: 'critical',
    description: 'Aplicación inmediata de la reducción de jornada a 37.5 horas',
    requiredActions: ['Actualizar contratos', 'Configurar control horario', 'Comunicar a empleados'],
    progress: 45,
    affectedModules: ['HR', 'Nóminas'],
    reminderSet: true
  },
  {
    id: '2',
    regulation: 'DORA',
    title: 'Plazo final evaluación resiliencia',
    jurisdiction: 'EU',
    date: new Date('2025-02-17'),
    type: 'compliance_check',
    status: 'in_progress',
    priority: 'high',
    description: 'Completar evaluación de resiliencia operativa digital',
    requiredActions: ['Mapeo de TIC', 'Test de continuidad', 'Documentación'],
    progress: 70,
    affectedModules: ['TI', 'Compliance'],
    reminderSet: true
  },
  {
    id: '3',
    regulation: 'RD 45/2025',
    title: 'Aplicación nuevas normas datos laborales',
    jurisdiction: 'ES',
    date: new Date('2025-03-01'),
    type: 'enforcement',
    status: 'pending',
    priority: 'high',
    description: 'Nuevos límites a monitorización de empleados',
    requiredActions: ['Revisar políticas', 'Actualizar DPIA', 'Formación'],
    progress: 20,
    affectedModules: ['HR', 'GDPR'],
    reminderSet: false
  },
  {
    id: '4',
    regulation: 'Llei 5/2025',
    title: 'Nuevos requisitos capital sociedades',
    jurisdiction: 'AD',
    date: new Date('2025-04-01'),
    type: 'enforcement',
    status: 'pending',
    priority: 'medium',
    description: 'Adaptación estatutaria a nuevos mínimos',
    requiredActions: ['Revisar estatutos', 'Aumento capital si aplica', 'Inscripción registral'],
    progress: 0,
    affectedModules: ['Societario'],
    reminderSet: false
  },
  {
    id: '5',
    regulation: 'AI Act',
    title: 'Entrada en vigor parcial AI Act',
    jurisdiction: 'EU',
    date: new Date('2025-08-01'),
    type: 'enforcement',
    status: 'pending',
    priority: 'critical',
    description: 'Requisitos para sistemas IA alto riesgo sector financiero',
    requiredActions: ['Inventario IA', 'Clasificación riesgo', 'Documentación técnica'],
    progress: 15,
    affectedModules: ['IA', 'Compliance'],
    reminderSet: true
  },
  {
    id: '6',
    regulation: 'Ley 28/2025',
    title: 'Fin período transitorio jornada',
    jurisdiction: 'ES',
    date: new Date('2025-08-15'),
    type: 'transition_end',
    status: 'pending',
    priority: 'high',
    description: 'Fecha límite para adaptación completa',
    requiredActions: ['Verificar cumplimiento', 'Auditoría interna'],
    progress: 0,
    affectedModules: ['HR', 'Nóminas'],
    reminderSet: true
  },
  {
    id: '7',
    regulation: 'CSRD',
    title: 'Primer reporte sostenibilidad',
    jurisdiction: 'EU',
    date: new Date('2026-01-01'),
    type: 'reporting',
    status: 'pending',
    priority: 'medium',
    description: 'Primer informe ESG bajo CSRD para empresas afectadas',
    requiredActions: ['Recopilación datos ESG', 'Verificación', 'Publicación'],
    progress: 5,
    affectedModules: ['ESG', 'Reporting'],
    reminderSet: false
  }
];

const typeLabels = {
  enforcement: 'Entrada en vigor',
  transition_end: 'Fin transición',
  reporting: 'Reporte',
  compliance_check: 'Verificación'
};

const typeColors = {
  enforcement: 'bg-blue-500',
  transition_end: 'bg-orange-500',
  reporting: 'bg-purple-500',
  compliance_check: 'bg-green-500'
};

const statusColors = {
  pending: 'bg-gray-500/10 text-gray-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-green-500/10 text-green-500',
  overdue: 'bg-red-500/10 text-red-500'
};

const statusLabels = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  overdue: 'Vencido'
};

const priorityColors = {
  low: 'border-gray-300',
  medium: 'border-blue-400',
  high: 'border-orange-400',
  critical: 'border-red-500'
};

export function LegalEnforcementTimelinePanel({ companyId, className }: LegalEnforcementTimelinePanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDeadline, setSelectedDeadline] = useState<EnforcementDeadline | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Estadísticas
  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = DEMO_DEADLINES.filter(d => differenceInDays(d.date, now) <= 30 && differenceInDays(d.date, now) >= 0);
    const overdue = DEMO_DEADLINES.filter(d => isPast(d.date) && d.status !== 'completed');
    const critical = DEMO_DEADLINES.filter(d => d.priority === 'critical' && d.status !== 'completed');
    const inProgress = DEMO_DEADLINES.filter(d => d.status === 'in_progress');

    return { upcoming: upcoming.length, overdue: overdue.length, critical: critical.length, inProgress: inProgress.length };
  }, []);

  // Ordenar por fecha
  const sortedDeadlines = useMemo(() => {
    return [...DEMO_DEADLINES].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, []);

  const getDeadlinesForDay = (day: Date) => {
    return DEMO_DEADLINES.filter(d => isSameDay(d.date, day));
  };

  const getDaysUntil = (date: Date) => {
    const days = differenceInDays(date, new Date());
    if (days < 0) return `Hace ${Math.abs(days)} días`;
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  };

  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      {/* Panel principal */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-teal-600">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Timeline de Obligaciones</CardTitle>
                <CardDescription>
                  Calendario de entrada en vigor y plazos
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-red-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
            <div className="bg-orange-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground">Próx. 30d</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">En progreso</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendario
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              {/* Navegación del mes */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendario */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}
                {days.map((day) => {
                  const deadlines = getDeadlinesForDay(day);
                  const hasCritical = deadlines.some(d => d.priority === 'critical');
                  const hasHigh = deadlines.some(d => d.priority === 'high');

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "aspect-square p-1 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors relative",
                        isToday(day) && "bg-primary/10 border-primary",
                        !isSameMonth(day, currentDate) && "opacity-30",
                        deadlines.length > 0 && "border-2",
                        hasCritical && "border-red-500",
                        !hasCritical && hasHigh && "border-orange-400"
                      )}
                      onClick={() => deadlines.length > 0 && setSelectedDeadline(deadlines[0])}
                    >
                      <span className={cn(
                        "text-xs font-medium",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {deadlines.length > 0 && (
                        <div className="absolute bottom-1 left-1 right-1 flex gap-0.5">
                          {deadlines.slice(0, 3).map((d, idx) => (
                            <div 
                              key={idx}
                              className={cn("h-1.5 flex-1 rounded-full", typeColors[d.type])}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-4 mt-4 text-xs">
                {Object.entries(typeLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className={cn("h-2 w-2 rounded-full", typeColors[key as keyof typeof typeColors])} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {sortedDeadlines.map((deadline) => {
                    const daysUntil = differenceInDays(deadline.date, new Date());
                    const isUrgent = daysUntil >= 0 && daysUntil <= 7;
                    
                    return (
                      <Card 
                        key={deadline.id}
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:shadow-md border-l-4",
                          priorityColors[deadline.priority],
                          selectedDeadline?.id === deadline.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedDeadline(deadline)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {deadline.jurisdiction}
                              </Badge>
                              <Badge className={cn("text-xs", statusColors[deadline.status])}>
                                {statusLabels[deadline.status]}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", typeColors[deadline.type].replace('bg-', 'bg-').concat('/10'))}
                              >
                                {typeLabels[deadline.type]}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-sm">{deadline.title}</h4>
                            <p className="text-xs text-muted-foreground">{deadline.regulation}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "text-sm font-bold",
                              daysUntil < 0 && "text-red-500",
                              isUrgent && daysUntil >= 0 && "text-orange-500",
                              daysUntil > 7 && "text-muted-foreground"
                            )}>
                              {getDaysUntil(deadline.date)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(deadline.date, 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-medium">{deadline.progress}%</span>
                          </div>
                          <Progress value={deadline.progress} className="h-1.5" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Panel de detalle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de Obligación</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDeadline ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{selectedDeadline.jurisdiction}</Badge>
                  <Badge className={statusColors[selectedDeadline.status]}>
                    {statusLabels[selectedDeadline.status]}
                  </Badge>
                </div>
                <h4 className="font-medium">{selectedDeadline.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedDeadline.regulation}</p>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(selectedDeadline.date, 'dd MMMM yyyy', { locale: es })}
                  </span>
                </div>
                <p className={cn(
                  "text-sm font-bold",
                  differenceInDays(selectedDeadline.date, new Date()) < 0 && "text-red-500",
                  differenceInDays(selectedDeadline.date, new Date()) <= 7 && differenceInDays(selectedDeadline.date, new Date()) >= 0 && "text-orange-500"
                )}>
                  {getDaysUntil(selectedDeadline.date)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedDeadline.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progreso</span>
                  <span className="text-sm font-bold">{selectedDeadline.progress}%</span>
                </div>
                <Progress value={selectedDeadline.progress} className="h-2" />
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2">Acciones requeridas</h5>
                <div className="space-y-2">
                  {selectedDeadline.requiredActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2">Módulos afectados</h5>
                <div className="flex flex-wrap gap-1">
                  {selectedDeadline.affectedModules.map((module, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Bell className="h-4 w-4 mr-1" />
                  {selectedDeadline.reminderSet ? 'Recordatorio activo' : 'Crear recordatorio'}
                </Button>
                <Button size="sm" className="flex-1">
                  <Zap className="h-4 w-4 mr-1" />
                  Ver plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-center text-muted-foreground">
              <div>
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una fecha u obligación</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalEnforcementTimelinePanel;
