/**
 * useEnergySmartActions - Energy 360 smart action engine
 * Supports electricity, gas, solar and combined energy scenarios
 */
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
        .select('id, title, status, contract_end_date, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, energy_type, risk_level, created_at')
        .eq('company_id', companyId)
        .not('status', 'in', '("completed","cancelled")');

      if (!cases || cases.length === 0) { setActions([]); setLoading(false); return; }
      const caseIds = cases.map(c => c.id);

      const [proposalRes, workflowRes, checklistRes, solarRes, contractsRes] = await Promise.all([
        supabase.from('energy_proposals').select('case_id, status, valid_until').in('case_id', caseIds),
        supabase.from('energy_workflow_states').select('case_id, status, changed_at').in('case_id', caseIds).order('changed_at', { ascending: false }),
        supabase.from('energy_checklists').select('case_id, checked').in('case_id', caseIds),
        supabase.from('energy_solar_installations').select('case_id, installed_power_kwp, annual_compensation_eur, grid_dependency_pct, monthly_estimated_savings, monthly_real_savings').in('case_id', caseIds),
        supabase.from('energy_contracts').select('case_id, energy_type, end_date, has_permanence, gas_tariff').in('case_id', caseIds),
      ]);

      const newActions: Omit<SmartAction, 'id' | 'created_at'>[] = [];

      for (const c of cases as any[]) {
        const caseProposals = (proposalRes.data || []).filter(p => p.case_id === c.id);
        const caseWorkflow = (workflowRes.data || []).filter(w => w.case_id === c.id);
        const caseChecklist = (checklistRes.data || []).filter(cl => cl.case_id === c.id);
        const caseSolar = (solarRes.data || []).filter(s => s.case_id === c.id) as any[];
        const caseContracts = (contractsRes.data || []).filter(ct => ct.case_id === c.id) as any[];
        const latestWf = caseWorkflow[0];

        // 1. No proposal yet
        const hasActiveProposal = caseProposals.some(p => ['draft', 'issued', 'sent', 'accepted'].includes(p.status));
        if (!hasActiveProposal && c.status !== 'draft') {
          newActions.push({
            case_id: c.id, company_id: companyId,
            action_type: 'send_proposal', title: `Crear propuesta: ${c.title}`,
            description: 'El expediente no tiene propuesta activa.',
            priority: 90, urgency: 'high', risk_level: 'medium',
            estimated_savings: (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0),
            is_completed: false, completed_at: null, completed_by: null, metadata: { energy_type: c.energy_type },
          });
        }

        // 2. Contract expiring (electricity or gas)
        if (c.contract_end_date) {
          const daysLeft = differenceInDays(new Date(c.contract_end_date), now);
          if (daysLeft > 0 && daysLeft <= 60) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'renew_contract',
              title: `Contrato ${c.energy_type === 'gas' ? 'gas' : 'elec.'} vence en ${daysLeft}d: ${c.title}`,
              description: `Actuar con urgencia para negociar mejores condiciones.`,
              priority: daysLeft <= 30 ? 98 : 85, urgency: daysLeft <= 30 ? 'critical' : 'high',
              risk_level: daysLeft <= 15 ? 'critical' : 'high',
              estimated_savings: (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0),
              is_completed: false, completed_at: null, completed_by: null,
              metadata: { daysLeft, energy_type: c.energy_type },
            });
          }
        }

        // 3. Gas contract expiring separately
        const gasContracts = caseContracts.filter(ct => ct.energy_type === 'gas' && ct.end_date);
        for (const gc of gasContracts) {
          const daysLeft = differenceInDays(new Date(gc.end_date), now);
          if (daysLeft > 0 && daysLeft <= 45) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'renew_gas_contract',
              title: `Contrato gas vence en ${daysLeft}d: ${c.title}`,
              description: `Revisar tarifa de gas y negociar renovación.`,
              priority: daysLeft <= 20 ? 95 : 82, urgency: daysLeft <= 20 ? 'critical' : 'high',
              risk_level: 'high', estimated_savings: c.estimated_gas_savings || null,
              is_completed: false, completed_at: null, completed_by: null,
              metadata: { daysLeft, contractId: gc.case_id },
            });
          }
        }

        // 4. Workflow stalled
        if (latestWf && !['cerrado', 'cancelado'].includes(latestWf.status)) {
          const stalledDays = differenceInDays(now, new Date(latestWf.changed_at));
          if (stalledDays > 10) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'unblock_case',
              title: `Desbloquear: ${c.title} (${stalledDays}d sin movimiento)`,
              description: `El workflow está en "${latestWf.status}" sin avance.`,
              priority: stalledDays > 20 ? 92 : 75, urgency: stalledDays > 20 ? 'high' : 'medium',
              risk_level: 'medium', estimated_savings: null,
              is_completed: false, completed_at: null, completed_by: null,
              metadata: { stalledDays, currentStatus: latestWf.status },
            });
          }
        }

        // 5. Incomplete checklist
        if (caseChecklist.length > 0) {
          const checked = caseChecklist.filter(cl => cl.checked).length;
          const pct = checked / caseChecklist.length;
          if (pct < 0.5) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'collect_docs',
              title: `Documentación incompleta: ${c.title}`,
              description: `Solo ${Math.round(pct * 100)}% completado.`,
              priority: 80, urgency: 'medium', risk_level: 'low',
              estimated_savings: null, is_completed: false, completed_at: null, completed_by: null,
              metadata: { completionPct: pct },
            });
          }
        }

        // 6. First invoice review
        if (latestWf?.status === 'primera_factura_recibida') {
          const daysSince = differenceInDays(now, new Date(latestWf.changed_at));
          if (daysSince > 3) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'review_invoice',
              title: `Revisar 1ª factura: ${c.title}`,
              description: `Pendiente ${daysSince} días de revisión.`,
              priority: 85, urgency: daysSince > 10 ? 'high' : 'medium',
              risk_level: 'low', estimated_savings: null,
              is_completed: false, completed_at: null, completed_by: null,
              metadata: { daysSince },
            });
          }
        }

        // 7. Solar - poor surplus compensation
        for (const solar of caseSolar) {
          if (solar.annual_compensation_eur > 0 && solar.installed_power_kwp > 3) {
            const compensationPerKwp = solar.annual_compensation_eur / solar.installed_power_kwp;
            if (compensationPerKwp < 30) {
              newActions.push({
                case_id: c.id, company_id: companyId,
                action_type: 'review_solar_compensation',
                title: `Mala compensación excedentes: ${c.title}`,
                description: `Compensación de ${compensationPerKwp.toFixed(0)} €/kWp/año. Revisar comercializadora o tarifa.`,
                priority: 78, urgency: 'medium', risk_level: 'medium',
                estimated_savings: solar.installed_power_kwp * 20,
                is_completed: false, completed_at: null, completed_by: null,
                metadata: { compensationPerKwp, power: solar.installed_power_kwp },
              });
            }
          }

          // Solar savings not validated
          if (solar.monthly_estimated_savings > 0 && solar.monthly_real_savings === 0) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'validate_solar_savings',
              title: `Validar ahorro solar: ${c.title}`,
              description: `Instalación de ${solar.installed_power_kwp} kWp sin datos reales. Cargar producción real.`,
              priority: 65, urgency: 'low', risk_level: 'low',
              estimated_savings: solar.monthly_estimated_savings * 12,
              is_completed: false, completed_at: null, completed_by: null,
              metadata: { power: solar.installed_power_kwp },
            });
          }

          // High grid dependency with solar
          if (solar.grid_dependency_pct > 70 && solar.installed_power_kwp > 2) {
            newActions.push({
              case_id: c.id, company_id: companyId,
              action_type: 'review_solar_performance',
              title: `Alta dependencia de red (${solar.grid_dependency_pct}%): ${c.title}`,
              description: `Con ${solar.installed_power_kwp} kWp, la dependencia de red debería ser menor. Evaluar batería o ajustar consumo.`,
              priority: 72, urgency: 'medium', risk_level: 'medium',
              estimated_savings: null, is_completed: false, completed_at: null, completed_by: null,
              metadata: { gridDep: solar.grid_dependency_pct, power: solar.installed_power_kwp },
            });
          }
        }

        // 8. Mixed case without consolidated proposal
        if (c.energy_type === 'mixed' && !hasActiveProposal) {
          newActions.push({
            case_id: c.id, company_id: companyId,
            action_type: 'consolidated_proposal',
            title: `Propuesta consolidada pendiente: ${c.title}`,
            description: `Expediente mixto sin propuesta integral elec+gas+solar.`,
            priority: 88, urgency: 'high', risk_level: 'medium',
            estimated_savings: (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0),
            is_completed: false, completed_at: null, completed_by: null,
            metadata: { energy_type: 'mixed' },
          });
        }

        // 9. High risk, high savings - prioritize
        const totalSavings = (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0);
        if (totalSavings > 5000 && c.risk_level === 'high') {
          newActions.push({
            case_id: c.id, company_id: companyId,
            action_type: 'priority_client',
            title: `Cliente prioritario: ${c.title}`,
            description: `Alto potencial (${totalSavings.toLocaleString()}€/año) con riesgo alto. Acelerar gestión.`,
            priority: 93, urgency: 'high', risk_level: 'high',
            estimated_savings: totalSavings,
            is_completed: false, completed_at: null, completed_by: null,
            metadata: { totalSavings, risk: c.risk_level },
          });
        }
      }

      // Sort by priority desc
      newActions.sort((a, b) => b.priority - a.priority);

      // Deduplicate by case_id + action_type
      const seen = new Set<string>();
      const deduped = newActions.filter(a => {
        const key = `${a.case_id}:${a.action_type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Upsert to DB
      await supabase.from('energy_smart_actions').delete().eq('company_id', companyId).eq('is_completed', false);
      if (deduped.length > 0) {
        await supabase.from('energy_smart_actions').insert(deduped as any);
      }

      setActions(deduped.map((a, i) => ({ ...a, id: `temp-${i}`, created_at: now.toISOString() })) as SmartAction[]);
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
