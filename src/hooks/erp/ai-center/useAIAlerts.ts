import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// === TYPES ===
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'performance' | 'compliance' | 'cost' | 'security' | 'availability';

export interface AIAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  agentCode?: string;
  agentName?: string;
  metricValue?: number;
  thresholdValue?: number;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
  condition: string;
  threshold: number;
  checkFn: (invocations: any[], agents: any[]) => AIAlert | null;
}

// === BUILT-IN ALERT RULES ===
function createDefaultRules(): AlertRule[] {
  return [
    {
      id: 'high-failure-rate',
      name: 'Tasa de fallos elevada',
      description: 'Se dispara cuando >20% de invocaciones recientes fallan',
      category: 'performance',
      severity: 'critical',
      enabled: true,
      condition: 'failure_rate > threshold',
      threshold: 20,
      checkFn: (invocations) => {
        if (invocations.length < 5) return null;
        const recent = invocations.slice(0, 50);
        const failures = recent.filter((i: any) => i.outcome_status === 'error' || i.outcome_status === 'failed');
        const rate = (failures.length / recent.length) * 100;
        if (rate > 20) {
          return {
            id: `alert-failure-${Date.now()}`,
            title: 'Tasa de fallos crítica',
            message: `${rate.toFixed(1)}% de las últimas ${recent.length} invocaciones han fallado`,
            severity: 'critical',
            category: 'performance',
            metricValue: rate,
            thresholdValue: 20,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          };
        }
        return null;
      },
    },
    {
      id: 'slow-execution',
      name: 'Ejecución lenta',
      description: 'Agentes con latencia media >5s',
      category: 'performance',
      severity: 'warning',
      enabled: true,
      condition: 'avg_execution_time > threshold_ms',
      threshold: 5000,
      checkFn: (invocations) => {
        const withTime = invocations.filter((i: any) => i.execution_time_ms != null);
        if (withTime.length < 3) return null;
        const avg = withTime.reduce((s: number, i: any) => s + (i.execution_time_ms || 0), 0) / withTime.length;
        if (avg > 5000) {
          return {
            id: `alert-slow-${Date.now()}`,
            title: 'Latencia elevada',
            message: `Latencia media: ${(avg / 1000).toFixed(1)}s (umbral: 5s)`,
            severity: 'warning',
            category: 'performance',
            metricValue: avg,
            thresholdValue: 5000,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          };
        }
        return null;
      },
    },
    {
      id: 'low-confidence',
      name: 'Confianza baja generalizada',
      description: 'Confianza media <60% en invocaciones recientes',
      category: 'compliance',
      severity: 'warning',
      enabled: true,
      condition: 'avg_confidence < threshold',
      threshold: 60,
      checkFn: (invocations) => {
        const withConf = invocations.filter((i: any) => i.confidence_score != null);
        if (withConf.length < 3) return null;
        const avg = withConf.reduce((s: number, i: any) => s + (i.confidence_score || 0), 0) / withConf.length;
        const avgPct = avg * 100;
        if (avgPct < 60) {
          return {
            id: `alert-conf-${Date.now()}`,
            title: 'Confianza baja',
            message: `Confianza media: ${avgPct.toFixed(1)}% (umbral: 60%)`,
            severity: 'warning',
            category: 'compliance',
            metricValue: avgPct,
            thresholdValue: 60,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          };
        }
        return null;
      },
    },
    {
      id: 'escalation-spike',
      name: 'Pico de escalaciones',
      description: 'Más de 30% de tareas escaladas',
      category: 'availability',
      severity: 'critical',
      enabled: true,
      condition: 'escalation_rate > threshold',
      threshold: 30,
      checkFn: (invocations) => {
        if (invocations.length < 5) return null;
        const recent = invocations.slice(0, 50);
        const escalated = recent.filter((i: any) => i.escalated_to != null);
        const rate = (escalated.length / recent.length) * 100;
        if (rate > 30) {
          return {
            id: `alert-esc-${Date.now()}`,
            title: 'Pico de escalaciones',
            message: `${rate.toFixed(1)}% de tareas escaladas (umbral: 30%)`,
            severity: 'critical',
            category: 'availability',
            metricValue: rate,
            thresholdValue: 30,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          };
        }
        return null;
      },
    },
    {
      id: 'inactive-agents',
      name: 'Agentes inactivos',
      description: 'Agentes activos sin invocaciones en 24h',
      category: 'availability',
      severity: 'info',
      enabled: true,
      condition: 'active_agents_without_invocations > 0',
      threshold: 0,
      checkFn: (invocations, agents) => {
        const activeAgents = agents.filter((a: any) => a.status === 'active');
        const recentCodes = new Set(invocations.slice(0, 200).map((i: any) => i.agent_code));
        const inactive = activeAgents.filter((a: any) => !recentCodes.has(a.code));
        if (inactive.length > 0) {
          return {
            id: `alert-inactive-${Date.now()}`,
            title: 'Agentes sin actividad',
            message: `${inactive.length} agente(s) activo(s) sin invocaciones recientes: ${inactive.map((a: any) => a.name).slice(0, 3).join(', ')}`,
            severity: 'info',
            category: 'availability',
            metricValue: inactive.length,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          };
        }
        return null;
      },
    },
    {
      id: 'hitl-overload',
      name: 'Sobrecarga HITL',
      description: 'Demasiados agentes requieren revisión humana',
      category: 'security',
      severity: 'warning',
      enabled: true,
      condition: 'hitl_percentage > threshold',
      threshold: 50,
      checkFn: (_inv, agents) => {
        if (agents.length < 2) return null;
        const hitl = agents.filter((a: any) => a.requires_human_review);
        const pct = (hitl.length / agents.length) * 100;
        if (pct > 50) {
          return {
            id: `alert-hitl-${Date.now()}`,
            title: 'Sobrecarga de revisión humana',
            message: `${pct.toFixed(0)}% de agentes requieren HITL — posible cuello de botella`,
            severity: 'warning',
            category: 'security',
            metricValue: pct,
            thresholdValue: 50,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          };
        }
        return null;
      },
    },
  ];
}

