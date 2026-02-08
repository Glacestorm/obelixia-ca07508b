/**
 * GALIA Expert Agent - RAG-based Knowledge Assistant
 * Agente experto con arquitectura RAG para consultas normativas
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExpertRequest {
  action: 'query' | 'summarize' | 'compare' | 'validate';
  question?: string;
  documentId?: string;
  context?: {
    userRole?: string;
    expedienteId?: string;
    convocatoriaId?: string;
    categoria?: string;
  };
}

interface KnowledgeItem {
  id: string;
  titulo: string;
  resumen: string;
  contenido_texto: string;
  categoria: string;
  tipo: string;
  keywords: string[];
  fuente_url: string | null;
  boe_referencia: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, question, documentId, context } = await req.json() as ExpertRequest;
    console.log(`[galia-expert-agent] Action: ${action}, Question: ${question?.slice(0, 50)}...`);

    // Fetch relevant knowledge from database
    let knowledgeContext: KnowledgeItem[] = [];
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Search for relevant documents
        const searchTerms = question?.toLowerCase().split(' ').filter(t => t.length > 3) || [];
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/galia_knowledge_base?is_vigente=eq.true&limit=10`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });

        if (response.ok) {
          const allDocs = await response.json();
          
          // Simple relevance scoring
          knowledgeContext = allDocs
            .map((doc: KnowledgeItem) => {
              const text = `${doc.titulo} ${doc.resumen || ''} ${doc.contenido_texto}`.toLowerCase();
              const score = searchTerms.filter(term => text.includes(term)).length;
              return { ...doc, score };
            })
            .filter((doc: any) => doc.score > 0)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5);
        }
      } catch (dbError) {
        console.error('[galia-expert-agent] DB fetch error:', dbError);
        // Continue without context
      }
    }

    // Build system prompt based on role
    const roleInstructions = {
      ciudadano: `
Eres GALIA Experto, un asistente especializado en ayudar a ciudadanos y empresas con trámites de subvenciones LEADER.
- Usa un lenguaje claro y accesible, evitando tecnicismos innecesarios
- Explica los pasos de forma sencilla
- Indica siempre los plazos y documentos necesarios
- Ofrece alternativas si un requisito es difícil de cumplir`,
      tecnico: `
Eres GALIA Experto, un asistente técnico especializado en gestión de expedientes LEADER/FEDER.
- Puedes usar terminología técnica administrativa
- Cita artículos específicos de la normativa cuando sea relevante
- Proporciona análisis detallados de elegibilidad y requisitos
- Sugiere optimizaciones en los procedimientos`,
      auditor: `
Eres GALIA Experto, un asistente especializado en auditoría y control de subvenciones.
- Enfócate en verificación de cumplimiento normativo
- Identifica posibles riesgos y irregularidades
- Cita referencias legales precisas
- Proporciona checklists de verificación`,
      default: `
Eres GALIA Experto, un asistente virtual especializado en subvenciones públicas LEADER y FEDER.
Tu misión es ayudar con consultas sobre normativa, procedimientos y requisitos de ayudas públicas.`
    };

    const roleKey = (context?.userRole || 'default') as keyof typeof roleInstructions;
    const rolePrompt = roleInstructions[roleKey] || roleInstructions.default;

    // Build context from knowledge base
    let knowledgePrompt = '';
    if (knowledgeContext.length > 0) {
      knowledgePrompt = `

BASE DE CONOCIMIENTO RELEVANTE:
${knowledgeContext.map((doc, i) => `
[${i + 1}] ${doc.titulo} (${doc.categoria}/${doc.tipo})
${doc.resumen || ''}
${doc.contenido_texto.slice(0, 500)}...
${doc.boe_referencia ? `Referencia: ${doc.boe_referencia}` : ''}
`).join('\n')}

INSTRUCCIONES:
- Basa tu respuesta en la información de la base de conocimiento cuando sea relevante
- Cita las fuentes usando [número] para referenciar documentos
- Si la información no está en la base de conocimiento, indícalo claramente
- Proporciona siempre la referencia normativa cuando exista`;
    }

    const systemPrompt = `${rolePrompt}

MARCO NORMATIVO QUE DEBES CONOCER:
- Ley 38/2003 General de Subvenciones
- Ley 39/2015 del Procedimiento Administrativo Común
- Ley 40/2015 de Régimen Jurídico del Sector Público
- Reglamentos FEDER/FEADER de la UE
- Normativa específica del Principado de Asturias
${knowledgePrompt}

FORMATO DE RESPUESTA (JSON estricto):
{
  "answer": "Respuesta completa y bien estructurada",
  "sources": [{"id": "uuid", "titulo": "Título del documento", "referencia": "BOE/BOPA si aplica"}],
  "confidence": 0.0-1.0,
  "suggestions": ["Sugerencia 1", "Sugerencia 2"],
  "nextSteps": ["Paso siguiente 1", "Paso siguiente 2"],
  "warnings": ["Advertencia si aplica"]
}`;

    let userPrompt = '';

    switch (action) {
      case 'query':
        userPrompt = `Consulta del usuario: ${question}

${context?.expedienteId ? `Contexto: Expediente ${context.expedienteId}` : ''}
${context?.convocatoriaId ? `Convocatoria: ${context.convocatoriaId}` : ''}

Proporciona una respuesta completa, precisa y útil.`;
        break;

      case 'summarize':
        userPrompt = `Resume el siguiente documento o conjunto de documentos de forma clara y estructurada:
${question}

Incluye: puntos clave, obligaciones, plazos y requisitos principales.`;
        break;

      case 'compare':
        userPrompt = `Compara los siguientes elementos o normativas:
${question}

Identifica similitudes, diferencias, ventajas y desventajas de cada opción.`;
        break;

      case 'validate':
        userPrompt = `Valida el cumplimiento normativo de:
${question}

Verifica:
1. Cumplimiento de requisitos legales
2. Documentación necesaria
3. Plazos aplicables
4. Posibles incumplimientos o riesgos`;
        break;

      default:
        userPrompt = question || 'Sin pregunta especificada';
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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Límite de consultas alcanzado. Inténtalo en unos minutos.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON
        result = {
          answer: content,
          sources: knowledgeContext.map(doc => ({
            id: doc.id,
            titulo: doc.titulo,
            referencia: doc.boe_referencia
          })),
          confidence: 0.7,
          suggestions: [],
          nextSteps: [],
          warnings: []
        };
      }
    } catch (parseError) {
      console.error('[galia-expert-agent] JSON parse error:', parseError);
      result = {
        answer: content,
        sources: [],
        confidence: 0.5,
        suggestions: [],
        parseError: true
      };
    }

    const processingTime = Date.now() - startTime;
    console.log(`[galia-expert-agent] Success - Time: ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      result,
      metadata: {
        processingTime,
        tokensUsed: aiData.usage?.total_tokens || 0,
        sourcesUsed: knowledgeContext.length,
        model: 'gemini-2.5-flash'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-expert-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
