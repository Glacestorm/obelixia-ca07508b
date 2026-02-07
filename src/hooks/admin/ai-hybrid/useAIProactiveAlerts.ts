/**
 * useAIProactiveAlerts - Sistema de alertas proactivas
 * Notifica antes de superar presupuestos y límites
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export type AlertType = 
  | 'budget_warning'
  | 'budget_critical'
  | 'budget_exceeded'
  | 'usage_spike'
  | 'rate_limit_approaching'
  | 'provider_degraded'
  | 'security_incident'
  | 'compliance_violation';

export type AlertChannel = 'toast' | 'email' | 'push' | 'webhook' | 'in_app';

export interface ProactiveAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
}

export interface BudgetConfig {
  monthlyBudget: number;
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  currency: string;
}

export interface UsageThreshold {
  dailyRequestLimit: number;
  hourlyRequestLimit: number;
  dailyTokenLimit: number;
  warningPercentage: number;
}

export interface AlertConfig {
  enabledChannels: AlertChannel[];
  budgetConfig: BudgetConfig;
  usageThresholds: UsageThreshold;
  checkIntervalMs: number;
  enableEmailAlerts: boolean;
  alertRecipients: string[];
}

const DEFAULT_CONFIG: AlertConfig = {
  enabledChannels: ['toast', 'in_app'],
  budgetConfig: {
    monthlyBudget: 100,
    warningThreshold: 70,
    criticalThreshold: 90,
    currency: 'USD',
  },
  usageThresholds: {
    dailyRequestLimit: 1000,
    hourlyRequestLimit: 100,
    dailyTokenLimit: 100000,
    warningPercentage: 80,
  },
  checkIntervalMs: 60000, // 1 minute
  enableEmailAlerts: false,
  alertRecipients: [],
};

// === HOOK ===
export function useAIProactiveAlerts() {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG);
  const [currentSpend, setCurrentSpend] = useState(0);
  const [currentUsage, setCurrentUsage] = useState({
    dailyRequests: 0,
    hourlyRequests: 0,
    dailyTokens: 0,
  });
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<Date>(new Date());

  // === CREATE ALERT ===
  const createAlert = useCallback((
    type: AlertType,
    title: string,
    message: string,
    options?: {
      severity?: ProactiveAlert['severity'];
      actionRequired?: boolean;
      actionLabel?: string;
      actionUrl?: string;
      metadata?: Record<string, unknown>;
    }
  ): ProactiveAlert => {
    const alert: ProactiveAlert = {
      id: crypto.randomUUID(),
      type,
      severity: options?.severity || 'info',
      title,
      message,
      actionRequired: options?.actionRequired || false,
      actionLabel: options?.actionLabel,
      actionUrl: options?.actionUrl,
      metadata: options?.metadata,
      createdAt: new Date(),
    };

    setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50

    // Dispatch via enabled channels
    dispatchAlert(alert);

    return alert;
  }, []);

  // === DISPATCH ALERT ===
  const dispatchAlert = useCallback((alert: ProactiveAlert) => {
    for (const channel of config.enabledChannels) {
      switch (channel) {
        case 'toast':
          if (alert.severity === 'critical') {
            toast.error(alert.message, { 
              description: alert.title,
              duration: 10000,
            });
          } else if (alert.severity === 'warning') {
            toast.warning(alert.message, { description: alert.title });
          } else {
            toast.info(alert.message, { description: alert.title });
          }
          break;

        case 'email':
          if (config.enableEmailAlerts && config.alertRecipients.length > 0) {
            // Would call an edge function to send email
            console.log('[useAIProactiveAlerts] Email alert:', alert);
          }
          break;

        case 'webhook':
          // Would call configured webhook
          console.log('[useAIProactiveAlerts] Webhook alert:', alert);
          break;

        default:
          // in_app is handled by the alerts state
          break;
      }
    }
  }, [config]);

  // === CHECK BUDGET ===
  const checkBudget = useCallback(async () => {
    try {
      // Get current month's spending
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const client = supabase as any;
      const { data, error } = await client
        .from('ai_usage_metrics')
        .select('cost_usd')
        .gte('timestamp', startOfMonth.toISOString());

      if (error) throw error;

      const totalSpend = (data || []).reduce(
        (sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 
        0
      );
      setCurrentSpend(totalSpend);

      const percentUsed = (totalSpend / config.budgetConfig.monthlyBudget) * 100;

      // Check thresholds
      if (percentUsed >= 100 && !hasRecentAlert('budget_exceeded')) {
        createAlert(
          'budget_exceeded',
          'Presupuesto mensual excedido',
          `Has superado el presupuesto de ${config.budgetConfig.currency}${config.budgetConfig.monthlyBudget}. Gasto actual: ${config.budgetConfig.currency}${totalSpend.toFixed(2)}`,
          {
            severity: 'critical',
            actionRequired: true,
            actionLabel: 'Aumentar presupuesto',
            metadata: { totalSpend, percentUsed },
          }
        );
      } else if (percentUsed >= config.budgetConfig.criticalThreshold && !hasRecentAlert('budget_critical')) {
        createAlert(
          'budget_critical',
          'Presupuesto al límite',
          `Has usado el ${percentUsed.toFixed(1)}% del presupuesto mensual. Considera aumentarlo o reducir el uso.`,
          {
            severity: 'critical',
            actionRequired: true,
            actionLabel: 'Ver detalles',
            metadata: { totalSpend, percentUsed },
          }
        );
      } else if (percentUsed >= config.budgetConfig.warningThreshold && !hasRecentAlert('budget_warning')) {
        createAlert(
          'budget_warning',
          'Alerta de presupuesto',
          `Has usado el ${percentUsed.toFixed(1)}% del presupuesto mensual.`,
          {
            severity: 'warning',
            metadata: { totalSpend, percentUsed },
          }
        );
      }
    } catch (err) {
      console.error('[useAIProactiveAlerts] checkBudget error:', err);
    }
  }, [config.budgetConfig, createAlert]);

  // === CHECK USAGE ===
  const checkUsage = useCallback(async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfHour = new Date(now);
      startOfHour.setMinutes(0, 0, 0);

      const client = supabase as any;
      
      // Daily stats
      const { data: dailyData } = await client
        .from('ai_usage_metrics')
        .select('tokens_input, tokens_output')
        .gte('timestamp', startOfDay.toISOString());

      // Hourly stats
      const { data: hourlyData } = await client
        .from('ai_usage_metrics')
        .select('id')
        .gte('timestamp', startOfHour.toISOString());

      const dailyRequests = dailyData?.length || 0;
      const hourlyRequests = hourlyData?.length || 0;
      const dailyTokens = (dailyData || []).reduce(
        (sum: number, r: any) => sum + (r.tokens_input || 0) + (r.tokens_output || 0),
        0
      );

      setCurrentUsage({ dailyRequests, hourlyRequests, dailyTokens });

      const thresholds = config.usageThresholds;
      const warningPercent = thresholds.warningPercentage / 100;

      // Check rate limits
      if (hourlyRequests >= thresholds.hourlyRequestLimit && !hasRecentAlert('rate_limit_approaching')) {
        createAlert(
          'rate_limit_approaching',
          'Límite de solicitudes por hora alcanzado',
          `Has alcanzado el límite de ${thresholds.hourlyRequestLimit} solicitudes/hora.`,
          { severity: 'warning' }
        );
      } else if (hourlyRequests >= thresholds.hourlyRequestLimit * warningPercent && !hasRecentAlert('rate_limit_approaching')) {
        createAlert(
          'rate_limit_approaching',
          'Acercándose al límite horario',
          `${hourlyRequests}/${thresholds.hourlyRequestLimit} solicitudes esta hora.`,
          { severity: 'info' }
        );
      }

      // Check usage spikes
      const hourlyAverage = dailyRequests / Math.max(1, now.getHours() + 1);
      if (hourlyRequests > hourlyAverage * 3 && !hasRecentAlert('usage_spike')) {
        createAlert(
          'usage_spike',
          'Pico de uso detectado',
          `El uso esta hora es ${(hourlyRequests / hourlyAverage).toFixed(1)}x mayor que el promedio.`,
          { severity: 'warning', metadata: { hourlyRequests, hourlyAverage } }
        );
      }
    } catch (err) {
      console.error('[useAIProactiveAlerts] checkUsage error:', err);
    }
  }, [config.usageThresholds, createAlert]);

  // === HAS RECENT ALERT ===
  const hasRecentAlert = useCallback((type: AlertType, withinMinutes: number = 60): boolean => {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    return alerts.some(a => a.type === type && a.createdAt > cutoff);
  }, [alerts]);

  // === MARK AS READ ===
  const markAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, readAt: new Date() } : a
    ));
  }, []);

  // === DISMISS ALERT ===
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, dismissedAt: new Date() } : a
    ));
  }, []);

  // === CLEAR ALL ===
  const clearAll = useCallback(() => {
    const now = new Date();
    setAlerts(prev => prev.map(a => ({ ...a, dismissedAt: now })));
  }, []);

  // === GET UNREAD COUNT ===
  const getUnreadCount = useCallback(() => {
    return alerts.filter(a => !a.readAt && !a.dismissedAt).length;
  }, [alerts]);

  // === GET ACTIVE ALERTS ===
  const getActiveAlerts = useCallback(() => {
    return alerts.filter(a => !a.dismissedAt);
  }, [alerts]);

  // === UPDATE CONFIG ===
  const updateConfig = useCallback((updates: Partial<AlertConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // === PERIODIC CHECKS ===
  useEffect(() => {
    // Initial check
    checkBudget();
    checkUsage();

    // Setup interval
    checkIntervalRef.current = setInterval(() => {
      checkBudget();
      checkUsage();
      lastCheckRef.current = new Date();
    }, config.checkIntervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [config.checkIntervalMs, checkBudget, checkUsage]);

  return {
    // State
    alerts,
    currentSpend,
    currentUsage,
    unreadCount: getUnreadCount(),
    activeAlerts: getActiveAlerts(),

    // Actions
    createAlert,
    markAsRead,
    dismissAlert,
    clearAll,
    checkBudget,
    checkUsage,

    // Config
    config,
    updateConfig,
  };
}

export default useAIProactiveAlerts;
