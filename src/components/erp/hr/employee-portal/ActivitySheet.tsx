/**
 * ActivitySheet — Mobile activity center / notification panel
 * RRHH-MOBILE.1 Phase 4: Centro de actividad con datos existentes del dashboard
 */
import { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  FileText,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { type DashboardSummary } from '@/hooks/erp/hr/useEmployeePortal';
import { type PortalSection } from './EmployeePortalNav';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  time?: string;
  type: 'alert' | 'info' | 'success';
  action?: PortalSection;
}

interface Props {
  dashboard: DashboardSummary | null;
  onNavigate: (section: PortalSection) => void;
}

export function ActivitySheet({ dashboard, onNavigate }: Props) {
  const totalBadge = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.pendingRequests + dashboard.activeIncidents + dashboard.documentsWithAlerts;
  }, [dashboard]);

  const activities = useMemo<ActivityItem[]>(() => {
    if (!dashboard) return [];
    const items: ActivityItem[] = [];

    // Pending requests
    if (dashboard.pendingRequests > 0) {
      items.push({
        id: 'pending-requests',
        icon: <Send className="h-4 w-4" />,
        title: `${dashboard.pendingRequests} solicitud${dashboard.pendingRequests > 1 ? 'es' : ''} pendiente${dashboard.pendingRequests > 1 ? 's' : ''}`,
        description: 'Tienes solicitudes en curso esperando respuesta',
        type: 'alert',
        action: 'requests',
      });
    }

    // Active incidents
    if (dashboard.activeIncidents > 0) {
      items.push({
        id: 'active-incidents',
        icon: <AlertTriangle className="h-4 w-4" />,
        title: `${dashboard.activeIncidents} incidencia${dashboard.activeIncidents > 1 ? 's' : ''} de fichaje`,
        description: 'Revisa tus registros de tiempo',
        type: 'alert',
        action: 'time',
      });
    }

    // Document alerts
    if (dashboard.documentsWithAlerts > 0) {
      items.push({
        id: 'doc-alerts',
        icon: <FileText className="h-4 w-4" />,
        title: `${dashboard.documentsWithAlerts} documento${dashboard.documentsWithAlerts > 1 ? 's' : ''} con alertas`,
        description: 'Documentos que requieren tu atención',
        type: 'alert',
        action: 'documents',
      });
    }

    // Recent payslips
    if (dashboard.recentPayslips?.length > 0) {
      const latest = dashboard.recentPayslips[0];
      items.push({
        id: 'recent-payslip',
        icon: <FileText className="h-4 w-4" />,
        title: 'Nueva nómina disponible',
        description: `${latest.period_label} — ${latest.net_salary ? latest.net_salary.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : ''}`,
        type: 'success',
        action: 'payslips',
      });
        type: 'success',
        action: 'payslips',
      });
    }

    // Last activity entries
    if (dashboard.lastActivity?.length > 0) {
      dashboard.lastActivity.slice(0, 5).forEach((act, i) => {
        items.push({
          id: `activity-${i}`,
          icon: <Clock className="h-4 w-4" />,
          title: act.label,
          description: '',
          time: act.date,
          type: 'info',
        });
      });
    }

    // If nothing at all
    if (items.length === 0) {
      items.push({
        id: 'empty',
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: 'Todo al día',
        description: 'No tienes notificaciones pendientes',
        type: 'success',
      });
    }

    return items;
  }, [dashboard]);

  const typeStyles: Record<ActivityItem['type'], string> = {
    alert: 'bg-destructive/10 text-destructive',
    info: 'bg-muted text-muted-foreground',
    success: 'bg-primary/10 text-primary',
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {totalBadge > 9 ? '9+' : totalBadge}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-[70vh] rounded-b-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Actividad reciente
            {totalBadge > 0 && (
              <Badge variant="destructive" className="text-xs h-5">
                {totalBadge}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(70vh-60px)]">
          <div className="p-3 space-y-2">
            {activities.map((item) => (
              <button
                key={item.id}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors',
                  item.action ? 'hover:bg-accent/50 cursor-pointer active:scale-[0.98]' : 'cursor-default',
                  item.type === 'alert' ? 'bg-destructive/5' : 'bg-muted/30'
                )}
                onClick={() => item.action && onNavigate(item.action)}
                disabled={!item.action}
              >
                <div className={cn(
                  'flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center mt-0.5',
                  typeStyles[item.type]
                )}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.time && (
                    <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                  )}
                </div>
                {item.action && (
                  <Info className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
