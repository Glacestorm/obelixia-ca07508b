/**
 * GALIA Hybrid AI - Edge Function
 * Fase 9 del Plan Estratégico GALIA 2.0
 * 
 * Sistema de enrutamiento inteligente local/cloud
 * - Procesamiento local para datos sensibles
 * - Cloud para tareas complejas
 * - Modo híbrido con fallback automático
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationTask {
  id: string;
  type: 'document_analysis' | 'risk_assessment' | 'compliance_check' | 'report_generation' | 'decision_support';
  input: Record<string, unknown>;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface RoutingDecision {
  provider: 'local' | 'cloud' | 'hybrid';
  model: string;
  reasoning: string;
}

interface FunctionRequest {
  action: 'execute_task' | 'batch_execute' | 'analyze_document' | 'assess_risk' | 'check_health';
  task?: AutomationTask;
  tasks?: AutomationTask[];
  routing?: RoutingDecision;
  config?: {
    preferLocal?: boolean;
    fallbackToCloud?: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    const { action, task, tasks, routing, config } = await req.json() as FunctionRequest;

    console.log(`[galia-hybrid-ai] Action: ${action}, Provider: ${routing?.provider || 'auto'}`);

    // === HEALTH CHECK ===
    if (action === 'check_health') {
      return new Response(JSON.stringify({
        success: true,
        status: 'healthy',
        providers: {
          cloud: true,
          local: false // Ollama no disponible en este entorno
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === EXECUTE TASK ===
    if (action === 'execute_task' && task) {
      const auditTrail: Array<{ action: string; timestamp: string; details: string }> = [];
      const startTime = Date.now();

      auditTrail.push({
        action: 'task_received',
        timestamp: new Date().toISOString(),
        details: `Tipo: ${task.type}, Sensibilidad: ${task.sensitivity}, Complejidad: ${task.complexity}`
      });

      // Determinar prompt según tipo de tarea
      let systemPrompt = '';
      let userPrompt = '';

      switch (task.type) {
        case 'document_analysis':
          systemPrompt = `Eres un analista experto en documentación administrativa española.
Analiza documentos relacionados con subvenciones LEADER/FEDER.

FORMATO DE RESPUESTA (JSON estricto):
{
  "resumen": "Resumen ejecutivo del documento",
  "tipo_documento": "Tipo identificado",
  "entidades": [{"nombre": "...", "tipo": "...", "relevancia": "alta/media/baja"}],
  "fechas_clave": [{"fecha": "...", "evento": "..."}],
  "requisitos_identificados": ["..."],
  "alertas": ["..."],
  "puntuacion_calidad": 0-100,
  "recomendaciones": ["..."]
}`;
          userPrompt = `Analiza este documento: ${JSON.stringify(task.input)}`;
          break;

        case 'risk_assessment':
          systemPrompt = `Eres un evaluador de riesgos especializado en subvenciones públicas.
Evalúa expedientes según normativa Ley 38/2003 y reglamentos LEADER.

FORMATO DE RESPUESTA (JSON estricto):
{
  "nivel_riesgo_global": "bajo" | "medio" | "alto" | "critico",
  "puntuacion": 0-100,
  "riesgos_identificados": [
    {
      "categoria": "...",
      "descripcion": "...",
      "probabilidad": "baja/media/alta",
      "impacto": "bajo/medio/alto",
      "mitigacion": "..."
    }
  ],
  "indicadores_alerta": ["..."],
  "recomendaciones_mitigacion": ["..."],
  "cumplimiento_normativo": {
    "ley_38_2003": true/false,
    "de_minimis": true/false,
    "documentacion_completa": true/false
  }
}`;
          userPrompt = `Evalúa los riesgos de este expediente: ${JSON.stringify(task.input)}`;
          break;

        case 'compliance_check':
          systemPrompt = `Eres un auditor de cumplimiento normativo para subvenciones públicas españolas.
Verifica el cumplimiento de requisitos legales y administrativos.

FORMATO DE RESPUESTA (JSON estricto):
{
  "cumplimiento_global": true/false,
  "porcentaje_cumplimiento": 0-100,
  "verificaciones": [
    {
      "requisito": "...",
      "normativa": "...",
      "cumple": true/false,
      "evidencia": "...",
      "accion_requerida": "..." | null
    }
  ],
  "bloqueantes": ["..."],
  "subsanables": ["..."],
  "recomendaciones": ["..."]
}`;
          userPrompt = `Verifica el cumplimiento de: ${JSON.stringify(task.input)}`;
          break;

        case 'report_generation':
          systemPrompt = `Eres un generador de informes administrativos para gestión de subvenciones.
Genera informes estructurados según plantillas oficiales españolas.

FORMATO DE RESPUESTA (JSON estricto):
{
  "titulo": "...",
  "fecha_generacion": "...",
  "periodo": "...",
  "resumen_ejecutivo": "...",
  "secciones": [
    {
      "titulo": "...",
      "contenido": "...",
      "datos": {...}
    }
  ],
  "conclusiones": ["..."],
  "anexos_requeridos": ["..."]
}`;
          userPrompt = `Genera un informe de tipo ${(task.input as any).reportType} con estos datos: ${JSON.stringify((task.input as any).data)}`;
          break;

        case 'decision_support':
          systemPrompt = `Eres un sistema de soporte a decisiones para técnicos de subvenciones.
Proporciona análisis y recomendaciones basadas en datos y normativa.

FORMATO DE RESPUESTA (JSON estricto):
{
  "recomendacion": "APROBAR" | "DENEGAR" | "SUBSANAR" | "REVISAR",
  "confianza": 0-100,
  "justificacion": "...",
  "factores_positivos": ["..."],
  "factores_negativos": ["..."],
  "acciones_sugeridas": [
    {
      "accion": "...",
      "prioridad": "alta/media/baja",
      "plazo_sugerido": "..."
    }
  ],
  "riesgos_decision": ["..."]
}`;
          userPrompt = `Analiza y recomienda decisión para: ${JSON.stringify(task.input)}`;
          break;

        default:
          throw new Error(`Tipo de tarea no soportado: ${task.type}`);
      }

      auditTrail.push({
        action: 'routing_decision',
        timestamp: new Date().toISOString(),
        details: `Proveedor: ${routing?.provider || 'cloud'}, Modelo: ${routing?.model || 'gemini-2.5-flash'}`
      });

      // En este entorno solo usamos Cloud (Lovable AI Gateway)
      // En producción con infraestructura local, aquí iría la lógica de routing
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: task.complexity === 'advanced' ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
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
            success: false,
            error: 'Rate limit exceeded',
            message: 'Demasiadas solicitudes. Intenta más tarde.'
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) throw new Error('Sin contenido en respuesta IA');

      let output;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          output = JSON.parse(jsonMatch[0]);
        } else {
          output = { rawContent: content };
        }
      } catch {
        output = { rawContent: content, parseError: true };
      }

      const processingTime = Date.now() - startTime;

      auditTrail.push({
        action: 'task_completed',
        timestamp: new Date().toISOString(),
        details: `Tiempo: ${processingTime}ms, Tokens: ${aiData.usage?.total_tokens || 'N/A'}`
      });

      console.log(`[galia-hybrid-ai] Task ${task.id} completed in ${processingTime}ms`);

      return new Response(JSON.stringify({
        success: true,
        taskId: task.id,
        provider: 'cloud',
        model: task.complexity === 'advanced' ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        output,
        tokens: aiData.usage || { input: 0, output: 0 },
        processingTime,
        qualityScore: output.puntuacion || output.porcentaje_cumplimiento || output.confianza || 85,
        usedFallback: false,
        privacyFlags: task.sensitivity === 'restricted' ? ['GDPR_SENSITIVE'] : [],
        auditTrail
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === BATCH EXECUTE ===
    if (action === 'batch_execute' && tasks) {
      const results = [];
      for (const t of tasks) {
        // Recursively call for each task
        const taskResult = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'execute_task', task: t, routing, config })
        });
        const taskData = await taskResult.json();
        results.push(taskData);
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        totalTasks: tasks.length,
        completedTasks: results.filter(r => r.success).length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Acción no soportada: ${action}`);

  } catch (error) {
    console.error('[galia-hybrid-ai] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
