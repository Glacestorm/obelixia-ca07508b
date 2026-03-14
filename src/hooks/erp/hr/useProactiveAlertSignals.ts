/**
 * useProactiveAlertSignals — V2-ES.8 Tramo 6 Paso 3
 * Signal collector that bridges real data from existing engines
 * into ProactiveAlert signal shapes for the alert engine.
 *
 * Gathers from:
 * - useOfficialReadiness (readiness signals)
 * - useRegulatoryCalendar (deadline signals)
 * - useHRDomainCertificates (certificate signals)
 * - usePreparatorySubmissions (dry-run signals)
 * - usePreRealApproval (approval signals)
 *
 * Does NOT fetch data — consumes hooks already loaded.
 * Zero-fetch pattern for alert evaluation.
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useProactiveAlerts } from '@/hooks/erp/hr/useProactiveAlerts';
import type {
  ReadinessSignal,
  DeadlineSignal,
  CertificateSignal,
  DryRunSignal,
  ApprovalSignal,
} from '@/components/erp/hr/shared/proactiveAlertEngine';
import type { OfficialReadinessSummary } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { RegulatoryCalendarSummary } from '@/components/erp/hr/shared/regulatoryCalendarEngine';
import type { DomainCertificate } from '@/hooks/erp/hr/useHRDomainCertificates';
import { isCertificateExpired } from '@/hooks/erp/hr/useHRDomainCertificates';
import type { PreparatorySubmission } from '@/hooks/erp/hr/usePreparatorySubmissions';
import type { SubmissionApproval } from '@/hooks/erp/hr/usePreRealApproval';

// ─── Signal mappers (pure) ──────────────────────────────────────────────────

export function mapReadinessSignals(summary: OfficialReadinessSummary | null): ReadinessSignal[] {
  if (!summary) return [];
  return summary.connectors.map(c => ({
    connectorId: c.connectorId,
    label: c.label,
    level: c.level,
    percent: c.percent,
    blockerCount: c.blockers.length,
    warningCount: c.warnings.length,
  }));
}

export function mapDeadlineSignals(calendar: RegulatoryCalendarSummary | null): DeadlineSignal[] {
  if (!calendar) return [];
  return calendar.deadlines
    .filter(dl => dl.urgency !== 'ok' && dl.urgency !== 'not_applicable' && dl.urgency !== 'insufficient')
    .map(dl => ({
      id: dl.id,
      domain: dl.domain,
      label: dl.label,
      urgency: dl.urgency,
      daysRemaining: dl.daysRemaining,
      referencePeriod: dl.referencePeriod,
    }));
}

export function mapCertificateSignals(certificates: DomainCertificate[]): CertificateSignal[] {
  return certificates.map(cert => {
    const isExpired = isCertificateExpired(cert);
    let daysUntilExpiry: number | null = null;
    let expiresAt: Date | null = null;

    if (cert.expiration_date) {
      expiresAt = new Date(cert.expiration_date);
      daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: cert.id,
      name: `${cert.domain} — ${cert.certificate_label || cert.certificate_type}`,
      expiresAt,
      isExpired,
      daysUntilExpiry,
    };
  });
}

export function mapDryRunSignals(submissions: PreparatorySubmission[]): DryRunSignal[] {
  return submissions
    .filter(s => s.submission_mode === 'dry_run' && s.status === 'dry_run_executed')
    .map(s => {
      const vr = s.validation_result as Record<string, unknown> | null;
      const errors = (vr?.errors as unknown[])?.length ?? 0;
      const warnings = (vr?.warnings as unknown[])?.length ?? 0;

      return {
        id: s.id,
        domain: s.submission_domain || 'general',
        status: s.status,
        hasErrors: errors > 0,
        hasWarnings: warnings > 0,
        errorCount: errors,
        warningCount: warnings,
        createdAt: new Date(s.created_at),
        submissionId: s.id,
        periodId: (s as any).related_run_id ?? undefined,
      };
    });
}

export function mapApprovalSignals(approvals: SubmissionApproval[]): ApprovalSignal[] {
  return approvals
    .filter(a => a.status === 'pending_approval' || a.status === 'expired')
    .map(a => ({
      id: a.id,
      domain: a.submission_domain || 'general',
      status: a.status,
      requestedAt: new Date(a.requested_at),
      expiresAt: a.expires_at ? new Date(a.expires_at) : null,
      isExpired: a.status === 'expired' || (a.expires_at ? new Date(a.expires_at) < new Date() : false),
      submissionId: a.submission_id,
    }));
}

// ─── Composed hook ──────────────────────────────────────────────────────────

export interface ProactiveAlertSignalsInput {
  readinessSummary: OfficialReadinessSummary | null;
  calendar: RegulatoryCalendarSummary | null;
  certificates: DomainCertificate[];
  submissions: PreparatorySubmission[];
  approvals: SubmissionApproval[];
  userId?: string;
  /** Set to false to disable auto-evaluation */
  enabled?: boolean;
}

/**
 * Hook that collects signals from existing hooks and auto-evaluates proactive alerts.
 * Designed to be called in ReadinessDashboard or OfficialIntegrationsHub
 * where all source data is already loaded.
 */
export function useProactiveAlertSignals(input: ProactiveAlertSignalsInput) {
  const {
    readinessSummary,
    calendar,
    certificates,
    submissions,
    approvals,
    userId,
    enabled = true,
  } = input;

  const alertsHook = useProactiveAlerts();
  const hasEvaluatedRef = useRef(false);

  // Map all signals (memoized)
  const signals = useMemo(() => ({
    readiness: mapReadinessSignals(readinessSummary),
    deadlines: mapDeadlineSignals(calendar),
    certificates: mapCertificateSignals(certificates),
    dryRuns: mapDryRunSignals(submissions),
    approvals: mapApprovalSignals(approvals),
  }), [readinessSummary, calendar, certificates, submissions, approvals]);

  // Compute a fingerprint to detect meaningful data changes
  const signalFingerprint = useMemo(() => {
    const parts = [
      signals.readiness.map(s => `${s.connectorId}:${s.level}:${s.blockerCount}`).join(','),
      signals.deadlines.map(s => `${s.id}:${s.urgency}`).join(','),
      signals.certificates.map(s => `${s.id}:${s.isExpired}:${s.daysUntilExpiry}`).join(','),
      signals.dryRuns.map(s => `${s.id}:${s.hasErrors}`).join(','),
      signals.approvals.map(s => `${s.id}:${s.status}:${s.isExpired}`).join(','),
    ];
    return parts.join('|');
  }, [signals]);

  // Auto-evaluate when signals change (with built-in cooldown from hook)
  useEffect(() => {
    if (!enabled) return;
    // Only evaluate if we have some data to work with
    const hasData = signals.readiness.length > 0 ||
      signals.deadlines.length > 0 ||
      signals.certificates.length > 0 ||
      signals.dryRuns.length > 0 ||
      signals.approvals.length > 0;

    if (!hasData && hasEvaluatedRef.current) return;

    alertsHook.evaluate(signals, {
      persist: true,
      userId,
      forceCooldownBypass: !hasEvaluatedRef.current, // bypass cooldown on first eval
    });
    hasEvaluatedRef.current = true;
  }, [signalFingerprint, enabled]);

  // Manual re-evaluation
  const reevaluate = useCallback(() => {
    return alertsHook.evaluate(signals, {
      persist: true,
      userId,
      forceCooldownBypass: true,
    });
  }, [signals, userId, alertsHook.evaluate]);

  return {
    ...alertsHook,
    signals,
    reevaluate,
  };
}

export default useProactiveAlertSignals;
