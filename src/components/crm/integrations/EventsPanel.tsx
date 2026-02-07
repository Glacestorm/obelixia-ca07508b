/**
 * Integration Events Panel
 * Fase 9: Visualización de eventos de integración
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Zap, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { useCRMIntegrations, type CRMIntegrationEvent } from '@/hooks/crm/integrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const EVENT_TYPES = [
  { value: 'all', label: 'Todos los eventos' },
  { value: 'lead.created', label: 'Lead Creado' },
  { value: 'lead.updated', label: 'Lead Actualizado' },
  { value: 'deal.created', label: 'Oportunidad Creada' },
  { value: 'deal.won', label: 'Oportunidad Ganada' },
  { value: 'deal.lost', label: 'Oportunidad Perdida' },
  { value: 'contact.created', label: 'Contacto Creado' },
  { value: 'activity.completed', label: 'Actividad Completada' }
];

export function EventsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [processedFilter, setProcessedFilter] = useState<'all' | 'processed' | 'pending'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CRMIntegrationEvent | null>(null);

  const { events, isLoading, fetchEvents } = useCRMIntegrations();

  useEffect(() => {
    const filters: { eventType?: string; processed?: boolean } = {};
    
    if (eventTypeFilter !== 'all') {
      filters.eventType = eventTypeFilter;
    }
    if (processedFilter !== 'all') {
      filters.processed = processedFilter === 'processed';
    }
    
    fetchEvents(filters);
  }, [eventTypeFilter, processedFilter, fetchEvents]);

  const filteredEvents = events.filter(event => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        event.event_type.toLowerCase().includes(search) ||
        event.entity_type?.toLowerCase().includes(search) ||
        JSON.stringify(event.payload).toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('created')) return '🆕';
    if (eventType.includes('updated')) return '✏️';
    if (eventType.includes('won')) return '🎉';
    if (eventType.includes('lost')) return '😔';
    if (eventType.includes('completed')) return '✅';
    return '⚡';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Eventos de Integración</h2>
          <p className="text-sm text-muted-foreground">
            Historial de eventos procesados por el sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchEvents()} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={processedFilter} onValueChange={(v) => setProcessedFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="processed">Procesados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Eventos Recientes</span>
                <Badge variant="outline">{filteredEvents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay eventos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedEvent?.id === event.id 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-lg">{getEventIcon(event.event_type)}</span>
                            <div>
                              <p className="font-medium text-sm">{event.event_type}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.entity_type && (
                                  <span className="capitalize">{event.entity_type}</span>
                                )}
                                {event.entity_id && (
                                  <span className="ml-1 font-mono">#{event.entity_id.substring(0, 8)}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.processed ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Procesado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(event.created_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Event Details */}
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Detalles del Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-medium">{selectedEvent.event_type}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Fuente</p>
                    <Badge variant="outline">{selectedEvent.event_source}</Badge>
                  </div>

                  {selectedEvent.entity_type && (
                    <div>
                      <p className="text-xs text-muted-foreground">Entidad</p>
                      <p className="capitalize">{selectedEvent.entity_type}</p>
                      {selectedEvent.entity_id && (
                        <code className="text-xs bg-muted px-1 rounded">
                          {selectedEvent.entity_id}
                        </code>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    {selectedEvent.processed ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Procesado</span>
                        {selectedEvent.processed_at && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({format(new Date(selectedEvent.processed_at), 'HH:mm', { locale: es })})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span>Pendiente</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="text-sm">
                      {format(new Date(selectedEvent.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payload</p>
                    <ScrollArea className="h-[200px]">
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(selectedEvent.payload, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>

                  {selectedEvent.processing_results && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Resultados</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(selectedEvent.processing_results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecciona un evento para ver detalles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EventsPanel;
