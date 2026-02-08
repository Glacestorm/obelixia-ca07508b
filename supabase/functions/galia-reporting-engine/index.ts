import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ReportRequest {
  action: 'generate_memoria_anual' | 'generate_informe_feder' | 'generate_cuadro_mando' | 'generate_informe_seguimiento';
  galId?: string;
  periodo?: {
    inicio: string;
    fin: string;
  };
  expedientesData?: ExpedienteResumen[];
  convocatoriasData?: ConvocatoriaResumen[];
  kpisData?: KPIsData;
  format?: 'json' | 'markdown' | 'html';
}

interface ExpedienteResumen {
  id: string;
  numero_expediente: string;
  estado: string;
  importe_solicitado: number;
  importe_concedido: number | null;
  beneficiario: string;
  sector: string;
  empleos_previstos: number;
  fecha_resolucion?: string;
}

interface ConvocatoriaResumen {
  id: string;
  nombre: string;
  presupuesto_total: number;
  presupuesto_comprometido: number;
  expedientes_total: number;
  expedientes_aprobados: number;
  expedientes_rechazados: number;
}

interface KPIsData {
  total_expedientes: number;
  expedientes_resueltos: number;
  tasa_aprobacion: number;
  importe_total_concedido: number;
  empleos_creados: number;
  empleos_mantenidos: number;
  tiempo_medio_resolucion_dias: number;
  satisfaccion_beneficiarios?: number;
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

    const { action, periodo, expedientesData, convocatoriasData, kpisData, format = 'json' } = await req.json() as ReportRequest;

