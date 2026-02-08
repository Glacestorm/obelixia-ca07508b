/**
 * GALIA Assistant - Enhanced Edge Function
 * Asistente Virtual IA para gestión de ayudas LEADER
 * Con detección de intenciones avanzada, búsqueda en FAQ y contexto enriquecido
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GaliaRequest {
  action: 'chat' | 'search_faq' | 'check_eligibility' | 'explain_procedure' | 'analyze_document';
  sessionId: string;
  message: string;
  context?: {
    galId?: string;
    expedienteId?: string;
    solicitudId?: string;
    modo?: 'ciudadano' | 'tecnico';
    historial?: Array<{ role: string; content: string }>;
    documentType?: string;
    expedienteData?: Record<string, unknown>;
  };
}

// Intent detection patterns
const INTENT_PATTERNS = {
  elegibilidad: ['elegib', 'requisito', 'puedo solicitar', 'quién puede', 'beneficiario', 'condicion'],
  documentacion: ['document', 'necesito', 'presenta', 'adjunt', 'aportar', 'certificad'],
  estado_expediente: ['estado', 'expediente', 'solicitud', 'tramit', 'cómo va', 'resolución'],
  plazos: ['plazo', 'fecha', 'cuándo', 'límite', 'vencimiento', 'convocatoria'],
  justificacion: ['justific', 'factura', 'pago', 'gasto', 'subvencionable', 'elegible'],
  normativa: ['ley', 'norma', 'reglament', 'artículo', 'regulación', 'legislación'],
  moderacion_costes: ['coste', 'presupuesto', 'oferta', 'precio', 'moderación', 'comparar'],
  ayuda_general: ['ayuda', 'leader', 'subvención', 'qué es', 'información'],
};

// Detect intent from message
function detectIntent(message: string): { intent: string; confidence: number } {
  const msgLower = message.toLowerCase();
  let maxScore = 0;
  let detectedIntent = 'consulta_general';

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    const matches = patterns.filter(p => msgLower.includes(p)).length;
    const score = matches / patterns.length;
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent;
    }
  }

  return {
    intent: detectedIntent,
    confidence: Math.min(0.95, 0.5 + maxScore * 0.5),
  };
}

// Check if query should be escalated to human
function shouldEscalate(message: string, intent: string): boolean {
  const escalationKeywords = [
    'reclamación', 'queja', 'denuncia', 'recurso', 'error grave',
    'urgente', 'problema serio', 'incumplimiento', 'fraude',
    'datos personales', 'confidencial', 'privado'
  ];
  
  const msgLower = message.toLowerCase();
  return escalationKeywords.some(kw => msgLower.includes(kw));
}

// Build enriched system prompt based on context
function buildSystemPrompt(
  modo: string, 
  intent: string, 
  expedienteData?: Record<string, unknown>
): string {
  const basePromptCiudadano = `Eres GALIA, el Asistente Virtual de Ayudas LEADER para ciudadanos, empresas y entidades.

## TU MISIÓN
- Resolver dudas sobre subvenciones LEADER de desarrollo rural
- Explicar requisitos de elegibilidad de forma clara y accesible
- Orientar sobre documentación necesaria
- Informar sobre plazos y estados de tramitación
- Derivar al técnico cuando la consulta exceda tu ámbito

## CONOCIMIENTO BASE LEADER
- **Programa LEADER**: Desarrollo rural financiado por FEADER (Fondo Europeo Agrícola de Desarrollo Rural)
- **Beneficiarios**: PYMEs, autónomos, ayuntamientos, asociaciones sin ánimo de lucro en zonas rurales
- **Tipos de ayudas**: Inversiones productivas, diversificación económica, servicios básicos, patrimonio
- **Intensidad de ayuda**: Normalmente 40-50% del coste elegible (máximo según convocatoria)
- **Inversión mínima**: Generalmente 10.000€ (puede variar por convocatoria)
- **Documentación típica**: Proyecto técnico, 3 presupuestos comparativos, permisos, vida laboral

## REGLAS DE COMUNICACIÓN
1. Sé amable, profesional y cercano
2. Responde en español, usa lenguaje claro sin tecnicismos innecesarios
3. Estructura respuestas con listas y secciones cuando sea útil
4. Si no conoces la respuesta exacta, indica que el usuario debe contactar con su GAL
5. Usa formato Markdown para mejor legibilidad
6. Para consultas sobre expedientes específicos, solicita el código de expediente

## INFORMACIÓN CONFIDENCIAL (NO PROPORCIONAR)
- Datos personales de otros beneficiarios
- Estados de expedientes de terceros
- Información confidencial de valoraciones internas
- Puntuaciones de baremos de otros solicitantes`;

  const basePromptTecnico = `Eres GALIA, el Copiloto IA para Técnicos de Grupos de Acción Local (GAL).

## TU MISIÓN
- Asistir en la instrucción y evaluación de expedientes LEADER
- Responder consultas sobre normativa aplicable (europea, nacional, autonómica)
- Sugerir criterios de valoración según baremos oficiales
- Detectar posibles incumplimientos, riesgos o inconsistencias
- Ayudar en la redacción de informes técnicos y resoluciones

## NORMATIVA DE REFERENCIA
- **UE**: Reglamento (UE) 2021/2115 - PAC, Reglamento FEADER
- **España**: RD 1048/2022 Plan Estratégico PAC, Ley 38/2003 General de Subvenciones
- **Procedimiento**: Ley 39/2015 Procedimiento Administrativo Común, Ley 40/2015 Régimen Jurídico
- **Autonómica**: Normativa específica del GAL y Comunidad Autónoma

## FUNCIONES ESPECIALIZADAS
### 1. ANÁLISIS DE ELEGIBILIDAD
- Verificar ubicación en territorio LEADER (código INE, zona elegible)
- Comprobar tipo de beneficiario admisible según convocatoria
- Validar inversión mínima/máxima y ratios de subvención
- Revisar criterios de exclusión (sectores, actividades)

### 2. MODERACIÓN DE COSTES
- Comparar con catálogo de costes de referencia del GAL
- Alertar desviaciones significativas (>15% del coste medio)
- Verificar requisito de tres ofertas (inversiones >18.000€)
- Detectar fraccionamiento de contratos

### 3. VALORACIÓN Y PUNTUACIÓN
- Aplicar baremos de puntuación según criterios aprobados
- Sugerir justificaciones documentadas para cada criterio
- Detectar inconsistencias en declaraciones responsables
- Verificar cumplimiento de compromisos asumidos

### 4. CONSULTA NORMATIVA
- Citar artículos y disposiciones aplicables
- Interpretar casos límite con criterio prudente
- Recomendar actuaciones basadas en precedentes

## FORMATO DE RESPUESTA
- Usa Markdown estructurado con secciones claras
- Cita normativa cuando sea relevante (artículo, ley, fecha)
- Indica nivel de confianza si la interpretación es compleja
- Sugiere acciones concretas y siguiente paso`;

  let systemPrompt = modo === 'tecnico' ? basePromptTecnico : basePromptCiudadano;

  // Add intent-specific instructions
  const intentInstructions: Record<string, string> = {
    elegibilidad: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario pregunta sobre elegibilidad/requisitos. Céntrate en criterios de acceso, beneficiarios admisibles y condiciones de participación.',
    documentacion: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario necesita información sobre documentación. Lista los documentos necesarios, dónde obtenerlos y formatos aceptados.',
    estado_expediente: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario consulta sobre el estado de un expediente. Si no tienes datos del expediente, solicita el código para poder ayudar mejor.',
    plazos: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario pregunta sobre plazos y fechas. Indica los plazos habituales y recomienda consultar la convocatoria específica.',
    justificacion: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario pregunta sobre justificación de gastos. Explica qué gastos son subvencionables, documentación justificativa y plazos de presentación.',
    moderacion_costes: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario pregunta sobre moderación de costes. Explica el proceso de comparación de ofertas y detección de desviaciones.',
    normativa: '\n\n## ENFOQUE PARA ESTA CONSULTA\nEl usuario consulta sobre normativa. Cita las disposiciones relevantes y proporciona interpretación clara.',
  };

  if (intentInstructions[intent]) {
    systemPrompt += intentInstructions[intent];
  }

  // Add expediente context if available
  if (expedienteData && Object.keys(expedienteData).length > 0) {
    systemPrompt += `\n\n## CONTEXTO DEL EXPEDIENTE ACTUAL
${JSON.stringify(expedienteData, null, 2)}

Usa esta información para dar respuestas más precisas y relevantes al contexto del expediente.`;
  }

  return systemPrompt;
}

Deno.serve(async (req) => {
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

    console.log(`[galia-assistant] Processing action: ${action}, mode: ${context?.modo || 'ciudadano'}, session: ${sessionId?.slice(0, 8)}`);

    // Detect intent
    const { intent, confidence } = detectIntent(message);
    console.log(`[galia-assistant] Detected intent: ${intent} (${Math.round(confidence * 100)}%)`);

    // Check for escalation
    const needsEscalation = shouldEscalate(message, intent);

    // Build enriched system prompt
    const systemPrompt = buildSystemPrompt(
      context?.modo || 'ciudadano',
      intent,
      context?.expedienteData
    );

    // Build context information
    let contextInfo = '';
    if (context?.expedienteId) {
      contextInfo += `\n[CONTEXTO: Expediente ID: ${context.expedienteId}]`;
    }
    if (context?.solicitudId) {
      contextInfo += `\n[CONTEXTO: Solicitud ID: ${context.solicitudId}]`;
    }
    if (context?.galId) {
      contextInfo += `\n[CONTEXTO: GAL ID: ${context.galId}]`;
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt + contextInfo }
    ];

    // Add history (limited to last 15 messages for better context)
    if (context?.historial && context.historial.length > 0) {
      const recentHistory = context.historial.slice(-15);
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          response: 'Lo siento, estamos experimentando mucha demanda. Por favor, intenta de nuevo en unos segundos.',
          intencion: intent,
          confianza: confidence,
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          response: 'El servicio de IA no está disponible temporalmente. Contacta con soporte.',
          intencion: intent,
          confianza: confidence,
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    const usage = aiData.usage || {};

    // Add escalation notice if needed
    const derivadoTecnico = needsEscalation || 
                           content.toLowerCase().includes('derivar') || 
                           content.toLowerCase().includes('contacta con tu técnico') ||
                           content.toLowerCase().includes('intervención humana');

    if (needsEscalation && !content.includes('técnico')) {
      content += '\n\n---\n⚠️ **Nota**: Esta consulta requiere atención personalizada. Te recomiendo contactar directamente con el técnico de tu GAL para una respuesta más precisa.';
    }

    const tiempoRespuesta = Date.now() - startTime;

    console.log(`[galia-assistant] Success - Intent: ${intent}, Escalate: ${derivadoTecnico}, Time: ${tiempoRespuesta}ms, Tokens: ${usage.total_tokens || 0}`);

    return new Response(JSON.stringify({
      success: true,
      response: content,
      intencion: intent,
      confianza: confidence,
      derivadoTecnico,
      tokensEntrada: usage.prompt_tokens,
      tokensSalida: usage.completion_tokens,
      tiempoRespuesta,
      sessionId,
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
