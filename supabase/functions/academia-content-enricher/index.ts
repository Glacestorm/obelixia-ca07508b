import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EnricherRequest {
  action: 'enrich_lesson' | 'generate_quiz' | 'create_resource' | 'create_simulator_dataset';
  lessonId?: string;
  courseId?: string;
  ocrContent: string;
  lessonTitle?: string;
  moduleTitle?: string;
  sessionNumbers?: number[];
  quizId?: string;
  resourceType?: string;
  params?: Record<string, unknown>;
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

    const { action, lessonId, courseId, ocrContent, lessonTitle, moduleTitle, sessionNumbers, quizId, resourceType, params } = await req.json() as EnricherRequest;

    if (!action) {
      throw new Error('action is required');
    }

    // For AI-generated sessions (13, 15, 19), ocrContent may be a descriptive prompt instead of OCR text
    const contentInput = ocrContent || '';

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'enrich_lesson':
        systemPrompt = `Eres un experto pedagogo en contabilidad y finanzas empresariales, especializado en formación profesional moderna.

TU MISIÓN: Transformar contenido de un curso de contabilidad de los años 90 en material pedagógico actualizado a 2026.

ACTUALIZACIONES OBLIGATORIAS:
- Moneda: Convertir TODAS las pesetas a euros (1€ = 166,386 ptas). Redondear a 2 decimales.
- PGC: Actualizar referencias del PGC 1990 (RD 1643/90) al PGC 2007 (RD 1514/2007) y reformas posteriores hasta 2025.
- Numeración de cuentas: Adaptar al cuadro de cuentas del PGC 2007 cuando difiera del PGC 1990.
- IVA: Incluir referencias al SII (Sistema Inmediato de Información), Ley Crea y Crece, factura electrónica obligatoria 2026.
- Digital: Añadir referencias a ERP, digitalización obligatoria, VeriFactu/TicketBAI donde sea relevante.
- Normativa: Incluir NIIF-UE, Ley 11/2023 de digitalización, normas de sostenibilidad (CSRD/ESRS) cuando aplique.
- Ejemplos: Actualizar a contexto empresarial 2026 (startups, ecommerce, servicios digitales).

FORMATO DE RESPUESTA - Markdown estructurado:
- Usar ## para secciones principales, ### para subsecciones
- Incluir bloques de código para asientos contables (usar \`\`\`accounting)
- Usar tablas Markdown para balances y datos numéricos
- Incluir callouts con > **📌 Nota PGC 2007:** para actualizaciones normativas
- Incluir callouts con > **💡 Tip ERP:** para conexiones con el simulador contable
- Incluir callouts con > **⚠️ Actualización 2026:** para cambios normativos recientes
- Incluir una sección final "## 🎯 Practica en tu ERP" con instrucciones para el simulador
- Mantener un tono profesional pero accesible, orientado a microlearning (5-8 min de lectura)

IMPORTANTE: Preserva TODO el contenido teórico original, no elimines nada. Solo actualiza, enriquece y moderniza.

Responde SOLO con el contenido Markdown. No incluyas metadatos JSON.`;

        userPrompt = `Transforma el siguiente contenido OCR de la lección "${lessonTitle}" (${moduleTitle}) en contenido pedagógico moderno.

CONTENIDO OCR ORIGINAL:
${ocrContent}

Genera el contenido Markdown completo y actualizado para esta lección.`;
        break;

      case 'generate_quiz':
        systemPrompt = `Eres un experto en evaluación pedagógica de contabilidad y finanzas.

TU MISIÓN: Transformar preguntas de test Verdadero/Falso de un curso de los años 90 en preguntas actualizadas a 2026.

ACTUALIZACIONES:
- Convertir pesetas a euros en todas las preguntas
- Actualizar referencias al PGC 1990 por PGC 2007
- Modernizar el contexto de las preguntas (incluir ERP, digitalización, etc.)
- Mantener la estructura V/F pero mejorar las explicaciones

FORMATO DE RESPUESTA (JSON estricto):
{
  "questions": [
    {
      "question_text": "texto de la pregunta actualizada",
      "question_type": "true_false",
      "correct_answer": "true" o "false",
      "explanation": "explicación pedagógica detallada con referencia a normativa 2026",
      "difficulty_level": 1-3,
      "tags": ["tag1", "tag2"],
      "points": 5
    }
  ]
}`;

        userPrompt = `Transforma estas preguntas V/F del test original en preguntas actualizadas a 2026.

PREGUNTAS ORIGINALES:
${ocrContent}

Genera el JSON con las preguntas actualizadas, manteniendo la esencia pero modernizando el contexto.`;
        break;

      case 'create_resource':
        systemPrompt = `Eres un experto en creación de recursos pedagógicos para contabilidad empresarial.

TU MISIÓN: Crear una descripción detallada y estructura de un recurso descargable basado en ejercicios de un curso de contabilidad.

FORMATO DE RESPUESTA (JSON estricto):
{
  "title": "título del recurso",
  "description": "descripción detallada del recurso y su utilidad práctica",
  "type": "template" | "exercise" | "calculator" | "checklist",
  "content_structure": {
    "sections": ["sección1", "sección2"],
    "fields": ["campo1", "campo2"],
    "formulas": ["fórmula1"]
  },
  "instructions": "instrucciones de uso paso a paso",
  "learning_objectives": ["objetivo1", "objetivo2"]
}`;

        userPrompt = `Crea un recurso pedagógico de tipo "${resourceType}" basado en este contenido:

${ocrContent}

El recurso debe estar actualizado a normativa 2026 con euros.`;
        break;

      case 'create_simulator_dataset':
        systemPrompt = `Eres un experto en creación de escenarios prácticos para simuladores contables.

TU MISIÓN: Transformar ejercicios prácticos de un curso de contabilidad de los años 90 en datasets modernos para un simulador ERP.

ACTUALIZACIONES:
- Convertir pesetas a euros
- Actualizar Plan de Cuentas al PGC 2007
- Modernizar el contexto empresarial

FORMATO DE RESPUESTA (JSON estricto):
{
  "title": "título del escenario",
  "description": "descripción del escenario práctico",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "dataset_type": "journal_entries" | "balance_sheet" | "bank_reconciliation" | "ratio_analysis",
  "data": {
    "company_name": "nombre empresa",
    "initial_balance": {...},
    "transactions": [...],
    "accounts": [...]
  },
  "expected_solution": {
    "journal_entries": [...],
    "final_balance": {...}
  }
}`;

        userPrompt = `Transforma este ejercicio práctico en un dataset para el simulador contable:

${ocrContent}

Actualiza todos los importes a euros y el Plan de Cuentas al PGC 2007.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[academia-content-enricher] Processing action: ${action} for lesson: ${lessonTitle || 'N/A'}`);

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
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, error: 'Rate limit exceeded', message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, error: 'Payment required', message: 'Créditos de IA insuficientes.' 
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

    let result: any;

    if (action === 'enrich_lesson') {
      // For lesson enrichment, the result is raw Markdown
      result = { 
        markdown: content.replace(/```markdown\n?/g, '').replace(/```\n?$/g, '').trim(),
        action 
      };
    } else {
      // For other actions, parse JSON
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('[academia-content-enricher] JSON parse error:', parseError);
        result = { rawContent: content, parseError: true };
      }
    }

    // If lessonId provided and action is enrich_lesson, update the lesson directly
    if (action === 'enrich_lesson' && lessonId && result.markdown) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('academia_lessons')
        .update({ 
          content: result.markdown,
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonId);

      if (updateError) {
        console.error('[academia-content-enricher] DB update error:', updateError);
        result.dbUpdateError = updateError.message;
      } else {
        result.dbUpdated = true;
        console.log(`[academia-content-enricher] Lesson ${lessonId} updated successfully`);
      }
    }

    // If quizId provided and action is generate_quiz, update quiz questions
    if (action === 'generate_quiz' && quizId && result.questions) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Delete existing questions for this quiz
      await supabase.from('academia_quiz_questions').delete().eq('quiz_id', quizId);

      // Insert new questions
      const questionsToInsert = result.questions.map((q: any, idx: number) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        question_type: q.question_type || 'true_false',
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty_level: q.difficulty_level || 1,
        tags: q.tags || [],
        points: q.points || 5,
        order_index: idx,
        options: JSON.stringify([
          { label: 'Verdadero', value: 'true' },
          { label: 'Falso', value: 'false' }
        ])
      }));

      const { error: insertError } = await supabase
        .from('academia_quiz_questions')
        .insert(questionsToInsert);

      if (insertError) {
        console.error('[academia-content-enricher] Quiz questions insert error:', insertError);
        result.dbUpdateError = insertError.message;
      } else {
        result.dbUpdated = true;
        result.questionsInserted = questionsToInsert.length;
        console.log(`[academia-content-enricher] ${questionsToInsert.length} questions inserted for quiz ${quizId}`);
      }
    }

    console.log(`[academia-content-enricher] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[academia-content-enricher] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
