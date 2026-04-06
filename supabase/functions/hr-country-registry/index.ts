import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface RequestBody {
  action: string;
  companyId?: string;
  countryCode?: string;
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, companyId, countryCode, data, params } = await req.json() as RequestBody;

    switch (action) {
      // ==================== COUNTRY REGISTRY ====================
      case 'list_countries': {
        const { data: countries, error } = await supabase
          .from('hr_country_registry')
          .select('*')
          .eq('company_id', companyId)
          .order('country_name');
        if (error) throw error;
        return jsonResponse({ success: true, countries: countries || [] });
      }

      case 'upsert_country': {
        const record = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        const { data: country, error } = await supabase
          .from('hr_country_registry')
          .upsert(record, { onConflict: 'company_id,country_code' })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, country });
      }

      case 'toggle_country': {
        const { data: updated, error } = await supabase
          .from('hr_country_registry')
          .update({ is_enabled: data?.is_enabled, updated_at: new Date().toISOString() })
          .eq('id', data?.id)
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, country: updated });
      }

      // ==================== POLICIES ====================
      case 'list_policies': {
        let query = supabase
          .from('hr_country_policies')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('priority', { ascending: false });
        if (countryCode) query = query.eq('country_code', countryCode);
        if (params?.policy_type) query = query.eq('policy_type', params.policy_type as string);
        const { data: policies, error } = await query;
        if (error) throw error;
        return jsonResponse({ success: true, policies: policies || [] });
      }

      case 'upsert_policy': {
        const record = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        const { data: policy, error } = await supabase
          .from('hr_country_policies')
          .upsert(record)
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, policy });
      }

      case 'resolve_policy': {
        // Resolution: employee > center > entity > country (highest priority wins)
        const { employee_id, policy_type, policy_key } = params as Record<string, string>;
        
        // Get employee's country
        const { data: emp } = await supabase
          .from('erp_hr_employees')
          .select('country_code, department_id')
          .eq('id', employee_id)
          .single();
        
        const cc = emp?.country_code || 'ES';
        
        const { data: policies, error } = await supabase
          .from('hr_country_policies')
          .select('*')
          .eq('company_id', companyId)
          .eq('country_code', cc)
          .eq('policy_type', policy_type)
          .eq('policy_key', policy_key)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        return jsonResponse({ success: true, resolved_policy: policies?.[0] || null, country_code: cc });
      }

      // ==================== EMPLOYEE EXTENSIONS ====================
      case 'get_employee_extension': {
        const { data: ext, error } = await supabase
          .from('hr_employee_extensions')
          .select('*')
          .eq('employee_id', params?.employee_id as string)
          .eq('country_code', countryCode || 'ES')
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ success: true, extension: ext });
      }

      case 'upsert_employee_extension': {
        const record = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        const { data: ext, error } = await supabase
          .from('hr_employee_extensions')
          .upsert(record, { onConflict: 'employee_id,country_code' })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, extension: ext });
      }

      case 'list_extensions_by_country': {
        const { data: exts, error } = await supabase
          .from('hr_employee_extensions')
          .select('*')
          .eq('company_id', companyId)
          .eq('country_code', countryCode || 'ES');
        if (error) throw error;
        return jsonResponse({ success: true, extensions: exts || [] });
      }

      // ==================== STATS ====================
      case 'get_stats': {
        const { data: countries } = await supabase
          .from('hr_country_registry')
          .select('id, is_enabled')
          .eq('company_id', companyId);
        
        const { data: policies } = await supabase
          .from('hr_country_policies')
          .select('id, policy_type')
          .eq('company_id', companyId)
          .eq('is_active', true);
        
        const { data: extensions } = await supabase
          .from('hr_employee_extensions')
          .select('id')
          .eq('company_id', companyId);

        const enabled = (countries || []).filter(c => c.is_enabled).length;
        const policyTypes = [...new Set((policies || []).map(p => p.policy_type))];

        return jsonResponse({
          success: true,
          stats: {
            total_countries: countries?.length || 0,
            enabled_countries: enabled,
            total_policies: policies?.length || 0,
            policy_types: policyTypes,
            total_extensions: extensions?.length || 0,
          }
        });
      }

      // ==================== SEED DATA ====================
      case 'seed_defaults': {
        // Seed Spain as default country
        const spainDefaults = {
          company_id: companyId,
          country_code: 'ES',
          country_name: 'España',
          is_enabled: true,
          currency_code: 'EUR',
          language_code: 'es',
          timezone: 'Europe/Madrid',
          date_format: 'DD/MM/YYYY',
          nif_format: '^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$',
          nif_label: 'NIF/NIE',
          fiscal_year_start: 1,
          social_security_system: 'TGSS',
          labor_law_framework: 'Estatuto de los Trabajadores (RDL 2/2015)',
          min_wage_annual: 15876.00,
          max_working_hours_week: 40,
          min_vacation_days: 22,
          probation_max_days: 180,
          notice_period_default_days: 15,
          severance_formula: '20d/year (objective) or 33d/year (unfair)',
          metadata: {
            autonomous_communities: 17,
            collective_agreement_system: true,
            siltra_integration: true,
            aeat_models: ['111', '190', '296'],
          }
        };

        const { error: countryErr } = await supabase
          .from('hr_country_registry')
          .upsert(spainDefaults, { onConflict: 'company_id,country_code' });
        if (countryErr) throw countryErr;

        // Seed basic policies for Spain
        const defaultPolicies = [
          {
            company_id: companyId, country_code: 'ES', policy_type: 'tax',
            policy_key: 'irpf_calculation_method', scope_level: 'country', priority: 0,
            policy_value: { method: 'progressive', brackets: '2026', includes_ccaa: true },
            description: 'Método de cálculo IRPF estatal + autonómico',
            legal_reference: 'Ley 35/2006 IRPF',
          },
          {
            company_id: companyId, country_code: 'ES', policy_type: 'social_security',
            policy_key: 'contribution_bases', scope_level: 'country', priority: 0,
            policy_value: { min_base: 1260, max_base: 4720.50, mei_rate: 0.70, groups: 11 },
            description: 'Bases de cotización TGSS 2026',
            legal_reference: 'Orden ISM/2024 cotización',
          },
          {
            company_id: companyId, country_code: 'ES', policy_type: 'leave',
            policy_key: 'annual_vacation', scope_level: 'country', priority: 0,
            policy_value: { days: 22, type: 'business_days', accrual: 'monthly' },
            description: 'Vacaciones mínimas por ley',
            legal_reference: 'Art. 38 ET',
          },
          {
            company_id: companyId, country_code: 'ES', policy_type: 'contract',
            policy_key: 'probation_period', scope_level: 'country', priority: 0,
            policy_value: { max_days_qualified: 180, max_days_unqualified: 60, max_days_temporary: 30 },
            description: 'Períodos de prueba máximos',
            legal_reference: 'Art. 14 ET',
          },
          {
            company_id: companyId, country_code: 'ES', policy_type: 'working_time',
            policy_key: 'max_hours', scope_level: 'country', priority: 0,
            policy_value: { weekly: 40, daily: 9, overtime_max_annual: 80, rest_between_shifts_hours: 12 },
            description: 'Jornada máxima legal',
            legal_reference: 'Art. 34 ET',
          },
        ];

        for (const policy of defaultPolicies) {
          await supabase.from('hr_country_policies').upsert(policy);
        }

        return jsonResponse({ success: true, message: 'Spain defaults seeded' });
      }

      // ==================== AI ANALYSIS ====================
      case 'analyze_compliance': {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const { data: countries } = await supabase
          .from('hr_country_registry')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_enabled', true);

        const { data: policies } = await supabase
          .from('hr_country_policies')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true);

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
                content: `Eres un experto en compliance laboral internacional. Analiza la configuración de países y políticas HR de una empresa y devuelve un análisis en JSON estricto:
{
  "overall_score": 0-100,
  "countries_analysis": [{ "country_code": "", "completeness": 0-100, "missing_policies": [], "risks": [] }],
  "recommendations": [{ "priority": "high|medium|low", "area": "", "action": "", "legal_reference": "" }],
  "gaps": [{ "country": "", "gap_type": "", "description": "", "severity": "critical|high|medium|low" }]
}`
              },
              {
                role: 'user',
                content: `Países configurados: ${JSON.stringify(countries)}\n\nPolíticas activas: ${JSON.stringify(policies)}`
              }
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) throw new Error(`AI API error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        let analysis;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
        } catch {
          analysis = { rawContent: content };
        }

        return jsonResponse({ success: true, analysis });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[hr-country-registry] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function jsonResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
