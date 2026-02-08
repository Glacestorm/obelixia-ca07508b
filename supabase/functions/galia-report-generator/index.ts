const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ReportRequest {
  action: 'generate' | 'get_data';
  reportType: 'seguimiento' | 'justificacion' | 'riesgos' | 'presupuestario' | 'beneficiarios' | 'gal';
  sections: string[];
  period: 'mes_actual' | 'trimestre' | 'semestre' | 'anio' | 'custom';
  format: 'pdf' | 'excel' | 'word';
  galId?: string;
  dateRange?: { start: string; end: string };
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

    const { action, reportType, sections, period, format, galId, dateRange } = await req.json() as ReportRequest;

    console.log(`[galia-report-generator] Processing: ${action}, type: ${reportType}`);

    // Build report-specific prompts
    const reportPrompts: Record<string, string> = {
      seguimiento: `Genera un informe de seguimiento de expedientes LEADER con:
- Resumen ejecutivo del período
- Estado actual de expedientes (en trámite, resueltos, pendientes)
- Ejecución presupuestaria (comprometido vs disponible)
- KPIs principales (tasa resolución, tiempos medios)
- Tendencias y observaciones`,

      justificacion: `Genera un informe de justificación para auditoría LEADER con:
- Detalle de gastos elegibles verificados
- Verificaciones administrativas realizadas
- Desviaciones detectadas y justificaciones
- Documentación de soporte revisada
- Conclusiones y certificación`,

      riesgos: `Genera un informe de análisis de riesgos con:
- Expedientes con scoring de riesgo > 70%
- Factores de riesgo identificados por expediente
- Clasificación por tipo de riesgo (documental, financiero, plazos)
- Recomendaciones de actuación prioritaria
- Plan de mitigación sugerido`,

      presupuestario: `Genera un informe presupuestario LEADER con:
- Dotación inicial por convocatoria
- Presupuesto comprometido y certificado
- Presupuesto pagado y pendiente
- Disponibilidad actual
- Proyección de ejecución a fin de ejercicio`,

      beneficiarios: `Genera un informe de beneficiarios con:
- Listado de beneficiarios con ayuda concedida
- Tipología (PYME, autónomo, ayuntamiento, asociación)
- Distribución territorial por municipio
- Análisis por sector de actividad
- Estadísticas de género si aplica`,

      gal: `Genera la memoria anual del Grupo de Acción Local con:
- Presentación del GAL y territorio
- Objetivos del período y estrategia LEADER
- Actuaciones realizadas y proyectos apoyados
- Resultados e impacto territorial
- Conclusiones y retos futuros`,
    };

    const systemPrompt = `Eres un experto en gestión de subvenciones LEADER y generación de informes administrativos.

CONTEXTO:
- Programa LEADER: Desarrollo rural financiado por FEADER
- Normativa: Reglamento UE 2021/2115, RD 1048/2022
- Grupo de Acción Local (GAL): Entidad gestora

FORMATO DE RESPUESTA (JSON estricto):
{
  "titulo": "Título del informe",
  "fecha_generacion": "YYYY-MM-DD",
  "periodo": "Descripción del período",
  "secciones": [
    {
      "id": "seccion_id",
      "titulo": "Título de sección",
      "contenido": "Contenido en Markdown",
      "datos": { ... datos estructurados si aplica },
      "graficos_sugeridos": ["tipo_grafico"]
    }
  ],
  "conclusiones": "Texto de conclusiones",
  "anexos": ["Lista de anexos sugeridos"]
}

REGLAS:
1. Usa datos realistas pero marcados como ejemplo si no hay datos reales
2. Estructura profesional y clara
3. Incluye recomendaciones cuando sea pertinente
4. Cita normativa aplicable cuando sea relevante`;

    const userPrompt = `${reportPrompts[reportType] || 'Genera un informe general de gestión LEADER'}

Secciones a incluir: ${sections.join(', ')}
Período: ${period}
Formato de salida: ${format}`;

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
        temperature: 0.6,
        max_tokens: 4000,
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

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    const usage = aiData.usage || {};

    // Parse JSON response
    let reportData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[galia-report-generator] JSON parse error:', parseError);
      reportData = { 
        titulo: `Informe ${reportType}`,
        rawContent: content,
        parseError: true 
      };
    }

    const tiempoGeneracion = Date.now() - startTime;

    console.log(`[galia-report-generator] Success - Type: ${reportType}, Time: ${tiempoGeneracion}ms`);

    return new Response(JSON.stringify({
      success: true,
      reportType,
      format,
      data: reportData,
      tokensUsados: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      tiempoGeneracion,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-report-generator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
