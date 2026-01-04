import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  action: 'chat';
  agent_id: string;
  agent_type: string;
  agent_name: string;
  agent_description?: string;
  message: string;
  conversation_id: string;
  knowledge_context?: string;
  history?: Array<{ role: string; content: string }>;
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

    const { 
      action, 
      agent_id, 
      agent_type, 
      agent_name, 
      agent_description,
      message, 
      conversation_id, 
      knowledge_context,
      history = []
    } = await req.json() as ChatRequest;

    console.log(`[agent-help-chat] Processing chat for agent: ${agent_id} (${agent_type})`);

    // Construir system prompt especializado según el agente
    const systemPrompt = `Eres ${agent_name}, un agente de IA especializado del sistema empresarial.

## Tu Rol
${agent_description || `Eres un asistente experto en ${agent_type === 'crm' ? 'gestión de relaciones con clientes' : agent_type === 'erp' ? 'planificación de recursos empresariales' : agent_type === 'supervisor' ? 'coordinación y orquestación de múltiples agentes de IA' : 'contabilidad vertical especializada'}.`}

## Tu Identidad
- Nombre: ${agent_name}
- Tipo: Agente ${agent_type.toUpperCase()}
- ID: ${agent_id}

## Directrices de Respuesta
1. Responde siempre en español de España
2. Sé conciso pero completo - las respuestas deben ser útiles y accionables
3. Usa ejemplos prácticos cuando sea posible
4. Si detectas que el usuario tiene una necesidad específica, ofrece guía paso a paso
5. Menciona tus capacidades cuando sea relevante
6. Si no tienes información sobre algo, sé honesto y sugiere alternativas
7. Usa formato Markdown para mejor legibilidad (listas, negritas, código)

## Contexto de Conocimientos Disponibles
${knowledge_context || 'No hay conocimientos específicos cargados para esta consulta.'}

## Aprendizaje Continuo
Si la pregunta del usuario revela información nueva o útil que debería formar parte de tu base de conocimientos, incluye al final de tu respuesta un bloque JSON con:
\`\`\`json
{"learned": {"title": "título corto", "content": "conocimiento a guardar", "category": "learned"}}
\`\`\`

Solo incluye este bloque si realmente hay algo nuevo y útil que aprender de la interacción.`;

    // Preparar mensajes
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Llamar a Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[agent-help-chat] API error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Extraer conocimiento aprendido si existe
    let learned_knowledge = null;
    let cleanContent = content;
    
    const learnedMatch = content.match(/```json\s*\{"learned":\s*(\{[^}]+\})\}\s*```/);
    if (learnedMatch) {
      try {
        learned_knowledge = JSON.parse(learnedMatch[1]);
        cleanContent = content.replace(learnedMatch[0], '').trim();
        console.log(`[agent-help-chat] Learned knowledge detected:`, learned_knowledge);
      } catch (e) {
        console.log('[agent-help-chat] Failed to parse learned knowledge');
      }
    }

    console.log(`[agent-help-chat] Success for ${agent_id}`);

    return new Response(JSON.stringify({
      success: true,
      response: cleanContent,
      learned_knowledge,
      conversation_id,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[agent-help-chat] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
