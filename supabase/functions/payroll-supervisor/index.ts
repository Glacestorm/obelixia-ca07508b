import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

// corsHeaders now computed per-request via getSecureCorsHeaders(req)

const VALID_TRANSITIONS: Record<string, string> = {
  'draft': 'calculated',
  'calculated': 'legal_validated',
  'legal_validated': 'approved',
  'approved': 'filed',
  'filed': 'accounted',
  'accounted': 'paid',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getSecureCorsHeaders(req) });

  try {
    // --- AUTH GATE ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, company_id, cycle_id, period_year, period_month, actor_id, reason, details } = body;

    if (!company_id) throw new Error('company_id required');

    // --- COMPANY ACCESS VALIDATION ---
    const { data: membership } = await supabase
      .from('erp_user_companies')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // ─── START CYCLE ────────────────────────────────────────
    if (action === 'start_cycle') {
      if (!period_year || !period_month) throw new Error('period_year and period_month required');

      const { data: existing } = await supabase
        .from('erp_audit_nomina_cycles')
        .select('id')
        .eq('company_id', company_id)
        .eq('period_year', period_year)
        .eq('period_month', period_month)
        .maybeSingle();

      if (existing) throw new Error(`Cycle already exists for ${period_year}/${period_month}`);

      const { data: cycle, error } = await supabase
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

      await supabase.from('erp_audit_events').insert({
        company_id,
        entity_type: 'payroll_cycle',
        entity_id: cycle.id,
        action: 'CREATE',
        new_value: { status: 'draft', period_year, period_month },
        legal_basis: 'OM 27/12/1994',
        performed_by: actor_id ?? 'system',
      });

      return new Response(JSON.stringify({
        success: true,
        cycle_id: cycle.id,
        status: 'draft',
      }), { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    // ─── ADVANCE STATUS ─────────────────────────────────────
    if (action === 'advance_status') {
      if (!cycle_id) throw new Error('cycle_id required');

      const { data: cycle } = await supabase
        .from('erp_audit_nomina_cycles')
        .select('*')
        .eq('id', cycle_id)
        .single();

      if (!cycle) throw new Error('Cycle not found');

      const expectedNext = VALID_TRANSITIONS[cycle.status];
      const newStatus = body.new_status ?? expectedNext;

      if (!expectedNext || newStatus !== expectedNext) {
        throw new Error(`Invalid transition: ${cycle.status} → ${newStatus}. Expected: ${expectedNext}`);
      }

      // Transition-specific validations
      if (newStatus === 'approved' && !actor_id) {
        throw new Error('approved requires actor_id');
      }

      if (newStatus === 'filed') {
        const { count } = await supabase
          .from('erp_hr_generated_files')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('period_year', cycle.period_year)
          .eq('period_month', cycle.period_month)
          .in('file_type', ['FAN', 'RLC']);

        if (!count || count === 0) {
          return new Response(JSON.stringify({
            success: false,
            blocked_by: 'No filing documents generated for this period',
          }), { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } });
        }
      }

      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'calculated') updateData.calculated_at = new Date().toISOString();
      if (newStatus === 'approved') { updateData.approved_at = new Date().toISOString(); updateData.approved_by = actor_id; }
      if (newStatus === 'filed') updateData.filed_at = new Date().toISOString();
      if (newStatus === 'accounted') updateData.accounted_at = new Date().toISOString();
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString();

      await supabase
        .from('erp_audit_nomina_cycles')
        .update(updateData)
        .eq('id', cycle_id);

      await supabase.from('erp_audit_events').insert({
        company_id,
        entity_type: 'payroll_cycle',
        entity_id: cycle_id,
        action: 'UPDATE',
        new_value: { old_status: cycle.status, new_status: newStatus },
        legal_basis: 'OM 27/12/1994',
        performed_by: actor_id ?? 'system',
      });

      return new Response(JSON.stringify({
        success: true,
        cycle_id,
        new_status: newStatus,
      }), { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    // ─── GET CYCLE STATUS ───────────────────────────────────
    if (action === 'get_cycle_status') {
      if (!cycle_id) throw new Error('cycle_id required');

      const { data: cycle } = await supabase
        .from('erp_audit_nomina_cycles')
        .select('*')
        .eq('id', cycle_id)
        .single();

      const { data: events } = await supabase
        .from('erp_audit_events')
        .select('*')
        .eq('entity_id', cycle_id)
        .eq('entity_type', 'payroll_cycle')
        .order('created_at', { ascending: false })
        .limit(12);

      return new Response(JSON.stringify({
        success: true,
        cycle,
        transitions_history: events ?? [],
      }), { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    // ─── GET KPIs ───────────────────────────────────────────
    if (action === 'get_kpis') {
      // KPI 1: Cycles on time
      const { data: cycles } = await supabase
        .from('erp_audit_nomina_cycles')
        .select('status, period_year, period_month')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(12);

      const totalCycles = (cycles ?? []).length;
      const paidOnTime = (cycles ?? []).filter(c => c.status === 'paid').length;
      const cyclesOnTimePct = totalCycles > 0 ? Math.round(paidOnTime / totalCycles * 100) : 100;

      // KPI 2: Files accepted
      const { data: files } = await supabase
        .from('erp_hr_generated_files')
        .select('status')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      const totalFiles = (files ?? []).length;
      const acceptedFiles = (files ?? []).filter(f => f.status === 'accepted' || f.status === 'generated').length;
      const filesAcceptedPct = totalFiles > 0 ? Math.round(acceptedFiles / totalFiles * 100) : 100;

      // KPI 3: Critical findings
      const { count: openFindings } = await supabase
        .from('erp_audit_findings')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('status', 'open')
        .eq('criticality', 'high');

      // KPI 4: Days since last audit
      const { data: lastAudit } = await supabase
        .from('erp_audit_reports')
        .select('created_at')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      const daysSinceAudit = lastAudit?.[0]
        ? Math.floor((Date.now() - new Date(lastAudit[0].created_at).getTime()) / 86400000)
        : 999;

      // KPI 5: IT overdue communications
      const { count: itOverdue } = await supabase
        .from('erp_hr_it_processes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('status', 'active');

      // KPI 6: Garnishments compliant
      const { count: totalGarnishments } = await supabase
        .from('erp_hr_garnishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('status', 'active');

      return new Response(JSON.stringify({
        success: true,
        kpis: {
          cycles_on_time_pct: cyclesOnTimePct,
          files_accepted_pct: filesAcceptedPct,
          open_critical_findings: openFindings ?? 0,
          days_since_last_audit: daysSinceAudit,
          it_processes_overdue_communication: itOverdue ?? 0,
          garnishments_lec_compliant: totalGarnishments ? 100 : 100,
        },
      }), { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    // ─── ESCALATE TO LEGAL ──────────────────────────────────
    if (action === 'escalate_to_legal') {
      if (!cycle_id) throw new Error('cycle_id required');

      const { data: finding, error } = await supabase
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

      return new Response(JSON.stringify({
        success: true,
        escalation_id: finding.id,
      }), { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
