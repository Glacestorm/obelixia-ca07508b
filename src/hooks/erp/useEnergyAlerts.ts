import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

export interface EnergyAlert {
  id: string;
  type: 'contract_expiry' | 'proposal_stale' | 'missing_docs' | 'workflow_stalled' | 'pending_review';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  caseId: string;
  caseTitle: string;
  daysOverdue?: number;
}

export function useEnergyAlerts(companyId: string) {
  const [alerts, setAlerts] = useState<EnergyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeAlerts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    const result: EnergyAlert[] = [];
    const seen = new Set<string>(); // deduplication by id
    const now = new Date();

    const addAlert = (alert: EnergyAlert) => {
      if (!seen.has(alert.id)) {
        seen.add(alert.id);
        result.push(alert);
      }
    };

    try {
      const { data: cases, error: casesErr } = await supabase
        .from('energy_cases')
        .select('id, title, status, contract_end_date, created_at')
        .eq('company_id', companyId)
        .not('status', 'in', '("completed","cancelled")');

      if (casesErr) throw casesErr;
      if (!cases || cases.length === 0) { setAlerts([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);

      const [checklistRes, workflowRes, proposalRes] = await Promise.all([
        supabase.from('energy_checklists').select('case_id, checked').in('case_id', caseIds),
        supabase.from('energy_workflow_states').select('case_id, status, changed_at').in('case_id', caseIds).order('changed_at', { ascending: false }),
        supabase.from('energy_proposals').select('case_id, status, issued_at, valid_until').in('case_id', caseIds),
      ]);

      for (const c of cases) {
        // 1. Contract expiry (<90 days or expired)
        if (c.contract_end_date) {
          const daysLeft = differenceInDays(new Date(c.contract_end_date), now);
          if (daysLeft <= 0) {
            addAlert({
              id: `expired-${c.id}`,
              type: 'contract_expiry',
              severity: 'critical',
              title: `Contrato vencido hace ${Math.abs(daysLeft)} días`,
              description: c.title,
              caseId: c.id, caseTitle: c.title,
              daysOverdue: daysLeft,
            });
          } else if (daysLeft <= 90) {
            addAlert({
              id: `expiry-${c.id}`,
              type: 'contract_expiry',
              severity: daysLeft <= 30 ? 'critical' : daysLeft <= 60 ? 'high' : 'medium',
              title: `Contrato vence en ${daysLeft} días`,
              description: c.title,
              caseId: c.id, caseTitle: c.title,
              daysOverdue: daysLeft,
            });
          }
        }

        // 2. Missing docs (checklist < 50% after 7 days)
        const caseChecklist = (checklistRes.data || []).filter(cl => cl.case_id === c.id);
        if (caseChecklist.length > 0) {
          const checked = caseChecklist.filter(cl => cl.checked).length;
          const pct = checked / caseChecklist.length;
          const daysSinceCreation = differenceInDays(now, new Date(c.created_at));
          if (pct < 0.5 && daysSinceCreation > 7) {
            addAlert({
              id: `docs-${c.id}`,
              type: 'missing_docs',
              severity: pct < 0.25 ? 'high' : 'medium',
              title: `Documentación incompleta (${Math.round(pct * 100)}%)`,
              description: c.title,
              caseId: c.id, caseTitle: c.title,
            });
          }
        }

        // 3. Workflow stalled (>15 days same non-terminal status)
        const caseWorkflow = (workflowRes.data || []).filter(w => w.case_id === c.id);
        if (caseWorkflow.length > 0) {
          const latest = caseWorkflow[0];
          const daysSinceChange = differenceInDays(now, new Date(latest.changed_at));
          if (daysSinceChange > 15 && !['cerrado', 'cancelado'].includes(latest.status)) {
            addAlert({
              id: `stalled-${c.id}`,
              type: 'workflow_stalled',
              severity: daysSinceChange > 30 ? 'high' : 'medium',
              title: `Trámite estancado ${daysSinceChange} días`,
              description: c.title,
              caseId: c.id, caseTitle: c.title,
              daysOverdue: daysSinceChange,
            });
          }
        }

        // 4. Stale/expired proposals — one alert per case, not per proposal
        const caseProposals = (proposalRes.data || []).filter(p => p.case_id === c.id);
        let hasExpiredAlert = false;
        for (const p of caseProposals) {
          // Expired proposal takes priority
          if (['issued', 'sent'].includes(p.status) && p.valid_until && new Date(p.valid_until) < now) {
            if (!hasExpiredAlert) {
              addAlert({
                id: `expired-proposal-${c.id}`,
                type: 'proposal_stale',
                severity: 'high',
                title: 'Propuesta caducada',
                description: c.title,
                caseId: c.id, caseTitle: c.title,
              });
              hasExpiredAlert = true;
            }
          } else if (['issued', 'sent'].includes(p.status) && p.issued_at) {
            const daysSinceIssued = differenceInDays(now, new Date(p.issued_at));
            if (daysSinceIssued > 10 && !hasExpiredAlert) {
              addAlert({
                id: `stale-proposal-${c.id}`,
                type: 'proposal_stale',
                severity: daysSinceIssued > 20 ? 'high' : 'medium',
                title: `Propuesta sin respuesta ${daysSinceIssued} días`,
                description: c.title,
                caseId: c.id, caseTitle: c.title,
                daysOverdue: daysSinceIssued,
              });
            }
          }
        }

        // 5. Pending first invoice review
        if (caseWorkflow.length > 0) {
          const latest = caseWorkflow[0];
          if (latest.status === 'primera_factura_recibida') {
            const daysSince = differenceInDays(now, new Date(latest.changed_at));
            if (daysSince > 5) {
              addAlert({
                id: `review-${c.id}`,
                type: 'pending_review',
                severity: daysSince > 15 ? 'high' : 'medium',
                title: `Revisión 1ª factura pendiente ${daysSince} días`,
                description: c.title,
                caseId: c.id, caseTitle: c.title,
                daysOverdue: daysSince,
              });
            }
          }
        }
      }

      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      setAlerts(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al calcular alertas';
      setError(msg);
      console.error('[useEnergyAlerts] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { computeAlerts(); }, [computeAlerts]);

  return { alerts, loading, error, refresh: computeAlerts };
}
