/**
 * NotificationsPanel - Backend notification bell with realtime updates
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CheckCircle2, AlertTriangle, Clock, FileText, ArrowRight } from 'lucide-react';
import { useEnergyNotifications, EnergyNotification } from '@/hooks/erp/useEnergyNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  onNavigateToCase?: (caseId: string) => void;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  contract_expiry: Clock,
  proposal_expired: FileText,
  workflow_stalled: AlertTriangle,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-destructive',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-muted-foreground',
};

export function NotificationsPanel({ companyId, onNavigateToCase }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useEnergyNotifications(companyId);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>
              Marcar todas leídas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const severityColor = SEVERITY_COLORS[n.severity] || '';
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                      !n.is_read && "bg-primary/5"
                    )}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      if (n.case_id && onNavigateToCase) {
                        onNavigateToCase(n.case_id);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", severityColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium", !n.is_read && "font-semibold")}>{n.title}</span>
                          {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsPanel;
