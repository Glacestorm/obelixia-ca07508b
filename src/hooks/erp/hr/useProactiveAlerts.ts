/**
 * useProactiveAlerts — V2-ES.8 Tramo 6 Paso 1+2
 * Hook that orchestrates proactive alert computation + persistence + lifecycle.
 *
 * Responsibilities:
 * - Gather signals from readiness, deadlines, certificates, dry-runs, approvals
 * - Compute alerts via proactiveAlertEngine (pure)
 * - Persist new alerts to `notifications` table (deduplicated)
 * - Manage alert lifecycle: acknowledge, resolve, dismiss
 * - Provide computed summary for UI consumption
 *
 * Does NOT:
 * - Send push/email (future)
 * - Block any operation
 * - Trigger real submissions
 * - Confirm regulatory non-compliance
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeProactiveAlerts,
  filterNewAlerts,
  mapAlertToNotificationRow,
  canTransition,
  type ProactiveAlertSummary,
  type ProactiveAlertStatus,
  type ReadinessSignal,
  type DeadlineSignal,
  type CertificateSignal,
  type DryRunSignal,
  type ApprovalSignal,
} from '@/components/erp/hr/shared/proactiveAlertEngine';

export interface ProactiveAlertsState {
  summary: ProactiveAlertSummary | null;
  isEvaluating: boolean;
  lastEvaluatedAt: Date | null;
  persistedCount: number;
}

/** Cooldown between evaluations to prevent over-computation (ms) */
const EVALUATION_COOLDOWN_MS = 30_000; // 30 seconds

