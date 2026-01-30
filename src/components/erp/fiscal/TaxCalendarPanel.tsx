/**
 * Tax Calendar Panel - Calendario de obligaciones fiscales
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useERPTaxJurisdictions } from '@/hooks/erp/useERPTaxJurisdictions';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export function TaxCalendarPanel() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { calendarEvents, completeCalendarEvent } = useERPTaxJurisdictions();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => 
      isSameDay(new Date(event.due_date), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'overdue':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'filing':
        return '📄';
      case 'payment':
        return '💰';
      case 'declaration':
        return '📝';
      case 'audit':
        return '🔍';
      default:
        return '📅';
    }
  };

  const handleComplete = async (eventId: string) => {
    await completeCalendarEvent(eventId);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Group events by status for summary
  const pendingCount = calendarEvents.filter(e => e.status === 'pending').length;
  const overdueCount = calendarEvents.filter(e => 
    e.status === 'pending' && new Date(e.due_date) < new Date()
  ).length;
  const completedThisMonth = calendarEvents.filter(e => 
    e.status === 'completed' && 
    new Date(e.due_date) >= monthStart && 
    new Date(e.due_date) <= monthEnd
  ).length;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar View */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendario Fiscal
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[150px] text-center">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {days.map(day => {
                const dayEvents = getEventsForDate(day);
                const hasOverdue = dayEvents.some(e => 
                  e.status === 'pending' && new Date(e.due_date) < new Date()
                );
                const hasPending = dayEvents.some(e => e.status === 'pending');
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square p-1 rounded-lg border transition-all relative
                      ${isToday(day) ? 'border-primary bg-primary/5' : 'border-transparent'}
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      ${dayEvents.length > 0 ? 'hover:bg-muted/50' : 'hover:bg-muted/30'}
                    `}
                  >
                    <span className={`text-sm ${isToday(day) ? 'font-bold text-primary' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div 
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${getStatusColor(
                              event.status === 'pending' && new Date(event.due_date) < new Date() 
                                ? 'overdue' 
                                : event.status
                            )}`}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs text-muted-foreground">Pendiente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Vencido</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Completado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side Panel - Events & Summary */}
      <div className="space-y-4">
        {/* Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Pendientes</span>
              </div>
              <Badge variant="secondary">{pendingCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Vencidas</span>
              </div>
              <Badge variant="destructive">{overdueCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Completadas</span>
              </div>
              <Badge className="bg-green-500">{completedThisMonth}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {selectedDate ? (
                <>
                  {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  {selectedDateEvents.length > 0 && (
                    <Badge variant="secondary">{selectedDateEvents.length}</Badge>
                  )}
                </>
              ) : (
                'Selecciona una fecha'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDateEvents.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => {
                      const isOverdue = event.status === 'pending' && new Date(event.due_date) < new Date();
                      return (
                        <div 
                          key={event.id}
                          className={`p-3 rounded-lg border ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'bg-muted/30'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{getEventTypeIcon(event.event_type)}</span>
                                <span className="font-medium">{event.title}</span>
                              </div>
                              {event.jurisdiction && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {event.jurisdiction.name}
                                </p>
                              )}
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <Badge className={getStatusColor(isOverdue ? 'overdue' : event.status)}>
                              {isOverdue ? 'Vencido' : event.status}
                            </Badge>
                          </div>

                          {event.status === 'pending' && (
                            <Button 
                              size="sm" 
                              className="w-full mt-3"
                              onClick={() => handleComplete(event.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como completado
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin eventos para esta fecha</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Haz clic en una fecha para ver sus eventos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TaxCalendarPanel;
