import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // --- Parse body FIRST to extract company_id ---
    const { action, company_id, params } = await req.json();

    if (!company_id || typeof company_id !== 'string') {
      return json({ success: false, error: 'company_id is required' }, 400);
    }

    console.log(`[erp-hr-premium-intelligence] Action: ${action}`);

    // --- AUTH + TENANT GATE ---
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return json(authResult.body, authResult.status);
    }
    const supabase = authResult.userClient;

    // === LEGAL ENGINE SEED ===
    if (action === 'legal_seed_demo') {
      const templates = [
        { company_id, template_name: 'Contrato Indefinido Estándar', template_type: 'employment', category: 'general', jurisdiction: 'ES', version: 1, status: 'active', content_template: { sections: [{ title: 'Datos del Empleador', content: 'La empresa {{company_name}}, con CIF {{company_cif}}...' }, { title: 'Datos del Trabajador', content: 'D./Dña. {{employee_name}}, con DNI {{employee_dni}}...' }, { title: 'Objeto del Contrato', content: 'Prestación de servicios como {{job_title}}...' }, { title: 'Retribución', content: 'Salario bruto anual de {{salary}}€...' }] }, required_variables: ['company_name', 'employee_name', 'job_title', 'salary', 'start_date'], applicable_regulations: ['ET_art8', 'ET_art15'], approval_required: true, usage_count: 24 },
        { company_id, template_name: 'Contrato Temporal por Obra', template_type: 'employment', category: 'temporary', jurisdiction: 'ES', version: 2, status: 'active', content_template: { sections: [{ title: 'Causa de Temporalidad', content: 'La contratación temporal se justifica por {{temporary_reason}}...' }] }, required_variables: ['employee_name', 'temporary_reason', 'start_date'], applicable_regulations: ['ET_art15', 'RD_Ley_32_2021'], approval_required: true, usage_count: 12 },
        { company_id, template_name: 'Acuerdo de Confidencialidad (NDA)', template_type: 'nda', category: 'general', jurisdiction: 'ES', version: 1, status: 'active', content_template: { sections: [{ title: 'Información Confidencial', content: 'Se considera información confidencial toda aquella...' }] }, required_variables: ['employee_name', 'nda_duration_years'], applicable_regulations: ['CC_art1255', 'LOPDGDD'], approval_required: false, usage_count: 18 },
        { company_id, template_name: 'Carta de Despido Objetivo', template_type: 'termination', category: 'general', jurisdiction: 'ES', version: 1, status: 'active', content_template: { sections: [{ title: 'Causa Objetiva', content: 'Se procede al despido objetivo por {{termination_reason}}...' }] }, required_variables: ['employee_name', 'termination_reason', 'severance_amount', 'effective_date'], applicable_regulations: ['ET_art52', 'ET_art53'], approval_required: true, usage_count: 5 },
      ];
      await supabase.from('erp_hr_legal_templates').insert(templates as any);

      const clausesData = [
        { company_id, clause_name: 'Cláusula de No Competencia Post-contractual', clause_type: 'optional', category: 'non_compete', content: 'El trabajador se compromete a no prestar servicios en empresas competidoras...', legal_basis: 'ET art. 21.2', risk_level: 'high', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['competencia'] },
        { company_id, clause_name: 'Protección de Datos Personales', clause_type: 'mandatory', category: 'data_protection', content: 'En cumplimiento del RGPD y la LOPDGDD...', legal_basis: 'RGPD Art. 6, LOPDGDD Art. 11', risk_level: 'low', is_mandatory: true, is_negotiable: false, applies_to_types: ['employment', 'nda'], tags: ['gdpr'] },
        { company_id, clause_name: 'Propiedad Intelectual', clause_type: 'standard', category: 'ip', content: 'Todas las creaciones realizadas por el trabajador...', legal_basis: 'LPI Art. 51', risk_level: 'medium', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['ip'] },
        { company_id, clause_name: 'Teletrabajo y Desconexión Digital', clause_type: 'optional', category: 'remote_work', content: 'El trabajador podrá prestar servicios en modalidad de teletrabajo...', legal_basis: 'Ley 10/2021', risk_level: 'low', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['teletrabajo'] },
        { company_id, clause_name: 'Cláusula de Confidencialidad', clause_type: 'mandatory', category: 'confidentiality', content: 'El trabajador se obliga a mantener estricta confidencialidad...', legal_basis: 'ET Art. 5.d', risk_level: 'medium', is_mandatory: true, is_negotiable: false, applies_to_types: ['employment', 'nda'], tags: ['confidencialidad'] },
      ];
      await supabase.from('erp_hr_legal_clauses').insert(clausesData as any);

      const contractsData = [
        { company_id, contract_number: 'CTR-2026-001', contract_type: 'employment', status: 'active', employee_name: 'María García López', compliance_score: 95, effective_date: '2026-01-15', variables_used: { salary: 35000 }, compliance_issues: [] },
        { company_id, contract_number: 'CTR-2026-002', contract_type: 'employment', status: 'draft', employee_name: 'Carlos Rodríguez Martín', compliance_score: 72, variables_used: { salary: 42000 }, compliance_issues: [{ issue: 'Falta cláusula GDPR', severity: 'high' }] },
        { company_id, contract_number: 'CTR-2026-003', contract_type: 'nda', status: 'signed', employee_name: 'Ana Fernández Ruiz', compliance_score: 100, effective_date: '2026-02-01', expiration_date: '2028-02-01', compliance_issues: [] },
      ];
      await supabase.from('erp_hr_legal_contracts').insert(contractsData as any);

      return json({ success: true, data: { message: 'Legal Engine demo data seeded' } });
    }

    // === CNAE INTELLIGENCE SEED ===
    if (action === 'cnae_seed_demo') {
      const profilesData = [
        {
          company_id, cnae_code: '6201', cnae_description: 'Actividades de programación informática', sector_key: 'technology',
          applicable_regulations: [
            { code: 'ET_art34', name: 'Jornada laboral', description: 'Regulación de jornada máxima y descansos' },
            { code: 'Ley_10_2021', name: 'Teletrabajo', description: 'Ley de trabajo a distancia' },
            { code: 'LOPDGDD', name: 'Protección de datos', description: 'Ley Orgánica de Protección de Datos' },
            { code: 'ET_art21', name: 'Pactos de no competencia', description: 'Cláusulas restrictivas post-contractuales' },
          ],
          collective_agreements: [
            { code: 'XVII_CC_TIC', name: 'XVII Convenio TIC', year: 2025, wage_tables: true },
          ],
          sector_benchmarks: { avg_salary: 42000, turnover_rate: 15.2, training_hours: 40, remote_work_pct: 68 },
          risk_profile: { prl_level: 'low', psychosocial_risk: 'medium', data_breach_risk: 'high' },
          specific_requirements: [
            { req: 'Plan de desconexión digital obligatorio', regulation: 'LOPDGDD Art. 88' },
            { req: 'Evaluación riesgos psicosociales', regulation: 'Ley 31/1995' },
            { req: 'Acuerdo individual teletrabajo', regulation: 'Ley 10/2021 Art. 7' },
          ],
        },
        {
          company_id, cnae_code: '4121', cnae_description: 'Construcción de edificios residenciales', sector_key: 'construction',
          applicable_regulations: [
            { code: 'VI_CC_Construccion', name: 'VI Convenio General Construcción', description: 'Convenio sectorial' },
            { code: 'RD_1627_1997', name: 'Seguridad en obras', description: 'Disposiciones mínimas seguridad construcción' },
            { code: 'Ley_32_2006', name: 'Subcontratación', description: 'Reguladora subcontratación sector construcción' },
          ],
          collective_agreements: [
            { code: 'VI_CC_CONSTRUCCION', name: 'VI Convenio General de la Construcción', year: 2024, wage_tables: true },
          ],
          sector_benchmarks: { avg_salary: 28000, turnover_rate: 22.1, accident_rate: 8.5, training_hours: 20 },
          risk_profile: { prl_level: 'very_high', accident_frequency: 'high', subcontracting_risk: 'high' },
          specific_requirements: [
            { req: 'Tarjeta Profesional de la Construcción (TPC)', regulation: 'Ley 32/2006' },
            { req: 'Coordinador de seguridad y salud', regulation: 'RD 1627/1997' },
            { req: 'Plan de seguridad y salud obligatorio', regulation: 'RD 1627/1997 Art. 7' },
            { req: 'Libro de subcontratación', regulation: 'Ley 32/2006 Art. 8' },
          ],
        },
        {
          company_id, cnae_code: '5610', cnae_description: 'Restaurantes y puestos de comidas', sector_key: 'hospitality',
          applicable_regulations: [
            { code: 'CC_Hosteleria', name: 'Convenio Hostelería', description: 'Convenio colectivo provincial' },
            { code: 'RD_1561_1995', name: 'Jornadas especiales', description: 'Jornadas especiales de trabajo' },
            { code: 'RD_2816_1982', name: 'Reglamento sanitario', description: 'Policia de espectáculos y actividades' },
          ],
          collective_agreements: [
            { code: 'CC_HOSTELERIA_PROV', name: 'Convenio Provincial de Hostelería', year: 2025, wage_tables: true },
          ],
          sector_benchmarks: { avg_salary: 22000, turnover_rate: 35.8, seasonal_workers_pct: 42, training_hours: 12 },
          risk_profile: { prl_level: 'medium', seasonal_risk: 'high', labor_inspection_risk: 'high' },
          specific_requirements: [
            { req: 'Manipulador de alimentos', regulation: 'RD 109/2010' },
            { req: 'Control de jornada estricto', regulation: 'RD-Ley 8/2019' },
            { req: 'Registro retributivo por género', regulation: 'RD 902/2020' },
          ],
        },
      ];
      await supabase.from('erp_hr_cnae_sector_profiles').insert(profilesData as any);

      const rulesData = [
        { company_id, cnae_code: '6201', rule_name: 'Plan de Desconexión Digital', rule_type: 'obligation', description: 'Obligación de implementar política de desconexión digital para empleados con teletrabajo', legal_basis: 'LOPDGDD Art. 88, Ley 10/2021 Art. 18', severity: 'high', is_mandatory: true, status: 'active', penalty_info: { min: 626, max: 6250, category: 'grave' } },
        { company_id, cnae_code: '6201', rule_name: 'Acuerdo Individual Teletrabajo', rule_type: 'documentation', description: 'Cada teletrabajador debe tener acuerdo individual firmado con contenido mínimo legal', legal_basis: 'Ley 10/2021 Art. 7', severity: 'critical', is_mandatory: true, status: 'active', penalty_info: { min: 6251, max: 25000, category: 'muy_grave' } },
        { company_id, cnae_code: '4121', rule_name: 'Tarjeta Profesional Construcción', rule_type: 'certification', description: 'Todo trabajador en obra debe poseer la TPC vigente', legal_basis: 'Ley 32/2006', severity: 'critical', is_mandatory: true, status: 'active', penalty_info: { min: 6251, max: 187515, category: 'muy_grave' } },
        { company_id, cnae_code: '4121', rule_name: 'Plan de Seguridad y Salud en Obras', rule_type: 'safety', description: 'Obligatorio en toda obra con proyecto de ejecución', legal_basis: 'RD 1627/1997 Art. 7', severity: 'critical', is_mandatory: true, status: 'active', penalty_info: { min: 40986, max: 819780, category: 'muy_grave_prl' } },
        { company_id, cnae_code: '5610', rule_name: 'Registro de Jornada', rule_type: 'labor', description: 'Control horario diario de inicio y fin de jornada', legal_basis: 'RD-Ley 8/2019', severity: 'high', is_mandatory: true, status: 'active', penalty_info: { min: 626, max: 6250, category: 'grave' } },
        { company_id, cnae_code: '5610', rule_name: 'Certificado Manipulador Alimentos', rule_type: 'certification', description: 'Personal que manipule alimentos debe acreditar formación', legal_basis: 'RD 109/2010', severity: 'high', is_mandatory: true, status: 'active', penalty_info: { min: 2001, max: 15000, category: 'grave_sanitaria' } },
      ];
      await supabase.from('erp_hr_cnae_compliance_rules').insert(rulesData as any);

      const benchmarksData = [
        { company_id, cnae_code: '6201', metric_name: 'Salario medio anual', metric_category: 'compensation', sector_average: 42000, sector_median: 39500, sector_p25: 32000, sector_p75: 52000, company_value: 44500, deviation_percentage: 5.95, benchmark_source: 'INE 2025', period: '2025', is_favorable: true },
        { company_id, cnae_code: '6201', metric_name: 'Tasa de rotación', metric_category: 'retention', sector_average: 15.2, sector_median: 13.8, sector_p25: 9.5, sector_p75: 21.0, company_value: 12.3, deviation_percentage: -19.1, benchmark_source: 'Randstad 2025', period: '2025', is_favorable: true },
        { company_id, cnae_code: '6201', metric_name: 'Horas formación/año', metric_category: 'development', sector_average: 40, sector_median: 35, sector_p25: 20, sector_p75: 55, company_value: 48, deviation_percentage: 20.0, benchmark_source: 'FUNDAE 2025', period: '2025', is_favorable: true },
        { company_id, cnae_code: '4121', metric_name: 'Índice de accidentalidad', metric_category: 'safety', sector_average: 8.5, sector_median: 7.2, sector_p25: 4.1, sector_p75: 12.8, company_value: 6.1, deviation_percentage: -28.2, benchmark_source: 'INSST 2025', period: '2025', is_favorable: true },
        { company_id, cnae_code: '4121', metric_name: 'Salario medio anual', metric_category: 'compensation', sector_average: 28000, sector_median: 26500, sector_p25: 22000, sector_p75: 34000, company_value: 27000, deviation_percentage: -3.57, benchmark_source: 'INE 2025', period: '2025', is_favorable: false },
        { company_id, cnae_code: '5610', metric_name: 'Tasa de rotación', metric_category: 'retention', sector_average: 35.8, sector_median: 32.0, sector_p25: 22.0, sector_p75: 48.0, company_value: 41.2, deviation_percentage: 15.1, benchmark_source: 'Hostelería España 2025', period: '2025', is_favorable: false },
        { company_id, cnae_code: '5610', metric_name: 'Temporalidad', metric_category: 'contracts', sector_average: 42.0, sector_median: 40.0, sector_p25: 28.0, sector_p75: 55.0, company_value: 38.0, deviation_percentage: -9.52, benchmark_source: 'SEPE 2025', period: '2025', is_favorable: true },
      ];
      await supabase.from('erp_hr_cnae_benchmarks').insert(benchmarksData as any);

      const risksData = [
        { company_id, cnae_code: '6201', assessment_type: 'regulatory', risk_category: 'Fuga de talento tech', risk_level: 'high', risk_score: 78, description: 'Alta demanda del sector con escasez de perfiles especializados', mitigation_actions: [{ action: 'Plan de retención con equity/bonus', priority: 'high' }, { action: 'Programa de desarrollo de carrera acelerado', priority: 'medium' }], impact_areas: ['retention', 'recruitment', 'costs'], status: 'active' },
        { company_id, cnae_code: '6201', assessment_type: 'compliance', risk_category: 'Incumplimiento teletrabajo', risk_level: 'medium', risk_score: 55, description: 'Riesgo de no tener acuerdos individuales de teletrabajo actualizados', mitigation_actions: [{ action: 'Auditoría de acuerdos vigentes', priority: 'high' }, { action: 'Plantilla modelo actualizada Ley 10/2021', priority: 'medium' }], impact_areas: ['compliance', 'legal'], status: 'active' },
        { company_id, cnae_code: '4121', assessment_type: 'safety', risk_category: 'Accidentalidad laboral', risk_level: 'critical', risk_score: 92, description: 'Sector con alta tasa de accidentes graves y mortales', mitigation_actions: [{ action: 'Refuerzo coordinación de actividades empresariales', priority: 'critical' }, { action: 'Formación PRL específica mensual', priority: 'high' }, { action: 'Auditoría de EPIs y señalización', priority: 'high' }], impact_areas: ['safety', 'legal', 'reputation'], status: 'active' },
        { company_id, cnae_code: '4121', assessment_type: 'regulatory', risk_category: 'Subcontratación irregular', risk_level: 'high', risk_score: 75, description: 'Riesgo de cadena de subcontratación no controlada', mitigation_actions: [{ action: 'Verificación REA de subcontratistas', priority: 'high' }, { action: 'Control libro de subcontratación', priority: 'medium' }], impact_areas: ['legal', 'compliance', 'costs'], status: 'active' },
        { company_id, cnae_code: '5610', assessment_type: 'labor', risk_category: 'Inspección de Trabajo', risk_level: 'high', risk_score: 70, description: 'Sector prioritario en campañas de inspección por temporalidad y horas extra', mitigation_actions: [{ action: 'Revisión contratos temporales (causalidad)', priority: 'critical' }, { action: 'Auditoría registro jornada', priority: 'high' }], impact_areas: ['legal', 'financial', 'reputation'], status: 'active' },
      ];
      await supabase.from('erp_hr_cnae_risk_assessments').insert(risksData as any);

      return json({ success: true, data: { message: 'CNAE Intelligence demo data seeded' } });
    }

    // === DATA BRIDGE: Real contracts for Legal Engine ===
    if (action === 'get_real_contracts') {
      const { data: realContracts, error: rcErr } = await supabase
        .from('erp_hr_contracts')
        .select('id, employee_id, contract_type, contract_code, start_date, end_date, base_salary, annual_salary, working_hours, workday_type, category, professional_group, is_active, termination_date, termination_type, collective_agreement_id, signed_at, signed_by_employee, signed_by_company, document_url')
        .eq('company_id', company_id)
        .order('start_date', { ascending: false })
        .limit(200);
      if (rcErr) throw rcErr;

      // Enrich with employee names
      const empIds = [...new Set((realContracts || []).map((c: any) => c.employee_id).filter(Boolean))];
      const { data: empNames } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name')
        .in('id', empIds.length > 0 ? empIds : ['00000000-0000-0000-0000-000000000000']);
      
      const nameMap: Record<string, string> = {};
      (empNames || []).forEach((e: any) => { nameMap[e.id] = `${e.first_name} ${e.last_name}`; });

      const enriched = (realContracts || []).map((c: any) => ({
        ...c,
        employee_name: nameMap[c.employee_id] || 'N/A',
        data_source: 'real',
      }));

      // Stats
      const active = enriched.filter((c: any) => c.is_active);
      const typeDistribution: Record<string, number> = {};
      enriched.forEach((c: any) => {
        typeDistribution[c.contract_type] = (typeDistribution[c.contract_type] || 0) + 1;
      });

      return json({
        success: true,
        data: {
          data_source: 'real',
          contracts: enriched,
          stats: {
            total: enriched.length,
            active: active.length,
            expired: enriched.length - active.length,
            signed: enriched.filter((c: any) => c.signed_by_employee && c.signed_by_company).length,
            type_distribution: typeDistribution,
          },
          timestamp: new Date().toISOString(),
        }
      });
    }

    if (action === 'sync_real_contracts_to_legal') {
      // Import real contracts as legal contracts for premium analysis
      const { data: realContracts } = await supabase
        .from('erp_hr_contracts')
        .select('id, employee_id, contract_type, contract_code, start_date, end_date, base_salary, annual_salary, is_active, category')
        .eq('company_id', company_id)
        .eq('is_active', true);

      const { data: empNames } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name')
        .eq('company_id', company_id);
      const nameMap: Record<string, string> = {};
      (empNames || []).forEach((e: any) => { nameMap[e.id] = `${e.first_name} ${e.last_name}`; });

      // Check existing legal contracts to avoid duplicates
      const { data: existingLegal } = await supabase
        .from('erp_hr_legal_contracts')
        .select('contract_number')
        .eq('company_id', company_id);
      const existingCodes = new Set((existingLegal || []).map((c: any) => c.contract_number));

      const toInsert = (realContracts || [])
        .filter((c: any) => c.contract_code && !existingCodes.has(c.contract_code))
        .map((c: any) => ({
          company_id,
          contract_number: c.contract_code || `REAL-${c.id.slice(0, 8)}`,
          contract_type: c.contract_type === 'indefinido' ? 'employment' : c.contract_type === 'temporal' ? 'temporary' : 'employment',
          status: 'active',
          employee_name: nameMap[c.employee_id] || 'N/A',
          employee_id: c.employee_id,
          effective_date: c.start_date,
          expiration_date: c.end_date,
          compliance_score: 0,
          compliance_issues: [],
          variables_used: { salary: c.base_salary, annual_salary: c.annual_salary, category: c.category, data_source: 'real_erp_contract', source_contract_id: c.id },
          generated_content: {},
          risk_assessment: {},
        }));

      if (toInsert.length > 0) {
        await supabase.from('erp_hr_legal_contracts').insert(toInsert as any);
      }

      return json({
        success: true,
        data: {
          synced: toInsert.length,
          skipped_duplicates: (realContracts || []).length - toInsert.length,
          total_real_contracts: (realContracts || []).length,
          message: `${toInsert.length} contratos reales sincronizados al Legal Engine`,
        }
      });
    }

    // === AI ACTIONS ===
    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'ai_generate_contract') {
      systemPrompt = `Eres un abogado laboralista español experto en redacción de contratos conforme al ET, RD 2720/1998, y normativa laboral vigente.
FORMATO JSON estricto:
{
  "contract_title": "string",
  "sections": [{ "title": "string", "content": "string", "legal_basis": "string" }],
  "mandatory_clauses_included": ["string"],
  "optional_clauses_recommended": ["string"],
  "compliance_notes": ["string"],
  "risk_warnings": [{ "warning": "string", "severity": "high|medium|low", "recommendation": "string" }],
  "summary": "string"
}`;
      userPrompt = `Genera contrato con estos parámetros: ${JSON.stringify(params)}`;

    } else if (action === 'ai_legal_compliance') {
      systemPrompt = `Eres un auditor de compliance laboral español experto en ET, GDPR/LOPDGDD, Ley 10/2021, RD-Ley 32/2021.
FORMATO JSON estricto:
{
  "overall_compliance_score": 0-100,
  "regulatory_coverage": { "et_compliance": 0-100, "gdpr_compliance": 0-100, "prl_compliance": 0-100 },
  "missing_documents": [{ "document": "string", "regulation": "string", "urgency": "critical|high|medium|low" }],
  "action_plan": [{ "priority": 1, "action": "string", "deadline": "string" }],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza compliance documental: ${JSON.stringify(params)}`;

    } else if (action === 'ai_clause_review') {
      systemPrompt = `Eres un abogado laboralista español especializado en revisión de cláusulas contractuales.
FORMATO JSON estricto:
{
  "overall_quality_score": 0-100,
  "clause_reviews": [{ "clause_name": "string", "validity": "valid|questionable|invalid", "risk_level": "low|medium|high", "issues": ["string"], "improvements": ["string"] }],
  "missing_mandatory_clauses": [{ "clause_type": "string", "regulation": "string" }],
  "summary": "string"
}`;
      userPrompt = `Revisa estas cláusulas: ${JSON.stringify(params)}`;

    } else if (action === 'ai_cnae_analysis') {
      systemPrompt = `Eres un experto en regulación laboral española por sectores CNAE. Conoces en profundidad los convenios colectivos, regulación sectorial (ET, PRL, LOPDGDD, Ley 10/2021, RD-Ley 32/2021), y las particularidades de cada sector económico español.

Analiza la situación de compliance y riesgos sectoriales de la organización multi-CNAE.

FORMATO JSON estricto:
{
  "sector_analysis": {
    "sectors_covered": number,
    "overall_maturity": "basic|intermediate|advanced|expert",
    "cross_sector_synergies": ["string"],
    "conflicting_requirements": ["string"]
  },
  "regulation_gaps": [{ "regulation": "string", "cnae_affected": "string", "gap": "string", "urgency": "critical|high|medium|low", "penalty_risk": "string" }],
  "benchmark_insights": [{ "metric": "string", "finding": "string", "recommendation": "string" }],
  "risk_recommendations": [{ "risk": "string", "current_level": "string", "recommended_action": "string", "expected_impact": "string", "timeline": "string" }],
  "action_plan": [{ "priority": number, "action": "string", "cnae": "string", "deadline": "string", "responsible": "string" }],
  "confidence": 0-100,
  "executive_summary": "string"
}`;
      userPrompt = `Analiza la inteligencia sectorial CNAE de esta organización:
- Perfiles CNAE: ${params?.profiles_count || 0}
- Regulaciones activas: ${params?.rules_count || 0}
- Benchmarks: ${params?.benchmarks_count || 0}
- Riesgos evaluados: ${params?.risks_count || 0} (alto riesgo: ${params?.high_risk_count || 0})
- Sectores: ${JSON.stringify(params?.profiles_summary || [])}
- Top riesgos: ${JSON.stringify(params?.top_risks || [])}`;

    } else if (action === 'ai_cnae_benchmarks') {
      systemPrompt = `Eres un analista de benchmarks sectoriales HR en España. Conoces los datos de INE, SEPE, FUNDAE, INSST y consultoras de RRHH.

Analiza los benchmarks del sector CNAE y genera recomendaciones de mejora.

FORMATO JSON estricto:
{
  "sector_position": "below_average|average|above_average|top_quartile",
  "key_findings": [{ "metric": "string", "finding": "string", "action": "string" }],
  "improvement_priorities": [{ "metric": "string", "current_gap": "string", "target": "string", "timeline": "string" }],
  "competitive_advantages": ["string"],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza benchmarks del sector CNAE ${params?.cnae_code}: ${JSON.stringify(params?.current_benchmarks || [])}`;

    } else if (action === 'ai_role_experience') {
      systemPrompt = `Eres un experto en UX empresarial y diseño de experiencias por rol organizacional. Analizas la madurez de personalización UX en plataformas HR enterprise.

FORMATO JSON estricto:
{
  "ux_maturity": "basic|intermediate|advanced|expert",
  "role_coverage": 0-100,
  "personalization_depth": "minimal|moderate|deep|comprehensive",
  "recommendations": [{ "area": "string", "suggestion": "string", "impact": "high|medium|low" }],
  "adoption_insights": [{ "role": "string", "adoption_rate": 0-100, "top_modules": ["string"] }],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza el ecosistema de experiencia por rol:
- Perfiles configurados: ${params?.profiles_count || 0} (activos: ${params?.active_count || 0})
- Roles: ${JSON.stringify(params?.roles || [])}
- Analytics de uso: ${JSON.stringify(params?.analytics_summary || [])}`;

    } else if (action === 'role_experience_seed_demo') {
      const profilesData = [
        { company_id, role_key: 'ceo', role_label: 'CEO / Director General', description: 'Vista ejecutiva con KPIs estratégicos y decisiones de alto nivel', is_active: true, visible_modules: ['dashboard', 'analytics-intelligence', 'workforce-planning', 'compensation-suite', 'esg-selfservice', 'digital-twin', 'fairness-engine'], quick_actions: [{ id: 'qa1', label: 'KPIs Ejecutivos', icon: 'TrendingUp', module: 'dashboard' }, { id: 'qa2', label: 'Workforce Planning', icon: 'Target', module: 'workforce-planning' }, { id: 'qa3', label: 'ESG Report', icon: 'Leaf', module: 'esg-selfservice' }], kpi_widgets: [{ id: 'kpi1', label: 'Headcount', metric_key: 'total_employees', format: 'number' }, { id: 'kpi2', label: 'Rotación', metric_key: 'turnover_rate', format: 'percentage' }, { id: 'kpi3', label: 'Coste Laboral', metric_key: 'labor_cost', format: 'currency' }] },
        { company_id, role_key: 'hr_director', role_label: 'Director/a de RRHH', description: 'Gestión integral del departamento con acceso a todos los módulos enterprise', is_active: true, visible_modules: ['dashboard', 'employees', 'payroll', 'contracts', 'recruitment', 'performance', 'training', 'analytics', 'compliance-enterprise', 'wellbeing-enterprise', 'compensation-suite', 'talent-intelligence', 'security-governance', 'ai-governance'], quick_actions: [{ id: 'qa1', label: 'Aprobar Nóminas', icon: 'DollarSign', module: 'payroll' }, { id: 'qa2', label: 'Compliance', icon: 'Shield', module: 'compliance-enterprise' }, { id: 'qa3', label: 'Talent Review', icon: 'Users', module: 'talent-intelligence' }, { id: 'qa4', label: 'Wellbeing', icon: 'Heart', module: 'wellbeing-enterprise' }], kpi_widgets: [{ id: 'kpi1', label: 'Pendientes', metric_key: 'pending_approvals', format: 'number' }, { id: 'kpi2', label: 'Compliance', metric_key: 'compliance_score', format: 'percentage' }, { id: 'kpi3', label: 'Satisfacción', metric_key: 'satisfaction', format: 'percentage' }, { id: 'kpi4', label: 'Vacantes', metric_key: 'open_positions', format: 'number' }] },
        { company_id, role_key: 'hr_manager', role_label: 'Responsable de RRHH', description: 'Operaciones diarias de RRHH con foco en gestión de personas', is_active: true, visible_modules: ['dashboard', 'employees', 'payroll', 'vacations', 'contracts', 'onboarding', 'offboarding', 'documents', 'time-clock', 'departments'], quick_actions: [{ id: 'qa1', label: 'Fichajes', icon: 'Calendar', module: 'time-clock' }, { id: 'qa2', label: 'Vacaciones', icon: 'Calendar', module: 'vacations' }, { id: 'qa3', label: 'Contratos', icon: 'FileText', module: 'contracts' }], kpi_widgets: [{ id: 'kpi1', label: 'Empleados', metric_key: 'total_employees', format: 'number' }, { id: 'kpi2', label: 'Vacaciones Pend.', metric_key: 'pending_vacations', format: 'number' }] },
        { company_id, role_key: 'team_lead', role_label: 'Team Lead / Responsable de Equipo', description: 'Vista de equipo con foco en rendimiento y disponibilidad', is_active: true, visible_modules: ['dashboard', 'vacations', 'performance', 'training', 'time-clock'], quick_actions: [{ id: 'qa1', label: 'Mi Equipo', icon: 'Users', module: 'employees' }, { id: 'qa2', label: 'Aprobar Vacaciones', icon: 'Calendar', module: 'vacations' }], kpi_widgets: [{ id: 'kpi1', label: 'Equipo', metric_key: 'team_size', format: 'number' }, { id: 'kpi2', label: 'Disponibilidad', metric_key: 'team_availability', format: 'percentage' }] },
        { company_id, role_key: 'employee', role_label: 'Empleado/a', description: 'Portal de autoservicio con acceso a datos propios', is_active: true, visible_modules: ['vacations', 'documents', 'time-clock', 'training', 'benefits'], quick_actions: [{ id: 'qa1', label: 'Solicitar Vacaciones', icon: 'Calendar', module: 'vacations' }, { id: 'qa2', label: 'Mis Documentos', icon: 'FolderOpen', module: 'documents' }, { id: 'qa3', label: 'Fichar', icon: 'Clock', module: 'time-clock' }], kpi_widgets: [{ id: 'kpi1', label: 'Días Vacaciones', metric_key: 'vacation_days', format: 'number' }, { id: 'kpi2', label: 'Formación', metric_key: 'training_hours', format: 'number' }] },
        { company_id, role_key: 'auditor', role_label: 'Auditor/a', description: 'Acceso de solo lectura para auditoría y compliance', is_active: true, visible_modules: ['audit-trail', 'compliance-enterprise', 'security-governance', 'ai-governance', 'legal-engine', 'cnae-intelligence'], quick_actions: [{ id: 'qa1', label: 'Audit Trail', icon: 'ClipboardList', module: 'audit-trail' }, { id: 'qa2', label: 'Compliance', icon: 'Shield', module: 'compliance-enterprise' }], kpi_widgets: [{ id: 'kpi1', label: 'Hallazgos', metric_key: 'audit_findings', format: 'number' }, { id: 'kpi2', label: 'Compliance', metric_key: 'compliance_score', format: 'percentage' }] },
      ];
      await supabase.from('erp_hr_role_experience_profiles').insert(profilesData as any);

      // Fetch inserted profiles to get IDs
      const { data: inserted } = await supabase.from('erp_hr_role_experience_profiles').select('id, role_key').eq('company_id', company_id);
      const profileMap: Record<string, string> = {};
      (inserted || []).forEach((p: any) => { profileMap[p.role_key] = p.id; });

      // Dashboards
      const dashboardsData = [
        { company_id, role_profile_id: profileMap['ceo'], dashboard_name: 'Executive Overview', dashboard_type: 'main', is_default: true, sort_order: 1, widgets: [{ id: 'w1', type: 'kpi', title: 'Headcount Total', config: {} }, { id: 'w2', type: 'chart', title: 'Evolución Plantilla', config: {} }, { id: 'w3', type: 'kpi', title: 'Coste Laboral', config: {} }, { id: 'w4', type: 'alerts', title: 'Alertas Críticas', config: {} }] },
        { company_id, role_profile_id: profileMap['hr_director'], dashboard_name: 'HR Command Center', dashboard_type: 'main', is_default: true, sort_order: 1, widgets: [{ id: 'w1', type: 'kpi', title: 'Aprobaciones Pendientes', config: {} }, { id: 'w2', type: 'list', title: 'Tareas Urgentes', config: {} }, { id: 'w3', type: 'chart', title: 'Métricas Clave', config: {} }, { id: 'w4', type: 'calendar', title: 'Agenda HR', config: {} }, { id: 'w5', type: 'actions', title: 'Acciones Rápidas', config: {} }] },
        { company_id, role_profile_id: profileMap['employee'], dashboard_name: 'Mi Portal', dashboard_type: 'self_service', is_default: true, sort_order: 1, widgets: [{ id: 'w1', type: 'kpi', title: 'Días Vacaciones', config: {} }, { id: 'w2', type: 'actions', title: 'Autoservicio', config: {} }, { id: 'w3', type: 'list', title: 'Mis Documentos', config: {} }] },
      ].filter(d => d.role_profile_id);
      if (dashboardsData.length > 0) await supabase.from('erp_hr_role_dashboards').insert(dashboardsData as any);

      // Onboarding steps
      const onboardingData = [
        ...(profileMap['employee'] ? [
          { company_id, role_profile_id: profileMap['employee'], step_order: 1, step_title: 'Bienvenida al Portal', step_description: 'Descubre tu portal de autoservicio personalizado', step_type: 'info', is_required: true, estimated_minutes: 2 },
          { company_id, role_profile_id: profileMap['employee'], step_order: 2, step_title: 'Fichar tu Jornada', step_description: 'Aprende a registrar tu entrada y salida', step_type: 'action', target_module: 'time-clock', is_required: true, estimated_minutes: 3 },
          { company_id, role_profile_id: profileMap['employee'], step_order: 3, step_title: 'Solicitar Vacaciones', step_description: 'Consulta tu saldo y realiza solicitudes', step_type: 'action', target_module: 'vacations', is_required: false, estimated_minutes: 5 },
          { company_id, role_profile_id: profileMap['employee'], step_order: 4, step_title: 'Documentos y Nóminas', step_description: 'Accede a tus recibos de nómina y documentos', step_type: 'action', target_module: 'documents', is_required: false, estimated_minutes: 3 },
        ] : []),
        ...(profileMap['hr_manager'] ? [
          { company_id, role_profile_id: profileMap['hr_manager'], step_order: 1, step_title: 'Tu Panel de Gestión', step_description: 'Conoce el dashboard con tus KPIs principales', step_type: 'info', is_required: true, estimated_minutes: 3 },
          { company_id, role_profile_id: profileMap['hr_manager'], step_order: 2, step_title: 'Gestión de Empleados', step_description: 'Altas, bajas y modificaciones de personal', step_type: 'action', target_module: 'employees', is_required: true, estimated_minutes: 5 },
          { company_id, role_profile_id: profileMap['hr_manager'], step_order: 3, step_title: 'Aprobación de Vacaciones', step_description: 'Gestiona las solicitudes de tu equipo', step_type: 'action', target_module: 'vacations', is_required: true, estimated_minutes: 3 },
        ] : []),
      ];
      if (onboardingData.length > 0) await supabase.from('erp_hr_role_onboarding').insert(onboardingData as any);

      // Analytics seed
      const analyticsData = [
        { company_id, role_key: 'hr_director', module_id: 'dashboard', action_type: 'view', usage_count: 245, avg_time_seconds: 120, period: '2026-03' },
        { company_id, role_key: 'hr_director', module_id: 'payroll', action_type: 'view', usage_count: 180, avg_time_seconds: 300, period: '2026-03' },
        { company_id, role_key: 'hr_director', module_id: 'compliance-enterprise', action_type: 'view', usage_count: 95, avg_time_seconds: 200, period: '2026-03' },
        { company_id, role_key: 'hr_manager', module_id: 'employees', action_type: 'view', usage_count: 320, avg_time_seconds: 180, period: '2026-03' },
        { company_id, role_key: 'hr_manager', module_id: 'vacations', action_type: 'approve', usage_count: 85, avg_time_seconds: 45, period: '2026-03' },
        { company_id, role_key: 'employee', module_id: 'time-clock', action_type: 'clock_in', usage_count: 480, avg_time_seconds: 5, period: '2026-03' },
        { company_id, role_key: 'employee', module_id: 'documents', action_type: 'download', usage_count: 156, avg_time_seconds: 30, period: '2026-03' },
        { company_id, role_key: 'ceo', module_id: 'analytics-intelligence', action_type: 'view', usage_count: 42, avg_time_seconds: 240, period: '2026-03' },
      ];
      await supabase.from('erp_hr_role_analytics').insert(analyticsData as any);

      return json({ success: true, data: { message: 'Role Experience demo data seeded' } });

    } else {
      throw new Error(`Acción no soportada: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.6, max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: 'Rate limit', message: 'Demasiadas solicitudes.' }, 429);
      if (response.status === 402) return json({ error: 'Payment required', message: 'Créditos insuficientes.' }, 402);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content, parseError: true };
    } catch { result = { rawContent: content, parseError: true }; }

    return json({ success: true, action, data: result, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[erp-hr-premium-intelligence] Error:', error);
    return json({ success: false, error: 'Internal server error' }, 500);
  }
});
