import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH GATE: validateAuth(req) — require authenticated user for all actions ===
    const authResult = await validateAuth(req);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authenticatedUserId = authResult.userId;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // service_role client for global catalog ops (legitimate exception — not tenant-scoped)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, entity_type, category } = await req.json();

    if (action === 'get_rules') {
      // Read-only global catalog — service_role justified (no user-scoped RLS on this table)
      let query = supabase.from('erp_entity_type_rules').select('*');
      if (entity_type) query = query.eq('entity_type', entity_type);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_knowledge') {
      // Read-only global catalog — service_role justified (no user-scoped RLS on this table)
      let query = supabase.from('erp_legal_knowledge_base').select('*').eq('is_active', true);
      if (entity_type) query = query.contains('applicable_entity_types', [entity_type]);
      if (category) query = query.eq('category', category);
      const { data, error } = await query.order('importance', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'expand_knowledge') {
      // === ADMIN ROLE CHECK: expand_knowledge is an admin-level write operation ===
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authenticatedUserId);

      if (roleError) {
        console.error('[erp-legal-knowledge-loader] Role check failed:', roleError.message);
        return new Response(JSON.stringify({ error: 'Authorization check failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userRoles = (roles || []).map(r => r.role);
      const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin');
      if (!isAdmin) {
        console.warn(`[erp-legal-knowledge-loader] User ${authenticatedUserId} lacks admin role for expand_knowledge. Roles: ${userRoles.join(',')}`);
        return new Response(JSON.stringify({ error: 'Insufficient permissions: admin role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use AI to generate additional legal knowledge for a given entity type
      const targetType = entity_type || 'all';

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
              content: `Eres un experto jurídico español especializado en derecho mercantil, fiscal y societario. 
Genera conocimiento legal detallado y preciso sobre tipologías de entidades empresariales en España.
FORMATO DE RESPUESTA: JSON array con objetos que tengan:
- category: categoría general
- subcategory: subcategoría  
- title: título descriptivo
- content: contenido legal detallado (mín 200 caracteres)
- law_code: código de la ley
- law_name: nombre de la ley
- articles: array de artículos aplicables
- boe_reference: referencia BOE
- applicable_entity_types: array de tipos de entidad aplicables
- tags: array de etiquetas
- importance: "critical" | "high" | "medium" | "low"
Genera entre 5-10 entradas de conocimiento.`
            },
            {
              role: 'user',
              content: `Genera conocimiento legal actualizado a 2026 para el tipo de entidad: ${targetType}. 
Incluye: obligaciones registrales, fiscales, laborales, contables, de gobierno corporativo y compliance. 
Incluye leyes vigentes con referencias BOE exactas.`
            }
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (status === 402) return new Response(JSON.stringify({ error: 'Credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (!content) throw new Error('No AI content');

      let entries;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        entries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        entries = [];
      }

      // Insert into knowledge base — service_role justified (global catalog write)
      let inserted = 0;
      for (const entry of entries) {
        const { error } = await supabase.from('erp_legal_knowledge_base').insert({
          category: entry.category || 'general',
          subcategory: entry.subcategory,
          title: entry.title,
          content: entry.content,
          law_code: entry.law_code,
          law_name: entry.law_name,
          articles: entry.articles || [],
          boe_reference: entry.boe_reference,
          applicable_entity_types: entry.applicable_entity_types || [],
          tags: entry.tags || [],
          importance: entry.importance || 'medium',
        });
        if (!error) inserted++;
      }

      return new Response(JSON.stringify({ success: true, inserted, total: entries.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[erp-legal-knowledge-loader] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});