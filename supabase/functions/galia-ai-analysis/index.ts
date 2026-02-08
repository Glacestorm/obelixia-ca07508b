import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  action: 'risk_analysis' | 'smart_assignment' | 'deadline_prediction' | 'proactive_alerts' | 'full_analysis';
  expedienteId?: string;
  expedienteData?: ExpedienteData;
  expedientes?: ExpedienteData[];
  tecnicos?: TecnicoData[];
}

interface ExpedienteData {
  id: string;
  numero_expediente: string;
  estado: string;
  fecha_apertura: string;
  importe_solicitado?: number;
  importe_concedido?: number | null;
  presupuesto_total?: number;
  scoring_riesgo?: number | null;
  titulo_proyecto?: string;
  beneficiario?: {
    nombre: string;
    nif: string;
    tipo: string;
  };
  tecnico_instructor_id?: string | null;
  documentos_pendientes?: number;
  dias_en_estado?: number;
}

interface TecnicoData {
  id: string;
  nombre: string;
  expedientes_asignados: number;
  especialidad?: string[];
  carga_trabajo: number; // 0-100
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

    const { action, expedienteData, expedientes, tecnicos } = await req.json() as AnalysisRequest;

    console.log(`[galia-ai-analysis] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'risk_analysis':
        systemPrompt = `Eres un analista experto en gestión de subvenciones públicas LEADER/FEDER en España.
Tu función es evaluar el riesgo de expedientes de ayudas basándote en múltiples factores.

FACTORES DE RIESGO A CONSIDERAR:
- Documentación incompleta o pendiente
- Desviaciones presupuestarias (>15% es alto riesgo)
- Tiempo excesivo en un mismo estado (>30 días sin movimiento)
- Historial del beneficiario
- Complejidad del proyecto
- Cumplimiento de requisitos LEADER

FORMATO DE RESPUESTA (JSON estricto):
{
  "scoring_riesgo": 0-100,
  "nivel_riesgo": "bajo" | "medio" | "alto" | "critico",
  "factores_riesgo": [
    {"factor": "string", "peso": 0-100, "descripcion": "string"}
  ],
  "recomendaciones": ["string"],
  "acciones_prioritarias": ["string"],
  "probabilidad_incidencia": 0-100
}`;
        userPrompt = `Analiza el riesgo de este expediente LEADER:\n${JSON.stringify(expedienteData, null, 2)}`;
        break;

      case 'smart_assignment':
        systemPrompt = `Eres un sistema de asignación inteligente de expedientes para técnicos de GAL.

CRITERIOS DE ASIGNACIÓN:
- Carga de trabajo actual (menor carga = mayor prioridad)
- Especialidad del técnico vs tipo de proyecto
- Experiencia con beneficiarios similares
- Equilibrio de cargas entre equipo

FORMATO DE RESPUESTA (JSON estricto):
{
  "tecnico_recomendado_id": "string",
  "tecnico_recomendado_nombre": "string",
  "puntuacion_match": 0-100,
  "justificacion": "string",
  "alternativas": [
    {"tecnico_id": "string", "nombre": "string", "puntuacion": 0-100, "razon": "string"}
  ],
  "carga_resultante": 0-100
}`;
        userPrompt = `Recomienda el mejor técnico para este expediente:
Expediente: ${JSON.stringify(expedienteData, null, 2)}
Técnicos disponibles: ${JSON.stringify(tecnicos, null, 2)}`;
        break;

      case 'deadline_prediction':
        systemPrompt = `Eres un sistema de predicción de plazos para gestión de subvenciones LEADER.

Basándote en datos históricos y el estado actual, predice fechas de resolución.

FACTORES A CONSIDERAR:
- Estado actual del expediente
- Tiempo medio por estado según histórico
- Complejidad del proyecto
- Documentación pendiente
- Carga del equipo técnico

FORMATO DE RESPUESTA (JSON estricto):
{
  "fecha_estimada_resolucion": "YYYY-MM-DD",
  "dias_estimados": number,
  "confianza": 0-100,
  "hitos_intermedios": [
    {"estado": "string", "fecha_estimada": "YYYY-MM-DD", "dias": number}
  ],
  "factores_retraso": ["string"],
  "factores_aceleracion": ["string"],
  "escenarios": {
    "optimista": {"dias": number, "fecha": "YYYY-MM-DD"},
    "probable": {"dias": number, "fecha": "YYYY-MM-DD"},
    "pesimista": {"dias": number, "fecha": "YYYY-MM-DD"}
  }
}`;
        userPrompt = `Predice los plazos para este expediente:\n${JSON.stringify(expedienteData, null, 2)}`;
        break;

      case 'proactive_alerts':
        systemPrompt = `Eres un sistema de monitorización proactiva de expedientes LEADER.

Identifica situaciones que requieren atención antes de que se conviertan en problemas.

TIPOS DE ALERTAS:
- Vencimientos próximos (plazos legales, documentación)
- Desviaciones de costes detectadas
- Documentación faltante crítica
- Expedientes estancados
- Riesgos de incumplimiento normativo

FORMATO DE RESPUESTA (JSON estricto):
{
  "alertas": [
    {
      "expediente_id": "string",
      "numero_expediente": "string",
      "tipo": "vencimiento" | "desviacion" | "documentacion" | "estancamiento" | "normativo",
      "severidad": "info" | "warning" | "error" | "critical",
      "titulo": "string",
      "descripcion": "string",
      "accion_recomendada": "string",
      "fecha_limite": "YYYY-MM-DD" | null,
      "dias_restantes": number | null
    }
  ],
  "resumen": {
    "total_alertas": number,
    "criticas": number,
    "warnings": number,
    "info": number
  },
  "recomendacion_general": "string"
}`;
        userPrompt = `Genera alertas proactivas para estos expedientes:\n${JSON.stringify(expedientes, null, 2)}`;
        break;

      case 'full_analysis':
        systemPrompt = `Eres un sistema integral de análisis de gestión para GAL (Grupos de Acción Local).

Proporciona un análisis completo del expediente incluyendo riesgo, asignación óptima, predicción de plazos y alertas.

FORMATO DE RESPUESTA (JSON estricto):
{
  "riesgo": {
    "scoring": 0-100,
    "nivel": "bajo" | "medio" | "alto" | "critico",
    "factores_principales": ["string"]
  },
  "asignacion": {
    "tecnico_recomendado": "string" | null,
    "justificacion": "string"
  },
  "plazos": {
    "fecha_estimada_resolucion": "YYYY-MM-DD",
    "dias_estimados": number,
    "confianza": 0-100
  },
  "alertas_activas": [
    {"tipo": "string", "severidad": "string", "mensaje": "string"}
  ],
  "puntuacion_salud": 0-100,
  "resumen_ejecutivo": "string",
  "proximos_pasos": ["string"]
}`;
        userPrompt = `Realiza un análisis completo de este expediente:
Expediente: ${JSON.stringify(expedienteData, null, 2)}
${tecnicos ? `Técnicos disponibles: ${JSON.stringify(tecnicos, null, 2)}` : ''}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit', 
          message: 'Límite de solicitudes excedido. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required', 
          message: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[galia-ai-analysis] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[galia-ai-analysis] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-ai-analysis] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-ai-analysis] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
