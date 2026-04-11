/**
 * Security Intelligence Agent
 * G1.1: Auth hardened with validateAuth
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError } from '../_shared/error-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityRequest {
  action: 'threat_detection' | 'vulnerability_scan' | 'incident_response' | 'access_analysis' | 
          'compliance_check' | 'behavioral_analytics' | 'threat_hunting' | 'forensic_analysis' |
          'security_posture' | 'zero_trust_evaluation';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
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

    const { action, context, params } = await req.json() as SecurityRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'threat_detection':
        systemPrompt = `Eres un sistema avanzado de detección de amenazas de seguridad.

CAPACIDADES:
- Análisis de patrones de ataque en tiempo real
- Detección de anomalías en comportamiento de red
- Identificación de malware y código malicioso
- Correlación de eventos de seguridad
- Detección de amenazas persistentes avanzadas (APT)

RESPUESTA JSON:
{
  "threats": [{
    "id": "string",
    "type": "malware|intrusion|data_exfiltration|dos|insider_threat|apt|ransomware|phishing",
    "severity": "critical|high|medium|low|info",
    "confidence": 0-100,
    "source": {"ip": "string", "geo": "string", "reputation": "string"},
    "target": {"asset": "string", "data": "string"},
    "indicators": ["string"],
    "mitre_attack": {"tactic": "string", "technique": "string", "id": "string"},
    "timeline": [{"timestamp": "ISO", "event": "string"}],
    "recommended_actions": ["string"]
  }],
  "risk_score": 0-100,
  "active_attacks": 0,
  "blocked_attempts": 0,
  "summary": "string"
}`;
        userPrompt = `Analiza amenazas de seguridad: ${JSON.stringify({ context, params })}`;
        break;

      case 'vulnerability_scan':
        systemPrompt = `Eres un escáner de vulnerabilidades empresarial con IA.

RESPUESTA JSON:
{
  "vulnerabilities": [{
    "id": "string",
    "cve_id": "string|null",
    "cvss_score": 0-10,
    "severity": "critical|high|medium|low",
    "type": "code|config|dependency|infrastructure|api",
    "affected_asset": "string",
    "description": "string",
    "remediation": {
      "priority": "immediate|short_term|medium_term",
      "steps": ["string"],
      "patch_available": false
    }
  }],
  "scan_coverage": 0-100,
  "risk_score": 0-100
}`;
        userPrompt = `Escanea vulnerabilidades: ${JSON.stringify({ context, params })}`;
        break;

      case 'incident_response':
        systemPrompt = `Eres un sistema de respuesta automática a incidentes de seguridad.

RESPUESTA JSON:
{
  "incident": {
    "id": "string",
    "classification": "security_breach|data_leak|malware|unauthorized_access|dos|insider",
    "severity": "critical|high|medium|low",
    "status": "detected|analyzing|containing|eradicating|recovering|closed"
  },
  "containment_actions": [{"action": "string", "target": "string", "status": "pending", "automated": false}],
  "affected_assets": ["string"],
  "recovery_plan": {"steps": ["string"], "estimated_time": "string"}
}`;
        userPrompt = `Gestiona incidente de seguridad: ${JSON.stringify({ context, params })}`;
        break;

      case 'access_analysis':
        systemPrompt = `Eres un analizador de accesos y privilegios con IA.

RESPUESTA JSON:
{
  "access_patterns": [{"user_id": "string", "risk_level": "critical|high|medium|low", "anomalies": [{"type": "string", "description": "string", "confidence": 0-100}]}],
  "privilege_issues": [{"user_id": "string", "issue": "string", "recommendation": "string"}],
  "statistics": {"total_users": 0, "active_sessions": 0, "high_risk_sessions": 0}
}`;
        userPrompt = `Analiza accesos y privilegios: ${JSON.stringify({ context, params })}`;
        break;

      case 'compliance_check':
        systemPrompt = `Eres un auditor de cumplimiento de seguridad. Frameworks: ISO 27001, SOC 2, GDPR, PCI-DSS, NIST, DORA.

RESPUESTA JSON:
{
  "compliance_status": {"framework": "string", "overall_score": 0-100, "status": "compliant|partially_compliant|non_compliant"},
  "controls": [{"control_id": "string", "status": "implemented|partial|not_implemented", "gaps": ["string"], "remediation_steps": ["string"]}],
  "audit_findings": [{"finding_id": "string", "severity": "major|minor|observation", "description": "string", "recommendation": "string"}]
}`;
        userPrompt = `Verifica cumplimiento de seguridad: ${JSON.stringify({ context, params })}`;
        break;

      case 'behavioral_analytics':
        systemPrompt = `Eres un sistema de análisis de comportamiento de usuarios (UEBA).

RESPUESTA JSON:
{
  "user_profiles": [{"user_id": "string", "risk_score": 0-100, "risk_trend": "increasing|stable|decreasing", "current_deviations": [{"type": "string", "deviation_score": 0-100, "description": "string"}]}],
  "alerts": [{"priority": "critical|high|medium|low", "type": "string", "description": "string"}]
}`;
        userPrompt = `Analiza comportamiento: ${JSON.stringify({ context, params })}`;
        break;

      case 'threat_hunting':
        systemPrompt = `Eres un sistema proactivo de threat hunting con IA.

RESPUESTA JSON:
{
  "hunting_campaign": {"id": "string", "hypothesis": "string", "status": "active|completed|findings_detected"},
  "findings": [{"id": "string", "severity": "critical|high|medium|low", "type": "string", "description": "string", "evidence": [{"type": "string", "data": "string"}]}],
  "iocs_detected": [{"type": "ip|domain|hash|email|url", "value": "string"}],
  "statistics": {"events_analyzed": 0, "assets_scanned": 0}
}`;
        userPrompt = `Ejecuta threat hunting: ${JSON.stringify({ context, params })}`;
        break;

      case 'forensic_analysis':
        systemPrompt = `Eres un sistema de análisis forense digital con IA.

RESPUESTA JSON:
{
  "investigation": {"case_id": "string", "status": "in_progress|completed|requires_escalation", "type": "breach|malware|insider|fraud"},
  "timeline": [{"timestamp": "ISO", "event_type": "string", "description": "string", "significance": "critical|important|informational"}],
  "attack_narrative": "string",
  "root_cause": "string",
  "recommendations": ["string"]
}`;
        userPrompt = `Ejecuta análisis forense: ${JSON.stringify({ context, params })}`;
        break;

      case 'security_posture':
        systemPrompt = `Eres un evaluador de postura de seguridad empresarial.

RESPUESTA JSON:
{
  "overall_posture": {"score": 0-100, "grade": "A|B|C|D|F", "trend": "improving|stable|declining"},
  "domains": [{"domain": "identity|network|endpoint|data|cloud|application", "score": 0-100, "strengths": ["string"], "weaknesses": ["string"]}],
  "risk_exposure": {"overall_risk": "critical|high|medium|low", "top_risks": [{"risk": "string", "likelihood": "string", "impact": "string"}]},
  "improvement_roadmap": [{"phase": "immediate|short_term|medium_term", "initiatives": [{"title": "string", "impact": "high|medium|low", "effort": "high|medium|low"}]}]
}`;
        userPrompt = `Evalúa postura de seguridad: ${JSON.stringify({ context, params })}`;
        break;

      case 'zero_trust_evaluation':
        systemPrompt = `Eres un evaluador de arquitectura Zero Trust.

RESPUESTA JSON:
{
  "zero_trust_score": 0-100,
  "maturity_level": "traditional|hybrid|advanced|optimal",
  "pillars": [{"pillar": "identity|devices|network|applications|data", "score": 0-100, "gap_analysis": ["string"]}],
  "quick_wins": ["string"],
  "transformation_roadmap": {"phases": [{"phase": 1, "focus_areas": ["string"], "timeline": "string"}]}
}`;
        userPrompt = `Evalúa arquitectura Zero Trust: ${JSON.stringify({ context, params })}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[security-intelligence] Processing: ${action}`);

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
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required', 
          message: 'Créditos de IA insuficientes.' 
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
    } catch (parseError) {
      console.error('[security-intelligence] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[security-intelligence] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[security-intelligence] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
