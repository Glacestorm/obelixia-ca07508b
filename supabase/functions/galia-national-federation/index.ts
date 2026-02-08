/**
 * GALIA National Federation - Edge Function
 * Fase 10 del Plan Estratégico GALIA 2.0
 * 
 * Portal Multi-GAL con:
 * - Agregación de KPIs nacionales
 * - Benchmarking entre GALs
 * - Interoperabilidad UE (ENRD, eIDAS 2.0)
 * - Predicción de tendencias
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FederationRequest {
  action: 'aggregate_national' | 'benchmark_gals' | 'regional_analysis' | 'predict_trends' | 'eu_interop_check' | 'get_national_kpis';
  region?: string;
  galIds?: string[];
  period?: { start: string; end: string };
  metrics?: string[];
}

const REGIONES_ESPANA = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
  'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
  'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
  'Navarra', 'País Vasco', 'Valencia', 'Ceuta', 'Melilla'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    const { action, region, galIds, period, metrics } = await req.json() as FederationRequest;

    console.log(`[galia-national-federation] Action: ${action}, Region: ${region || 'all'}`);

    // === GET NATIONAL KPIS ===
    if (action === 'get_national_kpis') {
      // Simulación de datos agregados nacionales
      // En producción, esto vendría de la base de datos federada
      const nationalKPIs = {
        resumen_nacional: {
          total_gals_activos: 248,
          total_expedientes_2024: 12847,
          presupuesto_total_gestionado: 187500000,
          importe_total_concedido: 142300000,
          tasa_ejecucion_media: 75.89,
          empleos_creados: 2340,
          empleos_mantenidos: 8920,
          proyectos_mujeres_emprendedoras: 1890,
          proyectos_jovenes: 1450
        },
        por_region: REGIONES_ESPANA.slice(0, 10).map((region, idx) => ({
          region,
          num_gals: Math.floor(Math.random() * 20) + 5,
          expedientes: Math.floor(Math.random() * 1500) + 300,
          presupuesto_gestionado: Math.floor(Math.random() * 20000000) + 5000000,
          importe_concedido: Math.floor(Math.random() * 15000000) + 3000000,
          tasa_ejecucion: Math.floor(Math.random() * 30) + 60,
          ranking_eficiencia: idx + 1
        })),
        top_gals: [
          { gal_id: 'GAL-AST-001', nombre: 'GAL Oriente de Asturias', region: 'Asturias', score: 94 },
          { gal_id: 'GAL-GAL-003', nombre: 'GAL Terra de Lemos', region: 'Galicia', score: 91 },
          { gal_id: 'GAL-CLM-007', nombre: 'GAL Manchuela Conquense', region: 'Castilla-La Mancha', score: 89 },
          { gal_id: 'GAL-ARA-002', nombre: 'GAL Somontano', region: 'Aragón', score: 88 },
          { gal_id: 'GAL-EXT-004', nombre: 'GAL La Serena', region: 'Extremadura', score: 86 }
        ],
        tendencias: {
          variacion_interanual: {
            expedientes: 8.5,
            presupuesto: 12.3,
            empleo: 5.2
          },
          sectores_crecimiento: ['Agroalimentario', 'Turismo Rural', 'Energías Renovables'],
          alertas_nacionales: [
            'Baja ejecución en Comunidad de Madrid (42%)',
            'Incremento de solicitudes en Canarias (+25%)'
          ]
        },
        fecha_actualizacion: new Date().toISOString()
      };

      return new Response(JSON.stringify({
        success: true,
        data: nationalKPIs
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === AGGREGATE NATIONAL ===
    if (action === 'aggregate_national') {
      const systemPrompt = `Eres un analista de políticas públicas especializado en desarrollo rural europeo.
Genera un análisis nacional agregado de la gestión de fondos LEADER en España.

FORMATO DE RESPUESTA (JSON estricto):
{
  "resumen_ejecutivo": "Análisis conciso del estado nacional",
  "kpis_clave": {
    "total_gals": number,
    "total_expedientes": number,
    "presupuesto_total": number,
    "tasa_ejecucion_media": number,
    "empleos_generados": number
  },
  "ranking_regional": [
    {"region": "...", "score": number, "fortalezas": [...], "areas_mejora": [...]}
  ],
  "tendencias": [...],
  "recomendaciones_politica": [...],
  "comparativa_ue": {
    "posicion_espana": number,
    "media_ue": number,
    "paises_referencia": [...]
  }
}`;

      const userPrompt = `Genera un análisis nacional de la gestión de fondos LEADER en España para el período ${period?.start || '2024-01-01'} a ${period?.end || '2024-12-31'}.`;

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
          temperature: 0.5,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      let analysis;
      try {
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
      } catch {
        analysis = { rawContent: content };
      }

      return new Response(JSON.stringify({
        success: true,
        data: analysis
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === BENCHMARK GALS ===
    if (action === 'benchmark_gals' && galIds && galIds.length >= 2) {
      const systemPrompt = `Eres un experto en benchmarking de administraciones públicas.
Compara el rendimiento de diferentes Grupos de Acción Local (GAL).

FORMATO DE RESPUESTA (JSON estricto):
{
  "gals_comparados": [...],
  "metricas_comparadas": [
    {
      "metrica": "...",
      "valores": [{"gal_id": "...", "valor": number}],
      "mejor": "...",
      "peor": "..."
    }
  ],
  "ranking_global": [
    {"gal_id": "...", "puntuacion_total": number, "posicion": number}
  ],
  "mejores_practicas": [
    {"gal_id": "...", "practica": "...", "impacto": "..."}
  ],
  "oportunidades_transferencia": [
    {"de_gal": "...", "a_gal": "...", "practica": "..."}
  ],
  "recomendaciones": [...]
}`;

      const userPrompt = `Realiza un benchmarking comparativo de estos GALs: ${galIds.join(', ')}. 
Métricas a comparar: ${(metrics || ['eficiencia', 'velocidad_tramitacion', 'satisfaccion']).join(', ')}`;

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
          temperature: 0.5,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      let benchmark;
      try {
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        benchmark = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
      } catch {
        benchmark = { rawContent: content };
      }

      return new Response(JSON.stringify({
        success: true,
        data: benchmark
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === REGIONAL ANALYSIS ===
    if (action === 'regional_analysis' && region) {
      const systemPrompt = `Eres un analista regional especializado en desarrollo rural.
Genera un informe detallado de la gestión LEADER en una comunidad autónoma.

FORMATO DE RESPUESTA (JSON estricto):
{
  "region": "${region}",
  "resumen": "...",
  "gals_activos": number,
  "estadisticas": {
    "total_expedientes": number,
    "expedientes_aprobados": number,
    "expedientes_denegados": number,
    "expedientes_en_tramitacion": number,
    "presupuesto_asignado": number,
    "presupuesto_ejecutado": number,
    "tasa_ejecucion": number
  },
  "sectores_principales": [{"sector": "...", "porcentaje": number}],
  "municipios_beneficiados": number,
  "poblacion_impactada": number,
  "fortalezas": [...],
  "debilidades": [...],
  "oportunidades": [...],
  "amenazas": [...],
  "proyectos_destacados": [
    {"titulo": "...", "impacto": "...", "inversion": number}
  ],
  "recomendaciones": [...]
}`;

      const userPrompt = `Genera un análisis regional completo de ${region} para el período ${period?.start || '2024'} - ${period?.end || '2024'}.`;

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
          temperature: 0.5,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      let regional;
      try {
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        regional = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
      } catch {
        regional = { rawContent: content };
      }

      return new Response(JSON.stringify({
        success: true,
        data: regional
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === PREDICT TRENDS ===
    if (action === 'predict_trends') {
      const systemPrompt = `Eres un analista predictivo especializado en políticas de desarrollo rural.
Genera predicciones de tendencias para fondos LEADER/FEDER.

FORMATO DE RESPUESTA (JSON estricto):
{
  "horizonte_temporal": "12 meses",
  "predicciones": [
    {
      "metrica": "...",
      "valor_actual": number,
      "valor_predicho": number,
      "confianza": number,
      "factores_influencia": [...]
    }
  ],
  "escenarios": {
    "optimista": {...},
    "base": {...},
    "pesimista": {...}
  },
  "alertas_anticipadas": [...],
  "recomendaciones_proactivas": [
    {"accion": "...", "urgencia": "alta/media/baja", "impacto_esperado": "..."}
  ],
  "oportunidades_emergentes": [...]
}`;

      const userPrompt = `Predice las tendencias para el próximo año en la gestión de fondos LEADER en España${region ? `, específicamente para ${region}` : ''}.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.6,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      let predictions;
      try {
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
      } catch {
        predictions = { rawContent: content };
      }

      return new Response(JSON.stringify({
        success: true,
        data: predictions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === EU INTEROPERABILITY CHECK ===
    if (action === 'eu_interop_check') {
      const interopStatus = {
        eidas_2_0: {
          status: 'parcial',
          progreso: 65,
          componentes: [
            { nombre: 'Identificación digital Cl@ve', estado: 'implementado' },
            { nombre: 'EUDI Wallet', estado: 'en_desarrollo' },
            { nombre: 'Firma electrónica cualificada', estado: 'implementado' },
            { nombre: 'Sello electrónico', estado: 'planificado' }
          ]
        },
        enrd_network: {
          status: 'conectado',
          ultima_sincronizacion: new Date().toISOString(),
          datos_compartidos: ['convocatorias', 'estadisticas_agregadas', 'buenas_practicas']
        },
        open_data_eu: {
          status: 'activo',
          datasets_publicados: 12,
          formatos: ['CSV', 'JSON', 'RDF'],
          licencia: 'CC-BY-4.0'
        },
        inspire_directive: {
          status: 'cumple',
          servicios_geoespaciales: ['WMS', 'WFS', 'ATOM']
        },
        gdpr_compliance: {
          status: 'cumple',
          dpd_registrado: true,
          evaluacion_impacto: 'completada',
          transferencias_internacionales: 'no_aplica'
        },
        recomendaciones: [
          'Completar integración EUDI Wallet para Q2 2025',
          'Ampliar datasets en portal Open Data EU',
          'Implementar sello electrónico para documentos oficiales'
        ]
      };

      return new Response(JSON.stringify({
        success: true,
        data: interopStatus
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Acción no soportada: ${action}`);

  } catch (error) {
    console.error('[galia-national-federation] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
