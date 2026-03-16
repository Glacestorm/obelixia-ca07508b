/**
 * useProactiveAlerts — V2-ES.8 Tramo 6 Paso 1+2+5
 * Hook that orchestrates proactive alert computation + persistence + lifecycle + audit.
 *
 * Responsibilities:
 * - Gather signals from readiness, deadlines, certificates, dry-runs, approvals
 * - Compute alerts via proactiveAlertEngine (pure)
 * - Persist new alerts to `notifications` table (deduplicated)
 * - Manage alert lifecycle: acknowledge, resolve, dismiss
 * - Provide computed summary for UI consumption
 * - Audit every lifecycle transition via erp_hr_audit_log
 * - Prevent resolved/dismissed alerts from recurring without new conditions
 *
 * Does NOT:
 * - Send push/email (future)
 * - Block any operation
 * - Trigger real submissions
 * - Confirm regulatory non-compliance
 *
 * Semantics:
 * - resolved ≠ compliance confirmed officially
 * - dismissed ≠ problem doesn't exist
 * - acknowledged ≠ action completed
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
} from '@/engines/erp/hr/proactiveAlertEngine';

export interface ProactiveAlertsState {
  summary: ProactiveAlertSummary | null;
  isEvaluating: boolean;
  lastEvaluatedAt: Date | null;
  persistedCount: number;
}

/** Cooldown between evaluations to prevent over-computation (ms) */
const EVALUATION_COOLDOWN_MS = 30_000; // 30 seconds

// ─── Audit event names (coherent naming) ────────────────────────────────────
const AUDIT_EVENTS = {
  ALERT_GENERATED: 'proactive_alert_generated',
  ALERT_ACKNOWLEDGED: 'proactive_alert_acknowledged',
  ALERT_RESOLVED: 'proactive_alert_resolved',
  ALERT_DISMISSED: 'proactive_alert_dismissed',
  ALERT_REGENERATED: 'proactive_alert_regenerated',
} as const;

export function useProactiveAlerts() {
  const [state, setState] = useState<ProactiveAlertsState>({
    summary: null,
    isEvaluating: false,
    lastEvaluatedAt: null,
    persistedCount: 0,
  });
  const lastEvalRef = useRef<number>(0);
  /** Track dismissed/resolved keys to prevent recurrence within session */
  const suppressedKeysRef = useRef<Set<string>>(new Set());

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

      // 2. Filter out suppressed (resolved/dismissed in this session)
      summary.alerts = summary.alerts.filter(
        a => !suppressedKeysRef.current.has(a.deduplicationKey)
      );

      // 3. If persistence enabled, deduplicate and persist
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
   * Logs audit event for every transition.
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
                ...(newStatus === 'dismissed' ? { dismissedAt: now } : {}),
              },
            } as any)
            .in('id', matchingIds);
        }
      }

      // Track suppressed keys to prevent recurrence
      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        suppressedKeysRef.current.add(deduplicationKey);
      }

      // Audit log the transition
      await logAlertAudit(
        newStatus === 'acknowledged' ? AUDIT_EVENTS.ALERT_ACKNOWLEDGED :
        newStatus === 'resolved' ? AUDIT_EVENTS.ALERT_RESOLVED :
        AUDIT_EVENTS.ALERT_DISMISSED,
        currentAlert,
        deduplicationKey,
        newStatus,
      );

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

    // 2. Also check recently resolved/dismissed (last 24h) to prevent recurrence
    const { data: recentResolved } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('source_system', 'hr_integrations')
      .eq('is_read', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(200);

    if (recentResolved) {
      for (const row of recentResolved) {
        const meta = row.metadata as Record<string, unknown> | null;
        if (meta?.deduplicationKey && typeof meta.deduplicationKey === 'string') {
          const alertStatus = meta.alertStatus as string;
          if (alertStatus === 'resolved' || alertStatus === 'dismissed') {
            existingKeys.add(meta.deduplicationKey);
          }
        }
      }
    }

    // 3. Filter truly new alerts
    const newAlerts = filterNewAlerts(summary.alerts, existingKeys);
    if (newAlerts.length === 0) return 0;

    // 4. Check if any of these are regenerated (previously existed as resolved/dismissed)
    const regeneratedKeys = new Set<string>();
    if (recentResolved) {
      for (const a of newAlerts) {
        // If it passed the 24h filter but was resolved >24h ago, it's a regeneration
        // (this won't fire due to the filter above, but kept for semantic clarity)
      }
    }

    // 5. Insert new notifications (batch)
    const rows = newAlerts.map(a => mapAlertToNotificationRow(a, userId));

    const { error } = await supabase
      .from('notifications')
      .insert(rows);

    if (error) {
      console.error('[useProactiveAlerts] Persist error:', error);
      return 0;
    }

    // 6. Audit log each new alert
    for (const alert of newAlerts) {
      await logAlertAudit(
        AUDIT_EVENTS.ALERT_GENERATED,
        alert,
        alert.deduplicationKey,
        'active',
      );
    }

    console.log(`[useProactiveAlerts] Persisted ${newAlerts.length} new alert(s)`);
    return newAlerts.length;
  } catch (error) {
    console.error('[useProactiveAlerts] persistNewAlerts error:', error);
    return 0;
  }
}

/**
 * Log an alert lifecycle event to erp_hr_audit_log.
 * Reuses the same pattern as other HR hooks (fiscal, SS, contracts).
 */
async function logAlertAudit(
  action: string,
  alert: { deduplicationKey: string; domain: string; category: string; severity: string; title: string; entityRef?: string; relatedSubmissionId?: string; relatedApprovalId?: string; relatedPeriodId?: string; metadata?: Record<string, unknown> } | undefined,
  deduplicationKey: string,
  newStatus: string,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('erp_hr_audit_log').insert([{
      action,
      table_name: 'notifications',
      record_id: deduplicationKey,
      category: 'proactive_alerts',
      user_id: user?.id ?? null,
      metadata: {
        deduplicationKey,
        newStatus,
        domain: alert?.domain ?? null,
        alertCategory: alert?.category ?? null,
        severity: alert?.severity ?? null,
        title: alert?.title ?? null,
        entityRef: alert?.entityRef ?? null,
        relatedSubmissionId: alert?.relatedSubmissionId ?? null,
        relatedApprovalId: alert?.relatedApprovalId ?? null,
        relatedPeriodId: alert?.relatedPeriodId ?? null,
        timestamp: new Date().toISOString(),
        // Semantic disclaimer
        _note: action === AUDIT_EVENTS.ALERT_RESOLVED
          ? 'resolved ≠ cumplimiento confirmado oficialmente'
          : action === AUDIT_EVENTS.ALERT_DISMISSED
          ? 'dismissed ≠ problema inexistente'
          : action === AUDIT_EVENTS.ALERT_ACKNOWLEDGED
          ? 'acknowledged ≠ acción completada'
          : 'alerta orientativa para gestión interna',
      } as any,
    }]);
  } catch (err) {
    // Audit failure should not block operation
    console.warn('[useProactiveAlerts] audit log failed:', err);
  }
}

export default useProactiveAlerts;