export function useProactiveAlerts() {
  const [state, setState] = useState<ProactiveAlertsState>({
    summary: null,
    isEvaluating: false,
    lastEvaluatedAt: null,
    persistedCount: 0,
  });
  const lastEvalRef = useRef<number>(0);

  /**
   * Main evaluation: compute alerts from provided signals,
   * deduplicate against existing notifications, persist new ones.
   */
  const evaluate = useCallback(async (
    signals: {
      readiness?: ReadinessSignal[];
      deadlines?: DeadlineSignal[];
      certificates?: CertificateSignal[];
      dryRuns?: DryRunSignal[];
      approvals?: ApprovalSignal[];
    },
    options?: {
      persist?: boolean;
      userId?: string;
      forceCooldownBypass?: boolean;
    },
  ): Promise<ProactiveAlertSummary> => {
    const { persist = true, userId, forceCooldownBypass = false } = options ?? {};

    // Cooldown check
    const now = Date.now();
    if (!forceCooldownBypass && now - lastEvalRef.current < EVALUATION_COOLDOWN_MS) {
      if (state.summary) return state.summary;
    }
    lastEvalRef.current = now;

    setState(prev => ({ ...prev, isEvaluating: true }));

    try {
      // 1. Compute alerts (pure)
      const summary = computeProactiveAlerts(signals);

      // 2. If persistence enabled, deduplicate and persist
      let persistedCount = 0;
      if (persist && summary.alerts.length > 0) {
        persistedCount = await persistNewAlerts(summary, userId);
      }

      setState({
        summary,
        isEvaluating: false,
        lastEvaluatedAt: new Date(),
        persistedCount,
      });

      return summary;
    } catch (error) {
      console.error('[useProactiveAlerts] Evaluation error:', error);
      const emptySummary = createEmptySummary();
      setState(prev => ({ ...prev, isEvaluating: false, summary: emptySummary }));
      return emptySummary;
    }
  }, [state.summary]);

  /**
   * Transition an alert to a new status (acknowledge, resolve, dismiss).
   * Updates both the notification in DB and local state.
   */
  const transitionAlert = useCallback(async (
    deduplicationKey: string,
    newStatus: ProactiveAlertStatus,
  ): Promise<boolean> => {
    try {
      // Validate transition in local state
      const currentAlert = state.summary?.alerts.find(a => a.deduplicationKey === deduplicationKey);
      if (currentAlert && !canTransition(currentAlert.status, newStatus)) {
        console.warn(`[useProactiveAlerts] Invalid transition: ${currentAlert.status} → ${newStatus}`);
        return false;
      }

      // Find and update notification in DB
      const { data } = await supabase
        .from('notifications')
        .select('id, metadata')
        .eq('source_system', 'hr_integrations')
        .eq('is_read', false)
        .limit(100);

      if (data) {
        const matchingIds = data
          .filter((n: any) => {
            const meta = n.metadata as Record<string, unknown> | null;
            return meta?.deduplicationKey === deduplicationKey;
          })
          .map((n: any) => n.id);

        if (matchingIds.length > 0) {
          const isTerminal = newStatus === 'resolved' || newStatus === 'dismissed';
          const now = new Date().toISOString();

          await supabase
            .from('notifications')
            .update({
              is_read: isTerminal,
              metadata: {
                ...(currentAlert ? mapAlertToNotificationRow(currentAlert).metadata : {}),
                alertStatus: newStatus,
                ...(newStatus === 'acknowledged' ? { acknowledgedAt: now } : {}),
                ...(newStatus === 'resolved' ? { resolvedAt: now } : {}),
              },
            } as any)
            .in('id', matchingIds);
        }
      }

      // Update local state
      setState(prev => {
        if (!prev.summary) return prev;
        const updatedAlerts = prev.summary.alerts.map(a => {
          if (a.deduplicationKey !== deduplicationKey) return a;
          return {
            ...a,
            status: newStatus,
            ...(newStatus === 'acknowledged' ? { acknowledgedAt: new Date() } : {}),
            ...(newStatus === 'resolved' ? { resolvedAt: new Date() } : {}),
          };
        });

        // Filter out terminal alerts from active counts
        const activeAlerts = updatedAlerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
        return {
          ...prev,
          summary: {
            ...prev.summary,
            alerts: updatedAlerts,
            totalCount: updatedAlerts.length,
            criticalCount: activeAlerts.filter(a => a.severity === 'critical').length,
            highCount: activeAlerts.filter(a => a.severity === 'high').length,
            warningCount: activeAlerts.filter(a => a.severity === 'warning').length,
            infoCount: activeAlerts.filter(a => a.severity === 'info').length,
          },
        };
      });

      return true;
    } catch (error) {
      console.error('[useProactiveAlerts] Transition error:', error);
      return false;
    }
  }, [state.summary]);

  /** Acknowledge an alert */
  const acknowledge = useCallback(
    (deduplicationKey: string) => transitionAlert(deduplicationKey, 'acknowledged'),
    [transitionAlert],
  );

  /** Resolve an alert (condition cleared) */
  const resolve = useCallback(
    (deduplicationKey: string) => transitionAlert(deduplicationKey, 'resolved'),
    [transitionAlert],
  );

  /** Dismiss an alert (user explicitly discards) */
  const dismiss = useCallback(
    (deduplicationKey: string) => transitionAlert(deduplicationKey, 'dismissed'),
    [transitionAlert],
  );

  return {
    ...state,
    evaluate,
    acknowledge,
    resolve,
    dismiss,
  };
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function createEmptySummary(): ProactiveAlertSummary {
  return {
    alerts: [],
    criticalCount: 0,
    highCount: 0,
    warningCount: 0,
    infoCount: 0,
    totalCount: 0,
    overallSeverity: 'ok',
    byDomain: {
      tgss_siltra: [],
      contrata_sepe: [],
      aeat: [],
      certificates: [],
      approvals: [],
      general: [],
    },
    deduplicationKeys: new Set(),
  };
}

async function persistNewAlerts(
  summary: ProactiveAlertSummary,
  userId?: string,
): Promise<number> {
  try {
    // 1. Fetch existing deduplication keys from unread hr_integrations notifications
    const { data: existing } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('source_system', 'hr_integrations')
      .eq('is_read', false)
      .limit(200);

    const existingKeys = new Set<string>();
    if (existing) {
      for (const row of existing) {
        const meta = row.metadata as Record<string, unknown> | null;
        if (meta?.deduplicationKey && typeof meta.deduplicationKey === 'string') {
          existingKeys.add(meta.deduplicationKey);
        }
      }
    }

    // 2. Filter truly new alerts
    const newAlerts = filterNewAlerts(summary.alerts, existingKeys);
    if (newAlerts.length === 0) return 0;

    // 3. Insert new notifications (batch)
    const rows = newAlerts.map(a => mapAlertToNotificationRow(a, userId));

    const { error } = await supabase
      .from('notifications')
      .insert(rows);

    if (error) {
      console.error('[useProactiveAlerts] Persist error:', error);
      return 0;
    }

    console.log(`[useProactiveAlerts] Persisted ${newAlerts.length} new alert(s)`);
    return newAlerts.length;
  } catch (error) {
    console.error('[useProactiveAlerts] persistNewAlerts error:', error);
    return 0;
  }
}

export default useProactiveAlerts;
