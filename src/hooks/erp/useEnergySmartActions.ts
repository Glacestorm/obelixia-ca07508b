import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { differenceInDays } from 'date-fns';

export interface SmartAction {
  id: string;
  case_id: string;
  company_id: string;
  action_type: string;
  title: string;
  description: string | null;
  priority: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  risk_level: string | null;
  estimated_savings: number | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_TEMPLATES = {
  send_proposal: { title: 'Enviar propuesta comercial', priority: 90 },
  collect_docs: { title: 'Recopilar documentación pendiente', priority: 80 },
  follow_up: { title: 'Hacer seguimiento del trámite', priority: 70 },
  review_invoice: { title: 'Revisar primera factura', priority: 85 },
  renew_contract: { title: 'Renovar contrato próximo a vencer', priority: 95 },
  unblock_case: { title: 'Desbloquear expediente estancado', priority: 88 },
  validate_savings: { title: 'Validar ahorro real vs estimado', priority: 60 },
};

export function useEnergySmartActions(companyId: string) {
  const [actions, setActions] = useState<SmartAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_smart_actions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_completed', false)
        .order('priority', { ascending: false })
        .limit(50);
      if (error) throw error;
      setActions((data || []) as SmartAction[]);
    } catch (err) {
      console.error('[useEnergySmartActions] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const computeActions = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const now = new Date();
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, title, status, contract_end_date, estimated_annual_savings, created_at')
        .eq('company_id', companyId)
        .not('status', 'in', '("completed","cancelled")');

      if (!cases || cases.length === 0) { setActions([]); setLoading(false); return; }
      const caseIds = cases.map(c => c.id);

      const [proposalRes, workflowRes, checklistRes] = await Promise.all([
        supabase.from('energy_proposals').select('case_id, status, valid_until').in('case_id', caseIds),
        supabase.from('energy_workflow_states').select('case_id, status, changed_at').in('case_id', caseIds).order('changed_at', { ascending: false }),
        supabase.from('energy_checklists').select('case_id, checked').in('case_id', caseIds),
      ]);

      const newActions: Omit<SmartAction, 'id' | 'created_at'>[] = [];

      for (const c of cases) {
        const caseProposals = (proposalRes.data || []).filter(p => p.case_id === c.id);
        const caseWorkflow = (workflowRes.data || []).filter(w => w.case_id === c.id);
        const caseChecklist = (checklistRes.data || []).filter(cl => cl.case_id === c.id);
        const latestWf = caseWorkflow[0];

        // 1. No proposal yet
        const hasActiveProposal = caseProposals.some(p => ['draft', 'issued', 'sent', 'accepted'].includes(p.status));
        if (!hasActiveProposal && c.status !== 'draft') {
          newActions.push({
            case_id: c.id, company_id: companyId,
            action_type: 'send_proposal', title: `Crear propuesta: ${c.title}`,
            description: 'El expediente no tiene propuesta activa.',
            priority: 90, urgency: 'high', risk_level: 'medium',
            estimated_savings: c.estimated_annual_savings, is_completed: false,
            completed_at: null, completed_by: null, metadata: {},
          });
        }

        // 2. Contract expiring
        if (c.contract_end_date) {
          const daysLeft = differenceInDays(new Date(c.contract_end_date), now);
          if (daysLeft > 0 && daysLeft <= 60) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'renew_contract', title: `Contrato vence en ${daysLeft}d: ${c.title}`,
              description: `El contrato expira pronto. Actuar con urgencia.`,
              priority: daysLeft <= 30 ? 98 : 85, urgency: daysLeft <= 30 ? 'critical' : 'high',
              risk_level: daysLeft <= 15 ? 'critical' : 'high',
              estimated_savings: c.estimated_annual_savings, is_completed: false,
              completed_at: null, completed_by: null, metadata: { daysLeft },
            });
          }
        }

        // 3. Workflow stalled
        if (latestWf && !['cerrado', 'cancelado'].includes(latestWf.status)) {
          const stalledDays = differenceInDays(now, new Date(latestWf.changed_at));
          if (stalledDays > 10) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'unblock_case', title: `Desbloquear: ${c.title} (${stalledDays}d)`,
              description: `El workflow lleva ${stalledDays} días sin movimiento.`,
              priority: stalledDays > 20 ? 92 : 75, urgency: stalledDays > 20 ? 'high' : 'medium',
              risk_level: 'medium', estimated_savings: null, is_completed: false,
              completed_at: null, completed_by: null, metadata: { stalledDays, currentStatus: latestWf.status },
            });
          }
        }

        // 4. Incomplete checklist
        if (caseChecklist.length > 0) {
          const checked = caseChecklist.filter(cl => cl.checked).length;
          const pct = checked / caseChecklist.length;
          if (pct < 0.5) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'collect_docs', title: `Documentación incompleta: ${c.title}`,
              description: `Solo ${Math.round(pct * 100)}% completado.`,
              priority: 80, urgency: 'medium', risk_level: 'low',
              estimated_savings: null, is_completed: false,
              completed_at: null, completed_by: null, metadata: { completionPct: pct },
            });
          }
        }

        // 5. First invoice review pending
        if (latestWf?.status === 'primera_factura_recibida') {
          const daysSince = differenceInDays(now, new Date(latestWf.changed_at));
          if (daysSince > 3) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'review_invoice', title: `Revisar 1ª factura: ${c.title}`,
              description: `Pendiente ${daysSince} días de revisión.`,
              priority: 85, urgency: daysSince > 10 ? 'high' : 'medium',
              risk_level: 'low', estimated_savings: null, is_completed: false,
              completed_at: null, completed_by: null, metadata: { daysSince },
            });
          }
        }
      }

      // Sort by priority desc
      newActions.sort((a, b) => b.priority - a.priority);

      // Upsert to DB (clear old uncompleted, insert new)
      await supabase.from('energy_smart_actions')
        .delete()
        .eq('company_id', companyId)
        .eq('is_completed', false);

      if (newActions.length > 0) {
        await supabase.from('energy_smart_actions')
          .insert(newActions as any);
      }

      setActions(newActions.map((a, i) => ({ ...a, id: `temp-${i}`, created_at: now.toISOString() })) as SmartAction[]);
    } catch (err) {
      console.error('[useEnergySmartActions] compute error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const completeAction = useCallback(async (actionId: string) => {
    if (!user?.id) return;
    try {
      await supabase.from('energy_smart_actions')
        .update({ is_completed: true, completed_at: new Date().toISOString(), completed_by: user.id } as any)
        .eq('id', actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (err) {
      console.error('[useEnergySmartActions] complete error:', err);
    }
  }, [user?.id]);

  useEffect(() => { computeActions(); }, [computeActions]);

  return { actions, loading, fetchActions, computeActions, completeAction };
}
