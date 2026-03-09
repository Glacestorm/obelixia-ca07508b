import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Energy News & Regulation Ingestion
 * 
 * Sources:
 * - CNMC: https://www.cnmc.es/ambitos-de-actuacion/energia
 * - BOE: https://www.boe.es/diario_boe/
 * - IDAE: https://www.idae.es/
 * - REE: https://www.ree.es/
 * - OMIE: https://www.omie.es/
 * - MITECO: https://www.miteco.gob.es/
 * 
 * Actions:
 * - search_news: AI-assisted search with source verification
 * - ingest_regulation: Manual/semi-auto regulation entry
 * - enrich: AI enrichment of existing entries
 * - list: Get stored news/regulations
 */

interface NewsRequest {
  action: 'search_news' | 'ingest_regulation' | 'enrich' | 'list' | 'search_regulations';
  query?: string;
  regulation?: {
    title: string;
    source_name: string;
    source_url?: string;
    category?: string;
    regulation_code?: string;
    effective_date?: string;
    summary?: string;
    content?: string;
    tags?: string[];
  };
  entry_id?: string;
  filters?: {
    category?: string;
    source?: string;
    limit?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, query, regulation, entry_id, filters } = await req.json() as NewsRequest;

    // ========== LIST ==========
    if (action === 'list') {
      const limit = filters?.limit || 20;
      
      const [newsRes, regRes] = await Promise.all([
        supabase.from('energy_news_official')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(limit),
        supabase.from('energy_regulations')
          .select('*')
          .eq('is_active', true)
          .order('effective_date', { ascending: false })
          .limit(limit),
      ]);

      return new Response(JSON.stringify({
        success: true,
        news: newsRes.data || [],
        regulations: regRes.data || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== INGEST REGULATION ==========
    if (action === 'ingest_regulation' && regulation) {
      const { data, error } = await supabase
        .from('energy_regulations')
        .insert([{
          title: regulation.title,
          source_name: regulation.source_name,
          source_url: regulation.source_url || null,
          category: regulation.category || 'general',
          regulation_code: regulation.regulation_code || null,
          effective_date: regulation.effective_date || null,
          summary: regulation.summary || null,
          content: regulation.content || null,
          tags: regulation.tags || [],
          ingestion_method: 'manual',
          verified: true,
          verified_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, regulation: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== SEARCH NEWS (AI-assisted with source verification) ==========
    if (action === 'search_news' && query) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      const systemPrompt = `Eres un asistente especializado en noticias del sector energético español.

REGLAS ESTRICTAS:
1. Solo proporciona información de fuentes OFICIALES y VERIFICABLES:
   - CNMC (cnmc.es)
   - BOE (boe.es)
   - IDAE (idae.es)
   - REE (ree.es)
   - OMIE (omie.es)
   - MITECO (miteco.gob.es)
   - Medios reputados: Expansión, Cinco Días, El Economista, Energías Renovables, El Periódico de la Energía

2. NUNCA inventes noticias ni normativa
3. Si no tienes información verificada, dilo explícitamente
4. Siempre incluye la URL de la fuente original cuando la conozcas
5. Indica claramente si un dato es aproximado o verificado

Responde en JSON:
{
  "results": [
    {
      "title": "Título de la noticia",
      "source_name": "Nombre de la fuente oficial",
      "source_url": "URL verificable o null si no disponible",
      "source_type": "official|media|institutional",
      "category": "regulacion|mercado|renovables|eficiencia|precios|general",
      "summary": "Resumen neutral de 2-3 líneas",
      "published_at": "YYYY-MM-DD o null",
      "verified_source": true/false,
      "tags": ["tag1", "tag2"]
    }
  ],
  "disclaimer": "texto si hay limitaciones en la búsqueda"
}`;

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
            { role: 'user', content: `Busca noticias energéticas recientes sobre: ${query}. Máximo 5 resultados de fuentes oficiales verificables.` },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ success: false, error: 'Rate limit. Intenta más tarde.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI error: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '';

      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { results: [] };
      } catch {
        parsed = { results: [], parseError: true };
      }

      // Persist verified results to DB
      const verifiedResults = (parsed.results || []).filter((r: any) => r.verified_source);
      if (verifiedResults.length > 0) {
        for (const r of verifiedResults) {
          await supabase.from('energy_news_official').upsert([{
            title: r.title,
            source_name: r.source_name,
            source_url: r.source_url,
            source_type: r.source_type || 'official',
            category: r.category || 'general',
            published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
            summary: r.summary,
            tags: r.tags || [],
            is_verified: r.verified_source || false,
            verified_source: r.verified_source || false,
            ingestion_method: 'ai_search',
            ai_summary: r.summary,
            ai_enriched_at: new Date().toISOString(),
          }], { onConflict: 'id' });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results: parsed.results || [],
        disclaimer: parsed.disclaimer || 'Resultados basados en IA con verificación de fuentes.',
        persisted_count: verifiedResults.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== ENRICH ==========
    if (action === 'enrich' && entry_id) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      // Get existing entry
      const { data: reg } = await supabase
        .from('energy_regulations')
        .select('*')
        .eq('id', entry_id)
        .single();

      if (!reg) throw new Error('Regulation not found');

      const enrichPrompt = `Resume y clasifica esta normativa energética española:
Título: ${reg.title}
Fuente: ${reg.source_name}
Contenido: ${reg.content || reg.summary || 'No disponible'}

Responde en JSON:
{
  "ai_summary": "Resumen claro de 2-3 líneas",
  "suggested_tags": ["tag1", "tag2"],
  "importance": "alta|media|baja",
  "affects": "descripción de a quién afecta"
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: 'Eres un experto en regulación energética española. Responde solo en JSON.' },
            { role: 'user', content: enrichPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      let enriched;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        enriched = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch { enriched = {}; }

      await supabase.from('energy_regulations').update({
        ai_summary: enriched.ai_summary || null,
        importance: enriched.importance || reg.importance,
        tags: enriched.suggested_tags || reg.tags,
        ai_enriched_at: new Date().toISOString(),
      }).eq('id', entry_id);

      return new Response(JSON.stringify({ success: true, enriched }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);
  } catch (error) {
    console.error('[energy-news-ingestion] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
