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

    // Tenant isolation via shared utility
    const tenantCompanyId = params?.company_id;
    if (!tenantCompanyId) {
      return validationError('company_id required', corsHeaders);
    }

    const authResult = await validateTenantAccess(req, tenantCompanyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    const { userClient } = authResult;

    console.log(`[compensation-suite] Action: ${action}, User: ${authResult.userId}`);

    let result: any = null;

    switch (action) {
      // ========== MERIT CYCLES ==========
      case 'list_merit_cycles': {
        const { company_id, fiscal_year } = params;
        let query = userClient.from('erp_hr_merit_cycles').select('*').eq('company_id', company_id).order('fiscal_year', { ascending: false });
        if (fiscal_year) query = query.eq('fiscal_year', fiscal_year);
        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_merit_cycle': {
        const { data, error } = await userClient.from('erp_hr_merit_cycles').upsert(params.cycle).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'list_merit_proposals': {
        const { cycle_id, company_id, status } = params;
        let query = userClient.from('erp_hr_merit_proposals').select('*');
        if (cycle_id) query = query.eq('cycle_id', cycle_id);
        if (company_id) query = query.eq('company_id', company_id);
        if (status) query = query.eq('status', status);
        query = query.order('employee_name');
        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_merit_proposal': {
        const { data, error } = await userClient.from('erp_hr_merit_proposals').upsert(params.proposal).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'bulk_create_proposals': {
        const { cycle_id, company_id } = params;
        const { data: employees, error: empError } = await userClient
          .from('erp_hr_employees')
          .select('id, first_name, last_name, department, position_title, base_salary, salary_band')
          .eq('company_id', company_id)
          .eq('status', 'active');
        if (empError) throw empError;

        const proposals = (employees || []).map((emp: any) => ({
          cycle_id,
          company_id,
          employee_id: emp.id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          position_title: emp.position_title,
          current_salary: emp.base_salary || 0,
          proposed_salary: emp.base_salary || 0,
          current_band: emp.salary_band,
          status: 'draft'
        }));

        if (proposals.length > 0) {
          const { data, error } = await userClient.from('erp_hr_merit_proposals').insert(proposals).select();
          if (error) throw error;
          result = { created: data?.length || 0 };
        } else {
          result = { created: 0 };
        }
        break;
      }

      // ========== BONUS CYCLES ==========
      case 'list_bonus_cycles': {
        const { company_id, fiscal_year } = params;
        let query = userClient.from('erp_hr_bonus_cycles').select('*').eq('company_id', company_id).order('fiscal_year', { ascending: false });
        if (fiscal_year) query = query.eq('fiscal_year', fiscal_year);
        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'upsert_bonus_cycle': {
        const { data, error } = await userClient.from('erp_hr_bonus_cycles').upsert(params.cycle).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'list_bonus_allocations': {
        const { cycle_id } = params;
        const { data, error } = await userClient.from('erp_hr_bonus_allocations').select('*').eq('cycle_id', cycle_id).order('employee_name');
        if (error) throw error;
        result = data;
        break;
      }

      // ========== SALARY LETTERS ==========
      case 'list_salary_letters': {
        const { company_id, status } = params;
        let query = userClient.from('erp_hr_salary_letters').select('*').eq('company_id', company_id).order('created_at', { ascending: false });
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      case 'generate_salary_letter': {
        const { data, error } = await userClient.from('erp_hr_salary_letters').insert(params.letter).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      // ========== PAY EQUITY ==========
      case 'run_pay_equity_analysis': {
        const { company_id } = params;
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const { data: employees } = await userClient
          .from('erp_hr_employees')
          .select('id, first_name, last_name, gender, department, position_title, base_salary, salary_band, hire_date')
          .eq('company_id', company_id)
          .eq('status', 'active');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un analista de equidad retributiva enterprise. Analiza datos de empleados y genera un informe de pay equity.

RESPONDE SOLO EN JSON con esta estructura:
{
  "gender_gap_percent": number,
  "gender_gap_adjusted": number,
  "median_male_salary": number,
  "median_female_salary": number,
  "mean_male_salary": number,
  "mean_female_salary": number,
  "anomalies_detected": number,
  "anomalies_detail": [{"employee": "name", "issue": "desc", "severity": "high|medium|low"}],
  "salary_compression_score": number (0-100, higher=more compressed),
  "compa_ratio_distribution": {"below_80": n, "80_90": n, "90_100": n, "100_110": n, "110_120": n, "above_120": n},
  "recommendations": ["text1", "text2"],
  "ai_narrative": "Narrative paragraph in Spanish"
}`
              },
              {
                role: 'user',
                content: `Analiza estos ${(employees || []).length} empleados:\n${JSON.stringify((employees || []).map(e => ({
                  name: `${e.first_name} ${e.last_name}`,
                  gender: e.gender,
                  dept: e.department,
                  position: e.position_title,
                  salary: e.base_salary,
                  band: e.salary_band,
                  hire_date: e.hire_date
                })))}`
              }
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        let analysis;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch { analysis = {}; }

        const snapshot = {
          company_id,
          total_employees_analyzed: (employees || []).length,
          gender_gap_percent: analysis.gender_gap_percent,
          gender_gap_adjusted: analysis.gender_gap_adjusted,
          median_male_salary: analysis.median_male_salary,
          median_female_salary: analysis.median_female_salary,
          mean_male_salary: analysis.mean_male_salary,
          mean_female_salary: analysis.mean_female_salary,
          anomalies_detected: analysis.anomalies_detected || 0,
          anomalies_detail: analysis.anomalies_detail || [],
          salary_compression_score: analysis.salary_compression_score,
          compa_ratio_distribution: analysis.compa_ratio_distribution || {},
          band_distribution: analysis.band_distribution || {},
          recommendations: analysis.recommendations || [],
          ai_narrative: analysis.ai_narrative
        };

        const { data, error } = await userClient.from('erp_hr_pay_equity_snapshots').insert(snapshot).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'list_pay_equity_snapshots': {
        const { company_id } = params;
        const { data, error } = await userClient.from('erp_hr_pay_equity_snapshots').select('*').eq('company_id', company_id).order('analysis_date', { ascending: false }).limit(10);
        if (error) throw error;
        result = data;
        break;
      }

      // ========== COMPENSATION STATS ==========
      case 'get_compensation_stats': {
        const { company_id } = params;
        const [meritRes, bonusRes, lettersRes, equityRes] = await Promise.all([
          userClient.from('erp_hr_merit_cycles').select('*').eq('company_id', company_id).order('fiscal_year', { ascending: false }).limit(5),
          userClient.from('erp_hr_bonus_cycles').select('*').eq('company_id', company_id).order('fiscal_year', { ascending: false }).limit(5),
          userClient.from('erp_hr_salary_letters').select('id, status', { count: 'exact' }).eq('company_id', company_id),
          userClient.from('erp_hr_pay_equity_snapshots').select('*').eq('company_id', company_id).order('analysis_date', { ascending: false }).limit(1),
        ]);

        result = {
          meritCycles: meritRes.data || [],
          bonusCycles: bonusRes.data || [],
          totalLetters: lettersRes.count || 0,
          latestEquity: equityRes.data?.[0] || null,
        };
        break;
      }

      // ========== SEED DATA ==========
      case 'seed_compensation_data': {
        const { company_id } = params;
        
        const { data: meritCycle } = await userClient.from('erp_hr_merit_cycles').insert({
          company_id,
          name: 'Revisión Salarial 2026',
          fiscal_year: 2026,
          status: 'open',
          budget_percent: 3.5,
          budget_amount: 150000,
          start_date: '2026-01-15',
          end_date: '2026-03-31',
          effective_date: '2026-04-01',
          guidelines: {
            min_increase: 1.5,
            max_increase: 8.0,
            performance_weight: 0.6,
            market_weight: 0.3,
            tenure_weight: 0.1
          }
        }).select().single();

        await userClient.from('erp_hr_bonus_cycles').insert({
          company_id,
          name: 'Bonus Anual 2025',
          fiscal_year: 2025,
          bonus_type: 'annual',
          status: 'approved',
          target_pool: 200000,
          actual_pool: 185000,
          distribution_method: 'performance',
          performance_weight: 0.60,
          period_start: '2025-01-01',
          period_end: '2025-12-31',
          payment_date: '2026-03-15'
        });

        const rewardsConfig = [
          { company_id, component_name: 'Salario Base', component_category: 'base_salary', display_order: 1, icon: 'Wallet', color: '#3b82f6' },
          { company_id, component_name: 'Bonus Anual', component_category: 'variable', display_order: 2, icon: 'Gift', color: '#22c55e' },
          { company_id, component_name: 'Comisiones', component_category: 'variable', display_order: 3, icon: 'TrendingUp', color: '#10b981' },
          { company_id, component_name: 'Seguro Médico', component_category: 'benefits', display_order: 4, icon: 'Heart', color: '#ef4444' },
          { company_id, component_name: 'Plan de Pensiones', component_category: 'retirement', display_order: 5, icon: 'Landmark', color: '#8b5cf6' },
          { company_id, component_name: 'Ticket Restaurante', component_category: 'perks', display_order: 6, icon: 'UtensilsCrossed', color: '#f59e0b' },
          { company_id, component_name: 'Coche Empresa', component_category: 'perks', display_order: 7, icon: 'Car', color: '#f97316' },
          { company_id, component_name: 'Formación', component_category: 'development', display_order: 8, icon: 'GraduationCap', color: '#06b6d4' },
          { company_id, component_name: 'Seguridad Social Empresa', component_category: 'social_security', display_order: 9, icon: 'Shield', color: '#64748b' },
        ];
        await userClient.from('erp_hr_total_rewards_config').insert(rewardsConfig);

        result = { seeded: true, meritCycleId: meritCycle?.id };
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[compensation-suite] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});