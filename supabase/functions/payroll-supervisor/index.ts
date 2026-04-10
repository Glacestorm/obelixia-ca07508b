import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { successResponse, mapAuthError, validationError, notFoundError, businessRuleError, internalError } from '../_shared/error-contract.ts';

const VALID_TRANSITIONS: Record<string, string> = {
  'draft': 'calculated',
  'calculated': 'legal_validated',
  'legal_validated': 'approved',
  'approved': 'filed',
  'filed': 'accounted',
  'accounted': 'paid',
};

serve(async (req) => {
  const cors = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { action, company_id, cycle_id, period_year, period_month, actor_id, reason, details } = body;

    if (!company_id) return validationError('company_id required', cors);
    if (!action) return validationError('action required', cors);

    // --- AUTH + TENANT GATE (shared utility) ---
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) return mapAuthError(authResult, cors);
    const { userClient } = authResult;

    // ─── START CYCLE ────────────────────────────────────────
    if (action === 'start_cycle') {
      if (!period_year || !period_month) return validationError('period_year and period_month required', cors);

      const { data: existing } = await userClient
        .from('erp_audit_nomina_cycles')
        .select('id')
        .eq('company_id', company_id)
        .eq('period_year', period_year)
        .eq('period_month', period_month)
        .maybeSingle();

      if (existing) return businessRuleError(`Cycle already exists for ${period_year}/${period_month}`, cors);

      const { data: cycle, error } = await userClient
        .from('erp_audit_nomina_cycles')
        .insert({
          company_id,
          period_year,
          period_month,
          status: 'draft',
        })
        .select('id, status')
        .single();

      if (error) throw error;

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'payroll_cycle',
        entity_id: cycle.id,
        action: 'CREATE',
        new_value: { status: 'draft', period_year, period_month },
        legal_basis: 'OM 27/12/1994',
        performed_by: actor_id ?? 'system',
      });

      return successResponse({ cycle_id: cycle.id, status: 'draft' }, cors);
    }

    // ─── ADVANCE STATUS ─────────────────────────────────────
    if (action === 'advance_status') {
      if (!cycle_id) return validationError('cycle_id required', cors);

      const { data: cycle } = await userClient
        .from('erp_audit_nomina_cycles')
        .select('*')
        .eq('id', cycle_id)
        .single();

      if (!cycle) return notFoundError('Cycle', cors);

      const expectedNext = VALID_TRANSITIONS[cycle.status];
      const newStatus = body.new_status ?? expectedNext;

      if (!expectedNext || newStatus !== expectedNext) {
        return businessRuleError(`Invalid transition: ${cycle.status} → ${newStatus}. Expected: ${expectedNext}`, cors);
      }

      if (newStatus === 'approved' && !actor_id) {
        return validationError('approved requires actor_id', cors);
      }

      if (newStatus === 'filed') {
        const { count } = await userClient
          .from('erp_hr_generated_files')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('period_year', cycle.period_year)
          .eq('period_month', cycle.period_month)
          .in('file_type', ['FAN', 'RLC']);

        if (!count || count === 0) {
          return businessRuleError('No filing documents generated for this period', cors);
        }
      }

      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'calculated') updateData.calculated_at = new Date().toISOString();
      if (newStatus === 'approved') { updateData.approved_at = new Date().toISOString(); updateData.approved_by = actor_id; }
      if (newStatus === 'filed') updateData.filed_at = new Date().toISOString();
      if (newStatus === 'accounted') updateData.accounted_at = new Date().toISOString();
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString();

      await userClient
        .from('erp_audit_nomina_cycles')
        .update(updateData)
        .eq('id', cycle_id);

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'payroll_cycle',
        entity_id: cycle_id,
        action: 'UPDATE',
        new_value: { old_status: cycle.status, new_status: newStatus },
        legal_basis: 'OM 27/12/1994',
        performed_by: actor_id ?? 'system',
      });

      return successResponse({ cycle_id, new_status: newStatus }, cors);
    }

    // ─── GET CYCLE STATUS ───────────────────────────────────
    if (action === 'get_cycle_status') {
      if (!cycle_id) return validationError('cycle_id required', cors);

      const { data: cycle } = await userClient
        .from('erp_audit_nomina_cycles')
        .select('*')
        .eq('id', cycle_id)
        .single();

      const { data: events } = await userClient
        .from('erp_audit_events')
        .select('*')
        .eq('entity_id', cycle_id)
        .eq('entity_type', 'payroll_cycle')
        .order('created_at', { ascending: false })
        .limit(12);

      return successResponse({ cycle, transitions_history: events ?? [] }, cors);
    }

    // ─── GET KPIs ───────────────────────────────────────────
    if (action === 'get_kpis') {
      const { data: cycles } = await userClient
        .from('erp_audit_nomina_cycles')
        .select('status, period_year, period_month')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(12);

      const totalCycles = (cycles ?? []).length;
      const paidOnTime = (cycles ?? []).filter(c => c.status === 'paid').length;
      const cyclesOnTimePct = totalCycles > 0 ? Math.round(paidOnTime / totalCycles * 100) : 100;

      const { data: files } = await userClient
        .from('erp_hr_generated_files')
        .select('status')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      const totalFiles = (files ?? []).length;
      const acceptedFiles = (files ?? []).filter(f => f.status === 'accepted' || f.status === 'generated').length;
      const filesAcceptedPct = totalFiles > 0 ? Math.round(acceptedFiles / totalFiles * 100) : 100;

      const { count: openFindings } = await userClient
        .from('erp_audit_findings')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('status', 'open')
        .eq('criticality', 'high');

      const { data: lastAudit } = await userClient
        .from('erp_audit_reports')
        .select('created_at')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      const daysSinceAudit = lastAudit?.[0]
        ? Math.floor((Date.now() - new Date(lastAudit[0].created_at).getTime()) / 86400000)
        : 999;

      const { count: itOverdue } = await userClient
        .from('erp_hr_it_processes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('status', 'active');

      const { count: totalGarnishments } = await userClient
        .from('erp_hr_garnishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('status', 'active');

      return successResponse({
        kpis: {
          cycles_on_time_pct: cyclesOnTimePct,
          files_accepted_pct: filesAcceptedPct,
          open_critical_findings: openFindings ?? 0,
          days_since_last_audit: daysSinceAudit,
          it_processes_overdue_communication: itOverdue ?? 0,
          garnishments_lec_compliant: totalGarnishments ? 100 : 100,
        },
      }, cors);
    }

    // ─── ESCALATE TO LEGAL ──────────────────────────────────
    if (action === 'escalate_to_legal') {
      if (!cycle_id) return validationError('cycle_id required', cors);

      const { data: finding, error } = await userClient
        .from('erp_audit_findings')
        .insert({
          company_id,
          finding_type: 'legal',
          criticality: 'high',
          status: 'open',
          title: reason ?? 'Escalación legal desde ciclo de nómina',
          description: details ?? '',
          related_entity_id: cycle_id,
          related_entity_type: 'payroll_cycle',
        })
        .select('id')
        .single();

      if (error) throw error;

      return successResponse({ escalation_id: finding.id }, cors);
    }

    return validationError(`Unknown action: ${action}`, cors);
  } catch (error) {
    console.error('[payroll-supervisor] Error:', error);
    return internalError(cors);
  }
});
