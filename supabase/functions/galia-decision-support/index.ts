import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecisionSupportRequest {
  action: 'evaluate_application' | 'generate_scoring' | 'compliance_check' | 'cross_module_sync' | 'recommendation_engine';
  expedienteId?: string;
  applicationData?: {
    proyecto: Record<string, unknown>;
    presupuesto: Record<string, unknown>;
    solicitante: Record<string, unknown>;
    documentacion: string[];
  };
  convocatoriaId?: string;
  criterios?: Array<{
    id: string;
    nombre: string;
    peso: number;
    descripcion: string;
  }>;
  moduleType?: 'accounting' | 'treasury' | 'legal' | 'contracting';
  syncData?: Record<string, unknown>;
}

/**
 * GALIA Decision Support System - Phase 6 GALIA 2.0
 * 
 * AI-powered decision support for LEADER/FEDER grant evaluation:
 * - Multi-criteria scoring with weighted algorithms
 * - Automated compliance verification
 * - Cross-module data synchronization
 * - Recommendation engine for technicians
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, expedienteId, applicationData, convocatoriaId, criterios, moduleType, syncData } = await req.json() as DecisionSupportRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'evaluate_application':
        systemPrompt = `Eres un sistema experto de evaluación de solicitudes LEADER/FEDER conforme a la normativa española.

MARCO NORMATIVO:
- Ley 38/2003, de 17 de noviembre, General de Subvenciones
- Real Decreto 887/2006, Reglamento de la Ley General de Subvenciones
- Reglamento (UE) 2021/1060 de disposiciones comunes
- Estrategia de Desarrollo Local Participativo (EDLP) del GAL

CRITERIOS DE EVALUACIÓN:
${criterios?.map(c => `- ${c.nombre} (${c.peso}%): ${c.descripcion}`).join('\n') || 'Criterios estándar LEADER'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "evaluacion": {
    "puntuacionTotal": number (0-100),
    "puntuacionPonderada": number,
    "criteriosEvaluados": [
      {
        "criterioId": "string",
        "nombre": "string",
        "puntuacion": number,
        "puntuacionPonderada": number,
        "justificacion": "string",
        "evidencias": ["string"],
        "observaciones": "string | null"
      }
    ],
    "fortalezas": ["string"],
    "debilidades": ["string"],
    "riesgos": ["string"]
  },
  "elegibilidad": {
    "cumpleRequisitos": boolean,
    "requisitosFaltantes": ["string"],
    "subsanables": ["string"],
    "noSubsanables": ["string"]
  },
  "recomendacion": {
    "decision": "APROBAR" | "DENEGAR" | "SUBSANAR" | "REVISAR",
    "confianza": number (0-100),
    "justificacionTecnica": "string",
    "condicionesEspeciales": ["string"],
    "plazoSubsanacion": "string | null"
  },
  "trazabilidad": {
    "modeloIA": "string",
    "versionAlgoritmo": "string",
    "fechaEvaluacion": "ISO8601",
    "hashEvaluacion": "string"
  }
}`;

        userPrompt = `Evalúa la siguiente solicitud de subvención LEADER:

DATOS DEL PROYECTO:
${JSON.stringify(applicationData?.proyecto, null, 2)}

PRESUPUESTO:
${JSON.stringify(applicationData?.presupuesto, null, 2)}

SOLICITANTE:
${JSON.stringify(applicationData?.solicitante, null, 2)}

DOCUMENTACIÓN APORTADA:
${applicationData?.documentacion?.join(', ') || 'Sin documentación'}

Genera una evaluación completa con puntuación multi-criterio y recomendación fundamentada.`;
        break;

      case 'generate_scoring':
        systemPrompt = `Eres un sistema de scoring para solicitudes de subvención LEADER.

METODOLOGÍA DE PUNTUACIÓN:
1. Análisis de viabilidad técnica (peso configurable)
2. Impacto territorial y empleo (peso configurable)
3. Innovación y diferenciación (peso configurable)
4. Sostenibilidad financiera (peso configurable)
5. Alineación con EDLP (peso configurable)

CRITERIOS ESPECÍFICOS:
${criterios?.map(c => `- ${c.nombre}: ${c.peso}% - ${c.descripcion}`).join('\n') || 'Aplicar criterios estándar'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "scoring": {
    "puntuacionFinal": number,
    "ranking": "A" | "B" | "C" | "D",
    "percentil": number,
    "desglose": [
      {
        "criterio": "string",
        "peso": number,
        "puntuacionBruta": number,
        "puntuacionPonderada": number,
        "detalle": "string"
      }
    ]
  },
  "comparativa": {
    "mediaConvocatoria": number,
    "posicionEstimada": "string",
    "probabilidadAprobacion": number
  },
  "mejoras": [
    {
      "area": "string",
      "sugerencia": "string",
      "impactoPotencial": number
    }
  ]
}`;

        userPrompt = `Genera el scoring para el expediente ${expedienteId} con los siguientes datos:
${JSON.stringify(applicationData, null, 2)}`;
        break;

      case 'compliance_check':
        systemPrompt = `Eres un verificador de cumplimiento normativo para subvenciones públicas españolas.

NORMATIVA A VERIFICAR:
1. Ley 38/2003 General de Subvenciones
2. Ley 39/2015 del Procedimiento Administrativo Común
3. Ley 40/2015 de Régimen Jurídico del Sector Público
4. Reglamento (UE) 2021/1060 - Disposiciones Comunes FEDER
5. Normativa específica LEADER/FEADER
6. Bases reguladoras de la convocatoria

VERIFICACIONES OBLIGATORIAS:
- Obligaciones tributarias (AEAT)
- Obligaciones Seguridad Social (TGSS)
- Límite de minimis (200.000€/3 años)
- No estar en situación de crisis
- Cumplimiento ambiental
- Accesibilidad universal

FORMATO DE RESPUESTA (JSON estricto):
{
  "cumplimiento": {
    "global": boolean,
    "porcentaje": number,
    "nivel": "TOTAL" | "PARCIAL" | "INCUMPLIMIENTO"
  },
  "verificaciones": [
    {
      "normativa": "string",
      "articulo": "string",
      "requisito": "string",
      "cumple": boolean,
      "evidencia": "string | null",
      "observacion": "string | null",
      "subsanable": boolean,
      "criticidad": "ALTA" | "MEDIA" | "BAJA"
    }
  ],
  "alertas": [
    {
      "tipo": "BLOQUEO" | "ADVERTENCIA" | "INFO",
      "mensaje": "string",
      "accionRequerida": "string | null"
    }
  ],
  "minimisDenota": {
    "acumulado": number,
    "limiteDisponible": number,
    "ayudaSolicitada": number,
    "superaLimite": boolean
  }
}`;

        userPrompt = `Verifica el cumplimiento normativo del expediente ${expedienteId}:
${JSON.stringify(applicationData, null, 2)}`;
        break;

      case 'cross_module_sync':
        systemPrompt = `Eres un sistema de sincronización cross-modular para gestión de subvenciones.

MÓDULOS CONECTADOS:
- CONTABILIDAD: Asientos, presupuesto, cuentas PGC 2007
- TESORERÍA: Pagos, ordenes de pago, flujos de caja
- JURÍDICO: Resoluciones, recursos, notificaciones
- CONTRATACIÓN: Licitaciones vinculadas, adjudicaciones

SINCRONIZACIÓN CON MÓDULO: ${moduleType?.toUpperCase() || 'GENERAL'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "sincronizacion": {
    "modulo": "string",
    "estado": "SINCRONIZADO" | "PENDIENTE" | "ERROR",
    "ultimaSync": "ISO8601",
    "registrosAfectados": number
  },
  "datosExportados": {
    "expedienteId": "string",
    "campos": [
      {
        "origen": "string",
        "destino": "string",
        "valor": "any",
        "transformacion": "string | null"
      }
    ]
  },
  "contabilidad": {
    "asientosPropuestos": [
      {
        "fecha": "ISO8601",
        "cuenta": "string",
        "debe": number,
        "haber": number,
        "concepto": "string"
      }
    ],
    "presupuestoAfectado": {
      "aplicacion": "string",
      "importe": number,
      "tipo": "COMPROMISO" | "OBLIGACION" | "PAGO"
    }
  },
  "tesoreria": {
    "ordenPago": {
      "beneficiario": "string",
      "importe": number,
      "concepto": "string",
      "cuentaDestino": "string"
    }
  },
  "validaciones": [
    {
      "campo": "string",
      "valido": boolean,
      "mensaje": "string"
    }
  ]
}`;

        userPrompt = `Sincroniza el expediente ${expedienteId} con el módulo ${moduleType}:
${JSON.stringify(syncData, null, 2)}`;
        break;

      case 'recommendation_engine':
        systemPrompt = `Eres un motor de recomendaciones inteligente para técnicos de gestión de subvenciones.

OBJETIVO: Proporcionar recomendaciones accionables basadas en:
- Estado actual del expediente
- Histórico de decisiones similares
- Normativa aplicable
- Mejores prácticas administrativas

FORMATO DE RESPUESTA (JSON estricto):
{
  "recomendaciones": [
    {
      "id": "string",
      "tipo": "ACCION" | "REVISION" | "DOCUMENTACION" | "COMUNICACION",
      "prioridad": "URGENTE" | "ALTA" | "MEDIA" | "BAJA",
      "titulo": "string",
      "descripcion": "string",
      "fundamentoLegal": "string | null",
      "plazoSugerido": "string",
      "impactoEstimado": "string"
    }
  ],
  "proximosPasos": [
    {
      "orden": number,
      "accion": "string",
      "responsable": "string",
      "plazo": "string"
    }
  ],
  "alertasProactivas": [
    {
      "tipo": "PLAZO" | "DOCUMENTACION" | "NORMATIVA" | "PRESUPUESTO",
      "mensaje": "string",
      "fechaLimite": "ISO8601 | null"
    }
  ],
  "expedientesSimilares": [
    {
      "id": "string",
      "similitud": number,
      "decision": "string",
      "aprendizaje": "string"
    }
  ]
}`;

        userPrompt = `Genera recomendaciones para el expediente ${expedienteId}:
${JSON.stringify(applicationData, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-decision-support] Processing action: ${action}`);

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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-decision-support] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      expedienteId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-decision-support] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
