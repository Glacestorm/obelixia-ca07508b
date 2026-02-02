/**
 * useERPAgentNotifications - Hook para sistema de notificaciones push de agentes ERP
 * Detecta oportunidades de venta, riesgo de churn, anomalías y alertas críticas
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { AgentDomain } from './erpAgentTypes';

// === TIPOS ===

export type ERPNotificationType = 'opportunity' | 'churn_risk' | 'anomaly' | 'compliance' | 'performance' | 'system';

export type ERPNotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ERPAgentNotification {
  id: string;
  type: ERPNotificationType;
  priority: ERPNotificationPriority;
  title: string;
  message: string;
  domain: AgentDomain;
  agentId?: string;
  agentName?: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  actionRequired: boolean;
  actionTaken?: boolean;
  actionType?: string;
  metadata?: {
    entityId?: string;
    entityType?: string;
    value?: number;
    threshold?: number;
    confidence?: number;
    recommendation?: string;
    relatedIds?: string[];
  };
  expiresAt?: string;
}

export interface ERPNotificationStats {
  total: number;
  unread: number;
  critical: number;
  byType: Record<ERPNotificationType, number>;
  byDomain: Record<AgentDomain, number>;
}

export interface ERPNotificationPreferences {
  enableSound: boolean;
  enableDesktop: boolean;
  criticalOnly: boolean;
  mutedDomains: AgentDomain[];
  mutedTypes: ERPNotificationType[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

interface UseERPAgentNotificationsOptions {
  autoGenerate?: boolean;
  generateInterval?: number;
  maxNotifications?: number;
  onNewNotification?: (notification: ERPAgentNotification) => void;
}

// === GENERADORES DE NOTIFICACIONES MOCK ===

const NOTIFICATION_TEMPLATES: Array<Omit<ERPAgentNotification, 'id' | 'timestamp' | 'read' | 'dismissed' | 'actionTaken'>> = [
  // Oportunidades
  {
    type: 'opportunity',
    priority: 'critical',
    title: 'Oportunidad de Venta Crítica',
    message: 'Cliente Enterprise muestra alta intención de compra. Valor estimado: €250,000',
    domain: 'crm_cs',
    agentName: 'Agente de Ventas',
    actionRequired: true,
    actionType: 'contact_client',
    metadata: {
      entityType: 'deal',
      value: 250000,
      confidence: 92,
      recommendation: 'Contactar inmediatamente con propuesta personalizada'
    }
  },
  {
    type: 'opportunity',
    priority: 'high',
    title: 'Upsell Detectado',
    message: 'Cliente actual elegible para upgrade de plan. Potencial adicional: €45,000/año',
    domain: 'crm_cs',
    agentName: 'Agente de Upsell',
    actionRequired: true,
    actionType: 'propose_upgrade',
    metadata: {
      entityType: 'account',
      value: 45000,
      confidence: 85
    }
  },
  // Riesgo de Churn
  {
    type: 'churn_risk',
    priority: 'critical',
    title: 'Alto Riesgo de Churn',
    message: 'Cliente clave sin actividad en 60 días. Probabilidad de cancelación: 85%',
    domain: 'crm_cs',
    agentName: 'Agente Anti-Churn',
    actionRequired: true,
    actionType: 'retention_call',
    metadata: {
      entityType: 'customer',
      value: 85,
      threshold: 70,
      recommendation: 'Iniciar protocolo de retención inmediatamente'
    }
  },
  {
    type: 'churn_risk',
    priority: 'high',
    title: 'Señales de Descontento',
    message: 'Múltiples tickets de soporte negativos detectados. Satisfacción: 35%',
    domain: 'crm_cs',
    agentName: 'Agente de Satisfacción',
    actionRequired: true,
    actionType: 'escalate_support',
    metadata: {
      entityType: 'customer',
      value: 35,
      threshold: 50
    }
  },
  // Anomalías
  {
    type: 'anomaly',
    priority: 'critical',
    title: 'Anomalía en Transacciones',
    message: 'Patrón inusual detectado: 15 transacciones idénticas en 5 minutos',
    domain: 'financial',
    agentName: 'Agente de Detección de Fraude',
    actionRequired: true,
    actionType: 'review_transactions',
    metadata: {
      entityType: 'transaction_batch',
      confidence: 94
    }
  },
  {
    type: 'anomaly',
    priority: 'high',
    title: 'Inventario Anómalo',
    message: 'Discrepancia de stock detectada: 340 unidades faltantes en almacén central',
    domain: 'operations',
    agentName: 'Agente de Inventario',
    actionRequired: true,
    actionType: 'audit_inventory',
    metadata: {
      entityType: 'inventory',
      value: 340
    }
  },
  // Compliance
  {
    type: 'compliance',
    priority: 'critical',
    title: 'Incumplimiento GDPR',
    message: 'Datos personales sin consentimiento explícito detectados en 45 registros',
    domain: 'compliance',
    agentName: 'Agente GDPR',
    actionRequired: true,
    actionType: 'data_review',
    metadata: {
      entityType: 'data_records',
      value: 45,
      recommendation: 'Revisar y obtener consentimiento o eliminar datos'
    }
  },
  {
    type: 'compliance',
    priority: 'high',
    title: 'Auditoría Pendiente',
    message: 'Documentación KYC/AML requiere actualización para 12 clientes',
    domain: 'compliance',
    agentName: 'Agente KYC/AML',
    actionRequired: true,
    actionType: 'update_kyc',
    metadata: {
      entityType: 'customers',
      value: 12
    }
  },
  // Performance
  {
    type: 'performance',
    priority: 'medium',
    title: 'Optimización Detectada',
    message: 'Posibilidad de reducir costes operativos en 18% mediante automatización',
    domain: 'operations',
    agentName: 'Agente de Optimización',
    actionRequired: false,
    metadata: {
      value: 18,
      recommendation: 'Implementar automatización en proceso de facturación'
    }
  },
  {
    type: 'performance',
    priority: 'low',
    title: 'Eficiencia Mejorada',
    message: 'Tiempo promedio de respuesta reducido un 25% esta semana',
    domain: 'crm_cs',
    agentName: 'Agente de Métricas',
    actionRequired: false,
    metadata: {
      value: 25
    }
  },
  // Sistema
  {
    type: 'system',
    priority: 'high',
    title: 'Agente Requiere Atención',
    message: 'Agente de Tesorería reporta tasa de error superior al umbral (15%)',
    domain: 'financial',
    agentName: 'Supervisor de Agentes',
    actionRequired: true,
    actionType: 'review_agent',
    metadata: {
      value: 15,
      threshold: 10
    }
  }
];

// === HOOK ===

export function useERPAgentNotifications(options: UseERPAgentNotificationsOptions = {}) {
  const {
    autoGenerate = true,
    generateInterval = 45000,
    maxNotifications = 50,
    onNewNotification
  } = options;

  // Estado
  const [notifications, setNotifications] = useState<ERPAgentNotification[]>([]);
  const [preferences, setPreferences] = useState<ERPNotificationPreferences>({
    enableSound: true,
    enableDesktop: true,
    criticalOnly: false,
    mutedDomains: [],
    mutedTypes: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const generatorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // === CALCULAR ESTADÍSTICAS ===
  const stats: ERPNotificationStats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read && !n.dismissed).length,
    critical: notifications.filter(n => n.priority === 'critical' && !n.read && !n.dismissed).length,
    byType: {
      opportunity: notifications.filter(n => n.type === 'opportunity').length,
      churn_risk: notifications.filter(n => n.type === 'churn_risk').length,
      anomaly: notifications.filter(n => n.type === 'anomaly').length,
      compliance: notifications.filter(n => n.type === 'compliance').length,
      performance: notifications.filter(n => n.type === 'performance').length,
      system: notifications.filter(n => n.type === 'system').length
    },
    byDomain: {
      financial: notifications.filter(n => n.domain === 'financial').length,
      crm_cs: notifications.filter(n => n.domain === 'crm_cs').length,
      compliance: notifications.filter(n => n.domain === 'compliance').length,
      operations: notifications.filter(n => n.domain === 'operations').length,
      hr: notifications.filter(n => n.domain === 'hr').length,
      analytics: notifications.filter(n => n.domain === 'analytics').length,
      legal: notifications.filter(n => n.domain === 'legal').length
    }
  };

  // === GENERAR NOTIFICACIÓN ===
  const generateNotification = useCallback((): ERPAgentNotification => {
    const template = NOTIFICATION_TEMPLATES[Math.floor(Math.random() * NOTIFICATION_TEMPLATES.length)];
    
    return {
      ...template,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false,
      actionTaken: false
    };
  }, []);

  // === AÑADIR NOTIFICACIÓN ===
  const addNotification = useCallback((notification: ERPAgentNotification) => {
    // Verificar si está silenciado
    if (preferences.mutedDomains.includes(notification.domain)) return;
    if (preferences.mutedTypes.includes(notification.type)) return;
    if (preferences.criticalOnly && notification.priority !== 'critical') return;

    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Callback
    onNewNotificationRef.current?.(notification);

    // Toast para notificaciones críticas y altas
    if (notification.priority === 'critical' || notification.priority === 'high') {
      toast[notification.priority === 'critical' ? 'error' : 'warning'](
        notification.title,
        {
          description: notification.message,
          duration: notification.priority === 'critical' ? 10000 : 5000,
          action: notification.actionRequired ? {
            label: 'Ver',
            onClick: () => markAsRead(notification.id)
          } : undefined
        }
      );
    }

    // Notificación de escritorio
    if (preferences.enableDesktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }, [preferences, maxNotifications]);

  // === MARCAR COMO LEÍDA ===
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  }, []);

  // === MARCAR TODAS COMO LEÍDAS ===
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // === DESCARTAR NOTIFICACIÓN ===
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, dismissed: true } : n
    ));
  }, []);

  // === DESCARTAR TODAS ===
  const dismissAll = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, dismissed: true })));
  }, []);

  // === MARCAR ACCIÓN TOMADA ===
  const markActionTaken = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, actionTaken: true, read: true } : n
    ));
    toast.success('Acción registrada');
  }, []);

  // === LIMPIAR NOTIFICACIONES ANTIGUAS ===
  const clearOldNotifications = useCallback((olderThanHours: number = 24) => {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
    setNotifications(prev => prev.filter(n => n.timestamp > cutoff || !n.read));
  }, []);

  // === ACTUALIZAR PREFERENCIAS ===
  const updatePreferences = useCallback((updates: Partial<ERPNotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // === SOLICITAR PERMISOS DE NOTIFICACIÓN ===
  const requestDesktopPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Notificaciones no soportadas en este navegador');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notificaciones de escritorio activadas');
      return true;
    } else {
      toast.error('Permisos de notificación denegados');
      return false;
    }
  }, []);

  // === FILTRAR NOTIFICACIONES ===
  const getFilteredNotifications = useCallback((filters?: {
    type?: ERPNotificationType;
    domain?: AgentDomain;
    priority?: ERPNotificationPriority;
    unreadOnly?: boolean;
    actionRequiredOnly?: boolean;
  }): ERPAgentNotification[] => {
    let filtered = notifications.filter(n => !n.dismissed);

    if (filters?.type) filtered = filtered.filter(n => n.type === filters.type);
    if (filters?.domain) filtered = filtered.filter(n => n.domain === filters.domain);
    if (filters?.priority) filtered = filtered.filter(n => n.priority === filters.priority);
    if (filters?.unreadOnly) filtered = filtered.filter(n => !n.read);
    if (filters?.actionRequiredOnly) filtered = filtered.filter(n => n.actionRequired && !n.actionTaken);

    return filtered;
  }, [notifications]);

  // === AUTO-GENERACIÓN ===
  useEffect(() => {
    if (!autoGenerate) return;

    // Generar algunas notificaciones iniciales
    const initialNotifications = Array.from({ length: 3 }, generateNotification);
    initialNotifications.forEach(n => {
      n.read = Math.random() > 0.7;
      n.timestamp = new Date(Date.now() - Math.random() * 3600000).toISOString();
    });
    setNotifications(initialNotifications);

    // Iniciar generación periódica
    generatorIntervalRef.current = setInterval(() => {
      if (isMountedRef.current && Math.random() > 0.4) {
        const newNotification = generateNotification();
        addNotification(newNotification);
      }
    }, generateInterval);

    return () => {
      if (generatorIntervalRef.current) {
        clearInterval(generatorIntervalRef.current);
      }
    };
  }, [autoGenerate, generateInterval, generateNotification, addNotification]);

  // === CLEANUP ===
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // Estado
    notifications,
    stats,
    preferences,
    isLoading,
    
    // Acciones
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,
    markActionTaken,
    clearOldNotifications,
    
    // Preferencias
    updatePreferences,
    requestDesktopPermission,
    
    // Utilidades
    getFilteredNotifications,
    generateNotification
  };
}

export default useERPAgentNotifications;