export function useAIAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>(createDefaultRules);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Run all alert rules against live data
  const runAlertCheck = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [invRes, agentRes] = await Promise.all([
        supabase
          .from('erp_ai_agent_invocations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('erp_ai_agents_registry').select('*'),
      ]);

      const invocations = invRes.data || [];
      const agents = agentRes.data || [];

      const newAlerts: AIAlert[] = [];
      for (const rule of rules) {
        if (!rule.enabled) continue;
        const alert = rule.checkFn(invocations, agents);
        if (alert) newAlerts.push(alert);
      }

      setAlerts(newAlerts);
      setLastCheck(new Date());
    } catch (err) {
      console.error('[useAIAlerts] check error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, rules]);

  // Acknowledge an alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, isAcknowledged: true, acknowledgedAt: new Date().toISOString(), acknowledgedBy: user?.id }
          : a
      )
    );
  }, [user?.id]);

  // Toggle rule
  const toggleRule = useCallback((ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  // Computed
  const activeAlerts = useMemo(() => alerts.filter((a) => !a.isAcknowledged), [alerts]);
  const criticalCount = useMemo(() => activeAlerts.filter((a) => a.severity === 'critical').length, [activeAlerts]);
  const warningCount = useMemo(() => activeAlerts.filter((a) => a.severity === 'warning').length, [activeAlerts]);

  const byCategory = useMemo(() => {
    const map: Record<AlertCategory, AIAlert[]> = {
      performance: [], compliance: [], cost: [], security: [], availability: [],
    };
    activeAlerts.forEach((a) => map[a.category].push(a));
    return map;
  }, [activeAlerts]);

  // Initial check
  useEffect(() => {
    if (user?.id) runAlertCheck();
  }, [user?.id]);

  return {
    alerts,
    activeAlerts,
    rules,
    loading,
    lastCheck,
    criticalCount,
    warningCount,
    byCategory,
    runAlertCheck,
    acknowledgeAlert,
    toggleRule,
  };
}
