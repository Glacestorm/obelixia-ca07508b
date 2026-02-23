
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, source_type, limit = 5 } = await req.json();

    // 1. Fetch news using Firecrawl (if available) or basic fetch
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    let newsItems: any[] = [];

    if (FIRECRAWL_API_KEY) {
        console.log('Using Firecrawl for news search...');
        // Use Firecrawl for better results
        const fcResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query || "novedades contables fiscales España 2025 2026 BOE ICAC",
                limit: limit,
                scrapeOptions: { formats: ['markdown'] }
            })
        });
        
        const fcData = await fcResponse.json();
        if (fcData.success && fcData.data) {
            newsItems = fcData.data.map((item: any) => ({
                title: item.title || 'Novedad contable detectada',
                url: item.url,
                content: item.markdown || item.description,
                source: new URL(item.url).hostname
            }));
        }
    } else {
        console.log('Firecrawl key not found, skipping search');
        // Fallback could be implemented here
    }

    // 2. Process with AI to summarize and score importance
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const processedNews = [];

    for (const item of newsItems) {
        // Skip if already exists
        const { data: existing } = await supabase
            .from('academia_course_news')
            .select('id')
            .eq('source_url', item.url)
            .maybeSingle();
            
        if (existing) {
            console.log(`News already exists: ${item.url}`);
            continue;
        }

        // AI Analysis
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto auditor contable y fiscal español. Analiza este texto y extrae:
                        1. Un resumen ejecutivo de 3 líneas.
                        2. Puntuación de importancia (0-100) donde 100 es "cambio normativo crítico obligatorio" y 0 es "irrelevante".
                        3. Tags (ej: IVA, IS, PGC, NIIF).
                        4. Si es una regulación oficial, el código (ej: BOE-A-2025-...).
                        
                        Devuelve JSON: { "summary": "...", "importance": 85, "tags": ["..."], "is_regulation": boolean, "regulation_code": "..." }`
                    },
                    {
                        role: 'user',
                        content: `Título: ${item.title}\nContenido: ${item.content?.substring(0, 3000)}`
                    }
                ]
            })
        });

        const aiData = await aiResponse.json();
        let analysis;
        try {
            analysis = JSON.parse(aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, ''));
        } catch (e) {
            console.error('Failed to parse AI response', e);
            continue;
        }

        processedNews.push({
            course_id: 'b6ce668b-3114-522a-aec2-ca725475952c', // Hardcoded for this course
            title: item.title,
            source_url: item.url,
            source_name: item.source,
            content: item.content, // Store full content for RAG
            summary: analysis.summary,
            importance_score: analysis.importance,
            tags: analysis.tags,
            is_regulation: analysis.is_regulation,
            regulation_code: analysis.regulation_code,
            is_published: analysis.importance > 60 // Auto-publish only important news
        });
    }

    // 3. Store in DB
    if (processedNews.length > 0) {
        const { error } = await supabase.from('academia_course_news').insert(processedNews);
        if (error) {
            console.error('Error inserting news:', error);
            throw error;
        }
    }

    return new Response(JSON.stringify({ success: true, count: processedNews.length, items: processedNews }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
