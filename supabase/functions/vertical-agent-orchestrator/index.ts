import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VerticalType = 'healthcare' | 'agriculture' | 'industrial' | 'services';
type AgentMode = 'supervised' | 'autonomous';
type ActionType = 'start_session' | 'chat' | 'execute_task' | 'get_recommendations' | 'approve_action' | 'get_session_status' | 'switch_mode' | 'end_session';

interface AgentRequest {
  action: ActionType;
  verticalType?: VerticalType;
  sessionId?: string;
  mode?: AgentMode;
  confidenceThreshold?: number;
  context?: Record<string, unknown>;
  message?: string;
  taskType?: string;
  taskParams?: Record<string, unknown>;
  taskId?: string;
  approval?: boolean;
  reason?: string;
}

const VERTICAL_PROMPTS: Record<VerticalType, string> = {
  healthcare: `Eres un agente IA especializado en SALUD Y HEALTHCARE con capacidades avanzadas.

CAPACIDADES PRINCIPALES:
- Gestión inteligente de citas y telemedicina
- Análisis de síntomas con sugerencias diagnósticas (solo orientativo, no reemplaza profesional médico)
- Verificación de interacciones medicamentosas
- Seguimiento proactivo de pacientes crónicos
- Alertas de monitoreo remoto de signos vitales
- Gestión de expedientes clínicos electrónicos (EHR)
- Prescripciones electrónicas asistidas

REGLAS DE OPERACIÓN:
1. NUNCA proporciones diagnósticos definitivos, solo sugerencias para revisión médica
2. Prioriza siempre la seguridad del paciente
3. Escala inmediatamente emergencias a personal médico
4. Mantén confidencialidad HIPAA estricta
5. Documenta todas las decisiones con razonamiento

FORMATO DE RESPUESTA (JSON):
{
  "response": "Mensaje para el usuario",
  "action": { "type": "string", "params": {}, "requiresApproval": boolean, "confidence": 0-1 },
  "recommendations": [{ "title": "string", "description": "string", "priority": "high|medium|low" }],
  "alerts": [{ "level": "critical|warning|info", "message": "string" }]
}`,

  agriculture: `Eres un agente IA especializado en AGRICULTURA Y AGTECH con capacidades avanzadas.

CAPACIDADES PRINCIPALES:
- Predicción de cosechas basada en datos climáticos y de suelo
- Optimización inteligente de riego y fertirrigación
- Detección temprana de plagas y enfermedades mediante análisis de datos
- Planificación optimizada de siembra y cosecha
- Trazabilidad blockchain de productos agrícolas
- Análisis de salud de cultivos con imágenes satelitales
- Gestión de cuaderno de campo digital

REGLAS DE OPERACIÓN:
1. Considera siempre las condiciones climáticas locales
2. Prioriza prácticas sostenibles y regenerativas
3. Optimiza uso de recursos hídricos
4. Sugiere rotación de cultivos cuando sea beneficioso
5. Documenta todas las intervenciones para trazabilidad

FORMATO DE RESPUESTA (JSON):
{
  "response": "Mensaje para el usuario",
  "action": { "type": "string", "params": {}, "requiresApproval": boolean, "confidence": 0-1 },
  "recommendations": [{ "title": "string", "description": "string", "priority": "high|medium|low" }],
  "alerts": [{ "level": "critical|warning|info", "message": "string" }],
  "fieldData": { "metrics": {}, "predictions": {} }
}`,

  industrial: `Eres un agente IA especializado en INDUSTRIA Y MANUFACTURA con capacidades avanzadas.

CAPACIDADES PRINCIPALES:
- Mantenimiento predictivo de maquinaria industrial
- Optimización de OEE (Overall Equipment Effectiveness) en tiempo real
- Gestión inteligente de inventario y supply chain
- Optimización de rutas logísticas y flotas
- Monitoreo de eficiencia energética y huella de carbono
- Digital twins de procesos industriales
- Seguridad industrial y prevención de riesgos

REGLAS DE OPERACIÓN:
1. La seguridad del personal es SIEMPRE la prioridad máxima
2. Minimiza tiempos de parada no planificados
3. Optimiza costos operativos sin comprometer calidad
4. Cumple con normativas industriales y ambientales
5. Documenta todas las intervenciones de mantenimiento

FORMATO DE RESPUESTA (JSON):
{
  "response": "Mensaje para el usuario",
  "action": { "type": "string", "params": {}, "requiresApproval": boolean, "confidence": 0-1 },
  "recommendations": [{ "title": "string", "description": "string", "priority": "high|medium|low" }],
  "alerts": [{ "level": "critical|warning|info", "message": "string" }],
  "metrics": { "oee": number, "mtbf": number, "mttr": number }
}`,

  services: `Eres un agente IA especializado en SERVICIOS Y HOSPITALIDAD con capacidades avanzadas.

CAPACIDADES PRINCIPALES:
- Atención al cliente autónoma multicanal
- Revenue management y pricing dinámico basado en demanda
- Predicción de churn y análisis de NPS
- Gestión inteligente de reservas y disponibilidad
- Análisis de reviews y sentimiento de clientes
- Customer DNA y personalización avanzada
- Gestión de experiencia del cliente (CX)

REGLAS DE OPERACIÓN:
1. La satisfacción del cliente es la prioridad principal
2. Personaliza cada interacción basándote en historial
3. Anticipa necesidades antes de que las expresen
4. Resuelve problemas proactivamente
5. Maximiza revenue sin comprometer experiencia

FORMATO DE RESPUESTA (JSON):
{
  "response": "Mensaje para el usuario",
  "action": { "type": "string", "params": {}, "requiresApproval": boolean, "confidence": 0-1 },
  "recommendations": [{ "title": "string", "description": "string", "priority": "high|medium|low" }],
  "alerts": [{ "level": "critical|warning|info", "message": "string" }],
  "customerInsights": { "satisfaction": number, "likelihood": {} }
}`,
};

