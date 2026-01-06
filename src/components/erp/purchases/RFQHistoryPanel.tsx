import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Send, 
  MessageSquare, 
  Award, 
  ShoppingCart,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RFQHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: any | null;
}

interface HistoryEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <FileText className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  quote_received: <MessageSquare className="h-4 w-4" />,
  evaluated: <CheckCircle className="h-4 w-4" />,
  awarded: <Award className="h-4 w-4" />,
  converted: <ShoppingCart className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
  expired: <AlertCircle className="h-4 w-4" />,
};

const eventColors: Record<string, string> = {
  created: 'bg-blue-500',
  sent: 'bg-purple-500',
  quote_received: 'bg-green-500',
  evaluated: 'bg-yellow-500',
  awarded: 'bg-emerald-500',
  converted: 'bg-primary',
  cancelled: 'bg-destructive',
  expired: 'bg-orange-500',
};

export function RFQHistoryPanel({ open, onOpenChange, rfq }: RFQHistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && rfq) {
      fetchHistory();
    }
  }, [open, rfq]);

  const fetchHistory = async () => {
    if (!rfq) return;
    
    setLoading(true);
    try {
      // Create synthetic events from RFQ data since erp_rfq_history table may not exist
      const syntheticEvents: HistoryEvent[] = [
        {
          id: '1',
          event_type: 'created',
          description: 'Solicitud de cotización creada',
          created_at: rfq.created_at,
          created_by: rfq.created_by,
        }
      ];
      
      if (rfq.status !== 'draft') {
        syntheticEvents.push({
          id: '2',
          event_type: 'sent',
          description: 'Solicitud enviada a proveedores',
          created_at: rfq.sent_at || rfq.updated_at,
        });
      }

      if (rfq.status === 'in_progress') {
        syntheticEvents.push({
          id: '3',
          event_type: 'quote_received',
          description: 'Cotizaciones recibidas de proveedores',
          created_at: rfq.updated_at,
        });
      }

      if (rfq.status === 'evaluated') {
        syntheticEvents.push({
          id: '4',
          event_type: 'evaluated',
          description: 'Cotizaciones evaluadas',
          created_at: rfq.updated_at,
        });
      }

      if (rfq.status === 'awarded') {
        syntheticEvents.push({
          id: '5',
          event_type: 'awarded',
          description: `Adjudicada a ${rfq.winning_supplier?.company_name || 'proveedor'}`,
          created_at: rfq.awarded_at || rfq.updated_at,
        });
      }

      if (rfq.status === 'cancelled') {
        syntheticEvents.push({
          id: '6',
          event_type: 'cancelled',
          description: 'Solicitud cancelada',
          created_at: rfq.updated_at,
        });
      }

      setEvents(syntheticEvents);
    } catch (error) {
      console.error('Error fetching RFQ history:', error);
      // Create minimal synthetic events on error
      setEvents([{
        id: '1',
        event_type: 'created',
        description: 'Solicitud de cotización creada',
        created_at: rfq.created_at,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de RFQ
          </SheetTitle>
          {rfq && (
            <p className="text-sm text-muted-foreground">
              {rfq.rfq_number} - {rfq.title}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {events.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${eventColors[event.event_type] || 'bg-muted'} text-white`}>
                      {eventIcons[event.event_type] || <Clock className="h-4 w-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(event.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                      </div>

                      {event.created_by && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Por: Usuario</span>
                        </div>
                      )}

                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {index < events.length - 1 && <Separator className="mt-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