    console.log(`[galia-reporting-engine] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    const periodoStr = periodo ? `${periodo.inicio} a ${periodo.fin}` : 'último año';

    switch (action) {
      case 'generate_memoria_anual':
        systemPrompt = `Eres un redactor experto de memorias anuales de Grupos de Acción Local (GAL) para programas LEADER.

Genera una memoria anual profesional que incluya:
1. Resumen ejecutivo
2. Análisis de convocatorias
3. Expedientes gestionados
4. Impacto socioeconómico
5. Indicadores de cumplimiento
6. Conclusiones y perspectivas

ESTILO:
- Lenguaje formal administrativo
- Datos cuantitativos precisos
- Gráficos descritos en texto
- Referencias normativas pertinentes

FORMATO DE RESPUESTA (JSON estricto):
{
  "titulo": "string",
  "periodo": "string",
  "resumen_ejecutivo": "string (max 500 palabras)",
  "secciones": [
    {
      "titulo": "string",
      "contenido": "string",
      "datos_clave": [{"metrica": "string", "valor": "string"}],
      "graficos_sugeridos": ["string"]
    }
  ],
  "indicadores_feder": {
    "productividad": [{"indicador": "string", "objetivo": number, "logrado": number}],
    "resultado": [{"indicador": "string", "objetivo": number, "logrado": number}]
  },
  "conclusiones": "string",
  "recomendaciones": ["string"],
  "anexos_sugeridos": ["string"]
}`;
        userPrompt = `Genera la memoria anual del GAL para el periodo ${periodoStr}.

Datos de convocatorias:
${JSON.stringify(convocatoriasData, null, 2)}

Datos de expedientes:
${JSON.stringify(expedientesData, null, 2)}

KPIs del periodo:
${JSON.stringify(kpisData, null, 2)}`;
        break;

      case 'generate_informe_feder':
        systemPrompt = `Eres un experto en reporting FEDER/LEADER para fondos europeos.

Genera un informe de seguimiento conforme a los requisitos de la Comisión Europea y la Autoridad de Gestión.

REQUISITOS:
- Indicadores de productividad (outputs)
- Indicadores de resultado (outcomes)
- Ejecución financiera
- Contribución a objetivos transversales
- Pista de auditoría

FORMATO DE RESPUESTA (JSON estricto):
{
  "informe_id": "string",
  "periodo_referencia": "string",
  "tipo_informe": "seguimiento" | "anual" | "final",
  "ejecucion_financiera": {
    "presupuesto_aprobado": number,
    "comprometido": number,
    "pagado": number,
    "porcentaje_ejecucion": number,
    "desviacion": number
  },
  "indicadores": {
    "productividad": [
      {"codigo": "string", "nombre": "string", "unidad": "string", "objetivo": number, "realizado": number, "porcentaje": number}
    ],
    "resultado": [
      {"codigo": "string", "nombre": "string", "unidad": "string", "base": number, "objetivo": number, "valor_actual": number}
    ]
  },
  "objetivos_transversales": {
    "igualdad_genero": {"descripcion": "string", "acciones": ["string"]},
    "desarrollo_sostenible": {"descripcion": "string", "acciones": ["string"]},
    "digitalizacion": {"descripcion": "string", "acciones": ["string"]}
  },
  "proyectos_destacados": [
    {"titulo": "string", "importe": number, "impacto": "string"}
  ],
  "incidencias": [
    {"tipo": "string", "descripcion": "string", "estado": "string"}
  ],
  "conclusiones": "string",
  "proximos_pasos": ["string"]
}`;
        userPrompt = `Genera informe FEDER para el periodo ${periodoStr}.

Datos:
${JSON.stringify({ convocatorias: convocatoriasData, expedientes: expedientesData, kpis: kpisData }, null, 2)}`;
        break;

      case 'generate_cuadro_mando':
        systemPrompt = `Eres un analista de datos especializado en cuadros de mando para administración pública.

Genera un cuadro de mando ejecutivo con KPIs críticos para la gestión del GAL.

ESTRUCTURA:
- KPIs principales con semáforos
- Tendencias
- Alertas
- Comparativas

FORMATO DE RESPUESTA (JSON estricto):
{
  "titulo": "Cuadro de Mando GAL",
  "fecha_generacion": "string",
  "periodo": "string",
  "kpis_principales": [
    {
      "nombre": "string",
      "valor": number,
      "unidad": "string",
      "objetivo": number,
      "estado": "verde" | "amarillo" | "rojo",
      "tendencia": "subiendo" | "estable" | "bajando",
      "variacion_periodo_anterior": number
    }
  ],
  "resumen_financiero": {
    "presupuesto_total": number,
    "ejecutado": number,
    "pendiente": number,
    "porcentaje_ejecucion": number
  },
  "pipeline_expedientes": {
    "en_tramite": number,
    "pendiente_resolucion": number,
    "aprobados_mes": number,
    "rechazados_mes": number
  },
  "alertas_activas": [
    {"tipo": "string", "mensaje": "string", "prioridad": "alta" | "media" | "baja"}
  ],
  "comparativa_historica": {
    "este_periodo": number,
    "periodo_anterior": number,
    "variacion_porcentual": number
  },
  "insights": ["string"]
}`;
        userPrompt = `Genera cuadro de mando para el periodo ${periodoStr}.

KPIs: ${JSON.stringify(kpisData, null, 2)}
Convocatorias: ${JSON.stringify(convocatoriasData, null, 2)}
Expedientes: ${JSON.stringify(expedientesData, null, 2)}`;
        break;

      case 'generate_informe_seguimiento':
        systemPrompt = `Eres un técnico de seguimiento de proyectos LEADER.

Genera un informe de seguimiento periódico sobre el estado de los expedientes.

FORMATO DE RESPUESTA (JSON estricto):
{
  "titulo": "string",
  "periodo": "string",
  "resumen": "string",
  "estado_expedientes": {
    "total": number,
    "por_estado": [{"estado": "string", "cantidad": number, "porcentaje": number}],
    "evolucion_mensual": [{"mes": "string", "nuevos": number, "cerrados": number}]
  },
  "expedientes_criticos": [
    {"numero": "string", "motivo": "string", "accion_requerida": "string", "plazo": "string"}
  ],
  "logros_periodo": ["string"],
  "incidencias": [
    {"descripcion": "string", "impacto": "string", "solucion_propuesta": "string"}
  ],
  "acciones_proximas": [
    {"accion": "string", "responsable": "string", "fecha_limite": "string"}
  ],
  "recursos": {
    "carga_trabajo_equipo": number,
    "expedientes_por_tecnico": number
  }
}`;
        userPrompt = `Genera informe de seguimiento para ${periodoStr}.

Expedientes: ${JSON.stringify(expedientesData, null, 2)}
KPIs: ${JSON.stringify(kpisData, null, 2)}`;
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
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit', 
          message: 'Límite de solicitudes excedido.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required', 
          message: 'Créditos insuficientes.' 
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

    console.log(`[galia-reporting-engine] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-reporting-engine] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
