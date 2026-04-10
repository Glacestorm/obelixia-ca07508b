import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, params } = await req.json();

    // S6.3F: company_id is now REQUIRED — closes conditional membership gap
    const targetCompanyId = params?.company_id;
    if (!targetCompanyId) {
      return new Response(JSON.stringify({ success: false, error: 'company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // S6.3F: validateTenantAccess replaces manual auth + service_role
    const authResult = await validateTenantAccess(req, targetCompanyId);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userId, userClient } = authResult;
    // Use userId for audit — replaces user.id from getUser()
    const user = { id: userId, email: '' };

    let result: any;

    switch (action) {
      // ===== LIST DEFINITIONS =====
      case 'list_definitions': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_workflow_definitions')
          .select('*, erp_hr_workflow_steps(*)')
          .eq('company_id', company_id)
          .order('process_type');
        if (error) throw error;
        result = data;
        break;
      }

      // ===== UPSERT DEFINITION =====
      case 'upsert_definition': {
        const { id, steps, ...defData } = params;
        let defId = id;
        if (id) {
          const { data, error } = await userClient.from('erp_hr_workflow_definitions').update({ ...defData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await userClient.from('erp_hr_workflow_definitions').insert({ ...defData, created_by: user.id }).select().single();
          if (error) throw error;
          defId = data.id;
          result = data;
        }
        if (steps && Array.isArray(steps) && defId) {
          await userClient.from('erp_hr_workflow_steps').delete().eq('definition_id', defId);
          if (steps.length > 0) {
            const stepsWithDef = steps.map((s: any, i: number) => ({ ...s, definition_id: defId, step_order: i + 1 }));
            await userClient.from('erp_hr_workflow_steps').insert(stepsWithDef);
          }
        }
        break;
      }

      // ===== START WORKFLOW =====
      case 'start_workflow': {
        const { company_id, process_type, entity_type, entity_id, entity_summary, priority } = params;

        // V2-ES.2 Paso 2: Idempotency
        const { data: existingInstances } = await userClient
          .from('erp_hr_workflow_instances')
          .select('id, status')
          .eq('entity_type', entity_type)
          .eq('entity_id', entity_id)
          .in('status', ['in_progress', 'pending'])
          .limit(1);

        if (existingInstances && existingInstances.length > 0) {
          console.log(`[start_workflow] Idempotent: active instance already exists for ${entity_type}/${entity_id}`);
          result = existingInstances[0];
          break;
        }

        const { data: defs } = await userClient
          .from('erp_hr_workflow_definitions')
          .select('*, erp_hr_workflow_steps(*)')
          .eq('company_id', company_id)
          .eq('process_type', process_type)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1);

        if (!defs?.length) throw new Error(`No active workflow definition for process type: ${process_type}`);
        const def = defs[0];
        const steps = (def.erp_hr_workflow_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);
        if (!steps.length) throw new Error('Workflow has no steps');

        const firstStep = steps[0];

        const { data: instance, error: instErr } = await userClient
          .from('erp_hr_workflow_instances')
          .insert({
            company_id, definition_id: def.id, entity_type, entity_id,
            entity_summary: entity_summary || `${process_type} - ${entity_type}`,
            current_step_id: firstStep.id, current_step_order: 1,
            status: 'in_progress', priority: priority || 'normal',
            started_by: user.id
          })
          .select().single();
        if (instErr) throw instErr;

        const dueAt = new Date(Date.now() + (firstStep.sla_hours || 48) * 3600000);
        const escAt = firstStep.escalation_hours ? new Date(Date.now() + firstStep.escalation_hours * 3600000) : null;
        await userClient.from('erp_hr_workflow_sla_tracking').insert({
          instance_id: instance.id, step_id: firstStep.id,
          assigned_role: firstStep.approver_role,
          assigned_to: firstStep.approver_user_id,
          due_at: dueAt.toISOString(),
          escalation_at: escAt?.toISOString()
        });

        await userClient.rpc('hr_log_audit', {
          _company_id: company_id, _user_id: user.id, _action: 'START_WORKFLOW',
          _table_name: 'erp_hr_workflow_instances', _record_id: instance.id,
          _new_data: instance, _category: 'enterprise', _severity: 'info'
        });

        result = instance;
        break;
      }

      // ===== APPROVE/REJECT STEP =====
      case 'decide_step': {
        const { instance_id, decision, comment } = params;
        const { data: instance } = await userClient.from('erp_hr_workflow_instances').select('*, erp_hr_workflow_definitions(*, erp_hr_workflow_steps(*))').eq('id', instance_id).single();
        if (!instance) throw new Error('Instance not found');
        if (instance.status !== 'in_progress') throw new Error('Workflow is not in progress');

        const steps = (instance.erp_hr_workflow_definitions?.erp_hr_workflow_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);
        const currentStep = steps.find((s: any) => s.id === instance.current_step_id);
        if (!currentStep) throw new Error('Current step not found');

        const { data: dec } = await userClient.from('erp_hr_workflow_decisions').insert({
          instance_id, step_id: currentStep.id, decision, decided_by: user.id,
          comment: comment || null,
          decision_time_seconds: Math.floor((Date.now() - new Date(instance.updated_at).getTime()) / 1000)
        }).select().single();

        await userClient.from('erp_hr_workflow_sla_tracking')
          .update({ completed_at: new Date().toISOString() })
          .eq('instance_id', instance_id).eq('step_id', currentStep.id);

        if (decision === 'rejected' || decision === 'returned') {
          await userClient.from('erp_hr_workflow_instances')
            .update({ status: decision === 'rejected' ? 'rejected' : 'pending', completed_at: decision === 'rejected' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
            .eq('id', instance_id);
        } else if (decision === 'approved') {
          const nextStepOrder = currentStep.step_order + 1;
          const nextStep = steps.find((s: any) => s.step_order === nextStepOrder);

          if (nextStep) {
            await userClient.from('erp_hr_workflow_instances')
              .update({ current_step_id: nextStep.id, current_step_order: nextStepOrder, updated_at: new Date().toISOString() })
              .eq('id', instance_id);

            const dueAt = new Date(Date.now() + (nextStep.sla_hours || 48) * 3600000);
            const escAt = nextStep.escalation_hours ? new Date(Date.now() + nextStep.escalation_hours * 3600000) : null;
            await userClient.from('erp_hr_workflow_sla_tracking').insert({
              instance_id, step_id: nextStep.id,
              assigned_role: nextStep.approver_role,
              assigned_to: nextStep.approver_user_id,
              due_at: dueAt.toISOString(),
              escalation_at: escAt?.toISOString()
            });
          } else {
            await userClient.from('erp_hr_workflow_instances')
              .update({ status: 'approved', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', instance_id);
          }
        }

        await userClient.rpc('hr_log_audit', {
          _company_id: instance.company_id, _user_id: user.id,
          _action: decision.toUpperCase(), _table_name: 'erp_hr_workflow_instances',
          _record_id: instance_id, _category: 'enterprise',
          _severity: decision === 'rejected' ? 'warning' : 'info'
        });

        // V2-ES.2 Paso 1: Reverse sync to hr_payroll_records
        if (instance.entity_type === 'payroll_record' && instance.entity_id) {
          const isLastStep = decision === 'approved' && !steps.find((s: any) => s.step_order === currentStep.step_order + 1);
          const reviewStatusMap: Record<string, string> = {
            approved: isLastStep ? 'approved' : 'reviewed',
            rejected: 'flagged',
            returned: 'flagged',
          };
          const reviewStatus = reviewStatusMap[decision] || 'reviewed';

          try {
            await userClient.from('hr_payroll_records').update({
              review_status: reviewStatus,
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              review_notes: comment || `Decisión workflow: ${decision}`,
            }).eq('id', instance.entity_id);
            console.log(`[decide_step] Synced review_status=${reviewStatus} for payroll_record ${instance.entity_id}`);
          } catch (syncErr) {
            console.warn('[decide_step] Reverse sync to hr_payroll_records failed:', syncErr);
          }
        }

        // V2-ES.2 Paso 2: Reverse sync to hr_admin_requests
        if (instance.entity_type === 'admin_request' && instance.entity_id) {
          const isLastStep = decision === 'approved' && !steps.find((s: any) => s.step_order === currentStep.step_order + 1);
          const adminStatusMap: Record<string, string> = {
            approved: isLastStep ? 'approved' : 'reviewing',
            rejected: 'rejected',
            returned: 'returned',
          };
          const newAdminStatus = adminStatusMap[decision] || 'reviewing';

          try {
            const adminUpdates: Record<string, any> = {
              status: newAdminStatus,
              updated_at: new Date().toISOString(),
            };
            if (newAdminStatus === 'approved' || newAdminStatus === 'rejected') {
              adminUpdates.resolved_at = new Date().toISOString();
              adminUpdates.resolved_by = user.id;
              adminUpdates.resolution = comment || `Decisión workflow: ${decision}`;
            }

            await userClient.from('hr_admin_requests')
              .update(adminUpdates)
              .eq('id', instance.entity_id);

            await userClient.from('hr_admin_request_activity').insert([{
              request_id: instance.entity_id,
              action: `workflow_${decision}`,
              actor_id: user.id,
              actor_name: user.email || 'Workflow Engine',
              old_value: null,
              new_value: newAdminStatus,
              metadata: { workflow_instance_id: instance.id, step: currentStep.name, comment },
            }]);

            console.log(`[decide_step] Synced status=${newAdminStatus} for admin_request ${instance.entity_id}`);
          } catch (syncErr) {
            console.warn('[decide_step] Reverse sync to hr_admin_requests failed:', syncErr);
          }
        }

        result = dec;
        break;
      }

      // ===== DELEGATE =====
      case 'delegate': {
        const delegationData = params;
        const { data, error } = await userClient.from('erp_hr_workflow_delegations')
          .insert({ ...delegationData, delegator_user_id: user.id }).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      // ===== GET INBOX =====
      case 'get_inbox': {
        const { company_id, status_filter } = params;
        let query = userClient
          .from('erp_hr_workflow_instances')
          .select(`
            *,
            erp_hr_workflow_definitions(name, process_type),
            erp_hr_workflow_steps!erp_hr_workflow_instances_current_step_id_fkey(name, step_type, approver_role, sla_hours, comments_required),
            erp_hr_workflow_decisions(id, decision, decided_by, comment, decided_at),
            erp_hr_workflow_sla_tracking(id, due_at, escalation_at, completed_at, breached, escalated)
          `)
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (status_filter && status_filter !== 'all') {
          query = query.eq('status', status_filter);
        }

        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      // ===== GET SLA STATUS =====
      case 'get_sla_status': {
        const { company_id } = params;
        const { data: slaData, error } = await userClient
          .from('erp_hr_workflow_sla_tracking')
          .select(`
            *,
            erp_hr_workflow_instances!inner(company_id, entity_summary, status, erp_hr_workflow_definitions(name, process_type)),
            erp_hr_workflow_steps!inner(name, sla_hours)
          `)
          .eq('erp_hr_workflow_instances.company_id', company_id)
          .is('completed_at', null)
          .order('due_at');
        if (error) throw error;

        const now = new Date();
        const withStatus = (slaData || []).map((s: any) => ({
          ...s,
          is_overdue: new Date(s.due_at) < now,
          is_near_breach: !s.breached && new Date(s.due_at).getTime() - now.getTime() < 4 * 3600000,
          hours_remaining: Math.round((new Date(s.due_at).getTime() - now.getTime()) / 3600000),
        }));

        result = withStatus;
        break;
      }

      // ===== WORKFLOW STATS =====
      case 'get_workflow_stats': {
        const { company_id } = params;
        const [total, pending, approved, rejected, breached] = await Promise.all([
          userClient.from('erp_hr_workflow_instances').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
          userClient.from('erp_hr_workflow_instances').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'in_progress'),
          userClient.from('erp_hr_workflow_instances').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'approved'),
          userClient.from('erp_hr_workflow_instances').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'rejected'),
          userClient.from('erp_hr_workflow_sla_tracking').select('id', { count: 'exact', head: true }).eq('breached', true),
        ]);
        result = {
          total: total.count || 0,
          in_progress: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0,
          sla_breached: breached.count || 0,
        };
        break;
      }

      // ===== SEED WORKFLOWS =====
      case 'seed_workflows': {
        const { company_id } = params;

        const workflows = [
          {
            company_id, name: 'Aprobación de Vacaciones', process_type: 'vacations', description: 'Flujo estándar de solicitud y aprobación de vacaciones',
            steps: [
              { name: 'Aprobación Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 48, escalation_hours: 72, escalation_to_role: 'HR_MANAGER', comments_required: false, delegation_enabled: true },
              { name: 'Validación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24, comments_required: false, delegation_enabled: true },
            ]
          },
          {
            company_id, name: 'Proceso de Contratación', process_type: 'hiring', description: 'Aprobación multinivel para nuevas contrataciones',
            steps: [
              { name: 'Aprobación Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 48, comments_required: true, delegation_enabled: true },
              { name: 'Validación RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, escalation_hours: 96, escalation_to_role: 'HR_DIRECTOR', comments_required: true },
              { name: 'Aprobación Dirección', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 72, comments_required: false, conditions: { salary_above: 40000 } },
            ]
          },
          {
            company_id, name: 'Revisión Salarial', process_type: 'salary_review', description: 'Aprobación de cambios salariales con escalado por importe',
            steps: [
              { name: 'Propuesta Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 72, comments_required: true },
              { name: 'Validación Compensación', step_type: 'approval', approver_role: 'PAYROLL_ADMIN', sla_hours: 48, comments_required: true },
              { name: 'Aprobación RRHH', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48, comments_required: false },
            ]
          },
          {
            company_id, name: 'Offboarding', process_type: 'offboarding', description: 'Proceso de baja de empleado con validación legal',
            steps: [
              { name: 'Confirmación Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 24, comments_required: true },
              { name: 'Validación RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 24, comments_required: true },
              { name: 'Validación Legal', step_type: 'review', approver_role: 'HR_DIRECTOR', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Onboarding', process_type: 'onboarding', description: 'Proceso de alta y bienvenida de nuevo empleado',
            steps: [
              { name: 'Preparación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 48 },
              { name: 'Asignación IT/Equipos', step_type: 'notification', approver_role: 'MANAGER', sla_hours: 72 },
            ]
          },
          {
            company_id, name: 'Promoción', process_type: 'promotion', description: 'Aprobación de promociones internas',
            steps: [
              { name: 'Propuesta Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 72, comments_required: true },
              { name: 'Evaluación Talento', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, comments_required: true },
              { name: 'Aprobación Dirección', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48 },
            ]
          },
          {
            company_id, name: 'Expediente Disciplinario', process_type: 'disciplinary', description: 'Gestión de expedientes con revisión legal obligatoria',
            steps: [
              { name: 'Apertura RRHH', step_type: 'review', approver_role: 'HR_MANAGER', sla_hours: 24, comments_required: true },
              { name: 'Investigación', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 120, comments_required: true },
              { name: 'Validación Legal', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Validación Finiquito', process_type: 'settlement_validation', description: 'Aprobación de cálculo y validación legal de finiquitos',
            steps: [
              { name: 'Cálculo Nóminas', step_type: 'review', approver_role: 'PAYROLL_ADMIN', sla_hours: 24, comments_required: true },
              { name: 'Validación RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 24, comments_required: true },
              { name: 'Aprobación Legal', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Ciclo de Bonus', process_type: 'bonus', description: 'Aprobación de bonus individuales o por equipo',
            steps: [
              { name: 'Propuesta Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 72, comments_required: true },
              { name: 'Validación Compensación', step_type: 'approval', approver_role: 'PAYROLL_ADMIN', sla_hours: 48 },
              { name: 'Aprobación Dirección', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48 },
            ]
          },
          {
            company_id, name: 'Aprobación de Nómina', process_type: 'payroll_approval', description: 'Flujo de revisión y aprobación de nóminas calculadas antes del cierre de período',
            steps: [
              { name: 'Revisión Nóminas', step_type: 'review', approver_role: 'PAYROLL_ADMIN', sla_hours: 48, comments_required: false, delegation_enabled: true },
              { name: 'Aprobación Responsable RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, escalation_hours: 72, escalation_to_role: 'HR_DIRECTOR', comments_required: true, delegation_enabled: true },
            ]
          },
          {
            company_id, name: 'Alta de Empleado (Admin)', process_type: 'admin_employee_registration',
            description: 'Aprobación de solicitud de alta de nuevo empleado desde portal administrativo',
            steps: [
              { name: 'Validación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 48, comments_required: true, delegation_enabled: true },
              { name: 'Aprobación Responsable', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, escalation_hours: 72, escalation_to_role: 'HR_DIRECTOR', comments_required: true },
            ]
          },
          {
            company_id, name: 'Modificación Contractual (Admin)', process_type: 'admin_contract_modification',
            description: 'Aprobación de modificación de contrato desde portal administrativo',
            steps: [
              { name: 'Revisión RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24, comments_required: true },
              { name: 'Aprobación Responsable', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Cambio Salarial (Admin)', process_type: 'admin_salary_change',
            description: 'Aprobación de cambio salarial desde portal administrativo',
            steps: [
              { name: 'Validación Nóminas', step_type: 'review', approver_role: 'PAYROLL_ADMIN', sla_hours: 48, comments_required: true },
              { name: 'Aprobación RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, comments_required: true },
              { name: 'Aprobación Dirección', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 72, comments_required: false },
            ]
          },
          {
            company_id, name: 'Baja de Empleado (Admin)', process_type: 'admin_termination',
            description: 'Aprobación de baja desde portal administrativo',
            steps: [
              { name: 'Validación RRHH', step_type: 'review', approver_role: 'HR_MANAGER', sla_hours: 24, comments_required: true },
              { name: 'Validación Legal', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Finiquito (Admin)', process_type: 'admin_settlement',
            description: 'Aprobación de finiquito desde portal administrativo',
            steps: [
              { name: 'Cálculo Nóminas', step_type: 'review', approver_role: 'PAYROLL_ADMIN', sla_hours: 24, comments_required: true },
              { name: 'Aprobación RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 24, comments_required: true },
              { name: 'Aprobación Legal', step_type: 'approval', approver_role: 'HR_DIRECTOR', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Baja Médica (Admin)', process_type: 'admin_sick_leave',
            description: 'Registro y validación de IT desde portal administrativo',
            steps: [
              { name: 'Registro RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24, comments_required: true },
            ]
          },
          {
            company_id, name: 'Accidente Laboral (Admin)', process_type: 'admin_work_accident',
            description: 'Gestión de accidente desde portal administrativo',
            steps: [
              { name: 'Registro e Investigación', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24, comments_required: true },
              { name: 'Validación RRHH', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Vacaciones (Admin)', process_type: 'admin_vacation',
            description: 'Aprobación de vacaciones desde portal administrativo',
            steps: [
              { name: 'Aprobación Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 48, delegation_enabled: true },
              { name: 'Validación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24 },
            ]
          },
          {
            company_id, name: 'Solicitud Genérica (Admin)', process_type: 'admin_schedule_change',
            description: 'Cambio de jornada desde portal administrativo',
            steps: [
              { name: 'Revisión RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 48, comments_required: true },
              { name: 'Aprobación Responsable', step_type: 'approval', approver_role: 'HR_MANAGER', sla_hours: 48 },
            ]
          },
          {
            company_id, name: 'Certificado Empresa (Admin)', process_type: 'admin_company_certificate',
            description: 'Generación de certificado desde portal administrativo',
            steps: [
              { name: 'Generación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24 },
            ]
          },
          {
            company_id, name: 'Envío Documentación (Admin)', process_type: 'admin_document_submission',
            description: 'Registro de documentación desde portal administrativo',
            steps: [
              { name: 'Verificación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 48 },
            ]
          },
          {
            company_id, name: 'Incidencias Mensuales (Admin)', process_type: 'admin_monthly_incidents',
            description: 'Registro de incidencias mensuales desde portal administrativo',
            steps: [
              { name: 'Registro Nóminas', step_type: 'review', approver_role: 'PAYROLL_ADMIN', sla_hours: 48, comments_required: true },
            ]
          },
          {
            company_id, name: 'Permiso No Retribuido (Admin)', process_type: 'admin_unpaid_leave',
            description: 'Solicitud de permiso no retribuido',
            steps: [
              { name: 'Aprobación Manager', step_type: 'approval', approver_role: 'MANAGER', sla_hours: 48, comments_required: true },
              { name: 'Validación RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24 },
            ]
          },
          {
            company_id, name: 'Nacimiento / Paternidad (Admin)', process_type: 'admin_birth_leave',
            description: 'Gestión de permiso por nacimiento desde portal administrativo',
            steps: [
              { name: 'Registro RRHH', step_type: 'review', approver_role: 'HR_SPECIALIST', sla_hours: 24, comments_required: true },
            ]
          },
        ];

        let totalDefs = 0;
        let totalSteps = 0;
        for (const wf of workflows) {
          const { steps, ...defData } = wf;
          const { data: def, error } = await userClient.from('erp_hr_workflow_definitions').insert(defData).select().single();
          if (error) { console.error('Seed def error:', error); continue; }
          totalDefs++;
          if (steps.length > 0 && def) {
            const stepsWithDef = steps.map((s: any, i: number) => ({ ...s, definition_id: def.id, step_order: i + 1 }));
            const { error: stepErr } = await userClient.from('erp_hr_workflow_steps').insert(stepsWithDef);
            if (!stepErr) totalSteps += steps.length;
          }
        }

        result = { definitions: totalDefs, steps: totalSteps };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[erp-hr-workflow-engine] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
