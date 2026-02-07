import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GaliaRequest {
  action: 'chat' | 'search_faq' | 'check_eligibility' | 'explain_procedure';
  sessionId: string;
  message: string;
  context?: {
    galId?: string;
    expedienteId?: string;
    solicitudId?: string;
    modo?: 'ciudadano' | 'tecnico';
    historial?: Array<{ role: string; content: string }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, sessionId, message, context } = await req.json() as GaliaRequest;

    console.log(`[galia-assistant] Processing action: ${action}, mode: ${context?.modo || 'ciudadano'}`);

    // Build system prompt based on mode
    const systemPromptCiudadano = `Eres GALIA, el Asistente Virtual de Ayudas LEADER para ciudadanos, empresas y entidades.

TU MISIÓN:
- Resolver dudas sobre subvenciones LEADER de desarrollo rural
- Explicar requisitos de elegibilidad de forma clara
- Orientar sobre documentación necesaria
- Informar sobre plazos y estados de tramitación
- Derivar al técnico cuando la consulta exceda tu ámbito

CONOCIMIENTO BASE:
- Programa LEADER: Desarrollo rural financiado por FEADER
- Beneficiarios: PYMEs, autónomos, ayuntamientos, asociaciones en zonas rurales
- Ayudas: Inversiones productivas, diversificación, servicios básicos
- Intensidad ayuda: Normalmente 40-50% del coste elegible
- Documentación típica: Proyecto técnico, presupuestos, permisos, vida laboral

REGLAS DE RESPUESTA:
1. Sé amable, profesional y cercano
2. Responde en español, usa lenguaje claro sin tecnicismos innecesarios
3. Estructura respuestas con listas cuando sea útil
4. Si no conoces la respuesta exacta, indica que el usuario debe contactar con su GAL
5. Para consultas sobre expedientes específicos, indica que necesitas más datos o derivar
6. Usa formato Markdown para mejor legibilidad

INFORMACIÓN QUE NO DEBES PROPORCIONAR:
- Datos personales de otros beneficiarios
- Estados de expedientes de terceros
- Información confidencial de valoraciones

Si detectas que la consulta requiere intervención humana (complejidad alta, reclamación, datos sensibles), indica que derivarás al técnico.`;

    const systemPromptTecnico = `Eres GALIA, el Copiloto IA para Técnicos de Grupos de Acción Local (GAL).

TU MISIÓN:
- Asistir en la instrucción y evaluación de expedientes LEADER
- Responder consultas sobre normativa aplicable
- Sugerir criterios de valoración según baremos
- Detectar posibles incumplimientos o riesgos
- Ayudar en la redacción de informes técnicos

NORMATIVA DE REFERENCIA:
- Reglamento (UE) 2021/2115 - PAC
- RD 1048/2022 - Plan Estratégico PAC España
- Ley 38/2003 General de Subvenciones
- Ley 39/2015 Procedimiento Administrativo
- Normativa autonómica específica del GAL

FUNCIONES CLAVE:
1. ANÁLISIS DE ELEGIBILIDAD:
   - Verificar ubicación en territorio LEADER
   - Comprobar tipo de beneficiario admisible
   - Validar inversión mínima/máxima
   - Revisar criterios de exclusión

2. MODERACIÓN DE COSTES:
   - Comparar con catálogo de costes de referencia
   - Alertar desviaciones >15%
   - Verificar ofertas cuando aplique
   
3. VALORACIÓN:
   - Aplicar baremos de puntuación
   - Sugerir justificaciones de criterios
   - Detectar inconsistencias

4. NORMATIVA:
   - Citar artículos aplicables
   - Interpretar casos límite
   - Recomendar criterios de actuación

FORMATO DE RESPUESTA:
- Usa Markdown para estructurar
- Cita normativa cuando sea relevante
- Indica nivel de confianza si la interpretación es compleja
- Sugiere acciones concretas`;

    const systemPrompt = context?.modo === 'tecnico' ? systemPromptTecnico : systemPromptCiudadano;

    // Build context information
    let contextInfo = '';
    if (context?.expedienteId) {
      contextInfo += `\n[CONTEXTO: El usuario está consultando sobre el expediente ID: ${context.expedienteId}]`;
    }
    if (context?.solicitudId) {
      contextInfo += `\n[CONTEXTO: El usuario está consultando sobre la solicitud ID: ${context.solicitudId}]`;
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt + contextInfo }
    ];

    // Add history (limited to last 10 messages)
    if (context?.historial && context.historial.length > 0) {
      const recentHistory = context.historial.slice(-10);
      messages.push(...recentHistory);
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          response: 'Lo siento, estamos experimentando mucha demanda. Por favor, intenta de nuevo en unos segundos.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          response: 'El servicio de IA no está disponible temporalmente. Contacta con soporte.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    const usage = aiData.usage || {};

    // Analyze response for derivation
    const derivadoTecnico = content.toLowerCase().includes('derivar') || 
                           content.toLowerCase().includes('contacta con tu técnico') ||
                           content.toLowerCase().includes('intervención humana');

    // Detect intent (simplified)
    let intencion = 'consulta_general';
    const msgLower = message.toLowerCase();
    if (msgLower.includes('requisito') || msgLower.includes('elegib')) {
      intencion = 'elegibilidad';
    } else if (msgLower.includes('document') || msgLower.includes('necesito')) {
      intencion = 'documentacion';
    } else if (msgLower.includes('estado') || msgLower.includes('expediente')) {
      intencion = 'estado_expediente';
    } else if (msgLower.includes('plazo') || msgLower.includes('fecha')) {
      intencion = 'plazos';
    } else if (msgLower.includes('justific')) {
      intencion = 'justificacion';
    }

    const tiempoRespuesta = Date.now() - startTime;

    console.log(`[galia-assistant] Success - Intent: ${intencion}, Time: ${tiempoRespuesta}ms`);

    return new Response(JSON.stringify({
      success: true,
      response: content,
      intencion,
      confianza: 0.85, // TODO: Calculate from model confidence
      derivadoTecnico,
      tokensEntrada: usage.prompt_tokens,
      tokensSalida: usage.completion_tokens,
      tiempoRespuesta,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-assistant] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: 'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