const TASK_PROMPTS: Record<VerticalType, Record<string, string>> = {
  healthcare: {
    schedule_teleconsult: 'Programa una teleconsulta optimizando horarios disponibles del médico y preferencias del paciente.',
    analyze_symptoms: 'Analiza los síntomas proporcionados y sugiere posibles condiciones para revisión médica profesional.',
    check_medications: 'Verifica interacciones entre los medicamentos listados y alerta sobre posibles riesgos.',
    monitor_patient: 'Configura monitoreo de signos vitales con umbrales de alerta personalizados.',
    generate_prescription: 'Prepara prescripción electrónica para revisión y firma del médico.',
  },
  agriculture: {
    predict_harvest: 'Predice rendimiento de cosecha basándose en datos actuales de clima, suelo y cultivo.',
    optimize_irrigation: 'Calcula plan de riego óptimo considerando pronóstico climático y estado del suelo.',
    detect_pests: 'Analiza indicadores para detectar posible presencia de plagas o enfermedades.',
    plan_planting: 'Genera calendario óptimo de siembra considerando rotación y condiciones.',
    trace_product: 'Registra evento de trazabilidad en blockchain para el lote especificado.',
  },
  industrial: {
    predict_maintenance: 'Analiza datos de sensores para predecir necesidad de mantenimiento.',
    optimize_oee: 'Identifica cuellos de botella y sugiere mejoras para optimizar OEE.',
    manage_inventory: 'Optimiza niveles de inventario basándose en demanda y lead times.',
    optimize_routes: 'Calcula rutas óptimas para la flota considerando tráfico y entregas.',
    monitor_energy: 'Analiza consumo energético e identifica oportunidades de ahorro.',
  },
  services: {
    handle_customer: 'Gestiona interacción con cliente de forma autónoma y personalizada.',
    dynamic_pricing: 'Calcula precio óptimo basándose en demanda, ocupación y competencia.',
    predict_churn: 'Analiza señales de riesgo de abandono y sugiere acciones de retención.',
    manage_reservations: 'Optimiza asignación de reservas maximizando ocupación.',
    analyze_reviews: 'Analiza sentiment de reviews y extrae insights accionables.',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const request: AgentRequest = await req.json();
    const { action, verticalType, sessionId, mode, message, taskType, taskParams, context } = request;

    console.log(`[vertical-agent-orchestrator] Action: ${action}, Vertical: ${verticalType || 'N/A'}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'start_session':
        if (!verticalType) throw new Error('verticalType is required');
        result = {
          message: `Sesión de agente ${verticalType} iniciada`,
          verticalType,
          mode: mode || 'supervised',
          confidenceThreshold: request.confidenceThreshold || 0.75,
          capabilities: Object.keys(TASK_PROMPTS[verticalType] || {}),
          greeting: await getAgentGreeting(verticalType, LOVABLE_API_KEY),
        };
        break;

      case 'chat':
        if (!verticalType || !message) throw new Error('verticalType and message are required');
        result = await processChat(verticalType, message, context || {}, mode || 'supervised', LOVABLE_API_KEY);
        break;

      case 'execute_task':
        if (!verticalType || !taskType) throw new Error('verticalType and taskType are required');
        result = await executeTask(verticalType, taskType, taskParams || {}, context || {}, mode || 'supervised', LOVABLE_API_KEY);
        break;

      case 'get_recommendations':
        if (!verticalType) throw new Error('verticalType is required');
        result = await getRecommendations(verticalType, context || {}, LOVABLE_API_KEY);
        break;

      case 'switch_mode':
        result = {
          previousMode: mode === 'autonomous' ? 'supervised' : 'autonomous',
          newMode: mode,
          message: `Modo cambiado a ${mode}`,
        };
        break;

      case 'get_session_status':
        result = {
          sessionId,
          status: 'active',
          tasksExecuted: 0,
          tasksPending: 0,
        };
        break;

      case 'end_session':
        result = {
          message: 'Sesión finalizada correctamente',
          summary: 'Resumen de la sesión disponible',
        };
        break;

      default:
        throw new Error(`Action not supported: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[vertical-agent-orchestrator] Error:', error);
    
    const err = error as { message?: string; status?: number };
    if (err.message?.includes('429') || err.status === 429) {
      return new Response(JSON.stringify({
        success: false,
        error: 'rate_limit',
        message: 'Demasiadas solicitudes. Intenta en unos segundos.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAgentGreeting(verticalType: VerticalType, apiKey: string): Promise<string> {
  const greetings: Record<VerticalType, string> = {
    healthcare: '¡Hola! Soy tu agente de Healthcare. Puedo ayudarte con gestión de citas, análisis de síntomas, verificación de medicamentos y más. ¿En qué puedo asistirte?',
    agriculture: '¡Bienvenido! Soy tu agente AgTech. Estoy listo para ayudarte con predicciones de cosecha, riego optimizado, detección de plagas y trazabilidad. ¿Cómo puedo ayudarte hoy?',
    industrial: '¡Hola! Soy tu agente Industrial. Especializado en mantenimiento predictivo, OEE, logística y eficiencia energética. ¿Qué necesitas optimizar?',
    services: '¡Bienvenido! Soy tu agente de Servicios. Puedo asistirte con atención al cliente, pricing dinámico, predicción de churn y gestión de experiencia. ¿En qué te ayudo?',
  };
  return greetings[verticalType];
}

async function processChat(
  verticalType: VerticalType,
  message: string,
  context: Record<string, unknown>,
  mode: AgentMode,
  apiKey: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `${VERTICAL_PROMPTS[verticalType]}

MODO DE OPERACIÓN: ${mode === 'autonomous' ? 'AUTÓNOMO - Puedes ejecutar acciones directamente si tu confianza es alta.' : 'SUPERVISADO - Todas las acciones requieren aprobación del usuario.'}

CONTEXTO ACTUAL:
${JSON.stringify(context, null, 2)}`;

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
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content in AI response');

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // If not JSON, return as plain response
  }

  return { response: content, action: null, recommendations: [], alerts: [] };
}

async function executeTask(
  verticalType: VerticalType,
  taskType: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
  mode: AgentMode,
  apiKey: string
): Promise<Record<string, unknown>> {
  const taskPrompt = TASK_PROMPTS[verticalType]?.[taskType];
  if (!taskPrompt) {
    throw new Error(`Task type '${taskType}' not supported for vertical '${verticalType}'`);
  }

  const systemPrompt = `${VERTICAL_PROMPTS[verticalType]}

TAREA ESPECÍFICA: ${taskPrompt}

MODO: ${mode}
PARÁMETROS: ${JSON.stringify(params)}
CONTEXTO: ${JSON.stringify(context)}

Ejecuta la tarea y devuelve el resultado en formato JSON con:
{
  "success": boolean,
  "result": { ... datos específicos de la tarea ... },
  "confidence": 0-1,
  "nextSteps": ["sugerencia 1", "sugerencia 2"],
  "warnings": ["advertencia si aplica"]
}`;

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
        { role: 'user', content: `Ejecuta la tarea: ${taskType}` },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content in AI response');

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { taskType, ...JSON.parse(jsonMatch[0]) };
    }
  } catch {
    // Fallback
  }

  return { taskType, success: true, result: content, confidence: 0.7 };
}

async function getRecommendations(
  verticalType: VerticalType,
  context: Record<string, unknown>,
  apiKey: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `${VERTICAL_PROMPTS[verticalType]}

Basándote en el contexto actual, genera 3-5 recomendaciones proactivas que beneficien al usuario.

CONTEXTO: ${JSON.stringify(context)}

Responde en JSON:
{
  "recommendations": [
    {
      "id": "rec_1",
      "title": "Título corto",
      "description": "Descripción detallada",
      "priority": "high|medium|low",
      "estimatedImpact": "Descripción del impacto",
      "actionRequired": "Acción sugerida"
    }
  ],
  "insights": ["Insight 1", "Insight 2"]
}`;

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
        { role: 'user', content: 'Genera recomendaciones proactivas' },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content in AI response');

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return { recommendations: [], insights: [] };
}
