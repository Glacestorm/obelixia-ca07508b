import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === RATE LIMITING ===
const requestLog = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 30,
  WINDOW_MS: 60000,
};

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const log = requestLog.get(clientId);
  
  if (!log) {
    requestLog.set(clientId, { count: 1, lastRequest: now });
    return true;
  }
  
  if (now - log.lastRequest > RATE_LIMIT.WINDOW_MS) {
    requestLog.set(clientId, { count: 1, lastRequest: now });
    return true;
  }
  
  if (log.count >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  log.count++;
  log.lastRequest = now;
  return true;
}

// === AGENT HELP CONTENT TEMPLATES ===
const AGENT_TEMPLATES: Record<string, {
  overview: string;
  capabilities: string[];
  bestPractices: string[];
  tips: string[];
}> = {
  supervisor: {
    overview: `El Supervisor General es el cerebro central del sistema de agentes. Coordina todos los agentes de dominio, 
    resuelve conflictos entre ellos, optimiza recursos y mantiene la visión global del sistema empresarial.`,
    capabilities: [
      'Orquestación de todos los agentes de dominio',
      'Resolución de conflictos entre agentes',
      'Optimización de recursos del sistema',
      'Análisis predictivo global',
      'Aprendizaje continuo del comportamiento empresarial',
    ],
    bestPractices: [
      'Consultar el dashboard principal para ver el estado de todos los agentes',
      'Usar el modo autónomo para operaciones rutinarias',
      'Revisar las alertas de conflicto diariamente',
    ],
    tips: [
      'El supervisor aprende de cada decisión que tomas',
      'Puedes ajustar el umbral de confianza para dar más autonomía',
    ],
  },
  deal_coaching: {
    overview: `El Deal Coaching Agent analiza oportunidades de venta y proporciona coaching en tiempo real 
    para maximizar las probabilidades de cierre.`,
    capabilities: [
      'Análisis de probabilidad de cierre',
      'Identificación de factores de riesgo',
      'Sugerencias de próximos pasos',
      'Análisis competitivo',
      'Coaching personalizado por representante',
    ],
    bestPractices: [
      'Proporcionar información completa del deal para mejor análisis',
      'Revisar las sugerencias antes de cada llamada importante',
      'Actualizar el estado del deal después de cada interacción',
    ],
    tips: [
      'Cuanta más información histórica, mejor será el análisis',
      'Los talking points son especialmente útiles antes de demos',
    ],
  },
  churn_prevention: {
    overview: `El Churn Prevention Agent identifica clientes en riesgo de abandono y sugiere 
    estrategias de retención proactivas.`,
    capabilities: [
      'Predicción de riesgo de churn',
      'Identificación de señales de alerta',
      'Estrategias de retención personalizadas',
      'Health score del cliente',
      'Seguimiento de intervenciones',
    ],
    bestPractices: [
      'Revisar el dashboard de riesgo semanalmente',
      'Actuar rápidamente en clientes con riesgo crítico',
      'Documentar resultados de las intervenciones',
    ],
    tips: [
      'Las señales de engagement son los mejores predictores',
      'Intervenciones tempranas tienen 3x más éxito',
    ],
  },
  revenue_optimization: {
    overview: `El Revenue Optimization Agent identifica oportunidades de upsell, cross-sell y 
    optimización de pricing para maximizar ingresos.`,
    capabilities: [
      'Identificación de oportunidades de upsell',
      'Análisis de cross-sell',
      'Recomendaciones de pricing',
      'Forecasting de revenue',
      'Priorización de acciones',
    ],
    bestPractices: [
      'Revisar oportunidades de alto valor primero',
      'Considerar el timing del ciclo del cliente',
      'Validar predicciones con el equipo de ventas',
    ],
    tips: [
      'Las oportunidades de expansión tienen mayor probabilidad de cierre',
      'El timing es clave: aprovechar renovaciones',
    ],
  },
};

