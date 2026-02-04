/**
 * HRComplianceCalendar - Calendario visual de obligaciones
 * Muestra vencimientos con código de colores por urgencia
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  getDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface HRComplianceCalendarProps {
  companyId: string;
  onDeadlineClick?: (deadline: CalendarDeadline) => void;
}

interface CalendarDeadline {
  id: string;
  obligation_name: string;
  organism: string;
  deadline_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  days_remaining: number;
  alert_level: 'prealert' | 'alert' | 'urgent' | 'critical';
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const ORGANISM_COLORS: Record<string, string> = {
  TGSS: 'bg-blue-500',
  AEAT: 'bg-green-500',
  SEPE: 'bg-purple-500',
  ITSS: 'bg-orange-500',
  CASS: 'bg-cyan-500',
  default: 'bg-gray-500',
};

const STATUS_ICONS = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  overdue: XCircle,
};

export function HRComplianceCalendar({ companyId, onDeadlineClick }: HRComplianceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deadlines, setDeadlines] = useState<CalendarDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Fetch deadlines for current month view
  const fetchDeadlines = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .rpc('get_upcoming_deadlines', {
          p_company_id: companyId,
          p_days_ahead: 60, // Get 2 months ahead
        });

      if (error) throw error;

      // Filter and transform deadlines
      const filtered = (data || [])
        .filter((d: { deadline_date: string }) => {
          const date = new Date(d.deadline_date);
          return date >= start && date <= end;
        })
        .map((d: Record<string, unknown>) => ({
          ...d,
          alert_level: getAlertLevel(d.days_remaining as number),
        }));

      setDeadlines(filtered as CalendarDeadline[]);
    } catch (error) {
      console.error('Error fetching calendar deadlines:', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, currentDate]);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  // Get alert level based on days remaining
  const getAlertLevel = (daysRemaining: number): CalendarDeadline['alert_level'] => {
    if (daysRemaining <= 3) return 'critical';
    if (daysRemaining <= 7) return 'urgent';
    if (daysRemaining <= 15) return 'alert';
    return 'prealert';
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group deadlines by date
  const deadlinesByDate = useMemo(() => {
    const grouped: Record<string, CalendarDeadline[]> = {};
    deadlines.forEach(d => {
      const dateKey = format(new Date(d.deadline_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(d);
    });
    return grouped;
  }, [deadlines]);

  // Get deadlines for selected day
  const selectedDayDeadlines = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    return deadlinesByDate[dateKey] || [];
  }, [selectedDay, deadlinesByDate]);

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get color for alert level
  const getAlertColor = (level: CalendarDeadline['alert_level']) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'alert': return 'bg-yellow-500 text-black';
      case 'prealert': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Get dot color for calendar day
  const getDayDotColor = (deadlinesForDay: CalendarDeadline[]) => {
    if (deadlinesForDay.some(d => d.alert_level === 'critical')) return 'bg-red-500';
    if (deadlinesForDay.some(d => d.alert_level === 'urgent')) return 'bg-orange-500';
    if (deadlinesForDay.some(d => d.alert_level === 'alert')) return 'bg-yellow-500';
    if (deadlinesForDay.some(d => d.status === 'completed')) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendario de Obligaciones
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </p>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayDeadlines = deadlinesByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const hasDeadlines = dayDeadlines.length > 0;

              return (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          'relative h-12 w-full rounded-md text-sm transition-colors',
                          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
                          !isCurrentMonth && 'text-muted-foreground/50',
                          isToday(day) && 'bg-primary/10 font-bold',
                          isSelected && 'ring-2 ring-primary bg-primary/5',
                        )}
                      >
                        <span className="absolute top-1 left-1/2 -translate-x-1/2">
                          {format(day, 'd')}
                        </span>
                        
                        {/* Deadline indicators */}
                        {hasDeadlines && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayDeadlines.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  getDayDotColor(dayDeadlines)
                                )}
                              />
                            ))}
                            {dayDeadlines.length > 3 && (
                              <span className="text-[8px] text-muted-foreground">
                                +{dayDeadlines.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    {hasDeadlines && (
                      <TooltipContent>
                        <p className="font-medium">{dayDeadlines.length} obligación(es)</p>
                        <ul className="text-xs mt-1">
                          {dayDeadlines.slice(0, 3).map((d, i) => (
                            <li key={i}>• {d.organism}: {d.obligation_name}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Crítico (≤3 días)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Urgente (≤7 días)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Alerta (≤15 días)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Prealerta</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {selectedDay 
              ? format(selectedDay, "d 'de' MMMM", { locale: es })
              : 'Selecciona un día'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDay ? (
            selectedDayDeadlines.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {selectedDayDeadlines.map((deadline) => {
                    const StatusIcon = STATUS_ICONS[deadline.status] || Clock;
                    const organismColor = ORGANISM_COLORS[deadline.organism] || ORGANISM_COLORS.default;

                    return (
                      <div
                        key={deadline.id}
                        onClick={() => onDeadlineClick?.(deadline)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
                          deadline.alert_level === 'critical' && 'border-red-500/50 bg-red-500/5',
                          deadline.alert_level === 'urgent' && 'border-orange-500/50 bg-orange-500/5',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn('w-2 h-2 rounded-full mt-1.5', organismColor)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {deadline.organism}
                              </Badge>
                              <Badge className={cn('text-xs', getAlertColor(deadline.alert_level))}>
                                {deadline.days_remaining <= 0 
                                  ? 'Vencido' 
                                  : `${deadline.days_remaining}d`}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mt-1 truncate">
                              {deadline.obligation_name}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <StatusIcon className="h-3 w-3" />
                              <span className="capitalize">{deadline.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin obligaciones este día</p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecciona un día para ver detalles</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HRComplianceCalendar;
