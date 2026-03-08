import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const notifications: { company_id: string; case_id: string | null; type: string; severity: string; title: string; message: string }[] = [];

    // 1. Contracts expiring in <= 30 days
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const { data: expiringCases } = await supabase
      .from('energy_cases')
      .select('id, company_id, title, contract_end_date')
      .not('status', 'in', '("completed","cancelled")')
      .lte('contract_end_date', in30.toISOString())
      .gte('contract_end_date', now.toISOString());

    for (const c of expiringCases || []) {
      const daysLeft = Math.round((new Date(c.contract_end_date).getTime() - now.getTime()) / 86400000);
      notifications.push({
        company_id: c.company_id,
        case_id: c.id,
        type: 'contract_expiry',
        severity: daysLeft <= 7 ? 'critical' : daysLeft <= 15 ? 'high' : 'medium',
        title: `Contrato vence en ${daysLeft} días`,
        message: `Expediente "${c.title}" requiere atención urgente.`,
      });
    }

    // 2. Expired proposals
    const { data: expiredProposals } = await supabase
      .from('energy_proposals')
      .select('id, case_id, version, valid_until')
      .in('status', ['issued', 'sent'])
      .lt('valid_until', now.toISOString());

    if (expiredProposals && expiredProposals.length > 0) {
      // Get case info
      const caseIds = [...new Set(expiredProposals.map(p => p.case_id))];
      const { data: caseInfo } = await supabase.from('energy_cases').select('id, company_id, title').in('id', caseIds);
      const caseMap = new Map((caseInfo || []).map(c => [c.id, c]));

      for (const p of expiredProposals) {
        const c = caseMap.get(p.case_id);
        if (!c) continue;
        notifications.push({
          company_id: c.company_id,
          case_id: c.id,
          type: 'proposal_expired',
          severity: 'high',
          title: `Propuesta v${p.version} caducada`,
          message: `La propuesta del expediente "${c.title}" ha caducado.`,
        });

        // Auto-expire in DB
        await supabase.from('energy_proposals')
          .update({ status: 'expired', updated_at: now.toISOString() })
          .eq('id', p.id);
      }
    }

    // 3. Stalled workflows (>15 days)
    const { data: allWorkflows } = await supabase
      .from('energy_workflow_states')
      .select('case_id, status, changed_at')
      .order('changed_at', { ascending: false });

    const latestByCase = new Map<string, { status: string; changed_at: string }>();
    for (const w of allWorkflows || []) {
      if (!latestByCase.has(w.case_id)) {
        latestByCase.set(w.case_id, { status: w.status, changed_at: w.changed_at });
      }
    }

    const stalledCaseIds: string[] = [];
    for (const [caseId, wf] of latestByCase) {
      if (['cerrado', 'cancelado'].includes(wf.status)) continue;
      const daysSince = Math.round((now.getTime() - new Date(wf.changed_at).getTime()) / 86400000);
      if (daysSince > 15) stalledCaseIds.push(caseId);
    }

    if (stalledCaseIds.length > 0) {
      const { data: stalledCases } = await supabase.from('energy_cases')
        .select('id, company_id, title')
        .in('id', stalledCaseIds);
      for (const c of stalledCases || []) {
        const wf = latestByCase.get(c.id)!;
        const days = Math.round((now.getTime() - new Date(wf.changed_at).getTime()) / 86400000);
        notifications.push({
          company_id: c.company_id,
          case_id: c.id,
          type: 'workflow_stalled',
          severity: days > 30 ? 'high' : 'medium',
          title: `Trámite estancado ${days} días`,
          message: `El expediente "${c.title}" necesita seguimiento.`,
        });
      }
    }

    // Deduplicate: don't insert if same type+case_id notification exists in last 24h
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const { data: recentNotifs } = await supabase
      .from('energy_notifications')
      .select('type, case_id')
      .gte('created_at', yesterday);

    const recentKeys = new Set((recentNotifs || []).map(n => `${n.type}-${n.case_id}`));

    const toInsert = notifications.filter(n => !recentKeys.has(`${n.type}-${n.case_id}`));

    if (toInsert.length > 0) {
      await supabase.from('energy_notifications').insert(toInsert);
    }

    console.log(`[energy-notifications] Processed: ${notifications.length} total, ${toInsert.length} new`);

    return new Response(JSON.stringify({
      success: true,
      processed: notifications.length,
      inserted: toInsert.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[energy-notifications] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
