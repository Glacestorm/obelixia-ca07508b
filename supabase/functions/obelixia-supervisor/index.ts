/**
 * ObelixIA-Supervisor — Phase 2
 * Cross-domain supersupervisor that orchestrates HR-Supervisor and Legal-Supervisor.
 * Handles conflict resolution, composed responses, and human escalation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CROSS_DOMAIN_CLASSIFIER = `Eres un clasificador de consultas transversales RRHH+Jurídico. Tu objetivo es determinar si una consulta requiere coordinación cross-domain.

CLASIFICACIÓN:
- hr_only: La consulta es puramente de RRHH, sin implicación legal significativa.
- legal_only: La consulta es puramente jurídica, sin implicación de RRHH.
- cross_domain: La consulta requiere coordinación entre RRHH y Jurídico. Ejemplos: despidos, ERE/ERTE, permisos protegidos, movilidad internacional, compliance laboral, contratos con impacto legal, cambios normativos con impacto HR.
- trivial: Consulta trivial que no necesita el supersupervisor.

REGLAS:
- Si hay riesgo legal + impacto operativo RRHH → cross_domain.
- Despidos, ERE, sanciones disciplinarias, permisos protegidos → SIEMPRE cross_domain.
- Nómina simple, vacaciones estándar → hr_only.
- Revisión de contrato mercantil → legal_only.
- Responde SOLO con JSON válido.

FORMATO:
{"classification": "hr_only|legal_only|cross_domain|trivial", "confidence": 0.0-1.0, "reasoning": "...", "risk_level": "low|medium|high|critical", "requires_human_review": false}`;

const CONFLICT_RESOLVER_PROMPT = `Eres un árbitro experto en resolución de conflictos entre departamentos de RRHH y Jurídico.
Recibes las respuestas de ambos supervisores y debes:
1. Identificar si hay conflicto real (recomendaciones contradictorias, niveles de riesgo divergentes).
2. Si hay conflicto, explicar la divergencia y recomendar la posición más conservadora/segura.
3. Decidir si se necesita revisión humana.
4. Componer una respuesta unificada.

REGLAS DE RESOLUCIÓN:
- Si un supervisor dice "bloquear" y otro "continuar" → prevalece "bloquear" + revisión humana obligatoria.
- Si los niveles de riesgo divergen en ≥2 niveles → conflicto real + revisión humana.
- Si ambos coinciden → no hay conflicto, componer respuesta directamente.
- Siempre priorizar la seguridad jurídica sobre la eficiencia operativa.

FORMATO DE RESPUESTA (JSON estricto):
{
  "has_conflict": true/false,
  "conflict_type": "none|risk_divergence|recommendation_conflict|severity_mismatch",
  "conflict_description": "...",
  "resolution": "...",
  "final_risk_level": "low|medium|high|critical",
  "final_recommendation": "...",
  "requires_human_review": true/false,
  "human_review_reason": "...",
  "action_allowed": true/false,
  "composed_response": "..."
}`;

interface SuperSupervisorRequest {
  action: 'coordinate' | 'get_status' | 'get_cross_cases' | 'regulatory_cross_domain';
  company_id: string;
  query?: string;
  context?: Record<string, unknown>;
  session_id?: string;
  // For regulatory_cross_domain
  document?: {
    id: string;
    document_title: string;
    summary: string | null;
    impact_summary: string | null;
    impact_domains: string[];
    impact_level: string;
    requires_human_review: boolean;
    source_url: string | null;
    source_code?: string;
    publication_date?: string;
    legal_area?: string;
  };
  trigger_reason?: string;
}

const REGULATORY_CROSS_DOMAIN_PROMPT = `Eres un coordinador experto que evalúa el impacto cross-domain de cambios regulatorios en España y la UE.
Recibes un documento normativo que afecta a múltiples dominios (RRHH + Jurídico) y las respuestas de ambos supervisores.

Tu trabajo:
1. Evaluar el impacto operativo para RRHH (procesos, nómina, contratos, plantilla).
2. Evaluar el impacto jurídico/compliance (obligaciones, riesgos, plazos).
3. Detectar conflictos entre las recomendaciones de ambos supervisores.
4. Componer una recomendación unificada con acciones concretas y específicas.
5. Decidir si requiere revisión humana.

REGLAS:
- Cambios en despidos, jornada, permisos protegidos, cotización → SIEMPRE revisión humana.
- Si un supervisor recomienda acción urgente y otro no → conflicto + revisión humana.
- Priorizar seguridad jurídica sobre eficiencia operativa.

REGLAS PARA adaptation_deadline:
- Si el documento indica una fecha de entrada en vigor concreta → usar esa fecha.
- Si es una ley/RD publicado en BOE → plazo = fecha entrada en vigor o "20 días hábiles desde publicación" si no indica otra cosa.
- Si es directiva UE → plazo de transposición (normalmente 2 años, indicar fecha estimada).
- Si no hay plazo claro → usar "Sin plazo definido - revisar periódicamente".
- NUNCA inventar plazos genéricos como "30 días" sin base normativa.

REGLAS PARA priority_actions:
- Cada acción debe ser ESPECÍFICA y ACCIONABLE (ej: "Revisar cláusula de no competencia en contratos vigentes", NO "Revisar contratos").
- Indicar QUIÉN debe actuar (RRHH, Jurídico, Compliance, Dirección).
- Indicar URGENCIA relativa (inmediato, antes de entrada en vigor, planificable).
- Máximo 4 acciones. Si hay más, priorizar las más urgentes.

FORMATO (JSON estricto):
{
  "has_conflict": true/false,
  "conflict_type": "none|risk_divergence|recommendation_conflict|priority_mismatch",
  "hr_impact": "resumen del impacto RRHH con áreas afectadas concretas",
  "legal_impact": "resumen del impacto jurídico con obligaciones concretas",
  "final_risk_level": "low|medium|high|critical",
  "final_recommendation": "recomendación unificada con acciones específicas",
  "requires_human_review": true/false,
  "human_review_reason": "motivo si aplica",
  "adaptation_deadline": "plazo concreto basado en la norma, o 'Sin plazo definido - revisar periódicamente'",
  "priority_actions": ["[RRHH/Urgente] Acción específica 1", "[Jurídico/Planificable] Acción específica 2"],
  "composed_response": "respuesta completa para el usuario"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const input: SuperSupervisorRequest = await req.json();
    const { action, company_id, query, context, session_id } = input;

    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fnUrl = `${supabaseUrl}/functions/v1`;

    // === GET STATUS ===
    if (action === 'get_status') {
      const { data: crossInvocations } = await supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .eq('supervisor_code', 'obelixia-supervisor')
        .order('created_at', { ascending: false })
        .limit(50);

      const invocations = crossInvocations || [];
      const conflicts = invocations.filter((i: any) => i.metadata?.has_conflict);
      const humanReview = invocations.filter((i: any) => i.outcome_status === 'human_review');

      return new Response(JSON.stringify({
        success: true,
        data: {
          status: 'active',
          total_cases: invocations.length,
          conflicts: conflicts.length,
          human_review_pending: humanReview.length,
          recent_cases: invocations.slice(0, 10),
          timestamp: new Date().toISOString(),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === GET CROSS CASES ===
    if (action === 'get_cross_cases') {
      const { data: cases } = await supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .eq('supervisor_code', 'obelixia-supervisor')
        .order('created_at', { ascending: false })
        .limit(30);

      return new Response(JSON.stringify({ success: true, data: cases || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === COORDINATE (main cross-domain flow) ===
    if (action === 'coordinate') {
      if (!query) {
        return new Response(JSON.stringify({ success: false, error: 'query required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      console.log(`[obelixia-supervisor] Coordinating: ${query.substring(0, 80)}...`);

      // Step 1: Classify if cross-domain is needed
      const classResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: CROSS_DOMAIN_CLASSIFIER },
            { role: 'user', content: query }
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!classResp.ok) {
        if (classResp.status === 429) {
          return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (classResp.status === 402) {
          return new Response(JSON.stringify({ success: false, error: 'Créditos IA insuficientes.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error(`Classifier error: ${classResp.status}`);
      }

      const classData = await classResp.json();
      const classContent = classData.choices?.[0]?.message?.content || '';
      
      let classification = { classification: 'cross_domain', confidence: 0.5, reasoning: 'default', risk_level: 'medium', requires_human_review: false };
      try {
        const m = classContent.match(/\{[\s\S]*\}/);
        if (m) classification = JSON.parse(m[0]);
      } catch {
        console.warn('[obelixia-supervisor] Classification parse error');
      }

      console.log(`[obelixia-supervisor] Classification: ${classification.classification} (${classification.confidence}) risk=${classification.risk_level}`);

      // If trivial or single-domain, delegate directly
      if (classification.classification === 'trivial' || classification.classification === 'hr_only') {
        // Delegate to HR-Supervisor
        try {
          const resp = await fetch(`${fnUrl}/hr-multiagent-supervisor`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'route_query', company_id, query, context, session_id }),
          });
          const hrResult = await resp.json();

          // Log delegation
          await supabase.from('erp_ai_agent_invocations').insert({
            agent_code: 'obelixia-supervisor',
            supervisor_code: 'obelixia-supervisor',
            company_id,
            user_id: userId,
            input_summary: query.substring(0, 500),
            routing_reason: `Delegated to HR: ${classification.reasoning}`,
            confidence_score: classification.confidence,
            outcome_status: 'delegated_hr',
            execution_time_ms: Date.now() - startTime,
            response_summary: 'Delegated to hr-supervisor',
            metadata: { classification, session_id, delegated_to: 'hr-supervisor', phase: '2' },
          }).catch(() => {});

          return new Response(JSON.stringify({
            success: true,
            data: {
              ...hrResult?.data,
              supersupervisor: { delegated: true, delegated_to: 'hr-supervisor', classification },
            }
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (err) {
          console.error('[obelixia-supervisor] HR delegation error:', err);
        }
      }

      if (classification.classification === 'legal_only') {
        try {
          const resp = await fetch(`${fnUrl}/legal-multiagent-supervisor`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'route_query', company_id, query, context }),
          });
          const legalResult = await resp.json();

          await supabase.from('erp_ai_agent_invocations').insert({
            agent_code: 'obelixia-supervisor',
            supervisor_code: 'obelixia-supervisor',
            company_id,
            user_id: userId,
            input_summary: query.substring(0, 500),
            routing_reason: `Delegated to Legal: ${classification.reasoning}`,
            confidence_score: classification.confidence,
            outcome_status: 'delegated_legal',
            execution_time_ms: Date.now() - startTime,
            response_summary: 'Delegated to legal-supervisor',
            metadata: { classification, session_id, delegated_to: 'legal-supervisor', phase: '2' },
          }).catch(() => {});

          return new Response(JSON.stringify({
            success: true,
            data: {
              ...legalResult?.data,
              supersupervisor: { delegated: true, delegated_to: 'legal-supervisor', classification },
            }
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (err) {
          console.error('[obelixia-supervisor] Legal delegation error:', err);
        }
      }

      // === CROSS-DOMAIN COORDINATION ===
      console.log('[obelixia-supervisor] Initiating cross-domain coordination');

      // Step 2: Consult both supervisors in parallel
      const [hrResp, legalResp] = await Promise.allSettled([
        fetch(`${fnUrl}/hr-multiagent-supervisor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'route_query',
            company_id,
            query,
            context: { ...context, source: 'obelixia-supervisor', cross_domain: true },
            session_id,
          }),
        }).then(r => r.json()),
        fetch(`${fnUrl}/legal-multiagent-supervisor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'validate_hr_action',
            company_id,
            query,
            context: { ...context, source: 'obelixia-supervisor', cross_domain: true },
            source_agent: 'obelixia-supervisor',
          }),
        }).then(r => r.json()),
      ]);

      const hrResult = hrResp.status === 'fulfilled' ? hrResp.value : null;
      const legalResult = legalResp.status === 'fulfilled' ? legalResp.value : null;

      // Step 3: Resolve conflicts with AI
      const conflictInput = JSON.stringify({
        hr_response: hrResult?.data || hrResult || null,
        legal_response: legalResult?.data || legalResult || null,
        original_query: query,
        classification,
        context,
      });

      const resolverResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: CONFLICT_RESOLVER_PROMPT },
            { role: 'user', content: conflictInput }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      let resolution = {
        has_conflict: false,
        conflict_type: 'none',
        conflict_description: '',
        resolution: '',
        final_risk_level: classification.risk_level || 'medium',
        final_recommendation: '',
        requires_human_review: classification.requires_human_review || false,
        human_review_reason: '',
        action_allowed: true,
        composed_response: '',
      };

      if (resolverResp.ok) {
        const resolverData = await resolverResp.json();
        const resolverContent = resolverData.choices?.[0]?.message?.content || '';
        try {
          const m = resolverContent.match(/\{[\s\S]*\}/);
          if (m) resolution = { ...resolution, ...JSON.parse(m[0]) };
        } catch {
          console.warn('[obelixia-supervisor] Resolution parse error');
        }
      }

      // Force human review for critical or conflict situations
      if (resolution.final_risk_level === 'critical' || resolution.has_conflict) {
        resolution.requires_human_review = true;
      }

      const executionTime = Date.now() - startTime;
      const outcomeStatus = resolution.requires_human_review 
        ? 'human_review' 
        : resolution.has_conflict ? 'conflict_resolved' : 'success';

      // Step 4: Log cross-domain invocation
      try {
        await supabase.from('erp_ai_agent_invocations').insert({
          agent_code: 'obelixia-supervisor',
          supervisor_code: 'obelixia-supervisor',
          company_id,
          user_id: userId,
          input_summary: query.substring(0, 500),
          routing_reason: `Cross-domain: ${classification.reasoning}`,
          confidence_score: classification.confidence,
          escalated_to: resolution.requires_human_review ? 'human_review' : null,
          escalation_reason: resolution.human_review_reason || null,
          outcome_status: outcomeStatus,
          execution_time_ms: executionTime,
          response_summary: JSON.stringify({
            conflict: resolution.has_conflict,
            risk: resolution.final_risk_level,
            recommendation: resolution.final_recommendation?.substring(0, 200),
          }).substring(0, 1000),
          metadata: {
            session_id,
            classification,
            has_conflict: resolution.has_conflict,
            conflict_type: resolution.conflict_type,
            final_risk_level: resolution.final_risk_level,
            requires_human_review: resolution.requires_human_review,
            hr_available: !!hrResult?.success,
            legal_available: !!legalResult?.success,
            action_allowed: resolution.action_allowed,
            phase: '2',
          },
        });
      } catch (logErr) {
        console.error('[obelixia-supervisor] Log error:', logErr);
      }

      // Step 5: Return composed result
      return new Response(JSON.stringify({
        success: true,
        data: {
          supersupervisor: {
            classification,
            resolution: {
              has_conflict: resolution.has_conflict,
              conflict_type: resolution.conflict_type,
              conflict_description: resolution.conflict_description,
              final_risk_level: resolution.final_risk_level,
              final_recommendation: resolution.final_recommendation,
              requires_human_review: resolution.requires_human_review,
              human_review_reason: resolution.human_review_reason,
              action_allowed: resolution.action_allowed,
              composed_response: resolution.composed_response,
            },
          },
          hr_response: hrResult?.data || null,
          legal_response: legalResult?.data || null,
          execution_time_ms: executionTime,
          outcome_status: outcomeStatus,
          timestamp: new Date().toISOString(),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === REGULATORY CROSS-DOMAIN ===
    if (action === 'regulatory_cross_domain') {
      const doc = input.document;
      if (!doc) {
        return new Response(JSON.stringify({ success: false, error: 'document required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

      console.log(`[obelixia-supervisor] Regulatory cross-domain: ${doc.document_title?.substring(0, 60)}`);

      // Phase 2D: Load learning context from validated cases + feedback
      let learningContext = '';
      try {
        const { data: validatedCases } = await supabase
          .from('erp_validated_cases')
          .select('case_type, validated_severity, validated_has_conflict, validated_priority_actions, validated_deadline, impact_domains, escalation_was_correct, quality_score, input_summary, legal_area')
          .order('quality_score', { ascending: false })
          .limit(5);

        const { data: feedbackPatterns } = await supabase
          .from('erp_cross_domain_feedback')
          .select('case_type, escalation_correct, severity_correct, actions_useful, deadline_reasonable, corrected_severity, corrected_deadline, corrected_actions')
          .not('escalation_correct', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (validatedCases?.length) {
          const examples = validatedCases.map((vc: any) => 
            `- Tipo: ${vc.case_type}, Dominios: ${(vc.impact_domains||[]).join('+')}, Severidad validada: ${vc.validated_severity}, Conflicto: ${vc.validated_has_conflict ? 'sí' : 'no'}, Acciones: ${JSON.stringify(vc.validated_priority_actions || [])}, Plazo: ${vc.validated_deadline || 'N/A'}`
          ).join('\n');
          learningContext += `\n\nCASOS VALIDADOS DE REFERENCIA:\n${examples}`;
        }

        if (feedbackPatterns?.length) {
          const corrections: string[] = [];
          const falseEscalations = feedbackPatterns.filter((f: any) => f.escalation_correct === false).length;
          const badSeverity = feedbackPatterns.filter((f: any) => f.severity_correct === false).length;
          const badActions = feedbackPatterns.filter((f: any) => f.actions_useful === false).length;
          const badDeadlines = feedbackPatterns.filter((f: any) => f.deadline_reasonable === false).length;

          if (falseEscalations > feedbackPatterns.length * 0.3) corrections.push('ATENCIÓN: hay un alto ratio de escalados incorrectos. Sé más selectivo al escalar.');
          if (badSeverity > feedbackPatterns.length * 0.3) corrections.push('ATENCIÓN: la severidad frecuentemente se corrige. Calibra mejor los niveles de riesgo.');
          if (badActions > feedbackPatterns.length * 0.3) corrections.push('ATENCIÓN: las acciones no se consideran útiles frecuentemente. Sé más específico y accionable.');
          if (badDeadlines > feedbackPatterns.length * 0.3) corrections.push('ATENCIÓN: los plazos frecuentemente se consideran no razonables. Ancla mejor los plazos a la norma.');

          const correctedSeverities = feedbackPatterns.filter((f: any) => f.corrected_severity).map((f: any) => f.corrected_severity);
          if (correctedSeverities.length > 0) corrections.push(`Severidades corregidas frecuentes: ${[...new Set(correctedSeverities)].join(', ')}`);

          if (corrections.length > 0) {
            learningContext += `\n\nAPRENDIZAJE DE FEEDBACK HUMANO:\n${corrections.join('\n')}`;
          }
        }
      } catch (learnErr) {
        console.warn('[obelixia-supervisor] Learning context load error:', learnErr);
      }

      const regulatoryQuery = `Cambio normativo: "${doc.document_title}". Resumen: ${doc.summary || doc.impact_summary || 'Sin resumen'}. Impacto: ${doc.impact_level}. Dominios: ${doc.impact_domains?.join(', ')}. Área legal: ${doc.legal_area || 'no especificada'}.`;

      // Consult both supervisors in parallel
      const [hrResp2, legalResp2] = await Promise.allSettled([
        fetch(`${fnUrl}/hr-multiagent-supervisor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'route_query', company_id, query: regulatoryQuery,
            context: { source: 'regulatory_cross_domain', document_id: doc.id, impact_domains: doc.impact_domains },
            session_id: session_id || crypto.randomUUID(),
          }),
        }).then(r => r.json()).catch(() => null),
        fetch(`${fnUrl}/legal-multiagent-supervisor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'validate_hr_action', company_id, query: regulatoryQuery,
            context: { source: 'regulatory_cross_domain', document_id: doc.id, impact_domains: doc.impact_domains },
            source_agent: 'regulatory-intelligence',
          }),
        }).then(r => r.json()).catch(() => null),
      ]);

      const hrResult2 = hrResp2.status === 'fulfilled' ? hrResp2.value : null;
      const legalResult2 = legalResp2.status === 'fulfilled' ? legalResp2.value : null;

      // Resolve with regulatory-specific prompt
      const resolverResp2 = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: REGULATORY_CROSS_DOMAIN_PROMPT },
            { role: 'user', content: JSON.stringify({
              document: doc,
              hr_response: hrResult2?.data || null,
              legal_response: legalResult2?.data || null,
              trigger_reason: input.trigger_reason,
            }) }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      let regResolution: any = {
        has_conflict: false, conflict_type: 'none', hr_impact: '', legal_impact: '',
        final_risk_level: doc.impact_level || 'medium', final_recommendation: '',
        requires_human_review: doc.requires_human_review || doc.impact_level === 'critical',
        human_review_reason: '', adaptation_deadline: null, priority_actions: [], composed_response: '',
      };

      if (resolverResp2.ok) {
        const rData = await resolverResp2.json();
        const rContent = rData.choices?.[0]?.message?.content || '';
        try {
          const m = rContent.match(/\{[\s\S]*\}/);
          if (m) regResolution = { ...regResolution, ...JSON.parse(m[0]) };
        } catch { console.warn('[obelixia-supervisor] Regulatory resolution parse error'); }
      }

      if (regResolution.final_risk_level === 'critical' || regResolution.has_conflict) {
        regResolution.requires_human_review = true;
      }

      const regExecTime = Date.now() - startTime;
      const regOutcome = regResolution.requires_human_review ? 'human_review' : regResolution.has_conflict ? 'conflict_resolved' : 'success';

      try {
        await supabase.from('erp_ai_agent_invocations').insert({
          agent_code: 'obelixia-supervisor',
          supervisor_code: 'obelixia-supervisor',
          company_id,
          user_id: userId,
          input_summary: `[REG] ${doc.document_title}`.substring(0, 500),
          routing_reason: `Regulatory cross-domain: ${input.trigger_reason || doc.impact_domains?.join('+')}`,
          confidence_score: 0.85,
          escalated_to: regResolution.requires_human_review ? 'human_review' : null,
          escalation_reason: regResolution.human_review_reason || null,
          outcome_status: regOutcome,
          execution_time_ms: regExecTime,
          response_summary: JSON.stringify({
            conflict: regResolution.has_conflict,
            risk: regResolution.final_risk_level,
            recommendation: regResolution.final_recommendation?.substring(0, 200),
          }).substring(0, 1000),
          metadata: {
            session_id,
            trigger_type: 'regulatory_cross_domain',
            document_id: doc.id,
            document_title: doc.document_title,
            impact_domains: doc.impact_domains,
            impact_level: doc.impact_level,
            source_url: doc.source_url,
            has_conflict: regResolution.has_conflict,
            conflict_type: regResolution.conflict_type,
            final_risk_level: regResolution.final_risk_level,
            requires_human_review: regResolution.requires_human_review,
            hr_available: !!hrResult2?.success,
            legal_available: !!legalResult2?.success,
            hr_impact: regResolution.hr_impact,
            legal_impact: regResolution.legal_impact,
            priority_actions: regResolution.priority_actions,
            adaptation_deadline: regResolution.adaptation_deadline,
            phase: '2B',
          },
        });
      } catch (logErr) {
        console.error('[obelixia-supervisor] Regulatory log error:', logErr);
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          supersupervisor: {
            trigger_type: 'regulatory_cross_domain',
            document_id: doc.id,
            resolution: regResolution,
          },
          hr_response: hrResult2?.data || null,
          legal_response: legalResult2?.data || null,
          execution_time_ms: regExecTime,
          outcome_status: regOutcome,
          timestamp: new Date().toISOString(),
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[obelixia-supervisor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
