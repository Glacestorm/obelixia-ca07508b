import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth gate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { action, params } = await req.json();
    console.log(`[talent-intelligence] Action: ${action}`);

    // Tenant isolation
    const tenantCompanyId = params?.company_id;
    if (tenantCompanyId) {
      const { data: membership } = await adminClient
        .from('erp_user_companies').select('id')
        .eq('user_id', userId).eq('company_id', tenantCompanyId)
        .eq('is_active', true).maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let result: any = null;

    switch (action) {
      // ========== SKILL GRAPH ==========
      case 'list_skills': {
        const { company_id } = params;
        const { data, error } = await supabase.from('erp_hr_skill_graph')
          .select('*').eq('company_id', company_id).eq('is_active', true)
          .order('category').order('name');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_skill': {
        const { data, error } = await supabase.from('erp_hr_skill_graph')
          .upsert(params.skill).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      // ========== ROLE-SKILL MAPPING ==========
      case 'list_role_mappings': {
        const { company_id, role_name } = params;
        let query = supabase.from('erp_hr_role_skill_mapping').select('*').eq('company_id', company_id);
        if (role_name) query = query.eq('role_name', role_name);
        const { data, error } = await query.order('role_name');
        if (error) throw error;
        result = data;
        break;
      }

      // ========== CAREER PATHS ==========
      case 'list_career_paths': {
        const { company_id } = params;
        const { data, error } = await supabase.from('erp_hr_career_paths')
          .select('*').eq('company_id', company_id).eq('is_active', true).order('from_role');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_career_path': {
        const { data, error } = await supabase.from('erp_hr_career_paths')
          .upsert(params.path).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      // ========== TALENT POOLS ==========
      case 'list_talent_pools': {
        const { company_id } = params;
        const { data, error } = await supabase.from('erp_hr_talent_pools')
          .select('*').eq('company_id', company_id).eq('is_active', true).order('name');
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_talent_pool': {
        const { data, error } = await supabase.from('erp_hr_talent_pools')
          .upsert(params.pool).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      // ========== MENTORING ==========
      case 'list_mentoring': {
        const { company_id } = params;
        const { data, error } = await supabase.from('erp_hr_mentoring_matches')
          .select('*').eq('company_id', company_id).order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      // ========== GIG ASSIGNMENTS ==========
      case 'list_gigs': {
        const { company_id, status } = params;
        let query = supabase.from('erp_hr_gig_assignments').select('*').eq('company_id', company_id);
        if (status) query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      // ========== AI ANALYSIS ==========
      case 'analyze_gap': {
        const { company_id } = params;
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const [empRes, skillRes, succRes] = await Promise.all([
          supabase.from('erp_hr_employees').select('id, first_name, last_name, department, position_title, base_salary, hire_date, status').eq('company_id', company_id).eq('status', 'active'),
          supabase.from('erp_hr_skill_graph').select('*').eq('company_id', company_id).eq('is_active', true),
          supabase.from('erp_hr_succession_positions').select('*').eq('company_id', company_id),
        ]);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un analista de Talent Intelligence enterprise. Analiza la organización y genera insights.

RESPONDE SOLO EN JSON:
{
  "bench_strength": {"strong": n, "adequate": n, "weak": n, "critical": n},
  "readiness_map": [{"role": "str", "ready_now": n, "ready_1yr": n, "ready_2yr": n, "gap": "str"}],
  "critical_roles_at_risk": [{"role": "str", "risk": "high|medium|low", "reason": "str", "impact": "str"}],
  "flight_risk_employees": [{"name": "str", "role": "str", "risk_score": n, "factors": ["str"]}],
  "skill_gaps": [{"skill": "str", "current_coverage": n, "target_coverage": n, "gap_severity": "str", "recommendation": "str"}],
  "mobility_pipeline": {"internal_moves_potential": n, "cross_dept_candidates": n, "promotion_ready": n},
  "high_potential_indicators": [{"name": "str", "dept": "str", "indicators": ["str"], "recommended_pool": "str"}],
  "ai_narrative": "Executive summary paragraph in Spanish"
}`
              },
              {
                role: 'user',
                content: `Analiza: ${(empRes.data || []).length} empleados, ${(skillRes.data || []).length} skills, ${(succRes.data || []).length} posiciones de sucesión.\nEmpleados: ${JSON.stringify((empRes.data || []).slice(0, 30).map(e => ({ name: `${e.first_name} ${e.last_name}`, dept: e.department, position: e.position_title, salary: e.base_salary, hire: e.hire_date })))}\nSkills: ${JSON.stringify((skillRes.data || []).map(s => ({ name: s.name, category: s.category, core: s.is_core })))}\nSucesión: ${JSON.stringify(succRes.data || [])}`
              }
            ],
            temperature: 0.4,
            max_tokens: 3000,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content || '';

        let analysis;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch { analysis = { parseError: true, raw: content.substring(0, 500) }; }

        result = analysis;
        break;
      }

      case 'ai_mentoring_match': {
        const { company_id } = params;
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const { data: employees } = await supabase.from('erp_hr_employees')
          .select('id, first_name, last_name, department, position_title, hire_date')
          .eq('company_id', company_id).eq('status', 'active');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Genera pares mentor-mentee óptimos basándote en departamento, antigüedad y posición.
RESPONDE SOLO JSON: { "matches": [{"mentor_name": "str", "mentee_name": "str", "compatibility_score": n, "focus_areas": ["str"], "reason": "str"}] }`
              },
              { role: 'user', content: `Empleados: ${JSON.stringify((employees || []).map(e => ({ name: `${e.first_name} ${e.last_name}`, dept: e.department, pos: e.position_title, since: e.hire_date })))}` }
            ],
            temperature: 0.5,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        let matches;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          matches = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch { matches = {}; }

        result = matches;
        break;
      }

      // ========== STATS ==========
      case 'get_talent_stats': {
        const { company_id } = params;
        const [skillsRes, poolsRes, pathsRes, mentoringRes, gigsRes] = await Promise.all([
          supabase.from('erp_hr_skill_graph').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          supabase.from('erp_hr_talent_pools').select('*').eq('company_id', company_id).eq('is_active', true),
          supabase.from('erp_hr_career_paths').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          supabase.from('erp_hr_mentoring_matches').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'active'),
          supabase.from('erp_hr_gig_assignments').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'open'),
        ]);

        result = {
          totalSkills: skillsRes.count || 0,
          talentPools: poolsRes.data || [],
          totalPaths: pathsRes.count || 0,
          activeMentoring: mentoringRes.count || 0,
          openGigs: gigsRes.count || 0,
        };
        break;
      }

      // ========== SEED ==========
      case 'seed_talent_data': {
        const { company_id } = params;

        // Seed skills
        const skills = [
          { company_id, name: 'Liderazgo', category: 'leadership', skill_type: 'soft', is_core: true, market_demand: 'high', icon: 'Users' },
          { company_id, name: 'Gestión de Proyectos', category: 'management', skill_type: 'hard', is_core: true, market_demand: 'high', icon: 'Target' },
          { company_id, name: 'Análisis de Datos', category: 'technical', skill_type: 'hard', is_core: false, market_demand: 'high', icon: 'BarChart3' },
          { company_id, name: 'Python', category: 'technical', skill_type: 'hard', is_core: false, market_demand: 'high', icon: 'Code' },
          { company_id, name: 'SQL', category: 'technical', skill_type: 'hard', is_core: false, market_demand: 'high', icon: 'Database' },
          { company_id, name: 'Comunicación', category: 'soft_skills', skill_type: 'soft', is_core: true, market_demand: 'high', icon: 'MessageSquare' },
          { company_id, name: 'Negociación', category: 'soft_skills', skill_type: 'soft', is_core: false, market_demand: 'medium', icon: 'Handshake' },
          { company_id, name: 'Excel Avanzado', category: 'technical', skill_type: 'hard', is_core: false, market_demand: 'medium', icon: 'Table' },
          { company_id, name: 'Derecho Laboral', category: 'legal', skill_type: 'hard', is_core: false, market_demand: 'medium', icon: 'Scale' },
          { company_id, name: 'Inteligencia Artificial', category: 'technical', skill_type: 'hard', is_core: false, market_demand: 'high', obsolescence_risk: 'low', icon: 'Brain' },
          { company_id, name: 'Contabilidad IFRS', category: 'finance', skill_type: 'hard', is_core: false, market_demand: 'medium', icon: 'Calculator' },
          { company_id, name: 'Gestión del Cambio', category: 'management', skill_type: 'soft', is_core: true, market_demand: 'high', icon: 'RefreshCw' },
        ];
        await supabase.from('erp_hr_skill_graph').insert(skills);

        // Seed career paths
        const paths = [
          { company_id, name: 'Analista → Senior', from_role: 'Analista', to_role: 'Analista Senior', path_type: 'vertical', avg_time_months: 24, typical_salary_increase_percent: 15, required_experience_years: 2, department: 'Finanzas' },
          { company_id, name: 'Senior → Manager', from_role: 'Analista Senior', to_role: 'Manager', path_type: 'vertical', avg_time_months: 36, typical_salary_increase_percent: 25, required_experience_years: 4, department: 'Finanzas' },
          { company_id, name: 'Manager → Director', from_role: 'Manager', to_role: 'Director', path_type: 'vertical', avg_time_months: 48, typical_salary_increase_percent: 35, required_experience_years: 7 },
          { company_id, name: 'Técnico → Lead', from_role: 'Técnico', to_role: 'Tech Lead', path_type: 'vertical', avg_time_months: 30, typical_salary_increase_percent: 20, required_experience_years: 3, department: 'IT' },
          { company_id, name: 'Finanzas → Operaciones', from_role: 'Analista Financiero', to_role: 'Controller Operaciones', path_type: 'lateral', avg_time_months: 18, typical_salary_increase_percent: 10 },
        ];
        await supabase.from('erp_hr_career_paths').insert(paths);

        // Seed talent pools
        const pools = [
          { company_id, name: 'High Potentials', pool_type: 'high_potential', description: 'Empleados con alto potencial de crecimiento', member_count: 0, review_frequency: 'quarterly' },
          { company_id, name: 'Ready Now', pool_type: 'ready_now', description: 'Preparados para promoción inmediata', member_count: 0, review_frequency: 'monthly' },
          { company_id, name: 'Future Leaders', pool_type: 'future_leaders', description: 'Pipeline de liderazgo a 2-3 años', member_count: 0, review_frequency: 'semi_annual' },
          { company_id, name: 'Critical Skills', pool_type: 'critical_skills', description: 'Poseedores de competencias críticas escasas', member_count: 0, review_frequency: 'quarterly' },
        ];
        await supabase.from('erp_hr_talent_pools').insert(pools);

        result = { seeded: true };
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[talent-intelligence] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
