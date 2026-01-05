/**
 * ShipmentTracking - Timeline visual de tracking de envíos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Phone,
  Mail,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LogisticsShipment, LogisticsCarrier } from '@/hooks/erp/useERPLogistics';

interface TrackingEvent {
  id: string;
  event_type: string;
  event_status: string;
  event_description: string;
  event_location: string | null;
  event_timestamp: string;
  raw_data: Record<string, unknown> | null;
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <Package className="h-4 w-4" />,
  picked_up: <Truck className="h-4 w-4" />,
  in_transit: <Truck className="h-4 w-4" />,
  out_for_delivery: <MapPin className="h-4 w-4" />,
  delivered: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  exception: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  returned: <ArrowLeft className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted',
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  picked_up: 'bg-purple-500',
  in_transit: 'bg-indigo-500',
  out_for_delivery: 'bg-orange-500',
  delivered: 'bg-green-500',
  failed: 'bg-red-500',
  returned: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

interface ShipmentTrackingProps {
  shipment: LogisticsShipment;
  carrier?: LogisticsCarrier;
  onClose: () => void;
}

export function ShipmentTracking({ shipment, carrier, onClose }: ShipmentTrackingProps) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTrackingEvents();
  }, [shipment.id]);

  const fetchTrackingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('erp_logistics_tracking_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('event_timestamp', { ascending: false });

      if (error) throw error;

      // Cast the data properly
      const typedEvents: TrackingEvent[] = (data || []).map((event: Record<string, unknown>) => ({
        id: event.id as string,
        event_type: event.event_type as string,
        event_status: event.event_status as string,
        event_description: event.event_description as string,
        event_location: event.event_location as string | null,
        event_timestamp: event.event_timestamp as string,
        raw_data: event.raw_data as Record<string, unknown> | null,
      }));

      setEvents(typedEvents);
    } catch (error) {
      console.error('Error fetching tracking events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshTracking = async () => {
    setIsRefreshing(true);
    // TODO: Llamar a la API de la operadora para actualizar tracking
    await fetchTrackingEvents();
    toast.success('Tracking actualizado');
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const getProgressPercentage = () => {
    const statusOrder = ['draft', 'pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(shipment.status);
    if (currentIndex === -1) return 0;
    return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Tracking del Envío</h2>
            <p className="text-sm text-muted-foreground font-mono">
              {shipment.shipment_number}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshTracking} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Progress Bar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progreso del envío</span>
                <Badge className={statusColors[shipment.status]}>
                  {shipment.status === 'delivered' ? 'Entregado' : `${getProgressPercentage()}%`}
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${statusColors[shipment.status]}`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Creado</span>
                <span>Recogido</span>
                <span>En tránsito</span>
                <span>En reparto</span>
                <span>Entregado</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historial de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-muted-foreground">Cargando eventos...</span>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay eventos de tracking todavía</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Los eventos aparecerán cuando la operadora actualice el estado
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                    {events.map((event, index) => (
                      <div key={event.id} className="relative pl-10 pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-2 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${
                            index === 0 ? 'bg-primary' : 'bg-muted'
                          }`}
                        >
                          {eventIcons[event.event_type] || <Clock className="h-3 w-3" />}
                        </div>

                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{event.event_description}</p>
                              {event.event_location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.event_location}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{format(new Date(event.event_timestamp), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                              <p className="text-xs">
                                {formatDistanceToNow(new Date(event.event_timestamp), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Shipment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información del Envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tracking Number */}
              {shipment.tracking_number && (
                <div>
                  <p className="text-xs text-muted-foreground">Nº Tracking</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{shipment.tracking_number}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(shipment.tracking_number!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Carrier */}
              <div>
                <p className="text-xs text-muted-foreground">Operadora</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{carrier?.carrier_name || 'Desconocida'}</Badge>
                  {carrier?.tracking_url_template && shipment.tracking_number && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const url = carrier.tracking_url_template?.replace(
                          '{tracking}',
                          shipment.tracking_number!
                        );
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Packages */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bultos:</span>
                <span className="font-medium">{shipment.total_packages || 1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Peso:</span>
                <span className="font-medium">{shipment.total_weight?.toFixed(2) || '0.00'} kg</span>
              </div>
            </CardContent>
          </Card>

          {/* Destination */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                Destinatario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{shipment.destination_name}</p>
              <p className="text-sm text-muted-foreground">{shipment.destination_address}</p>
              <p className="text-sm text-muted-foreground">
                {shipment.destination_postal_code} {shipment.destination_city}
              </p>
              {shipment.destination_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{shipment.destination_phone}</span>
                </div>
              )}
              {shipment.destination_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{shipment.destination_email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado:</span>
                <span>
                  {shipment.created_at &&
                    format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </span>
              </div>
              {shipment.picked_up_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recogido:</span>
                  <span>{format(new Date(shipment.picked_up_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
              {shipment.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entregado:</span>
                  <span>{format(new Date(shipment.delivered_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
              {shipment.estimated_delivery_at && !shipment.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimado:</span>
                  <span className="text-primary font-medium">
                    {format(new Date(shipment.estimated_delivery_at), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ShipmentTracking;
