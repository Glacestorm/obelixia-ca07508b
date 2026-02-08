import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GALIA Federation Edge Function
 * Portal Nacional Federado para supervisión multi-GAL
 * 
 * Permite agregar y analizar datos de múltiples Grupos de Acción Local
 * a nivel regional y nacional
 */

interface FederationRequest {
  action: 'aggregate_kpis' | 'compare_gals' | 'national_dashboard' | 'regional_report' | 'benchmark_analysis' | 'trend_prediction';
  region?: string;
  gal_ids?: string[];
  period?: { start: string; end: string };
  metrics?: string[];
  group_by?: 'region' | 'gal' | 'month' | 'quarter' | 'year';
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, region, gal_ids, period, metrics, group_by } = await req.json() as FederationRequest;

    console.log(`[galia-federation] Processing action: ${action}`);

    let result: Record<string, unknown> = {};

    // Obtener todos los GALs o filtrar por región/IDs
    let galQuery = supabase.from('galia_gal_config').select('*');
    if (region) {
      galQuery = galQuery.eq('region', region);
    }
    if (gal_ids && gal_ids.length > 0) {
      galQuery = galQuery.in('id', gal_ids);
    }

    const { data: gals, error: galsError } = await galQuery;
    if (galsError) throw galsError;

    const galIds = gals?.map(g => g.id) || [];

    switch (action) {
      case 'aggregate_kpis': {
        // Agregar KPIs de todos los GALs seleccionados
        const { data: expedientes } = await supabase
          .from('galia_expedientes')
          .select('*, solicitud:galia_solicitudes(presupuesto_total, importe_solicitado, convocatoria:galia_convocatorias(gal_id))');

        const { data: convocatorias } = await supabase
          .from('galia_convocatorias')
          .select('*')
          .in('gal_id', galIds);

        // Calcular métricas agregadas
        const totalExpedientes = expedientes?.length || 0;
        const totalPresupuesto = expedientes?.reduce((sum, e) => sum + (e.solicitud?.presupuesto_total || 0), 0) || 0;
        const totalConcedido = expedientes?.reduce((sum, e) => sum + (e.importe_concedido || 0), 0) || 0;
        const expedientesPorEstado = expedientes?.reduce((acc, e) => {
          acc[e.estado] = (acc[e.estado] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Métricas por GAL
        const metricasPorGal = gals?.map(gal => {
          const expGal = expedientes?.filter(e => e.solicitud?.convocatoria?.gal_id === gal.id) || [];
          return {
            gal_id: gal.id,
            gal_nombre: gal.nombre,
            region: gal.region,
            total_expedientes: expGal.length,
            presupuesto_gestionado: expGal.reduce((sum, e) => sum + (e.solicitud?.presupuesto_total || 0), 0),
            importe_concedido: expGal.reduce((sum, e) => sum + (e.importe_concedido || 0), 0),
            tasa_concesion: expGal.filter(e => e.estado === 'concedido').length / (expGal.length || 1) * 100
          };
        });

        result = {
          periodo: period || { start: 'all', end: 'all' },
          gals_incluidos: galIds.length,
          kpis_nacionales: {
            total_expedientes: totalExpedientes,
            total_presupuesto_solicitado: totalPresupuesto,
            total_importe_concedido: totalConcedido,
            tasa_ejecucion: totalPresupuesto > 0 ? (totalConcedido / totalPresupuesto * 100).toFixed(2) : 0,
            expedientes_por_estado: expedientesPorEstado,
            convocatorias_activas: convocatorias?.filter(c => c.estado === 'abierta').length || 0
          },
          metricas_por_gal: metricasPorGal,
          ranking: metricasPorGal?.sort((a, b) => b.importe_concedido - a.importe_concedido).slice(0, 10)
        };
        break;
      }

      case 'compare_gals': {
        if (!gal_ids || gal_ids.length < 2) {
          throw new Error('Se requieren al menos 2 GALs para comparar');
        }

        // Obtener datos de expedientes para comparación
        const comparacionData = await Promise.all(gal_ids.map(async (galId) => {
          const { data: convs } = await supabase
            .from('galia_convocatorias')
            .select('id')
            .eq('gal_id', galId);
          
          const convIds = convs?.map(c => c.id) || [];
          
          const { data: sols } = await supabase
            .from('galia_solicitudes')
            .select('*, expediente:galia_expedientes(*)')
            .in('convocatoria_id', convIds);
          
          return { galId, solicitudes: sols || [] };
        }));

        // Usar IA para análisis comparativo
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un analista del sistema GALIA especializado en comparar el rendimiento de Grupos de Acción Local (GAL) en la gestión de subvenciones LEADER.

RESPONDE EN JSON con:
{
  "comparativa": [
    { "gal_id": string, "fortalezas": string[], "areas_mejora": string[], "score_eficiencia": number }
  ],
  "mejor_practica": { "gal_id": string, "motivo": string },
  "recomendaciones_cruzadas": string[],
  "tendencia_general": string
}`
              },
              {
                role: 'user',
                content: `Compara estos GALs basándote en sus datos de gestión: ${JSON.stringify(comparacionData.map(d => ({
                  gal_id: d.galId,
                  total_solicitudes: d.solicitudes.length,
                  concedidas: d.solicitudes.filter(s => s.expediente?.estado === 'concedido').length,
                  presupuesto_medio: d.solicitudes.length > 0 
                    ? d.solicitudes.reduce((sum, s) => sum + (s.presupuesto_total || 0), 0) / d.solicitudes.length 
                    : 0
                })))}`
              }
            ],
            temperature: 0.5,
            max_tokens: 1000
          }),
        });

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        let analisis;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analisis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
          analisis = { raw: content };
        }

        result = {
          gals_comparados: gal_ids,
          datos_base: comparacionData.map(d => ({
            gal_id: d.galId,
            total_solicitudes: d.solicitudes.length,
            tasa_concesion: d.solicitudes.length > 0 
              ? (d.solicitudes.filter(s => s.expediente?.estado === 'concedido').length / d.solicitudes.length * 100).toFixed(2)
              : 0
          })),
          analisis_ia: analisis
        };
        break;
      }

      case 'national_dashboard': {
        // Dashboard nacional agregado
        const regiones = ['Asturias', 'Galicia', 'Cantabria', 'País Vasco', 'Castilla y León', 'Aragón', 'Cataluña', 'Andalucía', 'Extremadura'];
        
        const { data: allExpedientes } = await supabase
          .from('galia_expedientes')
          .select('*, solicitud:galia_solicitudes(*, convocatoria:galia_convocatorias(*, gal:galia_gal_config(*)))');

        // Agrupar por región
        const datoPorRegion = regiones.map(r => {
          const expRegion = allExpedientes?.filter(e => e.solicitud?.convocatoria?.gal?.region === r) || [];
          return {
            region: r,
            num_gals: new Set(expRegion.map(e => e.solicitud?.convocatoria?.gal_id)).size,
            total_expedientes: expRegion.length,
            importe_total: expRegion.reduce((sum, e) => sum + (e.importe_concedido || 0), 0),
            tasa_ejecucion: expRegion.length > 0 
              ? (expRegion.filter(e => ['concedido', 'cerrado'].includes(e.estado)).length / expRegion.length * 100)
              : 0
          };
        }).filter(r => r.num_gals > 0);

        result = {
          nivel: 'nacional',
          fecha_actualizacion: new Date().toISOString(),
          resumen: {
            total_gals: gals?.length || 0,
            total_regiones: datoPorRegion.length,
            total_expedientes: allExpedientes?.length || 0,
            presupuesto_total_ejecutado: allExpedientes?.reduce((sum, e) => sum + (e.importe_concedido || 0), 0) || 0
          },
          datos_por_region: datoPorRegion.sort((a, b) => b.importe_total - a.importe_total),
          mapa_calor: datoPorRegion.map(r => ({
            region: r.region,
            intensidad: r.tasa_ejecucion,
            valor: r.importe_total
          }))
        };
        break;
      }

      case 'regional_report': {
        if (!region) {
          throw new Error('Se requiere especificar una región');
        }

        const { data: galsRegion } = await supabase
          .from('galia_gal_config')
          .select('*')
          .eq('region', region);

        const galIdsRegion = galsRegion?.map(g => g.id) || [];

        const { data: convsRegion } = await supabase
          .from('galia_convocatorias')
          .select('*')
          .in('gal_id', galIdsRegion);

        const convIdsRegion = convsRegion?.map(c => c.id) || [];

        const { data: solsRegion } = await supabase
          .from('galia_solicitudes')
          .select('*, expediente:galia_expedientes(*)')
          .in('convocatoria_id', convIdsRegion);

        result = {
          region,
          periodo: period || 'todo',
          gals: galsRegion?.map(g => ({
            id: g.id,
            nombre: g.nombre,
            codigo_leader: g.codigo_leader
          })),
          estadisticas: {
            num_gals: galsRegion?.length || 0,
            convocatorias_totales: convsRegion?.length || 0,
            convocatorias_abiertas: convsRegion?.filter(c => c.estado === 'abierta').length || 0,
            solicitudes_totales: solsRegion?.length || 0,
            presupuesto_solicitado: solsRegion?.reduce((sum, s) => sum + (s.presupuesto_total || 0), 0) || 0,
            importe_concedido: solsRegion?.reduce((sum, s) => sum + (s.expediente?.importe_concedido || 0), 0) || 0
          },
          distribucion_sectorial: {},
          empleo_estimado: {}
        };
        break;
      }

      case 'benchmark_analysis': {
        // Análisis de benchmarking entre GALs
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un experto en análisis de benchmarking para la gestión de subvenciones LEADER en España.

Analiza los datos proporcionados y genera un informe de benchmarking completo.

RESPONDE EN JSON:
{
  "metricas_clave": [
    { "nombre": string, "descripcion": string, "mejor_valor": number, "gal_referencia": string }
  ],
  "cuartiles": {
    "q1": { "umbral": number, "gals": string[] },
    "q2": { "umbral": number, "gals": string[] },
    "q3": { "umbral": number, "gals": string[] },
    "q4": { "umbral": number, "gals": string[] }
  },
  "mejores_practicas": string[],
  "recomendaciones_mejora": string[]
}`
              },
              {
                role: 'user',
                content: `Genera un análisis de benchmarking para ${gals?.length || 0} GALs. Métricas a evaluar: ${metrics?.join(', ') || 'tasa_concesión, tiempo_resolución, satisfacción_beneficiario'}`
              }
            ],
            temperature: 0.5,
            max_tokens: 1200
          }),
        });

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        let benchmark;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          benchmark = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
          benchmark = { raw: content };
        }

        result = {
          tipo: 'benchmark',
          gals_analizados: galIds.length,
          metricas: metrics || ['tasa_concesion', 'tiempo_resolucion', 'satisfaccion'],
          analisis: benchmark
        };
        break;
      }

      case 'trend_prediction': {
        // Predicción de tendencias
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un analista predictivo del sistema GALIA. Basándote en datos históricos, predices tendencias futuras para la gestión de subvenciones LEADER.

RESPONDE EN JSON:
{
  "predicciones": [
    { "metrica": string, "tendencia": "creciente|estable|decreciente", "variacion_esperada": number, "confianza": number }
  ],
  "alertas_futuras": string[],
  "oportunidades": string[],
  "recomendaciones_estrategicas": string[]
}`
              },
              {
                role: 'user',
                content: `Predice tendencias para los próximos 6 meses basándote en: ${galIds.length} GALs activos, región: ${region || 'todas'}, periodo analizado: ${period ? `${period.start} a ${period.end}` : 'último año'}`
              }
            ],
            temperature: 0.6,
            max_tokens: 1000
          }),
        });

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        let prediccion;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          prediccion = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
          prediccion = { raw: content };
        }

        result = {
          tipo: 'prediccion',
          horizonte: '6_meses',
          basado_en: { gals: galIds.length, region: region || 'nacional' },
          prediccion
        };
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-federation] Action ${action} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-federation] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
