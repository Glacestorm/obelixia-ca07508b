import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    // S4.4A-2: validateTenantAccess replaces inline auth gate + tenant check
    const companyId = params?.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing company_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, userClient } = authResult;
    // S6.2B: adminClient only used in seed_enterprise_data action below — extracted on demand


    let result: any;

    switch (action) {
      // ===== LEGAL ENTITIES =====
      case 'list_legal_entities': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_legal_entities')
          .select('*')
          .eq('company_id', company_id)
          .order('name');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_legal_entity': {
        const { id, ...entityData } = params;
        if (id) {
          const { data: old } = await userClient.from('erp_hr_legal_entities').select('*').eq('id', id).single();
          const { data, error } = await userClient.from('erp_hr_legal_entities').update(entityData).eq('id', id).select().single();
          if (error) throw error;
          await userClient.rpc('hr_log_audit', { _company_id: entityData.company_id, _user_id: userId, _action: 'UPDATE', _table_name: 'erp_hr_legal_entities', _record_id: id, _old_data: old, _new_data: data, _category: 'enterprise', _severity: 'info' });
          result = data;
        } else {
          const { data, error } = await userClient.from('erp_hr_legal_entities').insert(entityData).select().single();
          if (error) throw error;
          await userClient.rpc('hr_log_audit', { _company_id: entityData.company_id, _user_id: userId, _action: 'INSERT', _table_name: 'erp_hr_legal_entities', _record_id: data.id, _new_data: data, _category: 'enterprise', _severity: 'info' });
          result = data;
        }
        break;
      }

      case 'delete_legal_entity': {
        const { id, company_id } = params;
        const { data: old } = await userClient.from('erp_hr_legal_entities').select('*').eq('id', id).single();
        const { error } = await userClient.from('erp_hr_legal_entities').delete().eq('id', id);
        if (error) throw error;
        await userClient.rpc('hr_log_audit', { _company_id: company_id, _user_id: userId, _action: 'DELETE', _table_name: 'erp_hr_legal_entities', _record_id: id, _old_data: old, _category: 'enterprise', _severity: 'warning' });
        result = { deleted: true };
        break;
      }

      // ===== WORK CENTERS =====
      case 'list_work_centers': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_work_centers')
          .select('*, erp_hr_legal_entities(id, name)')
          .eq('company_id', company_id)
          .order('name');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_work_center': {
        const { id, ...centerData } = params;
        if (id) {
          const { data: old } = await userClient.from('erp_hr_work_centers').select('*').eq('id', id).single();
          const { data, error } = await userClient.from('erp_hr_work_centers').update(centerData).eq('id', id).select().single();
          if (error) throw error;
          await userClient.rpc('hr_log_audit', { _company_id: centerData.company_id, _user_id: userId, _action: 'UPDATE', _table_name: 'erp_hr_work_centers', _record_id: id, _old_data: old, _new_data: data, _category: 'enterprise', _severity: 'info' });
          result = data;
        } else {
          const { data, error } = await userClient.from('erp_hr_work_centers').insert(centerData).select().single();
          if (error) throw error;
          await userClient.rpc('hr_log_audit', { _company_id: centerData.company_id, _user_id: userId, _action: 'INSERT', _table_name: 'erp_hr_work_centers', _record_id: data.id, _new_data: data, _category: 'enterprise', _severity: 'info' });
          result = data;
        }
        break;
      }

      case 'delete_work_center': {
        const { id, company_id } = params;
        const { data: old } = await userClient.from('erp_hr_work_centers').select('*').eq('id', id).single();
        const { error } = await userClient.from('erp_hr_work_centers').delete().eq('id', id);
        if (error) throw error;
        await userClient.rpc('hr_log_audit', { _company_id: company_id, _user_id: userId, _action: 'DELETE', _table_name: 'erp_hr_work_centers', _record_id: id, _old_data: old, _category: 'enterprise', _severity: 'warning' });
        result = { deleted: true };
        break;
      }

      // ===== ORG UNITS =====
      case 'list_org_units': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_org_units')
          .select('*, erp_hr_legal_entities(id, name)')
          .eq('company_id', company_id)
          .order('name');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_org_unit': {
        const { id, ...unitData } = params;
        if (id) {
          const { data, error } = await userClient.from('erp_hr_org_units').update(unitData).eq('id', id).select().single();
          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await userClient.from('erp_hr_org_units').insert(unitData).select().single();
          if (error) throw error;
          result = data;
        }
        break;
      }

      // ===== CALENDARS =====
      case 'list_calendars': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_work_calendars')
          .select('*, erp_hr_calendar_entries(*)')
          .eq('company_id', company_id)
          .order('year', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_calendar': {
        const { id, entries, ...calData } = params;
        let calendarId = id;
        if (id) {
          const { data, error } = await userClient.from('erp_hr_work_calendars').update(calData).eq('id', id).select().single();
          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await userClient.from('erp_hr_work_calendars').insert(calData).select().single();
          if (error) throw error;
          calendarId = data.id;
          result = data;
        }
        // Manage entries if provided
        if (entries && Array.isArray(entries) && calendarId) {
          await userClient.from('erp_hr_calendar_entries').delete().eq('calendar_id', calendarId);
          if (entries.length > 0) {
            const entriesWithCalendar = entries.map((e: any) => ({ ...e, calendar_id: calendarId }));
            await userClient.from('erp_hr_calendar_entries').insert(entriesWithCalendar);
          }
        }
        break;
      }

      // ===== ROLES & PERMISSIONS =====
      case 'list_roles': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_enterprise_roles')
          .select('*, erp_hr_role_permissions(*, erp_hr_enterprise_permissions(*))')
          .eq('company_id', company_id)
          .order('priority', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case 'list_permissions': {
        const { data, error } = await userClient
          .from('erp_hr_enterprise_permissions')
          .select('*')
          .order('module, action');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_role': {
        const { id, permission_ids, ...roleData } = params;
        let roleId = id;
        if (id) {
          const { data, error } = await userClient.from('erp_hr_enterprise_roles').update(roleData).eq('id', id).select().single();
          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await userClient.from('erp_hr_enterprise_roles').insert(roleData).select().single();
          if (error) throw error;
          roleId = data.id;
          result = data;
        }
        // Update permissions
        if (permission_ids && Array.isArray(permission_ids) && roleId) {
          await userClient.from('erp_hr_role_permissions').delete().eq('role_id', roleId);
          if (permission_ids.length > 0) {
            const perms = permission_ids.map((pid: string) => ({ role_id: roleId, permission_id: pid }));
            await userClient.from('erp_hr_role_permissions').insert(perms);
          }
        }
        break;
      }

      case 'list_role_assignments': {
        const { company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_role_assignments')
          .select('*, erp_hr_enterprise_roles(id, code, name)')
          .eq('company_id', company_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case 'assign_role': {
        const assignData = params;
        const { data, error } = await userClient.from('erp_hr_role_assignments').insert({ ...assignData, assigned_by: userId }).select().single();
        if (error) throw error;
        await userClient.rpc('hr_log_audit', { _company_id: assignData.company_id, _user_id: userId, _action: 'INSERT', _table_name: 'erp_hr_role_assignments', _record_id: data.id, _new_data: data, _category: 'security', _severity: 'warning' });
        result = data;
        break;
      }

      // ===== AUDIT LOG =====
      case 'query_audit_log': {
        const { company_id, category, severity, table_name, action: auditAction, user_id: filterUserId, date_from, date_to, limit: queryLimit = 100 } = params;
        let query = userClient
          .from('erp_hr_audit_log')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(queryLimit);

        if (category) query = query.eq('category', category);
        if (severity) query = query.eq('severity', severity);
        if (table_name) query = query.eq('table_name', table_name);
        if (auditAction) query = query.eq('action', auditAction);
        if (filterUserId) query = query.eq('user_id', filterUserId);
        if (date_from) query = query.gte('created_at', date_from);
        if (date_to) query = query.lte('created_at', date_to);

        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'list_critical_events': {
        const { company_id, resolved } = params;
        let query = userClient
          .from('erp_hr_critical_events')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (resolved === false) query = query.is('resolved_at', null);
        if (resolved === true) query = query.not('resolved_at', 'is', null);

        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'resolve_critical_event': {
        const { id, action_taken, company_id } = params;
        const { data, error } = await userClient
          .from('erp_hr_critical_events')
          .update({ resolved_at: new Date().toISOString(), resolved_by: userId, action_taken })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        await userClient.rpc('hr_log_audit', { _company_id: company_id, _user_id: userId, _action: 'RESOLVE', _table_name: 'erp_hr_critical_events', _record_id: id, _new_data: data, _category: 'security', _severity: 'info' });
        result = data;
        break;
      }

      // ===== ENTERPRISE DASHBOARD STATS =====
      case 'get_enterprise_stats': {
        const { company_id } = params;
        const [entities, centers, orgUnits, employees, auditCount, criticalCount] = await Promise.all([
          userClient.from('erp_hr_legal_entities').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          userClient.from('erp_hr_work_centers').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          userClient.from('erp_hr_org_units').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          userClient.from('erp_hr_employees').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'active'),
          userClient.from('erp_hr_audit_log').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
          userClient.from('erp_hr_critical_events').select('id', { count: 'exact', head: true }).eq('company_id', company_id).is('resolved_at', null),
        ]);

        result = {
          legal_entities: entities.count || 0,
          work_centers: centers.count || 0,
          org_units: orgUnits.count || 0,
          active_employees: employees.count || 0,
          total_audit_events: auditCount.count || 0,
          unresolved_critical: criticalCount.count || 0,
        };
        break;
      }

      // ===== SEED ENTERPRISE DATA =====
      // ──── S6.2B SEED EXCEPTION ────
      // adminClient required: erp_hr_enterprise_permissions has no write RLS policy (global catalog).
      // This action seeds demo/enterprise data. Not part of normal multi-tenant runtime.
      // adminClient is extracted from authResult only here to limit scope.
      case 'seed_enterprise_data': {
        const { adminClient } = authResult as any;
        const { company_id } = params;

        // Seed legal entities
        const entities = [
          { company_id, name: 'Matriz España', legal_name: 'Obelixia Technologies S.L.', tax_id: 'B12345678', entity_type: 'SL', jurisdiction: 'ES', country: 'ES', city: 'Madrid', address: 'Paseo de la Castellana 200', postal_code: '28046', ss_employer_code: '28/1234567/89', cnae_code: '6201', is_active: true, metadata: { is_demo: true } },
          { company_id, name: 'Filial Cataluña', legal_name: 'Obelixia Barcelona S.L.U.', tax_id: 'B87654321', entity_type: 'SLU', jurisdiction: 'ES', country: 'ES', city: 'Barcelona', address: 'Av. Diagonal 500', postal_code: '08006', ss_employer_code: '08/7654321/01', cnae_code: '6201', is_active: true, metadata: { is_demo: true } },
          { company_id, name: 'Andorra Operations', legal_name: 'Obelixia Andorra S.L.', tax_id: 'L-800123-A', entity_type: 'SL', jurisdiction: 'AD', country: 'AD', city: 'Andorra la Vella', address: 'Av. Meritxell 45', postal_code: 'AD500', cnae_code: '6201', is_active: true, metadata: { is_demo: true } },
        ];

        const { data: insertedEntities, error: entErr } = await adminClient.from('erp_hr_legal_entities').insert(entities).select();
        if (entErr) throw entErr;

        // Seed work centers
        const centers = [
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'MAD-HQ', name: 'Sede Central Madrid', city: 'Madrid', province: 'Madrid', country: 'ES', jurisdiction: 'ES', address: 'Paseo de la Castellana 200', postal_code: '28046', cnae_code: '6201', ss_account_code: '28/1234567/89', is_headquarters: true, max_capacity: 200, is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'MAD-TEC', name: 'Centro Tecnológico Madrid', city: 'Madrid', province: 'Madrid', country: 'ES', jurisdiction: 'ES', address: 'C/ Alcalá 100', postal_code: '28009', cnae_code: '6201', ss_account_code: '28/1234567/90', max_capacity: 80, is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[1].id, code: 'BCN-01', name: 'Oficina Barcelona', city: 'Barcelona', province: 'Barcelona', country: 'ES', jurisdiction: 'ES', address: 'Av. Diagonal 500', postal_code: '08006', cnae_code: '6201', ss_account_code: '08/7654321/01', max_capacity: 50, is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[2].id, code: 'AND-01', name: 'Oficina Andorra', city: 'Andorra la Vella', province: 'Andorra la Vella', country: 'AD', jurisdiction: 'AD', address: 'Av. Meritxell 45', postal_code: 'AD500', cnae_code: '6201', max_capacity: 20, is_active: true, metadata: { is_demo: true } },
        ];

        const { data: insertedCenters, error: cenErr } = await adminClient.from('erp_hr_work_centers').insert(centers).select();
        if (cenErr) throw cenErr;

        // Seed org units
        const orgUnits = [
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'DIR', name: 'Dirección General', unit_type: 'division', is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'TEC', name: 'Tecnología', unit_type: 'division', is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'RRHH', name: 'Recursos Humanos', unit_type: 'department', is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'FIN', name: 'Finanzas', unit_type: 'department', is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[0].id, code: 'COM', name: 'Comercial', unit_type: 'department', is_active: true, metadata: { is_demo: true } },
          { company_id, legal_entity_id: insertedEntities[1].id, code: 'DEV-BCN', name: 'Desarrollo Barcelona', unit_type: 'department', is_active: true, metadata: { is_demo: true } },
        ];

        await adminClient.from('erp_hr_org_units').insert(orgUnits);

        // Seed calendar 2026
        const { data: cal } = await adminClient.from('erp_hr_work_calendars').insert({
          company_id, name: 'Calendario General España 2026', year: 2026, jurisdiction: 'ES', weekly_hours: 40, daily_hours: 8, is_default: true, is_active: true, metadata: { is_demo: true }
        }).select().single();

        if (cal) {
          const holidays2026 = [
            { calendar_id: cal.id, entry_date: '2026-01-01', name: 'Año Nuevo', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-01-06', name: 'Epifanía del Señor', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-04-02', name: 'Jueves Santo', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-04-03', name: 'Viernes Santo', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-05-01', name: 'Fiesta del Trabajo', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-08-15', name: 'Asunción de la Virgen', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-10-12', name: 'Fiesta Nacional', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-11-02', name: 'Todos los Santos (trasladado)', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-12-07', name: 'Constitución (trasladado)', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-12-08', name: 'Inmaculada Concepción', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-12-25', name: 'Navidad', entry_type: 'holiday', is_national: true },
            { calendar_id: cal.id, entry_date: '2026-05-15', name: 'San Isidro (Madrid)', entry_type: 'holiday', is_local: true },
            { calendar_id: cal.id, entry_date: '2026-11-09', name: 'Almudena (Madrid)', entry_type: 'holiday', is_local: true },
          ];
          await adminClient.from('erp_hr_calendar_entries').insert(holidays2026);
        }

        // Seed enterprise roles
        const roles = [
          { company_id, code: 'HR_DIRECTOR', name: 'Director de RRHH', description: 'Acceso total al módulo HR. Aprueba políticas y cambios estructurales.', is_system: true, priority: 100 },
          { company_id, code: 'HR_MANAGER', name: 'Manager de RRHH', description: 'Gestión operativa de HR. CRUD empleados, nóminas, contratos.', is_system: true, priority: 80 },
          { company_id, code: 'HR_SPECIALIST', name: 'Especialista RRHH', description: 'Operaciones específicas: nóminas, beneficios, formación.', is_system: true, priority: 60 },
          { company_id, code: 'PAYROLL_ADMIN', name: 'Administrador de Nóminas', description: 'Gestión exclusiva de nóminas y compensación.', is_system: true, priority: 50 },
          { company_id, code: 'RECRUITER', name: 'Reclutador', description: 'Gestión de ofertas, candidatos y procesos de selección.', is_system: true, priority: 40 },
          { company_id, code: 'MANAGER', name: 'Manager/Responsable', description: 'Acceso lectura a su equipo. Aprueba vacaciones y evalúa.', is_system: true, priority: 30 },
          { company_id, code: 'EMPLOYEE', name: 'Empleado', description: 'Self-service: sus datos, nóminas, vacaciones, formación.', is_system: true, priority: 10 },
        ];

        const { data: insertedRoles } = await adminClient.from('erp_hr_enterprise_roles').insert(roles).select();

        // Seed permissions catalog — adminClient required: no write RLS on erp_hr_enterprise_permissions
        const permModules = ['employees', 'payroll', 'contracts', 'vacations', 'training', 'performance', 'recruitment', 'compliance', 'analytics', 'enterprise', 'documents', 'benefits', 'safety'];
        const permActions = ['read', 'create', 'update', 'delete', 'approve', 'export'];
        const permsToInsert = [];
        for (const mod of permModules) {
          for (const act of permActions) {
            permsToInsert.push({ module: mod, action: act, description: `${act} on ${mod}`, is_sensitive: ['delete', 'approve', 'export'].includes(act) });
          }
        }
        const { data: insertedPerms } = await adminClient.from('erp_hr_enterprise_permissions').upsert(permsToInsert, { onConflict: 'module,action,resource' }).select();

        // Assign all permissions to HR_DIRECTOR
        if (insertedRoles?.length && insertedPerms?.length) {
          const directorRole = insertedRoles.find((r: any) => r.code === 'HR_DIRECTOR');
          if (directorRole) {
            const dirPerms = insertedPerms.map((p: any) => ({ role_id: directorRole.id, permission_id: p.id }));
            await adminClient.from('erp_hr_role_permissions').upsert(dirPerms, { onConflict: 'role_id,permission_id' });
          }
          // Read-only for EMPLOYEE
          const empRole = insertedRoles.find((r: any) => r.code === 'EMPLOYEE');
          if (empRole) {
            const readPerms = insertedPerms.filter((p: any) => p.action === 'read').map((p: any) => ({ role_id: empRole.id, permission_id: p.id }));
            await adminClient.from('erp_hr_role_permissions').upsert(readPerms, { onConflict: 'role_id,permission_id' });
          }
        }

        await adminClient.rpc('hr_log_audit', { _company_id: company_id, _user_id: userId, _action: 'SEED', _table_name: 'enterprise', _record_id: company_id, _category: 'enterprise', _severity: 'info' });

        result = {
          legal_entities: insertedEntities?.length || 0,
          work_centers: insertedCenters?.length || 0,
          org_units: orgUnits.length,
          calendars: 1,
          roles: insertedRoles?.length || 0,
          permissions: insertedPerms?.length || 0,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-enterprise-admin] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
