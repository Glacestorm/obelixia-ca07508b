/**
 * Hook para gestionar notificaciones de expedientes GALIA
 * Permite suscribirse a cambios de estado y recibir alertas en tiempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GaliaNotificacion {
  id: string;
  tipo: 'cambio_estado' | 'documento_requerido' | 'plazo_proximo' | 'resolucion' | 'info';
  titulo: string;
  mensaje: string;
  expedienteId?: string;
  expedienteCodigo?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  fechaCreacion: Date;
  leida: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
}

interface UseGaliaNotificacionesOptions {
  codigoExpediente?: string;
  autoSubscribe?: boolean;
}

export function useGaliaNotificaciones(options?: UseGaliaNotificacionesOptions) {
  const [notificaciones, setNotificaciones] = useState<GaliaNotificacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generar notificaciones basadas en el estado del expediente
  const generateNotificacionesFromExpediente = useCallback((expediente: {
    estado: string;
    numero_expediente: string;
    updated_at: string;
    fecha_resolucion?: string | null;
    importe_concedido?: number | null;
  }): GaliaNotificacion[] => {
    const notifs: GaliaNotificacion[] = [];
    const now = new Date();

    // Notificación de estado actual
    const estadoMensajes: Record<string, { titulo: string; mensaje: string; prioridad: GaliaNotificacion['prioridad'] }> = {
      'borrador': {
        titulo: 'Solicitud en borrador',
        mensaje: 'Tu solicitud está pendiente de presentación. Completa todos los campos y envíala.',
        prioridad: 'media'
      },
      'presentada': {
        titulo: 'Solicitud presentada',
        mensaje: 'Tu solicitud ha sido recibida y está pendiente de admisión a trámite.',
        prioridad: 'baja'
      },
      'subsanacion': {
        titulo: '⚠️ Subsanación requerida',
        mensaje: 'Se requiere documentación adicional. Revisa los requerimientos y aporta la documentación solicitada en el plazo indicado.',
        prioridad: 'urgente'
      },
      'admitida': {
        titulo: 'Solicitud admitida',
        mensaje: 'Tu solicitud ha sido admitida a trámite y pasará a fase de instrucción técnica.',
        prioridad: 'baja'
      },
      'instruccion': {
        titulo: 'En instrucción técnica',
        mensaje: 'Un técnico está revisando tu expediente y verificando el cumplimiento de requisitos.',
        prioridad: 'baja'
      },
      'evaluacion': {
        titulo: 'En evaluación',
        mensaje: 'Tu proyecto está siendo evaluado según los criterios de valoración de la convocatoria.',
        prioridad: 'media'
      },
      'propuesta': {
        titulo: 'Propuesta de resolución',
        mensaje: 'Se ha emitido propuesta de resolución. Pendiente de resolución definitiva.',
        prioridad: 'alta'
      },
      'resolucion': {
        titulo: '📋 Resolución emitida',
        mensaje: 'Se ha dictado resolución sobre tu expediente. Consulta el detalle.',
        prioridad: 'alta'
      },
      'concedido': {
        titulo: '✅ ¡Ayuda concedida!',
        mensaje: `Tu proyecto ha sido aprobado${expediente.importe_concedido ? ` con una ayuda de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(expediente.importe_concedido)}` : ''}. Ya puedes iniciar la ejecución.`,
        prioridad: 'alta'
      },
      'denegado': {
        titulo: '❌ Ayuda denegada',
        mensaje: 'Tu solicitud ha sido denegada. Puedes presentar recurso de reposición en 20 días hábiles.',
        prioridad: 'urgente'
      },
      'justificacion': {
        titulo: '📝 Fase de justificación',
        mensaje: 'Tu proyecto está en fase de justificación. Recuerda presentar toda la documentación de gastos.',
        prioridad: 'alta'
      },
      'cerrado': {
        titulo: 'Expediente cerrado',
        mensaje: 'Tu expediente ha sido cerrado. Gracias por participar en el programa LEADER.',
        prioridad: 'baja'
      }
    };

    const estadoInfo = estadoMensajes[expediente.estado];
    if (estadoInfo) {
      notifs.push({
        id: `estado-${expediente.numero_expediente}`,
        tipo: 'cambio_estado',
        titulo: estadoInfo.titulo,
        mensaje: estadoInfo.mensaje,
        expedienteCodigo: expediente.numero_expediente,
        estadoNuevo: expediente.estado,
        fechaCreacion: new Date(expediente.updated_at),
        leida: false,
        prioridad: estadoInfo.prioridad
      });
    }

    // Alertas de plazos (ejemplo: justificación tiene plazo)
    if (expediente.estado === 'concedido') {
      notifs.push({
        id: `plazo-ejecucion-${expediente.numero_expediente}`,
        tipo: 'plazo_proximo',
        titulo: '📅 Recuerda: Plazo de ejecución',
        mensaje: 'Tienes 24 meses desde la notificación para ejecutar y justificar el proyecto.',
        expedienteCodigo: expediente.numero_expediente,
        fechaCreacion: now,
        leida: false,
        prioridad: 'media'
      });
    }

    return notifs;
  }, []);

  // Cargar notificaciones para un expediente específico
  const loadNotificaciones = useCallback(async (codigoExpediente: string) => {
    setIsLoading(true);

    try {
      const { data: expediente, error } = await supabase
        .from('galia_expedientes')
        .select('*')
        .eq('numero_expediente', codigoExpediente)
        .maybeSingle();

      if (error) throw error;

      if (expediente) {
        const notifs = generateNotificacionesFromExpediente(expediente as {
          estado: string;
          numero_expediente: string;
          updated_at: string;
          fecha_resolucion?: string | null;
          importe_concedido?: number | null;
        });
        setNotificaciones(notifs);
        setUnreadCount(notifs.filter(n => !n.leida).length);
      } else {
        // Buscar en solicitudes
        const { data: solicitud } = await supabase
          .from('galia_solicitudes')
          .select('*')
          .eq('numero_registro', codigoExpediente)
          .maybeSingle();

        if (solicitud) {
          const notifs = generateNotificacionesFromExpediente({
            estado: solicitud.estado,
            numero_expediente: solicitud.numero_registro || codigoExpediente,
            updated_at: solicitud.updated_at
          });
          setNotificaciones(notifs);
          setUnreadCount(notifs.filter(n => !n.leida).length);
        }
      }
    } catch (err) {
      console.error('[useGaliaNotificaciones] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [generateNotificacionesFromExpediente]);

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId: string) => {
    setNotificaciones(prev => prev.map(n => 
      n.id === notificationId ? { ...n, leida: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    setUnreadCount(0);
  }, []);

  // Mostrar notificación toast
  const showNotification = useCallback((notif: GaliaNotificacion) => {
    const toastType = notif.prioridad === 'urgente' || notif.prioridad === 'alta' 
      ? 'warning' 
      : 'info';
    
    if (toastType === 'warning') {
      toast.warning(notif.titulo, { description: notif.mensaje });
    } else {
      toast.info(notif.titulo, { description: notif.mensaje });
    }
  }, []);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!options?.codigoExpediente || !options?.autoSubscribe) return;

    // Cargar notificaciones iniciales
    loadNotificaciones(options.codigoExpediente);

    // Suscribirse a cambios en el expediente
    const channel = supabase
      .channel(`expediente-${options.codigoExpediente}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'galia_expedientes',
          filter: `numero_expediente=eq.${options.codigoExpediente}`
        },
        (payload) => {
          const newData = payload.new as {
            estado: string;
            numero_expediente: string;
            updated_at: string;
            fecha_resolucion?: string | null;
            importe_concedido?: number | null;
          };
          const oldData = payload.old as { estado?: string };

          // Generar notificación de cambio de estado
          if (newData.estado !== oldData?.estado) {
            const notif: GaliaNotificacion = {
              id: `cambio-${Date.now()}`,
              tipo: 'cambio_estado',
              titulo: `Estado actualizado: ${newData.estado}`,
              mensaje: `Tu expediente ${newData.numero_expediente} ha cambiado de "${oldData?.estado}" a "${newData.estado}"`,
              expedienteCodigo: newData.numero_expediente,
              estadoAnterior: oldData?.estado,
              estadoNuevo: newData.estado,
              fechaCreacion: new Date(),
              leida: false,
              prioridad: 'alta'
            };

            setNotificaciones(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
            showNotification(notif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options?.codigoExpediente, options?.autoSubscribe, loadNotificaciones, showNotification]);

  return {
    notificaciones,
    isLoading,
    unreadCount,
    loadNotificaciones,
    markAsRead,
    markAllAsRead,
    showNotification
  };
}

export default useGaliaNotificaciones;
