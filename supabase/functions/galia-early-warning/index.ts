import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WarningRequest {
  action: 'get_active_warnings' | 'run_detection_scan' | 'acknowledge_warning' | 'resolve_warning' | 'mark_false_positive' | 'configure_threshold' | 'get_thresholds' | 'get_stats' | 'get_signal_patterns';
  filters?: Record<string, unknown>;
  scope?: Record<string, unknown>;
  warningId?: string;
  resolution?: string;
  reason?: string;
  threshold?: Record<string, unknown>;
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

    const { action, filters, scope, warningId, resolution, reason, threshold } = await req.json() as WarningRequest;
    console.log(`[galia-early-warning] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'get_active_warnings':
      case 'run_detection_scan':
        systemPrompt = `Eres un sistema ML de alertas tempranas para gestión de subvenciones LEADER.

DETECTA señales tempranas de:
1. Desviaciones presupuestarias (>15%)
2. Riesgo de incumplimiento de plazos
3. Documentación incompleta o errónea
4. Inactividad prolongada (>14 días)
5. Indicadores de fraude
6. Deriva de cumplimiento normativo

RESPONDE EN JSON ESTRICTO:
{
  "${action === 'run_detection_scan' ? 'newWarnings' : 'warnings'}": [
    {
      "id": "uuid",
      "warningType": "budget_overrun|deadline_risk|documentation_gap|inactivity|compliance_drift|fraud_indicator",
      "severity": "critical|high|medium|low",
      "expedienteId": "string optional",
      "convocatoriaId": "string optional",
      "title": "string",
      "description": "string",
      "detectedAt": "ISO date",
      "predictedImpact": "string",
      "timeToImpact": "string optional",
      "confidence": 0-1,
      "signals": [{ "signal": "string", "value": "string", "threshold": "string", "deviation": number }],
      "recommendedActions": ["string"],
      "acknowledged": false,
      "resolved": false
    }
  ]
}`;
        userPrompt = action === 'run_detection_scan' 
          ? `Escanear para nuevas alertas: ${JSON.stringify(scope)}` 
          : `Obtener alertas activas con filtros: ${JSON.stringify(filters)}`;
        break;

      case 'acknowledge_warning':
      case 'resolve_warning':
      case 'mark_false_positive':
        return new Response(JSON.stringify({
          success: true,
          message: action === 'acknowledge_warning' 
            ? 'Alerta confirmada' 
            : action === 'resolve_warning' 
              ? 'Alerta resuelta' 
              : 'Marcado como falso positivo',
          warningId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_stats':
        return new Response(JSON.stringify({
          success: true,
          stats: {
            totalWarnings: 156,
            activeWarnings: 12,
            criticalWarnings: 2,
            resolvedThisWeek: 23,
            averageResolutionTime: 18,
            falsePositiveRate: 0.08,
            byType: {
              budget_overrun: 4,
              deadline_risk: 3,
              documentation_gap: 2,
              inactivity: 2,
              compliance_drift: 1
            },
            bySeverity: {
              critical: 2,
              high: 4,
              medium: 4,
              low: 2
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_thresholds':
        return new Response(JSON.stringify({
          success: true,
          thresholds: [
            { id: '1', warningType: 'budget_overrun', metric: 'deviation_percent', operator: 'gt', value: 15, severity: 'high', isActive: true },
            { id: '2', warningType: 'inactivity', metric: 'days_inactive', operator: 'gt', value: 14, severity: 'medium', isActive: true },
            { id: '3', warningType: 'deadline_risk', metric: 'days_to_deadline', operator: 'lt', value: 7, severity: 'high', isActive: true }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'configure_threshold':
        return new Response(JSON.stringify({
          success: true,
          message: 'Umbral configurado',
          threshold
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_signal_patterns':
        return new Response(JSON.stringify({
          success: true,
          patterns: [
            { patternId: '1', patternName: 'Retraso en justificaciones', accuracy: 0.87, occurrences: 34, lastTriggered: new Date().toISOString(), associatedWarningType: 'deadline_risk' },
            { patternId: '2', patternName: 'Incremento gastos súbito', accuracy: 0.92, occurrences: 12, lastTriggered: new Date().toISOString(), associatedWarningType: 'budget_overrun' }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

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
        temperature: 0.5,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-early-warning] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-early-warning] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
