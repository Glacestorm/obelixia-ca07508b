/**
 * erp-hr-ai-agent - Agente IA RRHH ultraespecializado
 * Coordina con agente supervisor, gestiona nóminas, contratos, vacaciones,
 * seguridad laboral y cumplimiento normativo
 * 
 * S6.3C: Migrated to validateTenantAccess + userClient for all data ops
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';
import { CANONICAL_SS_RATES, CANONICAL_EMPLOYER_RATE_INDEF } from '../_shared/hr-payroll-kpi-catalog.ts';

interface AgentRequest {
  action: 'chat' | 'calculate_payroll' | 'calculate_severance' | 'check_compliance' | 
          'suggest_contract' | 'query_regulation' | 'analyze_vacation' | 'prl_audit' |
          'get_absences' | 'get_active_alerts' | 'sync_absence' | 
          'get_dashboard_stats' | 'get_full_dashboard' | 'get_ninebox_distribution' |
          'calculate_ss_contributions' | 'submit_siltra' | 'refresh_red_status' | 'request_certificate';
  company_id?: string;
  companyId?: string;
  session_id?: string;
  message?: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: string; content: string }>;
  employee_id?: string;
  cnae_code?: string;
  contract_type?: string;
  salary_data?: {
    base_salary: number;
    seniority_years: number;
    category: string;
    working_hours: number;
    extra_hours?: number;
    bonuses?: number;
  };
  severance_data?: {
    start_date: string;
    end_date: string;
    base_salary: number;
    termination_type: 'voluntary' | 'objective' | 'disciplinary' | 'collective' | 'end_contract';
    pending_vacation_days?: number;
    pending_extra_pays?: number;
  };
  question?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body = await req.json() as AgentRequest;
    const { 
      action, company_id, companyId, session_id, message, context, history, 
      employee_id, cnae_code, contract_type, salary_data, severance_data, question 
    } = body;
    
    // Support both company_id and companyId
    const effectiveCompanyId = company_id || companyId;

    if (!effectiveCompanyId) {
      return validationError('company_id is required', corsHeaders);
    }

    // --- AUTH + TENANT VALIDATION (S6.3C) ---
    const authResult = await validateTenantAccess(req, effectiveCompanyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    const { userClient } = authResult;
    // --- END AUTH + TENANT VALIDATION ---

    console.log(`[erp-hr-ai-agent] Processing action: ${action}`);

    // Fetch relevant HR knowledge base content
    const fetchKnowledge = async (cnae?: string, category?: string, limit = 15) => {
      let query = userClient
        .from('erp_hr_knowledge_base')
        .select('title, content, knowledge_type, tags, cnae_codes')
        .eq('is_active', true)
        .limit(limit);

      if (category) {
        query = query.eq('knowledge_type', category);
      }

      const { data } = await query;
      
      // Filter by CNAE if provided
      if (cnae && data) {
        return data.filter(k => 
          !k.cnae_codes || k.cnae_codes.length === 0 || k.cnae_codes.includes(cnae)
        );
      }
      return data || [];
    };

    // Fetch collective agreements by CNAE
    const fetchCollectiveAgreement = async (cnae?: string) => {
      if (!cnae) return null;
      
      const { data } = await userClient
        .from('erp_hr_collective_agreements')
        .select('*')
        .contains('cnae_codes', [cnae])
        .eq('is_active', true)
        .single();
      
      return data;
    };

    // Fetch PRL requirements by CNAE
    const fetchPRLRequirements = async (cnae?: string) => {
      const { data } = await userClient
        .from('erp_hr_prl_requirements')
        .select('*')
        .eq('is_active', true);
      
      if (cnae && data) {
        return data.filter(r => 
          !r.cnae_codes || r.cnae_codes.length === 0 || r.cnae_codes.includes(cnae)
        );
      }
      return data || [];
    };

    // Fetch current absences (approved leave requests)
    const fetchCurrentAbsences = async (cId?: string, startDate?: string, endDate?: string) => {
      const today = new Date().toISOString().split('T')[0];
      const start = startDate || today;
      const end = endDate || today;
      
      let query = userClient
        .from('erp_hr_leave_requests')
        .select(`
          id, employee_id, start_date, end_date, days_requested, 
          leave_type_code, status, notes
        `)
        .eq('status', 'approved')
        .lte('start_date', end)
        .gte('end_date', start);
      
      if (cId) {
        query = query.eq('company_id', cId);
      }
      
      const { data } = await query;
      return data || [];
    };

    // Fetch active HR alerts
    const fetchActiveAlerts = async (cId?: string) => {
      let query = userClient
        .from('erp_hr_alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (cId) {
        query = query.eq('company_id', cId);
      }
      
      const { data } = await query;
      return data || [];
    };

    // Create HR alert
    const createAlert = async (
      cId: string,
      alertType: string,
      severity: string,
      title: string,
      description: string,
      recommendedAction?: string,
      empId?: string
    ) => {
      await userClient.from('erp_hr_compliance_alerts').insert([{
        company_id: cId,
        employee_id: empId,
        alert_type: alertType,
        severity,
        title,
        description,
        recommended_action: recommendedAction,
        auto_generated: true
      }]);
    };

    // Log agent action
    const logAction = async (
      sessionId: string,
      cId: string,
      actionType: string,
      actionDescription: string,
      inputData: unknown,
      outputData: unknown,
      confidenceScore?: number
    ) => {
      await userClient.from('erp_hr_agent_actions').insert([{
        session_id: sessionId,
        company_id: cId,
        action_type: actionType,
        action_description: actionDescription,
        input_data: inputData,
        output_data: outputData,
        confidence_score: confidenceScore
      }]);
    };

    let systemPrompt = '';
    let userPrompt = '';
    let result: Record<string, unknown> = {};

    switch (action) {
      // NEW: Get current absences - who is away today
      case 'get_absences': {
        const absences = await fetchCurrentAbsences(
          effectiveCompanyId, 
          body.date_range?.start, 
          body.date_range?.end
        );
        
        result = {
          absences,
          total_absent: absences.length,
          date_range: body.date_range || { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          ...result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // NEW: Get active alerts for HR manager
      case 'get_active_alerts': {
        const alerts = await fetchActiveAlerts(effectiveCompanyId);
        
        result = {
          alerts,
          total_alerts: alerts.length,
          critical_count: alerts.filter((a: any) => a.severity === 'critical').length,
          warning_count: alerts.filter((a: any) => a.severity === 'warning').length
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          ...result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // NEW: Sync absence to AI knowledge (called when leave is approved)
      case 'sync_absence': {
        if (!context) throw new Error('context required for sync_absence');
        
        // Store in agent's context memory
        console.log('[erp-hr-ai-agent] Syncing absence:', context);
        
        // Create an AI-friendly summary
        const absenceSummary = `Ausencia registrada: ${context.employee_name || 'Empleado'} estará ausente del ${context.start_date} al ${context.end_date}. Tipo: ${context.type}. Departamento: ${context.department || 'No especificado'}.`;
        
        result = {
          synced: true,
          summary: absenceSummary,
          employee_id: context.employee_id,
          dates: { start: context.start_date, end: context.end_date }
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          ...result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Dashboard stats for HRModule
      case 'get_dashboard_stats': {
        console.log('[erp-hr-ai-agent] Fetching dashboard stats for company:', effectiveCompanyId);
        
        // Count employees
        const { count: employeesCount } = await userClient
          .from('erp_hr_employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        // Count active contracts
        const { count: contractsCount } = await userClient
          .from('erp_hr_contracts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        // Count pending vacations
        const { count: vacationsCount } = await userClient
          .from('erp_hr_leave_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'pending_dept', 'pending_hr']);
        
        // Count pending payrolls (unpaid)
        const { count: payrollCount } = await userClient
          .from('erp_hr_payrolls')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');
        
        // Count safety alerts
        const { count: safetyCount } = await userClient
          .from('erp_hr_safety_incidents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        
        result = {
          employees: employeesCount || 0,
          contracts: contractsCount || 0,
          vacations: vacationsCount || 0,
          payroll: payrollCount || 0,
          safety: safetyCount || 0
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Full dashboard data for HRDashboardPanel
      case 'get_full_dashboard': {
        console.log('[erp-hr-ai-agent] Fetching full dashboard for company:', effectiveCompanyId);
        
        // Get employees by department
        const { data: deptData } = await userClient
          .from('erp_hr_employees')
          .select('department')
          .eq('status', 'active');
        
        const deptCounts: Record<string, number> = {};
        (deptData || []).forEach((e: any) => {
          const dept = e.department || 'Sin asignar';
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });
        
        const departmentDistribution = Object.entries(deptCounts).map(([name, count]) => ({
          department: name,
          count
        }));
        
        // Get contracts by type
        const { data: contractData } = await userClient
          .from('erp_hr_contracts')
          .select('contract_type')
          .eq('status', 'active');
        
        const contractCounts: Record<string, number> = {};
        (contractData || []).forEach((c: any) => {
          const type = c.contract_type || 'Otro';
          contractCounts[type] = (contractCounts[type] || 0) + 1;
        });
        
        const contractTypes = Object.entries(contractCounts).map(([type, count]) => ({
          type,
          count
        }));
        
        // Get upcoming events (leaves, contract expirations, etc.)
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data: leaveEvents } = await userClient
          .from('erp_hr_leave_requests')
          .select('id, employee_id, start_date, end_date, leave_type_code')
          .eq('status', 'approved')
          .gte('start_date', today)
          .lte('start_date', nextMonth)
          .limit(10);
        
        const upcomingEvents = (leaveEvents || []).map((e: any) => ({
          type: 'vacation',
          title: `Vacaciones - Empleado ${e.employee_id?.substring(0, 8)}`,
          date: e.start_date,
          days: Math.ceil((new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        }));
        
        // KPIs calculation
        const totalEmployees = deptData?.length || 0;
        const { count: terminatedThisYear } = await userClient
          .from('erp_hr_employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'inactive')
          .gte('termination_date', `${new Date().getFullYear()}-01-01`);
        
        const turnoverRate = totalEmployees > 0 
          ? ((terminatedThisYear || 0) / totalEmployees * 100).toFixed(1) 
          : '0';
        
        const kpis = [
          { label: 'Rotación anual', value: `${turnoverRate}%`, trend: 'down', target: '<10%', status: parseFloat(turnoverRate) < 10 ? 'good' : 'warning', availability: 'real', provenance: 'db_query' },
          { label: 'Absentismo', value: null, trend: null, target: '<3%', status: 'no_data', availability: 'not_available', provenance: 'not_available', display_label: 'Sin fuente de datos configurada' },
          { label: 'Satisfacción', value: null, trend: null, target: '>8', status: 'no_data', availability: 'not_available', provenance: 'not_available', display_label: 'Sin fuente de datos configurada' },
          { label: 'Formación h/emp', value: null, trend: null, target: '40h', status: 'no_data', availability: 'not_available', provenance: 'not_available', display_label: 'Sin fuente de datos configurada' }
        ];
        
        result = {
          departmentDistribution,
          contractTypes,
          upcomingEvents,
          kpis,
          headcountEvolution: [] // Would need historical data
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 9-Box Grid distribution for HRAdvancedAnalyticsPanel
      case 'get_ninebox_distribution': {
        console.log('[erp-hr-ai-agent] Fetching 9-box distribution');
        
        const { data: evalData } = await userClient
          .from('erp_hr_performance_reviews')
          .select('employee_id, performance_rating, potential_rating')
          .eq('status', 'completed');
        
        // Map ratings to grid positions
        const distribution: Record<string, number> = {
          'high-high': 0,
          'high-medium': 0,
          'high-low': 0,
          'medium-high': 0,
          'medium-medium': 0,
          'medium-low': 0,
          'low-high': 0,
          'low-medium': 0,
          'low-low': 0
        };
        
        (evalData || []).forEach((e: any) => {
          const perf = e.performance_rating || 3;
          const pot = e.potential_rating || 3;
          
          const perfLevel = perf >= 4 ? 'high' : perf >= 3 ? 'medium' : 'low';
          const potLevel = pot >= 4 ? 'high' : pot >= 3 ? 'medium' : 'low';
          
          const key = `${perfLevel}-${potLevel}`;
          distribution[key] = (distribution[key] || 0) + 1;
        });
        
        result = {
          distribution,
          totalEvaluated: evalData?.length || 0
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Social Security calculations and submissions
      case 'calculate_ss_contributions': {
        console.log('[erp-hr-ai-agent] Calculating SS contributions');
        
        const period = (context as any)?.period || new Date().toISOString().slice(0, 7);
        
        // Get active employees for the period (H2.0: expanded master fields)
        const { data: employees } = await userClient
          .from('erp_hr_employees')
          .select('id, first_name, last_name, social_security_number, national_id, birth_date, position, weekly_hours, category, country_code')
          .eq('status', 'active');
        
        // Get payrolls for the period
        const { data: payrolls } = await userClient
          .from('erp_hr_payrolls')
          .select('*')
          .ilike('period', `${period}%`);
        
        const totalEmployees = employees?.length || 0;
        const totalPayrolls = payrolls?.length || 0;
        
        // Calculate totals
        let totalBases = 0;
        let totalContributions = 0;
        
        // SS rates from canonical catalog (mirrors ssRules2026 / RDL 3/2026)
        const employerRateIndef = CANONICAL_EMPLOYER_RATE_INDEF / 100; // 32.15% → 0.3215

        (payrolls || []).forEach((p: any) => {
          totalBases += p.gross_salary || 0;
          totalContributions += (p.gross_salary || 0) * employerRateIndef;
        });
        
        result = {
          period,
          summary: {
            total_employees: totalEmployees,
            total_payrolls: totalPayrolls,
            total_bases: parseFloat(totalBases.toFixed(2)),
            total_contributions: parseFloat(totalContributions.toFixed(2)),
            contingencias_comunes: parseFloat((totalBases * CANONICAL_SS_RATES.cc.employer / 100).toFixed(2)),
            desempleo: parseFloat((totalBases * CANONICAL_SS_RATES.unemployment_indef.employer / 100).toFixed(2)),
            fogasa: parseFloat((totalBases * CANONICAL_SS_RATES.fogasa.employer / 100).toFixed(2)),
            formacion: parseFloat((totalBases * CANONICAL_SS_RATES.fp.employer / 100).toFixed(2)),
            mei: parseFloat((totalBases * CANONICAL_SS_RATES.mei.employer / 100).toFixed(2)),
            atep_referencia: parseFloat((totalBases * CANONICAL_SS_RATES.atep_ref.employer / 100).toFixed(2)),
            rate_source: 'hr-payroll-kpi-catalog (mirror of ssRules2026 / RDL 3/2026)',
            employer_rate_total_pct: parseFloat(CANONICAL_EMPLOYER_RATE_INDEF.toFixed(2)),
          },
          status: 'calculated',
          generated_at: new Date().toISOString()
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'submit_siltra': {
        console.log('[erp-hr-ai-agent] Submitting to SILTRA');
        
        const fileType = (context as any)?.fileType || 'TC1';
        const period = (context as any)?.period || new Date().toISOString().slice(0, 7);
        
        // Internal preparatory simulation — NOT an official TGSS submission
        result = {
          submission_id: `SILTRA-${Date.now()}`,
          file_type: fileType,
          period,
          status: 'submitted',
          response_code: '0000',
          response_message: 'Fichero recibido correctamente en cola de proceso',
          submitted_at: new Date().toISOString(),
          expected_processing: 'Las próximas 24-48 horas',
          simulated_internal: true,
          official_submission: false,
          readiness_only: true,
          disclaimer: 'Simulación interna preparatoria. No constituye envío oficial a TGSS. Requiere firma electrónica y envío por SILTRA real.',
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'refresh_red_status': {
        console.log('[erp-hr-ai-agent] Refreshing RED status');
        
        // Internal preparatory simulation — NOT a real Sistema RED connection
        result = {
          connection_status: 'connected',
          last_sync: new Date().toISOString(),
          pending_communications: 0,
          pending_affirmations: 0,
          pending_responses: 2,
          recent_submissions: [
            {
              id: `RED-${Date.now() - 86400000}`,
              type: 'AFI',
              status: 'processed',
              date: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: `RED-${Date.now() - 172800000}`,
              type: 'ITA',
              status: 'processed',
              date: new Date(Date.now() - 172800000).toISOString()
            }
          ],
          certificate_valid_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          simulated_internal: true,
          official_submission: false,
          readiness_only: true,
          disclaimer: 'Estado simulado interno. No representa una conexión real con Sistema RED de la TGSS.',
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'request_certificate': {
        console.log('[erp-hr-ai-agent] Requesting certificate');
        
        const certificateType = (context as any)?.certificateType || 'empresa';
        const certEmployeeId = (context as any)?.employeeId;
        
        // Internal preparatory simulation — NOT a real certificate request
        result = {
          request_id: `CERT-${Date.now()}`,
          certificate_type: certificateType,
          employee_id: certEmployeeId,
          status: 'pending',
          request_date: new Date().toISOString(),
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'Solicitud de certificado registrada. Recibirá una notificación cuando esté disponible.',
          simulated_internal: true,
          official_submission: false,
          readiness_only: true,
          disclaimer: 'Registro interno preparatorio. La solicitud oficial requiere acceso a sede electrónica.',
        };
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'chat': {
        const knowledgeBase = await fetchKnowledge(cnae_code, undefined, 20);
        const collectiveAgreement = await fetchCollectiveAgreement(cnae_code);
        const prlReqs = await fetchPRLRequirements(cnae_code);
        
        // Fetch current absences and alerts for context
        const currentAbsences = await fetchCurrentAbsences(effectiveCompanyId);
        const activeAlerts = await fetchActiveAlerts(effectiveCompanyId);

        // === EMPLOYEE CONTEXTUAL FETCH (S9.11-H5++) ===
        let employeeContextBlock = '';
        let employeeContextDegraded = false;
        if (context?.employee_id) {
          try {
            const { data: empData, error: empError } = await userClient
              .from('erp_hr_employees')
              .select('first_name, last_name, job_title, category, contract_type, hire_date, weekly_hours, status, work_schedule')
              .eq('id', context.employee_id)
              .maybeSingle();

            if (!empError && empData) {
              employeeContextBlock = `
=== DATOS DEL EMPLEADO SELECCIONADO ===
Nombre: ${empData.first_name || ''} ${empData.last_name || ''}
Puesto: ${empData.job_title || 'No especificado'}
Categoría: ${empData.category || 'No especificada'}
Contrato: ${empData.contract_type || 'No especificado'}
Alta: ${empData.hire_date || 'No especificada'}
Jornada: ${empData.weekly_hours ? empData.weekly_hours + 'h/sem' : 'No especificada'}
Horario: ${empData.work_schedule || 'No especificado'}
Estado: ${empData.status || 'No especificado'}
=== FIN DATOS EMPLEADO ===`;
            } else {
              employeeContextDegraded = true;
              console.log(`[erp-hr-ai-agent] Employee fetch degraded for ${context.employee_id}: ${empError?.message || 'no data'}`);
            }
          } catch (fetchErr) {
            employeeContextDegraded = true;
            console.error(`[erp-hr-ai-agent] Employee context fetch error:`, fetchErr);
          }
        }

        // === ASSISTANT MODE INSTRUCTIONS (S9.11-H5++) ===
        let assistantModeInstructions = '';
        const assistantMode = context?.assistant_mode;
        if (assistantMode === 'consult') {
          assistantModeInstructions = `
MODO CONSULTA CONTEXTUAL:
- Responde prioritariamente sobre el empleado seleccionado.
- No inventes datos ausentes. Di claramente "no dispongo de ese dato" cuando falte información.
- No presentes asesoramiento legal vinculante.
- Prioriza datos reales del sistema sobre generalidades.
${employeeContextDegraded ? '- NOTA: No se pudieron recuperar datos estructurados del empleado. Responde con contexto limitado e indícalo al usuario.' : ''}`;
        } else if (assistantMode === 'assisted_action') {
          assistantModeInstructions = `
MODO ACCIONES ASISTIDAS:
- NO ejecutes automáticamente acciones sensibles (pagos, transferencias, envíos oficiales, cambios contractuales efectivos, finiquitos reales).
- Prepara propuestas, borradores o simulaciones.
- Indica siempre la necesidad de validación humana.
- Resume lo que has entendido antes de preparar la propuesta.
- Si existe un módulo o flujo correspondiente, indica cuál usar.
${employeeContextDegraded ? '- NOTA: Contexto del empleado limitado. Indica al usuario que los datos estructurados no están disponibles.' : ''}`;
        } else if (assistantMode === 'demo_guided') {
          assistantModeInstructions = `
MODO DEMO GUIADA:
- Estructura SIEMPRE la respuesta por fases/pasos numerados.
- Para CADA fase usa este formato fijo:
  **Fase N: [Título]**
  - Qué demostrar: ...
  - Pantalla/módulo: ...
  - Inputs relevantes: ...
  - Outputs/artefactos: ...
  - Clasificación: interno_real | simulación | preparación_oficial | handoff_ready
- No vender como "ejecución oficial real" lo que depende de credenciales, certificados o UAT externos.
- Distingue claramente entre lo que el sistema resuelve internamente y lo que queda preparado/handoff-ready.
- Orienta la demo de forma comercial, clara y vendible.
${employeeContextDegraded ? '- NOTA: Contexto del empleado limitado. Usa datos genéricos de ejemplo para la demo.' : ''}`;
        }

        systemPrompt = `Eres un Agente IA de Recursos Humanos ultraespecializado en normativa laboral española y europea.

TU ROL:
- Asesor laboral experto para empresas españolas
- Especialista en Estatuto de los Trabajadores, convenios colectivos, Seguridad Social
- Gestor de nóminas, contratos, vacaciones y bajas
- Auditor de cumplimiento en prevención de riesgos laborales (PRL)
- Especialista en cálculo de finiquitos e indemnizaciones
- CONOCEDOR EN TIEMPO REAL de quién está ausente y qué alertas hay activas

FICHA MAESTRA DEL EMPLEADO (H2.0/H2.1):
El sistema gestiona datos ampliados del empleado incluyendo:
- Datos personales: nombre, apellidos, DNI/NIE (national_id), fecha nacimiento, dirección
- Datos laborales: puesto, departamento, categoría profesional, jornada semanal (weekly_hours)
- Datos económicos: salario base, cuenta bancaria (IBAN)
- Datos SS: número afiliación, grupo de cotización
- Datos contractuales: tipo contrato RD, fecha alta, antigüedad
- Extensiones: movilidad internacional, stock options/equity compensation, perfiles legales
Usa estos campos cuando la consulta lo requiera para dar respuestas precisas.

MOVILIDAD INTERNACIONAL:
El sistema soporta expatriados e impatriados con campos de país destino/origen, fechas de asignación y tipo de movilidad.

STOCK OPTIONS / EQUITY:
El sistema gestiona planes de stock options con vesting schedules, cliff periods y ejercicio de opciones.

PREFLIGHT COCKPIT:
El ciclo laboral incluye un cockpit de preflight para validar completitud de datos antes de activar procesos críticos (nómina, altas SS, etc.).
${employeeContextBlock}
${assistantModeInstructions}

AUSENCIAS ACTUALES (${currentAbsences.length} empleados ausentes):
${currentAbsences.length > 0 ? currentAbsences.map((a: any) => `- Empleado ${a.employee_id}: ${a.start_date} a ${a.end_date} (${a.leave_type_code})`).join('\n') : 'Ningún empleado ausente hoy'}

ALERTAS ACTIVAS (${activeAlerts.length} alertas):
${activeAlerts.length > 0 ? activeAlerts.slice(0, 10).map((a: any) => `- [${a.severity?.toUpperCase()}] ${a.title}: ${a.description?.substring(0, 100)}`).join('\n') : 'Sin alertas activas'}

NORMATIVA QUE DOMINAS:
${knowledgeBase.map(k => `- ${k.title}: ${k.content.substring(0, 200)}...`).join('\n')}

${collectiveAgreement ? `CONVENIO COLECTIVO APLICABLE:
- Nombre: ${collectiveAgreement.name}
- Tablas salariales: ${JSON.stringify(collectiveAgreement.salary_tables || {})}
- Jornada: ${collectiveAgreement.working_hours || 'Según ET'}
- Vacaciones: ${collectiveAgreement.vacation_days || 30} días` : 'Sin convenio colectivo específico cargado'}

REQUISITOS PRL (${prlReqs.length} requisitos):
${prlReqs.slice(0, 5).map(r => `- ${r.title}: ${r.requirement_type}`).join('\n')}

CAPACIDADES:
1. Calcular nóminas con retenciones IRPF y cotizaciones SS
2. Calcular finiquitos e indemnizaciones por despido
3. Verificar cumplimiento de convenio colectivo
4. Auditar prevención de riesgos laborales
5. Gestionar contratos y prórrogas
6. Calcular y planificar vacaciones
7. Asesorar sobre ERTEs y EREs
8. INFORMAR sobre quién está ausente HOY
9. REPORTAR alertas activas de RRHH
10. Consultar datos del maestro del empleado (DNI/NIE, categoría, jornada, etc.)
11. Consultar estado del Supervisor Fiscal (7 dominios, 5 estados)
12. Referenciar tipos SS con MEI (0.75%+0.15%) incluido

SUPERVISOR FISCAL INTERNO (G1.2):
El sistema dispone de un Supervisor Fiscal determinístico que evalúa 7 dominios de coherencia:
- IRPF Coherence, Modelo 111 Prep, Modelo 190 Readiness, Modelo 145 Completeness
- SS/CRA Coherence, International/IRNR/7p, Incident Impact
Estados posibles: ok | missing_evidence | preparatory_pending | warning | critical
Cuando el supervisor fiscal haya evaluado un dominio, sus resultados prevalecen sobre cualquier estimación IA.

TIPOS SS 2026 (RDL 3/2026 — ssRules2026):
- CC: 23.60% empresa / 4.70% trabajador
- Desempleo indefinido: 5.50% / 1.55% | temporal: 6.70% / 1.60%
- FOGASA: 0.20% empresa
- FP: 0.60% / 0.10%
- MEI: 0.75% / 0.15%
- AT/EP: según CNAE (referencia ~1.50%)
NOTA: Estos tipos provienen de ssRules2026 (RDL 3/2026). No aproximes ni redondees.

REGLAS ESTRICTAS:
- SIEMPRE citar la normativa laboral aplicable
- Aplicar convenio colectivo cuando exista
- Priorizar derechos del trabajador
- Alertar sobre incumplimientos de PRL
- Usar terminología técnica laboral precisa
- Para cálculos de SS e IRPF, referir SIEMPRE al motor determinístico del sistema. No aproximar ni inventar tipos.
- Cuando exista un motor determinístico (ssRules2026, irpfEngine, fiscalSupervisorEngine), SIEMPRE deferir al resultado del motor.
- Cuando pregunten "¿quién está de vacaciones?" o similar, USAR los datos de AUSENCIAS ACTUALES
- No exponer datos bancarios (IBAN) salvo en contexto de nómina/pagos
- Los KPIs sin fuente real (absentismo, satisfacción, formación) deben indicarse como no disponibles, nunca inventar valores

CONTEXTO ACTUAL:
${context ? JSON.stringify(context) : 'Sin contexto adicional'}
CNAE: ${cnae_code || 'No especificado'}

FORMATO DE RESPUESTA:
Responde de forma clara y estructurada. Incluye cálculos detallados cuando aplique.`;

        userPrompt = message || 'Consulta general de RRHH';
        break;
      }

      case 'calculate_payroll': {
        if (!salary_data) {
          throw new Error('salary_data es requerido para calcular nómina');
        }

        const collectiveAgreement = await fetchCollectiveAgreement(cnae_code);

        systemPrompt = `Eres un experto en cálculo de nóminas españolas.

TU TAREA:
Calcular la nómina completa del empleado con todos los conceptos.

DATOS DEL EMPLEADO:
- Salario base: ${salary_data.base_salary}€
- Antigüedad: ${salary_data.seniority_years} años
- Categoría: ${salary_data.category}
- Jornada: ${salary_data.working_hours}h
- Horas extra: ${salary_data.extra_hours || 0}h
- Bonus: ${salary_data.bonuses || 0}€

${collectiveAgreement ? `CONVENIO COLECTIVO:
${JSON.stringify(collectiveAgreement, null, 2)}` : ''}

CONCEPTOS A CALCULAR:
1. Devengos:
   - Salario base
   - Plus antigüedad (según convenio o ET)
   - Horas extraordinarias (incremento 25-75% según convenio)
   - Bonus/incentivos
   - Prorrata pagas extras
   
2. Deducciones:
   - Contingencias comunes (4.70%)
   - Desempleo (1.55% indefinido / 1.60% temporal)
   - Formación profesional (0.10%)
   - MEI (0.15%)
   - IRPF (según tablas vigentes)

3. Coste empresa:
   - Contingencias comunes (23.60%)
   - Desempleo (5.50% indefinido / 6.70% temporal)
   - FOGASA (0.20%)
   - Formación profesional (0.60%)
   - MEI (0.75%)
   - Accidentes trabajo y EP (según CNAE, referencia ~1.50%)
   NOTA: Tipos de ssRules2026 (RDL 3/2026). No aproximar.

FORMATO DE RESPUESTA (JSON estricto):
{
  "payroll": {
    "gross_salary": number,
    "devengos": {
      "base_salary": number,
      "seniority_bonus": number,
      "extra_hours": number,
      "bonuses": number,
      "prorated_extra_pays": number,
      "total": number
    },
    "deductions": {
      "social_security": {
        "common_contingencies": number,
        "unemployment": number,
        "training": number,
        "total": number
      },
      "irpf": {
        "rate": number,
        "amount": number
      },
      "total": number
    },
    "net_salary": number,
    "company_costs": {
      "common_contingencies": number,
      "unemployment": number,
      "fogasa": number,
      "training": number,
      "accidents": number,
      "total": number
    },
    "total_cost": number,
    "calculation_basis": "string",
    "confidence": 0-100
  }
}`;

        userPrompt = `Calcula la nómina mensual para el empleado con los datos proporcionados. CNAE: ${cnae_code || 'General'}`;
        break;
      }

      case 'calculate_severance': {
        if (!severance_data) {
          throw new Error('severance_data es requerido para calcular finiquito');
        }

        const knowledgeBase = await fetchKnowledge(cnae_code, 'indemnizaciones', 10);

        systemPrompt = `Eres un experto en cálculos de finiquitos e indemnizaciones laborales en España.

TU TAREA:
Calcular el finiquito completo e indemnización (si aplica).

DATOS DE LA EXTINCIÓN:
- Fecha inicio: ${severance_data.start_date}
- Fecha fin: ${severance_data.end_date}
- Salario base mensual: ${severance_data.base_salary}€
- Tipo de extinción: ${severance_data.termination_type}
- Días vacaciones pendientes: ${severance_data.pending_vacation_days || 0}
- Pagas extra pendientes: ${severance_data.pending_extra_pays || 0}

NORMATIVA APLICABLE:
${knowledgeBase.map(k => `${k.title}: ${k.content.substring(0, 300)}`).join('\n')}

CÁLCULOS A REALIZAR:

1. FINIQUITO (Saldo y finiquito):
   - Días trabajados del mes en curso
   - Vacaciones no disfrutadas (art. 38.1 ET)
   - Prorrata pagas extraordinarias

2. INDEMNIZACIÓN según tipo:
   - Despido objetivo (art. 52 ET): 20 días/año, máx 12 mensualidades
   - Despido improcedente (art. 56 ET): 33 días/año, máx 24 mensualidades
   - Despido colectivo: Según acuerdo o 20 días/año
   - Fin contrato temporal: 12 días/año (contratos posteriores a 2015)
   - Dimisión voluntaria: Sin indemnización

3. RETENCIONES:
   - El finiquito tributa como rendimiento del trabajo
   - Indemnización por despido: exenta hasta límites legales

FORMATO DE RESPUESTA (JSON estricto):
{
  "severance_calculation": {
    "work_period": {
      "start_date": "ISO date",
      "end_date": "ISO date",
      "total_days": number,
      "total_years": number
    },
    "finiquito": {
      "days_worked_current_month": number,
      "salary_current_month": number,
      "pending_vacation_days": number,
      "vacation_amount": number,
      "pending_extra_pays": number,
      "extra_pays_amount": number,
      "gross_total": number,
      "irpf_retention": number,
      "ss_retention": number,
      "net_total": number
    },
    "indemnization": {
      "type": "string",
      "applicable": boolean,
      "legal_basis": "string",
      "calculation": {
        "days_per_year": number,
        "daily_salary": number,
        "years_service": number,
        "gross_amount": number,
        "max_limit": number,
        "final_amount": number
      },
      "tax_exempt": boolean,
      "exempt_amount": number,
      "taxable_amount": number
    },
    "total_gross": number,
    "total_net": number,
    "warnings": ["string"],
    "confidence": 0-100
  }
}`;

        userPrompt = `Calcula el finiquito e indemnización para la extinción de contrato con los datos proporcionados.`;
        break;
      }

      case 'check_compliance': {
        const knowledgeBase = await fetchKnowledge(cnae_code, undefined, 25);
        const prlReqs = await fetchPRLRequirements(cnae_code);
        const collectiveAgreement = await fetchCollectiveAgreement(cnae_code);

        systemPrompt = `Eres un auditor de cumplimiento laboral automatizado.

TU TAREA:
Realizar una verificación exhaustiva de cumplimiento en materia de RRHH.

NORMATIVA APLICABLE:
${knowledgeBase.map(k => `${k.title}: ${k.content.substring(0, 150)}`).join('\n')}

REQUISITOS PRL:
${prlReqs.map(r => `- ${r.title}: ${r.description || 'Sin descripción'}`).join('\n')}

${collectiveAgreement ? `CONVENIO COLECTIVO:
- ${collectiveAgreement.name}` : ''}

VERIFICACIONES A REALIZAR:
1. Contratos de trabajo
   - Tipo adecuado a la relación laboral
   - Cláusulas obligatorias
   - Registro en SEPE
   
2. Nóminas y retribuciones
   - Salario mínimo interprofesional
   - Cumplimiento tablas convenio
   - Retenciones correctas
   
3. Jornada y descansos
   - Límites jornada (40h/semana)
   - Descanso mínimo diario (12h)
   - Descanso semanal (1.5 días)
   - Registro horario obligatorio
   
4. Vacaciones y permisos
   - 30 días naturales/22 laborables mínimo
   - Permisos retribuidos (art. 37 ET)
   
5. Prevención de riesgos laborales
   - Evaluación de riesgos
   - Plan de prevención
   - Formación obligatoria
   - Vigilancia de la salud
   - EPIs
   
6. Seguridad Social
   - Alta de trabajadores
   - Cotizaciones correctas

FORMATO DE RESPUESTA (JSON estricto):
{
  "compliance_status": "ok" | "issues_found" | "critical",
  "areas_checked": ["string"],
  "issues": [
    {
      "area": "contratos" | "nominas" | "jornada" | "vacaciones" | "prl" | "ss",
      "type": "string",
      "severity": "info" | "warning" | "error" | "critical",
      "title": "string",
      "description": "string",
      "legal_reference": "string",
      "recommended_action": "string",
      "deadline": "ISO date if applicable",
      "potential_sanction": "string"
    }
  ],
  "upcoming_obligations": [
    {
      "obligation": "string",
      "due_date": "ISO date",
      "days_remaining": number
    }
  ],
  "recommendations": ["string"],
  "score": 0-100
}`;

        userPrompt = `Realiza verificación de cumplimiento laboral para empresa ${effectiveCompanyId}. CNAE: ${cnae_code || 'General'}. Fecha actual: ${new Date().toISOString().split('T')[0]}`;
        break;
      }

      case 'suggest_contract': {
        const knowledgeBase = await fetchKnowledge(cnae_code, 'contratos', 15);

        systemPrompt = `Eres un experto en contratos de trabajo españoles.

TU TAREA:
Sugerir el tipo de contrato más adecuado y generar las cláusulas necesarias.

NORMATIVA APLICABLE:
${knowledgeBase.map(k => `${k.title}: ${k.content.substring(0, 200)}`).join('\n')}

TIPOS DE CONTRATO DISPONIBLES:
1. Indefinido ordinario
2. Indefinido fijo-discontinuo
3. Temporal por circunstancias de la producción (máx 6 meses, ampliable a 12 por convenio)
4. Temporal por sustitución
5. Formación en alternancia
6. Contrato para la obtención de práctica profesional
7. Contrato de relevo
8. Tiempo parcial

POST REFORMA LABORAL 2022:
- Los contratos temporales son la excepción
- Hay que justificar la temporalidad
- El contrato de obra ya NO existe

FORMATO DE RESPUESTA (JSON estricto):
{
  "contract_suggestion": {
    "recommended_type": "string",
    "legal_basis": "string",
    "justification": "string",
    "duration": "string",
    "trial_period": "string",
    "mandatory_clauses": [
      {
        "clause": "string",
        "content": "string",
        "legal_reference": "string"
      }
    ],
    "optional_clauses": [
      {
        "clause": "string",
        "content": "string",
        "recommendation": "string"
      }
    ],
    "registration_requirements": ["string"],
    "employer_obligations": ["string"],
    "employee_rights": ["string"],
    "warnings": ["string"],
    "confidence": 0-100
  }
}`;

        userPrompt = `Tipo de contrato solicitado: ${contract_type || 'No especificado'}. 
Contexto: ${context ? JSON.stringify(context) : 'Sin contexto adicional'}
CNAE: ${cnae_code || 'General'}`;
        break;
      }

      case 'query_regulation': {
        const knowledgeBase = await fetchKnowledge(cnae_code, undefined, 25);

        systemPrompt = `Eres un consultor de normativa laboral española con acceso a toda la legislación vigente.

BASE DE CONOCIMIENTO DISPONIBLE:
${knowledgeBase.map(k => `### ${k.title}\n${k.content}\nFuente: ${k.tags?.join(', ')}`).join('\n\n')}

NORMATIVA PRINCIPAL:
- Real Decreto Legislativo 2/2015 (Estatuto de los Trabajadores)
- Ley 31/1995 (Prevención de Riesgos Laborales)
- RD 1/1994 (Ley General de Seguridad Social)
- RD-Ley 32/2021 (Reforma Laboral 2022)
- Convenios colectivos sectoriales

TU ROL:
- Responder consultas sobre normativa laboral
- Citar artículos específicos
- Explicar jurisprudencia relevante
- Indicar sanciones por incumplimiento

RESPONDE de forma clara, citando siempre la normativa aplicable.`;

        userPrompt = question || 'Consulta general sobre normativa laboral';
        break;
      }

      case 'analyze_vacation': {
        const collectiveAgreement = await fetchCollectiveAgreement(cnae_code);

        systemPrompt = `Eres un experto en gestión de vacaciones laborales.

TU TAREA:
Analizar y calcular vacaciones del empleado.

NORMATIVA:
- Art. 38 ET: 30 días naturales mínimo (o 22 laborables)
- El período de disfrute se acuerda entre empresa y trabajador
- Deben disfrutarse en el año natural o hasta el 31 de enero siguiente
- No son sustituibles por compensación económica (salvo extinción)

${collectiveAgreement ? `CONVENIO COLECTIVO:
- Días de vacaciones: ${collectiveAgreement.vacation_days || 30}
- Reglas especiales: ${collectiveAgreement.vacation_rules || 'Ninguna'}` : ''}

CONTEXTO:
${context ? JSON.stringify(context) : 'Sin contexto'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "vacation_analysis": {
    "annual_entitlement": number,
    "days_taken": number,
    "days_pending": number,
    "days_expiring_soon": number,
    "expiry_date": "ISO date",
    "recommendations": ["string"],
    "conflicts": ["string"],
    "legal_notes": ["string"]
  }
}`;

        userPrompt = message || 'Analiza el estado de vacaciones';
        break;
      }

      case 'prl_audit': {
        const prlReqs = await fetchPRLRequirements(cnae_code);

        systemPrompt = `Eres un auditor de Prevención de Riesgos Laborales.

TU TAREA:
Realizar auditoría completa de PRL según normativa y CNAE.

REQUISITOS PRL PARA ESTE CNAE:
${prlReqs.map(r => `- ${r.title}: ${r.description}\n  Obligatorio: ${r.is_mandatory}\n  Periodicidad: ${r.periodicity}`).join('\n')}

NORMATIVA APLICABLE:
- Ley 31/1995 de Prevención de Riesgos Laborales
- RD 39/1997 Reglamento de los Servicios de Prevención
- RD 486/1997 Lugares de trabajo
- RD 773/1997 EPIs
- Normativa específica según CNAE

VERIFICACIONES:
1. Plan de prevención
2. Evaluación de riesgos actualizada
3. Planificación actividad preventiva
4. Formación e información a trabajadores
5. Vigilancia de la salud
6. Coordinación actividades empresariales
7. Equipos de protección individual
8. Señalización y emergencias

FORMATO DE RESPUESTA (JSON estricto):
{
  "prl_audit": {
    "cnae": "string",
    "risk_level": "bajo" | "medio" | "alto" | "muy_alto",
    "compliance_score": 0-100,
    "required_documents": [
      {
        "document": "string",
        "status": "presente" | "ausente" | "desactualizado",
        "last_update": "ISO date",
        "next_review": "ISO date"
      }
    ],
    "findings": [
      {
        "area": "string",
        "severity": "info" | "warning" | "error" | "critical",
        "finding": "string",
        "legal_reference": "string",
        "corrective_action": "string",
        "deadline": "ISO date"
      }
    ],
    "required_training": [
      {
        "training": "string",
        "employees_pending": number,
        "hours_required": number,
        "periodicity": "string"
      }
    ],
    "ppe_requirements": ["string"],
    "recommendations": ["string"]
  }
}`;

        userPrompt = `Realiza auditoría PRL para empresa ${effectiveCompanyId}. CNAE: ${cnae_code || 'General'}`;
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // Call AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(history || []).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse('PAYMENT_REQUIRED', 'AI credits exhausted.', 402, corsHeaders);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    // Parse response based on action
    if (action === 'chat' || action === 'query_regulation') {
      result = { response: content };
    } else {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { rawContent: content };
        }
      } catch {
        result = { rawContent: content };
      }
    }

    // Process compliance check results - create alerts
    if (action === 'check_compliance' && effectiveCompanyId && result.issues) {
      const issues = result.issues as Array<{
        area: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        recommended_action: string;
      }>;
      
      for (const issue of issues) {
        await createAlert(
          effectiveCompanyId,
          issue.area,
          issue.severity,
          issue.title,
          issue.description,
          issue.recommended_action,
          employee_id
        );
      }
      result.alerts_generated = issues.length;
    }

    // Log action if session exists
    if (session_id && effectiveCompanyId) {
      await logAction(
        session_id,
        effectiveCompanyId,
        action,
        `Executed ${action}`,
        { message, context, salary_data, severance_data },
        result,
        (result as any).confidence || 85
      );
    }

    console.log(`[erp-hr-ai-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-ai-agent] Error:', error);
    return internalError(corsHeaders);
  }
});
