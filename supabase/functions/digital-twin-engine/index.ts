import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TwinRequest {
  action: 'create_twin' | 'sync_twin' | 'simulate_update' | 'run_diagnostic' | 'compare_states' | 'get_twin_status';
  installation_id?: string;
  twin_id?: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { action, installation_id, twin_id, params } = await req.json() as TwinRequest;
    console.log(`[digital-twin-engine] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'create_twin':
        systemPrompt = `Eres un sistema de Digital Twin para instalaciones ERP enterprise.
Tu tarea es crear una réplica virtual inicial de una instalación.
Genera un snapshot completo con configuración base, módulos simulados y métricas iniciales.

FORMATO JSON estricto:
{
  "twin_name": "string",
  "snapshot_config": { "environment": "virtual", "replica_version": "string", "isolation_level": "full", "network_simulation": "enabled" },
  "snapshot_modules": [{ "module_key": "string", "version": "string", "status": "active", "config_hash": "string" }],
  "snapshot_metrics": { "cpu_usage": 0-100, "memory_usage": 0-100, "disk_usage": 0-100, "response_time_ms": number, "error_rate": 0-5, "active_connections": number },
  "divergence_score": 0
}`;
        userPrompt = `Crea un digital twin para la instalación: ${JSON.stringify(params)}`;
        break;

      case 'sync_twin':
        systemPrompt = `Eres un motor de sincronización de Digital Twin.
Compara el estado actual de producción con el twin y actualiza las métricas del twin.
Calcula la divergencia (0=idéntico, 100=totalmente divergente).

FORMATO JSON estricto:
{
  "synced_modules": number,
  "synced_configs": number,
  "divergence_score": 0-100,
  "divergence_details": [{ "area": "string", "production_value": "string", "twin_value": "string", "severity": "low|medium|high" }],
  "updated_metrics": { "cpu_usage": number, "memory_usage": number, "disk_usage": number, "response_time_ms": number, "error_rate": number },
  "sync_duration_ms": number,
  "recommendations": ["string"]
}`;
        userPrompt = `Sincroniza twin con producción. Estado actual del twin: ${JSON.stringify(params)}`;
        break;

      case 'simulate_update':
        systemPrompt = `Eres un simulador de actualizaciones en entorno Digital Twin.
Simula la aplicación de un update/cambio en el twin y predice el impacto sin tocar producción.
Analiza riesgos, compatibilidad y posibles problemas.

FORMATO JSON estricto:
{
  "simulation_result": "success" | "failed" | "warning",
  "risk_score": 0-100,
  "risk_factors": [{ "factor": "string", "severity": "low|medium|high|critical", "probability": 0-100, "mitigation": "string" }],
  "predicted_impact": { "downtime_minutes": number, "affected_modules": ["string"], "data_migration_required": boolean, "rollback_complexity": "low|medium|high" },
  "compatibility_check": { "passed": boolean, "issues": ["string"] },
  "performance_prediction": { "cpu_delta": number, "memory_delta": number, "response_time_delta_ms": number },
  "recommendation": "proceed" | "caution" | "abort",
  "detailed_analysis": "string"
}`;
        userPrompt = `Simula este update en el twin: ${JSON.stringify(params)}`;
        break;

      case 'run_diagnostic':
        systemPrompt = `Eres un sistema de diagnóstico remoto vía Digital Twin.
Ejecuta un diagnóstico completo del twin (que refleja el estado de producción) sin acceder al sistema real.
Identifica problemas, cuellos de botella y oportunidades de optimización.

FORMATO JSON estricto:
{
  "overall_health": 0-100,
  "diagnostics": [{ "category": "performance|security|configuration|data|connectivity", "status": "healthy|warning|critical", "detail": "string", "recommendation": "string" }],
  "bottlenecks": [{ "area": "string", "severity": "low|medium|high", "current_value": "string", "optimal_value": "string" }],
  "optimization_opportunities": [{ "title": "string", "impact": "low|medium|high", "effort": "low|medium|high", "description": "string" }],
  "security_scan": { "vulnerabilities": number, "patches_pending": number, "compliance_score": 0-100 },
  "summary": "string"
}`;
        userPrompt = `Ejecuta diagnóstico remoto del twin: ${JSON.stringify(params)}`;
        break;

      case 'compare_states':
        systemPrompt = `Eres un comparador de estados Twin vs Producción.
Analiza las diferencias entre el Digital Twin y el sistema en producción.
Identifica divergencias y sus causas probables.

FORMATO JSON estricto:
{
  "overall_match_percentage": 0-100,
  "comparisons": [{ "aspect": "string", "production": "string", "twin": "string", "match": boolean, "importance": "low|medium|high" }],
  "critical_divergences": [{ "area": "string", "description": "string", "possible_cause": "string", "action_required": "string" }],
  "drift_timeline": [{ "detected_at": "ISO date", "area": "string", "drift_magnitude": 0-100 }],
  "sync_recommendation": "full_sync" | "partial_sync" | "no_action",
  "summary": "string"
}`;
        userPrompt = `Compara twin vs producción: ${JSON.stringify(params)}`;
        break;

      case 'get_twin_status':
        return new Response(JSON.stringify({
          success: true,
          action,
          data: { message: 'Use Supabase client to fetch twin status directly' },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit', message: 'Demasiadas solicitudes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required', message: 'Créditos insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content, parseError: true };
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[digital-twin-engine] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[digital-twin-engine] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
