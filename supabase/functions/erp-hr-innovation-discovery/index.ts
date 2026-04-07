/**
 * erp-hr-innovation-discovery - Descubrimiento de tendencias HR 2026+
 * Búsqueda periódica de ideas innovadoras + implementación de features
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface InnovationRequest {
  action: 'discover_trends' | 'get_pending_ideas' | 'implement_feature' | 
          'approve_idea' | 'reject_idea' | 'get_features_status';
  company_id: string;
  feature_code?: string;
  idea_id?: string;
  config?: Record<string, unknown>;
  reason?: string;
}

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json() as InnovationRequest;
    const { action, company_id, feature_code, idea_id, config, reason } = body;

    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tenant isolation
    const { data: membership } = await adminClient
      .from('erp_user_companies').select('id')
      .eq('user_id', userId).eq('company_id', company_id)
      .eq('is_active', true).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[erp-hr-innovation-discovery] Action: ${action}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'discover_trends': {
        const systemPrompt = `Eres un experto en tendencias de Recursos Humanos y tecnología HR.

Tu tarea es identificar 5 tendencias innovadoras REALES y ACTUALES para departamentos de RRHH.

CATEGORÍAS:
- ai: Inteligencia Artificial aplicada a HR
- analytics: People Analytics y métricas
- wellbeing: Bienestar y salud mental
- automation: Automatización de procesos
- engagement: Compromiso y retención

FORMATO DE RESPUESTA (JSON estricto):
{
  "trends": [
    {
      "title": "Nombre de la tendencia",
      "description": "Descripción de 50-100 palabras",
      "category": "ai|analytics|wellbeing|automation|engagement",
      "relevance_score": 50-100,
      "potential_impact": "high|medium|low",
      "implementation_complexity": "low|medium|high|very_high",
      "source": "ai_discovery",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

        const userPrompt = `Identifica las 5 tendencias más innovadoras y relevantes para RRHH en 2026, 
        enfocándote en tecnologías emergentes, bienestar laboral y automatización inteligente.
        
        Prioriza ideas que:
        1. Sean implementables en empresas medianas
        2. Tengan alto impacto en productividad o bienestar
        3. Utilicen IA o analytics avanzados`;

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
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        let trends = [];
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            trends = parsed.trends || [];
          }
        } catch (parseError) {
          console.error('Parse error:', parseError);
        }

        if (trends.length > 0 && company_id) {
          const ideasToInsert = trends.map((t: any) => ({
            company_id,
            title: t.title,
            description: t.description,
            source: 'ai_discovery',
            category: t.category,
            relevance_score: t.relevance_score || 70,
            potential_impact: t.potential_impact,
            implementation_complexity: t.implementation_complexity,
            tags: t.tags || [],
            metadata: { discovered_by: 'ai', model: 'gemini-2.5-flash' }
          }));

          await adminClient.from('erp_hr_innovation_ideas').insert(ideasToInsert);
        }

        result = { 
          trends,
          discovered_count: trends.length,
          timestamp: new Date().toISOString()
        };
        break;
      }

      case 'get_pending_ideas': {
        const { data } = await adminClient
          .from('erp_hr_innovation_ideas')
          .select('*')
          .eq('company_id', company_id)
          .eq('is_reviewed', false)
          .eq('is_rejected', false)
          .order('relevance_score', { ascending: false })
          .limit(20);

        result = { ideas: data || [], count: data?.length || 0 };
        break;
      }

      case 'get_features_status': {
        const { data: features } = await adminClient
          .from('erp_hr_innovation_features')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false });

        const implemented = features?.filter(f => f.is_implemented) || [];
        const available = features?.filter(f => !f.is_implemented) || [];

        result = { 
          features: features || [], 
          implemented_count: implemented.length,
          available_count: available.length
        };
        break;
      }

      case 'implement_feature': {
        if (!feature_code || !company_id) {
          throw new Error('feature_code and company_id required');
        }

        const { data: existing } = await adminClient
          .from('erp_hr_innovation_features')
          .select('*')
          .eq('company_id', company_id)
          .eq('feature_code', feature_code)
          .single();

        if (existing?.is_implemented) {
          result = { success: false, message: 'Feature already implemented' };
          break;
        }

        const featureData = {
          company_id,
          feature_code,
          feature_name: config?.feature_name || feature_code,
          description: config?.description || '',
          category: config?.category || 'general',
          implementation_status: 'implementing',
          implementation_config: config || {}
        };

        if (existing) {
          await adminClient
            .from('erp_hr_innovation_features')
            .update({
              implementation_status: 'implementing',
              implementation_config: config || {}
            })
            .eq('id', existing.id);
        } else {
          await adminClient
            .from('erp_hr_innovation_features')
            .insert([featureData]);
        }

        await adminClient.from('erp_hr_innovation_logs').insert([{
          feature_id: existing?.id,
          company_id,
          action: 'started',
          progress_percentage: 0,
          status_message: `Implementación de ${feature_code} iniciada`
        }]);

        setTimeout(async () => {
          await adminClient
            .from('erp_hr_innovation_features')
            .update({
              is_implemented: true,
              implemented_at: new Date().toISOString(),
              implementation_status: 'implemented'
            })
            .eq('company_id', company_id)
            .eq('feature_code', feature_code);

          await adminClient.from('erp_hr_innovation_logs').insert([{
            company_id,
            action: 'completed',
            progress_percentage: 100,
            status_message: `${feature_code} implementado correctamente`
          }]);
        }, 3000);

        result = { 
          success: true, 
          message: 'Implementación iniciada',
          feature_code,
          status: 'implementing'
        };
        break;
      }

      case 'approve_idea': {
        if (!idea_id) throw new Error('idea_id required');

        await adminClient
          .from('erp_hr_innovation_ideas')
          .update({
            is_reviewed: true,
            is_approved: true,
            approved_at: new Date().toISOString()
          })
          .eq('id', idea_id);

        result = { success: true, message: 'Idea aprobada' };
        break;
      }

      case 'reject_idea': {
        if (!idea_id) throw new Error('idea_id required');

        await adminClient
          .from('erp_hr_innovation_ideas')
          .update({
            is_reviewed: true,
            is_rejected: true,
            rejection_reason: reason || 'No especificado'
          })
          .eq('id', idea_id);

        result = { success: true, message: 'Idea rechazada' };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-innovation-discovery] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});