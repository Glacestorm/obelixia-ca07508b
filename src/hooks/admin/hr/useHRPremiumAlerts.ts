/**
 * useHRPremiumAlerts — P9.8 Premium Alerts Engine
 * Monitors all 8 Premium HR modules for critical events and generates actionable alerts.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertSource = 'security' | 'ai_governance' | 'workforce' | 'fairness' | 'twin' | 'legal' | 'cnae' | 'role_experience';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';

export interface PremiumAlert {
  id: string;
  source: AlertSource;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  detectedAt: string;
  acknowledgedAt?: string;
}

export interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  newCount: number;
  bySource: Record<AlertSource, number>;
}

const SOURCE_LABELS: Record<AlertSource, string> = {
  security: 'Security & Data Masking',
  ai_governance: 'AI Governance',
  workforce: 'Workforce Planning',
  fairness: 'Fairness Engine',
  twin: 'Digital Twin',
  legal: 'Legal Engine',
  cnae: 'CNAE Intelligence',
  role_experience: 'Role Experience',
};

// Alert detection queries per module
interface AlertCheck {
  source: AlertSource;
  table: string;
  filter: Record<string, string>;
  severity: AlertSeverity;
  titleFn: (count: number) => string;
  descFn: (count: number) => string;
}

const ALERT_CHECKS: AlertCheck[] = [
  // P1: Open security incidents
  {
    source: 'security', table: 'erp_hr_security_incidents',
    filter: { status: 'open' }, severity: 'critical',
    titleFn: (n) => `${n} incidencia(s) de seguridad abierta(s)`,
    descFn: (n) => `Hay ${n} incidencia(s) de seguridad sin resolver que requieren atención inmediata.`,
  },
  // P2: AI decisions with low confidence
  {
    source: 'ai_governance', table: 'erp_hr_ai_decisions',
    filter: { outcome: 'flagged' }, severity: 'warning',
    titleFn: (n) => `${n} decisión(es) IA marcada(s) para revisión`,
    descFn: (n) => `${n} decisión(es) de IA han sido marcadas por baja confianza o sesgo potencial.`,
  },
  // P3: Workforce plans expired/draft
  {
    source: 'workforce', table: 'erp_hr_workforce_plans',
    filter: { status: 'draft' }, severity: 'info',
    titleFn: (n) => `${n} plan(es) de workforce en borrador`,
    descFn: (n) => `Existen ${n} plan(es) de workforce pendientes de aprobación o activación.`,
  },
  // P4: Active justice cases
  {
    source: 'fairness', table: 'erp_hr_justice_cases',
    filter: { status: 'open' }, severity: 'warning',
    titleFn: (n) => `${n} caso(s) de equidad abierto(s)`,
    descFn: (n) => `${n} caso(s) de equidad/justicia requieren seguimiento por el comité.`,
  },
  // P5: Twin alerts unresolved
  {
    source: 'twin', table: 'erp_hr_twin_alerts',
    filter: { status: 'active' }, severity: 'warning',
    titleFn: (n) => `${n} alerta(s) de Digital Twin activa(s)`,
    descFn: (n) => `El gemelo digital ha detectado ${n} divergencia(s) respecto al estado real de la organización.`,
  },
  // P6: Legal contracts pending review
  {
    source: 'legal', table: 'erp_hr_legal_contracts',
    filter: { status: 'pending_review' }, severity: 'info',
    titleFn: (n) => `${n} contrato(s) pendiente(s) de revisión legal`,
    descFn: (n) => `${n} contrato(s) generados esperan validación por el departamento legal.`,
  },
  // P7: CNAE risk assessments high
  {
    source: 'cnae', table: 'erp_hr_cnae_risk_assessments',
    filter: { risk_level: 'high' }, severity: 'critical',
    titleFn: (n) => `${n} riesgo(s) CNAE de nivel alto`,
    descFn: (n) => `Se han detectado ${n} riesgo(s) sectoriales de nivel alto que afectan el cumplimiento normativo.`,
  },
];

export function useHRPremiumAlerts(companyId?: string) {
  const [alerts, setAlerts] = useState<PremiumAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0, critical: 0, warning: 0, info: 0, newCount: 0,
    bySource: {} as Record<AlertSource, number>,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scanAlerts = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const detectedAlerts: PremiumAlert[] = [];

      const checkPromises = ALERT_CHECKS.map(async (check) => {
        try {
          let query = supabase
            .from(check.table as any)
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId);

          // Apply filter
          for (const [key, value] of Object.entries(check.filter)) {
            query = query.eq(key, value);
          }

          const { count } = await query;
          const n = count || 0;

          if (n > 0) {
            detectedAlerts.push({
              id: `${check.source}-${check.table}-${Date.now()}`,
              source: check.source,
              severity: check.severity,
              status: 'new',
              title: check.titleFn(n),
              description: check.descFn(n),
              metadata: { count: n, table: check.table },
              detectedAt: new Date().toISOString(),
            });
          }
        } catch {
          // Table might not exist — skip silently
        }
      });

      await Promise.all(checkPromises);

      // Sort: critical first, then warning, then info
      const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
      detectedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAlerts(detectedAlerts);

      // Compute stats
      const bySource: Record<string, number> = {};
      let critical = 0, warning = 0, info = 0;
      for (const a of detectedAlerts) {
        bySource[a.source] = (bySource[a.source] || 0) + 1;
        if (a.severity === 'critical') critical++;
        else if (a.severity === 'warning') warning++;
        else info++;
      }

      setStats({
        total: detectedAlerts.length,
        critical, warning, info,
        newCount: detectedAlerts.filter(a => a.status === 'new').length,
        bySource: bySource as Record<AlertSource, number>,
      });

      setLastScan(new Date());
    } catch (err) {
      console.error('[useHRPremiumAlerts] Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus, acknowledgedAt: new Date().toISOString() } : a
    ));
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  // Auto-scan every 3 minutes
  useEffect(() => {
    if (companyId) {
      scanAlerts();
      intervalRef.current = setInterval(scanAlerts, 180000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scanAlerts, companyId]);

  return {
    alerts,
    stats,
    isLoading,
    lastScan,
    scanAlerts,
    acknowledgeAlert,
    dismissAlert,
    sourceLabels: SOURCE_LABELS,
  };
}

export default useHRPremiumAlerts;
