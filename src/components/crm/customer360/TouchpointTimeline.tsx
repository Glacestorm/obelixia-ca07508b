// src/components/crm/customer360/TouchpointTimeline.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, Calendar, MessageSquare, Globe, MousePointer } from 'lucide-react';
import { useCustomer360 } from '@/hooks/crm/customer360';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  phone: Phone,
  meeting: Calendar,
  chat: MessageSquare,
  web: Globe,
  click: MousePointer
};

export function TouchpointTimeline() {
  const { touchpoints } = useCustomer360();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Historial de Interacciones</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-2">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6 pl-2">
            {touchpoints.map((tp, index) => {
              const Icon = CHANNEL_ICONS[tp.channel] || MessageSquare;
              
              return (
                <div key={tp.id} className="relative pl-6 border-l last:border-0 pb-6 last:pb-0">
                  <div className="absolute -left-[9px] top-0 bg-background p-1 border rounded-full">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{tp.title}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(tp.occurred_at), { locale: es, addSuffix: true })}
                      </span>
                    </div>
                    
                    {tp.description && (
                      <p className="text-xs text-muted-foreground">{tp.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border capitalize">
                        {tp.touchpoint_type.replace(/_/g, ' ')}
                      </span>
                      {tp.sentiment && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${
                          tp.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          tp.sentiment === 'negative' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {tp.sentiment}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {touchpoints.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay interacciones registradas
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
