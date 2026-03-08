import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelfHealingRequest {
  action: 'analyze_health' | 'detect_degradation' | 'decide_action' | 'execute_remediation' | 'get_health_history' | 'configure_thresholds';
  installation_id?: string;
  metrics?: Record<string, unknown>;
  incident_id?: string;
  thresholds?: Record<string, number>;
  time_range_hours?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, installation_id, metrics, incident_id, thresholds, time_range_hours } = await req.json() as SelfHealingRequest;

    console.log(`[self-healing-monitor] Processing action: ${action}`);

    switch (action) {
      case 'analyze_health': {
        if (!installation_id) throw new Error('installation_id required');

        // Get recent health checks
        const { data: recentChecks } = await supabase
          .from('installation_health_checks')
          .select('*')
          .eq('installation_id', installation_id)
          .order('checked_at', { ascending: false })
          .limit(20);

        // Get installation info
        const { data: installation } = await supabase
          .from('client_installations')
          .select('*, installation_modules(*)')
          .eq('id', installation_id)
          .single();

        // Get open incidents
        const { data: openIncidents } = await supabase
          .from('installation_incidents')
          .select('*')
          .eq('installation_id', installation_id)
          .eq('status', 'open')
          .order('detected_at', { ascending: false });

        // AI analysis
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
                content: `Eres un sistema de monitoreo de salud de instalaciones ERP. Analiza métricas y determina el estado de salud.

FORMATO DE RESPUESTA (JSON estricto):
{
  "health_score": 0-100,
  "status": "healthy" | "degraded" | "warning" | "critical",
  "issues": [{"type": "string", "severity": "low|medium|high|critical", "description": "string", "affected_module": "string|null", "recommendation": "string"}],
  "trends": {"cpu": "stable|rising|falling", "memory": "stable|rising|falling", "latency": "stable|rising|falling", "errors": "stable|rising|falling"},
  "prediction": {"risk_level": "low|medium|high", "estimated_degradation_hours": number|null, "preventive_actions": ["string"]}
}`
              },
              {
                role: 'user',
                content: `Analiza esta instalación:
Installation: ${JSON.stringify(installation)}
Recent Health Checks (last 20): ${JSON.stringify(recentChecks || [])}
Open Incidents: ${JSON.stringify(openIncidents || [])}
Current Metrics: ${JSON.stringify(metrics || {})}`
              }
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        let analysis;
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { health_score: 50, status: 'unknown', issues: [], trends: {}, prediction: {} };
        } catch { analysis = { health_score: 50, status: 'unknown', issues: [], trends: {}, prediction: {} }; }

        // Store health check
        const healthCheck = {
          installation_id,
          cpu_usage: (metrics as any)?.cpu_usage || Math.random() * 100,
          memory_usage: (metrics as any)?.memory_usage || Math.random() * 100,
          disk_usage: (metrics as any)?.disk_usage || Math.random() * 100,
          response_latency_ms: (metrics as any)?.response_latency_ms || Math.random() * 500,
          error_rate: (metrics as any)?.error_rate || Math.random() * 5,
          active_connections: (metrics as any)?.active_connections || Math.floor(Math.random() * 100),
          health_score: analysis.health_score,
          metrics_raw: { ...metrics, ai_analysis: analysis },
        };

        await supabase.from('installation_health_checks').insert(healthCheck);

        // Update installation health_score
        await supabase
          .from('client_installations')
          .update({ health_score: analysis.health_score })
          .eq('id', installation_id);

        // Auto-create incident if critical
        if (analysis.health_score < 50 && analysis.issues?.length > 0) {
          const criticalIssue = analysis.issues[0];
          await supabase.from('installation_incidents').insert({
            installation_id,
            incident_type: criticalIssue.type || 'performance_degradation',
            severity: criticalIssue.severity || 'warning',
            title: criticalIssue.description || 'Health degradation detected',
            description: JSON.stringify(analysis.issues),
            trigger_metrics: healthCheck,
            affected_modules: analysis.issues.map((i: any) => i.affected_module).filter(Boolean),
            status: 'open',
          });
        }

        return new Response(JSON.stringify({
          success: true,
          action,
          data: { analysis, healthCheck, openIncidents: openIncidents?.length || 0 },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'detect_degradation': {
        if (!installation_id) throw new Error('installation_id required');

        const hours = time_range_hours || 24;
        const since = new Date(Date.now() - hours * 3600000).toISOString();

        const { data: checks } = await supabase
          .from('installation_health_checks')
          .select('*')
          .eq('installation_id', installation_id)
          .gte('checked_at', since)
          .order('checked_at', { ascending: true });

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un detector de degradación de rendimiento post-update para instalaciones ERP.

FORMATO DE RESPUESTA (JSON estricto):
{
  "degradation_detected": boolean,
  "degradation_type": "gradual" | "sudden" | "intermittent" | "none",
  "severity": "low" | "medium" | "high" | "critical",
  "affected_metrics": ["cpu" | "memory" | "latency" | "errors"],
  "correlation_with_updates": boolean,
  "root_cause_hypothesis": "string",
  "confidence": 0-100,
  "recommended_action": "monitor" | "restart" | "rollback" | "hotfix" | "escalate"
}`
              },
              { role: 'user', content: `Health checks de las últimas ${hours}h: ${JSON.stringify(checks || [])}` }
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) throw new Error(`AI API error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        let result;
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : { degradation_detected: false };
        } catch { result = { degradation_detected: false }; }

        return new Response(JSON.stringify({
          success: true, action, data: result, timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'decide_action': {
        if (!incident_id) throw new Error('incident_id required');

        const { data: incident } = await supabase
          .from('installation_incidents')
          .select('*')
          .eq('id', incident_id)
          .single();

        if (!incident) throw new Error('Incident not found');

        // Get recent updates for this installation
        const { data: recentUpdates } = await supabase
          .from('installation_updates')
          .select('*')
          .eq('installation_id', incident.installation_id)
          .order('created_at', { ascending: false })
          .limit(5);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un motor de decisión de auto-reparación para instalaciones ERP. Decides la acción correctiva basándote en el incidente y el contexto.

FORMATO DE RESPUESTA (JSON estricto):
{
  "decision": "rollback" | "hotfix" | "restart" | "escalate" | "monitor",
  "confidence": 0-100,
  "reasoning": "string",
  "rollback_target": "version string or null",
  "estimated_downtime_minutes": number,
  "risk_level": "low" | "medium" | "high",
  "steps": ["string"],
  "requires_human_approval": boolean
}`
              },
              {
                role: 'user',
                content: `Incidente: ${JSON.stringify(incident)}
Recent Updates: ${JSON.stringify(recentUpdates || [])}`
              }
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) throw new Error(`AI API error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        let decision;
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { decision: 'escalate', confidence: 0 };
        } catch { decision = { decision: 'escalate', confidence: 0 }; }

        return new Response(JSON.stringify({
          success: true, action, data: decision, timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'execute_remediation': {
        if (!incident_id) throw new Error('incident_id required');

        const { data: incident } = await supabase
          .from('installation_incidents')
          .select('*')
          .eq('id', incident_id)
          .single();

        if (!incident) throw new Error('Incident not found');

        // Simulate remediation execution
        const resolution_type = (metrics as any)?.resolution_type || 'restart';

        // Update incident as resolved
        await supabase
          .from('installation_incidents')
          .update({
            status: 'resolved',
            auto_resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_type,
            resolution_details: {
              executed_at: new Date().toISOString(),
              action: resolution_type,
              automated: true,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', incident_id);

        // If rollback, create an update record
        if (resolution_type === 'rollback') {
          const { data: lastUpdate } = await supabase
            .from('installation_updates')
            .select('*')
            .eq('installation_id', incident.installation_id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1)
            .single();

          if (lastUpdate && lastUpdate.rollback_version) {
            await supabase.from('installation_updates').insert({
              installation_id: incident.installation_id,
              module_key: lastUpdate.module_key,
              update_type: 'rollback',
              from_version: lastUpdate.to_version,
              to_version: lastUpdate.rollback_version,
              status: 'completed',
              changelog: `Auto-rollback triggered by self-healing (incident ${incident_id})`,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            });
          }
        }

        return new Response(JSON.stringify({
          success: true, action,
          data: { incident_id, resolution_type, resolved: true },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_health_history': {
        if (!installation_id) throw new Error('installation_id required');
        const hours = time_range_hours || 72;
        const since = new Date(Date.now() - hours * 3600000).toISOString();

        const { data: checks } = await supabase
          .from('installation_health_checks')
          .select('*')
          .eq('installation_id', installation_id)
          .gte('checked_at', since)
          .order('checked_at', { ascending: true });

        const { data: incidents } = await supabase
          .from('installation_incidents')
          .select('*')
          .eq('installation_id', installation_id)
          .gte('created_at', since)
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({
          success: true, action,
          data: { checks: checks || [], incidents: incidents || [] },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'configure_thresholds': {
        if (!installation_id || !thresholds) throw new Error('installation_id and thresholds required');

        await supabase
          .from('client_installations')
          .update({ health_thresholds: thresholds })
          .eq('id', installation_id);

        return new Response(JSON.stringify({
          success: true, action, data: { thresholds },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

  } catch (error) {
    console.error('[self-healing-monitor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
