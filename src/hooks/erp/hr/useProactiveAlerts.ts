/**
 * useProactiveAlerts — V2-ES.8 Tramo 6 Paso 1
 * Hook that orchestrates proactive alert computation + persistence.
 *
 * Responsibilities:
 * - Gather signals from readiness, deadlines, certificates, dry-runs, approvals
 * - Compute alerts via proactiveAlertEngine (pure)
 * - Persist new alerts to `notifications` table (deduplicated)
 * - Provide computed summary for UI consumption
 *
 * Does NOT:
 * - Send push/email (future)
 * - Block any operation
 * - Trigger real submissions
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeProactiveAlerts,
  filterNewAlerts,
  mapAlertToNotificationRow,
  type ProactiveAlertSummary,
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

/**
 * Cooldown between evaluations to prevent over-computation (ms)
 */
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
      // Graceful degradation: return empty summary
      const emptySummary: ProactiveAlertSummary = {
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
      setState(prev => ({ ...prev, isEvaluating: false, summary: emptySummary }));
      return emptySummary;
    }
  }, [state.summary]);

  /**
   * Dismiss an alert (mark notification as read by deduplication key)
   */
  const dismiss = useCallback(async (deduplicationKey: string) => {
    try {
      // Find notification with this dedup key in metadata
      const { data } = await supabase
        .from('notifications')
        .select('id')
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
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', matchingIds);
        }
      }

      // Update local state
      setState(prev => {
        if (!prev.summary) return prev;
        const filtered = prev.summary.alerts.filter(a => a.deduplicationKey !== deduplicationKey);
        return {
          ...prev,
          summary: {
            ...prev.summary,
            alerts: filtered,
            totalCount: filtered.length,
            criticalCount: filtered.filter(a => a.severity === 'critical').length,
            highCount: filtered.filter(a => a.severity === 'high').length,
            warningCount: filtered.filter(a => a.severity === 'warning').length,
            infoCount: filtered.filter(a => a.severity === 'info').length,
          },
        };
      });
    } catch (error) {
      console.error('[useProactiveAlerts] Dismiss error:', error);
    }
  }, []);

  return {
    ...state,
    evaluate,
    dismiss,
  };
}

// ─── Internal helpers ───────────────────────────────────────────────────────

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