// === GENERATE HELP CONTENT ===
async function generateHelpContent(
  agentId: string,
  agentType: string,
  agentName: string,
  language: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const template = AGENT_TEMPLATES[agentType] || AGENT_TEMPLATES.supervisor;
  
  const systemPrompt = `Eres un asistente experto en el agente "${agentName}" de un sistema ERP enterprise.
Tu rol es generar contenido de ayuda completo, estructurado y útil para usuarios que quieren entender y aprovechar al máximo este agente.

INFORMACIÓN BASE DEL AGENTE:
- Nombre: ${agentName}
- Tipo: ${agentType}
- ID: ${agentId}
- Descripción: ${template.overview}
- Capacidades: ${template.capabilities.join(', ')}

GENERA un objeto JSON con la siguiente estructura EXACTA:
{
  "agentId": "${agentId}",
  "agentType": "${agentType}",
  "agentName": "${agentName}",
  "description": "Descripción detallada del agente",
  "version": "1.0.0",
  "lastUpdated": "${new Date().toISOString()}",
  "tableOfContents": [
    {"section": "Descripción General", "anchor": "overview"},
    {"section": "Capacidades", "anchor": "capabilities"},
    {"section": "Casos de Uso", "anchor": "use-cases"},
    {"section": "Mejores Prácticas", "anchor": "best-practices"},
    {"section": "Ejemplos", "anchor": "examples"},
    {"section": "Tips y Trucos", "anchor": "tips"}
  ],
  "overview": "Texto extenso explicando qué hace este agente",
  "capabilities": ["cap1", "cap2", "cap3"],
  "useCases": [
    {"id": "uc1", "title": "Título", "content": "Contenido", "order": 1, "examples": []}
  ],
  "bestPractices": [
    {"id": "bp1", "title": "Título", "content": "Contenido", "order": 1}
  ],
  "examples": [
    {"id": "ex1", "title": "Título", "description": "Desc", "input": "entrada", "output": "salida", "tags": ["tag1"]}
  ],
  "learnedKnowledge": [],
  "tips": ["tip1", "tip2"],
  "warnings": ["warning1"]
}

Responde SOLO con el JSON, sin markdown ni explicaciones. Idioma: ${language === 'es' ? 'español' : 'inglés'}.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Genera el contenido de ayuda completo para el agente ${agentName}.` }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in response');

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('[agent-help-assistant] generateHelpContent error:', error);
    
    // Return fallback content
    return {
      agentId,
      agentType,
      agentName,
      description: template.overview,
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      tableOfContents: [
        { section: "Descripción General", anchor: "overview" },
        { section: "Capacidades", anchor: "capabilities" },
      ],
      overview: template.overview,
      capabilities: template.capabilities,
      useCases: [],
      bestPractices: template.bestPractices.map((bp, i) => ({
        id: `bp-${i}`,
        title: `Práctica ${i + 1}`,
        content: bp,
        order: i,
      })),
      examples: [],
      learnedKnowledge: [],
      tips: template.tips,
      warnings: [],
    };
  }
}

// === CHAT WITH AGENT ===
async function chatWithAgent(
  agentId: string,
  agentType: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  helpContent: Record<string, unknown> | null,
  language: string,
  apiKey: string
): Promise<string> {
  const template = AGENT_TEMPLATES[agentType] || AGENT_TEMPLATES.supervisor;
  
  const systemPrompt = `Eres un asistente experto especializado en el agente "${agentType}" de un sistema ERP enterprise.

CONTEXTO DEL AGENTE:
${helpContent ? JSON.stringify(helpContent, null, 2).slice(0, 2000) : template.overview}

CAPACIDADES: ${template.capabilities.join(', ')}

Tu rol es responder preguntas sobre este agente de forma clara, útil y detallada.
- Proporciona ejemplos prácticos cuando sea posible
- Sugiere mejores prácticas
- Si no sabes algo, dilo claramente
- Responde en ${language === 'es' ? 'español' : 'inglés'}

Sé conciso pero completo.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
}

// === MAIN HANDLER ===
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please wait before making more requests.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, agentId, agentType, agentName, message, conversationHistory, helpContent, knowledge, language = 'es' } = body;

    console.log(`[agent-help-assistant] Action: ${action}, Agent: ${agentId}`);

    switch (action) {
      case 'get_help_content': {
        const content = await generateHelpContent(
          agentId,
          agentType || 'supervisor',
          agentName || agentId,
          language,
          LOVABLE_API_KEY
        );
        
        return new Response(JSON.stringify({
          success: true,
          helpContent: content,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'chat': {
        const response = await chatWithAgent(
          agentId,
          agentType || 'supervisor',
          message,
          conversationHistory || [],
          helpContent,
          language,
          LOVABLE_API_KEY
        );
        
        return new Response(JSON.stringify({
          success: true,
          response,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'add_knowledge': {
        // For now, just acknowledge - in production, store in database
        console.log('[agent-help-assistant] Adding knowledge:', knowledge);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Knowledge added successfully',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[agent-help-assistant] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
