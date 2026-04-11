import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { successResponse, mapAuthError, validationError, notFoundError, internalError } from '../_shared/error-contract.ts';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function classifyProcess(estimatedDays: number): string {
  if (estimatedDays < 5) return 'A';
  if (estimatedDays <= 30) return 'B';
  if (estimatedDays <= 60) return 'C';
  return 'D';
}

function calcNextConfirmation(processClass: string, emissionDate: string, partCount: number): string | null {
  switch (processClass) {
    case 'A': return null;
    case 'B': return addDays(emissionDate, 7);
    case 'C': return partCount <= 1 ? addDays(emissionDate, 7) : addDays(emissionDate, 14);
    case 'D': return addDays(emissionDate, 28);
    default: return addDays(emissionDate, 14);
  }
}

serve(async (req) => {
  const cors = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { action, company_id, employee_id, process_id, data } = await req.json();

    if (!company_id) return validationError('company_id required', cors);
    if (!action) return validationError('action required', cors);

    // Auth + tenant isolation via shared utility
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) return mapAuthError(authResult, cors);
    const { userClient } = authResult;

    // ─── CREATE PROCESS ─────────────────────────────────────
    if (action === 'create_process') {
      if (!employee_id || !data) return validationError('employee_id and data required', cors);

      const processClass = classifyProcess(data.estimated_duration_days ?? 30);
      const m365 = addDays(data.start_date, 365);
      const m545 = addDays(data.start_date, 545);

      const { data: proc, error: procErr } = await userClient
        .from('erp_hr_it_processes')
        .insert({
          company_id,
          employee_id,
          process_type: data.process_type ?? 'EC',
          start_date: data.start_date,
          status: 'active',
          process_class: processClass,
          estimated_duration_days: data.estimated_duration_days,
          milestone_365_date: m365,
          milestone_545_date: m545,
          diagnosis_cie10: data.diagnosis_cie10,
          contingency_type: data.contingency_type ?? data.process_type ?? 'EC',
          notes: data.notes,
        })
        .select('id')
        .single();

      if (procErr) throw procErr;

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_it_processes',
        entity_id: proc.id,
        action: 'CREATE',
        new_value: { process_class: processClass, start_date: data.start_date },
        legal_basis: 'RD 625/2014 / LGSS Art. 169',
        performed_by: employee_id,
      });

      return successResponse({
        process_id: proc.id,
        process_class: processClass,
        milestones: { d365: m365, d545: m545 },
      }, cors);
    }

    // ─── ADD PART ────────────────────────────────────────────
    if (action === 'add_part') {
      if (!process_id || !data) return validationError('process_id and data required', cors);

      const { data: proc } = await userClient
        .from('erp_hr_it_processes')
        .select('process_class')
        .eq('id', process_id)
        .single();

      const { count: partCount } = await userClient
        .from('erp_hr_it_parts')
        .select('*', { count: 'exact', head: true })
        .eq('process_id', process_id);

      const nextConf = calcNextConfirmation(proc?.process_class ?? 'C', data.emission_date, partCount ?? 0);
      const compReport = (partCount ?? 0) >= 1 && ((partCount ?? 0) + 1) % 2 === 0;

      const { data: part, error: partErr } = await userClient
        .from('erp_hr_it_parts')
        .insert({
          company_id,
          process_id,
          part_type: data.part_type ?? 'confirmation',
          emission_date: data.emission_date,
          diagnosis_cie10: data.diagnosis_cie10,
          estimated_duration_days: data.estimated_duration_days,
          doctor_name: data.doctor_name,
          health_center: data.health_center,
          next_confirmation_date: nextConf,
          complementary_report_required: compReport,
        })
        .select('id')
        .single();

      if (partErr) throw partErr;

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_it_parts',
        entity_id: part.id,
        action: 'CREATE',
        new_value: { part_type: data.part_type, next_confirmation_date: nextConf },
        legal_basis: 'RD 625/2014 Art. 2 / Orden ISM/2/2023',
        performed_by: employee_id ?? process_id,
      });

      return successResponse({
        part_id: part.id,
        next_confirmation_date: nextConf,
        complementary_report_required: compReport,
      }, cors);
    }

    // ─── CALCULATE BASE ─────────────────────────────────────
    if (action === 'calculate_base') {
      if (!process_id) return validationError('process_id required', cors);

      const { data: proc } = await userClient
        .from('erp_hr_it_processes')
        .select('process_type, employee_id')
        .eq('id', process_id)
        .single();

      if (!proc) return notFoundError('Process', cors);

      const bcPrevMonth = data?.bc_prev_month ?? 2000;
      const extraHoursAnnual = data?.extra_hours_annual ?? 0;
      const daysInMonth = data?.days_in_month ?? 30;
      const pType = proc.process_type ?? 'EC';

      let baseReguladora: number;
      let baseDaily: number;
      let calcMethod: string;

      if (pType === 'AT' || pType === 'EP') {
        baseDaily = (bcPrevMonth + extraHoursAnnual / 365) / daysInMonth;
        baseReguladora = bcPrevMonth;
        calcMethod = 'ATEP: BC + HE anuales/365 / días mes (LGSS Art. 169.2.b)';
      } else if (pType === 'MAT' || pType === 'PAT') {
        baseDaily = bcPrevMonth / daysInMonth;
        baseReguladora = bcPrevMonth;
        calcMethod = 'MATERNIDAD: BC / días mes (LGSS Art. 179)';
      } else {
        baseDaily = bcPrevMonth / daysInMonth;
        baseReguladora = bcPrevMonth;
        calcMethod = 'EC/ANLAB: BC / días mes (LGSS Art. 169.1)';
      }

      baseDaily = Math.round(baseDaily * 100) / 100;

      await userClient.from('erp_hr_it_bases').upsert({
        company_id,
        process_id,
        calculation_date: new Date().toISOString().split('T')[0],
        base_monthly: bcPrevMonth,
        total_base_reguladora: baseReguladora,
        base_daily_ec: pType === 'EC' || pType === 'ANL' ? baseDaily : 0,
        base_daily_at: pType === 'AT' || pType === 'EP' ? baseDaily : 0,
        base_daily_extra_hours: pType === 'AT' || pType === 'EP' ? Math.round((extraHoursAnnual / 365 / daysInMonth) * 100) / 100 : 0,
        calculation_method: calcMethod,
        days_in_period: daysInMonth,
      }, { onConflict: 'process_id' });

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_it_bases',
        entity_id: process_id,
        action: 'CALCULATE',
        new_value: { base_reguladora: baseReguladora, base_daily: baseDaily, method: calcMethod },
        legal_basis: 'LGSS Arts. 169-170',
        performed_by: employee_id ?? process_id,
      });

      return successResponse({
        base_reguladora: baseReguladora,
        base_daily: baseDaily,
        calculation_method: calcMethod,
      }, cors);
    }

    // ─── CHECK MILESTONES ───────────────────────────────────
    if (action === 'check_milestones') {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = addDays(today, 30);

      const { data: processes } = await userClient
        .from('erp_hr_it_processes')
        .select('id, employee_id, process_type, start_date, milestone_365_date, milestone_545_date, milestone_365_notified, milestone_545_notified')
        .eq('company_id', company_id)
        .eq('status', 'active');

      const alerts: Array<{ process_id: string; employee_id: string; milestone: string; date: string; severity: string }> = [];

      for (const p of processes ?? []) {
        if (p.milestone_365_date && p.milestone_365_date <= thirtyDaysFromNow && !p.milestone_365_notified) {
          alerts.push({ process_id: p.id, employee_id: p.employee_id, milestone: '365', date: p.milestone_365_date, severity: p.milestone_365_date <= today ? 'critical' : 'warning' });
        }
        if (p.milestone_545_date && p.milestone_545_date <= thirtyDaysFromNow && !p.milestone_545_notified) {
          alerts.push({ process_id: p.id, employee_id: p.employee_id, milestone: '545', date: p.milestone_545_date, severity: p.milestone_545_date <= today ? 'critical' : 'warning' });
        }
      }

      return successResponse({ alerts, total: alerts.length }, cors);
    }

    // ─── RESOLVE PROCESS ───────────────────────────────────
    if (action === 'resolve_process') {
      if (!process_id) return validationError('process_id required', cors);

      const { data: proc } = await userClient
        .from('erp_hr_it_processes')
        .select('status, employee_id')
        .eq('id', process_id)
        .single();

      if (!proc) return notFoundError('Process', cors);
      if (proc.status === 'closed') return validationError('Process already closed', cors);

      const endDate = data?.end_date ?? new Date().toISOString().split('T')[0];
      const { error: upErr } = await userClient
        .from('erp_hr_it_processes')
        .update({
          status: 'closed',
          end_date: endDate,
          metadata: { pipeline_state: 'closed', resolved_at: new Date().toISOString() },
        })
        .eq('id', process_id);

      if (upErr) throw upErr;

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_it_processes',
        entity_id: process_id,
        action: 'RESOLVE',
        new_value: { end_date: endDate, status: 'closed' },
        legal_basis: 'RD 625/2014 Art. 4',
        performed_by: employee_id ?? process_id,
      });

      return successResponse({ resolved: true, end_date: endDate }, cors);
    }

    // ─── GENERATE FDI ────────────────────────────────────────
    if (action === 'generate_fdi') {
      if (!process_id || !data?.fdi_type) return validationError('process_id and data.fdi_type required', cors);

      const { data: proc } = await userClient
        .from('erp_hr_it_processes')
        .select('process_type, employee_id, start_date, end_date')
        .eq('id', process_id)
        .single();

      if (!proc) return notFoundError('Process', cors);

      const fdiId = `fdi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 8);
      const fileName = `${timestamp}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}.FDI`;

      // Store as official artifact
      const { error: artErr } = await userClient.from('erp_hr_official_artifacts').insert({
        company_id,
        artifact_type: 'fdi',
        artifact_subtype: data.fdi_type,
        reference_entity: 'erp_hr_it_processes',
        reference_id: process_id,
        file_name: fileName,
        file_extension: '.FDI',
        status: 'draft',
        circuit: 'SILTRA_INSS',
        metadata: {
          fdi_type: data.fdi_type,
          process_type: proc.process_type,
          start_date: proc.start_date,
          end_date: proc.end_date,
          generated_at: new Date().toISOString(),
        },
      });

      if (artErr) throw artErr;

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_official_artifacts',
        entity_id: fdiId,
        action: 'GENERATE_FDI',
        new_value: { fdi_type: data.fdi_type, file_name: fileName },
        legal_basis: 'Orden ESS/1187/2015',
        performed_by: employee_id ?? process_id,
      });

      return successResponse({ fdi_id: fdiId, file_name: fileName, status: 'draft' }, cors);
    }

    // ─── REPORTING KPIs ──────────────────────────────────────
    if (action === 'reporting_kpis') {
      const { data: processes } = await userClient
        .from('erp_hr_it_processes')
        .select('id, process_type, status, start_date, end_date, has_relapse')
        .eq('company_id', company_id);

      const active = (processes ?? []).filter((p: any) => p.status === 'active');
      const closed = (processes ?? []).filter((p: any) => p.status === 'closed');
      const relapsed = (processes ?? []).filter((p: any) => p.has_relapse);

      const durations = active.map((p: any) => {
        const start = new Date(p.start_date);
        return Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / durations.length) : 0;

      const byType: Record<string, number> = {};
      for (const p of (processes ?? [])) {
        byType[(p as any).process_type] = (byType[(p as any).process_type] ?? 0) + 1;
      }

      return successResponse({
        total_active: active.length,
        total_closed: closed.length,
        total_relapsed: relapsed.length,
        average_duration_days: avgDuration,
        by_type: byType,
        total_processes: (processes ?? []).length,
      }, cors);
    }

    return validationError(`Unknown action: ${action}`, cors);
  } catch (error) {
    console.error('[payroll-it-engine] Error:', error);
    return internalError(cors);
  }
});
