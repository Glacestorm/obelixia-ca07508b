/**
 * useLastMileMetrics — LM1+LM2: Operational KPIs for official submissions
 *
 * Computes from hr_official_submissions + hr_official_submission_receipts:
 *  - Per-organism: total, accepted, rejected, pending, acceptance ratio
 *  - Average time to receipt
 *  - Current pending queue
 *  - Top recurring errors
 *  - Deadline alerts
 *  - Sandbox/UAT status per organism
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ADAPTER_REGISTRY, computeOrganismReadiness, type ReadinessLevel } from '@/engines/erp/hr/officialAdaptersEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrganismMetrics {
  organism: string;
  organismLabel: string;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  requiresCorrection: number;
  acceptanceRatio: number;
  avgTimeToReceiptHours: number | null;
  readinessLevel: ReadinessLevel;
}

export interface LastMileMetricsSummary {
  organisms: OrganismMetrics[];
  totalSubmissions: number;
  totalPending: number;
  totalRejected: number;
  topErrors: { message: string; count: number; organism: string }[];
  deadlineAlerts: { submissionId: string; organism: string; deadline: string; daysRemaining: number }[];
  blockedByCredentials: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLastMileMetrics(companyId: string) {
  const { data: submissions, isLoading: loadingSubs } = useQuery({
    queryKey: ['last-mile-submissions', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hr_official_submissions')
        .select('id, status, organism, artifact_type, metadata, created_at, updated_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) { console.error('[useLastMileMetrics] subs error:', error); return []; }
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: receipts, isLoading: loadingReceipts } = useQuery({
    queryKey: ['last-mile-receipts', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hr_official_submission_receipts')
        .select('id, submission_id, receipt_type, received_at, metadata')
        .eq('company_id', companyId)
        .order('received_at', { ascending: false });
      if (error) { console.error('[useLastMileMetrics] receipts error:', error); return []; }
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const summary = useMemo((): LastMileMetricsSummary => {
    const subs = (submissions ?? []) as any[];
    const recs = (receipts ?? []) as any[];

    // Build receipt map
    const receiptsBySubmission = new Map<string, any[]>();
    for (const r of recs) {
      const list = receiptsBySubmission.get(r.submission_id) ?? [];
      list.push(r);
      receiptsBySubmission.set(r.submission_id, list);
    }

    // Group by organism
    const organismGroups = new Map<string, any[]>();
    for (const s of subs) {
      const org = s.organism || 'unknown';
      const list = organismGroups.get(org) ?? [];
      list.push(s);
      organismGroups.set(org, list);
    }

    const organisms: OrganismMetrics[] = ADAPTER_REGISTRY.map(adapter => {
      const orgSubs = organismGroups.get(adapter.organism) ?? [];
      const accepted = orgSubs.filter((s: any) => s.status === 'accepted' || s.status === 'confirmed').length;
      const rejected = orgSubs.filter((s: any) => s.status === 'rejected').length;
      const pending = orgSubs.filter((s: any) =>
        ['pending', 'queued', 'submitted', 'processing'].includes(s.status)
      ).length;
      const requiresCorrection = orgSubs.filter((s: any) => s.status === 'requires_correction').length;
      const total = orgSubs.length;

      // Avg time to receipt
      let totalHours = 0;
      let receiptCount = 0;
      for (const s of orgSubs) {
        const subReceipts = receiptsBySubmission.get(s.id);
        if (subReceipts?.length) {
          const firstReceipt = subReceipts[subReceipts.length - 1];
          const diff = new Date(firstReceipt.received_at).getTime() - new Date(s.created_at).getTime();
          totalHours += diff / (1000 * 60 * 60);
          receiptCount++;
        }
      }

      const readiness = computeOrganismReadiness({
        adapter,
        hasCredentials: false,
        hasCertificate: false,
        hasPassedSandbox: false,
        hasPassedUAT: false,
        payloadGenerated: total > 0,
        signatureCompleted: false,
      });

      return {
        organism: adapter.organism,
        organismLabel: adapter.organismLabel,
        total,
        accepted,
        rejected,
        pending,
        requiresCorrection,
        acceptanceRatio: total > 0 ? Math.round((accepted / total) * 100) : 0,
        avgTimeToReceiptHours: receiptCount > 0 ? Math.round(totalHours / receiptCount) : null,
        readinessLevel: readiness,
      };
    });

    // Top errors
    const errorCounts = new Map<string, { count: number; organism: string }>();
    for (const s of subs) {
      const errors = (s.metadata as any)?.correction_errors;
      if (Array.isArray(errors)) {
        for (const e of errors) {
          const key = e.originalMessage || e.message || 'Unknown';
          const existing = errorCounts.get(key);
          if (existing) existing.count++;
          else errorCounts.set(key, { count: 1, organism: s.organism || 'unknown' });
        }
      }
    }
    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Deadline alerts (submissions with response_deadline in metadata)
    const deadlineAlerts: LastMileMetricsSummary['deadlineAlerts'] = [];
    for (const s of subs) {
      const deadline = (s.metadata as any)?.response_deadline;
      if (deadline) {
        const daysRemaining = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7) {
          deadlineAlerts.push({
            submissionId: s.id,
            organism: s.organism || 'unknown',
            deadline,
            daysRemaining,
          });
        }
      }
    }

    return {
      organisms,
      totalSubmissions: subs.length,
      totalPending: organisms.reduce((sum, o) => sum + o.pending, 0),
      totalRejected: organisms.reduce((sum, o) => sum + o.rejected, 0),
      topErrors,
      deadlineAlerts: deadlineAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining),
      blockedByCredentials: ADAPTER_REGISTRY.filter(a => !a.directConnectorAvailable).length,
    };
  }, [submissions, receipts]);

  return {
    summary,
    isLoading: loadingSubs || loadingReceipts,
  };
}
