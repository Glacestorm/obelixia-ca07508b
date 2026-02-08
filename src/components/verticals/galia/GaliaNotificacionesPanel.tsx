/**
 * Panel de Notificaciones GALIA
 * Muestra alertas y actualizaciones del expediente del ciudadano
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  FileText,
  Clock,
  X,
  ChevronRight
} from 'lucide-react';
import { useGaliaNotificaciones, GaliaNotificacion } from '@/hooks/galia/useGaliaNotificaciones';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaNotificacionesPanelProps {
  codigoExpediente?: string;
  autoSubscribe?: boolean;
  className?: string;
  onClose?: () => void;
  onNotificationClick?: (notif: GaliaNotificacion) => void;
}

export function GaliaNotificacionesPanel({
  codigoExpediente,
  autoSubscribe = true,
  className,
  onClose,
  onNotificationClick
}: GaliaNotificacionesPanelProps) {
  const {
    notificaciones,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useGaliaNotificaciones({
    codigoExpediente,
    autoSubscribe
  });

  const getIconByTipo = (tipo: GaliaNotificacion['tipo']) => {
    switch (tipo) {
      case 'cambio_estado':
        return <FileText className="h-4 w-4" />;
      case 'documento_requerido':
        return <AlertTriangle className="h-4 w-4" />;
      case 'plazo_proximo':
        return <Clock className="h-4 w-4" />;
      case 'resolucion':
        return <Check className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPrioridadStyles = (prioridad: GaliaNotificacion['prioridad']) => {
    switch (prioridad) {
      case 'urgente':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'alta':
        return 'border-l-4 border-l-amber-500 bg-amber-500/5';
      case 'media':
        return 'border-l-4 border-l-blue-500 bg-blue-500/5';
      default:
        return 'border-l-4 border-l-muted';
    }
  };

  const handleNotificationClick = (notif: GaliaNotificacion) => {
    markAsRead(notif.id);
    onNotificationClick?.(notif);
  };

  if (!codigoExpediente) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-8 text-center">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Consulta tu expediente para ver las notificaciones
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-primary animate-pulse" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base">
              Notificaciones
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3" />
                Marcar leídas
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="h-10 w-10 mx-auto text-green-500/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay notificaciones pendientes
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    getPrioridadStyles(notif.prioridad),
                    !notif.leida && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-full shrink-0",
                      notif.prioridad === 'urgente' ? 'bg-destructive/10 text-destructive' :
                      notif.prioridad === 'alta' ? 'bg-amber-500/10 text-amber-600' :
                      notif.prioridad === 'media' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {getIconByTipo(notif.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={cn(
                          "text-sm font-medium truncate",
                          !notif.leida && "font-semibold"
                        )}>
                          {notif.titulo}
                        </h4>
                        {!notif.leida && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notif.mensaje}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notif.fechaCreacion, { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
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
  );
}

export default GaliaNotificacionesPanel;
