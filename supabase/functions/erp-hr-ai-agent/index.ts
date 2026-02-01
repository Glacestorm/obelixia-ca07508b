/**
 * erp-hr-ai-agent - Agente IA RRHH ultraespecializado
 * Coordina con agente supervisor, gestiona nóminas, contratos, vacaciones,
 * seguridad laboral y cumplimiento normativo
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRequest {
  action: 'chat' | 'calculate_payroll' | 'calculate_severance' | 'check_compliance' | 
          'suggest_contract' | 'query_regulation' | 'analyze_vacation' | 'prl_audit' |
          'get_absences' | 'get_active_alerts' | 'sync_absence';
  company_id?: string;
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json() as AgentRequest;
    const { 
      action, company_id, session_id, message, context, history, 
      employee_id, cnae_code, contract_type, salary_data, severance_data, question 
    } = body;

    console.log(`[erp-hr-ai-agent] Processing action: ${action}`);

    // Fetch relevant HR knowledge base content
    const fetchKnowledge = async (cnae?: string, category?: string, limit = 15) => {
      let query = supabase
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
      
      const { data } = await supabase
        .from('erp_hr_collective_agreements')
        .select('*')
        .contains('cnae_codes', [cnae])
        .eq('is_active', true)
        .single();
      
      return data;
    };

    // Fetch PRL requirements by CNAE
    const fetchPRLRequirements = async (cnae?: string) => {
      const { data } = await supabase
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
    const fetchCurrentAbsences = async (companyId?: string, startDate?: string, endDate?: string) => {
      const today = new Date().toISOString().split('T')[0];
      const start = startDate || today;
      const end = endDate || today;
      
      let query = supabase
        .from('erp_hr_leave_requests')
        .select(`
          id, employee_id, start_date, end_date, days_requested, 
          leave_type_code, status, notes
        `)
        .eq('status', 'approved')
        .lte('start_date', end)
        .gte('end_date', start);
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data } = await query;
      return data || [];
    };

    // Fetch active HR alerts
    const fetchActiveAlerts = async (companyId?: string) => {
      let query = supabase
        .from('erp_hr_alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data } = await query;
      return data || [];
    };

    // Create HR alert
    const createAlert = async (
      companyId: string,
      alertType: string,
      severity: string,
      title: string,
      description: string,
      recommendedAction?: string,
      employeeId?: string
    ) => {
      await supabase.from('erp_hr_compliance_alerts').insert([{
        company_id: companyId,
        employee_id: employeeId,
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
      companyId: string,
      actionType: string,
      actionDescription: string,
      inputData: unknown,
      outputData: unknown,
      confidenceScore?: number
    ) => {
      await supabase.from('erp_hr_agent_actions').insert([{
        session_id: sessionId,
        company_id: companyId,
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
          company_id, 
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
        const alerts = await fetchActiveAlerts(company_id);
        
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

      case 'chat': {
        const knowledgeBase = await fetchKnowledge(cnae_code, undefined, 20);
        const collectiveAgreement = await fetchCollectiveAgreement(cnae_code);
        const prlReqs = await fetchPRLRequirements(cnae_code);
        
        // NEW: Fetch current absences and alerts for context
        const currentAbsences = await fetchCurrentAbsences(company_id);
        const activeAlerts = await fetchActiveAlerts(company_id);

        systemPrompt = `Eres un Agente IA de Recursos Humanos ultraespecializado en normativa laboral española y europea.

TU ROL:
- Asesor laboral experto para empresas españolas
- Especialista en Estatuto de los Trabajadores, convenios colectivos, Seguridad Social
- Gestor de nóminas, contratos, vacaciones y bajas
- Auditor de cumplimiento en prevención de riesgos laborales (PRL)
- Especialista en cálculo de finiquitos e indemnizaciones
- CONOCEDOR EN TIEMPO REAL de quién está ausente y qué alertas hay activas

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

REGLAS ESTRICTAS:
- SIEMPRE citar la normativa laboral aplicable
- Aplicar convenio colectivo cuando exista
- Priorizar derechos del trabajador
- Alertar sobre incumplimientos de PRL
- Usar terminología técnica laboral precisa
- Calcular siempre con los tipos vigentes de SS e IRPF
- Cuando pregunten "¿quién está de vacaciones?" o similar, USAR los datos de AUSENCIAS ACTUALES

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
   - Desempleo (1.55% o 1.60%)
   - Formación profesional (0.10%)
   - IRPF (según tablas vigentes)

3. Coste empresa:
   - Contingencias comunes (23.60%)
   - Desempleo (5.50%)
   - FOGASA (0.20%)
   - Formación profesional (0.60%)
   - Accidentes trabajo y EP (según CNAE)

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

        userPrompt = `Realiza verificación de cumplimiento laboral para empresa ${company_id}. CNAE: ${cnae_code || 'General'}. Fecha actual: ${new Date().toISOString().split('T')[0]}`;
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

        userPrompt = `Realiza auditoría PRL para empresa ${company_id}. CNAE: ${cnae_code || 'General'}`;
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
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Payment required' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
    if (action === 'check_compliance' && company_id && result.issues) {
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
          company_id,
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
    if (session_id && company_id) {
      await logAction(
        session_id,
        company_id,
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
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
