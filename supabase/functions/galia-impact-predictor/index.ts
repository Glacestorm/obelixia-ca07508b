import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PredictionRequest {
  action: 'predict_impact' | 'analyze_viability' | 'estimate_employment' | 'compare_projects';
  projectData?: ProjectData;
  projects?: ProjectData[];
  historicalData?: HistoricalProject[];
}

interface ProjectData {
  id: string;
  titulo: string;
  descripcion?: string;
  sector: string;
  importe_solicitado: number;
  importe_inversion_total?: number;
  municipio?: string;
  comarca?: string;
  tipo_beneficiario: 'empresa' | 'ayuntamiento' | 'asociacion' | 'autonomo';
  empleos_previstos?: number;
  empleos_mantener?: number;
  innovacion?: boolean;
  digitalizacion?: boolean;
  sostenibilidad?: boolean;
  fecha_inicio_prevista?: string;
  duracion_meses?: number;
}

interface HistoricalProject {
  id: string;
  sector: string;
  importe: number;
  empleos_creados: number;
  empleos_mantenidos: number;
  resultado: 'exito' | 'parcial' | 'fallido';
  duracion_real: number;
  desviacion_presupuesto: number;
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

    const { action, projectData, projects, historicalData } = await req.json() as PredictionRequest;

    console.log(`[galia-impact-predictor] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'predict_impact':
        systemPrompt = `Eres un analista experto en desarrollo rural y programas LEADER/FEDER en España.
Tu función es predecir el impacto socioeconómico de proyectos de inversión en zonas rurales.

FACTORES DE ANÁLISIS:
- Sector económico y tendencias del mercado
- Tipo de beneficiario y capacidad de ejecución
- Impacto territorial (despoblación, servicios básicos)
- Innovación, digitalización y sostenibilidad
- Coherencia con estrategia de desarrollo local (EDL)
- Efecto multiplicador en la economía local

FORMATO DE RESPUESTA (JSON estricto):
{
  "impacto_global": {
    "puntuacion": 0-100,
    "nivel": "bajo" | "medio" | "alto" | "transformador",
    "descripcion": "string"
  },
  "impacto_economico": {
    "puntuacion": 0-100,
    "efecto_multiplicador": 1.0-3.0,
    "inversion_inducida_estimada": number,
    "impacto_pib_local": "bajo" | "medio" | "alto"
  },
  "impacto_empleo": {
    "empleos_directos_estimados": number,
    "empleos_indirectos_estimados": number,
    "calidad_empleo": "precario" | "estable" | "cualificado",
    "sostenibilidad_empleo": 0-100
  },
  "impacto_territorial": {
    "puntuacion": 0-100,
    "fijacion_poblacion": "bajo" | "medio" | "alto",
    "mejora_servicios": boolean,
    "atraccion_inversiones": boolean
  },
  "indicadores_edl": {
    "alineacion_estrategia": 0-100,
    "contribucion_objetivos": ["string"]
  },
  "riesgos_impacto": [
    {"riesgo": "string", "probabilidad": 0-100, "mitigacion": "string"}
  ],
  "recomendaciones_mejora": ["string"],
  "comparativa_sector": {
    "percentil": 0-100,
    "media_sector": number,
    "posicion": "por_debajo" | "media" | "por_encima" | "destacado"
  }
}`;
        userPrompt = `Predice el impacto socioeconómico de este proyecto LEADER:\n${JSON.stringify(projectData, null, 2)}
${historicalData ? `\nDatos históricos de proyectos similares:\n${JSON.stringify(historicalData, null, 2)}` : ''}`;
        break;

      case 'analyze_viability':
        systemPrompt = `Eres un analista de viabilidad de proyectos LEADER especializado en desarrollo rural.

CRITERIOS DE VIABILIDAD:
- Viabilidad técnica (capacidad del promotor)
- Viabilidad económica (ratios financieros, TIR, VAN)
- Viabilidad comercial (mercado objetivo, competencia)
- Viabilidad administrativa (cumplimiento normativo)
- Viabilidad temporal (plazos realistas)

FORMATO DE RESPUESTA (JSON estricto):
{
  "viabilidad_global": {
    "puntuacion": 0-100,
    "nivel": "inviable" | "dudoso" | "viable" | "muy_viable",
    "confianza": 0-100
  },
  "viabilidad_tecnica": {
    "puntuacion": 0-100,
    "fortalezas": ["string"],
    "debilidades": ["string"]
  },
  "viabilidad_economica": {
    "puntuacion": 0-100,
    "roi_estimado": number,
    "payback_meses": number,
    "punto_equilibrio": number
  },
  "viabilidad_comercial": {
    "puntuacion": 0-100,
    "mercado_potencial": "nicho" | "local" | "regional" | "nacional",
    "competencia": "alta" | "media" | "baja"
  },
  "probabilidad_exito": 0-100,
  "factores_criticos": ["string"],
  "condiciones_exito": ["string"],
  "alertas": [
    {"tipo": "string", "severidad": "info" | "warning" | "critical", "mensaje": "string"}
  ]
}`;
        userPrompt = `Analiza la viabilidad de este proyecto:\n${JSON.stringify(projectData, null, 2)}`;
        break;

      case 'estimate_employment':
        systemPrompt = `Eres un economista especializado en mercado laboral rural y programas de desarrollo.

Estima con precisión el impacto en empleo basándote en el tipo de proyecto, sector e inversión.

METODOLOGÍA:
- Ratios empleo/inversión por sector
- Efectos directos e indirectos (input-output)
- Calidad y estabilidad del empleo
- Perfil de trabajadores necesarios
- Formación requerida

FORMATO DE RESPUESTA (JSON estricto):
{
  "empleo_directo": {
    "creacion": number,
    "mantenimiento": number,
    "total": number,
    "jornada_completa_equivalente": number
  },
  "empleo_indirecto": {
    "estimacion": number,
    "sectores_beneficiados": ["string"],
    "multiplicador": number
  },
  "perfil_empleo": [
    {
      "categoria": "string",
      "numero": number,
      "cualificacion": "basica" | "media" | "alta",
      "tipo_contrato": "temporal" | "indefinido" | "autonomo",
      "salario_estimado": number
    }
  ],
  "sostenibilidad": {
    "probabilidad_permanencia_1_ano": 0-100,
    "probabilidad_permanencia_3_anos": 0-100,
    "probabilidad_permanencia_5_anos": 0-100
  },
  "impacto_genero": {
    "porcentaje_mujeres_estimado": 0-100,
    "mejora_brecha": boolean
  },
  "impacto_juventud": {
    "porcentaje_jovenes_estimado": 0-100,
    "atraccion_talento": boolean
  },
  "formacion_necesaria": [
    {"area": "string", "nivel": "string", "disponibilidad_local": boolean}
  ],
  "coste_por_empleo": number,
  "comparativa_sector": {
    "ratio_empleo_inversion": number,
    "media_sector": number,
    "eficiencia": "baja" | "media" | "alta"
  }
}`;
        userPrompt = `Estima el impacto en empleo de este proyecto:\n${JSON.stringify(projectData, null, 2)}`;
        break;

      case 'compare_projects':
        systemPrompt = `Eres un evaluador experto de proyectos LEADER para GAL.

Compara múltiples proyectos para ayudar en la priorización y asignación de fondos.

CRITERIOS DE COMPARACIÓN:
- Impacto socioeconómico esperado
- Viabilidad y riesgo
- Eficiencia de la inversión (coste/beneficio)
- Alineación estratégica con EDL
- Urgencia y oportunidad

FORMATO DE RESPUESTA (JSON estricto):
{
  "ranking": [
    {
      "proyecto_id": "string",
      "titulo": "string",
      "puntuacion_global": 0-100,
      "posicion": number,
      "puntuaciones_detalle": {
        "impacto": 0-100,
        "viabilidad": 0-100,
        "eficiencia": 0-100,
        "alineacion": 0-100
      },
      "fortalezas": ["string"],
      "debilidades": ["string"]
    }
  ],
  "analisis_comparativo": {
    "mejor_impacto": "string",
    "mejor_viabilidad": "string",
    "mejor_eficiencia": "string",
    "mas_estrategico": "string"
  },
  "recomendacion_priorizacion": "string",
  "sinergias_detectadas": [
    {"proyectos": ["string"], "tipo_sinergia": "string", "beneficio": "string"}
  ],
  "alertas_cartera": ["string"]
}`;
        userPrompt = `Compara y prioriza estos proyectos LEADER:\n${JSON.stringify(projects, null, 2)}`;
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
        temperature: 0.4,
        max_tokens: 3000,
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
      console.error('[galia-impact-predictor] AI API error:', response.status, errorText);
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
      console.error('[galia-impact-predictor] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-impact-predictor] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-impact-predictor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
