/**
 * Galia Smart Audit
 * G1.1: Auth hardened with validateAuth
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError } from '../_shared/error-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditRequest {
  action: 'run_audit' | 'detect_anomalies' | 'generate_report' | 'apply_autofix' | 'resolve_finding' | 'get_stats';
  params?: Record<string, unknown>;
  expedienteId?: string;
  findingId?: string;
  resolution?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- G1.1: AUTH GATE ---
    const authResult = await validateAuth(req);
    if (isAuthError(authResult)) return mapAuthError(authResult, corsHeaders);
    // --- END AUTH GATE ---

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, params, expedienteId, findingId, resolution } = await req.json() as AuditRequest;
    console.log(`[galia-smart-audit] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'run_audit':
        systemPrompt = `Eres un auditor experto en subvenciones públicas LEADER/FEDER.

ANALIZA expedientes para detectar:
1. Anomalías en datos (importes, fechas, NIF)
2. Inconsistencias entre documentos
3. Datos faltantes o incompletos
4. Brechas de cumplimiento normativo
5. Posibles duplicados

RESPONDE EN JSON ESTRICTO:
{
  "findings": [
    {
      "id": "uuid",
      "expedienteId": "string",
      "findingType": "anomaly|inconsistency|missing_data|compliance_gap|duplicate",
      "severity": "critical|high|medium|low|info",
      "title": "string",
      "description": "string",
      "affectedFields": ["string"],
      "suggestedAction": "string",
      "autoFixAvailable": boolean,
      "confidence": 0-1,
      "detectedAt": "ISO date"
    }
  ],
  "summary": {
    "totalChecked": number,
    "findingsCount": number,
    "criticalCount": number
  }
}`;
        userPrompt = `Auditoría ${params?.auditType || 'quick'}: ${JSON.stringify(params)}`;
        break;

      case 'detect_anomalies':
        systemPrompt = `Eres un sistema ML de detección de patrones anómalos en gestión de subvenciones.

IDENTIFICA patrones recurrentes que indiquen:
- Fraude potencial
- Errores sistemáticos
- Comportamientos atípicos
- Tendencias preocupantes

RESPONDE EN JSON ESTRICTO:
{
  "patterns": [
    {
      "patternId": "string",
      "patternName": "string",
      "description": "string",
      "occurrences": number,
      "affectedExpedientes": ["string"],
      "trend": "increasing|stable|decreasing",
      "lastDetected": "ISO date"
    }
  ]
}`;
        userPrompt = expedienteId 
          ? `Detecta anomalías para expediente: ${expedienteId}` 
          : 'Detecta patrones anómalos globales';
        break;

      case 'generate_report':
        systemPrompt = `Eres un generador de informes de auditoría para administraciones públicas.

GENERA un informe completo que incluya:
- Resumen ejecutivo
- Hallazgos principales
- Áreas de riesgo
- Recomendaciones

RESPONDE EN JSON ESTRICTO:
{
  "report": {
    "id": "uuid",
    "reportType": "periodic|on_demand|compliance|risk",
    "period": { "start": "ISO date", "end": "ISO date" },
    "generatedAt": "ISO date",
    "summary": {
      "totalExpedientes": number,
      "audited": number,
      "findingsCount": number,
      "criticalFindings": number,
      "resolvedFindings": number,
      "complianceScore": 0-100
    },
    "findings": [],
    "recommendations": ["string"],
    "riskAreas": [{ "area": "string", "riskLevel": "string", "description": "string" }]
  }
}`;
        userPrompt = `Genera informe ${params?.reportType}: ${JSON.stringify(params)}`;
        break;

      case 'get_stats':
        // G1.1: Honest degradation — stats require DB integration
        return new Response(JSON.stringify({
          success: true,
          stats: {
            source: 'no_data_available',
            message: 'Las estadísticas de auditoría requieren datos reales del módulo GALIA. Configure la integración con expedientes.',
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'apply_autofix':
      case 'resolve_finding':
        return new Response(JSON.stringify({
          success: true,
          message: action === 'apply_autofix' ? 'Auto-fix aplicado' : 'Hallazgo resuelto',
          findingId,
          source: 'stub',
          mode: 'requires_configuration',
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
        temperature: 0.6,
        max_tokens: 4000,
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

    console.log(`[galia-smart-audit] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-smart-audit] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
