/**
 * useCRMAgentNotifications - Hook para notificaciones push de agentes CRM
 * Detecta oportunidades críticas y riesgos automáticamente
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS ===
export type NotificationType = 'opportunity' | 'risk' | 'alert' | 'success' | 'info';
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface CRMAgentNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  agentId?: string;
  agentName?: string;
  entityType?: 'lead' | 'deal' | 'customer' | 'task';
  entityId?: string;
  entityName?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  minPriority: NotificationPriority;
  opportunityThreshold: number; // Valor mínimo para notificar oportunidad
  riskThreshold: number; // % mínimo de riesgo para notificar
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  todayCount: number;
  weekCount: number;
}

// === CONSTANTES ===
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  pushEnabled: false,
  emailEnabled: false,
  minPriority: 'medium',
  opportunityThreshold: 10000,
  riskThreshold: 60,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

// === HOOK ===
export function useCRMAgentNotifications() {
  const [notifications, setNotifications] = useState<CRMAgentNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: { opportunity: 0, risk: 0, alert: 0, success: 0, info: 0 },
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    todayCount: 0,
    weekCount: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationTime = useRef<Date>(new Date());

  // Inicializar audio
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 0.5;
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Calcular estadísticas
  useEffect(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const newStats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.readAt).length,
      byType: { opportunity: 0, risk: 0, alert: 0, success: 0, info: 0 },
      byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      todayCount: 0,
      weekCount: 0
    };

    notifications.forEach(n => {
      newStats.byType[n.type]++;
      newStats.byPriority[n.priority]++;
      if (n.createdAt >= todayStart) newStats.todayCount++;
      if (n.createdAt >= weekStart) newStats.weekCount++;
    });

    setStats(newStats);
  }, [notifications]);

  // Verificar horas silenciosas
  const isQuietHours = useCallback((): boolean => {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = settings.quietHours;

    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }, [settings.quietHours]);

  // Verificar si se debe mostrar notificación
  const shouldNotify = useCallback((priority: NotificationPriority): boolean => {
    if (!settings.enabled) return false;
    if (isQuietHours() && priority !== 'critical') return false;
    return PRIORITY_ORDER[priority] >= PRIORITY_ORDER[settings.minPriority];
  }, [settings.enabled, settings.minPriority, isQuietHours]);

  // Reproducir sonido
  const playNotificationSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed, likely due to browser autoplay policy
      });
    }
  }, [settings.soundEnabled]);

  // Mostrar toast según tipo y prioridad
  const showToast = useCallback((notification: CRMAgentNotification) => {
    const toastOptions = {
      description: notification.message,
      duration: notification.priority === 'critical' ? 10000 : 5000,
      action: notification.actionLabel ? {
        label: notification.actionLabel,
        onClick: () => {
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        }
      } : undefined
    };

    switch (notification.type) {
      case 'opportunity':
        toast.success(notification.title, {
          ...toastOptions,
          icon: '💰'
        });
        break;
      case 'risk':
        if (notification.priority === 'critical') {
          toast.error(notification.title, {
            ...toastOptions,
            icon: '🚨'
          });
        } else {
          toast.warning(notification.title, {
            ...toastOptions,
            icon: '⚠️'
          });
        }
        break;
      case 'alert':
        toast.warning(notification.title, toastOptions);
        break;
      case 'success':
        toast.success(notification.title, toastOptions);
        break;
      default:
        toast.info(notification.title, toastOptions);
    }
  }, []);

  // Crear notificación
  const createNotification = useCallback((
    data: Omit<CRMAgentNotification, 'id' | 'createdAt'>
  ): CRMAgentNotification | null => {
    if (!shouldNotify(data.priority)) return null;

    // Rate limiting: máximo 1 notificación por segundo
    const now = new Date();
    if (now.getTime() - lastNotificationTime.current.getTime() < 1000) {
      return null;
    }
    lastNotificationTime.current = now;

    const notification: CRMAgentNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now
    };

    setNotifications(prev => [notification, ...prev.slice(0, 99)]);

    // Efectos
    playNotificationSound();
    showToast(notification);

    // Request push notification si está habilitado
    if (settings.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }

    return notification;
  }, [shouldNotify, playNotificationSound, showToast, settings.pushEnabled]);

  // === DETECTORES AUTOMÁTICOS ===

  // Detectar oportunidad de alto valor
  const detectOpportunity = useCallback((
    entityType: 'lead' | 'deal' | 'customer',
    entityId: string,
    entityName: string,
    value: number,
    reason: string,
    agentId?: string,
    agentName?: string
  ) => {
    if (value < settings.opportunityThreshold) return null;

    const priority: NotificationPriority = 
      value >= settings.opportunityThreshold * 5 ? 'critical' :
      value >= settings.opportunityThreshold * 2 ? 'high' : 'medium';

    return createNotification({
      type: 'opportunity',
      priority,
      title: `🎯 Oportunidad detectada: ${entityName}`,
      message: `${reason}. Valor potencial: €${value.toLocaleString()}`,
      agentId,
      agentName,
      entityType,
      entityId,
      entityName,
      value,
      actionLabel: 'Ver detalles',
      actionUrl: `/${entityType}s/${entityId}`
    });
  }, [settings.opportunityThreshold, createNotification]);

  // Detectar riesgo
  const detectRisk = useCallback((
    entityType: 'lead' | 'deal' | 'customer',
    entityId: string,
    entityName: string,
    riskPercentage: number,
    riskFactors: string[],
    valueAtRisk?: number,
    agentId?: string,
    agentName?: string
  ) => {
    if (riskPercentage < settings.riskThreshold) return null;

    const priority: NotificationPriority = 
      riskPercentage >= 90 ? 'critical' :
      riskPercentage >= 75 ? 'high' : 'medium';

    return createNotification({
      type: 'risk',
      priority,
      title: `⚠️ Riesgo detectado: ${entityName}`,
      message: `${riskPercentage}% de riesgo. Factores: ${riskFactors.slice(0, 2).join(', ')}`,
      agentId,
      agentName,
      entityType,
      entityId,
      entityName,
      value: valueAtRisk,
      metadata: { riskPercentage, riskFactors },
      actionLabel: 'Tomar acción',
      actionUrl: `/${entityType}s/${entityId}`
    });
  }, [settings.riskThreshold, createNotification]);

  // Detectar churn inminente
  const detectChurnRisk = useCallback((
    customerId: string,
    customerName: string,
    churnProbability: number,
    signals: string[],
    lifetimeValue?: number,
    agentId?: string,
    agentName?: string
  ) => {
    if (churnProbability < 50) return null;

    const priority: NotificationPriority = 
      churnProbability >= 85 ? 'critical' :
      churnProbability >= 70 ? 'high' : 'medium';

    return createNotification({
      type: 'risk',
      priority,
      title: `🚨 Riesgo de churn: ${customerName}`,
      message: `${churnProbability}% probabilidad. ${lifetimeValue ? `LTV: €${lifetimeValue.toLocaleString()}` : ''}`,
      agentId,
      agentName: agentName || 'Churn Prevention Agent',
      entityType: 'customer',
      entityId: customerId,
      entityName: customerName,
      value: lifetimeValue,
      metadata: { churnProbability, signals },
      actionLabel: 'Plan de retención',
      actionUrl: `/customers/${customerId}/retention`
    });
  }, [createNotification]);

  // Detectar deal en riesgo
  const detectDealAtRisk = useCallback((
    dealId: string,
    dealName: string,
    riskLevel: number,
    stageName: string,
    daysStuck: number,
    dealValue: number,
    agentId?: string,
    agentName?: string
  ) => {
    if (riskLevel < 40) return null;

    const priority: NotificationPriority = 
      riskLevel >= 80 ? 'critical' :
      riskLevel >= 60 ? 'high' : 'medium';

    return createNotification({
      type: 'risk',
      priority,
      title: `📉 Deal en riesgo: ${dealName}`,
      message: `${daysStuck} días en "${stageName}". Valor: €${dealValue.toLocaleString()}`,
      agentId,
      agentName: agentName || 'Pipeline Optimizer',
      entityType: 'deal',
      entityId: dealId,
      entityName: dealName,
      value: dealValue,
      metadata: { riskLevel, stageName, daysStuck },
      actionLabel: 'Ver pipeline',
      actionUrl: `/deals/${dealId}`
    });
  }, [createNotification]);

  // Detectar upsell opportunity
  const detectUpsellOpportunity = useCallback((
    customerId: string,
    customerName: string,
    currentMRR: number,
    potentialMRR: number,
    products: string[],
    agentId?: string,
    agentName?: string
  ) => {
    const uplift = potentialMRR - currentMRR;
    if (uplift < 500) return null;

    const priority: NotificationPriority = 
      uplift >= 5000 ? 'critical' :
      uplift >= 2000 ? 'high' : 'medium';

    return createNotification({
      type: 'opportunity',
      priority,
      title: `📈 Oportunidad de upsell: ${customerName}`,
      message: `Potencial +€${uplift.toLocaleString()}/mes. Productos: ${products.slice(0, 2).join(', ')}`,
      agentId,
      agentName: agentName || 'Upsell Detector',
      entityType: 'customer',
      entityId: customerId,
      entityName: customerName,
      value: uplift * 12,
      metadata: { currentMRR, potentialMRR, products },
      actionLabel: 'Ver oferta',
      actionUrl: `/customers/${customerId}/upsell`
    });
  }, [createNotification]);

  // === ACCIONES ===

  // Marcar como leída
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, readAt: new Date() } : n
    ));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    const now = new Date();
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || now })));
  }, []);

  // Descartar notificación
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, dismissedAt: new Date() } : n
    ));
  }, []);

  // Limpiar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
    toast.success('Notificaciones limpiadas');
  }, []);

  // Actualizar settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    toast.success('Configuración actualizada');
  }, []);

  // Solicitar permiso push
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Las notificaciones push no están soportadas en este navegador');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateSettings({ pushEnabled: true });
      toast.success('Notificaciones push activadas');
      return true;
    } else {
      toast.error('Permiso de notificaciones denegado');
      return false;
    }
  }, [updateSettings]);

  // Enviar notificación de prueba
  const sendTestNotification = useCallback(() => {
    createNotification({
      type: 'info',
      priority: 'medium',
      title: '🔔 Notificación de prueba',
      message: 'Las notificaciones están funcionando correctamente',
      agentName: 'Sistema'
    });
  }, [createNotification]);

  // === RETURN ===
  return {
    // Estado
    notifications: notifications.filter(n => !n.dismissedAt),
    allNotifications: notifications,
    settings,
    stats,
    isLoading,
    
    // Acciones
    createNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    updateSettings,
    requestPushPermission,
    sendTestNotification,
    
    // Detectores automáticos
    detectOpportunity,
    detectRisk,
    detectChurnRisk,
    detectDealAtRisk,
    detectUpsellOpportunity
  };
}

export default useCRMAgentNotifications;
